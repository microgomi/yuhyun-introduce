"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "gameover" | "victory";

type ItemType = "toy" | "clothes" | "snack" | "book" | "controller" | "ball";
type PowerUpType = "skateboard" | "paint" | "dog";

interface Cell {
  item: ItemType | null;
  justMessed: boolean; // animation flag
  justCleaned: boolean;
}

interface MomPos {
  row: number;
  col: number;
}

interface DadPos {
  row: number;
  col: number;
  active: boolean;
}

interface DogState {
  active: boolean;
  row: number;
  col: number;
  movesLeft: number;
}

interface PowerUp {
  type: PowerUpType;
  cooldown: number;
}

// --- Constants ---
const GRID_SIZE = 6;
const GAME_DURATION = 60;
const TICK_MS = 400; // game tick speed
const MESS_THRESHOLD = 50; // must stay above this %
const MAX_PATIENCE = 100;

const ITEM_EMOJIS: Record<ItemType, string> = {
  toy: "🧸",
  clothes: "👕",
  snack: "🍪",
  book: "📚",
  controller: "🎮",
  ball: "⚽",
};

const ITEM_TYPES: ItemType[] = ["toy", "clothes", "snack", "book", "controller", "ball"];

const POWERUP_INFO: Record<PowerUpType, { emoji: string; label: string; desc: string }> = {
  skateboard: { emoji: "🛹", label: "스케이트보드", desc: "한 줄 전체를 어지럽혀!" },
  paint: { emoji: "🎨", label: "페인트", desc: "3×3 영역을 어지럽혀!" },
  dog: { emoji: "🐶", label: "강아지 소환", desc: "강아지가 뛰어다니며 어지럽혀!" },
};

function randomItem(): ItemType {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

function createInitialGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Start ~60% messy
      row.push({
        item: Math.random() < 0.6 ? randomItem() : null,
        justMessed: false,
        justCleaned: false,
      });
    }
    row.push();
    grid.push(row);
  }
  return grid;
}

function countMess(grid: Cell[][]): number {
  let total = 0;
  let messy = 0;
  for (const row of grid) {
    for (const cell of row) {
      total++;
      if (cell.item) messy++;
    }
  }
  return total === 0 ? 0 : Math.round((messy / total) * 100);
}

// Find the area with most mess (returns center of messiest 3x3)
function findMessiestArea(grid: Cell[][]): { row: number; col: number } {
  let bestR = 0, bestC = 0, bestCount = -1;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc].item) {
            count++;
          }
        }
      }
      if (count > bestCount) {
        bestCount = count;
        bestR = r;
        bestC = c;
      }
    }
  }
  return { row: bestR, col: bestC };
}

function moveToward(from: { row: number; col: number }, to: { row: number; col: number }): { row: number; col: number } {
  let nr = from.row, nc = from.col;
  if (from.row < to.row) nr++;
  else if (from.row > to.row) nr--;
  if (from.col < to.col) nc++;
  else if (from.col > to.col) nc--;
  return { row: nr, col: nc };
}

