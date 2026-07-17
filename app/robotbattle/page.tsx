"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// ----------------------------------------------------------------------------
// Robot Battle: 조립 → 충전 → 실시간 전투
// ----------------------------------------------------------------------------

type Screen = "menu" | "build" | "charge" | "battle" | "result";

interface BodyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  desc: string;
}
interface WeaponDef {
  id: "fist" | "laser" | "rocket";
  name: string;
  emoji: string;
  atk: number;
  mult: number;
  cd: number; // attack cooldown (frames)
  special: string;
}

const BODIES: BodyDef[] = [
  { id: "speed", name: "스피드형", hp: 90, speed: 3.0, desc: "체력 낮지만 빠름" },
  { id: "balance", name: "밸런스형", hp: 120, speed: 2.3, desc: "고른 능력치" },
  { id: "tank", name: "탱크형", hp: 160, speed: 1.7, desc: "체력 최강, 느림" },
];

const WEAPONS: WeaponDef[] = [
  { id: "fist", name: "강철 주먹", emoji: "👊", atk: 13, mult: 2.4, cd: 26, special: "어퍼컷" },
  { id: "laser", name: "레이저 캐논", emoji: "🔫", atk: 9, mult: 2.6, cd: 34, special: "레이저 빔" },
  { id: "rocket", name: "로켓 런처", emoji: "🚀", atk: 7, mult: 3.2, cd: 46, special: "미사일 폭격" },
];

const COLORS = [
  { id: "cyan", body: "#22d3ee", dark: "#0e7490" },
  { id: "red", body: "#f87171", dark: "#991b1b" },
  { id: "green", body: "#4ade80", dark: "#166534" },
  { id: "purple", body: "#c084fc", dark: "#6b21a8" },
  { id: "gold", body: "#fbbf24", dark: "#b45309" },
];

const W = 360;
const H = 460;
const FEET_Y = 320;
const ARENA_L = 46;
const ARENA_R = W - 46;
const MIN_GAP = 56;
const PROJ_Y = FEET_Y - 70;
const SPECIAL_COST = 40;

interface Build {
  body: BodyDef;
  weapon: WeaponDef;
  color: (typeof COLORS)[number];
}

interface Projectile {
  x: number;
  vx: number;
  owner: "player" | "enemy";
  dmg: number;
  kind: "laser" | "rocket";
  special: boolean;
}
interface DamageText {
  x: number;
  y: number;
  val: string;
  t: number;
  color: string;
}

interface Fighter {
  x: number;
  hp: number;
  max: number;
  energy: number;
  cd: number;
  lunge: number; // attack animation timer
  hit: number; // hit flash timer
  build: Build;
}

interface BattleState {
  p: Fighter;
  e: Fighter;
  projectiles: Projectile[];
  damages: DamageText[];
  bob: number;
  start: number; // countdown frames
  result: null | "win" | "lose";
  log: string;
  aiTimer: number;
}

