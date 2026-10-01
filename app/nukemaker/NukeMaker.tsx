"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ----------------------------------------------------------------------------
// 핵폭탄 만들기: 돈을 캐서 재료(핵물질·티타늄 철판·미사일 몸체)를 사고, 조립해서
// 상상 속 악당 기지와 전쟁하는 게임. 실제 무기와는 아무 상관 없는 만화 같은 놀이다.
// ----------------------------------------------------------------------------

type MaterialId = "core" | "plate" | "body";

const MATERIALS: { id: MaterialId; emoji: string; name: string; price: number; desc: string }[] = [
  { id: "core", emoji: "☢️", name: "핵물질", price: 50, desc: "폭탄의 힘! 혼자 두면 위험해요" },
  { id: "plate", emoji: "🛡️", name: "티타늄 철판", price: 20, desc: "핵물질을 버티는 튼튼한 판" },
  { id: "body", emoji: "🚀", name: "미사일 몸체", price: 30, desc: "적 기지까지 날아가요" },
];

/** 핵폭탄 1개에 드는 재료 */
const RECIPE: Record<MaterialId, number> = { core: 1, plate: 2, body: 1 };
const BUILD_MS = 1500;

/** 상상 속 악당 기지들. 뒤로 갈수록 튼튼하고 공격도 세다. */
const ENEMIES = [
  { emoji: "🏴‍☠️", name: "해적 섬" },
  { emoji: "👾", name: "외계인 기지" },
  { emoji: "🤖", name: "로봇 요새" },
  { emoji: "🦖", name: "공룡 왕국" },
  { emoji: "🧛", name: "뱀파이어 성" },
  { emoji: "🧟", name: "좀비 도시" },
  { emoji: "🐉", name: "드래곤 산" },
  { emoji: "👽", name: "화성 기지" },
  { emoji: "🌑", name: "그림자 제국" },
  { emoji: "👹", name: "마왕성" },
];

function enemyMaxHp(i: number) {
  return Math.round(100 * Math.pow(3, i));
}
function enemyAttack(i: number) {
  return 5 + i * 3;
}
function enemyReward(i: number) {
  return Math.round(300 * Math.pow(2.2, i));
}
/** 악당이 공격하는 간격 */
const ENEMY_ATTACK_MS = 8000;

const BASE_MAX_HP = 100;

// 업그레이드 공식. 설명과 계산이 어긋나지 않도록 여기에만 둔다.
function mineTap(lv: number) {
  return 10 * lv;
}
function minePerSec(lv: number) {
  return 2 * lv;
}
function mineCost(lv: number) {
  return Math.round(100 * Math.pow(1.6, lv - 1));
}
function nukeDamage(lv: number) {
  return Math.round(60 * Math.pow(1.5, lv - 1));
}
function powerCost(lv: number) {
  return Math.round(200 * Math.pow(1.8, lv - 1));
}
const SHIELD_PRICE = 80;
const SHIELD_AMOUNT = 50;

const SAVE_KEY = "nukemaker_save_v1";

interface Save {
  money: number;
  stock: Record<MaterialId, number>;
  nukes: number;
  mineLv: number;
  powerLv: number;
  shield: number;
  baseHp: number;
  enemy: number;
  enemyHp: number;
  wins: number;
}

const NEW_GAME: Save = {
  money: 150,
  stock: { core: 0, plate: 0, body: 0 },
  nukes: 0,
  mineLv: 1,
  powerLv: 1,
  shield: 0,
  baseHp: BASE_MAX_HP,
  enemy: 0,
  enemyHp: enemyMaxHp(0),
  wins: 0,
};

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return NEW_GAME;
    const d = JSON.parse(raw) as Partial<Save>;
    const num = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : def);
    const enemy = Math.min(ENEMIES.length, Math.floor(num(d.enemy, 0)));
    return {
      money: num(d.money, NEW_GAME.money),
      stock: {
        core: Math.floor(num(d.stock?.core, 0)),
        plate: Math.floor(num(d.stock?.plate, 0)),
        body: Math.floor(num(d.stock?.body, 0)),
      },
      nukes: Math.floor(num(d.nukes, 0)),
      mineLv: Math.max(1, Math.floor(num(d.mineLv, 1))),
      powerLv: Math.max(1, Math.floor(num(d.powerLv, 1))),
      shield: num(d.shield, 0),
      baseHp: Math.min(BASE_MAX_HP, num(d.baseHp, BASE_MAX_HP)),
      enemy,
      enemyHp: enemy < ENEMIES.length ? Math.min(enemyMaxHp(enemy), num(d.enemyHp, enemyMaxHp(enemy))) : 0,
      wins: Math.floor(num(d.wins, 0)),
    };
  } catch {
    return NEW_GAME;
  }
}

