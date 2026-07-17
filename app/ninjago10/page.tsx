"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "title" | "select" | "hub" | "battle" | "story" | "shop" | "skills" | "training";

interface Ninja { id: string; name: string; icon: string; element: string; elementIcon: string; bgGradient: string; hp: number; maxHp: number; atk: number; def: number; spd: number; energy: number; maxEnergy: number; special: string; specialIcon: string; specialDmg: number; specialCost: number; }
interface Skill { id: string; name: string; icon: string; dmg: number; cost: number; effect?: string; unlockLevel: number; learned: boolean; }
interface Enemy { id: string; name: string; icon: string; hp: number; maxHp: number; atk: number; def: number; special?: string; isBoss: boolean; }
interface Chapter { id: number; title: string; subtitle: string; icon: string; enemies: Omit<Enemy, "hp" | "maxHp">[]; boss: Omit<Enemy, "hp" | "maxHp">; reward: string; bgGradient: string; completed: boolean; }

// ============================================================
// DATA - 닌자고 시즌 10: 오니의 행진
// ============================================================
const NINJAS: Ninja[] = [
  { id: "lloyd_green", name: "로이드", icon: "💚⚡", element: "에너지", elementIcon: "💚⚡", bgGradient: "from-green-700 to-yellow-800", hp: 145, maxHp: 145, atk: 26, def: 17, spd: 16, energy: 85, maxEnergy: 85, special: "골든 에너지", specialIcon: "💚✨", specialDmg: 92, specialCost: 38 },
  { id: "kai_fire", name: "카이", icon: "🔴🔥", element: "불", elementIcon: "🔥", bgGradient: "from-red-700 to-yellow-800", hp: 125, maxHp: 125, atk: 27, def: 13, spd: 15, energy: 72, maxEnergy: 72, special: "파이어 스트라이크", specialIcon: "🔥⚔️", specialDmg: 80, specialCost: 34 },
  { id: "jay_lightning", name: "제이", icon: "💙⚡", element: "번개", elementIcon: "⚡", bgGradient: "from-blue-600 to-yellow-800", hp: 112, maxHp: 112, atk: 24, def: 12, spd: 23, energy: 76, maxEnergy: 76, special: "라이트닝 체인", specialIcon: "⚡💫", specialDmg: 72, specialCost: 31 },
  { id: "cole_earth", name: "콜", icon: "⚫🪨", element: "땅", elementIcon: "🪨", bgGradient: "from-stone-700 to-yellow-800", hp: 160, maxHp: 160, atk: 22, def: 24, spd: 10, energy: 66, maxEnergy: 66, special: "어스 파운드", specialIcon: "🪨💥", specialDmg: 82, specialCost: 36 },
  { id: "zane_ice", name: "쟌", icon: "🤍❄️", element: "얼음", elementIcon: "❄️", bgGradient: "from-cyan-700 to-yellow-800", hp: 130, maxHp: 130, atk: 23, def: 19, spd: 15, energy: 76, maxEnergy: 76, special: "아이스 서지", specialIcon: "❄️💎", specialDmg: 74, specialCost: 33 },
  { id: "nya_water", name: "니아", icon: "💧🌊", element: "물", elementIcon: "🌊", bgGradient: "from-blue-700 to-yellow-800", hp: 120, maxHp: 120, atk: 24, def: 16, spd: 17, energy: 74, maxEnergy: 74, special: "워터 스트라이크", specialIcon: "🌊💥", specialDmg: 76, specialCost: 32 },
  { id: "garmadon_ally", name: "가마돈", icon: "😈⚔️", element: "파괴", elementIcon: "😈💀", bgGradient: "from-purple-800 to-yellow-800", hp: 155, maxHp: 155, atk: 30, def: 15, spd: 11, energy: 70, maxEnergy: 70, special: "파괴의 힘", specialIcon: "😈💥", specialDmg: 95, specialCost: 40 },
];

