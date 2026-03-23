"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 아빠 잔소리 ───── */
interface DadNag {
  id: string;
  text: string;
  emoji: string;
  power: number;       // 잔소리 파워 (높을수록 강력)
  speed: number;        // 말하는 속도 (낮을수록 빠름)
  type: "study" | "game" | "sleep" | "food" | "manners" | "future" | "clean" | "phone" | "exercise" | "random";
  tier: number;         // 1~5
}

const DAD_NAGS: DadNag[] = [
  // 공부
  { id: "n1", text: "숙제 했어?", emoji: "📚", power: 3, speed: 3, type: "study", tier: 1 },
  { id: "n2", text: "공부 좀 해라", emoji: "📖", power: 5, speed: 3, type: "study", tier: 1 },
  { id: "n3", text: "시험 언제야?", emoji: "📝", power: 7, speed: 2, type: "study", tier: 2 },
  { id: "n4", text: "아빠 어릴 때는 1등 했어", emoji: "🏆", power: 10, speed: 2, type: "study", tier: 3 },
  { id: "n5", text: "수학은 기본이야!", emoji: "🧮", power: 12, speed: 2, type: "study", tier: 3 },
  // 게임
  { id: "n6", text: "게임 그만해", emoji: "🎮", power: 5, speed: 3, type: "game", tier: 1 },
  { id: "n7", text: "게임하면 눈 나빠져!", emoji: "👀", power: 8, speed: 2, type: "game", tier: 2 },
  { id: "n8", text: "게임이 밥 먹여주냐?", emoji: "🍚", power: 12, speed: 2, type: "game", tier: 3 },
  { id: "n9", text: "프로게이머 될 거 아니면 꺼!", emoji: "😤", power: 15, speed: 1, type: "game", tier: 4 },
  // 잠
  { id: "n10", text: "빨리 자!", emoji: "😴", power: 4, speed: 3, type: "sleep", tier: 1 },
  { id: "n11", text: "몇 시인 줄 알아?!", emoji: "⏰", power: 8, speed: 2, type: "sleep", tier: 2 },
  { id: "n12", text: "내일 학교 못 일어나!", emoji: "🏫", power: 10, speed: 2, type: "sleep", tier: 3 },
  // 음식
  { id: "n13", text: "밥 다 먹어!", emoji: "🍚", power: 4, speed: 3, type: "food", tier: 1 },
  { id: "n14", text: "편식하지 마!", emoji: "🥦", power: 6, speed: 3, type: "food", tier: 2 },
  { id: "n15", text: "간식 그만 먹어!", emoji: "🍪", power: 5, speed: 3, type: "food", tier: 1 },
  // 예의
  { id: "n16", text: "인사 똑바로 해", emoji: "🙇", power: 5, speed: 3, type: "manners", tier: 1 },
  { id: "n17", text: "어른한테 반말하지 마", emoji: "🗣️", power: 8, speed: 2, type: "manners", tier: 2 },
  { id: "n18", text: "자세 똑바로!", emoji: "🧍", power: 4, speed: 3, type: "manners", tier: 1 },
  // 미래
  { id: "n19", text: "꿈이 뭐야?", emoji: "💭", power: 7, speed: 2, type: "future", tier: 2 },
  { id: "n20", text: "아빠 때는 말이야...", emoji: "👴", power: 15, speed: 1, type: "future", tier: 4 },
  { id: "n21", text: "나중에 후회한다!", emoji: "😰", power: 12, speed: 2, type: "future", tier: 3 },
  // 청소
  { id: "n22", text: "방 좀 치워!", emoji: "🧹", power: 5, speed: 3, type: "clean", tier: 1 },
  { id: "n23", text: "이게 방이야 쓰레기장이야?!", emoji: "🗑️", power: 10, speed: 2, type: "clean", tier: 3 },
  // 핸드폰
  { id: "n24", text: "핸드폰 내려놔!", emoji: "📱", power: 6, speed: 3, type: "phone", tier: 1 },
  { id: "n25", text: "유튜브 그만 봐!", emoji: "📺", power: 8, speed: 2, type: "phone", tier: 2 },
  { id: "n26", text: "틱톡이 뭐가 재밌어?", emoji: "🤷", power: 7, speed: 2, type: "phone", tier: 2 },
  // 운동
  { id: "n27", text: "밖에 나가서 좀 뛰어!", emoji: "🏃", power: 5, speed: 3, type: "exercise", tier: 1 },
  { id: "n28", text: "살 좀 빼야 되겠다", emoji: "⚖️", power: 10, speed: 2, type: "exercise", tier: 3 },
  // 랜덤
  { id: "n29", text: "내가 누구 덕에 사는 줄 알아?", emoji: "💰", power: 18, speed: 1, type: "random", tier: 4 },
  { id: "n30", text: "다 너 잘 되라고 하는 소리야", emoji: "❤️", power: 20, speed: 1, type: "random", tier: 5 },
  { id: "n31", text: "아빠가 너 나이 때는...", emoji: "📜", power: 25, speed: 1, type: "random", tier: 5 },
  { id: "n32", text: "세상에 공짜는 없어!", emoji: "💸", power: 15, speed: 1, type: "random", tier: 4 },
];