type Fx = { kind: "launch" | "boom" | "hit"; id: number } | null;

export default function NukeMaker() {
  const [game, setGame] = useState<Save>(loadSave);
  const [building, setBuilding] = useState(false);
  const [fx, setFx] = useState<Fx>(null);
  const [log, setLog] = useState<string[]>(["🎮 광산을 눌러 돈을 모으고, 재료를 사서 핵폭탄을 만들어요!"]);
  const [taps, setTaps] = useState<{ id: number; x: number }[]>([]);
  const fxId = useRef(0);

  const say = useCallback((line: string) => setLog((l) => [line, ...l].slice(0, 6)), []);
  /** 타이머 안에서 최신 상태를 읽기 위한 거울. 상태 갱신 함수 안에서 알림을 띄우면 두 번 불릴 수 있어서 이렇게 한다. */
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // 저장
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      // 저장이 막혀도 게임은 계속된다.
    }
  }, [game]);

  // 광산 자동 수입
  useEffect(() => {
    const id = setInterval(() => setGame((g) => ({ ...g, money: g.money + minePerSec(g.mineLv) })), 1000);
    return () => clearInterval(id);
  }, []);

  const cleared = game.enemy >= ENEMIES.length;

  // 악당의 공격: 방어막이 먼저 막고, 남은 만큼 기지가 다친다
  useEffect(() => {
    if (cleared) return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const dmg = enemyAttack(g.enemy);
      const blocked = Math.min(g.shield, dmg);
      const hp = g.baseHp - (dmg - blocked);
      if (hp <= 0) {
        // 기지가 무너지면 재료 절반을 잃고, 적도 체력을 회복한 채로 다시 시작한다
        setGame((cur) => ({
          ...cur,
          shield: 0,
          baseHp: BASE_MAX_HP,
          stock: { core: Math.floor(cur.stock.core / 2), plate: Math.floor(cur.stock.plate / 2), body: Math.floor(cur.stock.body / 2) },
          enemyHp: enemyMaxHp(cur.enemy),
        }));
        say("💔 기지가 무너졌어요! 재료 절반을 잃고 다시 세웠어요. 방어막을 사요!");
      } else {
        setGame((cur) => ({ ...cur, shield: Math.max(0, cur.shield - blocked), baseHp: Math.max(1, cur.baseHp - (dmg - blocked)) }));
        say(`${ENEMIES[g.enemy].emoji} 공격! ${blocked > 0 ? `방어막이 ${blocked} 막고 ` : ""}기지 -${dmg - blocked}`);
      }
      setFx({ kind: "hit", id: ++fxId.current });
    }, ENEMY_ATTACK_MS);
    return () => clearInterval(id);
  }, [cleared, say]);

  // 효과는 잠깐만 보인다
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(null), fx.kind === "launch" ? 900 : 1200);
    return () => clearTimeout(t);
  }, [fx]);

  const tapMine = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setGame((g) => ({ ...g, money: g.money + mineTap(g.mineLv) }));
    const id = ++fxId.current;
    setTaps((t) => [...t.slice(-6), { id, x }]);
    setTimeout(() => setTaps((t) => t.filter((v) => v.id !== id)), 700);
  };

  const buy = (id: MaterialId, n: number) => {
    const price = MATERIALS.find((m) => m.id === id)!.price * n;
    if (game.money < price) return;
    setGame((g) => ({ ...g, money: g.money - price, stock: { ...g.stock, [id]: g.stock[id] + n } }));
  };

  const canBuild = (Object.keys(RECIPE) as MaterialId[]).every((id) => game.stock[id] >= RECIPE[id]);

  const build = () => {
    if (!canBuild || building) return;
    setBuilding(true);
    setGame((g) => ({
      ...g,
      stock: { core: g.stock.core - RECIPE.core, plate: g.stock.plate - RECIPE.plate, body: g.stock.body - RECIPE.body },
    }));
    setTimeout(() => {
      setGame((g) => ({ ...g, nukes: g.nukes + 1 }));
      setBuilding(false);
      say("🏭 핵폭탄 1개 완성!");
    }, BUILD_MS);
  };

  const launch = () => {
    if (game.nukes <= 0 || cleared || fx?.kind === "launch") return;
    setGame((g) => ({ ...g, nukes: g.nukes - 1 }));
    setFx({ kind: "launch", id: ++fxId.current });
    setTimeout(() => {
      setFx({ kind: "boom", id: ++fxId.current });
      const g = gameRef.current;
      if (g.enemy >= ENEMIES.length) return;
      const dmg = nukeDamage(g.powerLv);
      if (g.enemyHp - dmg > 0) {
        setGame((cur) => ({ ...cur, enemyHp: cur.enemyHp - dmg }));
        say(`💥 명중! ${ENEMIES[g.enemy].name} -${dmg.toLocaleString()}`);
        return;
      }
      const beaten = g.enemy;
      const next = beaten + 1;
      setGame((cur) => ({
        ...cur,
        money: cur.money + enemyReward(beaten),
        wins: cur.wins + 1,
        enemy: next,
        enemyHp: next < ENEMIES.length ? enemyMaxHp(next) : 0,
      }));
      say(`🏆 ${ENEMIES[beaten].emoji} ${ENEMIES[beaten].name} 점령! 보상 💰${enemyReward(beaten).toLocaleString()}`);
    }, 900);
  };

  const upgradeMine = () => {
    const cost = mineCost(game.mineLv);
    if (game.money < cost) return;
    setGame((g) => ({ ...g, money: g.money - cost, mineLv: g.mineLv + 1 }));
  };
  const upgradePower = () => {
    const cost = powerCost(game.powerLv);
    if (game.money < cost) return;
    setGame((g) => ({ ...g, money: g.money - cost, powerLv: g.powerLv + 1 }));
  };
  const buyShield = () => {
    if (game.money < SHIELD_PRICE) return;
    setGame((g) => ({ ...g, money: g.money - SHIELD_PRICE, shield: g.shield + SHIELD_AMOUNT }));
  };
  const repair = () => {
    const cost = Math.ceil((BASE_MAX_HP - game.baseHp) * 2);
    if (cost <= 0 || game.money < cost) return;
    setGame((g) => ({ ...g, money: g.money - cost, baseHp: BASE_MAX_HP }));
  };

  const [confirmReset, setConfirmReset] = useState(false);
  const reset = () => {
    setGame(NEW_GAME);
    setLog(["🎮 새 게임 시작!"]);
    setConfirmReset(false);
  };

  const enemy = ENEMIES[Math.min(game.enemy, ENEMIES.length - 1)];
  const enemyMax = enemyMaxHp(Math.min(game.enemy, ENEMIES.length - 1));
  const shake = fx?.kind === "boom" ? "nuke-shake" : fx?.kind === "hit" ? "nuke-hit" : "";
  const repairCost = Math.ceil((BASE_MAX_HP - game.baseHp) * 2);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-950 via-zinc-900 to-emerald-950 px-3 pb-12 text-white ${shake}`}>
      <style jsx global>{`
        @keyframes nukeShake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-8px, 4px); }
          40% { transform: translate(7px, -5px); }
          60% { transform: translate(-5px, 3px); }
          80% { transform: translate(4px, -2px); }
        }
        .nuke-shake { animation: nukeShake 0.5s ease-in-out 2; }
        @keyframes nukeHit {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(239, 68, 68, 0.25); }
        }
        .nuke-hit { animation: nukeHit 0.4s ease-in-out 2; }
        @keyframes fly {
          0% { left: 8%; bottom: 20%; transform: rotate(45deg) scale(0.8); }
          100% { left: 78%; bottom: 55%; transform: rotate(45deg) scale(1.1); }
        }
        @keyframes boom {
          0% { transform: scale(0.2); opacity: 1; }
          60% { transform: scale(1.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes mushroom {
          0% { transform: translateY(20px) scale(0.4); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.4); opacity: 0; }
        }
        @keyframes coinUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
      `}</style>

      <div className="mx-auto flex max-w-5xl items-center justify-between py-4">
        <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
          ← 홈
        </Link>
        <h1 className="text-2xl font-black sm:text-3xl">☢️ 핵폭탄 만들기</h1>
        <button onClick={() => setConfirmReset(true)} className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
          🔄 다시하기
        </button>
      </div>

      <div className="mx-auto max-w-5xl">
        {/* 상태 */}
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Stat label="💰 돈" value={Math.floor(game.money).toLocaleString()} />
          <Stat label="☢️ 핵폭탄" value={`${game.nukes}개`} />
          <Stat label="💥 폭탄 위력" value={nukeDamage(game.powerLv).toLocaleString()} />
          <Stat label="🏆 점령" value={`${game.wins}/${ENEMIES.length}`} />
        </div>

        {/* 전장 */}
        <div className="relative mt-4 h-64 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-sky-900 via-indigo-950 to-emerald-900 sm:h-72">
          {/* 내 기지 */}
          <div className="absolute bottom-4 left-4 text-center">
            <div className="text-6xl">🏰</div>
            <div className="mt-1 text-xs font-bold">내 기지</div>
            <Bar value={game.baseHp} max={BASE_MAX_HP} color="bg-emerald-400" />
            {game.shield > 0 && <div className="mt-1 text-xs text-cyan-300">🔰 방어막 {Math.floor(game.shield)}</div>}
          </div>

          {/* 적 기지 */}
          {cleared ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-7xl">🎉</div>
              <div className="mt-2 text-2xl font-black text-amber-300">모든 악당 기지 점령! 클리어!</div>
            </div>
          ) : (
            <div className="absolute bottom-4 right-4 text-center">
              <div className={`text-6xl ${fx?.kind === "boom" ? "opacity-40" : ""}`}>{enemy.emoji}</div>
              <div className="mt-1 text-xs font-bold">
                {game.enemy + 1}. {enemy.name}
              </div>
              <Bar value={game.enemyHp} max={enemyMax} color="bg-red-500" />
              <div className="mt-1 text-[10px] text-white/60">
                체력 {Math.max(0, Math.ceil(game.enemyHp)).toLocaleString()} · 공격력 {enemyAttack(game.enemy)}
              </div>
            </div>
          )}

          {/* 발사 */}
          {fx?.kind === "launch" && (
            <span key={fx.id} className="absolute text-5xl" style={{ animation: "fly 0.9s ease-in forwards" }}>
              🚀
            </span>
          )}
          {/* 폭발 */}
          {fx?.kind === "boom" && (
            <div key={fx.id} className="pointer-events-none absolute bottom-10 right-10">
              <span className="absolute -left-10 -top-10 text-8xl" style={{ animation: "boom 1.2s ease-out forwards" }}>
                💥
              </span>
              <span className="absolute -left-6 -top-28 text-7xl" style={{ animation: "mushroom 1.2s ease-out forwards" }}>
                ☁️
              </span>
            </div>
          )}
          {fx?.kind === "hit" && !cleared && (
            <div key={fx.id} className="pointer-events-none absolute bottom-14 left-12 text-5xl" style={{ animation: "boom 1s ease-out forwards" }}>
              🔥
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={launch}
            disabled={game.nukes <= 0 || cleared || fx?.kind === "launch"}
            className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-8 py-4 text-2xl font-black shadow-lg transition-transform hover:scale-105 disabled:opacity-40"
          >
            🚀 핵폭탄 발사! ({game.nukes})
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* 광산 */}
          <div className="rounded-3xl bg-white/5 p-4">
            <h2 className="mb-2 font-black">⛏️ 광산 (Lv.{game.mineLv})</h2>
            <button
              onClick={tapMine}
              className="relative h-32 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-amber-700 to-stone-800 text-5xl transition-transform active:scale-95"
            >
              ⛏️💎
              {taps.map((t) => (
                <span
                  key={t.id}
                  className="pointer-events-none absolute top-6 text-base font-black text-amber-300"
                  style={{ left: `${t.x}%`, animation: "coinUp 0.7s ease-out forwards" }}
                >
                  +💰{mineTap(game.mineLv)}
                </span>
              ))}
            </button>
            <p className="mt-2 text-center text-xs text-white/60">
              누르면 +{mineTap(game.mineLv)} · 자동 초당 +{minePerSec(game.mineLv)}
            </p>
            <button
              onClick={upgradeMine}
              disabled={game.money < mineCost(game.mineLv)}
              className="mt-2 w-full rounded-xl bg-amber-500 py-2 text-sm font-black text-zinc-900 disabled:opacity-40"
            >
              광산 업그레이드 💰{mineCost(game.mineLv).toLocaleString()}
            </button>
          </div>

          {/* 재료 상점 + 조립 */}
          <div className="rounded-3xl bg-white/5 p-4">
            <h2 className="mb-2 font-black">🛒 재료 상점</h2>
            <div className="space-y-2">
              {MATERIALS.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
                  <span className="text-3xl">{m.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">
                      {m.name} <span className="text-emerald-300">×{game.stock[m.id]}</span>
                    </div>
                    <div className="truncate text-[11px] text-white/50">{m.desc}</div>
                  </div>
                  <button
                    onClick={() => buy(m.id, 1)}
                    disabled={game.money < m.price}
                    className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold disabled:opacity-40"
                  >
                    💰{m.price}
                  </button>
                  <button
                    onClick={() => buy(m.id, 5)}
                    disabled={game.money < m.price * 5}
                    className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold disabled:opacity-40"
                  >
                    ×5
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-black/30 p-3 text-center">
              <div className="text-xs text-white/60">
                조립법: ☢️×{RECIPE.core} + 🛡️×{RECIPE.plate} + 🚀×{RECIPE.body} = 💣
              </div>
              <button
                onClick={build}
                disabled={!canBuild || building}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 py-3 font-black disabled:opacity-40"
              >
                {building ? "🏭 조립 중… 🔧" : "🏭 핵폭탄 조립하기"}
              </button>
            </div>
          </div>

          {/* 업그레이드·방어 */}
          <div className="rounded-3xl bg-white/5 p-4">
            <h2 className="mb-2 font-black">🔧 강화와 방어</h2>
            <div className="space-y-2">
              <button
                onClick={upgradePower}
                disabled={game.money < powerCost(game.powerLv)}
                className="w-full rounded-xl bg-red-600/80 p-3 text-left disabled:opacity-40"
              >
                <div className="font-bold">💥 폭탄 위력 Lv.{game.powerLv} → {game.powerLv + 1}</div>
                <div className="text-xs text-white/70">
                  피해 {nukeDamage(game.powerLv)} → {nukeDamage(game.powerLv + 1)} · 💰{powerCost(game.powerLv).toLocaleString()}
                </div>
              </button>
              <button onClick={buyShield} disabled={game.money < SHIELD_PRICE} className="w-full rounded-xl bg-cyan-700/80 p-3 text-left disabled:opacity-40">
                <div className="font-bold">🔰 방어막 +{SHIELD_AMOUNT}</div>
                <div className="text-xs text-white/70">악당 공격을 먼저 막아요 · 💰{SHIELD_PRICE}</div>
              </button>
              <button
                onClick={repair}
                disabled={repairCost <= 0 || game.money < repairCost}
                className="w-full rounded-xl bg-emerald-700/80 p-3 text-left disabled:opacity-40"
              >
                <div className="font-bold">🧰 기지 수리</div>
                <div className="text-xs text-white/70">{repairCost > 0 ? `체력 가득 채우기 · 💰${repairCost}` : "기지가 멀쩡해요"}</div>
              </button>
            </div>
            <div className="mt-3 space-y-1 text-xs text-white/70">
              {log.map((line, i) => (
                <p key={i} className={i === 0 ? "font-bold text-white" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/40">
          상상 속 악당 기지와 싸우는 만화 게임이에요. 악당은 {ENEMY_ATTACK_MS / 1000}초마다 공격해요!
        </p>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmReset(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">🔄</div>
            <p className="mt-2 text-xl font-black">처음부터 다시 할까요?</p>
            <p className="mt-1 text-sm text-white/60">돈, 재료, 핵폭탄, 점령한 기지가 모두 사라져요.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-xl bg-white/10 py-3 font-bold">
                취소
              </button>
              <button onClick={reset} className="flex-1 rounded-xl bg-red-600 py-3 font-black">
                다시하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-black/40">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}
