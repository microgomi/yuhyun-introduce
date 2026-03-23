"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "shop" | "arena" | "battle" | "reward" | "gameOver";
type Action = "attack" | "defend" | "dodge" | "skill";

interface Fighter {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  energy: number;
  maxEnergy: number;
}

interface SkillType {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  energyCost: number;
  damage: number;
  effect?: "stun" | "bleed" | "heal" | "doubleStrike";
}

interface Opponent {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  reward: number;
  skills: string[];
  desc: string;
  tier: number;
}

// --- Constants ---
const SKILLS: SkillType[] = [
  { id: "slash", name: "강타", emoji: "⚔️", desc: "강력한 일격!", energyCost: 2, damage: 25 },
  { id: "shield", name: "방패 올리기", emoji: "🛡️", desc: "다음 공격 피해 80% 감소", energyCost: 1, damage: 0, effect: "heal" },
  { id: "stun", name: "방패 치기", emoji: "💫", desc: "적을 기절시켜요!", energyCost: 3, damage: 15, effect: "stun" },
  { id: "bleed", name: "베기", emoji: "🩸", desc: "출혈! 3턴간 매턴 피해", energyCost: 2, damage: 10, effect: "bleed" },
  { id: "fury", name: "분노", emoji: "😤", desc: "2회 연속 공격!", energyCost: 3, damage: 18, effect: "doubleStrike" },
  { id: "heal", name: "회복", emoji: "💚", desc: "체력을 회복해요", energyCost: 2, damage: 0, effect: "heal" },
];

const OPPONENTS: Opponent[] = [
  { name: "훈련병", emoji: "🧑‍🌾", hp: 80, atk: 8, def: 3, spd: 4, reward: 30, skills: ["slash"], desc: "이제 막 검을 잡은 초보", tier: 1 },
  { name: "도적", emoji: "🥷", hp: 100, atk: 12, def: 4, spd: 7, reward: 50, skills: ["slash", "bleed"], desc: "빠르고 교활한 도적", tier: 1 },
  { name: "기사", emoji: "🤺", hp: 150, atk: 14, def: 8, spd: 5, reward: 80, skills: ["slash", "shield"], desc: "갑옷을 입은 기사", tier: 2 },
  { name: "바이킹", emoji: "🧔", hp: 180, atk: 18, def: 6, spd: 5, reward: 100, skills: ["slash", "fury"], desc: "거친 북방의 전사", tier: 2 },
  { name: "암살자", emoji: "🗡️", hp: 120, atk: 22, def: 5, spd: 9, reward: 120, skills: ["bleed", "stun", "fury"], desc: "그림자 속의 암살자", tier: 3 },
  { name: "장군", emoji: "⚔️", hp: 220, atk: 20, def: 10, spd: 6, reward: 150, skills: ["slash", "stun", "shield"], desc: "전장의 지휘관", tier: 3 },
  { name: "마왕", emoji: "👹", hp: 300, atk: 25, def: 12, spd: 7, reward: 250, skills: ["slash", "fury", "stun", "bleed"], desc: "어둠의 마왕!", tier: 4 },
  { name: "드래곤", emoji: "🐉", hp: 400, atk: 30, def: 15, spd: 8, reward: 400, skills: ["fury", "stun", "bleed", "slash"], desc: "전설의 드래곤!", tier: 4 },
];

const SHOP_ITEMS = [
  { id: "sword1", name: "강철검", emoji: "🗡️", cost: 50, stat: "atk" as const, bonus: 3, desc: "공격력 +3" },
  { id: "sword2", name: "마법검", emoji: "⚔️", cost: 150, stat: "atk" as const, bonus: 6, desc: "공격력 +6" },
  { id: "sword3", name: "전설의 검", emoji: "🔱", cost: 350, stat: "atk" as const, bonus: 12, desc: "공격력 +12" },
  { id: "armor1", name: "가죽갑옷", emoji: "🦺", cost: 40, stat: "def" as const, bonus: 3, desc: "방어력 +3" },
  { id: "armor2", name: "철갑옷", emoji: "🛡️", cost: 120, stat: "def" as const, bonus: 6, desc: "방어력 +6" },
  { id: "armor3", name: "용비늘갑옷", emoji: "💎", cost: 300, stat: "def" as const, bonus: 12, desc: "방어력 +12" },
  { id: "boots1", name: "가죽부츠", emoji: "👢", cost: 30, stat: "spd" as const, bonus: 2, desc: "속도 +2" },
  { id: "boots2", name: "날개신발", emoji: "👟", cost: 100, stat: "spd" as const, bonus: 5, desc: "속도 +5" },
  { id: "potion", name: "체력물약", emoji: "🧪", cost: 60, stat: "maxHp" as const, bonus: 30, desc: "최대 체력 +30" },
  { id: "elixir", name: "엘릭서", emoji: "✨", cost: 200, stat: "maxHp" as const, bonus: 80, desc: "최대 체력 +80" },
];

