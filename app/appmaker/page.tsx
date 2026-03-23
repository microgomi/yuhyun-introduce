"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 앱 카테고리 ───── */
interface AppCategory {
  id: string;
  name: string;
  emoji: string;
  baseDownloads: number;
  baseRevenue: number;
  unlockLevel: number;
}
const APP_CATEGORIES: AppCategory[] = [
  { id: "calculator", name: "계산기", emoji: "🧮", baseDownloads: 50, baseRevenue: 1, unlockLevel: 1 },
  { id: "memo", name: "메모장", emoji: "📝", baseDownloads: 80, baseRevenue: 2, unlockLevel: 1 },
  { id: "weather", name: "날씨", emoji: "🌤️", baseDownloads: 120, baseRevenue: 3, unlockLevel: 2 },
  { id: "camera", name: "카메라", emoji: "📷", baseDownloads: 200, baseRevenue: 5, unlockLevel: 3 },
  { id: "game", name: "게임", emoji: "🎮", baseDownloads: 500, baseRevenue: 10, unlockLevel: 4 },
  { id: "sns", name: "SNS", emoji: "💬", baseDownloads: 800, baseRevenue: 15, unlockLevel: 5 },
  { id: "music", name: "음악 플레이어", emoji: "🎵", baseDownloads: 600, baseRevenue: 12, unlockLevel: 6 },
  { id: "shopping", name: "쇼핑", emoji: "🛒", baseDownloads: 1000, baseRevenue: 20, unlockLevel: 7 },
  { id: "video", name: "동영상", emoji: "📹", baseDownloads: 1500, baseRevenue: 30, unlockLevel: 8 },
  { id: "ai", name: "AI 앱", emoji: "🤖", baseDownloads: 3000, baseRevenue: 50, unlockLevel: 10 },
  { id: "metaverse", name: "메타버스", emoji: "🌐", baseDownloads: 5000, baseRevenue: 80, unlockLevel: 12 },
  { id: "superapp", name: "슈퍼앱", emoji: "👑", baseDownloads: 10000, baseRevenue: 150, unlockLevel: 15 },
];

/* ───── 기능 목록 ───── */
interface Feature {
  id: string;
  name: string;
  emoji: string;
  codingTime: number; // 필요한 코딩 클릭 수
  qualityBonus: number;
  category: string; // "all" 또는 특정 카테고리
}
const FEATURES: Feature[] = [
  { id: "ui", name: "예쁜 디자인", emoji: "🎨", codingTime: 5, qualityBonus: 10, category: "all" },
  { id: "dark", name: "다크모드", emoji: "🌙", codingTime: 3, qualityBonus: 5, category: "all" },
  { id: "push", name: "알림 기능", emoji: "🔔", codingTime: 4, qualityBonus: 8, category: "all" },
  { id: "login", name: "로그인", emoji: "🔑", codingTime: 6, qualityBonus: 12, category: "all" },
  { id: "share", name: "공유하기", emoji: "📤", codingTime: 4, qualityBonus: 7, category: "all" },
  { id: "offline", name: "오프라인 모드", emoji: "📴", codingTime: 8, qualityBonus: 15, category: "all" },
  { id: "anim", name: "애니메이션", emoji: "✨", codingTime: 7, qualityBonus: 13, category: "all" },
  { id: "filter", name: "필터 효과", emoji: "🖼️", codingTime: 6, qualityBonus: 10, category: "camera" },
  { id: "chat", name: "실시간 채팅", emoji: "💭", codingTime: 10, qualityBonus: 20, category: "sns" },
  { id: "playlist", name: "플레이리스트", emoji: "🎶", codingTime: 5, qualityBonus: 10, category: "music" },
  { id: "cart", name: "장바구니", emoji: "🛍️", codingTime: 6, qualityBonus: 12, category: "shopping" },
  { id: "stream", name: "스트리밍", emoji: "📺", codingTime: 12, qualityBonus: 25, category: "video" },
  { id: "ml", name: "머신러닝", emoji: "🧠", codingTime: 15, qualityBonus: 30, category: "ai" },
  { id: "3d", name: "3D 렌더링", emoji: "🎲", codingTime: 14, qualityBonus: 28, category: "metaverse" },
  { id: "payment", name: "결제 시스템", emoji: "💳", codingTime: 10, qualityBonus: 20, category: "shopping" },
  { id: "leaderboard", name: "랭킹 시스템", emoji: "🏆", codingTime: 8, qualityBonus: 15, category: "game" },
  { id: "multiplayer", name: "멀티플레이", emoji: "👥", codingTime: 12, qualityBonus: 22, category: "game" },
  { id: "cloud", name: "클라우드 저장", emoji: "☁️", codingTime: 9, qualityBonus: 18, category: "all" },
];

