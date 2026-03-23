"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 시간 ───── */
const TIMES = ["🌅 06:00", "🌞 08:00", "☀️ 10:00", "🌤️ 12:00", "🌇 14:00", "🌆 16:00", "🌙 18:00", "🌑 20:00", "😴 22:00"];

/* ───── 스탯 ───── */
interface Stats {
  hp: number;          // 체력 0~100
  hunger: number;      // 배고픔 0~100 (높으면 배고픔)
  happiness: number;   // 행복 0~100
  intelligence: number;// 지능 0~100
  social: number;      // 인기 0~100
  money: number;       // 용돈
  hygiene: number;     // 청결 0~100
  energy: number;      // 에너지 0~100
}

/* ───── 행동 ───── */
interface Action {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  category: "daily" | "school" | "play" | "social" | "special";
  timeSlots: number[]; // 가능한 시간대 인덱스
  effects: Partial<Stats>;
  duration: number;     // 시간 소모 (1=한 타임)
  requirement?: { stat: keyof Stats; min: number };
  unlockDay?: number;
  eventChance?: number; // 랜덤 이벤트 확률
}

const ACTIONS: Action[] = [
  // 일상
  { id: "wake", name: "기상", emoji: "⏰", desc: "일어나서 준비하기", category: "daily", timeSlots: [0], effects: { energy: 5 }, duration: 1 },
  { id: "eat_breakfast", name: "아침 먹기", emoji: "🥣", desc: "맛있는 아침밥!", category: "daily", timeSlots: [0, 1], effects: { hunger: -30, hp: 5, energy: 10 }, duration: 1 },
  { id: "eat_lunch", name: "점심 먹기", emoji: "🍱", desc: "급식 시간!", category: "daily", timeSlots: [3], effects: { hunger: -35, hp: 5, happiness: 5 }, duration: 1 },
  { id: "eat_dinner", name: "저녁 먹기", emoji: "🍚", desc: "집밥 최고!", category: "daily", timeSlots: [6, 7], effects: { hunger: -40, hp: 10, happiness: 5 }, duration: 1 },
  { id: "eat_snack", name: "간식 먹기", emoji: "🍪", desc: "맛있는 간식!", category: "daily", timeSlots: [2, 4, 5], effects: { hunger: -15, happiness: 8, money: -5 }, duration: 1, requirement: { stat: "money", min: 5 } },
  { id: "sleep", name: "잠자기", emoji: "😴", desc: "푹 자야 건강해!", category: "daily", timeSlots: [8], effects: { energy: 50, hp: 20, hunger: 10 }, duration: 1 },
  { id: "shower", name: "씻기", emoji: "🚿", desc: "깨끗하게!", category: "daily", timeSlots: [0, 7, 8], effects: { hygiene: 30, happiness: 5 }, duration: 1 },
  { id: "brush", name: "양치하기", emoji: "🪥", desc: "이를 닦자!", category: "daily", timeSlots: [0, 8], effects: { hygiene: 10, hp: 3 }, duration: 1 },

  // 학교
  { id: "study", name: "수업 듣기", emoji: "📚", desc: "열심히 공부!", category: "school", timeSlots: [1, 2, 3, 4], effects: { intelligence: 5, energy: -10, happiness: -3 }, duration: 1 },
  { id: "study_hard", name: "열공 모드", emoji: "📖", desc: "진지하게 공부!", category: "school", timeSlots: [1, 2, 3, 4, 5, 7], effects: { intelligence: 10, energy: -20, happiness: -8 }, duration: 1 },
  { id: "homework", name: "숙제하기", emoji: "✏️", desc: "숙제를 끝내자!", category: "school", timeSlots: [5, 6, 7], effects: { intelligence: 8, energy: -15, happiness: -5 }, duration: 1 },
  { id: "art", name: "미술 수업", emoji: "🎨", desc: "그림 그리기!", category: "school", timeSlots: [2, 4], effects: { intelligence: 3, happiness: 10, energy: -5 }, duration: 1 },
  { id: "pe", name: "체육 수업", emoji: "⚽", desc: "운동하자!", category: "school", timeSlots: [2, 4], effects: { hp: 10, energy: -15, happiness: 8, hunger: 10 }, duration: 1 },
  { id: "music", name: "음악 수업", emoji: "🎵", desc: "노래 부르기!", category: "school", timeSlots: [2, 4], effects: { happiness: 12, intelligence: 2, energy: -5 }, duration: 1 },

  // 놀기
  { id: "game", name: "게임하기", emoji: "🎮", desc: "게임 최고!", category: "play", timeSlots: [5, 6, 7], effects: { happiness: 20, energy: -10, intelligence: -2 }, duration: 1, eventChance: 0.15 },
  { id: "youtube", name: "유튜브 보기", emoji: "📱", desc: "재밌는 영상!", category: "play", timeSlots: [5, 6, 7], effects: { happiness: 15, energy: -5, intelligence: -1 }, duration: 1 },
  { id: "tv", name: "TV 보기", emoji: "📺", desc: "만화 보자!", category: "play", timeSlots: [6, 7], effects: { happiness: 12, energy: -3 }, duration: 1 },
  { id: "playground", name: "놀이터 가기", emoji: "🛝", desc: "밖에서 놀자!", category: "play", timeSlots: [4, 5], effects: { happiness: 18, hp: 8, energy: -15, social: 5, hunger: 8 }, duration: 1 },
  { id: "bike", name: "자전거 타기", emoji: "🚲", desc: "씽씽~!", category: "play", timeSlots: [4, 5], effects: { happiness: 15, hp: 10, energy: -12, hunger: 5 }, duration: 1, eventChance: 0.1 },
  { id: "draw", name: "그림 그리기", emoji: "🖍️", desc: "자유롭게 그리기!", category: "play", timeSlots: [5, 6, 7], effects: { happiness: 10, intelligence: 3, energy: -5 }, duration: 1 },
  { id: "read", name: "책 읽기", emoji: "📕", desc: "재밌는 책!", category: "play", timeSlots: [5, 6, 7], effects: { intelligence: 8, happiness: 5, energy: -5 }, duration: 1 },
  { id: "lego", name: "레고 만들기", emoji: "🧱", desc: "멋진 작품!", category: "play", timeSlots: [5, 6, 7], effects: { intelligence: 5, happiness: 12, energy: -8 }, duration: 1 },

  // 소셜
  { id: "friend_play", name: "친구와 놀기", emoji: "👫", desc: "친구랑 같이!", category: "social", timeSlots: [4, 5], effects: { happiness: 20, social: 10, energy: -12 }, duration: 1 },
  { id: "friend_call", name: "친구에게 전화", emoji: "📞", desc: "수다 떨기!", category: "social", timeSlots: [5, 6, 7], effects: { happiness: 8, social: 8, energy: -3 }, duration: 1 },
  { id: "help_parent", name: "부모님 돕기", emoji: "🤝", desc: "효도하기!", category: "social", timeSlots: [6, 7], effects: { social: 5, happiness: 5, money: 10 }, duration: 1 },
  { id: "pet_play", name: "반려동물 놀아주기", emoji: "🐶", desc: "강아지랑 놀기!", category: "social", timeSlots: [5, 6, 7], effects: { happiness: 15, social: 3, energy: -5 }, duration: 1, unlockDay: 3 },

  // 특별
  { id: "shop", name: "문구점 가기", emoji: "🏪", desc: "뭐 살까?", category: "special", timeSlots: [4, 5], effects: { happiness: 10, money: -20 }, duration: 1, requirement: { stat: "money", min: 20 } },
  { id: "allowance", name: "용돈 받기", emoji: "💰", desc: "엄마한테 용돈!", category: "special", timeSlots: [6, 7], effects: { money: 30, happiness: 10 }, duration: 1, eventChance: 0.3 },
  { id: "exercise", name: "태권도 학원", emoji: "🥋", desc: "얍!", category: "special", timeSlots: [5], effects: { hp: 15, energy: -20, intelligence: 2, happiness: 5 }, duration: 1, unlockDay: 2 },
  { id: "piano", name: "피아노 학원", emoji: "🎹", desc: "도레미~", category: "special", timeSlots: [5], effects: { intelligence: 8, happiness: 3, energy: -10 }, duration: 1, unlockDay: 4 },
  { id: "clean_room", name: "방 청소", emoji: "🧹", desc: "깨끗하게!", category: "special", timeSlots: [5, 6], effects: { hygiene: 15, happiness: -3, energy: -8, social: 3 }, duration: 1 },
];

