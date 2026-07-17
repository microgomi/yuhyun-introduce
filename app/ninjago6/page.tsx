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
// DATA - 닌자고 시즌 6: 스카이바운드
// ============================================================
const NINJAS: Ninja[] = [
  { id: "lloyd_sky", name: "로이드", icon: "💚🌪️", element: "에너지", elementIcon: "💚⚡", bgGradient: "from-green-700 to-sky-800", hp: 130, maxHp: 130, atk: 22, def: 14, spd: 15, energy: 75, maxEnergy: 75, special: "에너지 폭풍", specialIcon: "💚💥", specialDmg: 80, specialCost: 35 },
  { id: "kai_sky", name: "카이", icon: "🔴🏴‍☠️", element: "불", elementIcon: "🔥", bgGradient: "from-red-700 to-sky-800", hp: 115, maxHp: 115, atk: 23, def: 11, spd: 14, energy: 65, maxEnergy: 65, special: "하늘의 불꽃", specialIcon: "🔥🌤️", specialDmg: 72, specialCost: 30 },
  { id: "jay_sky", name: "제이", icon: "💙⚡", element: "번개", elementIcon: "⚡", bgGradient: "from-blue-600 to-sky-800", hp: 105, maxHp: 105, atk: 20, def: 10, spd: 20, energy: 70, maxEnergy: 70, special: "라이트닝 스톰", specialIcon: "⚡🌩️", specialDmg: 65, specialCost: 28 },
  { id: "cole_sky", name: "콜", icon: "⚫👻", element: "땅", elementIcon: "🪨", bgGradient: "from-stone-700 to-sky-800", hp: 145, maxHp: 145, atk: 18, def: 20, spd: 9, energy: 60, maxEnergy: 60, special: "유령 파운드", specialIcon: "👻💥", specialDmg: 75, specialCost: 33 },
  { id: "zane_sky", name: "쟌", icon: "🤍🌊", element: "얼음", elementIcon: "❄️", bgGradient: "from-cyan-700 to-sky-800", hp: 120, maxHp: 120, atk: 19, def: 16, spd: 14, energy: 70, maxEnergy: 70, special: "아이스 캐논", specialIcon: "❄️💎", specialDmg: 68, specialCost: 30 },
  { id: "nya_sky", name: "니아", icon: "🔵🌊", element: "물", elementIcon: "🌊", bgGradient: "from-blue-700 to-sky-800", hp: 110, maxHp: 110, atk: 21, def: 13, spd: 17, energy: 75, maxEnergy: 75, special: "워터 스트라이크", specialIcon: "🌊⚔️", specialDmg: 78, specialCost: 32 },
];

const ALL_SKILLS: Skill[] = [
  { id: "wish_power", name: "소원의 힘", icon: "🧞✨", dmg: 35, cost: 18, unlockLevel: 1, learned: false },
  { id: "pirate_slash", name: "해적 참격", icon: "🏴‍☠️⚔️", dmg: 45, cost: 22, unlockLevel: 2, learned: false },
  { id: "sky_storm", name: "하늘 폭풍", icon: "🌩️💨", dmg: 55, cost: 28, unlockLevel: 3, learned: false },
  { id: "djinn_trap", name: "진 트랩", icon: "🧞🪤", dmg: 30, cost: 15, effect: "stun", unlockLevel: 4, learned: false },
  { id: "tiger_widow_poison", name: "타이거 위도우 독", icon: "🕷️💀", dmg: 25, cost: 16, effect: "poison", unlockLevel: 5, learned: false },
  { id: "wind_shield", name: "바람 방패", icon: "🌬️🛡️", dmg: 0, cost: 20, effect: "shield", unlockLevel: 6, learned: false },
  { id: "healing_tea", name: "치유의 차", icon: "🍵✨", dmg: -55, cost: 25, effect: "heal", unlockLevel: 8, learned: false },
  { id: "last_wish", name: "최후의 소원", icon: "🧞👑", dmg: 120, cost: 55, unlockLevel: 15, learned: false },
];

