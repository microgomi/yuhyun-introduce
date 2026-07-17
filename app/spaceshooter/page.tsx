"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ============================================================
// CONSTANTS
// ============================================================
const W = 400;
const H = 700;
const PLAYER_W = 30;
const PLAYER_H = 30;
const BULLET_SPEED = 8;
const SHOOT_INTERVAL = 150; // ms
const INVINCIBLE_DURATION = 2000;
const COMBO_TIMEOUT = 2000;
const MAX_LIVES = 3;
const BOSS_EVERY = 5;

type GameState = "menu" | "playing" | "dead";
type EnemyType = "basic" | "zigzag" | "fast" | "tank" | "boss";
type PowerUpType = "triple" | "shield" | "speed" | "bomb" | "laser";

interface Star {
  x: number; y: number; speed: number; size: number; layer: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  fromPlayer: boolean; r: number; damage: number;
}

interface Enemy {
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number; speed: number;
  type: EnemyType;
  phase: number; // for zigzag/boss patterns
  shootCd: number;
  flash: number;
  baseX: number; // original X for zigzag
}

interface PowerUp {
  x: number; y: number; type: PowerUpType;
  vy: number; life: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  color: string;
}

interface Laser {
  x: number; active: boolean; timer: number;
}

interface Player {
  x: number; y: number;
  lives: number;
  invincible: number;
  shootCd: number;
  // power-ups
  tripleTimer: number;
  shieldActive: boolean;
  shieldHp: number;
  speedTimer: number;
  laserTimer: number;
}

