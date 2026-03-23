"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Clicker Game Types ---
type UpgradeTier = "normal" | "advanced" | "legendary" | "mythic";

interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  baseCost: number;
  costMultiplier: number;
  effect: "clickPower" | "autoClick";
  effectValue: number;
  tier: UpgradeTier;
}

const TIER_INFO: Record<UpgradeTier, { label: string; emoji: string; border: string; bg: string; activeBorder: string; activeBg: string; text: string }> = {
  normal: { label: "일반", emoji: "⚪", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-blue-300 dark:border-blue-700", activeBg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-500" },
  advanced: { label: "고급", emoji: "🟢", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-emerald-400 dark:border-emerald-700", activeBg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-500" },
  legendary: { label: "전설", emoji: "🟣", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-purple-400 dark:border-purple-700", activeBg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-500" },
  mythic: { label: "신화", emoji: "🔴", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-amber-400 dark:border-amber-600", activeBg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40", text: "text-amber-500" },
};

interface BuildingLevel {
  name: string;
  emoji: string;
  blocksNeeded: number;
  color: string;
}

const UPGRADES: Upgrade[] = [
  // 일반
  { id: "hammer", name: "강화 망치", emoji: "🔨", desc: "클릭당 +1 블록", baseCost: 10, costMultiplier: 1.5, effect: "clickPower", effectValue: 1, tier: "normal" },
  { id: "crane", name: "크레인", emoji: "🏗️", desc: "초당 +1 자동 블록", baseCost: 50, costMultiplier: 1.8, effect: "autoClick", effectValue: 1, tier: "normal" },
  { id: "drill", name: "파워 드릴", emoji: "🔧", desc: "클릭당 +5 블록", baseCost: 200, costMultiplier: 1.6, effect: "clickPower", effectValue: 5, tier: "normal" },
  { id: "robot", name: "건축 로봇", emoji: "🤖", desc: "초당 +5 자동 블록", baseCost: 500, costMultiplier: 1.9, effect: "autoClick", effectValue: 5, tier: "normal" },
  // 고급
  { id: "magic", name: "마법 건축", emoji: "✨", desc: "클릭당 +25 블록", baseCost: 2000, costMultiplier: 1.7, effect: "clickPower", effectValue: 25, tier: "advanced" },
  { id: "factory", name: "블록 공장", emoji: "🏭", desc: "초당 +25 자동 블록", baseCost: 5000, costMultiplier: 2.0, effect: "autoClick", effectValue: 25, tier: "advanced" },
  { id: "laser", name: "레이저 커터", emoji: "🔫", desc: "클릭당 +100 블록", baseCost: 15000, costMultiplier: 1.8, effect: "clickPower", effectValue: 100, tier: "advanced" },
  { id: "drone", name: "건축 드론대", emoji: "🛸", desc: "초당 +100 자동 블록", baseCost: 30000, costMultiplier: 2.0, effect: "autoClick", effectValue: 100, tier: "advanced" },
  // 전설
  { id: "timemachine", name: "타임머신", emoji: "⏰", desc: "클릭당 +500 블록", baseCost: 100000, costMultiplier: 1.9, effect: "clickPower", effectValue: 500, tier: "legendary" },
  { id: "nanobot", name: "나노봇 군단", emoji: "🦠", desc: "초당 +500 자동 블록", baseCost: 200000, costMultiplier: 2.1, effect: "autoClick", effectValue: 500, tier: "legendary" },
  { id: "portal", name: "차원의 문", emoji: "🌀", desc: "클릭당 +2000 블록", baseCost: 800000, costMultiplier: 2.0, effect: "clickPower", effectValue: 2000, tier: "legendary" },
  { id: "antimatter", name: "반물질 엔진", emoji: "⚛️", desc: "초당 +2000 자동 블록", baseCost: 1500000, costMultiplier: 2.2, effect: "autoClick", effectValue: 2000, tier: "legendary" },
  // 신화
  { id: "bigbang", name: "빅뱅 생성기", emoji: "💥", desc: "클릭당 +10000 블록", baseCost: 5000000, costMultiplier: 2.0, effect: "clickPower", effectValue: 10000, tier: "mythic" },
  { id: "multiverse", name: "멀티버스 공장", emoji: "🌐", desc: "초당 +10000 자동 블록", baseCost: 10000000, costMultiplier: 2.3, effect: "autoClick", effectValue: 10000, tier: "mythic" },
  { id: "godhand", name: "신의 손", emoji: "🖐️", desc: "클릭당 +50000 블록", baseCost: 50000000, costMultiplier: 2.2, effect: "clickPower", effectValue: 50000, tier: "mythic" },
  { id: "infinity", name: "무한의 힘", emoji: "♾️", desc: "초당 +50000 자동 블록", baseCost: 100000000, costMultiplier: 2.5, effect: "autoClick", effectValue: 50000, tier: "mythic" },
];

