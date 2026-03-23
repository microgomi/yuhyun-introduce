"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type CarType = "sedan" | "suv" | "sports" | "truck" | "bus" | "racer";
type EngineType = "gasoline" | "diesel" | "electric" | "hybrid" | "hydrogen" | "rocket";
type PaintStyle = "normal" | "metallic" | "matte" | "pearl" | "carbon" | "rainbow";
type SpoilerType = "none" | "small" | "large" | "racing";
type BumperType = "normal" | "sports" | "offroad";
type WheelType = "steel" | "alloy" | "chrome" | "racing";
type StickerType = "none" | "fire" | "lightning" | "star" | "stripe" | "racingstripe";
type UndergrowType = "none" | "red" | "blue" | "green" | "rainbow";
type TintType = "clear" | "light" | "dark" | "mirror";

interface CarStats {
  speed: number;
  accel: number;
  handling: number;
  durability: number;
  efficiency: number;
  coolness: number;
}

interface BuiltCar {
  id: number;
  carType: CarType;
  engineType: EngineType;
  color: string;
  paintStyle: PaintStyle;
  spoiler: SpoilerType;
  bumper: BumperType;
  wheel: WheelType;
  sticker: StickerType;
  underglow: UndergrowType;
  tint: TintType;
  stats: CarStats;
  name: string;
  date: string;
}

type GamePhase = "menu" | "carType" | "engine" | "assembleEngine" | "weld" | "wheels" | "wiring" | "paint" | "customize" | "testDrive" | "garage" | "complete";

// ============================================================
// DATA
// ============================================================
const CAR_TYPES: { key: CarType; name: string; emoji: string; desc: string; statMod: Partial<CarStats> }[] = [
  { key: "sedan", name: "세단", emoji: "🚗", desc: "편안한 패밀리카", statMod: { handling: 15, efficiency: 10, durability: 5 } },
  { key: "suv", name: "SUV", emoji: "🚙", desc: "어디든 갈 수 있는 만능차", statMod: { durability: 20, handling: 5 } },
  { key: "sports", name: "스포츠카", emoji: "🏎️", desc: "빠르고 멋진 차", statMod: { speed: 20, accel: 15, coolness: 10 } },
  { key: "truck", name: "트럭", emoji: "🛻", desc: "힘이 세고 든든한 차", statMod: { durability: 25, speed: -5 } },
  { key: "bus", name: "버스", emoji: "🚌", desc: "많은 사람을 태울 수 있어요", statMod: { durability: 15, efficiency: -5, handling: -5 } },
  { key: "racer", name: "경주차", emoji: "🏁", desc: "경주장의 왕!", statMod: { speed: 25, accel: 20, coolness: 15, durability: -10 } },
];

const ENGINE_TYPES: { key: EngineType; name: string; emoji: string; stats: { speed: number; efficiency: number; power: number } }[] = [
  { key: "gasoline", name: "가솔린", emoji: "⛽", stats: { speed: 12, efficiency: 8, power: 14 } },
  { key: "diesel", name: "디젤", emoji: "🛢️", stats: { speed: 8, efficiency: 12, power: 18 } },
  { key: "electric", name: "전기", emoji: "⚡", stats: { speed: 15, efficiency: 20, power: 10 } },
  { key: "hybrid", name: "하이브리드", emoji: "🔋", stats: { speed: 10, efficiency: 18, power: 12 } },
  { key: "hydrogen", name: "수소", emoji: "💧", stats: { speed: 14, efficiency: 16, power: 14 } },
  { key: "rocket", name: "로켓", emoji: "🚀", stats: { speed: 25, efficiency: 2, power: 25 } },
];

const ENGINE_PARTS = ["피스톤", "크랭크축", "점화플러그", "캠축", "밸브", "실린더"];
const ENGINE_SLOTS = ["피스톤 슬롯", "크랭크축 슬롯", "점화플러그 슬롯", "캠축 슬롯", "밸브 슬롯", "실린더 슬롯"];

const WIRE_COLORS = [
  { color: "#ef4444", name: "빨강" },
  { color: "#3b82f6", name: "파랑" },
  { color: "#22c55e", name: "초록" },
  { color: "#eab308", name: "노랑" },
  { color: "#a855f7", name: "보라" },
];

const PAINT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7", "#ec4899", "#06b6d4", "#1e1e1e", "#f5f5f5", "#8b5cf6", "#14b8a6"];
const PAINT_STYLES: { key: PaintStyle; name: string }[] = [
  { key: "normal", name: "일반" },
  { key: "metallic", name: "메탈릭" },
  { key: "matte", name: "무광" },
  { key: "pearl", name: "펄" },
  { key: "carbon", name: "카본" },
  { key: "rainbow", name: "무지개" },
];

const SPOILERS: { key: SpoilerType; name: string }[] = [
  { key: "none", name: "없음" },
  { key: "small", name: "소형" },
  { key: "large", name: "대형" },
  { key: "racing", name: "레이싱" },
];

const BUMPERS: { key: BumperType; name: string }[] = [
  { key: "normal", name: "일반" },
  { key: "sports", name: "스포츠" },
  { key: "offroad", name: "오프로드" },
];

const WHEELS: { key: WheelType; name: string }[] = [
  { key: "steel", name: "스틸" },
  { key: "alloy", name: "알로이" },
  { key: "chrome", name: "크롬" },
  { key: "racing", name: "레이싱" },
];

const STICKERS: { key: StickerType; name: string; emoji: string }[] = [
  { key: "none", name: "없음", emoji: "" },
  { key: "fire", name: "불꽃", emoji: "🔥" },
  { key: "lightning", name: "번개", emoji: "⚡" },
  { key: "star", name: "별", emoji: "⭐" },
  { key: "stripe", name: "줄무늬", emoji: "〰️" },
  { key: "racingstripe", name: "레이싱", emoji: "🏁" },
];

const UNDERGLOWS: { key: UndergrowType; name: string }[] = [
  { key: "none", name: "없음" },
  { key: "red", name: "빨강" },
  { key: "blue", name: "파랑" },
  { key: "green", name: "초록" },
  { key: "rainbow", name: "무지개" },
];

const TINTS: { key: TintType; name: string }[] = [
  { key: "clear", name: "투명" },
  { key: "light", name: "연한" },
  { key: "dark", name: "진한" },
  { key: "mirror", name: "미러" },
];

