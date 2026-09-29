import { motion } from "framer-motion";

// Raios amarelos saindo do canto inferior esquerdo — mesmo motivo das
// molduras impressas do evento.
function YellowRays({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <g fill="#eedd13">
        <polygon points="0,100 0,78 100,48 100,58" />
        <polygon points="0,100 0,90 100,76 100,86" />
        <polygon points="0,100 22,0 34,0" />
        <polygon points="0,100 58,0 70,0" />
        <rect x="0" y="94" width="72" height="6" />
      </g>
    </svg>
  );
}

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 20, delay: 0.5 }}
        className="pointer-events-none absolute bottom-0 left-0 w-48 max-w-[50%] origin-bottom-left"
      >
        <YellowRays className="h-auto w-full" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative flex flex-col items-center gap-6"
      >
        <motion.img
          src="/unaerp-concept/unaerp-logo.svg"
          alt="UNAERP"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className="w-64 max-w-[75%]"
        />
        <motion.img
          src="/unaerp-concept/mensagem.svg"
          alt="Movimentando descobertas"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.3 }}
          className="w-72 max-w-[85%]"
        />
        <p className="max-w-xs text-sm leading-relaxed text-white/60">
          Tire sua foto e leve a recordação impressa.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, x: 2, y: 2, boxShadow: "2px 2px 0 #000" }}
          onClick={onStart}
          className="rounded-2xl bg-[#eedd13] px-10 py-4 text-base font-bold text-[#2b3990] shadow-[4px_4px_0_#000]"
        >
          INICIAR
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
