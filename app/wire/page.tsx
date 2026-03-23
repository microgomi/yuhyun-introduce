"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

const WIRE_COLORS = [
  { name: "빨강", color: "#ef4444", glow: "#fca5a5" },
  { name: "파랑", color: "#3b82f6", glow: "#93c5fd" },
  { name: "노랑", color: "#eab308", glow: "#fde047" },
  { name: "초록", color: "#22c55e", glow: "#86efac" },
  { name: "보라", color: "#a855f7", glow: "#d8b4fe" },
  { name: "주황", color: "#f97316", glow: "#fdba74" },
];

interface WirePair {
  id: number;
  color: typeof WIRE_COLORS[number];
  leftY: number;
  rightY: number;
  connected: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRound(count: number): WirePair[] {
  const colors = shuffleArray(WIRE_COLORS).slice(0, count);
  const leftPositions = colors.map((_, i) => i);
  const rightPositions = shuffleArray(colors.map((_, i) => i));
  return colors.map((color, i) => ({
    id: i,
    color,
    leftY: leftPositions[i],
    rightY: rightPositions[i],
    connected: false,
  }));
}

export default function WireGame() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "clear">("menu");
  const [level, setLevel] = useState(1);
  const [wireCount, setWireCount] = useState(4);
  const [wires, setWires] = useState<WirePair[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [sparkles, setSparkles] = useState<{ x: number; y: number; id: number }[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const sparkleIdRef = useRef(0);

  const startGame = useCallback(() => {
    setLevel(1);
    setScore(0);
    setWireCount(4);
    setTimeLeft(60);
    const w = generateRound(4);
    setWires(w);
    setGameState("playing");
  }, []);

  const nextLevel = useCallback(() => {
    const newCount = Math.min(6, wireCount + (level % 2 === 0 ? 1 : 0));
    setWireCount(newCount);
    setLevel((l) => l + 1);
    setWires(generateRound(newCount));
  }, [wireCount, level]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) {
      if (score > bestScore) setBestScore(score);
      setGameState("clear");
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, timeLeft, score, bestScore]);

  // Check level complete
  useEffect(() => {
    if (gameState !== "playing") return;
    if (wires.length > 0 && wires.every((w) => w.connected)) {
      const bonus = timeLeft > 0 ? 10 : 5;
      setScore((s) => s + bonus * level);
      setTimeLeft((t) => t + 5); // bonus time
      setTimeout(nextLevel, 600);
    }
  }, [wires, gameState]);

  const getLeftPos = (index: number) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const gap = rect.height / (wireCount + 1);
    return { x: rect.left + 40, y: rect.top + gap * (index + 1) };
  };

