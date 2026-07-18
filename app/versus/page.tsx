"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

// ===== 상수 =====
const CW = 960;
const CH = 540;
const GROUND = 470;
const FW = 70; // fighter width
const FH = 130; // fighter height
const STAND_Y = GROUND - FH; // 340
const GRAVITY = 0.9;
const JUMP_V = -16;
const MOVE_SPEED = 5.2;
const ROUND_FRAMES = 60 * 60; // 60초
const WINS_NEEDED = 2; // 3판 2선승

type Phase = "menu" | "ready" | "fight" | "roundEnd" | "matchEnd";
type AttackType = "punch" | "kick" | null;

interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
}

interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  onGround: boolean;
  blocking: boolean;
  stun: number;
  attackType: AttackType;
  attackTimer: number;
  attackDur: number;
  attackHit: boolean;
  attackCd: number;
  hitFlash: number;
  // 엣지 감지용
  prevJump: boolean;
  prevPunch: boolean;
  prevKick: boolean;
}

interface GameState {
  phase: Phase;
  p1: Fighter;
  p2: Fighter;
  timer: number;
  round: number;
  p1Wins: number;
  p2Wins: number;
  announce: number; // 라운드/승패 안내 프레임
  announceText: string;
  matchWinner: 0 | 1 | 2;
  roundWinner: 0 | 1 | 2;
}

function makeFighter(side: 1 | -1): Fighter {
  return {
    x: side === 1 ? 200 : 690,
    y: STAND_Y,
    vx: 0,
    vy: 0,
    facing: side === 1 ? 1 : -1,
    hp: 100,
    onGround: true,
    blocking: false,
    stun: 0,
    attackType: null,
    attackTimer: 0,
    attackDur: 0,
    attackHit: false,
    attackCd: 0,
    hitFlash: 0,
    prevJump: false,
    prevPunch: false,
    prevKick: false,
  };
}

function resetFighters(g: GameState) {
  g.p1 = makeFighter(1);
  g.p2 = makeFighter(-1);
  g.timer = ROUND_FRAMES;
}

