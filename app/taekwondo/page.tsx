"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
interface Fighter {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  atk: number;
  def: number;
  speed: number;
  combo: number;
  guard: boolean;
  stunned: number;
  x: number;
  belt: string;
}

interface Skill {
  id: string;
  name: string;
  emoji: string;
  damage: number;
  staminaCost: number;
  hitChance: number;
  knockback: number;
  stunChance: number;
  desc: string;
  type: "punch" | "kick" | "special";
  comboReq: number;
}

interface Opponent {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  belt: string;
  style: string;
  reward: number;
  desc: string;
}

interface TrainingResult {
  stat: string;
  amount: number;
  message: string;
}

// --- Data ---
const SKILLS: Skill[] = [
  { id: "jab", name: "잽", emoji: "👊", damage: 8, staminaCost: 5, hitChance: 0.95, knockback: 0, stunChance: 0, desc: "빠른 기본 펀치", type: "punch", comboReq: 0 },
  { id: "front_kick", name: "앞차기", emoji: "🦶", damage: 12, staminaCost: 8, hitChance: 0.85, knockback: 5, stunChance: 0.05, desc: "기본 앞차기", type: "kick", comboReq: 0 },
  { id: "roundhouse", name: "돌려차기", emoji: "🌀", damage: 18, staminaCost: 12, hitChance: 0.80, knockback: 10, stunChance: 0.1, desc: "강력한 돌려차기", type: "kick", comboReq: 0 },
  { id: "side_kick", name: "옆차기", emoji: "➡️", damage: 15, staminaCost: 10, hitChance: 0.85, knockback: 15, stunChance: 0.1, desc: "밀어내는 옆차기", type: "kick", comboReq: 0 },
  { id: "back_kick", name: "뒤차기", emoji: "↩️", damage: 22, staminaCost: 15, hitChance: 0.70, knockback: 12, stunChance: 0.15, desc: "위력적인 뒤차기", type: "kick", comboReq: 1 },
  { id: "axe_kick", name: "내려차기", emoji: "⬇️", damage: 25, staminaCost: 18, hitChance: 0.65, knockback: 5, stunChance: 0.25, desc: "머리 위에서 내려찍기", type: "kick", comboReq: 1 },
  { id: "hook_kick", name: "후려차기", emoji: "🪝", damage: 20, staminaCost: 14, hitChance: 0.75, knockback: 8, stunChance: 0.2, desc: "회전 후려차기", type: "kick", comboReq: 1 },
  { id: "combo_kick", name: "연속차기", emoji: "💨", damage: 30, staminaCost: 20, hitChance: 0.70, knockback: 15, stunChance: 0.15, desc: "2연속 발차기!", type: "kick", comboReq: 2 },
  { id: "tornado", name: "태풍차기", emoji: "🌪️", damage: 35, staminaCost: 25, hitChance: 0.60, knockback: 20, stunChance: 0.3, desc: "회전하며 차기!", type: "special", comboReq: 2 },
  { id: "flying_kick", name: "뛰어차기", emoji: "🦅", damage: 40, staminaCost: 30, hitChance: 0.55, knockback: 25, stunChance: 0.35, desc: "점프해서 발차기!", type: "special", comboReq: 3 },
  { id: "hurricane", name: "허리케인킥", emoji: "🌊", damage: 50, staminaCost: 35, hitChance: 0.50, knockback: 30, stunChance: 0.4, desc: "최강의 회전 킥!", type: "special", comboReq: 3 },
  { id: "spirit_punch", name: "기합 정권", emoji: "🔥", damage: 60, staminaCost: 45, hitChance: 0.45, knockback: 20, stunChance: 0.5, desc: "기를 모아 일격!", type: "special", comboReq: 4 },
];

