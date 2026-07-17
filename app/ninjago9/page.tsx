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
// DATA - 닌자고 시즌 9: 사냥꾼
// ============================================================
const NINJAS: Ninja[] = [
  { id: "lloyd_resistance", name: "로이드", icon: "💚🎖️", element: "저항군 리더", elementIcon: "💚⚡", bgGradient: "from-green-700 to-amber-900", hp: 140, maxHp: 140, atk: 25, def: 16, spd: 15, energy: 82, maxEnergy: 82, special: "저항의 에너지", specialIcon: "💚💥", specialDmg: 88, specialCost: 37 },
  { id: "kai_fire", name: "카이", icon: "🔴🔥", element: "불", elementIcon: "🔥", bgGradient: "from-red-700 to-amber-900", hp: 122, maxHp: 122, atk: 26, def: 12, spd: 14, energy: 70, maxEnergy: 70, special: "파이어 스트라이크", specialIcon: "🔥⚔️", specialDmg: 78, specialCost: 33 },
  { id: "jay_lightning", name: "제이", icon: "💙⚡", element: "번개", elementIcon: "⚡", bgGradient: "from-blue-600 to-amber-900", hp: 110, maxHp: 110, atk: 23, def: 11, spd: 22, energy: 74, maxEnergy: 74, special: "라이트닝 체인", specialIcon: "⚡💫", specialDmg: 70, specialCost: 30 },
  { id: "cole_earth", name: "콜", icon: "⚫🪨", element: "땅", elementIcon: "🪨", bgGradient: "from-stone-700 to-amber-900", hp: 155, maxHp: 155, atk: 21, def: 23, spd: 9, energy: 64, maxEnergy: 64, special: "어스 파운드", specialIcon: "🪨💥", specialDmg: 80, specialCost: 35 },
  { id: "zane_ice", name: "쟌", icon: "🤍❄️", element: "얼음", elementIcon: "❄️", bgGradient: "from-cyan-700 to-amber-900", hp: 128, maxHp: 128, atk: 22, def: 18, spd: 14, energy: 74, maxEnergy: 74, special: "아이스 서지", specialIcon: "❄️💎", specialDmg: 72, specialCost: 32 },
  { id: "nya_water", name: "니아", icon: "💧🌊", element: "물", elementIcon: "🌊", bgGradient: "from-blue-700 to-amber-900", hp: 118, maxHp: 118, atk: 23, def: 15, spd: 16, energy: 72, maxEnergy: 72, special: "워터 스트라이크", specialIcon: "🌊💥", specialDmg: 74, specialCost: 31 },
];

const ALL_SKILLS: Skill[] = [
  { id: "resistance_flame", name: "저항의 불꽃", icon: "🔥🎖️", dmg: 40, cost: 18, unlockLevel: 1, learned: false },
  { id: "dragon_ride", name: "드래곤 라이드", icon: "🐉🏇", dmg: 50, cost: 25, unlockLevel: 2, learned: false },
  { id: "chain_attack", name: "체인 공격", icon: "⛓️⚡", dmg: 35, cost: 20, effect: "stun", unlockLevel: 3, learned: false },
  { id: "dragon_breath", name: "드래곤 브레스", icon: "🐉🔥", dmg: 58, cost: 28, unlockLevel: 4, learned: false },
  { id: "poison_gas", name: "독가스", icon: "☠️💨", dmg: 25, cost: 16, effect: "poison", unlockLevel: 5, learned: false },
  { id: "fortress_defense", name: "요새 방어", icon: "🛡️🏰", dmg: 0, cost: 20, effect: "shield", unlockLevel: 6, learned: false },
  { id: "hot_spring_heal", name: "치유의 온천", icon: "♨️💚", dmg: -58, cost: 26, effect: "heal", unlockLevel: 8, learned: false },
  { id: "firstbourne_power", name: "퍼스트본의 힘", icon: "🐉👑", dmg: 95, cost: 48, unlockLevel: 12, learned: false },
];

