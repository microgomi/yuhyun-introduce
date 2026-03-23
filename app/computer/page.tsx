"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

/* ───── 부품 정의 ───── */
interface Part {
  id: string;
  name: string;
  emoji: string;
  category: string;
  tier: number; // 1~6
  power: number;
  price: number;
  desc: string;
}

const CATEGORIES = [
  { id: "cpu", name: "CPU", emoji: "🧠" },
  { id: "gpu", name: "그래픽카드", emoji: "🎮" },
  { id: "ram", name: "램", emoji: "💾" },
  { id: "storage", name: "저장장치", emoji: "💿" },
  { id: "mainboard", name: "메인보드", emoji: "🔲" },
  { id: "case", name: "케이스", emoji: "🖥️" },
  { id: "power", name: "파워", emoji: "🔌" },
  { id: "cooler", name: "쿨러", emoji: "❄️" },
  { id: "monitor", name: "모니터", emoji: "🖥️" },
  { id: "keyboard", name: "키보드", emoji: "⌨️" },
  { id: "mouse", name: "마우스", emoji: "🖱️" },
  { id: "speaker", name: "스피커/헤드셋", emoji: "🎧" },
];

/* 가격 단위: 만원 / 성능은 벤치마크 점수 */
/* 가격 단위: 만원 / 성능은 벤치마크 점수 */
const PARTS: Part[] = [
  // CPU (실제 모델 기반)
  { id: "cpu1", name: "인텔 i3-12100F", emoji: "🧠", category: "cpu", tier: 1, power: 8, price: 8, desc: "4코어 8스레드, 입문용" },
  { id: "cpu2", name: "AMD 라이젠5 5600", emoji: "🧠", category: "cpu", tier: 2, power: 15, price: 15, desc: "6코어 12스레드, 가성비 왕" },
  { id: "cpu3", name: "인텔 i5-13600KF", emoji: "🧠", category: "cpu", tier: 3, power: 25, price: 25, desc: "14코어, 게이밍 최적화" },
  { id: "cpu4", name: "AMD 라이젠7 7800X3D", emoji: "🧠", category: "cpu", tier: 4, power: 38, price: 38, desc: "8코어 3D V-Cache, 게임 최강" },
  { id: "cpu5", name: "인텔 i9-14900K", emoji: "🧠", category: "cpu", tier: 5, power: 50, price: 55, desc: "24코어, 최고급 CPU" },
  // GPU (실제 모델 기반)
  { id: "gpu1", name: "인텔 내장 UHD 730", emoji: "📺", category: "gpu", tier: 1, power: 3, price: 0, desc: "CPU에 내장된 그래픽, 롤 정도만" },
  { id: "gpu2", name: "GTX 1650", emoji: "🎮", category: "gpu", tier: 2, power: 10, price: 15, desc: "4GB, 가벼운 게임용" },
  { id: "gpu3", name: "RTX 4060", emoji: "🎮", category: "gpu", tier: 3, power: 28, price: 35, desc: "8GB, FHD 게이밍 최적" },
  { id: "gpu4", name: "RTX 4070 Ti Super", emoji: "🎮", category: "gpu", tier: 4, power: 42, price: 70, desc: "16GB, QHD 고사양 게임" },
  { id: "gpu5", name: "RTX 4090", emoji: "🎮", category: "gpu", tier: 5, power: 60, price: 160, desc: "24GB, 4K 울트라 끝판왕" },
  // RAM (실제 규격)
  { id: "ram1", name: "DDR4 8GB 2666MHz", emoji: "💾", category: "ram", tier: 1, power: 4, price: 2, desc: "8GB 1개, 기본 사무용" },
  { id: "ram2", name: "DDR4 16GB 3200MHz", emoji: "💾", category: "ram", tier: 2, power: 8, price: 4, desc: "8GBx2 듀얼채널, 게이밍 기본" },
  { id: "ram3", name: "DDR5 32GB 5600MHz", emoji: "💾", category: "ram", tier: 3, power: 14, price: 9, desc: "16GBx2, 고성능 게이밍" },
  { id: "ram4", name: "DDR5 32GB 6400MHz", emoji: "💾", category: "ram", tier: 4, power: 18, price: 14, desc: "16GBx2 고클럭, 오버클럭용" },
  { id: "ram5", name: "DDR5 64GB 6000MHz", emoji: "💾", category: "ram", tier: 5, power: 22, price: 25, desc: "32GBx2, 작업+게이밍 만능" },
  // 저장장치 (실제 규격)
  { id: "st1", name: "HDD 1TB 7200RPM", emoji: "💿", category: "storage", tier: 1, power: 2, price: 4, desc: "느리지만 용량은 충분" },
  { id: "st2", name: "SATA SSD 500GB", emoji: "💿", category: "storage", tier: 2, power: 6, price: 5, desc: "HDD보다 5배 빠른 부팅" },
  { id: "st3", name: "NVMe SSD 1TB Gen3", emoji: "💿", category: "storage", tier: 3, power: 10, price: 8, desc: "3,500MB/s 읽기 속도" },
  { id: "st4", name: "NVMe SSD 2TB Gen4", emoji: "💿", category: "storage", tier: 4, power: 14, price: 15, desc: "7,000MB/s, 게임 로딩 1초" },
  { id: "st5", name: "NVMe SSD 4TB Gen5", emoji: "💿", category: "storage", tier: 5, power: 18, price: 40, desc: "12,000MB/s, 최신 초고속" },
  // 메인보드 (실제 칩셋)
  { id: "mb1", name: "H610 메인보드", emoji: "🔲", category: "mainboard", tier: 1, power: 3, price: 7, desc: "인텔 입문용, 기본 기능" },
  { id: "mb2", name: "B660 메인보드", emoji: "🔲", category: "mainboard", tier: 2, power: 6, price: 10, desc: "인텔 가성비, M.2 슬롯 지원" },
  { id: "mb3", name: "B550 메인보드", emoji: "🔲", category: "mainboard", tier: 3, power: 10, price: 12, desc: "AMD 가성비, PCIe 4.0" },
  { id: "mb4", name: "X670E 메인보드", emoji: "🔲", category: "mainboard", tier: 4, power: 16, price: 25, desc: "AMD 고급, PCIe 5.0 지원" },
  { id: "mb5", name: "Z790 메인보드", emoji: "💠", category: "mainboard", tier: 5, power: 20, price: 35, desc: "인텔 최고급, 오버클럭 지원" },
  // 케이스 (현실적)
  { id: "cs1", name: "미니타워 케이스", emoji: "🖥️", category: "case", tier: 1, power: 1, price: 3, desc: "작고 저렴한 기본 케이스" },
  { id: "cs2", name: "미들타워 케이스", emoji: "🖥️", category: "case", tier: 2, power: 3, price: 5, desc: "ATX 지원, 쿨링 보통" },
  { id: "cs3", name: "RGB 강화유리 케이스", emoji: "🌈", category: "case", tier: 3, power: 5, price: 8, desc: "측면 강화유리, RGB 팬 3개" },
  { id: "cs4", name: "에어플로우 케이스", emoji: "💨", category: "case", tier: 4, power: 8, price: 12, desc: "메쉬 전면, 쿨링 최적화" },
  { id: "cs5", name: "풀타워 프리미엄", emoji: "🏗️", category: "case", tier: 5, power: 10, price: 20, desc: "360mm 수냉 지원, 넓은 공간" },
  // 파워 (실제 규격)
  { id: "pw1", name: "400W 파워 (등급없음)", emoji: "🔌", category: "power", tier: 1, power: 2, price: 3, desc: "기본 전원, 효율 낮음" },
  { id: "pw2", name: "550W 80+ 브론즈", emoji: "🔌", category: "power", tier: 2, power: 5, price: 5, desc: "브론즈 등급, 기본 게이밍" },
  { id: "pw3", name: "650W 80+ 골드", emoji: "🔌", category: "power", tier: 3, power: 8, price: 8, desc: "골드 효율, RTX 4060용" },
  { id: "pw4", name: "850W 80+ 골드", emoji: "⚡", category: "power", tier: 4, power: 12, price: 12, desc: "고사양 PC용, 안정적" },
  { id: "pw5", name: "1000W 80+ 플래티넘", emoji: "⚡", category: "power", tier: 5, power: 16, price: 20, desc: "RTX 4090도 거뜬, 최고 효율" },
  // 쿨러 (현실적)
  { id: "cl1", name: "번들 쿨러 (기본)", emoji: "🌀", category: "cooler", tier: 1, power: 1, price: 0, desc: "CPU 박스에 들어있는 기본 쿨러" },
  { id: "cl2", name: "가성비 타워 쿨러", emoji: "❄️", category: "cooler", tier: 2, power: 4, price: 3, desc: "히트파이프 4개, 조용함" },
  { id: "cl3", name: "녹투아 NH-D15", emoji: "❄️", category: "cooler", tier: 3, power: 8, price: 10, desc: "듀얼타워, 공냉 끝판왕" },
  { id: "cl4", name: "240mm AIO 수냉", emoji: "💧", category: "cooler", tier: 4, power: 12, price: 12, desc: "일체형 수냉 240mm" },
  { id: "cl5", name: "360mm AIO 수냉", emoji: "💧", category: "cooler", tier: 5, power: 16, price: 18, desc: "360mm 라디에이터, 고성능 냉각" },
  // 모니터 (현실적)
  { id: "mn1", name: "24인치 FHD 60Hz", emoji: "🖥️", category: "monitor", tier: 1, power: 2, price: 10, desc: "1920x1080, 기본 모니터" },
  { id: "mn2", name: "27인치 FHD 165Hz", emoji: "🖥️", category: "monitor", tier: 2, power: 5, price: 18, desc: "게이밍 주사율, 부드러운 화면" },
  { id: "mn3", name: "27인치 QHD 165Hz", emoji: "🖥️", category: "monitor", tier: 3, power: 8, price: 30, desc: "2560x1440, 선명한 게이밍" },
  { id: "mn4", name: "32인치 4K 144Hz", emoji: "📺", category: "monitor", tier: 4, power: 12, price: 50, desc: "3840x2160, 4K 고주사율" },
  { id: "mn5", name: "34인치 OLED 울트라와이드", emoji: "🎬", category: "monitor", tier: 5, power: 16, price: 100, desc: "3440x1440 OLED, 완벽한 색감" },
  // 키보드 (현실적)
  { id: "kb1", name: "멤브레인 키보드", emoji: "⌨️", category: "keyboard", tier: 1, power: 1, price: 1, desc: "기본 사무용 키보드" },
  { id: "kb2", name: "기계식 청축", emoji: "⌨️", category: "keyboard", tier: 2, power: 3, price: 5, desc: "찰칵찰칵 타건감" },
  { id: "kb3", name: "기계식 적축 RGB", emoji: "🌈", category: "keyboard", tier: 3, power: 5, price: 8, desc: "부드러운 키감, 무지개 조명" },
  { id: "kb4", name: "무선 기계식 75%", emoji: "⌨️", category: "keyboard", tier: 4, power: 7, price: 12, desc: "컴팩트 무선, 핫스왑 지원" },
  { id: "kb5", name: "커스텀 기계식", emoji: "💎", category: "keyboard", tier: 5, power: 9, price: 20, desc: "직접 조립, 윤활 스위치, 최고 타건감" },
  // 마우스 (현실적)
  { id: "ms1", name: "사무용 마우스", emoji: "🖱️", category: "mouse", tier: 1, power: 1, price: 1, desc: "기본 유선 마우스" },
  { id: "ms2", name: "게이밍 유선 마우스", emoji: "🖱️", category: "mouse", tier: 2, power: 3, price: 3, desc: "12000DPI, 게이밍 센서" },
  { id: "ms3", name: "로지텍 G PRO", emoji: "🖱️", category: "mouse", tier: 3, power: 5, price: 8, desc: "무선 경량, e스포츠용" },
  { id: "ms4", name: "레이저 바이퍼 V3", emoji: "🖱️", category: "mouse", tier: 4, power: 7, price: 12, desc: "초경량 54g, 프로게이머 픽" },
  { id: "ms5", name: "로지텍 G PRO X 슈퍼라이트2", emoji: "🏆", category: "mouse", tier: 5, power: 9, price: 16, desc: "60g, 최고급 무선 게이밍" },
  // 스피커/헤드셋 (현실적)
  { id: "sp1", name: "기본 이어폰", emoji: "🎧", category: "speaker", tier: 1, power: 1, price: 1, desc: "번들 이어폰" },
  { id: "sp2", name: "게이밍 헤드셋", emoji: "🎧", category: "speaker", tier: 2, power: 3, price: 5, desc: "마이크 내장, 7.1 가상 서라운드" },
  { id: "sp3", name: "HyperX Cloud III", emoji: "🎧", category: "speaker", tier: 3, power: 5, price: 8, desc: "편한 착용감, 좋은 음질" },
  { id: "sp4", name: "2.1채널 스피커", emoji: "🔊", category: "speaker", tier: 4, power: 7, price: 10, desc: "서브우퍼 포함, 풍부한 저음" },
  { id: "sp5", name: "스튜디오 모니터 스피커", emoji: "🔊", category: "speaker", tier: 5, power: 10, price: 20, desc: "정확한 음질, 프로급 사운드" },
  // ★ 비밀 등급 (tier 6) - 미래/전설급 부품
  { id: "cpu6", name: "인텔 i9-15900KS 극오버", emoji: "🔥", category: "cpu", tier: 6, power: 80, price: 120, desc: "32코어 극한 오버클럭, 7GHz" },
  { id: "gpu6", name: "RTX 5090 Ti", emoji: "👑", category: "gpu", tier: 6, power: 100, price: 300, desc: "48GB, 차세대 끝판왕 GPU" },
  { id: "ram6", name: "DDR5 128GB 8000MHz", emoji: "💎", category: "ram", tier: 6, power: 35, price: 60, desc: "64GBx2, 극한 오버클럭 RAM" },
  { id: "st6", name: "NVMe SSD 8TB Gen6", emoji: "⚡", category: "storage", tier: 6, power: 28, price: 80, desc: "25,000MB/s, 미래에서 온 SSD" },
  { id: "mb6", name: "Z990 극한 메인보드", emoji: "🌟", category: "mainboard", tier: 6, power: 30, price: 60, desc: "PCIe 6.0, 모든 것을 지원" },
  { id: "cs6", name: "커스텀 수냉 풀타워", emoji: "💎", category: "case", tier: 6, power: 15, price: 50, desc: "커스텀 루프 수냉, LED 쇼케이스" },
  { id: "pw6", name: "1600W 80+ 티타늄", emoji: "💎", category: "power", tier: 6, power: 25, price: 40, desc: "티타늄 효율, 무한 파워" },
  { id: "cl6", name: "커스텀 루프 수냉", emoji: "🧊", category: "cooler", tier: 6, power: 30, price: 50, desc: "직접 제작 수냉 루프, -10°C 냉각" },
  { id: "mn6", name: "42인치 8K OLED 240Hz", emoji: "✨", category: "monitor", tier: 6, power: 25, price: 200, desc: "7680x4320 OLED, 미래의 모니터" },
  { id: "kb6", name: "자체제작 알루미늄 키보드", emoji: "🏆", category: "keyboard", tier: 6, power: 14, price: 40, desc: "CNC 알루미늄, 홀리판다 스위치" },
  { id: "ms6", name: "파이널마우스 UltralightX2", emoji: "💫", category: "mouse", tier: 6, power: 14, price: 30, desc: "29g, 세상에서 가장 가벼운 마우스" },
  { id: "sp6", name: "Sennheiser HD 800S + DAC", emoji: "👑", category: "speaker", tier: 6, power: 16, price: 50, desc: "오디오파일급, DAC/AMP 풀셋" },
];

