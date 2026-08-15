import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { newId } from "@/lib/device";
import { composeSheet, composeStripPreview, sha256Hex } from "../lib/compose";
import type { RegalleLayoutDef } from "../lib/layouts";
import type { PhotoItem } from "../../print/types";
import type { FrameData } from "../types";

export function ReviewStep({
  layout,
  frames,
  onConfirm,
  onBack,
}: {
  layout: RegalleLayoutDef;
  frames: FrameData[];
  onConfirm: (item: PhotoItem) => void;
  onBack: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
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
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-6"
    >
      <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-[#f2e6c1]/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="text-center">
        <h2 className="text-lg font-bold text-[#f2e6c1]">Ficou bonito?</h2>
        <p className="text-sm text-[#f2e6c1]/50">Confira sua foto antes de imprimir</p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-1 items-center justify-center"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Pré-visualização"
            className="max-h-96 rounded-xl shadow-2xl shadow-black/40"
          />
        ) : (
          <div className="text-sm text-[#f2e6c1]/40">Montando…</div>
        )}
      </motion.div>

      <div className="flex flex-col gap-3 pb-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            className="w-full rounded-xl bg-[#d8442b] text-[#f2e6c1] shadow-lg shadow-[#d8442b]/25 hover:bg-[#b8371f]"
            disabled={!blob}
            onClick={confirm}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir
          </Button>
        </motion.div>
        <Button
          variant="outline"
          className="w-full rounded-xl border-[#f2e6c1]/20 bg-[#f2e6c1]/5 text-[#f2e6c1] hover:bg-[#f2e6c1]/10 hover:text-[#f2e6c1]"
          onClick={onBack}
        >
          Refazer
        </Button>
      </div>
    </motion.div>
  );
}
