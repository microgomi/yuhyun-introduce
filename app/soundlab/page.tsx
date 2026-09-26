"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { analyze, classify, type Guess } from "./soundClassify";
import { clearSounds, deleteSound, listSounds, type SavedSound, saveSound, toWav } from "./soundStore";
import { type Clip, DEFAULT_START_LEVEL, useRecorder } from "./useRecorder";

/**
 * 저장 파일을 여는 비밀번호.
 * 화면 잠금일 뿐 암호화는 아니다 — 파일은 이 기기의 브라우저 안에만 있고, 코드를 뜯어보면 번호가 보인다.
 */
const FILE_PASSWORD = "6735";

const SENSITIVITY = [
  { id: "high", label: "예민 (먼 소리도)", level: 0.022 },
  { id: "normal", label: "보통", level: DEFAULT_START_LEVEL },
  { id: "low", label: "둔감 (큰 소리만)", level: 0.11 },
] as const;
type SensitivityId = (typeof SENSITIVITY)[number]["id"];

/** 너무 작은 소리는 짐작이 의미 없어서 "작은 소리"로만 알려 준다. */
const QUIET_PEAK = 0.05;

interface Detection {
  id: string;
  at: number;
  clip: Clip;
  guesses: Guess[];
  quiet: boolean;
  saved: "saving" | "saved" | "failed";
}

