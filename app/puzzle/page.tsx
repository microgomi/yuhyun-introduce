"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// ==============================
// 4가지 퍼즐 게임 모음
// 1. 2048
// 2. 슬라이드 퍼즐 (15퍼즐)
// 3. 매치3 (보석 퍼즐)
// 4. 스도쿠 (간단)
// ==============================

type Screen = "menu" | "game2048" | "slide" | "match3" | "sudoku";

// ===== 2048 =====
type Grid2048 = number[][];

function emptyGrid(): Grid2048 {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandom(grid: Grid2048): Grid2048 {
  const g = grid.map((r) => [...r]);
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return g;
}

function slideRow(row: number[]): { result: number[]; score: number } {
  const filtered = row.filter((v) => v !== 0);
  const result: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < 4) result.push(0);
  return { result, score };
}

function move2048(grid: Grid2048, dir: "up" | "down" | "left" | "right"): { grid: Grid2048; score: number; moved: boolean } {
  let totalScore = 0;
  const g = grid.map((r) => [...r]);
  let moved = false;

  const process = (row: number[]) => {
    const { result, score } = slideRow(row);
    totalScore += score;
    if (row.some((v, i) => v !== result[i])) moved = true;
    return result;
  };

  if (dir === "left") {
    for (let r = 0; r < 4; r++) { const res = process(g[r]); g[r] = res; }
  } else if (dir === "right") {
    for (let r = 0; r < 4; r++) { const res = process([...g[r]].reverse()); g[r] = res.reverse(); }
  } else if (dir === "up") {
    for (let c = 0; c < 4; c++) {
      const col = [g[0][c], g[1][c], g[2][c], g[3][c]];
      const res = process(col);
      for (let r = 0; r < 4; r++) g[r][c] = res[r];
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = [g[3][c], g[2][c], g[1][c], g[0][c]];
      const res = process(col);
      for (let r = 0; r < 4; r++) g[r][c] = res[3 - r];
    }
  }

  return { grid: g, score: totalScore, moved };
}

function canMove(grid: Grid2048): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (grid[r][c] === 0) return true;
    if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
    if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
  }
  return false;
}

function tileColor(v: number): string {
  const colors: Record<number, string> = {
    0: "bg-zinc-200 dark:bg-zinc-700",
    2: "bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100",
    4: "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100",
    8: "bg-orange-300 dark:bg-orange-700 text-white",
    16: "bg-orange-400 dark:bg-orange-600 text-white",
    32: "bg-red-400 dark:bg-red-600 text-white",
    64: "bg-red-500 dark:bg-red-500 text-white",
    128: "bg-yellow-400 dark:bg-yellow-600 text-white",
    256: "bg-yellow-500 dark:bg-yellow-500 text-white",
    512: "bg-green-400 dark:bg-green-600 text-white",
    1024: "bg-blue-400 dark:bg-blue-600 text-white",
    2048: "bg-purple-500 dark:bg-purple-500 text-white",
  };
  return colors[v] ?? "bg-pink-500 text-white";
}

// ===== SLIDE PUZZLE (15) =====
function createSlidePuzzle(size: number): number[] {
  const tiles: number[] = [];
  for (let i = 1; i < size * size; i++) tiles.push(i);
  tiles.push(0);
  // Shuffle with valid moves
  let blank = size * size - 1;
  for (let i = 0; i < 200; i++) {
    const moves: number[] = [];
    const r = Math.floor(blank / size);
    const c = blank % size;
    if (r > 0) moves.push(blank - size);
    if (r < size - 1) moves.push(blank + size);
    if (c > 0) moves.push(blank - 1);
    if (c < size - 1) moves.push(blank + 1);
    const pick = moves[Math.floor(Math.random() * moves.length)];
    [tiles[blank], tiles[pick]] = [tiles[pick], tiles[blank]];
    blank = pick;
  }
  return tiles;
}

