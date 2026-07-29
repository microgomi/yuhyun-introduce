"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ───── 효과음 ─────
let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.09) {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; ac = new AC();
    }
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sHit = () => { beep(180, 0.07, "sawtooth", 0.12); beep(90, 0.1, "square", 0.1); };
const sCrit = () => { beep(300, 0.06, "square", 0.13); setTimeout(() => beep(600, 0.1, "sawtooth", 0.12), 40); };
const sSwing = () => beep(480, 0.05, "triangle", 0.05);
const sKo = () => { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => beep(f, 0.18, "square", 0.11), i * 120)); };
const sTurn = () => beep(660, 0.08, "triangle", 0.07);

const W = 360, H = 340, GROUND = 300;
const SHOULDER_Y = 190, HEAD_Y = 165, HEAD_R = 15, HIP_Y = 245, FOOT_Y = GROUND;
const SAVE = "bodyfighter_best";
const PX = 138, CX = 214; // 고정 위치 (턴제)

type Kind = "punch" | "kick" | "smash" | "slam" | "spin";
// 공격별 설정: origin(어깨/엉덩이), 사거리, 데미지
const KIND: Record<Kind, { origin: "sh" | "hip"; base: number; reach: number; dmg: number }> = {
  punch: { origin: "sh", base: 14, reach: 60, dmg: 9 },
  kick: { origin: "hip", base: 18, reach: 92, dmg: 15 },
  smash: { origin: "sh", base: 16, reach: 82, dmg: 22 },
  slam: { origin: "sh", base: 16, reach: 88, dmg: 18 },
  spin: { origin: "hip", base: 18, reach: 98, dmg: 19 },
};
const legKind = (k: Kind) => k === "kick" || k === "spin";
const armKind = (k: Kind) => k === "punch" || k === "smash" || k === "slam";
type Attack = { active: boolean; t: number; hitDone: boolean; kind: Kind; aim: number; air: boolean };
type Fighter = { x: number; hp: number; aim: number; legAim: number; atk: Attack; hurtT: number; yOff: number; jumpT: number };
const mkFighter = (x: number): Fighter => ({ x, hp: 100, aim: -0.2, legAim: 0.05, atk: { active: false, t: 0, hitDone: false, kind: "punch", aim: -0.2, air: false }, hurtT: 0, yOff: 0, jumpT: 0 });

function limbTip(f: Fighter, dir: number, kind: Kind, ext: number) {
  const cfg = KIND[kind];
  const originY = (cfg.origin === "sh" ? SHOULDER_Y : HIP_Y) + f.yOff;
  const aim = f.atk.aim;
  const len = cfg.base + cfg.reach * ext;
  return { x: f.x + dir * len * Math.cos(aim), y: originY + len * Math.sin(aim) };
}

