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
const PLAYER_R = 16;
const BULLET_R = 3;
const DODGE_CD = 1500;
const DODGE_DIST = 140;
const DODGE_DUR = 200;
const FOG_RADIUS = 180;

type GameState = "menu" | "playing" | "dead";
type ZombieType = "walker" | "runner" | "bloater" | "spitter" | "boss";
type WeaponType = "pistol" | "shotgun" | "rifle" | "flamethrower";
type DropType = "health" | "ammo" | "speed";
type ParticleType = "blood" | "trail" | "explosion" | "spark" | "acid";

interface Vec2 { x: number; y: number; }

interface Player {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; speed: number;
  weapon: WeaponType;
  ammo: Record<WeaponType, number>;
  kills: number;
  dodgeCd: number; dodgeTimer: number; dodgeDir: Vec2;
  invincible: number;
  shootCd: number;
  speedBoost: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  damage: number; life: number; r: number;
  fromEnemy: boolean; isFlame?: boolean; isAcid?: boolean;
  trail: Vec2[];
}

interface Zombie {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; damage: number; speed: number;
  type: ZombieType; r: number;
  shootCd: number; attackCd: number; flash: number; id: number;
}

interface Drop {
  x: number; y: number; type: DropType; life: number; pulse: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  color: string; type: ParticleType;
}

interface Wall {
  x: number; y: number; w: number; h: number;
}

const ZOMBIE_COLORS: Record<ZombieType, string> = {
  walker: "#3a8f3a",
  runner: "#cc3333",
  bloater: "#6b4e2a",
  spitter: "#7ec850",
  boss: "#880044",
};

const WEAPON_STATS: Record<WeaponType, { fireRate: number; damage: number; speed: number; spread: number; count: number; range: number; name: string }> = {
  pistol:       { fireRate: 350,  damage: 15,  speed: 10, spread: 0.05, count: 1, range: 500, name: "권총" },
  shotgun:      { fireRate: 700,  damage: 12,  speed: 9,  spread: 0.35, count: 6, range: 200, name: "샷건" },
  rifle:        { fireRate: 120,  damage: 10,  speed: 14, spread: 0.03, count: 1, range: 600, name: "라이플" },
  flamethrower: { fireRate: 50,   damage: 4,   speed: 6,  spread: 0.4,  count: 3, range: 100, name: "화염방사기" },
};

// ============================================================
// HELPERS
// ============================================================
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function norm(v: Vec2): Vec2 { const d = Math.sqrt(v.x * v.x + v.y * v.y) || 1; return { x: v.x / d, y: v.y / d }; }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function rngInt(min: number, max: number) { return Math.floor(rng(min, max + 1)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function circleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  return dist({ x: cx, y: cy }, { x: closestX, y: closestY }) < cr;
}

function resolveCircleRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): Vec2 {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  if (d < cr) {
    const overlap = cr - d;
    return { x: cx + (dx / d) * overlap, y: cy + (dy / d) * overlap };
  }
  return { x: cx, y: cy };
}

function generateWalls(wave: number): Wall[] {
  const walls: Wall[] = [];
  const count = 4 + Math.min(wave, 8);
  for (let i = 0; i < count; i++) {
    const horizontal = Math.random() > 0.5;
    const w = horizontal ? rngInt(2, 4) * TILE : TILE;
    const h = horizontal ? TILE : rngInt(2, 4) * TILE;
    const x = rngInt(1, COLS - 4) * TILE;
    const y = rngInt(1, ROWS - 4) * TILE;
    if (Math.abs(x + w / 2 - W / 2) < 100 && Math.abs(y + h / 2 - H / 2) < 100) continue;
    walls.push({ x, y, w, h });
  }
  return walls;
}

function spawnZombie(wave: number, walls: Wall[]): Zombie {
  const types: ZombieType[] = ["walker"];
  if (wave >= 2) types.push("runner");
  if (wave >= 3) types.push("spitter");
  if (wave >= 4) types.push("bloater");
  const type = types[rngInt(0, types.length - 1)];
  return makeZombie(type, wave);
}

