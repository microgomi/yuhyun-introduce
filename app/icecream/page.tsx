"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "making" | "serve" | "dayEnd";
type Step = "cone" | "scoop" | "topping" | "sauce" | "done";

interface IceCreamOrder {
  id: number;
  cone: string;
  scoops: string[];
  topping: string;
  sauce: string;
  patience: number;
  maxPatience: number;
  emoji: string;
  name: string;
}

interface MyIceCream {
  cone: string | null;
  scoops: string[];
  topping: string | null;
  sauce: string | null;
}

// --- Constants ---
const CONES = [
  { id: "waffle", name: "와플콘", emoji: "🧇", color: "#D4A373" },
  { id: "sugar", name: "슈가콘", emoji: "🍦", color: "#E8C07D" },
  { id: "cup", name: "컵", emoji: "🥤", color: "#87CEEB" },
  { id: "fish", name: "붕어빵콘", emoji: "🐟", color: "#CD853F" },
];

const FLAVORS = [
  { id: "vanilla", name: "바닐라", emoji: "🤍", color: "#FFF8DC" },
  { id: "choco", name: "초코", emoji: "🤎", color: "#8B4513" },
  { id: "strawberry", name: "딸기", emoji: "🩷", color: "#FFB6C1" },
  { id: "mint", name: "민트초코", emoji: "💚", color: "#98FB98" },
  { id: "mango", name: "망고", emoji: "🧡", color: "#FFD700" },
  { id: "blueberry", name: "블루베리", emoji: "💙", color: "#6A5ACD" },
  { id: "greentea", name: "녹차", emoji: "🍵", color: "#8FBC8F" },
  { id: "cookie", name: "쿠키앤크림", emoji: "🍪", color: "#F5DEB3" },
];

const TOPPINGS = [
  { id: "none", name: "없음", emoji: "❌" },
  { id: "sprinkle", name: "스프링클", emoji: "🌈" },
  { id: "oreo", name: "오레오", emoji: "🍪" },
  { id: "cherry", name: "체리", emoji: "🍒" },
  { id: "almond", name: "아몬드", emoji: "🌰" },
  { id: "gummy", name: "젤리", emoji: "🍬" },
  { id: "wafer", name: "웨하스", emoji: "🧇" },
];

const SAUCES = [
  { id: "none", name: "없음", emoji: "❌" },
  { id: "choco_sauce", name: "초코소스", emoji: "🍫" },
  { id: "strawberry_sauce", name: "딸기소스", emoji: "🍓" },
  { id: "caramel", name: "카라멜", emoji: "🍯" },
  { id: "condensed", name: "연유", emoji: "🥛" },
];

const CUSTOMERS = [
  { name: "아이", emoji: "👧" }, { name: "학생", emoji: "🧑" }, { name: "아저씨", emoji: "👨" },
  { name: "할머니", emoji: "👵" }, { name: "외국인", emoji: "🧑‍🦱" }, { name: "커플", emoji: "👫" },
  { name: "아기", emoji: "👶" }, { name: "선생님", emoji: "👩‍🏫" },
];

let orderId = 0;

function randomOrder(day: number): IceCreamOrder {
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const cone = CONES[Math.floor(Math.random() * CONES.length)].id;
  const scoopCount = 1 + Math.floor(Math.random() * Math.min(3, 1 + Math.floor(day / 3)));
  const scoops: string[] = [];
  for (let i = 0; i < scoopCount; i++) {
    scoops.push(FLAVORS[Math.floor(Math.random() * FLAVORS.length)].id);
  }
  const topping = Math.random() < 0.6 ? TOPPINGS[1 + Math.floor(Math.random() * (TOPPINGS.length - 1))].id : "none";
  const sauce = Math.random() < 0.5 ? SAUCES[1 + Math.floor(Math.random() * (SAUCES.length - 1))].id : "none";
  const patience = Math.max(15, 35 - day * 1.5);

  return {
    id: ++orderId,
    cone, scoops, topping, sauce,
    patience, maxPatience: patience,
    emoji: customer.emoji, name: customer.name,
  };
}