const STORY: Omit<Chapter, "completed">[] = [
  {
    id: 1, title: "진의 등장", subtitle: "나다칸이 티팟에서 풀려나다", icon: "🧞🏺",
    enemies: [
      { id: "pirate1", name: "하늘 해적", icon: "🏴‍☠️⚔️", atk: 13, def: 6, isBoss: false },
      { id: "pirate2", name: "하늘 해적", icon: "🏴‍☠️🗡️", atk: 15, def: 7, isBoss: false },
    ],
    boss: { id: "doubloon1", name: "도블론", icon: "🏴‍☠️", atk: 22, def: 11, special: "이중 칼날", isBoss: true },
    reward: "소원의 힘 해금", bgGradient: "from-sky-900 to-amber-950",
  },
  {
    id: 2, title: "하늘 해적", subtitle: "하늘 해적단이 닌자고를 습격한다", icon: "🏴‍☠️🌤️",
    enemies: [
      { id: "pirate3", name: "진 부하", icon: "🧞‍♂️👤", atk: 17, def: 8, special: "소원 저주", isBoss: false },
      { id: "pirate4", name: "하늘 해적 궁수", icon: "🏴‍☠️🏹", atk: 16, def: 12, isBoss: false },
    ],
    boss: { id: "flintlocke1", name: "플린트로크", icon: "🏴‍☠️🔫", atk: 26, def: 13, special: "하늘 대포", isBoss: true },
    reward: "해적 참격 해금", bgGradient: "from-amber-900 to-sky-950",
  },
  {
    id: 3, title: "소원의 덫", subtitle: "나다칸의 소원이 닌자들을 함정에 빠뜨린다", icon: "🧞🪤",
    enemies: [
      { id: "djinn1", name: "진 부하", icon: "🧞‍♂️⚔️", atk: 20, def: 10, special: "소원 왜곡", isBoss: false },
      { id: "djinn2", name: "하늘 해적 근위병", icon: "🏴‍☠️🛡️", atk: 22, def: 9, special: "해적 방패", isBoss: false },
    ],
    boss: { id: "doubloon2", name: "도블론 (강화)", icon: "🏴‍☠️✨", atk: 30, def: 12, special: "이중 칼날 폭풍", isBoss: true },
    reward: "하늘 폭풍 + 진 트랩 해금", bgGradient: "from-sky-800 to-purple-950",
  },
  {
    id: 4, title: "타이거 위도우 섬", subtitle: "독거미의 섬에서 해독제를 찾아라", icon: "🕷️🏝️",
    enemies: [
      { id: "spider1", name: "타이거 위도우", icon: "🕷️💀", atk: 25, def: 11, special: "독 공격", isBoss: false },
      { id: "spider2", name: "타이거 위도우", icon: "🕷️🕸️", atk: 27, def: 14, special: "거미줄 속박", isBoss: false },
    ],
    boss: { id: "clancee1", name: "클랜시", icon: "🕷️", atk: 34, def: 16, special: "독거미 소환", isBoss: true },
    reward: "타이거 위도우 독 + 바람 방패 해금", bgGradient: "from-purple-900 to-sky-950",
  },
  {
    id: 5, title: "라이트닝의 결혼식", subtitle: "나다칸이 니아와 결혼하려 한다", icon: "💍⚡",
    enemies: [
      { id: "pirate5", name: "하늘 해적 엘리트", icon: "🏴‍☠️⚔️💀", atk: 30, def: 16, special: "해적 연격", isBoss: false },
      { id: "pirate6", name: "진 부하 마법사", icon: "🧞‍♂️🔮", atk: 32, def: 12, special: "소원 마법", isBoss: false },
    ],
    boss: { id: "nadakhan1", name: "나다칸", icon: "🧞", atk: 38, def: 18, special: "소원 왜곡 마법", isBoss: true },
    reward: "치유의 차 해금", bgGradient: "from-sky-950 to-amber-950",
  },
  {
    id: 6, title: "나다칸의 진짜 소원", subtitle: "나다칸이 디랄라의 힘을 흡수한다!", icon: "🧞💎",
    enemies: [
      { id: "pirate7", name: "하늘 해적 장군", icon: "🏴‍☠️⚔️👑", atk: 35, def: 20, special: "해적단 지휘", isBoss: false },
      { id: "djinn3", name: "진 전사", icon: "🧞‍♂️💪", atk: 38, def: 18, special: "소원의 사슬", isBoss: false },
    ],
    boss: { id: "nadakhan2", name: "나다칸 (강화)", icon: "🧞✨", atk: 44, def: 22, special: "진의 폭풍", isBoss: true },
    reward: "최후의 소원 해금 준비", bgGradient: "from-amber-950 to-sky-950",
  },
  {
    id: 7, title: "최후의 소원", subtitle: "제이의 마지막 소원으로 모든 것을 되돌려라!", icon: "🧞👑",
    enemies: [
      { id: "djinn4", name: "진 거인", icon: "🧞‍♂️💀👑", atk: 42, def: 24, special: "소원 폭발", isBoss: false },
      { id: "djinn5", name: "진 마법사", icon: "🧞‍♂️🔮✨", atk: 40, def: 20, special: "소원 봉인", isBoss: false },
    ],
    boss: { id: "nadakhan_final", name: "나다칸 최종", icon: "🧞👑", atk: 52, def: 26, special: "무한 소원", isBoss: true },
    reward: "최후의 소원 해금", bgGradient: "from-sky-950 to-gold-950",
  },
];

