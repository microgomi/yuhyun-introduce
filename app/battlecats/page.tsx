"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface CatType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  range: number;
  speed: number;
  cost: number;
  cooldown: number;
  desc: string;
  atkSpeed: number; // ticks between attacks
  unlockStage: number;
}

interface EnemyType {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  range: number;
  speed: number;
  atkSpeed: number;
  money: number;
}

interface Unit {
  uid: number;
  typeId: string;
  emoji: string;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  speed: number;
  atkSpeed: number;
  atkTimer: number;
  side: "cat" | "enemy";
}

interface Stage {
  id: number;
  name: string;
  emoji: string;
  baseHp: number;
  waves: { enemyId: string; delay: number; count: number }[];
  reward: number;
}

type Screen = "menu" | "stageSelect" | "battle" | "victory" | "defeat" | "gacha" | "gachaResult";
type GachaRarity = "rare" | "superRare" | "uber" | "legend";

// --- Constants ---
const FIELD_WIDTH = 100; // percentage

const CAT_TYPES: CatType[] = [
  { id: "basic", name: "기본냥", emoji: "🐱", hp: 120, atk: 20, range: 5, speed: 0.8, cost: 50, cooldown: 20, desc: "기본 고양이", atkSpeed: 10, unlockStage: 0 },
  { id: "tank", name: "탱크냥", emoji: "🛡️", hp: 400, atk: 12, range: 4, speed: 0.5, cost: 100, cooldown: 40, desc: "HP가 높은 방패냥", atkSpeed: 15, unlockStage: 0 },
  { id: "axe", name: "전사냥", emoji: "⚔️", hp: 180, atk: 55, range: 5, speed: 1.0, cost: 150, cooldown: 30, desc: "강한 공격력", atkSpeed: 12, unlockStage: 2 },
  { id: "gross", name: "징그냥", emoji: "😼", hp: 250, atk: 35, range: 6, speed: 0.7, cost: 180, cooldown: 35, desc: "범위가 넓은 냥", atkSpeed: 14, unlockStage: 3 },
  { id: "cow", name: "소냥", emoji: "🐮", hp: 150, atk: 25, range: 4, speed: 1.5, cost: 120, cooldown: 25, desc: "빠른 돌격냥", atkSpeed: 8, unlockStage: 4 },
  { id: "fish", name: "물고기냥", emoji: "🐟", hp: 300, atk: 70, range: 5, speed: 0.6, cost: 250, cooldown: 50, desc: "물고기로 때리는 냥", atkSpeed: 16, unlockStage: 5 },
  { id: "lizard", name: "공룡냥", emoji: "🦖", hp: 200, atk: 90, range: 12, speed: 0.4, cost: 350, cooldown: 60, desc: "원거리 빔 공격", atkSpeed: 20, unlockStage: 6 },
  { id: "titan", name: "거신냥", emoji: "👑", hp: 800, atk: 120, range: 5, speed: 0.3, cost: 600, cooldown: 100, desc: "최강의 거대 냥", atkSpeed: 25, unlockStage: 8 },
  { id: "ninja", name: "닌자냥", emoji: "🥷", hp: 100, atk: 45, range: 4, speed: 2.0, cost: 100, cooldown: 20, desc: "초고속 닌자", atkSpeed: 6, unlockStage: 1 },
  { id: "witch", name: "마녀냥", emoji: "🧙", hp: 150, atk: 60, range: 10, speed: 0.3, cost: 300, cooldown: 55, desc: "마법 원거리 공격", atkSpeed: 18, unlockStage: 7 },
];

const ENEMY_TYPES: EnemyType[] = [
  { id: "mouse", name: "쥐", emoji: "🐭", hp: 60, atk: 10, range: 4, speed: 1.0, atkSpeed: 10, money: 10 },
  { id: "dog", name: "개", emoji: "🐶", hp: 120, atk: 20, range: 4, speed: 0.8, atkSpeed: 12, money: 15 },
  { id: "pig", name: "돼지", emoji: "🐷", hp: 200, atk: 30, range: 5, speed: 0.6, atkSpeed: 14, money: 20 },
  { id: "bear", name: "곰", emoji: "🐻", hp: 400, atk: 50, range: 5, speed: 0.4, atkSpeed: 16, money: 35 },
  { id: "eagle", name: "독수리", emoji: "🦅", hp: 150, atk: 60, range: 10, speed: 0.7, atkSpeed: 14, money: 30 },
  { id: "rhino", name: "코뿔소", emoji: "🦏", hp: 600, atk: 70, range: 4, speed: 0.5, atkSpeed: 18, money: 50 },
  { id: "elephant", name: "코끼리", emoji: "🐘", hp: 800, atk: 80, range: 5, speed: 0.3, atkSpeed: 20, money: 60 },
  { id: "dragon", name: "드래곤", emoji: "🐉", hp: 1200, atk: 120, range: 8, speed: 0.4, atkSpeed: 22, money: 100 },
  { id: "boss_king", name: "킹", emoji: "👹", hp: 2500, atk: 180, range: 6, speed: 0.3, atkSpeed: 25, money: 200 },
  { id: "boss_god", name: "신", emoji: "⚡", hp: 5000, atk: 300, range: 8, speed: 0.2, atkSpeed: 30, money: 500 },
];

