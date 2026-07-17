"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const W = 800, H = 520, GROUND = 440, GRAVITY = 0.55, TILE = 40;

// ============================================================
// TYPES
// ============================================================
type Mode = "normal" | "spinjitzu" | "dragon" | "golden";
type Element = "fire" | "ice" | "lightning" | "earth" | "energy" | "water";
type GameScreen = "menu" | "select" | "battle" | "hub" | "story" | "dojo" | "dragons" | "result";

interface Ninja {
  id: string; name: string; element: Element; color: string; accent: string;
  hp: number; atk: number; def: number; spd: number; energy: number;
  special: string; specialDmg: number; specialCost: number;
  dragon: string; dragonColor: string;
}

interface PlayerState {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  energy: number; maxEnergy: number;
  ninja: Ninja;
  facing: number; grounded: boolean;
  mode: Mode; modeTimer: number;
  attackFrame: number; attackType: string;
  invincible: number; comboCount: number; comboTimer: number;
  dashCd: number;
  level: number; xp: number; xpToNext: number;
  bonusAtk: number; bonusDef: number; bonusHp: number;
  kills: number;
}

interface EnemyState {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  type: string; name: string; color: string; icon: string;
  facing: number; grounded: boolean;
  attackFrame: number; attackCd: number;
  flash: number; isBoss: boolean; r: number;
  aiState: "chase" | "attack" | "retreat" | "jump";
  aiTimer: number;
  special?: string; specialCd: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  damage: number; fromPlayer: boolean; life: number;
  r: number; color: string; element?: Element;
  trail: boolean; explosive: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number;
  color: string; glow: boolean;
}

interface StoryChapter {
  id: number; title: string; subtitle: string; icon: string;
  enemies: { type: string; count: number }[];
  boss?: string;
  reward: string; bgGradient: string; completed: boolean;
}

// ============================================================
// DATA
// ============================================================
const ELEMENT_COLORS: Record<Element, { main: string; glow: string; particle: string }> = {
  fire: { main: "#ff4422", glow: "#ff6600", particle: "#ff8844" },
  ice: { main: "#44ccff", glow: "#66ddff", particle: "#88eeff" },
  lightning: { main: "#ffdd00", glow: "#ffee44", particle: "#ffff88" },
  earth: { main: "#aa7744", glow: "#cc9966", particle: "#ddbb88" },
  energy: { main: "#44ff44", glow: "#66ff66", particle: "#88ff88" },
  water: { main: "#3388ff", glow: "#55aaff", particle: "#77ccff" },
};

const NINJAS: Ninja[] = [
  { id: "kai", name: "카이", element: "fire", color: "#cc2222", accent: "#ff4444", hp: 110, atk: 22, def: 12, spd: 4, energy: 100, special: "파이어 스핀짓주", specialDmg: 60, specialCost: 35, dragon: "불의 드래곤", dragonColor: "#ff4422" },
  { id: "jay", name: "제이", element: "lightning", color: "#2244cc", accent: "#4488ff", hp: 95, atk: 18, def: 10, spd: 5.5, energy: 110, special: "라이트닝 스톰", specialDmg: 55, specialCost: 30, dragon: "번개 드래곤", dragonColor: "#ffdd00" },
  { id: "cole", name: "콜", element: "earth", color: "#444444", accent: "#888888", hp: 140, atk: 20, def: 20, spd: 3, energy: 90, special: "어스 퀘이크", specialDmg: 65, specialCost: 38, dragon: "대지 드래곤", dragonColor: "#aa7744" },
  { id: "zane", name: "쟌", element: "ice", color: "#66aacc", accent: "#88ccee", hp: 105, atk: 17, def: 16, spd: 4, energy: 105, special: "아이스 실드", specialDmg: 45, specialCost: 28, dragon: "얼음 드래곤", dragonColor: "#44ccff" },
  { id: "lloyd", name: "로이드", element: "energy", color: "#228822", accent: "#44cc44", hp: 120, atk: 21, def: 14, spd: 4.5, energy: 120, special: "에너지 버스트", specialDmg: 70, specialCost: 40, dragon: "에너지 드래곤", dragonColor: "#44ff44" },
  { id: "nya", name: "니아", element: "water", color: "#2255aa", accent: "#4488dd", hp: 100, atk: 19, def: 13, spd: 4.5, energy: 110, special: "타이달 웨이브", specialDmg: 58, specialCost: 32, dragon: "물의 드래곤", dragonColor: "#3388ff" },
];

const ENEMY_TYPES: Record<string, { name: string; color: string; icon: string; hp: number; atk: number; def: number; spd: number; r: number; special?: string }> = {
  skeleton: { name: "스켈레톤", color: "#ccccaa", icon: "💀", hp: 40, atk: 10, def: 4, spd: 2, r: 14 },
  snake: { name: "서펜타인", color: "#44aa44", icon: "🐍", hp: 50, atk: 12, def: 5, spd: 3, r: 14 },
  stone_warrior: { name: "석상 전사", color: "#888866", icon: "🗿", hp: 70, atk: 15, def: 10, spd: 2, r: 16 },
  nindroid: { name: "닌드로이드", color: "#666688", icon: "🤖", hp: 55, atk: 14, def: 7, spd: 3.5, r: 14, special: "laser" },
  ghost: { name: "유령 전사", color: "#88cc88", icon: "👻", hp: 45, atk: 16, def: 3, spd: 4, r: 13, special: "teleport" },
  pirate: { name: "하늘 해적", color: "#cc8833", icon: "🏴‍☠️", hp: 60, atk: 13, def: 6, spd: 3, r: 15 },
  time_warrior: { name: "시간 전사", color: "#cc4444", icon: "⏰", hp: 65, atk: 15, def: 8, spd: 3, r: 15, special: "slow" },
  oni: { name: "오니", color: "#8833aa", icon: "👹", hp: 80, atk: 18, def: 10, spd: 2.5, r: 17, special: "darkness" },
  // Bosses
  garmadon: { name: "가마돈", color: "#660033", icon: "😈", hp: 250, atk: 28, def: 15, spd: 3, r: 22, special: "dark_energy" },
  overlord: { name: "오버로드", color: "#330066", icon: "🌑", hp: 300, atk: 32, def: 18, spd: 2.5, r: 24, special: "dark_wave" },
  chen: { name: "첸", color: "#cc6600", icon: "🐍👑", hp: 220, atk: 25, def: 12, spd: 3.5, r: 20, special: "element_steal" },
  morro: { name: "모로", color: "#33aa66", icon: "👻🌪️", hp: 200, atk: 24, def: 10, spd: 4.5, r: 18, special: "possession" },
  nadakhan: { name: "나다칸", color: "#3366cc", icon: "🧞", hp: 240, atk: 26, def: 14, spd: 3, r: 20, special: "wish" },
  omega: { name: "오메가", color: "#440044", icon: "👹👑", hp: 350, atk: 35, def: 20, spd: 2.5, r: 26, special: "oni_storm" },
};

