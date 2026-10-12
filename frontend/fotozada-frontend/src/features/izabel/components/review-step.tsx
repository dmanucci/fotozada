import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newId } from "@/lib/device";
import { composeSheet, composeStripPreview, sha256Hex } from "../lib/compose";
import type { IzabelLayoutDef } from "../lib/layouts";
import type { PhotoItem } from "../../print/types";
import type { FrameData } from "../types";

export function ReviewStep({
  layout,
  frames,
  onConfirm,
  onBack,
}: {
  layout: IzabelLayoutDef;
  frames: FrameData[];
  onConfirm: (item: PhotoItem) => void;
  onBack: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewImage, setPreviewImage] = useState<Blob | null>(null);
  const [hash, setHash] = useState("");

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    (async () => {
      const canvases = frames.map((f) => f.canvas);
      const [printBlob, previewBlob] = await Promise.all([
        composeSheet(layout, canvases),
        composeStripPreview(layout, canvases),
      ]);
      const h = await sha256Hex(printBlob);
      const url = URL.createObjectURL(previewBlob);
      createdUrl = url;
      if (active) {
        setBlob(printBlob);
        setPreviewImage(previewBlob);
        setHash(h);
        setPreviewUrl(url);
      } else {
        URL.revokeObjectURL(url);
      }
    })();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [layout, frames]);

  function confirm() {
    if (!blob) return;
    onConfirm({
      id: newId(),
      layout: layout.id,
      copies: 1,
      photos: frames.map((f) => ({
        blob: f.blob,
        width: f.width,
        height: f.height,
        crop: f.crop,
      })),
      composedBlob: blob,
      composedHash: hash,
      composedUrl: previewUrl ?? URL.createObjectURL(blob),
      previewBlob: previewImage ?? undefined,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-5 overflow-y-auto p-6 pb-0"
    >
      <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-[#8b5580]/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="text-center">
        <h2 className="text-lg font-bold text-[#8b5580]">Ficou bonito?</h2>
        <p className="text-sm text-[#8b5580]/50">Confira sua foto antes de imprimir</p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-1 items-center justify-center py-1"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Pré-visualização"
            className="max-h-[min(24rem,40svh)] rounded-xl shadow-2xl shadow-[#8b5580]/30"
          />
        ) : (
          <div className="text-sm text-[#8b5580]/40">Montando…</div>
        )}
      </motion.div>

      <div className="sticky bottom-0 -mx-6 mt-auto flex flex-col gap-3 bg-gradient-to-t from-[#fff5f7] from-70% to-transparent px-6 pb-4 pt-4">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            className="w-full rounded-xl bg-[#ef8fb0] font-bold text-white shadow-[3px_3px_0_#c9709a] hover:bg-[#e47aa0]"
            disabled={!blob}
            onClick={confirm}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir
          </Button>
        </motion.div>
        <Button
          variant="outline"
          className="w-full rounded-xl border-[#ef8fb0]/50 bg-white/40 text-[#8b5580] hover:bg-white/80 hover:text-[#8b5580]"
          onClick={onBack}
        >
          Refazer
        </Button>
      </div>
    </motion.div>
  );
}
