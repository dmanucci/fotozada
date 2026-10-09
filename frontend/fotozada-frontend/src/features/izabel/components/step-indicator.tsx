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
              ? "w-2 bg-[#8b5580]"
              : i === current
                ? "w-6 bg-[#ef8fb0]"
                : "w-2 bg-[#8b5580]/25"
          }`}
        />
      ))}
    </div>
  );
}
