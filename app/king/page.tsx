"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════
   왕 되기 - 왕국 경영 시뮬레이션
   ═══════════════════════════════════════ */

interface Kingdom {
  gold: number;
  food: number;
  soldiers: number;
  people: number;
  happiness: number; // 0~100
  territory: number;
  fame: number;
}

interface Event {
  id: number;
  text: string;
  emoji: string;
  choices: { label: string; effect: Partial<Kingdom>; result: string }[];
}

type Phase = "intro" | "playing" | "event" | "war" | "ending";
type Rank = "농부" | "촌장" | "기사" | "남작" | "백작" | "공작" | "왕자" | "왕" | "대왕" | "황제";

const RANKS: { name: Rank; fame: number; emoji: string }[] = [
  { name: "농부", fame: 0, emoji: "🧑‍🌾" },
  { name: "촌장", fame: 50, emoji: "🏘️" },
  { name: "기사", fame: 150, emoji: "⚔️" },
  { name: "남작", fame: 300, emoji: "🏰" },
  { name: "백작", fame: 500, emoji: "👑" },
  { name: "공작", fame: 800, emoji: "🦁" },
  { name: "왕자", fame: 1200, emoji: "🤴" },
  { name: "왕", fame: 1800, emoji: "👑" },
  { name: "대왕", fame: 2500, emoji: "🏆" },
  { name: "황제", fame: 4000, emoji: "⚜️" },
];

const RANDOM_EVENTS: Omit<Event, "id">[] = [
  {
    text: "이웃 마을에서 도움을 요청합니다!",
    emoji: "🆘",
    choices: [
      { label: "🤝 도와준다 (금화 -30, 명성 +40)", effect: { gold: -30, fame: 40, happiness: 10 }, result: "마을 사람들이 감사합니다! 명성이 올랐어요!" },
      { label: "🙅 무시한다", effect: { fame: -10, happiness: -5 }, result: "냉정하다는 소문이 퍼졌어요..." },
    ],
  },
  {
    text: "상인이 희귀한 보물을 팝니다!",
    emoji: "💎",
    choices: [
      { label: "💰 구매한다 (금화 -50, 명성 +30)", effect: { gold: -50, fame: 30 }, result: "멋진 보물을 얻었어요! 명성이 올랐습니다!" },
      { label: "🙅 거절한다", effect: {}, result: "상인이 아쉬워하며 떠났어요." },
    ],
  },
  {
    text: "가뭄이 들었습니다!",
    emoji: "☀️",
    choices: [
      { label: "💧 관개 시설 건설 (금화 -40, 식량 +30)", effect: { gold: -40, food: 30, happiness: 10, fame: 20 }, result: "관개 시설 덕분에 작물이 살아났어요!" },
      { label: "🙏 기도한다", effect: { food: -20, happiness: -10 }, result: "식량이 줄어들었어요..." },
    ],
  },
  {
    text: "축제를 열자는 제안이 왔습니다!",
    emoji: "🎉",
    choices: [
      { label: "🎊 축제를 연다 (금화 -25, 식량 -15)", effect: { gold: -25, food: -15, happiness: 25, fame: 15, people: 10 }, result: "축제가 대성공! 사람들이 모여듭니다!" },
      { label: "📊 절약한다", effect: { happiness: -5 }, result: "사람들이 실망했어요." },
    ],
  },
  {
    text: "도적 떼가 나타났습니다!",
    emoji: "🏴‍☠️",
    choices: [
      { label: "⚔️ 싸운다 (병사 -5)", effect: { soldiers: -5, fame: 25, gold: 20 }, result: "도적을 물리쳤어요! 보물을 얻었습니다!" },
      { label: "💰 뇌물을 준다 (금화 -30)", effect: { gold: -30, fame: -10 }, result: "도적이 떠났지만 약해 보인다는 소문이..." },
    ],
  },
  {
    text: "유능한 장군이 합류하고 싶어합니다!",
    emoji: "🎖️",
    choices: [
      { label: "🤝 받아들인다 (금화 -20)", effect: { gold: -20, soldiers: 15, fame: 15 }, result: "강력한 장군이 합류했어요!" },
      { label: "🙅 거절한다", effect: {}, result: "장군이 떠났어요." },
    ],
  },
  {
    text: "농민들이 세금을 줄여달라고 합니다!",
    emoji: "📜",
    choices: [
      { label: "📉 세금 인하 (금화 -20)", effect: { gold: -20, happiness: 20, people: 10, fame: 10 }, result: "백성들이 기뻐해요! 사람들이 몰려옵니다!" },
      { label: "📈 세금 유지", effect: { happiness: -15, people: -5 }, result: "백성들이 불만이에요..." },
    ],
  },
  {
    text: "외국 사절이 동맹을 제안합니다!",
    emoji: "🤝",
    choices: [
      { label: "🏳️ 동맹 수락 (명성 +30, 영토 +1)", effect: { fame: 30, territory: 1, happiness: 5 }, result: "강력한 동맹을 맺었어요!" },
      { label: "💪 독립 유지", effect: { fame: 5 }, result: "홀로 서는 길을 택했어요." },
    ],
  },
  {
    text: "전설의 기사가 도전장을 내밀었습니다!",
    emoji: "🏇",
    choices: [
      { label: "⚔️ 대결! (50% 확률)", effect: {}, result: "" },
      { label: "🤝 친구가 된다 (금화 -15)", effect: { gold: -15, soldiers: 10, fame: 20 }, result: "전설의 기사가 동료가 됐어요!" },
    ],
  },
  {
    text: "용이 나타났습니다!!",
    emoji: "🐉",
    choices: [
      { label: "🗡️ 용과 싸운다! (병사 -10)", effect: { soldiers: -10, fame: 50, gold: 80, territory: 2 }, result: "용을 물리쳤어요!! 전설이 됐습니다!" },
      { label: "🏃 도망간다", effect: { fame: -20, happiness: -10, food: -20 }, result: "용이 마을을 약탈했어요..." },
    ],
  },
];

