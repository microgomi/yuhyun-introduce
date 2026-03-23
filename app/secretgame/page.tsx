"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "playing" | "caught" | "cleared";
type MiniGame = "mashing" | "memory" | "reaction" | "math" | "typing";

interface DadState {
  phase: "away" | "coming" | "watching" | "leaving";
  timer: number;
  anger: number;
  emoji: string;
  quote: string;
}

// --- Constants ---
const W = 360;
const H = 560;

const DAD_QUOTES_AWAY = [
  "흠흠... 커피나 마셔야지",
  "화장실 좀...",
  "전화 좀 받고 올게",
  "택배 왔나?",
  "잠깐 나갔다 올게",
];

const DAD_QUOTES_COMING = [
  "뭐 하고 있어?",
  "공부는 하고 있지?",
  "게임 하는 거 아니지?",
  "아빠가 간다~",
  "잠깐만!",
];

const DAD_QUOTES_WATCHING = [
  "뭐야 이게?!",
  "게임 하고 있었어?!",
  "공부한다더니!!",
  "당장 꺼!!",
  "혼난다!!",
];

const FAKE_STUDY_SCREENS = [
  { title: "수학 문제집", emoji: "📐", text: "23 × 47 = ?" },
  { title: "국어 교과서", emoji: "📖", text: "다음 글을 읽고 물음에 답하시오..." },
  { title: "영어 단어장", emoji: "📝", text: "apple = 사과, banana = 바나나..." },
  { title: "과학 실험", emoji: "🔬", text: "물의 끓는점은 100°C이다..." },
  { title: "사회 교과서", emoji: "🌏", text: "대한민국의 수도는 서울이다..." },
];

const MINIGAME_DEFS: { type: MiniGame; name: string; emoji: string; desc: string; points: number }[] = [
  { type: "mashing", name: "버튼 연타", emoji: "👆", desc: "빠르게 클릭!", points: 10 },
  { type: "memory", name: "숫자 기억", emoji: "🧠", desc: "숫자를 외워라!", points: 20 },
  { type: "reaction", name: "반응 속도", emoji: "⚡", desc: "초록색에 클릭!", points: 15 },
  { type: "math", name: "암산왕", emoji: "🔢", desc: "빨리 계산!", points: 20 },
  { type: "typing", name: "타자왕", emoji: "⌨️", desc: "글자를 입력!", points: 15 },
];

