"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Confetti, makeConfetti, type ConfettiPiece } from "../shapemaker/Confetti";
import { playSfx } from "../shapemaker/sound";
import {
  badgesFor,
  BOIL_SECONDS,
  BURN_SECONDS,
  CHOP_TAPS,
  dishScore,
  EXTRAS,
  extraOf,
  GRILL_SECONDS,
  INGREDIENTS,
  ingredientOf,
  itemEmoji,
  itemName,
  OVERBOIL_SECONDS,
  PAN_SLOTS,
  pickDish,
  POT_SLOTS,
  PREP_INFO,
  sameItem,
  timeFor,
  TRAY_SLOTS,
  WASH_TAPS,
  type Dish,
  type Item,
  type Prep,
} from "./foodData";

type Screen = "menu" | "playing" | "gameover";
/** 재료를 놓을 수 있는 자리 */
type Zone = "sink" | "board" | "pan" | "pot" | "plate" | "trash";

interface HandSlot {
  item: Item;
  /** 지금까지 문지르거나 칼질한 횟수 */
  taps: number;
}

interface HeatSlot {
  item: Item;
  startedAt: number;
}

interface Dragging {
  item: Item;
  /** 트레이에서 꺼낸 경우 그 자리 번호 */
  fromTray: number | null;
  x: number;
  y: number;
  moved: boolean;
}

type HeatState = "cooking" | "done" | "ruined";

const BEST_KEY = "foodmaker_best";
const TICK_MS = 100;
/** 틀렸을 때 깎이는 시간 */
const PENALTY_MS = 3000;

function heatStateOf(slot: HeatSlot, now: number, kind: "pan" | "pot"): HeatState {
  const elapsed = (now - slot.startedAt) / 1000;
  const doneAt = kind === "pan" ? GRILL_SECONDS : BOIL_SECONDS;
  const ruinAt = kind === "pan" ? BURN_SECONDS : OVERBOIL_SECONDS;
  if (elapsed >= ruinAt) return "ruined";
  if (elapsed >= doneAt) return "done";
  return "cooking";
}

/** 재료 한 덩이를 보여주는 조각 */
function ItemChip({ item, size = "text-2xl" }: { item: Item; size?: string }) {
  const badges = badgesFor(item);
  return (
    <span className="relative inline-block">
      <span className={size}>{itemEmoji(item)}</span>
      {badges.length > 0 && (
        <span className="absolute -right-1 -top-1 text-[9px] leading-none">{badges.join("")}</span>
      )}
    </span>
  );
}

