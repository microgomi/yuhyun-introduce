"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const W = 900, H = 600;

interface Character {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; speed: number;
  name: string; emoji: string;
  stunTimer: number;
  dashCd: number;
  dashTimer: number;
  invincible: number;
}

interface PowerUp {
  x: number; y: number; type: "speed" | "slow" | "freeze" | "shrink" | "swap";
  emoji: string; timer: number;
}

interface Obstacle {
  x: number; y: number; w: number; h: number; color: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; r: number;
}

export default function TagGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "playing" | "over">("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState(1);
  const [itName, setItName] = useState("");
  const [caughtBy, setCaughtBy] = useState("");
  const [mode, setMode] = useState<"runner" | "chaser">("runner");
  const [highScore, setHighScore] = useState(0);

  const gameRef = useRef<any>({});
  const keysRef = useRef<Set<string>>(new Set());
  const animRef = useRef<number>(0);

  const startGame = useCallback((selectedMode: "runner" | "chaser") => {
    setMode(selectedMode);
    setScreen("playing");
    setScore(0);
    setTimeLeft(60);
    setRound(1);

    const g = gameRef.current;
    g.score = 0;
    g.time = 60;
    g.round = 1;
    g.frame = 0;
    g.particles = [];
    g.powerUps = [];
    g.activeEffects = [];
    g.shakeTimer = 0;
    g.comboTimer = 0;
    g.combo = 0;
    g.caughtCount = 0;

    // Player
    g.player = {
      x: selectedMode === "runner" ? 100 : W / 2,
      y: H / 2,
      vx: 0, vy: 0, r: 18,
      color: selectedMode === "runner" ? "#08f" : "#f44",
      speed: 3.5,
      name: "나",
      emoji: selectedMode === "runner" ? "🏃" : "👹",
      stunTimer: 0, dashCd: 0, dashTimer: 0, invincible: 60,
    };

    // NPCs
    const npcCount = 5;
    g.npcs = [];
    for (let i = 0; i < npcCount; i++) {
      const isIt = selectedMode === "runner" ? i === 0 : false;
      g.npcs.push({
        x: 150 + Math.random() * (W - 300),
        y: 100 + Math.random() * (H - 200),
        vx: 0, vy: 0, r: 16,
        color: isIt ? "#f44" : ["#0c0", "#fa0", "#c0f", "#0cc", "#fc0"][i],
        speed: isIt ? 2.8 + g.round * 0.15 : 2.2 + Math.random() * 0.8,
        name: ["악당", "토끼", "곰돌이", "여우", "다람쥐"][i],
        emoji: isIt ? "👹" : ["🐰", "🐻", "🦊", "🐿️", "🐱"][i],
        stunTimer: 0, dashCd: 0, dashTimer: 0, invincible: 0,
        isIt: isIt,
        caught: false,
        aiTimer: Math.random() * 60,
        aiDir: Math.random() * Math.PI * 2,
        panic: 0,
      });
    }

    // Obstacles
    g.obstacles = generateObstacles();

    // Spawn first power-up
    g.powerUpTimer = 180;

    if (selectedMode === "runner") {
      setItName(g.npcs[0].name);
    } else {
      setItName("나");
    }
  }, []);

  function generateObstacles(): Obstacle[] {
    const obs: Obstacle[] = [];
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const w = 30 + Math.random() * 60;
      const h = 30 + Math.random() * 60;
      obs.push({
        x: 60 + Math.random() * (W - 120 - w),
        y: 60 + Math.random() * (H - 120 - h),
        w, h,
        color: `hsl(${Math.random() * 360}, 20%, ${15 + Math.random() * 10}%)`,
      });
    }
    return obs;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " " && screen === "playing") {
        e.preventDefault();
        const g = gameRef.current;
        if (g.player && g.player.dashCd <= 0 && g.player.stunTimer <= 0) {
          g.player.dashTimer = 8;
          g.player.dashCd = 90;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let running = true;

    function loop() {
      if (!running) return;
      update();
      draw(ctx);
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [screen]);

  function update() {
    const g = gameRef.current;
    if (!g.player) return;
    g.frame++;

    const p = g.player;
    const keys = keysRef.current;

    // Timer
    if (g.frame % 60 === 0 && g.time > 0) {
      g.time--;
      setTimeLeft(g.time);
      if (g.time <= 0) {
        // Time up
        if (mode === "runner") {
          // Survived!
          g.score += 500 + g.round * 200;
          setScore(g.score);
          nextRound();
        } else {
          gameOver("시간 초과!");
        }
        return;
      }
    }

    // Player movement
    let dx = 0, dy = 0;
    if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
    if (keys.has("arrowright") || keys.has("d")) dx += 1;
    if (keys.has("arrowup") || keys.has("w")) dy -= 1;
    if (keys.has("arrowdown") || keys.has("s")) dy += 1;

    if (p.stunTimer > 0) { p.stunTimer--; dx = 0; dy = 0; }
    if (p.dashCd > 0) p.dashCd--;
    if (p.invincible > 0) p.invincible--;

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let spd = p.speed;
    if (p.dashTimer > 0) { spd *= 2.5; p.dashTimer--; }

    p.vx = (dx / len) * spd * 0.6 + p.vx * 0.4;
    p.vy = (dy / len) * spd * 0.6 + p.vy * 0.4;
    if (dx === 0 && dy === 0) { p.vx *= 0.85; p.vy *= 0.85; }

    p.x += p.vx; p.y += p.vy;
    clampToField(p);
    resolveObstacles(p, g.obstacles);

    // Dash trail
    if (p.dashTimer > 0) {
      spawnParticles(g, p.x, p.y, p.color, 3);
    }

    // NPC AI
    for (const npc of g.npcs) {
      if (npc.caught) continue;
      if (npc.stunTimer > 0) { npc.stunTimer--; continue; }
      if (npc.invincible > 0) npc.invincible--;

      npc.aiTimer--;
      if (npc.aiTimer <= 0) {
        npc.aiDir = Math.random() * Math.PI * 2;
        npc.aiTimer = 30 + Math.random() * 60;
      }

      let nx = 0, ny = 0;

      if (mode === "runner" && npc.isIt) {
        // Chaser AI: chase player
        const tdx = p.x - npc.x, tdy = p.y - npc.y;
        const td = Math.sqrt(tdx * tdx + tdy * tdy);
        if (td > 0) { nx = tdx / td; ny = tdy / td; }

        // Predict player movement
        nx += p.vx * 0.1;
        ny += p.vy * 0.1;

        // Speed up when close
        const chaseMul = td < 100 ? 1.3 : 1;
        npc.speed = (2.8 + g.round * 0.2) * chaseMul;
      } else if (mode === "chaser" && !npc.isIt) {
        // Runner AI: flee from player
        const fdx = npc.x - p.x, fdy = npc.y - p.y;
        const fd = Math.sqrt(fdx * fdx + fdy * fdy);

        if (fd < 180) {
          // Panic flee
          npc.panic = 30;
          nx = fdx / (fd || 1);
          ny = fdy / (fd || 1);
          // Add some randomness to avoid getting cornered
          nx += Math.cos(npc.aiDir) * 0.3;
          ny += Math.sin(npc.aiDir) * 0.3;
        } else if (npc.panic > 0) {
          npc.panic--;
          nx = fdx / (fd || 1);
          ny = fdy / (fd || 1);
          nx += Math.cos(npc.aiDir) * 0.5;
          ny += Math.sin(npc.aiDir) * 0.5;
        } else {
          // Wander
          nx = Math.cos(npc.aiDir);
          ny = Math.sin(npc.aiDir);
        }

        // Avoid walls
        if (npc.x < 60) nx += 0.5;
        if (npc.x > W - 60) nx -= 0.5;
        if (npc.y < 60) ny += 0.5;
        if (npc.y > H - 60) ny -= 0.5;
      } else {
        // Neutral NPCs wander
        nx = Math.cos(npc.aiDir);
        ny = Math.sin(npc.aiDir);
      }

      const nl = Math.sqrt(nx * nx + ny * ny) || 1;
      npc.vx = (nx / nl) * npc.speed * 0.5 + npc.vx * 0.5;
      npc.vy = (ny / nl) * npc.speed * 0.5 + npc.vy * 0.5;
      npc.x += npc.vx; npc.y += npc.vy;
      clampToField(npc);
      resolveObstacles(npc, g.obstacles);
    }

    // Collision detection
    if (mode === "runner") {
      // Check if chaser caught player
      const chaser = g.npcs.find((n: any) => n.isIt);
      if (chaser && p.invincible <= 0) {
        const cdx = p.x - chaser.x, cdy = p.y - chaser.y;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd < p.r + chaser.r) {
          setCaughtBy(chaser.name);
          gameOver(chaser.name + "에게 잡혔다!");
          return;
        }
      }
      // Score for surviving
      if (g.frame % 30 === 0) {
        g.score += 10;
        setScore(g.score);
      }
    } else {
      // Chaser mode: catch NPCs
      for (const npc of g.npcs) {
        if (npc.caught || npc.invincible > 0) continue;
        const cdx = p.x - npc.x, cdy = p.y - npc.y;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd < p.r + npc.r) {
          npc.caught = true;
          g.caughtCount++;

          // Combo
          if (g.comboTimer > 0) { g.combo++; } else { g.combo = 1; }
          g.comboTimer = 120;

          const pts = 100 * g.combo * g.round;
          g.score += pts;
          setScore(g.score);
          g.shakeTimer = 8;
          spawnParticles(g, npc.x, npc.y, npc.color, 15);
          spawnParticles(g, npc.x, npc.y, "#ff0", 8);

          // Check if all caught
          if (g.npcs.every((n: any) => n.caught)) {
            g.score += 1000 * g.round;
            setScore(g.score);
            nextRound();
            return;
          }
        }
      }
      if (g.comboTimer > 0) g.comboTimer--;
    }

    // Power-ups
    g.powerUpTimer--;
    if (g.powerUpTimer <= 0) {
      spawnPowerUp(g);
      g.powerUpTimer = 300 + Math.random() * 200;
    }

    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      const pu = g.powerUps[i];
      pu.timer--;
      if (pu.timer <= 0) { g.powerUps.splice(i, 1); continue; }

      const pdx = p.x - pu.x, pdy = p.y - pu.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < p.r + 15) {
        applyPowerUp(g, pu);
        g.powerUps.splice(i, 1);
        spawnParticles(g, pu.x, pu.y, "#fff", 10);
      }
    }

    // Active effects
    for (let i = g.activeEffects.length - 1; i >= 0; i--) {
      g.activeEffects[i].timer--;
      if (g.activeEffects[i].timer <= 0) {
        removeEffect(g, g.activeEffects[i]);
        g.activeEffects.splice(i, 1);
      }
    }

    // Particles
    g.particles = g.particles.filter((pt: Particle) => {
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vy += 0.05; pt.life--;
      return pt.life > 0;
    });

    if (g.shakeTimer > 0) g.shakeTimer--;
  }

  function nextRound() {
    const g = gameRef.current;
    g.round++;
    g.time = 60;
    setRound(g.round);
    setTimeLeft(60);

    g.player.x = mode === "runner" ? 100 : W / 2;
    g.player.y = H / 2;
    g.player.invincible = 90;
    g.player.speed = 3.5;

    const npcCount = 5 + Math.floor(g.round / 2);
    g.npcs = [];
    for (let i = 0; i < npcCount; i++) {
      const isIt = mode === "runner" ? i === 0 : false;
      g.npcs.push({
        x: 150 + Math.random() * (W - 300),
        y: 100 + Math.random() * (H - 200),
        vx: 0, vy: 0, r: 16,
        color: isIt ? "#f44" : `hsl(${i * 60}, 70%, 55%)`,
        speed: isIt ? 2.8 + g.round * 0.2 : 2 + Math.random() * 1,
        name: isIt ? "술래" : `친구${i}`,
        emoji: isIt ? "👹" : ["🐰", "🐻", "🦊", "🐿️", "🐱", "🐶", "🐸", "🐵"][i % 8],
        stunTimer: 0, dashCd: 0, dashTimer: 0, invincible: 0,
        isIt, caught: false,
        aiTimer: Math.random() * 60, aiDir: Math.random() * Math.PI * 2, panic: 0,
      });
    }

    g.obstacles = generateObstacles();
    g.powerUps = [];
    g.powerUpTimer = 120;
  }

  function gameOver(reason: string) {
    const g = gameRef.current;
    setCaughtBy(reason);
    setScreen("over");
    if (g.score > highScore) setHighScore(g.score);
    cancelAnimationFrame(animRef.current);
  }

  function clampToField(c: any) {
    c.x = Math.max(c.r, Math.min(W - c.r, c.x));
    c.y = Math.max(c.r, Math.min(H - c.r, c.y));
  }

  function resolveObstacles(c: any, obs: Obstacle[]) {
    for (const o of obs) {
      const cx = Math.max(o.x, Math.min(o.x + o.w, c.x));
      const cy = Math.max(o.y, Math.min(o.y + o.h, c.y));
      const dx = c.x - cx, dy = c.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < c.r && d > 0) {
        c.x += (dx / d) * (c.r - d);
        c.y += (dy / d) * (c.r - d);
      }
    }
  }

  function spawnParticles(g: any, x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 20 + Math.random() * 15,
        color, r: 2 + Math.random() * 3,
      });
    }
  }

  function spawnPowerUp(g: any) {
    const types: PowerUp["type"][] = ["speed", "slow", "freeze", "shrink", "swap"];
    const emojis: Record<string, string> = { speed: "⚡", slow: "🐌", freeze: "🧊", shrink: "🔽", swap: "🔄" };
    const type = types[Math.floor(Math.random() * types.length)];
    g.powerUps.push({
      x: 60 + Math.random() * (W - 120),
      y: 60 + Math.random() * (H - 120),
      type, emoji: emojis[type], timer: 400,
    });
  }

  function applyPowerUp(g: any, pu: PowerUp) {
    switch (pu.type) {
      case "speed":
        g.player.speed = 5.5;
        g.activeEffects.push({ type: "speed", timer: 180, desc: "속도 업!" });
        break;
      case "slow":
        g.npcs.forEach((n: any) => { if (mode === "runner" ? n.isIt : !n.caught) n.speed *= 0.5; });
        g.activeEffects.push({ type: "slow", timer: 180, desc: "적 느려짐!" });
        break;
      case "freeze":
        g.npcs.forEach((n: any) => { if (mode === "runner" ? n.isIt : !n.caught) n.stunTimer = 120; });
        g.activeEffects.push({ type: "freeze", timer: 120, desc: "적 얼림!" });
        break;
      case "shrink":
        g.player.r = 10;
        g.activeEffects.push({ type: "shrink", timer: 240, desc: "몸 작아짐!" });
        break;
      case "swap":
        // Teleport to random position
        g.player.x = 60 + Math.random() * (W - 120);
        g.player.y = 60 + Math.random() * (H - 120);
        g.player.invincible = 60;
        break;
    }
  }

  function removeEffect(g: any, eff: any) {
    switch (eff.type) {
      case "speed": g.player.speed = 3.5; break;
      case "slow": g.npcs.forEach((n: any) => { n.speed = mode === "runner" && n.isIt ? 2.8 + g.round * 0.2 : 2 + Math.random() * 1; }); break;
      case "shrink": g.player.r = 18; break;
    }
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const g = gameRef.current;
    if (!g.player) return;

    ctx.save();

    // Shake
    if (g.shakeTimer > 0) {
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1a2a1a");
    bg.addColorStop(1, "#0a150a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Border
    ctx.strokeStyle = "#2a4a2a";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Obstacles
    for (const o of g.obstacles) {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }

    // Power-ups
    for (const pu of g.powerUps) {
      const pulse = Math.sin(g.frame * 0.08) * 3;
      ctx.font = `${22 + pulse}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(pu.emoji, pu.x, pu.y + 7);

      // Glow
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 16 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + Math.sin(g.frame * 0.1) * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // NPCs
    for (const npc of g.npcs) {
      if (npc.caught) continue;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(npc.x, npc.y + npc.r + 2, npc.r * 0.8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stun effect
      if (npc.stunTimer > 0) {
        ctx.strokeStyle = "#0cf";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, npc.r + 5 + Math.sin(g.frame * 0.2) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Body
      ctx.font = `${npc.r * 2}px serif`;
      ctx.textAlign = "center";
      ctx.fillText(npc.emoji, npc.x, npc.y + npc.r * 0.6);

      // Name
      ctx.font = "11px 'Courier New'";
      ctx.fillStyle = npc.color;
      ctx.fillText(npc.name, npc.x, npc.y - npc.r - 6);

      // It indicator
      if (npc.isIt) {
        ctx.fillStyle = "#f44";
        ctx.font = "bold 12px 'Courier New'";
        ctx.fillText("술래!", npc.x, npc.y - npc.r - 18);
      }
    }

    // Player
    const p = g.player;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.r + 2, p.r * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invincibility glow
    if (p.invincible > 0 && Math.floor(g.frame / 4) % 2 === 0) {
      ctx.save();
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Dash ready indicator
    if (p.dashCd <= 0) {
      ctx.strokeStyle = "rgba(0,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Player emoji
    ctx.font = `${p.r * 2}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(p.emoji, p.x, p.y + p.r * 0.6);

    // Player name
    ctx.font = "bold 12px 'Courier New'";
    ctx.fillStyle = p.color;
    ctx.fillText(p.name, p.x, p.y - p.r - 8);

    // Chaser mode: direction indicator to nearest uncaught NPC
    if (mode === "chaser") {
      const uncaught = g.npcs.filter((n: any) => !n.caught);
      if (uncaught.length > 0) {
        let nearest = uncaught[0];
        let nd = Infinity;
        for (const n of uncaught) {
          const d = Math.sqrt((p.x - n.x) ** 2 + (p.y - n.y) ** 2);
          if (d < nd) { nd = d; nearest = n; }
        }
        if (nd > 100) {
          const ang = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          const ax = p.x + Math.cos(ang) * (p.r + 20);
          const ay = p.y + Math.sin(ang) * (p.r + 20);
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(ang);
          ctx.fillStyle = "rgba(255,255,0,0.6)";
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-4, -5);
          ctx.lineTo(-4, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Runner mode: danger indicator
    if (mode === "runner") {
      const chaser = g.npcs.find((n: any) => n.isIt);
      if (chaser) {
        const d = Math.sqrt((p.x - chaser.x) ** 2 + (p.y - chaser.y) ** 2);
        if (d < 150) {
          const danger = 1 - d / 150;
          ctx.fillStyle = `rgba(255,0,0,${danger * 0.15})`;
          ctx.fillRect(0, 0, W, H);

          // Warning border
          ctx.strokeStyle = `rgba(255,0,0,${danger * 0.5})`;
          ctx.lineWidth = 4;
          ctx.strokeRect(0, 0, W, H);
        }
      }
    }

    // Particles
    for (const pt of g.particles) {
      ctx.globalAlpha = pt.life / 35;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Active effects HUD
    let ey = 90;
    ctx.font = "12px 'Courier New'";
    for (const eff of g.activeEffects) {
      ctx.fillStyle = "#0ff";
      ctx.textAlign = "left";
      ctx.fillText(`${eff.desc} (${Math.ceil(eff.timer / 60)}s)`, 10, ey);
      ey += 18;
    }

    // Combo display
    if (mode === "chaser" && g.combo > 1 && g.comboTimer > 0) {
      ctx.font = "bold 28px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff0";
      ctx.shadowColor = "#ff0";
      ctx.shadowBlur = 15;
      ctx.fillText(`${g.combo} COMBO!`, W / 2, H - 30);
      ctx.shadowBlur = 0;
    }

    // Caught count (chaser mode)
    if (mode === "chaser") {
      const total = g.npcs.length;
      const caught = g.npcs.filter((n: any) => n.caught).length;
      ctx.font = "14px 'Courier New'";
      ctx.textAlign = "right";
      ctx.fillStyle = "#fa0";
      ctx.fillText(`잡은 수: ${caught}/${total}`, W - 10, 85);
    }

    // Dash cooldown
    ctx.font = "12px 'Courier New'";
    ctx.textAlign = "left";
    ctx.fillStyle = p.dashCd <= 0 ? "#0f0" : "#666";
    ctx.fillText(`대시[Space]: ${p.dashCd <= 0 ? "준비!" : Math.ceil(p.dashCd / 60) + "s"}`, 10, H - 12);

    ctx.restore();
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Courier New, monospace" }}>
      <Link href="/" style={{ position: "fixed", top: 16, left: 16, color: "#0ff", fontSize: 14, textDecoration: "none", zIndex: 10 }}>← Back</Link>

      {screen === "menu" && (
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 72, marginBottom: 10 }}>🏃‍♂️👹</div>
          <h1 style={{ fontSize: 42, color: "#0f0", textShadow: "0 0 20px #0f0", marginBottom: 8 }}>술래잡기</h1>
          <p style={{ color: "#888", marginBottom: 30 }}>모드를 선택하세요!</p>

          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => startGame("runner")} style={{
              padding: "20px 30px", fontSize: 18, cursor: "pointer", background: "rgba(0,100,255,0.15)",
              color: "#08f", border: "2px solid #08f", borderRadius: 12, fontFamily: "inherit", width: 220,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏃</div>
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>도망자 모드</div>
              <div style={{ fontSize: 12, color: "#666" }}>술래에게서 도망쳐라!</div>
            </button>

            <button onClick={() => startGame("chaser")} style={{
              padding: "20px 30px", fontSize: 18, cursor: "pointer", background: "rgba(255,50,50,0.15)",
              color: "#f44", border: "2px solid #f44", borderRadius: 12, fontFamily: "inherit", width: 220,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>👹</div>
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>술래 모드</div>
              <div style={{ fontSize: 12, color: "#666" }}>모두 잡아라!</div>
            </button>
          </div>

          <div style={{ marginTop: 30, color: "#555", fontSize: 13 }}>
            방향키/WASD: 이동 | Space: 대시
          </div>
          {highScore > 0 && <div style={{ marginTop: 10, color: "#fa0", fontSize: 14 }}>최고 점수: {highScore}</div>}
        </div>
      )}

      {screen === "playing" && (
        <div style={{ position: "relative" }}>
          {/* Top HUD */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 16px", background: "#111", borderRadius: "8px 8px 0 0",
            border: "1px solid #333", borderBottom: "none", width: W, color: "#fff",
          }}>
            <div>
              <span style={{ color: "#fa0", fontSize: 18, fontWeight: "bold" }}>SCORE: {score}</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#888" }}>ROUND </span>
              <span style={{ color: "#ff0", fontSize: 20, fontWeight: "bold" }}>{round}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: timeLeft <= 10 ? "#f44" : "#0f0", fontSize: 22, fontWeight: "bold" }}>
                {timeLeft}s
              </span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: "block", border: "1px solid #333", borderRadius: "0 0 8px 8px" }}
          />

          {/* Mode indicator */}
          <div style={{
            position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)",
            color: mode === "runner" ? "#08f" : "#f44",
            fontSize: 14, background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: 20,
          }}>
            {mode === "runner" ? "🏃 도망자 모드" : "👹 술래 모드"}
          </div>
        </div>
      )}

      {screen === "over" && (
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>😵</div>
          <h1 style={{ fontSize: 36, color: "#f44", textShadow: "0 0 20px #f00", marginBottom: 8 }}>GAME OVER</h1>
          <p style={{ color: "#fa0", fontSize: 18, marginBottom: 20 }}>{caughtBy}</p>

          <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "1px solid #333", display: "inline-block", marginBottom: 20 }}>
            <div style={{ color: "#ff0", fontSize: 28, fontWeight: "bold" }}>SCORE: {score}</div>
            <div style={{ color: "#888", fontSize: 14, marginTop: 5 }}>라운드 {round}</div>
            {score >= highScore && score > 0 && <div style={{ color: "#f0f", fontSize: 14, marginTop: 5 }}>NEW HIGH SCORE!</div>}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => startGame(mode)} style={{
              padding: "12px 30px", fontSize: 18, cursor: "pointer", background: "transparent",
              color: "#0f0", border: "2px solid #0f0", borderRadius: 8, fontFamily: "inherit",
            }}>다시 하기</button>
            <button onClick={() => setScreen("menu")} style={{
              padding: "12px 30px", fontSize: 18, cursor: "pointer", background: "transparent",
              color: "#888", border: "2px solid #555", borderRadius: 8, fontFamily: "inherit",
            }}>메뉴로</button>
          </div>
        </div>
      )}
    </div>
  );
}
