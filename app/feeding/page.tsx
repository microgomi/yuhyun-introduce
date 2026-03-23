"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

/* ───── 음식 정의 ───── */
interface FoodDef {
  name: string;
  emoji: string;
  points: number;
  category: "main" | "side" | "snack" | "drink" | "bad";
  desc: string;
}

const FOODS: FoodDef[] = [
  // 밥/메인
  { name: "밥", emoji: "🍚", points: 10, category: "main", desc: "맛있는 흰쌀밥" },
  { name: "김밥", emoji: "🍙", points: 12, category: "main", desc: "동그란 김밥" },
  { name: "라면", emoji: "🍜", points: 15, category: "main", desc: "뜨끈한 라면" },
  { name: "볶음밥", emoji: "🍛", points: 14, category: "main", desc: "고슬고슬 볶음밥" },
  { name: "돈까스", emoji: "🥩", points: 18, category: "main", desc: "바삭한 돈까스" },
  { name: "치킨", emoji: "🍗", points: 20, category: "main", desc: "황금빛 치킨!" },
  { name: "피자", emoji: "🍕", points: 16, category: "main", desc: "치즈 쭉~ 피자" },
  { name: "햄버거", emoji: "🍔", points: 17, category: "main", desc: "육즙 가득 버거" },
  // 반찬
  { name: "김치", emoji: "🥬", points: 8, category: "side", desc: "매콤한 김치" },
  { name: "계란", emoji: "🥚", points: 7, category: "side", desc: "계란 프라이" },
  { name: "소시지", emoji: "🌭", points: 9, category: "side", desc: "문어 소시지" },
  { name: "떡볶이", emoji: "🍢", points: 11, category: "side", desc: "매콤달콤 떡볶이" },
  // 간식
  { name: "사탕", emoji: "🍬", points: 5, category: "snack", desc: "달콤한 사탕" },
  { name: "초콜릿", emoji: "🍫", points: 6, category: "snack", desc: "녹는 초콜릿" },
  { name: "아이스크림", emoji: "🍦", points: 8, category: "snack", desc: "시원한 아이스크림" },
  { name: "과자", emoji: "🍪", points: 5, category: "snack", desc: "바삭한 과자" },
  { name: "케이크", emoji: "🍰", points: 12, category: "snack", desc: "딸기 케이크!" },
  // 음료
  { name: "우유", emoji: "🥛", points: 8, category: "drink", desc: "하얀 우유" },
  { name: "주스", emoji: "🧃", points: 6, category: "drink", desc: "과일 주스" },
  { name: "물", emoji: "💧", points: 3, category: "drink", desc: "깨끗한 물" },
  // 싫어하는 것
  { name: "브로콜리", emoji: "🥦", points: -5, category: "bad", desc: "으엑 브로콜리!" },
  { name: "당근", emoji: "🥕", points: -3, category: "bad", desc: "당근 싫어!" },
  { name: "가지", emoji: "🍆", points: -4, category: "bad", desc: "물렁물렁 가지" },
  { name: "피망", emoji: "🫑", points: -5, category: "bad", desc: "쓴 피망!" },
];

/* ───── 캐릭터 표정 ───── */
interface Expression {
  face: string;
  mouth: string;
  text: string;
}

const EXPRESSIONS: Record<string, Expression> = {
  normal: { face: "😐", mouth: "", text: "배고파~" },
  happy: { face: "😋", mouth: "", text: "맛있다!" },
  veryHappy: { face: "🤩", mouth: "", text: "최고야!!" },
  eating: { face: "😮", mouth: "", text: "냠냠" },
  yuck: { face: "🤢", mouth: "", text: "으엑!" },
  full: { face: "😆", mouth: "", text: "배불러~!" },
  hungry: { face: "😢", mouth: "", text: "더 줘..." },
  combo: { face: "😍", mouth: "", text: "연속 맛있다!" },
};

const W = 400;
const H = 550;

interface FallingFood {
  id: number;
  x: number;
  y: number;
  vy: number;
  foodIdx: number;
  rotation: number;
  rotSpeed: number;
}

type Screen = "title" | "playing" | "result";

