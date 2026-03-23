"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 몬스터 ───── */
interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;       // 이동 속도 (낮을수록 빠름)
  desc: string;
  deathMsg: string;
  reward: number;
  xpReward: number;
}

const MONSTER_TEMPLATES: Omit<Monster, "hp" | "maxHp">[] = [
  { id: "huggy", name: "허기 워기", emoji: "🧸", attack: 15, speed: 2, desc: "파란 털 괴물! 긴 팔로 잡으러 온다!", deathMsg: "허기 워기가 쫓아온다!!", reward: 20, xpReward: 15 },
  { id: "kissy", name: "키시 미시", emoji: "🎀", attack: 12, speed: 3, desc: "분홍색 괴물! 빠르게 다가온다!", deathMsg: "키시 미시에게 잡혔다!", reward: 18, xpReward: 12 },
  { id: "mommy", name: "마미 롱레그", emoji: "🕷️", attack: 20, speed: 4, desc: "거미 같은 긴 다리! 천장에서 내려온다!", deathMsg: "마미 롱레그에게 붙잡혔다!", reward: 30, xpReward: 20 },
  { id: "bunzo", name: "번조 버니", emoji: "🐰", attack: 10, speed: 2, desc: "심벌즈를 든 토끼! 박자를 놓치면 위험!", deathMsg: "번조 버니의 심벌즈에 맞았다!", reward: 15, xpReward: 10 },
  { id: "boxy", name: "복시 부", emoji: "📦", attack: 8, speed: 1, desc: "상자 속에서 갑자기 튀어나온다!", deathMsg: "복시 부가 상자에서 튀어나왔다!", reward: 12, xpReward: 8 },
  { id: "poppy", name: "파피", emoji: "🎎", attack: 5, speed: 5, desc: "도와달라고 하지만... 믿을 수 있을까?", deathMsg: "파피의 함정이었다!", reward: 25, xpReward: 18 },
  { id: "catnap", name: "캣냅", emoji: "😈", attack: 25, speed: 3, desc: "보라색 연기로 재운다! 잠들면 끝!", deathMsg: "캣냅의 연기에 잠들었다...", reward: 40, xpReward: 30 },
  { id: "dogday", name: "독데이", emoji: "🌞", attack: 18, speed: 3, desc: "한때 친절했던 해바라기... 이제 괴물이 됐다", deathMsg: "독데이에게 붙잡혔다!", reward: 35, xpReward: 25 },
  { id: "craftycorn", name: "크래프티콘", emoji: "🦄", attack: 14, speed: 4, desc: "유니콘 인형이 살아 움직인다!", deathMsg: "크래프티콘에게 찔렸다!", reward: 22, xpReward: 15 },
  { id: "prototype", name: "프로토타입", emoji: "👾", attack: 30, speed: 2, desc: "모든 장난감의 원형... 최강의 적!", deathMsg: "프로토타입을 이길 수 없었다...", reward: 60, xpReward: 50 },
];

/* ───── 방 (맵) ───── */
interface Room {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  events: RoomEvent[];
  bgColor: string;
  unlockChapter: number;
}

interface RoomEvent {
  type: "monster" | "item" | "puzzle" | "trap" | "safe" | "boss";
  monsterId?: string;
  itemId?: string;
  puzzleId?: string;
  text: string;
  chance: number; // 0~1
}

