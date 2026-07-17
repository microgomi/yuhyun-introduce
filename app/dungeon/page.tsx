"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ============================================================
// CONSTANTS
// ============================================================
const W = 800;
const H = 600;
const TILE = 40;
const COLS = W / TILE;
const ROWS = H / TILE;
const PLAYER_R = 14;
const BULLET_R = 4;
const ENEMY_R = 12;
const PICKUP_R = 10;
const DASH_CD = 1500;
const DASH_DIST = 120;
const SHOOT_CD = 250;
const WAVE_INTERVAL = 12000;
const XP_PER_LEVEL = 50;

type GameState = "menu" | "playing" | "paused" | "dead" | "victory";
type EnemyType = "chaser" | "shooter" | "tank" | "bomber" | "boss";
type PickupType = "health" | "ammo" | "xp" | "shield" | "speed" | "damage";
type ParticleType = "blood" | "spark" | "heal" | "explosion" | "trail" | "levelup" | "xp";
type SkillType = "multishot" | "pierce" | "shield" | "lifesteal" | "speed" | "damage" | "firerate" | "explosive";

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; shield: number;
  damage: number; fireRate: number; speed: number;
  xp: number; level: number; xpToNext: number;
  kills: number; dashCd: number; shootCd: number;
  invincible: number;
  skills: SkillType[];
  multishot: number; pierce: boolean; explosive: boolean; lifesteal: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  damage: number; pierce: boolean; explosive: boolean;
  fromEnemy: boolean; life: number; r: number;
}

interface Enemy {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; damage: number; speed: number;
  type: EnemyType; r: number; shootCd: number; attackCd: number;
  flash: number; id: number;
}

interface Pickup {
  x: number; y: number; type: PickupType; life: number; pulse: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  color: string; type: ParticleType;
}

interface Wall {
  x: number; y: number; w: number; h: number;
}

interface SkillOption {
  type: SkillType;
  name: string;
  icon: string;
  desc: string;
}

const SKILL_OPTIONS: SkillOption[] = [
  { type: "multishot", name: "멀티샷", icon: "🔫🔫", desc: "총알 +1발" },
  { type: "pierce", name: "관통탄", icon: "🔹", desc: "총알이 적을 관통" },
  { type: "shield", name: "보호막", icon: "🛡️", desc: "최대 보호막 +30" },
  { type: "lifesteal", name: "흡혈", icon: "🩸", desc: "데미지의 10% HP 회복" },
  { type: "speed", name: "신속", icon: "💨", desc: "이동속도 +15%" },
  { type: "damage", name: "강화", icon: "⚔️", desc: "데미지 +25%" },
  { type: "firerate", name: "속사", icon: "🔥", desc: "공격속도 +20%" },
  { type: "explosive", name: "폭발탄", icon: "💥", desc: "적 처치 시 폭발" },
];

const ENEMY_COLORS: Record<EnemyType, string> = {
  chaser: "#e74c3c",
  shooter: "#9b59b6",
  tank: "#e67e22",
  bomber: "#2ecc71",
  boss: "#ff0055",
};

// ============================================================
// HELPERS
// ============================================================
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function norm(v: Vec2): Vec2 { const d = Math.sqrt(v.x * v.x + v.y * v.y) || 1; return { x: v.x / d, y: v.y / d }; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function rngInt(min: number, max: number) { return Math.floor(rng(min, max + 1)); }

function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  return dist({ x: cx, y: cy }, { x: closestX, y: closestY }) < cr;
}

function generateWalls(wave: number): Wall[] {
  const walls: Wall[] = [];
  const count = 5 + Math.min(wave, 10);
  for (let i = 0; i < count; i++) {
    const horizontal = Math.random() > 0.5;
    const w = horizontal ? rngInt(2, 5) * TILE : TILE;
    const h = horizontal ? TILE : rngInt(2, 5) * TILE;
    const x = rngInt(2, COLS - 4) * TILE;
    const y = rngInt(2, ROWS - 4) * TILE;
    // Don't block center
    if (Math.abs(x - W / 2) < 80 && Math.abs(y - H / 2) < 80) continue;
    walls.push({ x, y, w, h });
  }
  return walls;
}

