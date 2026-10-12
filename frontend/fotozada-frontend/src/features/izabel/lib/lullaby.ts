import { useCallback, useEffect, useRef, useState } from "react";

// Caixinha de música sintetizada na hora (Web Audio): sem arquivo de áudio,
// peso zero e sem direitos autorais — a melodia é a "Canção de ninar" de
// Brahms (domínio público), em oitava grave e timbre bem macio. Só toca depois
// de um toque do usuário (política de autoplay dos navegadores) e para quando
// a aba fica em segundo plano.
// Sempre começa DESLIGADA em cada visita: nada de religar sozinha.

const HZ: Record<string, number> = {
  C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392, A: 440, B: 493.88, H: 523.25,
};

// [nota, duração em tempos] — compasso 3/4, "H" é o dó agudo.
const PHRASE_A: Array<[string, number]> = [
  ["E", 0.5], ["E", 0.5], ["G", 2], ["E", 0.5], ["E", 0.5], ["G", 2],
  ["E", 0.5], ["G", 0.5], ["H", 2], ["B", 1], ["A", 1], ["A", 1], ["G", 3],
];
const PHRASE_B: Array<[string, number]> = [
  ["D", 0.5], ["E", 0.5], ["F", 2], ["D", 0.5], ["D", 0.5], ["E", 0.5], ["F", 1.5],
  ["D", 0.5], ["F", 0.5], ["B", 2], ["A", 1], ["G", 1], ["F", 1], ["E", 3],
];
const SONG: Array<[string, number]> = [...PHRASE_A, ...PHRASE_B, ...PHRASE_A];
const BEAT = 0.85; // segundos por tempo — bem devagar, de ninar

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
    master.gain.value = 0.13;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1800;
    // eco suave para dar espaço, como uma caixinha de música num quarto calmo
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.45;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
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
    const len = Math.max(dur, 1.4);
    const mk = (f: number, peak: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      // ataque lento (sem "plim" seco) e cauda longa
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len);
      o.connect(g).connect(this.master!);
      o.start(when);
      o.stop(when + len + 0.05);
    };
    mk(freq, 0.9);
    mk(freq * 2, 0.07); // só um toque de brilho
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
        this.nextTime += BEAT * 4; // respiro antes de repetir
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

export function useLullaby() {
  const box = useRef<MusicBox | null>(null);
  const [on, setOn] = useState(false);
  const onRef = useRef(false);

  const get = () => (box.current ??= new MusicBox());

  const set = useCallback((v: boolean) => {
    onRef.current = v;
    setOn(v);
    if (v) void get().start();
    else void get().pause();
  }, []);

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
