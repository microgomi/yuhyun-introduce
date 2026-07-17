"use client";
import { useState, useCallback } from "react";
import Link from "next/link";

/* ───── 동물 종류 ───── */
interface AnimalType {
  id: string;
  name: string;
  emoji: string;
  basePatience: number;
}

const ANIMALS: AnimalType[] = [
  { id: "dog", name: "강아지", emoji: "🐶", basePatience: 5 },
  { id: "cat", name: "고양이", emoji: "🐱", basePatience: 3 },
  { id: "rabbit", name: "토끼", emoji: "🐰", basePatience: 4 },
  { id: "hamster", name: "햄스터", emoji: "🐹", basePatience: 3 },
  { id: "bird", name: "새", emoji: "🐦", basePatience: 2 },
  { id: "turtle", name: "거북이", emoji: "🐢", basePatience: 8 },
];

/* ───── 질병 ───── */
interface Illness {
  id: string;
  name: string;
  emoji: string;
  correctTreatment: string;
  difficulty: number;
  symptoms: string[];
}

const ILLNESSES: Illness[] = [
  { id: "fever", name: "고열", emoji: "🌡️", correctTreatment: "medicine", difficulty: 1, symptoms: ["체온이 높아요", "축 처져 있어요", "물을 많이 마셔요"] },
  { id: "broken_bone", name: "뼈 골절", emoji: "🦴", correctTreatment: "bandage", difficulty: 3, symptoms: ["다리를 절뚝거려요", "만지면 아파해요", "부어올랐어요"] },
  { id: "stomachache", name: "배탈", emoji: "🤢", correctTreatment: "special_food", difficulty: 1, symptoms: ["밥을 안 먹어요", "배가 부풀었어요", "구토를 해요"] },
  { id: "cold", name: "감기", emoji: "🤧", correctTreatment: "medicine", difficulty: 1, symptoms: ["재채기를 해요", "콧물이 나와요", "기침을 해요"] },
  { id: "skin_rash", name: "피부 발진", emoji: "🔴", correctTreatment: "medicine", difficulty: 2, symptoms: ["피부가 빨개졌어요", "계속 긁어요", "털이 빠져요"] },
  { id: "wound", name: "깊은 상처", emoji: "🩹", correctTreatment: "surgery", difficulty: 4, symptoms: ["피가 나요", "상처가 깊어요", "움직이기 힘들어해요"] },
  { id: "fatigue", name: "극심한 피로", emoji: "😴", correctTreatment: "rest", difficulty: 1, symptoms: ["계속 자요", "놀지 않아요", "기운이 없어요"] },
  { id: "infection", name: "감염", emoji: "🦠", correctTreatment: "surgery", difficulty: 3, symptoms: ["상처 주변이 곪았어요", "열이 나요", "냄새가 나요"] },
  { id: "allergy", name: "알레르기", emoji: "😖", correctTreatment: "medicine", difficulty: 2, symptoms: ["눈이 부었어요", "계속 긁어요", "발진이 생겼어요"] },
  { id: "malnutrition", name: "영양실조", emoji: "😢", correctTreatment: "special_food", difficulty: 2, symptoms: ["너무 말랐어요", "털에 윤기가 없어요", "기운이 없어요"] },
];

/* ───── 치료법 ───── */
interface Treatment {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

const TREATMENTS: Treatment[] = [
  { id: "medicine", name: "약 처방", emoji: "💊", cost: 30 },
  { id: "bandage", name: "붕대 감기", emoji: "🩹", cost: 50 },
  { id: "surgery", name: "수술", emoji: "🔪", cost: 150 },
  { id: "rest", name: "안정 & 휴식", emoji: "🛏️", cost: 20 },
  { id: "special_food", name: "특수 사료", emoji: "🍖", cost: 40 },
];

/* ───── 환자(동물) ───── */
interface Patient {
  id: number;
  animal: AnimalType;
  illness: Illness;
  ownerName: string;
  petName: string;
  recovery: number; // 0~100
  treated: boolean;
  treatmentCorrect: boolean | null;
  waitingSince: number;
}

/* ───── 업그레이드 ───── */
interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  effect: string;
}

