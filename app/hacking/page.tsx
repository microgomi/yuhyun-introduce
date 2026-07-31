"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ───── 효과음 ─────
let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.06) {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; ac = new AC();
    }
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sKey = () => beep(880, 0.03, "square", 0.04);
const sBad = () => beep(140, 0.18, "sawtooth", 0.08);
const sGood = () => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.09, "triangle", 0.07), i * 70)); };
const sHacked = () => { [400, 600, 800, 1200, 1600].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.08), i * 90)); };

type Target = { id: string; name: string; emoji: string; len: number; reward: number; sec: string; mission: string };
const TARGETS: Target[] = [
  { id: "t1", name: "학교 서버", emoji: "🏫", len: 2, reward: 50, sec: "낮음", mission: "성적표 데이터에 접근하라" },
  { id: "t2", name: "편의점 결제기", emoji: "🏪", len: 2, reward: 90, sec: "낮음", mission: "포인트 시스템을 열어라" },
  { id: "t3", name: "게임 회사", emoji: "🎮", len: 3, reward: 160, sec: "보통", mission: "미출시 게임 소스를 빼내라" },
  { id: "t4", name: "은행 금고", emoji: "🏦", len: 3, reward: 300, sec: "보통", mission: "금고 잠금장치를 해제하라" },
  { id: "t5", name: "통신사", emoji: "📡", len: 4, reward: 550, sec: "높음", mission: "기지국 제어권을 탈취하라" },
  { id: "t6", name: "정부 기관", emoji: "🏛️", len: 4, reward: 1000, sec: "높음", mission: "기밀 문서를 다운로드하라" },
  { id: "t7", name: "우주 기지", emoji: "🛰️", len: 5, reward: 2500, sec: "극악", mission: "위성 통제 시스템을 장악하라" },
  { id: "t8", name: "AI 슈퍼컴", emoji: "🤖", len: 5, reward: 6000, sec: "불가능?", mission: "인공지능 핵심 코어에 침투하라" },
];
const SCAN_STEPS = ["> 대상 시스템에 연결 중...", "> 포트 스캔... 열린 포트 3개 발견", "> 방화벽 분석 중...", "> 우회 경로 탐색... ✓ 발견!", "> 방화벽 통과! 내부망 진입", "> 관리자 계정 잠금 발견 🔒", "> 암호 크래킹 모드 진입..."];
const RANKS = ["스크립트 키디", "초보 해커", "해커", "화이트햇", "블랙햇", "전설의 해커", "GHOST"];
const SAVE = "hacking_save";
const BASE_TRIES = 12;
const HINT_COST = 30;

function feedback(secret: string, guess: string) {
  let green = 0, yellow = 0;
  const s = secret.split(""), gs = guess.split("");
  const sU = Array(s.length).fill(false), gU = Array(gs.length).fill(false);
  for (let i = 0; i < gs.length; i++) if (gs[i] === s[i]) { green++; sU[i] = gU[i] = true; }
  for (let i = 0; i < gs.length; i++) {
    if (gU[i]) continue;
    for (let j = 0; j < s.length; j++) if (!sU[j] && gs[i] === s[j]) { yellow++; sU[j] = true; break; }
  }
  return { green, yellow };
}
const randCode = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");

