"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

/* ─────────────────── 데이터 ─────────────────── */

const quizQuestions = [
  { q: "진유현의 나이는?", options: ["7살", "8살", "9살", "10살"], answer: 2 },
  { q: "진유현이 다니는 학교는?", options: ["청덕초", "서울초", "한빛초", "별빛초"], answer: 0 },
  { q: "진유현의 학년/반은?", options: ["1학년 2반", "2학년 1반", "3학년 1반", "2학년 2반"], answer: 1 },
  { q: "진유현이 제일 좋아하는 것은?", options: ["축구", "로블록스", "수영", "피아노"], answer: 1 },
  { q: "진유현이 만든 게임 수는?", options: ["약 30개", "약 50개", "약 70개", "약 100개"], answer: 2 },
  { q: "진유현이 만든 가족 게임이 아닌 것은?", options: ["엄마 청소 못하게", "부부싸움 막기", "아빠 입막기", "할머니 도망가기"], answer: 3 },
  { q: "진유현의 사이트에 있는 모험 게임은?", options: ["어몽어스", "테트리스", "팩맨", "마리오"], answer: 0 },
  { q: "진유현이 만든 만들기 게임이 아닌 것은?", options: ["검 만들기", "자동차 만들기", "USB 만들기", "비행기 만들기"], answer: 3 },
  { q: "진유현은 어디서 로블록스를 즐길까?", options: ["학교에서", "컴퓨터로", "운동장에서", "도서관에서"], answer: 1 },
  { q: "진유현의 성은?", options: ["김", "이", "진", "박"], answer: 2 },
];

const gameCategories = [
  {
    name: "액션 게임들",
    emoji: "⚔️",
    color: "from-red-400 to-orange-400",
    games: ["검투사", "태권도", "탕탕특공대", "피구왕", "팔씨름", "칼 피하기", "뱀 게임"],
  },
  {
    name: "시뮬레이션",
    emoji: "🎮",
    color: "from-blue-400 to-cyan-400",
    games: ["요리왕", "아이스크림 가게", "프로게이머", "치과", "학교", "마사지", "빵 만들기"],
  },
  {
    name: "만들기",
    emoji: "🔧",
    color: "from-green-400 to-emerald-400",
    games: ["검 만들기", "자동차 만들기", "USB 만들기", "AI 만들기", "레고", "가구 만들기", "히어로 만들기", "앱 만들기", "세계 만들기"],
  },
  {
    name: "가족 게임",
    emoji: "👨‍👩‍👧‍👦",
    color: "from-pink-400 to-rose-400",
    games: ["엄마 청소 못하게", "부부싸움 막기", "아빠 입막기", "동생 괴롭히기", "아빠 리모컨", "목욕 안 하기"],
  },
  {
    name: "모험",
    emoji: "🗺️",
    color: "from-purple-400 to-violet-400",
    games: ["RPG", "탈출하기", "어몽어스", "도어즈", "파피 플레이타임", "실제 생활"],
  },
  {
    name: "전략/퍼즐",
    emoji: "🧩",
    color: "from-yellow-400 to-amber-400",
    games: ["블록 블라스트", "퍼즐", "원카드", "젠가", "369", "눈치 게임"],
  },
  {
    name: "캐릭터",
    emoji: "🦸",
    color: "from-indigo-400 to-blue-400",
    games: ["포켓몬", "배틀캣츠", "주술회전", "마인크래프트", "히어로 가챠"],
  },
  {
    name: "창작/특별",
    emoji: "✨",
    color: "from-teal-400 to-cyan-400",
    games: ["별의 진화", "행성", "수박 게임", "사진관", "랜덤 게임", "귀한 것", "비밀 게임"],
  },
  {
    name: "서핑/스포츠",
    emoji: "🏄",
    color: "from-sky-400 to-blue-400",
    games: ["서핑", "리듬 게임", "자동차 피하기", "로봇 합치기"],
  },
  {
    name: "공포",
    emoji: "👻",
    color: "from-gray-600 to-gray-800",
    games: ["무서운 언니", "마피아", "고양이 지키기", "컴퓨터"],
  },
];

const timelineEvents = [
  { text: "첫 번째 게임을 만들었어요!", emoji: "🎮", milestone: 1 },
  { text: "10개째 게임 완성!", emoji: "🎉", milestone: 10 },
  { text: "어몽어스 게임에 미션을 추가했어요!", emoji: "🔪", milestone: 20 },
  { text: "가족 게임 시리즈 시작!", emoji: "👨‍👩‍👧‍👦", milestone: 30 },
  { text: "50개째 게임 돌파!", emoji: "🚀", milestone: 50 },
  { text: "AI 만들기, USB 만들기 등 창작 게임 추가!", emoji: "🤖", milestone: 60 },
  { text: "공포 게임 시리즈 추가!", emoji: "👻", milestone: 70 },
  { text: "80개 게임 달성!!", emoji: "👑", milestone: 80 },
];