const STAGES: Stage[] = [
  { id: 1, name: "초원", emoji: "🌿", baseHp: 500, reward: 50, waves: [
    { enemyId: "mouse", delay: 30, count: 5 },
    { enemyId: "dog", delay: 60, count: 3 },
  ]},
  { id: 2, name: "숲", emoji: "🌲", baseHp: 800, reward: 80, waves: [
    { enemyId: "mouse", delay: 20, count: 6 },
    { enemyId: "dog", delay: 40, count: 5 },
    { enemyId: "pig", delay: 80, count: 2 },
  ]},
  { id: 3, name: "마을", emoji: "🏘️", baseHp: 1000, reward: 100, waves: [
    { enemyId: "dog", delay: 20, count: 6 },
    { enemyId: "pig", delay: 40, count: 4 },
    { enemyId: "bear", delay: 100, count: 2 },
  ]},
  { id: 4, name: "사막", emoji: "🏜️", baseHp: 1200, reward: 130, waves: [
    { enemyId: "pig", delay: 15, count: 8 },
    { enemyId: "eagle", delay: 50, count: 4 },
    { enemyId: "bear", delay: 80, count: 3 },
  ]},
  { id: 5, name: "바다", emoji: "🌊", baseHp: 1500, reward: 160, waves: [
    { enemyId: "dog", delay: 10, count: 10 },
    { enemyId: "bear", delay: 40, count: 5 },
    { enemyId: "rhino", delay: 100, count: 2 },
  ]},
  { id: 6, name: "화산", emoji: "🌋", baseHp: 2000, reward: 200, waves: [
    { enemyId: "pig", delay: 10, count: 8 },
    { enemyId: "eagle", delay: 30, count: 6 },
    { enemyId: "rhino", delay: 60, count: 3 },
    { enemyId: "elephant", delay: 120, count: 2 },
  ]},
  { id: 7, name: "성", emoji: "🏰", baseHp: 2500, reward: 250, waves: [
    { enemyId: "bear", delay: 10, count: 8 },
    { enemyId: "rhino", delay: 30, count: 5 },
    { enemyId: "elephant", delay: 60, count: 3 },
    { enemyId: "dragon", delay: 120, count: 1 },
  ]},
  { id: 8, name: "지옥", emoji: "🔥", baseHp: 3000, reward: 300, waves: [
    { enemyId: "eagle", delay: 8, count: 10 },
    { enemyId: "elephant", delay: 30, count: 5 },
    { enemyId: "dragon", delay: 60, count: 3 },
    { enemyId: "boss_king", delay: 150, count: 1 },
  ]},
  { id: 9, name: "천국", emoji: "☁️", baseHp: 4000, reward: 400, waves: [
    { enemyId: "rhino", delay: 8, count: 10 },
    { enemyId: "dragon", delay: 30, count: 5 },
    { enemyId: "boss_king", delay: 80, count: 2 },
  ]},
  { id: 10, name: "우주", emoji: "🌌", baseHp: 6000, reward: 600, waves: [
    { enemyId: "elephant", delay: 8, count: 10 },
    { enemyId: "dragon", delay: 20, count: 8 },
    { enemyId: "boss_king", delay: 60, count: 3 },
    { enemyId: "boss_god", delay: 150, count: 1 },
  ]},
];

// --- Gacha ---
interface GachaCat {
  id: string;
  name: string;
  emoji: string;
  rarity: GachaRarity;
  hp: number;
  atk: number;
  range: number;
  speed: number;
  cost: number;
  cooldown: number;
  desc: string;
  atkSpeed: number;
}

const RARITY_INFO: Record<GachaRarity, { name: string; color: string; bg: string; chance: number; border: string }> = {
  rare: { name: "레어", color: "text-blue-400", bg: "bg-blue-500", chance: 69, border: "border-blue-400" },
  superRare: { name: "슈퍼레어", color: "text-purple-400", bg: "bg-purple-500", chance: 22, border: "border-purple-400" },
  uber: { name: "울트라레어", color: "text-yellow-400", bg: "bg-yellow-500", chance: 8, border: "border-yellow-400" },
  legend: { name: "레전드레어", color: "text-red-400", bg: "bg-red-500", chance: 1, border: "border-red-400" },
};

