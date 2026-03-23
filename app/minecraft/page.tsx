"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Screen = "hub" | "mining" | "battle" | "crafting" | "inventory" | "victory" | "defeat";

type ToolTier = "wood" | "stone" | "iron" | "diamond" | "netherite";

interface ToolData {
  tier: ToolTier;
  name: string;
  emoji: string;
  miningPower: number;
  attackPower: number;
  unlockLevel: number;
  cost: number;
}

interface Resource {
  id: string;
  name: string;
  emoji: string;
  xp: number;
  value: number;
  minTier: ToolTier;
  weight: number;
}

interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  xpReward: number;
  emeraldReward: number;
  minLevel: number;
  isBoss: boolean;
}

interface CraftItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  type: "food" | "potion" | "combat";
}

interface SaveData {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  hunger: number;
  emeralds: number;
  toolTier: ToolTier;
  inventory: Record<string, number>;
  items: Record<string, number>;
  kills: number;
  timestamp: number;
}

interface OfflineReward {
  minutes: number;
  xpGained: number;
  emeraldsGained: number;
}

// --- Constants ---
const SAVE_KEY = "minecraft_save";
const MAX_OFFLINE_MIN = 480;

const TIER_ORDER: ToolTier[] = ["wood", "stone", "iron", "diamond", "netherite"];

const TOOLS: ToolData[] = [
  { tier: "wood", name: "나무", emoji: "🪵", miningPower: 1, attackPower: 5, unlockLevel: 1, cost: 0 },
  { tier: "stone", name: "돌", emoji: "🪨", miningPower: 3, attackPower: 12, unlockLevel: 5, cost: 30 },
  { tier: "iron", name: "철", emoji: "🔩", miningPower: 7, attackPower: 25, unlockLevel: 12, cost: 100 },
  { tier: "diamond", name: "다이아", emoji: "💎", miningPower: 15, attackPower: 50, unlockLevel: 22, cost: 350 },
  { tier: "netherite", name: "네더라이트", emoji: "🟤", miningPower: 30, attackPower: 100, unlockLevel: 38, cost: 1000 },
];

const RESOURCES: Resource[] = [
  { id: "dirt", name: "흙", emoji: "🟫", xp: 1, value: 1, minTier: "wood", weight: 30 },
  { id: "stone", name: "돌", emoji: "🪨", xp: 2, value: 2, minTier: "wood", weight: 30 },
  { id: "coal", name: "석탄", emoji: "⬛", xp: 5, value: 5, minTier: "wood", weight: 20 },
  { id: "iron", name: "철광석", emoji: "🔩", xp: 10, value: 10, minTier: "stone", weight: 12 },
  { id: "gold", name: "금광석", emoji: "🥇", xp: 20, value: 25, minTier: "iron", weight: 6 },
  { id: "diamond", name: "다이아몬드", emoji: "💎", xp: 50, value: 50, minTier: "iron", weight: 3 },
  { id: "emerald", name: "에메랄드", emoji: "💚", xp: 80, value: 100, minTier: "diamond", weight: 2 },
  { id: "netherite", name: "네더라이트 파편", emoji: "🟤", xp: 150, value: 200, minTier: "diamond", weight: 1 },
];

const MONSTERS: Monster[] = [
  { id: "zombie", name: "좀비", emoji: "🧟", hp: 40, attack: 5, xpReward: 10, emeraldReward: 5, minLevel: 1, isBoss: false },
  { id: "skeleton", name: "스켈레톤", emoji: "💀", hp: 35, attack: 8, xpReward: 15, emeraldReward: 8, minLevel: 1, isBoss: false },
  { id: "spider", name: "거미", emoji: "🕷️", hp: 30, attack: 6, xpReward: 12, emeraldReward: 6, minLevel: 1, isBoss: false },
  { id: "creeper", name: "크리퍼", emoji: "💥", hp: 40, attack: 20, xpReward: 25, emeraldReward: 15, minLevel: 1, isBoss: false },
  { id: "enderman", name: "엔더맨", emoji: "🟪", hp: 80, attack: 15, xpReward: 40, emeraldReward: 25, minLevel: 10, isBoss: false },
  { id: "witch", name: "마녀", emoji: "🧙", hp: 60, attack: 12, xpReward: 35, emeraldReward: 20, minLevel: 15, isBoss: false },
  { id: "blaze", name: "블레이즈", emoji: "🔥", hp: 100, attack: 20, xpReward: 60, emeraldReward: 40, minLevel: 20, isBoss: false },
  { id: "wither_skeleton", name: "위더스켈레톤", emoji: "🖤", hp: 150, attack: 25, xpReward: 80, emeraldReward: 50, minLevel: 28, isBoss: false },
  { id: "guardian", name: "가디언", emoji: "🐡", hp: 200, attack: 30, xpReward: 100, emeraldReward: 70, minLevel: 35, isBoss: false },
  { id: "ender_dragon", name: "엔더드래곤", emoji: "🐲", hp: 500, attack: 50, xpReward: 300, emeraldReward: 200, minLevel: 40, isBoss: true },
  { id: "wither", name: "위더", emoji: "☠️", hp: 600, attack: 60, xpReward: 400, emeraldReward: 300, minLevel: 50, isBoss: true },
  { id: "warden", name: "워든", emoji: "🗿", hp: 1000, attack: 80, xpReward: 600, emeraldReward: 500, minLevel: 60, isBoss: true },
];

