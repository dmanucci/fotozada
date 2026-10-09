import { Music, VolumeX } from "lucide-react";

// Botão de música no canto. Desligada por padrão (festa pode ter gente em
// ambiente silencioso); quando desligada, um anel pulsa convidando a ligar.
export function SoundButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={on ? "Desligar música" : "Ligar música"}
      aria-pressed={on}
      className="absolute left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#8b5580]/70 bg-white/95 text-[#6a3a64] shadow-[2px_2px_0_#c9709a]"
    >
      {!on && <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#ef8fb0]" />}
      {on ? <Music className="relative h-5 w-5" /> : <VolumeX className="relative h-5 w-5" />}
    </button>
  );
}
