"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 치아 상태 ───── */
interface Tooth {
  id: number;
  row: "top" | "bottom";
  pos: number; // 0~7 (왼쪽→오른쪽)
  hp: number;           // 0~100 (100=건강)
  problem: Problem | null;
  treated: boolean;
}

type Problem = "cavity" | "crack" | "plaque" | "germ" | "bleeding" | "gold" | "rainbow";

const PROBLEMS: Record<Problem, { name: string; emoji: string; difficulty: number; score: number; color: string }> = {
  cavity:   { name: "충치", emoji: "🦠", difficulty: 1, score: 10, color: "#4a2800" },
  plaque:   { name: "치석", emoji: "🟡", difficulty: 1, score: 8, color: "#c9b458" },
  crack:    { name: "금간 이", emoji: "⚡", difficulty: 2, score: 15, color: "#888" },
  germ:     { name: "세균", emoji: "🧫", difficulty: 2, score: 12, color: "#5a9e3f" },
  bleeding: { name: "잇몸 출혈", emoji: "🩸", difficulty: 3, score: 20, color: "#d32f2f" },
  gold:     { name: "금니 교체", emoji: "✨", difficulty: 3, score: 25, color: "#ffd700" },
  rainbow:  { name: "무지개 충치", emoji: "🌈", difficulty: 4, score: 40, color: "#ff69b4" },
};

/* ───── 치료 도구 ───── */
interface Tool {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  treats: Problem[];
  power: number;      // 치료 횟수 (몇 번 클릭해야 치료 완료)
  cooldown: number;
  unlockLevel: number;
  sound: string;
}

const TOOLS: Tool[] = [
  { id: "mirror", name: "치과 거울", emoji: "🪞", desc: "문제를 정확히 진단!", treats: [], power: 0, cooldown: 500, unlockLevel: 1, sound: "딸깍" },
  { id: "drill", name: "드릴", emoji: "🔧", desc: "충치를 깎아내기", treats: ["cavity"], power: 3, cooldown: 300, unlockLevel: 1, sound: "위이잉~" },
  { id: "scaler", name: "스케일러", emoji: "🪥", desc: "치석 제거", treats: ["plaque"], power: 2, cooldown: 400, unlockLevel: 1, sound: "치치치~" },
  { id: "fill", name: "충전재", emoji: "🧴", desc: "금간 이 수리", treats: ["crack"], power: 2, cooldown: 600, unlockLevel: 2, sound: "쓱쓱" },
  { id: "spray", name: "살균 스프레이", emoji: "💨", desc: "세균 퇴치", treats: ["germ"], power: 3, cooldown: 500, unlockLevel: 2, sound: "슈슈슈!" },
  { id: "medicine", name: "잇몸 치료제", emoji: "💊", desc: "잇몸 출혈 치료", treats: ["bleeding"], power: 4, cooldown: 700, unlockLevel: 3, sound: "발라발라~" },
  { id: "goldtool", name: "금니 도구", emoji: "👑", desc: "금니 교체 시술", treats: ["gold"], power: 4, cooldown: 800, unlockLevel: 4, sound: "반짝반짝!" },
  { id: "laser", name: "레이저", emoji: "🔴", desc: "무지개 충치 제거", treats: ["rainbow"], power: 5, cooldown: 1000, unlockLevel: 5, sound: "비비빅!" },
  { id: "water", name: "물총", emoji: "💧", desc: "시원하게 헹구기 (모든 치료 보조)", treats: ["cavity", "plaque", "germ"], power: 1, cooldown: 200, unlockLevel: 1, sound: "쏴아~" },
];

/* ───── 업그레이드 ───── */
interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "powerUp" | "coolDown" | "bonusScore" | "timeAdd";
  value: number;
}

