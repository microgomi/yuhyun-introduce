"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "caught" | "escaped";

interface Position {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "sofa" | "table" | "bed" | "closet" | "plant" | "shoe";
  emoji: string;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: "speed" | "invisible" | "trap" | "teleport";
  emoji: string;
  collected: boolean;
}

interface Stage {
  name: string;
  emoji: string;
  w: number;
  h: number;
  obstacles: Obstacle[];
  exitX: number;
  exitY: number;
  brotherSpeed: number;
  desc: string;
}

// --- Constants ---
const PLAYER_SIZE = 28;
const BROTHER_SIZE = 32;
const TICK_MS = 16;
const VIEW_W = 360;
const VIEW_H = 500;

const STAGES: Stage[] = [
  {
    name: "거실",
    emoji: "🛋️",
    w: 500, h: 600,
    obstacles: [
      { x: 100, y: 150, w: 80, h: 50, type: "sofa", emoji: "🛋️" },
      { x: 300, y: 250, w: 60, h: 60, type: "table", emoji: "🪑" },
      { x: 200, y: 400, w: 50, h: 50, type: "plant", emoji: "🪴" },
    ],
    exitX: 450, exitY: 50, brotherSpeed: 2.0,
    desc: "거실에서 현관까지 도망쳐!",
  },
  {
    name: "학교 복도",
    emoji: "🏫",
    w: 600, h: 700,
    obstacles: [
      { x: 80, y: 100, w: 60, h: 80, type: "closet", emoji: "🗄️" },
      { x: 250, y: 200, w: 100, h: 40, type: "table", emoji: "🪑" },
      { x: 400, y: 350, w: 50, h: 50, type: "plant", emoji: "🪴" },
      { x: 150, y: 450, w: 70, h: 60, type: "closet", emoji: "🗄️" },
      { x: 350, y: 550, w: 60, h: 40, type: "shoe", emoji: "👟" },
    ],
    exitX: 550, exitY: 650, brotherSpeed: 2.3,
    desc: "긴 복도를 달려서 탈출!",
  },
  {
    name: "놀이터",
    emoji: "🎪",
    w: 700, h: 700,
    obstacles: [
      { x: 100, y: 100, w: 80, h: 80, type: "table", emoji: "🎠" },
      { x: 350, y: 150, w: 60, h: 60, type: "plant", emoji: "🌳" },
      { x: 200, y: 350, w: 100, h: 60, type: "sofa", emoji: "🪑" },
      { x: 500, y: 300, w: 70, h: 70, type: "plant", emoji: "🌳" },
      { x: 150, y: 550, w: 60, h: 60, type: "table", emoji: "⛲" },
      { x: 450, y: 500, w: 80, h: 50, type: "closet", emoji: "🏗️" },
    ],
    exitX: 650, exitY: 650, brotherSpeed: 2.5,
    desc: "넓은 놀이터를 가로질러 탈출!",
  },
  {
    name: "미로 공원",
    emoji: "🌿",
    w: 700, h: 800,
    obstacles: [
      { x: 80, y: 80, w: 200, h: 30, type: "plant", emoji: "🌿" },
      { x: 80, y: 80, w: 30, h: 200, type: "plant", emoji: "🌿" },
      { x: 300, y: 150, w: 30, h: 250, type: "plant", emoji: "🌿" },
      { x: 150, y: 350, w: 200, h: 30, type: "plant", emoji: "🌿" },
      { x: 450, y: 100, w: 30, h: 300, type: "plant", emoji: "🌿" },
      { x: 450, y: 400, w: 200, h: 30, type: "plant", emoji: "🌿" },
      { x: 200, y: 500, w: 30, h: 200, type: "plant", emoji: "🌿" },
      { x: 350, y: 600, w: 200, h: 30, type: "plant", emoji: "🌿" },
      { x: 550, y: 500, w: 30, h: 200, type: "plant", emoji: "🌿" },
    ],
    exitX: 650, exitY: 750, brotherSpeed: 2.2,
    desc: "미로를 통과해서 탈출!",
  },
  {
    name: "마트",
    emoji: "🏪",
    w: 800, h: 800,
    obstacles: [
      { x: 60, y: 100, w: 40, h: 200, type: "closet", emoji: "🧴" },
      { x: 160, y: 100, w: 40, h: 200, type: "closet", emoji: "🥫" },
      { x: 260, y: 100, w: 40, h: 200, type: "closet", emoji: "🧃" },
      { x: 400, y: 100, w: 40, h: 200, type: "closet", emoji: "🍪" },
      { x: 500, y: 100, w: 40, h: 200, type: "closet", emoji: "🧁" },
      { x: 60, y: 400, w: 40, h: 200, type: "closet", emoji: "🍎" },
      { x: 160, y: 400, w: 40, h: 200, type: "closet", emoji: "🥦" },
      { x: 300, y: 450, w: 100, h: 40, type: "table", emoji: "🛒" },
      { x: 500, y: 400, w: 40, h: 200, type: "closet", emoji: "🥤" },
      { x: 650, y: 400, w: 40, h: 200, type: "closet", emoji: "🍦" },
    ],
    exitX: 750, exitY: 750, brotherSpeed: 2.8,
    desc: "마트 진열대 사이로 도망쳐!",
  },
];