const UPGRADES: Upgrade[] = [
  { id: "xray", name: "엑스레이 기계", emoji: "📡", desc: "진단 정확도 UP", cost: 500, effect: "진단 시 증상을 더 자세히 볼 수 있어요" },
  { id: "room2", name: "진료실 추가", emoji: "🏠", desc: "대기 시간 감소", cost: 800, effect: "하루에 더 많은 환자를 볼 수 있어요" },
  { id: "assistant", name: "간호 보조사", emoji: "👩‍⚕️", desc: "치료비 할인", cost: 1000, effect: "치료 비용이 20% 줄어들어요" },
  { id: "garden", name: "힐링 정원", emoji: "🌿", desc: "회복 속도 UP", cost: 600, effect: "동물들이 더 빨리 회복해요" },
  { id: "lab", name: "검사실", emoji: "🔬", desc: "정확한 진단", cost: 1200, effect: "질병 이름이 바로 표시돼요" },
];

const OWNER_NAMES = ["민준이네", "서연이네", "지호네", "하은이네", "도윤이네", "수아네", "시우네", "지유네", "준서네", "예은이네"];
const PET_NAMES = ["뭉치", "초코", "보리", "콩이", "달이", "솜이", "구름이", "별이", "하루", "모모", "두부", "호두"];

type Screen = "menu" | "waiting" | "examine" | "treat" | "recovery" | "upgrade" | "dayEnd";

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let nextId = 1;
function generatePatient(day: number): Patient {
  const animal = randomPick(ANIMALS);
  const maxDiff = Math.min(1 + Math.floor(day / 3), 4);
  const possible = ILLNESSES.filter((i) => i.difficulty <= maxDiff);
  const illness = randomPick(possible);
  return {
    id: nextId++,
    animal,
    illness,
    ownerName: randomPick(OWNER_NAMES),
    petName: randomPick(PET_NAMES),
    recovery: 0,
    treated: false,
    treatmentCorrect: null,
    waitingSince: 0,
  };
}