export default function GladiatorPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(0);
  const [player, setPlayer] = useState<Fighter>({
    name: "검투사", emoji: "🤺", hp: 120, maxHp: 120, atk: 12, def: 5, spd: 6, energy: 5, maxEnergy: 5,
  });
  const [enemy, setEnemy] = useState<Fighter | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Battle state
  const [turn, setTurn] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [playerStunned, setPlayerStunned] = useState(false);
  const [enemyStunned, setEnemyStunned] = useState(false);
  const [playerBleed, setPlayerBleed] = useState(0);
  const [enemyBleed, setEnemyBleed] = useState(0);
  const [playerDefending, setPlayerDefending] = useState(false);
  const [enemyDefending, setEnemyDefending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");
  const [shakeTarget, setShakeTarget] = useState<"player" | "enemy" | null>(null);
  const [earnedReward, setEarnedReward] = useState(0);

  const logRef = useRef<HTMLDivElement>(null);

  // Scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  const addLog = useCallback((msg: string) => {
    setBattleLog((prev) => [...prev, msg]);
  }, []);

  // Start battle
  const startBattle = useCallback((opp: Opponent) => {
    setSelectedOpponent(opp);
    const tierMul = 1 + (opp.tier - 1) * 0.1;
    setEnemy({
      name: opp.name,
      emoji: opp.emoji,
      hp: opp.hp,
      maxHp: opp.hp,
      atk: opp.atk,
      def: opp.def,
      spd: opp.spd,
      energy: 4,
      maxEnergy: 4,
    });
    setPlayer((prev) => ({ ...prev, hp: prev.maxHp, energy: prev.maxEnergy }));
    setTurn(1);
    setIsPlayerTurn(player.spd >= opp.spd);
    setBattleLog([`⚔️ ${opp.emoji} ${opp.name}과(와) 전투 시작!`]);
    setPlayerStunned(false);
    setEnemyStunned(false);
    setPlayerBleed(0);
    setEnemyBleed(0);
    setPlayerDefending(false);
    setEnemyDefending(false);
    setAnimating(false);
    setLastAction("");
    setShakeTarget(null);
    setScreen("battle");
  }, [player.spd]);

  // Calculate damage
  const calcDamage = (attacker: Fighter, defender: Fighter, baseDmg: number, defending: boolean): number => {
    const raw = baseDmg + attacker.atk - defender.def * (defending ? 3 : 1);
    const variance = 0.8 + Math.random() * 0.4;
    return Math.max(1, Math.floor(raw * variance));
  };

  // Player action
  const doPlayerAction = useCallback((action: Action, skillId?: string) => {
    if (animating || !isPlayerTurn || !enemy) return;
    setAnimating(true);

    let newEnemy = { ...enemy };
    let newPlayer = { ...player };
    let newEnemyStunned = enemyStunned;
    let newEnemyBleed = enemyBleed;
    setPlayerDefending(false);

    // Bleed damage to player
    if (playerBleed > 0) {
      const bleedDmg = 5;
      newPlayer.hp -= bleedDmg;
      addLog(`🩸 출혈 피해 ${bleedDmg}!`);
      setPlayerBleed(playerBleed - 1);
    }

    if (playerStunned) {
      addLog("💫 기절 상태라 행동할 수 없어요!");
      setPlayerStunned(false);
      setAnimating(false);
      setPlayer(newPlayer);
      setEnemy(newEnemy);
      setTimeout(() => enemyTurn(newPlayer, newEnemy, newEnemyStunned, newEnemyBleed), 1000);
      return;
    }

    if (action === "attack") {
      const dmg = calcDamage(newPlayer, newEnemy, 10, enemyDefending);
      newEnemy.hp -= dmg;
      setShakeTarget("enemy");
      setLastAction(`⚔️ 공격! ${dmg} 피해!`);
      addLog(`⚔️ 공격! ${newEnemy.emoji}에게 ${dmg} 피해!`);
      newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + 1);
    } else if (action === "defend") {
      setPlayerDefending(true);
      setLastAction("🛡️ 방어 자세!");
      addLog("🛡️ 방어 자세! 다음 공격 피해 감소!");
      newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + 2);
    } else if (action === "dodge") {
      const dodgeChance = 0.4 + newPlayer.spd * 0.03;
      if (Math.random() < dodgeChance) {
        setLastAction("💨 회피 준비! 다음 공격을 피할 거예요!");
        addLog("💨 회피 자세!");
      } else {
        setLastAction("💨 회피 준비...");
        addLog("💨 회피 자세를 잡았어요!");
      }
      newPlayer.energy = Math.min(newPlayer.maxEnergy, newPlayer.energy + 1);
    } else if (action === "skill" && skillId) {
      const skill = SKILLS.find((s) => s.id === skillId);
      if (!skill || newPlayer.energy < skill.energyCost) {
        setAnimating(false);
        return;
      }
      newPlayer.energy -= skill.energyCost;

      if (skill.effect === "heal") {
        if (skill.id === "shield") {
          setPlayerDefending(true);
          setLastAction(`${skill.emoji} ${skill.name}!`);
          addLog(`${skill.emoji} ${skill.name}! 피해 대폭 감소!`);
        } else {
          const healAmt = 25 + Math.floor(Math.random() * 15);
          newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + healAmt);
          setLastAction(`${skill.emoji} ${healAmt} 회복!`);
          addLog(`${skill.emoji} 체력 ${healAmt} 회복!`);
        }
      } else if (skill.effect === "stun") {
        const dmg = calcDamage(newPlayer, newEnemy, skill.damage, enemyDefending);
        newEnemy.hp -= dmg;
        newEnemyStunned = true;
        setShakeTarget("enemy");
        setLastAction(`${skill.emoji} ${dmg} 피해 + 기절!`);
        addLog(`${skill.emoji} ${skill.name}! ${dmg} 피해! 적 기절!`);
      } else if (skill.effect === "bleed") {
        const dmg = calcDamage(newPlayer, newEnemy, skill.damage, enemyDefending);
        newEnemy.hp -= dmg;
        newEnemyBleed = 3;
        setShakeTarget("enemy");
        setLastAction(`${skill.emoji} ${dmg} 피해 + 출혈!`);
        addLog(`${skill.emoji} ${skill.name}! ${dmg} 피해! 3턴 출혈!`);
      } else if (skill.effect === "doubleStrike") {
        const dmg1 = calcDamage(newPlayer, newEnemy, skill.damage, enemyDefending);
        const dmg2 = calcDamage(newPlayer, newEnemy, skill.damage, false);
        newEnemy.hp -= (dmg1 + dmg2);
        setShakeTarget("enemy");
        setLastAction(`${skill.emoji} ${dmg1}+${dmg2} 피해!`);
        addLog(`${skill.emoji} ${skill.name}! ${dmg1}+${dmg2} 연속 피해!`);
      } else {
        const dmg = calcDamage(newPlayer, newEnemy, skill.damage, enemyDefending);
        newEnemy.hp -= dmg;
        setShakeTarget("enemy");
        setLastAction(`${skill.emoji} ${dmg} 피해!`);
        addLog(`${skill.emoji} ${skill.name}! ${dmg} 피해!`);
      }
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setEnemyStunned(newEnemyStunned);
    setEnemyBleed(newEnemyBleed);
    setEnemyDefending(false);

    setTimeout(() => setShakeTarget(null), 400);

    // Check enemy death
    if (newEnemy.hp <= 0) {
      setTimeout(() => {
        const reward = selectedOpponent?.reward ?? 0;
        const streakBonus = Math.floor(reward * streak * 0.1);
        const total = reward + streakBonus;
        setGold((g) => g + total);
        setWins((w) => w + 1);
        setStreak((s) => {
          const ns = s + 1;
          if (ns > bestStreak) setBestStreak(ns);
          return ns;
        });
        setEarnedReward(total);
        addLog(`🏆 승리! ${total} 골드 획득!`);
        setAnimating(false);
        setScreen("reward");
      }, 800);
      return;
    }

    // Enemy turn after delay
    setTimeout(() => {
      setAnimating(false);
      enemyTurn(newPlayer, newEnemy, newEnemyStunned, newEnemyBleed);
    }, 1000);
  }, [animating, isPlayerTurn, enemy, player, playerStunned, enemyStunned, enemyBleed, playerBleed, enemyDefending, selectedOpponent, streak, bestStreak, addLog]);

  // Enemy AI turn
  const enemyTurn = useCallback((currentPlayer: Fighter, currentEnemy: Fighter, stunned: boolean, bleed: number) => {
    if (!selectedOpponent) return;
    setAnimating(true);
    setIsPlayerTurn(false);

    let newPlayer = { ...currentPlayer };
    let newEnemy = { ...currentEnemy };
    let newPlayerStunned = playerStunned;
    let newPlayerBleed = playerBleed;
    setEnemyDefending(false);

    // Bleed damage to enemy
    if (bleed > 0) {
      const bleedDmg = 5;
      newEnemy.hp -= bleedDmg;
      addLog(`🩸 ${newEnemy.emoji} 출혈 피해 ${bleedDmg}!`);
      setEnemyBleed(bleed - 1);
    }

    if (stunned) {
      addLog(`💫 ${newEnemy.emoji} 기절 상태!`);
      setEnemyStunned(false);
      setPlayer(newPlayer);
      setEnemy(newEnemy);
      setTimeout(() => {
        setAnimating(false);
        setIsPlayerTurn(true);
        setTurn((t) => t + 1);
      }, 1000);
      return;
    }

    // AI decision
    const hpRatio = newEnemy.hp / newEnemy.maxHp;
    const hasEnergy = newEnemy.energy >= 2;
    const availableSkills = selectedOpponent.skills
      .map((sid) => SKILLS.find((s) => s.id === sid))
      .filter((s): s is SkillType => !!s && newEnemy.energy >= s.energyCost);

    let action: string;

    if (hpRatio < 0.3 && availableSkills.find((s) => s.effect === "heal") && Math.random() < 0.5) {
      action = "heal";
    } else if (availableSkills.length > 0 && Math.random() < 0.4) {
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      action = skill.id;
    } else if (hpRatio < 0.5 && Math.random() < 0.3) {
      action = "defend";
    } else {
      action = "attack";
    }

    if (action === "attack") {
      const dodgeChance = playerDefending ? 0 : 0.2 + newPlayer.spd * 0.02;
      if (Math.random() < dodgeChance && !playerDefending) {
        addLog(`${newEnemy.emoji} 공격! → 💨 회피 성공!`);
      } else {
        const dmg = calcDamage(newEnemy, newPlayer, 10, playerDefending);
        newPlayer.hp -= dmg;
        setShakeTarget("player");
        addLog(`${newEnemy.emoji} 공격! ${dmg} 피해!`);
        setTimeout(() => setShakeTarget(null), 400);
      }
      newEnemy.energy = Math.min(newEnemy.maxEnergy, newEnemy.energy + 1);
    } else if (action === "defend") {
      setEnemyDefending(true);
      addLog(`${newEnemy.emoji} 방어 자세!`);
      newEnemy.energy = Math.min(newEnemy.maxEnergy, newEnemy.energy + 2);
    } else {
      const skill = SKILLS.find((s) => s.id === action);
      if (skill) {
        newEnemy.energy -= skill.energyCost;
        if (skill.effect === "heal") {
          const healAmt = 20 + Math.floor(Math.random() * 10);
          newEnemy.hp = Math.min(newEnemy.maxHp, newEnemy.hp + healAmt);
          addLog(`${newEnemy.emoji} ${skill.emoji} ${skill.name}! ${healAmt} 회복!`);
        } else if (skill.effect === "stun") {
          const dmg = calcDamage(newEnemy, newPlayer, skill.damage, playerDefending);
          newPlayer.hp -= dmg;
          newPlayerStunned = true;
          setShakeTarget("player");
          addLog(`${newEnemy.emoji} ${skill.emoji} ${skill.name}! ${dmg} 피해 + 기절!`);
          setTimeout(() => setShakeTarget(null), 400);
        } else if (skill.effect === "bleed") {
          const dmg = calcDamage(newEnemy, newPlayer, skill.damage, playerDefending);
          newPlayer.hp -= dmg;
          newPlayerBleed = 3;
          setShakeTarget("player");
          addLog(`${newEnemy.emoji} ${skill.emoji} ${skill.name}! ${dmg} 피해 + 출혈!`);
          setTimeout(() => setShakeTarget(null), 400);
        } else if (skill.effect === "doubleStrike") {
          const dmg1 = calcDamage(newEnemy, newPlayer, skill.damage, playerDefending);
          const dmg2 = calcDamage(newEnemy, newPlayer, skill.damage, false);
          newPlayer.hp -= (dmg1 + dmg2);
          setShakeTarget("player");
          addLog(`${newEnemy.emoji} ${skill.emoji} ${skill.name}! ${dmg1}+${dmg2} 피해!`);
          setTimeout(() => setShakeTarget(null), 400);
        } else {
          const dmg = calcDamage(newEnemy, newPlayer, skill.damage, playerDefending);
          newPlayer.hp -= dmg;
          setShakeTarget("player");
          addLog(`${newEnemy.emoji} ${skill.emoji} ${skill.name}! ${dmg} 피해!`);
          setTimeout(() => setShakeTarget(null), 400);
        }
      }
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setPlayerStunned(newPlayerStunned);
    setPlayerBleed(newPlayerBleed);
    setPlayerDefending(false);

    // Check player death
    if (newPlayer.hp <= 0) {
      setTimeout(() => {
        setLosses((l) => l + 1);
        setStreak(0);
        addLog("💀 패배...");
        setAnimating(false);
        setScreen("gameOver");
      }, 800);
      return;
    }

    setTimeout(() => {
      setAnimating(false);
      setIsPlayerTurn(true);
      setTurn((t) => t + 1);
    }, 1200);
  }, [selectedOpponent, playerDefending, playerStunned, playerBleed, addLog]);

  // Buy shop item
  const buyItem = (itemId: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || ownedItems.includes(itemId) || gold < item.cost) return;
    setGold((g) => g - item.cost);
    setOwnedItems((prev) => [...prev, itemId]);
    setPlayer((prev) => ({
      ...prev,
      [item.stat]: (prev[item.stat] as number) + item.bonus,
      ...(item.stat === "maxHp" ? { hp: prev.hp + item.bonus } : {}),
    }));
  };

  const hpPercent = (hp: number, max: number) => Math.max(0, (hp / max) * 100);
  const energyDots = (e: number, max: number) => Array.from({ length: max }, (_, i) => i < e);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-stone-950 via-red-950 to-stone-950 text-white">
      <style jsx global>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .shake { animation: shake 0.2s ease-in-out 2; }
        @keyframes slashIn { 0%{opacity:0;transform:rotate(-30deg) scale(0.5)} 100%{opacity:1;transform:rotate(0) scale(1)} }
        .slash-in { animation: slashIn 0.3s ease-out; }
        @keyframes fadeUp { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-30px)} }
        .fade-up { animation: fadeUp 1s ease-out forwards; }
      `}</style>

      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">⚔️</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">검투사</span>
          </h1>
          <p className="text-lg text-slate-400">아레나에서 최강의 검투사가 되어라!</p>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setScreen("arena")} className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-10 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
              ⚔️ 아레나
            </button>
            <button onClick={() => setScreen("shop")} className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 px-10 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
              🛒 상점
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-4 space-y-1 backdrop-blur">
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-slate-400">🏆 전적: <span className="text-green-400 font-bold">{wins}승</span> <span className="text-red-400 font-bold">{losses}패</span></p>
            <p className="text-sm text-slate-400">🔥 최고 연승: <span className="font-bold text-orange-400">{bestStreak}</span></p>
          </div>

          <div className="mt-2 rounded-xl bg-white/5 px-6 py-3 space-y-1">
            <p className="text-xs font-bold text-amber-400">🤺 내 검투사</p>
            <p className="text-xs text-slate-400">❤️ {player.maxHp} | ⚔️ {player.atk} | 🛡️ {player.def} | 💨 {player.spd}</p>
          </div>
        </div>
      )}

      {/* Shop */}
      {screen === "shop" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">🛒 상점</h2>
          <p className="text-yellow-400 font-bold">💰 {gold} 골드</p>
          <div className="w-full max-w-sm space-y-2">
            {SHOP_ITEMS.map((item) => {
              const owned = ownedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => buyItem(item.id)}
                  disabled={owned || gold < item.cost}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    owned ? "border-green-500/30 bg-green-500/10 opacity-60"
                    : gold >= item.cost ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95"
                    : "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  {owned ? <span className="text-xs text-green-400 font-bold">보유</span>
                    : <span className="text-xs text-yellow-400 font-bold">{item.cost}💰</span>}
                </button>
              );
            })}
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-2 text-xs text-slate-400">
            ❤️ {player.maxHp} | ⚔️ {player.atk} | 🛡️ {player.def} | 💨 {player.spd}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* Arena - Opponent Select */}
      {screen === "arena" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h2 className="text-2xl font-black">⚔️ 아레나</h2>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {OPPONENTS.map((opp) => (
              <button
                key={opp.name}
                onClick={() => startBattle(opp)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-white/10 bg-white/5 p-3 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:scale-105 active:scale-95"
              >
                <span className="text-3xl">{opp.emoji}</span>
                <span className="text-sm font-bold">{opp.name}</span>
                <span className="text-[10px] text-slate-400">{opp.desc}</span>
                <div className="flex gap-2 text-[10px] text-slate-500">
                  <span>❤️{opp.hp}</span>
                  <span>⚔️{opp.atk}</span>
                  <span>🛡️{opp.def}</span>
                </div>
                <span className="text-[10px] text-yellow-400">🏆 {opp.reward}💰</span>
              </button>
            ))}
          </div>
          <button onClick={() => setScreen("menu")} className="text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* Battle */}
      {screen === "battle" && enemy && (
        <div className="flex min-h-screen flex-col items-center px-4 pt-4">
          {/* Turn indicator */}
          <div className="mb-3 rounded-lg bg-white/10 px-4 py-1 text-sm">
            ⚔️ 턴 {turn} | {isPlayerTurn ? "🤺 내 차례" : `${enemy.emoji} 상대 차례`}
          </div>

          {/* Fighters */}
          <div className="mb-4 flex w-full max-w-sm items-start justify-between gap-4">
            {/* Player */}
            <div className={`flex flex-1 flex-col items-center rounded-xl border-2 p-3 ${
              isPlayerTurn ? "border-cyan-500 bg-cyan-500/10" : "border-white/10 bg-white/5"
            } ${shakeTarget === "player" ? "shake" : ""}`}>
              <span className="text-4xl">🤺</span>
              <span className="text-sm font-bold text-cyan-400">검투사</span>
              <div className="mt-2 w-full">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${hpPercent(player.hp, player.maxHp)}%` }} />
                </div>
                <p className="text-[10px] text-center text-slate-400">{Math.max(0, Math.floor(player.hp))}/{player.maxHp}</p>
              </div>
              <div className="mt-1 flex gap-0.5">
                {energyDots(player.energy, player.maxEnergy).map((filled, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${filled ? "bg-yellow-400" : "bg-gray-700"}`} />
                ))}
              </div>
              {playerStunned && <span className="text-xs text-yellow-400">💫 기절</span>}
              {playerBleed > 0 && <span className="text-xs text-red-400">🩸 출혈({playerBleed})</span>}
              {playerDefending && <span className="text-xs text-blue-400">🛡️ 방어중</span>}
            </div>

            <div className="mt-8 text-2xl font-black text-amber-400">VS</div>

            {/* Enemy */}
            <div className={`flex flex-1 flex-col items-center rounded-xl border-2 p-3 ${
              !isPlayerTurn ? "border-red-500 bg-red-500/10" : "border-white/10 bg-white/5"
            } ${shakeTarget === "enemy" ? "shake" : ""}`}>
              <span className="text-4xl">{enemy.emoji}</span>
              <span className="text-sm font-bold text-red-400">{enemy.name}</span>
              <div className="mt-2 w-full">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all" style={{ width: `${hpPercent(enemy.hp, enemy.maxHp)}%` }} />
                </div>
                <p className="text-[10px] text-center text-slate-400">{Math.max(0, Math.floor(enemy.hp))}/{enemy.maxHp}</p>
              </div>
              <div className="mt-1 flex gap-0.5">
                {energyDots(enemy.energy, enemy.maxEnergy).map((filled, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${filled ? "bg-yellow-400" : "bg-gray-700"}`} />
                ))}
              </div>
              {enemyStunned && <span className="text-xs text-yellow-400">💫 기절</span>}
              {enemyBleed > 0 && <span className="text-xs text-red-400">🩸 출혈({enemyBleed})</span>}
              {enemyDefending && <span className="text-xs text-blue-400">🛡️ 방어중</span>}
            </div>
          </div>

          {/* Last action */}
          {lastAction && (
            <div className="mb-3 slash-in text-lg font-black text-amber-300">{lastAction}</div>
          )}

          {/* Action buttons */}
          {isPlayerTurn && !animating && (
            <div className="w-full max-w-sm space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => doPlayerAction("attack")} className="rounded-xl bg-red-600 px-4 py-3 font-bold transition-transform hover:scale-105 active:scale-90">
                  ⚔️ 공격
                </button>
                <button onClick={() => doPlayerAction("defend")} className="rounded-xl bg-blue-600 px-4 py-3 font-bold transition-transform hover:scale-105 active:scale-90">
                  🛡️ 방어
                </button>
                <button onClick={() => doPlayerAction("dodge")} className="rounded-xl bg-green-600 px-4 py-3 font-bold transition-transform hover:scale-105 active:scale-90">
                  💨 회피
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SKILLS.slice(0, 6).map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => doPlayerAction("skill", skill.id)}
                    disabled={player.energy < skill.energyCost}
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition-transform hover:scale-105 active:scale-90 ${
                      player.energy >= skill.energyCost
                        ? "bg-purple-600 hover:bg-purple-500"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {skill.emoji} {skill.name}
                    <div className="text-[10px] text-yellow-300">⚡{skill.energyCost}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isPlayerTurn && (
            <div className="mt-2 animate-pulse text-sm text-slate-400">상대가 행동 중...</div>
          )}

          {/* Battle Log */}
          <div ref={logRef} className="mt-4 h-28 w-full max-w-sm overflow-y-auto rounded-xl bg-black/30 p-3 text-xs text-slate-300 space-y-1">
            {battleLog.map((log, i) => (
              <p key={i} className={i === battleLog.length - 1 ? "text-white font-bold" : ""}>{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Reward */}
      {screen === "reward" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🏆</div>
          <h2 className="text-4xl font-black text-amber-400">승리!</h2>
          <p className="text-lg text-green-300">{selectedOpponent?.emoji} {selectedOpponent?.name}을(를) 이겼어요!</p>
          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p className="text-yellow-400 font-bold text-xl">+{earnedReward} 💰</p>
            <p className="text-sm text-slate-400">🔥 연승: {streak}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen("arena")} className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              ⚔️ 다음 상대
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴로
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === "gameOver" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">💀</div>
          <h2 className="text-4xl font-black text-red-400">패배...</h2>
          <p className="text-lg text-slate-300">{selectedOpponent?.emoji} {selectedOpponent?.name}에게 졌어요</p>
          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>⚔️ 진행 턴: <span className="font-bold text-cyan-400">{turn}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => selectedOpponent && startBattle(selectedOpponent)} className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 재도전
            </button>
            <button onClick={() => setScreen("arena")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              상대 선택
            </button>
            <button onClick={() => setScreen("menu")} className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
