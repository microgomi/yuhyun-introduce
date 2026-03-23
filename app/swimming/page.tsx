"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───
type Screen = "menu" | "modeSelect" | "raceSetup" | "race" | "raceResult" | "divingSetup" | "diving" | "divingResult" | "freeSwim" | "freeSwimResult" | "records";
type Stroke = "freestyle" | "backstroke" | "butterfly" | "breaststroke";
type RaceDistance = 50 | 100 | 200;
type DivingHeight = 3 | 5 | 10;

interface SwimmerState {
  name: string;
  lane: number;
  distance: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  armPhase: "left" | "right";
  emoji: string;
  isAI: boolean;
  aiSkill: number;
  finished: boolean;
  finishTime: number;
  animFrame: number;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  type: "coin" | "star" | "gem" | "ring";
  emoji: string;
  collected: boolean;
  points: number;
}

interface DivingTrick {
  name: string;
  keys: string[];
  difficulty: number;
  emoji: string;
}

interface Medal {
  type: "gold" | "silver" | "bronze";
  event: string;
  time?: number;
  score?: number;
}

interface PersonalBest {
  stroke: Stroke;
  distance: RaceDistance;
  time: number;
}

// ─── Constants ───
const STROKE_INFO: Record<Stroke, { name: string; emoji: string; speedMult: number; staminaCost: number; mechanic: string }> = {
  freestyle: { name: "자유형", emoji: "🏊", speedMult: 1.0, staminaCost: 1.0, mechanic: "좌우 번갈아 클릭!" },
  backstroke: { name: "배영", emoji: "🏊‍♂️", speedMult: 0.85, staminaCost: 0.8, mechanic: "리듬에 맞춰 클릭!" },
  butterfly: { name: "접영", emoji: "🦋", speedMult: 1.1, staminaCost: 1.4, mechanic: "양쪽 동시 클릭!" },
  breaststroke: { name: "평영", emoji: "🐸", speedMult: 0.75, staminaCost: 0.6, mechanic: "길게 눌렀다 놓기!" },
};

const AI_NAMES = ["김수영", "박해엄", "이물결", "최파도", "정돌고래", "한상어"];
const AI_EMOJIS = ["🏊‍♂️", "🏊‍♀️", "🐬", "🦈", "🐠", "🐙"];

const DIVING_TRICKS: DivingTrick[] = [
  { name: "전방 회전", keys: ["↑", "→", "↓"], difficulty: 1.5, emoji: "🔄" },
  { name: "후방 회전", keys: ["↓", "←", "↑"], difficulty: 1.8, emoji: "🔃" },
  { name: "비틀기", keys: ["←", "→", "←", "→"], difficulty: 2.0, emoji: "🌀" },
  { name: "파이크", keys: ["↑", "↑", "↓"], difficulty: 2.2, emoji: "📐" },
  { name: "턱", keys: ["↓", "↓", "↑", "↑"], difficulty: 2.5, emoji: "🎯" },
  { name: "자유 연기", keys: ["←", "↑", "→", "↓", "↑"], difficulty: 3.0, emoji: "⭐" },
];

const UNLOCKABLE_SUITS = [
  { name: "기본 수영복", emoji: "🩱", requirement: 0, speedBonus: 0 },
  { name: "경쟁 수영복", emoji: "👙", requirement: 3, speedBonus: 0.05 },
  { name: "프로 수영복", emoji: "🤿", requirement: 6, speedBonus: 0.1 },
  { name: "상어 수영복", emoji: "🦈", requirement: 10, speedBonus: 0.15 },
  { name: "전설 수영복", emoji: "🧜", requirement: 15, speedBonus: 0.2 },
];

const TICK = 16;

