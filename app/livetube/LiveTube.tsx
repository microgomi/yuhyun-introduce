"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  AWARDS,
  awardFor,
  BORED_CHATS,
  CATEGORIES,
  type Category,
  type CategoryId,
  COMBO_BONUS,
  COMBO_WINDOW_MS,
  type Combo,
  COMBOS,
  COMMON_CHATS,
  type Food,
  FOODS,
  formatCount,
  HUNGRY_CHATS,
  type ItemId,
  LEAVING_CHATS,
  LOUD_CHATS,
  NICKNAMES,
  nextAward,
  pick,
  SHOP_ITEMS,
} from "./liveData";
import { useSpeech } from "./useSpeech";
import { deleteVideo, listVideos, type SavedVideo, saveVideo } from "./videoStore";
import { reactTo } from "./voiceReact";

type Phase = "setup" | "live" | "result";

const WIDTH = 960;
const HEIGHT = 540;
/** 녹화 영상이 너무 커지지 않도록 이 시간이 되면 방송을 자동으로 끝낸다. */
const MAX_LIVE_MS = 10 * 60 * 1000;
const SAVE_KEY = "livetube_channel_v1";
const CHAT_LINES = 7;

interface Chat {
  id: number;
  name: string;
  text: string;
  /** 후원 금액(원). 0 이면 일반 채팅 */
  donation: number;
}

interface Heart {
  id: number;
  x: number;
  born: number;
  emoji: string;
}

interface Channel {
  subs: number;
  money: number;
  broadcasts: number;
  /** 지금까지 방송을 보러 온 시청자 수의 합. 버튼은 이걸로 받는다. */
  totalViewers: number;
  /** 후원금으로 산 방송 장비 */
  items: ItemId[];
}

function has(channel: Channel, id: ItemId) {
  return channel.items.includes(id);
}

/** 음식값(미니 냉장고가 있으면 반값) */
function foodPrice(channel: Channel, food: Food) {
  return has(channel, "fridge") ? Math.floor(food.price / 2) : food.price;
}

interface LiveStats {
  viewers: number;
  peakViewers: number;
  likes: number;
  newSubs: number;
  money: number;
  /** 0~1 지금 방송 분위기 */
  hype: number;
  elapsedMs: number;
  /** 0~100 배부름. 0 이 되면 팬이 떠난다 */
  fullness: number;
  /** 이번 방송에 들어온 시청자 수의 합 */
  cumViewers: number;
  /** 이번 방송에서 음식에 쓴 돈 */
  spent: number;
}

const EMPTY_STATS: LiveStats = {
  viewers: 0,
  peakViewers: 0,
  likes: 0,
  newSubs: 0,
  money: 0,
  hype: 0,
  elapsedMs: 0,
  fullness: 100,
  cumViewers: 0,
  spent: 0,
};

/** 1초에 줄어드는 배부름. 가득 찬 상태에서 약 5분이면 바닥난다. */
const HUNGER_PER_SECOND = 0.35;
/** 배부름이 이보다 낮으면 시청자가 줄기 시작한다 */
const HUNGRY_LINE = 30;
/** 1초마다 시청자 중 이만큼이 새로 들어온 사람으로 바뀐다(누적 시청자 계산용) */
const VIEWER_TURNOVER = 0.1;

function loadChannel(): Channel {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { subs: 0, money: 0, broadcasts: 0, totalViewers: 0, items: [] };
    const d = JSON.parse(raw) as Partial<Channel>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    const known = new Set<string>(SHOP_ITEMS.map((i) => i.id));
    const items = Array.isArray(d.items) ? d.items.filter((i): i is ItemId => typeof i === "string" && known.has(i)) : [];
    return { subs: num(d.subs), money: num(d.money), broadcasts: num(d.broadcasts), totalViewers: num(d.totalViewers), items };
  } catch {
    return { subs: 0, money: 0, broadcasts: 0, totalViewers: 0, items: [] };
  }
}

function saveChannel(channel: Channel) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(channel));
  } catch {
    // 저장이 막혀도 방송은 계속된다.
  }
}

