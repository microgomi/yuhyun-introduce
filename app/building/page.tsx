"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Clicker Game Types ---
type UpgradeTier =
  | "normal" | "advanced" | "legendary" | "mythic" | "transcendent" | "eternal" | "absolute"
  | "divine" | "primordial" | "infinite" | "absolutist" | "mystery";

/** 상점에 보여 줄 등급 순서(낮은 등급부터) */
const TIER_ORDER: UpgradeTier[] = [
  "normal", "advanced", "legendary", "mythic", "transcendent", "eternal", "absolute",
  "divine", "primordial", "infinite", "absolutist", "mystery",
];

interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  baseCost: number;
  costMultiplier: number;
  effect: "clickPower" | "autoClick";
  effectValue: number;
  tier: UpgradeTier;
}

const TIER_INFO: Record<UpgradeTier, { label: string; emoji: string; border: string; bg: string; activeBorder: string; activeBg: string; text: string }> = {
  normal: { label: "일반", emoji: "⚪", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-blue-300 dark:border-blue-700", activeBg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-500" },
  advanced: { label: "고급", emoji: "🟢", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-emerald-400 dark:border-emerald-700", activeBg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-500" },
  legendary: { label: "전설", emoji: "🟣", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-purple-400 dark:border-purple-700", activeBg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-500" },
  mythic: { label: "신화", emoji: "🔴", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-amber-400 dark:border-amber-600", activeBg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40", text: "text-amber-500" },
  transcendent: { label: "초월", emoji: "🔷", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-cyan-400 dark:border-cyan-500", activeBg: "bg-gradient-to-r from-cyan-50 to-sky-100 dark:from-cyan-950/50 dark:to-sky-950/50", text: "text-cyan-500" },
  eternal: { label: "영원", emoji: "💖", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-pink-400 dark:border-pink-500", activeBg: "bg-gradient-to-r from-pink-50 via-fuchsia-50 to-rose-100 dark:from-pink-950/50 dark:via-fuchsia-950/50 dark:to-rose-950/50", text: "text-pink-500" },
  absolute: { label: "절대", emoji: "👑", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-yellow-400 dark:border-yellow-400", activeBg: "bg-gradient-to-r from-red-50 via-yellow-50 to-violet-100 dark:from-red-950/50 dark:via-yellow-950/40 dark:to-violet-950/50", text: "bg-gradient-to-r from-red-500 via-yellow-500 to-violet-500 bg-clip-text text-transparent" },
  divine: { label: "신성", emoji: "😇", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-yellow-300 dark:border-yellow-300", activeBg: "bg-gradient-to-r from-white to-yellow-100 dark:from-yellow-950/40 dark:to-amber-900/40", text: "text-yellow-500" },
  primordial: { label: "태초", emoji: "🌅", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-orange-400 dark:border-orange-500", activeBg: "bg-gradient-to-r from-orange-100 via-rose-100 to-sky-100 dark:from-orange-950/50 dark:via-rose-950/50 dark:to-sky-950/50", text: "text-orange-500" },
  infinite: { label: "무한", emoji: "♾️", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-teal-400 dark:border-teal-400", activeBg: "bg-gradient-to-r from-teal-100 via-cyan-100 to-indigo-100 dark:from-teal-950/50 dark:via-cyan-950/50 dark:to-indigo-950/50", text: "text-teal-500" },
  absolutist: { label: "절대적인", emoji: "⚜️", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-zinc-900 dark:border-white", activeBg: "bg-gradient-to-r from-zinc-200 via-white to-zinc-300 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-900", text: "text-zinc-900 dark:text-white" },
  mystery: { label: "???", emoji: "❓", border: "border-zinc-200 dark:border-zinc-700", bg: "bg-zinc-50 dark:bg-zinc-900", activeBorder: "border-fuchsia-500 dark:border-fuchsia-400", activeBg: "bg-gradient-to-r from-fuchsia-100 via-violet-100 to-cyan-100 dark:from-black dark:via-fuchsia-950 dark:to-black", text: "animate-pulse bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-lime-400 bg-clip-text text-transparent" },
};

interface BuildingLevel {
  name: string;
  emoji: string;
  blocksNeeded: number;
  color: string;
}

const UPGRADES: Upgrade[] = [
  // 일반
  { id: "hammer", name: "강화 망치", emoji: "🔨", desc: "클릭당 +1 블록", baseCost: 10, costMultiplier: 1.5, effect: "clickPower", effectValue: 1, tier: "normal" },
  { id: "crane", name: "크레인", emoji: "🏗️", desc: "초당 +1 자동 블록", baseCost: 50, costMultiplier: 1.8, effect: "autoClick", effectValue: 1, tier: "normal" },
  { id: "drill", name: "파워 드릴", emoji: "🔧", desc: "클릭당 +5 블록", baseCost: 200, costMultiplier: 1.6, effect: "clickPower", effectValue: 5, tier: "normal" },
  { id: "robot", name: "건축 로봇", emoji: "🤖", desc: "초당 +5 자동 블록", baseCost: 500, costMultiplier: 1.9, effect: "autoClick", effectValue: 5, tier: "normal" },
  // 고급
  { id: "magic", name: "마법 건축", emoji: "✨", desc: "클릭당 +25 블록", baseCost: 2000, costMultiplier: 1.7, effect: "clickPower", effectValue: 25, tier: "advanced" },
  { id: "factory", name: "블록 공장", emoji: "🏭", desc: "초당 +25 자동 블록", baseCost: 5000, costMultiplier: 2.0, effect: "autoClick", effectValue: 25, tier: "advanced" },
  { id: "laser", name: "레이저 커터", emoji: "🔫", desc: "클릭당 +100 블록", baseCost: 15000, costMultiplier: 1.8, effect: "clickPower", effectValue: 100, tier: "advanced" },
  { id: "drone", name: "건축 드론대", emoji: "🛸", desc: "초당 +100 자동 블록", baseCost: 30000, costMultiplier: 2.0, effect: "autoClick", effectValue: 100, tier: "advanced" },
  // 전설
  { id: "timemachine", name: "타임머신", emoji: "⏰", desc: "클릭당 +500 블록", baseCost: 100000, costMultiplier: 1.9, effect: "clickPower", effectValue: 500, tier: "legendary" },
  { id: "nanobot", name: "나노봇 군단", emoji: "🦠", desc: "초당 +500 자동 블록", baseCost: 200000, costMultiplier: 2.1, effect: "autoClick", effectValue: 500, tier: "legendary" },
  { id: "portal", name: "차원의 문", emoji: "🌀", desc: "클릭당 +2000 블록", baseCost: 800000, costMultiplier: 2.0, effect: "clickPower", effectValue: 2000, tier: "legendary" },
  { id: "antimatter", name: "반물질 엔진", emoji: "⚛️", desc: "초당 +2000 자동 블록", baseCost: 1500000, costMultiplier: 2.2, effect: "autoClick", effectValue: 2000, tier: "legendary" },
  // 신화
  { id: "bigbang", name: "빅뱅 생성기", emoji: "💥", desc: "클릭당 +10000 블록", baseCost: 5000000, costMultiplier: 2.0, effect: "clickPower", effectValue: 10000, tier: "mythic" },
  { id: "multiverse", name: "멀티버스 공장", emoji: "🌐", desc: "초당 +10000 자동 블록", baseCost: 10000000, costMultiplier: 2.3, effect: "autoClick", effectValue: 10000, tier: "mythic" },
  { id: "godhand", name: "신의 손", emoji: "🖐️", desc: "클릭당 +50000 블록", baseCost: 50000000, costMultiplier: 2.2, effect: "clickPower", effectValue: 50000, tier: "mythic" },
  { id: "infinity", name: "무한의 힘", emoji: "♾️", desc: "초당 +50000 자동 블록", baseCost: 100000000, costMultiplier: 2.5, effect: "autoClick", effectValue: 50000, tier: "mythic" },
  // 초월 — 여기부터 자동 건축은 초당 150M(1억 5천만) 이상
  { id: "galaxyhammer", name: "은하 망치", emoji: "🌠", desc: "클릭당 +30M 블록", baseCost: 300_000_000, costMultiplier: 2.0, effect: "clickPower", effectValue: 30_000_000, tier: "transcendent" },
  { id: "planetfactory", name: "행성 공장", emoji: "🪐", desc: "초당 +150M 자동 블록", baseCost: 1_000_000_000, costMultiplier: 2.2, effect: "autoClick", effectValue: 150_000_000, tier: "transcendent" },
  { id: "cometcrane", name: "혜성 크레인", emoji: "☄️", desc: "클릭당 +100M 블록", baseCost: 5_000_000_000, costMultiplier: 2.1, effect: "clickPower", effectValue: 100_000_000, tier: "transcendent" },
  { id: "galaxycrew", name: "은하 건설단", emoji: "🌌", desc: "초당 +500M 자동 블록", baseCost: 20_000_000_000, costMultiplier: 2.3, effect: "autoClick", effectValue: 500_000_000, tier: "transcendent" },
  // 영원
  { id: "blackhole", name: "블랙홀 압축기", emoji: "🕳️", desc: "클릭당 +1B 블록", baseCost: 100_000_000_000, costMultiplier: 2.1, effect: "clickPower", effectValue: 1_000_000_000, tier: "eternal" },
  { id: "supernova", name: "초신성 엔진", emoji: "🌟", desc: "초당 +2B 자동 블록", baseCost: 300_000_000_000, costMultiplier: 2.3, effect: "autoClick", effectValue: 2_000_000_000, tier: "eternal" },
  { id: "timetower", name: "시간의 탑", emoji: "⏳", desc: "클릭당 +5B 블록", baseCost: 1_000_000_000_000, costMultiplier: 2.2, effect: "clickPower", effectValue: 5_000_000_000, tier: "eternal" },
  { id: "eternalcastle", name: "영원의 성", emoji: "🔮", desc: "초당 +10B 자동 블록", baseCost: 5_000_000_000_000, costMultiplier: 2.4, effect: "autoClick", effectValue: 10_000_000_000, tier: "eternal" },
  // 절대
  { id: "creationeye", name: "창조의 눈", emoji: "👁️", desc: "클릭당 +50B 블록", baseCost: 50_000_000_000_000, costMultiplier: 2.2, effect: "clickPower", effectValue: 50_000_000_000, tier: "absolute" },
  { id: "rainbowgate", name: "무지개 차원로", emoji: "🌈", desc: "초당 +100B 자동 블록", baseCost: 100_000_000_000_000, costMultiplier: 2.4, effect: "autoClick", effectValue: 100_000_000_000, tier: "absolute" },
  { id: "absolutecrown", name: "절대자의 왕관", emoji: "👑", desc: "클릭당 +300B 블록", baseCost: 1_000_000_000_000_000, costMultiplier: 2.3, effect: "clickPower", effectValue: 300_000_000_000, tier: "absolute" },
  { id: "absolutebuild", name: "절대 건축", emoji: "🔱", desc: "초당 +1T 자동 블록", baseCost: 5_000_000_000_000_000, costMultiplier: 2.5, effect: "autoClick", effectValue: 1_000_000_000_000, tier: "absolute" },
  // 신성 — 여기부터 등급마다 약 10배씩 세진다
  { id: "halo", name: "천사의 후광", emoji: "😇", desc: "클릭당 +2T 블록", baseCost: 2e16, costMultiplier: 2.3, effect: "clickPower", effectValue: 2e12, tier: "divine" },
  { id: "holyforge", name: "신성한 대장간", emoji: "🔥", desc: "초당 +5T 자동 블록", baseCost: 5e16, costMultiplier: 2.5, effect: "autoClick", effectValue: 5e12, tier: "divine" },
  { id: "archangel", name: "대천사의 날개", emoji: "🪽", desc: "클릭당 +10T 블록", baseCost: 2e17, costMultiplier: 2.4, effect: "clickPower", effectValue: 1e13, tier: "divine" },
  { id: "heavenworks", name: "천국 공방", emoji: "⛪", desc: "초당 +25T 자동 블록", baseCost: 5e17, costMultiplier: 2.6, effect: "autoClick", effectValue: 2.5e13, tier: "divine" },
  // 태초
  { id: "firstlight", name: "태초의 빛", emoji: "🌅", desc: "클릭당 +50T 블록", baseCost: 1e18, costMultiplier: 2.4, effect: "clickPower", effectValue: 5e13, tier: "primordial" },
  { id: "worldseed", name: "세계의 씨앗", emoji: "🌱", desc: "초당 +100T 자동 블록", baseCost: 3e18, costMultiplier: 2.6, effect: "autoClick", effectValue: 1e14, tier: "primordial" },
  { id: "chaoshammer", name: "혼돈의 망치", emoji: "🌪️", desc: "클릭당 +300T 블록", baseCost: 1e19, costMultiplier: 2.5, effect: "clickPower", effectValue: 3e14, tier: "primordial" },
  { id: "genesis", name: "창세 엔진", emoji: "🌋", desc: "초당 +500T 자동 블록", baseCost: 3e19, costMultiplier: 2.7, effect: "autoClick", effectValue: 5e14, tier: "primordial" },
  // 무한
  { id: "endlesshand", name: "끝없는 손", emoji: "🤲", desc: "클릭당 +1Qa 블록", baseCost: 1e20, costMultiplier: 2.5, effect: "clickPower", effectValue: 1e15, tier: "infinite" },
  { id: "loopfactory", name: "무한 루프 공장", emoji: "🔁", desc: "초당 +2Qa 자동 블록", baseCost: 3e20, costMultiplier: 2.7, effect: "autoClick", effectValue: 2e15, tier: "infinite" },
  { id: "mobius", name: "뫼비우스 크레인", emoji: "➰", desc: "클릭당 +5Qa 블록", baseCost: 1e21, costMultiplier: 2.6, effect: "clickPower", effectValue: 5e15, tier: "infinite" },
  { id: "infinitycore", name: "무한 코어", emoji: "♾️", desc: "초당 +10Qa 자동 블록", baseCost: 3e21, costMultiplier: 2.8, effect: "autoClick", effectValue: 1e16, tier: "infinite" },
  // 절대적인
  { id: "absolutelaw", name: "절대적인 법칙", emoji: "⚖️", desc: "클릭당 +30Qa 블록", baseCost: 1e22, costMultiplier: 2.6, effect: "clickPower", effectValue: 3e16, tier: "absolutist" },
  { id: "absolutethrone", name: "절대적인 옥좌", emoji: "⚜️", desc: "초당 +50Qa 자동 블록", baseCost: 3e22, costMultiplier: 2.8, effect: "autoClick", effectValue: 5e16, tier: "absolutist" },
  { id: "absolutewill", name: "절대적인 의지", emoji: "🗡️", desc: "클릭당 +100Qa 블록", baseCost: 1e23, costMultiplier: 2.7, effect: "clickPower", effectValue: 1e17, tier: "absolutist" },
  { id: "absoluteworld", name: "절대적인 세계", emoji: "🌍", desc: "초당 +300Qa 자동 블록", baseCost: 3e23, costMultiplier: 2.9, effect: "autoClick", effectValue: 3e17, tier: "absolutist" },
  // ??? — 살 수 있을 만큼 모으기 전까지는 정체가 숨겨진다
  { id: "mystery1", name: "알 수 없는 조각", emoji: "🧩", desc: "클릭당 +1Qi 블록", baseCost: 1e24, costMultiplier: 2.8, effect: "clickPower", effectValue: 1e18, tier: "mystery" },
  { id: "mystery2", name: "이름 없는 별", emoji: "🌠", desc: "초당 +2Qi 자동 블록", baseCost: 3e24, costMultiplier: 3.0, effect: "autoClick", effectValue: 2e18, tier: "mystery" },
  { id: "mystery3", name: "비밀의 열쇠", emoji: "🗝️", desc: "클릭당 +5Qi 블록", baseCost: 1e25, costMultiplier: 2.9, effect: "clickPower", effectValue: 5e18, tier: "mystery" },
  { id: "mystery4", name: "모든 것의 답", emoji: "👁️‍🗨️", desc: "초당 +10Qi 자동 블록", baseCost: 3e25, costMultiplier: 3.0, effect: "autoClick", effectValue: 1e19, tier: "mystery" },
];

const BASE_LEVELS: BuildingLevel[] = [
  { name: "빈 땅", emoji: "🌱", blocksNeeded: 0, color: "from-green-400 to-emerald-500" },
  { name: "오두막", emoji: "🛖", blocksNeeded: 50, color: "from-amber-400 to-yellow-500" },
  { name: "집", emoji: "🏠", blocksNeeded: 200, color: "from-blue-400 to-sky-500" },
  { name: "빌딩", emoji: "🏢", blocksNeeded: 1000, color: "from-indigo-400 to-violet-500" },
  { name: "성", emoji: "🏰", blocksNeeded: 5000, color: "from-purple-400 to-fuchsia-500" },
  { name: "도시", emoji: "🏙️", blocksNeeded: 20000, color: "from-pink-400 to-rose-500" },
  { name: "우주 기지", emoji: "🚀", blocksNeeded: 100000, color: "from-red-400 to-orange-500" },
  { name: "은하수", emoji: "🌌", blocksNeeded: 500000, color: "from-violet-500 to-indigo-600" },
  { name: "블랙홀", emoji: "🕳️", blocksNeeded: 2000000, color: "from-gray-900 to-purple-950" },
  // 10단계부터는 우주 스케일. 필요 블록은 직전 단계의 약 2.5배씩 늘어난다(마지막 600B).
  // 배율을 바꾸면 후반 단계가 통째로 도달 불가능해지므로 표 전체를 함께 조정할 것.
  { name: "초신성", emoji: "💫", blocksNeeded: 5000000, color: "from-orange-400 to-red-500" },
  { name: "펄사 등대", emoji: "🔦", blocksNeeded: 12000000, color: "from-cyan-400 to-blue-500" },
  { name: "성운 도시", emoji: "☄️", blocksNeeded: 30000000, color: "from-fuchsia-400 to-purple-600" },
  { name: "항성 요새", emoji: "⭐", blocksNeeded: 70000000, color: "from-yellow-300 to-amber-500" },
  { name: "행성 공장", emoji: "🪐", blocksNeeded: 150000000, color: "from-teal-400 to-cyan-600" },
  { name: "은하 제국", emoji: "👑", blocksNeeded: 350000000, color: "from-amber-300 to-yellow-600" },
  { name: "웜홀 정거장", emoji: "🛰️", blocksNeeded: 800000000, color: "from-lime-400 to-green-600" },
  { name: "차원 회랑", emoji: "🌉", blocksNeeded: 2000000000, color: "from-indigo-400 to-blue-700" },
  { name: "평행우주", emoji: "🔮", blocksNeeded: 4000000000, color: "from-violet-400 to-purple-700" },
  { name: "다중우주", emoji: "🌐", blocksNeeded: 9000000000, color: "from-sky-400 to-indigo-600" },
  { name: "시간의 탑", emoji: "⏳", blocksNeeded: 20000000000, color: "from-stone-400 to-amber-700" },
  { name: "별빛 신전", emoji: "🔱", blocksNeeded: 45000000000, color: "from-yellow-200 to-orange-400" },
  { name: "창조의 알", emoji: "🥚", blocksNeeded: 100000000000, color: "from-rose-300 to-pink-500" },
  { name: "우주의 심장", emoji: "💗", blocksNeeded: 250000000000, color: "from-red-400 to-rose-600" },
  { name: "무한의 왕좌", emoji: "🏆", blocksNeeded: 600000000000, color: "from-amber-200 via-yellow-400 to-amber-600" },
];

// --- 무한의 왕좌 다음 100단계 ---
// 10단계씩 10개 장(테마)으로 나눈다. 필요 블록은 직전 단계의 1.2배씩 늘어난다(마지막 약 50Qi).
// 앞 단계처럼 2.5배씩 늘리면 100단계 끝이 1e51 을 넘어 절대 도달할 수 없으므로 배율을 낮췄다.
const EXTRA_LEVEL_GROWTH = 1.2;

const EXTRA_CHAPTERS: { title: string; color: string; levels: [string, string][] }[] = [
  {
    title: "천상",
    color: "from-sky-200 to-blue-400",
    levels: [["구름 궁전", "☁️"], ["천사의 계단", "🪽"], ["무지개 다리", "🌈"], ["하늘 정원", "🌤️"], ["번개 탑", "⚡"], ["바람의 성", "🌬️"], ["달빛 호수", "🌙"], ["햇살 신전", "☀️"], ["별빛 분수", "⛲"], ["천상의 문", "🚪"]],
  },
  {
    title: "원소",
    color: "from-orange-400 to-red-600",
    levels: [["불꽃 용광로", "🔥"], ["얼음 궁전", "🧊"], ["용암 요새", "🌋"], ["폭풍 탑", "🌪️"], ["대지의 뿌리", "🌳"], ["바다 신전", "🌊"], ["모래 성", "🏜️"], ["수정 동굴", "💎"], ["천둥 망루", "🌩️"], ["원소의 핵", "⚛️"]],
  },
  {
    title: "보석",
    color: "from-emerald-300 to-teal-600",
    levels: [["루비 탑", "❤️"], ["사파이어 성", "💙"], ["에메랄드 도시", "💚"], ["자수정 궁", "💜"], ["황금 광산", "🪙"], ["진주 궁전", "🦪"], ["호박 신전", "🟠"], ["오팔 정원", "🤍"], ["다이아 왕관", "👑"], ["보석의 심장", "💠"]],
  },
  {
    title: "신화 동물",
    color: "from-rose-400 to-fuchsia-600",
    levels: [["불사조 둥지", "🐦‍🔥"], ["용의 굴", "🐲"], ["유니콘 목장", "🦄"], ["그리핀 탑", "🦅"], ["크라켄 해저성", "🐙"], ["페가수스 마구간", "🐎"], ["구미호 사당", "🦊"], ["거북 섬", "🐢"], ["백호 산성", "🐯"], ["신수의 왕국", "🐉"]],
  },
  {
    title: "시간",
    color: "from-amber-200 to-stone-500",
    levels: [["모래시계 탑", "⏳"], ["태엽 도시", "⚙️"], ["공룡 시대 기지", "🦖"], ["미래 도시", "🏙️"], ["시계탑 성", "🕰️"], ["과거의 문", "⏮️"], ["미래의 문", "⏭️"], ["영원의 순간", "⏸️"], ["시간 도서관", "📚"], ["시간의 끝", "⌛"]],
  },
  {
    title: "차원",
    color: "from-indigo-400 to-violet-700",
    levels: [["거울 세계", "🪞"], ["뒤집힌 도시", "🙃"], ["꿈의 섬", "💤"], ["미로 차원", "🌀"], ["픽셀 월드", "👾"], ["종이 세상", "📜"], ["사탕 나라", "🍭"], ["장난감 왕국", "🧸"], ["그림자 성", "🌑"], ["차원의 틈", "🕳️"]],
  },
  {
    title: "음악",
    color: "from-pink-300 to-purple-500",
    levels: [["피아노 궁전", "🎹"], ["기타 다리", "🎸"], ["드럼 요새", "🥁"], ["바이올린 탑", "🎻"], ["트럼펫 광장", "🎺"], ["색소폰 거리", "🎷"], ["마이크 무대", "🎤"], ["오케스트라 홀", "🎼"], ["노래하는 산", "🎶"], ["우주 교향곡", "🎵"]],
  },
  {
    title: "빛",
    color: "from-yellow-200 to-amber-400",
    levels: [["촛불 마을", "🕯️"], ["등대 섬", "🗼"], ["네온 시티", "💡"], ["레이저 탑", "🔦"], ["오로라 궁", "🌌"], ["별빛 도시", "✨"], ["태양 발전소", "🔆"], ["빛의 정원", "🌟"], ["프리즘 신전", "🔺"], ["빛의 근원", "💫"]],
  },
  {
    title: "우주 끝",
    color: "from-slate-600 to-black",
    levels: [["퀘이사 등대", "🔭"], ["중성자 요새", "🧲"], ["암흑 물질 공장", "⚫"], ["은하단 수도", "🌐"], ["우주 거미줄", "🕸️"], ["빅크런치 방벽", "🧱"], ["우주 알", "🥚"], ["끝없는 계단", "🪜"], ["마지막 별", "⭐"], ["우주의 끝", "🌠"]],
  },
  {
    title: "궁극",
    color: "from-red-500 via-yellow-400 to-violet-600",
    levels: [["창조자의 작업실", "🛠️"], ["운명의 베틀", "🧵"], ["신들의 회의장", "🏛️"], ["만물의 도서관", "📖"], ["영혼의 정원", "🌸"], ["무한 거울 궁", "🔮"], ["전설의 왕관", "👑"], ["세계수", "🌲"], ["모든 것의 탑", "🗼"], ["궁극의 건축물", "🏆"]],
  },
];

/** 보기 좋게 앞 digits 자리만 남긴다(예: 1234567 → 1200000) */
function roundNice(n: number, digits = 2): number {
  const p = Math.pow(10, Math.floor(Math.log10(n)) - (digits - 1));
  return Math.round(n / p) * p;
}

const EXTRA_LEVELS: BuildingLevel[] = EXTRA_CHAPTERS.flatMap((chapter, c) =>
  chapter.levels.map(([name, emoji], i) => ({
    name: `${chapter.title} · ${name}`,
    emoji,
    blocksNeeded: roundNice(BASE_LEVELS[BASE_LEVELS.length - 1].blocksNeeded * Math.pow(EXTRA_LEVEL_GROWTH, c * 10 + i + 1)),
    color: chapter.color,
  })),
);

// --- 궁극의 건축물 다음 386단계(총 510단계) ---
// 양이 많아서 테마 20개 × 건물 20종을 조합해 이름을 만든다(테마 하나에 건물 20단계).
// 필요 블록은 1.04배씩 늘어난다(마지막 약 190Sp). 더 크게 늘리면 ??? 아이템으로도 끝까지 갈 수 없다.
const MEGA_LEVEL_COUNT = 386;
const MEGA_LEVEL_GROWTH = 1.04;

const MEGA_THEMES: { name: string; color: string; emojis: string[] }[] = [
  { name: "황금", color: "from-yellow-300 to-amber-500", emojis: ["🪙", "👑", "🏆"] },
  { name: "수정", color: "from-cyan-200 to-sky-400", emojis: ["💎", "🔮", "🧊"] },
  { name: "별빛", color: "from-indigo-300 to-violet-500", emojis: ["✨", "⭐", "🌟"] },
  { name: "무지개", color: "from-red-400 via-yellow-300 to-blue-400", emojis: ["🌈", "🦄", "🎨"] },
  { name: "그림자", color: "from-zinc-600 to-zinc-900", emojis: ["🌑", "🦇", "🕶️"] },
  { name: "불꽃", color: "from-orange-400 to-red-600", emojis: ["🔥", "🌋", "☄️"] },
  { name: "얼음", color: "from-sky-100 to-cyan-400", emojis: ["❄️", "⛄", "🐧"] },
  { name: "번개", color: "from-yellow-200 to-yellow-500", emojis: ["⚡", "🌩️", "🔋"] },
  { name: "바다", color: "from-blue-400 to-teal-600", emojis: ["🌊", "🐋", "🐚"] },
  { name: "숲", color: "from-green-400 to-emerald-700", emojis: ["🌳", "🍄", "🦌"] },
  { name: "사탕", color: "from-pink-300 to-rose-400", emojis: ["🍭", "🍬", "🧁"] },
  { name: "로봇", color: "from-slate-300 to-slate-600", emojis: ["🤖", "⚙️", "🛰️"] },
  { name: "꿈", color: "from-purple-200 to-fuchsia-400", emojis: ["💤", "☁️", "🌙"] },
  { name: "거울", color: "from-gray-100 to-gray-400", emojis: ["🪞", "💠", "🔷"] },
  { name: "용", color: "from-emerald-400 to-red-500", emojis: ["🐉", "🐲", "🥚"] },
  { name: "은하", color: "from-violet-600 to-black", emojis: ["🌌", "🪐", "🔭"] },
  { name: "영혼", color: "from-teal-200 to-indigo-400", emojis: ["👻", "🕯️", "🦋"] },
  { name: "태양", color: "from-amber-300 to-orange-500", emojis: ["☀️", "🌻", "🔆"] },
  { name: "달빛", color: "from-slate-200 to-indigo-300", emojis: ["🌕", "🌜", "🐺"] },
  { name: "전설", color: "from-red-500 via-amber-400 to-fuchsia-600", emojis: ["🏅", "🗡️", "🛡️"] },
];

const MEGA_STRUCTURES = [
  "성", "탑", "궁전", "요새", "신전", "도시", "다리", "정원", "왕국", "성채",
  "등대", "피라미드", "돔", "기지", "광장", "미로", "첨탑", "방주", "제국", "왕좌",
];

const MEGA_LEVELS: BuildingLevel[] = Array.from({ length: MEGA_LEVEL_COUNT }, (_, i) => {
  const theme = MEGA_THEMES[Math.floor(i / MEGA_STRUCTURES.length) % MEGA_THEMES.length];
  const last = i === MEGA_LEVEL_COUNT - 1;
  return {
    name: last ? "최종 건축의 왕좌" : `${theme.name} ${MEGA_STRUCTURES[i % MEGA_STRUCTURES.length]}`,
    emoji: last ? "🏁" : theme.emojis[i % theme.emojis.length],
    // 4%씩만 늘어서 두 자리로 자르면 이웃 단계가 같아진다. 세 자리까지 남긴다.
    blocksNeeded: roundNice(EXTRA_LEVELS[EXTRA_LEVELS.length - 1].blocksNeeded * Math.pow(MEGA_LEVEL_GROWTH, i + 1), 3),
    color: last ? "from-red-500 via-yellow-300 to-violet-600" : theme.color,
  };
});

// --- 그다음 1000단계(총 1510단계) ---
// 같은 테마×건물 조합을 이어서 쓰고, 한 바퀴(400개)를 돌 때마다 Ⅱ·Ⅲ·Ⅳ 를 붙인다.
// 1.01배씩 늘어난다(마지막 약 4e30). 1% 차이라 네 자리까지 남겨야 이웃 단계가 겹치지 않는다.
const GIGA_LEVEL_COUNT = 1000;
const GIGA_LEVEL_GROWTH = 1.01;
const CYCLE_MARKS = ["", " Ⅱ", " Ⅲ", " Ⅳ", " Ⅴ"];

const GIGA_LEVELS: BuildingLevel[] = Array.from({ length: GIGA_LEVEL_COUNT }, (_, i) => {
  const j = MEGA_LEVEL_COUNT + i; // 앞 386단계에 이어서 이름을 돈다
  const perCycle = MEGA_THEMES.length * MEGA_STRUCTURES.length;
  const theme = MEGA_THEMES[Math.floor(j / MEGA_STRUCTURES.length) % MEGA_THEMES.length];
  const mark = CYCLE_MARKS[Math.min(CYCLE_MARKS.length - 1, Math.floor(j / perCycle))];
  const last = i === GIGA_LEVEL_COUNT - 1;
  return {
    name: last ? "진짜 최종 · 끝없는 건축의 신" : `${theme.name} ${MEGA_STRUCTURES[j % MEGA_STRUCTURES.length]}${mark}`,
    emoji: last ? "🌠" : theme.emojis[j % theme.emojis.length],
    blocksNeeded: roundNice(MEGA_LEVELS[MEGA_LEVELS.length - 1].blocksNeeded * Math.pow(GIGA_LEVEL_GROWTH, i + 1), 4),
    color: last ? "from-fuchsia-500 via-amber-300 to-cyan-400" : theme.color,
  };
});

const BUILDING_LEVELS: BuildingLevel[] = [...BASE_LEVELS, ...EXTRA_LEVELS, ...MEGA_LEVELS, ...GIGA_LEVELS];

interface CountryUpgrade {
  id: string;
  name: string;
  flag: string;
  desc: string;
  cost: number;
  clickBonus: number;
  autoBonus: number;
  landmark: string;
}

const COUNTRIES: CountryUpgrade[] = [
  { id: "korea", name: "대한민국", flag: "🇰🇷", desc: "K-건축! 클릭 +10, 자동 +5", cost: 500, clickBonus: 10, autoBonus: 5, landmark: "🏯" },
  { id: "japan", name: "일본", flag: "🇯🇵", desc: "정밀 건축! 클릭 +20, 자동 +10", cost: 2000, clickBonus: 20, autoBonus: 10, landmark: "⛩️" },
  { id: "china", name: "중국", flag: "🇨🇳", desc: "만리장성! 클릭 +50, 자동 +30", cost: 8000, clickBonus: 50, autoBonus: 30, landmark: "🏯" },
  { id: "usa", name: "미국", flag: "🇺🇸", desc: "마천루! 클릭 +100, 자동 +60", cost: 25000, clickBonus: 100, autoBonus: 60, landmark: "🗽" },
  { id: "egypt", name: "이집트", flag: "🇪🇬", desc: "피라미드! 클릭 +200, 자동 +150", cost: 80000, clickBonus: 200, autoBonus: 150, landmark: "🔺" },
  { id: "france", name: "프랑스", flag: "🇫🇷", desc: "에펠탑! 클릭 +500, 자동 +300", cost: 200000, clickBonus: 500, autoBonus: 300, landmark: "🗼" },
  { id: "uae", name: "UAE", flag: "🇦🇪", desc: "부르즈칼리파! 클릭 +1000, 자동 +700", cost: 500000, clickBonus: 1000, autoBonus: 700, landmark: "🏙️" },
  { id: "space", name: "우주", flag: "🌌", desc: "우주 정거장! 클릭 +3000, 자동 +2000", cost: 2000000, clickBonus: 3000, autoBonus: 2000, landmark: "🛸" },
  // 우주 다음 10개국. 뒤로 갈수록 가격이 약 4배, 보너스도 그만큼 커진다.
  { id: "uk", name: "영국", flag: "🇬🇧", desc: "빅벤! 클릭 +8K, 자동 +10K", cost: 5e6, clickBonus: 8e3, autoBonus: 1e4, landmark: "🕰️" },
  { id: "germany", name: "독일", flag: "🇩🇪", desc: "노이슈반슈타인 성! 클릭 +30K, 자동 +40K", cost: 2e7, clickBonus: 3e4, autoBonus: 4e4, landmark: "🏰" },
  { id: "italy", name: "이탈리아", flag: "🇮🇹", desc: "콜로세움! 클릭 +120K, 자동 +160K", cost: 8e7, clickBonus: 1.2e5, autoBonus: 1.6e5, landmark: "🏟️" },
  { id: "greece", name: "그리스", flag: "🇬🇷", desc: "파르테논 신전! 클릭 +450K, 자동 +600K", cost: 3e8, clickBonus: 4.5e5, autoBonus: 6e5, landmark: "🏛️" },
  { id: "india", name: "인도", flag: "🇮🇳", desc: "타지마할! 클릭 +1.5M, 자동 +2M", cost: 1e9, clickBonus: 1.5e6, autoBonus: 2e6, landmark: "🕌" },
  { id: "russia", name: "러시아", flag: "🇷🇺", desc: "성 바실리 성당! 클릭 +7.5M, 자동 +10M", cost: 5e9, clickBonus: 7.5e6, autoBonus: 1e7, landmark: "⛪" },
  { id: "brazil", name: "브라질", flag: "🇧🇷", desc: "거대 예수상! 클릭 +30M, 자동 +40M", cost: 2e10, clickBonus: 3e7, autoBonus: 4e7, landmark: "⛰️" },
  { id: "canada", name: "캐나다", flag: "🇨🇦", desc: "CN 타워! 클릭 +150M, 자동 +200M", cost: 1e11, clickBonus: 1.5e8, autoBonus: 2e8, landmark: "🗼" },
  { id: "australia", name: "호주", flag: "🇦🇺", desc: "오페라 하우스! 클릭 +750M, 자동 +1B", cost: 5e11, clickBonus: 7.5e8, autoBonus: 1e9, landmark: "🎭" },
  { id: "mexico", name: "멕시코", flag: "🇲🇽", desc: "치첸이트사 피라미드! 클릭 +3B, 자동 +4B", cost: 2e12, clickBonus: 3e9, autoBonus: 4e9, landmark: "🛕" },
  // 멕시코 다음 20개국. 가격은 4배씩, 보너스는 가격에 맞춰 커진다(자동 = 가격의 0.2%, 클릭 = 자동의 3/4).
  { id: "spain", name: "스페인", flag: "🇪🇸", desc: "사그라다 파밀리아! 클릭 +12B, 자동 +16B", cost: 8e12, clickBonus: 1.2e10, autoBonus: 1.6e10, landmark: "🕍" },
  { id: "netherlands", name: "네덜란드", flag: "🇳🇱", desc: "풍차 마을! 클릭 +48B, 자동 +64B", cost: 3e13, clickBonus: 4.8e10, autoBonus: 6.4e10, landmark: "🌷" },
  { id: "switzerland", name: "스위스", flag: "🇨🇭", desc: "알프스 산장! 클릭 +192B, 자동 +256B", cost: 1e14, clickBonus: 1.92e11, autoBonus: 2.56e11, landmark: "🏔️" },
  { id: "turkiye", name: "튀르키예", flag: "🇹🇷", desc: "아야 소피아! 클릭 +768B, 자동 +1T", cost: 5e14, clickBonus: 7.68e11, autoBonus: 1.02e12, landmark: "🧿" },
  { id: "mongolia", name: "몽골", flag: "🇲🇳", desc: "초원의 게르 도시! 클릭 +3.1T, 자동 +4.1T", cost: 2e15, clickBonus: 3.07e12, autoBonus: 4.1e12, landmark: "⛺" },
  { id: "peru", name: "페루", flag: "🇵🇪", desc: "마추픽추! 클릭 +12.3T, 자동 +16.4T", cost: 8e15, clickBonus: 1.23e13, autoBonus: 1.64e13, landmark: "🦙" },
  { id: "cambodia", name: "캄보디아", flag: "🇰🇭", desc: "앙코르와트! 클릭 +49.2T, 자동 +65.5T", cost: 3e16, clickBonus: 4.92e13, autoBonus: 6.55e13, landmark: "🐘" },
  { id: "thailand", name: "태국", flag: "🇹🇭", desc: "황금 왕궁! 클릭 +197T, 자동 +262T", cost: 1e17, clickBonus: 1.97e14, autoBonus: 2.62e14, landmark: "🏯" },
  { id: "vietnam", name: "베트남", flag: "🇻🇳", desc: "하롱베이 수상 마을! 클릭 +786T, 자동 +1Qa", cost: 5e17, clickBonus: 7.86e14, autoBonus: 1.05e15, landmark: "⛵" },
  { id: "singapore", name: "싱가포르", flag: "🇸🇬", desc: "마리나 베이 샌즈! 클릭 +3.1Qa, 자동 +4.2Qa", cost: 2e18, clickBonus: 3.15e15, autoBonus: 4.19e15, landmark: "🌃" },
  { id: "saudi", name: "사우디아라비아", flag: "🇸🇦", desc: "사막의 킹덤 타워! 클릭 +12.6Qa, 자동 +16.8Qa", cost: 8e18, clickBonus: 1.26e16, autoBonus: 1.68e16, landmark: "🐪" },
  { id: "southafrica", name: "남아공", flag: "🇿🇦", desc: "테이블 마운틴! 클릭 +50.3Qa, 자동 +67.1Qa", cost: 3e19, clickBonus: 5.03e16, autoBonus: 6.71e16, landmark: "🦁" },
  { id: "kenya", name: "케냐", flag: "🇰🇪", desc: "사파리 요새! 클릭 +201Qa, 자동 +268Qa", cost: 1e20, clickBonus: 2.01e17, autoBonus: 2.68e17, landmark: "🦒" },
  { id: "argentina", name: "아르헨티나", flag: "🇦🇷", desc: "이과수 폭포 다리! 클릭 +805Qa, 자동 +1.1Qi", cost: 5e20, clickBonus: 8.05e17, autoBonus: 1.07e18, landmark: "💦" },
  { id: "chile", name: "칠레", flag: "🇨🇱", desc: "모아이 석상! 클릭 +3.2Qi, 자동 +4.3Qi", cost: 2e21, clickBonus: 3.22e18, autoBonus: 4.29e18, landmark: "🗿" },
  { id: "norway", name: "노르웨이", flag: "🇳🇴", desc: "피오르 성! 클릭 +12.9Qi, 자동 +17.2Qi", cost: 9e21, clickBonus: 1.29e19, autoBonus: 1.72e19, landmark: "🏞️" },
  { id: "finland", name: "핀란드", flag: "🇫🇮", desc: "산타 마을! 클릭 +51.5Qi, 자동 +68.7Qi", cost: 3e22, clickBonus: 5.15e19, autoBonus: 6.87e19, landmark: "🎅" },
  { id: "iceland", name: "아이슬란드", flag: "🇮🇸", desc: "빙하 궁전! 클릭 +206Qi, 자동 +275Qi", cost: 1e23, clickBonus: 2.06e20, autoBonus: 2.75e20, landmark: "🧊" },
  { id: "newzealand", name: "뉴질랜드", flag: "🇳🇿", desc: "호빗 마을! 클릭 +825Qi, 자동 +1.1Sx", cost: 5e23, clickBonus: 8.25e20, autoBonus: 1.1e21, landmark: "🏡" },
  { id: "antarctica", name: "남극", flag: "🇦🇶", desc: "펭귄 기지! 클릭 +3.3Sx, 자동 +4.4Sx", cost: 2e24, clickBonus: 3.3e21, autoBonus: 4.4e21, landmark: "🐧" },
  // 남극 다음 50개국. 가격은 4배씩, 보너스(1000배 적용 전)는 가격에 맞춰 커진다.
  { id: "portugal", name: "포르투갈", flag: "🇵🇹", desc: "벨렘 탑!", cost: 8e24, clickBonus: 1.2e22, autoBonus: 1.6e22, landmark: "⚓" },
  { id: "belgium", name: "벨기에", flag: "🇧🇪", desc: "아토미움!", cost: 3.2e25, clickBonus: 4.8e22, autoBonus: 6.4e22, landmark: "⚛️" },
  { id: "austria", name: "오스트리아", flag: "🇦🇹", desc: "쇤브룬 궁전!", cost: 1.28e26, clickBonus: 1.92e23, autoBonus: 2.56e23, landmark: "🎼" },
  { id: "czech", name: "체코", flag: "🇨🇿", desc: "프라하 성!", cost: 5.12e26, clickBonus: 7.68e23, autoBonus: 1.02e24, landmark: "🏰" },
  { id: "poland", name: "폴란드", flag: "🇵🇱", desc: "바벨 성!", cost: 2.05e27, clickBonus: 3.07e24, autoBonus: 4.1e24, landmark: "🐉" },
  { id: "hungary", name: "헝가리", flag: "🇭🇺", desc: "국회의사당!", cost: 8.19e27, clickBonus: 1.23e25, autoBonus: 1.64e25, landmark: "🏛️" },
  { id: "sweden", name: "스웨덴", flag: "🇸🇪", desc: "얼음 호텔!", cost: 3.28e28, clickBonus: 4.92e25, autoBonus: 6.55e25, landmark: "🧊" },
  { id: "denmark", name: "덴마크", flag: "🇩🇰", desc: "레고 하우스!", cost: 1.31e29, clickBonus: 1.97e26, autoBonus: 2.62e26, landmark: "🧱" },
  { id: "ireland", name: "아일랜드", flag: "🇮🇪", desc: "모허 절벽!", cost: 5.24e29, clickBonus: 7.86e26, autoBonus: 1.05e27, landmark: "☘️" },
  { id: "croatia", name: "크로아티아", flag: "🇭🇷", desc: "두브로브니크 성벽!", cost: 2.1e30, clickBonus: 3.15e27, autoBonus: 4.19e27, landmark: "🏯" },
  { id: "ukraine", name: "우크라이나", flag: "🇺🇦", desc: "황금 돔 성당!", cost: 8.39e30, clickBonus: 1.26e28, autoBonus: 1.68e28, landmark: "🌻" },
  { id: "romania", name: "루마니아", flag: "🇷🇴", desc: "드라큘라 성!", cost: 3.36e31, clickBonus: 5.03e28, autoBonus: 6.71e28, landmark: "🦇" },
  { id: "bulgaria", name: "불가리아", flag: "🇧🇬", desc: "릴라 수도원!", cost: 1.34e32, clickBonus: 2.01e29, autoBonus: 2.68e29, landmark: "🌹" },
  { id: "serbia", name: "세르비아", flag: "🇷🇸", desc: "베오그라드 요새!", cost: 5.37e32, clickBonus: 8.05e29, autoBonus: 1.07e30, landmark: "🛡️" },
  { id: "estonia", name: "에스토니아", flag: "🇪🇪", desc: "탈린 구시가지!", cost: 2.15e33, clickBonus: 3.22e30, autoBonus: 4.29e30, landmark: "🏘️" },
  { id: "latvia", name: "라트비아", flag: "🇱🇻", desc: "리가 대성당!", cost: 8.59e33, clickBonus: 1.29e31, autoBonus: 1.72e31, landmark: "⛪" },
  { id: "lithuania", name: "리투아니아", flag: "🇱🇹", desc: "트라카이 성!", cost: 3.44e34, clickBonus: 5.15e31, autoBonus: 6.87e31, landmark: "🛶" },
  { id: "georgia", name: "조지아", flag: "🇬🇪", desc: "카즈베기 교회!", cost: 1.37e35, clickBonus: 2.06e32, autoBonus: 2.75e32, landmark: "⛰️" },
  { id: "armenia", name: "아르메니아", flag: "🇦🇲", desc: "아라라트 수도원!", cost: 5.5e35, clickBonus: 8.25e32, autoBonus: 1.1e33, landmark: "🍑" },
  { id: "iran", name: "이란", flag: "🇮🇷", desc: "이맘 광장!", cost: 2.2e36, clickBonus: 3.3e33, autoBonus: 4.4e33, landmark: "🕌" },
  { id: "iraq", name: "이라크", flag: "🇮🇶", desc: "바빌론 공중정원!", cost: 8.8e36, clickBonus: 1.32e34, autoBonus: 1.76e34, landmark: "🌿" },
  { id: "israel", name: "이스라엘", flag: "🇮🇱", desc: "예루살렘 성벽!", cost: 3.52e37, clickBonus: 5.28e34, autoBonus: 7.04e34, landmark: "🧱" },
  { id: "jordan", name: "요르단", flag: "🇯🇴", desc: "페트라!", cost: 1.41e38, clickBonus: 2.11e35, autoBonus: 2.81e35, landmark: "🏜️" },
  { id: "qatar", name: "카타르", flag: "🇶🇦", desc: "루사일 경기장!", cost: 5.63e38, clickBonus: 8.44e35, autoBonus: 1.13e36, landmark: "⚽" },
  { id: "kuwait", name: "쿠웨이트", flag: "🇰🇼", desc: "쿠웨이트 타워!", cost: 2.25e39, clickBonus: 3.38e36, autoBonus: 4.5e36, landmark: "🗼" },
  { id: "oman", name: "오만", flag: "🇴🇲", desc: "술탄 카부스 모스크!", cost: 9.01e39, clickBonus: 1.35e37, autoBonus: 1.8e37, landmark: "🕌" },
  { id: "pakistan", name: "파키스탄", flag: "🇵🇰", desc: "바드샤히 모스크!", cost: 3.6e40, clickBonus: 5.4e37, autoBonus: 7.21e37, landmark: "🌙" },
  { id: "bangladesh", name: "방글라데시", flag: "🇧🇩", desc: "국회의사당!", cost: 1.44e41, clickBonus: 2.16e38, autoBonus: 2.88e38, landmark: "🏛️" },
  { id: "nepal", name: "네팔", flag: "🇳🇵", desc: "에베레스트 베이스캠프!", cost: 5.76e41, clickBonus: 8.65e38, autoBonus: 1.15e39, landmark: "🏔️" },
  { id: "srilanka", name: "스리랑카", flag: "🇱🇰", desc: "시기리야 바위 요새!", cost: 2.31e42, clickBonus: 3.46e39, autoBonus: 4.61e39, landmark: "🪨" },
  { id: "myanmar", name: "미얀마", flag: "🇲🇲", desc: "쉐다곤 파고다!", cost: 9.22e42, clickBonus: 1.38e40, autoBonus: 1.84e40, landmark: "🛕" },
  { id: "laos", name: "라오스", flag: "🇱🇦", desc: "탓루앙 사원!", cost: 3.69e43, clickBonus: 5.53e40, autoBonus: 7.38e40, landmark: "🪷" },
  { id: "malaysia", name: "말레이시아", flag: "🇲🇾", desc: "페트로나스 트윈 타워!", cost: 1.48e44, clickBonus: 2.21e41, autoBonus: 2.95e41, landmark: "🏙️" },
  { id: "indonesia", name: "인도네시아", flag: "🇮🇩", desc: "보로부두르!", cost: 5.9e44, clickBonus: 8.85e41, autoBonus: 1.18e42, landmark: "🌋" },
  { id: "philippines", name: "필리핀", flag: "🇵🇭", desc: "초콜릿 힐스!", cost: 2.36e45, clickBonus: 3.54e42, autoBonus: 4.72e42, landmark: "🍫" },
  { id: "taiwan", name: "대만", flag: "🇹🇼", desc: "타이베이 101!", cost: 9.44e45, clickBonus: 1.42e43, autoBonus: 1.89e43, landmark: "🧋" },
  { id: "kazakhstan", name: "카자흐스탄", flag: "🇰🇿", desc: "바이테렉 타워!", cost: 3.78e46, clickBonus: 5.67e43, autoBonus: 7.56e43, landmark: "🥚" },
  { id: "uzbekistan", name: "우즈베키스탄", flag: "🇺🇿", desc: "레기스탄 광장!", cost: 1.51e47, clickBonus: 2.27e44, autoBonus: 3.02e44, landmark: "🔷" },
  { id: "morocco", name: "모로코", flag: "🇲🇦", desc: "하산 2세 모스크!", cost: 6.04e47, clickBonus: 9.07e44, autoBonus: 1.21e45, landmark: "🐫" },
  { id: "algeria", name: "알제리", flag: "🇩🇿", desc: "순교자 기념탑!", cost: 2.42e48, clickBonus: 3.63e45, autoBonus: 4.84e45, landmark: "🌴" },
  { id: "tunisia", name: "튀니지", flag: "🇹🇳", desc: "카르타고 유적!", cost: 9.67e48, clickBonus: 1.45e46, autoBonus: 1.93e46, landmark: "🏺" },
  { id: "nigeria", name: "나이지리아", flag: "🇳🇬", desc: "주마 바위!", cost: 3.87e49, clickBonus: 5.8e46, autoBonus: 7.74e46, landmark: "🪨" },
  { id: "ghana", name: "가나", flag: "🇬🇭", desc: "케이프코스트 성!", cost: 1.55e50, clickBonus: 2.32e47, autoBonus: 3.09e47, landmark: "🏖️" },
  { id: "ethiopia", name: "에티오피아", flag: "🇪🇹", desc: "랄리벨라 암굴 교회!", cost: 6.19e50, clickBonus: 9.28e47, autoBonus: 1.24e48, landmark: "⛪" },
  { id: "tanzania", name: "탄자니아", flag: "🇹🇿", desc: "킬리만자로 산장!", cost: 2.48e51, clickBonus: 3.71e48, autoBonus: 4.95e48, landmark: "🦓" },
  { id: "madagascar", name: "마다가스카르", flag: "🇲🇬", desc: "바오밥 거리!", cost: 9.9e51, clickBonus: 1.49e49, autoBonus: 1.98e49, landmark: "🌳" },
  { id: "colombia", name: "콜롬비아", flag: "🇨🇴", desc: "소금 대성당!", cost: 3.96e52, clickBonus: 5.94e49, autoBonus: 7.92e49, landmark: "🧂" },
  { id: "venezuela", name: "베네수엘라", flag: "🇻🇪", desc: "엔젤 폭포!", cost: 1.58e53, clickBonus: 2.38e50, autoBonus: 3.17e50, landmark: "💧" },
  { id: "cuba", name: "쿠바", flag: "🇨🇺", desc: "아바나 요새!", cost: 6.34e53, clickBonus: 9.51e50, autoBonus: 1.27e51, landmark: "🚗" },
  { id: "jamaica", name: "자메이카", flag: "🇯🇲", desc: "블루마운틴 커피 농장!", cost: 2.54e54, clickBonus: 3.8e51, autoBonus: 5.07e51, landmark: "☕" },
];

/** 나라 보너스 배율. 표의 clickBonus·autoBonus 에 곱해서 준다. */
const COUNTRY_POWER = 5000;

/** 나라 카드 설명: "에펠탑!" 부분만 표에서 쓰고 숫자는 실제 보너스로 만든다(배율이 바뀌어도 어긋나지 않게). */
function countryDesc(country: CountryUpgrade): string {
  const title = country.desc.split("!")[0];
  return `${title}! 클릭 +${formatNumber(country.clickBonus * COUNTRY_POWER)}, 자동 +${formatNumber(country.autoBonus * COUNTRY_POWER)}`;
}

// --- 자동 클릭 ---
/** 단계별 초당 자동 클릭 횟수와 그 단계로 올리는 비용(블록). index 0 은 "없음". */
const AUTO_CLICK_LEVELS: { cps: number; cost: number }[] = [
  { cps: 0, cost: 0 },
  { cps: 1, cost: 500 },
  { cps: 2, cost: 5e3 },
  { cps: 4, cost: 5e4 },
  { cps: 6, cost: 5e5 },
  { cps: 10, cost: 5e6 },
  { cps: 15, cost: 5e7 },
  { cps: 20, cost: 5e8 },
  { cps: 30, cost: 5e9 },
  { cps: 40, cost: 5e10 },
  { cps: 50, cost: 5e11 },
];
const AUTO_CLICK_TICK_MS = 250;

// --- 같이 건축하는 펫 ---
type PetPower = "auto" | "clickPct" | "autoClick" | "allPct";

interface Pet {
  id: string;
  name: string;
  emoji: string;
  /** 무엇을 하는 펫인지 한 줄 소개 */
  job: string;
  power: PetPower;
  /** 레벨 1 마다 늘어나는 양. auto 는 초당 블록, clickPct·allPct 는 %, autoClick 은 초당 횟수 */
  perLevel: number;
  baseCost: number;
}

const PET_MAX_LEVEL = 1000;
/** 모두 입양하기 버튼 한 번에 펫마다 올리는 레벨 */
const PET_BULK_LEVELS = 50;
/** 레벨이 1000까지 가므로 비용은 1.15배씩만 오른다(3배씩이면 금방 계산할 수 없는 수가 된다). */
const PET_COST_MULTIPLIER = 1.15;
/** 펫 능력 배율. 표의 perLevel 에 곱한다. */
const PET_POWER = 5000;

const PETS: Pet[] = [
  { id: "dog", name: "멍멍이", emoji: "🐶", job: "벽돌을 물어 와요", power: "auto", perLevel: 100, baseCost: 1e3 },
  { id: "cat", name: "야옹이", emoji: "🐱", job: "망치질을 도와줘요", power: "clickPct", perLevel: 10, baseCost: 1e4 },
  { id: "rabbit", name: "깡총이", emoji: "🐰", job: "대신 폴짝폴짝 클릭해요", power: "autoClick", perLevel: 1, baseCost: 5e4 },
  { id: "bear", name: "곰돌이", emoji: "🐻", job: "무거운 기둥을 번쩍!", power: "auto", perLevel: 2e4, baseCost: 1e6 },
  { id: "beaver", name: "비버", emoji: "🦫", job: "타고난 댐 건축가", power: "auto", perLevel: 2e6, baseCost: 1e8 },
  { id: "owl", name: "부엉이", emoji: "🦉", job: "똑똑한 설계도를 그려요", power: "allPct", perLevel: 5, baseCost: 1e9 },
  { id: "dragon", name: "드래곤", emoji: "🐉", job: "불로 블록을 구워요", power: "auto", perLevel: 5e8, baseCost: 1e11 },
  { id: "unicorn", name: "유니콘", emoji: "🦄", job: "무지개 마법으로 모든 게 빨라져요", power: "allPct", perLevel: 20, baseCost: 1e13 },
  // 새 펫 20마리. 입양 비용이 10배씩 오른다.
  { id: "panda", name: "판다", emoji: "🐼", job: "대나무 비계를 세워요", power: "auto", perLevel: 5e11, baseCost: 1e14 },
  { id: "lion", name: "사자", emoji: "🦁", job: "어흥! 현장 반장", power: "clickPct", perLevel: 50, baseCost: 1e15 },
  { id: "penguin", name: "펭귄", emoji: "🐧", job: "줄지어 콕콕 클릭해요", power: "autoClick", perLevel: 5, baseCost: 1e16 },
  { id: "elephant", name: "코끼리", emoji: "🐘", job: "코로 기둥을 들어 올려요", power: "auto", perLevel: 5e13, baseCost: 1e17 },
  { id: "shark", name: "상어", emoji: "🦈", job: "바닷속 도시를 지어요", power: "auto", perLevel: 5e14, baseCost: 1e18 },
  { id: "peacock", name: "공작", emoji: "🦚", job: "화려한 장식 담당", power: "allPct", perLevel: 30, baseCost: 1e19 },
  { id: "octopus", name: "문어", emoji: "🐙", job: "여덟 다리로 동시에 클릭", power: "autoClick", perLevel: 10, baseCost: 1e20 },
  { id: "trex", name: "티라노", emoji: "🦖", job: "쿵쾅쿵쾅 땅 다지기", power: "auto", perLevel: 5e17, baseCost: 1e21 },
  { id: "turtle", name: "거북", emoji: "🐢", job: "느리지만 절대 안 쉬어요", power: "auto", perLevel: 5e18, baseCost: 1e22 },
  { id: "eagle", name: "독수리", emoji: "🦅", job: "하늘에서 설계를 봐요", power: "clickPct", perLevel: 100, baseCost: 1e23 },
  { id: "wolf", name: "늑대", emoji: "🐺", job: "무리 지어 건축해요", power: "auto", perLevel: 5e20, baseCost: 1e24 },
  { id: "butterfly", name: "나비", emoji: "🦋", job: "날갯짓 한 번에 모든 게 바뀌어요", power: "allPct", perLevel: 50, baseCost: 1e25 },
  { id: "whale", name: "고래", emoji: "🐳", job: "바다만 한 블록을 날라요", power: "auto", perLevel: 5e22, baseCost: 1e26 },
  { id: "gumiho", name: "구미호", emoji: "🦊", job: "꼬리 아홉 개로 클릭", power: "autoClick", perLevel: 20, baseCost: 1e27 },
  { id: "phoenix", name: "불사조", emoji: "🐦‍🔥", job: "불타도 다시 지어요", power: "auto", perLevel: 5e24, baseCost: 1e28 },
  { id: "bluedragon", name: "청룡", emoji: "🐲", job: "하늘의 수호신", power: "allPct", perLevel: 100, baseCost: 1e29 },
  { id: "kraken", name: "크라켄", emoji: "🦑", job: "심해의 거대 건축가", power: "auto", perLevel: 5e26, baseCost: 1e30 },
  { id: "spacemonster", name: "우주 괴물", emoji: "👾", job: "행성을 통째로 쌓아요", power: "auto", perLevel: 5e27, baseCost: 1e31 },
  { id: "robopet", name: "로봇 강아지", emoji: "🤖", job: "쉬지 않고 초고속 클릭", power: "autoClick", perLevel: 50, baseCost: 1e32 },
  { id: "starspirit", name: "별의 정령", emoji: "🌟", job: "별빛으로 모든 것을 키워요", power: "allPct", perLevel: 200, baseCost: 1e33 },
];

function petCost(pet: Pet, level: number): number {
  return Math.floor(pet.baseCost * Math.pow(PET_COST_MULTIPLIER, level));
}

function petEffectText(pet: Pet, level: number): string {
  const v = pet.perLevel * PET_POWER * Math.max(1, level);
  switch (pet.power) {
    case "auto":
      return `초당 +${formatNumber(v)} 블록`;
    case "clickPct":
      return `클릭 +${formatNumber(v)}%`;
    case "autoClick":
      return `자동 클릭 +${formatNumber(v)}회/초`;
    case "allPct":
      return `모든 생산 +${formatNumber(v)}%`;
  }
}

function formatNumber(n: number): string {
  // 초월 이후 등급으로 블록이 Sx(1e21)~Oc(1e27)까지 커진다. 큰 단위부터 검사해야 한다.
  if (n >= 1e30) return n.toExponential(1).replace("e+", "e");
  if (n >= 1e27) return (n / 1e27).toFixed(1) + "Oc";
  if (n >= 1e24) return (n / 1e24).toFixed(1) + "Sp";
  if (n >= 1e21) return (n / 1e21).toFixed(1) + "Sx";
  if (n >= 1e18) return (n / 1e18).toFixed(1) + "Qi";
  if (n >= 1e15) return (n / 1e15).toFixed(1) + "Qa";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.floor(n));
}

const BUILD_SAVE_KEY = "building_save";
const BUILD_MAX_OFFLINE_MIN = 480;

interface BuildSave {
  blocks: number; totalBlocks: number; clickPower: number; autoPerSec: number;
  upgradeLevels: Record<string, number>; ownedCountries: Record<string, boolean>;
  timestamp: number;
  // 아래는 나중에 추가된 값이라 옛 저장에는 없다.
  autoClickLevel?: number; autoClickOn?: boolean; petLevels?: Record<string, number>;
  /** 저장 시점의 실제 초당 생산량(펫·보너스 포함). 오프라인 보상에 쓴다. */
  effectiveAuto?: number;
  /** 이 저장에서 나라 보너스에 적용된 배율. 옛 저장은 1(없음)이다. */
  countryPower?: number;
}

interface BuildOfflineReward { minutes: number; blocksGained: number; }

export default function BuildingPage() {
  const [blocks, setBlocks] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [autoPerSec, setAutoPerSec] = useState(0);
  const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({});
  const [clickEffects, setClickEffects] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [ownedCountries, setOwnedCountries] = useState<Record<string, boolean>>({});
  const [showCountries, setShowCountries] = useState(false);
  const [offlineReward, setOfflineReward] = useState<BuildOfflineReward | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [autoClickLevel, setAutoClickLevel] = useState(0);
  const [autoClickOn, setAutoClickOn] = useState(true);
  const [petLevels, setPetLevels] = useState<Record<string, number>>({});
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  /** 자동 클릭 손가락의 위치(%). 누를 때마다 옮겨 간다. */
  const [tapAt, setTapAt] = useState<{ x: number; y: number; n: number } | null>(null);
  const nextEffectId = useRef(0);
  const clickAreaRef = useRef<HTMLButtonElement>(null);
  const autoClickAccRef = useRef(0);

  // --- 펫·자동 클릭을 반영한 실제 생산량 ---
  let petAuto = 0;
  let petClickPct = 0;
  let petAllPct = 0;
  let petCps = 0;
  for (const pet of PETS) {
    const lv = petLevels[pet.id] || 0;
    if (lv === 0) continue;
    const v = pet.perLevel * PET_POWER * lv;
    if (pet.power === "auto") petAuto += v;
    else if (pet.power === "clickPct") petClickPct += v;
    else if (pet.power === "allPct") petAllPct += v;
    else petCps += v;
  }
  const allMult = 1 + petAllPct / 100;
  const effectiveClick = Math.floor(clickPower * (1 + petClickPct / 100) * allMult);
  const effectiveAuto = Math.floor((autoPerSec + petAuto) * allMult);
  const autoCps = AUTO_CLICK_LEVELS[autoClickLevel].cps + petCps;

  // --- Load save on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILD_SAVE_KEY);
      if (!raw) { setLoaded(true); return; }
      const s: BuildSave = JSON.parse(raw);
      setBlocks(s.blocks); setTotalBlocks(s.totalBlocks);
      setClickPower(s.clickPower); setAutoPerSec(s.autoPerSec);
      setUpgradeLevels(s.upgradeLevels); setOwnedCountries(s.ownedCountries);
      // 나라 보너스 배율이 지금보다 낮을 때 산 나라는, 차이만큼 한 번 더 얹어 준다(1 → 1000 → 5000).
      const oldPower = s.countryPower ?? 1;
      if (oldPower < COUNTRY_POWER) {
        const owned = COUNTRIES.filter((c) => s.ownedCountries[c.id]);
        const extra = COUNTRY_POWER - oldPower;
        setClickPower((p) => p + owned.reduce((sum, c) => sum + c.clickBonus, 0) * extra);
        setAutoPerSec((p) => p + owned.reduce((sum, c) => sum + c.autoBonus, 0) * extra);
      }
      setAutoClickLevel(Math.min(AUTO_CLICK_LEVELS.length - 1, Math.max(0, Math.floor(s.autoClickLevel ?? 0))));
      setAutoClickOn(s.autoClickOn ?? true);
      setPetLevels(s.petLevels ?? {});
      const offlinePerSec = s.effectiveAuto ?? s.autoPerSec;
      const diffMin = Math.min(Math.floor((Date.now() - s.timestamp) / 60000), BUILD_MAX_OFFLINE_MIN);
      if (diffMin >= 1 && offlinePerSec > 0) {
        const gained = offlinePerSec * diffMin * 60;
        setBlocks((p) => p + gained);
        setTotalBlocks((p) => p + gained);
        setOfflineReward({ minutes: diffMin, blocksGained: gained });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Save periodically + on unload ---
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      const data: BuildSave = {
        blocks, totalBlocks, clickPower, autoPerSec, upgradeLevels, ownedCountries, timestamp: Date.now(),
        autoClickLevel, autoClickOn, petLevels, effectiveAuto, countryPower: COUNTRY_POWER,
      };
      localStorage.setItem(BUILD_SAVE_KEY, JSON.stringify(data));
    };
    save();
    const interval = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", save); };
  }, [loaded, blocks, totalBlocks, clickPower, autoPerSec, upgradeLevels, ownedCountries, autoClickLevel, autoClickOn, petLevels, effectiveAuto]);

  // Current building level
  const currentLevel = [...BUILDING_LEVELS].reverse().find((l) => totalBlocks >= l.blocksNeeded) || BUILDING_LEVELS[0];
  const nextLevel = BUILDING_LEVELS[BUILDING_LEVELS.indexOf(currentLevel) + 1] || null;
  const progress = nextLevel
    ? ((totalBlocks - currentLevel.blocksNeeded) / (nextLevel.blocksNeeded - currentLevel.blocksNeeded)) * 100
    : 100;

  // 초당 자동 건축(업그레이드 + 펫)
  useEffect(() => {
    if (effectiveAuto <= 0) return;
    const interval = setInterval(() => {
      setBlocks((prev) => prev + effectiveAuto);
      setTotalBlocks((prev) => prev + effectiveAuto);
    }, 1000);
    return () => clearInterval(interval);
  }, [effectiveAuto]);

  // 자동 클릭: 켜져 있으면 초당 autoCps 번 대신 눌러 준다. 짧게 끊어 더해야 부드럽게 오른다.
  useEffect(() => {
    if (!autoClickOn || autoCps <= 0) return;
    const interval = setInterval(() => {
      autoClickAccRef.current += (autoCps * AUTO_CLICK_TICK_MS) / 1000;
      const clicks = Math.floor(autoClickAccRef.current);
      if (clicks <= 0) return;
      autoClickAccRef.current -= clicks;
      const gained = clicks * effectiveClick;
      setBlocks((prev) => prev + gained);
      setTotalBlocks((prev) => prev + gained);
      // 손가락이 건물 근처를 톡 누르고, 그 자리에 +숫자가 떠오른다
      const x = 25 + Math.random() * 50;
      const y = 35 + Math.random() * 40;
      setTapAt((prev) => ({ x, y, n: (prev?.n ?? 0) + 1 }));
      const area = clickAreaRef.current;
      if (area) {
        setClickEffects((prev) => [
          ...prev.slice(-12),
          { id: nextEffectId.current++, x: (area.clientWidth * x) / 100, y: (area.clientHeight * y) / 100, value: gained },
        ]);
      }
    }, AUTO_CLICK_TICK_MS);
    return () => clearInterval(interval);
  }, [autoClickOn, autoCps, effectiveClick]);

  // Clean up click effects
  useEffect(() => {
    if (clickEffects.length === 0) return;
    const timer = setTimeout(() => {
      setClickEffects((prev) => prev.slice(1));
    }, 800);
    return () => clearTimeout(timer);
  }, [clickEffects]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBlocks((prev) => prev + effectiveClick);
      setTotalBlocks((prev) => prev + effectiveClick);
      setClickEffects((prev) => [...prev, { id: nextEffectId.current++, x, y, value: effectiveClick }]);
    },
    [effectiveClick]
  );

  const getUpgradeCost = (upgrade: Upgrade): number => {
    const level = upgradeLevels[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const cost = getUpgradeCost(upgrade);
    if (blocks < cost) return;
    setBlocks((prev) => prev - cost);
    setUpgradeLevels((prev) => ({ ...prev, [upgrade.id]: (prev[upgrade.id] || 0) + 1 }));
    if (upgrade.effect === "clickPower") {
      setClickPower((prev) => prev + upgrade.effectValue);
    } else {
      setAutoPerSec((prev) => prev + upgrade.effectValue);
    }
  };

  const buyCountry = (country: CountryUpgrade) => {
    if (blocks < country.cost || ownedCountries[country.id]) return;
    setBlocks((prev) => prev - country.cost);
    setOwnedCountries((prev) => ({ ...prev, [country.id]: true }));
    setClickPower((prev) => prev + country.clickBonus * COUNTRY_POWER);
    setAutoPerSec((prev) => prev + country.autoBonus * COUNTRY_POWER);
  };

  const buyAutoClick = () => {
    const next = AUTO_CLICK_LEVELS[autoClickLevel + 1];
    if (!next || blocks < next.cost) return;
    setBlocks((prev) => prev - next.cost);
    setAutoClickLevel((lv) => lv + 1);
    setAutoClickOn(true);
  };

  const buyPet = (pet: Pet) => {
    const lv = petLevels[pet.id] || 0;
    if (lv >= PET_MAX_LEVEL) return;
    const cost = petCost(pet, lv);
    if (blocks < cost) return;
    setBlocks((prev) => prev - cost);
    setPetLevels((prev) => ({ ...prev, [pet.id]: lv + 1 }));
  };

  /**
   * 모두 입양하기: 모든 펫을 한 번에 최대 PET_BULK_LEVELS 레벨씩 올린다(아직 없는 펫은 입양).
   * 블록이 모자라면 살 수 있는 만큼만 산다. 한 레벨씩 돌아가며 사야 비싼 펫만 빠지지 않고 골고루 오른다.
   */
  const adoptAll = () => {
    let remaining = blocks;
    const next = { ...petLevels };
    let bought = 0;
    const touched = new Set<string>();
    for (let step = 0; step < PET_BULK_LEVELS; step++) {
      let any = false;
      for (const pet of PETS) {
        const lv = next[pet.id] || 0;
        if (lv >= PET_MAX_LEVEL) continue;
        const cost = petCost(pet, lv);
        if (remaining < cost) continue;
        remaining -= cost;
        next[pet.id] = lv + 1;
        bought++;
        touched.add(pet.id);
        any = true;
      }
      if (!any) break;
    }
    if (bought === 0) {
      setBulkResult("블록이 모자라서 아무 펫도 올리지 못했어요");
      return;
    }
    const spent = blocks - remaining;
    setBlocks((prev) => prev - spent);
    setPetLevels(next);
    setBulkResult(`펫 ${touched.size}마리, 총 +${formatNumber(bought)}레벨! (🧱 ${formatNumber(spent)} 사용)`);
  };

  const ownedPets = PETS.filter((p) => (petLevels[p.id] || 0) > 0);
  const ownedCount = Object.values(ownedCountries).filter(Boolean).length;

  // Visual blocks for the building area
  const blockRows = Math.min(Math.floor(Math.sqrt(totalBlocks / 5)), 12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-cyan-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">🏗️ 건축 클리커</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">
        {/* Stats Bar */}
        <div className="mb-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">보유 블록</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">🧱 {formatNumber(blocks)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">클릭당</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">🔨 {formatNumber(effectiveClick)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">초당 자동</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">⚡ {formatNumber(effectiveAuto)}</p>
            {autoClickOn && autoCps > 0 && <p className="text-xs font-bold text-blue-500">🖱️ 자동 클릭 {autoCps}회/초</p>}
          </div>
        </div>

        {/* Building Level Progress */}
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentLevel.emoji}</span>
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">
                  {currentLevel.name}{" "}
                  <span className="text-xs font-semibold text-zinc-400">
                    {BUILDING_LEVELS.indexOf(currentLevel) + 1}단계 / {BUILDING_LEVELS.length}
                  </span>
                </p>
                <p className="text-xs text-zinc-400">총 {formatNumber(totalBlocks)}블록 건축</p>
              </div>
            </div>
            {nextLevel && (
              <div className="text-right">
                <p className="text-xs text-zinc-400">다음: {nextLevel.emoji} {nextLevel.name}</p>
                <p className="text-xs text-zinc-500">{formatNumber(nextLevel.blocksNeeded - totalBlocks)}블록 남음</p>
              </div>
            )}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${currentLevel.color} transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Click Area + Upgrades */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Click Area */}
          <div className="lg:col-span-2">
            <button
              ref={clickAreaRef}
              onClick={handleClick}
              className="relative w-full overflow-hidden rounded-3xl border-4 border-dashed border-zinc-300 bg-gradient-to-b from-sky-100 to-green-100 transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:hover:border-blue-500"
              style={{ minHeight: 320 }}
            >
              {/* Sky */}
              <div className="absolute inset-x-0 top-0 h-1/2">
                <span className="absolute left-[10%] top-[20%] text-2xl opacity-60">☁️</span>
                <span className="absolute left-[60%] top-[10%] text-xl opacity-40">☁️</span>
                <span className="absolute left-[35%] top-[30%] text-lg opacity-30">☁️</span>
                {totalBlocks >= 100000 && (
                  <>
                    <span className="absolute left-[80%] top-[5%] text-xl">⭐</span>
                    <span className="absolute left-[15%] top-[8%] text-sm">🌟</span>
                  </>
                )}
              </div>

              {/* Building visualization */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4">
                {/* Ground */}
                <div className="mb-1 h-3 w-4/5 rounded-full bg-green-500/30 dark:bg-green-900/40" />
                {/* Building icon */}
                <div className="flex flex-col items-center">
                  <span className="text-7xl drop-shadow-lg">{currentLevel.emoji}</span>
                  {/* Stacked block rows */}
                  {blockRows > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-0.5" style={{ maxWidth: 200 }}>
                      {Array.from({ length: Math.min(blockRows * 4, 48) }).map((_, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-sm bg-gradient-to-br from-amber-400 to-orange-500 opacity-80 shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 같이 건축하는 펫: 땅 위를 오가며 블록을 나른다 */}
              {ownedPets.map((pet, i) => (
                <div
                  key={pet.id}
                  className="pointer-events-none absolute bottom-3 flex flex-col items-center"
                  style={{
                    left: `${8 + ((i * 11) % 80)}%`,
                    animation: `petWalk ${5 + (i % 3) * 1.5}s ease-in-out ${i * 0.4}s infinite alternate`,
                  }}
                >
                  <span className="text-sm" style={{ animation: `petCarry 0.6s ease-in-out ${i * 0.1}s infinite` }}>
                    🧱
                  </span>
                  <span className="text-3xl drop-shadow">{pet.emoji}</span>
                  <span className="rounded-full bg-white/80 px-1.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
                    Lv.{petLevels[pet.id]}
                  </span>
                </div>
              ))}

              {/* 자동 클릭 손가락 */}
              {autoClickOn && autoCps > 0 && tapAt && (
                <span
                  key={tapAt.n}
                  className="pointer-events-none absolute text-3xl"
                  style={{ left: `${tapAt.x}%`, top: `${tapAt.y}%`, animation: "autoTap 0.25s ease-out" }}
                >
                  👆
                </span>
              )}

              {/* Click effects */}
              {clickEffects.map((effect) => (
                <span
                  key={effect.id}
                  className="pointer-events-none absolute animate-bounce text-lg font-black text-yellow-500 dark:text-yellow-400"
                  style={{
                    left: effect.x - 15,
                    top: effect.y - 20,
                    animation: "floatUp 0.8s ease-out forwards",
                  }}
                >
                  +{formatNumber(effect.value)}
                </span>
              ))}

              {/* Click prompt */}
              <p className="absolute inset-x-0 top-4 text-center text-sm font-bold text-zinc-400 dark:text-zinc-500">
                클릭해서 건축하세요!
              </p>
            </button>

            {/* 자동 클릭 */}
            <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🖱️</span>
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-white">
                      자동 클릭 {autoClickLevel > 0 && <span className="text-xs text-blue-500">Lv.{autoClickLevel}</span>}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {autoCps > 0
                        ? `초당 ${autoCps}번 대신 눌러요 → 초당 +${formatNumber(autoCps * effectiveClick)} 블록`
                        : "사면 손가락이 알아서 클릭해 줘요!"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {autoCps > 0 && (
                    <button
                      onClick={() => setAutoClickOn((on) => !on)}
                      className={`rounded-xl px-4 py-2 text-sm font-black ${
                        autoClickOn ? "bg-blue-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {autoClickOn ? "ON" : "OFF"}
                    </button>
                  )}
                  {autoClickLevel < AUTO_CLICK_LEVELS.length - 1 ? (
                    <button
                      onClick={buyAutoClick}
                      disabled={blocks < AUTO_CLICK_LEVELS[autoClickLevel + 1].cost}
                      className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-900 disabled:opacity-40"
                    >
                      {autoClickLevel === 0 ? "사기" : "강화"} → {AUTO_CLICK_LEVELS[autoClickLevel + 1].cps}회/초 · 🧱{" "}
                      {formatNumber(AUTO_CLICK_LEVELS[autoClickLevel + 1].cost)}
                    </button>
                  ) : (
                    <span className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-black text-blue-600 dark:bg-blue-950 dark:text-blue-300">최대 단계!</span>
                  )}
                </div>
              </div>
            </div>

            {/* 같이 건축하는 펫 */}
            <div className="mt-4 rounded-2xl border border-pink-200 bg-white p-4 shadow-sm dark:border-pink-900 dark:bg-zinc-900">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-zinc-900 dark:text-white">
                  🐾 같이 건축하는 펫{" "}
                  <span className="text-xs font-normal text-zinc-500">
                    ({ownedPets.length}/{PETS.length}마리 · 펫마다 최대 Lv.{PET_MAX_LEVEL})
                  </span>
                </p>
                <button
                  onClick={adoptAll}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-4 py-2 text-sm font-black text-white shadow hover:shadow-lg active:scale-95"
                >
                  🐾 모두 입양하기 (+{PET_BULK_LEVELS}레벨씩)
                </button>
              </div>
              {bulkResult && <p className="mb-3 text-center text-sm font-bold text-pink-600 dark:text-pink-400">{bulkResult}</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PETS.map((pet) => {
                  const lv = petLevels[pet.id] || 0;
                  const maxed = lv >= PET_MAX_LEVEL;
                  const cost = petCost(pet, lv);
                  const canBuy = !maxed && blocks >= cost;
                  return (
                    <button
                      key={pet.id}
                      onClick={() => buyPet(pet)}
                      disabled={!canBuy}
                      className={`rounded-2xl border p-3 text-center transition-all ${
                        lv > 0 ? "border-pink-300 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/40" : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                      } ${canBuy ? "hover:shadow-md active:scale-[0.97]" : maxed ? "" : "opacity-50"}`}
                    >
                      <div className={`text-4xl ${lv === 0 ? "grayscale" : ""}`}>{pet.emoji}</div>
                      <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                        {pet.name} {lv > 0 && <span className="text-xs text-pink-500">Lv.{lv}</span>}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{pet.job}</p>
                      <p className="mt-1 text-xs font-bold text-pink-600 dark:text-pink-400">
                        {lv > 0 ? petEffectText(pet, lv) : `${petEffectText(pet, 1)} (Lv.1)`}
                      </p>
                      <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                        {maxed ? "최대 레벨 ⭐" : `${lv === 0 ? "입양" : "레벨업"} 🧱 ${formatNumber(cost)}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upgrades */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 480 }}>
            <h3 className="text-center text-lg font-bold text-zinc-900 dark:text-white">🛒 업그레이드</h3>
            {TIER_ORDER.map((tier) => {
              const tierUpgrades = UPGRADES.filter((u) => u.tier === tier);
              const info = TIER_INFO[tier];
              return (
                <div key={tier}>
                  <div className="mb-1 mt-2 flex items-center gap-2 px-1">
                    <span className="text-sm">{info.emoji}</span>
                    <span className={`text-xs font-black ${info.text}`}>{info.label}</span>
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                  {tierUpgrades.map((upgrade) => {
                    const cost = getUpgradeCost(upgrade);
                    const level = upgradeLevels[upgrade.id] || 0;
                    const canBuy = blocks >= cost;
                    // ??? 등급은 살 수 있을 만큼 모으거나 이미 가진 것만 정체를 보여 준다
                    const hidden = tier === "mystery" && level === 0 && !canBuy;
                    return (
                      <button
                        key={upgrade.id}
                        onClick={() => buyUpgrade(upgrade)}
                        disabled={!canBuy}
                        className={`mb-1.5 w-full rounded-2xl border p-3 text-left transition-all ${
                          canBuy
                            ? `${info.activeBorder} ${info.activeBg} hover:shadow-md active:scale-[0.98]`
                            : `${info.border} ${info.bg} opacity-50`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{hidden ? "❓" : upgrade.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                {hidden ? "???" : upgrade.name}
                                {level > 0 && (
                                  <span className={`ml-1 text-xs ${info.text}`}>Lv.{level}</span>
                                )}
                              </p>
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">🧱 {formatNumber(cost)}</p>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{hidden ? "정체불명의 힘… 블록을 모으면 드러나요" : upgrade.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Upgrades Section */}
        <div className="mt-8">
          <button
            onClick={() => setShowCountries(!showCountries)}
            className="mb-4 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌍</span>
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">나라 업그레이드</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    세계 각국의 건축 기술을 해금하세요! ({ownedCount}/{COUNTRIES.length}개 보유)
                  </p>
                </div>
              </div>
              <span className="text-zinc-400">{showCountries ? "▲" : "▼"}</span>
            </div>
            {/* Owned country flags */}
            {ownedCount > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {COUNTRIES.filter((c) => ownedCountries[c.id]).map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {c.flag} {c.name} {c.landmark}
                  </span>
                ))}
              </div>
            )}
          </button>

          {showCountries && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {COUNTRIES.map((country) => {
                const owned = !!ownedCountries[country.id];
                const canBuy = blocks >= country.cost && !owned;
                return (
                  <button
                    key={country.id}
                    onClick={() => buyCountry(country)}
                    disabled={owned || !canBuy}
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      owned
                        ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40"
                        : canBuy
                        ? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-lg active:scale-[0.97] dark:border-amber-800 dark:bg-amber-950/40 dark:hover:border-amber-600"
                        : "border-zinc-200 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <span className="text-4xl">{country.flag}</span>
                    <p className="mt-2 text-lg font-black text-zinc-900 dark:text-white">{country.name}</p>
                    <p className="text-2xl">{country.landmark}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{countryDesc(country)}</p>
                    {owned ? (
                      <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">보유 중 ✅</p>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-amber-600 dark:text-amber-400">🧱 {formatNumber(country.cost)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Building Guide Toggle */}
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            📖 로블록스 건축 가이드 {showGuide ? "닫기 ▲" : "보기 ▼"}
          </button>
        </div>

        {/* Guide (collapsible) */}
        {showGuide && (
          <>
            {/* Step-by-step Guide */}
            <section className="py-16">
              <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
                📖 단계별 건축 배우기
              </h2>
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: "Roblox Studio 시작하기",
                    desc: "Roblox Studio를 열고 새로운 Baseplate 템플릿을 선택하세요. 이것이 건축의 시작점이에요!",
                    tips: [
                      "Roblox Studio는 무료로 다운로드할 수 있어요",
                      "Baseplate는 평평한 땅이라서 건축하기 좋아요",
                      "처음에는 간단한 것부터 시작해 보세요",
                    ],
                    color: "from-green-400 to-emerald-300",
                  },
                  {
                    step: 2,
                    title: "기본 블록(Part) 배치하기",
                    desc: "Part 도구를 사용해서 블록, 구, 원기둥 같은 기본 도형을 배치해 보세요.",
                    tips: [
                      "Home 탭에서 Part 버튼을 클릭해요",
                      "Block(블록), Sphere(구), Cylinder(원기둥) 중 선택할 수 있어요",
                      "마우스로 드래그하면 크기를 조절할 수 있어요",
                    ],
                    color: "from-blue-400 to-sky-300",
                  },
                  {
                    step: 3,
                    title: "이동, 크기 조절, 회전",
                    desc: "배치한 블록을 원하는 위치로 이동하고, 크기와 방향을 자유롭게 바꿔보세요.",
                    tips: [
                      "Move(이동): 블록을 원하는 곳으로 옮겨요",
                      "Scale(크기): 블록을 크게 또는 작게 만들어요",
                      "Rotate(회전): 블록을 원하는 방향으로 돌려요",
                    ],
                    color: "from-purple-400 to-violet-300",
                  },
                  {
                    step: 4,
                    title: "색상과 재질 꾸미기",
                    desc: "블록에 예쁜 색상을 입히고 다양한 재질(나무, 돌, 유리 등)을 적용해 보세요.",
                    tips: [
                      "Properties 창에서 BrickColor로 색상을 변경해요",
                      "Material 속성으로 나무, 돌, 유리 등의 재질을 선택해요",
                      "Transparency로 투명도도 조절할 수 있어요",
                    ],
                    color: "from-pink-400 to-rose-300",
                  },
                  {
                    step: 5,
                    title: "건물 만들기",
                    desc: "벽, 바닥, 지붕을 조합해서 집이나 건물을 완성해 보세요!",
                    tips: [
                      "얇고 긴 블록으로 벽을 만들어요",
                      "넓고 얇은 블록으로 바닥과 천장을 만들어요",
                      "빈 공간을 남겨서 문과 창문을 표현해요",
                    ],
                    color: "from-orange-400 to-amber-300",
                  },
                  {
                    step: 6,
                    title: "Toolbox로 모델 추가하기",
                    desc: "Toolbox에서 다른 사람들이 만든 가구, 나무, 장식물 등을 가져와서 꾸며보세요.",
                    tips: [
                      "View 탭에서 Toolbox를 열어요",
                      "검색으로 원하는 모델을 찾을 수 있어요",
                      "가져온 모델의 크기와 위치를 조절해요",
                    ],
                    color: "from-teal-400 to-cyan-300",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className={`bg-gradient-to-r ${item.color} flex items-center gap-4 px-6 py-4`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/30 text-lg font-bold text-white">
                        {item.step}
                      </span>
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    </div>
                    <div className="p-6">
                      <p className="mb-4 text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                        <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">💡 팁</p>
                        <ul className="space-y-1.5">
                          {item.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                              <span className="mt-0.5 text-blue-500">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section className="py-16">
              <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
                ⌨️ 유용한 단축키
              </h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[
                    { key: "Ctrl + Z", action: "실행 취소 (되돌리기)" },
                    { key: "Ctrl + Y", action: "다시 실행" },
                    { key: "Ctrl + D", action: "선택한 것 복제하기" },
                    { key: "Ctrl + C / V", action: "복사 / 붙여넣기" },
                    { key: "Delete", action: "선택한 것 삭제하기" },
                    { key: "F5", action: "게임 테스트 실행하기" },
                    { key: "R", action: "회전 도구" },
                    { key: "T", action: "크기 조절 도구" },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between px-6 py-4">
                      <kbd className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {shortcut.key}
                      </kbd>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{shortcut.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 dark:bg-white dark:text-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로 돌아가기
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white/50 px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-5xl text-center text-sm text-zinc-400 dark:text-zinc-500">
          <p>&copy; 2026 진유현의 로블록스 건축 클리커 🏗️</p>
        </div>
      </footer>

      {/* --- OFFLINE REWARD MODAL --- */}
      {offlineReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-blue-400 bg-gradient-to-b from-blue-50 to-white shadow-2xl dark:border-blue-700 dark:from-zinc-900 dark:to-zinc-950">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 p-5 text-center text-white">
              <span className="text-5xl">🌙</span>
              <h2 className="mt-2 text-2xl font-black">오프라인 건축!</h2>
              <p className="text-sm text-blue-100">
                {offlineReward.minutes >= 60
                  ? `${Math.floor(offlineReward.minutes / 60)}시간 ${offlineReward.minutes % 60}분`
                  : `${offlineReward.minutes}분`} 동안 자동 건축했어요!
              </p>
            </div>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <span className="text-sm text-amber-600 dark:text-amber-400">블록 획득</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">🧱 +{formatNumber(offlineReward.blocksGained)}</span>
              </div>
              <button onClick={() => setOfflineReward(null)} className="mt-2 w-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 py-3 text-lg font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                받기! 🎁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Float-up animation */}
      <style jsx global>{`
        @keyframes petWalk {
          0% { transform: translateX(-30px) scaleX(1); }
          49% { transform: translateX(30px) scaleX(1); }
          50% { transform: translateX(30px) scaleX(-1); }
          100% { transform: translateX(-30px) scaleX(-1); }
        }
        @keyframes petCarry {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes autoTap {
          0% { transform: translate(-50%, -80%) scale(1.3); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}
