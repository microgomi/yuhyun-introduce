"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 작전 (리모콘 빼앗기 전략) ───── */
interface Tactic {
  id: string;
  name: string;
  emoji: string;
  grab: number;       // 리모콘 빼앗기 게이지 증가
  cooldown: number;
  risk: number;        // 아빠가 눈치챌 확률
  desc: string;
  unlockLevel: number;
  dadReaction: string;
}

const TACTICS: Tactic[] = [
  { id: "sneak", name: "살금살금", emoji: "🐱", grab: 3, cooldown: 500, risk: 0.05, desc: "살금살금 다가가기", unlockLevel: 1, dadReaction: "흠...?" },
  { id: "cute", name: "애교 부리기", emoji: "🥺", grab: 5, cooldown: 800, risk: 0.03, desc: "아빠~ 나 이거 보고 싶어~", unlockLevel: 1, dadReaction: "흠... 안돼" },
  { id: "drink", name: "음료수 갖다주기", emoji: "🥤", grab: 4, cooldown: 1200, risk: 0.02, desc: "아빠 물 가져다 드리면서 틈 노리기", unlockLevel: 1, dadReaction: "오 고마워~" },
  { id: "distract", name: "다른 데 보게 하기", emoji: "👉", grab: 7, cooldown: 1000, risk: 0.1, desc: "아빠! 저기 봐봐!", unlockLevel: 2, dadReaction: "뭐? 어디?" },
  { id: "massage", name: "어깨 주무르기", emoji: "💆", grab: 6, cooldown: 1500, risk: 0.05, desc: "아빠 어깨 주물러서 잠들게 하기", unlockLevel: 2, dadReaction: "오~ 시원하다~" },
  { id: "joke", name: "개그 날리기", emoji: "😂", grab: 5, cooldown: 800, risk: 0.08, desc: "아빠 웃기면서 방심시키기", unlockLevel: 3, dadReaction: "ㅋㅋ 뭐야 그게" },
  { id: "snack", name: "과자 뇌물", emoji: "🍪", grab: 8, cooldown: 2000, risk: 0.05, desc: "과자 드리고 리모콘 슬쩍!", unlockLevel: 3, dadReaction: "오 과자!" },
  { id: "phone", name: "전화 왔다고!", emoji: "📱", grab: 10, cooldown: 2500, risk: 0.15, desc: "아빠 전화 왔어요! (거짓말)", unlockLevel: 4, dadReaction: "뭐? 누구?" },
  { id: "sleepy", name: "잠든 척 유도", emoji: "😴", grab: 12, cooldown: 3000, risk: 0.08, desc: "이불 덮어드리며 잠들게 유도", unlockLevel: 4, dadReaction: "음... 졸리네..." },
  { id: "quickgrab", name: "번개 손!", emoji: "⚡", grab: 15, cooldown: 2000, risk: 0.3, desc: "초고속으로 리모콘 낚아채기!", unlockLevel: 5, dadReaction: "어?! 야!!" },
  { id: "mom", name: "엄마 부르기", emoji: "👩", grab: 18, cooldown: 4000, risk: 0.2, desc: "엄마~ 아빠가 채널 안 돌려줘~", unlockLevel: 6, dadReaction: "야! 이르지 마!" },
  { id: "battle", name: "채널 싸움", emoji: "📺", grab: 8, cooldown: 1000, risk: 0.2, desc: "아빠 옆에서 채널 달라고 조르기", unlockLevel: 5, dadReaction: "안 돼! 축구 봐야 해!" },
  { id: "sad", name: "슬픈 표정", emoji: "😢", grab: 10, cooldown: 2000, risk: 0.05, desc: "눈물 그렁그렁... 아빠 나 싫어?", unlockLevel: 7, dadReaction: "아 아니... 그게 아니라..." },
  { id: "fake", name: "가짜 리모콘", emoji: "🎮", grab: 20, cooldown: 5000, risk: 0.15, desc: "가짜 리모콘 쥐어드리고 진짜 뺏기!", unlockLevel: 8, dadReaction: "잠깐 이거 왜 안 돼?!" },
  { id: "teamwork", name: "형제 협동", emoji: "🤝", grab: 25, cooldown: 6000, risk: 0.25, desc: "동생이랑 협동 작전!", unlockLevel: 9, dadReaction: "너희 둘이 짜고 치는거지?!" },
  { id: "tickle", name: "간지럽히기", emoji: "🤣", grab: 22, cooldown: 3000, risk: 0.35, desc: "아빠 발바닥 간지럽히기!", unlockLevel: 10, dadReaction: "하하하 하지마!!" },
  { id: "ultimate", name: "밥 다 됐어요!", emoji: "🍚", grab: 30, cooldown: 8000, risk: 0.1, desc: "아빠! 밥 먹어요! (리모콘 놓는 틈에!)", unlockLevel: 11, dadReaction: "오 밥이다!" },
  { id: "ninja", name: "닌자 빼앗기", emoji: "🥷", grab: 35, cooldown: 7000, risk: 0.4, desc: "아빠가 화장실 간 사이에!", unlockLevel: 12, dadReaction: "잠깐! 내 리모콘!!" },
];