const OPPONENTS: Opponent[] = [
  { id: "o1", name: "초보 수련생", emoji: "🧒", hp: 80, atk: 6, def: 2, speed: 3, belt: "⬜ 백띠", style: "basic", reward: 30, desc: "이제 막 시작한 수련생" },
  { id: "o2", name: "노란띠 선배", emoji: "🧑", hp: 120, atk: 10, def: 4, speed: 4, belt: "🟨 노란띠", style: "kick", reward: 50, desc: "차기를 좋아하는 선배" },
  { id: "o3", name: "초록띠 선수", emoji: "🧑‍🦱", hp: 160, atk: 14, def: 6, speed: 5, belt: "🟩 초록띠", style: "balanced", reward: 80, desc: "균형잡힌 실력파" },
  { id: "o4", name: "파란띠 고수", emoji: "🧔", hp: 200, atk: 18, def: 8, speed: 6, belt: "🟦 파란띠", style: "aggressive", reward: 120, desc: "공격적인 스타일" },
  { id: "o5", name: "빨간띠 전사", emoji: "🥷", hp: 250, atk: 22, def: 10, speed: 7, belt: "🟥 빨간띠", style: "counter", reward: 160, desc: "반격의 달인" },
  { id: "o6", name: "검은띠 사범", emoji: "🧑‍🏫", hp: 300, atk: 28, def: 14, speed: 8, belt: "⬛ 검은띠 1단", style: "master", reward: 200, desc: "도장의 사범" },
  { id: "o7", name: "검은띠 관장", emoji: "👨‍🦳", hp: 400, atk: 35, def: 18, speed: 8, belt: "⬛ 검은띠 3단", style: "master", reward: 300, desc: "도장의 관장님" },
  { id: "o8", name: "국가대표", emoji: "🏅", hp: 500, atk: 40, def: 20, speed: 9, belt: "⬛ 검은띠 5단", style: "elite", reward: 500, desc: "대한민국 국가대표" },
  { id: "o9", name: "세계 챔피언", emoji: "🏆", hp: 600, atk: 50, def: 25, speed: 10, belt: "🥇 그랜드마스터", style: "legend", reward: 800, desc: "세계 태권도 챔피언!" },
  { id: "o10", name: "전설의 무도가", emoji: "🐉", hp: 800, atk: 60, def: 30, speed: 10, belt: "🌟 전설", style: "legend", reward: 1200, desc: "전설 속의 무도가" },
];

const BELTS = ["⬜ 백띠", "🟨 노란띠", "🟩 초록띠", "🟦 파란띠", "🟥 빨간띠", "⬛ 검은띠"];

type Screen = "menu" | "fight" | "training" | "shop" | "victory" | "defeat" | "belt_up";

