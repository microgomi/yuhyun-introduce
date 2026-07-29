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
  slam: { origin: "sh", base: 16, reach: 264, dmg: 18 }, // 사거리 3배!
  spin: { origin: "hip", base: 18, reach: 98, dmg: 19 },
};
const legKind = (k: Kind) => k === "kick" || k === "spin";
const armKind = (k: Kind) => k === "punch" || k === "smash" || k === "slam";
type Attack = { active: boolean; t: number; hitDone: boolean; kind: Kind; aim: number; air: boolean };
type Fighter = { x: number; hp: number; aim: number; legAim: number; atk: Attack; hurtT: number; yOff: number; jumpT: number; reachMul: number; dead: boolean; deadFall: number };
const mkFighter = (x: number): Fighter => ({ x, hp: 100, aim: -0.2, legAim: 0.05, atk: { active: false, t: 0, hitDone: false, kind: "punch", aim: -0.2, air: false }, hurtT: 0, yOff: 0, jumpT: 0, reachMul: 1, dead: false, deadFall: 0 });

// 🎭 오리지널 초강력 모드 (저작권 캐릭터 아님 — 우리만의 창작)
const MODES = {
  azure: { name: "🔵 창천검성", color: "#38bdf8", aura: "#a855f7", slash: "#7dd3fc", finisher: "orb" as const, orbColor: "#a855f7",
    cry: ["…바람이, 멎었다.", "여기까지 잘 버텼다. 인정하지.", "파랑과 빨강─── 두 힘이 하나로.", "보랏빛─────소멸!!!", "닿는 순간, 존재가 지워진다.", "…잘 가라, 강적이여.", "승 리"] },
  crimson: { name: "🔴 마염패왕", color: "#f43f5e", aura: "#f97316", slash: "#fb7185", finisher: "slash" as const, orbColor: "#f43f5e",
    cry: ["크크… 슬슬 지루해지는군.", "제법이야. 날 여기까지 오게 하다니.", "허나 불꽃 앞에선 전부 재가 된다.", "업화─────참!!!", "타올라라. 남김없이.", "…이것이 힘의 차이다.", "승 리"] },
};
type ModeKey = keyof typeof MODES;
const DEFEAT_CRY = ["큭… 몸이 말을 안 들어…", "아직… 쓰러질 순 없어…", "적의 기세가… 심상치 않다…!", "참─────격!!!", "막을… 수가… 없어…", "여기서… 끝이란 말인가…", "패 배"];
const DYING_LINES = ["크윽… 내가… 지다니…", "말도… 안 돼…", "이게… 실력 차이인가…", "다음엔… 반드시 이긴다…", "아직… 끝나지 않았어…", "훌륭한… 일격이었다…"];

// 빛나는 에너지 구 (방사형 그라데이션)
function glowOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const rr = Math.max(1, r);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, c); gr.addColorStop(1, c + "00");
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
}
// ⚡ 전기(번개) 지그재그 선 — 보라 글로우 + 흰 코어, 잔가지까지
function drawBolt(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, jag = 22, w = 3) {
  const seg = 7;
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < seg; i++) { const t = i / seg; pts.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * jag, y1 + (y2 - y1) * t + (Math.random() - 0.5) * jag]); }
  pts.push([x2, y2]);
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
  ctx.lineCap = "round";
  ctx.strokeStyle = color; ctx.lineWidth = w * 3; path();   // 굵은 글로우
  ctx.strokeStyle = "#e9d5ff"; ctx.lineWidth = w * 1.5; path();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, w * 0.6); path(); // 밝은 코어
  // 잔가지 (스파크)
  for (let i = 1; i < pts.length - 1; i++) {
    if (Math.random() < 0.5) { const [bxp, byp] = pts[i]; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bxp, byp); ctx.lineTo(bxp + (Math.random() - 0.5) * jag * 1.4, byp + (Math.random() - 0.5) * jag * 1.4); ctx.stroke(); }
  }
}