const CRAFT_ITEMS: CraftItem[] = [
  { id: "steak", name: "스테이크", emoji: "🍖", desc: "배고픔 +30", cost: 10, type: "food" },
  { id: "golden_apple", name: "황금사과", emoji: "🍎", desc: "배고픔 +50, HP +20", cost: 25, type: "food" },
  { id: "heal_potion", name: "치유물약", emoji: "🧪", desc: "HP +50", cost: 20, type: "potion" },
  { id: "shield", name: "방패", emoji: "🛡️", desc: "다음 피해 50% 감소", cost: 30, type: "combat" },
  { id: "strength_potion", name: "힘의물약", emoji: "⚗️", desc: "다음 공격 2배", cost: 40, type: "combat" },
  { id: "bow", name: "활", emoji: "🏹", desc: "원거리 공격 (40 데미지)", cost: 50, type: "combat" },
  { id: "lava_bucket", name: "용암양동이", emoji: "🪣", desc: "적에게 80 데미지", cost: 60, type: "combat" },
  { id: "totem", name: "불사의 토템", emoji: "🪬", desc: "사망 시 HP 30% 부활", cost: 150, type: "combat" },
];

function xpForLevel(lv: number): number {
  return Math.floor(30 * Math.pow(1.2, lv - 1));
}

function getAvailableResources(tier: ToolTier): Resource[] {
  const tierIdx = TIER_ORDER.indexOf(tier);
  return RESOURCES.filter((r) => TIER_ORDER.indexOf(r.minTier) <= tierIdx);
}

function pickResource(tier: ToolTier): Resource {
  const available = getAvailableResources(tier);
  const totalWeight = available.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const r of available) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return available[0];
}

function getDayIcon(dayTime: number): string {
  if (dayTime < 10) return "🌅";
  if (dayTime < 30) return "☀️";
  if (dayTime < 38) return "🌇";
  if (dayTime < 45) return "🌙";
  return "🌑";
}

function getDayLabel(dayTime: number): string {
  if (dayTime < 38) return "낮";
  return "밤";
}

