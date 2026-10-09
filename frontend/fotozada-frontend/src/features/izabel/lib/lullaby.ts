import { useCallback, useEffect, useRef, useState } from "react";

// Caixinha de música sintetizada na hora (Web Audio): sem arquivo de áudio,
// peso zero e sem direitos autorais — a melodia é "Brilha, brilha, estrelinha",
// de domínio público. Só toca depois de um toque do usuário (política de
// autoplay dos navegadores) e para quando a aba fica em segundo plano.

const HZ: Record<string, number> = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880 };

// [nota, duração em tempos]
const PHRASE_A: Array<[string, number]> = [
  ["C", 1], ["C", 1], ["G", 1], ["G", 1], ["A", 1], ["A", 1], ["G", 2],
  ["F", 1], ["F", 1], ["E", 1], ["E", 1], ["D", 1], ["D", 1], ["C", 2],
];
const PHRASE_B: Array<[string, number]> = [
  ["G", 1], ["G", 1], ["F", 1], ["F", 1], ["E", 1], ["E", 1], ["D", 2],
  ["G", 1], ["G", 1], ["F", 1], ["F", 1], ["E", 1], ["E", 1], ["D", 2],
];
const SONG: Array<[string, number]> = [...PHRASE_A, ...PHRASE_B, ...PHRASE_A];
const BEAT = 0.7; // segundos por tempo — calmo, de ninar

class MusicBox {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private idx = 0;
  private nextTime = 0;

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.16;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3200;
    // eco curtinho para dar brilho de caixinha de música
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.32;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    delay.connect(fb).connect(delay);
    master.connect(lowpass);
    lowpass.connect(ctx.destination);
    lowpass.connect(delay);
    delay.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  private ping(freq: number, when: number, dur: number) {
    const ctx = this.ctx!;
    const mk = (type: OscillatorType, f: number, peak: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, 0.9));
      o.connect(g).connect(this.master!);
      o.start(when);
      o.stop(when + Math.max(dur, 0.9) + 0.05);
    };
    mk("sine", freq, 0.9);
    mk("triangle", freq * 2, 0.22); // harmônico agudo = timbre de caixinha
  }

  private tick = () => {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.8) {
      const [note, beats] = SONG[this.idx];
      this.ping(HZ[note], this.nextTime, beats * BEAT);
      this.nextTime += beats * BEAT;
      this.idx += 1;
      if (this.idx >= SONG.length) {
        this.idx = 0;
        this.nextTime += BEAT * 3; // respiro antes de repetir
      }
    }
  };

  async start() {
    const ctx = this.ensure();
    await ctx.resume();
    if (this.timer != null) return;
    this.nextTime = ctx.currentTime + 0.1;
    this.tick();
    this.timer = window.setInterval(this.tick, 250);
  }

  async pause() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
  }
}

const PREF_KEY = "fotozada_izabel_music";

export function useLullaby() {
  const box = useRef<MusicBox | null>(null);
  const [on, setOn] = useState(false);
  const onRef = useRef(false);

  const get = () => (box.current ??= new MusicBox());

  const set = useCallback((v: boolean) => {
    onRef.current = v;
    setOn(v);
    try {
      localStorage.setItem(PREF_KEY, v ? "on" : "off");
    } catch {
      // sem localStorage: só não lembra a preferência
    }
    if (v) void get().start();
    else void get().pause();
  }, []);

  // Quem deixou ligado na última visita: religa no primeiro toque (o navegador
  // não deixa tocar sem um gesto do usuário).
  useEffect(() => {
    let wants = false;
    try {
      wants = localStorage.getItem(PREF_KEY) === "on";
    } catch {
      // ignore
    }
    if (!wants) return;
    const resume = () => set(true);
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, [set]);

  // Pausa em segundo plano / retoma ao voltar.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) void get().pause();
      else if (onRef.current) void get().start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void box.current?.pause();
    };
  }, []);

  return { on, toggle: () => set(!onRef.current) };
}