const ROOMS: Room[] = [
  {
    id: "lobby", name: "로비", emoji: "🏢", desc: "플레이타임 공장 입구... 조용하다", bgColor: "from-gray-800 to-gray-900", unlockChapter: 1,
    events: [
      { type: "safe", text: "조용한 로비... 아직 안전한 것 같다", chance: 0.4 },
      { type: "item", itemId: "battery", text: "바닥에서 배터리를 발견했다!", chance: 0.3 },
      { type: "monster", monsterId: "boxy", text: "상자가 움직인다...!", chance: 0.3 },
    ]
  },
  {
    id: "hallway", name: "긴 복도", emoji: "🚪", desc: "어두운 복도... 뒤에서 발소리가 들린다", bgColor: "from-gray-900 to-blue-950", unlockChapter: 1,
    events: [
      { type: "monster", monsterId: "huggy", text: "허기 워기가 복도 끝에서 달려온다!!", chance: 0.4 },
      { type: "trap", text: "바닥이 무너졌다! (-10 HP)", chance: 0.2 },
      { type: "item", itemId: "bandage", text: "구급상자를 발견했다!", chance: 0.2 },
      { type: "safe", text: "숨을 곳을 찾았다... 잠시 안전하다", chance: 0.2 },
    ]
  },
  {
    id: "factory", name: "장난감 공장", emoji: "🏭", desc: "컨베이어 벨트가 아직 돌아가고 있다...", bgColor: "from-amber-950 to-gray-900", unlockChapter: 1,
    events: [
      { type: "monster", monsterId: "bunzo", text: "번조 버니가 심벌즈를 울린다!!", chance: 0.3 },
      { type: "puzzle", puzzleId: "color", text: "컨베이어 벨트 퍼즐이 있다!", chance: 0.25 },
      { type: "item", itemId: "grabpack", text: "그랩팩 부품을 발견했다!", chance: 0.25 },
      { type: "trap", text: "기계에 손이 끼일 뻔했다! (-8 HP)", chance: 0.2 },
    ]
  },
  {
    id: "playroom", name: "놀이방", emoji: "🎪", desc: "인형들이 가득... 눈이 움직이는 것 같다", bgColor: "from-purple-950 to-gray-900", unlockChapter: 2,
    events: [
      { type: "monster", monsterId: "kissy", text: "키시 미시가 인형 속에서 나왔다!!", chance: 0.35 },
      { type: "monster", monsterId: "craftycorn", text: "크래프티콘이 돌격한다!", chance: 0.2 },
      { type: "puzzle", puzzleId: "music", text: "음악 상자 퍼즐이 있다!", chance: 0.25 },
      { type: "item", itemId: "battery", text: "인형 속에서 배터리를 발견!", chance: 0.2 },
    ]
  },
  {
    id: "vent", name: "환풍구", emoji: "🌫️", desc: "좁고 어두운 환풍구... 뭔가 기어다닌다", bgColor: "from-slate-900 to-zinc-950", unlockChapter: 2,
    events: [
      { type: "monster", monsterId: "mommy", text: "마미 롱레그가 위에서 내려온다!!", chance: 0.35 },
      { type: "trap", text: "환풍구가 닫혔다! 간신히 탈출! (-12 HP)", chance: 0.25 },
      { type: "item", itemId: "flashlight", text: "손전등을 발견했다!", chance: 0.2 },
      { type: "safe", text: "조용히 빠져나왔다... 휴...", chance: 0.2 },
    ]
  },
  {
    id: "theater", name: "극장", emoji: "🎭", desc: "무대 위에 인형이 서 있다...", bgColor: "from-red-950 to-gray-950", unlockChapter: 3,
    events: [
      { type: "monster", monsterId: "poppy", text: "파피가 도와달라고 한다... 함정일까?", chance: 0.3 },
      { type: "monster", monsterId: "dogday", text: "독데이가 무대에서 내려온다!", chance: 0.3 },
      { type: "puzzle", puzzleId: "sequence", text: "무대 조명 퍼즐이 있다!", chance: 0.2 },
      { type: "item", itemId: "key", text: "열쇠를 발견했다!", chance: 0.2 },
    ]
  },
  {
    id: "sleeproom", name: "수면실", emoji: "😴", desc: "보라색 연기가 가득하다...", bgColor: "from-violet-950 to-purple-950", unlockChapter: 3,
    events: [
      { type: "boss", monsterId: "catnap", text: "캣냅이 나타났다!! 보스 전투!!", chance: 0.5 },
      { type: "trap", text: "보라색 연기를 마셨다! (-15 HP)", chance: 0.25 },
      { type: "item", itemId: "gasmask", text: "가스 마스크를 발견했다!", chance: 0.25 },
    ]
  },
  {
    id: "lab", name: "비밀 연구소", emoji: "🔬", desc: "여기서 모든 것이 시작됐다...", bgColor: "from-emerald-950 to-gray-950", unlockChapter: 4,
    events: [
      { type: "boss", monsterId: "prototype", text: "프로토타입이 깨어났다!! 최종 보스!!", chance: 0.5 },
      { type: "item", itemId: "superweapon", text: "초강력 무기를 발견했다!", chance: 0.2 },
      { type: "puzzle", puzzleId: "code", text: "비밀 코드를 풀어야 한다!", chance: 0.3 },
    ]
  },
];

/* ───── 아이템 ───── */
interface GameItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  type: "heal" | "weapon" | "defense" | "utility";
  value: number;
}

const GAME_ITEMS: Record<string, GameItem> = {
  battery: { id: "battery", name: "배터리", emoji: "🔋", desc: "그랩팩 충전 (+20 에너지)", type: "utility", value: 20 },
  bandage: { id: "bandage", name: "구급상자", emoji: "🩹", desc: "체력 회복 (+25 HP)", type: "heal", value: 25 },
  grabpack: { id: "grabpack", name: "그랩팩 부품", emoji: "🤖", desc: "공격력 +5 증가", type: "weapon", value: 5 },
  flashlight: { id: "flashlight", name: "손전등", emoji: "🔦", desc: "함정 회피 확률 증가", type: "defense", value: 15 },
  key: { id: "key", name: "열쇠", emoji: "🔑", desc: "새로운 방 해금", type: "utility", value: 1 },
  gasmask: { id: "gasmask", name: "가스 마스크", emoji: "😷", desc: "연기 피해 무효", type: "defense", value: 20 },
  superweapon: { id: "superweapon", name: "초강력 무기", emoji: "⚡", desc: "공격력 +15 증가!", type: "weapon", value: 15 },
};

