"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";

/* ───── 상수 ───── */
const TILE = 40;
const PLAYER_W = 36;
const PLAYER_H = 40;
const GRAVITY = 0.55;
const JUMP_FORCE = -12;
const DOUBLE_JUMP_FORCE = -10;
const MOVE_SPEED = 4.5;
const MAX_FALL = 14;
const VIEWPORT_W = 800;
const VIEWPORT_H = 500;
const ENEMY_SPEED = 1.2;
const COIN_SIZE = 28;
const ENEMY_W = 36;
const ENEMY_H = 36;
const FLAG_W = 40;
const FLAG_H = 80;
const GROUND_Y = VIEWPORT_H - TILE;

/* ───── 타입 ───── */
interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "ground" | "brick" | "pipe";
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  id: number;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: number;
  minX: number;
  maxX: number;
  alive: boolean;
  id: number;
  squishTimer: number;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Mountain {
  x: number;
  h: number;
  w: number;
}

interface LevelData {
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  flagX: number;
  levelWidth: number;
  bgColor: string;
}

/* ───── 레벨 데이터 ───── */
function makeLevels(): LevelData[] {
  let coinId = 0;
  let enemyId = 0;

  // 레벨 1: 초원 (쉬움)
  const level1Width = 4800;
  const l1Platforms: Platform[] = [
    // 바닥 (중간에 구멍 있음)
    { x: 0, y: GROUND_Y, w: 600, h: TILE, type: "ground" },
    { x: 720, y: GROUND_Y, w: 800, h: TILE, type: "ground" },
    { x: 1640, y: GROUND_Y, w: 1000, h: TILE, type: "ground" },
    { x: 2760, y: GROUND_Y, w: 600, h: TILE, type: "ground" },
    { x: 3480, y: GROUND_Y, w: 1320, h: TILE, type: "ground" },
    // 공중 플랫폼
    { x: 300, y: 340, w: 160, h: 24, type: "brick" },
    { x: 520, y: 280, w: 120, h: 24, type: "brick" },
    { x: 900, y: 320, w: 200, h: 24, type: "brick" },
    { x: 1200, y: 260, w: 160, h: 24, type: "brick" },
    { x: 1500, y: 340, w: 120, h: 24, type: "brick" },
    { x: 1800, y: 300, w: 200, h: 24, type: "brick" },
    { x: 2100, y: 260, w: 160, h: 24, type: "brick" },
    { x: 2400, y: 320, w: 160, h: 24, type: "brick" },
    { x: 2700, y: 280, w: 120, h: 24, type: "brick" },
    { x: 3000, y: 340, w: 200, h: 24, type: "brick" },
    { x: 3300, y: 260, w: 160, h: 24, type: "brick" },
    { x: 3600, y: 300, w: 200, h: 24, type: "brick" },
    // 파이프
    { x: 480, y: GROUND_Y - 60, w: 60, h: 60, type: "pipe" },
    { x: 1100, y: GROUND_Y - 80, w: 60, h: 80, type: "pipe" },
    { x: 2000, y: GROUND_Y - 60, w: 60, h: 60, type: "pipe" },
  ];
  const l1Coins: Coin[] = [
    { x: 340, y: 300, collected: false, id: coinId++ },
    { x: 380, y: 300, collected: false, id: coinId++ },
    { x: 420, y: 300, collected: false, id: coinId++ },
    { x: 550, y: 240, collected: false, id: coinId++ },
    { x: 950, y: 280, collected: false, id: coinId++ },
    { x: 1000, y: 280, collected: false, id: coinId++ },
    { x: 1250, y: 220, collected: false, id: coinId++ },
    { x: 1850, y: 260, collected: false, id: coinId++ },
    { x: 1900, y: 260, collected: false, id: coinId++ },
    { x: 2150, y: 220, collected: false, id: coinId++ },
    { x: 2450, y: 280, collected: false, id: coinId++ },
    { x: 3050, y: 300, collected: false, id: coinId++ },
    { x: 3350, y: 220, collected: false, id: coinId++ },
    { x: 3650, y: 260, collected: false, id: coinId++ },
    { x: 3700, y: 260, collected: false, id: coinId++ },
  ];
  const l1Enemies: Enemy[] = [
    { x: 800, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 720, maxX: 1100, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 1700, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 1640, maxX: 2200, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 2900, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 2760, maxX: 3200, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 3600, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 3480, maxX: 4200, alive: true, id: enemyId++, squishTimer: 0 },
  ];

  // 레벨 2: 지하 (보통)
  const level2Width = 5600;
  const l2Platforms: Platform[] = [
    { x: 0, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 520, y: GROUND_Y, w: 600, h: TILE, type: "ground" },
    { x: 1240, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 1760, y: GROUND_Y, w: 800, h: TILE, type: "ground" },
    { x: 2680, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 3200, y: GROUND_Y, w: 600, h: TILE, type: "ground" },
    { x: 3920, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 4440, y: GROUND_Y, w: 1160, h: TILE, type: "ground" },
    // 공중 플랫폼 - 더 많은 점프 필요
    { x: 200, y: 340, w: 120, h: 24, type: "brick" },
    { x: 440, y: 280, w: 100, h: 24, type: "brick" },
    { x: 700, y: 300, w: 160, h: 24, type: "brick" },
    { x: 1000, y: 240, w: 120, h: 24, type: "brick" },
    { x: 1300, y: 320, w: 100, h: 24, type: "brick" },
    { x: 1550, y: 260, w: 140, h: 24, type: "brick" },
    { x: 1900, y: 300, w: 160, h: 24, type: "brick" },
    { x: 2200, y: 220, w: 120, h: 24, type: "brick" },
    { x: 2500, y: 300, w: 100, h: 24, type: "brick" },
    { x: 2800, y: 260, w: 160, h: 24, type: "brick" },
    { x: 3100, y: 340, w: 120, h: 24, type: "brick" },
    { x: 3400, y: 280, w: 200, h: 24, type: "brick" },
    { x: 3700, y: 220, w: 120, h: 24, type: "brick" },
    { x: 4000, y: 300, w: 160, h: 24, type: "brick" },
    { x: 4300, y: 260, w: 140, h: 24, type: "brick" },
    { x: 4600, y: 320, w: 120, h: 24, type: "brick" },
    // 파이프
    { x: 600, y: GROUND_Y - 80, w: 60, h: 80, type: "pipe" },
    { x: 1800, y: GROUND_Y - 100, w: 60, h: 100, type: "pipe" },
    { x: 3300, y: GROUND_Y - 60, w: 60, h: 60, type: "pipe" },
    { x: 4500, y: GROUND_Y - 80, w: 60, h: 80, type: "pipe" },
  ];
  const l2Coins: Coin[] = [
    { x: 240, y: 300, collected: false, id: coinId++ },
    { x: 470, y: 240, collected: false, id: coinId++ },
    { x: 750, y: 260, collected: false, id: coinId++ },
    { x: 800, y: 260, collected: false, id: coinId++ },
    { x: 1040, y: 200, collected: false, id: coinId++ },
    { x: 1580, y: 220, collected: false, id: coinId++ },
    { x: 1950, y: 260, collected: false, id: coinId++ },
    { x: 2240, y: 180, collected: false, id: coinId++ },
    { x: 2840, y: 220, collected: false, id: coinId++ },
    { x: 2880, y: 220, collected: false, id: coinId++ },
    { x: 3450, y: 240, collected: false, id: coinId++ },
    { x: 3500, y: 240, collected: false, id: coinId++ },
    { x: 3740, y: 180, collected: false, id: coinId++ },
    { x: 4050, y: 260, collected: false, id: coinId++ },
    { x: 4340, y: 220, collected: false, id: coinId++ },
    { x: 4640, y: 280, collected: false, id: coinId++ },
    { x: 4900, y: GROUND_Y - 50, collected: false, id: coinId++ },
    { x: 4950, y: GROUND_Y - 50, collected: false, id: coinId++ },
  ];
  const l2Enemies: Enemy[] = [
    { x: 600, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 520, maxX: 1000, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 1300, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 1240, maxX: 1560, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 1900, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 1760, maxX: 2400, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 2100, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 1760, maxX: 2400, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 2800, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 2680, maxX: 3000, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 3400, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 3200, maxX: 3700, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 4600, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 4440, maxX: 5200, alive: true, id: enemyId++, squishTimer: 0 },
  ];

  // 레벨 3: 하늘 (어려움)
  const level3Width = 6400;
  const l3Platforms: Platform[] = [
    { x: 0, y: GROUND_Y, w: 300, h: TILE, type: "ground" },
    { x: 420, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 740, y: GROUND_Y, w: 300, h: TILE, type: "ground" },
    { x: 1160, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 1480, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 2000, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 2320, y: GROUND_Y, w: 300, h: TILE, type: "ground" },
    { x: 2740, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 3060, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 3580, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 3900, y: GROUND_Y, w: 300, h: TILE, type: "ground" },
    { x: 4320, y: GROUND_Y, w: 200, h: TILE, type: "ground" },
    { x: 4640, y: GROUND_Y, w: 400, h: TILE, type: "ground" },
    { x: 5160, y: GROUND_Y, w: 1240, h: TILE, type: "ground" },
    // 많은 공중 플랫폼
    { x: 100, y: 340, w: 100, h: 24, type: "brick" },
    { x: 320, y: 280, w: 80, h: 24, type: "brick" },
    { x: 500, y: 320, w: 100, h: 24, type: "brick" },
    { x: 700, y: 240, w: 120, h: 24, type: "brick" },
    { x: 950, y: 300, w: 80, h: 24, type: "brick" },
    { x: 1100, y: 220, w: 100, h: 24, type: "brick" },
    { x: 1350, y: 280, w: 120, h: 24, type: "brick" },
    { x: 1600, y: 320, w: 100, h: 24, type: "brick" },
    { x: 1800, y: 240, w: 80, h: 24, type: "brick" },
    { x: 2050, y: 300, w: 120, h: 24, type: "brick" },
    { x: 2300, y: 220, w: 100, h: 24, type: "brick" },
    { x: 2550, y: 280, w: 80, h: 24, type: "brick" },
    { x: 2800, y: 340, w: 120, h: 24, type: "brick" },
    { x: 3100, y: 260, w: 100, h: 24, type: "brick" },
    { x: 3350, y: 200, w: 80, h: 24, type: "brick" },
    { x: 3600, y: 300, w: 120, h: 24, type: "brick" },
    { x: 3850, y: 240, w: 100, h: 24, type: "brick" },
    { x: 4100, y: 320, w: 80, h: 24, type: "brick" },
    { x: 4350, y: 260, w: 120, h: 24, type: "brick" },
    { x: 4600, y: 200, w: 100, h: 24, type: "brick" },
    { x: 4850, y: 300, w: 80, h: 24, type: "brick" },
    { x: 5100, y: 240, w: 120, h: 24, type: "brick" },
    { x: 5400, y: 280, w: 100, h: 24, type: "brick" },
    { x: 5700, y: 320, w: 120, h: 24, type: "brick" },
    // 파이프
    { x: 800, y: GROUND_Y - 60, w: 60, h: 60, type: "pipe" },
    { x: 1500, y: GROUND_Y - 100, w: 60, h: 100, type: "pipe" },
    { x: 2400, y: GROUND_Y - 80, w: 60, h: 80, type: "pipe" },
    { x: 3100, y: GROUND_Y - 60, w: 60, h: 60, type: "pipe" },
    { x: 4700, y: GROUND_Y - 100, w: 60, h: 100, type: "pipe" },
  ];
  const l3Coins: Coin[] = [];
  for (let i = 0; i < 25; i++) {
    l3Coins.push({
      x: 200 + i * 240,
      y: 180 + Math.sin(i * 1.2) * 80,
      collected: false,
      id: coinId++,
    });
  }
  const l3Enemies: Enemy[] = [
    { x: 500, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 420, maxX: 600, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 800, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 740, maxX: 1000, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 1200, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 1160, maxX: 1340, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 1600, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 1480, maxX: 1800, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 2050, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 2000, maxX: 2180, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 2400, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 2320, maxX: 2580, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 3100, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 3060, maxX: 3400, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 3300, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 3060, maxX: 3400, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 3950, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 3900, maxX: 4180, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 4700, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 4640, maxX: 5000, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 5300, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: -1, minX: 5160, maxX: 5800, alive: true, id: enemyId++, squishTimer: 0 },
    { x: 5600, y: GROUND_Y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, dir: 1, minX: 5160, maxX: 5800, alive: true, id: enemyId++, squishTimer: 0 },
  ];

  return [
    { platforms: l1Platforms, coins: l1Coins, enemies: l1Enemies, flagX: level1Width - 200, levelWidth: level1Width, bgColor: "#5c94fc" },
    { platforms: l2Platforms, coins: l2Coins, enemies: l2Enemies, flagX: level2Width - 200, levelWidth: level2Width, bgColor: "#1a1a2e" },
    { platforms: l3Platforms, coins: l3Coins, enemies: l3Enemies, flagX: level3Width - 200, levelWidth: level3Width, bgColor: "#87ceeb" },
  ];
}