/* ───── 버그 종류 ───── */
interface Bug {
  id: string;
  name: string;
  emoji: string;
  severity: number; // 품질 감소량
  hint: string;
}
const BUGS: Bug[] = [
  { id: "crash", name: "앱이 꺼져요!", emoji: "💥", severity: 20, hint: "null 체크를 추가하세요" },
  { id: "slow", name: "너무 느려요", emoji: "🐌", severity: 10, hint: "불필요한 루프를 제거하세요" },
  { id: "typo", name: "오타 발견!", emoji: "📝", severity: 5, hint: "텍스트를 다시 확인하세요" },
  { id: "design", name: "디자인 깨짐", emoji: "🖼️", severity: 8, hint: "CSS를 수정하세요" },
  { id: "memory", name: "메모리 누수", emoji: "💾", severity: 15, hint: "useEffect cleanup을 추가하세요" },
  { id: "security", name: "보안 취약점", emoji: "🔓", severity: 25, hint: "입력값 검증을 추가하세요" },
  { id: "battery", name: "배터리 소모", emoji: "🔋", severity: 12, hint: "백그라운드 작업을 최적화하세요" },
  { id: "network", name: "네트워크 에러", emoji: "📡", severity: 10, hint: "에러 핸들링을 추가하세요" },
];

/* ───── 스킬 업그레이드 ───── */
interface Skill {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  effect: string;
}
const SKILLS: Skill[] = [
  { id: "coding", name: "코딩 속도", emoji: "⌨️", desc: "클릭당 코딩량 증가", maxLevel: 10, baseCost: 50, effect: "+1 코딩력" },
  { id: "debug", name: "디버깅", emoji: "🔍", desc: "버그 발견 확률 증가", maxLevel: 10, baseCost: 40, effect: "버그 발견율 +10%" },
  { id: "design", name: "디자인 감각", emoji: "🎨", desc: "기본 품질 증가", maxLevel: 10, baseCost: 60, effect: "+5 기본 품질" },
  { id: "marketing", name: "마케팅", emoji: "📢", desc: "다운로드 배수 증가", maxLevel: 10, baseCost: 80, effect: "x1.2 다운로드" },
  { id: "teamwork", name: "팀워크", emoji: "👥", desc: "자동 코딩 속도", maxLevel: 5, baseCost: 200, effect: "초당 자동 코딩 +1" },
];

/* ───── 릴리즈된 앱 ───── */
interface ReleasedApp {
  name: string;
  category: AppCategory;
  quality: number;
  features: string[];
  downloads: number;
  revenue: number;
  rating: number;
  icon: string;
}

/* ───── 앱 이름 생성 ───── */
const APP_PREFIXES = ["슈퍼", "메가", "울트라", "스마트", "퀵", "이지", "프로", "마이", "더", "빅"];
const APP_SUFFIXES: Record<string, string[]> = {
  calculator: ["계산기", "매쓰", "넘버즈"],
  memo: ["메모", "노트", "다이어리"],
  weather: ["날씨", "웨더", "하늘"],
  camera: ["캠", "포토", "셀카"],
  game: ["게임즈", "플레이", "아케이드"],
  sns: ["톡", "챗", "피드"],
  music: ["뮤직", "비트", "멜로디"],
  shopping: ["마켓", "쇼핑", "딜"],
  video: ["튜브", "플릭스", "비디오"],
  ai: ["AI", "브레인", "지니"],
  metaverse: ["월드", "버스", "스페이스"],
  superapp: ["올인원", "에브리", "유니버스"],
};