// ============================================================
// HELPER: Compute Stats
// ============================================================
function computeStats(carType: CarType, engineType: EngineType, extras: { spoiler: SpoilerType; bumper: BumperType; wheel: WheelType; sticker: StickerType; underglow: UndergrowType; paintStyle: PaintStyle }): CarStats {
  const base: CarStats = { speed: 50, accel: 50, handling: 50, durability: 50, efficiency: 50, coolness: 50 };
  const ct = CAR_TYPES.find(c => c.key === carType)!;
  const eng = ENGINE_TYPES.find(e => e.key === engineType)!;
  Object.entries(ct.statMod).forEach(([k, v]) => { (base as any)[k] += v; });
  base.speed += eng.stats.speed;
  base.accel += eng.stats.power;
  base.efficiency += eng.stats.efficiency;
  if (extras.spoiler === "small") { base.speed += 3; base.handling += 5; base.coolness += 5; }
  if (extras.spoiler === "large") { base.speed += 5; base.handling += 8; base.coolness += 8; }
  if (extras.spoiler === "racing") { base.speed += 8; base.handling += 12; base.coolness += 12; }
  if (extras.bumper === "sports") { base.coolness += 5; base.speed += 3; }
  if (extras.bumper === "offroad") { base.durability += 8; base.coolness += 3; }
  if (extras.wheel === "alloy") { base.handling += 5; base.coolness += 3; }
  if (extras.wheel === "chrome") { base.coolness += 8; }
  if (extras.wheel === "racing") { base.speed += 5; base.handling += 8; base.coolness += 5; }
  if (extras.sticker !== "none") base.coolness += 5;
  if (extras.underglow !== "none") base.coolness += 8;
  if (extras.paintStyle === "metallic") base.coolness += 5;
  if (extras.paintStyle === "pearl") base.coolness += 7;
  if (extras.paintStyle === "carbon") { base.coolness += 10; base.speed += 3; }
  if (extras.paintStyle === "rainbow") base.coolness += 12;
  // clamp
  Object.keys(base).forEach(k => { (base as any)[k] = Math.max(0, Math.min(100, (base as any)[k])); });
  return base;
}

