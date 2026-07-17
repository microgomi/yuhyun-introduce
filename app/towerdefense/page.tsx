"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ============================================================
// CONSTANTS
// ============================================================
const W = 800;
const H = 600;
const TILE = 40;
const COLS = W / TILE; // 20
const ROWS = H / TILE; // 15
const MAX_WAVES = 20;
const MAX_LIVES = 20;
const START_GOLD = 150;

type GameState = "menu" | "playing" | "gameover" | "victory";
type TowerType = "arrow" | "fire" | "ice" | "lightning" | "cannon";
type EnemyType = "basic" | "fast" | "armored" | "flying" | "boss";

interface Vec2 { x: number; y: number; }

// Path waypoints (grid coords) - S-shaped path
const PATH_POINTS: Vec2[] = [
  { x: 0, y: 2 },
  { x: 5, y: 2 },
  { x: 5, y: 5 },
  { x: 14, y: 5 },
  { x: 14, y: 2 },
  { x: 18, y: 2 },
  { x: 18, y: 8 },
  { x: 10, y: 8 },
  { x: 10, y: 11 },
  { x: 18, y: 11 },
  { x: 18, y: 14 },
  { x: 20, y: 14 },
];

// Build path tiles set for collision
function buildPathTiles(): Set<string> {
  const tiles = new Set<string>();
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i];
    const b = PATH_POINTS[i + 1];
    if (a.x === b.x) {
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      for (let y = minY; y <= maxY; y++) tiles.add(`${a.x},${y}`);
    } else {
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      for (let x = minX; x <= maxX; x++) tiles.add(`${x},${a.y}`);
    }
  }
  return tiles;
}

const PATH_TILES = buildPathTiles();

// Build pixel-level path segments for enemies to follow
function buildPathPixels(): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < PATH_POINTS.length; i++) {
    pts.push({ x: PATH_POINTS[i].x * TILE + TILE / 2, y: PATH_POINTS[i].y * TILE + TILE / 2 });
  }
  return pts;
}

const PATH_PIXELS = buildPathPixels();

function isAdjacentToPath(gx: number, gy: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.abs(dx) + Math.abs(dy) > 1) continue; // only cardinal
      if (PATH_TILES.has(`${gx + dx},${gy + dy}`)) return true;
    }
  }
  return false;
}

// ============================================================
// TOWER DEFINITIONS
// ============================================================
interface TowerDef {
  name: string;
  nameKo: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // ms between shots
  color: string;
  color2: string;
  splash: number; // splash radius, 0 = none
  slow: number; // slow factor 0-1
  chain: number; // chain count
  upgradeCost: number[];
  damagePerLevel: number;
  rangePerLevel: number;
  ratePerLevel: number;
}

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  arrow: {
    name: "Arrow", nameKo: "화살탑", cost: 50, range: 120, damage: 8, fireRate: 400,
    color: "#999", color2: "#666", splash: 0, slow: 0, chain: 0,
    upgradeCost: [40, 80], damagePerLevel: 5, rangePerLevel: 15, ratePerLevel: -50,
  },
  fire: {
    name: "Fire", nameKo: "화염탑", cost: 80, range: 100, damage: 12, fireRate: 800,
    color: "#e74c3c", color2: "#c0392b", splash: 50, slow: 0, chain: 0,
    upgradeCost: [60, 120], damagePerLevel: 8, rangePerLevel: 10, ratePerLevel: -80,
  },
  ice: {
    name: "Ice", nameKo: "냉기탑", cost: 60, range: 110, damage: 4, fireRate: 600,
    color: "#3498db", color2: "#2980b9", splash: 0, slow: 0.4, chain: 0,
    upgradeCost: [50, 100], damagePerLevel: 3, rangePerLevel: 15, ratePerLevel: -50,
  },
  lightning: {
    name: "Lightning", nameKo: "번개탑", cost: 100, range: 130, damage: 10, fireRate: 700,
    color: "#f1c40f", color2: "#9b59b6", splash: 0, slow: 0, chain: 3,
    upgradeCost: [70, 140], damagePerLevel: 6, rangePerLevel: 10, ratePerLevel: -60,
  },
  cannon: {
    name: "Cannon", nameKo: "대포탑", cost: 120, range: 100, damage: 30, fireRate: 1500,
    color: "#555", color2: "#333", splash: 60, slow: 0, chain: 0,
    upgradeCost: [90, 180], damagePerLevel: 15, rangePerLevel: 10, ratePerLevel: -100,
  },
};

