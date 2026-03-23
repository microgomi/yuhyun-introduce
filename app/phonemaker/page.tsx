"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────
type ModelType = "smartphone" | "foldable" | "gaming" | "mini" | "tablet";
type CameraType = "single" | "dual" | "triple" | "quad" | "penta";
type CPUType = "budget" | "mid" | "high" | "flagship" | "ultimate";
type MaterialType = "glass" | "metal" | "leather" | "ceramic" | "wood" | "carbon";
type CaseType = "none" | "clear" | "bumper" | "leather" | "glitter";
type NotchType = "notch" | "punch" | "under" | "drop";
type ButtonStyle = "normal" | "flat" | "gesture";
type Grade = "S" | "A" | "B" | "C" | "D";

interface PhoneSpec {
  screenSize: number;
  camera: CameraType;
  ram: number;
  storage: number;
  battery: number;
  cpu: CPUType;
}

interface PhoneDesign {
  backColor: string;
  material: MaterialType;
  caseType: CaseType;
  notch: NotchType;
  buttonStyle: ButtonStyle;
}

interface PhoneData {
  brandName: string;
  brandEmoji: string;
  brandColor: string;
  model: ModelType;
  specs: PhoneSpec;
  design: PhoneDesign;
  scores: { performance: number; camera: number; battery: number; design: number; value: number };
  grade: Grade;
  totalScore: number;
  revenue: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const BRAND_EMOJIS = ["🌟", "⚡", "🔥", "💎", "🚀", "🌙", "🦁", "🐉", "🎯", "👑", "🌊", "🍀"];
const BRAND_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
  "#84CC16", "#E11D48",
];

const MODEL_OPTIONS: { key: ModelType; label: string; emoji: string; desc: string }[] = [
  { key: "smartphone", label: "스마트폰", emoji: "📱", desc: "기본형 스마트폰" },
  { key: "foldable", label: "폴더블폰", emoji: "📲", desc: "접을 수 있는 폰" },
  { key: "gaming", label: "게이밍폰", emoji: "🎮", desc: "게임 특화 폰" },
  { key: "mini", label: "미니폰", emoji: "📟", desc: "작고 귀여운 폰" },
  { key: "tablet", label: "태블릿폰", emoji: "💻", desc: "큰 화면 팹릿" },
];

const CAMERA_OPTIONS: { key: CameraType; label: string; count: number; cost: number }[] = [
  { key: "single", label: "단일", count: 1, cost: 20 },
  { key: "dual", label: "듀얼", count: 2, cost: 40 },
  { key: "triple", label: "트리플", count: 3, cost: 60 },
  { key: "quad", label: "쿼드", count: 4, cost: 80 },
  { key: "penta", label: "펜타", count: 5, cost: 100 },
];

const RAM_OPTIONS = [
  { value: 4, cost: 10 },
  { value: 6, cost: 20 },
  { value: 8, cost: 40 },
  { value: 12, cost: 70 },
  { value: 16, cost: 100 },
];

const STORAGE_OPTIONS = [
  { value: 64, cost: 10 },
  { value: 128, cost: 25 },
  { value: 256, cost: 50 },
  { value: 512, cost: 80 },
  { value: 1024, cost: 120 },
];

const CPU_OPTIONS: { key: CPUType; label: string; cost: number }[] = [
  { key: "budget", label: "보급형", cost: 30 },
  { key: "mid", label: "중급", cost: 60 },
  { key: "high", label: "고급", cost: 100 },
  { key: "flagship", label: "플래그십", cost: 150 },
  { key: "ultimate", label: "우주최강", cost: 200 },
];

const BACK_COLORS = [
  { name: "미드나이트 블랙", value: "#1a1a2e", gradient: "linear-gradient(135deg, #1a1a2e, #16213e)" },
  { name: "오션 블루", value: "#0077b6", gradient: "linear-gradient(135deg, #0077b6, #00b4d8)" },
  { name: "선셋 골드", value: "#f4a261", gradient: "linear-gradient(135deg, #f4a261, #e76f51)" },
  { name: "로즈 골드", value: "#b76e79", gradient: "linear-gradient(135deg, #b76e79, #e8a0bf)" },
  { name: "에메랄드", value: "#2d6a4f", gradient: "linear-gradient(135deg, #2d6a4f, #52b788)" },
  { name: "라벤더", value: "#7b68ee", gradient: "linear-gradient(135deg, #7b68ee, #b19cd9)" },
  { name: "실버", value: "#adb5bd", gradient: "linear-gradient(135deg, #adb5bd, #dee2e6)" },
  { name: "체리 레드", value: "#c1121f", gradient: "linear-gradient(135deg, #c1121f, #e5383b)" },
  { name: "코랄 핑크", value: "#ff6b6b", gradient: "linear-gradient(135deg, #ff6b6b, #ffa8a8)" },
  { name: "민트", value: "#38b2ac", gradient: "linear-gradient(135deg, #38b2ac, #81e6d9)" },
  { name: "화이트", value: "#f1f1f1", gradient: "linear-gradient(135deg, #f1f1f1, #ffffff)" },
  { name: "오로라", value: "#667eea", gradient: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)" },
];

const MATERIALS: { key: MaterialType; label: string; emoji: string }[] = [
  { key: "glass", label: "유리", emoji: "🪟" },
  { key: "metal", label: "메탈", emoji: "🔩" },
  { key: "leather", label: "가죽", emoji: "👜" },
  { key: "ceramic", label: "세라믹", emoji: "🏺" },
  { key: "wood", label: "나무", emoji: "🪵" },
  { key: "carbon", label: "카본", emoji: "⚫" },
];

const CASE_OPTIONS: { key: CaseType; label: string }[] = [
  { key: "none", label: "없음" },
  { key: "clear", label: "투명" },
  { key: "bumper", label: "범퍼" },
  { key: "leather", label: "가죽" },
  { key: "glitter", label: "글리터" },
];

const NOTCH_OPTIONS: { key: NotchType; label: string }[] = [
  { key: "notch", label: "노치" },
  { key: "punch", label: "펀치홀" },
  { key: "under", label: "언더디스플레이" },
  { key: "drop", label: "물방울" },
];

const BUTTON_OPTIONS: { key: ButtonStyle; label: string }[] = [
  { key: "normal", label: "일반" },
  { key: "flat", label: "플랫" },
  { key: "gesture", label: "없음(제스처)" },
];

