"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 12;
const ROWS = 8;

interface Item {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  income: number; // 손님 있을 때 틱당 수익
  appeal: number; // 손님 유치력
}

const ITEMS: Item[] = [
  { id: "path", name: "길", emoji: "🟫", cost: 5, income: 0, appeal: 0 },
  { id: "tree", name: "나무", emoji: "🌳", cost: 10, income: 0, appeal: 2 },
  { id: "flower", name: "꽃밭", emoji: "🌷", cost: 8, income: 0, appeal: 1 },
  { id: "balloon", name: "풍선", emoji: "🎈", cost: 20, income: 0, appeal: 3 },
  { id: "fountain", name: "분수", emoji: "⛲", cost: 60, income: 0, appeal: 6 },
  { id: "toilet", name: "화장실", emoji: "🚻", cost: 40, income: 2, appeal: 3 },
  { id: "icecream", name: "아이스크림", emoji: "🍦", cost: 60, income: 8, appeal: 4 },
  { id: "food", name: "매점", emoji: "🍔", cost: 80, income: 11, appeal: 5 },
  { id: "gift", name: "기념품샵", emoji: "🎁", cost: 90, income: 10, appeal: 5 },
  { id: "carousel", name: "회전목마", emoji: "🎠", cost: 120, income: 12, appeal: 10 },
  { id: "bumper", name: "범퍼카", emoji: "🚗", cost: 160, income: 16, appeal: 13 },
  { id: "ferris", name: "관람차", emoji: "🎡", cost: 240, income: 22, appeal: 20 },
  { id: "coaster", name: "롤러코스터", emoji: "🎢", cost: 380, income: 34, appeal: 30 },
  { id: "castle", name: "매직캐슬", emoji: "🏰", cost: 600, income: 55, appeal: 48 },
];
const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const GUEST_EMOJIS = ["👦", "👧", "🧑", "👩", "👨", "🧒", "👵", "👴", "🧕", "👳", "👶", "🧓"];

const emptyGrid = (): string[][] => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ""));

interface Guest {
  id: number;
  r: number;
  c: number;
  emoji: string;
}