const BUILDING_LEVELS: BuildingLevel[] = [
  { name: "빈 땅", emoji: "🌱", blocksNeeded: 0, color: "from-green-400 to-emerald-500" },
  { name: "오두막", emoji: "🛖", blocksNeeded: 50, color: "from-amber-400 to-yellow-500" },
  { name: "집", emoji: "🏠", blocksNeeded: 200, color: "from-blue-400 to-sky-500" },
  { name: "빌딩", emoji: "🏢", blocksNeeded: 1000, color: "from-indigo-400 to-violet-500" },
  { name: "성", emoji: "🏰", blocksNeeded: 5000, color: "from-purple-400 to-fuchsia-500" },
  { name: "도시", emoji: "🏙️", blocksNeeded: 20000, color: "from-pink-400 to-rose-500" },
  { name: "우주 기지", emoji: "🚀", blocksNeeded: 100000, color: "from-red-400 to-orange-500" },
  { name: "은하수", emoji: "🌌", blocksNeeded: 500000, color: "from-violet-500 to-indigo-600" },
  { name: "블랙홀", emoji: "🕳️", blocksNeeded: 2000000, color: "from-gray-900 to-purple-950" },
];

interface CountryUpgrade {
  id: string;
  name: string;
  flag: string;
  desc: string;
  cost: number;
  clickBonus: number;
  autoBonus: number;
  landmark: string;
}

const COUNTRIES: CountryUpgrade[] = [
  { id: "korea", name: "대한민국", flag: "🇰🇷", desc: "K-건축! 클릭 +10, 자동 +5", cost: 500, clickBonus: 10, autoBonus: 5, landmark: "🏯" },
  { id: "japan", name: "일본", flag: "🇯🇵", desc: "정밀 건축! 클릭 +20, 자동 +10", cost: 2000, clickBonus: 20, autoBonus: 10, landmark: "⛩️" },
  { id: "china", name: "중국", flag: "🇨🇳", desc: "만리장성! 클릭 +50, 자동 +30", cost: 8000, clickBonus: 50, autoBonus: 30, landmark: "🏯" },
  { id: "usa", name: "미국", flag: "🇺🇸", desc: "마천루! 클릭 +100, 자동 +60", cost: 25000, clickBonus: 100, autoBonus: 60, landmark: "🗽" },
  { id: "egypt", name: "이집트", flag: "🇪🇬", desc: "피라미드! 클릭 +200, 자동 +150", cost: 80000, clickBonus: 200, autoBonus: 150, landmark: "🔺" },
  { id: "france", name: "프랑스", flag: "🇫🇷", desc: "에펠탑! 클릭 +500, 자동 +300", cost: 200000, clickBonus: 500, autoBonus: 300, landmark: "🗼" },
  { id: "uae", name: "UAE", flag: "🇦🇪", desc: "부르즈칼리파! 클릭 +1000, 자동 +700", cost: 500000, clickBonus: 1000, autoBonus: 700, landmark: "🏙️" },
  { id: "space", name: "우주", flag: "🌌", desc: "우주 정거장! 클릭 +3000, 자동 +2000", cost: 2000000, clickBonus: 3000, autoBonus: 2000, landmark: "🛸" },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.floor(n));
}

const BUILD_SAVE_KEY = "building_save";
const BUILD_MAX_OFFLINE_MIN = 480;