function spawnEnemy(wave: number, walls: Wall[]): Enemy {
  const types: EnemyType[] = ["chaser"];
  if (wave >= 2) types.push("shooter");
  if (wave >= 3) types.push("tank");
  if (wave >= 5) types.push("bomber");
  const type = types[rngInt(0, types.length - 1)];

  let x: number, y: number;
  do {
    const side = rngInt(0, 3);
    if (side === 0) { x = rng(0, W); y = -20; }
    else if (side === 1) { x = W + 20; y = rng(0, H); }
    else if (side === 2) { x = rng(0, W); y = H + 20; }
    else { x = -20; y = rng(0, H); }
  } while (false);

  const scale = 1 + wave * 0.12;
  const stats: Record<EnemyType, { hp: number; damage: number; speed: number; r: number }> = {
    chaser: { hp: 20 * scale, damage: 8, speed: 1.5 + wave * 0.08, r: 12 },
    shooter: { hp: 15 * scale, damage: 6, speed: 1 + wave * 0.05, r: 11 },
    tank: { hp: 60 * scale, damage: 15, speed: 0.7 + wave * 0.03, r: 18 },
    bomber: { hp: 25 * scale, damage: 20, speed: 2 + wave * 0.06, r: 10 },
    boss: { hp: 200 * scale, damage: 25, speed: 1.2, r: 28 },
  };

  const s = stats[type];
  return {
    x, y, vx: 0, vy: 0,
    hp: s.hp, maxHp: s.hp, damage: s.damage, speed: s.speed,
    type, r: s.r, shootCd: 0, attackCd: 0, flash: 0,
    id: Date.now() + Math.random() * 10000,
  };
}