/* ───── 입막기 기술 ───── */
interface BlockSkill {
  id: string;
  name: string;
  emoji: string;
  power: number;
  energy: number;
  cooldown: number;
  blockTypes: DadNag["type"][];   // 효과적인 잔소리 타입
  unlockLevel: number;
  desc: string;
  dadReaction: string;
}

const BLOCK_SKILLS: BlockSkill[] = [
  { id: "nod", name: "고개 끄덕이기", emoji: "😊", power: 3, energy: 3, cooldown: 300, blockTypes: [], unlockLevel: 1, desc: "네네~ 알겠어요~", dadReaction: "진짜 알겠어?" },
  { id: "hug", name: "안아주기", emoji: "🤗", power: 8, energy: 8, cooldown: 2000, blockTypes: ["manners", "future"], unlockLevel: 1, desc: "아빠 사랑해~", dadReaction: "...그래 나도..." },
  { id: "snack", name: "간식 갖다주기", emoji: "🍪", power: 10, energy: 5, cooldown: 3000, blockTypes: ["food", "random"], unlockLevel: 1, desc: "아빠 이거 드세요!", dadReaction: "오 고마워~" },
  { id: "subject", name: "화제 돌리기", emoji: "💬", power: 7, energy: 6, cooldown: 1500, blockTypes: ["study", "game"], unlockLevel: 2, desc: "아빠 오늘 회사 어땠어?", dadReaction: "응? 회사? 오늘..." },
  { id: "joke", name: "아재 개그", emoji: "😂", power: 12, energy: 8, cooldown: 2500, blockTypes: ["manners", "clean"], unlockLevel: 2, desc: "아빠! 세상에서 가장 빠른 닭은?", dadReaction: "뭔데? ...ㅋㅋ" },
  { id: "score", name: "성적표 보여주기", emoji: "💯", power: 15, energy: 10, cooldown: 5000, blockTypes: ["study", "future"], unlockLevel: 3, desc: "아빠 나 시험 잘 봤어!", dadReaction: "오호! 그래?" },
  { id: "massage", name: "어깨 주무르기", emoji: "💆", power: 12, energy: 7, cooldown: 3000, blockTypes: ["exercise", "random"], unlockLevel: 3, desc: "아빠 어깨 아프시죠?", dadReaction: "오~ 시원하다~" },
  { id: "tv", name: "리모콘 갖다주기", emoji: "📺", power: 10, energy: 5, cooldown: 2000, blockTypes: ["game", "phone"], unlockLevel: 2, desc: "아빠 축구 시작했어요!", dadReaction: "오! 축구?!" },
  { id: "exercise", name: "운동하고 옴", emoji: "🏃", power: 15, energy: 12, cooldown: 5000, blockTypes: ["exercise", "game", "sleep"], unlockLevel: 4, desc: "아빠 나 운동하고 왔어!", dadReaction: "오 장하다!" },
  { id: "cook", name: "라면 끓여주기", emoji: "🍜", power: 18, energy: 10, cooldown: 4000, blockTypes: ["food", "random"], unlockLevel: 4, desc: "아빠 라면 끓였어요!", dadReaction: "우리 아들/딸!" },
  { id: "future", name: "장래희망 발표", emoji: "🎓", power: 20, energy: 15, cooldown: 6000, blockTypes: ["future", "study"], unlockLevel: 5, desc: "아빠 나 의사 될 거야!", dadReaction: "오오!! 정말?!" },
  { id: "clean", name: "방 청소 완료!", emoji: "✨", power: 18, energy: 12, cooldown: 5000, blockTypes: ["clean", "manners"], unlockLevel: 5, desc: "아빠 방 다 치웠어!", dadReaction: "오호! 깨끗하네!" },
  { id: "cute", name: "초 애교", emoji: "🥺", power: 15, energy: 10, cooldown: 3000, blockTypes: ["game", "phone", "sleep"], unlockLevel: 4, desc: "아빠~ 나 사랑하지~?", dadReaction: "...그래 사랑해" },
  { id: "money", name: "용돈 안 달라기", emoji: "💰", power: 22, energy: 15, cooldown: 7000, blockTypes: ["random", "future"], unlockLevel: 6, desc: "아빠 용돈 안 줘도 돼요!", dadReaction: "...뭐? 진짜?" },
  { id: "promise", name: "뭐든 할게요!", emoji: "🤞", power: 12, energy: 8, cooldown: 2000, blockTypes: [], unlockLevel: 3, desc: "아빠 말 다 들을게!", dadReaction: "정말이지?!" },
  { id: "sleep_act", name: "자는 척", emoji: "😴", power: 10, energy: 5, cooldown: 4000, blockTypes: ["sleep", "study"], unlockLevel: 2, desc: "쿨쿨... (자는 척)", dadReaction: "야 자는 척 하지마!" },
  { id: "ultimate", name: "효도 풀콤보", emoji: "👑", power: 30, energy: 25, cooldown: 10000, blockTypes: ["study", "game", "sleep", "food", "manners", "future", "clean", "phone", "exercise", "random"], unlockLevel: 7, desc: "성적+운동+청소+효도 올인!", dadReaction: "...할 말이 없구나" },
];

