import { motion } from "framer-motion";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i === current ? 1 : 0.7,
            opacity: i <= current ? 1 : 0.3,
          }}
          className={`h-2 rounded-full transition-colors ${
            i < current
              ? "w-2 bg-[#f2e6c1]"
              : i === current
                ? "w-6 bg-[#d8442b]"
                : "w-2 bg-[#f2e6c1]/30"
          }`}
        />
      ))}
    </div>
  );
}
