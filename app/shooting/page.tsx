"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  dx: number;
  dy: number;
  type: "normal" | "fast" | "small" | "bonus" | "bomb";
  hp: number;
  maxHp: number;
  points: number;
  emoji: string;
}

const TARGET_TYPES = {
  normal: { emoji: "🎯", points: 10, hp: 1, size: 50, color: "#ef4444" },
  fast: { emoji: "💨", points: 20, hp: 1, size: 45, color: "#3b82f6" },
  small: { emoji: "🔴", points: 30, hp: 1, size: 30, color: "#f97316" },
  bonus: { emoji: "⭐", points: 50, hp: 1, size: 55, color: "#fbbf24" },
  bomb: { emoji: "💣", points: -30, hp: 1, size: 45, color: "#1e1b4b" },
};

export default function ShootingGame() {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [effects, setEffects] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const [level, setLevel] = useState(1);
  const areaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const frameRef = useRef(0);

  const spawnTarget = useCallback(() => {
    const types: Target["type"][] = ["normal", "normal", "normal", "fast", "small", "bonus", "bomb"];
    const type = types[Math.floor(Math.random() * types.length)];
    const info = TARGET_TYPES[type];
    const area = areaRef.current;
    const w = area ? area.clientWidth : 350;
    const h = area ? area.clientHeight : 500;
    const t: Target = {
      id: idRef.current++,
      x: info.size + Math.random() * (w - info.size * 2),
      y: info.size + Math.random() * (h - info.size * 2),
      size: info.size,
      speed: type === "fast" ? 2.5 + level * 0.3 : 1 + level * 0.2,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      type,
      hp: info.hp,
      maxHp: info.hp,
      points: info.points,
      emoji: info.emoji,
    };
    setTargets((prev) => [...prev, t]);
  }, [level]);

  const startGame = useCallback(() => {
    setPlaying(true);
    setGameOver(false);
    setTargets([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setShots(0);
    setTimeLeft(30);
    setLevel(1);
    setEffects([]);
    idRef.current = 0;
  }, []);

  // 타이머
  useEffect(() => {
    if (!playing || gameOver) return;
    if (timeLeft <= 0) { setGameOver(true); setPlaying(false); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [playing, gameOver, timeLeft]);

  // 레벨업
  useEffect(() => {
    setLevel(1 + Math.floor(score / 100));
  }, [score]);

  // 게임 루프
  useEffect(() => {
    if (!playing || gameOver) return;
    let spawnTimer = 0;
    const loop = () => {
      spawnTimer++;
      const rate = Math.max(20, 50 - level * 3);
      if (spawnTimer >= rate) { spawnTimer = 0; spawnTarget(); }

      const area = areaRef.current;
      const w = area ? area.clientWidth : 350;
      const h = area ? area.clientHeight : 500;

      setTargets((prev) => prev.map((t) => {
        let nx = t.x + t.dx * t.speed;
        let ny = t.y + t.dy * t.speed;
        let ndx = t.dx, ndy = t.dy;
        if (nx < t.size / 2 || nx > w - t.size / 2) ndx = -ndx;
        if (ny < t.size / 2 || ny > h - t.size / 2) ndy = -ndy;
        return { ...t, x: nx, y: ny, dx: ndx, dy: ndy };
      }).filter((t) => t.hp > 0));

      // 오래된 타겟 제거 (최대 15개)
      setTargets((prev) => prev.length > 15 ? prev.slice(-12) : prev);

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, gameOver, level, spawnTarget]);

  const handleShoot = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!playing || gameOver) return;
    setShots((s) => s + 1);

    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    let cx: number, cy: number;
    if ("touches" in e) {
      cx = e.touches[0].clientX - rect.left;
      cy = e.touches[0].clientY - rect.top;
    } else {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }

    let hit = false;
    setTargets((prev) => {
      const next = [...prev];
      // 가장 위에 있는 타겟부터 체크
      for (let i = next.length - 1; i >= 0; i--) {
        const t = next[i];
        const dist = Math.sqrt((cx - t.x) ** 2 + (cy - t.y) ** 2);
        if (dist < t.size / 2 + 5) {
          hit = true;
          t.hp--;
          if (t.hp <= 0) {
            if (t.type === "bomb") {
              setScore((s) => Math.max(0, s + t.points));
              setCombo(0);
              setEffects((ef) => [...ef, { id: Date.now(), x: cx, y: cy, text: `${t.points}`, color: "#ef4444" }]);
            } else {
              const nc = combo + 1;
              const pts = t.points * (1 + Math.floor(nc / 3));
              setScore((s) => s + pts);
              setCombo(nc);
              setMaxCombo((mc) => Math.max(mc, nc));
              setEffects((ef) => [...ef, { id: Date.now(), x: cx, y: cy, text: `+${pts}`, color: "#fbbf24" }]);
            }
            setHits((h) => h + 1);
            next.splice(i, 1);
          }
          break;
        }
      }
      if (!hit) {
        setCombo(0);
        setEffects((ef) => [...ef, { id: Date.now(), x: cx, y: cy, text: "MISS", color: "#666" }]);
      }
      return next;
    });

    setTimeout(() => setEffects((ef) => ef.slice(-5)), 600);
  }, [playing, gameOver, combo]);

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;

  if (!playing && !gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 to-red-950 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-8xl mb-6">🎯</div>
        <h1 className="text-4xl font-black mb-2">사격 연습장</h1>
        <p className="text-white/60 mb-2">30초 안에 최대한 많이 맞춰라!</p>
        <div className="bg-white/10 rounded-xl p-4 mb-8 text-sm text-white/50 max-w-xs space-y-1">
          <p>🎯 일반 (+10) | 💨 빠른거 (+20)</p>
          <p>🔴 작은거 (+30) | ⭐ 보너스 (+50)</p>
          <p>💣 폭탄 (-30, 콤보 초기화!)</p>
        </div>
        <button onClick={startGame} className="px-10 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-xl font-bold hover:scale-105 active:scale-95 transition">
          사격 시작!
        </button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 to-red-950 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-4xl font-black mb-6">결과</h2>
        <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-white/50 text-xs">점수</p><p className="text-3xl font-bold text-yellow-400">{score}</p></div>
          <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-white/50 text-xs">명중률</p><p className="text-3xl font-bold text-green-400">{accuracy}%</p></div>
          <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-white/50 text-xs">명중</p><p className="text-3xl font-bold">{hits}/{shots}</p></div>
          <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-white/50 text-xs">최대콤보</p><p className="text-3xl font-bold text-cyan-400">x{maxCombo}</p></div>
        </div>
        <button onClick={startGame} className="px-10 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-xl font-bold hover:scale-105 active:scale-95 transition">
          다시하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 to-red-950 flex flex-col items-center px-4 py-4 text-white">
      <Link href="/" className="fixed top-3 left-3 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/30 transition z-50">← 홈</Link>
      <div className="flex gap-3 mt-8 mb-3 text-xs flex-wrap justify-center">
        <span className="bg-white/10 rounded-lg px-3 py-1 font-bold">⭐ {score}</span>
        <span className={`bg-white/10 rounded-lg px-3 py-1 font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : ""}`}>⏱ {timeLeft}초</span>
        <span className="bg-white/10 rounded-lg px-3 py-1 text-yellow-400 font-bold">🔥 x{combo}</span>
        <span className="bg-white/10 rounded-lg px-3 py-1">🎯 {accuracy}%</span>
      </div>

      <div ref={areaRef} onClick={handleShoot} onTouchStart={handleShoot}
        className="relative w-full max-w-md bg-black/30 rounded-2xl border border-white/10 overflow-hidden select-none"
        style={{ height: "65vh", cursor: "crosshair", touchAction: "none" }}>
        {targets.map((t) => (
          <div key={t.id} className="absolute transition-none" style={{
            left: t.x - t.size / 2, top: t.y - t.size / 2,
            width: t.size, height: t.size,
            fontSize: t.size * 0.6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {t.emoji}
          </div>
        ))}
        {effects.map((e) => (
          <div key={e.id} className="absolute font-black text-lg animate-bounce pointer-events-none"
            style={{ left: e.x - 20, top: e.y - 30, color: e.color }}>
            {e.text}
          </div>
        ))}
        {/* 조준선 */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
          <div className="w-10 h-0.5 bg-white" />
          <div className="absolute w-0.5 h-10 bg-white" />
        </div>
      </div>
    </div>
  );
}
