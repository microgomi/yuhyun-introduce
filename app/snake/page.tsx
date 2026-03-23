"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 먹이 종류 ───── */
interface FoodType {
  id: string;
  emoji: string;
  name: string;
  score: number;
  effect: "grow" | "speed" | "slow" | "shrink" | "bonus" | "bomb" | "ghost" | "magnet" | "double";
  color: string;
  chance: number; // 스폰 확률 가중치
  desc: string;
}

const FOOD_TYPES: FoodType[] = [
  { id: "apple", emoji: "🍎", name: "사과", score: 10, effect: "grow", color: "#ef4444", chance: 40, desc: "기본! +1칸" },
  { id: "banana", emoji: "🍌", name: "바나나", score: 15, effect: "grow", color: "#fbbf24", chance: 20, desc: "+1칸, 추가 점수" },
  { id: "cherry", emoji: "🍒", name: "체리", score: 20, effect: "bonus", color: "#ec4899", chance: 10, desc: "보너스 점수!" },
  { id: "grape", emoji: "🍇", name: "포도", score: 25, effect: "double", color: "#8b5cf6", chance: 5, desc: "점수 2배! 10초" },
  { id: "pepper", emoji: "🌶️", name: "고추", score: 10, effect: "speed", color: "#dc2626", chance: 8, desc: "속도 UP! 5초" },
  { id: "ice", emoji: "🧊", name: "얼음", score: 10, effect: "slow", color: "#67e8f9", chance: 8, desc: "속도 DOWN! 5초" },
  { id: "cookie", emoji: "🍪", name: "쿠키", score: 30, effect: "grow", color: "#92400e", chance: 5, desc: "+2칸! 높은 점수" },
  { id: "ghost", emoji: "👻", name: "유령", score: 15, effect: "ghost", color: "#d1d5db", chance: 3, desc: "벽 통과! 5초" },
  { id: "bomb", emoji: "💣", name: "폭탄", score: 0, effect: "bomb", color: "#1e1b4b", chance: 5, desc: "먹으면 게임오버!" },
  { id: "shrink", emoji: "💊", name: "약", score: 5, effect: "shrink", color: "#22c55e", chance: 5, desc: "몸 -2칸 줄어듦" },
  { id: "magnet", emoji: "🧲", name: "자석", score: 20, effect: "magnet", color: "#6366f1", chance: 3, desc: "먹이가 다가옴! 8초" },
  { id: "star", emoji: "⭐", name: "별", score: 50, effect: "bonus", color: "#fbbf24", chance: 2, desc: "초레어! 50점!" },
];

/* ───── 스테이지 ───── */
interface Stage {
  id: string;
  name: string;
  emoji: string;
  gridSize: number;
  speed: number;           // ms (낮을수록 빠름)
  walls: { x: number; y: number }[];
  targetScore: number;
  bgColor: string;
  snakeColor: string;
  snakeHeadColor: string;
  wallColor: string;
  reward: number;
  desc: string;
}