const BUILDINGS = [
  { name: "농장", emoji: "🌾", cost: { gold: 20 }, effect: { food: 15, people: 5 }, desc: "식량 +15, 인구 +5" },
  { name: "막사", emoji: "🏕️", cost: { gold: 30 }, effect: { soldiers: 10 }, desc: "병사 +10" },
  { name: "시장", emoji: "🏪", cost: { gold: 25 }, effect: { gold: 15, happiness: 5 }, desc: "금화 +15, 행복 +5" },
  { name: "성벽", emoji: "🧱", cost: { gold: 40 }, effect: { fame: 15, soldiers: 5 }, desc: "명성 +15, 병사 +5" },
  { name: "학교", emoji: "🏫", cost: { gold: 35 }, effect: { fame: 10, happiness: 10, people: 5 }, desc: "명성 +10, 행복 +10" },
  { name: "성당", emoji: "⛪", cost: { gold: 50 }, effect: { fame: 25, happiness: 15 }, desc: "명성 +25, 행복 +15" },
  { name: "탑", emoji: "🗼", cost: { gold: 60 }, effect: { fame: 30, territory: 1 }, desc: "명성 +30, 영토 +1" },
  { name: "성", emoji: "🏰", cost: { gold: 100 }, effect: { fame: 50, territory: 2, soldiers: 10, happiness: 10 }, desc: "모든 것!" },
];

