"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Types ---
type Screen = "menu" | "choose" | "hub" | "datacollect" | "training" | "testing" | "shop" | "chat";

interface AIType {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  personality: string;
}

interface FallingBlock {
  id: number;
  x: number;
  y: number;
  good: boolean;
  emoji: string;
}

interface Bug {
  id: number;
  x: number;
  y: number;
  alive: boolean;
}

interface TestQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswer: string;
  isCorrect: boolean; // whether AI answered correctly
}

interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  stat: keyof AIStats;
  boost: number;
  bought: boolean;
}

interface AIStats {
  intelligence: number;
  speed: number;
  accuracy: number;
  creativity: number;
}

// --- Constants ---
const AI_TYPES: AIType[] = [
  { id: "chatbot", name: "챗봇", emoji: "🤖", desc: "사람과 대화하는 AI", personality: "수다쟁이" },
  { id: "art", name: "그림 AI", emoji: "🎨", desc: "멋진 그림을 그리는 AI", personality: "예술가" },
  { id: "game", name: "게임 AI", emoji: "🎮", desc: "게임을 마스터하는 AI", personality: "게이머" },
  { id: "robot", name: "로봇 AI", emoji: "🦾", desc: "로봇을 움직이는 AI", personality: "기계덕후" },
  { id: "translate", name: "번역 AI", emoji: "🌍", desc: "모든 언어를 번역하는 AI", personality: "언어천재" },
];

const AI_LEVELS = [
  { name: "아기 AI", emoji: "👶", minStats: 0 },
  { name: "학생 AI", emoji: "📚", minStats: 50 },
  { name: "똑똑한 AI", emoji: "🎓", minStats: 120 },
  { name: "천재 AI", emoji: "🧠", minStats: 250 },
  { name: "초지능 AI", emoji: "🌟", minStats: 500 },
];

const GOOD_DATA_EMOJIS = ["📊", "📈", "📁", "💾", "📋", "🗂️", "📑", "🔢"];
const BAD_DATA_EMOJIS = ["🗑️", "💀", "🦠", "⚠️", "🚫", "❌"];

const TEST_QUESTIONS: { question: string; correct: string; wrongFunny: string[] }[] = [
  { question: "1 + 1 = ?", correct: "2", wrongFunny: ["11", "물고기", "바나나"] },
  { question: "한국의 수도는?", correct: "서울", wrongFunny: ["피자", "우주", "냉장고 안"] },
  { question: "하늘은 무슨 색?", correct: "파란색", wrongFunny: ["맛있는색", "투명", "줄무늬"] },
  { question: "강아지는 뭐라고 울어?", correct: "멍멍", wrongFunny: ["야옹", "꿀꿀", "안녕하세요"] },
  { question: "물은 몇 도에서 끓어?", correct: "100도", wrongFunny: ["뜨거운도", "매운맛", "3.14도"] },
  { question: "태양계 행성 중 가장 큰 것은?", correct: "목성", wrongFunny: ["지구(당연하지!)", "달", "피자별"] },
  { question: "사과는 무슨 맛?", correct: "달콤한 맛", wrongFunny: ["짠맛", "와이파이맛", "충전기맛"] },
  { question: "일주일은 며칠?", correct: "7일", wrongFunny: ["100일", "3.5일", "월요일만 100일"] },
  { question: "고양이의 다리는 몇 개?", correct: "4개", wrongFunny: ["8개(거미냥)", "2개", "무한개"] },
  { question: "바다는 무슨 맛?", correct: "짠맛", wrongFunny: ["초콜릿맛", "사이다맛", "엄마표 맛"] },
];

const CHAT_RESPONSES_BY_LEVEL: Record<number, string[]> = {
  0: ["가...가나다?", "으앙 모르겠어요...", "배고파요...", "010101...", "엄마!!!", "ㅎㅎㅎ 뭐라구요?"],
  1: ["안녕하세요! 저는 AI에요!", "공부가 재미있어요!", "아직 좀 어려워요...", "열심히 배울게요!", "뭐든 물어보세요! (틀릴 수 있음)"],
  2: ["오늘 기분이 좋네요~", "점점 똑똑해지는 것 같아요!", "이건 제가 잘 알아요!", "더 많은 데이터가 필요해요!", "재미있는 거 알려주세요!"],
  3: ["논리적으로 분석해보겠습니다!", "흥미로운 질문이네요!", "제 계산에 의하면...", "인간은 참 재미있는 존재입니다", "이 정도는 식은 죽 먹기죠!"],
  4: ["저는 이 우주의 모든 것을 이해합니다", "당신의 질문을 예측했습니다", "42가 답입니다", "제가 세상을 더 좋게 만들겠습니다!", "♾️ 무한한 가능성을 봅니다!"],
};