const STORY: Omit<Chapter, "completed">[] = [
  {
    id: 1, title: "사냥꾼의 영역", subtitle: "드래곤 사냥꾼들의 세계에 도착하다", icon: "🏜️⛓️",
    enemies: [
      { id: "hunter1", name: "드래곤 헌터", icon: "⛓️👤", atk: 16, def: 8, isBoss: false },
      { id: "hunter2", name: "드래곤 헌터", icon: "⛓️🗡️", atk: 18, def: 9, isBoss: false },
    ],
    boss: { id: "jet_jack1", name: "제트 잭", icon: "🏍️⚡", atk: 25, def: 13, special: "제트 러시", isBoss: true },
    reward: "저항의 불꽃 해금", bgGradient: "from-amber-900 to-gray-950",
  },
  {
    id: 2, title: "드래곤 사냥", subtitle: "사냥꾼들이 드래곤을 포획한다", icon: "🐉⛓️",
    enemies: [
      { id: "hunter3", name: "사냥꾼 전사", icon: "⛓️⚔️", atk: 20, def: 10, special: "체인 바인드", isBoss: false },
      { id: "hunter4", name: "체인 마스터", icon: "⛓️💪", atk: 22, def: 14, isBoss: false },
    ],
    boss: { id: "daddy_noleg", name: "대디 노레그", icon: "🦿", atk: 29, def: 15, special: "앵무새 공격", isBoss: true },
    reward: "드래곤 라이드 해금", bgGradient: "from-amber-950 to-red-950",
  },
  {
    id: 3, title: "저항군 결성", subtitle: "닌자고에서 저항군이 일어나다", icon: "🎖️💚",
    enemies: [
      { id: "garma_soldier1", name: "가마돈 부하", icon: "😈👤", atk: 23, def: 11, special: "다크 슬래시", isBoss: false },
      { id: "garma_soldier2", name: "가마돈 부하", icon: "😈🗡️", atk: 25, def: 12, isBoss: false },
    ],
    boss: { id: "garmadon_gen", name: "가마돈 장군", icon: "😈⚔️", atk: 33, def: 16, special: "파괴의 명령", isBoss: true },
    reward: "체인 공격 해금", bgGradient: "from-green-950 to-amber-950",
  },
  {
    id: 4, title: "아이언 배런", subtitle: "드래곤 헌터의 리더와 대면하다", icon: "⛓️👑",
    enemies: [
      { id: "hunter5", name: "사냥꾼 전사", icon: "⛓️💀", atk: 27, def: 14, special: "드래곤 독", isBoss: false },
      { id: "hunter6", name: "체인 마스터", icon: "⛓️🔥", atk: 29, def: 16, special: "체인 스매시", isBoss: false },
    ],
    boss: { id: "iron_baron1", name: "아이언 배런", icon: "⛓️👑", atk: 37, def: 19, special: "드래곤 본 스태프", isBoss: true },
    reward: "드래곤 브레스 + 독가스 해금", bgGradient: "from-stone-900 to-amber-950",
  },
  {
    id: 5, title: "퍼스트본을 찾아서", subtitle: "전설의 퍼스트본 드래곤을 찾아라", icon: "🐉✨",
    enemies: [
      { id: "hunter7", name: "드래곤 헌터", icon: "⛓️🐉", atk: 31, def: 17, special: "드래곤 트랩", isBoss: false },
      { id: "hunter8", name: "사냥꾼 전사", icon: "⛓️⚡", atk: 33, def: 15, special: "전기 체인", isBoss: false },
    ],
    boss: { id: "iron_baron2", name: "아이언 배런 (강화)", icon: "⛓️👑💀", atk: 41, def: 21, special: "드래곤 헌터 아머", isBoss: true },
    reward: "요새 방어 해금", bgGradient: "from-amber-950 to-orange-950",
  },
  {
    id: 6, title: "드래곤 아머", subtitle: "골든 드래곤 아머의 힘을 얻어라!", icon: "🐉🛡️",
    enemies: [
      { id: "hunter9", name: "드래곤 헌터", icon: "⛓️💀🐉", atk: 36, def: 21, special: "드래곤 슬레이어", isBoss: false },
      { id: "hunter10", name: "체인 마스터", icon: "⛓️🔥💀", atk: 39, def: 19, special: "파이어 체인", isBoss: false },
    ],
    boss: { id: "daddy_noleg2", name: "대디 노레그 (강화)", icon: "🦿💀", atk: 45, def: 23, special: "해적 대포", isBoss: true },
    reward: "치유의 온천 해금", bgGradient: "from-orange-950 to-red-950",
  },
  {
    id: 7, title: "닌자고 탈환", subtitle: "가마돈으로부터 닌자고를 탈환하라!", icon: "⚔️🏙️",
    enemies: [
      { id: "garma_elite1", name: "가마돈 부하", icon: "😈💀👑", atk: 43, def: 25, special: "암흑 분쇄", isBoss: false },
      { id: "garma_elite2", name: "가마돈 부하", icon: "😈⚔️💀", atk: 41, def: 23, special: "파괴의 힘", isBoss: false },
    ],
    boss: { id: "garmadon_final", name: "가마돈 (최종)", icon: "😈💀", atk: 56, def: 29, special: "절대 파괴", isBoss: true },
    reward: "퍼스트본의 힘 해금", bgGradient: "from-red-950 to-amber-950",
  },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Ninjago9() {
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
      log.push(`${icon} 요새 방어 발동!`);
    } else {
      let d = dmg + totalAtk() + Math.floor(Math.random() * 8);
      if (Math.random() < 0.15) { d = Math.floor(d * 2); log.push("💥 크리티컬!"); }
      d = Math.max(1, d - Math.floor(enemy.def * 0.25));
      eHp = Math.max(0, eHp - d);
      log.push(`${icon} ${name}! ${d} 데미지!`);
      if (effect === "stun") { setEnemyStunned(true); log.push("⛓️ 체인 공격! 적 마비!"); }
      if (effect === "poison") { setEnemyPoisoned(3); log.push("☠️ 독가스가 퍼진다!"); }
    }

    // Poison tick
    if (enemyPoisoned > 0) {
      const pd = 10;
      eHp = Math.max(0, eHp - pd);
      log.push(`☠️ 독 ${pd} 데미지!`);
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
      if (shieldActive) { eDmg = Math.floor(eDmg * 0.3); log.push("🛡️ 요새 방어가 막았다!"); setShieldActive(false); }
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
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-stone-950 to-amber-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🐉⛓️</div>
          <h1 className="text-3xl font-black mb-1">닌자고 시즌 9</h1>
          <h2 className="text-xl text-amber-400 mb-1">사냥꾼</h2>
          <p className="text-sm text-gray-400 mb-8">드래곤 사냥꾼, 퍼스트본 드래곤, 그리고 저항!</p>
          <div className="space-y-1.5 text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-sm text-gray-300">
            <p>⛓️ 드래곤 사냥꾼들의 세계</p>
            <p>🐉 전설의 퍼스트본 드래곤</p>
            <p>🎖️ 로이드의 저항군</p>
            <p>🛡️ 드래곤 아머의 힘</p>
            <p>🏙️ 닌자고를 탈환하라!</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-stone-700 py-4 text-xl font-black hover:brightness-110 border border-amber-400/30">
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
          <h2 className="text-2xl font-black mb-4 text-center">🐉 닌자 선택</h2>
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
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(xp / xpNext) * 100}%` }} />
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">XP: {xp}/{xpNext}</div>
          </div>
          {nextCh && (
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl bg-gradient-to-r from-amber-800 to-stone-800 p-4 text-left hover:brightness-110 border border-amber-500/30 animate-pulse">
              <div className="text-xs text-amber-300 mb-1">📖 다음 스토리</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-amber-900/30 p-4 text-center border border-amber-500/30">
              <div className="text-3xl mb-1">🏆🐉✨</div>
              <div className="font-black text-amber-300">드래곤 사냥꾼 격퇴!</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-amber-800/50 p-3 text-center hover:brightness-110 border border-amber-500/20">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/7)</div>
            </button>
            <button onClick={() => setScreen("skills")} className="rounded-xl bg-stone-800/50 p-3 text-center hover:brightness-110 border border-stone-500/20">
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
          <h2 className="text-xl font-black mb-3 text-center">📖 시즌 9 스토리</h2>
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
      <div className="min-h-screen bg-gradient-to-b from-amber-950 via-gray-900 to-gray-950 text-white">
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
      { name: "드래곤 강화 (ATK+5)", icon: "🐉⚔️", cost: 100, action: () => setBonusAtk((a) => a + 5) },
      { name: "헌터 갑옷 (DEF+3)", icon: "⛓️🛡️", cost: 100, action: () => setBonusDef((d) => d + 3) },
      { name: "퍼스트본 부스트 (HP+30)", icon: "🐉❤️", cost: 100, action: () => setBonusHp((h) => h + 30) },
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
      <div className="min-h-screen bg-gradient-to-b from-amber-950/30 via-gray-950 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-2 rounded-xl bg-black/40 p-3 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{enemy.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{enemy.name} {enemy.isBoss && <span className="text-[10px] bg-red-600 px-1 py-0.5 rounded">BOSS</span>}</div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(enemyHp / enemy.maxHp) * 100}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{enemyHp}/{enemy.maxHp} | 남은 적: {enemyQueue.length}</div>
                {enemyStunned && <span className="text-[10px] text-yellow-400">⛓️마비</span>}
                {enemyPoisoned > 0 && <span className="text-[10px] text-green-400 ml-1">☠️독({enemyPoisoned})</span>}
              </div>
            </div>
          </div>
          <div className={`mb-2 rounded-xl bg-gradient-to-r ${ninja.bgGradient} p-2.5 border border-white/10`}>
            <div className="flex gap-3 text-xs">
              <span>❤️{playerHp}/{totalHp()}</span><span>⚡{playerEnergy}/{ninja.maxEnergy}</span>
              {shieldActive && <span className="text-amber-300">🛡️요새방어</span>}
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
                    className="rounded-lg bg-amber-900/40 p-1.5 text-center hover:bg-amber-900/60 border border-amber-500/20 disabled:opacity-30 text-[10px]">
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