function makeZombie(type: ZombieType, wave: number): Zombie {
  let x: number, y: number;
  const side = rngInt(0, 3);
  if (side === 0) { x = rng(0, W); y = -30; }
  else if (side === 1) { x = W + 30; y = rng(0, H); }
  else if (side === 2) { x = rng(0, W); y = H + 30; }
  else { x = -30; y = rng(0, H); }

  const scale = 1 + wave * 0.1;
  const stats: Record<ZombieType, { hp: number; damage: number; speed: number; r: number }> = {
    walker:  { hp: 25 * scale, damage: 8,  speed: 0.8 + wave * 0.04,  r: 14 },
    runner:  { hp: 15 * scale, damage: 6,  speed: 2.2 + wave * 0.08,  r: 11 },
    bloater: { hp: 80 * scale, damage: 25, speed: 0.5 + wave * 0.02,  r: 24 },
    spitter: { hp: 20 * scale, damage: 10, speed: 1.0 + wave * 0.03,  r: 13 },
    boss:    { hp: 400 * scale, damage: 20, speed: 1.0 + wave * 0.02, r: 36 },
  };
  const s = stats[type];
  return {
    x, y, vx: 0, vy: 0,
    hp: s.hp, maxHp: s.hp, damage: s.damage, speed: s.speed,
    type, r: s.r, shootCd: 0, attackCd: 0, flash: 0,
    id: Date.now() + Math.random() * 99999,
  };
}

