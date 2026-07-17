"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Screen = "title" | "select" | "hub" | "battle" | "story" | "shop" | "skills" | "training";

interface Ninja {
  id: string;
  name: string;
  icon: string;
  element: string;
  elementIcon: string;
  bgGradient: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  energy: number;
  maxEnergy: number;
  special: string;
  specialIcon: string;
  specialDmg: number;
  specialCost: number;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  dmg: number;
  cost: number;
  effect?: string;
  unlockLevel: number;
  learned: boolean;
}

interface Enemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  special?: string;
  isBoss: boolean;
}

interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  enemies: Omit<Enemy, "hp" | "maxHp">[];
  boss: Omit<Enemy, "hp" | "maxHp">;
  reward: string;
  bgGradient: string;
  completed: boolean;
}

// ============================================================
// DATA - 닌자고 시즌 2: 그린 닌자의 전설
// ============================================================
const NINJAS: Ninja[] = [
  { id: "lloyd", name: "로이드", icon: "💚", element: "에너지", elementIcon: "⚡", bgGradient: "from-green-700 to-emerald-900", hp: 130, maxHp: 130, atk: 18, def: 12, spd: 14, energy: 70, maxEnergy: 70, special: "그린 토네이도", specialIcon: "💚🌪️", specialDmg: 75, specialCost: 35 },
  { id: "kai", name: "카이", icon: "🔴", element: "불", elementIcon: "🔥", bgGradient: "from-red-800 to-orange-900", hp: 110, maxHp: 110, atk: 20, def: 10, spd: 13, energy: 60, maxEnergy: 60, special: "파이어 스핀짓주", specialIcon: "🔥🌀", specialDmg: 65, specialCost: 30 },
  { id: "jay", name: "제이", icon: "💙", element: "번개", elementIcon: "⚡", bgGradient: "from-blue-700 to-indigo-900", hp: 100, maxHp: 100, atk: 17, def: 9, spd: 18, energy: 65, maxEnergy: 65, special: "라이트닝 스트라이크", specialIcon: "⚡💥", specialDmg: 60, specialCost: 28 },
  { id: "cole", name: "콜", icon: "⚫", element: "땅", elementIcon: "🪨", bgGradient: "from-stone-700 to-gray-900", hp: 140, maxHp: 140, atk: 15, def: 18, spd: 8, energy: 55, maxEnergy: 55, special: "어스 퀘이크", specialIcon: "🪨💥", specialDmg: 70, specialCost: 32 },
  { id: "zane", name: "쟌", icon: "⬜", element: "얼음", elementIcon: "❄️", bgGradient: "from-cyan-800 to-blue-900", hp: 115, maxHp: 115, atk: 16, def: 14, spd: 12, energy: 65, maxEnergy: 65, special: "아이스 실드", specialIcon: "❄️🛡️", specialDmg: 50, specialCost: 25 },
  { id: "nya", name: "니아", icon: "🔵", element: "물", elementIcon: "🌊", bgGradient: "from-blue-800 to-cyan-900", hp: 108, maxHp: 108, atk: 17, def: 13, spd: 15, energy: 65, maxEnergy: 65, special: "타이달 웨이브", specialIcon: "🌊💥", specialDmg: 60, specialCost: 30 },
];

const ALL_SKILLS: Skill[] = [
  { id: "spinjitzu", name: "스핀짓주", icon: "🌀", dmg: 30, cost: 15, unlockLevel: 1, learned: false },
  { id: "power_slash", name: "파워 슬래시", icon: "⚔️", dmg: 40, cost: 20, unlockLevel: 3, learned: false },
  { id: "element_burst", name: "원소 폭발", icon: "💥", dmg: 55, cost: 28, unlockLevel: 5, learned: false },
  { id: "dragon_summon", name: "드래곤 소환", icon: "🐉", dmg: 70, cost: 35, unlockLevel: 8, learned: false },
  { id: "tornado_strike", name: "토네이도 스트라이크", icon: "🌪️⚔️", dmg: 85, cost: 40, unlockLevel: 11, learned: false },
  { id: "golden_power", name: "황금의 힘", icon: "✨", dmg: 100, cost: 50, unlockLevel: 15, learned: false },
  { id: "heal", name: "치유의 빛", icon: "💚", dmg: -50, cost: 25, effect: "heal", unlockLevel: 4, learned: false },
  { id: "shield", name: "원소 방어막", icon: "🛡️✨", dmg: 0, cost: 20, effect: "shield", unlockLevel: 6, learned: false },
];

