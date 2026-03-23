"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════
   레고 조립하기
   ═══════════════════════════════════════ */

interface Block {
  id: number;
  x: number;
  y: number;
  width: number;  // 1~4 칸
  height: number;  // 1~2 칸
  color: string;
  placed: boolean;
  rotation: number; // 0 or 90
}

interface Blueprint {
  name: string;
  emoji: string;
  difficulty: string;
  grid: string[][]; // 색 이름으로 된 2D 배열 (빈칸은 "")
  desc: string;
}

const COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  white: "#e5e7eb",
  black: "#374151",
  pink: "#ec4899",
  cyan: "#06b6d4",
  brown: "#92400e",
  gray: "#6b7280",
};

const BLUEPRINTS: Blueprint[] = [
  {
    name: "집",
    emoji: "🏠",
    difficulty: "쉬움",
    desc: "알록달록한 집을 만들어보세요!",
    grid: [
      ["", "", "red", "red", "red", "", ""],
      ["", "red", "red", "red", "red", "red", ""],
      ["red", "red", "red", "red", "red", "red", "red"],
      ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow"],
      ["yellow", "blue", "yellow", "yellow", "yellow", "blue", "yellow"],
      ["yellow", "blue", "yellow", "brown", "yellow", "blue", "yellow"],
      ["yellow", "yellow", "yellow", "brown", "yellow", "yellow", "yellow"],
    ],
  },
  {
    name: "자동차",
    emoji: "🚗",
    difficulty: "보통",
    desc: "멋진 자동차를 조립하세요!",
    grid: [
      ["", "", "red", "red", "red", "", "", ""],
      ["", "red", "red", "red", "red", "red", "", ""],
      ["red", "red", "blue", "red", "red", "blue", "red", "red"],
      ["red", "red", "red", "red", "red", "red", "red", "red"],
      ["", "black", "black", "", "", "black", "black", ""],
    ],
  },
  {
    name: "로봇",
    emoji: "🤖",
    difficulty: "보통",
    desc: "강력한 로봇을 만들어보세요!",
    grid: [
      ["", "gray", "gray", "gray", "gray", ""],
      ["", "gray", "blue", "blue", "gray", ""],
      ["", "gray", "gray", "gray", "gray", ""],
      ["gray", "red", "red", "red", "red", "gray"],
      ["", "", "red", "red", "", ""],
      ["", "", "red", "red", "", ""],
      ["", "gray", "gray", "gray", "gray", ""],
      ["", "gray", "", "", "gray", ""],
    ],
  },
  {
    name: "성",
    emoji: "🏰",
    difficulty: "어려움",
    desc: "웅장한 성을 건설하세요!",
    grid: [
      ["gray", "", "", "gray", "", "", "gray"],
      ["gray", "", "", "gray", "", "", "gray"],
      ["gray", "gray", "gray", "gray", "gray", "gray", "gray"],
      ["gray", "gray", "gray", "gray", "gray", "gray", "gray"],
      ["gray", "blue", "gray", "gray", "gray", "blue", "gray"],
      ["gray", "blue", "gray", "brown", "gray", "blue", "gray"],
      ["gray", "gray", "gray", "brown", "gray", "gray", "gray"],
    ],
  },
  {
    name: "꽃",
    emoji: "🌸",
    difficulty: "쉬움",
    desc: "예쁜 꽃을 만들어보세요!",
    grid: [
      ["", "", "pink", "pink", "pink", "", ""],
      ["", "pink", "pink", "yellow", "pink", "pink", ""],
      ["pink", "pink", "yellow", "yellow", "yellow", "pink", "pink"],
      ["", "pink", "pink", "yellow", "pink", "pink", ""],
      ["", "", "pink", "pink", "pink", "", ""],
      ["", "", "", "green", "", "", ""],
      ["", "", "green", "green", "green", "", ""],
      ["", "", "", "green", "", "", ""],
    ],
  },
  {
    name: "우주선",
    emoji: "🚀",
    difficulty: "어려움",
    desc: "우주로 떠나는 로켓을 만드세요!",
    grid: [
      ["", "", "", "red", "", "", ""],
      ["", "", "red", "red", "red", "", ""],
      ["", "", "white", "white", "white", "", ""],
      ["", "", "white", "blue", "white", "", ""],
      ["", "", "white", "blue", "white", "", ""],
      ["", "", "white", "white", "white", "", ""],
      ["", "red", "white", "white", "white", "red", ""],
      ["red", "red", "orange", "orange", "orange", "red", "red"],
      ["", "", "yellow", "yellow", "yellow", "", ""],
    ],
  },
];

