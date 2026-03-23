"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type UnoColor = "red" | "blue" | "green" | "yellow";
type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4" | "wild10";

interface UnoCard {
  id: number;
  type: CardType;
  color: UnoColor | null; // null for wild cards
  value?: number; // only for number cards
}

type GamePhase = "ready" | "playing" | "chooseColor" | "win" | "lose" | "stageClear" | "bossVictory";
type Turn = "player" | "ai";
type AiLevel = "supereasy" | "easy" | "medium" | "hard" | "extreme" | "superextreme" | "god";
type BossStage = 0 | 1 | 2 | 3;

interface BossData {
  name: string;
  emoji: string;
  aiLevel: AiLevel;
  playerCards: number;
  aiCards: number;
  abilityInterval: number;
  abilityName: string;
  abilityDesc: string;
}

const BOSSES: BossData[] = [
  {
    name: "늑대",
    emoji: "🐺",
    aiLevel: "supereasy",
    playerCards: 7,
    aiCards: 10,
    abilityInterval: 8,
    abilityName: "숲의 포식자",
    abilityDesc: "플레이어 카드 1장 추가 + 보스 1장 버림",
  },
  {
    name: "드래곤",
    emoji: "🐉",
    aiLevel: "medium",
    playerCards: 7,
    aiCards: 8,
    abilityInterval: 6,
    abilityName: "불의 지배자",
    abilityDesc: "현재 색을 보스 유리한 색으로 강제 변경",
  },
  {
    name: "마왕",
    emoji: "👹",
    aiLevel: "hard",
    playerCards: 10,
    aiCards: 8,
    abilityInterval: 6,
    abilityName: "최종 보스",
    abilityDesc: "플레이어에게 카드 1장 강제 추가",
  },
];

// --- Constants ---
const COLORS: UnoColor[] = ["red", "blue", "green", "yellow"];

const COLOR_NAMES: Record<UnoColor, string> = {
  red: "빨강",
  blue: "파랑",
  green: "초록",
  yellow: "노랑",
};

const COLOR_BG: Record<UnoColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
};

const COLOR_BG_HOVER: Record<UnoColor, string> = {
  red: "hover:bg-red-600",
  blue: "hover:bg-blue-600",
  green: "hover:bg-green-600",
  yellow: "hover:bg-yellow-500",
};

const COLOR_BORDER: Record<UnoColor, string> = {
  red: "border-red-300",
  blue: "border-blue-300",
  green: "border-green-300",
  yellow: "border-yellow-300",
};

const COLOR_TEXT_DARK: Record<UnoColor, string> = {
  red: "text-red-600",
  blue: "text-blue-600",
  green: "text-green-600",
  yellow: "text-yellow-600",
};

const ACTION_LABELS: Record<string, string> = {
  skip: "⊘",
  reverse: "↺",
  draw2: "+2",
  wild: "W",
  wild4: "+4",
  wild10: "+10",
};

// --- Helpers ---
let nextCardId = 0;
function makeCard(type: CardType, color: UnoColor | null, value?: number): UnoCard {
  return { id: nextCardId++, type, color, value };
}

function createDeck(): UnoCard[] {
  nextCardId = 0;
  const deck: UnoCard[] = [];

  for (const color of COLORS) {
    // One 0 per color
    deck.push(makeCard("number", color, 0));
    // Two of each 1-9
    for (let n = 1; n <= 9; n++) {
      deck.push(makeCard("number", color, n));
      deck.push(makeCard("number", color, n));
    }
    // Two of each action
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard("skip", color));
      deck.push(makeCard("reverse", color));
      deck.push(makeCard("draw2", color));
    }
  }
  // 4 Wild, 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard("wild", null));
    deck.push(makeCard("wild4", null));
  }
  // 10 Wild Draw Ten
  for (let i = 0; i < 10; i++) {
    deck.push(makeCard("wild10", null));
  }

  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardDisplayName(card: UnoCard): string {
  if (card.type === "wild") return "와일드";
  if (card.type === "wild4") return "와일드 +4";
  if (card.type === "wild10") return "와일드 +10";
  const colorName = card.color ? COLOR_NAMES[card.color] : "";
  if (card.type === "number") return `${colorName} ${card.value}`;
  if (card.type === "skip") return `${colorName} 스킵`;
  if (card.type === "reverse") return `${colorName} 리버스`;
  if (card.type === "draw2") return `${colorName} +2`;
  return "";
}

function isAttackCard(card: UnoCard): boolean {
  return card.type === "draw2" || card.type === "wild4" || card.type === "wild10";
}

function attackValue(card: UnoCard): number {
  if (card.type === "draw2") return 2;
  if (card.type === "wild4") return 4;
  if (card.type === "wild10") return 10;
  return 0;
}

function canDefend(card: UnoCard, topCard: UnoCard): boolean {
  if (!isAttackCard(card)) return false;
  // Wild10 defends anything, Wild4 defends anything, Draw2 defends Draw2
  if (card.type === "wild10") return true;
  if (card.type === "wild4") return true;
  if (card.type === "draw2" && topCard.type === "draw2") return true;
  return false;
}

