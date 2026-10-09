import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageCircleHeart, SkipForward } from "lucide-react";
import { FairyFlight, GrowthRuler, Petals } from "./story-extras";
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

// true quando a cena está a até ~1 tela de distância do viewport do scroll.
// Cenas longe não montam nada pesado (fotos, parallax, sombras).
function useNear(ref: React.RefObject<HTMLElement | null>, container: React.RefObject<HTMLDivElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      root: container.current,
      rootMargin: "100% 0px 100% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, container]);
  return near;
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
    <motion.div style={{ y }} className={`pointer-events-none absolute w-12 ${className}`}>
      <img
        src={`/izabel/${name}.webp`}
        alt=""
        aria-hidden
        decoding="async"
        style={{ animationDuration: `${4 + drift / 40}s` }}
        className="flutter w-full select-none"
      />
    </motion.div>
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
        className="max-w-xs font-[Nunito] text-xl font-extrabold leading-snug text-[#4a2545]"
      >
        Role para ver a <span className="text-[#d63f86]">Izabel</span> crescer,{" "}
        <span className="text-[#6d3fb5]">mês a mês</span>, até o{" "}
        <span className="whitespace-nowrap rounded-md bg-[#ffd9e8] px-1.5 text-[#c2185b]">primeiro aninho!</span>
      </motion.p>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-[#ef8fb0]">
        <ChevronDown className="h-8 w-8" />
      </motion.div>
      <button
        onClick={onSkip}
        className="relative flex items-center gap-2 rounded-full border-2 border-[#8b5580] bg-white px-5 py-2.5 text-sm font-extrabold text-[#6a3a64] shadow-[3px_3px_0_#c9709a] active:translate-x-px active:translate-y-px"
      >
        <SkipForward className="h-4 w-4" /> Pular para as fotos
      </button>
      <img src="/izabel/flores.webp" alt="" aria-hidden decoding="async" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 w-full opacity-70" />
    </section>
  );
}

