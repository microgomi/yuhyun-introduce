"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 떼쓰기 기술 ───── */
interface Tantrum {
  id: string;
  name: string;
  emoji: string;
  power: number;        // 떼쓰기 파워 (엄마 설득 저항)
  annoy: number;         // 엄마 짜증 유발
  energy: number;        // 에너지 소모
  cooldown: number;
  unlockLevel: number;
  desc: string;
  momReaction: string;
}

const TANTRUMS: Tantrum[] = [
  { id: "whine", name: "칭얼대기", emoji: "😭", power: 3, annoy: 2, energy: 5, cooldown: 500, unlockLevel: 1, desc: "싫어~ 안 씻을 거야~", momReaction: "그만 칭얼대!" },
  { id: "run", name: "도망가기", emoji: "🏃", power: 5, annoy: 3, energy: 8, cooldown: 800, unlockLevel: 1, desc: "방으로 도망!", momReaction: "거기 서!" },
  { id: "hide", name: "이불 속 숨기", emoji: "🛏️", power: 7, annoy: 2, energy: 6, cooldown: 1000, unlockLevel: 1, desc: "이불 속에 꽁꽁!", momReaction: "이불 속에 있는 거 다 보여!" },
  { id: "cry", name: "울기", emoji: "😢", power: 8, annoy: 5, energy: 10, cooldown: 1200, unlockLevel: 2, desc: "으아앙~ 씻기 싫어!", momReaction: "울어도 소용없어!" },
  { id: "excuse", name: "변명하기", emoji: "🤔", power: 6, annoy: 1, energy: 5, cooldown: 600, unlockLevel: 2, desc: "나 오늘 안 더러워!", momReaction: "냄새나! 어서 씻어!" },
  { id: "negotiate", name: "협상하기", emoji: "🤝", power: 10, annoy: 2, energy: 8, cooldown: 1500, unlockLevel: 2, desc: "내일 두 번 씻을게!", momReaction: "오늘 당장 씻어!" },
  { id: "sleep", name: "자는 척", emoji: "😴", power: 12, annoy: 3, energy: 7, cooldown: 2000, unlockLevel: 3, desc: "쿨쿨... 벌써 잠들었어요...", momReaction: "자는 척 하지 마!" },
  { id: "dirt", name: "일부러 더럽히기", emoji: "🤢", power: 5, annoy: 8, energy: 12, cooldown: 1000, unlockLevel: 3, desc: "어차피 더러워질 건데!", momReaction: "야!! 더 더러워졌잖아!" },
  { id: "tantrum", name: "바닥 구르기", emoji: "🌀", power: 15, annoy: 10, energy: 15, cooldown: 2500, unlockLevel: 4, desc: "아아아앙! 절대 안 씻어!!", momReaction: "바닥 구르지 마!!" },
  { id: "lock", name: "문 잠그기", emoji: "🔒", power: 18, annoy: 7, energy: 10, cooldown: 3000, unlockLevel: 4, desc: "딸깍! 못 들어오지?", momReaction: "열쇠 가져올 거야!!" },
  { id: "ally", name: "아빠한테 도움 요청", emoji: "👨", power: 20, annoy: 5, energy: 12, cooldown: 4000, unlockLevel: 5, desc: "아빠~ 엄마가 나 괴롭혀~", momReaction: "아빠도 씻으라고 할 거야!" },
  { id: "pet", name: "강아지 방패", emoji: "🐶", power: 14, annoy: 3, energy: 8, cooldown: 2000, unlockLevel: 5, desc: "강아지를 안고 방어!", momReaction: "강아지는 내려놔!" },
  { id: "game", name: "게임 중이라고!", emoji: "🎮", power: 10, annoy: 6, energy: 8, cooldown: 1500, unlockLevel: 3, desc: "지금 보스전이야!!", momReaction: "게임 끄고 씻어!!" },
  { id: "sick", name: "아픈 척", emoji: "🤒", power: 22, annoy: 4, energy: 10, cooldown: 5000, unlockLevel: 6, desc: "엄마... 나 배 아파...", momReaction: "아프면 더 씻어야지!" },
  { id: "strike", name: "목욕 파업", emoji: "✊", power: 25, annoy: 8, energy: 15, cooldown: 4000, unlockLevel: 6, desc: "오늘부터 목욕 파업!", momReaction: "파업이고 뭐고 씻어!!" },
  { id: "ultimate", name: "슈퍼 울음보", emoji: "😱", power: 30, annoy: 15, energy: 25, cooldown: 6000, unlockLevel: 7, desc: "으아아아아앙!!! (온 동네가 들림)", momReaction: "조용히 해!! 이웃이 듣겠어!!" },
  { id: "philosophy", name: "철학적 질문", emoji: "🧠", power: 20, annoy: 3, energy: 10, cooldown: 3000, unlockLevel: 7, desc: "엄마, 깨끗함이란 뭘까?", momReaction: "...씻으면 알게 돼!" },
  { id: "reverse", name: "엄마 먼저 씻어!", emoji: "😏", power: 15, annoy: 12, energy: 12, cooldown: 3000, unlockLevel: 8, desc: "엄마가 먼저 씻어 보여줘!", momReaction: "내가 왜?! 너 씻어!!" },
];