const UPGRADES: Upgrade[] = [
  { id: "gloves", name: "고급 장갑", emoji: "🧤", desc: "치료 파워 증가", price: 60, effect: "+1 치료력", effectType: "powerUp", value: 1 },
  { id: "chair", name: "편한 의자", emoji: "💺", desc: "쿨타임 감소", price: 80, effect: "-20% 쿨타임", effectType: "coolDown", value: 0.2 },
  { id: "diploma", name: "전문의 자격증", emoji: "📜", desc: "보너스 점수 증가", price: 100, effect: "+30% 점수", effectType: "bonusScore", value: 0.3 },
  { id: "light", name: "고급 조명", emoji: "💡", desc: "치료 파워 대폭 증가", price: 150, effect: "+2 치료력", effectType: "powerUp", value: 2 },
  { id: "assistant", name: "치과 보조", emoji: "👩‍⚕️", desc: "쿨타임 대폭 감소", price: 200, effect: "-35% 쿨타임", effectType: "coolDown", value: 0.35 },
  { id: "medal", name: "명의 훈장", emoji: "🏅", desc: "보너스 점수 대폭 증가", price: 250, effect: "+60% 점수", effectType: "bonusScore", value: 0.6 },
  { id: "coffee", name: "에스프레소", emoji: "☕", desc: "시간 추가", price: 120, effect: "+15초", effectType: "timeAdd", value: 15 },
  { id: "energydrink", name: "에너지 드링크", emoji: "⚡", desc: "시간 대폭 추가", price: 300, effect: "+30초", effectType: "timeAdd", value: 30 },
];

/* ───── 환자 ───── */
interface Patient {
  name: string;
  emoji: string;
  teeth: Tooth[];
  problemCount: number;
  difficulty: number;
}

const PATIENT_NAMES = [
  { name: "꼬마 민수", emoji: "👦" },
  { name: "할머니", emoji: "👵" },
  { name: "아저씨", emoji: "👨" },
  { name: "언니", emoji: "👧" },
  { name: "강아지(?)", emoji: "🐶" },
  { name: "고양이(?!)", emoji: "🐱" },
  { name: "외계인", emoji: "👽" },
  { name: "로봇", emoji: "🤖" },
  { name: "공룡", emoji: "🦖" },
  { name: "상어", emoji: "🦈" },
];

function generateTeeth(): Tooth[] {
  const teeth: Tooth[] = [];
  for (let row of ["top", "bottom"] as const) {
    for (let pos = 0; pos < 8; pos++) {
      teeth.push({ id: teeth.length, row, pos, hp: 100, problem: null, treated: false });
    }
  }
  return teeth;
}

function assignProblems(teeth: Tooth[], count: number, difficulty: number): Tooth[] {
  const problems: Problem[] = ["cavity", "plaque"];
  if (difficulty >= 2) problems.push("crack", "germ");
  if (difficulty >= 3) problems.push("bleeding");
  if (difficulty >= 4) problems.push("gold");
  if (difficulty >= 5) problems.push("rainbow");

  const indices = [...Array(16).keys()].sort(() => Math.random() - 0.5).slice(0, count);
  return teeth.map((t, i) => {
    if (indices.includes(i)) {
      const prob = problems[Math.floor(Math.random() * problems.length)];
      return { ...t, problem: prob, hp: 30 + Math.floor(Math.random() * 40) };
    }
    return t;
  });
}

type Screen = "main" | "play" | "shop" | "result";

