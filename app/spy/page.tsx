"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============================================================
// TYPES
// ============================================================
type Agency = "블랙팬서" | "실버폭스" | "골드이글";
type Avatar = "🕵️" | "🕵️‍♀️" | "🥷" | "🦹" | "🤵";
type Screen =
  | "profile"
  | "hub"
  | "shop"
  | "mission-briefing"
  | "mission"
  | "mission-complete"
  | "mission-fail"
  | "game-complete"
  | "world2intro"
  | "world2";

interface SpyProfile {
  codename: string;
  avatar: Avatar;
  agency: Agency;
  stats: { stealth: number; hacking: number; combat: number; charm: number; stamina: number };
}

interface Gadget {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  rarity?: "rare" | "mythic";
}

const AVATARS: Avatar[] = ["🕵️", "🕵️‍♀️", "🥷", "🦹", "🤵"];
const AGENCIES: { name: Agency; color: string }[] = [
  { name: "블랙팬서", color: "from-purple-700 to-gray-900" },
  { name: "실버폭스", color: "from-gray-500 to-blue-900" },
  { name: "골드이글", color: "from-yellow-600 to-amber-900" },
];

const GADGETS: Gadget[] = [
  { id: "goggles", name: "투시 고글", icon: "🕶️", desc: "경비 패턴을 더 오래 볼 수 있어요", cost: 50 },
  { id: "silencer", name: "소음기", icon: "🔇", desc: "경비의 탐지 범위가 줄어들어요", cost: 80 },
  { id: "watch", name: "스마트워치", icon: "⌚", desc: "시간제한 미션에서 +10초", cost: 60 },
  { id: "magnet", name: "자석장갑", icon: "🧲", desc: "주변 아이템을 자동으로 획득해요", cost: 70 },
  { id: "smoke", name: "연막탄", icon: "💨", desc: "발각 시 1회 탈출 가능", cost: 100 },
  { id: "jetpack", name: "제트팩", icon: "🚀", desc: "추격전에서 장애물 1개 무시", cost: 120 },
  { id: "nightvision", name: "야간투시경", icon: "🥽", desc: "어두운 곳에서도 잘 보여요", cost: 90 },
  { id: "grapple", name: "갈고리 로프", icon: "🪝", desc: "높은 곳을 순식간에 올라요", cost: 85 },
  { id: "bug", name: "도청 장치", icon: "🎧", desc: "적의 대화를 엿들어요", cost: 75 },
  { id: "minibomb", name: "미니 폭탄", icon: "🧨", desc: "장애물을 폭파해요", cost: 130 },
  { id: "sattrack", name: "위성 추적기", icon: "🛰️", desc: "목표 위치를 알려줘요", cost: 110 },
  { id: "teleport", name: "순간이동기", icon: "🌀", desc: "짧은 거리를 순간이동", cost: 250 },
  { id: "boots", name: "강화 부츠", icon: "🦿", desc: "더 빠르게 달려요", cost: 95 },
  { id: "vest", name: "방탄 조끼", icon: "🦺", desc: "체력이 하나 늘어요", cost: 140 },
  { id: "trapkit", name: "함정 키트", icon: "🪤", desc: "적을 함정에 빠뜨려요", cost: 100 },
  { id: "flashlight", name: "초강력 손전등", icon: "🔦", desc: "적을 잠시 눈부시게 해요", cost: 65 },
  { id: "sleepgas", name: "수면 가스", icon: "🧪", desc: "적을 잠재워요", cost: 120 },
  { id: "fakeid", name: "위조 신분증", icon: "🪪", desc: "변장 미션이 쉬워져요", cost: 90 },
  { id: "jammer", name: "전파 재머", icon: "📡", desc: "적 통신을 방해해요", cost: 115 },
  { id: "drone", name: "정찰 드론", icon: "🛸", desc: "미리 맵을 정찰해요", cost: 150 },
  { id: "stickygloves", name: "접착 장갑", icon: "🧤", desc: "벽을 타고 올라요", cost: 80 },
  { id: "parachute", name: "낙하산", icon: "🪂", desc: "높은 곳에서 안전하게 착지", cost: 70 },
  { id: "gasmask", name: "방독면", icon: "⛑️", desc: "독가스 미션을 무효화해요", cost: 105 },
  { id: "masterkey", name: "만능 열쇠", icon: "🗝️", desc: "모든 잠금을 열어요", cost: 160 },
  { id: "charm", name: "행운의 부적", icon: "🧿", desc: "힌트 확률이 올라가요", cost: 55 },
  { id: "hackbot", name: "해킹 봇", icon: "🤖", desc: "해킹을 도와줘요", cost: 175 },
  { id: "holoshield", name: "홀로그램 방패", icon: "🛡️", desc: "한 번 공격을 막아요", cost: 135 },
  { id: "flashbang", name: "섬광탄", icon: "🎇", desc: "적을 기절시켜요", cost: 110 },
  { id: "freezeray", name: "냉동 광선", icon: "🧊", desc: "적을 얼려버려요", cost: 200 },
  { id: "batsonar", name: "박쥐 소나", icon: "🦇", desc: "어둠 속 적을 감지해요", cost: 95 },
  { id: "goldbadge", name: "황금 요원 배지", icon: "👑", desc: "최고 요원의 상징 (수집용)", cost: 300 },
  // ===== 전설(희귀) 장비 =====
  { id: "dragonsword", name: "용의 검", icon: "🐉", desc: "전설의 무기, 무엇이든 벤다", cost: 15000, rarity: "rare" },
  { id: "thundergloves", name: "뇌신의 장갑", icon: "⚡", desc: "번개를 자유자재로 부려요", cost: 14000, rarity: "rare" },
  { id: "galaxycloak", name: "은하 망토", icon: "🌌", desc: "완전 투명화가 가능해요", cost: 18000, rarity: "rare" },
  { id: "diamondsuit", name: "다이아 슈트", icon: "💠", desc: "체력이 어마어마하게 늘어요", cost: 16000, rarity: "rare" },
  { id: "poseidon", name: "포세이돈 창", icon: "🔱", desc: "적을 관통하는 삼지창", cost: 15500, rarity: "rare" },
  { id: "timewatch", name: "시간 정지 시계", icon: "🕰️", desc: "잠시 시간을 멈춰요", cost: 17000, rarity: "rare" },
  { id: "alleye", name: "전지의 눈", icon: "👁️", desc: "모든 것을 꿰뚫어봐요", cost: 13500, rarity: "rare" },
  { id: "phoenix", name: "불사조 깃털", icon: "🦅", desc: "죽어도 1회 부활해요", cost: 16500, rarity: "rare" },
  { id: "morphcapsule", name: "변신 캡슐", icon: "🧬", desc: "무엇으로든 변장 가능", cost: 14500, rarity: "rare" },
  { id: "meteor", name: "운석 소환기", icon: "☄️", desc: "하늘에서 운석을 떨어뜨려요", cost: 18000, rarity: "rare" },
  { id: "absoluteshield", name: "절대 방패", icon: "🛡️", desc: "모든 공격을 1회 완전 무효", cost: 17500, rarity: "rare" },
  { id: "shadowdagger", name: "그림자 단검", icon: "🗡️", desc: "그림자 속에서 기습해요", cost: 13000, rarity: "rare" },
  { id: "empbomb", name: "EMP 폭탄", icon: "🎆", desc: "모든 전자기기를 정지시켜요", cost: 15000, rarity: "rare" },
  { id: "kingcrown", name: "제왕의 왕관", icon: "👑", desc: "요원들의 왕 (초희귀 수집)", cost: 20000, rarity: "rare" },
  { id: "starfragment", name: "별의 파편", icon: "🌟", desc: "소원을 이뤄주는 별조각 (초희귀)", cost: 19000, rarity: "rare" },
  // ===== 신화(MYTHIC) 등급 장비 (1300만) =====
  { id: "genesissword", name: "창세의 검", icon: "🌠", desc: "세상을 만든 태초의 검", cost: 13000000, rarity: "mythic" },
  { id: "infinitygauntlet", name: "무한의 건틀릿", icon: "♾️", desc: "손짓 한 번에 모든 것을", cost: 13000000, rarity: "mythic" },
  { id: "fateorb", name: "운명의 수정구", icon: "🔮", desc: "미래를 미리 봐요", cost: 13000000, rarity: "mythic" },
  { id: "dragonscale", name: "천룡의 비늘", icon: "🐲", desc: "어떤 공격도 튕겨내요", cost: 13000000, rarity: "mythic" },
  { id: "godwings", name: "신의 날개", icon: "🕊️", desc: "하늘을 완전히 지배해요", cost: 13000000, rarity: "mythic" },
  { id: "doomstaff", name: "종말의 지팡이", icon: "🌋", desc: "세상을 뒤흔드는 힘", cost: 13000000, rarity: "mythic" },
  { id: "primalseal", name: "태초의 인장", icon: "⚜️", desc: "봉인된 태초의 힘", cost: 13000000, rarity: "mythic" },
  { id: "giantheart", name: "거인의 심장", icon: "🗿", desc: "무한한 생명력", cost: 13000000, rarity: "mythic" },
  { id: "stormlord", name: "폭풍의 지배자", icon: "🌪️", desc: "폭풍을 다스려요", cost: 13000000, rarity: "mythic" },
  { id: "suncrown", name: "태양의 왕관", icon: "☀️", desc: "태양의 힘을 담았어요", cost: 13000000, rarity: "mythic" },
  { id: "moonchalice", name: "달의 성배", icon: "🌙", desc: "달빛으로 회복해요", cost: 13000000, rarity: "mythic" },
  { id: "galaxytear", name: "은하의 눈물", icon: "⭐", desc: "은하가 흘린 눈물방울", cost: 13000000, rarity: "mythic" },
  { id: "eternalflame", name: "불멸의 화염", icon: "🔥", desc: "영원히 꺼지지 않는 불", cost: 13000000, rarity: "mythic" },
  { id: "eternalfrost", name: "영겁의 서리", icon: "❄️", desc: "시간마저 얼려요", cost: 13000000, rarity: "mythic" },
  { id: "thunderspear", name: "신뢰의 번개창", icon: "⚡", desc: "신들의 번개를 던져요", cost: 13000000, rarity: "mythic" },
  { id: "rainboworb", name: "무지개 오브", icon: "🌈", desc: "일곱 색의 마력", cost: 13000000, rarity: "mythic" },
  { id: "worldgem", name: "세계수의 보석", icon: "💎", desc: "세계수의 정수", cost: 13000000, rarity: "mythic" },
  { id: "ark", name: "초월의 방주", icon: "🛸", desc: "차원을 넘나들어요", cost: 13000000, rarity: "mythic" },
  { id: "omnieye", name: "전능의 눈", icon: "👁️‍🗨️", desc: "모든 것을 보고 아는 눈", cost: 13000000, rarity: "mythic" },
  { id: "guardiancharm", name: "수호신의 부적", icon: "🧿", desc: "수호신이 지켜줘요", cost: 13000000, rarity: "mythic" },
  { id: "herosword", name: "영웅왕의 성검", icon: "🗡️", desc: "전설을 넘은 영웅의 검", cost: 13000000, rarity: "mythic" },
  { id: "starbow", name: "별을 쏘는 활", icon: "🏹", desc: "별조차 맞추는 활", cost: 13000000, rarity: "mythic" },
  { id: "timebeads", name: "시공의 염주", icon: "📿", desc: "시간과 공간을 다뤄요", cost: 13000000, rarity: "mythic" },
  { id: "creatorcrown", name: "창조주의 관", icon: "👑", desc: "창조주만이 쓰는 관", cost: 13000000, rarity: "mythic" },
  { id: "cosmicegg", name: "우주의 알", icon: "🌌", desc: "새 우주가 잠든 알", cost: 13000000, rarity: "mythic" },
];

