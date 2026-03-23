"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

/* ───── 실뜨기 패턴 정의 ───── */
interface Pin {
  id: number;
  x: number;
  y: number;
  finger: string; // 어떤 손가락인지
  hand: "L" | "R";
}

interface StringSeg {
  from: number; // pin id
  to: number;
  color: string;
}

interface Pattern {
  name: string;
  emoji: string;
  difficulty: number; // 1~5
  desc: string;
  pins: Pin[];
  strings: StringSeg[];
  points: number;
}

const W = 400;
const H = 500;

/* 손가락 위치 (좌/우 손) */
const LEFT_HAND: Pin[] = [
  { id: 0, x: 60, y: 380, finger: "엄지", hand: "L" },
  { id: 1, x: 40, y: 300, finger: "검지", hand: "L" },
  { id: 2, x: 30, y: 230, finger: "중지", hand: "L" },
  { id: 3, x: 40, y: 160, finger: "약지", hand: "L" },
  { id: 4, x: 60, y: 100, finger: "새끼", hand: "L" },
];
const RIGHT_HAND: Pin[] = [
  { id: 5, x: 340, y: 380, finger: "엄지", hand: "R" },
  { id: 6, x: 360, y: 300, finger: "검지", hand: "R" },
  { id: 7, x: 370, y: 230, finger: "중지", hand: "R" },
  { id: 8, x: 360, y: 160, finger: "약지", hand: "R" },
  { id: 9, x: 340, y: 100, finger: "새끼", hand: "R" },
];
const ALL_PINS = [...LEFT_HAND, ...RIGHT_HAND];

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];

const PATTERNS: Pattern[] = [
  {
    name: "고무줄", emoji: "〰️", difficulty: 1, desc: "가장 기본! 양손에 실 걸기", points: 10,
    pins: ALL_PINS,
    strings: [
      { from: 1, to: 6, color: COLORS[0] },
      { from: 4, to: 9, color: COLORS[0] },
    ],
  },
  {
    name: "빗자루", emoji: "🧹", difficulty: 1, desc: "실을 엇갈리게 걸기", points: 15,
    pins: ALL_PINS,
    strings: [
      { from: 1, to: 6, color: COLORS[1] },
      { from: 3, to: 8, color: COLORS[1] },
      { from: 1, to: 8, color: COLORS[2] },
    ],
  },
  {
    name: "다이아몬드", emoji: "💎", difficulty: 2, desc: "가운데 다이아몬드 모양 만들기", points: 25,
    pins: ALL_PINS,
    strings: [
      { from: 1, to: 6, color: COLORS[0] },
      { from: 3, to: 8, color: COLORS[0] },
      { from: 1, to: 8, color: COLORS[3] },
      { from: 3, to: 6, color: COLORS[3] },
    ],
  },
  {
    name: "별", emoji: "⭐", difficulty: 2, desc: "별 모양을 만들어보자", points: 30,
    pins: ALL_PINS,
    strings: [
      { from: 0, to: 9, color: COLORS[4] },
      { from: 4, to: 5, color: COLORS[4] },
      { from: 1, to: 8, color: COLORS[4] },
      { from: 3, to: 6, color: COLORS[4] },
      { from: 2, to: 7, color: COLORS[4] },
    ],
  },
  {
    name: "다리", emoji: "🌉", difficulty: 3, desc: "다리 모양 패턴", points: 40,
    pins: ALL_PINS,
    strings: [
      { from: 1, to: 6, color: COLORS[0] },
      { from: 2, to: 7, color: COLORS[0] },
      { from: 3, to: 8, color: COLORS[0] },
      { from: 1, to: 7, color: COLORS[1] },
      { from: 3, to: 7, color: COLORS[1] },
    ],
  },
  {
    name: "거미줄", emoji: "🕸️", difficulty: 3, desc: "복잡한 거미줄 패턴", points: 50,
    pins: ALL_PINS,
    strings: [
      { from: 0, to: 5, color: COLORS[2] },
      { from: 1, to: 6, color: COLORS[2] },
      { from: 2, to: 7, color: COLORS[2] },
      { from: 3, to: 8, color: COLORS[2] },
      { from: 4, to: 9, color: COLORS[2] },
      { from: 1, to: 8, color: COLORS[5] },
      { from: 3, to: 6, color: COLORS[5] },
    ],
  },
  {
    name: "나비", emoji: "🦋", difficulty: 4, desc: "아름다운 나비 모양", points: 60,
    pins: ALL_PINS,
    strings: [
      { from: 0, to: 9, color: COLORS[4] },
      { from: 4, to: 5, color: COLORS[4] },
      { from: 1, to: 8, color: COLORS[5] },
      { from: 3, to: 6, color: COLORS[5] },
      { from: 2, to: 7, color: COLORS[0] },
      { from: 1, to: 7, color: COLORS[3] },
      { from: 3, to: 7, color: COLORS[3] },
      { from: 2, to: 6, color: COLORS[1] },
      { from: 2, to: 8, color: COLORS[1] },
    ],
  },
  {
    name: "에펠탑", emoji: "🗼", difficulty: 4, desc: "에펠탑처럼 생긴 패턴", points: 70,
    pins: ALL_PINS,
    strings: [
      { from: 0, to: 5, color: COLORS[3] },
      { from: 1, to: 6, color: COLORS[3] },
      { from: 2, to: 7, color: COLORS[3] },
      { from: 3, to: 8, color: COLORS[3] },
      { from: 4, to: 9, color: COLORS[3] },
      { from: 0, to: 6, color: COLORS[0] },
      { from: 4, to: 6, color: COLORS[0] },
      { from: 0, to: 8, color: COLORS[1] },
      { from: 4, to: 8, color: COLORS[1] },
    ],
  },
  {
    name: "왕관", emoji: "👑", difficulty: 5, desc: "최고 난이도! 왕관 패턴", points: 100,
    pins: ALL_PINS,
    strings: [
      { from: 0, to: 5, color: COLORS[3] },
      { from: 1, to: 6, color: COLORS[3] },
      { from: 2, to: 7, color: COLORS[3] },
      { from: 3, to: 8, color: COLORS[3] },
      { from: 4, to: 9, color: COLORS[3] },
      { from: 0, to: 9, color: COLORS[4] },
      { from: 4, to: 5, color: COLORS[4] },
      { from: 1, to: 8, color: COLORS[0] },
      { from: 3, to: 6, color: COLORS[0] },
      { from: 2, to: 6, color: COLORS[5] },
      { from: 2, to: 8, color: COLORS[5] },
    ],
  },
];