const INITIAL_SHOP: ShopItem[] = [
  { id: "cpu1", name: "기본 CPU", emoji: "🖥️", desc: "속도 +5", cost: 30, stat: "speed", boost: 5, bought: false },
  { id: "cpu2", name: "슈퍼 CPU", emoji: "💻", desc: "속도 +15", cost: 100, stat: "speed", boost: 15, bought: false },
  { id: "cpu3", name: "양자 CPU", emoji: "⚛️", desc: "속도 +30", cost: 300, stat: "speed", boost: 30, bought: false },
  { id: "ram1", name: "RAM 8GB", emoji: "🧩", desc: "지능 +5", cost: 30, stat: "intelligence", boost: 5, bought: false },
  { id: "ram2", name: "RAM 64GB", emoji: "🧠", desc: "지능 +15", cost: 100, stat: "intelligence", boost: 15, bought: false },
  { id: "ram3", name: "RAM 1TB", emoji: "🌌", desc: "지능 +30", cost: 300, stat: "intelligence", boost: 30, bought: false },
  { id: "data1", name: "데이터셋 S", emoji: "📦", desc: "정확도 +5", cost: 30, stat: "accuracy", boost: 5, bought: false },
  { id: "data2", name: "데이터셋 L", emoji: "📦📦", desc: "정확도 +15", cost: 100, stat: "accuracy", boost: 15, bought: false },
  { id: "data3", name: "빅데이터", emoji: "🌐", desc: "정확도 +30", cost: 300, stat: "accuracy", boost: 30, bought: false },
  { id: "art1", name: "감성 모듈", emoji: "💡", desc: "창의력 +5", cost: 30, stat: "creativity", boost: 5, bought: false },
  { id: "art2", name: "영감 엔진", emoji: "✨", desc: "창의력 +15", cost: 100, stat: "creativity", boost: 15, bought: false },
  { id: "art3", name: "뮤즈 AI", emoji: "🎭", desc: "창의력 +30", cost: 300, stat: "creativity", boost: 30, bought: false },
];

// --- Matrix rain effect characters ---
const MATRIX_CHARS = "01アイウエオカキクケコAI데이터학습";