export default function KingGame() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [kingdom, setKingdom] = useState<Kingdom>({
    gold: 50, food: 40, soldiers: 5, people: 20, happiness: 60, territory: 1, fame: 0,
  });
  const [turn, setTurn] = useState(1);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [eventResult, setEventResult] = useState("");
  const [buildings, setBuildings] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [warEnemy, setWarEnemy] = useState({ name: "", soldiers: 0, emoji: "" });
  const [warResult, setWarResult] = useState("");
  const eventIdRef = useState(0);

  const currentRank = RANKS.reduce((best, r) => kingdom.fame >= r.fame ? r : best, RANKS[0]);
  const nextRank = RANKS.find(r => r.fame > kingdom.fame);

  const addLog = (text: string) => setLog(prev => [...prev.slice(-20), text]);

  const applyEffect = useCallback((effect: Partial<Kingdom>) => {
    setKingdom(prev => {
      const k = { ...prev };
      if (effect.gold) k.gold = Math.max(0, k.gold + effect.gold);
      if (effect.food) k.food = Math.max(0, k.food + effect.food);
      if (effect.soldiers) k.soldiers = Math.max(0, k.soldiers + effect.soldiers);
      if (effect.people) k.people = Math.max(0, k.people + effect.people);
      if (effect.happiness) k.happiness = Math.max(0, Math.min(100, k.happiness + effect.happiness));
      if (effect.territory) k.territory = Math.max(1, k.territory + effect.territory);
      if (effect.fame) k.fame = Math.max(0, k.fame + effect.fame);
      return k;
    });
  }, []);

  // 턴 종료 효과
  const endTurn = useCallback(() => {
    setKingdom(prev => {
      const k = { ...prev };
      // 세금 수입
      k.gold += Math.floor(k.people * 0.5 + k.territory * 5);
      // 식량 소비
      k.food -= Math.floor(k.people * 0.3 + k.soldiers * 0.2);
      // 인구 변화
      if (k.food <= 0) { k.happiness -= 15; k.people -= 5; k.food = 0; }
      if (k.happiness < 20) k.people -= 3;
      if (k.happiness > 70) k.people += 2;
      // 명성 자연 증가
      k.fame += Math.floor(k.territory * 2 + k.people * 0.1);
      k.people = Math.max(1, k.people);
      k.happiness = Math.max(0, Math.min(100, k.happiness));
      return k;
    });

    setTurn(t => t + 1);

    // 랜덤 이벤트 (60% 확률)
    if (Math.random() < 0.6) {
      const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      setCurrentEvent({ ...evt, id: Date.now() });
      setEventResult("");
      setPhase("event");
    }
  }, []);

  // 건물 건설
  const build = useCallback((building: typeof BUILDINGS[number]) => {
    if (kingdom.gold < building.cost.gold) {
      addLog(`❌ 금화가 부족해요! (필요: ${building.cost.gold})`);
      return;
    }
    applyEffect({ gold: -building.cost.gold, ...building.effect });
    setBuildings(prev => [...prev, building.emoji]);
    addLog(`🏗️ ${building.emoji} ${building.name}을(를) 건설했어요!`);
  }, [kingdom.gold, applyEffect]);

  // 전쟁
  const startWar = useCallback(() => {
    const enemies = [
      { name: "고블린 부족", soldiers: 5 + turn * 2, emoji: "👺" },
      { name: "해적단", soldiers: 10 + turn * 2, emoji: "🏴‍☠️" },
      { name: "오크 군대", soldiers: 15 + turn * 3, emoji: "👹" },
      { name: "이웃 왕국", soldiers: 20 + turn * 3, emoji: "⚔️" },
      { name: "암흑 제국", soldiers: 30 + turn * 4, emoji: "🖤" },
    ];
    const enemy = enemies[Math.min(enemies.length - 1, Math.floor(turn / 5))];
    setWarEnemy(enemy);
    setWarResult("");
    setPhase("war");
  }, [turn]);

  const fightWar = useCallback(() => {
    const myPower = kingdom.soldiers * (1 + kingdom.happiness / 200);
    const enemyPower = warEnemy.soldiers;
    const won = myPower > enemyPower * (0.7 + Math.random() * 0.6);

    if (won) {
      const goldWin = 20 + warEnemy.soldiers * 2;
      const fameWin = 20 + warEnemy.soldiers;
      applyEffect({
        soldiers: -Math.floor(warEnemy.soldiers * 0.3),
        gold: goldWin,
        fame: fameWin,
        territory: 1,
        happiness: 10,
      });
      setWarResult(`🎉 승리! 금화 +${goldWin}, 명성 +${fameWin}, 영토 +1`);
      addLog(`⚔️ ${warEnemy.name}에게 승리!`);
    } else {
      applyEffect({
        soldiers: -Math.floor(kingdom.soldiers * 0.5),
        gold: -20,
        fame: -15,
        happiness: -15,
      });
      setWarResult("💀 패배... 병사와 자원을 잃었어요.");
      addLog(`💀 ${warEnemy.name}에게 패배...`);
    }
  }, [kingdom, warEnemy, applyEffect]);

  // 게임 오버 체크
  useEffect(() => {
    if (phase !== "playing") return;
    if (kingdom.people <= 0 || (kingdom.gold <= 0 && kingdom.food <= 0)) {
      setPhase("ending");
    }
    if (kingdom.fame >= 4000) {
      setPhase("ending");
    }
  }, [kingdom, phase]);

  /* ═══ 인트로 ═══ */
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-yellow-950 to-gray-950 flex flex-col items-center justify-center p-6 text-white">
        <Link href="/" className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm">← 홈으로</Link>
        <div className="text-center">
          <div className="text-7xl mb-4">👑</div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
            왕 되기
          </h1>
          <p className="text-gray-400 mb-8 text-sm">농부에서 시작해 황제가 되어라!</p>

          <button onClick={() => setPhase("playing")}
            className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold text-xl px-10 py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95">
            왕국 시작! 🏰
          </button>

          <div className="mt-8 bg-white/5 rounded-2xl p-5 max-w-sm text-xs text-gray-400 space-y-1">
            <p className="font-bold text-gray-300 text-center mb-2">🎮 게임 방법</p>
            <p>• 건물을 지어 왕국을 키우세요</p>
            <p>• 이벤트에 현명하게 대응하세요</p>
            <p>• 전쟁에서 승리해 영토를 넓히세요</p>
            <p>• 명성을 쌓아 농부→황제로 승급하세요!</p>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 이벤트 ═══ */
  if (phase === "event" && currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-gray-900 to-black flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{currentEvent.emoji}</div>
            <h2 className="text-xl font-bold mb-2">이벤트 발생!</h2>
            <p className="text-gray-300">{currentEvent.text}</p>
          </div>

          {eventResult ? (
            <div className="text-center">
              <div className="bg-white/10 rounded-2xl p-4 mb-4">
                <p className="text-sm">{eventResult}</p>
              </div>
              <button onClick={() => { setPhase("playing"); setCurrentEvent(null); }}
                className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-8 py-3 font-bold">
                계속하기 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentEvent.choices.map((choice, i) => (
                <button key={i}
                  onClick={() => {
                    // 전설의 기사 특수 처리
                    if (choice.label.includes("50% 확률")) {
                      if (Math.random() < 0.5) {
                        applyEffect({ fame: 40, gold: 30 });
                        setEventResult("⚔️ 대결에서 이겼어요! 명성 +40, 금화 +30!");
                      } else {
                        applyEffect({ fame: -10, soldiers: -3 });
                        setEventResult("💀 졌어요... 명성 -10, 병사 -3");
                      }
                    } else {
                      applyEffect(choice.effect);
                      setEventResult(choice.result);
                    }
                    addLog(`${currentEvent!.emoji} ${choice.label.slice(2, 8)}...`);
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 rounded-xl p-3 text-sm text-left transition-all hover:scale-[1.02]">
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ 전쟁 ═══ */
  if (phase === "war") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-900 to-black flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full text-center">
          <div className="text-6xl mb-3">{warEnemy.emoji}</div>
          <h2 className="text-xl font-bold mb-2">⚔️ {warEnemy.name}</h2>

          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-1">👑</div>
              <div className="text-sm font-bold">내 군대</div>
              <div className="text-2xl font-black text-blue-400">🗡️ {kingdom.soldiers}</div>
            </div>
            <div className="text-3xl self-center">⚔️</div>
            <div className="text-center">
              <div className="text-3xl mb-1">{warEnemy.emoji}</div>
              <div className="text-sm font-bold">적군</div>
              <div className="text-2xl font-black text-red-400">🗡️ {warEnemy.soldiers}</div>
            </div>
          </div>

          {warResult ? (
            <div>
              <div className="bg-white/10 rounded-2xl p-4 mb-4">
                <p className="text-sm">{warResult}</p>
              </div>
              <button onClick={() => setPhase("playing")}
                className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-8 py-3 font-bold">
                돌아가기 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={fightWar}
                className="w-full bg-red-600 hover:bg-red-500 rounded-xl p-3 font-bold text-lg transition-all hover:scale-105 active:scale-95">
                ⚔️ 전투 개시!
              </button>
              <button onClick={() => { applyEffect({ fame: -10 }); setPhase("playing"); addLog("🏳️ 전투를 회피했어요."); }}
                className="w-full bg-white/10 hover:bg-white/20 rounded-xl p-3 text-sm">
                🏳️ 후퇴 (명성 -10)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ 엔딩 ═══ */
  if (phase === "ending") {
    const isVictory = kingdom.fame >= 4000;
    return (
      <div className={`min-h-screen ${isVictory ? "bg-gradient-to-b from-yellow-900 via-amber-950 to-gray-950" : "bg-gradient-to-b from-gray-900 to-black"} flex flex-col items-center justify-center p-6 text-white`}>
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">{isVictory ? "👑" : "💀"}</div>
          <h2 className="text-3xl font-black mb-2">{isVictory ? "황제 등극!" : "왕국 멸망..."}</h2>
          <p className="text-gray-400 mb-6">{isVictory ? "드디어 대륙의 황제가 되었습니다!" : "왕국이 무너졌습니다..."}</p>

          <div className="bg-white/10 rounded-2xl p-5 mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">최종 칭호</span><span className="font-bold text-yellow-400">{currentRank.emoji} {currentRank.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">턴 수</span><span className="font-bold">📅 {turn}턴</span></div>
            <div className="flex justify-between"><span className="text-gray-400">명성</span><span className="font-bold text-amber-400">⭐ {kingdom.fame}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">영토</span><span className="font-bold text-green-400">🗺️ {kingdom.territory}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">건물</span><span className="font-bold">{buildings.join("") || "없음"}</span></div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase("intro"); setKingdom({ gold: 50, food: 40, soldiers: 5, people: 20, happiness: 60, territory: 1, fame: 0 }); setTurn(1); setBuildings([]); setLog([]); }}
              className="flex-1 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl py-3 font-bold hover:scale-105 transition-all">
              다시 하기 🔄
            </button>
            <Link href="/" className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-3 font-bold text-center">홈으로 🏠</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ 메인 게임 ═══ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-stone-900 to-gray-950 text-white pb-4">
      {/* 상단 */}
      <div className="px-3 py-2 bg-black/40 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-xs text-gray-400">← 홈</Link>
          <span className="text-sm font-bold">{currentRank.emoji} {currentRank.name}</span>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-lg">📅 {turn}턴</span>
        </div>
        {/* 명성 바 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-yellow-400 w-10">⭐ 명성</span>
          <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all"
              style={{ width: `${nextRank ? Math.min(100, (kingdom.fame / nextRank.fame) * 100) : 100}%` }} />
          </div>
          <span className="text-[10px] text-gray-400">{kingdom.fame}{nextRank ? `/${nextRank.fame}` : ""}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-3 mt-3">
        {/* 자원 */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { emoji: "💰", label: "금화", value: kingdom.gold, color: "text-yellow-400" },
            { emoji: "🌾", label: "식량", value: kingdom.food, color: kingdom.food < 10 ? "text-red-400" : "text-green-400" },
            { emoji: "⚔️", label: "병사", value: kingdom.soldiers, color: "text-blue-400" },
            { emoji: "👥", label: "인구", value: kingdom.people, color: "text-cyan-400" },
          ].map(r => (
            <div key={r.label} className="bg-black/30 rounded-xl p-2 text-center">
              <div className="text-lg">{r.emoji}</div>
              <div className={`text-sm font-black ${r.color}`}>{r.value}</div>
              <div className="text-[9px] text-gray-500">{r.label}</div>
            </div>
          ))}
        </div>

        {/* 행복도 & 영토 */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-black/30 rounded-xl p-2 flex items-center gap-2">
            <span className="text-lg">😊</span>
            <div className="flex-1">
              <div className="text-[10px] text-gray-400">행복도</div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${kingdom.happiness > 60 ? "bg-green-500" : kingdom.happiness > 30 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${kingdom.happiness}%` }} />
              </div>
            </div>
            <span className="text-xs font-bold">{kingdom.happiness}%</span>
          </div>
          <div className="bg-black/30 rounded-xl p-2 flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <div>
              <div className="text-[10px] text-gray-400">영토</div>
              <div className="text-sm font-black text-green-400">{kingdom.territory}</div>
            </div>
          </div>
        </div>

        {/* 건물 목록 */}
        {buildings.length > 0 && (
          <div className="bg-black/20 rounded-xl p-2 mb-3">
            <div className="text-[10px] text-gray-500 mb-1">🏘️ 내 건물</div>
            <div className="flex flex-wrap gap-1">
              {buildings.map((b, i) => <span key={i} className="text-xl">{b}</span>)}
            </div>
          </div>
        )}

        {/* 건설 */}
        <div className="bg-black/30 rounded-2xl p-3 mb-3 border border-white/10">
          <h3 className="text-xs font-bold text-gray-400 mb-2">🏗️ 건설</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {BUILDINGS.map(b => (
              <button key={b.name} onClick={() => build(b)}
                className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  kingdom.gold >= b.cost.gold ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50"
                }`}>
                <span className="text-xl">{b.emoji}</span>
                <div>
                  <div className="font-bold">{b.name}</div>
                  <div className="text-[9px] text-gray-400">💰{b.cost.gold} → {b.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 행동 버튼 */}
        <div className="flex gap-2 mb-3">
          <button onClick={startWar}
            className="flex-1 bg-red-700/50 hover:bg-red-600/50 rounded-xl p-3 text-sm font-bold text-center transition-all hover:scale-105 active:scale-95"
            disabled={kingdom.soldiers < 3}>
            ⚔️ 전쟁
          </button>
          <button onClick={() => { applyEffect({ food: 20, gold: 5 }); addLog("🌾 농사를 지었어요!"); endTurn(); }}
            className="flex-1 bg-green-700/50 hover:bg-green-600/50 rounded-xl p-3 text-sm font-bold text-center transition-all hover:scale-105 active:scale-95">
            🌾 농사
          </button>
          <button onClick={() => { applyEffect({ gold: 15 + kingdom.territory * 3 }); addLog("💰 세금을 걷었어요!"); endTurn(); }}
            className="flex-1 bg-yellow-700/50 hover:bg-yellow-600/50 rounded-xl p-3 text-sm font-bold text-center transition-all hover:scale-105 active:scale-95">
            💰 세금
          </button>
          <button onClick={() => { endTurn(); addLog("⏩ 턴을 넘겼어요."); }}
            className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl p-3 text-sm font-bold text-center transition-all">
            ⏩ 다음
          </button>
        </div>

        {/* 로그 */}
        <div className="bg-black/40 rounded-xl p-2 max-h-24 overflow-y-auto">
          {log.slice(-5).map((l, i) => (
            <p key={i} className="text-[10px] text-gray-400">{l}</p>
          ))}
        </div>

        {/* 다음 칭호 */}
        {nextRank && (
          <div className="mt-2 text-center text-[10px] text-gray-500">
            다음 칭호: {nextRank.emoji} {nextRank.name} (명성 {nextRank.fame} 필요)
          </div>
        )}
      </div>
    </div>
  );
}
