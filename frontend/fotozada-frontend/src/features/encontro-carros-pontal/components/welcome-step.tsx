import { motion } from "framer-motion";

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center pb-40"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <motion.img
          src="/encontro-carros-pontal/encontro.png"
          alt="6º Encontro de Carros Antigos de Pontal - SP"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className="mx-auto w-full max-w-sm drop-shadow-2xl"
        />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#f2e6c1]">
            Registre os melhores momentos do encontro!
          </h2>
          <p className="text-sm leading-relaxed text-[#f2e6c1]/50">
            Escolha suas fotos e leve a recordação impressa.
          </p>
        </div>
      </motion.div>

      {/* Carro clássico — entra deslizando pela esquerda, como quem chega ao encontro */}
      <motion.img
        src="/encontro-carros-pontal/carro.png"
        alt=""
        initial={{ x: -120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.5 }}
        className="pointer-events-none absolute -bottom-4 left-1/2 w-72 max-w-[80%] -translate-x-1/2 drop-shadow-2xl"
      />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="rounded-2xl bg-[#d8442b] px-10 py-4 text-base font-bold text-[#f2e6c1] shadow-lg shadow-[#d8442b]/30"
        >
          INICIAR
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