/* ───── 배경 생성 ───── */
function makeClouds(levelWidth: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < Math.floor(levelWidth / 300); i++) {
    clouds.push({
      x: i * 300 + Math.random() * 200,
      y: 30 + Math.random() * 120,
      size: 40 + Math.random() * 30,
      speed: 0.2 + Math.random() * 0.3,
    });
  }
  return clouds;
}

function makeMountains(levelWidth: number): Mountain[] {
  const mountains: Mountain[] = [];
  for (let i = 0; i < Math.floor(levelWidth / 400); i++) {
    mountains.push({
      x: i * 400 + Math.random() * 100,
      h: 60 + Math.random() * 80,
      w: 120 + Math.random() * 100,
    });
  }
  return mountains;
}

/* ───── 게임 상태 ───── */
interface GameState {
  // 플레이어
  px: number;
  py: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumps: number; // 0, 1, 2 (더블점프 가능)
  facingRight: boolean;
  // 카메라
  camX: number;
  // 게임
  screen: "start" | "playing" | "levelClear" | "gameover" | "win";
  lives: number;
  score: number;
  coinCount: number;
  level: number;
  invincible: number; // 무적 타이머 (데미지 후)
  // 레벨 데이터 (복사본)
  coins: Coin[];
  enemies: Enemy[];
  // 배경
  clouds: Cloud[];
  mountains: Mountain[];
  // 애니메이션
  walkFrame: number;
  walkTimer: number;
}