/* ───── 상점 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effectType: "energy" | "power" | "resist" | "cooldown" | "charm";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "earbuds", name: "무선 이어폰", emoji: "🎧", desc: "잔소리 저항 +3", price: 40, effectType: "resist", value: 3 },
  { id: "chocolate", name: "아빠 초콜릿", emoji: "🍫", desc: "입막기 파워 +2", price: 50, effectType: "power", value: 2 },
  { id: "energy1", name: "비타민", emoji: "💊", desc: "최대 에너지 +15", price: 40, effectType: "energy", value: 15 },
  { id: "speed1", name: "순발력 훈련", emoji: "⚡", desc: "쿨타임 -15%", price: 70, effectType: "cooldown", value: 15 },
  { id: "charm1", name: "애교 레슨", emoji: "🥺", desc: "매력 +10%", price: 60, effectType: "charm", value: 10 },
  { id: "earbuds2", name: "노이즈캔슬링", emoji: "🎧", desc: "잔소리 저항 +6", price: 120, effectType: "resist", value: 6 },
  { id: "gift", name: "아빠 선물", emoji: "🎁", desc: "입막기 파워 +5", price: 150, effectType: "power", value: 5 },
  { id: "energy2", name: "에너지바", emoji: "🥤", desc: "최대 에너지 +30", price: 100, effectType: "energy", value: 30 },
  { id: "speed2", name: "초고속 반응", emoji: "🚀", desc: "쿨타임 -30%", price: 200, effectType: "cooldown", value: 30 },
  { id: "charm2", name: "효자/효녀 인증", emoji: "🏅", desc: "매력 +25%", price: 250, effectType: "charm", value: 25 },
  { id: "resist3", name: "마음의 갑옷", emoji: "🛡️", desc: "잔소리 저항 +10", price: 300, effectType: "resist", value: 10 },
  { id: "ultimate_gift", name: "여행 상품권", emoji: "✈️", desc: "입막기 파워 +10", price: 500, effectType: "power", value: 10 },
];

/* ───── 날아오는 잔소리 (게임 오브젝트) ───── */
interface FlyingNag {
  id: number;
  nag: DadNag;
  x: number;          // 0~100 (왼쪽→오른쪽)
  y: number;
  blocked: boolean;
  missed: boolean;
}

type Screen = "main" | "play" | "result" | "shop";

