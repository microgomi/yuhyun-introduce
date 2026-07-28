// 실시간 공동 레이드 — 공유 DB(Upstash Redis)가 있으면 인터넷 멀티, 없으면 로컬 메모리 폴백
export const dynamic = "force-dynamic";

const BOSSES = [
  { name: "레이드 드래곤", emoji: "🐲" },
  { name: "혼돈의 군주", emoji: "👹" },
  { name: "종말의 왕", emoji: "🌀" },
  { name: "우주 포식자", emoji: "🌌" },
];

// ───── Upstash Redis REST (env 있으면 사용) ─────
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

async function redis(...cmd: (string | number)[]): Promise<unknown> {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const d = await r.json();
  return d.result;
}

interface View { bossName: string; bossEmoji: string; bossHp: number; bossMax: number; round: number; players: { name: string; damage: number }[]; log: string[] }

// ───── Redis 구현 ─────
async function redisInit() {
  const meta = await redis("GET", "raid:meta");
  if (!meta) {
    await redis("SET", "raid:meta", JSON.stringify({ ...BOSSES[0], max: 1000, round: 1 }));
    await redis("SET", "raid:hp", 1000);
  }
}
async function redisView(now: number): Promise<View> {
  await redisInit();
  const metaRaw = (await redis("GET", "raid:meta")) as string;
  const meta = JSON.parse(metaRaw);
  const hp = Number((await redis("GET", "raid:hp")) || 0);
  const seen = (await redis("HGETALL", "raid:seen")) as string[] | Record<string, string> | null;
  const dmgs = (await redis("HGETALL", "raid:players")) as string[] | Record<string, string> | null;
  const seenMap = toMap(seen);
  const dmgMap = toMap(dmgs);
  // prune stale
  for (const name in seenMap) {
    if (now - Number(seenMap[name]) > 30000) { await redis("HDEL", "raid:seen", name); await redis("HDEL", "raid:players", name); delete dmgMap[name]; }
  }
  const players = Object.entries(dmgMap).map(([name, damage]) => ({ name, damage: Number(damage) })).sort((a, b) => b.damage - a.damage);
  const log = ((await redis("LRANGE", "raid:log", 0, 7)) as string[]) || [];
  return { bossName: meta.name, bossEmoji: meta.emoji, bossHp: hp, bossMax: meta.max, round: meta.round, players, log };
}
function toMap(v: string[] | Record<string, string> | null): Record<string, string> {
  if (!v) return {};
  if (Array.isArray(v)) { const m: Record<string, string> = {}; for (let i = 0; i < v.length; i += 2) m[v[i]] = v[i + 1]; return m; }
  return v;
}
async function redisPush(msg: string) { await redis("LPUSH", "raid:log", msg); await redis("LTRIM", "raid:log", 0, 7); }

// ───── 로컬 메모리 폴백 ─────
type Player = { name: string; damage: number; lastSeen: number };
type Mem = { name: string; emoji: string; hp: number; max: number; round: number; players: Record<string, Player>; log: string[] };
const g = globalThis as unknown as { __raid?: Mem };
function mem(): Mem {
  if (!g.__raid || typeof g.__raid.hp !== "number" || typeof g.__raid.name !== "string") {
    g.__raid = { ...BOSSES[0], hp: 1000, max: 1000, round: 1, players: {}, log: [] };
  }
  return g.__raid;
}
function memView(now: number): View {
  const m = mem();
  for (const k in m.players) if (now - m.players[k].lastSeen > 30000) delete m.players[k];
  const players = Object.values(m.players).map(p => ({ name: p.name, damage: p.damage })).sort((a, b) => b.damage - a.damage);
  return { bossName: m.name, bossEmoji: m.emoji, bossHp: m.hp, bossMax: m.max, round: m.round, players, log: m.log.slice(0, 8) };
}

function advance(round: number) { const b = BOSSES[(round - 1) % BOSSES.length]; return { ...b, max: 1000 * round, round }; }

export async function GET() {
  const now = Date.now();
  return Response.json(useRedis ? await redisView(now) : memView(now));
}

export async function POST(req: Request) {
  const { action, name, dmg } = await req.json().catch(() => ({} as Record<string, unknown>));
  const now = Date.now();
  if (typeof name !== "string" || !name) {
    return Response.json(useRedis ? await redisView(now) : memView(now));
  }

  if (useRedis) {
    await redisInit();
    if (action === "join") {
      const exists = await redis("HEXISTS", "raid:players", name);
      await redis("HSET", "raid:seen", name, now);
      if (!exists) { await redis("HSET", "raid:players", name, 0); await redisPush(`👋 ${name} 님 참전!`); }
    } else if (action === "attack") {
      const d = Math.max(1, Math.min(Number(dmg) || 10, 1e9));
      await redis("HSET", "raid:seen", name, now);
      await redis("HSETNX", "raid:players", name, 0);
      await redis("HINCRBY", "raid:players", name, d);
      const newHp = Number(await redis("DECRBY", "raid:hp", d));
      if (newHp <= 0) {
        const metaRaw = (await redis("GET", "raid:meta")) as string;
        const meta = JSON.parse(metaRaw);
        const nx = advance(meta.round + 1);
        await redis("SET", "raid:meta", JSON.stringify(nx));
        await redis("SET", "raid:hp", nx.max);
        await redis("DEL", "raid:players");
        await redisPush(`🎉 ${meta.emoji} ${meta.name} 격파! (라운드 ${meta.round}) — 모두 승리!`);
      }
    }
    return Response.json(await redisView(now));
  }

  // 로컬 메모리
  const m = mem();
  if (action === "join") {
    if (!m.players[name]) { m.players[name] = { name, damage: 0, lastSeen: now }; m.log.unshift(`👋 ${name} 님 참전!`); }
    else m.players[name].lastSeen = now;
  } else if (action === "attack" && m.players[name]) {
    const d = Math.max(1, Math.min(Number(dmg) || 10, m.hp));
    m.hp -= d; m.players[name].damage += d; m.players[name].lastSeen = now;
    if (m.hp <= 0) {
      m.log.unshift(`🎉 ${m.emoji} ${m.name} 격파! (라운드 ${m.round}) — 모두 승리!`);
      const nx = advance(m.round + 1);
      Object.assign(m, { ...nx, hp: nx.max, players: {} });
    }
  }
  return Response.json(memView(now));
}
