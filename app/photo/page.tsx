"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
type Screen = "menu" | "sceneSelect" | "playing" | "photoResult" | "album" | "missions";
type FilterType = "없음" | "흑백" | "세피아" | "비비드" | "레트로";

interface Subject {
  id: string;
  emoji: string;
  name: string;
  rarity: number; // 1=common, 2=uncommon, 3=rare
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  specialMoment?: boolean; // is it doing something special right now?
  momentTimer?: number;
  visible: boolean;
}

interface Scene {
  id: string;
  name: string;
  emoji: string;
  bgGradient: string;
  bgElements: string[];
  subjects: { emoji: string; name: string; rarity: number }[];
  rareEvents: { emoji: string; name: string; rarity: number }[];
}

interface Photo {
  id: number;
  sceneId: string;
  sceneName: string;
  subjects: { emoji: string; name: string; rarity: number; inFrame: boolean; centered: boolean }[];
  filter: FilterType;
  compositionScore: number;
  timingScore: number;
  rarityScore: number;
  totalScore: number;
  stars: number;
  timestamp: number;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  check: (photos: Photo[]) => boolean;
}

// --- Constants ---
const SCENES: Scene[] = [
  {
    id: "park",
    name: "공원",
    emoji: "🌳",
    bgGradient: "from-green-200 via-green-100 to-sky-200",
    bgElements: ["🌳", "🌸", "🪺", "🌻", "⛲"],
    subjects: [
      { emoji: "🐿️", name: "다람쥐", rarity: 1 },
      { emoji: "🐦", name: "참새", rarity: 1 },
      { emoji: "🦋", name: "나비", rarity: 1 },
      { emoji: "🐕", name: "강아지", rarity: 1 },
      { emoji: "👧", name: "아이", rarity: 1 },
      { emoji: "🦢", name: "백조", rarity: 2 },
      { emoji: "🦊", name: "여우", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "🌈", name: "무지개", rarity: 3 },
      { emoji: "🦄", name: "유니콘", rarity: 3 },
    ],
  },
  {
    id: "beach",
    name: "바다",
    emoji: "🏖️",
    bgGradient: "from-sky-300 via-cyan-200 to-yellow-100",
    bgElements: ["🌊", "🐚", "🏖️", "⛱️", "🪸"],
    subjects: [
      { emoji: "🦀", name: "게", rarity: 1 },
      { emoji: "🐬", name: "돌고래", rarity: 1 },
      { emoji: "🦅", name: "갈매기", rarity: 1 },
      { emoji: "🏄", name: "서퍼", rarity: 1 },
      { emoji: "🐢", name: "거북이", rarity: 2 },
      { emoji: "🐙", name: "문어", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "🐋", name: "고래", rarity: 3 },
      { emoji: "🌅", name: "일몰", rarity: 3 },
    ],
  },
  {
    id: "city",
    name: "도시",
    emoji: "🏙️",
    bgGradient: "from-slate-300 via-blue-200 to-indigo-200",
    bgElements: ["🏢", "🏬", "🗼", "🌆", "🚦"],
    subjects: [
      { emoji: "🚗", name: "자동차", rarity: 1 },
      { emoji: "🚌", name: "버스", rarity: 1 },
      { emoji: "🛴", name: "킥보드", rarity: 1 },
      { emoji: "🐈", name: "고양이", rarity: 1 },
      { emoji: "🎤", name: "거리공연", rarity: 2 },
      { emoji: "🦝", name: "너구리", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "☄️", name: "유성", rarity: 3 },
      { emoji: "🛸", name: "UFO", rarity: 3 },
    ],
  },
  {
    id: "forest",
    name: "숲",
    emoji: "🌲",
    bgGradient: "from-green-400 via-emerald-300 to-green-200",
    bgElements: ["🌲", "🍄", "🌿", "🪨", "🌾"],
    subjects: [
      { emoji: "🦌", name: "사슴", rarity: 1 },
      { emoji: "🐰", name: "토끼", rarity: 1 },
      { emoji: "🦉", name: "부엉이", rarity: 1 },
      { emoji: "🐿️", name: "다람쥐", rarity: 1 },
      { emoji: "🦡", name: "오소리", rarity: 2 },
      { emoji: "🐻", name: "곰", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "🧚", name: "요정", rarity: 3 },
      { emoji: "🌈", name: "쌍무지개", rarity: 3 },
    ],
  },
  {
    id: "amusement",
    name: "놀이공원",
    emoji: "🎢",
    bgGradient: "from-pink-200 via-purple-200 to-yellow-200",
    bgElements: ["🎢", "🎡", "🎪", "🎠", "🎈"],
    subjects: [
      { emoji: "🤡", name: "광대", rarity: 1 },
      { emoji: "🎈", name: "풍선", rarity: 1 },
      { emoji: "👨‍👩‍👧", name: "가족", rarity: 1 },
      { emoji: "🍿", name: "팝콘", rarity: 1 },
      { emoji: "🎭", name: "마스코트", rarity: 2 },
      { emoji: "🧙", name: "마술사", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "🎆", name: "불꽃놀이", rarity: 3 },
      { emoji: "✨", name: "마법의 순간", rarity: 3 },
    ],
  },
  {
    id: "sky",
    name: "하늘",
    emoji: "🌅",
    bgGradient: "from-orange-200 via-pink-200 to-purple-300",
    bgElements: ["☁️", "🌤️", "✈️", "🎐", "🪁"],
    subjects: [
      { emoji: "🦅", name: "독수리", rarity: 1 },
      { emoji: "🎈", name: "열기구", rarity: 1 },
      { emoji: "✈️", name: "비행기", rarity: 1 },
      { emoji: "🪁", name: "연", rarity: 1 },
      { emoji: "🦩", name: "플라밍고", rarity: 2 },
      { emoji: "🐉", name: "용", rarity: 2 },
    ],
    rareEvents: [
      { emoji: "🌠", name: "오로라", rarity: 3 },
      { emoji: "☄️", name: "유성우", rarity: 3 },
    ],
  },
];