function initState(level: number, lives: number, score: number, coinCount: number): GameState {
  const levels = makeLevels();
  const lv = levels[level];
  return {
    px: 80,
    py: GROUND_Y - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    jumps: 0,
    facingRight: true,
    camX: 0,
    screen: "playing",
    lives,
    score,
    coinCount,
    level,
    invincible: 0,
    coins: lv.coins.map((c) => ({ ...c, collected: false })),
    enemies: lv.enemies.map((e) => ({ ...e, alive: true, squishTimer: 0 })),
    clouds: makeClouds(lv.levelWidth),
    mountains: makeMountains(lv.levelWidth),
    walkFrame: 0,
    walkTimer: 0,
  };
}

/* ───── 메인 컴포넌트 ───── */
export default function MarioGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState(0, 3, 0, 0));
  const keysRef = useRef<Set<string>>(new Set());
  const levelsRef = useRef<LevelData[]>(makeLevels());
  const rafRef = useRef<number>(0);
  const [, setTick] = useState(0);
  const touchRef = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false,
  });
  const jumpPressedRef = useRef(false);

  const forceRender = useCallback(() => setTick((t) => t + 1), []);

  /* ───── 키 입력 ───── */
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      const s = stateRef.current;
      // 점프 입력 (눌렀을 때만)
      if ((e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") && !e.repeat) {
        if (s.screen === "playing") {
          tryJump(s);
        }
      }
      // 화면 전환
      if (e.key === "Enter" || e.key === " ") {
        if (s.screen === "start") {
          stateRef.current = initState(0, 3, 0, 0);
          forceRender();
        } else if (s.screen === "levelClear") {
          const nextLevel = s.level + 1;
          if (nextLevel >= levelsRef.current.length) {
            s.screen = "win";
          } else {
            stateRef.current = initState(nextLevel, s.lives, s.score, s.coinCount);
          }
          forceRender();
        } else if (s.screen === "gameover" || s.screen === "win") {
          stateRef.current = initState(0, 3, 0, 0);
          stateRef.current.screen = "start";
          forceRender();
        }
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [forceRender]);

  function tryJump(s: GameState) {
    if (s.jumps < 1) {
      s.vy = JUMP_FORCE;
      s.onGround = false;
      s.jumps = 1;
    } else if (s.jumps < 2) {
      s.vy = DOUBLE_JUMP_FORCE;
      s.jumps = 2;
    }
  }

  /* ───── 게임 루프 ───── */
  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    const levels = levelsRef.current;
    const keys = keysRef.current;
    const touch = touchRef.current;

    if (s.screen !== "playing") {
      draw();
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const lv = levels[s.level];

    // 터치 점프 처리
    if (touch.jump && !jumpPressedRef.current) {
      jumpPressedRef.current = true;
      tryJump(s);
    }
    if (!touch.jump) {
      jumpPressedRef.current = false;
    }

    // 이동
    let moveDir = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || touch.left) moveDir -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D") || touch.right) moveDir += 1;

    s.vx = moveDir * MOVE_SPEED;
    if (moveDir !== 0) s.facingRight = moveDir > 0;

    // 걷기 애니메이션
    if (moveDir !== 0 && s.onGround) {
      s.walkTimer++;
      if (s.walkTimer > 6) {
        s.walkTimer = 0;
        s.walkFrame = (s.walkFrame + 1) % 4;
      }
    } else {
      s.walkFrame = 0;
      s.walkTimer = 0;
    }

    // 중력
    s.vy += GRAVITY;
    if (s.vy > MAX_FALL) s.vy = MAX_FALL;

    // 이동 적용
    s.px += s.vx;
    s.py += s.vy;

    // 벽 충돌
    if (s.px < 0) s.px = 0;
    if (s.px + PLAYER_W > lv.levelWidth) s.px = lv.levelWidth - PLAYER_W;

    // 플랫폼 충돌
    s.onGround = false;
    for (const plat of lv.platforms) {
      const playerBottom = s.py + PLAYER_H;
      const playerRight = s.px + PLAYER_W;
      const playerLeft = s.px;
      const platRight = plat.x + plat.w;
      const platBottom = plat.y + plat.h;

      // 수평 겹침 확인
      if (playerRight > plat.x + 4 && playerLeft < platRight - 4) {
        // 위에서 착지
        if (
          playerBottom >= plat.y &&
          playerBottom <= plat.y + 16 &&
          s.vy >= 0
        ) {
          s.py = plat.y - PLAYER_H;
          s.vy = 0;
          s.onGround = true;
          s.jumps = 0;
        }
        // 아래에서 머리 부딪힘
        else if (
          s.py <= platBottom &&
          s.py >= platBottom - 10 &&
          s.vy < 0
        ) {
          s.py = platBottom;
          s.vy = 0;
        }
      }

      // 옆면 충돌
      if (s.py + PLAYER_H > plat.y + 4 && s.py < platBottom - 4) {
        // 왼쪽 벽
        if (
          playerRight > plat.x &&
          playerRight < plat.x + 10 &&
          s.vx > 0
        ) {
          s.px = plat.x - PLAYER_W;
        }
        // 오른쪽 벽
        if (
          playerLeft < platRight &&
          playerLeft > platRight - 10 &&
          s.vx < 0
        ) {
          s.px = platRight;
        }
      }
    }

    // 구멍에 빠짐
    if (s.py > VIEWPORT_H + 50) {
      s.lives--;
      if (s.lives <= 0) {
        s.screen = "gameover";
      } else {
        // 리스폰
        s.px = 80;
        s.py = GROUND_Y - PLAYER_H;
        s.vx = 0;
        s.vy = 0;
        s.camX = 0;
        s.invincible = 120;
        s.jumps = 0;
      }
      forceRender();
    }

    // 무적 타이머
    if (s.invincible > 0) s.invincible--;

    // 코인 수집
    for (const coin of s.coins) {
      if (coin.collected) continue;
      const cx = coin.x + COIN_SIZE / 2;
      const cy = coin.y + COIN_SIZE / 2;
      const px = s.px + PLAYER_W / 2;
      const py = s.py + PLAYER_H / 2;
      const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
      if (dist < 28) {
        coin.collected = true;
        s.coinCount++;
        s.score += 100;
      }
    }

    // 적 이동 & 충돌
    for (const enemy of s.enemies) {
      if (!enemy.alive) {
        if (enemy.squishTimer > 0) enemy.squishTimer--;
        continue;
      }

      // 적 이동
      enemy.x += ENEMY_SPEED * enemy.dir;
      if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
        enemy.dir *= -1;
      }

      // 플레이어와 충돌
      const overlapX =
        s.px + PLAYER_W > enemy.x + 4 && s.px < enemy.x + enemy.w - 4;
      const overlapY =
        s.py + PLAYER_H > enemy.y + 4 && s.py < enemy.y + enemy.h - 4;

      if (overlapX && overlapY) {
        // 위에서 밟음
        const playerBottom = s.py + PLAYER_H;
        if (
          s.vy > 0 &&
          playerBottom < enemy.y + enemy.h / 2
        ) {
          enemy.alive = false;
          enemy.squishTimer = 30;
          s.vy = JUMP_FORCE * 0.6;
          s.score += 200;
          s.jumps = 0;
        } else if (s.invincible <= 0) {
          // 피격
          s.lives--;
          s.invincible = 120;
          if (s.lives <= 0) {
            s.screen = "gameover";
            forceRender();
          } else {
            // 넉백
            s.vy = -8;
            s.vx = s.px < enemy.x ? -5 : 5;
          }
        }
      }
    }

    // 깃발 도달
    if (s.px + PLAYER_W > lv.flagX && s.px < lv.flagX + FLAG_W) {
      s.score += 1000;
      if (s.level + 1 >= levels.length) {
        s.screen = "win";
      } else {
        s.screen = "levelClear";
      }
      forceRender();
    }

    // 카메라
    const targetCamX = s.px - VIEWPORT_W / 3;
    s.camX += (targetCamX - s.camX) * 0.1;
    if (s.camX < 0) s.camX = 0;
    if (s.camX > lv.levelWidth - VIEWPORT_W) s.camX = lv.levelWidth - VIEWPORT_W;

    // 구름 이동
    for (const cloud of s.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > lv.levelWidth + 100) cloud.x = -100;
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [forceRender]);

  /* ───── 그리기 ───── */
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const levels = levelsRef.current;

    // 오버레이 화면들
    if (s.screen === "start") {
      drawStartScreen(ctx);
      return;
    }
    if (s.screen === "gameover") {
      drawGameOverScreen(ctx);
      return;
    }
    if (s.screen === "win") {
      drawWinScreen(ctx);
      return;
    }
    if (s.screen === "levelClear") {
      drawLevelClearScreen(ctx);
      return;
    }

    const lv = levels[s.level];

    // 배경
    ctx.fillStyle = lv.bgColor;
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    // 산 (패럴랙스 0.3)
    const mtOffset = s.camX * 0.3;
    ctx.fillStyle = s.level === 1 ? "#2d2d4e" : "#4a8c3f";
    for (const mt of s.mountains) {
      const mx = mt.x - mtOffset;
      if (mx > VIEWPORT_W + 200 || mx + mt.w < -200) continue;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y);
      ctx.lineTo(mx + mt.w / 2, GROUND_Y - mt.h);
      ctx.lineTo(mx + mt.w, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      // 눈 덮인 꼭대기
      if (s.level !== 1) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(mx + mt.w / 2 - 10, GROUND_Y - mt.h + 15);
        ctx.lineTo(mx + mt.w / 2, GROUND_Y - mt.h);
        ctx.lineTo(mx + mt.w / 2 + 10, GROUND_Y - mt.h + 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = s.level === 1 ? "#2d2d4e" : "#4a8c3f";
      }
    }

    // 구름 (패럴랙스 0.5)
    const cloudOffset = s.camX * 0.5;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const cl of s.clouds) {
      const cx = cl.x - cloudOffset;
      if (cx > VIEWPORT_W + 100 || cx + cl.size * 2 < -100) continue;
      // 구름 3개 원으로
      const r = cl.size / 2;
      ctx.beginPath();
      ctx.arc(cx, cl.y, r, 0, Math.PI * 2);
      ctx.arc(cx + r, cl.y - r * 0.4, r * 0.8, 0, Math.PI * 2);
      ctx.arc(cx + r * 1.5, cl.y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    const cam = s.camX;

    // 플랫폼
    for (const plat of lv.platforms) {
      const px = plat.x - cam;
      if (px > VIEWPORT_W + 10 || px + plat.w < -10) continue;

      if (plat.type === "ground") {
        // 풀 바닥
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(px, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#228B22";
        ctx.fillRect(px, plat.y, plat.w, 8);
        // 흙 패턴
        ctx.fillStyle = "#A0522D";
        for (let i = 0; i < plat.w; i += 20) {
          ctx.fillRect(px + i + 5, plat.y + 15, 8, 4);
        }
      } else if (plat.type === "brick") {
        // 벽돌
        ctx.fillStyle = "#C84C09";
        ctx.fillRect(px, plat.y, plat.w, plat.h);
        ctx.strokeStyle = "#8B3000";
        ctx.lineWidth = 1;
        // 벽돌 줄무늬
        for (let i = 0; i < plat.w; i += 24) {
          ctx.strokeRect(px + i, plat.y, 24, plat.h);
        }
        // 하이라이트
        ctx.fillStyle = "rgba(255,200,100,0.3)";
        ctx.fillRect(px, plat.y, plat.w, 3);
      } else if (plat.type === "pipe") {
        // 파이프
        ctx.fillStyle = "#00AA00";
        ctx.fillRect(px + 4, plat.y, plat.w - 8, plat.h);
        // 파이프 윗 부분
        ctx.fillStyle = "#00CC00";
        ctx.fillRect(px, plat.y, plat.w, 12);
        // 하이라이트
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(px + 8, plat.y + 12, 6, plat.h - 12);
      }
    }

    // 코인
    ctx.font = `${COIN_SIZE}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const coin of s.coins) {
      if (coin.collected) continue;
      const cx = coin.x - cam;
      if (cx > VIEWPORT_W + 30 || cx < -30) continue;
      // 코인 회전 효과
      const bounce = Math.sin(Date.now() / 300 + coin.id) * 4;
      ctx.fillText("🪙", cx + COIN_SIZE / 2, coin.y + COIN_SIZE / 2 + bounce);
    }

    // 적
    ctx.font = `${ENEMY_W}px serif`;
    for (const enemy of s.enemies) {
      const ex = enemy.x - cam;
      if (ex > VIEWPORT_W + 40 || ex + enemy.w < -40) continue;
      if (enemy.alive) {
        ctx.save();
        if (enemy.dir < 0) {
          ctx.scale(-1, 1);
          ctx.fillText("🍄", -(ex + enemy.w / 2), enemy.y + enemy.h / 2 + 4);
        } else {
          ctx.fillText("🍄", ex + enemy.w / 2, enemy.y + enemy.h / 2 + 4);
        }
        ctx.restore();
      } else if (enemy.squishTimer > 0) {
        // 찌그러진 적
        ctx.save();
        ctx.globalAlpha = enemy.squishTimer / 30;
        ctx.scale(1, 0.3);
        ctx.fillText("🍄", ex + enemy.w / 2, (enemy.y + enemy.h) / 0.3 - 10);
        ctx.restore();
      }
    }

    // 깃발
    const flagScreenX = lv.flagX - cam;
    if (flagScreenX > -50 && flagScreenX < VIEWPORT_W + 50) {
      // 깃대
      ctx.fillStyle = "#666666";
      ctx.fillRect(flagScreenX + FLAG_W / 2 - 3, GROUND_Y - FLAG_H - 40, 6, FLAG_H + 40);
      // 깃발
      ctx.font = "40px serif";
      ctx.fillText("🚩", flagScreenX + FLAG_W / 2, GROUND_Y - FLAG_H - 20);
      // 별
      ctx.font = "24px serif";
      ctx.fillText("⭐", flagScreenX + FLAG_W / 2, GROUND_Y - FLAG_H - 60);
    }

    // 플레이어
    const playerScreenX = s.px - cam;
    const blink = s.invincible > 0 && Math.floor(s.invincible / 4) % 2 === 0;
    if (!blink) {
      // 캐릭터 몸체
      ctx.save();

      // 머리
      ctx.fillStyle = "#FFB347"; // 피부색
      ctx.beginPath();
      ctx.arc(
        playerScreenX + PLAYER_W / 2,
        s.py + 10,
        10,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 모자
      ctx.fillStyle = "#E60012";
      ctx.fillRect(
        playerScreenX + (s.facingRight ? 2 : 8),
        s.py,
        PLAYER_W - 10,
        8
      );
      ctx.fillRect(
        playerScreenX + 6,
        s.py - 2,
        PLAYER_W - 12,
        6
      );

      // 몸통
      ctx.fillStyle = "#E60012";
      ctx.fillRect(playerScreenX + 6, s.py + 16, PLAYER_W - 12, 10);

      // 바지
      ctx.fillStyle = "#0047AB";
      ctx.fillRect(playerScreenX + 6, s.py + 26, PLAYER_W - 12, 8);

      // 다리
      const legOffset = s.onGround && s.vx !== 0 ? Math.sin(s.walkFrame * Math.PI / 2) * 3 : 0;
      ctx.fillStyle = "#0047AB";
      ctx.fillRect(playerScreenX + 8, s.py + 34 - legOffset, 8, 6);
      ctx.fillRect(playerScreenX + PLAYER_W - 16, s.py + 34 + legOffset, 8, 6);

      // 눈
      ctx.fillStyle = "#000";
      const eyeX = s.facingRight ? playerScreenX + PLAYER_W / 2 + 3 : playerScreenX + PLAYER_W / 2 - 5;
      ctx.fillRect(eyeX, s.py + 8, 3, 3);

      // 점프 중이면 팔 올림
      if (!s.onGround) {
        ctx.fillStyle = "#FFB347";
        ctx.fillRect(playerScreenX + 2, s.py + 14, 4, 8);
        ctx.fillRect(playerScreenX + PLAYER_W - 6, s.py + 14, 4, 8);
      }

      ctx.restore();
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, VIEWPORT_W, 40);

    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // 하트
    let heartsStr = "";
    for (let i = 0; i < s.lives; i++) heartsStr += "❤️";
    for (let i = s.lives; i < 3; i++) heartsStr += "🖤";
    ctx.fillText(heartsStr, 10, 20);

    // 코인
    ctx.fillText(`🪙 ${s.coinCount}`, 140, 20);

    // 점수
    ctx.fillText(`점수: ${s.score}`, 250, 20);

    // 레벨
    ctx.textAlign = "right";
    const levelNames = ["1-1 초원", "1-2 지하", "1-3 하늘"];
    ctx.fillText(`월드 ${levelNames[s.level] || s.level + 1}`, VIEWPORT_W - 10, 20);
  }

  function drawStartScreen(ctx: CanvasRenderingContext2D) {
    // 배경
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    // 바닥
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, GROUND_Y, VIEWPORT_W, TILE);
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, GROUND_Y, VIEWPORT_W, 8);

    // 구름
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 5; i++) {
      const r = 20 + i * 5;
      ctx.beginPath();
      ctx.arc(100 + i * 150, 60 + Math.sin(i) * 20, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 타이틀
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 그림자
    ctx.font = "bold 60px sans-serif";
    ctx.fillStyle = "#8B0000";
    ctx.fillText("슈퍼 마리오", VIEWPORT_W / 2 + 3, 140 + 3);

    ctx.fillStyle = "#E60012";
    ctx.fillText("슈퍼 마리오", VIEWPORT_W / 2, 140);

    // 테두리 효과
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.strokeText("슈퍼 마리오", VIEWPORT_W / 2, 140);

    // 캐릭터
    ctx.font = "80px serif";
    ctx.fillText("🧑", VIEWPORT_W / 2, 240);

    // 안내
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#fff";
    const blink = Math.floor(Date.now() / 500) % 2;
    if (blink) {
      ctx.fillText("Enter 또는 Space를 누르세요!", VIEWPORT_W / 2, 340);
    }

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("← → 이동  |  Space / ↑ 점프  |  더블점프 가능!", VIEWPORT_W / 2, 390);
    ctx.fillText("🍄 적은 밟아서 처치  |  🪙 코인 수집  |  🚩 깃발 도달!", VIEWPORT_W / 2, 420);
  }

  function drawGameOverScreen(ctx: CanvasRenderingContext2D) {
    const s = stateRef.current;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 56px sans-serif";
    ctx.fillStyle = "#E60012";
    ctx.fillText("게임 오버", VIEWPORT_W / 2, 160);

    ctx.font = "40px serif";
    ctx.fillText("😢", VIEWPORT_W / 2, 240);

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`최종 점수: ${s.score}`, VIEWPORT_W / 2, 310);
    ctx.fillText(`수집한 코인: ${s.coinCount}`, VIEWPORT_W / 2, 350);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#fff";
    const blink = Math.floor(Date.now() / 500) % 2;
    if (blink) {
      ctx.fillText("Enter를 눌러 다시 시작!", VIEWPORT_W / 2, 420);
    }
  }

  function drawLevelClearScreen(ctx: CanvasRenderingContext2D) {
    const s = stateRef.current;
    ctx.fillStyle = "#1a1a3e";
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 48px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("🎉 스테이지 클리어! 🎉", VIEWPORT_W / 2, 140);

    const levelNames = ["초원", "지하", "하늘"];
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(
      `월드 1-${s.level + 1} ${levelNames[s.level]} 완료!`,
      VIEWPORT_W / 2,
      220
    );

    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`점수: ${s.score}`, VIEWPORT_W / 2, 280);
    ctx.fillText(`코인: ${s.coinCount}`, VIEWPORT_W / 2, 320);

    let heartsStr = "";
    for (let i = 0; i < s.lives; i++) heartsStr += "❤️";
    ctx.fillText(`남은 목숨: ${heartsStr}`, VIEWPORT_W / 2, 360);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#fff";
    const blink = Math.floor(Date.now() / 500) % 2;
    if (blink) {
      ctx.fillText("Enter를 눌러 다음 스테이지!", VIEWPORT_W / 2, 430);
    }
  }

  function drawWinScreen(ctx: CanvasRenderingContext2D) {
    const s = stateRef.current;
    // 무지개 배경
    const grad = ctx.createLinearGradient(0, 0, 0, VIEWPORT_H);
    grad.addColorStop(0, "#ff6b6b");
    grad.addColorStop(0.25, "#ffd93d");
    grad.addColorStop(0.5, "#6bcb77");
    grad.addColorStop(0.75, "#4d96ff");
    grad.addColorStop(1, "#9b59b6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 52px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText("🏆 축하합니다! 🏆", VIEWPORT_W / 2, 120);
    ctx.fillText("🏆 축하합니다! 🏆", VIEWPORT_W / 2, 120);

    ctx.font = "bold 36px sans-serif";
    ctx.strokeText("모든 스테이지 클리어!", VIEWPORT_W / 2, 190);
    ctx.fillText("모든 스테이지 클리어!", VIEWPORT_W / 2, 190);

    ctx.font = "60px serif";
    ctx.fillText("🎊🎉🎊", VIEWPORT_W / 2, 260);

    ctx.lineWidth = 2;
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.strokeText(`최종 점수: ${s.score}`, VIEWPORT_W / 2, 330);
    ctx.fillText(`최종 점수: ${s.score}`, VIEWPORT_W / 2, 330);
    ctx.strokeText(`수집한 코인: ${s.coinCount}`, VIEWPORT_W / 2, 370);
    ctx.fillText(`수집한 코인: ${s.coinCount}`, VIEWPORT_W / 2, 370);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#fff";
    const blink = Math.floor(Date.now() / 500) % 2;
    if (blink) {
      ctx.strokeText("Enter를 눌러 처음부터!", VIEWPORT_W / 2, 440);
      ctx.fillText("Enter를 눌러 처음부터!", VIEWPORT_W / 2, 440);
    }
  }

  /* ───── 시작 ───── */
  useEffect(() => {
    stateRef.current.screen = "start";
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  /* ───── 터치 핸들러 ───── */
  const handleTouchStart = (btn: "left" | "right" | "jump") => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    touchRef.current[btn] = true;
    const s = stateRef.current;
    if (btn === "jump") {
      if (s.screen === "playing") {
        // jump handled in game loop
      } else if (s.screen === "start") {
        stateRef.current = initState(0, 3, 0, 0);
        forceRender();
      } else if (s.screen === "levelClear") {
        const nextLevel = s.level + 1;
        if (nextLevel >= levelsRef.current.length) {
          s.screen = "win";
        } else {
          stateRef.current = initState(nextLevel, s.lives, s.score, s.coinCount);
        }
        forceRender();
      } else if (s.screen === "gameover" || s.screen === "win") {
        stateRef.current = initState(0, 3, 0, 0);
        stateRef.current.screen = "start";
        forceRender();
      }
    }
  };
  const handleTouchEnd = (btn: "left" | "right" | "jump") => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    touchRef.current[btn] = false;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-[840px]">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/"
            className="text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ← 홈으로
          </Link>
          <h1 className="text-white font-bold text-xl">🎮 슈퍼 마리오</h1>
          <div className="w-20" />
        </div>

        {/* 캔버스 */}
        <div className="relative w-full" style={{ maxWidth: VIEWPORT_W }}>
          <canvas
            ref={canvasRef}
            width={VIEWPORT_W}
            height={VIEWPORT_H}
            className="w-full rounded-xl border-4 border-yellow-600 shadow-2xl"
            style={{
              imageRendering: "pixelated",
              touchAction: "none",
            }}
          />
        </div>

        {/* 모바일 터치 컨트롤 */}
        <div className="flex justify-between items-end mt-4 px-2 select-none">
          {/* 방향 버튼 */}
          <div className="flex gap-2">
            <button
              className="w-16 h-16 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl text-3xl text-white flex items-center justify-center border-2 border-gray-500 shadow-lg"
              onTouchStart={handleTouchStart("left")}
              onTouchEnd={handleTouchEnd("left")}
              onMouseDown={handleTouchStart("left")}
              onMouseUp={handleTouchEnd("left")}
              onMouseLeave={handleTouchEnd("left")}
            >
              ◀
            </button>
            <button
              className="w-16 h-16 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl text-3xl text-white flex items-center justify-center border-2 border-gray-500 shadow-lg"
              onTouchStart={handleTouchStart("right")}
              onTouchEnd={handleTouchEnd("right")}
              onMouseDown={handleTouchStart("right")}
              onMouseUp={handleTouchEnd("right")}
              onMouseLeave={handleTouchEnd("right")}
            >
              ▶
            </button>
          </div>

          {/* 점프 버튼 */}
          <button
            className="w-20 h-20 bg-red-600 hover:bg-red-500 active:bg-red-400 rounded-full text-2xl text-white font-bold flex items-center justify-center border-4 border-red-400 shadow-lg"
            onTouchStart={handleTouchStart("jump")}
            onTouchEnd={handleTouchEnd("jump")}
            onMouseDown={handleTouchStart("jump")}
            onMouseUp={handleTouchEnd("jump")}
            onMouseLeave={handleTouchEnd("jump")}
          >
            점프
          </button>
        </div>

        {/* 조작법 안내 */}
        <div className="mt-4 text-center text-gray-400 text-xs space-y-1">
          <p>⌨️ 키보드: ← → 또는 A/D 이동 | Space/↑ 점프 | 더블점프 가능</p>
          <p>📱 모바일: 하단 버튼으로 조작</p>
        </div>
      </div>
    </div>
  );
}