const GACHA_CATS: GachaCat[] = [
  // Rare
  { id: "g_warrior", name: "용사냥", emoji: "🗡️", rarity: "rare", hp: 250, atk: 45, range: 5, speed: 0.9, cost: 150, cooldown: 25, desc: "용감한 전사 고양이", atkSpeed: 10 },
  { id: "g_archer", name: "양궁냥", emoji: "🏹", rarity: "rare", hp: 150, atk: 55, range: 10, speed: 0.5, cost: 180, cooldown: 30, desc: "원거리 명사수", atkSpeed: 14 },
  { id: "g_pirate", name: "해적냥", emoji: "🏴‍☠️", rarity: "rare", hp: 300, atk: 40, range: 5, speed: 0.7, cost: 160, cooldown: 28, desc: "바다의 약탈자", atkSpeed: 12 },
  { id: "g_chef", name: "요리사냥", emoji: "👨‍🍳", rarity: "rare", hp: 200, atk: 50, range: 6, speed: 0.8, cost: 170, cooldown: 26, desc: "프라이팬 공격!", atkSpeed: 11 },
  // Super Rare
  { id: "g_surfer", name: "서핑냥", emoji: "🏄", rarity: "superRare", hp: 400, atk: 80, range: 6, speed: 1.0, cost: 280, cooldown: 40, desc: "파도를 타는 고양이", atkSpeed: 12 },
  { id: "g_robot", name: "로봇냥", emoji: "🤖", rarity: "superRare", hp: 600, atk: 60, range: 8, speed: 0.4, cost: 320, cooldown: 50, desc: "철벽 방어 로봇", atkSpeed: 16 },
  { id: "g_angel", name: "천사냥", emoji: "😇", rarity: "superRare", hp: 350, atk: 100, range: 10, speed: 0.5, cost: 350, cooldown: 45, desc: "하늘에서 내려온 천사", atkSpeed: 14 },
  { id: "g_vampire", name: "뱀파이어냥", emoji: "🧛", rarity: "superRare", hp: 500, atk: 90, range: 5, speed: 0.8, cost: 300, cooldown: 42, desc: "피를 빨아 회복", atkSpeed: 13 },
  // Uber
  { id: "g_dragon_cat", name: "드래곤냥", emoji: "🐲", rarity: "uber", hp: 900, atk: 150, range: 12, speed: 0.5, cost: 500, cooldown: 80, desc: "불을 뿜는 전설의 냥", atkSpeed: 18 },
  { id: "g_god_cat", name: "갓냥", emoji: "⚡", rarity: "uber", hp: 700, atk: 200, range: 15, speed: 0.3, cost: 600, cooldown: 90, desc: "번개를 내리치는 신", atkSpeed: 20 },
  { id: "g_dark", name: "다크냥", emoji: "🌑", rarity: "uber", hp: 1000, atk: 180, range: 8, speed: 0.6, cost: 550, cooldown: 85, desc: "어둠의 힘을 가진 냥", atkSpeed: 16 },
  { id: "g_ice", name: "아이스냥", emoji: "🧊", rarity: "uber", hp: 800, atk: 160, range: 10, speed: 0.4, cost: 520, cooldown: 80, desc: "적을 얼리는 냥", atkSpeed: 17 },
  // Legend
  { id: "g_ultimate", name: "궁극냥", emoji: "🌟", rarity: "legend", hp: 1500, atk: 300, range: 12, speed: 0.5, cost: 800, cooldown: 100, desc: "전설 중의 전설!", atkSpeed: 15 },
  { id: "g_galaxy", name: "은하냥", emoji: "🌌", rarity: "legend", hp: 1200, atk: 350, range: 15, speed: 0.4, cost: 900, cooldown: 110, desc: "우주의 힘을 가진 냥", atkSpeed: 18 },
];

const SINGLE_PULL_COST = 75;
const MULTI_PULL_COST = 675; // 10연차 = 9개 가격

