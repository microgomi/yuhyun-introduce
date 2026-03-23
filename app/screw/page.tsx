"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

// --- Types ---
interface Screw {
  id: number;
  x: number;
  y: number;
  color: string;
  removing: boolean;
  removed: boolean;
}

interface Plate {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  screwIds: number[];
  fallen: boolean;
  rotation: number;
}

interface Level {
  id: number;
  name: string;
  screws: Omit<Screw, "removing" | "removed">[];
  plates: Omit<Plate, "fallen">[];
}

// --- Colors ---
const PLATE_COLORS = [
  "bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400",
  "bg-purple-400", "bg-pink-400", "bg-orange-400", "bg-cyan-400",
  "bg-indigo-400", "bg-emerald-400", "bg-rose-400", "bg-amber-400",
];

const SCREW_COLORS = ["text-gray-300", "text-gray-400", "text-zinc-300"];

// --- Level Generator ---
function generateLevel(levelNum: number): Level {
  const screws: Omit<Screw, "removing" | "removed">[] = [];
  const plates: Omit<Plate, "fallen">[] = [];
  let screwId = 0;

  const plateCount = Math.min(3 + Math.floor(levelNum / 2), 8);
  const areaW = 300;
  const areaH = 400;

  for (let i = 0; i < plateCount; i++) {
    const pw = 80 + Math.random() * 100;
    const ph = 50 + Math.random() * 60;
    const px = 20 + Math.random() * (areaW - pw - 20);
    const py = 20 + Math.random() * (areaH - ph - 20);
    const rotation = (Math.random() - 0.5) * 30;
    const screwCount = 2 + Math.floor(Math.random() * (levelNum > 5 ? 2 : 1));
    const plateScrewIds: number[] = [];

    for (let j = 0; j < screwCount; j++) {
      const sx = px + 15 + Math.random() * (pw - 30);
      const sy = py + 15 + Math.random() * (ph - 30);
      screws.push({
        id: screwId,
        x: sx,
        y: sy,
        color: SCREW_COLORS[Math.floor(Math.random() * SCREW_COLORS.length)],
      });
      plateScrewIds.push(screwId);
      screwId++;
    }

    plates.push({
      id: i,
      x: px,
      y: py,
      w: pw,
      h: ph,
      color: PLATE_COLORS[i % PLATE_COLORS.length],
      screwIds: plateScrewIds,
      rotation,
    });
  }

  return {
    id: levelNum,
    name: `레벨 ${levelNum}`,
    screws,
    plates,
  };
}

// --- Hole slots ---
const HOLE_COUNT = 5;

type Screen = "menu" | "game" | "clear" | "fail";

