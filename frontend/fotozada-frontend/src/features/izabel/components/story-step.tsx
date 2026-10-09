import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FINAL_LABEL, STORY_MONTHS, type StoryMonth } from "../lib/story";

const TOTAL = STORY_MONTHS.length + 2; // intro + meses + final
const BUTTERFLIES = ["borboleta-1", "borboleta-2", "borboleta-3"];

// Progresso de uma cena enquanto ela atravessa a tela (0 = entrando, 1 = saindo).
function useSceneProgress(container: React.RefObject<HTMLDivElement | null>) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container,
    offset: ["start end", "end start"],
  });
  return { ref, progress: scrollYProgress };
}

function Butterfly({
  name,
  className,
  progress,
  drift,
}: {
  name: string;
  className: string;
  progress: MotionValue<number>;
  drift: number;
}) {
  const y = useTransform(progress, [0, 1], [drift, -drift]);
  return (
    <motion.img
      src={`/izabel/${name}.webp`}
      alt=""
      aria-hidden
      style={{ y }}
      animate={{ rotate: [-6, 8, -6] }}
      transition={{ duration: 4 + drift / 40, repeat: Infinity, ease: "easeInOut" }}
      className={`pointer-events-none absolute w-12 select-none ${className}`}
    />
  );
}

function IntroScene({ container, onSkip }: { container: React.RefObject<HTMLDivElement | null>; onSkip: () => void }) {
  const { ref, progress } = useSceneProgress(container);
  return (
    <section ref={ref} className="relative flex h-full shrink-0 snap-center flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
      <Butterfly name="borboleta-1" progress={progress} drift={60} className="left-[8%] top-[14%] w-14" />
      <Butterfly name="borboleta-2" progress={progress} drift={90} className="right-[10%] top-[22%]" />
      <motion.img
        src="/izabel/logo.webp"
        alt="Izabel — 1 aninho"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="w-[88%] max-w-md"
      />
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-xs text-base leading-relaxed text-[#8b5580]"
      >
        Role para ver a Izabel crescer, mês a mês, até o primeiro aninho.
      </motion.p>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-[#ef8fb0]">
        <ChevronDown className="h-8 w-8" />
      </motion.div>
      <button onClick={onSkip} className="relative text-sm text-[#8b5580]/70 underline underline-offset-4">
        Pular para as fotos
      </button>
      <img src="/izabel/flores.webp" alt="" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 w-full opacity-70" />
    </section>
  );
}

// Carrossel horizontal das fotos de um mês. Usa scroll-snap nativo: o swipe
// lateral fica aqui dentro e o gesto vertical continua pulando de mês.
function PhotoCarousel({ item }: { item: StoryMonth }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const many = item.photos.length > 1;

  return (
    <div className="relative">
      <div className="rounded-[2rem] bg-white p-2.5 shadow-[0_12px_40px_-8px_rgba(139,85,128,0.45)]">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setCurrent(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex w-[68vw] max-w-72 snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {item.photos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Izabel — ${item.label} (${i + 1} de ${item.photos.length})`}
              loading="lazy"
              draggable={false}
              className="aspect-4/5 w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>
      </div>
      {many && (
        <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-1.5">
          {item.photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-[#ef8fb0]" : "w-1.5 bg-[#8b5580]/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthScene({
  item,
  container,
}: {
  item: StoryMonth;
  container: React.RefObject<HTMLDivElement | null>;
}) {
  const { ref, progress } = useSceneProgress(container);
  // Parallax: o numeral de fundo anda mais devagar que a foto.
  const numY = useTransform(progress, [0, 1], [120, -120]);
  const photoY = useTransform(progress, [0, 1], [50, -50]);
  const photoOpacity = useTransform(progress, [0.1, 0.4, 0.6, 0.9], [0, 1, 1, 0]);
  // "Crescer": a moldura aumenta um pouco a cada mês.
  const grow = 0.78 + (item.month / (STORY_MONTHS.length)) * 0.22;
  const tilt = item.month % 2 === 0 ? -3 : 3;
  const butterfly = BUTTERFLIES[item.month % BUTTERFLIES.length];
  const side = item.month % 2 === 0 ? "right-[6%] top-[12%]" : "left-[6%] top-[16%]";

  return (
    <section ref={ref} className="relative flex h-full shrink-0 snap-center flex-col items-center justify-center gap-5 overflow-hidden px-6">
      <motion.span
        aria-hidden
        style={{ y: numY }}
        className="pointer-events-none absolute select-none font-[Nunito] text-[16rem] font-black leading-none text-[#ef8fb0]/20"
      >
        {item.month}
      </motion.span>
      <Butterfly name={butterfly} progress={progress} drift={70} className={side} />

      <motion.div style={{ y: photoY, opacity: photoOpacity, scale: grow, rotate: tilt }} className="relative">
        <PhotoCarousel item={item} />
      </motion.div>

      <motion.div style={{ opacity: photoOpacity }} className="relative text-center">
        <h3 className="font-[Nunito] text-3xl font-black text-[#8b5580]">{item.label}</h3>
        <p className="mt-1 text-sm text-[#8b5580]/70">{item.caption}</p>
      </motion.div>
    </section>
  );
}

function FinalScene({ container, onStart }: { container: React.RefObject<HTMLDivElement | null>; onStart: () => void }) {
  const { ref, progress } = useSceneProgress(container);
  const fly = useTransform(progress, [0, 0.5], [160, 0]);
  const fade = useTransform(progress, [0, 0.4], [0, 1]);
  return (
    <section ref={ref} className="relative flex h-full shrink-0 snap-center flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center">
      <img src="/izabel/flores.webp" alt="" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-70" />
      <Butterfly name="borboleta-1" progress={progress} drift={50} className="left-[8%] top-[10%]" />
      <Butterfly name="borboleta-3" progress={progress} drift={80} className="right-[8%] top-[18%]" />
      <motion.img
        src="/izabel/izabel-fada.webp"
        alt="Izabel fadinha"
        style={{ y: fly, opacity: fade }}
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-[78%] max-w-xs drop-shadow-xl"
      />
      <motion.div style={{ opacity: fade }} className="relative">
        <h2 className="font-[Nunito] text-5xl font-black text-[#ef8fb0]">{FINAL_LABEL}!</h2>
        <p className="mt-1 text-[#8b5580]">Agora é a sua vez de entrar na história.</p>
      </motion.div>
      <motion.button
        whileTap={{ scale: 0.95, x: 2, y: 2 }}
        onClick={onStart}
        className="relative mt-2 rounded-2xl bg-[#ef8fb0] px-8 py-4 text-base font-bold text-white shadow-[4px_4px_0_#c9709a]"
      >
        TIRAR MINHA FOTO
      </motion.button>
    </section>
  );
}

export function StoryStep({ onStart }: { onStart: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container });
  const [index, setIndex] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setIndex(Math.round(p * (TOTAL - 1))));

  // 0 = intro, 1..N = meses, N+1 = final
  const monthIdx = index - 1;
  const chip =
    index === 0 ? null : index === TOTAL - 1 ? FINAL_LABEL : STORY_MONTHS[monthIdx]?.label;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="relative flex-1"
    >
      <div ref={container} className="absolute inset-0 flex snap-y snap-mandatory flex-col overflow-y-auto overscroll-contain">
        <IntroScene container={container} onSkip={onStart} />
        {STORY_MONTHS.map((m) => (
          <MonthScene key={m.month} item={m} container={container} />
        ))}
        <FinalScene container={container} onStart={onStart} />
      </div>

      {/* Chip do mês atual + trilho de progresso, fixos sobre o scroll. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
        <motion.div
          key={chip}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: chip ? 1 : 0, y: 0 }}
          className="rounded-full bg-white/80 px-4 py-1 text-sm font-bold text-[#8b5580] shadow-sm backdrop-blur-sm"
        >
          {chip}
        </motion.div>
      </div>
      <div className="pointer-events-none absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-full transition-all ${i === index ? "h-5 bg-[#ef8fb0]" : i < index ? "h-1.5 bg-[#8b5580]/60" : "h-1.5 bg-[#8b5580]/20"}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