const MISSIONS = [
  { id: 1, title: "비밀 서류 훔치기", subtitle: "Steal Secret Documents", location: "대사관 🏛️", icon: "🗄️" },
  { id: 2, title: "레이저 통과하기", subtitle: "Laser Grid", location: "보안 시설 🔴", icon: "🔴" },
  { id: 3, title: "변장하기", subtitle: "Disguise", location: "비밀 파티 🎭", icon: "🎭" },
  { id: 4, title: "암호 해독", subtitle: "Code Breaking", location: "통신실 📡", icon: "📡" },
  { id: 5, title: "추격전", subtitle: "Car Chase", location: "고속도로 🛣️", icon: "🚗" },
  { id: 6, title: "해킹", subtitle: "Hacking", location: "서버실 💻", icon: "💻" },
  { id: 7, title: "보스 대결", subtitle: "Boss Fight", location: "비밀 기지 🏰", icon: "🦹‍♂️" },
  { id: 8, title: "탈출!", subtitle: "Escape!", location: "폭발하는 기지 💥", icon: "💥" },
  { id: 9, title: "폭탄 해체", subtitle: "Bomb Defusal", location: "지하 벙커 💣", icon: "💣" },
  { id: 10, title: "저격 임무", subtitle: "Sniper", location: "옥상 🎯", icon: "🎯" },
  { id: 11, title: "금고 털기", subtitle: "Safe Crack", location: "은행 금고 🏦", icon: "🔐" },
  { id: 12, title: "미행 추적", subtitle: "Tailing", location: "번화가 🚶", icon: "🚶" },
  { id: 13, title: "암호 기억", subtitle: "Memory Code", location: "관제실 🧠", icon: "🧠" },
  { id: 14, title: "철문 부수기", subtitle: "Break Door", location: "격납고 🚪", icon: "🚪" },
  { id: 15, title: "반사신경 훈련", subtitle: "Reflex", location: "훈련장 ⚡", icon: "⚡" },
  { id: 16, title: "위조지폐 감별", subtitle: "Fake Money", location: "환전소 💵", icon: "💵" },
  { id: 17, title: "금고 패턴", subtitle: "Vault Pattern", location: "비밀 금고 🔢", icon: "🔢" },
  { id: 18, title: "절벽 오르기", subtitle: "Cliff Climb", location: "절벽 🧗", icon: "🧗" },
  { id: 19, title: "지뢰밭 통과", subtitle: "Minefield", location: "국경 💥", icon: "🧨" },
  { id: 20, title: "변장 간파", subtitle: "Spot Disguise", location: "가면 무도회 🎭", icon: "🎭" },
  { id: 21, title: "모스부호", subtitle: "Morse Code", location: "무전실 📻", icon: "📻" },
  { id: 22, title: "탈옥 삽질", subtitle: "Prison Break", location: "감옥 ⛏️", icon: "⛏️" },
  { id: 23, title: "총알 피하기", subtitle: "Dodge Bullets", location: "총격전 🔫", icon: "🔫" },
  { id: 24, title: "이중스파이 색출", subtitle: "Find Mole", location: "본부 🕵️", icon: "🕵️" },
  { id: 25, title: "해킹 시퀀스", subtitle: "Hack Sequence", location: "메인프레임 💾", icon: "💾" },
  { id: 26, title: "최종 결전", subtitle: "Final Battle", location: "적 본거지 👑", icon: "👑" },
  { id: 27, title: "보스: 그림자 군주", subtitle: "Boss: Shadow Lord", location: "어둠의 성 🥷", icon: "🥷" },
  { id: 28, title: "보스: 강철 골렘", subtitle: "Boss: Steel Golem", location: "폐공장 🤖", icon: "🤖" },
  { id: 29, title: "보스: 맹독 여왕", subtitle: "Boss: Venom Queen", location: "독의 정원 🐍", icon: "🐍" },
  { id: 30, title: "보스: 화염 폭군", subtitle: "Boss: Flame Tyrant", location: "용암 요새 🔥", icon: "🔥" },
  { id: 31, title: "🔒 비밀보스: 배신자", subtitle: "Secret: The Traitor", location: "??? 🎭", icon: "🎭" },
  { id: 32, title: "🔒 비밀보스: 외계 지휘관", subtitle: "Secret: Alien Commander", location: "??? 👾", icon: "👾" },
  // ===== 숨겨진 오류(ERROR) 보스 (비밀보스 2개 클리어 시 해금) =====
  { id: 33, title: "⚠️ 오류: 글리치", subtitle: "ERROR: Glitch", location: "?̷?̷?̷ 🌀", icon: "🌀" },
  { id: 34, title: "⚠️ 오류: 크래시", subtitle: "ERROR: Crash", location: "?̸?̸?̸ 💀", icon: "💀" },
  { id: 35, title: "⚠️ 오류: 널포인터", subtitle: "ERROR: NullPointer", location: "N̸U̸L̸L̸ ⬛", icon: "⬛" },
];
// ===== 비밀 월드 2 — 미스테리 보스 13 + ??? 보스 2 =====
const WORLD2_MISSIONS = [
  { id: 36, title: "미스테리 보스: 안개", subtitle: "Mystery: Fog", location: "안개 차원 🌫️", icon: "🌫️" },
  { id: 37, title: "미스테리 보스: 거울", subtitle: "Mystery: Mirror", location: "거울 궁전 🪞", icon: "🪞" },
  { id: 38, title: "미스테리 보스: 꿈", subtitle: "Mystery: Dream", location: "꿈의 늪 💤", icon: "💤" },
  { id: 39, title: "미스테리 보스: 그림자", subtitle: "Mystery: Shade", location: "그림자 골목 👤", icon: "👤" },
  { id: 40, title: "미스테리 보스: 시계", subtitle: "Mystery: Clock", location: "멈춘 시계탑 ⏳", icon: "⏳" },
  { id: 41, title: "미스테리 보스: 가면", subtitle: "Mystery: Mask", location: "가면의 방 😷", icon: "😷" },
  { id: 42, title: "미스테리 보스: 미로", subtitle: "Mystery: Maze", location: "무한 미로 🌀", icon: "🧩" },
  { id: 43, title: "미스테리 보스: 유령", subtitle: "Mystery: Ghost", location: "유령 저택 👻", icon: "👻" },
  { id: 44, title: "미스테리 보스: 심연", subtitle: "Mystery: Abyss", location: "심연의 바다 🌊", icon: "🌊" },
  { id: 45, title: "미스테리 보스: 별자리", subtitle: "Mystery: Zodiac", location: "별자리 신전 ✨", icon: "🔯" },
  { id: 46, title: "미스테리 보스: 침묵", subtitle: "Mystery: Silence", location: "침묵의 홀 🤫", icon: "🤫" },
  { id: 47, title: "미스테리 보스: 폭풍", subtitle: "Mystery: Tempest", location: "영원한 폭풍 🌩️", icon: "🌩️" },
  { id: 48, title: "미스테리 보스: 공허", subtitle: "Mystery: Void", location: "공허의 끝 🕳️", icon: "🕳️" },
  { id: 49, title: "??? 보스", subtitle: "??? Boss", location: "?̷?̷?̷ ❓", icon: "❓" },
  { id: 50, title: "??? 보스", subtitle: "??? Boss", location: "?̸?̸?̸ ⁉️", icon: "⁉️" },
];
MISSIONS.push(...WORLD2_MISSIONS);
const VISIBLE_MISSIONS = 32; // 오류 보스(33~35)·월드2(36~50)는 숨김
const ERROR_BOSS_IDS = [33, 34, 35];
const WORLD2_IDS = WORLD2_MISSIONS.map(m => m.id);

const RANKS = [
  { name: "신입 요원", icon: "🟢", min: 0 },
  { name: "정식 요원", icon: "🔵", min: 2 },
  { name: "특수 요원", icon: "🟣", min: 4 },
  { name: "수석 요원", icon: "🟡", min: 6 },
  { name: "더블오 에이전트", icon: "⭐", min: 8 },
];

function getRank(completed: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (completed >= r.min) rank = r;
  }
  return rank;
}

