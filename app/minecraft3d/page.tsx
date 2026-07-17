"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ----------------------------------------------------------------------------
// 3D Minecraft — voxel world, first-person, break & place blocks
// ----------------------------------------------------------------------------

type BlockId = "grass" | "dirt" | "stone" | "wood" | "leaves" | "sand" | "planks" | "brick";

interface BlockDef {
  id: BlockId;
  name: string;
  ui: string; // css color for hotbar swatch
  top: [number, number, number];
  side: [number, number, number];
  bottom: [number, number, number];
}

const BLOCKS: BlockDef[] = [
  { id: "grass", name: "잔디", ui: "#5bbb3a", top: [0.36, 0.65, 0.22], side: [0.55, 0.38, 0.24], bottom: [0.55, 0.38, 0.24] },
  { id: "dirt", name: "흙", ui: "#8c5a36", top: [0.55, 0.38, 0.24], side: [0.55, 0.38, 0.24], bottom: [0.5, 0.34, 0.21] },
  { id: "stone", name: "돌", ui: "#808086", top: [0.52, 0.52, 0.55], side: [0.5, 0.5, 0.52], bottom: [0.46, 0.46, 0.48] },
  { id: "wood", name: "나무", ui: "#6f4d27", top: [0.62, 0.45, 0.27], side: [0.45, 0.31, 0.18], bottom: [0.62, 0.45, 0.27] },
  { id: "leaves", name: "잎", ui: "#2e7d32", top: [0.22, 0.55, 0.22], side: [0.18, 0.5, 0.18], bottom: [0.15, 0.42, 0.15] },
  { id: "sand", name: "모래", ui: "#d9c87f", top: [0.85, 0.78, 0.5], side: [0.83, 0.76, 0.48], bottom: [0.8, 0.73, 0.45] },
  { id: "planks", name: "판자", ui: "#b3854f", top: [0.72, 0.54, 0.34], side: [0.7, 0.52, 0.32], bottom: [0.68, 0.5, 0.3] },
  { id: "brick", name: "벽돌", ui: "#b34539", top: [0.72, 0.29, 0.24], side: [0.7, 0.27, 0.22], bottom: [0.66, 0.25, 0.2] },
];
const BLOCK_MAP: Record<BlockId, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.id, b])) as Record<BlockId, BlockDef>;

// cube faces (corners ordered for index pattern [0,1,2, 2,1,3])
const FACES = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 0, 1], corners: [[0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1]] },
];

const SIZE = 24; // world footprint (x,z 0..SIZE-1)

