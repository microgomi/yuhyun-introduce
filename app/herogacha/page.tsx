"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

// ───── 효과음 (Web Audio, 외부 파일 없음) ─────
let audioCtx: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.14) {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    }
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
function sfx(kind: "pull" | "attack" | "special" | "defend" | "hurt" | "win" | "lose" | "summon" | "glass" | "boom") {
  switch (kind) {
    case "boom": {
      // 콰콰콰과광!!! — 어어어어엄청 크고 웅장한 폭발 소리 (전설 이상)
      beep(80, 1.6, "sawtooth", 0.85);   // 초저음 폭발 굉음 (엄청 크게)
      beep(45, 2.0, "sine", 0.8);        // 뱃속 울리는 저음
      beep(120, 1.2, "square", 0.7);     // 강력한 충격파
      beep(180, 0.8, "sawtooth", 0.6);   // 초기 폭발음
      beep(260, 0.5, "square", 0.5);     // 날카로운 파열음
      beep(30, 2.4, "sine", 0.7);        // 지축을 흔드는 초저주파
      // 2차·3차 연쇄 폭발 (쿵! 쿵! 쿵!)
      [0.28, 0.6, 0.95, 1.35].forEach((t, i) => setTimeout(() => {
        beep(90 - i * 12, 0.7, "sawtooth", 0.65);
        beep(50 - i * 6, 0.9, "sine", 0.6);
      }, t * 1000));
      // 우르릉 쿵쿵 긴 여운
      [70, 50, 90, 45, 60, 40, 75, 38].forEach((f, i) => setTimeout(() => beep(f, 0.55, "sine", 0.4), 200 + i * 150));
      // 파편·잔해 튀는 고음
      [1200, 900, 1500, 700, 1800, 1000, 1400, 800, 1600].forEach((f, i) => setTimeout(() => beep(f, 0.07, "triangle", 0.15), 40 + i * 70));
      break;
    }
    case "pull": beep(660, 0.1, "triangle"); setTimeout(() => beep(990, 0.14, "triangle"), 90); break;
    case "glass": {
      // 쨍그랑! — 밝게 챙~ 하고 울린 뒤 유리 파편이 튀는 소리
      beep(3520, 0.28, "sine", 0.17);   // 밝은 금속성 '챙~' 울림
      beep(2637, 0.24, "sine", 0.12);   // 화음
      beep(4200, 0.05, "square", 0.13); // 부딪히는 순간 날카로운 충돌
      const shards = [2800, 3400, 2200, 3800, 2500, 3100, 1900, 3600, 2300, 2900, 1700, 3300];
      shards.forEach((f, i) => setTimeout(() => beep(f, 0.045, "triangle", 0.08), 70 + i * 40));
      break;
    }
    case "summon": [440, 660, 880, 1320].forEach((f, i) => setTimeout(() => beep(f, 0.14, "sine"), i * 90)); break;
    case "attack": beep(320, 0.07, "square", 0.12); break;
    case "special": [200, 500, 800].forEach((f, i) => setTimeout(() => beep(f, 0.16, "sawtooth"), i * 70)); break;
    case "defend": beep(520, 0.09, "triangle"); break;
    case "hurt": beep(140, 0.16, "square", 0.13); break;
    case "win": [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16), i * 110)); break;
    case "lose": [400, 300, 200].forEach((f, i) => setTimeout(() => beep(f, 0.2, "sawtooth"), i * 140)); break;
  }
}

/* ───── 등급 정의 ───── */
interface Rarity {
  name: string;
  color: string;
  glow: string;
  bg: string;
  chance: number; // 누적 확률 아님, 개별 가중치
  stars: number;
}
const RARITIES: Rarity[] = [
  { name: "노말", color: "#aaa", glow: "#ccc", bg: "#f0f0f0", chance: 40, stars: 1 },
  { name: "레어", color: "#4dabf7", glow: "#74c0fc", bg: "#e7f5ff", chance: 30, stars: 2 },
  { name: "에픽", color: "#ae3ec9", glow: "#cc5de8", bg: "#f3d9fa", chance: 18, stars: 3 },
  { name: "전설", color: "#f59f00", glow: "#fcc419", bg: "#fff9db", chance: 9, stars: 4 },
  { name: "신화", color: "#e03131", glow: "#ff6b6b", bg: "#ffe3e3", chance: 2.7, stars: 5 },
  { name: "???", color: "#000", glow: "#845ef7", bg: "#e5dbff", chance: 0.3, stars: 6 },
  { name: "우주", color: "#9c36b5", glow: "#da77f2", bg: "#f3d9fa", chance: 0.00000000054, stars: 7 },
  { name: "초월적", color: "#e8590c", glow: "#ffe066", bg: "#fff9db", chance: 1e-8, stars: 8 },
  { name: "신", color: "#fab005", glow: "#ffec99", bg: "#fff9db", chance: 0, stars: 9 }, // 뽑기 불가 — 2세계 보스로만 획득
  { name: "차원신", color: "#4263eb", glow: "#91a7ff", bg: "#dbe4ff", chance: 0, stars: 10 }, // 4세계 소환으로만 획득
];

/* ───── 히어로 정의 ───── */
interface HeroDef {
  id: number;
  name: string;
  emoji: string;
  rarity: number; // index into RARITIES
  power: number;
  skill: string;
  desc: string;
}

const HEROES: HeroDef[] = [
  // 노말 (0)
  { id: 1, name: "동네 아저씨", emoji: "👨", rarity: 0, power: 10, skill: "응원", desc: "힘내라 얘야!" },
  { id: 2, name: "길고양이", emoji: "🐱", rarity: 0, power: 12, skill: "할퀴기", desc: "야옹~ 할퀴기 공격!" },
  { id: 3, name: "비둘기 전사", emoji: "🐦", rarity: 0, power: 8, skill: "똥 폭격", desc: "하늘에서 폭격!" },
  { id: 4, name: "풍선맨", emoji: "🎈", rarity: 0, power: 11, skill: "떠오르기", desc: "둥둥 떠올라요" },
  { id: 5, name: "연필 용사", emoji: "✏️", rarity: 0, power: 9, skill: "찌르기", desc: "뾰족하게 찌른다!" },
  { id: 6, name: "양말 전사", emoji: "🧦", rarity: 0, power: 7, skill: "냄새 공격", desc: "극악의 냄새!" },
  // 레어 (1)
  { id: 7, name: "급식 요리사", emoji: "👨‍🍳", rarity: 1, power: 25, skill: "급식 투척", desc: "뜨거운 국물이다!" },
  { id: 8, name: "댕댕이 기사", emoji: "🐕", rarity: 1, power: 28, skill: "돌진", desc: "멍멍! 돌격!" },
  { id: 9, name: "로봇 청소기", emoji: "🤖", rarity: 1, power: 22, skill: "흡입", desc: "위이잉~ 다 빨아들인다" },
  { id: 10, name: "축구 선수", emoji: "⚽", rarity: 1, power: 27, skill: "슈팅", desc: "골인~!" },
  { id: 11, name: "마법 토끼", emoji: "🐰", rarity: 1, power: 24, skill: "당근 미사일", desc: "당근 발사!" },
  // 에픽 (2)
  { id: 12, name: "번개 닌자", emoji: "⚡", rarity: 2, power: 50, skill: "번개 베기", desc: "찌지직! 순식간에!" },
  { id: 13, name: "얼음 마법사", emoji: "🧊", rarity: 2, power: 48, skill: "빙결", desc: "꽁꽁 얼어라!" },
  { id: 14, name: "불꽃 사무라이", emoji: "🔥", rarity: 2, power: 52, skill: "화염참", desc: "활활 타올라!" },
  { id: 15, name: "바람의 궁수", emoji: "🏹", rarity: 2, power: 46, skill: "질풍 사격", desc: "바람을 타고!" },
  { id: 16, name: "대왕 문어", emoji: "🐙", rarity: 2, power: 55, skill: "먹물 폭발", desc: "먹물 뿌려!" },
  // 전설 (3)
  { id: 17, name: "드래곤 나이트", emoji: "🐉", rarity: 3, power: 100, skill: "용의 숨결", desc: "불을 뿜어라!" },
  { id: 18, name: "우주 전사", emoji: "🚀", rarity: 3, power: 95, skill: "레이저 빔", desc: "우주의 힘이다!" },
  { id: 19, name: "시간의 마법사", emoji: "⏰", rarity: 3, power: 105, skill: "시간 정지", desc: "시간이여 멈춰라!" },
  { id: 20, name: "황금 기사", emoji: "🏆", rarity: 3, power: 98, skill: "황금 방패", desc: "무적의 방어!" },
  // 신화 (4)
  { id: 21, name: "태양신 라", emoji: "☀️", rarity: 4, power: 200, skill: "태양 폭발", desc: "태양의 분노!" },
  { id: 22, name: "바다의 왕", emoji: "🌊", rarity: 4, power: 195, skill: "쓰나미", desc: "파도가 밀려온다!" },
  { id: 23, name: "어둠의 제왕", emoji: "👿", rarity: 4, power: 210, skill: "암흑 차원", desc: "어둠에 잠겨라!" },
  // ??? (5)
  { id: 24, name: "진유현 히어로", emoji: "🦸‍♂️", rarity: 5, power: 999, skill: "궁극의 힘", desc: "내가 바로 최강!" },
  { id: 25, name: "전설의 갓", emoji: "👑", rarity: 5, power: 888, skill: "전지전능", desc: "모든 것을 지배한다!" },

  // 우주 등급 (0.00000000054% — 초극악 확률)
  { id: 26, name: "우주 창조신", emoji: "🌌", rarity: 6, power: 5000, skill: "빅뱅", desc: "우주를 창조한다!" },
  { id: 27, name: "빅뱅 타이탄", emoji: "💥", rarity: 6, power: 4800, skill: "대폭발", desc: "모든 것의 시작!" },
  { id: 28, name: "은하 군주", emoji: "🌠", rarity: 6, power: 4600, skill: "은하 붕괴", desc: "은하를 다스린다!" },
  { id: 29, name: "블랙홀 마스터", emoji: "🕳️", rarity: 6, power: 4900, skill: "특이점", desc: "빛조차 삼킨다!" },
  { id: 30, name: "무한의 존재", emoji: "♾️", rarity: 6, power: 5555, skill: "무한대", desc: "끝이 없는 힘!" },

  // 초월적 등급 (0.00000000000000000000987753455234% — 상상 초월 확률)
  { id: 31, name: "창조주", emoji: "🌈", rarity: 7, power: 100000, skill: "창세", desc: "모든 것을 만든 자!" },
  { id: 32, name: "전능자", emoji: "✨", rarity: 7, power: 99999, skill: "전능", desc: "불가능이 없다!" },
  { id: 33, name: "초월자", emoji: "🔆", rarity: 7, power: 111111, skill: "초월", desc: "차원을 넘어선 존재!" },

  // 신 등급 (8) — 2세계 '최초의시작' 보스 처치로만 획득
  { id: 34, name: "최초의시작", emoji: "🌅", rarity: 8, power: 999999999, skill: "창세", desc: "모든 것의 시작, 신." },

  // 3세계 전용 소환 (신 등급)
  { id: 35, name: "오시", emoji: "🫥", rarity: 8, power: 500000000, skill: "무형", desc: "형체가 없는 존재, 오시." },
  { id: 36, name: "불가능한 꿈", emoji: "💭", rarity: 8, power: 700000000, skill: "몽환", desc: "이룰 수 없는 꿈이 실체가 되었다." },
  { id: 37, name: "다른 차원에서 넘어온 존재", emoji: "👽", rarity: 8, power: 1000000000, skill: "차원 이동", desc: "다른 차원에서 넘어온 미지의 존재." },

  // 4세계(4차원) 전용 소환 (차원신 등급)
  { id: 38, name: "시공간 지배자", emoji: "⏳", rarity: 9, power: 5000000000, skill: "시공 붕괴", desc: "시간과 공간을 다스리는 차원신." },
  { id: 39, name: "무한의 관측자", emoji: "👁️‍🗨️", rarity: 9, power: 7000000000, skill: "전지", desc: "모든 차원을 지켜보는 눈." },
  { id: 40, name: "4차원 생명체", emoji: "🛸", rarity: 9, power: 10000000000, skill: "초차원", desc: "4차원에서 온 초월적 생명체." },
];
const WORLD3_HERO_IDS = [35, 36, 37];
const WORLD4_HERO_IDS = [38, 39, 40];