export default function HackingGame() {
  const [screen, setScreen] = useState<"menu" | "hack" | "won" | "lost">("menu");
  const [coins, setCoins] = useState(0);
  const [hacks, setHacks] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [secret, setSecret] = useState("");
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<{ g: string; green: number; yellow: number }[]>([]);
  const [triesLeft, setTriesLeft] = useState(BASE_TRIES);
  const [revealed, setRevealed] = useState(""); // AI 힌트로 공개된 앞자리
  const [msg, setMsg] = useState("");
  const [hackPhase, setHackPhase] = useState<"scan" | "crack">("scan"); // 침투 단계
  const [scanShown, setScanShown] = useState(0);

  // 저장/로드
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(SAVE) || "{}"); setCoins(s.coins || 0); setHacks(s.hacks || 0); } catch { /* ignore */ }
  }, []);
  const save = (c: number, h: number) => { try { localStorage.setItem(SAVE, JSON.stringify({ coins: c, hacks: h })); } catch { /* ignore */ } };

  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(hacks / 3))];

  const startHack = (t: Target) => {
    const code = randCode(t.len);
    setTarget(t); setSecret(code); setGuess(""); setHistory([]);
    setTriesLeft(BASE_TRIES); setRevealed(code.slice(0, 1)); setMsg("🎁 첫 자리 공짜 공개! 나머지를 맞춰봐"); // 첫 자리 무료
    setHackPhase("scan"); setScanShown(0);
    setScreen("hack");
  };

  // 스캔 단계 애니메이션 (한 줄씩 터미널 출력 → 크래킹 진입)
  useEffect(() => {
    if (screen !== "hack" || hackPhase !== "scan") return;
    if (scanShown >= SCAN_STEPS.length) { const to = setTimeout(() => setHackPhase("crack"), 550); return () => clearTimeout(to); }
    const to = setTimeout(() => { setScanShown((n) => n + 1); beep(600 + scanShown * 60, 0.04, "square", 0.04); }, 360);
    return () => clearTimeout(to);
  }, [screen, hackPhase, scanShown]);

  const submit = useCallback(() => {
    if (!target || guess.length !== target.len) return;
    const fb = feedback(secret, guess);
    const nh = [{ g: guess, ...fb }, ...history];
    setHistory(nh);
    if (fb.green === target.len) {
      // 해킹 성공!
      sHacked();
      const nc = coins + target.reward, nHacks = hacks + 1;
      setCoins(nc); setHacks(nHacks); save(nc, nHacks);
      setScreen("won");
    } else {
      const left = triesLeft - 1;
      setTriesLeft(left);
      setGuess("");
      if (left <= 0) { sBad(); setScreen("lost"); }
      else { beep(fb.green > 0 ? 520 : 300, 0.06, "triangle", 0.06); setMsg(`🟢${fb.green} 🟡${fb.yellow} — ${left}번 남음`); }
    }
  }, [target, guess, secret, history, coins, hacks, triesLeft]);

  const typeDigit = (d: string) => {
    if (!target || guess.length >= target.len) return;
    sKey(); setGuess((g) => g + d);
  };
  const revealFirst = () => {
    if (!target) return;
    const cost = HINT_COST;
    if (coins < cost || revealed.length >= target.len) return;
    const nc = coins - cost; setCoins(nc); save(nc, hacks);
    setRevealed(secret.slice(0, revealed.length + 1));
    setMsg(`🧠 AI: 앞 ${revealed.length + 1}자리는 "${secret.slice(0, revealed.length + 1)}"`);
    beep(700, 0.1, "sine", 0.06);
  };

  // ───── 매트릭스 배경 ─────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width = 360, H = canvas.height = 640;
    const cols = Math.floor(W / 12);
    const drops = Array(cols).fill(0).map(() => Math.random() * H);
    const chars = "01ㅎㅐㅋㅣ0110ABCDEF#$%".split("");
    let raf = 0, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 55) return; last = t;
      ctx.fillStyle = "rgba(2,8,4,0.25)"; ctx.fillRect(0, 0, W, H);
      ctx.font = "12px monospace";
      for (let i = 0; i < cols; i++) {
        ctx.fillStyle = Math.random() < 0.05 ? "#dfffe0" : "#22c55e";
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 12, drops[i]);
        drops[i] += 12;
        if (drops[i] > H && Math.random() > 0.975) drops[i] = 0;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-green-400 font-mono overflow-hidden">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 w-full h-full opacity-30" />
      <div className="relative z-10 mx-auto max-w-md px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="text-green-500 text-sm">← 홈</Link>
          <h1 className="text-lg font-black tracking-widest text-green-300">&gt;_ 해킹</h1>
          <span className="text-xs text-green-500">💾 {coins}</span>
        </div>

        {/* 상태바 */}
        <div className="mb-3 rounded border border-green-800 bg-green-950/40 p-2 text-xs">
          <div className="flex justify-between">
            <span>👤 {rank}</span>
            <span>해킹 성공: {hacks}회</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-green-950 overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(hacks % 3) / 3 * 100}%` }} />
          </div>
        </div>

        {/* === 메뉴: 타깃 선택 === */}
        {screen === "menu" && (
          <div className="space-y-2">
            <p className="text-xs text-green-600 mb-1">// 침투할 대상을 선택하라</p>
            {TARGETS.map((t, i) => {
              const locked = i > hacks + 1; // 앞 대상부터 순차 해금
              return (
                <button key={t.id} disabled={locked} onClick={() => startHack(t)}
                  className={`w-full flex items-center gap-3 rounded border p-2.5 text-left transition-all active:scale-95 ${locked ? "border-green-900 bg-black/40 opacity-40" : "border-green-700 bg-green-950/40 hover:bg-green-900/40"}`}>
                  <span className="text-2xl">{locked ? "🔒" : t.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-green-300">{locked ? "??? (잠김)" : t.name}</div>
                    <div className="text-[10px] text-green-600">{t.len}자리 암호 · 보안 {t.sec}</div>
                  </div>
                  <span className="text-yellow-500 text-xs font-bold">+{t.reward}💾</span>
                </button>
              );
            })}
          </div>
        )}

        {/* === 해킹 (암호 크래킹) === */}
        {screen === "hack" && target && (
          <div className="space-y-3">
            <div className="rounded border border-green-700 bg-green-950/40 p-2 text-sm">
              <span className="text-green-300 font-bold">{target.emoji} {target.name}</span>
              <span className="float-right text-red-400">시도 {triesLeft}</span>
              <div className="text-[11px] text-yellow-500 mt-0.5">🎯 MISSION: {target.mission}</div>
            </div>

            {/* 침투 단계 (스캔 → 방화벽 우회) */}
            {hackPhase === "scan" && (
              <div className="rounded border border-green-800 bg-black/70 p-3 text-xs min-h-[240px] leading-relaxed">
                {SCAN_STEPS.slice(0, scanShown).map((s, i) => (
                  <div key={i} className={i === scanShown - 1 ? "text-green-200" : "text-green-500"}>{s}</div>
                ))}
                {scanShown < SCAN_STEPS.length ? <span className="animate-pulse text-green-300">▊</span>
                  : <div className="mt-1 text-green-300 animate-pulse font-bold">&gt;&gt; 암호 크래킹 시작!</div>}
              </div>
            )}

            {hackPhase === "crack" && (<>
            {/* 현재 입력 */}
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: target.len }).map((_, i) => (
                <div key={i} className={`w-9 h-11 rounded border-2 flex items-center justify-center text-xl font-black ${i < guess.length ? "border-green-400 text-green-200 bg-green-900/40" : revealed[i] ? "border-cyan-500 text-cyan-400" : "border-green-800 text-green-700"}`}>
                  {guess[i] ?? (revealed[i] ? revealed[i] : "_")}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-green-500 h-4">{msg}</p>

            {/* 숫자패드 */}
            <div className="grid grid-cols-5 gap-1.5">
              {"0123456789".split("").map((d) => (
                <button key={d} onClick={() => typeDigit(d)} className="rounded bg-green-900/50 border border-green-700 py-2.5 text-lg font-bold text-green-200 active:scale-90 hover:bg-green-800/60">{d}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setGuess((g) => g.slice(0, -1)); sKey(); }} className="rounded bg-red-900/50 border border-red-700 py-2 text-sm font-bold text-red-300 active:scale-95">⌫ 지우기</button>
              <button onClick={submit} disabled={guess.length !== target.len} className={`rounded py-2 text-sm font-black active:scale-95 ${guess.length === target.len ? "bg-green-500 text-black" : "bg-green-950 text-green-800"}`}>▶ 침투!</button>
            </div>
            <button onClick={revealFirst} disabled={coins < HINT_COST || revealed.length >= target.len} className={`w-full rounded border py-1.5 text-xs font-bold ${coins >= HINT_COST && revealed.length < target.len ? "border-cyan-600 text-cyan-400 hover:bg-cyan-950/40" : "border-green-900 text-green-800"}`}>🧠 AI 힌트: 다음 앞자리 공개 (💾{HINT_COST})</button>

            {/* 시도 기록 */}
            <div className="rounded border border-green-900 bg-black/50 p-2 max-h-40 overflow-auto text-xs space-y-1">
              <div className="text-green-600 text-[10px]">🟢 자리+숫자 맞음 · 🟡 숫자만 맞음</div>
              {history.length === 0 && <div className="text-green-800">// 기록 없음</div>}
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="tracking-widest text-green-300">{h.g}</span>
                  <span className="text-green-500">🟢{h.green}</span>
                  <span className="text-yellow-500">🟡{h.yellow}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen("menu")} className="w-full text-xs text-green-700 py-1">← 침투 중단</button>
            </>)}
          </div>
        )}

        {/* === 성공 === */}
        {screen === "won" && target && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-6xl animate-pulse">🔓</div>
            <h2 className="text-3xl font-black text-green-300 tracking-widest">ACCESS GRANTED</h2>
            <p className="text-green-400">{target.emoji} {target.name} 해킹 성공!</p>
            <p className="text-yellow-400 font-bold">+{target.reward} 💾 획득!</p>
            <p className="text-xs text-green-600">암호는 <span className="text-green-300 tracking-widest">{secret}</span> 였다</p>
            <button onClick={() => setScreen("menu")} className="mt-2 rounded bg-green-500 text-black px-8 py-3 font-black active:scale-95">다음 타깃 →</button>
          </div>
        )}

        {/* === 실패 === */}
        {screen === "lost" && target && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-6xl">🚨</div>
            <h2 className="text-2xl font-black text-red-500 tracking-widest">ACCESS DENIED</h2>
            <p className="text-red-400">추적당했다! 시도 횟수 초과</p>
            <p className="text-xs text-green-600">정답은 <span className="text-green-300 tracking-widest">{secret}</span> 였다</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => startHack(target)} className="rounded bg-green-600 text-black px-6 py-3 font-black active:scale-95">🔄 재침투</button>
              <button onClick={() => setScreen("menu")} className="rounded bg-green-950 border border-green-700 text-green-400 px-6 py-3 font-bold active:scale-95">← 나가기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
