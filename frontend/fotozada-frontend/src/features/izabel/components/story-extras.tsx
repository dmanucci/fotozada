import { useEffect, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";

// Régua de crescimento: substitui os pontinhos do progresso. A fita sobe de
// "0" (recém-nascida) até "1 ano" e uma borboleta marca onde a história está.
export function GrowthRuler({ progress }: { progress: MotionValue<number> }) {
  const markerTop = useTransform(progress, (p) => `${(1 - p) * 100}%`);
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-[16%] right-2 top-[16%] z-20 w-8">
      <span className="absolute -top-6 right-0 text-[11px] font-extrabold text-[#d63f86]">1 ano</span>
      <span className="absolute -bottom-6 right-1.5 text-[11px] font-bold text-[#6a3a64]">0</span>
      <div className="absolute inset-y-0 right-3 w-2 overflow-hidden rounded-full bg-[#8b5580]/15">
        <motion.div
          style={{ scaleY: progress }}
          className="h-full origin-bottom rounded-full bg-linear-to-t from-[#ef8fb0] to-[#d63f86] will-change-transform"
        />
      </div>
      {/* marquinhas de cada mês (13), a do meio maior */}
      {Array.from({ length: 13 }).map((_, i) => (
        <span
          key={i}
          className={`absolute right-[1.35rem] h-px bg-[#8b5580]/50 ${i % 6 === 0 ? "w-3" : "w-1.5"}`}
          style={{ bottom: `${(i / 12) * 100}%` }}
        />
      ))}
      <motion.img
        src="/izabel/borboleta-1.webp"
        alt=""
        style={{ top: markerTop }}
        className="absolute right-0 w-6 -translate-y-1/2"
      />
    </div>
  );
}

function Spark({
  i,
  x,
  y,
  opacity,
}: {
  i: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  // cada brilho segue a fadinha com um pouco mais de atraso que o anterior
  const sx = useSpring(x, { stiffness: 130 - i * 18, damping: 16 + i * 2 });
  const sy = useSpring(y, { stiffness: 130 - i * 18, damping: 16 + i * 2 });
  const size = 14 - i * 2;
  return (
    <motion.svg
      viewBox="0 0 24 24"
      style={{ x: sx, y: sy, opacity, width: size, height: size, marginLeft: 14 + i * 4, marginTop: 40 + i * 5 }}
      className="absolute left-1/2 top-0"
      fill={i % 2 ? "#ffd166" : "#ef8fb0"}
    >
      <path d="M12 0l2.7 9.3L24 12l-9.3 2.7L12 24l-2.7-9.3L0 12l9.3-2.7z" />
    </motion.svg>
  );
}

// Fadinha que voa em zigue-zague conforme se rola a história, deixando um
// rastro de brilhos. Fica atrás das fotos (profundidade), só usa transform.
export function FairyFlight({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const phase = (p: number) => p * Math.PI * 9;
  const x = useTransform(progress, (p) => Math.sin(phase(p)) * Math.min(w, 480) * 0.34);
  const y = useTransform(progress, (p) => Math.sin(phase(p) * 2 + 1) * 18);
  const rotate = useTransform(progress, (p) => Math.cos(phase(p)) * 14);
  // some na abertura e na cena final (que tem a fadinha grande)
  const opacity = useTransform(progress, [0, 0.04, 0.84, 0.92], [0, 1, 1, 0]);

  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[24%] flex justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <Spark key={i} i={i} x={x} y={y} opacity={opacity} />
      ))}
      <motion.img
        src="/izabel/izabel-fada.webp"
        alt=""
        decoding="async"
        style={{ x, y, rotate, opacity }}
        className="w-14 will-change-transform"
      />
    </div>
  );
}

// Chuva de pétalas na cena final: só CSS (transform/opacity), 14 pétalas,
// pausa quando a cena não está perto da tela (ver [data-near] em index.css).
const PETAL_COLORS = ["#f6a5c0", "#f9c9d9", "#e58bb0", "#d9b8f0", "#fbd3e0"];
const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: -((i * 1.7) % 9),
  dur: 7 + ((i * 13) % 6),
  drift: ((i % 2 ? 1 : -1) * (20 + ((i * 17) % 60))) | 0,
  size: 10 + ((i * 7) % 8),
  color: PETAL_COLORS[i % PETAL_COLORS.length],
}));

export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal absolute top-0 block opacity-80"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.3,
              background: p.color,
              borderRadius: "60% 0 60% 0",
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
