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