export default function TaekwondoPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(100);
  const [beltIdx, setBeltIdx] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [highestOpponent, setHighestOpponent] = useState(0);

  // Player stats (persistent)
  const [baseHp, setBaseHp] = useState(100);
  const [baseAtk, setBaseAtk] = useState(10);
  const [baseDef, setBaseDef] = useState(5);
  const [baseSpeed, setBaseSpeed] = useState(5);
  const [baseStamina, setBaseStamina] = useState(80);

  // Fight state
  const [player, setPlayer] = useState<Fighter | null>(null);
  const [opponent, setOpponent] = useState<Fighter | null>(null);
  const [currentOpponent, setCurrentOpponent] = useState<Opponent>(OPPONENTS[0]);
  const [fightLog, setFightLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy" | "result">("player");
  const [animating, setAnimating] = useState(false);
  const [hitEffect, setHitEffect] = useState<"none" | "player" | "enemy">("none");
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);

  // Training
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [trainingCooldown, setTrainingCooldown] = useState(false);

  // Unlocked skills
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>(["jab", "front_kick", "roundhouse", "side_kick"]);

  // Shop items
  const [boughtItems, setBoughtItems] = useState<string[]>([]);

  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setFightLog((prev) => [...prev.slice(-12), msg]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  // Start fight
  const startFight = useCallback((opp: Opponent) => {
    setCurrentOpponent(opp);
    setPlayer({
      name: "나", emoji: "🥋", hp: baseHp, maxHp: baseHp, stamina: baseStamina, maxStamina: baseStamina,
      atk: baseAtk, def: baseDef, speed: baseSpeed, combo: 0, guard: false, stunned: 0, x: 80, belt: BELTS[beltIdx],
    });
    setOpponent({
      name: opp.name, emoji: opp.emoji, hp: opp.hp, maxHp: opp.hp, stamina: 100, maxStamina: 100,
      atk: opp.atk, def: opp.def, speed: opp.speed, combo: 0, guard: false, stunned: 0, x: 260, belt: opp.belt,
    });
    setFightLog([`⚔️ ${opp.belt} ${opp.name}와의 대련 시작!`]);
    setTurn("player");
    setAnimating(false);
    setScreen("fight");
  }, [baseHp, baseAtk, baseDef, baseSpeed, baseStamina, beltIdx]);

  // Player attack
  const playerAttack = useCallback((skill: Skill) => {
    if (turn !== "player" || animating || !player || !opponent) return;
    if (player.stamina < skill.staminaCost) { addLog("❌ 스태미나가 부족합니다!"); return; }
    if (player.stunned > 0) { addLog("😵 기절 상태! 행동 불가!"); setTurn("enemy"); return; }

    setAnimating(true);

    // Calculate hit
    const hitRoll = Math.random();
    const finalHitChance = skill.hitChance + (player.speed - opponent.speed) * 0.02;
    const isHit = hitRoll < finalHitChance;
    const isCrit = Math.random() < 0.1 + player.combo * 0.05;

    setPlayer((p) => p ? { ...p, stamina: p.stamina - skill.staminaCost } : p);

    if (isHit) {
      const rawDmg = skill.damage + player.atk - Math.floor(opponent.def * (opponent.guard ? 2 : 1));
      const dmg = Math.max(1, isCrit ? Math.floor(rawDmg * 1.5) : rawDmg);
      const isStun = Math.random() < skill.stunChance;

      setShakeEnemy(true);
      setTimeout(() => setShakeEnemy(false), 300);

      setOpponent((o) => o ? {
        ...o,
        hp: Math.max(0, o.hp - dmg),
        guard: false,
        stunned: isStun ? 2 : o.stunned,
        x: Math.min(320, o.x + skill.knockback),
      } : o);

      setPlayer((p) => p ? { ...p, combo: p.combo + 1 } : p);

      let msg = `${skill.emoji} ${skill.name}! ${dmg} 데미지!`;
      if (isCrit) msg = `💥 크리티컬! ${msg}`;
      if (isStun) msg += " 😵 기절!";
      addLog(msg);

      // Check KO
      setTimeout(() => {
        let ko = false;
        setOpponent((o) => {
          if (o && o.hp <= 0) {
            ko = true;
            const reward = currentOpponent.reward;
            setGold((g) => g + reward);
            setWins((w) => w + 1);
            if (OPPONENTS.indexOf(currentOpponent) >= highestOpponent) {
              setHighestOpponent(OPPONENTS.indexOf(currentOpponent) + 1);
            }
            addLog(`🏆 K.O.! 승리! +${reward}골드`);
            setTurn("result");
            setTimeout(() => setScreen("victory"), 500);
          }
          return o;
        });
        setAnimating(false);
        if (!ko) {
          setTimeout(() => enemyTurn(), 400);
        }
      }, 300);
    } else {
      addLog(`${skill.emoji} ${skill.name} 빗나감!`);
      setPlayer((p) => p ? { ...p, combo: 0 } : p);
      setAnimating(false);
      setTimeout(() => enemyTurn(), 400);
    }
  }, [turn, animating, player, opponent, currentOpponent, highestOpponent, addLog]);

  // Guard
  const playerGuard = useCallback(() => {
    if (turn !== "player" || animating || !player) return;
    setPlayer((p) => p ? { ...p, guard: true, stamina: Math.min(p.maxStamina, p.stamina + 10) } : p);
    addLog("🛡️ 방어 자세! 스태미나 회복!");
    setTimeout(() => enemyTurn(), 400);
  }, [turn, animating, player, addLog]);

  // Enemy turn
  const enemyTurn = useCallback(() => {
    setTurn("enemy");
    setTimeout(() => {
      setOpponent((o) => {
        if (!o) return o;
        if (o.stunned > 0) {
          addLog(`😵 ${o.name} 기절 중!`);
          setOpponent((prev) => prev ? { ...prev, stunned: prev.stunned - 1 } : prev);
          setTurn("player");
          // Stamina regen
          setPlayer((p) => p ? { ...p, stamina: Math.min(p.maxStamina, p.stamina + 5), guard: false, stunned: Math.max(0, p.stunned - 1) } : p);
          return o;
        }
        return o;
      });

      setOpponent((o) => {
        if (!o || o.stunned > 0 || o.hp <= 0) return o;

        // AI picks attack
        const availableSkills = SKILLS.filter((s) => s.comboReq <= 1 && s.staminaCost <= 20);
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        const hitRoll = Math.random();
        const isHit = hitRoll < skill.hitChance + (o.speed - (player?.speed ?? 5)) * 0.02;

        if (isHit) {
          setPlayer((p) => {
            if (!p) return p;
            const rawDmg = skill.damage + o.atk - Math.floor(p.def * (p.guard ? 2 : 1));
            const dmg = Math.max(1, rawDmg);
            const isStun = Math.random() < skill.stunChance;

            setShakePlayer(true);
            setTimeout(() => setShakePlayer(false), 300);

            let msg = `${o.emoji} ${o.name}의 ${skill.emoji} ${skill.name}! ${dmg} 데미지!`;
            if (isStun) msg += " 😵 기절!";
            addLog(msg);

            const newHp = Math.max(0, p.hp - dmg);
            if (newHp <= 0) {
              setLosses((l) => l + 1);
              addLog(`💀 K.O.! 패배...`);
              setTurn("result");
              setTimeout(() => setScreen("defeat"), 500);
              return { ...p, hp: 0 };
            }
            return { ...p, hp: newHp, stunned: isStun ? 2 : p.stunned, x: Math.max(20, p.x - skill.knockback) };
          });
        } else {
          addLog(`${o.emoji} ${o.name}의 ${skill.emoji} ${skill.name} 빗나감!`);
        }

        // Regen stamina
        setPlayer((p) => p ? { ...p, stamina: Math.min(p.maxStamina, p.stamina + 5), guard: false, stunned: Math.max(0, p.stunned - 1) } : p);
        setTurn("player");
        return o;
      });
    }, 600);
  }, [player, addLog]);

  // Training
  const doTraining = useCallback((type: "hp" | "atk" | "def" | "speed" | "stamina") => {
    if (trainingCooldown) return;
    const cost = 20;
    if (gold < cost) { setTrainingResult({ stat: "", amount: 0, message: "골드가 부족합니다!" }); return; }
    setGold((g) => g - cost);
    setTrainingCooldown(true);

    const amount = 2 + Math.floor(Math.random() * 3);
    let msg = "";

    switch (type) {
      case "hp": setBaseHp((h) => h + amount * 5); msg = `❤️ 체력 +${amount * 5}!`; break;
      case "atk": setBaseAtk((a) => a + amount); msg = `⚔️ 공격력 +${amount}!`; break;
      case "def": setBaseDef((d) => d + amount); msg = `🛡️ 방어력 +${amount}!`; break;
      case "speed": setBaseSpeed((s) => s + Math.ceil(amount / 2)); msg = `💨 속도 +${Math.ceil(amount / 2)}!`; break;
      case "stamina": setBaseStamina((s) => s + amount * 3); msg = `⚡ 스태미나 +${amount * 3}!`; break;
    }

    setTrainingResult({ stat: type, amount, message: msg });
    setTimeout(() => setTrainingCooldown(false), 500);
  }, [gold, trainingCooldown]);

  // Buy skill
  const buySkill = useCallback((skillId: string, cost: number) => {
    if (gold < cost || unlockedSkills.includes(skillId)) return;
    setGold((g) => g - cost);
    setUnlockedSkills((prev) => [...prev, skillId]);
  }, [gold, unlockedSkills]);

  // Belt promotion check
  const checkBeltUp = useCallback(() => {
    const required = [2, 4, 6, 8, 10];
    if (beltIdx < BELTS.length - 1 && wins >= required[beltIdx]) {
      setBeltIdx((b) => b + 1);
      setScreen("belt_up");
    }
  }, [wins, beltIdx]);

  useEffect(() => { checkBeltUp(); }, [wins, checkBeltUp]);

  const availableSkills = SKILLS.filter((s) => unlockedSkills.includes(s.id));

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-red-950 via-zinc-950 to-red-950 text-white">

      {/* MENU */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🥋</div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">태권도</span>
          </h1>
          <p className="text-lg text-red-300/60">대한민국 국기, 태권도!</p>
          <p className="text-xl font-bold">{BELTS[beltIdx]}</p>

          <div className="flex flex-col gap-3 mt-2 w-full max-w-xs">
            <button onClick={() => setScreen("fight")} className="rounded-xl bg-gradient-to-r from-red-600 to-orange-500 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              ⚔️ 대련
            </button>
            <button onClick={() => { setTrainingResult(null); setScreen("training"); }} className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              💪 수련
            </button>
            <button onClick={() => setScreen("shop")} className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
              🏪 도장 상점
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-6 py-3 space-y-1 w-full max-w-xs">
            <p className="text-sm text-red-300/60">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-red-300/60">🏆 전적: <span className="text-green-400">{wins}승</span> / <span className="text-red-400">{losses}패</span></p>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>❤️{baseHp}</span>
              <span>⚔️{baseAtk}</span>
              <span>🛡️{baseDef}</span>
              <span>💨{baseSpeed}</span>
              <span>⚡{baseStamina}</span>
            </div>
          </div>
        </div>
      )}

      {/* FIGHT SELECT */}
      {screen === "fight" && !player && (
        <div className="w-full max-w-md px-4 py-6">
          <h2 className="mb-4 text-2xl font-black">⚔️ 상대 선택</h2>
          <div className="space-y-2">
            {OPPONENTS.map((opp, i) => {
              const unlocked = i <= highestOpponent;
              return (
                <button key={opp.id} onClick={() => unlocked && startFight(opp)} disabled={!unlocked}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${unlocked ? "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]" : "border-gray-800 bg-black/20 opacity-40"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{unlocked ? opp.emoji : "🔒"}</span>
                    <div className="flex-1">
                      <p className="font-bold">{opp.name} <span className="text-xs">{opp.belt}</span></p>
                      <p className="text-xs text-slate-400">{opp.desc}</p>
                      <div className="text-[10px] text-zinc-500 flex gap-2 mt-1">
                        <span>❤️{opp.hp}</span><span>⚔️{opp.atk}</span><span>🛡️{opp.def}</span>
                      </div>
                    </div>
                    {unlocked && <span className="text-xs text-amber-400">💰{opp.reward}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => { setPlayer(null); setScreen("menu"); }} className="mt-4 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* FIGHT */}
      {screen === "fight" && player && opponent && (
        <div className="flex flex-col items-center pt-4 px-2 w-full max-w-md">
          {/* HP bars */}
          <div className="mb-3 flex w-full gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">🥋 나 ({BELTS[beltIdx]})</span>
                <span>{player.hp}/{player.maxHp}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} />
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800 mt-1">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all" style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }} />
              </div>
              <p className="text-[10px] text-yellow-400 mt-0.5">⚡ {player.stamina}/{player.maxStamina} | 콤보: {player.combo}x</p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">{opponent.emoji} {opponent.name}</span>
                <span>{opponent.hp}/{opponent.maxHp}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all" style={{ width: `${(opponent.hp / opponent.maxHp) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Arena */}
          <div className="relative w-full rounded-2xl border-2 border-red-500/30 bg-gradient-to-b from-amber-900/20 to-red-900/20 overflow-hidden" style={{ height: 200 }}>
            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-amber-800/40 to-red-800/40" />
            <div className="absolute bottom-8 left-0 right-0 h-px bg-amber-500/30" />

            {/* Player */}
            <div className={`absolute bottom-8 transition-all duration-200 ${shakePlayer ? "animate-pulse" : ""}`} style={{ left: player.x }}>
              <div className="flex flex-col items-center">
                {player.guard && <span className="text-xs text-blue-400">🛡️</span>}
                {player.stunned > 0 && <span className="text-xs">😵</span>}
                <span className="text-5xl">🥋</span>
              </div>
            </div>

            {/* Opponent */}
            <div className={`absolute bottom-8 transition-all duration-200 ${shakeEnemy ? "animate-pulse" : ""}`} style={{ left: opponent.x }}>
              <div className="flex flex-col items-center">
                {opponent.guard && <span className="text-xs text-blue-400">🛡️</span>}
                {opponent.stunned > 0 && <span className="text-xs">😵</span>}
                <span className="text-5xl scale-x-[-1]">{opponent.emoji}</span>
              </div>
            </div>

            {/* VS */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-black text-red-500/50">VS</div>
          </div>

          {/* Log */}
          <div ref={logRef} className="mt-2 h-20 w-full overflow-y-auto rounded-xl bg-black/50 border border-zinc-800 p-2 text-xs space-y-0.5">
            {fightLog.map((l, i) => (
              <p key={i} className={i === fightLog.length - 1 ? "text-white" : "text-zinc-500"}>{l}</p>
            ))}
          </div>

          {/* Skills */}
          {turn === "player" && (
            <div className="mt-2 w-full">
              <div className="grid grid-cols-3 gap-1.5">
                {availableSkills.filter((s) => s.comboReq <= player.combo).map((skill) => (
                  <button key={skill.id} onClick={() => playerAttack(skill)}
                    disabled={player.stamina < skill.staminaCost || animating}
                    className={`rounded-lg border p-2 text-[11px] text-left transition-all ${
                      player.stamina >= skill.staminaCost && !animating
                        ? "border-white/20 bg-white/10 hover:bg-white/20 active:scale-95"
                        : "border-gray-700 bg-black/30 opacity-40"
                    }`}>
                    <div className="flex items-center gap-1">
                      <span className="text-base">{skill.emoji}</span>
                      <div>
                        <p className="font-bold">{skill.name}</p>
                        <p className="text-[9px] text-zinc-400">⚡{skill.staminaCost} 💥{skill.damage}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <button onClick={playerGuard} disabled={animating}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-[11px] hover:bg-blue-500/20 active:scale-95">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🛡️</span>
                    <div>
                      <p className="font-bold">방어</p>
                      <p className="text-[9px] text-blue-400">⚡+10 회복</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {turn === "enemy" && <p className="mt-3 text-center text-zinc-400 animate-pulse">상대의 턴...</p>}
        </div>
      )}

      {/* TRAINING */}
      {screen === "training" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <h2 className="text-2xl font-black">💪 수련장</h2>
          <p className="text-zinc-400">골드 20으로 능력치를 올리세요!</p>
          <p className="text-yellow-400 font-bold">💰 {gold}</p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {[
              { type: "hp" as const, label: "체력 수련", emoji: "❤️", value: baseHp, desc: "모래주머니 차기" },
              { type: "atk" as const, label: "공격 수련", emoji: "⚔️", value: baseAtk, desc: "격파 연습" },
              { type: "def" as const, label: "방어 수련", emoji: "🛡️", value: baseDef, desc: "막기 훈련" },
              { type: "speed" as const, label: "속도 수련", emoji: "💨", value: baseSpeed, desc: "스텝 연습" },
              { type: "stamina" as const, label: "체력 수련", emoji: "⚡", value: baseStamina, desc: "달리기 훈련" },
            ].map((t) => (
              <button key={t.type} onClick={() => doTraining(t.type)}
                disabled={gold < 20 || trainingCooldown}
                className={`rounded-xl border p-4 text-left transition-all ${gold >= 20 ? "border-white/10 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95" : "border-gray-800 opacity-40"}`}>
                <span className="text-2xl">{t.emoji}</span>
                <p className="font-bold mt-1">{t.label}</p>
                <p className="text-xs text-zinc-400">{t.desc}</p>
                <p className="text-xs text-amber-400 mt-1">현재: {t.value} | 💰20</p>
              </button>
            ))}
          </div>

          {trainingResult && (
            <div className="rounded-xl bg-white/10 px-6 py-3 animate-bounce">
              <p className="font-bold text-green-400">{trainingResult.message}</p>
            </div>
          )}

          <button onClick={() => setScreen("menu")} className="mt-2 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* SHOP */}
      {screen === "shop" && (
        <div className="w-full max-w-md px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">🏪 도장 상점</h2>
            <p className="font-bold text-yellow-400">💰 {gold}</p>
          </div>

          <p className="mb-3 text-sm font-bold text-zinc-400">🥋 기술 습득</p>
          <div className="space-y-2">
            {SKILLS.filter((s) => !["jab", "front_kick", "roundhouse", "side_kick"].includes(s.id)).map((skill) => {
              const owned = unlockedSkills.includes(skill.id);
              const cost = skill.comboReq <= 1 ? 80 : skill.comboReq <= 2 ? 200 : skill.comboReq <= 3 ? 400 : 600;
              return (
                <div key={skill.id} className={`flex items-center gap-3 rounded-xl border p-3 ${owned ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                  <span className="text-2xl">{skill.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{skill.name}</p>
                    <p className="text-xs text-slate-400">{skill.desc}</p>
                    <p className="text-[10px] text-zinc-500">💥{skill.damage} ⚡{skill.staminaCost} | 콤보 {skill.comboReq}+ 필요</p>
                  </div>
                  {owned ? (
                    <span className="text-xs text-green-400">습득완료</span>
                  ) : (
                    <button onClick={() => buySkill(skill.id, cost)} disabled={gold < cost}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ${gold >= cost ? "bg-amber-500 text-black" : "bg-gray-700 text-gray-500"}`}>
                      💰{cost}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => setScreen("menu")} className="mt-4 text-sm text-slate-500 hover:text-white">← 뒤로</button>
        </div>
      )}

      {/* VICTORY */}
      {screen === "victory" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🏆</div>
          <h2 className="text-3xl font-black text-amber-400">승리!</h2>
          <p className="text-zinc-400">{currentOpponent.emoji} {currentOpponent.name}을 이겼다!</p>
          <p className="text-yellow-400 font-bold">+{currentOpponent.reward} 골드</p>
          <div className="flex gap-3">
            <button onClick={() => { setPlayer(null); setScreen("fight"); }} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">다음 상대</button>
            <button onClick={() => { setPlayer(null); setScreen("menu"); }} className="rounded-xl bg-white/10 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* DEFEAT */}
      {screen === "defeat" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">😵</div>
          <h2 className="text-3xl font-black text-red-400">패배...</h2>
          <p className="text-zinc-400">수련을 더 해야 합니다!</p>
          <div className="flex gap-3">
            <button onClick={() => startFight(currentOpponent)} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">🔄 재도전</button>
            <button onClick={() => { setPlayer(null); setScreen("menu"); }} className="rounded-xl bg-white/10 px-8 py-3 font-bold">메뉴</button>
          </div>
        </div>
      )}

      {/* BELT UP */}
      {screen === "belt_up" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl animate-bounce">🥋</div>
          <h2 className="text-3xl font-black text-amber-400">승급!</h2>
          <p className="text-2xl font-bold">{BELTS[beltIdx]}</p>
          <p className="text-zinc-400">축하합니다! 띠가 올라갔습니다!</p>
          <button onClick={() => setScreen("menu")} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold hover:scale-105 active:scale-95 transition-transform">계속</button>
        </div>
      )}
    </div>
  );
}
