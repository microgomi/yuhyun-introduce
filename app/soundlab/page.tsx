"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { analyze, classify, type Features, type Guess } from "./soundClassify";
import { type Clip, useRecorder } from "./useRecorder";

type Mode = "menu" | "mission" | "free";
type MissionPhase = "ask" | "judged" | "done";

const ROUNDS = 8;
/** 한 문제에서 다시 해 볼 수 있는 횟수 */
const TRIES = 3;
/** 몇 번째 만에 맞혔는지에 따른 점수 */
const POINTS = [100, 60, 30];
/** 1등은 아니어도 2등으로 짐작했으면 주는 위로 점수 */
const CLOSE_POINTS = 15;
const SAVE_KEY = "soundlab_best_v1";

/** 미션으로 낼 소리. 분류기의 id 와 같아야 한다. */
const TARGETS: { id: string; emoji: string; label: string; tip: string }[] = [
  { id: "clap", emoji: "👏", label: "박수 한 번", tip: "손뼉을 짝! 한 번만 세게 쳐요" },
  { id: "knock", emoji: "🥁", label: "쿵! 두드리기", tip: "책상을 주먹으로 쿵 한 번 두드려요" },
  { id: "blow", emoji: "🌬️", label: "후~ 불기", tip: "마이크 쪽으로 후~ 길게 불어요" },
  { id: "voice", emoji: "🗣️", label: "말하기", tip: "\"안녕하세요 반가워요\" 하고 말해요" },
  { id: "whistle", emoji: "🎵", label: "휘파람 · 높은 음", tip: "휘파람이나 \"삐~\" 하고 높게 길게" },
  { id: "crash", emoji: "💥", label: "쾅! 큰 소리", tip: "물건을 떨어뜨리거나 크게 쾅!" },
];

function pickTargets(): string[] {
  const list: string[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const options = TARGETS.filter((t) => t.id !== list[i - 1]);
    list.push(options[Math.floor(Math.random() * options.length)].id);
  }
  return list;
}

function targetOf(id: string) {
  return TARGETS.find((t) => t.id === id) ?? TARGETS[0];
}

interface Result {
  clip: Clip;
  features: Features;
  guesses: Guess[];
}