const ALL_SKILLS: Skill[] = [
  { id: "golden_armor", name: "골든 아머", icon: "🥇⚔️", dmg: 42, cost: 20, unlockLevel: 1, learned: false },
  { id: "oni_titan", name: "오니 타이탄", icon: "👹💪", dmg: 52, cost: 26, unlockLevel: 2, learned: false },
  { id: "darkness_destroy", name: "어둠 소멸", icon: "✨🌑", dmg: 60, cost: 30, unlockLevel: 3, learned: false },
  { id: "tornado_creation", name: "토네이도 오브 크리에이션", icon: "🌪️✨", dmg: 120, cost: 55, unlockLevel: 12, learned: false },
  { id: "golden_shield", name: "황금 방어", icon: "🛡️🥇", dmg: 0, cost: 22, effect: "shield", unlockLevel: 4, learned: false },
  { id: "oni_poison", name: "오니 독", icon: "👹☠️", dmg: 28, cost: 17, effect: "poison", unlockLevel: 5, learned: false },
  { id: "dark_paralysis", name: "마비의 어둠", icon: "🌑⚡", dmg: 38, cost: 22, effect: "stun", unlockLevel: 6, learned: false },
  { id: "creation_spinjitzu", name: "창조의 스핀짓주", icon: "🌀✨", dmg: -60, cost: 28, effect: "heal", unlockLevel: 8, learned: false },
];