const STORY_DATA: Omit<StoryChapter, "completed">[] = [
  { id: 1, title: "뼈의 군대", subtitle: "언더월드의 위협", icon: "💀", enemies: [{ type: "skeleton", count: 4 }], boss: "garmadon", reward: "스핀짓주 강화", bgGradient: "from-gray-900 to-stone-950" },
  { id: 2, title: "뱀의 반란", subtitle: "서펜타인의 부활", icon: "🐍", enemies: [{ type: "snake", count: 4 }, { type: "skeleton", count: 2 }], boss: "chen", reward: "원소 강화", bgGradient: "from-green-950 to-gray-950" },
  { id: 3, title: "석상 군대", subtitle: "오버로드의 부활", icon: "🗿", enemies: [{ type: "stone_warrior", count: 4 }], boss: "overlord", reward: "드래곤 소환 해금", bgGradient: "from-stone-900 to-red-950" },
  { id: 4, title: "디지털 전쟁", subtitle: "닌드로이드의 역습", icon: "🤖", enemies: [{ type: "nindroid", count: 5 }], boss: "overlord", reward: "테크노 블레이드", bgGradient: "from-purple-950 to-cyan-950" },
  { id: 5, title: "유령의 저주", subtitle: "모로의 빙의", icon: "👻", enemies: [{ type: "ghost", count: 4 }, { type: "nindroid", count: 2 }], boss: "morro", reward: "에어짓주 해금", bgGradient: "from-green-900 to-gray-950" },
  { id: 6, title: "스카이바운드", subtitle: "진의 소원", icon: "🧞", enemies: [{ type: "pirate", count: 4 }, { type: "ghost", count: 2 }], boss: "nadakhan", reward: "하늘 비행", bgGradient: "from-sky-950 to-amber-950" },
  { id: 7, title: "시간의 손", subtitle: "크룩스와 아크로닉스", icon: "⏰", enemies: [{ type: "time_warrior", count: 5 }, { type: "snake", count: 2 }], reward: "시간 제어", bgGradient: "from-red-950 to-amber-950" },
  { id: 8, title: "가마돈의 아들들", subtitle: "하루미의 배신", icon: "😈", enemies: [{ type: "oni", count: 3 }, { type: "nindroid", count: 3 }], boss: "garmadon", reward: "저항의 힘", bgGradient: "from-purple-950 to-gray-950" },
  { id: 9, title: "드래곤 헌터", subtitle: "퍼스트본을 찾아서", icon: "🐉", enemies: [{ type: "oni", count: 4 }, { type: "stone_warrior", count: 3 }], reward: "드래곤 아머", bgGradient: "from-amber-950 to-gray-950" },
  { id: 10, title: "오니의 행진", subtitle: "최후의 전투!", icon: "👹💀", enemies: [{ type: "oni", count: 5 }, { type: "ghost", count: 3 }], boss: "omega", reward: "토네이도 오브 크리에이션!", bgGradient: "from-purple-950 to-black" },
];