// 5차원 ~ 11차원 (데이터 기반 자동 생성)
const EXTRA_WORLD_DEFS: { n: number; emoji: string; color: string; glow: string; heroes: { name: string; emoji: string }[] }[] = [
  { n: 5, emoji: "🌠", color: "#7048e8", glow: "#b197fc", heroes: [{ name: "별의 지배자", emoji: "🌟" }, { name: "공간 절단자", emoji: "✂️" }, { name: "5차원 관측자", emoji: "🔭" }] },
  { n: 6, emoji: "🕸️", color: "#0ca678", glow: "#63e6be", heroes: [{ name: "인과율 조작자", emoji: "🎯" }, { name: "확률의 신", emoji: "🎲" }, { name: "6차원 생명체", emoji: "🧬" }] },
  { n: 7, emoji: "🌀", color: "#e8590c", glow: "#ffa94d", heroes: [{ name: "무한 회귀자", emoji: "♻️" }, { name: "영원의 파수꾼", emoji: "⏱️" }, { name: "7차원 존재", emoji: "🔱" }] },
  { n: 8, emoji: "💠", color: "#1971c2", glow: "#74c0fc", heroes: [{ name: "현실 개변자", emoji: "🪄" }, { name: "평행세계 군주", emoji: "🪞" }, { name: "8차원 신", emoji: "👑" }] },
  { n: 9, emoji: "🌌", color: "#c2255c", glow: "#faa2c1", heroes: [{ name: "우주의 심판자", emoji: "⚖️" }, { name: "창조와 파괴", emoji: "☯️" }, { name: "9차원 초월체", emoji: "🌈" }] },
  { n: 10, emoji: "✴️", color: "#f08c00", glow: "#ffd43b", heroes: [{ name: "만물의 근원", emoji: "🔆" }, { name: "무의 지배자", emoji: "⚫" }, { name: "10차원 절대자", emoji: "💫" }] },
  { n: 11, emoji: "🔯", color: "#ae3ec9", glow: "#e599f7", heroes: [{ name: "모든 차원의 왕", emoji: "👑" }, { name: "최종 존재", emoji: "🌠" }, { name: "11차원 신 그 자체", emoji: "🌀" }] },
];
const EXTRA_WORLDS = EXTRA_WORLD_DEFS.map((def, wi) => {
  const rarityIdx = RARITIES.length;
  RARITIES.push({ name: `${def.n}차원신`, color: def.color, glow: def.glow, bg: "#f8f0fc", chance: 0, stars: 11 + wi });
  const heroIds = def.heroes.map((h, hi) => {
    const id = 41 + wi * 3 + hi;
    const power = Math.round(1e10 * Math.pow(8, def.n - 4) * (1 + hi * 0.4));
    HEROES.push({ id, name: h.name, emoji: h.emoji, rarity: rarityIdx, power, skill: `${def.n}차원의 힘`, desc: `${def.n}차원에서 온 초월적 존재.` });
    return id;
  });
  return { n: def.n, emoji: def.emoji, cost: Math.round(1e8 * Math.pow(5, def.n - 4)), heroIds };
});

// 각 차원(3~11)의 보스 (각자 고유 능력)
type DimBoss = { id: string; name: string; emoji: string; power: number; reward: number; grant: number | null; ability: BossAbility; abilityName: string };
const DIM_BOSSES: Record<number, DimBoss> = {
  3: { id: "dim3", name: "몽마", emoji: "👺", power: 1000000000, reward: 5000000, grant: null, ability: "poison", abilityName: "악몽의 독" },
  4: { id: "dim4", name: "차원 파괴자", emoji: "💥", power: 10000000000, reward: 20000000, grant: null, ability: "burst", abilityName: "차원 붕괴" },
  5: { id: "dim5", name: "별의 포식자", emoji: "🌟", power: 80000000000, reward: 50000000, grant: null, ability: "lifesteal", abilityName: "별빛 흡수" },
  6: { id: "dim6", name: "확률 조작자", emoji: "🎲", power: 640000000000, reward: 100000000, grant: null, ability: "shield", abilityName: "확률 방벽" },
  7: { id: "dim7", name: "시간 역행자", emoji: "⏳", power: 5000000000000, reward: 300000000, grant: null, ability: "poison", abilityName: "시간 부식" },
  8: { id: "dim8", name: "현실 붕괴자", emoji: "🪞", power: 40000000000000, reward: 1000000000, grant: null, ability: "burst", abilityName: "현실 붕괴" },
  9: { id: "dim9", name: "심판자", emoji: "⚖️", power: 300000000000000, reward: 5000000000, grant: null, ability: "lifesteal", abilityName: "영혼 심판" },
  10: { id: "dim10", name: "무의 군주", emoji: "⚫", power: 2500000000000000, reward: 20000000000, grant: null, ability: "shield", abilityName: "공허 방벽" },
  11: { id: "dim11", name: "종말의 왕", emoji: "🌀", power: 20000000000000000, reward: 100000000000, grant: null, ability: "burst", abilityName: "종말" },
};

/* ───── 컬렉션 히어로 ───── */
interface CollectedHero {
  hero: HeroDef;
  count: number;
  level: number;
}

type Screen = "main" | "pull" | "result" | "collection" | "battle" | "auto" | "world2" | "world3" | "world4" | "worldX" | "w2battle" | "raid";
interface RaidView { bossName: string; bossEmoji: string; bossHp: number; bossMax: number; round: number; players: { name: string; damage: number }[]; log: string[] }
const WORLD3_COST = 10000000; // 3세계 소환 비용
const WORLD4_COST = 100000000; // 4세계 소환 비용

// 2세계 보스 (각자 고유 능력)
type BossAbility = "burst" | "poison" | "lifesteal" | "shield";
const WORLD2_BOSSES: { id: string; name: string; emoji: string; power: number; reward: number; grant: number | null; ability: BossAbility; abilityName: string }[] = [
  { id: "err", name: "오류", emoji: "🆘", power: 1000000, reward: 100000, grant: null, ability: "burst", abilityName: "시스템 폭주" },
  { id: "ham", name: "이상햄", emoji: "🍖", power: 10000000, reward: 500000, grant: null, ability: "poison", abilityName: "부패의 냄새" },
  { id: "fall", name: "타락의신", emoji: "😈", power: 100000000, reward: 2000000, grant: null, ability: "lifesteal", abilityName: "타락의 손길" },
  { id: "first", name: "최초의시작", emoji: "🌅", power: 1000000000, reward: 10000000, grant: 34, ability: "shield", abilityName: "창세의 방벽" }, // 처치 시 신 등급 히어로 지급
];

