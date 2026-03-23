"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type Element = "fire" | "water" | "wind" | "earth" | "lightning" | "special";
type Rank = "academy" | "genin" | "chunin" | "jonin" | "anbu" | "kage" | "legend";

interface Jutsu {
  id: string;
  name: string;
  nameKr: string;
  emoji: string;
  element: Element;
  damage: number;
  chakraCost: number;
  unlockLevel: number;
  cooldown: number; // seconds
  desc: string;
}

interface Enemy {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  xpReward: number;
  ryoReward: number;
  rank: Rank;
}

// --- Constants ---
const ELEMENT_INFO: Record<Element, { name: string; emoji: string; color: string; bg: string }> = {
  fire: { name: "화둔", emoji: "🔥", color: "text-red-400", bg: "bg-red-500" },
  water: { name: "수둔", emoji: "💧", color: "text-blue-400", bg: "bg-blue-500" },
  wind: { name: "풍둔", emoji: "🌪️", color: "text-cyan-400", bg: "bg-cyan-500" },
  earth: { name: "토둔", emoji: "🪨", color: "text-amber-400", bg: "bg-amber-600" },
  lightning: { name: "뇌둔", emoji: "⚡", color: "text-yellow-300", bg: "bg-yellow-500" },
  special: { name: "특수", emoji: "✨", color: "text-purple-400", bg: "bg-purple-500" },
};

const RANKS: { rank: Rank; name: string; emoji: string; level: number }[] = [
  { rank: "academy", name: "아카데미 학생", emoji: "📚", level: 1 },
  { rank: "genin", name: "하급닌자", emoji: "🥷", level: 5 },
  { rank: "chunin", name: "중급닌자", emoji: "⚔️", level: 12 },
  { rank: "jonin", name: "상급닌자", emoji: "🗡️", level: 22 },
  { rank: "anbu", name: "암부", emoji: "🎭", level: 35 },
  { rank: "kage", name: "카게", emoji: "👑", level: 50 },
  { rank: "legend", name: "전설의 닌자", emoji: "🌟", level: 75 },
];