/* ───── 퍼즐 ───── */
interface Puzzle {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  type: "color" | "music" | "sequence" | "code";
  reward: number;
  xpReward: number;
}

const PUZZLES: Record<string, Puzzle> = {
  color: { id: "color", name: "색깔 퍼즐", emoji: "🎨", desc: "올바른 색 순서를 맞춰라!", type: "color", reward: 15, xpReward: 10 },
  music: { id: "music", name: "음악 퍼즐", emoji: "🎵", desc: "올바른 음을 순서대로!", type: "music", reward: 20, xpReward: 15 },
  sequence: { id: "sequence", name: "조명 퍼즐", emoji: "💡", desc: "조명 순서를 기억해라!", type: "sequence", reward: 25, xpReward: 20 },
  code: { id: "code", name: "비밀 코드", emoji: "🔢", desc: "4자리 코드를 맞춰라!", type: "code", reward: 30, xpReward: 25 },
};

/* ───── 상점 아이템 ───── */
interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  effect: string;
  effectType: "maxHp" | "attack" | "defense" | "luck";
  value: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: "armor1", name: "방탄 조끼", emoji: "🦺", desc: "최대 HP 증가", price: 50, effect: "+20 HP", effectType: "maxHp", value: 20 },
  { id: "wrench", name: "렌치", emoji: "🔧", desc: "기본 공격력 증가", price: 60, effect: "+3 공격력", effectType: "attack", value: 3 },
  { id: "helmet", name: "헬멧", emoji: "⛑️", desc: "방어력 증가", price: 80, effect: "+5 방어", effectType: "defense", value: 5 },
  { id: "clover", name: "네잎클로버", emoji: "🍀", desc: "아이템 발견 확률 증가", price: 70, effect: "+15% 행운", effectType: "luck", value: 15 },
  { id: "armor2", name: "강화 슈트", emoji: "🛡️", desc: "최대 HP 대폭 증가", price: 150, effect: "+50 HP", effectType: "maxHp", value: 50 },
  { id: "laser", name: "레이저 건", emoji: "🔫", desc: "공격력 대폭 증가", price: 200, effect: "+8 공격력", effectType: "attack", value: 8 },
  { id: "shield", name: "에너지 쉴드", emoji: "💠", desc: "방어력 대폭 증가", price: 180, effect: "+12 방어", effectType: "defense", value: 12 },
  { id: "star", name: "행운의 별", emoji: "⭐", desc: "행운 대폭 증가", price: 250, effect: "+30% 행운", effectType: "luck", value: 30 },
];

type Screen = "main" | "explore" | "battle" | "puzzle" | "event" | "shop" | "gameover" | "victory";