/* ───── 엄마 공격 (씻기려는 시도) ───── */
interface MomAttack {
  id: string;
  name: string;
  emoji: string;
  power: number;
  desc: string;
}

const MOM_ATTACKS: MomAttack[] = [
  { id: "call", name: "이름 부르기", emoji: "📢", power: 5, desc: "OO야~ 씻자~" },
  { id: "drag", name: "손 잡아 끌기", emoji: "🫳", power: 8, desc: "자 손 잡아~ 가자~" },
  { id: "threat", name: "협박", emoji: "😠", power: 12, desc: "안 씻으면 게임 금지!" },
  { id: "bribe", name: "뇌물", emoji: "🍫", power: 10, desc: "씻으면 초콜릿 줄게~" },
  { id: "countdown", name: "카운트다운", emoji: "⏰", power: 15, desc: "셋... 둘... 하나..." },
  { id: "water", name: "물 뿌리기", emoji: "💦", power: 18, desc: "어차피 젖었으니 씻자!" },
  { id: "carry", name: "번쩍 들기", emoji: "💪", power: 20, desc: "엄마가 안고 간다!" },
  { id: "slipper", name: "슬리퍼 위협", emoji: "🩴", power: 25, desc: "엄마 슬리퍼 등장!!" },
  { id: "grandma", name: "할머니 호출", emoji: "👵", power: 22, desc: "할머니한테 이를 거야!" },
  { id: "ultimate", name: "엄마 최종 형태", emoji: "👹", power: 30, desc: "더 이상 참을 수 없다!!" },
];

/* ───── 엄마 상태 ───── */
const MOM_FACES: { min: number; face: string; label: string }[] = [
  { min: 0, face: "😊", label: "부드러움" },
  { min: 20, face: "😐", label: "보통" },
  { min: 40, face: "😤", label: "짜증" },
  { min: 60, face: "😡", label: "화남" },
  { min: 80, face: "🤬", label: "폭발 직전" },
  { min: 95, face: "👹", label: "최종 형태!!" },
];

