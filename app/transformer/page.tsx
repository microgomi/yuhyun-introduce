"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const W = 800, H = 500, GROUND = 430, GRAVITY = 0.5;

// ============================================================
// TYPES
// ============================================================
type Mode = "robot" | "vehicle";
type Faction = "autobot" | "decepticon";
type GameScreen = "menu" | "select" | "hub" | "battle" | "story" | "garage" | "result";

interface Transformer {
  id: string;
  name: string;
  faction: Faction;
  robotIcon: string;
  vehicleIcon: string;
  vehicleType: string;
  color: string;
  robotHp: number;
  robotAtk: number;
  robotDef: number;
  robotSpd: number;
  vehicleSpd: number;
  vehicleAtk: number;
  special: string;
  specialIcon: string;
  specialDmg: number;
  specialCost: number;
  desc: string;
}

interface PlayerState {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  energy: number; maxEnergy: number;
  mode: Mode;
  transformer: Transformer;
  facing: number;
  grounded: boolean;
  attackFrame: number;
  invincible: number;
  transformCooldown: number;
  specialReady: boolean;
  level: number;
  xp: number;
  xpToNext: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

interface EnemyBot {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  mode: Mode;
  transformer: Transformer;
  facing: number;
  grounded: boolean;
  attackFrame: number;
  attackCd: number;
  transformTimer: number;
  isBoss: boolean;
  flash: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  damage: number; fromPlayer: boolean; life: number; r: number; color: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number; color: string;
}

interface StoryChapter {
  id: number; title: string; subtitle: string; icon: string;
  enemies: { transformer: Transformer; count: number }[];
  boss?: Transformer;
  reward: string; bgGradient: string; completed: boolean;
}

// ============================================================
// DATA
// ============================================================
const AUTOBOTS: Transformer[] = [
  { id: "optimus", name: "옵티머스 프라임", faction: "autobot", robotIcon: "🤖🔴", vehicleIcon: "🚛", vehicleType: "트럭", color: "#cc3333",
    robotHp: 150, robotAtk: 22, robotDef: 18, robotSpd: 3, vehicleSpd: 7, vehicleAtk: 15,
    special: "매트릭스 블래스트", specialIcon: "✨💥", specialDmg: 80, specialCost: 40,
    desc: "오토봇의 리더. 정의와 자유를 위해 싸운다." },
  { id: "bumblebee", name: "범블비", faction: "autobot", robotIcon: "🤖🟡", vehicleIcon: "🚗", vehicleType: "스포츠카", color: "#ccaa00",
    robotHp: 100, robotAtk: 16, robotDef: 12, robotSpd: 5, vehicleSpd: 10, vehicleAtk: 12,
    special: "스팅어 캐논", specialIcon: "⚡🔫", specialDmg: 55, specialCost: 30,
    desc: "작지만 용감한 정찰병. 누구보다 빠르다." },
  { id: "ironhide", name: "아이언하이드", faction: "autobot", robotIcon: "🤖⚫", vehicleIcon: "🚙", vehicleType: "픽업트럭", color: "#333333",
    robotHp: 170, robotAtk: 25, robotDef: 22, robotSpd: 2.5, vehicleSpd: 6, vehicleAtk: 18,
    special: "캐논 바라지", specialIcon: "💣💥", specialDmg: 90, specialCost: 45,
    desc: "오토봇 최고의 무기 전문가." },
  { id: "ratchet", name: "래칫", faction: "autobot", robotIcon: "🤖🟢", vehicleIcon: "🚑", vehicleType: "구급차", color: "#33aa33",
    robotHp: 120, robotAtk: 14, robotDef: 15, robotSpd: 3.5, vehicleSpd: 7, vehicleAtk: 10,
    special: "수리 필드", specialIcon: "💚🔧", specialDmg: -60, specialCost: 35,
    desc: "오토봇의 의료관. 전투와 치유를 동시에." },
  { id: "jazz", name: "재즈", faction: "autobot", robotIcon: "🤖🔵", vehicleIcon: "🏎️", vehicleType: "레이싱카", color: "#3366cc",
    robotHp: 105, robotAtk: 18, robotDef: 10, robotSpd: 5, vehicleSpd: 11, vehicleAtk: 14,
    special: "소닉 블라스트", specialIcon: "🔊💥", specialDmg: 60, specialCost: 30,
    desc: "오토봇 부관. 음악을 사랑하는 전사." },
  { id: "grimlock", name: "그림록", faction: "autobot", robotIcon: "🤖🦕", vehicleIcon: "🦖", vehicleType: "T-Rex", color: "#cc8833",
    robotHp: 200, robotAtk: 30, robotDef: 20, robotSpd: 2, vehicleSpd: 5, vehicleAtk: 25,
    special: "다이노봇 파이어", specialIcon: "🦖🔥", specialDmg: 100, specialCost: 50,
    desc: "다이노봇 리더. 나 그림록, 강하다!" },
];

const DECEPTICONS: Transformer[] = [
  { id: "megatron", name: "메가트론", faction: "decepticon", robotIcon: "😈🔫", vehicleIcon: "✈️", vehicleType: "전투기", color: "#666666",
    robotHp: 160, robotAtk: 28, robotDef: 20, robotSpd: 3, vehicleSpd: 9, vehicleAtk: 20,
    special: "퓨전 캐논", specialIcon: "🔫💥", specialDmg: 90, specialCost: 40,
    desc: "디셉티콘의 리더. 모든 것을 지배한다." },
  { id: "starscream", name: "스타스크림", faction: "decepticon", robotIcon: "😈✈️", vehicleIcon: "🛩️", vehicleType: "제트기", color: "#cc33cc",
    robotHp: 100, robotAtk: 18, robotDef: 10, robotSpd: 4, vehicleSpd: 12, vehicleAtk: 15,
    special: "미사일 스톰", specialIcon: "🚀💥", specialDmg: 65, specialCost: 35,
    desc: "배신의 아이콘. 하늘의 지배자." },
  { id: "soundwave", name: "사운드웨이브", faction: "decepticon", robotIcon: "😈📻", vehicleIcon: "📡", vehicleType: "위성", color: "#3333aa",
    robotHp: 130, robotAtk: 20, robotDef: 16, robotSpd: 3, vehicleSpd: 7, vehicleAtk: 14,
    special: "소닉 웨이브", specialIcon: "📻💥", specialDmg: 70, specialCost: 35,
    desc: "정보의 달인. 사운드웨이브 우월하다." },
  { id: "shockwave", name: "쇼크웨이브", faction: "decepticon", robotIcon: "😈🔮", vehicleIcon: "🛸", vehicleType: "우주선", color: "#9933cc",
    robotHp: 140, robotAtk: 24, robotDef: 18, robotSpd: 2.5, vehicleSpd: 8, vehicleAtk: 18,
    special: "로직 캐논", specialIcon: "🔮💥", specialDmg: 85, specialCost: 42,
    desc: "냉혹한 과학자. 논리만이 전부다." },
  { id: "devastator", name: "데바스테이터", faction: "decepticon", robotIcon: "😈🏗️", vehicleIcon: "🚜", vehicleType: "컨스트럭트", color: "#339933",
    robotHp: 250, robotAtk: 35, robotDef: 25, robotSpd: 1.5, vehicleSpd: 4, vehicleAtk: 22,
    special: "합체 크러시", specialIcon: "👊💥", specialDmg: 120, specialCost: 55,
    desc: "컨스트럭티콘 합체! 거대한 파괴자." },
];

const STORY_DATA: Omit<StoryChapter, "completed">[] = [
  { id: 1, title: "사이버트론의 전쟁", subtitle: "모든 것의 시작", icon: "🌍",
    enemies: [{ transformer: DECEPTICONS[1], count: 2 }],
    boss: DECEPTICONS[1], reward: "캐논 업그레이드", bgGradient: "from-gray-900 to-purple-950" },
  { id: 2, title: "지구에 도착", subtitle: "새로운 전장", icon: "🌍",
    enemies: [{ transformer: DECEPTICONS[1], count: 2 }, { transformer: DECEPTICONS[2], count: 1 }],
    boss: DECEPTICONS[2], reward: "방어 강화", bgGradient: "from-blue-950 to-gray-950" },
  { id: 3, title: "올스파크를 찾아서", subtitle: "에너지의 근원", icon: "💎",
    enemies: [{ transformer: DECEPTICONS[2], count: 2 }, { transformer: DECEPTICONS[3], count: 1 }],
    boss: DECEPTICONS[3], reward: "스피드 부스트", bgGradient: "from-yellow-950 to-gray-950" },
  { id: 4, title: "후버 댐 전투", subtitle: "메가트론이 깨어났다!", icon: "🏗️",
    enemies: [{ transformer: DECEPTICONS[1], count: 2 }, { transformer: DECEPTICONS[3], count: 2 }],
    boss: DECEPTICONS[0], reward: "필살기 강화", bgGradient: "from-stone-900 to-red-950" },
  { id: 5, title: "시카고 대전", subtitle: "도시를 지켜라!", icon: "🏙️",
    enemies: [{ transformer: DECEPTICONS[1], count: 3 }, { transformer: DECEPTICONS[2], count: 2 }],
    boss: DECEPTICONS[4], reward: "합체 파츠", bgGradient: "from-red-950 to-orange-950" },
  { id: 6, title: "최후의 기사", subtitle: "사이버트론의 운명", icon: "⚔️",
    enemies: [{ transformer: DECEPTICONS[3], count: 2 }, { transformer: DECEPTICONS[4], count: 1 }],
    reward: "전설의 파워", bgGradient: "from-purple-950 to-red-950" },
  { id: 7, title: "최후의 결전", subtitle: "메가트론 vs 옵티머스!", icon: "💥",
    enemies: [{ transformer: DECEPTICONS[2], count: 2 }, { transformer: DECEPTICONS[3], count: 2 }],
    boss: DECEPTICONS[0], reward: "트랜스포머의 영웅!", bgGradient: "from-red-950 to-black" },
];

// ============================================================
// COMPONENT
// ============================================================
export default function TransformerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedBot, setSelectedBot] = useState(0);
  const [chapters, setChapters] = useState<StoryChapter[]>(STORY_DATA.map((s) => ({ ...s, completed: false })));
  const [coins, setCoins] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [bonusAtk, setBonusAtk] = useState(0);
  const [bonusDef, setBonusDef] = useState(0);
  const [bonusHp, setBonusHp] = useState(0);
  const [totalKills, setTotalKills] = useState(0);

  const gameRef = useRef<{
    player: PlayerState;
    enemies: EnemyBot[];
    bullets: Bullet[];
    particles: Particle[];
    keys: Set<string>;
    shake: number;
    time: number;
    running: boolean;
    battleOver: boolean;
    battleResult: "win" | "lose" | null;
    enemyQueue: EnemyBot[];
    announcement: string;
    annoTimer: number;
    currentChapter: number | null;
  } | null>(null);

  function rng(a: number, b: number) { return a + Math.random() * (b - a); }

  function spawnParticles(x: number, y: number, count: number, color: string) {
    const g = gameRef.current;
    if (!g) return;
    for (let i = 0; i < count; i++) {
      const angle = rng(0, Math.PI * 2), speed = rng(1, 5);
      g.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: rng(200, 500), maxLife: 500, r: rng(2, 6), color });
    }
  }

  function makeEnemy(t: Transformer, isBoss: boolean, wave: number): EnemyBot {
    const scale = 1 + wave * 0.1;
    return {
      x: rng(500, 750), y: GROUND, vx: 0, vy: 0,
      hp: Math.floor(t.robotHp * scale * (isBoss ? 1.5 : 0.7)), maxHp: Math.floor(t.robotHp * scale * (isBoss ? 1.5 : 0.7)),
      atk: Math.floor(t.robotAtk * scale), def: Math.floor(t.robotDef * scale * 0.5), spd: t.robotSpd,
      mode: "robot", transformer: t, facing: -1, grounded: true,
      attackFrame: 0, attackCd: 0, transformTimer: 0, isBoss, flash: 0,
    };
  }

  const startBattle = useCallback((enemies: EnemyBot[], chapterId?: number) => {
    const bot = AUTOBOTS[selectedBot];
    const first = enemies[0];
    gameRef.current = {
      player: {
        x: 120, y: GROUND, vx: 0, vy: 0,
        hp: bot.robotHp + bonusHp, maxHp: bot.robotHp + bonusHp,
        energy: 100, maxEnergy: 100,
        mode: "robot", transformer: bot, facing: 1, grounded: true,
        attackFrame: 0, invincible: 0, transformCooldown: 0, specialReady: true,
        level: playerLevel, xp: 0, xpToNext: 30 + playerLevel * 10,
        bonusAtk, bonusDef, bonusHp,
      },
      enemies: [first],
      bullets: [],
      particles: [],
      keys: new Set(),
      shake: 0, time: 0, running: true,
      battleOver: false, battleResult: null,
      enemyQueue: enemies.slice(1),
      announcement: "변신!", annoTimer: 1500,
      currentChapter: chapterId ?? null,
    };
    setScreen("battle");
  }, [selectedBot, bonusAtk, bonusDef, bonusHp, playerLevel]);

  const startChapter = useCallback((ch: StoryChapter) => {
    const allEnemies: EnemyBot[] = [];
    for (const group of ch.enemies) {
      for (let i = 0; i < group.count; i++) {
        allEnemies.push(makeEnemy(group.transformer, false, ch.id));
      }
    }
    if (ch.boss) allEnemies.push(makeEnemy(ch.boss, true, ch.id));
    startBattle(allEnemies, ch.id);
  }, [startBattle]);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    if (screen !== "battle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const onKeyDown = (e: KeyboardEvent) => { gameRef.current?.keys.add(e.key.toLowerCase()); if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault(); };
    const onKeyUp = (e: KeyboardEvent) => { gameRef.current?.keys.delete(e.key.toLowerCase()); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function drawBot(x: number, y: number, facing: number, mode: Mode, t: Transformer, flash: boolean, isBoss: boolean, attackFrame: number) {
      const color = flash ? "#ffffff" : t.color;
      const bossScale = isBoss ? 1.3 : 1;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 8, 20 * bossScale, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (mode === "robot") {
        const h = 55 * bossScale;
        // Legs
        ctx.strokeStyle = color;
        ctx.lineWidth = 6 * bossScale;
        ctx.lineCap = "round";
        const legSway = Math.sin(gameRef.current!.time * 0.005) * 3;
        ctx.beginPath();
        ctx.moveTo(x - 8, y - h * 0.35);
        ctx.lineTo(x - 12 + legSway, y);
        ctx.moveTo(x + 8, y - h * 0.35);
        ctx.lineTo(x + 12 - legSway, y);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x - 14 * bossScale, y - h * 0.7, 28 * bossScale, h * 0.4);
        // Chest detail
        ctx.fillStyle = t.faction === "autobot" ? "#ff3333" : "#7733cc";
        ctx.fillRect(x - 6 * bossScale, y - h * 0.65, 12 * bossScale, 8 * bossScale);

        // Arms
        ctx.strokeStyle = color;
        ctx.lineWidth = 5 * bossScale;
        if (attackFrame > 0) {
          // Attack pose
          ctx.beginPath();
          ctx.moveTo(x - 14 * bossScale, y - h * 0.6);
          ctx.lineTo(x + facing * 40 * bossScale, y - h * 0.55);
          ctx.stroke();
          // Weapon flash
          ctx.fillStyle = "#ffcc00";
          ctx.beginPath();
          ctx.arc(x + facing * 42 * bossScale, y - h * 0.55, 5 * bossScale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(x - 14 * bossScale, y - h * 0.6);
          ctx.lineTo(x - 20 * bossScale, y - h * 0.35);
          ctx.moveTo(x + 14 * bossScale, y - h * 0.6);
          ctx.lineTo(x + 20 * bossScale, y - h * 0.35);
          ctx.stroke();
        }

        // Head
        ctx.fillStyle = color;
        ctx.fillRect(x - 8 * bossScale, y - h * 0.9, 16 * bossScale, 14 * bossScale);
        // Eyes
        ctx.fillStyle = t.faction === "autobot" ? "#00ccff" : "#ff0044";
        ctx.fillRect(x - 5 * bossScale + facing * 2, y - h * 0.85, 3 * bossScale, 3 * bossScale);
        ctx.fillRect(x + 2 * bossScale + facing * 2, y - h * 0.85, 3 * bossScale, 3 * bossScale);
        // Helmet
        ctx.fillStyle = color;
        ctx.fillRect(x - 10 * bossScale, y - h * 0.92, 20 * bossScale, 4 * bossScale);

        // Boss crown
        if (isBoss) {
          ctx.fillStyle = "#ffcc00";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("👑", x, y - h - 5);
        }
      } else {
        // Vehicle mode
        const vw = 50 * bossScale, vh = 20 * bossScale;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - vw / 2, y - vh - 5, vw, vh, 6);
        ctx.fill();
        // Windshield
        ctx.fillStyle = "#333";
        ctx.fillRect(x + facing * 8, y - vh - 2, 12 * facing, vh * 0.6);
        // Wheels
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(x - vw * 0.3, y - 3, 5 * bossScale, 0, Math.PI * 2);
        ctx.arc(x + vw * 0.3, y - 3, 5 * bossScale, 0, Math.PI * 2);
        ctx.fill();
        // Boost trail in vehicle mode
        if (Math.abs(gameRef.current?.player.vx ?? 0) > 2 || true) {
          ctx.fillStyle = `${color}44`;
          ctx.beginPath();
          ctx.arc(x - facing * vw * 0.6, y - vh / 2, rng(4, 8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    let lastTime = performance.now();

    function gameLoop(now: number) {
      const dt = Math.min(now - lastTime, 33);
      lastTime = now;
      const g = gameRef.current;
      if (!g) { af = requestAnimationFrame(gameLoop); return; }

      g.time += dt;
      if (g.annoTimer > 0) {
        g.annoTimer -= dt;
        if (g.annoTimer <= 0) g.announcement = "";
      }

      const p = g.player;
      const keys = g.keys;
      const canFight = !g.battleOver && g.announcement === "";

      if (canFight) {
        const spd = p.mode === "robot" ? p.transformer.robotSpd + p.bonusAtk * 0.05 : p.transformer.vehicleSpd;

        // Movement
        if (keys.has("arrowleft") || keys.has("a")) { p.vx = -spd; p.facing = -1; }
        else if (keys.has("arrowright") || keys.has("d")) { p.vx = spd; p.facing = 1; }
        else { p.vx *= 0.85; }

        // Jump (robot only)
        if ((keys.has("arrowup") || keys.has("w") || keys.has(" ")) && p.grounded && p.mode === "robot") {
          p.vy = -10; p.grounded = false;
          spawnParticles(p.x, GROUND, 5, "#aaa");
        }

        // Transform (T key)
        if (keys.has("t") && p.transformCooldown <= 0) {
          p.mode = p.mode === "robot" ? "vehicle" : "robot";
          p.transformCooldown = 1000;
          spawnParticles(p.x, p.y - 30, 15, p.transformer.color);
          g.shake = 5;
          g.announcement = p.mode === "vehicle" ? "변신! 🚗" : "변신! 🤖";
          g.annoTimer = 800;
          keys.delete("t");
        }

        // Attack (Z key - robot punch, vehicle ram)
        if (keys.has("z") && p.attackFrame <= 0) {
          if (p.mode === "robot") {
            p.attackFrame = 300;
            const atk = p.transformer.robotAtk + p.bonusAtk;
            const range = 50;
            for (const e of g.enemies) {
              if (Math.abs(e.x - p.x) < range && Math.abs(e.y - p.y) < 40 && e.x * p.facing > p.x * p.facing - 10) {
                const dmg = Math.max(1, atk + Math.floor(rng(0, 5)) - Math.floor(e.def * 0.2));
                e.hp -= dmg;
                e.flash = 100;
                e.vx = p.facing * 5;
                spawnParticles(e.x, e.y - 30, 8, "#ffcc00");
                g.shake = 4;
              }
            }
          } else {
            // Vehicle shoot
            p.attackFrame = 200;
            g.bullets.push({
              x: p.x + p.facing * 30, y: p.y - 15,
              vx: p.facing * 10, vy: 0,
              damage: p.transformer.vehicleAtk + Math.floor(p.bonusAtk * 0.5),
              fromPlayer: true, life: 600, r: 4, color: "#ffcc00",
            });
          }
          keys.delete("z");
        }

        // Ranged attack (X key)
        if (keys.has("x") && p.attackFrame <= 0 && p.energy >= 8) {
          p.attackFrame = 250;
          p.energy -= 8;
          g.bullets.push({
            x: p.x + p.facing * 25, y: p.y - 35,
            vx: p.facing * 8, vy: 0,
            damage: Math.floor((p.transformer.robotAtk + p.bonusAtk) * 0.8),
            fromPlayer: true, life: 800, r: 5, color: p.transformer.color,
          });
          spawnParticles(p.x + p.facing * 25, p.y - 35, 3, p.transformer.color);
          keys.delete("x");
        }

        // Special (C key)
        if (keys.has("c") && p.energy >= p.transformer.specialCost && p.attackFrame <= 0) {
          p.attackFrame = 500;
          p.energy -= p.transformer.specialCost;
          g.shake = 10;
          spawnParticles(p.x, p.y - 30, 25, p.transformer.color);
          g.announcement = p.transformer.special + "!";
          g.annoTimer = 1000;

          if (p.transformer.special === "수리 필드") {
            // Heal
            const heal = Math.abs(p.transformer.specialDmg);
            p.hp = Math.min(p.maxHp, p.hp + heal);
            spawnParticles(p.x, p.y - 30, 15, "#44ff44");
          } else {
            // Damage all enemies
            for (const e of g.enemies) {
              let dmg = p.transformer.specialDmg + Math.floor(p.bonusAtk * 0.3);
              dmg = Math.max(1, dmg - Math.floor(e.def * 0.15));
              e.hp -= dmg;
              e.flash = 200;
              e.vx = p.facing * 8;
              spawnParticles(e.x, e.y - 20, 15, "#ff4444");
            }
          }
          keys.delete("c");
        }

        // Physics
        p.vy += GRAVITY;
        p.x += p.vx; p.y += p.vy;
        if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.grounded = true; }
        p.x = Math.max(30, Math.min(W - 30, p.x));
        p.attackFrame = Math.max(0, p.attackFrame - dt);
        p.invincible = Math.max(0, p.invincible - dt);
        p.transformCooldown = Math.max(0, p.transformCooldown - dt);
        p.energy = Math.min(p.maxEnergy, p.energy + dt * 0.015);

        // === ENEMIES ===
        for (const e of g.enemies) {
          e.flash = Math.max(0, e.flash - dt);
          e.attackCd = Math.max(0, e.attackCd - dt);
          e.transformTimer -= dt;

          // Transform randomly
          if (e.transformTimer <= 0) {
            e.mode = e.mode === "robot" ? "vehicle" : "robot";
            e.transformTimer = 3000 + rng(0, 4000);
            spawnParticles(e.x, e.y - 20, 8, e.transformer.color);
          }

          // AI
          const toPlayer = p.x - e.x;
          e.facing = toPlayer > 0 ? 1 : -1;
          const distX = Math.abs(toPlayer);

          if (e.mode === "robot") {
            if (distX > 60) e.vx = e.facing * e.spd;
            else e.vx *= 0.8;

            if (distX < 55 && e.attackCd <= 0) {
              // Melee attack
              let dmg = e.atk + Math.floor(rng(0, 5));
              dmg = Math.max(1, dmg - Math.floor((p.transformer.robotDef + p.bonusDef) * 0.25));
              if (p.invincible <= 0) {
                p.hp -= dmg;
                p.invincible = 300;
                p.vx = -e.facing * 4;
                spawnParticles(p.x, p.y - 30, 6, "#ff4444");
                g.shake = 5;
              }
              e.attackFrame = 300;
              e.attackCd = 1000;
            }
          } else {
            // Vehicle mode: charge at player
            e.vx = e.facing * (e.transformer.vehicleSpd * 0.6);
            if (distX < 30 && e.attackCd <= 0 && p.invincible <= 0) {
              let dmg = Math.floor(e.transformer.vehicleAtk * 1.2);
              dmg = Math.max(1, dmg - Math.floor((p.transformer.robotDef + p.bonusDef) * 0.2));
              p.hp -= dmg;
              p.invincible = 400;
              p.vx = -e.facing * 6;
              p.vy = -4;
              spawnParticles(p.x, p.y - 20, 10, "#ff8800");
              g.shake = 8;
              e.attackCd = 1500;
            }
            // Shoot sometimes
            if (distX > 100 && distX < 400 && e.attackCd <= 0 && Math.random() < 0.02) {
              g.bullets.push({
                x: e.x + e.facing * 25, y: e.y - 15,
                vx: e.facing * 6, vy: 0,
                damage: Math.floor(e.transformer.vehicleAtk * 0.7),
                fromPlayer: false, life: 800, r: 4, color: "#ff4488",
              });
              e.attackCd = 800;
            }
          }

          e.vy += GRAVITY;
          e.x += e.vx; e.y += e.vy;
          if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.grounded = true; }
          e.x = Math.max(30, Math.min(W - 30, e.x));
          e.attackFrame = Math.max(0, e.attackFrame - dt);
          e.vx *= 0.9;
        }

        // Bullets
        for (const b of g.bullets) {
          b.x += b.vx; b.y += b.vy; b.life -= dt;
          // Trails
          if (Math.random() < 0.3) g.particles.push({ x: b.x, y: b.y, vx: rng(-0.5, 0.5), vy: rng(-0.5, 0.5), life: 150, maxLife: 150, r: 2, color: b.color });

          if (b.fromPlayer) {
            for (const e of g.enemies) {
              if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - (e.y - 25)) < 30) {
                const dmg = Math.max(1, b.damage - Math.floor(e.def * 0.15));
                e.hp -= dmg; e.flash = 100;
                spawnParticles(b.x, b.y, 5, "#ffcc00");
                g.shake = 2; b.life = 0; break;
              }
            }
          } else {
            if (p.invincible <= 0 && Math.abs(b.x - p.x) < 20 && Math.abs(b.y - (p.y - 25)) < 30) {
              const dmg = Math.max(1, b.damage - Math.floor((p.transformer.robotDef + p.bonusDef) * 0.2));
              p.hp -= dmg; p.invincible = 200;
              spawnParticles(p.x, p.y - 25, 5, "#ff4444");
              g.shake = 4; b.life = 0;
            }
          }
        }

        // Check enemy deaths
        for (const e of g.enemies) {
          if (e.hp <= 0) {
            spawnParticles(e.x, e.y - 25, 20, e.transformer.color);
            g.shake = 8;
            setTotalKills((k) => k + 1);
            setCoins((c) => c + (e.isBoss ? 50 : 15));
            // XP
            p.xp += e.isBoss ? 25 : 8;
            if (p.xp >= p.xpToNext) {
              p.xp -= p.xpToNext;
              p.level++; p.xpToNext = Math.floor(p.xpToNext * 1.2);
              p.maxHp += 10; p.hp = p.maxHp;
              setPlayerLevel(p.level);
              setBonusAtk((a) => a + 2);
              setBonusDef((d) => d + 1);
              setBonusHp((h) => h + 10);
              spawnParticles(p.x, p.y - 30, 20, "#ffdd00");
              g.announcement = "레벨 업!";
              g.annoTimer = 1000;
            }
          }
        }
        g.enemies = g.enemies.filter((e) => e.hp > 0);

        // Next enemy or victory
        if (g.enemies.length === 0) {
          if (g.enemyQueue.length > 0) {
            const next = g.enemyQueue[0];
            g.enemies.push(next);
            g.enemyQueue = g.enemyQueue.slice(1);
            g.announcement = next.isBoss ? `⚠️ 보스: ${next.transformer.name}!` : `${next.transformer.name} 등장!`;
            g.annoTimer = 1200;
          } else {
            g.battleOver = true;
            g.battleResult = "win";
            g.announcement = "승리!";
            g.annoTimer = 2000;
            if (g.currentChapter) {
              setChapters((prev) => prev.map((c) => c.id === g.currentChapter ? { ...c, completed: true } : c));
            }
          }
        }

        // Player death
        if (p.hp <= 0) {
          g.battleOver = true;
          g.battleResult = "lose";
          g.announcement = "패배...";
          g.annoTimer = 2000;
          spawnParticles(p.x, p.y - 30, 20, p.transformer.color);
        }
      }

      // Particles
      for (const pt of g.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.03; pt.vx *= 0.97; pt.life -= dt; }
      g.particles = g.particles.filter((pt) => pt.life > 0);
      g.bullets = g.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < W + 20);
      g.shake = Math.max(0, g.shake - 0.3);

      // === RENDER ===
      ctx.save();
      if (g.shake > 0) ctx.translate(rng(-g.shake, g.shake), rng(-g.shake, g.shake));

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0a0a1a"); sky.addColorStop(0.6, "#1a1a35"); sky.addColorStop(1, "#2a2a3a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // City background
      ctx.fillStyle = "#111120";
      for (let i = 0; i < 15; i++) {
        const bx = i * 60 + 5, bw = 45, bh = 50 + (i * 47) % 120;
        ctx.fillRect(bx, GROUND + 8 - bh, bw, bh);
      }

      // Ground
      ctx.fillStyle = "#252530";
      ctx.fillRect(0, GROUND + 8, W, H - GROUND);
      ctx.strokeStyle = "#444"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 8); ctx.lineTo(W, GROUND + 8); ctx.stroke();

      // Particles (behind)
      for (const pt of g.particles) {
        ctx.globalAlpha = pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (pt.life / pt.maxLife), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Bullets
      for (const b of g.bullets) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Enemies
      for (const e of g.enemies) {
        drawBot(e.x, e.y, e.facing, e.mode, e.transformer, e.flash > 0, e.isBoss, e.attackFrame);
        // HP bar
        const bw = e.isBoss ? 50 : 35;
        ctx.fillStyle = "#333";
        ctx.fillRect(e.x - bw / 2, e.y - (e.mode === "robot" ? 70 : 35) * (e.isBoss ? 1.3 : 1), bw, 4);
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(e.x - bw / 2, e.y - (e.mode === "robot" ? 70 : 35) * (e.isBoss ? 1.3 : 1), bw * (e.hp / e.maxHp), 4);
      }

      // Player
      if (p.invincible <= 0 || Math.floor(g.time / 80) % 2 === 0) {
        drawBot(p.x, p.y, p.facing, p.mode, p.transformer, false, false, p.attackFrame);
      }

      // === HUD ===
      // HP
      ctx.fillStyle = "#222"; ctx.fillRect(15, 15, 200, 16);
      ctx.fillStyle = p.hp > p.maxHp * 0.3 ? "#44cc44" : "#cc4444";
      ctx.fillRect(15, 15, 200 * Math.max(0, p.hp / p.maxHp), 16);
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.strokeRect(15, 15, 200, 16);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 115, 27);

      // Energy
      ctx.fillStyle = "#222"; ctx.fillRect(15, 34, 200, 8);
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(15, 34, 200 * (p.energy / p.maxEnergy), 8);

      // XP
      ctx.fillStyle = "#222"; ctx.fillRect(15, 45, 200, 5);
      ctx.fillStyle = "#aa44ff";
      ctx.fillRect(15, 45, 200 * (p.xp / p.xpToNext), 5);

      // Info
      ctx.textAlign = "left"; ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif";
      ctx.fillText(`${p.transformer.robotIcon} ${p.transformer.name} Lv.${p.level} | ${p.mode === "robot" ? "🤖 로봇" : `${p.transformer.vehicleIcon} ${p.transformer.vehicleType}`}`, 15, 62);

      // Transform CD
      ctx.fillStyle = p.transformCooldown > 0 ? "#555" : "#00ccff";
      ctx.fillText(p.transformCooldown > 0 ? `변신 ${(p.transformCooldown / 1000).toFixed(1)}s` : "T 변신 가능", 15, H - 12);

      // Controls
      ctx.fillStyle = "#444"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("←→ 이동 | ↑ 점프 | Z 공격 | X 사격 | C 필살기 | T 변신", W - 15, H - 12);

      // Wave info
      ctx.textAlign = "right"; ctx.fillStyle = "#888"; ctx.font = "bold 11px sans-serif";
      ctx.fillText(`남은 적: ${g.enemies.length + g.enemyQueue.length}`, W - 15, 22);

      // Announcement
      if (g.announcement) {
        ctx.textAlign = "center"; ctx.fillStyle = "#fff";
        ctx.font = `bold ${g.announcement.includes("승리") || g.announcement.includes("패배") ? 48 : 28}px sans-serif`;
        ctx.shadowColor = "#000"; ctx.shadowBlur = 10;
        ctx.fillText(g.announcement, W / 2, H / 2 - 30);
        ctx.shadowBlur = 0;
      }

      // Battle over buttons
      if (g.battleOver && g.annoTimer <= 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W / 2 - 120, H / 2 + 10, 240, 40);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("아무 키나 누르세요", W / 2, H / 2 + 35);
        if (g.keys.size > 0) {
          setScreen("hub");
        }
      }

      ctx.restore();
      af = requestAnimationFrame(gameLoop);
    }

    let af = requestAnimationFrame(gameLoop);
    return () => { cancelAnimationFrame(af); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [screen]);

  // ============================================================
  // UI SCREENS
  // ============================================================
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-500 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🤖⚔️</div>
          <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">트랜스포머</h1>
          <p className="text-sm text-gray-400 mb-6">변신하고 싸워라! 실시간 액션!</p>
          <div className="text-left bg-white/5 rounded-xl p-4 border border-white/10 mb-6 text-sm text-gray-300 space-y-1">
            <p>← → 이동 | ↑ 점프 | Z 근접 | X 사격</p>
            <p>C 필살기 | T 변신 (로봇↔차량)</p>
            <p>🤖 로봇: 강한 펀치, 점프</p>
            <p>🚗 차량: 빠른 이동, 원거리 사격</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-red-700 to-blue-700 py-4 text-xl font-black hover:brightness-125 border border-red-400/30">
            오토봇, 출동!
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
          <h2 className="text-xl font-black mb-4 text-center">🤖 오토봇 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {AUTOBOTS.map((bot, i) => (
              <button key={bot.id} onClick={() => { setSelectedBot(i); setScreen("hub"); }}
                className={`rounded-xl p-3 text-center border-2 transition-all hover:brightness-110 active:scale-95 ${selectedBot === i ? "border-yellow-400 bg-white/10" : "border-white/10 bg-white/5"}`}
                style={{ borderColor: selectedBot === i ? "#ffcc00" : undefined }}>
                <div className="text-2xl mb-1">{bot.robotIcon}</div>
                <div className="font-bold text-sm">{bot.name}</div>
                <div className="text-[10px] text-gray-400">{bot.vehicleIcon} {bot.vehicleType}</div>
                <div className="text-[10px] text-gray-500 mt-1">HP:{bot.robotHp} ATK:{bot.robotAtk} SPD:{bot.robotSpd}</div>
                <div className="text-[10px] text-yellow-400">{bot.special}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "hub") {
    const bot = AUTOBOTS[selectedBot];
    const progress = chapters.filter((c) => c.completed).length;
    const nextCh = chapters.find((c) => !c.completed);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setScreen("select")} className="text-sm text-gray-400 hover:text-white">← 봇 변경</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>

          <div className="mb-3 rounded-xl p-4 border border-white/10" style={{ background: `linear-gradient(135deg, ${bot.color}33, #111)` }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{bot.robotIcon}</span>
              <div>
                <div className="font-black text-lg">{bot.name} <span className="text-sm font-normal text-gray-300">Lv.{playerLevel}</span></div>
                <div className="text-xs text-gray-400">{bot.vehicleIcon} {bot.vehicleType} | {bot.desc}</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>❤️{bot.robotHp + bonusHp}</span><span>⚔️{bot.robotAtk + bonusAtk}</span><span>🛡️{bot.robotDef + bonusDef}</span>
              <span>💀{totalKills}</span>
            </div>
          </div>

          {nextCh && (
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl bg-gradient-to-r from-red-800 to-blue-800 p-4 text-left hover:brightness-110 border border-red-500/30 animate-pulse">
              <div className="text-xs text-red-300 mb-1">📖 다음 미션</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-yellow-900/30 p-4 text-center border border-yellow-500/30">
              <div className="text-3xl mb-1">🏆🤖</div>
              <div className="font-black text-yellow-300">디셉티콘을 물리쳤다!</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-purple-800/50 p-3 text-center hover:brightness-110 border border-purple-500/20">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/7)</div>
            </button>
            <button onClick={() => setScreen("garage")} className="rounded-xl bg-amber-800/50 p-3 text-center hover:brightness-110 border border-amber-500/20">
              <div className="text-xl">🔧</div><div className="text-xs font-bold">차고 (강화)</div>
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
          <h2 className="text-xl font-black mb-3 text-center">📖 트랜스포머 스토리</h2>
          <div className="space-y-2">
            {chapters.map((ch) => (
              <button key={ch.id} onClick={() => !ch.completed && startChapter(ch)} disabled={ch.completed}
                className={`w-full rounded-xl bg-gradient-to-r ${ch.bgGradient} p-3 text-left border ${ch.completed ? "border-green-500/20 opacity-70" : "border-white/10 hover:brightness-110"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ch.completed ? "✅" : ch.icon}</span>
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

  if (screen === "garage") {
    const bot = AUTOBOTS[selectedBot];
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🔧 차고 - 강화</h2>
          {[
            { icon: "⚔️", name: "무기 강화", desc: `공격력 +3 (현재: ${bot.robotAtk + bonusAtk})`, cost: 40, action: () => setBonusAtk((a) => a + 3) },
            { icon: "🛡️", name: "장갑 강화", desc: `방어력 +2 (현재: ${bot.robotDef + bonusDef})`, cost: 40, action: () => setBonusDef((d) => d + 2) },
            { icon: "❤️", name: "코어 강화", desc: `최대HP +15 (현재: ${bot.robotHp + bonusHp})`, cost: 40, action: () => setBonusHp((h) => h + 15) },
            { icon: "🔧", name: "전체 수리", desc: "전투 시 HP 완전 회복", cost: 20, action: () => {} },
          ].map((item) => (
            <button key={item.name} onClick={() => { if (coins >= item.cost) { setCoins((c) => c - item.cost); item.action(); } }} disabled={coins < item.cost}
              className="w-full mb-2 rounded-xl bg-white/5 p-4 text-left hover:bg-white/10 border border-white/10 disabled:opacity-30 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1"><div className="font-bold">{item.name}</div><div className="text-xs text-gray-400">{item.desc}</div></div>
                <span className="text-yellow-400 text-sm">🪙{item.cost}</span>
              </div>
            </button>
          ))}
          <button onClick={() => setCoins((c) => c + 50)} className="w-full mt-3 rounded-lg bg-green-800/50 py-2 text-sm text-green-300 hover:bg-green-800/80 border border-green-500/20">🎁 무료 코인 +50</button>
        </div>
      </div>
    );
  }

  // Battle screen renders via canvas
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <canvas ref={canvasRef} width={W} height={H}
        className="block rounded-lg border border-gray-800"
        style={{ maxWidth: "100vw", maxHeight: "85vh" }} />
    </div>
  );
}
