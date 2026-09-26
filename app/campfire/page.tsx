"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { BLOW_THRESHOLD, useMic } from "./useMic";

type Phase = "ready" | "shop" | "playing" | "rain" | "result";

/** 비가 내리기까지의 시간. 이 게임에서 "비" = 제한시간이다. */
const ROUND_SECONDS = 10;
const TICK_MS = 100;
/** 틱마다 곱하는 기본 감쇠율(초당 약 8% 감소). 방풍막 업그레이드가 이 값을 올려준다. */
const BASE_DECAY_PER_TICK = 0.992;
/** 보호막이 뚫린 뒤 비가 불을 꺼뜨리는 속도. */
const RAIN_DECAY_PER_TICK = 0.94;
/** 보호막이 뚫린 뒤 불이 완전히 꺼지기까지의 시간. 점수는 이 연출 전에 확정된다. */
const RAIN_KILL_MS = 1800;

const BASE_SPAWN_MS = 700;
const BASE_FUEL = 20;
/** 통나무가 사라지기까지의 시간. 늦게 누르면 놓친다. */
const LOG_LIFETIME_MS = 4000;
const MAX_LOGS = 14;

const SAVE_KEY = "campfire_save_v2";

/** 세게 불었을 때 1초에 오르는 화력. 장작(초당 약 28)과 비슷한 수준으로 맞춘다. */
const BLOW_FUEL_PER_SECOND = 40;
/** 이 세기 이상 불면 최대 효과. 임계값에서 여기까지가 세기 구간이다. */
const BLOW_FULL_LEVEL = 0.38;
/** 박수 한 번에 나무에서 떨어지는 통나무 수 */
const CLAP_LOGS = 3;

type UpgradeId = "axe" | "bigTree" | "sturdy" | "umbrella" | "windbreak" | "squirrel";

// ── 업그레이드 효과 공식. 설명과 실제 계산이 어긋나지 않도록 한 곳에만 둔다. ──
function spawnIntervalMs(level: number): number {
  return Math.max(250, BASE_SPAWN_MS * Math.pow(0.85, level));
}
function logsPerSpawn(level: number): number {
  return 1 + level;
}
function fuelPerLog(level: number): number {
  return BASE_FUEL + level * 4;
}
function rainShieldSeconds(level: number): number {
  return level * 2;
}
function decayPerTick(level: number): number {
  return Math.min(0.998, BASE_DECAY_PER_TICK + level * 0.0012);
}
/** 설명용: 초당 몇 %가 줄어드는지. */
function decayPercentPerSecond(level: number): number {
  return Math.round((1 - Math.pow(decayPerTick(level), 10)) * 100);
}
function squirrelPerSecond(level: number): number {
  return level * 6;
}

interface Upgrade {
  id: UpgradeId;
  name: string;
  emoji: string;
  /** 현재 레벨을 받아 다음 레벨의 효과를 한 줄로 설명한다. */
  describe: (level: number) => string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
}

const UPGRADES: Upgrade[] = [
  {
    id: "axe",
    name: "잘 드는 도끼",
    emoji: "🪓",
    describe: (lv) =>
      `통나무가 더 자주 나와요 (${spawnIntervalMs(lv).toFixed(0)}ms → ${spawnIntervalMs(lv + 1).toFixed(0)}ms)`,
    baseCost: 120,
    costMultiplier: 1.7,
    maxLevel: 5,
  },
  {
    id: "bigTree",
    name: "큰 나무",
    emoji: "🌳",
    describe: (lv) => `한 번에 나오는 통나무 ${logsPerSpawn(lv)}개 → ${logsPerSpawn(lv + 1)}개`,
    baseCost: 400,
    costMultiplier: 2.4,
    maxLevel: 3,
  },
  {
    id: "sturdy",
    name: "튼튼한 장작",
    emoji: "🪵",
    describe: (lv) => `통나무 1개당 화력 ${fuelPerLog(lv)} → ${fuelPerLog(lv + 1)}`,
    baseCost: 150,
    costMultiplier: 1.8,
    maxLevel: 8,
  },
  {
    id: "umbrella",
    name: "비 보호막",
    emoji: "☂️",
    describe: (lv) => `비가 와도 ${rainShieldSeconds(lv)}초 → ${rainShieldSeconds(lv + 1)}초 더 버텨요`,
    baseCost: 300,
    costMultiplier: 2.1,
    maxLevel: 5,
  },
  {
    id: "windbreak",
    name: "방풍막",
    emoji: "🍃",
    describe: (lv) =>
      `불이 꺼지는 속도 감소 (초당 ${decayPercentPerSecond(lv)}% → ${decayPercentPerSecond(lv + 1)}%)`,
    baseCost: 250,
    costMultiplier: 1.9,
    maxLevel: 5,
  },
  {
    id: "squirrel",
    name: "다람쥐 도우미",
    emoji: "🐿️",
    describe: (lv) => `혼자서 초당 화력 +${squirrelPerSecond(lv)} → +${squirrelPerSecond(lv + 1)}`,
    baseCost: 500,
    costMultiplier: 2.2,
    maxLevel: 5,
  },
];