/* ───── 아빠 상태 ───── */
const DAD_STATES: Record<string, { face: string; label: string }> = {
  relaxed: { face: "😌", label: "편안" },
  watching: { face: "😐", label: "시청 중" },
  suspicious: { face: "🤨", label: "의심 중" },
  alert: { face: "😠", label: "경계 중" },
  angry: { face: "😡", label: "화남!!" },
};

/* ───── 아이템 ───── */
interface Item {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "grabBoost" | "riskReduce" | "coolReduce" | "shield";
  value: number;
}

const ITEMS: Item[] = [
  { id: "socks", name: "고요한 양말", emoji: "🧦", desc: "발소리 줄여 들킬 확률 감소", price: 50, effect: "-10% 위험", effectType: "riskReduce", value: 0.1 },
  { id: "candy", name: "사탕 뇌물", emoji: "🍬", desc: "빼앗기 게이지 증가", price: 80, effect: "+20% 빼앗기", effectType: "grabBoost", value: 0.2 },
  { id: "coffee", name: "아빠 커피", emoji: "☕", desc: "쿨타임 감소", price: 100, effect: "-15% 쿨타임", effectType: "coolReduce", value: 0.15 },
  { id: "excuse", name: "변명 카드", emoji: "🃏", desc: "들켜도 1회 방어", price: 150, effect: "1회 보호", effectType: "shield", value: 1 },
  { id: "slippers", name: "무음 슬리퍼", emoji: "🩴", desc: "들킬 확률 대폭 감소", price: 200, effect: "-25% 위험", effectType: "riskReduce", value: 0.25 },
  { id: "pizza", name: "피자 뇌물", emoji: "🍕", desc: "빼앗기 게이지 대폭 증가", price: 250, effect: "+40% 빼앗기", effectType: "grabBoost", value: 0.4 },
  { id: "speedboost", name: "에너지 음료", emoji: "⚡", desc: "쿨타임 대폭 감소", price: 300, effect: "-30% 쿨타임", effectType: "coolReduce", value: 0.3 },
  { id: "invisible", name: "투명 담요", emoji: "🫥", desc: "들켜도 3회 방어", price: 500, effect: "3회 보호", effectType: "shield", value: 3 },
];

/* ───── TV 프로그램 ───── */
const TV_PROGRAMS = [
  { name: "축구 중계", emoji: "⚽", dadLove: 3 },
  { name: "뉴스", emoji: "📰", dadLove: 2 },
  { name: "낚시 프로", emoji: "🎣", dadLove: 3 },
  { name: "다큐멘터리", emoji: "🎬", dadLove: 2 },
  { name: "야구 중계", emoji: "⚾", dadLove: 3 },
  { name: "골프 중계", emoji: "⛳", dadLove: 2 },
  { name: "드라마 재방", emoji: "📺", dadLove: 1 },
];

type Screen = "main" | "play" | "shop" | "caught" | "victory";