/* ───── 랜덤 이벤트 ───── */
interface GameEvent {
  id: string;
  text: string;
  emoji: string;
  effects: Partial<Stats>;
  type: "good" | "bad" | "neutral";
}

const RANDOM_EVENTS: GameEvent[] = [
  { id: "e1", text: "길에서 100원을 주웠다!", emoji: "🪙", effects: { money: 10, happiness: 5 }, type: "good" },
  { id: "e2", text: "시험에서 100점을 맞았다!", emoji: "💯", effects: { intelligence: 5, happiness: 15, social: 5 }, type: "good" },
  { id: "e3", text: "친구가 과자를 나눠줬다!", emoji: "🍫", effects: { hunger: -10, happiness: 10, social: 5 }, type: "good" },
  { id: "e4", text: "엄마가 맛있는 거 사줬다!", emoji: "🍕", effects: { hunger: -25, happiness: 15 }, type: "good" },
  { id: "e5", text: "비가 와서 우산이 없다...", emoji: "🌧️", effects: { happiness: -10, hygiene: -10, hp: -5 }, type: "bad" },
  { id: "e6", text: "넘어져서 무릎을 다쳤다!", emoji: "🤕", effects: { hp: -10, happiness: -8 }, type: "bad" },
  { id: "e7", text: "숙제를 깜빡했다!", emoji: "😱", effects: { intelligence: -3, happiness: -10, social: -5 }, type: "bad" },
  { id: "e8", text: "게임에서 1등을 했다!", emoji: "🏆", effects: { happiness: 20 }, type: "good" },
  { id: "e9", text: "강아지가 핥아줬다!", emoji: "🐕", effects: { happiness: 12 }, type: "good" },
  { id: "e10", text: "친구와 싸웠다...", emoji: "😠", effects: { happiness: -15, social: -10 }, type: "bad" },
  { id: "e11", text: "아빠가 용돈을 줬다!", emoji: "💸", effects: { money: 50, happiness: 10 }, type: "good" },
  { id: "e12", text: "배가 아프다...", emoji: "🤢", effects: { hp: -8, happiness: -5, energy: -10 }, type: "bad" },
  { id: "e13", text: "칭찬 스티커를 받았다!", emoji: "⭐", effects: { happiness: 10, social: 5, intelligence: 3 }, type: "good" },
  { id: "e14", text: "재밌는 꿈을 꿨다!", emoji: "💭", effects: { happiness: 8, energy: 5 }, type: "good" },
  { id: "e15", text: "엄마한테 혼났다...", emoji: "😢", effects: { happiness: -12, social: -3 }, type: "bad" },
  { id: "e16", text: "새 친구가 생겼다!", emoji: "🤝", effects: { social: 15, happiness: 10 }, type: "good" },
  { id: "e17", text: "급식이 맛있었다!", emoji: "😋", effects: { hunger: -10, happiness: 8 }, type: "good" },
  { id: "e18", text: "발표를 잘 했다!", emoji: "🎤", effects: { intelligence: 5, social: 8, happiness: 10 }, type: "good" },
];

