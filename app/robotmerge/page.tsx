"use client";
import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   타입 & 상수
═══════════════════════════════════════════ */
type Screen = "menu" | "workshop" | "battle" | "result";

interface Part {
  id: string;
  slot: "head" | "body" | "arm" | "leg" | "core";
  tier: number;          // 1~5
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  color: string;         // tailwind bg 색상
  accent: string;        // border 강조색
  desc: string;
  special?: string;      // 특수 효과 이름
}

interface Robot {
  head: Part | null;
  body: Part | null;
  armL: Part | null;
  armR: Part | null;
  legL: Part | null;
  legR: Part | null;
  core: Part | null;
}

interface Enemy {
  name: string;
  tier: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  img: string;           // CSS gradient
  reward: number;
  desc: string;
}

interface BattleLog {
  text: string;
  type: "player" | "enemy" | "info" | "crit" | "special";
}

/* ── 부품 데이터 ── */
const SLOT_LABELS: Record<string, string> = {
  head: "머리", body: "몸통", arm: "팔", leg: "다리", core: "코어",
};

const TIER_NAMES = ["", "기본", "강화", "고급", "전설", "궁극"];
const TIER_COLORS = ["", "#9ca3af", "#60a5fa", "#a78bfa", "#fbbf24", "#f43f5e"];