function timeText(at: number) {
  return new Date(at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function dateTimeText(at: number) {
  return new Date(at).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SoundDetectorPage() {
  const rec = useRecorder();
  const { listen, setSensitivity: setRecSensitivity, start, stop } = rec;
  const [sensitivity, setSensitivity] = useState<SensitivityId>("normal");
  const [detections, setDetections] = useState<Detection[]>([]);

  // 파일함
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [files, setFiles] = useState<SavedSound[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  /** 저장 완료 콜백은 나중에 불리므로, 그 시점의 잠금 상태를 ref 로 본다. */
  const unlockedRef = useRef(false);

  const listening = rec.status === "armed" || rec.status === "recording";
  const micOpen = listening || rec.status === "idle";

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  const onClip = useCallback((clip: Clip) => {
    const features = analyze(clip.samples, clip.sampleRate);
    const guesses = classify(features);
    const quiet = features.peak < QUIET_PEAK;
    const detection: Detection = { id: newId(), at: Date.now(), clip, guesses, quiet, saved: "saving" };
    setDetections((list) => [detection, ...list].slice(0, 30));

    const top = guesses[0];
    const record: SavedSound = {
      id: detection.id,
      at: detection.at,
      durationMs: features.durationMs,
      peak: features.peak,
      guessId: quiet ? "quiet" : top.id,
      emoji: quiet ? "🔈" : top.emoji,
      label: quiet ? "작은 소리" : top.label,
      score: top.score,
      secondLabel: guesses[1]?.label ?? "",
      wav: toWav(clip),
    };
    const mark = (saved: Detection["saved"]) =>
      setDetections((list) => list.map((d) => (d.id === detection.id ? { ...d, saved } : d)));
    // 저장이 디스크에 끝난 것을 확인한 다음에만 "저장됨"으로 표시한다.
    saveSound(record)
      .then(() => {
        mark("saved");
        if (unlockedRef.current) setFiles((list) => [record, ...list]);
      })
      .catch((err: unknown) => {
        console.warn("소리를 저장하지 못했어요", err);
        mark("failed");
      });
  }, []);

  const toggleDetect = useCallback(async () => {
    if (listening) {
      stop();
      return;
    }
    // 마이크가 아직 안 열렸으면 먼저 연다(여기서 권한을 묻는다). 실패하면 listen 은 아무것도 하지 않는다.
    if (rec.status !== "idle") await start();
    listen(onClip);
  }, [listen, listening, onClip, rec.status, start, stop]);

  const changeSensitivity = useCallback(
    (id: SensitivityId) => {
      setSensitivity(id);
      setRecSensitivity(SENSITIVITY.find((s) => s.id === id)?.level ?? DEFAULT_START_LEVEL);
    },
    [setRecSensitivity],
  );

  const tryUnlock = useCallback(async () => {
    if (pin !== FILE_PASSWORD) {
      setPinError(true);
      setPin("");
      return;
    }
    setUnlocked(true);
    unlockedRef.current = true;
    setPin("");
    setPinError(false);
    try {
      setFiles(await listSounds());
      setFilesError(null);
    } catch (err) {
      console.warn(err);
      setFilesError("저장된 파일을 읽지 못했어요. 이 브라우저가 저장소를 막고 있을 수 있어요.");
    }
  }, [pin]);

  const lock = useCallback(() => {
    stopPlayback();
    setUnlocked(false);
    unlockedRef.current = false;
    setFiles([]);
    setConfirmClear(false);
  }, [stopPlayback]);

  const play = useCallback(
    (file: SavedSound) => {
      const wasPlaying = playingId === file.id;
      stopPlayback();
      if (wasPlaying) return;
      const url = URL.createObjectURL(file.wav);
      const audio = new Audio(url);
      audioRef.current = audio;
      audioUrlRef.current = url;
      audio.onended = stopPlayback;
      setPlayingId(file.id);
      void audio.play().catch(stopPlayback);
    },
    [playingId, stopPlayback],
  );

  const download = useCallback((file: SavedSound) => {
    const url = URL.createObjectURL(file.wav);
    const a = document.createElement("a");
    const stamp = new Date(file.at).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `소리_${stamp}_${file.label.split(" ")[0]}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const remove = useCallback(
    async (file: SavedSound) => {
      if (playingId === file.id) stopPlayback();
      await deleteSound(file.id);
      setFiles((list) => list.filter((f) => f.id !== file.id));
    },
    [playingId, stopPlayback],
  );

  const removeAll = useCallback(async () => {
    stopPlayback();
    await clearSounds();
    setFiles([]);
    setConfirmClear(false);
  }, [stopPlayback]);

  const latest = detections[0];
  const tally = new Map<string, { emoji: string; label: string; count: number }>();
  for (const d of detections) {
    const emoji = d.quiet ? "🔈" : d.guesses[0].emoji;
    const label = d.quiet ? "작은 소리" : d.guesses[0].label;
    const prev = tally.get(label);
    if (prev) prev.count++;
    else tally.set(label, { emoji, label, count: 1 });
  }
  const threshold = SENSITIVITY.find((s) => s.id === sensitivity)?.level ?? DEFAULT_START_LEVEL;

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 px-4 pb-16 text-white">
      <style jsx global>{`
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radar-sweep { animation: radarSweep 2.4s linear infinite; }
        @keyframes ringPulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .ring-pulse { animation: ringPulse 0.9s ease-out infinite; }
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        .pop-in { animation: popIn 0.3s ease-out; }
      `}</style>

      <div className="flex w-full max-w-3xl items-center justify-between py-4">
        <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
          ← 홈
        </Link>
        <div className="text-sm text-white/60">이번에 감지 {detections.length}번</div>
      </div>

      <h1 className="mt-1 text-center text-4xl font-black tracking-tight sm:text-5xl">📡 근처 소리 탐지기</h1>
      <p className="mt-2 text-center text-white/70">주변에서 소리가 나면 자동으로 녹음·저장하고 무슨 소리인지 알려 줘요</p>

      {/* 레이더 */}
      <div className="relative mt-8 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 bg-emerald-950/40" />
        <div className="absolute inset-[18%] rounded-full border border-emerald-400/25" />
        <div className="absolute inset-[36%] rounded-full border border-emerald-400/20" />
        {listening && (
          <div
            className="radar-sweep absolute inset-0 rounded-full"
            style={{ background: "conic-gradient(from 0deg, rgba(52,211,153,0.45), transparent 25%)" }}
          />
        )}
        {rec.status === "recording" && <span className="ring-pulse absolute inset-[20%] rounded-full bg-red-500/40" />}
        {/* 소리 크기만큼 가운데 원이 커진다 */}
        <div
          className={`absolute rounded-full transition-all duration-75 ${rec.status === "recording" ? "bg-red-500/60" : "bg-emerald-400/40"}`}
          style={{ width: `${16 + rec.level * 80}%`, height: `${16 + rec.level * 80}%` }}
        />
        <div key={latest?.id} className="pop-in relative z-10 text-center">
          <div className="text-6xl">
            {rec.status === "recording" ? "🔴" : latest ? (latest.quiet ? "🔈" : latest.guesses[0].emoji) : listening ? "👂" : "📡"}
          </div>
          <div className="mt-1 text-sm font-bold text-white/80">
            {rec.status === "recording" ? "소리 녹음 중…" : listening ? "듣는 중…" : "꺼짐"}
          </div>
        </div>
      </div>

      {/* 소리 크기 막대 + 감지선 */}
      {micOpen && (
        <div className="mt-6 w-full max-w-md">
          <div className="relative h-3 rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${rec.status === "recording" ? "bg-red-400" : "bg-emerald-400"}`}
              style={{ width: `${Math.round(rec.level * 100)}%` }}
            />
            {/* 막대는 크기×3 으로 그리므로 감지선도 같은 비율로 놓는다 */}
            <div className="absolute -top-1 h-5 w-0.5 bg-amber-300" style={{ left: `${Math.min(100, threshold * 300)}%` }} />
          </div>
          <div className="mt-1 text-right text-xs text-white/50">노란 선을 넘는 소리를 잡아요</div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={() => void toggleDetect()}
          disabled={rec.status === "asking"}
          className={`rounded-2xl px-10 py-4 text-2xl font-black shadow-lg transition-transform hover:scale-105 disabled:opacity-60 ${
            listening ? "bg-white/15" : "bg-gradient-to-r from-emerald-500 to-cyan-500"
          }`}
        >
          {rec.status === "asking" ? "허락을 기다리는 중…" : listening ? "⏹ 감지 멈추기" : "👂 감지 시작"}
        </button>
        <div className="flex flex-wrap justify-center gap-2">
          {SENSITIVITY.map((s) => (
            <button
              key={s.id}
              onClick={() => changeSensitivity(s.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                sensitivity === s.id ? "bg-amber-400 font-bold text-slate-900" : "bg-white/10 text-white/80"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {rec.status === "denied" && (
          <p className="max-w-md rounded-xl bg-red-500/20 p-3 text-center text-sm text-red-200">
            마이크를 쓸 수 없어요. 주소창 옆 🔒 를 눌러 마이크를 허용한 뒤 다시 눌러 주세요.
          </p>
        )}
        {rec.status === "unsupported" && (
          <p className="rounded-xl bg-red-500/20 p-3 text-sm text-red-200">이 브라우저는 마이크를 지원하지 않아요.</p>
        )}
        <p className="text-center text-xs text-white/40">
          녹음은 이 기기의 브라우저 안에만 저장되고 어디에도 보내지 않아요. 페이지를 닫으면 감지도 멈춰요.
        </p>
      </div>

      {/* 방금 들린 소리 */}
      {latest && (
        <div key={latest.id} className="pop-in mt-8 w-full max-w-3xl rounded-3xl bg-white/10 p-5">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>방금 들린 소리 · {timeText(latest.at)}</span>
            <span>
              {latest.saved === "saving" && "💾 저장 중…"}
              {latest.saved === "saved" && "✅ 저장됨"}
              {latest.saved === "failed" && <span className="text-red-300">⚠️ 저장 실패</span>}
            </span>
          </div>
          <Waveform clip={latest.clip} />
          {latest.quiet ? (
            <p className="mt-3 text-center text-lg">🔈 작은 소리가 들렸어요 — 너무 작아서 무슨 소리인지는 모르겠어요</p>
          ) : (
            <>
              <p className="mt-3 text-center text-2xl font-black">
                {latest.guesses[0].emoji} {latest.guesses[0].label} 같아요
              </p>
              <p className="mt-1 text-center text-sm text-white/60">
                {latest.guesses[0].why} · 아니면 {latest.guesses[1].emoji} {latest.guesses[1].label}
              </p>
              <div className="mt-4 space-y-1.5">
                {latest.guesses.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-2 text-sm">
                    <span className="w-7 text-center">{g.emoji}</span>
                    <span className="w-36 truncate text-white/80">{g.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${i === 0 ? "bg-emerald-400" : "bg-white/35"}`}
                        style={{ width: `${Math.round(g.score * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 이번에 들린 소리 모음 */}
      {detections.length > 0 && (
        <div className="mt-4 w-full max-w-3xl rounded-2xl bg-white/5 p-4">
          <div className="mb-2 text-sm text-white/60">이번에 들린 소리</div>
          <div className="flex flex-wrap gap-2">
            {[...tally.values()].map((t) => (
              <span key={t.label} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                {t.emoji} {t.label} <b className="text-amber-300">×{t.count}</b>
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-sm text-white/70">
            {detections.slice(0, 8).map((d) => (
              <div key={d.id} className="flex justify-between">
                <span>{d.quiet ? "🔈 작은 소리" : `${d.guesses[0].emoji} ${d.guesses[0].label}`}</span>
                <span className="text-white/40">{timeText(d.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 저장 파일함 (비밀번호) */}
      <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{unlocked ? "🔓" : "🔒"} 저장된 소리 파일</h2>
          {unlocked && (
            <button onClick={lock} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
              🔒 다시 잠그기
            </button>
          )}
        </div>

        {!unlocked ? (
          <form
            className="mt-4 flex flex-col items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void tryUnlock();
            }}
          >
            <p className="text-sm text-white/60">비밀번호를 입력해야 파일을 듣고 내려받을 수 있어요</p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError(false);
              }}
              placeholder="● ● ● ●"
              className="w-40 rounded-xl bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-amber-400"
            />
            {pinError && <p className="text-sm text-red-300">비밀번호가 틀렸어요</p>}
            <button type="submit" className="rounded-xl bg-amber-400 px-6 py-2 font-bold text-slate-900">
              열기
            </button>
          </form>
        ) : (
          <div className="mt-4">
            {filesError && <p className="text-sm text-red-300">{filesError}</p>}
            {files.length === 0 && !filesError && (
              <p className="text-center text-white/50">아직 저장된 소리가 없어요. 감지를 켜 두면 여기에 쌓여요.</p>
            )}
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="text-3xl">{f.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{f.label}</div>
                    <div className="text-xs text-white/50">
                      {dateTimeText(f.at)} · {(f.durationMs / 1000).toFixed(1)}초
                      {f.secondLabel && f.guessId !== "quiet" && ` · 아니면 ${f.secondLabel}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => play(f)}
                      className={`rounded-xl px-4 py-2 font-bold ${playingId === f.id ? "bg-red-500" : "bg-emerald-500"}`}
                    >
                      {playingId === f.id ? "⏹ 멈춤" : "▶ 듣기"}
                    </button>
                    <button onClick={() => download(f)} className="rounded-xl bg-white/10 px-3 py-2 hover:bg-white/20" title="내려받기">
                      ⬇️
                    </button>
                    <button onClick={() => void remove(f)} className="rounded-xl bg-white/10 px-3 py-2 hover:bg-red-500/40" title="삭제">
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {files.length > 0 && (
              <div className="mt-4 flex justify-end gap-2 text-sm">
                {confirmClear ? (
                  <>
                    <span className="self-center text-red-300">{files.length}개를 모두 지울까요?</span>
                    <button onClick={() => void removeAll()} className="rounded-lg bg-red-500 px-3 py-1.5 font-bold">
                      모두 지우기
                    </button>
                    <button onClick={() => setConfirmClear(false)} className="rounded-lg bg-white/10 px-3 py-1.5">
                      취소
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmClear(true)} className="rounded-lg bg-white/10 px-3 py-1.5 text-white/70">
                    🗑️ 전체 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
    gradient.addColorStop(0, "#34d399");
    gradient.addColorStop(1, "#22d3ee");
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
  return <canvas ref={canvasRef} className="mt-3 h-16 w-full rounded-xl bg-black/30" />;
}
