"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

/* ───── 과일 정의 ───── */
interface FruitDef {
  name: string;
  emoji: string;
  radius: number;
  points: number;
  color: string;
  glow: string;
}

const FRUIT_DEFS: FruitDef[] = [
  { name: "체리", emoji: "🍒", radius: 12, points: 1, color: "#dc2626", glow: "#fca5a5" },
  { name: "딸기", emoji: "🍓", radius: 16, points: 3, color: "#e11d48", glow: "#fda4af" },
  { name: "포도", emoji: "🍇", radius: 20, points: 6, color: "#7c3aed", glow: "#c4b5fd" },
  { name: "귤", emoji: "🍊", radius: 25, points: 10, color: "#ea580c", glow: "#fdba74" },
  { name: "사과", emoji: "🍎", radius: 30, points: 15, color: "#dc2626", glow: "#fca5a5" },
  { name: "배", emoji: "🍐", radius: 36, points: 21, color: "#a3e635", glow: "#d9f99d" },
  { name: "복숭아", emoji: "🍑", radius: 42, points: 28, color: "#fb923c", glow: "#fed7aa" },
  { name: "파인애플", emoji: "🍍", radius: 48, points: 36, color: "#eab308", glow: "#fde047" },
  { name: "멜론", emoji: "🍈", radius: 55, points: 45, color: "#22c55e", glow: "#86efac" },
  { name: "수박", emoji: "🍉", radius: 64, points: 100, color: "#16a34a", glow: "#4ade80" },
  { name: "황금수박", emoji: "👑", radius: 72, points: 500, color: "#fbbf24", glow: "#fde68a" },
];

const W = 400;
const H = 600;
const WALL_L = 20;
const WALL_R = W - 20;
const FLOOR = H - 20;
const DROP_Y = 60;
const GRAVITY = 0.35;
const BOUNCE = 0.3;
const FRICTION = 0.98;

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  level: number;
  radius: number;
  merging: boolean;
  spawnTick: number;
}

type Screen = "title" | "playing" | "gameover";

