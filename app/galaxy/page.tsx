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
const sLaser = () => beep(1000, 0.03, "square", 0.025);
const sHit = () => beep(240, 0.04, "sawtooth", 0.04);
const sXp = () => beep(1500, 0.03, "triangle", 0.025);
const sLvl = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.1, "triangle", 0.06), i * 60)); };
const sHurt = () => beep(110, 0.14, "square", 0.07);
const sBoss = () => { [180, 130, 90].forEach((f, i) => setTimeout(() => beep(f, 0.3, "sawtooth", 0.1), i * 150)); };
const sDie = () => { [400, 300, 200, 110].forEach((f, i) => setTimeout(() => beep(f, 0.22, "sawtooth", 0.08), i * 110)); };
const sBuy = () => beep(900, 0.08, "triangle", 0.06);

const W = 390, H = 500;
const SAVE_BEST = "galaxy_best", SAVE_TOTAL = "galaxy_total", SAVE_GOLD = "galaxy_gold", SAVE_META = "galaxy_meta";
const GOAL_TOTAL = 1800; // 누적 30분 = 클리어 (여러 판, 저장됨)

type WKey = "laser" | "missile" | "sword" | "aura" | "chain";
type Stats = { hp: number; maxHp: number; dmg: number; fireRate: number; speed: number; magnet: number; pierce: number; crit: number; count: number };
type Weapons = Record<WKey, number>;
type Enemy = { x: number; y: number; hp: number; maxHp: number; r: number; speed: number; dmg: number; type: string; boss: boolean; hitCd: number; shootCd: number; emoji: string };
type Bullet = { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number; homing: boolean };
type EB = { x: number; y: number; vx: number; vy: number; life: number };
type Gem = { x: number; y: number; v: number };
type Part = { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number };
type Float = { x: number; y: number; txt: string; life: number; c: string; big: boolean };

const SHIPS = [
  { id: "fighter", name: "전투기", emoji: "🚀", desc: "균형형", apply: (s: Stats, w: Weapons) => { void w; s.maxHp += 20; } },
  { id: "bomber", name: "폭격기", emoji: "🛸", desc: "체력·오라", apply: (s: Stats, w: Weapons) => { s.maxHp += 60; w.aura = 1; } },
  { id: "scout", name: "정찰기", emoji: "🛰️", desc: "빠름·미사일", apply: (s: Stats, w: Weapons) => { s.speed += 0.4; w.missile = 1; } },
];
const WEAPON_INFO: Record<WKey, { name: string; emoji: string; desc: string; max: number }> = {
  laser: { name: "레이저", emoji: "🔫", desc: "가장 가까운 적 자동 사격", max: 8 },
  missile: { name: "유도 미사일", emoji: "🚀", desc: "적을 쫓아가는 미사일", max: 8 },
  sword: { name: "회전 검", emoji: "🗡️", desc: "주위를 도는 칼날", max: 6 },
  aura: { name: "플라즈마 오라", emoji: "🟣", desc: "주변 적에게 지속 피해", max: 6 },
  chain: { name: "번개", emoji: "⚡", desc: "적 사이를 튀는 번개", max: 6 },
};
type PassiveKey = "dmg" | "fireRate" | "speed" | "maxHp" | "magnet" | "pierce" | "crit" | "count";
const PASSIVE_INFO: Record<PassiveKey, { name: string; emoji: string; desc: string; max: number; apply: (s: Stats) => void }> = {
  dmg: { name: "공격력", emoji: "💪", desc: "모든 피해 +20%", max: 10, apply: (s) => { s.dmg += 0.2; } },
  fireRate: { name: "연사", emoji: "⚡", desc: "발사 속도↑", max: 8, apply: (s) => { s.fireRate += 0.25; } },
  speed: { name: "엔진", emoji: "👟", desc: "이동 속도↑", max: 6, apply: (s) => { s.speed += 0.15; } },
  maxHp: { name: "장갑", emoji: "❤️", desc: "최대 HP +30 (회복)", max: 8, apply: (s) => { s.maxHp += 30; } },
  magnet: { name: "자석", emoji: "🧲", desc: "경험치 흡수 범위↑", max: 6, apply: (s) => { s.magnet += 25; } },
  pierce: { name: "관통", emoji: "🎯", desc: "발사체 관통 +1", max: 5, apply: (s) => { s.pierce += 1; } },
  crit: { name: "크리티컬", emoji: "✨", desc: "치명타 확률 +8%", max: 6, apply: (s) => { s.crit += 0.08; } },
  count: { name: "다발", emoji: "🔱", desc: "발사체 +1", max: 5, apply: (s) => { s.count += 1; } },
};
const METAS = [
  { key: "hp", name: "시작 장갑", emoji: "❤️", max: 10, cost: (l: number) => 25 + l * 20, apply: (s: Stats, l: number) => { s.maxHp += l * 25; } },
  { key: "dmg", name: "무기 공학", emoji: "💪", max: 10, cost: (l: number) => 30 + l * 25, apply: (s: Stats, l: number) => { s.dmg += l * 0.15; } },
  { key: "speed", name: "엔진 개조", emoji: "👟", max: 8, cost: (l: number) => 25 + l * 18, apply: (s: Stats, l: number) => { s.speed += l * 0.08; } },
  { key: "crit", name: "조준 장치", emoji: "✨", max: 8, cost: (l: number) => 30 + l * 22, apply: (s: Stats, l: number) => { s.crit += l * 0.05; } },
  { key: "magnet", name: "회수 장치", emoji: "🧲", max: 6, cost: (l: number) => 20 + l * 15, apply: (s: Stats, l: number) => { s.magnet += l * 20; } },
];

