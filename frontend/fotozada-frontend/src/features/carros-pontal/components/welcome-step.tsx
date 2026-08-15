import { motion } from "framer-motion";
import { Car } from "lucide-react";

// Faixa quadriculada decorativa (SVG inline — não depende de nenhum asset
// externo, então funciona mesmo antes das molduras/artes do evento estarem
// prontas).
function CheckeredStripe({ className }: { className?: string }) {
  const cells = Array.from({ length: 20 });
  return (
    <div className={`flex h-3 w-full overflow-hidden ${className ?? ""}`}>
      {cells.map((_, i) => (
        <div key={i} className={`h-full flex-1 ${i % 2 === 0 ? "bg-white" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center pb-32"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <img src="/logo.svg" alt="" className="h-7" />
        <span className="text-base font-bold text-white">Fotozada</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/20"
      >
        <Car className="h-10 w-10 text-red-400" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="space-y-2"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">
          6º Encontro de
        </p>
        <h1 className="text-4xl font-black leading-none text-white">
          Carros
          <br />
          Antigos
        </h1>
        <p className="text-lg font-bold text-white/70">de Pontal-SP</p>
      </motion.div>

      <CheckeredStripe className="max-w-[240px] rounded-full opacity-60" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="space-y-1"
      >
        <p className="text-sm leading-relaxed text-white/60">
          Registre os melhores momentos do encontro!
          <br />
          Escolha suas fotos e leve a recordação impressa.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="rounded-2xl bg-red-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-red-500/30"
        >
          INICIAR
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
