"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.05) {
  try {
    if (!ac) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sShoot = () => beep(880, 0.03, "square", 0.03);
const sHit = () => beep(220, 0.04, "sawtooth", 0.04);
const sXp = () => beep(1400, 0.04, "triangle", 0.03);
const sLvl = () => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.1, "triangle", 0.06), i * 70)); };
const sHurt = () => beep(120, 0.12, "square", 0.07);
const sBoss = () => { [200, 150, 100].forEach((f, i) => setTimeout(() => beep(f, 0.25, "sawtooth", 0.09), i * 130)); };
const sDie = () => { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => beep(f, 0.2, "sawtooth", 0.08), i * 100)); };

const W = 380, H = 480;
const SAVE = "survivor_best";

type Enemy = { x: number; y: number; hp: number; maxHp: number; r: number; speed: number; dmg: number; boss: boolean; emoji: string; hitCd: number };
type Proj = { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number };
type Gem = { x: number; y: number; v: number };
type FloatTxt = { x: number; y: number; txt: string; life: number; c: string };

type Stats = { bolt: number; orbit: number; nova: number; dmg: number; fireRate: number; speed: number; maxHp: number; magnet: number; count: number };
const START: Stats = { bolt: 1, orbit: 0, nova: 0, dmg: 1, fireRate: 1, speed: 1, maxHp: 100, magnet: 40, count: 1 };

type Upgrade = { key: string; name: string; emoji: string; desc: string; max: number; get: (s: Stats) => number; apply: (s: Stats) => void };
const UPGRADES: Upgrade[] = [
  { key: "bolt", name: "볼트 강화", emoji: "🗡️", desc: "기본 무기 데미지↑", max: 8, get: (s) => s.bolt, apply: (s) => { s.bolt++; } },
  { key: "count", name: "다발 사격", emoji: "🎯", desc: "발사체 +1", max: 6, get: (s) => s.count, apply: (s) => { s.count++; } },
  { key: "fireRate", name: "연사", emoji: "⚡", desc: "발사 속도↑", max: 8, get: (s) => Math.round((s.fireRate - 1) * 5), apply: (s) => { s.fireRate += 0.25; } },
  { key: "orbit", name: "회전검", emoji: "🌀", desc: "주위를 도는 칼", max: 6, get: (s) => s.orbit, apply: (s) => { s.orbit++; } },
  { key: "nova", name: "폭발파", emoji: "💥", desc: "주기적 광역 폭발", max: 6, get: (s) => s.nova, apply: (s) => { s.nova++; } },
  { key: "dmg", name: "공격력", emoji: "💪", desc: "모든 데미지 +20%", max: 8, get: (s) => Math.round((s.dmg - 1) * 5), apply: (s) => { s.dmg += 0.2; } },
  { key: "speed", name: "이동속도", emoji: "👟", desc: "빠르게 이동", max: 6, get: (s) => Math.round((s.speed - 1) * 5), apply: (s) => { s.speed += 0.15; } },
  { key: "maxHp", name: "최대 체력", emoji: "❤️", desc: "최대 HP +25 (회복)", max: 8, get: (s) => Math.round((s.maxHp - 100) / 25), apply: (s) => { s.maxHp += 25; } },
  { key: "magnet", name: "자석", emoji: "🧲", desc: "경험치 흡수 범위↑", max: 6, get: (s) => Math.round((s.magnet - 40) / 20), apply: (s) => { s.magnet += 20; } },
];

