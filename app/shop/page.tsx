"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.045) {
  try {
    if (!ac) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sSell = () => { beep(880, 0.05, "triangle", 0.05); setTimeout(() => beep(1320, 0.07, "triangle", 0.04), 55); }; // 삑- 결제음
const sFail = () => beep(150, 0.16, "sawtooth", 0.06);
const sAngry = () => { [300, 220, 160].forEach((f, i) => setTimeout(() => beep(f, 0.13, "square", 0.06), i * 90)); };
const sCome = () => beep(1100, 0.04, "sine", 0.03);
const sBuy = () => beep(700, 0.09, "triangle", 0.06);
const sBell = () => { [660, 880, 1174].forEach((f, i) => setTimeout(() => beep(f, 0.14, "triangle", 0.06), i * 90)); };
const sDay = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.13, "triangle", 0.05), i * 100)); };

const SAVE = "shop_save";
const GOAL = 300000;      // 자산 30만원 = 클리어
const DAY_SEC = 60;       // 하루 영업 60초
const START_MONEY = 20000;
const MAX_QUEUE = 5;
const MAX_HEART = 3;

type ItemId = "onigiri" | "drink" | "snack" | "ramen" | "bread" | "ice" | "chicken" | "sushi";
type Item = { id: ItemId; name: string; emoji: string; cost: number; price: number; unlock: number };
const ITEMS: Item[] = [
  { id: "onigiri", name: "삼각김밥", emoji: "🍙", cost: 600, price: 1300, unlock: 1 },
  { id: "drink", name: "음료수", emoji: "🥤", cost: 800, price: 1700, unlock: 1 },
  { id: "snack", name: "초콜릿", emoji: "🍫", cost: 700, price: 1600, unlock: 2 },
  { id: "ramen", name: "컵라면", emoji: "🍜", cost: 900, price: 2100, unlock: 3 },
  { id: "bread", name: "크림빵", emoji: "🍞", cost: 1200, price: 2600, unlock: 4 },
  { id: "ice", name: "아이스크림", emoji: "🍦", cost: 1500, price: 3300, unlock: 5 },
  { id: "chicken", name: "치킨", emoji: "🍗", cost: 4000, price: 9000, unlock: 7 },
  { id: "sushi", name: "초밥", emoji: "🍣", cost: 6500, price: 15000, unlock: 9 },
];
const ITEM = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

type UpgKey = "fridge" | "chair" | "deco" | "ad" | "alba" | "pos";
type Upg = { key: UpgKey; name: string; emoji: string; max: number; cost: (l: number) => number; desc: (l: number) => string };
const UPGS: Upg[] = [
  { key: "fridge", name: "대형 냉장고", emoji: "🧊", max: 8, cost: (l) => 3000 + l * 2500, desc: (l) => `상품별 최대 재고 ${10 + l * 5}개` },
  { key: "chair", name: "대기 의자", emoji: "🪑", max: 6, cost: (l) => 2500 + l * 2200, desc: (l) => `손님 인내심 +${l * 2}초` },
  { key: "deco", name: "예쁜 인테리어", emoji: "💡", max: 6, cost: (l) => 4000 + l * 3600, desc: (l) => `판매가 +${l * 8}%` },
  { key: "ad", name: "광고 전단", emoji: "📢", max: 6, cost: (l) => 3000 + l * 2800, desc: (l) => `손님이 ${l * 8}% 더 자주 옴` },
  { key: "alba", name: "알바생 고용", emoji: "🧑‍🍳", max: 4, cost: (l) => 9000 + l * 8000, desc: (l) => (l ? `${6 - l}초마다 자동 판매` : "자동으로 손님 응대") },
  { key: "pos", name: "최신 포스기", emoji: "💳", max: 5, cost: (l) => 3500 + l * 3200, desc: (l) => `콤보 팁 +${l * 25}%` },
];

