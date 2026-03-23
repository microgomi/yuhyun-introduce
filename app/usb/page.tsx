"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────
type UsbType = "USB-A" | "USB-C" | "Micro USB" | "Lightning";
type Capacity = "8GB" | "16GB" | "32GB" | "64GB" | "128GB" | "256GB" | "512GB" | "1TB";
type CaseColor = string;
type StickerDesign = string;
type CaseMaterial = string;
type GamePhase =
  | "menu"
  | "selectType"
  | "selectCapacity"
  | "soldering"
  | "caseAssembly"
  | "connectorAlign"
  | "qualityCheck"
  | "customize"
  | "testing"
  | "result"
  | "gallery";

interface UsbDrive {
  id: number;
  type: UsbType;
  capacity: Capacity;
  color: CaseColor;
  sticker: StickerDesign;
  material: CaseMaterial;
  keychain: boolean;
  score: number;
  speed: number;
}

interface SolderDot {
  x: number;
  y: number;
  id: number;
  done: boolean;
}

interface AssemblyPart {
  id: number;
  name: string;
  emoji: string;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  placed: boolean;
}

interface Defect {
  x: number;
  y: number;
  found: boolean;
  id: number;
}

// ─── Constants ────────────────────────────────────────────────────
const USB_TYPES: { type: UsbType; emoji: string; desc: string }[] = [
  { type: "USB-A", emoji: "🔌", desc: "클래식 직사각형" },
  { type: "USB-C", emoji: "⚡", desc: "최신 양면 연결" },
  { type: "Micro USB", emoji: "📱", desc: "소형 커넥터" },
  { type: "Lightning", emoji: "🍎", desc: "애플 전용" },
];

const CAPACITIES: { cap: Capacity; price: number }[] = [
  { cap: "8GB", price: 0 },
  { cap: "16GB", price: 50 },
  { cap: "32GB", price: 100 },
  { cap: "64GB", price: 200 },
  { cap: "128GB", price: 400 },
  { cap: "256GB", price: 800 },
  { cap: "512GB", price: 1500 },
  { cap: "1TB", price: 3000 },
];

const CASE_COLORS = [
  { name: "블랙", value: "#1a1a2e" },
  { name: "화이트", value: "#e8e8e8" },
  { name: "블루", value: "#1e3a8a" },
  { name: "레드", value: "#991b1b" },
  { name: "그린", value: "#166534" },
  { name: "퍼플", value: "#581c87" },
  { name: "핑크", value: "#be185d" },
  { name: "골드", value: "#b8860b" },
];

const STICKERS = [
  { name: "없음", emoji: "" },
  { name: "별", emoji: "⭐" },
  { name: "하트", emoji: "💖" },
  { name: "번개", emoji: "⚡" },
  { name: "로켓", emoji: "🚀" },
  { name: "게임", emoji: "🎮" },
  { name: "음악", emoji: "🎵" },
  { name: "고양이", emoji: "🐱" },
];

const MATERIALS: { name: string; label: string; cost: number; unlocked: boolean }[] = [
  { name: "플라스틱", label: "기본 플라스틱", cost: 0, unlocked: true },
  { name: "금도금", label: "✨ 금도금", cost: 500, unlocked: false },
  { name: "크리스탈", label: "💎 크리스탈", cost: 800, unlocked: false },
  { name: "가죽", label: "🧳 가죽 케이스", cost: 600, unlocked: false },
  { name: "LED", label: "💡 LED 내장", cost: 1000, unlocked: false },
];

// ─── Helper ───────────────────────────────────────────────────────
function generateSolderDots(): SolderDot[] {
  const dots: SolderDot[] = [];
  const cx = 150, cy = 100;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    dots.push({
      id: i,
      x: cx + Math.cos(angle) * 60 + (Math.random() - 0.5) * 20,
      y: cy + Math.sin(angle) * 40 + (Math.random() - 0.5) * 15,
      done: false,
    });
  }
  return dots;
}