// ============================================================
// INTERFACES
// ============================================================
interface Tower {
  gx: number; gy: number;
  type: TowerType;
  level: number; // 1-3
  fireCd: number;
  angle: number;
  recoil: number;
  id: number;
}

interface Enemy {
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number;
  type: EnemyType;
  pathIdx: number; // current target waypoint
  slowTimer: number;
  flash: number;
  id: number;
  flying: boolean;
}

interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  targetId: number;
  towerType: TowerType;
  splash: number;
  slow: number;
  chain: number;
  life: number;
  trail: Vec2[];
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  r: number;
  color: string;
}

// ============================================================
// HELPERS
// ============================================================
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function towerStats(t: Tower): { damage: number; range: number; fireRate: number; splash: number; slow: number; chain: number } {
  const def = TOWER_DEFS[t.type];
  const lvl = t.level - 1;
  return {
    damage: def.damage + def.damagePerLevel * lvl,
    range: def.range + def.rangePerLevel * lvl,
    fireRate: Math.max(200, def.fireRate + def.ratePerLevel * lvl),
    splash: def.splash,
    slow: def.slow > 0 ? def.slow + lvl * 0.1 : 0,
    chain: def.chain + lvl,
  };
}

function spawnWaveEnemies(wave: number): Enemy[] {
  const enemies: Enemy[] = [];
  const isBossWave = wave % 5 === 0;
  const count = isBossWave ? 5 + wave : 6 + wave * 2;
  const hpScale = 1 + wave * 0.15;

  const typePool: EnemyType[] = ["basic"];
  if (wave >= 3) typePool.push("fast");
  if (wave >= 5) typePool.push("armored");
  if (wave >= 7) typePool.push("flying");

  for (let i = 0; i < count; i++) {
    const type = typePool[Math.floor(Math.random() * typePool.length)];
    const baseStats: Record<EnemyType, { hp: number; speed: number }> = {
      basic: { hp: 30, speed: 1.0 },
      fast: { hp: 15, speed: 2.0 },
      armored: { hp: 80, speed: 0.6 },
      flying: { hp: 20, speed: 1.4 },
      boss: { hp: 500, speed: 0.5 },
    };
    const s = baseStats[type];
    enemies.push({
      x: PATH_PIXELS[0].x, y: PATH_PIXELS[0].y - (i * 40),
      hp: s.hp * hpScale, maxHp: s.hp * hpScale,
      speed: s.speed, type, pathIdx: 0,
      slowTimer: 0, flash: 0, flying: type === "flying",
      id: Date.now() + Math.random() * 100000 + i,
    });
  }

  if (isBossWave) {
    enemies.push({
      x: PATH_PIXELS[0].x, y: PATH_PIXELS[0].y - (count * 40),
      hp: 500 * hpScale, maxHp: 500 * hpScale,
      speed: 0.5, type: "boss", pathIdx: 0,
      slowTimer: 0, flash: 0, flying: false,
      id: Date.now() + 999999,
    });
  }

  return enemies;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TowerDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [displayGold, setDisplayGold] = useState(START_GOLD);
  const [displayLives, setDisplayLives] = useState(MAX_LIVES);
  const [displayWave, setDisplayWave] = useState(0);

  const gameRef = useRef<{
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
    particles: Particle[];
    gold: number;
    lives: number;
    wave: number;
    waveActive: boolean;
    waveEnemies: Enemy[];
    spawnTimer: number;
    spawnInterval: number;
    selectedTowerType: TowerType | null;
    selectedTower: Tower | null;
    hoveredTile: Vec2 | null;
    mouse: Vec2;
    towerIdCounter: number;
    autoWaveTimer: number;
    lastTime: number;
  } | null>(null);

  const initGame = useCallback(() => {
    gameRef.current = {
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      gold: START_GOLD,
      lives: MAX_LIVES,
      wave: 0,
      waveActive: false,
      waveEnemies: [],
      spawnTimer: 0,
      spawnInterval: 600,
      selectedTowerType: null,
      selectedTower: null,
      hoveredTile: null,
      mouse: { x: 0, y: 0 },
      towerIdCounter: 0,
      autoWaveTimer: 0,
      lastTime: performance.now(),
    };
    setDisplayGold(START_GOLD);
    setDisplayLives(MAX_LIVES);
    setDisplayWave(0);
    setGameState("playing");
  }, []);

  const startWave = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.waveActive) return;
    g.wave++;
    g.waveActive = true;
    g.waveEnemies = spawnWaveEnemies(g.wave);
    g.spawnTimer = 0;
    g.spawnInterval = Math.max(200, 600 - g.wave * 15);
    g.autoWaveTimer = 0;
    setDisplayWave(g.wave);
  }, []);

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

    let animId = 0;
    let running = true;

    // Event handlers
    const onMouseMove = (e: MouseEvent) => {
      const g = gameRef.current;
      if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      g.mouse = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
      const gx = Math.floor(g.mouse.x / TILE);
      const gy = Math.floor(g.mouse.y / TILE);
      if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
        g.hoveredTile = { x: gx, y: gy };
      } else {
        g.hoveredTile = null;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const g = gameRef.current;
      if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Check bottom panel clicks (tower selection / wave start)
      if (my >= H - 60) {
        // Tower type buttons
        const types: TowerType[] = ["arrow", "fire", "ice", "lightning", "cannon"];
        for (let i = 0; i < types.length; i++) {
          const bx = 10 + i * 110;
          if (mx >= bx && mx <= bx + 100 && my >= H - 55 && my <= H - 5) {
            if (g.selectedTowerType === types[i]) {
              g.selectedTowerType = null;
            } else {
              g.selectedTowerType = types[i];
            }
            g.selectedTower = null;
            return;
          }
        }
        // Wave start button
        if (mx >= W - 140 && mx <= W - 10 && my >= H - 55) {
          if (!g.waveActive) startWave();
          return;
        }
        return;
      }

      const gx = Math.floor(mx / TILE);
      const gy = Math.floor(my / TILE);

      // Placing a tower
      if (g.selectedTowerType) {
        const key = `${gx},${gy}`;
        if (PATH_TILES.has(key)) return;
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS - 1) return;
        if (!isAdjacentToPath(gx, gy) && !PATH_TILES.has(key)) {
          // Allow placement even if not adjacent (relaxed rule for playability)
          // But still require not on path
        }
        if (g.towers.some(t => t.gx === gx && t.gy === gy)) return;
        const def = TOWER_DEFS[g.selectedTowerType];
        if (g.gold < def.cost) return;
        g.gold -= def.cost;
        g.towers.push({
          gx, gy, type: g.selectedTowerType,
          level: 1, fireCd: 0, angle: 0, recoil: 0,
          id: g.towerIdCounter++,
        });
        setDisplayGold(g.gold);
        return;
      }

      // Clicking existing tower
      const clickedTower = g.towers.find(t => t.gx === gx && t.gy === gy);
      if (clickedTower) {
        g.selectedTower = clickedTower;
        g.selectedTowerType = null;
      } else {
        g.selectedTower = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.key === "Escape") {
        g.selectedTowerType = null;
        g.selectedTower = null;
      }
      if (e.key === " " || e.key === "Enter") {
        if (!g.waveActive) startWave();
      }
      // Number keys for tower selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        const types: TowerType[] = ["arrow", "fire", "ice", "lightning", "cannon"];
        g.selectedTowerType = types[num - 1];
        g.selectedTower = null;
      }
      // U to upgrade selected tower
      if (e.key === "u" || e.key === "U") {
        if (g.selectedTower && g.selectedTower.level < 3) {
          const def = TOWER_DEFS[g.selectedTower.type];
          const cost = def.upgradeCost[g.selectedTower.level - 1];
          if (g.gold >= cost) {
            g.gold -= cost;
            g.selectedTower.level++;
            setDisplayGold(g.gold);
          }
        }
      }
      // S to sell selected tower
      if (e.key === "s" || e.key === "S") {
        if (g.selectedTower) {
          const def = TOWER_DEFS[g.selectedTower.type];
          const refund = Math.floor(def.cost * 0.6);
          g.gold += refund;
          g.towers = g.towers.filter(t => t.id !== g.selectedTower!.id);
          g.selectedTower = null;
          setDisplayGold(g.gold);
        }
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    // ============================================================
    // UPDATE
    // ============================================================
    function update(dt: number) {
      const g = gameRef.current;
      if (!g) return;

      // Spawn enemies from wave queue
      if (g.waveActive && g.waveEnemies.length > 0) {
        g.spawnTimer += dt * 1000;
        if (g.spawnTimer >= g.spawnInterval) {
          g.spawnTimer = 0;
          const enemy = g.waveEnemies.shift()!;
          enemy.x = PATH_PIXELS[0].x;
          enemy.y = PATH_PIXELS[0].y;
          enemy.pathIdx = 1;
          g.enemies.push(enemy);
        }
      }

      // Check wave complete
      if (g.waveActive && g.waveEnemies.length === 0 && g.enemies.length === 0) {
        g.waveActive = false;
        g.autoWaveTimer = 0;
        // Gold bonus for completing wave
        g.gold += 20 + g.wave * 5;
        setDisplayGold(g.gold);

        // Victory check
        if (g.wave >= MAX_WAVES) {
          setGameState("victory");
          return;
        }
      }

      // Auto wave timer
      if (!g.waveActive && g.wave > 0 && g.wave < MAX_WAVES) {
        g.autoWaveTimer += dt * 1000;
        if (g.autoWaveTimer >= 15000) {
          startWave();
        }
      }

      // Update enemies
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        if (e.flash > 0) e.flash -= dt;
        if (e.slowTimer > 0) e.slowTimer -= dt;

        if (e.pathIdx < PATH_PIXELS.length) {
          const target = PATH_PIXELS[e.pathIdx];
          const dx = target.x - e.x;
          const dy = target.y - e.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const speedMul = e.slowTimer > 0 ? 0.5 : 1;
          const spd = e.speed * 60 * dt * speedMul;

          if (d < spd + 2) {
            e.x = target.x;
            e.y = target.y;
            e.pathIdx++;
          } else {
            e.x += (dx / d) * spd;
            e.y += (dy / d) * spd;
          }
        }

        // Reached end of path
        if (e.pathIdx >= PATH_PIXELS.length) {
          g.enemies.splice(i, 1);
          g.lives--;
          setDisplayLives(g.lives);
          // Spawn particles for life loss
          for (let p = 0; p < 8; p++) {
            g.particles.push({
              x: W - 20, y: e.y, vx: rng(-2, 2), vy: rng(-2, 2),
              life: 0.5, maxLife: 0.5, r: 3, color: "#e74c3c",
            });
          }
          if (g.lives <= 0) {
            setGameState("gameover");
            return;
          }
          continue;
        }

        // Remove dead enemies
        if (e.hp <= 0) {
          // Gold reward
          const goldReward = e.type === "boss" ? 50 : e.type === "armored" ? 15 : 10;
          g.gold += goldReward;
          setDisplayGold(g.gold);
          // Death particles
          const color = e.type === "boss" ? "#ff0055" : e.type === "armored" ? "#888" : e.type === "fast" ? "#2ecc71" : e.type === "flying" ? "#9b59b6" : "#e74c3c";
          for (let p = 0; p < 12; p++) {
            g.particles.push({
              x: e.x, y: e.y, vx: rng(-4, 4), vy: rng(-4, 4),
              life: 0.6, maxLife: 0.6, r: rng(2, 5), color,
            });
          }
          g.enemies.splice(i, 1);
          continue;
        }
      }

      // Update towers - find targets and shoot
      for (const tower of g.towers) {
        tower.fireCd -= dt * 1000;
        if (tower.recoil > 0) tower.recoil -= dt * 8;

        const stats = towerStats(tower);
        const tx = tower.gx * TILE + TILE / 2;
        const ty = tower.gy * TILE + TILE / 2;

        // Find closest enemy in range
        let closest: Enemy | null = null;
        let closestDist = Infinity;
        for (const e of g.enemies) {
          const d = dist({ x: tx, y: ty }, { x: e.x, y: e.y });
          if (d <= stats.range && d < closestDist) {
            closest = e;
            closestDist = d;
          }
        }

        if (closest) {
          tower.angle = Math.atan2(closest.y - ty, closest.x - tx);

          if (tower.fireCd <= 0) {
            tower.fireCd = stats.fireRate;
            tower.recoil = 1;

            const speed = 6;
            const dx = closest.x - tx;
            const dy = closest.y - ty;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;

            g.projectiles.push({
              x: tx, y: ty,
              vx: (dx / d) * speed, vy: (dy / d) * speed,
              damage: stats.damage,
              targetId: closest.id,
              towerType: tower.type,
              splash: stats.splash,
              slow: stats.slow,
              chain: stats.chain,
              life: 3,
              trail: [],
            });
          }
        }
      }

      // Update projectiles
      for (let i = g.projectiles.length - 1; i >= 0; i--) {
        const p = g.projectiles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.life -= dt;

        if (p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) {
          g.projectiles.splice(i, 1);
          continue;
        }

        // Check collision with enemies
        let hit = false;
        for (const e of g.enemies) {
          const d = dist({ x: p.x, y: p.y }, { x: e.x, y: e.y });
          const hitRadius = e.type === "boss" ? 20 : 14;
          if (d < hitRadius) {
            e.hp -= p.damage;
            e.flash = 0.1;
            hit = true;

            // Slow effect
            if (p.slow > 0) {
              e.slowTimer = 2;
            }

            // Splash damage
            if (p.splash > 0) {
              for (const e2 of g.enemies) {
                if (e2 === e) continue;
                const d2 = dist({ x: p.x, y: p.y }, { x: e2.x, y: e2.y });
                if (d2 < p.splash) {
                  e2.hp -= p.damage * 0.5;
                  e2.flash = 0.08;
                }
              }
              // Explosion particles
              for (let j = 0; j < 8; j++) {
                const angle = (j / 8) * Math.PI * 2;
                g.particles.push({
                  x: p.x, y: p.y,
                  vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                  life: 0.3, maxLife: 0.3, r: 4,
                  color: p.towerType === "fire" ? "#ff6600" : "#ffaa00",
                });
              }
            }

            // Chain lightning
            if (p.chain > 0) {
              let chainSource = { x: e.x, y: e.y };
              const chained = new Set<number>([e.id]);
              let chainsLeft = p.chain;
              for (const e2 of g.enemies) {
                if (chainsLeft <= 0) break;
                if (chained.has(e2.id)) continue;
                const d2 = dist(chainSource, { x: e2.x, y: e2.y });
                if (d2 < 80) {
                  e2.hp -= p.damage * 0.6;
                  e2.flash = 0.08;
                  chained.add(e2.id);
                  // Lightning particle trail
                  for (let j = 0; j < 4; j++) {
                    const t = j / 4;
                    g.particles.push({
                      x: lerp(chainSource.x, e2.x, t) + rng(-5, 5),
                      y: lerp(chainSource.y, e2.y, t) + rng(-5, 5),
                      vx: rng(-1, 1), vy: rng(-1, 1),
                      life: 0.2, maxLife: 0.2, r: 2,
                      color: "#f1c40f",
                    });
                  }
                  chainSource = { x: e2.x, y: e2.y };
                  chainsLeft--;
                }
              }
            }

            // Hit particle
            g.particles.push({
              x: p.x, y: p.y, vx: rng(-2, 2), vy: rng(-2, 2),
              life: 0.2, maxLife: 0.2, r: 3,
              color: p.towerType === "ice" ? "#88ddff" : p.towerType === "fire" ? "#ff4400" : "#fff",
            });

            break;
          }
        }
        if (hit) {
          g.projectiles.splice(i, 1);
        }
      }

      // Update particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.life -= dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        if (p.life <= 0) {
          g.particles.splice(i, 1);
        }
      }
    }

    // ============================================================
    // DRAW
    // ============================================================
    function draw() {
      const g = gameRef.current;
      if (!g) return;

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Draw grid (subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= W; x += TILE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 60); ctx.stroke();
      }
      for (let y = 0; y <= H - 60; y += TILE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Draw path
      PATH_TILES.forEach(key => {
        const [px, py] = key.split(",").map(Number);
        ctx.fillStyle = "rgba(139, 119, 101, 0.35)";
        ctx.fillRect(px * TILE, py * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(139, 119, 101, 0.15)";
        ctx.strokeRect(px * TILE, py * TILE, TILE, TILE);
      });

      // Draw path arrows (direction indicators)
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let i = 0; i < PATH_PIXELS.length - 1; i++) {
        const a = PATH_PIXELS[i];
        const b = PATH_PIXELS[i + 1];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -5);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw tower range for selected/hovered tower
      if (g.selectedTower) {
        const stats = towerStats(g.selectedTower);
        const tx = g.selectedTower.gx * TILE + TILE / 2;
        const ty = g.selectedTower.gy * TILE + TILE / 2;
        ctx.beginPath();
        ctx.arc(tx, ty, stats.range, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fill();
      }

      // Draw placement preview
      if (g.selectedTowerType && g.hoveredTile) {
        const { x: gx, y: gy } = g.hoveredTile;
        if (gy < ROWS - 1) {
          const key = `${gx},${gy}`;
          const onPath = PATH_TILES.has(key);
          const occupied = g.towers.some(t => t.gx === gx && t.gy === gy);
          const canAfford = g.gold >= TOWER_DEFS[g.selectedTowerType].cost;
          const valid = !onPath && !occupied && canAfford;

          ctx.fillStyle = valid ? "rgba(46,204,113,0.25)" : "rgba(231,76,60,0.25)";
          ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
          ctx.strokeStyle = valid ? "rgba(46,204,113,0.6)" : "rgba(231,76,60,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(gx * TILE, gy * TILE, TILE, TILE);

          // Show range preview
          if (valid) {
            const def = TOWER_DEFS[g.selectedTowerType];
            ctx.beginPath();
            ctx.arc(gx * TILE + TILE / 2, gy * TILE + TILE / 2, def.range, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(46,204,113,0.15)";
            ctx.stroke();
          }
        }
      }

      // Draw towers
      for (const tower of g.towers) {
        const def = TOWER_DEFS[tower.type];
        const tx = tower.gx * TILE + TILE / 2;
        const ty = tower.gy * TILE + TILE / 2;
        const recoilOffset = tower.recoil * 3;

        // Tower base
        ctx.fillStyle = def.color2;
        ctx.fillRect(tower.gx * TILE + 4, tower.gy * TILE + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = def.color;
        ctx.fillRect(tower.gx * TILE + 6, tower.gy * TILE + 6, TILE - 12, TILE - 12);

        // Tower barrel/indicator
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tower.angle);

        // Barrel
        ctx.fillStyle = def.color2;
        const barrelLen = 16 - recoilOffset;
        ctx.fillRect(0, -3, barrelLen, 6);

        ctx.restore();

        // Level stars
        for (let l = 0; l < tower.level; l++) {
          ctx.fillStyle = "#f1c40f";
          ctx.fillRect(tower.gx * TILE + 4 + l * 8, tower.gy * TILE + 2, 5, 3);
        }

        // Selection highlight
        if (g.selectedTower && g.selectedTower.id === tower.id) {
          ctx.strokeStyle = "#f1c40f";
          ctx.lineWidth = 2;
          ctx.strokeRect(tower.gx * TILE + 1, tower.gy * TILE + 1, TILE - 2, TILE - 2);
        }
      }

      // Draw enemies
      for (const e of g.enemies) {
        const r = e.type === "boss" ? 18 : e.type === "armored" ? 14 : 10;
        ctx.save();

        // Slow tint
        if (e.slowTimer > 0) {
          ctx.shadowColor = "#00ccff";
          ctx.shadowBlur = 10;
        }

        // Flash effect
        if (e.flash > 0) {
          ctx.fillStyle = "#fff";
        } else {
          const colors: Record<EnemyType, string> = {
            basic: "#e74c3c",
            fast: "#2ecc71",
            armored: "#95a5a6",
            flying: "#9b59b6",
            boss: "#ff0055",
          };
          ctx.fillStyle = colors[e.type];
        }

        // Body
        if (e.type === "armored") {
          // Square for armored
          ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
          ctx.strokeStyle = "#bbb";
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x - r, e.y - r, r * 2, r * 2);
        } else if (e.type === "flying") {
          // Diamond for flying
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - r);
          ctx.lineTo(e.x + r, e.y);
          ctx.lineTo(e.x, e.y + r);
          ctx.lineTo(e.x - r, e.y);
          ctx.closePath();
          ctx.fill();
          // Wings
          ctx.strokeStyle = "rgba(155,89,182,0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(e.x - r - 4, e.y - 4);
          ctx.lineTo(e.x - r + 2, e.y);
          ctx.moveTo(e.x + r + 4, e.y - 4);
          ctx.lineTo(e.x + r - 2, e.y);
          ctx.stroke();
        } else if (e.type === "boss") {
          // Hexagon for boss
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2 - Math.PI / 2;
            const px = e.x + Math.cos(a) * r;
            const py = e.y + Math.sin(a) * r;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#ff3377";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Circle for basic/fast
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Slow visual overlay
        if (e.slowTimer > 0) {
          ctx.fillStyle = "rgba(52,152,219,0.3)";
          ctx.beginPath();
          ctx.arc(e.x, e.y, r + 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Health bar
        if (e.hp < e.maxHp) {
          const barW = r * 2 + 4;
          const barH = 3;
          const barX = e.x - barW / 2;
          const barY = e.y - r - 6;
          ctx.fillStyle = "#333";
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = e.hp / e.maxHp > 0.5 ? "#2ecc71" : e.hp / e.maxHp > 0.25 ? "#f39c12" : "#e74c3c";
          ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
        }
      }

      // Draw projectiles
      for (const p of g.projectiles) {
        // Trail
        for (let j = 0; j < p.trail.length; j++) {
          const t = j / p.trail.length;
          const pt = p.trail[j];
          ctx.globalAlpha = t * 0.4;
          const trailColors: Record<TowerType, string> = {
            arrow: "#ccc",
            fire: "#ff6600",
            ice: "#66ccff",
            lightning: "#f1c40f",
            cannon: "#888",
          };
          ctx.fillStyle = trailColors[p.towerType];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2 * t, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Projectile body
        const projColors: Record<TowerType, string> = {
          arrow: "#ddd",
          fire: "#ff4400",
          ice: "#44ccff",
          lightning: "#ffee00",
          cannon: "#aaa",
        };
        ctx.fillStyle = projColors[p.towerType];
        const projR = p.towerType === "cannon" ? 5 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, projR, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowColor = projColors[p.towerType];
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, projR - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw particles
      for (const p of g.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ============================================================
      // BOTTOM PANEL (HUD)
      // ============================================================
      ctx.fillStyle = "#16213e";
      ctx.fillRect(0, H - 60, W, 60);
      ctx.strokeStyle = "#2a4a7f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - 60);
      ctx.lineTo(W, H - 60);
      ctx.stroke();

      // Tower buttons
      const types: TowerType[] = ["arrow", "fire", "ice", "lightning", "cannon"];
      for (let i = 0; i < types.length; i++) {
        const def = TOWER_DEFS[types[i]];
        const bx = 10 + i * 110;
        const by = H - 55;
        const selected = g.selectedTowerType === types[i];

        // Button bg
        ctx.fillStyle = selected ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.05)";
        ctx.fillRect(bx, by, 100, 50);
        ctx.strokeStyle = selected ? "#2ecc71" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeRect(bx, by, 100, 50);

        // Tower color indicator
        ctx.fillStyle = def.color;
        ctx.fillRect(bx + 4, by + 4, 18, 18);

        // Name and cost
        ctx.fillStyle = g.gold >= def.cost ? "#fff" : "#666";
        ctx.font = "bold 10px monospace";
        ctx.fillText(def.nameKo, bx + 26, by + 13);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "9px monospace";
        ctx.fillText(`${def.cost}G`, bx + 26, by + 24);

        // Hotkey
        ctx.fillStyle = "#555";
        ctx.font = "8px monospace";
        ctx.fillText(`[${i + 1}]`, bx + 78, by + 44);
      }

      // Wave start button
      const wbx = W - 140;
      const wby = H - 55;
      if (!g.waveActive) {
        ctx.fillStyle = "rgba(52,152,219,0.3)";
        ctx.fillRect(wbx, wby, 130, 50);
        ctx.strokeStyle = "#3498db";
        ctx.lineWidth = 2;
        ctx.strokeRect(wbx, wby, 130, 50);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("웨이브 시작", wbx + 65, wby + 22);
        ctx.font = "10px monospace";
        ctx.fillStyle = "#88bbdd";
        ctx.fillText("[Space]", wbx + 65, wby + 38);
        if (g.wave > 0) {
          const autoSec = Math.max(0, Math.ceil((15000 - g.autoWaveTimer) / 1000));
          ctx.fillStyle = "#666";
          ctx.font = "8px monospace";
          ctx.fillText(`자동: ${autoSec}초`, wbx + 65, wby + 48);
        }
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = "rgba(231,76,60,0.15)";
        ctx.fillRect(wbx, wby, 130, 50);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 1;
        ctx.strokeRect(wbx, wby, 130, 50);
        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`진행 중...`, wbx + 65, wby + 22);
        ctx.font = "10px monospace";
        ctx.fillStyle = "#999";
        ctx.fillText(`남은 적: ${g.waveEnemies.length + g.enemies.length}`, wbx + 65, wby + 38);
        ctx.textAlign = "left";
      }

      // ============================================================
      // TOP HUD
      // ============================================================
      // Background bar
      ctx.fillStyle = "rgba(22,33,62,0.85)";
      ctx.fillRect(0, 0, W, 30);
      ctx.strokeStyle = "#2a4a7f";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(W, 30); ctx.stroke();

      ctx.font = "bold 13px monospace";

      // Gold
      ctx.fillStyle = "#f1c40f";
      ctx.fillText(`💰 ${g.gold}G`, 10, 20);

      // Lives
      ctx.fillStyle = g.lives > 5 ? "#e74c3c" : "#ff0000";
      ctx.fillText(`❤️ ${g.lives}`, 150, 20);

      // Wave
      ctx.fillStyle = "#3498db";
      ctx.fillText(`🌊 웨이브 ${g.wave}/${MAX_WAVES}`, 260, 20);

      // Selected tower info
      if (g.selectedTower) {
        const st = g.selectedTower;
        const def = TOWER_DEFS[st.type];
        const stats = towerStats(st);
        ctx.fillStyle = "#fff";
        ctx.fillText(`${def.nameKo} Lv.${st.level}`, 450, 20);
        ctx.fillStyle = "#aaa";
        ctx.font = "10px monospace";
        ctx.fillText(`DMG:${stats.damage} RNG:${stats.range} SPD:${stats.fireRate}ms`, 580, 14);
        if (st.level < 3) {
          const cost = def.upgradeCost[st.level - 1];
          ctx.fillStyle = g.gold >= cost ? "#2ecc71" : "#e74c3c";
          ctx.fillText(`[U]업그레이드 ${cost}G | [S]판매`, 580, 26);
        } else {
          ctx.fillStyle = "#f1c40f";
          ctx.fillText(`MAX | [S]판매`, 580, 26);
        }
      }
    }

    // ============================================================
    // MAIN LOOP
    // ============================================================
    function loop(now: number) {
      if (!running) return;
      const g = gameRef.current;
      if (!g) return;

      const dt = Math.min((now - g.lastTime) / 1000, 0.05);
      g.lastTime = now;

      update(dt);
      draw();

      animId = requestAnimationFrame(loop);
    }

    if (gameRef.current) {
      gameRef.current.lastTime = performance.now();
    }
    animId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [gameState, startWave]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      {gameState === "menu" && (
        <div className="text-center px-4 max-w-md">
          <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
          <div className="text-6xl mb-4">🏰</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">타워 디펜스</h1>
          <p className="text-gray-400 mb-6 text-sm">타워를 세워 적을 막아라!</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>🏗️ 하단 패널에서 타워 선택 후 맵에 배치</p>
            <p>⬆️ 타워 클릭 → [U] 업그레이드, [S] 판매</p>
            <p>🌊 Space/Enter로 웨이브 시작</p>
            <p>🔢 1~5 키로 타워 빠른 선택</p>
            <p>💀 5웨이브마다 보스 등장!</p>
            <p>🏆 20 웨이브를 버텨라!</p>
          </div>
          <div className="text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-xs text-gray-400 space-y-1">
            <p><span className="inline-block w-3 h-3 bg-gray-500 mr-1 rounded-sm align-middle"></span> 화살탑 - 빠른 공격, 저렴</p>
            <p><span className="inline-block w-3 h-3 bg-red-500 mr-1 rounded-sm align-middle"></span> 화염탑 - 범위 피해</p>
            <p><span className="inline-block w-3 h-3 bg-blue-500 mr-1 rounded-sm align-middle"></span> 냉기탑 - 적 감속</p>
            <p><span className="inline-block w-3 h-3 bg-yellow-500 mr-1 rounded-sm align-middle"></span> 번개탑 - 연쇄 공격</p>
            <p><span className="inline-block w-3 h-3 bg-gray-700 mr-1 rounded-sm align-middle"></span> 대포탑 - 고데미지, 범위</p>
          </div>
          <button onClick={initGame} className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-red-600 py-4 text-xl font-black hover:brightness-125 transition-all border border-amber-400/30">
            게임 시작
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover" || gameState === "victory") && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block rounded-lg border border-gray-800 cursor-crosshair"
            style={{ maxWidth: "100vw", maxHeight: "85vh", imageRendering: "auto" }}
          />

          {gameState === "gameover" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💀</div>
                <div className="text-3xl font-black text-red-500 mb-2">게임 오버</div>
                <div className="text-gray-400 mb-1">웨이브 {displayWave}에서 패배</div>
                <div className="text-yellow-400 text-lg font-bold mb-4">골드: {displayGold}G</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={initGame} className="rounded-xl bg-amber-700 px-6 py-3 font-bold hover:bg-amber-600">다시 하기</button>
                  <button onClick={() => setGameState("menu")} className="rounded-xl bg-gray-700 px-6 py-3 font-bold hover:bg-gray-600">메뉴로</button>
                </div>
              </div>
            </div>
          )}

          {gameState === "victory" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🏆</div>
                <div className="text-3xl font-black text-yellow-400 mb-2">승리!</div>
                <div className="text-gray-400 mb-1">모든 웨이브를 클리어했습니다!</div>
                <div className="text-yellow-400 text-lg font-bold mb-1">남은 생명: {displayLives}</div>
                <div className="text-amber-400 text-lg font-bold mb-4">최종 골드: {displayGold}G</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={initGame} className="rounded-xl bg-amber-700 px-6 py-3 font-bold hover:bg-amber-600">다시 하기</button>
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