// ============================================================
// COMPONENT
// ============================================================
export default function Ninjago6() {
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
      log.push(`${icon} 바람 방패 발동!`);
    } else {
      let d = dmg + totalAtk() + Math.floor(Math.random() * 8);
      if (Math.random() < 0.15) { d = Math.floor(d * 2); log.push("💥 크리티컬!"); }
      d = Math.max(1, d - Math.floor(enemy.def * 0.25));
      eHp = Math.max(0, eHp - d);
      log.push(`${icon} ${name}! ${d} 데미지!`);
      if (effect === "stun") { setEnemyStunned(true); log.push("🧞 진 트랩! 적 마비!"); }
      if (effect === "poison") { setEnemyPoisoned(3); log.push("🕷️ 타이거 위도우 독이 퍼진다!"); }
    }

    // Poison tick
    if (enemyPoisoned > 0) {
      const pd = 10;
      eHp = Math.max(0, eHp - pd);
      log.push(`🕷️ 독 ${pd} 데미지!`);
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
      if (shieldActive) { eDmg = Math.floor(eDmg * 0.3); log.push("🛡️ 바람 방패가 막았다!"); setShieldActive(false); }
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
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-amber-950 to-sky-950 text-white flex flex-col items-center justify-center px-4">
        <Link href="/" className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white">← 홈으로</Link>
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🧞🏴‍☠️</div>
          <h1 className="text-3xl font-black mb-1">닌자고 시즌 6</h1>
          <h2 className="text-xl text-sky-400 mb-1">스카이바운드</h2>
          <p className="text-sm text-gray-400 mb-8">하늘 해적과 진 나다칸의 소원에 맞서라!</p>
          <div className="space-y-1.5 text-left bg-white/5 rounded-xl p-3 border border-white/10 mb-6 text-sm text-gray-300">
            <p>🧞 진 나다칸의 소원의 힘</p>
            <p>🏴‍☠️ 하늘 해적단의 습격</p>
            <p>🕷️ 타이거 위도우 섬의 위험</p>
            <p>💍 니아를 구하기 위한 전투</p>
            <p>⚡ 최후의 소원으로 모든 것을 되돌려라!</p>
          </div>
          <button onClick={() => setScreen("select")} className="w-full rounded-xl bg-gradient-to-r from-sky-700 to-amber-700 py-4 text-xl font-black hover:brightness-110 border border-sky-400/30">
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
          <h2 className="text-2xl font-black mb-4 text-center">🏴‍☠️ 닌자 선택</h2>
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
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(xp / xpNext) * 100}%` }} />
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">XP: {xp}/{xpNext}</div>
          </div>
          {nextCh && (
            <button onClick={() => startChapter(nextCh)} className="w-full mb-3 rounded-xl bg-gradient-to-r from-sky-800 to-amber-800 p-4 text-left hover:brightness-110 border border-sky-500/30 animate-pulse">
              <div className="text-xs text-sky-300 mb-1">📖 다음 스토리</div>
              <div className="font-bold">{nextCh.icon} {nextCh.title}</div>
              <div className="text-sm text-gray-300">{nextCh.subtitle}</div>
              <div className="text-xs text-yellow-300 mt-1">🎁 {nextCh.reward}</div>
            </button>
          )}
          {chapters.every((c) => c.completed) && (
            <div className="mb-3 rounded-xl bg-sky-900/30 p-4 text-center border border-sky-500/30">
              <div className="text-3xl mb-1">🧞🏴‍☠️✨</div>
              <div className="font-black text-sky-300">스카이바운드 클리어!</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen("story")} className="rounded-xl bg-sky-800/50 p-3 text-center hover:brightness-110 border border-sky-500/20">
              <div className="text-xl">📖</div><div className="text-xs font-bold">스토리 ({progress}/7)</div>
            </button>
            <button onClick={() => setScreen("skills")} className="rounded-xl bg-amber-800/50 p-3 text-center hover:brightness-110 border border-amber-500/20">
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
          <h2 className="text-xl font-black mb-3 text-center">📖 시즌 6 스토리</h2>
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
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-gray-900 to-gray-950 text-white">
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
      { name: "하늘 강화 (ATK+5)", icon: "🌤️⚔️", cost: 100, action: () => setBonusAtk((a) => a + 5) },
      { name: "해적 갑옷 (DEF+3)", icon: "🏴‍☠️🛡️", cost: 100, action: () => setBonusDef((d) => d + 3) },
      { name: "진의 부스트 (HP+30)", icon: "🧞❤️", cost: 100, action: () => setBonusHp((h) => h + 30) },
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
                {enemyStunned && <span className="text-[10px] text-yellow-400">⚡마비</span>}
                {enemyPoisoned > 0 && <span className="text-[10px] text-green-400 ml-1">🕷️독({enemyPoisoned})</span>}
              </div>
            </div>
          </div>
          <div className={`mb-2 rounded-xl bg-gradient-to-r ${ninja.bgGradient} p-2.5 border border-white/10`}>
            <div className="flex gap-3 text-xs">
              <span>❤️{playerHp}/{totalHp()}</span><span>⚡{playerEnergy}/{ninja.maxEnergy}</span>
              {shieldActive && <span className="text-sky-300">🛡️바람방패</span>}
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
                    className="rounded-lg bg-sky-900/40 p-1.5 text-center hover:bg-sky-900/60 border border-sky-500/20 disabled:opacity-30 text-[10px]">
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