export default function IceCreamPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gold, setGold] = useState(0);
  const [day, setDay] = useState(1);
  const [orders, setOrders] = useState<IceCreamOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<IceCreamOrder | null>(null);
  const [myIceCream, setMyIceCream] = useState<MyIceCream>({ cone: null, scoops: [], topping: null, sauce: null });
  const [step, setStep] = useState<Step>("cone");
  const [served, setServed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [dayEarnings, setDayEarnings] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"good" | "bad" | "info">("info");
  const [bestDay, setBestDay] = useState(0);
  const [totalServed, setTotalServed] = useState(0);
  const [reputation, setReputation] = useState(50);
  const [maxScoops, setMaxScoops] = useState(2);
  const [timerActive, setTimerActive] = useState(false);

  const showMsg = useCallback((text: string, type: "good" | "bad" | "info") => {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(""), 2500);
  }, []);

  // Start day
  const startDay = useCallback(() => {
    const orderCount = 3 + Math.floor(day / 2);
    const newOrders: IceCreamOrder[] = [];
    orderId = 0;
    for (let i = 0; i < orderCount; i++) {
      newOrders.push(randomOrder(day));
    }
    setOrders(newOrders);
    setSelectedOrder(null);
    setMyIceCream({ cone: null, scoops: [], topping: null, sauce: null });
    setStep("cone");
    setServed(0);
    setFailed(0);
    setDayEarnings(0);
    setPerfectCount(0);
    setMessage("");
    setScreen("making");
  }, [day]);

  // Select order to make
  const selectOrder = (order: IceCreamOrder) => {
    setSelectedOrder(order);
    setMyIceCream({ cone: null, scoops: [], topping: null, sauce: null });
    setStep("cone");
  };

  // Pick cone
  const pickCone = (coneId: string) => {
    setMyIceCream((prev) => ({ ...prev, cone: coneId }));
    setStep("scoop");
  };

  // Pick scoop
  const pickScoop = (flavorId: string) => {
    setMyIceCream((prev) => {
      if (prev.scoops.length >= maxScoops) return prev;
      return { ...prev, scoops: [...prev.scoops, flavorId] };
    });
  };

  const finishScoops = () => {
    if (myIceCream.scoops.length === 0) {
      showMsg("🍨 맛을 하나 이상 골라주세요!", "bad");
      return;
    }
    setStep("topping");
  };

  // Pick topping
  const pickTopping = (toppingId: string) => {
    setMyIceCream((prev) => ({ ...prev, topping: toppingId }));
    setStep("sauce");
  };

  // Pick sauce
  const pickSauce = (sauceId: string) => {
    setMyIceCream((prev) => ({ ...prev, sauce: sauceId }));
    setStep("done");
  };

  // Serve
  const serveIceCream = () => {
    if (!selectedOrder) return;
    const order = selectedOrder;
    const mine = myIceCream;

    let score = 0;
    let total = 0;

    // Check cone
    total++;
    if (mine.cone === order.cone) score++;

    // Check scoops
    const orderScoops = [...order.scoops];
    const mineScoops = [...mine.scoops];
    total += orderScoops.length;

    for (const os of orderScoops) {
      const idx = mineScoops.indexOf(os);
      if (idx >= 0) {
        score++;
        mineScoops.splice(idx, 1);
      }
    }

    // Penalty for extra scoops
    if (mineScoops.length > 0) score -= mineScoops.length * 0.5;

    // Check topping
    total++;
    if (mine.topping === order.topping) score++;

    // Check sauce
    total++;
    if (mine.sauce === order.sauce) score++;

    const accuracy = Math.max(0, score / total);
    const isPerfect = accuracy >= 1.0;
    const basePrice = 20 + order.scoops.length * 15 + (order.topping !== "none" ? 10 : 0) + (order.sauce !== "none" ? 5 : 0);
    const earned = Math.floor(basePrice * accuracy * (isPerfect ? 1.5 : 1));

    if (isPerfect) {
      showMsg(`✨ 완벽! +${earned}💰`, "good");
      setPerfectCount((p) => p + 1);
      setReputation((r) => Math.min(100, r + 3));
    } else if (accuracy >= 0.7) {
      showMsg(`👍 괜찮아요! +${earned}💰 (${Math.floor(accuracy * 100)}%)`, "info");
      setReputation((r) => Math.min(100, r + 1));
    } else {
      showMsg(`😅 좀 달라요... +${earned}💰 (${Math.floor(accuracy * 100)}%)`, "bad");
      setReputation((r) => Math.max(0, r - 2));
    }

    setGold((g) => g + earned);
    setDayEarnings((e) => e + earned);
    setServed((s) => s + 1);
    setTotalServed((t) => t + 1);

    // Remove order
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setSelectedOrder(null);
    setMyIceCream({ cone: null, scoops: [], topping: null, sauce: null });
    setStep("cone");

    // Check day end
    setTimeout(() => {
      setOrders((prev) => {
        if (prev.length === 0) {
          if (dayEarnings + earned > bestDay) setBestDay(dayEarnings + earned);
          setScreen("dayEnd");
        }
        return prev;
      });
    }, 500);
  };

  // Skip/trash
  const trashIceCream = () => {
    setMyIceCream({ cone: null, scoops: [], topping: null, sauce: null });
    setStep("cone");
    showMsg("🗑️ 다시 만들어요!", "info");
  };

  // Skip order
  const skipOrder = () => {
    if (!selectedOrder) return;
    setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
    setSelectedOrder(null);
    setFailed((f) => f + 1);
    setReputation((r) => Math.max(0, r - 5));
    showMsg("😢 손님이 떠났어요...", "bad");
    setMyIceCream({ cone: null, scoops: [], topping: null, sauce: null });
    setStep("cone");

    setTimeout(() => {
      setOrders((prev) => {
        if (prev.length === 0) setScreen("dayEnd");
        return prev;
      });
    }, 500);
  };

  const buyScoopUpgrade = () => {
    const cost = maxScoops * 100;
    if (gold < cost || maxScoops >= 5) return;
    setGold((g) => g - cost);
    setMaxScoops((s) => s + 1);
  };

  // Ice cream preview
  const IceCreamPreview = ({ cone, scoops, topping, sauce, size = "big" }: {
    cone: string | null; scoops: string[]; topping: string | null; sauce: string | null; size?: "big" | "small";
  }) => {
    const s = size === "big" ? 1 : 0.6;
    const coneData = CONES.find((c) => c.id === cone);
    return (
      <div className="flex flex-col items-center" style={{ transform: `scale(${s})` }}>
        {/* Topping */}
        {topping && topping !== "none" && (
          <div className="text-2xl -mb-2 z-10">{TOPPINGS.find((t) => t.id === topping)?.emoji}</div>
        )}
        {/* Sauce drizzle */}
        {sauce && sauce !== "none" && (
          <div className="text-xs -mb-1 z-10">{SAUCES.find((s) => s.id === sauce)?.emoji}{SAUCES.find((s) => s.id === sauce)?.emoji}{SAUCES.find((s) => s.id === sauce)?.emoji}</div>
        )}
        {/* Scoops */}
        {[...scoops].reverse().map((flavorId, i) => {
          const flavor = FLAVORS.find((f) => f.id === flavorId);
          return (
            <div key={i} className="relative -mb-3 z-[5]">
              <div className="h-10 w-14 rounded-full border-2 border-white/20" style={{ backgroundColor: flavor?.color ?? "#ddd" }} />
            </div>
          );
        })}
        {/* Cone */}
        {cone && (
          <div className="text-4xl -mt-1">{coneData?.emoji ?? "🍦"}</div>
        )}
        {!cone && scoops.length === 0 && (
          <div className="text-4xl opacity-20">🍦</div>
        )}
      </div>
    );
  };

  // Order card
  const OrderRecipe = ({ order, small = false }: { order: IceCreamOrder; small?: boolean }) => (
    <div className="flex items-center gap-1 text-xs flex-wrap">
      <span>{CONES.find((c) => c.id === order.cone)?.emoji}</span>
      <span>+</span>
      {order.scoops.map((s, i) => (
        <span key={i}>{FLAVORS.find((f) => f.id === s)?.emoji}</span>
      ))}
      {order.topping !== "none" && <><span>+</span><span>{TOPPINGS.find((t) => t.id === order.topping)?.emoji}</span></>}
      {order.sauce !== "none" && <><span>+</span><span>{SAUCES.find((s) => s.id === order.sauce)?.emoji}</span></>}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-pink-950 via-fuchsia-950 to-slate-950 text-white">
      {/* Menu */}
      {screen === "menu" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
          <Link href="/" className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20">← 홈</Link>
          <div className="text-7xl">🍦</div>
          <h1 className="text-5xl font-black">
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">아이스크림 가게</span>
          </h1>
          <p className="text-lg text-slate-400">주문에 맞게 아이스크림을 만들자!</p>

          <button onClick={startDay} className="mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-12 py-4 text-xl font-black shadow-lg transition-transform hover:scale-105 active:scale-95">
            🍨 Day {day} 시작!
          </button>

          <div className="rounded-xl bg-white/5 px-6 py-3 space-y-1 backdrop-blur">
            <p className="text-sm text-slate-400">💰 골드: <span className="font-bold text-yellow-400">{gold}</span></p>
            <p className="text-sm text-slate-400">📅 Day: <span className="font-bold text-pink-400">{day}</span></p>
            <p className="text-sm text-slate-400">⭐ 평판: <span className="font-bold text-amber-400">{reputation}/100</span></p>
            <p className="text-sm text-slate-400">🍨 총 서빙: <span className="font-bold text-cyan-400">{totalServed}</span></p>
            <p className="text-sm text-slate-400">🍨 최대 스쿱: <span className="font-bold text-green-400">{maxScoops}개</span></p>
          </div>

          {maxScoops < 5 && (
            <button onClick={buyScoopUpgrade} disabled={gold < maxScoops * 100}
              className={`w-full max-w-xs rounded-xl border-2 p-3 text-sm font-bold transition-all ${
                gold >= maxScoops * 100 ? "border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 active:scale-95"
                : "border-gray-700 bg-gray-900/50 opacity-40 cursor-not-allowed"
              }`}>
              🍨 스쿱 +1 업그레이드 ({maxScoops * 100}💰) → 최대 {maxScoops + 1}개
            </button>
          )}

          <div className="w-full max-w-sm rounded-xl bg-white/5 p-4 text-left text-sm text-slate-400 space-y-1">
            <p className="font-bold text-pink-400">📖 만드는 법</p>
            <p>1. 주문을 선택하세요</p>
            <p>2. 콘 → 맛 → 토핑 → 소스 순서로 선택!</p>
            <p>3. 주문과 똑같이 만들면 높은 점수!</p>
          </div>
        </div>
      )}

      {/* Making */}
      {screen === "making" && (
        <div className="flex min-h-screen flex-col items-center px-3 pt-3">
          {/* HUD */}
          <div className="mb-2 flex w-full max-w-md items-center justify-between text-xs">
            <span className="rounded-lg bg-white/10 px-2 py-1">📅 Day {day}</span>
            <span className="rounded-lg bg-white/10 px-2 py-1">💰 {dayEarnings}</span>
            <span className="rounded-lg bg-white/10 px-2 py-1">✅ {served}/{served + orders.length}</span>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-2 w-full max-w-md rounded-lg px-4 py-2 text-center text-sm font-bold ${
              msgType === "good" ? "bg-green-500/20 text-green-300" :
              msgType === "bad" ? "bg-red-500/20 text-red-300" :
              "bg-white/10 text-white"
            }`}>{message}</div>
          )}

          {/* Orders list */}
          {!selectedOrder && (
            <div className="mb-4 w-full max-w-md">
              <p className="mb-2 text-sm font-bold text-pink-400">📋 주문 목록 (클릭해서 만들기!)</p>
              <div className="space-y-2">
                {orders.map((order) => (
                  <button key={order.id} onClick={() => selectOrder(order)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-white/10 bg-white/5 p-3 text-left transition-all hover:border-pink-500/50 hover:bg-pink-500/10 active:scale-[0.98]">
                    <span className="text-3xl">{order.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{order.name}</p>
                      <OrderRecipe order={order} />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {CONES.find((c) => c.id === order.cone)?.name} + {order.scoops.map((s) => FLAVORS.find((f) => f.id === s)?.name).join("/")}
                        {order.topping !== "none" ? ` + ${TOPPINGS.find((t) => t.id === order.topping)?.name}` : ""}
                        {order.sauce !== "none" ? ` + ${SAUCES.find((s) => s.id === order.sauce)?.name}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {orders.length === 0 && (
                <div className="rounded-xl bg-white/5 p-8 text-center text-slate-500">
                  모든 주문 완료!
                </div>
              )}
            </div>
          )}

          {/* Making area */}
          {selectedOrder && (
            <>
              {/* Current order */}
              <div className="mb-3 w-full max-w-md rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedOrder.emoji}</span>
                    <div>
                      <p className="text-sm font-bold">{selectedOrder.name}의 주문</p>
                      <OrderRecipe order={selectedOrder} />
                    </div>
                  </div>
                  <button onClick={skipOrder} className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 active:scale-90">건너뛰기</button>
                </div>
              </div>

              {/* Preview */}
              <div className="mb-4 flex items-end justify-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">주문</p>
                  <IceCreamPreview cone={selectedOrder.cone} scoops={selectedOrder.scoops} topping={selectedOrder.topping} sauce={selectedOrder.sauce} size="small" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-pink-400 mb-2 font-bold">내가 만드는 중</p>
                  <IceCreamPreview cone={myIceCream.cone} scoops={myIceCream.scoops} topping={myIceCream.topping} sauce={myIceCream.sauce} size="big" />
                </div>
              </div>

              {/* Step indicator */}
              <div className="mb-3 flex gap-1">
                {(["cone", "scoop", "topping", "sauce", "done"] as Step[]).map((s) => (
                  <div key={s} className={`rounded-full px-3 py-1 text-xs font-bold ${
                    step === s ? "bg-pink-500 text-white" : "bg-white/10 text-slate-500"
                  }`}>
                    {s === "cone" ? "🧇콘" : s === "scoop" ? "🍨맛" : s === "topping" ? "🌈토핑" : s === "sauce" ? "🍫소스" : "✅완성"}
                  </div>
                ))}
              </div>

              {/* Selection area */}
              <div className="w-full max-w-md">
                {step === "cone" && (
                  <>
                    <p className="mb-2 text-sm font-bold text-pink-400">🧇 콘 선택</p>
                    <div className="grid grid-cols-4 gap-2">
                      {CONES.map((cone) => (
                        <button key={cone.id} onClick={() => pickCone(cone.id)}
                          className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all hover:scale-105 active:scale-90 ${
                            selectedOrder.cone === cone.id ? "border-green-400 bg-green-500/10" : "border-white/10 bg-white/5"
                          }`}>
                          <span className="text-3xl">{cone.emoji}</span>
                          <span className="text-xs font-bold mt-1">{cone.name}</span>
                          {selectedOrder.cone === cone.id && <span className="text-[10px] text-green-400">주문!</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === "scoop" && (
                  <>
                    <p className="mb-1 text-sm font-bold text-pink-400">🍨 맛 선택 ({myIceCream.scoops.length}/{maxScoops})</p>
                    <p className="mb-2 text-xs text-slate-500">주문: {selectedOrder.scoops.map((s) => FLAVORS.find((f) => f.id === s)?.emoji).join(" ")}</p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {FLAVORS.map((flavor) => {
                        const neededCount = selectedOrder.scoops.filter((s) => s === flavor.id).length;
                        return (
                          <button key={flavor.id} onClick={() => pickScoop(flavor.id)}
                            disabled={myIceCream.scoops.length >= maxScoops}
                            className={`flex flex-col items-center rounded-xl border-2 p-2 transition-all hover:scale-105 active:scale-90 ${
                              neededCount > 0 ? "border-green-400/50 bg-green-500/10" : "border-white/10 bg-white/5"
                            } ${myIceCream.scoops.length >= maxScoops ? "opacity-40" : ""}`}>
                            <div className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: flavor.color }} />
                            <span className="text-[10px] font-bold mt-1">{flavor.name}</span>
                            {neededCount > 0 && <span className="text-[10px] text-green-400">x{neededCount}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={finishScoops}
                        className="flex-1 rounded-xl bg-pink-600 py-3 font-bold active:scale-95">
                        다음 →
                      </button>
                      {myIceCream.scoops.length > 0 && (
                        <button onClick={() => setMyIceCream((p) => ({ ...p, scoops: p.scoops.slice(0, -1) }))}
                          className="rounded-xl bg-yellow-600/30 px-4 py-3 text-sm font-bold text-yellow-400 active:scale-90">
                          ↩️ 되돌리기
                        </button>
                      )}
                    </div>
                  </>
                )}

                {step === "topping" && (
                  <>
                    <p className="mb-1 text-sm font-bold text-pink-400">🌈 토핑 선택</p>
                    <p className="mb-2 text-xs text-slate-500">주문: {selectedOrder.topping === "none" ? "없음" : TOPPINGS.find((t) => t.id === selectedOrder.topping)?.emoji}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {TOPPINGS.map((topping) => (
                        <button key={topping.id} onClick={() => pickTopping(topping.id)}
                          className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all hover:scale-105 active:scale-90 ${
                            selectedOrder.topping === topping.id ? "border-green-400 bg-green-500/10" : "border-white/10 bg-white/5"
                          }`}>
                          <span className="text-2xl">{topping.emoji}</span>
                          <span className="text-[10px] font-bold mt-1">{topping.name}</span>
                          {selectedOrder.topping === topping.id && <span className="text-[10px] text-green-400">주문!</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === "sauce" && (
                  <>
                    <p className="mb-1 text-sm font-bold text-pink-400">🍫 소스 선택</p>
                    <p className="mb-2 text-xs text-slate-500">주문: {selectedOrder.sauce === "none" ? "없음" : SAUCES.find((s) => s.id === selectedOrder.sauce)?.emoji}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {SAUCES.map((sauce) => (
                        <button key={sauce.id} onClick={() => pickSauce(sauce.id)}
                          className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all hover:scale-105 active:scale-90 ${
                            selectedOrder.sauce === sauce.id ? "border-green-400 bg-green-500/10" : "border-white/10 bg-white/5"
                          }`}>
                          <span className="text-2xl">{sauce.emoji}</span>
                          <span className="text-[10px] font-bold mt-1">{sauce.name}</span>
                          {selectedOrder.sauce === sauce.id && <span className="text-[10px] text-green-400">주문!</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === "done" && (
                  <div className="text-center space-y-3">
                    <p className="text-lg font-bold text-pink-400">🍦 완성!</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={serveIceCream}
                        className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-10 py-4 text-lg font-black transition-transform hover:scale-105 active:scale-90">
                        🍨 서빙하기!
                      </button>
                      <button onClick={trashIceCream}
                        className="rounded-xl bg-red-500/20 px-6 py-4 font-bold text-red-400 active:scale-90">
                        🗑️ 다시
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Day End */}
      {screen === "dayEnd" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-7xl">🌙</div>
          <h2 className="text-3xl font-black text-pink-400">Day {day} 종료!</h2>

          <div className="rounded-xl bg-white/5 px-8 py-4 space-y-2">
            <p>🍨 서빙: <span className="font-bold text-green-400">{served}개</span></p>
            <p>❌ 건너뛰기: <span className="font-bold text-red-400">{failed}개</span></p>
            <p>✨ 완벽: <span className="font-bold text-amber-400">{perfectCount}개</span></p>
            <p>💰 수입: <span className="font-bold text-yellow-400">{dayEarnings}골드</span></p>
            <p>⭐ 평판: <span className="font-bold text-amber-400">{reputation}/100</span></p>
          </div>

          <button onClick={() => { setDay((d) => d + 1); setScreen("menu"); }}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-10 py-4 text-xl font-black transition-transform hover:scale-105 active:scale-95">
            ☀️ 다음 날
          </button>
        </div>
      )}
    </div>
  );
}
