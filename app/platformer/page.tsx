"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ============================================================
// CONSTANTS
// ============================================================
const W = 800;
const H = 500;
const GRAVITY = 0.6;
const FRICTION = 0.85;
const MAX_VX = 6;
const JUMP_FORCE = -12;
const JUMP_HOLD_FORCE = -0.4;
const JUMP_HOLD_FRAMES = 12;
const WALL_JUMP_VX = 7;
const WALL_JUMP_VY = -10;
const PLAYER_W = 28;
const PLAYER_H = 36;
const TILE = 32;
const COIN_R = 10;
const SPIKE_H = 16;
const CHECKPOINT_W = 24;
const CHECKPOINT_H = 48;
const LEVEL_WIDTH = 200; // tiles per level
const LEVEL_HEIGHT = 16; // tiles

type GameState = "menu" | "playing" | "dead" | "levelComplete";
type Theme = "grass" | "cave" | "sky" | "lava";
type EnemyType = "walker" | "flyer" | "jumper";
type ParticleType = "dust" | "sparkle" | "poof" | "blood";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  color: string; type: ParticleType;
}

interface Platform {
  x: number; y: number; w: number; h: number;
  moving?: boolean; moveRange?: number; moveSpeed?: number;
  moveDir?: number; originX?: number; originY?: number;
  vertical?: boolean;
}

interface Coin {
  x: number; y: number; collected: boolean; pulse: number;
}

interface Spike {
  x: number; y: number; w: number;
}

interface Enemy {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; type: EnemyType;
  alive: boolean; dir: number;
  originX: number; originY: number;
  patrol: number; patrolRange: number;
  phase: number;
}

interface Checkpoint {
  x: number; y: number; activated: boolean;
}

interface Player {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number;
  onGround: boolean; wallSliding: boolean; wallDir: number;
  jumpCount: number; maxJumps: number;
  jumpHeld: boolean; jumpHoldFrames: number;
  facing: number;
  squashX: number; squashY: number;
  lean: number;
  coins: number; lives: number;
  invincible: number;
  dead: boolean;
}

interface LevelData {
  platforms: Platform[];
  coins: Coin[];
  spikes: Spike[];
  enemies: Enemy[];
  checkpoints: Checkpoint[];
  theme: Theme;
  width: number;
  goalX: number;
}

interface GameData {
  player: Player;
  level: LevelData;
  camera: { x: number; y: number };
  particles: Particle[];
  timer: number;
  currentLevel: number;
  checkpoint: { x: number; y: number } | null;
  touchLeft: boolean;
  touchRight: boolean;
  touchJump: boolean;
}