function doGachaPull(): GachaCat {
  const roll = Math.random() * 100;
  let rarity: GachaRarity;
  if (roll < RARITY_INFO.legend.chance) rarity = "legend";
  else if (roll < RARITY_INFO.legend.chance + RARITY_INFO.uber.chance) rarity = "uber";
  else if (roll < RARITY_INFO.legend.chance + RARITY_INFO.uber.chance + RARITY_INFO.superRare.chance) rarity = "superRare";
  else rarity = "rare";

  const pool = GACHA_CATS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

const SAVE_KEY = "battlecats_save";

export default function BattleCatsPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [clearedStages, setClearedStages] = useState<number[]>([]);
  const [totalMoney, setTotalMoney] = useState(0);

  // Battle state
  const [money, setMoney] = useState(0);
  const [catBaseHp, setCatBaseHp] = useState(1000);
  const [catBaseMaxHp, setCatBaseMaxHp] = useState(1000);
  const [enemyBaseHp, setEnemyBaseHp] = useState(1000);
  const [enemyBaseMaxHp, setEnemyBaseMaxHp] = useState(1000);
  const [units, setUnits] = useState<Unit[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [tick, setTick] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1);

  // Gacha state
  const [catFood, setCatFood] = useState(0);
  const [ownedGachaCats, setOwnedGachaCats] = useState<string[]>([]);
  const [gachaResults, setGachaResults] = useState<GachaCat[]>([]);

  const nextUid = useRef(0);
  const spawnQueue = useRef<{ enemyId: string; spawnTick: number }[]>([]);
  const gameLoop = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save/Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setClearedStages(s.clearedStages || []);
        setTotalMoney(s.totalMoney || 0);
        setCatFood(s.catFood || 0);
        setOwnedGachaCats(s.ownedGachaCats || []);
      }
    } catch { /* ignore */ }
  }, []);

  const saveGame = useCallback((cleared: number[], tm: number, cf?: number, owned?: string[]) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      clearedStages: cleared,
      totalMoney: tm,
      catFood: cf ?? catFood,
      ownedGachaCats: owned ?? ownedGachaCats,
    }));
  }, [catFood, ownedGachaCats]);

  const startBattle = useCallback((stage: Stage) => {
    setCurrentStage(stage);
    setMoney(100);
    setCatBaseHp(1000 + clearedStages.length * 100);
    setCatBaseMaxHp(1000 + clearedStages.length * 100);
    setEnemyBaseHp(stage.baseHp);
    setEnemyBaseMaxHp(stage.baseHp);
    setUnits([]);
    setCooldowns({});
    setTick(0);
    nextUid.current = 0;
    setScreen("battle");

    // Build spawn queue
    const queue: { enemyId: string; spawnTick: number }[] = [];
    for (const wave of stage.waves) {
      for (let i = 0; i < wave.count; i++) {
        queue.push({ enemyId: wave.enemyId, spawnTick: wave.delay + i * wave.delay });
      }
    }
    queue.sort((a, b) => a.spawnTick - b.spawnTick);
    spawnQueue.current = queue;
  }, [clearedStages.length]);

  // Game loop
  useEffect(() => {
    if (screen !== "battle") {
      if (gameLoop.current) { clearInterval(gameLoop.current); gameLoop.current = null; }
      return;
    }

    gameLoop.current = setInterval(() => {
      setTick((t) => t + 1);
    }, Math.floor(100 / gameSpeed));

    return () => { if (gameLoop.current) clearInterval(gameLoop.current); };
  }, [screen, gameSpeed]);

  // Main game tick
  useEffect(() => {
    if (screen !== "battle" || !currentStage) return;

    // Money generation
    if (tick % 5 === 0) setMoney((m) => m + 30 + Math.floor(tick * 6 / 100));

    // Spawn enemies
    const toSpawn = spawnQueue.current.filter((s) => s.spawnTick === tick);
    if (toSpawn.length > 0) {
      const newEnemies: Unit[] = toSpawn.map((s) => {
        const et = ENEMY_TYPES.find((e) => e.id === s.enemyId)!;
        const scaledHp = Math.floor(et.hp * (1 + currentStage.id * 0.15));
        const scaledAtk = Math.floor(et.atk * (1 + currentStage.id * 0.1));
        return {
          uid: nextUid.current++,
          typeId: et.id,
          emoji: et.emoji,
          x: 95,
          hp: scaledHp,
          maxHp: scaledHp,
          atk: scaledAtk,
          range: et.range,
          speed: et.speed,
          atkSpeed: et.atkSpeed,
          atkTimer: 0,
          side: "enemy",
        };
      });
      setUnits((prev) => [...prev, ...newEnemies]);
    }

    // Update units
    setUnits((prev) => {
      const updated = prev.map((u) => ({ ...u }));
      const cats = updated.filter((u) => u.side === "cat" && u.hp > 0);
      const enemies = updated.filter((u) => u.side === "enemy" && u.hp > 0);

      // Move & attack
      for (const cat of cats) {
        const nearestEnemy = enemies.filter((e) => e.hp > 0).sort((a, b) => a.x - b.x)[0];
        const distToEnemy = nearestEnemy ? nearestEnemy.x - cat.x : 100;
        const distToBase = 95 - cat.x;

        if (distToEnemy <= cat.range || distToBase <= cat.range) {
          // Attack
          cat.atkTimer++;
          if (cat.atkTimer >= cat.atkSpeed) {
            cat.atkTimer = 0;
            if (nearestEnemy && distToEnemy <= cat.range) {
              nearestEnemy.hp -= cat.atk;
            } else if (distToBase <= cat.range) {
              setEnemyBaseHp((h) => Math.max(0, h - cat.atk));
            }
          }
        } else {
          cat.x += cat.speed * 0.3;
        }
      }

      for (const enemy of enemies) {
        const nearestCat = cats.filter((c) => c.hp > 0).sort((a, b) => b.x - a.x)[0];
        const distToCat = nearestCat ? enemy.x - nearestCat.x : 100;
        const distToBase = enemy.x - 5;

        if (distToCat <= enemy.range || distToBase <= enemy.range) {
          enemy.atkTimer++;
          if (enemy.atkTimer >= enemy.atkSpeed) {
            enemy.atkTimer = 0;
            if (nearestCat && distToCat <= enemy.range) {
              nearestCat.hp -= enemy.atk;
            } else if (distToBase <= enemy.range) {
              setCatBaseHp((h) => Math.max(0, h - enemy.atk));
            }
          }
        } else {
          enemy.x -= enemy.speed * 0.3;
        }
      }

      // Remove dead + grant money
      const alive: Unit[] = [];
      for (const u of updated) {
        if (u.hp > 0) {
          alive.push(u);
        } else if (u.side === "enemy") {
          const et = ENEMY_TYPES.find((e) => e.id === u.typeId);
          if (et) setMoney((m) => m + et.money);
        }
      }

      return alive;
    });

    // Cooldowns
    setCooldowns((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) { if (v > 1) next[k] = v - 1; }
      return next;
    });
  }, [tick, screen, currentStage]);

  // Win/Lose check
  useEffect(() => {
    if (screen !== "battle") return;
    if (enemyBaseHp <= 0) {
      if (gameLoop.current) clearInterval(gameLoop.current);
      setTimeout(() => {
        if (currentStage) {
          const foodReward = 30 + currentStage.id * 10;
          const newFood = catFood + foodReward;
          setCatFood(newFood);
          if (!clearedStages.includes(currentStage.id)) {
            const newCleared = [...clearedStages, currentStage.id];
            const newTotal = totalMoney + currentStage.reward;
            setClearedStages(newCleared);
            setTotalMoney(newTotal);
            saveGame(newCleared, newTotal, newFood);
          } else {
            saveGame(clearedStages, totalMoney, newFood);
          }
        }
        setScreen("victory");
      }, 500);
    }
    if (catBaseHp <= 0) {
      if (gameLoop.current) clearInterval(gameLoop.current);
      setTimeout(() => setScreen("defeat"), 500);
    }
  }, [enemyBaseHp, catBaseHp, screen, currentStage, clearedStages, totalMoney, catFood, saveGame]);

  const deployCat = useCallback((cat: CatType) => {
    if (money < cat.cost || (cooldowns[cat.id] ?? 0) > 0) return;
    setMoney((m) => m - cat.cost);
    setCooldowns((prev) => ({ ...prev, [cat.id]: cat.cooldown }));

    const scaledHp = Math.floor(cat.hp * (1 + clearedStages.length * 0.08));
    const scaledAtk = Math.floor(cat.atk * (1 + clearedStages.length * 0.06));

    const unit: Unit = {
      uid: nextUid.current++,
      typeId: cat.id,
      emoji: cat.emoji,
      x: 8,
      hp: scaledHp,
      maxHp: scaledHp,
      atk: scaledAtk,
      range: cat.range,
      speed: cat.speed,
      atkSpeed: cat.atkSpeed,
      atkTimer: 0,
      side: "cat",
    };
    setUnits((prev) => [...prev, unit]);
  }, [money, cooldowns, clearedStages.length]);

  const gachaCatsAsCatType: CatType[] = GACHA_CATS.filter((g) => ownedGachaCats.includes(g.id)).map((g) => ({
    ...g,
    unlockStage: 0,
  }));
  const availableCats = [...CAT_TYPES.filter((c) => c.unlockStage <= clearedStages.length), ...gachaCatsAsCatType];
  const catUnits = units.filter((u) => u.side === "cat");
  const enemyUnits = units.filter((u) => u.side === "enemy");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-100 via-green-50 to-amber-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-amber-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-amber-600 transition-colors hover:text-amber-800 dark:text-amber-400 dark:hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">냥코대전쟁</span>
            <span className="ml-1">🐱</span>
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400">클리어: {clearedStages.length}/{STAGES.length}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* === MENU === */}
        {screen === "menu" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 w-full max-w-md">
            <div className="text-center">
              <span className="text-[100px] leading-none">🐱</span>
              <h1 className="mt-2 text-4xl font-black">냥코대전쟁</h1>
              <p className="mt-1 text-amber-600 dark:text-amber-400">고양이 군단으로 적을 물리치자!</p>
            </div>

            <div className="grid grid-cols-5 gap-2 w-full">
              {CAT_TYPES.slice(0, 5).map((cat) => (
                <div key={cat.id} className="rounded-xl bg-white/60 dark:bg-slate-800/60 p-2 text-center border border-amber-200 dark:border-slate-700">
                  <span className="text-2xl">{cat.emoji}</span>
                  <p className="text-[9px] font-bold">{cat.name}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setScreen("stageSelect")} className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-4 text-lg font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              출격! ⚔️
            </button>
            <button onClick={() => setScreen("gacha")} className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-4 text-lg font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              🎰 캣 뽑기! ({catFood}🍗)
            </button>
            <Link href="/" className="block w-full rounded-full border-2 border-amber-300 bg-white/80 dark:bg-slate-800/80 py-3 text-center text-sm font-bold text-amber-600 dark:text-amber-400 transition-transform hover:scale-105 active:scale-95">
              🏠 소개페이지로
            </Link>

            {ownedGachaCats.length > 0 && (
              <div className="w-full rounded-2xl border border-purple-200 bg-purple-50/60 dark:border-purple-800 dark:bg-purple-950/30 p-4">
                <p className="mb-2 text-sm font-bold text-purple-600 dark:text-purple-400">보유 뽑기 냥 ({ownedGachaCats.length})</p>
                <div className="flex flex-wrap gap-2">
                  {GACHA_CATS.filter((g) => ownedGachaCats.includes(g.id)).map((g) => (
                    <div key={g.id} className={`rounded-lg border ${RARITY_INFO[g.rarity].border} bg-white/80 dark:bg-slate-800/80 px-2 py-1 text-center`}>
                      <span className="text-xl">{g.emoji}</span>
                      <p className="text-[8px] font-bold">{g.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === STAGE SELECT === */}
        {screen === "stageSelect" && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">🗺️ 스테이지 선택</h2>
              <button onClick={() => setScreen("menu")} className="text-sm text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-white">뒤로</button>
            </div>

            <div className="space-y-2">
              {STAGES.map((stage, i) => {
                const cleared = clearedStages.includes(stage.id);
                const locked = i > 0 && !clearedStages.includes(STAGES[i - 1].id);
                return (
                  <button
                    key={stage.id}
                    onClick={() => !locked && startBattle(stage)}
                    disabled={locked}
                    className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                      locked
                        ? "border-gray-300 bg-gray-100 opacity-50 dark:border-slate-800 dark:bg-slate-900"
                        : cleared
                        ? "border-green-300 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40"
                        : "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{locked ? "🔒" : stage.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">Stage {stage.id}: {stage.name}</p>
                          {cleared && <span className="text-xs font-bold text-green-500">⭐ 클리어</span>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          기지HP: {stage.baseHp} | 보상: +{stage.reward}
                          {locked && " | 이전 스테이지를 클리어하세요"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* === BATTLE === */}
        {screen === "battle" && currentStage && (
          <div className="w-full max-w-2xl space-y-2">
            {/* Stage info + money */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{currentStage.emoji} Stage {currentStage.id}</span>
              <div className="flex items-center gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold">💰 {money}</span>
                <button
                  onClick={() => setGameSpeed(gameSpeed === 1 ? 2 : 1)}
                  className="rounded-lg bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs font-bold"
                >
                  {gameSpeed === 1 ? "x1" : "x2"}
                </button>
              </div>
            </div>

            {/* Base HP bars */}
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="mb-0.5 flex justify-between text-[10px]">
                  <span className="text-blue-500 font-bold">🏠 아군 기지</span>
                  <span>{catBaseHp}/{catBaseMaxHp}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${(catBaseHp / catBaseMaxHp) * 100}%` }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-0.5 flex justify-between text-[10px]">
                  <span className="text-red-500 font-bold">🏴 적 기지</span>
                  <span>{enemyBaseHp}/{enemyBaseMaxHp}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all" style={{ width: `${(enemyBaseHp / enemyBaseMaxHp) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Battlefield */}
            <div className="relative h-40 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-green-200 via-green-100 to-red-100 dark:border-slate-700 dark:from-green-950 dark:via-slate-900 dark:to-red-950">
              {/* Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-green-400/30 to-red-400/30" />

              {/* Cat base */}
              <div className="absolute left-1 bottom-2 text-2xl">🏠</div>

              {/* Enemy base */}
              <div className="absolute right-1 bottom-2 text-2xl">🏴</div>

              {/* Units */}
              {units.map((u) => (
                <div
                  key={u.uid}
                  className="absolute bottom-3 transition-all duration-100"
                  style={{ left: `${u.x}%`, transform: `translateX(-50%) ${u.side === "enemy" ? "scaleX(-1)" : ""}` }}
                >
                  <div className="flex flex-col items-center">
                    {/* HP bar */}
                    <div className="mb-0.5 h-1 w-6 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-600">
                      <div
                        className={`h-full rounded-full ${u.side === "cat" ? "bg-blue-500" : "bg-red-500"}`}
                        style={{ width: `${(u.hp / u.maxHp) * 100}%` }}
                      />
                    </div>
                    <span className="text-lg leading-none drop-shadow">{u.emoji}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Unit count */}
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>🐱 아군: {catUnits.length}</span>
              <span>👾 적: {enemyUnits.length}</span>
            </div>

            {/* Cat deploy buttons */}
            <div className="grid grid-cols-5 gap-1.5">
              {availableCats.map((cat) => {
                const cd = cooldowns[cat.id] ?? 0;
                const canDeploy = money >= cat.cost && cd === 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => deployCat(cat)}
                    disabled={!canDeploy}
                    className={`rounded-xl border p-2 text-center transition-all active:scale-90 ${
                      canDeploy
                        ? "border-amber-300 bg-white hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        : "border-gray-200 bg-gray-100 opacity-40 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <p className="text-[9px] font-bold truncate">{cat.name}</p>
                    <p className="text-[8px] text-amber-600 dark:text-amber-400">💰{cat.cost}</p>
                    {cd > 0 && (
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${(cd / cat.cooldown) * 100}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Retreat */}
            <button onClick={() => setScreen("stageSelect")} className="w-full rounded-lg bg-slate-200 dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700">
              🏃 후퇴
            </button>
          </div>
        )}

        {/* === VICTORY === */}
        {screen === "victory" && currentStage && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-8xl">🎉</span>
            <h2 className="text-3xl font-black">승리!</h2>
            <p className="text-amber-600 dark:text-amber-400">{currentStage.emoji} Stage {currentStage.id} 클리어!</p>
            <p className="text-lg font-bold text-green-500">+{currentStage.reward} 보상!</p>
            <p className="text-sm font-bold text-orange-500">+{30 + currentStage.id * 10} 🍗 캣푸드!</p>

            {/* Unlocked cats */}
            {CAT_TYPES.filter((c) => c.unlockStage === clearedStages.length).length > 0 && (
              <div className="rounded-xl bg-amber-100 dark:bg-amber-950/40 p-4 text-center">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">새로운 냥 해금!</p>
                {CAT_TYPES.filter((c) => c.unlockStage === clearedStages.length).map((c) => (
                  <div key={c.id} className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-2xl">{c.emoji}</span>
                    <span className="font-bold">{c.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setScreen("stageSelect")} className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                다음 스테이지 🗺️
              </button>
            </div>
          </div>
        )}

        {/* === GACHA === */}
        {screen === "gacha" && (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">🎰 뽑기</h2>
              <button onClick={() => setScreen("menu")} className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-white">뒤로</button>
            </div>

            <div className="text-center rounded-2xl border border-purple-300 bg-gradient-to-b from-purple-100 to-pink-100 dark:border-purple-800 dark:from-purple-950/60 dark:to-pink-950/60 p-6 space-y-4">
              <div className="text-6xl animate-bounce">🎰</div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">캣 뽑기!</p>
              <p className="text-lg font-bold">보유: <span className="text-orange-500">{catFood}</span> 🍗</p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    if (catFood < SINGLE_PULL_COST) return;
                    const result = doGachaPull();
                    const newFood = catFood - SINGLE_PULL_COST;
                    setCatFood(newFood);
                    setGachaResults([result]);
                    if (!ownedGachaCats.includes(result.id)) {
                      const newOwned = [...ownedGachaCats, result.id];
                      setOwnedGachaCats(newOwned);
                      saveGame(clearedStages, totalMoney, newFood, newOwned);
                    } else {
                      saveGame(clearedStages, totalMoney, newFood);
                    }
                    setScreen("gachaResult");
                  }}
                  disabled={catFood < SINGLE_PULL_COST}
                  className={`rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                    catFood >= SINGLE_PULL_COST
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : "bg-gray-400 opacity-50"
                  }`}
                >
                  1회 뽑기<br /><span className="text-xs">{SINGLE_PULL_COST} 🍗</span>
                </button>
                <button
                  onClick={() => {
                    if (catFood < MULTI_PULL_COST) return;
                    const results: GachaCat[] = [];
                    for (let i = 0; i < 10; i++) results.push(doGachaPull());
                    const newFood = catFood - MULTI_PULL_COST;
                    setCatFood(newFood);
                    setGachaResults(results);
                    const newIds = results.map((r) => r.id).filter((id) => !ownedGachaCats.includes(id));
                    const uniqueNew = [...new Set(newIds)];
                    if (uniqueNew.length > 0) {
                      const newOwned = [...ownedGachaCats, ...uniqueNew];
                      setOwnedGachaCats(newOwned);
                      saveGame(clearedStages, totalMoney, newFood, newOwned);
                    } else {
                      saveGame(clearedStages, totalMoney, newFood);
                    }
                    setScreen("gachaResult");
                  }}
                  disabled={catFood < MULTI_PULL_COST}
                  className={`rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                    catFood >= MULTI_PULL_COST
                      ? "bg-gradient-to-r from-yellow-500 to-red-500"
                      : "bg-gray-400 opacity-50"
                  }`}
                >
                  10연차!<br /><span className="text-xs">{MULTI_PULL_COST} 🍗</span>
                </button>
              </div>
            </div>

            {/* Rates */}
            <div className="rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 p-4">
              <p className="mb-2 text-sm font-bold text-slate-600 dark:text-slate-400">📊 확률표</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(RARITY_INFO) as [GachaRarity, typeof RARITY_INFO[GachaRarity]][]).map(([key, info]) => (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border ${info.border} px-3 py-2`}>
                    <span className={`text-xs font-bold ${info.color}`}>{info.name}</span>
                    <span className="ml-auto text-xs font-bold">{info.chance}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* All gacha cats */}
            <div className="rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 p-4">
              <p className="mb-2 text-sm font-bold text-slate-600 dark:text-slate-400">🐱 뽑기 도감</p>
              <div className="grid grid-cols-2 gap-2">
                {GACHA_CATS.map((g) => {
                  const owned = ownedGachaCats.includes(g.id);
                  const ri = RARITY_INFO[g.rarity];
                  return (
                    <div key={g.id} className={`rounded-xl border ${owned ? ri.border : "border-slate-300 dark:border-slate-700"} p-2 ${owned ? "bg-white dark:bg-slate-800" : "bg-slate-100 dark:bg-slate-900 opacity-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{owned ? g.emoji : "❓"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{owned ? g.name : "???"}</p>
                          <p className={`text-[9px] font-bold ${ri.color}`}>{ri.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* === GACHA RESULT === */}
        {screen === "gachaResult" && gachaResults.length > 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 w-full max-w-md">
            <h2 className="text-2xl font-black">
              {gachaResults.length === 1 ? "🎊 뽑기 결과!" : "🎊 10연차 결과!"}
            </h2>

            <div className={`grid ${gachaResults.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5"} gap-3 w-full`}>
              {gachaResults.map((cat, i) => {
                const ri = RARITY_INFO[cat.rarity];
                const isNew = !ownedGachaCats.includes(cat.id) || gachaResults.filter((r) => r.id === cat.id).indexOf(cat) === gachaResults.indexOf(cat) && ownedGachaCats.filter((id) => id === cat.id).length === 0;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border-2 ${ri.border} bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-3 text-center shadow-lg animate-fade-in-up`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className={`mb-1 rounded-lg ${ri.bg} py-1 text-[9px] font-bold text-white`}>
                      {ri.name}
                    </div>
                    <span className={`text-${gachaResults.length === 1 ? "6xl" : "3xl"}`}>{cat.emoji}</span>
                    <p className="mt-1 text-xs font-black">{cat.name}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">{cat.desc}</p>
                    {gachaResults.length === 1 && (
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                        <span>❤️ {cat.hp}</span>
                        <span>⚔️ {cat.atk}</span>
                        <span>📏 {cat.range}</span>
                        <span>💰 {cat.cost}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setScreen("gacha")} className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                다시 뽑기! 🎰
              </button>
              <button onClick={() => setScreen("menu")} className="rounded-full bg-slate-300 dark:bg-slate-700 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                메뉴로
              </button>
            </div>
          </div>
        )}

        {/* === DEFEAT === */}
        {screen === "defeat" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-8xl">💀</span>
            <h2 className="text-3xl font-black">패배...</h2>
            <p className="text-red-500">기지가 파괴되었습니다!</p>
            <div className="flex gap-3">
              {currentStage && (
                <button onClick={() => startBattle(currentStage)} className="rounded-full bg-gradient-to-r from-red-400 to-rose-500 px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                  다시 도전! 🔄
                </button>
              )}
              <button onClick={() => setScreen("stageSelect")} className="rounded-full bg-slate-300 dark:bg-slate-700 px-6 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
                돌아가기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