/* ───── 상점 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effectType: "energy" | "power" | "resist" | "cooldown" | "annoyReduce";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "snack", name: "간식", emoji: "🍪", desc: "최대 에너지 +10", price: 30, effectType: "energy", value: 10 },
  { id: "teddy", name: "곰인형", emoji: "🧸", desc: "떼쓰기 파워 +2", price: 50, effectType: "power", value: 2 },
  { id: "blanket", name: "두꺼운 이불", emoji: "🛏️", desc: "엄마 공격 저항 +3", price: 60, effectType: "resist", value: 3 },
  { id: "drink", name: "에너지 음료", emoji: "🥤", desc: "최대 에너지 +20", price: 70, effectType: "energy", value: 20 },
  { id: "earplugs", name: "귀마개", emoji: "🔇", desc: "엄마 짜증 감소 -20%", price: 80, effectType: "annoyReduce", value: 20 },
  { id: "pillow", name: "방어 베개", emoji: "🛡️", desc: "엄마 공격 저항 +5", price: 100, effectType: "resist", value: 5 },
  { id: "speed", name: "빠른 발", emoji: "👟", desc: "쿨타임 -15%", price: 90, effectType: "cooldown", value: 15 },
  { id: "megasnack", name: "초대형 간식", emoji: "🍰", desc: "최대 에너지 +40", price: 150, effectType: "energy", value: 40 },
  { id: "superpower", name: "떼쓰기 비법서", emoji: "📕", desc: "떼쓰기 파워 +5", price: 180, effectType: "power", value: 5 },
  { id: "fortress", name: "이불 요새", emoji: "🏰", desc: "엄마 공격 저항 +10", price: 250, effectType: "resist", value: 10 },
  { id: "megaspeed", name: "초고속 도망화", emoji: "🚀", desc: "쿨타임 -30%", price: 200, effectType: "cooldown", value: 30 },
  { id: "charm", name: "애교 마스터", emoji: "🥺", desc: "엄마 짜증 감소 -40%", price: 300, effectType: "annoyReduce", value: 40 },
];

type Screen = "main" | "play" | "result" | "shop";

export default function NoBathPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(20);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [totalResists, setTotalResists] = useState(0);

  // 플레이
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [resistGauge, setResistGauge] = useState(50);    // 저항 게이지 (0=씻김, 100=완벽 저항)
  const [momAnger, setMomAnger] = useState(0);            // 엄마 짜증 (0~100)
  const [timeAlive, setTimeAlive] = useState(0);           // 버틴 시간 (초)
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [momReaction, setMomReaction] = useState("");
  const [reactionTimer, setReactionTimer] = useState<NodeJS.Timeout | null>(null);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const [shaking, setShaking] = useState(false);
  const [momAttacking, setMomAttacking] = useState(false);
  const [currentMomAttack, setCurrentMomAttack] = useState<MomAttack | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const momAttackRef = useRef<NodeJS.Timeout | null>(null);
  const [dirtyLevel, setDirtyLevel] = useState(0);         // 더러움 레벨 (보너스)
  const [stinkLines, setStinkLines] = useState(0);

  // 보너스
  const bonusEnergy = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "energy" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusPower = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "power" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusResist = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "resist" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusCooldown = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "cooldown" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusAnnoyReduce = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "annoyReduce" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
    }
  }, [xp, xpNeeded]);

  // 게임 타이머
  useEffect(() => {
    if (gameActive) {
      timerRef.current = setTimeout(() => setTimeAlive(t => t + 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [gameActive, timeAlive]);

  // 쿨다운
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) next[key] = Math.max(0, next[key] - 100);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 엄마 자동 공격
  useEffect(() => {
    if (!gameActive) return;
    const attackInterval = Math.max(2000, 5000 - momAnger * 30 - timeAlive * 20);
    momAttackRef.current = setTimeout(() => doMomAttack(), attackInterval);
    return () => { if (momAttackRef.current) clearTimeout(momAttackRef.current); };
  }, [gameActive, timeAlive, momAnger]);

  // 저항 게이지 서서히 감소 (엄마가 계속 설득)
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      const decay = 1 + momAnger / 30;
      setResistGauge(r => {
        const next = r - decay;
        if (next <= 0) endGame(false);
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameActive, momAnger]);

  // 에너지 서서히 회복
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setEnergy(e => Math.min(maxEnergy, e + 2));
    }, 2000);
    return () => clearInterval(interval);
  }, [gameActive, maxEnergy]);

  // 더러움 증가
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setDirtyLevel(d => Math.min(100, d + 1));
      setStinkLines(s => Math.min(5, Math.floor((dirtyLevel + 1) / 20)));
    }, 3000);
    return () => clearInterval(interval);
  }, [gameActive, dirtyLevel]);

  // 패배 체크
  useEffect(() => {
    if (gameActive && resistGauge <= 0) {
      endGame(false);
    }
  }, [resistGauge, gameActive]);

  // 승리 체크 (3분 버티면 승리!)
  useEffect(() => {
    if (gameActive && timeAlive >= 180) {
      endGame(true);
    }
  }, [timeAlive, gameActive]);

  const getMomFace = () => {
    let face = MOM_FACES[0];
    for (const f of MOM_FACES) {
      if (momAnger >= f.min) face = f;
    }
    return face;
  };

  const startGame = useCallback(() => {
    const me = 100 + bonusEnergy;
    setMaxEnergy(me);
    setEnergy(me);
    setScore(0);
    setResistGauge(50);
    setMomAnger(0);
    setTimeAlive(0);
    setCombo(0);
    setMaxCombo(0);
    setCooldowns({});
    setMomReaction("");
    setFloatTexts([]);
    setShaking(false);
    setDirtyLevel(0);
    setStinkLines(0);
    setCurrentMomAttack(null);
    setMomAttacking(false);
    setGameActive(true);
    setScreen("play");
  }, [bonusEnergy]);

  const endGame = useCallback((victory: boolean) => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (momAttackRef.current) clearTimeout(momAttackRef.current);

    const earned = Math.floor(score / 4) + timeAlive + (victory ? 50 : 0);
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3) + (victory ? 30 : timeAlive));
    setTotalResists(t => t + 1);
    if (timeAlive > bestTime) setBestTime(timeAlive);
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, timeAlive, highScore, bestTime]);

  // 떼쓰기
  const doTantrum = useCallback((tantrum: Tantrum, e?: React.MouseEvent) => {
    if (!gameActive) return;
    if ((cooldowns[tantrum.id] || 0) > 0) return;
    if (energy < tantrum.energy) return;

    setEnergy(en => en - tantrum.energy);

    // 저항 게이지 증가
    const power = tantrum.power + bonusPower + Math.floor(dirtyLevel / 20);
    setResistGauge(r => Math.min(100, r + power));

    // 엄마 짜증
    const annoy = Math.floor(tantrum.annoy * (1 - bonusAnnoyReduce / 100));
    setMomAnger(a => Math.min(100, a + annoy));

    // 점수
    const comboMult = 1 + combo * 0.15;
    const scoreGain = Math.floor((tantrum.power + dirtyLevel / 10) * comboMult);
    setScore(s => s + scoreGain);
    setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });

    // 쿨타임
    const cd = Math.floor(tantrum.cooldown * (1 - bonusCooldown / 100));
    setCooldowns(prev => ({ ...prev, [tantrum.id]: cd }));

    // 엄마 반응
    setMomReaction(tantrum.momReaction);
    if (reactionTimer) clearTimeout(reactionTimer);
    const t = setTimeout(() => setMomReaction(""), 1500);
    setReactionTimer(t);

    // 플로팅
    const fid = floatId.current++;
    const x = e ? e.clientX : 150 + Math.random() * 100;
    const y = e ? e.clientY : 250;
    setFloatTexts(prev => [...prev, {
      id: fid, text: `+${scoreGain} ${tantrum.emoji}`, x, y,
      color: combo >= 5 ? "#fbbf24" : combo >= 3 ? "#f97316" : "#4ade80",
    }]);
    setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== fid)), 1000);

  }, [gameActive, cooldowns, energy, bonusPower, bonusAnnoyReduce, bonusCooldown, combo, dirtyLevel, reactionTimer]);

  // 엄마 공격
  const doMomAttack = useCallback(() => {
    if (!gameActive) return;

    // 엄마 짜증에 따라 공격 선택
    const attackPool = MOM_ATTACKS.filter(a => a.power <= 5 + momAnger / 3);
    const attack = attackPool.length > 0
      ? attackPool[Math.floor(Math.random() * attackPool.length)]
      : MOM_ATTACKS[0];

    setCurrentMomAttack(attack);
    setMomAttacking(true);

    const actualPower = Math.max(1, attack.power - bonusResist);
    setResistGauge(r => Math.max(0, r - actualPower));
    setCombo(0); // 엄마 공격에 콤보 리셋

    setMomReaction(attack.desc);
    if (reactionTimer) clearTimeout(reactionTimer);
    const t = setTimeout(() => { setMomReaction(""); setMomAttacking(false); }, 1500);
    setReactionTimer(t);

    setShaking(true);
    setTimeout(() => setShaking(false), 300);

  }, [gameActive, momAnger, bonusResist, reactionTimer]);

  const buyItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedItems(prev => [...prev, id]);
  }, [coins, ownedItems]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-cyan-950 to-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-cyan-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🛁</div>
            <h1 className="text-2xl font-black mb-1">씻기 싫어! 떼쓰기 대작전</h1>
            <p className="text-cyan-300 text-sm">3분만 버티면 승리! 엄마한테 안 씻겠다고 떼써라!</p>
          </div>

          <div className="bg-cyan-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-cyan-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-cyan-900 rounded-full h-2 overflow-hidden">
              <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-cyan-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {bestTime > 0 && <div className="text-xs text-yellow-300 text-center mt-1">⏱️ 최고 버틴 시간: {formatTime(bestTime)}</div>}
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center">🏆 최고 점수: {highScore}</div>}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 text-center">
            <div className="text-4xl mb-2">😭🛁😡</div>
            <p className="text-sm text-gray-300">엄마가 씻으라고 한다!</p>
            <p className="text-sm text-gray-300">떼를 써서 3분만 버텨라!</p>
            <p className="text-xs text-yellow-300 mt-1">저항 게이지가 0이 되면 씻겨진다!</p>
            <p className="text-xs text-red-400">엄마를 너무 화나게 하면 위험!</p>
          </div>

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-cyan-600 hover:bg-cyan-500 rounded-xl p-4 text-center text-lg font-black">
              😤 씻기 싫어! 떼쓰기 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 아이템 상점</span>
            </button>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">😭 떼쓰기 기술 ({TANTRUMS.filter(t => playerLevel >= t.unlockLevel).length}/{TANTRUMS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {TANTRUMS.map(t => (
                <div key={t.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= t.unlockLevel ? "bg-cyan-800/50" : "bg-gray-800/50 opacity-40"
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

  /* ───── 플레이 ───── */
  if (screen === "play") {
    const momFace = getMomFace();
    const unlocked = TANTRUMS.filter(t => playerLevel >= t.unlockLevel);

    return (
      <div className={`min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 text-gray-900 p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">⏱️ {formatTime(timeAlive)}/3:00</span>
            <span className="font-bold">🎯 {score}</span>
          </div>

          {/* 시간 진행바 */}
          <div className="mb-1">
            <div className="bg-gray-300 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${(timeAlive / 180) * 100}%` }} />
            </div>
            <div className="text-[10px] text-gray-500 text-center">{180 - timeAlive}초 남음!</div>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-orange-500 text-white">🔥 {combo} COMBO!</span>
            </div>
          )}

          {/* 저항 게이지 */}
          <div className="mb-1">
            <div className="flex justify-between text-xs mb-0.5">
              <span>✊ 저항 게이지</span>
              <span className={resistGauge < 25 ? "text-red-600 font-bold" : ""}>{Math.floor(resistGauge)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all" style={{
                width: `${resistGauge}%`,
                background: resistGauge >= 60 ? "#22c55e" : resistGauge >= 30 ? "#f59e0b" : "#dc2626",
              }} />
            </div>
            {resistGauge < 25 && <div className="text-[10px] text-red-600 text-center">⚠️ 곧 씻겨진다!!</div>}
          </div>

          {/* 에너지 */}
          <div className="mb-1">
            <div className="flex justify-between text-[10px]">
              <span>⚡ 에너지</span>
              <span>{Math.floor(energy)}/{maxEnergy}</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-yellow-400 rounded-full transition-all" style={{ width: `${(energy / maxEnergy) * 100}%` }} />
            </div>
          </div>

          {/* 엄마 짜증 */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px]">
              <span>😡 엄마 짜증</span>
              <span className={momAnger >= 80 ? "text-red-600 font-bold" : ""}>{Math.floor(momAnger)}%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-red-500 rounded-full transition-all" style={{ width: `${momAnger}%` }} />
            </div>
          </div>

          {/* 캐릭터 */}
          <div className="flex justify-between items-center mb-3 px-4">
            {/* 나 */}
            <div className="text-center relative">
              <div className="text-5xl">😤</div>
              <div className="text-xs font-bold">나</div>
              {/* 냄새 라인 */}
              {Array.from({ length: stinkLines }, (_, i) => (
                <div key={i} className="absolute text-sm" style={{
                  top: -5 - i * 8,
                  left: 30 + i * 5,
                  opacity: 0.4 + i * 0.1,
                  animation: `stink ${1 + i * 0.3}s ease-in-out infinite`,
                }}>💨</div>
              ))}
              {dirtyLevel > 50 && <div className="text-[8px] text-green-700">더러움 {dirtyLevel}%</div>}
            </div>

            <div className="text-2xl">{momAttacking ? "💥" : "⚡"}</div>

            {/* 엄마 */}
            <div className="text-center relative">
              <div className={`text-5xl transition-all ${momAttacking ? "scale-110" : ""}`}>
                {momFace.face}
              </div>
              <div className="text-xs font-bold">엄마</div>
              <div className="text-[10px]" style={{ color: momAnger >= 80 ? "#dc2626" : "#666" }}>{momFace.label}</div>

              {/* 엄마 말풍선 */}
              {momReaction && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-xl px-2 py-0.5 text-[10px] font-bold shadow-lg whitespace-nowrap z-10">
                  {momReaction}
                </div>
              )}
            </div>
          </div>

          {/* 현재 엄마 공격 */}
          {currentMomAttack && momAttacking && (
            <div className="bg-red-100 border border-red-300 rounded-xl p-2 mb-2 text-center text-sm animate-pulse">
              <span className="text-lg mr-1">{currentMomAttack.emoji}</span>
              <span className="font-bold text-red-600">{currentMomAttack.name}!</span>
            </div>
          )}

          {/* 떼쓰기 기술 */}
          <div className="grid grid-cols-3 gap-1.5">
            {unlocked.map(tantrum => {
              const onCooldown = (cooldowns[tantrum.id] || 0) > 0;
              const noEnergy = energy < tantrum.energy;
              const disabled = onCooldown || noEnergy;

              return (
                <button key={tantrum.id}
                  onClick={(e) => doTantrum(tantrum, e)}
                  disabled={disabled}
                  className={`relative p-1.5 rounded-xl text-center transition-all active:scale-95 ${
                    disabled ? "bg-gray-300 opacity-50" : "bg-white hover:bg-cyan-50 shadow-md active:shadow-sm"
                  }`}>
                  {onCooldown && (
                    <div className="absolute inset-0 bg-gray-500/20 rounded-xl overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-gray-500/30"
                        style={{ height: `${((cooldowns[tantrum.id] || 0) / Math.floor(tantrum.cooldown * (1 - bonusCooldown / 100))) * 100}%` }} />
                    </div>
                  )}
                  <div className="text-xl">{tantrum.emoji}</div>
                  <div className="text-[9px] font-bold leading-tight">{tantrum.name}</div>
                  <div className="text-[7px] text-gray-500">⚡{tantrum.energy} +{tantrum.power + bonusPower}</div>
                  {tantrum.annoy >= 8 && <div className="text-[7px] text-red-500">😡</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 플로팅 */}
        {floatTexts.map(f => (
          <div key={f.id} className="fixed pointer-events-none font-black text-lg z-50"
            style={{ left: f.x, top: f.y, color: f.color, textShadow: "0 0 4px rgba(0,0,0,0.3)", animation: "floatUp 1s ease-out forwards" }}>
            {f.text}
          </div>
        ))}

        <style jsx>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
          }
          @keyframes stink {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
            50% { transform: translateY(-8px) rotate(10deg); opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result") {
    const victory = timeAlive >= 180;
    const earned = Math.floor(score / 4) + timeAlive + (victory ? 50 : 0);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${victory ? "from-yellow-600 via-cyan-800 to-slate-950" : "from-blue-600 via-blue-900 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{victory ? "🎉" : "🛁"}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: victory ? "#fbbf24" : "#93c5fd" }}>
            {victory ? "떼쓰기 성공!!" : "결국 씻겼다..."}
          </h2>
          <p className="text-gray-300 mb-4">
            {victory
              ? "3분 동안 버텼다! 오늘은 안 씻는다!!"
              : `엄마: "${momAnger >= 80 ? "당장 씻어!!!" : "자 씻자~ 깨끗해지면 기분 좋잖아~"}"`}
          </p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">⏱️</div><div className="text-xl font-bold">{formatTime(timeAlive)}</div><div className="text-xs text-gray-400">버틴 시간</div></div>
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">최대 콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">코인</div></div>
              <div><div className="text-2xl">💨</div><div className="text-xl font-bold">{dirtyLevel}%</div><div className="text-xs text-gray-400">더러움</div></div>
              <div><div className="text-2xl">😡</div><div className="text-xl font-bold">{Math.floor(momAnger)}%</div><div className="text-xs text-gray-400">엄마 짜증</div></div>
            </div>
          </div>

          {timeAlive > bestTime && timeAlive > 0 && (
            <div className="text-yellow-300 font-bold mb-3">⏱️ 새로운 최고 버틴 시간!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={startGame} className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl p-3 font-bold">😤 다시 떼쓰기!</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-cyan-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 아이템 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {SHOP_ITEMS.map(item => {
              const owned = ownedItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
                  ) : (
                    <button onClick={() => buyItem(item.id)} disabled={coins < item.price}
                      className={`text-xs px-3 py-2 rounded-lg font-bold ${coins >= item.price ? "bg-yellow-600 hover:bg-yellow-500" : "bg-gray-700 text-gray-500"}`}>
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
