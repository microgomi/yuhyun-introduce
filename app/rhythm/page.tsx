"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "songSelect" | "playing" | "result";
type Judge = "perfect" | "great" | "good" | "miss";

interface Note {
  id: number;
  lane: number; // 0-3
  time: number; // ms from start
  hit: boolean;
  judge: Judge | null;
}

interface Song {
  id: string;
  name: string;
  artist: string;
  emoji: string;
  bpm: number;
  difficulty: number; // 1-5
  color: string;
  notes: { lane: number; beat: number }[];
}

// --- Constants ---
const LANE_COUNT = 4;
const LANE_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A78BFA"];
const LANE_KEYS = ["D", "F", "J", "K"];
const LANE_EMOJIS = ["🔴", "🟢", "🟡", "🟣"];
const HIT_Y = 520; // where notes should be hit
const NOTE_SPEED = 4; // pixels per ms * speed multiplier
const CANVAS_W = 320;
const CANVAS_H = 580;

// Judge windows (ms)
const PERFECT_WINDOW = 50;
const GREAT_WINDOW = 100;
const GOOD_WINDOW = 150;

// Songs with beat patterns
const SONGS: Song[] = [
  {
    id: "twinkle",
    name: "반짝반짝 작은별",
    artist: "동요",
    emoji: "⭐",
    bpm: 100,
    difficulty: 1,
    color: "from-yellow-500 to-amber-500",
    notes: [
      // 반짝반짝 작은별
      { lane: 0, beat: 0 }, { lane: 0, beat: 1 }, { lane: 2, beat: 2 }, { lane: 2, beat: 3 },
      { lane: 3, beat: 4 }, { lane: 3, beat: 5 }, { lane: 2, beat: 6 },
      { lane: 1, beat: 8 }, { lane: 1, beat: 9 }, { lane: 0, beat: 10 }, { lane: 0, beat: 11 },
      { lane: 3, beat: 12 }, { lane: 3, beat: 13 }, { lane: 2, beat: 14 },
      // 아름답게 비치네
      { lane: 2, beat: 16 }, { lane: 2, beat: 17 }, { lane: 1, beat: 18 }, { lane: 1, beat: 19 },
      { lane: 0, beat: 20 }, { lane: 0, beat: 21 }, { lane: 3, beat: 22 },
      { lane: 2, beat: 24 }, { lane: 2, beat: 25 }, { lane: 1, beat: 26 }, { lane: 1, beat: 27 },
      { lane: 0, beat: 28 }, { lane: 0, beat: 29 }, { lane: 3, beat: 30 },
      // repeat
      { lane: 0, beat: 32 }, { lane: 0, beat: 33 }, { lane: 2, beat: 34 }, { lane: 2, beat: 35 },
      { lane: 3, beat: 36 }, { lane: 3, beat: 37 }, { lane: 2, beat: 38 },
      { lane: 1, beat: 40 }, { lane: 1, beat: 41 }, { lane: 0, beat: 42 }, { lane: 0, beat: 43 },
      { lane: 3, beat: 44 }, { lane: 3, beat: 45 }, { lane: 2, beat: 46 },
    ],
  },
  {
    id: "school",
    name: "학교종",
    artist: "동요",
    emoji: "🔔",
    bpm: 120,
    difficulty: 2,
    color: "from-green-500 to-emerald-500",
    notes: [
      { lane: 2, beat: 0 }, { lane: 2, beat: 1 }, { lane: 2, beat: 2 }, { lane: 2, beat: 3 },
      { lane: 0, beat: 4 }, { lane: 0, beat: 5 }, { lane: 2, beat: 6 }, { lane: 2, beat: 7 },
      { lane: 3, beat: 8 }, { lane: 3, beat: 9 }, { lane: 3, beat: 10 }, { lane: 3, beat: 11 },
      { lane: 1, beat: 12 }, { lane: 1, beat: 14 },
      { lane: 2, beat: 16 }, { lane: 2, beat: 17 }, { lane: 2, beat: 18 }, { lane: 2, beat: 19 },
      { lane: 0, beat: 20 }, { lane: 0, beat: 21 }, { lane: 2, beat: 22 }, { lane: 2, beat: 23 },
      { lane: 3, beat: 24 }, { lane: 1, beat: 25 }, { lane: 3, beat: 26 }, { lane: 1, beat: 27 },
      { lane: 0, beat: 28 }, { lane: 0, beat: 30 },
      // 2nd half
      { lane: 1, beat: 32 }, { lane: 1, beat: 33 }, { lane: 0, beat: 34 }, { lane: 0, beat: 35 },
      { lane: 1, beat: 36 }, { lane: 2, beat: 37 }, { lane: 3, beat: 38 },
      { lane: 1, beat: 40 }, { lane: 1, beat: 41 }, { lane: 0, beat: 42 }, { lane: 0, beat: 43 },
      { lane: 2, beat: 44 }, { lane: 2, beat: 46 },
      { lane: 2, beat: 48 }, { lane: 2, beat: 49 }, { lane: 2, beat: 50 }, { lane: 2, beat: 51 },
      { lane: 0, beat: 52 }, { lane: 0, beat: 53 }, { lane: 2, beat: 54 }, { lane: 2, beat: 55 },
      { lane: 3, beat: 56 }, { lane: 1, beat: 57 }, { lane: 3, beat: 58 }, { lane: 1, beat: 59 },
      { lane: 0, beat: 60 }, { lane: 0, beat: 62 },
    ],
  },
  {
    id: "arirang",
    name: "아리랑",
    artist: "전래민요",
    emoji: "🏔️",
    bpm: 90,
    difficulty: 2,
    color: "from-pink-500 to-rose-500",
    notes: [
      { lane: 0, beat: 0 }, { lane: 1, beat: 1.5 }, { lane: 2, beat: 3 },
      { lane: 3, beat: 4 }, { lane: 2, beat: 5 }, { lane: 1, beat: 6 }, { lane: 0, beat: 7.5 },
      { lane: 1, beat: 9 }, { lane: 2, beat: 10 }, { lane: 3, beat: 11 }, { lane: 2, beat: 12 },
      { lane: 0, beat: 13.5 }, { lane: 1, beat: 15 },
      { lane: 2, beat: 16 }, { lane: 3, beat: 17 }, { lane: 2, beat: 18 }, { lane: 1, beat: 19.5 },
      { lane: 0, beat: 21 }, { lane: 1, beat: 22 }, { lane: 2, beat: 23 }, { lane: 3, beat: 24 },
      { lane: 2, beat: 25.5 }, { lane: 1, beat: 27 }, { lane: 0, beat: 28 }, { lane: 2, beat: 29 },
      { lane: 3, beat: 30 }, { lane: 1, beat: 31 },
      { lane: 0, beat: 32 }, { lane: 2, beat: 33 }, { lane: 1, beat: 34 }, { lane: 3, beat: 35 },
      { lane: 0, beat: 36 }, { lane: 1, beat: 37.5 }, { lane: 2, beat: 39 },
      { lane: 3, beat: 40 }, { lane: 2, beat: 41 }, { lane: 1, beat: 42 }, { lane: 0, beat: 43.5 },
    ],
  },
  {
    id: "cannon",
    name: "캐논 변주곡",
    artist: "파헬벨",
    emoji: "🎵",
    bpm: 130,
    difficulty: 3,
    color: "from-blue-500 to-indigo-500",
    notes: (() => {
      const pattern = [
        0, 2, 1, 3, 0, 2, 1, 3,
        2, 0, 3, 1, 2, 0, 3, 1,
        0, 1, 2, 3, 3, 2, 1, 0,
        1, 3, 0, 2, 1, 3, 0, 2,
        0, 0, 2, 2, 3, 3, 1, 1,
        2, 3, 0, 1, 2, 3, 0, 1,
        3, 1, 2, 0, 3, 2, 1, 0,
        0, 2, 3, 1, 0, 1, 2, 3,
      ];
      return pattern.map((lane, i) => ({ lane, beat: i }));
    })(),
  },
  {
    id: "fur_elise",
    name: "엘리제를 위하여",
    artist: "베토벤",
    emoji: "🎹",
    bpm: 140,
    difficulty: 4,
    color: "from-purple-500 to-violet-500",
    notes: (() => {
      const pattern = [
        3, 2, 3, 2, 3, 1, 2, 0,
        0, 0, 1, 2, 1, 1, 2, 3,
        3, 3, 2, 3, 2, 3, 1, 2, 0,
        0, 0, 1, 2, 1, 0, 0,
        1, 2, 3, 3, 2, 1, 0, 1, 2, 2, 1, 0,
        3, 2, 3, 2, 3, 1, 2, 0,
        0, 0, 1, 2, 1, 1, 2, 3,
        3, 2, 3, 2, 3, 1, 2, 0,
        0, 0, 1, 2, 1, 0, 0,
      ];
      return pattern.map((lane, i) => ({ lane, beat: i * 0.75 }));
    })(),
  },
  {
    id: "flight",
    name: "왕벌의 비행",
    artist: "림스키코르사코프",
    emoji: "🐝",
    bpm: 160,
    difficulty: 5,
    color: "from-red-500 to-orange-500",
    notes: (() => {
      const notes: { lane: number; beat: number }[] = [];
      for (let i = 0; i < 96; i++) {
        const lane = i % 4 === 0 ? (Math.floor(i / 4) % 4) :
                     i % 4 === 1 ? ((Math.floor(i / 4) + 1) % 4) :
                     i % 4 === 2 ? ((Math.floor(i / 4) + 2) % 4) :
                     ((Math.floor(i / 4) + 3) % 4);
        notes.push({ lane, beat: i * 0.5 });
      }
      return notes;
    })(),
  },
];

