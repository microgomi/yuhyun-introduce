"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BattleEngine, type HudState } from "./battleEngine";
import { BattleHud } from "./BattleHud";
import { ENEMIES, PICKUPS, WEAPONS, loadRecord, saveRecord, type SaveRecord } from "./battleData";

// ----------------------------------------------------------------------------
// 게임 화면: three.js 엔진 + HUD + 시작/도움말/게임오버 화면
// ----------------------------------------------------------------------------

const EMPTY: HudState = {
  hp: 120, maxHp: 120, hunger: 100, breath: 100, stamina: 100, defense: 0, attack: 22,
  level: 1, xp: 0, xpNeed: 45, wave: 0, enemiesLeft: 0, kills: 0, arrows: 30,
  weapon: "sword", unlocked: ["sword"], underwater: false, blocking: false,
  restSeconds: 4, timeSec: 0, bossHp: null, bossMaxHp: null, locked: false,
};

const CONTROLS: [string, string][] = [
  ["마우스", "둘러보기 (화면을 클릭하면 조작 시작)"],
  ["W A S D", "움직이기"],
  ["Shift", "달리기 (기력 사용)"],
  ["Space", "점프"],
  ["마우스 왼쪽", "공격"],
  ["마우스 오른쪽", "막기 (피해 75% 감소)"],
  ["1 2 3 4", "무기 바꾸기"],
  ["ESC", "잠깐 멈추기"],
];