export default function RemoteDadPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(50);
  const [highScore, setHighScore] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  // 플레이 상태
  const [grabGauge, setGrabGauge] = useState(0);     // 리모콘 빼앗기 게이지 (0~100)
  const [dadAlert, setDadAlert] = useState(0);         // 아빠 경계도 (0~100)
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shields, setShields] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [dadReaction, setDadReaction] = useState("");
  const [reactionTimer, setReactionTimer] = useState<NodeJS.Timeout | null>(null);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [tvProgram, setTvProgram] = useState(TV_PROGRAMS[0]);
  const [remotePos, setRemotePos] = useState(50); // 리모콘 위치 (아빠 그립 강도)

  // 보너스 계산
  const grabBoost = ownedItems.reduce((sum, id) => {
    const item = ITEMS.find(i => i.id === id);
    return sum + (item?.effectType === "grabBoost" ? item.value : 0);
  }, 0);
  const riskReduce = ownedItems.reduce((sum, id) => {
    const item = ITEMS.find(i => i.id === id);
    return sum + (item?.effectType === "riskReduce" ? item.value : 0);
  }, 0);
  const coolReduce = ownedItems.reduce((sum, id) => {
    const item = ITEMS.find(i => i.id === id);
    return sum + (item?.effectType === "coolReduce" ? item.value : 0);
  }, 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.4));
    }
  }, [xp, xpNeeded]);

  // 게임 타이머
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (gameActive && timeLeft <= 0) {
      endGame(false, "시간 초과! 리모콘을 못 빼앗았다...");
    }
  }, [gameActive, timeLeft]);

  // 아빠 경계도 서서히 감소
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setDadAlert(a => Math.max(0, a - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 쿨다운 갱신
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = Math.max(0, next[key] - 100);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 리모콘 빼앗기 성공 체크
  useEffect(() => {
    if (gameActive && grabGauge >= 100) {
      endGame(true);
    }
  }, [grabGauge, gameActive]);

  const startGame = useCallback(() => {
    setGrabGauge(0);
    setDadAlert(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(90);
    setCooldowns({});
    setDadReaction("");
    setShakeIntensity(0);
    setFloatTexts([]);
    setGameActive(true);
    setRemotePos(50);
    setTvProgram(TV_PROGRAMS[Math.floor(Math.random() * TV_PROGRAMS.length)]);
    const shieldCount = ownedItems.reduce((sum, id) => {
      const item = ITEMS.find(i => i.id === id);
      return sum + (item?.effectType === "shield" ? item.value : 0);
    }, 0);
    setShields(shieldCount);
    setScreen("play");
  }, [ownedItems]);

  const endGame = useCallback((victory: boolean, msg?: string) => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    const earned = Math.floor(score / 5) + (victory ? 30 : 5);
    setCoins(c => c + earned);
    setTotalCoins(t => t + earned);
    setXp(x => x + Math.floor(score / 3));
    if (score > highScore) setHighScore(score);

    if (victory) {
      setScreen("victory");
    } else {
      setScreen("caught");
    }
  }, [score, highScore]);

  const doTactic = useCallback((tactic: Tactic, e?: React.MouseEvent) => {
    if (!gameActive) return;
    if ((cooldowns[tactic.id] || 0) > 0) return;

    // 들킬 확률 체크 (경계도가 높을수록 위험)
    const actualRisk = Math.max(0, tactic.risk - riskReduce) * (1 + dadAlert / 150);
    if (Math.random() < actualRisk) {
      if (shields > 0) {
        setShields(s => s - 1);
        setDadReaction("🛡️ 변명으로 넘어갔다!");
        if (reactionTimer) clearTimeout(reactionTimer);
        const t = setTimeout(() => setDadReaction(""), 1500);
        setReactionTimer(t);
        setDadAlert(a => Math.min(100, a + 15));
        setCombo(0);
      } else {
        endGame(false);
        return;
      }
    }

    // 성공!
    const grabAmount = Math.floor(tactic.grab * (1 + grabBoost) * (1 + combo * 0.08));
    const scoreAmount = grabAmount * (1 + Math.floor(combo / 3));

    setGrabGauge(g => Math.min(100, g + Math.floor(grabAmount / 2)));
    setDadAlert(a => Math.min(100, a + Math.floor(tactic.risk * 30)));
    setScore(s => s + scoreAmount);
    setCombo(c => {
      const next = c + 1;
      setMaxCombo(m => Math.max(m, next));
      return next;
    });

    // 쿨타임
    const cd = Math.floor(tactic.cooldown * (1 - coolReduce));
    setCooldowns(prev => ({ ...prev, [tactic.id]: cd }));

    // 아빠 반응
    setDadReaction(tactic.dadReaction);
    if (reactionTimer) clearTimeout(reactionTimer);
    const t = setTimeout(() => setDadReaction(""), 1500);
    setReactionTimer(t);

    // 흔들림
    setShakeIntensity(Math.min(grabAmount, 20));
    setTimeout(() => setShakeIntensity(0), 300);

    // 리모콘 흔들기
    setRemotePos(p => Math.max(0, p - Math.floor(grabAmount / 3)));

    // 플로팅 텍스트
    const id = floatId.current++;
    const x = e ? e.clientX : 150 + Math.random() * 100;
    const y = e ? e.clientY : 300 + Math.random() * 50;
    setFloatTexts(prev => [...prev, {
      id, text: `+${scoreAmount} ${tactic.emoji}`, x, y,
      color: combo >= 5 ? "#ff0" : combo >= 3 ? "#f90" : "#0f0",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);

  }, [gameActive, cooldowns, riskReduce, grabBoost, coolReduce, dadAlert, combo, shields, reactionTimer, endGame]);

  // 아빠 얼굴
  const getDadState = () => {
    if (dadAlert >= 85) return DAD_STATES.angry;
    if (dadAlert >= 60) return DAD_STATES.alert;
    if (dadAlert >= 35) return DAD_STATES.suspicious;
    if (dadAlert >= 15) return DAD_STATES.watching;
    return DAD_STATES.relaxed;
  };

  const buyItem = useCallback((itemId: string) => {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item || coins < item.price || ownedItems.includes(itemId)) return;
    setCoins(c => c - item.price);
    setOwnedItems(prev => [...prev, itemId]);
  }, [coins, ownedItems]);

  /* ───── 메인 화면 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-blue-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">📺</div>
            <h1 className="text-3xl font-black mb-1">아빠한테 리모콘 빼앗기</h1>
            <p className="text-blue-300 text-sm">아빠 몰래 리모콘을 빼앗아라!</p>
          </div>

          {/* 상태 */}
          <div className="bg-blue-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-blue-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-blue-900 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-blue-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          {/* 시나리오 설명 */}
          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 text-center">
            <div className="text-4xl mb-2">👨📺🛋️</div>
            <p className="text-sm text-gray-300">아빠가 소파에서 TV를 보고 있다...</p>
            <p className="text-sm text-gray-300">리모콘을 꽉 쥐고 채널을 안 바꿔준다!</p>
            <p className="text-xs text-yellow-300 mt-1">90초 안에 리모콘을 빼앗아라!</p>
          </div>

          {/* 버튼 */}
          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 text-center text-lg font-black">
              📺 리모콘 빼앗기 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 아이템 상점</span>
              <span className="text-xs text-yellow-300 ml-2">작전 도구 구매</span>
            </button>
          </div>

          {/* 해금된 전략 미리보기 */}
          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🎯 사용 가능한 작전 ({TACTICS.filter(t => playerLevel >= t.unlockLevel).length}/{TACTICS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {TACTICS.map(t => (
                <div key={t.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= t.unlockLevel ? "bg-blue-800/50" : "bg-gray-800/50 opacity-40"
                }`} title={t.name}>
                  {playerLevel >= t.unlockLevel ? t.emoji : "🔒"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 화면 ───── */
  if (screen === "play") {
    const dadState = getDadState();
    const unlockedTactics = TACTICS.filter(t => playerLevel >= t.unlockLevel);

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-blue-50 text-gray-900 p-4 relative overflow-hidden select-none"
        style={{ transform: shakeIntensity > 0 ? `translate(${(Math.random() - 0.5) * shakeIntensity}px, ${(Math.random() - 0.5) * shakeIntensity}px)` : "" }}>
        <div className="max-w-md mx-auto">

          {/* 상단 바 */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-bold">⏱️ {timeLeft}초</div>
            <div className="text-sm font-bold">🎯 {score}점</div>
            {shields > 0 && <div className="text-sm">🛡️ x{shields}</div>}
          </div>

          {/* 콤보 */}
          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-lg font-black px-3 py-0.5 rounded-full"
                style={{
                  background: combo >= 10 ? "#2563eb" : combo >= 7 ? "#3b82f6" : "#60a5fa",
                  color: "white",
                }}>
                🔥 {combo} COMBO!
              </span>
            </div>
          )}

          {/* 리모콘 빼앗기 게이지 */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5">
              <span>📺 리모콘 빼앗기 게이지</span>
              <span className={grabGauge >= 80 ? "text-blue-600 font-bold" : ""}>{grabGauge}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all" style={{
                width: `${grabGauge}%`,
                background: grabGauge >= 80 ? "#2563eb" : grabGauge >= 50 ? "#3b82f6" : "#60a5fa",
              }} />
            </div>
            {grabGauge >= 80 && <div className="text-[10px] text-blue-600 text-center">거의 다 빼앗았다!!</div>}
          </div>

          {/* 아빠 경계도 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span>👀 아빠 경계도</span>
              <span className={dadAlert >= 70 ? "text-red-600 font-bold" : ""}>{dadAlert}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all" style={{
                width: `${dadAlert}%`,
                background: dadAlert >= 70 ? "#dc2626" : dadAlert >= 40 ? "#f59e0b" : "#22c55e",
              }} />
            </div>
            {dadAlert >= 70 && <div className="text-[10px] text-red-600 text-center">⚠️ 아빠가 눈치채고 있다!</div>}
          </div>

          {/* 아빠 + TV 장면 */}
          <div className="text-center mb-4 relative">
            <div className="bg-gray-800 rounded-xl p-2 mb-2 inline-block">
              <div className="text-xs text-gray-400">TV: {tvProgram.emoji} {tvProgram.name}</div>
            </div>
            <div className="inline-block relative">
              <div className="flex items-center justify-center gap-2">
                <div className="text-7xl transition-all" style={{
                  transform: shakeIntensity > 0 ? `rotate(${(Math.random() - 0.5) * 10}deg)` : "",
                }}>
                  {dadState.face}
                </div>
                <div className="relative">
                  <div className="text-4xl" style={{
                    transform: `translateX(${-grabGauge / 5}px)`,
                    opacity: 1 - grabGauge / 150,
                    transition: "all 0.3s",
                  }}>🎛️</div>
                  <div className="text-[8px] text-gray-500 text-center">리모콘</div>
                </div>
              </div>
              <div className="text-sm font-bold mt-1" style={{
                color: dadAlert >= 70 ? "#dc2626" : dadAlert >= 40 ? "#f59e0b" : "#666",
              }}>
                {dadState.label}
              </div>
            </div>

            {/* 아빠 반응 말풍선 */}
            {dadReaction && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl px-3 py-1 text-sm font-bold shadow-lg whitespace-nowrap z-10"
                style={{ animation: "popIn 0.3s ease-out" }}>
                {dadReaction}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-white" />
              </div>
            )}
          </div>

          {/* 작전 버튼들 */}
          <div className="grid grid-cols-3 gap-2">
            {unlockedTactics.map(tactic => {
              const onCooldown = (cooldowns[tactic.id] || 0) > 0;
              const cdPercent = onCooldown ? ((cooldowns[tactic.id] || 0) / Math.floor(tactic.cooldown * (1 - coolReduce))) * 100 : 0;

              return (
                <button key={tactic.id}
                  onClick={(e) => doTactic(tactic, e)}
                  disabled={onCooldown}
                  className={`relative p-2 rounded-xl text-center transition-all active:scale-95 ${
                    onCooldown ? "bg-gray-300 opacity-60" : "bg-white hover:bg-blue-50 shadow-md hover:shadow-lg active:shadow-sm"
                  }`}>
                  {onCooldown && (
                    <div className="absolute inset-0 bg-gray-500/30 rounded-xl overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-gray-500/40" style={{ height: `${cdPercent}%` }} />
                    </div>
                  )}
                  <div className="text-2xl">{tactic.emoji}</div>
                  <div className="text-[10px] font-bold">{tactic.name}</div>
                  <div className="text-[8px] text-gray-500">+{Math.floor(tactic.grab * (1 + grabBoost))}</div>
                  {tactic.risk > 0.25 && <div className="text-[8px] text-red-500">⚠️</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 플로팅 텍스트 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{
              left: f.x,
              top: f.y,
              color: f.color,
              textShadow: "0 0 4px rgba(0,0,0,0.5)",
              animation: "floatUp 1s ease-out forwards",
            }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
          @keyframes popIn {
            0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
            100% { opacity: 1; transform: translateX(-50%) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 들켰다! ───── */
  if (screen === "caught") {
    const earned = Math.floor(score / 5) + 5;
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-950 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">😱</div>
          <h2 className="text-3xl font-black mb-2 text-red-400">아빠한테 들켰다!</h2>
          <div className="text-6xl mb-4">😡👊</div>
          <p className="text-gray-400 mb-4">아빠: &ldquo;야! 리모콘 만지지 마! 축구 본다!!&rdquo;</p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl">🎯</div>
                <div className="text-xl font-bold">{score}</div>
                <div className="text-xs text-gray-400">점수</div>
              </div>
              <div>
                <div className="text-2xl">🔥</div>
                <div className="text-xl font-bold">{maxCombo}</div>
                <div className="text-xs text-gray-400">최대 콤보</div>
              </div>
              <div>
                <div className="text-2xl">🪙</div>
                <div className="text-xl font-bold text-yellow-400">+{earned}</div>
                <div className="text-xs text-gray-400">획득 코인</div>
              </div>
              <div>
                <div className="text-2xl">📺</div>
                <div className="text-xl font-bold">{grabGauge}%</div>
                <div className="text-xs text-gray-400">빼앗기 진행도</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={startGame}
              className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-bold">
              📺 다시 도전!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 승리! ───── */
  if (screen === "victory") {
    const earned = Math.floor(score / 5) + 30;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 via-indigo-800 to-blue-950 text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">🎉</div>
          <h2 className="text-3xl font-black mb-2 text-yellow-300">리모콘 빼앗기 성공!</h2>
          <div className="text-6xl mb-2">📺🙌</div>
          <p className="text-blue-200 mb-4">이제 내가 보고 싶은 거 본다!!</p>
          <p className="text-sm text-blue-300 mb-4">아빠: &ldquo;...다 보면 돌려놔라&rdquo;</p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl">🎯</div>
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-xs text-gray-400">점수</div>
              </div>
              <div>
                <div className="text-2xl">🔥</div>
                <div className="text-2xl font-bold">{maxCombo}</div>
                <div className="text-xs text-gray-400">최대 콤보</div>
              </div>
              <div>
                <div className="text-2xl">🪙</div>
                <div className="text-2xl font-bold text-yellow-400">+{earned}</div>
                <div className="text-xs text-gray-400">획득 코인</div>
              </div>
              <div>
                <div className="text-2xl">⏱️</div>
                <div className="text-2xl font-bold">{90 - timeLeft}초</div>
                <div className="text-xs text-gray-400">소요 시간</div>
              </div>
            </div>
          </div>

          {score > highScore && (
            <div className="text-yellow-300 font-bold mb-3 text-lg">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-indigo-700 hover:bg-indigo-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={startGame}
              className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-bold">
              📺 한 번 더!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-blue-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 아이템 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {ITEMS.map(item => {
              const owned = ownedItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"
                }`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                    <div className="text-xs text-yellow-300">{item.effect}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅ 보유</span>
                  ) : (
                    <button onClick={() => buyItem(item.id)}
                      disabled={coins < item.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${
                        coins >= item.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"
                      }`}>
                      🪙 {item.price}
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

  return null;
}