/* ───── 게임 등급 (현실적 FPS 기반) ───── */
interface GameDef {
  name: string;
  emoji: string;
  required: number; // 최소 성능 (30fps 기준)
  optimal: number;  // 쾌적 성능 (60fps 기준)
  ultra: number;    // 울트라 성능 (144fps 기준)
  cpuWeight: number; // CPU 의존도 (0~1)
  gpuWeight: number; // GPU 의존도 (0~1)
  ramMin: number;    // 최소 RAM 티어
  storageHelp: boolean; // 저장장치가 로딩에 영향
  resolution: string;
  desc: string;
}
const GAMES: GameDef[] = [
  { name: "웹 서핑/유튜브", emoji: "🌐", required: 10, optimal: 20, ultra: 30, cpuWeight: 0.7, gpuWeight: 0.3, ramMin: 1, storageHelp: true, resolution: "FHD", desc: "크롬, 유튜브 시청" },
  { name: "리그 오브 레전드", emoji: "⚔️", required: 20, optimal: 40, ultra: 70, cpuWeight: 0.5, gpuWeight: 0.5, ramMin: 1, storageHelp: false, resolution: "FHD", desc: "5v5 MOBA" },
  { name: "마인크래프트", emoji: "⛏️", required: 25, optimal: 50, ultra: 90, cpuWeight: 0.6, gpuWeight: 0.4, ramMin: 2, storageHelp: true, resolution: "FHD", desc: "모드 포함 기준" },
  { name: "로블록스", emoji: "🧱", required: 25, optimal: 45, ultra: 75, cpuWeight: 0.5, gpuWeight: 0.5, ramMin: 1, storageHelp: false, resolution: "FHD", desc: "다양한 게임 플레이" },
  { name: "발로란트", emoji: "🎯", required: 30, optimal: 55, ultra: 100, cpuWeight: 0.55, gpuWeight: 0.45, ramMin: 2, storageHelp: false, resolution: "FHD", desc: "경쟁 FPS" },
  { name: "포트나이트", emoji: "🔫", required: 40, optimal: 70, ultra: 120, cpuWeight: 0.4, gpuWeight: 0.6, ramMin: 2, storageHelp: true, resolution: "FHD", desc: "배틀로얄" },
  { name: "오버워치 2", emoji: "🦸", required: 45, optimal: 80, ultra: 130, cpuWeight: 0.45, gpuWeight: 0.55, ramMin: 2, storageHelp: false, resolution: "FHD", desc: "팀 FPS" },
  { name: "GTA 5", emoji: "🚗", required: 50, optimal: 90, ultra: 150, cpuWeight: 0.4, gpuWeight: 0.6, ramMin: 2, storageHelp: true, resolution: "FHD", desc: "오픈월드 액션" },
  { name: "엘든 링", emoji: "🗡️", required: 60, optimal: 100, ultra: 160, cpuWeight: 0.35, gpuWeight: 0.65, ramMin: 2, storageHelp: true, resolution: "FHD", desc: "액션 RPG" },
  { name: "호그와트 레거시", emoji: "🧙", required: 70, optimal: 120, ultra: 200, cpuWeight: 0.3, gpuWeight: 0.7, ramMin: 3, storageHelp: true, resolution: "QHD", desc: "오픈월드 RPG" },
  { name: "사이버펑크 2077", emoji: "🤖", required: 80, optimal: 140, ultra: 230, cpuWeight: 0.3, gpuWeight: 0.7, ramMin: 3, storageHelp: true, resolution: "QHD", desc: "레이트레이싱 ON" },
  { name: "스타필드", emoji: "🌌", required: 90, optimal: 160, ultra: 250, cpuWeight: 0.35, gpuWeight: 0.65, ramMin: 3, storageHelp: true, resolution: "QHD", desc: "우주 탐험 RPG" },
  { name: "사이버펑크 4K", emoji: "🤖", required: 120, optimal: 200, ultra: 300, cpuWeight: 0.25, gpuWeight: 0.75, ramMin: 4, storageHelp: true, resolution: "4K", desc: "4K + 패스트레이싱" },
  { name: "8K 렌더링", emoji: "🖥️", required: 180, optimal: 260, ultra: 350, cpuWeight: 0.3, gpuWeight: 0.7, ramMin: 5, storageHelp: true, resolution: "8K", desc: "8K 해상도 출력" },
  { name: "VR 고사양", emoji: "🥽", required: 150, optimal: 230, ultra: 320, cpuWeight: 0.35, gpuWeight: 0.65, ramMin: 4, storageHelp: true, resolution: "VR", desc: "VR 울트라 90fps" },
];