export default function SwimmingGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [stroke, setStroke] = useState<Stroke>("freestyle");
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(50);
  const [divingHeight, setDivingHeight] = useState<DivingHeight>(5);
  const [swimmers, setSwimmers] = useState<SwimmerState[]>([]);
  const [raceTime, setRaceTime] = useState(0);
  const [playerStamina, setPlayerStamina] = useState(100);
  const [lastArm, setLastArm] = useState<"left" | "right" | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [currentSuit, setCurrentSuit] = useState(0);

  // Diving state
  const [divingPhase, setDivingPhase] = useState<"ready" | "jumping" | "falling" | "tricks" | "entry" | "scored">("ready");
  const [diverY, setDiverY] = useState(0);
  const [diverRotation, setDiverRotation] = useState(0);
  const [currentTrick, setCurrentTrick] = useState<DivingTrick | null>(null);
  const [trickInputs, setTrickInputs] = useState<string[]>([]);
  const [trickSuccess, setTrickSuccess] = useState<boolean[]>([]);
  const [entryTiming, setEntryTiming] = useState<number | null>(null);
  const [judgeScores, setJudgeScores] = useState<number[]>([]);
  const [divingScore, setDivingScore] = useState(0);
  const [entryZoneActive, setEntryZoneActive] = useState(false);

  // Free swim state
  const [freeSwimX, setFreeSwimX] = useState(180);
  const [freeSwimY, setFreeSwimY] = useState(300);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [freeSwimScore, setFreeSwimScore] = useState(0);
  const [freeSwimTime, setFreeSwimTime] = useState(60);

  // Animation
  const [waterFrame, setWaterFrame] = useState(0);
  const [splashEffects, setSplashEffects] = useState<{ x: number; y: number; frame: number; id: number }[]>([]);

  const gameLoop = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceTimerRef = useRef(0);
  const swimmerRef = useRef<SwimmerState[]>([]);
  const staminaRef = useRef(100);
  const comboRef = useRef(0);
  const lastTapTime = useRef(0);
  const divingTimerRef = useRef(0);
  const freeSwimRef = useRef({ x: 180, y: 300, score: 0, time: 60 });
  const collectiblesRef = useRef<Collectible[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());

  // ─── Water animation ───
  useEffect(() => {
    const anim = setInterval(() => setWaterFrame((f) => (f + 1) % 60), 100);
    return () => clearInterval(anim);
  }, []);

  // ─── Splash cleanup ───
  useEffect(() => {
    if (splashEffects.length === 0) return;
    const t = setTimeout(() => {
      setSplashEffects((s) => s.filter((e) => e.frame < 10).map((e) => ({ ...e, frame: e.frame + 1 })));
    }, 100);
    return () => clearTimeout(t);
  }, [splashEffects]);

  // ─── Cleanup ───
  const stopGame = useCallback(() => {
    if (gameLoop.current) {
      clearInterval(gameLoop.current);
      gameLoop.current = null;
    }
  }, []);

  useEffect(() => () => stopGame(), [stopGame]);

  // ─── Race Setup ───
  const startRace = useCallback(() => {
    const laneCount = raceDistance <= 50 ? 4 : 6;
    const playerLane = Math.floor(laneCount / 2);
    const suitBonus = UNLOCKABLE_SUITS[currentSuit].speedBonus;

    const newSwimmers: SwimmerState[] = [];
    for (let i = 0; i < laneCount; i++) {
      if (i === playerLane) {
        newSwimmers.push({
          name: "나",
          lane: i,
          distance: 0,
          speed: 0,
          stamina: 100,
          maxStamina: 100,
          armPhase: "left",
          emoji: "🏊",
          isAI: false,
          aiSkill: 0,
          finished: false,
          finishTime: 0,
          animFrame: 0,
        });
      } else {
        const aiIdx = i > playerLane ? i - 1 : i;
        const skill = 0.5 + Math.random() * 0.5;
        newSwimmers.push({
          name: AI_NAMES[aiIdx % AI_NAMES.length],
          lane: i,
          distance: 0,
          speed: 0,
          stamina: 100,
          maxStamina: 100,
          armPhase: "left",
          emoji: AI_EMOJIS[aiIdx % AI_EMOJIS.length],
          isAI: true,
          aiSkill: skill,
          finished: false,
          finishTime: 0,
          animFrame: 0,
        });
      }
    }

    swimmerRef.current = newSwimmers;
    raceTimerRef.current = 0;
    staminaRef.current = 100;
    comboRef.current = 0;

    setSwimmers(newSwimmers);
    setRaceTime(0);
    setPlayerStamina(100);
    setComboCount(0);
    setLastArm(null);
    setScreen("race");

    stopGame();

    const strokeInfo = STROKE_INFO[stroke];
    gameLoop.current = setInterval(() => {
      raceTimerRef.current += TICK;

      const updated = swimmerRef.current.map((s) => {
        if (s.finished) return s;

        if (s.isAI) {
          // AI logic
          const aiTapRate = s.aiSkill * (0.7 + Math.random() * 0.3);
          let aiSpeed = aiTapRate * 2.5 * strokeInfo.speedMult;

          // AI stamina
          const newStamina = Math.max(0, s.stamina - aiTapRate * strokeInfo.staminaCost * 0.3);
          if (newStamina < 20) aiSpeed *= 0.5;

          const staminaRecovery = aiTapRate < 0.3 ? 0.2 : 0;
          const finalStamina = Math.min(100, newStamina + staminaRecovery);

          const newDist = s.distance + aiSpeed * (TICK / 1000) * 50;
          const finished = newDist >= raceDistance;

          return {
            ...s,
            speed: aiSpeed,
            distance: Math.min(newDist, raceDistance),
            stamina: finalStamina,
            finished,
            finishTime: finished && !s.finished ? raceTimerRef.current : s.finishTime,
            animFrame: (s.animFrame + 1) % 4,
          };
        } else {
          // Player: speed decays naturally
          const decay = 0.95;
          let spd = s.speed * decay;

          // stamina recovery when slow
          let st = staminaRef.current;
          if (spd < 1) {
            st = Math.min(100, st + 0.15);
          }
          staminaRef.current = st;

          const moveMult = st < 10 ? 0.3 : st < 30 ? 0.6 : 1.0;
          const suitMult = 1 + suitBonus;
          const newDist = s.distance + spd * moveMult * suitMult * strokeInfo.speedMult * (TICK / 1000) * 50;
          const finished = newDist >= raceDistance;

          return {
            ...s,
            speed: spd,
            distance: Math.min(newDist, raceDistance),
            stamina: st,
            finished,
            finishTime: finished && !s.finished ? raceTimerRef.current : s.finishTime,
            animFrame: (s.animFrame + 1) % 4,
          };
        }
      });

      swimmerRef.current = updated;
      setSwimmers([...updated]);
      setRaceTime(raceTimerRef.current);
      setPlayerStamina(staminaRef.current);

      // Check if race ended
      if (updated.every((s) => s.finished)) {
        stopGame();
        // Award medals
        const sorted = [...updated].sort((a, b) => a.finishTime - b.finishTime);
        const playerRank = sorted.findIndex((s) => !s.isAI);
        const newMedals = [...medals];
        if (playerRank === 0) newMedals.push({ type: "gold", event: `${strokeInfo.name} ${raceDistance}m`, time: sorted[playerRank].finishTime });
        else if (playerRank === 1) newMedals.push({ type: "silver", event: `${strokeInfo.name} ${raceDistance}m`, time: sorted[playerRank].finishTime });
        else if (playerRank === 2) newMedals.push({ type: "bronze", event: `${strokeInfo.name} ${raceDistance}m`, time: sorted[playerRank].finishTime });
        setMedals(newMedals);

        // Personal best
        const playerTime = sorted.find((s) => !s.isAI)!.finishTime;
        const existing = personalBests.find((pb) => pb.stroke === stroke && pb.distance === raceDistance);
        if (!existing || playerTime < existing.time) {
          setPersonalBests((prev) => {
            const filtered = prev.filter((pb) => !(pb.stroke === stroke && pb.distance === raceDistance));
            return [...filtered, { stroke, distance: raceDistance, time: playerTime }];
          });
        }

        setTimeout(() => setScreen("raceResult"), 500);
      }
    }, TICK);
  }, [stroke, raceDistance, currentSuit, stopGame, medals, personalBests]);

  // ─── Swim tap handler ───
  const handleSwimTap = useCallback(
    (arm: "left" | "right") => {
      if (screen !== "race") return;
      const now = Date.now();
      const strokeInfo = STROKE_INFO[stroke];

      const player = swimmerRef.current.find((s) => !s.isAI);
      if (!player || player.finished) return;

      let speedBoost = 3.0;
      let staminaCost = strokeInfo.staminaCost * 2;

      if (stroke === "butterfly") {
        // Butterfly: both arms at once, any tap works but costs more
        speedBoost = 4.0;
        staminaCost = strokeInfo.staminaCost * 3;
      } else if (stroke === "breaststroke") {
        // Breaststroke: slower but efficient
        speedBoost = 2.5;
        staminaCost = strokeInfo.staminaCost * 1.2;
      } else {
        // Freestyle / backstroke: alternating is key
        if (lastArm === arm) {
          speedBoost = 1.0; // penalty for same arm
          comboRef.current = 0;
        } else {
          comboRef.current = Math.min(comboRef.current + 1, 20);
          speedBoost += comboRef.current * 0.15;
        }
      }

      // Timing bonus
      const tapDelta = now - lastTapTime.current;
      if (tapDelta > 100 && tapDelta < 400) {
        speedBoost *= 1.2; // good rhythm
      }

      // Apply stamina cost
      staminaRef.current = Math.max(0, staminaRef.current - staminaCost);
      if (staminaRef.current < 5) speedBoost *= 0.2;

      // Update swimmer speed
      const updated = swimmerRef.current.map((s) =>
        s.isAI ? s : { ...s, speed: Math.min(s.speed + speedBoost, 12), armPhase: arm }
      );
      swimmerRef.current = updated;

      setLastArm(arm);
      setComboCount(comboRef.current);
      setPlayerStamina(staminaRef.current);
      lastTapTime.current = now;

      // Splash effect
      const playerSwimmer = updated.find((s) => !s.isAI)!;
      setSplashEffects((prev) => [
        ...prev.slice(-5),
        { x: 50 + Math.random() * 20, y: 20 + playerSwimmer.lane * 60, frame: 0, id: now },
      ]);
    },
    [screen, stroke, lastArm]
  );

  // ─── Diving ───
  const startDiving = useCallback(() => {
    setDivingPhase("ready");
    setDiverY(0);
    setDiverRotation(0);
    setCurrentTrick(null);
    setTrickInputs([]);
    setTrickSuccess([]);
    setEntryTiming(null);
    setJudgeScores([]);
    setDivingScore(0);
    setEntryZoneActive(false);
    setScreen("diving");
  }, []);

  const jumpFromBoard = useCallback(() => {
    if (divingPhase !== "ready") return;
    setDivingPhase("falling");
    // Pick random trick
    const trick = DIVING_TRICKS[Math.floor(Math.random() * DIVING_TRICKS.length)];
    setCurrentTrick(trick);
    setTrickInputs([]);
    setTrickSuccess([]);

    divingTimerRef.current = 0;
    stopGame();

    gameLoop.current = setInterval(() => {
      divingTimerRef.current += TICK;
      const fallDuration = divingHeight * 400; // ms total fall
      const progress = Math.min(divingTimerRef.current / fallDuration, 1);

      setDiverY(progress * 100);
      setDiverRotation(progress * 720);

      // Entry zone: last 20% of fall
      if (progress > 0.8 && progress < 1) {
        setEntryZoneActive(true);
      }

      if (progress >= 1) {
        // Didn't press in time
        setDivingPhase("entry");
        setEntryTiming(null);
        stopGame();
        // Calculate score
        setTimeout(() => calculateDivingScore(trick, [], null), 300);
      }
    }, TICK);
  }, [divingPhase, divingHeight, stopGame]);

  const handleDivingInput = useCallback(
    (key: string) => {
      if (divingPhase === "falling" && currentTrick) {
        const idx = trickInputs.length;
        if (idx < currentTrick.keys.length) {
          const correct = key === currentTrick.keys[idx];
          setTrickInputs((prev) => [...prev, key]);
          setTrickSuccess((prev) => [...prev, correct]);

          if (idx + 1 >= currentTrick.keys.length) {
            setDivingPhase("entry");
          }
        }
      }
    },
    [divingPhase, currentTrick, trickInputs]
  );

  const handleWaterEntry = useCallback(() => {
    if (divingPhase !== "entry" && !entryZoneActive) return;
    stopGame();
    const fallDuration = divingHeight * 400;
    const progress = divingTimerRef.current / fallDuration;
    // Perfect entry is at ~0.95
    const entryQuality = 1 - Math.abs(progress - 0.93) * 5;
    setEntryTiming(Math.max(0, Math.min(1, entryQuality)));
    setDivingPhase("scored");

    // Big splash
    setSplashEffects(
      Array.from({ length: 8 }, (_, i) => ({
        x: 40 + Math.random() * 20,
        y: 70 + Math.random() * 10,
        frame: 0,
        id: Date.now() + i,
      }))
    );

    setTimeout(() => calculateDivingScore(currentTrick!, trickSuccess, Math.max(0, Math.min(1, entryQuality))), 500);
  }, [divingPhase, entryZoneActive, divingHeight, currentTrick, trickSuccess, stopGame]);

  const calculateDivingScore = useCallback(
    (trick: DivingTrick, successes: boolean[], entry: number | null) => {
      const trickScore = successes.filter(Boolean).length / Math.max(1, trick.keys.length);
      const entryScore = entry ?? 0;
      const baseScore = (trickScore * 0.6 + entryScore * 0.4) * 10;

      const scores = Array.from({ length: 5 }, () => {
        const variance = (Math.random() - 0.5) * 2;
        return Math.max(0, Math.min(10, Math.round((baseScore + variance) * 10) / 10));
      });

      setJudgeScores(scores);
      const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) * trick.difficulty * 10) / 10;
      setDivingScore(totalScore);

      // Award medal
      if (totalScore > 70) {
        setMedals((prev) => [...prev, { type: "gold", event: `다이빙 ${divingHeight}m`, score: totalScore }]);
      } else if (totalScore > 50) {
        setMedals((prev) => [...prev, { type: "silver", event: `다이빙 ${divingHeight}m`, score: totalScore }]);
      } else if (totalScore > 30) {
        setMedals((prev) => [...prev, { type: "bronze", event: `다이빙 ${divingHeight}m`, score: totalScore }]);
      }

      setTimeout(() => setScreen("divingResult"), 1000);
    },
    [divingHeight]
  );

  // ─── Free Swim ───
  const startFreeSwim = useCallback(() => {
    const items: Collectible[] = Array.from({ length: 20 }, (_, i) => {
      const types: Collectible["type"][] = ["coin", "star", "gem", "ring"];
      const emojis: Record<string, string> = { coin: "🪙", star: "⭐", gem: "💎", ring: "💍" };
      const points: Record<string, number> = { coin: 10, star: 25, gem: 50, ring: 100 };
      const t = types[Math.floor(Math.random() * types.length)];
      return {
        id: i,
        x: 30 + Math.random() * 300,
        y: 30 + Math.random() * 540,
        type: t,
        emoji: emojis[t],
        collected: false,
        points: points[t],
      };
    });

    freeSwimRef.current = { x: 180, y: 300, score: 0, time: 60 };
    collectiblesRef.current = items;

    setFreeSwimX(180);
    setFreeSwimY(300);
    setCollectibles(items);
    setFreeSwimScore(0);
    setFreeSwimTime(60);
    setScreen("freeSwim");

    stopGame();
    gameLoop.current = setInterval(() => {
      freeSwimRef.current.time -= TICK / 1000;
      if (freeSwimRef.current.time <= 0) {
        stopGame();
        setFreeSwimTime(0);
        setScreen("freeSwimResult");
        return;
      }
      setFreeSwimTime(Math.max(0, freeSwimRef.current.time));

      // Check collection
      const px = freeSwimRef.current.x;
      const py = freeSwimRef.current.y;
      let scoreAdded = 0;
      const updatedItems = collectiblesRef.current.map((item) => {
        if (item.collected) return item;
        const dist = Math.sqrt((item.x - px) ** 2 + (item.y - py) ** 2);
        if (dist < 25) {
          scoreAdded += item.points;
          return { ...item, collected: true };
        }
        return item;
      });

      if (scoreAdded > 0) {
        freeSwimRef.current.score += scoreAdded;
        collectiblesRef.current = updatedItems;
        setCollectibles([...updatedItems]);
        setFreeSwimScore(freeSwimRef.current.score);
      }
    }, TICK);
  }, [stopGame]);

  const moveFreeSwim = useCallback(
    (dx: number, dy: number) => {
      if (screen !== "freeSwim") return;
      freeSwimRef.current.x = Math.max(15, Math.min(345, freeSwimRef.current.x + dx * 15));
      freeSwimRef.current.y = Math.max(15, Math.min(585, freeSwimRef.current.y + dy * 15));
      setFreeSwimX(freeSwimRef.current.x);
      setFreeSwimY(freeSwimRef.current.y);
    },
    [screen]
  );

  // ─── Keyboard controls ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (screen === "race") {
        if (e.key === "ArrowLeft" || e.key === "a") handleSwimTap("left");
        if (e.key === "ArrowRight" || e.key === "d") handleSwimTap("right");
      }
      if (screen === "diving") {
        if (e.key === "ArrowUp") handleDivingInput("↑");
        if (e.key === "ArrowDown") handleDivingInput("↓");
        if (e.key === "ArrowLeft") handleDivingInput("←");
        if (e.key === "ArrowRight") handleDivingInput("→");
        if (e.key === " ") {
          e.preventDefault();
          if (divingPhase === "ready") jumpFromBoard();
          else handleWaterEntry();
        }
      }
      if (screen === "freeSwim") {
        if (e.key === "ArrowUp" || e.key === "w") moveFreeSwim(0, -1);
        if (e.key === "ArrowDown" || e.key === "s") moveFreeSwim(0, 1);
        if (e.key === "ArrowLeft" || e.key === "a") moveFreeSwim(-1, 0);
        if (e.key === "ArrowRight" || e.key === "d") moveFreeSwim(1, 0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, handleSwimTap, handleDivingInput, jumpFromBoard, handleWaterEntry, moveFreeSwim, divingPhase]);

  // ─── Helpers ───
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return m > 0 ? `${m}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}` : `${secs}.${String(cs).padStart(2, "0")}`;
  };

  const totalMedals = medals.length;
  const unlockedSuits = UNLOCKABLE_SUITS.filter((s) => totalMedals >= s.requirement);

  // ─── Water ripple CSS ───
  const waterStyle = (idx: number) => ({
    backgroundImage: `repeating-linear-gradient(
      90deg,
      transparent,
      transparent ${8 + Math.sin(waterFrame * 0.1 + idx) * 2}px,
      rgba(255,255,255,0.1) ${8 + Math.sin(waterFrame * 0.1 + idx) * 2}px,
      rgba(255,255,255,0.1) ${10 + Math.sin(waterFrame * 0.1 + idx) * 2}px
    )`,
  });

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  // ─── MENU ───
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4 relative overflow-hidden">
        {/* Water animation background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="absolute w-full h-1 bg-white/10 rounded-full"
              style={{
                top: `${10 + i * 12}%`,
                transform: `translateX(${Math.sin(waterFrame * 0.05 + i * 0.7) * 30}px)`,
                opacity: 0.3 + Math.sin(waterFrame * 0.08 + i) * 0.2,
              }}
            />
          ))}
        </div>

        <Link href="/" className="self-start text-white/80 hover:text-white text-lg mb-4 z-10">
          ← 홈으로
        </Link>

        <div className="text-6xl mb-2 animate-bounce">🏊</div>
        <h1 className="text-4xl font-black text-white mb-2 drop-shadow-lg">수영 게임</h1>
        <p className="text-cyan-100 mb-6 text-center">물살을 가르며 금메달을 향해! 🏅</p>

        {/* Medal display */}
        {medals.length > 0 && (
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 mb-4 flex gap-3 items-center">
            <span>🏅 메달:</span>
            <span className="text-yellow-300">🥇 {medals.filter((m) => m.type === "gold").length}</span>
            <span className="text-gray-300">🥈 {medals.filter((m) => m.type === "silver").length}</span>
            <span className="text-amber-600">🥉 {medals.filter((m) => m.type === "bronze").length}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs z-10">
          <button
            onClick={() => setScreen("modeSelect")}
            className="bg-white/90 hover:bg-white text-blue-700 font-bold text-xl py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
          >
            🎮 게임 시작
          </button>
          <button
            onClick={() => setScreen("records")}
            className="bg-yellow-400/90 hover:bg-yellow-400 text-yellow-900 font-bold text-lg py-3 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
          >
            🏆 기록실
          </button>
        </div>

        {/* Pool decoration */}
        <div className="mt-8 w-full max-w-xs">
          <div className="bg-cyan-400/30 backdrop-blur rounded-2xl p-4 border-2 border-white/20">
            <div className="text-center text-white/80 text-sm mb-2">🏟️ 수영장</div>
            <div className="flex justify-around text-2xl">
              {["🏊", "🏊‍♀️", "🏊‍♂️", "🐬", "🐠"].map((e, i) => (
                <span
                  key={i}
                  style={{
                    transform: `translateY(${Math.sin(waterFrame * 0.1 + i * 1.5) * 5}px)`,
                    display: "inline-block",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Spectators */}
        <div className="mt-4 text-2xl flex gap-1 flex-wrap justify-center">
          {["👨", "👩", "👦", "👧", "🧑", "👴", "👵", "📸", "📣", "🎺"].map((e, i) => (
            <span
              key={i}
              style={{ transform: `translateY(${Math.sin(waterFrame * 0.15 + i * 0.8) * 3}px)`, display: "inline-block" }}
            >
              {e}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ─── MODE SELECT ───
  if (screen === "modeSelect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <button onClick={() => setScreen("menu")} className="self-start text-white/80 hover:text-white text-lg mb-4">
          ← 뒤로
        </button>
        <h2 className="text-3xl font-bold text-white mb-6">🎮 게임 모드</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setScreen("raceSetup")}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-xl py-6 rounded-2xl shadow-lg hover:scale-105 transition-all border-2 border-white/30"
          >
            <div className="text-3xl mb-1">🏊 경주</div>
            <div className="text-sm opacity-80">AI 선수들과 스피드 대결!</div>
          </button>

          <button
            onClick={startDiving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xl py-6 rounded-2xl shadow-lg hover:scale-105 transition-all border-2 border-white/30"
          >
            <div className="text-3xl mb-1">🤸 다이빙</div>
            <div className="text-sm opacity-80">화려한 다이빙 묘기!</div>
          </button>

          <button
            onClick={startFreeSwim}
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-xl py-6 rounded-2xl shadow-lg hover:scale-105 transition-all border-2 border-white/30"
          >
            <div className="text-3xl mb-1">🐠 자유 수영</div>
            <div className="text-sm opacity-80">자유롭게 수영하며 아이템 수집!</div>
          </button>
        </div>

        {/* Current suit */}
        <div className="mt-6 bg-white/20 backdrop-blur rounded-xl p-3 w-full max-w-xs">
          <div className="text-white text-sm mb-2 text-center">🩱 수영복 선택</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {unlockedSuits.map((suit, i) => (
              <button
                key={i}
                onClick={() => setCurrentSuit(i)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  currentSuit === i
                    ? "bg-yellow-400 text-yellow-900 font-bold"
                    : "bg-white/30 text-white hover:bg-white/40"
                }`}
              >
                {suit.emoji} {suit.name}
                {suit.speedBonus > 0 && <span className="ml-1 text-xs">+{Math.round(suit.speedBonus * 100)}%</span>}
              </button>
            ))}
          </div>
          {unlockedSuits.length < UNLOCKABLE_SUITS.length && (
            <div className="text-white/60 text-xs mt-2 text-center">
              🔒 다음 해금: 메달 {UNLOCKABLE_SUITS[unlockedSuits.length].requirement}개
              ({UNLOCKABLE_SUITS[unlockedSuits.length].emoji} {UNLOCKABLE_SUITS[unlockedSuits.length].name})
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RACE SETUP ───
  if (screen === "raceSetup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <button onClick={() => setScreen("modeSelect")} className="self-start text-white/80 hover:text-white text-lg mb-4">
          ← 뒤로
        </button>
        <h2 className="text-3xl font-bold text-white mb-6">🏊 경주 설정</h2>

        {/* Stroke selection */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          <div className="text-white font-bold mb-3 text-center">영법 선택</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(STROKE_INFO) as [Stroke, typeof STROKE_INFO[Stroke]][]).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setStroke(key)}
                className={`p-3 rounded-xl text-sm font-bold transition-all ${
                  stroke === key
                    ? "bg-yellow-400 text-yellow-900 scale-105 shadow-lg"
                    : "bg-white/30 text-white hover:bg-white/40"
                }`}
              >
                <div className="text-2xl mb-1">{info.emoji}</div>
                <div>{info.name}</div>
                <div className="text-xs opacity-70 mt-1">{info.mechanic}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Distance selection */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          <div className="text-white font-bold mb-3 text-center">거리 선택</div>
          <div className="flex gap-3 justify-center">
            {([50, 100, 200] as RaceDistance[]).map((d) => (
              <button
                key={d}
                onClick={() => setRaceDistance(d)}
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  raceDistance === d
                    ? "bg-yellow-400 text-yellow-900 scale-105 shadow-lg"
                    : "bg-white/30 text-white hover:bg-white/40"
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {/* Personal best */}
        {(() => {
          const pb = personalBests.find((p) => p.stroke === stroke && p.distance === raceDistance);
          return pb ? (
            <div className="text-yellow-300 mb-4 text-sm">
              ⏱️ 개인 최고기록: {formatTime(pb.time)}
            </div>
          ) : null;
        })()}

        <button
          onClick={startRace}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl py-4 px-12 rounded-2xl shadow-lg hover:scale-110 transition-all animate-pulse"
        >
          🏁 출발!
        </button>
      </div>
    );
  }

  // ─── RACE ───
  if (screen === "race") {
    const player = swimmers.find((s) => !s.isAI);
    const laneCount = swimmers.length;
    const laneH = Math.min(65, 360 / laneCount);
    const poolWidth = 340;

    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-800 via-blue-700 to-cyan-800 flex flex-col items-center p-2">
        {/* Timer & info */}
        <div className="flex justify-between w-full max-w-sm mb-2 text-white text-sm">
          <span>⏱️ {formatTime(raceTime)}</span>
          <span>{STROKE_INFO[stroke].emoji} {STROKE_INFO[stroke].name} {raceDistance}m</span>
          <span>🔥 콤보: {comboCount}</span>
        </div>

        {/* Stamina bar */}
        <div className="w-full max-w-sm mb-2">
          <div className="flex items-center gap-2 text-white text-xs mb-1">
            <span>⚡ 체력</span>
            <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${playerStamina}%`,
                  background: playerStamina > 50
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : playerStamina > 20
                    ? "linear-gradient(90deg, #eab308, #f59e0b)"
                    : "linear-gradient(90deg, #ef4444, #dc2626)",
                }}
              />
            </div>
            <span>{Math.round(playerStamina)}%</span>
          </div>
        </div>

        {/* Pool */}
        <div
          className="relative rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl"
          style={{ width: poolWidth + 20, height: laneH * laneCount + 20, background: "#0369a1" }}
        >
          {/* Lane lines */}
          {swimmers.map((s, i) => (
            <div key={i}>
              {/* Lane background */}
              <div
                className="absolute"
                style={{
                  left: 10,
                  top: 10 + i * laneH,
                  width: poolWidth,
                  height: laneH - 2,
                  background: s.isAI
                    ? `rgba(14,116,144,${0.3 + (i % 2) * 0.15})`
                    : "rgba(234,179,8,0.2)",
                  ...waterStyle(i),
                }}
              />
              {/* Lane divider */}
              {i > 0 && (
                <div
                  className="absolute"
                  style={{
                    left: 10,
                    top: 10 + i * laneH - 1,
                    width: poolWidth,
                    height: 2,
                    background: "repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 6px, #fff 6px, #fff 12px)",
                    opacity: 0.5,
                  }}
                />
              )}
              {/* Swimmer */}
              <div
                className="absolute flex items-center justify-center text-xl transition-all duration-75"
                style={{
                  left: 10 + (s.distance / raceDistance) * (poolWidth - 30),
                  top: 10 + i * laneH + laneH / 2 - 14,
                  width: 28,
                  height: 28,
                  transform: `scaleX(${s.animFrame % 2 === 0 ? 1 : -1})`,
                }}
              >
                {s.emoji}
              </div>
              {/* Name */}
              <div
                className="absolute text-white/70 text-[10px]"
                style={{ left: 14, top: 10 + i * laneH + 2 }}
              >
                {s.name}
              </div>
              {/* Distance */}
              <div
                className="absolute text-white/60 text-[9px]"
                style={{ right: 14, top: 10 + i * laneH + 2 }}
              >
                {Math.round(s.distance)}m
              </div>
            </div>
          ))}

          {/* Finish line */}
          <div
            className="absolute"
            style={{
              right: 12,
              top: 10,
              width: 3,
              height: laneH * laneCount,
              background: "repeating-linear-gradient(180deg, #000 0px, #000 4px, #fff 4px, #fff 8px)",
            }}
          />

          {/* Splash effects */}
          {splashEffects.map((sp) => (
            <div
              key={sp.id}
              className="absolute text-sm pointer-events-none"
              style={{
                left: `${sp.x}%`,
                top: sp.y,
                opacity: 1 - sp.frame * 0.1,
                transform: `scale(${1 + sp.frame * 0.2})`,
              }}
            >
              💦
            </div>
          ))}
        </div>

        {/* Positions */}
        <div className="w-full max-w-sm mt-2 bg-white/10 rounded-lg p-2">
          <div className="flex flex-wrap gap-1 text-xs text-white justify-center">
            {[...swimmers]
              .sort((a, b) => b.distance - a.distance)
              .map((s, rank) => (
                <span
                  key={s.lane}
                  className={`px-2 py-0.5 rounded ${!s.isAI ? "bg-yellow-500/40 font-bold" : "bg-white/10"}`}
                >
                  {rank + 1}위 {s.emoji}{s.name}
                </span>
              ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-6">
          <button
            onPointerDown={() => handleSwimTap("left")}
            className={`w-28 h-28 rounded-full text-3xl font-black shadow-xl active:scale-90 transition-transform ${
              lastArm === "left"
                ? "bg-yellow-400 text-yellow-900"
                : "bg-blue-500 text-white border-4 border-blue-300"
            }`}
          >
            ← 왼팔
          </button>
          <button
            onPointerDown={() => handleSwimTap("right")}
            className={`w-28 h-28 rounded-full text-3xl font-black shadow-xl active:scale-90 transition-transform ${
              lastArm === "right"
                ? "bg-yellow-400 text-yellow-900"
                : "bg-blue-500 text-white border-4 border-blue-300"
            }`}
          >
            오른팔 →
          </button>
        </div>

        <div className="mt-2 text-white/60 text-xs text-center">
          {STROKE_INFO[stroke].mechanic} (키보드: ←/→ 또는 A/D)
        </div>
      </div>
    );
  }

  // ─── RACE RESULT ───
  if (screen === "raceResult") {
    const sorted = [...swimmers].sort((a, b) => a.finishTime - b.finishTime);
    const playerRank = sorted.findIndex((s) => !s.isAI);
    const medalEmoji = playerRank === 0 ? "🥇" : playerRank === 1 ? "🥈" : playerRank === 2 ? "🥉" : "😢";

    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <h2 className="text-4xl font-black text-white mb-2">🏁 경주 결과</h2>
        <div className="text-6xl mb-2">{medalEmoji}</div>
        <div className="text-white text-xl mb-4 font-bold">
          {playerRank + 1}위! {playerRank === 0 ? "금메달!" : playerRank === 1 ? "은메달!" : playerRank === 2 ? "동메달!" : "다음엔 꼭!"}
        </div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          <div className="text-white font-bold text-center mb-3">📊 순위표</div>
          {sorted.map((s, i) => (
            <div
              key={s.lane}
              className={`flex justify-between items-center py-2 px-3 rounded-lg mb-1 ${
                !s.isAI ? "bg-yellow-500/30 font-bold" : "bg-white/10"
              }`}
            >
              <span className="text-white">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}위`} {s.emoji} {s.name}
              </span>
              <span className="text-cyan-200 font-mono">{formatTime(s.finishTime)}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={startRace}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-3 px-6 rounded-xl"
          >
            🔄 다시 경주
          </button>
          <button
            onClick={() => setScreen("menu")}
            className="bg-white/30 hover:bg-white/40 text-white font-bold py-3 px-6 rounded-xl"
          >
            🏠 메뉴로
          </button>
        </div>
      </div>
    );
  }

  // ─── DIVING SETUP (used via mode select, but let's add height) ───
  if (screen === "divingSetup") {
    return null; // handled in diving directly
  }

  // ─── DIVING ───
  if (screen === "diving") {
    const platformTop = divingHeight === 3 ? 55 : divingHeight === 5 ? 40 : 15;
    const waterTop = 75;

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-400 to-cyan-600 flex flex-col items-center p-2">
        <div className="flex justify-between w-full max-w-sm mb-2 text-white text-sm">
          <button onClick={() => { stopGame(); setScreen("modeSelect"); }} className="text-white/80 hover:text-white">
            ← 뒤로
          </button>
          <span>🤸 다이빙 {divingHeight}m</span>
        </div>

        {/* Height selector (before jump) */}
        {divingPhase === "ready" && (
          <div className="flex gap-2 mb-3">
            {([3, 5, 10] as DivingHeight[]).map((h) => (
              <button
                key={h}
                onClick={() => setDivingHeight(h)}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  divingHeight === h ? "bg-yellow-400 text-yellow-900" : "bg-white/30 text-white"
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        )}

        {/* Diving view */}
        <div
          className="relative rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl"
          style={{ width: 340, height: 500, background: "linear-gradient(180deg, #87CEEB 75%, #0ea5e9 75%, #0284c7 100%)" }}
        >
          {/* Platform */}
          <div
            className="absolute bg-gray-600 rounded-r-lg"
            style={{ left: 0, top: `${platformTop}%`, width: 100, height: 12 }}
          >
            <div className="absolute right-0 top-0 w-4 h-full bg-gray-500 rounded-r-lg" />
          </div>
          {/* Platform support */}
          <div
            className="absolute bg-gray-700"
            style={{ left: 10, top: `${platformTop}%`, width: 8, height: `${waterTop - platformTop}%` }}
          />

          {/* Water surface with ripples */}
          <div
            className="absolute w-full"
            style={{ top: `${waterTop}%`, height: "25%", background: "linear-gradient(180deg, #0ea5e9, #0369a1)" }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="absolute w-full h-0.5 bg-white/20"
                style={{
                  top: `${i * 10}%`,
                  transform: `translateX(${Math.sin(waterFrame * 0.1 + i) * 15}px)`,
                }}
              />
            ))}
          </div>

          {/* Diver */}
          <div
            className="absolute text-4xl transition-all"
            style={{
              left: divingPhase === "ready" ? 65 : 160,
              top: divingPhase === "ready"
                ? `${platformTop - 8}%`
                : `${platformTop + (diverY / 100) * (waterTop - platformTop + 10)}%`,
              transform: `rotate(${divingPhase === "ready" ? 0 : diverRotation}deg)`,
              transition: divingPhase === "ready" ? "none" : "left 0.3s",
            }}
          >
            🤸
          </div>

          {/* Splash on entry */}
          {divingPhase === "scored" && (
            <div className="absolute text-3xl" style={{ left: 145, top: `${waterTop - 3}%` }}>
              💦💦💦
            </div>
          )}

          {/* Entry zone indicator */}
          {entryZoneActive && divingPhase !== "scored" && (
            <div
              className="absolute w-20 h-3 rounded-full animate-pulse"
              style={{
                left: 140,
                top: `${waterTop - 1}%`,
                background: "rgba(34,197,94,0.6)",
                boxShadow: "0 0 10px rgba(34,197,94,0.5)",
              }}
            />
          )}

          {/* Crowd */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-around text-xl">
            {["👨", "👩", "📸", "👏", "🎺", "👧", "👴", "📣"].map((e, i) => (
              <span
                key={i}
                style={{
                  transform: `translateY(${Math.sin(waterFrame * 0.15 + i) * 3}px)`,
                  display: "inline-block",
                }}
              >
                {e}
              </span>
            ))}
          </div>

          {/* Judges */}
          {judgeScores.length > 0 && (
            <div className="absolute top-2 right-2 bg-black/50 rounded-lg p-2">
              <div className="text-white text-xs font-bold mb-1">심판 점수</div>
              <div className="flex gap-1">
                {judgeScores.map((s, i) => (
                  <div key={i} className="bg-white/20 px-1.5 py-0.5 rounded text-white text-xs font-mono">
                    {s.toFixed(1)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trick display */}
        {currentTrick && divingPhase !== "scored" && (
          <div className="mt-3 bg-white/20 backdrop-blur rounded-xl p-3 w-full max-w-sm">
            <div className="text-white font-bold text-center mb-2">
              {currentTrick.emoji} {currentTrick.name} (난이도: {currentTrick.difficulty})
            </div>
            <div className="flex gap-2 justify-center">
              {currentTrick.keys.map((k, i) => {
                const done = i < trickInputs.length;
                const correct = done && trickSuccess[i];
                return (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold border-2 ${
                      done
                        ? correct
                          ? "bg-green-500/50 border-green-300 text-white"
                          : "bg-red-500/50 border-red-300 text-white"
                        : i === trickInputs.length
                        ? "bg-yellow-400/50 border-yellow-300 text-white animate-pulse"
                        : "bg-white/20 border-white/30 text-white/50"
                    }`}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-3 w-full max-w-sm">
          {divingPhase === "ready" && (
            <button
              onClick={jumpFromBoard}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl py-4 rounded-2xl shadow-lg hover:scale-105 transition-all animate-pulse"
            >
              🦘 점프! (스페이스바)
            </button>
          )}

          {(divingPhase === "falling" || divingPhase === "entry") && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div />
                <button
                  onClick={() => handleDivingInput("↑")}
                  className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-2xl active:scale-90"
                >
                  ↑
                </button>
                <div />
                <button
                  onClick={() => handleDivingInput("←")}
                  className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-2xl active:scale-90"
                >
                  ←
                </button>
                <button
                  onClick={handleWaterEntry}
                  className="bg-green-500/80 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm active:scale-90"
                >
                  💦 입수!
                </button>
                <button
                  onClick={() => handleDivingInput("→")}
                  className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-2xl active:scale-90"
                >
                  →
                </button>
                <div />
                <button
                  onClick={() => handleDivingInput("↓")}
                  className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-2xl active:scale-90"
                >
                  ↓
                </button>
                <div />
              </div>
              {entryZoneActive && (
                <div className="text-green-300 text-center text-sm font-bold animate-pulse">
                  지금 입수 버튼을 누르세요! 💦
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── DIVING RESULT ───
  if (screen === "divingResult") {
    const medalEmoji = divingScore > 70 ? "🥇" : divingScore > 50 ? "🥈" : divingScore > 30 ? "🥉" : "😢";

    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <h2 className="text-4xl font-black text-white mb-2">🤸 다이빙 결과</h2>
        <div className="text-6xl mb-2">{medalEmoji}</div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          {currentTrick && (
            <div className="text-white text-center mb-3">
              <div className="text-lg font-bold">{currentTrick.emoji} {currentTrick.name}</div>
              <div className="text-sm opacity-70">난이도: {currentTrick.difficulty}x</div>
            </div>
          )}

          <div className="text-white text-center mb-3">
            <div className="text-sm opacity-70">심판 점수</div>
            <div className="flex gap-2 justify-center mt-1">
              {judgeScores.map((s, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-lg font-mono font-bold ${
                    s >= 8 ? "bg-green-500/50" : s >= 5 ? "bg-yellow-500/50" : "bg-red-500/50"
                  }`}
                >
                  {s.toFixed(1)}
                </div>
              ))}
            </div>
          </div>

          {entryTiming !== null && (
            <div className="text-center mb-3">
              <div className="text-white/70 text-sm">입수 타이밍</div>
              <div className={`text-xl font-bold ${entryTiming > 0.8 ? "text-green-400" : entryTiming > 0.5 ? "text-yellow-400" : "text-red-400"}`}>
                {entryTiming > 0.8 ? "완벽! ✨" : entryTiming > 0.5 ? "좋아요! 👍" : "아쉬워요 😅"}
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-white/70 text-sm">총점</div>
            <div className="text-4xl font-black text-yellow-300">{divingScore.toFixed(1)}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startDiving}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-3 px-6 rounded-xl"
          >
            🔄 다시 다이빙
          </button>
          <button
            onClick={() => setScreen("menu")}
            className="bg-white/30 hover:bg-white/40 text-white font-bold py-3 px-6 rounded-xl"
          >
            🏠 메뉴로
          </button>
        </div>
      </div>
    );
  }

  // ─── FREE SWIM ───
  if (screen === "freeSwim") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-2">
        {/* HUD */}
        <div className="flex justify-between w-full max-w-sm mb-2 text-white text-sm">
          <span>⏰ {Math.ceil(freeSwimTime)}초</span>
          <span>🐠 자유 수영</span>
          <span>💰 {freeSwimScore}점</span>
        </div>

        {/* Pool */}
        <div
          className="relative rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl"
          style={{ width: 360, height: 600, background: "linear-gradient(180deg, #0891b2, #0e7490, #155e75)" }}
        >
          {/* Water ripples */}
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="absolute w-full h-0.5 bg-white/10"
              style={{
                top: `${i * 7}%`,
                transform: `translateX(${Math.sin(waterFrame * 0.08 + i * 0.5) * 20}px)`,
              }}
            />
          ))}

          {/* Lane markers (decorative) */}
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="absolute h-full w-0.5"
              style={{
                left: `${(i + 1) * 16.6}%`,
                background: "repeating-linear-gradient(180deg, transparent 0px, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px)",
              }}
            />
          ))}

          {/* Collectibles */}
          {collectibles
            .filter((c) => !c.collected)
            .map((c) => (
              <div
                key={c.id}
                className="absolute text-xl"
                style={{
                  left: c.x - 10,
                  top: c.y - 10,
                  transform: `translateY(${Math.sin(waterFrame * 0.1 + c.id) * 4}px) rotate(${Math.sin(waterFrame * 0.05 + c.id * 2) * 15}deg)`,
                }}
              >
                {c.emoji}
              </div>
            ))}

          {/* Player */}
          <div
            className="absolute text-3xl transition-all duration-100"
            style={{
              left: freeSwimX - 15,
              top: freeSwimY - 15,
              transform: `rotate(${Math.sin(waterFrame * 0.15) * 5}deg)`,
            }}
          >
            🏊
          </div>

          {/* Pool edge decorations */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-white/20 to-transparent" />
        </div>

        {/* Controls */}
        <div className="mt-3 grid grid-cols-3 gap-2 w-48">
          <div />
          <button
            onPointerDown={() => moveFreeSwim(0, -1)}
            className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-xl active:scale-90"
          >
            ↑
          </button>
          <div />
          <button
            onPointerDown={() => moveFreeSwim(-1, 0)}
            className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-xl active:scale-90"
          >
            ←
          </button>
          <div className="bg-cyan-500/30 rounded-xl flex items-center justify-center text-white/50 text-xs">
            🏊
          </div>
          <button
            onPointerDown={() => moveFreeSwim(1, 0)}
            className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-xl active:scale-90"
          >
            →
          </button>
          <div />
          <button
            onPointerDown={() => moveFreeSwim(0, 1)}
            className="bg-white/30 hover:bg-white/50 text-white font-bold py-3 rounded-xl text-xl active:scale-90"
          >
            ↓
          </button>
          <div />
        </div>
        <div className="text-white/50 text-xs mt-1">방향키 또는 WASD로 이동</div>
      </div>
    );
  }

  // ─── FREE SWIM RESULT ───
  if (screen === "freeSwimResult") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <h2 className="text-4xl font-black text-white mb-2">🐠 자유 수영 결과</h2>
        <div className="text-6xl mb-4">🏊</div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-6 w-full max-w-sm mb-4 text-center">
          <div className="text-white/70 text-sm mb-1">수집 점수</div>
          <div className="text-5xl font-black text-yellow-300 mb-3">{freeSwimScore}</div>
          <div className="text-white/70 text-sm">
            수집한 아이템: {collectibles.filter((c) => c.collected).length} / {collectibles.length}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startFreeSwim}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-3 px-6 rounded-xl"
          >
            🔄 다시 수영
          </button>
          <button
            onClick={() => setScreen("menu")}
            className="bg-white/30 hover:bg-white/40 text-white font-bold py-3 px-6 rounded-xl"
          >
            🏠 메뉴로
          </button>
        </div>
      </div>
    );
  }

  // ─── RECORDS ───
  if (screen === "records") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-700 flex flex-col items-center p-4">
        <button onClick={() => setScreen("menu")} className="self-start text-white/80 hover:text-white text-lg mb-4">
          ← 뒤로
        </button>
        <h2 className="text-3xl font-bold text-white mb-4">🏆 기록실</h2>

        {/* Medals */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          <div className="text-white font-bold mb-3 text-center">🏅 메달 컬렉션</div>
          {medals.length === 0 ? (
            <div className="text-white/50 text-center text-sm">아직 메달이 없습니다. 경주에서 승리하세요!</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {medals.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                  <span className="text-xl">
                    {m.type === "gold" ? "🥇" : m.type === "silver" ? "🥈" : "🥉"}
                  </span>
                  <span className="text-white text-sm flex-1">{m.event}</span>
                  {m.time && <span className="text-cyan-200 text-xs font-mono">{formatTime(m.time)}</span>}
                  {m.score && <span className="text-cyan-200 text-xs font-mono">{m.score.toFixed(1)}점</span>}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center gap-4 mt-3 text-sm text-white">
            <span>🥇 {medals.filter((m) => m.type === "gold").length}</span>
            <span>🥈 {medals.filter((m) => m.type === "silver").length}</span>
            <span>🥉 {medals.filter((m) => m.type === "bronze").length}</span>
          </div>
        </div>

        {/* Personal Bests */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm mb-4">
          <div className="text-white font-bold mb-3 text-center">⏱️ 개인 최고기록</div>
          {personalBests.length === 0 ? (
            <div className="text-white/50 text-center text-sm">아직 기록이 없습니다. 경주를 시작하세요!</div>
          ) : (
            <div className="space-y-2">
              {personalBests.map((pb, i) => (
                <div key={i} className="flex justify-between bg-white/10 rounded-lg p-2">
                  <span className="text-white text-sm">
                    {STROKE_INFO[pb.stroke].emoji} {STROKE_INFO[pb.stroke].name} {pb.distance}m
                  </span>
                  <span className="text-yellow-300 font-mono text-sm">{formatTime(pb.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unlockables */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 w-full max-w-sm">
          <div className="text-white font-bold mb-3 text-center">🩱 수영복 컬렉션</div>
          <div className="space-y-2">
            {UNLOCKABLE_SUITS.map((suit, i) => {
              const unlocked = totalMedals >= suit.requirement;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg p-2 ${
                    unlocked ? "bg-white/20" : "bg-white/5 opacity-50"
                  }`}
                >
                  <span className="text-xl">{unlocked ? suit.emoji : "🔒"}</span>
                  <span className="text-white text-sm flex-1">{suit.name}</span>
                  {suit.speedBonus > 0 && (
                    <span className="text-green-300 text-xs">+{Math.round(suit.speedBonus * 100)}% 속도</span>
                  )}
                  {!unlocked && (
                    <span className="text-white/40 text-xs">메달 {suit.requirement}개</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