// ============================================================
// CAR SVG COMPONENT
// ============================================================
function CarVisual({ carType, color, paintStyle, spoiler, bumper, wheel, sticker, underglow, tint, size = 1, animate = false }: {
  carType: CarType; color: string; paintStyle: PaintStyle; spoiler: SpoilerType; bumper: BumperType; wheel: WheelType;
  sticker: StickerType; underglow: UndergrowType; tint: TintType; size?: number; animate?: boolean;
}) {
  const w = 280 * size;
  const h = 160 * size;

  const paintFilter = paintStyle === "metallic" ? "brightness(1.2) saturate(1.3)" :
    paintStyle === "matte" ? "brightness(0.85) saturate(0.8)" :
    paintStyle === "pearl" ? "brightness(1.15) saturate(1.1)" :
    paintStyle === "carbon" ? "brightness(0.7)" : "none";

  const bodyColor = paintStyle === "carbon" ? "#333" : paintStyle === "rainbow" ? undefined : color;

  const glowColor = underglow === "red" ? "#ef4444" : underglow === "blue" ? "#3b82f6" : underglow === "green" ? "#22c55e" : underglow === "rainbow" ? "#a855f7" : "transparent";

  const tintOpacity = tint === "clear" ? 0.15 : tint === "light" ? 0.35 : tint === "dark" ? 0.6 : 0.8;
  const tintColor = tint === "mirror" ? "#94a3b8" : "#1e293b";

  const wheelColor = wheel === "steel" ? "#6b7280" : wheel === "alloy" ? "#9ca3af" : wheel === "chrome" ? "#e5e7eb" : "#ef4444";
  const wheelRim = wheel === "racing" ? "#fbbf24" : wheel === "chrome" ? "#f9fafb" : "#4b5563";

  // Car body shapes by type
  const getBody = () => {
    const s = size;
    switch (carType) {
      case "sedan":
        return (
          <g>
            <path d={`M${40*s},${105*s} L${50*s},${65*s} L${90*s},${40*s} L${180*s},${35*s} L${220*s},${55*s} L${245*s},${70*s} L${250*s},${105*s} Z`} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <path d={`M${40*s},${105*s} L${50*s},${65*s} L${90*s},${40*s} L${180*s},${35*s} L${220*s},${55*s} L${245*s},${70*s} L${250*s},${105*s} Z`} fill="url(#rainbow)" />}
            <rect x={85*s} y={42*s} width={55*s} height={32*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
            <rect x={150*s} y={42*s} width={55*s} height={32*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
          </g>
        );
      case "suv":
        return (
          <g>
            <path d={`M${35*s},${105*s} L${40*s},${55*s} L${70*s},${30*s} L${200*s},${28*s} L${235*s},${45*s} L${250*s},${70*s} L${255*s},${105*s} Z`} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <path d={`M${35*s},${105*s} L${40*s},${55*s} L${70*s},${30*s} L${200*s},${28*s} L${235*s},${45*s} L${250*s},${70*s} L${255*s},${105*s} Z`} fill="url(#rainbow)" />}
            <rect x={75*s} y={33*s} width={50*s} height={35*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
            <rect x={135*s} y={33*s} width={50*s} height={35*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
          </g>
        );
      case "sports":
        return (
          <g>
            <path d={`M${30*s},${105*s} L${45*s},${72*s} L${100*s},${48*s} L${170*s},${42*s} L${230*s},${58*s} L${260*s},${80*s} L${260*s},${105*s} Z`} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <path d={`M${30*s},${105*s} L${45*s},${72*s} L${100*s},${48*s} L${170*s},${42*s} L${230*s},${58*s} L${260*s},${80*s} L${260*s},${105*s} Z`} fill="url(#rainbow)" />}
            <path d={`M${105*s},${50*s} L${165*s},${44*s} L${210*s},${58*s} L${210*s},${75*s} L${100*s},${75*s} Z`} fill={tintColor} opacity={tintOpacity} />
          </g>
        );
      case "truck":
        return (
          <g>
            <rect x={30*s} y={55*s} width={100*s} height={50*s} rx={5*s} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <rect x={30*s} y={55*s} width={100*s} height={50*s} rx={5*s} fill="url(#rainbow)" />}
            <rect x={130*s} y={70*s} width={120*s} height={35*s} rx={3*s} fill="#64748b" stroke="#475569" strokeWidth={2} />
            <path d={`M${35*s},${55*s} L${50*s},${30*s} L${120*s},${28*s} L${128*s},${55*s} Z`} fill={bodyColor} style={{ filter: paintFilter }} />
            <rect x={55*s} y={33*s} width={35*s} height={25*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
            <rect x={95*s} y={33*s} width={28*s} height={25*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
          </g>
        );
      case "bus":
        return (
          <g>
            <rect x={25*s} y={30*s} width={240*s} height={75*s} rx={8*s} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <rect x={25*s} y={30*s} width={240*s} height={75*s} rx={8*s} fill="url(#rainbow)" />}
            {[0,1,2,3,4].map(i => (
              <rect key={i} x={(40 + i * 45)*s} y={38*s} width={30*s} height={28*s} rx={3*s} fill={tintColor} opacity={tintOpacity} />
            ))}
          </g>
        );
      case "racer":
        return (
          <g>
            <path d={`M${20*s},${105*s} L${35*s},${78*s} L${80*s},${55*s} L${160*s},${48*s} L${240*s},${62*s} L${268*s},${85*s} L${268*s},${105*s} Z`} fill={bodyColor} style={{ filter: paintFilter }} />
            {paintStyle === "rainbow" && <path d={`M${20*s},${105*s} L${35*s},${78*s} L${80*s},${55*s} L${160*s},${48*s} L${240*s},${62*s} L${268*s},${85*s} L${268*s},${105*s} Z`} fill="url(#rainbow)" />}
            <path d={`M${90*s},${56*s} L${155*s},${50*s} L${200*s},${60*s} L${200*s},${72*s} L${85*s},${72*s} Z`} fill={tintColor} opacity={tintOpacity} />
            <rect x={15*s} y={88*s} width={25*s} height={8*s} rx={2*s} fill={bodyColor} style={{ filter: paintFilter }} />
            <rect x={248*s} y={88*s} width={25*s} height={8*s} rx={2*s} fill={bodyColor} style={{ filter: paintFilter }} />
          </g>
        );
    }
  };

  const getSpoiler = () => {
    const s = size;
    if (spoiler === "none") return null;
    const spoilerColor = bodyColor || color;
    if (spoiler === "small") return <rect x={35*s} y={52*s} width={18*s} height={5*s} rx={2*s} fill={spoilerColor} style={{ filter: paintFilter }} />;
    if (spoiler === "large") return (
      <g>
        <rect x={28*s} y={42*s} width={25*s} height={6*s} rx={2*s} fill={spoilerColor} style={{ filter: paintFilter }} />
        <rect x={36*s} y={48*s} width={3*s} height={15*s} fill={spoilerColor} style={{ filter: paintFilter }} />
        <rect x={46*s} y={48*s} width={3*s} height={15*s} fill={spoilerColor} style={{ filter: paintFilter }} />
      </g>
    );
    return (
      <g>
        <rect x={22*s} y={36*s} width={35*s} height={7*s} rx={3*s} fill={spoilerColor} style={{ filter: paintFilter }} />
        <rect x={30*s} y={43*s} width={4*s} height={18*s} fill="#555" />
        <rect x={48*s} y={43*s} width={4*s} height={18*s} fill="#555" />
        <circle cx={24*s} cy={39*s} r={2*s} fill="#ef4444" />
        <circle cx={55*s} cy={39*s} r={2*s} fill="#ef4444" />
      </g>
    );
  };

  const getBumper = () => {
    const s = size;
    if (bumper === "sports") return (
      <g>
        <rect x={248*s} y={85*s} width={15*s} height={20*s} rx={3*s} fill="#374151" />
        <rect x={253*s} y={88*s} width={8*s} height={4*s} rx={1*s} fill="#fbbf24" />
      </g>
    );
    if (bumper === "offroad") return (
      <g>
        <rect x={248*s} y={80*s} width={18*s} height={25*s} rx={2*s} fill="#57534e" />
        <rect x={250*s} y={82*s} width={3*s} height={21*s} fill="#78716c" />
        <rect x={256*s} y={82*s} width={3*s} height={21*s} fill="#78716c" />
        <rect x={262*s} y={82*s} width={3*s} height={21*s} fill="#78716c" />
      </g>
    );
    return <rect x={248*s} y={90*s} width={10*s} height={15*s} rx={3*s} fill="#4b5563" />;
  };

  const getStickerDecal = () => {
    const s = size;
    const cx = 150 * s;
    const cy = 80 * s;
    const fs = 20 * s;
    if (sticker === "fire") return <text x={cx} y={cy} fontSize={fs} textAnchor="middle">🔥</text>;
    if (sticker === "lightning") return <text x={cx} y={cy} fontSize={fs} textAnchor="middle">⚡</text>;
    if (sticker === "star") return <text x={cx} y={cy} fontSize={fs} textAnchor="middle">⭐</text>;
    if (sticker === "stripe") return (
      <g>
        {[0,1,2].map(i => <line key={i} x1={60*s} y1={(75+i*8)*s} x2={230*s} y2={(75+i*8)*s} stroke="white" strokeWidth={1.5} opacity={0.4} />)}
      </g>
    );
    if (sticker === "racingstripe") return (
      <g>
        <line x1={50*s} y1={70*s} x2={250*s} y2={70*s} stroke="white" strokeWidth={4*s} opacity={0.5} />
        <line x1={50*s} y1={90*s} x2={250*s} y2={90*s} stroke="white" strokeWidth={4*s} opacity={0.5} />
      </g>
    );
    return null;
  };

  return (
    <div className="relative inline-block" style={{ width: w, height: h + 20 * size }}>
      <svg width={w} height={h + 20 * size} viewBox={`0 0 ${w} ${h + 20 * size}`}>
        <defs>
          <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="20%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="80%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          {underglow !== "none" && (
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>
        {/* Underglow */}
        {underglow !== "none" && (
          <ellipse cx={w / 2} cy={120 * size} rx={110 * size} ry={12 * size}
            fill={underglow === "rainbow" ? "url(#rainbow)" : glowColor} opacity={0.5} filter="url(#glow)">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
          </ellipse>
        )}
        {/* Headlights */}
        <circle cx={255 * size} cy={88 * size} r={5 * size} fill="#fbbf24" opacity={0.9} />
        <circle cx={255 * size} cy={88 * size} r={8 * size} fill="#fbbf24" opacity={0.2} />
        {/* Tail light */}
        <circle cx={33 * size} cy={88 * size} r={4 * size} fill="#ef4444" opacity={0.9} />
        {/* Body */}
        {getBody()}
        {getStickerDecal()}
        {getSpoiler()}
        {getBumper()}
        {/* Wheels */}
        {[75, 210].map((wx, i) => (
          <g key={i}>
            <circle cx={wx * size} cy={112 * size} r={16 * size} fill="#1e1e1e" />
            <circle cx={wx * size} cy={112 * size} r={12 * size} fill={wheelColor} />
            <circle cx={wx * size} cy={112 * size} r={7 * size} fill={wheelRim} />
            <circle cx={wx * size} cy={112 * size} r={3 * size} fill="#374151" />
            {animate && (
              <g>
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line key={angle} x1={wx * size} y1={112 * size}
                    x2={wx * size + Math.cos(angle * Math.PI / 180) * 10 * size}
                    y2={112 * size + Math.sin(angle * Math.PI / 180) * 10 * size}
                    stroke="#555" strokeWidth={1}>
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${wx * size} ${112 * size}`} to={`360 ${wx * size} ${112 * size}`} dur="0.5s" repeatCount="indefinite" />
                  </line>
                ))}
              </g>
            )}
          </g>
        ))}
        {/* Ground line */}
        <line x1={0} y1={(128) * size} x2={w} y2={(128) * size} stroke="#374151" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ============================================================
// STAT BAR
// ============================================================
function StatBar({ label, value, icon }: { label: string; value: number; icon: string }) {
  const barColor = value > 80 ? "bg-green-400" : value > 60 ? "bg-blue-400" : value > 40 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-center">{icon}</span>
      <span className="w-16 text-gray-300">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-gray-400 font-mono text-xs">{value}</span>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CarMakerPage() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [carType, setCarType] = useState<CarType>("sedan");
  const [engineType, setEngineType] = useState<EngineType>("gasoline");
  const [color, setColor] = useState("#3b82f6");
  const [paintStyle, setPaintStyle] = useState<PaintStyle>("normal");
  const [spoiler, setSpoiler] = useState<SpoilerType>("none");
  const [bumper, setBumper] = useState<BumperType>("normal");
  const [wheel, setWheel] = useState<WheelType>("steel");
  const [sticker, setSticker] = useState<StickerType>("none");
  const [underglow, setUnderglow] = useState<UndergrowType>("none");
  const [tint, setTint] = useState<TintType>("clear");
  const [garage, setGarage] = useState<BuiltCar[]>([]);
  const [carName, setCarName] = useState("");

  // Assembly minigame states
  const [engineSlots, setEngineSlots] = useState<(string | null)[]>(Array(6).fill(null));
  const [dragPart, setDragPart] = useState<string | null>(null);
  const [availableParts, setAvailableParts] = useState<string[]>([]);

  // Weld
  const [weldDots, setWeldDots] = useState<{ x: number; y: number; done: boolean }[]>([]);
  const [weldIdx, setWeldIdx] = useState(0);
  const [weldSparks, setWeldSparks] = useState<{ x: number; y: number; id: number }[]>([]);

  // Wheels
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelTaps, setWheelTaps] = useState(0);
  const [wheelAligned, setWheelAligned] = useState(false);
  const [wheelsDone, setWheelsDone] = useState(false);

  // Wiring
  const [wireConnections, setWireConnections] = useState<(number | null)[]>(Array(5).fill(null));
  const [selectedWire, setSelectedWire] = useState<number | null>(null);
  const [shuffledTargets, setShuffledTargets] = useState<number[]>([]);

  // Paint
  const [paintProgress, setPaintProgress] = useState(0);
  const [isPainting, setIsPainting] = useState(false);

  // Test drive
  const [drivePos, setDrivePos] = useState(1); // 0=left, 1=center, 2=right
  const [driveDistance, setDriveDistance] = useState(0);
  const [driveSpeed, setDriveSpeed] = useState(0);
  const [obstacles, setObstacles] = useState<{ lane: number; y: number; type: string }[]>([]);
  const [driveActive, setDriveActive] = useState(false);
  const [driveScore, setDriveScore] = useState(0);
  const [driveCrash, setDriveCrash] = useState(false);
  const driveRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Assembler completion tracking
  const [assemblyBonus, setAssemblyBonus] = useState(0);

  const currentStats = computeStats(carType, engineType, { spoiler, bumper, wheel, sticker, underglow, paintStyle });

  // ---- INIT FUNCTIONS ----
  const initEngineAssembly = () => {
    const shuffled = [...ENGINE_PARTS].sort(() => Math.random() - 0.5);
    setAvailableParts(shuffled);
    setEngineSlots(Array(6).fill(null));
    setDragPart(null);
  };

  const initWeld = () => {
    const dots: { x: number; y: number; done: boolean }[] = [];
    for (let i = 0; i < 8; i++) {
      dots.push({ x: 40 + (i % 4) * 70, y: 60 + Math.floor(i / 4) * 80, done: false });
    }
    setWeldDots(dots);
    setWeldIdx(0);
    setWeldSparks([]);
  };

  const initWheels = () => {
    setWheelAngle(Math.floor(Math.random() * 300) + 30);
    setWheelTaps(0);
    setWheelAligned(false);
    setWheelsDone(false);
  };

  const initWiring = () => {
    const targets = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
    setShuffledTargets(targets);
    setWireConnections(Array(5).fill(null));
    setSelectedWire(null);
  };

  const initPaint = () => {
    setPaintProgress(0);
    setIsPainting(false);
  };

  const initTestDrive = () => {
    setDrivePos(1);
    setDriveDistance(0);
    setDriveSpeed(0);
    setObstacles([]);
    setDriveActive(true);
    setDriveScore(0);
    setDriveCrash(false);
  };

  // ---- TEST DRIVE LOOP ----
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setDriveSpeed(prev => Math.min(prev + dt * 20, currentStats.speed * 3 + 50));
    setDriveDistance(prev => prev + dt * 50);
    setDriveScore(prev => prev + dt * 10);

    setObstacles(prev => {
      let next = prev.map(o => ({ ...o, y: o.y + dt * 300 })).filter(o => o.y < 500);
      if (Math.random() < dt * 1.5) {
        const types = ["🚧", "🪨", "🕳️", "🛢️", "🚨"];
        next.push({ lane: Math.floor(Math.random() * 3), y: -40, type: types[Math.floor(Math.random() * types.length)] });
      }
      return next;
    });

    driveRef.current = requestAnimationFrame(gameLoop);
  }, [currentStats.speed]);

  useEffect(() => {
    if (driveActive && !driveCrash) {
      lastTimeRef.current = 0;
      driveRef.current = requestAnimationFrame(gameLoop);
      return () => { if (driveRef.current) cancelAnimationFrame(driveRef.current); };
    }
  }, [driveActive, driveCrash, gameLoop]);

  // Collision check
  useEffect(() => {
    if (!driveActive || driveCrash) return;
    for (const o of obstacles) {
      if (o.lane === drivePos && o.y > 320 && o.y < 400) {
        setDriveCrash(true);
        setDriveActive(false);
        if (driveRef.current) cancelAnimationFrame(driveRef.current);
        break;
      }
    }
  }, [obstacles, drivePos, driveActive, driveCrash]);

  // Key controls for test drive
  useEffect(() => {
    if (phase !== "testDrive" || !driveActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") setDrivePos(p => Math.max(0, p - 1));
      if (e.key === "ArrowRight" || e.key === "d") setDrivePos(p => Math.min(2, p + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, driveActive]);

  // Load garage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("carmaker_garage");
      if (saved) setGarage(JSON.parse(saved));
    } catch {}
  }, []);

  const saveToGarage = () => {
    const car: BuiltCar = {
      id: Date.now(),
      carType, engineType, color, paintStyle, spoiler, bumper, wheel, sticker, underglow, tint,
      stats: currentStats,
      name: carName || `내 ${CAR_TYPES.find(c => c.key === carType)!.name}`,
      date: new Date().toLocaleDateString("ko-KR"),
    };
    const updated = [...garage, car];
    setGarage(updated);
    try { localStorage.setItem("carmaker_garage", JSON.stringify(updated)); } catch {}
  };

  const resetBuild = () => {
    setCarType("sedan");
    setEngineType("gasoline");
    setColor("#3b82f6");
    setPaintStyle("normal");
    setSpoiler("none");
    setBumper("normal");
    setWheel("steel");
    setSticker("none");
    setUnderglow("none");
    setTint("clear");
    setCarName("");
    setAssemblyBonus(0);
  };

  // ============================================================
  // RENDER
  // ============================================================

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <span className="text-xl">←</span>
        <span>홈으로</span>
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">
        🚗 자동차 만들기
      </h1>
      <div className="w-20" />
    </div>
  );

  const renderMenu = () => (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🚗</div>
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-2">
          자동차 만들기
        </h2>
        <p className="text-gray-400 text-lg">나만의 드림카를 만들어보자!</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button onClick={() => { resetBuild(); setPhase("carType"); }}
          className="py-4 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-bold text-xl hover:scale-105 transition-transform shadow-lg shadow-blue-600/30">
          🔧 새 차 만들기
        </button>
        <button onClick={() => setPhase("garage")}
          className="py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-xl hover:scale-105 transition-transform shadow-lg shadow-purple-600/30">
          🏠 차고 ({garage.length}대)
        </button>
      </div>
      {/* Animated cars */}
      <div className="relative w-full h-32 overflow-hidden mt-4">
        <div className="absolute animate-[slideRight_6s_linear_infinite]" style={{ top: 20 }}>
          <span className="text-4xl">🏎️</span>
        </div>
        <div className="absolute animate-[slideRight_8s_linear_infinite]" style={{ top: 60, animationDelay: "2s" }}>
          <span className="text-4xl">🚙</span>
        </div>
        <div className="absolute animate-[slideRight_5s_linear_infinite]" style={{ top: 40, animationDelay: "4s" }}>
          <span className="text-4xl">🚗</span>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideRight {
          0% { left: -60px; }
          100% { left: calc(100% + 60px); }
        }
      `}</style>
    </div>
  );

  const renderCarType = () => (
    <div>
      <h2 className="text-2xl font-bold text-center text-cyan-300 mb-6">🚘 차종 선택</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {CAR_TYPES.map(ct => (
          <button key={ct.key} onClick={() => { setCarType(ct.key); setPhase("engine"); }}
            className={`p-5 rounded-xl border-2 transition-all hover:scale-105 ${
              carType === ct.key ? "border-cyan-400 bg-cyan-900/30 shadow-lg shadow-cyan-500/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
            }`}>
            <div className="text-4xl mb-2">{ct.emoji}</div>
            <div className="font-bold text-white text-lg">{ct.name}</div>
            <div className="text-gray-400 text-sm mt-1">{ct.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderEngine = () => (
    <div>
      <h2 className="text-2xl font-bold text-center text-orange-300 mb-6">⚙️ 엔진 선택</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
        {ENGINE_TYPES.map(eng => (
          <button key={eng.key} onClick={() => setEngineType(eng.key)}
            className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
              engineType === eng.key ? "border-orange-400 bg-orange-900/30 shadow-lg shadow-orange-500/20" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
            }`}>
            <div className="text-3xl mb-1">{eng.emoji}</div>
            <div className="font-bold text-white">{eng.name}</div>
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              <div>속도: {"⚡".repeat(Math.ceil(eng.stats.speed / 5))}</div>
              <div>연비: {"⛽".repeat(Math.ceil(eng.stats.efficiency / 5))}</div>
              <div>파워: {"💪".repeat(Math.ceil(eng.stats.power / 5))}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-4">
        <button onClick={() => setPhase("carType")} className="px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600">← 이전</button>
        <button onClick={() => { initEngineAssembly(); setPhase("assembleEngine"); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
          조립 시작! 🔧
        </button>
      </div>
    </div>
  );

  const renderEngineAssembly = () => {
    const allPlaced = engineSlots.every(s => s !== null);
    const correctCount = engineSlots.filter((s, i) => s === ENGINE_PARTS[i]).length;

    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-yellow-300 mb-2">🔧 엔진 조립</h2>
        <p className="text-center text-gray-400 mb-4">부품을 올바른 슬롯에 드래그하세요!</p>

        {/* Available parts */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {availableParts.map((part, i) => (
            <button key={i} draggable
              onDragStart={() => setDragPart(part)}
              onClick={() => setDragPart(dragPart === part ? null : part)}
              className={`px-4 py-2 rounded-lg font-bold text-sm cursor-grab active:cursor-grabbing transition-all ${
                dragPart === part ? "bg-yellow-500 text-black scale-110 ring-2 ring-yellow-300" : "bg-gray-700 text-white hover:bg-gray-600"
              }`}>
              🔩 {part}
            </button>
          ))}
        </div>

        {/* Slots */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
          {ENGINE_SLOTS.map((slot, i) => (
            <div key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragPart && !engineSlots[i]) {
                  const newSlots = [...engineSlots];
                  newSlots[i] = dragPart;
                  setEngineSlots(newSlots);
                  setAvailableParts(prev => prev.filter(p => p !== dragPart));
                  setDragPart(null);
                }
              }}
              onClick={() => {
                if (dragPart && !engineSlots[i]) {
                  const newSlots = [...engineSlots];
                  newSlots[i] = dragPart;
                  setEngineSlots(newSlots);
                  setAvailableParts(prev => prev.filter(p => p !== dragPart));
                  setDragPart(null);
                } else if (engineSlots[i]) {
                  setAvailableParts(prev => [...prev, engineSlots[i]!]);
                  const newSlots = [...engineSlots];
                  newSlots[i] = null;
                  setEngineSlots(newSlots);
                }
              }}
              className={`p-3 rounded-lg border-2 border-dashed text-center min-h-[60px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                engineSlots[i] ? (engineSlots[i] === ENGINE_PARTS[i] ? "border-green-400 bg-green-900/30" : "border-red-400 bg-red-900/20") : "border-gray-600 bg-gray-800/50 hover:border-yellow-500"
              }`}>
              <div className="text-xs text-gray-500 mb-1">{slot}</div>
              {engineSlots[i] && <div className="text-sm font-bold text-white">🔩 {engineSlots[i]}</div>}
              {engineSlots[i] && <div className="text-xs mt-1">{engineSlots[i] === ENGINE_PARTS[i] ? "✅" : "❌"}</div>}
            </div>
          ))}
        </div>

        {allPlaced && (
          <div className="text-center">
            <p className="text-lg mb-3">{correctCount === 6 ? "🎉 완벽한 조립!" : `${correctCount}/6 정확`}</p>
            <button onClick={() => { setAssemblyBonus(correctCount * 2); initWeld(); setPhase("weld"); }}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
              다음 단계 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWeld = () => {
    const allDone = weldDots.every(d => d.done);
    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-orange-300 mb-2">🔥 차체 용접</h2>
        <p className="text-center text-gray-400 mb-4">점을 순서대로 터치하여 용접하세요!</p>
        <div className="relative bg-gray-800/70 rounded-xl mx-auto" style={{ width: 320, height: 240 }}>
          {/* Connection lines */}
          <svg className="absolute inset-0" width={320} height={240}>
            {weldDots.map((dot, i) => {
              if (i === 0 || !weldDots[i - 1].done) return null;
              const prev = weldDots[i - 1];
              return <line key={i} x1={prev.x} y1={prev.y} x2={dot.x} y2={dot.y}
                stroke={dot.done ? "#f97316" : "#374151"} strokeWidth={dot.done ? 3 : 1} strokeDasharray={dot.done ? "none" : "4"} />;
            })}
          </svg>
          {/* Dots */}
          {weldDots.map((dot, i) => (
            <button key={i}
              onClick={() => {
                if (i === weldIdx) {
                  const newDots = [...weldDots];
                  newDots[i] = { ...newDots[i], done: true };
                  setWeldDots(newDots);
                  setWeldIdx(weldIdx + 1);
                  setWeldSparks(prev => [...prev, { x: dot.x, y: dot.y, id: Date.now() }]);
                  setTimeout(() => setWeldSparks(prev => prev.filter(s => s.id !== Date.now())), 500);
                }
              }}
              className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${
                dot.done ? "bg-orange-500 border-orange-300 text-white scale-90" :
                i === weldIdx ? "bg-yellow-500/50 border-yellow-300 text-yellow-200 animate-pulse scale-110" :
                "bg-gray-700 border-gray-500 text-gray-400"
              }`}
              style={{ left: dot.x - 16, top: dot.y - 16 }}>
              {dot.done ? "✓" : i + 1}
            </button>
          ))}
          {/* Sparks */}
          {weldSparks.map(spark => (
            <div key={spark.id} className="absolute pointer-events-none" style={{ left: spark.x - 15, top: spark.y - 15 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping"
                  style={{
                    left: Math.cos(i * 60 * Math.PI / 180) * 12 + 12,
                    top: Math.sin(i * 60 * Math.PI / 180) * 12 + 12,
                    animationDuration: "0.4s",
                  }} />
              ))}
              <div className="absolute w-4 h-4 bg-white rounded-full left-2 top-2 animate-ping" style={{ animationDuration: "0.3s" }} />
            </div>
          ))}
        </div>
        {allDone && (
          <div className="text-center mt-4">
            <p className="text-lg text-green-400 mb-3">🎉 용접 완료!</p>
            <button onClick={() => { initWheels(); setPhase("wheels"); }}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
              다음 단계 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWheels = () => {
    const targetAngle = 0;
    const isAligned = Math.abs(wheelAngle % 360) < 15 || Math.abs(wheelAngle % 360) > 345;

    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-blue-300 mb-2">🔩 바퀴 장착</h2>
        {!wheelAligned ? (
          <>
            <p className="text-center text-gray-400 mb-4">바퀴를 돌려서 볼트 구멍을 맞추세요!</p>
            <div className="flex justify-center mb-4">
              <div className="relative w-48 h-48">
                {/* Wheel */}
                <div className="absolute inset-0 rounded-full bg-gray-800 border-4 border-gray-600 flex items-center justify-center"
                  style={{ transform: `rotate(${wheelAngle}deg)`, transition: "transform 0.1s" }}>
                  {[0, 72, 144, 216, 288].map(a => (
                    <div key={a} className="absolute w-4 h-4 rounded-full bg-gray-500 border border-gray-400"
                      style={{ top: `${50 - 35 * Math.cos(a * Math.PI / 180)}%`, left: `${50 + 35 * Math.sin(a * Math.PI / 180)}%`, transform: "translate(-50%,-50%)" }} />
                  ))}
                  <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-gray-500" />
                </div>
                {/* Target markers */}
                {[0, 72, 144, 216, 288].map(a => (
                  <div key={a} className="absolute w-5 h-5 rounded-full border-2 border-green-400/50"
                    style={{ top: `${50 - 35 * Math.cos(a * Math.PI / 180)}%`, left: `${50 + 35 * Math.sin(a * Math.PI / 180)}%`, transform: "translate(-50%,-50%)" }} />
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-4 mb-4">
              <button onClick={() => setWheelAngle(a => a - 15)}
                className="px-6 py-3 bg-blue-600 rounded-lg text-white font-bold text-xl hover:bg-blue-500">↺</button>
              <button onClick={() => setWheelAngle(a => a + 15)}
                className="px-6 py-3 bg-blue-600 rounded-lg text-white font-bold text-xl hover:bg-blue-500">↻</button>
            </div>
            {isAligned && (
              <div className="text-center">
                <p className="text-green-400 mb-2">✅ 볼트 구멍이 맞았어요!</p>
                <button onClick={() => setWheelAligned(true)}
                  className="px-6 py-2 bg-green-600 rounded-lg text-white font-bold hover:bg-green-500">고정하기!</button>
              </div>
            )}
          </>
        ) : !wheelsDone ? (
          <>
            <p className="text-center text-gray-400 mb-4">빠르게 터치하여 볼트를 조이세요! ({wheelTaps}/20)</p>
            <div className="flex justify-center mb-4">
              <button onClick={() => { setWheelTaps(t => { const next = t + 1; if (next >= 20) setWheelsDone(true); return next; }); }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50">
                🔧 조이기!
              </button>
            </div>
            <div className="max-w-xs mx-auto bg-gray-700 rounded-full h-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all" style={{ width: `${(wheelTaps / 20) * 100}%` }} />
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-2xl text-green-400 mb-4">🎉 바퀴 장착 완료!</p>
            <button onClick={() => { initWiring(); setPhase("wiring"); }}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
              다음 단계 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWiring = () => {
    const allConnected = wireConnections.every((c, i) => c === i);

    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-green-300 mb-2">🔌 배선 연결</h2>
        <p className="text-center text-gray-400 mb-4">같은 색상의 선을 연결하세요!</p>
        <div className="flex justify-center gap-8 md:gap-16 mb-6">
          {/* Left side - source wires */}
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-500 text-center mb-1">배터리 🔋</div>
            {WIRE_COLORS.map((wire, i) => (
              <button key={i} onClick={() => setSelectedWire(i)}
                className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-all ${
                  selectedWire === i ? "ring-2 ring-white scale-110" : "hover:scale-105"
                } ${wireConnections.includes(i) ? "opacity-40" : ""}`}
                style={{ backgroundColor: wire.color }}
                disabled={wireConnections.includes(i)}>
                {wire.name}
              </button>
            ))}
          </div>
          {/* Right side - targets (shuffled) */}
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-500 text-center mb-1">부품 ⚙️</div>
            {shuffledTargets.map((targetIdx, pos) => (
              <button key={pos} onClick={() => {
                if (selectedWire !== null && wireConnections[targetIdx] === null) {
                  if (selectedWire === targetIdx) {
                    const newConn = [...wireConnections];
                    newConn[targetIdx] = selectedWire;
                    setWireConnections(newConn);
                  }
                  setSelectedWire(null);
                }
              }}
                className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-all hover:scale-105 ${
                  wireConnections[targetIdx] !== null ? "opacity-40" : ""
                }`}
                style={{ backgroundColor: WIRE_COLORS[targetIdx].color }}
                disabled={wireConnections[targetIdx] !== null}>
                {wireConnections[targetIdx] !== null ? "✅" : WIRE_COLORS[targetIdx].name}
              </button>
            ))}
          </div>
        </div>
        {selectedWire !== null && (
          <p className="text-center text-sm text-gray-400">
            {WIRE_COLORS[selectedWire].name} 선 선택됨 - 같은 색 부품을 터치하세요
          </p>
        )}
        {allConnected && (
          <div className="text-center mt-4">
            <p className="text-lg text-green-400 mb-3">🎉 배선 연결 완료!</p>
            <button onClick={() => { initPaint(); setPhase("paint"); }}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
              다음 단계 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPaint = () => {
    const paintDone = paintProgress >= 100;

    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-pink-300 mb-2">🎨 도색하기</h2>
        <p className="text-center text-gray-400 mb-4">색상과 도장 타입을 선택하고 칠하세요!</p>

        {/* Color picker */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {PAINT_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${color === c ? "border-white scale-110 ring-2 ring-white/50" : "border-gray-600"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        {/* Paint style */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {PAINT_STYLES.map(ps => (
            <button key={ps.key} onClick={() => setPaintStyle(ps.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                paintStyle === ps.key ? "bg-pink-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}>
              {ps.name}
            </button>
          ))}
        </div>

        {/* Car preview with paint overlay */}
        <div className="flex justify-center mb-4 relative">
          <div className="relative">
            <CarVisual carType={carType} color={color} paintStyle={paintStyle} spoiler="none" bumper="normal" wheel="steel" sticker="none" underglow="none" tint="clear" />
            {/* Unpainted overlay */}
            {!paintDone && (
              <div className="absolute inset-0 bg-gray-500/60 rounded-lg transition-all"
                style={{ clipPath: `inset(0 0 0 ${paintProgress}%)` }} />
            )}
          </div>
        </div>

        {/* Paint slider / button */}
        {!paintDone ? (
          <div className="max-w-sm mx-auto">
            <div className="relative bg-gray-700 rounded-full h-12 overflow-hidden cursor-pointer select-none"
              onMouseDown={() => setIsPainting(true)}
              onMouseUp={() => setIsPainting(false)}
              onMouseLeave={() => setIsPainting(false)}
              onTouchStart={() => setIsPainting(true)}
              onTouchEnd={() => setIsPainting(false)}
              onMouseMove={() => { if (isPainting) setPaintProgress(p => Math.min(100, p + 2)); }}
              onTouchMove={() => { if (isPainting) setPaintProgress(p => Math.min(100, p + 2)); }}>
              <div className="h-full rounded-full transition-all flex items-center justify-end pr-4"
                style={{ width: `${Math.max(paintProgress, 8)}%`, backgroundColor: color }}>
                <span className="text-lg">🖌️</span>
              </div>
              {paintProgress < 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold">
                  ← 드래그하여 칠하기 →
                </span>
              )}
            </div>
            <p className="text-center text-gray-500 text-sm mt-2">{Math.round(paintProgress)}% 완료</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg text-green-400 mb-3">🎉 도색 완료! 멋진 색이네요!</p>
            <button onClick={() => setPhase("customize")}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-bold hover:scale-105 transition-transform">
              커스터마이징 →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCustomize = () => (
    <div>
      <h2 className="text-2xl font-bold text-center text-purple-300 mb-4">✨ 커스터마이징</h2>

      {/* Preview */}
      <div className="flex justify-center mb-6">
        <CarVisual carType={carType} color={color} paintStyle={paintStyle} spoiler={spoiler} bumper={bumper} wheel={wheel} sticker={sticker} underglow={underglow} tint={tint} size={1.2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
        {/* Spoiler */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">🏎️ 스포일러</h3>
          <div className="flex flex-wrap gap-2">
            {SPOILERS.map(s => (
              <button key={s.key} onClick={() => setSpoiler(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${spoiler === s.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {/* Bumper */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">🛡️ 범퍼</h3>
          <div className="flex flex-wrap gap-2">
            {BUMPERS.map(b => (
              <button key={b.key} onClick={() => setBumper(b.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${bumper === b.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
        {/* Wheel */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">🛞 휠</h3>
          <div className="flex flex-wrap gap-2">
            {WHEELS.map(w => (
              <button key={w.key} onClick={() => setWheel(w.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${wheel === w.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {w.name}
              </button>
            ))}
          </div>
        </div>
        {/* Sticker */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">🏷️ 스티커</h3>
          <div className="flex flex-wrap gap-2">
            {STICKERS.map(s => (
              <button key={s.key} onClick={() => setSticker(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${sticker === s.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        </div>
        {/* Underglow */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">💡 LED 언더글로우</h3>
          <div className="flex flex-wrap gap-2">
            {UNDERGLOWS.map(u => (
              <button key={u.key} onClick={() => setUnderglow(u.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${underglow === u.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {u.name}
              </button>
            ))}
          </div>
        </div>
        {/* Tint */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2">🪟 윈도우 틴트</h3>
          <div className="flex flex-wrap gap-2">
            {TINTS.map(t => (
              <button key={t.key} onClick={() => setTint(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${tint === t.key ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats preview */}
      <div className="max-w-md mx-auto bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6">
        <h3 className="font-bold text-gray-300 mb-3 text-center">📊 차량 스탯</h3>
        <div className="space-y-2">
          <StatBar label="속도" value={currentStats.speed} icon="⚡" />
          <StatBar label="가속" value={currentStats.accel} icon="🚀" />
          <StatBar label="핸들링" value={currentStats.handling} icon="🎯" />
          <StatBar label="내구도" value={currentStats.durability} icon="🛡️" />
          <StatBar label="연비" value={currentStats.efficiency} icon="⛽" />
          <StatBar label="멋짐" value={currentStats.coolness} icon="✨" />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => { initTestDrive(); setPhase("testDrive"); }}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-green-500/30">
          🏁 테스트 드라이브!
        </button>
      </div>
    </div>
  );

  const renderTestDrive = () => {
    const laneWidth = 80;
    const roadWidth = laneWidth * 3;

    return (
      <div>
        <h2 className="text-2xl font-bold text-center text-green-300 mb-2">🏁 테스트 드라이브</h2>
        {!driveCrash && driveActive && (
          <p className="text-center text-gray-400 mb-2 text-sm">← → 또는 버튼으로 장애물을 피하세요!</p>
        )}

        {/* HUD */}
        <div className="flex justify-center gap-6 mb-3 text-sm">
          <span className="text-cyan-300">🏎️ 속도: {Math.round(driveSpeed)} km/h</span>
          <span className="text-yellow-300">📏 거리: {Math.round(driveDistance)}m</span>
          <span className="text-green-300">⭐ 점수: {Math.round(driveScore)}</span>
        </div>

        {/* Road */}
        <div className="flex justify-center mb-4">
          <div className="relative overflow-hidden rounded-xl border-2 border-gray-600" style={{ width: roadWidth, height: 450, background: "#1a1a2e" }}>
            {/* Lane lines */}
            {[1, 2].map(i => (
              <div key={i} className="absolute top-0 bottom-0" style={{ left: laneWidth * i - 1, width: 2 }}>
                {[...Array(20)].map((_, j) => (
                  <div key={j} className="w-0.5 h-6 bg-yellow-500/40 mx-auto" style={{ marginTop: 8, animation: driveActive ? `scroll 0.3s linear infinite` : "none" }} />
                ))}
              </div>
            ))}
            {/* Road markings animation */}
            <style jsx>{`
              @keyframes scroll {
                0% { transform: translateY(0); }
                100% { transform: translateY(32px); }
              }
            `}</style>
            {/* Obstacles */}
            {obstacles.map((obs, i) => (
              <div key={i} className="absolute text-2xl transition-all" style={{ left: obs.lane * laneWidth + laneWidth / 2 - 14, top: obs.y }}>
                {obs.type}
              </div>
            ))}
            {/* Car */}
            <div className="absolute transition-all duration-150" style={{ left: drivePos * laneWidth + 5, bottom: 60, width: laneWidth - 10 }}>
              <div className="flex justify-center">
                <CarVisual carType={carType} color={color} paintStyle={paintStyle} spoiler={spoiler} bumper={bumper} wheel={wheel} sticker={sticker} underglow={underglow} tint={tint} size={0.25} animate={driveActive} />
              </div>
            </div>
            {/* Crash effect */}
            {driveCrash && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/40">
                <div className="text-center">
                  <div className="text-5xl mb-2">💥</div>
                  <div className="text-xl font-bold text-white">충돌!</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {driveActive && !driveCrash && (
          <div className="flex justify-center gap-4 mb-4">
            <button onClick={() => setDrivePos(p => Math.max(0, p - 1))}
              className="px-8 py-3 bg-blue-600 rounded-xl text-white font-bold text-xl active:scale-90 transition-transform">
              ← 왼쪽
            </button>
            <button onClick={() => setDrivePos(p => Math.min(2, p + 1))}
              className="px-8 py-3 bg-blue-600 rounded-xl text-white font-bold text-xl active:scale-90 transition-transform">
              오른쪽 →
            </button>
          </div>
        )}

        {driveCrash && (
          <div className="text-center space-y-3">
            <p className="text-lg text-yellow-300">최종 점수: {Math.round(driveScore)}점 | 거리: {Math.round(driveDistance)}m</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { initTestDrive(); }}
                className="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-500">
                🔄 다시 도전
              </button>
              <button onClick={() => setPhase("complete")}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white font-bold hover:scale-105 transition-transform">
                ✅ 완성!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComplete = () => (
    <div className="text-center py-4">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-cyan-300 mb-4">
        자동차 완성!
      </h2>
      <div className="flex justify-center mb-6">
        <CarVisual carType={carType} color={color} paintStyle={paintStyle} spoiler={spoiler} bumper={bumper} wheel={wheel} sticker={sticker} underglow={underglow} tint={tint} size={1.5} />
      </div>
      <div className="max-w-md mx-auto mb-6">
        <input type="text" value={carName} onChange={e => setCarName(e.target.value)}
          placeholder="차 이름을 지어주세요..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-center text-lg focus:outline-none focus:border-cyan-400" />
      </div>
      <div className="max-w-md mx-auto bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6">
        <h3 className="font-bold text-gray-300 mb-3">📊 최종 스탯</h3>
        <div className="space-y-2">
          <StatBar label="속도" value={currentStats.speed} icon="⚡" />
          <StatBar label="가속" value={currentStats.accel} icon="🚀" />
          <StatBar label="핸들링" value={currentStats.handling} icon="🎯" />
          <StatBar label="내구도" value={currentStats.durability} icon="🛡️" />
          <StatBar label="연비" value={currentStats.efficiency} icon="⛽" />
          <StatBar label="멋짐" value={currentStats.coolness} icon="✨" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <button onClick={() => { saveToGarage(); setPhase("garage"); }}
          className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-orange-500/30">
          🏠 차고에 저장
        </button>
        <button onClick={() => { resetBuild(); setPhase("carType"); }}
          className="px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600">
          🔧 새 차 만들기
        </button>
      </div>
    </div>
  );

  const renderGarage = () => (
    <div>
      <h2 className="text-2xl font-bold text-center text-yellow-300 mb-6">🏠 내 차고</h2>
      {garage.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏗️</div>
          <p className="text-gray-400 text-lg">아직 만든 차가 없어요!</p>
          <button onClick={() => { resetBuild(); setPhase("carType"); }}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-500">
            첫 차 만들기!
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {garage.map((car, i) => (
            <div key={car.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-500 transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white">{car.name}</h3>
                <span className="text-xs text-gray-500">{car.date}</span>
              </div>
              <div className="flex justify-center mb-3">
                <CarVisual carType={car.carType} color={car.color} paintStyle={car.paintStyle} spoiler={car.spoiler} bumper={car.bumper} wheel={car.wheel} sticker={car.sticker} underglow={car.underglow} tint={car.tint} size={0.8} />
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span className="text-gray-400">⚡ 속도 {car.stats.speed}</span>
                <span className="text-gray-400">🚀 가속 {car.stats.accel}</span>
                <span className="text-gray-400">🎯 핸들 {car.stats.handling}</span>
                <span className="text-gray-400">🛡️ 내구 {car.stats.durability}</span>
                <span className="text-gray-400">⛽ 연비 {car.stats.efficiency}</span>
                <span className="text-gray-400">✨ 멋짐 {car.stats.coolness}</span>
              </div>
              <button onClick={() => {
                const updated = garage.filter(c => c.id !== car.id);
                setGarage(updated);
                try { localStorage.setItem("carmaker_garage", JSON.stringify(updated)); } catch {}
              }}
                className="mt-2 text-xs text-red-400 hover:text-red-300">🗑️ 삭제</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center mt-6">
        <button onClick={() => setPhase("menu")} className="px-6 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600">← 메뉴로</button>
      </div>
    </div>
  );

  // ---- Progress bar for assembly phases ----
  const assemblyPhases: GamePhase[] = ["assembleEngine", "weld", "wheels", "wiring", "paint", "customize"];
  const assemblyLabels = ["엔진", "용접", "바퀴", "배선", "도색", "커스텀"];
  const currentAssemblyIdx = assemblyPhases.indexOf(phase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-950 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {renderHeader()}

        {/* Assembly progress bar */}
        {currentAssemblyIdx >= 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {assemblyLabels.map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < currentAssemblyIdx ? "bg-green-500 border-green-400 text-white" :
                    i === currentAssemblyIdx ? "bg-cyan-500 border-cyan-400 text-white animate-pulse" :
                    "bg-gray-700 border-gray-600 text-gray-400"
                  }`}>
                    {i < currentAssemblyIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ml-1 hidden md:inline ${i === currentAssemblyIdx ? "text-cyan-300" : "text-gray-500"}`}>{label}</span>
                  {i < assemblyLabels.length - 1 && (
                    <div className={`w-4 md:w-8 h-0.5 mx-1 ${i < currentAssemblyIdx ? "bg-green-500" : "bg-gray-700"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase content */}
        <div className="bg-gray-900/50 rounded-2xl border border-gray-700/50 p-4 md:p-6 backdrop-blur-sm shadow-2xl">
          {phase === "menu" && renderMenu()}
          {phase === "carType" && renderCarType()}
          {phase === "engine" && renderEngine()}
          {phase === "assembleEngine" && renderEngineAssembly()}
          {phase === "weld" && renderWeld()}
          {phase === "wheels" && renderWheels()}
          {phase === "wiring" && renderWiring()}
          {phase === "paint" && renderPaint()}
          {phase === "customize" && renderCustomize()}
          {phase === "testDrive" && renderTestDrive()}
          {phase === "complete" && renderComplete()}
          {phase === "garage" && renderGarage()}
        </div>
      </div>
    </div>
  );
}