const FILTERS: { name: FilterType; style: string; label: string }[] = [
  { name: "없음", style: "", label: "원본" },
  { name: "흑백", style: "grayscale(100%)", label: "흑백" },
  { name: "세피아", style: "sepia(80%)", label: "세피아" },
  { name: "비비드", style: "saturate(200%) contrast(120%)", label: "비비드" },
  { name: "레트로", style: "sepia(30%) hue-rotate(-20deg) brightness(90%)", label: "레트로" },
];

const MISSIONS: Mission[] = [
  {
    id: "sunset",
    title: "일몰 찍기 🌅",
    description: "바다에서 일몰을 촬영하세요",
    completed: false,
    check: (photos) => photos.some((p) => p.sceneId === "beach" && p.subjects.some((s) => s.name === "일몰" && s.inFrame)),
  },
  {
    id: "three_animals",
    title: "동물 3마리 한 프레임 📷",
    description: "동물 3마리를 한 장에 담으세요",
    completed: false,
    check: (photos) =>
      photos.some((p) => {
        const animalEmojis = ["🐿️", "🐦", "🦋", "🐕", "🦢", "🦊", "🦀", "🐬", "🦅", "🐢", "🐙", "🐋", "🐈", "🦌", "🐰", "🦉", "🦡", "🐻", "🐉", "🦩", "🦝"];
        const animalsInFrame = p.subjects.filter((s) => s.inFrame && animalEmojis.includes(s.emoji));
        return animalsInFrame.length >= 3;
      }),
  },
  {
    id: "rare_shot",
    title: "희귀 순간 포착 ⭐",
    description: "희귀도 3의 피사체를 촬영하세요",
    completed: false,
    check: (photos) => photos.some((p) => p.subjects.some((s) => s.rarity === 3 && s.inFrame)),
  },
  {
    id: "perfect_photo",
    title: "완벽한 사진 📸",
    description: "별 3개짜리 사진을 찍으세요",
    completed: false,
    check: (photos) => photos.some((p) => p.stars === 3),
  },
  {
    id: "all_scenes",
    title: "세계 여행자 🌍",
    description: "모든 장소에서 사진을 찍으세요",
    completed: false,
    check: (photos) => {
      const scenes = new Set(photos.map((p) => p.sceneId));
      return SCENES.every((s) => scenes.has(s.id));
    },
  },
  {
    id: "collector",
    title: "사진 수집가 🖼️",
    description: "사진 10장을 모으세요",
    completed: false,
    check: (photos) => photos.length >= 10,
  },
];

