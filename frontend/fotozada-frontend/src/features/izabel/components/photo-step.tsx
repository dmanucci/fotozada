import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, ChevronLeft, Crop, Loader2, Maximize2, Plus, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { canvasToBlob, drawCell, loadImageElement } from "../lib/compose";
import type { IzabelLayoutDef } from "../lib/layouts";
import type { FrameData } from "../types";

interface Slot {
  src: string; // object URL da foto original
  img: HTMLImageElement;
  crop: Area | null; // null = foto inteira (sem recorte)
  preview: string; // miniatura do resultado final (data URL)
}

const PREVIEW_W = 360;

function makePreview(img: HTMLImageElement, cell: { w: number; h: number }, crop: Area | null) {
  const canvas = drawCell(img, PREVIEW_W, (PREVIEW_W * cell.h) / cell.w, crop);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Abre a foto; se o navegador não decodifica (HEIC no Android), converte.
async function decodeFile(file: File): Promise<{ src: string; img: HTMLImageElement } | null> {
  const url = URL.createObjectURL(file);
  try {
    return { src: url, img: await loadImageElement(url) };
  } catch {
    URL.revokeObjectURL(url);
  }
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const jpeg = Array.isArray(result) ? result[0] : result;
    const converted = URL.createObjectURL(jpeg);
    try {
      return { src: converted, img: await loadImageElement(converted) };
    } catch {
      URL.revokeObjectURL(converted);
    }
  } catch {
    // cai no aviso abaixo
  }
  toast.error("Não foi possível abrir essa foto", {
    description: "Tente escolher outra foto ou tirar uma nova.",
  });
  return null;
}

