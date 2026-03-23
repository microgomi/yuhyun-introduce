"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 미니게임 타입 ───── */
type MiniGameType = "tap" | "dodge" | "match" | "jump" | "quiz" | "shooter" | "snake" | "memory";

interface GameApp {
  id: number;
  name: string;
  emoji: string;
  type: MiniGameType;
  quality: number;       // 1~100
  downloads: number;
  rating: number;        // 1~5
  revenue: number;       // 누적 수익
  color1: string;
  color2: string;
  released: boolean;
}

/* ───── 앱 템플릿 ───── */
interface AppTemplate {
  type: MiniGameType;
  name: string;
  emoji: string;
  desc: string;
  devCost: number;
  devTime: number;       // 클릭 수
  unlockLevel: number;
}

const TEMPLATES: AppTemplate[] = [
  { type: "tap", name: "터치 게임", emoji: "👆", desc: "빠르게 터치! 단순한 중독성!", devCost: 0, devTime: 10, unlockLevel: 1 },
  { type: "dodge", name: "피하기 게임", emoji: "🏃", desc: "떨어지는 걸 피해라!", devCost: 20, devTime: 15, unlockLevel: 1 },
  { type: "match", name: "매치 게임", emoji: "🎯", desc: "같은 걸 찾아라!", devCost: 30, devTime: 15, unlockLevel: 2 },
  { type: "jump", name: "점프 게임", emoji: "🦘", desc: "장애물을 뛰어넘어라!", devCost: 40, devTime: 20, unlockLevel: 3 },
  { type: "quiz", name: "퀴즈 게임", emoji: "🧠", desc: "두뇌 풀가동!", devCost: 30, devTime: 15, unlockLevel: 2 },
  { type: "shooter", name: "슈팅 게임", emoji: "🔫", desc: "적을 맞춰라!", devCost: 50, devTime: 20, unlockLevel: 4 },
  { type: "snake", name: "스네이크", emoji: "🐍", desc: "먹고 길어져라!", devCost: 40, devTime: 18, unlockLevel: 3 },
  { type: "memory", name: "기억력 게임", emoji: "🧩", desc: "순서를 기억해!", devCost: 35, devTime: 16, unlockLevel: 2 },
];

const APP_NAMES_PREFIX = ["슈퍼", "메가", "울트라", "터보", "하이퍼", "매직", "크레이지", "미니", "픽셀", "네온"];
const APP_NAMES_SUFFIX = ["런", "탭", "대시", "블라스트", "크래프트", "히어로", "월드", "마스터", "킹", "파이터"];
const APP_COLORS = [
  ["#ef4444", "#dc2626"], ["#f97316", "#ea580c"], ["#fbbf24", "#d97706"],
  ["#22c55e", "#16a34a"], ["#3b82f6", "#2563eb"], ["#8b5cf6", "#7c3aed"],
  ["#ec4899", "#db2777"], ["#06b6d4", "#0891b2"], ["#f43f5e", "#e11d48"],
];

/* ───── 업그레이드 ───── */
interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: "devSpeed" | "quality" | "marketing" | "revenue";
  value: number;
}

const UPGRADES: Upgrade[] = [
  { id: "pc1", name: "게이밍 PC", emoji: "💻", desc: "개발 속도 +20%", price: 50, effect: "devSpeed", value: 20 },
  { id: "course1", name: "코딩 강의", emoji: "📖", desc: "품질 +10", price: 40, effect: "quality", value: 10 },
  { id: "ad1", name: "SNS 광고", emoji: "📱", desc: "다운로드 +30%", price: 60, effect: "marketing", value: 30 },
  { id: "pc2", name: "맥북 프로", emoji: "🖥️", desc: "개발 속도 +40%", price: 150, effect: "devSpeed", value: 40 },
  { id: "course2", name: "앱개발 부트캠프", emoji: "🎓", desc: "품질 +20", price: 120, effect: "quality", value: 20 },
  { id: "ad2", name: "유튜브 광고", emoji: "📺", desc: "다운로드 +60%", price: 200, effect: "marketing", value: 60 },
  { id: "rev1", name: "인앱 결제", emoji: "💰", desc: "수익 +50%", price: 180, effect: "revenue", value: 50 },
  { id: "pc3", name: "서버 팜", emoji: "🏗️", desc: "개발 속도 +60%", price: 300, effect: "devSpeed", value: 60 },
  { id: "course3", name: "AI 코딩", emoji: "🤖", desc: "품질 +30", price: 250, effect: "quality", value: 30 },
  { id: "rev2", name: "구독 모델", emoji: "💎", desc: "수익 +100%", price: 400, effect: "revenue", value: 100 },
];