// Carrossel horizontal das fotos de um mês. Usa scroll-snap nativo: o swipe
// lateral fica aqui dentro e o gesto vertical continua pulando de mês. A
// próxima foto aparece espiando na lateral (e um aviso pulsa) para mostrar
// que dá para arrastar.
function PhotoCarousel({
  item,
  current,
  onChange,
}: {
  item: StoryMonth;
  current: number;
  onChange: (i: number) => void;
}) {
  const [touched, setTouched] = useState(false);
  const many = item.photos.length > 1;

  return (
    <div className="relative w-full">
      <div
        onScroll={(e) => {
          const el = e.currentTarget;
          const first = el.children[0] as HTMLElement | undefined;
          const second = el.children[1] as HTMLElement | undefined;
          if (!first || !second) return;
          const step = second.offsetLeft - first.offsetLeft;
          const i = Math.min(item.photos.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
          if (i !== current) onChange(i);
          if (el.scrollLeft > 8) setTouched(true);
        }}
        className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-[18vw] py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {item.photos.map((p, i) => (
          <div
            key={p.src}
            className={`w-[64vw] max-w-64 shrink-0 snap-center rounded-[2rem] bg-white p-2.5 shadow-[0_6px_16px_-4px_rgba(139,85,128,0.4)] transition-[transform,opacity] duration-300 ${
              i === current ? "scale-100 opacity-100" : "scale-90 opacity-60"
            }`}
          >
            <img
              src={p.src}
              alt={`Izabel — ${item.label} (${i + 1} de ${item.photos.length})`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="aspect-4/5 w-full rounded-3xl object-cover"
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          <AnimatePresence>
            {!touched && current === 0 && (
              <motion.div
                exit={{ opacity: 0 }}
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-[#d63f86] py-1.5 pl-3 pr-1.5 text-xs font-extrabold text-white shadow-lg"
              >
                mais fotos <ChevronRight className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            {item.photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-[#d63f86]" : "w-1.5 bg-[#8b5580]/35"}`}
              />
            ))}
            <span className="ml-2 text-xs font-bold text-[#6a3a64]">
              {current + 1}/{item.photos.length}
            </span>
          </div>
        </>
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
  const ref = useRef<HTMLElement>(null);
  const near = useNear(ref, container);
  const [current, setCurrent] = useState(0);
  const caption = item.photos[current]?.caption ?? "";

  // O <section> é sempre renderizado (mantém a altura/snap); o conteúdo
  // pesado só existe enquanto a cena está perto da tela.
  return (
    <section
      ref={ref}
      data-near={near}
      className="relative flex h-full shrink-0 snap-center flex-col items-center justify-center gap-4 overflow-hidden"
    >
      {near && (
        <MonthContent
          item={item}
          sectionRef={ref}
          container={container}
          current={current}
          onChange={setCurrent}
          caption={caption}
        />
      )}
    </section>
  );
}

function MonthContent({
  item,
  sectionRef,
  container,
  current,
  onChange,
  caption,
}: {
  item: StoryMonth;
  sectionRef: React.RefObject<HTMLElement | null>;
  container: React.RefObject<HTMLDivElement | null>;
  current: number;
  onChange: (i: number) => void;
  caption: string;
}) {
  const { scrollYProgress: progress } = useScroll({
    target: sectionRef,
    container,
    offset: ["start end", "end start"],
  });
  // Parallax: o numeral de fundo anda mais devagar que a foto.
  const numY = useTransform(progress, [0, 1], [120, -120]);
  const photoY = useTransform(progress, [0, 1], [40, -40]);
  // "Crescer": as fotos aumentam um pouco a cada mês.
  const grow = 0.82 + (item.month / STORY_MONTHS.length) * 0.18;
  const butterfly = BUTTERFLIES[item.month % BUTTERFLIES.length];
  const side = item.month % 2 === 0 ? "right-[6%] top-[12%]" : "left-[6%] top-[16%]";

  return (
    <>
      <motion.span
        aria-hidden
        style={{ y: numY }}
        className="pointer-events-none absolute select-none font-[Nunito] text-[16rem] font-black leading-none text-[#ef8fb0]/20 will-change-transform"
      >
        {item.month}
      </motion.span>
      <Butterfly name={butterfly} progress={progress} drift={70} className={side} />

      <motion.div style={{ y: photoY, scale: grow }} className="relative w-full will-change-transform">
        <PhotoCarousel item={item} current={current} onChange={onChange} />
      </motion.div>

      <div className="relative px-8 text-center">
        <h3 className="font-[Nunito] text-3xl font-black text-[#6a3a64]">{item.label}</h3>
        <div className="mt-1 h-12">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="text-base font-semibold text-[#8b5580]"
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function FinalScene({ container, onStart }: { container: React.RefObject<HTMLDivElement | null>; onStart: () => void }) {
  const { ref, progress } = useSceneProgress(container);
  const near = useNear(ref, container);
  const navigate = useNavigate();
  const fly = useTransform(progress, [0, 0.5], [160, 0]);
  const fade = useTransform(progress, [0, 0.4], [0, 1]);
  return (
    <section ref={ref} data-near={near} className="relative flex h-full shrink-0 snap-center flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center">
      <Petals />
      <img src="/izabel/flores.webp" alt="" aria-hidden decoding="async" className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-70" />
      <Butterfly name="borboleta-1" progress={progress} drift={50} className="left-[8%] top-[10%]" />
      <Butterfly name="borboleta-3" progress={progress} drift={80} className="right-[8%] top-[18%]" />
      <motion.div style={{ y: fly, opacity: fade }} className="relative w-[78%] max-w-xs">
        <img
          src="/izabel/izabel-fada.webp"
          alt="Izabel fadinha"
          decoding="async"
          style={{ animationDuration: "6s" }}
          className="flutter w-full"
        />
      </motion.div>
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
      <button
        onClick={() => navigate(`/izabel/mural${window.location.search}`)}
        className="relative flex items-center gap-2 rounded-full border-2 border-[#8b5580] bg-white px-5 py-2.5 text-sm font-extrabold text-[#6a3a64] shadow-[3px_3px_0_#c9709a] active:translate-x-px active:translate-y-px"
      >
        <MessageCircleHeart className="h-4 w-4" /> Deixar um recado
      </button>
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
      <FairyFlight progress={scrollYProgress} />
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
          className="rounded-full bg-white/95 px-4 py-1 text-sm font-bold text-[#8b5580] shadow-sm"
        >
          {chip}
        </motion.div>
      </div>
      <GrowthRuler progress={scrollYProgress} />
    </motion.div>
  );
}
