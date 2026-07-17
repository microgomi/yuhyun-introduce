"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────
type ItemId = string;
type RoomId = 1 | 2 | 3 | 4 | 5;

interface InventoryItem {
  id: ItemId;
  name: string;
  emoji: string;
  description: string;
}

interface RoomState {
  [key: string]: any;
}

interface GameMessage {
  text: string;
  id: number;
}

// ─── Constants ───────────────────────────────────────────────────
const ROOM_NAMES: Record<RoomId, string> = {
  1: "🏠 평범한 방",
  2: "🧪 실험실",
  3: "🏴‍☠️ 해적선",
  4: "👻 유령의 집",
  5: "🚀 우주 정거장",
};

const ROOM_DIFFICULTY: Record<RoomId, string> = {
  1: "쉬움",
  2: "보통",
  3: "보통",
  4: "어려움",
  5: "어려움",
};

// ─── Confetti Component ──────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    color: ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#00f", "#ff8800"][
      Math.floor(Math.random() * 7)
    ],
    size: 6 + Math.random() * 10,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Modal Wrapper ───────────────────────────────────────────────
function Modal({
  children,
  onClose,
  title,
  bg,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  bg?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
      <div
        className={`relative rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 animate-scaleIn ${bg || "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-2xl hover:scale-110 transition-transform w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Clickable Room Item ─────────────────────────────────────────
function RoomItem({
  emoji,
  label,
  x,
  y,
  size,
  onClick,
  highlight,
  hidden,
  style,
}: {
  emoji: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  onClick: () => void;
  highlight?: boolean;
  hidden?: boolean;
  style?: React.CSSProperties;
}) {
  if (hidden) return null;
  const s = size || 48;
  return (
    <button
      onClick={onClick}
      className={`absolute flex flex-col items-center group transition-all duration-200 hover:scale-110 active:scale-95 ${
        highlight ? "animate-pulse" : ""
      }`}
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", ...style }}
      title={label}
    >
      <span style={{ fontSize: s }} className="drop-shadow-lg select-none">
        {emoji}
      </span>
      <span className="text-xs font-bold bg-black/60 text-white px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-1">
        {label}
      </span>
    </button>
  );
}

// ─── Number Keypad Modal ─────────────────────────────────────────
function NumberKeypad({
  onClose,
  onSubmit,
  title,
  hint,
}: {
  onClose: () => void;
  onSubmit: (code: string) => void;
  title: string;
  hint?: string;
}) {
  const [code, setCode] = useState("");
  return (
    <Modal onClose={onClose} title={title}>
      {hint && <p className="text-sm text-gray-500 mb-3">{hint}</p>}
      <div className="text-center mb-4">
        <div className="inline-flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-14 border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl font-bold bg-gray-50"
            >
              {code[i] || "·"}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((n, i) =>
          n === null ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => {
                if (n === "⌫") setCode((c) => c.slice(0, -1));
                else if (code.length < 4) {
                  const newCode = code + n;
                  setCode(newCode);
                  if (newCode.length === 4) {
                    setTimeout(() => onSubmit(newCode), 300);
                  }
                }
              }}
              className="h-12 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xl font-bold transition-colors"
            >
              {n}
            </button>
          )
        )}
      </div>
    </Modal>
  );
}

// ─── Color Mixing Modal (Room 2) ─────────────────────────────────
function ColorMixing({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const [mixture, setMixture] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const target = "보라색 (purple)";

  const colors: { name: string; color: string; ko: string }[] = [
    { name: "red", color: "#ef4444", ko: "빨강" },
    { name: "blue", color: "#3b82f6", ko: "파랑" },
    { name: "yellow", color: "#eab308", ko: "노랑" },
  ];

  const getMixColor = (arr: string[]): { color: string; ko: string } | null => {
    const s = arr.sort().join("+");
    if (s === "blue+red") return { color: "#8b5cf6", ko: "보라" };
    if (s === "blue+yellow") return { color: "#22c55e", ko: "초록" };
    if (s === "red+yellow") return { color: "#f97316", ko: "주황" };
    return null;
  };

  const addColor = (name: string) => {
    if (mixture.length >= 2) return;
    const next = [...mixture, name];
    setMixture(next);
    if (next.length === 2) {
      const r = getMixColor(next);
      if (r) {
        setResult(r.ko);
        if (r.ko === "보라") setTimeout(onSolve, 1000);
      } else {
        setResult("실패");
      }
    }
  };

  return (
    <Modal onClose={onClose} title="🧪 색 혼합 실험">
      <p className="text-sm text-gray-600 mb-3">
        목표: <strong>{target}</strong>을 만드세요!
      </p>
      <div className="flex gap-3 justify-center mb-4">
        {colors.map((c) => (
          <button
            key={c.name}
            onClick={() => addColor(c.name)}
            className="w-16 h-16 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform border-2 border-white"
            style={{ background: c.color }}
            disabled={mixture.length >= 2}
          >
            <span className="text-white font-bold text-xs">{c.ko}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 mb-3">
        {mixture.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full border"
              style={{
                background: colors.find((c) => c.name === m)?.color,
              }}
            />
            {i === 0 && mixture.length > 0 && <span className="text-xl">+</span>}
          </div>
        ))}
        {mixture.length === 2 && (
          <>
            <span className="text-xl">=</span>
            <div
              className="w-10 h-10 rounded-full border"
              style={{
                background: getMixColor(mixture)?.color || "#999",
              }}
            />
          </>
        )}
      </div>
      {result && (
        <p
          className={`text-center font-bold text-lg ${result === "보라" ? "text-purple-600" : "text-red-500"}`}
        >
          {result === "보라" ? "🎉 보라색 완성!" : `❌ ${result}! 다시 시도하세요`}
        </p>
      )}
      <button
        onClick={() => {
          setMixture([]);
          setResult(null);
        }}
        className="block mx-auto mt-3 px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
      >
        초기화
      </button>
    </Modal>
  );
}

// ─── Maze Puzzle Modal (Room 2) ──────────────────────────────────
function MazePuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: (code: string) => void;
}) {
  const maze = [
    [0, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 0],
  ];

  const [pos, setPos] = useState({ x: 0, y: 0 });

  const move = useCallback(
    (dx: number, dy: number) => {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < 7 && ny >= 0 && ny < 7 && maze[ny][nx] === 0) {
        setPos({ x: nx, y: ny });
        if (nx === 6 && ny === 6) {
          setTimeout(() => onSolve("7294"), 500);
        }
      }
    },
    [pos, onSolve]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") move(0, -1);
      else if (e.key === "ArrowDown") move(0, 1);
      else if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  return (
    <Modal onClose={onClose} title="💻 미로 탈출">
      <p className="text-sm text-gray-600 mb-3">
        방향키로 미로를 탈출하세요! (모바일: 아래 버튼)
      </p>
      <div className="flex justify-center mb-4">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(7, 32px)" }}>
          {maze.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm ${
                  pos.x === x && pos.y === y
                    ? "bg-blue-500 text-white"
                    : x === 6 && y === 6
                      ? "bg-green-400"
                      : cell === 1
                        ? "bg-gray-800"
                        : "bg-gray-100"
                }`}
              >
                {pos.x === x && pos.y === y
                  ? "😊"
                  : x === 6 && y === 6
                    ? "🚪"
                    : ""}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => move(0, -1)} className="w-12 h-10 bg-gray-200 rounded hover:bg-gray-300 text-lg">
          ▲
        </button>
        <div className="flex gap-1">
          <button onClick={() => move(-1, 0)} className="w-12 h-10 bg-gray-200 rounded hover:bg-gray-300 text-lg">
            ◀
          </button>
          <button onClick={() => move(0, 1)} className="w-12 h-10 bg-gray-200 rounded hover:bg-gray-300 text-lg">
            ▼
          </button>
          <button onClick={() => move(1, 0)} className="w-12 h-10 bg-gray-200 rounded hover:bg-gray-300 text-lg">
            ▶
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Slide Puzzle Modal (Room 3) ─────────────────────────────────
function SlidePuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const [tiles, setTiles] = useState<number[]>([]);

  useEffect(() => {
    // Generate solvable puzzle
    const arr = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    setTiles(arr);
  }, []);

  const clickTile = (index: number) => {
    const emptyIdx = tiles.indexOf(0);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const eRow = Math.floor(emptyIdx / 3);
    const eCol = emptyIdx % 3;
    if (
      (Math.abs(row - eRow) === 1 && col === eCol) ||
      (Math.abs(col - eCol) === 1 && row === eRow)
    ) {
      const next = [...tiles];
      [next[index], next[emptyIdx]] = [next[emptyIdx], next[index]];
      setTiles(next);
      if (next.every((v, i) => v === solved[i])) {
        setTimeout(onSolve, 500);
      }
    }
  };

  const tileEmojis = ["", "🏴‍☠️", "⚓", "🗡️", "💰", "🦜", "🧭", "🗺️", "🔑"];

  return (
    <Modal onClose={onClose} title="🧩 슬라이드 퍼즐">
      <p className="text-sm text-gray-600 mb-3">타일을 순서대로 맞추세요!</p>
      <div className="inline-grid grid-cols-3 gap-1 mx-auto" style={{ display: "inline-grid" }}>
        {tiles.map((t, i) => (
          <button
            key={i}
            onClick={() => clickTile(i)}
            className={`w-20 h-20 rounded-lg text-2xl font-bold flex items-center justify-center transition-all ${
              t === 0
                ? "bg-amber-100"
                : "bg-amber-700 text-white hover:bg-amber-600 active:scale-95 shadow-md"
            }`}
          >
            {t !== 0 && (
              <span>
                {tileEmojis[t]}
                <br />
                <span className="text-sm">{t}</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Compass Puzzle Modal (Room 3) ───────────────────────────────
function CompassPuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const target = ["N", "E", "S", "W", "N"];
  const directions = ["N", "E", "S", "W"];
  const dirKo: Record<string, string> = { N: "북", E: "동", S: "남", W: "서" };
  const [current, setCurrent] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);

  const selectDir = (d: string) => {
    if (wrong) return;
    const next = [...sequence, d];
    if (d !== target[sequence.length]) {
      setWrong(true);
      setTimeout(() => {
        setSequence([]);
        setWrong(false);
      }, 800);
      return;
    }
    setSequence(next);
    setCurrent((current + (d === "N" ? 0 : d === "E" ? 90 : d === "S" ? 180 : 270)) % 360);
    if (next.length === target.length) {
      setTimeout(onSolve, 600);
    }
  };

  return (
    <Modal onClose={onClose} title="🧭 나침반 퍼즐">
      <p className="text-sm text-gray-600 mb-3">
        지도의 순서대로 방향을 입력하세요: {target.map((d) => dirKo[d]).join(" → ")}
      </p>
      <div className="flex justify-center mb-4">
        <div
          className="w-32 h-32 rounded-full border-4 border-amber-700 bg-amber-50 flex items-center justify-center relative"
          style={{ transform: `rotate(${current}deg)`, transition: "transform 0.3s" }}
        >
          <div className="absolute top-2 text-red-600 font-bold">N</div>
          <div className="absolute bottom-2 font-bold text-gray-600">S</div>
          <div className="absolute right-2 font-bold text-gray-600">E</div>
          <div className="absolute left-2 font-bold text-gray-600">W</div>
          <div className="text-3xl">🧭</div>
        </div>
      </div>
      <div className="flex justify-center gap-2 mb-3">
        {sequence.map((d, i) => (
          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-bold">
            {dirKo[d]}
          </span>
        ))}
        {wrong && <span className="text-red-500 font-bold">❌ 틀렸어요!</span>}
      </div>
      <div className="flex justify-center gap-2">
        {directions.map((d) => (
          <button
            key={d}
            onClick={() => selectDir(d)}
            className="w-14 h-14 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 active:scale-95 transition-all shadow"
          >
            {dirKo[d]}
            <br />
            <span className="text-xs">{d}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Piano Puzzle Modal (Room 4) ─────────────────────────────────
function PianoPuzzle({
  onClose,
  onSolve,
  targetNotes,
}: {
  onClose: () => void;
  onSolve: () => void;
  targetNotes: string[];
}) {
  const allNotes = ["도", "레", "미", "파", "솔", "라", "시"];
  const [played, setPlayed] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);

  const playNote = (note: string) => {
    if (wrong) return;
    const next = [...played, note];
    if (note !== targetNotes[played.length]) {
      setWrong(true);
      setTimeout(() => {
        setPlayed([]);
        setWrong(false);
      }, 800);
      return;
    }
    setPlayed(next);
    if (next.length === targetNotes.length) {
      setTimeout(onSolve, 600);
    }
  };

  const keyColors = ["bg-white", "bg-white", "bg-white", "bg-white", "bg-white", "bg-white", "bg-white"];

  return (
    <Modal onClose={onClose} title="🎹 피아노 연주" bg="bg-gray-900 text-white">
      <p className="text-sm text-gray-400 mb-2">
        벽에 적힌 음을 순서대로 연주하세요:
      </p>
      <div className="flex justify-center gap-1 mb-4">
        {targetNotes.map((n, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded text-sm font-bold ${
              i < played.length ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      {wrong && <p className="text-center text-red-400 font-bold mb-2">❌ 틀렸어요! 다시!</p>}
      <div className="flex justify-center gap-0.5">
        {allNotes.map((n, i) => (
          <button
            key={n}
            onClick={() => playNote(n)}
            className={`w-10 h-24 ${keyColors[i]} rounded-b-lg text-gray-800 font-bold text-sm hover:bg-gray-100 active:bg-gray-300 transition-colors border border-gray-300 shadow-md flex items-end justify-center pb-2`}
          >
            {n}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Anagram Puzzle Modal (Room 4) ───────────────────────────────
function AnagramPuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const answer = "자유";
  const scrambled = ["유", "자"];
  const [selected, setSelected] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  const word = selected.map((i) => scrambled[i]).join("");

  const toggleLetter = (idx: number) => {
    if (selected.includes(idx)) {
      setSelected(selected.filter((i) => i !== idx));
      setWrong(false);
    } else {
      const next = [...selected, idx];
      setSelected(next);
      if (next.length === scrambled.length) {
        const w = next.map((i) => scrambled[i]).join("");
        if (w === answer) {
          setTimeout(onSolve, 600);
        } else {
          setWrong(true);
          setTimeout(() => {
            setSelected([]);
            setWrong(false);
          }, 800);
        }
      }
    }
  };

  return (
    <Modal onClose={onClose} title="👻 강령술 보드" bg="bg-gray-900 text-white">
      <p className="text-sm text-gray-400 mb-3">
        흩어진 글자를 조합하여 단어를 만드세요...
      </p>
      <div className="text-center mb-4 h-12 flex items-center justify-center">
        <span className="text-3xl font-bold text-purple-400 tracking-widest">
          {word || "_ _"}
        </span>
      </div>
      {wrong && <p className="text-center text-red-400 font-bold mb-2">❌ 그 단어가 아닙니다...</p>}
      <div className="flex justify-center gap-3 mb-4">
        {scrambled.map((letter, i) => (
          <button
            key={i}
            onClick={() => toggleLetter(i)}
            className={`w-16 h-16 rounded-lg text-2xl font-bold transition-all ${
              selected.includes(i)
                ? "bg-purple-600 text-white scale-95"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            } shadow-lg`}
          >
            {letter}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          setSelected([]);
          setWrong(false);
        }}
        className="block mx-auto px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600"
      >
        초기화
      </button>
    </Modal>
  );
}

// ─── Wire Puzzle Modal (Room 5) ──────────────────────────────────
function WirePuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const colors = [
    { name: "빨강", color: "#ef4444" },
    { name: "파랑", color: "#3b82f6" },
    { name: "초록", color: "#22c55e" },
    { name: "노랑", color: "#eab308" },
    { name: "보라", color: "#8b5cf6" },
    { name: "주황", color: "#f97316" },
  ];
  // Shuffled right side targets
  const rightOrder = [3, 5, 1, 0, 4, 2];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [connections, setConnections] = useState<Record<number, number>>({});

  const connectWire = (rightIdx: number) => {
    if (selectedLeft === null) return;
    const targetColor = rightOrder[rightIdx];
    if (selectedLeft === targetColor) {
      setConnections({ ...connections, [selectedLeft]: rightIdx });
      setSelectedLeft(null);
      const newConns = { ...connections, [selectedLeft]: rightIdx };
      if (Object.keys(newConns).length === 6) {
        setTimeout(onSolve, 600);
      }
    } else {
      setSelectedLeft(null);
    }
  };

  return (
    <Modal onClose={onClose} title="🔌 전선 연결" bg="bg-gray-900 text-white">
      <p className="text-sm text-gray-400 mb-3">같은 색의 전선을 연결하세요!</p>
      <div className="flex justify-between items-start px-4">
        <div className="flex flex-col gap-2">
          {colors.map((c, i) => (
            <button
              key={i}
              onClick={() =>
                connections[i] !== undefined ? undefined : setSelectedLeft(i)
              }
              className={`w-24 h-8 rounded-l-full text-white text-sm font-bold transition-all ${
                selectedLeft === i ? "ring-2 ring-white scale-105" : ""
              } ${connections[i] !== undefined ? "opacity-50" : "hover:scale-105"}`}
              style={{ background: c.color }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rightOrder.map((colorIdx, i) => (
            <button
              key={i}
              onClick={() => connectWire(i)}
              className={`w-24 h-8 rounded-r-full text-white text-sm font-bold transition-all ${
                Object.values(connections).includes(i) ? "opacity-50" : "hover:scale-105"
              }`}
              style={{ background: colors[colorIdx].color }}
            >
              {colors[colorIdx].name}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-3">
        연결됨: {Object.keys(connections).length} / 6
      </p>
    </Modal>
  );
}

// ─── Constellation Puzzle Modal (Room 5) ─────────────────────────
function ConstellationPuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const stars = [
    { x: 30, y: 20 },
    { x: 50, y: 15 },
    { x: 70, y: 25 },
    { x: 60, y: 50 },
    { x: 40, y: 55 },
    { x: 25, y: 45 },
    { x: 45, y: 75 },
  ];
  const correctOrder = [0, 1, 2, 3, 4, 5, 6];
  const [clicked, setClicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  const clickStar = (idx: number) => {
    if (wrong || clicked.includes(idx)) return;
    const next = [...clicked, idx];
    if (idx !== correctOrder[clicked.length]) {
      setWrong(true);
      setTimeout(() => {
        setClicked([]);
        setWrong(false);
      }, 800);
      return;
    }
    setClicked(next);
    if (next.length === correctOrder.length) {
      setTimeout(onSolve, 600);
    }
  };

  return (
    <Modal onClose={onClose} title="⭐ 별자리 그리기" bg="bg-gray-950 text-white">
      <p className="text-sm text-gray-400 mb-3">
        별을 순서대로 (왼쪽 위부터 시계방향으로) 클릭하세요!
      </p>
      {wrong && <p className="text-center text-red-400 font-bold mb-2">❌ 순서가 틀렸어요!</p>}
      <div className="relative w-full h-64 bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
        {/* Background stars */}
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={`bg-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          />
        ))}
        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full">
          {clicked.map(
            (sIdx, i) =>
              i > 0 && (
                <line
                  key={i}
                  x1={`${stars[clicked[i - 1]].x}%`}
                  y1={`${stars[clicked[i - 1]].y}%`}
                  x2={`${stars[sIdx].x}%`}
                  y2={`${stars[sIdx].y}%`}
                  stroke="#60a5fa"
                  strokeWidth="2"
                />
              )
          )}
        </svg>
        {/* Stars */}
        {stars.map((s, i) => (
          <button
            key={i}
            onClick={() => clickStar(i)}
            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full transition-all ${
              clicked.includes(i)
                ? "bg-yellow-400 scale-125 shadow-lg shadow-yellow-400/50"
                : "bg-white hover:bg-yellow-300 hover:scale-110"
            }`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            <span className="text-xs">
              {clicked.includes(i) ? clicked.indexOf(i) + 1 : "✦"}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          setClicked([]);
          setWrong(false);
        }}
        className="block mx-auto mt-3 px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600"
      >
        초기화
      </button>
    </Modal>
  );
}

// ─── Gauge/Slider Puzzle Modal (Room 5) ──────────────────────────
function GaugePuzzle({
  onClose,
  onSolve,
}: {
  onClose: () => void;
  onSolve: () => void;
}) {
  const targets = [72, 45, 88];
  const labels = ["산소", "압력", "온도"];
  const [values, setValues] = useState([50, 50, 50]);

  const updateVal = (idx: number, val: number) => {
    const next = [...values];
    next[idx] = val;
    setValues(next);
    if (next.every((v, i) => Math.abs(v - targets[i]) <= 3)) {
      setTimeout(onSolve, 500);
    }
  };

  return (
    <Modal onClose={onClose} title="🎛️ 압력 조절" bg="bg-gray-900 text-white">
      <p className="text-sm text-gray-400 mb-4">게이지를 목표 값에 맞추세요!</p>
      <div className="space-y-4">
        {labels.map((label, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span>
                {label}: <strong>{values[i]}</strong>
              </span>
              <span className="text-gray-500">목표: {targets[i]}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={values[i]}
                onChange={(e) => updateVal(i, Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div
                className="absolute top-0 w-0.5 h-5 bg-red-500"
                style={{ left: `${targets[i]}%`, transform: "translateX(-50%)" }}
              />
            </div>
            <div className="text-xs text-center mt-0.5">
              {Math.abs(values[i] - targets[i]) <= 3 ? (
                <span className="text-green-400">✅ 정확!</span>
              ) : (
                <span className="text-gray-500">
                  {values[i] < targets[i] ? "▲ 올리세요" : "▼ 내리세요"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Hint System ─────────────────────────────────────────────────
const HINTS: Record<RoomId, string[]> = {
  1: [
    "💡 램프 아래에 뭔가 있을 것 같아요...",
    "🕐 시계의 시간을 잘 보세요. 숫자가 비밀번호일지도?",
    "🖼️ 그림 뒤에 자물쇠 상자가 있어요. 시계 시간이 코드예요!",
  ],
  2: [
    "🧪 색을 섞어보세요! 빨강 + 파랑 = ?",
    "💻 USB를 컴퓨터에 꽂으면 미로가 나와요.",
    "🔒 금고 비밀번호는 미로를 풀면 나와요!",
  ],
  3: [
    "🧭 지도에 적힌 방향 순서대로 나침반을 돌려보세요.",
    "🧩 슬라이드 퍼즐: 빈 칸 옆의 타일을 클릭하세요.",
    "🪢 밧줄과 닻 열쇠를 함께 사용하세요!",
  ],
  4: [
    "🕯️ 어두운 곳을 클릭해서 초를 찾으세요!",
    "🎹 벽에 나타난 음표를 피아노로 연주하세요.",
    "👻 강령술 보드에서 글자를 조합하세요: '자유'",
  ],
  5: [
    "🔌 같은 색의 전선끼리 연결하세요.",
    "⭐ 별을 왼쪽 위부터 시계방향으로 클릭하세요.",
    "🎛️ 게이지를 빨간 선(목표값)에 맞추세요.",
  ],
};

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN GAME COMPONENT ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function RoomEscapePage() {
  // Game state
  const [screen, setScreen] = useState<"menu" | "game" | "complete">("menu");
  const [currentRoom, setCurrentRoom] = useState<RoomId>(1);
  const [roomStates, setRoomStates] = useState<Record<RoomId, RoomState>>({
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Record<RoomId, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  });
  const [roomTimes, setRoomTimes] = useState<Record<RoomId, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  });
  const [timer, setTimer] = useState(0);
  const [roomStartTime, setRoomStartTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedRooms, setCompletedRooms] = useState<Set<RoomId>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const msgId = useRef(0);

  // Timer
  useEffect(() => {
    if (screen !== "game") return;
    const iv = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [screen]);

  // Mouse tracking for haunted house
  useEffect(() => {
    if (currentRoom !== 4 || screen !== "game") return;
    const handler = (e: MouseEvent) => {
      const container = document.getElementById("room-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [currentRoom, screen]);

  const rs = roomStates[currentRoom];
  const setRs = (updates: Partial<RoomState>) => {
    setRoomStates((prev) => ({
      ...prev,
      [currentRoom]: { ...prev[currentRoom], ...updates },
    }));
  };

  const addMessage = (text: string) => {
    const id = ++msgId.current;
    setMessages((prev) => [...prev.slice(-3), { text, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 3000);
  };

  const addItem = (item: InventoryItem) => {
    if (inventory.find((i) => i.id === item.id)) return;
    setInventory((prev) => [...prev, item]);
    addMessage(`🎒 ${item.name}을(를) 획득했습니다!`);
  };

  const removeItem = (id: ItemId) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    if (selectedItem === id) setSelectedItem(null);
  };

  const hasItem = (id: ItemId) => inventory.some((i) => i.id === id);

  const useHint = () => {
    const used = hintsUsed[currentRoom];
    if (used >= 3) {
      addMessage("💡 이 방의 힌트를 모두 사용했어요!");
      return;
    }
    const hint = HINTS[currentRoom][used];
    addMessage(hint);
    setHintsUsed((prev) => ({ ...prev, [currentRoom]: used + 1 }));
  };

  const escapeRoom = () => {
    const elapsed = timer - roomStartTime;
    setRoomTimes((prev) => ({ ...prev, [currentRoom]: elapsed }));
    setCompletedRooms((prev) => new Set(prev).add(currentRoom));
    setShowConfetti(true);
    addMessage("🎉 탈출 성공!");
    setTimeout(() => {
      setShowConfetti(false);
      if (currentRoom < 5) {
        const next = (currentRoom + 1) as RoomId;
        setCurrentRoom(next);
        setInventory([]);
        setSelectedItem(null);
        setRoomStartTime(timer);
        addMessage(`${ROOM_NAMES[next]}에 입장합니다...`);
      } else {
        setScreen("complete");
      }
    }, 2500);
  };

  const startGame = (room?: RoomId) => {
    setScreen("game");
    setCurrentRoom(room || 1);
    setTimer(0);
    setRoomStartTime(0);
    setInventory([]);
    setSelectedItem(null);
    setRoomStates({ 1: {}, 2: {}, 3: {}, 4: {}, 5: {} });
    setHintsUsed({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    setRoomTimes({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    setCompletedRooms(new Set());
    setMessages([]);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Room 1: Normal Room ─────────────────────────────────────
  const renderRoom1 = () => {
    const bgStyle = "bg-gradient-to-b from-amber-100 to-amber-200";
    return (
      <div className={`relative w-full h-full ${bgStyle} overflow-hidden`}>
        {/* Wall */}
        <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-amber-50 to-amber-100 border-b-4 border-amber-300" />
        {/* Floor */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-amber-700 to-amber-800" />

        {/* Door */}
        <div className="absolute right-[8%] top-[15%] w-[12%] h-[45%] bg-amber-900 rounded-t-lg border-2 border-amber-950 flex items-center justify-end pr-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
        </div>

        {/* Window */}
        <RoomItem emoji="🪟" label="창문" x={50} y={18} size={56}
          onClick={() => addMessage("창문이 잠겨있어요. 밖에는 아무것도 안 보여요...")} />

        {/* Lamp */}
        <RoomItem emoji="💡" label="램프" x={20} y={25} size={40}
          onClick={() => {
            if (!rs.lampChecked) {
              setRs({ lampChecked: true });
              addMessage("💡 램프 아래에서 쪽지를 발견했어요: '시계를 봐'");
            } else {
              addMessage("이미 확인한 램프예요.");
            }
          }} />

        {/* Clock */}
        <RoomItem emoji="🕐" label="시계" x={38} y={12} size={44}
          highlight={rs.lampChecked && !rs.clockChecked}
          onClick={() => {
            setRs({ clockChecked: true });
            addMessage("🕐 시계가 3시 15분을 가리키고 있어요... 0315?");
          }} />

        {/* Painting */}
        <RoomItem emoji="🖼️" label="그림" x={65} y={20} size={52}
          highlight={rs.clockChecked && !rs.paintingChecked}
          onClick={() => {
            if (!rs.paintingChecked) {
              setRs({ paintingChecked: true });
              addMessage("🖼️ 그림 뒤에 4자리 자물쇠 상자가 있어요!");
              setActiveModal("keypad1");
            } else if (!rs.boxOpened) {
              setActiveModal("keypad1");
            } else {
              addMessage("이미 열린 상자예요.");
            }
          }} />

        {/* Bookshelf */}
        <RoomItem emoji="📚" label="책장" x={12} y={42} size={56}
          onClick={() => {
            if (!rs.paperclipFound) {
              setRs({ paperclipFound: true });
              addItem({ id: "paperclip", name: "클립", emoji: "📎", description: "책 사이에서 찾은 클립" });
            } else {
              addMessage("더 이상 찾을 것이 없어요.");
            }
          }} />

        {/* Desk */}
        <RoomItem emoji="🪑" label="책상" x={35} y={52} size={48}
          onClick={() => addMessage("평범한 책상이에요. 위에 아무것도 없어요.")} />

        {/* Drawer */}
        <RoomItem emoji="🗄️" label="서랍" x={50} y={58} size={44}
          onClick={() => {
            if (rs.drawerOpened) {
              addMessage("이미 열린 서랍이에요.");
            } else if (selectedItem === "paperclip") {
              setRs({ drawerOpened: true });
              removeItem("paperclip");
              addItem({ id: "uvlight", name: "UV 라이트", emoji: "🔦", description: "자외선 손전등" });
              addMessage("📎 클립으로 서랍을 열었어요! UV 라이트를 발견했어요!");
            } else {
              addMessage("🔒 서랍이 잠겨있어요. 뭔가 얇은 것으로 열 수 있을 것 같아요...");
            }
          }} />

        {/* Bed */}
        <RoomItem emoji="🛏️" label="침대" x={80} y={55} size={56}
          onClick={() => addMessage("푹신한 침대예요. 아래에는 아무것도 없어요.")} />

        {/* Wall for UV light */}
        {hasItem("uvlight") && (
          <RoomItem emoji="🔦" label="벽 (UV)" x={75} y={35} size={36}
            highlight
            onClick={() => {
              if (selectedItem === "uvlight") {
                setRs({ uvUsed: true });
                addMessage("🔦 UV 빛으로 벽에 숨겨진 화살표가 나타났어요! ➡️ 러그를 가리키고 있어요!");
              } else {
                addMessage("벽에 뭔가 있는 것 같은데... UV 라이트를 사용해보세요.");
              }
            }} />
        )}

        {/* Rug */}
        <RoomItem emoji="🟫" label="러그" x={55} y={72} size={60}
          highlight={rs.uvUsed && !rs.trapdoorFound}
          onClick={() => {
            if (rs.uvUsed && !rs.trapdoorFound) {
              setRs({ trapdoorFound: true });
              addMessage("🚪 러그 아래에서 비밀 문을 발견했어요! 열쇠 구멍이 있어요!");
            } else if (rs.trapdoorFound) {
              if (selectedItem === "key1") {
                removeItem("key1");
                addMessage("🔑 열쇠로 비밀 문을 열었어요!");
                setTimeout(escapeRoom, 1000);
              } else {
                addMessage("열쇠가 필요해요!");
              }
            } else {
              addMessage("평범한 러그예요.");
            }
          }} />
      </div>
    );
  };

  // ─── Room 2: Laboratory ──────────────────────────────────────
  const renderRoom2 = () => {
    return (
      <div className="relative w-full h-full bg-gradient-to-b from-green-50 to-white overflow-hidden">
        {/* Walls */}
        <div className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-gray-100 to-green-50" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-gray-200 to-gray-300" />
        {/* Tile pattern */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] opacity-10"
          style={{ backgroundImage: "repeating-conic-gradient(#000 0% 25%, transparent 0% 50%)", backgroundSize: "40px 40px" }} />

        {/* Door */}
        <div className="absolute right-[5%] top-[10%] w-[10%] h-[45%] bg-gray-400 rounded-t-lg border-2 border-gray-500">
          <div className="absolute right-2 top-1/2 w-6 h-2 bg-green-400 rounded" />
        </div>

        {/* Whiteboard */}
        <RoomItem emoji="📋" label="화이트보드" x={20} y={15} size={52}
          onClick={() => {
            setRs({ whiteboardChecked: true });
            addMessage("📋 화이트보드: 'H₂O = ? → 원소 번호를 확인하세요'");
          }} />

        {/* Periodic table */}
        <RoomItem emoji="📊" label="주기율표" x={40} y={12} size={44}
          highlight={rs.whiteboardChecked && !rs.periodicChecked}
          onClick={() => {
            setRs({ periodicChecked: true });
            addMessage("📊 H=1번, O=8번 원소... 화학식의 숫자와 관련이 있을까?");
          }} />

        {/* Beakers */}
        <RoomItem emoji="🧪" label="비커" x={30} y={45} size={48}
          onClick={() => {
            if (rs.colorMixed) {
              addMessage("이미 실험을 완료했어요.");
            } else {
              setActiveModal("colormix");
            }
          }} />

        {/* Microscope */}
        <RoomItem emoji="🔬" label="현미경" x={15} y={48} size={44}
          onClick={() => addMessage("🔬 현미경을 보니... 미세한 회로 패턴이 보여요. 신기하네요!")} />

        {/* Cabinet */}
        <RoomItem emoji="🗄️" label="캐비넷" x={60} y={40} size={52}
          onClick={() => {
            if (rs.cabinetOpened) {
              addMessage("이미 열린 캐비넷이에요.");
            } else if (rs.colorMixed) {
              setRs({ cabinetOpened: true });
              addItem({ id: "usb", name: "USB 드라이브", emoji: "💾", description: "데이터가 들어있는 USB" });
              addMessage("🗄️ 캐비넷이 열렸어요! USB 드라이브를 발견했습니다!");
            } else {
              addMessage("🔒 캐비넷이 잠겨있어요. 뭔가 실험을 해야 할 것 같아요...");
            }
          }} />

        {/* Computer */}
        <RoomItem emoji="💻" label="컴퓨터" x={50} y={52} size={48}
          highlight={hasItem("usb")}
          onClick={() => {
            if (rs.mazeSolved) {
              addMessage("컴퓨터 화면: '금고 코드: 7294'");
            } else if (selectedItem === "usb" || hasItem("usb")) {
              removeItem("usb");
              setRs({ usbInserted: true });
              addMessage("💻 USB를 삽입했어요! 화면에 미로가 나타났습니다!");
              setActiveModal("maze");
            } else {
              addMessage("💻 컴퓨터가 켜져있지만 USB 포트가 비어있어요.");
            }
          }} />

        {/* Safe */}
        <RoomItem emoji="🔒" label="금고" x={78} y={50} size={48}
          highlight={rs.mazeSolved && !rs.safeOpened}
          onClick={() => {
            if (rs.safeOpened) {
              addMessage("이미 열린 금고예요.");
            } else if (rs.mazeSolved) {
              setActiveModal("keypad2");
            } else {
              addMessage("🔒 금고가 단단히 잠겨있어요. 비밀번호가 필요해요.");
            }
          }} />
      </div>
    );
  };

  // ─── Room 3: Pirate Ship ─────────────────────────────────────
  const renderRoom3 = () => {
    return (
      <div className="relative w-full h-full bg-gradient-to-b from-amber-800 to-amber-950 overflow-hidden">
        {/* Ship deck */}
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-b from-amber-900 to-yellow-950" />
        {/* Planks */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="absolute inset-x-0 bg-amber-800/30 h-[1px]"
            style={{ bottom: `${10 + i * 10}%` }} />
        ))}
        {/* Ocean through window */}
        <div className="absolute left-[5%] top-[10%] w-[15%] h-[25%] rounded-full bg-blue-400 border-4 border-amber-700 overflow-hidden">
          <div className="absolute bottom-0 w-full h-1/2 bg-blue-600 animate-pulse" />
        </div>

        {/* Door */}
        <div className="absolute right-[5%] top-[10%] w-[10%] h-[45%] bg-amber-950 rounded-t-lg border-2 border-amber-600">
          <div className="absolute right-2 top-1/2 w-4 h-4 rounded-full bg-yellow-500" />
        </div>

        {/* Map */}
        <RoomItem emoji="🗺️" label="보물 지도" x={25} y={20} size={48}
          onClick={() => {
            setRs({ mapChecked: true });
            addMessage("🗺️ 지도에 나침반 방향이 적혀있어요: 북→동→남→서→북");
          }} />

        {/* Compass */}
        <RoomItem emoji="🧭" label="나침반" x={45} y={18} size={44}
          highlight={rs.mapChecked && !rs.compassSolved}
          onClick={() => {
            if (rs.compassSolved) {
              addMessage("이미 풀린 나침반이에요.");
            } else {
              setActiveModal("compass");
            }
          }} />

        {/* Cannon + broken wall */}
        <RoomItem emoji={rs.cannonFired ? "💥" : "🔫"} label="대포" x={15} y={50} size={48}
          onClick={() => {
            if (rs.compassSolved && !rs.cannonFired) {
              setRs({ cannonFired: true });
              addMessage("💥 대포가 발사되어 벽이 부서졌어요! 뒤에 퍼즐이 있어요!");
            } else if (rs.cannonFired) {
              addMessage("이미 발사된 대포예요.");
            } else {
              addMessage("대포를 발사하려면 먼저 나침반 퍼즐을 풀어야 해요.");
            }
          }} />

        {/* Puzzle grid (behind wall) */}
        {rs.cannonFired && (
          <RoomItem emoji="🧩" label="슬라이드 퍼즐" x={15} y={35} size={40}
            highlight={!rs.slideSolved}
            onClick={() => {
              if (!rs.slideSolved) setActiveModal("slide");
              else addMessage("이미 푼 퍼즐이에요.");
            }} />
        )}

        {/* Chest */}
        <RoomItem emoji={rs.chestOpened ? "📦" : "🪙"} label="보물 상자" x={55} y={55} size={52}
          highlight={rs.slideSolved && !rs.chestOpened}
          onClick={() => {
            if (rs.chestOpened) {
              addMessage("빈 상자예요.");
            } else if (rs.slideSolved) {
              setRs({ chestOpened: true });
              addItem({ id: "anchorkey", name: "닻 열쇠", emoji: "⚓", description: "닻 모양의 열쇠" });
              addMessage("🪙 보물 상자가 열렸어요! 닻 열쇠를 찾았어요!");
            } else {
              addMessage("🔒 보물 상자가 단단히 잠겨있어요...");
            }
          }} />

        {/* Barrel */}
        <RoomItem emoji="🛢️" label="통" x={35} y={60} size={48}
          onClick={() => {
            if (!rs.barrelChecked) {
              setRs({ barrelChecked: true });
              addMessage("🛢️ 통 안에서 메시지가 든 병을 찾았어요! '밧줄은 돛대 옆에 있다'");
            } else {
              addMessage("빈 통이에요.");
            }
          }} />

        {/* Rope (after barrel hint) */}
        {rs.barrelChecked && (
          <RoomItem emoji="🪢" label="밧줄" x={70} y={30} size={40}
            onClick={() => {
              if (!rs.ropeFound) {
                setRs({ ropeFound: true });
                addItem({ id: "rope", name: "밧줄", emoji: "🪢", description: "튼튼한 밧줄" });
              } else {
                addMessage("이미 가져간 밧줄이에요.");
              }
            }} />
        )}

        {/* Steering wheel */}
        <RoomItem emoji="⚓" label="조타기" x={75} y={55} size={56}
          highlight={hasItem("rope") && hasItem("anchorkey")}
          onClick={() => {
            if (hasItem("rope") && hasItem("anchorkey")) {
              removeItem("rope");
              removeItem("anchorkey");
              addMessage("🪢 밧줄과 ⚓ 닻 열쇠로 조타기를 작동시켰어요! 문이 열립니다!");
              setTimeout(escapeRoom, 1000);
            } else if (hasItem("anchorkey")) {
              addMessage("밧줄도 필요해요!");
            } else if (hasItem("rope")) {
              addMessage("닻 열쇠도 필요해요!");
            } else {
              addMessage("조타기에 뭔가를 연결해야 할 것 같아요...");
            }
          }} />
      </div>
    );
  };

  // ─── Room 4: Haunted House ───────────────────────────────────
  const renderRoom4 = () => {
    const candlesLit = (rs.candle1 ? 1 : 0) + (rs.candle2 ? 1 : 0) + (rs.candle3 ? 1 : 0);
    const allCandlesLit = candlesLit === 3;
    const flashlightRadius = allCandlesLit ? 100 : 18;

    return (
      <div className="relative w-full h-full bg-gray-950 overflow-hidden">
        {/* Dark overlay with flashlight effect */}
        <div
          className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-500"
          style={{
            background: allCandlesLit
              ? "transparent"
              : `radial-gradient(circle ${flashlightRadius}% at ${mousePos.x}% ${mousePos.y}%, transparent 0%, rgba(0,0,0,0.95) 100%)`,
          }}
        />

        {/* Room background */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950 to-gray-950" />
        {/* Floor */}
        <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-gray-900 to-gray-950" />

        {/* Door (hidden, revealed by mirror) */}
        {rs.mirrorPlaced && (
          <div className="absolute right-[8%] top-[15%] w-[10%] h-[45%] bg-purple-900 rounded-t-lg border-2 border-purple-600 z-20 animate-pulse">
            <div className="absolute right-2 top-1/2 w-4 h-4 rounded-full bg-gray-600" />
          </div>
        )}

        {/* Candle spots */}
        <RoomItem emoji={rs.candle1 ? "🕯️" : "🔍"} label="어두운 곳 1" x={15} y={25} size={36}
          onClick={() => {
            if (!rs.candle1) {
              setRs({ candle1: true });
              addMessage("🕯️ 초를 찾아서 켰어요! 벽에 음표가 보여요: '도'");
            }
          }} />

        <RoomItem emoji={rs.candle2 ? "🕯️" : "🔍"} label="어두운 곳 2" x={55} y={20} size={36}
          onClick={() => {
            if (!rs.candle2) {
              setRs({ candle2: true });
              addMessage("🕯️ 두 번째 초! 벽에 음표: '미'");
            }
          }} />

        <RoomItem emoji={rs.candle3 ? "🕯️" : "🔍"} label="어두운 곳 3" x={80} y={30} size={36}
          onClick={() => {
            if (!rs.candle3) {
              setRs({ candle3: true });
              addMessage("🕯️ 세 번째 초! 벽에 음표: '솔 도 레'");
            }
          }} />

        {/* Piano */}
        <RoomItem emoji="🎹" label="피아노" x={35} y={55} size={56}
          highlight={allCandlesLit && !rs.pianoSolved}
          onClick={() => {
            if (rs.pianoSolved) {
              addMessage("이미 연주한 피아노예요.");
            } else if (allCandlesLit) {
              setActiveModal("piano");
            } else {
              addMessage("🎹 피아노가 있지만 너무 어두워요... 초를 찾아야 해요.");
            }
          }} />

        {/* Mirror shard (after piano) */}
        {rs.pianoSolved && !rs.mirrorFound && (
          <RoomItem emoji="✨" label="비밀 칸" x={35} y={42} size={32}
            highlight
            onClick={() => {
              setRs({ mirrorFound: true });
              addItem({ id: "mirror", name: "거울 조각", emoji: "🪞", description: "빛을 반사하는 거울 조각" });
              addMessage("🪞 비밀 칸에서 거울 조각을 찾았어요!");
            }} />
        )}

        {/* Mirror placement spot */}
        {rs.mirrorFound && !rs.mirrorPlaced && (
          <RoomItem emoji="💫" label="빛이 모이는 곳" x={70} y={25} size={36}
            highlight
            onClick={() => {
              if (selectedItem === "mirror" || hasItem("mirror")) {
                removeItem("mirror");
                setRs({ mirrorPlaced: true });
                addMessage("🪞 거울로 초의 빛을 반사시켰더니 숨겨진 문이 나타났어요!");
              } else {
                addMessage("빛이 모이는 곳이에요. 뭔가 반사시킬 수 있을 것 같아요...");
              }
            }} />
        )}

        {/* Ouija board */}
        <RoomItem emoji="🔮" label="강령술 보드" x={20} y={60} size={48}
          highlight={rs.mirrorPlaced && !rs.ouijaSolved}
          onClick={() => {
            if (rs.ouijaSolved) {
              addMessage("이미 풀었어요.");
            } else if (rs.mirrorPlaced) {
              setActiveModal("anagram");
            } else {
              addMessage("🔮 어둠 속에서 보드가 희미하게 빛나고 있어요...");
            }
          }} />

        {/* Portrait */}
        <RoomItem emoji="🖼️" label="초상화" x={45} y={15} size={44}
          onClick={() => addMessage("👻 초상화의 눈이 움직이는 것 같아요... 으스스해요.")} />

        {/* Dusty book */}
        <RoomItem emoji="📖" label="먼지 쌓인 책" x={65} y={55} size={40}
          onClick={() => addMessage("📖 '이 집에서 나가려면 자유를 외쳐라...'")} />

        {/* Use skeleton key on door */}
        {rs.mirrorPlaced && rs.ouijaSolved && (
          <RoomItem emoji="🚪" label="숨겨진 문" x={88} y={35} size={40}
            highlight={hasItem("skeletonkey")}
            onClick={() => {
              if (selectedItem === "skeletonkey" || hasItem("skeletonkey")) {
                removeItem("skeletonkey");
                addMessage("💀 해골 열쇠로 문을 열었어요! 유령이 사라집니다!");
                setTimeout(escapeRoom, 1000);
              } else {
                addMessage("🔒 열쇠가 필요해요!");
              }
            }} />
        )}
      </div>
    );
  };

  // ─── Room 5: Space Station ───────────────────────────────────
  const renderRoom5 = () => {
    return (
      <div className="relative w-full h-full bg-gray-950 overflow-hidden">
        {/* Space background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950 to-gray-950" />
        {/* Stars */}
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.7,
              animation: `twinkle ${1 + Math.random() * 3}s infinite alternate`,
            }}
          />
        ))}
        {/* Floor */}
        <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-gray-800 to-gray-900 border-t-2 border-blue-500/30" />

        {/* Airlock door */}
        <div className="absolute right-[5%] top-[15%] w-[12%] h-[45%] bg-gray-700 rounded-lg border-2 border-blue-400/50">
          <div className="text-center text-xs text-blue-400 mt-2">AIRLOCK</div>
          <div className="absolute right-2 top-1/2 w-6 h-1 bg-red-500 rounded" />
        </div>

        {/* Window */}
        <div className="absolute left-[5%] top-[10%] w-[18%] h-[30%] rounded-xl bg-black border-4 border-gray-600 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-blue-950 to-black relative">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full"
                style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
            ))}
            <div className="absolute bottom-2 right-2 text-xl">🌍</div>
          </div>
        </div>

        {/* Control panel (wires) */}
        <RoomItem emoji="🎛️" label="제어판" x={30} y={25} size={52}
          onClick={() => {
            if (rs.wiresSolved) {
              addMessage("✅ 이미 수리한 제어판이에요. 산소 시스템 가동 중!");
            } else {
              setActiveModal("wires");
            }
          }} />

        {/* Window - constellation */}
        <RoomItem emoji="⭐" label="창문 밖 별" x={14} y={25} size={36}
          highlight={rs.wiresSolved && !rs.constellationSolved}
          onClick={() => {
            if (rs.constellationSolved) {
              addMessage("이미 별자리를 완성했어요.");
            } else if (rs.wiresSolved) {
              setActiveModal("constellation");
            } else {
              addMessage("⭐ 창밖에 별들이 보여요. 전력을 먼저 복구해야 자세히 볼 수 있어요.");
            }
          }} />

        {/* Space suit locker */}
        <RoomItem emoji="🧑‍🚀" label="우주복 보관함" x={50} y={40} size={48}
          highlight={rs.constellationSolved && !rs.suitObtained}
          onClick={() => {
            if (rs.suitObtained) {
              addMessage("이미 우주복을 가져갔어요.");
            } else if (rs.constellationSolved) {
              setRs({ suitObtained: true });
              addItem({ id: "spacesuit", name: "우주복", emoji: "🧑‍🚀", description: "에어락 접근용 우주복" });
              addMessage("🧑‍🚀 보관함이 열렸어요! 우주복을 획득했습니다!");
            } else {
              addMessage("🔒 보관함이 잠겨있어요.");
            }
          }} />

        {/* Oxygen tank */}
        <RoomItem emoji="🫁" label="산소 탱크" x={65} y={30} size={40}
          onClick={() => {
            if (rs.wiresSolved) {
              addMessage("✅ 산소 시스템이 정상 작동 중이에요!");
            } else {
              addMessage("⚠️ 산소 시스템이 꺼져있어요! 제어판을 먼저 수리하세요!");
            }
          }} />

        {/* Floating toolkit */}
        <RoomItem emoji="🧰" label="떠다니는 도구함" x={25} y={55} size={40}
          onClick={() => {
            if (!rs.overrideKeyFound) {
              setRs({ overrideKeyFound: true });
              addItem({ id: "overridekey", name: "오버라이드 키", emoji: "🔐", description: "에어락 오버라이드 키" });
              addMessage("🧰 도구함에서 오버라이드 키를 찾았어요!");
            } else {
              addMessage("빈 도구함이에요.");
            }
          }} />

        {/* Airlock area (need suit) */}
        <RoomItem emoji="🚪" label="에어락" x={88} y={35} size={44}
          highlight={hasItem("spacesuit") && hasItem("overridekey")}
          onClick={() => {
            if (!hasItem("spacesuit")) {
              addMessage("⚠️ 우주복 없이는 에어락에 접근할 수 없어요!");
            } else if (!hasItem("overridekey")) {
              addMessage("🔒 오버라이드 키가 필요해요!");
            } else if (!rs.gaugeSolved) {
              setActiveModal("gauge");
            } else {
              addMessage("에어락이 이미 열려있어요!");
            }
          }} />

        <style jsx>{`
          @keyframes twinkle {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

  // ─── Render current room ─────────────────────────────────────
  const renderRoom = () => {
    switch (currentRoom) {
      case 1: return renderRoom1();
      case 2: return renderRoom2();
      case 3: return renderRoom3();
      case 4: return renderRoom4();
      case 5: return renderRoom5();
    }
  };

  // ─── Modals ──────────────────────────────────────────────────
  const renderModals = () => {
    switch (activeModal) {
      case "keypad1":
        return (
          <NumberKeypad
            title="🔒 자물쇠 상자"
            hint="4자리 비밀번호를 입력하세요"
            onClose={() => setActiveModal(null)}
            onSubmit={(code) => {
              if (code === "0315") {
                setRs({ boxOpened: true });
                addItem({ id: "key1", name: "열쇠", emoji: "🔑", description: "금색 열쇠" });
                addMessage("🔓 상자가 열렸어요! 열쇠를 획득했습니다!");
                setActiveModal(null);
              } else {
                addMessage("❌ 틀렸어요! 다시 시도하세요.");
                setActiveModal(null);
                setTimeout(() => setActiveModal("keypad1"), 300);
              }
            }}
          />
        );
      case "keypad2":
        return (
          <NumberKeypad
            title="🔒 금고"
            hint="4자리 비밀번호를 입력하세요"
            onClose={() => setActiveModal(null)}
            onSubmit={(code) => {
              if (code === "7294") {
                setRs({ safeOpened: true });
                addItem({ id: "keycard", name: "키 카드", emoji: "💳", description: "문을 여는 키 카드" });
                addMessage("🔓 금고가 열렸어요! 키 카드를 획득했습니다!");
                setActiveModal(null);
                // Auto-use keycard
                setTimeout(() => {
                  addMessage("💳 키 카드로 문을 열었어요!");
                  setTimeout(escapeRoom, 1000);
                }, 1500);
              } else {
                addMessage("❌ 틀렸어요!");
                setActiveModal(null);
                setTimeout(() => setActiveModal("keypad2"), 300);
              }
            }}
          />
        );
      case "colormix":
        return (
          <ColorMixing
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ colorMixed: true });
              addMessage("🧪 색 혼합 성공! 캐비넷이 열렸어요!");
              setActiveModal(null);
            }}
          />
        );
      case "maze":
        return (
          <MazePuzzle
            onClose={() => setActiveModal(null)}
            onSolve={(code) => {
              setRs({ mazeSolved: true, safeCode: code });
              addMessage(`💻 미로 탈출 성공! 금고 코드가 나타났어요: ${code}`);
              setActiveModal(null);
            }}
          />
        );
      case "compass":
        return (
          <CompassPuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ compassSolved: true });
              addMessage("🧭 나침반 퍼즐 완성! 대포를 발사할 수 있어요!");
              setActiveModal(null);
            }}
          />
        );
      case "slide":
        return (
          <SlidePuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ slideSolved: true });
              addMessage("🧩 슬라이드 퍼즐 완성! 보물 상자가 열릴 거예요!");
              setActiveModal(null);
            }}
          />
        );
      case "piano":
        return (
          <PianoPuzzle
            targetNotes={["도", "미", "솔", "도", "레"]}
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ pianoSolved: true });
              addMessage("🎹 아름다운 선율! 비밀 칸이 열렸어요!");
              setActiveModal(null);
            }}
          />
        );
      case "anagram":
        return (
          <AnagramPuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ ouijaSolved: true });
              addItem({ id: "skeletonkey", name: "해골 열쇠", emoji: "💀", description: "유령이 준 해골 열쇠" });
              addMessage("👻 유령이 나타나 해골 열쇠를 줬어요! '자유를 찾아라...'");
              setActiveModal(null);
            }}
          />
        );
      case "wires":
        return (
          <WirePuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ wiresSolved: true });
              addMessage("🔌 전선 연결 성공! 산소 시스템이 가동됩니다!");
              setActiveModal(null);
            }}
          />
        );
      case "constellation":
        return (
          <ConstellationPuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ constellationSolved: true });
              addMessage("⭐ 별자리 완성! 우주복 보관함이 열렸어요!");
              setActiveModal(null);
            }}
          />
        );
      case "gauge":
        return (
          <GaugePuzzle
            onClose={() => setActiveModal(null)}
            onSolve={() => {
              setRs({ gaugeSolved: true });
              removeItem("overridekey");
              removeItem("spacesuit");
              addMessage("🚀 에어락이 열렸어요! 구조선이 보입니다!");
              setActiveModal(null);
              setTimeout(escapeRoom, 1500);
            }}
          />
        );
      default:
        return null;
    }
  };

  // ─── Menu Screen ─────────────────────────────────────────────
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-10 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            >
              {["🔑", "🔒", "🗝️", "🚪", "💡", "🧩"][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center">
          <Link href="/" className="absolute -top-16 left-0 text-sm text-gray-400 hover:text-white transition-colors">
            ← 홈으로
          </Link>

          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
            🚪 방탈출 🔑
          </h1>
          <p className="text-xl text-gray-300 mb-8">5개의 방에서 탈출하세요!</p>

          <div className="grid gap-3 max-w-md mx-auto mb-8">
            {([1, 2, 3, 4, 5] as RoomId[]).map((id) => (
              <div
                key={id}
                className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10"
              >
                <div className="text-left">
                  <div className="font-bold">{ROOM_NAMES[id]}</div>
                  <div className="text-xs text-gray-400">난이도: {ROOM_DIFFICULTY[id]}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                  {id <= 3 ? "⭐".repeat(id) : "⭐".repeat(id)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => startGame()}
            className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded-2xl text-xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-transform"
          >
            🚪 게임 시작!
          </button>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(10deg); }
          }
          .animate-float { animation: float ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // ─── Completion Screen ───────────────────────────────────────
  if (screen === "complete") {
    const totalHints = Object.values(hintsUsed).reduce((a, b) => a + b, 0);
    const totalTime = timer;
    const grade =
      totalHints === 0 && totalTime < 600
        ? "S"
        : totalHints <= 5 && totalTime < 900
          ? "A"
          : totalHints <= 10 && totalTime < 1200
            ? "B"
            : "C";
    const gradeColors: Record<string, string> = {
      S: "from-yellow-400 to-amber-500",
      A: "from-green-400 to-emerald-500",
      B: "from-blue-400 to-cyan-500",
      C: "from-gray-400 to-gray-500",
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4 text-white">
        <Confetti />
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-black mb-2">🎉 축하합니다!</h1>
          <p className="text-2xl font-bold text-yellow-400 mb-6">방탈출 마스터</p>

          <div
            className={`inline-block text-8xl font-black bg-gradient-to-br ${gradeColors[grade]} bg-clip-text text-transparent mb-6`}
          >
            {grade}
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 space-y-2 text-left">
            {([1, 2, 3, 4, 5] as RoomId[]).map((id) => (
              <div key={id} className="flex justify-between text-sm">
                <span>{ROOM_NAMES[id]}</span>
                <span className="text-gray-400">
                  {formatTime(roomTimes[id])} / 힌트 {hintsUsed[id]}개
                </span>
              </div>
            ))}
            <div className="border-t border-white/20 pt-2 mt-2 flex justify-between font-bold">
              <span>총 시간</span>
              <span className="text-yellow-400">{formatTime(totalTime)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>총 힌트</span>
              <span className="text-yellow-400">{totalHints}개</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startGame()}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-red-500 rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              🔄 다시 도전
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-white/20 rounded-xl font-bold hover:bg-white/30 transition-colors"
            >
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Screen ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← 홈으로
          </Link>
          <span className="text-gray-600">|</span>
          <span className="font-bold">{ROOM_NAMES[currentRoom]}</span>
          <span className="text-xs text-gray-400">({ROOM_DIFFICULTY[currentRoom]})</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Room progress */}
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5] as RoomId[]).map((id) => (
              <div
                key={id}
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                  completedRooms.has(id)
                    ? "bg-green-500 text-white"
                    : id === currentRoom
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-600 text-gray-400"
                }`}
              >
                {completedRooms.has(id) ? "✓" : id}
              </div>
            ))}
          </div>
          {/* Timer */}
          <div className="text-sm font-mono bg-gray-700 px-3 py-1 rounded-lg">
            ⏱️ {formatTime(timer)}
          </div>
          {/* Hint button */}
          <button
            onClick={useHint}
            className="text-sm bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded-lg transition-colors"
          >
            💡 힌트 ({3 - hintsUsed[currentRoom]})
          </button>
        </div>
      </div>

      {/* Room */}
      <div className="flex-1 relative" id="room-container">
        {renderRoom()}

        {/* Messages */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center pointer-events-none">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black/80 text-white px-4 py-2 rounded-xl text-sm font-medium max-w-md text-center animate-slideDown shadow-lg"
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>

      {/* Inventory bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-bold">🎒 소지품:</span>
          <div className="flex gap-2 flex-1 overflow-x-auto">
            {inventory.length === 0 && (
              <span className="text-gray-500 text-sm italic">비어있음</span>
            )}
            {inventory.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  setSelectedItem(selectedItem === item.id ? null : item.id)
                }
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedItem === item.id
                    ? "bg-yellow-500 text-black scale-105 shadow-lg shadow-yellow-500/30"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
                title={item.description}
              >
                <span>{item.emoji}</span>
                <span className="font-bold">{item.name}</span>
              </button>
            ))}
          </div>
          {selectedItem && (
            <span className="text-yellow-400 text-xs animate-pulse">
              👆 사용할 곳을 클릭하세요
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      {renderModals()}

      {/* Confetti */}
      {showConfetti && <Confetti />}

      <style jsx>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  );
}