type Screen = "main" | "develop" | "coding" | "myapps" | "playgame" | "shop" | "appresult";

export default function GameDevPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(20);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [apps, setApps] = useState<GameApp[]>([]);
  const [ownedUpgrades, setOwnedUpgrades] = useState<string[]>([]);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const appId = useRef(0);

  // 개발 중
  const [devTemplate, setDevTemplate] = useState<AppTemplate | null>(null);
  const [devName, setDevName] = useState("");
  const [devProgress, setDevProgress] = useState(0);
  const [devClicks, setDevClicks] = useState(0);
  const [devColors, setDevColors] = useState(APP_COLORS[0]);

  // 미니게임 플레이
  const [playingApp, setPlayingApp] = useState<GameApp | null>(null);

  // 미니게임 상태 (공통)
  const [miniScore, setMiniScore] = useState(0);
  const [miniTimeLeft, setMiniTimeLeft] = useState(15);
  const [miniActive, setMiniActive] = useState(false);
  const miniTimer = useRef<NodeJS.Timeout | null>(null);

  // 터치 게임
  const [tapTargets, setTapTargets] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const tapId = useRef(0);
  const tapSpawn = useRef<NodeJS.Timeout | null>(null);

  // 피하기 게임
  const [dodgePlayerX, setDodgePlayerX] = useState(50);
  const [dodgeObstacles, setDodgeObstacles] = useState<{ id: number; x: number; y: number }[]>([]);
  const dodgeId = useRef(0);
  const dodgeLoop = useRef<NodeJS.Timeout | null>(null);

  // 매치 게임
  const [matchCards, setMatchCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [matchFlipped, setMatchFlipped] = useState<number[]>([]);
  const [matchPairs, setMatchPairs] = useState(0);

  // 점프 게임
  const [jumpY, setJumpY] = useState(0);
  const [jumpObstacles, setJumpObstacles] = useState<{ id: number; x: number }[]>([]);
  const [isJumping, setIsJumping] = useState(false);
  const jumpLoop = useRef<NodeJS.Timeout | null>(null);
  const jumpObsId = useRef(0);

  // 퀴즈 게임
  const [quizQ, setQuizQ] = useState({ q: "", answers: ["", "", "", ""], correct: 0 });
  const [quizIndex, setQuizIndex] = useState(0);

  // 슈팅 게임
  const [shootTargets, setShootTargets] = useState<{ id: number; x: number; y: number; hp: number }[]>([]);
  const shootId = useRef(0);
  const shootSpawn = useRef<NodeJS.Timeout | null>(null);

  // 스네이크
  const [snakeBody, setSnakeBody] = useState<{ x: number; y: number }[]>([{ x: 5, y: 5 }]);
  const [snakeDir, setSnakeDir] = useState<"up" | "down" | "left" | "right">("right");
  const [snakeFood, setSnakeFood] = useState({ x: 8, y: 5 });
  const snakeLoop = useRef<NodeJS.Timeout | null>(null);

  // 기억력 게임
  const [memSequence, setMemSequence] = useState<number[]>([]);
  const [memPlayerSeq, setMemPlayerSeq] = useState<number[]>([]);
  const [memShowing, setMemShowing] = useState(false);
  const [memActiveBtn, setMemActiveBtn] = useState<number | null>(null);
  const [memRound, setMemRound] = useState(1);

  // 보너스
  const devSpeedBonus = ownedUpgrades.reduce((s, id) => s + (UPGRADES.find(u => u.id === id)?.effect === "devSpeed" ? UPGRADES.find(u => u.id === id)!.value : 0), 0);
  const qualityBonus = ownedUpgrades.reduce((s, id) => s + (UPGRADES.find(u => u.id === id)?.effect === "quality" ? UPGRADES.find(u => u.id === id)!.value : 0), 0);
  const marketingBonus = ownedUpgrades.reduce((s, id) => s + (UPGRADES.find(u => u.id === id)?.effect === "marketing" ? UPGRADES.find(u => u.id === id)!.value : 0), 0);
  const revenueBonus = ownedUpgrades.reduce((s, id) => s + (UPGRADES.find(u => u.id === id)?.effect === "revenue" ? UPGRADES.find(u => u.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) { setXp(x => x - xpNeeded); setPlayerLevel(l => l + 1); setXpNeeded(n => Math.floor(n * 1.3)); }
  }, [xp, xpNeeded]);

  // 수익 틱 (앱이 돈 벌기)
  useEffect(() => {
    const interval = setInterval(() => {
      setApps(prev => prev.map(a => {
        if (!a.released || a.downloads <= 0) return a;
        const rev = Math.floor(a.downloads * a.rating * 0.01 * (1 + revenueBonus / 100));
        if (rev > 0) {
          setCoins(c => c + rev);
          setTotalRevenue(t => t + rev);
          return { ...a, revenue: a.revenue + rev, downloads: Math.max(0, a.downloads - Math.floor(a.downloads * 0.05)) };
        }
        return a;
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [apps, revenueBonus]);

  const generateAppName = () => {
    const p = APP_NAMES_PREFIX[Math.floor(Math.random() * APP_NAMES_PREFIX.length)];
    const s = APP_NAMES_SUFFIX[Math.floor(Math.random() * APP_NAMES_SUFFIX.length)];
    return `${p} ${s}`;
  };

  // 개발 시작
  const startDev = (template: AppTemplate) => {
    if (coins < template.devCost) return;
    setCoins(c => c - template.devCost);
    setDevTemplate(template);
    setDevName(generateAppName());
    setDevProgress(0);
    setDevClicks(0);
    setDevColors(APP_COLORS[Math.floor(Math.random() * APP_COLORS.length)]);
    setScreen("coding");
  };

  // 코딩 (클릭)
  const doCode = () => {
    if (!devTemplate) return;
    const needed = Math.max(5, devTemplate.devTime - Math.floor(devSpeedBonus / 10));
    setDevClicks(c => c + 1);
    setDevProgress(p => {
      const next = Math.min(100, p + (100 / needed));
      if (next >= 100) finishDev();
      return next;
    });
  };

  // 개발 완료
  const finishDev = () => {
    if (!devTemplate) return;
    const quality = Math.min(100, 30 + qualityBonus + Math.floor(Math.random() * 30) + playerLevel * 3);
    const downloads = Math.floor((50 + quality * 2 + marketingBonus) * (1 + Math.random() * 0.5));
    const rating = Math.min(5, Math.max(1, Math.floor(quality / 20) + (Math.random() > 0.5 ? 1 : 0)));

    const app: GameApp = {
      id: appId.current++, name: devName, emoji: devTemplate.emoji,
      type: devTemplate.type, quality, downloads, rating, revenue: 0,
      color1: devColors[0], color2: devColors[1], released: true,
    };

    setApps(prev => [app, ...prev]);
    setTotalDownloads(t => t + downloads);
    setXp(x => x + Math.floor(quality / 3));
    setPlayingApp(app);
    setScreen("appresult");
  };

  // ── 미니게임 시작 ──
  const startMiniGame = (app: GameApp) => {
    setPlayingApp(app);
    setMiniScore(0);
    setMiniTimeLeft(15);
    setMiniActive(true);
    setScreen("playgame");

    switch (app.type) {
      case "tap": startTapGame(); break;
      case "dodge": startDodgeGame(); break;
      case "match": startMatchGame(); break;
      case "jump": startJumpGame(); break;
      case "quiz": startQuizGame(); break;
      case "shooter": startShooterGame(); break;
      case "snake": startSnakeGame(); break;
      case "memory": startMemoryGame(); break;
    }
  };

  // 미니게임 타이머
  useEffect(() => {
    if (miniActive && miniTimeLeft > 0 && playingApp?.type !== "match" && playingApp?.type !== "memory") {
      miniTimer.current = setTimeout(() => setMiniTimeLeft(t => t - 1), 1000);
      return () => { if (miniTimer.current) clearTimeout(miniTimer.current); };
    } else if (miniActive && miniTimeLeft <= 0 && playingApp?.type !== "match" && playingApp?.type !== "memory") {
      endMiniGame();
    }
  }, [miniActive, miniTimeLeft, playingApp]);

  const endMiniGame = () => {
    setMiniActive(false);
    if (tapSpawn.current) clearInterval(tapSpawn.current);
    if (dodgeLoop.current) clearInterval(dodgeLoop.current);
    if (jumpLoop.current) clearInterval(jumpLoop.current);
    if (shootSpawn.current) clearInterval(shootSpawn.current);
    if (snakeLoop.current) clearInterval(snakeLoop.current);

    // 점수에 따라 앱 평점/다운로드 증가
    if (playingApp) {
      const bonus = Math.floor(miniScore * 2);
      setApps(prev => prev.map(a => a.id === playingApp.id ? {
        ...a,
        downloads: a.downloads + bonus,
        rating: Math.min(5, a.rating + (miniScore > 20 ? 0.5 : miniScore > 10 ? 0.2 : 0)),
      } : a));
      setTotalDownloads(t => t + bonus);
      setCoins(c => c + Math.floor(miniScore / 2));
      setXp(x => x + miniScore);
    }
  };

  // ══ TAP GAME ══
  const startTapGame = () => {
    setTapTargets([]);
    tapSpawn.current = setInterval(() => {
      const id = tapId.current++;
      setTapTargets(prev => [...prev.slice(-8), { id, x: 10 + Math.random() * 80, y: 10 + Math.random() * 75, size: 30 + Math.random() * 25 }]);
    }, 600);
  };
  const tapHit = (id: number) => {
    setTapTargets(prev => prev.filter(t => t.id !== id));
    setMiniScore(s => s + 1);
  };

  // ══ DODGE GAME ══
  const startDodgeGame = () => {
    setDodgePlayerX(50);
    setDodgeObstacles([]);
    setMiniTimeLeft(20);
    let spawnCount = 0;
    dodgeLoop.current = setInterval(() => {
      spawnCount++;
      // 장애물 생성
      if (spawnCount % 8 === 0) {
        const id = dodgeId.current++;
        setDodgeObstacles(prev => [...prev, { id, x: 10 + Math.random() * 80, y: 0 }]);
      }
      // 이동
      setDodgeObstacles(prev => {
        const updated = prev.map(o => ({ ...o, y: o.y + 3 })).filter(o => o.y < 105);
        // 충돌 체크
        updated.forEach(o => {
          if (o.y > 80 && o.y < 95 && Math.abs(o.x - dodgePlayerX) < 10) {
            setMiniActive(false);
            endMiniGame();
          }
        });
        return updated;
      });
      setMiniScore(s => s + 1);
    }, 50);
  };
  const dodgeMove = (dir: "left" | "right") => {
    setDodgePlayerX(prev => Math.max(5, Math.min(95, prev + (dir === "left" ? -8 : 8))));
  };

  // ══ MATCH GAME ══
  const startMatchGame = () => {
    const emojis = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑"];
    const pairs = emojis.slice(0, 6);
    const cards = [...pairs, ...pairs].sort(() => Math.random() - 0.5).map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false,
    }));
    setMatchCards(cards);
    setMatchFlipped([]);
    setMatchPairs(0);
    setMiniTimeLeft(30);
  };
  const flipCard = (id: number) => {
    if (matchFlipped.length >= 2) return;
    const card = matchCards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...matchFlipped, id];
    setMatchCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    setMatchFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped.map(fid => matchCards.find(c => c.id === fid)!);
      if (a.emoji === b.emoji) {
        setTimeout(() => {
          setMatchCards(prev => prev.map(c => c.id === a.id || c.id === b.id ? { ...c, matched: true } : c));
          setMatchFlipped([]);
          setMiniScore(s => s + 5);
          setMatchPairs(p => {
            if (p + 1 >= 6) { setTimeout(() => endMiniGame(), 500); }
            return p + 1;
          });
        }, 300);
      } else {
        setTimeout(() => {
          setMatchCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setMatchFlipped([]);
        }, 600);
      }
    }
  };

  // ══ JUMP GAME ══
  const startJumpGame = () => {
    setJumpY(0);
    setJumpObstacles([]);
    setIsJumping(false);
    setMiniTimeLeft(20);
    jumpLoop.current = setInterval(() => {
      setJumpObstacles(prev => {
        let updated = prev.map(o => ({ ...o, x: o.x - 4 })).filter(o => o.x > -10);
        if (Math.random() < 0.03) { updated.push({ id: jumpObsId.current++, x: 100 }); }
        return updated;
      });
      setMiniScore(s => s + 1);
    }, 50);
  };
  const doJump = () => {
    if (isJumping) return;
    setIsJumping(true);
    setJumpY(30);
    setTimeout(() => { setJumpY(15); }, 200);
    setTimeout(() => { setJumpY(0); setIsJumping(false); }, 400);
  };

  // ══ QUIZ GAME ══
  const QUIZZES = [
    { q: "1+1=?", answers: ["1", "2", "3", "4"], correct: 1 },
    { q: "태양계 행성 수는?", answers: ["6", "7", "8", "9"], correct: 2 },
    { q: "물의 화학식은?", answers: ["H2O", "CO2", "O2", "NaCl"], correct: 0 },
    { q: "한국의 수도는?", answers: ["부산", "서울", "대구", "인천"], correct: 1 },
    { q: "3×4=?", answers: ["7", "10", "12", "14"], correct: 2 },
    { q: "지구에서 가장 큰 바다는?", answers: ["대서양", "인도양", "태평양", "북극해"], correct: 2 },
    { q: "무지개 색깔은 몇 가지?", answers: ["5", "6", "7", "8"], correct: 2 },
    { q: "100÷5=?", answers: ["15", "20", "25", "30"], correct: 1 },
    { q: "세종대왕이 만든 것은?", answers: ["한자", "한글", "영어", "일본어"], correct: 1 },
    { q: "사람의 뼈는 약 몇 개?", answers: ["106", "206", "306", "406"], correct: 1 },
  ];
  const startQuizGame = () => {
    setQuizIndex(0);
    setQuizQ(QUIZZES[0]);
    setMiniTimeLeft(30);
  };
  const answerQuiz = (idx: number) => {
    if (idx === quizQ.correct) {
      setMiniScore(s => s + 5);
    }
    const next = quizIndex + 1;
    if (next >= QUIZZES.length) { endMiniGame(); return; }
    setQuizIndex(next);
    setQuizQ(QUIZZES[next]);
  };

  // ══ SHOOTER GAME ══
  const startShooterGame = () => {
    setShootTargets([]);
    shootSpawn.current = setInterval(() => {
      const id = shootId.current++;
      setShootTargets(prev => [...prev.slice(-6), { id, x: 10 + Math.random() * 80, y: 10 + Math.random() * 70, hp: 1 }]);
    }, 800);
  };
  const shootHit = (id: number) => {
    setShootTargets(prev => prev.filter(t => t.id !== id));
    setMiniScore(s => s + 2);
  };

  // ══ SNAKE GAME ══
  const startSnakeGame = () => {
    setSnakeBody([{ x: 5, y: 5 }]);
    setSnakeDir("right");
    setSnakeFood({ x: 8, y: 5 });
    setMiniTimeLeft(30);
    snakeLoop.current = setInterval(() => {
      setSnakeBody(prev => {
        const head = prev[0];
        const dirs = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        let d = dirs["right"];
        setSnakeDir(dir => { d = dirs[dir]; return dir; });
        const newHead = { x: (head.x + d.x + 12) % 12, y: (head.y + d.y + 12) % 12 };
        // 먹이 체크
        setSnakeFood(food => {
          if (newHead.x === food.x && newHead.y === food.y) {
            setMiniScore(s => s + 3);
            return { x: Math.floor(Math.random() * 12), y: Math.floor(Math.random() * 12) };
          }
          return food;
        });
        const newBody = [newHead, ...prev];
        // 자기 몸 충돌
        if (prev.some(p => p.x === newHead.x && p.y === newHead.y)) {
          endMiniGame();
          return prev;
        }
        return newBody.slice(0, prev.length + (newHead.x === snakeFood.x && newHead.y === snakeFood.y ? 1 : 0));
      });
    }, 200);
  };

  // ══ MEMORY GAME ══
  const startMemoryGame = () => {
    setMemRound(1);
    setMemPlayerSeq([]);
    setMemShowing(true);
    const seq = [Math.floor(Math.random() * 4)];
    setMemSequence(seq);
    showMemorySequence(seq);
  };
  const showMemorySequence = (seq: number[]) => {
    setMemShowing(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i < seq.length) {
        setMemActiveBtn(seq[i]);
        setTimeout(() => setMemActiveBtn(null), 300);
        i++;
      } else {
        clearInterval(interval);
        setMemShowing(false);
        setMemPlayerSeq([]);
      }
    }, 600);
  };
  const memInput = (n: number) => {
    if (memShowing) return;
    const newSeq = [...memPlayerSeq, n];
    setMemPlayerSeq(newSeq);
    setMemActiveBtn(n);
    setTimeout(() => setMemActiveBtn(null), 150);

    if (newSeq[newSeq.length - 1] !== memSequence[newSeq.length - 1]) {
      endMiniGame();
      return;
    }
    if (newSeq.length === memSequence.length) {
      setMiniScore(s => s + memRound * 2);
      setMemRound(r => r + 1);
      const next = [...memSequence, Math.floor(Math.random() * 4)];
      setMemSequence(next);
      setTimeout(() => showMemorySequence(next), 500);
    }
  };

  const MEM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#fbbf24"];

  const buyUpgrade = (id: string) => {
    const u = UPGRADES.find(up => up.id === id);
    if (!u || coins < u.price || ownedUpgrades.includes(id)) return;
    setCoins(c => c - u.price);
    setOwnedUpgrades(prev => [...prev, id]);
  };

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-violet-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-violet-300 text-sm mb-4 inline-block">← 홈으로</Link>
          <div className="text-center mb-5">
            <div className="text-6xl mb-2">📱</div>
            <h1 className="text-3xl font-black mb-1">게임 개발자</h1>
            <p className="text-violet-300 text-sm">앱을 만들고, 직접 플레이하고, 돈을 벌자!</p>
          </div>

          <div className="bg-violet-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}</span>
              <span className="text-violet-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-violet-900 rounded-full h-2 overflow-hidden">
              <div className="bg-violet-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
              <div>📱 앱 {apps.length}개</div>
              <div>📥 {totalDownloads}</div>
              <div>💰 {totalRevenue}</div>
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setScreen("develop")} className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl p-4 text-center text-lg font-black">💻 새 게임 개발!</button>
            <button onClick={() => setScreen("myapps")} className="w-full bg-blue-700 hover:bg-blue-600 rounded-xl p-3 text-center font-bold">
              📱 내 앱 ({apps.length}) <span className="text-xs text-blue-300">← 여기서 플레이!</span>
            </button>
            <button onClick={() => setScreen("shop")} className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-3 text-center font-bold">🛒 업그레이드</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 개발 (템플릿 선택) ───── */
  if (screen === "develop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-violet-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">💻 어떤 게임을 만들까?</h2>
          <div className="space-y-2">
            {TEMPLATES.map(t => {
              const locked = playerLevel < t.unlockLevel;
              const canAfford = coins >= t.devCost;
              return (
                <button key={t.type} onClick={() => !locked && canAfford && startDev(t)} disabled={locked || !canAfford}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left ${locked ? "bg-gray-800/50 opacity-50" : canAfford ? "bg-black/30 hover:bg-black/50" : "bg-black/20 opacity-60"}`}>
                  <span className="text-3xl">{locked ? "🔒" : t.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.desc}</div>
                    {locked && <div className="text-[10px] text-red-400">Lv.{t.unlockLevel} 필요</div>}
                  </div>
                  <div className="text-xs text-right">{t.devCost > 0 ? <span className="text-yellow-400">🪙{t.devCost}</span> : <span className="text-green-400">무료</span>}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 코딩 ───── */
  if (screen === "coding" && devTemplate) {
    return (
      <div className="min-h-screen bg-gray-950 text-green-400 p-4 font-mono">
        <div className="max-w-md mx-auto text-center">
          <div className="text-sm mb-2 text-gray-500">// {devName} 개발 중...</div>
          <div className="text-4xl mb-3">{devTemplate.emoji}</div>
          <h2 className="text-lg font-bold mb-2 text-green-300">{devName}</h2>

          <div className="bg-gray-900 rounded-xl p-3 mb-3 text-left text-xs">
            <div className="text-gray-500">$ npm create {devName.toLowerCase().replace(/ /g, "-")}</div>
            <div className="text-green-400">Building... {Math.floor(devProgress)}%</div>
            {devProgress > 20 && <div>✓ UI 컴포넌트 생성</div>}
            {devProgress > 40 && <div>✓ 게임 로직 구현</div>}
            {devProgress > 60 && <div>✓ 사운드 추가</div>}
            {devProgress > 80 && <div>✓ 테스트 완료</div>}
            {devProgress >= 100 && <div className="text-yellow-400">★ 빌드 성공!</div>}
          </div>

          <div className="bg-gray-800 rounded-full h-4 overflow-hidden mb-4">
            <div className="h-4 bg-green-500 transition-all rounded-full" style={{ width: `${devProgress}%` }} />
          </div>

          <button onClick={doCode} disabled={devProgress >= 100}
            className="w-full bg-green-700 hover:bg-green-600 active:bg-green-800 active:scale-95 rounded-xl p-5 text-xl font-bold text-white transition-all">
            ⌨️ 코딩하기! ({devClicks})
          </button>
          <div className="text-[10px] text-gray-600 mt-2">클릭해서 코드를 작성하세요!</div>
        </div>
      </div>
    );
  }

  /* ───── 앱 완성 결과 ───── */
  if (screen === "appresult" && playingApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-800 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-3">{playingApp.emoji}</div>
          <h2 className="text-2xl font-black mb-1">🎉 앱 출시 완료!</h2>
          <div className="text-lg font-bold mb-1" style={{ color: playingApp.color1 }}>{playingApp.name}</div>
          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>⭐ 품질: {playingApp.quality}</div>
              <div>📥 다운로드: {playingApp.downloads}</div>
              <div>⭐ 평점: {playingApp.rating.toFixed(1)}</div>
              <div>💰 수익: 자동 발생!</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={() => startMiniGame(playingApp)} className="flex-1 bg-green-600 hover:bg-green-500 rounded-xl p-3 font-bold">🎮 직접 플레이!</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 내 앱 목록 ───── */
  if (screen === "myapps") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-3">📱 내 앱</h2>
          {apps.length === 0 && <div className="text-center text-gray-500 py-8">앱을 만들어보세요!</div>}
          <div className="space-y-2">
            {apps.map(app => (
              <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/30">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `linear-gradient(135deg, ${app.color1}, ${app.color2})` }}>
                  {app.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{app.name}</div>
                  <div className="text-[10px] text-gray-400">📥{app.downloads} ⭐{app.rating.toFixed(1)} 💰{app.revenue}</div>
                </div>
                <button onClick={() => startMiniGame(app)}
                  className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-lg text-xs font-bold">🎮 플레이</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 미니게임 플레이 ───── */
  if (screen === "playgame" && playingApp) {
    const appBg = `linear-gradient(135deg, ${playingApp.color1}22, ${playingApp.color2}22)`;

    return (
      <div className="min-h-screen p-3 relative select-none" style={{ background: appBg, minHeight: "100vh" }}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-2 text-sm">
            <button onClick={() => { endMiniGame(); setScreen("myapps"); }} className="text-gray-600 text-xs">✕ 닫기</button>
            <span className="font-bold" style={{ color: playingApp.color1 }}>{playingApp.name}</span>
            <span className="font-bold">🎯 {miniScore}</span>
          </div>
          {playingApp.type !== "match" && playingApp.type !== "memory" && (
            <div className="text-center text-xs text-gray-500 mb-2">⏱️ {miniTimeLeft}초</div>
          )}

          {/* ═══ TAP ═══ */}
          {playingApp.type === "tap" && (
            <div className="relative bg-white rounded-xl border-2" style={{ height: "60vh", borderColor: playingApp.color1 }}>
              {miniActive && tapTargets.map(t => (
                <button key={t.id} onClick={() => tapHit(t.id)}
                  className="absolute rounded-full active:scale-90 transition-transform"
                  style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.size, height: t.size, backgroundColor: playingApp.color1, transform: "translate(-50%,-50%)" }} />
              ))}
              {!miniActive && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl text-white text-xl font-bold">게임 끝! 🎯{miniScore}</div>}
            </div>
          )}

          {/* ═══ DODGE ═══ */}
          {playingApp.type === "dodge" && (
            <>
              <div className="relative bg-gray-100 rounded-xl border-2 overflow-hidden" style={{ height: "55vh", borderColor: playingApp.color1 }}>
                {dodgeObstacles.map(o => (
                  <div key={o.id} className="absolute w-8 h-4 rounded" style={{ left: `${o.x}%`, top: `${o.y}%`, backgroundColor: playingApp.color1, transform: "translateX(-50%)" }} />
                ))}
                <div className="absolute w-8 h-8 rounded-full bg-blue-500 text-center text-lg" style={{ left: `${dodgePlayerX}%`, bottom: "8%", transform: "translateX(-50%)" }}>🏃</div>
                {!miniActive && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xl font-bold">점수: {miniScore}</div>}
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => dodgeMove("left")} className="flex-1 p-4 rounded-xl text-2xl font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>⬅️</button>
                <button onClick={() => dodgeMove("right")} className="flex-1 p-4 rounded-xl text-2xl font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>➡️</button>
              </div>
            </>
          )}

          {/* ═══ MATCH ═══ */}
          {playingApp.type === "match" && (
            <div className="grid grid-cols-4 gap-2" style={{ minHeight: "50vh" }}>
              {matchCards.map(c => (
                <button key={c.id} onClick={() => flipCard(c.id)}
                  className={`aspect-square rounded-xl text-2xl flex items-center justify-center font-bold transition-all ${
                    c.matched ? "bg-green-200 scale-95" : c.flipped ? "bg-white" : ""
                  }`}
                  style={!c.flipped && !c.matched ? { backgroundColor: playingApp.color1 } : {}}
                  disabled={c.flipped || c.matched}>
                  {c.flipped || c.matched ? c.emoji : "?"}
                </button>
              ))}
              {matchPairs >= 6 && <div className="col-span-4 text-center text-xl font-bold py-4" style={{ color: playingApp.color1 }}>🎉 완성! {miniScore}점!</div>}
            </div>
          )}

          {/* ═══ JUMP ═══ */}
          {playingApp.type === "jump" && (
            <>
              <div className="relative bg-gray-50 rounded-xl border-2 overflow-hidden" style={{ height: "40vh", borderColor: playingApp.color1 }}>
                <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: playingApp.color1 }} />
                {jumpObstacles.map(o => (
                  <div key={o.id} className="absolute bottom-2 w-6 h-8 rounded" style={{ left: `${o.x}%`, backgroundColor: playingApp.color2 }} />
                ))}
                <div className="absolute left-[15%] text-3xl transition-all" style={{ bottom: `${8 + jumpY}%` }}>🏃</div>
                {!miniActive && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xl font-bold">점수: {miniScore}</div>}
              </div>
              <button onClick={doJump} className="w-full mt-3 p-5 rounded-xl text-xl font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>🦘 점프!</button>
            </>
          )}

          {/* ═══ QUIZ ═══ */}
          {playingApp.type === "quiz" && (
            <div className="text-center">
              <div className="bg-white rounded-xl p-4 mb-4 shadow">
                <div className="text-xs text-gray-500 mb-1">{quizIndex + 1}/{QUIZZES.length}</div>
                <div className="text-xl font-bold text-gray-900">{quizQ.q}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quizQ.answers.map((a, i) => (
                  <button key={i} onClick={() => answerQuiz(i)}
                    className="p-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: i === 0 ? "#ef4444" : i === 1 ? "#3b82f6" : i === 2 ? "#22c55e" : "#fbbf24" }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ SHOOTER ═══ */}
          {playingApp.type === "shooter" && (
            <div className="relative bg-gray-900 rounded-xl border-2" style={{ height: "60vh", borderColor: playingApp.color1 }}>
              {miniActive && shootTargets.map(t => (
                <button key={t.id} onClick={() => shootHit(t.id)}
                  className="absolute text-3xl active:scale-75 transition-transform" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)" }}>
                  👾
                </button>
              ))}
              {!miniActive && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xl font-bold rounded-xl">점수: {miniScore}</div>}
            </div>
          )}

          {/* ═══ SNAKE ═══ */}
          {playingApp.type === "snake" && (
            <>
              <div className="grid grid-cols-12 gap-0.5 bg-gray-900 p-1 rounded-xl" style={{ minHeight: "40vh" }}>
                {Array.from({ length: 144 }, (_, i) => {
                  const x = i % 12, y = Math.floor(i / 12);
                  const isSnake = snakeBody.some(s => s.x === x && s.y === y);
                  const isHead = snakeBody[0]?.x === x && snakeBody[0]?.y === y;
                  const isFood = snakeFood.x === x && snakeFood.y === y;
                  return (
                    <div key={i} className="aspect-square rounded-sm" style={{
                      backgroundColor: isHead ? playingApp.color1 : isSnake ? playingApp.color2 : isFood ? "#ef4444" : "#1f2937",
                    }} />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-1 mt-2 max-w-[180px] mx-auto">
                <div />
                <button onClick={() => setSnakeDir("up")} className="p-2 rounded-lg text-lg font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>⬆️</button>
                <div />
                <button onClick={() => setSnakeDir("left")} className="p-2 rounded-lg text-lg font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>⬅️</button>
                <div />
                <button onClick={() => setSnakeDir("right")} className="p-2 rounded-lg text-lg font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>➡️</button>
                <div />
                <button onClick={() => setSnakeDir("down")} className="p-2 rounded-lg text-lg font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>⬇️</button>
                <div />
              </div>
            </>
          )}

          {/* ═══ MEMORY ═══ */}
          {playingApp.type === "memory" && (
            <div className="text-center">
              <div className="text-sm mb-2 font-bold">라운드 {memRound} | {memShowing ? "순서를 기억하세요!" : "순서대로 누르세요!"}</div>
              <div className="grid grid-cols-2 gap-3 max-w-[250px] mx-auto">
                {MEM_COLORS.map((color, i) => (
                  <button key={i} onClick={() => memInput(i)} disabled={memShowing}
                    className="aspect-square rounded-2xl transition-all active:scale-90"
                    style={{
                      backgroundColor: memActiveBtn === i ? color : color + "66",
                      border: `3px solid ${color}`,
                      boxShadow: memActiveBtn === i ? `0 0 20px ${color}` : "none",
                    }} />
                ))}
              </div>
              {!miniActive && <div className="mt-4 text-xl font-bold">게임 끝! 라운드 {memRound - 1} | 🎯{miniScore}</div>}
            </div>
          )}

          {/* 게임 끝 버튼 */}
          {!miniActive && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => setScreen("myapps")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold text-white">📱 내 앱</button>
              <button onClick={() => startMiniGame(playingApp)} className="flex-1 rounded-xl p-3 font-bold text-white" style={{ backgroundColor: playingApp.color1 }}>🔄 다시!</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-gray-300 text-sm mb-3">← 뒤로</button>
          <h2 className="text-xl font-black text-center mb-2">🛒 업그레이드</h2>
          <div className="text-center text-yellow-400 font-bold mb-3">🪙 {coins}</div>
          <div className="space-y-2">
            {UPGRADES.map(u => {
              const owned = ownedUpgrades.includes(u.id);
              return (
                <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <span className="text-3xl">{u.emoji}</span>
                  <div className="flex-1"><div className="font-bold text-sm">{u.name}</div><div className="text-xs text-gray-400">{u.desc}</div></div>
                  {owned ? <span className="text-green-400 font-bold">✅</span> : (
                    <button onClick={() => buyUpgrade(u.id)} disabled={coins < u.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= u.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>🪙{u.price}</button>
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