export default function WatermelonPage() {
  const [screen, setScreen] = useState<Screen>("title");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [message, setMessage] = useState("");
  const [combo, setCombo] = useState(0);
  const [nextFruit, setNextFruit] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const nextIdRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const mergeRef = useRef(0);
  const highestRef = useRef(0);
  const animRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});
  const tickRef = useRef(0);
  const dropXRef = useRef(W / 2);
  const canDropRef = useRef(true);
  const nextFruitRef = useRef(0);
  const gameOverRef = useRef(false);

  const pickNextFruit = useCallback(() => {
    // 체리~귤(0~3) 랜덤
    const level = Math.floor(Math.random() * 4);
    nextFruitRef.current = level;
    setNextFruit(level);
  }, []);

  const dropFruit = useCallback(() => {
    if (!canDropRef.current || gameOverRef.current) return;
    canDropRef.current = false;
    const level = nextFruitRef.current;
    const def = FRUIT_DEFS[level];
    const x = Math.max(WALL_L + def.radius, Math.min(WALL_R - def.radius, dropXRef.current));
    fruitsRef.current.push({
      id: ++nextIdRef.current,
      x, y: DROP_Y,
      vx: 0, vy: 0,
      level,
      radius: def.radius,
      merging: false,
      spawnTick: tickRef.current,
    });
    pickNextFruit();
    setTimeout(() => { canDropRef.current = true; }, 500);
  }, [pickNextFruit]);

  const startGame = useCallback(() => {
    fruitsRef.current = [];
    nextIdRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    mergeRef.current = 0;
    highestRef.current = 0;
    tickRef.current = 0;
    canDropRef.current = true;
    gameOverRef.current = false;
    setScore(0);
    setCombo(0);
    setMessage("");
    pickNextFruit();
    setScreen("playing");
  }, [pickNextFruit]);

  /* ───── 게임 루프 ───── */
  useEffect(() => {
    loopRef.current = () => {
      if (screen !== "playing") return;
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;

      tickRef.current++;
      const tick = tickRef.current;

      const fruits = fruitsRef.current;

      // Physics
      for (const f of fruits) {
        if (f.merging) continue;
        f.vy += GRAVITY;
        f.vx *= FRICTION;
        f.x += f.vx;
        f.y += f.vy;

        // Walls
        if (f.x - f.radius < WALL_L) { f.x = WALL_L + f.radius; f.vx = Math.abs(f.vx) * BOUNCE; }
        if (f.x + f.radius > WALL_R) { f.x = WALL_R - f.radius; f.vx = -Math.abs(f.vx) * BOUNCE; }
        // Floor
        if (f.y + f.radius > FLOOR) { f.y = FLOOR - f.radius; f.vy = -Math.abs(f.vy) * BOUNCE; if (Math.abs(f.vy) < 1) f.vy = 0; }
      }

      // Collision between fruits
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          const a = fruits[i]; const b = fruits[j];
          if (a.merging || b.merging) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;
          if (dist < minDist) {
            if (dist <= 1) {
              a.x -= 1; b.x += 1; continue;
            }
            const nx = dx / dist; const ny = dy / dist;
            const overlap = minDist - dist;
            a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
            // Bounce
            const relV = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (relV > 0) {
              a.vx -= nx * relV * 0.5; a.vy -= ny * relV * 0.5;
              b.vx += nx * relV * 0.5; b.vy += ny * relV * 0.5;
            }
          }
        }
      }

      // Merges
      const merges: { aId: number; bId: number; mx: number; my: number; vx: number; vy: number; level: number }[] = [];
      const merged = new Set<number>();
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          const a = fruits[i]; const b = fruits[j];
          if (a.merging || b.merging) continue;
          if (merged.has(a.id) || merged.has(b.id)) continue;
          if (a.level !== b.level) continue;
          if (a.level >= FRUIT_DEFS.length - 1) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < a.radius + b.radius) {
            merged.add(a.id); merged.add(b.id);
            merges.push({
              aId: a.id, bId: b.id,
              mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
              vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2,
              level: a.level + 1,
            });
          }
        }
      }

      for (const m of merges) {
        const removeIds = new Set([m.aId, m.bId]);
        fruitsRef.current = fruitsRef.current.filter(p => !removeIds.has(p.id));
        const newDef = FRUIT_DEFS[m.level];
        fruitsRef.current.push({
          id: ++nextIdRef.current,
          x: m.mx, y: m.my,
          vx: m.vx, vy: m.vy,
          level: m.level,
          radius: newDef.radius,
          merging: false,
          spawnTick: tick,
        });
        scoreRef.current += newDef.points;
        comboRef.current++;
        mergeRef.current++;
        if (m.level > highestRef.current) highestRef.current = m.level;

        if (m.level >= 9) {
          setMessage(`🍉 ${newDef.emoji} ${newDef.name} 완성!!`);
          setTimeout(() => setMessage(""), 2000);
        } else if (m.level >= 6) {
          setMessage(`✨ ${newDef.emoji} ${newDef.name} 탄생!`);
          setTimeout(() => setMessage(""), 1500);
        }
      }

      if (merges.length > 0) {
        setScore(scoreRef.current);
        setCombo(comboRef.current);
      }
      if (merges.length === 0 && comboRef.current > 0) {
        if (comboRef.current >= 3) {
          const bonus = comboRef.current * 5;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          setMessage(`🔥 ${comboRef.current}콤보! +${bonus}점`);
          setTimeout(() => setMessage(""), 1200);
        }
        comboRef.current = 0;
        setCombo(0);
      }

      // Game over check
      if (tick > 60 && tick % 30 === 0 && !gameOverRef.current) {
        for (const f of fruitsRef.current) {
          if (tick - f.spawnTick < 90) continue;
          if (f.y - f.radius < DROP_Y + 15 && Math.abs(f.vy) < 2) {
            gameOverRef.current = true;
            setHighScore(h => Math.max(h, scoreRef.current));
            setScreen("gameover");
            return;
          }
        }
      }

      // Sync score periodically
      if (tick % 5 === 0) setScore(scoreRef.current);

      // ─── Draw ───
      ctx.clearRect(0, 0, W, H);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#fef3c7");
      bgGrad.addColorStop(1, "#d9f99d");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Walls
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, 0, WALL_L, H);
      ctx.fillRect(WALL_R, 0, W - WALL_R, H);
      ctx.fillRect(0, FLOOR, W, H - FLOOR);

      // Danger line
      ctx.strokeStyle = "#ef444466";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(WALL_L, DROP_Y + 15);
      ctx.lineTo(WALL_R, DROP_Y + 15);
      ctx.stroke();
      ctx.setLineDash([]);

      // Drop guide
      if (canDropRef.current && !gameOverRef.current) {
        const nDef = FRUIT_DEFS[nextFruitRef.current];
        const gx = Math.max(WALL_L + nDef.radius, Math.min(WALL_R - nDef.radius, dropXRef.current));
        ctx.strokeStyle = "#00000022";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, DROP_Y);
        ctx.lineTo(gx, FLOOR);
        ctx.stroke();
        ctx.setLineDash([]);
        // Preview fruit
        ctx.font = `${nDef.radius * 1.5}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.7;
        ctx.fillText(nDef.emoji, gx, DROP_Y);
        ctx.globalAlpha = 1;
      }

      // Fruits
      for (const f of fruitsRef.current) {
        const def = FRUIT_DEFS[f.level];
        // Glow
        const grad = ctx.createRadialGradient(f.x, f.y, f.radius * 0.3, f.x, f.y, f.radius);
        grad.addColorStop(0, def.glow + "88");
        grad.addColorStop(1, def.glow + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        // Circle
        ctx.fillStyle = def.color + "33";
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def.color + "66";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Emoji
        const fontSize = Math.max(f.radius * 1.4, 14);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(def.emoji, f.x, f.y);
      }

      // Next frame
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen]);

  /* ───── 입력 처리 ───── */
  const handleMove = useCallback((clientX: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const scaleX = W / rect.width;
    dropXRef.current = (clientX - rect.left) * scaleX;
  }, []);

  const handleDrop = useCallback((clientX: number) => {
    handleMove(clientX);
    dropFruit();
  }, [handleMove, dropFruit]);

  /* ───── 타이틀 ───── */
  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 via-yellow-50 to-green-200 flex flex-col items-center justify-center p-4">
        <Link href="/" className="text-green-700 text-sm mb-8 self-start ml-4">← 홈으로</Link>
        <div className="text-8xl mb-4">🍉</div>
        <h1 className="text-4xl font-black text-green-800 mb-2">수박 만들기</h1>
        <p className="text-green-600 mb-2">같은 과일을 합쳐서 수박을 만들어라!</p>
        {highScore > 0 && <p className="text-yellow-600 mb-2 font-bold">🏆 최고점수: {highScore}</p>}
        <div className="bg-white/60 rounded-xl p-4 mb-6 max-w-xs w-full">
          <h3 className="text-sm font-bold text-center text-green-800 mb-2">과일 진화 순서</h3>
          <div className="flex flex-wrap justify-center gap-1">
            {FRUIT_DEFS.map((d, i) => (
              <div key={i} className="text-center px-1">
                <div className="text-xl">{d.emoji}</div>
                <div className="text-[9px] text-green-700">{d.name}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={startGame}
          className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-8 py-4 text-xl font-bold shadow-lg active:scale-95 transition-transform">
          게임 시작!
        </button>
      </div>
    );
  }

  /* ───── 게임 오버 ───── */
  if (screen === "gameover") {
    const grade =
      score >= 500 ? { name: "S", color: "#e03131", desc: "수박 마스터!" } :
      score >= 300 ? { name: "A", color: "#f59f00", desc: "과일 달인!" } :
      score >= 150 ? { name: "B", color: "#ae3ec9", desc: "잘했어요!" } :
      score >= 80  ? { name: "C", color: "#4dabf7", desc: "조금 더 노력!" } :
                     { name: "D", color: "#aaa", desc: "다시 도전!" };
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-100 via-yellow-50 to-green-100 flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-black text-red-600 mb-4">게임 오버!</h2>
        <div className="text-7xl font-black mb-2" style={{ color: grade.color }}>{grade.name}</div>
        <p className="text-lg mb-1" style={{ color: grade.color }}>{grade.desc}</p>
        <div className="bg-white/60 rounded-xl p-4 mb-4 text-center">
          <p className="text-2xl font-black text-green-800">🍉 {score}점</p>
          <p className="text-sm text-green-600">최고 과일: {FRUIT_DEFS[highestRef.current]?.emoji} {FRUIT_DEFS[highestRef.current]?.name}</p>
          <p className="text-sm text-green-600">합체 횟수: {mergeRef.current}번</p>
          {highScore > 0 && <p className="text-sm text-yellow-600 font-bold">🏆 최고점수: {highScore}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={startGame}
            className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-6 py-3 font-bold shadow-lg">
            다시하기
          </button>
          <Link href="/"
            className="bg-gray-500 hover:bg-gray-400 text-white rounded-xl px-6 py-3 font-bold shadow-lg">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  /* ───── 플레이 화면 ───── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 via-yellow-50 to-green-200 flex flex-col items-center p-2">
      {/* HUD */}
      <div className="w-full max-w-[400px] flex justify-between items-center mb-1 px-1">
        <Link href="/" className="text-green-700 text-xs">← 홈</Link>
        <div className="text-lg font-black text-green-800">🍉 {score}점</div>
        <div className="flex items-center gap-2">
          {combo >= 2 && <span className="text-orange-500 text-xs font-bold animate-pulse">🔥{combo}콤보</span>}
          <div className="text-center">
            <div className="text-[10px] text-green-600">다음</div>
            <div className="text-xl">{FRUIT_DEFS[nextFruit]?.emoji}</div>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className="absolute top-16 z-10 bg-white/90 text-green-800 font-black px-4 py-2 rounded-xl shadow-lg text-lg animate-bounce">
          {message}
        </div>
      )}

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl shadow-lg max-w-full touch-none"
        style={{ maxHeight: "calc(100vh - 80px)" }}
        onMouseMove={e => handleMove(e.clientX)}
        onClick={e => handleDrop(e.clientX)}
        onTouchStart={e => {
          const t = e.touches[0];
          handleMove(t.clientX);
        }}
        onTouchMove={e => {
          const t = e.touches[0];
          handleMove(t.clientX);
        }}
        onTouchEnd={e => {
          const t = e.changedTouches[0];
          handleDrop(t.clientX);
        }}
      />
    </div>
  );
}