type Screen = "menu" | "playing" | "result";

/* ───── 게임 단계 ───── */
interface Step {
  instruction: string;
  fromPin: number;
  toPin: number;
  color: string;
}

export default function CatsCradlePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [currentPattern, setCurrentPattern] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [playerStrings, setPlayerStrings] = useState<StringSeg[]>([]);
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  /* ───── 패턴에서 스텝 생성 ───── */
  const generateSteps = useCallback((patternIdx: number) => {
    const p = PATTERNS[patternIdx];
    const newSteps: Step[] = p.strings.map((s, i) => {
      const fromPin = ALL_PINS.find(pin => pin.id === s.from)!;
      const toPin = ALL_PINS.find(pin => pin.id === s.to)!;
      return {
        instruction: `${fromPin.hand === "L" ? "왼손" : "오른손"} ${fromPin.finger} → ${toPin.hand === "L" ? "왼손" : "오른손"} ${toPin.finger}`,
        fromPin: s.from,
        toPin: s.to,
        color: s.color,
      };
    });
    return newSteps;
  }, []);

  const startPattern = useCallback((idx: number) => {
    setCurrentPattern(idx);
    const newSteps = generateSteps(idx);
    setSteps(newSteps);
    setCurrentStep(0);
    setPlayerStrings([]);
    setSelectedPin(null);
    setMistakes(0);
    setShowHint(false);
    setMessage("");
    setScreen("playing");
  }, [generateSteps]);

  /* ───── 핀 클릭 처리 ───── */
  const handlePinClick = useCallback((pinId: number) => {
    if (currentStep >= steps.length) return;

    const step = steps[currentStep];

    if (selectedPin === null) {
      // 첫 번째 핀 선택
      if (pinId === step.fromPin) {
        setSelectedPin(pinId);
        setMessage("");
      } else {
        setMistakes(m => m + 1);
        setMessage("❌ 다른 손가락부터!");
        setTimeout(() => setMessage(""), 1000);
      }
    } else {
      // 두 번째 핀 선택
      if (pinId === step.toPin) {
        // 정답!
        const newString: StringSeg = { from: selectedPin, to: pinId, color: step.color };
        setPlayerStrings(prev => [...prev, newString]);
        setSelectedPin(null);
        setMessage("✅ 잘했어!");
        setTimeout(() => setMessage(""), 800);

        if (currentStep + 1 >= steps.length) {
          // 패턴 완성!
          const pattern = PATTERNS[currentPattern];
          const bonus = Math.max(0, 3 - mistakes) * 10;
          const earned = pattern.points + bonus;
          setScore(earned);
          setTotalScore(t => t + earned);
          setCompleted(prev => new Set([...prev, currentPattern]));
          setTimeout(() => setScreen("result"), 500);
        } else {
          setCurrentStep(s => s + 1);
        }
      } else if (pinId === selectedPin) {
        // 선택 취소
        setSelectedPin(null);
      } else {
        setMistakes(m => m + 1);
        setMessage("❌ 다른 손가락이야!");
        setTimeout(() => setMessage(""), 1000);
      }
    }
  }, [selectedPin, currentStep, steps, mistakes, currentPattern]);

  /* ───── 캔버스 렌더링 ───── */
  useEffect(() => {
    if (screen !== "playing") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);

      // 배경
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#1e1b4b");
      bgGrad.addColorStop(1, "#312e81");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 손 그리기 (반투명 실루엣)
      // 왼손
      ctx.fillStyle = "#fcd34d22";
      ctx.beginPath();
      ctx.moveTo(80, 420);
      ctx.quadraticCurveTo(20, 350, 20, 280);
      ctx.quadraticCurveTo(10, 200, 20, 120);
      ctx.quadraticCurveTo(30, 70, 80, 60);
      ctx.quadraticCurveTo(100, 70, 100, 120);
      ctx.quadraticCurveTo(100, 200, 90, 280);
      ctx.quadraticCurveTo(100, 350, 80, 420);
      ctx.fill();
      // 오른손
      ctx.fillStyle = "#fcd34d22";
      ctx.beginPath();
      ctx.moveTo(320, 420);
      ctx.quadraticCurveTo(380, 350, 380, 280);
      ctx.quadraticCurveTo(390, 200, 380, 120);
      ctx.quadraticCurveTo(370, 70, 320, 60);
      ctx.quadraticCurveTo(300, 70, 300, 120);
      ctx.quadraticCurveTo(300, 200, 310, 280);
      ctx.quadraticCurveTo(300, 350, 320, 420);
      ctx.fill();

      // 완성된 실 그리기
      for (const s of playerStrings) {
        const fromP = ALL_PINS.find(p => p.id === s.from)!;
        const toP = ALL_PINS.find(p => p.id === s.to)!;

        // 실 그리기 (곡선)
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const midX = (fromP.x + toP.x) / 2;
        const midY = (fromP.y + toP.y) / 2 + Math.sin(tick * 0.03) * 5; // 실이 약간 출렁임
        ctx.moveTo(fromP.x, fromP.y);
        ctx.quadraticCurveTo(midX, midY - 15, toP.x, toP.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 현재 선택 중인 핀에서 마우스까지 점선 (선택 중일때)
      if (selectedPin !== null) {
        const fromP = ALL_PINS.find(p => p.id === selectedPin)!;
        const step = steps[currentStep];
        if (step) {
          ctx.strokeStyle = step.color + "88";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const toP = ALL_PINS.find(p => p.id === step.toPin)!;
          ctx.beginPath();
          ctx.moveTo(fromP.x, fromP.y);
          ctx.lineTo(toP.x, toP.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 힌트: 다음 스텝 미리보기
      if (showHint && currentStep < steps.length) {
        const step = steps[currentStep];
        const fromP = ALL_PINS.find(p => p.id === step.fromPin)!;
        const toP = ALL_PINS.find(p => p.id === step.toPin)!;
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(fromP.x, fromP.y);
        ctx.lineTo(toP.x, toP.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 핀(손가락 위치) 그리기
      for (const pin of ALL_PINS) {
        const isSelected = pin.id === selectedPin;
        const isNextFrom = currentStep < steps.length && pin.id === steps[currentStep].fromPin && selectedPin === null;
        const isNextTo = currentStep < steps.length && pin.id === steps[currentStep].toPin && selectedPin !== null;

        // 핀 원
        const radius = isSelected ? 14 : (isNextFrom || isNextTo) ? 12 : 8;
        const pulseR = (isNextFrom || isNextTo) ? radius + Math.sin(tick * 0.1) * 3 : radius;

        if (isNextFrom || isNextTo) {
          // 반짝이는 효과
          ctx.fillStyle = "#fbbf2444";
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, pulseR + 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isSelected ? "#fbbf24" : (isNextFrom || isNextTo) ? "#fbbf24aa" : "#ffffff44";
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, pulseR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isSelected ? "#fbbf24" : "#ffffff66";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // 손가락 이름
        ctx.fillStyle = "#ffffffaa";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = pin.finger[0]; // 첫 글자만
        ctx.fillText(label, pin.x, pin.y);
      }

      // "왼손" / "오른손" 라벨
      ctx.fillStyle = "#fcd34d88";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("왼손 ✋", 60, 440);
      ctx.fillText("오른손 🤚", 340, 440);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, playerStrings, selectedPin, currentStep, steps, showHint]);

  /* ───── 캔버스 클릭 처리 ───── */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // 가장 가까운 핀 찾기 (30px 이내)
    let closest: Pin | null = null;
    let minDist = 30;
    for (const pin of ALL_PINS) {
      const dx = pin.x - x;
      const dy = pin.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = pin;
      }
    }

    if (closest) {
      handlePinClick(closest.id);
    }
  }, [handlePinClick]);

  /* ───── 메뉴 ───── */
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🧵</div>
            <h1 className="text-3xl font-black mb-1">실뜨기</h1>
            <p className="text-purple-300 text-sm">손가락에 실을 걸어 멋진 모양을 만들자!</p>
            {totalScore > 0 && <p className="text-yellow-400 text-sm mt-1">총 점수: {totalScore}점</p>}
          </div>

          <div className="space-y-2">
            {PATTERNS.map((p, i) => {
              const done = completed.has(i);
              const locked = i > 0 && !completed.has(i - 1) && !done;
              return (
                <button key={i}
                  onClick={() => !locked && startPattern(i)}
                  disabled={locked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    done ? "bg-green-900/40 border border-green-500/30" :
                    locked ? "bg-gray-900/40 opacity-50" :
                    "bg-purple-900/40 hover:bg-purple-800/40 border border-purple-500/20"
                  }`}>
                  <div className="text-3xl w-10 text-center">{locked ? "🔒" : p.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{p.name}</span>
                      <span className="text-xs text-yellow-400">{"⭐".repeat(p.difficulty)}</span>
                      {done && <span className="text-xs text-green-400">✅</span>}
                    </div>
                    <div className="text-xs text-gray-400">{p.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-yellow-400">{p.points}점</div>
                    <div className="text-xs text-gray-500">실 {p.strings.length}개</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result") {
    const pattern = PATTERNS[currentPattern];
    const bonus = Math.max(0, 3 - mistakes) * 10;
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-3">{pattern.emoji}</div>
          <h2 className="text-2xl font-black mb-2">{pattern.name} 완성!</h2>
          <div className="text-3xl mb-3">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</div>
          <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>기본 점수</span><span className="text-yellow-400">{pattern.points}점</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>실수 없는 보너스</span><span className="text-green-400">+{bonus}점</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>실수 횟수</span><span className="text-red-400">{mistakes}번</span>
            </div>
            <hr className="border-white/20" />
            <div className="flex justify-between font-bold">
              <span>총 점수</span><span className="text-yellow-400">{score}점</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => startPattern(currentPattern)}
              className="flex-1 bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
              다른 패턴
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  const pattern = PATTERNS[currentPattern];
  const step = currentStep < steps.length ? steps[currentStep] : null;
  const progress = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950 text-white flex flex-col items-center p-2">
      {/* HUD */}
      <div className="w-full max-w-[400px] mb-1">
        <div className="flex justify-between items-center mb-1 px-1">
          <button onClick={() => setScreen("menu")} className="text-purple-300 text-xs">← 뒤로</button>
          <span className="font-bold">{pattern.emoji} {pattern.name}</span>
          <span className="text-xs text-gray-400">실수: {mistakes}</span>
        </div>
        {/* 진행바 */}
        <div className="bg-gray-800 rounded-full h-2 mb-1">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 지시 사항 */}
      <div className="w-full max-w-[400px] bg-black/30 rounded-lg p-2 mb-1 text-center text-sm">
        {step ? (
          <div>
            <span className="text-yellow-400 font-bold">단계 {currentStep + 1}/{steps.length}: </span>
            <span>{step.instruction}</span>
            {selectedPin !== null && <span className="text-green-400 ml-1">→ 도착점 터치!</span>}
          </div>
        ) : (
          <span className="text-green-400 font-bold">완성!</span>
        )}
      </div>

      {/* 메시지 */}
      {message && (
        <div className="absolute top-32 z-10 bg-black/80 text-white font-bold px-4 py-2 rounded-xl text-lg">
          {message}
        </div>
      )}

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl shadow-lg max-w-full touch-none"
        style={{ maxHeight: "calc(100vh - 140px)" }}
        onClick={handleCanvasClick}
        onTouchEnd={handleCanvasClick}
      />

      {/* 힌트 버튼 */}
      <button
        onClick={() => setShowHint(h => !h)}
        className={`mt-2 px-4 py-1 rounded-lg text-sm ${showHint ? "bg-yellow-600" : "bg-gray-700 hover:bg-gray-600"}`}>
        {showHint ? "💡 힌트 끄기" : "💡 힌트 보기"}
      </button>
    </div>
  );
}
