"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";

// --- Types ---
type Cell = 0 | 1; // 0 = empty, 1 = filled
type Grid = Cell[][];

interface BlockShape {
  name: string;
  cells: number[][]; // relative [row, col] positions
  color: string;
}

// --- Block Shapes ---
const ALL_SHAPES: BlockShape[] = [
  // Singles & small
  { name: "dot", cells: [[0,0]], color: "bg-blue-500" },
  { name: "h2", cells: [[0,0],[0,1]], color: "bg-cyan-500" },
  { name: "v2", cells: [[0,0],[1,0]], color: "bg-cyan-500" },
  { name: "h3", cells: [[0,0],[0,1],[0,2]], color: "bg-green-500" },
  { name: "v3", cells: [[0,0],[1,0],[2,0]], color: "bg-green-500" },
  { name: "h4", cells: [[0,0],[0,1],[0,2],[0,3]], color: "bg-emerald-500" },
  { name: "v4", cells: [[0,0],[1,0],[2,0],[3,0]], color: "bg-emerald-500" },
  { name: "h5", cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], color: "bg-teal-500" },
  { name: "v5", cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], color: "bg-teal-500" },
  // L-shapes
  { name: "L1", cells: [[0,0],[1,0],[1,1]], color: "bg-orange-500" },
  { name: "L2", cells: [[0,0],[0,1],[1,0]], color: "bg-orange-500" },
  { name: "L3", cells: [[0,0],[0,1],[1,1]], color: "bg-amber-500" },
  { name: "L4", cells: [[0,0],[1,0],[1,-1]], color: "bg-amber-500" },
  // Big L-shapes
  { name: "BL1", cells: [[0,0],[1,0],[2,0],[2,1]], color: "bg-red-500" },
  { name: "BL2", cells: [[0,0],[0,1],[0,2],[1,0]], color: "bg-red-500" },
  { name: "BL3", cells: [[0,0],[1,0],[2,0],[2,-1]], color: "bg-rose-500" },
  { name: "BL4", cells: [[0,0],[0,1],[0,2],[1,2]], color: "bg-rose-500" },
  // Squares
  { name: "sq2", cells: [[0,0],[0,1],[1,0],[1,1]], color: "bg-purple-500" },
  { name: "sq3", cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], color: "bg-violet-500" },
  // T-shapes
  { name: "T1", cells: [[0,0],[0,1],[0,2],[1,1]], color: "bg-pink-500" },
  { name: "T2", cells: [[0,0],[1,0],[1,1],[2,0]], color: "bg-pink-500" },
  { name: "T3", cells: [[0,1],[1,0],[1,1],[1,2]], color: "bg-fuchsia-500" },
  { name: "T4", cells: [[0,0],[0,1],[1,0],[2,0]], color: "bg-fuchsia-500" },
  // S/Z shapes
  { name: "S1", cells: [[0,1],[0,2],[1,0],[1,1]], color: "bg-yellow-500" },
  { name: "Z1", cells: [[0,0],[0,1],[1,1],[1,2]], color: "bg-lime-500" },
];

const GRID_SIZE = 8;

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0) as Cell[]);
}

function getRandomShapes(count: number): BlockShape[] {
  const result: BlockShape[] = [];
  for (let i = 0; i < count; i++) {
    result.push(ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)]);
  }
  return result;
}

// Normalize shape cells so min row/col is 0
function normalizeShape(cells: number[][]): number[][] {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells.map((c) => [c[0] - minR, c[1] - minC]);
}

function getShapeBounds(cells: number[][]): { rows: number; cols: number } {
  const norm = normalizeShape(cells);
  return {
    rows: Math.max(...norm.map((c) => c[0])) + 1,
    cols: Math.max(...norm.map((c) => c[1])) + 1,
  };
}

function canPlace(grid: Grid, shape: BlockShape, startRow: number, startCol: number): boolean {
  const norm = normalizeShape(shape.cells);
  for (const [r, c] of norm) {
    const gr = startRow + r;
    const gc = startCol + c;
    if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
    if (grid[gr][gc] !== 0) return false;
  }
  return true;
}

function placeShape(grid: Grid, shape: BlockShape, startRow: number, startCol: number): Grid {
  const newGrid = grid.map((row) => [...row]);
  const norm = normalizeShape(shape.cells);
  for (const [r, c] of norm) {
    newGrid[startRow + r][startCol + c] = 1;
  }
  return newGrid;
}