// ───── 캐릭터 (시작 특성이 다름) ─────
type CharDef = { id: string; name: string; emoji: string; desc: string; apply: (s: Stats) => void };
const CHARS: CharDef[] = [
  { id: "knight", name: "기사", emoji: "🦸", desc: "튼튼한 체력형 · 균형", apply: (s) => { s.maxHp += 40; } },
  { id: "mage", name: "마법사", emoji: "🧙", desc: "폭발파로 시작 · 광역", apply: (s) => { s.nova = 1; s.dmg += 0.2; } },
  { id: "ninja", name: "닌자", emoji: "🥷", desc: "빠른 이속·연사", apply: (s) => { s.speed += 0.4; s.fireRate += 0.6; } },
  { id: "hunter", name: "사냥꾼", emoji: "🏹", desc: "다발 사격·자석", apply: (s) => { s.count += 1; s.magnet += 40; } },
];
// ───── 영구 강화 (골드로 구매, 저장됨) ─────
type MetaDef = { key: string; name: string; emoji: string; max: number; cost: (l: number) => number; apply: (s: Stats, l: number) => void };
const METAS: MetaDef[] = [
  { key: "hp", name: "시작 체력", emoji: "❤️", max: 10, cost: (l) => 20 + l * 15, apply: (s, l) => { s.maxHp += l * 20; } },
  { key: "dmg", name: "공격력", emoji: "💪", max: 10, cost: (l) => 25 + l * 20, apply: (s, l) => { s.dmg += l * 0.15; } },
  { key: "speed", name: "이동속도", emoji: "👟", max: 8, cost: (l) => 20 + l * 15, apply: (s, l) => { s.speed += l * 0.08; } },
  { key: "fireRate", name: "연사 속도", emoji: "⚡", max: 8, cost: (l) => 25 + l * 18, apply: (s, l) => { s.fireRate += l * 0.12; } },
  { key: "magnet", name: "자석 범위", emoji: "🧲", max: 8, cost: (l) => 15 + l * 12, apply: (s, l) => { s.magnet += l * 15; } },
];
export default function Survivor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "levelup" | "dead" | "clear">("ready");
  const GOAL_TOTAL = 3600; // 누적 생존 1시간 = 클리어 (여러 번 나눠서, 쉬면서 해도 OK!)
  const SAVE_TOTAL = "survivor_total";
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0 });
  const [choices, setChoices] = useState<Upgrade[]>([]);
  const [best, setBest] = useState(0);
  const [totalT, setTotalT] = useState(0); // 누적 생존 시간 (클리어 목표, 저장됨)
  const totalRef = useRef(0);
  const [charId, setCharId] = useState("knight");
  const charRef = useRef("knight");
  useEffect(() => { charRef.current = charId; }, [charId]);
  const [gold, setGold] = useState(0);         // 영구 골드 (저장됨)
  const goldRef = useRef(0);
  const [meta, setMeta] = useState<Record<string, number>>({}); // 영구 강화 레벨
  const metaRef = useRef<Record<string, number>>({});
  useEffect(() => { metaRef.current = meta; }, [meta]);
  const [runGold, setRunGold] = useState(0);   // 이번 판에서 번 골드
  const [showShop, setShowShop] = useState(false);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(SAVE) || 0));
      const tt = Number(localStorage.getItem(SAVE_TOTAL) || 0); totalRef.current = tt; setTotalT(tt);
      const gd = Number(localStorage.getItem("survivor_gold") || 0); goldRef.current = gd; setGold(gd);
      const mt = JSON.parse(localStorage.getItem("survivor_meta") || "{}"); metaRef.current = mt; setMeta(mt);
    } catch { /* ignore */ }
  }, []);
  const saveMeta = (g: number, m: Record<string, number>) => { try { localStorage.setItem("survivor_gold", String(g)); localStorage.setItem("survivor_meta", JSON.stringify(m)); } catch { /* ignore */ } };

  const g = useRef({
    px: W / 2, py: H / 2, hp: 100, stats: { ...START },
    lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0,
    enemies: [] as Enemy[], projs: [] as Proj[], gems: [] as Gem[], floats: [] as FloatTxt[],
    spawnAcc: 0, bossAcc: 0, fireAcc: 0, novaAcc: 0, orbitAng: 0, hurtFlash: 0, dead: false, gold: 0,
  });
  const keys = useRef<Record<string, boolean>>({});
  const joy = useRef({ active: false, ox: 0, oy: 0, dx: 0, dy: 0 });

  const mkEnemy = (t: number, boss = false): Enemy => {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * W; y = -20; } else if (edge === 1) { x = W + 20; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 20; } else { x = -20; y = Math.random() * H; }
    if (boss) { const hp = 200 + t * 20; return { x, y, hp, maxHp: hp, r: 22, speed: 26 + t * 0.2, dmg: 20, boss: true, emoji: "👹", hitCd: 0 }; }
    const hp = 3 + t * 0.7;
    const kinds = ["👾", "🧟", "🦇", "🕷️"];
    return { x, y, hp, maxHp: hp, r: 11, speed: (34 + t * 0.5) * (0.8 + Math.random() * 0.5), dmg: 6 + t * 0.1, boss: false, emoji: kinds[Math.floor(Math.random() * kinds.length)], hitCd: 0 };
  };

  const start = useCallback(() => {
    const s = g.current;
    const st: Stats = { ...START };
    for (const m of METAS) { const l = metaRef.current[m.key] || 0; if (l > 0) m.apply(st, l); } // 영구 강화
    const ch = CHARS.find((c) => c.id === charRef.current) || CHARS[0]; ch.apply(st); // 캐릭터 특성
    s.px = W / 2; s.py = H / 2; s.stats = st; s.hp = st.maxHp;
    s.lvl = 1; s.xp = 0; s.xpNext = 5; s.t = 0; s.kills = 0; s.gold = 0;
    s.enemies = []; s.projs = []; s.gems = []; s.floats = [];
    s.spawnAcc = 0; s.bossAcc = 0; s.fireAcc = 0; s.novaAcc = 0; s.orbitAng = 0; s.hurtFlash = 0; s.dead = false;
    setHud({ hp: s.hp, maxHp: st.maxHp, lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0 }); setRunGold(0);
    setPhase("play");
  }, []);

  const pickLevelUp = () => {
    const s = g.current.stats;
    const pool = UPGRADES.filter((u) => u.get(s) < u.max);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setChoices(shuffled.length ? shuffled : [UPGRADES[5]]); // fallback: 공격력
    setPhase("levelup"); sLvl();
  };
  const chooseUpgrade = (u: Upgrade) => {
    const s = g.current;
    u.apply(s.stats);
    if (u.key === "maxHp") s.hp = Math.min(s.stats.maxHp, s.hp + 25);
    setPhase("play");
  };
  const buyMeta = (m: MetaDef) => {
    const lvl = metaRef.current[m.key] || 0;
    if (lvl >= m.max) return;
    const cost = m.cost(lvl);
    if (goldRef.current < cost) return;
    goldRef.current -= cost; setGold(goldRef.current);
    const nm = { ...metaRef.current, [m.key]: lvl + 1 }; metaRef.current = nm; setMeta(nm);
    saveMeta(goldRef.current, nm); beep(880, 0.08, "triangle", 0.06);
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let raf = 0, last = performance.now();

    const kd = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);

    const toC = (cx: number, cy: number) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; };
    const ts = (e: TouchEvent) => { const p = toC(e.touches[0].clientX, e.touches[0].clientY); joy.current = { active: true, ox: p.x, oy: p.y, dx: 0, dy: 0 }; };
    const tm = (e: TouchEvent) => { if (!joy.current.active) return; e.preventDefault(); const p = toC(e.touches[0].clientX, e.touches[0].clientY); let dx = p.x - joy.current.ox, dy = p.y - joy.current.oy; const d = Math.hypot(dx, dy) || 1; const m = Math.min(1, d / 45); joy.current.dx = dx / d * m; joy.current.dy = dy / d * m; };
    const te = () => { joy.current.active = false; joy.current.dx = 0; joy.current.dy = 0; };
    canvas.addEventListener("touchstart", ts, { passive: true });
    canvas.addEventListener("touchmove", tm, { passive: false });
    canvas.addEventListener("touchend", te);

    const nearest = (x: number, y: number, arr: Enemy[]) => { let bd = 1e9, bi = -1; for (let i = 0; i < arr.length; i++) { const d = (arr[i].x - x) ** 2 + (arr[i].y - y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };

    const loop = (tms: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (tms - last) / 1000); last = tms;
      const s = g.current;
      const ctx = canvas.getContext("2d"); if (!ctx) return;

      if (phaseRef.current === "play" && !s.dead) {
        s.t += dt;
        // 이동
        let mx = 0, my = 0;
        if (keys.current["arrowleft"] || keys.current["a"]) mx -= 1;
        if (keys.current["arrowright"] || keys.current["d"]) mx += 1;
        if (keys.current["arrowup"] || keys.current["w"]) my -= 1;
        if (keys.current["arrowdown"] || keys.current["s"]) my += 1;
        if (joy.current.active) { mx = joy.current.dx; my = joy.current.dy; }
        const ml = Math.hypot(mx, my) || 1; if (mx || my) { const sp = 120 * s.stats.speed; s.px += mx / ml * sp * dt; s.py += my / ml * sp * dt; }
        s.px = Math.max(8, Math.min(W - 8, s.px)); s.py = Math.max(8, Math.min(H - 8, s.py));

        // 스폰
        s.spawnAcc += dt;
        const spawnEvery = Math.max(0.25, 1.0 - s.t * 0.012);
        if (s.spawnAcc > spawnEvery) { s.spawnAcc = 0; s.enemies.push(mkEnemy(s.t)); }
        s.bossAcc += dt;
        if (s.bossAcc > 45) { s.bossAcc = 0; s.enemies.push(mkEnemy(s.t, true)); sBoss(); s.floats.push({ x: W / 2, y: 40, txt: "⚠️ 보스 출현!", life: 1.5, c: "#f43f5e" }); }

        // 적 이동 + 접촉 피해
        for (const e of s.enemies) {
          const dx = s.px - e.x, dy = s.py - e.y, d = Math.hypot(dx, dy) || 1;
          e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt;
          e.hitCd -= dt;
          if (d < e.r + 8) { if (e.hitCd <= 0) { s.hp -= e.dmg; e.hitCd = 0.5; s.hurtFlash = 0.25; sHurt(); } }
        }
        if (s.hp <= 0 && !s.dead) {
          s.dead = true; sDie();
          const sc = Math.floor(s.t);
          // 누적 생존시간 + 골드 적립
          totalRef.current += sc; setTotalT(totalRef.current);
          goldRef.current += s.gold; setGold(goldRef.current); saveMeta(goldRef.current, metaRef.current);
          try {
            const bb = Number(localStorage.getItem(SAVE) || 0); if (sc > bb) { localStorage.setItem(SAVE, String(sc)); setBest(sc); }
            localStorage.setItem(SAVE_TOTAL, String(totalRef.current));
          } catch { /* ignore */ }
          if (totalRef.current >= GOAL_TOTAL) { sLvl(); setPhase("clear"); } else setPhase("dead");
        }
        if (s.hurtFlash > 0) s.hurtFlash -= dt;

        // 무기: 볼트 (자동 발사)
        s.fireAcc += dt;
        const fireEvery = 0.7 / s.stats.fireRate;
        if (s.fireAcc > fireEvery && s.enemies.length) {
          s.fireAcc = 0; sShoot();
          for (let k = 0; k < s.stats.count; k++) {
            const bi = nearest(s.px, s.py, s.enemies); if (bi < 0) break;
            const e = s.enemies[(bi + k) % s.enemies.length];
            const dx = e.x - s.px, dy = e.y - s.py, d = Math.hypot(dx, dy) || 1;
            s.projs.push({ x: s.px, y: s.py, vx: dx / d * 300, vy: dy / d * 300, dmg: 3 * s.stats.dmg * s.stats.bolt, pierce: 1, life: 2 });
          }
        }
        // 무기: 폭발파 (nova)
        if (s.stats.nova > 0) {
          s.novaAcc += dt;
          if (s.novaAcc > 3) {
            s.novaAcc = 0; beep(300, 0.2, "sawtooth", 0.06);
            const radius = 60 + s.stats.nova * 12;
            for (const e of s.enemies) { if (Math.hypot(e.x - s.px, e.y - s.py) < radius + e.r) { e.hp -= 5 * s.stats.dmg * s.stats.nova; } }
            s.floats.push({ x: s.px, y: s.py, txt: "💥", life: 0.4, c: "#f97316" });
          }
        }
        // 무기: 회전검 (orbit)
        s.orbitAng += dt * 2.5;
        // 발사체 이동 + 명중
        for (const p of s.projs) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          for (const e of s.enemies) { if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 4) { e.hp -= p.dmg; p.pierce--; if (p.pierce < 0) p.life = 0; break; } }
        }
        s.projs = s.projs.filter((p) => p.life > 0 && p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);
        // 회전검 명중
        if (s.stats.orbit > 0) {
          const n = s.stats.orbit, R = 46;
          for (let i = 0; i < n; i++) {
            const ang = s.orbitAng + (i / n) * Math.PI * 2, bx = s.px + Math.cos(ang) * R, by = s.py + Math.sin(ang) * R;
            for (const e of s.enemies) { if (e.hitCd <= 0 && Math.hypot(e.x - bx, e.y - by) < e.r + 8) { e.hp -= 4 * s.stats.dmg; e.hitCd = 0.2; } }
          }
        }
        // 적 사망 처리
        const alive: Enemy[] = [];
        for (const e of s.enemies) {
          if (e.hp > 0) alive.push(e);
          else { s.kills++; sHit(); s.gold += e.boss ? 30 : 1; if (e.boss) { for (let i = 0; i < 8; i++) s.gems.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 30, v: 5 }); s.floats.push({ x: e.x, y: e.y, txt: "💰+30", life: 1, c: "#fbbf24" }); } else s.gems.push({ x: e.x, y: e.y, v: 1 }); }
        }
        s.enemies = alive;

        // 경험치 젬 흡수
        for (const gm of s.gems) {
          const d = Math.hypot(gm.x - s.px, gm.y - s.py);
          if (d < s.stats.magnet) { gm.x += (s.px - gm.x) * 0.2; gm.y += (s.py - gm.y) * 0.2; }
          if (d < 12) { s.xp += gm.v; gm.v = -999; sXp(); }
        }
        s.gems = s.gems.filter((gm) => gm.v > 0);
        // 레벨업
        if (s.xp >= s.xpNext) { s.xp -= s.xpNext; s.lvl++; s.xpNext = Math.floor(5 + s.lvl * 3); pickLevelUp(); }

        // floats
        for (const f of s.floats) { f.y -= 20 * dt; f.life -= dt; }
        s.floats = s.floats.filter((f) => f.life > 0);

        setHud({ hp: Math.max(0, Math.ceil(s.hp)), maxHp: s.stats.maxHp, lvl: s.lvl, xp: s.xp, xpNext: s.xpNext, t: s.t, kills: s.kills }); setRunGold(s.gold);
      }

      // ───── 렌더 ─────
      ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
      // 격자
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const s2 = g.current;
      // 젬
      for (const gm of s2.gems) { ctx.fillStyle = gm.v > 1 ? "#f59e0b" : "#22d3ee"; ctx.beginPath(); ctx.arc(gm.x, gm.y, gm.v > 1 ? 4 : 3, 0, 7); ctx.fill(); }
      // 발사체
      ctx.fillStyle = "#fde047"; for (const p of s2.projs) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); }
      // 적
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const e of s2.enemies) {
        ctx.font = `${e.r * 1.8}px serif`; ctx.fillText(e.emoji, e.x, e.y);
        if (e.hp < e.maxHp) { const bw = e.r * 2; ctx.fillStyle = "#000"; ctx.fillRect(e.x - bw / 2, e.y - e.r - 6, bw, 3); ctx.fillStyle = e.boss ? "#f59e0b" : "#22c55e"; ctx.fillRect(e.x - bw / 2, e.y - e.r - 6, bw * (e.hp / e.maxHp), 3); }
      }
      // 회전검
      if (s2.stats.orbit > 0 && phaseRef.current !== "ready") { const n = s2.stats.orbit, R = 46; ctx.font = "18px serif"; for (let i = 0; i < n; i++) { const ang = s2.orbitAng + (i / n) * Math.PI * 2; ctx.fillText("🗡️", s2.px + Math.cos(ang) * R, s2.py + Math.sin(ang) * R); } }
      // 플레이어
      if (phaseRef.current !== "ready") { ctx.font = "22px serif"; ctx.fillText(s2.dead ? "💀" : (CHARS.find((c) => c.id === charRef.current)?.emoji || "🦸"), s2.px, s2.py); }
      // floats
      for (const f of s2.floats) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.c; ctx.font = "bold 16px sans-serif"; ctx.fillText(f.txt, f.x, f.y); ctx.globalAlpha = 1; }
      // 피격 플래시
      if (s2.hurtFlash > 0) { ctx.globalAlpha = Math.min(0.5, s2.hurtFlash * 2); ctx.fillStyle = "#f43f5e"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // 조이스틱
      if (joy.current.active) { ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.current.ox, joy.current.oy, 45, 0, 7); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(joy.current.ox + joy.current.dx * 45, joy.current.oy + joy.current.dy * 45, 16, 0, 7); ctx.fill(); }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); canvas.removeEventListener("touchstart", ts); canvas.removeEventListener("touchmove", tm); canvas.removeEventListener("touchend", te); };
  }, []);

  const mm = Math.floor(hud.t / 60), ss = Math.floor(hud.t % 60);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white flex flex-col items-center px-3 py-3">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-indigo-300 text-sm">← 홈</Link>
          <h1 className="text-base font-black text-amber-300">🦸 서바이버</h1>
          <span className="text-xs text-gray-400">🏆 {Math.floor(best / 60)}:{String(best % 60).padStart(2, "0")}</span>
        </div>
        {/* HUD */}
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-red-400 w-6">HP</span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all" style={{ width: `${hud.hp / hud.maxHp * 100}%` }} /></div>
          <span className="w-10 text-right">{hud.hp}</span>
        </div>
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-cyan-300 w-6">Lv{hud.lvl}</span>
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${hud.xp / hud.xpNext * 100}%` }} /></div>
          <span className="text-emerald-300 w-14 text-right">⏱️{mm}:{String(ss).padStart(2, "0")}</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-800/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full touch-none bg-slate-950" />

          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col gap-2 bg-black/90 px-3 py-3 overflow-auto">
              {!showShop ? (<>
                <div className="text-center">
                  <h2 className="text-xl font-black text-amber-300">🦸 서바이버</h2>
                  <p className="text-[11px] text-gray-400">이동만 하면 자동 공격! 🖥️WASD/화살표 · 📱드래그</p>
                </div>
                {/* 캐릭터 선택 */}
                <p className="text-[11px] font-bold text-cyan-300">👤 캐릭터 선택</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHARS.map((c) => (
                    <button key={c.id} onClick={() => setCharId(c.id)} className={`flex items-center gap-2 rounded-lg border-2 p-1.5 text-left ${charId === c.id ? "border-cyan-400 bg-cyan-950/50" : "border-slate-700 bg-slate-900/50 opacity-70"}`}>
                      <span className="text-2xl">{c.emoji}</span>
                      <div><div className="text-xs font-bold">{c.name}</div><div className="text-[9px] text-gray-400">{c.desc}</div></div>
                    </button>
                  ))}
                </div>
                {/* 누적 목표 */}
                <div className="rounded-lg bg-amber-950/50 border border-amber-800/50 p-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-amber-300">
                    <span>🎯 누적 생존 {Math.floor(GOAL_TOTAL / 60)}분 = 클리어</span>
                    <span>{Math.floor(totalT / 60)}:{String(totalT % 60).padStart(2, "0")} {totalT >= GOAL_TOTAL ? "✅" : ""}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, totalT / GOAL_TOTAL * 100)}%` }} /></div>
                </div>
                <div className="text-center text-xs font-bold text-yellow-400">💰 골드: {gold}</div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => setShowShop(true)} className="rounded-xl bg-slate-700 py-3 font-black active:scale-95">🏪 영구 강화</button>
                  <button onClick={start} className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black py-3 font-black active:scale-95">▶ 시작!</button>
                </div>
              </>) : (<>
                {/* 영구 강화 상점 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-yellow-300">🏪 영구 강화</h2>
                  <span className="text-sm font-bold text-yellow-400">💰 {gold}</span>
                </div>
                <p className="text-[10px] text-gray-400">골드로 사면 <b>영구히</b> 강해져요 (매판 적용, 저장됨)</p>
                <div className="space-y-1.5">
                  {METAS.map((m) => {
                    const lvl = meta[m.key] || 0; const maxed = lvl >= m.max; const cost = m.cost(lvl);
                    const can = !maxed && gold >= cost;
                    return (
                      <button key={m.key} onClick={() => buyMeta(m)} disabled={!can} className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left ${maxed ? "border-yellow-600 bg-yellow-950/40" : can ? "border-green-600 bg-green-950/40 active:scale-95" : "border-slate-700 bg-slate-900/50 opacity-60"}`}>
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="flex-1"><div className="text-xs font-bold">{m.name} <span className="text-[9px] text-cyan-400">Lv.{lvl}/{m.max}</span></div>
                          <div className="mt-0.5 flex gap-0.5">{Array.from({ length: m.max }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i < lvl ? "bg-yellow-400" : "bg-slate-700"}`} />)}</div>
                        </div>
                        <span className="text-xs font-bold text-yellow-400">{maxed ? "MAX" : `💰${cost}`}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowShop(false)} className="mt-2 rounded-xl bg-slate-700 py-2.5 font-black active:scale-95">← 돌아가기</button>
              </>)}
            </div>
          )}

          {phase === "levelup" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 text-center px-4">
              <h2 className="text-xl font-black text-cyan-300">⬆️ LEVEL UP! (Lv.{hud.lvl})</h2>
              <p className="text-xs text-gray-400 mb-1">업그레이드를 하나 골라라</p>
              <div className="w-full space-y-2">
                {choices.map((u) => (
                  <button key={u.key} onClick={() => chooseUpgrade(u)} className="w-full flex items-center gap-3 rounded-xl border border-cyan-700 bg-cyan-950/50 p-2.5 text-left hover:bg-cyan-900/50 active:scale-95">
                    <span className="text-3xl">{u.emoji}</span>
                    <div className="flex-1">
                      <div className="font-black text-cyan-200">{u.name} <span className="text-[10px] text-cyan-400">Lv.{u.get(g.current.stats) + 1}</span></div>
                      <div className="text-[11px] text-gray-300">{u.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "dead" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/88 text-center px-5">
              <div className="text-6xl">💀</div>
              <h2 className="text-2xl font-black text-red-500">GAME OVER</h2>
              <p className="text-sm text-gray-300">{mm}분 {ss}초 생존 · Lv.{hud.lvl} · 처치 {hud.kills}</p>
              <p className="text-sm font-bold text-yellow-400">💰 +{runGold} 골드 획득! (보유 {gold})</p>
              <p className="text-[11px] text-amber-400">🎯 누적 {Math.floor(totalT / 60)}분 / {Math.floor(GOAL_TOTAL / 60)}분 · 🏪 골드로 영구 강화 가능!</p>
              <div className="w-40 h-1.5 rounded-full bg-black/50 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${Math.min(100, totalT / GOAL_TOTAL * 100)}%` }} /></div>
              {Math.floor(hud.t) >= best && hud.t > 0 && <p className="text-amber-300 font-bold">🏆 신기록!</p>}
              <button onClick={start} className="mt-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black px-8 py-3 font-black shadow-lg active:scale-95">🔄 다시</button>
            </div>
          )}

          {phase === "clear" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-amber-900/90 to-black text-center px-5">
              <div className="text-6xl animate-bounce">🏆</div>
              <h2 className="text-3xl font-black text-yellow-300 tracking-widest">GAME CLEAR!</h2>
              <p className="text-sm text-yellow-100">누적 {Math.floor(GOAL_TOTAL / 60)}분 생존 달성!<br />진정한 서바이버다! 🎉</p>
              <button onClick={start} className="mt-2 rounded-xl bg-yellow-400 text-black px-8 py-3 font-black shadow-lg active:scale-95">🔄 다시 도전</button>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">이동하며 생존! 레벨업으로 🗡️볼트·🌀회전검·💥폭발파를 강화해 오래 버텨라. 45초마다 👹보스!</p>
      </div>
    </div>
  );
}
