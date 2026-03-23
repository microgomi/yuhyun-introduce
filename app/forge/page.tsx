"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "forge" | "inventory" | "result";
type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

interface Sword {
  id: number;
  name: string;
  emoji: string;
  level: number;
  atk: number;
  rarity: Rarity;
  effects: string[];
  glow: string;
}

// --- Constants ---
const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];
const RARITY_LABEL: Record<Rarity, string> = { common: "일반", rare: "레어", epic: "에픽", legendary: "전설", mythic: "신화" };
const RARITY_COLOR: Record<Rarity, string> = { common: "text-gray-300", rare: "text-blue-400", epic: "text-purple-400", legendary: "text-amber-400", mythic: "text-red-400" };
const RARITY_BG: Record<Rarity, string> = { common: "from-gray-600 to-gray-800", rare: "from-blue-600 to-blue-800", epic: "from-purple-600 to-purple-800", legendary: "from-amber-500 to-orange-600", mythic: "from-red-500 to-pink-600" };
const RARITY_BORDER: Record<Rarity, string> = { common: "border-gray-500", rare: "border-blue-500", epic: "border-purple-500", legendary: "border-amber-400", mythic: "border-red-400" };

const BASE_SWORDS: { name: string; emoji: string; atk: number }[] = [
  { name: "나무검", emoji: "🪵", atk: 5 },
  { name: "돌검", emoji: "🪨", atk: 10 },
  { name: "철검", emoji: "🗡️", atk: 18 },
  { name: "강철검", emoji: "⚔️", atk: 28 },
  { name: "미스릴검", emoji: "🔱", atk: 40 },
  { name: "다이아검", emoji: "💎", atk: 55 },
  { name: "용의검", emoji: "🐉", atk: 75 },
  { name: "천사의검", emoji: "👼", atk: 100 },
  { name: "마왕의검", emoji: "👹", atk: 130 },
  { name: "신의검", emoji: "⚡", atk: 170 },
];

const EFFECTS_POOL = [
  "🔥 화염 부여", "❄️ 빙결 부여", "⚡ 번개 부여", "💀 독 부여",
  "💨 신속 부여", "🛡️ 방어 관통", "💥 치명타 증가", "✨ 경험치 증가",
  "🩸 흡혈 부여", "🌀 회오리 부여", "☄️ 운석 부여", "🌟 축복 부여",
];

// Success rates by level
function getSuccessRate(level: number): number {
  if (level <= 3) return 90;
  if (level <= 5) return 75;
  if (level <= 7) return 60;
  if (level <= 9) return 45;
  if (level <= 12) return 30;
  if (level <= 15) return 20;
  if (level <= 18) return 12;
  if (level <= 20) return 8;
  return Math.max(3, 30 - level);
}

function getUpgradeCost(level: number): number {
  return Math.floor(20 + level * 15 + level * level * 3);
}

function getDestroyChance(level: number): number {
  if (level < 7) return 0;
  if (level < 10) return 5;
  if (level < 13) return 10;
  if (level < 16) return 20;
  if (level < 19) return 30;
  return 40;
}

function getDowngradeChance(level: number): number {
  if (level < 4) return 0;
  if (level < 7) return 20;
  return 40;
}

function getSwordRarity(level: number): Rarity {
  if (level >= 18) return "mythic";
  if (level >= 13) return "legendary";
  if (level >= 8) return "epic";
  if (level >= 4) return "rare";
  return "common";
}

function getSwordGlow(level: number): string {
  if (level >= 18) return "shadow-red-500/60 shadow-lg";
  if (level >= 13) return "shadow-amber-400/50 shadow-lg";
  if (level >= 8) return "shadow-purple-500/40 shadow-md";
  if (level >= 4) return "shadow-blue-400/30 shadow-md";
  return "";
}

let nextId = 1;