const baseStats = (): Stats => ({ hp: 100, maxHp: 100, dmg: 1, fireRate: 1, speed: 1, magnet: 45, pierce: 0, crit: 0.05, count: 1 });
const baseWeapons = (): Weapons => ({ laser: 1, missile: 0, sword: 0, aura: 0, chain: 0 });

type Choice = { kind: "weapon"; key: WKey } | { kind: "passive"; key: PassiveKey };

export default function Galaxy() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "levelup" | "dead" | "clear">("ready");
  const [showShop, setShowShop] = useState(false);
  const [shipId, setShipId] = useState("fighter");
  const shipRef = useRef("fighter"); useEffect(() => { shipRef.current = shipId; }, [shipId]);
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0, gold: 0 });
  const [choices, setChoices] = useState<Choice[]>([]);
  const [best, setBest] = useState(0);
  const [totalT, setTotalT] = useState(0); const totalRef = useRef(0);
  const [gold, setGold] = useState(0); const goldRef = useRef(0);
  const [meta, setMeta] = useState<Record<string, number>>({}); const metaRef = useRef<Record<string, number>>({});
  useEffect(() => { metaRef.current = meta; }, [meta]);
  const phaseRef = useRef(phase); useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(SAVE_BEST) || 0));
      const tt = Number(localStorage.getItem(SAVE_TOTAL) || 0); totalRef.current = tt; setTotalT(tt);
      const gd = Number(localStorage.getItem(SAVE_GOLD) || 0); goldRef.current = gd; setGold(gd);
      const mt = JSON.parse(localStorage.getItem(SAVE_META) || "{}"); metaRef.current = mt; setMeta(mt);
    } catch { /* ignore */ }
  }, []);
  const saveMeta = (g: number, m: Record<string, number>) => { try { localStorage.setItem(SAVE_GOLD, String(g)); localStorage.setItem(SAVE_META, JSON.stringify(m)); } catch { /* ignore */ } };

  const g = useRef({
    px: W / 2, py: H / 2, s: baseStats(), w: baseWeapons(),
    lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0, gold: 0,
    enemies: [] as Enemy[], bullets: [] as Bullet[], ebullets: [] as EB[], gems: [] as Gem[], parts: [] as Part[], floats: [] as Float[],
    spawnAcc: 0, bossAcc: 0, laserAcc: 0, missileAcc: 0, auraAcc: 0, chainAcc: 0, orbitAng: 0, hurtCd: 0, shake: 0, dead: false,
  });
  const keys = useRef<Record<string, boolean>>({});
  const joy = useRef({ active: false, ox: 0, oy: 0, dx: 0, dy: 0 });

  const mkEnemy = (t: number, boss = false): Enemy => {
    const edge = Math.floor(Math.random() * 4); let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * W; y = -20; } else if (edge === 1) { x = W + 20; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 20; } else { x = -20; y = Math.random() * H; }
    if (boss) { const hp = 300 + t * 30; return { x: W / 2, y: -30, hp, maxHp: hp, r: 26, speed: 22 + t * 0.15, dmg: 25, type: "boss", boss: true, hitCd: 0, shootCd: 2, emoji: "👾" }; }
    const r = Math.random();
    let type = "rock";
    if (t > 15 && r < 0.2) type = "shooter"; else if (t > 8 && r < 0.4) type = "charger"; else if (r < 0.65) type = "alien"; else type = "rock";
    // 정예(엘리트)화: 잡몹 없이 하나하나 튼튼하고 위협적
    const hpMul = type === "rock" ? 2.6 : type === "shooter" ? 2.0 : 1.8;
    const hp = (9 + t * 1.3) * hpMul;
    const spd = (type === "charger" ? 58 : type === "shooter" ? 26 : type === "rock" ? 24 : 34) + t * 0.4;
    const emoji = type === "rock" ? "☄️" : type === "charger" ? "🦂" : type === "shooter" ? "🛸" : "👽";
    return { x, y, hp, maxHp: hp, r: type === "rock" ? 16 : 14, speed: spd, dmg: 9 + t * 0.12, type, boss: false, hitCd: 0, shootCd: 1.5 + Math.random(), emoji };
  };

  const start = useCallback(() => {
    const s = baseStats(), w = baseWeapons();
    for (const m of METAS) { const l = metaRef.current[m.key] || 0; if (l) m.apply(s, l); }
    const sh = SHIPS.find((c) => c.id === shipRef.current) || SHIPS[0]; sh.apply(s, w);
    s.hp = s.maxHp;
    const st = g.current;
    st.px = W / 2; st.py = H / 2; st.s = s; st.w = w;
    st.lvl = 1; st.xp = 0; st.xpNext = 5; st.t = 0; st.kills = 0; st.gold = 0;
    st.enemies = []; st.bullets = []; st.ebullets = []; st.gems = []; st.parts = []; st.floats = [];
    st.spawnAcc = 0; st.bossAcc = 0; st.laserAcc = 0; st.missileAcc = 0; st.auraAcc = 0; st.chainAcc = 0; st.orbitAng = 0; st.hurtCd = 0; st.shake = 0; st.dead = false;
    setHud({ hp: s.hp, maxHp: s.maxHp, lvl: 1, xp: 0, xpNext: 5, t: 0, kills: 0, gold: 0 });
    setPhase("play");
  }, []);

  const pickLevelUp = () => {
    const st = g.current; const pool: Choice[] = [];
    (Object.keys(WEAPON_INFO) as WKey[]).forEach((k) => { if (st.w[k] < WEAPON_INFO[k].max) pool.push({ kind: "weapon", key: k }); });
    (Object.keys(PASSIVE_INFO) as PassiveKey[]).forEach((k) => {
      const cur = k === "count" ? st.s.count - 1 : k === "pierce" ? st.s.pierce : k === "dmg" ? Math.round((st.s.dmg - 1) * 5) : k === "fireRate" ? Math.round((st.s.fireRate - 1) * 4) : k === "speed" ? Math.round((st.s.speed - 1) * 6.67) : k === "maxHp" ? Math.round((st.s.maxHp - 100) / 30) : k === "magnet" ? Math.round((st.s.magnet - 45) / 25) : Math.round(st.s.crit / 0.08);
      if (cur < PASSIVE_INFO[k].max) pool.push({ kind: "passive", key: k });
    });
    const pick = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    setChoices(pick.length ? pick : [{ kind: "passive", key: "dmg" }]);
    setPhase("levelup"); sLvl();
  };
  const choose = (c: Choice) => {
    const st = g.current;
    if (c.kind === "weapon") st.w[c.key]++;
    else { PASSIVE_INFO[c.key].apply(st.s); if (c.key === "maxHp") st.s.hp = Math.min(st.s.maxHp, st.s.hp + 30); }
    setPhase("play");
  };
  const buyMeta = (m: typeof METAS[number]) => {
    const lvl = metaRef.current[m.key] || 0; if (lvl >= m.max) return;
    const cost = m.cost(lvl); if (goldRef.current < cost) return;
    goldRef.current -= cost; setGold(goldRef.current);
    const nm = { ...metaRef.current, [m.key]: lvl + 1 }; metaRef.current = nm; setMeta(nm); saveMeta(goldRef.current, nm); sBuy();
  };

  const burst = (st: typeof g.current, x: number, y: number, n: number, c: string) => {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 140; st.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, c, r: 1.5 + Math.random() * 2 }); }
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let raf = 0, last = performance.now();
    const kd = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    const toC = (cx: number, cy: number) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; };
    const ts = (e: TouchEvent) => { const p = toC(e.touches[0].clientX, e.touches[0].clientY); joy.current = { active: true, ox: p.x, oy: p.y, dx: 0, dy: 0 }; };
    const tm = (e: TouchEvent) => { if (!joy.current.active) return; e.preventDefault(); const p = toC(e.touches[0].clientX, e.touches[0].clientY); const dx = p.x - joy.current.ox, dy = p.y - joy.current.oy, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 45); joy.current.dx = dx / d * m; joy.current.dy = dy / d * m; };
    const te = () => { joy.current.active = false; joy.current.dx = 0; joy.current.dy = 0; };
    canvas.addEventListener("touchstart", ts, { passive: true });
    canvas.addEventListener("touchmove", tm, { passive: false });
    canvas.addEventListener("touchend", te);
    const nearestIdx = (x: number, y: number, arr: Enemy[]) => { let bd = 1e9, bi = -1; for (let i = 0; i < arr.length; i++) { const d = (arr[i].x - x) ** 2 + (arr[i].y - y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
    const dealDmg = (st: typeof g.current, e: Enemy, dmg: number, cx: number, cy: number) => {
      const crit = Math.random() < st.s.crit; const d = crit ? dmg * 2 : dmg; e.hp -= d;
      st.floats.push({ x: cx, y: cy - 6, txt: `${Math.round(d)}`, life: 0.6, c: crit ? "#fde047" : "#fff", big: crit });
    };

    const loop = (tms: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (tms - last) / 1000); last = tms;
      const st = g.current; const s = st.s, w = st.w;
      const ctx = canvas.getContext("2d"); if (!ctx) return;

      if (phaseRef.current === "play" && !st.dead) {
        st.t += dt;
        // 이동
        let mx = 0, my = 0;
        if (keys.current["arrowleft"] || keys.current["a"]) mx -= 1;
        if (keys.current["arrowright"] || keys.current["d"]) mx += 1;
        if (keys.current["arrowup"] || keys.current["w"]) my -= 1;
        if (keys.current["arrowdown"] || keys.current["s"]) my += 1;
        if (joy.current.active) { mx = joy.current.dx; my = joy.current.dy; }
        const ml = Math.hypot(mx, my) || 1;
        if (mx || my) { const sp = 130 * s.speed; st.px += mx / ml * sp * dt; st.py += my / ml * sp * dt; }
        st.px = Math.max(10, Math.min(W - 10, st.px)); st.py = Math.max(10, Math.min(H - 10, st.py));

        // 스폰
        const bossAlive = st.enemies.some((e) => e.boss);
        st.spawnAcc += dt;
        const every = Math.max(0.7, 1.8 - st.t * 0.012);
        const mobs = st.enemies.reduce((a, e) => a + (e.boss ? 0 : 1), 0);
        if (st.spawnAcc > every && mobs < 14 && !bossAlive) { st.spawnAcc = 0; const n = 1 + Math.floor(st.t / 60); for (let i = 0; i < n; i++) st.enemies.push(mkEnemy(st.t)); } // 보스전엔 잡몹 스폰 정지
        st.bossAcc += dt;
        if (st.bossAcc > 22 && !bossAlive) {
          st.bossAcc = 0;
          st.enemies = st.enemies.filter((e) => e.boss); st.ebullets = []; // 잡몹 전부 소탕!
          st.enemies.push(mkEnemy(st.t, true)); sBoss(); st.shake = 12;
          st.floats.push({ x: W / 2, y: 50, txt: "⚠️ 보스전! 잡몹 소탕!", life: 1.8, c: "#f43f5e", big: true });
        }

        // 적 이동/행동
        for (const e of st.enemies) {
          const dx = st.px - e.x, dy = st.py - e.y, d = Math.hypot(dx, dy) || 1;
          if (e.type === "shooter") {
            if (d > 150) { e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; }
            e.shootCd -= dt;
            if (e.shootCd <= 0) { e.shootCd = 2.2; const sp = 150; st.ebullets.push({ x: e.x, y: e.y, vx: dx / d * sp, vy: dy / d * sp, life: 4 }); beep(500, 0.05, "square", 0.03); }
          } else { e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; }
          if (e.boss) { e.shootCd -= dt; if (e.shootCd <= 0) { e.shootCd = 1.8; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; st.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 4 }); } } }
          e.hitCd -= dt;
          if (d < e.r + 9 && e.hitCd <= 0 && st.hurtCd <= 0) { s.hp -= e.dmg; e.hitCd = 0.5; st.hurtCd = 0.4; st.shake = 8; sHurt(); }
        }
        // 적 총알
        for (const b of st.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (st.hurtCd <= 0 && Math.hypot(b.x - st.px, b.y - st.py) < 10) { s.hp -= 8; st.hurtCd = 0.4; st.shake = 8; sHurt(); b.life = 0; } }
        st.ebullets = st.ebullets.filter((b) => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
        if (st.hurtCd > 0) st.hurtCd -= dt;

        // 사망 체크
        if (s.hp <= 0 && !st.dead) {
          st.dead = true; sDie(); const sc = Math.floor(st.t);
          totalRef.current += sc; setTotalT(totalRef.current);
          goldRef.current += st.gold; setGold(goldRef.current); saveMeta(goldRef.current, metaRef.current);
          try { const bb = Number(localStorage.getItem(SAVE_BEST) || 0); if (sc > bb) { localStorage.setItem(SAVE_BEST, String(sc)); setBest(sc); } localStorage.setItem(SAVE_TOTAL, String(totalRef.current)); } catch { /* ignore */ }
          if (totalRef.current >= GOAL_TOTAL) { setPhase("clear"); } else setPhase("dead");
        }

        // 무기: 레이저
        st.laserAcc += dt;
        if (st.laserAcc > 0.7 / s.fireRate && st.enemies.length) {
          st.laserAcc = 0; sLaser();
          for (let k = 0; k < s.count; k++) { const bi = nearestIdx(st.px, st.py, st.enemies); if (bi < 0) break; const e = st.enemies[(bi + k) % st.enemies.length]; const dx = e.x - st.px, dy = e.y - st.py, d = Math.hypot(dx, dy) || 1; st.bullets.push({ x: st.px, y: st.py, vx: dx / d * 340, vy: dy / d * 340, dmg: 4 * s.dmg * w.laser, pierce: s.pierce + 1, life: 2, homing: false }); }
        }
        // 무기: 미사일 (유도)
        if (w.missile > 0) { st.missileAcc += dt; if (st.missileAcc > 1.0 / s.fireRate && st.enemies.length) { st.missileAcc = 0; for (let k = 0; k < w.missile; k++) { const a = Math.random() * Math.PI * 2; st.bullets.push({ x: st.px, y: st.py, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, dmg: 8 * s.dmg * w.missile, pierce: 0, life: 3, homing: true }); } beep(700, 0.05, "sawtooth", 0.03); } }
        // 무기: 오라
        if (w.aura > 0) { st.auraAcc += dt; if (st.auraAcc > 0.4) { st.auraAcc = 0; const R = 55 + w.aura * 12; for (const e of st.enemies) if (Math.hypot(e.x - st.px, e.y - st.py) < R + e.r) dealDmg(st, e, 3 * s.dmg * w.aura, e.x, e.y); } }
        // 무기: 번개 (체인)
        if (w.chain > 0) { st.chainAcc += dt; if (st.chainAcc > 1.4 && st.enemies.length) { st.chainAcc = 0; beep(400, 0.06, "square", 0.04); let cx = st.px, cy = st.py; const hitList: Enemy[] = []; for (let j = 0; j < 2 + w.chain; j++) { let bd = 1e9, bi = -1; for (let i = 0; i < st.enemies.length; i++) { const e = st.enemies[i]; if (hitList.includes(e)) continue; const d = (e.x - cx) ** 2 + (e.y - cy) ** 2; if (d < bd && d < 160 ** 2) { bd = d; bi = i; } } if (bi < 0) break; const e = st.enemies[bi]; dealDmg(st, e, 6 * s.dmg * w.chain, e.x, e.y); st.floats.push({ x: (cx + e.x) / 2, y: (cy + e.y) / 2, txt: "⚡", life: 0.25, c: "#a855f7", big: false }); hitList.push(e); cx = e.x; cy = e.y; } } }
        // 회전 검
        st.orbitAng += dt * 2.6;
        if (w.sword > 0) { const n = w.sword, R = 48; for (let i = 0; i < n; i++) { const ang = st.orbitAng + (i / n) * Math.PI * 2, bx = st.px + Math.cos(ang) * R, by = st.py + Math.sin(ang) * R; for (const e of st.enemies) if (e.hitCd <= 0 && Math.hypot(e.x - bx, e.y - by) < e.r + 9) { dealDmg(st, e, 5 * s.dmg, bx, by); e.hitCd = 0.18; } } }

        // 발사체 이동
        for (const b of st.bullets) {
          if (b.homing && st.enemies.length) { const bi = nearestIdx(b.x, b.y, st.enemies); if (bi >= 0) { const e = st.enemies[bi]; const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy) || 1; const desiredVx = dx / d * 220, desiredVy = dy / d * 220; b.vx += (desiredVx - b.vx) * 4 * dt; b.vy += (desiredVy - b.vy) * 4 * dt; } }
          b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
          for (const e of st.enemies) { if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 4) { dealDmg(st, e, b.dmg, b.x, b.y); burst(st, b.x, b.y, 3, "#fde047"); b.pierce--; if (b.pierce < 0) { b.life = 0; } break; } }
        }
        st.bullets = st.bullets.filter((b) => b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30);

        // 적 사망
        const alive: Enemy[] = [];
        for (const e of st.enemies) {
          if (e.hp > 0) alive.push(e);
          else { st.kills++; sHit(); burst(st, e.x, e.y, e.boss ? 24 : 10, e.boss ? "#f59e0b" : "#f43f5e"); st.gold += e.boss ? 30 : 3;
            if (e.boss) { for (let i = 0; i < 10; i++) st.gems.push({ x: e.x + (Math.random() - 0.5) * 40, y: e.y + (Math.random() - 0.5) * 40, v: 5 }); st.floats.push({ x: e.x, y: e.y, txt: "💰+30", life: 1, c: "#fbbf24", big: true }); }
            else st.gems.push({ x: e.x, y: e.y, v: 3 }); // 정예는 경험치 넉넉히
          }
        }
        st.enemies = alive;

        // 젬 흡수
        for (const gm of st.gems) { const d = Math.hypot(gm.x - st.px, gm.y - st.py); if (d < s.magnet) { gm.x += (st.px - gm.x) * 0.25; gm.y += (st.py - gm.y) * 0.25; } if (d < 12) { st.xp += gm.v; gm.v = -999; sXp(); } }
        st.gems = st.gems.filter((gm) => gm.v > 0);
        while (!st.dead && st.xp >= st.xpNext) { st.xp -= st.xpNext; st.lvl++; st.xpNext = Math.floor(5 + st.lvl * 3.5); pickLevelUp(); } // 죽었으면 레벨업 금지

        // 파티클/플로팅
        for (const p of st.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        st.parts = st.parts.filter((p) => p.life > 0);
        for (const f of st.floats) { f.y -= 22 * dt; f.life -= dt; }
        st.floats = st.floats.filter((f) => f.life > 0);
        if (st.shake > 0) st.shake = Math.max(0, st.shake - 40 * dt);

        setHud({ hp: Math.max(0, Math.ceil(s.hp)), maxHp: s.maxHp, lvl: st.lvl, xp: st.xp, xpNext: st.xpNext, t: st.t, kills: st.kills, gold: st.gold });
      }

      // ───── 렌더 ─────
      ctx.save();
      if (st.shake > 0) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      ctx.fillStyle = "#05060f"; ctx.fillRect(-20, -20, W + 40, H + 40);
      // 별
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 173 + Math.floor(st.t * 20)) % H; ctx.fillRect(x, y, 1, 1); }
      const s2 = g.current;
      // 오라
      if (s2.w.aura > 0 && phaseRef.current !== "ready") { const R = 55 + s2.w.aura * 12; ctx.fillStyle = "rgba(168,85,247,0.12)"; ctx.beginPath(); ctx.arc(s2.px, s2.py, R, 0, 7); ctx.fill(); }
      // 젬
      for (const gm of s2.gems) { ctx.fillStyle = gm.v > 1 ? "#f59e0b" : "#22d3ee"; ctx.beginPath(); ctx.arc(gm.x, gm.y, gm.v > 1 ? 4 : 3, 0, 7); ctx.fill(); }
      // 파티클
      for (const p of s2.parts) { ctx.globalAlpha = Math.min(1, p.life * 2.5); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
      // 아군 발사체
      for (const b of s2.bullets) { ctx.fillStyle = b.homing ? "#fb923c" : "#fde047"; ctx.beginPath(); ctx.arc(b.x, b.y, b.homing ? 4 : 3, 0, 7); ctx.fill(); }
      // 적 총알
      ctx.fillStyle = "#f472b6"; for (const b of s2.ebullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill(); }
      // 적
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const e of s2.enemies) { ctx.font = `${e.r * 1.8}px serif`; ctx.fillText(e.emoji, e.x, e.y); if (e.hp < e.maxHp) { const bw = e.r * 2; ctx.fillStyle = "#000"; ctx.fillRect(e.x - bw / 2, e.y - e.r - 5, bw, 3); ctx.fillStyle = e.boss ? "#f59e0b" : "#22c55e"; ctx.fillRect(e.x - bw / 2, e.y - e.r - 5, bw * (e.hp / e.maxHp), 3); } }
      // 회전 검
      if (s2.w.sword > 0 && phaseRef.current !== "ready") { const n = s2.w.sword, R = 48; ctx.font = "18px serif"; for (let i = 0; i < n; i++) { const ang = s2.orbitAng + (i / n) * Math.PI * 2; ctx.fillText("🗡️", s2.px + Math.cos(ang) * R, s2.py + Math.sin(ang) * R); } }
      // 우주선
      if (phaseRef.current !== "ready") { ctx.font = "24px serif"; ctx.globalAlpha = s2.hurtCd > 0.2 ? 0.5 : 1; ctx.fillText(s2.dead ? "💥" : (SHIPS.find((c) => c.id === shipRef.current)?.emoji || "🚀"), s2.px, s2.py); ctx.globalAlpha = 1; }
      // 플로팅
      for (const f of s2.floats) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.c; ctx.font = `bold ${f.big ? 18 : 13}px sans-serif`; ctx.fillText(f.txt, f.x, f.y); } ctx.globalAlpha = 1;
      ctx.restore();
      // 피격 플래시
      if (s2.hurtCd > 0.25) { ctx.globalAlpha = 0.25; ctx.fillStyle = "#f43f5e"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // 조이스틱
      if (joy.current.active) { ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.current.ox, joy.current.oy, 45, 0, 7); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(joy.current.ox + joy.current.dx * 45, joy.current.oy + joy.current.dy * 45, 16, 0, 7); ctx.fill(); }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); canvas.removeEventListener("touchstart", ts); canvas.removeEventListener("touchmove", tm); canvas.removeEventListener("touchend", te); };
  }, []);

  const mm = Math.floor(hud.t / 60), ss = Math.floor(hud.t % 60);
  const chLabel = (c: Choice) => {
    if (c.kind === "weapon") { const cur = g.current.w[c.key]; return { emoji: WEAPON_INFO[c.key].emoji, name: WEAPON_INFO[c.key].name, desc: WEAPON_INFO[c.key].desc, lv: cur + 1, isNew: cur === 0 }; }
    return { emoji: PASSIVE_INFO[c.key].emoji, name: PASSIVE_INFO[c.key].name, desc: PASSIVE_INFO[c.key].desc, lv: 0, isNew: false };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white flex flex-col items-center px-3 py-2">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-indigo-300 text-sm">← 홈</Link>
          <h1 className="text-base font-black text-cyan-300">🚀 은하 서바이버</h1>
          <span className="text-xs text-gray-400">🏆 {Math.floor(best / 60)}:{String(best % 60).padStart(2, "0")}</span>
        </div>
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-red-400 w-6">HP</span>
          <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all" style={{ width: `${hud.hp / hud.maxHp * 100}%` }} /></div>
          <span className="w-9 text-right">{hud.hp}</span>
        </div>
        <div className="flex items-center gap-2 mb-1 text-xs font-bold">
          <span className="text-cyan-300 w-8">Lv{hud.lvl}</span>
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${hud.xp / hud.xpNext * 100}%` }} /></div>
          <span className="text-yellow-400 w-12 text-right">💰{hud.gold}</span>
          <span className="text-emerald-300 w-12 text-right">{mm}:{String(ss).padStart(2, "0")}</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-800/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full touch-none bg-slate-950" />

          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col gap-2 bg-black/92 px-3 py-3 overflow-auto">
              {!showShop ? (<>
                <div className="text-center"><h2 className="text-xl font-black text-cyan-300">🚀 은하 서바이버</h2><p className="text-[11px] text-gray-400">이동만 하면 자동 공격! 🖥️WASD · 📱드래그</p></div>
                <p className="text-[11px] font-bold text-cyan-300">🛸 우주선 선택</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SHIPS.map((c) => (
                    <button key={c.id} onClick={() => setShipId(c.id)} className={`rounded-lg border-2 p-2 text-center ${shipId === c.id ? "border-cyan-400 bg-cyan-950/50" : "border-slate-700 bg-slate-900/50 opacity-70"}`}>
                      <div className="text-2xl">{c.emoji}</div><div className="text-[10px] font-bold">{c.name}</div><div className="text-[8px] text-gray-400">{c.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-amber-950/50 border border-amber-800/50 p-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-amber-300"><span>🎯 누적 {Math.floor(GOAL_TOTAL / 60)}분 생존 = 클리어</span><span>{Math.floor(totalT / 60)}:{String(totalT % 60).padStart(2, "0")} {totalT >= GOAL_TOTAL ? "✅" : ""}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, totalT / GOAL_TOTAL * 100)}%` }} /></div>
                </div>
                <div className="text-center text-xs font-bold text-yellow-400">💰 골드: {gold}</div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button onClick={() => setShowShop(true)} className="rounded-xl bg-slate-700 py-3 font-black active:scale-95">🏪 영구 강화</button>
                  <button onClick={start} className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-black py-3 font-black active:scale-95">▶ 출격!</button>
                </div>
              </>) : (<>
                <div className="flex items-center justify-between"><h2 className="text-lg font-black text-yellow-300">🏪 영구 강화</h2><span className="text-sm font-bold text-yellow-400">💰 {gold}</span></div>
                <div className="space-y-1.5">
                  {METAS.map((m) => { const lvl = meta[m.key] || 0, maxed = lvl >= m.max, cost = m.cost(lvl), can = !maxed && gold >= cost;
                    return (
                      <button key={m.key} onClick={() => buyMeta(m)} disabled={!can} className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left ${maxed ? "border-yellow-600 bg-yellow-950/40" : can ? "border-green-600 bg-green-950/40 active:scale-95" : "border-slate-700 bg-slate-900/50 opacity-60"}`}>
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="flex-1"><div className="text-xs font-bold">{m.name} <span className="text-[9px] text-cyan-400">Lv.{lvl}/{m.max}</span></div>
                          <div className="mt-0.5 flex gap-0.5">{Array.from({ length: m.max }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i < lvl ? "bg-yellow-400" : "bg-slate-700"}`} />)}</div></div>
                        <span className="text-xs font-bold text-yellow-400">{maxed ? "MAX" : `💰${cost}`}</span>
                      </button>
                    ); })}
                </div>
                <button onClick={() => setShowShop(false)} className="mt-2 rounded-xl bg-slate-700 py-2.5 font-black active:scale-95">← 돌아가기</button>
              </>)}
            </div>
          )}

          {phase === "levelup" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/92 px-4">
              <h2 className="text-xl font-black text-cyan-300">⬆️ LEVEL {hud.lvl}!</h2>
              <p className="text-xs text-gray-400 mb-1">업그레이드 선택</p>
              <div className="w-full space-y-2">
                {choices.map((c, i) => { const l = chLabel(c); return (
                  <button key={i} onClick={() => choose(c)} className="w-full flex items-center gap-3 rounded-xl border border-cyan-700 bg-cyan-950/50 p-2.5 text-left hover:bg-cyan-900/50 active:scale-95">
                    <span className="text-3xl">{l.emoji}</span>
                    <div className="flex-1"><div className="font-black text-cyan-200">{l.name} {l.isNew && <span className="text-[9px] bg-green-500 text-black px-1 rounded">NEW!</span>}{c.kind === "weapon" && !l.isNew && <span className="text-[10px] text-cyan-400"> Lv.{l.lv}</span>}</div><div className="text-[11px] text-gray-300">{l.desc}</div></div>
                  </button>
                ); })}
              </div>
            </div>
          )}

          {(phase === "dead" || phase === "clear") && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-5 ${phase === "clear" ? "bg-gradient-to-b from-amber-900/90 to-black" : "bg-black/88"}`}>
              <div className="text-6xl">{phase === "clear" ? "🏆" : "💥"}</div>
              <h2 className={`text-2xl font-black ${phase === "clear" ? "text-yellow-300" : "text-red-500"}`}>{phase === "clear" ? "GAME CLEAR!" : "GAME OVER"}</h2>
              <p className="text-sm text-gray-300">{mm}분 {ss}초 · Lv.{hud.lvl} · 처치 {hud.kills}</p>
              <p className="text-sm font-bold text-yellow-400">💰 +{hud.gold} 골드! (보유 {gold})</p>
              <p className="text-[11px] text-amber-400">🎯 누적 {Math.floor(totalT / 60)}분 / {Math.floor(GOAL_TOTAL / 60)}분 · 골드로 영구 강화!</p>
              <button onClick={() => setPhase("ready")} className="mt-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-black px-8 py-3 font-black active:scale-95">🔄 다시</button>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">🔫레이저 🚀유도미사일 🗡️회전검 🟣오라 ⚡번개 + 8가지 강화! 총 쏘는 적·분열 적·👾보스 탄막까지! 40초마다 보스 💰</p>
      </div>
    </div>
  );
}
