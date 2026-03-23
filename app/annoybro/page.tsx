"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 괴롭히기 액션 ───── */
interface Action {
  id: string;
  name: string;
  emoji: string;
  annoy: number;      // 짜증 증가량
  cooldown: number;    // 쿨타임 (ms)
  risk: number;        // 들킬 확률 (0~1)
  desc: string;
  unlockLevel: number;
  reaction: string;    // 형 반응
}

const ACTIONS: Action[] = [
  { id: "poke", name: "찌르기", emoji: "👉", annoy: 3, cooldown: 500, risk: 0.05, desc: "형 팔 찌르기", unlockLevel: 1, reaction: "야! 뭐야!" },
  { id: "mimic", name: "따라하기", emoji: "🗣️", annoy: 5, cooldown: 1000, risk: 0.08, desc: "형이 하는 말 따라하기", unlockLevel: 1, reaction: "따라하지 마!!" },
  { id: "stare", name: "쳐다보기", emoji: "👀", annoy: 2, cooldown: 300, risk: 0.02, desc: "가만히 쳐다보기", unlockLevel: 1, reaction: "왜 쳐다봐..." },
  { id: "sing", name: "노래부르기", emoji: "🎤", annoy: 4, cooldown: 800, risk: 0.05, desc: "시끄럽게 노래하기", unlockLevel: 2, reaction: "시끄러워!!" },
  { id: "tickle", name: "간지럽히기", emoji: "🤣", annoy: 8, cooldown: 1500, risk: 0.15, desc: "형 옆구리 간지럽히기", unlockLevel: 2, reaction: "하하하 하지마!!" },
  { id: "remote", name: "리모컨 뺏기", emoji: "📺", annoy: 10, cooldown: 2000, risk: 0.2, desc: "TV 리모컨 뺏어서 채널 돌리기", unlockLevel: 3, reaction: "내 리모컨 내놔!!" },
  { id: "snack", name: "과자 훔치기", emoji: "🍪", annoy: 12, cooldown: 3000, risk: 0.25, desc: "형 과자 몰래 먹기", unlockLevel: 3, reaction: "내 과자!!!" },
  { id: "phone", name: "핸드폰 만지기", emoji: "📱", annoy: 15, cooldown: 2500, risk: 0.3, desc: "형 핸드폰 만지기", unlockLevel: 4, reaction: "핸드폰 내려놔!!" },
  { id: "pillow", name: "베개 던지기", emoji: "🛏️", annoy: 18, cooldown: 2000, risk: 0.35, desc: "형한테 베개 투척!", unlockLevel: 5, reaction: "야!! 맞았어!!" },
  { id: "water", name: "물총 쏘기", emoji: "🔫", annoy: 20, cooldown: 3000, risk: 0.4, desc: "물총으로 기습 공격!", unlockLevel: 6, reaction: "으아 젖었어!!" },
  { id: "scary", name: "놀래키기", emoji: "👻", annoy: 25, cooldown: 5000, risk: 0.3, desc: "뒤에서 으악! 하고 놀래키기", unlockLevel: 7, reaction: "심장이 멈출뻔했어!!" },
  { id: "game", name: "게임 방해", emoji: "🎮", annoy: 30, cooldown: 4000, risk: 0.45, desc: "형이 게임할 때 화면 가리기", unlockLevel: 8, reaction: "아 죽었잖아!!" },
  { id: "homework", name: "숙제에 낙서", emoji: "✏️", annoy: 35, cooldown: 6000, risk: 0.5, desc: "형 숙제에 그림 그리기", unlockLevel: 9, reaction: "내 숙제!!!!" },
  { id: "fart", name: "방귀 소리", emoji: "💨", annoy: 15, cooldown: 2000, risk: 0.1, desc: "형 옆에서 뿌웅~", unlockLevel: 4, reaction: "으으 냄새!!" },
  { id: "nickname", name: "별명 부르기", emoji: "😝", annoy: 10, cooldown: 1000, risk: 0.15, desc: "형 싫어하는 별명 부르기", unlockLevel: 5, reaction: "그렇게 부르지 마!!" },
  { id: "dance", name: "이상한 춤", emoji: "💃", annoy: 8, cooldown: 1500, risk: 0.05, desc: "형 앞에서 이상하게 춤추기", unlockLevel: 3, reaction: "제발 그만해..." },
  { id: "alarm", name: "알람 맞추기", emoji: "⏰", annoy: 40, cooldown: 8000, risk: 0.5, desc: "형 핸드폰 알람 새벽 3시로!", unlockLevel: 10, reaction: "누가 알람을?!?!" },
  { id: "ultimate", name: "엄마한테 이르기", emoji: "👩", annoy: 50, cooldown: 10000, risk: 0.6, desc: "엄마~! 형이 나 때렸어~", unlockLevel: 12, reaction: "야!! 이르지마!!" },
];