function spawnBoss(wave: number): Enemy {
  const scale = 1 + wave * 0.15;
  return {
    x: W / 2, y: -40, vx: 0, vy: 0,
    hp: 300 * scale, maxHp: 300 * scale, damage: 20 + wave * 2, speed: 1.2,
    type: "boss", r: 28, shootCd: 0, attackCd: 0, flash: 0,
    id: Date.now(),
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DungeonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [showSkillSelect, setShowSkillSelect] = useState(false);
  const [skillChoices, setSkillChoices] = useState<SkillOption[]>([]);
  const [score, setScore] = useState(0);
  const [waveNum, setWaveNum] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Game refs (mutable game state that doesn't trigger re-renders)
  const gameRef = useRef<{
    player: Player;
    bullets: Bullet[];
    enemies: Enemy[];
    pickups: Pickup[];
    particles: Particle[];
    walls: Wall[];
    keys: Set<string>;
    mouse: Vec2;
    mouseDown: boolean;
    wave: number;
    waveTimer: number;
    enemiesInWave: number;
    enemiesSpawned: number;
    spawnTimer: number;
    screenShake: number;
    time: number;
    running: boolean;
    lastLevelForSkill: number;
  } | null>(null);

  const initGame = useCallback(() => {
    const walls = generateWalls(1);
    gameRef.current = {
      player: {
        x: W / 2, y: H / 2, vx: 0, vy: 0,
        hp: 100, maxHp: 100, shield: 0,
        damage: 10, fireRate: 1, speed: 3.5,
        xp: 0, level: 1, xpToNext: XP_PER_LEVEL,
        kills: 0, dashCd: 0, shootCd: 0,
        invincible: 0,
        skills: [],
        multishot: 1, pierce: false, explosive: false, lifesteal: 0,
      },
      bullets: [],
      enemies: [],
      pickups: [],
      particles: [],
      walls,
      keys: new Set(),
      mouse: { x: W / 2, y: 0 },
      mouseDown: false,
      wave: 1,
      waveTimer: WAVE_INTERVAL,
      enemiesInWave: 5,
      enemiesSpawned: 0,
      spawnTimer: 0,
      screenShake: 0,
      time: 0,
      running: true,
      lastLevelForSkill: 0,
    };
    setScore(0);
    setWaveNum(1);
    setShowSkillSelect(false);
    setGameState("playing");
  }, []);

  // Skill selection
  const selectSkill = useCallback((skill: SkillOption) => {
    const g = gameRef.current;
    if (!g) return;
    const p = g.player;
    p.skills.push(skill.type);
    switch (skill.type) {
      case "multishot": p.multishot += 1; break;
      case "pierce": p.pierce = true; break;
      case "shield": p.shield = Math.min(p.shield + 30, 60); break;
      case "lifesteal": p.lifesteal += 0.1; break;
      case "speed": p.speed *= 1.15; break;
      case "damage": p.damage = Math.floor(p.damage * 1.25); break;
      case "firerate": p.fireRate *= 1.2; break;
      case "explosive": p.explosive = true; break;
    }
    setShowSkillSelect(false);
    g.running = true;
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    // Input handlers
    const onKeyDown = (e: KeyboardEvent) => {
      gameRef.current?.keys.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "Shift") { e.preventDefault(); doDash(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { gameRef.current?.keys.delete(e.key.toLowerCase()); };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if (gameRef.current) {
        gameRef.current.mouse = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      }
    };
    const onMouseDown = () => { if (gameRef.current) gameRef.current.mouseDown = true; };
    const onMouseUp = () => { if (gameRef.current) gameRef.current.mouseDown = false; };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if (gameRef.current && e.touches.length > 0) {
        gameRef.current.mouse = { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        gameRef.current.mouseDown = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if (gameRef.current && e.touches.length > 0) {
        gameRef.current.mouse = { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
      }
    };
    const onTouchEnd = () => { if (gameRef.current) gameRef.current.mouseDown = false; };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    function doDash() {
      const g = gameRef.current;
      if (!g || g.player.dashCd > 0) return;
      const p = g.player;
      const dir = norm({ x: g.mouse.x - p.x, y: g.mouse.y - p.y });
      p.x += dir.x * DASH_DIST;
      p.y += dir.y * DASH_DIST;
      p.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x));
      p.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y));
      p.dashCd = DASH_CD;
      p.invincible = 200;
      // Trail particles
      for (let i = 0; i < 10; i++) {
        g.particles.push({
          x: p.x - dir.x * i * 10, y: p.y - dir.y * i * 10,
          vx: rng(-1, 1), vy: rng(-1, 1),
          life: 300, maxLife: 300, r: rng(3, 6),
          color: "#00ccff", type: "trail",
        });
      }
    }

    function shoot() {
      const g = gameRef.current;
      if (!g || g.player.shootCd > 0) return;
      const p = g.player;
      const dir = norm({ x: g.mouse.x - p.x, y: g.mouse.y - p.y });
      const bulletSpeed = 8;
      const spreadBase = p.multishot > 1 ? 0.15 : 0;

      for (let i = 0; i < p.multishot; i++) {
        const angle = Math.atan2(dir.y, dir.x) + (i - (p.multishot - 1) / 2) * spreadBase;
        g.bullets.push({
          x: p.x + Math.cos(angle) * 20,
          y: p.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          damage: p.damage, pierce: p.pierce, explosive: p.explosive,
          fromEnemy: false, life: 800, r: BULLET_R,
        });
      }
      p.shootCd = Math.max(80, SHOOT_CD / p.fireRate);
      // Muzzle flash
      g.particles.push({
        x: p.x + dir.x * 20, y: p.y + dir.y * 20,
        vx: dir.x * 2, vy: dir.y * 2,
        life: 100, maxLife: 100, r: 6,
        color: "#ffcc00", type: "spark",
      });
    }

    function spawnParticles(x: number, y: number, type: ParticleType, count: number, color: string) {
      const g = gameRef.current;
      if (!g) return;
      for (let i = 0; i < count; i++) {
        const angle = rng(0, Math.PI * 2);
        const speed = rng(1, 4);
        g.particles.push({
          x, y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: rng(200, 500), maxLife: 500,
          r: rng(2, type === "explosion" ? 8 : 5),
          color, type,
        });
      }
    }

    function dropPickup(x: number, y: number) {
      const g = gameRef.current;
      if (!g) return;
      if (Math.random() < 0.4) {
        const types: PickupType[] = ["health", "xp", "xp", "xp", "ammo", "shield", "speed", "damage"];
        const type = types[rngInt(0, types.length - 1)];
        g.pickups.push({ x, y, type, life: 8000, pulse: 0 });
      }
    }

    // GAME LOOP
    let lastTime = performance.now();
    let animFrame: number;

    function gameLoop(now: number) {
      const dt = Math.min(now - lastTime, 33);
      lastTime = now;
      const g = gameRef.current;
      if (!g || !g.running) { animFrame = requestAnimationFrame(gameLoop); return; }

      g.time += dt;
      const p = g.player;

      // === UPDATE ===
      // Player movement
      let mx = 0, my = 0;
      if (g.keys.has("w") || g.keys.has("arrowup")) my -= 1;
      if (g.keys.has("s") || g.keys.has("arrowdown")) my += 1;
      if (g.keys.has("a") || g.keys.has("arrowleft")) mx -= 1;
      if (g.keys.has("d") || g.keys.has("arrowright")) mx += 1;
      if (mx || my) {
        const n = norm({ x: mx, y: my });
        p.vx = n.x * p.speed;
        p.vy = n.y * p.speed;
      } else {
        p.vx *= 0.8;
        p.vy *= 0.8;
      }
      p.x += p.vx; p.y += p.vy;

      // Wall collision for player
      for (const w of g.walls) {
        if (circleRect(p.x, p.y, PLAYER_R, w.x, w.y, w.w, w.h)) {
          // Push out
          const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
          const dx = p.x - cx, dy = p.y - cy;
          if (Math.abs(dx / w.w) > Math.abs(dy / w.h)) {
            p.x = dx > 0 ? w.x + w.w + PLAYER_R : w.x - PLAYER_R;
          } else {
            p.y = dy > 0 ? w.y + w.h + PLAYER_R : w.y - PLAYER_R;
          }
        }
      }

      p.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x));
      p.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y));
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.shootCd = Math.max(0, p.shootCd - dt);
      p.invincible = Math.max(0, p.invincible - dt);

      // Auto shoot
      if (g.mouseDown) shoot();

      // Wave spawning
      g.waveTimer -= dt;
      if (g.waveTimer <= 0 && g.enemies.length === 0 && g.enemiesSpawned >= g.enemiesInWave) {
        g.wave += 1;
        g.enemiesInWave = 5 + g.wave * 2;
        g.enemiesSpawned = 0;
        g.waveTimer = WAVE_INTERVAL;
        g.walls = generateWalls(g.wave);
        setWaveNum(g.wave);
        // Boss every 5 waves
        if (g.wave % 5 === 0) {
          g.enemies.push(spawnBoss(g.wave));
          spawnParticles(W / 2, H / 4, "explosion", 20, "#ff0055");
          g.screenShake = 15;
        }
      }

      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0 && g.enemiesSpawned < g.enemiesInWave) {
        g.enemies.push(spawnEnemy(g.wave, g.walls));
        g.enemiesSpawned += 1;
        g.spawnTimer = 800 - Math.min(g.wave * 30, 500);
      }

      // Update enemies
      for (const e of g.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.shootCd = Math.max(0, e.shootCd - dt);
        e.attackCd = Math.max(0, e.attackCd - dt);

        // AI
        const toPlayer = norm({ x: p.x - e.x, y: p.y - e.y });
        const distToPlayer = dist(e, p);

        if (e.type === "chaser" || e.type === "tank") {
          e.vx = lerp(e.vx, toPlayer.x * e.speed, 0.05);
          e.vy = lerp(e.vy, toPlayer.y * e.speed, 0.05);
        } else if (e.type === "shooter") {
          if (distToPlayer > 200) {
            e.vx = lerp(e.vx, toPlayer.x * e.speed, 0.03);
            e.vy = lerp(e.vy, toPlayer.y * e.speed, 0.03);
          } else {
            e.vx *= 0.95; e.vy *= 0.95;
          }
          if (e.shootCd <= 0 && distToPlayer < 400) {
            const bDir = norm({ x: p.x - e.x, y: p.y - e.y });
            g.bullets.push({
              x: e.x, y: e.y, vx: bDir.x * 4, vy: bDir.y * 4,
              damage: e.damage, pierce: false, explosive: false,
              fromEnemy: true, life: 2000, r: 5,
            });
            e.shootCd = 1500;
          }
        } else if (e.type === "bomber") {
          e.vx = lerp(e.vx, toPlayer.x * e.speed, 0.06);
          e.vy = lerp(e.vy, toPlayer.y * e.speed, 0.06);
          if (distToPlayer < 40) {
            // Explode
            e.hp = 0;
            spawnParticles(e.x, e.y, "explosion", 25, "#2ecc71");
            g.screenShake = 10;
            if (p.invincible <= 0) {
              const dmg = Math.max(0, e.damage - p.shield);
              p.hp -= dmg;
              if (p.shield > 0) p.shield = Math.max(0, p.shield - 5);
            }
          }
        } else if (e.type === "boss") {
          e.vx = lerp(e.vx, toPlayer.x * e.speed, 0.03);
          e.vy = lerp(e.vy, toPlayer.y * e.speed, 0.03);
          if (e.shootCd <= 0) {
            // Burst shot
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i + g.time * 0.001;
              g.bullets.push({
                x: e.x, y: e.y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                damage: e.damage * 0.5, pierce: false, explosive: false,
                fromEnemy: true, life: 2500, r: 6,
              });
            }
            e.shootCd = 2000;
          }
        }

        e.x += e.vx; e.y += e.vy;

        // Wall collision for enemies
        for (const w of g.walls) {
          if (circleRect(e.x, e.y, e.r, w.x, w.y, w.w, w.h)) {
            const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
            const dx = e.x - cx, dy = e.y - cy;
            if (Math.abs(dx / w.w) > Math.abs(dy / w.h)) {
              e.x = dx > 0 ? w.x + w.w + e.r : w.x - e.r;
              e.vx *= -0.5;
            } else {
              e.y = dy > 0 ? w.y + w.h + e.r : w.y - e.r;
              e.vy *= -0.5;
            }
          }
        }

        // Melee damage
        if (distToPlayer < e.r + PLAYER_R && e.attackCd <= 0 && p.invincible <= 0) {
          const dmg = Math.max(1, e.damage - p.shield);
          p.hp -= dmg;
          if (p.shield > 0) p.shield = Math.max(0, p.shield - 2);
          p.invincible = 300;
          e.attackCd = 500;
          spawnParticles(p.x, p.y, "blood", 5, "#ff4444");
          g.screenShake = 5;
        }
      }

      // Update bullets
      for (const b of g.bullets) {
        b.x += b.vx; b.y += b.vy;
        b.life -= dt;

        // Wall collision
        for (const w of g.walls) {
          if (circleRect(b.x, b.y, b.r, w.x, w.y, w.w, w.h)) {
            b.life = 0;
            spawnParticles(b.x, b.y, "spark", 3, "#ffcc00");
          }
        }

        if (!b.fromEnemy) {
          // Hit enemies
          for (const e of g.enemies) {
            if (e.hp <= 0) continue;
            if (dist(b, e) < b.r + e.r) {
              e.hp -= b.damage;
              e.flash = 100;
              spawnParticles(b.x, b.y, "spark", 4, ENEMY_COLORS[e.type]);
              g.screenShake = 2;

              // Lifesteal
              if (p.lifesteal > 0) {
                const heal = Math.floor(b.damage * p.lifesteal);
                p.hp = Math.min(p.maxHp, p.hp + heal);
              }

              if (e.hp <= 0) {
                // Kill
                p.kills += 1;
                p.xp += e.type === "boss" ? 30 : e.type === "tank" ? 8 : 5;
                setScore((s) => s + (e.type === "boss" ? 100 : e.type === "tank" ? 20 : 10));
                spawnParticles(e.x, e.y, "blood", 10, ENEMY_COLORS[e.type]);
                dropPickup(e.x, e.y);

                // Explosive
                if (b.explosive) {
                  spawnParticles(e.x, e.y, "explosion", 15, "#ff6600");
                  g.screenShake = 8;
                  for (const other of g.enemies) {
                    if (other.hp > 0 && other.id !== e.id && dist(e, other) < 60) {
                      other.hp -= b.damage * 0.5;
                      other.flash = 100;
                    }
                  }
                }

                // Level up check
                if (p.xp >= p.xpToNext) {
                  p.xp -= p.xpToNext;
                  p.level += 1;
                  p.xpToNext = Math.floor(p.xpToNext * 1.2);
                  p.maxHp += 10;
                  p.hp = p.maxHp;
                  p.damage += 2;
                  spawnParticles(p.x, p.y, "levelup", 20, "#ffdd00");
                  g.screenShake = 5;

                  // Offer skill selection
                  if (p.level > g.lastLevelForSkill) {
                    g.lastLevelForSkill = p.level;
                    const available = SKILL_OPTIONS.filter((s) => s.type !== "pierce" || !p.pierce).filter((s) => s.type !== "explosive" || !p.explosive);
                    const shuffled = [...available].sort(() => Math.random() - 0.5);
                    setSkillChoices(shuffled.slice(0, 3));
                    setShowSkillSelect(true);
                    g.running = false;
                  }
                }
              }

              if (!b.pierce) b.life = 0;
              break;
            }
          }
        } else {
          // Enemy bullet hit player
          if (p.invincible <= 0 && dist(b, p) < b.r + PLAYER_R) {
            const dmg = Math.max(1, b.damage - p.shield);
            p.hp -= dmg;
            if (p.shield > 0) p.shield = Math.max(0, p.shield - 2);
            p.invincible = 200;
            b.life = 0;
            spawnParticles(p.x, p.y, "blood", 5, "#ff4444");
            g.screenShake = 4;
          }
        }
      }

      // Update pickups
      for (const pk of g.pickups) {
        pk.life -= dt;
        pk.pulse += dt * 0.005;
        if (dist(pk, p) < PICKUP_R + PLAYER_R + 15) {
          switch (pk.type) {
            case "health": p.hp = Math.min(p.maxHp, p.hp + 20); spawnParticles(pk.x, pk.y, "heal", 8, "#44ff44"); break;
            case "xp": p.xp += 10; spawnParticles(pk.x, pk.y, "xp", 5, "#ffdd00"); break;
            case "shield": p.shield = Math.min(60, p.shield + 15); spawnParticles(pk.x, pk.y, "spark", 6, "#4488ff"); break;
            case "speed": p.speed += 0.2; spawnParticles(pk.x, pk.y, "spark", 6, "#44ffff"); break;
            case "damage": p.damage += 2; spawnParticles(pk.x, pk.y, "spark", 6, "#ff4444"); break;
            default: spawnParticles(pk.x, pk.y, "spark", 4, "#ffffff"); break;
          }
          pk.life = 0;
        }
      }

      // Update particles
      for (const pt of g.particles) {
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx *= 0.96; pt.vy *= 0.96;
        pt.life -= dt;
      }

      // Cleanup
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50);
      g.enemies = g.enemies.filter((e) => e.hp > 0);
      g.pickups = g.pickups.filter((pk) => pk.life > 0);
      g.particles = g.particles.filter((pt) => pt.life > 0);
      g.screenShake = Math.max(0, g.screenShake - 0.5);

      // Death check
      if (p.hp <= 0) {
        setGameState("dead");
        setBestScore((prev) => Math.max(prev, score + p.kills * 10));
        g.running = false;
      }

      // === RENDER ===
      ctx.save();
      // Screen shake
      if (g.screenShake > 0) {
        ctx.translate(rng(-g.screenShake, g.screenShake), rng(-g.screenShake, g.screenShake));
      }

      // Background
      ctx.fillStyle = "#111118";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "#1a1a25";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Walls
      for (const w of g.walls) {
        ctx.fillStyle = "#2a2a35";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "#3a3a45";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // Pickups
      for (const pk of g.pickups) {
        const scale = 1 + Math.sin(pk.pulse * 3) * 0.15;
        const alpha = pk.life < 1000 ? pk.life / 1000 : 1;
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(pk.x, pk.y);
        ctx.scale(scale, scale);
        const colors: Record<PickupType, string> = {
          health: "#44ff44", xp: "#ffdd00", ammo: "#ffaa00",
          shield: "#4488ff", speed: "#44ffff", damage: "#ff4444",
        };
        ctx.fillStyle = colors[pk.type] || "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, PICKUP_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const icons: Record<PickupType, string> = {
          health: "+", xp: "X", ammo: "A", shield: "S", speed: "F", damage: "D",
        };
        ctx.fillText(icons[pk.type], 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Particles (behind entities)
      for (const pt of g.particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Enemies
      for (const e of g.enemies) {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + e.r + 2, e.r * 0.8, e.r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        const color = e.flash > 0 ? "#ffffff" : ENEMY_COLORS[e.type];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        // Glow for boss
        if (e.type === "boss") {
          ctx.strokeStyle = `rgba(255,0,85,${0.3 + Math.sin(g.time * 0.005) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // HP bar
        if (e.hp < e.maxHp) {
          const bw = e.r * 2;
          ctx.fillStyle = "#333";
          ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw, 4);
          ctx.fillStyle = e.type === "boss" ? "#ff0055" : "#ff4444";
          ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw * (e.hp / e.maxHp), 4);
        }

        // Eyes
        const toP = norm({ x: p.x - e.x, y: p.y - e.y });
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(e.x - 4 + toP.x * 2, e.y - 2 + toP.y * 2, 3, 0, Math.PI * 2);
        ctx.arc(e.x + 4 + toP.x * 2, e.y - 2 + toP.y * 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(e.x - 4 + toP.x * 3, e.y - 2 + toP.y * 3, 1.5, 0, Math.PI * 2);
        ctx.arc(e.x + 4 + toP.x * 3, e.y - 2 + toP.y * 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bullets
      for (const b of g.bullets) {
        if (b.fromEnemy) {
          ctx.fillStyle = "#ff4488";
          ctx.shadowColor = "#ff4488";
        } else {
          ctx.fillStyle = b.explosive ? "#ff6600" : b.pierce ? "#00ccff" : "#ffcc00";
          ctx.shadowColor = ctx.fillStyle;
        }
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Player
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + PLAYER_R + 2, PLAYER_R * 0.8, PLAYER_R * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shield glow
      if (p.shield > 0) {
        ctx.strokeStyle = `rgba(68,136,255,${0.3 + Math.sin(g.time * 0.005) * 0.15})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_R + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Invincible flash
      if (p.invincible > 0 && Math.floor(g.time / 80) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      // Body
      ctx.fillStyle = "#00aaff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0077cc";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Aim line
      const aimDir = norm({ x: g.mouse.x - p.x, y: g.mouse.y - p.y });
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x + aimDir.x * 20, p.y + aimDir.y * 20);
      ctx.lineTo(p.x + aimDir.x * 80, p.y + aimDir.y * 80);
      ctx.stroke();
      ctx.setLineDash([]);

      // Eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x - 4 + aimDir.x * 3, p.y - 3 + aimDir.y * 3, 3.5, 0, Math.PI * 2);
      ctx.arc(p.x + 4 + aimDir.x * 3, p.y - 3 + aimDir.y * 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(p.x - 4 + aimDir.x * 4, p.y - 3 + aimDir.y * 4, 1.8, 0, Math.PI * 2);
      ctx.arc(p.x + 4 + aimDir.x * 4, p.y - 3 + aimDir.y * 4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // === HUD ===
      // HP bar
      const hpW = 200, hpH = 14, hpX = 10, hpY = 10;
      ctx.fillStyle = "#222";
      ctx.fillRect(hpX, hpY, hpW, hpH);
      ctx.fillStyle = p.hp > p.maxHp * 0.3 ? "#44cc44" : "#cc4444";
      ctx.fillRect(hpX, hpY, hpW * Math.max(0, p.hp / p.maxHp), hpH);
      if (p.shield > 0) {
        ctx.fillStyle = "rgba(68,136,255,0.5)";
        ctx.fillRect(hpX, hpY, hpW * (p.shield / 60), hpH);
      }
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.strokeRect(hpX, hpY, hpW, hpH);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, hpX + hpW / 2, hpY + 11);

      // XP bar
      ctx.fillStyle = "#222";
      ctx.fillRect(hpX, hpY + 18, hpW, 6);
      ctx.fillStyle = "#ddaa00";
      ctx.fillRect(hpX, hpY + 18, hpW * (p.xp / p.xpToNext), 6);

      // Stats
      ctx.textAlign = "left";
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`Lv.${p.level}  DMG:${p.damage}  SPD:${p.speed.toFixed(1)}`, hpX, hpY + 40);

      // Wave / Score / Kills
      ctx.textAlign = "right";
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(`Wave ${g.wave}`, W - 10, 22);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`Kills: ${p.kills}  Score: ${score + p.kills * 10}`, W - 10, 38);

      // Dash cooldown
      ctx.textAlign = "left";
      ctx.fillStyle = p.dashCd > 0 ? "#555" : "#00ccff";
      ctx.font = "10px sans-serif";
      ctx.fillText(p.dashCd > 0 ? `DASH ${(p.dashCd / 1000).toFixed(1)}s` : "DASH READY [Space]", 10, H - 10);

      // Skills icons
      const skillIcons = p.skills.map((s) => SKILL_OPTIONS.find((o) => o.type === s)?.icon ?? "?");
      if (skillIcons.length > 0) {
        ctx.fillStyle = "#666";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(skillIcons.join(" "), 10, H - 28);
      }

      ctx.restore();

      animFrame = requestAnimationFrame(gameLoop);
    }

    animFrame = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gameState, showSkillSelect, score, selectSkill]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      {gameState === "menu" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">DUNGEON SURVIVOR</h1>
          <p className="text-gray-400 mb-6 text-sm">WASD 이동 | 마우스 조준/클릭 공격 | Space 대시</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>🎯 마우스로 조준, 클릭으로 공격</p>
            <p>💨 Space로 대시 (무적 이동)</p>
            <p>📈 레벨업 시 스킬 선택</p>
            <p>💀 웨이브를 버텨라!</p>
            <p>👹 5웨이브마다 보스 등장</p>
          </div>
          <button onClick={initGame} className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-xl font-black hover:brightness-125 transition-all border border-cyan-400/30">
            START
          </button>
          {bestScore > 0 && <p className="mt-3 text-sm text-gray-500">Best Score: {bestScore}</p>}
        </div>
      )}

      {(gameState === "playing" || gameState === "dead") && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block rounded-lg border border-gray-800 cursor-crosshair"
            style={{ maxWidth: "100vw", maxHeight: "80vh", imageRendering: "auto" }}
          />

          {/* Skill selection overlay */}
          {showSkillSelect && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
              <div className="text-center p-4">
                <div className="text-yellow-400 text-xl font-black mb-1">LEVEL UP!</div>
                <div className="text-gray-400 text-sm mb-4">스킬을 선택하세요</div>
                <div className="flex gap-3">
                  {skillChoices.map((s) => (
                    <button key={s.type} onClick={() => selectSkill(s)}
                      className="rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 p-4 w-36 text-center hover:from-purple-900 hover:to-gray-900 transition-all border border-gray-700 hover:border-purple-500">
                      <div className="text-3xl mb-2">{s.icon}</div>
                      <div className="font-bold text-sm mb-1">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Death overlay */}
          {gameState === "dead" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💀</div>
                <div className="text-3xl font-black text-red-500 mb-2">GAME OVER</div>
                <div className="text-gray-400 mb-1">Wave {waveNum} | Kills {gameRef.current?.player.kills ?? 0}</div>
                <div className="text-yellow-400 text-xl font-bold mb-4">Score: {score + (gameRef.current?.player.kills ?? 0) * 10}</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={initGame} className="rounded-xl bg-cyan-700 px-6 py-3 font-bold hover:bg-cyan-600">다시 하기</button>
                  <button onClick={() => setGameState("menu")} className="rounded-xl bg-gray-700 px-6 py-3 font-bold hover:bg-gray-600">메뉴로</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