// ============================================================
// HELPERS
// ============================================================
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rectOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ============================================================
// COMPONENT
// ============================================================
export default function SpaceShooterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);

  const startGame = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const maybeCtx = canvasEl.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;
    const canvas: HTMLCanvasElement = canvasEl;

    // ===================== GAME STATE =====================
    let state: GameState = "menu";
    let score = 0;
    let wave = 0;
    let comboCount = 0;
    let comboMultiplier = 1;
    let comboTimer = 0;
    let highScore = 0;
    try { highScore = parseInt(localStorage.getItem("ss_highscore") || "0"); } catch {}

    let screenShake = 0;
    let flashAlpha = 0;

    let waveEnemiesLeft = 0;
    let waveSpawnTimer = 0;
    let waveDelay = 0;
    let bossAlive = false;

    const keys: Record<string, boolean> = {};
    let touchX = -1;
    let touchActive = false;

    // Stars
    const stars: Star[] = [];
    for (let i = 0; i < 120; i++) {
      const layer = randInt(0, 2);
      stars.push({
        x: rand(0, W), y: rand(0, H),
        speed: 0.5 + layer * 0.8,
        size: 1 + layer * 0.5,
        layer,
      });
    }

    // Player
    let player: Player = {
      x: W / 2 - PLAYER_W / 2, y: H - 80,
      lives: MAX_LIVES,
      invincible: 0,
      shootCd: 0,
      tripleTimer: 0,
      shieldActive: false,
      shieldHp: 0,
      speedTimer: 0,
      laserTimer: 0,
    };

    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let powerUps: PowerUp[] = [];
    let particles: Particle[] = [];
    let laser: Laser = { x: 0, active: false, timer: 0 };

    // ===================== WAVE SYSTEM =====================
    function startWave() {
      wave++;
      waveDelay = 60; // frames before spawning
      if (wave % BOSS_EVERY === 0) {
        waveEnemiesLeft = 1; // boss
        bossAlive = true;
      } else {
        waveEnemiesLeft = 4 + wave * 2;
        bossAlive = false;
      }
      waveSpawnTimer = 0;
    }

    function spawnEnemy() {
      if (wave % BOSS_EVERY === 0 && bossAlive) {
        // spawn boss
        const bossHp = 50 + wave * 10;
        enemies.push({
          x: W / 2 - 40, y: -80, w: 80, h: 60,
          hp: bossHp, maxHp: bossHp, speed: 1,
          type: "boss", phase: 0, shootCd: 60, flash: 0, baseX: W / 2 - 40,
        });
        return;
      }
      const difficulty = Math.min(wave, 20);
      const roll = Math.random();
      let type: EnemyType;
      if (roll < 0.35) type = "basic";
      else if (roll < 0.55) type = "zigzag";
      else if (roll < 0.75) type = "fast";
      else type = "tank";

      const w = type === "tank" ? 35 : 25;
      const h = type === "tank" ? 35 : 25;
      const x = rand(10, W - 10 - w);
      let hp = 1;
      let speed = 1 + difficulty * 0.1;
      if (type === "fast") { speed = 2.5 + difficulty * 0.15; hp = 1; }
      if (type === "tank") { speed = 0.7 + difficulty * 0.05; hp = 3 + Math.floor(difficulty / 3); }
      if (type === "zigzag") { speed = 1.2 + difficulty * 0.08; }

      enemies.push({
        x, y: -h - rand(0, 40), w, h,
        hp, maxHp: hp, speed,
        type, phase: rand(0, Math.PI * 2),
        shootCd: 0, flash: 0, baseX: x,
      });
    }

    function spawnPowerUp(x: number, y: number) {
      if (Math.random() > 0.15) return; // 15% chance
      const types: PowerUpType[] = ["triple", "shield", "speed", "bomb", "laser"];
      const type = types[randInt(0, types.length - 1)];
      powerUps.push({ x, y, type, vy: 1.5, life: 400 });
    }

    function spawnParticles(x: number, y: number, count: number, color: string, spread: number) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: rand(-spread, spread),
          vy: rand(-spread, spread),
          life: rand(15, 40),
          maxLife: 40,
          r: rand(1, 4),
          color,
        });
      }
    }

    function spawnExplosion(x: number, y: number, big: boolean) {
      const count = big ? 40 : 15;
      const spread = big ? 5 : 3;
      spawnParticles(x, y, count, "#ff6633", spread);
      spawnParticles(x, y, Math.floor(count / 2), "#ffcc00", spread * 0.7);
      spawnParticles(x, y, Math.floor(count / 3), "#ffffff", spread * 0.5);
      screenShake = big ? 12 : 5;
      flashAlpha = big ? 0.3 : 0.1;
    }

    function bombEffect() {
      for (const e of enemies) {
        if (e.type === "boss") {
          e.hp -= 20;
          e.flash = 8;
        } else {
          e.hp = 0;
        }
        spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === "boss");
      }
      screenShake = 20;
      flashAlpha = 0.6;
    }

    function addScore(pts: number) {
      comboCount++;
      comboTimer = COMBO_TIMEOUT;
      if (comboCount >= 10) comboMultiplier = 4;
      else if (comboCount >= 5) comboMultiplier = 3;
      else if (comboCount >= 3) comboMultiplier = 2;
      else comboMultiplier = 1;
      score += pts * comboMultiplier;
    }

    function hitPlayer() {
      if (player.invincible > 0) return;
      if (player.shieldActive && player.shieldHp > 0) {
        player.shieldHp--;
        if (player.shieldHp <= 0) player.shieldActive = false;
        screenShake = 5;
        flashAlpha = 0.15;
        return;
      }
      player.lives--;
      player.invincible = INVINCIBLE_DURATION;
      screenShake = 10;
      flashAlpha = 0.3;
      spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 20, "#00ccff", 4);
      if (player.lives <= 0) {
        state = "dead";
        if (score > highScore) {
          highScore = score;
          try { localStorage.setItem("ss_highscore", String(highScore)); } catch {}
        }
      }
    }

    function resetGame() {
      score = 0;
      wave = 0;
      comboCount = 0;
      comboMultiplier = 1;
      comboTimer = 0;
      bossAlive = false;
      player = {
        x: W / 2 - PLAYER_W / 2, y: H - 80,
        lives: MAX_LIVES, invincible: 0, shootCd: 0,
        tripleTimer: 0, shieldActive: false, shieldHp: 0,
        speedTimer: 0, laserTimer: 0,
      };
      bullets = [];
      enemies = [];
      powerUps = [];
      particles = [];
      laser = { x: 0, active: false, timer: 0 };
      state = "playing";
      startWave();
    }

    // ===================== INPUT =====================
    function onKeyDown(e: KeyboardEvent) {
      keys[e.key] = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      if (state === "menu" && (e.key === " " || e.key === "Enter")) resetGame();
      if (state === "dead" && (e.key === " " || e.key === "Enter")) resetGame();
    }
    function onKeyUp(e: KeyboardEvent) { keys[e.key] = false; }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      touchX = (e.touches[0].clientX - rect.left) * scaleX;
      touchActive = true;
      if (state === "menu" || state === "dead") resetGame();
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      touchX = (e.touches[0].clientX - rect.left) * scaleX;
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      touchActive = false;
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ===================== UPDATE =====================
    let lastTime = 0;
    const TARGET_DT = 1000 / 60;

    function update(dt: number) {
      if (state !== "playing") return;
      const dtScale = dt / TARGET_DT;

      // Combo decay
      if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) { comboCount = 0; comboMultiplier = 1; }
      }

      // Screen shake decay
      if (screenShake > 0) screenShake *= 0.85;
      if (screenShake < 0.5) screenShake = 0;
      if (flashAlpha > 0) flashAlpha *= 0.9;

      // Player movement
      const spd = (player.speedTimer > 0 ? 6 : 4) * dtScale;
      if (keys["ArrowLeft"] || keys["a"]) player.x -= spd;
      if (keys["ArrowRight"] || keys["d"]) player.x += spd;
      if (keys["ArrowUp"] || keys["w"]) player.y -= spd;
      if (keys["ArrowDown"] || keys["s"]) player.y += spd;

      if (touchActive) {
        const targetX = touchX - PLAYER_W / 2;
        const diff = targetX - player.x;
        const touchSpd = spd * 1.5;
        if (Math.abs(diff) > touchSpd) player.x += Math.sign(diff) * touchSpd;
        else player.x = targetX;
      }

      player.x = clamp(player.x, 0, W - PLAYER_W);
      player.y = clamp(player.y, 0, H - PLAYER_H);

      // Power-up timers
      if (player.tripleTimer > 0) player.tripleTimer -= dt;
      if (player.speedTimer > 0) player.speedTimer -= dt;
      if (player.laserTimer > 0) {
        player.laserTimer -= dt;
        laser.active = true;
        laser.x = player.x + PLAYER_W / 2;
        laser.timer = player.laserTimer;
      } else {
        laser.active = false;
      }
      if (player.invincible > 0) player.invincible -= dt;

      // Auto-shoot
      player.shootCd -= dt;
      if (player.shootCd <= 0 && !laser.active) {
        player.shootCd = SHOOT_INTERVAL;
        const bx = player.x + PLAYER_W / 2;
        const by = player.y;
        if (player.tripleTimer > 0) {
          bullets.push({ x: bx, y: by, vx: 0, vy: -BULLET_SPEED, fromPlayer: true, r: 3, damage: 1 });
          bullets.push({ x: bx, y: by, vx: -2, vy: -BULLET_SPEED, fromPlayer: true, r: 3, damage: 1 });
          bullets.push({ x: bx, y: by, vx: 2, vy: -BULLET_SPEED, fromPlayer: true, r: 3, damage: 1 });
        } else {
          bullets.push({ x: bx, y: by, vx: 0, vy: -BULLET_SPEED, fromPlayer: true, r: 3, damage: 1 });
        }
      }

      // Laser damage
      if (laser.active) {
        for (const e of enemies) {
          const lx = laser.x;
          if (lx > e.x && lx < e.x + e.w) {
            e.hp -= 0.3 * dtScale;
            e.flash = 3;
            if (Math.random() < 0.3) spawnParticles(lx, e.y + e.h / 2, 2, "#00ffff", 2);
          }
        }
      }

      // Update stars
      for (const s of stars) {
        s.y += s.speed * dtScale;
        if (s.y > H) { s.y = 0; s.x = rand(0, W); }
      }

      // Update bullets
      for (const b of bullets) {
        b.x += b.vx * dtScale;
        b.y += b.vy * dtScale;
      }
      bullets = bullets.filter(b => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

      // Update enemies
      for (const e of enemies) {
        if (e.flash > 0) e.flash--;
        e.phase += 0.03 * dtScale;

        if (e.type === "basic") {
          e.y += e.speed * dtScale;
        } else if (e.type === "zigzag") {
          e.y += e.speed * dtScale;
          e.x = e.baseX + Math.sin(e.phase) * 50;
        } else if (e.type === "fast") {
          e.y += e.speed * dtScale;
        } else if (e.type === "tank") {
          e.y += e.speed * dtScale;
          e.shootCd -= dt;
          if (e.shootCd <= 0 && e.y > 0) {
            e.shootCd = 1500;
            bullets.push({ x: e.x + e.w / 2, y: e.y + e.h, vx: 0, vy: 3, fromPlayer: false, r: 4, damage: 1 });
          }
        } else if (e.type === "boss") {
          // Boss moves to top area, then oscillates
          if (e.y < 40) {
            e.y += e.speed * dtScale;
          } else {
            e.x = W / 2 - e.w / 2 + Math.sin(e.phase * 0.5) * (W / 3);
          }
          e.shootCd -= dt;
          if (e.shootCd <= 0 && e.y > 0) {
            e.shootCd = 800 - Math.min(wave * 20, 400);
            const cx = e.x + e.w / 2;
            const cy = e.y + e.h;
            // Circular pattern
            if (Math.random() < 0.5) {
              const count = 8 + Math.floor(wave / 5) * 2;
              for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + e.phase;
                bullets.push({
                  x: cx, y: cy,
                  vx: Math.cos(angle) * 2.5,
                  vy: Math.sin(angle) * 2.5 + 1,
                  fromPlayer: false, r: 3, damage: 1,
                });
              }
            } else {
              // Spiral burst
              for (let i = 0; i < 5; i++) {
                const angle = e.phase * 2 + i * 0.4;
                bullets.push({
                  x: cx, y: cy,
                  vx: Math.cos(angle) * 3,
                  vy: Math.sin(angle) * 2 + 1.5,
                  fromPlayer: false, r: 3, damage: 1,
                });
              }
            }
          }
        }
      }

      // Bullet-enemy collision
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!b.fromPlayer) continue;
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei];
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.hp -= b.damage;
            e.flash = 5;
            spawnParticles(b.x, b.y, 4, "#ffaa00", 2);
            bullets.splice(bi, 1);
            break;
          }
        }
      }

      // Check dead enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
          const pts = e.type === "boss" ? 500 : e.type === "tank" ? 50 : 10;
          addScore(pts);
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === "boss" || e.type === "tank");
          spawnPowerUp(e.x + e.w / 2, e.y + e.h / 2);
          if (e.type === "boss") bossAlive = false;
          enemies.splice(i, 1);
          waveEnemiesLeft = Math.max(0, waveEnemiesLeft - 1);
        } else if (e.y > H + 50) {
          enemies.splice(i, 1);
          if (e.type !== "boss") waveEnemiesLeft = Math.max(0, waveEnemiesLeft - 1);
        }
      }

      // Enemy bullets hit player
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (b.fromPlayer) continue;
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2)) {
          hitPlayer();
          bullets.splice(bi, 1);
        }
      }

      // Enemy-player collision
      for (const e of enemies) {
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, e.x, e.y, e.w, e.h)) {
          hitPlayer();
        }
      }

      // Update power-ups
      for (const p of powerUps) {
        p.y += p.vy * dtScale;
        p.life -= dtScale;
      }
      powerUps = powerUps.filter(p => p.life > 0 && p.y < H + 20);

      // Collect power-ups
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, p.x - 10, p.y - 10, 20, 20)) {
          if (p.type === "triple") player.tripleTimer = 8000;
          else if (p.type === "shield") { player.shieldActive = true; player.shieldHp = 3; }
          else if (p.type === "speed") player.speedTimer = 6000;
          else if (p.type === "bomb") bombEffect();
          else if (p.type === "laser") player.laserTimer = 4000;
          spawnParticles(p.x, p.y, 10, "#00ff88", 3);
          flashAlpha = 0.1;
          powerUps.splice(i, 1);
        }
      }

      // Update particles
      for (const p of particles) {
        p.x += p.vx * dtScale;
        p.y += p.vy * dtScale;
        p.life -= dtScale;
      }
      particles = particles.filter(p => p.life > 0);

      // Engine trail
      if (Math.random() < 0.6) {
        spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H, 1, "#3399ff", 1);
      }

      // Wave spawning
      if (waveDelay > 0) {
        waveDelay -= dtScale;
      } else if (waveEnemiesLeft > 0 && enemies.length < 8 + wave) {
        waveSpawnTimer -= dt;
        if (waveSpawnTimer <= 0) {
          const interval = Math.max(200, 800 - wave * 30);
          waveSpawnTimer = interval;
          spawnEnemy();
        }
      } else if (waveEnemiesLeft <= 0 && enemies.length === 0) {
        startWave();
      }
    }

    // ===================== DRAW =====================
    function draw() {
      ctx.save();

      // Screen shake
      if (screenShake > 0) {
        const sx = rand(-screenShake, screenShake);
        const sy = rand(-screenShake, screenShake);
        ctx.translate(sx, sy);
      }

      // Background
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Stars (parallax)
      for (const s of stars) {
        const alpha = 0.3 + s.layer * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      if (state === "menu") {
        drawMenu();
        ctx.restore();
        return;
      }

      if (state === "playing" || state === "dead") {
        // Laser beam
        if (laser.active) {
          const lx = laser.x;
          const grad = ctx.createLinearGradient(lx - 8, 0, lx + 8, 0);
          grad.addColorStop(0, "rgba(0,255,255,0)");
          grad.addColorStop(0.3, "rgba(0,255,255,0.4)");
          grad.addColorStop(0.5, "rgba(255,255,255,0.9)");
          grad.addColorStop(0.7, "rgba(0,255,255,0.4)");
          grad.addColorStop(1, "rgba(0,255,255,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(lx - 15, 0, 30, player.y);
          // Core line
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(lx - 2, 0, 4, player.y);
        }

        // Enemies
        for (const e of enemies) {
          ctx.save();
          if (e.flash > 0) {
            ctx.fillStyle = "#ffffff";
          } else {
            if (e.type === "basic") ctx.fillStyle = "#e74c3c";
            else if (e.type === "zigzag") ctx.fillStyle = "#9b59b6";
            else if (e.type === "fast") ctx.fillStyle = "#e67e22";
            else if (e.type === "tank") ctx.fillStyle = "#2ecc71";
            else ctx.fillStyle = "#ff0055";
          }

          if (e.type === "boss") {
            // Boss: larger, more detailed
            ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = "#cc0044";
            ctx.fillRect(e.x + 10, e.y + 10, e.w - 20, e.h - 20);
            // Boss eye
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            // HP bar
            ctx.fillStyle = "#333";
            ctx.fillRect(e.x, e.y - 10, e.w, 5);
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(e.x, e.y - 10, e.w * (e.hp / e.maxHp), 5);
          } else {
            // Draw ship shape
            ctx.beginPath();
            ctx.moveTo(e.x + e.w / 2, e.y + e.h);
            ctx.lineTo(e.x, e.y);
            ctx.lineTo(e.x + e.w, e.y);
            ctx.closePath();
            ctx.fill();
            // Tank HP bar
            if (e.type === "tank") {
              ctx.fillStyle = "#333";
              ctx.fillRect(e.x, e.y - 8, e.w, 3);
              ctx.fillStyle = "#2ecc71";
              ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / e.maxHp), 3);
            }
          }
          ctx.restore();
        }

        // Power-ups
        for (const p of powerUps) {
          ctx.save();
          const pulse = Math.sin(Date.now() * 0.005) * 3;
          ctx.fillStyle = p.type === "triple" ? "#ff6600" :
                          p.type === "shield" ? "#00aaff" :
                          p.type === "speed" ? "#00ff66" :
                          p.type === "bomb" ? "#ff0044" :
                          "#00ffff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = p.type === "triple" ? "T" : p.type === "shield" ? "S" : p.type === "speed" ? "V" : p.type === "bomb" ? "B" : "L";
          ctx.fillText(label, p.x, p.y);
          ctx.restore();
        }

        // Bullets
        for (const b of bullets) {
          ctx.fillStyle = b.fromPlayer ? "#00ccff" : "#ff3366";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Particles
        for (const p of particles) {
          const alpha = p.life / p.maxLife;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Player
        if (player.invincible > 0 && Math.floor(player.invincible / 100) % 2 === 0) {
          // blink
        } else {
          drawPlayer();
        }

        // Shield visual
        if (player.shieldActive) {
          ctx.strokeStyle = `rgba(0,170,255,${0.4 + Math.sin(Date.now() * 0.01) * 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Flash overlay
        if (flashAlpha > 0.01) {
          ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
          ctx.fillRect(0, 0, W, H);
        }

        // HUD
        drawHud();

        // Dead overlay
        if (state === "dead") {
          drawDead();
        }
      }

      ctx.restore();
    }

    function drawPlayer() {
      const px = player.x;
      const py = player.y;
      // Main body
      ctx.fillStyle = "#00ccff";
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_W / 2, py);
      ctx.lineTo(px, py + PLAYER_H);
      ctx.lineTo(px + PLAYER_W, py + PLAYER_H);
      ctx.closePath();
      ctx.fill();
      // Cockpit
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2, py + PLAYER_H * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = "#0088cc";
      ctx.fillRect(px - 5, py + PLAYER_H - 8, 8, 8);
      ctx.fillRect(px + PLAYER_W - 3, py + PLAYER_H - 8, 8, 8);
    }

    function drawHud() {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, 40);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`점수: ${score}`, 8, 6);
      ctx.fillText(`웨이브: ${wave}`, 8, 24);

      ctx.textAlign = "right";
      // Lives
      ctx.fillText("❤️".repeat(player.lives), W - 8, 6);

      // Combo
      if (comboMultiplier > 1) {
        ctx.fillStyle = "#ffcc00";
        ctx.textAlign = "center";
        ctx.font = "bold 16px monospace";
        ctx.fillText(`x${comboMultiplier} 콤보! (${comboCount})`, W / 2, 6);
      }

      // Power-up indicators
      const indicators: string[] = [];
      if (player.tripleTimer > 0) indicators.push(`트리플 ${Math.ceil(player.tripleTimer / 1000)}s`);
      if (player.shieldActive) indicators.push(`실드 ${player.shieldHp}`);
      if (player.speedTimer > 0) indicators.push(`속도 ${Math.ceil(player.speedTimer / 1000)}s`);
      if (player.laserTimer > 0) indicators.push(`레이저 ${Math.ceil(player.laserTimer / 1000)}s`);

      if (indicators.length > 0) {
        ctx.fillStyle = "#00ff88";
        ctx.font = "11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(indicators.join(" | "), W - 8, 26);
      }
    }

    function drawMenu() {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("우주 슈터", W / 2, H / 3);

      ctx.font = "16px monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText("← → 또는 터치로 이동", W / 2, H / 3 + 50);
      ctx.fillText("자동 발사!", W / 2, H / 3 + 75);

      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 18px monospace";
      const blink = Math.sin(Date.now() * 0.005) > 0;
      if (blink) {
        ctx.fillText("ENTER 또는 터치로 시작", W / 2, H / 2 + 40);
      }

      if (highScore > 0) {
        ctx.fillStyle = "#ff9900";
        ctx.font = "14px monospace";
        ctx.fillText(`최고 점수: ${highScore}`, W / 2, H / 2 + 80);
      }
    }

    function drawDead() {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ff3333";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("게임 오버", W / 2, H / 3);

      ctx.fillStyle = "#ffffff";
      ctx.font = "20px monospace";
      ctx.fillText(`최종 점수: ${score}`, W / 2, H / 3 + 50);
      ctx.fillText(`웨이브: ${wave}`, W / 2, H / 3 + 80);

      if (score >= highScore && score > 0) {
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 16px monospace";
        ctx.fillText("🏆 새로운 최고 점수!", W / 2, H / 3 + 115);
      }

      const blink = Math.sin(Date.now() * 0.005) > 0;
      if (blink) {
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 18px monospace";
        ctx.fillText("ENTER 또는 터치로 재시작", W / 2, H / 2 + 60);
      }
    }

    // ===================== GAME LOOP =====================
    function gameLoop(time: number) {
      const dt = lastTime ? Math.min(time - lastTime, 50) : TARGET_DT;
      lastTime = time;

      // Update stars even on menu for visual effect
      if (state === "menu") {
        for (const s of stars) {
          s.y += s.speed;
          if (s.y > H) { s.y = 0; s.x = rand(0, W); }
        }
      }

      update(dt);
      draw();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const cleanup = startGame();
    return () => { if (cleanup) cleanup(); };
  }, [startGame]);

  return (
    <div style={{
      background: "#000",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px",
    }}>
      <div style={{ marginBottom: 10 }}>
        <Link href="/" style={{ color: "#aaa", fontSize: 14, textDecoration: "none" }}>
          ← 홈으로
        </Link>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          border: "1px solid #333",
          maxWidth: "100%",
          maxHeight: "calc(100vh - 60px)",
          touchAction: "none",
        }}
      />
    </div>
  );
}