const avatarEmojis = ["😀", "😎", "🤩", "🥳", "😺", "🐶", "🦊", "🐸", "🐼", "🦁", "🐯", "🐰", "🐻", "🐵", "🦄", "🐲"];
const colorThemes = [
  { name: "핑크", from: "from-pink-400", to: "to-rose-300", bg: "bg-pink-50" },
  { name: "파랑", from: "from-blue-400", to: "to-cyan-300", bg: "bg-blue-50" },
  { name: "초록", from: "from-green-400", to: "to-emerald-300", bg: "bg-green-50" },
  { name: "보라", from: "from-purple-400", to: "to-violet-300", bg: "bg-purple-50" },
  { name: "주황", from: "from-orange-400", to: "to-yellow-300", bg: "bg-orange-50" },
  { name: "빨강", from: "from-red-400", to: "to-pink-300", bg: "bg-red-50" },
];

const tabs = [
  { id: "quiz", label: "퀴즈 타임", emoji: "❓" },
  { id: "explore", label: "게임 월드", emoji: "🗺️" },
  { id: "card", label: "소개 카드", emoji: "💌" },
  { id: "timeline", label: "타임라인", emoji: "⏰" },
  { id: "fame", label: "명예의 전당", emoji: "🏆" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ─────────────────── 컴포넌트 ─────────────────── */

/* 애니메이션 숫자 카운터 */
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

/* ─────────────────── 메인 페이지 ─────────────────── */

export default function IntroGamePage() {
  const [activeTab, setActiveTab] = useState<TabId>("quiz");
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());

  const markComplete = (tab: TabId) => {
    setCompletedTabs((prev) => new Set(prev).add(tab));
  };

  const progress = (completedTabs.size / tabs.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-blue-50 to-yellow-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1.5 text-sm font-medium text-pink-600 transition-colors hover:bg-pink-200"
            >
              ← 홈으로
            </Link>
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
              🎮 소개 페이지 게임
            </h1>
            <div className="w-16" />
          </div>

          {/* 진행률 바 */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-gray-400">
            진행률 {Math.round(progress)}% &middot; {completedTabs.size}/{tabs.length} 완료
          </p>

          {/* 탭 내비게이션 */}
          <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md scale-105"
                    : completedTabs.has(tab.id)
                    ? "bg-green-100 text-green-700"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.emoji} {tab.label}
                {completedTabs.has(tab.id) && " ✅"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {activeTab === "quiz" && <QuizSection onComplete={() => markComplete("quiz")} />}
        {activeTab === "explore" && <ExploreSection onComplete={() => markComplete("explore")} />}
        {activeTab === "card" && <CardSection onComplete={() => markComplete("card")} />}
        {activeTab === "timeline" && <TimelineSection onComplete={() => markComplete("timeline")} />}
        {activeTab === "fame" && <FameSection onComplete={() => markComplete("fame")} />}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════
   1. 퀴즈 타임
   ════════════════════════════════════════════════ */

function QuizSection({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = quizQuestions[current];
  const isCorrect = selected === question?.answer;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === question.answer) setScore((s) => s + 1);
    setTimeout(() => setShowResult(true), 300);
  };

  const handleNext = () => {
    if (current + 1 >= quizQuestions.length) {
      setFinished(true);
      onComplete();
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
  };

  if (finished) {
    const perfect = score === quizQuestions.length;
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center animate-fade-in">
        <div className="text-7xl animate-bounce">{perfect ? "🏆" : score >= 7 ? "🎉" : "💪"}</div>
        <h2 className="text-3xl font-extrabold text-gray-800">퀴즈 완료!</h2>
        <p className="text-xl font-bold text-purple-600">
          {quizQuestions.length}문제 중 {score}개 정답!
        </p>
        <p className="text-lg text-gray-500">
          {perfect
            ? "완벽해요! 진유현 전문가!! 👑"
            : score >= 7
            ? "대단해요! 진유현을 잘 알고 있네요! 😄"
            : "다시 도전해보세요! 진유현과 더 친해질 수 있어요! 💪"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="rounded-full bg-gradient-to-r from-pink-400 to-purple-400 px-6 py-3 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            🔄 다시 도전
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* 점수 & 진행 */}
      <div className="mb-6 flex items-center justify-between">
        <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-600">
          ⭐ 점수: {score}
        </span>
        <span className="text-sm text-gray-400">
          {current + 1} / {quizQuestions.length}
        </span>
      </div>

      {/* 진행바 */}
      <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
          style={{ width: `${((current + 1) / quizQuestions.length) * 100}%` }}
        />
      </div>

      {/* 질문 */}
      <div className="mb-8 rounded-3xl bg-white p-8 shadow-lg text-center">
        <p className="text-sm text-gray-400 mb-2">Q{current + 1}</p>
        <h3 className="text-2xl font-extrabold text-gray-800">{question.q}</h3>
      </div>

      {/* 보기 */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt, idx) => {
          let style = "bg-white border-2 border-gray-200 hover:border-purple-300 hover:shadow-md";
          if (selected !== null) {
            if (idx === question.answer) style = "bg-green-100 border-2 border-green-400 scale-105";
            else if (idx === selected) style = "bg-red-100 border-2 border-red-400 opacity-70";
            else style = "bg-gray-50 border-2 border-gray-200 opacity-50";
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`rounded-2xl p-4 text-center font-bold transition-all duration-300 ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* 결과 피드백 */}
      {showResult && (
        <div className="mt-6 text-center animate-fade-in">
          <div className="text-4xl mb-2">{isCorrect ? "🎉" : "😅"}</div>
          <p className={`text-lg font-bold ${isCorrect ? "text-green-500" : "text-red-500"}`}>
            {isCorrect ? "정답이에요! 잘했어요!" : `아쉬워요! 정답은 "${question.options[question.answer]}" 이에요`}
          </p>
          <button
            onClick={handleNext}
            className="mt-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 px-6 py-2.5 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            {current + 1 >= quizQuestions.length ? "결과 보기 →" : "다음 문제 →"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   2. 게임 월드 탐험
   ════════════════════════════════════════════════ */

function ExploreSection({ onComplete }: { onComplete: () => void }) {
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const hasCalledComplete = useRef(false);

  const toggleCategory = (idx: number) => {
    setExpandedCat(expandedCat === idx ? null : idx);
    setVisited((prev) => {
      const next = new Set(prev).add(idx);
      if (next.size >= 5 && !hasCalledComplete.current) {
        hasCalledComplete.current = true;
        onComplete();
      }
      return next;
    });
  };

  const totalGames = gameCategories.reduce((acc, c) => acc + c.games.length, 0);

  return (
    <div className="animate-fade-in">
      {/* 헤더 카운터 */}
      <div className="mb-8 text-center">
        <div className="inline-block rounded-3xl bg-white px-8 py-6 shadow-lg">
          <p className="text-sm text-gray-400 mb-1">진유현이 만든 게임</p>
          <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            <AnimatedCounter target={totalGames} />개!
          </p>
          <p className="text-xs text-gray-400 mt-2">({gameCategories.length}개 카테고리)</p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mb-4">
        카테고리를 눌러서 탐험하세요! (5개 이상 열어보면 완료!) 🗺️
      </p>

      {/* 카테고리 맵 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {gameCategories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => toggleCategory(idx)}
            className={`text-left rounded-2xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl ${
              visited.has(idx) ? "ring-2 ring-green-400" : ""
            }`}
          >
            {/* 카테고리 헤더 */}
            <div className={`bg-gradient-to-r ${cat.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className="font-bold">{cat.name}</p>
                    <p className="text-xs opacity-80">{cat.games.length}개 게임</p>
                  </div>
                </div>
                <span className={`text-xl transition-transform duration-300 ${expandedCat === idx ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </div>
            </div>

            {/* 게임 목록 */}
            <div
              className={`bg-white overflow-hidden transition-all duration-300 ${
                expandedCat === idx ? "max-h-60 p-4" : "max-h-0"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {cat.games.map((game, gIdx) => (
                  <span
                    key={gIdx}
                    className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    {game}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {visited.size >= 5 && (
        <div className="mt-6 text-center animate-fade-in">
          <p className="text-lg font-bold text-green-500">🎉 게임 월드 탐험 완료!</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   3. 자기소개 카드 만들기
   ════════════════════════════════════════════════ */

function CardSection({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [likes, setLikes] = useState("");
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [themeIdx, setThemeIdx] = useState(0);
  const [cardCreated, setCardCreated] = useState(false);

  const theme = colorThemes[themeIdx];

  const handleCreate = () => {
    if (!name.trim()) return;
    setCardCreated(true);
    onComplete();
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-extrabold text-center text-gray-800 mb-6">💌 나만의 소개 카드 만들기</h2>

      {!cardCreated ? (
        <div className="space-y-6">
          {/* 입력 폼 */}
          <div className="rounded-3xl bg-white p-6 shadow-lg space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-800 placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">나이</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="나이를 입력하세요"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-800 placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">학교</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="학교를 입력하세요"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-800 placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">좋아하는 것</label>
              <input
                type="text"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="좋아하는 것을 입력하세요"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-800 placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 아바타 선택 */}
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-sm font-bold text-gray-600 mb-3">아바타 선택</p>
            <div className="flex flex-wrap gap-2">
              {avatarEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => setAvatarIdx(idx)}
                  className={`h-12 w-12 rounded-full text-2xl flex items-center justify-center transition-all ${
                    avatarIdx === idx ? "bg-purple-100 ring-2 ring-purple-400 scale-110" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 테마 선택 */}
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-sm font-bold text-gray-600 mb-3">색상 테마 선택</p>
            <div className="flex flex-wrap gap-2">
              {colorThemes.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setThemeIdx(idx)}
                  className={`rounded-full px-4 py-2 text-sm font-bold text-white bg-gradient-to-r ${t.from} ${t.to} transition-all ${
                    themeIdx === idx ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 py-4 text-lg font-extrabold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
          >
            ✨ 카드 만들기!
          </button>
        </div>
      ) : (
        /* 결과: 두 카드 나란히 */
        <div className="space-y-8 animate-fade-in">
          <div className="text-center">
            <p className="text-4xl mb-2 animate-bounce">🎊</p>
            <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              우리는 친구!
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* 진유현 카드 */}
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-pink-400 to-yellow-300 p-6 text-center text-white">
                <div className="text-5xl mb-2">🧒</div>
                <p className="text-2xl font-extrabold">진유현</p>
              </div>
              <div className="bg-white p-5 space-y-2">
                <p className="text-sm"><span className="font-bold text-gray-500">나이:</span> 9살</p>
                <p className="text-sm"><span className="font-bold text-gray-500">학교:</span> 청덕초등학교 2학년 1반</p>
                <p className="text-sm"><span className="font-bold text-gray-500">좋아하는 것:</span> 로블록스</p>
                <p className="text-sm"><span className="font-bold text-gray-500">특기:</span> 게임 만들기 (80개!)</p>
              </div>
            </div>

            {/* 유저 카드 */}
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <div className={`bg-gradient-to-r ${theme.from} ${theme.to} p-6 text-center text-white`}>
                <div className="text-5xl mb-2">{avatarEmojis[avatarIdx]}</div>
                <p className="text-2xl font-extrabold">{name}</p>
              </div>
              <div className={`${theme.bg} p-5 space-y-2`}>
                {age && <p className="text-sm"><span className="font-bold text-gray-500">나이:</span> {age}</p>}
                {school && <p className="text-sm"><span className="font-bold text-gray-500">학교:</span> {school}</p>}
                {likes && <p className="text-sm"><span className="font-bold text-gray-500">좋아하는 것:</span> {likes}</p>}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setCardCreated(false)}
              className="rounded-full bg-gray-100 px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
            >
              🔄 다시 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   4. 타임라인
   ════════════════════════════════════════════════ */

function TimelineSection({ onComplete }: { onComplete: () => void }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const hasCalledComplete = useRef(false);

  const revealEvent = (idx: number) => {
    setRevealed((prev) => {
      const next = new Set(prev).add(idx);
      if (next.size >= timelineEvents.length && !hasCalledComplete.current) {
        hasCalledComplete.current = true;
        onComplete();
      }
      return next;
    });
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-extrabold text-center text-gray-800 mb-2">⏰ 진유현의 게임 개발 여정</h2>
      <p className="text-center text-sm text-gray-400 mb-8">각 이벤트를 클릭해서 열어보세요!</p>

      <div className="relative">
        {/* 세로 라인 */}
        <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-300 via-purple-300 to-blue-300 rounded-full" />

        <div className="space-y-4">
          {timelineEvents.map((event, idx) => {
            const isRevealed = revealed.has(idx);
            return (
              <button
                key={idx}
                onClick={() => revealEvent(idx)}
                className="relative w-full text-left pl-16 group"
              >
                {/* 원 아이콘 */}
                <div
                  className={`absolute left-3 top-3 h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    isRevealed
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white scale-110 shadow-lg"
                      : "bg-white border-2 border-gray-300 text-gray-400 group-hover:border-purple-400"
                  }`}
                >
                  {isRevealed ? event.emoji : "?"}
                </div>

                {/* 카드 */}
                <div
                  className={`rounded-2xl p-5 transition-all duration-500 ${
                    isRevealed
                      ? "bg-white shadow-lg"
                      : "bg-gray-100 hover:bg-gray-50 hover:shadow-md cursor-pointer"
                  }`}
                >
                  {isRevealed ? (
                    <div className="animate-fade-in">
                      <p className="text-xs text-purple-400 font-bold mb-1">🎮 {event.milestone}개 게임</p>
                      <p className="text-lg font-bold text-gray-800">
                        {event.emoji} {event.text}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 font-bold">👆 클릭해서 열기!</p>
                      <span className="text-xs text-gray-300">(마일스톤 #{idx + 1})</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {revealed.size >= timelineEvents.length && (
        <div className="mt-8 text-center animate-fade-in">
          <div className="text-5xl mb-3 animate-bounce">🎊</div>
          <p className="text-lg font-bold text-purple-600">진유현의 놀라운 여정을 다 봤어요!</p>
          <p className="text-sm text-gray-400">9살에 80개 게임이라니, 정말 대단해요! 👏</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   5. 명예의 전당
   ════════════════════════════════════════════════ */

function FameSection({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const stats = [
    { label: "총 게임 수", value: "80개", emoji: "🎮", color: "from-pink-400 to-rose-400" },
    { label: "카테고리", value: "10개+", emoji: "📂", color: "from-blue-400 to-cyan-400" },
    { label: "가장 인기 게임", value: "어몽어스", emoji: "🔪", color: "from-red-400 to-orange-400" },
    { label: "두 번째 인기", value: "로블록스", emoji: "🧱", color: "from-green-400 to-emerald-400" },
  ];

  const badges = [
    { title: "게임 마스터", desc: "80개 게임 제작", emoji: "👑" },
    { title: "코딩 천재", desc: "9살 개발자", emoji: "💻" },
    { title: "창작왕", desc: "다양한 장르 도전", emoji: "🎨" },
    { title: "로블록스 팬", desc: "최애 게임", emoji: "🧱" },
    { title: "가족 사랑", desc: "가족 게임 시리즈", emoji: "❤️" },
    { title: "모험가", desc: "RPG, 탈출, 어몽어스", emoji: "🗺️" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3 animate-bounce">🏆</div>
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500">
          명예의 전당
        </h2>
        <p className="text-sm text-gray-400 mt-1">진유현의 놀라운 기록들</p>
      </div>

      {/* 스탯 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="rounded-2xl bg-white p-5 shadow-lg text-center">
            <div className="text-3xl mb-2">{stat.emoji}</div>
            <p className="text-xs text-gray-400 font-bold">{stat.label}</p>
            <p className={`text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* 특별한 점 */}
      <div className="rounded-3xl bg-gradient-to-r from-yellow-100 via-orange-100 to-pink-100 p-6 mb-8 text-center shadow-lg border-2 border-yellow-200">
        <p className="text-lg font-extrabold text-orange-600 mb-1">⭐ 특별한 점 ⭐</p>
        <p className="text-2xl font-black text-gray-800">
          &ldquo;9살에 80개 게임이 있는<br />사이트를 가지고 있어요!&rdquo;
        </p>
        <p className="text-sm text-orange-400 mt-2">🎉 진유현은 정말 대단한 게임 크리에이터입니다! 🎉</p>
      </div>

      {/* 뱃지 */}
      <h3 className="text-lg font-extrabold text-gray-800 mb-4 text-center">🏅 획득한 뱃지</h3>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-white p-4 shadow-md text-center hover:shadow-lg transition-shadow hover:scale-105 transition-transform"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div className="text-3xl mb-1">{badge.emoji}</div>
            <p className="text-xs font-extrabold text-gray-700">{badge.title}</p>
            <p className="text-[10px] text-gray-400">{badge.desc}</p>
          </div>
        ))}
      </div>

      {/* 축하 메시지 */}
      <div className="mt-10 text-center">
        <div className="inline-block rounded-3xl bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 p-1">
          <div className="rounded-3xl bg-white px-8 py-6">
            <p className="text-lg font-extrabold text-gray-800 mb-1">
              🎮 진유현의 소개 페이지 게임 🎮
            </p>
            <p className="text-sm text-gray-500">
              플레이해주셔서 감사합니다!<br />
              앞으로도 진유현의 게임을 즐겨주세요! 💖
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