export default function OneCardPage() {
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [playerHand, setPlayerHand] = useState<UnoCard[]>([]);
  const [aiHand, setAiHand] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [currentColor, setCurrentColor] = useState<UnoColor>("red");
  const [turn, setTurn] = useState<Turn>("player");
  const [attackStack, setAttackStack] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>("ready");
  const [message, setMessage] = useState("");
  const [pendingCard, setPendingCard] = useState<UnoCard | null>(null);
  const [aiLevel, setAiLevel] = useState<AiLevel>("medium");
  const [bossStage, setBossStage] = useState<BossStage>(0);
  const [bossTurnCount, setBossTurnCount] = useState(0);
  const [bossAbilityActive, setBossAbilityActive] = useState(false);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiLevelRef = useRef<AiLevel>(aiLevel);
  aiLevelRef.current = aiLevel;
  const bossStageRef = useRef<BossStage>(0);
  bossStageRef.current = bossStage;
  const bossTurnCountRef = useRef(0);
  bossTurnCountRef.current = bossTurnCount;

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  // Recycle discard pile into deck when deck runs low
  const ensureDeck = useCallback(
    (d: UnoCard[], dp: UnoCard[]): [UnoCard[], UnoCard[]] => {
      if (d.length > 0) return [d, dp];
      if (dp.length <= 1) return [d, dp];
      const top = dp[dp.length - 1];
      const recycled = shuffle(dp.slice(0, dp.length - 1));
      return [recycled, [top]];
    },
    []
  );

  const drawCards = useCallback(
    (d: UnoCard[], dp: UnoCard[], n: number): [UnoCard[], UnoCard[], UnoCard[]] => {
      const drawn: UnoCard[] = [];
      let currentDeck = d;
      let currentDiscard = dp;
      for (let i = 0; i < n; i++) {
        [currentDeck, currentDiscard] = ensureDeck(currentDeck, currentDiscard);
        if (currentDeck.length === 0) break;
        drawn.push(currentDeck[0]);
        currentDeck = currentDeck.slice(1);
      }
      return [drawn, currentDeck, currentDiscard];
    },
    [ensureDeck]
  );

  const initGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const bs = bossStageRef.current;
    let playerCards: number;
    let aiCards: number;

    if (bs > 0) {
      const boss = BOSSES[bs - 1];
      playerCards = boss.playerCards;
      aiCards = boss.aiCards;
      aiLevelRef.current = boss.aiLevel;
    } else {
      playerCards = aiLevelRef.current === "god" ? 50 : aiLevelRef.current === "superextreme" ? 35 : aiLevelRef.current === "extreme" ? 28 : aiLevelRef.current === "supereasy" ? 3 : 7;
      aiCards = aiLevelRef.current === "god" ? 1 : aiLevelRef.current === "superextreme" ? 3 : aiLevelRef.current === "supereasy" ? 12 : 7;
    }

    let d = shuffle(createDeck());
    const pHand = d.slice(0, playerCards);
    d = d.slice(playerCards);
    const aHand = d.slice(0, aiCards);
    d = d.slice(aiCards);

    // Find first number card for opening
    let openIndex = 0;
    for (let i = 0; i < d.length; i++) {
      if (d[i].type === "number") {
        openIndex = i;
        break;
      }
    }
    const openCard = d[openIndex];
    d = [...d.slice(0, openIndex), ...d.slice(openIndex + 1)];

    setDeck(d);
    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([openCard]);
    setCurrentColor(openCard.color!);
    setTurn("player");
    setAttackStack(0);
    setGamePhase("playing");
    setBossTurnCount(0);
    bossTurnCountRef.current = 0;
    setBossAbilityActive(false);
    if (bossStageRef.current > 0) {
      const boss = BOSSES[bossStageRef.current - 1];
      setMessage(`Stage ${bossStageRef.current} — ${boss.emoji} ${boss.name} (${boss.abilityName}) 등장! 🎯`);
    } else {
      setMessage("내 차례! 카드를 골라보세요! 🎯");
    }
    setPendingCard(null);
  }, []);

  const initBossMode = useCallback(() => {
    setBossStage(1);
    bossStageRef.current = 1;
    initGame();
  }, [initGame]);

  const advanceBossStage = useCallback(() => {
    const nextStage = (bossStageRef.current + 1) as BossStage;
    setBossStage(nextStage);
    bossStageRef.current = nextStage;
    initGame();
  }, [initGame]);

  // Check if card can be played
  const canPlayCard = useCallback(
    (card: UnoCard): boolean => {
      if (!topCard) return false;

      // Under attack
      if (attackStack > 0) {
        return canDefend(card, topCard);
      }

      // Wild cards can always be played
      if (card.type === "wild" || card.type === "wild4" || card.type === "wild10") return true;

      // Same color
      if (card.color === currentColor) return true;

      // Same type + value for number cards
      if (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
        return true;

      // Same action type
      if (
        card.type !== "number" &&
        card.type === topCard.type
      )
        return true;

      return false;
    },
    [topCard, currentColor, attackStack]
  );

  // Schedule AI turn
  const scheduleAiTurn = useCallback(
    (
      newDeck: UnoCard[],
      newPlayerHand: UnoCard[],
      newAiHand: UnoCard[],
      newDiscardPile: UnoCard[],
      newCurrentColor: UnoColor,
      newAttackStack: number
    ) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiTimerRef.current = setTimeout(() => {
        runAiTurn(newDeck, newPlayerHand, newAiHand, newDiscardPile, newCurrentColor, newAttackStack);
      }, 1000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // AI turn logic
  const runAiTurn = useCallback(
    (
      curDeck: UnoCard[],
      curPlayerHand: UnoCard[],
      curAiHand: UnoCard[],
      curDiscardPile: UnoCard[],
      curColor: UnoColor,
      curAttack: number
    ) => {
      const tp = curDiscardPile[curDiscardPile.length - 1];
      if (!tp) return;
      const level = aiLevelRef.current;

      // Boss ability helper — called when AI turn ends and control returns to player
      const checkBossAbility = (
        d: UnoCard[], dp: UnoCard[], ph: UnoCard[], ah: UnoCard[], col: UnoColor
      ): { deck: UnoCard[]; discard: UnoCard[]; playerHand: UnoCard[]; aiHand: UnoCard[]; color: UnoColor; msg: string; fired: boolean } => {
        const bs = bossStageRef.current;
        if (bs <= 0) return { deck: d, discard: dp, playerHand: ph, aiHand: ah, color: col, msg: "", fired: false };
        const btc = bossTurnCountRef.current + 1;
        bossTurnCountRef.current = btc;
        setBossTurnCount(btc);
        const boss = BOSSES[bs - 1];
        if (btc % boss.abilityInterval !== 0) return { deck: d, discard: dp, playerHand: ph, aiHand: ah, color: col, msg: "", fired: false };
        setBossAbilityActive(true);
        setTimeout(() => setBossAbilityActive(false), 2000);
        if (bs === 1) {
          const [drawn, nd, ndp] = drawCards(d, dp, 1);
          let nah = ah;
          if (ah.length > 1) {
            const ri = Math.floor(Math.random() * ah.length);
            nah = [...ah.slice(0, ri), ...ah.slice(ri + 1)];
          }
          return { deck: nd, discard: ndp, playerHand: [...ph, ...drawn], aiHand: nah, color: col, msg: `🐺 늑대 능력! 카드 1장 추가 & 보스 1장 버림!`, fired: true };
        } else if (bs === 2) {
          const cc: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
          for (const c of ah) { if (c.color) cc[c.color]++; }
          const bestColor = (Object.entries(cc).sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;
          return { deck: d, discard: dp, playerHand: ph, aiHand: ah, color: bestColor, msg: `🐉 드래곤 능력! 색이 ${COLOR_NAMES[bestColor]}으로 변경!`, fired: true };
        } else if (bs === 3) {
          const [drawn, nd, ndp] = drawCards(d, dp, 1);
          return { deck: nd, discard: ndp, playerHand: [...ph, ...drawn], aiHand: ah, color: col, msg: `👹 마왕 능력! 카드 1장 강제 추가!`, fired: true };
        }
        return { deck: d, discard: dp, playerHand: ph, aiHand: ah, color: col, msg: "", fired: false };
      };

      // Find playable cards
      const playable = curAiHand.filter((card) => {
        if (curAttack > 0) return canDefend(card, tp);
        if (card.type === "wild" || card.type === "wild4" || card.type === "wild10") return true;
        if (card.color === curColor) return true;
        if (card.type === "number" && tp.type === "number" && card.value === tp.value) return true;
        if (card.type !== "number" && card.type === tp.type) return true;
        return false;
      });

      if (playable.length === 0) {
        if (curAttack > 0) {
          const [drawn, newDeck, newDiscard] = drawCards(curDeck, curDiscardPile, curAttack);
          const newAiHand2 = [...curAiHand, ...drawn];
          const ba = checkBossAbility(newDeck, newDiscard, curPlayerHand, newAiHand2, curColor);
          setDeck(ba.deck);
          setAiHand(ba.aiHand);
          setPlayerHand(ba.playerHand);
          setDiscardPile(ba.discard);
          setCurrentColor(ba.color);
          setAttackStack(0);
          setTurn("player");
          setMessage(ba.fired ? `AI가 ${curAttack}장을 받았어요! ${ba.msg}` : `AI가 ${curAttack}장을 받았어요! 😆 내 차례!`);
        } else {
          const [drawn, newDeck, newDiscard] = drawCards(curDeck, curDiscardPile, 1);
          const newAiHand2 = [...curAiHand, ...drawn];
          const ba = checkBossAbility(newDeck, newDiscard, curPlayerHand, newAiHand2, curColor);
          setDeck(ba.deck);
          setAiHand(ba.aiHand);
          setPlayerHand(ba.playerHand);
          setDiscardPile(ba.discard);
          setCurrentColor(ba.color);
          setTurn("player");
          setMessage(ba.fired ? `AI가 카드를 뽑았어요. ${ba.msg}` : "AI가 카드를 한 장 뽑았어요. 내 차례! 🎯");
        }
        return;
      }

      // --- Super Easy AI: 슈퍼쉬움 🍼 ---
      // Almost never defends, never uses attack cards, prefers high-value number cards (bad strategy)
      const pickSuperEasy = (): UnoCard => {
        if (curAttack > 0) {
          // Almost never defends — 90% chance to just take cards
          return playable[0]; // will be overridden by skipDefense
        }
        // Never use attack or wild cards if possible
        const numbers = playable.filter((c) => c.type === "number");
        if (numbers.length > 0) {
          // Pick highest value number (worst strategy — keeps low cards)
          numbers.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
          return numbers[0];
        }
        return playable[Math.floor(Math.random() * playable.length)];
      };

      // --- Easy AI: 하수 🐣 ---
      // Random picks, sometimes wastes wilds, 30% skip defense
      const pickEasy = (): UnoCard => {
        if (curAttack > 0) {
          // 30% chance to just give up and take the cards
          if (Math.random() < 0.3) return playable[0]; // will be overridden by skipDefense
          return playable[Math.floor(Math.random() * playable.length)];
        }
        return playable[Math.floor(Math.random() * playable.length)];
      };

      // --- Medium AI: 중수 🦊 ---
      // Action first, then numbers, save wilds
      const pickMedium = (): UnoCard => {
        if (curAttack > 0) {
          const d2 = playable.filter((c) => c.type === "draw2");
          const w4 = playable.filter((c) => c.type === "wild4");
          const w10 = playable.filter((c) => c.type === "wild10");
          if (d2.length > 0) return d2[0];
          if (w4.length > 0) return w4[0];
          if (w10.length > 0) return w10[0];
          return playable[0];
        }
        const actions = playable.filter(
          (c) => c.type === "skip" || c.type === "reverse" || c.type === "draw2"
        );
        const numbers = playable.filter((c) => c.type === "number");
        const sameColorNums = numbers.filter((c) => c.color === curColor);
        const wilds = playable.filter((c) => c.type === "wild");
        const wild4s = playable.filter((c) => c.type === "wild4");
        const wild10s = playable.filter((c) => c.type === "wild10");

        if (actions.length > 0) return actions[0];
        if (sameColorNums.length > 0) return sameColorNums[0];
        if (numbers.length > 0) return numbers[0];
        if (wilds.length > 0) return wilds[0];
        if (wild4s.length > 0) return wild4s[0];
        if (wild10s.length > 0) return wild10s[0];
        return playable[0];
      };

      // --- Hard AI: 고수 🦁 ---
      // Score-based with strategic depth
      const pickHard = (): UnoCard => {
        if (curAttack > 0) {
          // Stack as much as possible; prefer draw2 (save wild4/wild10 for offense)
          const d2 = playable.filter((c) => c.type === "draw2");
          const w4 = playable.filter((c) => c.type === "wild4");
          const w10 = playable.filter((c) => c.type === "wild10");
          // If attack is already big (≥6), stack wild10 for devastating damage
          if (curAttack >= 6 && w10.length > 0) return w10[0];
          // If attack is already big (≥4), stack wild4 for massive damage
          if (curAttack >= 4 && w4.length > 0) return w4[0];
          return d2.length > 0 ? d2[0] : playable[0];
        }

        const playerCount = curPlayerHand.length;
        const myHandAfter = curAiHand.length - 1; // hand size after playing

        // Count colors in our hand (excluding the card we might play)
        const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of curAiHand) {
          if (c.color) colorCounts[c.color]++;
        }
        const dominantColor = (Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;

        // Score each playable card
        const scored = playable.map((card) => {
          let score = 0;

          // === Base type scores ===
          if (card.type === "number") {
            score = 10 + (card.value ?? 0); // prefer high numbers (reduce penalty)
          } else if (card.type === "skip" || card.type === "reverse") {
            // Extra turn cards: much better when opponent is close to winning
            score = playerCount <= 3 ? 55 : 25;
          } else if (card.type === "draw2") {
            score = playerCount <= 3 ? 60 : 30;
          } else if (card.type === "wild") {
            // Save wilds for emergencies; use if opponent is winning
            score = playerCount <= 2 ? 45 : (myHandAfter <= 2 ? 40 : 5);
          } else if (card.type === "wild4") {
            // Most powerful card — save unless critical
            score = playerCount <= 2 ? 75 : (myHandAfter <= 2 ? 50 : 3);
          } else if (card.type === "wild10") {
            // Ultimate weapon — save for devastating moments
            score = playerCount <= 2 ? 90 : (myHandAfter <= 2 ? 60 : 1);
          }

          // === Color strategy ===
          if (card.color) {
            // Bonus for steering to our dominant color
            if (card.color === dominantColor) {
              score += 12;
            }
            // Bonus for playing from non-dominant colors (save dominant for chains)
            const cardColorCount = colorCounts[card.color];
            if (card.type === "number" && cardColorCount <= 2) {
              score += 6; // shed rare colors first
            }
          }

          // === Endgame bonus ===
          // If we're about to call UNO (2 cards left), prefer non-wild
          if (curAiHand.length === 2 && (card.type === "wild" || card.type === "wild4" || card.type === "wild10")) {
            score -= 10; // prefer colored card for UNO so we're less predictable
          }

          return { card, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].card;
      };

      // --- Extreme AI: 익스트림 👹 ---
      // Hard strategy + multi-turn lookahead + combo awareness
      const pickExtreme = (): UnoCard => {
        if (curAttack > 0) {
          // Always stack if possible; prefer wild10 for maximum devastation
          const w10 = playable.filter((c) => c.type === "wild10");
          const w4 = playable.filter((c) => c.type === "wild4");
          const d2 = playable.filter((c) => c.type === "draw2");
          if (w10.length > 0) return w10[0]; // ultimate pain
          if (w4.length > 0) return w4[0]; // max pain
          return d2.length > 0 ? d2[0] : playable[0];
        }

        const playerCount = curPlayerHand.length;
        const myCount = curAiHand.length;

        // Color analysis
        const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        const colorActions: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of curAiHand) {
          if (c.color) {
            colorCounts[c.color]++;
            if (c.type !== "number") colorActions[c.color]++;
          }
        }
        const dominantColor = (Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;

        // Track what colors player might be weak in (colors they drew/couldn't play)
        const discardColors: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const dc of curDiscardPile) {
          if (dc.color) discardColors[dc.color]++;
        }

        const scored = playable.map((card) => {
          let score = 0;

          // === AGGRESSIVE ATTACK when player is close to winning ===
          if (playerCount <= 2) {
            // Emergency mode: throw everything we have
            if (card.type === "wild10") score += 120;
            if (card.type === "wild4") score += 100;
            if (card.type === "draw2") score += 90;
            if (card.type === "skip" || card.type === "reverse") score += 85;
            if (card.type === "wild") score += 70;
            if (card.type === "number") score += 10;
          } else if (playerCount <= 4) {
            if (card.type === "wild10") score += 80;
            if (card.type === "skip" || card.type === "reverse") score += 65;
            if (card.type === "draw2") score += 70;
            if (card.type === "wild4") score += 60;
            if (card.type === "wild") score += 40;
            if (card.type === "number") score += 15 + (card.value ?? 0);
          } else {
            // Normal play: be strategic
            if (card.type === "number") {
              score += 15 + (card.value ?? 0);
            } else if (card.type === "skip" || card.type === "reverse") {
              score += 30;
            } else if (card.type === "draw2") {
              score += 35;
            } else if (card.type === "wild") {
              // Save for when we really need color change
              score += myCount <= 3 ? 40 : 3;
            } else if (card.type === "wild4") {
              // Save for critical moments
              score += myCount <= 3 ? 50 : 2;
            } else if (card.type === "wild10") {
              // Ultimate weapon — save for devastating moments
              score += myCount <= 3 ? 60 : 1;
            }
          }

          // === COMBO AWARENESS ===
          // Check if playing this card sets up a chain (next card can also be played)
          if (card.color) {
            const remaining = curAiHand.filter((c) => c.id !== card.id);
            const followUps = remaining.filter(
              (c) => c.color === card.color || (c.type === card.type && c.type !== "number") ||
                (c.type === "number" && card.type === "number" && c.value === card.value)
            );
            score += followUps.length * 5; // more follow-ups = better
          }

          // === COLOR DOMINANCE ===
          if (card.color) {
            if (card.color === dominantColor) {
              score += 15; // steer toward our strongest color
            }
            // Shed colors where we only have 1 card (dead weight)
            if (colorCounts[card.color] === 1 && card.type === "number") {
              score += 8;
            }
            // Bonus if this color has action cards we can chain later
            score += colorActions[card.color] * 2;
          }

          // === COUNTER-INTELLIGENCE ===
          // If we can change to a color the player has been struggling with
          // (colors they played a lot of = they might be running out)
          if (card.color) {
            const playerDiscardRatio = discardColors[card.color] / Math.max(curDiscardPile.length, 1);
            if (playerDiscardRatio > 0.3) score += 5; // player dumped this color = likely weak
          }

          // === ENDGAME OPTIMIZATION ===
          if (myCount === 2) {
            // About to call UNO - prefer colored cards (harder to block)
            if (card.type === "wild" || card.type === "wild4" || card.type === "wild10") score -= 15;
            // Prefer action cards for UNO (skip/reverse = instant win potential)
            if (card.type === "skip" || card.type === "reverse") score += 20;
          }

          return { card, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].card;
      };

      // --- Super Extreme AI: 슈퍼익스트림 ☠️ ---
      // Perfect play + always attacks + reads player hand patterns + never wastes cards
      const pickSuperExtreme = (): UnoCard => {
        if (curAttack > 0) {
          // Always stack for maximum devastation; prefer highest attack value
          const w10 = playable.filter((c) => c.type === "wild10");
          const w4 = playable.filter((c) => c.type === "wild4");
          const d2 = playable.filter((c) => c.type === "draw2");
          if (w10.length > 0) return w10[0];
          if (w4.length > 0) return w4[0];
          return d2.length > 0 ? d2[0] : playable[0];
        }

        const playerCount = curPlayerHand.length;
        const myCount = curAiHand.length;

        // Deep color analysis
        const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        const colorActions: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        const colorAttacks: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of curAiHand) {
          if (c.color) {
            colorCounts[c.color]++;
            if (c.type !== "number") colorActions[c.color]++;
            if (c.type === "draw2") colorAttacks[c.color]++;
          }
        }
        const dominantColor = (Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;

        // Analyze discard pile to predict player weakness
        const discardColors: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const dc of curDiscardPile) {
          if (dc.color) discardColors[dc.color]++;
        }
        // Color the player likely DOESN'T have (least played by player)
        const playerWeakColor = (Object.entries(discardColors)
          .sort((a, b) => a[1] - b[1])[0][0]) as UnoColor;

        const scored = playable.map((card) => {
          let score = 0;

          // === ALWAYS AGGRESSIVE — attack relentlessly ===
          if (playerCount <= 1) {
            // DESPERATION: player about to win — full nuclear
            if (card.type === "wild10") score += 200;
            if (card.type === "wild4") score += 180;
            if (card.type === "draw2") score += 160;
            if (card.type === "skip" || card.type === "reverse") score += 150;
            if (card.type === "wild") score += 130;
            if (card.type === "number") score += 5;
          } else if (playerCount <= 3) {
            if (card.type === "wild10") score += 140;
            if (card.type === "wild4") score += 120;
            if (card.type === "draw2") score += 100;
            if (card.type === "skip" || card.type === "reverse") score += 95;
            if (card.type === "wild") score += 80;
            if (card.type === "number") score += 10;
          } else {
            // Even in normal play, prefer attacks
            if (card.type === "wild10") score += myCount <= 4 ? 90 : 40;
            if (card.type === "wild4") score += myCount <= 4 ? 75 : 35;
            if (card.type === "draw2") score += 50;
            if (card.type === "skip" || card.type === "reverse") score += 45;
            if (card.type === "wild") score += myCount <= 3 ? 40 : 10;
            if (card.type === "number") score += 15 + (card.value ?? 0);
          }

          // === DEEP COMBO ANALYSIS ===
          if (card.color) {
            const remaining = curAiHand.filter((c) => c.id !== card.id);
            // Chain potential: same color or same type
            const followUps = remaining.filter(
              (c) => c.color === card.color || (c.type === card.type && c.type !== "number") ||
                (c.type === "number" && card.type === "number" && c.value === card.value)
            );
            score += followUps.length * 8;
            // Attack chain: if follow-up includes attack cards
            const attackFollowUps = followUps.filter((c) => isAttackCard(c) || c.type === "skip" || c.type === "reverse");
            score += attackFollowUps.length * 12;
          }

          // === AGGRESSIVE COLOR CONTROL ===
          if (card.color) {
            if (card.color === dominantColor) score += 20;
            if (card.color === playerWeakColor) score += 15;
            if (colorCounts[card.color] === 1 && card.type === "number") score += 10;
            score += colorActions[card.color] * 4;
            score += colorAttacks[card.color] * 6;
          }

          // === ENDGAME PERFECTION ===
          if (myCount === 2) {
            if (card.type === "skip" || card.type === "reverse") score += 40;
            if (card.type === "draw2") score += 35;
            if (card.type === "wild" || card.type === "wild4" || card.type === "wild10") score -= 20;
          }

          return { card, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].card;
      };

      // --- GOD AI: 슈퍼x5 익스트림 9999999999999999999 💀🔥 ---
      // Omniscient AI: sees everything, always attacks, skip/reverse chains, x10 penalty
      const pickGod = (): UnoCard => {
        if (curAttack > 0) {
          // Always stack — pick the highest damage card
          const w10 = playable.filter((c) => c.type === "wild10");
          const w4 = playable.filter((c) => c.type === "wild4");
          const d2 = playable.filter((c) => c.type === "draw2");
          if (w10.length > 0) return w10[0];
          if (w4.length > 0) return w4[0];
          return d2.length > 0 ? d2[0] : playable[0];
        }

        const playerCount = curPlayerHand.length;
        const myCount = curAiHand.length;

        // Full hand analysis
        const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        const colorActions: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of curAiHand) {
          if (c.color) {
            colorCounts[c.color]++;
            if (c.type !== "number") colorActions[c.color]++;
          }
        }
        const dominantColor = (Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;

        // Predict player's weakest color from discard history
        const discardColors: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const dc of curDiscardPile) {
          if (dc.color) discardColors[dc.color]++;
        }
        const playerWeakColor = (Object.entries(discardColors)
          .sort((a, b) => a[1] - b[1])[0][0]) as UnoColor;

        const scored = playable.map((card) => {
          let score = 0;

          // === GOD MODE: ALWAYS MAXIMUM AGGRESSION ===
          // Attack cards are ALWAYS top priority regardless of game state
          if (card.type === "wild10") score += 300;
          else if (card.type === "wild4") score += 250;
          else if (card.type === "draw2") score += 200;
          else if (card.type === "skip" || card.type === "reverse") score += 180;
          else if (card.type === "wild") score += 150;
          else if (card.type === "number") score += 5 + (card.value ?? 0);

          // Emergency multiplier when player is close
          if (playerCount <= 3) {
            if (isAttackCard(card)) score *= 2;
            if (card.type === "skip" || card.type === "reverse") score *= 2;
          }

          // === PERFECT COMBO CHAINS ===
          if (card.color) {
            const remaining = curAiHand.filter((c) => c.id !== card.id);
            const followUps = remaining.filter(
              (c) => c.color === card.color || (c.type === card.type && c.type !== "number") ||
                (c.type === "number" && card.type === "number" && c.value === card.value)
            );
            const attackFollowUps = followUps.filter((c) =>
              isAttackCard(c) || c.type === "skip" || c.type === "reverse"
            );
            score += followUps.length * 15;
            score += attackFollowUps.length * 30;
          }

          // === COLOR WARFARE ===
          if (card.color) {
            if (card.color === dominantColor) score += 25;
            if (card.color === playerWeakColor) score += 20;
            score += colorActions[card.color] * 8;
          }

          // === INSTANT WIN SETUP ===
          if (myCount === 2) {
            if (card.type === "skip" || card.type === "reverse") score += 500;
            if (card.type === "draw2") score += 400;
          }
          if (myCount === 1) {
            score += 1000; // play anything to win
          }

          return { card, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].card;
      };

      // Super Easy AI: 90% chance to skip defense and just take cards
      if (level === "supereasy" && curAttack > 0 && Math.random() < 0.9) {
        const [drawn, newDeck, newDiscard] = drawCards(curDeck, curDiscardPile, curAttack);
        const newAiHand2 = [...curAiHand, ...drawn];
        const ba = checkBossAbility(newDeck, newDiscard, curPlayerHand, newAiHand2, curColor);
        setDeck(ba.deck);
        setAiHand(ba.aiHand);
        setPlayerHand(ba.playerHand);
        setDiscardPile(ba.discard);
        setCurrentColor(ba.color);
        setAttackStack(0);
        setTurn("player");
        setMessage(ba.fired ? `AI가 ${curAttack}장을 받았어요! ${ba.msg}` : `AI가 ${curAttack}장을 받았어요! 😆 내 차례!`);
        return;
      }

      // Super Easy AI: 60% chance to draw even when playable cards exist
      if (level === "supereasy" && curAttack === 0 && Math.random() < 0.6) {
        const [drawn, newDeck, newDiscard] = drawCards(curDeck, curDiscardPile, 1);
        const newAiHand2 = [...curAiHand, ...drawn];
        const ba = checkBossAbility(newDeck, newDiscard, curPlayerHand, newAiHand2, curColor);
        setDeck(ba.deck);
        setAiHand(ba.aiHand);
        setPlayerHand(ba.playerHand);
        setDiscardPile(ba.discard);
        setCurrentColor(ba.color);
        setTurn("player");
        setMessage(ba.fired ? `AI가 카드를 뽑았어요. ${ba.msg}` : "AI가 카드를 한 장 뽑았어요. 내 차례! 🎯");
        return;
      }

      // Easy AI: 30% chance to skip defense and just take cards
      if (level === "easy" && curAttack > 0 && Math.random() < 0.3) {
        const [drawn, newDeck, newDiscard] = drawCards(curDeck, curDiscardPile, curAttack);
        const newAiHand2 = [...curAiHand, ...drawn];
        const ba = checkBossAbility(newDeck, newDiscard, curPlayerHand, newAiHand2, curColor);
        setDeck(ba.deck);
        setAiHand(ba.aiHand);
        setPlayerHand(ba.playerHand);
        setDiscardPile(ba.discard);
        setCurrentColor(ba.color);
        setAttackStack(0);
        setTurn("player");
        setMessage(ba.fired ? `AI가 ${curAttack}장을 받았어요! ${ba.msg}` : `AI가 ${curAttack}장을 받았어요! 😆 내 차례!`);
        return;
      }

      let chosen: UnoCard;
      if (level === "supereasy") chosen = pickSuperEasy();
      else if (level === "easy") chosen = pickEasy();
      else if (level === "god") chosen = pickGod();
      else if (level === "superextreme") chosen = pickSuperExtreme();
      else if (level === "extreme") chosen = pickExtreme();
      else if (level === "hard") chosen = pickHard();
      else chosen = pickMedium();

      // Remove from hand
      const idx = curAiHand.findIndex((c) => c.id === chosen.id);
      const newAiHand = [...curAiHand.slice(0, idx), ...curAiHand.slice(idx + 1)];
      const newDiscardPile = [...curDiscardPile, chosen];

      // Check win
      if (newAiHand.length === 0) {
        setAiHand(newAiHand);
        setDiscardPile(newDiscardPile);
        setGamePhase("lose");
        if (bossStageRef.current > 0) {
          const boss = BOSSES[bossStageRef.current - 1];
          setMessage(`${boss.emoji} ${boss.name}에게 패배! Stage 1부터 다시 도전하세요! 💪`);
        } else {
          setMessage("AI가 이겼어요! 다음엔 꼭 이기자! 💪");
        }
        return;
      }

      // UNO call
      const unoMsg = newAiHand.length === 1 ? " 🔔 AI: 우노!" : "";

      let newColor = curColor;
      let newAttack = curAttack;
      let nextTurn: Turn = "player";

      // Color picking for wild cards depends on difficulty
      const pickWildColor = (): UnoColor => {
        if (level === "supereasy" || level === "easy") {
          // Random color
          return COLORS[Math.floor(Math.random() * COLORS.length)];
        }
        // Medium & Hard: pick color with most cards
        const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of newAiHand) {
          if (c.color) colorCounts[c.color]++;
        }
        if (level === "hard" || level === "extreme" || level === "superextreme" || level === "god") {
          // Hard/Extreme/SuperExtreme: also give slight bonus to colors player might NOT have
          const discardColors: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
          for (const dc of curDiscardPile) {
            if (dc.color) discardColors[dc.color]++;
          }
          const mult = level === "god" ? 6 : level === "superextreme" ? 5 : level === "extreme" ? 4 : 3;
          for (const col of COLORS) {
            colorCounts[col] = colorCounts[col] * mult + discardColors[col];
          }
          // Extreme/SuperExtreme: also consider action cards we have in each color
          if (level === "extreme" || level === "superextreme" || level === "god") {
            for (const c of newAiHand) {
              if (c.color && c.type !== "number") colorCounts[c.color] += (level === "god" ? 6 : level === "superextreme" ? 4 : 2);
            }
          }
        }
        return (Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0]) as UnoColor;
      };

      if (isAttackCard(chosen)) {
        newAttack = curAttack + attackValue(chosen);
        if (chosen.type === "wild10") {
          newColor = pickWildColor();
          setMessage(`AI가 와일드 +10을 냈어요! 💀 ${COLOR_NAMES[newColor]}으로 변경! (누적 ${newAttack}장)${unoMsg}`);
        } else if (chosen.type === "wild4") {
          newColor = pickWildColor();
          setMessage(`AI가 와일드 +4를 냈어요! ${COLOR_NAMES[newColor]}으로 변경! (누적 ${newAttack}장)${unoMsg}`);
        } else {
          newColor = chosen.color!;
          setMessage(`AI가 ${cardDisplayName(chosen)}을 냈어요! (누적 ${newAttack}장)${unoMsg}`);
        }
      } else if (chosen.type === "skip") {
        nextTurn = "ai";
        newColor = chosen.color!;
        setMessage(`AI가 스킵을 냈어요! 😜 내 턴을 건너뛰어요!${unoMsg}`);
      } else if (chosen.type === "reverse") {
        nextTurn = "ai";
        newColor = chosen.color!;
        setMessage(`AI가 리버스! 🔄 AI가 한 번 더!${unoMsg}`);
      } else if (chosen.type === "wild") {
        newColor = pickWildColor();
        setMessage(`AI가 와일드! ${COLOR_NAMES[newColor]}으로 변경!${unoMsg}`);
      } else {
        newColor = chosen.color!;
        setMessage(`AI가 ${cardDisplayName(chosen)}을 냈어요.${unoMsg}`);
      }

      if (nextTurn === "player") {
        const ba = checkBossAbility(curDeck, newDiscardPile, curPlayerHand, newAiHand, newColor);
        setAiHand(ba.aiHand);
        setPlayerHand(ba.playerHand);
        setDiscardPile(ba.discard);
        setCurrentColor(ba.color);
        setAttackStack(newAttack);
        setDeck(ba.deck);
        setTurn("player");
        if (ba.fired) setMessage((prev) => prev + ` | ${ba.msg}`);
      } else {
        setAiHand(newAiHand);
        setDiscardPile(newDiscardPile);
        setCurrentColor(newColor);
        setAttackStack(newAttack);
        setDeck(curDeck);
        setTurn(nextTurn);
        scheduleAiTurn(curDeck, curPlayerHand, newAiHand, newDiscardPile, newColor, newAttack);
      }
    },
    [drawCards, scheduleAiTurn]
  );

  // Player plays a card
  const playCard = (card: UnoCard) => {
    if (turn !== "player" || gamePhase !== "playing") return;
    if (!canPlayCard(card)) return;

    // Wild cards → choose color
    if (card.type === "wild" || card.type === "wild4" || card.type === "wild10") {
      setPendingCard(card);
      setGamePhase("chooseColor");
      return;
    }

    executePlay(card, null);
  };

  const executePlay = (card: UnoCard, chosenColor: UnoColor | null) => {
    const idx = playerHand.findIndex((c) => c.id === card.id);
    const newPlayerHand = [...playerHand.slice(0, idx), ...playerHand.slice(idx + 1)];
    const newDiscardPile = [...discardPile, card];

    if (newPlayerHand.length === 0) {
      setPlayerHand(newPlayerHand);
      setDiscardPile(newDiscardPile);
      const bs = bossStageRef.current;
      if (bs > 0 && bs < 3) {
        setGamePhase("stageClear");
        setMessage(`Stage ${bs} 클리어! ${BOSSES[bs - 1].emoji} ${BOSSES[bs - 1].name}을(를) 물리쳤어요!`);
      } else if (bs === 3) {
        setGamePhase("bossVictory");
        setMessage("모든 보스를 물리쳤어요! 🎉🏆");
      } else {
        setGamePhase("win");
        setMessage("내가 이겼다! 🎉🏆");
      }
      return;
    }

    const unoMsg = newPlayerHand.length === 1 ? " 🔔 우노!" : "";

    let newColor = currentColor;
    let newAttack = attackStack;
    let nextTurn: Turn = "ai";

    if (isAttackCard(card)) {
      newAttack = attackStack + attackValue(card);
      if (card.type === "wild10") {
        newColor = chosenColor!;
        setMessage(`와일드 +10! 💀 ${COLOR_NAMES[newColor]}! (누적 ${newAttack}장)${unoMsg}`);
      } else if (card.type === "wild4") {
        newColor = chosenColor!;
        setMessage(`와일드 +4! ${COLOR_NAMES[newColor]}! (누적 ${newAttack}장)${unoMsg}`);
      } else {
        newColor = card.color!;
        setMessage(`${cardDisplayName(card)}! (누적 ${newAttack}장)${unoMsg}`);
      }
    } else if (card.type === "skip") {
      nextTurn = "player";
      newColor = card.color!;
      setMessage(`스킵! 😎 한 번 더!${unoMsg}`);
    } else if (card.type === "reverse") {
      nextTurn = "player";
      newColor = card.color!;
      setMessage(`리버스! 🔄 한 번 더!${unoMsg}`);
    } else if (card.type === "wild") {
      newColor = chosenColor!;
      setMessage(`와일드! ${COLOR_NAMES[newColor]}으로 변경!${unoMsg}`);
    } else {
      newColor = card.color!;
      setMessage(`${cardDisplayName(card)}!${unoMsg}`);
    }

    setPlayerHand(newPlayerHand);
    setDiscardPile(newDiscardPile);
    setCurrentColor(newColor);
    setAttackStack(newAttack);
    setTurn(nextTurn);

    if (nextTurn === "ai") {
      scheduleAiTurn(deck, newPlayerHand, aiHand, newDiscardPile, newColor, newAttack);
    }
  };

  const chooseColor = (color: UnoColor) => {
    if (!pendingCard) return;
    setGamePhase("playing");
    executePlay(pendingCard, color);
    setPendingCard(null);
  };

  // Player draws
  const handleDraw = () => {
    if (turn !== "player" || gamePhase !== "playing") return;

    if (attackStack > 0) {
      const penalty = aiLevel === "god" ? attackStack * 10 : aiLevel === "superextreme" ? attackStack * 3 : aiLevel === "extreme" ? attackStack * 2 : attackStack;
      const [drawn, newDeck, newDiscard] = drawCards(deck, discardPile, penalty);
      setPlayerHand([...playerHand, ...drawn]);
      setDeck(newDeck);
      setDiscardPile(newDiscard);
      setAttackStack(0);
      setTurn("ai");
      setMessage(
        aiLevel === "god"
          ? `${attackStack}장 x10 = ${drawn.length}장!!! 💀🔥🔥🔥 끝이다!!!`
          : aiLevel === "superextreme"
          ? `${attackStack}장 x3 = ${drawn.length}장을 받았어요! ☠️💀💀`
          : aiLevel === "extreme"
          ? `${attackStack}장 x2 = ${drawn.length}장을 받았어요! 👹💀`
          : `${drawn.length}장을 받았어요! 😅`
      );
      scheduleAiTurn(newDeck, [...playerHand, ...drawn], aiHand, newDiscard, currentColor, 0);
    } else {
      const [drawn, newDeck, newDiscard] = drawCards(deck, discardPile, 1);
      if (drawn.length === 0) {
        setMessage("더 뽑을 카드가 없어요!");
        return;
      }
      setPlayerHand([...playerHand, ...drawn]);
      setDeck(newDeck);
      setDiscardPile(newDiscard);
      setTurn("ai");
      setMessage("카드를 한 장 뽑았어요.");
      scheduleAiTurn(newDeck, [...playerHand, ...drawn], aiHand, newDiscard, currentColor, 0);
    }
  };

  // --- Render ---
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950 text-white">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-indigo-800 bg-indigo-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-indigo-300 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold">
            <span className="text-red-400">U</span>
            <span className="text-yellow-400">N</span>
            <span className="text-green-400">O</span>
            <span className="ml-1">🦁</span>
          </span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-24 pb-8">
        {/* --- READY SCREEN --- */}
        {gamePhase === "ready" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div className="text-center">
              <div className="mb-4 flex justify-center gap-2 text-6xl">
                <span className="inline-block -rotate-12 rounded-xl bg-red-500 px-3 py-1 text-4xl font-black text-white shadow-lg">U</span>
                <span className="inline-block rotate-6 rounded-xl bg-yellow-400 px-3 py-1 text-4xl font-black text-white shadow-lg">N</span>
                <span className="inline-block -rotate-3 rounded-xl bg-green-500 px-3 py-1 text-4xl font-black text-white shadow-lg">O</span>
              </div>
              <p className="mb-1 text-lg text-indigo-200">
                AI와 신나는 우노 대결! 🤖
              </p>
              <p className="text-sm text-indigo-400">
                먼저 카드를 다 내면 승리!
              </p>
            </div>

            {/* Difficulty selector */}
            <div className="w-full max-w-md">
              <p className="mb-3 text-center text-sm font-bold text-indigo-300">AI 난이도를 선택하세요</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {([
                  { level: "supereasy" as AiLevel, emoji: "🍼", label: "슈퍼쉬움", desc: "카드 3장!", color: "from-sky-300 to-cyan-400" },
                  { level: "easy" as AiLevel, emoji: "🐣", label: "하수", desc: "쉬워요!", color: "from-green-400 to-emerald-500" },
                  { level: "medium" as AiLevel, emoji: "🦊", label: "중수", desc: "제법 잘해요", color: "from-yellow-400 to-orange-500" },
                  { level: "hard" as AiLevel, emoji: "🦁", label: "고수", desc: "무서워요!", color: "from-red-500 to-rose-600" },
                  { level: "extreme" as AiLevel, emoji: "👹", label: "익스트림", desc: "카드 28장!", color: "from-purple-600 to-fuchsia-600" },
                  { level: "superextreme" as AiLevel, emoji: "☠️", label: "슈퍼익스트림", desc: "카드 35장! x3!", color: "from-red-900 to-black" },
                  { level: "god" as AiLevel, emoji: "💀🔥", label: "슈퍼x5", desc: "50장! x10! 불가능!", color: "from-red-600 via-yellow-500 to-red-600" },
                ]).map((opt) => (
                  <button
                    key={opt.level}
                    onClick={() => setAiLevel(opt.level)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-3 px-2 py-4 transition-all hover:scale-105 active:scale-95 ${
                      aiLevel === opt.level
                        ? `bg-gradient-to-b ${opt.color} border-white text-white shadow-lg shadow-white/20`
                        : "border-indigo-700 bg-indigo-900/50 text-indigo-300 hover:border-indigo-500"
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-sm font-black">{opt.label}</span>
                    <span className="text-[10px] opacity-80">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setBossStage(0); bossStageRef.current = 0; initGame(); }}
              className="rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 px-12 py-4 text-xl font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
            >
              게임 시작! 🚀
            </button>

            {/* Boss Mode Section */}
            <div className="w-full max-w-md">
              <div className="mb-3 flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-indigo-700" />
                <span className="text-sm font-bold text-indigo-400">또는</span>
                <div className="h-px flex-1 bg-indigo-700" />
              </div>
              <p className="mb-3 text-center text-sm font-bold text-indigo-300">보스 모드에 도전!</p>
              <div className="grid grid-cols-3 gap-3">
                {BOSSES.map((boss, i) => (
                  <div key={i} className="rounded-2xl border border-indigo-700 bg-indigo-900/50 p-3 text-center">
                    <span className="text-3xl">{boss.emoji}</span>
                    <p className="mt-1 text-sm font-bold">Stage {i + 1}</p>
                    <p className="text-xs text-indigo-300">{boss.name}</p>
                    <p className="text-[10px] text-indigo-400">{boss.abilityName}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={initBossMode}
                className="mt-4 w-full rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-8 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
              >
                보스 모드 시작! ⚔️
              </button>
            </div>

            <div className="mt-4 max-w-md rounded-2xl bg-indigo-900/60 p-6 text-sm leading-relaxed text-indigo-200">
              <p className="mb-3 text-base font-bold text-white">🎮 게임 규칙</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">🎨</span>
                  <span>같은 <b>색깔</b> 또는 같은 <b>숫자/기호</b>의 카드를 낼 수 있어요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">💥</span>
                  <span><b>+2</b>: 상대가 2장 받기 / <b>와일드 +4</b>: 상대가 4장 받기 (누적!)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">🌈</span>
                  <span><b>와일드</b>: 아무 때나 내고 색깔을 바꿔요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">⊘</span>
                  <span><b>스킵</b>: 상대 턴 건너뛰기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">🔄</span>
                  <span><b>리버스</b>: 한 번 더 내기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">📦</span>
                  <span>낼 카드가 없으면 카드 더미를 눌러서 한 장 뽑아요</span>
                </li>
              </ul>
            </div>

            <Link href="/" className="block w-full max-w-md rounded-full border-2 border-indigo-600 bg-indigo-900/60 py-3 text-center text-sm font-bold text-indigo-300 transition-transform hover:scale-105 active:scale-95">
              🏠 소개페이지로
            </Link>
          </div>
        )}

        {/* --- PLAYING SCREEN --- */}
        {(gamePhase === "playing" || gamePhase === "chooseColor") && (
          <div className="flex w-full max-w-2xl flex-1 flex-col gap-3">
            {/* Boss Info Bar */}
            {bossStage > 0 && (
              <div className={`rounded-2xl border px-4 py-3 text-center transition-all ${bossAbilityActive ? "animate-pulse border-red-400 bg-red-900/50" : "border-indigo-700 bg-indigo-900/60"}`}>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">{BOSSES[bossStage - 1].emoji}</span>
                  <div>
                    <p className="text-sm font-black">
                      Stage {bossStage}/3 — {BOSSES[bossStage - 1].name} ({BOSSES[bossStage - 1].abilityName})
                    </p>
                    <p className="text-xs text-indigo-300">
                      능력: {BOSSES[bossStage - 1].abilityDesc} ({BOSSES[bossStage - 1].abilityInterval - (bossTurnCount % BOSSES[bossStage - 1].abilityInterval)}턴 후 발동)
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* AI Hand */}
            <div className="text-center">
              <p className="mb-2 text-sm font-bold text-indigo-300">
                {bossStage > 0 ? (
                  <>{BOSSES[bossStage - 1].emoji} {BOSSES[bossStage - 1].name} ({aiHand.length}장)</>
                ) : (
                  <>{aiLevel === "supereasy" ? "🍼" : aiLevel === "easy" ? "🐣" : aiLevel === "medium" ? "🦊" : aiLevel === "hard" ? "🦁" : aiLevel === "extreme" ? "👹" : aiLevel === "superextreme" ? "☠️" : "💀🔥"}{" "}
                AI {aiLevel === "supereasy" ? "슈퍼쉬움" : aiLevel === "easy" ? "하수" : aiLevel === "medium" ? "중수" : aiLevel === "hard" ? "고수" : aiLevel === "extreme" ? "익스트림" : aiLevel === "superextreme" ? "슈퍼익스트림" : "슈퍼x5 익스트림"} ({aiHand.length}장)</>
                )}
                {aiHand.length === 1 && <span className="ml-1 text-yellow-400">UNO!</span>}
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {aiHand.map((_, i) => (
                  <UnoCardBack key={i} size="md" />
                ))}
              </div>
            </div>

            {/* Table area */}
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              {/* Message */}
              <div className="rounded-2xl bg-indigo-900/70 px-5 py-3 text-center text-sm font-semibold shadow-inner">
                {message}
                {attackStack > 0 && (
                  <span className="ml-2 inline-block animate-pulse rounded-full bg-red-500 px-3 py-0.5 text-xs font-black">
                    공격 {attackStack}장!
                  </span>
                )}
              </div>

              {/* Current color indicator */}
              <div className="flex items-center gap-2 text-sm text-indigo-300">
                <span>현재 색:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black text-white shadow ${COLOR_BG[currentColor]}`}
                >
                  {COLOR_NAMES[currentColor]}
                </span>
              </div>

              {/* Deck + Discard */}
              <div className="flex items-center gap-8">
                {/* Deck */}
                <button
                  onClick={handleDraw}
                  disabled={turn !== "player" || gamePhase !== "playing"}
                  className="group relative transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                >
                  <UnoCardBack size="lg" />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    {deck.length}장
                  </span>
                </button>

                {/* Discard pile */}
                {topCard && <UnoCardView card={topCard} size="lg" />}
              </div>

              {turn === "player" && gamePhase === "playing" && (
                <p className="max-w-xs text-center text-xs text-indigo-400">
                  {attackStack > 0
                    ? aiLevel === "god"
                      ? `방어 못하면 ${attackStack}x10 = ${attackStack * 10}장!!! 💀🔥 (카드 더미 클릭)`
                      : aiLevel === "superextreme"
                      ? `방어 못하면 ${attackStack}x3 = ${attackStack * 3}장! ☠️ (카드 더미 클릭)`
                      : aiLevel === "extreme"
                      ? `방어 못하면 ${attackStack}x2 = ${attackStack * 2}장! 👹 (카드 더미 클릭)`
                      : `방어 카드가 없으면 ${attackStack}장을 받아야 해요! (카드 더미 클릭)`
                    : "낼 카드가 없으면 카드 더미를 클릭해서 뽑으세요"}
                </p>
              )}
              {turn === "ai" && (
                <p className="animate-pulse text-sm font-bold text-yellow-300">
                  🤔 AI가 생각 중...
                </p>
              )}
            </div>

            {/* Player Hand */}
            <div className="text-center">
              <p className="mb-2 text-sm font-bold text-indigo-300">
                🙋 내 카드 ({playerHand.length}장)
                {playerHand.length === 1 && <span className="ml-1 text-yellow-400">UNO!</span>}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {playerHand.map((card) => {
                  const playable =
                    turn === "player" && gamePhase === "playing" && canPlayCard(card);
                  return (
                    <button
                      key={card.id}
                      onClick={() => playCard(card)}
                      disabled={!playable}
                      className={`transition-all duration-150 ${
                        playable
                          ? "hover:-translate-y-3 hover:scale-110 hover:z-10"
                          : "opacity-50 grayscale-[30%]"
                      }`}
                    >
                      <UnoCardView card={card} size="md" highlight={playable} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- COLOR CHOOSER MODAL --- */}
        {gamePhase === "chooseColor" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="mx-4 w-full max-w-xs animate-fade-in-up rounded-3xl bg-indigo-900 p-6 shadow-2xl">
              <h3 className="mb-5 text-center text-lg font-black">
                🌈 색깔을 골라요!
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => chooseColor(color)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-5 text-lg font-black text-white shadow-lg transition-all hover:scale-110 active:scale-95 ${COLOR_BG[color]} ${COLOR_BG_HOVER[color]}`}
                  >
                    <span className="text-2xl">
                      {color === "red" ? "🔴" : color === "blue" ? "🔵" : color === "green" ? "🟢" : "🟡"}
                    </span>
                    {COLOR_NAMES[color]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- WIN SCREEN (normal mode) --- */}
        {gamePhase === "win" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <span className="text-[100px] leading-none">🏆</span>
            <h2 className="text-5xl font-black">
              <span className="bg-gradient-to-r from-yellow-300 via-red-400 to-pink-400 bg-clip-text text-transparent">
                승리!
              </span>
            </h2>
            <p className="text-lg text-indigo-300">{message}</p>
            <button
              onClick={initGame}
              className="mt-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
            >
              다시 하기! 🔥
            </button>
            <Link
              href="/"
              className="text-sm text-indigo-400 underline transition-colors hover:text-white"
            >
              홈으로 돌아가기
            </Link>
          </div>
        )}

        {/* --- STAGE CLEAR SCREEN --- */}
        {gamePhase === "stageClear" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <span className="text-[100px] leading-none">⭐</span>
            <h2 className="text-4xl font-black">
              <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Stage {bossStage} 클리어!
              </span>
            </h2>
            <p className="text-lg text-indigo-300">
              {BOSSES[bossStage - 1].emoji} {BOSSES[bossStage - 1].name}을(를) 물리쳤어요!
            </p>
            <p className="text-sm text-indigo-400">
              다음 보스: {BOSSES[bossStage].emoji} {BOSSES[bossStage].name} — {BOSSES[bossStage].abilityName}
            </p>
            <button
              onClick={advanceBossStage}
              className="mt-4 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
            >
              다음 스테이지! ⚔️
            </button>
          </div>
        )}

        {/* --- BOSS VICTORY SCREEN --- */}
        {gamePhase === "bossVictory" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <span className="text-[100px] leading-none">👑</span>
            <h2 className="text-5xl font-black">
              <span className="bg-gradient-to-r from-yellow-300 via-red-400 to-purple-400 bg-clip-text text-transparent">
                보스 모드 클리어!
              </span>
            </h2>
            <p className="text-lg text-indigo-300">
              모든 보스를 물리쳤어요! 🎉🏆
            </p>
            <div className="flex gap-4 text-4xl">
              {BOSSES.map((b, i) => (
                <span key={i} className="opacity-50">{b.emoji}</span>
              ))}
            </div>
            <button
              onClick={() => { setBossStage(0); bossStageRef.current = 0; setGamePhase("ready"); }}
              className="mt-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
            >
              처음으로 돌아가기 🏠
            </button>
          </div>
        )}

        {/* --- LOSE SCREEN --- */}
        {gamePhase === "lose" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <span className="text-[100px] leading-none">😢</span>
            <h2 className="text-5xl font-black">다음에 이기자!</h2>
            <p className="text-lg text-indigo-300">{message}</p>
            {bossStage > 0 ? (
              <button
                onClick={() => { setBossStage(1); bossStageRef.current = 1; initGame(); }}
                className="mt-4 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
              >
                Stage 1부터 다시 시작! ⚔️
              </button>
            ) : (
              <button
                onClick={initGame}
                className="mt-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 px-10 py-4 text-lg font-black text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
              >
                다시 하기! 🔥
              </button>
            )}
            <Link
              href="/"
              className="text-sm text-indigo-400 underline transition-colors hover:text-white"
            >
              홈으로 돌아가기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Color CSS values for inline styles ---
const COLOR_HEX: Record<UnoColor, string> = {
  red: "#ED1C24",
  blue: "#0956BF",
  green: "#1B9C01",
  yellow: "#F5C500",
};

// --- UNO Card Component ---
function UnoCardView({
  card,
  size = "md",
  highlight = false,
}: {
  card: UnoCard;
  size?: "md" | "lg";
  highlight?: boolean;
}) {
  const isWild = card.type === "wild" || card.type === "wild4" || card.type === "wild10";

  // Dimensions
  const w = size === "lg" ? 80 : 56;
  const h = size === "lg" ? 112 : 80;

  // Label
  let label: string;
  if (card.type === "number") {
    label = String(card.value);
  } else {
    label = ACTION_LABELS[card.type] || "";
  }

  const bgColor = isWild ? "#1A1A1A" : COLOR_HEX[card.color!];
  const centerFontSize = size === "lg" ? (label.length > 2 ? 20 : label.length > 1 ? 24 : 32) : (label.length > 2 ? 13 : label.length > 1 ? 16 : 22);
  const cornerFontSize = size === "lg" ? 10 : 7;

  return (
    <div
      className={`relative select-none ${highlight ? "ring-2 ring-white ring-offset-2 ring-offset-indigo-950" : ""}`}
      style={{ width: w, height: h }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
      >
        {/* Card body */}
        <rect x="0" y="0" width={w} height={h} rx="6" ry="6" fill={bgColor} />
        <rect x="2" y="2" width={w - 4} height={h - 4} rx="5" ry="5" fill="none" stroke="white" strokeWidth="1.5" />

        {isWild ? (
          <>
            {/* 4-color diamond for wild cards */}
            <ellipse cx={w / 2} cy={h / 2} rx={w * 0.36} ry={h * 0.38} fill="none" stroke="none"
              transform={`rotate(-15 ${w / 2} ${h / 2})`}
            />
            {/* Four colored quadrants inside the oval */}
            <clipPath id={`wild-clip-${card.id}`}>
              <ellipse cx={w / 2} cy={h / 2} rx={w * 0.36} ry={h * 0.38}
                transform={`rotate(-15 ${w / 2} ${h / 2})`}
              />
            </clipPath>
            <g clipPath={`url(#wild-clip-${card.id})`}>
              <rect x="0" y="0" width={w / 2} height={h / 2} fill="#ED1C24" />
              <rect x={w / 2} y="0" width={w / 2} height={h / 2} fill="#0956BF" />
              <rect x="0" y={h / 2} width={w / 2} height={h / 2} fill="#F5C500" />
              <rect x={w / 2} y={h / 2} width={w / 2} height={h / 2} fill="#1B9C01" />
            </g>
            {/* Center label */}
            <text
              x={w / 2}
              y={h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={centerFontSize}
              fontWeight="900"
              fontFamily="Arial, sans-serif"
              stroke="black"
              strokeWidth="1.5"
              paintOrder="stroke"
            >
              {label}
            </text>
          </>
        ) : (
          <>
            {/* Tilted white oval */}
            <ellipse
              cx={w / 2}
              cy={h / 2}
              rx={w * 0.34}
              ry={h * 0.4}
              fill="white"
              transform={`rotate(-20 ${w / 2} ${h / 2})`}
            />
            {/* Center label on the oval */}
            <text
              x={w / 2}
              y={h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill={bgColor}
              fontSize={centerFontSize}
              fontWeight="900"
              fontFamily="Arial, sans-serif"
              stroke={bgColor}
              strokeWidth="0.5"
            >
              {label}
            </text>
            {/* Top-left corner */}
            <text
              x={6}
              y={cornerFontSize + 5}
              fill="white"
              fontSize={cornerFontSize}
              fontWeight="900"
              fontFamily="Arial, sans-serif"
            >
              {label}
            </text>
            {/* Bottom-right corner (upside down) */}
            <text
              x={w - 6}
              y={h - 5}
              fill="white"
              fontSize={cornerFontSize}
              fontWeight="900"
              fontFamily="Arial, sans-serif"
              textAnchor="end"
              transform={`rotate(180 ${w - 6} ${h - 5 - cornerFontSize / 2})`}
            >
              {label}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// --- UNO Card Back ---
function UnoCardBack({ size = "md" }: { size?: "md" | "lg" }) {
  const w = size === "lg" ? 80 : 56;
  const h = size === "lg" ? 112 : 80;
  const fontSize = size === "lg" ? 18 : 12;

  return (
    <div style={{ width: w, height: h }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      >
        <rect x="0" y="0" width={w} height={h} rx="6" ry="6" fill="#1A1A1A" />
        <rect x="3" y="3" width={w - 6} height={h - 6} rx="4" ry="4" fill="none" stroke="#333" strokeWidth="1" />
        {/* Red oval */}
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w * 0.34}
          ry={h * 0.34}
          fill="#ED1C24"
          transform={`rotate(-20 ${w / 2} ${h / 2})`}
        />
        {/* UNO text */}
        <text
          x={w / 2}
          y={h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#F5C500"
          fontSize={fontSize}
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          stroke="black"
          strokeWidth="1"
          paintOrder="stroke"
          transform={`rotate(-20 ${w / 2} ${h / 2})`}
        >
          UNO
        </text>
      </svg>
    </div>
  );
}