/* ───── 날씨 ───── */
const WEATHERS = [
  { id: "sunny", name: "맑음", emoji: "☀️", effect: { happiness: 3 } },
  { id: "cloudy", name: "흐림", emoji: "☁️", effect: {} },
  { id: "rainy", name: "비", emoji: "🌧️", effect: { happiness: -3 } },
  { id: "snowy", name: "눈", emoji: "❄️", effect: { happiness: 5 } },
];

/* ───── 업적 ───── */
interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  check: (s: Stats, day: number, log: Record<string, number>) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", name: "첫날!", emoji: "🎉", desc: "첫 번째 하루를 보냈다!", check: (_, day) => day >= 2 },
  { id: "a2", name: "공부왕", emoji: "📚", desc: "지능 50 달성!", check: (s) => s.intelligence >= 50 },
  { id: "a3", name: "인싸", emoji: "👑", desc: "인기 50 달성!", check: (s) => s.social >= 50 },
  { id: "a4", name: "부자", emoji: "💰", desc: "용돈 200원 모으기!", check: (s) => s.money >= 200 },
  { id: "a5", name: "건강왕", emoji: "💪", desc: "체력 90 이상!", check: (s) => s.hp >= 90 },
  { id: "a6", name: "행복한 아이", emoji: "😊", desc: "행복 90 이상!", check: (s) => s.happiness >= 90 },
  { id: "a7", name: "일주일!", emoji: "📅", desc: "7일 버티기!", check: (_, day) => day >= 8 },
  { id: "a8", name: "올라운더", emoji: "⭐", desc: "모든 스탯 40 이상!", check: (s) => s.hp >= 40 && s.happiness >= 40 && s.intelligence >= 40 && s.social >= 40 },
  { id: "a9", name: "깔끔왕", emoji: "✨", desc: "청결 90 이상!", check: (s) => s.hygiene >= 90 },
  { id: "a10", name: "한 달!", emoji: "🗓️", desc: "30일 달성!", check: (_, day) => day >= 31 },
];