export default function PoppyPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpNeeded, setXpNeeded] = useState(40);
  const [chapter, setChapter] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [ownedShopItems, setOwnedShopItems] = useState<string[]>([]);

  // 플레이 상태
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [baseAttack, setBaseAttack] = useState(10);
  const [defense, setDefense] = useState(0);
  const [luck, setLuck] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [score, setScore] = useState(0);
  const [roomsExplored, setRoomsExplored] = useState(0);
  const [monstersDefeated, setMonstersDefeated] = useState(0);
  const [inventory, setInventory] = useState<string[]>([]);
  const [gameActive, setGameActive] = useState(false);

  // 전투
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [battleAnim, setBattleAnim] = useState("");

  // 퍼즐
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleSequence, setPuzzleSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [activeLight, setActiveLight] = useState<number | null>(null);
  const [puzzleResult, setPuzzleResult] = useState<"none" | "success" | "fail">("none");

  // 이벤트
  const [eventText, setEventText] = useState("");
  const [eventEmoji, setEventEmoji] = useState("");

  // 현재 방
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // 상점 보너스
  const shopMaxHp = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "maxHp" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const shopAttack = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "attack" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const shopDefense = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "defense" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);
  const shopLuck = ownedShopItems.reduce((s, id) => s + (SHOP_ITEMS.find(i => i.id === id)?.effectType === "luck" ? SHOP_ITEMS.find(i => i.id === id)!.value : 0), 0);

  // 레벨업
  useEffect(() => {
    if (xp >= xpNeeded) {
      setXp(x => x - xpNeeded);
      setPlayerLevel(l => l + 1);
      setXpNeeded(n => Math.floor(n * 1.3));
      setBaseAttack(a => a + 2);
      if (playerLevel % 3 === 0) setChapter(c => Math.min(c + 1, 4));
    }
  }, [xp, xpNeeded, playerLevel]);

  const totalAttack = baseAttack + shopAttack + inventory.filter(i => i === "grabpack").length * 5 + (inventory.includes("superweapon") ? 15 : 0);
  const totalDefense = defense + shopDefense + (inventory.includes("gasmask") ? 5 : 0);
  const totalLuck = luck + shopLuck;
  const totalMaxHp = 100 + shopMaxHp;

  const startGame = useCallback(() => {
    setHp(totalMaxHp);
    setMaxHp(totalMaxHp);
    setEnergy(100);
    setScore(0);
    setRoomsExplored(0);
    setMonstersDefeated(0);
    setInventory([]);
    setDefense(0);
    setLuck(0);
    setGameActive(true);
    setCurrentMonster(null);
    setCurrentPuzzle(null);
    setBattleLog([]);
    setScreen("explore");
  }, [totalMaxHp]);

  const endGame = useCallback((victory: boolean) => {
    setGameActive(false);
    const earned = Math.floor(score / 5) + monstersDefeated * 5 + (victory ? 50 : 0);
    setCoins(c => c + earned);
    setXp(x => x + Math.floor(score / 3));
    if (score > highScore) setHighScore(score);
    setScreen(victory ? "victory" : "gameover");
  }, [score, monstersDefeated, highScore]);

  // 방 탐험
  const exploreRoom = useCallback((room: Room) => {
    if (!gameActive) return;
    setCurrentRoom(room);
    setRoomsExplored(r => r + 1);
    setEnergy(e => Math.max(0, e - 5));

    // 이벤트 선택
    const roll = Math.random();
    let cumulative = 0;
    let selectedEvent = room.events[0];
    for (const evt of room.events) {
      cumulative += evt.chance;
      if (roll <= cumulative) { selectedEvent = evt; break; }
    }

    // 행운 보정
    if (selectedEvent.type === "trap" && Math.random() * 100 < totalLuck) {
      selectedEvent = { type: "safe", text: "함정을 피했다! 행운이다!", chance: 1 };
    }

    switch (selectedEvent.type) {
      case "monster":
      case "boss": {
        const tmpl = MONSTER_TEMPLATES.find(m => m.id === selectedEvent.monsterId)!;
        const hpMult = selectedEvent.type === "boss" ? 2.5 : 1;
        const monster: Monster = {
          ...tmpl,
          hp: Math.floor((50 + roomsExplored * 10) * hpMult),
          maxHp: Math.floor((50 + roomsExplored * 10) * hpMult),
        };
        setCurrentMonster(monster);
        setBattleLog([`${monster.emoji} ${monster.name} 등장!! ${monster.desc}`]);
        setPlayerTurn(true);
        setBattleAnim("");
        setScreen("battle");
        break;
      }
      case "item": {
        const item = GAME_ITEMS[selectedEvent.itemId!];
        if (item.type === "heal") {
          setHp(h => Math.min(maxHp, h + item.value));
        } else if (item.type === "weapon") {
          setInventory(inv => [...inv, item.id]);
        } else if (item.type === "defense") {
          setInventory(inv => [...inv, item.id]);
          if (item.id === "flashlight") setLuck(l => l + item.value);
        } else {
          setInventory(inv => [...inv, item.id]);
          if (item.id === "battery") setEnergy(e => Math.min(100, e + item.value));
        }
        setScore(s => s + 10);
        setEventText(selectedEvent.text);
        setEventEmoji(item.emoji);
        setScreen("event");
        break;
      }
      case "puzzle": {
        const puzzle = PUZZLES[selectedEvent.puzzleId!];
        setCurrentPuzzle(puzzle);
        const seqLen = 3 + Math.floor(roomsExplored / 3);
        const seq = Array.from({ length: Math.min(seqLen, 7) }, () => Math.floor(Math.random() * 4));
        setPuzzleSequence(seq);
        setPlayerSequence([]);
        setPuzzleResult("none");
        setShowingSequence(true);
        setScreen("puzzle");
        // 순서 보여주기
        let i = 0;
        const showInterval = setInterval(() => {
          if (i < seq.length) {
            setActiveLight(seq[i]);
            setTimeout(() => setActiveLight(null), 400);
            i++;
          } else {
            clearInterval(showInterval);
            setShowingSequence(false);
          }
        }, 700);
        break;
      }
      case "trap": {
        const dmg = 8 + Math.floor(roomsExplored * 1.5);
        const actualDmg = Math.max(1, dmg - totalDefense);
        setHp(h => {
          const next = h - actualDmg;
          if (next <= 0) setTimeout(() => endGame(false), 500);
          return Math.max(0, next);
        });
        setEventText(selectedEvent.text.replace(/\(-\d+ HP\)/, `(-${actualDmg} HP)`));
        setEventEmoji("💥");
        setScreen("event");
        break;
      }
      case "safe": {
        setHp(h => Math.min(maxHp, h + 5));
        setScore(s => s + 5);
        setEventText(selectedEvent.text);
        setEventEmoji("😮‍💨");
        setScreen("event");
        break;
      }
    }
  }, [gameActive, roomsExplored, totalLuck, totalDefense, maxHp, endGame]);

  // 전투 액션
  const battleAttack = useCallback((type: "normal" | "grab" | "dodge") => {
    if (!currentMonster || !playerTurn) return;

    const log = [...battleLog];

    if (type === "normal") {
      const dmg = totalAttack + Math.floor(Math.random() * 5);
      const newHp = currentMonster.hp - dmg;
      setCurrentMonster({ ...currentMonster, hp: Math.max(0, newHp) });
      setBattleAnim("shake");
      setTimeout(() => setBattleAnim(""), 300);
      log.push(`⚔️ 공격! ${dmg} 데미지!`);

      if (newHp <= 0) {
        log.push(`🎉 ${currentMonster.name}을(를) 물리쳤다!`);
        setScore(s => s + currentMonster.reward);
        setMonstersDefeated(m => m + 1);
        setBattleLog(log);
        setTimeout(() => setScreen("explore"), 1500);
        return;
      }
    } else if (type === "grab") {
      if (energy < 15) {
        log.push("⚠️ 에너지가 부족하다!");
        setBattleLog(log);
        return;
      }
      setEnergy(e => e - 15);
      const dmg = Math.floor(totalAttack * 1.8) + Math.floor(Math.random() * 8);
      const newHp = currentMonster.hp - dmg;
      setCurrentMonster({ ...currentMonster, hp: Math.max(0, newHp) });
      setBattleAnim("shake");
      setTimeout(() => setBattleAnim(""), 300);
      log.push(`🤖 그랩팩 공격!! ${dmg} 데미지!!`);

      if (newHp <= 0) {
        log.push(`🎉 ${currentMonster.name}을(를) 물리쳤다!`);
        setScore(s => s + currentMonster.reward);
        setMonstersDefeated(m => m + 1);
        setBattleLog(log);
        setTimeout(() => setScreen("explore"), 1500);
        return;
      }
    } else if (type === "dodge") {
      log.push("🏃 회피 준비! 다음 공격 피하기!");
      setBattleLog(log);
      setPlayerTurn(false);
      // 적 턴 - 회피 성공
      setTimeout(() => {
        const dodgeChance = 0.6 + totalLuck / 200;
        if (Math.random() < dodgeChance) {
          setBattleLog(prev => [...prev, `✨ ${currentMonster.name}의 공격을 피했다!`]);
        } else {
          const enemyDmg = Math.max(1, Math.floor(currentMonster.attack * 0.5) - totalDefense);
          setHp(h => {
            const next = h - enemyDmg;
            if (next <= 0) setTimeout(() => endGame(false), 500);
            return Math.max(0, next);
          });
          setBattleLog(prev => [...prev, `💢 회피 실패! ${enemyDmg} 데미지!`]);
        }
        setPlayerTurn(true);
      }, 1000);
      return;
    }

    setBattleLog(log);
    setPlayerTurn(false);

    // 적 턴
    setTimeout(() => {
      if (!currentMonster || currentMonster.hp <= 0) return;
      const enemyDmg = Math.max(1, currentMonster.attack + Math.floor(Math.random() * 5) - totalDefense);
      setHp(h => {
        const next = h - enemyDmg;
        if (next <= 0) setTimeout(() => endGame(false), 500);
        return Math.max(0, next);
      });
      setBattleLog(prev => [...prev, `${currentMonster.emoji} ${currentMonster.name}의 공격! ${enemyDmg} 데미지!`]);
      setPlayerTurn(true);
    }, 1000);
  }, [currentMonster, playerTurn, totalAttack, totalDefense, totalLuck, energy, battleLog, endGame]);

  // 퍼즐 입력
  const puzzleInput = useCallback((num: number) => {
    if (showingSequence || puzzleResult !== "none") return;
    const newSeq = [...playerSequence, num];
    setPlayerSequence(newSeq);
    setActiveLight(num);
    setTimeout(() => setActiveLight(null), 200);

    // 체크
    if (newSeq[newSeq.length - 1] !== puzzleSequence[newSeq.length - 1]) {
      setPuzzleResult("fail");
      setHp(h => {
        const next = h - 10;
        if (next <= 0) setTimeout(() => endGame(false), 1000);
        return Math.max(0, next);
      });
      return;
    }
    if (newSeq.length === puzzleSequence.length) {
      setPuzzleResult("success");
      if (currentPuzzle) {
        setScore(s => s + currentPuzzle.reward);
      }
    }
  }, [showingSequence, playerSequence, puzzleSequence, puzzleResult, currentPuzzle, endGame]);

  // 아이템 사용 (회복)
  const useHealItem = useCallback(() => {
    const idx = inventory.indexOf("bandage");
    if (idx === -1) return;
    setInventory(prev => { const n = [...prev]; n.splice(idx, 1); return n; });
    setHp(h => Math.min(maxHp, h + 25));
  }, [inventory, maxHp]);

  const buyShopItem = useCallback((id: string) => {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || coins < item.price || ownedShopItems.includes(id)) return;
    setCoins(c => c - item.price);
    setOwnedShopItems(prev => [...prev, id]);
  }, [coins, ownedShopItems]);

  const PUZZLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
  const PUZZLE_EMOJIS = ["🔴", "🔵", "🟢", "🟡"];

  /* ───── 메인 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-blue-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🧸</div>
            <h1 className="text-3xl font-black mb-1 text-red-400">파피 플레이타임</h1>
            <p className="text-blue-300 text-sm">버려진 장난감 공장에서 살아남아라!</p>
          </div>

          <div className="bg-indigo-900/40 rounded-xl p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-400 font-bold">🪙 {coins}코인</span>
              <span className="text-blue-300 text-sm">Lv.{playerLevel} | Ch.{chapter}</span>
            </div>
            <div className="bg-indigo-900 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${(xp / xpNeeded) * 100}%` }} />
            </div>
            <div className="text-[10px] text-indigo-400 text-right mt-0.5">{xp}/{xpNeeded} XP</div>
            {highScore > 0 && <div className="text-xs text-yellow-300 text-center mt-1">🏆 최고 점수: {highScore}</div>}
          </div>

          <div className="bg-black/40 rounded-xl p-3 mb-4 text-center border border-red-900/50">
            <div className="text-3xl mb-2">🏭👾🧸</div>
            <p className="text-sm text-gray-300">플레이타임 주식회사...</p>
            <p className="text-sm text-gray-300">10년 전 폐쇄된 장난감 공장...</p>
            <p className="text-sm text-red-400 font-bold mt-1">장난감들이 살아 움직인다!</p>
            <p className="text-xs text-gray-500 mt-1">방을 탐험하고, 괴물과 싸우고, 퍼즐을 풀어라!</p>
          </div>

          <div className="bg-indigo-900/30 rounded-xl p-2 mb-4">
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div><div className="text-lg">❤️</div><div>{100 + shopMaxHp}</div><div className="text-gray-500">HP</div></div>
              <div><div className="text-lg">⚔️</div><div>{10 + shopAttack}</div><div className="text-gray-500">공격</div></div>
              <div><div className="text-lg">🛡️</div><div>{shopDefense}</div><div className="text-gray-500">방어</div></div>
              <div><div className="text-lg">🍀</div><div>{shopLuck}%</div><div className="text-gray-500">행운</div></div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full bg-red-700 hover:bg-red-600 rounded-xl p-4 text-center text-lg font-black">
              🏭 공장 탐험 시작!
            </button>
            <button onClick={() => setScreen("shop")}
              className="w-full bg-yellow-700/60 hover:bg-yellow-600/60 rounded-xl p-3 text-center">
              <span className="font-bold">🛒 장비 상점</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 탐험 화면 ───── */
  if (screen === "explore") {
    const availableRooms = ROOMS.filter(r => r.unlockChapter <= chapter);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          {/* 상태바 */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-3 text-sm">
              <span>❤️ {hp}/{maxHp}</span>
              <span>⚡ {energy}</span>
            </div>
            <div className="text-sm font-bold">🎯 {score}점</div>
          </div>

          <div className="mb-2">
            <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-red-500 rounded-full transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500 mb-4">
            <span>🚪 탐험: {roomsExplored}방</span>
            <span>💀 처치: {monstersDefeated}</span>
            <span>🎒 아이템: {inventory.length}</span>
          </div>

          {/* 인벤토리 */}
          {inventory.length > 0 && (
            <div className="bg-gray-800/60 rounded-xl p-2 mb-3">
              <div className="flex flex-wrap gap-1">
                {inventory.map((itemId, i) => (
                  <span key={i} className="text-lg" title={GAME_ITEMS[itemId]?.name}>
                    {GAME_ITEMS[itemId]?.emoji || "?"}
                  </span>
                ))}
                {inventory.includes("bandage") && (
                  <button onClick={useHealItem} className="text-xs bg-green-800 px-2 py-0.5 rounded-lg ml-1">
                    🩹 사용
                  </button>
                )}
              </div>
            </div>
          )}

          <h3 className="text-center font-bold mb-3 text-gray-400">어디로 갈까?</h3>

          <div className="grid grid-cols-2 gap-2">
            {availableRooms.map(room => (
              <button key={room.id} onClick={() => exploreRoom(room)}
                className={`bg-gradient-to-b ${room.bgColor} p-3 rounded-xl text-center transition-all hover:scale-105 active:scale-95 border border-gray-700`}>
                <div className="text-3xl mb-1">{room.emoji}</div>
                <div className="text-sm font-bold">{room.name}</div>
                <div className="text-[10px] text-gray-400">{room.desc}</div>
              </button>
            ))}
          </div>

          <button onClick={() => endGame(roomsExplored >= 10)}
            className="w-full mt-4 bg-gray-800 hover:bg-gray-700 rounded-xl p-2 text-sm text-gray-400">
            🚪 공장 탈출 (게임 종료)
          </button>
        </div>
      </div>
    );
  }

  /* ───── 전투 ───── */
  if (screen === "battle" && currentMonster) {
    const hpPercent = (currentMonster.hp / currentMonster.maxHp) * 100;
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          {/* 플레이어 HP */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>❤️ 나 {hp}/{maxHp}</span>
              <span>⚡ {energy}</span>
            </div>
            <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-green-500 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
          </div>

          {/* 몬스터 */}
          <div className="text-center my-6">
            <div className={`text-8xl transition-all ${battleAnim === "shake" ? "animate-bounce" : ""}`}>
              {currentMonster.emoji}
            </div>
            <div className="text-xl font-black mt-2 text-red-400">{currentMonster.name}</div>
            <div className="mt-2 mx-auto max-w-[200px]">
              <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                <div className="h-3 bg-red-500 transition-all" style={{ width: `${hpPercent}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{currentMonster.hp}/{currentMonster.maxHp}</div>
            </div>
          </div>

          {/* 배틀 로그 */}
          <div className="bg-black/60 rounded-xl p-3 mb-4 h-28 overflow-y-auto">
            {battleLog.map((log, i) => (
              <div key={i} className="text-xs text-gray-300 mb-0.5">{log}</div>
            ))}
          </div>

          {/* 액션 */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => battleAttack("normal")} disabled={!playerTurn}
              className={`p-3 rounded-xl text-center font-bold ${playerTurn ? "bg-red-700 hover:bg-red-600" : "bg-gray-800 opacity-50"}`}>
              <div className="text-2xl">⚔️</div>
              <div className="text-xs">공격</div>
              <div className="text-[10px] text-gray-400">{totalAttack}dmg</div>
            </button>
            <button onClick={() => battleAttack("grab")} disabled={!playerTurn || energy < 15}
              className={`p-3 rounded-xl text-center font-bold ${playerTurn && energy >= 15 ? "bg-blue-700 hover:bg-blue-600" : "bg-gray-800 opacity-50"}`}>
              <div className="text-2xl">🤖</div>
              <div className="text-xs">그랩팩</div>
              <div className="text-[10px] text-gray-400">-15⚡</div>
            </button>
            <button onClick={() => battleAttack("dodge")} disabled={!playerTurn}
              className={`p-3 rounded-xl text-center font-bold ${playerTurn ? "bg-green-700 hover:bg-green-600" : "bg-gray-800 opacity-50"}`}>
              <div className="text-2xl">🏃</div>
              <div className="text-xs">회피</div>
              <div className="text-[10px] text-gray-400">{Math.floor(60 + totalLuck / 2)}%</div>
            </button>
          </div>

          {inventory.includes("bandage") && (
            <button onClick={useHealItem} className="w-full mt-2 bg-green-900/60 hover:bg-green-800/60 rounded-xl p-2 text-sm">
              🩹 구급상자 사용 (+25 HP)
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ───── 퍼즐 ───── */
  if (screen === "puzzle" && currentPuzzle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-4 flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-4xl mb-2">{currentPuzzle.emoji}</div>
          <h3 className="text-xl font-black mb-2">{currentPuzzle.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{currentPuzzle.desc}</p>

          {showingSequence && (
            <div className="text-lg text-yellow-300 font-bold mb-4 animate-pulse">순서를 기억하세요!</div>
          )}

          {puzzleResult === "none" && !showingSequence && (
            <div className="text-sm text-gray-400 mb-2">
              {playerSequence.length}/{puzzleSequence.length}
            </div>
          )}

          {/* 퍼즐 버튼 */}
          <div className="grid grid-cols-2 gap-3 max-w-[250px] mx-auto mb-4">
            {PUZZLE_COLORS.map((color, i) => (
              <button key={i} onClick={() => puzzleInput(i)}
                disabled={showingSequence || puzzleResult !== "none"}
                className="w-full aspect-square rounded-2xl transition-all active:scale-90"
                style={{
                  backgroundColor: activeLight === i ? color : color + "44",
                  border: `3px solid ${color}`,
                  boxShadow: activeLight === i ? `0 0 20px ${color}` : "none",
                }}>
                <span className="text-3xl">{PUZZLE_EMOJIS[i]}</span>
              </button>
            ))}
          </div>

          {puzzleResult === "success" && (
            <div className="mb-4">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-xl font-bold text-green-400">퍼즐 성공! +{currentPuzzle.reward}점</div>
              <button onClick={() => setScreen("explore")}
                className="mt-3 bg-green-700 hover:bg-green-600 px-6 py-2 rounded-xl font-bold">
                계속 탐험 →
              </button>
            </div>
          )}

          {puzzleResult === "fail" && (
            <div className="mb-4">
              <div className="text-4xl mb-2">💥</div>
              <div className="text-xl font-bold text-red-400">틀렸다! -10 HP</div>
              <button onClick={() => setScreen("explore")}
                className="mt-3 bg-red-700 hover:bg-red-600 px-6 py-2 rounded-xl font-bold">
                도망가기 →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 이벤트 ───── */
  if (screen === "event") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">{eventEmoji}</div>
          <p className="text-lg font-bold mb-6">{eventText}</p>
          <div className="text-sm text-gray-400 mb-4">❤️ HP: {hp}/{maxHp}</div>
          <button onClick={() => { if (hp <= 0) endGame(false); else setScreen("explore"); }}
            className="bg-indigo-700 hover:bg-indigo-600 px-8 py-3 rounded-xl font-bold text-lg">
            {hp <= 0 ? "😵 으아..." : "계속 탐험 →"}
          </button>
        </div>
      </div>
    );
  }

  /* ───── 게임오버 ───── */
  if (screen === "gameover") {
    const earned = Math.floor(score / 5) + monstersDefeated * 5;
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-black to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">💀</div>
          <h2 className="text-3xl font-black mb-2 text-red-500">GAME OVER</h2>
          <p className="text-gray-400 mb-4">공장에서 탈출하지 못했다...</p>

          <div className="bg-black/60 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🚪</div><div className="text-xl font-bold">{roomsExplored}</div><div className="text-xs text-gray-400">탐험한 방</div></div>
              <div><div className="text-2xl">💀</div><div className="text-xl font-bold">{monstersDefeated}</div><div className="text-xs text-gray-400">처치한 적</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">획득 코인</div></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={startGame} className="flex-1 bg-red-700 hover:bg-red-600 rounded-xl p-3 font-bold">🔄 재도전</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 승리 ───── */
  if (screen === "victory") {
    const earned = Math.floor(score / 5) + monstersDefeated * 5 + 50;
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-700 via-indigo-900 to-black text-white p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-4">🏆</div>
          <h2 className="text-3xl font-black mb-2 text-yellow-300">공장 탈출 성공!</h2>
          <p className="text-indigo-200 mb-4">살아서 나왔다!!</p>

          <div className="bg-black/60 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-2xl">🎯</div><div className="text-2xl font-bold">{score}</div><div className="text-xs text-gray-400">점수</div></div>
              <div><div className="text-2xl">🚪</div><div className="text-2xl font-bold">{roomsExplored}</div><div className="text-xs text-gray-400">탐험한 방</div></div>
              <div><div className="text-2xl">💀</div><div className="text-2xl font-bold">{monstersDefeated}</div><div className="text-xs text-gray-400">처치한 적</div></div>
              <div><div className="text-2xl">🪙</div><div className="text-2xl font-bold text-yellow-400">+{earned}</div><div className="text-xs text-gray-400">획득 코인</div></div>
            </div>
          </div>

          {score > highScore && score > 0 && (
            <div className="text-yellow-300 font-bold mb-3">🏆 새로운 최고 기록!</div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setScreen("main")} className="flex-1 bg-indigo-700 hover:bg-indigo-600 rounded-xl p-3 font-bold">🏠 메인</button>
            <button onClick={startGame} className="flex-1 bg-red-700 hover:bg-red-600 rounded-xl p-3 font-bold">🏭 다시 도전</button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-blue-950 to-black text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 장비 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">🪙 {coins}코인</div>

          <div className="space-y-2">
            {SHOP_ITEMS.map(item => {
              const owned = ownedShopItems.includes(item.id);
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${owned ? "bg-green-900/30 border border-green-800" : "bg-black/30"}`}>
                  <div className="text-3xl">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                    <div className="text-xs text-yellow-300">{item.effect}</div>
                  </div>
                  {owned ? (
                    <span className="text-green-400 text-sm font-bold">✅</span>
                  ) : (
                    <button onClick={() => buyShopItem(item.id)} disabled={coins < item.price}
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