/* ───── 현실적 성능 계산 ───── */
function calcDetailedScore(equippedMap: Map<string, Part>) {
  const cpu = equippedMap.get("cpu");
  const gpu = equippedMap.get("gpu");
  const ram = equippedMap.get("ram");
  const storage = equippedMap.get("storage");
  const cooler = equippedMap.get("cooler");
  const power = equippedMap.get("power");
  const monitor = equippedMap.get("monitor");

  const cpuScore = cpu ? cpu.power : 0;
  const gpuScore = gpu ? gpu.power : 0;
  const ramScore = ram ? ram.power : 0;
  const storageScore = storage ? storage.power : 0;
  const coolerScore = cooler ? cooler.power : 0;
  const powerScore = power ? power.power : 0;
  const monitorScore = monitor ? monitor.power : 0;

  // 쿨러 부족 → CPU 쓰로틀링 (성능 저하)
  const thermalThrottle = cpu && cooler
    ? (coolerScore >= cpuScore * 0.3 ? 1.0 : 0.7 + (coolerScore / (cpuScore * 0.3)) * 0.3)
    : (cpu ? 0.7 : 1.0);

  // 파워 부족 → 전체 성능 제한
  const totalDraw = cpuScore + gpuScore;
  const powerLimit = power
    ? (powerScore >= totalDraw * 0.3 ? 1.0 : 0.6 + (powerScore / (totalDraw * 0.3)) * 0.4)
    : (totalDraw > 0 ? 0.5 : 1.0);

  // 병목 분석
  let bottleneck = "없음";
  let bottleneckSeverity = 0; // 0~100
  if (cpu && gpu) {
    const ratio = cpuScore / gpuScore;
    if (ratio < 0.4) { bottleneck = "CPU 병목"; bottleneckSeverity = Math.floor((1 - ratio / 0.4) * 100); }
    else if (ratio > 2.5) { bottleneck = "GPU 병목"; bottleneckSeverity = Math.floor((1 - 1 / (ratio / 2.5)) * 100); }
  } else if (cpu && !gpu) {
    bottleneck = "GPU 없음!"; bottleneckSeverity = 80;
  } else if (!cpu && gpu) {
    bottleneck = "CPU 없음!"; bottleneckSeverity = 80;
  }

  // RAM 부족 경고
  const ramTier = ram ? ram.tier : 0;

  // 게임별 FPS 계산
  const gameResults = GAMES.map(g => {
    const effectiveCpu = cpuScore * thermalThrottle * powerLimit;
    const effectiveGpu = gpuScore * powerLimit;
    const weighted = effectiveCpu * g.cpuWeight + effectiveGpu * g.gpuWeight + ramScore * 0.1 + (g.storageHelp ? storageScore * 0.05 : 0);

    // RAM 부족 페널티
    const ramPenalty = ramTier < g.ramMin ? 0.6 : 1.0;
    const finalScore = weighted * ramPenalty;

    // FPS 계산 (required=30fps 기준, optimal=60fps, ultra=144fps)
    let fps: number;
    if (finalScore <= 0) fps = 0;
    else if (finalScore < g.required) fps = Math.floor((finalScore / g.required) * 30);
    else if (finalScore < g.optimal) fps = 30 + Math.floor(((finalScore - g.required) / (g.optimal - g.required)) * 30);
    else if (finalScore < g.ultra) fps = 60 + Math.floor(((finalScore - g.optimal) / (g.ultra - g.optimal)) * 84);
    else fps = 144 + Math.floor((finalScore - g.ultra) / g.ultra * 60);

    // 모니터 주사율 제한
    const maxFps = monitor ? [60, 165, 165, 144, 144][monitor.tier - 1] || 60 : 60;
    const displayFps = Math.min(fps, maxFps);
    const monitorLimited = fps > maxFps;

    const loadTime = g.storageHelp
      ? (storage ? Math.max(1, Math.floor(30 / (storageScore + 1))) : 45)
      : 3;

    let quality: string;
    let qualityColor: string;
    if (fps >= 144) { quality = "울트라"; qualityColor = "#e03131"; }
    else if (fps >= 100) { quality = "매우높음"; qualityColor = "#f59f00"; }
    else if (fps >= 60) { quality = "높음"; qualityColor = "#51cf66"; }
    else if (fps >= 30) { quality = "중간"; qualityColor = "#ffd43b"; }
    else if (fps > 0) { quality = "낮음"; qualityColor = "#aaa"; }
    else { quality = "실행불가"; qualityColor = "#666"; }

    const ramWarning = ramTier < g.ramMin;

    return { game: g, fps, displayFps, monitorLimited, quality, qualityColor, loadTime, ramWarning };
  });

  // 온도 추정
  const cpuTemp = cpu
    ? Math.floor(35 + (cpuScore / 50) * 45 * (1 / Math.max(thermalThrottle, 0.5)))
    : 0;
  const gpuTemp = gpu ? Math.floor(30 + (gpuScore / 60) * 50) : 0;

  // 예상 전력 소비
  const wattage = Math.floor(50 + cpuScore * 3 + gpuScore * 4);

  return {
    cpuScore, gpuScore, ramScore, storageScore,
    thermalThrottle, powerLimit,
    bottleneck, bottleneckSeverity,
    gameResults,
    cpuTemp, gpuTemp, wattage,
    totalScore: Math.floor((cpuScore + gpuScore + ramScore * 0.5 + storageScore * 0.3) * thermalThrottle * powerLimit),
  };
}