export default function ForgePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(500);
  const [sword, setSword] = useState<Sword>({
    id: nextId++, name: "나무검", emoji: "🪵", level: 0, atk: 5, rarity: "common", effects: [], glow: "",
  });
  const [inventory, setInventory] = useState<Sword[]>([]);
  const [resultMsg, setResultMsg] = useState("");
  const [resultType, setResultType] = useState<"success" | "fail" | "destroy" | "down">("fail");
  const [animating, setAnimating] = useState(false);
  const [hammerHit, setHammerHit] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [totalForges, setTotalForges] = useState(0);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalDestroy, setTotalDestroy] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [protectActive, setProtectActive] = useState(false);

  const protectCost = Math.floor(getUpgradeCost(sword.level) * 0.5);

  const updateSwordForLevel = useCallback((level: number, currentSword: Sword): Sword => {
    const baseIdx = Math.min(Math.floor(level / 2.5), BASE_SWORDS.length - 1);
    const base = BASE_SWORDS[baseIdx];
    const rarity = getSwordRarity(level);
    const bonusAtk = Math.floor(level * level * 0.8 + level * 3);
    const effects = [...currentSword.effects];

    // Add random effect at certain levels
    if (level > 0 && level % 3 === 0 && effects.length < 4) {
      const available = EFFECTS_POOL.filter((e) => !effects.includes(e));
      if (available.length > 0) {
        effects.push(available[Math.floor(Math.random() * available.length)]);
      }
    }

    return {
      ...currentSword,
      name: `+${level} ${base.name}`,
      emoji: base.emoji,
      level,
      atk: base.atk + bonusAtk,
      rarity,
      effects,
      glow: getSwordGlow(level),
    };
  }, []);

  // Forge attempt
  const doForge = useCallback(() => {
    const cost = getUpgradeCost(sword.level);
    const totalCost = cost + (protectActive ? protectCost : 0);
    if (gold < totalCost || animating) return;

    setGold((g) => g - totalCost);
    setAnimating(true);
    setTotalForges((t) => t + 1);

    // Hammer animation
    setHammerHit(true);
    setTimeout(() => setHammerHit(false), 300);
    setTimeout(() => { setHammerHit(true); setTimeout(() => setHammerHit(false), 300); }, 400);
    setTimeout(() => { setHammerHit(true); setTimeout(() => setHammerHit(false), 300); }, 800);

    // Result after animation
    setTimeout(() => {
      const rate = getSuccessRate(sword.level);
      const roll = Math.random() * 100;

      if (roll < rate) {
        // Success!
        const newLevel = sword.level + 1;
        const newSword = updateSwordForLevel(newLevel, sword);
        setSword(newSword);
        setResultMsg(`✨ +${newLevel} 강화 성공!`);
        setResultType("success");
        setSparkle(true);
        setTimeout(() => setSparkle(false), 1500);
        setTotalSuccess((t) => t + 1);
        if (newLevel > bestLevel) setBestLevel(newLevel);
      } else {
        // Fail
        const destroyChance = protectActive ? 0 : getDestroyChance(sword.level);
        const downgradeChance = protectActive ? 0 : getDowngradeChance(sword.level);
        const failRoll = Math.random() * 100;

        if (failRoll < destroyChance) {
          // Destroyed!
          setResultMsg(`💥 +${sword.level} ${sword.emoji} 파괴됨!`);
          setResultType("destroy");
          setTotalDestroy((t) => t + 1);
          // Save to inventory as broken, reset sword
          setInventory((prev) => [...prev, { ...sword, name: `💔 ${sword.name} (파괴)` }]);
          setSword({
            id: nextId++, name: "나무검", emoji: "🪵", level: 0, atk: 5, rarity: "common", effects: [], glow: "",
          });
        } else if (failRoll < destroyChance + downgradeChance) {
          // Downgrade
          const newLevel = Math.max(0, sword.level - 1);
          const newSword = updateSwordForLevel(newLevel, sword);
          setSword(newSword);
          setResultMsg(`📉 강화 실패! +${sword.level} → +${newLevel}`);
          setResultType("down");
        } else {
          // Just fail, no change
          setResultMsg(`❌ 강화 실패! (레벨 유지)`);
          setResultType("fail");
        }
      }

      setProtectActive(false);
      setAnimating(false);
    }, 1200);
  }, [sword, gold, animating, protectActive, protectCost, updateSwordForLevel, bestLevel]);

  // Save current sword to inventory
  const saveSword = () => {
    if (sword.level === 0) return;
    setInventory((prev) => [...prev, sword]);
    setSword({
      id: nextId++, name: "나무검", emoji: "🪵", level: 0, atk: 5, rarity: "common", effects: [], glow: "",
    });
  };

  // Earn gold
  const earnGold = () => {
    const amt = 50 + Math.floor(Math.random() * 50);
    setGold((g) => g + amt);
  };

  const rate = getSuccessRate(sword.level);
  const cost = getUpgradeCost(sword.level);
  const destroy = getDestroyChance(sword.level);
  const downgrade = getDowngradeChance(sword.level);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-stone-950 via-amber-950 to-stone-950 text-white">
      <style jsx global>{`
        @keyframes hammerSwing {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-40deg); }
          100% { transform: rotate(0deg); }
        }
        .hammer-hit { animation: hammerSwing 0.3s ease-in-out; }
        @keyframes sparkleAnim {
          0% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
        }
        .sparkle-anim { animation: sparkleAnim 1.5s ease-out; }
        @keyframes swordFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .sword-float { animation: swordFloat 2s ease-in-out infinite; }
        @keyframes shakeHard {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake-hard { animation: shakeHard 0.5s ease-in-out; }
        @keyframes glowPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
        .glow-pulse { animation: glowPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl sword-float">⚔️</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">검 강화</span>
          </h1>
          <p className="text-lg text-slate-400">최강의 검을 만들어라!</p>

          <button onClick={() => setScreen("forge")} className="mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
            🔨 강화하기
          </button>
          <button onClick={() => setScreen("inventory")} className="rounded-xl bg-white/10 px-12 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
            📦 보관함 ({inventory.length})
          </button>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-4 space-y-1 backdrop-blur">
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-slate-400">🔨 총 강화: <span className="font-bold text-orange-400">{totalForges}</span></p>
            <p className="text-sm text-slate-400">✅ 성공: <span className="font-bold text-green-400">{totalSuccess}</span></p>
            <p className="text-sm text-slate-400">💥 파괴: <span className="font-bold text-red-400">{totalDestroy}</span></p>
            <p className="text-sm text-slate-400">🏆 최고: <span className="font-bold text-amber-400">+{bestLevel}</span></p>
          </div>
        </div>
      )}

      {/* Forge */}
      {screen === "forge" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <button onClick={() => setScreen("menu")} className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">← 메뉴</button>

          <p className="text-yellow-400 font-bold text-lg">💰 {gold} 골드</p>

          {/* Sword Display */}
          <div className={`relative flex flex-col items-center rounded-2xl border-2 ${RARITY_BORDER[sword.rarity]} bg-gradient-to-b ${RARITY_BG[sword.rarity]} p-6 ${sword.glow} ${sparkle ? "glow-pulse" : ""} ${resultType === "destroy" && resultMsg ? "shake-hard" : ""}`}>
            {sparkle && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="sparkle-anim text-4xl">✨</span>
              </div>
            )}
            <span className={`text-7xl sword-float ${animating ? "" : ""}`}>{sword.emoji}</span>
            <p className={`mt-3 text-2xl font-black ${RARITY_COLOR[sword.rarity]}`}>
              {sword.level > 0 ? `+${sword.level}` : ""} {BASE_SWORDS[Math.min(Math.floor(sword.level / 2.5), BASE_SWORDS.length - 1)].name}
            </p>
            <p className={`text-sm font-bold ${RARITY_COLOR[sword.rarity]}`}>
              [{RARITY_LABEL[sword.rarity]}]
            </p>
            <p className="mt-2 text-lg font-bold">⚔️ 공격력: {sword.atk}</p>
            {sword.effects.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {sword.effects.map((e, i) => (
                  <span key={i} className="rounded-lg bg-black/30 px-2 py-0.5 text-xs">{e}</span>
                ))}
              </div>
            )}
          </div>

          {/* Result message */}
          {resultMsg && (
            <div className={`rounded-xl px-6 py-3 text-center font-bold ${
              resultType === "success" ? "bg-green-500/20 text-green-300" :
              resultType === "destroy" ? "bg-red-500/20 text-red-400" :
              resultType === "down" ? "bg-orange-500/20 text-orange-300" :
              "bg-gray-500/20 text-gray-300"
            }`}>
              {resultMsg}
            </div>
          )}

          {/* Forge info */}
          <div className="w-full max-w-xs rounded-xl bg-white/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">성공 확률</span>
              <span className={`font-bold ${rate >= 60 ? "text-green-400" : rate >= 30 ? "text-yellow-400" : "text-red-400"}`}>{rate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">비용</span>
              <span className="font-bold text-yellow-400">{cost} 💰</span>
            </div>
            {destroy > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">파괴 확률</span>
                <span className="font-bold text-red-400">{destroy}%</span>
              </div>
            )}
            {downgrade > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">하락 확률</span>
                <span className="font-bold text-orange-400">{downgrade}%</span>
              </div>
            )}
            {/* Success rate bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
              <div className={`h-full rounded-full transition-all ${
                rate >= 60 ? "bg-green-500" : rate >= 30 ? "bg-yellow-500" : "bg-red-500"
              }`} style={{ width: `${rate}%` }} />
            </div>
          </div>

          {/* Protect toggle */}
          {(destroy > 0 || downgrade > 0) && (
            <button
              onClick={() => setProtectActive(!protectActive)}
              className={`w-full max-w-xs rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                protectActive
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30"
              }`}
            >
              🛡️ 파괴/하락 방지 ({protectCost} 💰)
              {protectActive && " ✅"}
            </button>
          )}

          {/* Hammer button */}
          <div className="relative">
            <button
              onClick={doForge}
              disabled={gold < cost + (protectActive ? protectCost : 0) || animating}
              className={`rounded-2xl px-16 py-5 text-2xl font-black shadow-xl transition-transform ${
                gold >= cost + (protectActive ? protectCost : 0) && !animating
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 active:scale-90"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span className={hammerHit ? "hammer-hit inline-block" : "inline-block"}>🔨</span> 강화!
            </button>
          </div>

          {/* Extra buttons */}
          <div className="flex gap-3">
            <button onClick={earnGold} className="rounded-xl bg-yellow-600/30 px-6 py-2 text-sm font-bold text-yellow-400 transition-transform hover:scale-105 active:scale-95">
              ⛏️ 골드 벌기
            </button>
            {sword.level > 0 && (
              <button onClick={saveSword} className="rounded-xl bg-blue-600/30 px-6 py-2 text-sm font-bold text-blue-400 transition-transform hover:scale-105 active:scale-95">
                📦 보관하기
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inventory */}
      {screen === "inventory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">📦 보관함</h2>
          {inventory.length === 0 ? (
            <p className="text-slate-400">보관된 검이 없어요</p>
          ) : (
            <div className="w-full max-w-sm space-y-2 max-h-[60vh] overflow-y-auto">
              {[...inventory].reverse().map((s, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border-2 ${RARITY_BORDER[s.rarity]} bg-gradient-to-r ${RARITY_BG[s.rarity]} p-3`}>
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-bold ${RARITY_COLOR[s.rarity]}`}>{s.name}</p>
                    <p className="text-xs text-slate-300">⚔️ {s.atk} | [{RARITY_LABEL[s.rarity]}]</p>
                    {s.effects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.effects.map((e, j) => (
                          <span key={j} className="text-[10px] rounded bg-black/30 px-1">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}
    </div>
  );
}