export default function ScrewPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState(1);
  const [highestLevel, setHighestLevel] = useState(1);
  const [stars, setStars] = useState(0);

  // Game state
  const [screws, setScrews] = useState<Screw[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [hole, setHole] = useState<(Screw | null)[]>(Array(HOLE_COUNT).fill(null));
  const [moves, setMoves] = useState(0);
  const [maxMoves, setMaxMoves] = useState(20);
  const [hint, setHint] = useState<number | null>(null);

  const startLevel = useCallback((lvl: number) => {
    const levelData = generateLevel(lvl);
    setScrews(levelData.screws.map((s) => ({ ...s, removing: false, removed: false })));
    setPlates(levelData.plates.map((p) => ({ ...p, fallen: false })));
    setHole(Array(HOLE_COUNT).fill(null));
    setMoves(0);
    setMaxMoves(15 + lvl * 3);
    setHint(null);
    setScreen("game");
  }, []);

  const checkPlateFall = useCallback((updatedScrews: Screw[], currentPlates: Plate[]) => {
    const newPlates = currentPlates.map((plate) => {
      if (plate.fallen) return plate;
      const allRemoved = plate.screwIds.every((sid) => {
        const s = updatedScrews.find((sc) => sc.id === sid);
        return s?.removed;
      });
      if (allRemoved) {
        return { ...plate, fallen: true };
      }
      return plate;
    });
    return newPlates;
  }, []);

  const handleScrewClick = useCallback((screwId: number) => {
    if (screen !== "game") return;

    const screw = screws.find((s) => s.id === screwId);
    if (!screw || screw.removed || screw.removing) return;

    // Check if screw is accessible (not blocked by plate above)
    const screwPlate = plates.find((p) => !p.fallen && p.screwIds.includes(screwId));
    if (!screwPlate) return;

    // Check if any non-fallen plate above this one covers this screw
    const screwPlateIdx = plates.indexOf(screwPlate);
    for (let i = screwPlateIdx + 1; i < plates.length; i++) {
      const above = plates[i];
      if (above.fallen) continue;
      // Simple overlap check
      if (
        screw.x > above.x - 5 && screw.x < above.x + above.w + 5 &&
        screw.y > above.y - 5 && screw.y < above.y + above.h + 5
      ) {
        // Blocked by plate above
        setHint(null);
        return;
      }
    }

    // Find empty hole slot
    const emptyIdx = hole.findIndex((h) => h === null);
    if (emptyIdx === -1) return; // No space

    // Check if hole is full with same-color screws (shouldn't happen but safety)
    setHint(null);

    // Start removing animation
    const updatedScrews = screws.map((s) =>
      s.id === screwId ? { ...s, removing: true } : s
    );
    setScrews(updatedScrews);

    // After animation, move to hole
    setTimeout(() => {
      const removedScrews = updatedScrews.map((s) =>
        s.id === screwId ? { ...s, removed: true, removing: false } : s
      );
      setScrews(removedScrews);

      const newHole = [...hole];
      newHole[emptyIdx] = { ...screw, removed: true, removing: false };
      setHole(newHole);
      setMoves((m) => m + 1);

      // Check plate falls
      const newPlates = checkPlateFall(removedScrews, plates);
      setPlates(newPlates);

      // Check if hole is full (5 screws) -> clear some if matching pattern or fail
      const filledCount = newHole.filter((h) => h !== null).length;

      // Check win: all screws removed
      const allRemoved = removedScrews.every((s) => s.removed);
      if (allRemoved) {
        const earnedStars = 3;
        setStars((s) => s + earnedStars);
        if (level >= highestLevel) setHighestLevel(level + 1);
        setTimeout(() => setScreen("clear"), 300);
        return;
      }

      // Check fail: hole full and not all removed
      if (filledCount >= HOLE_COUNT && !allRemoved) {
        setTimeout(() => setScreen("fail"), 300);
        return;
      }

      // Check move limit
      if (moves + 1 >= maxMoves && !allRemoved) {
        setTimeout(() => setScreen("fail"), 300);
      }
    }, 300);
  }, [screen, screws, plates, hole, moves, maxMoves, level, highestLevel, checkPlateFall]);

  // Undo: return last screw from hole
  const undoLastScrew = useCallback(() => {
    const lastIdx = hole.reduce((last, h, i) => (h !== null ? i : last), -1);
    if (lastIdx === -1) return;

    const screw = hole[lastIdx];
    if (!screw) return;

    const newHole = [...hole];
    newHole[lastIdx] = null;
    setHole(newHole);

    setScrews((prev) => {
      const updated = prev.map((s) => s.id === screw.id ? { ...s, removed: false, removing: false } : s);
      // Re-check plates (un-fall if screw is back)
      setPlates((prevPlates) =>
        prevPlates.map((plate) => {
          if (!plate.fallen) return plate;
          if (plate.screwIds.includes(screw.id)) {
            return { ...plate, fallen: false };
          }
          return plate;
        })
      );
      return updated;
    });

    setMoves((m) => m + 1);
  }, [hole]);

  // Show hint
  const showHint = useCallback(() => {
    if (stars < 1) return;
    // Find a screw that can be removed
    for (const screw of screws) {
      if (screw.removed || screw.removing) continue;
      const screwPlate = plates.find((p) => !p.fallen && p.screwIds.includes(screw.id));
      if (!screwPlate) continue;
      const screwPlateIdx = plates.indexOf(screwPlate);
      let blocked = false;
      for (let i = screwPlateIdx + 1; i < plates.length; i++) {
        const above = plates[i];
        if (above.fallen) continue;
        if (screw.x > above.x - 5 && screw.x < above.x + above.w + 5 && screw.y > above.y - 5 && screw.y < above.y + above.h + 5) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        setHint(screw.id);
        setStars((s) => s - 1);
        return;
      }
    }
  }, [screws, plates, stars]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-black/10 px-3 py-1 text-sm dark:bg-white/10 hover:bg-black/20">
            ← 홈
          </Link>

          <div className="text-7xl">🔩</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-gray-600 to-zinc-800 dark:from-gray-300 dark:to-zinc-100 bg-clip-text text-transparent">나사 빼기</span>
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">나사를 빼서 판을 떨어뜨려요!</p>

          <div className="flex items-center gap-2 text-amber-500">
            <span className="text-xl">⭐</span>
            <span className="text-xl font-black">{stars}</span>
          </div>

          {/* Level select */}
          <div className="mt-2 grid grid-cols-5 gap-3">
            {Array.from({ length: Math.min(highestLevel + 4, 30) }).map((_, i) => {
              const lvl = i + 1;
              const unlocked = lvl <= highestLevel;
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    if (!unlocked) return;
                    setLevel(lvl);
                    startLevel(lvl);
                  }}
                  disabled={!unlocked}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black transition-transform ${
                    unlocked
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md hover:scale-110 active:scale-95"
                      : "bg-gray-200 text-gray-400 dark:bg-zinc-700 dark:text-zinc-500"
                  }`}
                >
                  {unlocked ? lvl : "🔒"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === GAME === */}
      {screen === "game" && (
        <div className="flex flex-col items-center pt-4 px-2">
          {/* HUD */}
          <div className="mb-3 flex w-[340px] items-center justify-between">
            <button onClick={() => setScreen("menu")} className="rounded-lg bg-black/10 px-3 py-1 text-sm dark:bg-white/10">
              ← 메뉴
            </button>
            <span className="text-lg font-black text-zinc-700 dark:text-zinc-200">레벨 {level}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">🔧 {moves}/{maxMoves}</span>
              <span className="text-sm text-amber-500">⭐{stars}</span>
            </div>
          </div>

          {/* Game area */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-amber-300/50 bg-gradient-to-b from-amber-100 to-orange-100 dark:from-zinc-700 dark:to-zinc-800 shadow-xl"
            style={{ width: 340, height: 420 }}
          >
            {/* Plates (rendered in order, first = bottom) */}
            {plates.map((plate) => (
              <div
                key={plate.id}
                className={`absolute rounded-xl border-2 border-black/10 shadow-lg transition-all duration-500 ${plate.color} ${
                  plate.fallen ? "translate-y-[500px] opacity-0 rotate-12" : ""
                }`}
                style={{
                  left: plate.x,
                  top: plate.y,
                  width: plate.w,
                  height: plate.h,
                  transform: plate.fallen
                    ? `translateY(500px) rotate(${plate.rotation + 30}deg)`
                    : `rotate(${plate.rotation}deg)`,
                  zIndex: plate.id + 1,
                }}
              >
                {/* Plate texture lines */}
                <div className="absolute inset-0 rounded-xl opacity-20">
                  <div className="absolute top-1/4 left-2 right-2 h-px bg-black/30" />
                  <div className="absolute top-2/4 left-2 right-2 h-px bg-black/30" />
                  <div className="absolute top-3/4 left-2 right-2 h-px bg-black/30" />
                </div>
              </div>
            ))}

            {/* Screws */}
            {screws.map((screw) => {
              if (screw.removed) return null;
              const isHinted = hint === screw.id;
              return (
                <button
                  key={screw.id}
                  onClick={() => handleScrewClick(screw.id)}
                  className={`absolute flex items-center justify-center transition-all duration-300 ${
                    screw.removing ? "scale-0 opacity-0" : "scale-100"
                  } ${isHinted ? "animate-bounce" : ""}`}
                  style={{
                    left: screw.x - 14,
                    top: screw.y - 14,
                    width: 28,
                    height: 28,
                    zIndex: 100,
                  }}
                >
                  <div className={`relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 dark:from-zinc-400 dark:to-zinc-600 shadow-md border border-gray-400/50 ${isHinted ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}>
                    {/* Screw cross */}
                    <div className="absolute h-[2px] w-3 rounded bg-gray-600 dark:bg-zinc-800" />
                    <div className="absolute h-3 w-[2px] rounded bg-gray-600 dark:bg-zinc-800" />
                    {/* Shine */}
                    <div className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-white/40" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hole (screw collection area) */}
          <div className="mt-4 flex gap-3">
            {hole.map((h, i) => (
              <div
                key={i}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all ${
                  h
                    ? "border-gray-400 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-500 dark:to-zinc-600 shadow-inner"
                    : "border-dashed border-gray-300 dark:border-zinc-600 bg-gray-100/50 dark:bg-zinc-800/50"
                }`}
              >
                {h && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 dark:from-zinc-400 dark:to-zinc-600 shadow border border-gray-400/50">
                    <div className="absolute h-[2px] w-3 rounded bg-gray-600 dark:bg-zinc-800" />
                    <div className="absolute h-3 w-[2px] rounded bg-gray-600 dark:bg-zinc-800" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={undoLastScrew}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              ↩️ 되돌리기
            </button>
            <button
              onClick={showHint}
              disabled={stars < 1}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95 ${
                stars >= 1 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              💡 힌트 (⭐1)
            </button>
            <button
              onClick={() => startLevel(level)}
              className="rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              🔄 재시작
            </button>
          </div>
        </div>
      )}

      {/* === CLEAR === */}
      {screen === "clear" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🎉</div>
          <h2 className="text-3xl font-black text-amber-600 dark:text-amber-400">클리어!</h2>
          <div className="flex gap-2 text-4xl">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">레벨 {level} 완료! +3⭐</p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setLevel((l) => l + 1);
                startLevel(level + 1);
              }}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              다음 레벨 ▶
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="rounded-xl bg-black/10 dark:bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              메뉴
            </button>
          </div>
        </div>
      )}

      {/* === FAIL === */}
      {screen === "fail" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">😵</div>
          <h2 className="text-3xl font-black text-red-500">실패!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            {hole.filter((h) => h !== null).length >= HOLE_COUNT
              ? "나사 구멍이 꽉 찼어요!"
              : "이동 횟수를 초과했어요!"}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => startLevel(level)}
              className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              🔄 재도전
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="rounded-xl bg-black/10 dark:bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95"
            >
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
