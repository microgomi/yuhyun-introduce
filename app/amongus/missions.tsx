"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ════════════════════════════════════════════
   어몽어스 미션 미니게임 모음
   ════════════════════════════════════════════ */

interface MissionProps {
  onComplete: () => void;
  onCancel: () => void;
}

/* ────── 유틸 ────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════
   1. 전선 연결하기 (Wire Fix)
   ══════════════════════════════════════ */
const WIRE_COLORS = [
  { color: "#ef4444", glow: "#fca5a5" },
  { color: "#3b82f6", glow: "#93c5fd" },
  { color: "#eab308", glow: "#fde047" },
  { color: "#22c55e", glow: "#86efac" },
];

function WireMission({ onComplete, onCancel }: MissionProps) {
  const [rightOrder] = useState(() => shuffle([0, 1, 2, 3]));
  const [connected, setConnected] = useState<boolean[]>([false, false, false, false]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected.every(Boolean)) {
      setTimeout(onComplete, 500);
    }
  }, [connected, onComplete]);

  const getLeftY = (i: number) => 60 + i * 70;
  const getRightY = (i: number) => 60 + i * 70;

  const handlePointerDown = (i: number, e: React.PointerEvent) => {
    if (connected[i]) return;
    setDragging(i);
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging === null || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 오른쪽 단자 중 같은 색 찾기
    const rightIdx = rightOrder.indexOf(dragging);
    const targetY = getRightY(rightIdx);
    if (mx > 240 && Math.abs(my - targetY) < 30) {
      setConnected(prev => { const n = [...prev]; n[dragging] = true; return n; });
    }
    setDragging(null);
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">⚡ 배선 수리</h3>
      <p className="text-xs text-gray-400 mb-3">왼쪽 전선을 같은 색 오른쪽에 연결하세요</p>
      <div
        ref={boardRef}
        className="relative w-[300px] h-[340px] bg-slate-700 rounded-2xl border-2 border-slate-500 overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        {/* 왼쪽 패널 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-800 border-r-2 border-slate-600" />
        {/* 오른쪽 패널 */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-slate-800 border-l-2 border-slate-600" />

        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
          {/* 연결된 선 */}
          {[0, 1, 2, 3].map(i => {
            if (!connected[i]) return null;
            const rightIdx = rightOrder.indexOf(i);
            return (
              <g key={`conn-${i}`}>
                <line x1={45} y1={getLeftY(i)} x2={255} y2={getRightY(rightIdx)}
                  stroke={WIRE_COLORS[i].glow} strokeWidth={12} strokeLinecap="round" opacity={0.4} />
                <line x1={45} y1={getLeftY(i)} x2={255} y2={getRightY(rightIdx)}
                  stroke={WIRE_COLORS[i].color} strokeWidth={7} strokeLinecap="round" />
              </g>
            );
          })}
          {/* 드래그 중인 선 */}
          {dragging !== null && (
            <g>
              <line x1={45} y1={getLeftY(dragging)} x2={mousePos.x} y2={mousePos.y}
                stroke={WIRE_COLORS[dragging].glow} strokeWidth={12} strokeLinecap="round" opacity={0.4} />
              <line x1={45} y1={getLeftY(dragging)} x2={mousePos.x} y2={mousePos.y}
                stroke={WIRE_COLORS[dragging].color} strokeWidth={7} strokeLinecap="round" strokeDasharray="10 5" />
            </g>
          )}
        </svg>

        {/* 왼쪽 단자 (순서대로) */}
        {[0, 1, 2, 3].map(i => (
          <div key={`L${i}`} className="absolute flex items-center" style={{ left: 8, top: getLeftY(i) - 16, zIndex: 10 }}
            onPointerDown={(e) => handlePointerDown(i, e)}>
            <div className="w-8 h-8 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform"
              style={{
                backgroundColor: WIRE_COLORS[i].color,
                borderColor: connected[i] ? WIRE_COLORS[i].glow : "#475569",
                boxShadow: connected[i] ? `0 0 12px ${WIRE_COLORS[i].glow}` : `0 0 5px ${WIRE_COLORS[i].color}60`,
              }} />
            <div className="h-[6px] w-5 -ml-1" style={{ backgroundColor: WIRE_COLORS[i].color }} />
          </div>
        ))}

        {/* 오른쪽 단자 (셔플된 순서) */}
        {rightOrder.map((colorIdx, posIdx) => (
          <div key={`R${posIdx}`} className="absolute flex items-center" style={{ left: 248, top: getRightY(posIdx) - 16, zIndex: 10 }}>
            <div className="h-[6px] w-5 -mr-1" style={{ backgroundColor: WIRE_COLORS[colorIdx].color }} />
            <div className="w-8 h-8 rounded-full border-2"
              style={{
                backgroundColor: WIRE_COLORS[colorIdx].color,
                borderColor: connected[colorIdx] ? WIRE_COLORS[colorIdx].glow : "#475569",
                boxShadow: connected[colorIdx] ? `0 0 12px ${WIRE_COLORS[colorIdx].glow}` : `0 0 5px ${WIRE_COLORS[colorIdx].color}60`,
              }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   2. 카드 긁기 (Card Swipe)
   ══════════════════════════════════════ */
function CardSwipeMission({ onComplete, onCancel }: MissionProps) {
  const [phase, setPhase] = useState<"ready" | "swiping" | "success" | "fail">("ready");
  const [cardX, setCardX] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [message, setMessage] = useState("카드를 오른쪽으로 긁어주세요");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDown = (e: React.PointerEvent) => {
    if (phase === "success") return;
    setIsDragging(true);
    setStartX(e.clientX);
    setStartTime(Date.now());
    setPhase("swiping");
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = Math.max(30, Math.min(rect.width - 100, e.clientX - rect.left - 40));
    setCardX(newX);
  };

  const handleUp = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    const rect = containerRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const elapsed = Date.now() - startTime;
    const distance = endX - startX;

    if (distance < rect.width * 0.5) {
      setMessage("더 멀리 긁어주세요!");
      setPhase("fail");
      setCardX(30);
    } else if (elapsed < 200) {
      setMessage("너무 빨라요! 천천히 긁으세요");
      setPhase("fail");
      setCardX(30);
    } else if (elapsed > 1500) {
      setMessage("너무 느려요! 좀 더 빠르게!");
      setPhase("fail");
      setCardX(30);
    } else {
      setMessage("인증 완료!");
      setPhase("success");
      setTimeout(onComplete, 800);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">💳 카드 긁기</h3>
      <p className="text-xs text-gray-400 mb-3">너무 빠르지도, 느리지도 않게!</p>

      <div ref={containerRef}
        className="relative w-[300px] h-[200px] bg-gradient-to-b from-slate-600 to-slate-700 rounded-2xl border-2 border-slate-500 overflow-hidden"
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        style={{ touchAction: "none" }}>

        {/* 카드 리더기 슬롯 */}
        <div className="absolute top-[70px] left-[20px] right-[20px] h-[60px] bg-slate-800 rounded-lg border border-slate-600">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500/30 rounded-t" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/30 rounded-b" />
          {/* 화살표 가이드 */}
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs pointer-events-none">
            → → → → →
          </div>
        </div>

        {/* 카드 */}
        <div className="absolute top-[58px] h-[84px] w-[90px] cursor-grab active:cursor-grabbing"
          style={{ left: cardX, zIndex: 10 }}
          onPointerDown={handleDown}>
          <div className={`w-full h-full rounded-lg border-2 shadow-lg transition-colors ${
            phase === "success" ? "bg-green-500 border-green-400" :
            phase === "fail" ? "bg-red-500 border-red-400" :
            "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400"
          }`}>
            <div className="p-2">
              <div className="w-10 h-7 bg-yellow-400 rounded-sm mb-1" />
              <div className="text-[7px] text-white/80 font-mono">AMONG US</div>
              <div className="text-[6px] text-white/60">**** **** 1234</div>
            </div>
            {/* 마그네틱 띠 */}
            <div className="absolute right-0 top-2 bottom-2 w-2 bg-black/60 rounded-r" />
          </div>
        </div>

        {/* LED */}
        <div className={`absolute top-4 right-8 w-3 h-3 rounded-full ${
          phase === "success" ? "bg-green-400 shadow-green-400/50 shadow-lg" :
          phase === "fail" ? "bg-red-400 shadow-red-400/50 shadow-lg animate-pulse" :
          "bg-yellow-400/50"
        }`} />
      </div>

      <p className={`mt-3 text-sm font-bold ${
        phase === "success" ? "text-green-400" :
        phase === "fail" ? "text-red-400" :
        "text-gray-300"
      }`}>{message}</p>
    </div>
  );
}

/* ══════════════════════════════════════
   3. 소행성 파괴 (Asteroids)
   ══════════════════════════════════════ */
function AsteroidMission({ onComplete, onCancel }: MissionProps) {
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number; size: number; speed: number }[]>([]);
  const [destroyed, setDestroyed] = useState(0);
  const [total] = useState(10);
  const idRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  // 소행성 생성
  useEffect(() => {
    const interval = setInterval(() => {
      setAsteroids(prev => {
        if (prev.length > 8) return prev;
        const id = idRef.current++;
        return [...prev, {
          id,
          x: Math.random() * 260 + 20,
          y: -20,
          size: 20 + Math.random() * 20,
          speed: 1 + Math.random() * 2,
        }];
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // 소행성 이동
  useEffect(() => {
    const interval = setInterval(() => {
      setAsteroids(prev =>
        prev.map(a => ({ ...a, y: a.y + a.speed })).filter(a => a.y < 400)
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (destroyed >= total) {
      setTimeout(onComplete, 500);
    }
  }, [destroyed, total, onComplete]);

  const shootAsteroid = (id: number) => {
    setAsteroids(prev => prev.filter(a => a.id !== id));
    setDestroyed(d => d + 1);
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">☄️ 소행성 파괴</h3>
      <p className="text-xs text-gray-400 mb-1">소행성을 클릭해서 파괴하세요! ({destroyed}/{total})</p>
      <div className="w-[300px] h-2 bg-slate-700 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
          style={{ width: `${(destroyed / total) * 100}%` }} />
      </div>

      <div ref={boardRef}
        className="relative w-[300px] h-[350px] bg-gradient-to-b from-gray-950 via-indigo-950 to-gray-950 rounded-2xl border-2 border-slate-600 overflow-hidden">
        {/* 별 */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={`star-${i}`} className="absolute w-[2px] h-[2px] bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.7,
            }} />
        ))}

        {/* 조준선 */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-green-500/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-green-500/20" />
        </div>

        {/* 소행성 */}
        {asteroids.map(a => (
          <button key={a.id}
            className="absolute cursor-crosshair hover:brightness-150 active:scale-50 transition-all"
            style={{
              left: a.x - a.size / 2,
              top: a.y - a.size / 2,
              width: a.size,
              height: a.size,
              zIndex: 10,
            }}
            onClick={() => shootAsteroid(a.id)}>
            <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-500 to-stone-700 border border-stone-400/50 shadow-lg"
              style={{ boxShadow: `0 0 ${a.size / 2}px rgba(200,150,100,0.3)` }}>
              {/* 크레이터 */}
              <div className="absolute top-[20%] left-[30%] w-[25%] h-[25%] rounded-full bg-stone-600/80" />
              <div className="absolute top-[50%] left-[15%] w-[15%] h-[15%] rounded-full bg-stone-600/80" />
              <div className="absolute top-[35%] left-[60%] w-[20%] h-[20%] rounded-full bg-stone-600/80" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   4. 다운로드 / 업로드 (Download)
   ══════════════════════════════════════ */
function DownloadMission({ onComplete, onCancel }: MissionProps) {
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started || done) return;
    if (progress >= 100) {
      setDone(true);
      setTimeout(onComplete, 600);
      return;
    }
    const t = setTimeout(() => setProgress(p => Math.min(100, p + 1 + Math.random() * 2)), 80);
    return () => clearTimeout(t);
  }, [started, done, progress, onComplete]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">📥 데이터 다운로드</h3>
      <p className="text-xs text-gray-400 mb-3">버튼을 눌러 다운로드를 시작하세요</p>

      <div className="w-[300px] h-[280px] bg-slate-800 rounded-2xl border-2 border-slate-600 p-6 flex flex-col items-center justify-center">
        {/* 화면 */}
        <div className="w-full bg-black rounded-xl p-4 mb-4 border border-slate-600">
          <div className="text-center mb-3">
            <span className="text-5xl">{done ? "✅" : "📁"}</span>
          </div>
          <div className="text-xs text-gray-400 text-center mb-2">
            {!started ? "대기 중..." : done ? "다운로드 완료!" : `다운로드 중... ${Math.floor(progress)}%`}
          </div>
          {/* 진행 바 */}
          <div className="w-full h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div className={`h-full rounded-full transition-all duration-100 ${done ? "bg-green-500" : "bg-gradient-to-r from-blue-600 to-cyan-400"}`}
              style={{ width: `${progress}%` }}>
              {started && !done && (
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              )}
            </div>
          </div>
          {started && !done && (
            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
              <span>ETA: {Math.ceil((100 - progress) * 0.08)}초</span>
              <span>{(progress * 0.37).toFixed(1)}MB / 37.0MB</span>
            </div>
          )}
        </div>

        {!started && (
          <button onClick={() => setStarted(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all hover:scale-105 active:scale-95">
            📥 다운로드 시작
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   5. 연료 넣기 (Fuel)
   ══════════════════════════════════════ */
function FuelMission({ onComplete, onCancel }: MissionProps) {
  const [fuel, setFuel] = useState(0);
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    if (!filling) return;
    if (fuel >= 100) {
      setTimeout(onComplete, 400);
      return;
    }
    const t = setTimeout(() => setFuel(f => Math.min(100, f + 1.5)), 40);
    return () => clearTimeout(t);
  }, [filling, fuel, onComplete]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">⛽ 연료 넣기</h3>
      <p className="text-xs text-gray-400 mb-3">버튼을 꾹 누르고 있으세요!</p>

      <div className="w-[300px] h-[320px] bg-slate-800 rounded-2xl border-2 border-slate-600 p-4 flex flex-col items-center justify-between">
        {/* 연료 탱크 */}
        <div className="relative w-24 h-48 bg-slate-900 rounded-xl border-2 border-slate-500 overflow-hidden">
          {/* 눈금 */}
          {[25, 50, 75].map(v => (
            <div key={v} className="absolute left-0 right-0 border-t border-slate-600 flex items-center"
              style={{ bottom: `${v}%` }}>
              <span className="text-[8px] text-slate-500 ml-1">{v}%</span>
            </div>
          ))}
          {/* 연료 */}
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-100"
            style={{ height: `${fuel}%` }}>
            <div className="w-full h-full bg-gradient-to-t from-yellow-600 to-yellow-400">
              {filling && (
                <div className="w-full h-full bg-gradient-to-t from-transparent via-yellow-300/30 to-transparent animate-pulse" />
              )}
            </div>
            {/* 물결 효과 */}
            {filling && fuel < 100 && (
              <div className="absolute top-0 left-0 right-0 h-3 bg-yellow-300/40 rounded-b-full animate-bounce" style={{ animationDuration: "0.3s" }} />
            )}
          </div>
          {/* 퍼센트 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-white drop-shadow-lg">{Math.floor(fuel)}%</span>
          </div>
        </div>

        {/* 호스 */}
        {filling && (
          <div className="w-2 h-8 bg-gradient-to-b from-gray-500 to-yellow-500 rounded-full animate-pulse" />
        )}

        {/* 버튼 */}
        <button
          onPointerDown={() => setFilling(true)}
          onPointerUp={() => setFilling(false)}
          onPointerLeave={() => setFilling(false)}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            filling
              ? "bg-yellow-500 text-black scale-95 shadow-yellow-500/50 shadow-lg"
              : fuel >= 100
                ? "bg-green-500 text-white"
                : "bg-yellow-600 hover:bg-yellow-500 text-white hover:scale-105"
          }`}
          style={{ touchAction: "none" }}>
          {fuel >= 100 ? "✅ 연료 가득!" : filling ? "⛽ 주입 중..." : "⛽ 꾹 눌러서 연료 넣기"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   6. 매니폴드 열기 (Press 1~10 in order)
   ══════════════════════════════════════ */
function ManifoldMission({ onComplete, onCancel }: MissionProps) {
  const [positions] = useState(() => {
    const pos: { num: number; x: number; y: number }[] = [];
    for (let i = 1; i <= 10; i++) {
      pos.push({ num: i, x: 20 + Math.random() * 220, y: 20 + Math.random() * 240 });
    }
    return pos;
  });
  const [nextNum, setNextNum] = useState(1);
  const [pressed, setPressed] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (nextNum > 10) setTimeout(onComplete, 500);
  }, [nextNum, onComplete]);

  const handlePress = (num: number) => {
    if (num === nextNum) {
      setPressed(p => [...p, num]);
      setNextNum(n => n + 1);
      setWrong(false);
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 300);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">🔢 매니폴드 열기</h3>
      <p className="text-xs text-gray-400 mb-3">1부터 10까지 순서대로 누르세요!</p>

      <div className={`relative w-[300px] h-[300px] bg-slate-800 rounded-2xl border-2 transition-colors ${
        wrong ? "border-red-500 bg-red-900/20" : "border-slate-600"
      }`}>
        {positions.map(p => {
          const isDone = pressed.includes(p.num);
          const isNext = p.num === nextNum;
          return (
            <button key={p.num}
              className={`absolute w-12 h-12 rounded-xl font-black text-lg transition-all ${
                isDone
                  ? "bg-green-600 text-green-200 scale-90 opacity-60"
                  : isNext
                    ? "bg-blue-500 text-white shadow-blue-500/50 shadow-lg hover:scale-110 animate-pulse"
                    : "bg-slate-600 text-slate-300 hover:bg-slate-500 hover:scale-105"
              }`}
              style={{ left: p.x, top: p.y }}
              onClick={() => handlePress(p.num)}
              disabled={isDone}>
              {p.num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   7. 방패 활성화 (Click hexagons)
   ══════════════════════════════════════ */
function ShieldMission({ onComplete, onCancel }: MissionProps) {
  const [hexagons] = useState(() => {
    const hexes: { id: number; x: number; y: number; active: boolean }[] = [];
    const cols = 4;
    const rows = 4;
    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = r % 2 === 0 ? 0 : 30;
        hexes.push({
          id: id++,
          x: 30 + c * 60 + offset,
          y: 25 + r * 55,
          active: Math.random() < 0.4,
        });
      }
    }
    return hexes;
  });

  const [toggled, setToggled] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const activeIds = hexagons.filter(h => h.active).map(h => h.id);

  useEffect(() => {
    if (!done && activeIds.every(id => toggled.has(id)) && toggled.size === activeIds.length) {
      setDone(true);
      setTimeout(onComplete, 600);
    }
  }, [toggled, activeIds, done, onComplete]);

  const toggleHex = (id: number) => {
    if (done) return;
    setToggled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">🛡️ 방패 활성화</h3>
      <p className="text-xs text-gray-400 mb-3">빨간 육각형만 모두 켜세요!</p>

      <div className="relative w-[300px] h-[280px] bg-slate-900 rounded-2xl border-2 border-slate-600 overflow-hidden">
        {hexagons.map(h => {
          const isOn = toggled.has(h.id);
          const shouldBeOn = h.active;
          return (
            <button key={h.id}
              className="absolute transition-all hover:scale-110"
              style={{ left: h.x, top: h.y }}
              onClick={() => toggleHex(h.id)}>
              <svg width={50} height={45} viewBox="0 0 50 45">
                <polygon points="25,0 50,12 50,37 25,45 0,37 0,12"
                  fill={isOn ? (shouldBeOn ? "#22c55e" : "#ef4444") : (shouldBeOn ? "#dc262640" : "#334155")}
                  stroke={isOn ? (shouldBeOn ? "#86efac" : "#fca5a5") : "#475569"}
                  strokeWidth={2} />
                {isOn && shouldBeOn && (
                  <polygon points="25,0 50,12 50,37 25,45 0,37 0,12"
                    fill="none" stroke="#86efac" strokeWidth={1} opacity={0.5}>
                  </polygon>
                )}
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   8. 신호 조정 (Tune Frequency)
   ══════════════════════════════════════ */
function CommsMission({ onComplete, onCancel }: MissionProps) {
  const [targetFreq] = useState(() => 30 + Math.floor(Math.random() * 60));
  const [currentFreq, setCurrentFreq] = useState(10);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done && Math.abs(currentFreq - targetFreq) < 3) {
      setDone(true);
      setTimeout(onComplete, 600);
    }
  }, [currentFreq, targetFreq, done, onComplete]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">📡 통신 주파수 조정</h3>
      <p className="text-xs text-gray-400 mb-3">다이얼을 돌려 목표 주파수에 맞추세요!</p>

      <div className="w-[300px] h-[300px] bg-slate-800 rounded-2xl border-2 border-slate-600 p-4">
        {/* 목표 파형 */}
        <div className="mb-2 text-center">
          <span className="text-xs text-green-400">목표 주파수</span>
        </div>
        <div className="w-full h-16 bg-black rounded-lg border border-slate-600 mb-3 overflow-hidden flex items-center">
          <svg width="100%" height="100%" viewBox="0 0 260 60">
            {Array.from({ length: 260 }).map((_, i) => {
              const y = 30 + Math.sin(i * 0.05 * (targetFreq / 20)) * 20;
              const y2 = 30 + Math.sin(i * 0.05 * (currentFreq / 20)) * 20;
              return (
                <g key={i}>
                  <circle cx={i} cy={y} r={0.8} fill="#22c55e" opacity={0.8} />
                  <circle cx={i} cy={y2} r={0.8} fill="#eab308" opacity={0.6} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 일치도 표시 */}
        <div className="text-center mb-3">
          <span className={`text-sm font-bold ${done ? "text-green-400" : Math.abs(currentFreq - targetFreq) < 10 ? "text-yellow-400" : "text-red-400"}`}>
            {done ? "✅ 주파수 일치!" : `일치도: ${Math.max(0, 100 - Math.abs(currentFreq - targetFreq) * 2)}%`}
          </span>
        </div>

        {/* 다이얼 슬라이더 */}
        <div className="mb-2 text-center">
          <span className="text-xs text-yellow-400">내 주파수</span>
        </div>
        <input type="range" min={0} max={100} value={currentFreq}
          onChange={(e) => setCurrentFreq(Number(e.target.value))}
          className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8
            [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-yellow-400
            [&::-webkit-slider-thumb]:to-yellow-600 [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-yellow-300 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-grab" />

        <div className="flex justify-between text-[9px] text-gray-500 mt-1">
          <span>0 MHz</span>
          <span className="text-yellow-400">{currentFreq} MHz</span>
          <span>100 MHz</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   9. 원자로 가동 (Simon Says)
   ══════════════════════════════════════ */
function ReactorMission({ onComplete, onCancel }: MissionProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSeq, setPlayerSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<"showing" | "input" | "success" | "fail">("showing");
  const [showingIdx, setShowingIdx] = useState(-1);
  const [round, setRound] = useState(1);
  const [lit, setLit] = useState<number | null>(null);
  const maxRounds = 5;

  // 새 시퀀스 추가
  useEffect(() => {
    const newSeq = [...sequence, Math.floor(Math.random() * 9)];
    setSequence(newSeq);
    setPhase("showing");
    setShowingIdx(-1);
    setPlayerSeq([]);

    // 순서대로 보여주기
    newSeq.forEach((_, i) => {
      setTimeout(() => setShowingIdx(i), (i + 1) * 600);
    });
    setTimeout(() => {
      setShowingIdx(-1);
      setPhase("input");
    }, (newSeq.length + 1) * 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handlePress = (idx: number) => {
    if (phase !== "input") return;
    setLit(idx);
    setTimeout(() => setLit(null), 200);

    const newPlayerSeq = [...playerSeq, idx];
    const currentIdx = newPlayerSeq.length - 1;

    if (sequence[currentIdx] !== idx) {
      setPhase("fail");
      // 리셋
      setTimeout(() => {
        setSequence([]);
        setRound(1);
      }, 1000);
      return;
    }

    setPlayerSeq(newPlayerSeq);

    if (newPlayerSeq.length === sequence.length) {
      if (round >= maxRounds) {
        setPhase("success");
        setTimeout(onComplete, 600);
      } else {
        setTimeout(() => setRound(r => r + 1), 500);
      }
    }
  };

  const btnColors = [
    "from-red-600 to-red-800", "from-blue-600 to-blue-800", "from-green-600 to-green-800",
    "from-yellow-600 to-yellow-800", "from-purple-600 to-purple-800", "from-cyan-600 to-cyan-800",
    "from-pink-600 to-pink-800", "from-orange-600 to-orange-800", "from-indigo-600 to-indigo-800",
  ];
  const btnGlows = [
    "shadow-red-500/60", "shadow-blue-500/60", "shadow-green-500/60",
    "shadow-yellow-500/60", "shadow-purple-500/60", "shadow-cyan-500/60",
    "shadow-pink-500/60", "shadow-orange-500/60", "shadow-indigo-500/60",
  ];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">☢️ 원자로 가동</h3>
      <p className="text-xs text-gray-400 mb-1">
        {phase === "showing" ? "패턴을 기억하세요!" :
         phase === "input" ? "같은 순서로 눌러주세요!" :
         phase === "fail" ? "❌ 틀렸어요! 다시 시작..." :
         "✅ 가동 완료!"}
      </p>
      <p className="text-xs text-yellow-400 mb-3">라운드 {round}/{maxRounds}</p>

      <div className="w-[280px] bg-slate-800 rounded-2xl border-2 border-slate-600 p-4">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => {
            const isShowing = phase === "showing" && showingIdx >= 0 && sequence[showingIdx] === i;
            const isLit = lit === i;
            return (
              <button key={i}
                className={`h-16 rounded-xl bg-gradient-to-b ${btnColors[i]} border-2 border-white/10 transition-all ${
                  isShowing || isLit ? `brightness-150 scale-105 shadow-lg ${btnGlows[i]}` : "brightness-75 hover:brightness-100"
                }`}
                onClick={() => handlePress(i)}
                disabled={phase !== "input"} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   10. 쓰레기 버리기 (Trash)
   ══════════════════════════════════════ */
function TrashMission({ onComplete, onCancel }: MissionProps) {
  const [leverY, setLeverY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [opened, setOpened] = useState(false);
  const [trashFalling, setTrashFalling] = useState(false);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(180, e.clientY - rect.top - 50));
    setLeverY(y);
    if (y > 150 && !opened) {
      setOpened(true);
      setTrashFalling(true);
      setTimeout(() => {
        setDone(true);
        setTimeout(onComplete, 500);
      }, 1500);
    }
  };

  const trashItems = ["🍌", "📄", "🥤", "🍎", "🧃", "📦", "🥡", "🧻"];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">🗑️ 쓰레기 버리기</h3>
      <p className="text-xs text-gray-400 mb-3">레버를 아래로 당기세요!</p>

      <div ref={containerRef}
        className="relative w-[300px] h-[320px] bg-slate-700 rounded-2xl border-2 border-slate-600 overflow-hidden"
        onPointerMove={handleMove}
        onPointerUp={() => setIsDragging(false)}
        style={{ touchAction: "none" }}>

        {/* 쓰레기통 배출구 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-24 bg-slate-900 rounded-t-lg border-t-2 border-x-2 border-slate-500">
          <div className={`absolute top-0 left-0 right-0 h-3 bg-slate-600 transition-all ${opened ? "translate-y-[-12px]" : ""}`} />
          {/* 쓰레기 안의 것들 */}
          {!trashFalling && (
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-2">
              {trashItems.map((t, i) => (
                <span key={i} className="text-lg">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* 떨어지는 쓰레기 */}
        {trashFalling && trashItems.map((t, i) => (
          <div key={i} className="absolute animate-bounce"
            style={{
              left: 80 + (i % 4) * 35,
              bottom: -20 - i * 15,
              animation: `fall 1.5s ease-in forwards`,
              animationDelay: `${i * 0.1}s`,
            }}>
            <span className="text-2xl" style={{
              display: "inline-block",
              animation: `fall-item 1.5s ease-in forwards`,
              animationDelay: `${i * 0.1}s`,
            }}>{t}</span>
          </div>
        ))}

        {/* 별 (우주 배경) */}
        {opened && (
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black via-indigo-950 to-transparent">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="absolute w-1 h-1 bg-white rounded-full"
                style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() }} />
            ))}
          </div>
        )}

        {/* 레버 */}
        <div className="absolute right-6 top-10"
          onPointerDown={() => setIsDragging(true)}
          style={{ cursor: "grab" }}>
          <div className="w-2 h-[200px] bg-slate-500 rounded-full relative">
            <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-b from-red-500 to-red-700 rounded-full border-2 border-red-400 shadow-lg cursor-grab active:cursor-grabbing"
              style={{ top: leverY }}>
              <div className="absolute inset-1 rounded-full bg-red-400/30" />
            </div>
          </div>
        </div>

        {/* 완료 */}
        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-4xl animate-bounce">✅</span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fall-item {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-300px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   11. 전력 복구 (Flip switches)
   ══════════════════════════════════════ */
function PowerMission({ onComplete, onCancel }: MissionProps) {
  const [switches, setSwitches] = useState(() =>
    Array.from({ length: 8 }, () => Math.random() < 0.5)
  );
  const [target] = useState(() =>
    Array.from({ length: 8 }, () => true)
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done && switches.every(Boolean)) {
      setDone(true);
      setTimeout(onComplete, 500);
    }
  }, [switches, done, onComplete]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">⚡ 전력 복구</h3>
      <p className="text-xs text-gray-400 mb-3">모든 스위치를 위로 올리세요!</p>

      <div className="w-[300px] bg-slate-800 rounded-2xl border-2 border-slate-600 p-4">
        <div className="flex gap-2 justify-center">
          {switches.map((on, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* LED */}
              <div className={`w-3 h-3 rounded-full mb-2 transition-all ${
                on ? "bg-green-400 shadow-green-400/50 shadow-lg" : "bg-red-500/40"
              }`} />

              {/* 스위치 트랙 */}
              <button onClick={() => setSwitches(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                className="relative w-8 h-20 bg-slate-900 rounded-lg border border-slate-600">
                {/* 스위치 핸들 */}
                <div className={`absolute left-1 right-1 h-10 rounded transition-all ${
                  on
                    ? "top-1 bg-gradient-to-b from-green-400 to-green-600 shadow-green-500/30 shadow-lg"
                    : "bottom-1 bg-gradient-to-b from-slate-400 to-slate-600"
                }`}>
                  <div className="absolute inset-x-0 top-1/2 h-[2px] bg-white/30" />
                </div>
              </button>

              <span className="text-[8px] text-gray-500 mt-1">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   12. 항로 설정 (Navigate ship)
   ══════════════════════════════════════ */
function NavigationMission({ onComplete, onCancel }: MissionProps) {
  const [shipPos, setShipPos] = useState({ x: 40, y: 250 });
  const [targetPos] = useState(() => ({ x: 200 + Math.random() * 60, y: 30 + Math.random() * 40 }));
  const [isDragging, setIsDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!done) {
      const dist = Math.sqrt((shipPos.x - targetPos.x) ** 2 + (shipPos.y - targetPos.y) ** 2);
      if (dist < 25) {
        setDone(true);
        setTimeout(onComplete, 600);
      }
    }
  }, [shipPos, targetPos, done, onComplete]);

  const handleMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current || done) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(280, e.clientX - rect.left));
    const y = Math.max(10, Math.min(290, e.clientY - rect.top));
    setShipPos({ x, y });
    setTrail(prev => [...prev.slice(-30), { x, y }]);
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">🧭 항로 설정</h3>
      <p className="text-xs text-gray-400 mb-3">우주선을 목표 지점으로 드래그하세요!</p>

      <div ref={containerRef}
        className="relative w-[300px] h-[300px] bg-gradient-to-b from-gray-950 via-indigo-950 to-gray-950 rounded-2xl border-2 border-slate-600 overflow-hidden"
        onPointerMove={handleMove}
        onPointerUp={() => setIsDragging(false)}
        style={{ touchAction: "none" }}>

        {/* 별 */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute w-[2px] h-[2px] bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2 + Math.random() * 0.8,
              animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            }} />
        ))}

        {/* 항로 선 (점선) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          <line x1={40} y1={250} x2={targetPos.x} y2={targetPos.y}
            stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" opacity={0.3} />
          {/* 궤적 */}
          {trail.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#60a5fa"
              opacity={i / trail.length * 0.5} />
          ))}
        </svg>

        {/* 목표 */}
        <div className="absolute animate-pulse" style={{ left: targetPos.x - 18, top: targetPos.y - 18, zIndex: 10 }}>
          <div className="w-9 h-9 rounded-full border-2 border-green-400 flex items-center justify-center"
            style={{ boxShadow: "0 0 15px rgba(74,222,128,0.4)" }}>
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        </div>

        {/* 우주선 */}
        <div className="absolute cursor-grab active:cursor-grabbing"
          style={{ left: shipPos.x - 15, top: shipPos.y - 15, zIndex: 15 }}
          onPointerDown={() => setIsDragging(true)}>
          <div className="text-3xl" style={{
            transform: `rotate(${Math.atan2(targetPos.y - shipPos.y, targetPos.x - shipPos.x) * 180 / Math.PI - 90}deg)`,
            filter: done ? "brightness(1.5)" : undefined,
          }}>🚀</div>
        </div>

        {/* 출발점 */}
        <div className="absolute w-4 h-4 rounded-full border border-yellow-400/50 bg-yellow-400/20"
          style={{ left: 33, top: 243 }} />
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   미션 매핑 & 모달
   ══════════════════════════════════════ */

type MissionType = "wire" | "cardswipe" | "asteroid" | "download" | "fuel" |
  "manifold" | "shield" | "comms" | "reactor" | "trash" | "power" | "navigation";

const TASK_TO_MISSION: Record<string, MissionType> = {
  "배선 수리": "wire",
  "카드 긁기": "cardswipe",
  "소행성 파괴": "asteroid",
  "검체 분석": "download",
  "건강 검진": "download",
  "ID 확인": "manifold",
  "연료 넣기": "fuel",
  "짐 옮기기": "trash",
  "전력 복구": "power",
  "원자로 가동": "reactor",
  "매니폴드 열기": "manifold",
  "CCTV 확인": "download",
  "통신 복구": "comms",
  "신호 조정": "comms",
  "방패 활성화": "shield",
  "항로 설정": "navigation",
  "방향 조정": "navigation",
  "쓰레기 버리기": "trash",
  "음식 준비": "fuel",
};

const MISSION_COMPONENTS: Record<MissionType, React.FC<MissionProps>> = {
  wire: WireMission,
  cardswipe: CardSwipeMission,
  asteroid: AsteroidMission,
  download: DownloadMission,
  fuel: FuelMission,
  manifold: ManifoldMission,
  shield: ShieldMission,
  comms: CommsMission,
  reactor: ReactorMission,
  trash: TrashMission,
  power: PowerMission,
  navigation: NavigationMission,
};

export function getMissionType(taskName: string): MissionType {
  return TASK_TO_MISSION[taskName] || "wire";
}

interface MissionModalProps {
  taskName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function MissionModal({ taskName, onComplete, onCancel }: MissionModalProps) {
  const missionType = getMissionType(taskName);
  const MissionComponent = MISSION_COMPONENTS[missionType];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ touchAction: "none" }}>
      <div className="bg-slate-900 rounded-3xl border-2 border-slate-600 shadow-2xl p-4 max-w-[340px] w-full max-h-[90vh] overflow-y-auto">
        <MissionComponent onComplete={onComplete} onCancel={onCancel} />
        <button onClick={onCancel}
          className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm py-2 rounded-xl transition-colors">
          ✕ 취소
        </button>
      </div>
    </div>
  );
}
