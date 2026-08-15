import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RectangleVertical, RectangleHorizontal, Sparkles } from "lucide-react";
import { BASE_LAYOUTS } from "../lib/layouts";
import type { BaseLayout } from "../lib/layouts";

export function LayoutStep({
  onSelect,
  onBack,
}: {
  onSelect: (layout: BaseLayout) => void;
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
      <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-[#f2e6c1]/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-[#f2e6c1]">Escolha o formato</h2>
        <p className="text-sm text-[#f2e6c1]/60">Como quer levar sua recordação?</p>
      </div>

      <div className="grid gap-4">
        {BASE_LAYOUTS.map((l, i) => (
          <motion.button
            key={l.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(l)}
            className="group relative overflow-hidden rounded-2xl bg-[#f2e6c1]/10 p-5 text-left backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-linear-to-r from-[#d8442b]/0 to-[#d8442b]/0 transition-all group-hover:from-[#d8442b]/10 group-hover:to-[#d8442b]/10" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#d8442b]">
                {l.id === "strip_3" ? (
                  <Sparkles className="h-7 w-7 text-[#f2e6c1]" />
                ) : l.id === "single_10x15_h" ? (
                  <RectangleHorizontal className="h-7 w-7 text-[#f2e6c1]" />
                ) : (
                  <RectangleVertical className="h-7 w-7 text-[#f2e6c1]" />
                )}
              </div>
              <div>
                <div className="text-base font-bold text-[#f2e6c1]">{l.label}</div>
                <div className="text-sm text-[#f2e6c1]/50">
                  {l.photos} foto{l.photos > 1 ? "s" : ""} por folha
                </div>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-[#f2e6c1]/30" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