export default function BattleGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const logId = useRef(0);

  const [state, setState] = useState<HudState>(EMPTY);
  const [logs, setLogs] = useState<{ id: number; text: string; kind: string }[]>([]);
  const [record, setRecord] = useState<SaveRecord>(() => loadRecord());
  const [over, setOver] = useState<{ wave: number; kills: number; level: number; timeSec: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [help, setHelp] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !started) return;
    const engine = new BattleEngine(el, {
      onState: setState,
      onLog: (text, kind = "info") => {
        const id = ++logId.current;
        setLogs((cur) => [...cur.slice(-4), { id, text, kind }]);
        window.setTimeout(() => setLogs((cur) => cur.filter((l) => l.id !== id)), 4200);
      },
      onGameOver: (summary) => {
        setOver(summary);
        setRecord((r) => {
          const next: SaveRecord = {
            bestWave: Math.max(r.bestWave, summary.wave),
            bestKills: Math.max(r.bestKills, summary.kills),
            bestLevel: Math.max(r.bestLevel, summary.level),
            runs: r.runs + 1,
          };
          saveRecord(next);
          return next;
        });
      },
      onLockChange: setLocked,
    });
    engineRef.current = engine;
    engine.requestLock();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [started, runId]);

  // ESC 로 멈추면 안내 화면을 띄운다
  useEffect(() => {
    engineRef.current?.setPaused(!locked && !over);
  }, [locked, over]);

  const restart = () => {
    setOver(null);
    setLogs([]);
    setState(EMPTY);
    setRunId((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 select-none bg-black text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {started && !over && <BattleHud s={state} logs={logs} record={record} />}

      {/* 시작 화면 */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0b1020] to-[#1a1030] p-6">
          <div className="max-w-2xl rounded-3xl border border-white/10 bg-black/50 p-8 text-center">
            <h1 className="mb-2 text-4xl font-extrabold">⚔️ 그림자 아레나</h1>
            <p className="mb-6 text-white/70">숨겨진 투기장에서 끝없이 몰려오는 적과 싸우세요. 5웨이브마다 보스가 나와요!</p>
            <div className="mb-6 grid grid-cols-2 gap-3 text-left text-xs">
              <div className="rounded-2xl bg-white/5 p-3">
                <b className="text-sm">⚔️ 무기</b>
                {WEAPONS.map((w) => (
                  <div key={w.key} className="mt-1 text-white/70">
                    {w.emoji} <b className="text-white">{w.name}</b> — {w.desc}
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <b className="text-sm">👹 적</b>
                {ENEMIES.map((e) => (
                  <div key={e.key} className="mt-1 text-white/70">
                    {e.emoji} <b className="text-white">{e.name}</b> — {e.desc}
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <b className="text-sm">📊 상태</b>
                <div className="mt-1 text-white/70">❤️ 체력 · 🍗 허기(시간이 지나면 줄어요) · 🫁 호흡(물속에서 줄어요)</div>
                <div className="text-white/70">⚡ 기력(달리기·공격·막기) · 🛡️ 방어력 · ⚔️ 공격력 · 레벨</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <b className="text-sm">🎁 줍는 것</b>
                {Object.values(PICKUPS).map((p) => (
                  <div key={p.key} className="mt-1 text-white/70">
                    {p.emoji} <b className="text-white">{p.name}</b> — {p.desc}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs text-white/70">
              {CONTROLS.map(([k, d]) => (
                <div key={k} className="flex justify-between">
                  <kbd className="rounded bg-white/15 px-1.5 font-mono">{k}</kbd>
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStarted(true)}
              className="rounded-2xl bg-rose-500 px-10 py-3 text-xl font-extrabold hover:bg-rose-400"
            >
              ▶ 시작하기
            </button>
            <div className="mt-3 text-xs text-white/50">
              최고 기록: 웨이브 {record.bestWave} · 처치 {record.bestKills} · 도전 {record.runs}회
            </div>
            <Link href="/" className="mt-4 inline-block text-xs text-white/40 hover:text-white/70">
              ← 홈으로
            </Link>
          </div>
        </div>
      )}

      {/* 잠깐 멈춤 */}
      {started && !over && !locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-80 rounded-3xl border border-white/10 bg-[#141a2e] p-6 text-center">
            <h2 className="mb-2 text-2xl font-bold">⏸ 잠깐 멈춤</h2>
            <p className="mb-4 text-sm text-white/60">화면을 클릭하면 다시 싸워요</p>
            <button onClick={() => engineRef.current?.requestLock()} className="w-full rounded-xl bg-emerald-500 py-2 font-bold hover:bg-emerald-400">
              ▶ 이어서 하기
            </button>
            <button onClick={() => setHelp(!help)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20">
              ⌨️ 조작법 {help ? "닫기" : "보기"}
            </button>
            {help && (
              <ul className="mt-3 space-y-1 text-left text-xs text-white/70">
                {CONTROLS.map(([k, d]) => (
                  <li key={k} className="flex justify-between">
                    <kbd className="rounded bg-white/15 px-1.5 font-mono">{k}</kbd>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/" className="mt-3 inline-block text-xs text-white/40 hover:text-white/70">
              ← 홈으로 나가기
            </Link>
          </div>
        </div>
      )}

      {/* 게임 오버 */}
      {over && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="w-96 rounded-3xl border border-rose-500/40 bg-[#1a1020] p-8 text-center">
            <h2 className="mb-1 text-3xl font-extrabold text-rose-400">💀 쓰러졌어요</h2>
            <p className="mb-4 text-sm text-white/60">그래도 여기까지 잘 싸웠어요!</p>
            <div className="mb-4 space-y-1 text-sm">
              <div>
                도달 웨이브 <b className="text-yellow-300">{over.wave}</b>
              </div>
              <div>
                처치한 적 <b className="text-yellow-300">{over.kills}</b>
              </div>
              <div>
                레벨 <b className="text-yellow-300">{over.level}</b> · 버틴 시간{" "}
                <b className="text-yellow-300">
                  {Math.floor(over.timeSec / 60)}분 {over.timeSec % 60}초
                </b>
              </div>
              <div className="text-xs text-white/50">
                최고 기록: 웨이브 {record.bestWave} · 처치 {record.bestKills}
              </div>
            </div>
            <button onClick={restart} className="w-full rounded-xl bg-rose-500 py-3 text-lg font-bold hover:bg-rose-400">
              🔁 다시 도전
            </button>
            <Link href="/" className="mt-3 inline-block text-xs text-white/40 hover:text-white/70">
              ← 홈으로 나가기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