export default function DentistPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(50);
  const [highScore, setHighScore] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState<string[]>([]);

  // 플레이 상태
  const [score, setScore] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [teeth, setTeeth] = useState<Tooth[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>(TOOLS[1]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [treatProgress, setTreatProgress] = useState<Record<number, number>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [patientsSaved, setPatientsSaved] = useState(0);
  const [patientReaction, setPatientReaction] = useState("");
  const [reactionTimer, setReactionTimer] = useState<NodeJS.Timeout | null>(null);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [soundText, setSoundText] = useState("");
  const [satisfaction, setSatisfaction] = useState(100); // 환자 만족도

  // 업그레이드 보너스
  const powerUp = ownedUpgrades.reduce((sum, id) => {
    const u = UPGRADES.find(i => i.id === id);
    return sum + (u?.effectType === "powerUp" ? u.value : 0);
  }, 0);
  const coolDown = ownedUpgrades.reduce((sum, id) => {
    const u = UPGRADES.find(i => i.id === id);
    return sum + (u?.effectType === "coolDown" ? u.value : 0);
  }, 0);
  const bonusScore = ownedUpgrades.reduce((sum, id) => {
    const u = UPGRADES.find(i => i.id === id);
    return sum + (u?.effectType === "bonusScore" ? u.value : 0);
  }, 0);
  const timeAdd = ownedUpgrades.reduce((sum, id) => {
    const u = UPGRADES.find(i => i.id === id);
    return sum + (u?.effectType === "timeAdd" ? u.value : 0);
  }, 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.4));
    }
  }, [xp, xpNeeded]);

  // 타이머
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (gameActive && timeLeft <= 0) {
      endGame();
    }
  }, [gameActive, timeLeft]);

  // 쿨다운
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = Math.max(0, next[key] - 100);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 만족도 서서히 감소
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setSatisfaction(s => Math.max(0, s - 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameActive]);

  const generatePatient = useCallback((diff: number) => {
    const info = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
    const problemCount = Math.min(3 + diff, 10);
    const baseTeeth = generateTeeth();
    const problemTeeth = assignProblems(baseTeeth, problemCount, diff);
    return {
      name: info.name,
      emoji: info.emoji,
      teeth: problemTeeth,
      problemCount,
      difficulty: diff,
    };
  }, []);

  const startGame = useCallback(() => {
    const diff = Math.min(playerLevel, 5);
    const p = generatePatient(diff);
    setPatient(p);
    setTeeth(p.teeth);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPatientsSaved(0);
    setTimeLeft(60 + timeAdd);
    setCooldowns({});
    setTreatProgress({});
    setSelectedTooth(null);
    setSelectedTool(TOOLS[1]);
    setFloatTexts([]);
    setPatientReaction("");
    setSoundText("");
    setSatisfaction(100);
    setGameActive(true);
    setScreen("play");
  }, [playerLevel, timeAdd, generatePatient]);

  const nextPatient = useCallback(() => {
    const diff = Math.min(playerLevel + Math.floor(patientsSaved / 2), 5);
    const p = generatePatient(diff);
    setPatient(p);
    setTeeth(p.teeth);
    setTreatProgress({});
    setSelectedTooth(null);
    setSatisfaction(100);
    setPatientsSaved(s => s + 1);
    setPatientReaction("다음 환자 들어오세요~");
    if (reactionTimer) clearTimeout(reactionTimer);
    const t = setTimeout(() => setPatientReaction(""), 1500);
    setReactionTimer(t);
  }, [playerLevel, patientsSaved, generatePatient, reactionTimer]);

  const endGame = useCallback(() => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    const earned = Math.floor(score / 5) + patientsSaved * 10;
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3));
    setTotalPatients(t => t + patientsSaved);
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, patientsSaved, highScore]);

  // 현재 환자 완료 체크
  useEffect(() => {
    if (!gameActive || !teeth.length) return;
    const problemTeeth = teeth.filter(t => t.problem !== null);
    const allTreated = problemTeeth.every(t => t.treated);
    if (allTreated && problemTeeth.length > 0) {
      // 보너스 점수
      const bonus = Math.floor(satisfaction * 2);
      setScore(s => s + bonus);
      setPatientReaction(`감사합니다!! (+${bonus} 보너스)`);
      if (reactionTimer) clearTimeout(reactionTimer);
      const t = setTimeout(() => {
        setPatientReaction("");
        nextPatient();
      }, 1500);
      setReactionTimer(t);
    }
  }, [teeth, gameActive]);

  const treatTooth = useCallback((toothId: number, e?: React.MouseEvent) => {
    if (!gameActive) return;
    const tooth = teeth.find(t => t.id === toothId);
    if (!tooth || !tooth.problem || tooth.treated) return;

    // 거울은 진단용
    if (selectedTool.id === "mirror") {
      setSelectedTooth(toothId);
      const prob = PROBLEMS[tooth.problem];
      setPatientReaction(`진단: ${prob.emoji} ${prob.name} 발견!`);
      if (reactionTimer) clearTimeout(reactionTimer);
      const t = setTimeout(() => setPatientReaction(""), 2000);
      setReactionTimer(t);
      return;
    }

    // 도구가 맞는지 체크
    if (!selectedTool.treats.includes(tooth.problem)) {
      setPatientReaction("아야! 그 도구가 아닌데...");
      setSatisfaction(s => Math.max(0, s - 5));
      setCombo(0);
      if (reactionTimer) clearTimeout(reactionTimer);
      const t = setTimeout(() => setPatientReaction(""), 1200);
      setReactionTimer(t);
      return;
    }

    // 쿨다운 체크
    if ((cooldowns[selectedTool.id] || 0) > 0) return;

    // 치료 진행
    const progress = (treatProgress[toothId] || 0) + 1 + powerUp;
    const needed = PROBLEMS[tooth.problem].difficulty * 2 + 1;

    // 사운드
    setSoundText(selectedTool.sound);
    setTimeout(() => setSoundText(""), 500);

    // 쿨타임
    const cd = Math.floor(selectedTool.cooldown * (1 - coolDown));
    setCooldowns(prev => ({ ...prev, [selectedTool.id]: cd }));

    if (progress >= needed) {
      // 치료 완료!
      const prob = PROBLEMS[tooth.problem];
      const scoreGain = Math.floor(prob.score * (1 + bonusScore) * (1 + combo * 0.1));

      setTeeth(prev => prev.map(t => t.id === toothId ? { ...t, treated: true, hp: 100 } : t));
      setTreatProgress(prev => { const n = { ...prev }; delete n[toothId]; return n; });
      setScore(s => s + scoreGain);
      setCombo(c => {
        const next = c + 1;
        setMaxCombo(m => Math.max(m, next));
        return next;
      });

      setPatientReaction("아~ 시원하다!");
      if (reactionTimer) clearTimeout(reactionTimer);
      const t = setTimeout(() => setPatientReaction(""), 1200);
      setReactionTimer(t);

      // 플로팅
      const id = floatId.current++;
      const x = e ? e.clientX : 150 + Math.random() * 100;
      const y = e ? e.clientY : 300 + Math.random() * 50;
      setFloatTexts(prev => [...prev, {
        id, text: `+${scoreGain} ${prob.emoji}✨`, x, y,
        color: combo >= 5 ? "#ffd700" : combo >= 3 ? "#4ade80" : "#60a5fa",
      }]);
      setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);
    } else {
      // 치료 중
      setTreatProgress(prev => ({ ...prev, [toothId]: progress }));
      setPatientReaction(["으으...", "아아...", "조금만...", "거의 다..."][Math.floor(Math.random() * 4)]);
      if (reactionTimer) clearTimeout(reactionTimer);
      const t = setTimeout(() => setPatientReaction(""), 800);
      setReactionTimer(t);

      const id = floatId.current++;
      const x = e ? e.clientX : 150 + Math.random() * 100;
      const y = e ? e.clientY : 300 + Math.random() * 50;
      setFloatTexts(prev => [...prev, { id, text: selectedTool.sound, x, y, color: "#fff" }]);
      setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 600);
    }
  }, [gameActive, teeth, selectedTool, cooldowns, treatProgress, powerUp, coolDown, bonusScore, combo, reactionTimer]);

  const buyUpgrade = useCallback((id: string) => {
    const u = UPGRADES.find(i => i.id === id);
    if (!u || coins < u.price || ownedUpgrades.includes(id)) return;
    setCoins(c => c - u.price);
    setOwnedUpgrades(prev => [...prev, id]);
  }, [coins, ownedUpgrades]);

  const getToothDisplay = (tooth: Tooth) => {
    if (tooth.treated) return "🦷";
    if (!tooth.problem) return "🦷";
    const p = PROBLEMS[tooth.problem];
    return p.emoji;
  };

  /* ───── 메인 화면 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-900 via-teal-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-cyan-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🦷</div>
            <h1 className="text-3xl font-black mb-1">치과의사</h1>
            <p className="text-cyan-300 text-sm">환자의 이를 치료해주세요!</p>
          </div>

          <div className="bg-cyan-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-cyan-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-cyan-900 rounded-full h-2 overflow-hidden">
              <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-cyan-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
            {totalPatients > 0 && <div className="text-xs text-cyan-300 text-center">👥 총 치료 환자: {totalPatients}명</div>}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 text-center">
            <div className="text-4xl mb-2">👨‍⚕️🦷💉</div>
            <p className="text-sm text-gray-300">환자들이 줄을 서서 기다리고 있어요!</p>
            <p className="text-sm text-gray-300">충치, 치석, 금간 이... 모두 치료해주세요!</p>
            <p className="text-xs text-yellow-300 mt-1">올바른 도구로 정확히 치료하면 고득점!</p>
          </div>

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-cyan-600 hover:bg-cyan-500 rounded-xl p-4 text-center text-lg font-black">
              🦷 진료 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 장비 업그레이드</span>
              <span className="text-xs text-yellow-300 ml-2">치과 장비 구매</span>
            </button>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🔧 사용 가능한 도구 ({TOOLS.filter(t => playerLevel >= t.unlockLevel).length}/{TOOLS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {TOOLS.map(t => (
                <div key={t.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= t.unlockLevel ? "bg-cyan-800/50" : "bg-gray-800/50 opacity-40"
                }`} title={t.name}>
                  {playerLevel >= t.unlockLevel ? t.emoji : "🔒"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 화면 ───── */
  if (screen === "play" && patient) {
    const unlockedTools = TOOLS.filter(t => playerLevel >= t.unlockLevel);

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 text-gray-900 p-4 relative overflow-hidden select-none">
        <div className="max-w-md mx-auto">

          {/* 상단 */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold">⏱️ {timeLeft}초</div>
            <div className="text-sm font-bold">🎯 {score}점</div>
            <div className="text-sm">👥 {patientsSaved}명 완료</div>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-lg font-black px-3 py-0.5 rounded-full text-white"
                style={{ background: combo >= 10 ? "#0891b2" : combo >= 7 ? "#06b6d4" : "#22d3ee" }}>
                ✨ {combo} COMBO!
              </span>
            </div>
          )}

          {/* 환자 만족도 */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5">
              <span>😊 환자 만족도</span>
              <span className={satisfaction < 30 ? "text-red-600 font-bold" : ""}>{Math.floor(satisfaction)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${satisfaction}%`,
                background: satisfaction >= 70 ? "#22c55e" : satisfaction >= 40 ? "#f59e0b" : "#dc2626",
              }} />
            </div>
          </div>

          {/* 환자 */}
          <div className="text-center mb-3 relative">
            <div className="text-4xl mb-1">{patient.emoji}</div>
            <div className="text-sm font-bold">{patient.name}</div>
            {patientReaction && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl px-3 py-1 text-sm font-bold shadow-lg whitespace-nowrap z-10"
                style={{ animation: "popIn 0.3s ease-out" }}>
                {patientReaction}
              </div>
            )}
            {soundText && (
              <div className="text-xs text-cyan-600 font-bold animate-pulse">{soundText}</div>
            )}
          </div>

          {/* 입 (치아 배열) */}
          <div className="bg-pink-200 rounded-3xl p-4 mb-3 border-4 border-pink-300 relative">
            <div className="bg-red-400 rounded-2xl p-3">
              {/* 윗니 */}
              <div className="flex justify-center gap-1 mb-2">
                {teeth.filter(t => t.row === "top").map(tooth => {
                  const prob = tooth.problem ? PROBLEMS[tooth.problem] : null;
                  const progress = treatProgress[tooth.id] || 0;
                  const needed = prob ? prob.difficulty * 2 + 1 : 1;
                  const isSelected = selectedTooth === tooth.id;

                  return (
                    <button key={tooth.id}
                      onClick={(e) => treatTooth(tooth.id, e)}
                      className={`w-8 h-10 rounded-b-lg flex flex-col items-center justify-center text-sm transition-all relative ${
                        tooth.treated
                          ? "bg-white border-2 border-green-400"
                          : tooth.problem
                            ? `border-2 ${isSelected ? "border-yellow-400 ring-2 ring-yellow-300" : "border-red-600"} bg-gray-100`
                            : "bg-white border border-gray-300"
                      }`}
                      style={tooth.problem && !tooth.treated ? { backgroundColor: prob?.color + "22" } : {}}>
                      <span className="text-xs">{getToothDisplay(tooth)}</span>
                      {tooth.problem && !tooth.treated && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-400 rounded-full overflow-hidden">
                          <div className="h-1 bg-green-500 transition-all" style={{ width: `${(progress / needed) * 100}%` }} />
                        </div>
                      )}
                      {tooth.treated && <span className="absolute -top-1 -right-1 text-[8px]">✅</span>}
                    </button>
                  );
                })}
              </div>

              {/* 혀 */}
              <div className="text-center text-2xl my-1">👅</div>

              {/* 아랫니 */}
              <div className="flex justify-center gap-1 mt-2">
                {teeth.filter(t => t.row === "bottom").map(tooth => {
                  const prob = tooth.problem ? PROBLEMS[tooth.problem] : null;
                  const progress = treatProgress[tooth.id] || 0;
                  const needed = prob ? prob.difficulty * 2 + 1 : 1;
                  const isSelected = selectedTooth === tooth.id;

                  return (
                    <button key={tooth.id}
                      onClick={(e) => treatTooth(tooth.id, e)}
                      className={`w-8 h-10 rounded-t-lg flex flex-col items-center justify-center text-sm transition-all relative ${
                        tooth.treated
                          ? "bg-white border-2 border-green-400"
                          : tooth.problem
                            ? `border-2 ${isSelected ? "border-yellow-400 ring-2 ring-yellow-300" : "border-red-600"} bg-gray-100`
                            : "bg-white border border-gray-300"
                      }`}
                      style={tooth.problem && !tooth.treated ? { backgroundColor: prob?.color + "22" } : {}}>
                      <span className="text-xs">{getToothDisplay(tooth)}</span>
                      {tooth.problem && !tooth.treated && (
                        <div className="absolute -top-1 left-0 right-0 h-1 bg-gray-400 rounded-full overflow-hidden">
                          <div className="h-1 bg-green-500 transition-all" style={{ width: `${(progress / needed) * 100}%` }} />
                        </div>
                      )}
                      {tooth.treated && <span className="absolute -top-1 -right-1 text-[8px]">✅</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 남은 문제 카운트 */}
            <div className="text-center mt-2 text-xs font-bold text-pink-700">
              남은 치료: {teeth.filter(t => t.problem && !t.treated).length}개
            </div>
          </div>

          {/* 문제 범례 */}
          <div className="flex flex-wrap gap-2 justify-center mb-3 text-[10px]">
            {teeth.filter(t => t.problem && !t.treated).reduce((acc, t) => {
              if (!acc.find(a => a === t.problem)) acc.push(t.problem!);
              return acc;
            }, [] as Problem[]).map(p => (
              <span key={p} className="bg-white px-2 py-0.5 rounded-full border">
                {PROBLEMS[p].emoji} {PROBLEMS[p].name}
              </span>
            ))}
          </div>

          {/* 도구 선택 */}
          <div className="bg-white rounded-xl p-2 shadow-md">
            <div className="text-xs font-bold text-center mb-1 text-gray-600">🔧 도구 선택</div>
            <div className="grid grid-cols-5 gap-1">
              {unlockedTools.map(tool => {
                const onCooldown = (cooldowns[tool.id] || 0) > 0;
                const isActive = selectedTool.id === tool.id;

                return (
                  <button key={tool.id}
                    onClick={() => setSelectedTool(tool)}
                    disabled={onCooldown}
                    className={`relative p-1.5 rounded-lg text-center transition-all ${
                      isActive
                        ? "bg-cyan-100 border-2 border-cyan-500 shadow-md"
                        : onCooldown
                          ? "bg-gray-200 opacity-50"
                          : "bg-gray-50 hover:bg-cyan-50 border border-gray-200"
                    }`}>
                    {onCooldown && (
                      <div className="absolute inset-0 bg-gray-500/20 rounded-lg" />
                    )}
                    <div className="text-xl">{tool.emoji}</div>
                    <div className="text-[8px] font-bold leading-tight">{tool.name}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1">
              {selectedTool.emoji} {selectedTool.name}: {selectedTool.desc}
              {selectedTool.treats.length > 0 && (
                <span className="ml-1">({selectedTool.treats.map(t => PROBLEMS[t].name).join(", ")})</span>
              )}
            </div>
          </div>
        </div>

        {/* 플로팅 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{
              left: f.x, top: f.y, color: f.color,
              textShadow: "0 0 4px rgba(0,0,0,0.5)",
              animation: "floatUp 1s ease-out forwards",
            }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
          @keyframes popIn {
            0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
            100% { opacity: 1; transform: translateX(-50%) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 결과 화면 ───── */
  if (screen === "result") {
    const earned = Math.floor(score / 5) + patientsSaved * 10;
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-700 via-teal-900 to-slate-950 text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{patientsSaved >= 3 ? "🏆" : patientsSaved >= 1 ? "😊" : "😅"}</div>
          <h2 className="text-3xl font-black mb-2 text-cyan-300">진료 종료!</h2>
          <p className="text-teal-200 mb-4">
            {patientsSaved >= 3 ? "대단한 명의!" : patientsSaved >= 1 ? "좋은 치과의사!" : "다음엔 더 잘할 수 있어요!"}
          </p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl">🎯</div>
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-xs text-gray-400">점수</div>
              </div>
              <div>
                <div className="text-2xl">👥</div>
                <div className="text-2xl font-bold">{patientsSaved}</div>
                <div className="text-xs text-gray-400">치료 환자</div>
              </div>
              <div>
                <div className="text-2xl">✨</div>
                <div className="text-2xl font-bold">{maxCombo}</div>
                <div className="text-xs text-gray-400">최대 콤보</div>
              </div>
              <div>
                <div className="text-2xl">🪙</div>
                <div className="text-2xl font-bold text-yellow-400">+{earned}</div>
                <div className="text-xs text-gray-400">획득 코인</div>
              </div>
            </div>
          </div>

          {score > highScore && score > 0 && (
            <div className="text-yellow-300 font-bold mb-3 text-lg">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-teal-700 hover:bg-teal-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={startGame}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl p-3 font-bold">
              🦷 다시 진료!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-900 via-cyan-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-cyan-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 장비 업그레이드</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {UPGRADES.map(item => {
              const owned = ownedUpgrades.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"
                }`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                    <div className="text-xs text-yellow-300">{item.effect}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅ 보유</span>
                  ) : (
                    <button onClick={() => buyUpgrade(item.id)}
                      disabled={coins < item.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${
                        coins >= item.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"
                      }`}>
                      🪙 {item.price}
                    </button>
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
