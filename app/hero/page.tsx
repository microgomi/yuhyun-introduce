"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "select" | "playing" | "boss" | "victory" | "gameover";

interface HeroDef {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  speed: number;
  skill: string;
  skillEmoji: string;
  skillDesc: string;
  color: string;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  emoji: string;
  name: string;
  speed: number;
  hitTimer: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  emoji: string;
  isEnemy: boolean;
  size: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  emoji: string;
}

// --- Constants ---
const W = 360;
const H = 580;

const HEROES: HeroDef[] = [
  { id: "fire", name: "불꽃 히어로", emoji: "🔥", hp: 100, atk: 15, speed: 4, skill: "fireball", skillEmoji: "☄️", skillDesc: "화염구 발사!", color: "from-red-500 to-orange-500" },
  { id: "ice", name: "얼음 히어로", emoji: "❄️", hp: 120, atk: 12, speed: 3.5, skill: "freeze", skillEmoji: "🧊", skillDesc: "적 전체 빙결!", color: "from-cyan-500 to-blue-500" },
  { id: "thunder", name: "번개 히어로", emoji: "⚡", hp: 90, atk: 18, speed: 5, skill: "lightning", skillEmoji: "🌩️", skillDesc: "번개 연쇄!", color: "from-yellow-400 to-amber-500" },
  { id: "nature", name: "자연 히어로", emoji: "🌿", hp: 130, atk: 10, speed: 3, skill: "heal", skillEmoji: "💚", skillDesc: "HP 회복!", color: "from-green-500 to-emerald-500" },
  { id: "shadow", name: "그림자 히어로", emoji: "🌑", hp: 85, atk: 20, speed: 5.5, skill: "shadowstrike", skillEmoji: "👤", skillDesc: "분신 공격!", color: "from-purple-600 to-slate-800" },
];

interface Wave {
  enemies: { emoji: string; name: string; hp: number; atk: number; speed: number; count: number }[];
}

const WAVES: Wave[] = [
  { enemies: [{ emoji: "🟢", name: "슬라임", hp: 30, atk: 5, speed: 1, count: 5 }] },
  { enemies: [{ emoji: "🦇", name: "박쥐", hp: 40, atk: 8, speed: 1.5, count: 6 }, { emoji: "🟢", name: "슬라임", hp: 30, atk: 5, speed: 1, count: 3 }] },
  { enemies: [{ emoji: "💀", name: "해골", hp: 60, atk: 12, speed: 1.2, count: 5 }, { emoji: "🦇", name: "박쥐", hp: 40, atk: 8, speed: 1.5, count: 4 }] },
  { enemies: [{ emoji: "👺", name: "고블린", hp: 80, atk: 15, speed: 1.3, count: 6 }, { emoji: "💀", name: "해골", hp: 60, atk: 12, speed: 1.2, count: 3 }] },
  { enemies: [{ emoji: "👹", name: "오크", hp: 120, atk: 18, speed: 1, count: 5 }, { emoji: "👺", name: "고블린", hp: 80, atk: 15, speed: 1.3, count: 4 }] },
];

const BOSS = { emoji: "🐉", name: "드래곤", hp: 500, atk: 25, speed: 0.8 };

let nid = 0;