function spawnBoss(wave: number): Zombie {
  const z = makeZombie("boss", wave);
  z.x = W / 2; z.y = -50;
  return z;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ZombieUltra() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [waveNum, setWaveNum] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const gameRef = useRef<{
    player: Player;
    bullets: Bullet[];
    zombies: Zombie[];
    drops: Drop[];
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
    touchMove: Vec2 | null;
    touchAim: Vec2 | null;
    autoShoot: boolean;
  } | null>(null);

  const makePlayer = (): Player => ({
    x: W / 2, y: H / 2, vx: 0, vy: 0,
    hp: 100, maxHp: 100, speed: 3,
    weapon: "pistol",
    ammo: { pistol: Infinity, shotgun: 0, rifle: 0, flamethrower: 0 },
    kills: 0,
    dodgeCd: 0, dodgeTimer: 0, dodgeDir: { x: 0, y: 0 },
    invincible: 0,
    shootCd: 0,
    speedBoost: 0,
  });

  const initGame = useCallback(() => {
    const walls = generateWalls(1);
    gameRef.current = {
      player: makePlayer(),
      bullets: [],
      zombies: [],
      drops: [],
      particles: [],
      walls,
      keys: new Set(),
      mouse: { x: W / 2, y: 0 },
      mouseDown: false,
      wave: 0,
      waveTimer: 2000,
      enemiesInWave: 0,
      enemiesSpawned: 0,
      spawnTimer: 0,
      screenShake: 0,
      time: 0,
      running: true,
      touchMove: null,
      touchAim: null,
      autoShoot: false,
    };
    setScore(0);
    setWaveNum(0);
    setGameState("playing");
  }, []);

  const addParticles = useCallback((x: number, y: number, count: number, color: string, type: ParticleType, speed = 3) => {
    const g = gameRef.current;
    if (!g) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = rng(0.5, speed);
      g.particles.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: rng(15, 40), maxLife: 40, r: rng(1.5, 4),
        color, type,
      });
    }
  }, []);

  const shootBullet = useCallback((player: Player, mouse: Vec2, g: NonNullable<typeof gameRef.current>) => {
    const ws = WEAPON_STATS[player.weapon];
    if (player.ammo[player.weapon] <= 0 && player.weapon !== "pistol") {
      player.weapon = "pistol";
      return;
    }
    if (player.shootCd > 0) return;
    player.shootCd = ws.fireRate;
    if (player.weapon !== "pistol") {
      player.ammo[player.weapon] = Math.max(0, player.ammo[player.weapon] - 1);
    }
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const isFlame = player.weapon === "flamethrower";
    for (let i = 0; i < ws.count; i++) {
      const a = angle + rng(-ws.spread, ws.spread);
      const spd = ws.speed + rng(-0.5, 0.5);
      g.bullets.push({
        x: player.x + Math.cos(angle) * 20,
        y: player.y + Math.sin(angle) * 20,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        damage: ws.damage,
        life: ws.range / spd,
        r: isFlame ? 6 : BULLET_R,
        fromEnemy: false,
        isFlame,
        trail: [],
      });
    }
    // muzzle flash
    addParticles(
      player.x + Math.cos(angle) * 22,
      player.y + Math.sin(angle) * 22,
      isFlame ? 8 : 3, isFlame ? "#ff6600" : "#ffee88", "spark", 2
    );
  }, [addParticles]);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let animFrame: number;
    let lastTime = performance.now();

    // Input handlers
    const onKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current; if (!g) return;
      g.keys.add(e.key.toLowerCase());
      if (e.key === " " && g.player.dodgeCd <= 0 && g.player.dodgeTimer <= 0) {
        e.preventDefault();
        const dx = (g.keys.has("d") ? 1 : 0) - (g.keys.has("a") ? 1 : 0);
        const dy = (g.keys.has("s") ? 1 : 0) - (g.keys.has("w") ? 1 : 0);
        const dir = (dx === 0 && dy === 0) ? norm({ x: g.mouse.x - g.player.x, y: g.mouse.y - g.player.y }) : norm({ x: dx, y: dy });
        g.player.dodgeTimer = DODGE_DUR;
        g.player.dodgeDir = dir;
        g.player.dodgeCd = DODGE_CD;
        g.player.invincible = DODGE_DUR;
      }
      if (e.key === "1") g.player.weapon = "pistol";
      if (e.key === "2" && g.player.ammo.shotgun > 0) g.player.weapon = "shotgun";
      if (e.key === "3" && g.player.ammo.rifle > 0) g.player.weapon = "rifle";
      if (e.key === "4" && g.player.ammo.flamethrower > 0) g.player.weapon = "flamethrower";
    };
    const onKeyUp = (e: KeyboardEvent) => { gameRef.current?.keys.delete(e.key.toLowerCase()); };
    const onMouseMove = (e: MouseEvent) => {
      const g = gameRef.current; if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      g.mouse = { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { const g = gameRef.current; if (g) g.mouseDown = true; }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) { const g = gameRef.current; if (g) g.mouseDown = false; }
    };

    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const g = gameRef.current; if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const tx = (t.clientX - rect.left) * sx;
        const ty = (t.clientY - rect.top) * sy;
        if (tx < W / 2) {
          g.touchMove = { x: tx, y: ty };
        } else {
          g.touchAim = { x: tx, y: ty };
          g.autoShoot = true;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const g = gameRef.current; if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const tx = (t.clientX - rect.left) * sx;
        const ty = (t.clientY - rect.top) * sy;
        if (tx < W / 2) {
          g.touchMove = { x: tx, y: ty };
        } else {
          g.touchAim = { x: tx, y: ty };
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const g = gameRef.current; if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const tx = (t.clientX - rect.left) * sx;
        if (tx < W / 2) {
          g.touchMove = null;
        } else {
          g.touchAim = null;
          g.autoShoot = false;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    // ============================================================
    // UPDATE
    // ============================================================
    function update(dt: number) {
      const g = gameRef.current;
      if (!g || !g.running) return;
      const p = g.player;
      g.time += dt;

      // Timers
      if (p.shootCd > 0) p.shootCd -= dt;
      if (p.dodgeCd > 0) p.dodgeCd -= dt;
      if (p.invincible > 0) p.invincible -= dt;
      if (p.speedBoost > 0) p.speedBoost -= dt;
      if (g.screenShake > 0) g.screenShake -= dt;

      // Dodge roll
      if (p.dodgeTimer > 0) {
        p.dodgeTimer -= dt;
        const dodgeSpeed = DODGE_DIST / DODGE_DUR * dt;
        p.x += p.dodgeDir.x * dodgeSpeed;
        p.y += p.dodgeDir.y * dodgeSpeed;
        // trail particles
        addParticles(p.x, p.y, 2, "#88ccff", "trail", 1);
      } else {
        // Movement
        let dx = 0, dy = 0;
        if (g.keys.has("w") || g.keys.has("arrowup")) dy -= 1;
        if (g.keys.has("s") || g.keys.has("arrowdown")) dy += 1;
        if (g.keys.has("a") || g.keys.has("arrowleft")) dx -= 1;
        if (g.keys.has("d") || g.keys.has("arrowright")) dx += 1;

        // Touch move
        if (g.touchMove) {
          const tdx = g.touchMove.x - p.x;
          const tdy = g.touchMove.y - p.y;
          if (Math.abs(tdx) > 10 || Math.abs(tdy) > 10) {
            const tn = norm({ x: tdx, y: tdy });
            dx = tn.x; dy = tn.y;
          }
        }

        if (dx !== 0 || dy !== 0) {
          const n = norm({ x: dx, y: dy });
          const spd = p.speed * (p.speedBoost > 0 ? 1.5 : 1);
          p.vx = n.x * spd;
          p.vy = n.y * spd;
        } else {
          p.vx *= 0.7; p.vy *= 0.7;
        }
        p.x += p.vx; p.y += p.vy;
      }

      // Wall collision for player
      for (const w of g.walls) {
        if (circleRect(p.x, p.y, PLAYER_R, w.x, w.y, w.w, w.h)) {
          const res = resolveCircleRect(p.x, p.y, PLAYER_R, w.x, w.y, w.w, w.h);
          p.x = res.x; p.y = res.y;
        }
      }
      p.x = clamp(p.x, PLAYER_R, W - PLAYER_R);
      p.y = clamp(p.y, PLAYER_R, H - PLAYER_R);

      // Touch auto-shoot: aim at nearest zombie
      if (g.autoShoot && g.zombies.length > 0) {
        let nearest = g.zombies[0];
        let nd = dist(p, nearest);
        for (const z of g.zombies) {
          const d = dist(p, z);
          if (d < nd) { nearest = z; nd = d; }
        }
        g.mouse = { x: nearest.x, y: nearest.y };
        shootBullet(p, g.mouse, g);
      }

      // Shooting
      if (g.mouseDown) {
        shootBullet(p, g.mouse, g);
      }

      // Wave system
      g.waveTimer -= dt;
      if (g.waveTimer <= 0 && g.enemiesSpawned >= g.enemiesInWave && g.zombies.length === 0) {
        g.wave++;
        setWaveNum(g.wave);
        g.walls = generateWalls(g.wave);
        g.enemiesInWave = 3 + g.wave * 2 + Math.floor(g.wave * g.wave * 0.3);
        g.enemiesSpawned = 0;
        g.spawnTimer = 0;
        g.waveTimer = 3000;
        if (g.wave % 5 === 0) {
          g.zombies.push(spawnBoss(g.wave));
          g.screenShake = 500;
        }
      }

      // Spawn zombies
      if (g.enemiesSpawned < g.enemiesInWave) {
        g.spawnTimer -= dt;
        if (g.spawnTimer <= 0) {
          g.zombies.push(spawnZombie(g.wave, g.walls));
          g.enemiesSpawned++;
          g.spawnTimer = Math.max(200, 1500 - g.wave * 80);
        }
      }

      // Update zombies
      for (const z of g.zombies) {
        if (z.flash > 0) z.flash -= dt;
        if (z.attackCd > 0) z.attackCd -= dt;
        if (z.shootCd > 0) z.shootCd -= dt;

        const dz = dist(p, z);
        const dirToPlayer = norm({ x: p.x - z.x, y: p.y - z.y });

        if (z.type === "walker" || z.type === "bloater" || z.type === "boss") {
          // Direct chase
          z.vx = dirToPlayer.x * z.speed;
          z.vy = dirToPlayer.y * z.speed;
        } else if (z.type === "runner") {
          // Flanking: add perpendicular offset
          const flankAngle = Math.sin(g.time * 0.003 + z.id) * 0.8;
          const ca = Math.atan2(dirToPlayer.y, dirToPlayer.x) + flankAngle;
          z.vx = Math.cos(ca) * z.speed;
          z.vy = Math.sin(ca) * z.speed;
        } else if (z.type === "spitter") {
          // Keep distance, shoot acid
          const desiredDist = 200;
          if (dz < desiredDist - 30) {
            z.vx = -dirToPlayer.x * z.speed;
            z.vy = -dirToPlayer.y * z.speed;
          } else if (dz > desiredDist + 50) {
            z.vx = dirToPlayer.x * z.speed;
            z.vy = dirToPlayer.y * z.speed;
          } else {
            z.vx *= 0.9; z.vy *= 0.9;
          }
          if (z.shootCd <= 0 && dz < 350) {
            z.shootCd = 2000;
            const a = Math.atan2(p.y - z.y, p.x - z.x);
            g.bullets.push({
              x: z.x, y: z.y,
              vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
              damage: z.damage, life: 80, r: 5,
              fromEnemy: true, isAcid: true, trail: [],
            });
          }
        }

        // Boss special: shoots occasionally
        if (z.type === "boss" && z.shootCd <= 0 && dz < 400) {
          z.shootCd = 1500;
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            g.bullets.push({
              x: z.x, y: z.y,
              vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5,
              damage: z.damage * 0.5, life: 60, r: 5,
              fromEnemy: true, trail: [],
            });
          }
          g.screenShake = 200;
        }

        z.x += z.vx; z.y += z.vy;

        // Wall collision for zombies
        for (const w of g.walls) {
          if (circleRect(z.x, z.y, z.r, w.x, w.y, w.w, w.h)) {
            const res = resolveCircleRect(z.x, z.y, z.r, w.x, w.y, w.w, w.h);
            z.x = res.x; z.y = res.y;
          }
        }

        // Melee attack player
        if (dz < z.r + PLAYER_R && z.attackCd <= 0 && p.invincible <= 0) {
          p.hp -= z.damage;
          z.attackCd = 800;
          g.screenShake = 150;
          addParticles(p.x, p.y, 5, "#ff4444", "blood", 3);
          if (p.hp <= 0) {
            p.hp = 0;
            g.running = false;
            const finalScore = p.kills * 10 + g.wave * 50;
            setScore(finalScore);
            setBestScore(prev => Math.max(prev, finalScore));
            setGameState("dead");
          }
        }
      }

      // Zombie-zombie repulsion
      for (let i = 0; i < g.zombies.length; i++) {
        for (let j = i + 1; j < g.zombies.length; j++) {
          const a = g.zombies[i], b = g.zombies[j];
          const d = dist(a, b);
          const minD = a.r + b.r;
          if (d < minD && d > 0) {
            const overlap = (minD - d) / 2;
            const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
            a.x -= nx * overlap; a.y -= ny * overlap;
            b.x += nx * overlap; b.y += ny * overlap;
          }
        }
      }

      // Update bullets
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i];
        // Store trail
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.shift();

        b.x += b.vx; b.y += b.vy;
        b.life -= 1;

        if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
          g.bullets.splice(i, 1);
          continue;
        }

        // Wall collision
        let hitWall = false;
        for (const w of g.walls) {
          if (circleRect(b.x, b.y, b.r, w.x, w.y, w.w, w.h)) {
            hitWall = true;
            break;
          }
        }
        if (hitWall) {
          addParticles(b.x, b.y, 3, "#ffaa44", "spark", 2);
          g.bullets.splice(i, 1);
          continue;
        }

        if (!b.fromEnemy) {
          // Hit zombies
          for (let j = g.zombies.length - 1; j >= 0; j--) {
            const z = g.zombies[j];
            if (dist(b, z) < b.r + z.r) {
              z.hp -= b.damage;
              z.flash = 100;
              addParticles(b.x, b.y, 6, "#880000", "blood", 3);
              g.screenShake = Math.max(g.screenShake, 30);

              if (!b.isFlame) {
                g.bullets.splice(i, 1);
              } else {
                b.damage *= 0.7; // flame passes through but weaker
              }

              if (z.hp <= 0) {
                // Kill
                p.kills++;
                addParticles(z.x, z.y, 15, ZOMBIE_COLORS[z.type], "blood", 4);

                // Bloater explosion
                if (z.type === "bloater") {
                  g.screenShake = 400;
                  addParticles(z.x, z.y, 30, "#ff6600", "explosion", 6);
                  // Damage nearby zombies & player
                  for (const oz of g.zombies) {
                    if (oz.id !== z.id && dist(oz, z) < 80) oz.hp -= 40;
                  }
                  if (dist(p, z) < 80 && p.invincible <= 0) {
                    p.hp -= 20;
                    if (p.hp <= 0) {
                      p.hp = 0; g.running = false;
                      const finalScore = p.kills * 10 + g.wave * 50;
                      setScore(finalScore);
                      setBestScore(prev => Math.max(prev, finalScore));
                      setGameState("dead");
                    }
                  }
                }

                // Boss explosion
                if (z.type === "boss") {
                  g.screenShake = 600;
                  addParticles(z.x, z.y, 40, "#ff0088", "explosion", 8);
                }

                // Drop items
                const dropRoll = Math.random();
                if (dropRoll < 0.3) {
                  const dType: DropType = dropRoll < 0.1 ? "health" : dropRoll < 0.2 ? "speed" : "ammo";
                  g.drops.push({ x: z.x, y: z.y, type: dType, life: 600, pulse: 0 });
                }
                // Weapon drops from bosses and random
                if (z.type === "boss" || Math.random() < 0.05) {
                  const weapons: WeaponType[] = ["shotgun", "rifle", "flamethrower"];
                  const wep = weapons[rngInt(0, 2)];
                  // Give ammo for that weapon
                  p.ammo[wep] += wep === "shotgun" ? 20 : wep === "rifle" ? 40 : 60;
                }

                g.zombies.splice(j, 1);
              }
              break;
            }
          }
        } else {
          // Enemy bullet hits player
          if (dist(b, p) < b.r + PLAYER_R && p.invincible <= 0) {
            p.hp -= b.damage;
            addParticles(p.x, p.y, 5, b.isAcid ? "#7ec850" : "#ff4444", "blood", 2);
            g.screenShake = 100;
            g.bullets.splice(i, 1);
            if (p.hp <= 0) {
              p.hp = 0; g.running = false;
              const finalScore = p.kills * 10 + g.wave * 50;
              setScore(finalScore);
              setBestScore(prev => Math.max(prev, finalScore));
              setGameState("dead");
            }
          }
        }
      }

      // Update drops
      for (let i = g.drops.length - 1; i >= 0; i--) {
        const d = g.drops[i];
        d.life -= 1;
        d.pulse += 0.1;
        if (d.life <= 0) { g.drops.splice(i, 1); continue; }
        if (dist(d, p) < 30) {
          if (d.type === "health") {
            p.hp = Math.min(p.maxHp, p.hp + 25);
            addParticles(d.x, d.y, 8, "#44ff44", "spark", 2);
          } else if (d.type === "ammo") {
            // Refill current weapon ammo or give shotgun/rifle
            if (p.weapon === "pistol") {
              const weapons: WeaponType[] = ["shotgun", "rifle", "flamethrower"];
              const wep = weapons[rngInt(0, 2)];
              p.ammo[wep] += wep === "shotgun" ? 15 : wep === "rifle" ? 30 : 50;
            } else {
              p.ammo[p.weapon] += p.weapon === "shotgun" ? 10 : p.weapon === "rifle" ? 20 : 40;
            }
            addParticles(d.x, d.y, 8, "#ffcc00", "spark", 2);
          } else if (d.type === "speed") {
            p.speedBoost = 5000;
            addParticles(d.x, d.y, 8, "#44ccff", "spark", 2);
          }
          g.drops.splice(i, 1);
        }
      }

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx *= 0.95; pt.vy *= 0.95;
        pt.life -= 1;
        if (pt.life <= 0) g.particles.splice(i, 1);
      }
    }

    // ============================================================
    // DRAW
    // ============================================================
    function draw() {
      const g = gameRef.current;
      if (!g) return;
      const p = g.player;

      // Screen shake
      ctx.save();
      if (g.screenShake > 0) {
        const shakeAmt = Math.min(g.screenShake / 50, 8);
        ctx.translate(rng(-shakeAmt, shakeAmt), rng(-shakeAmt, shakeAmt));
      }

      // Background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Walls (barricades)
      for (const w of g.walls) {
        ctx.fillStyle = "#3a3a5c";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "#555577";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        // Wood plank lines
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        if (w.w > w.h) {
          for (let lx = w.x + 10; lx < w.x + w.w; lx += 20) {
            ctx.beginPath(); ctx.moveTo(lx, w.y); ctx.lineTo(lx, w.y + w.h); ctx.stroke();
          }
        } else {
          for (let ly = w.y + 10; ly < w.y + w.h; ly += 20) {
            ctx.beginPath(); ctx.moveTo(w.x, ly); ctx.lineTo(w.x + w.w, ly); ctx.stroke();
          }
        }
      }

      // Drops
      for (const d of g.drops) {
        const pulseR = 10 + Math.sin(d.pulse) * 3;
        const alpha = d.life < 100 ? d.life / 100 : 1;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, pulseR, 0, Math.PI * 2);
        if (d.type === "health") {
          ctx.fillStyle = "#44ff44";
          ctx.fill();
          // Red cross
          ctx.fillStyle = "#ff3333";
          ctx.fillRect(d.x - 3, d.y - 7, 6, 14);
          ctx.fillRect(d.x - 7, d.y - 3, 14, 6);
        } else if (d.type === "ammo") {
          ctx.fillStyle = "#ffcc00";
          ctx.fill();
          ctx.fillStyle = "#886600";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("탄", d.x, d.y);
        } else {
          ctx.fillStyle = "#44ccff";
          ctx.fill();
          ctx.fillStyle = "#003366";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("⚡", d.x, d.y);
        }
        ctx.globalAlpha = 1;
      }

      // Bullet trails & bullets
      for (const b of g.bullets) {
        // Trail
        if (b.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(b.trail[0].x, b.trail[0].y);
          for (let k = 1; k < b.trail.length; k++) {
            ctx.lineTo(b.trail[k].x, b.trail[k].y);
          }
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = b.fromEnemy
            ? (b.isAcid ? "rgba(126,200,80,0.4)" : "rgba(255,80,80,0.4)")
            : (b.isFlame ? "rgba(255,100,0,0.5)" : "rgba(255,238,100,0.4)");
          ctx.lineWidth = b.r * 1.5;
          ctx.stroke();
        }
        // Bullet
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.fromEnemy
          ? (b.isAcid ? "#7ec850" : "#ff6666")
          : (b.isFlame ? "#ff6600" : "#ffee66");
        ctx.fill();
      }

      // Zombies
      for (const z of g.zombies) {
        ctx.save();
        const angleToP = Math.atan2(p.y - z.y, p.x - z.x);

        // Body
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        const baseColor = z.flash > 0 ? "#ffffff" : ZOMBIE_COLORS[z.type];
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes (towards player)
        const eyeDist = z.r * 0.4;
        const eyeR = z.r * 0.2;
        for (const side of [-1, 1]) {
          const ex = z.x + Math.cos(angleToP - side * 0.4) * eyeDist;
          const ey = z.y + Math.sin(angleToP - side * 0.4) * eyeDist;
          ctx.beginPath();
          ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
          ctx.fillStyle = z.type === "boss" ? "#ff0000" : "#ffff00";
          ctx.fill();
          // Pupil
          ctx.beginPath();
          ctx.arc(ex + Math.cos(angleToP) * eyeR * 0.3, ey + Math.sin(angleToP) * eyeR * 0.3, eyeR * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "#000";
          ctx.fill();
        }

        // HP bar
        if (z.hp < z.maxHp) {
          const barW = z.r * 2;
          const barH = 4;
          const barX = z.x - barW / 2;
          const barY = z.y - z.r - 10;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = z.hp / z.maxHp > 0.5 ? "#44ff44" : z.hp / z.maxHp > 0.25 ? "#ffcc00" : "#ff4444";
          ctx.fillRect(barX, barY, barW * (z.hp / z.maxHp), barH);
        }

        // Type indicator for boss
        if (z.type === "boss") {
          ctx.font = "bold 14px monospace";
          ctx.fillStyle = "#ff0088";
          ctx.textAlign = "center";
          ctx.fillText("BOSS", z.x, z.y - z.r - 16);
        }

        ctx.restore();
      }

      // Player
      ctx.save();
      const mouseAngle = Math.atan2(g.mouse.y - p.y, g.mouse.x - p.x);

      // Dodge flash
      if (p.dodgeTimer > 0) {
        ctx.globalAlpha = 0.5;
      }
      if (p.invincible > 0 && p.dodgeTimer <= 0) {
        ctx.globalAlpha = 0.5 + Math.sin(g.time * 0.02) * 0.3;
      }

      // Body
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fillStyle = p.speedBoost > 0 ? "#44ccff" : "#ddc88a";
      ctx.fill();
      ctx.strokeStyle = "#aa9960";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes looking at mouse
      for (const side of [-1, 1]) {
        const eyeX = p.x + Math.cos(mouseAngle - side * 0.5) * 7;
        const eyeY = p.y + Math.sin(mouseAngle - side * 0.5) * 7;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX + Math.cos(mouseAngle) * 1.5, eyeY + Math.sin(mouseAngle) * 1.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#222";
        ctx.fill();
      }

      // Gun
      const gunLen = 18;
      const gunW = 5;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(mouseAngle);
      ctx.fillStyle = "#555";
      ctx.fillRect(PLAYER_R - 4, -gunW / 2, gunLen, gunW);
      ctx.fillStyle = "#333";
      ctx.fillRect(PLAYER_R - 4 + gunLen - 4, -gunW / 2 - 1, 6, gunW + 2);
      ctx.restore();

      ctx.globalAlpha = 1;
      ctx.restore();

      // Particles
      for (const pt of g.particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Fog effect (flashlight)
      const fogGrd = ctx.createRadialGradient(p.x, p.y, FOG_RADIUS, p.x, p.y, FOG_RADIUS + 200);
      fogGrd.addColorStop(0, "rgba(0,0,0,0)");
      fogGrd.addColorStop(0.5, "rgba(0,0,0,0.5)");
      fogGrd.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = fogGrd;
      ctx.fillRect(0, 0, W, H);

      // HUD
      drawHUD(ctx, g);

      ctx.restore(); // screen shake
    }

    function drawHUD(ctx: CanvasRenderingContext2D, g: NonNullable<typeof gameRef.current>) {
      const p = g.player;

      // HP bar
      const hpBarW = 200, hpBarH = 18;
      const hpX = 15, hpY = 15;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(hpX - 2, hpY - 2, hpBarW + 4, hpBarH + 4);
      ctx.fillStyle = "#331111";
      ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
      const hpRatio = p.hp / p.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#44cc44" : hpRatio > 0.25 ? "#cccc44" : "#cc4444";
      ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, hpX + 5, hpY + 3);

      // Weapon indicator
      const ws = WEAPON_STATS[p.weapon];
      const ammoText = p.weapon === "pistol" ? "∞" : `${p.ammo[p.weapon]}`;
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#ffcc00";
      ctx.textAlign = "left";
      ctx.fillText(`🔫 ${ws.name} [${ammoText}]`, 15, 42);

      // All weapons hint
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      const weaponHints = [
        `1:권총${p.weapon === "pistol" ? "●" : ""}`,
        `2:샷건(${p.ammo.shotgun})${p.weapon === "shotgun" ? "●" : ""}`,
        `3:라이플(${p.ammo.rifle})${p.weapon === "rifle" ? "●" : ""}`,
        `4:화염(${p.ammo.flamethrower})${p.weapon === "flamethrower" ? "●" : ""}`,
      ];
      ctx.fillText(weaponHints.join("  "), 15, 60);

      // Wave and kills
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "#ff8844";
      ctx.textAlign = "right";
      ctx.fillText(`웨이브 ${g.wave}`, W - 15, 20);
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#cccccc";
      ctx.fillText(`처치 ${p.kills}`, W - 15, 42);

      // Dodge cooldown indicator
      if (p.dodgeCd > 0) {
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.textAlign = "left";
        ctx.fillText(`회피 ${(p.dodgeCd / 1000).toFixed(1)}s`, 15, 78);
      } else {
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(100,200,255,0.6)";
        ctx.textAlign = "left";
        ctx.fillText("Space: 회피 준비", 15, 78);
      }

      // Speed boost indicator
      if (p.speedBoost > 0) {
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#44ccff";
        ctx.textAlign = "left";
        ctx.fillText(`⚡ 속도 증가 ${(p.speedBoost / 1000).toFixed(1)}s`, 15, 94);
      }

      // Wave announcement
      if (g.waveTimer > 1500 && g.wave > 0) {
        ctx.font = "bold 36px monospace";
        ctx.fillStyle = `rgba(255,136,68,${Math.min(1, (g.waveTimer - 1500) / 1000)})`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`웨이브 ${g.wave}`, W / 2, H / 2 - 40);
        if (g.wave % 5 === 0) {
          ctx.font = "bold 24px monospace";
          ctx.fillStyle = `rgba(255,0,100,${Math.min(1, (g.waveTimer - 1500) / 1000)})`;
          ctx.fillText("⚠ 보스 등장! ⚠", W / 2, H / 2);
        }
      }
    }

    // ============================================================
    // MAIN LOOP
    // ============================================================
    function loop(time: number) {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;
      const g = gameRef.current;
      if (g && g.running) {
        update(dt);
        draw();
      }
      animFrame = requestAnimationFrame(loop);
    }
    animFrame = requestAnimationFrame(loop);

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
  }, [gameState, addParticles, shootBullet]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      {gameState === "menu" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">🧟</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-red-500 to-green-500 bg-clip-text text-transparent">ZOMBIE ULTRA</h1>
          <p className="text-gray-400 mb-6 text-sm">WASD 이동 | 마우스 조준/클릭 공격 | Space 회피</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>🎯 마우스로 조준, 클릭으로 공격</p>
            <p>💨 Space로 회피 (무적 구르기)</p>
            <p>🔫 1~4 키로 무기 변경</p>
            <p>🧟 좀비를 처치하고 아이템을 획득하세요</p>
            <p>💀 5웨이브마다 보스 등장!</p>
            <p>📱 터치: 왼쪽=이동, 오른쪽=자동조준</p>
          </div>
          <button onClick={initGame} className="w-full rounded-xl bg-gradient-to-r from-red-700 to-green-700 py-4 text-xl font-black hover:brightness-125 transition-all border border-red-500/30">
            게임 시작
          </button>
          {bestScore > 0 && <p className="mt-3 text-sm text-gray-500">최고 점수: {bestScore}</p>}
        </div>
      )}

      {(gameState === "playing" || gameState === "dead") && (
        <div className="relative">
          <Link href="/" className="absolute -top-8 left-0 text-sm text-gray-500 hover:text-white z-10">← 홈으로</Link>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block rounded-lg border border-gray-800 cursor-crosshair"
            style={{ maxWidth: "100vw", maxHeight: "80vh", imageRendering: "auto" }}
          />

          {gameState === "dead" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💀</div>
                <div className="text-3xl font-black text-red-500 mb-2">사망</div>
                <div className="text-gray-400 mb-1">웨이브 {waveNum} | 처치 {gameRef.current?.player.kills ?? 0}</div>
                <div className="text-yellow-400 text-xl font-bold mb-4">점수: {score}</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={initGame} className="rounded-xl bg-red-700 px-6 py-3 font-bold hover:bg-red-600">다시 하기</button>
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