/* ───── 컷씬 타입 ───── */
interface Cutscene {
  type: "buy" | "equip" | "unequip" | "sell" | "test";
  emoji: string;
  partName: string;
  tier: number;
  message: string;
}

type Screen = "main" | "shop" | "build" | "test";

export default function ComputerPage() {
  const [screen, setScreen] = useState<Screen>("main");
  const [coins, setCoins] = useState(100); // 100만원 예산
  const [inventory, setInventory] = useState<Part[]>([]);
  const [equipped, setEquipped] = useState<Map<string, Part>>(new Map());
  const [shopCategory, setShopCategory] = useState("cpu");
  const [testResult, setTestResult] = useState<ReturnType<typeof calcDetailedScore> | null>(null);
  const [earnedCoins, setEarnedCoins] = useState(0);

  /* ───── 컷씬 상태 ───── */
  const [cutscene, setCutscene] = useState<Cutscene | null>(null);
  const [cutPhase, setCutPhase] = useState(0); // 0: 등장, 1: 연출, 2: 텍스트, 3: 끝
  const cutCanvasRef = useRef<HTMLCanvasElement>(null);
  const cutAnimRef = useRef(0);

  const playCutscene = useCallback((cs: Cutscene, onDone?: () => void) => {
    setCutscene(cs);
    setCutPhase(0);
    setTimeout(() => setCutPhase(1), 300);
    setTimeout(() => setCutPhase(2), 800);
    setTimeout(() => {
      setCutPhase(3);
      setTimeout(() => {
        setCutscene(null);
        setCutPhase(0);
        onDone?.();
      }, 400);
    }, 1800);
  }, []);

  /* ───── 컷씬 캔버스 애니메이션 ───── */
  useEffect(() => {
    if (!cutscene) return;
    const cvs = cutCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width;
    const H = cvs.height;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; maxLife: number }[] = [];
    let tick = 0;

    const tierColors: Record<string, string[]> = {
      buy: ["#22c55e", "#4ade80", "#86efac"],
      equip: ["#3b82f6", "#60a5fa", "#93c5fd"],
      unequip: ["#f97316", "#fb923c", "#fdba74"],
      sell: ["#eab308", "#facc15", "#fde047"],
      test: ["#a855f7", "#c084fc", "#d8b4fe"],
    };
    const colors = tierColors[cutscene.type] || tierColors.buy;
    // 비밀 등급이면 특별 색상
    const isSecret = cutscene.tier >= 6;
    const sparkColors = isSecret ? ["#e03131", "#f59f00", "#ffd700"] : colors;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      tick++;
      const cx = W / 2;
      const cy = H / 2;

      // 배경 페이드
      ctx.fillStyle = `rgba(0,0,0,${Math.min(tick * 0.02, 0.85)})`;
      ctx.fillRect(0, 0, W, H);

      if (cutscene.type === "buy") {
        // 구매: 예산이 떨어지며 부품 등장
        const dropY = Math.min(tick * 4, cy - 20);
        // 예산 파티클
        if (tick < 30 && tick % 2 === 0) {
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: cx + (Math.random() - 0.5) * 100, y: 0,
              vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
              r: 4 + Math.random() * 4, color: "#ffd700",
              life: 60, maxLife: 60,
            });
          }
        }
        // 빛나는 원
        if (tick > 15) {
          const radius = Math.min((tick - 15) * 3, 80);
          const grad = ctx.createRadialGradient(cx, dropY, 0, cx, dropY, radius);
          grad.addColorStop(0, sparkColors[0] + "88");
          grad.addColorStop(1, sparkColors[0] + "00");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, dropY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        // 이모지
        if (tick > 10) {
          ctx.font = `${Math.min((tick - 10) * 2, 60)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cutscene.emoji, cx, dropY);
        }
      } else if (cutscene.type === "equip") {
        // 장착: 부품이 회전하며 슬롯에 끼워짐
        const angle = tick * 0.15;
        const scale = tick < 20 ? tick / 20 : 1;
        const moveX = tick < 30 ? (Math.sin(angle) * 40 * (1 - tick / 30)) : 0;
        // 스파크
        if (tick % 3 === 0) {
          const a = Math.random() * Math.PI * 2;
          particles.push({
            x: cx + moveX, y: cy,
            vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3),
            r: 2 + Math.random() * 3, color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            life: 30, maxLife: 30,
          });
        }
        // 슬롯 표시
        ctx.strokeStyle = sparkColors[0] + "66";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cx - 35, cy - 35, 70, 70);
        ctx.setLineDash([]);
        // 플래시
        if (tick > 25 && tick < 35) {
          ctx.fillStyle = `rgba(255,255,255,${(35 - tick) / 10 * 0.5})`;
          ctx.fillRect(0, 0, W, H);
        }
        // 이모지
        ctx.font = `${Math.floor(50 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cutscene.emoji, cx + moveX, cy);
      } else if (cutscene.type === "unequip") {
        // 해제: 부품이 위로 빠져나감
        const floatY = cy - Math.min(tick * 2, 80);
        const alpha = Math.max(1 - tick / 50, 0);
        // 연기 파티클
        if (tick % 2 === 0 && tick < 40) {
          particles.push({
            x: cx + (Math.random() - 0.5) * 30, y: floatY + 20,
            vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random(),
            r: 3 + Math.random() * 5, color: "#aaa",
            life: 25, maxLife: 25,
          });
        }
        ctx.globalAlpha = alpha;
        ctx.font = "50px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cutscene.emoji, cx, floatY);
        ctx.globalAlpha = 1;
      } else if (cutscene.type === "sell") {
        // 판매: 부품이 예산으로 변환
        const progress = Math.min(tick / 40, 1);
        if (progress < 0.5) {
          // 부품 축소
          const s = 1 - progress * 2;
          ctx.font = `${Math.floor(50 * s)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cutscene.emoji, cx, cy);
        } else {
          // 예산 팡!
          const s = (progress - 0.5) * 2;
          ctx.font = `${Math.floor(60 * s)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🪙", cx, cy);
        }
        // 예산 파티클
        if (tick === 20) {
          for (let i = 0; i < 15; i++) {
            const a = (i / 15) * Math.PI * 2;
            particles.push({
              x: cx, y: cy,
              vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
              r: 3 + Math.random() * 3, color: "#ffd700",
              life: 35, maxLife: 35,
            });
          }
        }
      } else if (cutscene.type === "test") {
        // 테스트: 스캔 라인이 지나감
        const scanY = (tick * 5) % H;
        // 스캔 라인
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(W, scanY);
        ctx.stroke();
        // 글로우
        const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
        grad.addColorStop(0, "#a855f700");
        grad.addColorStop(0.5, "#a855f744");
        grad.addColorStop(1, "#a855f700");
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 20, W, 40);
        // 데이터 파티클
        if (tick % 2 === 0) {
          particles.push({
            x: Math.random() * W, y: scanY,
            vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
            r: 2, color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            life: 20, maxLife: 20,
          });
        }
        // 컴퓨터 이모지
        ctx.font = "50px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🖥️", cx, cy);
        // % 표시
        const pct = Math.min(Math.floor(tick * 2), 100);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`분석 중... ${pct}%`, cx, cy + 50);
      }

      // 비밀 등급 특수 효과: 무지개 링
      if (isSecret && tick > 10) {
        for (let i = 0; i < 3; i++) {
          const ringR = 50 + i * 20 + Math.sin(tick * 0.1 + i) * 10;
          ctx.strokeStyle = `hsl(${(tick * 5 + i * 120) % 360}, 100%, 60%)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 파티클 업데이트
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      cutAnimRef.current = requestAnimationFrame(loop);
    };

    cutAnimRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(cutAnimRef.current);
  }, [cutscene]);

  const totalPower = [...equipped.values()].reduce((s, p) => s + p.power, 0);
  const filledSlots = equipped.size;
  const totalSlots = CATEGORIES.length;

  /* ───── 구매 ───── */
  const buyPart = useCallback((part: Part) => {
    if (coins < part.price) return;
    setCoins(c => c - part.price);
    playCutscene({
      type: "buy", emoji: part.emoji, partName: part.name, tier: part.tier,
      message: `${part.name} 구매 완료!`,
    }, () => {
      setInventory(inv => [...inv, part]);
    });
  }, [coins, playCutscene]);

  /* ───── 장착 ───── */
  const equipPart = useCallback((part: Part) => {
    playCutscene({
      type: "equip", emoji: part.emoji, partName: part.name, tier: part.tier,
      message: `${part.name} 장착!`,
    }, () => {
      setEquipped(prev => {
        const next = new Map(prev);
        const old = next.get(part.category);
        if (old) {
          setInventory(inv => [...inv, old]);
        }
        next.set(part.category, part);
        return next;
      });
      setInventory(inv => {
        const idx = inv.findIndex(p => p.id === part.id);
        if (idx === -1) return inv;
        const copy = [...inv];
        copy.splice(idx, 1);
        return copy;
      });
    });
  }, [playCutscene]);

  /* ───── 해제 ───── */
  const unequipPart = useCallback((category: string) => {
    const part = equipped.get(category);
    if (!part) return;
    playCutscene({
      type: "unequip", emoji: part.emoji, partName: part.name, tier: part.tier,
      message: `${part.name} 해제`,
    }, () => {
      setEquipped(prev => {
        const next = new Map(prev);
        const p = next.get(category);
        if (p) {
          setInventory(inv => [...inv, p]);
          next.delete(category);
        }
        return next;
      });
    });
  }, [equipped, playCutscene]);

  /* ───── 성능 테스트 ───── */
  const runTest = useCallback(() => {
    const result = calcDetailedScore(equipped);
    const reward = Math.floor(result.totalScore / 5) + 3;
    setEarnedCoins(reward);
    playCutscene({
      type: "test", emoji: "🖥️", partName: "", tier: 0,
      message: "벤치마크 실행 중...",
    }, () => {
      setCoins(c => c + reward);
      setTestResult(result);
      setScreen("test");
    });
  }, [equipped, playCutscene]);

  /* ───── 부품 팔기 ───── */
  const sellPart = useCallback((part: Part, idx: number) => {
    const sellPrice = Math.floor(part.price * 0.5);
    playCutscene({
      type: "sell", emoji: part.emoji, partName: part.name, tier: part.tier,
      message: `${part.name} 판매! +${sellPrice}🪙`,
    }, () => {
      setCoins(c => c + sellPrice);
      setInventory(inv => {
        const copy = [...inv];
        copy.splice(idx, 1);
        return copy;
      });
    });
  }, [playCutscene]);

  const tierColor = (tier: number) => {
    const colors = ["", "#aaa", "#4dabf7", "#ae3ec9", "#f59f00", "#e03131", "#ff00ff"];
    return colors[tier] || "#aaa";
  };
  const tierName = (tier: number) => {
    const names = ["", "입문", "가성비", "고급", "하이엔드", "플래그십", "⭐비밀⭐"];
    return names[tier] || "";
  };

  /* ───── 컷씬 오버레이 ───── */
  const cutsceneOverlay = cutscene ? (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ pointerEvents: "none" }}>
      <canvas ref={cutCanvasRef} width={400} height={300}
        className="max-w-full absolute inset-0 w-full h-full" />
      {/* 텍스트 오버레이 */}
      <div className={`relative z-10 text-center transition-all duration-300 ${cutPhase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="text-white text-lg font-black drop-shadow-lg px-4 py-2 rounded-xl"
          style={{
            background: cutscene.tier >= 6
              ? "linear-gradient(135deg, #e03131aa, #f59f00aa)"
              : "rgba(0,0,0,0.6)",
            textShadow: "0 0 10px rgba(255,255,255,0.5)",
          }}>
          {cutscene.message}
        </div>
      </div>
    </div>
  ) : null;

  /* ───── 메인 화면 ───── */
  if (screen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-gray-950 text-white p-4">
        {cutsceneOverlay}
        <div className="max-w-md mx-auto">
          <Link href="/" className="text-blue-300 text-sm mb-4 inline-block">← 홈으로</Link>

          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🖥️</div>
            <h1 className="text-3xl font-black mb-1">컴퓨터 만들기</h1>
            <p className="text-blue-300 text-sm">예산 안에서 최고의 PC를 조립하라!</p>
          </div>

          {/* 상태 */}
          <div className="bg-blue-900/40 rounded-xl p-3 mb-4 flex justify-between items-center">
            <div>
              <span className="text-yellow-400 text-lg font-bold">💰 {coins}만원</span>
              <span className="text-blue-300 text-xs ml-2">예산</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-300">⚡ 성능: {totalPower}</div>
              <div className="text-xs text-blue-400">부품: {filledSlots}/{totalSlots}</div>
            </div>
          </div>

          {/* 내 컴퓨터 미리보기 */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <h3 className="text-sm font-bold mb-2 text-center">🖥️ 내 컴퓨터</h3>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const part = equipped.get(cat.id);
                return (
                  <div key={cat.id} className="text-center p-2 rounded-lg"
                    style={{
                      background: part ? tierColor(part.tier) + "22" : "#ffffff08",
                      border: part ? `1px solid ${tierColor(part.tier)}44` : "1px dashed #ffffff22",
                    }}>
                    <div className="text-xl">{part ? part.emoji : cat.emoji}</div>
                    <div className="text-[9px] text-gray-400">{cat.name}</div>
                    {part && <div className="text-[8px]" style={{ color: tierColor(part.tier) }}>{part.name}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 메뉴 버튼 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button onClick={() => setScreen("shop")}
              className="bg-green-900/60 hover:bg-green-800/60 rounded-xl p-3 text-center">
              <div className="text-2xl">🛒</div>
              <div className="text-sm font-bold">상점</div>
              <div className="text-xs text-green-300">부품 구매</div>
            </button>
            <button onClick={() => setScreen("build")}
              className="bg-blue-900/60 hover:bg-blue-800/60 rounded-xl p-3 text-center">
              <div className="text-2xl">🔧</div>
              <div className="text-sm font-bold">조립</div>
              <div className="text-xs text-blue-300">부품 장착</div>
            </button>
            <button onClick={runTest} disabled={filledSlots === 0}
              className="bg-purple-900/60 hover:bg-purple-800/60 disabled:opacity-40 rounded-xl p-3 text-center">
              <div className="text-2xl">🧪</div>
              <div className="text-sm font-bold">테스트</div>
              <div className="text-xs text-purple-300">성능 확인</div>
            </button>
          </div>

          {/* 게임 호환성 미리보기 */}
          <div className="bg-black/30 rounded-xl p-3">
            <h3 className="text-sm font-bold mb-2 text-center">🎮 예상 게임 성능</h3>
            <div className="space-y-1">
              {(() => {
                const preview = filledSlots > 0 ? calcDetailedScore(equipped) : null;
                return GAMES.map(g => {
                  const gr = preview?.gameResults.find(r => r.game.name === g.name);
                  const fps = gr?.fps ?? 0;
                  const fpsRatio = Math.min(fps / 144, 1);
                  return (
                    <div key={g.name} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-center">{g.emoji}</span>
                      <span className={`w-24 truncate ${fps >= 30 ? "text-green-400" : fps > 0 ? "text-yellow-400" : "text-gray-500"}`}>{g.name}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all"
                          style={{
                            width: `${fpsRatio * 100}%`,
                            background: fps >= 60 ? "#22c55e" : fps >= 30 ? "#eab308" : "#ef4444",
                          }} />
                      </div>
                      <span className={`w-12 text-right font-mono ${fps >= 60 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-gray-500"}`}>
                        {fps > 0 ? `${fps}fps` : "❌"}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── 상점 ───── */
  if (screen === "shop") {
    const shopParts = PARTS.filter(p => p.category === shopCategory);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-green-950 to-gray-950 text-white p-4">
        {cutsceneOverlay}
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-green-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🛒 부품 상점</h2>
          <div className="text-center text-yellow-400 font-bold mb-4">💰 {coins}만원 예산</div>

          {/* 카테고리 탭 */}
          <div className="flex gap-1 overflow-x-auto mb-4 pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat.id}
                onClick={() => setShopCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${shopCategory === cat.id ? "bg-green-600" : "bg-gray-800 hover:bg-gray-700"}`}>
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>

          {/* 부품 목록 */}
          <div className="space-y-2">
            {shopParts.map(part => {
              const owned = inventory.filter(p => p.id === part.id).length + (equipped.get(part.category)?.id === part.id ? 1 : 0);
              return (
                <div key={part.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: tierColor(part.tier) + "15",
                    border: `1px solid ${tierColor(part.tier)}33`,
                  }}>
                  <div className="text-3xl">{part.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{part.name}</span>
                      <span className="text-[10px] px-1 rounded" style={{ background: tierColor(part.tier) + "33", color: tierColor(part.tier) }}>
                        {tierName(part.tier)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{part.desc}</div>
                    <div className="text-xs text-blue-300">⚡ +{part.power} 성능 {owned > 0 && <span className="text-green-400">({owned}개 보유)</span>}</div>
                  </div>
                  <button onClick={() => buyPart(part)} disabled={coins < part.price}
                    className="bg-green-600 disabled:bg-gray-700 hover:bg-green-500 text-xs px-3 py-2 rounded-lg font-bold whitespace-nowrap">
                    {part.price}만원
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ───── 조립 ───── */
  if (screen === "build") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-950 to-gray-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button onClick={() => setScreen("main")} className="text-blue-300 text-sm mb-4">← 뒤로</button>
          <h2 className="text-2xl font-black text-center mb-2">🔧 컴퓨터 조립</h2>
          <div className="text-center text-sm text-blue-300 mb-4">⚡ 총 성능: {totalPower}</div>

          {/* 장착 슬롯 */}
          <div className="space-y-2 mb-6">
            {CATEGORIES.map(cat => {
              const part = equipped.get(cat.id);
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: part ? tierColor(part.tier) + "15" : "#ffffff08",
                    border: part ? `1px solid ${tierColor(part.tier)}44` : "1px dashed #ffffff22",
                  }}>
                  <div className="text-2xl w-8 text-center">{part ? part.emoji : cat.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{cat.name}</div>
                    {part ? (
                      <>
                        <div className="font-bold text-sm">{part.name}</div>
                        <div className="text-xs text-blue-300">⚡ +{part.power}</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">비어있음</div>
                    )}
                  </div>
                  {part && (
                    <button onClick={() => unequipPart(cat.id)}
                      className="bg-red-800/60 hover:bg-red-700/60 text-xs px-2 py-1 rounded-lg">
                      해제
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 인벤토리 */}
          <h3 className="text-sm font-bold mb-2">📦 인벤토리 ({inventory.length}개)</h3>
          {inventory.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">부품이 없어요! 상점에서 구매하세요</p>
          ) : (
            <div className="space-y-1">
              {inventory.map((part, idx) => (
                <div key={`${part.id}-${idx}`} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                  <span className="text-lg">{part.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold">{part.name}</span>
                    <span className="text-xs ml-1" style={{ color: tierColor(part.tier) }}>({tierName(part.tier)})</span>
                    <span className="text-xs text-blue-300 ml-1">⚡{part.power}</span>
                  </div>
                  <button onClick={() => equipPart(part)}
                    className="bg-blue-600 hover:bg-blue-500 text-xs px-2 py-1 rounded-lg font-bold">
                    장착
                  </button>
                  <button onClick={() => sellPart(part, idx)}
                    className="bg-gray-700 hover:bg-gray-600 text-xs px-2 py-1 rounded-lg">
                    {Math.floor(part.price * 0.5)}만원
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ───── 테스트 결과 ───── */
  if (screen === "test" && testResult) {
    const budget = [...equipped.values()].reduce((s, p) => s + p.price, 0);
    const { totalScore, cpuScore, gpuScore, ramScore, storageScore, thermalThrottle, powerLimit, bottleneck, bottleneckSeverity, gameResults, cpuTemp, gpuTemp, wattage } = testResult;
    const playableCount = gameResults.filter(r => r.fps >= 30).length;
    const smoothCount = gameResults.filter(r => r.fps >= 60).length;

    const grade =
      totalScore >= 400 ? { name: "⭐비밀⭐", color: "#ff00ff", desc: "인간의 기술을 초월한 전설의 PC!" } :
      totalScore >= 300 ? { name: "SS", color: "#ff4444", desc: "8K+VR 완벽! 미래에서 온 PC!" } :
      totalScore >= 250 ? { name: "S+", color: "#e03131", desc: "4K+VR 울트라! 꿈의 PC!" } :
      totalScore >= 200 ? { name: "S", color: "#f59f00", desc: "4K 울트라 게이밍 PC!" } :
      totalScore >= 150 ? { name: "A+", color: "#ae3ec9", desc: "QHD 고사양 게이밍 PC" } :
      totalScore >= 120 ? { name: "A", color: "#4dabf7", desc: "대부분의 게임 쾌적" } :
      totalScore >= 90  ? { name: "B+", color: "#51cf66", desc: "FHD 고옵 게이밍" } :
      totalScore >= 65  ? { name: "B", color: "#82c91e", desc: "FHD 중옵 게이밍" } :
      totalScore >= 45  ? { name: "C", color: "#ffd43b", desc: "가벼운 게임 가능" } :
      totalScore >= 25  ? { name: "D", color: "#aaa", desc: "사무용 PC" } :
                          { name: "F", color: "#666", desc: "부품이 부족해요..." };

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-950 text-white p-4">
        {cutsceneOverlay}
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-black text-center mb-4">🧪 벤치마크 결과</h2>

          {/* 등급 + 점수 */}
          <div className="text-center mb-4">
            <div className="text-7xl font-black mb-1" style={{ color: grade.color }}>{grade.name}</div>
            <div className="text-lg font-bold" style={{ color: grade.color }}>{grade.desc}</div>
            <div className="text-sm text-gray-400 mt-1">종합 점수: {totalScore}점</div>
            <div className="text-sm text-yellow-400">💰 +{earnedCoins}만원 보너스!</div>
          </div>

          {/* 부품별 점수 바 */}
          <div className="bg-black/30 rounded-xl p-4 mb-3">
            <h3 className="text-sm font-bold mb-3 text-center">📊 부품별 벤치마크</h3>
            {[
              { label: "🧠 CPU", score: cpuScore, max: 80, color: "#3b82f6" },
              { label: "🎮 GPU", score: gpuScore, max: 100, color: "#22c55e" },
              { label: "💾 RAM", score: ramScore, max: 35, color: "#a855f7" },
              { label: "💿 저장장치", score: storageScore, max: 28, color: "#f59f00" },
            ].map(b => (
              <div key={b.label} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{b.label}</span>
                  <span style={{ color: b.color }}>{b.score}/{b.max}</span>
                </div>
                <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div className="h-3 rounded-full transition-all" style={{
                    width: `${(b.score / b.max) * 100}%`,
                    background: b.color,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* 시스템 상태 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">🌡️ CPU 온도</div>
              <div className="text-xl font-black" style={{
                color: cpuTemp > 90 ? "#e03131" : cpuTemp > 75 ? "#f59f00" : "#51cf66"
              }}>{cpuTemp}°C</div>
              <div className="text-[10px] text-gray-500">
                {cpuTemp > 90 ? "🔥 과열! 쓰로틀링" : cpuTemp > 75 ? "⚠️ 높음" : "✅ 정상"}
              </div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">🌡️ GPU 온도</div>
              <div className="text-xl font-black" style={{
                color: gpuTemp > 85 ? "#e03131" : gpuTemp > 70 ? "#f59f00" : "#51cf66"
              }}>{gpuTemp}°C</div>
              <div className="text-[10px] text-gray-500">
                {gpuTemp > 85 ? "🔥 과열!" : gpuTemp > 70 ? "⚠️ 높음" : "✅ 정상"}
              </div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">⚡ 소비 전력</div>
              <div className="text-xl font-black text-blue-400">{wattage}W</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">💵 총 투자</div>
              <div className="text-xl font-black text-yellow-400">{budget}만원</div>
            </div>
          </div>

          {/* 병목/경고 */}
          {(thermalThrottle < 1 || powerLimit < 1 || bottleneckSeverity > 20) && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-3 mb-3">
              <h3 className="text-sm font-bold text-red-400 mb-2">⚠️ 주의사항</h3>
              {thermalThrottle < 1 && (
                <div className="text-xs text-red-300 mb-1">
                  🌡️ 쿨러 성능 부족! CPU 성능 {Math.floor((1 - thermalThrottle) * 100)}% 저하 (쓰로틀링)
                </div>
              )}
              {powerLimit < 1 && (
                <div className="text-xs text-red-300 mb-1">
                  🔌 파워 용량 부족! 전체 성능 {Math.floor((1 - powerLimit) * 100)}% 저하
                </div>
              )}
              {bottleneckSeverity > 20 && (
                <div className="text-xs text-yellow-300 mb-1">
                  🔗 {bottleneck} 발생 (심각도: {bottleneckSeverity}%)
                  {bottleneck === "CPU 병목" && " → GPU가 CPU보다 너무 좋아요. CPU를 업그레이드하세요!"}
                  {bottleneck === "GPU 병목" && " → CPU가 GPU보다 너무 좋아요. GPU를 업그레이드하세요!"}
                </div>
              )}
            </div>
          )}

          {/* 게임별 FPS */}
          <div className="bg-black/30 rounded-xl p-4 mb-3">
            <h3 className="text-sm font-bold mb-1 text-center">
              🎮 게임 성능 ({playableCount}개 실행 가능 / {smoothCount}개 쾌적)
            </h3>
            <div className="text-[10px] text-gray-500 text-center mb-3">
              🟢 60fps+ 쾌적 | 🟡 30fps+ 플레이 가능 | 🔴 30fps 미만
            </div>
            <div className="space-y-2">
              {gameResults.map(r => (
                <div key={r.game.name} className="bg-black/20 rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{r.game.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold truncate">{r.game.name}</span>
                        <span className="text-[10px] px-1 rounded" style={{
                          background: r.qualityColor + "33",
                          color: r.qualityColor,
                        }}>{r.quality}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{r.game.resolution} · {r.game.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black font-mono" style={{ color: r.qualityColor }}>
                        {r.fps > 0 ? r.displayFps : "—"}
                        <span className="text-[10px] font-normal"> fps</span>
                      </div>
                    </div>
                  </div>
                  {/* FPS 바 */}
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${Math.min((r.fps / 144) * 100, 100)}%`,
                        background: r.qualityColor,
                      }} />
                    </div>
                    {r.monitorLimited && (
                      <span className="text-[9px] text-blue-400">🖥️모니터제한</span>
                    )}
                    {r.ramWarning && (
                      <span className="text-[9px] text-red-400">💾RAM부족</span>
                    )}
                  </div>
                  {r.game.storageHelp && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      💿 로딩 시간: ~{r.loadTime}초
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setScreen("main")}
            className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-3 font-bold mb-4">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