function isSlideSolved(tiles: number[], size: number): boolean {
  for (let i = 0; i < size * size - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[size * size - 1] === 0;
}

// ===== MATCH 3 =====
const GEMS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
const M3_SIZE = 8;

function createMatch3Board(): string[][] {
  let board: string[][];
  do {
    board = Array.from({ length: M3_SIZE }, () =>
      Array.from({ length: M3_SIZE }, () => GEMS[Math.floor(Math.random() * GEMS.length)])
    );
  } while (findMatches(board).length > 0);
  return board;
}

function findMatches(board: string[][]): [number, number][] {
  const matched = new Set<string>();

  // Horizontal
  for (let r = 0; r < M3_SIZE; r++) {
    for (let c = 0; c < M3_SIZE - 2; c++) {
      if (board[r][c] && board[r][c] === board[r][c + 1] && board[r][c] === board[r][c + 2]) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r},${c + 2}`);
      }
    }
  }
  // Vertical
  for (let r = 0; r < M3_SIZE - 2; r++) {
    for (let c = 0; c < M3_SIZE; c++) {
      if (board[r][c] && board[r][c] === board[r + 1][c] && board[r][c] === board[r + 2][c]) {
        matched.add(`${r},${c}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 2},${c}`);
      }
    }
  }

  return Array.from(matched).map((s) => {
    const [r, c] = s.split(",").map(Number);
    return [r, c] as [number, number];
  });
}

function applyGravity(board: string[][]): string[][] {
  const b = board.map((r) => [...r]);
  for (let c = 0; c < M3_SIZE; c++) {
    let writeIdx = M3_SIZE - 1;
    for (let r = M3_SIZE - 1; r >= 0; r--) {
      if (b[r][c] !== "") {
        b[writeIdx][c] = b[r][c];
        if (writeIdx !== r) b[r][c] = "";
        writeIdx--;
      }
    }
    for (let r = writeIdx; r >= 0; r--) {
      b[r][c] = GEMS[Math.floor(Math.random() * GEMS.length)];
    }
  }
  return b;
}

function processBoard(board: string[][]): { board: string[][]; score: number } {
  let b = board.map((r) => [...r]);
  let totalScore = 0;
  let matches = findMatches(b);
  while (matches.length > 0) {
    totalScore += matches.length * 10;
    for (const [r, c] of matches) b[r][c] = "";
    b = applyGravity(b);
    matches = findMatches(b);
  }
  return { board: b, score: totalScore };
}

// ===== SUDOKU =====
function generateSudoku(): { puzzle: number[][]; solution: number[][] } {
  // Start with a valid solved board and remove cells
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(b: number[][], r: number, c: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (b[r][i] === num || b[i][c] === num) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) {
      if (b[i][j] === num) return false;
    }
    return true;
  }

  function solve(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const n of nums) {
            if (isValid(b, r, c, n)) {
              b[r][c] = n;
              if (solve(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve(board);
  const solution = board.map((r) => [...r]);
  const puzzle = board.map((r) => [...r]);

  // Remove cells (easy: 35 clues remaining)
  let removed = 0;
  const target = 46; // remove 46 out of 81
  while (removed < target) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }

  return { puzzle, solution };
}

// ===== MAIN COMPONENT =====
export default function PuzzlePage() {
  const [screen, setScreen] = useState<Screen>("menu");

  // 2048 state
  const [grid2048, setGrid2048] = useState<Grid2048>(emptyGrid());
  const [score2048, setScore2048] = useState(0);
  const [best2048, setBest2048] = useState(0);
  const [gameOver2048, setGameOver2048] = useState(false);

  // Slide state
  const [slideTiles, setSlideTiles] = useState<number[]>([]);
  const [slideSize, setSlideSize] = useState(4);
  const [slideMoves, setSlideMoves] = useState(0);
  const [slideSolved, setSlideSolved] = useState(false);
  const [slideTime, setSlideTime] = useState(0);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Match3 state
  const [m3Board, setM3Board] = useState<string[][]>([]);
  const [m3Score, setM3Score] = useState(0);
  const [m3Selected, setM3Selected] = useState<[number, number] | null>(null);
  const [m3Moves, setM3Moves] = useState(30);
  const [m3Best, setM3Best] = useState(0);

  // Sudoku state
  const [sudokuPuzzle, setSudokuPuzzle] = useState<number[][]>([]);
  const [sudokuBoard, setSudokuBoard] = useState<number[][]>([]);
  const [sudokuSolution, setSudokuSolution] = useState<number[][]>([]);
  const [sudokuSelected, setSudokuSelected] = useState<[number, number] | null>(null);
  const [sudokuFixed, setSudokuFixed] = useState<boolean[][]>([]);
  const [sudokuComplete, setSudokuComplete] = useState(false);

  // ===== 2048 =====
  const start2048 = useCallback(() => {
    let g = emptyGrid();
    g = addRandom(g);
    g = addRandom(g);
    setGrid2048(g);
    setScore2048(0);
    setGameOver2048(false);
    setScreen("game2048");
  }, []);

  const handle2048 = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (gameOver2048) return;
    const { grid, score, moved } = move2048(grid2048, dir);
    if (!moved) return;
    const newGrid = addRandom(grid);
    setGrid2048(newGrid);
    setScore2048((s) => {
      const next = s + score;
      if (next > best2048) setBest2048(next);
      return next;
    });
    if (!canMove(newGrid)) setGameOver2048(true);
  }, [grid2048, gameOver2048, best2048]);

  useEffect(() => {
    if (screen !== "game2048") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") handle2048("up");
      else if (e.key === "ArrowDown") handle2048("down");
      else if (e.key === "ArrowLeft") handle2048("left");
      else if (e.key === "ArrowRight") handle2048("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, handle2048]);

  // 2048 swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) { handle2048(dx > 0 ? "right" : "left"); }
    else { handle2048(dy > 0 ? "down" : "up"); }
    touchStart.current = null;
  };

  // ===== SLIDE =====
  const startSlide = useCallback((size: number) => {
    setSlideSize(size);
    setSlideTiles(createSlidePuzzle(size));
    setSlideMoves(0);
    setSlideSolved(false);
    setSlideTime(0);
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => setSlideTime((t) => t + 1), 1000);
    setScreen("slide");
  }, []);

  const slideClick = useCallback((idx: number) => {
    if (slideSolved) return;
    const blank = slideTiles.indexOf(0);
    const r1 = Math.floor(idx / slideSize), c1 = idx % slideSize;
    const r2 = Math.floor(blank / slideSize), c2 = blank % slideSize;
    if ((Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2)) {
      const newTiles = [...slideTiles];
      [newTiles[idx], newTiles[blank]] = [newTiles[blank], newTiles[idx]];
      setSlideTiles(newTiles);
      setSlideMoves((m) => m + 1);
      if (isSlideSolved(newTiles, slideSize)) {
        setSlideSolved(true);
        if (slideTimerRef.current) clearInterval(slideTimerRef.current);
      }
    }
  }, [slideTiles, slideSize, slideSolved]);

  useEffect(() => { return () => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); }; }, []);

  // ===== MATCH3 =====
  const startMatch3 = useCallback(() => {
    setM3Board(createMatch3Board());
    setM3Score(0);
    setM3Moves(30);
    setM3Selected(null);
    setScreen("match3");
  }, []);

  const m3Click = useCallback((r: number, c: number) => {
    if (m3Moves <= 0) return;
    if (!m3Selected) {
      setM3Selected([r, c]);
      return;
    }
    const [sr, sc] = m3Selected;
    const dist = Math.abs(sr - r) + Math.abs(sc - c);
    if (dist !== 1) {
      setM3Selected([r, c]);
      return;
    }
    // Swap
    const b = m3Board.map((row) => [...row]);
    [b[sr][sc], b[r][c]] = [b[r][c], b[sr][sc]];
    const matches = findMatches(b);
    if (matches.length === 0) {
      setM3Selected(null);
      return;
    }
    const { board: newBoard, score } = processBoard(b);
    setM3Board(newBoard);
    setM3Score((s) => {
      const next = s + score;
      if (next > m3Best) setM3Best(next);
      return next;
    });
    setM3Moves((m) => m - 1);
    setM3Selected(null);
  }, [m3Selected, m3Board, m3Moves, m3Best]);

  // ===== SUDOKU =====
  const startSudoku = useCallback(() => {
    const { puzzle, solution } = generateSudoku();
    setSudokuPuzzle(puzzle.map((r) => [...r]));
    setSudokuBoard(puzzle.map((r) => [...r]));
    setSudokuSolution(solution);
    setSudokuFixed(puzzle.map((r) => r.map((v) => v !== 0)));
    setSudokuSelected(null);
    setSudokuComplete(false);
    setScreen("sudoku");
  }, []);

  const sudokuInput = useCallback((num: number) => {
    if (!sudokuSelected || sudokuComplete) return;
    const [r, c] = sudokuSelected;
    if (sudokuFixed[r][c]) return;
    const b = sudokuBoard.map((row) => [...row]);
    b[r][c] = num;
    setSudokuBoard(b);
    // Check complete
    const complete = b.every((row, ri) => row.every((v, ci) => v === sudokuSolution[ri][ci]));
    if (complete) setSudokuComplete(true);
  }, [sudokuSelected, sudokuBoard, sudokuFixed, sudokuSolution, sudokuComplete]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-black/10 dark:bg-white/10 px-3 py-1 text-sm hover:bg-black/20">← 홈</Link>
          <div className="text-6xl">🧩</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">퍼즐 게임</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">두뇌를 깨우는 퍼즐 4종!</p>

          <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-sm">
            <button onClick={start2048} className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <span className="text-4xl">🔢</span>
              <p className="mt-2 font-black text-white">2048</p>
              <p className="text-xs text-white/70">숫자를 합쳐라!</p>
              {best2048 > 0 && <p className="text-[10px] text-white/50 mt-1">최고: {best2048}</p>}
            </button>

            <button onClick={() => startSlide(4)} className="rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 p-6 text-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <span className="text-4xl">🔲</span>
              <p className="mt-2 font-black text-white">15퍼즐</p>
              <p className="text-xs text-white/70">순서대로 맞춰라!</p>
            </button>

            <button onClick={startMatch3} className="rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 p-6 text-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <span className="text-4xl">💎</span>
              <p className="mt-2 font-black text-white">매치3</p>
              <p className="text-xs text-white/70">보석을 맞춰라!</p>
              {m3Best > 0 && <p className="text-[10px] text-white/50 mt-1">최고: {m3Best}</p>}
            </button>

            <button onClick={startSudoku} className="rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 p-6 text-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
              <span className="text-4xl">📝</span>
              <p className="mt-2 font-black text-white">스도쿠</p>
              <p className="text-xs text-white/70">논리로 채워라!</p>
            </button>
          </div>
        </div>
      )}

      {/* === 2048 === */}
      {screen === "game2048" && (
        <div className="flex flex-col items-center pt-6 px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="mb-4 flex w-[340px] items-center justify-between">
            <button onClick={() => setScreen("menu")} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800">← 메뉴</button>
            <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">2048</h2>
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">점수: {score2048}</p>
              <p className="text-[10px] text-zinc-400">최고: {best2048}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-300 dark:bg-zinc-700 p-3 shadow-xl">
            <div className="grid grid-cols-4 gap-2">
              {grid2048.flat().map((v, i) => (
                <div key={i} className={`flex h-[75px] w-[75px] items-center justify-center rounded-xl text-2xl font-black transition-all ${tileColor(v)}`}>
                  {v > 0 ? v : ""}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">방향키 또는 스와이프로 이동</p>

          {/* Mobile controls */}
          <div className="mt-3 grid grid-cols-3 gap-2 w-36">
            <div />
            <button onClick={() => handle2048("up")} className="rounded-lg bg-zinc-200 dark:bg-zinc-700 py-2 font-bold text-xl">↑</button>
            <div />
            <button onClick={() => handle2048("left")} className="rounded-lg bg-zinc-200 dark:bg-zinc-700 py-2 font-bold text-xl">←</button>
            <button onClick={() => handle2048("down")} className="rounded-lg bg-zinc-200 dark:bg-zinc-700 py-2 font-bold text-xl">↓</button>
            <button onClick={() => handle2048("right")} className="rounded-lg bg-zinc-200 dark:bg-zinc-700 py-2 font-bold text-xl">→</button>
          </div>

          {gameOver2048 && (
            <div className="mt-4 text-center">
              <p className="text-xl font-black text-red-500">게임 오버!</p>
              <button onClick={start2048} className="mt-2 rounded-xl bg-amber-500 px-6 py-2 font-bold text-white">🔄 다시하기</button>
            </div>
          )}
        </div>
      )}

      {/* === SLIDE PUZZLE === */}
      {screen === "slide" && (
        <div className="flex flex-col items-center pt-6 px-4">
          <div className="mb-4 flex w-[340px] items-center justify-between">
            <button onClick={() => { if (slideTimerRef.current) clearInterval(slideTimerRef.current); setScreen("menu"); }} className="text-sm text-zinc-500 hover:text-zinc-800">← 메뉴</button>
            <h2 className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{slideSize * slideSize - 1}퍼즐</h2>
            <div className="text-right text-sm">
              <p className="font-bold text-zinc-700 dark:text-zinc-300">🔢 {slideMoves}</p>
              <p className="text-zinc-400">⏱️ {Math.floor(slideTime / 60)}:{(slideTime % 60).toString().padStart(2, "0")}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-300 dark:bg-zinc-700 p-3 shadow-xl">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${slideSize}, 1fr)` }}>
              {slideTiles.map((v, i) => (
                <button
                  key={i}
                  onClick={() => slideClick(i)}
                  className={`flex items-center justify-center rounded-xl text-xl font-black transition-all ${
                    v === 0
                      ? "bg-transparent"
                      : "bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-md hover:scale-105 active:scale-95"
                  }`}
                  style={{ width: 75, height: 75 }}
                >
                  {v > 0 ? v : ""}
                </button>
              ))}
            </div>
          </div>

          {slideSolved && (
            <div className="mt-4 text-center">
              <p className="text-xl font-black text-green-500">🎉 완성!</p>
              <p className="text-sm text-zinc-500">{slideMoves}번 이동, {Math.floor(slideTime / 60)}분 {slideTime % 60}초</p>
              <button onClick={() => startSlide(slideSize)} className="mt-2 rounded-xl bg-cyan-500 px-6 py-2 font-bold text-white">🔄 다시하기</button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={() => startSlide(3)} className={`rounded-lg px-4 py-2 text-sm font-bold ${slideSize === 3 ? "bg-cyan-500 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}>3x3</button>
            <button onClick={() => startSlide(4)} className={`rounded-lg px-4 py-2 text-sm font-bold ${slideSize === 4 ? "bg-cyan-500 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}>4x4</button>
            <button onClick={() => startSlide(5)} className={`rounded-lg px-4 py-2 text-sm font-bold ${slideSize === 5 ? "bg-cyan-500 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}>5x5</button>
          </div>
        </div>
      )}

      {/* === MATCH 3 === */}
      {screen === "match3" && (
        <div className="flex flex-col items-center pt-6 px-4">
          <div className="mb-4 flex w-[340px] items-center justify-between">
            <button onClick={() => setScreen("menu")} className="text-sm text-zinc-500 hover:text-zinc-800">← 메뉴</button>
            <h2 className="text-2xl font-black text-pink-600 dark:text-pink-400">💎 매치3</h2>
            <div className="text-right text-sm">
              <p className="font-bold text-zinc-700 dark:text-zinc-300">⭐ {m3Score}</p>
              <p className="text-zinc-400">남은 턴: {m3Moves}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-300 dark:bg-zinc-700 p-2 shadow-xl">
            <div className="grid grid-cols-8 gap-0.5">
              {m3Board.flat().map((gem, i) => {
                const r = Math.floor(i / M3_SIZE);
                const c = i % M3_SIZE;
                const selected = m3Selected && m3Selected[0] === r && m3Selected[1] === c;
                return (
                  <button
                    key={i}
                    onClick={() => m3Click(r, c)}
                    className={`flex h-[40px] w-[40px] items-center justify-center rounded-lg text-xl transition-all ${
                      selected ? "bg-white dark:bg-zinc-500 scale-110 ring-2 ring-pink-400" : "bg-zinc-100 dark:bg-zinc-600 hover:scale-105"
                    }`}
                  >
                    {gem}
                  </button>
                );
              })}
            </div>
          </div>

          {m3Moves <= 0 && (
            <div className="mt-4 text-center">
              <p className="text-xl font-black text-pink-500">게임 종료!</p>
              <p className="text-sm text-zinc-500">점수: {m3Score}</p>
              <button onClick={startMatch3} className="mt-2 rounded-xl bg-pink-500 px-6 py-2 font-bold text-white">🔄 다시하기</button>
            </div>
          )}
        </div>
      )}

      {/* === SUDOKU === */}
      {screen === "sudoku" && (
        <div className="flex flex-col items-center pt-6 px-4">
          <div className="mb-4 flex w-[340px] items-center justify-between">
            <button onClick={() => setScreen("menu")} className="text-sm text-zinc-500 hover:text-zinc-800">← 메뉴</button>
            <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">📝 스도쿠</h2>
            <div />
          </div>

          <div className="rounded-2xl bg-zinc-200 dark:bg-zinc-700 p-2 shadow-xl">
            <div className="grid grid-cols-9">
              {sudokuBoard.flat().map((v, i) => {
                const r = Math.floor(i / 9);
                const c = i % 9;
                const isFixed = sudokuFixed[r]?.[c];
                const isSelected = sudokuSelected && sudokuSelected[0] === r && sudokuSelected[1] === c;
                const isWrong = v !== 0 && v !== sudokuSolution[r]?.[c];
                const borderR = c === 2 || c === 5 ? "border-r-2 border-r-zinc-500" : "";
                const borderB = r === 2 || r === 5 ? "border-b-2 border-b-zinc-500" : "";
                return (
                  <button
                    key={i}
                    onClick={() => !isFixed && setSudokuSelected([r, c])}
                    className={`flex h-[36px] w-[36px] items-center justify-center border border-zinc-300 dark:border-zinc-600 text-sm font-bold transition-all ${borderR} ${borderB} ${
                      isSelected ? "bg-emerald-200 dark:bg-emerald-800" : isFixed ? "bg-zinc-100 dark:bg-zinc-600" : "bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900"
                    } ${isFixed ? "text-zinc-800 dark:text-zinc-200" : isWrong ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {v > 0 ? v : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number pad */}
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => sudokuInput(n)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-400 active:scale-90 transition-all">
                {n}
              </button>
            ))}
            <button onClick={() => sudokuInput(0)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white font-bold hover:bg-red-400 active:scale-90 transition-all">
              ✕
            </button>
          </div>

          {sudokuComplete && (
            <div className="mt-4 text-center">
              <p className="text-xl font-black text-green-500">🎉 완성!</p>
              <button onClick={startSudoku} className="mt-2 rounded-xl bg-emerald-500 px-6 py-2 font-bold text-white">🔄 새 문제</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