// ============================================================
// HELPERS
// ============================================================
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function rngInt(min: number, max: number) { return Math.floor(rng(min, max + 1)); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const THEMES: Record<Theme, { bg: string; bgLayers: string[]; platColor: string; platTop: string; spikeColor: string }> = {
  grass: {
    bg: "#87CEEB",
    bgLayers: ["#a8d8a8", "#7bc47b", "#5aad5a"],
    platColor: "#8B5E3C",
    platTop: "#4CAF50",
    spikeColor: "#cc3333",
  },
  cave: {
    bg: "#1a1a2e",
    bgLayers: ["#2a2a3e", "#1e1e30", "#151525"],
    platColor: "#555566",
    platTop: "#777788",
    spikeColor: "#ff6644",
  },
  sky: {
    bg: "#4a90d9",
    bgLayers: ["#b0d4f1", "#88bbee", "#6699cc"],
    platColor: "#eeeeee",
    platTop: "#ccddff",
    spikeColor: "#ff4444",
  },
  lava: {
    bg: "#1a0a0a",
    bgLayers: ["#3a1a0a", "#2a0f05", "#1a0500"],
    platColor: "#444444",
    platTop: "#ff6600",
    spikeColor: "#ff2200",
  },
};

const THEME_ORDER: Theme[] = ["grass", "cave", "sky", "lava"];

// ============================================================
// LEVEL GENERATION
// ============================================================
function generateLevel(levelNum: number): LevelData {
  const theme = THEME_ORDER[levelNum % THEME_ORDER.length];
  const width = LEVEL_WIDTH * TILE;
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const spikes: Spike[] = [];
  const enemies: Enemy[] = [];
  const checkpoints: Checkpoint[] = [];

  // Ground with gaps
  const groundY = (LEVEL_HEIGHT - 2) * TILE;
  let gx = 0;
  while (gx < width) {
    const segLen = rngInt(5, 15) * TILE;
    if (gx + segLen > width) break;
    platforms.push({ x: gx, y: groundY, w: segLen, h: TILE * 2 });

    // Coins on ground
    for (let cx = gx + TILE; cx < gx + segLen - TILE; cx += TILE * 2) {
      if (Math.random() < 0.3) {
        coins.push({ x: cx + 16, y: groundY - 24, collected: false, pulse: Math.random() * Math.PI * 2 });
      }
    }

    // Enemies on ground
    if (segLen > TILE * 4 && Math.random() < 0.4) {
      const ex = gx + segLen / 2;
      enemies.push({
        x: ex, y: groundY - 30, w: 26, h: 26,
        vx: 1.5, vy: 0, type: "walker",
        alive: true, dir: 1,
        originX: ex, originY: groundY - 30,
        patrol: 0, patrolRange: segLen / 2 - 40,
        phase: 0,
      });
    }

    gx += segLen;
    // Gap
    const gapLen = rngInt(2, 4) * TILE;
    // Spikes in some gaps
    if (Math.random() < 0.4) {
      spikes.push({ x: gx, y: groundY + TILE - SPIKE_H, w: gapLen });
    }
    gx += gapLen;
  }

  // Floating platforms
  for (let i = 0; i < 40 + levelNum * 5; i++) {
    const px = rngInt(3, LEVEL_WIDTH - 5) * TILE;
    const py = rngInt(3, LEVEL_HEIGHT - 4) * TILE;
    const pw = rngInt(2, 6) * TILE;
    const isMoving = Math.random() < 0.2;
    const isVertical = Math.random() < 0.4;

    const plat: Platform = {
      x: px, y: py, w: pw, h: TILE / 2,
      moving: isMoving,
      moveRange: isMoving ? rngInt(2, 5) * TILE : 0,
      moveSpeed: isMoving ? rng(0.5, 2) : 0,
      moveDir: 1,
      originX: px,
      originY: py,
      vertical: isVertical,
    };
    platforms.push(plat);

    // Coins on floating platforms
    for (let cx = px; cx < px + pw; cx += TILE) {
      if (Math.random() < 0.5) {
        coins.push({ x: cx + 16, y: py - 24, collected: false, pulse: Math.random() * Math.PI * 2 });
      }
    }

    // Flying enemies near some platforms
    if (Math.random() < 0.15) {
      enemies.push({
        x: px + pw / 2, y: py - 60, w: 24, h: 24,
        vx: 2, vy: 0, type: "flyer",
        alive: true, dir: 1,
        originX: px + pw / 2, originY: py - 60,
        patrol: 0, patrolRange: pw + 40,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Jumping enemies
  for (let i = 0; i < 3 + levelNum; i++) {
    const ex = rngInt(10, LEVEL_WIDTH - 10) * TILE;
    enemies.push({
      x: ex, y: groundY - 30, w: 24, h: 28,
      vx: 1, vy: 0, type: "jumper",
      alive: true, dir: 1,
      originX: ex, originY: groundY - 30,
      patrol: 0, patrolRange: 100,
      phase: 0,
    });
  }

  // Checkpoints
  const cpSpacing = Math.floor(LEVEL_WIDTH / 4) * TILE;
  for (let i = 1; i <= 3; i++) {
    checkpoints.push({
      x: cpSpacing * i,
      y: groundY - CHECKPOINT_H,
      activated: false,
    });
  }

  const goalX = (LEVEL_WIDTH - 3) * TILE;

  return { platforms, coins, spikes, enemies, checkpoints, theme, width, goalX };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PlatformerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [totalCoins, setTotalCoins] = useState(0);
  const [currentLevelNum, setCurrentLevelNum] = useState(0);
  const [bestCoins, setBestCoins] = useState(0);
  const gameRef = useRef<GameData | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  function createPlayer(x: number, y: number, coins: number, lives: number): Player {
    return {
      x, y, vx: 0, vy: 0,
      w: PLAYER_W, h: PLAYER_H,
      onGround: false, wallSliding: false, wallDir: 0,
      jumpCount: 0, maxJumps: 2,
      jumpHeld: false, jumpHoldFrames: 0,
      facing: 1,
      squashX: 1, squashY: 1,
      lean: 0,
      coins, lives,
      invincible: 0,
      dead: false,
    };
  }

  function spawnParticles(g: GameData, x: number, y: number, count: number, type: ParticleType, color: string) {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: rng(-3, 3),
        vy: rng(-4, 1),
        life: rng(15, 35),
        maxLife: 35,
        r: rng(2, 5),
        color,
        type,
      });
    }
  }

  const initGame = useCallback((levelNum: number = 0) => {
    const level = generateLevel(levelNum);
    const p = createPlayer(3 * TILE, (LEVEL_HEIGHT - 4) * TILE, 0, 3);
    const g: GameData = {
      player: p,
      level,
      camera: { x: 0, y: 0 },
      particles: [],
      timer: 0,
      currentLevel: levelNum,
      checkpoint: null,
      touchLeft: false,
      touchRight: false,
      touchJump: false,
    };
    gameRef.current = g;
    setCurrentLevelNum(levelNum);
    setGameState("playing");
  }, []);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "dead") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let animFrame = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "ArrowUp") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    // Touch handlers
    const touchBtns = {
      left: { x: 10, y: H - 80, w: 60, h: 60 },
      right: { x: 80, y: H - 80, w: 60, h: 60 },
      jump: { x: W - 80, y: H - 80, w: 70, h: 60 },
    };

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault();
      const g = gameRef.current;
      if (!g) return;
      const rect = canvas!.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      for (let i = 0; i < e.touches.length; i++) {
        const tx = (e.touches[i].clientX - rect.left) * scaleX;
        const ty = (e.touches[i].clientY - rect.top) * scaleY;
        if (tx >= touchBtns.left.x && tx <= touchBtns.left.x + touchBtns.left.w &&
            ty >= touchBtns.left.y && ty <= touchBtns.left.y + touchBtns.left.h) {
          g.touchLeft = true;
        }
        if (tx >= touchBtns.right.x && tx <= touchBtns.right.x + touchBtns.right.w &&
            ty >= touchBtns.right.y && ty <= touchBtns.right.y + touchBtns.right.h) {
          g.touchRight = true;
        }
        if (tx >= touchBtns.jump.x && tx <= touchBtns.jump.x + touchBtns.jump.w &&
            ty >= touchBtns.jump.y && ty <= touchBtns.jump.y + touchBtns.jump.h) {
          g.touchJump = true;
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      e.preventDefault();
      const g = gameRef.current;
      if (!g) return;
      g.touchLeft = false;
      g.touchRight = false;
      g.touchJump = false;
      // Re-check remaining touches
      const rect = canvas!.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      for (let i = 0; i < e.touches.length; i++) {
        const tx = (e.touches[i].clientX - rect.left) * scaleX;
        const ty = (e.touches[i].clientY - rect.top) * scaleY;
        if (tx >= touchBtns.left.x && tx <= touchBtns.left.x + touchBtns.left.w &&
            ty >= touchBtns.left.y && ty <= touchBtns.left.y + touchBtns.left.h) {
          g.touchLeft = true;
        }
        if (tx >= touchBtns.right.x && tx <= touchBtns.right.x + touchBtns.right.w &&
            ty >= touchBtns.right.y && ty <= touchBtns.right.y + touchBtns.right.h) {
          g.touchRight = true;
        }
        if (tx >= touchBtns.jump.x && tx <= touchBtns.jump.x + touchBtns.jump.w &&
            ty >= touchBtns.jump.y && ty <= touchBtns.jump.y + touchBtns.jump.h) {
          g.touchJump = true;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    let lastJumpPressed = false;

    function gameLoop() {
      const g = gameRef.current;
      if (!g) return;
      const p = g.player;
      const lv = g.level;
      const keys = keysRef.current;
      const th = THEMES[lv.theme];

      if (gameState === "dead") {
        // Still render but don't update
        render(ctx, g, th);
        animFrame = requestAnimationFrame(gameLoop);
        return;
      }

      g.timer += 1 / 60;

      // --- INPUT ---
      const moveLeft = keys.has("arrowleft") || keys.has("a") || g.touchLeft;
      const moveRight = keys.has("arrowright") || keys.has("d") || g.touchRight;
      const jumpPressed = keys.has(" ") || keys.has("arrowup") || keys.has("w") || g.touchJump;
      const jumpJustPressed = jumpPressed && !lastJumpPressed;
      lastJumpPressed = jumpPressed;

      if (!p.dead) {
        // Horizontal movement
        if (moveLeft) {
          p.vx -= 1.2;
          p.facing = -1;
        }
        if (moveRight) {
          p.vx += 1.2;
          p.facing = 1;
        }
        p.vx = clamp(p.vx, -MAX_VX, MAX_VX);

        // Jump
        if (jumpJustPressed) {
          if (p.wallSliding) {
            // Wall jump
            p.vx = -p.wallDir * WALL_JUMP_VX;
            p.vy = WALL_JUMP_VY;
            p.jumpCount = 1;
            p.jumpHeld = true;
            p.jumpHoldFrames = 0;
            p.facing = -p.wallDir;
            spawnParticles(g, p.x + (p.wallDir > 0 ? p.w : 0), p.y + p.h / 2, 5, "dust", "#aaa");
          } else if (p.onGround || p.jumpCount < p.maxJumps) {
            p.vy = JUMP_FORCE;
            p.jumpCount = p.onGround ? 1 : p.jumpCount + 1;
            p.jumpHeld = true;
            p.jumpHoldFrames = 0;
            // Squash effect
            p.squashX = 0.7;
            p.squashY = 1.3;
            if (p.onGround) {
              spawnParticles(g, p.x + p.w / 2, p.y + p.h, 6, "dust", "#bbb");
            }
          }
        }

        // Variable jump height
        if (jumpPressed && p.jumpHeld && p.jumpHoldFrames < JUMP_HOLD_FRAMES) {
          p.vy += JUMP_HOLD_FORCE;
          p.jumpHoldFrames++;
        }
        if (!jumpPressed) {
          p.jumpHeld = false;
        }

        // Physics
        p.vy += GRAVITY;
        if (!moveLeft && !moveRight) {
          p.vx *= FRICTION;
        }

        // Wall sliding
        p.wallSliding = false;
        p.wallDir = 0;

        // Move X
        p.x += p.vx;
        // Collision X
        for (const plat of lv.platforms) {
          const px = plat.x;
          const py = plat.y;
          if (rectOverlap(p.x, p.y, p.w, p.h, px, py, plat.w, plat.h)) {
            if (p.vx > 0) {
              p.x = px - p.w;
              if (!p.onGround && p.vy > 0) { p.wallSliding = true; p.wallDir = 1; }
            } else if (p.vx < 0) {
              p.x = px + plat.w;
              if (!p.onGround && p.vy > 0) { p.wallSliding = true; p.wallDir = -1; }
            }
            p.vx = 0;
          }
        }

        // Wall slide slowdown
        if (p.wallSliding) {
          p.vy = Math.min(p.vy, 2);
        }

        // Move Y
        p.y += p.vy;
        p.onGround = false;

        // Collision Y
        for (const plat of lv.platforms) {
          const px = plat.x;
          const py = plat.y;
          if (rectOverlap(p.x, p.y, p.w, p.h, px, py, plat.w, plat.h)) {
            if (p.vy > 0) {
              p.y = py - p.h;
              p.vy = 0;
              if (!p.onGround) {
                // Land squash
                p.squashX = 1.3;
                p.squashY = 0.7;
                spawnParticles(g, p.x + p.w / 2, p.y + p.h, 4, "dust", "#bbb");
              }
              p.onGround = true;
              p.jumpCount = 0;
            } else if (p.vy < 0) {
              p.y = py + plat.h;
              p.vy = 0;
            }
          }
        }

        // Lean when running
        const targetLean = p.vx * 0.03;
        p.lean = lerp(p.lean, targetLean, 0.2);

        // Squash/stretch recovery
        p.squashX = lerp(p.squashX, 1, 0.15);
        p.squashY = lerp(p.squashY, 1, 0.15);

        // Fall death
        if (p.y > LEVEL_HEIGHT * TILE + 100) {
          killPlayer(g);
        }

        // Clamp left
        if (p.x < 0) { p.x = 0; p.vx = 0; }

        // Invincibility timer
        if (p.invincible > 0) p.invincible--;

        // --- COIN COLLECTION ---
        for (const coin of lv.coins) {
          if (coin.collected) continue;
          coin.pulse += 0.08;
          const cx = coin.x;
          const cy = coin.y;
          if (rectOverlap(p.x, p.y, p.w, p.h, cx - COIN_R, cy - COIN_R, COIN_R * 2, COIN_R * 2)) {
            coin.collected = true;
            p.coins++;
            setTotalCoins(p.coins);
            spawnParticles(g, cx, cy, 8, "sparkle", "#FFD700");
          }
        }

        // --- SPIKE COLLISION ---
        for (const spike of lv.spikes) {
          if (rectOverlap(p.x, p.y, p.w, p.h, spike.x, spike.y, spike.w, SPIKE_H)) {
            if (p.invincible <= 0) {
              killPlayer(g);
            }
          }
        }

        // --- ENEMY UPDATE & COLLISION ---
        for (const enemy of lv.enemies) {
          if (!enemy.alive) continue;

          if (enemy.type === "walker") {
            enemy.patrol += enemy.vx * enemy.dir;
            if (Math.abs(enemy.patrol) > enemy.patrolRange) {
              enemy.dir *= -1;
            }
            enemy.x = enemy.originX + enemy.patrol;
          } else if (enemy.type === "flyer") {
            enemy.phase += 0.04;
            enemy.patrol += enemy.vx * enemy.dir;
            if (Math.abs(enemy.patrol) > enemy.patrolRange) {
              enemy.dir *= -1;
            }
            enemy.x = enemy.originX + enemy.patrol;
            enemy.y = enemy.originY + Math.sin(enemy.phase) * 30;
          } else if (enemy.type === "jumper") {
            enemy.phase += 0.03;
            enemy.patrol += enemy.vx * enemy.dir;
            if (Math.abs(enemy.patrol) > enemy.patrolRange) {
              enemy.dir *= -1;
            }
            enemy.x = enemy.originX + enemy.patrol;
            enemy.y = enemy.originY + Math.abs(Math.sin(enemy.phase)) * -40;
          }

          // Player vs enemy
          if (rectOverlap(p.x, p.y, p.w, p.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
            // Check if stomping (player falling on top)
            if (p.vy > 0 && p.y + p.h - 8 < enemy.y + enemy.h / 2) {
              // Kill enemy
              enemy.alive = false;
              p.vy = JUMP_FORCE * 0.6;
              p.jumpCount = 0;
              spawnParticles(g, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 12, "poof", "#ff8844");
            } else if (p.invincible <= 0) {
              // Hurt player
              killPlayer(g);
            }
          }
        }

        // --- CHECKPOINT ---
        for (const cp of lv.checkpoints) {
          if (cp.activated) continue;
          if (rectOverlap(p.x, p.y, p.w, p.h, cp.x, cp.y, CHECKPOINT_W, CHECKPOINT_H)) {
            cp.activated = true;
            g.checkpoint = { x: cp.x, y: cp.y };
            spawnParticles(g, cp.x + CHECKPOINT_W / 2, cp.y, 10, "sparkle", "#00ff88");
          }
        }

        // --- GOAL CHECK ---
        if (p.x >= lv.goalX) {
          const nextLevel = g.currentLevel + 1;
          if (p.coins > bestCoins) setBestCoins(p.coins);
          setCurrentLevelNum(nextLevel);
          setGameState("levelComplete");
          return;
        }
      }

      // --- MOVING PLATFORMS ---
      for (const plat of lv.platforms) {
        if (!plat.moving || !plat.moveRange) continue;
        if (plat.vertical) {
          plat.y += plat.moveSpeed! * plat.moveDir!;
          if (Math.abs(plat.y - plat.originY!) > plat.moveRange) {
            plat.moveDir! *= -1;
          }
        } else {
          plat.x += plat.moveSpeed! * plat.moveDir!;
          if (Math.abs(plat.x - plat.originX!) > plat.moveRange) {
            plat.moveDir! *= -1;
          }
        }
      }

      // --- PARTICLES ---
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.1;
        pt.life--;
        if (pt.life <= 0) {
          g.particles.splice(i, 1);
        }
      }

      // --- CAMERA ---
      const targetCamX = p.x - W / 3;
      const targetCamY = p.y - H / 2 + 50;
      g.camera.x = lerp(g.camera.x, targetCamX, 0.08);
      g.camera.y = lerp(g.camera.y, targetCamY, 0.06);
      g.camera.x = clamp(g.camera.x, 0, lv.width - W);
      g.camera.y = clamp(g.camera.y, -100, LEVEL_HEIGHT * TILE - H + 64);

      // --- RENDER ---
      render(ctx, g, th);

      animFrame = requestAnimationFrame(gameLoop);
    }

    function killPlayer(g: GameData) {
      const p = g.player;
      p.lives--;
      spawnParticles(g, p.x + p.w / 2, p.y + p.h / 2, 15, "poof", "#ff4444");
      if (p.lives <= 0) {
        p.dead = true;
        setGameState("dead");
      } else {
        // Respawn at checkpoint or start
        p.invincible = 120;
        if (g.checkpoint) {
          p.x = g.checkpoint.x;
          p.y = g.checkpoint.y - p.h;
        } else {
          p.x = 3 * TILE;
          p.y = (LEVEL_HEIGHT - 4) * TILE;
        }
        p.vx = 0;
        p.vy = 0;
      }
    }

    function render(ctx: CanvasRenderingContext2D, g: GameData, th: typeof THEMES.grass) {
      const p = g.player;
      const lv = g.level;
      const cam = g.camera;

      ctx.save();

      // --- PARALLAX BACKGROUND ---
      ctx.fillStyle = th.bg;
      ctx.fillRect(0, 0, W, H);

      // Background layers
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = th.bgLayers[layer];
        const parallax = (layer + 1) * 0.1;
        const offX = -cam.x * parallax;
        const baseY = H - 120 + layer * 30;

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 40) {
          const noiseX = (x + offX) * 0.01;
          const y = baseY + Math.sin(noiseX * 3) * 20 + Math.cos(noiseX * 7 + layer) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }

      // Translate to camera
      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      // --- PLATFORMS ---
      for (const plat of lv.platforms) {
        if (plat.x + plat.w < cam.x - 50 || plat.x > cam.x + W + 50) continue;
        if (plat.y + plat.h < cam.y - 50 || plat.y > cam.y + H + 50) continue;

        // Platform body
        ctx.fillStyle = th.platColor;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Platform top highlight
        ctx.fillStyle = th.platTop;
        ctx.fillRect(plat.x, plat.y, plat.w, 4);

        // Edge shading
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(plat.x, plat.y + plat.h - 3, plat.w, 3);
      }

      // --- SPIKES ---
      for (const spike of lv.spikes) {
        if (spike.x + spike.w < cam.x - 10 || spike.x > cam.x + W + 10) continue;
        ctx.fillStyle = th.spikeColor;
        const numSpikes = Math.floor(spike.w / 16);
        for (let i = 0; i < numSpikes; i++) {
          const sx = spike.x + i * 16 + 8;
          const sy = spike.y + SPIKE_H;
          ctx.beginPath();
          ctx.moveTo(sx - 7, sy);
          ctx.lineTo(sx, spike.y);
          ctx.lineTo(sx + 7, sy);
          ctx.closePath();
          ctx.fill();
        }
      }

      // --- CHECKPOINTS ---
      for (const cp of lv.checkpoints) {
        if (cp.x < cam.x - 50 || cp.x > cam.x + W + 50) continue;
        // Pole
        ctx.fillStyle = "#888";
        ctx.fillRect(cp.x + 10, cp.y, 4, CHECKPOINT_H);
        // Flag
        ctx.fillStyle = cp.activated ? "#00ff88" : "#ff4444";
        ctx.beginPath();
        ctx.moveTo(cp.x + 14, cp.y);
        ctx.lineTo(cp.x + 34, cp.y + 10);
        ctx.lineTo(cp.x + 14, cp.y + 20);
        ctx.closePath();
        ctx.fill();
      }

      // --- GOAL ---
      const goalX = lv.goalX;
      if (goalX > cam.x - 60 && goalX < cam.x + W + 60) {
        const goalY = (LEVEL_HEIGHT - 4) * TILE;
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(goalX, goalY, 20, 64);
        ctx.fillStyle = "#FF6600";
        ctx.beginPath();
        ctx.moveTo(goalX + 20, goalY);
        ctx.lineTo(goalX + 50, goalY + 12);
        ctx.lineTo(goalX + 20, goalY + 24);
        ctx.closePath();
        ctx.fill();
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText("GOAL", goalX + 25, goalY - 10);
      }

      // --- COINS ---
      for (const coin of lv.coins) {
        if (coin.collected) continue;
        if (coin.x < cam.x - 20 || coin.x > cam.x + W + 20) continue;
        const bob = Math.sin(coin.pulse) * 3;
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(coin.x, coin.y + bob, COIN_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFF8A0";
        ctx.beginPath();
        ctx.arc(coin.x - 2, coin.y + bob - 2, COIN_R * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- ENEMIES ---
      for (const enemy of lv.enemies) {
        if (!enemy.alive) continue;
        if (enemy.x + enemy.w < cam.x - 20 || enemy.x > cam.x + W + 20) continue;

        if (enemy.type === "walker") {
          // Red square with angry eyes
          ctx.fillStyle = "#e74c3c";
          ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
          ctx.fillStyle = "#fff";
          ctx.fillRect(enemy.x + 5, enemy.y + 6, 7, 6);
          ctx.fillRect(enemy.x + enemy.w - 12, enemy.y + 6, 7, 6);
          ctx.fillStyle = "#000";
          const ex = enemy.dir > 0 ? 3 : 0;
          ctx.fillRect(enemy.x + 7 + ex, enemy.y + 8, 3, 4);
          ctx.fillRect(enemy.x + enemy.w - 10 + ex, enemy.y + 8, 3, 4);
          // Angry brow
          ctx.strokeStyle = "#aa0000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.x + 4, enemy.y + 4);
          ctx.lineTo(enemy.x + 12, enemy.y + 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.w - 4, enemy.y + 4);
          ctx.lineTo(enemy.x + enemy.w - 12, enemy.y + 6);
          ctx.stroke();
        } else if (enemy.type === "flyer") {
          // Purple with wings
          ctx.fillStyle = "#9b59b6";
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.w / 2, 0, Math.PI * 2);
          ctx.fill();
          // Wings
          const wingFlap = Math.sin(g.timer * 10) * 5;
          ctx.fillStyle = "#c39bd3";
          ctx.beginPath();
          ctx.ellipse(enemy.x - 4, enemy.y + enemy.h / 2, 8, 5 + wingFlap, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(enemy.x + enemy.w + 4, enemy.y + enemy.h / 2, 8, 5 + wingFlap, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(enemy.x + 7, enemy.y + 9, 4, 0, Math.PI * 2);
          ctx.arc(enemy.x + enemy.w - 7, enemy.y + 9, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(enemy.x + 8, enemy.y + 10, 2, 0, Math.PI * 2);
          ctx.arc(enemy.x + enemy.w - 6, enemy.y + 10, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === "jumper") {
          // Green bouncy
          ctx.fillStyle = "#2ecc71";
          const stretch = 1 + Math.abs(Math.cos(enemy.phase)) * 0.2;
          const squish = 1 / stretch;
          ctx.save();
          ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h);
          ctx.scale(squish, stretch);
          ctx.fillRect(-enemy.w / 2, -enemy.h, enemy.w, enemy.h);
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.fillRect(-enemy.w / 2 + 4, -enemy.h + 5, 6, 6);
          ctx.fillRect(enemy.w / 2 - 10, -enemy.h + 5, 6, 6);
          ctx.fillStyle = "#000";
          ctx.fillRect(-enemy.w / 2 + 6, -enemy.h + 7, 3, 3);
          ctx.fillRect(enemy.w / 2 - 8, -enemy.h + 7, 3, 3);
          ctx.restore();
        }
      }

      // --- PLAYER ---
      if (!p.dead && (p.invincible <= 0 || Math.floor(p.invincible / 4) % 2 === 0)) {
        ctx.save();
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(p.lean);
        ctx.scale(p.squashX, p.squashY);

        // Body
        ctx.fillStyle = "#3498db";
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

        // Darker bottom
        ctx.fillStyle = "#2980b9";
        ctx.fillRect(-p.w / 2, 2, p.w, p.h / 2 - 2);

        // Eyes
        const eyeOffX = p.facing * 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(-8 + eyeOffX, -p.h / 2 + 8, 8, 8);
        ctx.fillRect(2 + eyeOffX, -p.h / 2 + 8, 8, 8);

        // Pupils
        ctx.fillStyle = "#000";
        const pupilOff = p.facing * 2;
        ctx.fillRect(-6 + eyeOffX + pupilOff, -p.h / 2 + 10, 4, 5);
        ctx.fillRect(4 + eyeOffX + pupilOff, -p.h / 2 + 10, 4, 5);

        // Mouth
        if (p.vy < -2) {
          // O face when jumping
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(eyeOffX, 4, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Smile
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(eyeOffX, 2, 5, 0.1, Math.PI - 0.1);
          ctx.stroke();
        }

        ctx.restore();
      }

      // --- PARTICLES ---
      for (const pt of g.particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        if (pt.type === "sparkle") {
          // Star shape
          const s = pt.r;
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.life * 0.2);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const outerX = Math.cos(angle) * s;
            const outerY = Math.sin(angle) * s;
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * s * 0.4;
            const innerY = Math.sin(innerAngle) * s * 0.4;
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore(); // camera

      // --- HUD ---
      ctx.save();

      // Coins
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🪙 ${p.coins}`, 12, 28);

      // Lives
      ctx.fillStyle = "#ff4444";
      ctx.fillText("❤️".repeat(Math.max(0, p.lives)), 12, 54);

      // Timer
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "right";
      const mins = Math.floor(g.timer / 60);
      const secs = Math.floor(g.timer % 60);
      ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, W - 12, 24);

      // Level
      ctx.fillStyle = "#aaa";
      ctx.font = "12px sans-serif";
      ctx.fillText(`레벨 ${g.currentLevel + 1}`, W - 12, 42);

      // Progress bar
      const progress = clamp(p.x / lv.goalX, 0, 1);
      const barW = 200;
      const barH = 8;
      const barX = (W - barW) / 2;
      const barY = 12;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(barX, barY, barW * progress, barH);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barW / 2, barY + barH + 14);

      // Touch buttons
      const isTouchDevice = "ontouchstart" in window;
      if (isTouchDevice) {
        ctx.globalAlpha = 0.4;
        // Left button
        ctx.fillStyle = g.touchLeft ? "#fff" : "#888";
        ctx.fillRect(touchBtns.left.x, touchBtns.left.y, touchBtns.left.w, touchBtns.left.h);
        ctx.fillStyle = "#000";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("◀", touchBtns.left.x + 30, touchBtns.left.y + 40);

        // Right button
        ctx.fillStyle = g.touchRight ? "#fff" : "#888";
        ctx.fillRect(touchBtns.right.x, touchBtns.right.y, touchBtns.right.w, touchBtns.right.h);
        ctx.fillStyle = "#000";
        ctx.fillText("▶", touchBtns.right.x + 30, touchBtns.right.y + 40);

        // Jump button
        ctx.fillStyle = g.touchJump ? "#fff" : "#888";
        ctx.fillRect(touchBtns.jump.x, touchBtns.jump.y, touchBtns.jump.w, touchBtns.jump.h);
        ctx.fillStyle = "#000";
        ctx.fillText("▲", touchBtns.jump.x + 35, touchBtns.jump.y + 40);

        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    animFrame = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gameState, initGame, bestCoins]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      {gameState === "menu" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">🏃</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">플랫포머 어드벤처</h1>
          <p className="text-gray-400 mb-6 text-sm">방향키/WASD 이동 | Space/↑ 점프 | 더블점프 & 벽점프 가능</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>🏃 좌우로 이동하고 점프로 플랫폼을 넘어라</p>
            <p>🪙 코인을 모으며 골까지 도달하라</p>
            <p>👾 적을 밟아서 처치 (마리오 스타일)</p>
            <p>🚩 체크포인트를 활성화하면 부활 지점 저장</p>
            <p>⚡ 더블점프 & 벽점프로 어려운 구간 돌파</p>
            <p>🌍 4가지 테마의 레벨이 무한히 이어진다</p>
          </div>
          <button onClick={() => initGame(0)} className="w-full rounded-xl bg-gradient-to-r from-green-600 to-blue-600 py-4 text-xl font-black hover:brightness-125 transition-all border border-green-400/30">
            게임 시작
          </button>
          {bestCoins > 0 && <p className="mt-3 text-sm text-gray-500">최고 코인: {bestCoins}</p>}
        </div>
      )}

      {(gameState === "playing" || gameState === "dead") && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block rounded-lg border border-gray-800"
            style={{ maxWidth: "100vw", maxHeight: "80vh", imageRendering: "auto" }}
          />

          {gameState === "dead" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💀</div>
                <div className="text-3xl font-black text-red-500 mb-2">게임 오버</div>
                <div className="text-gray-400 mb-1">레벨 {currentLevelNum + 1}</div>
                <div className="text-yellow-400 text-xl font-bold mb-4">코인: {totalCoins}</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => initGame(0)} className="rounded-xl bg-green-700 px-6 py-3 font-bold hover:bg-green-600">다시 하기</button>
                  <button onClick={() => setGameState("menu")} className="rounded-xl bg-gray-700 px-6 py-3 font-bold hover:bg-gray-600">메뉴로</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {gameState === "levelComplete" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-3xl font-black text-green-400 mb-2">레벨 클리어!</div>
          <div className="text-gray-400 mb-1">레벨 {currentLevelNum} 완료</div>
          <div className="text-yellow-400 text-xl font-bold mb-6">코인: {totalCoins}</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => initGame(currentLevelNum)} className="rounded-xl bg-gradient-to-r from-green-600 to-blue-600 px-8 py-4 text-xl font-black hover:brightness-125 transition-all border border-green-400/30">
              다음 레벨
            </button>
            <button onClick={() => setGameState("menu")} className="rounded-xl bg-gray-700 px-6 py-4 font-bold hover:bg-gray-600">메뉴로</button>
          </div>
        </div>
      )}
    </div>
  );
}