type UpgradeLevels = Record<UpgradeId, number>;

const EMPTY_LEVELS: UpgradeLevels = {
  axe: 0,
  bigTree: 0,
  sturdy: 0,
  umbrella: 0,
  windbreak: 0,
  squirrel: 0,
};

function upgradeCost(upgrade: Upgrade, level: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
}

interface FireStage {
  min: number;
  name: string;
  emoji: string;
  sky: string;
}

/** 화력 구간별 모습. min 은 오름차순이어야 하고, 마지막 구간이 최대 단계다. */
const FIRE_STAGES: FireStage[] = [
  { min: 0, name: "불씨", emoji: "🕯️", sky: "from-slate-900 via-slate-950 to-black" },
  { min: 40, name: "작은 불", emoji: "🔥", sky: "from-amber-950 via-slate-950 to-black" },
  { min: 120, name: "모닥불", emoji: "🏕️", sky: "from-orange-900 via-amber-950 to-black" },
  { min: 300, name: "큰 모닥불", emoji: "🔥🔥", sky: "from-orange-800 via-amber-900 to-stone-950" },
  { min: 700, name: "화톳불", emoji: "🌋", sky: "from-red-800 via-orange-900 to-stone-950" },
  { min: 1500, name: "봉화", emoji: "☄️", sky: "from-rose-700 via-red-900 to-stone-950" },
  { min: 3000, name: "태양불", emoji: "☀️", sky: "from-yellow-500 via-orange-700 to-stone-950" },
];

function stageFor(heat: number): FireStage {
  let found = FIRE_STAGES[0];
  for (const stage of FIRE_STAGES) {
    if (heat >= stage.min) found = stage;
  }
  return found;
}

function gradeFor(score: number): { text: string; emoji: string; color: string } {
  if (score >= 3000) return { text: "태양을 만들었다!", emoji: "☀️", color: "text-yellow-300" };
  if (score >= 1500) return { text: "산 너머까지 보이는 봉화!", emoji: "☄️", color: "text-rose-300" };
  if (score >= 700) return { text: "엄청난 불길!", emoji: "🤩", color: "text-orange-300" };
  if (score >= 300) return { text: "잘 키웠어!", emoji: "😃", color: "text-amber-300" };
  if (score >= 120) return { text: "따뜻한 모닥불!", emoji: "🙂", color: "text-amber-200" };
  return { text: "겨우 살아남은 불씨...", emoji: "😅", color: "text-slate-300" };
}

interface LogItem {
  id: number;
  /** 놀이 영역 기준 퍼센트 좌표. */
  x: number;
  y: number;
  bornAt: number;
  emoji: string;
}

interface FloatEffect {
  id: number;
  value: number;
  x: number;
  y: number;
}

const LOG_EMOJIS = ["🪵", "🪵", "🪵", "🌿"];

/** 빗방울은 고정 배치를 쓴다. 매 렌더 난수를 뽑으면 비가 덜덜 떨린다. */
const RAIN_DROPS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  delay: ((i * 13) % 10) / 10,
  duration: 0.5 + ((i * 7) % 5) / 10,
}));