interface BuildSave {
  blocks: number; totalBlocks: number; clickPower: number; autoPerSec: number;
  upgradeLevels: Record<string, number>; ownedCountries: Record<string, boolean>;
  timestamp: number;
}

interface BuildOfflineReward { minutes: number; blocksGained: number; }

export default function BuildingPage() {
  const [blocks, setBlocks] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [autoPerSec, setAutoPerSec] = useState(0);
  const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({});
  const [clickEffects, setClickEffects] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [ownedCountries, setOwnedCountries] = useState<Record<string, boolean>>({});
  const [showCountries, setShowCountries] = useState(false);
  const [offlineReward, setOfflineReward] = useState<BuildOfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);
  const nextEffectId = useRef(0);

  // --- Load save on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILD_SAVE_KEY);
      if (!raw) { setLoaded(true); return; }
      const s: BuildSave = JSON.parse(raw);
      setBlocks(s.blocks); setTotalBlocks(s.totalBlocks);
      setClickPower(s.clickPower); setAutoPerSec(s.autoPerSec);
      setUpgradeLevels(s.upgradeLevels); setOwnedCountries(s.ownedCountries);
      const diffMin = Math.min(Math.floor((Date.now() - s.timestamp) / 60000), BUILD_MAX_OFFLINE_MIN);
      if (diffMin >= 1 && s.autoPerSec > 0) {
        const gained = s.autoPerSec * diffMin * 60;
        setBlocks((p) => p + gained);
        setTotalBlocks((p) => p + gained);
        setOfflineReward({ minutes: diffMin, blocksGained: gained });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Save periodically + on unload ---
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: BuildSave = { blocks, totalBlocks, clickPower, autoPerSec, upgradeLevels, ownedCountries, timestamp: Date.now() };
      localStorage.setItem(BUILD_SAVE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, blocks, totalBlocks, clickPower, autoPerSec, upgradeLevels, ownedCountries]);

  // Current building level
  const currentLevel = [...BUILDING_LEVELS].reverse().find((l) => totalBlocks >= l.blocksNeeded) || BUILDING_LEVELS[0];
  const nextLevel = BUILDING_LEVELS[BUILDING_LEVELS.indexOf(currentLevel) + 1] || null;
  const progress = nextLevel
    ? ((totalBlocks - currentLevel.blocksNeeded) / (nextLevel.blocksNeeded - currentLevel.blocksNeeded)) * 100
    : 100;

  // Auto clicker
  useEffect(() => {
    if (autoPerSec <= 0) return;
    const interval = setInterval(() => {
      setBlocks((prev) => prev + autoPerSec);
      setTotalBlocks((prev) => prev + autoPerSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPerSec]);

  // Clean up click effects
  useEffect(() => {
    if (clickEffects.length === 0) return;
    const timer = setTimeout(() => {
      setClickEffects((prev) => prev.slice(1));
    }, 800);
    return () => clearTimeout(timer);
  }, [clickEffects]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBlocks((prev) => prev + clickPower);
      setTotalBlocks((prev) => prev + clickPower);
      setClickEffects((prev) => [...prev, { id: nextEffectId.current++, x, y, value: clickPower }]);
    },
    [clickPower]
  );

  const getUpgradeCost = (upgrade: Upgrade): number => {
    const level = upgradeLevels[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const cost = getUpgradeCost(upgrade);
    if (blocks < cost) return;
    setBlocks((prev) => prev - cost);
    setUpgradeLevels((prev) => ({ ...prev, [upgrade.id]: (prev[upgrade.id] || 0) + 1 }));
    if (upgrade.effect === "clickPower") {
      setClickPower((prev) => prev + upgrade.effectValue);
    } else {
      setAutoPerSec((prev) => prev + upgrade.effectValue);
    }
  };

  const buyCountry = (country: CountryUpgrade) => {
    if (blocks < country.cost || ownedCountries[country.id]) return;
    setBlocks((prev) => prev - country.cost);
    setOwnedCountries((prev) => ({ ...prev, [country.id]: true }));
    setClickPower((prev) => prev + country.clickBonus);
    setAutoPerSec((prev) => prev + country.autoBonus);
  };

  const ownedCount = Object.values(ownedCountries).filter(Boolean).length;

  // Visual blocks for the building area
  const blockRows = Math.min(Math.floor(Math.sqrt(totalBlocks / 5)), 12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-cyan-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">🏗️ 건축 클리커</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">
        {/* Stats Bar */}
        <div className="mb-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">보유 블록</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">🧱 {formatNumber(blocks)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">클릭당</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">🔨 {formatNumber(clickPower)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">초당 자동</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">⚡ {formatNumber(autoPerSec)}</p>
          </div>
        </div>

        {/* Building Level Progress */}
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentLevel.emoji}</span>
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">{currentLevel.name}</p>
                <p className="text-xs text-zinc-400">총 {formatNumber(totalBlocks)}블록 건축</p>
              </div>
            </div>
            {nextLevel && (
              <div className="text-right">
                <p className="text-xs text-zinc-400">다음: {nextLevel.emoji} {nextLevel.name}</p>
                <p className="text-xs text-zinc-500">{formatNumber(nextLevel.blocksNeeded - totalBlocks)}블록 남음</p>
              </div>
            )}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${currentLevel.color} transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Click Area + Upgrades */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Click Area */}
          <div className="lg:col-span-2">
            <button
              onClick={handleClick}
              className="relative w-full overflow-hidden rounded-3xl border-4 border-dashed border-zinc-300 bg-gradient-to-b from-sky-100 to-green-100 transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:hover:border-blue-500"
              style={{ minHeight: 320 }}
            >
              {/* Sky */}
              <div className="absolute inset-x-0 top-0 h-1/2">
                <span className="absolute left-[10%] top-[20%] text-2xl opacity-60">☁️</span>
                <span className="absolute left-[60%] top-[10%] text-xl opacity-40">☁️</span>
                <span className="absolute left-[35%] top-[30%] text-lg opacity-30">☁️</span>
                {totalBlocks >= 100000 && (
                  <>
                    <span className="absolute left-[80%] top-[5%] text-xl">⭐</span>
                    <span className="absolute left-[15%] top-[8%] text-sm">🌟</span>
                  </>
                )}
              </div>

              {/* Building visualization */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4">
                {/* Ground */}
                <div className="mb-1 h-3 w-4/5 rounded-full bg-green-500/30 dark:bg-green-900/40" />
                {/* Building icon */}
                <div className="flex flex-col items-center">
                  <span className="text-7xl drop-shadow-lg">{currentLevel.emoji}</span>
                  {/* Stacked block rows */}
                  {blockRows > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-0.5" style={{ maxWidth: 200 }}>
                      {Array.from({ length: Math.min(blockRows * 4, 48) }).map((_, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-sm bg-gradient-to-br from-amber-400 to-orange-500 opacity-80 shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Click effects */}
              {clickEffects.map((effect) => (
                <span
                  key={effect.id}
                  className="pointer-events-none absolute animate-bounce text-lg font-black text-yellow-500 dark:text-yellow-400"
                  style={{
                    left: effect.x - 15,
                    top: effect.y - 20,
                    animation: "floatUp 0.8s ease-out forwards",
                  }}
                >
                  +{formatNumber(effect.value)}
                </span>
              ))}

              {/* Click prompt */}
              <p className="absolute inset-x-0 top-4 text-center text-sm font-bold text-zinc-400 dark:text-zinc-500">
                클릭해서 건축하세요!
              </p>
            </button>
          </div>

          {/* Upgrades */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 480 }}>
            <h3 className="text-center text-lg font-bold text-zinc-900 dark:text-white">🛒 업그레이드</h3>
            {(["normal", "advanced", "legendary", "mythic"] as UpgradeTier[]).map((tier) => {
              const tierUpgrades = UPGRADES.filter((u) => u.tier === tier);
              const info = TIER_INFO[tier];
              return (
                <div key={tier}>
                  <div className="mb-1 mt-2 flex items-center gap-2 px-1">
                    <span className="text-sm">{info.emoji}</span>
                    <span className={`text-xs font-black ${info.text}`}>{info.label}</span>
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                  {tierUpgrades.map((upgrade) => {
                    const cost = getUpgradeCost(upgrade);
                    const level = upgradeLevels[upgrade.id] || 0;
                    const canBuy = blocks >= cost;
                    return (
                      <button
                        key={upgrade.id}
                        onClick={() => buyUpgrade(upgrade)}
                        disabled={!canBuy}
                        className={`mb-1.5 w-full rounded-2xl border p-3 text-left transition-all ${
                          canBuy
                            ? `${info.activeBorder} ${info.activeBg} hover:shadow-md active:scale-[0.98]`
                            : `${info.border} ${info.bg} opacity-50`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{upgrade.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                {upgrade.name}
                                {level > 0 && (
                                  <span className={`ml-1 text-xs ${info.text}`}>Lv.{level}</span>
                                )}
                              </p>
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">🧱 {formatNumber(cost)}</p>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{upgrade.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Upgrades Section */}
        <div className="mt-8">
          <button
            onClick={() => setShowCountries(!showCountries)}
            className="mb-4 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌍</span>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">나라 업그레이드</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    세계 각국의 건축 기술을 해금하세요! ({ownedCount}/{COUNTRIES.length}개 보유)
                  </p>
                </div>
              </div>
              <span className="text-zinc-400">{showCountries ? "▲" : "▼"}</span>
            </div>
            {/* Owned country flags */}
            {ownedCount > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {COUNTRIES.filter((c) => ownedCountries[c.id]).map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {c.flag} {c.name} {c.landmark}
                  </span>
                ))}
              </div>
            )}
          </button>

          {showCountries && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {COUNTRIES.map((country) => {
                const owned = !!ownedCountries[country.id];
                const canBuy = blocks >= country.cost && !owned;
                return (
                  <button
                    key={country.id}
                    onClick={() => buyCountry(country)}
                    disabled={owned || !canBuy}
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      owned
                        ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40"
                        : canBuy
                        ? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-lg active:scale-[0.97] dark:border-amber-800 dark:bg-amber-950/40 dark:hover:border-amber-600"
                        : "border-zinc-200 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <span className="text-4xl">{country.flag}</span>
                    <p className="mt-2 text-lg font-black text-zinc-900 dark:text-white">{country.name}</p>
                    <p className="text-2xl">{country.landmark}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{country.desc}</p>
                    {owned ? (
                      <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">보유 중 ✅</p>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">🧱 {formatNumber(country.cost)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Building Guide Toggle */}
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            📖 로블록스 건축 가이드 {showGuide ? "닫기 ▲" : "보기 ▼"}
          </button>
        </div>

        {/* Guide (collapsible) */}
        {showGuide && (
          <>
            {/* Step-by-step Guide */}
            <section className="py-16">
              <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
                📖 단계별 건축 배우기
              </h2>
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Roblox Studio 시작하기",
                    desc: "Roblox Studio를 열고 새로운 Baseplate 템플릿을 선택하세요. 이것이 건축의 시작점이에요!",
                    tips: [
                      "Roblox Studio는 무료로 다운로드할 수 있어요",
                      "Baseplate는 평평한 땅이라서 건축하기 좋아요",
                      "처음에는 간단한 것부터 시작해 보세요",
                    ],
                    color: "from-green-400 to-emerald-300",
                  },
                  {
                    step: 2,
                    title: "기본 블록(Part) 배치하기",
                    desc: "Part 도구를 사용해서 블록, 구, 원기둥 같은 기본 도형을 배치해 보세요.",
                    tips: [
                      "Home 탭에서 Part 버튼을 클릭해요",
                      "Block(블록), Sphere(구), Cylinder(원기둥) 중 선택할 수 있어요",
                      "마우스로 드래그하면 크기를 조절할 수 있어요",
                    ],
                    color: "from-blue-400 to-sky-300",
                  },
                  {
                    step: 3,
                    title: "이동, 크기 조절, 회전",
                    desc: "배치한 블록을 원하는 위치로 이동하고, 크기와 방향을 자유롭게 바꿔보세요.",
                    tips: [
                      "Move(이동): 블록을 원하는 곳으로 옮겨요",
                      "Scale(크기): 블록을 크게 또는 작게 만들어요",
                      "Rotate(회전): 블록을 원하는 방향으로 돌려요",
                    ],
                    color: "from-purple-400 to-violet-300",
                  },
                  {
                    step: 4,
                    title: "색상과 재질 꾸미기",
                    desc: "블록에 예쁜 색상을 입히고 다양한 재질(나무, 돌, 유리 등)을 적용해 보세요.",
                    tips: [
                      "Properties 창에서 BrickColor로 색상을 변경해요",
                      "Material 속성으로 나무, 돌, 유리 등의 재질을 선택해요",
                      "Transparency로 투명도도 조절할 수 있어요",
                    ],
                    color: "from-pink-400 to-rose-300",
                  },
                  {
                    step: 5,
                    title: "건물 만들기",
                    desc: "벽, 바닥, 지붕을 조합해서 집이나 건물을 완성해 보세요!",
                    tips: [
                      "얇고 긴 블록으로 벽을 만들어요",
                      "넓고 얇은 블록으로 바닥과 천장을 만들어요",
                      "빈 공간을 남겨서 문과 창문을 표현해요",
                    ],
                    color: "from-orange-400 to-amber-300",
                  },
                  {
                    step: 6,
                    title: "Toolbox로 모델 추가하기",
                    desc: "Toolbox에서 다른 사람들이 만든 가구, 나무, 장식물 등을 가져와서 꾸며보세요.",
                    tips: [
                      "View 탭에서 Toolbox를 열어요",
                      "검색으로 원하는 모델을 찾을 수 있어요",
                      "가져온 모델의 크기와 위치를 조절해요",
                    ],
                    color: "from-teal-400 to-cyan-300",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className={`bg-gradient-to-r ${item.color} flex items-center gap-4 px-6 py-4`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/30 text-lg font-bold text-white">
                        {item.step}
                      </span>
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    </div>
                    <div className="p-6">
                      <p className="mb-4 text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                        <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">💡 팁</p>
                        <ul className="space-y-1.5">
                          {item.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                              <span className="mt-0.5 text-blue-500">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section className="py-16">
              <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
                ⌨️ 유용한 단축키
              </h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[
                    { key: "Ctrl + Z", action: "실행 취소 (되돌리기)" },
                    { key: "Ctrl + Y", action: "다시 실행" },
                    { key: "Ctrl + D", action: "선택한 것 복제하기" },
                    { key: "Ctrl + C / V", action: "복사 / 붙여넣기" },
                    { key: "Delete", action: "선택한 것 삭제하기" },
                    { key: "F5", action: "게임 테스트 실행하기" },
                    { key: "R", action: "회전 도구" },
                    { key: "T", action: "크기 조절 도구" },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between px-6 py-4">
                      <kbd className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {shortcut.key}
                      </kbd>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{shortcut.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 dark:bg-white dark:text-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로 돌아가기
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white/50 px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-5xl text-center text-sm text-zinc-400 dark:text-zinc-500">
          <p>&copy; 2026 진유현의 로블록스 건축 클리커 🏗️</p>
        </div>
      </footer>

      {/* --- OFFLINE REWARD MODAL --- */}
      {offlineReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-blue-400 bg-gradient-to-b from-blue-50 to-white shadow-2xl dark:border-blue-700 dark:from-zinc-900 dark:to-zinc-950">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 p-5 text-center text-white">
              <span className="text-5xl">🌙</span>
              <h2 className="mt-2 text-2xl font-black">오프라인 건축!</h2>
              <p className="text-sm text-blue-100">
                {offlineReward.minutes >= 60
                  ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                  : `${offlineReward.minutes}분`} 동안 자동 건축했어요!
              </p>
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <span className="text-sm text-amber-600 dark:text-amber-400">블록 획득</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">🧱 +{formatNumber(offlineReward.blocksGained)}</span>
              </div>
              <button onClick={() => setOfflineReward(null)} className="mt-2 w-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 py-3 text-lg font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                받기! 🎁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Float-up animation */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}