const STORY: Omit<Chapter, "completed">[] = [
  {
    id: 1, title: "뱀의 부활", subtitle: "하이퍼노브라이의 귀환", icon: "🐍",
    enemies: [
      { id: "snake1", name: "하이퍼노브라이 병사", icon: "🐍", atk: 10, def: 4, isBoss: false },
      { id: "snake2", name: "콘스트릭타이 전사", icon: "🐍⚔️", atk: 12, def: 5, isBoss: false },
    ],
    boss: { id: "skales", name: "스케일스", icon: "🐍👑", atk: 18, def: 8, special: "최면술", isBoss: true },
    reward: "스핀짓주 해금", bgGradient: "from-green-900 to-purple-950",
  },
  {
    id: 2, title: "그레이트 디바우러", subtitle: "거대한 뱀의 위협", icon: "🐉🐍",
    enemies: [
      { id: "snake3", name: "파이터 바이퍼", icon: "🐍🔥", atk: 14, def: 6, isBoss: false },
      { id: "snake4", name: "베노마리 독사", icon: "🐍☠️", atk: 16, def: 5, special: "독 공격", isBoss: false },
    ],
    boss: { id: "pythor", name: "파이토", icon: "🐍💜", atk: 22, def: 10, special: "투명화 공격", isBoss: true },
    reward: "파워 슬래시 해금", bgGradient: "from-purple-900 to-gray-950",
  },
  {
    id: 3, title: "그린 닌자의 각성", subtitle: "로이드의 진정한 힘", icon: "💚⚡",
    enemies: [
      { id: "stone_army1", name: "석상 전사", icon: "🗿⚔️", atk: 18, def: 10, isBoss: false },
      { id: "stone_army2", name: "석상 궁수", icon: "🗿🏹", atk: 20, def: 8, isBoss: false },
    ],
    boss: { id: "garmadon_4arm", name: "4팔 가마돈", icon: "👤🦾", atk: 28, def: 12, special: "4팔 연속 공격", isBoss: true },
    reward: "원소 폭발 해금", bgGradient: "from-green-800 to-red-950",
  },
  {
    id: 4, title: "석상 군대", subtitle: "오버로드의 부활", icon: "🗿",
    enemies: [
      { id: "stone_army3", name: "석상 장군", icon: "🗿👑", atk: 22, def: 14, special: "방패 돌진", isBoss: false },
      { id: "stone_army4", name: "석상 거인", icon: "🗿💪", atk: 25, def: 16, isBoss: false },
    ],
    boss: { id: "kozu", name: "코주 장군", icon: "🗿⚔️👑", atk: 32, def: 15, special: "석상 분쇄", isBoss: true },
    reward: "치유의 빛 해금", bgGradient: "from-stone-800 to-red-950",
  },
  {
    id: 5, title: "어둠의 섬", subtitle: "최후의 전장", icon: "🏝️🌑",
    enemies: [
      { id: "dark_army1", name: "다크 매터 전사", icon: "🖤⚔️", atk: 28, def: 15, special: "어둠 베기", isBoss: false },
      { id: "dark_army2", name: "다크 매터 마법사", icon: "🖤🔮", atk: 30, def: 12, special: "어둠 마법", isBoss: false },
    ],
    boss: { id: "garmadon_dark", name: "다크 가마돈", icon: "😈🦾", atk: 38, def: 18, special: "메가 무기", isBoss: true },
    reward: "드래곤 소환 해금", bgGradient: "from-gray-950 to-red-950",
  },
  {
    id: 6, title: "황금의 힘", subtitle: "로이드 vs 오버로드", icon: "✨🐉",
    enemies: [
      { id: "overlord_minion1", name: "오버로드 하수인", icon: "🌑⚔️", atk: 32, def: 16, isBoss: false },
      { id: "overlord_minion2", name: "어둠의 용", icon: "🐉🌑", atk: 36, def: 18, special: "어둠 브레스", isBoss: false },
    ],
    boss: { id: "overlord", name: "오버로드", icon: "🌑👁️", atk: 45, def: 22, special: "어둠의 물결", isBoss: true },
    reward: "황금의 힘 해금", bgGradient: "from-yellow-900 to-purple-950",
  },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Ninjago2() {
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

  // Battle
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
      ...ch.enemies.map((e) => ({ ...e, hp: 50 + ch.id * 30, maxHp: 50 + ch.id * 30 })),
      { ...ch.boss, hp: 100 + ch.id * 50, maxHp: 100 + ch.id * 50 },
    ];
    const first = allEnemies[0];
    setEnemy(first); setEnemyHp(first.hp); setPlayerHp(totalHp()); setPlayerEnergy(ninja.maxEnergy);
    setBattleLog([`⚔️ ${first.name} ${first.icon} 등장!`]);
    setIsBattleOver(false); setBattleResult(null); setCurrentChapter(ch.id);
    setEnemyQueue(allEnemies.slice(1)); setShieldActive(false); setScreen("battle");
  };

  const doAttack = (dmg: number, cost: number, skillName: string, skillIcon: string, effect?: string) => {
    if (isBattleOver || !ninja || !enemy) return;
    if (playerEnergy < cost) return;
    const log: string[] = [];
    let eHp = enemyHp, pHp = playerHp, pEn = playerEnergy - cost;

    if (effect === "heal") {
      const heal = Math.abs(dmg) + Math.floor(totalDef() * 0.3);
      pHp = Math.min(totalHp(), pHp + heal);
      log.push(`${skillIcon} ${heal} HP 회복!`);
    } else if (effect === "shield") {
      setShieldActive(true);
      log.push(`${skillIcon} 방어막 발동!`);
    } else {
      let d = dmg + totalAtk() + Math.floor(Math.random() * 8);
      if (Math.random() < 0.15) { d = Math.floor(d * 2); log.push("💥 크리티컬!"); }
      d = Math.max(1, d - Math.floor(enemy.def * 0.25));
      eHp = Math.max(0, eHp - d);
      log.push(`${skillIcon} ${skillName}! ${d} 데미지!`);
    }

    // Enemy defeated
    if (eHp <= 0) {
      log.push(`🎉 ${enemy.name} 처치!`);
      if (enemyQueue.length > 0) {
        const next = enemyQueue[0];
        log.push(`⚔️ ${next.name} ${next.icon} 등장!`);
        setEnemy(next); setEnemyHp(next.hp); setEnemyQueue(enemyQueue.slice(1));
      } else {
        const xpGain = currentChapter ? 20 + currentChapter * 15 : 15;
        const coinGain = currentChapter ? 30 + currentChapter * 20 : 20;
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
    let eDmg = enemy.atk + Math.floor(Math.random() * 6);
    if (enemy.special && Math.random() < 0.3) { eDmg = Math.floor(eDmg * 1.6); log.push(`💀 ${enemy.name}의 ${enemy.special}!`); }
    if (shieldActive) { eDmg = Math.floor(eDmg * 0.4); log.push("🛡️ 방어막이 공격을 막았다!"); setShieldActive(false); }
    eDmg = Math.max(1, eDmg - Math.floor(totalDef() * 0.25));
    pHp = Math.max(0, pHp - eDmg);
    log.push(`${enemy.icon} ${eDmg} 데미지!`);
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
      <div className="min-h-screen bg-gradient-to-b from-green-950 via-gray-950 to-purple-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">💚⚔️</div>
          <h1 className="text-3xl font-black mb-1">닌자고 시즌 2</h1>
          <h2 className="text-xl text-green-400 mb-1">그린 닌자의 전설</h2>
          <p className="text-sm text-gray-400 mb-8">로이드가 그린 닌자로 각성한다! 오버로드를 쓰러뜨려라!</p>
          <div className="space-y-1.5 text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-sm text-gray-300">
            <p>🐍 하이퍼노브라이의 반란을 막아라</p>
            <p>🗿 석상 군대와 맞서 싸워라</p>
            <p>💚 그린 닌자의 힘을 깨달아라</p>
            <p>🌑 오버로드를 물리쳐라!</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-green-700 to-emerald-700 py-4 text-xl font-black hover:brightness-110 border border-green-400/30">
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
          <h2 className="text-2xl font-black mb-4 text-center">🥷 닌자 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {NINJAS.map((n) => (
              <button key={n.id} onClick={() => { setNinja(n); setScreen("hub"); }}
                className={`rounded-xl bg-gradient-to-br ${n.bgGradient} p-4 text-center hover:brightness-110 border border-white/10 active:scale-95`}>
                <div className="text-3xl mb-1">{n.icon}</div>
                <div className="font-bold">{n.name}</div>
                <div className="text-xs text-gray-300">{n.elementIcon} {n.element}</div>
                <div className="text-[10px] text-gray-400 mt-1">HP:{n.maxHp} ATK:{n.atk} DEF:{n.def}</div>
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
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl bg-gradient-to-r from-green-800 to-emerald-800 p-4 text-left hover:brightness-110 border border-green-500/30 animate-pulse">
              <div className="text-xs text-green-300 mb-1">📖 다음 스토리</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-yellow-900/30 p-4 text-center border border-yellow-500/30">
              <div className="text-3xl mb-1">✨🏆</div>
              <div className="font-black text-yellow-300">오버로드를 물리쳤다!</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-purple-800/50 p-3 text-center hover:brightness-110 border border-purple-500/20">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/6)</div>
            </button>
            <button onClick={() => setScreen("skills")} className="rounded-xl bg-blue-800/50 p-3 text-center hover:brightness-110 border border-blue-500/20">
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
          <h2 className="text-xl font-black mb-3 text-center">📖 시즌 2 스토리</h2>
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

  if (screen === "skills") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-gray-900 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <button onClick={() => setScreen("hub")} className="mb-4 text-sm text-gray-400 hover:text-white">← 뒤로</button>
          <h2 className="text-xl font-black mb-3 text-center">📜 스킬</h2>
          <div className="space-y-1.5">
            {skills.map((s) => (
              <div key={s.id} className={`rounded-lg p-2.5 border ${s.learned ? "bg-white/5 border-white/10" : "bg-gray-800/30 border-gray-700 opacity-40"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.learned ? s.icon : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{s.name}</div>
                    <div className="text-[10px] text-gray-400">{s.dmg > 0 ? `⚔️${s.dmg}` : s.dmg < 0 ? `💚${Math.abs(s.dmg)}` : "🛡️"} | ⚡{s.cost}</div>
                  </div>
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
            { icon: "⚔️", name: "공격 수련", desc: `공격력 +2 (현재: ${totalAtk()})`, action: () => { setBonusAtk((a) => a + 2); gainXp(10); } },
            { icon: "🛡️", name: "방어 수련", desc: `방어력 +1 (현재: ${totalDef()})`, action: () => { setBonusDef((d) => d + 1); gainXp(10); } },
            { icon: "❤️", name: "체력 수련", desc: `최대HP +12 (현재: ${totalHp()})`, action: () => { setBonusHp((h) => h + 12); gainXp(10); } },
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
      { name: "강화석 (ATK+5)", icon: "💎⚔️", cost: 100, action: () => setBonusAtk((a) => a + 5) },
      { name: "방어석 (DEF+3)", icon: "💎🛡️", cost: 100, action: () => setBonusDef((d) => d + 3) },
      { name: "생명석 (HP+30)", icon: "💎❤️", cost: 100, action: () => setBonusHp((h) => h + 30) },
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
      <div className="min-h-screen bg-gradient-to-b from-red-950/30 via-gray-950 to-gray-950 text-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="mb-2 rounded-xl bg-black/40 p-3 border border-red-500/20">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{enemy.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{enemy.name} {enemy.isBoss && <span className="text-[10px] bg-red-600 px-1 py-0.5 rounded">BOSS</span>}</div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(enemyHp / enemy.maxHp) * 100}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{enemyHp}/{enemy.maxHp} | 남은 적: {enemyQueue.length}</div>
              </div>
            </div>
          </div>
          <div className={`mb-2 rounded-xl bg-gradient-to-r ${ninja.bgGradient} p-2.5 border border-white/10`}>
            <div className="flex gap-3 text-xs">
              <span>❤️{playerHp}/{totalHp()}</span><span>⚡{playerEnergy}/{ninja.maxEnergy}</span>
              {shieldActive && <span className="text-cyan-300">🛡️방어막</span>}
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
                {learnedSkills.map((s) => (
                  <button key={s.id} onClick={() => doAttack(s.dmg, s.cost, s.name, s.icon, s.effect)}
                    disabled={playerEnergy < s.cost}
                    className="rounded-lg bg-purple-900/40 p-1.5 text-center hover:bg-purple-900/60 border border-purple-500/20 disabled:opacity-30 text-[10px]">
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