function generateAssemblyParts(): AssemblyPart[] {
  const parts = [
    { name: "메모리 칩", emoji: "🟩" },
    { name: "컨트롤러", emoji: "🔲" },
    { name: "커넥터", emoji: "🔌" },
    { name: "LED", emoji: "💡" },
    { name: "보호 캡", emoji: "🛡️" },
  ];
  return parts.map((p, i) => ({
    id: i,
    name: p.name,
    emoji: p.emoji,
    targetX: 80 + (i % 3) * 90,
    targetY: 70 + Math.floor(i / 3) * 80,
    currentX: 20 + Math.random() * 250,
    currentY: 180 + Math.random() * 40,
    placed: false,
  }));
}

function generateDefects(): Defect[] {
  const defects: Defect[] = [];
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    defects.push({
      id: i,
      x: 30 + Math.random() * 240,
      y: 20 + Math.random() * 140,
      found: false,
    });
  }
  return defects;
}

// ─── Main Component ───────────────────────────────────────────────
export default function UsbGame() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [money, setMoney] = useState(300);
  const [usbType, setUsbType] = useState<UsbType>("USB-A");
  const [capacity, setCapacity] = useState<Capacity>("8GB");
  const [collection, setCollection] = useState<UsbDrive[]>([]);
  const [unlockedMaterials, setUnlockedMaterials] = useState<string[]>(["플라스틱"]);

  // Soldering state
  const [solderDots, setSolderDots] = useState<SolderDot[]>([]);
  const [nextDot, setNextDot] = useState(0);
  const [solderScore, setSolderScore] = useState(0);

  // Assembly state
  const [assemblyParts, setAssemblyParts] = useState<AssemblyPart[]>([]);
  const [draggingPart, setDraggingPart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const assemblyRef = useRef<HTMLDivElement>(null);

  // Connector alignment state
  const [alignPos, setAlignPos] = useState(50);
  const [alignTarget] = useState(50);
  const [alignMoving, setAlignMoving] = useState(true);
  const [alignDir, setAlignDir] = useState(1);
  const [alignScore, setAlignScore] = useState(0);

  // Quality check state
  const [defects, setDefects] = useState<Defect[]>([]);
  const [qcTimeLeft, setQcTimeLeft] = useState(10);
  const [qcDone, setQcDone] = useState(false);

  // Customize state
  const [caseColor, setCaseColor] = useState(CASE_COLORS[0].value);
  const [sticker, setSticker] = useState("");
  const [material, setMaterial] = useState("플라스틱");
  const [keychain, setKeychain] = useState(false);

  // Testing state
  const [testProgress, setTestProgress] = useState(0);
  const [testSpeed, setTestSpeed] = useState(0);
  const [testDone, setTestDone] = useState(false);

  // Final score
  const [finalScore, setFinalScore] = useState(0);

  // ─── Alignment mini-game tick ─────────────────────────────────
  useEffect(() => {
    if (phase !== "connectorAlign" || !alignMoving) return;
    const interval = setInterval(() => {
      setAlignPos((p) => {
        let next = p + alignDir * 2;
        if (next >= 100 || next <= 0) {
          setAlignDir((d) => -d);
          next = Math.max(0, Math.min(100, next));
        }
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [phase, alignMoving, alignDir]);

  // ─── Quality check timer ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "qualityCheck" || qcDone) return;
    if (qcTimeLeft <= 0) {
      setQcDone(true);
      return;
    }
    const t = setTimeout(() => setQcTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, qcTimeLeft, qcDone]);

  // ─── Testing animation ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "testing" || testDone) return;
    if (testProgress >= 100) {
      setTestDone(true);
      return;
    }
    const t = setTimeout(() => {
      setTestProgress((p) => Math.min(100, p + Math.random() * 5 + 1));
      setTestSpeed(Math.floor(Math.random() * 200 + 50));
    }, 80);
    return () => clearTimeout(t);
  }, [phase, testProgress, testDone]);

  // ─── Phase transitions ───────────────────────────────────────
  const startNewUsb = useCallback(() => {
    setPhase("selectType");
  }, []);

  const selectType = useCallback((t: UsbType) => {
    setUsbType(t);
    setPhase("selectCapacity");
  }, []);

  const selectCapacity = useCallback(
    (c: Capacity, price: number) => {
      if (money < price) return;
      setCapacity(c);
      setMoney((m) => m - price);
      // Start soldering
      setSolderDots(generateSolderDots());
      setNextDot(0);
      setSolderScore(0);
      setPhase("soldering");
    },
    [money]
  );

  const handleSolderClick = useCallback(
    (id: number) => {
      if (id !== nextDot) return;
      setSolderDots((dots) => dots.map((d) => (d.id === id ? { ...d, done: true } : d)));
      setSolderScore((s) => s + 15);
      if (nextDot >= solderDots.length - 1) {
        // All done, move to assembly
        setTimeout(() => {
          setAssemblyParts(generateAssemblyParts());
          setPhase("caseAssembly");
        }, 500);
      } else {
        setNextDot((n) => n + 1);
      }
    },
    [nextDot, solderDots.length]
  );

  const handleAssemblyPointerDown = useCallback(
    (e: React.PointerEvent, partId: number) => {
      const part = assemblyParts.find((p) => p.id === partId);
      if (!part || part.placed) return;
      const rect = assemblyRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDraggingPart(partId);
      setDragOffset({
        x: e.clientX - rect.left - part.currentX,
        y: e.clientY - rect.top - part.currentY,
      });
    },
    [assemblyParts]
  );

  const handleAssemblyPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingPart === null) return;
      const rect = assemblyRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      setAssemblyParts((parts) =>
        parts.map((p) => (p.id === draggingPart ? { ...p, currentX: x, currentY: y } : p))
      );
    },
    [draggingPart, dragOffset]
  );

  const handleAssemblyPointerUp = useCallback(() => {
    if (draggingPart === null) return;
    setAssemblyParts((parts) => {
      const updated = parts.map((p) => {
        if (p.id !== draggingPart) return p;
        const dist = Math.sqrt((p.currentX - p.targetX) ** 2 + (p.currentY - p.targetY) ** 2);
        if (dist < 35) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, placed: true };
        }
        return p;
      });
      // Check if all placed
      if (updated.every((p) => p.placed)) {
        setTimeout(() => {
          setAlignPos(0);
          setAlignMoving(true);
          setAlignDir(1);
          setAlignScore(0);
          setPhase("connectorAlign");
        }, 400);
      }
      return updated;
    });
    setDraggingPart(null);
  }, [draggingPart]);

  const handleAlignStop = useCallback(() => {
    setAlignMoving(false);
    const diff = Math.abs(alignPos - alignTarget);
    const sc = Math.max(0, 100 - diff * 2);
    setAlignScore(Math.round(sc));
    setTimeout(() => {
      setDefects(generateDefects());
      setQcTimeLeft(10);
      setQcDone(false);
      setPhase("qualityCheck");
    }, 1000);
  }, [alignPos, alignTarget]);

  const handleFindDefect = useCallback((id: number) => {
    setDefects((d) => d.map((df) => (df.id === id ? { ...df, found: true } : df)));
  }, []);

  const goToCustomize = useCallback(() => {
    setCaseColor(CASE_COLORS[0].value);
    setSticker("");
    setMaterial("플라스틱");
    setKeychain(false);
    setPhase("customize");
  }, []);

  const startTesting = useCallback(() => {
    setTestProgress(0);
    setTestSpeed(0);
    setTestDone(false);
    setPhase("testing");
  }, []);

  const finishUsb = useCallback(() => {
    const capIdx = CAPACITIES.findIndex((c) => c.cap === capacity);
    const baseSpeed = (capIdx + 1) * 30 + Math.random() * 50;
    const foundDefects = defects.filter((d) => d.found).length;
    const totalDefects = defects.length;
    const qcBonus = totalDefects > 0 ? Math.round((foundDefects / totalDefects) * 40) : 40;
    const total = solderScore + alignScore + qcBonus + (keychain ? 5 : 0);
    setFinalScore(total);

    const reward = 100 + total * 2 + capIdx * 30;
    setMoney((m) => m + reward);

    const newUsb: UsbDrive = {
      id: Date.now(),
      type: usbType,
      capacity,
      color: caseColor,
      sticker,
      material,
      keychain,
      score: total,
      speed: Math.round(baseSpeed),
    };
    setCollection((c) => [newUsb, ...c]);
    setPhase("result");
  }, [capacity, defects, solderScore, alignScore, keychain, usbType, caseColor, sticker, material]);

  const unlockMaterial = useCallback(
    (mat: (typeof MATERIALS)[number]) => {
      if (money < mat.cost || unlockedMaterials.includes(mat.name)) return;
      setMoney((m) => m - mat.cost);
      setUnlockedMaterials((u) => [...u, mat.name]);
    },
    [money, unlockedMaterials]
  );

  // ─── USB visual ───────────────────────────────────────────────
  const renderUsbPreview = (
    type: UsbType,
    color: string,
    stickerEmoji: string,
    mat: string,
    hasKeychain: boolean,
    size: number = 1
  ) => {
    const w = 80 * size;
    const h = 40 * size;
    const borderColor =
      mat === "금도금"
        ? "#fbbf24"
        : mat === "크리스탈"
        ? "#67e8f9"
        : mat === "LED"
        ? "#a78bfa"
        : "#6b7280";
    const glow =
      mat === "LED"
        ? "0 0 12px #a78bfa, 0 0 24px #7c3aed"
        : mat === "크리스탈"
        ? "0 0 8px #67e8f9"
        : mat === "금도금"
        ? "0 0 8px #fbbf24"
        : "none";

    return (
      <div className="flex items-center justify-center" style={{ transform: `scale(${size})` }}>
        {/* Keychain hole */}
        {hasKeychain && (
          <div
            className="rounded-full border-2 mr-1"
            style={{
              width: 12,
              height: 12,
              borderColor,
            }}
          />
        )}
        {/* Body */}
        <div
          className="rounded-lg flex items-center justify-center relative"
          style={{
            width: w,
            height: h,
            backgroundColor: color,
            border: `2px solid ${borderColor}`,
            boxShadow: glow,
          }}
        >
          {stickerEmoji && <span className="text-xl">{stickerEmoji}</span>}
          {mat === "LED" && (
            <div
              className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#a78bfa" }}
            />
          )}
          {mat === "가죽" && (
            <div
              className="absolute inset-0 rounded-lg opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)",
              }}
            />
          )}
        </div>
        {/* Connector */}
        <div
          className="rounded-r"
          style={{
            width: 20,
            height: type === "USB-A" ? 18 : type === "USB-C" ? 10 : type === "Micro USB" ? 8 : 6,
            backgroundColor:
              type === "Lightning" ? "#e5e7eb" : type === "USB-C" ? "#d1d5db" : "#9ca3af",
            border: "1px solid #6b7280",
          }}
        />
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 text-white">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-blue-900/50">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
          ← 홈으로
        </Link>
        <h1 className="text-lg font-bold text-blue-300">🔌 USB 만들기</h1>
        <div className="text-yellow-400 text-sm font-bold">💰 {money}원</div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* ─── MENU ──────────────────────────────────────── */}
        {phase === "menu" && (
          <div className="text-center space-y-6 pt-8">
            <div className="text-6xl mb-4 animate-bounce">🔌</div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              USB 공장
            </h2>
            <p className="text-blue-300/80 text-sm">
              나만의 USB 드라이브를 설계하고 제작하세요!
            </p>
            <div className="space-y-3 pt-4">
              <button
                onClick={startNewUsb}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30"
              >
                🏭 USB 제작 시작
              </button>
              <button
                onClick={() => setPhase("gallery")}
                className="w-full py-3 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700/50 rounded-xl font-bold transition-all"
              >
                📦 USB 컬렉션 ({collection.length})
              </button>
            </div>
            {/* Material unlock shop */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-blue-800/30">
              <h3 className="text-sm font-bold text-blue-300 mb-3">🔓 재료 잠금해제</h3>
              <div className="grid grid-cols-2 gap-2">
                {MATERIALS.filter((m) => m.name !== "플라스틱").map((mat) => {
                  const owned = unlockedMaterials.includes(mat.name);
                  return (
                    <button
                      key={mat.name}
                      onClick={() => !owned && unlockMaterial(mat)}
                      disabled={owned || money < mat.cost}
                      className={`p-2 rounded-lg text-xs font-bold transition-all ${
                        owned
                          ? "bg-green-900/40 border border-green-700/50 text-green-400"
                          : money >= mat.cost
                          ? "bg-blue-900/40 border border-blue-600/50 hover:bg-blue-800/50 text-blue-300"
                          : "bg-gray-800/40 border border-gray-700/50 text-gray-500"
                      }`}
                    >
                      <div>{mat.label}</div>
                      <div>{owned ? "보유중" : `${mat.cost}원`}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── SELECT TYPE ───────────────────────────────── */}
        {phase === "selectType" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">USB 타입 선택</h2>
            <div className="grid grid-cols-2 gap-3">
              {USB_TYPES.map((u) => (
                <button
                  key={u.type}
                  onClick={() => selectType(u.type)}
                  className="p-4 bg-gray-800/60 border border-blue-700/40 rounded-xl hover:bg-blue-900/50 hover:border-blue-500/60 transition-all group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                    {u.emoji}
                  </div>
                  <div className="font-bold text-sm">{u.type}</div>
                  <div className="text-xs text-blue-400/70 mt-1">{u.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("menu")}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300"
            >
              ← 돌아가기
            </button>
          </div>
        )}

        {/* ─── SELECT CAPACITY ───────────────────────────── */}
        {phase === "selectCapacity" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">용량 선택</h2>
            <p className="text-center text-sm text-blue-400/70">선택한 타입: {usbType}</p>
            <div className="grid grid-cols-2 gap-2">
              {CAPACITIES.map((c) => (
                <button
                  key={c.cap}
                  onClick={() => selectCapacity(c.cap, c.price)}
                  disabled={money < c.price}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    money >= c.price
                      ? "bg-gray-800/60 border-blue-700/40 hover:bg-blue-900/50 hover:border-blue-500/60"
                      : "bg-gray-900/40 border-gray-700/30 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <div className="font-bold text-lg">{c.cap}</div>
                  <div className="text-xs mt-1">
                    {c.price === 0 ? (
                      <span className="text-green-400">무료</span>
                    ) : (
                      <span className={money >= c.price ? "text-yellow-400" : "text-gray-600"}>
                        {c.price}원
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase("selectType")}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300"
            >
              ← 돌아가기
            </button>
          </div>
        )}

        {/* ─── SOLDERING ─────────────────────────────────── */}
        {phase === "soldering" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">🔧 칩 납땜하기</h2>
            <p className="text-center text-sm text-blue-400/70">
              순서대로 점을 클릭하세요! (점 {nextDot + 1}/{solderDots.length})
            </p>
            <div className="relative bg-green-950/60 rounded-xl border border-green-700/40 overflow-hidden" style={{ height: 220 }}>
              {/* PCB pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-20">
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={`h${i}`}
                    x1="0"
                    y1={i * 28}
                    x2="100%"
                    y2={i * 28}
                    stroke="#22c55e"
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * 28}
                    y1="0"
                    x2={i * 28}
                    y2="100%"
                    stroke="#22c55e"
                    strokeWidth="0.5"
                  />
                ))}
              </svg>

              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full">
                {solderDots.map((dot, i) => {
                  if (i === 0 || !dot.done) return null;
                  const prev = solderDots[i - 1];
                  return (
                    <line
                      key={`line-${i}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={dot.x}
                      y2={dot.y}
                      stroke="#fbbf24"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  );
                })}
              </svg>

              {/* Dots */}
              {solderDots.map((dot) => (
                <button
                  key={dot.id}
                  onClick={() => handleSolderClick(dot.id)}
                  className={`absolute w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    dot.done
                      ? "bg-yellow-500 border-yellow-400 scale-90"
                      : dot.id === nextDot
                      ? "bg-blue-500/80 border-blue-400 animate-pulse scale-110 cursor-pointer"
                      : "bg-gray-600/60 border-gray-500/60"
                  }`}
                  style={{
                    left: dot.x - 14,
                    top: dot.y - 14,
                    boxShadow: dot.id === nextDot ? "0 0 12px #3b82f6" : "none",
                  }}
                >
                  {dot.id + 1}
                </button>
              ))}
            </div>
            <div className="text-center text-yellow-400 text-sm">점수: {solderScore}</div>
          </div>
        )}

        {/* ─── CASE ASSEMBLY ─────────────────────────────── */}
        {phase === "caseAssembly" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">📦 케이스 조립</h2>
            <p className="text-center text-sm text-blue-400/70">부품을 올바른 위치로 드래그하세요!</p>
            <div
              ref={assemblyRef}
              className="relative bg-gray-800/60 rounded-xl border border-blue-700/40 overflow-hidden touch-none"
              style={{ height: 260 }}
              onPointerMove={handleAssemblyPointerMove}
              onPointerUp={handleAssemblyPointerUp}
              onPointerLeave={handleAssemblyPointerUp}
            >
              {/* Target zones */}
              {assemblyParts.map((p) => (
                <div
                  key={`target-${p.id}`}
                  className="absolute border-2 border-dashed border-blue-500/40 rounded-lg flex items-center justify-center"
                  style={{
                    left: p.targetX - 20,
                    top: p.targetY - 20,
                    width: 40,
                    height: 40,
                  }}
                >
                  <span className="text-xs text-blue-500/50">{p.name}</span>
                </div>
              ))}
              {/* Parts */}
              {assemblyParts.map((p) => (
                <div
                  key={`part-${p.id}`}
                  onPointerDown={(e) => handleAssemblyPointerDown(e, p.id)}
                  className={`absolute flex flex-col items-center justify-center rounded-lg cursor-grab active:cursor-grabbing transition-shadow ${
                    p.placed
                      ? "bg-green-600/60 border border-green-400/60"
                      : "bg-blue-700/60 border border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/30"
                  }`}
                  style={{
                    left: p.currentX - 20,
                    top: p.currentY - 20,
                    width: 40,
                    height: 40,
                    zIndex: draggingPart === p.id ? 10 : 1,
                  }}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-[8px] leading-tight">{p.name}</span>
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-blue-400">
              배치 완료: {assemblyParts.filter((p) => p.placed).length}/{assemblyParts.length}
            </div>
          </div>
        )}

        {/* ─── CONNECTOR ALIGNMENT ───────────────────────── */}
        {phase === "connectorAlign" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">🔌 커넥터 장착</h2>
            <p className="text-center text-sm text-blue-400/70">
              {alignMoving ? "가운데에 맞춰서 터치!" : `정확도: ${alignScore}점`}
            </p>
            <div className="relative bg-gray-800/60 rounded-xl border border-blue-700/40 p-6">
              {/* Track */}
              <div className="relative h-16 bg-gray-700/60 rounded-full overflow-hidden">
                {/* Target zone */}
                <div
                  className="absolute top-0 h-full bg-green-500/20 border-x-2 border-green-400/50"
                  style={{ left: "40%", width: "20%" }}
                />
                {/* Center line */}
                <div className="absolute top-0 left-1/2 h-full w-0.5 bg-green-400/80" />
                {/* Moving indicator */}
                <div
                  className="absolute top-1 h-14 w-6 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 transition-none"
                  style={{
                    left: `calc(${alignPos}% - 12px)`,
                    boxShadow: !alignMoving
                      ? alignScore > 80
                        ? "0 0 20px #22c55e"
                        : alignScore > 50
                        ? "0 0 20px #eab308"
                        : "0 0 20px #ef4444"
                      : "0 0 12px #3b82f6",
                  }}
                />
              </div>
              {alignMoving && (
                <button
                  onClick={handleAlignStop}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg transition-all animate-pulse"
                >
                  ⚡ 지금 장착!
                </button>
              )}
              {!alignMoving && (
                <div className="mt-4 text-center">
                  <div
                    className={`text-2xl font-bold ${
                      alignScore > 80 ? "text-green-400" : alignScore > 50 ? "text-yellow-400" : "text-red-400"
                    }`}
                  >
                    {alignScore > 80 ? "완벽! 🎯" : alignScore > 50 ? "괜찮아요! 👍" : "아쉬워요! 😅"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── QUALITY CHECK ─────────────────────────────── */}
        {phase === "qualityCheck" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">🔍 품질 검사</h2>
            <div className="flex justify-between text-sm">
              <span className="text-blue-400">불량 찾기!</span>
              <span className={`font-bold ${qcTimeLeft <= 3 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
                ⏱ {qcTimeLeft}초
              </span>
            </div>
            <div
              className="relative bg-gray-800/60 rounded-xl border border-blue-700/40 overflow-hidden"
              style={{ height: 200 }}
            >
              {/* USB outline */}
              <div className="absolute inset-4 border-2 border-blue-500/30 rounded-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl opacity-20">
                🔌
              </div>
              {/* Defects */}
              {defects.map((d) => (
                <button
                  key={d.id}
                  onClick={() => !qcDone && handleFindDefect(d.id)}
                  className={`absolute transition-all ${
                    d.found
                      ? "w-8 h-8 rounded-full border-2 border-green-400 bg-green-500/20"
                      : qcDone
                      ? "w-4 h-4 rounded-full bg-red-500/80 animate-pulse"
                      : "w-4 h-4 rounded-full bg-red-400/40 hover:bg-red-400/70 cursor-pointer"
                  }`}
                  style={{
                    left: d.x,
                    top: d.y,
                    transform: d.found ? "translate(-50%, -50%) scale(1.2)" : "translate(-50%, -50%)",
                  }}
                >
                  {d.found && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-blue-400">
              발견: {defects.filter((d) => d.found).length}/{defects.length}
            </div>
            {(qcDone || defects.every((d) => d.found)) && (
              <button
                onClick={goToCustomize}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold transition-all"
              >
                다음 단계 →
              </button>
            )}
          </div>
        )}

        {/* ─── CUSTOMIZE ─────────────────────────────────── */}
        {phase === "customize" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">🎨 커스터마이징</h2>

            {/* Preview */}
            <div className="flex justify-center py-4 bg-gray-800/40 rounded-xl border border-blue-800/30">
              {renderUsbPreview(usbType, caseColor, sticker, material, keychain, 1.5)}
            </div>

            {/* Color */}
            <div>
              <h3 className="text-sm font-bold text-blue-300 mb-2">케이스 색상</h3>
              <div className="flex gap-2 flex-wrap">
                {CASE_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCaseColor(c.value)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      caseColor === c.value ? "border-blue-400 scale-110 shadow-lg" : "border-gray-600"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Sticker */}
            <div>
              <h3 className="text-sm font-bold text-blue-300 mb-2">스티커/디자인</h3>
              <div className="flex gap-2 flex-wrap">
                {STICKERS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSticker(s.emoji)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      sticker === s.emoji
                        ? "border-blue-400 bg-blue-900/50 scale-110"
                        : "border-gray-600 bg-gray-800/50"
                    }`}
                  >
                    {s.emoji || "✕"}
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div>
              <h3 className="text-sm font-bold text-blue-300 mb-2">재료</h3>
              <div className="flex gap-2 flex-wrap">
                {MATERIALS.filter((m) => unlockedMaterials.includes(m.name)).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setMaterial(m.name)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      material === m.name
                        ? "border-blue-400 bg-blue-900/50 text-blue-300"
                        : "border-gray-600 bg-gray-800/50 text-gray-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keychain */}
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-blue-300">열쇠고리 구멍</h3>
              <button
                onClick={() => setKeychain(!keychain)}
                className={`w-12 h-6 rounded-full transition-all ${
                  keychain ? "bg-blue-500" : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    keychain ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={startTesting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg transition-all"
            >
              🧪 테스트 시작
            </button>
          </div>
        )}

        {/* ─── TESTING ───────────────────────────────────── */}
        {phase === "testing" && (
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold text-center text-blue-300">🧪 USB 테스트</h2>

            <div className="flex justify-center py-4">
              {renderUsbPreview(usbType, caseColor, sticker, material, keychain)}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">포맷 및 테스트 중...</span>
                <span className="text-cyan-400 font-mono">{Math.round(testProgress)}%</span>
              </div>
              <div className="h-4 bg-gray-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-100"
                  style={{ width: `${testProgress}%` }}
                />
              </div>
            </div>

            {/* Speed */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-xl p-3 border border-blue-800/30 text-center">
                <div className="text-xs text-blue-400 mb-1">읽기 속도</div>
                <div className="text-xl font-bold font-mono text-cyan-300">
                  {testDone ? testSpeed : Math.floor(Math.random() * 300 + 50)} <span className="text-xs">MB/s</span>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 border border-blue-800/30 text-center">
                <div className="text-xs text-blue-400 mb-1">쓰기 속도</div>
                <div className="text-xl font-bold font-mono text-cyan-300">
                  {testDone ? Math.round(testSpeed * 0.7) : Math.floor(Math.random() * 200 + 30)}{" "}
                  <span className="text-xs">MB/s</span>
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div className="bg-gray-800/50 rounded-xl p-3 border border-blue-800/30 text-center">
              <div className="text-xs text-blue-400 mb-1">용량 확인</div>
              <div className="text-2xl font-bold text-green-400">{capacity}</div>
              <div className="text-xs text-green-500 mt-1">✓ 정상</div>
            </div>

            {testDone && (
              <button
                onClick={finishUsb}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-500/20"
              >
                ✅ 제작 완료!
              </button>
            )}
          </div>
        )}

        {/* ─── RESULT ────────────────────────────────────── */}
        {phase === "result" && (
          <div className="space-y-6 pt-4 text-center">
            <h2 className="text-2xl font-bold text-green-400">🎉 USB 완성!</h2>

            <div className="flex justify-center py-6">
              {renderUsbPreview(usbType, caseColor, sticker, material, keychain, 2)}
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-blue-800/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">타입</span>
                <span className="font-bold">{usbType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">용량</span>
                <span className="font-bold">{capacity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">재료</span>
                <span className="font-bold">{material}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">납땜 점수</span>
                <span className="font-bold text-yellow-400">{solderScore}점</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">커넥터 정확도</span>
                <span className="font-bold text-cyan-400">{alignScore}점</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">품질 검사</span>
                <span className="font-bold text-green-400">
                  {defects.filter((d) => d.found).length}/{defects.length} 발견
                </span>
              </div>
              <div className="border-t border-blue-800/30 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-blue-300 font-bold">총 점수</span>
                  <span className="text-xl font-bold text-yellow-400">{finalScore}점</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/30 rounded-xl p-3 border border-yellow-700/30">
              <span className="text-yellow-400 text-sm">
                💰 보상금 지급 완료! (현재: {money}원)
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startNewUsb}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold transition-all"
              >
                🏭 새로 만들기
              </button>
              <button
                onClick={() => setPhase("menu")}
                className="flex-1 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl font-bold transition-all"
              >
                🏠 메뉴로
              </button>
            </div>
          </div>
        )}

        {/* ─── GALLERY ───────────────────────────────────── */}
        {phase === "gallery" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-300">📦 USB 컬렉션</h2>
            {collection.length === 0 ? (
              <div className="text-center py-12 text-blue-400/50">
                <div className="text-4xl mb-3">📭</div>
                <p>아직 만든 USB가 없어요!</p>
                <p className="text-sm mt-1">USB를 제작해보세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collection.map((usb, idx) => (
                  <div
                    key={usb.id}
                    className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 border border-blue-800/30"
                  >
                    <div className="text-sm text-blue-500/60 font-bold w-6">#{idx + 1}</div>
                    <div className="flex-shrink-0">
                      {renderUsbPreview(usb.type, usb.color, usb.sticker, usb.material, usb.keychain, 0.7)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">
                        {usb.type} {usb.capacity}
                      </div>
                      <div className="text-xs text-blue-400/70">
                        {usb.material} | {usb.speed}MB/s
                      </div>
                    </div>
                    <div className="text-yellow-400 font-bold text-sm">{usb.score}점</div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setPhase("menu")}
              className="w-full py-3 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700/50 rounded-xl font-bold transition-all"
            >
              ← 메뉴로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