export default function CampfireGame() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [heat, setHeat] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [shieldLeft, setShieldLeft] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [effects, setEffects] = useState<FloatEffect[]>([]);
  const [collected, setCollected] = useState(0);
  const [missed, setMissed] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [acorns, setAcorns] = useState(0);
  const [levels, setLevels] = useState<UpgradeLevels>(EMPTY_LEVELS);
  const [flare, setFlare] = useState(0);
  const {
    status: micStatus,
    level: micLevel,
    readLevel,
    readImpacts,
    start: micStart,
    stop: micStop,
  } = useMic();

  // 화력·통나무는 타이머 콜백과 클릭 핸들러가 함께 건드린다.
  // ref 를 원본으로 두고 state 는 표시용으로 따라간다.
  const heatRef = useRef(0);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const levelsRef = useRef<UpgradeLevels>(EMPTY_LEVELS);
  const startRef = useRef(0);
  const nextSpawnRef = useRef(0);
  const idRef = useRef(0);
  const settledRef = useRef(false);
  const loadedRef = useRef(false);
  /** 지금까지 반영한 박수 횟수. 훅이 세는 값과의 차이만큼 나무를 흔든다. */
  const clapsSeenRef = useRef(0);
  const [treeShake, setTreeShake] = useState(0);

  useEffect(() => {
    // 저장은 최초 1회만 읽는다. 이후 갱신은 항상 ref → state 순서로 간다.
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return;
      const data = parsed as { best?: number; acorns?: number; levels?: Partial<UpgradeLevels> };

      const savedBest = Number(data.best ?? 0);
      const savedAcorns = Number(data.acorns ?? 0);
      const savedLevels: UpgradeLevels = { ...EMPTY_LEVELS };
      for (const upgrade of UPGRADES) {
        const value = Number(data.levels?.[upgrade.id] ?? 0);
        savedLevels[upgrade.id] = Number.isFinite(value)
          ? Math.min(upgrade.maxLevel, Math.max(0, Math.floor(value)))
          : 0;
      }

      bestRef.current = Number.isFinite(savedBest) ? savedBest : 0;
      levelsRef.current = savedLevels;
      setBest(bestRef.current);
      setAcorns(Number.isFinite(savedAcorns) ? savedAcorns : 0);
      setLevels(savedLevels);
    } catch {
      /* 저장소를 못 써도 게임은 처음부터 그대로 돌아간다 */
    }
  }, []);

  const persist = useCallback((nextAcorns: number, nextLevels: UpgradeLevels, nextBest: number) => {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ best: nextBest, acorns: nextAcorns, levels: nextLevels })
      );
    } catch {
      /* 저장 실패는 기록만 안 남을 뿐 진행에 지장 없다 */
    }
  }, []);

  const applyHeat = useCallback((next: number) => {
    heatRef.current = Math.max(0, next);
    setHeat(heatRef.current);
  }, []);

  const spawnLog = useCallback((now: number): LogItem => {
    return {
      id: idRef.current++,
      // 나무(왼쪽 위)에서 굴러 나온 듯 흩어놓되, 불(아래 가운데)과는 겹치지 않게 둔다.
      x: 8 + Math.random() * 78,
      y: 8 + Math.random() * 52,
      bornAt: now,
      emoji: LOG_EMOJIS[Math.floor(Math.random() * LOG_EMOJIS.length)],
    };
  }, []);

  const startRound = useCallback(() => {
    applyHeat(0);
    scoreRef.current = 0;
    settledRef.current = false;
    clapsSeenRef.current = readImpacts();
    startRef.current = performance.now();
    nextSpawnRef.current = 0;
    setScore(0);
    setCollected(0);
    setMissed(0);
    setLogs([]);
    setEffects([]);
    setIsNewBest(false);
    setShieldLeft(rainShieldSeconds(levelsRef.current.umbrella));
    setTimeLeft(ROUND_SECONDS);
    setPhase("playing");
  }, [applyHeat, readImpacts]);

  /**
   * 점수를 확정한다. 호출 시점은 "비가 보호막을 뚫은 순간"이고, 이후 불이 꺼지는 1.8초는
   * 연출일 뿐 점수에 영향을 주지 않는다. 오래 버틸수록 점수가 깎이면 보호막 업그레이드가
   * 벌점이 되기 때문이다.
   */
  const settleScore = useCallback(() => {
    const finalScore = Math.round(heatRef.current);
    scoreRef.current = finalScore;
    setScore(finalScore);

    if (finalScore > bestRef.current) {
      bestRef.current = finalScore;
      setBest(finalScore);
      setIsNewBest(true);
    }
    setAcorns((prev) => {
      const next = prev + finalScore;
      persist(next, levelsRef.current, bestRef.current);
      return next;
    });
  }, [persist]);

  // 라운드 진행: 통나무 생성 / 수명 정리 / 화력 자연 감소 / 남은 시간.
  useEffect(() => {
    if (phase !== "playing") return;
    const lv = levelsRef.current;

    const id = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      setTimeLeft(Math.max(0, ROUND_SECONDS - elapsed));

      applyHeat(heatRef.current * decayPerTick(lv.windbreak));
      const auto = squirrelPerSecond(lv.squirrel);
      if (auto > 0) applyHeat(heatRef.current + (auto * TICK_MS) / 1000);

      // 마이크에 대고 불면 불이 살아난다. 임계값 아래 생활 소음은 무시한다.
      const loudness = readLevel();
      if (loudness > BLOW_THRESHOLD) {
        const strength = Math.min(1, (loudness - BLOW_THRESHOLD) / (BLOW_FULL_LEVEL - BLOW_THRESHOLD));
        applyHeat(heatRef.current + (BLOW_FUEL_PER_SECOND * strength * TICK_MS) / 1000);
      }

      if (now >= nextSpawnRef.current) {
        nextSpawnRef.current = now + spawnIntervalMs(lv.axe);
        const count = logsPerSpawn(lv.bigTree);
        setLogs((prev) => {
          const born: LogItem[] = [];
          for (let i = 0; i < count; i++) born.push(spawnLog(now));
          return [...prev, ...born].slice(-MAX_LOGS);
        });
      }

      // 박수를 치면(치는 소리) 나무가 흔들려 통나무가 우수수 떨어진다.
      const claps = readImpacts();
      if (claps > clapsSeenRef.current) {
        clapsSeenRef.current = claps;
        setTreeShake((prev) => prev + 1);
        setLogs((prev) => {
          const born: LogItem[] = [];
          for (let i = 0; i < CLAP_LOGS; i++) born.push(spawnLog(now));
          return [...prev, ...born].slice(-MAX_LOGS);
        });
      }

      // 수명이 다한 통나무는 놓친 것으로 센다.
      setLogs((prev) => {
        const alive = prev.filter((log) => now - log.bornAt < LOG_LIFETIME_MS);
        const gone = prev.length - alive.length;
        if (gone > 0) setMissed((m) => m + gone);
        return alive;
      });

      if (elapsed >= ROUND_SECONDS) setPhase("rain");
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, applyHeat, spawnLog, readLevel, readImpacts]);

  // 비: 보호막이 있으면 그동안 계속 장작을 넣을 수 있다. 보호막이 끝나면 불이 꺼진다.
  useEffect(() => {
    if (phase !== "rain") return;
    const lv = levelsRef.current;
    const shieldMs = rainShieldSeconds(lv.umbrella) * 1000;
    const rainStart = performance.now();
    nextSpawnRef.current = 0;

    const id = setInterval(() => {
      const now = performance.now();
      const rainElapsed = now - rainStart;
      setShieldLeft(Math.max(0, (shieldMs - rainElapsed) / 1000));
      // 보호막이 살아 있는 동안에는 비가 막히므로 평소 감쇠만 적용된다.
      applyHeat(
        heatRef.current * (rainElapsed < shieldMs ? decayPerTick(lv.windbreak) : RAIN_DECAY_PER_TICK)
      );

      // 보호막 아래에서는 계속 불어서 불을 살릴 수 있다.
      const loudness = readLevel();
      if (rainElapsed < shieldMs && loudness > BLOW_THRESHOLD) {
        const strength = Math.min(1, (loudness - BLOW_THRESHOLD) / (BLOW_FULL_LEVEL - BLOW_THRESHOLD));
        applyHeat(heatRef.current + (BLOW_FUEL_PER_SECOND * strength * TICK_MS) / 1000);
      }

      if (rainElapsed < shieldMs) {
        // 보호막이 버티는 동안에는 나무도 계속 통나무를 내놓는다.
        if (now >= nextSpawnRef.current) {
          nextSpawnRef.current = now + spawnIntervalMs(lv.axe);
          setLogs((prev) => [...prev, spawnLog(now)].slice(-MAX_LOGS));
        }
        setLogs((prev) => prev.filter((log) => now - log.bornAt < LOG_LIFETIME_MS));
        return;
      }

      // 보호막이 막 뚫린 틱에 점수를 확정한다. 이후는 꺼지는 연출.
      if (!settledRef.current) {
        settledRef.current = true;
        settleScore();
        setLogs([]);
      }
      if (rainElapsed >= shieldMs + RAIN_KILL_MS) setPhase("result");
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, applyHeat, spawnLog, settleScore, readLevel]);

  const grabLog = useCallback(
    (log: LogItem) => {
      if (phase !== "playing" && phase !== "rain") return;
      const gain = fuelPerLog(levelsRef.current.sturdy);
      applyHeat(heatRef.current + gain);
      setCollected((prev) => prev + 1);
      setLogs((prev) => prev.filter((item) => item.id !== log.id));
      setFlare((prev) => prev + 1);

      const id = idRef.current++;
      setEffects((prev) => [...prev.slice(-9), { id, value: gain, x: log.x, y: log.y }]);
      setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== id)), 700);
    },
    [phase, applyHeat]
  );

  const buyUpgrade = useCallback(
    (upgrade: Upgrade) => {
      const level = levelsRef.current[upgrade.id];
      if (level >= upgrade.maxLevel) return;
      const cost = upgradeCost(upgrade, level);
      if (acorns < cost) return;

      const nextLevels: UpgradeLevels = { ...levelsRef.current, [upgrade.id]: level + 1 };
      const nextAcorns = acorns - cost;
      levelsRef.current = nextLevels;
      setLevels(nextLevels);
      setAcorns(nextAcorns);
      persist(nextAcorns, nextLevels, bestRef.current);
    },
    [acorns, persist]
  );

  const stage = stageFor(heat);
  const grade = gradeFor(score);
  // 화력이 오를수록 불이 실제로 커 보이도록 2.5rem → 9rem 사이를 훑는다.
  const fireSize = 2.5 + Math.min(1, heat / 3000) * 6.5;
  const raining = phase === "rain";
  const shielded = raining && shieldLeft > 0;
  const warning = phase === "playing" && timeLeft <= 3;
  const inPlay = phase === "playing" || raining;
  const shieldMax = Math.max(1, rainShieldSeconds(levels.umbrella));

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-b text-white transition-all duration-500 ${
        raining ? "from-slate-700 via-slate-900 to-black" : stage.sky
      }`}
    >
      <style jsx global>{`
        @keyframes fireFlicker {
          0%, 100% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.06) translateY(-4px); }
          50% { transform: scale(0.97) translateY(2px); }
          75% { transform: scale(1.04) translateY(-2px); }
        }
        .fire-flicker { animation: fireFlicker 0.45s ease-in-out infinite; }
        @keyframes logPop {
          0% { transform: scale(0) rotate(-40deg); opacity: 0; }
          70% { transform: scale(1.15) rotate(6deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .log-pop { animation: logPop 0.28s ease-out; }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
        .float-up { animation: floatUp 0.7s ease-out forwards; }
        @keyframes rainFall {
          0% { transform: translateY(-10vh); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        .rain-drop { animation: rainFall linear infinite; }
        @keyframes warnPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .warn-pulse { animation: warnPulse 0.6s ease-in-out infinite; }
        @keyframes treeShake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-4deg); }
        }
        .tree-shake { animation: treeShake 1.6s ease-in-out infinite; }
        @keyframes treeQuake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-14deg) scale(1.1); }
          45% { transform: rotate(12deg) scale(1.08); }
          70% { transform: rotate(-7deg) scale(1.04); }
        }
        .tree-quake { animation: treeQuake 0.6s ease-out; }
      `}</style>

      {raining && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {RAIN_DROPS.map((drop) => (
            <span
              key={drop.id}
              className="rain-drop absolute text-2xl"
              style={{
                left: `${drop.left}%`,
                animationDelay: `${drop.delay}s`,
                animationDuration: `${drop.duration}s`,
              }}
            >
              💧
            </span>
          ))}
        </div>
      )}

      <Link
        href="/"
        className="absolute left-4 top-4 z-30 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/25"
      >
        ← 홈으로
      </Link>

      <div className="z-10 flex w-full max-w-lg flex-1 flex-col items-center px-5 pb-8 pt-20">
        {phase === "ready" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 text-8xl">🔥</div>
            <h1 className="mb-3 text-4xl font-black">모닥불 키우기</h1>
            <p className="mb-2 text-lg text-white/70">10초 뒤에 비가 내려요!</p>
            <p className="mb-8 text-sm text-white/50">나무에서 나온 통나무를 눌러 불에 넣으세요</p>

            <div className="mb-6 w-full space-y-2 rounded-2xl bg-white/10 p-5 text-left text-sm text-white/70 backdrop-blur">
              <p>🌳 나무가 계속 통나무를 내놓아요</p>
              <p>🪵 통나무를 누르면 모닥불로 들어가 화력이 올라가요</p>
              <p>⏳ 통나무는 4초 뒤 사라지니 빨리 누르세요</p>
              <p>💨 가만히 두면 불은 저절로 작아져요</p>
              <p>👏 박수를 치면 나무가 흔들려 통나무가 우수수 떨어져요</p>
              <p>🌧️ 비가 오면 라운드 끝 — 그때 불 크기가 점수예요</p>
              <p>🌰 점수만큼 도토리를 받아 업그레이드를 살 수 있어요</p>
            </div>

            <div className="mb-4 w-full rounded-2xl bg-white/10 p-4 text-sm">
              <p className="mb-2 font-bold text-sky-200">🎤 후~ 불기 모드</p>
              <p className="mb-3 text-xs text-white/60">
                마이크에 &quot;후~&quot; 하고 불면 불이 커지고, <b>박수를 치면</b> 나무가 흔들려 통나무가
                떨어져요! 소리 크기만 재고 녹음하지 않아요.
              </p>
              {micStatus === "on" ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-emerald-300">켜짐 — 불어서 확인해 보세요</span>
                    <button onClick={micStop} className="text-white/50 underline">
                      끄기
                    </button>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/40">
                    <div
                      className={`h-full rounded-full transition-all duration-75 ${
                        micLevel > BLOW_THRESHOLD ? "bg-orange-400" : "bg-sky-400"
                      }`}
                      style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => void micStart()}
                  disabled={micStatus === "asking"}
                  className="w-full rounded-full bg-sky-500/80 py-2 font-bold transition hover:bg-sky-500 active:scale-95 disabled:opacity-50"
                >
                  {micStatus === "asking"
                    ? "허락을 기다리는 중..."
                    : micStatus === "denied"
                      ? "다시 시도하기 (마이크가 막혔어요)"
                      : micStatus === "unsupported"
                        ? "이 브라우저는 마이크를 못 써요"
                        : "🎤 마이크 켜기"}
                </button>
              )}
            </div>

            <div className="mb-6 flex gap-4 text-sm">
              <span className="text-amber-300">🌰 {acorns.toLocaleString()}</span>
              {best > 0 && <span className="text-yellow-300">🏆 최고 {best.toLocaleString()}</span>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startRound}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-10 py-4 text-xl font-black shadow-lg transition hover:scale-105 active:scale-95"
              >
                불 피우기 🔥
              </button>
              <button
                onClick={() => setPhase("shop")}
                className="rounded-full bg-white/15 px-6 py-4 text-lg font-bold backdrop-blur transition hover:bg-white/25 active:scale-95"
              >
                업그레이드 🛠️
              </button>
            </div>
          </div>
        )}

        {phase === "shop" && (
          <div className="flex w-full flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">🛠️ 업그레이드</h2>
              <span className="rounded-full bg-amber-500/20 px-4 py-2 font-black text-amber-300">
                🌰 {acorns.toLocaleString()}
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {UPGRADES.map((upgrade) => {
                const level = levels[upgrade.id];
                const maxed = level >= upgrade.maxLevel;
                const cost = upgradeCost(upgrade, level);
                const affordable = !maxed && acorns >= cost;
                return (
                  <button
                    key={upgrade.id}
                    onClick={() => buyUpgrade(upgrade)}
                    disabled={maxed || !affordable}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      maxed
                        ? "border-amber-500/40 bg-amber-500/10"
                        : affordable
                          ? "border-white/25 bg-white/10 hover:bg-white/20 active:scale-[0.99]"
                          : "border-white/10 bg-white/5 opacity-50"
                    }`}
                  >
                    <span className="text-4xl">{upgrade.emoji}</span>
                    <span className="flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="font-bold">{upgrade.name}</span>
                        <span className="text-xs text-amber-300">
                          Lv.{level}/{upgrade.maxLevel}
                        </span>
                      </span>
                      <span className="block text-xs text-white/60">
                        {maxed ? "최고 레벨이에요!" : upgrade.describe(level)}
                      </span>
                    </span>
                    <span className={`font-black ${affordable ? "text-amber-300" : "text-white/40"}`}>
                      {maxed ? "MAX" : `🌰 ${cost.toLocaleString()}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setPhase("ready")}
                className="flex-1 rounded-full bg-white/15 px-6 py-4 text-lg font-bold backdrop-blur transition hover:bg-white/25 active:scale-95"
              >
                ← 돌아가기
              </button>
              <button
                onClick={startRound}
                className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-lg font-black shadow-lg transition hover:scale-105 active:scale-95"
              >
                바로 시작 🔥
              </button>
            </div>
          </div>
        )}

        {inPlay && (
          <>
            <div className="mb-3 grid w-full grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 p-3 text-center backdrop-blur">
                <p className="text-xs text-white/50">화력</p>
                <p className="text-2xl font-black text-orange-300">{Math.round(heat).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-black/30 p-3 text-center backdrop-blur">
                <p className="text-xs text-white/50">{shielded ? "보호막" : "비까지"}</p>
                <p
                  className={`text-2xl font-black ${
                    shielded
                      ? "text-emerald-300"
                      : warning || raining
                        ? "warn-pulse text-red-400"
                        : "text-sky-300"
                  }`}
                >
                  {shielded ? `${shieldLeft.toFixed(1)}초` : raining ? "0.0초" : `${timeLeft.toFixed(1)}초`}
                </p>
              </div>
              <div className="rounded-2xl bg-black/30 p-3 text-center backdrop-blur">
                <p className="text-xs text-white/50">넣은 장작</p>
                <p className="text-2xl font-black text-amber-300">{collected}</p>
              </div>
            </div>

            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  shielded
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : warning || raining
                      ? "bg-gradient-to-r from-red-500 to-rose-600"
                      : "bg-gradient-to-r from-sky-400 to-blue-500"
                }`}
                style={{
                  width: shielded
                    ? `${(shieldLeft / shieldMax) * 100}%`
                    : `${(timeLeft / ROUND_SECONDS) * 100}%`,
                }}
              />
            </div>

            {micStatus === "on" && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-white/50">🎤</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      micLevel > BLOW_THRESHOLD ? "bg-orange-400" : "bg-sky-500/60"
                    }`}
                    style={{ width: `${Math.min(100, micLevel * 250)}%` }}
                  />
                </div>
                {micLevel > BLOW_THRESHOLD && (
                  <span className="text-xs font-bold text-orange-300">후~ 🔥</span>
                )}
              </div>
            )}

            <p className="mb-2 h-6 text-sm font-bold">
              {shielded ? (
                <span className="text-emerald-300">☂️ 보호막이 비를 막는 중! 계속 넣어요!</span>
              ) : raining ? (
                <span className="text-sky-300">🌧️ 비가 내린다! 불이 꺼져요...</span>
              ) : warning ? (
                <span className="warn-pulse text-red-300">☁️ 곧 비가 와!</span>
              ) : (
                <span className="text-white/60">
                  {stage.emoji} {stage.name}
                </span>
              )}
            </p>

            {/* 놀이 영역: 왼쪽 위 나무에서 통나무가 나오고, 아래 가운데 모닥불이 탄다. */}
            <div
              className="relative w-full flex-1 select-none overflow-hidden rounded-3xl border-4 border-dashed border-white/20 bg-black/20"
              style={{ minHeight: 340 }}
            >
              <span
                key={treeShake}
                className={`absolute left-3 top-3 text-5xl ${
                  treeShake > 0 ? "tree-quake" : raining ? "" : "tree-shake"
                }`}
              >
                🌳
              </span>

              {logs.map((log) => (
                <button
                  key={log.id}
                  onPointerDown={() => grabLog(log)}
                  aria-label="통나무 넣기"
                  className="log-pop absolute z-10 text-3xl transition-transform active:scale-125"
                  style={{ left: `${log.x}%`, top: `${log.y}%` }}
                >
                  {log.emoji}
                </button>
              ))}

              {effects.map((effect) => (
                <span
                  key={effect.id}
                  className="float-up pointer-events-none absolute z-20 text-lg font-black text-amber-300"
                  style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
                >
                  +{effect.value}
                </span>
              ))}

              <div className="absolute inset-x-0 bottom-6 flex flex-col items-center">
                <span
                  key={flare}
                  className={raining && !shielded ? "opacity-70 transition-opacity" : "fire-flicker"}
                  style={{ fontSize: `${fireSize}rem`, lineHeight: 1 }}
                >
                  {heat < 1 ? "🪵" : stage.emoji}
                </span>
                <div className="mt-2 h-2 w-40 rounded-full bg-amber-900/60" />
              </div>

              {logs.length === 0 && !raining && (
                <span className="absolute inset-x-0 top-1/2 text-center text-sm text-white/40">
                  나무에서 통나무가 나올 때까지 잠깐!
                </span>
              )}
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 text-7xl">{grade.emoji}</div>
            <p className="mb-1 text-sm text-white/50">불이 꺼졌을 때 크기</p>
            <p className="mb-2 text-6xl font-black text-orange-300">{score.toLocaleString()}</p>
            <p className={`mb-1 text-2xl font-bold ${grade.color}`}>{grade.text}</p>
            <p className="mb-4 text-sm text-white/50">
              {stageFor(score).emoji} {stageFor(score).name}까지 키웠어요
            </p>

            {isNewBest && <p className="mb-3 text-lg font-black text-yellow-300">🎉 신기록 달성!</p>}
            <p className="mb-6 text-lg font-bold text-amber-300">🌰 +{score.toLocaleString()} 도토리 획득!</p>

            <div className="mb-8 grid w-full grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/50">최고 기록</p>
                <p className="text-xl font-black text-yellow-300">{best.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/50">넣은 장작</p>
                <p className="text-xl font-black text-amber-300">{collected}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs text-white/50">놓친 통나무</p>
                <p className="text-xl font-black text-white/70">{missed}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startRound}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-xl font-black shadow-lg transition hover:scale-105 active:scale-95"
              >
                다시 도전 🔥
              </button>
              <button
                onClick={() => setPhase("shop")}
                className="rounded-full bg-white/15 px-6 py-4 text-lg font-bold backdrop-blur transition hover:bg-white/25 active:scale-95"
              >
                업그레이드 🛠️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