const STAGES: Stage[] = [
  {
    id: "s1", name: "초원", emoji: "🌿", gridSize: 14, speed: 180, walls: [],
    targetScore: 80, bgColor: "#dcfce7", snakeColor: "#22c55e", snakeHeadColor: "#15803d", wallColor: "#166534", reward: 15, desc: "벽 없는 초원!",
  },
  {
    id: "s2", name: "사막", emoji: "🏜️", gridSize: 14, speed: 160, walls: [
      ...[3,4,5].map(x => ({ x, y: 3 })), ...[8,9,10].map(x => ({ x, y: 10 })),
    ],
    targetScore: 120, bgColor: "#fef3c7", snakeColor: "#f59e0b", snakeHeadColor: "#b45309", wallColor: "#92400e", reward: 25, desc: "바위가 있다!",
  },
  {
    id: "s3", name: "바다", emoji: "🌊", gridSize: 16, speed: 150, walls: [
      ...[2,3,4,5].map(x => ({ x, y: 5 })), ...[10,11,12,13].map(x => ({ x, y: 5 })),
      ...[2,3,4,5].map(x => ({ x, y: 10 })), ...[10,11,12,13].map(x => ({ x, y: 10 })),
    ],
    targetScore: 160, bgColor: "#dbeafe", snakeColor: "#3b82f6", snakeHeadColor: "#1d4ed8", wallColor: "#1e3a5f", reward: 35, desc: "산호초를 피해라!",
  },
  {
    id: "s4", name: "용암", emoji: "🌋", gridSize: 16, speed: 140, walls: [
      ...[4,5,6,7,8,9,10,11].map(x => ({ x, y: 4 })),
      ...[4,5,6,7,8,9,10,11].map(x => ({ x, y: 11 })),
      ...([4,11] as number[]).flatMap(x => [5,6,7,8,9,10].map(y => ({ x, y }))),
    ],
    targetScore: 200, bgColor: "#fecaca", snakeColor: "#ef4444", snakeHeadColor: "#991b1b", wallColor: "#7f1d1d", reward: 50, desc: "용암 미로!",
  },
  {
    id: "s5", name: "우주", emoji: "🚀", gridSize: 18, speed: 130, walls: [
      ...[3,4,14,13].map(x => ({ x, y: 3 })), ...[3,4,14,13].map(x => ({ x, y: 14 })),
      ...([3,14] as number[]).flatMap(x => [3,4,14,13].map(y => ({ x, y }))),
      ...[8,9].map(x => ({ x, y: 8 })), ...[8,9].map(x => ({ x, y: 9 })),
    ],
    targetScore: 250, bgColor: "#1e1b4b", snakeColor: "#c084fc", snakeHeadColor: "#7c3aed", wallColor: "#4338ca", reward: 70, desc: "소행성 피하기!",
  },
  {
    id: "s6", name: "무한", emoji: "♾️", gridSize: 20, speed: 150, walls: [],
    targetScore: 999, bgColor: "#111", snakeColor: "#fbbf24", snakeHeadColor: "#f59e0b", wallColor: "#333", reward: 0, desc: "끝없는 도전! 최고점 노려라!",
  },
];

/* ───── 스킨 ───── */
interface SnakeSkin {
  id: string;
  name: string;
  emoji: string;
  headColor: string;
  bodyColor: string;
  pattern: "solid" | "striped" | "dotted" | "rainbow";
  price: number;
}

const SKINS: SnakeSkin[] = [
  { id: "default", name: "기본 뱀", emoji: "🐍", headColor: "#15803d", bodyColor: "#22c55e", pattern: "solid", price: 0 },
  { id: "fire", name: "불뱀", emoji: "🔥", headColor: "#dc2626", bodyColor: "#f97316", pattern: "striped", price: 30 },
  { id: "ice", name: "얼음뱀", emoji: "🧊", headColor: "#0891b2", bodyColor: "#67e8f9", pattern: "solid", price: 30 },
  { id: "gold", name: "황금뱀", emoji: "✨", headColor: "#b45309", bodyColor: "#fbbf24", pattern: "solid", price: 50 },
  { id: "purple", name: "독뱀", emoji: "☠️", headColor: "#581c87", bodyColor: "#a855f7", pattern: "striped", price: 40 },
  { id: "rainbow", name: "무지개뱀", emoji: "🌈", headColor: "#ef4444", bodyColor: "#22c55e", pattern: "rainbow", price: 80 },
  { id: "galaxy", name: "은하뱀", emoji: "🌌", headColor: "#312e81", bodyColor: "#6366f1", pattern: "dotted", price: 100 },
  { id: "lava", name: "용암뱀", emoji: "🌋", headColor: "#7f1d1d", bodyColor: "#ef4444", pattern: "striped", price: 60 },
  { id: "ghost_s", name: "유령뱀", emoji: "👻", headColor: "#9ca3af", bodyColor: "#e5e7eb", pattern: "dotted", price: 70 },
  { id: "neon", name: "네온뱀", emoji: "💡", headColor: "#059669", bodyColor: "#34d399", pattern: "solid", price: 50 },
];