  const getRightPos = (index: number) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const gap = rect.height / (wireCount + 1);
    return { x: rect.right - 40, y: rect.top + gap * (index + 1) };
  };

  const addSparkle = (x: number, y: number) => {
    const id = sparkleIdRef.current++;
    setSparkles((s) => [...s, { x, y, id }]);
    setTimeout(() => setSparkles((s) => s.filter((sp) => sp.id !== id)), 600);
  };

  const handlePointerDown = (wireId: number) => {
    if (gameState !== "playing") return;
    const wire = wires.find((w) => w.id === wireId);
    if (wire && !wire.connected) {
      setDragging(wireId);
      const pos = getLeftPos(wire.leftY);
      setMousePos(pos);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return;
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const dragWire = wires.find((w) => w.id === dragging);
    if (!dragWire) {
      setDragging(null);
      return;
    }

    // Check if dropped on correct right terminal
    const rightPos = getRightPos(dragWire.rightY);
    const dist = Math.sqrt((e.clientX - rightPos.x) ** 2 + (e.clientY - rightPos.y) ** 2);

    if (dist < 40) {
      setWires((prev) =>
        prev.map((w) => (w.id === dragging ? { ...w, connected: true } : w))
      );
      addSparkle(rightPos.x, rightPos.y);
    }
    setDragging(null);
  };

  // Menu
  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 flex flex-col items-center justify-center p-6 text-white">
        <Link href="/" className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm">
          ← 홈으로
        </Link>
        <div className="text-7xl mb-6">🔌</div>
        <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-yellow-400 via-red-400 to-blue-400 bg-clip-text text-transparent">
          전선 연결하기
        </h1>
        <p className="text-gray-400 mb-8 text-center">같은 색 전선을 왼쪽에서 오른쪽으로 드래그해서 연결하세요!</p>

        <div className="flex gap-3 mb-8">
          {WIRE_COLORS.slice(0, 4).map((c) => (
            <div
              key={c.name}
              className="w-12 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: c.color, boxShadow: `0 0 10px ${c.glow}` }}
            />
          ))}
        </div>

        <button
          onClick={startGame}
          className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-white font-bold text-xl px-10 py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
        >
          게임 시작! ⚡
        </button>

        {bestScore > 0 && (
          <p className="mt-6 text-yellow-400 text-lg">🏆 최고 점수: {bestScore}점</p>
        )}

        <div className="mt-10 bg-white/5 rounded-2xl p-6 max-w-sm text-center">
          <p className="text-sm text-gray-300 mb-2">🎯 <strong>게임 방법</strong></p>
          <p className="text-xs text-gray-400 leading-relaxed">
            왼쪽의 전선을 터치/클릭한 채로<br />
            오른쪽의 같은 색 단자에 연결하세요!<br />
            레벨이 올라갈수록 전선이 늘어납니다.<br />
            제한 시간 안에 최고 점수를 달성하세요!
          </p>
        </div>
      </div>
    );
  }

  // Game Over
  if (gameState === "clear") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-7xl mb-6">⏱️</div>
        <h2 className="text-3xl font-extrabold mb-2">시간 종료!</h2>
        <p className="text-gray-400 mb-6">레벨 {level}까지 도달했어요!</p>
        <div className="bg-white/10 rounded-2xl p-6 mb-6 text-center">
          <p className="text-5xl font-extrabold text-yellow-400 mb-2">{score}점</p>
          {score >= bestScore && score > 0 && (
            <p className="text-sm text-yellow-300 animate-bounce">🏆 최고 기록!</p>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            다시 하기 🔄
          </button>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3 rounded-xl transition-all hover:scale-105"
          >
            홈으로 🏠
          </Link>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 flex flex-col items-center p-4 text-white select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {/* HUD */}
      <div className="w-full max-w-lg flex justify-between items-center mb-4">
        <Link href="/" className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 text-sm">
          ← 홈
        </Link>
        <div className="flex gap-4 text-sm">
          <span className="bg-white/10 px-3 py-1.5 rounded-xl">⚡ 레벨 {level}</span>
          <span className="bg-white/10 px-3 py-1.5 rounded-xl">⭐ {score}점</span>
          <span className={`px-3 py-1.5 rounded-xl ${timeLeft <= 10 ? "bg-red-500/50 animate-pulse" : "bg-white/10"}`}>
            ⏱️ {timeLeft}초
          </span>
        </div>
      </div>

      {/* Wire Board */}
      <div
        ref={boardRef}
        className="relative w-full max-w-lg bg-slate-700/50 rounded-3xl border-2 border-slate-600 shadow-2xl"
        style={{ height: `${Math.max(400, wireCount * 90)}px` }}
      >
        {/* Panel background */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-slate-800/80 rounded-l-3xl border-r-2 border-slate-600" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-slate-800/80 rounded-r-3xl border-l-2 border-slate-600" />

        {/* SVG for wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
          {/* Connected wires */}
          {wires
            .filter((w) => w.connected)
            .map((w) => {
              const left = getLeftPos(w.leftY);
              const right = getRightPos(w.rightY);
              if (!boardRef.current) return null;
              const rect = boardRef.current.getBoundingClientRect();
              const x1 = left.x - rect.left;
              const y1 = left.y - rect.top;
              const x2 = right.x - rect.left;
              const y2 = right.y - rect.top;
              return (
                <g key={`connected-${w.id}`}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={w.color.glow}
                    strokeWidth={10}
                    strokeLinecap="round"
                    opacity={0.4}
                  />
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={w.color.color}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* Dragging wire */}
          {dragging !== null && (() => {
            const w = wires.find((w) => w.id === dragging);
            if (!w || !boardRef.current) return null;
            const rect = boardRef.current.getBoundingClientRect();
            const left = getLeftPos(w.leftY);
            const x1 = left.x - rect.left;
            const y1 = left.y - rect.top;
            const x2 = mousePos.x - rect.left;
            const y2 = mousePos.y - rect.top;
            return (
              <g>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={w.color.glow}
                  strokeWidth={10}
                  strokeLinecap="round"
                  opacity={0.5}
                />
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={w.color.color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray="12 6"
                />
              </g>
            );
          })()}
        </svg>

        {/* Left terminals */}
        {wires.map((w) => {
          const pos = getLeftPos(w.leftY);
          if (!boardRef.current) return null;
          const rect = boardRef.current.getBoundingClientRect();
          return (
            <div
              key={`left-${w.id}`}
              className="absolute flex items-center cursor-pointer"
              style={{
                left: pos.x - rect.left - 18,
                top: pos.y - rect.top - 18,
                zIndex: 20,
              }}
              onPointerDown={() => handlePointerDown(w.id)}
            >
              <div
                className={`w-9 h-9 rounded-full border-3 transition-all ${
                  w.connected ? "scale-110" : "hover:scale-125"
                }`}
                style={{
                  backgroundColor: w.color.color,
                  borderColor: w.connected ? w.color.glow : "#475569",
                  boxShadow: w.connected
                    ? `0 0 15px ${w.color.glow}, 0 0 30px ${w.color.color}40`
                    : `0 0 8px ${w.color.color}40`,
                }}
              />
              <div
                className="h-2 w-6 -ml-1"
                style={{ backgroundColor: w.color.color }}
              />
            </div>
          );
        })}

        {/* Right terminals */}
        {wires.map((w) => {
          const pos = getRightPos(w.rightY);
          if (!boardRef.current) return null;
          const rect = boardRef.current.getBoundingClientRect();
          return (
            <div
              key={`right-${w.id}`}
              className="absolute flex items-center"
              style={{
                left: pos.x - rect.left - 18,
                top: pos.y - rect.top - 18,
                zIndex: 20,
              }}
            >
              <div
                className="h-2 w-6 -mr-1"
                style={{ backgroundColor: w.color.color }}
              />
              <div
                className={`w-9 h-9 rounded-full border-3 transition-all ${
                  w.connected ? "scale-110" : ""
                }`}
                style={{
                  backgroundColor: w.color.color,
                  borderColor: w.connected ? w.color.glow : "#475569",
                  boxShadow: w.connected
                    ? `0 0 15px ${w.color.glow}, 0 0 30px ${w.color.color}40`
                    : `0 0 8px ${w.color.color}40`,
                }}
              />
            </div>
          );
        })}

        {/* Sparkle effects */}
        {sparkles.map((s) => {
          if (!boardRef.current) return null;
          const rect = boardRef.current.getBoundingClientRect();
          return (
            <div
              key={s.id}
              className="absolute pointer-events-none animate-ping"
              style={{
                left: s.x - rect.left - 15,
                top: s.y - rect.top - 15,
                zIndex: 30,
              }}
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full opacity-60" />
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="w-full max-w-lg mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>연결 진행도</span>
          <span>{wires.filter((w) => w.connected).length} / {wires.length}</span>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${(wires.filter((w) => w.connected).length / wires.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Hint */}
      <p className="mt-4 text-xs text-gray-500">왼쪽 단자를 드래그해서 오른쪽 같은 색 단자에 연결하세요!</p>
    </div>
  );
}