function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function VersusGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const gameRef = useRef<GameState>({
    phase: "menu",
    p1: makeFighter(1),
    p2: makeFighter(-1),
    timer: ROUND_FRAMES,
    round: 1,
    p1Wins: 0,
    p2Wins: 0,
    announce: 0,
    announceText: "",
    matchWinner: 0,
    roundWinner: 0,
  });

  // UI 미러 상태
  const [uiPhase, setUiPhase] = useState<Phase>("menu");
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [matchWinner, setMatchWinner] = useState<0 | 1 | 2>(0);
  const [gpConnected, setGpConnected] = useState(false);

  const syncUI = useCallback(() => {
    const g = gameRef.current;
    setUiPhase(g.phase);
    setScore({ p1: g.p1Wins, p2: g.p2Wins });
    setMatchWinner(g.matchWinner);
  }, []);

  // 키보드 입력
  useEffect(() => {
    const preventKeys = new Set([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      ",",
      ".",
      "/",
      " ",
    ]);
    const down = (e: KeyboardEvent) => {
      if (preventKeys.has(e.key)) e.preventDefault();
      keysRef.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // 게임패드 연결 감지
  useEffect(() => {
    const onConn = () => setGpConnected(true);
    const onDisc = () => {
      const pads = navigator.getGamepads?.() ?? [];
      setGpConnected(Array.from(pads).some((p) => p));
    };
    window.addEventListener("gamepadconnected", onConn);
    window.addEventListener("gamepaddisconnected", onDisc);
    return () => {
      window.removeEventListener("gamepadconnected", onConn);
      window.removeEventListener("gamepaddisconnected", onDisc);
    };
  }, []);

  const startMatch = useCallback(() => {
    const g = gameRef.current;
    g.p1Wins = 0;
    g.p2Wins = 0;
    g.round = 1;
    g.matchWinner = 0;
    g.roundWinner = 0;
    resetFighters(g);
    g.phase = "ready";
    g.announce = 100;
    g.announceText = `라운드 ${g.round}`;
    syncUI();
  }, [syncUI]);

  // 메인 루프
  useEffect(() => {
    let raf = 0;

    const readGamepad = (): Input | null => {
      const pads = navigator.getGamepads?.() ?? [];
      let gp: Gamepad | null = null;
      for (const p of pads) {
        if (p) {
          gp = p;
          break;
        }
      }
      if (!gp) return null;
      const ax = gp.axes[0] ?? 0;
      const b = (i: number) => gp!.buttons[i]?.pressed ?? false;
      return {
        left: ax < -0.35 || b(14),
        right: ax > 0.35 || b(15),
        jump: b(0) || b(12),
        punch: b(2) || b(3),
        kick: b(1),
        block: b(5) || b(7) || b(4) || b(6),
      };
    };

    const readKeys = (
      map: { left: string; right: string; jump: string; punch: string; kick: string; block: string }
    ): Input => {
      const k = keysRef.current;
      return {
        left: k.has(map.left),
        right: k.has(map.right),
        jump: k.has(map.jump),
        punch: k.has(map.punch),
        kick: k.has(map.kick),
        block: k.has(map.block),
      };
    };

    const startAttack = (f: Fighter, type: "punch" | "kick") => {
      f.attackType = type;
      f.attackTimer = type === "punch" ? 16 : 26;
      f.attackDur = f.attackTimer;
      f.attackHit = false;
    };

    const updateFighter = (f: Fighter, o: Fighter, input: Input) => {
      // 상대 바라보기
      f.facing = f.x + FW / 2 <= o.x + FW / 2 ? 1 : -1;

      if (f.hitFlash > 0) f.hitFlash--;
      if (f.attackCd > 0) f.attackCd--;

      if (f.stun > 0) {
        f.stun--;
        f.vx *= 0.85;
      } else {
        f.blocking = input.block && f.onGround && f.attackTimer === 0;
        if (f.blocking) {
          f.vx = 0;
        } else if (f.attackTimer === 0) {
          // 이동
          const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          f.vx = dir * MOVE_SPEED;
          // 점프 (엣지)
          if (input.jump && !f.prevJump && f.onGround) {
            f.vy = JUMP_V;
            f.onGround = false;
          }
          // 공격 (엣지)
          if (f.attackCd === 0) {
            if (input.punch && !f.prevPunch) startAttack(f, "punch");
            else if (input.kick && !f.prevKick) startAttack(f, "kick");
          }
        } else {
          f.vx = 0; // 공격 중 정지
        }
      }

      f.prevJump = input.jump;
      f.prevPunch = input.punch;
      f.prevKick = input.kick;

      // 중력 & 위치
      f.vy += GRAVITY;
      f.y += f.vy;
      if (f.y >= STAND_Y) {
        f.y = STAND_Y;
        f.vy = 0;
        f.onGround = true;
      }
      f.x += f.vx;
      if (f.x < 15) f.x = 15;
      if (f.x > CW - 15 - FW) f.x = CW - 15 - FW;

      // 공격 처리
      if (f.attackTimer > 0) {
        f.attackTimer--;
        const elapsed = f.attackDur - f.attackTimer;
        const win = f.attackType === "punch" ? [4, 10] : [8, 16];
        if (!f.attackHit && elapsed >= win[0] && elapsed <= win[1]) {
          const range = f.attackType === "punch" ? 72 : 102;
          const hx = f.facing === 1 ? f.x + FW : f.x - range;
          const hb = { x: hx, y: f.y + 20, w: range, h: 75 };
          const ob = { x: o.x, y: o.y, w: FW, h: FH };
          if (overlap(hb, ob)) {
            f.attackHit = true;
            const base = f.attackType === "punch" ? 7 : 13;
            const facingAttacker = o.facing !== f.facing;
            const blocked = o.blocking && facingAttacker;
            const dmg = blocked ? Math.max(1, Math.round(base * 0.15)) : base;
            o.hp = Math.max(0, o.hp - dmg);
            const kb = (f.attackType === "punch" ? 6 : 11) * (blocked ? 0.5 : 1);
            o.vx = kb * f.facing;
            o.stun = blocked ? 6 : f.attackType === "punch" ? 12 : 18;
            o.hitFlash = 6;
            o.blocking = false;
          }
        }
        if (f.attackTimer === 0) {
          f.attackCd = f.attackType === "punch" ? 8 : 16;
          f.attackType = null;
        }
      }
    };

    const endRound = (g: GameState, winner: 1 | 2 | 0) => {
      g.roundWinner = winner;
      if (winner === 1) g.p1Wins++;
      else if (winner === 2) g.p2Wins++;
      g.phase = "roundEnd";
      g.announce = 120;
      g.announceText =
        winner === 0 ? "무승부!" : winner === 1 ? "1P 승리!" : "2P 승리!";
      syncUI();
    };

    const step = () => {
      const g = gameRef.current;
      const gpInput = readGamepad();
      const p1Input: Input =
        gpInput ??
        readKeys({ left: "a", right: "d", jump: "w", punch: "f", kick: "g", block: "r" });
      const p2Input: Input = readKeys({
        left: "arrowleft",
        right: "arrowright",
        jump: "arrowup",
        punch: ",",
        kick: ".",
        block: "/",
      });

      if (g.phase === "fight") {
        updateFighter(g.p1, g.p2, p1Input);
        updateFighter(g.p2, g.p1, p2Input);
        g.timer--;

        if (g.p1.hp <= 0 || g.p2.hp <= 0) {
          const w = g.p1.hp <= 0 && g.p2.hp <= 0 ? 0 : g.p1.hp <= 0 ? 2 : 1;
          endRound(g, w as 0 | 1 | 2);
        } else if (g.timer <= 0) {
          const w = g.p1.hp === g.p2.hp ? 0 : g.p1.hp > g.p2.hp ? 1 : 2;
          endRound(g, w as 0 | 1 | 2);
        }
      } else if (g.phase === "ready") {
        g.announce--;
        if (g.announce === 40) g.announceText = "싸워라!";
        if (g.announce <= 0) {
          g.phase = "fight";
          syncUI();
        }
      } else if (g.phase === "roundEnd") {
        g.announce--;
        if (g.announce <= 0) {
          if (g.p1Wins >= WINS_NEEDED || g.p2Wins >= WINS_NEEDED) {
            g.matchWinner = g.p1Wins >= WINS_NEEDED ? 1 : 2;
            g.phase = "matchEnd";
            syncUI();
          } else {
            g.round++;
            resetFighters(g);
            g.phase = "ready";
            g.announce = 100;
            g.announceText = `라운드 ${g.round}`;
            syncUI();
          }
        }
      }

      draw();
      raf = requestAnimationFrame(step);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const g = gameRef.current;

      // 배경
      const sky = ctx.createLinearGradient(0, 0, 0, CH);
      sky.addColorStop(0, "#1e1b4b");
      sky.addColorStop(0.6, "#4c1d95");
      sky.addColorStop(1, "#7c2d12");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, CH);

      // 달
      ctx.fillStyle = "rgba(255,241,196,0.9)";
      ctx.beginPath();
      ctx.arc(CW - 120, 90, 45, 0, Math.PI * 2);
      ctx.fill();

      // 바닥
      const floor = ctx.createLinearGradient(0, GROUND, 0, CH);
      floor.addColorStop(0, "#3f3f46");
      floor.addColorStop(1, "#18181b");
      ctx.fillStyle = floor;
      ctx.fillRect(0, GROUND, CW, CH - GROUND);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(CW, GROUND);
      ctx.stroke();

      drawFighter(ctx, g.p1, "#ef4444", "😤", "1P");
      drawFighter(ctx, g.p2, "#3b82f6", "😎", "2P");

      drawHUD(ctx, g);

      // 인게임 안내 (라운드/승패)
      if ((g.phase === "ready" || g.phase === "roundEnd") && g.announce > 0) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, CH / 2 - 60, CW, 120);
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 64px system-ui, sans-serif";
        ctx.fillText(g.announceText, CW / 2, CH / 2 + 22);
        ctx.restore();
      }
    };

    const drawFighter = (
      ctx: CanvasRenderingContext2D,
      f: Fighter,
      color: string,
      face: string,
      tag: string
    ) => {
      const cx = f.x + FW / 2;
      // 그림자
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(cx, GROUND, FW / 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 몸통
      ctx.fillStyle = f.hitFlash > 0 ? "#ffffff" : color;
      const bodyTop = f.y + 40;
      roundRect(ctx, f.x + 8, bodyTop, FW - 16, FH - 40, 12);
      ctx.fill();

      // 막기 방패 효과
      if (f.blocking) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, f.y + FH / 2, FH / 2, -Math.PI / 2, Math.PI / 2, f.facing === -1);
        ctx.stroke();
      }

      // 팔/다리 (공격 표현)
      ctx.strokeStyle = f.hitFlash > 0 ? "#ffffff" : color;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      if (f.attackType === "punch" && f.attackTimer > 0) {
        const reach = 55;
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop + 20);
        ctx.lineTo(cx + reach * f.facing, bodyTop + 18);
        ctx.stroke();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(cx + reach * f.facing, bodyTop + 18, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.attackType === "kick" && f.attackTimer > 0) {
        const reach = 70;
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop + 55);
        ctx.lineTo(cx + reach * f.facing, bodyTop + 45);
        ctx.stroke();
        ctx.fillStyle = "#fca5a5";
        ctx.beginPath();
        ctx.arc(cx + reach * f.facing, bodyTop + 45, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      // 머리
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(cx, f.y + 22, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "30px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      if (f.facing === -1) {
        ctx.translate(cx, f.y + 24);
        ctx.scale(-1, 1);
        ctx.fillText(face, 0, 0);
      } else {
        ctx.fillText(face, cx, f.y + 24);
      }
      ctx.restore();
      ctx.textBaseline = "alphabetic";

      // 태그
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(tag, cx, f.y - 6);
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, g: GameState) => {
      // HP 바 (좌: 1P)
      drawHpBar(ctx, 30, 30, 380, g.p1.hp, "#ef4444", false);
      // HP 바 (우: 2P)
      drawHpBar(ctx, CW - 30 - 380, 30, 380, g.p2.hp, "#3b82f6", true);

      // 이름
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("1P (패드/WASD)", 30, 78);
      ctx.textAlign = "right";
      ctx.fillText("2P (방향키)", CW - 30, 78);

      // 타이머
      ctx.textAlign = "center";
      ctx.fillStyle = "#0b0b0b";
      roundRect(ctx, CW / 2 - 45, 22, 90, 52, 10);
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 34px system-ui";
      ctx.fillText(String(Math.max(0, Math.ceil(g.timer / 60))), CW / 2, 60);

      // 승리 표시 (동그라미)
      for (let i = 0; i < WINS_NEEDED; i++) {
        ctx.fillStyle = i < g.p1Wins ? "#ef4444" : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(30 + 14 + i * 34, 100, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = i < g.p2Wins ? "#3b82f6" : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(CW - 30 - 14 - i * 34, 100, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawHpBar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      hp: number,
      color: string,
      rightAlign: boolean
    ) => {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      roundRect(ctx, x - 3, y - 3, w + 6, 32, 6);
      ctx.fill();
      const ratio = Math.max(0, hp) / 100;
      const bw = w * ratio;
      ctx.fillStyle = color;
      if (rightAlign) {
        roundRect(ctx, x + (w - bw), y, bw, 26, 5);
      } else {
        roundRect(ctx, x, y, bw, 26, 5);
      }
      ctx.fill();
    };

    const roundRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [syncUI]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-purple-950 to-zinc-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-extrabold sm:text-3xl">🥊 2인 대전 격투</h1>
          <span
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              gpConnected ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"
            }`}
          >
            {gpConnected ? "🎮 패드 연결됨" : "🎮 패드 없음"}
          </span>
        </div>

        {/* 게임 화면 */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/40 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="block w-full"
            style={{ aspectRatio: `${CW} / ${CH}` }}
          />

          {/* 메뉴 오버레이 */}
          {uiPhase === "menu" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center">
              <h2 className="mb-2 text-4xl font-extrabold text-yellow-300 sm:text-5xl">
                🥊 2인 대전 격투
              </h2>
              <p className="mb-6 text-white/70">3판 2선승 · 먼저 상대 체력을 0으로!</p>
              <button
                onClick={startMatch}
                className="rounded-xl bg-gradient-to-r from-red-500 to-blue-500 px-10 py-4 text-xl font-bold shadow-lg transition hover:scale-105"
              >
                게임 시작
              </button>
            </div>
          )}

          {/* 매치 종료 오버레이 */}
          {uiPhase === "matchEnd" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-center">
              <h2
                className={`mb-4 text-5xl font-extrabold ${
                  matchWinner === 1 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {matchWinner === 1 ? "🏆 1P 승리!" : "🏆 2P 승리!"}
              </h2>
              <p className="mb-6 text-2xl font-bold text-white/80">
                {score.p1} : {score.p2}
              </p>
              <button
                onClick={startMatch}
                className="rounded-xl bg-gradient-to-r from-red-500 to-blue-500 px-10 py-4 text-xl font-bold shadow-lg transition hover:scale-105"
              >
                다시 하기
              </button>
            </div>
          )}
        </div>

        {/* 조작법 */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
            <h3 className="mb-3 text-lg font-bold text-red-300">🎮 1P (게임패드)</h3>
            <ul className="space-y-1 text-sm text-white/80">
              <li>이동: 왼쪽 스틱 / 방향패드</li>
              <li>점프: A 버튼</li>
              <li>펀치: X 버튼 · 킥: B 버튼</li>
              <li>막기: RB / RT</li>
              <li className="mt-2 text-white/50">패드 없으면 → W(점프) A/D(이동) F(펀치) G(킥) R(막기)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-5">
            <h3 className="mb-3 text-lg font-bold text-blue-300">⌨️ 2P (키보드)</h3>
            <ul className="space-y-1 text-sm text-white/80">
              <li>이동: ← / →</li>
              <li>점프: ↑</li>
              <li>펀치: , (쉼표) · 킥: . (마침표)</li>
              <li>막기: / (슬래시)</li>
              <li className="mt-2 text-white/50">킥은 데미지가 크지만 느려요. 막으면 데미지 대폭 감소!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