export default function ShutDadPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(30);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [highScore, setHighScore] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [totalBlocked, setTotalBlocked] = useState(0);

  // 플레이
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [maxEnergy, setMaxEnergy] = useState(100);
  const [patience, setPatience] = useState(100);          // 인내심 (0=터짐=게임오버)
  const [dadMood, setDadMood] = useState(50);              // 아빠 기분 (100=좋음, 0=완전 잔소리모드)
  const [timeAlive, setTimeAlive] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [flyingNags, setFlyingNags] = useState<FlyingNag[]>([]);
  const [floatTexts, setFloatTexts] = useState<{ id: number; text: string; x: number; y: number; color: string }[]>([]);
  const floatId = useRef(0);
  const nagId = useRef(0);
  const [shaking, setShaking] = useState(false);
  const [dadFace, setDadFace] = useState("😐");
  const [dadSpeech, setDadSpeech] = useState("");
  const speechTimer = useRef<NodeJS.Timeout | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<BlockSkill | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nagSpawnRef = useRef<NodeJS.Timeout | null>(null);

  // 보너스
  const bonusEnergy = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "energy" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusPower = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "power" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusResist = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "resist" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusCooldown = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "cooldown" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const bonusCharm = ownedItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "charm" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
    }
  }, [xp, xpNeeded]);

  // 타이머
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

  // 에너지 회복
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => setEnergy(e => Math.min(maxEnergy, e + 3)), 2000);
    return () => clearInterval(interval);
  }, [gameActive, maxEnergy]);

  // 잔소리 스폰
  useEffect(() => {
    if (!gameActive) return;
    const spawnRate = Math.max(1200, 3500 - timeAlive * 15 - (100 - dadMood) * 10);
    nagSpawnRef.current = setTimeout(() => {
      const tierMax = Math.min(5, 1 + Math.floor(timeAlive / 20));
      const pool = DAD_NAGS.filter(n => n.tier <= tierMax);
      const nag = pool[Math.floor(Math.random() * pool.length)];
      const id = nagId.current++;
      setFlyingNags(prev => [...prev, {
        id, nag, x: 100, y: 15 + Math.random() * 65, blocked: false, missed: false,
      }]);
    }, spawnRate);
    return () => { if (nagSpawnRef.current) clearTimeout(nagSpawnRef.current); };
  }, [gameActive, timeAlive, dadMood, flyingNags]);

  // 잔소리 이동
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => {
      setFlyingNags(prev => {
        const updated = prev.map(fn => {
          if (fn.blocked || fn.missed) return fn;
          const speed = 1.5 + fn.nag.speed * 0.3 + timeAlive * 0.01;
          return { ...fn, x: fn.x - speed };
        });

        // 놓친 잔소리 처리
        updated.forEach(fn => {
          if (!fn.blocked && !fn.missed && fn.x <= 5) {
            fn.missed = true;
            const dmg = Math.max(1, fn.nag.power - bonusResist);
            setPatience(p => {
              const next = p - dmg;
              if (next <= 0) endGame(false);
              return Math.max(0, next);
            });
            setCombo(0);
            setMissedCount(m => m + 1);
            setShaking(true);
            setTimeout(() => setShaking(false), 200);
          }
        });

        return updated.filter(fn => fn.x > -10 && !fn.missed || (fn.missed && fn.x > -5));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [gameActive, timeAlive, bonusResist]);

  // 아빠 얼굴
  useEffect(() => {
    if (dadMood >= 80) setDadFace("😊");
    else if (dadMood >= 60) setDadFace("😐");
    else if (dadMood >= 40) setDadFace("😤");
    else if (dadMood >= 20) setDadFace("😠");
    else setDadFace("🤬");
  }, [dadMood]);

  // 아빠 기분 서서히 하락
  useEffect(() => {
    if (!gameActive) return;
    const interval = setInterval(() => setDadMood(m => Math.max(0, m - 1)), 3000);
    return () => clearInterval(interval);
  }, [gameActive]);

  // 승리: 2분 버티면!
  useEffect(() => {
    if (gameActive && timeAlive >= 120) endGame(true);
  }, [gameActive, timeAlive]);

  const startGame = useCallback(() => {
    const me = 100 + bonusEnergy;
    setMaxEnergy(me);
    setEnergy(me);
    setScore(0);
    setPatience(100);
    setDadMood(50);
    setTimeAlive(0);
    setCombo(0);
    setMaxCombo(0);
    setCooldowns({});
    setFlyingNags([]);
    setFloatTexts([]);
    setBlockedCount(0);
    setMissedCount(0);
    setShaking(false);
    setDadSpeech("");
    setSelectedSkill(null);
    setGameActive(true);
    setScreen("play");
  }, [bonusEnergy]);

  const endGame = useCallback((victory: boolean) => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (nagSpawnRef.current) clearTimeout(nagSpawnRef.current);

    const earned = Math.floor(score / 4) + blockedCount * 2 + (victory ? 50 : 0);
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3));
    setTotalBlocked(t => t + blockedCount);
    if (timeAlive > bestTime) setBestTime(timeAlive);
    if (score > highScore) setHighScore(score);
    setScreen("result");
  }, [score, blockedCount, timeAlive, highScore, bestTime]);

  // 스킬로 잔소리 막기
  const blockNag = useCallback((nagFlyId: number, e?: React.MouseEvent) => {
    if (!gameActive || !selectedSkill) return;
    if ((cooldowns[selectedSkill.id] || 0) > 0) return;
    if (energy < selectedSkill.energy) return;

    const fn = flyingNags.find(f => f.id === nagFlyId);
    if (!fn || fn.blocked || fn.missed) return;

    setEnergy(en => en - selectedSkill.energy);

    // 효과적인 타입이면 보너스
    const isEffective = selectedSkill.blockTypes.includes(fn.nag.type) || selectedSkill.blockTypes.length === 0;
    const effectMult = isEffective && selectedSkill.blockTypes.length > 0 ? 2 : 1;
    const totalPower = (selectedSkill.power + bonusPower) * effectMult * (1 + bonusCharm / 100);

    const success = totalPower >= fn.nag.power * 0.5;

    if (success) {
      // 막기 성공!
      setFlyingNags(prev => prev.map(f => f.id === nagFlyId ? { ...f, blocked: true } : f));

      const comboMult = 1 + combo * 0.15;
      const scoreGain = Math.floor((fn.nag.power * 3 + selectedSkill.power) * comboMult * effectMult);
      setScore(s => s + scoreGain);
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
      setBlockedCount(b => b + 1);

      // 아빠 기분 상승
      const moodGain = Math.floor(selectedSkill.power * 0.5 * (1 + bonusCharm / 100));
      setDadMood(m => Math.min(100, m + moodGain));

      // 반응
      setDadSpeech(selectedSkill.dadReaction);
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => setDadSpeech(""), 1200);

      // 플로팅
      const fid = floatId.current++;
      const x = e ? e.clientX : 150;
      const y = e ? e.clientY : 200;
      const effectText = isEffective && selectedSkill.blockTypes.length > 0 ? " 효과적!" : "";
      setFloatTexts(prev => [...prev, {
        id: fid, text: `+${scoreGain}${effectText}`, x, y,
        color: effectMult > 1 ? "#fbbf24" : combo >= 3 ? "#f97316" : "#4ade80",
      }]);
      setTimeout(() => setFloatTexts(prev => prev.filter(f => f.id !== fid)), 1000);
    } else {
      // 파워 부족
      setDadSpeech("그런다고 안 넘어가!");
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => setDadSpeech(""), 1000);
      setCombo(0);
    }

    const cd = Math.floor(selectedSkill.cooldown * (1 - bonusCooldown / 100));
    setCooldowns(prev => ({ ...prev, [selectedSkill.id]: cd }));

  }, [gameActive, selectedSkill, cooldowns, energy, flyingNags, combo, bonusPower, bonusCharm, bonusCooldown]);

  const buyItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedItems(prev => [...prev, id]);
  }, [coins, ownedItems]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  const NAG_TYPE_COLORS: Record<string, string> = {
    study: "#3b82f6", game: "#ef4444", sleep: "#8b5cf6", food: "#f97316",
    manners: "#ec4899", future: "#06b6d4", clean: "#22c55e", phone: "#6366f1",
    exercise: "#eab308", random: "#f43f5e",
  };

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 via-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-gray-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🤐</div>
            <h1 className="text-3xl font-black mb-1">아빠 입막기</h1>
            <p className="text-gray-400 text-sm">날아오는 아빠 잔소리를 막아라!</p>
          </div>

          <div className="bg-gray-800/60 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-gray-300 text-sm">Lv.{playerLevel}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-gray-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {bestTime > 0 && <div className="text-xs text-yellow-300 text-center mt-1">⏱️ 최고: {formatTime(bestTime)}</div>}
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center">🏆 점수: {highScore}</div>}
          </div>

          <div className="bg-black/40 rounded-xl p-3 mb-4 text-center">
            <div className="text-4xl mb-2">👨🗣️💬😣</div>
            <p className="text-sm text-gray-300">아빠의 잔소리가 날아온다!</p>
            <p className="text-sm text-gray-300">스킬을 선택하고 잔소리를 터치해서 막아라!</p>
            <p className="text-xs text-yellow-300 mt-1">2분 버티면 승리! 인내심이 0이면 게임오버!</p>
          </div>

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 text-center text-lg font-black">
              🤐 입막기 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center font-bold">
              🛒 아이템 상점
            </button>
          </div>

          <div className="mt-4 bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🛡️ 입막기 기술 ({BLOCK_SKILLS.filter(s => playerLevel >= s.unlockLevel).length}/{BLOCK_SKILLS.length})</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {BLOCK_SKILLS.map(s => (
                <div key={s.id} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  playerLevel >= s.unlockLevel ? "bg-blue-800/50" : "bg-gray-800/50 opacity-40"
                }`}>{playerLevel >= s.unlockLevel ? s.emoji : "🔒"}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  if (screen === "play") {
    const unlocked = BLOCK_SKILLS.filter(s => playerLevel >= s.unlockLevel);

    return (
      <div className={`min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-gray-900 p-3 relative overflow-hidden select-none ${shaking ? "animate-pulse" : ""}`}>
        <div className="max-w-md mx-auto">
          {/* 상단 */}
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-bold">⏱️ {formatTime(timeAlive)}/2:00</span>
            <span className="font-bold">🎯 {score}</span>
            <span>🛡️{blockedCount} ❌{missedCount}</span>
          </div>

          {/* 시간 바 */}
          <div className="bg-gray-300 rounded-full h-1.5 overflow-hidden mb-1">
            <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${(timeAlive / 120) * 100}%` }} />
          </div>

          {/* 인내심 */}
          <div className="mb-1">
            <div className="flex justify-between text-[10px]">
              <span>😤 인내심</span>
              <span className={patience < 25 ? "text-red-600 font-bold" : ""}>{Math.floor(patience)}%</span>
            </div>
            <div className="bg-gray-300 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all" style={{
                width: `${patience}%`,
                background: patience >= 60 ? "#22c55e" : patience >= 30 ? "#f59e0b" : "#dc2626",
              }} />
            </div>
          </div>

          {/* 에너지 + 아빠 기분 */}
          <div className="flex gap-2 mb-1">
            <div className="flex-1">
              <div className="flex justify-between text-[8px]"><span>⚡ 에너지</span><span>{Math.floor(energy)}</span></div>
              <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 bg-yellow-400 rounded-full" style={{ width: `${(energy / maxEnergy) * 100}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[8px]"><span>😊 아빠 기분</span><span>{Math.floor(dadMood)}</span></div>
              <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 bg-green-400 rounded-full" style={{ width: `${dadMood}%` }} />
              </div>
            </div>
          </div>

          {combo >= 3 && (
            <div className="text-center mb-1">
              <span className="text-sm font-black px-2 py-0.5 rounded-full bg-blue-500 text-white">🔥 {combo} COMBO!</span>
            </div>
          )}

          {/* 게임 영역 */}
          <div className="relative bg-white/80 rounded-xl border-2 border-gray-300 overflow-hidden" style={{ height: "35vh" }}>
            {/* 아빠 */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-center z-10">
              <div className="text-4xl">{dadFace}</div>
              <div className="text-[8px] font-bold">아빠</div>
              {dadSpeech && (
                <div className="absolute -left-24 top-0 bg-white border border-gray-300 rounded-lg px-2 py-0.5 text-[9px] font-bold shadow whitespace-nowrap">
                  {dadSpeech}
                </div>
              )}
            </div>

            {/* 나 */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-center z-10">
              <div className="text-4xl">{patience < 25 ? "😵" : patience < 50 ? "😣" : "😤"}</div>
              <div className="text-[8px] font-bold">나</div>
            </div>

            {/* 날아오는 잔소리 */}
            {flyingNags.filter(fn => !fn.missed).map(fn => (
              <button key={fn.id}
                onClick={(e) => blockNag(fn.id, e)}
                disabled={fn.blocked}
                className={`absolute transition-all ${fn.blocked ? "opacity-30 scale-75" : "hover:scale-110 cursor-pointer"}`}
                style={{
                  left: `${fn.x}%`,
                  top: `${fn.y}%`,
                  transform: "translate(-50%, -50%)",
                }}>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold text-white shadow-md whitespace-nowrap ${fn.blocked ? "" : "animate-pulse"}`}
                  style={{ backgroundColor: NAG_TYPE_COLORS[fn.nag.type] || "#666", minWidth: "60px" }}>
                  <span className="mr-1">{fn.nag.emoji}</span>
                  <span>{fn.nag.text}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 선택된 스킬 */}
          {selectedSkill && (
            <div className="text-center text-[10px] text-blue-600 font-bold mt-1">
              {selectedSkill.emoji} {selectedSkill.name}: {selectedSkill.desc}
            </div>
          )}

          {/* 스킬 선택 */}
          <div className="grid grid-cols-4 gap-1 mt-2">
            {unlocked.map(skill => {
              const onCooldown = (cooldowns[skill.id] || 0) > 0;
              const noEnergy = energy < skill.energy;
              const isSelected = selectedSkill?.id === skill.id;

              return (
                <button key={skill.id}
                  onClick={() => setSelectedSkill(skill)}
                  disabled={onCooldown || noEnergy}
                  className={`relative p-1.5 rounded-xl text-center transition-all ${
                    isSelected ? "bg-blue-100 ring-2 ring-blue-500 shadow-md" :
                    onCooldown || noEnergy ? "bg-gray-200 opacity-40" : "bg-white hover:bg-blue-50 shadow"
                  }`}>
                  {onCooldown && (
                    <div className="absolute inset-0 bg-gray-500/20 rounded-xl" />
                  )}
                  <div className="text-lg">{skill.emoji}</div>
                  <div className="text-[7px] font-bold leading-tight">{skill.name}</div>
                  <div className="text-[6px] text-gray-500">⚡{skill.energy}</div>
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
        `}</style>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result") {
    const victory = timeAlive >= 120;
    const earned = Math.floor(score / 4) + blockedCount * 2 + (victory ? 50 : 0);

    return (
      <div className={`min-h-screen bg-gradient-to-b ${victory ? "from-yellow-600 via-blue-800 to-black" : "from-gray-700 to-black"} text-white p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">{victory ? "🎉" : "😵"}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: victory ? "#fbbf24" : "#f87171" }}>
            {victory ? "입막기 성공!" : "인내심 바닥!"}
          </h2>
          <p className="text-gray-400 mb-4">
            {victory ? "2분 동안 잔소리를 막았다!" : "아빠: \"내 말 좀 들어!!\""}
          </p>

          <div className="bg-black/40 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">⏱️</div><div className="text-xl font-bold">{formatTime(timeAlive)}</div><div className="text-xs text-gray-400">버틴 시간</div></div>
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🛡️</div><div className="text-xl font-bold">{blockedCount}</div><div className="text-xs text-gray-400">막은 잔소리</div></div>
              <div><div className="text-2xl">❌</div><div className="text-xl font-bold">{missedCount}</div><div className="text-xs text-gray-400">놓친 잔소리</div></div>
              <div><div className="text-2xl">🔥</div><div className="text-xl font-bold">{maxCombo}</div><div className="text-xs text-gray-400">최대 콤보</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">코인</div></div>
            </div>
          </div>

          {timeAlive > bestTime && <div className="text-yellow-300 font-bold mb-3">⏱️ 최고 기록!</div>}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={startGame} className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl p-3 font-bold">🤐 다시!</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-gray-300 text-sm mb-4">← 뒤로</button>
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