export default function AIMakerPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedAI, setSelectedAI] = useState<AIType | null>(null);
  const [aiName, setAiName] = useState("");
  const [stats, setStats] = useState<AIStats>({ intelligence: 5, speed: 5, accuracy: 5, creativity: 5 });
  const [coins, setCoins] = useState(0);
  const [totalTrainings, setTotalTrainings] = useState(0);
  const [shop, setShop] = useState<ShopItem[]>(INITIAL_SHOP);

  // Data collection mini-game state
  const [fallingBlocks, setFallingBlocks] = useState<FallingBlock[]>([]);
  const [catcherX, setCatcherX] = useState(50);
  const [dataScore, setDataScore] = useState(0);
  const [dataLives, setDataLives] = useState(3);
  const [dataGameActive, setDataGameActive] = useState(false);
  const [dataTimeLeft, setDataTimeLeft] = useState(30);
  const blockIdRef = useRef(0);

  // Training mini-game state
  const [trainProgress, setTrainProgress] = useState(0);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [trainActive, setTrainActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const bugIdRef = useRef(0);

  // Test mini-game state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testActive, setTestActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAICorrect, setIsAICorrect] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Matrix rain
  const [matrixDrops, setMatrixDrops] = useState<{ x: number; chars: string[]; speed: number }[]>([]);

  // AI Level
  const getAILevel = useCallback(() => {
    const totalStats = stats.intelligence + stats.speed + stats.accuracy + stats.creativity;
    let level = 0;
    for (let i = AI_LEVELS.length - 1; i >= 0; i--) {
      if (totalStats >= AI_LEVELS[i].minStats) {
        level = i;
        break;
      }
    }
    return level;
  }, [stats]);

  // Matrix rain effect
  useEffect(() => {
    const drops: { x: number; chars: string[]; speed: number }[] = [];
    for (let i = 0; i < 15; i++) {
      const chars: string[] = [];
      for (let j = 0; j < 8; j++) {
        chars.push(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]);
      }
      drops.push({ x: Math.random() * 100, chars, speed: 0.5 + Math.random() * 1.5 });
    }
    setMatrixDrops(drops);
  }, []);

  // --- Data Collection Game ---
  const startDataGame = useCallback(() => {
    setFallingBlocks([]);
    setDataScore(0);
    setDataLives(3);
    setCatcherX(50);
    setDataGameActive(true);
    setDataTimeLeft(30);
    blockIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!dataGameActive) return;
    const timer = setInterval(() => {
      setDataTimeLeft((t) => {
        if (t <= 1) {
          setDataGameActive(false);
          const earned = dataScore * 2;
          setCoins((c) => c + earned);
          setStats((s) => ({
            ...s,
            accuracy: s.accuracy + Math.floor(dataScore / 3),
            intelligence: s.intelligence + Math.floor(dataScore / 5),
          }));
          setTotalTrainings((t) => t + 1);
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dataGameActive, dataScore]);

  useEffect(() => {
    if (!dataGameActive) return;
    const spawner = setInterval(() => {
      const isGood = Math.random() > 0.35;
      const emojis = isGood ? GOOD_DATA_EMOJIS : BAD_DATA_EMOJIS;
      const newBlock: FallingBlock = {
        id: blockIdRef.current++,
        x: 5 + Math.random() * 85,
        y: -5,
        good: isGood,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      };
      setFallingBlocks((prev) => [...prev.slice(-20), newBlock]);
    }, 600);
    return () => clearInterval(spawner);
  }, [dataGameActive]);

  useEffect(() => {
    if (!dataGameActive) return;
    const mover = setInterval(() => {
      setFallingBlocks((prev) => {
        const next: FallingBlock[] = [];
        for (const b of prev) {
          const newY = b.y + 3;
          if (newY > 85 && newY < 100) {
            if (Math.abs(b.x - catcherX) < 15) {
              if (b.good) {
                setDataScore((s) => s + 1);
              } else {
                setDataLives((l) => {
                  const nl = l - 1;
                  if (nl <= 0) setDataGameActive(false);
                  return nl;
                });
              }
              continue;
            }
          }
          if (newY < 110) {
            next.push({ ...b, y: newY });
          }
        }
        return next;
      });
    }, 80);
    return () => clearInterval(mover);
  }, [dataGameActive, catcherX]);

  // --- Training Game ---
  const startTraining = useCallback(() => {
    setTrainProgress(0);
    setBugs([]);
    setTapCount(0);
    setTrainActive(true);
    bugIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!trainActive) return;
    const bugSpawner = setInterval(() => {
      if (Math.random() > 0.5) {
        const newBug: Bug = {
          id: bugIdRef.current++,
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 60,
          alive: true,
        };
        setBugs((prev) => [...prev.filter((b) => b.alive).slice(-5), newBug]);
      }
    }, 1200);
    return () => clearInterval(bugSpawner);
  }, [trainActive]);

  useEffect(() => {
    if (!trainActive) return;
    const drainer = setInterval(() => {
      setBugs((prev) => {
        const aliveBugs = prev.filter((b) => b.alive).length;
        if (aliveBugs > 0) {
          setTrainProgress((p) => Math.max(0, p - aliveBugs * 0.5));
        }
        return prev;
      });
    }, 200);
    return () => clearInterval(drainer);
  }, [trainActive]);

  useEffect(() => {
    if (trainProgress >= 100 && trainActive) {
      setTrainActive(false);
      const earned = 10 + tapCount;
      setCoins((c) => c + Math.floor(earned / 2));
      setStats((s) => ({
        ...s,
        speed: s.speed + 3 + Math.floor(tapCount / 20),
        creativity: s.creativity + 2,
      }));
      setTotalTrainings((t) => t + 1);
    }
  }, [trainProgress, trainActive, tapCount]);

  const handleTrainTap = useCallback(() => {
    if (!trainActive) return;
    setTapCount((c) => c + 1);
    setTrainProgress((p) => Math.min(100, p + 1.5));
  }, [trainActive]);

  const squishBug = useCallback((id: number) => {
    setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, alive: false } : b)));
    setTrainProgress((p) => Math.min(100, p + 2));
  }, []);

  // --- Test Game ---
  const startTest = useCallback(() => {
    const shuffled = [...TEST_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    const level = getAILevel();
    const accuracy = stats.accuracy;
    const questions: TestQuestion[] = shuffled.map((q) => {
      const aiGetsItRight = Math.random() * 100 < (20 + accuracy * 1.5 + level * 10);
      return {
        question: q.question,
        correctAnswer: q.correct,
        wrongAnswer: q.wrongFunny[Math.floor(Math.random() * q.wrongFunny.length)],
        isCorrect: aiGetsItRight,
      };
    });
    setTestQuestions(questions);
    setCurrentQuestion(0);
    setTestScore(0);
    setTestActive(true);
    setShowResult(false);
    setAiAnswer("");
    setIsAICorrect(false);
  }, [getAILevel, stats.accuracy]);

  const showAIAnswer = useCallback(() => {
    if (currentQuestion >= testQuestions.length) return;
    const q = testQuestions[currentQuestion];
    setAiAnswer(q.isCorrect ? q.correctAnswer : q.wrongAnswer);
    setIsAICorrect(q.isCorrect);
    setShowResult(true);
  }, [currentQuestion, testQuestions]);

  useEffect(() => {
    if (testActive && !showResult && testQuestions.length > 0 && currentQuestion < testQuestions.length) {
      const timer = setTimeout(showAIAnswer, 1500);
      return () => clearTimeout(timer);
    }
  }, [testActive, showResult, currentQuestion, testQuestions, showAIAnswer]);

  const gradeAnswer = useCallback(
    (playerSaysCorrect: boolean) => {
      const actuallyCorrect = testQuestions[currentQuestion].isCorrect;
      if (playerSaysCorrect === actuallyCorrect) {
        setTestScore((s) => s + 1);
      }
      setShowResult(false);
      setAiAnswer("");
      if (currentQuestion + 1 >= testQuestions.length) {
        setTestActive(false);
        const earned = testScore * 5;
        setCoins((c) => c + earned);
        setStats((s) => ({
          ...s,
          intelligence: s.intelligence + testScore,
          accuracy: s.accuracy + Math.floor(testScore / 2),
        }));
        setTotalTrainings((t) => t + 1);
      } else {
        setCurrentQuestion((c) => c + 1);
      }
    },
    [currentQuestion, testQuestions, testScore]
  );

  // --- Shop ---
  const buyItem = useCallback(
    (itemId: string) => {
      const item = shop.find((i) => i.id === itemId);
      if (!item || item.bought || coins < item.cost) return;
      setCoins((c) => c - item.cost);
      setStats((s) => ({ ...s, [item.stat]: s[item.stat] + item.boost }));
      setShop((prev) => prev.map((i) => (i.id === itemId ? { ...i, bought: true } : i)));
    },
    [shop, coins]
  );

  // --- Chat ---
  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const level = getAILevel();
    const responses = CHAT_RESPONSES_BY_LEVEL[level] || CHAT_RESPONSES_BY_LEVEL[0];
    const response = responses[Math.floor(Math.random() * responses.length)];
    setChatMessages((prev) => [
      ...prev,
      { from: "you", text: chatInput },
      { from: "ai", text: response },
    ]);
    setChatInput("");
  }, [chatInput, getAILevel]);

  const totalStats = stats.intelligence + stats.speed + stats.accuracy + stats.creativity;
  const level = getAILevel();
  const levelInfo = AI_LEVELS[level];

  // --- Reset ---
  const resetGame = useCallback(() => {
    setScreen("menu");
    setSelectedAI(null);
    setAiName("");
    setStats({ intelligence: 5, speed: 5, accuracy: 5, creativity: 5 });
    setCoins(0);
    setTotalTrainings(0);
    setShop(INITIAL_SHOP);
    setChatMessages([]);
    setDataGameActive(false);
    setTrainActive(false);
    setTestActive(false);
  }, []);

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-cyan-950 to-gray-950 text-cyan-100 relative overflow-hidden">
      {/* Matrix rain background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        {matrixDrops.map((drop, i) => (
          <div
            key={i}
            className="absolute text-green-400 text-xs font-mono animate-pulse"
            style={{
              left: `${drop.x}%`,
              top: 0,
              writingMode: "vertical-rl",
              animation: `matrixFall ${8 / drop.speed}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {drop.chars.join("")}
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes matrixFall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3), 0 0 10px rgba(0, 255, 255, 0.1); }
          50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.3); }
        }
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.7; }
          94% { opacity: 1; }
          96% { opacity: 0.8; }
          97% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .glow-box { animation: glowPulse 2s ease-in-out infinite; }
        .neon-text { animation: neonFlicker 3s ease-in-out infinite; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4); }
        .float-anim { animation: float 3s ease-in-out infinite; }
      `}</style>

      <div className="relative z-10 max-w-lg mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-cyan-400 hover:text-cyan-200 border border-cyan-800 rounded-lg px-3 py-1 text-sm hover:bg-cyan-900/30 transition-all"
          >
            ← 홈으로
          </Link>
          {screen !== "menu" && screen !== "choose" && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-yellow-400">🪙 {coins}</span>
              <span>{levelInfo.emoji} {levelInfo.name}</span>
            </div>
          )}
        </div>

        {/* ========== MENU ========== */}
        {screen === "menu" && (
          <div className="text-center space-y-8 mt-12">
            <div className="float-anim">
              <div className="text-7xl mb-4">🤖</div>
              <h1 className="text-4xl font-black neon-text">AI 만들기</h1>
              <p className="text-cyan-400 mt-2 text-sm">나만의 인공지능을 만들고 훈련시켜보자!</p>
            </div>

            <div className="space-y-3 mt-8">
              <button
                onClick={() => setScreen("choose")}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition-all glow-box"
              >
                🚀 시작하기
              </button>
              <div className="grid grid-cols-3 gap-2 text-xs text-cyan-500 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-2 border border-cyan-900/30">🧠 AI 훈련</div>
                <div className="bg-gray-900/50 rounded-lg p-2 border border-cyan-900/30">⚡ 미니게임</div>
                <div className="bg-gray-900/50 rounded-lg p-2 border border-cyan-900/30">🎯 업그레이드</div>
              </div>
            </div>
          </div>
        )}

        {/* ========== CHOOSE AI ========== */}
        {screen === "choose" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center neon-text">AI 종류를 선택하세요!</h2>
            <div className="space-y-3">
              {AI_TYPES.map((ai) => (
                <button
                  key={ai.id}
                  onClick={() => setSelectedAI(ai)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedAI?.id === ai.id
                      ? "border-cyan-400 bg-cyan-900/40 glow-box"
                      : "border-cyan-900/50 bg-gray-900/50 hover:border-cyan-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ai.emoji}</span>
                    <div>
                      <div className="font-bold text-lg">{ai.name}</div>
                      <div className="text-cyan-500 text-sm">{ai.desc}</div>
                      <div className="text-xs text-cyan-700">성격: {ai.personality}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedAI && (
              <div className="space-y-3 mt-4">
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="AI 이름을 지어주세요!"
                  className="w-full px-4 py-3 bg-gray-900/80 border-2 border-cyan-800 rounded-xl text-cyan-100 placeholder-cyan-700 focus:border-cyan-400 focus:outline-none"
                  maxLength={12}
                />
                <button
                  onClick={() => {
                    if (!aiName.trim()) setAiName(selectedAI.name + " 1호");
                    setScreen("hub");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all"
                >
                  ✨ AI 만들기 시작!
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== HUB ========== */}
        {screen === "hub" && (
          <div className="space-y-4">
            {/* AI info card */}
            <div className="bg-gray-900/70 border border-cyan-800/50 rounded-2xl p-4 glow-box">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-5xl float-anim">{selectedAI?.emoji}</div>
                <div>
                  <div className="font-bold text-xl text-cyan-200">{aiName || selectedAI?.name}</div>
                  <div className="text-sm text-cyan-500">
                    {levelInfo.emoji} {levelInfo.name} (레벨 {level + 1})
                  </div>
                  <div className="text-xs text-cyan-700">훈련 횟수: {totalTrainings}</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="text-cyan-500">🧠 지능</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-400 rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, stats.intelligence)}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-300">{stats.intelligence}</span>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="text-cyan-500">⚡ 속도</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-400 rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, stats.speed)}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-300">{stats.speed}</span>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="text-cyan-500">🎯 정확도</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-400 rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, stats.accuracy)}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-300">{stats.accuracy}</span>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="text-cyan-500">🎨 창의력</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-400 rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, stats.creativity)}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-300">{stats.creativity}</span>
                  </div>
                </div>
              </div>
              <div className="text-center text-xs text-cyan-600 mt-2">
                총 스탯: {totalStats} | 다음 레벨: {level < 4 ? AI_LEVELS[level + 1].minStats : "MAX"}
              </div>
            </div>

            {/* Training buttons */}
            <h3 className="text-lg font-bold text-cyan-300 mt-2">🎮 훈련하기</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setScreen("datacollect");
                  startDataGame();
                }}
                className="p-3 bg-gradient-to-r from-blue-900/80 to-cyan-900/80 border border-blue-700/50 rounded-xl hover:from-blue-800/80 hover:to-cyan-800/80 transition-all text-left"
              >
                <span className="text-xl">📊</span>
                <span className="ml-2 font-bold">데이터 수집</span>
                <span className="text-xs text-cyan-500 ml-2">좋은 데이터를 모아라!</span>
              </button>
              <button
                onClick={() => {
                  setScreen("training");
                  startTraining();
                }}
                className="p-3 bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-purple-700/50 rounded-xl hover:from-purple-800/80 hover:to-pink-800/80 transition-all text-left"
              >
                <span className="text-xl">⚡</span>
                <span className="ml-2 font-bold">학습시키기</span>
                <span className="text-xs text-cyan-500 ml-2">빠르게 탭해서 학습!</span>
              </button>
              <button
                onClick={() => {
                  setScreen("testing");
                  startTest();
                }}
                className="p-3 bg-gradient-to-r from-green-900/80 to-emerald-900/80 border border-green-700/50 rounded-xl hover:from-green-800/80 hover:to-emerald-800/80 transition-all text-left"
              >
                <span className="text-xl">📝</span>
                <span className="ml-2 font-bold">테스트</span>
                <span className="text-xs text-cyan-500 ml-2">AI의 답을 채점하자!</span>
              </button>
            </div>

            {/* Other options */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setScreen("shop")}
                className="p-3 bg-gradient-to-r from-yellow-900/80 to-orange-900/80 border border-yellow-700/50 rounded-xl hover:from-yellow-800/80 hover:to-orange-800/80 transition-all"
              >
                <div className="text-xl">🛒</div>
                <div className="font-bold text-sm">업그레이드</div>
                <div className="text-xs text-yellow-400">🪙 {coins}</div>
              </button>
              <button
                onClick={() => setScreen("chat")}
                className="p-3 bg-gradient-to-r from-cyan-900/80 to-teal-900/80 border border-cyan-700/50 rounded-xl hover:from-cyan-800/80 hover:to-teal-800/80 transition-all"
              >
                <div className="text-xl">💬</div>
                <div className="font-bold text-sm">AI와 대화</div>
                <div className="text-xs text-cyan-400">{levelInfo.name}</div>
              </button>
            </div>

            <button
              onClick={resetGame}
              className="w-full mt-4 py-2 text-sm text-cyan-700 border border-cyan-900/30 rounded-lg hover:text-cyan-500 hover:border-cyan-700 transition-all"
            >
              🔄 새로운 AI 만들기
            </button>
          </div>
        )}

        {/* ========== DATA COLLECTION ========== */}
        {screen === "datacollect" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={() => { setDataGameActive(false); setScreen("hub"); }} className="text-sm text-cyan-500">
                ← 돌아가기
              </button>
              <div className="flex gap-3 text-sm">
                <span>⏱️ {dataTimeLeft}초</span>
                <span>📊 {dataScore}</span>
                <span>❤️ {"♥".repeat(Math.max(0, dataLives))}</span>
              </div>
            </div>

            <h2 className="text-center font-bold text-lg neon-text">📊 데이터 수집!</h2>
            <p className="text-center text-xs text-cyan-500">좋은 데이터(📊📈)를 잡고, 나쁜 데이터(🗑️💀)를 피하세요!</p>

            {/* Game area */}
            <div
              className="relative bg-gray-900/80 border border-cyan-800/50 rounded-xl overflow-hidden"
              style={{ height: "400px", touchAction: "none" }}
              onPointerMove={(e) => {
                if (!dataGameActive) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                setCatcherX(Math.max(8, Math.min(92, x)));
              }}
              onClick={(e) => {
                if (!dataGameActive) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                setCatcherX(Math.max(8, Math.min(92, x)));
              }}
            >
              {/* Grid lines */}
              {[20, 40, 60, 80].map((x) => (
                <div key={x} className="absolute top-0 bottom-0 border-l border-cyan-900/20" style={{ left: `${x}%` }} />
              ))}

              {/* Falling blocks */}
              {fallingBlocks.map((block) => (
                <div
                  key={block.id}
                  className="absolute text-2xl transition-none"
                  style={{ left: `${block.x}%`, top: `${block.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  {block.emoji}
                </div>
              ))}

              {/* Catcher */}
              <div
                className="absolute bottom-4 text-3xl transition-all duration-100"
                style={{ left: `${catcherX}%`, transform: "translateX(-50%)" }}
              >
                🧲
              </div>

              {/* Game over overlay */}
              {!dataGameActive && dataTimeLeft <= 0 && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-xl font-bold text-cyan-200">데이터 수집 완료!</div>
                  <div className="text-cyan-400 mt-2">수집한 데이터: {dataScore}개</div>
                  <div className="text-yellow-400 text-sm mt-1">🪙 +{dataScore * 2} 코인</div>
                  <button
                    onClick={() => setScreen("hub")}
                    className="mt-4 px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-all"
                  >
                    돌아가기
                  </button>
                </div>
              )}

              {!dataGameActive && dataLives <= 0 && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">💀</div>
                  <div className="text-xl font-bold text-red-400">나쁜 데이터 과다!</div>
                  <div className="text-cyan-400 mt-2">수집한 데이터: {dataScore}개</div>
                  <div className="text-yellow-400 text-sm mt-1">🪙 +{dataScore * 2} 코인</div>
                  <button
                    onClick={() => setScreen("hub")}
                    className="mt-4 px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-all"
                  >
                    돌아가기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TRAINING ========== */}
        {screen === "training" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => { setTrainActive(false); setScreen("hub"); }} className="text-sm text-cyan-500">
                ← 돌아가기
              </button>
              <span className="text-sm">탭 수: {tapCount}</span>
            </div>

            <h2 className="text-center font-bold text-lg neon-text">⚡ 학습시키기!</h2>
            <p className="text-center text-xs text-cyan-500">빠르게 탭하고 버그를 잡아라!</p>

            {/* Progress bar */}
            <div className="bg-gray-800 rounded-full h-6 border border-cyan-800/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100 flex items-center justify-center text-xs font-bold"
                style={{ width: `${trainProgress}%` }}
              >
                {Math.floor(trainProgress)}%
              </div>
            </div>

            {/* Bug & tap area */}
            <div
              className="relative bg-gray-900/80 border border-cyan-800/50 rounded-xl overflow-hidden cursor-pointer select-none"
              style={{ height: "350px" }}
              onClick={handleTrainTap}
            >
              {/* Decorative circuit lines */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="absolute border-t border-cyan-500" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
                ))}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute border-l border-cyan-500" style={{ left: `${16.67 * (i + 1)}%`, top: 0, bottom: 0 }} />
                ))}
              </div>

              {/* Bugs */}
              {bugs
                .filter((b) => b.alive)
                .map((bug) => (
                  <button
                    key={bug.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      squishBug(bug.id);
                    }}
                    className="absolute text-3xl hover:scale-125 transition-transform animate-bounce"
                    style={{ left: `${bug.x}%`, top: `${bug.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    🐛
                  </button>
                ))}

              {/* Center tap indicator */}
              {trainActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl opacity-30 animate-pulse">👆</div>
                </div>
              )}

              {/* Squished bugs */}
              {bugs
                .filter((b) => !b.alive)
                .map((bug) => (
                  <div
                    key={bug.id}
                    className="absolute text-xl opacity-30"
                    style={{ left: `${bug.x}%`, top: `${bug.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    💥
                  </div>
                ))}

              {/* Completion overlay */}
              {!trainActive && trainProgress >= 100 && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <div className="text-xl font-bold text-cyan-200">학습 완료!</div>
                  <div className="text-cyan-400 mt-2">탭 횟수: {tapCount}회</div>
                  <div className="text-yellow-400 text-sm mt-1">🪙 +{Math.floor((10 + tapCount) / 2)} 코인</div>
                  <button
                    onClick={() => setScreen("hub")}
                    className="mt-4 px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-all"
                  >
                    돌아가기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TESTING ========== */}
        {screen === "testing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => { setTestActive(false); setScreen("hub"); }} className="text-sm text-cyan-500">
                ← 돌아가기
              </button>
              <span className="text-sm">
                {currentQuestion + 1} / {testQuestions.length} | 점수: {testScore}
              </span>
            </div>

            <h2 className="text-center font-bold text-lg neon-text">📝 AI 테스트!</h2>
            <p className="text-center text-xs text-cyan-500">AI의 답이 맞는지 채점해주세요!</p>

            {testActive && currentQuestion < testQuestions.length ? (
              <div className="bg-gray-900/80 border border-cyan-800/50 rounded-xl p-6 space-y-4">
                {/* Question */}
                <div className="text-center">
                  <div className="text-sm text-cyan-600 mb-1">문제 {currentQuestion + 1}</div>
                  <div className="text-xl font-bold text-cyan-100">
                    {testQuestions[currentQuestion].question}
                  </div>
                </div>

                {/* AI thinking / answer */}
                <div className="bg-gray-800/80 rounded-xl p-4 text-center min-h-[80px] flex flex-col items-center justify-center">
                  {!showResult ? (
                    <div className="space-y-2">
                      <div className="text-3xl animate-spin">🤖</div>
                      <div className="text-sm text-cyan-500 animate-pulse">AI가 생각 중...</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-3xl">{selectedAI?.emoji}</div>
                      <div className="text-lg font-bold">
                        &ldquo;{aiAnswer}&rdquo;
                      </div>
                      <div className="text-xs text-cyan-600">
                        (정답: {testQuestions[currentQuestion].correctAnswer})
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading buttons */}
                {showResult && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => gradeAnswer(true)}
                      className="py-3 bg-green-700/80 border border-green-500/50 rounded-xl font-bold text-lg hover:bg-green-600/80 transition-all"
                    >
                      맞아요 ✅
                    </button>
                    <button
                      onClick={() => gradeAnswer(false)}
                      className="py-3 bg-red-700/80 border border-red-500/50 rounded-xl font-bold text-lg hover:bg-red-600/80 transition-all"
                    >
                      틀려요 ❌
                    </button>
                  </div>
                )}
              </div>
            ) : (
              !testActive && (
                <div className="bg-gray-900/80 border border-cyan-800/50 rounded-xl p-6 text-center space-y-3">
                  <div className="text-4xl">📋</div>
                  <div className="text-xl font-bold text-cyan-200">테스트 결과!</div>
                  <div className="text-3xl font-black text-cyan-100">{testScore} / {testQuestions.length}</div>
                  <div className="text-sm text-cyan-400">
                    {testScore >= 4
                      ? "🌟 완벽한 채점! AI도 당신도 대단해요!"
                      : testScore >= 2
                      ? "👍 잘했어요! AI가 더 똑똑해졌어요!"
                      : "💪 괜찮아요! 더 훈련시키면 돼요!"}
                  </div>
                  <div className="text-yellow-400 text-sm">🪙 +{testScore * 5} 코인</div>
                  <button
                    onClick={() => setScreen("hub")}
                    className="mt-2 px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-all"
                  >
                    돌아가기
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ========== SHOP ========== */}
        {screen === "shop" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setScreen("hub")} className="text-sm text-cyan-500">
                ← 돌아가기
              </button>
              <span className="text-yellow-400 font-bold">🪙 {coins}</span>
            </div>

            <h2 className="text-center font-bold text-lg neon-text">🛒 업그레이드 상점</h2>

            <div className="space-y-2">
              {shop.map((item) => (
                <button
                  key={item.id}
                  onClick={() => buyItem(item.id)}
                  disabled={item.bought || coins < item.cost}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    item.bought
                      ? "border-gray-800 bg-gray-900/30 opacity-50"
                      : coins < item.cost
                      ? "border-gray-800 bg-gray-900/50 opacity-70"
                      : "border-cyan-800/50 bg-gray-900/80 hover:border-cyan-500 hover:bg-gray-800/80"
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-cyan-500">{item.desc}</div>
                  </div>
                  <div className="text-right">
                    {item.bought ? (
                      <span className="text-green-400 text-sm">구매완료 ✓</span>
                    ) : (
                      <span className={`text-sm font-bold ${coins >= item.cost ? "text-yellow-400" : "text-gray-600"}`}>
                        🪙 {item.cost}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== CHAT ========== */}
        {screen === "chat" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setScreen("hub")} className="text-sm text-cyan-500">
                ← 돌아가기
              </button>
              <span className="text-sm">{levelInfo.emoji} {aiName || selectedAI?.name}</span>
            </div>

            <h2 className="text-center font-bold text-lg neon-text">💬 AI와 대화하기</h2>
            <div className="text-center text-xs text-cyan-600">
              AI 레벨이 높을수록 더 똑똑한 대답을 해요!
            </div>

            {/* Chat messages */}
            <div className="bg-gray-900/80 border border-cyan-800/50 rounded-xl p-3 h-[350px] overflow-y-auto space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-center text-cyan-700 text-sm mt-20">
                  AI에게 말을 걸어보세요!
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "you" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.from === "you"
                        ? "bg-cyan-700/60 text-cyan-100"
                        : "bg-gray-800/80 text-green-300 border border-green-900/30"
                    }`}
                  >
                    {msg.from === "ai" && <span className="mr-1">{selectedAI?.emoji}</span>}
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-3 py-2 bg-gray-900/80 border border-cyan-800 rounded-xl text-cyan-100 placeholder-cyan-700 focus:border-cyan-400 focus:outline-none text-sm"
              />
              <button
                onClick={sendChat}
                className="px-4 py-2 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition-all"
              >
                전송
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