export default function MotionFighter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phP, setPhP] = useState(100);
  const [chP, setChP] = useState(100);
  const [phase, setPhase] = useState<"fight" | "ko">("fight");
  const [turn, setTurn] = useState<"p" | "c">("p");
  const [pWins, setPWins] = useState(0);
  const [cWins, setCWins] = useState(0);
  const [msg, setMsg] = useState("내 차례! 조준하고 공격!");

  const g = useRef({
    p: mkFighter(PX), c: mkFighter(CX), turn: "p" as "p" | "c", cpuTimer: 0, over: false,
    shake: 0, combo: 0, comboT: 0, pHit: false,
    parts: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    pops: [] as { x: number; y: number; txt: string; life: number; big: boolean }[],
  });
  const [combo, setCombo] = useState(0);
  const [airborne, setAirborne] = useState(false);
  const airborneRef = useRef(false);
  const held = useRef({ aimUp: false, aimDown: false, legUp: false, legDown: false });
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const resetRound = useCallback((keepWins: boolean) => {
    g.current.p = mkFighter(PX); g.current.c = mkFighter(CX);
    g.current.turn = "p"; g.current.over = false; g.current.cpuTimer = 0;
    setPhP(100); setChP(100); setMsg("내 차례! 조준하고 공격!"); setPhase("fight"); setTurn("p");
    if (!keepWins) { setPWins(0); setCWins(0); }
  }, []);

  const doAttack = useCallback((kind: Kind) => {
    const S = g.current;
    if (phaseRef.current !== "fight" || S.over || S.turn !== "p" || S.p.atk.active) return;
    const air = S.p.yOff < -6;
    if (kind === "slam" && !air) { setMsg("⬇️내려찍기는 ⬆️점프 중에만 써요!"); return; } // 점프 전용
    const a = S.p.atk;
    S.pHit = false; // 이번 공격 명중 여부
    a.active = true; a.t = 0; a.hitDone = false; a.kind = kind; a.air = air;
    if (legKind(kind)) a.aim = S.p.legAim;
    else if (kind === "slam") a.aim = air ? 1.2 : 0.85; // 내려찍기: 아래로 (점프 중이면 더 급하게)
    else a.aim = S.p.aim; // punch / smash = 팔 각도
    if (kind === "smash") beep(160, 0.14, "square", 0.12);
    else if (kind === "slam") beep(120, 0.16, "sawtooth", 0.12);
    else if (kind === "spin") { beep(400, 0.06, "triangle", 0.08); setTimeout(() => beep(550, 0.08, "triangle", 0.08), 60); }
    else sSwing();
  }, []);

  const checkHit = (tip: { x: number; y: number }, target: Fighter): "head" | "body" | null => {
    const hy = HEAD_Y + target.yOff, py = HIP_Y + target.yOff;
    const dh = Math.hypot(tip.x - target.x, tip.y - hy);
    if (dh < HEAD_R + 8) return "head";
    if (tip.x > target.x - 16 && tip.x < target.x + 16 && tip.y > hy + 8 && tip.y < py + 6) return "body";
    return null;
  };

  const doJump = useCallback(() => {
    const S = g.current;
    if (phaseRef.current !== "fight" || S.over || S.turn !== "p" || S.p.jumpT > 0 || S.p.atk.active) return;
    S.p.jumpT = 0.7; beep(520, 0.1, "sine", 0.08);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0, last = performance.now();

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const S = g.current;
      const p = S.p, c = S.c;

      if (phaseRef.current === "fight" && !S.over) {
        // 내 차례: 팔/다리 조준 (각도 제한 없음 — 360도 자유)
        if (S.turn === "p") {
          if (held.current.aimUp) p.aim -= 2.2 * dt;
          if (held.current.aimDown) p.aim += 2.2 * dt;
          if (held.current.legUp) p.legAim -= 2.2 * dt;
          if (held.current.legDown) p.legAim += 2.2 * dt;
        }

        // 점프 물리 (yOff: 위로 떴다가 착지)
        const jumpUpdate = (f: Fighter) => {
          if (f.jumpT > 0) {
            f.jumpT -= dt;
            const prog = Math.max(0, Math.min(1, 1 - f.jumpT / 0.7));
            f.yOff = -78 * Math.sin(prog * Math.PI);
            if (f.jumpT <= 0) { f.jumpT = 0; f.yOff = 0; }
          }
        };
        jumpUpdate(p); jumpUpdate(c);
        const airNow = p.yOff < -6;
        if (airNow !== airborneRef.current) { airborneRef.current = airNow; setAirborne(airNow); }

        // 공격 진행 + 히트 → 끝나면 턴 넘김
        const advance = (f: Fighter, dir: number, target: Fighter, isPlayer: boolean): boolean => {
          const a = f.atk;
          if (!a.active) return false;
          a.t += dt / 0.32;
          const ext = Math.sin(Math.min(1, a.t) * Math.PI);
          if (!a.hitDone && a.t > 0.35 && a.t < 0.7) {
            const tip = limbTip(f, dir, a.kind, ext);
            const res = checkHit(tip, target);
            if (res) {
              a.hitDone = true;
              let baseDmg = KIND[a.kind].dmg;
              if (a.air) baseDmg = Math.round(baseDmg * 1.5); // 점프 공격 보너스
              const dmg = res === "head" ? Math.round(baseDmg * 1.8) : baseDmg;
              target.hp = Math.max(0, target.hp - dmg);
              target.hurtT = 0.3;
              target.x = Math.max(40, Math.min(320, target.x + (isPlayer ? 1 : -1) * (res === "head" ? 14 : 7))); // 넉백
              if (res === "head") sCrit(); else sHit();
              setMsg(`${a.air ? "점프 " : ""}${isPlayer ? "적" : "나"}에게 ${dmg}!${res === "head" ? " 크리티컬! 💥" : ""}`);
              // 콤보 갱신
              if (isPlayer) { S.pHit = true; S.combo++; S.comboT = 2.0; setCombo(S.combo); }
              else { S.combo = 0; setCombo(0); }
              // 💥 도파민 연출 (콤보 쌓일수록 배로 커짐!)
              const cm = 1 + Math.min(S.combo, 15) * 0.5;
              const tx = target.x, ty = HEAD_Y + target.yOff + (res === "body" ? 28 : 0);
              const big = res === "head" || a.air || KIND[a.kind].dmg >= 18;
              S.shake = Math.min(36, S.shake + (big ? 13 : 6) * cm);
              const pc = res === "head" ? "#fde047" : big ? "#fb7185" : "#93c5fd";
              const cnt = Math.min(70, Math.floor((big ? 18 : 9) * cm));
              for (let i = 0; i < cnt; i++) {
                const ang = Math.random() * Math.PI * 2, sp = (50 + Math.random() * (big ? 180 : 90)) * Math.min(2.2, cm);
                S.parts.push({ x: tx, y: ty, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, life: 0.5 + Math.random() * 0.5, c: i % 5 === 0 ? "#fff" : pc });
              }
              S.pops.push({ x: tx, y: ty - 18, txt: `${res === "head" ? "★" : ""}${dmg}`, life: 0.9, big: big || S.combo >= 3 });
              if (isPlayer && S.combo >= 2) S.pops.push({ x: W / 2, y: 46, txt: `${S.combo} COMBO!! 🔥${S.combo >= 5 ? "🔥🔥" : ""}`, life: 1.15, big: true });
            }
          }
          if (a.t >= 1) { a.active = false; a.t = 0; if (!a.hitDone) { setMsg(`${isPlayer ? "나" : "적"}: 빗나감!`); if (isPlayer && S.combo !== 0) { S.combo = 0; setCombo(0); } } return true; }
          return false;
        };
        const pDone = advance(p, 1, c, true);
        const cDone = advance(c, -1, p, false);

        if (p.hurtT > 0) p.hurtT -= dt;
        if (c.hurtT > 0) c.hurtT -= dt;

        // 턴 전환 — 맞히면 콤보로 계속 공격! (최대 6연타)
        if (pDone && S.turn === "p" && !S.over && c.hp > 0) {
          if (S.pHit && S.combo < 6) { setMsg(`${S.combo} 콤보! 계속 공격! 🔥`); }
          else { S.turn = "c"; S.cpuTimer = 0.8; sTurn(); }
        }
        if (cDone && S.turn === "c" && !S.over && p.hp > 0) { S.turn = "p"; sTurn(); setMsg("내 차례! 조준하고 공격!"); }

        // CPU 차례: 잠깐 생각 후 조준+공격
        if (S.turn === "c" && !c.atk.active && !S.over && c.hp > 0) {
          S.cpuTimer -= dt;
          if (S.cpuTimer <= 0) {
            const air = Math.random() < 0.3; // 가끔 점프 공격
            if (air) c.jumpT = 0.7;
            const r2 = Math.random();
            let kind: Kind;
            if (air && r2 < 0.5) kind = "slam";
            else kind = r2 < 0.35 ? "punch" : r2 < 0.58 ? "kick" : r2 < 0.78 ? "smash" : "spin";
            c.aim = kind === "slam" ? (air ? 1.2 : 0.85) : (Math.random() < 0.55 ? -0.35 : 0.08) + (Math.random() - 0.5) * 0.25;
            c.atk.active = true; c.atk.t = 0; c.atk.hitDone = false; c.atk.kind = kind; c.atk.aim = c.aim; c.atk.air = air;
            sSwing();
          }
        }

        // KO
        if (p.hp <= 0 || c.hp <= 0) {
          S.over = true;
          const pWin = c.hp <= 0;
          sKo(); setPhase("ko");
          setMsg(pWin ? "K.O.! 승리! 🎉" : "K.O.! 패배... 💀");
          if (pWin) setPWins((v) => v + 1); else setCWins((v) => v + 1);
        }
        setPhP(p.hp); setChP(c.hp);
        if (S.turn !== turnRef.current) { turnRef.current = S.turn; setTurn(S.turn); }
      }

      // 연출 물리 (항상 갱신)
      if (S.shake > 0) S.shake = Math.max(0, S.shake - 55 * dt);
      for (const pa of S.parts) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 320 * dt; pa.life -= dt; }
      if (S.parts.length) S.parts = S.parts.filter((pa) => pa.life > 0);
      for (const po of S.pops) { po.y -= 34 * dt; po.life -= dt; }
      if (S.pops.length) S.pops = S.pops.filter((po) => po.life > 0);
      if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0 && S.combo !== 0) { S.combo = 0; setCombo(0); } }

      // 렌더
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1e1b4b"); grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
      ctx.fillStyle = "#312e81"; ctx.fillRect(-20, GROUND + 8, W + 40, H - GROUND + 20);
      ctx.fillStyle = S.turn === "p" ? "rgba(56,189,248,0.15)" : "rgba(251,113,133,0.15)";
      ctx.fillRect(S.turn === "p" ? -20 : W / 2, -20, W / 2 + 20, H + 40);
      drawFighter(ctx, p, 1, "#38bdf8", true);
      drawFighter(ctx, c, -1, "#fb7185", false);
      // 파편
      for (const pa of S.parts) { ctx.globalAlpha = Math.min(1, pa.life * 2.5); ctx.fillStyle = pa.c; ctx.beginPath(); ctx.arc(pa.x, pa.y, 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // 데미지 팝업
      ctx.textAlign = "center";
      for (const po of S.pops) { ctx.globalAlpha = Math.min(1, po.life * 1.6); ctx.fillStyle = po.big ? "#fde047" : "#fff"; ctx.font = `900 ${po.big ? 24 : 15}px sans-serif`; ctx.fillText(po.txt, po.x, po.y); }
      ctx.globalAlpha = 1;
      ctx.restore();
    };
    const turnRef = { current: "p" as "p" | "c" };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, dir: number, color: string, isPlayer: boolean) {
    const x = f.x, oy = f.yOff;
    const shY = SHOULDER_Y + oy, hdY = HEAD_Y + oy, hipY = HIP_Y + oy;
    const hurt = f.hurtT > 0;
    ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.strokeStyle = hurt ? "#ef4444" : color; ctx.fillStyle = hurt ? "#ef4444" : color;

    // 조준선 (플레이어 차례에만): 팔(노랑) + 다리(주황)
    const showAim = isPlayer && !f.atk.active && phaseRef.current === "fight" && g.current.turn === "p" && !g.current.over;
    if (showAim) {
      ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(250,204,21,0.65)"; // 팔
      ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x + dir * 82 * Math.cos(f.aim), shY + 82 * Math.sin(f.aim)); ctx.stroke();
      ctx.strokeStyle = "rgba(251,146,60,0.65)"; // 다리
      ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + dir * 100 * Math.cos(f.legAim), hipY + 100 * Math.sin(f.legAim)); ctx.stroke();
      ctx.restore();
    }

    const atkExt = f.atk.active ? Math.sin(Math.min(1, f.atk.t) * Math.PI) : 0;
    const legAtk = f.atk.active && legKind(f.atk.kind);
    const armAtk = f.atk.active && armKind(f.atk.kind);
    const spinning = f.atk.active && f.atk.kind === "spin";

    // 돌려차기: 몸 전체 회전
    ctx.save();
    if (spinning) { const ang = Math.sin(Math.min(1, f.atk.t) * Math.PI) * dir * 1.0; ctx.translate(x, hipY - 25); ctx.rotate(ang); ctx.translate(-x, -(hipY - 25)); }
    ctx.strokeStyle = hurt ? "#ef4444" : color; ctx.fillStyle = hurt ? "#ef4444" : color;

    // 다리
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - dir * 12, FOOT_Y + oy); ctx.stroke();
    if (legAtk) {
      const foot = limbTip(f, dir, f.atk.kind, atkExt);
      ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(foot.x, foot.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(foot.x, foot.y, 5, 0, 7); ctx.fill();
    } else { ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + dir * 10, FOOT_Y + oy); ctx.stroke(); }

    // 몸통 + 뒷팔
    ctx.beginPath(); ctx.moveTo(x, hdY + HEAD_R); ctx.lineTo(x, hipY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x - dir * 14, shY + 18); ctx.stroke();

    // 앞팔/주먹 (펀치·스매쉬·내려찍기 = 뻗음, 아니면 조준 방향)
    let fist: { x: number; y: number };
    if (armAtk) fist = limbTip(f, dir, f.atk.kind, atkExt);
    else { const len = 14 + 60 * 0.12; fist = { x: x + dir * len * Math.cos(f.aim), y: shY + len * Math.sin(f.aim) }; }
    ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(fist.x, fist.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(fist.x, fist.y, 6, 0, 7); ctx.fill();
    // 내려찍기 = 두 손 모아 내리찍기
    if (f.atk.active && f.atk.kind === "slam") {
      ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(fist.x + dir * 5, fist.y - 3); ctx.stroke();
      ctx.beginPath(); ctx.arc(fist.x + dir * 5, fist.y - 3, 6, 0, 7); ctx.fill();
    }

    // 머리
    ctx.beginPath(); ctx.arc(x, hdY, HEAD_R, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + dir * 5, hdY - 2, 2.5, 0, 7); ctx.fill();
    ctx.restore();
  }

  const setHold = (k: keyof typeof held.current, v: boolean) => { held.current[k] = v; };
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": case "w": case "W": setHold("aimUp", true); break;
        case "ArrowDown": case "s": case "S": setHold("aimDown", true); break;
        case "ArrowLeft": setHold("legUp", true); break;
        case "ArrowRight": setHold("legDown", true); break;
        case " ": case "z": case "Z": e.preventDefault(); doJump(); break;
        case "j": case "J": doAttack("punch"); break;
        case "k": case "K": doAttack("kick"); break;
        case "l": case "L": doAttack("smash"); break;
        case "o": case "O": doAttack("slam"); break;
        case "u": case "U": doAttack("spin"); break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) setHold("aimUp", false);
      if (["ArrowDown", "s", "S"].includes(e.key)) setHold("aimDown", false);
      if (e.key === "ArrowLeft") setHold("legUp", false);
      if (e.key === "ArrowRight") setHold("legDown", false);
    };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [doAttack, doJump]);

  const matchOver = pWins >= 3 || cWins >= 3;
  const myTurn = turn === "p" && phase === "fight";
  const holdBtn = (k: keyof typeof held.current, label: string) => (
    <button
      onMouseDown={() => setHold(k, true)} onMouseUp={() => setHold(k, false)} onMouseLeave={() => setHold(k, false)}
      onTouchStart={(e) => { e.preventDefault(); setHold(k, true); }} onTouchEnd={() => setHold(k, false)}
      disabled={!myTurn}
      className={`rounded-xl py-4 text-lg font-black active:scale-90 select-none ${myTurn ? "bg-indigo-700 active:bg-indigo-600" : "bg-slate-800 text-slate-500"}`}
    >{label}</button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-purple-300 text-sm">← 홈</Link>
          <h1 className="text-lg font-black">🥋 모션파이터 (턴제)</h1>
          <span className="text-xs text-amber-300">{"⭐".repeat(pWins)}:{"⭐".repeat(cWins)}</span>
        </div>

        {/* 차례 배너 */}
        <div className={`mb-2 rounded-lg py-1 text-center text-sm font-black ${myTurn ? "bg-sky-500/30 text-sky-200" : phase === "fight" ? "bg-red-500/30 text-red-200" : "bg-slate-700 text-slate-300"}`}>
          {phase === "ko" ? "라운드 종료" : myTurn ? "🔵 내 차례!" : "🔴 적 차례..."}
        </div>

        {/* HP */}
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-sky-300 w-8">나</span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${phP}%` }} /></div>
        </div>
        <div className="flex items-center gap-2 mb-2 text-xs font-bold">
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden flex justify-end"><div className="h-full bg-gradient-to-l from-red-400 to-orange-400" style={{ width: `${chP}%` }} /></div>
          <span className="text-red-300 w-8 text-right">적</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-purple-700/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full bg-slate-900" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-black text-yellow-300 drop-shadow px-2 text-center">{msg}</div>
          {combo >= 2 && (
            <div className="absolute top-2 right-2 text-right animate-pulse">
              <div className="text-2xl font-black text-orange-400 drop-shadow">{combo}<span className="text-sm"> COMBO</span></div>
            </div>
          )}
          {phase === "ko" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-4">
              <div className="text-5xl">{chP <= 0 ? "🏆" : "💀"}</div>
              <h2 className={`text-2xl font-black ${chP <= 0 ? "text-yellow-300" : "text-red-400"}`}>{msg}</h2>
              {matchOver ? <p className="text-sm font-bold">{pWins >= 3 ? "🎉 매치 승리! 챔피언!" : "😢 매치 패배..."} ({pWins}:{cWins})</p>
                : <p className="text-xs text-gray-300">3선승제 · {pWins}:{cWins}</p>}
              <button onClick={() => resetRound(!matchOver)} className="mt-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-black active:scale-95">
                {matchOver ? "🔄 새 매치" : "다음 라운드 ⚔️"}
              </button>
            </div>
          )}
        </div>

        {/* 조작: 팔·다리 각도 + 점프 */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {holdBtn("aimUp", "🔼팔")}
          {holdBtn("aimDown", "🔽팔")}
          {holdBtn("legUp", "🔼다리")}
          {holdBtn("legDown", "🔽다리")}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <button onClick={doJump} disabled={!myTurn} className={`rounded-xl py-3.5 text-base font-black active:scale-90 ${myTurn ? "bg-purple-600 active:bg-purple-500" : "bg-slate-800 text-slate-500"}`}>⬆️ 점프</button>
          <button onClick={() => doAttack("punch")} disabled={!myTurn} className={`rounded-xl py-3.5 text-base font-black active:scale-90 ${myTurn ? "bg-amber-600 active:bg-amber-500" : "bg-slate-800 text-slate-500"}`}>👊 펀치</button>
          <button onClick={() => doAttack("kick")} disabled={!myTurn} className={`rounded-xl py-3.5 text-base font-black active:scale-90 ${myTurn ? "bg-orange-600 active:bg-orange-500" : "bg-slate-800 text-slate-500"}`}>🦵 킥</button>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <button onClick={() => doAttack("smash")} disabled={!myTurn} className={`rounded-xl py-3.5 text-sm font-black active:scale-90 ${myTurn ? "bg-red-600 active:bg-red-500" : "bg-slate-800 text-slate-500"}`}>💥 스매쉬</button>
          <button onClick={() => doAttack("slam")} disabled={!myTurn || !airborne} className={`rounded-xl py-3.5 text-sm font-black active:scale-90 ${myTurn && airborne ? "bg-rose-600 active:bg-rose-500 animate-pulse" : "bg-slate-800 text-slate-500"}`}>⬇️ 내려찍기{airborne ? "!" : "🔒"}</button>
          <button onClick={() => doAttack("spin")} disabled={!myTurn} className={`rounded-xl py-3.5 text-sm font-black active:scale-90 ${myTurn ? "bg-fuchsia-700 active:bg-fuchsia-600" : "bg-slate-800 text-slate-500"}`}>🌀 돌려차기</button>
        </div>
        <p className="text-center text-[11px] text-gray-300 mt-2"><b>스킬</b>: 👊펀치 🦵킥 💥스매쉬(강) ⬇️내려찍기(공중강) 🌀돌려차기 · <b>머리=크리티컬</b> · <b>점프 콤보 1.5배!</b> 각도 무제한(360°)</p>
        <p className="text-center text-[10px] text-purple-300/80 mt-1">⌨️ ↑↓팔·←→다리·Space점프·J펀치·K킥·L스매쉬·O내려찍기·U돌려차기</p>
      </div>
    </div>
  );
}
