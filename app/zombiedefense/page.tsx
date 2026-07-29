"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

// ───── 효과음 (Web Audio) ─────
let ac: AudioContext | null = null;
function beep(freq: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ac = new AC();
    }
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* ignore */ }
}
const sfxShoot = () => beep(880, 0.05, "square", 0.06);
const sfxHit = () => beep(200, 0.06, "sawtooth", 0.08);
const sfxDead = () => { beep(300, 0.08, "triangle", 0.1); setTimeout(() => beep(150, 0.12, "sawtooth", 0.08), 60); };
const sfxHurt = () => beep(90, 0.18, "square", 0.12);

const W = 360, H = 520;
const BASE_Y = H - 44;
const PLAYER = { x: W / 2, y: H - 24 };
const SAVE = "zombiedef_best";

type Zombie = { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; dmg: number; emoji: string; r: number; boss: boolean };
type Tracer = { x1: number; y1: number; x2: number; y2: number; life: number };
type Hit = { x: number; y: number; life: number; txt: string };
type Weapon = { damage: number; cooldown: number; multishot: number; autoLevel: number };
type Phase = "ready" | "playing" | "shop" | "over";

const ZOMBIE_KINDS = ["🧟", "🧟‍♂️", "🧟‍♀️"];

export default function ZombieDefense() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [wave, setWave] = useState(1);
  const [coins, setCoins] = useState(0);
  const [score, setScore] = useState(0);
  const [baseHp, setBaseHp] = useState(100);
  const [weapon, setWeapon] = useState<Weapon>({ damage: 4, cooldown: 320, multishot: 1, autoLevel: 0 });
  const [best, setBest] = useState(0);

  const st = useRef({
    zombies: [] as Zombie[], tracers: [] as Tracer[], hits: [] as Hit[],
    toSpawn: 0, spawnTimer: 0, lastShot: 0, autoTimer: 0, baseHp: 100, uid: 0,
    wave: 1, coins: 0, score: 0,
  });
  const weaponRef = useRef(weapon);
  useEffect(() => { weaponRef.current = weapon; }, [weapon]);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => { try { setBest(Number(localStorage.getItem(SAVE) || 0)); } catch { /* ignore */ } }, []);

  // ───── 웨이브 시작 ─────
  const startWave = useCallback((w: number) => {
    const s = st.current;
    s.wave = w;
    s.toSpawn = 5 + w * 2;      // 웨이브마다 좀비 증가
    s.spawnTimer = 0;
    setWave(w);
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    const s = st.current;
    s.zombies = []; s.tracers = []; s.hits = [];
    s.baseHp = 100; s.coins = 0; s.score = 0; s.lastShot = 0; s.autoTimer = 0; s.uid = 0;
    setBaseHp(100); setCoins(0); setScore(0);
    setWeapon({ damage: 4, cooldown: 320, multishot: 1, autoLevel: 0 });
    startWave(1);
  }, [startWave]);

  // ───── 사격 처리 ─────
  const fireAt = useCallback((cx: number, cy: number, auto = false) => {
    const s = st.current;
    const wp = weaponRef.current;
    const now = performance.now();
    if (!auto) {
      if (now - s.lastShot < wp.cooldown) return;
      s.lastShot = now;
    }
    const dmg = auto ? Math.max(2, Math.floor(wp.damage * 0.6)) : wp.damage;
    const maxTargets = auto ? 1 : wp.multishot;
    // 클릭 지점 근처 좀비들 (가까운 순)
    const near = s.zombies
      .map((z) => ({ z, d: Math.hypot(z.x - cx, z.y - cy) }))
      .filter((o) => o.d < o.z.r + 22)
      .sort((a, b) => a.d - b.d)
      .slice(0, maxTargets);
    if (near.length === 0) {
      // 빗나감 — 조준 지점으로 tracer만
      s.tracers.push({ x1: PLAYER.x, y1: PLAYER.y, x2: cx, y2: cy, life: 6 });
      if (!auto) sfxShoot();
      return;
    }
    if (!auto) sfxShoot();
    for (const { z } of near) {
      s.tracers.push({ x1: PLAYER.x, y1: PLAYER.y, x2: z.x, y2: z.y, life: 6 });
      z.hp -= dmg;
      if (z.hp <= 0) {
        z.hp = 0;
        s.score += 1;
        const reward = z.boss ? 20 + s.wave * 2 : 2 + Math.floor(s.wave / 2);
        s.coins += reward;
        s.hits.push({ x: z.x, y: z.y, life: 22, txt: `+${reward}` });
        sfxDead();
      } else {
        s.hits.push({ x: z.x, y: z.y - 6, life: 12, txt: "💥" });
        sfxHit();
      }
    }
    s.zombies = s.zombies.filter((z) => z.hp > 0);
  }, []);

  // ───── 게임 루프 ─────
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0, last = performance.now();

    const onDown = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;
      fireAt(x, y, false);
    };
    const md = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const ts = (e: TouchEvent) => { if (e.touches[0]) onDown(e.touches[0].clientX, e.touches[0].clientY); };
    canvas.addEventListener("mousedown", md);
    canvas.addEventListener("touchstart", ts, { passive: true });

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const s = st.current;

      // 스폰
      if (s.toSpawn > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          s.spawnTimer = Math.max(0.35, 1.1 - s.wave * 0.04);
          s.toSpawn--;
          const boss = s.toSpawn === 0 && s.wave % 5 === 0; // 5웨이브마다 보스
          const hp = boss ? 40 + s.wave * 12 : 3 + s.wave * 2;
          s.zombies.push({
            id: s.uid++, x: 24 + Math.random() * (W - 48), y: -20,
            hp, maxHp: hp, speed: (18 + s.wave * 3) * (boss ? 0.55 : 1),
            dmg: boss ? 40 : 8 + s.wave, emoji: boss ? "👹" : ZOMBIE_KINDS[Math.floor(Math.random() * ZOMBIE_KINDS.length)],
            r: boss ? 26 : 16, boss,
          });
        }
      }

      // 자동 포탑
      const wp = weaponRef.current;
      if (wp.autoLevel > 0) {
        s.autoTimer -= dt;
        if (s.autoTimer <= 0) {
          s.autoTimer = Math.max(0.2, 0.9 - wp.autoLevel * 0.12);
          const target = s.zombies.slice().sort((a, b) => b.y - a.y)[0];
          if (target) { for (let i = 0; i < wp.autoLevel; i++) fireAt(target.x, target.y, true); s.zombies = s.zombies.filter((z) => z.hp > 0); }
        }
      }

      // 좀비 이동 + 바리케이드 도달
      let hurt = false;
      for (const z of s.zombies) {
        z.y += z.speed * dt;
        if (z.y >= BASE_Y) { s.baseHp -= z.dmg; z.hp = 0; hurt = true; s.hits.push({ x: z.x, y: BASE_Y - 10, life: 16, txt: `-${z.dmg}` }); }
      }
      if (hurt) { sfxHurt(); s.baseHp = Math.max(0, s.baseHp); }
      s.zombies = s.zombies.filter((z) => z.hp > 0);

      // 이펙트 수명
      for (const tr of s.tracers) tr.life--;
      s.tracers = s.tracers.filter((tr) => tr.life > 0);
      for (const h of s.hits) { h.life--; h.y -= 0.5; }
      s.hits = s.hits.filter((h) => h.life > 0);

      // UI 동기화
      setBaseHp(s.baseHp); setCoins(s.coins); setScore(s.score);

      // 게임 오버
      if (s.baseHp <= 0) {
        cancelAnimationFrame(raf);
        try { const b = Number(localStorage.getItem(SAVE) || 0); if (s.wave > b) { localStorage.setItem(SAVE, String(s.wave)); setBest(s.wave); } } catch { /* ignore */ }
        setPhase("over");
        return;
      }
      // 웨이브 클리어
      if (s.toSpawn === 0 && s.zombies.length === 0) {
        cancelAnimationFrame(raf);
        setPhase("shop");
        return;
      }

      // ───── 렌더 ─────
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // 배경
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1a103a"); grad.addColorStop(1, "#0b1a12");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      // 바리케이드
      ctx.fillStyle = "#5c3d1e"; ctx.fillRect(0, BASE_Y, W, 6);
      ctx.fillStyle = "#3b2a5c"; ctx.fillRect(0, BASE_Y + 6, W, H - BASE_Y - 6);
      // 좀비
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const z of s.zombies) {
        ctx.font = `${z.r * 1.6}px serif`;
        ctx.fillText(z.emoji, z.x, z.y);
        // HP 바
        if (z.hp < z.maxHp) {
          const bw = z.r * 1.8;
          ctx.fillStyle = "#000"; ctx.fillRect(z.x - bw / 2, z.y - z.r - 8, bw, 4);
          ctx.fillStyle = z.boss ? "#f59f00" : "#51cf66"; ctx.fillRect(z.x - bw / 2, z.y - z.r - 8, bw * (z.hp / z.maxHp), 4);
        }
      }
      // 사격 tracer
      for (const tr of s.tracers) {
        ctx.strokeStyle = `rgba(255,240,120,${tr.life / 6})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
      }
      // 플레이어(터렛)
      ctx.font = "30px serif"; ctx.fillText("🔫", PLAYER.x, PLAYER.y);
      // 데미지 텍스트
      ctx.font = "13px sans-serif"; ctx.fillStyle = "#ffe066";
      for (const h of s.hits) { ctx.globalAlpha = Math.min(1, h.life / 12); ctx.fillText(h.txt, h.x, h.y); ctx.globalAlpha = 1; }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", md);
      canvas.removeEventListener("touchstart", ts);
    };
  }, [phase, fireAt]);

  // ───── 상점 업그레이드 ─────
  const upgrades = [
    { key: "dmg", name: "💥 데미지 +2", cost: 15 + weapon.damage * 3, apply: () => setWeapon((w) => ({ ...w, damage: w.damage + 2 })) },
    { key: "rof", name: "⚡ 연사 강화", cost: 20, disabled: weapon.cooldown <= 90, apply: () => setWeapon((w) => ({ ...w, cooldown: Math.max(90, w.cooldown - 30) })) },
    { key: "multi", name: "🎯 멀티샷 +1", cost: 40 + weapon.multishot * 25, disabled: weapon.multishot >= 6, apply: () => setWeapon((w) => ({ ...w, multishot: w.multishot + 1 })) },
    { key: "auto", name: "🤖 자동 포탑 +1", cost: 50 + weapon.autoLevel * 40, disabled: weapon.autoLevel >= 5, apply: () => setWeapon((w) => ({ ...w, autoLevel: w.autoLevel + 1 })) },
    { key: "heal", name: "🛡️ 바리케이드 수리 (풀피)", cost: 25, disabled: baseHp >= 100, apply: () => { st.current.baseHp = 100; setBaseHp(100); } },
  ];
  const buy = (u: typeof upgrades[number]) => {
    if (u.disabled || coins < u.cost) return;
    st.current.coins -= u.cost; setCoins(st.current.coins);
    u.apply(); beep(660, 0.08, "triangle", 0.1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/40 to-black text-white flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-purple-300 text-sm">← 홈</Link>
          <h1 className="text-xl font-black">🧟 좀비 디펜스</h1>
          <span className="text-xs text-amber-300">🏆 최고 W{best}</span>
        </div>

        {/* HUD */}
        <div className="grid grid-cols-4 gap-1.5 mb-2 text-center text-xs font-bold">
          <div className="rounded-lg bg-white/10 py-1"><div className="text-red-300">웨이브</div><div className="text-base">{wave}</div></div>
          <div className="rounded-lg bg-white/10 py-1"><div className="text-yellow-300">코인</div><div className="text-base">{coins}</div></div>
          <div className="rounded-lg bg-white/10 py-1"><div className="text-green-300">처치</div><div className="text-base">{score}</div></div>
          <div className="rounded-lg bg-white/10 py-1"><div className="text-sky-300">바리케이드</div><div className="text-base">{baseHp}</div></div>
        </div>
        {/* 바리케이드 체력바 */}
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all" style={{ width: `${baseHp}%` }} />
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-purple-700/60">
          <canvas ref={canvasRef} width={W} height={H} className="w-full touch-none cursor-crosshair bg-slate-900" />

          {/* 시작 화면 */}
          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center px-4">
              <div className="text-6xl">🧟</div>
              <h2 className="text-2xl font-black">좀비 디펜스</h2>
              <p className="text-sm text-gray-300">좀비를 <b>클릭/터치</b>해서 쏴라!<br />바리케이드를 지켜라!</p>
              <button onClick={startGame} className="mt-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-black shadow-lg active:scale-95">▶ 시작!</button>
            </div>
          )}

          {/* 상점 (웨이브 사이) */}
          {phase === "shop" && (
            <div className="absolute inset-0 flex flex-col gap-2 bg-black/85 p-4 overflow-auto">
              <h2 className="text-center text-xl font-black text-emerald-300">✅ 웨이브 {wave} 클리어!</h2>
              <p className="text-center text-xs text-yellow-300 mb-1">🪙 코인 {coins} · 업그레이드 하세요!</p>
              {upgrades.map((u) => (
                <button key={u.key} onClick={() => buy(u)} disabled={u.disabled || coins < u.cost}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${u.disabled ? "bg-slate-800 text-slate-500" : coins >= u.cost ? "bg-emerald-700 hover:bg-emerald-600" : "bg-slate-700 text-slate-400"}`}>
                  <span>{u.name}</span>
                  <span>{u.disabled ? "MAX" : `🪙${u.cost}`}</span>
                </button>
              ))}
              <div className="text-center text-[11px] text-gray-400">
                데미지 {weapon.damage} · 연사 {(1000 / weapon.cooldown).toFixed(1)}/초 · 멀티샷 {weapon.multishot} · 자동포탑 {weapon.autoLevel}
              </div>
              <button onClick={() => startWave(wave + 1)} className="mt-1 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-3 font-black shadow-lg active:scale-95">
                다음 웨이브 {wave + 1} ⚔️
              </button>
            </div>
          )}

          {/* 게임 오버 */}
          {phase === "over" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-4">
              <div className="text-6xl">💀</div>
              <h2 className="text-2xl font-black text-red-400">게임 오버!</h2>
              <p className="text-sm text-gray-300">웨이브 <b className="text-yellow-300">{wave}</b> 도달 · 처치 <b>{score}</b></p>
              {wave >= best && wave > 0 && <p className="text-amber-300 font-bold">🏆 신기록!</p>}
              <button onClick={startGame} className="mt-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 font-black shadow-lg active:scale-95">🔄 다시 하기</button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-2">
          🎯 좀비를 클릭/터치해서 사격! 코인으로 무기를 업그레이드하고 최대한 오래 버티세요!
        </p>
      </div>
    </div>
  );
}