function generateAppName(categoryId: string): string {
  const prefix = APP_PREFIXES[Math.floor(Math.random() * APP_PREFIXES.length)];
  const suffixes = APP_SUFFIXES[categoryId] || ["앱"];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

/* ───── 앱 아이콘 생성 ───── */
const ICON_COLORS = [
  "from-red-400 to-pink-500", "from-blue-400 to-indigo-500", "from-green-400 to-emerald-500",
  "from-yellow-400 to-orange-500", "from-purple-400 to-violet-500", "from-cyan-400 to-teal-500",
  "from-rose-400 to-red-500", "from-amber-400 to-yellow-500",
];

type Screen = "main" | "select" | "develop" | "test" | "release" | "result" | "myapps" | "skills";

export default function AppMakerPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [money, setMoney] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(100);
  const [releasedApps, setReleasedApps] = useState<ReleasedApp[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({
    coding: 0, debug: 0, design: 0, marketing: 0, teamwork: 0,
  });

  // 개발 중 상태
  const [currentCategory, setCurrentCategory] = useState<AppCategory | null>(null);
  const [appName, setAppName] = useState("");
  const [appIcon, setAppIcon] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [codingProgress, setCodingProgress] = useState(0);
  const [codingTotal, setCodingTotal] = useState(0);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [foundBugs, setFoundBugs] = useState<string[]>([]);
  const [fixedBugs, setFixedBugs] = useState<string[]>([]);
  const [quality, setQuality] = useState(0);
  const [devPhase, setDevPhase] = useState<"coding" | "testing" | "done">("coding");

  // 자동 코딩 타이머
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  // 코딩 파티클
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const particleId = useRef(0);

  // 수입 타이머 (릴리즈된 앱에서 수입)
  useEffect(() => {
    const timer = setInterval(() => {
      if (releasedApps.length > 0) {
        const income = releasedApps.reduce((sum, app) => sum + Math.floor(app.revenue / 60), 0);
        if (income > 0) setMoney(m => m + income);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [releasedApps]);

  // 자동 코딩 (팀워크 스킬)
  useEffect(() => {
    if (devPhase === "coding" && skillLevels.teamwork > 0 && codingProgress < codingTotal) {
      autoRef.current = setInterval(() => {
        setCodingProgress(p => {
          const next = Math.min(p + skillLevels.teamwork, codingTotal);
          return next;
        });
      }, 1000);
      return () => { if (autoRef.current) clearInterval(autoRef.current); };
    }
  }, [devPhase, skillLevels.teamwork, codingTotal, codingProgress]);

  // 코딩 완료 체크
  useEffect(() => {
    if (devPhase === "coding" && codingTotal > 0 && codingProgress >= codingTotal) {
      setDevPhase("testing");
      // 버그 생성
      const numBugs = Math.max(1, Math.floor(Math.random() * 4) + 1 - Math.floor(skillLevels.debug / 3));
      const shuffled = [...BUGS].sort(() => Math.random() - 0.5);
      setBugs(shuffled.slice(0, numBugs));
    }
  }, [codingProgress, codingTotal, devPhase, skillLevels.debug]);

  // 레벨업 체크
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.5));
    }
  }, [xp, xpNeeded]);

  const codingPower = 1 + skillLevels.coding;
  const baseQuality = skillLevels.design * 5;
  const downloadMultiplier = 1 + skillLevels.marketing * 0.2;
  const debugChance = 0.3 + skillLevels.debug * 0.07;

  /* ───── 앱 카테고리 선택 ───── */
  const selectCategory = useCallback((cat: AppCategory) => {
    setCurrentCategory(cat);
    setAppName(generateAppName(cat.id));
    setAppIcon(ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)]);
    setSelectedFeatures([]);
    setCodingProgress(0);
    setCodingTotal(0);
    setBugs([]);
    setFoundBugs([]);
    setFixedBugs([]);
    setQuality(baseQuality);
    setDevPhase("coding");
    setScreen("develop");
  }, [baseQuality]);

  /* ───── 기능 토글 ───── */
  const toggleFeature = useCallback((featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId) ? prev.filter(f => f !== featureId) : [...prev, featureId]
    );
  }, []);

  /* ───── 코딩 시작 ───── */
  const startCoding = useCallback(() => {
    const total = selectedFeatures.reduce((sum, fId) => {
      const f = FEATURES.find(ff => ff.id === fId);
      return sum + (f ? f.codingTime : 0);
    }, 0);
    const qualityBonus = selectedFeatures.reduce((sum, fId) => {
      const f = FEATURES.find(ff => ff.id === fId);
      return sum + (f ? f.qualityBonus : 0);
    }, 0);
    setCodingTotal(Math.max(total, 3));
    setCodingProgress(0);
    setQuality(baseQuality + qualityBonus);
    setDevPhase("coding");
  }, [selectedFeatures, baseQuality]);

  /* ───── 코딩 클릭 ───── */
  const doCode = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (devPhase !== "coding" || codingProgress >= codingTotal) return;
    setCodingProgress(p => Math.min(p + codingPower, codingTotal));

    // 파티클
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const codeTexts = ["{ }", "< />", "=>", "if()", "for()", "const", "return", "async", "npm i", "git push", "console.log", "useState", "onClick", "export"];
    const text = codeTexts[Math.floor(Math.random() * codeTexts.length)];
    const id = particleId.current++;
    setParticles(prev => [...prev, { id, x, y, text }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 800);
  }, [devPhase, codingProgress, codingTotal, codingPower]);

  /* ───── 버그 찾기 ───── */
  const searchBug = useCallback((bugId: string) => {
    if (foundBugs.includes(bugId)) return;
    if (Math.random() < debugChance) {
      setFoundBugs(prev => [...prev, bugId]);
    }
  }, [foundBugs, debugChance]);

  /* ───── 버그 수정 ───── */
  const fixBug = useCallback((bugId: string) => {
    setFixedBugs(prev => [...prev, bugId]);
    const bug = BUGS.find(b => b.id === bugId);
    if (bug) {
      setQuality(q => q + Math.floor(bug.severity / 2));
    }
  }, []);

  /* ───── 앱 출시 ───── */
  const releaseApp = useCallback(() => {
    if (!currentCategory) return;

    // 미수정 버그 페널티
    const unfixedPenalty = bugs
      .filter(b => !fixedBugs.includes(b.id))
      .reduce((sum, b) => sum + b.severity, 0);

    const finalQuality = Math.max(0, quality - unfixedPenalty);
    const qualityMultiplier = 0.5 + (finalQuality / 100) * 1.5;

    const downloads = Math.floor(currentCategory.baseDownloads * qualityMultiplier * downloadMultiplier);
    const revenue = Math.floor(currentCategory.baseRevenue * qualityMultiplier * downloadMultiplier * 10);
    const rating = Math.min(5, Math.max(1, Math.round((finalQuality / 20) * 10) / 10));

    const app: ReleasedApp = {
      name: appName,
      category: currentCategory,
      quality: finalQuality,
      features: selectedFeatures,
      downloads,
      revenue,
      rating,
      icon: appIcon,
    };

    setReleasedApps(prev => [...prev, app]);
    setMoney(m => m + revenue);
    setXp(x => x + Math.floor(downloads / 10) + finalQuality);
    setScreen("result");
  }, [currentCategory, quality, bugs, fixedBugs, downloadMultiplier, appName, selectedFeatures, appIcon]);

  /* ───── 스킬 업그레이드 ───── */
  const upgradeSkill = useCallback((skillId: string) => {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return;
    const currentLv = skillLevels[skillId] || 0;
    if (currentLv >= skill.maxLevel) return;
    const cost = skill.baseCost * (currentLv + 1);
    if (money < cost) return;
    setMoney(m => m - cost);
    setSkillLevels(prev => ({ ...prev, [skillId]: currentLv + 1 }));
  }, [money, skillLevels]);

  const totalIncome = releasedApps.reduce((sum, app) => sum + Math.floor(app.revenue / 60), 0);

  /* ───── 메인 화면 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-indigo-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">📱</div>
            <h1 className="text-3xl font-black mb-1">앱 만들기</h1>
            <p className="text-indigo-300 text-sm">나만의 앱을 만들어 출시하자!</p>
          </div>

          {/* 상태 바 */}
          <div className="bg-indigo-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">💰 {money.toLocaleString()}원</span>
              <span className="text-indigo-300 text-sm">📱 출시: {releasedApps.length}개</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Lv.{level} 개발자</span>
              <span className="text-xs text-indigo-400">{totalIncome > 0 ? `+${totalIncome}원/초` : ""}</span>
            </div>
            <div className="bg-indigo-900 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-400 h-2 rounded-full transition-all" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-indigo-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
          </div>

          {/* 메뉴 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setScreen("select")}
              className="bg-green-900/60 hover:bg-green-800/60 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">🛠️</div>
              <div className="font-bold">새 앱 만들기</div>
              <div className="text-xs text-green-300">앱을 개발하고 출시!</div>
            </button>
            <button onClick={() => setScreen("myapps")}
              className="bg-blue-900/60 hover:bg-blue-800/60 rounded-xl p-4 text-center">
              <div className="text-3xl mb-1">📱</div>
              <div className="font-bold">내 앱 목록</div>
              <div className="text-xs text-blue-300">{releasedApps.length}개 출시됨</div>
            </button>
            <button onClick={() => setScreen("skills")}
              className="bg-purple-900/60 hover:bg-purple-800/60 rounded-xl p-4 text-center col-span-2">
              <div className="text-3xl mb-1">⬆️</div>
              <div className="font-bold">스킬 업그레이드</div>
              <div className="text-xs text-purple-300">개발 능력을 강화하세요!</div>
            </button>
          </div>

          {/* 최근 출시 앱 */}
          {releasedApps.length > 0 && (
            <div className="bg-black/30 rounded-xl p-3">
              <h3 className="text-sm font-bold mb-2 text-center">🏆 최근 출시</h3>
              {releasedApps.slice(-3).reverse().map((app, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 mb-1">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.icon} flex items-center justify-center text-lg`}>
                    {app.category.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{app.name}</div>
                    <div className="text-xs text-gray-400">⬇️ {app.downloads.toLocaleString()} · ⭐ {app.rating}</div>
                  </div>
                  <div className="text-xs text-yellow-400">+{Math.floor(app.revenue / 60)}/초</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 앱 선택 ───── */
  if (screen === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-green-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-green-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📱 어떤 앱을 만들까?</h2>
          <p className="text-center text-sm text-green-300 mb-4">Lv.{level} | 💰 {money.toLocaleString()}원</p>

          <div className="grid grid-cols-2 gap-2">
            {APP_CATEGORIES.map(cat => {
              const locked = level < cat.unlockLevel;
              return (
                <button key={cat.id}
                  onClick={() => !locked && selectCategory(cat)}
                  disabled={locked}
                  className={`p-3 rounded-xl text-center transition-all ${
                    locked ? "bg-gray-800/50 opacity-50" : "bg-black/30 hover:bg-black/50 hover:scale-105"
                  }`}>
                  <div className="text-3xl mb-1">{locked ? "🔒" : cat.emoji}</div>
                  <div className="font-bold text-sm">{cat.name}</div>
                  {locked ? (
                    <div className="text-[10px] text-gray-500">Lv.{cat.unlockLevel} 필요</div>
                  ) : (
                    <div className="text-[10px] text-green-400">
                      ⬇️ ~{Math.floor(cat.baseDownloads * downloadMultiplier)} | 💰 ~{Math.floor(cat.baseRevenue * downloadMultiplier * 10)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 개발 화면 ───── */
  if (screen === "develop" && currentCategory) {
    const availableFeatures = FEATURES.filter(f =>
      f.category === "all" || f.category === currentCategory.id
    );

    if (devPhase === "coding" && codingTotal === 0) {
      // 기능 선택 단계
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white p-4">
          <div className="max-w-md mx-auto">
            <button onClick={() => setScreen("select")} className="text-blue-300 text-sm mb-4">← 뒤로</button>

            {/* 앱 프리뷰 */}
            <div className="text-center mb-4">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${appIcon} flex items-center justify-center text-4xl mx-auto mb-2 shadow-lg`}>
                {currentCategory.emoji}
              </div>
              <h2 className="text-xl font-black">{appName}</h2>
              <p className="text-sm text-blue-300">{currentCategory.name} 앱</p>
            </div>

            {/* 기능 선택 */}
            <h3 className="text-sm font-bold mb-2">🔧 기능을 선택하세요</h3>
            <div className="space-y-1 mb-4">
              {availableFeatures.map(f => {
                const selected = selectedFeatures.includes(f.id);
                return (
                  <button key={f.id}
                    onClick={() => toggleFeature(f.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${
                      selected ? "bg-blue-600/40 border border-blue-500" : "bg-black/20 hover:bg-black/40"
                    }`}>
                    <span className="text-xl">{f.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold">{f.name}</div>
                      <div className="text-[10px] text-gray-400">코딩: {f.codingTime} | 품질: +{f.qualityBonus}</div>
                    </div>
                    <span className="text-lg">{selected ? "✅" : "⬜"}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-black/30 rounded-xl p-3 mb-3 text-center text-sm">
              선택한 기능: {selectedFeatures.length}개 |
              예상 코딩량: {selectedFeatures.reduce((s, fId) => {
                const f = FEATURES.find(ff => ff.id === fId);
                return s + (f ? f.codingTime : 0);
              }, 0)} |
              예상 품질: +{selectedFeatures.reduce((s, fId) => {
                const f = FEATURES.find(ff => ff.id === fId);
                return s + (f ? f.qualityBonus : 0);
              }, 0)}
            </div>

            <button onClick={startCoding}
              className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-3 font-bold text-lg">
              🚀 코딩 시작!
            </button>
          </div>
        </div>
      );
    }

    if (devPhase === "coding") {
      // 코딩 중
      const progress = codingTotal > 0 ? (codingProgress / codingTotal) * 100 : 0;
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${appIcon} flex items-center justify-center text-3xl mx-auto mb-2`}>
                {currentCategory.emoji}
              </div>
              <h2 className="text-xl font-black">{appName}</h2>
              <p className="text-sm text-green-300">코딩 중...</p>
            </div>

            {/* 프로그레스 바 */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>진행률</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="bg-gray-800 rounded-full h-4 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-4 rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-0.5 text-center">{codingProgress}/{codingTotal}</div>
            </div>

            {/* 코딩 버튼 */}
            <div className="relative mb-4">
              <button
                onClick={doCode}
                onTouchStart={doCode}
                className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-2xl p-8 text-center relative overflow-hidden select-none"
                style={{ touchAction: "manipulation" }}>
                <div className="text-5xl mb-2">⌨️</div>
                <div className="text-lg font-bold">탭해서 코딩!</div>
                <div className="text-xs text-gray-400">클릭당 +{codingPower}</div>
                {skillLevels.teamwork > 0 && (
                  <div className="text-xs text-blue-400 mt-1">👥 자동 코딩: +{skillLevels.teamwork}/초</div>
                )}

                {/* 코딩 파티클 */}
                {particles.map(p => (
                  <span key={p.id}
                    className="absolute text-green-400 font-mono text-xs font-bold pointer-events-none animate-bounce"
                    style={{
                      left: p.x,
                      top: p.y,
                      animation: "floatUp 0.8s ease-out forwards",
                    }}>
                    {p.text}
                  </span>
                ))}
              </button>
            </div>

            {/* 코드 미리보기 */}
            <div className="bg-black rounded-xl p-3 font-mono text-xs text-green-400 overflow-hidden h-32">
              {progress > 0 && <div>import React from &apos;react&apos;;</div>}
              {progress > 10 && <div>import {"{ useState }"} from &apos;react&apos;;</div>}
              {progress > 20 && <div className="text-gray-600">// {appName} 앱 개발 중...</div>}
              {progress > 30 && <div>const App = () =&gt; {"{"}</div>}
              {progress > 40 && <div>&nbsp;&nbsp;const [data, setData] = useState(null);</div>}
              {progress > 50 && <div>&nbsp;&nbsp;useEffect(() =&gt; {"{ fetch('/api'); }"}, []);</div>}
              {progress > 60 && <div>&nbsp;&nbsp;return (</div>}
              {progress > 70 && <div>&nbsp;&nbsp;&nbsp;&nbsp;&lt;div className=&quot;app&quot;&gt;</div>}
              {progress > 80 && <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;h1&gt;{appName}&lt;/h1&gt;</div>}
              {progress > 90 && <div>&nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;</div>}
              {progress >= 100 && <div className="text-yellow-400">✅ 코딩 완료!</div>}
            </div>
          </div>

          <style jsx>{`
            @keyframes floatUp {
              0% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-60px); }
            }
          `}</style>
        </div>
      );
    }

    if (devPhase === "testing") {
      // 테스트 & 디버깅
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-red-950 to-slate-950 text-white p-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${appIcon} flex items-center justify-center text-3xl mx-auto mb-2`}>
                {currentCategory.emoji}
              </div>
              <h2 className="text-xl font-black">{appName}</h2>
              <p className="text-sm text-red-300">🔍 테스트 & 디버깅</p>
            </div>

            {/* 품질 미터 */}
            <div className="bg-black/30 rounded-xl p-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>앱 품질</span>
                <span style={{ color: quality >= 80 ? "#22c55e" : quality >= 50 ? "#eab308" : "#ef4444" }}>
                  {quality}점
                </span>
              </div>
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <div className="h-3 rounded-full transition-all" style={{
                  width: `${Math.min(quality, 100)}%`,
                  background: quality >= 80 ? "#22c55e" : quality >= 50 ? "#eab308" : "#ef4444",
                }} />
              </div>
            </div>

            {/* 버그 목록 */}
            <h3 className="text-sm font-bold mb-2">🐛 발견된 버그 ({foundBugs.length}/{bugs.length})</h3>
            <div className="space-y-2 mb-4">
              {bugs.map(bug => {
                const found = foundBugs.includes(bug.id);
                const fixed = fixedBugs.includes(bug.id);
                return (
                  <div key={bug.id} className={`p-3 rounded-xl ${
                    fixed ? "bg-green-900/30 border border-green-800" :
                    found ? "bg-red-900/30 border border-red-800" :
                    "bg-gray-800/50 border border-gray-700"
                  }`}>
                    {!found ? (
                      <button onClick={() => searchBug(bug.id)} className="w-full text-center">
                        <div className="text-2xl">❓</div>
                        <div className="text-xs text-gray-400">탭해서 버그 찾기 ({Math.floor(debugChance * 100)}% 확률)</div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{bug.emoji}</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{bug.name}</div>
                          <div className="text-[10px] text-gray-400">심각도: -{bug.severity} | 💡 {bug.hint}</div>
                        </div>
                        {!fixed ? (
                          <button onClick={() => fixBug(bug.id)}
                            className="bg-red-600 hover:bg-red-500 text-xs px-3 py-1.5 rounded-lg font-bold">
                            🔧 수정
                          </button>
                        ) : (
                          <span className="text-green-400 text-sm">✅ 수정됨</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-gray-500 text-center mb-3">
              미수정 버그가 있으면 품질이 떨어져요!
            </div>

            <button onClick={releaseApp}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl p-3 font-bold text-lg">
              🚀 앱 출시하기!
            </button>
          </div>
        </div>
      );
    }
  }

  /* ───── 출시 결과 ───── */
  if (screen === "result" && releasedApps.length > 0) {
    const app = releasedApps[releasedApps.length - 1];
    const stars = "⭐".repeat(Math.floor(app.rating));

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-black mb-4">🎉 앱 출시 성공!</h2>

          {/* 앱 카드 */}
          <div className="bg-black/40 rounded-2xl p-6 mb-4 inline-block">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${app.icon} flex items-center justify-center text-5xl mx-auto mb-3 shadow-xl`}>
              {app.category.emoji}
            </div>
            <h3 className="text-2xl font-black mb-1">{app.name}</h3>
            <p className="text-indigo-300 text-sm mb-3">{app.category.name}</p>

            <div className="text-2xl mb-2">{stars}</div>
            <div className="text-yellow-400 text-sm mb-1">평점: {app.rating} / 5.0</div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-black/30 rounded-xl p-2">
                <div className="text-2xl">⬇️</div>
                <div className="text-lg font-bold">{app.downloads.toLocaleString()}</div>
                <div className="text-[10px] text-gray-400">다운로드</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2">
                <div className="text-2xl">💰</div>
                <div className="text-lg font-bold">{app.revenue.toLocaleString()}원</div>
                <div className="text-[10px] text-gray-400">수익</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2">
                <div className="text-2xl">📊</div>
                <div className="text-lg font-bold">{app.quality}점</div>
                <div className="text-[10px] text-gray-400">품질</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2">
                <div className="text-2xl">🔧</div>
                <div className="text-lg font-bold">{app.features.length}개</div>
                <div className="text-[10px] text-gray-400">기능</div>
              </div>
            </div>

            {/* 수동 수입 표시 */}
            <div className="mt-3 text-sm text-green-400">
              📈 초당 +{Math.floor(app.revenue / 60)}원 수입 발생!
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl p-3 font-bold">
              🏠 메인으로
            </button>
            <button onClick={() => setScreen("select")}
              className="flex-1 bg-green-600 hover:bg-green-500 rounded-xl p-3 font-bold">
              🛠️ 새 앱 만들기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 내 앱 목록 ───── */
  if (screen === "myapps") {
    const totalDownloads = releasedApps.reduce((s, a) => s + a.downloads, 0);
    const totalRevenue = releasedApps.reduce((s, a) => s + a.revenue, 0);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📱 내 앱 목록</h2>

          <div className="bg-black/30 rounded-xl p-3 mb-4 flex justify-around text-center">
            <div>
              <div className="text-lg font-bold text-yellow-400">{releasedApps.length}</div>
              <div className="text-[10px] text-gray-400">출시한 앱</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{totalDownloads.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">총 다운로드</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{totalRevenue.toLocaleString()}원</div>
              <div className="text-[10px] text-gray-400">총 수익</div>
            </div>
          </div>

          {releasedApps.length === 0 ? (
            <p className="text-center text-gray-500 py-8">아직 출시한 앱이 없어요!</p>
          ) : (
            <div className="space-y-2">
              {[...releasedApps].reverse().map((app, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/20">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.icon} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {app.category.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{app.name}</div>
                    <div className="text-xs text-gray-400">{app.category.name} · 품질 {app.quality}</div>
                    <div className="text-xs">
                      <span className="text-green-400">⬇️ {app.downloads.toLocaleString()}</span>
                      <span className="text-yellow-400 ml-2">💰 {app.revenue.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm">⭐ {app.rating}</div>
                    <div className="text-[10px] text-green-400">+{Math.floor(app.revenue / 60)}/초</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 스킬 업그레이드 ───── */
  if (screen === "skills") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">⬆️ 스킬 업그레이드</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">💰 {money.toLocaleString()}원</div>

          <div className="space-y-3">
            {SKILLS.map(skill => {
              const lv = skillLevels[skill.id] || 0;
              const maxed = lv >= skill.maxLevel;
              const cost = skill.baseCost * (lv + 1);
              const affordable = money >= cost;

              return (
                <div key={skill.id} className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{skill.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold">{skill.name} <span className="text-yellow-400">Lv.{lv}</span></div>
                      <div className="text-xs text-gray-400">{skill.desc}</div>
                      <div className="text-xs text-blue-300">효과: {skill.effect}</div>
                    </div>
                  </div>

                  {/* 레벨 바 */}
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: skill.maxLevel }, (_, i) => (
                      <div key={i} className={`flex-1 h-2 rounded-full ${i < lv ? "bg-purple-500" : "bg-gray-700"}`} />
                    ))}
                  </div>

                  {!maxed ? (
                    <button onClick={() => upgradeSkill(skill.id)}
                      disabled={!affordable}
                      className={`w-full py-2 rounded-lg text-sm font-bold ${
                        affordable
                          ? "bg-purple-600 hover:bg-purple-500"
                          : "bg-gray-700 text-gray-500"
                      }`}>
                      💰 {cost.toLocaleString()}원으로 업그레이드
                    </button>
                  ) : (
                    <div className="text-center text-yellow-400 text-sm font-bold py-2">✨ MAX LEVEL! ✨</div>
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