export function PhotoStep({
  layout,
  onDone,
  onBack,
}: {
  layout: IzabelLayoutDef;
  onDone: (frames: FrameData[]) => void;
  onBack: () => void;
}) {
  const [slots, setSlots] = useState<(Slot | null)[]>(() => Array(layout.photos).fill(null));
  const [converting, setConverting] = useState(false);
  const [busy, setBusy] = useState(false);
  // recorte opcional: índice da vaga sendo recortada (null = tela principal)
  const [cropping, setCropping] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<number | null>(null);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // libera as fotos originais ao sair da tela
  useEffect(
    () => () => {
      slotsRef.current.forEach((s) => s && URL.revokeObjectURL(s.src));
    },
    [],
  );

  const emptyIdx = slots.flatMap((s, i) => (s ? [] : [i]));
  const filled = slots.length - emptyIdx.length;
  const allFilled = emptyIdx.length === 0;

  function openPicker(target: number | null) {
    const el = inputRef.current;
    if (!el) return;
    targetRef.current = target;
    el.multiple = target === null && emptyIdx.length > 1; // várias de uma vez
    el.click();
  }

  async function handleFiles(files: File[], target: number | null) {
    const targets = target !== null ? [target] : emptyIdx;
    const list = files.slice(0, targets.length);
    if (target === null && files.length > list.length) {
      toast.info(`Usei só as primeiras ${list.length} fotos`);
    }
    setConverting(true);
    try {
      const next = [...slotsRef.current];
      for (let k = 0; k < list.length; k++) {
        const d = await decodeFile(list[k]);
        if (!d) continue;
        const idx = targets[k];
        const old = next[idx];
        if (old) URL.revokeObjectURL(old.src);
        next[idx] = { src: d.src, img: d.img, crop: null, preview: makePreview(d.img, layout.cells[idx], null) };
      }
      setSlots(next);
    } finally {
      setConverting(false);
    }
  }

  function startCrop(i: number) {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
    setCropping(i);
  }

  function applyCrop() {
    if (cropping === null || !areaPixels) return;
    const i = cropping;
    setSlots((prev) =>
      prev.map((s, k) =>
        k === i && s ? { ...s, crop: areaPixels, preview: makePreview(s.img, layout.cells[i], areaPixels) } : s,
      ),
    );
    setCropping(null);
  }

  function showWhole(i: number) {
    setSlots((prev) =>
      prev.map((s, k) =>
        k === i && s ? { ...s, crop: null, preview: makePreview(s.img, layout.cells[i], null) } : s,
      ),
    );
  }

  async function finish() {
    if (!allFilled) return;
    setBusy(true);
    try {
      const frames: FrameData[] = [];
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i]!;
        const cell = layout.cells[i];
        const canvas = drawCell(s.img, cell.w, cell.h, s.crop);
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        frames.push({
          crop: s.crop ?? { x: 0, y: 0, width: s.img.naturalWidth, height: s.img.naturalHeight },
          canvas,
          blob,
          width: canvas.width,
          height: canvas.height,
        });
      }
      onDone(frames);
    } catch {
      toast.error("Não consegui montar suas fotos. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const single = layout.photos === 1;
  const croppingSlot = cropping !== null ? slots[cropping] : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto p-6"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo
          if (files.length) void handleFiles(files, targetRef.current);
        }}
      />

      {croppingSlot ? (
        <>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[#8b5580]">
              Recortar{!single ? ` · foto ${cropping! + 1}` : ""}
            </h2>
            <p className="mt-1 text-sm text-[#6a3a64]/70">Arraste e use o zoom para enquadrar</p>
          </div>
          <div className="relative min-h-72 flex-1 overflow-hidden rounded-2xl bg-black/40">
            <Cropper
              image={croppingSlot.src}
              crop={crop}
              zoom={zoom}
              aspect={layout.cellAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_a, px) => setAreaPixels(px)}
            />
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={([z]) => setZoom(z)}
            className="[&_[role=slider]]:bg-[#ef8fb0]"
          />
          <Button
            className="w-full rounded-xl bg-[#ef8fb0] font-bold text-white shadow-[3px_3px_0_#c9709a] hover:bg-[#e47aa0]"
            disabled={!areaPixels}
            onClick={applyCrop}
          >
            Usar este recorte
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl border-[#ef8fb0]/50 bg-white/40 text-[#8b5580] hover:bg-white/80 hover:text-[#8b5580]"
            onClick={() => setCropping(null)}
          >
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-[#8b5580]/60">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>

          <div className="text-center">
            <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-[#8b5580]">
              <Camera className="h-5 w-5" />
              {single ? "Sua foto" : "Suas fotos"}
              {!single && (
                <span className="rounded-full bg-[#ef8fb0] px-2.5 py-0.5 text-sm font-bold text-white">
                  {filled}/{layout.photos}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-[#6a3a64]/70">
              {converting
                ? "Convertendo foto…"
                : filled === 0
                  ? single
                    ? "Escolha uma foto da galeria"
                    : `Escolha até ${layout.photos} fotos de uma vez`
                  : "A foto entra inteira. Toque em Recortar só se quiser ajustar."}
            </p>
          </div>

          {!allFilled && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={converting}
              onClick={() => openPicker(null)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ef8fb0]/60 bg-white/50 px-4 py-6 disabled:opacity-60"
            >
              {converting ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#8b5580]" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ef8fb0] shadow-[3px_3px_0_#c9709a]">
                  <Upload className="h-7 w-7 text-white" />
                </div>
              )}
              <span className="text-base font-bold text-[#6a3a64]">
                {single
                  ? "Escolher foto"
                  : emptyIdx.length === layout.photos
                    ? `Escolher até ${layout.photos} fotos`
                    : `Escolher mais ${emptyIdx.length === 1 ? "1 foto" : `${emptyIdx.length} fotos`}`}
              </span>
              <span className="text-xs text-[#8b5580]/70">Toque para abrir a galeria</span>
            </motion.button>
          )}

          <div className="flex flex-col gap-3">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2.5">
                <div
                  className={`relative shrink-0 overflow-hidden rounded-lg border-2 ${
                    s ? "border-[#ef8fb0]/60 bg-white" : "border-dashed border-[#ef8fb0]/50 bg-white/40"
                  } ${single ? "w-40" : "w-32"}`}
                  style={{ aspectRatio: layout.cellAspect }}
                >
                  {s ? (
                    <img src={s.preview} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <button
                      onClick={() => openPicker(i)}
                      aria-label={`Escolher foto ${i + 1}`}
                      className="flex h-full w-full items-center justify-center text-[#ef8fb0]"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-extrabold text-[#6a3a64]">
                    {single ? "Foto" : `Foto ${i + 1}`}
                    {s && (
                      <span className="ml-1.5 text-xs font-semibold text-[#8b5580]/70">
                        {s.crop ? "· recortada" : "· inteira"}
                      </span>
                    )}
                  </span>
                  {s ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => startCrop(i)}
                        className="flex items-center gap-1 rounded-lg border-2 border-[#8b5580]/60 bg-white px-2.5 py-1 text-xs font-bold text-[#6a3a64]"
                      >
                        <Crop className="h-3.5 w-3.5" /> Recortar
                      </button>
                      {s.crop && (
                        <button
                          onClick={() => showWhole(i)}
                          className="flex items-center gap-1 rounded-lg border-2 border-[#8b5580]/60 bg-white px-2.5 py-1 text-xs font-bold text-[#6a3a64]"
                        >
                          <Maximize2 className="h-3.5 w-3.5" /> Inteira
                        </button>
                      )}
                      <button
                        onClick={() => openPicker(i)}
                        className="flex items-center gap-1 rounded-lg border-2 border-[#8b5580]/60 bg-white px-2.5 py-1 text-xs font-bold text-[#6a3a64]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Trocar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8b5580]/70">Toque no + para escolher</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            className="mt-auto w-full rounded-xl bg-[#ef8fb0] font-bold text-white shadow-[3px_3px_0_#c9709a] hover:bg-[#e47aa0] disabled:opacity-50"
            disabled={!allFilled || busy || converting}
            onClick={finish}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {allFilled ? "Continuar" : single ? "Escolha uma foto" : `Faltam ${emptyIdx.length} foto${emptyIdx.length > 1 ? "s" : ""}`}
          </Button>
        </>
      )}
    </motion.div>
  );
}
