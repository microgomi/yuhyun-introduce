"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 놀래키기 방법 ───── */
interface ScareMethod {
  id: string;
  name: string;
  emoji: string;
  scarePower: number;
  prepTime: number;     // 준비 시간 (초)
  risk: number;         // 실패 확률 (0~1)
  desc: string;
  unlockLevel: number;
  successReaction: string;
  failReaction: string;
}

const SCARE_METHODS: ScareMethod[] = [
  { id: "boo", name: "으악!", emoji: "👻", scarePower: 5, prepTime: 1, risk: 0.1, desc: "뒤에서 으악! 하기", unlockLevel: 1, successReaction: "으아아악!!!", failReaction: "에이 안 놀래~" },
  { id: "tap", name: "어깨 톡톡", emoji: "👈", scarePower: 3, prepTime: 0.5, risk: 0.05, desc: "반대쪽 어깨 치기", unlockLevel: 1, successReaction: "엇? 누구야?!", failReaction: "형이잖아~" },
  { id: "mask", name: "가면 쓰기", emoji: "🎭", scarePower: 10, prepTime: 2, risk: 0.15, desc: "무서운 가면 쓰고 나타나기", unlockLevel: 2, successReaction: "꺄아악!!!", failReaction: "가면이잖아 ㅋㅋ" },
  { id: "hide", name: "숨어서 튀어나오기", emoji: "📦", scarePower: 12, prepTime: 3, risk: 0.2, desc: "상자 뒤에 숨었다가 튀어나오기", unlockLevel: 2, successReaction: "심장 떨어질뻔!!", failReaction: "발 보였어 ㅋㅋ" },
  { id: "spider", name: "거미 장난감", emoji: "🕷️", scarePower: 15, prepTime: 2, risk: 0.15, desc: "가짜 거미를 놓기", unlockLevel: 3, successReaction: "으으으 거미다!!", failReaction: "이거 가짠데?" },
  { id: "dark", name: "불 끄기", emoji: "🌑", scarePower: 8, prepTime: 1, risk: 0.1, desc: "갑자기 불 끄기", unlockLevel: 3, successReaction: "깜깜해! 무서워!", failReaction: "형이 껐지?" },
  { id: "snake", name: "뱀 장난감", emoji: "🐍", scarePower: 18, prepTime: 2.5, risk: 0.2, desc: "고무 뱀을 던지기", unlockLevel: 4, successReaction: "뱀이다아아!!", failReaction: "장난감이잖아!" },
  { id: "sound", name: "무서운 소리", emoji: "🔊", scarePower: 10, prepTime: 1.5, risk: 0.12, desc: "갑자기 큰 소리 내기", unlockLevel: 4, successReaction: "깜짝이야!!!", failReaction: "놀래키려고 그랬지?" },
  { id: "ghost", name: "유령 분장", emoji: "👻", scarePower: 22, prepTime: 4, risk: 0.25, desc: "하얀 천 뒤집어쓰고 나타나기", unlockLevel: 5, successReaction: "유유유령이다!!!", failReaction: "이불 뒤집어쓴 거잖아" },
  { id: "grab", name: "발목 잡기", emoji: "🦶", scarePower: 20, prepTime: 3, risk: 0.2, desc: "침대 밑에서 발목 잡기", unlockLevel: 6, successReaction: "으아악 뭐야!!", failReaction: "형 손이잖아 ㅋㅋ" },
  { id: "mirror", name: "거울 뒤에서", emoji: "🪞", scarePower: 25, prepTime: 3.5, risk: 0.25, desc: "화장실 거울 뒤에서 나타나기", unlockLevel: 7, successReaction: "거울에!! 으악!!", failReaction: "거울로 봤어 ㅋ" },
  { id: "alien", name: "외계인 분장", emoji: "👽", scarePower: 28, prepTime: 5, risk: 0.3, desc: "외계인처럼 분장하고 창문 밖에서", unlockLevel: 8, successReaction: "외외외계인!!!", failReaction: "형 머리 보인다" },
  { id: "zombie", name: "좀비 연기", emoji: "🧟", scarePower: 30, prepTime: 4, risk: 0.25, desc: "좀비처럼 걸어오기", unlockLevel: 9, successReaction: "좀비다!! 도망쳐!!", failReaction: "연기 못하네 ㅋㅋ" },
  { id: "clown", name: "광대 분장", emoji: "🤡", scarePower: 35, prepTime: 5, risk: 0.3, desc: "무서운 광대 분장 풀셋", unlockLevel: 10, successReaction: "싫어어!! 광대!!", failReaction: "화장 묻었어 ㅋ" },
  { id: "vr", name: "VR 깜놀", emoji: "🥽", scarePower: 40, prepTime: 4, risk: 0.2, desc: "VR 쓰고 있을 때 뒤에서!", unlockLevel: 11, successReaction: "현실이야?! 가상?!", failReaction: "VR 벗으니 형이네" },
  { id: "combo", name: "합동 작전", emoji: "🤝", scarePower: 50, prepTime: 6, risk: 0.35, desc: "친구와 양쪽에서 동시에!", unlockLevel: 12, successReaction: "사방에서!! 으아악!!", failReaction: "둘 다 보였어 ㅋ" },
];