/* ───── 형 상태 ───── */
const BRO_FACES: Record<string, { face: string; label: string }> = {
  calm: { face: "😐", label: "평온" },
  annoyed: { face: "😤", label: "짜증" },
  angry: { face: "😡", label: "화남" },
  furious: { face: "🤬", label: "폭발 직전" },
  rage: { face: "👹", label: "분노 폭발!!" },
};

/* ───── 아이템 ───── */
interface Item {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "annoyBoost" | "riskReduce" | "coolReduce" | "shield";
  value: number;
}

const ITEMS: Item[] = [
  { id: "sneakers", name: "조용한 운동화", emoji: "👟", desc: "들킬 확률 감소", price: 50, effect: "-10% 위험", effectType: "riskReduce", value: 0.1 },
  { id: "megaphone", name: "확성기", emoji: "📢", desc: "짜증 유발량 증가", price: 80, effect: "+20% 짜증", effectType: "annoyBoost", value: 0.2 },
  { id: "energy", name: "에너지 드링크", emoji: "🥤", desc: "쿨타임 감소", price: 100, effect: "-15% 쿨타임", effectType: "coolReduce", value: 0.15 },
  { id: "shield1", name: "방어 쿠션", emoji: "🛡️", desc: "잡혀도 1회 방어", price: 150, effect: "1회 보호", effectType: "shield", value: 1 },
  { id: "ninja", name: "닌자 복장", emoji: "🥷", desc: "들킬 확률 대폭 감소", price: 200, effect: "-25% 위험", effectType: "riskReduce", value: 0.25 },
  { id: "horn", name: "에어혼", emoji: "📯", desc: "짜증 유발량 대폭 증가", price: 250, effect: "+40% 짜증", effectType: "annoyBoost", value: 0.4 },
  { id: "rocket", name: "로켓 신발", emoji: "🚀", desc: "쿨타임 대폭 감소", price: 300, effect: "-30% 쿨타임", effectType: "coolReduce", value: 0.3 },
  { id: "shield2", name: "투명 망토", emoji: "🧥", desc: "잡혀도 3회 방어", price: 500, effect: "3회 보호", effectType: "shield", value: 3 },
];

type Screen = "main" | "play" | "shop" | "caught" | "victory";