function judge(clip: Clip): Result {
  const features = analyze(clip.samples, clip.sampleRate);
  return { clip, features, guesses: classify(features) };
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(SAVE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score: number) {
  try {
    localStorage.setItem(SAVE_KEY, String(score));
  } catch {
    // 저장이 막힌 브라우저에서도 게임은 계속된다.
  }
}

export default function SoundLabPage() {
  const rec = useRecorder();
  const [mode, setMode] = useState<Mode>("menu");
  const [best, setBest] = useState(0);

  // 미션 모드 상태
  const [targets, setTargets] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<MissionPhase>("ask");
  const [verdict, setVerdict] = useState<"hit" | "close" | "miss" | null>(null);
  const [history, setHistory] = useState<{ target: string; ok: boolean }[]>([]);

  const [result, setResult] = useState<Result | null>(null);

  const micReady = rec.status === "idle" || rec.status === "armed" || rec.status === "recording";

  // ── 자유 탐지 ──
  const listenFree = useCallback(() => {
    setResult(null);
    rec.listen((clip) => setResult(judge(clip)));
  }, [rec]);

  // ── 미션 ──
  const startMission = useCallback(() => {
    setTargets(pickTargets());
    setRound(0);
    setTries(0);
    setScore(0);
    setHistory([]);
    setResult(null);
    setVerdict(null);
    setPhase("ask");
    setMode("mission");
  }, []);

  const currentTarget = targets[round];

  const listenMission = useCallback(() => {
    if (!currentTarget) return;
    setResult(null);
    setVerdict(null);
    rec.listen((clip) => {
      const r = judge(clip);
      setResult(r);
      setTries((t) => t + 1);
      const top = r.guesses[0]?.id;
      const second = r.guesses[1]?.id;
      if (top === currentTarget) {
        setVerdict("hit");
        setScore((s) => s + POINTS[Math.min(tries, POINTS.length - 1)]);
        setPhase("judged");
      } else {
        setVerdict(second === currentTarget ? "close" : "miss");
        setPhase("judged");
      }
    });
  }, [currentTarget, rec, tries]);

  const outOfTries = verdict !== "hit" && tries >= TRIES;

  const nextRound = useCallback(() => {
    const ok = verdict === "hit";
    // 끝내 못 맞혔지만 2등이었다면 위로 점수
    const finalScore = !ok && verdict === "close" ? score + CLOSE_POINTS : score;
    setScore(finalScore);
    setHistory((h) => [...h, { target: currentTarget, ok }]);
    setResult(null);
    setVerdict(null);
    setTries(0);
    if (round + 1 >= ROUNDS) {
      setPhase("done");
      if (finalScore > best) {
        setBest(finalScore);
        saveBest(finalScore);
      }
    } else {
      setRound(round + 1);
      setPhase("ask");
    }
  }, [best, currentTarget, round, score, verdict]);

  const goMenu = useCallback(() => {
    rec.cancel();
    setResult(null);
    setMode("menu");
  }, [rec]);

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 px-4 pb-16 text-white">
      <style jsx global>{`
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .ring-pulse { animation: ringPulse 1.2s ease-out infinite; }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        .pop-in { animation: popIn 0.35s ease-out; }
      `}</style>

      <div className="flex w-full max-w-3xl items-center justify-between py-4">
        {mode === "menu" ? (
          <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            ← 홈
          </Link>
        ) : (
          <button onClick={goMenu} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            ← 메뉴
          </button>
        )}
        <div className="text-sm text-white/70">🏆 최고 {best}점</div>
      </div>

      <h1 className="mt-2 text-center text-4xl font-black tracking-tight sm:text-5xl">🎤 소리 탐정</h1>
      <p className="mt-2 text-center text-white/70">내가 낸 소리를 컴퓨터가 알아맞혀요!</p>

      {/* 마이크 켜기 */}
      {!micReady && (
        <div className="mt-10 flex max-w-md flex-col items-center gap-4 text-center">
          {rec.status === "denied" && (
            <p className="rounded-xl bg-red-500/20 p-4 text-red-200">
              마이크를 쓸 수 없어요. 주소창 옆 🔒 를 눌러 마이크를 허용한 뒤 다시 눌러 주세요.
            </p>
          )}
          {rec.status === "unsupported" && (
            <p className="rounded-xl bg-red-500/20 p-4 text-red-200">이 브라우저는 마이크를 지원하지 않아요.</p>
          )}
          <button
            onClick={() => {
              setBest(loadBest());
              void rec.start();
            }}
            disabled={rec.status === "asking"}
            className="rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-5 text-2xl font-black shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
          >
            {rec.status === "asking" ? "허락을 기다리는 중…" : "🎙️ 마이크 켜기"}
          </button>
          <p className="text-sm text-white/50">소리는 이 기기 안에서만 분석하고 어디에도 보내지 않아요.</p>
        </div>
      )}

      {micReady && <LevelBar level={rec.level} status={rec.status} />}

      {micReady && mode === "menu" && (
        <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          <button
            onClick={startMission}
            className="rounded-3xl bg-gradient-to-br from-amber-400 to-pink-500 p-6 text-left shadow-xl transition-transform hover:scale-[1.03]"
          >
            <div className="text-5xl">🎯</div>
            <div className="mt-3 text-2xl font-black">소리 미션</div>
            <div className="mt-1 text-white/90">
              시키는 소리를 내서 컴퓨터가 맞히게 해요! {ROUNDS}문제, 문제마다 {TRIES}번 기회.
            </div>
          </button>
          <button
            onClick={() => {
              setResult(null);
              setMode("free");
            }}
            className="rounded-3xl bg-gradient-to-br from-cyan-400 to-indigo-600 p-6 text-left shadow-xl transition-transform hover:scale-[1.03]"
          >
            <div className="text-5xl">🔍</div>
            <div className="mt-3 text-2xl font-black">자유 탐지</div>
            <div className="mt-1 text-white/90">아무 소리나 내 보세요. 무슨 소리인지 짐작하고 이유도 알려 줘요.</div>
          </button>
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70 sm:col-span-2">
            알아맞히는 소리: {TARGETS.map((t) => `${t.emoji} ${t.label}`).join(" · ")}
          </div>
        </div>
      )}

      {micReady && mode === "free" && (
        <div className="mt-8 flex w-full max-w-3xl flex-col items-center gap-6">
          <ListenButton status={rec.status} onListen={listenFree} label="🔍 소리 듣기" />
          {result && <ResultPanel result={result} />}
        </div>
      )}

      {micReady && mode === "mission" && phase !== "done" && currentTarget && (
        <div className="mt-6 flex w-full max-w-3xl flex-col items-center gap-5">
          <div className="flex w-full items-center justify-between text-sm text-white/70">
            <span>
              문제 {round + 1} / {ROUNDS}
            </span>
            <span className="flex gap-1">
              {Array.from({ length: ROUNDS }, (_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < history.length ? (history[i].ok ? "bg-emerald-400" : "bg-red-400") : i === round ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
            </span>
            <span className="text-lg font-black text-amber-300">{score}점</span>
          </div>

          <div key={round} className="pop-in w-full rounded-3xl bg-white/10 p-6 text-center">
            <div className="text-sm text-white/60">이 소리를 내 주세요</div>
            <div className="mt-2 text-7xl">{targetOf(currentTarget).emoji}</div>
            <div className="mt-2 text-3xl font-black">{targetOf(currentTarget).label}</div>
            <div className="mt-2 text-white/70">{targetOf(currentTarget).tip}</div>
            <div className="mt-3 text-sm text-white/50">
              남은 기회 {"❤️".repeat(Math.max(0, TRIES - tries))}
              {"🖤".repeat(Math.min(TRIES, tries))}
            </div>
          </div>

          {phase === "ask" && <ListenButton status={rec.status} onListen={listenMission} label="🎙️ 준비됐어요!" />}

          {phase === "judged" && result && (
            <>
              <div
                className={`pop-in rounded-2xl px-6 py-3 text-center text-2xl font-black ${
                  verdict === "hit" ? "bg-emerald-500/30 text-emerald-200" : verdict === "close" ? "bg-amber-500/30 text-amber-200" : "bg-red-500/30 text-red-200"
                }`}
              >
                {verdict === "hit" && `🎉 정답! +${POINTS[Math.min(tries - 1, POINTS.length - 1)]}점`}
                {verdict === "close" && `😮 아깝다! 2등으로 짐작했어요`}
                {verdict === "miss" && `🤔 ${result.guesses[0].emoji} ${result.guesses[0].label}(으)로 들렸어요`}
              </div>
              <div className="flex gap-3">
                {verdict !== "hit" && !outOfTries && (
                  <button
                    onClick={() => {
                      setPhase("ask");
                      listenMission();
                    }}
                    className="rounded-2xl bg-white/15 px-6 py-3 text-lg font-bold hover:bg-white/25"
                  >
                    🔁 다시 해 보기
                  </button>
                )}
                <button
                  onClick={nextRound}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3 text-lg font-bold"
                >
                  {round + 1 >= ROUNDS ? "결과 보기 ▶" : verdict === "hit" ? "다음 문제 ▶" : "넘어가기 ▶"}
                </button>
              </div>
              <ResultPanel result={result} highlight={currentTarget} />
            </>
          )}
        </div>
      )}

      {mode === "mission" && phase === "done" && (
        <div className="pop-in mt-10 flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-white/10 p-8 text-center">
          <div className="text-6xl">{score >= 600 ? "🏆" : score >= 350 ? "🥈" : "🎖️"}</div>
          <div className="text-4xl font-black text-amber-300">{score}점</div>
          <div className="text-white/70">
            {history.filter((h) => h.ok).length} / {ROUNDS} 문제 성공
            {score >= best && score > 0 && " · 새 최고 기록!"}
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-2xl">
            {history.map((h, i) => (
              <span key={i} className={h.ok ? "" : "opacity-30 grayscale"}>
                {targetOf(h.target).emoji}
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            <button onClick={startMission} className="rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-3 font-bold">
              다시 하기
            </button>
            <button onClick={goMenu} className="rounded-2xl bg-white/15 px-6 py-3 font-bold">
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelBar({ level, status }: { level: number; status: string }) {
  return (
    <div className="mt-6 w-full max-w-3xl">
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${
            status === "recording" ? "bg-gradient-to-r from-red-400 to-pink-500" : "bg-gradient-to-r from-emerald-400 to-cyan-400"
          }`}
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ListenButton({ status, onListen, label }: { status: string; onListen: () => void; label: string }) {
  const waiting = status === "armed";
  const recording = status === "recording";
  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      {(waiting || recording) && (
        <span className={`ring-pulse absolute inset-0 rounded-full ${recording ? "bg-red-500/50" : "bg-cyan-400/40"}`} />
      )}
      <button
        onClick={onListen}
        disabled={waiting || recording}
        className={`relative z-10 h-40 w-40 rounded-full text-xl font-black shadow-2xl transition-transform hover:scale-105 disabled:hover:scale-100 ${
          recording ? "bg-red-500" : waiting ? "bg-cyan-600" : "bg-gradient-to-br from-pink-500 to-violet-600"
        }`}
      >
        {recording ? "🔴 듣는 중…" : waiting ? "👂 소리를 내 보세요!" : label}
      </button>
    </div>
  );
}

function ResultPanel({ result, highlight }: { result: Result; highlight?: string }) {
  const { guesses, features, clip } = result;
  const top = guesses[0];
  const tooQuiet = features.peak < 0.05;
  return (
    <div className="pop-in w-full rounded-3xl bg-white/10 p-5">
      <Waveform clip={clip} />
      {tooQuiet ? (
        <p className="mt-4 text-center text-white/70">소리가 너무 작았어요. 마이크 가까이에서 다시 해 보세요!</p>
      ) : (
        <>
          <div className="mt-4 text-center">
            <div className="text-sm text-white/60">컴퓨터의 짐작</div>
            <div className="text-5xl">{top.emoji}</div>
            <div className="text-2xl font-black">{top.label}</div>
            <div className="mt-1 text-sm text-white/60">왜냐하면: {top.why}</div>
          </div>
          <div className="mt-5 space-y-2">
            {guesses.map((g) => (
              <div key={g.id} className="flex items-center gap-3">
                <span className="w-8 text-center text-xl">{g.emoji}</span>
                <span className={`w-40 truncate text-sm ${g.id === highlight ? "font-black text-amber-300" : "text-white/80"}`}>
                  {g.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${g.id === highlight ? "bg-amber-400" : g.id === top.id ? "bg-pink-400" : "bg-white/40"}`}
                    style={{ width: `${Math.round(g.score * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-white/60">{Math.round(g.score * 100)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-white/60 sm:grid-cols-4">
        <Stat label="길이" value={`${Math.round(features.durationMs)}ms`} />
        <Stat label="시작 속도" value={`${Math.round(features.attackMs)}ms`} />
        <Stat label="음 높이" value={`${Math.round(features.centroid)}Hz`} />
        <Stat label="들쭉날쭉" value={features.wobble.toFixed(2)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-2 text-center">
      <div>{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function Waveform({ clip }: { clip: Clip }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const { samples } = clip;
    let peak = 0;
    for (const s of samples) peak = Math.max(peak, Math.abs(s));
    const scale = peak > 0 ? 1 / peak : 1;
    const step = samples.length / width;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#22d3ee");
    gradient.addColorStop(1, "#f472b6");
    ctx.fillStyle = gradient;
    for (let x = 0; x < width; x++) {
      let max = 0;
      const from = Math.floor(x * step);
      const to = Math.min(samples.length, Math.floor((x + 1) * step));
      for (let i = from; i < to; i++) max = Math.max(max, Math.abs(samples[i]));
      const h = Math.max(1, max * scale * (height / 2 - 2));
      ctx.fillRect(x, height / 2 - h, 1, h * 2);
    }
  }, [clip]);
  return <canvas ref={canvasRef} className="h-20 w-full rounded-xl bg-black/30" />;
}