/* ───── 동생 표정 ───── */
interface SisState {
  face: string;
  label: string;
  minFear: number;
}
const SIS_STATES: SisState[] = [
  { face: "😊", label: "행복", minFear: 0 },
  { face: "😐", label: "평온", minFear: 10 },
  { face: "😨", label: "불안", minFear: 25 },
  { face: "😱", label: "무서움", minFear: 50 },
  { face: "😭", label: "울음", minFear: 75 },
  { face: "🥶", label: "얼어붙음", minFear: 90 },
];

/* ───── 장소 ───── */
interface Location {
  id: string;
  name: string;
  emoji: string;
  bonusScare: number;
  bonusDesc: string;
  unlockLevel: number;
}
const LOCATIONS: Location[] = [
  { id: "living", name: "거실", emoji: "🛋️", bonusScare: 0, bonusDesc: "기본 장소", unlockLevel: 1 },
  { id: "bedroom", name: "동생 방", emoji: "🛏️", bonusScare: 3, bonusDesc: "동생 방은 더 무섭다!", unlockLevel: 1 },
  { id: "kitchen", name: "주방", emoji: "🍳", bonusScare: 2, bonusDesc: "어두운 주방", unlockLevel: 2 },
  { id: "bathroom", name: "화장실", emoji: "🚿", bonusScare: 5, bonusDesc: "좁은 공간 = 더 무섭다!", unlockLevel: 3 },
  { id: "hallway", name: "복도", emoji: "🚪", bonusScare: 4, bonusDesc: "긴 복도는 으스스~", unlockLevel: 4 },
  { id: "basement", name: "지하실", emoji: "🏚️", bonusScare: 8, bonusDesc: "어둡고 무서운 지하실!", unlockLevel: 6 },
  { id: "attic", name: "다락방", emoji: "🕸️", bonusScare: 10, bonusDesc: "거미줄 가득 다락방!", unlockLevel: 8 },
  { id: "garden", name: "밤 정원", emoji: "🌙", bonusScare: 12, bonusDesc: "밤에 정원은 최고로 무섭다!", unlockLevel: 10 },
];

/* ───── 아이템 ───── */
interface Item {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effectType: "scarePlus" | "riskMinus" | "prepMinus" | "moneyPlus";
  value: number;
}
const SHOP_ITEMS: Item[] = [
  { id: "flashlight", name: "손전등", emoji: "🔦", desc: "어두운 곳에서 효과 UP", price: 30, effectType: "scarePlus", value: 3 },
  { id: "quietshoes", name: "슬리퍼", emoji: "🩴", desc: "발소리 줄이기", price: 50, effectType: "riskMinus", value: 0.05 },
  { id: "costume", name: "분장 세트", emoji: "💄", desc: "분장 준비 시간 감소", price: 80, effectType: "prepMinus", value: 0.2 },
  { id: "camera", name: "카메라", emoji: "📹", desc: "놀라는 영상 → 보너스 코인", price: 60, effectType: "moneyPlus", value: 0.3 },
  { id: "ninjashoes", name: "닌자 신발", emoji: "🥷", desc: "실패 확률 대폭 감소", price: 150, effectType: "riskMinus", value: 0.1 },
  { id: "fog", name: "안개 기계", emoji: "🌫️", desc: "공포 효과 대폭 증가", price: 200, effectType: "scarePlus", value: 8 },
  { id: "speaker", name: "블루투스 스피커", emoji: "🔊", desc: "무서운 소리 효과 UP", price: 120, effectType: "scarePlus", value: 5 },
  { id: "timer", name: "타이머", emoji: "⏱️", desc: "준비 시간 대폭 감소", price: 180, effectType: "prepMinus", value: 0.35 },
];