type Screen = "menu" | "select" | "building" | "complete" | "free";

export default function LegoGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedBP, setSelectedBP] = useState<Blueprint | null>(null);
  const [placedGrid, setPlacedGrid] = useState<string[][]>([]);
  const [selectedColor, setSelectedColor] = useState("red");
  const [completed, setCompleted] = useState(0);
  const [showGuide, setShowGuide] = useState(true);

  // 자유 모드
  const [freeGrid, setFreeGrid] = useState<string[][]>(
    Array.from({ length: 16 }, () => Array(12).fill(""))
  );

  const startBlueprint = (bp: Blueprint) => {
    setSelectedBP(bp);
    setPlacedGrid(bp.grid.map(row => row.map(() => "")));
    setShowGuide(true);
    setScreen("building");
  };

  const placeBlock = (row: number, col: number) => {
    if (!selectedBP) return;
    const target = selectedBP.grid[row]?.[col];
    if (!target) return; // 빈칸

    // 올바른 색인지 체크
    if (selectedColor !== target) return;

    // 이미 놓았으면 무시
    if (placedGrid[row][col] === target) return;

    const newGrid = placedGrid.map(r => [...r]);
    newGrid[row][col] = target;
    setPlacedGrid(newGrid);

    // 완성 체크
    let complete = true;
    for (let r = 0; r < selectedBP.grid.length; r++) {
      for (let c = 0; c < selectedBP.grid[r].length; c++) {
        if (selectedBP.grid[r][c] && newGrid[r][c] !== selectedBP.grid[r][c]) {
          complete = false;
          break;
        }
      }
      if (!complete) break;
    }

    if (complete) {
      setCompleted(prev => prev + 1);
      setTimeout(() => setScreen("complete"), 500);
    }
  };

  const placeFreeBlock = (row: number, col: number) => {
    const newGrid = freeGrid.map(r => [...r]);
    if (newGrid[row][col] === selectedColor) {
      newGrid[row][col] = ""; // 토글 제거
    } else {
      newGrid[row][col] = selectedColor;
    }
    setFreeGrid(newGrid);
  };

  // 필요한 색 목록 계산
  const getNeededColors = () => {
    if (!selectedBP) return [];
    const colors = new Set<string>();
    selectedBP.grid.forEach(row => row.forEach(cell => { if (cell) colors.add(cell); }));
    return Array.from(colors);
  };

  // 진행도 계산
  const getProgress = () => {
    if (!selectedBP) return 0;
    let total = 0, done = 0;
    selectedBP.grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) { total++; if (placedGrid[r]?.[c] === cell) done++; }
      })
    );
    return total > 0 ? Math.floor((done / total) * 100) : 0;
  };

  /* ═══ 메뉴 ═══ */
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-600 via-yellow-500 to-blue-600 flex flex-col items-center justify-center p-6 text-white">
        <Link href="/" className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2 text-sm">← 홈으로</Link>
        <div className="text-center">
          <div className="flex gap-1 justify-center text-5xl mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-lg shadow-lg border-2 border-red-400 flex items-center justify-center">
              <div className="w-4 h-4 bg-red-400 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg shadow-lg border-2 border-blue-400 flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-400 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg shadow-lg border-2 border-yellow-400 flex items-center justify-center">
              <div className="w-4 h-4 bg-yellow-400 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg shadow-lg border-2 border-green-400 flex items-center justify-center">
              <div className="w-4 h-4 bg-green-400 rounded-full" />
            </div>
          </div>
          <h1 className="text-4xl font-black mb-2 drop-shadow-lg">레고 조립하기</h1>
          <p className="text-white/80 mb-8 text-sm">블록을 하나씩 놓아 멋진 작품을 완성하세요!</p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button onClick={() => setScreen("select")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <div className="font-bold text-lg">설명서 모드</div>
                  <div className="text-xs text-white/70">설명서를 보고 조립하세요!</div>
                </div>
              </div>
            </button>
            <button onClick={() => { setFreeGrid(Array.from({ length: 16 }, () => Array(12).fill(""))); setScreen("free"); }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎨</span>
                <div>
                  <div className="font-bold text-lg">자유 모드</div>
                  <div className="text-xs text-white/70">마음대로 만들어보세요!</div>
                </div>
              </div>
            </button>
          </div>

          {completed > 0 && <p className="mt-6 text-yellow-200">🏆 완성한 작품: {completed}개</p>}
        </div>
      </div>
    );
  }

  /* ═══ 설명서 선택 ═══ */
  if (screen === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("menu")} className="text-gray-400 text-sm mb-4">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-4">📋 설명서 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {BLUEPRINTS.map(bp => (
              <button key={bp.name} onClick={() => startBlueprint(bp)}
                className="bg-white/10 hover:bg-white/20 rounded-2xl p-4 text-center transition-all hover:scale-105 active:scale-95">
                <div className="text-4xl mb-2">{bp.emoji}</div>
                <div className="font-bold">{bp.name}</div>
                <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block ${
                  bp.difficulty === "쉬움" ? "bg-green-600/50 text-green-300" :
                  bp.difficulty === "보통" ? "bg-yellow-600/50 text-yellow-300" :
                  "bg-red-600/50 text-red-300"
                }`}>{bp.difficulty}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 완성 ═══ */
  if (screen === "complete" && selectedBP) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-600 via-orange-500 to-red-600 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">{selectedBP.emoji}</div>
          <h2 className="text-3xl font-black mb-2">조립 완성! 🎉</h2>
          <p className="text-white/80 mb-2">{selectedBP.name}을(를) 멋지게 완성했어요!</p>

          {/* 완성된 모습 미니 */}
          <div className="bg-black/20 rounded-2xl p-3 mb-6 inline-block">
            {selectedBP.grid.map((row, r) => (
              <div key={r} className="flex justify-center">
                {row.map((cell, c) => (
                  <div key={c} className="w-5 h-5"
                    style={{ backgroundColor: cell ? COLORS[cell] : "transparent", borderRadius: 2 }}>
                    {cell && <div className="w-2 h-2 mx-auto mt-0.5 rounded-full" style={{ backgroundColor: COLORS[cell], filter: "brightness(1.3)" }} />}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setScreen("select")}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 font-bold transition-all hover:scale-105">
              다른 작품 📋
            </button>
            <button onClick={() => setScreen("menu")}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-3 font-bold transition-all hover:scale-105">
              메뉴로 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 조립 화면 ═══ */
  if (screen === "building" && selectedBP) {
    const neededColors = getNeededColors();
    const progress = getProgress();
    const cellSize = Math.min(36, Math.floor(320 / Math.max(...selectedBP.grid.map(r => r.length))));

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white flex flex-col">
        {/* 상단 */}
        <div className="px-3 py-2 bg-black/40 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setScreen("select")} className="text-xs text-gray-400">← 뒤로</button>
            <span className="font-bold text-sm">{selectedBP.emoji} {selectedBP.name}</span>
            <button onClick={() => setShowGuide(!showGuide)}
              className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg">
              {showGuide ? "👁️ 가이드 ON" : "👁️‍🗨️ 가이드 OFF"}
            </button>
          </div>
          {/* 진행도 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
        </div>

        {/* 조립판 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* 설명서 미리보기 (작은거) */}
          {showGuide && (
            <div className="mb-3 bg-black/20 rounded-xl p-2">
              <div className="text-[9px] text-gray-500 text-center mb-1">📋 설명서</div>
              <div className="flex flex-col items-center">
                {selectedBP.grid.map((row, r) => (
                  <div key={r} className="flex">
                    {row.map((cell, c) => (
                      <div key={c} className="w-3 h-3 border border-white/5"
                        style={{ backgroundColor: cell ? COLORS[cell] + "60" : "transparent" }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메인 조립판 */}
          <div className="bg-green-900/30 rounded-2xl p-3 border-2 border-green-800/50">
            {/* 레고 베이스플레이트 느낌 */}
            <div className="bg-gradient-to-br from-green-700/20 to-green-900/20 rounded-xl p-1">
              {selectedBP.grid.map((row, r) => (
                <div key={r} className="flex justify-center">
                  {row.map((cell, c) => {
                    const placed = placedGrid[r]?.[c];
                    const isTarget = cell !== "";
                    const isPlaced = placed === cell && cell !== "";
                    const isWrongSpot = selectedColor === cell && !isPlaced && isTarget;

                    return (
                      <button
                        key={c}
                        onClick={() => placeBlock(r, c)}
                        className="relative transition-all"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          margin: 1,
                        }}>
                        {isPlaced ? (
                          // 놓인 블록
                          <div className="w-full h-full rounded-sm shadow-md"
                            style={{ backgroundColor: COLORS[cell] }}>
                            {/* 스터드 (레고 돌기) */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-[40%] h-[40%] rounded-full border border-white/20"
                                style={{ backgroundColor: COLORS[cell], filter: "brightness(1.2)" }} />
                            </div>
                          </div>
                        ) : isTarget ? (
                          // 가이드 (놓아야 할 위치)
                          <div className={`w-full h-full rounded-sm border-2 border-dashed transition-all ${
                            isWrongSpot ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
                          }`}>
                            {showGuide && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-[30%] h-[30%] rounded-full"
                                  style={{ backgroundColor: COLORS[cell] + "40" }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          // 빈칸
                          <div className="w-full h-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 색 선택 팔레트 */}
        <div className="px-3 pb-4">
          <div className="bg-black/40 rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-gray-400 text-center mb-2">🎨 블록 색 선택</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {neededColors.map(colorName => {
                // 이 색의 남은 개수
                let remaining = 0;
                selectedBP.grid.forEach((row, r) =>
                  row.forEach((cell, c) => {
                    if (cell === colorName && placedGrid[r]?.[c] !== cell) remaining++;
                  })
                );

                return (
                  <button key={colorName} onClick={() => setSelectedColor(colorName)}
                    className={`relative w-12 h-12 rounded-xl transition-all ${
                      selectedColor === colorName ? "ring-3 ring-white scale-110 shadow-lg" : "hover:scale-105"
                    } ${remaining === 0 ? "opacity-30" : ""}`}
                    style={{ backgroundColor: COLORS[colorName] }}>
                    {/* 스터드 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border border-white/30"
                        style={{ backgroundColor: COLORS[colorName], filter: "brightness(1.3)" }} />
                    </div>
                    {/* 남은 개수 */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full text-[9px] flex items-center justify-center font-bold">
                      {remaining}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 자유 모드 ═══ */
  if (screen === "free") {
    const cellSize = 28;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white flex flex-col">
        <div className="px-3 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <button onClick={() => setScreen("menu")} className="text-xs text-gray-400">← 메뉴</button>
          <span className="font-bold text-sm">🎨 자유 모드</span>
          <button onClick={() => setFreeGrid(Array.from({ length: 16 }, () => Array(12).fill("")))}
            className="text-xs bg-red-600/50 hover:bg-red-500/50 px-2 py-1 rounded-lg">🗑️ 초기화</button>
        </div>

        {/* 캔버스 */}
        <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
          <div className="bg-green-900/30 rounded-2xl p-2 border-2 border-green-800/50">
            {freeGrid.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => (
                  <button key={c} onClick={() => placeFreeBlock(r, c)}
                    className="transition-all hover:scale-110"
                    style={{ width: cellSize, height: cellSize, margin: 0.5 }}>
                    {cell ? (
                      <div className="w-full h-full rounded-sm shadow-sm"
                        style={{ backgroundColor: COLORS[cell] }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-[40%] h-[40%] rounded-full border border-white/20"
                            style={{ backgroundColor: COLORS[cell], filter: "brightness(1.3)" }} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-sm bg-white/5 border border-white/5 hover:bg-white/10" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 팔레트 */}
        <div className="px-3 pb-4">
          <div className="bg-black/40 rounded-2xl p-3 border border-white/10">
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(COLORS).map(([name, hex]) => (
                <button key={name} onClick={() => setSelectedColor(name)}
                  className={`w-10 h-10 rounded-xl transition-all ${
                    selectedColor === name ? "ring-3 ring-white scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: hex, filter: "brightness(1.3)" }} />
                  </div>
                </button>
              ))}
              {/* 지우개 */}
              <button onClick={() => setSelectedColor("")}
                className={`w-10 h-10 rounded-xl bg-white/10 transition-all flex items-center justify-center text-lg ${
                  selectedColor === "" ? "ring-3 ring-white scale-110" : "hover:scale-105"
                }`}>
                🧹
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