let powerUpId = 0;

export default function RunawayPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [stageIdx, setStageIdx] = useState(0);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 50, y: 50 });
  const [brotherPos, setBrotherPos] = useState<Position>({ x: 0, y: 0 });
  const [playerSpeed, setPlayerSpeed] = useState(3.5);
  const [invisible, setInvisible] = useState(false);
  const [trapPos, setTrapPos] = useState<Position | null>(null);
  const [brotherStunned, setBrotherStunned] = useState(0);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [bestTimes, setBestTimes] = useState<number[]>(Array(STAGES.length).fill(0));
  const [totalEscapes, setTotalEscapes] = useState(0);
  const [totalCaught, setTotalCaught] = useState(0);
  const [message, setMessage] = useState("");
  const [keysDown, setKeysDown] = useState<Set<string>>(new Set());
  const [taunts, setTaunts] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const playerRef = useRef<Position>({ x: 50, y: 50 });
  const brotherRef = useRef<Position>({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const mouseTargetRef = useRef<Position | null>(null);
  const playingRef = useRef(false);
  const speedRef = useRef(3.5);
  const invisibleRef = useRef(false);
  const stunnedRef = useRef(0);
  const trapRef = useRef<Position | null>(null);
  const tickRef = useRef(0);
  const stageRef = useRef(STAGES[0]);
  const powerUpsRef = useRef<PowerUp[]>([]);

  const stage = STAGES[stageIdx];

  const TAUNT_MSGS = [
    "야! 거기 서!!", "어딜 도망가!", "잡았다!!", "이리 와!!",
    "가만 안 둔다!", "느려~!", "도망쳐봤자야!", "형한테 덤벼?!",
  ];

  const clearAnim = useCallback(() => cancelAnimationFrame(animRef.current), []);
  useEffect(() => () => clearAnim(), [clearAnim]);

  // Start game
  const startGame = useCallback((idx: number) => {
    const s = STAGES[idx];
    stageRef.current = s;
    setStageIdx(idx);
    playerRef.current = { x: 50, y: s.h - 50 };
    brotherRef.current = { x: s.w / 2, y: 50 };
    setPlayerPos(playerRef.current);
    setBrotherPos(brotherRef.current);
    speedRef.current = 3.5;
    setPlayerSpeed(3.5);
    invisibleRef.current = false;
    setInvisible(false);
    stunnedRef.current = 0;
    setBrotherStunned(0);
    trapRef.current = null;
    setTrapPos(null);
    tickRef.current = 0;
    setTime(0);
    setDistance(0);
    setMessage("");
    setTaunts("");
    playingRef.current = true;
    powerUpId = 0;

    // Generate power-ups
    const pups: PowerUp[] = [];
    const types: PowerUp["type"][] = ["speed", "invisible", "trap", "teleport"];
    const emojis: Record<PowerUp["type"], string> = { speed: "⚡", invisible: "👻", trap: "🪤", teleport: "🌀" };
    for (let i = 0; i < 4; i++) {
      const type = types[i % types.length];
      pups.push({
        id: ++powerUpId,
        x: 80 + Math.random() * (s.w - 160),
        y: 80 + Math.random() * (s.h - 160),
        type, emoji: emojis[type], collected: false,
      });
    }
    powerUpsRef.current = pups;
    setPowerUps(pups);

    setScreen("playing");
    requestAnimationFrame(gameLoop);
  }, []);

  // Collision check with obstacles
  const collidesWithObstacle = useCallback((x: number, y: number, size: number, s: Stage): boolean => {
    for (const obs of s.obstacles) {
      if (x + size / 2 > obs.x && x - size / 2 < obs.x + obs.w &&
          y + size / 2 > obs.y && y - size / 2 < obs.y + obs.h) {
        return true;
      }
    }
    return false;
  }, []);

  // Pathfinding-lite: brother moves toward player, avoiding obstacles
  const moveBrother = useCallback((bro: Position, target: Position, speed: number, s: Stage): Position => {
    const dx = target.x - bro.x;
    const dy = target.y - bro.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return bro;

    const ndx = (dx / dist) * speed;
    const ndy = (dy / dist) * speed;

    // Try direct move
    let nx = bro.x + ndx;
    let ny = bro.y + ndy;

    if (!collidesWithObstacle(nx, ny, BROTHER_SIZE, s)) {
      return { x: nx, y: ny };
    }

    // Try horizontal only
    nx = bro.x + ndx;
    ny = bro.y;
    if (!collidesWithObstacle(nx, ny, BROTHER_SIZE, s)) {
      return { x: nx, y: ny };
    }

    // Try vertical only
    nx = bro.x;
    ny = bro.y + ndy;
    if (!collidesWithObstacle(nx, ny, BROTHER_SIZE, s)) {
      return { x: nx, y: ny };
    }

    // Try going around
    const angle = Math.atan2(dy, dx);
    for (const offset of [0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
      const a = angle + offset;
      nx = bro.x + Math.cos(a) * speed;
      ny = bro.y + Math.sin(a) * speed;
      if (!collidesWithObstacle(nx, ny, BROTHER_SIZE, s)) {
        return { x: nx, y: ny };
      }
    }

    return bro;
  }, [collidesWithObstacle]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!playingRef.current) return;
    tickRef.current++;
    const tick = tickRef.current;
    const s = stageRef.current;

    // Player movement
    const keys = keysRef.current;
    const spd = speedRef.current;
    let px = playerRef.current.x;
    let py = playerRef.current.y;

    // Mouse/touch target movement
    const mt = mouseTargetRef.current;
    if (mt) {
      const dx = mt.x - px;
      const dy = mt.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        px += (dx / dist) * spd;
        py += (dy / dist) * spd;
      }
    }

    // Keyboard movement (still supported)
    if (keys.has("ArrowUp") || keys.has("w")) { py -= spd; }
    if (keys.has("ArrowDown") || keys.has("s")) { py += spd; }
    if (keys.has("ArrowLeft") || keys.has("a")) { px -= spd; }
    if (keys.has("ArrowRight") || keys.has("d")) { px += spd; }

    // Bounds
    px = Math.max(PLAYER_SIZE / 2, Math.min(s.w - PLAYER_SIZE / 2, px));
    py = Math.max(PLAYER_SIZE / 2, Math.min(s.h - PLAYER_SIZE / 2, py));

    // Obstacle collision for player
    if (!collidesWithObstacle(px, py, PLAYER_SIZE, s)) {
      playerRef.current = { x: px, y: py };
    } else {
      // Try each axis separately
      if (!collidesWithObstacle(px, playerRef.current.y, PLAYER_SIZE, s)) {
        playerRef.current = { x: px, y: playerRef.current.y };
      } else if (!collidesWithObstacle(playerRef.current.x, py, PLAYER_SIZE, s)) {
        playerRef.current = { x: playerRef.current.x, y: py };
      }
    }

    // Brother movement
    if (stunnedRef.current > 0) {
      stunnedRef.current--;
      if (tick % 60 === 0) setBrotherStunned(stunnedRef.current);
    } else {
      const target = invisibleRef.current ? { x: s.w / 2, y: s.h / 2 } : playerRef.current;
      const broSpeed = s.brotherSpeed + tick * 0.0003;
      brotherRef.current = moveBrother(brotherRef.current, target, broSpeed, s);
    }

    // Trap check
    if (trapRef.current) {
      const td = Math.sqrt((brotherRef.current.x - trapRef.current.x) ** 2 + (brotherRef.current.y - trapRef.current.y) ** 2);
      if (td < 25) {
        stunnedRef.current = 120;
        setBrotherStunned(120);
        trapRef.current = null;
        setTrapPos(null);
        setMessage("🪤 형이 함정에 걸렸어!");
        setTimeout(() => setMessage(""), 1500);
      }
    }

    // Power-up collection
    for (const pu of powerUpsRef.current) {
      if (pu.collected) continue;
      const d = Math.sqrt((playerRef.current.x - pu.x) ** 2 + (playerRef.current.y - pu.y) ** 2);
      if (d < 20) {
        pu.collected = true;
        switch (pu.type) {
          case "speed":
            speedRef.current = Math.min(7, speedRef.current + 1.5);
            setPlayerSpeed(speedRef.current);
            setMessage("⚡ 속도 업!");
            setTimeout(() => {
              speedRef.current = 3.5;
              setPlayerSpeed(3.5);
            }, 5000);
            break;
          case "invisible":
            invisibleRef.current = true;
            setInvisible(true);
            setMessage("👻 투명 모드!");
            setTimeout(() => {
              invisibleRef.current = false;
              setInvisible(false);
            }, 4000);
            break;
          case "trap":
            trapRef.current = { ...playerRef.current };
            setTrapPos({ ...playerRef.current });
            setMessage("🪤 함정 설치!");
            break;
          case "teleport":
            const nx = 50 + Math.random() * (s.w - 100);
            const ny = 50 + Math.random() * (s.h - 100);
            if (!collidesWithObstacle(nx, ny, PLAYER_SIZE, s)) {
              playerRef.current = { x: nx, y: ny };
            }
            setMessage("🌀 텔레포트!");
            break;
        }
        setPowerUps([...powerUpsRef.current]);
        setTimeout(() => setMessage(""), 1500);
      }
    }

    // Brother taunts
    if (tick % 180 === 0) {
      setTaunts(TAUNT_MSGS[Math.floor(Math.random() * TAUNT_MSGS.length)]);
      setTimeout(() => setTaunts(""), 1200);
    }

    // Check caught
    const catchDist = Math.sqrt(
      (playerRef.current.x - brotherRef.current.x) ** 2 +
      (playerRef.current.y - brotherRef.current.y) ** 2
    );
    if (catchDist < (PLAYER_SIZE + BROTHER_SIZE) / 2 && stunnedRef.current <= 0) {
      playingRef.current = false;
      setTotalCaught((c) => c + 1);
      setScreen("caught");
      return;
    }

    // Check escape (reached exit)
    const exitDist = Math.sqrt(
      (playerRef.current.x - s.exitX) ** 2 +
      (playerRef.current.y - s.exitY) ** 2
    );
    if (exitDist < 25) {
      playingRef.current = false;
      const timeVal = Math.floor(tick * TICK_MS / 1000 * 10) / 10;
      setTime(timeVal);
      setTotalEscapes((e) => e + 1);
      setBestTimes((prev) => {
        const next = [...prev];
        if (next[stageIdx] === 0 || timeVal < next[stageIdx]) next[stageIdx] = timeVal;
        return next;
      });
      setScreen("escaped");
      return;
    }

    // Update state periodically
    if (tick % 3 === 0) {
      setPlayerPos({ ...playerRef.current });
      setBrotherPos({ ...brotherRef.current });
      setDistance(Math.floor(exitDist));
    }
    if (tick % 60 === 0) {
      setTime(Math.floor(tick * TICK_MS / 1000 * 10) / 10);
    }

    // Draw
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [collidesWithObstacle, moveBrother, stageIdx]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stageRef.current;

    // Camera follows player
    const camX = Math.max(0, Math.min(s.w - VIEW_W, playerRef.current.x - VIEW_W / 2));
    const camY = Math.max(0, Math.min(s.h - VIEW_H, playerRef.current.y - VIEW_H / 2));

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // Floor
    ctx.fillStyle = "#2a1f1a";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Floor tiles
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = -camX % 40; x < VIEW_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke();
    }
    for (let y = -camY % 40; y < VIEW_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
    }

    // Obstacles
    for (const obs of s.obstacles) {
      const ox = obs.x - camX;
      const oy = obs.y - camY;
      if (ox + obs.w < -20 || ox > VIEW_W + 20 || oy + obs.h < -20 || oy > VIEW_H + 20) continue;

      ctx.fillStyle = "rgba(80,60,40,0.8)";
      ctx.beginPath();
      ctx.roundRect(ox, oy, obs.w, obs.h, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `${Math.min(obs.w, obs.h) * 0.6}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obs.emoji, ox + obs.w / 2, oy + obs.h / 2);
    }

    // Exit
    const ex = s.exitX - camX;
    const ey = s.exitY - camY;
    ctx.fillStyle = "rgba(0,255,100,0.2)";
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,255,100,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚪", ex, ey);

    // Power-ups
    for (const pu of powerUpsRef.current) {
      if (pu.collected) continue;
      const px = pu.x - camX;
      const py = pu.y - camY;
      if (px < -20 || px > VIEW_W + 20 || py < -20 || py > VIEW_H + 20) continue;
      ctx.font = "20px serif";
      ctx.fillText(pu.emoji, px, py);
    }

    // Trap
    if (trapRef.current) {
      const tx = trapRef.current.x - camX;
      const ty = trapRef.current.y - camY;
      ctx.font = "20px serif";
      ctx.fillText("🪤", tx, ty);
    }

    // Brother
    const bx = brotherRef.current.x - camX;
    const by = brotherRef.current.y - camY;
    if (stunnedRef.current > 0) {
      ctx.fillStyle = "rgba(255,255,0,0.2)";
      ctx.beginPath();
      ctx.arc(bx, by, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "32px serif";
    ctx.fillText(stunnedRef.current > 0 ? "😵" : "😡", bx, by);

    // Taunt bubble
    if (taunts && bx > -50 && bx < VIEW_W + 50 && by > -50 && by < VIEW_H + 50) {
      ctx.fillStyle = "rgba(255,50,50,0.8)";
      ctx.beginPath();
      ctx.roundRect(bx - 45, by - 45, 90, 22, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(taunts, bx, by - 34);
    }

    // Player
    const ppx = playerRef.current.x - camX;
    const ppy = playerRef.current.y - camY;
    if (invisibleRef.current) {
      ctx.globalAlpha = 0.3;
    }
    ctx.font = "28px serif";
    ctx.fillText("🏃", ppx, ppy);
    ctx.globalAlpha = 1;

    // Minimap
    const mmW = 70;
    const mmH = Math.floor(mmW * (s.h / s.w));
    const mmX = VIEW_W - mmW - 8;
    const mmY = 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // Minimap obstacles
    ctx.fillStyle = "rgba(139,90,43,0.5)";
    for (const obs of s.obstacles) {
      ctx.fillRect(mmX + (obs.x / s.w) * mmW, mmY + (obs.y / s.h) * mmH, Math.max(2, (obs.w / s.w) * mmW), Math.max(2, (obs.h / s.h) * mmH));
    }

    // Minimap exit
    ctx.fillStyle = "#00ff66";
    ctx.beginPath();
    ctx.arc(mmX + (s.exitX / s.w) * mmW, mmY + (s.exitY / s.h) * mmH, 3, 0, Math.PI * 2);
    ctx.fill();

    // Minimap player
    ctx.fillStyle = "#00bfff";
    ctx.beginPath();
    ctx.arc(mmX + (playerRef.current.x / s.w) * mmW, mmY + (playerRef.current.y / s.h) * mmH, 3, 0, Math.PI * 2);
    ctx.fill();

    // Minimap brother
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.arc(mmX + (brotherRef.current.x / s.w) * mmW, mmY + (brotherRef.current.y / s.h) * mmH, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [taunts]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Mouse → world coordinate conversion
  const screenToWorld = useCallback((clientX: number, clientY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const s = stageRef.current;
    const camX = Math.max(0, Math.min(s.w - VIEW_W, playerRef.current.x - VIEW_W / 2));
    const camY = Math.max(0, Math.min(s.h - VIEW_H, playerRef.current.y - VIEW_H / 2));
    return { x: sx + camX, y: sy + camY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseTargetRef.current = screenToWorld(e.clientX, e.clientY);
  }, [screenToWorld]);

  const handleMouseLeave = useCallback(() => {
    mouseTargetRef.current = null;
  }, []);

  // Touch → same mouse target
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseTargetRef.current = screenToWorld(t.clientX, t.clientY);
  }, [screenToWorld]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mouseTargetRef.current = screenToWorld(t.clientX, t.clientY);
  }, [screenToWorld]);

  const handleTouchEnd = useCallback(() => {
    mouseTargetRef.current = null;
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-zinc-950 via-stone-900 to-zinc-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🏃💨</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">형한테서 도망치기</span>
          </h1>
          <p className="text-lg text-slate-400">형한테 잡히기 전에 탈출해!</p>

          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-bold text-orange-400">🗺️ 스테이지 선택</p>
            {STAGES.map((s, i) => (
              <button key={i} onClick={() => startGame(i)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-white/10 bg-white/5 p-3 text-left transition-all hover:border-orange-500/50 hover:bg-orange-500/10 active:scale-[0.98]">
                <span className="text-3xl">{s.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                  <p className="text-xs text-slate-500">형 속도: {"⚡".repeat(Math.ceil(s.brotherSpeed))}</p>
                </div>
                {bestTimes[i] > 0 && <span className="text-xs text-green-400 font-bold">🏆 {bestTimes[i]}초</span>}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white/5 px-6 py-3 space-y-1">
            <p className="text-sm text-slate-400">🏃 탈출: <span className="font-bold text-green-400">{totalEscapes}</span></p>
            <p className="text-sm text-slate-400">😡 잡힘: <span className="font-bold text-red-400">{totalCaught}</span></p>
          </div>

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-3 text-left text-xs text-slate-400 space-y-1">
            <p className="font-bold text-orange-400">🎮 조작법</p>
            <p>🖱️ 마우스를 따라 이동</p>
            <p>📱 터치한 곳으로 이동</p>
            <p>⌨️ WASD / 방향키도 가능</p>
            <p>⚡ 속도업 👻 투명 🪤 함정 🌀 텔레포트 아이템!</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-2">
          <div className="mb-1 flex w-full max-w-[360px] items-center justify-between text-xs">
            <span className="rounded-lg bg-black/30 px-2 py-1">{stage.emoji} {stage.name}</span>
            <span className="rounded-lg bg-black/30 px-2 py-1">⏱️ {time}초</span>
            <span className="rounded-lg bg-black/30 px-2 py-1">🚪 {distance}m</span>
          </div>

          {message && (
            <div className="mb-1 rounded-lg bg-white/10 px-4 py-1 text-center text-sm font-bold">{message}</div>
          )}

          {invisible && (
            <div className="mb-1 rounded-lg bg-purple-500/20 px-3 py-1 text-xs text-purple-300 font-bold animate-pulse">👻 투명 모드!</div>
          )}

          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            className="rounded-2xl border-2 border-orange-500/20 touch-none cursor-none"
            style={{ width: VIEW_W, height: VIEW_H }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Mobile D-pad */}
          <div className="mt-2 grid grid-cols-3 gap-1 w-[150px]">
            <div />
            <button onPointerDown={() => keysRef.current.add("arrowup")} onPointerUp={() => keysRef.current.delete("arrowup")} onPointerLeave={() => keysRef.current.delete("arrowup")}
              className="rounded-lg bg-white/10 py-3 text-center text-lg active:bg-white/20">⬆️</button>
            <div />
            <button onPointerDown={() => keysRef.current.add("arrowleft")} onPointerUp={() => keysRef.current.delete("arrowleft")} onPointerLeave={() => keysRef.current.delete("arrowleft")}
              className="rounded-lg bg-white/10 py-3 text-center text-lg active:bg-white/20">⬅️</button>
            <button onPointerDown={() => keysRef.current.add("arrowdown")} onPointerUp={() => keysRef.current.delete("arrowdown")} onPointerLeave={() => keysRef.current.delete("arrowdown")}
              className="rounded-lg bg-white/10 py-3 text-center text-lg active:bg-white/20">⬇️</button>
            <button onPointerDown={() => keysRef.current.add("arrowright")} onPointerUp={() => keysRef.current.delete("arrowright")} onPointerLeave={() => keysRef.current.delete("arrowright")}
              className="rounded-lg bg-white/10 py-3 text-center text-lg active:bg-white/20">➡️</button>
          </div>
        </div>
      )}

      {/* Caught */}
      {screen === "caught" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">😡👊</div>
          <h2 className="text-4xl font-black text-red-400">잡혔다!</h2>
          <p className="text-lg text-slate-300">형한테 꿀밤 맞았어요... 💫</p>
          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>⏱️ 시간: <span className="font-bold text-cyan-400">{time}초</span></p>
            <p>📏 출구까지: <span className="font-bold text-amber-400">{distance}m</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => startGame(stageIdx)} className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">🔄 재도전</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">메뉴</button>
          </div>
        </div>
      )}

      {/* Escaped */}
      {screen === "escaped" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🎉🏃💨</div>
          <h2 className="text-4xl font-black text-green-400">탈출 성공!</h2>
          <p className="text-lg text-slate-300">형한테서 도망쳤어요!</p>
          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>⏱️ 시간: <span className="font-bold text-cyan-400">{time}초</span></p>
            <p>🗺️ 스테이지: <span className="font-bold text-amber-400">{stage.emoji} {stage.name}</span></p>
            {bestTimes[stageIdx] === time && <p className="text-amber-400 font-bold">🏆 최고 기록!</p>}
          </div>
          <div className="flex gap-3">
            {stageIdx < STAGES.length - 1 && (
              <button onClick={() => startGame(stageIdx + 1)} className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                ➡️ 다음 스테이지
              </button>
            )}
            <button onClick={() => startGame(stageIdx)} className="rounded-xl bg-orange-500/30 px-6 py-3 font-bold text-orange-400 transition-transform hover:scale-105 active:scale-95">🔄 재도전</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95">메뉴</button>
          </div>
        </div>
      )}
    </div>
  );
}