const ALL_JUTSUS: Jutsu[] = [
  // Fire
  { id: "fireball", name: "Fire Ball", nameKr: "화둔 호화구술", emoji: "🔥", element: "fire", damage: 15, chakraCost: 10, unlockLevel: 1, cooldown: 2, desc: "기본 불꽃 공격" },
  { id: "phoenix", name: "Phoenix Flower", nameKr: "화둔 봉선화술", emoji: "🌸", element: "fire", damage: 35, chakraCost: 20, unlockLevel: 8, cooldown: 3, desc: "여러 불꽃을 날린다" },
  { id: "dragon_fire", name: "Dragon Fire", nameKr: "화둔 용화술", emoji: "🐉", element: "fire", damage: 80, chakraCost: 40, unlockLevel: 18, cooldown: 5, desc: "용의 불길로 공격" },
  { id: "amaterasu", name: "Amaterasu", nameKr: "아마테라스", emoji: "🖤", element: "fire", damage: 200, chakraCost: 80, unlockLevel: 40, cooldown: 8, desc: "꺼지지 않는 검은 불꽃" },
  // Water
  { id: "waterball", name: "Water Bullet", nameKr: "수둔 수탄술", emoji: "💧", element: "water", damage: 12, chakraCost: 8, unlockLevel: 1, cooldown: 2, desc: "물탄환을 발사" },
  { id: "water_dragon", name: "Water Dragon", nameKr: "수둔 수룡탄술", emoji: "🌊", element: "water", damage: 60, chakraCost: 35, unlockLevel: 14, cooldown: 4, desc: "거대한 물의 용" },
  { id: "tsunami", name: "Tsunami", nameKr: "수둔 대폭수", emoji: "🌊", element: "water", damage: 150, chakraCost: 70, unlockLevel: 35, cooldown: 7, desc: "거대한 해일" },
  // Wind
  { id: "gust", name: "Wind Gust", nameKr: "풍둔 돌풍술", emoji: "💨", element: "wind", damage: 10, chakraCost: 7, unlockLevel: 1, cooldown: 1, desc: "빠른 바람 공격" },
  { id: "rasen_shuriken", name: "Rasenshuriken", nameKr: "풍둔 나선수리검", emoji: "🌀", element: "wind", damage: 180, chakraCost: 75, unlockLevel: 38, cooldown: 8, desc: "바람의 나선수리검" },
  // Earth
  { id: "mud_wall", name: "Mud Wall", nameKr: "토둔 토벽술", emoji: "🧱", element: "earth", damage: 8, chakraCost: 10, unlockLevel: 2, cooldown: 2, desc: "흙 벽으로 방어 + 공격" },
  { id: "earth_dragon", name: "Earth Dragon", nameKr: "토둔 토룡탄술", emoji: "🐲", element: "earth", damage: 55, chakraCost: 30, unlockLevel: 12, cooldown: 4, desc: "흙으로 만든 용" },
  { id: "meteor", name: "Meteor", nameKr: "토둔 천석강림", emoji: "☄️", element: "earth", damage: 250, chakraCost: 90, unlockLevel: 50, cooldown: 10, desc: "하늘에서 운석을 떨어뜨린다" },
  // Lightning
  { id: "spark", name: "Spark", nameKr: "뇌둔 전광석화", emoji: "⚡", element: "lightning", damage: 18, chakraCost: 12, unlockLevel: 3, cooldown: 2, desc: "번개 스파크" },
  { id: "chidori", name: "Chidori", nameKr: "치도리", emoji: "🫱", element: "lightning", damage: 90, chakraCost: 45, unlockLevel: 20, cooldown: 5, desc: "천 마리 새의 울음소리" },
  { id: "kirin", name: "Kirin", nameKr: "기린", emoji: "🦒", element: "lightning", damage: 220, chakraCost: 85, unlockLevel: 45, cooldown: 9, desc: "하늘의 번개를 소환" },
  // Special
  { id: "clone", name: "Shadow Clone", nameKr: "그림자 분신술", emoji: "👥", element: "special", damage: 20, chakraCost: 15, unlockLevel: 5, cooldown: 3, desc: "분신을 만들어 공격" },
  { id: "rasengan", name: "Rasengan", nameKr: "나선환", emoji: "🔵", element: "special", damage: 100, chakraCost: 50, unlockLevel: 25, cooldown: 5, desc: "회전하는 차크라 구체" },
  { id: "susanoo", name: "Susanoo", nameKr: "수사노오", emoji: "👹", element: "special", damage: 300, chakraCost: 100, unlockLevel: 55, cooldown: 12, desc: "거대한 차크라 전사 소환" },
  { id: "bijuu_bomb", name: "Bijuu Bomb", nameKr: "미수옥", emoji: "💣", element: "special", damage: 500, chakraCost: 150, unlockLevel: 70, cooldown: 15, desc: "미수의 힘을 집중한 폭탄" },
];

const ALL_ENEMIES: Enemy[] = [
  // Academy
  { id: "dummy", name: "수련 인형", emoji: "🎯", hp: 30, attack: 2, xpReward: 10, ryoReward: 5, rank: "academy" },
  { id: "student", name: "아카데미 학생", emoji: "👦", hp: 50, attack: 5, xpReward: 15, ryoReward: 8, rank: "academy" },
  // Genin
  { id: "bandit", name: "산적", emoji: "🥷", hp: 80, attack: 10, xpReward: 25, ryoReward: 15, rank: "genin" },
  { id: "rogue", name: "빠진 닌자", emoji: "😈", hp: 120, attack: 15, xpReward: 35, ryoReward: 20, rank: "genin" },
  // Chunin
  { id: "chunin_enemy", name: "적 중급닌자", emoji: "⚔️", hp: 200, attack: 25, xpReward: 60, ryoReward: 40, rank: "chunin" },
  { id: "puppet", name: "인형술사", emoji: "🎭", hp: 250, attack: 30, xpReward: 80, ryoReward: 50, rank: "chunin" },
  // Jonin
  { id: "jonin_enemy", name: "적 상급닌자", emoji: "🗡️", hp: 400, attack: 45, xpReward: 120, ryoReward: 80, rank: "jonin" },
  { id: "swordsman", name: "칠인방 검사", emoji: "⚔️", hp: 500, attack: 55, xpReward: 150, ryoReward: 100, rank: "jonin" },
  // Anbu
  { id: "anbu_enemy", name: "적 암부", emoji: "🎭", hp: 700, attack: 70, xpReward: 200, ryoReward: 150, rank: "anbu" },
  { id: "jinchuriki", name: "인주력", emoji: "🦊", hp: 1000, attack: 90, xpReward: 300, ryoReward: 200, rank: "anbu" },
  // Kage
  { id: "kage_enemy", name: "적 카게", emoji: "👑", hp: 1500, attack: 120, xpReward: 500, ryoReward: 350, rank: "kage" },
  { id: "bijuu", name: "미수", emoji: "🐉", hp: 2500, attack: 150, xpReward: 800, ryoReward: 500, rank: "kage" },
  // Legend
  { id: "otsutsuki", name: "오오츠츠키", emoji: "👽", hp: 5000, attack: 200, xpReward: 1500, ryoReward: 1000, rank: "legend" },
  { id: "juubi", name: "십미", emoji: "🌑", hp: 10000, attack: 300, xpReward: 3000, ryoReward: 2000, rank: "legend" },
];

function xpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.3, level - 1));
}

function getCurrentRank(level: number): typeof RANKS[0] {
  return [...RANKS].reverse().find((r) => level >= r.level) || RANKS[0];
}

type Screen = "village" | "battle" | "jutsuList" | "victory" | "defeat";

const JUTSU_SAVE_KEY = "jutsu_save";
const JUTSU_MAX_OFFLINE_MIN = 480;

interface JutsuSave {
  level: number; xp: number; hp: number; maxHp: number;
  chakra: number; maxChakra: number; ryo: number; trainCount: number;
  timestamp: number;
}

interface JutsuOfflineReward { minutes: number; xpGained: number; ryoGained: number; }

export default function JutsuPage() {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [chakra, setChakra] = useState(50);
  const [maxChakra, setMaxChakra] = useState(50);
  const [ryo, setRyo] = useState(0);
  const [screen, setScreen] = useState<Screen>("village");
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [attackAnim, setAttackAnim] = useState<string | null>(null);
  const [enemyAttackAnim, setEnemyAttackAnim] = useState(false);
  const [trainCount, setTrainCount] = useState(0);
  const [offlineReward, setOfflineReward] = useState<JutsuOfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rank = getCurrentRank(level);
  const xpNeeded = xpForLevel(level);
  const unlockedJutsus = ALL_JUTSUS.filter((j) => j.unlockLevel <= level);
  const availableEnemies = ALL_ENEMIES.filter((e) => {
    const eRankIdx = RANKS.findIndex((r) => r.rank === e.rank);
    const myRankIdx = RANKS.findIndex((r) => r.rank === rank.rank);
    return eRankIdx <= myRankIdx + 1;
  });

  // Level up check
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp((prev) => prev - xpNeeded);
      setLevel((prev) => prev + 1);
      const newMaxHp = 100 + (level) * 15;
      const newMaxChakra = 50 + (level) * 10;
      setMaxHp(newMaxHp);
      setMaxChakra(newMaxChakra);
      setHp(newMaxHp);
      setChakra(newMaxChakra);
      setBattleLog((prev) => [`🎉 레벨 업! Lv.${level + 1}!`, ...prev.slice(0, 4)]);
    }
  }, [xp, xpNeeded, level]);

  // Cooldown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldowns((prev) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > 1) next[k] = v - 1;
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Chakra regen
  useEffect(() => {
    if (screen === "village") {
      const regen = setInterval(() => {
        setChakra((prev) => Math.min(prev + 2, maxChakra));
        setHp((prev) => Math.min(prev + 3, maxHp));
      }, 1000);
      return () => clearInterval(regen);
    }
  }, [screen, maxChakra, maxHp]);

  // --- Load save on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(JUTSU_SAVE_KEY);
      if (!raw) { setLoaded(true); return; }
      const s: JutsuSave = JSON.parse(raw);
      setLevel(s.level); setXp(s.xp);
      setMaxHp(s.maxHp); setMaxChakra(s.maxChakra);
      setHp(Math.min(s.hp, s.maxHp)); setChakra(Math.min(s.chakra, s.maxChakra));
      setRyo(s.ryo); setTrainCount(s.trainCount);
      const diffMin = Math.min(Math.floor((Date.now() - s.timestamp) / 60000), JUTSU_MAX_OFFLINE_MIN);
      if (diffMin >= 1) {
        const xpPer = Math.floor(2 + s.level * 0.4);
        const ryoPer = Math.floor(3 + s.level * 1.5);
        const xpGained = xpPer * diffMin;
        const ryoGained = ryoPer * diffMin;
        setXp((p) => p + xpGained);
        setRyo((p) => p + ryoGained);
        setHp(s.maxHp); setChakra(s.maxChakra);
        setOfflineReward({ minutes: diffMin, xpGained, ryoGained });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Save periodically + on unload ---
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: JutsuSave = { level, xp, hp, maxHp, chakra, maxChakra, ryo, trainCount, timestamp: Date.now() };
      localStorage.setItem(JUTSU_SAVE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, level, xp, hp, maxHp, chakra, maxChakra, ryo, trainCount]);

  const startBattle = (enemy: Enemy) => {
    setCurrentEnemy(enemy);
    setEnemyHp(enemy.hp);
    setScreen("battle");
    setBattleLog([`⚔️ ${enemy.emoji} ${enemy.name}와(과) 전투 시작!`]);
  };

  const useJutsu = useCallback((jutsu: Jutsu) => {
    if (!currentEnemy || chakra < jutsu.chakraCost || (cooldowns[jutsu.id] ?? 0) > 0) return;

    setChakra((prev) => prev - jutsu.chakraCost);
    setCooldowns((prev) => ({ ...prev, [jutsu.id]: jutsu.cooldown }));

    // Damage with some variance
    const dmg = Math.floor(jutsu.damage * (0.9 + Math.random() * 0.3));
    setAttackAnim(jutsu.emoji);
    setTimeout(() => setAttackAnim(null), 600);

    const newEnemyHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEnemyHp);
    setBattleLog((prev) => [`${jutsu.emoji} ${jutsu.nameKr}! ${dmg} 데미지!`, ...prev.slice(0, 4)]);

    if (newEnemyHp <= 0) {
      // Victory
      setXp((prev) => prev + currentEnemy.xpReward);
      setRyo((prev) => prev + currentEnemy.ryoReward);
      setScreen("victory");
      setBattleLog((prev) => [`🎉 승리! +${currentEnemy.xpReward}XP +${currentEnemy.ryoReward}료`, ...prev.slice(0, 4)]);
      return;
    }

    // Enemy counter-attack after delay
    setTimeout(() => {
      const enemyDmg = Math.floor(currentEnemy.attack * (0.8 + Math.random() * 0.4));
      setEnemyAttackAnim(true);
      setTimeout(() => setEnemyAttackAnim(false), 400);

      setHp((prev) => {
        const newHp = Math.max(0, prev - enemyDmg);
        if (newHp <= 0) {
          setScreen("defeat");
          setBattleLog((p) => [`💀 ${currentEnemy.emoji} ${currentEnemy.name}에게 패배...`, ...p.slice(0, 4)]);
        } else {
          setBattleLog((p) => [`${currentEnemy.emoji} 적의 공격! ${enemyDmg} 데미지!`, ...p.slice(0, 4)]);
        }
        return newHp;
      });
    }, 800);
  }, [currentEnemy, chakra, cooldowns, enemyHp]);

  const train = useCallback(() => {
    const xpGain = 3 + Math.floor(level * 0.5);
    setXp((prev) => prev + xpGain);
    setTrainCount((prev) => prev + 1);
    setBattleLog((prev) => [`🥋 수련! +${xpGain}XP`, ...prev.slice(0, 4)]);
  }, [level]);

  const heal = () => {
    const cost = 10 + level * 2;
    if (ryo < cost) return;
    setRyo((prev) => prev - cost);
    setHp(maxHp);
    setChakra(maxChakra);
    setBattleLog((prev) => [`💊 완전 회복! -${cost}료`, ...prev.slice(0, 4)]);
  };

  const returnToVillage = () => {
    setScreen("village");
    setCurrentEnemy(null);
    if (hp <= 0) {
      setHp(Math.floor(maxHp * 0.3));
      setChakra(Math.floor(maxChakra * 0.3));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-red-950 to-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-red-900 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-red-300 transition-colors hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">주츠 인피니티</span>
            <span className="ml-1">🥷</span>
          </span>
          <button onClick={() => setScreen(screen === "jutsuList" ? "village" : "jutsuList")} className="text-sm text-red-300 hover:text-white">
            📜 주츠
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* Player Stats */}
        <div className="mb-4 w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">{rank.emoji} {rank.name} Lv.{level}</span>
            <span className="text-yellow-400">💰 {ryo.toLocaleString()} 료</span>
          </div>
          {/* HP Bar */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-red-400">HP</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{hp}/{maxHp}</span>
          </div>
          {/* Chakra Bar */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-8 text-xs text-blue-400">CP</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" style={{ width: `${(chakra / maxChakra) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{chakra}/{maxChakra}</span>
          </div>
          {/* XP Bar */}
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-green-400">XP</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-xs">{xp}/{xpNeeded}</span>
          </div>
        </div>

        {/* --- VILLAGE SCREEN --- */}
        {screen === "village" && (
          <div className="w-full max-w-lg space-y-4">
            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={train}
                className="rounded-2xl border border-orange-700 bg-orange-900/40 p-4 text-center transition-all hover:bg-orange-800/40 active:scale-95"
              >
                <span className="text-3xl">🥋</span>
                <p className="mt-1 text-sm font-bold">수련하기</p>
                <p className="text-[10px] text-orange-300">+{3 + Math.floor(level * 0.5)} XP</p>
              </button>
              <button
                onClick={heal}
                disabled={ryo < 10 + level * 2}
                className="rounded-2xl border border-green-700 bg-green-900/40 p-4 text-center transition-all hover:bg-green-800/40 active:scale-95 disabled:opacity-40"
              >
                <span className="text-3xl">💊</span>
                <p className="mt-1 text-sm font-bold">회복하기</p>
                <p className="text-[10px] text-green-300">💰 {10 + level * 2} 료</p>
              </button>
            </div>

            {/* Enemy Selection */}
            <div>
              <h3 className="mb-2 text-center text-sm font-bold text-red-300">⚔️ 전투할 적 선택</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableEnemies.map((enemy) => {
                  const eRank = RANKS.find((r) => r.rank === enemy.rank);
                  return (
                    <button
                      key={enemy.id}
                      onClick={() => startBattle(enemy)}
                      disabled={hp <= 0}
                      className="rounded-xl border border-red-800 bg-red-900/30 p-3 text-left transition-all hover:bg-red-800/40 active:scale-95 disabled:opacity-40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{enemy.emoji}</span>
                        <div>
                          <p className="text-sm font-bold">{enemy.name}</p>
                          <p className="text-[10px] text-red-300">
                            HP:{enemy.hp} ATK:{enemy.attack} | {eRank?.emoji} {eRank?.name}
                          </p>
                          <p className="text-[10px] text-yellow-400">+{enemy.xpReward}XP +{enemy.ryoReward}료</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Battle Log */}
            {battleLog.length > 0 && (
              <div className="rounded-xl bg-slate-800/60 p-3">
                <p className="mb-1 text-xs font-bold text-slate-400">최근 기록</p>
                {battleLog.slice(0, 5).map((log, i) => (
                  <p key={i} className="text-xs text-slate-300">{log}</p>
                ))}
              </div>
            )}

            <Link href="/" className="block w-full rounded-xl border border-orange-700 bg-orange-900/40 py-3 text-center text-sm font-bold text-orange-300 transition-all hover:bg-orange-800/40 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* --- BATTLE SCREEN --- */}
        {screen === "battle" && currentEnemy && (
          <div className="w-full max-w-lg space-y-4">
            {/* Enemy */}
            <div className="rounded-2xl bg-red-900/30 p-4 text-center">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold">{currentEnemy.emoji} {currentEnemy.name}</span>
                <span className="text-xs text-red-300">ATK: {currentEnemy.attack}</span>
              </div>
              <div className="mb-2 h-4 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{ width: `${(enemyHp / currentEnemy.hp) * 100}%` }}
                />
              </div>
              <p className="text-xs">HP: {enemyHp} / {currentEnemy.hp}</p>
              <span
                className={`mt-2 inline-block text-6xl transition-transform ${enemyAttackAnim ? "scale-125" : ""}`}
                style={{ animation: enemyAttackAnim ? "shake 0.3s" : "none" }}
              >
                {currentEnemy.emoji}
              </span>
              {/* Attack animation */}
              {attackAnim && (
                <div className="mt-2 text-4xl" style={{ animation: "floatUp 0.6s ease-out forwards" }}>
                  {attackAnim}
                </div>
              )}
            </div>

            {/* Jutsu Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {unlockedJutsus.map((jutsu) => {
                const cd = cooldowns[jutsu.id] ?? 0;
                const canUse = chakra >= jutsu.chakraCost && cd === 0;
                return (
                  <button
                    key={jutsu.id}
                    onClick={() => useJutsu(jutsu)}
                    disabled={!canUse}
                    className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${
                      canUse
                        ? "border-blue-700 bg-blue-900/40 hover:bg-blue-800/40"
                        : "border-slate-700 bg-slate-800/40 opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{jutsu.emoji}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold">{jutsu.nameKr}</p>
                        <p className="text-[10px] text-slate-400">
                          DMG:{jutsu.damage} CP:{jutsu.chakraCost}
                          {cd > 0 && <span className="ml-1 text-red-400">({cd}s)</span>}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Run */}
            <button onClick={returnToVillage} className="w-full rounded-xl bg-slate-700 py-2 text-sm font-bold hover:bg-slate-600">
              🏃 도망가기
            </button>

            {/* Battle Log */}
            <div className="rounded-xl bg-slate-800/60 p-3">
              {battleLog.slice(0, 5).map((log, i) => (
                <p key={i} className="text-xs text-slate-300">{log}</p>
              ))}
            </div>
          </div>
        )}

        {/* --- VICTORY SCREEN --- */}
        {screen === "victory" && currentEnemy && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">🎉</span>
            <h2 className="text-3xl font-black">승리!</h2>
            <p className="text-green-300">{currentEnemy.emoji} {currentEnemy.name}을(를) 물리쳤다!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">+{currentEnemy.xpReward} XP</span>
              <span className="text-yellow-400">+{currentEnemy.ryoReward} 료</span>
            </div>
            <button
              onClick={returnToVillage}
              className="mt-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              마을로 돌아가기 🏘️
            </button>
          </div>
        )}

        {/* --- DEFEAT SCREEN --- */}
        {screen === "defeat" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="text-7xl">💀</span>
            <h2 className="text-3xl font-black">패배...</h2>
            <p className="text-red-300">더 강해져서 다시 도전하자!</p>
            <button
              onClick={returnToVillage}
              className="mt-4 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 px-8 py-3 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              마을로 돌아가기 🏘️
            </button>
          </div>
        )}

        {/* --- JUTSU LIST SCREEN --- */}
        {screen === "jutsuList" && (
          <div className="w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">📜 주츠 목록</h2>
              <button onClick={() => setScreen("village")} className="text-sm text-red-300 hover:text-white">닫기 ✕</button>
            </div>
            {(["fire", "water", "wind", "earth", "lightning", "special"] as Element[]).map((el) => {
              const elJutsus = ALL_JUTSUS.filter((j) => j.element === el);
              const info = ELEMENT_INFO[el];
              return (
                <div key={el} className="mb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full ${info.bg} px-2 py-0.5 text-xs font-bold`}>{info.emoji} {info.name}</span>
                  </div>
                  <div className="space-y-1">
                    {elJutsus.map((jutsu) => {
                      const unlocked = level >= jutsu.unlockLevel;
                      return (
                        <div key={jutsu.id} className={`rounded-xl border p-3 ${unlocked ? "border-slate-700 bg-slate-800/50" : "border-slate-800 bg-slate-900/50 opacity-40"}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{unlocked ? jutsu.emoji : "🔒"}</span>
                            <div className="flex-1">
                              <p className="text-sm font-bold">{unlocked ? jutsu.nameKr : "???"}</p>
                              <p className="text-[10px] text-slate-400">
                                {unlocked ? jutsu.desc : `Lv.${jutsu.unlockLevel}에 해금`}
                              </p>
                            </div>
                            {unlocked && (
                              <div className="text-right text-[10px] text-slate-400">
                                <p>DMG: {jutsu.damage}</p>
                                <p>CP: {jutsu.chakraCost}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* --- OFFLINE REWARD MODAL --- */}
        {offlineReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-600 bg-gradient-to-b from-slate-900 to-red-950 shadow-2xl">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5 text-center">
                <span className="text-5xl">🌙</span>
                <h2 className="mt-2 text-2xl font-black">오프라인 수련!</h2>
                <p className="text-sm text-red-100">
                  {offlineReward.minutes >= 60
                    ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                    : `${offlineReward.minutes}분`} 동안 수련했어요!
                </p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-green-300">경험치</span>
                  <span className="text-lg font-black text-green-400">+{offlineReward.xpGained.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-yellow-300">료</span>
                  <span className="text-lg font-black text-yellow-400">+{offlineReward.ryoGained.toLocaleString()} 료</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
                  <span className="text-sm text-red-300">HP / CP</span>
                  <span className="text-sm font-bold text-red-400">완전 회복! 💖</span>
                </div>
                <button onClick={() => setOfflineReward(null)} className="mt-2 w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 py-3 text-lg font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
                  받기! 🎁
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(10deg) scale(1.1); }
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