export default function StopMomCleanGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [grid, setGrid] = useState<Cell[][]>(createInitialGrid);
  const [mom, setMom] = useState<MomPos>({ row: 0, col: 0 });
  const [dad, setDad] = useState<DadPos>({ row: 5, col: 5, active: false });
  const [dog, setDog] = useState<DogState>({ active: false, row: 0, col: 0, movesLeft: 0 });
  const [timer, setTimer] = useState(GAME_DURATION);
  const [patience, setPatience] = useState(MAX_PATIENCE);
  const [score, setScore] = useState(0);
  const [messHistory, setMessHistory] = useState<number[]>([]);
  const [powerups, setPowerups] = useState<PowerUp[]>([
    { type: "skateboard", cooldown: 0 },
    { type: "paint", cooldown: 0 },
    { type: "dog", cooldown: 0 },
  ]);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [momMessage, setMomMessage] = useState("");
  const [dadCalled, setDadCalled] = useState(false);
  const [grandmaCalled, setGrandmaCalled] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreTickRef = useRef(0);

  const messPercent = countMess(grid);

  const startGame = useCallback(() => {
    setGrid(createInitialGrid());
    setMom({ row: 0, col: 0 });
    setDad({ row: 5, col: 5, active: false });
    setDog({ active: false, row: 0, col: 0, movesLeft: 0 });
    setTimer(GAME_DURATION);
    setPatience(MAX_PATIENCE);
    setScore(0);
    setMessHistory([]);
    setPowerups([
      { type: "skateboard", cooldown: 0 },
      { type: "paint", cooldown: 0 },
      { type: "dog", cooldown: 0 },
    ]);
    setCombo(0);
    setShowCombo(false);
    setMomMessage("");
    setDadCalled(false);
    setGrandmaCalled(false);
    setScreen("playing");
  }, []);

  // Main game loop
  useEffect(() => {
    if (screen !== "playing") return;

    tickRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) return 0;
        return prev - 0.4; // tick every 400ms, decrease by 0.4s
      });

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) =>
          row.map((cell) => ({ ...cell, justMessed: false, justCleaned: false }))
        );

        // Mom cleans the cell she's on
        setMom((prevMom) => {
          if (newGrid[prevMom.row][prevMom.col].item) {
            newGrid[prevMom.row][prevMom.col] = {
              item: null,
              justMessed: false,
              justCleaned: true,
            };
          }

          // Move mom toward messiest area
          const target = findMessiestArea(newGrid);
          const nextPos = moveToward(prevMom, target);
          return { row: nextPos.row, col: nextPos.col };
        });

        // Dad cleans if active
        setDad((prevDad) => {
          if (!prevDad.active) return prevDad;
          if (newGrid[prevDad.row]?.[prevDad.col]?.item) {
            newGrid[prevDad.row][prevDad.col] = {
              item: null,
              justMessed: false,
              justCleaned: true,
            };
          }
          // Dad moves randomly toward any messy cell
          const messyCells: { row: number; col: number }[] = [];
          newGrid.forEach((row, ri) =>
            row.forEach((cell, ci) => {
              if (cell.item) messyCells.push({ row: ri, col: ci });
            })
          );
          if (messyCells.length > 0) {
            const target = messyCells[Math.floor(Math.random() * messyCells.length)];
            const nextPos = moveToward(prevDad, target);
            return { ...prevDad, row: nextPos.row, col: nextPos.col };
          }
          return prevDad;
        });

        // Dog messes things up if active
        setDog((prevDog) => {
          if (!prevDog.active || prevDog.movesLeft <= 0) {
            return { ...prevDog, active: false };
          }
          // Dog places mess and moves randomly
          if (!newGrid[prevDog.row][prevDog.col].item) {
            newGrid[prevDog.row][prevDog.col] = {
              item: randomItem(),
              justMessed: true,
              justCleaned: false,
            };
          }
          const nr = Math.max(0, Math.min(GRID_SIZE - 1, prevDog.row + Math.floor(Math.random() * 3) - 1));
          const nc = Math.max(0, Math.min(GRID_SIZE - 1, prevDog.col + Math.floor(Math.random() * 3) - 1));
          return { active: true, row: nr, col: nc, movesLeft: prevDog.movesLeft - 1 };
        });

        return newGrid;
      });

      // Update patience
      setGrid((g) => {
        const mess = countMess(g);
        setPatience((prev) => {
          const delta = mess > 70 ? -3 : mess > 50 ? -1.5 : 1;
          return Math.max(0, Math.min(MAX_PATIENCE, prev + delta));
        });
        setMessHistory((h) => [...h, mess]);
        return g;
      });

      // Reduce powerup cooldowns
      setPowerups((prev) =>
        prev.map((p) => ({ ...p, cooldown: Math.max(0, p.cooldown - 1) }))
      );

      // Score ticking
      scoreTickRef.current++;

      // Mom messages
      setTimer((t) => {
        if (t <= 45 && t > 44) {
          setMomMessage("엄마: 이 방이 뭐니!! 😤");
          setTimeout(() => setMomMessage(""), 2000);
        }
        if (t <= 30 && t > 29 && !dadCalled) {
          setDadCalled(true);
          setMomMessage("엄마: 여보! 이리 와서 도와줘! 👨");
          setDad((d) => ({ ...d, active: true }));
          setTimeout(() => setMomMessage(""), 2500);
        }
        if (t <= 15 && t > 14) {
          setMomMessage("엄마: 할머니한테 전화할거야!! 📱");
          setTimeout(() => setMomMessage(""), 2000);
        }
        return t;
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [screen, dadCalled]);

  // Check end conditions
  useEffect(() => {
    if (screen !== "playing") return;

    if (timer <= 0) {
      const avgMess =
        messHistory.length > 0
          ? Math.round(messHistory.reduce((a, b) => a + b, 0) / messHistory.length)
          : messPercent;
      setScore(avgMess * 10 + (patience > 0 ? 0 : -100));
      setScreen("victory");
    }

    if (patience <= 0) {
      setGrandmaCalled(true);
      const avgMess =
        messHistory.length > 0
          ? Math.round(messHistory.reduce((a, b) => a + b, 0) / messHistory.length)
          : messPercent;
      setScore(Math.max(0, avgMess * 5));
      setScreen("gameover");
    }
  }, [timer, patience, screen, messPercent, messHistory]);

  // Tap cell to place mess
  const handleCellTap = useCallback(
    (row: number, col: number) => {
      if (screen !== "playing") return;
      setGrid((prev) => {
        if (prev[row][col].item) return prev; // already messy
        const newGrid = prev.map((r) => r.map((c) => ({ ...c, justMessed: false })));
        newGrid[row][col] = { item: randomItem(), justMessed: true, justCleaned: false };
        return newGrid;
      });
      setCombo((c) => c + 1);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 600);
      // Patience decreases slightly when you mess
      setPatience((p) => Math.max(0, p - 1));
    },
    [screen]
  );

  // Use powerup
  const usePowerup = useCallback(
    (type: PowerUpType) => {
      if (screen !== "playing") return;
      setPowerups((prev) => {
        const pu = prev.find((p) => p.type === type);
        if (!pu || pu.cooldown > 0) return prev;
        return prev.map((p) => (p.type === type ? { ...p, cooldown: type === "dog" ? 20 : 12 } : p));
      });

      if (type === "skateboard") {
        // Mess up a random entire row
        setGrid((prev) => {
          const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
          const targetRow = Math.floor(Math.random() * GRID_SIZE);
          for (let c = 0; c < GRID_SIZE; c++) {
            newGrid[targetRow][c] = { item: randomItem(), justMessed: true, justCleaned: false };
          }
          return newGrid;
        });
        setMomMessage("엄마: 스케이트보드 타지 말라했지!! 😡");
        setPatience((p) => Math.max(0, p - 5));
        setTimeout(() => setMomMessage(""), 2000);
      } else if (type === "paint") {
        // Mess up 3x3 area centered on random cell
        setGrid((prev) => {
          const newGrid = prev.map((r) => r.map((c) => ({ ...c })));
          const cr = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
          const cc = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = cr + dr,
                nc = cc + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                newGrid[nr][nc] = { item: randomItem(), justMessed: true, justCleaned: false };
              }
            }
          }
          return newGrid;
        });
        setMomMessage("엄마: 페인트!!!! 안돼!!!! 🤯");
        setPatience((p) => Math.max(0, p - 8));
        setTimeout(() => setMomMessage(""), 2000);
      } else if (type === "dog") {
        setDog({ active: true, row: Math.floor(Math.random() * GRID_SIZE), col: Math.floor(Math.random() * GRID_SIZE), movesLeft: 10 });
        setMomMessage("엄마: 강아지 데리고 나가!! 🐶😤");
        setPatience((p) => Math.max(0, p - 4));
        setTimeout(() => setMomMessage(""), 2000);
      }
    },
    [screen]
  );

  // --- RENDER ---

  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 via-orange-100 to-pink-200 flex flex-col items-center justify-center p-4">
        <Link href="/" className="absolute top-4 left-4 text-lg font-bold bg-white/70 px-3 py-1 rounded-full shadow hover:bg-white transition">
          ← 홈으로
        </Link>

        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl animate-bounce">🧹</div>
          <h1 className="text-3xl font-black text-orange-600 drop-shadow-lg">
            엄마 청소 못하게 만들기!
          </h1>
          <p className="text-lg text-orange-800 font-semibold">
            엄마가 방을 청소하려고 해요!
            <br />
            60초 동안 방을 어지럽혀서
            <br />
            엄마의 청소를 막아보세요! 🎮
          </p>

          <div className="bg-white/80 rounded-xl p-4 text-left text-sm space-y-2 shadow-lg">
            <p className="font-bold text-orange-700">📋 게임 규칙:</p>
            <p>🖱️ 빈 칸을 터치하면 물건을 어지럽혀요</p>
            <p>🧹 엄마(👩)가 돌아다니며 청소해요</p>
            <p>📊 어지러움 50% 이상 유지하세요!</p>
            <p>😤 엄마 인내심이 0이 되면 할머니 호출! (게임오버)</p>
            <p>⏱️ 60초 동안 버티면 승리!</p>
            <p className="font-bold text-purple-700 pt-1">🎯 파워업:</p>
            <p>🛹 스케이트보드 - 한 줄 전체를 어지럽혀!</p>
            <p>🎨 페인트 - 3×3 영역을 어지럽혀!</p>
            <p>🐶 강아지 소환 - 뛰어다니며 어지럽혀!</p>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform animate-pulse"
          >
            🎮 게임 시작!
          </button>
        </div>
      </div>
    );
  }

  if (screen === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-300 via-red-200 to-orange-200 flex flex-col items-center justify-center p-4">
        <Link href="/" className="absolute top-4 left-4 text-lg font-bold bg-white/70 px-3 py-1 rounded-full shadow hover:bg-white transition">
          ← 홈으로
        </Link>

        <div className="text-center space-y-5 max-w-md">
          <div className="text-7xl">👵</div>
          <h2 className="text-3xl font-black text-red-600">게임 오버!</h2>
          <p className="text-xl text-red-800 font-bold">
            엄마가 할머니를 불렀어요...
          </p>
          <p className="text-lg text-red-700">
            할머니: &quot;이 녀석! 방 당장 치워!!&quot; 😡
          </p>

          <div className="bg-white/80 rounded-xl p-5 shadow-lg space-y-2">
            <p className="text-2xl font-black text-orange-600">
              점수: {score}점
            </p>
            <p className="text-sm text-gray-600">
              평균 어지러움:{" "}
              {messHistory.length > 0
                ? Math.round(messHistory.reduce((a, b) => a + b, 0) / messHistory.length)
                : 0}
              %
            </p>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            🔄 다시 하기!
          </button>
        </div>
      </div>
    );
  }

  if (screen === "victory") {
    const avgMess =
      messHistory.length > 0
        ? Math.round(messHistory.reduce((a, b) => a + b, 0) / messHistory.length)
        : 0;
    const grade = avgMess >= 80 ? "S" : avgMess >= 70 ? "A" : avgMess >= 60 ? "B" : avgMess >= 50 ? "C" : "D";
    const gradeEmoji = { S: "🏆", A: "🥇", B: "🥈", C: "🥉", D: "😅" }[grade];

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-200 via-yellow-100 to-blue-200 flex flex-col items-center justify-center p-4">
        <Link href="/" className="absolute top-4 left-4 text-lg font-bold bg-white/70 px-3 py-1 rounded-full shadow hover:bg-white transition">
          ← 홈으로
        </Link>

        <div className="text-center space-y-5 max-w-md">
          <div className="text-7xl animate-bounce">🎉</div>
          <h2 className="text-3xl font-black text-green-600">승리!</h2>
          <p className="text-xl text-green-800 font-bold">
            60초 동안 버텼어요! 엄마가 포기했어요! 😂
          </p>
          <p className="text-lg text-green-700">
            엄마: &quot;나중에 보자...&quot; 😩
          </p>

          <div className="bg-white/80 rounded-xl p-5 shadow-lg space-y-3">
            <p className="text-4xl font-black">
              {gradeEmoji} {grade}등급
            </p>
            <p className="text-2xl font-black text-orange-600">점수: {score}점</p>
            <p className="text-sm text-gray-600">평균 어지러움: {avgMess}%</p>
            <p className="text-sm text-gray-600">
              엄마 남은 인내심: {Math.round(patience)}%
            </p>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            🔄 다시 하기!
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING screen ---
  const patienceColor =
    patience > 60 ? "bg-green-500" : patience > 30 ? "bg-yellow-500" : "bg-red-500";
  const messColor =
    messPercent >= 70 ? "bg-green-500" : messPercent >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100 flex flex-col items-center p-2 select-none">
      <Link href="/" className="absolute top-2 left-2 text-sm font-bold bg-white/70 px-2 py-1 rounded-full shadow hover:bg-white transition z-50">
        ← 홈으로
      </Link>

      {/* Header stats */}
      <div className="w-full max-w-sm space-y-1 pt-1">
        <div className="flex justify-between items-center text-sm font-bold">
          <span>⏱️ {Math.ceil(timer)}초</span>
          <span className="text-orange-700 text-base">점수: {Math.round(messHistory.length > 0 ? (messHistory.reduce((a, b) => a + b, 0) / messHistory.length) * 10 : 0)}</span>
        </div>

        {/* Mess meter */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs font-bold">
            <span>🗑️ 어지러움</span>
            <span className={messPercent < 50 ? "text-red-600 animate-pulse" : "text-green-700"}>
              {messPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${messColor}`}
              style={{ width: `${messPercent}%` }}
            />
          </div>
          {messPercent < 50 && (
            <p className="text-xs text-red-600 font-bold animate-pulse text-center">
              ⚠️ 50% 이상 유지하세요!
            </p>
          )}
        </div>

        {/* Patience meter */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs font-bold">
            <span>😤 엄마 인내심</span>
            <span>{Math.round(patience)}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${patienceColor}`}
              style={{ width: `${patience}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mom message */}
      {momMessage && (
        <div className="mt-1 px-4 py-1.5 bg-white/90 rounded-xl shadow-lg text-sm font-bold text-red-600 animate-bounce">
          {momMessage}
        </div>
      )}

      {/* Combo indicator */}
      {showCombo && combo > 2 && (
        <div className="absolute top-24 right-4 text-xl font-black text-purple-600 animate-ping">
          {combo}콤보! 🔥
        </div>
      )}

      {/* Game Grid */}
      <div className="mt-2 p-2 bg-amber-200/60 rounded-2xl shadow-xl border-4 border-amber-400">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          }}
        >
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isMom = mom.row === ri && mom.col === ci;
              const isDad = dad.active && dad.row === ri && dad.col === ci;
              const isDog = dog.active && dog.row === ri && dog.col === ci;

              return (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => handleCellTap(ri, ci)}
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-2xl flex items-center justify-center
                    transition-all duration-200 relative
                    ${cell.item
                      ? "bg-orange-300/80 shadow-inner"
                      : "bg-amber-50/80 hover:bg-amber-100 active:scale-90"
                    }
                    ${cell.justMessed ? "animate-bounce scale-110" : ""}
                    ${cell.justCleaned ? "animate-pulse bg-blue-200" : ""}
                    ${isMom ? "ring-2 ring-red-500" : ""}
                    ${isDad ? "ring-2 ring-blue-500" : ""}
                  `}
                >
                  {/* Item */}
                  {cell.item && !isMom && !isDad && (
                    <span className="text-xl">{ITEM_EMOJIS[cell.item]}</span>
                  )}

                  {/* Mom overlay */}
                  {isMom && (
                    <span className="text-2xl absolute animate-bounce z-10" title="엄마">
                      👩🧹
                    </span>
                  )}

                  {/* Dad overlay */}
                  {isDad && (
                    <span className="text-2xl absolute animate-bounce z-10" title="아빠">
                      👨🧹
                    </span>
                  )}

                  {/* Dog overlay */}
                  {isDog && (
                    <span className="text-xl absolute -top-1 -right-1 animate-spin z-20">
                      🐶
                    </span>
                  )}

                  {/* Empty cell hint */}
                  {!cell.item && !isMom && !isDad && (
                    <span className="text-xs text-amber-300 opacity-50">+</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Power-ups */}
      <div className="mt-3 flex gap-2">
        {powerups.map((pu) => {
          const info = POWERUP_INFO[pu.type];
          const ready = pu.cooldown <= 0;
          return (
            <button
              key={pu.type}
              onClick={() => ready && usePowerup(pu.type)}
              disabled={!ready}
              className={`
                relative flex flex-col items-center px-3 py-2 rounded-xl font-bold text-xs
                transition-all
                ${ready
                  ? "bg-gradient-to-b from-purple-400 to-purple-600 text-white shadow-lg hover:scale-105 active:scale-95"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              <span className="text-2xl">{info.emoji}</span>
              <span>{info.label}</span>
              {!ready && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {Math.ceil(pu.cooldown * 0.4)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active helpers indicator */}
      <div className="mt-2 flex gap-3 text-xs font-bold">
        {dad.active && (
          <span className="bg-blue-100 px-2 py-1 rounded-full text-blue-800">
            👨 아빠 참전 중!
          </span>
        )}
        {dog.active && (
          <span className="bg-green-100 px-2 py-1 rounded-full text-green-800 animate-pulse">
            🐶 강아지 활동 중!
          </span>
        )}
      </div>

      {/* Tips */}
      <p className="mt-2 text-xs text-amber-700 text-center font-medium">
        빈 칸을 터치해서 어지럽히세요! 💥
      </p>
    </div>
  );
}
