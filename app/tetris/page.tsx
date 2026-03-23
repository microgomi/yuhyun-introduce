"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// --- Constants ---
const COLS = 10;
const ROWS = 20;
const EMPTY = 0;

// Tetromino shapes and colors
const TETROMINOES: Record<string, { shape: number[][]; color: string; border: string; shadow: string }> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "#00f0f0",
    border: "#00cccc",
    shadow: "#009999",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#f0f000",
    border: "#cccc00",
    shadow: "#999900",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#a000f0",
    border: "#8800cc",
    shadow: "#660099",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "#00f000",
    border: "#00cc00",
    shadow: "#009900",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "#f00000",
    border: "#cc0000",
    shadow: "#990000",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#0000f0",
    border: "#0000cc",
    shadow: "#000099",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#f0a000",
    border: "#cc8800",
    shadow: "#996600",
  },
};

const PIECE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"];

type Cell = { filled: boolean; color: string; border: string; shadow: string } | null;
type Board = Cell[][];

interface Piece {
  name: string;
  shape: number[][];
  color: string;
  border: string;
  shadow: string;
  x: number;
  y: number;
}

// Scoring
const LINE_SCORES = [0, 100, 300, 500, 800];

// Speed per level (ms) - decreases as level increases
function getSpeed(level: number): number {
  return Math.max(50, 800 - (level - 1) * 70);
}

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece(): Piece {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
  const t = TETROMINOES[name];
  return {
    name,
    shape: t.shape.map((r) => [...r]),
    color: t.color,
    border: t.border,
    shadow: t.shadow,
    x: Math.floor((COLS - t.shape[0].length) / 2),
    y: 0,
  };
}

function rotateCW(shape: number[][]): number[][] {
  const n = shape.length;
  const m = shape[0].length;
  const rotated: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      rotated[c][n - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function isValid(board: Board, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const nx = x + c;
        const ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny < 0) continue;
        if (board[ny][nx]) return false;
      }
    }
  }
  return true;
}

function getGhostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (isValid(board, piece.shape, piece.x, gy + 1)) {
    gy++;
  }
  return gy;
}

function placePiece(board: Board, piece: Piece): Board {
  const newBoard = board.map((r) => r.map((c) => (c ? { ...c } : null)));
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          newBoard[ny][nx] = { filled: true, color: piece.color, border: piece.border, shadow: piece.shadow };
        }
      }
    }
  }
  return newBoard;
}

function clearLines(board: Board): { newBoard: Board; cleared: number; clearedRows: number[] } {
  const clearedRows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((c) => c !== null)) {
      clearedRows.push(r);
    }
  }
  if (clearedRows.length === 0) return { newBoard: board, cleared: 0, clearedRows: [] };

  const newBoard = board.filter((_, i) => !clearedRows.includes(i));
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(null));
  }
  return { newBoard, cleared: clearedRows.length, clearedRows };
}

// --- Wall kick data (SRS simplified) ---
function tryRotate(board: Board, piece: Piece): Piece | null {
  const newShape = rotateCW(piece.shape);
  const kicks = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-2, 0],
    [2, 0],
  ];
  for (const [dx, dy] of kicks) {
    if (isValid(board, newShape, piece.x + dx, piece.y + dy)) {
      return { ...piece, shape: newShape, x: piece.x + dx, y: piece.y + dy };
    }
  }
  return null;
}