type Screen = "main" | "location" | "play" | "result" | "collection" | "shop";

interface ScareRecord {
  method: ScareMethod;
  location: Location;
  success: boolean;
  score: number;
  timestamp: number;
}

export default function ScareSlsPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [totalScares, setTotalScares] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [scareHistory, setScareHistory] = useState<ScareRecord[]>([]);

  // 플레이 상태
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [fearLevel, setFearLevel] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundScares, setRoundScares] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [gameActive, setGameActive] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepProgress, setPrepProgress] = useState(0);
  const [prepMethod, setPrepMethod] = useState<ScareMethod | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; reaction: string; score: number } | null>(null);
  const [combo, setCombo] = useState(0);
  const [sisShaking, setSisShaking] = useState(false);
  const [floats, setFloats] = useState<{ id: number; text: string; color: string }[]>([]);
  const floatIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepRef = useRef<NodeJS.Timeout | null>(null);

  // 아이템 보너스
  const scarePlus = ownedItems.reduce((s, id) => {
    const it = SHOP_ITEMS.find(i => i.id === id);
    return s + (it?.effectType === "scarePlus" ? it.value : 0);
  }, 0);
  const riskMinus = ownedItems.reduce((s, id) => {
    const it = SHOP_ITEMS.find(i => i.id === id);
    return s + (it?.effectType === "riskMinus" ? it.value : 0);
  }, 0);
  const prepMinus = ownedItems.reduce((s, id) => {
    const it = SHOP_ITEMS.find(i => i.id === id);
    return s + (it?.effectType === "prepMinus" ? it.value : 0);
  }, 0);
  const moneyPlus = ownedItems.reduce((s, id) => {
    const it = SHOP_ITEMS.find(i => i.id === id);
    return s + (it?.effectType === "moneyPlus" ? it.value : 0);
  }, 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.35));
    }
  }, [xp, xpNeeded]);

  // 게임 타이머
  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (gameActive && timeLeft <= 0) {
      endRound();
    }
  }, [gameActive, timeLeft]);

  const getSisState = () => {
    for (let i = SIS_STATES.length - 1; i >= 0; i--) {
      if (fearLevel >= SIS_STATES[i].minFear) return SIS_STATES[i];
    }
    return SIS_STATES[0];
  };

  const startRound = useCallback((loc: Location) => {
    setCurrentLocation(loc);
    setFearLevel(0);
    setRoundScore(0);
    setRoundScares(0);
    setTimeLeft(45);
    setCombo(0);
    setLastResult(null);
    setPreparing(false);
    setPrepMethod(null);
    setGameActive(true);
    setScreen("play");
  }, []);

  const endRound = useCallback(() => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (prepRef.current) clearInterval(prepRef.current);

    const earned = Math.floor(roundScore * (1 + moneyPlus) / 3) + 5;
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(roundScore / 2));
    if (roundScore > highScore) setHighScore(roundScore);
    setScreen("result");
  }, [roundScore, highScore, moneyPlus]);

  const startPrep = useCallback((method: ScareMethod) => {
    if (!gameActive || preparing) return;
    setPreparing(true);
    setPrepMethod(method);
    setPrepProgress(0);

    const actualPrepTime = method.prepTime * (1 - prepMinus);
    const steps = 20;
    const interval = (actualPrepTime * 1000) / steps;
    let step = 0;

    prepRef.current = setInterval(() => {
      step++;
      setPrepProgress(step / steps);
      if (step >= steps) {
        if (prepRef.current) clearInterval(prepRef.current);
        executeScare(method);
      }
    }, interval);
  }, [gameActive, preparing, prepMinus]);

  const executeScare = useCallback((method: ScareMethod) => {
    if (!currentLocation) return;

    const actualRisk = Math.max(0.02, method.risk - riskMinus);
    const success = Math.random() >= actualRisk;

    if (success) {
      const baseScare = method.scarePower + currentLocation.bonusScare + scarePlus;
      const comboBonus = 1 + combo * 0.15;
      const score = Math.floor(baseScare * comboBonus);

      setFearLevel(f => Math.min(100, f + Math.floor(baseScare / 2)));
      setRoundScore(s => s + score);
      setRoundScares(n => n + 1);
      setTotalScares(n => n + 1);
      setCombo(c => c + 1);

      setLastResult({ success: true, reaction: method.successReaction, score });
      setSisShaking(true);
      setTimeout(() => setSisShaking(false), 500);

      const fid = floatIdRef.current++;
      setFloats(prev => [...prev, { id: fid, text: `+${score} ${method.emoji}`, color: "#22c55e" }]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 1200);

      setScareHistory(prev => [...prev, { method, location: currentLocation, success: true, score, timestamp: Date.now() }]);
    } else {
      setCombo(0);
      setLastResult({ success: false, reaction: method.failReaction, score: 0 });

      const fid = floatIdRef.current++;
      setFloats(prev => [...prev, { id: fid, text: "실패! 😅", color: "#ef4444" }]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 1200);

      setScareHistory(prev => [...prev, { method, location: currentLocation, success: false, score: 0, timestamp: Date.now() }]);
    }

    setPreparing(false);
    setPrepMethod(null);
    setPrepProgress(0);
  }, [currentLocation, riskMinus, scarePlus, combo]);

  const buyItem = useCallback((itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || coins < item.price || ownedItems.includes(itemId)) return;
    setCoins(c => c - item.price);
    setOwnedItems(prev => [...prev, itemId]);
  }, [coins, ownedItems]);

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-purple-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">👻</div>
            <h1 className="text-3xl font-black mb-1">동생 놀래키기</h1>
            <p className="text-purple-300 text-sm">다양한 방법으로 동생을 놀래켜라!</p>
          </div>

          <div className="bg-purple-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-purple-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-purple-900 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-purple-400 mt-0.5">
              <span>{xp}/{xpNeeded} XP</span>
              <span>👻 총 {totalScares}회 놀래킴</span>
            </div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          <div className="space-y-3 mb-4">
            <button onClick={() => setScreen("location")}
              className="w-full bg-purple-700 hover:bg-purple-600 rounded-xl p-4 text-center text-lg font-black">
              👻 놀래키러 가기!
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScreen("shop")}
                className="bg-yellow-800/50 hover:bg-yellow-700/50 rounded-xl p-3 text-center">
                <div className="text-xl">🛒</div>
                <div className="text-sm font-bold">상점</div>
              </button>
              <button onClick={() => setScreen("collection")}
                className="bg-indigo-800/50 hover:bg-indigo-700/50 rounded-xl p-3 text-center">
                <div className="text-xl">📖</div>
                <div className="text-sm font-bold">도감</div>
              </button>
            </div>
          </div>

          {/* 해금 미리보기 */}
          <div className="bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🎭 놀래키기 기술 ({SCARE_METHODS.filter(m => playerLevel >= m.unlockLevel).length}/{SCARE_METHODS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {SCARE_METHODS.map(m => (
                <div key={m.id} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= m.unlockLevel ? "bg-purple-800/60" : "bg-gray-800/50 opacity-40"
                }`}>
                  {playerLevel >= m.unlockLevel ? m.emoji : "🔒"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 장소 선택 ───── */
  if (screen === "location") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-purple-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📍 장소 선택</h2>
          <p className="text-center text-sm text-purple-300 mb-4">어디서 놀래킬까?</p>

          <div className="grid grid-cols-2 gap-2">
            {LOCATIONS.map(loc => {
              const locked = playerLevel < loc.unlockLevel;
              return (
                <button key={loc.id}
                  onClick={() => !locked && startRound(loc)}
                  disabled={locked}
                  className={`p-3 rounded-xl text-center transition-all ${
                    locked ? "bg-gray-800/50 opacity-50" : "bg-black/40 hover:bg-purple-900/40 hover:scale-105"
                  }`}>
                  <div className="text-3xl mb-1">{locked ? "🔒" : loc.emoji}</div>
                  <div className="font-bold text-sm">{loc.name}</div>
                  {locked ? (
                    <div className="text-[10px] text-gray-500">Lv.{loc.unlockLevel} 필요</div>
                  ) : (
                    <div className="text-[10px] text-purple-300">공포 보너스: +{loc.bonusScare}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play" && currentLocation) {
    const sisState = getSisState();
    const unlockedMethods = SCARE_METHODS.filter(m => playerLevel >= m.unlockLevel);

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950 to-black text-white p-4 relative overflow-hidden select-none">
        <div className="max-w-md mx-auto">
          {/* 상단 바 */}
          <div className="flex justify-between items-center mb-2 text-sm">
            <span>⏱️ {timeLeft}초</span>
            <span>{currentLocation.emoji} {currentLocation.name}</span>
            <span>🎯 {roundScore}점</span>
          </div>

          {/* 콤보 */}
          {combo >= 2 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-3 py-0.5 rounded-full" style={{
                background: combo >= 8 ? "#9333ea" : combo >= 5 ? "#7c3aed" : "#6d28d9",
              }}>
                👻 {combo} COMBO!
              </span>
            </div>
          )}

          {/* 공포 게이지 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span>동생 공포 게이지</span>
              <span>{fearLevel}%</span>
            </div>
            <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all" style={{
                width: `${fearLevel}%`,
                background: fearLevel >= 75 ? "#9333ea" : fearLevel >= 50 ? "#7c3aed" : fearLevel >= 25 ? "#6d28d9" : "#8b5cf6",
              }} />
            </div>
          </div>

          {/* 동생 캐릭터 */}
          <div className="text-center mb-3 relative">
            <div className={`inline-block transition-all ${sisShaking ? "animate-bounce" : ""}`}
              style={{ transform: sisShaking ? `rotate(${(Math.random() - 0.5) * 20}deg)` : "" }}>
              <div className="text-7xl">{sisState.face}</div>
              <div className="text-xs font-bold mt-1" style={{
                color: fearLevel >= 75 ? "#c084fc" : fearLevel >= 50 ? "#a78bfa" : "#9ca3af",
              }}>{sisState.label}</div>
            </div>

            {/* 반응 말풍선 */}
            {lastResult && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 rounded-xl px-3 py-1 text-sm font-bold shadow-lg whitespace-nowrap ${
                lastResult.success ? "bg-white text-gray-900" : "bg-red-100 text-red-600"
              }`} style={{ animation: "popIn 0.3s ease-out" }}>
                {lastResult.reaction}
              </div>
            )}

            {/* 플로팅 텍스트 */}
            {floats.map(f => (
              <div key={f.id} className="absolute left-1/2 top-0 -translate-x-1/2 font-black text-lg pointer-events-none"
                style={{ color: f.color, animation: "floatUp 1.2s ease-out forwards" }}>
                {f.text}
              </div>
            ))}
          </div>

          {/* 준비 중 바 */}
          {preparing && prepMethod && (
            <div className="bg-yellow-900/40 rounded-xl p-2 mb-3">
              <div className="text-center text-sm mb-1">
                {prepMethod.emoji} {prepMethod.name} 준비 중...
              </div>
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: `${prepProgress * 100}%` }} />
              </div>
            </div>
          )}

          {/* 놀래키기 버튼들 */}
          <div className="grid grid-cols-3 gap-2">
            {unlockedMethods.map(method => (
              <button key={method.id}
                onClick={() => startPrep(method)}
                disabled={preparing}
                className={`p-2 rounded-xl text-center transition-all ${
                  preparing ? "bg-gray-800 opacity-50" : "bg-purple-900/60 hover:bg-purple-800/60 active:scale-95"
                }`}>
                <div className="text-2xl">{method.emoji}</div>
                <div className="text-[10px] font-bold">{method.name}</div>
                <div className="text-[8px] text-purple-300">👻+{method.scarePower + currentLocation.bonusScare + scarePlus}</div>
                {method.risk > 0.25 && <div className="text-[8px] text-red-400">⚠️</div>}
              </button>
            ))}
          </div>

          {/* 포기 버튼 */}
          <button onClick={endRound}
            className="w-full mt-3 bg-gray-800 hover:bg-gray-700 rounded-xl p-2 text-sm text-gray-400">
            🏳️ 그만하기
          </button>
        </div>

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -80px) scale(1.3); }
          }
          @keyframes popIn {
            0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
            100% { opacity: 1; transform: translateX(-50%) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result") {
    const earned = Math.floor(roundScore * (1 + moneyPlus) / 3) + 5;
    const grade =
      roundScore >= 500 ? { name: "SS", emoji: "👑", color: "#fbbf24" } :
      roundScore >= 350 ? { name: "S", emoji: "🌟", color: "#f59e0b" } :
      roundScore >= 250 ? { name: "A", emoji: "⭐", color: "#a855f7" } :
      roundScore >= 150 ? { name: "B", emoji: "👍", color: "#3b82f6" } :
      roundScore >= 80  ? { name: "C", emoji: "😊", color: "#22c55e" } :
                          { name: "D", emoji: "😅", color: "#9ca3af" };

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-black mb-3">👻 놀래키기 완료!</h2>

          <div className="text-6xl mb-1">{grade.emoji}</div>
          <div className="text-5xl font-black mb-2" style={{ color: grade.color }}>{grade.name}</div>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl">🎯</div>
                <div className="text-xl font-bold">{roundScore}</div>
                <div className="text-xs text-gray-400">점수</div>
              </div>
              <div>
                <div className="text-2xl">👻</div>
                <div className="text-xl font-bold">{roundScares}회</div>
                <div className="text-xs text-gray-400">놀래킨 횟수</div>
              </div>
              <div>
                <div className="text-2xl">😱</div>
                <div className="text-xl font-bold">{fearLevel}%</div>
                <div className="text-xs text-gray-400">최종 공포</div>
              </div>
              <div>
                <div className="text-2xl">🪙</div>
                <div className="text-xl font-bold text-yellow-400">+{earned}</div>
                <div className="text-xs text-gray-400">획득 코인</div>
              </div>
            </div>
          </div>

          {roundScore > highScore && roundScore > 0 && (
            <div className="text-yellow-300 font-bold mb-3">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">
              🏠 메인
            </button>
            <button onClick={() => setScreen("location")}
              className="flex-1 bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold">
              👻 다시 놀래키기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 도감 ───── */
  if (screen === "collection") {
    const successMethods = new Set(scareHistory.filter(r => r.success).map(r => r.method.id));
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-indigo-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">📖 놀래키기 도감</h2>
          <p className="text-center text-sm text-indigo-300 mb-4">성공: {successMethods.size}/{SCARE_METHODS.length}</p>

          <div className="space-y-2">
            {SCARE_METHODS.map(m => {
              const unlocked = playerLevel >= m.unlockLevel;
              const tried = successMethods.has(m.id);
              const count = scareHistory.filter(r => r.method.id === m.id && r.success).length;
              return (
                <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  tried ? "bg-purple-900/30 border border-purple-700" :
                  unlocked ? "bg-black/20" : "bg-gray-900/30 opacity-50"
                }`}>
                  <div className="text-3xl">{unlocked ? m.emoji : "🔒"}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{unlocked ? m.name : "???"}</div>
                    <div className="text-xs text-gray-400">{unlocked ? m.desc : `Lv.${m.unlockLevel} 필요`}</div>
                    {tried && <div className="text-[10px] text-purple-300">👻 {count}회 성공 | 공포: +{m.scarePower}</div>}
                  </div>
                  {tried && <span className="text-green-400">✅</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-950 via-amber-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-yellow-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 아이템 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {SHOP_ITEMS.map(item => {
              const owned = ownedItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                  owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"
                }`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
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