let noteId = 0;

export default function RhythmPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedSong, setSelectedSong] = useState<Song>(SONGS[0]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgeCount, setJudgeCount] = useState({ perfect: 0, great: 0, good: 0, miss: 0 });
  const [lastJudge, setLastJudge] = useState<Judge | null>(null);
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [laneFlash, setLaneFlash] = useState<boolean[]>([false, false, false, false]);
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const notesRef = useRef<Note[]>([]);
  const startTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const judgeRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 });
  const playingRef = useRef(false);
  const songRef = useRef<Song>(SONGS[0]);

  const clearAnim = useCallback(() => {
    cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => () => clearAnim(), [clearAnim]);

  // Start game
  const startGame = useCallback((song: Song) => {
    songRef.current = song;
    setSelectedSong(song);
    noteId = 0;

    const beatMs = 60000 / song.bpm;
    const leadTime = 2000;
    const notes: Note[] = song.notes.map((n) => ({
      id: ++noteId,
      lane: n.lane,
      time: n.beat * beatMs + leadTime,
      hit: false,
      judge: null,
    }));

    notesRef.current = notes;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    judgeRef.current = { perfect: 0, great: 0, good: 0, miss: 0 };
    playingRef.current = false;

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setJudgeCount({ perfect: 0, great: 0, good: 0, miss: 0 });
    setLastJudge(null);
    setProgress(0);
    setCountdown(3);
    setScreen("playing");
  }, []);

  // Countdown
  useEffect(() => {
    if (screen !== "playing" || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        startTimeRef.current = performance.now();
        playingRef.current = true;
        gameLoop();
      } else {
        setCountdown(countdown - 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!playingRef.current) return;
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const notes = notesRef.current;
    const song = songRef.current;
    const totalTime = notes.length > 0 ? notes[notes.length - 1].time + 2000 : 0;

    // Check for missed notes
    for (const note of notes) {
      if (!note.hit && elapsed > note.time + GOOD_WINDOW) {
        note.hit = true;
        note.judge = "miss";
        comboRef.current = 0;
        setCombo(0);
        judgeRef.current.miss++;
        setJudgeCount({ ...judgeRef.current });
        setLastJudge("miss");
      }
    }

    // Check if song ended
    const allHit = notes.every((n) => n.hit);
    if (allHit && notes.length > 0) {
      playingRef.current = false;
      const best = bestScores[song.id] ?? 0;
      if (scoreRef.current > best) {
        setBestScores((prev) => ({ ...prev, [song.id]: scoreRef.current }));
      }
      setTimeout(() => setScreen("result"), 500);
      return;
    }

    setProgress(Math.min(100, (elapsed / totalTime) * 100));
    drawGame(elapsed);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [bestScores]);

  // Draw
  const drawGame = useCallback((elapsed: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, "#0a0a1a");
    bg.addColorStop(1, "#1a1a3a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const laneW = CANVAS_W / LANE_COUNT;

    // Lane backgrounds
    for (let i = 0; i < LANE_COUNT; i++) {
      ctx.fillStyle = `rgba(${i === 0 ? "255,100,100" : i === 1 ? "78,205,196" : i === 2 ? "255,230,109" : "167,139,250"}, 0.05)`;
      ctx.fillRect(i * laneW, 0, laneW, CANVAS_H);

      // Lane divider
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, CANVAS_H);
      ctx.stroke();
    }

    // Hit line
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, HIT_Y - 3, CANVAS_W, 6);

    // Hit zone glow
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, HIT_Y - 30, CANVAS_W, 60);

    // Lane buttons at bottom
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = i * laneW;
      ctx.fillStyle = `rgba(${i === 0 ? "255,100,100" : i === 1 ? "78,205,196" : i === 2 ? "255,230,109" : "167,139,250"}, 0.2)`;
      ctx.beginPath();
      ctx.roundRect(x + 4, HIT_Y - 20, laneW - 8, 40, 8);
      ctx.fill();

      // Key label
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(LANE_KEYS[i], x + laneW / 2, HIT_Y + 30);
    }

    // Notes
    const scrollSpeed = 0.35;
    for (const note of notesRef.current) {
      if (note.hit) continue;
      const timeDiff = note.time - elapsed;
      const y = HIT_Y - timeDiff * scrollSpeed;

      if (y < -40 || y > CANVAS_H + 40) continue;

      const x = note.lane * laneW + laneW / 2;
      const color = LANE_COLORS[note.lane];

      // Note glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;

      // Note body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(note.lane * laneW + 8, y - 10, laneW - 16, 20, 6);
      ctx.fill();

      // Note shine
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(note.lane * laneW + 12, y - 8, laneW - 24, 8, 4);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // Hit effects (judge flash)
    for (const note of notesRef.current) {
      if (!note.judge || note.judge === "miss") continue;
      const timeSinceHit = elapsed - note.time;
      if (timeSinceHit < 0 || timeSinceHit > 400) continue;

      const alpha = 1 - timeSinceHit / 400;
      const size = 20 + timeSinceHit * 0.1;
      const x = note.lane * laneW + laneW / 2;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, HIT_Y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Hit note in lane
  const hitLane = useCallback((lane: number) => {
    if (!playingRef.current) return;
    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    // Flash lane
    setLaneFlash((prev) => {
      const next = [...prev];
      next[lane] = true;
      return next;
    });
    setTimeout(() => {
      setLaneFlash((prev) => {
        const next = [...prev];
        next[lane] = false;
        return next;
      });
    }, 100);

    // Find closest unhit note in this lane
    let closest: Note | null = null;
    let closestDiff = Infinity;

    for (const note of notesRef.current) {
      if (note.hit || note.lane !== lane) continue;
      const diff = Math.abs(elapsed - note.time);
      if (diff < closestDiff && diff < GOOD_WINDOW) {
        closestDiff = diff;
        closest = note;
      }
    }

    if (!closest) return;

    closest.hit = true;
    let judge: Judge;
    let points: number;

    if (closestDiff <= PERFECT_WINDOW) {
      judge = "perfect";
      points = 300;
    } else if (closestDiff <= GREAT_WINDOW) {
      judge = "great";
      points = 200;
    } else {
      judge = "good";
      points = 100;
    }

    closest.judge = judge;
    comboRef.current++;
    if (comboRef.current > maxComboRef.current) {
      maxComboRef.current = comboRef.current;
      setMaxCombo(comboRef.current);
    }
    setCombo(comboRef.current);

    const comboBonus = Math.floor(comboRef.current * 5);
    scoreRef.current += points + comboBonus;
    setScore(scoreRef.current);
    judgeRef.current[judge]++;
    setJudgeCount({ ...judgeRef.current });
    setLastJudge(judge);
  }, []);

  // Keyboard handler
  useEffect(() => {
    if (screen !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "d") hitLane(0);
      else if (key === "f") hitLane(1);
      else if (key === "j") hitLane(2);
      else if (key === "k") hitLane(3);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, hitLane]);

  // Grade
  const getGrade = () => {
    const total = notesRef.current.length;
    if (total === 0) return { grade: "-", color: "text-white" };
    const perfRate = judgeRef.current.perfect / total;
    const missRate = judgeRef.current.miss / total;
    if (perfRate >= 0.95) return { grade: "S+", color: "text-amber-300" };
    if (perfRate >= 0.85) return { grade: "S", color: "text-amber-400" };
    if (missRate < 0.05) return { grade: "A", color: "text-green-400" };
    if (missRate < 0.15) return { grade: "B", color: "text-blue-400" };
    if (missRate < 0.3) return { grade: "C", color: "text-purple-400" };
    return { grade: "D", color: "text-red-400" };
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white">
      <style jsx global>{`
        @keyframes judgePopPerfect { 0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.3)} 100%{transform:scale(1);opacity:1} }
        .judge-pop { animation: judgePopPerfect 0.3s ease-out; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🎵</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">리듬게임</span>
          </h1>
          <p className="text-lg text-slate-400">리듬에 맞춰 노트를 쳐라!</p>

          <button onClick={() => setScreen("songSelect")} className="mt-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
            🎮 곡 선택
          </button>

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-1">
            <p className="font-bold text-purple-400">🎮 조작법</p>
            <p>⌨️ 키보드: <span className="text-white font-bold">D F J K</span></p>
            <p>📱 터치: 하단 4개 버튼</p>
            <p>노트가 판정선에 도착할 때 맞춰서 눌러요!</p>
          </div>
        </div>
      )}

      {/* Song Select */}
      {screen === "songSelect" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🎵 곡 선택</h2>
          <div className="w-full max-w-sm space-y-3">
            {SONGS.map((song) => {
              const best = bestScores[song.id] ?? 0;
              return (
                <button
                  key={song.id}
                  onClick={() => startGame(song)}
                  className={`flex w-full items-center gap-3 rounded-xl bg-gradient-to-r ${song.color} p-4 text-left transition-transform hover:scale-[1.02] active:scale-95 shadow-lg`}
                >
                  <span className="text-4xl">{song.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-lg">{song.name}</p>
                    <p className="text-xs opacity-80">{song.artist}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-xs ${i < song.difficulty ? "opacity-100" : "opacity-30"}`}>⭐</span>
                        ))}
                      </div>
                      <span className="text-xs opacity-70">BPM {song.bpm}</span>
                    </div>
                    {best > 0 && <p className="text-xs opacity-80 mt-0.5">🏆 {best}</p>}
                  </div>
                  <span className="text-2xl">▶️</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          {/* HUD */}
          <div className="mb-1 flex w-full max-w-[320px] items-center justify-between text-xs">
            <span className="rounded-lg bg-black/30 px-2 py-1">{selectedSong.emoji} {selectedSong.name}</span>
            <span className="rounded-lg bg-black/30 px-2 py-1 font-bold">{score}</span>
          </div>

          {/* Combo & Judge */}
          <div className="mb-1 flex w-full max-w-[320px] items-center justify-between text-xs">
            <div>
              {combo > 1 && <span className="rounded-lg bg-purple-500/30 px-2 py-1 font-bold text-purple-300">{combo} COMBO</span>}
            </div>
            <div>
              {lastJudge && (
                <span className={`judge-pop rounded-lg px-2 py-1 font-black ${
                  lastJudge === "perfect" ? "bg-amber-500/30 text-amber-300" :
                  lastJudge === "great" ? "bg-green-500/30 text-green-300" :
                  lastJudge === "good" ? "bg-blue-500/30 text-blue-300" :
                  "bg-red-500/30 text-red-300"
                }`}>
                  {lastJudge === "perfect" ? "✨ PERFECT" : lastJudge === "great" ? "👍 GREAT" : lastJudge === "good" ? "👌 GOOD" : "💔 MISS"}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-1 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Countdown */}
          {countdown > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-8xl font-black text-white drop-shadow-lg">
              {countdown}
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-2xl border-2 border-purple-500/20"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          />

          {/* Touch buttons */}
          <div className="mt-2 flex w-full max-w-[320px] gap-1.5">
            {[0, 1, 2, 3].map((lane) => (
              <button
                key={lane}
                onPointerDown={() => hitLane(lane)}
                className={`flex-1 rounded-xl py-5 text-xl font-black transition-all active:scale-90 active:brightness-150 ${
                  laneFlash[lane] ? "brightness-150" : ""
                }`}
                style={{ backgroundColor: LANE_COLORS[lane] + "40", borderColor: LANE_COLORS[lane], borderWidth: 2 }}
              >
                {LANE_KEYS[lane]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {screen === "result" && (() => {
        const { grade, color } = getGrade();
        const total = notesRef.current.length;
        return (
          <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
            <div className="text-6xl">{selectedSong.emoji}</div>
            <p className="text-lg font-bold text-slate-400">{selectedSong.name}</p>
            <div className={`text-8xl font-black ${color}`}>{grade}</div>

            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2 w-full max-w-xs">
              <p>🏆 점수: <span className="font-bold text-amber-400">{score}</span></p>
              <p>🔥 최대 콤보: <span className="font-bold text-orange-400">{maxCombo}</span></p>
              <div className="border-t border-white/10 pt-2 mt-2 grid grid-cols-2 gap-1 text-sm">
                <p>✨ Perfect: <span className="font-bold text-amber-300">{judgeCount.perfect}</span></p>
                <p>👍 Great: <span className="font-bold text-green-300">{judgeCount.great}</span></p>
                <p>👌 Good: <span className="font-bold text-blue-300">{judgeCount.good}</span></p>
                <p>💔 Miss: <span className="font-bold text-red-300">{judgeCount.miss}</span></p>
              </div>
              <p className="text-xs text-slate-500">총 노트: {total}개</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => startGame(selectedSong)} className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                🔄 다시하기
              </button>
              <button onClick={() => setScreen("songSelect")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                🎵 곡 선택
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
