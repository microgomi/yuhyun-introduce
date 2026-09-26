// ----------------------------------------------------------------------------
// 축하 폭죽: 조각 목록은 이벤트 때 만들어서 넘긴다 (렌더 중 난수 금지)
// ----------------------------------------------------------------------------

export interface ConfettiPiece {
  left: number; // %
  delay: number; // 초
  duration: number; // 초
  drift: number; // 옆으로 흩어지는 거리(px)
  spin: number; // 회전(도)
  content: string;
  color: string;
}

const EMOJIS = ["⭐", "✨", "🔺", "🔷", "💠", "🎉"];
const COLORS = ["#ff5d8f", "#ffd23f", "#3ddc97", "#2ec4f1", "#7b61ff", "#ff9f1c"];

export function makeConfetti(count = 70): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.6 + Math.random() * 1.2,
    drift: (Math.random() - 0.5) * 240,
    spin: (Math.random() - 0.5) * 900,
    content: i % 3 === 0 ? EMOJIS[i % EMOJIS.length] : "",
    color: COLORS[i % COLORS.length],
  }));
}

export function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <style>{`@keyframes shapemaker-confetti { from { transform: translate(0, -10vh) rotate(0deg); opacity: 1; } to { transform: translate(var(--drift), 105vh) rotate(var(--spin)); opacity: 0.8; } }`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block text-xl"
          style={
            {
              left: `${p.left}%`,
              width: p.content ? undefined : 9,
              height: p.content ? undefined : 14,
              background: p.content ? undefined : p.color,
              borderRadius: 2,
              animation: `shapemaker-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        >
          {p.content}
        </span>
      ))}
    </div>
  );
}