const WIRE_COLORS = [
  { color: "#ef4444", label: "빨강" },
  { color: "#3b82f6", label: "파랑" },
  { color: "#1f2937", label: "검정" },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function calcTotalCost(specs: PhoneSpec): number {
  const camCost = CAMERA_OPTIONS.find((c) => c.key === specs.camera)?.cost || 0;
  const ramCost = RAM_OPTIONS.find((r) => r.value === specs.ram)?.cost || 0;
  const storageCost = STORAGE_OPTIONS.find((s) => s.value === specs.storage)?.cost || 0;
  const cpuCost = CPU_OPTIONS.find((c) => c.key === specs.cpu)?.cost || 0;
  const screenCost = Math.round((specs.screenSize - 5) * 20 + 20);
  const batteryCost = Math.round((specs.battery - 3000) / 100 * 3 + 10);
  return camCost + ramCost + storageCost + cpuCost + screenCost + batteryCost;
}

function calcScores(specs: PhoneSpec, design: PhoneDesign) {
  const cpuScore = { budget: 30, mid: 50, high: 70, flagship: 85, ultimate: 100 }[specs.cpu];
  const ramBonus = Math.min(specs.ram * 3, 40);
  const performance = Math.min(100, cpuScore + ramBonus / 4);

  const camCount = CAMERA_OPTIONS.find((c) => c.key === specs.camera)?.count || 1;
  const camera = Math.min(100, camCount * 20 + 10);

  const battery = Math.min(100, (specs.battery - 2500) / 35);

  const designScore = 60 +
    (design.material === "ceramic" ? 15 : design.material === "glass" ? 10 : design.material === "carbon" ? 12 : 5) +
    (design.caseType !== "none" ? 5 : 0) +
    (design.notch === "under" ? 10 : design.notch === "punch" ? 7 : 3);

  const totalCost = calcTotalCost(specs);
  const avgPerf = (performance + camera + battery + designScore) / 4;
  const value = Math.min(100, avgPerf * (500 / Math.max(totalCost, 100)) * 0.8);

  return {
    performance: Math.round(performance),
    camera: Math.round(camera),
    battery: Math.round(battery),
    design: Math.round(Math.min(100, designScore)),
    value: Math.round(Math.min(100, Math.max(10, value))),
  };
}

function getGrade(avg: number): Grade {
  if (avg >= 85) return "S";
  if (avg >= 70) return "A";
  if (avg >= 55) return "B";
  if (avg >= 40) return "C";
  return "D";
}

// ─── Main Component ────────────────────────────────────────────────────
export default function PhoneMakerPage() {
  const [step, setStep] = useState(0);
  // Step 0: brand, 1: model, 2: specs, 3: assembly, 4: design, 5: visualize, 6: benchmark, 7: launch, 8: collection

  // Brand
  const [brandName, setBrandName] = useState("");
  const [brandEmoji, setBrandEmoji] = useState("🌟");
  const [brandColor, setBrandColor] = useState("#3B82F6");

  // Model
  const [model, setModel] = useState<ModelType>("smartphone");

  // Specs
  const [specs, setSpecs] = useState<PhoneSpec>({
    screenSize: 6.1,
    camera: "triple",
    ram: 8,
    storage: 128,
    battery: 4500,
    cpu: "mid",
  });

  // Assembly mini-game
  const [assemblyStep, setAssemblyStep] = useState(0);

  // Design
  const [design, setDesign] = useState<PhoneDesign>({
    backColor: BACK_COLORS[0].gradient,
    material: "glass",
    caseType: "none",
    notch: "punch",
    buttonStyle: "normal",
  });
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  // Visualize
  const [showBack, setShowBack] = useState(false);

  // Benchmark
  const [benchmarkDone, setBenchmarkDone] = useState(false);
  const [benchmarkScore, setBenchmarkScore] = useState(0);
  const [scores, setScores] = useState({ performance: 0, camera: 0, battery: 0, design: 0, value: 0 });
  const [grade, setGrade] = useState<Grade>("C");

  // Launch
  const [launchPhase, setLaunchPhase] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [revenue, setRevenue] = useState(0);

  // Collection
  const [collection, setCollection] = useState<PhoneData[]>([]);

  // ─── Assembly mini-game states ───
  // CPU placement
  const [cpuPlaced, setCpuPlaced] = useState(false);
  const [cpuDragPos, setCpuDragPos] = useState({ x: 50, y: 200 });
  const [cpuDragging, setCpuDragging] = useState(false);
  const cpuSocketRef = useRef<HTMLDivElement>(null);
  const cpuChipRef = useRef<HTMLDivElement>(null);

  // Screen attachment
  const [filmPeeled, setFilmPeeled] = useState(false);
  const [filmProgress, setFilmProgress] = useState(0);
  const [screenPressed, setScreenPressed] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Battery wires
  const [wireConnections, setWireConnections] = useState<(number | null)[]>([null, null, null]);
  const [draggingWire, setDraggingWire] = useState<number | null>(null);

  // Camera module
  const [cameraLensPlaced, setCameraLensPlaced] = useState<boolean[]>([]);
  const [draggingLens, setDraggingLens] = useState<number | null>(null);

  // Quality check
  const [qcPhase, setQcPhase] = useState(0);
  const [bootProgress, setBootProgress] = useState(0);
  const [tapTargets, setTapTargets] = useState<{ x: number; y: number; hit: boolean }[]>([]);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [volumeTested, setVolumeTested] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(50);

  const budget = 500;
  const totalCost = calcTotalCost(specs);
  const remaining = budget - totalCost;

  // ─── Assembly Helpers ────────────────────────────────────────────────
  const initAssembly = useCallback(() => {
    setAssemblyStep(0);
    setCpuPlaced(false);
    setCpuDragPos({ x: 50, y: 200 });
    setCpuDragging(false);
    setFilmPeeled(false);
    setFilmProgress(0);
    setScreenPressed(false);
    setPressProgress(0);
    setWireConnections([null, null, null]);
    setDraggingWire(null);
    const camCount = CAMERA_OPTIONS.find((c) => c.key === specs.camera)?.count || 1;
    setCameraLensPlaced(new Array(camCount).fill(false));
    setDraggingLens(null);
    setQcPhase(0);
    setBootProgress(0);
    setTapTargets([
      { x: 30, y: 30, hit: false },
      { x: 70, y: 50, hit: false },
      { x: 50, y: 80, hit: false },
    ]);
    setPhotoTaken(false);
    setVolumeTested(false);
    setVolumeLevel(50);
  }, [specs.camera]);

  // Boot animation for QC
  useEffect(() => {
    if (assemblyStep === 4 && qcPhase === 0 && bootProgress < 100) {
      const timer = setTimeout(() => setBootProgress((p) => Math.min(100, p + 2)), 50);
      return () => clearTimeout(timer);
    }
    if (assemblyStep === 4 && qcPhase === 0 && bootProgress >= 100) {
      setTimeout(() => setQcPhase(1), 500);
    }
  }, [assemblyStep, qcPhase, bootProgress]);

  // Press-and-hold for screen
  const startPress = () => {
    if (pressIntervalRef.current) return;
    pressIntervalRef.current = setInterval(() => {
      setPressProgress((p) => {
        if (p >= 100) {
          if (pressIntervalRef.current) clearInterval(pressIntervalRef.current);
          pressIntervalRef.current = null;
          setScreenPressed(true);
          return 100;
        }
        return p + 2;
      });
    }, 30);
  };

  const endPress = () => {
    if (pressIntervalRef.current) {
      clearInterval(pressIntervalRef.current);
      pressIntervalRef.current = null;
    }
    if (!screenPressed) setPressProgress(0);
  };

  // Benchmark animation
  useEffect(() => {
    if (step === 6 && !benchmarkDone) {
      const s = calcScores(specs, design);
      const avg = Math.round((s.performance + s.camera + s.battery + s.design + s.value) / 5);
      const target = avg * 1000 + Math.floor(Math.random() * 500);
      let current = 0;
      const timer = setInterval(() => {
        current += Math.ceil((target - current) * 0.05) + 1;
        if (current >= target) {
          current = target;
          clearInterval(timer);
          setScores(s);
          setGrade(getGrade(avg));
          setBenchmarkDone(true);
        }
        setBenchmarkScore(current);
      }, 30);
      return () => clearInterval(timer);
    }
  }, [step, benchmarkDone, specs, design]);

  // Launch animation
  useEffect(() => {
    if (step === 7) {
      const phases = [0, 1, 2, 3];
      let idx = 0;
      setLaunchPhase(0);
      setSalesCount(0);
      setRevenue(0);
      const timer = setInterval(() => {
        idx++;
        if (idx < phases.length) {
          setLaunchPhase(phases[idx]);
        }
        if (idx >= phases.length) clearInterval(timer);
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Sales counter
  useEffect(() => {
    if (step === 7 && launchPhase >= 2) {
      const avg = (scores.performance + scores.camera + scores.battery + scores.design + scores.value) / 5;
      const targetSales = Math.round(avg * 1000 + Math.random() * 5000);
      const targetRevenue = targetSales * Math.round(totalCost * 1.5 + 20);
      let s = 0;
      const timer = setInterval(() => {
        s += Math.ceil((targetSales - s) * 0.08) + 1;
        if (s >= targetSales) {
          s = targetSales;
          clearInterval(timer);
        }
        setSalesCount(s);
        setRevenue(Math.round((s / targetSales) * targetRevenue));
      }, 40);
      return () => clearInterval(timer);
    }
  }, [step, launchPhase, scores, totalCost]);

  // ─── Save to collection ──────────────────────────────────────────────
  const saveToCollection = () => {
    const avg = Math.round((scores.performance + scores.camera + scores.battery + scores.design + scores.value) / 5);
    const phone: PhoneData = {
      brandName,
      brandEmoji,
      brandColor,
      model,
      specs,
      design,
      scores,
      grade: getGrade(avg),
      totalScore: benchmarkScore,
      revenue,
    };
    setCollection((prev) => [...prev, phone]);
    setStep(8);
  };

  const startNew = () => {
    setStep(0);
    setBrandName("");
    setBrandEmoji("🌟");
    setBrandColor("#3B82F6");
    setModel("smartphone");
    setSpecs({ screenSize: 6.1, camera: "triple", ram: 8, storage: 128, battery: 4500, cpu: "mid" });
    setDesign({ backColor: BACK_COLORS[0].gradient, material: "glass", caseType: "none", notch: "punch", buttonStyle: "normal" });
    setSelectedColorIdx(0);
    setShowBack(false);
    setBenchmarkDone(false);
    setBenchmarkScore(0);
    setScores({ performance: 0, camera: 0, battery: 0, design: 0, value: 0 });
    setGrade("C");
  };

  // ─── Phone visualization component ──────────────────────────────────
  const PhoneVisual = ({ size = "lg", flipEnabled = true }: { size?: "sm" | "lg"; flipEnabled?: boolean }) => {
    const isBack = showBack && flipEnabled;
    const w = size === "lg" ? 220 : 120;
    const h = size === "lg" ? 440 : 240;
    const r = size === "lg" ? 24 : 14;
    const colorObj = BACK_COLORS[selectedColorIdx];
    const camCount = CAMERA_OPTIONS.find((c) => c.key === specs.camera)?.count || 1;

    const materialTexture: Record<MaterialType, string> = {
      glass: "opacity-90",
      metal: "opacity-95",
      leather: "opacity-85",
      ceramic: "opacity-100",
      wood: "opacity-80",
      carbon: "opacity-95",
    };

    const caseOutline = design.caseType === "bumper"
      ? "ring-4 ring-gray-600"
      : design.caseType === "clear"
      ? "ring-2 ring-white/30"
      : design.caseType === "glitter"
      ? "ring-4 ring-pink-400/60"
      : design.caseType === "leather"
      ? "ring-4 ring-amber-800/70"
      : "";

    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className={`relative transition-all duration-500 ${materialTexture[design.material]} ${caseOutline}`}
          style={{
            width: w,
            height: h,
            borderRadius: r,
            background: isBack ? colorObj.gradient : "#111",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            transform: isBack ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Side buttons */}
          {design.buttonStyle !== "gesture" && (
            <>
              <div
                className="absolute bg-gray-600 rounded-r-sm"
                style={{
                  right: -3,
                  top: h * 0.25,
                  width: 3,
                  height: size === "lg" ? 40 : 22,
                  borderRadius: design.buttonStyle === "flat" ? 1 : 2,
                }}
              />
              <div
                className="absolute bg-gray-600 rounded-l-sm"
                style={{
                  left: -3,
                  top: h * 0.2,
                  width: 3,
                  height: size === "lg" ? 25 : 14,
                }}
              />
              <div
                className="absolute bg-gray-600 rounded-l-sm"
                style={{
                  left: -3,
                  top: h * 0.32,
                  width: 3,
                  height: size === "lg" ? 25 : 14,
                }}
              />
            </>
          )}

          {!isBack ? (
            /* Front */
            <div className="absolute inset-2 rounded-[20px] overflow-hidden" style={{ borderRadius: r - 4 }}>
              <div className="w-full h-full bg-gray-900 relative">
                {/* Notch / punch hole */}
                {design.notch === "notch" && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black rounded-b-xl"
                    style={{ width: w * 0.35, height: size === "lg" ? 28 : 16 }} />
                )}
                {design.notch === "punch" && (
                  <div className="absolute bg-black rounded-full"
                    style={{ top: size === "lg" ? 10 : 5, left: "50%", transform: "translateX(-50%)",
                      width: size === "lg" ? 12 : 7, height: size === "lg" ? 12 : 7 }} />
                )}
                {design.notch === "drop" && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black"
                    style={{
                      width: size === "lg" ? 20 : 12, height: size === "lg" ? 20 : 12,
                      borderRadius: "0 0 50% 50%",
                    }} />
                )}
                {/* Status bar */}
                <div className="absolute top-1 left-0 right-0 flex justify-between items-center px-3"
                  style={{ fontSize: size === "lg" ? 10 : 6 }}>
                  <span className="text-white/60">9:41</span>
                  <div className="flex gap-1 text-white/60">
                    <span>📶</span><span>📡</span><span>🔋</span>
                  </div>
                </div>
                {/* Screen content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80"
                  style={{ paddingTop: size === "lg" ? 40 : 20 }}>
                  <span style={{ fontSize: size === "lg" ? 28 : 16 }}>{brandEmoji}</span>
                  <span className="font-bold mt-1" style={{ fontSize: size === "lg" ? 14 : 8 }}>
                    {brandName || "My Phone"}
                  </span>
                  <span className="text-white/40 mt-1" style={{ fontSize: size === "lg" ? 10 : 6 }}>
                    {specs.screenSize.toFixed(1)}&quot; Display
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Back */
            <div className="absolute inset-0 flex flex-col items-center p-4" style={{ transform: "scaleX(-1)" }}>
              {/* Camera module */}
              <div className="mt-3 ml-auto mr-4 bg-black/30 rounded-2xl p-2 backdrop-blur-sm"
                style={{ minWidth: size === "lg" ? 50 : 30 }}>
                <div className={`grid gap-1 ${camCount >= 3 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {Array.from({ length: camCount }).map((_, i) => (
                    <div key={i} className="rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center"
                      style={{
                        width: size === "lg" ? 22 : 12,
                        height: size === "lg" ? 22 : 12,
                      }}>
                      <div className="rounded-full bg-blue-900/50"
                        style={{ width: size === "lg" ? 10 : 5, height: size === "lg" ? 10 : 5 }} />
                    </div>
                  ))}
                </div>
                {/* Flash */}
                <div className="rounded-full bg-yellow-300/50 mx-auto mt-1"
                  style={{ width: size === "lg" ? 8 : 4, height: size === "lg" ? 8 : 4 }} />
              </div>
              {/* Brand */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span style={{ fontSize: size === "lg" ? 32 : 18 }}>{brandEmoji}</span>
                <span className="font-bold mt-1"
                  style={{
                    fontSize: size === "lg" ? 16 : 8,
                    color: colorObj.value === "#f1f1f1" ? "#333" : "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}>
                  {brandName || "My Phone"}
                </span>
              </div>
            </div>
          )}
        </div>
        {flipEnabled && (
          <button
            onClick={() => setShowBack(!showBack)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white/70 transition-colors"
          >
            {showBack ? "앞면 보기" : "뒷면 보기"} 🔄
          </button>
        )}
      </div>
    );
  };

  // ─── Radar Chart ─────────────────────────────────────────────────────
  const RadarChart = () => {
    const labels = ["성능", "카메라", "배터리", "디자인", "가성비"];
    const values = [scores.performance, scores.camera, scores.battery, scores.design, scores.value];
    const cx = 120, cy = 120, maxR = 90;
    const angles = labels.map((_, i) => (Math.PI * 2 * i) / labels.length - Math.PI / 2);

    const points = values.map((v, i) => {
      const r = (v / 100) * maxR;
      return { x: cx + r * Math.cos(angles[i]), y: cy + r * Math.sin(angles[i]) };
    });

    const gridLevels = [20, 40, 60, 80, 100];

    return (
      <svg viewBox="0 0 240 240" className="w-full max-w-[280px]">
        {/* Grid */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={angles.map((a) => {
              const r = (level / 100) * maxR;
              return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        ))}
        {/* Axes */}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        ))}
        {/* Data polygon */}
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(59, 130, 246, 0.3)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3B82F6" />
        ))}
        {/* Labels */}
        {angles.map((a, i) => {
          const lx = cx + (maxR + 20) * Math.cos(a);
          const ly = cy + (maxR + 20) * Math.sin(a);
          return (
            <text key={i} x={lx} y={ly} fill="white" fontSize="11" textAnchor="middle" dominantBaseline="middle">
              {labels[i]} {values[i]}
            </text>
          );
        })}
      </svg>
    );
  };

  // ─── Render Steps ────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ─── Step 0: Brand ─────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">브랜드 만들기</h2>
              <p className="text-white/50">나만의 핸드폰 브랜드를 만들어보세요!</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">브랜드 이름</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="브랜드 이름을 입력하세요..."
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">브랜드 로고 이모지</label>
                <div className="grid grid-cols-6 gap-2">
                  {BRAND_EMOJIS.map((e) => (
                    <button key={e} onClick={() => setBrandEmoji(e)}
                      className={`text-2xl p-3 rounded-xl transition-all ${
                        brandEmoji === e ? "bg-blue-500/30 ring-2 ring-blue-400 scale-110" : "bg-white/5 hover:bg-white/10"
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">브랜드 컬러</label>
                <div className="grid grid-cols-6 gap-2">
                  {BRAND_COLORS.map((c) => (
                    <button key={c} onClick={() => setBrandColor(c)}
                      className={`w-full aspect-square rounded-xl transition-all ${
                        brandColor === c ? "ring-2 ring-white scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white/5 rounded-2xl p-6 flex items-center gap-4 border border-white/10">
                <div className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: brandColor + "30", border: `2px solid ${brandColor}` }}>
                  {brandEmoji}
                </div>
                <div>
                  <div className="text-white font-bold text-xl">{brandName || "브랜드 이름"}</div>
                  <div className="text-white/40 text-sm">새로운 폰 브랜드</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => brandName.trim() && setStep(1)}
              disabled={!brandName.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg transition-all"
            >
              다음 단계 →
            </button>
          </div>
        );

      // ─── Step 1: Model ─────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">모델 선택</h2>
              <p className="text-white/50">어떤 종류의 폰을 만들까요?</p>
            </div>

            <div className="space-y-3">
              {MODEL_OPTIONS.map((m) => (
                <button key={m.key} onClick={() => setModel(m.key)}
                  className={`w-full p-5 rounded-2xl text-left transition-all flex items-center gap-4 ${
                    model === m.key
                      ? "bg-blue-500/20 ring-2 ring-blue-400 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 hover:bg-white/10 border border-white/5"
                  }`}>
                  <span className="text-4xl">{m.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-lg">{m.label}</div>
                    <div className="text-white/50 text-sm">{m.desc}</div>
                  </div>
                  {model === m.key && <span className="ml-auto text-blue-400 text-xl">✓</span>}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex-1 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold transition-all">
                ← 이전
              </button>
              <button onClick={() => setStep(2)}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold transition-all">
                다음 단계 →
              </button>
            </div>
          </div>
        );

      // ─── Step 2: Specs ─────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">스펙 설정</h2>
              <p className="text-white/50">예산 내에서 최고의 스펙을 구성하세요!</p>
            </div>

            {/* Budget bar */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">예산</span>
                <span className={remaining < 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                  {remaining}만원 남음 / {budget}만원
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div
                  className={`h-full rounded-full transition-all ${remaining < 0 ? "bg-red-500" : "bg-gradient-to-r from-green-500 to-emerald-400"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (remaining / budget) * 100))}%` }}
                />
              </div>
            </div>

            {/* Screen size */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-white/70 text-sm">화면 크기</span>
                <span className="text-white font-bold">{specs.screenSize.toFixed(1)}&quot;</span>
              </div>
              <input type="range" min="50" max="75" value={specs.screenSize * 10}
                onChange={(e) => setSpecs({ ...specs, screenSize: parseInt(e.target.value) / 10 })}
                className="w-full accent-blue-500" />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>5.0&quot;</span><span>7.5&quot;</span>
              </div>
            </div>

            {/* Camera */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">카메라</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {CAMERA_OPTIONS.map((c) => (
                  <button key={c.key} onClick={() => setSpecs({ ...specs, camera: c.key })}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      specs.camera === c.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {c.label}
                    <div className="text-[10px] opacity-60">{c.cost}만원</div>
                  </button>
                ))}
              </div>
            </div>

            {/* RAM */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">RAM</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {RAM_OPTIONS.map((r) => (
                  <button key={r.value} onClick={() => setSpecs({ ...specs, ram: r.value })}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      specs.ram === r.value ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {r.value}GB
                    <div className="text-[10px] opacity-60">{r.cost}만원</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">저장 용량</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {STORAGE_OPTIONS.map((s) => (
                  <button key={s.value} onClick={() => setSpecs({ ...specs, storage: s.value })}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      specs.storage === s.value ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {s.value >= 1024 ? "1TB" : `${s.value}GB`}
                    <div className="text-[10px] opacity-60">{s.cost}만원</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Battery */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-white/70 text-sm">배터리</span>
                <span className="text-white font-bold">{specs.battery}mAh</span>
              </div>
              <input type="range" min="3000" max="6000" step="100" value={specs.battery}
                onChange={(e) => setSpecs({ ...specs, battery: parseInt(e.target.value) })}
                className="w-full accent-blue-500" />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>3000mAh</span><span>6000mAh</span>
              </div>
            </div>

            {/* CPU */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">CPU</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {CPU_OPTIONS.map((c) => (
                  <button key={c.key} onClick={() => setSpecs({ ...specs, cpu: c.key })}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      specs.cpu === c.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {c.label}
                    <div className="text-[10px] opacity-60">{c.cost}만원</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold transition-all">
                ← 이전
              </button>
              <button onClick={() => { initAssembly(); setStep(3); }}
                disabled={remaining < 0}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-red-800 disabled:to-red-700 text-white rounded-2xl font-bold transition-all">
                {remaining < 0 ? "예산 초과!" : "조립 시작 →"}
              </button>
            </div>
          </div>
        );

      // ─── Step 3: Assembly Mini-games ───────────────────────────────
      case 3:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">조립 미니게임</h2>
              <p className="text-white/50">폰을 직접 조립해보세요!</p>
              <div className="flex justify-center gap-2 mt-3">
                {["CPU", "화면", "배터리", "카메라", "품질검사"].map((label, i) => (
                  <div key={i} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    i === assemblyStep ? "bg-blue-500 text-white" : i < assemblyStep ? "bg-green-500/30 text-green-400" : "bg-white/10 text-white/30"
                  }`}>
                    {i < assemblyStep ? "✓" : ""} {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 min-h-[350px] flex flex-col items-center justify-center relative overflow-hidden">
              {/* CPU Placement */}
              {assemblyStep === 0 && (
                <div className="w-full text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">⚡ CPU 장착</h3>
                  <p className="text-white/50 text-sm">CPU 칩을 소켓 위에 정확히 놓으세요!</p>
                  <div className="relative w-full h-[250px]">
                    {/* Socket */}
                    <div ref={cpuSocketRef}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-dashed border-green-400/50 rounded-lg flex items-center justify-center bg-green-500/5">
                      <span className="text-green-400/30 text-xs">소켓</span>
                    </div>
                    {/* CPU Chip */}
                    {!cpuPlaced && (
                      <div
                        ref={cpuChipRef}
                        className="absolute w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg border border-gray-500 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg select-none"
                        style={{ left: cpuDragPos.x, top: cpuDragPos.y, touchAction: "none" }}
                        onPointerDown={(e) => {
                          setCpuDragging(true);
                          (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          if (!cpuDragging) return;
                          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                          setCpuDragPos({
                            x: e.clientX - rect.left - 32,
                            y: e.clientY - rect.top - 32,
                          });
                        }}
                        onPointerUp={() => {
                          setCpuDragging(false);
                          if (cpuSocketRef.current) {
                            const socketRect = cpuSocketRef.current.getBoundingClientRect();
                            const chipRect = cpuChipRef.current?.getBoundingClientRect();
                            if (chipRect) {
                              const dx = Math.abs((chipRect.left + chipRect.width / 2) - (socketRect.left + socketRect.width / 2));
                              const dy = Math.abs((chipRect.top + chipRect.height / 2) - (socketRect.top + socketRect.height / 2));
                              if (dx < 30 && dy < 30) {
                                setCpuPlaced(true);
                                setTimeout(() => setAssemblyStep(1), 800);
                              }
                            }
                          }
                        }}
                      >
                        <span className="text-xs text-white/70 font-mono">CPU</span>
                      </div>
                    )}
                    {cpuPlaced && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-lg border-2 border-green-400 flex items-center justify-center animate-pulse">
                        <span className="text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Screen Attachment */}
              {assemblyStep === 1 && (
                <div className="w-full text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">📱 화면 부착</h3>
                  {!filmPeeled ? (
                    <>
                      <p className="text-white/50 text-sm">보호 필름을 아래로 스와이프해서 벗기세요!</p>
                      <div className="relative w-48 h-80 mx-auto bg-gray-800 rounded-2xl overflow-hidden border border-gray-600">
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-blue-300/40 to-blue-100/20 backdrop-blur-sm border-b-2 border-blue-300/50 transition-transform cursor-pointer select-none"
                          style={{ transform: `translateY(${filmProgress}%)`, touchAction: "none" }}
                          onPointerDown={(e) => {
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                            const startY = e.clientY;
                            const onMove = (ev: PointerEvent) => {
                              const dy = ev.clientY - startY;
                              const progress = Math.min(100, Math.max(0, (dy / 300) * 100));
                              setFilmProgress(progress);
                              if (progress >= 95) {
                                setFilmPeeled(true);
                                (e.target as HTMLElement).removeEventListener("pointermove", onMove);
                              }
                            };
                            (e.target as HTMLElement).addEventListener("pointermove", onMove);
                            (e.target as HTMLElement).addEventListener("pointerup", () => {
                              (e.target as HTMLElement).removeEventListener("pointermove", onMove);
                            }, { once: true });
                          }}
                        >
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-blue-800/60">↓ 스와이프</div>
                        </div>
                      </div>
                    </>
                  ) : !screenPressed ? (
                    <>
                      <p className="text-white/50 text-sm">화면을 꾹 눌러서 부착하세요! (3초간 누르기)</p>
                      <div className="relative w-48 h-48 mx-auto">
                        {/* Progress ring */}
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                          <circle cx="96" cy="96" r="80" fill="none" stroke="#3B82F6" strokeWidth="8"
                            strokeDasharray={`${(pressProgress / 100) * 502.6} 502.6`}
                            strokeLinecap="round" className="transition-all" />
                        </svg>
                        <button
                          className="absolute inset-0 m-auto w-32 h-32 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center text-white font-bold select-none"
                          onPointerDown={startPress}
                          onPointerUp={endPress}
                          onPointerLeave={endPress}
                        >
                          {Math.round(pressProgress)}%
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center animate-bounce">
                      <div className="text-6xl mb-2">✅</div>
                      <p className="text-green-400 font-bold">화면 부착 완료!</p>
                      {setTimeout(() => setAssemblyStep(2), 800) && null}
                    </div>
                  )}
                </div>
              )}

              {/* Battery Wires */}
              {assemblyStep === 2 && (
                <div className="w-full text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">🔋 배터리 연결</h3>
                  <p className="text-white/50 text-sm">같은 색 커넥터끼리 연결하세요!</p>
                  <div className="flex justify-around items-center w-full max-w-sm mx-auto py-8">
                    {/* Left: Wire sources */}
                    <div className="flex flex-col gap-6">
                      {WIRE_COLORS.map((w, i) => (
                        <div key={i}
                          className={`w-14 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-grab select-none transition-all ${
                            wireConnections[i] !== null ? "opacity-50" : "hover:scale-110"
                          } ${draggingWire === i ? "ring-2 ring-white scale-110" : ""}`}
                          style={{ backgroundColor: w.color }}
                          onClick={() => {
                            if (wireConnections[i] !== null) return;
                            setDraggingWire(draggingWire === i ? null : i);
                          }}
                        >
                          {w.label}
                          {wireConnections[i] !== null && " ✓"}
                        </div>
                      ))}
                    </div>
                    {/* Connection lines visual */}
                    <div className="text-white/20 text-2xl">
                      {draggingWire !== null ? "→→→" : "· · ·"}
                    </div>
                    {/* Right: Targets (shuffled order: 2, 0, 1) */}
                    <div className="flex flex-col gap-6">
                      {[2, 0, 1].map((targetIdx) => {
                        const w = WIRE_COLORS[targetIdx];
                        const connected = wireConnections.findIndex((c) => c === targetIdx) !== -1;
                        return (
                          <div key={targetIdx}
                            className={`w-14 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer select-none transition-all border-2 border-dashed ${
                              connected ? "border-solid opacity-80" : "hover:scale-110"
                            }`}
                            style={{ borderColor: w.color, backgroundColor: connected ? w.color + "60" : "transparent" }}
                            onClick={() => {
                              if (draggingWire === null || connected) return;
                              if (draggingWire === targetIdx) {
                                // Correct match!
                                const newConn = [...wireConnections];
                                newConn[draggingWire] = targetIdx;
                                setWireConnections(newConn);
                                setDraggingWire(null);
                                if (newConn.every((c) => c !== null)) {
                                  setTimeout(() => setAssemblyStep(3), 800);
                                }
                              } else {
                                // Wrong! Flash red
                                setDraggingWire(null);
                              }
                            }}
                          >
                            {w.label}
                            {connected && " ✓"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {draggingWire !== null && (
                    <p className="text-blue-400 text-sm animate-pulse">
                      {WIRE_COLORS[draggingWire].label} 와이어 선택됨 → 같은 색 커넥터를 클릭하세요!
                    </p>
                  )}
                </div>
              )}

              {/* Camera Module */}
              {assemblyStep === 3 && (
                <div className="w-full text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">📸 카메라 모듈</h3>
                  <p className="text-white/50 text-sm">카메라 렌즈를 올바른 위치에 배치하세요!</p>
                  <div className="relative w-64 h-64 mx-auto bg-gray-800/50 rounded-2xl border border-white/10">
                    {/* Target positions */}
                    {cameraLensPlaced.map((placed, i) => {
                      const positions = [
                        { x: 90, y: 70 },
                        { x: 150, y: 70 },
                        { x: 90, y: 130 },
                        { x: 150, y: 130 },
                        { x: 120, y: 190 },
                      ];
                      const pos = positions[i] || positions[0];
                      return (
                        <div key={`target-${i}`}
                          className={`absolute w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                            placed ? "border-green-400 bg-green-500/20" : "border-white/30"
                          }`}
                          style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
                          onClick={() => {
                            if (draggingLens !== null && !placed) {
                              const newPlaced = [...cameraLensPlaced];
                              newPlaced[draggingLens] = true;
                              setCameraLensPlaced(newPlaced);
                              setDraggingLens(null);
                              if (newPlaced.every((p) => p)) {
                                setTimeout(() => setAssemblyStep(4), 800);
                              }
                            }
                          }}
                        >
                          {placed ? (
                            <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-blue-900/50" />
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">{i + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Lens source */}
                  <div className="flex justify-center gap-3">
                    {cameraLensPlaced.map((placed, i) => (
                      !placed && (
                        <button key={`lens-${i}`}
                          onClick={() => setDraggingLens(draggingLens === i ? null : i)}
                          className={`w-14 h-14 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center transition-all ${
                            draggingLens === i ? "ring-2 ring-blue-400 scale-110" : "hover:scale-105"
                          }`}>
                          <div className="w-6 h-6 rounded-full bg-blue-900/50" />
                        </button>
                      )
                    ))}
                  </div>
                  {draggingLens !== null && (
                    <p className="text-blue-400 text-sm animate-pulse">렌즈를 위의 슬롯에 클릭해서 배치하세요!</p>
                  )}
                </div>
              )}

              {/* Quality Check */}
              {assemblyStep === 4 && (
                <div className="w-full text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">🔍 품질 검사</h3>
                  {qcPhase === 0 && (
                    <div className="space-y-4">
                      <p className="text-white/50 text-sm">폰이 부팅 중...</p>
                      <div className="w-48 h-80 mx-auto bg-gray-900 rounded-2xl flex flex-col items-center justify-center border border-gray-700">
                        <span className="text-3xl mb-4">{brandEmoji}</span>
                        <div className="w-32 bg-white/10 rounded-full h-2">
                          <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${bootProgress}%` }} />
                        </div>
                        <span className="text-white/30 text-xs mt-2">{bootProgress}%</span>
                      </div>
                    </div>
                  )}
                  {qcPhase === 1 && (
                    <div className="space-y-4">
                      <p className="text-white/50 text-sm">터치스크린 테스트 - 모든 타겟을 터치하세요!</p>
                      <div className="relative w-48 h-80 mx-auto bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
                        {tapTargets.map((t, i) => (
                          <button key={i}
                            onClick={() => {
                              const newTargets = [...tapTargets];
                              newTargets[i] = { ...newTargets[i], hit: true };
                              setTapTargets(newTargets);
                              if (newTargets.every((tt) => tt.hit)) {
                                setTimeout(() => setQcPhase(2), 500);
                              }
                            }}
                            className={`absolute w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              t.hit ? "bg-green-500/50 scale-75" : "bg-blue-500/50 animate-pulse hover:bg-blue-500"
                            }`}
                            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -50%)" }}
                          >
                            {t.hit ? "✓" : "●"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {qcPhase === 2 && (
                    <div className="space-y-4">
                      <p className="text-white/50 text-sm">카메라 테스트 - 사진을 찍어보세요!</p>
                      <div className="relative w-48 h-80 mx-auto bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden flex items-center justify-center">
                        {!photoTaken ? (
                          <button onClick={() => { setPhotoTaken(true); setTimeout(() => setQcPhase(3), 800); }}
                            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 border-4 border-white/50 flex items-center justify-center transition-all hover:scale-110">
                            <div className="w-12 h-12 rounded-full bg-red-500" />
                          </button>
                        ) : (
                          <div className="text-center animate-bounce">
                            <span className="text-5xl">📸</span>
                            <p className="text-green-400 text-sm mt-2">찰칵!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {qcPhase === 3 && (
                    <div className="space-y-4">
                      <p className="text-white/50 text-sm">스피커 테스트 - 볼륨을 최대로 올려보세요!</p>
                      <div className="w-48 mx-auto space-y-4">
                        <div className="text-6xl">{volumeLevel >= 80 ? "🔊" : volumeLevel >= 40 ? "🔉" : "🔈"}</div>
                        <input type="range" min="0" max="100" value={volumeLevel}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            setVolumeLevel(v);
                            if (v >= 95 && !volumeTested) {
                              setVolumeTested(true);
                              setTimeout(() => setStep(4), 800);
                            }
                          }}
                          className="w-full accent-blue-500" />
                        <p className="text-white/60 text-sm">볼륨: {volumeLevel}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Skip button */}
            <button onClick={() => setStep(4)}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 rounded-xl text-sm transition-all">
              미니게임 건너뛰기 →
            </button>
          </div>
        );

      // ─── Step 4: Design ────────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">디자인 커스터마이징</h2>
              <p className="text-white/50">폰의 외관을 꾸며보세요!</p>
            </div>

            {/* Back color */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">뒷면 색상</span>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {BACK_COLORS.map((c, i) => (
                  <button key={i} onClick={() => { setSelectedColorIdx(i); setDesign({ ...design, backColor: c.gradient }); }}
                    className={`h-12 rounded-xl transition-all ${selectedColorIdx === i ? "ring-2 ring-white scale-105" : "hover:scale-105"}`}
                    style={{ background: c.gradient }}
                  >
                    <span className="text-[9px] text-white/80 drop-shadow">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">뒷면 재질</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {MATERIALS.map((m) => (
                  <button key={m.key} onClick={() => setDesign({ ...design, material: m.key })}
                    className={`py-3 rounded-xl text-sm transition-all ${
                      design.material === m.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Case */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">케이스</span>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {CASE_OPTIONS.map((c) => (
                  <button key={c.key} onClick={() => setDesign({ ...design, caseType: c.key })}
                    className={`py-2 rounded-xl text-xs transition-all ${
                      design.caseType === c.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notch */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">화면 모양</span>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {NOTCH_OPTIONS.map((n) => (
                  <button key={n.key} onClick={() => setDesign({ ...design, notch: n.key })}
                    className={`py-2 rounded-xl text-xs transition-all ${
                      design.notch === n.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Button style */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <span className="text-white/70 text-sm">버튼 스타일</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {BUTTON_OPTIONS.map((b) => (
                  <button key={b.key} onClick={() => setDesign({ ...design, buttonStyle: b.key })}
                    className={`py-2 rounded-xl text-xs transition-all ${
                      design.buttonStyle === b.key ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold transition-all">
                ← 이전
              </button>
              <button onClick={() => { setShowBack(false); setStep(5); }}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold transition-all">
                폰 확인 →
              </button>
            </div>
          </div>
        );

      // ─── Step 5: Visualization ─────────────────────────────────────
      case 5:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">폰 시각화</h2>
              <p className="text-white/50">완성된 폰을 확인해보세요!</p>
            </div>

            <div className="flex justify-center">
              <PhoneVisual size="lg" />
            </div>

            {/* Spec summary */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <h3 className="text-white font-bold mb-3">{brandEmoji} {brandName} - {MODEL_OPTIONS.find((m) => m.key === model)?.label}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-white/50">화면: <span className="text-white">{specs.screenSize.toFixed(1)}&quot;</span></div>
                <div className="text-white/50">카메라: <span className="text-white">{CAMERA_OPTIONS.find((c) => c.key === specs.camera)?.label}</span></div>
                <div className="text-white/50">RAM: <span className="text-white">{specs.ram}GB</span></div>
                <div className="text-white/50">저장: <span className="text-white">{specs.storage >= 1024 ? "1TB" : `${specs.storage}GB`}</span></div>
                <div className="text-white/50">배터리: <span className="text-white">{specs.battery}mAh</span></div>
                <div className="text-white/50">CPU: <span className="text-white">{CPU_OPTIONS.find((c) => c.key === specs.cpu)?.label}</span></div>
                <div className="text-white/50">재질: <span className="text-white">{MATERIALS.find((m) => m.key === design.material)?.label}</span></div>
                <div className="text-white/50">케이스: <span className="text-white">{CASE_OPTIONS.find((c) => c.key === design.caseType)?.label}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(4)}
                className="flex-1 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold transition-all">
                ← 수정
              </button>
              <button onClick={() => { setBenchmarkDone(false); setBenchmarkScore(0); setStep(6); }}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold transition-all">
                성능 테스트 →
              </button>
            </div>
          </div>
        );

      // ─── Step 6: Benchmark ─────────────────────────────────────────
      case 6:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">성능 테스트</h2>
              <p className="text-white/50">벤치마크 결과를 확인하세요!</p>
            </div>

            {/* Score counter */}
            <div className="text-center">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tabular-nums">
                {benchmarkScore.toLocaleString()}
              </div>
              <div className="text-white/40 text-sm mt-1">벤치마크 점수</div>
            </div>

            {benchmarkDone && (
              <>
                {/* Grade */}
                <div className="text-center">
                  <div className={`inline-block text-5xl font-black px-8 py-4 rounded-2xl ${
                    grade === "S" ? "bg-gradient-to-r from-yellow-500 to-amber-400 text-white" :
                    grade === "A" ? "bg-gradient-to-r from-green-500 to-emerald-400 text-white" :
                    grade === "B" ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white" :
                    grade === "C" ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-white" :
                    "bg-gradient-to-r from-red-500 to-pink-400 text-white"
                  }`}>
                    {grade}등급
                  </div>
                </div>

                {/* Radar chart */}
                <div className="flex justify-center">
                  <RadarChart />
                </div>

                {/* Compare with famous phones */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h3 className="text-white font-bold mb-3 text-sm">유명 폰과 비교</h3>
                  <div className="space-y-3">
                    {[
                      { name: "아이폰 16 Pro", score: 82000, emoji: "🍎" },
                      { name: "갤럭시 S25 Ultra", score: 85000, emoji: "💫" },
                      { name: "픽셀 9 Pro", score: 78000, emoji: "🔵" },
                    ].map((phone) => (
                      <div key={phone.name} className="flex items-center gap-3">
                        <span className="text-lg">{phone.emoji}</span>
                        <span className="text-white/70 text-sm flex-1">{phone.name}</span>
                        <div className="w-24 bg-white/10 rounded-full h-2">
                          <div className="bg-white/30 h-full rounded-full" style={{ width: `${(phone.score / 100000) * 100}%` }} />
                        </div>
                        <span className="text-white/50 text-xs w-16 text-right">{phone.score.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 bg-blue-500/10 rounded-xl p-2 -mx-2">
                      <span className="text-lg">{brandEmoji}</span>
                      <span className="text-blue-400 text-sm flex-1 font-bold">{brandName}</span>
                      <div className="w-24 bg-white/10 rounded-full h-2">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(benchmarkScore / 100000) * 100}%` }} />
                      </div>
                      <span className="text-blue-400 text-xs w-16 text-right font-bold">{benchmarkScore.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button onClick={() => setStep(7)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-2xl font-bold text-lg transition-all">
                  출시하기! 🎉
                </button>
              </>
            )}
          </div>
        );

      // ─── Step 7: Launch ────────────────────────────────────────────
      case 7:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">출시!</h2>
            </div>

            {/* Launch event */}
            {launchPhase >= 0 && (
              <div className="text-center space-y-4 animate-fadeIn">
                <div className="text-6xl animate-bounce">{brandEmoji}</div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {brandName} 출시 이벤트!
                </h3>
                <div className="flex justify-center">
                  <PhoneVisual size="sm" flipEnabled={false} />
                </div>
              </div>
            )}

            {/* Crowd reaction */}
            {launchPhase >= 1 && (
              <div className="text-center space-y-2 animate-fadeIn">
                <p className="text-white/60 text-sm">관객 반응</p>
                <div className="text-4xl space-x-1 flex justify-center flex-wrap">
                  {(grade === "S" ? ["🤩", "😍", "🥳", "👏", "🔥", "💯", "🎊"] :
                    grade === "A" ? ["😊", "👍", "👏", "🎉", "✨"] :
                    grade === "B" ? ["😀", "👍", "😮", "🙂"] :
                    grade === "C" ? ["😐", "🤔", "👀"] :
                    ["😬", "😅", "🥱"]).map((e, i) => (
                    <span key={i} className="inline-block animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sales & Revenue */}
            {launchPhase >= 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                    <div className="text-white/50 text-sm mb-1">판매량</div>
                    <div className="text-2xl font-bold text-white tabular-nums">{salesCount.toLocaleString()}대</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                    <div className="text-white/50 text-sm mb-1">매출</div>
                    <div className="text-2xl font-bold text-green-400 tabular-nums">{(revenue / 10000).toFixed(1)}억원</div>
                  </div>
                </div>

                {/* Critic reviews */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h3 className="text-white font-bold text-sm mb-3">평론가 리뷰</h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { name: "테크리뷰", score: Math.min(10, (scores.performance / 10).toFixed(1)), comment: scores.performance >= 80 ? "압도적인 성능!" : "무난한 성능" },
                      { name: "카메라매니아", score: Math.min(10, (scores.camera / 10).toFixed(1)), comment: scores.camera >= 80 ? "최고의 카메라!" : "카메라는 평범" },
                      { name: "일상유저", score: Math.min(10, (scores.value / 10).toFixed(1)), comment: scores.value >= 70 ? "가성비 갑!" : "가격이 좀..." },
                    ].map((review) => (
                      <div key={review.name} className="flex items-center gap-3">
                        <span className="text-white/60 w-24">{review.name}</span>
                        <span className="text-yellow-400 font-bold">{review.score}/10</span>
                        <span className="text-white/40">{review.comment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {launchPhase >= 3 && (
              <div className="space-y-3 animate-fadeIn">
                <button onClick={saveToCollection}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold text-lg transition-all">
                  컬렉션에 저장 📱
                </button>
                <button onClick={startNew}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white/60 rounded-xl text-sm transition-all">
                  새 폰 만들기
                </button>
              </div>
            )}
          </div>
        );

      // ─── Step 8: Collection ────────────────────────────────────────
      case 8:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">컬렉션</h2>
              <p className="text-white/50">내가 만든 폰들</p>
            </div>

            {collection.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <span className="text-5xl block mb-4">📱</span>
                <p>아직 만든 폰이 없어요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {collection.map((phone, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{phone.brandEmoji}</span>
                      <div className="flex-1">
                        <div className="text-white font-bold">{phone.brandName}</div>
                        <div className="text-white/40 text-xs">
                          {MODEL_OPTIONS.find((m) => m.key === phone.model)?.label} •{" "}
                          {phone.specs.screenSize.toFixed(1)}&quot; •{" "}
                          {phone.specs.ram}GB RAM
                        </div>
                      </div>
                      <div className={`text-xl font-black px-3 py-1 rounded-xl ${
                        phone.grade === "S" ? "bg-yellow-500/20 text-yellow-400" :
                        phone.grade === "A" ? "bg-green-500/20 text-green-400" :
                        phone.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                        phone.grade === "C" ? "bg-orange-500/20 text-orange-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {phone.grade}
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center text-xs">
                      {["성능", "카메라", "배터리", "디자인", "가성비"].map((label, j) => {
                        const vals = [phone.scores.performance, phone.scores.camera, phone.scores.battery, phone.scores.design, phone.scores.value];
                        return (
                          <div key={label}>
                            <div className="text-white/30">{label}</div>
                            <div className="text-white font-bold">{vals[j]}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-white/40">
                      <span>점수: {phone.totalScore.toLocaleString()}</span>
                      <span>매출: {(phone.revenue / 10000).toFixed(1)}억원</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={startNew}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl font-bold text-lg transition-all">
              새 폰 만들기 +
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* CSS animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-white/50 hover:text-white/80 transition-colors text-sm">
            ← 홈으로
          </Link>
          <h1 className="text-lg font-bold">📱 핸드폰 만들기</h1>
          <button
            onClick={() => setStep(8)}
            className="text-white/50 hover:text-white/80 transition-colors text-sm"
          >
            컬렉션 ({collection.length})
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${((Math.min(step, 7) + 1) / 9) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-4 py-6 pb-20">
        {renderStep()}
      </div>
    </div>
  );
}
