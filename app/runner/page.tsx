"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Obstacle {
  id: number;
  x: number;
  type: "low" | "high" | "double" | "coin" | "powerup";
  emoji: string;
  width: number;
  height: number;
}

const LANE_Y = 70; // 캐릭터 기본 위치 (%)

export default function RunnerGame() {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [playerY, setPlayerY] = useState(LANE_Y);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(3);
  const [combo, setCombo] = useState(0);
  const [shield, setShield] = useState(false);
  const [shieldTimer, setShieldTimer] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [character, setCharacter] = useState("🏃");

  const frameRef = useRef(0);
  const idRef = useRef(0);
  const jumpRef = useRef(false);
  const slideRef = useRef(false);
  const obstaclesRef = useRef<Obstacle[]>([]);
  obstaclesRef.current = obstacles;

  const startGame = useCallback(() => {
    setPlaying(true);
    setGameOver(false);
    setJumping(false);
    setSliding(false);
    setPlayerY(LANE_Y);
    setObstacles([]);
    setScore(0);
    setCoins(0);
    setDistance(0);
    setSpeed(3);
    setCombo(0);
    setShield(false);
    setShieldTimer(0);
    setCharacter("🏃");
    idRef.current = 0;
    jumpRef.current = false;
    slideRef.current = false;
  }, []);

  const jump = useCallback(() => {
    if (!playing || gameOver || jumpRef.current || slideRef.current) return;
    jumpRef.current = true;
    setJumping(true);
    setCharacter("🦘");
    setPlayerY(35);
    setTimeout(() => {
      setPlayerY(LANE_Y);
      setJumping(false);
      setCharacter("🏃");
      jumpRef.current = false;
    }, 600);
  }, [playing, gameOver]);

  const slide = useCallback(() => {
    if (!playing || gameOver || slideRef.current || jumpRef.current) return;
    slideRef.current = true;
    setSliding(true);
    setCharacter("🛝");
    setPlayerY(82);
    setTimeout(() => {
      setPlayerY(LANE_Y);
      setSliding(false);
      setCharacter("🏃");
      slideRef.current = false;
    }, 500);
  }, [playing, gameOver]);

  // 키보드 입력
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") { e.preventDefault(); jump(); }
      if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); slide(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jump, slide]);

  // 게임 루프
  useEffect(() => {
    if (!playing || gameOver) return;
    let spawnTimer = 0;
    let distAcc = 0;

    const loop = () => {
      const spd = speed;
      distAcc += spd * 0.02;
      setDistance(Math.floor(distAcc));
      setScore((s) => s + 1);
      setSpeed(3 + Math.floor(distAcc / 50) * 0.5);

      // 장애물 생성
      spawnTimer++;
      const spawnRate = Math.max(30, 70 - Math.floor(distAcc / 30) * 3);
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        const rand = Math.random();
        let obs: Obstacle;
        if (rand < 0.15) {
          obs = { id: idRef.current++, x: 105, type: "coin", emoji: "💰", width: 5, height: 5 };
        } else if (rand < 0.2) {
          obs = { id: idRef.current++, x: 105, type: "powerup", emoji: "🛡️", width: 5, height: 5 };
        } else if (rand < 0.5) {
          obs = { id: idRef.current++, x: 105, type: "low", emoji: "🪨", width: 6, height: 8 };
        } else if (rand < 0.8) {
          obs = { id: idRef.current++, x: 105, type: "high", emoji: "🦅", width: 6, height: 8 };
        } else {
          obs = { id: idRef.current++, x: 105, type: "double", emoji: "🌵", width: 6, height: 15 };
        }
        setObstacles((prev) => [...prev, obs]);
      }

      // 장애물 이동 & 충돌
      setObstacles((prev) => {
        const next: Obstacle[] = [];
        for (const ob of prev) {
          const nx = ob.x - spd * 0.6;
          if (nx < -10) {
            if (ob.type !== "coin" && ob.type !== "powerup") {
              setCombo((c) => c + 1);
            }
            continue;
          }

          // 충돌 체크 (플레이어 x: 10~16%)
          if (nx > 5 && nx < 20) {
            const py = jumpRef.current ? 35 : slideRef.current ? 82 : LANE_Y;

            if (ob.type === "coin" && Math.abs(py - 65) < 25) {
              setCoins((c) => c + 1);
              setScore((s) => s + 50);
              continue;
            }
            if (ob.type === "powerup" && Math.abs(py - 65) < 25) {
              setShield(true);
              setShieldTimer(10);
              continue;
            }

            let hit = false;
            if (ob.type === "low" && py >= 60) hit = true;
            if (ob.type === "high" && py <= 50) hit = true;
            if (ob.type === "double" && py >= 30 && py <= 85) hit = true;

            if (hit) {
              if (shield) {
                setShield(false);
                continue;
              }
              setGameOver(true);
              setPlaying(false);
              setHighScore((hs) => Math.max(hs, Math.floor(distAcc)));
              cancelAnimationFrame(frameRef.current);
              return prev;
            }
          }
          next.push({ ...ob, x: nx });
        }
        return next;
      });

      // 실드 타이머
      if (shield) {
        setShieldTimer((t) => {
          if (t <= 0.016) { setShield(false); return 0; }
          return t - 0.016;
        });
      }

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, gameOver, speed, shield]);

  if (!playing && !gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-8xl mb-6">🏃</div>
        <h1 className="text-4xl font-black mb-2">달리기 게임</h1>
        <p className="text-white/80 mb-2">장애물을 피해 달려라!</p>
        <div className="bg-white/20 rounded-xl p-4 mb-8 text-sm space-y-1 max-w-xs">
          <p>⬆️ 점프: 바위(🪨)를 넘어라</p>
          <p>⬇️ 슬라이드: 새(🦅)를 피해라</p>
          <p>🌵 선인장: 점프로만 피할 수 있어</p>
          <p>💰 코인: +50점 | 🛡️ 실드: 1회 보호</p>
        </div>
        {highScore > 0 && <p className="text-white/60 mb-4">🏆 최고: {highScore}m</p>}
        <button onClick={startGame} className="px-10 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-xl font-bold hover:scale-105 active:scale-95 transition shadow-lg">
          달리기 시작!
        </button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/30 transition z-50">← 홈으로</Link>
        <div className="text-7xl mb-4">💥</div>
        <h2 className="text-4xl font-black mb-6">게임 오버!</h2>
        <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-white/20 rounded-xl p-4 text-center"><p className="text-white/60 text-xs">거리</p><p className="text-3xl font-bold">{distance}m</p></div>
          <div className="bg-white/20 rounded-xl p-4 text-center"><p className="text-white/60 text-xs">점수</p><p className="text-3xl font-bold text-yellow-300">{score}</p></div>
          <div className="bg-white/20 rounded-xl p-4 text-center"><p className="text-white/60 text-xs">코인</p><p className="text-3xl font-bold text-yellow-400">{coins}</p></div>
          <div className="bg-white/20 rounded-xl p-4 text-center"><p className="text-white/60 text-xs">콤보</p><p className="text-3xl font-bold text-cyan-300">{combo}</p></div>
        </div>
        <button onClick={startGame} className="px-10 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-xl font-bold hover:scale-105 active:scale-95 transition">
          다시하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600 flex flex-col text-white overflow-hidden">
      <Link href="/" className="fixed top-3 left-3 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/30 transition z-50">← 홈</Link>

      <div className="flex gap-2 justify-center mt-8 mb-2 text-xs flex-wrap">
        <span className="bg-white/20 rounded-lg px-3 py-1 font-bold">{distance}m</span>
        <span className="bg-white/20 rounded-lg px-3 py-1 font-bold">⭐ {score}</span>
        <span className="bg-white/20 rounded-lg px-3 py-1 text-yellow-300 font-bold">💰 {coins}</span>
        {shield && <span className="bg-cyan-500/50 rounded-lg px-3 py-1 font-bold animate-pulse">🛡️ {Math.ceil(shieldTimer)}</span>}
      </div>

      {/* 게임 영역 */}
      <div className="flex-1 relative mx-4 mb-4 bg-gradient-to-b from-sky-300 to-green-400 rounded-2xl overflow-hidden border-2 border-white/20">
        {/* 바닥 */}
        <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-amber-700 to-amber-600" />
        <div className="absolute bottom-[20%] left-0 right-0 h-1 bg-green-600" />

        {/* 배경 구름 */}
        <div className="absolute top-[10%] text-4xl opacity-30 animate-pulse" style={{ left: "70%" }}>☁️</div>
        <div className="absolute top-[20%] text-3xl opacity-20" style={{ left: "30%" }}>☁️</div>

        {/* 캐릭터 */}
        <div className="absolute transition-all duration-200" style={{
          left: "12%",
          top: `${playerY - 10}%`,
          fontSize: "3rem",
          filter: shield ? "drop-shadow(0 0 8px cyan)" : "none",
          zIndex: 10,
        }}>
          {character}
        </div>

        {/* 장애물 */}
        {obstacles.map((ob) => (
          <div key={ob.id} className="absolute transition-none" style={{
            left: `${ob.x}%`,
            top: ob.type === "high" ? "35%" : ob.type === "coin" || ob.type === "powerup" ? "55%" : "62%",
            fontSize: ob.type === "double" ? "3rem" : "2.5rem",
            zIndex: 5,
          }}>
            {ob.emoji}
          </div>
        ))}
      </div>

      {/* 컨트롤 */}
      <div className="flex gap-4 px-6 pb-6">
        <button onPointerDown={jump}
          className="flex-1 py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-xl font-black active:scale-95 transition shadow-lg">
          ⬆️ 점프
        </button>
        <button onPointerDown={slide}
          className="flex-1 py-6 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-xl font-black active:scale-95 transition shadow-lg">
          ⬇️ 슬라이드
        </button>
      </div>
    </div>
  );
}