// 패턴 게임 (이벤트 잠금 해제)
function PatternGame({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const pads = [{ e: "🔴", c: "#ef4444" }, { e: "🔵", c: "#3b82f6" }, { e: "🟢", c: "#22c55e" }, { e: "🟡", c: "#eab308" }];
  const [seq] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)));
  const [flash, setFlash] = useState(-1);
  const [phase, setPhase] = useState<"show" | "input">("show");
  const [pos, setPos] = useState(0);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let i = 0;
    const step = () => {
      setFlash(seq[i]);
      setTimeout(() => { setFlash(-1); i++; if (i < seq.length) setTimeout(step, 300); else setPhase("input"); }, 500);
    };
    const t = setTimeout(step, 500);
    return () => clearTimeout(t);
  }, [seq]);
  const tap = (p: number) => {
    if (phase !== "input") return;
    if (p !== seq[pos]) { setMsg("❌ 틀렸어요! 다시 시도하세요"); setTimeout(onClose, 800); return; }
    if (pos + 1 >= seq.length) { setMsg("✅ 성공! 이벤트 잠금 해제!"); setTimeout(onSuccess, 600); return; }
    setPos(x => x + 1);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-slate-900 border-2 border-yellow-400/50 p-4 text-center">
        <h3 className="font-black text-yellow-300 mb-1">🧩 패턴 게임</h3>
        <p className="text-xs text-gray-400 mb-3">{msg || (phase === "show" ? "👀 순서를 외우세요!" : "순서대로 누르세요!")}</p>
        <div className="grid grid-cols-2 gap-3">
          {pads.map((pad, i) => (
            <button key={i} onClick={() => tap(i)} disabled={phase === "show"}
              className="w-24 h-24 rounded-2xl text-4xl flex items-center justify-center transition-all"
              style={{ background: pad.c, opacity: flash === i ? 1 : 0.35, transform: flash === i ? "scale(1.1)" : "scale(1)" }}>
              {pad.e}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-white">취소</button>
      </div>
    </div>
  );
}

// 과학 퀴즈 (패턴 다음 2단계)
function ScienceGame({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const QS = [
    { q: "물은 몇 도에서 얼까요?", opts: ["0도", "50도", "100도"], a: 0 },
    { q: "지구에서 가장 가까운 별은?", opts: ["달", "태양", "북극성"], a: 1 },
    { q: "식물이 낮에 내보내는 기체는?", opts: ["산소", "이산화탄소", "질소"], a: 0 },
    { q: "번개가 친 뒤 소리(천둥)가 늦게 들리는 이유는?", opts: ["빛이 소리보다 빠름", "소리가 빛보다 빠름", "둘이 똑같음"], a: 0 },
  ];
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const pick = (i: number) => {
    if (i !== QS[idx].a) { setMsg("❌ 틀렸어요! 다시 도전하세요"); setTimeout(onClose, 900); return; }
    if (idx + 1 >= QS.length) { setMsg("✅ 통과! 이벤트 시작!"); setTimeout(onSuccess, 700); return; }
    setMsg("정답! 다음 문제 ▶"); setTimeout(() => { setMsg(""); setIdx(x => x + 1); }, 500);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-slate-900 border-2 border-cyan-400/50 p-4 text-center">
        <h3 className="font-black text-cyan-300 mb-1">🔬 과학 퀴즈 ({idx + 1}/{QS.length})</h3>
        <p className="text-sm text-white mb-3 min-h-[2.5rem]">{msg || QS[idx].q}</p>
        <div className="space-y-2">
          {QS[idx].opts.map((o, i) => (
            <button key={i} onClick={() => pick(i)} className="w-full rounded-lg bg-slate-800 hover:bg-cyan-800 p-2 text-sm font-bold active:scale-95">{o}</button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-white">취소</button>
      </div>
    </div>
  );
}

/* ───── 뽑기 애니메이션 단계 ───── */
type PullPhase = "shaking" | "cracking" | "reveal";

// 초대량 연차 (숫자가 엄청나게 커도 루프 없이 처리)
const MEGA_PULL = 1e12; // 초우주 연차 (10000억 = 1조차)
const MEGA_COST = 99999999999999999999; // 약 1000경

// 자동 강화 계산 (큰 수는 수식으로 → 루프 폭주 방지)
function autoLevel(count: number, level: number): { count: number; level: number } {
  if (count > 100000) {
    const b = level + 0.5;
    let n = Math.floor(-b + Math.sqrt(b * b + 2 * count));
    if (n < 0) n = 0;
    const consumed = (nn: number) => nn * (level + 1) + (nn * (nn - 1)) / 2;
    while (n > 0 && consumed(n) > count) n--;
    while (count - consumed(n) >= level + n + 1) n++;
    return { level: level + n, count: count - consumed(n) };
  }
  while (count >= level + 1) { count -= level + 1; level += 1; }
  return { count, level };
}

// 보스 전투 — 보스마다 고유 능력 (닌자 무관)
const ABILITY_DESC: Record<BossAbility, string> = {
  burst: "💥 강력한 일격! (큰 피해)",
  poison: "☠️ 독 안개 — 매 턴 서서히 피해",
  lifesteal: "🩸 흡혈 — 때리면 자기 체력 회복",
  shield: "🛡️ 방벽 — 가끔 무적이 되어 공격이 안 통함",
};
function BossBattle({ boss, teamPower, team, onWin, onFail }: {
  boss: { name: string; emoji: string; power: number; grant: number | null; ability: BossAbility; abilityName: string };
  teamPower: number; team: { emoji: string; name: string }[]; onWin: () => void; onFail: () => void;
}) {
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [charge, setCharge] = useState(0);
  const [attacker, setAttacker] = useState(-1);
  const [warn, setWarn] = useState<"idle" | "warn" | "strike">("idle");
  const [shielded, setShielded] = useState(false);
  const [msg, setMsg] = useState("⚔️ 전투 시작! 공격하세요!");
  const [shake, setShake] = useState(false);
  const warnRef = useRef<"idle" | "warn" | "strike">("idle");
  const shieldedRef = useRef(false);
  const defendedRef = useRef(false);
  const overRef = useRef(false);

  const powerRatio = Math.min(2.5, Math.max(0.15, teamPower / boss.power));
  const atkDmg = Math.max(2, Math.round(9 * powerRatio));

  const hitBoss = (amount: number) => {
    if (overRef.current) return;
    if (shieldedRef.current) { setMsg("🛡️ 방벽에 막혔다!"); return; }
    setShake(true); setTimeout(() => setShake(false), 120);
    setBossHp(hp => {
      const nh = Math.max(0, hp - amount);
      if (nh <= 0 && !overRef.current) { overRef.current = true; setMsg("🎉 보스 격파!"); sfx("win"); setTimeout(onWin, 900); }
      return nh;
    });
  };
  const flashAttacker = () => { if (team.length === 0) return; const i = Math.floor(Math.random() * team.length); setAttacker(i); setTimeout(() => setAttacker(a => (a === i ? -1 : a)), 250); };
  const attack = () => { if (overRef.current) return; sfx("attack"); flashAttacker(); hitBoss(atkDmg); setCharge(c => Math.min(5, c + 1)); if (!shieldedRef.current) setMsg(`⚔️ 팀 공격! -${atkDmg}`); };
  const special = () => { if (overRef.current || charge < 5) return; sfx("special"); setCharge(0); hitBoss(40); if (!shieldedRef.current) setMsg("💥 팀 필살기 합체!! -40"); };
  const defend = () => { if (warnRef.current !== "idle") { defendedRef.current = true; sfx("defend"); setMsg("🛡️ 방어 성공!"); } };

  useEffect(() => {
    let a: ReturnType<typeof setTimeout>, b: ReturnType<typeof setTimeout>, c: ReturnType<typeof setTimeout>, sIv: ReturnType<typeof setInterval> | null = null;
    // 능력: 독 (매 2.5초 서서히 피해)
    let poisonIv: ReturnType<typeof setInterval> | null = null;
    if (boss.ability === "poison") {
      poisonIv = setInterval(() => {
        if (overRef.current) return;
        setPlayerHp(hp => { const nh = Math.max(0, hp - 4); if (nh <= 0 && !overRef.current) { overRef.current = true; setMsg("💀 패배..."); setTimeout(onFail, 900); } return nh; });
      }, 2500);
    }
    // 능력: 방벽 (주기적 무적)
    if (boss.ability === "shield") {
      sIv = setInterval(() => {
        if (overRef.current) return;
        setShielded(true); shieldedRef.current = true; setMsg("🛡️ 창세의 방벽! 공격 무효!");
        setTimeout(() => { setShielded(false); shieldedRef.current = false; }, 1800);
      }, 6000);
    }
    const cycle = () => {
      if (overRef.current) return;
      setWarn("warn"); warnRef.current = "warn"; defendedRef.current = false;
      a = setTimeout(() => {
        if (overRef.current) return;
        setWarn("strike"); warnRef.current = "strike"; setMsg(`⚠️ ${boss.name}의 ${boss.abilityName}! 방어!`);
        b = setTimeout(() => {
          if (overRef.current) return;
          if (!defendedRef.current) {
            const dmg = boss.ability === "burst" ? 28 : 18;
            sfx("hurt");
            setPlayerHp(hp => { const nh = Math.max(0, hp - dmg); if (nh <= 0 && !overRef.current) { overRef.current = true; setMsg("💀 패배..."); sfx("lose"); setTimeout(onFail, 900); } return nh; });
            if (boss.ability === "lifesteal") { setBossHp(hp => Math.min(100, hp + 8)); }
          }
          setWarn("idle"); warnRef.current = "idle";
          c = setTimeout(cycle, 1600);
        }, 900);
      }, 700);
    };
    c = setTimeout(cycle, 1500);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); if (sIv) clearInterval(sIv); if (poisonIv) clearInterval(poisonIv); };
  }, [boss]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {shielded && <div className="absolute inset-0 -m-3 rounded-full border-4 border-sky-300 animate-pulse" />}
        <div className={`text-7xl transition-transform ${shake ? "scale-90" : ""} ${warn === "strike" ? "animate-bounce" : ""}`}>{boss.emoji}</div>
      </div>
      <div className="font-bold text-red-300">{boss.name}{boss.grant ? " 🌅(신 등급!)" : ""}</div>
      <div className="text-[11px] text-fuchsia-300">✨ 고유 능력: {boss.abilityName} — {ABILITY_DESC[boss.ability]}</div>
      <div className="w-full max-w-xs h-4 bg-gray-800 rounded-full overflow-hidden border border-red-500/40">
        <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all" style={{ width: `${bossHp}%` }} />
      </div>
      <div className={`h-6 text-sm font-bold ${warn === "warn" ? "text-yellow-400 animate-pulse" : warn === "strike" ? "text-red-500" : "text-cyan-300"}`}>{msg}</div>

      {/* 내 팀 */}
      <div className="flex items-end gap-2">
        {team.length ? team.map((t, i) => (
          <div key={i} className={`flex flex-col items-center transition-transform ${attacker === i ? "scale-125 -translate-y-1" : ""}`} title={t.name}>
            <span className="text-3xl">{t.emoji}</span>
            {attacker === i && <span className="text-[9px]">⚔️</span>}
          </div>
        )) : <span className="text-4xl">🦸</span>}
      </div>
      <div className="text-[10px] text-cyan-300">👥 팀전 · {team.length}명 참전</div>
      <div className="w-full max-w-xs h-3 bg-gray-800 rounded-full overflow-hidden border border-green-500/40">
        <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all" style={{ width: `${playerHp}%` }} />
      </div>
      <div className="text-xs text-gray-400">팀 HP {playerHp} · 필살기 충전 {charge}/5</div>

      <div className="flex gap-2 mt-1">
        <button onClick={attack} className="px-5 py-3 rounded-xl bg-gradient-to-b from-orange-500 to-red-600 font-extrabold active:scale-90 transition-transform">⚔️ 공격</button>
        <button onClick={special} disabled={charge < 5} className={`px-5 py-3 rounded-xl font-extrabold active:scale-90 transition-transform ${charge >= 5 ? "bg-gradient-to-b from-yellow-400 to-orange-500 text-slate-900 animate-pulse" : "bg-gray-700 text-gray-400"}`}>💥 필살기</button>
        <button onClick={defend} className={`px-5 py-3 rounded-xl font-extrabold active:scale-90 transition-transform ${warn !== "idle" ? "bg-gradient-to-b from-sky-400 to-blue-600 ring-2 ring-white" : "bg-gradient-to-b from-sky-600 to-blue-800"}`}>🛡️ 방어</button>
      </div>
      <p className="text-[11px] text-gray-500 text-center">⚔️ 공격으로 충전 → 💥 필살기! &ldquo;방어!&rdquo; 뜨면 🛡️ 로 막기. 보스 고유 능력에 주의!</p>
    </div>
  );
}

export default function HeroGachaPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(100);
  const [collection, setCollection] = useState<Map<number, CollectedHero>>(new Map());
  const [pullResult, setPullResult] = useState<HeroDef | null>(null);
  const [pullPhase, setPullPhase] = useState<PullPhase>("shaking");
  const [isNew, setIsNew] = useState(false);
  const [totalPulls, setTotalPulls] = useState(0);
  const [pity, setPity] = useState(0); // 천장 카운터
  const [luckyPity, setLuckyPity] = useState(0); // 999 우주 보장 카운터
  const [transcendPity, setTranscendPity] = useState(0); // 초월 보장 카운터
  const [patternOpen, setPatternOpen] = useState(false); // 패턴 게임 모달
  const [scienceOpen, setScienceOpen] = useState(false); // 과학 퀴즈 모달
  const [secretClicks, setSecretClicks] = useState(0); // 비밀 이벤트 (로고 7번)
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [w2Cleared, setW2Cleared] = useState<Set<string>>(new Set());
  const [w2Log, setW2Log] = useState<string[]>([]);
  const [w2Boss, setW2Boss] = useState<DimBoss | null>(null);
  const [battleReturn, setBattleReturn] = useState<Screen>("world2");
  // 멀티 레이드
  const [raidName, setRaidName] = useState("");
  const [raidJoined, setRaidJoined] = useState(false);
  const [raidData, setRaidData] = useState<RaidView | null>(null);
  const [world3Result, setWorld3Result] = useState<HeroDef | null>(null);
  const [world4Result, setWorld4Result] = useState<HeroDef | null>(null);
  const [extraWorld, setExtraWorld] = useState<number>(5); // 현재 보고 있는 상위 차원(5~11)
  const [worldXResult, setWorldXResult] = useState<HeroDef | null>(null);
  const [shards, setShards] = useState(0); // 차원 조각 (포탈 재료)
  const [openedPortals, setOpenedPortals] = useState<Set<number>>(new Set());
  const [battleTeam, setBattleTeam] = useState<number[]>([]);
  const [battleResult, setBattleResult] = useState<{ won: boolean; enemy: string; reward: number } | null>(null);
  // 오토 사냥
  const [autoHunting, setAutoHunting] = useState(false);
  const [autoLog, setAutoLog] = useState<string[]>([]);
  const [autoKills, setAutoKills] = useState(0);
  const [autoEarned, setAutoEarned] = useState(0);
  const [bulkResult, setBulkResult] = useState<{ total: number; counts: number[]; topHeroes: { hero: HeroDef; n: number }[] } | null>(null);
  const [skipAnim, setSkipAnim] = useState(false); // 뽑기 연출 스킵
  // 1000배 이벤트
  const [eventEndsAt, setEventEndsAt] = useState(0);
  const [eventMult, setEventMult] = useState(1000);
  const [nextBossAt, setNextBossAt] = useState(0);
  const [now, setNow] = useState(0);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const eventEndsAtRef = useRef(0);
  const eventMultRef = useRef(1000);
  useEffect(() => { eventEndsAtRef.current = eventEndsAt; }, [eventEndsAt]);
  useEffect(() => { eventMultRef.current = eventMult; }, [eventMult]);
  const [battlePhase, setBattlePhase] = useState<"select" | "enemy" | "fighting" | "done">("select");
  const [selectedEnemy, setSelectedEnemy] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [multiResults, setMultiResults] = useState<HeroDef[]>([]);
  const [showMulti, setShowMulti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  /* ───── 뽑기 로직 ───── */
  const pickRarity = useCallback((currentPity: number): number => {
    // 50회 천장: 신화 확정
    if (currentPity >= 49) return 4;
    // 30회 이상: 전설 확률 증가
    const boost = currentPity >= 29 ? 2 : 1;
    const weights = RARITIES.map((r, i) => {
      if (i === 3) return r.chance * boost;
      if (i === 4) return r.chance * (1 + currentPity * 0.02);
      return r.chance;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return 0;
  }, []);

  const pickHero = useCallback((rarityIdx: number): HeroDef => {
    const pool = HEROES.filter(h => h.rarity === rarityIdx);
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const addToCollection = useCallback((hero: HeroDef): boolean => {
    let isNewHero = false;
    setCollection(prev => {
      const next = new Map(prev);
      const existing = next.get(hero.id);
      let entry = existing ? { ...existing, count: existing.count + 1 } : { hero, count: 1, level: 1 };
      if (!existing) isNewHero = true;
      // 자동 강화: 가능한 만큼 레벨업
      while (entry.count >= entry.level + 1) {
        entry = { ...entry, level: entry.level + 1, count: entry.count - (entry.level + 1) };
      }
      next.set(hero.id, entry);
      return next;
    });
    return isNewHero;
  }, []);

  const doPull = useCallback((count: number) => {
    const cost = count === 1 ? 10 : count === 10 ? 90 : count === 100 ? 800 : count === 1000 ? 1000 : count === 100000 ? 1500000 : count === MEGA_PULL ? MEGA_COST : count === 100000000000 ? 99999999999 : 100000000000000000000000000;
    if (coins < cost) return;
    sfx("pull");
    setCoins(c => c - cost);
    setTotalPulls(t => t + count);

    // 초월 보장: 누적 999,999,999,999번마다 초월적 15개
    const TRANSCEND_THRESHOLD = 999999999999;
    const newTp = transcendPity + count;
    const grants = Math.floor(newTp / TRANSCEND_THRESHOLD);
    setTranscendPity(newTp % TRANSCEND_THRESHOLD);
    if (grants > 0) {
      const totalT = grants * 15;
      const pool = HEROES.filter(h => h.rarity === 7);
      setCollection(prev => {
        const next = new Map(prev);
        pool.forEach((hero, idx) => {
          const per = Math.floor(totalT / pool.length) + (idx < totalT % pool.length ? 1 : 0);
          if (per <= 0) return;
          const ex = next.get(hero.id);
          const leveled = autoLevel((ex ? ex.count : 0) + per, ex ? ex.level : 1);
          next.set(hero.id, { hero, count: leveled.count, level: leveled.level });
        });
        return next;
      });
    }

    if (count === 1) {
      const lp = luckyPity + 1;
      const rarityIdx = lp >= 999 ? 6 : pickRarity(pity); // 999번째 = 우주 확정
      setLuckyPity(lp >= 999 ? 0 : lp);
      const hero = pickHero(rarityIdx);
      const rareSfx = rarityIdx >= 3 ? "boom" : rarityIdx === 2 ? "glass" : null; // 전설↑ 폭발 / 에픽 쨍그랑
      const newHero = !collection.has(hero.id);
      addToCollection(hero);
      setPullResult(hero);
      setIsNew(newHero);
      setPity(rarityIdx >= 4 ? 0 : pity + 1);
      if (skipAnim) {
        if (rareSfx) sfx(rareSfx);
        setPullPhase("reveal");
        setScreen("result");
      } else {
        setPullPhase("shaking");
        setScreen("pull");
        setTimeout(() => { setPullPhase("cracking"); if (rareSfx) sfx(rareSfx); }, 1000);
        setTimeout(() => { setPullPhase("reveal"); setScreen("result"); }, 2000);
      }
    } else if (count >= 300000) {
      // 초대량 뽑기 — 루프 대신 확률 통계로 한 번에 계산
      const weights = RARITIES.map(r => r.chance);
      const totalW = weights.reduce((a, b) => a + b, 0);
      const counts = weights.map(w => Math.floor(count * (w / totalW)));
      counts[0] += count - counts.reduce((a, b) => a + b, 0); // 나머지는 노말로
      setPity(0);
      setCollection(prev => {
        const next = new Map(prev);
        counts.forEach((cnt, ri) => {
          if (cnt <= 0) return;
          const pool = HEROES.filter(h => h.rarity === ri);
          pool.forEach((hero, idx) => {
            const per = Math.floor(cnt / pool.length) + (idx < cnt % pool.length ? 1 : 0);
            if (per <= 0) return;
            const ex = next.get(hero.id);
            const startCount = (ex ? ex.count : 0) + per;
            const startLevel = ex ? ex.level : 1;
            const leveled = autoLevel(startCount, startLevel);
            next.set(hero.id, { hero, count: leveled.count, level: leveled.level });
          });
        });
        return next;
      });
      const topHeroes: { hero: HeroDef; n: number }[] = [];
      for (let ri = RARITIES.length - 1; ri >= 0; ri--) {
        if (counts[ri] > 0) {
          const pool = HEROES.filter(h => h.rarity === ri);
          pool.forEach(h => topHeroes.push({ hero: h, n: Math.floor(counts[ri] / pool.length) }));
        }
      }
      if (counts.slice(3).some(c => c > 0)) sfx("boom"); // 전설 이상 포함 — 폭발 소리
      else if (counts[2] > 0) sfx("glass"); // 에픽 포함 — 유리 깨지는 소리
      setBulkResult({ total: count, counts, topHeroes });
      setPullPhase("reveal");
      setScreen("result");
    } else {
      // 10연차 / 100연차
      const results: HeroDef[] = [];
      let currentPity = pity;
      let lp = luckyPity;
      for (let i = 0; i < count; i++) {
        lp++;
        const rarityIdx = lp >= 999 ? 6 : pickRarity(currentPity); // 999번째 = 우주 확정
        if (lp >= 999) lp = 0;
        const hero = pickHero(rarityIdx);
        addToCollection(hero);
        results.push(hero);
        currentPity = rarityIdx >= 4 ? 0 : currentPity + 1;
      }
      setPity(currentPity);
      setLuckyPity(lp);
      const bestRarity = results.reduce((m, h) => Math.max(m, h.rarity), 0);
      const rareSfx = bestRarity >= 3 ? "boom" : bestRarity === 2 ? "glass" : null; // 전설↑ 폭발 / 에픽 쨍그랑
      setMultiResults(results);
      setShowMulti(true);
      if (skipAnim) {
        if (rareSfx) sfx(rareSfx);
        setPullPhase("reveal");
        setScreen("result");
      } else {
        setPullPhase("shaking");
        setScreen("pull");
        setTimeout(() => { setPullPhase("cracking"); if (rareSfx) sfx(rareSfx); }, 1000);
        setTimeout(() => { setPullPhase("reveal"); setScreen("result"); }, 2000);
      }
    }
  }, [coins, pity, luckyPity, transcendPity, collection, pickRarity, pickHero, addToCollection, skipAnim]);

  /* ───── 배틀 ───── */
  const enemies = [
    { name: "슬라임 군단", emoji: "🟢", power: 30, reward: 15, desc: "말랑말랑한 초보 적" },
    { name: "고블린 부대", emoji: "👺", power: 80, reward: 25, desc: "도둑질 좋아하는 녀석들" },
    { name: "스켈레톤 왕", emoji: "💀", power: 150, reward: 40, desc: "뼈다귀 군대의 왕" },
    { name: "독 거미 여왕", emoji: "🕷️", power: 220, reward: 50, desc: "독을 뿜는 거대 거미" },
    { name: "다크 드래곤", emoji: "🐲", power: 300, reward: 60, desc: "불을 뿜는 용" },
    { name: "얼음 골렘", emoji: "🧊", power: 400, reward: 75, desc: "얼어붙은 거인" },
    { name: "마왕", emoji: "😈", power: 500, reward: 100, desc: "어둠의 지배자" },
    { name: "카오스 신", emoji: "🌀", power: 700, reward: 150, desc: "혼돈 그 자체" },
    { name: "료멘 스쿠나", emoji: "👹", power: 1000, reward: 250, desc: "저주의 왕, 손가락 20개의 주인" },
    { name: "진시현", emoji: "👦", power: 1500, reward: 400, desc: "유현이의 형, 최종 보스" },
    { name: "고허", emoji: "👁️", power: 99999, reward: 3000, desc: "모든 것을 보는 눈, 고허" },
    { name: "??? 조스", emoji: "🌩️", power: 777777500, reward: 999999, desc: "번개의 신, 궁극의 ??? 최종 보스! (너프됨)" },
  ];

  // 오토 사냥 루프 — 한 틱(0.1초)에 여러 마리 배치 처리 (UI 렉 방지 + 초고속 코인)
  useEffect(() => {
    if (!autoHunting) return;
    const HUNTS = 1; // 한 틱당 사냥 수 (1마리씩)
    const iv = setInterval(() => {
      const teamPower = [...collection.values()]
        .map(c => c.hero.power * (1 + (c.level - 1) * 0.2))
        .sort((a, b) => b - a)
        .slice(0, 5)
        .reduce((s, p) => s + p, 0);
      if (teamPower <= 0) {
        setAutoLog(l => ["⚠️ 히어로가 없어요! 먼저 뽑기를 하세요.", ...l].slice(0, 10));
        return;
      }
      const beatable = enemies.filter(e => teamPower >= e.power);
      const target = beatable.length ? beatable[beatable.length - 1] : enemies[0];
      const won = teamPower >= target.power;
      const mult = Date.now() < eventEndsAtRef.current ? eventMultRef.current : 1; // 평상시 1배, 이벤트 배수
      const totalGain = (won ? target.reward * mult : 15 * mult) * HUNTS;
      setCoins(c => c + totalGain);
      setAutoEarned(e => e + totalGain);
      setShards(s => s + HUNTS); // 차원 조각 획득
      if (won) setAutoKills(k => k + HUNTS);
      setAutoLog(l => [`${won ? "🎉" : "💔"} ${target.emoji} ${target.name} ${HUNTS.toLocaleString()}마리 ${won ? "처치" : "실패"} +${totalGain.toLocaleString()}코인`, ...l].slice(0, 10));
    }, 100); // 0.1초마다 1마리씩 (빠르게)
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHunting, collection]);

  // 오토 사냥 상태 유지 (새로고침해도 계속 켜짐)
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    try { if (localStorage.getItem("herogacha_auto") === "1") setAutoHunting(true); } catch { /* ignore */ }
    autoLoadedRef.current = true;
  }, []);
  useEffect(() => {
    if (!autoLoadedRef.current) return;
    try { localStorage.setItem("herogacha_auto", autoHunting ? "1" : "0"); } catch { /* ignore */ }
  }, [autoHunting]);

  // 3세계 소환 (오시 / 불가능한 꿈 / 다른 차원에서 넘어온 존재 중 하나)
  const pullWorld3 = () => {
    if (coins < WORLD3_COST) return;
    setCoins(c => c - WORLD3_COST);
    const id = WORLD3_HERO_IDS[Math.floor(Math.random() * WORLD3_HERO_IDS.length)];
    const hero = HEROES.find(h => h.id === id)!;
    addToCollection(hero);
    sfx("summon"); setWorld3Result(hero);
  };

  // 상위 차원(5~11) 소환
  const pullExtraWorld = (n: number) => {
    const world = EXTRA_WORLDS.find(w => w.n === n);
    if (!world || coins < world.cost) return;
    setCoins(c => c - world.cost);
    const id = world.heroIds[Math.floor(Math.random() * world.heroIds.length)];
    const hero = HEROES.find(h => h.id === id)!;
    addToCollection(hero);
    sfx("summon"); setWorldXResult(hero);
  };
  // 포탈 열기 (차원 조각 소모)
  const portalCost = (n: number) => (n - 4) * 500; // 5차원=500, 6=1000 ... 11=3500
  const openPortal = (n: number) => {
    if (openedPortals.has(n) || shards < portalCost(n)) return;
    setShards(s => s - portalCost(n));
    setOpenedPortals(prev => new Set([...prev, n]));
  };

  // 4세계 소환 (차원신 등급)
  const pullWorld4 = () => {
    if (coins < WORLD4_COST) return;
    setCoins(c => c - WORLD4_COST);
    const id = WORLD4_HERO_IDS[Math.floor(Math.random() * WORLD4_HERO_IDS.length)];
    const hero = HEROES.find(h => h.id === id)!;
    addToCollection(hero);
    sfx("summon"); setWorld4Result(hero);
  };

  // 멀티 레이드: 참전 중이면 1.5초마다 서버 상태 동기화(하트비트)
  useEffect(() => {
    if (screen !== "raid" || !raidJoined || !raidName) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/raid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", name: raidName }) });
        const d = await r.json();
        if (alive) setRaidData(d);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 1500);
    return () => { alive = false; clearInterval(iv); };
  }, [screen, raidJoined, raidName]);

  const raidAttack = async () => {
    const best = [...collection.values()].reduce((m, c) => Math.max(m, c.hero.power * (1 + (c.level - 1) * 0.2)), 0);
    const dmg = Math.round(20 + Math.min(500, best / 1e8));
    sfx("attack");
    try {
      const r = await fetch("/api/raid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "attack", name: raidName, dmg }) });
      setRaidData(await r.json());
    } catch { /* ignore */ }
  };

  // 보스 인터랙티브 전투 시작 (2세계 + 각 차원)
  const startW2Battle = (boss: DimBoss, ret: Screen = "world2") => { setW2Boss(boss); setBattleReturn(ret); setScreen("w2battle"); };
  // 전투 승리 보상
  const w2Reward = (boss: DimBoss) => {
    setCoins(c => c + boss.reward);
    setW2Cleared(prev => new Set([...prev, boss.id]));
    let grantMsg = "";
    if (boss.grant) {
      const hero = HEROES.find(h => h.id === boss.grant);
      if (hero) { addToCollection(hero); grantMsg = ` · 🌅 ${hero.name}(신) 획득!`; }
    }
    setW2Log(l => [`🎉 ${boss.emoji} ${boss.name} 처치! +${boss.reward.toLocaleString()}코인${grantMsg}`, ...l].slice(0, 8));
  };

  // 이벤트 로드 + 1초 타이머 (남은 시간/보스 쿨 갱신)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("herogacha_event");
      if (raw) { const d = JSON.parse(raw); setEventEndsAt(d.end || 0); setEventMult(d.mult || 1000); }
    } catch { /* ignore */ }
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const BOOST_COST = 3000000;
  const buyBoost = () => {
    setCoins(c => {
      if (c < BOOST_COST) return c;
      const end = Date.now() + 3 * 60 * 1000; // 3분
      setEventEndsAt(end); setEventMult(999);
      try { localStorage.setItem("herogacha_event", JSON.stringify({ end, mult: 999 })); } catch { /* ignore */ }
      setEventLog(l => ["⚡ 999배 부스트 구매! (3분)", ...l].slice(0, 8));
      return c - BOOST_COST;
    });
  };

  const startEvent = (mult: number) => {
    const end = Date.now() + 3 * 60 * 1000; // 3분
    setEventEndsAt(end);
    setEventMult(mult);
    try { localStorage.setItem("herogacha_event", JSON.stringify({ end, mult })); } catch { /* ignore */ }
    setEventLog(l => [`🎉 ${mult.toLocaleString()}배 코인 이벤트 시작! (3분 · 1분마다 비밀 보스)`, ...l].slice(0, 8));
  };

  // 이벤트 비밀 보스
  const SECRET_EVENT_BOSS = { name: "공허의 지배자", emoji: "🌑", power: 5000000, reward: 3000000 };
  const fightSecretBoss = () => {
    if (Date.now() >= eventEndsAtRef.current) return; // 이벤트 중에만
    if (Date.now() < nextBossAt) return;              // 1분 쿨다운
    const tp = [...collection.values()].map(c => c.hero.power * (1 + (c.level - 1) * 0.2)).sort((a, b) => b - a).slice(0, 5).reduce((s, p) => s + p, 0);
    const won = tp >= SECRET_EVENT_BOSS.power;
    const gain = won ? SECRET_EVENT_BOSS.reward * eventMultRef.current : 1000; // 이벤트 배수
    setCoins(c => c + gain);
    setNextBossAt(Date.now() + 60 * 1000);
    setEventLog(l => [`${won ? "🎉" : "💔"} ${SECRET_EVENT_BOSS.emoji} ${SECRET_EVENT_BOSS.name} ${won ? "처치!" : "실패..."} +${gain.toLocaleString()}코인`, ...l].slice(0, 8));
  };

  const startBattle = useCallback(() => {
    if (battleTeam.length === 0) return;
    setBattlePhase("fighting");
    const teamPower = battleTeam.reduce((sum, id) => {
      const c = collection.get(id);
      if (!c) return sum;
      return sum + c.hero.power * (1 + (c.level - 1) * 0.2);
    }, 0);

    const enemy = enemies[selectedEnemy];
    const logs: string[] = [];
    logs.push(`⚔️ ${enemy.emoji} ${enemy.name} 등장!`);
    logs.push(`우리 팀 전투력: ${Math.floor(teamPower)}`);
    logs.push(`적 전투력: ${enemy.power}`);

    // 전투 시뮬레이션
    let hp = teamPower;
    let enemyHp = enemy.power;
    let turn = 1;
    while (hp > 0 && enemyHp > 0 && turn <= 10) {
      const dmg = Math.floor(teamPower * (0.2 + Math.random() * 0.3));
      const enemyDmg = Math.floor(enemy.power * (0.1 + Math.random() * 0.3));
      enemyHp -= dmg;
      hp -= enemyDmg;
      logs.push(`턴 ${turn}: 💥 ${dmg} 데미지! / 적 반격 ${enemyDmg}`);
      turn++;
    }

    const won = enemyHp <= 0;
    const mult = Date.now() < eventEndsAtRef.current ? eventMultRef.current : 1; // 평상시 1배, 이벤트 배수
    const winGain = enemy.reward * mult;
    const loseGain = 15 * mult;
    if (won) {
      logs.push(`🎉 승리! +${winGain} 코인`);
      setCoins(c => c + winGain);
    } else {
      logs.push(`💔 패배... +${loseGain} 코인`);
      setCoins(c => c + loseGain);
    }

    setBattleLog(logs);
    setBattleResult({ won, enemy: enemy.name, reward: won ? winGain : loseGain });
    setTimeout(() => setBattlePhase("done"), 500);
  }, [battleTeam, collection, selectedEnemy]);

  /* ───── 레벨업 ───── */
  const levelUp = useCallback((heroId: number) => {
    setCollection(prev => {
      const next = new Map(prev);
      const c = next.get(heroId);
      if (!c || c.count < c.level + 1) return prev;
      next.set(heroId, { ...c, level: c.level + 1, count: c.count - (c.level + 1) });
      return next;
    });
  }, []);

  /* ───── 뽑기 연출 캔버스 ───── */
  useEffect(() => {
    if (screen !== "pull") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width;
    const H = cvs.height;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[] = [];
    let shake = 0;
    let crack = 0;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);

      // 배경
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      const phase = pullPhase;
      const cx = W / 2;
      const cy = H / 2;

      if (phase === "shaking") {
        shake += 0.3;
        const ox = Math.sin(shake * 10) * Math.min(shake * 2, 15);
        const oy = Math.cos(shake * 8) * Math.min(shake * 2, 10);

        // 빛나는 원
        const grad = ctx.createRadialGradient(cx + ox, cy + oy, 10, cx + ox, cy + oy, 80);
        grad.addColorStop(0, "#ffd43b");
        grad.addColorStop(0.5, "#fab005");
        grad.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 80, 0, Math.PI * 2);
        ctx.fill();

        // 물음표
        ctx.fillStyle = "#fff";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", cx + ox, cy + oy);

        // 흔들림 파티클
        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: cx + Math.cos(angle) * 60,
            y: cy + Math.sin(angle) * 60,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            r: 3 + Math.random() * 3,
            color: `hsl(${Math.random() * 60 + 30}, 100%, 60%)`,
            life: 30,
          });
        }
      } else if (phase === "cracking") {
        crack += 0.05;
        // 갈라지는 효과
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + crack * 100);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.3, "#ffd43b");
        grad.addColorStop(1, "#1a1a2e");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 60 + crack * 50, 0, Math.PI * 2);
        ctx.fill();

        // 갈라짐 선
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + crack;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * (40 + crack * 80), cy + Math.sin(angle) * (40 + crack * 80));
          ctx.stroke();
        }

        // 폭발 파티클
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 2 + Math.random() * 4,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            life: 40,
          });
        }
      }

      // 파티클 업데이트
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.r *= 0.97;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (phase !== "reveal") {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, pullPhase]);

  /* ───── 렌더링 ───── */
  const rarityBorder = (r: number) => {
    const colors = ["#aaa", "#4dabf7", "#ae3ec9", "#f59f00", "#e03131", "#845ef7"];
    return colors[r] || "#aaa";
  };

  // 메인 화면
  if (screen === "main") {
    const collectedCount = collection.size;
    const totalHeroes = HEROES.length;
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2 cursor-pointer select-none"
              onClick={() => setSecretClicks(c => { const n = c + 1; if (n >= 7) setSecretUnlocked(true); return n; })}>🎰</div>
            <h1 className="text-3xl font-black mb-1">히어로 뽑기</h1>
            <p className="text-purple-300 text-sm">최강의 히어로를 모아라!</p>
          </div>

          {/* 🤫 비밀 이벤트 (로고 7번 클릭 시 등장) */}
          {secretUnlocked && (
            <button onClick={() => { startEvent(5000); setSecretUnlocked(false); setSecretClicks(0); }}
              className="w-full mb-3 rounded-xl p-3 font-black bg-gradient-to-r from-fuchsia-600 via-yellow-400 to-fuchsia-600 text-slate-900 animate-pulse border-2 border-white/60">
              🤫 비밀 이벤트 발견! 5000배 이벤트 시작! (3분)
            </button>
          )}

          {/* 코인 & 상태 */}
          <div className="bg-purple-900/50 rounded-xl p-3 mb-4 flex justify-between items-center">
            <div>
              <span className="text-yellow-400 text-lg font-bold">🪙 {coins}</span>
              <span className="text-purple-300 text-xs ml-2">코인</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-300">도감: {collectedCount}/{totalHeroes}</div>
              <div className="text-xs text-purple-400">총 뽑기: {totalPulls}회</div>
              <div className="text-xs text-purple-400">천장: {pity}/50</div>
            </div>
          </div>

          {/* 1000배 이벤트 */}
          {(() => {
            const active = now < eventEndsAt;
            const remain = Math.max(0, eventEndsAt - now);
            const hh = Math.floor(remain / 3600000);
            const mm = Math.floor((remain % 3600000) / 60000);
            const ss = Math.floor((remain % 60000) / 1000);
            const bossReady = now >= nextBossAt;
            const bossRemain = Math.max(0, nextBossAt - now);
            return (
              <div className="mb-3 rounded-xl border-2 border-yellow-400/60 bg-gradient-to-r from-amber-900/40 to-red-900/40 p-3">
                {active ? (
                  <>
                    <div className="text-center font-black text-yellow-300 animate-pulse">🎉 {eventMult.toLocaleString()}배 코인 이벤트 진행 중!</div>
                    <div className="text-center text-xs text-amber-200 mb-2">남은 시간 {hh}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</div>
                    <button onClick={fightSecretBoss} disabled={!bossReady}
                      className={`w-full rounded-lg p-2 font-bold ${bossReady ? "bg-gradient-to-r from-purple-700 to-black hover:from-purple-600" : "bg-gray-700 text-gray-400"}`}>
                      {bossReady ? "🌑 비밀 보스 도전! (공허의 지배자)" : `🌑 비밀 보스 재등장까지 ${Math.ceil(bossRemain / 1000)}초`}
                    </button>
                    {eventLog.length > 0 && (
                      <div className="mt-2 text-[11px] text-amber-100 space-y-0.5">
                        {eventLog.slice(0, 4).map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const pw = window.prompt("🔒 이벤트 새로고침 암호를 입력하세요:");
                        if (pw === null) return;
                        if (pw === "0000") {
                          setEventEndsAt(0); setEventLog([]);
                          try { localStorage.removeItem("herogacha_event"); } catch { /* ignore */ }
                        } else {
                          window.alert("❌ 암호가 틀렸어요!");
                        }
                      }}
                      className="mt-2 w-full rounded-lg p-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600">
                      🔒 이벤트 새로고침 (암호 필요)
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center text-xs text-amber-200">🎉 코인 이벤트 (3분 · 1분마다 비밀 보스)</div>
                    <button onClick={() => setPatternOpen(true)} className="w-full rounded-lg p-2 font-black bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900">
                      🧩 패턴 풀고 5배 이벤트 시작!
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 999배 부스트 구매 */}
          <button onClick={buyBoost} disabled={coins < BOOST_COST}
            className="w-full mb-3 rounded-xl p-2 text-sm font-black bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 text-slate-900 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400">
            ⚡ 999배 부스트 구매! (💰{BOOST_COST.toLocaleString()} · 3분)
          </button>

          {/* 50% 도박 이벤트 (비용 1000조) */}
          <button
            onClick={() => {
              if (coins < 1000000000000000) return;
              setCoins(c => c - 1000000000000000);
              if (Math.random() < 0.5) { startEvent(500000000); window.alert("🎉 성공! 5억배 이벤트 시작! (3분)"); }
              else { window.alert("💔 실패! 돈만 날렸어요... 다시 도전!"); }
            }}
            disabled={coins < 1000000000000000}
            className="w-full mb-3 rounded-xl p-2 text-sm font-black bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400">
            🎲 50% 도박 이벤트! (💰1,000,000,000,000,000 → 성공하면 5억배 · 3분)
          </button>

          {/* 연출 스킵 토글 */}
          <button
            onClick={() => setSkipAnim(s => !s)}
            className={`w-full mb-3 rounded-xl p-2 text-sm font-bold transition-all ${skipAnim ? "bg-cyan-600 hover:bg-cyan-500" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            ⏩ 뽑기 연출 스킵: {skipAnim ? "켜짐 (바로 결과)" : "꺼짐"}
          </button>

          {/* 보장 카운터 */}
          <div className="text-center text-xs font-bold text-purple-300 mb-1">🌌 우주 보장까지 {(999 - luckyPity).toLocaleString()}회!</div>
          <div className="text-center text-xs font-bold text-orange-300 mb-2">✨ 초월 보장까지 {(999999999999 - transcendPity).toLocaleString()}회 (초월 15개!)</div>

          {/* 뽑기 버튼 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => doPull(1)}
              disabled={coins < 10}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">🎲</div>
              <div>1회 뽑기</div>
              <div className="text-xs opacity-80">🪙 10</div>
            </button>
            <button
              onClick={() => doPull(10)}
              disabled={coins < 90}
              className="bg-gradient-to-r from-purple-500 to-pink-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">🎰</div>
              <div>10연차</div>
              <div className="text-xs opacity-80">🪙 90</div>
            </button>
            <button
              onClick={() => doPull(100)}
              disabled={coins < 800}
              className="bg-gradient-to-r from-red-500 to-yellow-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform"
            >
              <div className="text-2xl mb-1">💎</div>
              <div>100연차</div>
              <div className="text-xs opacity-80">🪙 800</div>
            </button>
            <button
              onClick={() => doPull(1000)}
              disabled={coins < 1000}
              className="bg-gradient-to-r from-fuchsia-600 via-purple-500 to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform border border-fuchsia-300/50"
            >
              <div className="text-2xl mb-1">🌈</div>
              <div>1000차</div>
              <div className="text-xs opacity-80">🪙 1,000</div>
            </button>
            <button
              onClick={() => doPull(100000)}
              disabled={coins < 1500000}
              className="col-span-2 bg-gradient-to-r from-amber-500 via-red-500 to-fuchsia-600 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform border-2 border-yellow-300/60"
            >
              <div className="text-2xl mb-1">🌟</div>
              <div>100000차 (10만 연차!)</div>
              <div className="text-xs opacity-80">🪙 1,500,000</div>
            </button>
            <button
              onClick={() => doPull(100000000000)}
              disabled={coins < 99999999999}
              className="col-span-2 bg-gradient-to-r from-black via-fuchsia-700 to-black disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform border-2 border-fuchsia-300/70"
            >
              <div className="text-2xl mb-1">🌌</div>
              <div>1000억 연차!!!</div>
              <div className="text-[10px] opacity-80">🪙 99,999,999,999</div>
            </button>
            <button
              onClick={() => doPull(MEGA_PULL)}
              disabled={coins < MEGA_COST}
              className="col-span-2 bg-gradient-to-r from-fuchsia-700 via-black to-fuchsia-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl p-4 text-center font-bold shadow-lg active:scale-95 transition-transform border-2 border-fuchsia-300/80"
            >
              <div className="text-2xl mb-1">🌠</div>
              <div>초우주 연차 (10000억차)</div>
              <div className="text-[9px] opacity-80">🪙 99,999,999,999,999,999,999</div>
            </button>
          </div>

          {/* 메뉴 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setBattleTeam([]); setBattleResult(null); setBattlePhase("select"); setBattleLog([]); setScreen("battle"); }}
              className="bg-red-900/60 hover:bg-red-800/60 rounded-xl p-3 text-center"
            >
              <div className="text-2xl">⚔️</div>
              <div className="text-sm font-bold">배틀</div>
              <div className="text-xs text-red-300">코인 벌기</div>
            </button>
            <button
              onClick={() => setScreen("collection")}
              className="bg-blue-900/60 hover:bg-blue-800/60 rounded-xl p-3 text-center"
            >
              <div className="text-2xl">📖</div>
              <div className="text-sm font-bold">도감</div>
              <div className="text-xs text-blue-300">{collectedCount}마리 수집</div>
            </button>
          </div>

          {/* 오토 사냥 버튼 */}
          <button
            onClick={() => setScreen("auto")}
            className={`w-full mb-4 rounded-xl p-3 text-center font-bold transition-all ${autoHunting ? "bg-gradient-to-r from-green-600 to-emerald-500 animate-pulse" : "bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700"}`}
          >
            🤖 오토 사냥 {autoHunting ? "(가동 중! 코인 자동 획득 ⚡)" : "— 자동으로 코인 벌기"}
          </button>

          {/* 멀티 레이드 버튼 */}
          <button onClick={() => { setRaidData(null); setScreen("raid"); }}
            className="w-full mb-3 rounded-xl p-3 text-center font-black bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 text-slate-900 hover:brightness-110 transition-all">
            🌐 멀티 레이드 (다른 플레이어와 보스전!)
          </button>

          {/* 2세계 버튼 */}
          <button onClick={() => setScreen("world2")}
            className="w-full mb-3 rounded-xl p-3 text-center font-bold bg-gradient-to-r from-slate-800 via-red-900 to-slate-800 border border-red-500/50 hover:from-red-900/60 transition-all">
            🌍 2세계 입장 (오류 · 이상햄 · 타락의신 · 최초의시작)
          </button>

          {/* 3세계 버튼 */}
          <button onClick={() => { setWorld3Result(null); setScreen("world3"); }}
            className="w-full mb-3 rounded-xl p-3 text-center font-bold bg-gradient-to-r from-indigo-900 via-fuchsia-900 to-indigo-900 border border-fuchsia-400/50 hover:from-fuchsia-900/60 transition-all">
            🌀 3세계 입장 (오시 · 불가능한 꿈 · 다른 차원의 존재 소환)
          </button>

          {/* 4세계 버튼 */}
          <button onClick={() => { setWorld4Result(null); setScreen("world4"); }}
            className="w-full mb-3 rounded-xl p-3 text-center font-bold bg-gradient-to-r from-blue-900 via-indigo-700 to-blue-900 border border-blue-300/60 hover:from-indigo-800 transition-all shadow-[0_0_12px_rgba(66,99,235,0.4)]">
            🌌 4세계(4차원) 입장 (차원신 소환!)
          </button>

          {/* 5~11차원 (재료로 포탈 열기) */}
          <div className="mb-4 rounded-xl bg-black/30 p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-cyan-300">🌌 상위 차원 (5~11)</span>
              <span className="text-xs text-cyan-200">🔷 차원 조각: {shards.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">🔷 조각은 오토 사냥으로 모아요. 포탈을 열면 입장 가능!</p>
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_WORLDS.map(w => {
                const opened = openedPortals.has(w.n);
                return opened ? (
                  <button key={w.n} onClick={() => { setExtraWorld(w.n); setWorldXResult(null); setScreen("worldX"); }}
                    className="rounded-lg p-2 text-xs font-bold bg-gradient-to-r from-indigo-800 to-purple-800 hover:from-indigo-700 border border-purple-400/50">
                    {w.emoji} {w.n}차원 입장
                  </button>
                ) : (
                  <button key={w.n} onClick={() => openPortal(w.n)} disabled={shards < portalCost(w.n)}
                    className="rounded-lg p-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600">
                    🔒 {w.n}차원 포탈 (🔷{portalCost(w.n)})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 확률표 */}
          <div className="bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">📊 등급 확률</h3>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {RARITIES.map(r => (
                <div key={r.name} className="text-center p-1 rounded" style={{ color: r.color }}>
                  {"⭐".repeat(r.stars).slice(0, 5)}{r.stars > 5 ? "💎" : ""}<br />
                  {r.name} {r.chance}%
                </div>
              ))}
            </div>
          </div>

          {/* 이벤트 잠금 해제: 패턴 → 과학 퀴즈 → 이벤트 시작 */}
          {patternOpen && (
            <PatternGame
              onSuccess={() => { setPatternOpen(false); setScienceOpen(true); }}
              onClose={() => setPatternOpen(false)}
            />
          )}
          {scienceOpen && (
            <ScienceGame
              onSuccess={() => { setScienceOpen(false); startEvent(5); }}
              onClose={() => setScienceOpen(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // 2세계
  if (screen === "world2") {
    const teamPower = [...collection.values()].map(c => c.hero.power * (1 + (c.level - 1) * 0.2)).sort((a, b) => b - a).slice(0, 5).reduce((s, p) => s + p, 0);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-red-950/40 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setScreen("main")} className="text-red-300 text-sm">← 뒤로</button>
            <h2 className="text-2xl font-black">🌍 2세계</h2>
            <span className="text-yellow-400 text-sm">🪙 {coins.toLocaleString()}</span>
          </div>
          <p className="text-center text-xs text-red-300/80 mb-3">내 팀 전투력: {Math.floor(teamPower).toLocaleString()}</p>
          <div className="space-y-2">
            {WORLD2_BOSSES.map((boss, i) => {
              const cleared = w2Cleared.has(boss.id);
              const unlocked = i === 0 || w2Cleared.has(WORLD2_BOSSES[i - 1].id);
              return (
                <button key={boss.id} onClick={() => unlocked && startW2Battle(boss)} disabled={!unlocked}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${cleared ? "bg-green-900/30 border-green-500/50" : unlocked ? "bg-red-950/50 border-red-600/50 hover:border-red-400" : "bg-gray-900/50 border-gray-800 opacity-40"}`}>
                  <span className="text-3xl">{cleared ? "✅" : unlocked ? boss.emoji : "🔒"}</span>
                  <div className="flex-1">
                    <div className={`font-bold ${boss.grant ? "text-yellow-300" : ""}`}>{boss.name}{boss.grant ? " 🌅(신 등급!)" : ""}</div>
                    <div className="text-xs text-red-300/70">전투력 {boss.power.toLocaleString()} · 보상 💰{boss.reward.toLocaleString()}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {w2Log.length > 0 && (
            <div className="mt-4 bg-black/40 rounded-xl p-3 text-xs space-y-1">
              {w2Log.map((l, i) => <div key={i} className={i === 0 ? "text-white" : "text-gray-400"}>{l}</div>)}
            </div>
          )}
          <p className="mt-3 text-center text-[11px] text-red-300/60">보스를 순서대로 처치! 최초의시작을 이기면 🌅 신 등급 히어로를 얻어요.</p>
        </div>
      </div>
    );
  }

  // 멀티 레이드 (다른 플레이어와 공동 보스전)
  if (screen === "raid") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-950 via-slate-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setRaidJoined(false); setScreen("main"); }} className="text-teal-300 text-sm">← 나가기</button>
            <h2 className="text-2xl font-black">🌐 멀티 레이드</h2>
            <span />
          </div>

          {!raidJoined ? (
            <div className="text-center space-y-3 mt-8">
              <p className="text-sm text-teal-300">닉네임을 정하고 참전하세요!<br />같은 와이파이의 다른 기기/탭에서도 같이 싸울 수 있어요.</p>
              <input value={raidName} onChange={e => setRaidName(e.target.value.slice(0, 12))} placeholder="닉네임"
                className="w-full rounded-lg border border-teal-600 bg-slate-800 px-3 py-2 text-center outline-none focus:border-teal-400" />
              <button onClick={() => { if (raidName.trim()) setRaidJoined(true); }} disabled={!raidName.trim()}
                className="w-full rounded-xl p-3 font-black bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-900 disabled:opacity-40">
                ⚔️ 레이드 참전!
              </button>
            </div>
          ) : !raidData ? (
            <p className="text-center text-teal-300 mt-10 animate-pulse">서버 연결 중...</p>
          ) : (
            <>
              <div className="text-center mb-3">
                <div className="text-6xl mb-1">{raidData.bossEmoji}</div>
                <div className="font-black text-red-300">{raidData.bossName} (라운드 {raidData.round})</div>
              </div>
              <div className="w-full h-5 bg-gray-800 rounded-full overflow-hidden border border-red-500/40 mb-1">
                <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all" style={{ width: `${(raidData.bossHp / raidData.bossMax) * 100}%` }} />
              </div>
              <div className="text-center text-xs text-gray-400 mb-3">HP {raidData.bossHp.toLocaleString()} / {raidData.bossMax.toLocaleString()}</div>

              <button onClick={raidAttack}
                className="w-full rounded-2xl p-5 font-black text-xl bg-gradient-to-b from-orange-500 to-red-600 active:scale-95 transition-transform mb-3">
                ⚔️ 공격!!
              </button>

              {/* 참전자 랭킹 */}
              <div className="bg-black/30 rounded-xl p-3 mb-3">
                <div className="text-xs font-bold text-teal-300 mb-2">👥 참전자 ({raidData.players.length}명) — 기여 데미지</div>
                {raidData.players.map((p, i) => (
                  <div key={p.name} className={`flex justify-between text-sm ${p.name === raidName ? "text-yellow-300 font-bold" : "text-gray-300"}`}>
                    <span>{i + 1}. {p.name}{p.name === raidName ? " (나)" : ""}</span>
                    <span>{p.damage.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {raidData.log.length > 0 && (
                <div className="bg-black/40 rounded-xl p-3 text-[11px] space-y-0.5 text-teal-100">
                  {raidData.log.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
              <p className="mt-2 text-center text-[10px] text-teal-400/60">모두 함께 공격해서 보스를 잡아요! 잡으면 다음 라운드(더 강해짐).</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2세계 보스 전투 (닌자고 드래곤라이징 스타일)
  if (screen === "w2battle" && w2Boss) {
    const sortedTeam = [...collection.values()].map(c => ({ emoji: c.hero.emoji, name: c.hero.name, tp: c.hero.power * (1 + (c.level - 1) * 0.2) })).sort((a, b) => b.tp - a.tp).slice(0, 5);
    const teamPower = sortedTeam.reduce((s, t) => s + t.tp, 0);
    const boss = w2Boss;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-red-950/50 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setScreen(battleReturn)} className="text-red-300 text-sm">← 포기</button>
            <h2 className="text-xl font-black">⚔️ 보스 배틀</h2>
            <span className="text-xs text-gray-400">내 전투력 {Math.floor(teamPower).toLocaleString()}</span>
          </div>
          <BossBattle
            key={boss.id}
            boss={boss}
            teamPower={teamPower}
            team={sortedTeam.map(t => ({ emoji: t.emoji, name: t.name }))}
            onWin={() => { w2Reward(boss); setScreen(battleReturn); }}
            onFail={() => { setW2Log(l => [`💔 ${boss.emoji} ${boss.name} 전투 패배...`, ...l].slice(0, 8)); setScreen(battleReturn); }}
          />
        </div>
      </div>
    );
  }

  // 3세계 (특별 소환)
  if (screen === "world3") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-fuchsia-950/50 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setScreen("main")} className="text-fuchsia-300 text-sm">← 뒤로</button>
            <h2 className="text-2xl font-black">🌀 3세계</h2>
            <span className="text-yellow-400 text-sm">🪙 {coins.toLocaleString()}</span>
          </div>
          <p className="text-center text-xs text-fuchsia-300/80 mb-4">차원의 문 너머 존재를 소환하세요</p>

          {/* 소환 결과 */}
          {world3Result && (
            <div className="mb-4 rounded-2xl border-2 border-fuchsia-400/70 bg-black/40 p-5 text-center shadow-[0_0_20px_rgba(232,121,249,0.5)]">
              <div className="text-6xl mb-2">{world3Result.emoji}</div>
              <div className="text-lg font-black text-fuchsia-200">{world3Result.name}</div>
              <div className="text-xs text-purple-300 mt-1">👑 신 등급 · ⚔️ {world3Result.power.toLocaleString()}</div>
              <div className="text-xs text-fuchsia-300/70 mt-1">&ldquo;{world3Result.desc}&rdquo;</div>
            </div>
          )}

          {/* 소환할 수 있는 존재 목록 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {WORLD3_HERO_IDS.map(id => {
              const h = HEROES.find(x => x.id === id)!;
              const owned = collection.has(id);
              return (
                <div key={id} className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/40 p-2 text-center">
                  <div className="text-3xl">{h.emoji}</div>
                  <div className="text-[10px] text-fuchsia-200 leading-tight">{h.name}</div>
                  {owned && <div className="text-[9px] text-green-400">✔ 보유</div>}
                </div>
              );
            })}
          </div>

          <button onClick={pullWorld3} disabled={coins < WORLD3_COST}
            className="w-full rounded-xl p-4 font-black bg-gradient-to-r from-fuchsia-600 via-purple-500 to-indigo-600 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-lg active:scale-95 transition-transform">
            🌀 차원 소환! (💰{WORLD3_COST.toLocaleString()})
          </button>
          <p className="mt-2 text-center text-[11px] text-fuchsia-300/60">오시 · 불가능한 꿈 · 다른 차원에서 넘어온 존재 중 하나가 나와요 (모두 신 등급!)</p>
          <button onClick={() => startW2Battle(DIM_BOSSES[3], "world3")}
            className="w-full mt-3 rounded-xl p-3 font-black bg-gradient-to-r from-red-800 to-black border border-red-500/50 hover:from-red-700">
            ⚔️ 3차원 보스 도전! ({DIM_BOSSES[3].emoji} {DIM_BOSSES[3].name} · {DIM_BOSSES[3].abilityName})
          </button>
        </div>
      </div>
    );
  }

  // 4세계 (4차원 소환)
  if (screen === "world4") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setScreen("main")} className="text-blue-300 text-sm">← 뒤로</button>
            <h2 className="text-2xl font-black">🌌 4세계 (4차원)</h2>
            <span className="text-yellow-400 text-sm">🪙 {coins.toLocaleString()}</span>
          </div>
          <p className="text-center text-xs text-blue-300/80 mb-4">4차원의 문이 열린다... 차원신을 소환하세요</p>

          {world4Result && (
            <div className="mb-4 rounded-2xl border-2 border-blue-300/70 bg-black/40 p-5 text-center shadow-[0_0_20px_rgba(66,99,235,0.6)]">
              <div className="text-6xl mb-2">{world4Result.emoji}</div>
              <div className="text-lg font-black text-blue-200">{world4Result.name}</div>
              <div className="text-xs text-indigo-300 mt-1">🌌 차원신 등급 · ⚔️ {world4Result.power.toLocaleString()}</div>
              <div className="text-xs text-blue-300/70 mt-1">&ldquo;{world4Result.desc}&rdquo;</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {WORLD4_HERO_IDS.map(id => {
              const h = HEROES.find(x => x.id === id)!;
              const owned = collection.has(id);
              return (
                <div key={id} className="rounded-xl border border-blue-400/40 bg-blue-950/40 p-2 text-center">
                  <div className="text-3xl">{h.emoji}</div>
                  <div className="text-[10px] text-blue-200 leading-tight">{h.name}</div>
                  {owned && <div className="text-[9px] text-green-400">✔ 보유</div>}
                </div>
              );
            })}
          </div>

          <button onClick={pullWorld4} disabled={coins < WORLD4_COST}
            className="w-full rounded-xl p-4 font-black bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-lg active:scale-95 transition-transform">
            🌌 4차원 소환! (💰{WORLD4_COST.toLocaleString()})
          </button>
          <p className="mt-2 text-center text-[11px] text-blue-300/60">시공간 지배자 · 무한의 관측자 · 4차원 생명체 (모두 차원신 등급! 전투력 50억~100억)</p>
          <button onClick={() => startW2Battle(DIM_BOSSES[4], "world4")}
            className="w-full mt-3 rounded-xl p-3 font-black bg-gradient-to-r from-red-800 to-black border border-red-500/50 hover:from-red-700">
            ⚔️ 4차원 보스 도전! ({DIM_BOSSES[4].emoji} {DIM_BOSSES[4].name} · {DIM_BOSSES[4].abilityName})
          </button>
        </div>
      </div>
    );
  }

  // 5~11차원 (generic)
  if (screen === "worldX") {
    const world = EXTRA_WORLDS.find(w => w.n === extraWorld);
    if (!world) return null;
    const heroes = world.heroIds.map(id => HEROES.find(h => h.id === id)!);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setScreen("main")} className="text-cyan-300 text-sm">← 뒤로</button>
            <h2 className="text-2xl font-black">{world.emoji} {world.n}차원</h2>
            <span className="text-yellow-400 text-sm">🪙 {coins.toLocaleString()}</span>
          </div>
          <p className="text-center text-xs text-cyan-300/80 mb-4">{world.n}차원의 포탈 너머 존재를 소환하세요</p>

          {worldXResult && (
            <div className="mb-4 rounded-2xl border-2 border-cyan-300/70 bg-black/40 p-5 text-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <div className="text-6xl mb-2">{worldXResult.emoji}</div>
              <div className="text-lg font-black text-cyan-200">{worldXResult.name}</div>
              <div className="text-xs text-indigo-300 mt-1">{world.n}차원신 등급 · ⚔️ {worldXResult.power.toLocaleString()}</div>
              <div className="text-xs text-cyan-300/70 mt-1">&ldquo;{worldXResult.desc}&rdquo;</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            {heroes.map(h => {
              const owned = collection.has(h.id);
              return (
                <div key={h.id} className="rounded-xl border border-cyan-400/40 bg-indigo-950/40 p-2 text-center">
                  <div className="text-3xl">{h.emoji}</div>
                  <div className="text-[10px] text-cyan-200 leading-tight">{h.name}</div>
                  {owned && <div className="text-[9px] text-green-400">✔ 보유</div>}
                </div>
              );
            })}
          </div>

          <button onClick={() => pullExtraWorld(world.n)} disabled={coins < world.cost}
            className="w-full rounded-xl p-4 font-black bg-gradient-to-r from-cyan-600 via-indigo-500 to-purple-600 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-lg active:scale-95 transition-transform">
            {world.emoji} {world.n}차원 소환! (💰{world.cost.toLocaleString()})
          </button>
          <p className="mt-2 text-center text-[11px] text-cyan-300/60">{heroes.map(h => h.name).join(" · ")} (모두 {world.n}차원신 등급!)</p>
          {DIM_BOSSES[world.n] && (
            <button onClick={() => startW2Battle(DIM_BOSSES[world.n], "worldX")}
              className="w-full mt-3 rounded-xl p-3 font-black bg-gradient-to-r from-red-800 to-black border border-red-500/50 hover:from-red-700">
              ⚔️ {world.n}차원 보스 도전! ({DIM_BOSSES[world.n].emoji} {DIM_BOSSES[world.n].name} · {DIM_BOSSES[world.n].abilityName})
            </button>
          )}
        </div>
      </div>
    );
  }

  // 뽑기 연출
  if (screen === "pull") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <canvas ref={canvasRef} width={400} height={400} className="max-w-full" />
      </div>
    );
  }

  // 결과 화면
  if (screen === "result") {
    // 초대량 뽑기 결과 (통계)
    if (bulkResult) {
      const summary = RARITIES.map((r, i) => ({ ...r, count: bulkResult.counts[i] || 0 })).filter(s => s.count > 0).reverse();
      return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-center mb-1">🌟 {bulkResult.total.toLocaleString()}연차 결과!</h2>
            <p className="text-center text-xs text-purple-300 mb-4">확률 통계로 계산된 초대량 뽑기</p>
            <div className="bg-black/30 rounded-xl p-3 mb-4 space-y-2">
              {summary.map(s => (
                <div key={s.name} className="flex items-center justify-between" style={{ color: s.color }}>
                  <span className="font-bold">{"⭐".repeat(Math.min(s.stars, 5))}{s.stars > 5 ? "💎" : ""} {s.name}</span>
                  <span className="font-black text-lg">{s.count.toLocaleString()}마리</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setBulkResult(null); setScreen("main"); }}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              확인 (자동 강화 완료! 도감 확인)
            </button>
          </div>
        </div>
      );
    }
    if (showMulti && multiResults.length > 0) {
      const is100 = multiResults.length >= 100; // 100·1000연차는 등급별 요약
      // 등급별 요약 (100연차용)
      const summary = RARITIES.map((r, i) => ({
        ...r,
        count: multiResults.filter(h => h.rarity === i).length,
      })).filter(s => s.count > 0).reverse();

      return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-center mb-4">
              {is100 ? `💎 ${multiResults.length}연차 결과!` : "🎰 10연차 결과!"}
            </h2>

            {is100 ? (
              <>
                {/* 100연차: 등급별 요약 */}
                <div className="bg-black/30 rounded-xl p-3 mb-4 space-y-2">
                  {summary.map(s => (
                    <div key={s.name} className="flex items-center justify-between" style={{ color: s.color }}>
                      <span className="font-bold">{"⭐".repeat(Math.min(s.stars, 5))}{s.stars > 5 ? "💎" : ""} {s.name}</span>
                      <span className="font-black text-lg">{s.count}마리</span>
                    </div>
                  ))}
                </div>

              </>
            ) : (
              /* 10연차: 기존 그리드 */
              <div className="grid grid-cols-5 gap-2 mb-6">
                {multiResults.map((hero, i) => {
                  const rarity = RARITIES[hero.rarity];
                  return (
                    <div key={i} className="text-center p-2 rounded-lg animate-bounce"
                      style={{
                        background: rarity.bg + "22",
                        border: `2px solid ${rarity.color}`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.5s",
                      }}>
                      <div className="text-2xl">{hero.emoji}</div>
                      <div className="text-[10px] mt-1" style={{ color: rarity.color }}>{rarity.name}</div>
                      <div className="text-[9px] truncate">{hero.name}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => { setShowMulti(false); setMultiResults([]); setScreen("main"); }}
              className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              확인
            </button>
          </div>
        </div>
      );
    }

    // 1회 결과
    if (!pullResult) return null;
    const rarity = RARITIES[pullResult.rarity];
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          {/* 등급 표시 */}
          <div className="mb-2" style={{ color: rarity.color }}>
            {"⭐".repeat(rarity.stars)}
          </div>
          <div className="text-sm font-bold mb-4 px-3 py-1 rounded-full inline-block"
            style={{ background: rarity.color + "33", color: rarity.color, border: `1px solid ${rarity.color}` }}>
            {rarity.name}
          </div>

          {/* 히어로 카드 */}
          <div className="mx-auto w-48 h-64 rounded-2xl p-4 mb-4 flex flex-col items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${rarity.color}22, ${rarity.glow}44)`,
              border: `3px solid ${rarity.color}`,
              boxShadow: `0 0 30px ${rarity.glow}66`,
            }}>
            <div className="text-7xl mb-3">{pullResult.emoji}</div>
            <div className="text-xl font-black">{pullResult.name}</div>
            <div className="text-sm opacity-70 mt-1">⚔️ {pullResult.power}</div>
            <div className="text-xs mt-2 px-2 py-1 bg-white/10 rounded-full">{pullResult.skill}</div>
          </div>

          {isNew && (
            <div className="text-yellow-400 font-bold mb-2 animate-pulse text-lg">✨ NEW! ✨</div>
          )}
          <p className="text-purple-300 text-sm mb-4">&ldquo;{pullResult.desc}&rdquo;</p>

          <button onClick={() => { setPullResult(null); setScreen("main"); }}
            className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
            확인
          </button>
        </div>
      </div>
    );
  }

  // 도감
  if (screen === "collection") {
    const sorted = [...collection.values()].sort((a, b) => b.hero.rarity - a.hero.rarity || b.level - a.level);
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">📖 히어로 도감 ({collection.size}/{HEROES.length})</h2>

          {sorted.length === 0 ? (
            <p className="text-center text-purple-400 mt-10">아직 히어로가 없어요! 뽑기를 해보세요!</p>
          ) : (
            <div className="space-y-2">
              {sorted.map(c => {
                const rarity = RARITIES[c.hero.rarity];
                const canLevel = c.count >= c.level + 1;
                const totalPower = Math.floor(c.hero.power * (1 + (c.level - 1) * 0.2));
                return (
                  <div key={c.hero.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: rarity.color + "15",
                      border: `1px solid ${rarity.color}44`,
                    }}>
                    <div className="text-3xl">{c.hero.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.hero.name}</span>
                        <span className="text-xs px-1 rounded" style={{ background: rarity.color + "33", color: rarity.color }}>
                          {rarity.name}
                        </span>
                      </div>
                      <div className="text-xs text-purple-300">
                        Lv.{c.level} | ⚔️ {totalPower} | 보유 {c.count}장
                      </div>
                      <div className="text-xs text-purple-400">{c.hero.skill}: {c.hero.desc}</div>
                    </div>
                    {canLevel && (
                      <button onClick={() => levelUp(c.hero.id)}
                        className="bg-green-600 hover:bg-green-500 text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap">
                        강화 ({c.level + 1}장)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 배틀
  if (screen === "battle") {
    const collArr = [...collection.values()].sort((a, b) => b.hero.rarity - a.hero.rarity);
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-red-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">⚔️ 배틀</h2>

          {battlePhase === "select" && (
            <>
              <p className="text-center text-sm text-red-300 mb-3">팀을 선택하세요 (최대 5명)</p>
              <div className="flex gap-2 justify-center mb-4 min-h-[50px]">
                {battleTeam.map(id => {
                  const c = collection.get(id);
                  if (!c) return null;
                  return (
                    <button key={id} onClick={() => setBattleTeam(t => t.filter(x => x !== id))}
                      className="text-2xl bg-red-900/50 rounded-lg p-2 w-12 h-12 flex items-center justify-center">
                      {c.hero.emoji}
                    </button>
                  );
                })}
                {battleTeam.length === 0 && <span className="text-red-400 text-sm self-center">히어로를 터치하세요</span>}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {collArr.map(c => {
                  const selected = battleTeam.includes(c.hero.id);
                  const rarity = RARITIES[c.hero.rarity];
                  return (
                    <button key={c.hero.id}
                      onClick={() => {
                        if (selected) setBattleTeam(t => t.filter(x => x !== c.hero.id));
                        else if (battleTeam.length < 5) setBattleTeam(t => [...t, c.hero.id]);
                      }}
                      className={`p-2 rounded-lg text-center ${selected ? "ring-2 ring-yellow-400" : ""}`}
                      style={{ background: rarity.color + "22", border: `1px solid ${rarity.color}44` }}>
                      <div className="text-xl">{c.hero.emoji}</div>
                      <div className="text-[10px] truncate">{c.hero.name}</div>
                      <div className="text-[9px] text-gray-400">Lv.{c.level}</div>
                    </button>
                  );
                })}
              </div>

              {collArr.length === 0 && (
                <p className="text-center text-red-400 text-sm">히어로가 없어요! 먼저 뽑기를 하세요!</p>
              )}

              <button onClick={() => setBattlePhase("enemy")} disabled={battleTeam.length === 0}
                className="w-full bg-red-600 disabled:bg-gray-700 hover:bg-red-500 rounded-xl p-3 font-bold">
                적 고르기 →
              </button>
            </>
          )}

          {battlePhase === "enemy" && (
            <>
              <p className="text-center text-sm text-red-300 mb-3">싸울 적을 골라라!</p>
              <div className="space-y-2 mb-4">
                {enemies.map((e, i) => (
                  <button key={i}
                    onClick={() => setSelectedEnemy(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedEnemy === i ? "ring-2 ring-yellow-400 bg-red-900/60" : "bg-black/30 hover:bg-red-900/30"}`}>
                    <div className="text-3xl w-12 text-center">{e.emoji}</div>
                    <div className="flex-1">
                      <div className="font-bold">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-red-300">⚔️ {e.power}</div>
                      <div className="text-xs text-yellow-400">🪙 +{e.reward}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setBattlePhase("select")}
                  className="bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
                  ← 팀 변경
                </button>
                <button onClick={startBattle}
                  className="bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">
                  전투 시작!
                </button>
              </div>
            </>
          )}

          {battlePhase === "fighting" && (
            <div className="text-center py-20">
              <div className="text-5xl animate-bounce">⚔️</div>
              <p className="mt-4 text-lg font-bold">전투 중...</p>
            </div>
          )}

          {battlePhase === "done" && battleResult && (
            <div className="space-y-2">
              <div className={`text-center text-3xl font-black mb-2 ${battleResult.won ? "text-yellow-400" : "text-red-400"}`}>
                {battleResult.won ? "🎉 승리!" : "💔 패배..."}
              </div>
              <div className="text-center text-sm mb-2">
                vs {battleResult.enemy} | +{battleResult.reward} 코인
              </div>
              <div className="bg-black/30 rounded-xl p-3 max-h-48 overflow-y-auto text-sm space-y-1">
                {battleLog.map((log, i) => (
                  <div key={i} className="text-gray-300">{log}</div>
                ))}
              </div>
              <button onClick={() => setScreen("main")}
                className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold mt-4">
                돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 오토 사냥
  if (screen === "auto") {
    const team = [...collection.values()].map(c => ({ c, tp: c.hero.power * (1 + (c.level - 1) * 0.2) })).sort((a, b) => b.tp - a.tp).slice(0, 5);
    const teamPower = team.reduce((s, t) => s + t.tp, 0);
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setScreen("main")} className="text-emerald-300 text-sm">← 뒤로</button>
            <h2 className="text-2xl font-black">🤖 오토 사냥</h2>
            <span className="text-yellow-400 text-sm">🪙 {coins.toLocaleString()}</span>
          </div>

          {/* 자동 팀 */}
          <div className="bg-black/30 rounded-xl p-3 mb-3">
            <div className="text-xs text-emerald-300 mb-1">자동 편성 팀 (전투력 {Math.floor(teamPower).toLocaleString()})</div>
            <div className="flex gap-2 justify-center min-h-[40px]">
              {team.length ? team.map(t => (
                <span key={t.c.hero.id} className="text-2xl" title={`${t.c.hero.name} Lv.${t.c.level}`}>{t.c.hero.emoji}</span>
              )) : <span className="text-emerald-400 text-sm self-center">히어로가 없어요! 먼저 뽑기를 하세요.</span>}
            </div>
          </div>

          {/* 시작/정지 */}
          <button
            onClick={() => setAutoHunting(h => !h)}
            className={`w-full rounded-xl p-4 font-bold text-lg mb-3 transition-all ${autoHunting ? "bg-red-600 hover:bg-red-500" : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500"}`}
          >
            {autoHunting ? "⏹️ 사냥 멈추기" : "▶️ 오토 사냥 시작!"}
          </button>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">처치 수</div>
              <div className="text-xl font-black text-red-300">☠️ {autoKills.toLocaleString()}</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">획득 코인</div>
              <div className="text-xl font-black text-yellow-300">🪙 {autoEarned.toLocaleString()}</div>
            </div>
          </div>

          {/* 로그 */}
          <div className="bg-black/40 rounded-xl p-3 h-64 overflow-y-auto text-sm space-y-1">
            {autoLog.length === 0 ? (
              <p className="text-gray-500 text-center mt-8">시작하면 자동으로 사냥을 시작해요!</p>
            ) : autoLog.map((l, i) => (
              <div key={i} className={i === 0 ? "text-white" : "text-gray-400"}>{l}</div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-emerald-400/70">💡 오토 사냥은 다른 화면으로 나가도 계속 돌아가요!</p>
        </div>
      </div>
    );
  }

  return null;
}