export default function FeedingPage() {
  const [screen, setScreen] = useState<Screen>("title");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [fullness, setFullness] = useState(0); // 포만감 0~100
  const [happiness, setHappiness] = useState(50); // 행복도 0~100
  const [expression, setExpression] = useState<Expression>(EXPRESSIONS.normal);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});
  const tickRef = useRef(0);
  const foodsRef = useRef<FallingFood[]>([]);
  const nextIdRef = useRef(0);
  const scoreRef = useRef(0);
  const fullnessRef = useRef(0);
  const happinessRef = useRef(50);
  const comboRef = useRef(0);
  const mouthXRef = useRef(W / 2);
  const mouthOpenRef = useRef(false);
  const timeRef = useRef(60);
  const levelRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const gameOverRef = useRef(false);

  const particles = useRef<{ x: number; y: number; vx: number; vy: number; text: string; life: number; color: string }[]>([]);

  const startGame = useCallback(() => {
    foodsRef.current = [];
    nextIdRef.current = 0;
    scoreRef.current = 0;
    fullnessRef.current = 0;
    happinessRef.current = 50;
    comboRef.current = 0;
    tickRef.current = 0;
    timeRef.current = 60;
    levelRef.current = 1;
    spawnTimerRef.current = 0;
    gameOverRef.current = false;
    particles.current = [];
    setScore(0);
    setFullness(0);
    setHappiness(50);
    setCombo(0);
    setTimeLeft(60);
    setLevel(1);
    setMessage("");
    setExpression(EXPRESSIONS.normal);
    setScreen("playing");
  }, []);

  /* ───── 게임 루프 ───── */
  useEffect(() => {
    loopRef.current = () => {
      if (screen !== "playing" || gameOverRef.current) return;
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;

      tickRef.current++;
      const tick = tickRef.current;

      // 타이머 (매 60프레임 = 1초)
      if (tick % 60 === 0) {
        timeRef.current--;
        setTimeLeft(timeRef.current);
        if (timeRef.current <= 0) {
          gameOverRef.current = true;
          setHighScore(h => Math.max(h, scoreRef.current));
          setScreen("result");
          return;
        }
      }

      // 레벨 업 (20초마다)
      const newLevel = Math.floor((60 - timeRef.current) / 20) + 1;
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
      }

      // 음식 스폰
      spawnTimerRef.current--;
      if (spawnTimerRef.current <= 0) {
        const spawnRate = Math.max(30, 60 - levelRef.current * 10);
        spawnTimerRef.current = spawnRate + Math.floor(Math.random() * 20);

        const foodIdx = Math.floor(Math.random() * FOODS.length);
        const food: FallingFood = {
          id: ++nextIdRef.current,
          x: 30 + Math.random() * (W - 60),
          y: -20,
          vy: 1.5 + Math.random() * 1.5 + levelRef.current * 0.3,
          foodIdx,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.1,
        };
        foodsRef.current.push(food);
      }

      // 음식 업데이트
      const mouthX = mouthXRef.current;
      const mouthY = H - 80;
      const mouthR = 35;

      for (let i = foodsRef.current.length - 1; i >= 0; i--) {
        const f = foodsRef.current[i];
        f.y += f.vy;
        f.rotation += f.rotSpeed;

        // 입에 닿았는지 체크
        const dx = f.x - mouthX;
        const dy = f.y - mouthY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouthR + 15) {
          // 먹었다!
          const food = FOODS[f.foodIdx];
          foodsRef.current.splice(i, 1);

          if (food.category === "bad") {
            // 싫어하는 음식
            comboRef.current = 0;
            setCombo(0);
            happinessRef.current = Math.max(0, happinessRef.current - 15);
            setHappiness(happinessRef.current);
            scoreRef.current = Math.max(0, scoreRef.current + food.points);
            setScore(scoreRef.current);
            setExpression(EXPRESSIONS.yuck);
            setTimeout(() => setExpression(EXPRESSIONS.normal), 1000);
            // 이펙트
            particles.current.push({
              x: mouthX, y: mouthY - 30, vx: 0, vy: -2,
              text: `${food.points}`, life: 40, color: "#ef4444",
            });
          } else {
            // 좋아하는 음식
            comboRef.current++;
            setCombo(comboRef.current);
            const comboBonus = Math.min(comboRef.current, 5);
            const gained = food.points + comboBonus;
            scoreRef.current += gained;
            setScore(scoreRef.current);
            fullnessRef.current = Math.min(100, fullnessRef.current + 5);
            setFullness(fullnessRef.current);
            happinessRef.current = Math.min(100, happinessRef.current + 5);
            setHappiness(happinessRef.current);

            if (comboRef.current >= 5) {
              setExpression(EXPRESSIONS.combo);
            } else if (food.category === "main" && food.points >= 15) {
              setExpression(EXPRESSIONS.veryHappy);
            } else {
              setExpression(EXPRESSIONS.happy);
            }
            setTimeout(() => {
              if (fullnessRef.current >= 90) setExpression(EXPRESSIONS.full);
              else setExpression(EXPRESSIONS.normal);
            }, 800);

            // 이펙트
            particles.current.push({
              x: mouthX, y: mouthY - 30, vx: 0, vy: -2,
              text: `+${gained}`, life: 40, color: "#22c55e",
            });
            if (comboRef.current >= 3) {
              particles.current.push({
                x: mouthX, y: mouthY - 50, vx: 0, vy: -1.5,
                text: `🔥${comboRef.current}콤보!`, life: 50, color: "#f59e0b",
              });
            }
          }
          continue;
        }

        // 화면 밖으로 나감 = 놓침
        if (f.y > H + 20) {
          const food = FOODS[f.foodIdx];
          foodsRef.current.splice(i, 1);
          if (food.category !== "bad") {
            comboRef.current = 0;
            setCombo(0);
            happinessRef.current = Math.max(0, happinessRef.current - 3);
            setHappiness(happinessRef.current);
          }
        }
      }

      // 포만감 자연 감소
      if (tick % 120 === 0 && fullnessRef.current > 0) {
        fullnessRef.current = Math.max(0, fullnessRef.current - 2);
        setFullness(fullnessRef.current);
      }

      // ─── Draw ───
      ctx.clearRect(0, 0, W, H);

      // 배경 (주방)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#fef3c7");
      bgGrad.addColorStop(0.7, "#fffbeb");
      bgGrad.addColorStop(1, "#f59e0b33");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 테이블
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, H - 40, W, 40);
      ctx.fillStyle = "#a3541a";
      ctx.fillRect(0, H - 45, W, 8);

      // 떨어지는 음식
      for (const f of foodsRef.current) {
        const food = FOODS[f.foodIdx];
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        // 그림자
        ctx.fillStyle = "#00000015";
        ctx.beginPath();
        ctx.ellipse(2, 3, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // 음식 이모지
        ctx.font = "30px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(food.emoji, 0, 0);
        // 싫어하는 음식은 경고 표시
        if (food.category === "bad") {
          ctx.font = "12px sans-serif";
          ctx.fillText("❌", 12, -12);
        }
        ctx.restore();
      }

      // 캐릭터 (아기/아이)
      const charX = mouthX;
      const charY = H - 80;

      // 몸통
      ctx.fillStyle = "#fcd34d";
      ctx.beginPath();
      ctx.ellipse(charX, charY + 20, 25, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // 얼굴 배경
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(charX, charY - 10, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 표정
      ctx.font = "35px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(expression.face, charX, charY - 8);

      // 말풍선
      if (expression.text) {
        ctx.fillStyle = "#00000088";
        const tw = ctx.measureText(expression.text).width + 16;
        ctx.beginPath();
        ctx.roundRect(charX - tw / 2, charY - 55, tw, 22, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(expression.text, charX, charY - 44);
      }

      // 손 (좌우)
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(charX - 30, charY + 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(charX + 30, charY + 5, 8, 0, Math.PI * 2);
      ctx.fill();

      // 파티클
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.current.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(loopRef.current);
    };
  }, [screen, expression]);

  useEffect(() => {
    if (screen !== "playing") return;
    setTimeout(() => {
      animRef.current = requestAnimationFrame(loopRef.current);
    }, 50);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen]);

  /* ───── 입력 ───── */
  const handleMove = useCallback((clientX: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const scaleX = W / rect.width;
    mouthXRef.current = Math.max(30, Math.min(W - 30, (clientX - rect.left) * scaleX));
  }, []);

  /* ───── 타이틀 ───── */
  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 via-orange-50 to-yellow-200 flex flex-col items-center justify-center p-4">
        <Link href="/" className="text-orange-700 text-sm mb-8 self-start ml-4">← 홈으로</Link>
        <div className="text-8xl mb-4">🍚</div>
        <h1 className="text-4xl font-black text-orange-800 mb-2">밥 먹이기</h1>
        <p className="text-orange-600 mb-1">떨어지는 음식을 받아서 아이에게 먹여주세요!</p>
        <p className="text-orange-500 text-sm mb-4">❌ 표시는 싫어하는 음식! 피하세요!</p>
        {highScore > 0 && <p className="text-yellow-600 mb-2 font-bold">🏆 최고점수: {highScore}</p>}
        <div className="bg-white/60 rounded-xl p-4 mb-6 max-w-xs text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-orange-600 font-bold">🍗 메인:</span> 고득점</div>
            <div><span className="text-green-600 font-bold">🥬 반찬:</span> 중간 점수</div>
            <div><span className="text-pink-600 font-bold">🍬 간식:</span> 낮은 점수</div>
            <div><span className="text-blue-600 font-bold">🥛 음료:</span> 수분 보충</div>
          </div>
          <div className="mt-2 text-red-500 text-center">🥦🥕🍆🫑 = 싫어하는 음식 (감점!)</div>
        </div>
        <button onClick={startGame}
          className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-8 py-4 text-xl font-bold shadow-lg active:scale-95 transition-transform">
          시작하기!
        </button>
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (screen === "result") {
    const grade =
      score >= 500 ? { name: "S", color: "#e03131", desc: "최고의 밥 먹이기 달인!", emoji: "🤩" } :
      score >= 350 ? { name: "A", color: "#f59f00", desc: "잘 먹였어요!", emoji: "😋" } :
      score >= 200 ? { name: "B", color: "#ae3ec9", desc: "괜찮아요!", emoji: "😊" } :
      score >= 100 ? { name: "C", color: "#4dabf7", desc: "조금 더 노력!", emoji: "😐" } :
                     { name: "D", color: "#aaa", desc: "배고프다...", emoji: "😢" };
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 via-orange-50 to-yellow-200 flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-black text-orange-800 mb-2">시간 끝!</h2>
        <div className="text-6xl mb-2">{grade.emoji}</div>
        <div className="text-6xl font-black mb-1" style={{ color: grade.color }}>{grade.name}</div>
        <p className="text-lg mb-4" style={{ color: grade.color }}>{grade.desc}</p>
        <div className="bg-white/70 rounded-xl p-4 mb-4 text-center min-w-[200px]">
          <p className="text-2xl font-black text-orange-800">🍚 {score}점</p>
          <p className="text-sm text-orange-600">포만감: {fullness}%</p>
          <p className="text-sm text-orange-600">행복도: {happiness}%</p>
          {highScore > 0 && <p className="text-sm text-yellow-600 font-bold mt-1">🏆 최고: {highScore}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={startGame}
            className="bg-orange-500 hover:bg-orange-400 text-white rounded-xl px-6 py-3 font-bold">
            다시하기
          </button>
          <Link href="/"
            className="bg-gray-500 hover:bg-gray-400 text-white rounded-xl px-6 py-3 font-bold">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  /* ───── 플레이 ───── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 via-orange-50 to-yellow-200 flex flex-col items-center p-2">
      {/* HUD */}
      <div className="w-full max-w-[400px] mb-1">
        <div className="flex justify-between items-center px-1 mb-1">
          <Link href="/" className="text-orange-700 text-xs">← 홈</Link>
          <div className="text-lg font-black text-orange-800">🍚 {score}점</div>
          <div className="flex items-center gap-2">
            {combo >= 3 && <span className="text-red-500 text-xs font-bold animate-pulse">🔥{combo}</span>}
            <span className="text-sm font-bold text-orange-700">⏰ {timeLeft}초</span>
          </div>
        </div>
        {/* 포만감 */}
        <div className="flex items-center gap-1 px-1 mb-0.5">
          <span className="text-xs text-orange-600 w-10">포만감</span>
          <div className="flex-1 bg-orange-200 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2.5 rounded-full transition-all"
              style={{ width: `${fullness}%` }} />
          </div>
          <span className="text-xs text-orange-600 w-8 text-right">{fullness}%</span>
        </div>
        {/* 행복도 */}
        <div className="flex items-center gap-1 px-1">
          <span className="text-xs text-pink-600 w-10">행복도</span>
          <div className="flex-1 bg-pink-200 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-pink-400 to-pink-600 h-2.5 rounded-full transition-all"
              style={{ width: `${happiness}%` }} />
          </div>
          <span className="text-xs text-pink-600 w-8 text-right">{happiness}%</span>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className="absolute top-24 z-10 bg-white/90 text-orange-800 font-black px-4 py-2 rounded-xl shadow-lg animate-bounce">
          {message}
        </div>
      )}

      {/* 캔버스 */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl shadow-lg max-w-full touch-none"
        style={{ maxHeight: "calc(100vh - 110px)" }}
        onMouseMove={e => handleMove(e.clientX)}
        onTouchStart={e => handleMove(e.touches[0].clientX)}
        onTouchMove={e => handleMove(e.touches[0].clientX)}
      />
    </div>
  );
}