export default function AnnoyBroPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(50);
  const [highScore, setHighScore] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  // 플레이 상태
  const [annoyance, setAnnoyance] = useState(0); // 형 짜증 게이지 (0~100)
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shields, setShields] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [broReaction, setBroReaction] = useState("");
  const [reactionTimer, setReactionTimer] = useState<NodeJS.Timeout | null>(null);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [momWarning, setMomWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameActive, setGameActive] = useState(false);

  // 보너스 계산
  const annoyBoost = ownedItems.reduce((sum, id) => {
    const item = ITEMS.find(i => i.id === id);
    return sum + (item?.effectType === "annoyBoost" ? item.value : 0);
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
      // 시간 초과 → 승리!
      endGame(true);
    }
  }, [gameActive, timeLeft]);

  // 엄마 경고 (짜증 80 이상이면 가끔 등장)
  useEffect(() => {
    if (gameActive && annoyance >= 80 && !momWarning) {
      const chance = (annoyance - 80) / 100;
      if (Math.random() < chance) {
        setMomWarning(true);
        setTimeout(() => setMomWarning(false), 2000);
      }
    }
  }, [annoyance, gameActive, momWarning]);

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

  const startGame = useCallback(() => {
    setAnnoyance(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(60);
    setCooldowns({});
    setBroReaction("");
    setShakeIntensity(0);
    setFloatTexts([]);
    setGameActive(true);
    // 방어막 계산
    const shieldCount = ownedItems.reduce((sum, id) => {
      const item = ITEMS.find(i => i.id === id);
      return sum + (item?.effectType === "shield" ? item.value : 0);
    }, 0);
    setShields(shieldCount);
    setScreen("play");
  }, [ownedItems]);

  const endGame = useCallback((victory: boolean) => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    const earned = Math.floor(score / 5) + (victory ? 20 : 5);
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

  const doAction = useCallback((action: Action, e?: React.MouseEvent) => {
    if (!gameActive) return;
    if ((cooldowns[action.id] || 0) > 0) return;

    // 들킬 확률 체크
    const actualRisk = Math.max(0, action.risk - riskReduce) * (1 + annoyance / 200);
    if (Math.random() < actualRisk) {
      if (shields > 0) {
        setShields(s => s - 1);
        setBroReaction("🛡️ 방어막으로 막았다!");
        if (reactionTimer) clearTimeout(reactionTimer);
        const t = setTimeout(() => setBroReaction(""), 1500);
        setReactionTimer(t);
        setCombo(0);
      } else {
        endGame(false);
        return;
      }
    }

    // 성공!
    const annoyAmount = Math.floor(action.annoy * (1 + annoyBoost) * (1 + combo * 0.1));
    const scoreAmount = annoyAmount * (1 + Math.floor(combo / 3));

    setAnnoyance(a => Math.min(100, a + Math.floor(annoyAmount / 3)));
    setScore(s => s + scoreAmount);
    setCombo(c => {
      const next = c + 1;
      setMaxCombo(m => Math.max(m, next));
      return next;
    });

    // 쿨타임
    const cd = Math.floor(action.cooldown * (1 - coolReduce));
    setCooldowns(prev => ({ ...prev, [action.id]: cd }));

    // 형 반응
    setBroReaction(action.reaction);
    if (reactionTimer) clearTimeout(reactionTimer);
    const t = setTimeout(() => setBroReaction(""), 1500);
    setReactionTimer(t);

    // 흔들림
    setShakeIntensity(Math.min(annoyAmount, 20));
    setTimeout(() => setShakeIntensity(0), 300);

    // 플로팅 텍스트
    const id = floatId.current++;
    const x = e ? e.clientX : 150 + Math.random() * 100;
    const y = e ? e.clientY : 300 + Math.random() * 50;
    setFloatTexts(prev => [...prev, {
      id, text: `+${scoreAmount} ${action.emoji}`, x, y,
      color: combo >= 5 ? "#ff0" : combo >= 3 ? "#f90" : "#0f0",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== id)), 1000);

  }, [gameActive, cooldowns, riskReduce, annoyBoost, coolReduce, annoyance, combo, shields, reactionTimer, endGame]);

  // 형 얼굴
  const getBroState = () => {
    if (annoyance >= 90) return BRO_FACES.rage;
    if (annoyance >= 70) return BRO_FACES.furious;
    if (annoyance >= 45) return BRO_FACES.angry;
    if (annoyance >= 20) return BRO_FACES.annoyed;
    return BRO_FACES.calm;
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
      <div className="min-h-screen bg-gradient-to-b from-orange-900 via-red-950 to-orange-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-orange-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">😈</div>
            <h1 className="text-3xl font-black mb-1">형 괴롭히기</h1>
            <p className="text-orange-300 text-sm">들키지 않게 형을 괴롭혀라!</p>
          </div>

          {/* 상태 */}
          <div className="bg-orange-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-orange-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-orange-900 rounded-full h-2 overflow-hidden">
              <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-orange-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          {/* 버튼 */}
          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-red-600 hover:bg-red-500 rounded-xl p-4 text-center text-lg font-black">
              😈 괴롭히기 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 아이템 상점</span>
              <span className="text-xs text-yellow-300 ml-2">괴롭히기 도구 구매</span>
            </button>
          </div>

          {/* 해금된 액션 미리보기 */}
          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🎯 사용 가능한 기술 ({ACTIONS.filter(a => playerLevel >= a.unlockLevel).length}/{ACTIONS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {ACTIONS.map(a => (
                <div key={a.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= a.unlockLevel ? "bg-orange-800/50" : "bg-gray-800/50 opacity-40"
                }`} title={a.name}>
                  {playerLevel >= a.unlockLevel ? a.emoji : "🔒"}
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
    const broState = getBroState();
    const unlockedActions = ACTIONS.filter(a => playerLevel >= a.unlockLevel);

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 text-gray-900 p-4 relative overflow-hidden select-none"
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
                  background: combo >= 10 ? "#e03131" : combo >= 7 ? "#f59f00" : "#e67700",
                  color: "white",
                }}>
                🔥 {combo} COMBO!
              </span>
            </div>
          )}

          {/* 형 짜증 게이지 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span>형 짜증 게이지</span>
              <span className={annoyance >= 80 ? "text-red-600 font-bold" : ""}>{annoyance}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all" style={{
                width: `${annoyance}%`,
                background: annoyance >= 80 ? "#dc2626" : annoyance >= 50 ? "#f59e0b" : "#22c55e",
              }} />
            </div>
            {annoyance >= 80 && <div className="text-[10px] text-red-600 text-center">⚠️ 위험! 들킬 확률 증가!</div>}
          </div>

          {/* 형 캐릭터 */}
          <div className="text-center mb-4 relative">
            <div className="inline-block relative">
              <div className="text-8xl transition-all" style={{
                transform: shakeIntensity > 0 ? `rotate(${(Math.random() - 0.5) * 10}deg)` : "",
              }}>
                {broState.face}
              </div>
              <div className="text-sm font-bold mt-1" style={{
                color: annoyance >= 80 ? "#dc2626" : annoyance >= 50 ? "#f59e0b" : "#666",
              }}>
                {broState.label}
              </div>
            </div>

            {/* 형 반응 말풍선 */}
            {broReaction && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl px-3 py-1 text-sm font-bold shadow-lg whitespace-nowrap"
                style={{ animation: "popIn 0.3s ease-out" }}>
                {broReaction}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-white" />
              </div>
            )}
          </div>

          {/* 엄마 경고 */}
          {momWarning && (
            <div className="bg-red-100 border-2 border-red-400 rounded-xl p-2 mb-3 text-center animate-pulse">
              <span className="text-2xl">👩</span>
              <span className="text-sm font-bold text-red-600 ml-2">얘들아 뭐하는 거야?!</span>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="grid grid-cols-3 gap-2">
            {unlockedActions.map(action => {
              const onCooldown = (cooldowns[action.id] || 0) > 0;
              const cdPercent = onCooldown ? ((cooldowns[action.id] || 0) / Math.floor(action.cooldown * (1 - coolReduce))) * 100 : 0;

              return (
                <button key={action.id}
                  onClick={(e) => doAction(action, e)}
                  disabled={onCooldown}
                  className={`relative p-2 rounded-xl text-center transition-all active:scale-95 ${
                    onCooldown ? "bg-gray-300 opacity-60" : "bg-white hover:bg-orange-50 shadow-md hover:shadow-lg active:shadow-sm"
                  }`}>
                  {/* 쿨타임 오버레이 */}
                  {onCooldown && (
                    <div className="absolute inset-0 bg-gray-500/30 rounded-xl overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-gray-500/40" style={{ height: `${cdPercent}%` }} />
                    </div>
                  )}
                  <div className="text-2xl">{action.emoji}</div>
                  <div className="text-[10px] font-bold">{action.name}</div>
                  <div className="text-[8px] text-gray-500">+{Math.floor(action.annoy * (1 + annoyBoost))}</div>
                  {action.risk > 0.3 && <div className="text-[8px] text-red-500">⚠️</div>}
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

  /* ───── 잡혔다! ───── */
  if (screen === "caught") {
    const earned = Math.floor(score / 5) + 5;
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-950 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">😱</div>
          <h2 className="text-3xl font-black mb-2 text-red-400">형한테 잡혔다!</h2>
          <div className="text-6xl mb-4">👊😡</div>
          <p className="text-gray-400 mb-4">형: &ldquo;이리 와!! 죽었어!!&rdquo;</p>

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
                <div className="text-2xl">⏱️</div>
                <div className="text-xl font-bold">{60 - timeLeft}초</div>
                <div className="text-xs text-gray-400">생존 시간</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={startGame}
              className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">
              😈 다시 도전!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 승리! ───── */
  if (screen === "victory") {
    const earned = Math.floor(score / 5) + 20;
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-600 via-amber-800 to-orange-950 text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">🎉</div>
          <h2 className="text-3xl font-black mb-2 text-yellow-300">형 괴롭히기 성공!</h2>
          <p className="text-orange-200 mb-4">60초 동안 안 들키고 형을 괴롭혔다!</p>

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
                <div className="text-2xl">😤</div>
                <div className="text-2xl font-bold">{annoyance}%</div>
                <div className="text-xs text-gray-400">형 짜증</div>
              </div>
            </div>
          </div>

          {score > highScore && (
            <div className="text-yellow-300 font-bold mb-3 text-lg">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-orange-700 hover:bg-orange-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={startGame}
              className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold">
              😈 한 번 더!
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900 via-amber-950 to-orange-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-yellow-300 text-sm mb-4">← 뒤로</button>
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