function limbTip(f: Fighter, dir: number, kind: Kind, ext: number) {
  const cfg = KIND[kind];
  const originY = (cfg.origin === "sh" ? SHOULDER_Y : HIP_Y) + f.yOff;
  const aim = f.atk.aim;
  const len = cfg.base + cfg.reach * f.reachMul * ext; // 사거리 조작 반영
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
    shake: 0, combo: 0, comboT: 0, pHit: false, finish: 0, finishWin: false, flash: 0, cineStage: -1, dyingLine: "",
    merge: { active: false, t: 0, x: 0, y: 0, done: false, pr: 0, spin: 0 },
    bolts: [] as { x1: number; y1: number; x2: number; y2: number; life: number }[],
    selfD: false, stageT: [8, 18, 123, 131, 143, 150] as number[], mergeStart: 18, mergeDur: 105, winMode: "azure" as ModeKey,
    parts: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    pops: [] as { x: number; y: number; txt: string; life: number; big: boolean }[],
    slashes: [] as { x: number; y: number; len: number; ang: number; life: number }[],
    orbs: [] as { x: number; y: number; r: number; life: number; c: string; vx: number; vy: number }[],
  });
  const [combo, setCombo] = useState(0);
  const [airborne, setAirborne] = useState(false);
  const airborneRef = useRef(false);
  const [cine, setCine] = useState<{ active: boolean; line: string; loserLine: string; win: boolean; stage: number }>({ active: false, line: "", loserLine: "", win: false, stage: -1 });
  const [mode, setMode] = useState<ModeKey>("azure");
  const modeRef = useRef<ModeKey>("azure");
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const [twoP, setTwoP] = useState(false); // 2인 대전 (턴 번갈아 같은 조작)
  const twoPRef = useRef(false);
  useEffect(() => { twoPRef.current = twoP; }, [twoP]);
  const [mode2, setMode2] = useState<ModeKey>("crimson"); // P2 모드
  const mode2Ref = useRef<ModeKey>("crimson");
  useEffect(() => { mode2Ref.current = mode2; }, [mode2]);
  const held = useRef({ aimUp: false, aimDown: false, legUp: false, legDown: false, reachUp: false, reachDown: false });
  const [reachPct, setReachPct] = useState(100);
  const reachRef = useRef(100);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const resetRound = useCallback((keepWins: boolean) => {
    g.current.p = mkFighter(PX); g.current.c = mkFighter(CX);
    g.current.turn = "p"; g.current.over = false; g.current.cpuTimer = 0;
    g.current.finish = 0; g.current.parts = []; g.current.pops = []; g.current.combo = 0; g.current.shake = 0; g.current.flash = 0; g.current.slashes = []; g.current.orbs = []; g.current.cineStage = -1; g.current.dyingLine = ""; g.current.merge = { active: false, t: 0, x: 0, y: 0, done: false, pr: 0, spin: 0 }; g.current.bolts = [];
    setCombo(0); setCine({ active: false, line: "", loserLine: "", win: false, stage: -1 });
    setPhP(100); setChP(100); setMsg("내 차례! 조준하고 공격!"); setPhase("fight"); setTurn("p");
    if (!keepWins) { setPWins(0); setCWins(0); }
  }, []);

  // 현재 조작 가능한 사람 차례인가 (P1=항상, P2=2인모드일 때 c 차례)
  const humanNow = () => g.current.turn === "p" || (twoPRef.current && g.current.turn === "c");
  const actor = () => (g.current.turn === "p" ? g.current.p : g.current.c);

  const doAttack = useCallback((kind: Kind) => {
    const S = g.current;
    if (phaseRef.current !== "fight" || S.over || !humanNow()) return;
    const f = actor();
    if (f.atk.active) return;
    const air = f.yOff < -6;
    if (kind === "slam" && !air) { setMsg("⬇️내려찍기는 ⬆️점프 중에만 써요!"); return; } // 점프 전용
    const a = f.atk;
    S.pHit = false; // 이번 공격 명중 여부
    a.active = true; a.t = 0; a.hitDone = false; a.kind = kind; a.air = air;
    if (legKind(kind)) a.aim = f.legAim;
    else if (kind === "slam") a.aim = air ? 1.2 : 0.85; // 내려찍기: 아래로 (점프 중이면 더 급하게)
    else a.aim = f.aim; // punch / smash = 팔 각도
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
    if (phaseRef.current !== "fight" || S.over || !humanNow()) return;
    const f = actor();
    if (f.jumpT > 0 || f.atk.active) return;
    f.jumpT = 0.7; beep(520, 0.1, "sine", 0.08);
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
        if (S.turn === "p" || (twoPRef.current && S.turn === "c")) {
          const f = S.turn === "p" ? p : c; // 조작 대상 (P1 또는 P2)
          if (held.current.aimUp) f.aim -= 2.2 * dt;
          if (held.current.aimDown) f.aim += 2.2 * dt;
          if (held.current.legUp) f.legAim -= 2.2 * dt;
          if (held.current.legDown) f.legAim += 2.2 * dt;
          if (held.current.reachUp) f.reachMul = Math.min(2.2, f.reachMul + 1.1 * dt);
          if (held.current.reachDown) f.reachMul = Math.max(0.5, f.reachMul - 1.1 * dt);
          const rp = Math.round(f.reachMul * 100);
          if (rp !== reachRef.current) { reachRef.current = rp; setReachPct(rp); }
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
            const cfg = KIND[a.kind];
            const ox = f.x, oyL = (cfg.origin === "sh" ? SHOULDER_Y : HIP_Y) + f.yOff;
            const tip = limbTip(f, dir, a.kind, ext);
            // 팔/다리가 휘두르는 경로 전체로 판정 (긴 사거리도 명중)
            let res: "head" | "body" | null = null;
            for (let s = 0.35; s <= 1.001; s += 0.12) {
              res = checkHit({ x: ox + (tip.x - ox) * s, y: oyL + (tip.y - oyL) * s }, target);
              if (res) break;
            }
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
              // 콤보 갱신 (P1, 또는 2인모드의 P2도)
              const attackerHuman = isPlayer || twoPRef.current;
              if (attackerHuman) { S.pHit = true; S.combo++; S.comboT = 2.0; setCombo(S.combo); }
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
              if (attackerHuman && S.combo >= 2) S.pops.push({ x: W / 2, y: 46, txt: `${S.combo} COMBO!! 🔥${S.combo >= 5 ? "🔥🔥" : ""}`, life: 1.15, big: true });
              // ⚡ 에너지 섬광 (크리티컬 / 고콤보) — 붉은 섬광 + 베기 궤적
              if (res === "head" || (attackerHuman && S.combo >= 4)) {
                S.flash = 0.32;
                for (let i = 0; i < 4; i++) {
                  const sang = (Math.random() - 0.5) * 1.3 + (dir > 0 ? -0.4 : 0.4);
                  S.slashes.push({ x: tx + (Math.random() - 0.5) * 26, y: ty + (Math.random() - 0.5) * 40, len: 90 + Math.random() * 90, ang: sang, life: 0.3 });
                }
                for (let i = 0; i < 14; i++) { const a2 = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 210; S.parts.push({ x: tx, y: ty, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 0.5 + Math.random() * 0.4, c: i % 2 ? "#a855f7" : "#f43f5e" }); }
                if (res === "head") S.pops.push({ x: tx, y: ty - 40, txt: "⚡섬광!", life: 0.7, big: true });
              }
            }
          }
          if (a.t >= 1) { a.active = false; a.t = 0; if (!a.hitDone) { setMsg("빗나감!"); if ((isPlayer || twoPRef.current) && S.combo !== 0) { S.combo = 0; setCombo(0); } } return true; }
          return false;
        };
        const pDone = advance(p, 1, c, true);
        const cDone = advance(c, -1, p, false);

        if (p.hurtT > 0) p.hurtT -= dt;
        if (c.hurtT > 0) c.hurtT -= dt;

        // 턴 전환 — 맞히면 콤보로 계속 공격! (최대 6연타)
        if (pDone && S.turn === "p" && !S.over && c.hp > 0) {
          if (S.pHit && S.combo < 6) { setMsg(`${S.combo} 콤보! 계속 공격! 🔥`); }
          else { S.turn = "c"; S.cpuTimer = 0.8; sTurn(); setMsg(twoPRef.current ? "🔴 P2 차례!" : "🔴 적 차례..."); }
        }
        if (cDone && S.turn === "c" && !S.over && p.hp > 0) {
          if (twoPRef.current && S.pHit && S.combo < 6) { setMsg(`${S.combo} 콤보! P2 계속! 🔥`); }
          else { S.turn = "p"; sTurn(); setMsg(twoPRef.current ? "🔵 P1 차례!" : "내 차례! 조준하고 공격!"); }
        }

        // CPU 차례: 잠깐 생각 후 조준+공격 (2인 모드에선 CPU 끔 — P2가 조작)
        if (!twoPRef.current && S.turn === "c" && !c.atk.active && !S.over && c.hp > 0) {
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

        // KO → 15초 액션 영화 시작
        if ((p.hp <= 0 || c.hp <= 0) && !S.over) {
          S.over = true;
          const pWon = c.hp <= 0;
          S.winMode = pWon ? modeRef.current : (twoPRef.current ? mode2Ref.current : "crimson"); // 이긴 쪽 모드
          const orbWin = MODES[S.winMode].finisher === "orb";
          S.selfD = orbWin && Math.random() < 0.35; // 35% 확률 자폭
          // 단계 경계(초): 합체(2) 길게, 발사(3) 직후 즉사 + 바로 결과
          S.stageT = S.selfD ? [4, 9, 44, 45, 46, 47] : [5, 11, 55, 56, 57, 58];
          S.mergeStart = S.stageT[1]; S.mergeDur = S.stageT[2] - S.stageT[1];
          S.finish = S.selfD ? 50 : 60; S.finishWin = pWon; S.cineStage = -1;
          const loser = pWon ? c : p;
          loser.dead = true; loser.deadFall = 0;
          S.dyingLine = DYING_LINES[Math.floor(Math.random() * DYING_LINES.length)];
          setMsg("");
        }
        setPhP(p.hp); setChP(c.hp);
        if (S.turn !== turnRef.current) { turnRef.current = S.turn; setTurn(S.turn); }
      }

      // 🎬 150초 액션 영화 (105초까지 천천히 합체 → 발사)
      if (S.finish > 0) {
        S.finish -= dt;
        const elapsed = (S.selfD ? 50 : 60) - S.finish;
        // 7단계 (합체=2). 일반 60초(합체 25초) / 자폭 50초(합체 20초)
        const t = S.stageT;
        const stage = elapsed < t[0] ? 0 : elapsed < t[1] ? 1 : elapsed < t[2] ? 2 : elapsed < t[3] ? 3 : elapsed < t[4] ? 4 : elapsed < t[5] ? 5 : 6;
        const md = MODES[S.winMode]; // 이긴 쪽 모드
        if (stage !== S.cineStage) {
          S.cineStage = stage;
          const win = S.finishWin; // P1이 이겼나 (결과 표시 색상용)
          const winner = win ? p : c, wdir = win ? 1 : -1;
          let line = md.cry[stage]; // 승자가 외침
          if (stage === 6) line = twoPRef.current ? (win ? "P1 승리!" : "P2 승리!") : (win ? "승 리!" : "패 배...");
          setCine({ active: true, line, loserLine: stage === 4 ? S.dyingLine : "", win, stage });
          if (stage <= 2) beep(200, 0.22, "sawtooth", 0.09); // 외침
          if (stage === 2 && md.finisher === "orb") {
            // 🔵+🔴 합체 시작 (승자 위치에서)
            S.merge = { active: true, t: 0, x: winner.x + wdir * 48, y: SHOULDER_Y - 12 + winner.yOff, done: false, pr: 0, spin: 0 };
            beep(160, 0.3, "sine", 0.07);
          }
          if (stage === 3) {
            const loser = win ? c : p;
            loser.hurtT = 6; loser.deadFall = 0.45; // 터지는 순간 바로 쓰러지기 시작
            if (md.finisher === "orb" && S.merge.active) {
              S.merge.done = true; S.merge.active = false;
              const sx = S.merge.x, sy = S.merge.y;
              if (S.selfD) {
                // 💥 자폭! 자기 중심 초대형 보라 폭발 (오리지널)
                S.flash = 1.9; S.shake = 62; sKo();
                S.orbs.push({ x: sx, y: sy, r: 30, life: 2.6, c: "#a855f7", vx: 0, vy: 0 });
                for (let i = 0; i < 260; i++) { const a2 = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 520; S.parts.push({ x: sx, y: sy, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 1.2 + Math.random() * 1.8, c: ["#a855f7", "#c084fc", "#fff", "#818cf8", "#e9d5ff"][i % 5] }); }
                for (let i = 0; i < 54; i++) { const a2 = Math.random() * Math.PI * 2, ln = 120 + Math.random() * 260; S.bolts.push({ x1: sx, y1: sy, x2: sx + Math.cos(a2) * ln, y2: sy + Math.sin(a2) * ln, life: 0.7 }); }
                S.pops.push({ x: W / 2, y: H / 2 - 10, txt: "💥 자폭─── 소멸!!", life: 2.0, big: true });
              } else {
                // 🟣 합체 완성 → 보라 구 발사 + 전기 대폭발
                S.flash = 1.4; S.shake = 52; sKo();
                const dx = loser.x - sx, dy = (HEAD_Y + loser.yOff) - sy, d = Math.hypot(dx, dy) || 1;
                S.orbs.push({ x: sx, y: sy, r: 26, life: 2.4, c: "#a855f7", vx: dx / d * 340, vy: dy / d * 340 });
                for (let i = 0; i < 130; i++) { const a2 = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 400; S.parts.push({ x: sx, y: sy, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 1 + Math.random() * 1.4, c: ["#a855f7", "#c084fc", "#fff", "#818cf8"][i % 4] }); }
                for (let i = 0; i < 32; i++) { const a2 = Math.random() * Math.PI * 2, ln = 90 + Math.random() * 190; S.bolts.push({ x1: sx, y1: sy, x2: sx + Math.cos(a2) * ln, y2: sy + Math.sin(a2) * ln, life: 0.55 }); }
                S.pops.push({ x: W / 2, y: H / 2 - 10, txt: "🟣 보랏빛 소멸!!", life: 1.6, big: true });
              }
            } else if (md.finisher !== "orb") {
              // ⚔️ 참격 즉시 발동! 대폭발 (승자 모드 색)
              S.flash = 1.2; S.shake = 44; sKo();
              const cols = [md.color, md.aura, "#fff", "#fde047"];
              for (let i = 0; i < 130; i++) { const ang = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 400; S.parts.push({ x: loser.x, y: HEAD_Y + loser.yOff, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, life: 1.0 + Math.random() * 1.4, c: cols[i % 4] }); }
              for (let i = 0; i < 12; i++) { S.slashes.push({ x: 30 + Math.random() * (W - 60), y: 50 + Math.random() * (H - 110), len: 220 + Math.random() * 180, ang: (Math.random() - 0.5) * 2.2, life: 0.7 }); }
              S.orbs.push({ x: loser.x, y: HEAD_Y + loser.yOff, r: 8, life: 1.3, c: md.color, vx: 0, vy: 0 });
              loser.x = Math.max(38, Math.min(322, loser.x + wdir * 20));
              S.pops.push({ x: W / 2, y: H / 2 - 10, txt: "참격!!", life: 1.2, big: true });
            }
          }
        }
        // 합체 진행도 갱신
        if (S.merge.active && !S.merge.done) { S.merge.pr = Math.max(0, Math.min(1, (elapsed - S.mergeStart) / S.mergeDur)); S.merge.spin += dt; }
        // 기 모으기 오라 (기 모으는 단계)
        if (S.cineStage === 1 || S.cineStage === 2) {
          const hero = S.finishWin ? p : c; // 승자에게 오라
          if (Math.random() < 0.7) { const ang = Math.random() * Math.PI * 2, r = 55 + Math.random() * 45; S.parts.push({ x: hero.x + Math.cos(ang) * r, y: HEAD_Y + hero.yOff + Math.sin(ang) * r, vx: -Math.cos(ang) * 100, vy: -Math.sin(ang) * 100, life: 0.5, c: md.aura }); }
        }
        // 💀 패자 쓰러지는 연출 (참격 이후 서서히 넘어짐)
        if (S.cineStage >= 3) { const loser = S.finishWin ? c : p; if (loser.deadFall < 1) loser.deadFall = Math.min(1, loser.deadFall + dt * 6.0); }
        // 🔵+🔴 합체 → 완성되면 🟣 발사 + 대폭발
        if (S.merge.active) {
          S.merge.t += dt;
          if (!S.merge.done && S.merge.t >= 2.6) {
            S.merge.done = true;
            const loser = S.finishWin ? c : p;
            S.flash = 1.3; S.shake = 48; sKo();
            const sx = S.merge.x, sy = S.merge.y;
            const dx = loser.x - sx, dy = (HEAD_Y + loser.yOff) - sy, d = Math.hypot(dx, dy) || 1;
            S.orbs.push({ x: sx, y: sy, r: 24, life: 2.0, c: "#a855f7", vx: dx / d * 340, vy: dy / d * 340 });
            for (let i = 0; i < 120; i++) { const a2 = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 380; S.parts.push({ x: sx, y: sy, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 1 + Math.random() * 1.3, c: ["#a855f7", "#c084fc", "#fff", "#818cf8"][i % 4] }); }
            S.pops.push({ x: W / 2, y: H / 2 - 10, txt: "🟣 보랏빛 소멸!!", life: 1.5, big: true });
          }
          if (S.merge.t > 3.2) S.merge.active = false;
        }
        if (S.finish <= 0) {
          const pWin = S.finishWin;
          setCine({ active: false, line: "", loserLine: "", win: pWin, stage: -1 });
          setPhase("ko"); setMsg(pWin ? "K.O.! 승리! 🎉" : "K.O.! 패배... 💀");
          if (pWin) setPWins((v) => v + 1); else setCWins((v) => v + 1);
        }
      }
      // 연출 물리 (피니시 중엔 슬로우모션)
      const edt = S.finish > 0 ? dt * 0.35 : dt;
      if (S.shake > 0) S.shake = Math.max(0, S.shake - 55 * edt);
      for (const pa of S.parts) { pa.x += pa.vx * edt; pa.y += pa.vy * edt; pa.vy += 320 * edt; pa.life -= edt; }
      if (S.parts.length) S.parts = S.parts.filter((pa) => pa.life > 0);
      for (const po of S.pops) { po.y -= 34 * edt; po.life -= edt; }
      if (S.pops.length) S.pops = S.pops.filter((po) => po.life > 0);
      if (S.flash > 0) S.flash = Math.max(0, S.flash - edt);
      for (const sl of S.slashes) sl.life -= edt;
      if (S.slashes.length) S.slashes = S.slashes.filter((sl) => sl.life > 0);
      for (const ob of S.orbs) { ob.x += ob.vx * edt; ob.y += ob.vy * edt; ob.r += (ob.vx || ob.vy ? 55 : 135) * edt; ob.life -= edt; }
      if (S.orbs.length) S.orbs = S.orbs.filter((o) => o.life > 0);
      for (const bo of S.bolts) bo.life -= edt;
      if (S.bolts.length) S.bolts = S.bolts.filter((bo) => bo.life > 0);
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
      drawFighter(ctx, p, 1, MODES[modeRef.current].color, true);
      drawFighter(ctx, c, -1, twoPRef.current ? MODES[mode2Ref.current].color : "#fb7185", false);
      // 파편
      for (const pa of S.parts) { ctx.globalAlpha = Math.min(1, pa.life * 2.5); ctx.fillStyle = pa.c; ctx.beginPath(); ctx.arc(pa.x, pa.y, 3, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      // ⚡ 에너지 섬광 (붉은 화면 번쩍)
      if (S.flash > 0) { ctx.globalAlpha = Math.min(0.5, S.flash * 1.6); ctx.fillStyle = "#f43f5e"; ctx.fillRect(-30, -30, W + 60, H + 60); ctx.globalAlpha = 1; }
      // 🔵 에너지 구
      for (const ob of S.orbs) {
        ctx.globalAlpha = Math.min(1, ob.life);
        glowOrb(ctx, ob.x, ob.y, ob.r, ob.c);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 🔵+🔴 → 🟣 합체 연출 (돌며 다가와 보라로 합쳐지고, 보라 전기가 튐)
      if (S.merge.active && !S.merge.done) {
        const pr = S.merge.pr;
        const off = 105 * (1 - pr) + 18, up = 50 * (1 - pr);
        const s = S.merge.spin * 4;
        const bx = S.merge.x - off * Math.abs(Math.cos(s)) - 4, by = S.merge.y - up;
        const rx = S.merge.x + off * Math.abs(Math.cos(s)) + 4, ry = S.merge.y - up;
        glowOrb(ctx, bx, by, 16, "#3b82f6");
        glowOrb(ctx, rx, ry, 16, "#ef4444");
        if (pr > 0.35) glowOrb(ctx, S.merge.x, S.merge.y, 8 + 34 * ((pr - 0.35) / 0.65), "#a855f7");
        if (pr > 0.15) {
          // 보라 화면 글로우 (셀수록 강하게)
          ctx.globalAlpha = Math.min(0.28, pr * 0.3); ctx.fillStyle = "#7c3aed"; ctx.fillRect(-30, -30, W + 60, H + 60);
          ctx.globalAlpha = Math.min(1, (pr - 0.15) * 2);
          const n = 3 + Math.floor(pr * 12);
          for (let k = 0; k < n; k++) { drawBolt(ctx, bx, by, S.merge.x, S.merge.y, "#c084fc", 20, 3); drawBolt(ctx, rx, ry, S.merge.x, S.merge.y, "#a855f7", 20, 3); }
          if (pr > 0.4) for (let k = 0; k < 2 + Math.floor(pr * 5); k++) drawBolt(ctx, bx, by, rx, ry, "#c084fc", 26, 2.5); // 두 구 사이
          if (pr > 0.55) for (let k = 0; k < Math.floor(pr * 8); k++) { const a = Math.random() * Math.PI * 2, ln = 40 + Math.random() * 90 * pr; drawBolt(ctx, S.merge.x, S.merge.y, S.merge.x + Math.cos(a) * ln, S.merge.y + Math.sin(a) * ln, "#a855f7", 18, 2.5); } // 방사
          ctx.globalAlpha = 1;
        }
      }
      // ⚡ 발사 순간 방사 전기 (강력)
      for (const bo of S.bolts) { ctx.globalAlpha = Math.min(1, bo.life / 0.4); drawBolt(ctx, bo.x1, bo.y1, bo.x2, bo.y2, "#c084fc", 26, 4); }
      ctx.globalAlpha = 1;
      // ⚡ 베기 궤적
      ctx.lineCap = "round";
      for (const sl of S.slashes) {
        ctx.globalAlpha = Math.min(1, sl.life / 0.3);
        const dx = Math.cos(sl.ang) * sl.len / 2, dy = Math.sin(sl.ang) * sl.len / 2;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; // 참격 얇게
        ctx.beginPath(); ctx.moveTo(sl.x - dx, sl.y - dy); ctx.lineTo(sl.x + dx, sl.y + dy); ctx.stroke();
        ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(sl.x - dx, sl.y - dy); ctx.lineTo(sl.x + dx, sl.y + dy); ctx.stroke();
      }
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

    // 💀 쓰러지는 연출: 넘어지며 서서히 사라짐
    ctx.save();
    if (f.dead && f.deadFall > 0) {
      ctx.globalAlpha = Math.max(0.15, 1 - f.deadFall * 0.6);
      ctx.translate(x, hipY); ctx.rotate(f.deadFall * (Math.PI / 2) * dir); ctx.translate(-x, -hipY);
    }

    // 조준선 (플레이어 차례에만): 팔(노랑) + 다리(주황)
    const activeHuman = (isPlayer && g.current.turn === "p") || (!isPlayer && g.current.turn === "c" && twoPRef.current);
    const showAim = activeHuman && !f.atk.active && phaseRef.current === "fight" && !g.current.over;
    if (showAim) {
      ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
      const armLen = 14 + 60 * f.reachMul, legLen = 18 + 92 * f.reachMul; // 사거리 반영
      ctx.strokeStyle = "rgba(250,204,21,0.65)"; // 팔
      ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x + dir * armLen * Math.cos(f.aim), shY + armLen * Math.sin(f.aim)); ctx.stroke();
      ctx.strokeStyle = "rgba(251,146,60,0.65)"; // 다리
      ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + dir * legLen * Math.cos(f.legAim), hipY + legLen * Math.sin(f.legAim)); ctx.stroke();
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
    ctx.restore(); // spin
    ctx.restore(); // death
  }

  const setHold = (k: keyof typeof held.current, v: boolean) => { held.current[k] = v; };
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": case "w": case "W": setHold("aimUp", true); break;
        case "ArrowDown": case "s": case "S": setHold("aimDown", true); break;
        case "ArrowLeft": setHold("legUp", true); break;
        case "ArrowRight": setHold("legDown", true); break;
        case "e": case "E": setHold("reachUp", true); break;
        case "q": case "Q": setHold("reachDown", true); break;
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
      if (["e", "E"].includes(e.key)) setHold("reachUp", false);
      if (["q", "Q"].includes(e.key)) setHold("reachDown", false);
    };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [doAttack, doJump]);

  const matchOver = pWins >= 3 || cWins >= 3;
  const myTurn = phase === "fight" && (turn === "p" || (twoP && turn === "c")); // 조작 가능한 사람 차례
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

        {/* 1인/2인 선택 */}
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <button onClick={() => { setTwoP(false); resetRound(false); }}
            className={`rounded-lg py-1.5 text-xs font-black border-2 ${!twoP ? "border-white bg-slate-700" : "border-transparent bg-slate-800 opacity-55"}`}>🤖 1인 (vs CPU)</button>
          <button onClick={() => { setTwoP(true); resetRound(false); }}
            className={`rounded-lg py-1.5 text-xs font-black border-2 ${twoP ? "border-white bg-slate-700" : "border-transparent bg-slate-800 opacity-55"}`}>👥 2인 (번갈아)</button>
        </div>

        {/* 모드 선택 (P1) */}
        {twoP && <div className="text-[10px] font-bold text-sky-300 mb-0.5">🔵 P1 모드</div>}
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(MODES) as ModeKey[]).map((k) => (
            <button key={k} onClick={() => setMode(k)} disabled={cine.active}
              className={`rounded-lg py-1.5 text-xs font-black border-2 transition-all ${mode === k ? "border-white scale-105" : "border-transparent opacity-55"}`}
              style={{ background: MODES[k].color + "2e", color: MODES[k].color }}>
              {MODES[k].name}
            </button>
          ))}
        </div>
        {/* 모드 선택 (P2) — 2인 모드에서만 */}
        {twoP && (
          <>
            <div className="text-[10px] font-bold text-rose-300 mb-0.5">🔴 P2 모드</div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {(Object.keys(MODES) as ModeKey[]).map((k) => (
                <button key={k} onClick={() => setMode2(k)} disabled={cine.active}
                  className={`rounded-lg py-1.5 text-xs font-black border-2 transition-all ${mode2 === k ? "border-white scale-105" : "border-transparent opacity-55"}`}
                  style={{ background: MODES[k].color + "2e", color: MODES[k].color }}>
                  {MODES[k].name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 차례 배너 */}
        <div className={`mb-2 rounded-lg py-1 text-center text-sm font-black ${turn === "p" && phase === "fight" ? "bg-sky-500/30 text-sky-200" : phase === "fight" ? "bg-red-500/30 text-red-200" : "bg-slate-700 text-slate-300"}`}>
          {phase === "ko" ? "라운드 종료" : turn === "p" ? (twoP ? "🔵 P1 차례!" : "🔵 내 차례!") : (twoP ? "🔴 P2 차례!" : "🔴 적 차례...")}
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
          {combo >= 2 && !cine.active && (
            <div className="absolute top-2 right-2 text-right animate-pulse">
              <div className="text-2xl font-black text-orange-400 drop-shadow">{combo}<span className="text-sm"> COMBO</span></div>
            </div>
          )}
          {/* 🎬 15초 액션 영화 오버레이 */}
          {cine.active && phase !== "ko" && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-9 bg-black" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-black" />
              <div className="pointer-events-none absolute top-10 left-2 text-[10px] font-black text-red-500 animate-pulse">🎬 ACTION</div>
              {cine.stage === 6 && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] ${cine.win ? "text-yellow-300" : "text-rose-400"}`}>{cine.line}</div>
              )}
              {cine.line && cine.stage !== 6 && (
                <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-[92%] text-center">
                  {cine.loserLine && (
                    <div className="mb-1 text-sm italic text-gray-400 drop-shadow">💀 「{cine.loserLine}」</div>
                  )}
                  <div className={`font-black drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] ${cine.stage === 2 ? "text-red-400 text-2xl animate-pulse" : cine.win ? "text-sky-200 text-lg" : "text-rose-200 text-lg"}`}>
                    「{cine.line}」
                  </div>
                </div>
              )}
            </>
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
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 items-center">
          {holdBtn("reachDown", "➖ 사거리")}
          <div className="text-center text-sm font-black text-cyan-300">📏 {reachPct}%</div>
          {holdBtn("reachUp", "➕ 사거리")}
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
        <p className="text-center text-[10px] text-purple-300/80 mt-1">⌨️ ↑↓팔·←→다리·Q/E사거리·Space점프·J펀치·K킥·L스매쉬·O내려찍기·U돌려차기</p>
      </div>
    </div>
  );
}
