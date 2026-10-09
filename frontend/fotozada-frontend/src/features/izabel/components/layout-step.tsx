import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LAYOUTS } from "../lib/layouts";
import type { IzabelLayoutDef } from "../lib/layouts";

// Cada formato tem uma única moldura neste evento — não há etapa de escolha
// de moldura, então a miniatura da arte já aparece aqui no card do formato.
export function LayoutStep({
  onSelect,
  onBack,
}: {
  onSelect: (layout: IzabelLayoutDef) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-4"
    >
      <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-[#8b5580]/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-[#8b5580]">Escolha o formato</h2>
        <p className="text-sm text-[#8b5580]/60">Como quer levar sua recordação?</p>
      </div>

      <div className="grid gap-4">
        {LAYOUTS.map((l, i) => (
          <motion.button
            key={l.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(l)}
            className="group relative overflow-hidden rounded-2xl bg-white/60 p-4 text-left backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-linear-to-r from-[#ef8fb0]/0 to-[#ef8fb0]/0 transition-all group-hover:from-[#ef8fb0]/10 group-hover:to-[#ef8fb0]/10" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                <img
                  src={l._frameSvg}
                  alt=""
                  className="max-h-16 max-w-16 shadow-[2px_2px_0_#c9709a]"
                />
              </div>
              <div>
                <div className="text-base font-bold text-[#8b5580]">{l.label}</div>
                <div className="text-sm text-[#8b5580]/50">
                  {l.photos} foto{l.photos > 1 ? "s" : ""} por folha
                </div>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-[#8b5580]/30" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
