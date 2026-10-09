import { supabase } from "@/lib/supabase";
import { getDeviceId, newId } from "@/lib/device";
import type { PhotoItem } from "../types";
import { submitResultSchema, type SubmitResult } from "../schema";
import { canvasToBlob, sha256Hex } from "../lib/compose";

interface UploadSlot {
  idx: number;
  layout: string;
  photos: { idx: number; path: string; token: string }[];
  composed: { path: string; token: string };
}

interface PreparedSheet {
  blob: Blob;
  contentType: string;
  hash: string;
}

// A folha composta nasce como PNG (2,5–3 MB por 10x15 a 300 dpi) — pesado
// demais para subir por 4G de festa. Reencodamos para JPEG q95 (4:4:4 no
// Chrome/Skia, sem perda visível na DNP): ~0,4–0,5 MB, 6x menor. Se algo
// falhar no reencode, sobe o PNG original (mais lento, mas imprime igual).
async function prepareSheet(png: Blob): Promise<PreparedSheet> {
  try {
    const bmp = await createImageBitmap(png);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.95);
    return { blob: jpeg, contentType: "image/jpeg", hash: await sha256Hex(jpeg) };
  } catch {
    return { blob: png, contentType: "image/png", hash: await sha256Hex(png) };
  }
}

// Full submission: request signed URLs -> upload the composed sheet -> create
// the job batch. clientRequestId is supplied by the caller and kept stable
// across retries so the backend can dedupe a double submit (idempotency).
//
// O que atrasa a impressão é só o que a impressora usa: a folha composta. Por
// isso o job é criado assim que ela sobe; as fotos de origem recortadas
// (só auditoria/admin) sobem depois, em segundo plano.
export async function submitBatch(
  kioskId: string,
  items: PhotoItem[],
  clientRequestId: string,
): Promise<SubmitResult> {
  const uploadId = newId();
  const deviceId = getDeviceId();

  // Reencode em paralelo com a ida ao servidor pelas URLs assinadas.
  const preparedPromise = Promise.all(items.map((it) => prepareSheet(it.composedBlob)));

  // 1) signed upload URLs
  const { data: ru, error: ruErr } = await supabase.functions.invoke("request-upload", {
    body: {
      kiosk_id: kioskId,
      upload_id: uploadId,
      items: items.map((it, idx) => ({
        idx,
        layout: it.layout,
        photo_count: it.photos.length,
        copies: it.copies,
      })),
    },
  });
  if (ruErr) throw new Error(ruErr.message);
  if (ru.error) throw new Error(ru.error);
  if (ru.blocked) return submitResultSchema.parse(ru);
  const slots: UploadSlot[] = ru.items;
  const prepared = await preparedPromise;

  // 2) upload the composed sheets (all items in parallel)
  await Promise.all(
    items.map(async (_, idx) => {
      const slot = slots.find((s) => s.idx === idx)!;
      const sheet = prepared[idx];
      const cu = await supabase.storage
        .from("prints")
        .uploadToSignedUrl(slot.composed.path, slot.composed.token, sheet.blob, {
          contentType: sheet.contentType,
        });
      if (cu.error) throw new Error(cu.error.message);
    }),
  );

  const itemsPayload = items.map((it, idx) => {
    const slot = slots.find((s) => s.idx === idx)!;
    return {
      idx,
      layout: it.layout,
      copies: it.copies,
      composed_path: slot.composed.path,
      composed_hash: prepared[idx].hash,
      photos: it.photos.map((photo, p) => ({
        idx: p,
        storage_path: slot.photos[p].path,
        width: photo.width,
        height: photo.height,
        size_bytes: photo.blob.size,
        crop: photo.crop,
      })),
    };
  });

  // 3) create the batch (idempotency + sheet-limit enforced server-side) —
  // o worker já pode pegar o job daqui.
  const { data: cj, error: cjErr } = await supabase.functions.invoke("create-print-job", {
    body: {
      kiosk_id: kioskId,
      device_id: deviceId,
      client_request_id: clientRequestId,
      items: itemsPayload,
    },
  });
  if (cjErr) throw new Error(cjErr.message);
  const result = submitResultSchema.parse(cj);

  // 4) fotos de origem em segundo plano (best-effort: não bloqueiam nem
  // derrubam a impressão se falharem).
  void uploadSourcePhotos(items, slots);

  return result;
}

async function uploadSourcePhotos(items: PhotoItem[], slots: UploadSlot[]): Promise<void> {
  const uploads = items.flatMap((it, idx) => {
    const slot = slots.find((s) => s.idx === idx)!;
    return it.photos.map((photo, p) =>
      supabase.storage
        .from("prints")
        .uploadToSignedUrl(slot.photos[p].path, slot.photos[p].token, photo.blob, {
          contentType: "image/jpeg",
        }),
    );
  });
  const results = await Promise.allSettled(uploads);
  const failed = results.filter((r) => r.status === "rejected" || r.value.error).length;
  if (failed) console.warn(`[fotozada] ${failed} foto(s) de origem não subiram (impressão não afetada)`);
}