export default function SecretGamePage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [message, setMessage] = useState("");

  // Dad state
  const [dadPhase, setDadPhase] = useState<DadState["phase"]>("away");
  const [dadTimer, setDadTimer] = useState(0);
  const [dadAnger, setDadAnger] = useState(0);
  const [dadEmoji, setDadEmoji] = useState("😴");
  const [dadQuote, setDadQuote] = useState("");
  const [dadWarning, setDadWarning] = useState(0); // 0~100 warning bar

  // Minigame state
  const [currentMini, setCurrentMini] = useState<MiniGame | null>(null);
  const [miniActive, setMiniActive] = useState(false);
  const [miniTimer, setMiniTimer] = useState(0);
  const [miniData, setMiniData] = useState<Record<string, unknown>>({});
  const [hideScreen, setHideScreen] = useState(false); // fake study screen
  const [fakeIdx, setFakeIdx] = useState(0);
  const [caught, setCaught] = useState(false);

  // Mashing
  const [mashCount, setMashCount] = useState(0);
  const [mashGoal, setMashGoal] = useState(20);

  // Memory
  const [memNumbers, setMemNumbers] = useState<number[]>([]);
  const [memPhase, setMemPhase] = useState<"show" | "input">("show");
  const [memInput, setMemInput] = useState("");

  // Reaction
  const [reactionPhase, setReactionPhase] = useState<"wait" | "go" | "done">("wait");
  const [reactionStart, setReactionStart] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);

  // Math
  const [mathQ, setMathQ] = useState("");
  const [mathA, setMathA] = useState(0);
  const [mathInput, setMathInput] = useState("");
  const [mathSolved, setMathSolved] = useState(0);

  // Typing
  const [typeWord, setTypeWord] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [typeSolved, setTypeSolved] = useState(0);

  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const dadRef = useRef({ phase: "away" as DadState["phase"], timer: 0, anger: 0, warning: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef(false);

  const showMsg = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 1200);
  }, []);

  // Clean up
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Dad AI loop
  const startDadLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    dadRef.current = { phase: "away", timer: 100 + Math.random() * 150, anger: 0, warning: 0 };
    setDadPhase("away");
    setDadEmoji("😴");
    setDadQuote(DAD_QUOTES_AWAY[Math.floor(Math.random() * DAD_QUOTES_AWAY.length)]);
    setDadWarning(0);
    setDadAnger(0);

    intervalRef.current = setInterval(() => {
      const d = dadRef.current;
      d.timer--;

      if (d.phase === "away") {
        // Warning increases as timer approaches 0
        d.warning = Math.max(0, Math.floor((1 - d.timer / 100) * 100));
        setDadWarning(d.warning);

        if (d.timer <= 0) {
          d.phase = "coming";
          d.timer = 40 + Math.random() * 30; // time before arrives
          setDadPhase("coming");
          setDadEmoji("🚶");
          setDadQuote(DAD_QUOTES_COMING[Math.floor(Math.random() * DAD_QUOTES_COMING.length)]);
        }
      } else if (d.phase === "coming") {
        d.warning = 100;
        setDadWarning(100);

        if (d.timer <= 0) {
          d.phase = "watching";
          d.timer = 60 + Math.random() * 40;
          setDadPhase("watching");
          setDadEmoji("👀");

          // Check if player is hiding
          if (!hideRef.current) {
            // CAUGHT!
            d.anger++;
            setDadAnger(d.anger);
            setDadQuote(DAD_QUOTES_WATCHING[Math.floor(Math.random() * DAD_QUOTES_WATCHING.length)]);
            setDadEmoji("😡");

            if (d.anger >= 3) {
              setCaught(true);
              setScore(scoreRef.current);
              setBestScore((p) => Math.max(p, scoreRef.current));
              setTotalGames((g) => g + 1);
              setScreen("caught");
              if (intervalRef.current) clearInterval(intervalRef.current);
              return;
            } else {
              setMessage(`😡 ${d.anger}/3 들킴! 조심해!`);
              setTimeout(() => setMessage(""), 1500);
            }
          } else {
            setDadQuote("음... 공부 열심히 하네");
            setDadEmoji("😊");
          }
        }
      } else if (d.phase === "watching") {
        if (d.timer <= 0) {
          d.phase = "leaving";
          d.timer = 20;
          setDadPhase("leaving");
          setDadEmoji("🚶");
          setDadQuote("그래, 열심히 해라~");
        } else {
          // If hiding is dropped while watching
          if (!hideRef.current && d.timer < 40) {
            d.anger++;
            setDadAnger(d.anger);
            setDadQuote(DAD_QUOTES_WATCHING[Math.floor(Math.random() * DAD_QUOTES_WATCHING.length)]);
            setDadEmoji("😡");
            d.phase = "leaving";
            d.timer = 20;

            if (d.anger >= 3) {
              setCaught(true);
              setScore(scoreRef.current);
              setBestScore((p) => Math.max(p, scoreRef.current));
              setTotalGames((g) => g + 1);
              setScreen("caught");
              if (intervalRef.current) clearInterval(intervalRef.current);
              return;
            }
          }
        }
      } else if (d.phase === "leaving") {
        d.warning = Math.max(0, d.warning - 3);
        setDadWarning(d.warning);

        if (d.timer <= 0) {
          // Speed up with rounds
          const baseTime = Math.max(60, 150 - roundRef.current * 10);
          d.phase = "away";
          d.timer = baseTime + Math.random() * 80;
          d.warning = 0;
          setDadPhase("away");
          setDadEmoji("😴");
          setDadQuote(DAD_QUOTES_AWAY[Math.floor(Math.random() * DAD_QUOTES_AWAY.length)]);
          setDadWarning(0);
        }
      }
    }, 50);
  }, [showMsg]);

  // Start game
  const startGame = useCallback(() => {
    scoreRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setRound(1);
    setDadAnger(0);
    setCaught(false);
    setHideScreen(false);
    hideRef.current = false;
    setMessage("");
    setCurrentMini(null);
    setMiniActive(false);

    setScreen("playing");
    startDadLoop();
    startMiniGame();
  }, [startDadLoop]);

  // Start a random minigame
  const startMiniGame = useCallback(() => {
    const def = MINIGAME_DEFS[Math.floor(Math.random() * MINIGAME_DEFS.length)];
    setCurrentMini(def.type);
    setMiniActive(true);
    setMiniTimer(0);

    switch (def.type) {
      case "mashing": {
        const goal = 15 + roundRef.current * 3;
        setMashCount(0);
        setMashGoal(goal);
        break;
      }
      case "memory": {
        const len = 3 + Math.min(4, Math.floor(roundRef.current / 2));
        const nums = Array.from({ length: len }, () => Math.floor(Math.random() * 10));
        setMemNumbers(nums);
        setMemPhase("show");
        setMemInput("");
        setTimeout(() => setMemPhase("input"), 2000 + len * 300);
        break;
      }
      case "reaction": {
        setReactionPhase("wait");
        setReactionTime(0);
        const delay = 1500 + Math.random() * 3000;
        setTimeout(() => {
          setReactionPhase("go");
          setReactionStart(Date.now());
        }, delay);
        break;
      }
      case "math": {
        setMathSolved(0);
        generateMath();
        break;
      }
      case "typing": {
        setTypeSolved(0);
        generateWord();
        break;
      }
    }
  }, []);

  const generateMath = useCallback(() => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer: number;
    switch (op) {
      case "+": answer = a + b; break;
      case "-": answer = a - b; break;
      default: answer = a * b; break;
    }
    setMathQ(`${a} ${op} ${b} = ?`);
    setMathA(answer);
    setMathInput("");
  }, []);

  const WORDS = ["사과", "바나나", "학교", "로블록스", "컴퓨터", "게임", "아빠", "엄마", "공부", "수학", "과학", "영어", "친구", "선생님", "숙제"];

  const generateWord = useCallback(() => {
    setTypeWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setTypeInput("");
  }, []);

  // Toggle hide (show fake study screen)
  const toggleHide = useCallback(() => {
    const newHide = !hideRef.current;
    hideRef.current = newHide;
    setHideScreen(newHide);
    if (newHide) {
      setFakeIdx(Math.floor(Math.random() * FAKE_STUDY_SCREENS.length));
    }
  }, []);

  // Complete minigame
  const completeMini = useCallback((bonus: number) => {
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    roundRef.current++;
    setRound(roundRef.current);
    setMiniActive(false);
    showMsg(`✅ +${bonus}점!`);

    // Check clear (10 rounds)
    if (roundRef.current > 10) {
      setBestScore((p) => Math.max(p, scoreRef.current));
      setTotalGames((g) => g + 1);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setScreen("cleared");
      return;
    }

    setTimeout(() => startMiniGame(), 1000);
  }, [showMsg, startMiniGame]);

  // Handle mash
  const handleMash = useCallback(() => {
    setMashCount((prev) => {
      const next = prev + 1;
      if (next >= mashGoal) {
        completeMini(10 + roundRef.current * 2);
      }
      return next;
    });
  }, [mashGoal, completeMini]);

  // Handle memory input
  const handleMemSubmit = useCallback(() => {
    const correct = memNumbers.join("");
    if (memInput === correct) {
      completeMini(20 + roundRef.current * 3);
    } else {
      showMsg("❌ 틀렸어! 다시!");
      setMemInput("");
    }
  }, [memInput, memNumbers, completeMini, showMsg]);

  // Handle reaction click
  const handleReactionClick = useCallback(() => {
    if (reactionPhase === "wait") {
      showMsg("❌ 너무 빨라!");
      setReactionPhase("wait");
      const delay = 1500 + Math.random() * 3000;
      setTimeout(() => {
        setReactionPhase("go");
        setReactionStart(Date.now());
      }, delay);
      return;
    }
    if (reactionPhase === "go") {
      const t = Date.now() - reactionStart;
      setReactionTime(t);
      setReactionPhase("done");
      const bonus = Math.max(5, 30 - Math.floor(t / 20));
      completeMini(bonus);
    }
  }, [reactionPhase, reactionStart, completeMini, showMsg]);

  // Handle math submit
  const handleMathSubmit = useCallback(() => {
    if (parseInt(mathInput) === mathA) {
      const next = mathSolved + 1;
      setMathSolved(next);
      if (next >= 3) {
        completeMini(20 + roundRef.current * 2);
      } else {
        showMsg("✅ 맞았어!");
        generateMath();
      }
    } else {
      showMsg("❌ 틀렸어!");
      setMathInput("");
    }
  }, [mathInput, mathA, mathSolved, completeMini, generateMath, showMsg]);

  // Handle type submit
  const handleTypeSubmit = useCallback(() => {
    if (typeInput === typeWord) {
      const next = typeSolved + 1;
      setTypeSolved(next);
      if (next >= 3) {
        completeMini(15 + roundRef.current * 2);
      } else {
        showMsg("✅ 맞았어!");
        generateWord();
      }
    } else {
      showMsg("❌ 틀렸어!");
      setTypeInput("");
    }
  }, [typeInput, typeWord, typeSolved, completeMini, generateWord, showMsg]);

  const warningColor = dadWarning > 70 ? "from-red-500 to-red-600" : dadWarning > 40 ? "from-yellow-500 to-orange-500" : "from-green-500 to-green-600";

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>

          <div className="text-7xl">🕵️🎮</div>
          <h1 className="text-3xl font-black">
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">아빠 몰래 게임해라</span>
          </h1>
          <p className="text-lg text-slate-400">아빠한테 들키지 않게 게임하자!</p>

          <button onClick={startGame}
            className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-12 py-4 text-xl font-black shadow-lg shadow-green-500/30 transition-transform hover:scale-105 active:scale-95">
            🎮 시작!
          </button>

          {bestScore > 0 && (
            <div className="rounded-xl bg-white/5 px-8 py-4 space-y-1">
              <p className="text-sm text-slate-400">🏆 최고점수: <span className="font-bold text-amber-400">{bestScore}</span></p>
              <p className="text-sm text-slate-400">🎮 플레이: <span className="font-bold text-cyan-400">{totalGames}회</span></p>
            </div>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-bold text-green-400">🎮 플레이 방법</p>
            <p>1️⃣ 미니게임을 클리어해서 점수를 모아요</p>
            <p>2️⃣ 아빠가 오면 빨리 📚공부 화면으로 숨기기!</p>
            <p>3️⃣ 3번 들키면 게임 오버!</p>
            <p>4️⃣ 10라운드 클리어하면 성공!</p>
            <p className="font-bold text-green-400 mt-2">⚠️ 경고바</p>
            <p>🟢 안전 → 🟡 주의 → 🔴 위험 (아빠가 온다!)</p>
            <p className="font-bold text-green-400 mt-2">📚 숨기기</p>
            <p>화면 아래 [📚 공부하는 척!] 버튼을 눌러 숨겨요</p>
          </div>
        </div>
      )}

      {/* Playing */}
      {screen === "playing" && (
        <div className="flex min-h-screen flex-col items-center pt-2 px-3 w-full max-w-sm">
          {/* Dad warning bar */}
          <div className="mb-2 w-full">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{dadEmoji} 아빠</span>
              <span className="text-slate-400">라운드 {round}/10</span>
              <span>⭐ {score}</span>
            </div>
            <div className="h-4 w-full rounded-full bg-black/30 overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${warningColor} transition-all duration-300`}
                style={{ width: `${dadWarning}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">{dadQuote}</span>
              <span className="text-[10px]">
                {dadAnger > 0 && Array.from({ length: dadAnger }, (_, i) => <span key={i}>😡</span>)}
                {Array.from({ length: 3 - dadAnger }, (_, i) => <span key={i}>😶</span>)}
              </span>
            </div>
          </div>

          {message && (
            <div className="mb-2 rounded-lg bg-white/10 px-4 py-1.5 text-center text-sm font-bold">{message}</div>
          )}

          {/* Fake study screen overlay */}
          {hideScreen && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white text-zinc-900 px-8">
              <div className="text-6xl mb-4">{FAKE_STUDY_SCREENS[fakeIdx].emoji}</div>
              <h2 className="text-2xl font-black mb-2">{FAKE_STUDY_SCREENS[fakeIdx].title}</h2>
              <p className="text-center text-zinc-500 text-sm mb-8">{FAKE_STUDY_SCREENS[fakeIdx].text}</p>
              <div className="w-full max-w-xs space-y-2 text-sm text-zinc-400">
                <div className="h-3 rounded bg-zinc-200 w-full" />
                <div className="h-3 rounded bg-zinc-200 w-4/5" />
                <div className="h-3 rounded bg-zinc-200 w-3/5" />
                <div className="h-3 rounded bg-zinc-200 w-full" />
                <div className="h-3 rounded bg-zinc-200 w-2/3" />
              </div>
              <button onClick={toggleHide}
                className="mt-8 rounded-xl bg-red-500 px-8 py-3 text-white font-bold transition-transform hover:scale-105 active:scale-95">
                🎮 다시 게임하기
              </button>
              <p className="mt-2 text-[10px] text-zinc-400">아빠가 가면 다시 게임하기를 눌러요!</p>
            </div>
          )}

          {/* Minigame area */}
          {!hideScreen && miniActive && currentMini && (
            <div className="w-full rounded-2xl border-2 border-white/10 bg-white/5 p-4 mb-3">
              {/* Mashing */}
              {currentMini === "mashing" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-green-400">👆 버튼 연타! ({mashCount}/{mashGoal})</p>
                  <div className="h-3 w-full rounded-full bg-black/30 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${(mashCount / mashGoal) * 100}%` }} />
                  </div>
                  <button onClick={handleMash}
                    className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-4xl font-black shadow-lg shadow-green-500/30 transition-transform active:scale-90">
                    👆
                  </button>
                </div>
              )}

              {/* Memory */}
              {currentMini === "memory" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-purple-400">🧠 숫자를 외워라!</p>
                  {memPhase === "show" ? (
                    <div className="flex gap-2">
                      {memNumbers.map((n, i) => (
                        <span key={i} className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/30 text-2xl font-black">{n}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-slate-400">숫자를 순서대로 입력!</p>
                      <input
                        type="text" inputMode="numeric" value={memInput}
                        onChange={(e) => setMemInput(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleMemSubmit()}
                        className="w-48 rounded-xl bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-widest outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                        placeholder="????"
                      />
                      <button onClick={handleMemSubmit}
                        className="rounded-xl bg-purple-500 px-6 py-2 font-bold transition-transform active:scale-95">확인</button>
                    </div>
                  )}
                </div>
              )}

              {/* Reaction */}
              {currentMini === "reaction" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-yellow-400">⚡ 초록색에 클릭!</p>
                  <button onClick={handleReactionClick}
                    className={`h-28 w-28 rounded-full text-4xl font-black shadow-lg transition-all active:scale-90 ${
                      reactionPhase === "go" ? "bg-green-500 shadow-green-500/30" :
                      reactionPhase === "done" ? "bg-blue-500 shadow-blue-500/30" :
                      "bg-red-500 shadow-red-500/30"
                    }`}>
                    {reactionPhase === "go" ? "⚡" : reactionPhase === "done" ? "✅" : "⏳"}
                  </button>
                  {reactionPhase === "done" && (
                    <p className="text-sm text-cyan-400 font-bold">{reactionTime}ms!</p>
                  )}
                </div>
              )}

              {/* Math */}
              {currentMini === "math" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-blue-400">🔢 암산왕! ({mathSolved}/3)</p>
                  <p className="text-3xl font-black">{mathQ}</p>
                  <div className="flex gap-2">
                    <input
                      type="text" inputMode="numeric" value={mathInput}
                      onChange={(e) => setMathInput(e.target.value.replace(/[^\d-]/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleMathSubmit()}
                      className="w-28 rounded-xl bg-black/30 px-4 py-3 text-center text-2xl font-black outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      placeholder="?"
                    />
                    <button onClick={handleMathSubmit}
                      className="rounded-xl bg-blue-500 px-5 py-2 font-bold transition-transform active:scale-95">확인</button>
                  </div>
                </div>
              )}

              {/* Typing */}
              {currentMini === "typing" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-orange-400">⌨️ 타자왕! ({typeSolved}/3)</p>
                  <p className="text-3xl font-black">{typeWord}</p>
                  <div className="flex gap-2">
                    <input
                      type="text" value={typeInput}
                      onChange={(e) => setTypeInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTypeSubmit()}
                      className="w-36 rounded-xl bg-black/30 px-4 py-3 text-center text-xl font-black outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                      placeholder="입력..."
                    />
                    <button onClick={handleTypeSubmit}
                      className="rounded-xl bg-orange-500 px-5 py-2 font-bold transition-transform active:scale-95">확인</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Not in minigame */}
          {!hideScreen && !miniActive && (
            <div className="w-full rounded-2xl border-2 border-white/10 bg-white/5 p-8 text-center">
              <p className="text-lg font-bold text-slate-400">다음 게임 준비 중...</p>
              <div className="mt-4 animate-spin text-4xl">🎮</div>
            </div>
          )}

          {/* Hide button - always visible */}
          <button onClick={toggleHide}
            className={`mt-3 w-full rounded-2xl py-4 text-center font-black text-lg transition-all active:scale-95 ${
              hideScreen
                ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/30"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30"
            } ${dadWarning > 60 ? "animate-pulse" : ""}`}>
            {hideScreen ? "🎮 다시 게임하기" : "📚 공부하는 척!"}
          </button>

          {dadWarning > 60 && !hideScreen && (
            <p className="mt-1 text-xs text-red-400 font-bold animate-pulse">⚠️ 아빠가 오고 있어! 빨리 숨겨!</p>
          )}
        </div>
      )}

      {/* Caught */}
      {screen === "caught" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">😡📱💢</div>
          <h2 className="text-4xl font-black text-red-400">들켰다!</h2>
          <p className="text-lg text-slate-400">아빠한테 3번 들켰어요...</p>
          <p className="text-sm text-slate-500">아빠: &quot;게임기 압수!&quot;</p>

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p className="text-2xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
            )}
            <p className="text-sm text-slate-400">📊 라운드: {round}/10</p>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}

      {/* Cleared */}
      {screen === "cleared" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="text-7xl">🎉🕵️✨</div>
          <h2 className="text-4xl font-black text-green-400">완벽한 게이머!</h2>
          <p className="text-lg text-slate-400">아빠 몰래 10라운드 클리어!</p>

          <div className="rounded-xl bg-white/5 px-8 py-5 space-y-2">
            <p className="text-3xl font-black text-amber-400">⭐ {score}점</p>
            {score >= bestScore && score > 0 && (
              <p className="text-sm font-bold text-amber-400 animate-bounce">🏆 최고 기록!</p>
            )}
            <p className="text-sm text-slate-400">😡 들킨 횟수: {dadAnger}번</p>
          </div>

          <div className="flex gap-3">
            <button onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              🔄 다시하기
            </button>
            <button onClick={() => setScreen("menu")}
              className="rounded-xl bg-white/10 px-8 py-3 font-bold transition-transform hover:scale-105 active:scale-95">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