// --- Component ---
export default function TetrisPage() {
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [current, setCurrent] = useState<Piece | null>(null);
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [flashRows, setFlashRows] = useState<number[]>([]);

  // Refs to avoid stale closures
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const nextPiecesRef = useRef(nextPieces);
  const holdPieceRef = useRef(holdPiece);
  const canHoldRef = useRef(canHold);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const gameOverRef = useRef(gameOver);
  const pausedRef = useRef(paused);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync refs
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { nextPiecesRef.current = nextPieces; }, [nextPieces]);
  useEffect(() => { holdPieceRef.current = holdPiece; }, [holdPiece]);
  useEffect(() => { canHoldRef.current = canHold; }, [canHold]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Load best score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tetris_best");
      if (saved) setBestScore(parseInt(saved, 10));
    } catch {}
  }, []);

  const saveBest = useCallback((s: number) => {
    try {
      const prev = parseInt(localStorage.getItem("tetris_best") || "0", 10);
      if (s > prev) {
        localStorage.setItem("tetris_best", String(s));
        setBestScore(s);
      }
    } catch {}
  }, []);

  // Spawn next piece
  const spawnPiece = useCallback((): { piece: Piece; next: Piece[] } => {
    let nxt = [...nextPiecesRef.current];
    while (nxt.length < 4) nxt.push(randomPiece());
    const piece = nxt.shift()!;
    // Reset position for spawned piece
    const t = TETROMINOES[piece.name];
    piece.x = Math.floor((COLS - t.shape[0].length) / 2);
    piece.y = 0;
    piece.shape = t.shape.map((r) => [...r]);
    return { piece, next: nxt };
  }, []);

  // Lock piece and process clears
  const lockPiece = useCallback(() => {
    const b = boardRef.current;
    const cur = currentRef.current;
    if (!cur) return;

    const placed = placePiece(b, cur);
    const { newBoard, cleared, clearedRows } = clearLines(placed);

    if (clearedRows.length > 0) {
      // Flash effect
      setFlashRows(clearedRows);
      // After brief flash, update board
      setTimeout(() => {
        setFlashRows([]);
        setBoard(newBoard);
      }, 200);
      setBoard(placed); // show placed board with flash
    } else {
      setBoard(newBoard);
    }

    const newScore = scoreRef.current + LINE_SCORES[cleared];
    const newLines = linesRef.current + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    setScore(newScore);
    setLines(newLines);
    setLevel(newLevel);
    setCanHold(true);

    // Spawn next
    const { piece, next } = spawnPiece();
    setNextPieces(next);

    if (!isValid(newBoard, piece.shape, piece.x, piece.y)) {
      // Game over
      setCurrent(null);
      setGameOver(true);
      saveBest(newScore);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setCurrent(piece);
    }
  }, [spawnPiece, saveBest]);

  // Move piece down (gravity tick)
  const tick = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    const b = boardRef.current;

    if (isValid(b, cur.shape, cur.x, cur.y + 1)) {
      setCurrent({ ...cur, y: cur.y + 1 });
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  // Start / restart game timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      tick();
    }, getSpeed(levelRef.current));
  }, [tick]);

  // Restart timer when level changes
  useEffect(() => {
    if (started && !gameOver && !paused) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [level, started, gameOver, paused, startTimer]);

  // Start game
  const startGame = useCallback(() => {
    const newBoard = createEmptyBoard();
    setBoard(newBoard);
    boardRef.current = newBoard;
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
    setHoldPiece(null);
    setCanHold(true);
    setFlashRows([]);

    const initial: Piece[] = [];
    for (let i = 0; i < 4; i++) initial.push(randomPiece());
    nextPiecesRef.current = initial;

    const { piece, next } = spawnPiece();
    setCurrent(piece);
    setNextPieces(next);
    setStarted(true);
  }, [spawnPiece]);

  // Input handling
  const moveLeft = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    if (isValid(boardRef.current, cur.shape, cur.x - 1, cur.y)) {
      setCurrent({ ...cur, x: cur.x - 1 });
    }
  }, []);

  const moveRight = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    if (isValid(boardRef.current, cur.shape, cur.x + 1, cur.y)) {
      setCurrent({ ...cur, x: cur.x + 1 });
    }
  }, []);

  const rotate = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    const rotated = tryRotate(boardRef.current, cur);
    if (rotated) setCurrent(rotated);
  }, []);

  const softDrop = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    if (isValid(boardRef.current, cur.shape, cur.x, cur.y + 1)) {
      setCurrent({ ...cur, y: cur.y + 1 });
      setScore((s) => s + 1);
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;
    const gy = getGhostY(boardRef.current, cur);
    const dropDist = gy - cur.y;
    setScore((s) => s + dropDist * 2);
    setCurrent({ ...cur, y: gy });
    // Lock immediately after state update
    setTimeout(() => {
      lockPiece();
    }, 0);
  }, [lockPiece]);

  const doHold = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    if (!canHoldRef.current) return;
    const cur = currentRef.current;
    if (!cur) return;

    const held = holdPieceRef.current;
    const t = TETROMINOES[cur.name];
    const storedPiece: Piece = {
      name: cur.name,
      shape: t.shape.map((r) => [...r]),
      color: t.color,
      border: t.border,
      shadow: t.shadow,
      x: 0,
      y: 0,
    };

    if (held) {
      const rt = TETROMINOES[held.name];
      const restored: Piece = {
        name: held.name,
        shape: rt.shape.map((r) => [...r]),
        color: rt.color,
        border: rt.border,
        shadow: rt.shadow,
        x: Math.floor((COLS - rt.shape[0].length) / 2),
        y: 0,
      };
      setCurrent(restored);
    } else {
      const { piece, next } = spawnPiece();
      setCurrent(piece);
      setNextPieces(next);
    }
    setHoldPiece(storedPiece);
    setCanHold(false);
  }, [spawnPiece]);

  const togglePause = useCallback(() => {
    if (gameOverRef.current || !started) return;
    setPaused((p) => !p);
  }, [started]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          moveLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          moveRight();
          break;
        case "ArrowUp":
          e.preventDefault();
          rotate();
          break;
        case "ArrowDown":
          e.preventDefault();
          softDrop();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
        case "c":
        case "C":
          e.preventDefault();
          doHold();
          break;
        case "p":
        case "P":
        case "Escape":
          e.preventDefault();
          togglePause();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, moveLeft, moveRight, rotate, softDrop, hardDrop, doHold, togglePause]);

  // Render board with current piece and ghost
  const renderBoard = useCallback((): Cell[][] => {
    const display = board.map((r) => r.map((c) => (c ? { ...c } : null)));

    if (current && !gameOver) {
      // Ghost piece
      const gy = getGhostY(board, current);
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            const ny = gy + r;
            const nx = current.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && !display[ny][nx]) {
              display[ny][nx] = {
                filled: false,
                color: current.color + "40",
                border: current.border + "30",
                shadow: "transparent",
              };
            }
          }
        }
      }

      // Current piece
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            const ny = current.y + r;
            const nx = current.x + c;
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
              display[ny][nx] = { filled: true, color: current.color, border: current.border, shadow: current.shadow };
            }
          }
        }
      }
    }
    return display;
  }, [board, current, gameOver]);

  // Mini piece preview
  const renderMiniPiece = (piece: Piece | null, size: number = 16) => {
    if (!piece) {
      return (
        <div className="w-16 h-16 flex items-center justify-center text-gray-600 text-xs">
          비어있음
        </div>
      );
    }
    const t = TETROMINOES[piece.name];
    const shape = t.shape;
    return (
      <div className="flex flex-col items-center justify-center p-1">
        {shape.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  width: size,
                  height: size,
                  background: cell ? t.color : "transparent",
                  borderTop: cell ? `1px solid ${t.color}cc` : "none",
                  borderLeft: cell ? `1px solid ${t.color}cc` : "none",
                  borderRight: cell ? `1px solid ${t.shadow}` : "none",
                  borderBottom: cell ? `1px solid ${t.shadow}` : "none",
                  borderRadius: cell ? 2 : 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const displayBoard = renderBoard();

  const CELL_SIZE = 28;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950 to-gray-950 text-white flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl px-4 pt-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm flex items-center gap-1"
        >
          ← 홈으로
        </Link>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
          테트리스
        </h1>
        <div className="w-16" />
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 mt-4 px-2">
        {/* Left panel - Hold & Info */}
        <div className="flex flex-col gap-3 w-24">
          {/* Hold */}
          <div className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2">
            <div className="text-xs text-indigo-400 text-center mb-1 font-semibold">홀드 (C)</div>
            <div className="flex justify-center min-h-[64px] items-center">
              {renderMiniPiece(holdPiece)}
            </div>
          </div>

          {/* Score */}
          <div className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2 text-center">
            <div className="text-xs text-indigo-400 font-semibold">점수</div>
            <div className="text-lg font-bold text-cyan-300 font-mono">{score.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2 text-center">
            <div className="text-xs text-indigo-400 font-semibold">레벨</div>
            <div className="text-lg font-bold text-purple-300 font-mono">{level}</div>
          </div>
          <div className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2 text-center">
            <div className="text-xs text-indigo-400 font-semibold">줄</div>
            <div className="text-lg font-bold text-green-300 font-mono">{lines}</div>
          </div>
          <div className="bg-gray-900/80 border border-yellow-500/30 rounded-lg p-2 text-center">
            <div className="text-xs text-yellow-400 font-semibold">최고점수</div>
            <div className="text-sm font-bold text-yellow-300 font-mono">{bestScore.toLocaleString()}</div>
          </div>
        </div>

        {/* Board */}
        <div className="relative">
          <div
            className="border-2 border-indigo-500/50 rounded-md overflow-hidden"
            style={{
              width: COLS * CELL_SIZE,
              height: ROWS * CELL_SIZE,
              background: "#0a0a1a",
              boxShadow: "0 0 30px rgba(99,102,241,0.2), inset 0 0 30px rgba(0,0,0,0.5)",
            }}
          >
            {displayBoard.map((row, ri) => (
              <div key={ri} className="flex" style={{ height: CELL_SIZE }}>
                {row.map((cell, ci) => {
                  const isFlashing = flashRows.includes(ri);
                  return (
                    <div
                      key={ci}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: isFlashing
                          ? "rgba(255,255,255,0.8)"
                          : cell
                          ? cell.color
                          : "transparent",
                        borderTop: cell?.filled
                          ? `2px solid ${cell.color}dd`
                          : "1px solid rgba(99,102,241,0.06)",
                        borderLeft: cell?.filled
                          ? `2px solid ${cell.color}dd`
                          : "1px solid rgba(99,102,241,0.06)",
                        borderRight: cell?.filled
                          ? `2px solid ${cell.shadow}`
                          : "none",
                        borderBottom: cell?.filled
                          ? `2px solid ${cell.shadow}`
                          : "none",
                        borderRadius: cell?.filled ? 3 : 0,
                        boxShadow: cell?.filled
                          ? `inset 0 -2px 4px ${cell.shadow}88, inset 0 2px 4px rgba(255,255,255,0.15)`
                          : "none",
                        opacity: cell && !cell.filled ? 0.5 : 1,
                        transition: isFlashing ? "background 0.1s" : "none",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Overlays */}
          {!started && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
              <div className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                테트리스
              </div>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-lg transition-colors"
              >
                게임 시작
              </button>
              <div className="mt-4 text-xs text-gray-400 text-center leading-relaxed">
                ← → 이동 | ↑ 회전 | ↓ 내리기<br />
                Space 즉시 내리기 | C 홀드 | P 일시정지
              </div>
            </div>
          )}

          {paused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
              <div className="text-2xl font-bold mb-4 text-yellow-400">일시정지</div>
              <button
                onClick={togglePause}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
              >
                계속하기
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md">
              <div className="text-2xl font-bold mb-2 text-red-400">게임 오버</div>
              <div className="text-lg mb-1 text-cyan-300">점수: {score.toLocaleString()}</div>
              <div className="text-sm mb-4 text-gray-400">레벨 {level} | {lines}줄</div>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
              >
                다시 시작
              </button>
            </div>
          )}
        </div>

        {/* Right panel - Next pieces */}
        <div className="flex flex-col gap-3 w-24">
          <div className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2">
            <div className="text-xs text-indigo-400 text-center mb-1 font-semibold">다음 블록</div>
            <div className="flex flex-col items-center gap-2">
              {nextPieces.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className={`flex justify-center min-h-[48px] items-center ${
                    i === 0 ? "scale-110" : "opacity-60 scale-90"
                  }`}
                >
                  {renderMiniPiece(p, i === 0 ? 14 : 11)}
                </div>
              ))}
              {nextPieces.length === 0 && (
                <>
                  <div className="min-h-[48px]" />
                  <div className="min-h-[48px]" />
                  <div className="min-h-[48px]" />
                </>
              )}
            </div>
          </div>

          {/* Pause button */}
          {started && !gameOver && (
            <button
              onClick={togglePause}
              className="bg-gray-900/80 border border-indigo-500/30 rounded-lg p-2 text-center text-xs text-indigo-400 hover:bg-indigo-900/40 transition-colors font-semibold"
            >
              {paused ? "▶ 계속" : "⏸ 일시정지"}
            </button>
          )}
        </div>
      </div>

      {/* Mobile controls */}
      <div className="mt-4 flex flex-col items-center gap-2 pb-8 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); doHold(); }}
            onClick={doHold}
            className="w-14 h-12 bg-gray-800 border border-purple-500/40 rounded-lg text-purple-300 font-bold text-xs active:bg-purple-900/50 transition-colors select-none"
          >
            홀드
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); rotate(); }}
            onClick={rotate}
            className="w-14 h-14 bg-gray-800 border border-cyan-500/40 rounded-full text-cyan-300 font-bold text-lg active:bg-cyan-900/50 transition-colors select-none"
          >
            ↻
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}
            onClick={hardDrop}
            className="w-14 h-12 bg-gray-800 border border-yellow-500/40 rounded-lg text-yellow-300 font-bold text-xs active:bg-yellow-900/50 transition-colors select-none"
          >
            즉시
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); moveLeft(); }}
            onClick={moveLeft}
            className="w-16 h-14 bg-gray-800 border border-indigo-500/40 rounded-lg text-indigo-300 font-bold text-2xl active:bg-indigo-900/50 transition-colors select-none"
          >
            ←
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); softDrop(); }}
            onClick={softDrop}
            className="w-16 h-14 bg-gray-800 border border-green-500/40 rounded-lg text-green-300 font-bold text-2xl active:bg-green-900/50 transition-colors select-none"
          >
            ↓
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); moveRight(); }}
            onClick={moveRight}
            className="w-16 h-14 bg-gray-800 border border-indigo-500/40 rounded-lg text-indigo-300 font-bold text-2xl active:bg-indigo-900/50 transition-colors select-none"
          >
            →
          </button>
        </div>
      </div>

      {/* Desktop controls hint */}
      <div className="hidden lg:block mt-4 pb-6 text-xs text-gray-500 text-center">
        ← → 이동 | ↑ 회전 | ↓ 소프트드롭 | Space 하드드롭 | C 홀드 | P 일시정지
      </div>
    </div>
  );
}