const FACES = ["🧑", "👩", "👴", "👵", "👦", "👧", "🧔", "👱‍♀️", "👨‍🦰", "🧓", "👮", "👩‍🏫", "🧑‍🚀", "👷", "🕵️"];

type Cust = { id: number; face: string; want: ItemId; pat: number; maxPat: number; vip: boolean };
type Float = { id: number; txt: string; c: string };
type Stock = Record<string, number>;
type Save = { money: number; day: number; upg: Record<string, number>; stock: Stock; bestDay: number; bestSales: number; cleared: boolean };

const emptyStock = (): Stock => Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function Shop() {
  const [phase, setPhase] = useState<"title" | "order" | "play" | "result" | "upgrade" | "clear">("title");
  const phaseRef = useRef(phase); useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ───── 영구 데이터 (ref가 원본, state는 화면용 거울) ─────
  const moneyRef = useRef(START_MONEY); const [money, setMoneyS] = useState(START_MONEY);
  const stockRef = useRef<Stock>(emptyStock()); const [stock, setStockS] = useState<Stock>(emptyStock());
  const upgRef = useRef<Record<string, number>>({}); const [upg, setUpgS] = useState<Record<string, number>>({});
  const dayRef = useRef(1); const [day, setDayS] = useState(1);
  const [best, setBest] = useState({ day: 0, sales: 0 });
  const [cleared, setCleared] = useState(false);

  const setMoney = (n: number) => { moneyRef.current = n; setMoneyS(n); };
  const setStock = (s: Stock) => { stockRef.current = s; setStockS(s); };
  const setUpg = (u: Record<string, number>) => { upgRef.current = u; setUpgS(u); };
  const setDay = (d: number) => { dayRef.current = d; setDayS(d); };

  // ───── 하루 영업 런타임 (ref가 원본) ─────
  const run = useRef({ queue: [] as Cust[], timeLeft: DAY_SEC, hearts: MAX_HEART, combo: 0, sales: 0, served: 0, lost: 0 });
  const [view, setView] = useState({ queue: [] as Cust[], timeLeft: DAY_SEC, hearts: MAX_HEART, combo: 0, sales: 0, served: 0, lost: 0 });
  const sync = useCallback(() => { const r = run.current; setView({ ...r, queue: [...r.queue] }); }, []);

  const [floats, setFloats] = useState<Float[]>([]);
  const [shake, setShake] = useState(0);
  const idc = useRef(1);

  const lv = useCallback((k: UpgKey) => upgRef.current[k] || 0, []);
  const maxStock = 10 + (upg["fridge"] || 0) * 5;
  const priceOf = useCallback((id: ItemId) => Math.round(ITEM(id).price * (1 + (upgRef.current["deco"] || 0) * 0.08)), []);
  const unlocked = ITEMS.filter((i) => i.unlock <= day);

  // ───── 저장 / 불러오기 ─────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE); if (!raw) return;
      const s: Save = JSON.parse(raw);
      setMoney(typeof s.money === "number" ? s.money : START_MONEY);
      setDay(s.day || 1);
      setUpg(s.upg || {});
      setStock({ ...emptyStock(), ...(s.stock || {}) });
      setBest({ day: s.bestDay || 0, sales: s.bestSales || 0 });
      setCleared(!!s.cleared);
    } catch { /* ignore */ }
  }, []);
  const save = useCallback((extra: Partial<Save> = {}) => {
    try {
      localStorage.setItem(SAVE, JSON.stringify({
        money: moneyRef.current, day: dayRef.current, upg: upgRef.current, stock: stockRef.current, ...extra,
      }));
    } catch { /* ignore */ }
  }, []);

  const addFloat = useCallback((txt: string, c: string) => {
    const id = idc.current++;
    setFloats((f) => [...f.slice(-4), { id, txt, c }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1000);
  }, []);
  const nope = useCallback((msg: string) => { sFail(); run.current.combo = 0; setShake(idc.current++); addFloat(msg, "text-red-500"); sync(); }, [addFloat, sync]);

  // ───── 판매 ─────
  const sell = useCallback((id: ItemId, auto = false) => {
    if (phaseRef.current !== "play") return false;
    const r = run.current;
    if ((stockRef.current[id] || 0) <= 0) { if (!auto) nope("📦 재고가 없어요!"); return false; }
    let target: Cust | null = null;
    for (const c of r.queue) if (c.want === id && (!target || c.pat < target.pat)) target = c;
    if (!target) { if (!auto) nope("🙅 그걸 원하는 손님이 없어요"); return false; }

    setStock({ ...stockRef.current, [id]: stockRef.current[id] - 1 });
    r.queue = r.queue.filter((c) => c.id !== target!.id);
    r.combo += 1;
    const base = priceOf(id) * (target.vip ? 2 : 1);
    const tip = Math.round(base * 0.05 * Math.min(10, r.combo) * (1 + lv("pos") * 0.25));
    const gain = base + tip;
    setMoney(moneyRef.current + gain);
    r.sales += gain; r.served += 1;
    addFloat(`+${won(gain)}${r.combo > 2 ? ` 🔥x${r.combo}` : ""}${target.vip ? " 👑VIP" : ""}`, target.vip ? "text-amber-500" : "text-emerald-600");
    sSell(); sync();
    return true;
  }, [priceOf, lv, addFloat, nope, sync]);

  // ───── 하루 영업 루프 ─────
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0, last = performance.now(), spawnAcc = 99, albaAcc = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const r = run.current, d = dayRef.current;

      // 손님 등장
      spawnAcc += dt;
      const every = Math.max(0.8, (2.6 - d * 0.09) * (1 - lv("ad") * 0.08));
      if (spawnAcc >= every && r.queue.length < MAX_QUEUE) {
        spawnAcc = 0;
        const pool = ITEMS.filter((i) => i.unlock <= d);
        const want = pool[Math.floor(Math.random() * pool.length)].id;
        const maxPat = Math.max(5, 10 + lv("chair") * 2 - d * 0.25);
        r.queue.push({ id: idc.current++, face: FACES[Math.floor(Math.random() * FACES.length)], want, pat: maxPat, maxPat, vip: Math.random() < 0.12 });
        sCome();
      }

      // 알바생 자동 판매
      const alba = lv("alba");
      if (alba > 0) {
        albaAcc += dt;
        if (albaAcc >= 6 - alba) { albaAcc = 0; const c = r.queue.find((x) => (stockRef.current[x.want] || 0) > 0); if (c) sell(c.want, true); }
      }

      // 인내심 감소 → 화난 손님
      let angry = 0;
      const keep: Cust[] = [];
      for (const c of r.queue) { c.pat -= dt; if (c.pat > 0) keep.push(c); else angry++; }
      if (angry) {
        r.queue = keep; r.combo = 0; r.lost += angry; r.hearts = Math.max(0, r.hearts - angry);
        sAngry(); addFloat("😡 손님이 화나서 갔어요!", "text-red-500");
      }

      r.timeLeft = Math.max(0, r.timeLeft - dt);
      sync();

      if (r.timeLeft <= 0 || r.hearts <= 0) {
        cancelAnimationFrame(raf);
        r.queue = []; sync(); sDay();
        save(); setPhase("result");
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, lv, sell, addFloat, sync, save]);

  // ───── 액션 ─────
  const startDay = () => {
    run.current = { queue: [], timeLeft: DAY_SEC, hearts: MAX_HEART, combo: 0, sales: 0, served: 0, lost: 0 };
    setFloats([]); sync(); sBell(); setPhase("play");
  };
  const finishResult = () => {
    const r = run.current;
    const nb = { day: Math.max(best.day, dayRef.current), sales: Math.max(best.sales, r.sales) };
    setBest(nb); setDay(dayRef.current + 1);
    const justCleared = moneyRef.current >= GOAL && !cleared;
    if (justCleared) setCleared(true);
    save({ bestDay: nb.day, bestSales: nb.sales, cleared: cleared || justCleared });
    setPhase(justCleared ? "clear" : "upgrade");
  };
  const buyStock = (id: ItemId, n: number) => {
    const have = stockRef.current[id] || 0, c = ITEM(id).cost;
    const buy = Math.min(n, maxStock - have, Math.floor(moneyRef.current / c));
    if (buy <= 0) { sFail(); return; }
    setMoney(moneyRef.current - c * buy);
    setStock({ ...stockRef.current, [id]: have + buy });
    sBuy(); save();
  };
  const fillAll = () => {
    let m = moneyRef.current; const ns = { ...stockRef.current }; let bought = 0;
    for (const it of ITEMS) {
      if (it.unlock > dayRef.current) continue;
      const n = Math.min(maxStock - (ns[it.id] || 0), Math.floor(m / it.cost));
      if (n > 0) { ns[it.id] = (ns[it.id] || 0) + n; m -= it.cost * n; bought += n; }
    }
    if (!bought) { sFail(); return; }
    setMoney(m); setStock(ns); sBuy(); save();
  };
  const buyUpg = (u: Upg) => {
    const l = upgRef.current[u.key] || 0; if (l >= u.max) return;
    const c = u.cost(l); if (moneyRef.current < c) { sFail(); return; }
    setMoney(moneyRef.current - c); setUpg({ ...upgRef.current, [u.key]: l + 1 }); sBuy(); save();
  };
  const goOrder = () => { save(); setPhase("order"); };
  const resetAll = () => {
    if (!confirm("정말 처음부터 다시 시작할까요? (자금·업그레이드 모두 초기화)")) return;
    setMoney(START_MONEY); setDay(1); setUpg({}); setStock(emptyStock()); setCleared(false);
    save({ bestDay: best.day, bestSales: best.sales, cleared: false });
    setPhase("title");
  };

  const totalStock = ITEMS.reduce((a, i) => a + (stock[i.id] || 0), 0);
  const goalPct = Math.min(100, money / GOAL * 100);
  const box = { minHeight: 470 } as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 via-amber-50 to-sky-100 text-zinc-900 flex flex-col items-center px-3 py-2">
      <style>{`@keyframes popUp{0%{transform:translateY(8px);opacity:0}20%{opacity:1}100%{transform:translateY(-34px);opacity:0}}
      .popup{animation:popUp 1s ease-out forwards}
      @keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
      .shk{animation:shk .25s}`}</style>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-orange-600 text-sm font-bold">← 홈</Link>
          <h1 className="text-base font-black text-orange-600">🏪 편의점 사장님</h1>
          <span className="text-xs text-zinc-500 font-bold">🏆 {best.day}일차</span>
        </div>

        {/* 자산 / 목표 */}
        <div className="rounded-xl bg-white/80 border-2 border-amber-300 px-3 py-1.5 mb-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-amber-600">💰 {won(money)}</span>
            <span className="text-zinc-500">🎯 목표 {won(GOAL)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-amber-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${goalPct}%` }} />
          </div>
        </div>

        <div key={shake} className={`relative rounded-2xl border-4 border-amber-400 bg-white/90 shadow-lg overflow-hidden ${shake ? "shk" : ""}`} style={box}>

          {/* 떠오르는 알림 */}
          <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center">
            {floats.map((f) => <div key={f.id} className={`popup text-sm font-black drop-shadow ${f.c}`}>{f.txt}</div>)}
          </div>

          {/* ───── 타이틀 ───── */}
          {phase === "title" && (
            <div className="flex flex-col items-center gap-3 p-5 text-center" style={box}>
              <div className="text-6xl mt-3">🏪</div>
              <h2 className="text-2xl font-black text-orange-600">편의점 사장님</h2>
              <p className="text-xs text-zinc-600 leading-5">
                손님이 원하는 물건을 <b>탭</b>해서 팔아요!<br />
                재고를 <b>발주</b>하고, 번 돈으로 가게를 <b>업그레이드</b>!<br />
                자산 <b className="text-orange-600">{won(GOAL)}</b>을 모으면 대성공 🎉
              </p>
              <div className="w-full rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] font-bold text-zinc-600 space-y-0.5">
                <div className="flex justify-between"><span>📅 오늘</span><span className="text-orange-600">{day}일차</span></div>
                <div className="flex justify-between"><span>📦 창고 재고</span><span className="text-orange-600">{totalStock}개</span></div>
                <div className="flex justify-between"><span>🏆 최고 하루 매출</span><span className="text-orange-600">{won(best.sales)}</span></div>
                {cleared && <div className="text-center text-amber-600">👑 목표 달성 사장님!</div>}
              </div>
              <button onClick={goOrder} className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white py-4 text-lg font-black shadow active:scale-95">▶ {day}일차 시작!</button>
              <div className="grid grid-cols-2 gap-2 w-full">
                <button onClick={() => setPhase("upgrade")} className="rounded-xl bg-sky-500 text-white py-2.5 font-black active:scale-95">🛠️ 업그레이드</button>
                <button onClick={resetAll} className="rounded-xl bg-zinc-300 text-zinc-700 py-2.5 font-black active:scale-95">🔄 처음부터</button>
              </div>
            </div>
          )}

          {/* ───── 발주 ───── */}
          {phase === "order" && (
            <div className="flex flex-col gap-2 p-3" style={box}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-orange-600">🚚 {day}일차 발주</h2>
                <span className="text-sm font-black text-amber-600">💰 {won(money)}</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-bold">오늘 팔 물건을 미리 사두세요! (상품당 최대 {maxStock}개)</p>
              <div className="flex-1 space-y-1.5 overflow-auto">
                {ITEMS.map((it) => {
                  const locked = it.unlock > day, have = stock[it.id] || 0, full = have >= maxStock;
                  return (
                    <div key={it.id} className={`flex items-center gap-2 rounded-xl border-2 p-1.5 ${locked ? "border-zinc-200 bg-zinc-100 opacity-60" : "border-amber-200 bg-amber-50"}`}>
                      <span className="text-2xl">{locked ? "🔒" : it.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black">{it.name}{locked && <span className="ml-1 text-[9px] text-zinc-500">{it.unlock}일차 해금</span>}</div>
                        <div className="text-[10px] font-bold text-zinc-500">매입 {won(it.cost)} → 판매 <span className="text-emerald-600">{won(priceOf(it.id))}</span></div>
                      </div>
                      <span className={`text-[11px] font-black w-11 text-right ${full ? "text-emerald-600" : have ? "text-zinc-700" : "text-red-400"}`}>{have}/{maxStock}</span>
                      {!locked && (
                        <div className="flex gap-1">
                          <button onClick={() => buyStock(it.id, 1)} disabled={full || money < it.cost} className="w-8 h-8 rounded-lg bg-orange-400 text-white text-[11px] font-black disabled:opacity-30 active:scale-90">+1</button>
                          <button onClick={() => buyStock(it.id, 5)} disabled={full || money < it.cost} className="w-8 h-8 rounded-lg bg-orange-500 text-white text-[11px] font-black disabled:opacity-30 active:scale-90">+5</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={fillAll} className="rounded-xl bg-emerald-500 text-white py-2.5 font-black active:scale-95">🛒 가능한 만큼 전부 채우기</button>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setPhase("title")} className="rounded-xl bg-zinc-300 text-zinc-700 py-3 font-black active:scale-95">←</button>
                <button onClick={startDay} disabled={totalStock === 0} className="col-span-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white py-3 font-black shadow active:scale-95 disabled:opacity-40">
                  {totalStock === 0 ? "재고를 사세요!" : "🔔 영업 시작!"}
                </button>
              </div>
            </div>
          )}

          {/* ───── 영업 중 ───── */}
          {phase === "play" && (
            <div className="flex flex-col p-2 gap-1.5" style={box}>
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-orange-600">📅 {day}일차</span>
                <span className={view.timeLeft < 10 ? "text-red-500 animate-pulse" : "text-sky-600"}>⏱ {Math.ceil(view.timeLeft)}초</span>
                <span>{"❤️".repeat(view.hearts)}{"🤍".repeat(MAX_HEART - view.hearts)}</span>
                <span className={view.combo > 2 ? "text-red-500" : "text-zinc-400"}>🔥 x{view.combo}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                <div className="h-full bg-sky-400" style={{ width: `${view.timeLeft / DAY_SEC * 100}%` }} />
              </div>

              {/* 손님 줄 */}
              <div className="rounded-xl bg-sky-50 border-2 border-sky-200 p-1.5" style={{ minHeight: 118 }}>
                <div className="text-[10px] font-black text-sky-600 mb-1">🚶 기다리는 손님 {view.queue.length}/{MAX_QUEUE}</div>
                <div className="flex gap-1">
                  {view.queue.map((c) => (
                    <div key={c.id} className={`flex-1 max-w-[64px] rounded-lg p-1 text-center ${c.vip ? "bg-amber-200 border border-amber-400" : "bg-white"}`}>
                      <div className="text-[10px] leading-3">{c.vip ? "👑" : " "}</div>
                      <div className="text-2xl leading-7">{c.face}</div>
                      <div className="text-xl leading-6">{ITEM(c.want).emoji}</div>
                      <div className="h-1 rounded-full bg-zinc-200 overflow-hidden mt-0.5">
                        <div className={`h-full ${c.pat / c.maxPat > 0.5 ? "bg-emerald-400" : c.pat / c.maxPat > 0.25 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${Math.max(0, c.pat / c.maxPat * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {view.queue.length === 0 && <div className="w-full text-center text-[11px] text-zinc-400 font-bold py-7">손님을 기다리는 중...</div>}
                </div>
              </div>

              {/* 진열대 */}
              <div className="text-[10px] font-black text-orange-600">🧺 진열대 — 손님이 원하는 걸 눌러서 판매!</div>
              <div className="grid grid-cols-2 gap-1.5">
                {unlocked.map((it) => {
                  const have = stock[it.id] || 0;
                  const wanted = view.queue.some((c) => c.want === it.id);
                  return (
                    <button key={it.id} onClick={() => sell(it.id)}
                      className={`flex items-center gap-1.5 rounded-xl border-2 p-1.5 text-left active:scale-95 transition-colors ${have === 0 ? "border-zinc-200 bg-zinc-100 opacity-50" : wanted ? "border-emerald-400 bg-emerald-50 shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "border-amber-200 bg-white"}`}>
                      <span className="text-2xl">{it.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black truncate">{it.name}</div>
                        <div className="text-[10px] font-bold text-emerald-600">{won(priceOf(it.id))}</div>
                      </div>
                      <span className={`text-[11px] font-black ${have === 0 ? "text-red-400" : "text-zinc-500"}`}>{have}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] font-black">
                <span className="text-zinc-500">오늘 매출</span>
                <span className="text-emerald-600 text-xs">{won(view.sales)}</span>
                <span className="text-zinc-400">응대 {view.served} · 놓침 {view.lost}</span>
              </div>
            </div>
          )}

          {/* ───── 정산 ───── */}
          {phase === "result" && (
            <div className="flex flex-col items-center justify-center gap-2 p-5 text-center" style={box}>
              <div className="text-5xl">{view.hearts <= 0 ? "😵" : view.sales > 0 ? "🎉" : "😐"}</div>
              <h2 className="text-xl font-black text-orange-600">{day}일차 영업 끝!</h2>
              {view.hearts <= 0 && <p className="text-[11px] font-bold text-red-500">손님을 너무 많이 놓쳐서 일찍 문을 닫았어요…</p>}
              <div className="text-2xl">{"⭐".repeat(Math.max(1, Math.min(3, 3 - view.lost)))}</div>
              <div className="w-full rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-bold space-y-1">
                <div className="flex justify-between"><span className="text-zinc-500">오늘 매출</span><span className="text-emerald-600 font-black">{won(view.sales)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">응대한 손님</span><span>{view.served}명</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">놓친 손님</span><span className="text-red-500">{view.lost}명</span></div>
                <div className="flex justify-between border-t border-amber-200 pt-1"><span className="text-zinc-500">총 자산</span><span className="text-amber-600 font-black">{won(money)}</span></div>
              </div>
              {view.sales > best.sales && <p className="text-xs font-black text-orange-500">🏆 최고 매출 신기록!</p>}
              <button onClick={finishResult} className="w-full mt-1 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white py-3.5 font-black shadow active:scale-95">🛠️ 업그레이드 하러 가기</button>
            </div>
          )}

          {/* ───── 업그레이드 상점 ───── */}
          {phase === "upgrade" && (
            <div className="flex flex-col gap-2 p-3" style={box}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-sky-600">🛠️ 가게 업그레이드</h2>
                <span className="text-sm font-black text-amber-600">💰 {won(money)}</span>
              </div>
              <div className="flex-1 space-y-1.5 overflow-auto">
                {UPGS.map((u) => {
                  const l = upg[u.key] || 0, maxed = l >= u.max, c = u.cost(l), can = !maxed && money >= c;
                  return (
                    <button key={u.key} onClick={() => buyUpg(u)} disabled={!can}
                      className={`w-full flex items-center gap-2 rounded-xl border-2 p-2 text-left ${maxed ? "border-amber-400 bg-amber-100" : can ? "border-emerald-400 bg-emerald-50 active:scale-95" : "border-zinc-200 bg-zinc-100 opacity-60"}`}>
                      <span className="text-2xl">{u.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black">{u.name} <span className="text-[9px] text-sky-600">Lv.{l}/{u.max}</span></div>
                        <div className="text-[10px] font-bold text-zinc-500 truncate">{u.desc(l)}</div>
                        <div className="mt-0.5 flex gap-0.5">{Array.from({ length: u.max }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i < l ? "bg-amber-400" : "bg-zinc-200"}`} />)}</div>
                      </div>
                      <span className="text-[11px] font-black text-amber-600 w-14 text-right">{maxed ? "MAX" : won(c)}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={goOrder} className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white py-3.5 font-black shadow active:scale-95">🚚 {day}일차 발주하러 가기</button>
              <button onClick={() => setPhase("title")} className="rounded-xl bg-zinc-300 text-zinc-700 py-2 text-sm font-black active:scale-95">← 메인으로</button>
            </div>
          )}

          {/* ───── 클리어 ───── */}
          {phase === "clear" && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-b from-amber-200 to-orange-100" style={box}>
              <div className="text-6xl">🏆</div>
              <h2 className="text-2xl font-black text-orange-600">대박 사장님!</h2>
              <p className="text-sm font-bold text-zinc-700">자산 {won(GOAL)} 달성! 🎉<br />{day - 1}일 만에 해냈어요!</p>
              <p className="text-xs font-bold text-zinc-500">이제 계속 영업해서 더 큰 부자가 되어보세요!</p>
              <button onClick={() => setPhase("upgrade")} className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 text-white py-3.5 font-black shadow active:scale-95">계속 영업하기 →</button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-500 font-bold mt-2">
          🚚발주 → 🔔영업 → 🛠️업그레이드! 🔥콤보 팁 · 👑VIP 2배 · 🧑‍🍳알바생 자동판매
        </p>
      </div>
    </div>
  );
}