export default function ParkPage() {
  const [grid, setGrid] = useState<string[][]>(emptyGrid);
  const [money, setMoney] = useState(600);
  const [guests, setGuests] = useState(0);
  const [appeal, setAppeal] = useState(0);
  const [tool, setTool] = useState<string>("path");
  const [guestSpots, setGuestSpots] = useState<Guest[]>([]);
  const [toast, setToast] = useState("");
  const [best, setBest] = useState(0);

  const gridRef = useRef(grid);
  const guestsRef = useRef(0);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { guestsRef.current = guests; }, [guests]);

  // 최고 기록 로드
  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("park_best") || "0");
      if (b) setBest(b);
    } catch { /* ignore */ }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1200);
  }, []);

  // 게임 틱 (1초)
  useEffect(() => {
    const iv = setInterval(() => {
      const g = gridRef.current;
      let ap = 0, income = 0;
      const occ: { r: number; c: number }[] = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const id = g[r][c];
          if (id) {
            const it = ITEM_MAP[id];
            ap += it.appeal;
            income += it.income;
            occ.push({ r, c });
          }
        }
      }
      const cur = guestsRef.current;
      const target = Math.floor(ap * 1.5);
      const diff = target - cur;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.max(1, Math.ceil(Math.abs(diff) * 0.25)));
      const ng = Math.max(0, cur + step);
      setGuests(ng);
      setAppeal(ap);

      const factor = ap > 0 ? Math.min(1.2, ng / ap) : 0;
      const earn = Math.floor(income * factor);
      if (earn > 0) setMoney((m) => m + earn);

      const n = Math.min(Math.round(ng), 18);
      if (occ.length > 0 && n > 0) {
        const arr: Guest[] = Array.from({ length: n }, (_, i) => {
          const t = occ[Math.floor(Math.random() * occ.length)];
          return { id: i, r: t.r, c: t.c, emoji: GUEST_EMOJIS[i % GUEST_EMOJIS.length] };
        });
        setGuestSpots(arr);
      } else {
        setGuestSpots([]);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // 최고 기록 갱신 (자산 = 돈 + 배치한 기구 값어치)
  useEffect(() => {
    let built = 0;
    for (const row of grid) for (const id of row) if (id) built += ITEM_MAP[id].cost;
    const value = money + built;
    if (value > best) {
      setBest(value);
      try { localStorage.setItem("park_best", String(value)); } catch { /* ignore */ }
    }
  }, [money, grid, best]);

  const place = (r: number, c: number) => {
    const id = grid[r][c];
    if (tool === "remove") {
      if (!id) return;
      const ng = grid.map((row) => [...row]);
      ng[r][c] = "";
      setGrid(ng);
      return;
    }
    if (id) { showToast("이미 뭔가 있어요!"); return; }
    const it = ITEM_MAP[tool];
    if (money < it.cost) { showToast("💸 돈이 부족해요!"); return; }
    const ng = grid.map((row) => [...row]);
    ng[r][c] = tool;
    setGrid(ng);
    setMoney((m) => m - it.cost);
  };

  const resetPark = () => {
    if (!confirm("공원을 새로 지을까요? (돈 600으로 초기화)")) return;
    setGrid(emptyGrid());
    setMoney(600);
    setGuests(0);
    setGuestSpots([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-emerald-200 to-emerald-300 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 p-3 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-2 flex items-center justify-between">
          <Link href="/" className="rounded-lg bg-white/60 px-3 py-1.5 text-sm font-bold text-slate-800 shadow hover:bg-white">← 홈</Link>
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-white sm:text-2xl">🎡 에피코파크</h1>
          <button onClick={resetPark} className="rounded-lg bg-white/60 px-3 py-1.5 text-sm font-bold text-slate-800 shadow hover:bg-white">🔄 새 공원</button>
        </div>

        {/* 스탯 */}
        <div className="mb-2 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-white/70 py-1.5 shadow">
            <div className="text-[10px] text-slate-500">돈</div>
            <div className="text-sm font-extrabold text-amber-600">💰{money}</div>
          </div>
          <div className="rounded-xl bg-white/70 py-1.5 shadow">
            <div className="text-[10px] text-slate-500">방문객</div>
            <div className="text-sm font-extrabold text-blue-600">👥{guests}</div>
          </div>
          <div className="rounded-xl bg-white/70 py-1.5 shadow">
            <div className="text-[10px] text-slate-500">인기도</div>
            <div className="text-sm font-extrabold text-pink-600">⭐{appeal}</div>
          </div>
          <div className="rounded-xl bg-white/70 py-1.5 shadow">
            <div className="text-[10px] text-slate-500">최고자산</div>
            <div className="text-sm font-extrabold text-purple-600">🏆{best}</div>
          </div>
        </div>

        {/* 맵 */}
        <div className="relative mb-2 select-none rounded-xl border-2 border-emerald-700/40 bg-emerald-400/40 p-1 shadow-inner">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {grid.map((row, r) =>
              row.map((id, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => place(r, c)}
                  className={`flex aspect-square items-center justify-center rounded-[3px] text-base leading-none transition-colors ${
                    id ? "bg-emerald-100/80" : "bg-emerald-500/30 hover:bg-emerald-200/70"
                  }`}
                  style={{ fontSize: "min(4.5vw, 22px)" }}
                >
                  {id ? ITEM_MAP[id].emoji : ""}
                </button>
              ))
            )}
          </div>
          {/* 손님 오버레이 */}
          <div className="pointer-events-none absolute inset-1">
            {guestSpots.map((g) => (
              <span
                key={g.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
                style={{ left: `${((g.c + 0.5) / COLS) * 100}%`, top: `${((g.r + 0.5) / ROWS) * 100}%`, fontSize: "min(3vw, 13px)" }}
              >
                {g.emoji}
              </span>
            ))}
          </div>
          {toast && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1 text-xs font-bold text-white">{toast}</div>
          )}
        </div>

        {/* 팔레트 */}
        <div className="rounded-xl bg-white/70 p-2 shadow">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">🛠️ 건설 (탭 → 맵에 배치)</span>
            <button
              onClick={() => setTool("remove")}
              className={`rounded-lg px-2 py-1 text-xs font-bold ${tool === "remove" ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}
            >
              🧨 철거
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {ITEMS.map((it) => {
              const selected = tool === it.id;
              const afford = money >= it.cost;
              return (
                <button
                  key={it.id}
                  onClick={() => setTool(it.id)}
                  className={`flex flex-col items-center rounded-lg border-2 p-1 transition-all ${
                    selected ? "border-emerald-500 bg-emerald-100" : "border-transparent bg-slate-100"
                  } ${afford ? "" : "opacity-50"}`}
                >
                  <span className="text-xl leading-none">{it.emoji}</span>
                  <span className="text-[9px] font-bold text-slate-700">{it.name}</span>
                  <span className={`text-[9px] font-bold ${afford ? "text-amber-600" : "text-red-500"}`}>💰{it.cost}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-600 dark:text-slate-300">
          놀이기구·가게를 지으면 <b>인기도⭐</b>가 오르고 <b>손님👥</b>이 몰려와 <b>돈💰</b>을 벌어요! 길🟫로 예쁘게 꾸며보세요.
        </p>
      </div>
    </div>
  );
}