function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** 브라우저가 녹화할 수 있는 영상 형식 중 가장 널리 재생되는 것 */
function pickMimeType(): string {
  const options = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export default function LiveTube() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [channel, setChannel] = useState<Channel>(loadChannel);
  const [title, setTitle] = useState("나의 첫 라이브 방송!");
  const [categoryId, setCategoryId] = useState<CategoryId>("talk");
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];

  const [camStatus, setCamStatus] = useState<"off" | "asking" | "on" | "audio" | "denied">("off");
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lastVideo, setLastVideo] = useState<SavedVideo | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed" | "unsupported">("idle");
  const [videos, setVideos] = useState<SavedVideo[] | null>(null);
  const [watching, setWatching] = useState<SavedVideo | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);

  // 방송 루프가 매 프레임 읽는 값들은 ref 에 둔다(매 프레임 렌더링하지 않도록).
  const statsRef = useRef<LiveStats>(EMPTY_STATS);
  const chatsRef = useRef<Chat[]>([]);
  const heartsRef = useRef<Heart[]>([]);
  const idRef = useRef(0);
  const voiceRef = useRef(0);
  const voiceSumRef = useRef({ sum: 0, n: 0, loud: 0 });
  const motionRef = useRef(0);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const burstRef = useRef(0);
  const startAtRef = useRef(0);
  const titleRef = useRef(title);
  const categoryRef = useRef<Category>(category);
  const channelRef = useRef(channel);
  /** 방송 화면에 띄울 자막(내가 한 말). at 은 마지막으로 바뀐 시각 */
  const subtitleRef = useRef({ text: "", at: 0 });
  /** 방송이 끝난 뒤 늦게 도착한 반응 채팅을 버리기 위해 */
  const liveRef = useRef(false);
  /** 지금 먹고 있는 음식 */
  const eatingRef = useRef<{ food: Food; start: number } | null>(null);
  /** 최근에 먹은 음식(합체 판정용) */
  const recentFoodsRef = useRef<{ id: string; at: number }[]>([]);
  /** 합체 연출 */
  const comboShowRef = useRef<{ combo: Combo; start: number } | null>(null);
  /** 합체로 몰려온 시청자가 한 번에 빠지지 않고 천천히 빠지도록 목표 시청자에 더해 둔다 */
  const comboBoostRef = useRef(0);
  const [eatingId, setEatingId] = useState<string | null>(null);
  /** 목소리로 "라면 먹을게요" 하면 먹도록, 아래에서 만든 eat 을 가리킨다 */
  const eatRef = useRef<(food: Food) => void>(() => {});
  const speech = useSpeech();
  const { start: startSpeech, stop: stopSpeech } = speech;

  useEffect(() => {
    titleRef.current = title;
    categoryRef.current = category;
    channelRef.current = channel;
  }, [title, category, channel]);

  // ── 카메라·마이크 ──
  const closeMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (videoElRef.current) videoElRef.current.srcObject = null;
    setCamStatus("off");
  }, []);

  const openMedia = useCallback(async () => {
    if (streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus("denied");
      return;
    }
    setCamStatus("asking");
    let stream: MediaStream | null = null;
    let status: "on" | "audio" = "on";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: true });
    } catch {
      // 카메라가 없거나 거절했으면 목소리만이라도 방송한다.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status = "audio";
      } catch {
        setCamStatus("denied");
        return;
      }
    }
    streamRef.current = stream;
    if (status === "on") {
      // 화면에 붙이지 않는 비디오. 캔버스에 그려서 방송 화면을 만든다.
      const el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.srcObject = stream;
      videoElRef.current = el;
      void el.play();
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    setCamStatus(status);
  }, []);

  useEffect(() => closeMedia, [closeMedia]);

  // ── 채팅·하트 ──
  const addChat = useCallback((text: string, donation = 0, name = pick(NICKNAMES)) => {
    const chat: Chat = { id: ++idRef.current, name, text, donation };
    chatsRef.current = [...chatsRef.current, chat].slice(-40);
    setChats(chatsRef.current);
  }, []);

  const addHeart = useCallback((emoji = "❤️") => {
    heartsRef.current.push({ id: ++idRef.current, x: 0.55 + Math.random() * 0.4, born: performance.now(), emoji });
    statsRef.current = { ...statsRef.current, likes: statsRef.current.likes + 1 };
  }, []);

  // ── 방송 화면 그리기(녹화되는 화면 그대로) ──
  useEffect(() => {
    if (phase !== "live") return;
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 18;
    const pg = probe.getContext("2d", { willReadFrequently: true });
    const buf = new Float32Array(1024);
    let raf = 0;
    let lastProbe = 0;

    const draw = (now: number) => {
      const s = statsRef.current;
      const video = videoElRef.current;
      const hasVideo = camStatus === "on" && video && video.readyState >= 2;

      // 목소리 크기
      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        voiceRef.current = voiceRef.current * 0.8 + rms * 0.2;
        const acc = voiceSumRef.current;
        acc.sum += rms;
        acc.n++;
        if (rms > 0.25) acc.loud++;
      }

      // 배경 / 카메라(거울처럼 좌우 반전)
      if (hasVideo) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.max(WIDTH / vw, HEIGHT / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        g.save();
        g.translate(WIDTH, 0);
        g.scale(-1, 1);
        g.drawImage(video, (WIDTH - dw) / 2, (HEIGHT - dh) / 2, dw, dh);
        g.restore();
        // 움직임: 아주 작게 줄인 화면을 이전 프레임과 비교
        if (pg && now - lastProbe > 200) {
          lastProbe = now;
          pg.drawImage(video, 0, 0, 32, 18);
          const data = pg.getImageData(0, 0, 32, 18).data;
          const prev = prevFrameRef.current;
          if (prev) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i + 1] - prev[i + 1]);
            const m = Math.min(1, diff / (32 * 18) / 25);
            motionRef.current = motionRef.current * 0.6 + m * 0.4;
          }
          prevFrameRef.current = new Uint8ClampedArray(data);
        }
      } else {
        const grad = g.createLinearGradient(0, 0, WIDTH, HEIGHT);
        grad.addColorStop(0, "#4c1d95");
        grad.addColorStop(1, "#be185d");
        g.fillStyle = grad;
        g.fillRect(0, 0, WIDTH, HEIGHT);
        // 카메라가 없으면 목소리에 맞춰 캐릭터가 들썩인다
        const bounce = Math.min(1, voiceRef.current * 6);
        g.font = `${150 + bounce * 60}px sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(categoryRef.current.emoji, WIDTH * 0.36, HEIGHT / 2 - bounce * 30);
        g.font = "bold 22px sans-serif";
        g.fillStyle = "rgba(255,255,255,0.7)";
        g.fillText(camStatus === "audio" ? "🎙️ 목소리 방송 중" : "📺 캐릭터 방송 중", WIDTH * 0.36, HEIGHT - 70);
      }

      // 윗줄: LIVE · 시간 · 시청자
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillStyle = "#dc2626";
      g.beginPath();
      g.roundRect(20, 18, 86, 34, 6);
      g.fill();
      g.fillStyle = "#fff";
      g.font = "bold 20px sans-serif";
      g.fillText("● LIVE", 30, 36);
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.beginPath();
      g.roundRect(114, 18, 250, 34, 6);
      g.fill();
      g.fillStyle = "#fff";
      g.fillText(`${clock(s.elapsedMs)}   👁 ${formatCount(s.viewers)}   ❤️ ${formatCount(s.likes)}`, 124, 36);

      // 분위기 막대
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(20, 60, 200, 8);
      g.fillStyle = s.hype > 0.6 ? "#f97316" : s.hype > 0.3 ? "#facc15" : "#60a5fa";
      g.fillRect(20, 60, 200 * s.hype, 8);

      // 배부름 게이지(배고프면 빨갛게 깜빡인다)
      const hungry = s.fullness < HUNGRY_LINE;
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.beginPath();
      g.roundRect(20, 76, 200, 26, 6);
      g.fill();
      g.fillStyle = hungry ? (Math.floor(now / 400) % 2 ? "#ef4444" : "#7f1d1d") : "#22c55e";
      g.fillRect(58, 84, 154 * (s.fullness / 100), 10);
      g.font = "16px sans-serif";
      g.fillStyle = "#fff";
      g.fillText("🍚", 28, 89);
      if (hungry) {
        g.font = "bold 18px sans-serif";
        g.fillStyle = "#fca5a5";
        g.fillText(s.fullness <= 0 ? "배고파서 팬이 떠나요!" : "배고파요… 뭐 좀 먹어요!", 22, 120);
      }

      // 합체 연출: 두 음식이 가운데로 모여 특별 요리가 된다
      const show = comboShowRef.current;
      if (show) {
        const t = (now - show.start) / 3500;
        if (t >= 1) {
          comboShowRef.current = null;
        } else {
          const [a, b] = show.combo.foods.map((id) => FOODS.find((f) => f.id === id)?.emoji ?? "");
          const cx = WIDTH * 0.36;
          const cy = HEIGHT * 0.45;
          g.textAlign = "center";
          g.fillStyle = `rgba(250,204,21,${0.35 * (1 - t)})`;
          g.fillRect(0, 0, WIDTH, HEIGHT);
          if (t < 0.35) {
            const gap = 220 * (1 - t / 0.35);
            g.font = "110px sans-serif";
            g.fillText(a, cx - gap, cy);
            g.fillText(b, cx + gap, cy);
          } else {
            const pop = Math.min(1, (t - 0.35) / 0.15);
            g.font = `${80 + pop * 90}px sans-serif`;
            g.fillText(show.combo.emoji, cx, cy);
            g.font = "bold 44px sans-serif";
            g.fillStyle = "#fde047";
            g.strokeStyle = "#7c2d12";
            g.lineWidth = 6;
            const label = `${show.combo.name} 합체!`;
            g.strokeText(label, cx, cy + 110);
            g.fillText(label, cx, cy + 110);
            g.font = "bold 30px sans-serif";
            g.fillStyle = "#fff";
            g.fillText("👁 +1만  ➕ 구독 +1만", cx, cy + 160);
          }
          g.textAlign = "left";
        }
      }

      // 먹는 중: 음식이 한 입씩 줄어든다
      const eating = eatingRef.current;
      if (eating) {
        const t = Math.min(1, (now - eating.start) / eating.food.eatMs);
        const bite = Math.floor(t * 5);
        const size = 150 * (1 - bite * 0.15);
        const cx = WIDTH * 0.36;
        const cy = HEIGHT * 0.62;
        g.textAlign = "center";
        g.font = `${size}px sans-serif`;
        g.fillText(eating.food.emoji, cx + Math.sin(now / 90) * 6, cy + (Math.floor(now / 250) % 2 ? -8 : 0));
        g.font = "bold 34px sans-serif";
        g.fillStyle = "#fde68a";
        g.fillText(Math.floor(now / 300) % 2 ? "냠냠 😋" : "쩝쩝 🤤", cx, cy - size / 2 - 24);
        g.textAlign = "left";
      }

      // 채팅창(오른쪽)
      const boxX = WIDTH - 330;
      const lines = chatsRef.current.slice(-CHAT_LINES);
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.beginPath();
      g.roundRect(boxX, 80, 310, CHAT_LINES * 40 + 16, 10);
      g.fill();
      g.font = "17px sans-serif";
      lines.forEach((c, i) => {
        const y = 104 + i * 40;
        if (c.donation > 0) {
          g.fillStyle = "rgba(250,204,21,0.9)";
          g.beginPath();
          g.roundRect(boxX + 6, y - 16, 298, 34, 6);
          g.fill();
          g.fillStyle = "#111";
          g.fillText(`💰 ${c.name} ${c.donation.toLocaleString()}원: ${c.text}`.slice(0, 26), boxX + 14, y);
        } else {
          g.fillStyle = "#a5f3fc";
          g.fillText(c.name, boxX + 14, y);
          const nameW = g.measureText(c.name + " ").width;
          g.fillStyle = "#fff";
          g.fillText(c.text.slice(0, 18), boxX + 14 + nameW, y);
        }
      });

      // 하트가 떠오른다
      heartsRef.current = heartsRef.current.filter((h) => now - h.born < 2200);
      g.textAlign = "center";
      for (const h of heartsRef.current) {
        const t = (now - h.born) / 2200;
        g.globalAlpha = 1 - t;
        g.font = `${30 + t * 16}px sans-serif`;
        g.fillText(h.emoji, h.x * WIDTH + Math.sin(t * 8 + h.id) * 16, HEIGHT - 30 - t * 300);
      }
      g.globalAlpha = 1;

      // 자막: 내가 한 말(인식 중인 말도 바로 보여 준다)
      const sub = subtitleRef.current;
      if (sub.text && now - sub.at < 3500) {
        g.font = "bold 26px sans-serif";
        g.textAlign = "center";
        const text = sub.text.length > 34 ? `…${sub.text.slice(-34)}` : sub.text;
        const w = g.measureText(text).width + 36;
        g.fillStyle = "rgba(0,0,0,0.7)";
        g.beginPath();
        g.roundRect(WIDTH * 0.36 - w / 2, HEIGHT - 104, w, 46, 10);
        g.fill();
        g.fillStyle = "#fde047";
        g.fillText(text, WIDTH * 0.36, HEIGHT - 80);
      }

      // 제목(아래)
      g.textAlign = "left";
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(0, HEIGHT - 44, WIDTH, 44);
      g.fillStyle = "#fff";
      g.font = "bold 20px sans-serif";
      g.fillText(`${categoryRef.current.emoji} ${titleRef.current}`.slice(0, 40), 20, HEIGHT - 22);
      g.textAlign = "right";
      g.font = "16px sans-serif";
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillText(`구독자 ${formatCount(channelRef.current.subs + s.newSubs)}명`, WIDTH - 20, HEIGHT - 22);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [camStatus, phase]);

  // ── 1초마다: 시청자·좋아요·구독·채팅 계산 ──
  const endLiveRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const cat = categoryRef.current;
      const acc = voiceSumRef.current;
      const ch = channelRef.current;
      const voice = acc.n > 0 ? Math.min(1, (acc.sum / acc.n) * 12 * (has(ch, "mic") ? 1.5 : 1)) : 0;
      const loud = acc.loud > 3;
      voiceSumRef.current = { sum: 0, n: 0, loud: 0 };
      const motion = camStatus === "on" ? Math.min(1, motionRef.current * (has(ch, "camera") ? 1.5 : 1)) : Math.min(1, voice * 0.6);
      const burst = burstRef.current;
      burstRef.current *= 0.6;

      const energy = Math.min(1, cat.talk * voice + cat.move * motion + burst);
      const s = statsRef.current;
      // 방을 꾸미면 분위기가 천천히 식는다
      const keep = has(ch, "deco") ? 0.88 : 0.75;
      const hype = s.hype * keep + energy * (1 - keep);
      const elapsedMs = performance.now() - startAtRef.current;

      // 배가 고프면 힘없는 방송이 되어 팬이 떠난다.
      const fullness = Math.max(0, s.fullness - HUNGER_PER_SECOND * (has(ch, "chair") ? 0.6 : 1));
      const hungerFactor = fullness >= HUNGRY_LINE ? 1 : fullness > 0 ? 0.4 + fullness / 50 : 0.15;

      // 구독자가 많을수록, 지금까지 본 사람이 많을수록(유명할수록), 분위기가 좋을수록 시청자가 몰린다.
      const fame =
        5 +
        Math.sqrt(channelRef.current.subs + s.newSubs) * 3 +
        Math.pow(channelRef.current.totalViewers + s.cumViewers, 0.7) * 0.15;
      const target =
        fame * (0.3 + hype * 2.2) * (1 + Math.min(elapsedMs / 120000, 1.5)) * hungerFactor * (has(ch, "light") ? 1.25 : 1) +
        comboBoostRef.current;
      comboBoostRef.current *= 0.97;
      const viewers = Math.max(1, Math.round(s.viewers + (target - s.viewers) * 0.25 + (Math.random() - 0.5) * Math.max(2, target * 0.05)));
      const cumViewers = s.cumViewers + Math.max(0, viewers - s.viewers) + Math.round(viewers * VIEWER_TURNOVER);
      const likes = s.likes + Math.round(viewers * hype * 0.04 * Math.random());
      const newSubs = s.newSubs + (Math.random() < hype ? Math.round(viewers * hype * 0.012 * Math.random()) + (hype > 0.3 ? 1 : 0) : 0);
      let money = s.money;

      // 채팅: 시청자와 분위기에 따라 개수가 달라진다.
      const chatCount = Math.min(3, Math.floor((viewers / 40) * (0.3 + hype) + Math.random() * 1.2));
      for (let i = 0; i < chatCount; i++) {
        const r = Math.random();
        const text = hype < 0.12 ? pick(BORED_CHATS) : r < 0.65 ? pick(cat.chats) : pick(COMMON_CHATS);
        addChat(text);
      }
      if (loud) addChat(pick(LOUD_CHATS));
      if (hype < 0.08 && Math.random() < 0.4) addChat(pick(BORED_CHATS));
      if (fullness <= 0 && Math.random() < 0.5) addChat(pick(LEAVING_CHATS));
      else if (fullness < HUNGRY_LINE && Math.random() < 0.3) addChat(pick(HUNGRY_CHATS));
      // 먹는 중이면 먹방 채팅
      const eating = eatingRef.current;
      if (eating && Math.random() < 0.8) addChat(pick(eating.food.chats));
      // 슈퍼챗(후원)
      if (has(ch, "mic") && voice > 0.3 && Math.random() < 0.08) addChat(pick(["마이크 바꿨어요? 목소리 완전 좋아요", "음질 대박", "목소리 꿀보이스"]));
      if (Math.random() < hype * 0.08 * Math.min(1, viewers / 30) * (has(ch, "pc") ? 2 : 1)) {
        const amount = pick([1000, 1000, 2000, 5000, 10000]);
        money += amount;
        addChat(pick(["최고예요!", "응원해요!!", "과자 사드세요", "계속 방송해주세요"]), amount);
      }
      // 분위기가 좋으면 시청자가 하트를 누른다
      const hearts = Math.floor(hype * 4 * Math.random());
      for (let i = 0; i < hearts; i++) addHeart(pick(["❤️", "💖", "👍", "🔥"]));

      statsRef.current = {
        viewers,
        peakViewers: Math.max(s.peakViewers, viewers),
        likes: likes + hearts,
        newSubs,
        money,
        hype,
        elapsedMs,
        fullness,
        cumViewers,
        spent: s.spent,
      };
      setStats(statsRef.current);
      if (elapsedMs >= MAX_LIVE_MS) endLiveRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [addChat, addHeart, camStatus, phase]);

  // ── 내 목소리를 알아듣고 시청자가 반응 ──
  const onSpoken = useCallback(
    (text: string) => {
      subtitleRef.current = { text, at: performance.now() };
      // "치킨 먹을래요" 처럼 음식 이름과 "먹"이 같이 들리면 그 음식을 먹는다
      const said = FOODS.find((f) => text.includes(f.name));
      if (said && text.includes("먹")) eatRef.current(said);
      const reaction = reactTo(text);
      burstRef.current = Math.min(1, burstRef.current + reaction.hype);
      // 사람이 읽고 치는 시간만큼 조금씩 늦게 올라온다
      // 헤드셋이 있으면 시청자가 한 명 더 대답한다
      if (has(channelRef.current, "headset")) reaction.replies.push(pick(["ㅇㅇ 맞아요!", "와 대답해줬다!!", "저도요!", "ㅋㅋㅋ 공감"]));
      reaction.replies.forEach((reply, i) =>
        setTimeout(() => {
          if (liveRef.current) addChat(reply);
        }, 600 + i * 700 + Math.random() * 500),
      );
      if (reaction.subs) {
        const s = statsRef.current;
        const gained = Math.max(1, Math.round(s.viewers * (0.03 + s.hype * 0.05)));
        statsRef.current = { ...s, newSubs: s.newSubs + gained };
        setStats(statsRef.current);
      }
      if (reaction.likes) for (let i = 0; i < 6; i++) setTimeout(() => liveRef.current && addHeart("👍"), i * 120);
      // 한 문장 말할 때마다 몇 명은 채팅 대신 하트를 누른다
      addHeart();
    },
    [addChat, addHeart],
  );

  // ── 방송 시작 / 종료 ──
  const startLive = useCallback(async () => {
    await openMedia();
    statsRef.current = { ...EMPTY_STATS, viewers: 1 };
    chatsRef.current = [];
    heartsRef.current = [];
    prevFrameRef.current = null;
    setStats(statsRef.current);
    setChats([]);
    setLastVideo(null);
    setSaveState("idle");
    startAtRef.current = performance.now();
    subtitleRef.current = { text: "", at: 0 };
    liveRef.current = true;
    setPhase("live");
    startSpeech({
      onInterim: (text) => {
        if (text) subtitleRef.current = { text, at: performance.now() };
      },
      onFinal: onSpoken,
    });
    addChat("방송 시작했다!! 🎉", 0, "📢 알림");
  }, [addChat, onSpoken, openMedia, startSpeech]);

  // 캔버스가 화면에 붙은 뒤 녹화를 시작한다(캔버스 화면 + 마이크 소리).
  useEffect(() => {
    if (phase !== "live" || recorderRef.current) return;
    const canvas = canvasRef.current;
    const mimeType = pickMimeType();
    if (!canvas || typeof MediaRecorder === "undefined" || !canvas.captureStream) return;
    const out = canvas.captureStream(30);
    streamRef.current?.getAudioTracks().forEach((t) => out.addTrack(t));
    const recorder = new MediaRecorder(out, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : undefined);
    recChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recChunksRef.current.push(e.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
  }, [phase]);

  const endLive = useCallback(() => {
    const s = statsRef.current;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    liveRef.current = false;
    eatingRef.current = null;
    recentFoodsRef.current = [];
    comboShowRef.current = null;
    comboBoostRef.current = 0;
    setEatingId(null);
    stopSpeech();
    const newChannel: Channel = {
      subs: channelRef.current.subs + s.newSubs,
      money: Math.max(0, channelRef.current.money + s.money - s.spent),
      broadcasts: channelRef.current.broadcasts + 1,
      totalViewers: channelRef.current.totalViewers + s.cumViewers,
      items: channelRef.current.items,
    };
    setChannel(newChannel);
    saveChannel(newChannel);
    setStats(s);
    setPhase("result");

    const finish = (blob: Blob | null) => {
      closeMedia();
      if (!blob || blob.size === 0) {
        setSaveState("unsupported");
        return;
      }
      const video: SavedVideo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        title: titleRef.current,
        categoryEmoji: categoryRef.current.emoji,
        durationMs: s.elapsedMs,
        peakViewers: s.peakViewers,
        likes: s.likes,
        newSubs: s.newSubs,
        video: blob,
      };
      setSaveState("saving");
      saveVideo(video)
        .then(() => {
          setLastVideo(video);
          setSaveState("saved");
          setVideos((list) => (list ? [video, ...list] : list));
        })
        .catch((err: unknown) => {
          console.warn("영상을 저장하지 못했어요", err);
          setLastVideo(video); // 저장은 못 했어도 지금 한 번은 볼 수 있게
          setSaveState("failed");
        });
    };

    if (!recorder || recorder.state === "inactive") {
      finish(null);
      return;
    }
    recorder.onstop = () => finish(new Blob(recChunksRef.current, { type: recorder.mimeType || "video/webm" }));
    recorder.stop();
  }, [closeMedia, stopSpeech]);

  useEffect(() => {
    endLiveRef.current = endLive;
  }, [endLive]);

  // ── 방송 중 행동 ──
  const greet = useCallback(() => {
    burstRef.current = Math.min(1, burstRef.current + 0.5);
    addChat("안녕하세요 여러분~!! 👋", 0, "⭐ 나");
    for (let i = 0; i < 3; i++) setTimeout(() => addChat(pick(["안녕하세요!!", "ㅎㅇㅎㅇ", "반가워요~", "하이하이"])), 300 + i * 400);
  }, [addChat]);

  /** 음식을 사서 먹는다. 후원금 + 모아 둔 돈으로 산다. */
  const eat = useCallback(
    (food: Food) => {
      const s = statsRef.current;
      const wallet = channelRef.current.money + s.money - s.spent;
      const price = foodPrice(channelRef.current, food);
      if (eatingRef.current || wallet < price) return;
      eatingRef.current = { food, start: performance.now() };
      setEatingId(food.id);
      statsRef.current = { ...s, spent: s.spent + price, fullness: Math.min(100, s.fullness + food.fill) };
      setStats(statsRef.current);
      burstRef.current = Math.min(1, burstRef.current + food.hype);
      addChat(`${food.emoji} ${food.name} 먹을게요! 잘 먹겠습니다~`, 0, "⭐ 나");

      // 합체: 짝이 되는 음식을 최근에 먹었으면 특별 요리가 되어 시청자·구독자가 확 몰려온다
      const at = performance.now();
      const recent = recentFoodsRef.current.filter((r) => at - r.at < COMBO_WINDOW_MS);
      const combo = COMBOS.find((c) => {
        const other = c.foods[0] === food.id ? c.foods[1] : c.foods[1] === food.id ? c.foods[0] : null;
        return other !== null && recent.some((r) => r.id === other);
      });
      if (combo) {
        recentFoodsRef.current = []; // 같은 음식으로 두 번 합체하지 않도록 비운다
        comboShowRef.current = { combo, start: at };
        comboBoostRef.current += COMBO_BONUS;
        const cur = statsRef.current;
        statsRef.current = {
          ...cur,
          viewers: cur.viewers + COMBO_BONUS,
          peakViewers: Math.max(cur.peakViewers, cur.viewers + COMBO_BONUS),
          cumViewers: cur.cumViewers + COMBO_BONUS,
          newSubs: cur.newSubs + COMBO_BONUS,
        };
        setStats(statsRef.current);
        burstRef.current = 1;
        addChat(`${combo.emoji} ${combo.name} 합체!! 시청자·구독자 +1만`, 0, "📢 알림");
        for (let i = 0; i < 6; i++)
          setTimeout(() => liveRef.current && addChat(pick(["와 합체했다!!!", "대박 레시피", "구독했어요!!", "소문 듣고 왔어요", "실검 1위 ㄷㄷ", "이 조합 미쳤다"])), 400 + i * 300);
        for (let i = 0; i < 12; i++) setTimeout(() => liveRef.current && addHeart(pick([combo.emoji, "🎉", "✨", "❤️"])), i * 120);
      } else {
        recentFoodsRef.current = [...recent, { id: food.id, at }];
      }
      for (let i = 0; i < 3; i++) setTimeout(() => liveRef.current && addHeart(food.emoji), 300 + i * 250);
      setTimeout(() => {
        if (eatingRef.current?.food.id !== food.id) return;
        eatingRef.current = null;
        setEatingId(null);
        if (liveRef.current) addChat(pick(["다 먹었다!!", "완뚝 ㄷㄷ", "잘 먹네요 ㅋㅋ", "맛있었어요?"]));
      }, food.eatMs);
    },
    [addChat, addHeart],
  );

  useEffect(() => {
    eatRef.current = eat;
  }, [eat]);

  const askSubscribe = useCallback(() => {
    burstRef.current = Math.min(1, burstRef.current + 0.3);
    addChat("구독 좋아요 알림설정 부탁해요! 🔔", 0, "⭐ 나");
    const s = statsRef.current;
    const gained = Math.max(1, Math.round(s.viewers * (0.02 + s.hype * 0.05)));
    statsRef.current = { ...s, newSubs: s.newSubs + gained };
    setStats(statsRef.current);
    setTimeout(() => addChat(`구독했어요!! (+${gained}명)`), 500);
  }, [addChat]);

  const quiz = useCallback(() => {
    burstRef.current = Math.min(1, burstRef.current + 0.7);
    addChat("🎁 퀴즈 이벤트! 맞히면 선물 드려요!", 0, "⭐ 나");
    for (let i = 0; i < 4; i++) setTimeout(() => addChat(pick(["저요저요!!", "정답 3번!", "선물 주세요 ㅠㅠ", "와 이벤트다", "제가 맞힐래요"])), 300 + i * 350);
  }, [addChat]);

  // ── 영상 보관함 ──
  const openLibrary = useCallback(async () => {
    try {
      setVideos(await listVideos());
    } catch {
      setVideos([]);
    }
  }, []);

  const watch = useCallback((v: SavedVideo) => {
    setWatchUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(v.video);
    });
    setWatching(v);
  }, []);

  const closeWatch = useCallback(() => {
    setWatchUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setWatching(null);
  }, []);

  const download = useCallback((v: SavedVideo) => {
    const url = URL.createObjectURL(v.video);
    const a = document.createElement("a");
    const ext = v.video.type.includes("mp4") ? "mp4" : "webm";
    a.href = url;
    a.download = `라이브_${new Date(v.at).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const remove = useCallback(
    async (v: SavedVideo) => {
      if (watching?.id === v.id) closeWatch();
      await deleteVideo(v.id);
      setVideos((list) => list?.filter((x) => x.id !== v.id) ?? null);
    },
    [closeWatch, watching],
  );

  const buyItem = useCallback((id: ItemId) => {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    const current = channelRef.current;
    if (!item || has(current, id) || current.money < item.price) return;
    const next: Channel = { ...current, money: current.money - item.price, items: [...current.items, id] };
    channelRef.current = next;
    setChannel(next);
    saveChannel(next);
  }, []);

  const award = awardFor(channel.totalViewers);
  const next = nextAward(channel.totalViewers);
  const wallet = channel.money + stats.money - stats.spent;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white">
      {/* 위쪽 바 */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-3">
          {phase !== "live" && (
            <Link href="/" className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
              ← 홈
            </Link>
          )}
          <span className="text-xl font-black">
            <span className="rounded-md bg-red-600 px-1.5">▶</span> 나도 유튜버
          </span>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold">
            {award ? `${award.emoji} ` : ""}구독자 {formatCount(channel.subs + (phase === "live" ? stats.newSubs : 0))}명
          </div>
          <div className="text-xs text-white/50">
            👁 누적 {formatCount(channel.totalViewers + (phase === "live" ? stats.cumViewers : 0))}명 · 💰{" "}
            {(phase === "live" ? wallet : channel.money).toLocaleString()}원 · 방송 {channel.broadcasts}회
          </div>
        </div>
      </div>

      {/* ── 방송 준비 ── */}
      {phase === "setup" && (
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
          <h1 className="text-center text-3xl font-black sm:text-4xl">🔴 라이브 방송 준비</h1>

          <label className="block">
            <span className="text-sm text-white/60">방송 제목</span>
            <input
              value={title}
              maxLength={30}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>

          <div>
            <span className="text-sm text-white/60">방송 종류</span>
            <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`rounded-xl p-3 text-center ${categoryId === c.id ? "bg-red-600 font-bold" : "bg-white/10 hover:bg-white/20"}`}
                >
                  <div className="text-3xl">{c.emoji}</div>
                  <div className="text-sm">{c.label}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-white/50">
              {category.talk >= 0.6
                ? "💬 이 방송은 말을 많이 할수록 시청자가 좋아해요"
                : category.move >= 0.6
                  ? "🕺 이 방송은 많이 움직일수록 시청자가 좋아해요"
                  : "💬🕺 말도 하고 움직여야 시청자가 좋아해요"}
            </p>
          </div>

          <button
            onClick={() => void startLive()}
            disabled={camStatus === "asking" || !title.trim()}
            className="rounded-2xl bg-red-600 py-5 text-2xl font-black shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {camStatus === "asking" ? "카메라 허락을 기다리는 중…" : "🔴 라이브 시작"}
          </button>
          {camStatus === "denied" && (
            <p className="text-center text-sm text-amber-300">
              카메라·마이크를 쓸 수 없어서 캐릭터 방송으로 시작해요. 주소창 옆 🔒 에서 허용하면 내 얼굴로 방송할 수 있어요.
            </p>
          )}
          <p className="text-center text-xs text-white/40">
            방송은 진짜 인터넷에 나가지 않아요. 시청자와 채팅은 게임 속 가상 시청자이고, 녹화 영상은 이 기기에만 저장돼요.
            단, 목소리 인식은 브라우저(크롬은 구글)가 내 말을 글자로 바꾸는 데 쓰여요.
          </p>

          <div className="rounded-2xl bg-white/5 p-4">
            <div className="mb-2 text-sm text-white/60">
              🏆 유튜버 버튼 (누적 시청자 {formatCount(channel.totalViewers)}명)
              {next ? ` · 다음 ${next.emoji} ${next.label}까지 ${formatCount(next.viewers - channel.totalViewers)}명` : " · 전부 모았어요!"}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AWARDS.map((a) => {
                const got = channel.totalViewers >= a.viewers;
                return (
                  <div
                    key={a.viewers}
                    className={`rounded-xl p-3 text-center ${got ? "bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-900" : "bg-white/5 text-white/40"}`}
                  >
                    <div className={`text-4xl ${got ? "" : "opacity-40 grayscale"}`}>{a.emoji}</div>
                    <div className="font-bold">{a.label}</div>
                    <div className="text-xs">시청자 {formatCount(a.viewers)}명</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-white/40">
              방송 중에 배가 고프면 팬이 떠나요. 음식을 눌러 먹거나 &quot;라면 먹을게요&quot;처럼 말해서 먹으며 방송하세요!
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold">🛒 방송 장비 가게</span>
              <span className="text-sm text-amber-300">💰 {channel.money.toLocaleString()}원</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHOP_ITEMS.map((item) => {
                const owned = has(channel, item.id);
                const canBuy = !owned && channel.money >= item.price;
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-xl p-3 ${owned ? "bg-emerald-500/15" : "bg-white/5"}`}>
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-white/60">{item.effect}</div>
                    </div>
                    {owned ? (
                      <span className="text-sm font-bold text-emerald-300">✅ 보유</span>
                    ) : (
                      <button
                        onClick={() => buyItem(item.id)}
                        disabled={!canBuy}
                        className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-zinc-900 disabled:bg-white/10 disabled:text-white/40"
                      >
                        {item.price.toLocaleString()}원
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-white/40">후원금은 방송이 끝나면 모여요. 방송 중엔 음식을, 방송 전엔 장비를 사세요!</p>
          </div>

          <VideoLibrary
            videos={videos}
            onOpen={() => void openLibrary()}
            onWatch={watch}
            onDownload={download}
            onDelete={(v) => void remove(v)}
          />
        </div>
      )}

      {/* ── 방송 중 ── */}
      {phase === "live" && (
        <div className="mx-auto flex max-w-6xl flex-col gap-3 p-3">
          <div
            className="relative w-full cursor-pointer overflow-hidden rounded-xl bg-black"
            onClick={() => {
              addHeart();
              // 카메라·마이크가 없어도 화면을 눌러 분위기를 띄울 수 있다
              burstRef.current = Math.min(1, burstRef.current + 0.08);
            }}
            title="화면을 누르면 하트!"
          >
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block h-auto w-full" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={greet} className="rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
                👋 인사하기
              </button>
              <button onClick={askSubscribe} className="rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
                🔔 구독 부탁
              </button>
              <button onClick={quiz} className="rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
                🎁 퀴즈 이벤트
              </button>
            </div>
            <button onClick={endLive} className="rounded-xl bg-red-600 px-5 py-2 font-black hover:bg-red-500">
              ⏹ 방송 종료
            </button>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className={stats.fullness < HUNGRY_LINE ? "font-bold text-red-300" : "text-white/70"}>
                🍚 배부름 {Math.round(stats.fullness)}% {stats.fullness < HUNGRY_LINE && "— 배고파요! 안 먹으면 팬이 떠나요"}
              </span>
              <span className="text-amber-300">
                {channel.items.length > 0 && (
                  <span className="mr-2" title="사용 중인 방송 장비">
                    {SHOP_ITEMS.filter((i) => has(channel, i.id))
                      .map((i) => i.emoji)
                      .join("")}
                  </span>
                )}
                💰 {wallet.toLocaleString()}원
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FOODS.map((f) => {
                const price = foodPrice(channel, f);
                const canBuy = wallet >= price && eatingId === null;
                return (
                  <button
                    key={f.id}
                    onClick={() => eat(f)}
                    disabled={!canBuy}
                    className={`rounded-xl p-2 text-center transition-transform disabled:opacity-35 ${
                      eatingId === f.id ? "bg-amber-500" : "bg-white/10 hover:scale-105 hover:bg-white/20"
                    }`}
                  >
                    <div className="text-3xl">{f.emoji}</div>
                    <div className="text-sm font-bold">{f.name}</div>
                    <div className="text-xs text-white/60">{price === 0 ? "공짜" : `${price.toLocaleString()}원`}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="font-bold text-amber-300">🔥 합체 레시피 (20초 안에 둘 다 먹기 → 시청자·구독자 +1만)</span>
              {COMBOS.map((c) => (
                <span key={c.name} className="rounded-full bg-white/10 px-2 py-0.5">
                  {c.foods.map((id) => FOODS.find((f) => f.id === id)?.emoji).join("+")}={c.emoji} {c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5">
            <Stat label="👁 시청자" value={formatCount(stats.viewers)} />
            <Stat label="📈 최고 시청자" value={formatCount(stats.peakViewers)} />
            <Stat label="❤️ 좋아요" value={formatCount(stats.likes)} />
            <Stat label="➕ 새 구독자" value={formatCount(stats.newSubs)} />
            <Stat label="💰 후원" value={`${stats.money.toLocaleString()}원`} />
          </div>
          <p
            className={`text-center text-sm ${speech.status === "on" ? "text-emerald-300" : "text-amber-300"}`}
          >
            {speech.status === "on" && "🗣️ 목소리 인식 중 — 말하면 자막이 뜨고 시청자가 대답해요 (인사·질문·구독·좋아요·게임·음식…)"}
            {speech.status === "unsupported" && "이 브라우저는 목소리 인식이 안 돼요. 크롬에서 하면 시청자가 내 말에 대답해요."}
            {speech.status === "denied" && "마이크 허락이 없어서 목소리 인식을 못 해요."}
            {speech.status === "off" && "목소리 인식 준비 중…"}
          </p>
          <p className="text-center text-xs text-white/40">
            {camStatus === "on" ? "말하고 움직이면 분위기가 올라가요" : "말을 하면 캐릭터가 들썩이고 분위기가 올라가요"} · 화면을 누르면 하트 · 녹화 중 🔴 (최대 10분)
          </p>
          {/* 채팅이 스크린 리더에도 읽히도록 텍스트로도 둔다 */}
          <ul className="sr-only" aria-live="polite">
            {chats.slice(-3).map((c) => (
              <li key={c.id}>
                {c.name}: {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 방송 결과 ── */}
      {phase === "result" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-8 text-center">
          <h1 className="text-3xl font-black">📺 방송 끝! 수고했어요</h1>
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="⏱ 방송 시간" value={clock(stats.elapsedMs)} />
            <Stat label="📈 최고 시청자" value={`${formatCount(stats.peakViewers)}명`} />
            <Stat label="❤️ 좋아요" value={formatCount(stats.likes)} />
            <Stat label="➕ 새 구독자" value={`${formatCount(stats.newSubs)}명`} />
            <Stat label="💰 후원" value={`${stats.money.toLocaleString()}원`} />
            <Stat label="👥 총 구독자" value={`${formatCount(channel.subs)}명`} />
            <Stat label="👁 이번 방송 시청자" value={`${formatCount(stats.cumViewers)}명`} />
            <Stat label="🌍 누적 시청자" value={`${formatCount(channel.totalViewers)}명`} />
            <Stat label="🍽️ 음식값" value={`${stats.spent.toLocaleString()}원`} />
          </div>
          {award && channel.totalViewers - stats.cumViewers < award.viewers && (
            <div className="rounded-2xl bg-amber-400 px-6 py-4 text-xl font-black text-zinc-900">
              🎉 {award.emoji} {award.label} 받았어요!
            </div>
          )}

          <div className="w-full rounded-2xl bg-white/5 p-4">
            <div className="mb-2 font-bold">🎬 녹화 영상</div>
            {saveState === "saving" && <p className="text-white/60">영상 저장 중…</p>}
            {saveState === "unsupported" && <p className="text-amber-300">이 브라우저는 방송 녹화를 지원하지 않아요. (크롬을 쓰면 녹화돼요)</p>}
            {saveState === "failed" && <p className="text-amber-300">⚠️ 보관함에 저장하지 못했어요. 지금 내려받아 두세요.</p>}
            {saveState === "saved" && <p className="text-emerald-300">✅ 영상 보관함에 저장했어요</p>}
            {lastVideo && (
              <div className="mt-3 flex justify-center gap-2">
                <button onClick={() => watch(lastVideo)} className="rounded-xl bg-red-600 px-5 py-2 font-bold">
                  ▶ 다시 보기
                </button>
                <button onClick={() => download(lastVideo)} className="rounded-xl bg-white/10 px-5 py-2 font-bold">
                  ⬇️ 내려받기
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setPhase("setup")} className="rounded-2xl bg-white/10 px-8 py-3 text-lg font-bold hover:bg-white/20">
            🔴 다음 방송 준비
          </button>
        </div>
      )}

      {/* ── 영상 보기 창 ── */}
      {watching && watchUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={closeWatch}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-bold">
                {watching.categoryEmoji} {watching.title}
              </div>
              <button onClick={closeWatch} className="rounded-full bg-white/15 px-3 py-1 text-sm">
                ✕ 닫기
              </button>
            </div>
            <video src={watchUrl} controls autoPlay playsInline className="w-full rounded-xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}

function VideoLibrary({
  videos,
  onOpen,
  onWatch,
  onDownload,
  onDelete,
}: {
  videos: SavedVideo[] | null;
  onOpen: () => void;
  onWatch: (v: SavedVideo) => void;
  onDownload: (v: SavedVideo) => void;
  onDelete: (v: SavedVideo) => void;
}) {
  if (videos === null) {
    return (
      <button onClick={onOpen} className="rounded-2xl bg-white/10 py-3 font-bold hover:bg-white/20">
        🎬 내 방송 영상 보관함 열기
      </button>
    );
  }
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="mb-3 font-bold">🎬 내 방송 영상 ({videos.length}개)</div>
      {videos.length === 0 && <p className="text-sm text-white/50">아직 녹화한 방송이 없어요. 라이브를 시작하면 자동으로 녹화돼요.</p>}
      <ul className="space-y-2">
        {videos.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="text-3xl">{v.categoryEmoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{v.title}</div>
              <div className="text-xs text-white/50">
                {new Date(v.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} ·{" "}
                {clock(v.durationMs)} · 👁 {formatCount(v.peakViewers)} · ❤️ {formatCount(v.likes)} · +{formatCount(v.newSubs)}구독
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onWatch(v)} className="rounded-lg bg-red-600 px-3 py-1.5 font-bold">
                ▶ 보기
              </button>
              <button onClick={() => onDownload(v)} className="rounded-lg bg-white/10 px-3 py-1.5" title="내려받기">
                ⬇️
              </button>
              <button onClick={() => onDelete(v)} className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-red-500/40" title="삭제">
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