function makePart(slot: Part["slot"], tier: number): Part {
  const t = tier;
  const base = { head: 8, body: 15, arm: 5, leg: 6, core: 12 }[slot];
  const names: Record<string, string[]> = {
    head: ["센서 헤드", "카메라 헤드", "AI 헤드", "레이더 헤드", "양자 두뇌"],
    body: ["철판 바디", "합금 바디", "티타늄 바디", "나노 바디", "다이아 바디"],
    arm: ["집게 팔", "드릴 팔", "블레이드 팔", "캐논 팔", "플라즈마 팔"],
    leg: ["바퀴 다리", "관절 다리", "호버 다리", "제트 다리", "워프 다리"],
    core: ["배터리", "리액터", "핵융합로", "항성 코어", "블랙홀 코어"],
  };
  const specials: Record<string, string[]> = {
    head: ["", "", "스캔", "락온", "예지"],
    body: ["", "", "방패", "재생", "불멸"],
    arm: ["", "", "연타", "폭발", "궁극기"],
    leg: ["", "", "회피", "순간이동", "시공간"],
    core: ["", "", "충전", "과부하", "특이점"],
  };
  const colors = ["bg-gray-600", "bg-blue-600", "bg-purple-600", "bg-yellow-600", "bg-rose-600"];
  const accents = ["border-gray-400", "border-blue-400", "border-purple-400", "border-yellow-400", "border-rose-400"];

  return {
    id: `${slot}-${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    slot,
    tier: t,
    name: names[slot][t - 1],
    hp: Math.round(base * t * (1 + t * 0.15) * 1.75),
    atk: Math.round((slot === "arm" ? 12 : slot === "head" ? 6 : slot === "core" ? 8 : 3) * t * (1 + t * 0.12) * 1.75),
    def: Math.round((slot === "body" ? 10 : slot === "leg" ? 5 : 3) * t * (1 + t * 0.1) * 1.75),
    spd: Math.round((slot === "leg" ? 10 : slot === "core" ? 6 : 3) * t * 1.5),
    color: colors[t - 1],
    accent: accents[t - 1],
    desc: `${TIER_NAMES[t]} ${SLOT_LABELS[slot]}`,
    special: specials[slot][t - 1] || undefined,
  };
}

function randomPart(maxTier: number): Part {
  const slots: Part["slot"][] = ["head", "body", "arm", "leg", "core"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  // 낮은 티어가 더 잘 나옴
  const weights = [35, 30, 20, 10, 5].slice(0, maxTier); // 높은 등급 더 잘 나옴
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let tier = 1;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { tier = i + 1; break; }
  }
  return makePart(slot, tier);
}

/* ── 적 데이터 ── */
const ENEMIES: Omit<Enemy, "hp" | "maxHp">[] = [
  { name: "정찰 드론", tier: 1, atk: 8, def: 3, spd: 12, img: "from-gray-500 to-gray-700", reward: 15, desc: "약한 정찰용 드론" },
  { name: "경비 로봇", tier: 1, atk: 15, def: 8, spd: 8, img: "from-blue-500 to-blue-700", reward: 25, desc: "공장 경비 로봇" },
  { name: "전투 메카", tier: 2, atk: 28, def: 15, spd: 10, img: "from-red-500 to-red-700", reward: 40, desc: "군용 전투 메카" },
  { name: "헤비 탱크", tier: 2, atk: 35, def: 30, spd: 5, img: "from-green-600 to-green-800", reward: 55, desc: "중장갑 탱크" },
  { name: "스텔스 어쌔신", tier: 3, atk: 55, def: 12, spd: 25, img: "from-purple-600 to-purple-800", reward: 75, desc: "은밀한 암살 로봇" },
  { name: "썬더 자이언트", tier: 3, atk: 60, def: 40, spd: 8, img: "from-yellow-500 to-amber-700", reward: 100, desc: "번개를 다루는 거대 로봇" },
  { name: "드래곤 메카", tier: 4, atk: 85, def: 50, spd: 18, img: "from-orange-500 to-red-700", reward: 140, desc: "용의 형태를 한 메카" },
  { name: "다크 나이트", tier: 4, atk: 100, def: 70, spd: 15, img: "from-slate-700 to-slate-900", reward: 180, desc: "어둠의 기사 로봇" },
  { name: "오메가 워리어", tier: 5, atk: 130, def: 80, spd: 20, img: "from-rose-600 to-rose-900", reward: 250, desc: "최종 전투 병기" },
  { name: "갓 머신", tier: 5, atk: 180, def: 100, spd: 25, img: "from-amber-400 to-red-600", reward: 500, desc: "전설의 신급 머신" },
];

function makeEnemy(stage: number): Enemy {
  const idx = Math.min(stage, ENEMIES.length - 1);
  const e = ENEMIES[idx];
  const scale = 1 + stage * 0.05; // 적 성장 느리게 (0.08→0.05)
  const baseHp = [40, 80, 150, 240, 350, 480, 650, 900, 1300, 2000][idx]; // 적 HP 대폭 감소
  return {
    ...e,
    hp: Math.round(baseHp * scale),
    maxHp: Math.round(baseHp * scale),
    atk: Math.round(e.atk * scale * 0.65), // 적 공격력 35% 감소
    def: Math.round(e.def * scale * 0.5),   // 적 방어력 50% 감소
  };
}

/* ── 로봇 스탯 계산 ── */
function calcStats(robot: Robot) {
  const parts = [robot.head, robot.body, robot.armL, robot.armR, robot.legL, robot.legR, robot.core].filter(Boolean) as Part[];
  const hp = parts.reduce((s, p) => s + p.hp, 0);
  const atk = parts.reduce((s, p) => s + p.atk, 0);
  const def = parts.reduce((s, p) => s + p.def, 0);
  const spd = parts.reduce((s, p) => s + p.spd, 0);
  const specials = parts.filter((p) => p.special).map((p) => p.special!);
  const avgTier = parts.length > 0 ? parts.reduce((s, p) => s + p.tier, 0) / parts.length : 0;
  return { hp, atk, def, spd, specials, partCount: parts.length, avgTier };
}

const emptyRobot = (): Robot => ({ head: null, body: null, armL: null, armR: null, legL: null, legR: null, core: null });

/* ═══════════════════════════════════════════
   메인 컴포넌트
═══════════════════════════════════════════ */
export default function RobotMergePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [robot, setRobot] = useState<Robot>(emptyRobot());
  const [inventory, setInventory] = useState<Part[]>([]);
  const [coins, setCoins] = useState(50);
  const [stage, setStage] = useState(0);
  const [victories, setVictories] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // 인벤토리 필터
  const [filter, setFilter] = useState<Part["slot"] | "all">("all");

  // 전투 상태
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [robotHp, setRobotHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
  const [turn, setTurn] = useState<"player" | "enemy" | "done">("player");
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [shield, setShield] = useState(0);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // 합체 선택
  const [mergeSlot, setMergeSlot] = useState<Part["slot"] | null>(null);
  const [mergeItems, setMergeItems] = useState<[Part | null, Part | null]>([null, null]);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeResult, setMergeResult] = useState<Part | null>(null);

  // 메시지
  const [msg, setMsg] = useState("");
  const showMsg = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); }, []);

  /* ── 게임 시작 ── */
  const startGame = useCallback(() => {
    setRobot(emptyRobot());
    // 시작 부품 3개
    const startParts = [makePart("body", 1), makePart("arm", 1), makePart("leg", 1)];
    setInventory(startParts);
    setCoins(100); // 시작 코인 2배
    setStage(0);
    setVictories(0);
    setScreen("workshop");
  }, []);

  /* ── 부품 구매 ── */
  const buyPart = useCallback((count: number) => {
    const cost = count === 1 ? 8 : count === 3 ? 20 : 60; // 상점 가격 50% 할인
    if (coins < cost) { showMsg("코인이 부족해요!"); return; }
    const maxT = Math.min(5, 1 + Math.floor(stage / 2));
    const newParts: Part[] = [];
    for (let i = 0; i < count; i++) newParts.push(randomPart(maxT));
    setInventory((prev) => [...prev, ...newParts]);
    setCoins((c) => c - cost);
    const bestNew = newParts.reduce((b, p) => (p.tier > b.tier ? p : b), newParts[0]);
    if (bestNew.tier >= 3) showMsg(`${TIER_NAMES[bestNew.tier]} ${bestNew.name} 획득!`);
    else showMsg(`부품 ${count}개 획득!`);
  }, [coins, stage, showMsg]);

  /* ── 부품 장착 ── */
  const equipPart = useCallback((part: Part) => {
    // 먼저 로봇에서 슬롯 키와 기존 부품 확인
    const getSlotKey = (r: Robot): keyof Robot => {
      if (part.slot === "head") return "head";
      if (part.slot === "body") return "body";
      if (part.slot === "core") return "core";
      if (part.slot === "arm") return !r.armL ? "armL" : "armR";
      return !r.legL ? "legL" : "legR";
    };

    setRobot((prev) => {
      const slotKey = getSlotKey(prev);
      const oldPart = prev[slotKey];

      // 기존 부품이 있으면 인벤토리에 반환 (비동기 안전)
      if (oldPart) {
        setTimeout(() => setInventory((inv) => [...inv, oldPart]), 0);
      }

      return { ...prev, [slotKey]: part };
    });
    setInventory((inv) => inv.filter((p) => p.id !== part.id));
  }, []);

  /* ── 부품 해제 ── */
  const unequipSlot = useCallback((slotKey: keyof Robot) => {
    setRobot((prev) => {
      const part = prev[slotKey];
      if (!part) return prev;
      // 인벤토리에 반환 (setState 중첩 방지)
      setTimeout(() => setInventory((inv) => [...inv, part]), 0);
      return { ...prev, [slotKey]: null };
    });
  }, []);

  /* ── 부품 합체 ── */
  const startMerge = useCallback((slot: Part["slot"]) => {
    setMergeSlot(slot);
    setMergeItems([null, null]);
    setMergeResult(null);
    setShowMerge(true);
  }, []);

  const selectMergeItem = useCallback((part: Part) => {
    setMergeItems((prev) => {
      if (prev[0]?.id === part.id) return [null, prev[1]];
      if (prev[1]?.id === part.id) return [prev[0], null];
      if (!prev[0]) return [part, prev[1]];
      if (!prev[1]) return [prev[0], part];
      return [prev[0], part];
    });
  }, []);

  const doMerge = useCallback(() => {
    const [a, b] = mergeItems;
    if (!a || !b || !mergeSlot) return;
    if (a.tier !== b.tier) { showMsg("같은 등급끼리만 합체 가능!"); return; }
    if (a.tier >= 5) { showMsg("최고 등급이에요!"); return; }

    const cost = a.tier * 5; // 합체 비용 50% 할인
    if (coins < cost) { showMsg(`합체 비용 ${cost} 코인 부족!`); return; }

    const newTier = a.tier + 1;
    const result = makePart(mergeSlot, newTier);
    setMergeResult(result);
    setCoins((c) => c - cost);
    setInventory((inv) => {
      const filtered = inv.filter((p) => p.id !== a.id && p.id !== b.id);
      return [...filtered, result];
    });
    setMergeItems([null, null]);
  }, [mergeItems, mergeSlot, coins, showMsg]);

  /* ── 부품 판매 ── */
  const sellPart = useCallback((part: Part) => {
    const price = part.tier * 5 + 3;
    setInventory((inv) => inv.filter((p) => p.id !== part.id));
    setCoins((c) => c + price);
    showMsg(`${part.name} 판매! +${price} 코인`);
  }, [showMsg]);

  /* ── 전투 시작 ── */
  const startBattle = useCallback(() => {
    const stats = calcStats(robot);
    if (stats.partCount === 0) { showMsg("부품을 장착해주세요!"); return; }
    const e = makeEnemy(stage);
    setEnemy(e);
    setRobotHp(stats.hp);
    setEnemyHp(e.hp);
    setBattleLog([{ text: `스테이지 ${stage + 1}: ${e.name} 출현!`, type: "info" }]);
    setTurn("player");
    setCooldowns({});
    setShield(0);
    setScreen("battle");
  }, [robot, stage, showMsg]);

  /* ── 전투 공격 ── */
  const doAttack = useCallback((type: "normal" | "heavy" | "special") => {
    if (turn !== "player" || !enemy) return;
    const stats = calcStats(robot);
    let dmg = 0;
    let log: BattleLog;

    if (type === "normal") {
      dmg = Math.max(1, stats.atk - Math.floor(enemy.def * 0.15));
      // 일반공격도 30% 확률로 크리티컬
      const normalCrit = Math.random() < 0.3;
      dmg = Math.round(dmg * (normalCrit ? 1.8 : (0.95 + Math.random() * 0.15)));
      log = normalCrit
        ? { text: `크리티컬! 일반공격 ${dmg} 데미지!`, type: "crit" }
        : { text: `로봇 일반공격! ${dmg} 데미지`, type: "player" };
    } else if (type === "heavy") {
      if (cooldowns["heavy"] && cooldowns["heavy"] > 0) { showMsg(`강타 쿨다운 ${cooldowns["heavy"]}턴!`); return; }
      const crit = Math.random() < 0.55; // 크리티컬 55% (35%→55%)
      dmg = Math.max(1, Math.round(stats.atk * (crit ? 3.0 : 1.8)) - Math.floor(enemy.def * 0.1));
      setCooldowns((cd) => ({ ...cd, heavy: 2 })); // 쿨다운 2턴 (3→2)
      log = crit
        ? { text: `크리티컬 강타!! ${dmg} 데미지!`, type: "crit" }
        : { text: `로봇 강타! ${dmg} 데미지`, type: "player" };
    } else {
      // 특수공격 - 장착된 특수 능력 사용
      if (cooldowns["special"] && cooldowns["special"] > 0) { showMsg(`특수기 쿨다운 ${cooldowns["special"]}턴!`); return; }
      if (stats.specials.length === 0) { showMsg("특수 부품이 없어요!"); return; }
      const sp = stats.specials[Math.floor(Math.random() * stats.specials.length)];
      setCooldowns((cd) => ({ ...cd, special: 4 }));

      if (sp === "폭발" || sp === "궁극기" || sp === "플라즈마") {
        dmg = Math.round(stats.atk * 3.5); // 2.5→3.5
        log = { text: `[${sp}] 발동! ${dmg} 데미지!`, type: "special" };
      } else if (sp === "방패" || sp === "불멸" || sp === "재생") {
        dmg = Math.round(stats.atk * 1.0); // 0.5→1.0
        const healAmt = Math.round(stats.hp * 0.4); // 25%→40% 회복
        setRobotHp((h) => Math.min(stats.hp, h + healAmt));
        log = { text: `[${sp}] HP ${healAmt} 회복 + ${dmg} 데미지`, type: "special" };
      } else if (sp === "스캔" || sp === "락온" || sp === "예지") {
        dmg = Math.round(stats.atk * 2.5); // 1.8→2.5
        setShield(3); // 방어 3턴 (2→3)
        log = { text: `[${sp}] 약점 분석! ${dmg} 데미지 + 방어 강화`, type: "special" };
      } else {
        dmg = Math.round(stats.atk * 3.0); // 2.0→3.0
        log = { text: `[${sp}] 발동! ${dmg} 데미지!`, type: "special" };
      }
    }

    setEnemyShake(true);
    setTimeout(() => setEnemyShake(false), 300);

    const newEHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEHp);
    setBattleLog((prev) => [...prev, log]);

    if (newEHp <= 0) {
      const reward = enemy.reward;
      setBattleLog((prev) => [...prev, { text: `${enemy.name} 격파! +${reward} 코인`, type: "info" }]);
      setTurn("done");
      setTimeout(() => {
        setCoins((c) => c + reward);
        setVictories((v) => v + 1);
        setStage((s) => s + 1);
        setTotalScore((s) => s + reward * 10);
        setScreen("workshop");
        showMsg(`승리! +${reward} 코인`);
      }, 1500);
      return;
    }

    // 적 턴
    setTurn("enemy");
    setTimeout(() => {
      // 25% 확률로 회피
      const dodge = Math.random() < 0.25;
      if (dodge) {
        setBattleLog((prev) => [...prev, { text: `${enemy.name} 공격! → 회피 성공!`, type: "info" }]);
        setShield((s) => Math.max(0, s - 1));
        setCooldowns((cd) => {
          const next: Record<string, number> = {};
          for (const [k, v] of Object.entries(cd)) if (v > 1) next[k] = v - 1;
          return next;
        });
        setTurn("player");
        return;
      }
      const eDmg = Math.max(1, Math.round(enemy.atk * (0.7 + Math.random() * 0.25)) - Math.floor(stats.def * 0.4) - shield * 15);
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 300);

      setRobotHp((prevHp) => {
        const newRHp = Math.max(0, prevHp - eDmg);
        setBattleLog((prev) => [...prev, { text: `${enemy.name} 공격! ${eDmg} 데미지`, type: "enemy" }]);

        if (newRHp <= 0) {
          setBattleLog((prev) => [...prev, { text: "로봇이 파괴되었습니다...", type: "info" }]);
          setTurn("done");
          setTimeout(() => {
            setScreen("workshop");
            showMsg("패배... 로봇을 강화하세요!");
          }, 1500);
        } else {
          setShield((s) => Math.max(0, s - 1));
          setCooldowns((cd) => {
            const next: Record<string, number> = {};
            for (const [k, v] of Object.entries(cd)) if (v > 1) next[k] = v - 1;
            return next;
          });
          setTurn("player");
        }
        return newRHp;
      });
    }, 800);
  }, [turn, enemy, robot, enemyHp, cooldowns, shield, showMsg]);

  // 배틀로그 자동 스크롤
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  const stats = calcStats(robot);
  const filteredInv = filter === "all" ? inventory : inventory.filter((p) => p.slot === filter);

  /* ═══════════════════════════════════════════
     렌더링
  ═══════════════════════════════════════════ */

  /* ── 메뉴 ── */
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 text-white">
        <Link href="/" className="fixed top-4 left-4 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm hover:bg-white/20 transition z-50">← 홈으로</Link>

        {/* 로봇 비주얼 */}
        <div className="relative mb-8">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30">
            <div className="text-center">
              <div className="text-5xl mb-1">🤖</div>
              <div className="flex gap-0.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
          <div className="absolute -inset-4 rounded-full border border-cyan-500/10 animate-spin" style={{ animationDuration: "8s" }} />
          <div className="absolute -inset-8 rounded-full border border-blue-500/5 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
        </div>

        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          로봇 공장
        </h1>
        <p className="text-slate-400 mb-8 text-center">부품을 모아 합체하고, 최강의 로봇을 만들어라!</p>

        <button onClick={startGame}
          className="px-12 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xl font-black shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition mb-6">
          공장 가동!
        </button>

        <div className="w-full max-w-sm space-y-3 text-xs text-slate-400">
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <p className="font-bold text-cyan-400 text-sm">조작법</p>
            <p>1. 코인으로 부품을 구매하세요</p>
            <p>2. 부품을 로봇에 장착하세요</p>
            <p>3. 같은 종류 + 같은 등급 부품 2개를 합체하면 상위 등급!</p>
            <p>4. 전투에서 승리하면 코인과 더 강한 적이!</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="font-bold text-cyan-400 text-sm mb-2">부품 등급</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {[1, 2, 3, 4, 5].map((t) => (
                <span key={t} className="px-2 py-1 rounded text-xs font-bold" style={{ color: TIER_COLORS[t], borderColor: TIER_COLORS[t], borderWidth: 1 }}>
                  {TIER_NAMES[t]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── 작업장 ── */
  if (screen === "workshop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-8">
        <Link href="/" className="fixed top-3 left-3 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/20 transition z-50">← 홈</Link>

        {/* 상단바 */}
        <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/5 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-2 text-xs">
            <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg font-bold">💰 {coins}</span>
            <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg font-bold">⭐ {totalScore}</span>
          </div>
          <span className="text-xs text-slate-500">스테이지 {stage + 1} | 승리 {victories}</span>
        </div>

        {msg && (
          <div className="mx-4 mt-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl px-4 py-2 text-center text-sm font-bold text-cyan-300 animate-pulse">
            {msg}
          </div>
        )}

        {/* 로봇 조립도 */}
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> 내 로봇
            <span className="ml-auto text-xs text-slate-600">전투력: {stats.atk + stats.def + stats.hp + stats.spd}</span>
          </h2>

          {/* 로봇 비주얼 블루프린트 */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 mb-2">
            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
              {/* 빈줄 - 머리 - 빈줄 */}
              <div />
              <SlotBox part={robot.head} label="머리" slotKey="head" onUnequip={() => unequipSlot("head")} />
              <div />
              {/* 왼팔 - 몸통 - 오른팔 */}
              <SlotBox part={robot.armL} label="왼팔" slotKey="armL" onUnequip={() => unequipSlot("armL")} />
              <SlotBox part={robot.body} label="몸통" slotKey="body" onUnequip={() => unequipSlot("body")} />
              <SlotBox part={robot.armR} label="오른팔" slotKey="armR" onUnequip={() => unequipSlot("armR")} />
              {/* 빈줄 - 코어 - 빈줄 */}
              <div />
              <SlotBox part={robot.core} label="코어" slotKey="core" onUnequip={() => unequipSlot("core")} />
              <div />
              {/* 왼다리 - 빈줄 - 오른다리 */}
              <SlotBox part={robot.legL} label="왼다리" slotKey="legL" onUnequip={() => unequipSlot("legL")} />
              <div />
              <SlotBox part={robot.legR} label="오른다리" slotKey="legR" onUnequip={() => unequipSlot("legR")} />
            </div>

            {/* 스탯 바 */}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center text-xs">
              <StatBar label="HP" value={stats.hp} max={500} color="bg-green-500" />
              <StatBar label="공격" value={stats.atk} max={300} color="bg-red-500" />
              <StatBar label="방어" value={stats.def} max={200} color="bg-blue-500" />
              <StatBar label="속도" value={stats.spd} max={150} color="bg-yellow-500" />
            </div>
            {stats.specials.length > 0 && (
              <div className="flex gap-1 mt-2 justify-center flex-wrap">
                {stats.specials.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="px-4 mt-3 flex gap-2">
          <button onClick={startBattle}
            disabled={stats.partCount === 0}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${stats.partCount > 0
              ? "bg-gradient-to-r from-red-500 to-orange-500 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20"
              : "bg-white/5 text-slate-600 cursor-not-allowed"}`}>
            ⚔️ 전투 (스테이지 {stage + 1})
          </button>
        </div>

        {/* 상점 */}
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-slate-400 mb-2">🏭 부품 상점</h2>
          <div className="flex gap-2">
            <button onClick={() => buyPart(1)} className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 text-center hover:bg-white/10 transition">
              <p className="text-lg">📦</p>
              <p className="text-xs font-bold">1개</p>
              <p className="text-[10px] text-amber-400">8💰</p>
            </button>
            <button onClick={() => buyPart(3)} className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl py-3 text-center hover:bg-blue-500/20 transition">
              <p className="text-lg">📦📦📦</p>
              <p className="text-xs font-bold text-blue-300">3개 세트</p>
              <p className="text-[10px] text-amber-400">20💰</p>
            </button>
            <button onClick={() => buyPart(10)} className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl py-3 text-center hover:bg-purple-500/20 transition">
              <p className="text-lg">🎁</p>
              <p className="text-xs font-bold text-purple-300">10개 팩</p>
              <p className="text-[10px] text-amber-400">60💰</p>
            </button>
          </div>
        </div>

        {/* 합체소 */}
        <div className="px-4 mt-4">
          <h2 className="text-sm font-bold text-slate-400 mb-2">⚡ 합체소</h2>
          <div className="flex gap-2 flex-wrap">
            {(["head", "body", "arm", "leg", "core"] as Part["slot"][]).map((slot) => {
              const count = inventory.filter((p) => p.slot === slot).length;
              return (
                <button key={slot} onClick={() => startMerge(slot)}
                  disabled={count < 2}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${count >= 2
                    ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
                    : "bg-white/5 text-slate-600 cursor-not-allowed"}`}>
                  {SLOT_LABELS[slot]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 인벤토리 */}
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-slate-400">🎒 인벤토리 ({inventory.length})</h2>
            <div className="flex gap-1 ml-auto">
              {(["all", "head", "body", "arm", "leg", "core"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${filter === f ? "bg-cyan-500/30 text-cyan-300" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}>
                  {f === "all" ? "전체" : SLOT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredInv.sort((a, b) => b.tier - a.tier || a.slot.localeCompare(b.slot)).map((part) => (
              <div key={part.id} className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold" style={{ color: TIER_COLORS[part.tier] }}>{part.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ color: TIER_COLORS[part.tier], borderColor: TIER_COLORS[part.tier], borderWidth: 1 }}>
                    {TIER_NAMES[part.tier]}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-1">{SLOT_LABELS[part.slot]} | HP:{part.hp} ATK:{part.atk} DEF:{part.def}</p>
                {part.special && <p className="text-[10px] text-purple-400 mb-1">✨ {part.special}</p>}
                <div className="flex gap-1">
                  <button onClick={() => equipPart(part)}
                    className="flex-1 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30 transition text-[10px]">
                    장착
                  </button>
                  <button onClick={() => sellPart(part)}
                    className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold hover:bg-amber-500/30 transition text-[10px]">
                    판매 {part.tier * 5 + 3}💰
                  </button>
                </div>
              </div>
            ))}
            {filteredInv.length === 0 && <p className="col-span-full text-center text-slate-600 text-xs py-8">부품이 없어요. 상점에서 구매하세요!</p>}
          </div>
        </div>

        {/* 합체 모달 */}
        {showMerge && mergeSlot && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm">
              <h3 className="text-lg font-bold text-yellow-400 mb-1 text-center">⚡ {SLOT_LABELS[mergeSlot]} 합체</h3>
              <p className="text-xs text-slate-400 text-center mb-4">같은 등급 부품 2개를 선택하세요</p>

              {/* 합체 슬롯 */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center text-xs ${mergeItems[0] ? "border-yellow-400 bg-yellow-500/10" : "border-white/20 bg-white/5"}`}>
                  {mergeItems[0] ? (
                    <>
                      <span className="font-bold" style={{ color: TIER_COLORS[mergeItems[0].tier] }}>{mergeItems[0].name}</span>
                      <span className="text-[10px] text-slate-400">{TIER_NAMES[mergeItems[0].tier]}</span>
                    </>
                  ) : <span className="text-slate-600">선택</span>}
                </div>
                <span className="text-2xl text-yellow-400 font-black">+</span>
                <div className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center text-xs ${mergeItems[1] ? "border-yellow-400 bg-yellow-500/10" : "border-white/20 bg-white/5"}`}>
                  {mergeItems[1] ? (
                    <>
                      <span className="font-bold" style={{ color: TIER_COLORS[mergeItems[1].tier] }}>{mergeItems[1].name}</span>
                      <span className="text-[10px] text-slate-400">{TIER_NAMES[mergeItems[1].tier]}</span>
                    </>
                  ) : <span className="text-slate-600">선택</span>}
                </div>
              </div>

              {mergeResult && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-center animate-pulse">
                  <p className="text-lg font-black" style={{ color: TIER_COLORS[mergeResult.tier] }}>{mergeResult.name}</p>
                  <p className="text-xs text-slate-400">HP:{mergeResult.hp} ATK:{mergeResult.atk} DEF:{mergeResult.def}</p>
                  {mergeResult.special && <p className="text-xs text-purple-400">✨ {mergeResult.special}</p>}
                </div>
              )}

              {/* 부품 목록 */}
              <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
                {inventory.filter((p) => p.slot === mergeSlot).sort((a, b) => b.tier - a.tier).map((p) => {
                  const selected = mergeItems[0]?.id === p.id || mergeItems[1]?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => selectMergeItem(p)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${selected ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-white/5 hover:bg-white/10"}`}>
                      <span className="font-bold" style={{ color: TIER_COLORS[p.tier] }}>{p.name}</span>
                      <span className="text-slate-500">{TIER_NAMES[p.tier]} | ATK:{p.atk}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={doMerge}
                  disabled={!mergeItems[0] || !mergeItems[1] || mergeItems[0].tier !== mergeItems[1].tier}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${mergeItems[0] && mergeItems[1] && mergeItems[0].tier === mergeItems[1].tier
                    ? "bg-gradient-to-r from-yellow-500 to-amber-600 hover:scale-105 active:scale-95"
                    : "bg-white/10 text-slate-600 cursor-not-allowed"}`}>
                  합체! ({mergeItems[0] ? mergeItems[0].tier * 10 : "?"} 💰)
                </button>
                <button onClick={() => setShowMerge(false)} className="px-6 py-3 rounded-xl bg-white/10 text-slate-400 font-bold hover:bg-white/20 transition text-sm">
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── 전투 ── */
  if (screen === "battle" && enemy) {
    const maxHp = calcStats(robot).hp;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-red-950/30 to-slate-950 text-white flex flex-col">
        <Link href="/" className="fixed top-3 left-3 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs hover:bg-white/20 transition z-50">← 홈</Link>

        <div className="text-center pt-6 mb-4">
          <p className="text-xs text-slate-400">스테이지 {stage + 1}</p>
          <h2 className="text-xl font-black text-red-400">⚔️ 전투!</h2>
        </div>

        {/* 전투 비주얼 */}
        <div className="flex justify-between items-center px-6 mb-4">
          {/* 내 로봇 */}
          <div className={`text-center transition-all ${playerShake ? "translate-x-2 -translate-y-1" : ""}`}>
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border ${turn === "player" ? "border-cyan-400 shadow-lg shadow-cyan-500/30" : "border-white/10"} flex items-center justify-center mb-2 mx-auto`}>
              <div className="text-center">
                <div className="text-3xl">🤖</div>
                <div className="text-[8px] text-cyan-400 font-bold">Lv.{Math.round(stats.avgTier * 10) / 10}</div>
              </div>
            </div>
            <div className="w-24 mx-auto">
              <div className="h-2.5 rounded-full bg-black/50 overflow-hidden mb-1">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, (robotHp / maxHp) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">❤️ {robotHp}/{maxHp}</p>
            </div>
          </div>

          <div className="text-3xl font-black text-red-500 animate-pulse">VS</div>

          {/* 적 */}
          <div className={`text-center transition-all ${enemyShake ? "-translate-x-2 -translate-y-1" : ""}`}>
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${enemy.img} border ${turn === "enemy" ? "border-red-400 shadow-lg shadow-red-500/30" : "border-white/10"} flex items-center justify-center mb-2 mx-auto`}>
              <div className="text-center">
                <div className="text-3xl">{enemy.name.includes("드론") ? "🛸" : enemy.name.includes("탱크") ? "🛡️" : enemy.name.includes("용") || enemy.name.includes("드래곤") ? "🐉" : enemy.name.includes("갓") ? "👑" : "💀"}</div>
                <div className="text-[8px] text-white/80 font-bold">{enemy.name}</div>
              </div>
            </div>
            <div className="w-24 mx-auto">
              <div className="h-2.5 rounded-full bg-black/50 overflow-hidden mb-1">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, (enemyHp / enemy.maxHp) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">❤️ {enemyHp}/{enemy.maxHp}</p>
            </div>
          </div>
        </div>

        {/* 전투 로그 */}
        <div ref={logRef} className="mx-4 rounded-xl bg-black/40 border border-white/5 p-3 h-40 overflow-y-auto space-y-1 flex-shrink-0">
          {battleLog.map((log, i) => (
            <p key={i} className={`text-xs font-medium ${
              log.type === "player" ? "text-cyan-400" :
              log.type === "enemy" ? "text-red-400" :
              log.type === "crit" ? "text-yellow-400 font-black" :
              log.type === "special" ? "text-purple-400 font-bold" :
              "text-amber-400"
            }`}>
              {log.text}
            </p>
          ))}
        </div>

        {/* 공격 버튼 */}
        <div className="mt-auto p-4 space-y-2">
          {shield > 0 && (
            <p className="text-center text-xs text-blue-400">🛡️ 방어 강화 {shield}턴</p>
          )}
          {turn === "player" ? (
            <div className="flex gap-2">
              <button onClick={() => doAttack("normal")}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 font-bold transition hover:scale-105 active:scale-95 text-sm">
                ⚔️ 일반공격
              </button>
              <button onClick={() => doAttack("heavy")}
                className={`flex-1 py-4 rounded-xl font-bold transition text-sm ${
                  cooldowns["heavy"] ? "bg-white/10 text-slate-600" : "bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 active:scale-95"
                }`}>
                💥 강타{cooldowns["heavy"] ? ` (${cooldowns["heavy"]})` : ""}
              </button>
              <button onClick={() => doAttack("special")}
                disabled={stats.specials.length === 0}
                className={`flex-1 py-4 rounded-xl font-bold transition text-sm ${
                  cooldowns["special"] || stats.specials.length === 0
                    ? "bg-white/10 text-slate-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 active:scale-95"
                }`}>
                ✨ 특수기{cooldowns["special"] ? ` (${cooldowns["special"]})` : ""}
              </button>
            </div>
          ) : turn === "enemy" ? (
            <div className="text-center py-4">
              <p className="text-red-400 animate-pulse font-bold">적 공격 중...</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-amber-400 font-bold animate-bounce">결과 처리 중...</p>
            </div>
          )}

          <button onClick={() => setScreen("workshop")} className="w-full py-2 rounded-xl bg-white/5 text-slate-500 text-xs hover:bg-white/10 transition">
            도망치기 (작업장으로)
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════
   서브 컴포넌트
═══════════════════════════════════════════ */
function SlotBox({ part, label, slotKey, onUnequip }: { part: Part | null; label: string; slotKey: string; onUnequip: () => void }) {
  return (
    <button onClick={part ? onUnequip : undefined}
      className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-[10px] transition-all ${
        part
          ? `${part.accent} bg-white/5 hover:bg-white/10 active:scale-95`
          : "border-dashed border-white/10 bg-white/[0.02]"
      }`}
      title={part ? `${part.name} (클릭하면 해제)` : `${label} 빈 슬롯`}
    >
      {part ? (
        <>
          <span className="font-bold leading-tight" style={{ color: TIER_COLORS[part.tier], fontSize: "10px" }}>{part.name}</span>
          <span className="text-[8px] text-slate-500">{TIER_NAMES[part.tier]}</span>
        </>
      ) : (
        <span className="text-slate-600">{label}</span>
      )}
    </button>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <p className="text-slate-500 mb-0.5">{label}</p>
      <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <p className="font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}