const RAINBOW = ["#ef4444", "#f97316", "#fbbf24", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

type Dir = "up" | "down" | "left" | "right";
type Screen = "main" | "stageselect" | "play" | "result" | "shop";

export default function SnakePage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(20);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<string[]>(["default"]);
  const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>(SKINS[0]);

  // 게임
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([]);
  const [dir, setDir] = useState<Dir>("right");
  const [nextDir, setNextDir] = useState<Dir>("right");
  const [foods, setFoods] = useState<{ x: number; y: number; type: FoodType }[]>([]);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(150);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [effects, setEffects] = useState<{ type: string; timer: number }[]>([]);
  const [isGhost, setIsGhost] = useState(false);
  const [isMagnet, setIsMagnet] = useState(false);
  const [isDouble, setIsDouble] = useState(false);
  const [ateCount, setAteCount] = useState(0);
  const [maxLength, setMaxLength] = useState(0);

  const gameLoop = useRef<NodeJS.Timeout | null>(null);
  const effectTimer = useRef<NodeJS.Timeout | null>(null);

  // 이펙트 타이머
  useEffect(() => {
    if (!gameActive) return;
    effectTimer.current = setInterval(() => {
      setEffects(prev => {
        const updated = prev.map(e => ({ ...e, timer: e.timer - 1 })).filter(e => e.timer > 0);
        if (!updated.find(e => e.type === "ghost")) setIsGhost(false);
        if (!updated.find(e => e.type === "magnet")) setIsMagnet(false);
        if (!updated.find(e => e.type === "double")) setIsDouble(false);
        if (!updated.find(e => e.type === "speed") && currentStage) setGameSpeed(currentStage.speed);
        if (!updated.find(e => e.type === "slow") && currentStage) setGameSpeed(currentStage.speed);
        return updated;
      });
    }, 1000);
    return () => { if (effectTimer.current) clearInterval(effectTimer.current); };
  }, [gameActive, currentStage]);

  // 게임 루프
  useEffect(() => {
    if (!gameActive || !currentStage) return;
    gameLoop.current = setTimeout(() => moveSnake(), gameSpeed);
    return () => { if (gameLoop.current) clearTimeout(gameLoop.current); };
  }, [gameActive, snake, gameSpeed, currentStage]);

  // 키보드 (PC)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") setNextDir(d => d !== "down" ? "up" : d);
      if (e.key === "ArrowDown" || e.key === "s") setNextDir(d => d !== "up" ? "down" : d);
      if (e.key === "ArrowLeft" || e.key === "a") setNextDir(d => d !== "right" ? "left" : d);
      if (e.key === "ArrowRight" || e.key === "d") setNextDir(d => d !== "left" ? "right" : d);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const spawnFood = useCallback((grid: number, snakeBody: { x: number; y: number }[], walls: { x: number; y: number }[], existingFoods: { x: number; y: number; type: FoodType }[]) => {
    const totalWeight = FOOD_TYPES.reduce((s, f) => s + f.chance, 0);
    let roll = Math.random() * totalWeight;
    let foodType = FOOD_TYPES[0];
    for (const ft of FOOD_TYPES) {
      roll -= ft.chance;
      if (roll <= 0) { foodType = ft; break; }
    }

    let x: number, y: number;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * grid);
      y = Math.floor(Math.random() * grid);
      attempts++;
    } while (attempts < 100 && (
      snakeBody.some(s => s.x === x && s.y === y) ||
      walls.some(w => w.x === x && w.y === y) ||
      existingFoods.some(f => f.x === x && f.y === y)
    ));

    return { x, y, type: foodType };
  }, []);

  const startStage = useCallback((stage: Stage) => {
    setCurrentStage(stage);
    const mid = Math.floor(stage.gridSize / 2);
    const initSnake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    setSnake(initSnake);
    setDir("right");
    setNextDir("right");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAteCount(0);
    setMaxLength(3);
    setGameSpeed(stage.speed);
    setEffects([]);
    setIsGhost(false);
    setIsMagnet(false);
    setIsDouble(false);

    const initialFoods = [
      spawnFood(stage.gridSize, initSnake, stage.walls, []),
      spawnFood(stage.gridSize, initSnake, stage.walls, []),
    ];
    setFoods(initialFoods);
    setGameActive(true);
    setScreen("play");
  }, [spawnFood]);

  const moveSnake = useCallback(() => {
    if (!gameActive || !currentStage) return;

    setDir(nextDir);
    const dirMap: Record<Dir, { x: number; y: number }> = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    const d = dirMap[nextDir];
    const head = snake[0];
    let newHead = { x: head.x + d.x, y: head.y + d.y };
    const grid = currentStage.gridSize;

    // 벽 충돌 (유령이면 통과)
    if (isGhost) {
      newHead = { x: (newHead.x + grid) % grid, y: (newHead.y + grid) % grid };
    } else {
      if (newHead.x < 0 || newHead.x >= grid || newHead.y < 0 || newHead.y >= grid) {
        endGame(); return;
      }
      if (currentStage.walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
        endGame(); return;
      }
    }

    // 자기 몸 충돌 (유령이면 무시)
    if (!isGhost && snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      endGame(); return;
    }

    let newSnake = [newHead, ...snake];
    let ate = false;

    // 먹이 체크
    const eatenIdx = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    if (eatenIdx >= 0) {
      const food = foods[eatenIdx];
      ate = true;

      // 폭탄
      if (food.type.effect === "bomb") { endGame(); return; }

      // 점수
      const mult = isDouble ? 2 : 1;
      const comboBonus = Math.floor(combo * 0.5);
      setScore(s => s + (food.type.score + comboBonus) * mult);
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
      setAteCount(a => a + 1);

      // 효과
      switch (food.type.effect) {
        case "grow":
          // 안 잘라서 자동 성장
          break;
        case "speed":
          setGameSpeed(s => Math.max(60, s - 40));
          setEffects(prev => [...prev.filter(e => e.type !== "speed"), { type: "speed", timer: 5 }]);
          break;
        case "slow":
          setGameSpeed(s => s + 40);
          setEffects(prev => [...prev.filter(e => e.type !== "slow"), { type: "slow", timer: 5 }]);
          break;
        case "shrink":
          newSnake = newSnake.slice(0, Math.max(3, newSnake.length - 2));
          break;
        case "ghost":
          setIsGhost(true);
          setEffects(prev => [...prev.filter(e => e.type !== "ghost"), { type: "ghost", timer: 5 }]);
          break;
        case "magnet":
          setIsMagnet(true);
          setEffects(prev => [...prev.filter(e => e.type !== "magnet"), { type: "magnet", timer: 8 }]);
          break;
        case "double":
          setIsDouble(true);
          setEffects(prev => [...prev.filter(e => e.type !== "double"), { type: "double", timer: 10 }]);
          break;
        case "bonus":
          // 그냥 점수만
          break;
      }

      // 쿠키는 +2
      if (food.type.id === "cookie") {
        // 이미 안 잘렸으니 한 번 더 추가
        newSnake = [...newSnake, newSnake[newSnake.length - 1]];
      }

      // 먹이 리스폰
      const remaining = foods.filter((_, i) => i !== eatenIdx);
      const newFood = spawnFood(grid, newSnake, currentStage.walls, remaining);
      // 가끔 추가 먹이
      if (Math.random() < 0.3) {
        const extra = spawnFood(grid, newSnake, currentStage.walls, [...remaining, newFood]);
        setFoods([...remaining, newFood, extra]);
      } else {
        setFoods([...remaining, newFood]);
      }
    } else {
      newSnake = newSnake.slice(0, -1);
      setCombo(0);
    }

    // 자석 효과: 가까운 먹이를 끌어당김
    if (isMagnet) {
      setFoods(prev => prev.map(f => {
        const dx = newHead.x - f.x;
        const dy = newHead.y - f.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= 4 && dist > 0) {
          return { ...f, x: f.x + Math.sign(dx), y: f.y + Math.sign(dy) };
        }
        return f;
      }));
    }

    setMaxLength(m => Math.max(m, newSnake.length));
    setSnake(newSnake);
  }, [gameActive, currentStage, snake, nextDir, foods, combo, isGhost, isMagnet, isDouble, spawnFood]);

  const endGame = useCallback(() => {
    setGameActive(false);
    if (gameLoop.current) clearTimeout(gameLoop.current);
    if (effectTimer.current) clearInterval(effectTimer.current);

    if (currentStage) {
      const prev = highScores[currentStage.id] || 0;
      if (score > prev) setHighScores(h => ({ ...h, [currentStage.id]: score }));
      if (score >= currentStage.targetScore && !completedStages.includes(currentStage.id)) {
        setCompletedStages(p => [...p, currentStage.id]);
      }
      setCoins(c => c + Math.floor(score / 5) + (score >= currentStage.targetScore ? currentStage.reward : 0));
    }
    setScreen("result");
  }, [currentStage, score, highScores, completedStages]);

  const changeDir = (newDir: Dir) => {
    const opposites: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
    if (newDir !== opposites[dir]) setNextDir(newDir);
  };

  const buySkin = (id: string) => {
    const skin = SKINS.find(s => s.id === id);
    if (!skin || coins < skin.price || ownedSkins.includes(id)) return;
    setCoins(c => c - skin.price);
    setOwnedSkins(prev => [...prev, id]);
  };

  const getSegmentColor = (idx: number, total: number) => {
    if (selectedSkin.pattern === "rainbow") {
      return RAINBOW[idx % RAINBOW.length];
    }
    if (selectedSkin.pattern === "striped") {
      return idx % 2 === 0 ? selectedSkin.bodyColor : selectedSkin.headColor;
    }
    if (selectedSkin.pattern === "dotted") {
      return idx % 3 === 0 ? selectedSkin.headColor : selectedSkin.bodyColor;
    }
    return selectedSkin.bodyColor;
  };

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-emerald-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-green-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🐍</div>
            <h1 className="text-3xl font-black mb-1">스네이크</h1>
            <p className="text-green-300 text-sm">먹고, 자라고, 살아남아라!</p>
          </div>

          <div className="bg-green-900/40 rounded-xl p-3 mb-4">
            <div className="text-center text-yellow-400 font-bold">🪙 {coins}</div>
            <div className="text-center text-xs text-green-300 mt-1">🏆 클리어: {completedStages.length}/{STAGES.length - 1}</div>
          </div>

          {/* 현재 스킨 */}
          <div className="bg-black/30 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
            <span className="text-2xl">{selectedSkin.emoji}</span>
            <span className="font-bold">{selectedSkin.name}</span>
            <div className="flex gap-0.5 ml-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: i === 0 ? selectedSkin.headColor : getSegmentColor(i, 5) }} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setScreen("stageselect")} className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-4 text-center text-lg font-black">🐍 스테이지 선택</button>
            <button onClick={() => setScreen("shop")} className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center font-bold">🎨 스킨 상점</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 스테이지 선택 ───── */
  if (screen === "stageselect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-green-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-4">🗺️ 스테이지</h2>
          <div className="space-y-2">
            {STAGES.map(s => {
              const done = completedStages.includes(s.id);
              const best = highScores[s.id] || 0;
              return (
                <button key={s.id} onClick={() => startStage(s)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${done ? "bg-green-900/30 border border-green-700" : "bg-black/30 hover:bg-black/50"}`}>
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.desc}</div>
                    <div className="text-[10px] text-gray-500">목표: {s.targetScore}점 | 속도: {s.speed > 160 ? "느림" : s.speed > 140 ? "보통" : "빠름"}</div>
                    {best > 0 && <div className="text-[10px] text-yellow-400">최고: {best}점</div>}
                  </div>
                  <div className="text-xs text-right">
                    {done && <span className="text-green-400">✅</span>}
                    <div className="text-yellow-400">🪙{s.reward}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play" && currentStage) {
    const grid = currentStage.gridSize;
    const cellSize = Math.floor(Math.min(340, window.innerWidth - 32) / grid);

    return (
      <div className="min-h-screen p-2 flex flex-col items-center" style={{ backgroundColor: currentStage.bgColor }}>
        {/* 상단 */}
        <div className="w-full max-w-md flex justify-between items-center mb-1 text-sm px-1">
          <span className="font-bold" style={{ color: currentStage.snakeHeadColor }}>🎯 {score}/{currentStage.targetScore}</span>
          <span className="text-xs">🐍 {snake.length}칸</span>
          <span className="text-xs">🍎 {ateCount}</span>
        </div>

        {/* 이펙트 표시 */}
        {effects.length > 0 && (
          <div className="flex gap-1 mb-1">
            {effects.map((e, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded-full text-white font-bold" style={{
                backgroundColor: e.type === "ghost" ? "#9ca3af" : e.type === "magnet" ? "#6366f1" : e.type === "double" ? "#8b5cf6" : e.type === "speed" ? "#ef4444" : "#06b6d4",
              }}>
                {e.type === "ghost" ? "👻" : e.type === "magnet" ? "🧲" : e.type === "double" ? "x2" : e.type === "speed" ? "🌶️" : "🧊"} {e.timer}s
              </span>
            ))}
          </div>
        )}

        {combo >= 3 && (
          <div className="text-xs font-black px-2 py-0.5 rounded-full mb-1" style={{ backgroundColor: currentStage.snakeColor, color: "#fff" }}>
            🔥 {combo} COMBO!
          </div>
        )}

        {/* 게임 보드 */}
        <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: currentStage.wallColor, width: cellSize * grid, height: cellSize * grid, position: "relative" }}>
          {/* 배경 격자 */}
          {Array.from({ length: grid * grid }, (_, i) => {
            const x = i % grid, y = Math.floor(i / grid);
            const isDark = (x + y) % 2 === 0;
            return <div key={i} className="absolute" style={{
              left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize,
              backgroundColor: isDark ? "rgba(0,0,0,0.03)" : "transparent",
            }} />;
          })}

          {/* 벽 */}
          {currentStage.walls.map((w, i) => (
            <div key={`w${i}`} className="absolute rounded-sm" style={{
              left: w.x * cellSize, top: w.y * cellSize, width: cellSize, height: cellSize,
              backgroundColor: currentStage.wallColor,
            }} />
          ))}

          {/* 먹이 */}
          {foods.map((f, i) => (
            <div key={`f${i}`} className="absolute flex items-center justify-center" style={{
              left: f.x * cellSize, top: f.y * cellSize, width: cellSize, height: cellSize,
              fontSize: cellSize * 0.7,
            }}>
              {f.type.emoji}
            </div>
          ))}

          {/* 뱀 */}
          {snake.map((s, i) => {
            const isHead = i === 0;
            const color = isHead ? selectedSkin.headColor : getSegmentColor(i, snake.length);
            const opacity = isGhost ? 0.5 : 1;
            return (
              <div key={`s${i}`} className="absolute transition-all" style={{
                left: s.x * cellSize + 1, top: s.y * cellSize + 1,
                width: cellSize - 2, height: cellSize - 2,
                backgroundColor: color,
                borderRadius: isHead ? "30%" : "20%",
                opacity,
                boxShadow: isHead ? `0 0 ${cellSize / 3}px ${color}` : "none",
                zIndex: isHead ? 10 : 1,
              }}>
                {isHead && (
                  <div className="w-full h-full flex items-center justify-center text-white" style={{ fontSize: cellSize * 0.5 }}>
                    {dir === "up" ? "⬆" : dir === "down" ? "⬇" : dir === "left" ? "⬅" : "➡"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 방향 버튼 */}
        <div className="mt-3 grid grid-cols-3 gap-1 w-40">
          <div />
          <button onClick={() => changeDir("up")} className="p-3 rounded-xl text-xl font-bold text-white active:scale-90" style={{ backgroundColor: currentStage.snakeColor }}>⬆️</button>
          <div />
          <button onClick={() => changeDir("left")} className="p-3 rounded-xl text-xl font-bold text-white active:scale-90" style={{ backgroundColor: currentStage.snakeColor }}>⬅️</button>
          <div />
          <button onClick={() => changeDir("right")} className="p-3 rounded-xl text-xl font-bold text-white active:scale-90" style={{ backgroundColor: currentStage.snakeColor }}>➡️</button>
          <div />
          <button onClick={() => changeDir("down")} className="p-3 rounded-xl text-xl font-bold text-white active:scale-90" style={{ backgroundColor: currentStage.snakeColor }}>⬇️</button>
          <div />
        </div>

        {/* 먹이 범례 */}
        <div className="flex gap-1 mt-2 flex-wrap justify-center">
          {foods.map((f, i) => (
            <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-black/20">{f.type.emoji} {f.type.name}</span>
          ))}
        </div>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result" && currentStage) {
    const cleared = score >= currentStage.targetScore;
    const earned = Math.floor(score / 5) + (cleared ? currentStage.reward : 0);
    const isHighScore = score === (highScores[currentStage.id] || 0) && score > 0;

    return (
      <div className={`min-h-screen ${cleared ? "bg-gradient-to-b from-green-700 to-black" : "bg-gradient-to-b from-red-900 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-7xl mb-3">{cleared ? "🎉" : "💀"}</div>
          <h2 className="text-2xl font-black mb-1">{cleared ? "스테이지 클리어!" : "게임 오버"}</h2>
          <div className="text-sm text-gray-300 mb-4">{currentStage.emoji} {currentStage.name}</div>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🐍</div><div className="text-xl font-bold">{maxLength}</div><div className="text-xs text-gray-400">최대 길이</div></div>
              <div><div className="text-2xl">🍎</div><div className="text-xl font-bold">{ateCount}</div><div className="text-xs text-gray-400">먹은 수</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">최대 콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">코인</div></div>
              {isHighScore && <div><div className="text-2xl">🏆</div><div className="text-sm font-bold text-yellow-300">최고 기록!</div></div>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("stageselect")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🗺️ 스테이지</button>
            <button onClick={() => startStage(currentStage)} className="flex-1 bg-green-600 hover:bg-green-500 rounded-xl p-3 font-bold">🔄 다시!</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-yellow-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">🎨 스킨 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-3">🪙 {coins}</div>
          <div className="space-y-2">
            {SKINS.map(skin => {
              const owned = ownedSkins.includes(skin.id);
              const isSelected = selectedSkin.id === skin.id;
              return (
                <div key={skin.id} className={`flex items-center gap-3 p-3 rounded-xl ${isSelected ? "bg-yellow-900/40 ring-1 ring-yellow-500" : owned ? "bg-green-900/20" : "bg-black/30"}`}>
                  <span className="text-2xl">{skin.emoji}</span>
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: i === 0 ? skin.headColor : skin.pattern === "rainbow" ? RAINBOW[i % RAINBOW.length] : skin.pattern === "striped" ? (i % 2 === 0 ? skin.bodyColor : skin.headColor) : skin.bodyColor }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{skin.name}</div>
                  </div>
                  {isSelected ? <span className="text-yellow-400 text-xs font-bold">사용중</span> :
                   owned ? <button onClick={() => setSelectedSkin(skin)} className="text-xs bg-green-700 px-2 py-1 rounded-lg">선택</button> :
                   <button onClick={() => buySkin(skin.id)} disabled={coins < skin.price}
                     className={`text-xs px-3 py-1.5 rounded-lg font-bold ${coins >= skin.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>🪙{skin.price}</button>
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