// ============================================================
// TYPEWRITER TEXT
// ============================================================
function TypewriterText({ text, speed = 40, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

// ============================================================
// CODE RAIN BACKGROUND
// ============================================================
function CodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cols = Math.floor(canvas.width / 14);
    const drops: number[] = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコサシスセソ";
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f0";
      ctx.font = "14px monospace";
      for (let i = 0; i < drops.length; i++) {
        const t = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(t, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const iv = setInterval(draw, 50);
    return () => clearInterval(iv);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />;
}

// ============================================================
// MISSION 1: STEALTH
// ============================================================
function Mission1({ onWin, onFail, hasGoggles, hasSilencer, hasSmoke }: {
  onWin: (coins: number) => void; onFail: () => void;
  hasGoggles: boolean; hasSilencer: boolean; hasSmoke: boolean;
}) {
  const ROWS = 8, COLS = 10;
  const [playerPos, setPlayerPos] = useState({ r: 7, c: 0 });
  const safePos = { r: 1, c: 8 };
  const exitPos = { r: 7, c: 9 };
  const [hasSafe, setHasSafe] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [crackPhase, setCrackPhase] = useState(0);
  const [crackAngle, setCrackAngle] = useState(0);
  const [crackTargets] = useState(() => [
    Math.floor(Math.random() * 36) * 10,
    Math.floor(Math.random() * 36) * 10,
    Math.floor(Math.random() * 36) * 10,
  ]);
  const [detected, setDetected] = useState(false);
  const [smokeUsed, setSmokeUsed] = useState(false);
  const [guards, setGuards] = useState([
    { r: 3, c: 3, dir: 1, axis: "c" as const, min: 2, max: 6 },
    { r: 5, c: 7, dir: -1, axis: "r" as const, min: 3, max: 6 },
    { r: 1, c: 4, dir: 1, axis: "c" as const, min: 3, max: 7 },
  ]);
  const walls = useRef(new Set([
    "0,3", "0,4", "0,5", "2,1", "2,2", "3,6", "4,4", "4,5", "6,2", "6,3", "6,7",
  ]));

  const detectionRange = (hasSilencer ? 1 : 2) - 2; // 탐지 범위 2칸 축소 (기본 0칸, 소음기 -1=탐지 안됨)

  useEffect(() => {
    if (cracking || detected) return;
    const iv = setInterval(() => {
      setGuards(prev => prev.map(g => {
        const ng = { ...g };
        if (g.axis === "c") {
          ng.c += g.dir;
          if (ng.c >= g.max || ng.c <= g.min) ng.dir *= -1;
        } else {
          ng.r += g.dir;
          if (ng.r >= g.max || ng.r <= g.min) ng.dir *= -1;
        }
        return ng;
      }));
    }, hasGoggles ? 1360 : 1020); // 경비원 1.7배 너프 (순찰 속도 ↓)
    return () => clearInterval(iv);
  }, [cracking, detected, hasGoggles]);

  useEffect(() => {
    if (cracking || detected) return;
    for (const g of guards) {
      const dist = Math.abs(g.r - playerPos.r) + Math.abs(g.c - playerPos.c);
      if (dist <= detectionRange) {
        if (hasSmoke && !smokeUsed) {
          setSmokeUsed(true);
          return;
        }
        setDetected(true);
        setTimeout(() => onFail(), 1500);
        return;
      }
    }
  }, [guards, playerPos, cracking, detected]);

  useEffect(() => {
    if (cracking) {
      const iv = setInterval(() => {
        setCrackAngle(a => (a + 5) % 360);
      }, 50);
      return () => clearInterval(iv);
    }
  }, [cracking]);

  const move = (dr: number, dc: number) => {
    if (cracking || detected) return;
    const nr = playerPos.r + dr;
    const nc = playerPos.c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (walls.current.has(`${nr},${nc}`)) return;
    setPlayerPos({ r: nr, c: nc });
    if (nr === safePos.r && nc === safePos.c && !hasSafe) {
      setCracking(true);
    }
    if (nr === exitPos.r && nc === exitPos.c && hasSafe) {
      onWin(100);
    }
  };

  const handleCrackClick = () => {
    const diff = Math.abs(crackAngle - crackTargets[crackPhase]);
    if (diff < 30 || diff > 330) {
      if (crackPhase >= 2) {
        setCracking(false);
        setHasSafe(true);
      } else {
        setCrackPhase(p => p + 1);
      }
    }
  };

  if (cracking) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-green-400 text-lg font-bold">🔓 금고 해제 - 다이얼을 맞춰라!</h3>
        <p className="text-gray-400 text-sm">녹색 영역에서 클릭! ({crackPhase + 1}/3)</p>
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#333" strokeWidth="4" />
            {/* target zone */}
            <path
              d={describeArc(100, 100, 85, crackTargets[crackPhase] - 15, crackTargets[crackPhase] + 15)}
              fill="none" stroke="#0f0" strokeWidth="8" opacity="0.5"
            />
            {/* dial pointer */}
            <line
              x1="100" y1="100"
              x2={100 + 80 * Math.cos((crackAngle - 90) * Math.PI / 180)}
              y2={100 + 80 * Math.sin((crackAngle - 90) * Math.PI / 180)}
              stroke="#0ff" strokeWidth="3"
            />
            <circle cx="100" cy="100" r="5" fill="#0ff" />
          </svg>
        </div>
        <button onClick={handleCrackClick}
          className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg text-white font-bold text-lg">
          🔓 맞추기!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>{hasSafe ? "📄 서류 획득! 출구로!" : "🗄️ 금고로 이동하세요"}</span>
        {smokeUsed && <span className="text-yellow-400">💨 연막탄 사용됨</span>}
      </div>
      {detected && (
        <div className="text-red-500 text-xl font-bold animate-pulse">🚨 발각됨! 미션 실패!</div>
      )}
      <div className="grid gap-0.5 p-2 bg-gray-900 rounded-lg border border-green-900/50"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const isPlayer = playerPos.r === r && playerPos.c === c;
            const isGuard = guards.some(g => g.r === r && g.c === c);
            const isSafe = safePos.r === r && safePos.c === c && !hasSafe;
            const isExit = exitPos.r === r && exitPos.c === c;
            const isWall = walls.current.has(`${r},${c}`);
            const guardNear = guards.some(g =>
              Math.abs(g.r - r) + Math.abs(g.c - c) <= detectionRange
            );
            return (
              <div key={`${r}-${c}`}
                className={`w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-xs sm:text-sm rounded-sm
                  ${isWall ? "bg-gray-700" : guardNear && !isPlayer ? "bg-red-900/30" : "bg-gray-800/80"}
                  ${isPlayer ? "bg-green-900/60 ring-1 ring-green-400" : ""}
                `}>
                {isPlayer ? "🕵️" : isGuard ? "💂" : isSafe ? "🗄️" : isExit ? "🚪" : isWall ? "🧱" : ""}
              </div>
            );
          })
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <button onClick={() => move(-1, 0)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬆️</button>
        <div />
        <button onClick={() => move(0, -1)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬅️</button>
        <button onClick={() => move(1, 0)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">⬇️</button>
        <button onClick={() => move(0, 1)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 text-center">➡️</button>
      </div>
    </div>
  );
}

function describeArc(x: number, y: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, r, endAngle);
  const end = polarToCartesian(x, y, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ============================================================
// MISSION 2: LASER GRID
// ============================================================
function Mission2({ onWin, onFail, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 40 : 30;
  const [time, setTime] = useState(timeLimit);
  const [playerX, setPlayerX] = useState(5);
  const [playerY, setPlayerY] = useState(90);
  const [tick, setTick] = useState(0);
  const [hit, setHit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lasers = useRef([
    { y: 20, speed: 0.8, offset: 0 },
    { y: 40, speed: -1.2, offset: 30 },
    { y: 55, speed: 1.0, offset: 60 },
    { y: 70, speed: -0.6, offset: 10 },
    { y: 30, speed: 0.5, offset: 50 },
  ]);

  useEffect(() => {
    if (hit) return;
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 0) { onFail(); return 0; }
        return +(t - 0.1).toFixed(1);
      });
      setTick(t => t + 1);
    }, 100);
    return () => clearInterval(iv);
  }, [hit]);

  const getLaserX = (laser: typeof lasers.current[0], t: number) => {
    const raw = (laser.offset + t * laser.speed) % 100;
    return raw < 0 ? raw + 100 : raw;
  };

  useEffect(() => {
    if (hit) return;
    for (const l of lasers.current) {
      const lx = getLaserX(l, tick);
      const ly = l.y;
      if (Math.abs(lx - playerX) < 8 && Math.abs(ly - playerY) < 8) {
        setHit(true);
        setTimeout(() => onFail(), 1000);
        return;
      }
    }
    if (playerY <= 5) {
      onWin(120);
    }
  }, [tick, playerX, playerY, hit]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlayerX(x);
    setPlayerY(y);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <span className="text-red-400 font-mono text-lg">⏱️ {time.toFixed(1)}초</span>
        <span className="text-gray-400 text-sm">위쪽 끝에 도달하세요!</span>
      </div>
      {hit && <div className="text-red-500 text-xl font-bold animate-pulse">⚡ 레이저에 감지됨!</div>}
      <div ref={containerRef} onClick={handleClick}
        className="relative w-full max-w-sm h-80 bg-gray-900 rounded-lg border border-red-900/50 cursor-crosshair overflow-hidden">
        {/* goal zone */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-green-900/40 border-b border-green-500/50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs text-green-400">도착!</div>
        {/* start zone */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-blue-900/30 border-t border-blue-500/30" />
        {/* lasers */}
        {lasers.current.map((l, i) => {
          const lx = getLaserX(l, tick);
          return (
            <div key={i} className="absolute" style={{
              left: `${lx - 10}%`, top: `${l.y - 1}%`,
              width: "20%", height: "2%",
              background: "linear-gradient(90deg, transparent, #ff0000, transparent)",
              boxShadow: "0 0 10px #ff0000",
              transition: "left 0.1s linear",
            }} />
          );
        })}
        {/* player */}
        <div className="absolute text-lg transition-all duration-200"
          style={{ left: `${playerX}%`, top: `${playerY}%`, transform: "translate(-50%,-50%)" }}>
          🕵️
        </div>
      </div>
      <p className="text-gray-500 text-xs">화면을 클릭하여 이동하세요</p>
    </div>
  );
}

// ============================================================
// MISSION 3: DISGUISE
// ============================================================
function Mission3({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const allHats = ["🎩", "👒", "🧢", "👑", "🎓", "⛑️"];
  const allGlasses = ["🕶️", "👓", "🥽", "😎"];
  const allShirts = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
  const allAccessories = ["💎", "⌚", "📿", "🧣", "🎀", "🪶"];

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"show" | "pick">("show");
  const [target, setTarget] = useState({ hat: "", glasses: "", shirt: "", accessory: "" });
  const [picked, setPicked] = useState({ hat: "", glasses: "", shirt: "", accessory: "" });
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [pickStep, setPickStep] = useState(0);
  const [showHint, setShowHint] = useState(false); // 라운드당 15% 확률로 힌트 표시
  const totalRounds = 5;

  const generateTarget = useCallback(() => {
    return {
      hat: allHats[Math.floor(Math.random() * allHats.length)],
      glasses: allGlasses[Math.floor(Math.random() * allGlasses.length)],
      shirt: allShirts[Math.floor(Math.random() * allShirts.length)],
      accessory: allAccessories[Math.floor(Math.random() * allAccessories.length)],
    };
  }, []);

  useEffect(() => {
    const t = generateTarget();
    setTarget(t);
    setPicked({ hat: "", glasses: "", shirt: "", accessory: "" });
    setPickStep(0);
    setShowHint(Math.random() < 0.225); // 22.5% 확률로 이번 라운드 힌트 제공 (15% x1.5)
    setPhase("show");
    const timer = setTimeout(() => setPhase("pick"), Math.round((3000 - round * 200) * 1.25)); // 관찰 시간 25% 증가
    return () => clearTimeout(timer);
  }, [round]);

  const steps = [
    { key: "hat" as const, label: "모자", options: allHats },
    { key: "glasses" as const, label: "안경", options: allGlasses },
    { key: "shirt" as const, label: "옷 색상", options: allShirts },
    { key: "accessory" as const, label: "악세서리", options: allAccessories },
  ];

  const handlePick = (val: string) => {
    const step = steps[pickStep];
    const newPicked = { ...picked, [step.key]: val };
    setPicked(newPicked);

    if (val !== target[step.key]) {
      setMistakes(m => m + 1);
      if (mistakes + 1 >= 3) {
        onFail();
        return;
      }
    } else {
      setScore(s => s + 1);
    }

    if (pickStep < 3) {
      setPickStep(p => p + 1);
    } else {
      if (round + 1 >= totalRounds) {
        onWin(80 + score * 5);
      } else {
        setTimeout(() => setRound(r => r + 1), 800);
      }
    }
  };

  if (phase === "show") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-green-400 font-bold">👀 기억하세요! (라운드 {round + 1}/{totalRounds})</h3>
        <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-3 border border-green-500/30">
          <div className="text-5xl">{target.hat}</div>
          <div className="text-4xl">{target.glasses}</div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: target.shirt === "🔴" ? "#ef4444" : target.shirt === "🔵" ? "#3b82f6" : target.shirt === "🟢" ? "#22c55e" : target.shirt === "🟡" ? "#eab308" : target.shirt === "🟣" ? "#a855f7" : "#f97316" }}>
            👤
          </div>
          <div className="text-4xl">{target.accessory}</div>
        </div>
        <p className="text-gray-400 text-sm animate-pulse">기억하세요...</p>
      </div>
    );
  }

  const currentStep = steps[pickStep];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-green-400">라운드 {round + 1}/{totalRounds}</span>
        <span className="text-yellow-400">❌ {mistakes}/3</span>
      </div>
      <h3 className="text-cyan-400 font-bold">{currentStep.label}을(를) 고르세요!</h3>
      {showHint && <p className="text-xs text-amber-300">💡 행운의 힌트! 정답에 ✨ 표시가 있어요!</p>}
      <div className="flex gap-3 flex-wrap justify-center">
        {currentStep.options.map(opt => {
          const isHint = showHint && opt === target[currentStep.key];
          return (
            <button key={opt} onClick={() => handlePick(opt)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-colors
                ${isHint ? "bg-amber-900/40 border-2 border-amber-400 ring-2 ring-amber-300/50" : "bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500"}`}>
              {opt}
              {isHint && <span className="absolute -top-1.5 -right-1.5 text-sm">✨</span>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {steps.map((s, i) => (
          <div key={s.key} className={`px-2 py-1 rounded text-xs ${i < pickStep ? "bg-green-900 text-green-400" : i === pickStep ? "bg-cyan-900 text-cyan-400" : "bg-gray-800 text-gray-500"}`}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 4: CODE BREAKING
// ============================================================
function Mission4({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const puzzles = useRef([
    { encoded: "낯설은 밤의 요원", shift: 1, answer: "비밀 임무 개시", options: ["비밀 임무 개시", "작전 시작됨", "요원 투입 완료"] },
    { encoded: "3, 6, 12, 24, ?", shift: 0, answer: "48", options: ["36", "48", "30"] },
    { encoded: "★●▲★●▲★●?", shift: 0, answer: "▲", options: ["★", "●", "▲"] },
    { encoded: "ㅂㅅ ㅈㅇ ㅎㄱ", shift: 0, answer: "비상 작전 확인", options: ["비상 작전 확인", "본부 연락 필요", "적군 발견됨"] },
    { encoded: "1→2→4→7→11→?", shift: 0, answer: "16", options: ["14", "15", "16"] },
  ]);

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState("");

  const p = puzzles.current[idx];

  const handleAnswer = (ans: string) => {
    if (ans === p.answer) {
      setScore(s => s + 1);
      setFeedback("✅ 정답!");
    } else {
      setMistakes(m => m + 1);
      setFeedback("❌ 틀렸어요!");
      if (mistakes + 1 >= 3) {
        setTimeout(() => onFail(), 800);
        return;
      }
    }
    setTimeout(() => {
      setFeedback("");
      if (idx + 1 >= puzzles.current.length) {
        onWin(90 + score * 10);
      } else {
        setIdx(i => i + 1);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-400">문제 {idx + 1}/5</span>
        <span className="text-yellow-400">❌ {mistakes}/3</span>
      </div>
      <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30 w-full max-w-sm text-center">
        <p className="text-gray-400 text-sm mb-2">암호문:</p>
        <p className="text-green-400 font-mono text-xl mb-4">{p.encoded}</p>
      </div>
      {feedback ? (
        <p className={`text-xl font-bold ${feedback.includes("✅") ? "text-green-400" : "text-red-400"}`}>{feedback}</p>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {p.options.map(opt => (
            <button key={opt} onClick={() => handleAnswer(opt)}
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-cyan-500 text-white transition-colors">
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MISSION 5: CAR CHASE
// ============================================================
function Mission5({ onWin, onFail, hasJetpack, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasJetpack: boolean; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 55 : 45;
  const [lane, setLane] = useState(1);
  const [time, setTime] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [obstacles, setObstacles] = useState<{ id: number; lane: number; x: number; type: string }[]>([]);
  const [boosts, setBoosts] = useState<{ id: number; lane: number; x: number }[]>([]);
  const idRef = useRef(0);
  const [hit, setHit] = useState(false);
  const [lives, setLives] = useState(hasJetpack ? 4 : 3);
  const [boosted, setBoosted] = useState(false);
  const tickRef = useRef(0);

  useEffect(() => {
    if (hit) return;
    const iv = setInterval(() => {
      tickRef.current++;
      setTime(t => {
        if (t <= 0) { onWin(110 + score * 2); return 0; }
        return +(t - 0.1).toFixed(1);
      });

      setObstacles(prev => {
        let next = prev.map(o => ({ ...o, x: o.x - 2.5 })).filter(o => o.x > -10);
        if (tickRef.current % 16 === 0) {
          const types = ["🚙", "🚧", "🛢️"];
          next.push({
            id: idRef.current++,
            lane: Math.floor(Math.random() * 3),
            x: 105,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
        return next;
      });

      setBoosts(prev => {
        let next = prev.map(b => ({ ...b, x: b.x - 2.5 })).filter(b => b.x > -10);
        if (tickRef.current % 25 === 0) {
          next.push({ id: idRef.current++, lane: Math.floor(Math.random() * 3), x: 105 });
        }
        return next;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [hit, score]);

  useEffect(() => {
    if (hit) return;
    for (const o of obstacles) {
      if (o.lane === lane && o.x >= 5 && o.x <= 20) {
        if (boosted) {
          setBoosted(false);
          continue;
        }
        setLives(l => {
          if (l <= 1) {
            setHit(true);
            setTimeout(() => onFail(), 1000);
            return 0;
          }
          return l - 1;
        });
        setObstacles(prev => prev.filter(ob => ob !== o));
        return;
      }
    }
    for (const b of boosts) {
      if (b.lane === lane && b.x >= 5 && b.x <= 20) {
        setBoosted(true);
        setScore(s => s + 10);
        setBoosts(prev => prev.filter(bo => bo !== b));
      }
    }
  }, [obstacles, boosts, lane, hit, boosted]);

  const lanes = [0, 1, 2];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-red-400 font-mono">⏱️ {time.toFixed(1)}초</span>
        <span className="text-green-400">💰 {score}</span>
        <span className="text-yellow-400">{"❤️".repeat(lives)}</span>
        {boosted && <span className="text-cyan-400 animate-pulse">⚡ 부스트!</span>}
      </div>
      {hit && <div className="text-red-500 text-xl font-bold animate-pulse">💥 충돌!</div>}
      <div className="relative w-full max-w-sm h-48 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
        {/* road */}
        {lanes.map(l => (
          <div key={l} className={`absolute left-0 right-0 h-16 border-b border-dashed border-gray-600
            ${l === lane ? "bg-gray-700/50" : ""}`}
            style={{ top: `${l * 64}px` }}
            onClick={() => setLane(l)}
          />
        ))}
        {/* player car */}
        <div className="absolute text-2xl transition-all duration-150"
          style={{ left: "10%", top: `${lane * 64 + 16}px` }}>
          🚗
        </div>
        {/* obstacles */}
        {obstacles.map((o) => (
          <div key={o.id} className="absolute text-2xl transition-[left] duration-100 ease-linear"
            style={{ left: `${o.x}%`, top: `${o.lane * 64 + 16}px` }}>
            {o.type}
          </div>
        ))}
        {/* boosts */}
        {boosts.map((b) => (
          <div key={b.id} className="absolute text-xl animate-pulse transition-[left] duration-100 ease-linear"
            style={{ left: `${b.x}%`, top: `${b.lane * 64 + 18}px` }}>
            ⚡
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {lanes.map(l => (
          <button key={l} onClick={() => setLane(l)}
            className={`px-6 py-2 rounded-lg font-bold ${l === lane ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {l === 0 ? "⬆️" : l === 1 ? "➡️" : "⬇️"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 6: HACKING
// ============================================================
function Mission6({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const [phase, setPhase] = useState<"password" | "firewall" | "virus">("password");
  // PASSWORD
  const [secret] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)));
  const [guess, setGuess] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<{ guess: number[]; correct: number; position: number }[]>([]);
  const [pwTries, setPwTries] = useState(0);
  // FIREWALL
  const [sequence, setSequence] = useState<number[]>([]);
  const [seqLength, setSeqLength] = useState(3);
  const [showSeq, setShowSeq] = useState(true);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [fwRound, setFwRound] = useState(0);
  // VIRUS
  const [viruses, setViruses] = useState<{ id: number; x: number; y: number; alive: boolean }[]>([]);
  const [virusScore, setVirusScore] = useState(0);
  const [virusTime, setVirusTime] = useState(15);
  const virusIdRef = useRef(0);

  // PASSWORD PHASE
  const addDigit = (d: number) => {
    if (guess.length >= 4) return;
    setGuess([...guess, d]);
  };

  const submitGuess = () => {
    if (guess.length !== 4) return;
    let correct = 0, position = 0;
    const sc = [...secret], gc = [...guess];
    for (let i = 0; i < 4; i++) {
      if (gc[i] === sc[i]) { position++; sc[i] = -1; gc[i] = -2; }
    }
    for (let i = 0; i < 4; i++) {
      if (gc[i] === -2) continue;
      const idx = sc.indexOf(gc[i]);
      if (idx >= 0) { correct++; sc[idx] = -1; }
    }
    setAttempts([...attempts, { guess: [...guess], correct, position }]);
    if (position === 4) {
      setTimeout(() => {
        setPhase("firewall");
        initFirewall(3);
      }, 800);
    } else {
      setPwTries(t => t + 1);
      if (pwTries + 1 >= 8) { onFail(); return; }
    }
    setGuess([]);
  };

  // FIREWALL PHASE
  const initFirewall = (len: number) => {
    // 중복 없이 순서 생성 (같은 노드가 두 번 나오면 번호가 헷갈리므로)
    const pool = [0, 1, 2, 3, 4, 5];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const seq = pool.slice(0, Math.min(len, 6));
    setSequence(seq);
    setSeqLength(len);
    setShowSeq(true);
    setUserSeq([]);
    setTimeout(() => setShowSeq(false), len * 600 + 500);
  };

  const handleFwClick = (n: number) => {
    if (showSeq) return;
    const newSeq = [...userSeq, n];
    setUserSeq(newSeq);
    if (newSeq[newSeq.length - 1] !== sequence[newSeq.length - 1]) {
      onFail();
      return;
    }
    if (newSeq.length === sequence.length) {
      setFwRound(r => r + 1);
      if (fwRound + 1 >= 3) {
        setTimeout(() => {
          setPhase("virus");
          startVirus();
        }, 500);
      } else {
        setTimeout(() => initFirewall(seqLength + 1), 500);
      }
    }
  };

  // VIRUS PHASE
  const startVirus = () => {
    setVirusScore(0);
    setVirusTime(15);
  };

  useEffect(() => {
    if (phase !== "virus") return;
    const iv = setInterval(() => {
      setVirusTime(t => {
        if (t <= 0) {
          clearInterval(iv);
          if (virusScore >= 10) onWin(130);
          else onFail();
          return 0;
        }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(iv);
  }, [phase, virusScore]);

  useEffect(() => {
    if (phase !== "virus") return;
    const iv = setInterval(() => {
      virusIdRef.current++;
      setViruses(prev => [
        ...prev.filter(v => v.alive).slice(-8),
        { id: virusIdRef.current, x: Math.random() * 80 + 5, y: Math.random() * 80 + 5, alive: true },
      ]);
    }, 800);
    return () => clearInterval(iv);
  }, [phase]);

  const killVirus = (id: number) => {
    setViruses(prev => prev.map(v => v.id === id ? { ...v, alive: false } : v));
    setVirusScore(s => s + 1);
  };

  if (phase === "password") {
    return (
      <div className="flex flex-col items-center gap-3 relative">
        <CodeRain />
        <h3 className="text-green-400 font-bold z-10">🔑 비밀번호 해독</h3>
        <p className="text-gray-400 text-sm z-10">4자리 숫자를 맞춰보세요! (시도 {pwTries}/8)</p>
        <div className="z-10 w-full max-w-xs rounded-lg border border-amber-500/40 bg-amber-900/20 p-2 text-xs">
          <div className="font-bold text-amber-300">💡 속담 힌트</div>
          <div className="text-amber-100">🤫 &ldquo;아는 길도 물어 가라&rdquo; — 정답은 바로</div>
          <div className="mt-1 text-center text-2xl font-mono font-extrabold tracking-widest text-white">{secret.join(" ")}</div>
        </div>
        <div className="flex gap-2 z-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-12 h-14 bg-gray-800 border border-green-500/50 rounded flex items-center justify-center text-2xl text-green-400 font-mono">
              {guess[i] ?? "_"}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1 z-10">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => addDigit(d)}
              className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded text-green-400 font-mono text-lg">
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 z-10">
          <button onClick={() => setGuess([])} className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-white text-sm">지우기</button>
          <button onClick={submitGuess} className="px-4 py-2 bg-green-800 hover:bg-green-700 rounded text-white text-sm">확인</button>
        </div>
        <div className="space-y-1 z-10 w-full max-w-xs">
          {attempts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-mono">
              <span className="text-gray-400">{a.guess.join("")}</span>
              <span className="text-green-400">위치맞음:{a.position}</span>
              <span className="text-yellow-400">숫자맞음:{a.correct}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "firewall") {
    const nodeColors = ["bg-red-600", "bg-blue-600", "bg-green-600", "bg-yellow-600", "bg-purple-600", "bg-cyan-600"];
    return (
      <div className="flex flex-col items-center gap-4 relative">
        <CodeRain />
        <h3 className="text-cyan-400 font-bold z-10">🛡️ 방화벽 해제 (라운드 {fwRound + 1}/3)</h3>
        <p className="text-gray-400 text-sm z-10">{showSeq ? "순서를 기억하세요!" : "같은 순서로 클릭!"}</p>
        <div className="grid grid-cols-3 gap-3 z-10">
          {[0, 1, 2, 3, 4, 5].map(n => {
            const isActive = showSeq && sequence.includes(n);
            const showIdx = showSeq ? sequence.indexOf(n) : -1;
            return (
              <button key={n} onClick={() => handleFwClick(n)}
                className={`w-16 h-16 rounded-xl ${nodeColors[n]} transition-all duration-200
                  ${isActive ? "ring-4 ring-white scale-110" : "opacity-60 hover:opacity-100"}
                  ${userSeq.includes(n) ? "ring-2 ring-green-400" : ""}`}>
                {showSeq && showIdx >= 0 && <span className="text-white font-bold text-lg">{showIdx + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // VIRUS
  return (
    <div className="flex flex-col items-center gap-3 relative">
      <CodeRain />
      <h3 className="text-red-400 font-bold z-10">🦠 바이러스 제거!</h3>
      <div className="flex gap-4 text-sm z-10">
        <span className="text-red-400 font-mono">⏱️ {virusTime.toFixed(1)}초</span>
        <span className="text-green-400">제거: {virusScore}/10</span>
      </div>
      <div className="relative w-full max-w-sm h-64 bg-gray-900/80 rounded-lg border border-red-500/30 z-10 overflow-hidden">
        {viruses.filter(v => v.alive).map(v => (
          <button key={v.id} onClick={() => killVirus(v.id)}
            className="absolute w-10 h-10 text-2xl animate-pulse hover:scale-125 transition-transform"
            style={{ left: `${v.x}%`, top: `${v.y}%` }}>
            🦠
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 7: BOSS FIGHT
// ============================================================
function Mission7({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const [playerHP, setPlayerHP] = useState(100);
  const [bossHP, setBossHP] = useState(150);
  const [bossPhase, setBossPhase] = useState(1);
  const [turn, setTurn] = useState<"player" | "boss" | "result">("player");
  const [dodge, setDodge] = useState(false);
  const [stun, setStun] = useState(false);
  const [dot, setDot] = useState(0);
  const [log, setLog] = useState<string[]>(["보스가 나타났다! 🦹‍♂️"]);
  const [bossAnim, setBossAnim] = useState("");

  useEffect(() => {
    if (bossHP <= 100 && bossPhase === 1) setBossPhase(2);
    if (bossHP <= 50 && bossPhase === 2) setBossPhase(3);
  }, [bossHP, bossPhase]);

  useEffect(() => {
    if (turn !== "boss") return;
    const timer = setTimeout(() => {
      if (stun) {
        setLog(l => [...l, "보스가 기절 상태! 턴 스킵!"]);
        setStun(false);
        setTurn("player");
        return;
      }

      // Apply DOT
      if (dot > 0) {
        setBossHP(h => Math.max(0, h - 8));
        setDot(d => d - 1);
        setLog(l => [...l, "🪤 함정 데미지! -8"]);
      }

      const attacks = bossPhase === 1
        ? [{ name: "주먹", dmg: 12 }]
        : bossPhase === 2
        ? [{ name: "주먹", dmg: 15 }, { name: "레이저", dmg: 20 }]
        : [{ name: "주먹", dmg: 18 }, { name: "레이저", dmg: 22 }, { name: "폭탄", dmg: 30 }];

      const atk = attacks[Math.floor(Math.random() * attacks.length)];
      setBossAnim("animate-bounce");
      setTimeout(() => setBossAnim(""), 500);

      if (dodge) {
        setLog(l => [...l, `보스의 ${atk.name}! 연막탄으로 회피!`]);
        setDodge(false);
      } else {
        setPlayerHP(h => {
          const nh = Math.max(0, h - atk.dmg);
          if (nh <= 0) {
            setTurn("result");
            setTimeout(() => onFail(), 1000);
          }
          return nh;
        });
        setLog(l => [...l, `보스의 ${atk.name}! -${atk.dmg} 데미지`]);
      }
      if (playerHP - (dodge ? 0 : 0) > 0) setTurn("player");
    }, 1200);
    return () => clearTimeout(timer);
  }, [turn]);

  const attack = (type: string) => {
    if (turn !== "player") return;
    let msg = "";
    switch (type) {
      case "gun":
        const dmg = 15 + Math.floor(Math.random() * 10);
        setBossHP(h => {
          const nh = Math.max(0, h - dmg);
          if (nh <= 0) { setTurn("result"); setTimeout(() => onWin(150), 1000); }
          return nh;
        });
        msg = `🔫 가젯 건! -${dmg} 데미지`;
        break;
      case "smoke":
        setDodge(true);
        msg = "💣 연막탄! 다음 공격 회피!";
        break;
      case "heal":
        setPlayerHP(h => Math.min(100, h + 25));
        msg = "💊 치료제! +25 HP";
        break;
      case "shock":
        setStun(true);
        const sdmg = 8;
        setBossHP(h => Math.max(0, h - sdmg));
        msg = `⚡ 전기충격! -${sdmg} + 기절`;
        break;
      case "trap":
        setDot(3);
        msg = "🪤 함정 설치! 3턴간 데미지";
        break;
    }
    setLog(l => [...l, msg]);
    setTurn("boss");
  };

  const bossEmoji = bossPhase === 1 ? "🦹‍♂️" : bossPhase === 2 ? "😈" : "👿";

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      {/* Boss */}
      <div className="flex flex-col items-center gap-1">
        <span className={`text-5xl ${bossAnim}`}>{bossEmoji}</span>
        <span className="text-red-400 text-xs">페이즈 {bossPhase}</span>
        <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(bossHP / 150) * 100}%` }} />
        </div>
        <span className="text-red-400 text-sm font-mono">{bossHP}/150 HP</span>
      </div>
      {/* Player */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-48 h-3 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${playerHP}%` }} />
        </div>
        <span className="text-green-400 text-sm font-mono">{playerHP}/100 HP</span>
        <div className="flex gap-1 text-xs">
          {dodge && <span className="text-purple-400">🛡️ 회피</span>}
          {dot > 0 && <span className="text-orange-400">🪤 함정 {dot}턴</span>}
        </div>
      </div>
      {/* Actions */}
      {turn === "player" && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: "gun", label: "🔫 공격" },
            { type: "smoke", label: "💣 회피" },
            { type: "heal", label: "💊 회복" },
            { type: "shock", label: "⚡ 기절" },
            { type: "trap", label: "🪤 함정" },
          ].map(a => (
            <button key={a.type} onClick={() => attack(a.type)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-green-500 text-sm text-white transition-colors">
              {a.label}
            </button>
          ))}
        </div>
      )}
      {turn === "boss" && <p className="text-yellow-400 animate-pulse">보스의 턴...</p>}
      {/* Log */}
      <div className="w-full max-h-24 overflow-y-auto bg-gray-900/50 rounded p-2 text-xs text-gray-400 font-mono space-y-0.5">
        {log.slice(-5).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 8: ESCAPE
// ============================================================
function Mission8({ onWin, onFail, hasWatch }: {
  onWin: (coins: number) => void; onFail: () => void; hasWatch: boolean;
}) {
  const timeLimit = hasWatch ? 70 : 60;
  const [time, setTime] = useState(timeLimit);
  const [stage, setStage] = useState(0);
  const [barPos, setBarPos] = useState(0);
  const [failed, setFailed] = useState(false);
  const [doorChoice, setDoorChoice] = useState(-1);
  const [safeDoor] = useState(() => Math.random() < 0.5 ? 0 : 1);

  const stages = ["점프!", "슬라이드!", "문 선택!", "헬기 로프!"];

  useEffect(() => {
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 0) { onFail(); return 0; }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (stage === 0 || stage === 1 || stage === 3) {
      const iv = setInterval(() => {
        setBarPos(p => (p + 3) % 100);
      }, 30);
      return () => clearInterval(iv);
    }
  }, [stage]);

  const handleTap = () => {
    if (failed) return;
    const inZone = barPos >= 35 && barPos <= 65;
    if (inZone) {
      if (stage >= 3) {
        onWin(200);
      } else {
        setStage(s => s + 1);
        setBarPos(0);
      }
    } else {
      setFailed(true);
      setTimeout(() => onFail(), 1000);
    }
  };

  const handleDoor = (d: number) => {
    setDoorChoice(d);
    if (d === safeDoor) {
      setTimeout(() => {
        setStage(3);
        setBarPos(0);
      }, 800);
    } else {
      setFailed(true);
      setTimeout(() => onFail(), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="text-red-400 font-mono text-lg animate-pulse">💥 {time.toFixed(1)}초</span>
        <span className="text-yellow-400 font-bold">{stages[stage]}</span>
      </div>
      {failed && <div className="text-red-500 text-xl font-bold animate-pulse">실패!</div>}

      {stage === 2 ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400">어느 문을 열까요?</p>
          <div className="flex gap-6">
            {[0, 1].map(d => (
              <button key={d} onClick={() => handleDoor(d)}
                className={`w-24 h-32 rounded-lg text-4xl flex items-center justify-center transition-colors
                  ${doorChoice === d
                    ? d === safeDoor ? "bg-green-800 border-2 border-green-400" : "bg-red-800 border-2 border-red-400"
                    : "bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"}`}>
                {doorChoice === d ? (d === safeDoor ? "✅" : "💀") : "🚪"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-72 h-8 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
            {/* target zone */}
            <div className="absolute h-full bg-green-900/50 border-x border-green-500"
              style={{ left: "35%", width: "30%" }} />
            {/* moving bar */}
            <div className="absolute h-full w-1.5 bg-cyan-400 shadow-lg shadow-cyan-400/50 transition-all duration-[30ms]"
              style={{ left: `${barPos}%` }} />
          </div>
          <div className="text-5xl">
            {stage === 0 ? "🏃" : stage === 1 ? "🤸" : "🚁"}
          </div>
          <button onClick={handleTap}
            className="px-12 py-4 bg-red-700 hover:bg-red-600 rounded-xl text-white text-xl font-bold
              shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
            {stage === 0 ? "점프!" : stage === 1 ? "슬라이드!" : "잡기!"}
          </button>
          <p className="text-gray-500 text-xs">초록색 영역에서 탭하세요!</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN GAME COMPONENT
// ============================================================
// ============================================================
// MISSION 9: BOMB DEFUSAL — 지시대로 선을 자르기
// ============================================================
function Mission9({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const WIRE = [
    { c: "빨강", color: "#ef4444" },
    { c: "파랑", color: "#3b82f6" },
    { c: "초록", color: "#22c55e" },
    { c: "노랑", color: "#eab308" },
    { c: "보라", color: "#a855f7" },
  ];
  const totalRounds = 3;
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(() => Math.floor(Math.random() * WIRE.length));
  const [cut, setCut] = useState<Set<number>>(new Set());
  const [time, setTime] = useState(20);
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    if (boom) return;
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 1) { setBoom(true); setTimeout(() => onFail(), 1200); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [boom]);

  const handleCut = (i: number) => {
    if (boom) return;
    if (i !== target) { setBoom(true); setTimeout(() => onFail(), 1200); return; }
    setCut(prev => new Set([...prev, i]));
    if (round + 1 >= totalRounds) {
      onWin(140 + time * 2);
    } else {
      setTimeout(() => {
        setRound(r => r + 1);
        setCut(new Set());
        setTarget(Math.floor(Math.random() * WIRE.length));
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-400">라운드 {round + 1}/{totalRounds}</span>
        <span className={`font-mono font-bold ${time <= 5 ? "text-red-500 animate-pulse" : "text-yellow-400"}`}>⏱️ {time}초</span>
      </div>
      {boom ? (
        <div className="text-5xl animate-ping">💥</div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-xl p-4 border border-red-500/40 text-center">
            <div className="text-3xl mb-1">💣</div>
            <div className="text-red-300 text-sm font-bold">지시: <span className="text-white text-lg">{WIRE[target].c}</span> 선을 자르시오!</div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {WIRE.map((w, i) => (
              <button key={i} onClick={() => handleCut(i)} disabled={cut.has(i)}
                className={`flex items-center gap-3 rounded-lg p-2 border-2 transition-all ${cut.has(i) ? "opacity-30 border-gray-700" : "border-gray-600 hover:border-white active:scale-95"}`}>
                <span className="h-3 flex-1 rounded-full" style={{ background: w.color }} />
                <span className="text-xs text-gray-300">{cut.has(i) ? "✂️ 잘림" : `${w.c} ✂️`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// MISSION 10: SNIPER — 적만 조준 사격
// ============================================================
function Mission10({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const goal = 8;
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(25);
  const [figure, setFigure] = useState<{ enemy: boolean; x: number; y: number } | null>(null);
  const [msg, setMsg] = useState("");
  const overRef = useRef(false);

  useEffect(() => {
    if (overRef.current) return;
    const iv = setInterval(() => {
      setTime(t => {
        if (t <= 1) { overRef.current = true; setTimeout(() => onFail(), 800); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (overRef.current) return;
    const iv = setInterval(() => {
      setFigure({ enemy: Math.random() < 0.7, x: 8 + Math.random() * 78, y: 8 + Math.random() * 70 });
    }, 900);
    return () => clearInterval(iv);
  }, []);

  const shoot = (e: { enemy: boolean }) => {
    if (overRef.current) return;
    if (!e.enemy) { setMsg("❌ 민간인 사격! 실패"); overRef.current = true; setTimeout(() => onFail(), 900); return; }
    setFigure(null);
    setScore(s => {
      const ns = s + 1;
      if (ns >= goal) { overRef.current = true; setTimeout(() => onWin(120 + time * 3), 300); }
      return ns;
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-400">🎯 {score}/{goal}</span>
        <span className="font-mono text-yellow-400">⏱️ {time}초</span>
      </div>
      {msg && <div className="text-red-400 text-sm font-bold">{msg}</div>}
      <p className="text-xs text-gray-400">🎯 적(🕵️‍♂️)만 쏘세요! 민간인(🧍)은 쏘면 실패!</p>
      <div className="relative w-full max-w-sm h-52 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border-2 border-green-700/50 overflow-hidden"
        style={{ backgroundImage: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.4) 70%)" }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-px h-full bg-green-500/20" /><div className="h-px w-full bg-green-500/20 absolute" />
        </div>
        {figure && (
          <button onClick={() => shoot(figure)}
            className="absolute text-3xl transition-transform hover:scale-110 active:scale-90"
            style={{ left: `${figure.x}%`, top: `${figure.y}%` }}>
            {figure.enemy ? "🕵️‍♂️" : "🧍"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MISSION 11: SAFE CRACK — 3자리 숫자 추리
// ============================================================
function Mission11({ onWin, onFail }: { onWin: (coins: number) => void; onFail: () => void }) {
  const [secret] = useState(() => [0, 1, 2].map(() => Math.floor(Math.random() * 10)));
  const [guess, setGuess] = useState([0, 0, 0]);
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<string[]>(["", "", ""]);
  const maxTries = 8;

  const setDigit = (i: number, delta: number) => {
    setGuess(g => g.map((d, idx) => idx === i ? (d + delta + 10) % 10 : d));
  };

  const submit = () => {
    const fb = guess.map((d, i) => d === secret[i] ? "✅" : d < secret[i] ? "🔼" : "🔽");
    setFeedback(fb);
    const nt = tries + 1;
    setTries(nt);
    if (fb.every(f => f === "✅")) { onWin(130 + (maxTries - nt) * 15); return; }
    if (nt >= maxTries) { setTimeout(() => onFail(), 900); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-green-400">🔐 금고 열기 · 시도 {tries}/{maxTries}</div>
      <p className="text-xs text-gray-400">🔼 = 정답이 더 큼, 🔽 = 더 작음, ✅ = 맞음!</p>
      <div className="flex gap-4">
        {guess.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button onClick={() => setDigit(i, 1)} className="w-12 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">▲</button>
            <div className="w-12 h-14 bg-gray-900 border-2 border-cyan-600 rounded-lg flex items-center justify-center text-3xl font-mono font-bold text-cyan-300">{d}</div>
            <button onClick={() => setDigit(i, -1)} className="w-12 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">▼</button>
            <div className="text-xl h-6">{feedback[i]}</div>
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={tries >= maxTries}
        className="px-8 py-3 bg-gradient-to-r from-cyan-700 to-green-700 hover:from-cyan-600 hover:to-green-600 rounded-xl font-bold disabled:opacity-40">
        🔓 시도!
      </button>
    </div>
  );
}

// ============================================================
// 미션 12~26: 미니게임 템플릿
// ============================================================
type MiniKind = "spot" | "memory" | "mash" | "reaction";
interface MiniCfg { kind: MiniKind; reward: number; emojis?: string[]; hard?: boolean; label?: string }

const MINI: Record<number, MiniCfg> = {
  12: { kind: "spot", reward: 100, emojis: ["🚶", "🏃", "🧍", "💃"], label: "미행 대상(다른 사람)을 찾으세요!" },
  13: { kind: "memory", reward: 110 },
  14: { kind: "mash", reward: 100, label: "철문을 부숴라! 마구 탭!" },
  15: { kind: "reaction", reward: 110 },
  16: { kind: "spot", reward: 110, emojis: ["💵", "💴", "💶", "💷"], label: "위조지폐(다른 것)를 찾으세요!" },
  17: { kind: "memory", reward: 120 },
  18: { kind: "mash", reward: 110, label: "절벽을 올라라! 마구 탭!" },
  19: { kind: "reaction", reward: 120 },
  20: { kind: "spot", reward: 120, emojis: ["🎭", "🤡", "👺", "👹"], label: "변장한 적(다른 것)을 찾으세요!" },
  21: { kind: "memory", reward: 130 },
  22: { kind: "mash", reward: 120, label: "땅을 파라! 마구 탭!" },
  23: { kind: "reaction", reward: 130 },
  24: { kind: "spot", reward: 130, emojis: ["🕵️", "👮", "🧑‍✈️", "💂"], label: "이중스파이(다른 것)를 찾으세요!" },
  25: { kind: "memory", reward: 150, hard: true },
  26: { kind: "reaction", reward: 200, hard: true },
};

function SpotGame({ emojis, reward, label, onWin, onFail }: { emojis: string[]; reward: number; label?: string; onWin: (c: number) => void; onFail: () => void }) {
  const rounds = 6;
  const [round, setRound] = useState(0);
  const [time, setTime] = useState(25);
  const [cells, setCells] = useState<string[]>([]);
  const [odd, setOdd] = useState(0);
  const overRef = useRef(false);

  useEffect(() => {
    const base = emojis[Math.floor(Math.random() * emojis.length)];
    let o = base;
    while (o === base) o = emojis[Math.floor(Math.random() * emojis.length)];
    const count = 6 + Math.floor(Math.random() * 4);
    const oi = Math.floor(Math.random() * count);
    setCells(Array.from({ length: count }, (_, i) => (i === oi ? o : base)));
    setOdd(oi);
  }, [round, emojis]);

  useEffect(() => {
    const iv = setInterval(() => setTime(t => {
      if (t <= 1) { if (!overRef.current) { overRef.current = true; setTimeout(() => onFail(), 700); } return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, []);

  const pick = (i: number) => {
    if (overRef.current) return;
    if (i !== odd) { overRef.current = true; setTimeout(() => onFail(), 700); return; }
    if (round + 1 >= rounds) { overRef.current = true; onWin(reward + time * 2); }
    else setRound(r => r + 1);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-4 text-sm"><span className="text-green-400">라운드 {round + 1}/{rounds}</span><span className="font-mono text-yellow-400">⏱️ {time}초</span></div>
      <p className="text-xs text-gray-400">{label ?? "다른 하나를 찾으세요!"}</p>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c, i) => (
          <button key={i} onClick={() => pick(i)} className="w-16 h-16 bg-gray-800 hover:bg-gray-700 rounded-xl text-3xl flex items-center justify-center active:scale-90 transition-transform">{c}</button>
        ))}
      </div>
    </div>
  );
}

function MemoryGame({ reward, hard, onWin, onFail }: { reward: number; hard?: boolean; onWin: (c: number) => void; onFail: () => void }) {
  const pads = [{ e: "🔴", c: "#ef4444" }, { e: "🔵", c: "#3b82f6" }, { e: "🟢", c: "#22c55e" }, { e: "🟡", c: "#eab308" }];
  const goal = hard ? 6 : 4;
  const [seq, setSeq] = useState<number[]>([]);
  const [flash, setFlash] = useState(-1);
  const [phase, setPhase] = useState<"show" | "input">("show");
  const [pos, setPos] = useState(0);
  const overRef = useRef(false);

  const playSeq = useCallback((s: number[]) => {
    setPhase("show"); setPos(0);
    let i = 0;
    const step = () => {
      setFlash(s[i]);
      setTimeout(() => {
        setFlash(-1); i++;
        if (i < s.length) setTimeout(step, 280);
        else setPhase("input");
      }, 480);
    };
    setTimeout(step, 500);
  }, []);

  useEffect(() => {
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s); playSeq(s);
  }, [playSeq]);

  const tap = (p: number) => {
    if (phase !== "input" || overRef.current) return;
    if (p !== seq[pos]) { overRef.current = true; setTimeout(() => onFail(), 600); return; }
    if (pos + 1 >= seq.length) {
      if (seq.length >= goal) { overRef.current = true; onWin(reward); return; }
      const ns = [...seq, Math.floor(Math.random() * 4)];
      setSeq(ns); playSeq(ns);
    } else setPos(x => x + 1);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-green-400">🧠 순서 기억 · 길이 {seq.length}/{goal}</div>
      <p className="text-xs text-gray-400">{phase === "show" ? "👀 순서를 외우세요..." : "순서대로 누르세요!"}</p>
      <div className="grid grid-cols-2 gap-3">
        {pads.map((pad, i) => (
          <button key={i} onClick={() => tap(i)} disabled={phase === "show"}
            className="w-24 h-24 rounded-2xl text-4xl flex items-center justify-center transition-all"
            style={{ background: pad.c, opacity: flash === i ? 1 : 0.35, transform: flash === i ? "scale(1.08)" : "scale(1)" }}>
            {pad.e}
          </button>
        ))}
      </div>
    </div>
  );
}

function MashGame({ reward, label, onWin, onFail }: { reward: number; label?: string; onWin: (c: number) => void; onFail: () => void }) {
  const [fill, setFill] = useState(0);
  const [time, setTime] = useState(8);
  const overRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setTime(t => {
      if (t <= 1) { if (!overRef.current) { overRef.current = true; setTimeout(() => onFail(), 600); } return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, []);

  const tap = () => {
    if (overRef.current) return;
    setFill(f => {
      const nf = Math.min(100, f + 4);
      if (nf >= 100 && !overRef.current) { overRef.current = true; setTimeout(() => onWin(reward + time * 3), 200); }
      return nf;
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm"><span className="font-mono text-yellow-400">⏱️ {time}초</span></div>
      <p className="text-xs text-gray-400">{label ?? "버튼을 마구 눌러라!"}</p>
      <div className="w-full max-w-xs h-6 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
        <div className="h-full bg-gradient-to-r from-green-500 to-yellow-400 transition-all" style={{ width: `${fill}%` }} />
      </div>
      <div className="text-lg font-bold text-green-400">{fill}%</div>
      <button onPointerDown={tap} className="w-40 h-40 rounded-full bg-gradient-to-b from-red-500 to-red-700 active:from-red-400 active:to-red-600 text-white text-2xl font-extrabold shadow-lg active:scale-95 transition-transform select-none touch-none">
        마구<br />탭! 💥
      </button>
    </div>
  );
}

function ReactionGame({ reward, hard, onWin, onFail }: { reward: number; hard?: boolean; onWin: (c: number) => void; onFail: () => void }) {
  const goal = hard ? 8 : 5;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("기다려...");
  const overRef = useRef(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);

  const schedule = useCallback(() => {
    setReady(false); readyRef.current = false; setMsg("기다려...");
    const delay = 700 + Math.random() * (hard ? 1100 : 1700);
    tRef.current = setTimeout(() => {
      setReady(true); readyRef.current = true; setMsg("지금 탭! 🔥");
      tRef.current = setTimeout(() => {
        if (overRef.current) return;
        readyRef.current = false; setReady(false); setMsg("놓쳤다! ❌");
        setLives(l => {
          if (l <= 1) { overRef.current = true; setTimeout(() => onFail(), 600); return 0; }
          setTimeout(schedule, 500);
          return l - 1;
        });
      }, hard ? 620 : 900);
    }, delay);
  }, [hard, onFail]);

  useEffect(() => {
    schedule();
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [schedule]);

  const tap = () => {
    if (overRef.current) return;
    if (!readyRef.current) return; // 너무 이르면 무시(관대)
    if (tRef.current) clearTimeout(tRef.current);
    readyRef.current = false; setReady(false);
    const ns = score + 1; setScore(ns);
    if (ns >= goal) { overRef.current = true; onWin(reward); return; }
    schedule();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-sm"><span className="text-green-400">⚡ {score}/{goal}</span><span className="text-yellow-400">{"❤️".repeat(lives)}</span></div>
      <p className="text-xs text-gray-400">🔥 &quot;지금 탭!&quot; 이 뜨면 빠르게 누르세요!</p>
      <button onClick={tap}
        className={`w-56 h-56 rounded-2xl text-2xl font-extrabold text-white transition-colors ${ready ? "bg-green-500" : "bg-gray-700"}`}>
        {msg}
      </button>
    </div>
  );
}

// ============================================================
// 보스전 (미션 27~32) — 공격 & 타이밍 방어
// ============================================================
type SkillType = "heal" | "shield" | "poison" | "enrage" | "double" | "lifesteal";
interface BossCfg { name: string; emoji: string; hp: number; dmg: number; strikeMs: number; gapMs: number; reward: number; secret?: boolean; skill?: { name: string; type: SkillType } }
const BOSSES: Record<number, BossCfg> = {
  27: { name: "그림자 군주", emoji: "🥷", hp: 30, dmg: 1, strikeMs: 900, gapMs: 1600, reward: 300, skill: { name: "그림자 분신(연타)", type: "double" } },
  28: { name: "강철 골렘", emoji: "🤖", hp: 40, dmg: 1, strikeMs: 850, gapMs: 1500, reward: 350, skill: { name: "강철 방어막", type: "shield" } },
  29: { name: "맹독 여왕", emoji: "🐍", hp: 46, dmg: 1, strikeMs: 780, gapMs: 1350, reward: 400, skill: { name: "맹독 안개", type: "poison" } },
  30: { name: "화염 폭군", emoji: "🔥", hp: 54, dmg: 1, strikeMs: 700, gapMs: 1200, reward: 500, skill: { name: "화염 광폭화", type: "enrage" } },
  31: { name: "배신자", emoji: "🎭", hp: 66, dmg: 2, strikeMs: 620, gapMs: 1050, reward: 800, secret: true, skill: { name: "생명 흡수", type: "lifesteal" } },
  32: { name: "외계 지휘관", emoji: "👾", hp: 80, dmg: 2, strikeMs: 540, gapMs: 950, reward: 1200, secret: true, skill: { name: "재생", type: "heal" } },
  // 숨겨진 오류(ERROR) 보스 — 극악, 보상 100만
  33: { name: "글리치", emoji: "🌀", hp: 120, dmg: 2, strikeMs: 480, gapMs: 12300, reward: 1000000, secret: true, skill: { name: "코드 복제(연타)", type: "double" } },
  34: { name: "크래시", emoji: "💀", hp: 160, dmg: 3, strikeMs: 430, gapMs: 10800, reward: 1000000, secret: true, skill: { name: "리부트 회복", type: "heal" } },
  35: { name: "널포인터", emoji: "⬛", hp: 220, dmg: 3, strikeMs: 380, gapMs: 9600, reward: 1000000, secret: true, skill: { name: "예외 방어막", type: "shield" } },
  // ===== 비밀 월드 2: 미스테리 보스 =====
  36: { name: "안개", emoji: "🌫️", hp: 45, dmg: 1, strikeMs: 880, gapMs: 1600, reward: 2000, secret: true, skill: { name: "독안개", type: "poison" } },
  37: { name: "거울", emoji: "🪞", hp: 50, dmg: 1, strikeMs: 850, gapMs: 1550, reward: 2200, secret: true, skill: { name: "반사 분신(연타)", type: "double" } },
  38: { name: "꿈", emoji: "💤", hp: 55, dmg: 1, strikeMs: 820, gapMs: 1500, reward: 2400, secret: true, skill: { name: "치유의 꿈", type: "heal" } },
  39: { name: "그림자", emoji: "👤", hp: 60, dmg: 1, strikeMs: 780, gapMs: 1450, reward: 2600, secret: true, skill: { name: "그림자 흡수", type: "lifesteal" } },
  40: { name: "시계", emoji: "⏳", hp: 65, dmg: 2, strikeMs: 760, gapMs: 1400, reward: 2800, secret: true, skill: { name: "시간 가속(광폭)", type: "enrage" } },
  41: { name: "가면", emoji: "😷", hp: 70, dmg: 2, strikeMs: 730, gapMs: 1350, reward: 3000, secret: true, skill: { name: "가면 방어막", type: "shield" } },
  42: { name: "미로", emoji: "🧩", hp: 75, dmg: 2, strikeMs: 700, gapMs: 1300, reward: 3300, secret: true, skill: { name: "미로의 함정(독)", type: "poison" } },
  43: { name: "유령", emoji: "👻", hp: 80, dmg: 2, strikeMs: 680, gapMs: 1250, reward: 3600, secret: true, skill: { name: "영혼 흡수", type: "lifesteal" } },
  44: { name: "심연", emoji: "🌊", hp: 88, dmg: 2, strikeMs: 650, gapMs: 1200, reward: 4000, secret: true, skill: { name: "심연의 재생", type: "heal" } },
  45: { name: "별자리", emoji: "🔯", hp: 95, dmg: 2, strikeMs: 620, gapMs: 1150, reward: 4400, secret: true, skill: { name: "유성 광폭화", type: "enrage" } },
  46: { name: "침묵", emoji: "🤫", hp: 100, dmg: 2, strikeMs: 600, gapMs: 1100, reward: 4800, secret: true, skill: { name: "침묵의 장막(방어막)", type: "shield" } },
  47: { name: "폭풍", emoji: "🌩️", hp: 110, dmg: 3, strikeMs: 570, gapMs: 1050, reward: 5200, secret: true, skill: { name: "연속 번개(연타)", type: "double" } },
  48: { name: "공허", emoji: "🕳️", hp: 120, dmg: 3, strikeMs: 540, gapMs: 1000, reward: 6000, secret: true, skill: { name: "공허 흡수", type: "lifesteal" } },
  // ??? 보스 (월드2 최종)
  49: { name: "???", emoji: "❓", hp: 200, dmg: 3, strikeMs: 500, gapMs: 950, reward: 5000000, secret: true, skill: { name: "미지의 광폭화", type: "enrage" } },
  50: { name: "???", emoji: "⁉️", hp: 300, dmg: 4, strikeMs: 450, gapMs: 900, reward: 9999999, secret: true, skill: { name: "무한 재생", type: "heal" } },
};

const TEAMMATES = [
  { name: "레이븐", emoji: "🦸", color: "#f43f5e" },
  { name: "코브라", emoji: "🥷", color: "#22c55e" },
  { name: "팰컨", emoji: "🦅", color: "#38bdf8" },
  { name: "울프", emoji: "🐺", color: "#a855f7" },
  { name: "볼트", emoji: "⚡", color: "#eab308" },
  { name: "타이탄", emoji: "🦾", color: "#f97316" },
];
const TEAM_MAX = 6;

function BossFight({ boss, teamCount = 3, onWin, onFail }: { boss: BossCfg; teamCount?: number; onWin: (c: number) => void; onFail: () => void }) {
  const team = TEAMMATES.slice(0, teamCount);
  const skill = boss.skill?.type;
  const [bossHp, setBossHp] = useState(boss.hp);
  const [hearts, setHearts] = useState(5);
  const [warn, setWarn] = useState<"idle" | "warn" | "strike">("idle");
  const [shake, setShake] = useState(false);
  const [attacker, setAttacker] = useState(-1); // 지금 공격 중인 팀원 index
  const [teamHp, setTeamHp] = useState<number[]>(() => Array(teamCount).fill(TEAM_MAX));
  const [shielded, setShielded] = useState(false);
  const [flash, setFlash] = useState("");
  const warnRef = useRef<"idle" | "warn" | "strike">("idle");
  const defendedRef = useRef(false);
  const overRef = useRef(false);
  const teamHpRef = useRef<number[]>(Array(teamCount).fill(TEAM_MAX));
  const shieldedRef = useRef(false);
  const bossHpRef = useRef(boss.hp);
  useEffect(() => { teamHpRef.current = teamHp; }, [teamHp]);
  useEffect(() => { bossHpRef.current = bossHp; }, [bossHp]);

  const popFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 800); };

  const hitBoss = (amount: number) => {
    if (shieldedRef.current) return; // 방어막 중엔 데미지 무효
    setBossHp(hp => {
      const nh = Math.max(0, hp - amount);
      if (nh <= 0 && !overRef.current) { overRef.current = true; setTimeout(() => onWin(boss.reward), 500); }
      return nh;
    });
  };

  const damagePlayerOrTeam = () => {
    const aliveTeam = teamHpRef.current.map((h, i) => (h > 0 ? i : -1)).filter(i => i >= 0);
    const targets: (number | "me")[] = ["me", ...aliveTeam];
    const t = targets[Math.floor(Math.random() * targets.length)];
    if (t === "me") {
      setHearts(h => {
        const nh = h - boss.dmg;
        if (nh <= 0) { overRef.current = true; setTimeout(() => onFail(), 700); return 0; }
        return nh;
      });
    } else {
      setTeamHp(prev => { const n = [...prev]; n[t] = Math.max(0, n[t] - boss.dmg); return n; });
    }
  };

  // 스킬: 회복 / 방어막 / 독 (주기적)
  useEffect(() => {
    if (skill === "heal") {
      const iv = setInterval(() => {
        if (overRef.current) return;
        setBossHp(hp => (hp > 0 ? Math.min(boss.hp, hp + Math.max(2, Math.round(boss.hp * 0.05))) : hp));
        popFlash("💚 회복!");
      }, 4500);
      return () => clearInterval(iv);
    }
    if (skill === "shield") {
      const iv = setInterval(() => {
        if (overRef.current) return;
        setShielded(true); shieldedRef.current = true; popFlash("🛡️ 방어막!");
        setTimeout(() => { setShielded(false); shieldedRef.current = false; }, 1600);
      }, 6000);
      return () => clearInterval(iv);
    }
    if (skill === "poison") {
      const iv = setInterval(() => {
        if (overRef.current) return;
        popFlash("☠️ 독안개!");
        const alive = teamHpRef.current.map((h, i) => (h > 0 ? i : -1)).filter(i => i >= 0);
        if (alive.length) {
          const ti = alive[Math.floor(Math.random() * alive.length)];
          setTeamHp(prev => { const n = [...prev]; n[ti] = Math.max(0, n[ti] - 1); return n; });
        } else {
          setHearts(h => { const nh = h - 1; if (nh <= 0) { overRef.current = true; setTimeout(() => onFail(), 700); return 0; } return nh; });
        }
      }, 5000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss]);

  // 팀원 자동 공격 (살아있는 팀원만)
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      if (overRef.current) return;
      const idx = i % team.length;
      i++;
      if (teamHpRef.current[idx] <= 0) return; // KO된 팀원은 공격 못함
      setAttacker(idx);
      setTimeout(() => setAttacker(a => (a === idx ? -1 : a)), 350);
      hitBoss(1);
    }, 1100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss]);

  useEffect(() => {
    let a: ReturnType<typeof setTimeout>, b: ReturnType<typeof setTimeout>, c: ReturnType<typeof setTimeout>, d: ReturnType<typeof setTimeout>;
    const resolveStrike = () => {
      if (!defendedRef.current) {
        damagePlayerOrTeam();
        // 흡혈: 공격이 적중하면 보스가 체력 회복
        if (skill === "lifesteal") {
          setBossHp(hp => (hp > 0 ? Math.min(boss.hp, hp + 2) : hp));
          popFlash("🩸 흡혈!");
        }
      }
    };
    const cycle = () => {
      if (overRef.current) return;
      // 광폭화: 체력 절반 이하면 공격이 빨라짐
      const enraged = skill === "enrage" && bossHpRef.current <= boss.hp / 2;
      const gap = enraged ? boss.gapMs * 0.55 : boss.gapMs;
      const strikeMs = enraged ? boss.strikeMs * 0.6 : boss.strikeMs;
      if (enraged) popFlash("🔥 광폭화!");
      setWarn("warn"); warnRef.current = "warn"; defendedRef.current = false;
      a = setTimeout(() => {
        if (overRef.current) return;
        setWarn("strike"); warnRef.current = "strike";
        b = setTimeout(() => {
          if (overRef.current) return;
          resolveStrike();
          // 분신(연타): 40% 확률로 즉시 2번째 공격
          if (skill === "double" && Math.random() < 0.4) {
            popFlash("🌀 연속 공격!");
            defendedRef.current = false;
            setWarn("strike"); warnRef.current = "strike";
            d = setTimeout(() => {
              if (overRef.current) return;
              resolveStrike();
              setWarn("idle"); warnRef.current = "idle";
              c = setTimeout(cycle, gap);
            }, 480);
          } else {
            setWarn("idle"); warnRef.current = "idle";
            c = setTimeout(cycle, gap);
          }
        }, strikeMs);
      }, 750);
    };
    c = setTimeout(cycle, 1400);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); clearTimeout(d); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss]);

  const attack = () => {
    if (overRef.current) return;
    setShake(true); setTimeout(() => setShake(false), 120);
    hitBoss(1);
  };
  const defend = () => {
    if (warnRef.current === "warn" || warnRef.current === "strike") defendedRef.current = true;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-yellow-400 text-sm">{"❤️".repeat(hearts) || "💀"}</div>
      <div className="relative">
        {shielded && <div className="absolute inset-0 -m-3 rounded-full border-4 border-sky-300 animate-pulse" />}
        <div className={`text-7xl transition-transform ${shake ? "scale-90" : ""} ${warn === "strike" ? "animate-bounce" : ""}`}>{boss.emoji}</div>
      </div>
      <div className="font-bold text-red-300">{boss.secret ? "❓ " : ""}{boss.name}</div>
      {boss.skill && <div className="text-[11px] text-fuchsia-300">✨ 스킬: {boss.skill.name}</div>}
      <div className="h-5 text-sm font-extrabold text-amber-300">{flash}</div>
      <div className="w-full max-w-xs h-4 bg-gray-800 rounded-full overflow-hidden border border-red-500/40">
        <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all" style={{ width: `${(bossHp / boss.hp) * 100}%` }} />
      </div>
      <div className="text-xs text-gray-400">HP {bossHp}/{boss.hp}</div>
      {/* 함께 싸우는 팀원 (체력바) */}
      <div className="flex flex-wrap items-start justify-center gap-3">
        {team.map((t, i) => {
          const hp = teamHp[i];
          const ko = hp <= 0;
          return (
            <div key={t.name} className={`flex flex-col items-center gap-0.5 w-16 transition-transform ${attacker === i ? "scale-110 -translate-y-1" : ""} ${ko ? "opacity-35" : ""}`}>
              <span className="text-2xl">{ko ? "💀" : t.emoji}</span>
              <span className="text-[10px] font-bold text-gray-300">{t.name}{attacker === i && !ko ? " ⚔️" : ""}</span>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(hp / TEAM_MAX) * 100}%`, background: ko ? "#4b5563" : t.color }} />
              </div>
              <span className="text-[8px] text-gray-500">{ko ? "쓰러짐" : `${hp}/${TEAM_MAX}`}</span>
            </div>
          );
        })}
      </div>
      <div className={`h-6 text-sm font-bold ${warn === "warn" ? "text-yellow-400 animate-pulse" : warn === "strike" ? "text-red-500" : "text-transparent"}`}>
        {warn === "warn" ? "⚠️ 곧 공격!" : warn === "strike" ? "🛡️ 지금 방어!" : "."}
      </div>
      <div className="flex gap-3">
        <button onClick={attack} className="px-8 py-4 rounded-xl bg-gradient-to-b from-orange-500 to-red-600 active:scale-90 transition-transform font-extrabold text-lg">⚔️ 공격</button>
        <button onClick={defend} className={`px-8 py-4 rounded-xl font-extrabold text-lg active:scale-90 transition-transform ${warn === "strike" || warn === "warn" ? "bg-gradient-to-b from-sky-400 to-blue-600 ring-2 ring-white" : "bg-gradient-to-b from-sky-600 to-blue-800"}`}>🛡️ 방어</button>
      </div>
      <p className="text-[11px] text-gray-500 text-center">⚔️ 로 공격, &quot;지금 방어!&quot; 뜨면 🛡️ 로 막으세요!</p>
    </div>
  );
}

function MiniMission({ id, onWin, onFail }: { id: number; onWin: (c: number) => void; onFail: () => void }) {
  const cfg = MINI[id];
  if (!cfg) return null;
  if (cfg.kind === "spot") return <SpotGame emojis={cfg.emojis!} reward={cfg.reward} label={cfg.label} onWin={onWin} onFail={onFail} />;
  if (cfg.kind === "memory") return <MemoryGame reward={cfg.reward} hard={cfg.hard} onWin={onWin} onFail={onFail} />;
  if (cfg.kind === "mash") return <MashGame reward={cfg.reward} label={cfg.label} onWin={onWin} onFail={onFail} />;
  return <ReactionGame reward={cfg.reward} hard={cfg.hard} onWin={onWin} onFail={onFail} />;
}

export default function SpyGame() {
  const [screen, setScreen] = useState<Screen>("profile");
  const [profile, setProfile] = useState<SpyProfile>({
    codename: "",
    avatar: "🕵️",
    agency: "블랙팬서",
    stats: { stealth: 50, hacking: 50, combat: 50, charm: 50, stamina: 50 },
  });
  const [coins, setCoins] = useState(0);
  const [completedMissions, setCompletedMissions] = useState<Set<number>>(new Set());
  const [currentMission, setCurrentMission] = useState(1);
  const [ownedGadgets, setOwnedGadgets] = useState<Set<string>>(new Set());
  const [briefingDone, setBriefingDone] = useState(false);
  const [nextBonusAt, setNextBonusAt] = useState(0); // 다음 보너스 코인 수령 가능 시각(ms)
  const [now, setNow] = useState(0);

  // 보너스 쿨타임 로드
  useEffect(() => {
    try { setNextBonusAt(Number(localStorage.getItem("spy_bonus_next") || "0")); } catch { /* ignore */ }
    setNow(Date.now());
  }, []);
  // 허브에서 1초마다 남은 시간 갱신
  useEffect(() => {
    if (screen !== "hub") return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [screen]);

  const claimBonus = () => {
    if (Date.now() < nextBonusAt) return;
    setCoins(c => c + 666667);
    const next = Date.now() + 30 * 60 * 1000; // 30분 쿨타임
    setNextBonusAt(next);
    setNow(Date.now());
    try { localStorage.setItem("spy_bonus_next", String(next)); } catch { /* ignore */ }
  };

  const rank = getRank(completedMissions.size);
  const hasGadget = (id: string) => ownedGadgets.has(id);

  // 월드2 해금: 월드1(미션 1~35, 오류 보스 포함) 전부 클리어
  const world2Unlocked = Array.from({ length: 35 }, (_, i) => i + 1).every(id => completedMissions.has(id));

  // 월드2 입장 애니메이션 → 자동 전환
  useEffect(() => {
    if (screen === "world2intro") {
      const t = setTimeout(() => setScreen("world2"), 2800);
      return () => clearTimeout(t);
    }
  }, [screen]);

  const startMission = (id: number) => {
    setCurrentMission(id);
    setBriefingDone(false);
    setScreen("mission-briefing");
  };

  const onMissionWin = (bonusCoins: number) => {
    setCoins(c => c + bonusCoins);
    setCompletedMissions(prev => new Set([...prev, currentMission]));
    if (currentMission <= VISIBLE_MISSIONS && completedMissions.size + 1 >= VISIBLE_MISSIONS) {
      setScreen("game-complete");
    } else {
      setScreen("mission-complete");
    }
  };

  const onMissionFail = () => {
    setScreen("mission-fail");
  };

  const buyGadget = (g: Gadget) => {
    if (coins >= g.cost && !ownedGadgets.has(g.id)) {
      setCoins(c => c - g.cost);
      setOwnedGadgets(prev => new Set([...prev, g.id]));
    }
  };

  // ============================================================
  // WORLD 2 INTRO (입장 애니메이션)
  // ============================================================
  if (screen === "world2intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/40 to-black text-white flex items-center justify-center overflow-hidden relative">
        <style>{`
          @keyframes w2walk {
            0% { left: -12%; opacity: 0; }
            12% { opacity: 1; }
            80% { left: 50%; opacity: 1; }
            100% { left: 50%; opacity: 0; }
          }
          @keyframes w2bob {
            from { transform: translateY(0) rotate(-7deg); }
            to { transform: translateY(-12px) rotate(7deg); }
          }
          @keyframes w2shadow {
            from { transform: scaleX(1); opacity: .5; }
            to { transform: scaleX(0.7); opacity: .25; }
          }
          @keyframes w2fadein { from { opacity: 0; } to { opacity: 1; } }
          @keyframes w2mist { from { background-position: 0 0; } to { background-position: 800px 0; } }
        `}</style>

        {/* 흐르는 안개 */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: "radial-gradient(ellipse 60% 40% at 30% 70%, rgba(168,85,247,0.35), transparent), radial-gradient(ellipse 50% 30% at 70% 75%, rgba(56,189,248,0.25), transparent)",
          animation: "w2mist 6s linear infinite alternate",
        }} />

        {/* 신비로운 포탈 (중앙) */}
        <div className="absolute rounded-full border-2 border-fuchsia-400/40" style={{ left: "50%", top: "50%", width: 260, height: 260, transform: "translate(-50%,-50%)", animation: "spin 5s linear infinite" }} />
        <div className="absolute rounded-full border-2 border-cyan-400/30" style={{ left: "50%", top: "50%", width: 200, height: 200, transform: "translate(-50%,-50%)", animation: "spin 3s linear infinite reverse" }} />
        <div className="absolute rounded-full blur-2xl animate-pulse" style={{ left: "50%", top: "50%", width: 150, height: 150, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(232,121,249,0.9), rgba(79,70,229,0.35) 60%, transparent)" }} />

        {/* 걸어 들어가는 내 캐릭터 */}
        <div className="absolute" style={{ top: "56%", transform: "translate(-50%,-50%)", animation: "w2walk 2.6s ease-in forwards" }}>
          <div style={{ fontSize: 68, animation: "w2bob 0.34s ease-in-out infinite alternate" }}>{profile.avatar}</div>
          <div className="mx-auto rounded-full bg-black/50 blur-[2px]" style={{ width: 46, height: 10, marginTop: -4, animation: "w2shadow 0.34s ease-in-out infinite alternate" }} />
        </div>

        {/* 텍스트 */}
        <div className="absolute bottom-24 left-0 right-0 text-center z-10" style={{ animation: "w2fadein 1.2s ease-out 0.6s both" }}>
          <div className="text-xl font-extrabold bg-gradient-to-r from-fuchsia-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">
            요원 {profile.codename || "???"}, 미지의 세계로 걸어 들어간다...
          </div>
          <div className="text-xs text-fuchsia-300/70 mt-2 tracking-[0.3em]">비 밀 월 드 2</div>
        </div>
      </div>
    );
  }

  // ============================================================
  // WORLD 2 (미스테리 보스 + ??? 보스)
  // ============================================================
  if (screen === "world2") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white">
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setScreen("hub")} className="text-sm text-fuchsia-300 hover:text-fuchsia-200 mb-4">← 월드 1로</button>
          <h2 className="text-2xl font-extrabold text-center bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent mb-1">🌌 비밀 월드 2</h2>
          <p className="text-center text-xs text-fuchsia-300/70 mb-4">미스테리 보스 13 · ??? 보스 2 · 💰 보유 {coins.toLocaleString()}</p>
          <div className="space-y-2">
            {MISSIONS.filter(m => WORLD2_IDS.includes(m.id)).map(m => {
              const completed = completedMissions.has(m.id);
              const unknown = m.title.startsWith("???");
              return (
                <button key={m.id} onClick={() => startMission(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${completed ? "bg-fuchsia-900/40 border-fuchsia-500/60" : unknown ? "bg-black border-red-700/60 hover:border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-purple-950/60 border-purple-600/50 hover:border-fuchsia-400"}`}>
                  <span className="text-2xl">{completed ? "✅" : m.icon}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${unknown ? "text-red-300" : "text-fuchsia-200"}`}>{m.title}</div>
                    <div className="text-xs text-purple-300/60">{m.subtitle} · 💰{BOSSES[m.id]?.reward.toLocaleString()}</div>
                  </div>
                  <span className="text-xs text-purple-400">#{m.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE SCREEN
  // ============================================================
  if (screen === "profile") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-6 transition-colors">
            ← 홈으로
          </Link>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-green-400">🕵️ 스파이</span> <span className="text-cyan-400">되기</span>
            </h1>
            <p className="text-gray-400">Become a Spy!</p>
          </div>

          <div className="bg-gray-900/80 rounded-2xl p-6 border border-green-500/20 space-y-6">
            <h2 className="text-green-400 font-bold text-lg text-center">📋 스파이 프로필</h2>

            {/* Codename */}
            <div>
              <label className="text-gray-400 text-sm block mb-1">코드네임</label>
              <input
                value={profile.codename}
                onChange={e => setProfile({ ...profile, codename: e.target.value })}
                placeholder="코드네임을 입력하세요"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-green-400 font-mono
                  focus:outline-none focus:border-green-500 placeholder-gray-600"
                maxLength={12}
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">아바타</label>
              <div className="flex gap-3 justify-center">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setProfile({ ...profile, avatar: a })}
                    className={`text-3xl p-2 rounded-xl transition-all ${profile.avatar === a ? "bg-green-900 ring-2 ring-green-400 scale-110" : "bg-gray-800 hover:bg-gray-700"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Agency */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">소속 기관</label>
              <div className="grid grid-cols-3 gap-2">
                {AGENCIES.map(ag => (
                  <button key={ag.name} onClick={() => setProfile({ ...profile, agency: ag.name })}
                    className={`py-2 px-3 rounded-lg text-sm font-bold bg-gradient-to-r ${ag.color} transition-all
                      ${profile.agency === ag.name ? "ring-2 ring-green-400 scale-105" : "opacity-60 hover:opacity-100"}`}>
                    {ag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <label className="text-gray-400 text-sm block mb-2">스탯 배분 (탭하여 +10)</label>
              <div className="space-y-2">
                {(["stealth", "hacking", "combat", "charm", "stamina"] as const).map(s => {
                  const labels = { stealth: "🥷 은신", hacking: "💻 해킹", combat: "⚔️ 전투", charm: "✨ 매력", stamina: "💪 체력" };
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="text-sm w-20">{labels[s]}</span>
                      <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden cursor-pointer"
                        onClick={() => {
                          const total = Object.values(profile.stats).reduce((a, b) => a + b, 0);
                          if (total < 300 && profile.stats[s] < 100) {
                            setProfile({
                              ...profile,
                              stats: { ...profile.stats, [s]: Math.min(100, profile.stats[s] + 10) },
                            });
                          }
                        }}>
                        <div className="h-full bg-gradient-to-r from-green-600 to-cyan-500 transition-all duration-200"
                          style={{ width: `${profile.stats[s]}%` }} />
                      </div>
                      <span className="text-green-400 text-xs font-mono w-8">{profile.stats[s]}</span>
                    </div>
                  );
                })}
                <p className="text-gray-500 text-xs text-right">
                  포인트: {Object.values(profile.stats).reduce((a, b) => a + b, 0)}/300
                </p>
              </div>
            </div>

            <button
              onClick={() => { if (profile.codename.trim()) setScreen("hub"); }}
              disabled={!profile.codename.trim()}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all
                ${profile.codename.trim()
                  ? "bg-gradient-to-r from-green-700 to-cyan-700 hover:from-green-600 hover:to-cyan-600 text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}>
              🕵️ 임무 시작!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // HUB SCREEN
  // ============================================================
  if (screen === "hub") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-4 transition-colors">
            ← 홈으로
          </Link>

          {/* Agent Card */}
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-green-500/20 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{profile.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-mono font-bold">{profile.codename}</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{profile.agency}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span>{rank.icon}</span>
                  <span className="text-sm text-gray-400">{rank.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold">💰 {coins}</div>
                <div className="text-gray-500 text-xs">{Math.min(completedMissions.size, VISIBLE_MISSIONS)}/{VISIBLE_MISSIONS} 완료</div>
              </div>
            </div>
          </div>

          {/* Mission List (오류 보스 33~35 는 숨김) */}
          <h2 className="text-green-400 font-bold text-lg mb-3">📋 미션 목록</h2>
          <div className="space-y-2 mb-6">
            {MISSIONS.filter(m => m.id <= VISIBLE_MISSIONS).map(m => {
              const completed = completedMissions.has(m.id);
              const unlocked = m.id === 1 || completedMissions.has(m.id - 1) || completed;
              return (
                <button key={m.id} onClick={() => unlocked && startMission(m.id)}
                  disabled={!unlocked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                    ${completed
                      ? "bg-green-900/30 border border-green-500/30"
                      : unlocked
                        ? "bg-gray-800/80 border border-gray-600 hover:border-green-500 hover:bg-gray-700/50"
                        : "bg-gray-900/50 border border-gray-800 opacity-40 cursor-not-allowed"}`}>
                  <span className="text-2xl">{completed ? "✅" : unlocked ? m.icon : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.subtitle} · {m.location}</div>
                  </div>
                  <span className="text-xs text-gray-500">#{m.id}</span>
                </button>
              );
            })}
          </div>

          {/* 숨겨진 오류(ERROR) 보스 — 비밀보스 2개(31,32) 클리어 시 해금 */}
          {completedMissions.has(31) && completedMissions.has(32) && (
            <div className="mb-6">
              <h2 className="text-red-500 font-bold text-lg mb-3 animate-pulse">☠️ 오류 보스 (E̷R̷R̷O̷R̷)</h2>
              <div className="space-y-2">
                {MISSIONS.filter(m => ERROR_BOSS_IDS.includes(m.id)).map(m => {
                  const completed = completedMissions.has(m.id);
                  return (
                    <button key={m.id} onClick={() => startMission(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                        ${completed ? "bg-red-900/40 border-red-500/60" : "bg-black border-red-700/60 hover:border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]"}`}>
                      <span className="text-2xl">{completed ? "✅" : m.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-red-300">{m.title}</div>
                        <div className="text-xs text-red-500/70">{m.subtitle} · 보상 💰1,000,000</div>
                      </div>
                      <span className="text-xs text-red-500">#{m.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 돈 (보너스 코인, 30분에 1번) */}
          {(() => {
            const ready = now >= nextBonusAt;
            const remain = Math.max(0, nextBonusAt - now);
            const mm = Math.floor(remain / 60000);
            const ss = Math.floor((remain % 60000) / 1000);
            return (
              <button onClick={claimBonus} disabled={!ready}
                className={`w-full py-3 mb-3 rounded-xl font-bold transition-all ${
                  ready
                    ? "bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-slate-900"
                    : "bg-gray-900/60 border border-gray-700 text-gray-500 cursor-not-allowed"
                }`}>
                {ready ? "💰 보너스 코인 받기 (+666,667)" : `⏳ 다음 보너스까지 ${mm}:${String(ss).padStart(2, "0")}`}
              </button>
            );
          })()}

          {/* 비밀 월드 2 입장 (월드1 전부 클리어 시 해금) */}
          <button onClick={() => world2Unlocked && setScreen("world2intro")} disabled={!world2Unlocked}
            className={`w-full py-3 mb-3 rounded-xl font-bold transition-all border ${
              world2Unlocked
                ? "bg-gradient-to-r from-fuchsia-800 via-purple-800 to-indigo-900 hover:from-fuchsia-700 hover:to-indigo-800 border-fuchsia-400/40 shadow-[0_0_14px_rgba(232,121,249,0.4)]"
                : "bg-gray-900/60 border-gray-700 text-gray-500 cursor-not-allowed"
            }`}>
            {world2Unlocked ? "🌌 비밀 월드 2 입장" : "🔒 비밀 월드 2 (월드1 전부 클리어 시 해금)"}
          </button>

          {/* Shop Button */}
          <button onClick={() => setScreen("shop")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 font-bold transition-all">
            🛒 장비 상점
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SHOP SCREEN
  // ============================================================
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white">
        <div className="max-w-lg mx-auto p-6">
          <button onClick={() => setScreen("hub")}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-green-400 text-sm mb-6 transition-colors">
            ← 미션 목록
          </button>
          <h2 className="text-2xl font-bold text-center text-green-400 mb-2">🛒 스파이 장비 상점</h2>
          <p className="text-center text-yellow-400 mb-6">💰 보유 코인: {coins}</p>

          <div className="grid grid-cols-1 gap-3">
            {GADGETS.map(g => {
              const owned = ownedGadgets.has(g.id);
              const canBuy = coins >= g.cost && !owned;
              const rare = g.rarity === "rare";
              const mythic = g.rarity === "mythic";
              return (
                <div key={g.id} className={`p-4 rounded-xl border-2 flex items-center gap-3
                  ${mythic
                    ? "bg-gradient-to-r from-fuchsia-900/50 via-purple-800/40 to-pink-900/50 border-fuchsia-400/80 shadow-[0_0_18px_rgba(232,121,249,0.6)]"
                    : rare
                      ? "bg-gradient-to-r from-amber-900/40 via-yellow-800/30 to-amber-900/40 border-yellow-400/70 shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                      : owned ? "bg-green-900/20 border-green-500/30" : "bg-gray-800/80 border-gray-600"}`}>
                  <span className={`text-3xl ${mythic ? "drop-shadow-[0_0_8px_rgba(232,121,249,1)] animate-pulse" : rare ? "drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" : ""}`}>{g.icon}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-sm flex items-center gap-1 ${mythic ? "text-fuchsia-300" : rare ? "text-yellow-300" : ""}`}>
                      {g.name}
                      {mythic && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/40 to-pink-500/40 text-fuchsia-100 border border-fuchsia-300/60">🌈신화🌈</span>}
                      {rare && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/30 text-yellow-200 border border-yellow-400/50">✨전설✨</span>}
                    </div>
                    <div className="text-xs text-gray-400">{g.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">보유중</span>
                  ) : (
                    <button onClick={() => buyGadget(g)}
                      disabled={!canBuy}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors
                        ${canBuy ? "bg-yellow-700 hover:bg-yellow-600 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
                      💰 {g.cost.toLocaleString()}
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

  // ============================================================
  // MISSION BRIEFING
  // ============================================================
  if (screen === "mission-briefing") {
    const m = MISSIONS[currentMission - 1];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center">
          <div className="bg-gray-900/90 rounded-2xl p-8 border border-green-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" />
            <div className="text-xs text-green-400 font-mono mb-2">TOP SECRET // 극비</div>
            <div className="text-6xl mb-4">{m.icon}</div>
            <h2 className="text-2xl font-bold text-green-400 mb-1">미션 #{m.id}</h2>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{m.location}</p>
            <div className="text-sm text-gray-300 mb-6 min-h-[2.5rem]">
              <TypewriterText
                text={`요원 ${profile.codename}, ${m.title} 임무가 할당되었습니다. 행운을 빕니다.`}
                speed={35}
                onDone={() => setBriefingDone(true)}
              />
            </div>
            {briefingDone && (
              <button onClick={() => setScreen("mission")}
                className="px-8 py-3 bg-gradient-to-r from-green-700 to-cyan-700 hover:from-green-600 hover:to-cyan-600
                  rounded-xl text-white font-bold transition-all animate-pulse">
                🚀 임무 시작!
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION SCREEN
  // ============================================================
  if (screen === "mission") {
    const m = MISSIONS[currentMission - 1];
    const nightVision = currentMission === 1;

    return (
      <div className={`min-h-screen text-white ${nightVision ? "bg-gradient-to-b from-green-950 via-green-900/20 to-gray-950" : "bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950"}`}>
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">미션 #{m.id}: {m.title}</span>
            <button onClick={() => setScreen("hub")} className="text-sm text-red-400 hover:text-red-300">포기 ✕</button>
          </div>

          {currentMission === 1 && (
            <Mission1
              onWin={onMissionWin} onFail={onMissionFail}
              hasGoggles={hasGadget("goggles")}
              hasSilencer={hasGadget("silencer")}
              hasSmoke={hasGadget("smoke")}
            />
          )}
          {currentMission === 2 && (
            <Mission2 onWin={onMissionWin} onFail={onMissionFail} hasWatch={hasGadget("watch")} />
          )}
          {currentMission === 3 && (
            <Mission3 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 4 && (
            <Mission4 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 5 && (
            <Mission5 onWin={onMissionWin} onFail={onMissionFail} hasJetpack={hasGadget("jetpack")} hasWatch={hasGadget("watch")} />
          )}
          {currentMission === 6 && (
            <Mission6 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 7 && (
            <Mission7 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 8 && (
            <Mission8 onWin={onMissionWin} onFail={onMissionFail} hasWatch={hasGadget("watch")} />
          )}
          {currentMission === 9 && (
            <Mission9 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 10 && (
            <Mission10 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission === 11 && (
            <Mission11 onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission >= 12 && currentMission <= 26 && (
            <MiniMission id={currentMission} onWin={onMissionWin} onFail={onMissionFail} />
          )}
          {currentMission >= 27 && BOSSES[currentMission] && (
            <BossFight boss={BOSSES[currentMission]} teamCount={ERROR_BOSS_IDS.includes(currentMission) ? 6 : 3} onWin={onMissionWin} onFail={onMissionFail} />
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION COMPLETE
  // ============================================================
  if (screen === "mission-complete") {
    const m = MISSIONS[currentMission - 1];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">미션 성공!</h2>
          <p className="text-gray-400 mb-4">{m.title} 완료!</p>
          <div className="bg-gray-900/80 rounded-xl p-4 border border-green-500/30 mb-6 inline-block">
            <div className="text-yellow-400 font-bold">💰 코인 획득!</div>
            <div className="text-sm text-gray-400 mt-1">{rank.icon} 현재 랭크: {rank.name}</div>
            <div className="text-sm text-gray-400">{Math.min(completedMissions.size, VISIBLE_MISSIONS)}/{VISIBLE_MISSIONS} 미션 완료</div>
          </div>
          <div>
            <button onClick={() => setScreen("hub")}
              className="px-8 py-3 bg-gradient-to-r from-green-700 to-cyan-700 rounded-xl text-white font-bold">
              계속하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MISSION FAIL
  // ============================================================
  if (screen === "mission-fail") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-3xl font-bold text-red-400 mb-2">미션 실패!</h2>
          <p className="text-gray-400 mb-6">다시 도전하세요!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setBriefingDone(false); setScreen("mission-briefing"); }}
              className="px-6 py-3 bg-red-800 hover:bg-red-700 rounded-xl text-white font-bold">
              🔄 재도전
            </button>
            <button onClick={() => setScreen("hub")}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-bold">
              미션 목록
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // GAME COMPLETE
  // ============================================================
  if (screen === "game-complete") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/20 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-7xl mb-4">⭐</div>
          <h2 className="text-4xl font-bold text-yellow-400 mb-2">축하합니다!</h2>
          <h3 className="text-2xl text-green-400 mb-4">더블오 에이전트 달성!</h3>
          <p className="text-gray-400 mb-2">요원 <span className="text-green-400 font-mono">{profile.codename}</span></p>
          <p className="text-gray-400 mb-6">모든 미션을 완료했습니다!</p>
          <div className="bg-gray-900/80 rounded-xl p-4 border border-yellow-500/30 mb-6 inline-block">
            <div className="text-yellow-400 font-bold text-lg">💰 총 코인: {coins}</div>
            <div className="text-sm text-gray-400 mt-1">⭐ 최종 랭크: 더블오 에이전트</div>
            <div className="text-sm text-gray-400">🎖️ 장비 보유: {ownedGadgets.size}개</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setScreen("hub")}
              className="px-6 py-3 bg-gradient-to-r from-yellow-700 to-amber-700 rounded-xl text-white font-bold">
              미션 목록
            </button>
            <Link href="/"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-bold">
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