export default function HospitalGame() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [day, setDay] = useState(1);
  const [money, setMoney] = useState(200);
  const [reputation, setReputation] = useState(50);
  const [waitingRoom, setWaitingRoom] = useState<Patient[]>([]);
  const [recoveryWard, setRecoveryWard] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [examined, setExamined] = useState(false);
  const [message, setMessage] = useState("");
  const [patientsToday, setPatientsToday] = useState(0);
  const [maxPatientsPerDay, setMaxPatientsPerDay] = useState(5);
  const [ownedUpgrades, setOwnedUpgrades] = useState<string[]>([]);
  const [dayStats, setDayStats] = useState({ treated: 0, correct: 0, earned: 0 });
  const [showSymptomDetail, setShowSymptomDetail] = useState(false);

  const hasUpgrade = useCallback((id: string) => ownedUpgrades.includes(id), [ownedUpgrades]);
  const costMultiplier = hasUpgrade("assistant") ? 0.8 : 1;
  const recoveryBonus = hasUpgrade("garden") ? 20 : 0;

  /* ───── 새 하루 시작 ───── */
  const startDay = useCallback(() => {
    const count = Math.min(3 + Math.floor(day / 2), hasUpgrade("room2") ? 8 : 6);
    const patients: Patient[] = [];
    for (let i = 0; i < count; i++) patients.push(generatePatient(day));
    setWaitingRoom(patients);
    setPatientsToday(0);
    setMaxPatientsPerDay(count);
    setDayStats({ treated: 0, correct: 0, earned: 0 });
    setScreen("waiting");
    setMessage("");
  }, [day, hasUpgrade]);

  /* ───── 환자 선택 ───── */
  const selectPatient = useCallback((p: Patient) => {
    setCurrentPatient(p);
    setExamined(false);
    setShowSymptomDetail(false);
    setScreen("examine");
    setMessage("");
  }, []);

  /* ───── 진찰 ───── */
  const examine = useCallback(() => {
    setExamined(true);
    setShowSymptomDetail(false);
    if (hasUpgrade("lab") && currentPatient) {
      setMessage(`진단 결과: ${currentPatient.illness.emoji} ${currentPatient.illness.name}`);
    } else {
      setMessage("진찰을 완료했어요! 증상을 보고 치료법을 선택하세요.");
    }
  }, [currentPatient, hasUpgrade]);

  /* ───── 치료 선택 ───── */
  const applyTreatment = useCallback((treatmentId: string) => {
    if (!currentPatient) return;
    const treatment = TREATMENTS.find((t) => t.id === treatmentId)!;
    const cost = Math.floor(treatment.cost * costMultiplier);
    const correct = currentPatient.illness.correctTreatment === treatmentId;
    const reward = correct ? 80 + currentPatient.illness.difficulty * 40 : 20;
    const repChange = correct ? 5 + currentPatient.illness.difficulty * 2 : -3;
    const recoveryStart = correct ? 50 + recoveryBonus : 15;

    const updated: Patient = {
      ...currentPatient,
      treated: true,
      treatmentCorrect: correct,
      recovery: Math.min(recoveryStart, 100),
    };

    setMoney((m) => m - cost + reward);
    setReputation((r) => Math.max(0, Math.min(100, r + repChange)));
    setRecoveryWard((w) => [...w, updated]);
    setWaitingRoom((w) => w.filter((p) => p.id !== currentPatient.id));
    setPatientsToday((n) => n + 1);
    setDayStats((s) => ({
      treated: s.treated + 1,
      correct: s.correct + (correct ? 1 : 0),
      earned: s.earned + reward - cost,
    }));

    if (correct) {
      setMessage(`✅ 정확한 치료! ${updated.petName}(이)가 좋아하고 있어요! (+${reward}원)`);
    } else {
      setMessage(`⚠️ 효과가 약해요... 하지만 조금은 나아졌어요. (+${reward}원)`);
    }
    setCurrentPatient(null);
    setScreen("waiting");
  }, [currentPatient, costMultiplier, recoveryBonus]);

  /* ───── 회복 확인 ───── */
  const checkRecovery = useCallback(() => {
    setRecoveryWard((ward) =>
      ward.map((p) => ({
        ...p,
        recovery: Math.min(100, p.recovery + (p.treatmentCorrect ? 20 + recoveryBonus : 8)),
      }))
    );
    setScreen("recovery");
  }, [recoveryBonus]);

  /* ───── 퇴원 ───── */
  const discharge = useCallback((id: number) => {
    const p = recoveryWard.find((p) => p.id === id);
    if (!p || p.recovery < 100) return;
    setRecoveryWard((w) => w.filter((p) => p.id !== id));
    const bonus = 50;
    setMoney((m) => m + bonus);
    setReputation((r) => Math.min(100, r + 3));
    setMessage(`🎉 ${p.petName}(이)가 완전히 나았어요! 보호자가 감사 인사를 했어요! (+${bonus}원)`);
  }, [recoveryWard]);

  /* ───── 하루 끝 ───── */
  const endDay = useCallback(() => {
    // recover ward patients overnight
    setRecoveryWard((ward) =>
      ward.map((p) => ({
        ...p,
        recovery: Math.min(100, p.recovery + (p.treatmentCorrect ? 15 : 5)),
      }))
    );
    setScreen("dayEnd");
  }, []);

  const nextDay = useCallback(() => {
    setDay((d) => d + 1);
    setScreen("waiting");
    // generate new patients
    const newDay = day + 1;
    const count = Math.min(3 + Math.floor(newDay / 2), hasUpgrade("room2") ? 8 : 6);
    const patients: Patient[] = [];
    for (let i = 0; i < count; i++) patients.push(generatePatient(newDay));
    setWaitingRoom(patients);
    setPatientsToday(0);
    setMaxPatientsPerDay(count);
    setDayStats({ treated: 0, correct: 0, earned: 0 });
    setMessage("새로운 하루가 시작됐어요! 🌅");
  }, [day, hasUpgrade]);

  /* ───── 업그레이드 구매 ───── */
  const buyUpgrade = useCallback((upg: Upgrade) => {
    if (money < upg.cost || ownedUpgrades.includes(upg.id)) return;
    setMoney((m) => m - upg.cost);
    setOwnedUpgrades((o) => [...o, upg.id]);
    setMessage(`🎊 ${upg.name} 구매 완료! ${upg.effect}`);
  }, [money, ownedUpgrades]);

  /* ───── 상단 바 ───── */
  const TopBar = () => (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-pink-100 rounded-xl p-3 mb-4">
      <Link href="/" className="text-pink-600 font-bold hover:text-pink-800 text-sm">🏠 홈으로</Link>
      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        <span>📅 {day}일차</span>
        <span>💰 {money}원</span>
        <span>⭐ 평판 {reputation}</span>
        <span>🏥 회복실 {recoveryWard.length}마리</span>
      </div>
    </div>
  );

  /* ═══════ 메뉴 화면 ═══════ */
  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-100 p-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-pink-600 font-bold hover:text-pink-800 text-sm">🏠 홈으로</Link>
          <div className="text-center mt-6 mb-8">
            <div className="text-6xl mb-4">🏥</div>
            <h1 className="text-3xl font-black text-pink-700 mb-2">동물 병원</h1>
            <p className="text-pink-500 text-lg">아픈 동물 친구들을 치료해주세요!</p>
            <div className="flex justify-center gap-3 text-3xl mt-4 animate-bounce">
              <span>🐶</span><span>🐱</span><span>🐰</span><span>🐹</span><span>🐦</span><span>🐢</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <h2 className="font-bold text-pink-700 mb-3 text-lg">🩺 게임 방법</h2>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>🔍 아픈 동물을 진찰하고 증상을 파악하세요</li>
              <li>💊 알맞은 치료법을 선택하세요</li>
              <li>💗 동물이 회복될 때까지 돌봐주세요</li>
              <li>💰 돈을 모아 병원을 업그레이드하세요</li>
              <li>⭐ 평판을 높여 유명한 수의사가 되세요!</li>
            </ul>
          </div>
          <button
            onClick={startDay}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black text-xl py-4 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            🩺 진료 시작하기!
          </button>
        </div>
      </div>
    );
  }

  /* ═══════ 대기실 ═══════ */
  if (screen === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-100 p-4">
        <div className="max-w-lg mx-auto">
          <TopBar />
          {message && (
            <div className="bg-white rounded-xl p-3 mb-4 text-center text-sm font-semibold text-pink-700 shadow">
              {message}
            </div>
          )}
          <h2 className="text-xl font-black text-pink-700 mb-3">🪑 대기실 ({waitingRoom.length}마리)</h2>
          {waitingRoom.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow">
              <p className="text-2xl mb-2">✨</p>
              <p className="text-gray-600 font-semibold">오늘 대기 환자를 모두 봤어요!</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {waitingRoom.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full bg-white hover:bg-pink-50 rounded-xl p-4 shadow flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  <span className="text-3xl">{p.animal.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="font-bold text-gray-800">{p.petName} <span className="text-xs text-gray-400">({p.animal.name})</span></p>
                    <p className="text-xs text-gray-500">보호자: {p.ownerName}</p>
                  </div>
                  <span className="text-pink-400 font-bold text-sm">진찰하기 →</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={checkRecovery} className="flex-1 bg-green-400 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all">
              💗 회복실 확인 ({recoveryWard.length})
            </button>
            <button onClick={() => setScreen("upgrade")} className="flex-1 bg-purple-400 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all">
              🔧 업그레이드
            </button>
          </div>
          {waitingRoom.length === 0 && (
            <button onClick={endDay} className="w-full mt-3 bg-orange-400 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all">
              🌙 하루 마무리
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ═══════ 진찰실 ═══════ */
  if (screen === "examine" && currentPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-100 p-4">
        <div className="max-w-lg mx-auto">
          <TopBar />
          <div className="bg-white rounded-2xl p-5 shadow-lg mb-4">
            <div className="text-center mb-4">
              <span className="text-5xl">{currentPatient.animal.emoji}</span>
              <h2 className="text-xl font-black text-pink-700 mt-2">{currentPatient.petName}</h2>
              <p className="text-sm text-gray-500">{currentPatient.animal.name} · 보호자: {currentPatient.ownerName}</p>
            </div>

            {!examined ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">보호자: &quot;우리 {currentPatient.petName}(이)가 아파요... 😢&quot;</p>
                <button
                  onClick={examine}
                  className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all active:scale-95"
                >
                  🔍 진찰하기
                </button>
              </div>
            ) : (
              <div>
                {message && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3 text-center text-sm font-semibold text-blue-700">
                    {message}
                  </div>
                )}
                <h3 className="font-bold text-gray-700 mb-2">📋 증상</h3>
                <div className="space-y-1 mb-4">
                  {currentPatient.illness.symptoms.map((s, i) => (
                    <div key={i} className="bg-red-50 rounded-lg px-3 py-2 text-sm text-red-700">
                      • {s}
                    </div>
                  ))}
                </div>
                {hasUpgrade("xray") && (
                  <button
                    onClick={() => setShowSymptomDetail(!showSymptomDetail)}
                    className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-2 rounded-lg mb-3 text-sm transition-all"
                  >
                    📡 엑스레이 촬영 {showSymptomDetail ? "(닫기)" : ""}
                  </button>
                )}
                {showSymptomDetail && (
                  <div className="bg-indigo-50 rounded-lg p-3 mb-3 text-sm text-indigo-800">
                    상세 분석: 이 증상은 <span className="font-bold">{currentPatient.illness.name}</span>과(와) 매우 유사합니다.
                  </div>
                )}
                <h3 className="font-bold text-gray-700 mb-2">💉 치료법 선택</h3>
                <div className="grid grid-cols-1 gap-2">
                  {TREATMENTS.map((t) => {
                    const cost = Math.floor(t.cost * costMultiplier);
                    return (
                      <button
                        key={t.id}
                        onClick={() => applyTreatment(t.id)}
                        disabled={money < cost}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                          money < cost
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-pink-50 hover:bg-pink-100 text-gray-800"
                        }`}
                      >
                        <span className="text-2xl">{t.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold">{t.name}</p>
                        </div>
                        <span className="text-sm font-semibold text-pink-600">-{cost}원</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => { setCurrentPatient(null); setScreen("waiting"); setMessage(""); }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 rounded-xl transition-all"
          >
            ← 대기실로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ═══════ 회복실 ═══════ */
  if (screen === "recovery") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 p-4">
        <div className="max-w-lg mx-auto">
          <TopBar />
          {message && (
            <div className="bg-white rounded-xl p-3 mb-4 text-center text-sm font-semibold text-green-700 shadow">
              {message}
            </div>
          )}
          <h2 className="text-xl font-black text-green-700 mb-3">💗 회복실 ({recoveryWard.length}마리)</h2>
          {recoveryWard.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow">
              <p className="text-2xl mb-2">🏥</p>
              <p className="text-gray-600 font-semibold">회복실이 비어있어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recoveryWard.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{p.animal.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{p.petName} <span className="text-xs text-gray-400">({p.animal.name})</span></p>
                      <p className="text-xs text-gray-500">{p.illness.emoji} {p.illness.name} · {p.treatmentCorrect ? "✅ 정확한 치료" : "⚠️ 부분 치료"}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        p.recovery >= 100 ? "bg-green-400" : p.recovery >= 60 ? "bg-yellow-400" : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(p.recovery, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">회복도 {Math.min(p.recovery, 100)}%</span>
                    {p.recovery >= 100 ? (
                      <button
                        onClick={() => discharge(p.id)}
                        className="bg-green-400 hover:bg-green-500 text-white font-bold py-1 px-4 rounded-lg text-sm transition-all"
                      >
                        🎉 퇴원!
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">치료 중...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => { setScreen("waiting"); setMessage(""); }}
            className="w-full mt-4 bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            ← 대기실로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ═══════ 업그레이드 ═══════ */
  if (screen === "upgrade") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 p-4">
        <div className="max-w-lg mx-auto">
          <TopBar />
          {message && (
            <div className="bg-white rounded-xl p-3 mb-4 text-center text-sm font-semibold text-purple-700 shadow">
              {message}
            </div>
          )}
          <h2 className="text-xl font-black text-purple-700 mb-3">🔧 병원 업그레이드</h2>
          <div className="space-y-3">
            {UPGRADES.map((upg) => {
              const owned = ownedUpgrades.includes(upg.id);
              const canBuy = money >= upg.cost && !owned;
              return (
                <div key={upg.id} className={`bg-white rounded-xl p-4 shadow ${owned ? "ring-2 ring-purple-300" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{upg.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{upg.name}</p>
                      <p className="text-xs text-gray-500">{upg.desc}</p>
                      <p className="text-xs text-purple-500 mt-1">{upg.effect}</p>
                    </div>
                    {owned ? (
                      <span className="bg-purple-100 text-purple-600 font-bold py-1 px-3 rounded-lg text-sm">보유중 ✓</span>
                    ) : (
                      <button
                        onClick={() => buyUpgrade(upg)}
                        disabled={!canBuy}
                        className={`font-bold py-2 px-4 rounded-lg text-sm transition-all ${
                          canBuy
                            ? "bg-purple-400 hover:bg-purple-500 text-white active:scale-95"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {upg.cost}원
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { setScreen("waiting"); setMessage(""); }}
            className="w-full mt-4 bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            ← 대기실로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ═══════ 하루 마무리 ═══════ */
  if (screen === "dayEnd") {
    const grade = dayStats.correct === dayStats.treated && dayStats.treated > 0
      ? "S" : dayStats.correct >= dayStats.treated * 0.8 ? "A"
      : dayStats.correct >= dayStats.treated * 0.5 ? "B" : "C";
    const gradeColor = grade === "S" ? "text-yellow-500" : grade === "A" ? "text-green-500" : grade === "B" ? "text-blue-500" : "text-gray-500";
    const gradeEmoji = grade === "S" ? "🏆" : grade === "A" ? "🌟" : grade === "B" ? "👍" : "📚";

    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-100 p-4">
        <div className="max-w-lg mx-auto">
          <TopBar />
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <p className="text-4xl mb-2">🌙</p>
            <h2 className="text-2xl font-black text-orange-700 mb-4">{day}일차 마무리</h2>
            <div className="space-y-3 text-left bg-orange-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">진료한 환자</span>
                <span className="font-bold">{dayStats.treated}마리</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">정확한 치료</span>
                <span className="font-bold text-green-600">{dayStats.correct}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">오늘 수입</span>
                <span className={`font-bold ${dayStats.earned >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {dayStats.earned >= 0 ? "+" : ""}{dayStats.earned}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">회복실 환자</span>
                <span className="font-bold">{recoveryWard.length}마리</span>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">오늘의 등급</p>
              <p className={`text-5xl font-black ${gradeColor}`}>{gradeEmoji} {grade}</p>
            </div>
            {reputation >= 90 && day >= 10 && (
              <div className="bg-yellow-100 rounded-xl p-4 mb-4">
                <p className="text-lg font-black text-yellow-700">🎊 축하합니다!</p>
                <p className="text-sm text-yellow-600">당신은 최고의 수의사가 되었어요!</p>
              </div>
            )}
            <button
              onClick={nextDay}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-black text-lg py-4 rounded-2xl transition-all active:scale-95"
            >
              🌅 다음 날 시작! ({day + 1}일차)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ fallback ═══════ */
  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <button onClick={() => setScreen("menu")} className="bg-pink-400 text-white font-bold py-3 px-8 rounded-xl">
        메뉴로 돌아가기
      </button>
    </div>
  );
}