export default function FoodMaker() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [round, setRound] = useState(1);
  const [dish, setDish] = useState<Dish>(() => pickDish(1));
  const [stack, setStack] = useState<Item[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [sink, setSink] = useState<HandSlot | null>(null);
  const [board, setBoard] = useState<HandSlot | null>(null);
  const [pan, setPan] = useState<(HeatSlot | null)[]>(Array(PAN_SLOTS).fill(null));
  const [pot, setPot] = useState<(HeatSlot | null)[]>(Array(POT_SLOTS).fill(null));
  const [tray, setTray] = useState<Item[]>([]);
  const [now, setNow] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [flash, setFlash] = useState("");

  const deadlineRef = useRef(0);
  const bestRef = useRef(0);
  const scoreRef = useRef(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = Number(localStorage.getItem(BEST_KEY) ?? 0);
        if (Number.isFinite(saved) && saved > 0) {
          bestRef.current = saved;
          setBest(saved);
        }
      } catch {
        /* 저장소를 못 써도 게임은 그대로 된다 */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    setTimeout(() => setFlash(""), 1300);
  }, []);

  const penalize = useCallback(
    (text: string) => {
      deadlineRef.current -= PENALTY_MS;
      playSfx("bad");
      showFlash(text);
      setCombo(0);
    },
    [showFlash]
  );

  const endGame = useCallback(() => {
    setScreen("gameover");
    setDragging(null);
    const final = scoreRef.current;
    if (final > bestRef.current) {
      bestRef.current = final;
      setBest(final);
      setConfetti(makeConfetti());
      playSfx("fanfare");
      try {
        localStorage.setItem(BEST_KEY, String(final));
      } catch {
        /* 기록만 안 남을 뿐 진행에 지장 없다 */
      }
    } else {
      playSfx("bad");
    }
  }, []);

  // 시계: 남은 시간과 불 위 재료의 익은 정도를 같이 굴린다.
  useEffect(() => {
    if (screen !== "playing") return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      const remain = (deadlineRef.current - t) / 1000;
      setTimeLeft(Math.max(0, remain));
      if (remain <= 0) endGame();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [screen, endGame]);

  const startRound = useCallback((nextRound: number, previous?: string) => {
    const next = pickDish(nextRound, previous);
    setDish(next);
    setStack([]);
    setAdded([]);
    setSink(null);
    setBoard(null);
    setPan(Array(PAN_SLOTS).fill(null));
    setPot(Array(POT_SLOTS).fill(null));
    setTray([]);
    setRound(nextRound);
    deadlineRef.current = performance.now() + timeFor(next) * 1000;
    setTimeLeft(timeFor(next));
  }, []);

  const startGame = useCallback(() => {
    playSfx("click");
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setConfetti([]);
    setScreen("playing");
    startRound(1);
  }, [startRound]);

  const toTray = useCallback(
    (item: Item) => {
      setTray((prev) => {
        if (prev.length >= TRAY_SLOTS) {
          showFlash("준비대가 꽉 찼어요!");
          return prev;
        }
        return [...prev, item];
      });
    },
    [showFlash]
  );

  /** 접시에 한 층 올린다. 재료와 손질 과정이 모두 맞아야 한다. */
  const placeOnPlate = useCallback(
    (item: Item, fromTray: number | null) => {
      if (screen !== "playing") return;
      if (stack.length >= dish.layers.length) {
        showFlash("이제 양념을 넣을 차례예요!");
        return;
      }
      const wanted = dish.layers[stack.length];
      if (!sameItem(item, wanted)) {
        penalize(`${itemName(wanted)}(이)가 올라갈 차례예요!`);
        return;
      }

      if (fromTray !== null) setTray((prev) => prev.filter((_, i) => i !== fromTray));
      const next = [...stack, item];
      setStack(next);

      if (next.length < dish.layers.length || dish.extras.length > 0) {
        playSfx("good");
        if (next.length === dish.layers.length) showFlash("이제 양념을 넣어요!");
        return;
      }
      // 양념이 없는 요리는 마지막 층에서 바로 완성된다.
      const gained = dishScore(dish, timeLeft, combo);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setCombo((prev) => prev + 1);
      playSfx("levelup");
      showFlash(`${dish.emoji} 완성! +${gained}점`);
      startRound(round + 1, dish.id);
    },
    [screen, stack, dish, timeLeft, combo, round, startRound, showFlash, penalize]
  );

  /** 마지막 양념 넣기 */
  const addExtra = useCallback(
    (extraId: string) => {
      if (stack.length < dish.layers.length) {
        showFlash("먼저 재료를 다 쌓아야 해요!");
        return;
      }
      if (added.includes(extraId)) return;
      if (!dish.extras.includes(extraId)) {
        penalize(`${extraOf(extraId).name}은(는) 이 요리에 안 들어가요!`);
        return;
      }
      const next = [...added, extraId];
      setAdded(next);
      if (next.length < dish.extras.length) {
        playSfx("good");
        return;
      }
      const gained = dishScore(dish, timeLeft, combo);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setCombo((prev) => prev + 1);
      playSfx("levelup");
      showFlash(`${dish.emoji} 완성! +${gained}점`);
      startRound(round + 1, dish.id);
    },
    [stack.length, dish, added, timeLeft, combo, round, startRound, showFlash, penalize]
  );

  /** 재료를 어떤 자리에 넣는다. */
  const dropOn = useCallback(
    (zone: Zone, item: Item, fromTray: number | null) => {
      if (zone === "plate") {
        placeOnPlate(item, fromTray);
        return;
      }
      // 잘못 손질한 재료를 버린다. 이게 없으면 준비대가 막혀 라운드를 끝낼 수 없다.
      if (zone === "trash") {
        if (fromTray !== null) setTray((prev) => prev.filter((_, i) => i !== fromTray));
        playSfx("click");
        showFlash("버렸어요");
        return;
      }

      const prep: Prep = zone === "sink" ? "wash" : zone === "board" ? "cut" : zone === "pan" ? "grill" : "boil";
      if (!ingredientOf(item.ingredient).allowed.includes(prep)) {
        penalize(`${ingredientOf(item.ingredient).name}은(는) ${PREP_INFO[prep].place}에 넣을 수 없어요!`);
        return;
      }
      if (item.steps.includes(prep)) {
        showFlash(`이미 ${PREP_INFO[prep].name} 했어요!`);
        return;
      }

      const next: Item = { ingredient: item.ingredient, steps: [...item.steps, prep] };
      const take = () => {
        if (fromTray !== null) setTray((prev) => prev.filter((_, i) => i !== fromTray));
      };

      if (zone === "sink") {
        if (sink !== null) {
          showFlash("싱크대가 차 있어요!");
          return;
        }
        take();
        setSink({ item: next, taps: 0 });
      } else if (zone === "board") {
        if (board !== null) {
          showFlash("도마가 차 있어요!");
          return;
        }
        take();
        setBoard({ item: next, taps: 0 });
      } else {
        const slots = zone === "pan" ? pan : pot;
        const free = slots.findIndex((s) => s === null);
        if (free === -1) {
          showFlash(`${PREP_INFO[prep].place}이(가) 꽉 찼어요!`);
          return;
        }
        take();
        const updated = [...slots];
        updated[free] = { item: next, startedAt: performance.now() };
        if (zone === "pan") setPan(updated);
        else setPot(updated);
      }
      playSfx("click");
    },
    [placeOnPlate, penalize, showFlash, sink, board, pan, pot]
  );

  /** 싱크대에서 문지르기 / 도마에서 칼질하기 */
  const workOn = useCallback(
    (which: "sink" | "board") => {
      const slot = which === "sink" ? sink : board;
      if (slot === null) return;
      const needed = which === "sink" ? WASH_TAPS : CHOP_TAPS;
      const taps = slot.taps + 1;
      playSfx("click");
      if (taps < needed) {
        if (which === "sink") setSink({ ...slot, taps });
        else setBoard({ ...slot, taps });
        return;
      }
      // 다 손질했으면 준비대로 옮긴다
      if (which === "sink") setSink(null);
      else setBoard(null);
      toTray(slot.item);
      playSfx("good");
    },
    [sink, board, toTray]
  );

  /** 불에서 꺼내기 */
  const takeFromHeat = useCallback(
    (zone: "pan" | "pot", index: number) => {
      const slots = zone === "pan" ? pan : pot;
      const slot = slots[index];
      if (slot === null) return;
      const state = heatStateOf(slot, performance.now(), zone);
      if (state === "cooking") {
        showFlash("아직 덜 됐어요!");
        return;
      }
      const updated = [...slots];
      updated[index] = null;
      if (zone === "pan") setPan(updated);
      else setPot(updated);

      if (state === "ruined") {
        playSfx("bad");
        showFlash(zone === "pan" ? "타버렸어요... 버렸습니다" : "넘쳐버렸어요... 버렸습니다");
        setCombo(0);
        return;
      }
      toTray(slot.item);
      playSfx("good");
    },
    [pan, pot, toTray, showFlash]
  );

  // ── 끌어다 놓기 ──
  const startDrag = useCallback(
    (event: React.PointerEvent, item: Item, fromTray: number | null) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging({ item, fromTray, x: event.clientX, y: event.clientY, moved: false });
    },
    []
  );

  const moveDrag = useCallback((event: React.PointerEvent) => {
    setDragging((prev) =>
      prev === null ? null : { ...prev, x: event.clientX, y: event.clientY, moved: true }
    );
  }, []);

  const endDrag = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragging;
      setDragging(null);
      if (drag === null) return;

      // 끌어다 놓은 자리를 화면에서 직접 찾는다. 끌고 다니는 그림은 클릭을 가로채지 않는다.
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const zone = target?.closest("[data-drop]")?.getAttribute("data-drop") as Zone | null;

      if (zone !== null && zone !== undefined) {
        dropOn(zone, drag.item, drag.fromTray);
        return;
      }
      // 톡 누르기만 했다면 알아서 보내준다.
      if (!drag.moved) {
        const allowed = ingredientOf(drag.item.ingredient).allowed.filter(
          (p) => !drag.item.steps.includes(p)
        );
        // 손질할 게 남았으면 다음 과정으로, 다 했으면 접시로.
        if (drag.fromTray === null && allowed.length > 0) {
          const first = allowed[0];
          dropOn(first === "wash" ? "sink" : first === "cut" ? "board" : first === "grill" ? "pan" : "pot", drag.item, null);
        } else {
          dropOn("plate", drag.item, drag.fromTray);
        }
      }
    },
    [dragging, dropOn]
  );

  const ratio = screen === "playing" ? timeLeft / timeFor(dish) : 1;
  const layersDone = stack.length >= dish.layers.length;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-orange-950 via-stone-950 to-black text-white">
      {confetti.length > 0 && <Confetti pieces={confetti} />}

      <Link
        href="/"
        className="fixed left-3 top-3 z-50 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/25"
      >
        ← 홈으로
      </Link>

      {dragging !== null && (
        <span
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 text-5xl drop-shadow-lg"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {itemEmoji(dragging.item)}
        </span>
      )}

      {flash && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-yellow-400 px-5 py-2 text-center text-sm font-bold text-zinc-900 shadow-lg">
          {flash}
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 pb-10 pt-16">
        {screen === "menu" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="mb-4 text-8xl">🍳</div>
            <h1 className="mb-2 text-4xl font-black">음식 만들기</h1>
            <p className="mb-6 text-white/60">씻고 썰고 굽고 끓여서 주문한 요리를 만드세요!</p>

            <div className="mb-6 w-full space-y-2 rounded-2xl bg-white/5 p-5 text-left text-sm text-white/70">
              <p>📋 주문표에 재료마다 <b>어떤 과정</b>이 필요한지 적혀 있어요</p>
              <p>💧 싱크대에서 문질러 씻고 · 🔪 도마에서 칼질해 썰어요</p>
              <p>🍳 프라이팬에 굽고 · 🍲 냄비에 넣어 끓여요</p>
              <p>🧺 손질한 재료는 준비대에 모였다가 접시로 올라가요</p>
              <p>🧂 층을 다 쌓으면 마지막으로 양념을 넣어야 완성!</p>
              <p>⏰ 불에 너무 오래 두면 타거나 넘쳐요</p>
            </div>

            {best > 0 && <p className="mb-5 text-sm text-yellow-300">🏆 최고 기록 {best.toLocaleString()}점</p>}

            <button
              onClick={startGame}
              className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-10 py-4 text-xl font-black shadow-lg transition hover:scale-105 active:scale-95"
            >
              요리 시작! 🍳
            </button>
          </div>
        )}

        {screen === "playing" && (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/60">{round}번째 주문</span>
              <span className="flex gap-3">
                <span className="font-bold text-yellow-300">⭐ {score}</span>
                {combo > 0 && <span className="font-bold text-fuchsia-300">🔥 {combo}연속</span>}
                <span className="text-white/50">{timeLeft.toFixed(1)}초</span>
              </span>
            </div>

            <div className="mb-3 h-3 overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  ratio < 0.3 ? "bg-red-500" : "bg-gradient-to-r from-lime-400 to-yellow-400"
                }`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>

            {/* 주문표 */}
            <div className="mb-3 rounded-2xl bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl">{dish.emoji}</span>
                <span className="font-black">{dish.name}</span>
                <span className="ml-auto text-xs text-white/50">
                  {stack.length}/{dish.layers.length}층
                </span>
              </div>
              <div className="flex flex-col-reverse gap-1">
                {dish.layers.map((layer, i) => {
                  const done = i < stack.length;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                        done ? "bg-emerald-500/25 text-emerald-200" : "bg-black/30 text-white/60"
                      }`}
                    >
                      <ItemChip item={layer} size="text-lg" />
                      <span>{itemName(layer)}</span>
                      <span className="ml-auto text-xs text-white/40">
                        {layer.steps.length === 0
                          ? "그대로"
                          : layer.steps.map((s) => PREP_INFO[s].emoji + PREP_INFO[s].name).join(" → ")}
                      </span>
                      {done && <span className="text-emerald-300">✓</span>}
                    </div>
                  );
                })}
              </div>
              {dish.extras.length > 0 && (
                <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2 text-sm">
                  <span className="text-xs text-white/50">마지막 양념</span>
                  {dish.extras.map((id) => (
                    <span
                      key={id}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        added.includes(id) ? "bg-emerald-500/30 text-emerald-200" : "bg-black/30 text-white/50"
                      }`}
                    >
                      {extraOf(id).emoji} {extraOf(id).name}
                      {added.includes(id) && " ✓"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 접시 */}
            <div
              data-drop="plate"
              className="mb-3 flex min-h-[110px] flex-col-reverse items-center justify-start rounded-2xl border-4 border-dashed border-white/20 bg-white/5 p-2"
            >
              {stack.length === 0 ? (
                <span className="py-7 text-sm text-white/30">🍽️ 손질한 재료를 여기로</span>
              ) : (
                stack.map((item, i) => (
                  <div
                    key={i}
                    className="mb-1 flex w-4/5 items-center justify-center gap-2 rounded-full py-1 text-sm font-bold text-zinc-900"
                    style={{ background: ingredientOf(item.ingredient).color }}
                  >
                    <ItemChip item={item} size="text-xl" />
                    {itemName(item)}
                  </div>
                ))
              )}
            </div>

            {/* 준비대 */}
            <div className="mb-3 rounded-2xl bg-white/5 p-2">
              <p className="mb-1 text-xs text-white/50">🧺 준비대 — 다 손질한 재료 (눌러서 접시에, 끌어서 다음 과정으로)</p>
              <div className="flex min-h-[46px] flex-wrap items-start gap-2">
                {tray.length === 0 && <span className="py-3 text-xs text-white/25">아직 없어요</span>}
                {tray.map((item, i) => (
                  <button
                    key={`${item.ingredient}-${i}`}
                    onPointerDown={(e) => startDrag(e, item, i)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDragging(null)}
                    className="touch-none rounded-xl bg-emerald-500/20 px-3 py-1.5 text-center ring-1 ring-emerald-400/40 transition active:scale-95"
                  >
                    <ItemChip item={item} />
                    <span className="block text-[10px] text-white/70">{itemName(item)}</span>
                  </button>
                ))}
                {tray.length > 0 && (
                  <div
                    data-drop="trash"
                    className="ml-auto flex h-[46px] w-14 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-400/40 bg-rose-500/10 text-center"
                  >
                    <span className="text-lg">🗑️</span>
                    <span className="text-[9px] text-rose-200">버리기</span>
                  </div>
                )}
              </div>
            </div>

            {/* 조리대 */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {/* 싱크대 */}
              <div data-drop="sink" className="rounded-2xl bg-sky-500/10 p-2 ring-1 ring-sky-400/20">
                <p className="mb-1 text-xs text-sky-200">💧 싱크대</p>
                {sink === null ? (
                  <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-xs text-white/30">
                    씻을 재료를 여기로
                  </div>
                ) : (
                  <button
                    onClick={() => workOn("sink")}
                    className="h-16 w-full rounded-xl bg-sky-400/20 transition active:scale-95"
                  >
                    <ItemChip item={sink.item} />
                    <span className="block text-[11px] font-bold text-sky-100">
                      눌러서 씻기 {sink.taps}/{WASH_TAPS}
                    </span>
                  </button>
                )}
              </div>

              {/* 도마 */}
              <div data-drop="board" className="rounded-2xl bg-amber-500/10 p-2 ring-1 ring-amber-400/20">
                <p className="mb-1 text-xs text-amber-200">🔪 도마</p>
                {board === null ? (
                  <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-xs text-white/30">
                    썰 재료를 여기로
                  </div>
                ) : (
                  <button
                    onClick={() => workOn("board")}
                    className="h-16 w-full rounded-xl bg-amber-400/20 transition active:scale-95"
                  >
                    <ItemChip item={board.item} />
                    <span className="block text-[11px] font-bold text-amber-100">
                      눌러서 썰기 {board.taps}/{CHOP_TAPS}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 불 */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["pan", "pot"] as const).map((zone) => {
                const slots = zone === "pan" ? pan : pot;
                const doneAt = zone === "pan" ? GRILL_SECONDS : BOIL_SECONDS;
                return (
                  <div
                    key={zone}
                    data-drop={zone}
                    className="rounded-2xl bg-orange-500/10 p-2 ring-1 ring-orange-400/20"
                  >
                    <p className="mb-1 text-xs text-orange-200">
                      {zone === "pan" ? "🍳 프라이팬" : "🍲 냄비"}
                    </p>
                    <div className="space-y-1.5">
                      {slots.map((slot, i) => {
                        if (slot === null) {
                          return (
                            <div
                              key={i}
                              className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-xs text-white/25"
                            >
                              비어 있음
                            </div>
                          );
                        }
                        const state = heatStateOf(slot, now, zone);
                        const elapsed = (now - slot.startedAt) / 1000;
                        return (
                          <button
                            key={i}
                            onClick={() => takeFromHeat(zone, i)}
                            className={`relative flex h-12 w-full items-center justify-center gap-1 overflow-hidden rounded-xl transition active:scale-95 ${
                              state === "ruined"
                                ? "bg-zinc-800 ring-2 ring-rose-500"
                                : state === "done"
                                  ? "bg-emerald-500/25 ring-2 ring-emerald-400"
                                  : "bg-orange-500/20"
                            }`}
                          >
                            <span className="text-2xl">
                              {state === "ruined" ? "💀" : itemEmoji(slot.item)}
                            </span>
                            <span className="text-[10px] font-bold">
                              {state === "ruined"
                                ? "버리기"
                                : state === "done"
                                  ? "꺼내기!"
                                  : `${Math.max(0, doneAt - elapsed).toFixed(1)}초`}
                            </span>
                            {state === "cooking" && (
                              <span
                                className="absolute bottom-0 left-0 h-1 bg-orange-400"
                                style={{ width: `${Math.min(100, (elapsed / doneAt) * 100)}%` }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 양념 */}
            <div className={`mb-3 rounded-2xl p-2 ${layersDone ? "bg-yellow-400/15 ring-2 ring-yellow-400" : "bg-white/5"}`}>
              <p className="mb-1 text-xs text-white/50">
                🧂 양념 {layersDone ? "— 지금 넣으세요!" : "— 층을 다 쌓은 뒤에"}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {EXTRAS.map((extra) => (
                  <button
                    key={extra.id}
                    onClick={() => addExtra(extra.id)}
                    className={`rounded-xl py-1.5 text-center transition active:scale-95 ${
                      added.includes(extra.id) ? "bg-emerald-500/30" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <span className="block text-xl">{extra.emoji}</span>
                    <span className="text-[9px] text-white/60">{extra.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 재료 선반 */}
            <div className="rounded-2xl bg-white/5 p-2">
              <p className="mb-1 text-xs text-white/50">🧺 재료 선반 — 끌어서 조리대로</p>
              <div className="grid grid-cols-6 gap-1.5">
                {INGREDIENTS.map((ing) => {
                  const item: Item = { ingredient: ing.id, steps: [] };
                  return (
                    <button
                      key={ing.id}
                      onPointerDown={(e) => startDrag(e, item, null)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={() => setDragging(null)}
                      className="touch-none rounded-xl bg-white/10 py-1.5 text-center transition hover:bg-white/20 active:scale-95"
                    >
                      <span className="block text-xl">{ing.emoji}</span>
                      <span className="text-[9px] text-white/60">{ing.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {screen === "gameover" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="mb-4 text-7xl">{score >= best && score > 0 ? "🏆" : "⏰"}</div>
            <p className="mb-1 text-sm text-white/60">시간 끝!</p>
            <p className="mb-2 text-6xl font-black text-yellow-300">{score.toLocaleString()}점</p>
            <p className="mb-6 text-white/60">
              요리 {round - 1}개 완성 · 최고 기록 {best.toLocaleString()}점
            </p>
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-lg font-black transition hover:scale-105 active:scale-95"
              >
                다시 하기 🍳
              </button>
              <button
                onClick={() => {
                  playSfx("click");
                  setScreen("menu");
                  setConfetti([]);
                }}
                className="rounded-full bg-white/15 px-6 py-4 text-lg font-bold transition hover:bg-white/25 active:scale-95"
              >
                처음으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