export default function MinecraftPage() {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [hunger, setHunger] = useState(100);
  const [emeralds, setEmeralds] = useState(0);
  const [toolTier, setToolTier] = useState<ToolTier>("wood");
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [items, setItems] = useState<Record<string, number>>({});
  const [kills, setKills] = useState(0);

  const [screen, setScreen] = useState<Screen>("hub");
  const [enemy, setEnemy] = useState<Monster | null>(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [atkAnim, setAtkAnim] = useState<string | null>(null);
  const [enemyAtkAnim, setEnemyAtkAnim] = useState(false);
  const [mineAnim, setMineAnim] = useState<string | null>(null);

  const [dayTime, setDayTime] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [strengthActive, setStrengthActive] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);

  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isNight = dayTime >= 38;
  const tool = TOOLS.find((t) => t.tier === toolTier)!;
  const xpNeeded = xpForLevel(level);
  const nextTool = TOOLS[TIER_ORDER.indexOf(toolTier) + 1] || null;

  const availableMonsters = MONSTERS.filter((m) => m.minLevel <= level && (!m.isBoss || level >= m.minLevel));

  // --- Level up ---
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp((p) => p - xpNeeded);
      setLevel((p) => p + 1);
      const newMaxHp = 100 + level * 12;
      setMaxHp(newMaxHp);
      setHp(newMaxHp);
      setHunger(100);
      setLog((p) => [`🎉 레벨 업! Lv.${level + 1}!`, ...p.slice(0, 4)]);
    }
  }, [xp, xpNeeded, level]);

  // --- Day/Night cycle ---
  useEffect(() => {
    const t = setInterval(() => {
      setDayTime((p) => (p + 1) % 60);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- Cooldown timer ---
  useEffect(() => {
    cdTimer.current = setInterval(() => {
      setCooldowns((p) => {
        const n: Record<string, number> = {};
        for (const [k, v] of Object.entries(p)) { if (v > 1) n[k] = v - 1; }
        return n;
      });
    }, 1000);
    return () => { if (cdTimer.current) clearInterval(cdTimer.current); };
  }, []);

  // --- Hub regen ---
  useEffect(() => {
    if (screen !== "hub") return;
    const t = setInterval(() => {
      setHp((p) => Math.min(p + 3, maxHp));
      setHunger((p) => Math.min(p + 1, 100));
    }, 1000);
    return () => clearInterval(t);
  }, [screen, maxHp]);

  // --- Save/Load ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { setLoaded(true); return; }
      const s: SaveData = JSON.parse(raw);
      setLevel(s.level); setXp(s.xp);
      setMaxHp(s.maxHp); setHp(Math.min(s.hp, s.maxHp));
      setHunger(s.hunger); setEmeralds(s.emeralds);
      setToolTier(s.toolTier); setInventory(s.inventory);
      setItems(s.items || {}); setKills(s.kills);
      const diffMin = Math.min(Math.floor((Date.now() - s.timestamp) / 60000), MAX_OFFLINE_MIN);
      if (diffMin >= 1) {
        const xpPer = Math.floor(2 + s.level * 0.5);
        const emPer = Math.floor(1 + s.level * 0.3);
        const xpGained = xpPer * diffMin;
        const emeraldsGained = emPer * diffMin;
        setXp((p) => p + xpGained);
        setEmeralds((p) => p + emeraldsGained);
        setHp(s.maxHp); setHunger(100);
        setOfflineReward({ minutes: diffMin, xpGained, emeraldsGained });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: SaveData = { level, xp, hp, maxHp, hunger, emeralds, toolTier, inventory, items, kills, timestamp: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, level, xp, hp, maxHp, hunger, emeralds, toolTier, inventory, items, kills]);

  // --- Mining ---
  const mine = useCallback(() => {
    if (hunger <= 0) return;
    const res = pickResource(toolTier);
    const qty = 1 + Math.floor(tool.miningPower / 5);
    setInventory((p) => ({ ...p, [res.id]: (p[res.id] || 0) + qty }));
    setXp((p) => p + res.xp * qty);
    setHunger((p) => Math.max(0, p - 2));
    setMineAnim(res.emoji);
    setTimeout(() => setMineAnim(null), 500);
    setLog((p) => [`⛏️ ${res.emoji} ${res.name} x${qty} 채굴! +${res.xp * qty}XP`, ...p.slice(0, 4)]);
  }, [toolTier, tool.miningPower, hunger]);

  // --- Sell resources ---
  const sellAll = () => {
    let total = 0;
    const newInv = { ...inventory };
    for (const res of RESOURCES) {
      const qty = newInv[res.id] || 0;
      if (qty > 0) {
        total += qty * res.value;
        delete newInv[res.id];
      }
    }
    if (total === 0) return;
    setInventory(newInv);
    setEmeralds((p) => p + total);
    setLog((p) => [`💰 자원 판매! +${total} 에메랄드`, ...p.slice(0, 4)]);
  };

  // --- Battle ---
  const startBattle = (monster: Monster) => {
    if (hunger <= 0 || hp <= 0) return;
    setEnemy(monster);
    setEnemyHp(monster.hp);
    setScreen("battle");
    setLog([`⚔️ ${monster.emoji} ${monster.name} 출현!${monster.isBoss ? " 🔥보스전!" : ""}`]);
  };

  const attackEnemy = useCallback(() => {
    if (!enemy || hp <= 0) return;
    let dmg = Math.floor(tool.attackPower * (0.85 + Math.random() * 0.3) + level * 1.5);
    const isCrit = Math.random() < 0.12;
    if (strengthActive) { dmg *= 2; setStrengthActive(false); }
    if (isCrit) dmg = Math.floor(dmg * 1.8);

    setAtkAnim("⚔️");
    setTimeout(() => setAtkAnim(null), 500);
    setHunger((p) => Math.max(0, p - 3));

    const newEhp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEhp);
    setLog((p) => [`⚔️ ${dmg} 데미지!${isCrit ? " 💥크리티컬!" : ""}${strengthActive ? " ⚗️힘 2배!" : ""}`, ...p.slice(0, 4)]);

    if (newEhp <= 0) {
      setXp((p) => p + enemy.xpReward);
      setEmeralds((p) => p + enemy.emeraldReward);
      setKills((p) => p + 1);
      setScreen("victory");
      setLog((p) => [`🎉 ${enemy.emoji} ${enemy.name} 처치! +${enemy.xpReward}XP +${enemy.emeraldReward}💎`, ...p.slice(0, 4)]);
      return;
    }

    // Enemy counter-attack
    setTimeout(() => {
      let eDmg = Math.floor(enemy.attack * (0.8 + Math.random() * 0.4));
      if (shieldActive) { eDmg = Math.floor(eDmg * 0.5); setShieldActive(false); }

      setEnemyAtkAnim(true);
      setTimeout(() => setEnemyAtkAnim(false), 400);

      setHp((p) => {
        let newHp = Math.max(0, p - eDmg);
        if (newHp <= 0) {
          // Check totem
          const totemCount = items["totem"] || 0;
          if (totemCount > 0) {
            setItems((prev) => ({ ...prev, totem: prev["totem"] - 1 }));
            newHp = Math.floor(maxHp * 0.3);
            setLog((pp) => [`🪬 불사의 토템 발동! HP ${newHp} 부활!`, ...pp.slice(0, 4)]);
          } else {
            setScreen("defeat");
            setLog((pp) => [`💀 ${enemy.name}에게 패배...`, ...pp.slice(0, 4)]);
          }
        } else {
          setLog((pp) => [`${enemy.emoji} 적 공격! ${eDmg} 데미지!${shieldActive ? " 🛡️방패!" : ""}`, ...pp.slice(0, 4)]);
        }
        return newHp;
      });
    }, 700);
  }, [enemy, enemyHp, hp, tool.attackPower, level, strengthActive, shieldActive, items, maxHp]);

  const useBattleItem = useCallback((itemId: string) => {
    const count = items[itemId] || 0;
    if (count <= 0 || (cooldowns[itemId] ?? 0) > 0) return;
    setItems((p) => ({ ...p, [itemId]: p[itemId] - 1 }));

    if (itemId === "heal_potion") {
      setHp((p) => Math.min(p + 50 + level * 2, maxHp));
      setCooldowns((p) => ({ ...p, heal_potion: 3 }));
      setLog((p) => [`🧪 치유물약! HP +${50 + level * 2}`, ...p.slice(0, 4)]);
    } else if (itemId === "shield") {
      setShieldActive(true);
      setCooldowns((p) => ({ ...p, shield: 5 }));
      setLog((p) => ["🛡️ 방패 활성화! 다음 피해 50% 감소!", ...p.slice(0, 4)]);
    } else if (itemId === "strength_potion") {
      setStrengthActive(true);
      setCooldowns((p) => ({ ...p, strength_potion: 5 }));
      setLog((p) => ["⚗️ 힘의물약! 다음 공격 2배!", ...p.slice(0, 4)]);
    } else if (itemId === "bow") {
      if (!enemy) return;
      const dmg = 40 + level * 2;
      const newEhp = Math.max(0, enemyHp - dmg);
      setEnemyHp(newEhp);
      setCooldowns((p) => ({ ...p, bow: 4 }));
      setAtkAnim("🏹");
      setTimeout(() => setAtkAnim(null), 500);
      setLog((p) => [`🏹 활 공격! ${dmg} 데미지!`, ...p.slice(0, 4)]);
      if (newEhp <= 0 && enemy) {
        setXp((p) => p + enemy.xpReward);
        setEmeralds((p) => p + enemy.emeraldReward);
        setKills((p) => p + 1);
        setScreen("victory");
      }
    } else if (itemId === "lava_bucket") {
      if (!enemy) return;
      const dmg = 80 + level * 3;
      const newEhp = Math.max(0, enemyHp - dmg);
      setEnemyHp(newEhp);
      setCooldowns((p) => ({ ...p, lava_bucket: 6 }));
      setAtkAnim("🪣");
      setTimeout(() => setAtkAnim(null), 500);
      setLog((p) => [`🪣 용암양동이! ${dmg} 데미지!`, ...p.slice(0, 4)]);
      if (newEhp <= 0 && enemy) {
        setXp((p) => p + enemy.xpReward);
        setEmeralds((p) => p + enemy.emeraldReward);
        setKills((p) => p + 1);
        setScreen("victory");
      }
    } else if (itemId === "steak") {
      setHunger((p) => Math.min(p + 30, 100));
      setLog((p) => ["🍖 스테이크! 배고픔 +30", ...p.slice(0, 4)]);
    } else if (itemId === "golden_apple") {
      setHunger((p) => Math.min(p + 50, 100));
      setHp((p) => Math.min(p + 20, maxHp));
      setLog((p) => ["🍎 황금사과! 배고픔 +50, HP +20", ...p.slice(0, 4)]);
    }
  }, [items, cooldowns, enemy, enemyHp, level, maxHp]);

  const craftItem = (item: CraftItem) => {
    if (emeralds < item.cost) return;
    setEmeralds((p) => p - item.cost);
    setItems((p) => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }));
    setLog((p) => [`🔨 ${item.emoji} ${item.name} 제작! -${item.cost}💎`, ...p.slice(0, 4)]);
  };

  const upgradeTool = () => {
    if (!nextTool || level < nextTool.unlockLevel || emeralds < nextTool.cost) return;
    setEmeralds((p) => p - nextTool.cost);
    setToolTier(nextTool.tier);
    setLog((p) => [`⬆️ ${nextTool.emoji} ${nextTool.name} 도구 업그레이드!`, ...p.slice(0, 4)]);
  };

  const toHub = () => {
    setScreen("hub");
    setEnemy(null);
    setShieldActive(false);
    setStrengthActive(false);
    if (hp <= 0) { setHp(Math.floor(maxHp * 0.3)); setHunger(30); }
  };

  const totalResources = Object.values(inventory).reduce((s, v) => s + v, 0);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-950 via-emerald-950 to-stone-950 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-green-800 bg-green-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-green-300 transition-colors hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">마인크래프트</span>
            <span className="ml-1">⛏️</span>
          </span>
          <button onClick={() => setScreen(screen === "inventory" ? "hub" : "inventory")} className="text-sm text-green-300 hover:text-white">
            📦 인벤토리
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* Stats */}
        <div className="mb-4 w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">{tool.emoji} Lv.{level} 서바이버</span>
            <span className="text-emerald-400">💎 {emeralds.toLocaleString()}</span>
          </div>
          <div className="mb-1 flex items-center gap-1 text-xs text-green-300">
            <span>처치: {kills}회</span>
            <span className="ml-2">{getDayIcon(dayTime)} {getDayLabel(dayTime)} ({dayTime}/60)</span>
          </div>
          {/* HP */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-red-400">HP</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{hp}/{maxHp}</span>
          </div>
          {/* Hunger */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-orange-400">🍖</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all" style={{ width: `${hunger}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{hunger}/100</span>
          </div>
          {/* XP */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-green-400">XP</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{xp}/{xpNeeded}</span>
          </div>
        </div>

        {/* Day/Night indicator */}
        <div className="mb-4 w-full max-w-lg">
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isNight ? "bg-gradient-to-r from-indigo-700 to-purple-800" : "bg-gradient-to-r from-yellow-400 to-sky-400"}`}
              style={{ width: `${(dayTime / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* === HUB === */}
        {screen === "hub" && (
          <div className="w-full max-w-lg space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setScreen("mining")} className="rounded-2xl border border-amber-700 bg-amber-900/40 p-4 text-center transition-all hover:bg-amber-800/40 active:scale-95">
                <span className="text-3xl">⛏️</span>
                <p className="mt-1 text-sm font-bold">채굴하기</p>
                <p className="text-[10px] text-amber-300">{tool.emoji} {tool.name} 도구</p>
              </button>
              <button onClick={() => setScreen("crafting")} className="rounded-2xl border border-emerald-700 bg-emerald-900/40 p-4 text-center transition-all hover:bg-emerald-800/40 active:scale-95">
                <span className="text-3xl">🔨</span>
                <p className="mt-1 text-sm font-bold">크래프팅</p>
                <p className="text-[10px] text-emerald-300">아이템 제작</p>
              </button>
            </div>

            {/* Tool upgrade */}
            {nextTool && (
              <button
                onClick={upgradeTool}
                disabled={level < nextTool.unlockLevel || emeralds < nextTool.cost}
                className="w-full rounded-2xl border border-cyan-700 bg-cyan-900/30 p-3 text-center transition-all hover:bg-cyan-800/40 active:scale-95 disabled:opacity-40"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">{nextTool.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{nextTool.name} 도구 업그레이드</p>
                    <p className="text-[10px] text-cyan-300">
                      💎 {nextTool.cost} | Lv.{nextTool.unlockLevel} 필요
                      {level < nextTool.unlockLevel && <span className="ml-1 text-red-400">(레벨 부족)</span>}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Sell button */}
            {totalResources > 0 && (
              <button onClick={sellAll} className="w-full rounded-xl border border-yellow-700 bg-yellow-900/30 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-800/40 active:scale-95">
                💰 자원 전부 판매 (📦 {totalResources}개)
              </button>
            )}

            {/* Monster list */}
            {isNight && (
              <div>
                <h3 className="mb-2 text-center text-sm font-bold text-red-300">🌙 밤이다! 몬스터 출현!</h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableMonsters.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => startBattle(m)}
                      disabled={hp <= 0 || hunger <= 0}
                      className="rounded-xl border border-red-800 bg-red-900/30 p-3 text-left transition-all hover:bg-red-800/40 active:scale-95 disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{m.name} {m.isBoss && "👑"}</p>
                          <p className="text-[10px] text-red-300">HP:{m.hp} ATK:{m.attack}</p>
                          <p className="text-[10px] text-yellow-400">+{m.xpReward}XP +{m.emeraldReward}💎</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isNight && (
              <div className="rounded-xl bg-sky-900/30 p-4 text-center text-sm text-sky-300">
                ☀️ 낮에는 안전합니다! 채굴에 집중하세요!
              </div>
            )}

            {log.length > 0 && (
              <div className="rounded-xl bg-slate-800/60 p-3">
                <p className="mb-1 text-xs font-bold text-slate-400">기록</p>
                {log.slice(0, 5).map((l, i) => <p key={i} className="text-xs text-slate-300">{l}</p>)}
              </div>
            )}

            <Link href="/" className="block w-full rounded-xl border border-green-700 bg-green-900/40 py-3 text-center text-sm font-bold text-green-300 transition-all hover:bg-green-800/40 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* === MINING === */}
        {screen === "mining" && (
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center">
              <p className="mb-1 text-sm text-green-300">{tool.emoji} {tool.name} 곡괭이 (채굴력: {tool.miningPower})</p>
              {hunger <= 0 && <p className="text-sm text-red-400">🍖 배고파서 채굴할 수 없어요! 음식을 드세요!</p>}
            </div>

            <button
              onClick={mine}
              disabled={hunger <= 0}
              className="relative w-full overflow-hidden rounded-3xl border-4 border-dashed border-stone-600 bg-gradient-to-b from-stone-700 to-stone-900 transition-all hover:border-amber-500 active:scale-[0.97] disabled:opacity-40"
              style={{ minHeight: 280 }}
            >
              {/* Underground visuals */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl drop-shadow-lg" style={{ animation: "float 2s ease-in-out infinite" }}>⛏️</span>
                <p className="mt-4 text-lg font-black text-amber-200/90">클릭해서 채굴하세요!</p>
              </div>
              {/* Ore decorations */}
              <span className="absolute left-[10%] top-[20%] text-2xl opacity-30">⬛</span>
              <span className="absolute right-[15%] top-[30%] text-xl opacity-20">🔩</span>
              <span className="absolute left-[25%] bottom-[25%] text-lg opacity-25">💎</span>
              <span className="absolute right-[20%] bottom-[15%] text-xl opacity-20">🥇</span>
              <span className="absolute left-[50%] top-[15%] text-lg opacity-15">💚</span>
              {/* Mine animation */}
              {mineAnim && (
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl" style={{ animation: "atkUp 0.5s ease-out forwards" }}>
                  {mineAnim}
                </span>
              )}
            </button>

            {/* Quick food use */}
            {(items["steak"] || 0) > 0 && hunger < 50 && (
              <button onClick={() => useBattleItem("steak")} className="w-full rounded-xl bg-orange-900/40 py-2 text-sm font-bold text-orange-300 hover:bg-orange-800/40">
                🍖 스테이크 먹기 ({items["steak"]}개)
              </button>
            )}
            {(items["golden_apple"] || 0) > 0 && hunger < 50 && (
              <button onClick={() => useBattleItem("golden_apple")} className="w-full rounded-xl bg-yellow-900/40 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-800/40">
                🍎 황금사과 먹기 ({items["golden_apple"]}개)
              </button>
            )}

            <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-slate-700 py-2 text-sm font-bold hover:bg-slate-600">🏠 돌아가기</button>

            {log.length > 0 && (
              <div className="rounded-xl bg-slate-800/60 p-3">
                {log.slice(0, 5).map((l, i) => <p key={i} className="text-xs text-slate-300">{l}</p>)}
              </div>
            )}
          </div>
        )}

        {/* === BATTLE === */}
        {screen === "battle" && enemy && (
          <div className="w-full max-w-lg space-y-3">
            {/* Enemy */}
            <div className="rounded-2xl bg-red-900/30 p-4 text-center">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold">{enemy.emoji} {enemy.name} {enemy.isBoss && "👑"}</span>
                <span className="text-xs text-red-300">ATK: {enemy.attack}</span>
              </div>
              <div className="mb-1 h-4 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 transition-all" style={{ width: `${(enemyHp / enemy.hp) * 100}%` }} />
              </div>
              <p className="mb-2 text-xs">HP: {enemyHp}/{enemy.hp}</p>
              <span className={`inline-block text-6xl transition-transform ${enemyAtkAnim ? "scale-125" : ""}`} style={{ animation: enemyAtkAnim ? "shake 0.3s" : "float 2s ease-in-out infinite" }}>
                {enemy.emoji}
              </span>
              {atkAnim && <div className="mt-2 text-4xl" style={{ animation: "atkUp 0.6s ease-out forwards" }}>{atkAnim}</div>}
            </div>

            {/* Buffs */}
            {(shieldActive || strengthActive) && (
              <div className="flex gap-2 justify-center text-xs">
                {shieldActive && <span className="rounded-full bg-blue-800/60 px-3 py-1">🛡️ 방패 활성</span>}
                {strengthActive && <span className="rounded-full bg-red-800/60 px-3 py-1">⚗️ 힘 2배</span>}
              </div>
            )}

            {/* Attack button */}
            <button
              onClick={attackEnemy}
              disabled={hp <= 0}
              className="w-full rounded-2xl border border-red-600 bg-red-900/40 p-4 text-center transition-all hover:bg-red-800/40 active:scale-95 disabled:opacity-40"
            >
              <span className="text-2xl">⚔️</span>
              <p className="text-sm font-bold">공격! ({tool.emoji} {tool.attackPower + Math.floor(level * 1.5)} DMG)</p>
            </button>

            {/* Battle items */}
            <div className="grid grid-cols-4 gap-2">
              {(["heal_potion", "shield", "strength_potion", "bow", "lava_bucket", "steak", "golden_apple"] as string[]).map((id) => {
                const count = items[id] || 0;
                const item = CRAFT_ITEMS.find((c) => c.id === id);
                if (!item || count <= 0) return null;
                const cd = cooldowns[id] ?? 0;
                return (
                  <button
                    key={id}
                    onClick={() => useBattleItem(id)}
                    disabled={cd > 0}
                    className="rounded-xl border border-slate-600 bg-slate-800/60 p-2 text-center transition-all hover:bg-slate-700/60 active:scale-95 disabled:opacity-40"
                  >
                    <span className="text-lg">{item.emoji}</span>
                    <p className="text-[9px]">{count}개</p>
                    {cd > 0 && <p className="text-[9px] text-red-400">{cd}s</p>}
                  </button>
                );
              })}
            </div>

            <button onClick={toHub} className="w-full rounded-xl bg-slate-700 py-2 text-sm font-bold hover:bg-slate-600">🏃 도망가기</button>

            <div className="rounded-xl bg-slate-800/60 p-3">
              {log.slice(0, 5).map((l, i) => <p key={i} className="text-xs text-slate-300">{l}</p>)}
            </div>
          </div>
        )}

        {/* === CRAFTING === */}
        {screen === "crafting" && (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">🔨 크래프팅</h2>
              <span className="text-sm text-emerald-400">💎 {emeralds}</span>
            </div>

            {(["food", "potion", "combat"] as const).map((type) => {
              const typeItems = CRAFT_ITEMS.filter((c) => c.type === type);
              const label = type === "food" ? "🍖 음식" : type === "potion" ? "🧪 물약" : "⚔️ 전투";
              return (
                <div key={type}>
                  <p className="mb-2 text-sm font-bold text-green-300">{label}</p>
                  <div className="space-y-2">
                    {typeItems.map((item) => {
                      const owned = items[item.id] || 0;
                      const canBuy = emeralds >= item.cost;
                      return (
                        <button
                          key={item.id}
                          onClick={() => craftItem(item)}
                          disabled={!canBuy}
                          className={`w-full rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                            canBuy
                              ? "border-green-700 bg-green-900/30 hover:bg-green-800/40"
                              : "border-slate-700 bg-slate-800/40 opacity-40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.emoji}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold">{item.name} {owned > 0 && <span className="text-xs text-green-400">x{owned}</span>}</p>
                                <p className="text-xs font-bold text-emerald-400">💎 {item.cost}</p>
                              </div>
                              <p className="text-[10px] text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-slate-700 py-2 text-sm font-bold hover:bg-slate-600">🏠 돌아가기</button>
          </div>
        )}

        {/* === INVENTORY === */}
        {screen === "inventory" && (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">📦 인벤토리</h2>
              <button onClick={() => setScreen("hub")} className="text-sm text-green-300 hover:text-white">닫기 ✕</button>
            </div>

            {/* Tool info */}
            <div className="rounded-xl border border-cyan-700 bg-cyan-900/30 p-4">
              <p className="text-sm font-bold text-cyan-300">🛠️ 현재 도구</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{tool.emoji}</span>
                <div>
                  <p className="font-bold">{tool.name} 도구</p>
                  <p className="text-xs text-slate-400">채굴력: {tool.miningPower} | 공격력: {tool.attackPower}</p>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-amber-300">⛏️ 자원</p>
                {totalResources > 0 && (
                  <button onClick={sellAll} className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
                    💰 전부 판매
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCES.map((res) => {
                  const qty = inventory[res.id] || 0;
                  if (qty === 0) return null;
                  return (
                    <div key={res.id} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                      <span className="text-2xl">{res.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{res.name}</p>
                        <p className="text-[10px] text-slate-400">x{qty} (💎{qty * res.value})</p>
                      </div>
                    </div>
                  );
                })}
                {totalResources === 0 && <p className="col-span-2 text-center text-sm text-slate-500">자원이 없어요! 채굴하러 가세요!</p>}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="mb-2 text-sm font-bold text-green-300">🎒 아이템</p>
              <div className="grid grid-cols-2 gap-2">
                {CRAFT_ITEMS.map((item) => {
                  const count = items[item.id] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-[10px] text-slate-400">x{count}</p>
                      </div>
                    </div>
                  );
                })}
                {Object.values(items).every((v) => !v) && <p className="col-span-2 text-center text-sm text-slate-500">아이템이 없어요! 크래프팅하세요!</p>}
              </div>
            </div>
          </div>
        )}

        {/* === VICTORY === */}
        {screen === "victory" && enemy && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">🎉</span>
            <h2 className="text-3xl font-black">처치 완료!</h2>
            <p className="text-green-300">{enemy.emoji} {enemy.name}을(를) 물리쳤다!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">+{enemy.xpReward} XP</span>
              <span className="text-emerald-400">+{enemy.emeraldReward} 💎</span>
            </div>
            <button onClick={toHub} className="mt-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              돌아가기 🏠
            </button>
          </div>
        )}

        {/* === DEFEAT === */}
        {screen === "defeat" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">💀</span>
            <h2 className="text-3xl font-black">사망...</h2>
            <p className="text-red-300">더 강해져서 다시 도전하자!</p>
            <button onClick={toHub} className="mt-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
              리스폰 🏠
            </button>
          </div>
        )}

        {/* --- OFFLINE REWARD MODAL --- */}
        {offlineReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-green-600 bg-gradient-to-b from-green-900 to-stone-950 shadow-2xl">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5 text-center">
                <span className="text-5xl">🌙</span>
                <h2 className="mt-2 text-2xl font-black">오프라인 보상!</h2>
                <p className="text-sm text-green-100">
                  {offlineReward.minutes >= 60
                    ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                    : `${offlineReward.minutes}분`} 동안 채굴했어요!
                </p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-green-300">경험치</span>
                  <span className="text-lg font-black text-green-400">+{offlineReward.xpGained.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-emerald-300">에메랄드</span>
                  <span className="text-lg font-black text-emerald-400">+{offlineReward.emeraldsGained.toLocaleString()} 💎</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-red-300">HP / 배고픔</span>
                  <span className="text-sm font-bold text-red-400">완전 회복! 💖</span>
                </div>
                <button onClick={() => setOfflineReward(null)} className="mt-2 w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-lg font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
                  받기! 🎁
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-12deg) scale(1.1); } 75% { transform: rotate(12deg) scale(1.1); } }
        @keyframes atkUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(1.5); } }
      `}</style>
    </div>
  );
}