export default function RobotBattlePage() {
  const [screen, setScreen] = useState<Screen>("menu");

  // build selections
  const [bodyIdx, setBodyIdx] = useState(1);
  const [weaponIdx, setWeaponIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);

  // charge
  const [chargePct, setChargePct] = useState(0);
  const [chargeTime, setChargeTime] = useState(5);
  const chargeActive = useRef(false);

  // battle
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const battleRef = useRef<BattleState | null>(null);
  const playerBuild = useRef<Build | null>(null);
  const rafRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef({ left: false, right: false, attack: false, special: false });
  const [, forceTick] = useState(0);

  const [best, setBest] = useState(0);
  useEffect(() => {
    const s = localStorage.getItem("robotbattle-wins");
    if (s) setBest(parseInt(s, 10) || 0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (resultTO.current) clearTimeout(resultTO.current);
    };
  }, []);

  // ----- Build -----
  const goCharge = () => {
    playerBuild.current = {
      body: BODIES[bodyIdx],
      weapon: WEAPONS[weaponIdx],
      color: COLORS[colorIdx],
    };
    setChargePct(0);
    setChargeTime(5);
    chargeActive.current = false;
    setScreen("charge");
  };

  // ----- Charge: rapid tap -----
  const startCharge = useCallback(() => {
    if (chargeActive.current) return;
    chargeActive.current = true;
    let t = 5.0;
    intervalRef.current = setInterval(() => {
      t -= 0.1;
      setChargeTime(Math.max(0, t));
      if (t <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        chargeActive.current = false;
        finishCharge();
      }
    }, 100);
  }, []);

  const tapCharge = () => {
    if (!chargeActive.current && chargeTime === 5) startCharge();
    if (chargeActive.current) setChargePct((p) => Math.min(100, p + 2.2));
  };

  const finishCharge = () => {
    setChargePct((pct) => {
      const startEnergy = (pct / 100) * 100; // 0..100 energy meter
      const hpBonus = Math.round((pct / 100) * 35);
      startBattle(startEnergy, hpBonus);
      return pct;
    });
  };

  // ----- Battle -----
  const startBattle = (startEnergy: number, hpBonus: number) => {
    const pb = playerBuild.current!;
    const eb: Build = {
      body: BODIES[Math.floor(Math.random() * BODIES.length)],
      weapon: WEAPONS[Math.floor(Math.random() * WEAPONS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    const pMax = pb.body.hp + hpBonus;
    const eMax = Math.round(eb.body.hp * 1.1);

    battleRef.current = {
      p: { x: 110, hp: pMax, max: pMax, energy: startEnergy, cd: 0, lunge: 0, hit: 0, build: pb },
      e: { x: 250, hp: eMax, max: eMax, energy: 40, cd: 0, lunge: 0, hit: 0, build: eb },
      projectiles: [],
      damages: [],
      bob: 0,
      start: 110,
      result: null,
      log: "",
      aiTimer: 0,
    };
    input.current = { left: false, right: false, attack: false, special: false };
    setScreen("battle");
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    forceTick((n) => n + 1);
  };

  // perform an attack for a fighter
  const doAttack = (b: BattleState, who: "player" | "enemy", special: boolean) => {
    const me = who === "player" ? b.p : b.e;
    const foe = who === "player" ? b.e : b.p;
    if (me.cd > 0) return;
    if (special && me.energy < SPECIAL_COST) return;
    const wpn = me.build.weapon;
    if (special) me.energy -= SPECIAL_COST;
    me.cd = special ? wpn.cd + 18 : wpn.cd;
    me.lunge = 16;

    const baseDmg = special
      ? Math.round((wpn.atk + 2) * wpn.mult) + Math.floor(Math.random() * 4)
      : wpn.atk + Math.floor(Math.random() * 4);

    const dir = who === "player" ? 1 : -1; // player shoots right

    if (wpn.id === "fist") {
      // melee: hit if in range
      const range = special ? 95 : 72;
      if (Math.abs(foe.x - me.x) <= range) {
        applyHit(b, who, baseDmg, special);
      }
    } else if (wpn.id === "laser") {
      b.projectiles.push({
        x: me.x + dir * 26,
        vx: dir * 11,
        owner: who,
        dmg: baseDmg,
        kind: "laser",
        special,
      });
    } else {
      b.projectiles.push({
        x: me.x + dir * 26,
        vx: dir * (special ? 6 : 5),
        owner: who,
        dmg: baseDmg,
        kind: "rocket",
        special,
      });
    }
  };

  const applyHit = (b: BattleState, attacker: "player" | "enemy", dmg: number, special: boolean) => {
    const foe = attacker === "player" ? b.e : b.p;
    foe.hp = Math.max(0, foe.hp - dmg);
    foe.hit = 12;
    b.damages.push({
      x: foe.x,
      y: PROJ_Y - 10,
      val: `-${dmg}`,
      t: 55,
      color: special ? "#f0abfc" : "#fca5a5",
    });
    if (foe.hp <= 0 && !b.result) {
      if (attacker === "player") {
        b.result = "win";
        b.log = "🎉 승리!";
        endBattle("win");
      } else {
        b.result = "lose";
        b.log = "💥 패배...";
        endBattle("lose");
      }
    }
  };

  const endBattle = (res: "win" | "lose") => {
    if (res === "win") {
      setBest((prev) => {
        const nb = prev + 1;
        localStorage.setItem("robotbattle-wins", String(nb));
        return nb;
      });
    }
    if (resultTO.current) clearTimeout(resultTO.current);
    resultTO.current = setTimeout(() => setScreen("result"), 1400);
  };

  // ----- Main real-time loop -----
  const loop = useCallback(() => {
    const b = battleRef.current;
    const canvas = canvasRef.current;
    if (!b || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    b.bob += 0.08;

    if (b.start > 0) {
      b.start--;
    } else if (!b.result) {
      // ----- Player movement -----
      const pSpeed = b.p.build.body.speed;
      if (input.current.left) b.p.x -= pSpeed;
      if (input.current.right) b.p.x += pSpeed;
      // attacks (held = repeat when cd ready)
      if (input.current.attack) doAttack(b, "player", false);
      if (input.current.special) {
        doAttack(b, "player", true);
        input.current.special = false; // special once per press
      }

      // ----- Enemy AI -----
      const e = b.e;
      const wpn = e.build.weapon;
      const dist = Math.abs(e.x - b.p.x);
      const desired = wpn.id === "fist" ? 64 : wpn.id === "rocket" ? 175 : 150;
      const eSpeed = e.build.body.speed * 0.9;
      if (dist > desired + 14) e.x -= eSpeed; // move toward player (player is left)
      else if (dist < desired - 14) e.x += eSpeed; // back off
      b.aiTimer--;
      if (e.cd <= 0 && b.aiTimer <= 0) {
        const inRange = wpn.id === "fist" ? dist <= 76 : true;
        if (inRange) {
          if (e.energy >= SPECIAL_COST && Math.random() < 0.35) doAttack(b, "enemy", true);
          else doAttack(b, "enemy", false);
          b.aiTimer = 10 + Math.floor(Math.random() * 20);
        }
      }

      // energy regen
      b.p.energy = Math.min(100, b.p.energy + 0.22);
      e.energy = Math.min(100, e.energy + 0.16);

      // clamp & separation (player always left of enemy)
      b.p.x = Math.max(ARENA_L, Math.min(ARENA_R, b.p.x));
      e.x = Math.max(ARENA_L, Math.min(ARENA_R, e.x));
      if (e.x - b.p.x < MIN_GAP) {
        const mid = (e.x + b.p.x) / 2;
        b.p.x = mid - MIN_GAP / 2;
        e.x = mid + MIN_GAP / 2;
        b.p.x = Math.max(ARENA_L, b.p.x);
        e.x = Math.min(ARENA_R, e.x);
      }

      // cooldowns / timers
      if (b.p.cd > 0) b.p.cd--;
      if (e.cd > 0) e.cd--;
    }
    if (b.p.lunge > 0) b.p.lunge--;
    if (b.e.lunge > 0) b.e.lunge--;
    if (b.p.hit > 0) b.p.hit--;
    if (b.e.hit > 0) b.e.hit--;

    // ----- Projectiles -----
    for (let i = b.projectiles.length - 1; i >= 0; i--) {
      const pr = b.projectiles[i];
      pr.x += pr.vx;
      const foe = pr.owner === "player" ? b.e : b.p;
      const hitX = pr.owner === "player" ? pr.x >= foe.x - 22 : pr.x <= foe.x + 22;
      if (!b.result && hitX) {
        applyHit(b, pr.owner, pr.dmg, pr.special);
        b.projectiles.splice(i, 1);
        continue;
      }
      if (pr.x < -20 || pr.x > W + 20) b.projectiles.splice(i, 1);
    }

    // ----- Damage texts -----
    for (let i = b.damages.length - 1; i >= 0; i--) {
      b.damages[i].y -= 0.7;
      b.damages[i].t--;
      if (b.damages[i].t <= 0) b.damages.splice(i, 1);
    }

    // ===== RENDER =====
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1220");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // floor
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, FEET_Y, W, H - FEET_Y);
    ctx.strokeStyle = "rgba(56,189,248,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FEET_Y);
    ctx.lineTo(W, FEET_Y);
    ctx.stroke();

    // lunge offsets
    const pLunge = b.p.lunge > 0 ? Math.sin((b.p.lunge / 16) * Math.PI) * 22 : 0;
    const eLunge = b.e.lunge > 0 ? Math.sin((b.e.lunge / 16) * Math.PI) * 22 : 0;
    const pShake = b.p.hit > 0 ? (b.p.hit % 2 ? 4 : -4) : 0;
    const eShake = b.e.hit > 0 ? (b.e.hit % 2 ? 4 : -4) : 0;

    drawRobot(ctx, b.p.x + pLunge + pShake, FEET_Y, 1, b.p.build, b.p.hp / b.p.max, b.bob);
    drawRobot(ctx, b.e.x - eLunge + eShake, FEET_Y, -1, b.e.build, b.e.hp / b.e.max, b.bob + 1);

    // projectiles
    for (const pr of b.projectiles) {
      if (pr.kind === "laser") {
        ctx.strokeStyle = pr.special ? "#f0abfc" : pr.owner === "player" ? "#67e8f9" : "#fca5a5";
        ctx.lineWidth = pr.special ? 6 : 3;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pr.x - pr.vx * 2.2, PROJ_Y);
        ctx.lineTo(pr.x, PROJ_Y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.font = `${pr.special ? 26 : 18}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        if (pr.owner === "enemy") {
          ctx.translate(pr.x, PROJ_Y);
          ctx.scale(-1, 1);
          ctx.fillText("🚀", 0, 0);
        } else {
          ctx.fillText("🚀", pr.x, PROJ_Y);
        }
        ctx.restore();
      }
    }

    // HP bars
    drawHPBar(ctx, 16, 18, 150, b.p.hp / b.p.max, "나", b.p.build.color.body);
    drawHPBar(ctx, W - 16 - 150, 18, 150, b.e.hp / b.e.max, "적", b.e.build.color.body);
    // player energy bar
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    rr(ctx, 16, 36, 150, 8, 4);
    ctx.fill();
    ctx.fillStyle = b.p.energy >= SPECIAL_COST ? "#fde047" : "#a16207";
    rr(ctx, 17, 37, (148 * b.p.energy) / 100, 6, 3);
    ctx.fill();

    // damage texts
    ctx.font = "bold 19px sans-serif";
    ctx.textAlign = "center";
    for (const d of b.damages) {
      ctx.globalAlpha = Math.min(1, d.t / 28);
      ctx.fillStyle = d.color;
      ctx.fillText(d.val, d.x, d.y);
    }
    ctx.globalAlpha = 1;

    // countdown / fight text
    if (b.start > 0) {
      const n = Math.ceil(b.start / 30);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n > 0 ? String(n) : "", W / 2, H / 2);
    } else if (b.start === 0 && !b.result) {
      // flash FIGHT briefly using a derived window
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const restart = () => {
    cancelAnimationFrame(rafRef.current);
    if (resultTO.current) clearTimeout(resultTO.current);
    setScreen("build");
  };

  // ----- Keyboard -----
  useEffect(() => {
    if (screen !== "battle") return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") input.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") input.current.right = true;
      if (e.key === " " || e.key === "z" || e.key === "ArrowUp") {
        e.preventDefault();
        input.current.attack = true;
      }
      if (e.key === "x" || e.key === "Shift") input.current.special = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") input.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") input.current.right = false;
      if (e.key === " " || e.key === "z" || e.key === "ArrowUp") input.current.attack = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [screen]);

  const b = battleRef.current;
  const myWin = b?.result === "win";

  // hold helpers for touch buttons
  const hold = (key: "left" | "right" | "attack") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input.current[key] = true;
    },
    onPointerUp: () => (input.current[key] = false),
    onPointerLeave: () => (input.current[key] = false),
    onPointerCancel: () => (input.current[key] = false),
  });

  return (
    <main className="flex min-h-screen flex-col items-center gap-3 bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-5 text-white">
      <div className="flex w-full max-w-[360px] items-center justify-between">
        <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
          ← 홈
        </Link>
        <h1 className="text-lg font-bold text-cyan-300">🤖 로봇 배틀</h1>
        <div className="w-12 text-right text-xs text-cyan-200/70">🏆{best}</div>
      </div>

      {/* MENU */}
      {screen === "menu" && (
        <div className="mt-8 flex w-full max-w-[360px] flex-col items-center gap-6 rounded-2xl bg-slate-800/60 p-8 text-center">
          <div className="text-7xl">🤖</div>
          <h2 className="text-2xl font-extrabold text-cyan-300">로봇 배틀</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            나만의 로봇을 <span className="text-cyan-300">조립</span>하고
            <br />
            <span className="text-yellow-300">충전</span>한 다음
            <br />
            <span className="text-red-300">실시간</span>으로 움직이며 싸워라!
          </p>
          <button
            onClick={() => setScreen("build")}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-10 py-3 text-lg font-bold text-slate-900 shadow-lg active:scale-95"
          >
            시작하기 🤖
          </button>
        </div>
      )}

      {/* BUILD */}
      {screen === "build" && (
        <div className="flex w-full max-w-[360px] flex-col gap-4">
          <RobotPreview body={BODIES[bodyIdx]} weapon={WEAPONS[weaponIdx]} color={COLORS[colorIdx]} />
          <Section title="🦾 몸통">
            {BODIES.map((bd, i) => (
              <Choice key={bd.id} active={i === bodyIdx} onClick={() => setBodyIdx(i)}>
                <div className="font-bold">{bd.name}</div>
                <div className="text-[11px] opacity-80">❤️{bd.hp} · {bd.desc}</div>
              </Choice>
            ))}
          </Section>
          <Section title="⚔️ 무기">
            {WEAPONS.map((wp, i) => (
              <Choice key={wp.id} active={i === weaponIdx} onClick={() => setWeaponIdx(i)}>
                <div className="font-bold">{wp.emoji} {wp.name}</div>
                <div className="text-[11px] opacity-80">공격{wp.atk} · 필살기 {wp.special}</div>
              </Choice>
            ))}
          </Section>
          <Section title="🎨 색상">
            <div className="flex gap-2">
              {COLORS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setColorIdx(i)}
                  className={`h-9 w-9 rounded-full border-2 ${i === colorIdx ? "border-white" : "border-transparent"}`}
                  style={{ background: c.body }}
                />
              ))}
            </div>
          </Section>
          <button
            onClick={goCharge}
            className="mt-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-lg font-bold text-slate-900 shadow-lg active:scale-95"
          >
            조립 완료! 충전하러 가기 ⚡
          </button>
        </div>
      )}

      {/* CHARGE */}
      {screen === "charge" && (
        <div className="mt-4 flex w-full max-w-[360px] flex-col items-center gap-5 rounded-2xl bg-slate-800/60 p-6 text-center">
          <h2 className="text-xl font-bold text-yellow-300">⚡ 충전소</h2>
          <p className="text-sm text-slate-300">
            버튼을 <span className="font-bold text-yellow-300">빠르게 연타</span>해서
            <br />5초 안에 배터리를 가득 채워라!
          </p>
          <div className="text-sm text-slate-400">남은 시간: <span className="font-bold text-white">{chargeTime.toFixed(1)}s</span></div>
          <div className="relative h-44 w-24 rounded-xl border-4 border-slate-500 bg-slate-900 p-1">
            <div className="absolute -top-3 left-1/2 h-3 w-8 -translate-x-1/2 rounded-t bg-slate-500" />
            <div
              className="absolute bottom-1 left-1 right-1 rounded-md"
              style={{
                height: `${chargePct}%`,
                background: chargePct >= 80 ? "#4ade80" : chargePct >= 45 ? "#fde047" : "#f97316",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-white drop-shadow">
              {Math.round(chargePct)}%
            </div>
          </div>
          <button
            onPointerDown={tapCharge}
            disabled={chargeTime === 0}
            className="w-full select-none rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-5 text-2xl font-extrabold text-slate-900 shadow-lg active:scale-95 disabled:opacity-50"
          >
            {chargeTime === 5 && !chargeActive.current ? "눌러서 시작! ⚡" : "연타! ⚡⚡⚡"}
          </button>
          <p className="text-xs text-slate-400">충전이 높을수록 시작 에너지와 체력이 늘어나요</p>
        </div>
      )}

      {/* BATTLE */}
      {screen === "battle" && (
        <div className="flex w-full max-w-[360px] flex-col gap-3">
          <div
            className="overflow-hidden rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.2)]"
            style={{ width: W, height: H, maxWidth: "100%" }}
          >
            <canvas ref={canvasRef} width={W} height={H} className="h-full w-full touch-none" />
          </div>

          {/* controls */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex gap-2">
              <CtrlBtn {...hold("left")}>◀</CtrlBtn>
              <CtrlBtn {...hold("right")}>▶</CtrlBtn>
            </div>
            <div className="flex gap-2">
              <CtrlBtn {...hold("attack")} className="from-red-500 to-rose-600 text-white">
                ⚔️
              </CtrlBtn>
              <CtrlBtn
                onPointerDown={(e) => {
                  e.preventDefault();
                  input.current.special = true;
                }}
                className="from-purple-500 to-fuchsia-600 text-white"
              >
                💥
              </CtrlBtn>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">
            ◀▶ 이동 · ⚔️ 공격(꾹) · 💥 필살기(에너지 필요) · 키보드 ←→ / Z / X
          </p>
        </div>
      )}

      {/* RESULT */}
      {screen === "result" && (
        <div className="mt-8 flex w-full max-w-[360px] flex-col items-center gap-5 rounded-2xl bg-slate-800/60 p-8 text-center">
          <div className="text-7xl">{myWin ? "🏆" : "💥"}</div>
          <h2 className={`text-3xl font-extrabold ${myWin ? "text-yellow-300" : "text-red-400"}`}>
            {myWin ? "승리!" : "패배..."}
          </h2>
          <p className="text-sm text-slate-300">{myWin ? "적 로봇을 격파했어요!" : "다음엔 더 강하게 조립해봐요!"}</p>
          <div className="text-sm text-cyan-200/80">누적 승리: 🏆 {best}</div>
          <div className="flex gap-3">
            <button onClick={restart} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-bold text-slate-900 active:scale-95">
              다시 만들기 🔧
            </button>
            <Link href="/" className="rounded-full bg-white/10 px-6 py-3 font-bold active:scale-95">
              홈으로
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

// ----------------------------------------------------------------------------
// UI sub-components
// ----------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-3">
      <div className="mb-2 text-sm font-bold text-cyan-300">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm transition ${
        active ? "bg-cyan-500/30 ring-2 ring-cyan-400" : "bg-slate-700/50 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
function CtrlBtn({
  children,
  className = "from-slate-600 to-slate-700 text-white",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`h-16 w-16 touch-none rounded-2xl bg-gradient-to-b text-2xl font-bold shadow active:scale-90 ${className}`}
    >
      {children}
    </button>
  );
}

function RobotPreview({ body, weapon, color }: { body: BodyDef; weapon: WeaponDef; color: (typeof COLORS)[number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 200, 170);
    drawRobot(ctx, 100, 155, 1, { body, weapon, color }, 1, 0);
  }, [body, weapon, color]);
  return (
    <div className="flex items-center justify-center rounded-xl bg-slate-900/70 py-2">
      <canvas ref={ref} width={200} height={170} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Robot drawing
// ----------------------------------------------------------------------------
function drawRobot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feetY: number,
  facing: 1 | -1,
  build: Build,
  hpRatio: number,
  bob: number
) {
  const { body, weapon, color } = build;
  const scale = body.id === "tank" ? 1.18 : body.id === "speed" ? 0.92 : 1;
  const bw = 50 * scale;
  const bh = 50 * scale;
  const by = feetY - 40 - bh;
  const bobY = Math.sin(bob) * 3;

  ctx.save();
  ctx.translate(cx, bobY);

  // legs
  ctx.fillStyle = color.dark;
  rr(ctx, -bw / 2 + 6, by + bh - 4, 12, 40, 4);
  ctx.fill();
  rr(ctx, bw / 2 - 18, by + bh - 4, 12, 40, 4);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  rr(ctx, -bw / 2 + 2, feetY - 10, 18, 10, 3);
  ctx.fill();
  rr(ctx, bw / 2 - 20, feetY - 10, 18, 10, 3);
  ctx.fill();

  // body
  const grd = ctx.createLinearGradient(0, by, 0, by + bh);
  grd.addColorStop(0, color.body);
  grd.addColorStop(1, color.dark);
  ctx.fillStyle = grd;
  rr(ctx, -bw / 2, by, bw, bh, 10);
  ctx.fill();
  ctx.fillStyle = hpRatio > 0.3 ? "#fde047" : "#ef4444";
  ctx.beginPath();
  ctx.arc(0, by + bh / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  // head
  const hw = 30 * scale;
  const hh = 24 * scale;
  ctx.fillStyle = color.dark;
  rr(ctx, -hw / 2, by - hh - 4, hw, hh, 7);
  ctx.fill();
  ctx.fillStyle = hpRatio > 0.3 ? "#67e8f9" : "#ef4444";
  const ey = by - hh / 2 - 4;
  ctx.beginPath();
  ctx.arc(facing * 5, ey, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(facing * 5 - facing * 11, ey, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color.body;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, by - hh - 4);
  ctx.lineTo(0, by - hh - 14);
  ctx.stroke();
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(0, by - hh - 16, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // weapon arm
  const armX = facing * (bw / 2);
  const armY = by + 16;
  ctx.fillStyle = color.dark;
  rr(ctx, facing > 0 ? armX : armX - 22, armY, 22, 10, 4);
  ctx.fill();
  const tipX = armX + facing * 22;
  ctx.font = "20px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  if (facing < 0) {
    ctx.translate(tipX, armY + 5);
    ctx.scale(-1, 1);
    ctx.fillText(weapon.emoji, 0, 0);
  } else {
    ctx.fillText(weapon.emoji, tipX, armY + 5);
  }
  ctx.restore();

  ctx.fillStyle = color.dark;
  rr(ctx, facing > 0 ? -bw / 2 - 8 : bw / 2 - 14, armY + 2, 22, 9, 4);
  ctx.fill();

  ctx.restore();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawHPBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ratio: number,
  label: string,
  color: string
) {
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  rr(ctx, x, y, w, 14, 5);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#fbbf24" : "#ef4444";
  rr(ctx, x + 2, y + 2, Math.max(0, (w - 4) * ratio), 10, 4);
  ctx.fill();
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, y - 2);
}