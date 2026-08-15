import { motion } from "framer-motion";
import { ChevronLeft, ImagePlus } from "lucide-react";
import { FRAME_NUMBERS, buildLayout, frameAssetPaths } from "../lib/layouts";
import type { BaseLayout, CarrosLayoutDef } from "../lib/layouts";

export function FrameStep({
  base,
  onSelect,
  onBack,
}: {
  base: BaseLayout;
  onSelect: (layout: CarrosLayoutDef) => void;
  onBack: () => void;
}) {
  const previewAspect = base._stripSize
    ? base._stripSize.w / base._stripSize.h
    : base.sheet.width / base.sheet.height;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-6 px-6 pt-4"
    >
      <button onClick={onBack} className="flex shrink-0 items-center gap-1 self-start text-sm text-white/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="shrink-0 space-y-1 text-center">
        <h2 className="text-xl font-bold text-white">Escolha a moldura</h2>
        <p className="text-sm text-white/60">Qual estilo combina com você?</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 pb-6">
          {FRAME_NUMBERS.map((n, i) => {
            const { bg, overlay } = frameAssetPaths(base.folder, n);
            return (
              <motion.button
                key={n}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(buildLayout(base.id, n))}
                className="group relative overflow-hidden rounded-2xl bg-white/10 p-2 backdrop-blur-sm"
              >
                <div
                  className={`relative overflow-hidden rounded-lg ${
                    bg ? "bg-white" : "bg-gradient-to-br from-red-50 to-orange-100"
                  }`}
                  style={{ aspectRatio: previewAspect }}
                >
                  {bg ? (
                    <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                        <ImagePlus className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  )}
                  {overlay && (
                    <img src={overlay} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="mt-2 text-center text-xs font-semibold text-white/70">
                  {n === 0 ? "Sem moldura" : `Estilo ${n}`}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