// ============================================================
// HELPERS
// ============================================================
function rng(a: number, b: number) { return a + Math.random() * (b - a); }
function dist(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function norm(x: number, y: number) { const d = Math.sqrt(x * x + y * y) || 1; return { x: x / d, y: y / d }; }

// ============================================================
// COMPONENT
// ============================================================
export default function NinjagoUltra() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedNinja, setSelectedNinja] = useState(0);
  const [chapters, setChapters] = useState<StoryChapter[]>(STORY_DATA.map((s) => ({ ...s, completed: false })));
  const [coins, setCoins] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [bonusAtk, setBonusAtk] = useState(0);
  const [bonusDef, setBonusDef] = useState(0);
  const [bonusHp, setBonusHp] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  const [dragonUnlocked, setDragonUnlocked] = useState(false);

  const gameRef = useRef<{
    player: PlayerState;
    enemies: EnemyState[];
    bullets: Bullet[];
    particles: Particle[];
    keys: Set<string>;
    shake: number; time: number; running: boolean;
    battleOver: boolean; battleResult: "win" | "lose" | null;
    enemyQueue: EnemyState[];
    announcement: string; annoTimer: number;
    currentChapter: number | null;
    bgScroll: number;
    slowMotion: number;
    screenFlash: number;
  } | null>(null);

  function spawnP(x: number, y: number, count: number, color: string, glow = false) {
    const g = gameRef.current; if (!g) return;
    for (let i = 0; i < count; i++) {
      const a = rng(0, Math.PI * 2), s = rng(1, glow ? 6 : 4);
      g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (glow ? 2 : 0), life: rng(200, 600), maxLife: 600, r: rng(2, glow ? 8 : 5), color, glow });
    }
  }

  function makeEnemy(type: string, isBoss: boolean, wave: number): EnemyState {
    const t = ENEMY_TYPES[type]; const scale = 1 + wave * 0.08;
    return {
      x: rng(500, 750), y: GROUND, vx: 0, vy: 0,
      hp: Math.floor(t.hp * scale * (isBoss ? 2 : 1)), maxHp: Math.floor(t.hp * scale * (isBoss ? 2 : 1)),
      atk: Math.floor(t.atk * scale), def: Math.floor(t.def * scale * 0.5), spd: t.spd,
      type, name: t.name, color: t.color, icon: t.icon,
      facing: -1, grounded: true, attackFrame: 0, attackCd: 0,
      flash: 0, isBoss, r: t.r * (isBoss ? 1.4 : 1),
      aiState: "chase", aiTimer: 0, special: t.special, specialCd: 0,
    };
  }

  const startBattle = useCallback((enemies: EnemyState[], chapterId?: number) => {
    const n = NINJAS[selectedNinja];
    gameRef.current = {
      player: {
        x: 100, y: GROUND, vx: 0, vy: 0,
        hp: n.hp + bonusHp, maxHp: n.hp + bonusHp,
        energy: n.energy, maxEnergy: n.energy,
        ninja: n, facing: 1, grounded: true,
        mode: "normal", modeTimer: 0,
        attackFrame: 0, attackType: "none",
        invincible: 0, comboCount: 0, comboTimer: 0,
        dashCd: 0, level: playerLevel, xp: 0, xpToNext: 40 + playerLevel * 15,
        bonusAtk, bonusDef, bonusHp, kills: 0,
      },
      enemies: [enemies[0]], bullets: [], particles: [],
      keys: new Set(), shake: 0, time: 0, running: true,
      battleOver: false, battleResult: null,
      enemyQueue: enemies.slice(1),
      announcement: "닌자, 고!", annoTimer: 1500,
      currentChapter: chapterId ?? null,
      bgScroll: 0, slowMotion: 0, screenFlash: 0,
    };
    setScreen("battle");
  }, [selectedNinja, bonusAtk, bonusDef, bonusHp, playerLevel]);

  const startChapter = useCallback((ch: StoryChapter) => {
    const allEnemies: EnemyState[] = [];
    for (const group of ch.enemies) {
      for (let i = 0; i < group.count; i++) allEnemies.push(makeEnemy(group.type, false, ch.id));
    }
    if (ch.boss) allEnemies.push(makeEnemy(ch.boss, true, ch.id));
    startBattle(allEnemies, ch.id);
  }, [startBattle]);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    if (screen !== "battle") return;
    const canvas = canvasRef.current; if (!canvas) return;
    const maybeCtx = canvas.getContext("2d"); if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const onKeyDown = (e: KeyboardEvent) => { gameRef.current?.keys.add(e.key.toLowerCase()); if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault(); };
    const onKeyUp = (e: KeyboardEvent) => { gameRef.current?.keys.delete(e.key.toLowerCase()); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ============================================================
    // DRAW NINJA
    // ============================================================
    function drawNinja(x: number, y: number, facing: number, n: Ninja, mode: Mode, attackFrame: number, time: number, invincible: number) {
      if (invincible > 0 && Math.floor(time / 60) % 2 === 0) return;
      const ec = ELEMENT_COLORS[n.element];

      // Spinjitzu tornado
      if (mode === "spinjitzu") {
        for (let i = 0; i < 3; i++) {
          const angle = time * 0.015 + (Math.PI * 2 / 3) * i;
          const radius = 22 + Math.sin(time * 0.01) * 5;
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = ec.glow;
          ctx.beginPath();
          ctx.arc(x + Math.cos(angle) * radius, y - 25 + Math.sin(angle) * 8, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Swirl lines
        ctx.strokeStyle = ec.main;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const a = time * 0.02 + i * (Math.PI / 3);
          const r1 = 10, r2 = 28;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r1, y - 25 + Math.sin(a) * 5);
          ctx.lineTo(x + Math.cos(a + 0.5) * r2, y - 25 + Math.sin(a + 0.5) * 12);
          ctx.stroke();
        }
      }

      // Dragon mode aura
      if (mode === "dragon") {
        ctx.globalAlpha = 0.2 + Math.sin(time * 0.006) * 0.1;
        ctx.fillStyle = n.dragonColor;
        ctx.beginPath();
        ctx.arc(x, y - 25, 35 + Math.sin(time * 0.008) * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Dragon wings hint
        ctx.strokeStyle = n.dragonColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x - 15, y - 35);
        ctx.quadraticCurveTo(x - 40, y - 55, x - 35, y - 25);
        ctx.moveTo(x + 15, y - 35);
        ctx.quadraticCurveTo(x + 40, y - 55, x + 35, y - 25);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Golden mode
      if (mode === "golden") {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#ffdd00";
        ctx.shadowColor = "#ffdd00";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x, y - 25, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 6, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyColor = mode === "golden" ? "#ffcc00" : n.color;
      const accentColor = mode === "golden" ? "#ffee66" : n.accent;

      // Legs
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      const legAnim = Math.sin(time * 0.006) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 18);
      ctx.lineTo(x - 10 + legAnim, y);
      ctx.moveTo(x + 6, y - 18);
      ctx.lineTo(x + 10 - legAnim, y);
      ctx.stroke();

      // Body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - 12, y - 42, 24, 26);
      // Belt
      ctx.fillStyle = "#333";
      ctx.fillRect(x - 12, y - 19, 24, 4);
      // Chest symbol (element)
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 32, 5, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 5;
      if (attackFrame > 0) {
        // Attack pose
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 38);
        ctx.lineTo(x + facing * 35, y - 35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 12, y - 38);
        ctx.lineTo(x + facing * 28, y - 30);
        ctx.stroke();
        // Attack effect
        ctx.fillStyle = ec.glow;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x + facing * 38, y - 33, 8 + Math.sin(time * 0.02) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        const armSway = Math.sin(time * 0.005) * 3;
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 38);
        ctx.lineTo(x - 18, y - 22 + armSway);
        ctx.moveTo(x + 12, y - 38);
        ctx.lineTo(x + 18, y - 25 - armSway);
        ctx.stroke();
      }

      // Head
      ctx.fillStyle = "#f0d0a0";
      ctx.beginPath();
      ctx.arc(x, y - 50, 10, 0, Math.PI * 2);
      ctx.fill();

      // Ninja mask
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - 11, y - 55, 22, 8);
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 6 + facing * 2, y - 53, 4, 3);
      ctx.fillRect(x + 2 + facing * 2, y - 53, 4, 3);
      ctx.fillStyle = "#111";
      ctx.fillRect(x - 5 + facing * 3, y - 52, 2, 2);
      ctx.fillRect(x + 3 + facing * 3, y - 52, 2, 2);

      // Headband tails
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - facing * 10, y - 52);
      ctx.quadraticCurveTo(x - facing * 20, y - 50 + Math.sin(time * 0.008) * 3, x - facing * 25, y - 48 + Math.sin(time * 0.006) * 4);
      ctx.stroke();
    }

    // ============================================================
    // DRAW ENEMY
    // ============================================================
    function drawEnemy(e: EnemyState, time: number) {
      if (e.flash > 0 && Math.floor(time / 40) % 2 === 0) return;
      const scale = e.isBoss ? 1.4 : 1;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(e.x, GROUND + 6, e.r * 0.9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boss aura
      if (e.isBoss) {
        ctx.globalAlpha = 0.15 + Math.sin(time * 0.005) * 0.08;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y - 25 * scale, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Body
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.color;
      const bh = 40 * scale;
      ctx.fillRect(e.x - 10 * scale, e.y - bh, 20 * scale, bh * 0.6);

      // Head
      ctx.beginPath();
      ctx.arc(e.x, e.y - bh - 4, 10 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Evil eyes
      ctx.fillStyle = e.type === "ghost" ? "#88ff88" : "#ff3333";
      ctx.fillRect(e.x - 5 * scale + e.facing * 2, e.y - bh - 6, 3 * scale, 3 * scale);
      ctx.fillRect(e.x + 2 * scale + e.facing * 2, e.y - bh - 6, 3 * scale, 3 * scale);

      // Legs
      ctx.strokeStyle = e.flash > 0 ? "#fff" : e.color;
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = "round";
      const ls = Math.sin(time * 0.005) * 3;
      ctx.beginPath();
      ctx.moveTo(e.x - 5 * scale, e.y - bh * 0.38);
      ctx.lineTo(e.x - 8 * scale + ls, e.y);
      ctx.moveTo(e.x + 5 * scale, e.y - bh * 0.38);
      ctx.lineTo(e.x + 8 * scale - ls, e.y);
      ctx.stroke();

      // Arms + attack
      ctx.lineWidth = 4 * scale;
      if (e.attackFrame > 0) {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - bh * 0.7);
        ctx.lineTo(e.x + e.facing * 30 * scale, e.y - bh * 0.6);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(e.x - 10 * scale, e.y - bh * 0.7);
        ctx.lineTo(e.x - 15 * scale, e.y - bh * 0.4);
        ctx.moveTo(e.x + 10 * scale, e.y - bh * 0.7);
        ctx.lineTo(e.x + 15 * scale, e.y - bh * 0.4);
        ctx.stroke();
      }

      // HP bar
      const bw = e.isBoss ? 60 : 30;
      ctx.fillStyle = "#222";
      ctx.fillRect(e.x - bw / 2, e.y - bh - 18, bw, 4);
      ctx.fillStyle = e.isBoss ? "#ff0044" : "#ff4444";
      ctx.fillRect(e.x - bw / 2, e.y - bh - 18, bw * (e.hp / e.maxHp), 4);

      // Boss name
      if (e.isBoss) {
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`👑 ${e.name}`, e.x, e.y - bh - 22);
      }
    }

    function gameLoop(now: number) {
      const g = gameRef.current;
      if (!g) { requestAnimationFrame(gameLoop); return; }
      const dt = Math.min(16.67, 16.67); // Fixed timestep for consistency
      g.time += dt;
      if (g.annoTimer > 0) { g.annoTimer -= dt; if (g.annoTimer <= 0) g.announcement = ""; }
      if (g.slowMotion > 0) g.slowMotion -= dt;
      if (g.screenFlash > 0) g.screenFlash -= dt;

      const p = g.player;
      const keys = g.keys;
      const canFight = !g.battleOver && g.announcement === "";
      const ec = ELEMENT_COLORS[p.ninja.element];
      const timeScale = g.slowMotion > 0 ? 0.4 : 1;

      if (canFight) {
        // === PLAYER INPUT ===
        const spd = p.mode === "dragon" ? p.ninja.spd * 1.5 : p.mode === "golden" ? p.ninja.spd * 1.3 : p.ninja.spd;
        if (keys.has("arrowleft") || keys.has("a")) { p.vx = -(spd + p.bonusAtk * 0.02); p.facing = -1; }
        else if (keys.has("arrowright") || keys.has("d")) { p.vx = (spd + p.bonusAtk * 0.02); p.facing = 1; }
        else { p.vx *= 0.82; }

        if ((keys.has("arrowup") || keys.has("w") || keys.has(" ")) && p.grounded) {
          p.vy = -(p.mode === "dragon" ? 13 : 11);
          p.grounded = false;
          spawnP(p.x, GROUND, 6, "#aaa");
        }

        // Dash (Shift)
        if (keys.has("shift") && p.dashCd <= 0 && p.energy >= 10) {
          p.x += p.facing * 100;
          p.invincible = 300;
          p.dashCd = 800;
          p.energy -= 10;
          spawnP(p.x, p.y - 25, 12, ec.particle, true);
          keys.delete("shift");
        }

        // Attack (Z)
        if (keys.has("z") && p.attackFrame <= 0) {
          p.attackFrame = 200; p.attackType = "melee";
          const atkPower = p.ninja.atk + p.bonusAtk + (p.mode === "dragon" ? 10 : p.mode === "golden" ? 15 : 0);
          for (const e of g.enemies) {
            if (Math.abs(e.x - p.x) < 50 && Math.abs(e.y - p.y) < 40) {
              let dmg = atkPower + Math.floor(rng(0, 6));
              if (p.comboCount >= 3) dmg = Math.floor(dmg * (1 + p.comboCount * 0.08));
              dmg = Math.max(1, dmg - Math.floor(e.def * 0.2));
              e.hp -= dmg; e.flash = 120; e.vx = p.facing * 5;
              spawnP(e.x, e.y - 20, 6, ec.particle);
              g.shake = 4;
              p.comboCount++; p.comboTimer = 1500;
            }
          }
          keys.delete("z");
        }

        // Ranged (X)
        if (keys.has("x") && p.attackFrame <= 0 && p.energy >= 8) {
          p.attackFrame = 180; p.attackType = "ranged"; p.energy -= 8;
          const bulletDmg = Math.floor((p.ninja.atk + p.bonusAtk) * 0.7);
          g.bullets.push({
            x: p.x + p.facing * 20, y: p.y - 35, vx: p.facing * 9, vy: 0,
            damage: bulletDmg, fromPlayer: true, life: 700, r: 5,
            color: ec.main, element: p.ninja.element, trail: true, explosive: false,
          });
          spawnP(p.x + p.facing * 20, p.y - 35, 3, ec.glow, true);
          keys.delete("x");
        }

        // Special (C)
        if (keys.has("c") && p.energy >= p.ninja.specialCost && p.attackFrame <= 0) {
          p.attackFrame = 400; p.attackType = "special"; p.energy -= p.ninja.specialCost;
          g.shake = 12; g.screenFlash = 300; g.slowMotion = 500;
          spawnP(p.x, p.y - 25, 30, ec.glow, true);
          g.announcement = p.ninja.special + "!"; g.annoTimer = 800;

          if (p.ninja.id === "zane") {
            // Shield + damage
            p.hp = Math.min(p.maxHp, p.hp + 30);
            spawnP(p.x, p.y - 25, 15, "#44ccff", true);
          }
          for (const e of g.enemies) {
            let dmg = p.ninja.specialDmg + Math.floor(p.bonusAtk * 0.4) + (p.mode === "golden" ? 20 : p.mode === "dragon" ? 10 : 0);
            dmg = Math.max(1, dmg - Math.floor(e.def * 0.1));
            e.hp -= dmg; e.flash = 200; e.vx = p.facing * 8;
            spawnP(e.x, e.y - 20, 12, ec.particle, true);
          }
          keys.delete("c");
        }

        // Spinjitzu (S)
        if (keys.has("s") && p.mode === "normal" && p.energy >= 25) {
          p.mode = "spinjitzu"; p.modeTimer = 3000; p.energy -= 25;
          spawnP(p.x, p.y - 25, 20, ec.glow, true);
          g.announcement = "스핀짓주!"; g.annoTimer = 800;
          keys.delete("s");
        }

        // Dragon mode (D)
        if (keys.has("d_key_unused")) {} // handled by 'd' in movement
        if (keys.has("q") && p.mode === "normal" && dragonUnlocked && p.energy >= 40) {
          p.mode = "dragon"; p.modeTimer = 5000; p.energy -= 40;
          spawnP(p.x, p.y - 25, 25, p.ninja.dragonColor, true);
          g.shake = 8;
          g.announcement = p.ninja.dragon + " 소환!"; g.annoTimer = 1000;
          keys.delete("q");
        }

        // Mode timers
        if (p.mode !== "normal" && p.mode !== "golden") {
          p.modeTimer -= dt;
          if (p.modeTimer <= 0) p.mode = "normal";
        }

        // Physics
        p.vy += GRAVITY * timeScale;
        p.x += p.vx * timeScale; p.y += p.vy * timeScale;
        if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.grounded = true; }
        p.x = Math.max(25, Math.min(W - 25, p.x));
        p.attackFrame = Math.max(0, p.attackFrame - dt);
        if (p.attackFrame <= 0) p.attackType = "none";
        p.invincible = Math.max(0, p.invincible - dt);
        p.dashCd = Math.max(0, p.dashCd - dt);
        p.comboTimer -= dt;
        if (p.comboTimer <= 0) p.comboCount = 0;
        p.energy = Math.min(p.maxEnergy, p.energy + dt * 0.02);

        // Spinjitzu contact damage
        if (p.mode === "spinjitzu") {
          for (const e of g.enemies) {
            if (dist(p, { x: e.x, y: e.y - 20 }) < 35 + e.r) {
              const dmg = Math.floor((p.ninja.atk + p.bonusAtk) * 0.3);
              e.hp -= dmg; e.flash = 80; e.vx = p.facing * 4;
              if (Math.random() < 0.1) spawnP(e.x, e.y - 20, 4, ec.particle);
            }
          }
        }

        // === ENEMY AI ===
        for (const e of g.enemies) {
          e.flash = Math.max(0, e.flash - dt);
          e.attackCd = Math.max(0, e.attackCd - dt);
          e.specialCd = Math.max(0, e.specialCd - dt);
          e.aiTimer -= dt;

          const dx = p.x - e.x;
          e.facing = dx > 0 ? 1 : -1;
          const distToP = Math.abs(dx);

          if (e.aiTimer <= 0) {
            e.aiTimer = 200 + rng(0, 300);
            if (distToP > 80) e.aiState = "chase";
            else if (distToP < 40) e.aiState = Math.random() < 0.3 ? "retreat" : "attack";
            else e.aiState = Math.random() < 0.5 ? "attack" : "chase";
            if (Math.random() < 0.1 && e.grounded) e.aiState = "jump";
          }

          if (e.aiState === "chase") { e.vx = e.facing * e.spd * timeScale; }
          else if (e.aiState === "retreat") { e.vx = -e.facing * e.spd * 0.7 * timeScale; }
          else if (e.aiState === "jump" && e.grounded) { e.vy = -9; e.grounded = false; e.aiState = "chase"; }
          else { e.vx *= 0.85; }

          // Melee attack
          if (distToP < 45 && e.attackCd <= 0) {
            e.attackFrame = 250; e.attackCd = 700 + rng(0, 500);
            if (p.invincible <= 0) {
              let dmg = e.atk + Math.floor(rng(0, 4));
              const pDef = p.ninja.def + p.bonusDef + (p.mode === "dragon" ? 5 : p.mode === "golden" ? 8 : 0);
              dmg = Math.max(1, dmg - Math.floor(pDef * 0.25));
              p.hp -= dmg; p.invincible = 250; p.vx = -e.facing * 4;
              spawnP(p.x, p.y - 25, 5, "#ff4444");
              g.shake = 4;
            }
          }

          // Special attacks
          if (e.special && e.specialCd <= 0 && distToP < 300 && Math.random() < 0.01) {
            e.specialCd = 3000;
            if (e.special === "laser" || e.special === "dark_energy" || e.special === "dark_wave" || e.special === "oni_storm") {
              g.bullets.push({
                x: e.x + e.facing * 15, y: e.y - 25, vx: e.facing * 6, vy: 0,
                damage: Math.floor(e.atk * 1.2), fromPlayer: false, life: 1000, r: 6,
                color: e.color, trail: true, explosive: e.isBoss,
              });
              spawnP(e.x + e.facing * 15, e.y - 25, 5, e.color, true);
            }
            if (e.special === "teleport" && distToP > 60) {
              spawnP(e.x, e.y - 20, 8, e.color, true);
              e.x = p.x + (Math.random() < 0.5 ? -1 : 1) * 50;
              spawnP(e.x, e.y - 20, 8, e.color, true);
            }
            if ((e.special === "wish" || e.special === "possession") && e.isBoss) {
              // Burst attack
              for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i;
                g.bullets.push({
                  x: e.x, y: e.y - 20, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
                  damage: Math.floor(e.atk * 0.8), fromPlayer: false, life: 1200, r: 5,
                  color: e.color, trail: true, explosive: false,
                });
              }
              spawnP(e.x, e.y - 20, 15, e.color, true);
              g.shake = 6;
            }
          }

          e.vy += GRAVITY * timeScale;
          e.x += e.vx * timeScale; e.y += e.vy * timeScale;
          if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.grounded = true; }
          e.x = Math.max(20, Math.min(W - 20, e.x));
          e.attackFrame = Math.max(0, e.attackFrame - dt);
          e.vx *= 0.92;
        }

        // === BULLETS ===
        for (const b of g.bullets) {
          b.x += b.vx * timeScale; b.y += b.vy * timeScale; b.life -= dt;
          if (b.trail) g.particles.push({ x: b.x, y: b.y, vx: rng(-0.3, 0.3), vy: rng(-0.3, 0.3), life: 150, maxLife: 150, r: b.r * 0.6, color: b.color, glow: true });

          if (b.fromPlayer) {
            for (const e of g.enemies) {
              if (Math.abs(b.x - e.x) < e.r + b.r && Math.abs(b.y - (e.y - 20)) < e.r + b.r) {
                let dmg = Math.max(1, b.damage - Math.floor(e.def * 0.15));
                e.hp -= dmg; e.flash = 100;
                spawnP(b.x, b.y, 5, b.color);
                g.shake = 2; b.life = 0;
                if (b.explosive) { spawnP(b.x, b.y, 15, b.color, true); g.shake = 6; for (const oe of g.enemies) { if (oe !== e && dist(b, { x: oe.x, y: oe.y - 20 }) < 60) { oe.hp -= Math.floor(dmg * 0.5); oe.flash = 80; } } }
                break;
              }
            }
          } else {
            if (p.invincible <= 0 && Math.abs(b.x - p.x) < 18 && Math.abs(b.y - (p.y - 25)) < 25) {
              const pDef = p.ninja.def + p.bonusDef;
              let dmg = Math.max(1, b.damage - Math.floor(pDef * 0.2));
              if (p.mode === "spinjitzu") dmg = Math.floor(dmg * 0.5);
              p.hp -= dmg; p.invincible = 200;
              spawnP(p.x, p.y - 25, 5, "#ff4444");
              g.shake = 4; b.life = 0;
            }
          }
        }

        // === ENEMY DEATHS ===
        for (const e of g.enemies) {
          if (e.hp <= 0) {
            spawnP(e.x, e.y - 20, 20, e.color, true);
            g.shake = e.isBoss ? 15 : 6;
            if (e.isBoss) { g.slowMotion = 800; g.screenFlash = 500; }
            setTotalKills((k) => k + 1);
            setCoins((c) => c + (e.isBoss ? 60 : 12));
            p.kills++;
            p.xp += e.isBoss ? 30 : 8;
            if (p.xp >= p.xpToNext) {
              p.xp -= p.xpToNext; p.level++; p.xpToNext = Math.floor(p.xpToNext * 1.15);
              p.maxHp += 8; p.hp = p.maxHp; p.energy = p.maxEnergy;
              setPlayerLevel(p.level);
              setBonusAtk((a) => a + 2); setBonusDef((d) => d + 1); setBonusHp((h) => h + 8);
              spawnP(p.x, p.y - 25, 25, "#ffdd00", true);
              g.announcement = "레벨 업!"; g.annoTimer = 800;
            }
          }
        }
        g.enemies = g.enemies.filter((e) => e.hp > 0);

        // Next enemy or victory
        if (g.enemies.length === 0) {
          if (g.enemyQueue.length > 0) {
            const next = g.enemyQueue[0]; g.enemies.push(next); g.enemyQueue = g.enemyQueue.slice(1);
            g.announcement = next.isBoss ? `⚠️ 보스: ${next.name}!` : `${next.name} 등장!`;
            g.annoTimer = 1000;
          } else {
            g.battleOver = true; g.battleResult = "win";
            g.announcement = "승리!"; g.annoTimer = 2500;
            g.screenFlash = 500;
            if (g.currentChapter) {
              setChapters((prev) => prev.map((c) => c.id === g.currentChapter ? { ...c, completed: true } : c));
              if (g.currentChapter >= 3 && !dragonUnlocked) setDragonUnlocked(true);
            }
          }
        }

        if (p.hp <= 0) {
          g.battleOver = true; g.battleResult = "lose";
          g.announcement = "패배..."; g.annoTimer = 2500;
          spawnP(p.x, p.y - 25, 25, p.ninja.color);
        }
      }

      // Particles update
      for (const pt of g.particles) { pt.x += pt.vx * timeScale; pt.y += pt.vy * timeScale; pt.vy += 0.04; pt.vx *= 0.97; pt.life -= dt; }
      g.particles = g.particles.filter((pt) => pt.life > 0);
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30);
      g.shake = Math.max(0, g.shake - 0.4);
      g.bgScroll += 0.3 * timeScale;

      // ============================================================
      // RENDER
      // ============================================================
      ctx.save();
      if (g.shake > 0) ctx.translate(rng(-g.shake, g.shake), rng(-g.shake, g.shake));

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#050510"); sky.addColorStop(0.4, "#0a0a20"); sky.addColorStop(1, "#151525");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Parallax mountains
      ctx.fillStyle = "#0c0c1a";
      for (let i = 0; i < 8; i++) {
        const mx = ((i * 120 - g.bgScroll * 0.2) % (W + 200)) - 100;
        const mh = 80 + (i * 37) % 60;
        ctx.beginPath();
        ctx.moveTo(mx, GROUND + 8);
        ctx.lineTo(mx + 50, GROUND + 8 - mh);
        ctx.lineTo(mx + 100, GROUND + 8);
        ctx.fill();
      }

      // Japanese buildings
      ctx.fillStyle = "#0f0f20";
      for (let i = 0; i < 12; i++) {
        const bx = ((i * 75 - g.bgScroll * 0.5) % (W + 150)) - 75;
        const bh = 40 + (i * 53) % 80;
        ctx.fillRect(bx, GROUND + 8 - bh, 55, bh);
        // Pagoda roof
        ctx.beginPath();
        ctx.moveTo(bx - 8, GROUND + 8 - bh);
        ctx.lineTo(bx + 27, GROUND + 8 - bh - 15);
        ctx.lineTo(bx + 63, GROUND + 8 - bh);
        ctx.fill();
      }

      // Ground
      ctx.fillStyle = "#1a1a28";
      ctx.fillRect(0, GROUND + 8, W, H - GROUND);
      // Ground line
      const groundGrad = ctx.createLinearGradient(0, GROUND + 6, 0, GROUND + 10);
      groundGrad.addColorStop(0, "#333"); groundGrad.addColorStop(1, "#1a1a28");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND + 6, W, 4);

      // Particles (behind)
      for (const pt of g.particles) {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        if (pt.glow) { ctx.shadowColor = pt.color; ctx.shadowBlur = 8; }
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Bullets
      for (const b of g.bullets) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Enemies
      for (const e of g.enemies) drawEnemy(e, g.time);

      // Player
      drawNinja(p.x, p.y, p.facing, p.ninja, p.mode, p.attackFrame, g.time, p.invincible);

      // Screen flash
      if (g.screenFlash > 0) {
        ctx.globalAlpha = Math.min(0.3, g.screenFlash / 500);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // === HUD ===
      // HP bar
      const hpW = 220, hpH = 14;
      ctx.fillStyle = "#111"; ctx.fillRect(12, 12, hpW + 2, hpH + 2);
      ctx.fillStyle = p.hp > p.maxHp * 0.3 ? "#33cc33" : "#cc3333";
      ctx.fillRect(13, 13, hpW * Math.max(0, p.hp / p.maxHp), hpH);
      ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.strokeRect(12, 12, hpW + 2, hpH + 2);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 13 + hpW / 2, 24);

      // Energy bar
      ctx.fillStyle = "#111"; ctx.fillRect(12, 29, hpW + 2, 8);
      ctx.fillStyle = ec.main;
      ctx.fillRect(13, 30, hpW * (p.energy / p.maxEnergy), 6);

      // XP bar
      ctx.fillStyle = "#111"; ctx.fillRect(12, 39, hpW + 2, 5);
      ctx.fillStyle = "#aa44ff";
      ctx.fillRect(13, 40, hpW * (p.xp / p.xpToNext), 3);

      // Info text
      ctx.textAlign = "left"; ctx.fillStyle = "#aaa"; ctx.font = "bold 10px sans-serif";
      ctx.fillText(`${p.ninja.name} Lv.${p.level} | ${p.mode === "normal" ? "일반" : p.mode === "spinjitzu" ? "🌀스핀짓주" : p.mode === "dragon" ? "🐉드래곤" : "✨골든"} | 콤보: ${p.comboCount}`, 12, 56);

      // Enemy count
      ctx.textAlign = "right"; ctx.fillStyle = "#888"; ctx.font = "bold 11px sans-serif";
      ctx.fillText(`남은 적: ${g.enemies.length + g.enemyQueue.length}`, W - 12, 22);
      ctx.fillStyle = "#666"; ctx.font = "10px sans-serif";
      ctx.fillText(`Kills: ${p.kills}`, W - 12, 36);

      // Controls
      ctx.fillStyle = "#333"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("←→ 이동 | ↑ 점프 | Z 근접 | X 원거리 | C 필살기 | S 스핀짓주 | Q 드래곤 | Shift 대시", W / 2, H - 8);

      // Combo display
      if (p.comboCount >= 3) {
        ctx.textAlign = "left"; ctx.font = `bold ${16 + p.comboCount}px sans-serif`;
        ctx.fillStyle = "#ffaa00";
        ctx.shadowColor = "#ffaa00"; ctx.shadowBlur = 8;
        ctx.fillText(`${p.comboCount} COMBO!`, 12, 78);
        ctx.shadowBlur = 0;
      }

      // Dash CD
      ctx.textAlign = "left"; ctx.fillStyle = p.dashCd > 0 ? "#444" : ec.main; ctx.font = "9px sans-serif";
      ctx.fillText(p.dashCd > 0 ? `대시 ${(p.dashCd / 1000).toFixed(1)}s` : "Shift 대시", 12, H - 22);

      // Mode timer
      if (p.mode !== "normal" && p.mode !== "golden") {
        ctx.fillStyle = ec.main; ctx.textAlign = "left"; ctx.font = "bold 10px sans-serif";
        ctx.fillText(`${p.mode === "spinjitzu" ? "🌀" : "🐉"} ${(p.modeTimer / 1000).toFixed(1)}s`, 12, H - 35);
      }

      // Announcement
      if (g.announcement) {
        ctx.textAlign = "center"; ctx.fillStyle = "#fff";
        const size = g.announcement.includes("승리") || g.announcement.includes("패배") ? 48 : g.announcement.includes("보스") ? 32 : 28;
        ctx.font = `bold ${size}px sans-serif`;
        ctx.shadowColor = "#000"; ctx.shadowBlur = 12;
        ctx.fillText(g.announcement, W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
      }

      // Battle over
      if (g.battleOver && g.annoTimer <= 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = g.battleResult === "win" ? "#ffdd00" : "#ff4444";
        ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(g.battleResult === "win" ? "🏆 승리!" : "💀 패배...", W / 2, H / 2 - 20);
        ctx.fillStyle = "#aaa"; ctx.font = "14px sans-serif";
        ctx.fillText("아무 키나 누르세요", W / 2, H / 2 + 20);
        if (keys.size > 0) setScreen("hub");
      }

      ctx.restore();
      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [screen, dragonUnlocked]);

  // ============================================================
  // UI SCREENS
  // ============================================================
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-red-950/30 to-black text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-3">🥷🐉</div>
          <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 bg-clip-text text-transparent">닌자고 울트라</h1>
          <p className="text-sm text-gray-400 mb-6">실시간 액션! 스핀짓주! 드래곤 소환!</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>⚔️ Z 근접 | X 원거리 | C 필살기</p>
            <p>🌀 S 스핀짓주 | 🐉 Q 드래곤 모드</p>
            <p>💨 Shift 대시 (무적 이동)</p>
            <p>🔥 콤보로 데미지 증가!</p>
            <p>📖 10장 스토리 - 시즌 1~10 총집편</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-red-600 via-yellow-600 to-green-600 py-4 text-xl font-black hover:brightness-125 border border-yellow-400/30">
            닌자, 고!
          </button>
        </div>
      </div>
    );
  }

  if (screen === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("menu")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-4 text-center">🥷 닌자를 선택하라</h2>
          <div className="grid grid-cols-3 gap-3">
            {NINJAS.map((n, i) => {
              const ec = ELEMENT_COLORS[n.element];
              return (
                <button key={n.id} onClick={() => { setSelectedNinja(i); setScreen("hub"); }}
                  className="rounded-xl p-3 text-center border-2 transition-all hover:brightness-125 active:scale-95"
                  style={{ borderColor: selectedNinja === i ? ec.main : "#333", background: `linear-gradient(135deg, ${n.color}33, #111)` }}>
                  <div className="text-2xl mb-1" style={{ color: ec.main }}>{n.element === "fire" ? "🔥" : n.element === "ice" ? "❄️" : n.element === "lightning" ? "⚡" : n.element === "earth" ? "🪨" : n.element === "energy" ? "💚" : "🌊"}</div>
                  <div className="font-bold text-sm">{n.name}</div>
                  <div className="text-[10px]" style={{ color: ec.main }}>{n.element}</div>
                  <div className="text-[10px] text-gray-400 mt-1">HP:{n.hp} ATK:{n.atk}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "hub") {
    const n = NINJAS[selectedNinja];
    const ec = ELEMENT_COLORS[n.element];
    const progress = chapters.filter((c) => c.completed).length;
    const nextCh = chapters.find((c) => !c.completed);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setScreen("select")} className="text-sm text-gray-400 hover:text-white">← 닌자 변경</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>
          <div className="mb-3 rounded-xl p-4 border" style={{ borderColor: ec.main + "44", background: `linear-gradient(135deg, ${n.color}22, #111)` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl" style={{ color: ec.main }}>{n.element === "fire" ? "🔥" : n.element === "ice" ? "❄️" : n.element === "lightning" ? "⚡" : n.element === "earth" ? "🪨" : n.element === "energy" ? "💚" : "🌊"}</div>
              <div>
                <div className="font-black text-lg">{n.name} <span className="text-sm font-normal text-gray-400">Lv.{playerLevel}</span></div>
                <div className="text-xs" style={{ color: ec.main }}>{n.element} | {n.special}</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>❤️{n.hp + bonusHp}</span><span>⚔️{n.atk + bonusAtk}</span><span>🛡️{n.def + bonusDef}</span><span>💀{totalKills}</span>
              {dragonUnlocked && <span>🐉{n.dragon}</span>}
            </div>
          </div>

          {nextCh && (
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl p-4 text-left hover:brightness-110 border animate-pulse"
              style={{ borderColor: ec.main + "44", background: `linear-gradient(135deg, ${n.color}11, #0a0a15)` }}>
              <div className="text-xs mb-1" style={{ color: ec.main }}>📖 다음 스토리</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-yellow-900/20 p-4 text-center border border-yellow-500/30">
              <div className="text-3xl mb-1">🏆🥷🐉</div>
              <div className="font-black text-yellow-300">닌자고의 전설!</div>
              <div className="text-xs text-gray-400">모든 시즌을 클리어!</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-white/5 p-3 text-center hover:bg-white/10 border border-white/10">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/10)</div>
            </button>
            <button onClick={() => setScreen("dojo")} className="rounded-xl bg-white/5 p-3 text-center hover:bg-white/10 border border-white/10">
              <div className="text-xl">🏯</div><div className="text-xs font-bold">도장 (강화)</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "story") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">📖 닌자고 울트라 스토리</h2>
          <div className="space-y-2">
            {chapters.map((ch) => (
              <button key={ch.id} onClick={() => !ch.completed && startChapter(ch)} disabled={ch.completed}
                className={`w-full rounded-xl bg-gradient-to-r ${ch.bgGradient} p-3 text-left border ${ch.completed ? "border-green-500/20 opacity-70" : "border-white/10 hover:brightness-110"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{ch.completed ? "✅" : ch.icon}</span>
                  <div>
                    <div className="font-bold text-sm">{ch.id}장. {ch.title}</div>
                    <div className="text-xs text-gray-300">{ch.subtitle}</div>
                    <div className="text-xs text-yellow-300 mt-0.5">🎁 {ch.reward}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "dojo") {
    const n = NINJAS[selectedNinja];
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏯 도장</h2>
          {[
            { icon: "⚔️", name: "공격 수련", desc: `ATK +3 (${n.atk + bonusAtk})`, cost: 30, action: () => setBonusAtk((a) => a + 3) },
            { icon: "🛡️", name: "방어 수련", desc: `DEF +2 (${n.def + bonusDef})`, cost: 30, action: () => setBonusDef((d) => d + 2) },
            { icon: "❤️", name: "체력 수련", desc: `HP +15 (${n.hp + bonusHp})`, cost: 30, action: () => setBonusHp((h) => h + 15) },
            { icon: "🌀", name: "스핀짓주 수련", desc: "전투 경험치 획득", cost: 0, action: () => { setPlayerLevel((l) => l + 1); setBonusAtk((a) => a + 1); setBonusDef((d) => d + 1); setBonusHp((h) => h + 5); } },
          ].map((item) => (
            <button key={item.name} onClick={() => { if (coins >= item.cost) { if (item.cost > 0) setCoins((c) => c - item.cost); item.action(); } }} disabled={coins < item.cost && item.cost > 0}
              className="w-full mb-2 rounded-xl bg-white/5 p-4 text-left hover:bg-white/10 border border-white/10 disabled:opacity-30 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1"><div className="font-bold">{item.name}</div><div className="text-xs text-gray-400">{item.desc}</div></div>
                <span className={`text-sm ${item.cost === 0 ? "text-green-400" : "text-yellow-400"}`}>{item.cost === 0 ? "무료" : `🪙${item.cost}`}</span>
              </div>
            </button>
          ))}
          <button onClick={() => setCoins((c) => c + 50)} className="w-full mt-3 rounded-lg bg-green-800/50 py-2 text-sm text-green-300 hover:bg-green-800/80 border border-green-500/20">🎁 무료 코인 +50</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <canvas ref={canvasRef} width={W} height={H} className="block rounded-lg border border-gray-800" style={{ maxWidth: "100vw", maxHeight: "85vh" }} />
    </div>
  );
}