type Screen = "main" | "play" | "event" | "dayend" | "gameover" | "achievements";

export default function RealLifePage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [day, setDay] = useState(1);
  const [timeIndex, setTimeIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ hp: 80, hunger: 30, happiness: 60, intelligence: 20, social: 20, money: 50, hygiene: 70, energy: 80 });
  const [weather, setWeather] = useState(WEATHERS[0]);
  const [actionLog, setActionLog] = useState<Record<string, number>>({});
  const [dayLog, setDayLog] = useState<string[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [dayScore, setDayScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [showCategory, setShowCategory] = useState<string>("all");

  // 업적 체크
  useEffect(() => {
    if (!gameActive) return;
    ACHIEVEMENTS.forEach(a => {
      if (!earnedAchievements.includes(a.id) && a.check(stats, day, actionLog)) {
        setEarnedAchievements(prev => [...prev, a.id]);
        setDayLog(prev => [...prev, `🏆 업적 달성: ${a.emoji} ${a.name}!`]);
      }
    });
  }, [stats, day, gameActive]);

  // 게임오버 체크
  useEffect(() => {
    if (!gameActive) return;
    if (stats.hp <= 0 || stats.energy <= 0 || stats.happiness <= 0) {
      let reason = "";
      if (stats.hp <= 0) reason = "체력이 바닥났다...";
      else if (stats.energy <= 0) reason = "너무 피곤해서 쓰러졌다...";
      else reason = "너무 우울해졌다...";
      setDayLog(prev => [...prev, `😵 ${reason}`]);
      setGameActive(false);
      setScreen("gameover");
    }
  }, [stats, gameActive]);

  const startGame = useCallback(() => {
    setDay(1);
    setTimeIndex(0);
    setStats({ hp: 80, hunger: 30, happiness: 60, intelligence: 20, social: 20, money: 50, hygiene: 70, energy: 80 });
    setWeather(WEATHERS[Math.floor(Math.random() * WEATHERS.length)]);
    setActionLog({});
    setDayLog(["🌅 새로운 하루가 시작됐다! 오늘은 뭘 할까?"]);
    setDayScore(0);
    setTotalScore(0);
    setEarnedAchievements([]);
    setGameActive(true);
    setScreen("play");
  }, []);

  const clampStats = (s: Stats): Stats => ({
    hp: Math.max(0, Math.min(100, s.hp)),
    hunger: Math.max(0, Math.min(100, s.hunger)),
    happiness: Math.max(0, Math.min(100, s.happiness)),
    intelligence: Math.max(0, Math.min(100, s.intelligence)),
    social: Math.max(0, Math.min(100, s.social)),
    money: Math.max(0, s.money),
    hygiene: Math.max(0, Math.min(100, s.hygiene)),
    energy: Math.max(0, Math.min(100, s.energy)),
  });

  const doAction = useCallback((action: Action) => {
    if (!gameActive) return;
    if (action.requirement && stats[action.requirement.stat] < action.requirement.min) return;
    if (action.unlockDay && day < action.unlockDay) return;

    // 스탯 적용
    const newStats = { ...stats };
    for (const [key, val] of Object.entries(action.effects)) {
      (newStats as Record<string, number>)[key] = ((newStats as Record<string, number>)[key] || 0) + (val as number);
    }

    // 배고프면 자동 효과
    if (newStats.hunger >= 70) { newStats.happiness -= 3; newStats.energy -= 3; }
    if (newStats.hunger >= 90) { newStats.hp -= 5; }
    // 더러우면
    if (newStats.hygiene <= 20) { newStats.social -= 2; newStats.happiness -= 2; }
    // 시간 지남에 따른 자연 감소
    newStats.hunger += 5;
    newStats.hygiene -= 3;

    setStats(clampStats(newStats));

    // 점수
    const score = Math.max(0, Math.floor(
      (newStats.happiness - stats.happiness) +
      (newStats.intelligence - stats.intelligence) * 2 +
      (newStats.social - stats.social) +
      (newStats.hp - stats.hp) * 0.5 + 5
    ));
    setDayScore(s => s + score);

    // 로그
    setDayLog(prev => [...prev, `${TIMES[timeIndex]} ${action.emoji} ${action.name}`].slice(-12));
    setActionLog(prev => ({ ...prev, [action.id]: (prev[action.id] || 0) + 1 }));

    // 랜덤 이벤트
    if (action.eventChance && Math.random() < action.eventChance) {
      const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      setCurrentEvent(evt);
      const evtStats = { ...newStats };
      for (const [key, val] of Object.entries(evt.effects)) {
        (evtStats as Record<string, number>)[key] = ((evtStats as Record<string, number>)[key] || 0) + (val as number);
      }
      setStats(clampStats(evtStats));
      setScreen("event");
      // 시간 진행은 이벤트 닫을 때
      return;
    }

    // 시간 진행
    advanceTime();
  }, [gameActive, stats, timeIndex, day]);

  const advanceTime = useCallback(() => {
    const nextTime = timeIndex + 1;
    if (nextTime >= TIMES.length) {
      // 하루 끝
      setTotalScore(t => t + dayScore);
      setScreen("dayend");
    } else {
      setTimeIndex(nextTime);
    }
  }, [timeIndex, dayScore]);

  const nextDay = useCallback(() => {
    setDay(d => d + 1);
    setTimeIndex(0);
    setDayScore(0);
    setWeather(WEATHERS[Math.floor(Math.random() * WEATHERS.length)]);
    setDayLog([`🌅 ${day + 1}일차! ${WEATHERS[Math.floor(Math.random() * WEATHERS.length)].emoji} 새 아침이 밝았다!`]);
    // 하루 회복
    setStats(prev => clampStats({ ...prev, energy: Math.min(100, prev.energy + 30), hunger: prev.hunger + 15, hygiene: prev.hygiene - 5 }));
    setScreen("play");
  }, [day]);

  const closeEvent = useCallback(() => {
    if (currentEvent) {
      setDayLog(prev => [...prev, `${currentEvent.emoji} ${currentEvent.text}`]);
    }
    setCurrentEvent(null);
    advanceTime();
    setScreen("play");
  }, [currentEvent, advanceTime]);

  const getStatBar = (value: number, color: string) => (
    <div className="bg-gray-700 rounded-full h-2 overflow-hidden flex-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );

  const getAvailableActions = () => {
    return ACTIONS.filter(a => {
      if (!a.timeSlots.includes(timeIndex)) return false;
      if (a.unlockDay && day < a.unlockDay) return false;
      return true;
    });
  };

  const CATEGORY_LABELS: Record<string, { name: string; emoji: string }> = {
    all: { name: "전체", emoji: "📋" },
    daily: { name: "일상", emoji: "🏠" },
    school: { name: "학교", emoji: "🏫" },
    play: { name: "놀기", emoji: "🎮" },
    social: { name: "친구", emoji: "👫" },
    special: { name: "특별", emoji: "⭐" },
  };

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-green-200 text-gray-900 p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-sky-700 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🧒</div>
            <h1 className="text-3xl font-black mb-1">나의 하루</h1>
            <p className="text-sky-700 text-sm">현실적인 초등학생 생활 시뮬레이션!</p>
          </div>

          <div className="bg-white rounded-xl p-4 mb-4 shadow-md text-center">
            <div className="text-4xl mb-2">🌅🏫🎮😴</div>
            <p className="text-sm text-gray-600">아침에 일어나서 밤에 잠들 때까지</p>
            <p className="text-sm text-gray-600">하루를 직접 선택하며 살아보자!</p>
            <div className="mt-3 text-xs text-gray-500 space-y-0.5">
              <p>🍚 밥 먹고, 📚 공부하고, 🎮 게임하고, 👫 친구 만나고</p>
              <p>⚠️ 체력, 배고픔, 행복, 청결을 잘 관리해야 해!</p>
              <p>🏆 업적을 달성하고 최대한 오래 살아남자!</p>
            </div>
          </div>

          {totalScore > 0 && (
            <div className="bg-white/80 rounded-xl p-2 mb-4 text-center text-sm">
              <span className="text-yellow-600 font-bold">지난 기록: {day}일, {totalScore}점, 🏆{earnedAchievements.length}개</span>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white rounded-xl p-4 text-center text-lg font-black shadow-md">
              🌅 하루 시작하기!
            </button>
            <button onClick={() => setScreen("achievements")}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 rounded-xl p-3 text-center font-bold">
              🏆 업적 목록
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play") {
    const available = getAvailableActions();
    const filtered = showCategory === "all" ? available : available.filter(a => a.category === showCategory);

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-50 text-gray-900 p-3">
        <div className="max-w-md mx-auto">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold">{day}일차</div>
            <div className="text-sm font-bold">{TIMES[timeIndex]}</div>
            <div className="text-sm">{weather.emoji} {weather.name}</div>
          </div>

          {/* 스탯 */}
          <div className="bg-white rounded-xl p-2 mb-2 shadow-sm">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                <span>❤️</span><span className="w-8">체력</span>{getStatBar(stats.hp, stats.hp > 30 ? "#22c55e" : "#ef4444")}<span className="w-6 text-right">{Math.floor(stats.hp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⚡</span><span className="w-8">에너지</span>{getStatBar(stats.energy, stats.energy > 30 ? "#eab308" : "#ef4444")}<span className="w-6 text-right">{Math.floor(stats.energy)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🍽️</span><span className="w-8">배고픔</span>{getStatBar(stats.hunger, stats.hunger < 60 ? "#22c55e" : "#ef4444")}<span className="w-6 text-right">{Math.floor(stats.hunger)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>😊</span><span className="w-8">행복</span>{getStatBar(stats.happiness, stats.happiness > 30 ? "#ec4899" : "#ef4444")}<span className="w-6 text-right">{Math.floor(stats.happiness)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📚</span><span className="w-8">지능</span>{getStatBar(stats.intelligence, "#3b82f6")}<span className="w-6 text-right">{Math.floor(stats.intelligence)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>👥</span><span className="w-8">인기</span>{getStatBar(stats.social, "#8b5cf6")}<span className="w-6 text-right">{Math.floor(stats.social)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🧼</span><span className="w-8">청결</span>{getStatBar(stats.hygiene, stats.hygiene > 30 ? "#06b6d4" : "#ef4444")}<span className="w-6 text-right">{Math.floor(stats.hygiene)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🪙</span><span className="w-8">용돈</span><span className="font-bold text-yellow-600">{stats.money}원</span>
              </div>
            </div>
          </div>

          {/* 경고 */}
          {stats.hunger >= 70 && <div className="text-center text-xs text-red-600 font-bold mb-1">🍽️ 배가 고프다! 밥을 먹어야 해!</div>}
          {stats.energy <= 25 && <div className="text-center text-xs text-red-600 font-bold mb-1">⚡ 너무 피곤해! 쉬어야 해!</div>}
          {stats.hygiene <= 25 && <div className="text-center text-xs text-orange-600 font-bold mb-1">🧼 냄새나! 씻어야 해!</div>}

          {/* 로그 */}
          <div className="bg-gray-800 rounded-xl p-2 mb-2 max-h-16 overflow-y-auto">
            {dayLog.slice(-4).map((log, i) => <div key={i} className="text-[10px] text-gray-300">{log}</div>)}
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
              <button key={key} onClick={() => setShowCategory(key)}
                className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
                  showCategory === key ? "bg-sky-500 text-white" : "bg-white text-gray-600"
                }`}>
                {val.emoji} {val.name}
              </button>
            ))}
          </div>

          {/* 행동 선택 */}
          <div className="space-y-1.5">
            {filtered.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-4">이 시간대에는 할 수 있는 게 없어요</div>
            )}
            {filtered.map(action => {
              const canDo = !action.requirement || stats[action.requirement.stat] >= action.requirement.min;
              return (
                <button key={action.id} onClick={() => canDo && doAction(action)}
                  disabled={!canDo}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                    canDo ? "bg-white hover:bg-sky-50 shadow-sm active:scale-[0.98]" : "bg-gray-200 opacity-50"
                  }`}>
                  <span className="text-2xl">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{action.name}</div>
                    <div className="text-[10px] text-gray-500">{action.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap gap-0.5 justify-end">
                      {Object.entries(action.effects).map(([key, val]) => {
                        const icons: Record<string, string> = { hp: "❤️", hunger: "🍽️", happiness: "😊", intelligence: "📚", social: "👥", money: "🪙", hygiene: "🧼", energy: "⚡" };
                        const v = val as number;
                        const isGood = key === "hunger" ? v < 0 : v > 0;
                        return (
                          <span key={key} className={`text-[9px] ${isGood ? "text-green-600" : "text-red-500"}`}>
                            {icons[key]}{v > 0 ? "+" : ""}{v}
                          </span>
                        );
                      })}
                    </div>
                    {!canDo && action.requirement && (
                      <div className="text-[8px] text-red-500">🪙 {action.requirement.min}원 필요</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center text-[10px] text-gray-400 mt-2">점수: {dayScore} | 총점: {totalScore}</div>
        </div>
      </div>
    );
  }

  /* ───── 이벤트 ───── */
  if (screen === "event" && currentEvent) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        currentEvent.type === "good" ? "bg-gradient-to-b from-yellow-100 to-green-100" :
        currentEvent.type === "bad" ? "bg-gradient-to-b from-gray-300 to-red-100" :
        "bg-gradient-to-b from-blue-100 to-purple-100"
      }`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-7xl mb-4">{currentEvent.emoji}</div>
          <div className={`text-xl font-black mb-4 ${currentEvent.type === "good" ? "text-green-700" : "text-red-700"}`}>
            {currentEvent.type === "good" ? "좋은 일 발생!" : "안 좋은 일 발생!"}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md mb-4">
            <p className="text-lg font-bold mb-3">{currentEvent.text}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(currentEvent.effects).map(([key, val]) => {
                const icons: Record<string, string> = { hp: "❤️", hunger: "🍽️", happiness: "😊", intelligence: "📚", social: "👥", money: "🪙", hygiene: "🧼", energy: "⚡" };
                const v = val as number;
                const isGood = key === "hunger" ? v < 0 : v > 0;
                return (
                  <span key={key} className={`text-sm font-bold ${isGood ? "text-green-600" : "text-red-500"}`}>
                    {icons[key]} {v > 0 ? "+" : ""}{v}
                  </span>
                );
              })}
            </div>
          </div>
          <button onClick={closeEvent}
            className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-xl font-bold text-lg">
            확인!
          </button>
        </div>
      </div>
    );
  }

  /* ───── 하루 끝 ───── */
  if (screen === "dayend") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-3">🌙</div>
          <h2 className="text-2xl font-black mb-1">{day}일차 끝!</h2>
          <p className="text-purple-300 mb-4">오늘 하루도 수고했어!</p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>❤️ 체력: {Math.floor(stats.hp)}</div>
              <div>😊 행복: {Math.floor(stats.happiness)}</div>
              <div>📚 지능: {Math.floor(stats.intelligence)}</div>
              <div>👥 인기: {Math.floor(stats.social)}</div>
              <div>🪙 용돈: {stats.money}원</div>
              <div>🎯 오늘 점수: {dayScore}</div>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-3 mb-4 max-h-32 overflow-y-auto text-left">
            {dayLog.map((log, i) => <div key={i} className="text-xs text-gray-300">{log}</div>)}
          </div>

          <button onClick={nextDay}
            className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-4 font-black text-lg">
            😴 잠자고 내일로! → {day + 1}일차
          </button>
        </div>
      </div>
    );
  }

  /* ───── 게임오버 ───── */
  if (screen === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">😵</div>
          <h2 className="text-3xl font-black text-red-400 mb-2">게임 오버</h2>
          <p className="text-gray-400 mb-4">{dayLog[dayLog.length - 1]}</p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">📅</div><div className="text-xl font-bold">{day}일</div><div className="text-xs text-gray-400">생존</div></div>
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{totalScore + dayScore}</div><div className="text-xs text-gray-400">총점</div></div>
              <div><div className="text-2xl">🏆</div><div className="text-xl font-bold">{earnedAchievements.length}</div><div className="text-xs text-gray-400">업적</div></div>
              <div><div className="text-2xl">📚</div><div className="text-xl font-bold">{Math.floor(stats.intelligence)}</div><div className="text-xs text-gray-400">최종 지능</div></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={startGame} className="flex-1 bg-sky-600 hover:bg-sky-500 rounded-xl p-3 font-bold">🔄 다시!</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 업적 ───── */
  if (screen === "achievements") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-amber-100 text-gray-900 p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-amber-700 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-4">🏆 업적</h2>
          <p className="text-center text-sm text-gray-500 mb-4">{earnedAchievements.length}/{ACHIEVEMENTS.length} 달성</p>

          <div className="space-y-2">
            {ACHIEVEMENTS.map(a => {
              const done = earnedAchievements.includes(a.id);
              return (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl ${done ? "bg-yellow-200 border border-yellow-400" : "bg-white/60"}`}>
                  <div className="text-3xl">{done ? a.emoji : "🔒"}</div>
                  <div>
                    <div className="font-bold text-sm">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.desc}</div>
                  </div>
                  {done && <span className="ml-auto text-green-600 font-bold">✅</span>}
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