export default function HeroPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedHero, setSelectedHero] = useState<HeroDef>(HEROES[0]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [skillGauge, setSkillGauge] = useState(0);
  const [message, setMessage] = useState("");
  const [kills, setKills] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [enemyCount, setEnemyCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const tickRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});

  const heroRef = useRef<HeroDef>(HEROES[0]);
  const playerRef = useRef({ x: W / 2, y: H - 80 });
  const enemiesRef = useRef<Enemy[]>([]);
  const projRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const hpRef = useRef(100);
  const maxHpRef = useRef(100);
  const skillRef = useRef(0);
  const waveRef = useRef(1);
  const killsRef = useRef(0);
  const gameOverRef = useRef(false);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const invRef = useRef(0);
  const spawnQueueRef = useRef<{ emoji: string; name: string; hp: number; atk: number; speed: number }[]>([]);
  const isBossRef = useRef(false);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1500);
  }, []);

  const addParticle = useCallback((x: number, y: number, emoji: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: ++nid, x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        life: 30 + Math.random() * 20,
        emoji,
      });
    }
  }, []);

  const setupWave = useCallback((w: number) => {
    waveRef.current = w;
    setWave(w);
    spawnQueueRef.current = [];

    if (w > WAVES.length) {
      // Boss
      isBossRef.current = true;
      enemiesRef.current = [{
        id: ++nid, x: W / 2, y: 80,
        hp: BOSS.hp, maxHp: BOSS.hp, atk: BOSS.atk,
        emoji: BOSS.emoji, name: BOSS.name, speed: BOSS.speed, hitTimer: 0,
      }];
      showMsg("🐉 보스 등장!!");
      setScreen("boss");
      return;
    }

    isBossRef.current = false;
    const waveDef = WAVES[w - 1];
    for (const e of waveDef.enemies) {
      for (let i = 0; i < e.count; i++) {
        spawnQueueRef.current.push({ emoji: e.emoji, name: e.name, hp: e.hp, atk: e.atk, speed: e.speed });
      }
    }
    // Shuffle
    for (let i = spawnQueueRef.current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawnQueueRef.current[i], spawnQueueRef.current[j]] = [spawnQueueRef.current[j], spawnQueueRef.current[i]];
    }
    showMsg(`🌊 웨이브 ${w}!`);
  }, [showMsg]);

  const startGame = useCallback((hero: HeroDef) => {
    cancelAnimationFrame(animRef.current);
    heroRef.current = hero;
    setSelectedHero(hero);
    playerRef.current = { x: W / 2, y: H - 80 };
    enemiesRef.current = [];
    projRef.current = [];
    particlesRef.current = [];
    spawnQueueRef.current = [];
    scoreRef.current = 0;
    hpRef.current = hero.hp;
    maxHpRef.current = hero.hp;
    skillRef.current = 0;
    killsRef.current = 0;
    gameOverRef.current = false;
    invRef.current = 0;
    isBossRef.current = false;
    tickRef.current = 0;
    nid = 0;

    setScore(0);
    setHp(hero.hp);
    setMaxHp(hero.hp);
    setSkillGauge(0);
    setKills(0);
    setMessage("");
    setEnemyCount(0);

    setScreen("playing");
    setupWave(1);
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
  }, [setupWave]);

  // Use skill
  const useSkill = useCallback(() => {
    if (skillRef.current < 100) return;
    skillRef.current = 0;
    setSkillGauge(0);
    const hero = heroRef.current;
    const px = playerRef.current.x;
    const py = playerRef.current.y;

    switch (hero.skill) {
      case "fireball":
        for (let i = -2; i <= 2; i++) {
          projRef.current.push({ id: ++nid, x: px, y: py - 20, vx: i * 2, vy: -6, dmg: hero.atk * 3, emoji: "☄️", isEnemy: false, size: 18 });
        }
        addParticle(px, py, "🔥", 8);
        showMsg("☄️ 화염구!!");
        break;
      case "freeze":
        for (const e of enemiesRef.current) {
          e.speed *= 0.2;
          e.hitTimer = 60;
          e.hp -= hero.atk;
        }
        addParticle(px, py, "❄️", 12);
        showMsg("🧊 전체 빙결!!");
        break;
      case "lightning":
        for (const e of enemiesRef.current.slice(0, 5)) {
          e.hp -= hero.atk * 2;
          e.hitTimer = 15;
          addParticle(e.x, e.y, "⚡", 3);
        }
        showMsg("🌩️ 번개 연쇄!!");
        break;
      case "heal":
        hpRef.current = Math.min(maxHpRef.current, hpRef.current + 40);
        setHp(hpRef.current);
        addParticle(px, py, "💚", 10);
        showMsg("💚 HP 회복!");
        break;
      case "shadowstrike":
        for (const e of enemiesRef.current.slice(0, 3)) {
          e.hp -= hero.atk * 2.5;
          e.hitTimer = 15;
          addParticle(e.x, e.y, "👤", 3);
        }
        invRef.current = 90;
        showMsg("👤 분신 공격!!");
        break;
    }
  }, [addParticle, showMsg]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tick = tickRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, isBossRef.current ? "#1a0505" : "#0a0a1a");
    bg.addColorStop(1, isBossRef.current ? "#2a0a0a" : "#15152a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars / embers
    ctx.fillStyle = isBossRef.current ? "rgba(255,100,50,0.3)" : "rgba(255,255,255,0.3)";
    for (let i = 0; i < 20; i++) {
      const sx = (i * 97.3 + tick * 0.1) % W;
      const sy = (i * 73.7 + tick * 0.05) % H;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, H - 30, W, 30);

    // Particles
    for (const p of particlesRef.current) {
      ctx.globalAlpha = Math.min(1, p.life / 15);
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // Enemies
    for (const e of enemiesRef.current) {
      // HP bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(e.x - 18, e.y - 28, 36, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? "#4ADE80" : e.hp / e.maxHp > 0.25 ? "#FBBF24" : "#EF4444";
      ctx.fillRect(e.x - 18, e.y - 28, 36 * (e.hp / e.maxHp), 5);

      // Hit flash
      if (e.hitTimer > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = isBossRef.current && e.emoji === BOSS.emoji ? "50px serif" : "30px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(e.emoji, e.x, e.y);

      if (isBossRef.current && e.emoji === BOSS.emoji) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(e.name, e.x, e.y - 45);
      }
    }

    // Projectiles
    for (const p of projRef.current) {
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, p.x, p.y);
    }

    // Player
    const px = playerRef.current.x;
    const py = playerRef.current.y;

    if (invRef.current > 0 && tick % 6 < 3) {
      ctx.globalAlpha = 0.4;
    }

    // Hero aura
    const hero = heroRef.current;
    ctx.fillStyle = `rgba(255,255,255,0.05)`;
    ctx.beginPath();
    ctx.arc(px, py, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "36px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hero.emoji, px, py);
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 55, [0, 0, 10, 10]);
    ctx.fill();

    // HP bar
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(10, 8, 140, 14, 5);
    ctx.fill();
    const hpRatio = hpRef.current / maxHpRef.current;
    ctx.fillStyle = hpRatio > 0.5 ? "#4ADE80" : hpRatio > 0.25 ? "#FBBF24" : "#EF4444";
    ctx.beginPath();
    ctx.roundRect(10, 8, 140 * hpRatio, 14, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`❤️ ${hpRef.current}/${maxHpRef.current}`, 80, 16);

    // Skill gauge
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(10, 28, 140, 12, 5);
    ctx.fill();
    ctx.fillStyle = skillRef.current >= 100 ? "#FFD700" : "#60A5FA";
    ctx.beginPath();
    ctx.roundRect(10, 28, 140 * (skillRef.current / 100), 12, 5);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px sans-serif";
    ctx.fillText(`${hero.skillEmoji} ${skillRef.current >= 100 ? "준비!" : Math.floor(skillRef.current) + "%"}`, 80, 35);

    // Score & wave
    ctx.textAlign = "right";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`⭐ ${scoreRef.current}`, W - 10, 16);
    ctx.fillText(`🌊 ${waveRef.current}/${WAVES.length + 1}`, W - 10, 32);
    ctx.fillText(`💀 ${killsRef.current}`, W - 10, 48);

    // Wave info
    ctx.textAlign = "center";
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`남은 적: ${enemiesRef.current.length + spawnQueueRef.current.length}`, W / 2, 48);
  }, []);

  // Game loop
  useEffect(() => {
    loopRef.current = () => {
      if (gameOverRef.current) return;
      tickRef.current++;
      const tick = tickRef.current;
      const hero = heroRef.current;

      // Player movement
      const mt = mouseRef.current;
      if (mt) {
        const dx = mt.x - playerRef.current.x;
        const dy = mt.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          playerRef.current.x += (dx / dist) * hero.speed;
          playerRef.current.y += (dy / dist) * hero.speed;
        }
      }
      playerRef.current.x = Math.max(20, Math.min(W - 20, playerRef.current.x));
      playerRef.current.y = Math.max(60, Math.min(H - 30, playerRef.current.y));

      // Auto-attack
      if (tick % 15 === 0 && enemiesRef.current.length > 0) {
        // Find closest enemy
        let closest: Enemy | null = null;
        let closestDist = Infinity;
        for (const e of enemiesRef.current) {
          const d = Math.sqrt((e.x - playerRef.current.x) ** 2 + (e.y - playerRef.current.y) ** 2);
          if (d < closestDist) { closestDist = d; closest = e; }
        }
        if (closest) {
          const angle = Math.atan2(closest.y - playerRef.current.y, closest.x - playerRef.current.x);
          const bulletEmoji = hero.id === "fire" ? "🔥" : hero.id === "ice" ? "❄️" : hero.id === "thunder" ? "⚡" : hero.id === "nature" ? "🍃" : "🌑";
          projRef.current.push({
            id: ++nid,
            x: playerRef.current.x, y: playerRef.current.y - 15,
            vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
            dmg: hero.atk, emoji: bulletEmoji, isEnemy: false, size: 14,
          });
        }
      }

      // Spawn enemies from queue
      if (spawnQueueRef.current.length > 0 && tick % 40 === 0) {
        const e = spawnQueueRef.current.pop()!;
        enemiesRef.current.push({
          id: ++nid,
          x: 30 + Math.random() * (W - 60),
          y: -20,
          hp: e.hp, maxHp: e.hp, atk: e.atk,
          emoji: e.emoji, name: e.name, speed: e.speed, hitTimer: 0,
        });
      }

      // Enemy AI
      for (const e of enemiesRef.current) {
        if (e.hitTimer > 0) e.hitTimer--;

        const dx = playerRef.current.x - e.x;
        const dy = playerRef.current.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          e.x += (dx / dist) * e.speed;
          e.y += (dy / dist) * e.speed;
        }

        // Enemy ranged attack (boss)
        if (isBossRef.current && tick % 60 === 0 && e.emoji === BOSS.emoji) {
          for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 / 5) * i + tick * 0.02;
            projRef.current.push({
              id: ++nid, x: e.x, y: e.y + 20,
              vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
              dmg: e.atk, emoji: "🔥", isEnemy: true, size: 12,
            });
          }
        }

        // Melee damage to player
        if (dist < 30 && invRef.current <= 0) {
          hpRef.current -= Math.max(1, Math.floor(e.atk * 0.3));
          invRef.current = 30;
          setHp(hpRef.current);

          if (hpRef.current <= 0) {
            gameOverRef.current = true;
            setScore(scoreRef.current);
            setKills(killsRef.current);
            setBestScore((p) => Math.max(p, scoreRef.current));
            setTotalGames((g) => g + 1);
            setScreen("gameover");
            draw();
            return;
          }
        }
      }

      // Invincibility timer
      if (invRef.current > 0) invRef.current--;

      // Update projectiles
      projRef.current = projRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) return false;

        if (!p.isEnemy) {
          // Hit enemies
          for (const e of enemiesRef.current) {
            const d = Math.sqrt((p.x - e.x) ** 2 + (p.y - e.y) ** 2);
            if (d < 22) {
              e.hp -= p.dmg;
              e.hitTimer = 8;
              skillRef.current = Math.min(100, skillRef.current + 3);
              addParticle(p.x, p.y, "💥", 2);
              return false;
            }
          }
        } else {
          // Hit player
          if (invRef.current <= 0) {
            const d = Math.sqrt((p.x - playerRef.current.x) ** 2 + (p.y - playerRef.current.y) ** 2);
            if (d < 20) {
              hpRef.current -= p.dmg;
              invRef.current = 30;
              setHp(hpRef.current);
              if (hpRef.current <= 0) {
                gameOverRef.current = true;
                setScore(scoreRef.current);
                setKills(killsRef.current);
                setBestScore((p2) => Math.max(p2, scoreRef.current));
                setTotalGames((g) => g + 1);
                setScreen("gameover");
                return false;
              }
              return false;
            }
          }
        }
        return true;
      });

      // Remove dead enemies
      enemiesRef.current = enemiesRef.current.filter((e) => {
        if (e.hp <= 0) {
          killsRef.current++;
          scoreRef.current += isBossRef.current ? 200 : 20;
          skillRef.current = Math.min(100, skillRef.current + 8);
          addParticle(e.x, e.y, "💥", 5);
          return false;
        }
        return true;
      });

      // Check wave clear
      if (enemiesRef.current.length === 0 && spawnQueueRef.current.length === 0) {
        if (isBossRef.current) {
          gameOverRef.current = true;
          scoreRef.current += 500;
          setScore(scoreRef.current);
          setKills(killsRef.current);
          setBestScore((p) => Math.max(p, scoreRef.current));
          setTotalGames((g) => g + 1);
          setScreen("victory");
          draw();
          return;
        }
        // Next wave
        if (tick > 60) {
          setupWave(waveRef.current + 1);
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy += 0.05;
        return p.life > 0;
      });

      // Sync
      if (tick % 5 === 0) {
        setScore(scoreRef.current);
        setHp(hpRef.current);
        setSkillGauge(skillRef.current);
        setKills(killsRef.current);
        setEnemyCount(enemiesRef.current.length + spawnQueueRef.current.length);
      }

      draw();
      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [draw, addParticle, setupWave]);

  // Input
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: W / 2, y: H / 2 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = getCanvasPos(e.clientX, e.clientY);
  }, [getCanvasPos]);
  const handleMouseLeave = useCallback(() => { mouseRef.current = null; }, []);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    mouseRef.current = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
  }, [getCanvasPos]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    mouseRef.current = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
  }, [getCanvasPos]);
  const handleTouchEnd = useCallback(() => { mouseRef.current = null; }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🦸⚔️</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">히어로 되기</span>
          </h1>
          <p className="text-lg text-slate-400">히어로가 되어 세상을 구해라!</p>
          <button onClick={() => setScreen("select")}
            className="rounded-2xl bg-gradient-to-r from-amber-500 to-red-500 px-12 py-4 text-xl font-black shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95">
            🦸 시작!
          </button>
          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}
        </div>
      )}

      {/* Hero Select */}
      {screen === "select" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-black text-amber-400">🦸 히어로 선택</h2>
          <div className="w-full max-w-sm space-y-2">
            {HEROES.map((h) => (
              <button key={h.id} onClick={() => startGame(h)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 border-white/10 bg-white/5 p-3 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/10 active:scale-[0.98]`}>
                <span className="text-4xl">{h.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold">{h.name}</p>
                  <p className="text-[10px] text-slate-400">❤️{h.hp} ⚔️{h.atk} 💨{h.speed}</p>
                  <p className="text-xs text-amber-400">{h.skillEmoji} {h.skillDesc}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* Playing / Boss */}
      {(screen === "playing" || screen === "boss") && (
        <div className="flex min-h-screen flex-col items-center pt-1 px-2">
          {message && (
            <div className="mb-1 rounded-lg bg-white/10 px-4 py-1 text-center text-sm font-bold animate-pulse">{message}</div>
          )}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-2xl border-2 border-amber-500/20 touch-none cursor-none"
            style={{ width: W, height: H }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Skill button */}
          <button onClick={useSkill}
            disabled={skillGauge < 100}
            className={`mt-2 rounded-2xl px-8 py-3 font-black text-lg transition-all active:scale-95 ${
              skillGauge >= 100
                ? `bg-gradient-to-r ${selectedHero.color} shadow-lg animate-pulse`
                : "bg-white/10 text-slate-500 cursor-not-allowed"
            }`}>
            {selectedHero.skillEmoji} {skillGauge >= 100 ? "필살기!" : `${Math.floor(skillGauge)}%`}
          </button>
        </div>
      )}

      {/* Victory */}
      {screen === "victory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">🎉🦸✨</div>
          <h2 className="text-4xl font-black text-amber-400">세상을 구했다!</h2>
          <p className="text-lg text-slate-400">드래곤을 물리쳤어요!</p>
          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-2">
            <p className="text-3xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>}
            <p className="text-sm text-slate-400">💀 처치: {kills}마리</p>
            <p className="text-sm text-slate-400">{selectedHero.emoji} {selectedHero.name}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen("select")} className="rounded-xl bg-gradient-to-r from-amber-500 to-red-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">🔄 다시하기</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">메뉴</button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === "gameover" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">💔😵</div>
          <h2 className="text-4xl font-black text-red-400">쓰러졌다...</h2>
          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-2">
            <p className="text-2xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>}
            <p className="text-sm text-slate-400">💀 처치: {kills}마리</p>
            <p className="text-sm text-slate-400">🌊 웨이브: {wave}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen("select")} className="rounded-xl bg-gradient-to-r from-amber-500 to-red-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">🔄 다시하기</button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">메뉴</button>
          </div>
        </div>
      )}
    </div>
  );
}