export default function Minecraft3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<BlockId>("grass");
  const selectedRef = useRef<BlockId>("grass");
  const [started, setStarted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  // expose action handles for UI buttons (mobile)
  const actionRef = useRef<{ breakBlock: () => void; placeBlock: () => void } | null>(null);
  const moveRef = useRef({ f: 0, r: 0, jump: false });
  const lookRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    try {
    // ---- renderer / scene / camera ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 18, 46);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.rotation.order = "YXZ";

    // ---- world data ----
    const world = new Map<string, BlockId>();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const getBlock = (x: number, y: number, z: number) => world.get(key(x, y, z));

    // terrain
    const heightAt = (x: number, z: number) => {
      const h = 4 + Math.sin(x * 0.35) * 1.6 + Math.cos(z * 0.4) * 1.6 + Math.sin((x + z) * 0.22) * 1.4;
      return Math.max(1, Math.round(h));
    };
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const h = heightAt(x, z);
        for (let y = 0; y <= h; y++) {
          let t: BlockId = "stone";
          if (y === h) t = h <= 2 ? "sand" : "grass";
          else if (y >= h - 2) t = "dirt";
          world.set(key(x, y, z), t);
        }
      }
    }
    // a few trees
    const treeSpots = [[5, 6], [12, 9], [9, 17], [18, 14], [16, 5], [7, 12]];
    for (const [tx, tz] of treeSpots) {
      const base = heightAt(tx, tz) + 1;
      const th = 3 + (tx % 2);
      for (let i = 0; i < th; i++) world.set(key(tx, base + i, tz), "wood");
      const top = base + th;
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = -1; dy <= 1; dy++) {
            if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
            const lx = tx + dx, ly = top + dy, lz = tz + dz;
            if (!world.has(key(lx, ly, lz))) world.set(key(lx, ly, lz), "leaves");
          }
    }

    // ---- mesh builder with face culling + baked shading ----
    const faceBrightness = (dir: number[]) => {
      if (dir[1] === 1) return 1.0;
      if (dir[1] === -1) return 0.55;
      if (dir[0] !== 0) return 0.78;
      return 0.68;
    };
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const geometry = new THREE.BufferGeometry();
    const worldMesh = new THREE.Mesh(geometry, material);
    scene.add(worldMesh);

    function buildMesh() {
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      for (const [k, type] of world) {
        const [x, y, z] = k.split(",").map(Number);
        const def = BLOCK_MAP[type];
        for (const face of FACES) {
          const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
          if (getBlock(nx, ny, nz)) continue; // neighbor solid -> skip
          const br = faceBrightness(face.dir);
          const base = face.dir[1] === 1 ? def.top : face.dir[1] === -1 ? def.bottom : def.side;
          const col = [base[0] * br, base[1] * br, base[2] * br];
          const ndx = positions.length / 3;
          for (const c of face.corners) {
            positions.push(x + c[0], y + c[1], z + c[2]);
            colors.push(col[0], col[1], col[2]);
          }
          indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
        }
      }
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
    buildMesh();

    // highlight box
    const hl = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
    );
    hl.visible = false;
    scene.add(hl);

    // ---- player ----
    const player = {
      x: SIZE / 2,
      y: heightAt(Math.floor(SIZE / 2), Math.floor(SIZE / 2)) + 2,
      z: SIZE / 2,
      vy: 0,
      yaw: Math.PI * 0.25,
      pitch: -0.2,
      grounded: false,
    };
    const HALF = 0.3, BODY = 1.7, EYE = 1.55, G = 26, JUMP = 8.4, SPEED = 5.0;

    const collides = (x: number, y: number, z: number) => {
      for (let bx = Math.floor(x - HALF); bx <= Math.floor(x + HALF); bx++)
        for (let by = Math.floor(y); by <= Math.floor(y + BODY); by++)
          for (let bz = Math.floor(z - HALF); bz <= Math.floor(z + HALF); bz++)
            if (getBlock(bx, by, bz)) return true;
      return false;
    };

    // ---- raycast target ----
    const raycaster = new THREE.Raycaster();
    raycaster.far = 7;
    const center = new THREE.Vector2(0, 0);
    let target: { brk: [number, number, number]; place: [number, number, number] } | null = null;

    function updateTarget() {
      raycaster.setFromCamera(center, camera);
      const hits = raycaster.intersectObject(worldMesh);
      if (hits.length && hits[0].face) {
        const p = hits[0].point;
        const n = hits[0].face.normal;
        const brk: [number, number, number] = [
          Math.floor(p.x - n.x * 0.5),
          Math.floor(p.y - n.y * 0.5),
          Math.floor(p.z - n.z * 0.5),
        ];
        const place: [number, number, number] = [
          Math.floor(p.x + n.x * 0.5),
          Math.floor(p.y + n.y * 0.5),
          Math.floor(p.z + n.z * 0.5),
        ];
        target = { brk, place };
        hl.position.set(brk[0] + 0.5, brk[1] + 0.5, brk[2] + 0.5);
        hl.visible = true;
      } else {
        target = null;
        hl.visible = false;
      }
    }

    function breakBlock() {
      if (!target) return;
      const [x, y, z] = target.brk;
      if (world.delete(key(x, y, z))) buildMesh();
    }
    function placeBlock() {
      if (!target) return;
      const [x, y, z] = target.place;
      if (world.has(key(x, y, z))) return;
      // don't place inside player
      const overlapX = x + 1 > player.x - HALF && x < player.x + HALF;
      const overlapZ = z + 1 > player.z - HALF && z < player.z + HALF;
      const overlapY = y + 1 > player.y && y < player.y + BODY;
      if (overlapX && overlapZ && overlapY) return;
      world.set(key(x, y, z), selectedRef.current);
      buildMesh();
    }
    actionRef.current = { breakBlock, placeBlock };

    // ---- input ----
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= BLOCKS.length) setSelected(BLOCKS[num - 1].id);
      if (e.code === "Space") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => (keys[e.code] = false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ---- mouse look + interact (pointer-lock OR drag fallback) ----
    const canvas = renderer.domElement;
    const SENS = 0.0023;
    let dragging = false, downX = 0, downY = 0, lastX = 0, lastY = 0, dragBtn = 0, moved = false;
    const locked = () => document.pointerLockElement === canvas;

    const onMouseMove = (e: MouseEvent) => {
      if (locked()) {
        player.yaw -= e.movementX * SENS;
        player.pitch -= e.movementY * SENS;
      } else if (dragging) {
        player.yaw -= (e.clientX - lastX) * SENS;
        player.pitch -= (e.clientY - lastY) * SENS;
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
      } else return;
      player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
    };
    document.addEventListener("mousemove", onMouseMove);

    const onMouseDown = (e: MouseEvent) => {
      if (locked()) {
        if (e.button === 0) breakBlock();
        else if (e.button === 2) placeBlock();
        return;
      }
      // drag-to-look fallback; a quick click = break / right-click = place
      dragging = true;
      moved = false;
      dragBtn = e.button;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) {
        if (dragBtn === 0) breakBlock();
        else if (dragBtn === 2) placeBlock();
      }
    };
    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // ---- loop ----
    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // look from touch
      if (lookRef.current.dx || lookRef.current.dy) {
        player.yaw -= lookRef.current.dx * 0.004;
        player.pitch -= lookRef.current.dy * 0.004;
        player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));
        lookRef.current.dx = 0;
        lookRef.current.dy = 0;
      }

      // movement input
      let inF = 0, inR = 0;
      if (keys["KeyW"] || keys["ArrowUp"]) inF += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) inF -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) inR += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) inR -= 1;
      inF += moveRef.current.f;
      inR += moveRef.current.r;

      const yaw = player.yaw;
      const fwd = [-Math.sin(yaw), -Math.cos(yaw)];
      const rgt = [Math.cos(yaw), -Math.sin(yaw)];
      let mx = fwd[0] * inF + rgt[0] * inR;
      let mz = fwd[1] * inF + rgt[1] * inR;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx = (mx / len) * SPEED * dt;
        mz = (mz / len) * SPEED * dt;
      }

      // horizontal collision (axis separated)
      if (!collides(player.x + mx, player.y, player.z)) player.x += mx;
      if (!collides(player.x, player.y, player.z + mz)) player.z += mz;

      // jump + gravity
      if ((keys["Space"] || moveRef.current.jump) && player.grounded) {
        player.vy = JUMP;
        player.grounded = false;
      }
      player.vy -= G * dt;
      const ny = player.y + player.vy * dt;
      if (!collides(player.x, ny, player.z)) {
        player.y = ny;
        player.grounded = false;
      } else {
        if (player.vy < 0) player.grounded = true;
        player.vy = 0;
      }
      // respawn if fell
      if (player.y < -8) {
        player.x = SIZE / 2;
        player.z = SIZE / 2;
        player.y = heightAt(Math.floor(SIZE / 2), Math.floor(SIZE / 2)) + 3;
        player.vy = 0;
      }

      camera.position.set(player.x, player.y + EYE, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);

      if (debugRef.current) {
        debugRef.current.textContent =
          `pos ${player.x.toFixed(1)},${player.y.toFixed(1)},${player.z.toFixed(1)} | ` +
          `key ${keys["KeyW"] ? "W" : "·"}${keys["KeyA"] ? "A" : "·"}${keys["KeyS"] ? "S" : "·"}${keys["KeyD"] ? "D" : "·"}` +
          `${keys["Space"] ? "⎵" : ""} | grd ${player.grounded ? 1 : 0}`;
      }

      updateTarget();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      geometry.dispose();
      material.dispose();
      hl.geometry.dispose();
      (hl.material as THREE.Material).dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
    } catch (e) {
      console.error("[minecraft3d] init failed:", e);
      setErr(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  }, []);

  // ----- touch joystick handlers -----
  const joyRef = useRef<HTMLDivElement>(null);
  const joyState = useRef({ id: -1, cx: 0, cy: 0 });
  const lookId = useRef({ id: -1, x: 0, y: 0 });

  return (
    <main className="flex min-h-screen flex-col items-center gap-2 bg-gradient-to-b from-sky-700 to-slate-800 px-3 py-4 text-white">
      <div className="flex w-full max-w-[680px] items-center justify-between">
        <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
          ← 홈
        </Link>
        <h1 className="text-lg font-bold text-lime-300">⛏️ 3D 마인크래프트</h1>
        <div className="w-12" />
      </div>

      {/* 3D viewport */}
      <div
        className="relative w-full max-w-[680px] overflow-hidden rounded-2xl bg-sky-400 shadow-[0_0_30px_rgba(0,0,0,0.4)]"
        style={{ aspectRatio: "4 / 3", touchAction: "none" }}
      >
        <div ref={mountRef} className="absolute inset-0" />

        {/* crosshair */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-light text-white/80 drop-shadow">
          ✛
        </div>

        {/* debug HUD */}
        <div
          ref={debugRef}
          className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-2 py-1 font-mono text-[10px] text-lime-300"
        />

        {/* error overlay */}
        {err && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/90 p-6 text-center">
            <div className="text-3xl">⚠️</div>
            <div className="font-bold text-red-300">3D 초기화 실패</div>
            <div className="max-w-full break-words font-mono text-xs text-red-100">{err}</div>
            <div className="mt-2 text-xs text-red-200/80">WebGL이 꺼져 있거나 차단된 환경일 수 있어요.</div>
          </div>
        )}

        {/* desktop start overlay */}
        {!isTouch && !started && (
          <button
            onClick={() => {
              setStarted(true);
              const cv = mountRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
              const res = cv?.requestPointerLock() as unknown as Promise<void> | undefined;
              res?.catch?.(() => {});
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-center"
          >
            <div className="text-5xl">⛏️</div>
            <div className="text-xl font-bold text-lime-300">클릭해서 시작</div>
            <div className="text-sm text-white/80">
              이동 <b>W A S D</b> · 점프 <b>Space</b>
              <br />
              시점 <b>마우스 이동</b> (안 되면 <b>화면 드래그</b>)
              <br />
              <b>좌클릭</b> 부수기 · <b>우클릭</b> 설치 · 블록선택 <b>1~8</b>
            </div>
          </button>
        )}

        {/* touch controls */}
        {isTouch && (
          <>
            {/* look layer (right side) */}
            <div
              className="absolute inset-y-0 right-0 w-1/2"
              onPointerDown={(e) => {
                lookId.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (lookId.current.id !== e.pointerId) return;
                lookRef.current.dx += e.clientX - lookId.current.x;
                lookRef.current.dy += e.clientY - lookId.current.y;
                lookId.current.x = e.clientX;
                lookId.current.y = e.clientY;
              }}
              onPointerUp={() => (lookId.current.id = -1)}
              onPointerCancel={() => (lookId.current.id = -1)}
            />

            {/* joystick (bottom-left) */}
            <div
              ref={joyRef}
              className="absolute bottom-4 left-4 h-28 w-28 rounded-full border-2 border-white/40 bg-white/10"
              onPointerDown={(e) => {
                const r = joyRef.current!.getBoundingClientRect();
                joyState.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
              }}
              onPointerMove={(e) => {
                if (joyState.current.id !== e.pointerId) return;
                const dx = e.clientX - joyState.current.cx;
                const dy = e.clientY - joyState.current.cy;
                const mag = Math.min(1, Math.hypot(dx, dy) / 50);
                const ang = Math.atan2(dy, dx);
                moveRef.current.r = Math.cos(ang) * mag;
                moveRef.current.f = -Math.sin(ang) * mag;
              }}
              onPointerUp={() => {
                joyState.current.id = -1;
                moveRef.current.f = 0;
                moveRef.current.r = 0;
              }}
              onPointerCancel={() => {
                joyState.current.id = -1;
                moveRef.current.f = 0;
                moveRef.current.r = 0;
              }}
            >
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
            </div>

            {/* action buttons (bottom-right) */}
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  moveRef.current.jump = true;
                  setTimeout(() => (moveRef.current.jump = false), 120);
                }}
                className="h-14 w-14 rounded-full bg-sky-500/80 text-2xl active:scale-90"
              >
                ⤴️
              </button>
              <div className="flex gap-2">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    actionRef.current?.breakBlock();
                  }}
                  className="h-14 w-14 rounded-full bg-red-500/80 text-2xl active:scale-90"
                >
                  ⛏️
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    actionRef.current?.placeBlock();
                  }}
                  className="h-14 w-14 rounded-full bg-green-500/80 text-2xl active:scale-90"
                >
                  🧱
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* hotbar */}
      <div className="flex w-full max-w-[680px] flex-wrap justify-center gap-1.5">
        {BLOCKS.map((b, i) => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg border-2 text-[9px] font-bold transition ${
              selected === b.id ? "border-white scale-105" : "border-white/20"
            }`}
            style={{ background: b.ui }}
          >
            <span className="text-white/90 drop-shadow">{i + 1}</span>
            <span className="text-white drop-shadow">{b.name}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-white/60">
        {isTouch
          ? "왼쪽 조이스틱 이동 · 오른쪽 드래그 시점 · ⛏️부수기 🧱설치 ⤴️점프"
          : "WASD 이동 · 마우스(또는 드래그) 시점 · 좌클릭 부수기 · 우클릭 설치 · 1~8 블록선택"}
      </p>
    </main>
  );
}