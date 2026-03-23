"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "result";

interface PeelPoint {
  x: number;
  y: number;
  angle: number;
}

// --- Constants ---
const APPLE_RADIUS = 100;
const APPLE_CX = 180;
const APPLE_CY = 200;
const PEEL_WIDTH = 14;
const CANVAS_W = 360;
const CANVAS_H = 420;

// The "ideal" peel path goes around the apple in a spiral
// Generate the ideal circular path
function generateIdealPath(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const totalAngle = Math.PI * 6; // 3 full loops
  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = -Math.PI / 2 + totalAngle * t;
    const r = APPLE_RADIUS - t * 60; // spiral inward
    const x = APPLE_CX + Math.cos(angle) * r;
    const y = APPLE_CY + Math.sin(angle) * r;
    points.push({ x, y });
  }
  return points;
}

export default function ApplePeelPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [peelPath, setPeelPath] = useState<PeelPoint[]>([]);
  const [isPeeling, setIsPeeling] = useState(false);
  const [peelLength, setPeelLength] = useState(0);
  const [broken, setBroken] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [peelPercent, setPeelPercent] = useState(0);
  const [appleColor, setAppleColor] = useState(0); // 0-100, how peeled
  const [showGuide, setShowGuide] = useState(true);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [message, setMessage] = useState("");
  const [totalPeeled, setTotalPeeled] = useState(0);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const idealPathRef = useRef(generateIdealPath());
  const pathIndexRef = useRef(0);
  const peelPathRef = useRef<PeelPoint[]>([]);
  const brokenRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const TOLERANCE = difficulty === "easy" ? 40 : difficulty === "normal" ? 28 : 18;

  // Draw apple and peel
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Cutting board
    ctx.fillStyle = "#8B6914";
    ctx.beginPath();
    ctx.ellipse(APPLE_CX, APPLE_CY + 120, 150, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#A0781E";
    ctx.beginPath();
    ctx.ellipse(APPLE_CX, APPLE_CY + 115, 150, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Apple shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(APPLE_CX + 5, APPLE_CY + 105, 85, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Apple body (peeled part = yellow, unpeeled = red)
    const peeledAmount = peelPathRef.current.length / 300;

    // Inner apple (yellow/white)
    ctx.fillStyle = "#FFFDE0";
    ctx.beginPath();
    ctx.arc(APPLE_CX, APPLE_CY, APPLE_RADIUS - 2, 0, Math.PI * 2);
    ctx.fill();

    // Red skin overlay (fades as peeled)
    const skinOpacity = Math.max(0, 1 - peeledAmount * 1.2);
    ctx.fillStyle = `rgba(220, 30, 30, ${skinOpacity})`;
    ctx.beginPath();
    ctx.arc(APPLE_CX, APPLE_CY, APPLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Apple highlight
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * skinOpacity})`;
    ctx.beginPath();
    ctx.ellipse(APPLE_CX - 30, APPLE_CY - 40, 25, 35, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = "#5D3A1A";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(APPLE_CX, APPLE_CY - APPLE_RADIUS + 5);
    ctx.quadraticCurveTo(APPLE_CX + 5, APPLE_CY - APPLE_RADIUS - 15, APPLE_CX + 2, APPLE_CY - APPLE_RADIUS - 25);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.ellipse(APPLE_CX + 12, APPLE_CY - APPLE_RADIUS - 12, 12, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Guide path (faded)
    if (showGuide && !brokenRef.current) {
      const ideal = idealPathRef.current;
      ctx.strokeStyle = "rgba(255, 255, 100, 0.15)";
      ctx.lineWidth = PEEL_WIDTH + 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      for (let i = pathIndexRef.current; i < ideal.length; i++) {
        if (i === pathIndexRef.current) ctx.moveTo(ideal[i].x, ideal[i].y);
        else ctx.lineTo(ideal[i].x, ideal[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Next target indicator
      if (pathIndexRef.current < ideal.length) {
        const target = ideal[Math.min(pathIndexRef.current + 5, ideal.length - 1)];
        ctx.fillStyle = "rgba(255, 255, 100, 0.4)";
        ctx.beginPath();
        ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Peel trail (the actual peel)
    const path = peelPathRef.current;
    if (path.length > 1) {
      // Peel skin (red/green on outside)
      ctx.strokeStyle = "#CC2200";
      ctx.lineWidth = PEEL_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      // Inner peel (lighter)
      ctx.strokeStyle = "#FFE4B5";
      ctx.lineWidth = PEEL_WIDTH - 4;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }

    // Knife cursor at last point
    if (path.length > 0 && !brokenRef.current) {
      const last = path[path.length - 1];
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔪", last.x + 18, last.y - 14);
    }

    // Broken indicator
    if (brokenRef.current) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = "#FF4444";
      ctx.textAlign = "center";
      ctx.fillText("끊어졌어요! 💔", APPLE_CX, APPLE_CY);
    }
  }, [showGuide, difficulty]);

  // Animation loop
  useEffect(() => {
    if (screen !== "playing") return;
    const loop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, draw]);

  // Start game
  const startGame = useCallback(() => {
    setPeelPath([]);
    peelPathRef.current = [];
    setIsPeeling(false);
    setBroken(false);
    brokenRef.current = false;
    setScore(0);
    setPeelPercent(0);
    setAppleColor(0);
    setCombo(0);
    setMaxCombo(0);
    setMessage("");
    lastPointRef.current = null;
    idealPathRef.current = generateIdealPath();
    pathIndexRef.current = 0;
    setPeelLength(0);
    setScreen("playing");
  }, []);

  // Handle pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (brokenRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    // Check if starting on or near the apple
    const dist = Math.sqrt((x - APPLE_CX) ** 2 + (y - APPLE_CY) ** 2);
    if (dist < APPLE_RADIUS + 30) {
      setIsPeeling(true);
      lastPointRef.current = { x, y };
      const point: PeelPoint = { x, y, angle: 0 };
      peelPathRef.current = [...peelPathRef.current, point];
      setPeelPath([...peelPathRef.current]);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPeeling || brokenRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    const last = lastPointRef.current;
    if (!last) return;

    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only add point if moved enough
    if (dist < 4) return;

    // Check if too far from ideal path
    const ideal = idealPathRef.current;
    let minDist = Infinity;
    let closestIdx = pathIndexRef.current;

    for (let i = Math.max(0, pathIndexRef.current - 5); i < Math.min(ideal.length, pathIndexRef.current + 30); i++) {
      const d = Math.sqrt((x - ideal[i].x) ** 2 + (y - ideal[i].y) ** 2);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    // Update path index (progress along ideal path)
    if (closestIdx > pathIndexRef.current) {
      pathIndexRef.current = closestIdx;
    }

    // Check if peel broke (too far from ideal path)
    if (minDist > TOLERANCE) {
      // Break!
      brokenRef.current = true;
      setBroken(true);
      setIsPeeling(false);
      setMessage("💔 껍질이 끊어졌어요!");

      // Calculate final score
      const pathLen = peelPathRef.current.length;
      const idealLen = ideal.length;
      const percent = Math.floor((pathLen / idealLen) * 100);
      setPeelPercent(percent);

      const finalScore = Math.floor(percent * 10 + maxCombo * 5);
      setScore(finalScore);
      if (finalScore > bestScore) setBestScore(finalScore);
      setTotalPeeled((t) => t + 1);

      setTimeout(() => setScreen("result"), 1500);
      return;
    }

    // Successful peel point
    const angle = Math.atan2(dy, dx);
    const point: PeelPoint = { x, y, angle };
    peelPathRef.current = [...peelPathRef.current, point];
    setPeelPath([...peelPathRef.current]);
    lastPointRef.current = { x, y };

    // Update peel length
    setPeelLength((l) => l + dist);

    // Combo based on accuracy
    if (minDist < TOLERANCE * 0.4) {
      setCombo((c) => {
        const nc = c + 1;
        if (nc > maxCombo) setMaxCombo(nc);
        return nc;
      });
    } else {
      setCombo(0);
    }

    // Check completion
    const progress = pathIndexRef.current / ideal.length;
    setPeelPercent(Math.floor(progress * 100));

    if (progress >= 0.95) {
      // Complete!
      brokenRef.current = true;
      setIsPeeling(false);
      setMessage("🎉 완벽하게 깎았어요!");

      const finalScore = 1000 + maxCombo * 10;
      setScore(finalScore);
      if (finalScore > bestScore) setBestScore(finalScore);
      setTotalPeeled((t) => t + 1);

      setTimeout(() => setScreen("result"), 1500);
    }
  }, [isPeeling, maxCombo, bestScore, difficulty]);

  const handlePointerUp = useCallback(() => {
    if (!isPeeling || brokenRef.current) return;
    // Lifting finger = peel breaks
    brokenRef.current = true;
    setBroken(true);
    setIsPeeling(false);
    setMessage("✋ 손을 떼서 끊어졌어요!");

    const ideal = idealPathRef.current;
    const pathLen = peelPathRef.current.length;
    const idealLen = ideal.length;
    const percent = Math.floor((pathLen / idealLen) * 100);
    setPeelPercent(percent);

    const finalScore = Math.floor(percent * 10 + maxCombo * 5);
    setScore(finalScore);
    if (finalScore > bestScore) setBestScore(finalScore);
    setTotalPeeled((t) => t + 1);

    setTimeout(() => setScreen("result"), 1500);
  }, [isPeeling, maxCombo, bestScore]);

  const getGrade = () => {
    if (peelPercent >= 95) return { grade: "S", color: "text-amber-400", msg: "전설의 사과 깎기!" };
    if (peelPercent >= 80) return { grade: "A", color: "text-green-400", msg: "훌륭해요!" };
    if (peelPercent >= 60) return { grade: "B", color: "text-blue-400", msg: "잘했어요!" };
    if (peelPercent >= 40) return { grade: "C", color: "text-purple-400", msg: "괜찮아요!" };
    if (peelPercent >= 20) return { grade: "D", color: "text-orange-400", msg: "더 연습하세요!" };
    return { grade: "F", color: "text-red-400", msg: "다시 도전!" };
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-red-950 via-green-950 to-stone-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🍎</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-red-400 to-green-400 bg-clip-text text-transparent">사과 깎기</span>
          </h1>
          <p className="text-lg text-slate-400">끊기지 않게 사과를 깎아보세요!</p>

          <div className="mt-4 w-full max-w-xs space-y-3">
            <p className="text-sm font-bold text-slate-500">난이도</p>
            <div className="flex gap-2">
              {(["easy", "normal", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                    difficulty === d
                      ? "border-red-400 bg-red-500/20 text-red-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30"
                  }`}
                >
                  {d === "easy" ? "쉬움" : d === "normal" ? "보통" : "어려움"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            className="mt-4 rounded-xl bg-gradient-to-r from-red-500 to-green-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            🔪 깎기 시작!
          </button>

          {bestScore > 0 && (
            <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 backdrop-blur space-y-1">
              <p className="text-sm text-slate-400">🏆 최고 점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🍎 깎은 사과: <span className="font-bold text-red-400">{totalPeeled}개</span></p>
            </div>
          )}

          <div className="mt-4 w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-2">
            <p className="font-bold text-red-400">📖 규칙</p>
            <p>1. 사과 위에서 터치/클릭하고 드래그하세요</p>
            <p>2. <span className="text-yellow-400">노란 점선</span>을 따라 깎으세요</p>
            <p>3. 점선에서 너무 벗어나면 <span className="text-red-400">껍질이 끊어져요!</span></p>
            <p>4. 손을 떼면 끊어져요! 끝까지 한번에!</p>
            <p>5. 최대한 길게 깎으면 높은 점수!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-4 px-4">
          {/* HUD */}
          <div className="mb-2 flex w-full max-w-[360px] items-center justify-between text-sm">
            <span className="rounded-lg bg-white/10 px-3 py-1">🍎 {peelPercent}%</span>
            {combo > 3 && (
              <span className="rounded-lg bg-orange-500/20 px-3 py-1 text-orange-400 font-bold">
                🔥 {combo} combo
              </span>
            )}
            <span className="rounded-lg bg-white/10 px-3 py-1">
              {difficulty === "easy" ? "쉬움" : difficulty === "normal" ? "보통" : "어려움"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-2 h-3 w-full max-w-[360px] overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-200"
              style={{ width: `${peelPercent}%` }}
            />
          </div>

          {/* Message */}
          {message && (
            <div className="mb-2 rounded-xl bg-white/10 px-6 py-2 text-center text-sm font-bold">
              {message}
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-2xl border-2 border-white/10 touch-none"
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`rounded-lg px-3 py-1 text-xs transition-all ${
                showGuide ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-slate-400"
              }`}
            >
              {showGuide ? "🔦 가이드 ON" : "🔦 가이드 OFF"}
            </button>
            <button
              onClick={startGame}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              🔄 다시하기
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {screen === "result" && (() => {
        const { grade, color, msg } = getGrade();
        return (
          <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
            <div className="text-7xl">{peelPercent >= 95 ? "🏆" : peelPercent >= 60 ? "🍎" : "😅"}</div>
            <div className={`text-8xl font-black ${color}`}>{grade}</div>
            <h2 className="text-2xl font-black">{msg}</h2>

            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
              <p>🍎 깎은 정도: <span className="font-bold text-green-400">{peelPercent}%</span></p>
              <p>⭐ 점수: <span className="font-bold text-amber-400">{score}</span></p>
              <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
              <p>📏 껍질 길이: <span className="font-bold text-cyan-400">{Math.floor(peelLength)}px</span></p>
              {score >= bestScore && score > 0 && (
                <p className="text-amber-400 font-bold">🎉 최고 기록!</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="rounded-xl bg-gradient-to-r from-red-500 to-green-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
              >
                🔄 다시하기
              </button>
              <button
                onClick={() => setScreen("menu")}
                className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
              >
                메뉴로
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