let photoIdCounter = 0;

export default function PhotoPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [zoom, setZoom] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterType>("없음");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lastPhoto, setLastPhoto] = useState<Photo | null>(null);
  const [missions, setMissions] = useState<Mission[]>(MISSIONS.map((m) => ({ ...m })));
  const [flashEffect, setFlashEffect] = useState(false);
  const [shutterReady, setShutterReady] = useState(true);
  const [gameTime, setGameTime] = useState(60);
  const [photoCount, setPhotoCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [newMissionComplete, setNewMissionComplete] = useState<string | null>(null);

  const subjectsRef = useRef<Subject[]>([]);
  const animFrameRef = useRef<number>(0);
  const gameTimerRef = useRef<ReturnType<typeof setInterval>>();
  const areaRef = useRef<HTMLDivElement>(null);

  const AREA_W = 600;
  const AREA_H = 400;
  const VIEWFINDER_W = 220;
  const VIEWFINDER_H = 160;

  // --- Subject spawning and movement ---
  const spawnSubjects = useCallback((scene: Scene) => {
    const subs: Subject[] = [];
    // Spawn 4-6 normal subjects
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const template = scene.subjects[Math.floor(Math.random() * scene.subjects.length)];
      subs.push(createSubject(template, `sub_${i}`));
    }
    subjectsRef.current = subs;
    setSubjects([...subs]);
  }, []);

  const createSubject = (template: { emoji: string; name: string; rarity: number }, id: string): Subject => {
    const speed = 0.3 + Math.random() * 0.8;
    const angle = Math.random() * Math.PI * 2;
    return {
      id,
      emoji: template.emoji,
      name: template.name,
      rarity: template.rarity,
      x: 50 + Math.random() * (AREA_W - 100),
      y: 50 + Math.random() * (AREA_H - 100),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: template.rarity === 3 ? 40 : template.rarity === 2 ? 34 : 28,
      specialMoment: false,
      momentTimer: 0,
      visible: true,
    };
  };

  // Animation loop
  const updateSubjects = useCallback(() => {
    const subs = subjectsRef.current;
    for (const s of subs) {
      s.x += s.vx;
      s.y += s.vy;

      // Bounce off walls with some padding
      if (s.x < 10 || s.x > AREA_W - 10) {
        s.vx *= -1;
        s.x = Math.max(10, Math.min(AREA_W - 10, s.x));
      }
      if (s.y < 10 || s.y > AREA_H - 10) {
        s.vy *= -1;
        s.y = Math.max(10, Math.min(AREA_H - 10, s.y));
      }

      // Occasionally change direction
      if (Math.random() < 0.008) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.8;
        s.vx = Math.cos(angle) * speed;
        s.vy = Math.sin(angle) * speed;
      }

      // Special moment handling
      if (s.momentTimer && s.momentTimer > 0) {
        s.momentTimer--;
        if (s.momentTimer <= 0) {
          s.specialMoment = false;
        }
      } else if (Math.random() < 0.003) {
        s.specialMoment = true;
        s.momentTimer = 90; // ~1.5 seconds at 60fps
        s.vx = 0;
        s.vy = 0;
      }
    }
    setSubjects([...subs]);
    animFrameRef.current = requestAnimationFrame(updateSubjects);
  }, []);

  // Rare event spawner
  useEffect(() => {
    if (screen !== "playing" || !selectedScene) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.15 && selectedScene) {
        const rare = selectedScene.rareEvents[Math.floor(Math.random() * selectedScene.rareEvents.length)];
        const newSub = createSubject(rare, `rare_${Date.now()}`);
        // Rare subjects move slower and appear from edges
        newSub.vx *= 0.5;
        newSub.vy *= 0.5;
        newSub.x = Math.random() > 0.5 ? 20 : AREA_W - 20;
        subjectsRef.current.push(newSub);
        // Remove after a few seconds
        setTimeout(() => {
          subjectsRef.current = subjectsRef.current.filter((s) => s.id !== newSub.id);
        }, 5000);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [screen, selectedScene]);

  // Start game
  const startGame = (scene: Scene) => {
    setSelectedScene(scene);
    setGameTime(60);
    setPhotoCount(0);
    setTotalScore(0);
    setActiveFilter("없음");
    setZoom(1);
    spawnSubjects(scene);
    setScreen("playing");
  };

  // Start animation
  useEffect(() => {
    if (screen === "playing") {
      animFrameRef.current = requestAnimationFrame(updateSubjects);
      gameTimerRef.current = setInterval(() => {
        setGameTime((prev) => {
          if (prev <= 1) {
            setScreen("album");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [screen, updateSubjects]);

  // Take photo
  const takePhoto = () => {
    if (!shutterReady || !selectedScene) return;
    setShutterReady(false);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);
    setTimeout(() => setShutterReady(true), 800);

    const vfLeft = (AREA_W - VIEWFINDER_W * zoom) / 2;
    const vfTop = (AREA_H - VIEWFINDER_H * zoom) / 2;
    const vfRight = vfLeft + VIEWFINDER_W * zoom;
    const vfBottom = vfTop + VIEWFINDER_H * zoom;
    const vfCenterX = AREA_W / 2;
    const vfCenterY = AREA_H / 2;

    const capturedSubjects = subjects.map((s) => {
      const inFrame = s.x >= vfLeft && s.x <= vfRight && s.y >= vfTop && s.y <= vfBottom;
      const distFromCenter = Math.sqrt((s.x - vfCenterX) ** 2 + (s.y - vfCenterY) ** 2);
      const maxDist = Math.sqrt((VIEWFINDER_W / 2) ** 2 + (VIEWFINDER_H / 2) ** 2);
      const centered = inFrame && distFromCenter < maxDist * 0.4;
      return { emoji: s.emoji, name: s.name, rarity: s.rarity, inFrame, centered };
    });

    const inFrameSubjects = capturedSubjects.filter((s) => s.inFrame);
    const centeredSubjects = capturedSubjects.filter((s) => s.centered);

    // Composition score: how well framed
    let compositionScore = 0;
    if (inFrameSubjects.length > 0) {
      compositionScore = Math.min(100, (centeredSubjects.length / inFrameSubjects.length) * 70 + inFrameSubjects.length * 10);
    }

    // Timing score: special moments captured
    const specialInFrame = subjects.filter(
      (s) => s.specialMoment && s.x >= vfLeft && s.x <= vfRight && s.y >= vfTop && s.y <= vfBottom
    );
    let timingScore = inFrameSubjects.length > 0 ? 30 : 0;
    timingScore += specialInFrame.length * 30;
    timingScore = Math.min(100, timingScore);

    // Rarity score
    const maxRarity = inFrameSubjects.reduce((max, s) => Math.max(max, s.rarity), 0);
    let rarityScore = maxRarity * 33;
    if (inFrameSubjects.some((s) => s.rarity === 3)) rarityScore = 100;

    const total = Math.round(compositionScore * 0.35 + timingScore * 0.35 + rarityScore * 0.3);
    const stars = total >= 80 ? 3 : total >= 50 ? 2 : total > 0 ? 1 : 0;

    const photo: Photo = {
      id: ++photoIdCounter,
      sceneId: selectedScene.id,
      sceneName: selectedScene.name,
      subjects: capturedSubjects,
      filter: activeFilter,
      compositionScore: Math.round(compositionScore),
      timingScore: Math.round(timingScore),
      rarityScore: Math.round(rarityScore),
      totalScore: total,
      stars,
      timestamp: Date.now(),
    };

    setPhotos((prev) => [...prev, photo]);
    setLastPhoto(photo);
    setPhotoCount((c) => c + 1);
    setTotalScore((t) => t + total);
    setScreen("photoResult");

    // Check missions
    const updatedPhotos = [...photos, photo];
    const updatedMissions = missions.map((m) => {
      if (!m.completed && m.check(updatedPhotos)) {
        setNewMissionComplete(m.title);
        setTimeout(() => setNewMissionComplete(null), 3000);
        return { ...m, completed: true };
      }
      return m;
    });
    setMissions(updatedMissions);
  };

  // --- Render helpers ---
  const renderStars = (count: number) => {
    return "⭐".repeat(count) + "☆".repeat(3 - count);
  };

  const getFilterStyle = (): string => {
    const f = FILTERS.find((fl) => fl.name === activeFilter);
    return f?.style || "";
  };

  // --- Screens ---

  // Menu
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center text-sky-600 hover:text-sky-800 mb-6 text-lg font-medium transition-colors">
            ← 홈으로
          </Link>
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">📸</div>
            <h1 className="text-4xl font-black text-sky-800 mb-2">사진 찍기</h1>
            <p className="text-sky-600 text-lg">멋진 사진을 찍어보세요!</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setScreen("sceneSelect")}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
            >
              📷 촬영 시작
            </button>
            <button
              onClick={() => setScreen("album")}
              className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
            >
              🖼️ 사진 앨범 ({photos.length}장)
            </button>
            <button
              onClick={() => setScreen("missions")}
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
            >
              🎯 미션 ({missions.filter((m) => m.completed).length}/{missions.length})
            </button>
          </div>
          {photos.length > 0 && (
            <div className="mt-6 bg-white/80 rounded-2xl p-4 text-center shadow">
              <p className="text-sky-700 font-bold">총 촬영: {photos.length}장</p>
              <p className="text-amber-600 font-bold">
                최고 점수: {Math.max(...photos.map((p) => p.totalScore))}점 {renderStars(Math.max(...photos.map((p) => p.stars)))}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Scene Select
  if (screen === "sceneSelect") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          <button onClick={() => setScreen("menu")} className="inline-flex items-center text-sky-600 hover:text-sky-800 mb-4 text-lg font-medium transition-colors">
            ← 메뉴로
          </button>
          <h2 className="text-2xl font-black text-sky-800 text-center mb-6">📍 촬영 장소 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            {SCENES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => startGame(scene)}
                className={`bg-gradient-to-br ${scene.bgGradient} p-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 text-center`}
              >
                <div className="text-4xl mb-2">{scene.emoji}</div>
                <div className="font-bold text-gray-800 text-lg">{scene.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {scene.subjects.length + scene.rareEvents.length}종 피사체
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Playing
  if (screen === "playing" && selectedScene) {
    const vfW = VIEWFINDER_W / zoom;
    const vfH = VIEWFINDER_H / zoom;
    const vfLeft = (AREA_W - VIEWFINDER_W) / 2;
    const vfTop = (AREA_H - VIEWFINDER_H) / 2;

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center">
        {/* Flash overlay */}
        {flashEffect && (
          <div className="fixed inset-0 bg-white z-50 animate-pulse pointer-events-none" style={{ animationDuration: "0.15s" }} />
        )}

        {/* Mission complete toast */}
        {newMissionComplete && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full font-bold shadow-xl animate-bounce">
            🎯 미션 완료! {newMissionComplete}
          </div>
        )}

        {/* Top HUD */}
        <div className="w-full max-w-2xl flex items-center justify-between p-3 text-white">
          <button onClick={() => setScreen("menu")} className="text-white/80 hover:text-white text-sm font-medium px-3 py-1 bg-white/10 rounded-full">
            ✕ 나가기
          </button>
          <div className="flex items-center gap-3">
            <span className="bg-white/10 px-3 py-1 rounded-full text-sm">📍 {selectedScene.name}</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-sm">📷 {photoCount}장</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${gameTime <= 10 ? "bg-red-500 animate-pulse" : "bg-white/10"}`}>
            ⏱️ {gameTime}초
          </div>
        </div>

        {/* Scene Area */}
        <div className="relative overflow-hidden rounded-xl shadow-2xl border-2 border-gray-700" style={{ width: AREA_W, height: AREA_H }}>
          {/* Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${selectedScene.bgGradient}`}
            style={{ filter: getFilterStyle(), transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            {/* Background elements */}
            {selectedScene.bgElements.map((el, i) => (
              <div
                key={i}
                className="absolute text-2xl opacity-30 select-none"
                style={{
                  left: `${10 + (i * 20) % 80}%`,
                  top: `${15 + ((i * 30) % 60)}%`,
                }}
              >
                {el}
              </div>
            ))}

            {/* Subjects */}
            {subjects.map((s) => (
              <div
                key={s.id}
                className={`absolute select-none transition-none ${s.specialMoment ? "animate-pulse" : ""}`}
                style={{
                  left: s.x - s.size / 2,
                  top: s.y - s.size / 2,
                  fontSize: s.size,
                  lineHeight: 1,
                  textShadow: s.rarity === 3 ? "0 0 10px gold, 0 0 20px gold" : s.rarity === 2 ? "0 0 6px silver" : "none",
                }}
              >
                {s.emoji}
                {s.specialMoment && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs">✨</div>
                )}
              </div>
            ))}
          </div>

          {/* Viewfinder overlay - darkens outside */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top dark */}
            <div className="absolute top-0 left-0 right-0 bg-black/40" style={{ height: vfTop }} />
            {/* Bottom dark */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40" style={{ height: AREA_H - vfTop - VIEWFINDER_H }} />
            {/* Left dark */}
            <div className="absolute bg-black/40" style={{ top: vfTop, left: 0, width: vfLeft, height: VIEWFINDER_H }} />
            {/* Right dark */}
            <div className="absolute bg-black/40" style={{ top: vfTop, right: 0, width: AREA_W - vfLeft - VIEWFINDER_W, height: VIEWFINDER_H }} />

            {/* Viewfinder border */}
            <div
              className="absolute border-2 border-white rounded"
              style={{ left: vfLeft, top: vfTop, width: VIEWFINDER_W, height: VIEWFINDER_H }}
            >
              {/* Corner brackets */}
              <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-yellow-400 rounded-tl" />
              <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-yellow-400 rounded-tr" />
              <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-yellow-400 rounded-bl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-yellow-400 rounded-br" />
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/50" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-white/50" />
              </div>
              {/* Rule of thirds lines */}
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/20" />
              <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/20" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-2xl p-3 space-y-3">
          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-4">
            <span className="text-white/60 text-xs">🔍</span>
            <input
              type="range"
              min="0.6"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            <span className="text-white/60 text-xs font-mono">{zoom.toFixed(1)}x</span>
          </div>

          {/* Filters */}
          <div className="flex gap-2 justify-center">
            {FILTERS.map((f) => (
              <button
                key={f.name}
                onClick={() => setActiveFilter(f.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeFilter === f.name
                    ? "bg-yellow-400 text-gray-900 scale-110"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Shutter button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={takePhoto}
              disabled={!shutterReady}
              className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                shutterReady
                  ? "bg-red-500 hover:bg-red-400 hover:scale-110 active:scale-90 shadow-lg shadow-red-500/50"
                  : "bg-gray-500 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-red-400 border-2 border-red-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Photo Result
  if (screen === "photoResult" && lastPhoto && selectedScene) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Photo card */}
          <div className="bg-white rounded-2xl p-3 shadow-2xl mb-6 transform animate-[fadeInUp_0.5s_ease-out]">
            {/* Photo preview */}
            <div
              className={`relative bg-gradient-to-b ${selectedScene.bgGradient} rounded-xl h-48 overflow-hidden mb-3`}
              style={{ filter: FILTERS.find((f) => f.name === lastPhoto.filter)?.style || "" }}
            >
              {lastPhoto.subjects
                .filter((s) => s.inFrame)
                .map((s, i) => (
                  <div
                    key={i}
                    className="absolute text-3xl"
                    style={{
                      left: `${20 + (i * 25) % 60}%`,
                      top: `${20 + (i * 20) % 50}%`,
                    }}
                  >
                    {s.emoji}
                  </div>
                ))}
              {lastPhoto.subjects.filter((s) => s.inFrame).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                  (아무것도 없음...)
                </div>
              )}
              {/* Filter label */}
              {lastPhoto.filter !== "없음" && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {lastPhoto.filter}
                </div>
              )}
            </div>

            {/* Stars */}
            <div className="text-center text-3xl mb-3">{renderStars(lastPhoto.stars)}</div>

            {/* Score breakdown */}
            <div className="space-y-2 px-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">🎨 구도</span>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${lastPhoto.compositionScore}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-8 text-right">{lastPhoto.compositionScore}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">⏱️ 타이밍</span>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${lastPhoto.timingScore}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-8 text-right">{lastPhoto.timingScore}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">💎 희귀도</span>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${lastPhoto.rarityScore}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-8 text-right">{lastPhoto.rarityScore}</span>
                </div>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-800">총점</span>
                <span className="text-2xl font-black text-sky-600">{lastPhoto.totalScore}점</span>
              </div>
            </div>

            {/* Captured subjects */}
            {lastPhoto.subjects.filter((s) => s.inFrame).length > 0 && (
              <div className="mt-3 px-2">
                <p className="text-xs text-gray-500 mb-1">촬영된 피사체:</p>
                <div className="flex flex-wrap gap-1">
                  {lastPhoto.subjects
                    .filter((s) => s.inFrame)
                    .map((s, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                        s.rarity === 3 ? "bg-yellow-100 text-yellow-800" : s.rarity === 2 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                      }`}>
                        {s.emoji} {s.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setScreen("playing")}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all active:scale-95"
            >
              📷 계속 촬영 ({gameTime}초 남음)
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="w-full py-3 bg-white/10 text-white/80 font-bold rounded-xl hover:bg-white/20 transition-all"
            >
              메뉴로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Album
  if (screen === "album") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-sky-50 flex flex-col items-center p-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setScreen("menu")} className="inline-flex items-center text-sky-600 hover:text-sky-800 mb-4 text-lg font-medium transition-colors">
            ← 메뉴로
          </button>
          <h2 className="text-2xl font-black text-sky-800 text-center mb-6">🖼️ 사진 앨범</h2>

          {photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-gray-500 text-lg">아직 찍은 사진이 없어요!</p>
              <button
                onClick={() => setScreen("sceneSelect")}
                className="mt-4 px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
              >
                촬영하러 가기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats */}
              <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around text-center">
                <div>
                  <div className="text-2xl font-black text-sky-600">{photos.length}</div>
                  <div className="text-xs text-gray-500">총 사진</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-500">{Math.round(photos.reduce((s, p) => s + p.totalScore, 0) / photos.length)}</div>
                  <div className="text-xs text-gray-500">평균 점수</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-purple-500">{photos.filter((p) => p.stars === 3).length}</div>
                  <div className="text-xs text-gray-500">별 3개</div>
                </div>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 gap-3">
                {[...photos].reverse().map((photo) => {
                  const scene = SCENES.find((s) => s.id === photo.sceneId);
                  return (
                    <div key={photo.id} className="bg-white rounded-xl p-2 shadow-sm hover:shadow-md transition-shadow">
                      <div
                        className={`relative bg-gradient-to-b ${scene?.bgGradient || "from-gray-200 to-gray-300"} rounded-lg h-24 overflow-hidden mb-2`}
                        style={{ filter: FILTERS.find((f) => f.name === photo.filter)?.style || "" }}
                      >
                        {photo.subjects
                          .filter((s) => s.inFrame)
                          .slice(0, 4)
                          .map((s, i) => (
                            <div
                              key={i}
                              className="absolute text-xl"
                              style={{ left: `${15 + (i * 22) % 65}%`, top: `${15 + (i * 18) % 55}%` }}
                            >
                              {s.emoji}
                            </div>
                          ))}
                        {photo.filter !== "없음" && (
                          <div className="absolute bottom-1 right-1 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {photo.filter}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500">{scene?.emoji} {photo.sceneName}</span>
                        <span className="text-xs font-bold text-sky-600">{photo.totalScore}점</span>
                      </div>
                      <div className="text-center text-sm">{renderStars(photo.stars)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Missions
  if (screen === "missions") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-yellow-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md">
          <button onClick={() => setScreen("menu")} className="inline-flex items-center text-sky-600 hover:text-sky-800 mb-4 text-lg font-medium transition-colors">
            ← 메뉴로
          </button>
          <h2 className="text-2xl font-black text-amber-700 text-center mb-6">🎯 미션</h2>

          <div className="space-y-3">
            {missions.map((mission) => (
              <div
                key={mission.id}
                className={`p-4 rounded-2xl shadow-sm transition-all ${
                  mission.completed
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300"
                    : "bg-white border-2 border-gray-100 hover:border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{mission.title}</h3>
                    <p className="text-sm text-gray-500">{mission.description}</p>
                  </div>
                  <div className="text-2xl">{mission.completed ? "✅" : "🔲"}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-amber-700 font-bold text-lg">
              {missions.filter((m) => m.completed).length} / {missions.length} 완료
            </p>
            {missions.every((m) => m.completed) && (
              <div className="mt-4 text-2xl animate-bounce">🏆 모든 미션 완료! 축하해요! 🎉</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <button onClick={() => setScreen("menu")} className="px-6 py-3 bg-sky-500 text-white rounded-xl font-bold">
        메뉴로
      </button>
    </div>
  );
}