function clearLines(grid: Grid): { newGrid: Grid; cleared: number } {
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((cell) => cell === 1)) rowsToClear.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every((row) => row[c] === 1)) colsToClear.push(c);
  }

  if (rowsToClear.length === 0 && colsToClear.length === 0) {
    return { newGrid: grid, cleared: 0 };
  }

  const newGrid = grid.map((row) => [...row]);
  for (const r of rowsToClear) {
    for (let c = 0; c < GRID_SIZE; c++) newGrid[r][c] = 0;
  }
  for (const c of colsToClear) {
    for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = 0;
  }

  return { newGrid, cleared: rowsToClear.length + colsToClear.length };
}

function canPlaceAny(grid: Grid, shapes: (BlockShape | null)[]): boolean {
  for (const shape of shapes) {
    if (!shape) continue;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(grid, shape, r, c)) return true;
      }
    }
  }
  return false;
}

// --- Component ---
export default function BlockBlastPage() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [pieces, setPieces] = useState<(BlockShape | null)[]>(() => getRandomShapes(3));
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("blockblast-highscore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Check game over when pieces change
  useEffect(() => {
    if (!gameOver && pieces.every((p) => p === null)) {
      // All placed, give new pieces
      const newPieces = getRandomShapes(3);
      if (!canPlaceAny(grid, newPieces)) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("blockblast-highscore", String(score));
        }
      } else {
        setPieces(newPieces);
      }
    } else if (!gameOver && !canPlaceAny(grid, pieces)) {
      setGameOver(true);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("blockblast-highscore", String(score));
      }
    }
  }, [pieces, grid, gameOver, score, highScore]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameOver || selectedPiece === null) return;
      const shape = pieces[selectedPiece];
      if (!shape) return;

      if (!canPlace(grid, shape, row, col)) return;

      const placed = placeShape(grid, shape, row, col);

      // Check for line clears
      const { newGrid, cleared } = clearLines(placed);

      // Score: base points for placing + bonus for clears
      const norm = normalizeShape(shape.cells);
      let earnedPoints = norm.length; // 1 point per cell
      let newCombo = 0;

      if (cleared > 0) {
        newCombo = combo + 1;
        // Bonus: 10 per line * combo multiplier
        earnedPoints += cleared * 10 * newCombo;

        // Animate clearing
        const clearSet = new Set<string>();
        // Rows
        for (let r = 0; r < GRID_SIZE; r++) {
          if (placed[r].every((cell) => cell === 1)) {
            for (let c = 0; c < GRID_SIZE; c++) clearSet.add(`${r}-${c}`);
          }
        }
        // Cols
        for (let c = 0; c < GRID_SIZE; c++) {
          if (placed.every((row) => row[c] === 1)) {
            for (let r = 0; r < GRID_SIZE; r++) clearSet.add(`${r}-${c}`);
          }
        }
        setClearingCells(clearSet);
        setTimeout(() => setClearingCells(new Set()), 300);
      } else {
        newCombo = 0;
      }

      setGrid(newGrid);
      setScore((prev) => prev + earnedPoints);
      setCombo(newCombo);

      const newPieces = [...pieces];
      newPieces[selectedPiece] = null;
      setPieces(newPieces);
      setSelectedPiece(null);
      setHoverCell(null);
    },
    [grid, pieces, selectedPiece, gameOver, combo]
  );

  const handleCellHover = useCallback(
    (row: number, col: number) => {
      if (selectedPiece !== null) setHoverCell([row, col]);
    },
    [selectedPiece]
  );

  const getPreviewCells = (): Set<string> => {
    if (selectedPiece === null || hoverCell === null) return new Set();
    const shape = pieces[selectedPiece];
    if (!shape) return new Set();
    const [hr, hc] = hoverCell;
    if (!canPlace(grid, shape, hr, hc)) return new Set();
    const norm = normalizeShape(shape.cells);
    return new Set(norm.map(([r, c]) => `${hr + r}-${hc + c}`));
  };

  const getInvalidPreview = (): boolean => {
    if (selectedPiece === null || hoverCell === null) return false;
    const shape = pieces[selectedPiece];
    if (!shape) return false;
    return !canPlace(grid, shape, hoverCell[0], hoverCell[1]);
  };

  const resetGame = () => {
    setGrid(createEmptyGrid());
    const newPieces = getRandomShapes(3);
    setPieces(newPieces);
    setSelectedPiece(null);
    setHoverCell(null);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setClearingCells(new Set());
  };

  const previewCells = getPreviewCells();
  const invalidPreview = getInvalidPreview();
  const selectedShape = selectedPiece !== null ? pieces[selectedPiece] : null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-indigo-800 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-indigo-300 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Block Blast</span>
            <span className="ml-1">💥</span>
          </span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* Score Bar */}
        <div className="mb-4 flex w-full max-w-md items-center justify-between gap-4">
          <div className="rounded-xl bg-indigo-900/60 px-4 py-2 text-center">
            <p className="text-[10px] font-semibold text-indigo-400">점수</p>
            <p className="text-xl font-black">{score.toLocaleString()}</p>
          </div>
          {combo > 0 && (
            <div className="animate-pulse rounded-xl bg-yellow-600/40 px-4 py-2 text-center">
              <p className="text-[10px] font-semibold text-yellow-300">콤보</p>
              <p className="text-xl font-black text-yellow-300">x{combo}</p>
            </div>
          )}
          <div className="rounded-xl bg-indigo-900/60 px-4 py-2 text-center">
            <p className="text-[10px] font-semibold text-indigo-400">최고 점수</p>
            <p className="text-xl font-black text-amber-400">{highScore.toLocaleString()}</p>
          </div>
        </div>

        {/* Grid */}
        <div
          className="mb-6 grid gap-[2px] rounded-xl bg-indigo-900/40 p-2"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
          onMouseLeave={() => setHoverCell(null)}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isPreview = previewCells.has(key);
              const isClearing = clearingCells.has(key);
              const isFilled = cell === 1;

              return (
                <button
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => handleCellHover(r, c)}
                  className={`h-9 w-9 rounded-md border transition-all duration-150 sm:h-11 sm:w-11 ${
                    isClearing
                      ? "scale-110 border-yellow-300 bg-yellow-400"
                      : isFilled
                      ? "border-indigo-400/50 bg-indigo-500 shadow-inner shadow-indigo-400/30"
                      : isPreview
                      ? selectedShape
                        ? `border-white/50 ${selectedShape.color} opacity-60`
                        : "border-white/30 bg-white/20"
                      : invalidPreview && selectedPiece !== null && hoverCell
                      ? "border-slate-700 bg-slate-800/60"
                      : "border-slate-700 bg-slate-800/40 hover:bg-slate-700/40"
                  }`}
                />
              );
            })
          )}
        </div>

        {/* Pieces Tray */}
        <div className="flex items-start justify-center gap-4">
          {pieces.map((piece, idx) => {
            if (!piece) {
              return (
                <div key={idx} className="flex h-24 w-24 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/20">
                  <span className="text-2xl opacity-20">✓</span>
                </div>
              );
            }
            const norm = normalizeShape(piece.cells);
            const bounds = getShapeBounds(piece.cells);
            const isSelected = selectedPiece === idx;

            return (
              <button
                key={idx}
                onClick={() => setSelectedPiece(isSelected ? null : idx)}
                className={`flex items-center justify-center rounded-xl border-2 p-2 transition-all ${
                  isSelected
                    ? "scale-110 border-white bg-white/10 shadow-lg shadow-white/10"
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-400 hover:bg-slate-700/50"
                }`}
                style={{ minWidth: 80, minHeight: 80 }}
              >
                <div
                  className="grid gap-[2px]"
                  style={{
                    gridTemplateColumns: `repeat(${bounds.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${bounds.rows}, 1fr)`,
                  }}
                >
                  {Array.from({ length: bounds.rows }).map((_, r) =>
                    Array.from({ length: bounds.cols }).map((_, c) => {
                      const has = norm.some(([nr, nc]) => nr === r && nc === c);
                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`h-4 w-4 rounded-sm sm:h-5 sm:w-5 ${has ? piece.color : "bg-transparent"}`}
                        />
                      );
                    })
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Instructions */}
        <p className="mt-4 text-center text-xs text-indigo-400">
          {selectedPiece !== null
            ? "보드 위에 클릭해서 블록을 배치하세요!"
            : "아래에서 블록을 선택하세요!"}
        </p>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="mx-4 w-full max-w-sm rounded-3xl bg-slate-900 p-8 text-center shadow-2xl">
              <span className="mb-4 block text-6xl">💥</span>
              <h2 className="mb-2 text-3xl font-black">게임 오버!</h2>
              <p className="mb-1 text-lg text-indigo-300">점수: <span className="font-bold text-white">{score.toLocaleString()}</span></p>
              {score >= highScore && score > 0 && (
                <p className="mb-4 text-sm font-bold text-yellow-400">🏆 새로운 최고 기록!</p>
              )}
              <p className="mb-6 text-sm text-indigo-400">최고 점수: {highScore.toLocaleString()}</p>
              <button
                onClick={resetGame}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
              >
                다시 하기! 🔥
              </button>
              <div className="mt-4">
                <Link href="/" className="text-sm text-indigo-400 underline transition-colors hover:text-white">
                  홈으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