const STORY: Omit<Chapter, "completed">[] = [
  {
    id: 1, title: "오니의 도착", subtitle: "오니들이 닌자고에 나타났다!", icon: "👹🌑",
    enemies: [
      { id: "oni1", name: "오니 전사", icon: "👹⚔️", atk: 18, def: 9, isBoss: false },
      { id: "oni2", name: "오니 전사", icon: "👹🗡️", atk: 20, def: 10, isBoss: false },
    ],
    boss: { id: "oni_general1", name: "오니 장군", icon: "👹⚔️", atk: 27, def: 14, special: "어둠의 파동", isBoss: true },
    reward: "골든 아머 해금", bgGradient: "from-yellow-900 to-gray-950",
  },
  {
    id: 2, title: "어둠이 퍼지다", subtitle: "어둠이 닌자고를 집어삼킨다", icon: "🌑💨",
    enemies: [
      { id: "oni3", name: "오니 마법사", icon: "👹🔮", atk: 22, def: 11, special: "어둠 마법", isBoss: false },
      { id: "oni4", name: "어둠의 파괴자", icon: "👹💀", atk: 24, def: 15, isBoss: false },
    ],
    boss: { id: "oni_king1", name: "오니 왕", icon: "👹👑", atk: 30, def: 16, special: "어둠의 지배", isBoss: true },
    reward: "오니 타이탄 해금", bgGradient: "from-gray-950 to-purple-950",
  },
  {
    id: 3, title: "가마돈과의 동맹", subtitle: "적이었던 가마돈과 힘을 합치다!", icon: "🤝😈",
    enemies: [
      { id: "oni5", name: "오니 전사", icon: "👹⚔️💀", atk: 25, def: 13, special: "오니 러시", isBoss: false },
      { id: "oni6", name: "오니 마법사", icon: "👹🔮💀", atk: 27, def: 14, special: "어둠 폭풍", isBoss: false },
    ],
    boss: { id: "oni_general2", name: "오니 장군 (강화)", icon: "👹⚔️💀", atk: 35, def: 18, special: "오니 포스", isBoss: true },
    reward: "어둠 소멸 해금", bgGradient: "from-purple-950 to-yellow-950",
  },
  {
    id: 4, title: "수도원 방어", subtitle: "닌자 수도원을 지켜라!", icon: "🏯🛡️",
    enemies: [
      { id: "oni7", name: "어둠의 파괴자", icon: "👹💀🌑", atk: 29, def: 16, special: "파괴의 손", isBoss: false },
      { id: "oni8", name: "오니 전사", icon: "👹⚔️🌑", atk: 31, def: 18, special: "어둠 베기", isBoss: false },
    ],
    boss: { id: "oni_king2", name: "오니 왕 (강화)", icon: "👹👑💀", atk: 39, def: 20, special: "어둠의 군주", isBoss: true },
    reward: "황금 방어 + 오니 독 해금", bgGradient: "from-yellow-950 to-gray-950",
  },
  {
    id: 5, title: "골든 아머", subtitle: "골든 아머의 진정한 힘을 각성하라!", icon: "🥇✨",
    enemies: [
      { id: "oni9", name: "오니 마법사", icon: "👹🔮👑", atk: 33, def: 19, special: "어둠 소환", isBoss: false },
      { id: "oni10", name: "어둠의 파괴자", icon: "👹💀👑", atk: 35, def: 17, special: "파괴의 파동", isBoss: false },
    ],
    boss: { id: "omega1", name: "오메가", icon: "👹💀", atk: 43, def: 22, special: "절대 어둠", isBoss: true },
    reward: "마비의 어둠 해금", bgGradient: "from-yellow-950 to-purple-950",
  },
  {
    id: 6, title: "토네이도 오브 크리에이션", subtitle: "닌자들의 궁극의 합체 기술!", icon: "🌪️✨",
    enemies: [
      { id: "oni11", name: "오니 전사", icon: "👹⚔️💀👑", atk: 38, def: 22, special: "오니 분노", isBoss: false },
      { id: "oni12", name: "오니 마법사", icon: "👹🔮💀🌑", atk: 40, def: 20, special: "어둠 폭발", isBoss: false },
    ],
    boss: { id: "omega2", name: "오메가 (강화)", icon: "👹💀🌑", atk: 48, def: 25, special: "무한 어둠", isBoss: true },
    reward: "창조의 스핀짓주 해금", bgGradient: "from-purple-950 to-yellow-950",
  },
  {
    id: 7, title: "최후의 전투", subtitle: "빛과 어둠의 최종 결전!", icon: "⚔️✨🌑",
    enemies: [
      { id: "oni13", name: "오니 전사", icon: "👹💀👑🌑", atk: 44, def: 26, special: "종말의 힘", isBoss: false },
      { id: "oni14", name: "어둠의 파괴자", icon: "👹🌑💀👑", atk: 42, def: 24, special: "절대 파괴", isBoss: false },
    ],
    boss: { id: "omega_final", name: "오메가 (최종)", icon: "👹💀🌑", atk: 58, def: 30, special: "세계 소멸", isBoss: true },
    reward: "토네이도 오브 크리에이션 해금", bgGradient: "from-yellow-950 to-red-950",
  },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Ninjago10() {
  const [screen, setScreen] = useState<Screen>("title");
  const [ninja, setNinja] = useState<Ninja | null>(null);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNext, setXpNext] = useState(30);
  const [coins, setCoins] = useState(80);
  const [bonusAtk, setBonusAtk] = useState(0);
  const [bonusDef, setBonusDef] = useState(0);
  const [bonusHp, setBonusHp] = useState(0);
  const [skills, setSkills] = useState<Skill[]>(ALL_SKILLS.map((s) => ({ ...s })));
  const [chapters, setChapters] = useState<Chapter[]>(STORY.map((s) => ({ ...s, completed: false })));
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [playerHp, setPlayerHp] = useState(0);
  const [playerEnergy, setPlayerEnergy] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isBattleOver, setIsBattleOver] = useState(false);
  const [battleResult, setBattleResult] = useState<"win" | "lose" | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [enemyQueue, setEnemyQueue] = useState<Enemy[]>([]);
  const [shieldActive, setShieldActive] = useState(false);
  const [enemyStunned, setEnemyStunned] = useState(false);
  const [enemyPoisoned, setEnemyPoisoned] = useState(0);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [battleLog]);

  const totalHp = () => (ninja?.maxHp ?? 0) + bonusHp;
  const totalAtk = () => (ninja?.atk ?? 0) + bonusAtk;
  const totalDef = () => (ninja?.def ?? 0) + bonusDef;

  const gainXp = (amount: number) => {
    let nx = xp + amount, nl = level, nxn = xpNext;
    while (nx >= nxn) { nx -= nxn; nl++; nxn = Math.floor(nxn * 1.25); setBonusAtk((a) => a + 2); setBonusDef((d) => d + 1); setBonusHp((h) => h + 12); }
    setXp(nx); setLevel(nl); setXpNext(nxn);
    setSkills((prev) => prev.map((s) => s.unlockLevel <= nl && !s.learned ? { ...s, learned: true } : s));
  };

  const startChapter = (ch: Chapter) => {
    if (!ninja) return;
    const allEnemies: Enemy[] = [
      ...ch.enemies.map((e) => ({ ...e, hp: 60 + ch.id * 35, maxHp: 60 + ch.id * 35 })),
      { ...ch.boss, hp: 120 + ch.id * 55, maxHp: 120 + ch.id * 55 },
    ];
    const first = allEnemies[0];
    setEnemy(first); setEnemyHp(first.hp); setPlayerHp(totalHp()); setPlayerEnergy(ninja.maxEnergy);
    setBattleLog([`⚔️ ${first.name} ${first.icon} 등장!`]);
    setIsBattleOver(false); setBattleResult(null); setCurrentChapter(ch.id);
    setEnemyQueue(allEnemies.slice(1)); setShieldActive(false); setEnemyStunned(false); setEnemyPoisoned(0);
    setScreen("battle");
  };

  const doAttack = (dmg: number, cost: number, name: string, icon: string, effect?: string) => {
    if (isBattleOver || !ninja || !enemy) return;
    if (playerEnergy < cost) return;
    const log: string[] = [];
    let eHp = enemyHp, pHp = playerHp, pEn = playerEnergy - cost;

    if (effect === "heal") {
      const heal = Math.abs(dmg) + Math.floor(totalDef() * 0.3);
      pHp = Math.min(totalHp(), pHp + heal);
      log.push(`${icon} ${heal} HP 회복!`);
    } else if (effect === "shield") {
      setShieldActive(true);
      log.push(`${icon} 황금 방어 발동!`);
    } else {
      let d = dmg + totalAtk() + Math.floor(Math.random() * 8);
      if (Math.random() < 0.15) { d = Math.floor(d * 2); log.push("💥 크리티컬!"); }
      d = Math.max(1, d - Math.floor(enemy.def * 0.25));
      eHp = Math.max(0, eHp - d);
      log.push(`${icon} ${name}! ${d} 데미지!`);
      if (effect === "stun") { setEnemyStunned(true); log.push("🌑 마비의 어둠! 적 마비!"); }
      if (effect === "poison") { setEnemyPoisoned(3); log.push("👹 오니 독이 퍼진다!"); }
    }

    // Poison tick
    if (enemyPoisoned > 0) {
      const pd = 10;
      eHp = Math.max(0, eHp - pd);
      log.push(`👹 독 ${pd} 데미지!`);
      setEnemyPoisoned((p) => p - 1);
    }

    if (eHp <= 0) {
      log.push(`🎉 ${enemy.name} 처치!`);
      if (enemyQueue.length > 0) {
        const next = enemyQueue[0];
        log.push(`⚔️ ${next.name} ${next.icon} 등장!`);
        setEnemy(next); setEnemyHp(next.hp); setEnemyQueue(enemyQueue.slice(1));
        setEnemyStunned(false); setEnemyPoisoned(0);
      } else {
        const xpGain = currentChapter ? 25 + currentChapter * 18 : 15;
        const coinGain = currentChapter ? 35 + currentChapter * 22 : 20;
        gainXp(xpGain); setCoins((c) => c + coinGain);
        log.push(`🏆 승리! +${xpGain}XP +${coinGain}🪙`);
        if (currentChapter) setChapters((prev) => prev.map((c) => c.id === currentChapter ? { ...c, completed: true } : c));
        setIsBattleOver(true); setBattleResult("win");
      }
      setPlayerHp(pHp); setPlayerEnergy(pEn);
      setBattleLog((prev) => [...prev, ...log]);
      return;
    }

    // Enemy turn
    if (enemyStunned) {
      log.push(`⚡ ${enemy.name}은(는) 마비 상태!`);
      setEnemyStunned(false);
    } else {
      let eDmg = enemy.atk + Math.floor(Math.random() * 6);
      if (enemy.special && Math.random() < 0.3) { eDmg = Math.floor(eDmg * 1.6); log.push(`💀 ${enemy.name}의 ${enemy.special}!`); }
      if (shieldActive) { eDmg = Math.floor(eDmg * 0.3); log.push("🛡️ 황금 방어가 막았다!"); setShieldActive(false); }
      eDmg = Math.max(1, eDmg - Math.floor(totalDef() * 0.25));
      pHp = Math.max(0, pHp - eDmg);
      log.push(`${enemy.icon} ${eDmg} 데미지!`);
    }
    pEn = Math.min(ninja.maxEnergy, pEn + 6);

    setEnemyHp(eHp); setPlayerHp(pHp); setPlayerEnergy(pEn);
    setBattleLog((prev) => [...prev, ...log]);
    if (pHp <= 0) { setBattleLog((prev) => [...prev, "💀 쓰러졌다..."]); setIsBattleOver(true); setBattleResult("lose"); }
  };

  const progress = chapters.filter((c) => c.completed).length;

  // ============================================================
  // SCREENS
  // ============================================================
  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900 via-gray-950 to-yellow-900 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">👹🥇</div>
          <h1 className="text-3xl font-black mb-1">닌자고 시즌 10</h1>
          <h2 className="text-xl text-yellow-400 mb-1">오니의 행진</h2>
          <p className="text-sm text-gray-400 mb-8">오니의 침략, 어둠이 닌자고를 집어삼킨다!</p>
          <div className="space-y-1.5 text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-sm text-gray-300">
            <p>👹 오니의 대규모 침공</p>
            <p>🌑 닌자고를 뒤덮는 어둠</p>
            <p>😈 가마돈과의 동맹</p>
            <p>🥇 골든 아머의 힘</p>
            <p>🌪️ 토네이도 오브 크리에이션!</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-yellow-700 to-gray-700 py-4 text-xl font-black hover:brightness-110 border border-yellow-400/30">
            🎮 시작하기
          </button>
        </div>
      </div>
    );
  }

  if (screen === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("title")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-2xl font-black mb-4 text-center">🥇 닌자 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {NINJAS.map((n) => (
              <button key={n.id} onClick={() => { setNinja(n); setScreen("hub"); }}
                className={`rounded-xl bg-gradient-to-br ${n.bgGradient} p-3 text-center hover:brightness-110 border border-white/10 active:scale-95`}>
                <div className="text-2xl mb-1">{n.icon}</div>
                <div className="font-bold text-sm">{n.name}</div>
                <div className="text-[10px] text-gray-300">{n.elementIcon} {n.element}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">HP:{n.maxHp} ATK:{n.atk} DEF:{n.def}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "hub" && ninja) {
    const nextCh = chapters.find((c) => !c.completed);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setScreen("select")} className="text-sm text-gray-400 hover:text-white">← 닌자 변경</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>
          <div className={`mb-3 rounded-xl bg-gradient-to-r ${ninja.bgGradient} p-4 border border-white/10`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{ninja.icon}</span>
              <div>
                <div className="font-black text-lg">{ninja.name} <span className="text-sm font-normal text-gray-300">Lv.{level}</span></div>
                <div className="text-xs text-gray-400">{ninja.elementIcon} {ninja.element}</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>❤️{totalHp()}</span><span>⚔️{totalAtk()}</span><span>🛡️{totalDef()}</span>
            </div>
            <div className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(xp / xpNext) * 100}%` }} />
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">XP: {xp}/{xpNext}</div>
          </div>
          {nextCh && (
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl bg-gradient-to-r from-yellow-800 to-gray-800 p-4 text-left hover:brightness-110 border border-yellow-500/30 animate-pulse">
              <div className="text-xs text-yellow-300 mb-1">📖 다음 스토리</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-yellow-900/30 p-4 text-center border border-yellow-500/30">
              <div className="text-3xl mb-1">🏆🥇✨</div>
              <div className="font-black text-yellow-300">오니의 행진 격퇴! 닌자고 구원!</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-yellow-800/50 p-3 text-center hover:brightness-110 border border-yellow-500/20">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/7)</div>
            </button>
            <button onClick={() => setScreen("skills")} className="rounded-xl bg-gray-800/50 p-3 text-center hover:brightness-110 border border-gray-500/20">
              <div className="text-xl">📜</div><div className="text-xs font-bold">스킬</div>
            </button>
            <button onClick={() => setScreen("training")} className="rounded-xl bg-red-800/50 p-3 text-center hover:brightness-110 border border-red-500/20">
              <div className="text-xl">🏋️</div><div className="text-xs font-bold">수련 (무료)</div>
            </button>
            <button onClick={() => setScreen("shop")} className="rounded-xl bg-yellow-800/50 p-3 text-center hover:brightness-110 border border-yellow-500/20">
              <div className="text-xl">🏪</div><div className="text-xs font-bold">상점</div>
            </button>
          </div>
          <button onClick={() => setPlayerHp(totalHp())} className="w-full rounded-lg bg-green-900/30 py-2 text-sm text-green-300 hover:bg-green-900/50 border border-green-500/20">🏥 휴식</button>
        </div>
      </div>
    );
  }

  if (screen === "story") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">📖 시즌 10 스토리</h2>
          <div className="space-y-2">
            {chapters.map((ch) => (
              <button key={ch.id} onClick={() => !ch.completed && startChapter(ch)} disabled={ch.completed}
                className={`w-full rounded-xl bg-gradient-to-r ${ch.bgGradient} p-3 text-left border ${ch.completed ? "border-green-500/20 opacity-70" : "border-white/10 hover:brightness-110"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ch.completed ? "✅" : ch.icon}</span>
                  <div><div className="font-bold text-sm">{ch.id}장. {ch.title}</div><div className="text-xs text-gray-300">{ch.subtitle}</div><div className="text-xs text-yellow-300 mt-0.5">🎁 {ch.reward}</div></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "skills") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">📜 스킬</h2>
          <div className="space-y-1.5">
            {skills.map((s) => (
              <div key={s.id} className={`rounded-lg p-2.5 border ${s.learned ? "bg-white/5 border-white/10" : "bg-gray-800/30 border-gray-700 opacity-40"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.learned ? s.icon : "🔒"}</span>
                  <div className="flex-1"><div className="text-sm font-bold">{s.name}</div><div className="text-[10px] text-gray-400">{s.dmg > 0 ? `⚔️${s.dmg}` : s.dmg < 0 ? `💚${Math.abs(s.dmg)}` : "🛡️"} | ⚡{s.cost} {s.effect ? `| ${s.effect}` : ""}</div></div>
                  {!s.learned && <span className="text-[10px] text-yellow-400">Lv.{s.unlockLevel}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "training") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">🏋️ 수련장</h2>
          {[
            { icon: "⚔️", name: "공격 수련", desc: `ATK +2 (현재: ${totalAtk()})`, action: () => { setBonusAtk((a) => a + 2); gainXp(10); } },
            { icon: "🛡️", name: "방어 수련", desc: `DEF +1 (현재: ${totalDef()})`, action: () => { setBonusDef((d) => d + 1); gainXp(10); } },
            { icon: "❤️", name: "체력 수련", desc: `HP +12 (현재: ${totalHp()})`, action: () => { setBonusHp((h) => h + 12); gainXp(10); } },
          ].map((t) => (
            <button key={t.name} onClick={t.action} className="w-full mb-2 rounded-xl bg-white/5 p-4 text-left hover:bg-white/10 border border-white/10 active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div><div className="font-bold">{t.name}</div><div className="text-xs text-gray-400">{t.desc}</div></div>
                <span className="ml-auto text-green-400 text-sm">무료</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "shop") {
    const items = [
      { name: "HP 포션", icon: "❤️", cost: 30, action: () => setPlayerHp(totalHp()) },
      { name: "에너지 드링크", icon: "⚡", cost: 20, action: () => setPlayerEnergy(ninja?.maxEnergy ?? 0) },
      { name: "골든 강화 (ATK+5)", icon: "🥇⚔️", cost: 100, action: () => setBonusAtk((a) => a + 5) },
      { name: "오니 갑옷 (DEF+3)", icon: "👹🛡️", cost: 100, action: () => setBonusDef((d) => d + 3) },
      { name: "창조의 부스트 (HP+30)", icon: "🌪️❤️", cost: 100, action: () => setBonusHp((h) => h + 30) },
    ];
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setScreen("hub")} className="text-sm text-gray-400 hover:text-white">← 뒤로</button>
            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
          </div>
          <h2 className="text-xl font-black mb-3 text-center">🏪 상점</h2>
          {items.map((item) => (
            <button key={item.name} onClick={() => { if (coins >= item.cost) { setCoins((c) => c - item.cost); item.action(); } }} disabled={coins < item.cost}
              className="w-full mb-2 rounded-lg bg-white/5 p-3 text-left hover:bg-white/10 border border-white/10 disabled:opacity-30">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 font-bold text-sm">{item.name}</div>
                <span className="text-yellow-400 text-sm">🪙{item.cost}</span>
              </div>
            </button>
          ))}
          <button onClick={() => setCoins((c) => c + 50)} className="w-full mt-3 rounded-lg bg-green-800/50 py-2 text-sm text-green-300 hover:bg-green-800/80 border border-green-500/20">🎁 무료 코인 +50</button>
        </div>
      </div>
    );
  }

  if (screen === "battle" && ninja && enemy) {
    const learnedSkills = skills.filter((s) => s.learned);
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-950/30 via-gray-950 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-2 rounded-xl bg-black/40 p-3 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{enemy.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{enemy.name} {enemy.isBoss && <span className="text-[10px] bg-red-600 px-1 py-0.5 rounded">BOSS</span>}</div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(enemyHp / enemy.maxHp) * 100}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{enemyHp}/{enemy.maxHp} | 남은 적: {enemyQueue.length}</div>
                {enemyStunned && <span className="text-[10px] text-yellow-400">🌑마비</span>}
                {enemyPoisoned > 0 && <span className="text-[10px] text-green-400 ml-1">👹독({enemyPoisoned})</span>}
              </div>
            </div>
          </div>
          <div className={`mb-2 rounded-xl bg-gradient-to-r ${ninja.bgGradient} p-2.5 border border-white/10`}>
            <div className="flex gap-3 text-xs">
              <span>❤️{playerHp}/{totalHp()}</span><span>⚡{playerEnergy}/{ninja.maxEnergy}</span>
              {shieldActive && <span className="text-yellow-300">🛡️황금방어</span>}
            </div>
          </div>
          <div ref={logRef} className="mb-2 h-28 overflow-y-auto rounded-lg bg-black/50 p-2 text-xs border border-white/10 space-y-0.5">
            {battleLog.map((l, i) => <div key={i} className="text-gray-300">{l}</div>)}
          </div>
          {isBattleOver ? (
            <div className="text-center space-y-2">
              <div className={`text-lg font-black ${battleResult === "win" ? "text-yellow-400" : "text-red-400"}`}>
                {battleResult === "win" ? "🏆 승리!" : "💀 패배..."}
              </div>
              <button onClick={() => setScreen("hub")} className="w-full rounded-xl bg-gray-700 py-3 font-bold">돌아가기</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button onClick={() => doAttack(0, 0, "기본 공격", ninja.elementIcon)}
                className="w-full rounded-lg bg-red-800/50 py-2.5 font-bold hover:bg-red-800/70 border border-red-500/20">
                {ninja.elementIcon} 기본 공격
              </button>
              <div className="grid grid-cols-3 gap-1">
                {learnedSkills.slice(0, 6).map((s) => (
                  <button key={s.id} onClick={() => doAttack(s.dmg, s.cost, s.name, s.icon, s.effect)}
                    disabled={playerEnergy < s.cost}
                    className="rounded-lg bg-yellow-900/40 p-1.5 text-center hover:bg-yellow-900/60 border border-yellow-500/20 disabled:opacity-30 text-[10px]">
                    <div className="text-sm">{s.icon}</div>
                    <div className="font-bold truncate">{s.name}</div>
                    <div className="text-gray-400">⚡{s.cost}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
