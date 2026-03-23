import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-pink-50 to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="animate-fade-in-up text-center">
          {/* Profile Image */}
          <div className="mx-auto mb-8 h-52 w-52 overflow-hidden rounded-full border-4 border-white shadow-xl sm:h-64 sm:w-64">
            <Image
              src="/yoohyun001.jpg"
              alt="진유현 프로필 사진"
              width={256}
              height={256}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          {/* Name & Greeting */}
          <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            안녕하세요!
          </h1>
          <p className="mb-2 text-3xl font-bold text-pink-500 sm:text-4xl">
            저는 진유현입니다
          </p>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            반갑습니다! 저의 소개 페이지에 오신 것을 환영해요 🎉
          </p>
        </div>

        {/* Scroll hint */}
        <div className="animate-fade-in animation-delay-600 mt-16">
          <a href="#profile" className="flex flex-col items-center text-zinc-400 transition-colors hover:text-pink-500">
            <span className="mb-2 text-sm">더 알아보기</span>
            <svg className="h-6 w-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* Profile Card Section */}
      <section id="profile" className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🧒 나를 소개합니다
          </h2>
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-pink-400 to-yellow-300 p-6 text-center text-white">
              <p className="text-2xl font-bold">진유현</p>
              <p className="text-sm opacity-90">Jin Yuhyun</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[
                { label: "나이", value: "9살", icon: "🎂" },
                { label: "학교", value: "청덕초등학교", icon: "🏫" },
                { label: "학년 / 반", value: "2학년 1반", icon: "📚" },
                { label: "좋아하는 것", value: "로블록스", icon: "🎮" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 px-8 py-5">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                      {item.label}
                    </p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Favorites Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🎮 내가 좋아하는 로블록스
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "🏗️",
                title: "건축하기",
                desc: "나만의 멋진 세계를 만들 수 있어요!",
                bg: "from-blue-400 to-cyan-300",
                href: "/building",
              },
              {
                emoji: "🤝",
                title: "친구와 함께",
                desc: "친구들과 같이 플레이하면 더 재밌어요!",
                bg: "from-pink-400 to-rose-300",
                href: "/friends",
              },
              {
                emoji: "🦁",
                title: "우노 게임",
                desc: "AI와 신나는 우노 대결을 해요!",
                bg: "from-red-400 via-yellow-300 to-green-400",
                href: "/onecard",
              },
              {
                emoji: "💥",
                title: "블록 블라스트",
                desc: "블록을 배치하고 줄을 완성하세요!",
                bg: "from-cyan-400 to-purple-500",
                href: "/blockblast",
              },
              {
                emoji: "🎮",
                title: "포켓몬 GO",
                desc: "포켓몬을 찾아 잡으세요!",
                bg: "from-green-400 to-emerald-600",
                href: "/pokemon",
              },
              {
                emoji: "🥷",
                title: "주츠 인피니티",
                desc: "닌자가 되어 주츠를 배우자!",
                bg: "from-red-500 to-orange-500",
                href: "/jutsu",
              },
              {
                emoji: "👁️",
                title: "주술회전",
                desc: "주술사가 되어 저주를 물리치자!",
                bg: "from-indigo-600 to-purple-800",
                href: "/jujutsu",
              },
              {
                emoji: "⛏️",
                title: "마인크래프트",
                desc: "서바이벌 모험을 시작하자!",
                bg: "from-green-500 to-emerald-700",
                href: "/minecraft",
              },
              {
                emoji: "🔪",
                title: "마피아",
                desc: "AI와 함께하는 마피아 게임!",
                bg: "from-gray-700 to-slate-900",
                href: "/mafia",
              },
              {
                emoji: "🐱",
                title: "냥코대전쟁",
                desc: "고양이 군단으로 적을 물리치자!",
                bg: "from-amber-400 to-orange-500",
                href: "/battlecats",
              },
              {
                emoji: "🔫",
                title: "탕탕특공대",
                desc: "자동 슈팅으로 적을 물리치자!",
                bg: "from-red-500 to-orange-500",
                href: "/tangtang",
              },
              {
                emoji: "🎮",
                title: "로블록스",
                desc: "오비, 타이쿤, 배틀, 펫 시뮬!",
                bg: "from-red-400 via-yellow-400 to-green-400",
                href: "/roblox",
              },
              {
                emoji: "🔩",
                title: "나사 빼기",
                desc: "나사를 빼서 판을 떨어뜨려요!",
                bg: "from-gray-400 to-zinc-600",
                href: "/screw",
              },
              {
                emoji: "🔴",
                title: "세포특공대",
                desc: "세포를 배치해 바이러스를 막자!",
                bg: "from-red-500 to-rose-600",
                href: "/cell",
              },
              {
                emoji: "🚪",
                title: "도어즈",
                desc: "호텔에서 살아남아 탈출하라!",
                bg: "from-gray-800 to-zinc-950",
                href: "/doors",
              },
              {
                emoji: "🧩",
                title: "퍼즐 게임",
                desc: "2048, 15퍼즐, 매치3, 스도쿠!",
                bg: "from-purple-500 to-pink-500",
                href: "/puzzle",
              },
              {
                emoji: "🐱",
                title: "고양이 지키기",
                desc: "타워를 세워 고양이를 지켜라!",
                bg: "from-amber-400 to-orange-500",
                href: "/catguard",
              },
              {
                emoji: "🥋",
                title: "태권도",
                desc: "대련하고 띠를 승급하자!",
                bg: "from-red-600 to-orange-500",
                href: "/taekwondo",
              },
              {
                emoji: "👀",
                title: "눈치 게임",
                desc: "눈치껏 숫자를 외치자!",
                bg: "from-emerald-500 to-cyan-500",
                href: "/nunchi",
              },
              {
                emoji: "👏",
                title: "369 게임",
                desc: "3, 6, 9가 나오면 박수!",
                bg: "from-red-500 via-orange-500 to-yellow-500",
                href: "/369",
              },
              {
                emoji: "💪",
                title: "팔씨름",
                desc: "빠르게 클릭해서 이겨라!",
                bg: "from-amber-500 to-red-500",
                href: "/armwrestle",
              },
              {
                emoji: "🔪",
                title: "칼 게임",
                desc: "손가락 사이를 찔러라!",
                bg: "from-slate-600 to-red-600",
                href: "/knife",
              },
              {
                emoji: "⚔️",
                title: "검투사",
                desc: "아레나에서 최강이 되어라!",
                bg: "from-amber-600 to-red-600",
                href: "/gladiator",
              },
              {
                emoji: "🍎",
                title: "사과 깎기",
                desc: "끊기지 않게 사과를 깎아라!",
                bg: "from-red-500 to-green-500",
                href: "/apple",
              },
              {
                emoji: "🔨",
                title: "검 강화",
                desc: "최강의 검을 만들어라!",
                bg: "from-amber-500 to-orange-600",
                href: "/forge",
              },
              {
                emoji: "👨‍🍳",
                title: "요리왕",
                desc: "최고의 요리사가 되어라!",
                bg: "from-orange-500 to-red-500",
                href: "/cooking",
              },
              {
                emoji: "🏄",
                title: "서핑",
                desc: "파도를 타고 장애물을 피해라!",
                bg: "from-cyan-500 to-blue-500",
                href: "/surfing",
              },
              {
                emoji: "🎵",
                title: "리듬게임",
                desc: "리듬에 맞춰 노트를 쳐라!",
                bg: "from-pink-500 via-purple-500 to-cyan-500",
                href: "/rhythm",
              },
              {
                emoji: "🍦",
                title: "아이스크림 가게",
                desc: "주문에 맞게 아이스크림 만들기!",
                bg: "from-pink-400 to-purple-500",
                href: "/icecream",
              },
              {
                emoji: "🏃",
                title: "형한테서 도망치기",
                desc: "형한테 잡히기 전에 탈출해!",
                bg: "from-orange-500 to-red-500",
                href: "/runaway",
              },
              {
                emoji: "🤚",
                title: "엄마의 등짝 스매싱",
                desc: "엄마의 공격을 피해라!",
                bg: "from-red-500 to-pink-500",
                href: "/momsmash",
              },
              {
                emoji: "🤖",
                title: "로봇 합체",
                desc: "로봇을 합체해서 최강을 만들어라!",
                bg: "from-cyan-500 to-blue-500",
                href: "/robotmerge",
              },
              {
                emoji: "🪐",
                title: "행성 키우기",
                desc: "행성을 합쳐서 은하를 만들어라!",
                bg: "from-purple-500 to-cyan-500",
                href: "/planet",
              },
              {
                emoji: "🏫",
                title: "학교 가기",
                desc: "늦지 않게 학교에 도착하자!",
                bg: "from-sky-400 to-blue-500",
                href: "/school",
              },
              {
                emoji: "🚘",
                title: "차 피하기",
                desc: "달려오는 차를 피해 멀리 가자!",
                bg: "from-yellow-500 to-red-500",
                href: "/cardodge",
              },
              {
                emoji: "🕵️",
                title: "아빠 몰래 게임해라",
                desc: "들키지 않게 게임하자!",
                bg: "from-green-500 to-emerald-500",
                href: "/secretgame",
              },
              {
                emoji: "💆",
                title: "아빠 주물러주기",
                desc: "아빠 근육을 풀어줘!",
                bg: "from-amber-500 to-orange-500",
                href: "/massage",
              },
              {
                emoji: "🍞",
                title: "빵 먹기",
                desc: "떨어지는 빵을 먹어라!",
                bg: "from-amber-400 to-orange-400",
                href: "/bread",
              },
              {
                emoji: "🦸",
                title: "히어로 되기",
                desc: "히어로가 되어 세상을 구해라!",
                bg: "from-amber-500 to-red-500",
                href: "/hero",
              },
              {
                emoji: "🎰",
                title: "히어로 뽑기",
                desc: "최강의 히어로를 모아라!",
                bg: "from-indigo-500 to-purple-500",
                href: "/herogacha",
              },
              {
                emoji: "🖥️",
                title: "컴퓨터 만들기",
                desc: "최강의 게이밍 PC를 조립하라!",
                bg: "from-gray-600 to-blue-600",
                href: "/computer",
              },
              {
                emoji: "🍉",
                title: "수박 만들기",
                desc: "같은 과일을 합쳐서 수박을 만들어라!",
                bg: "from-green-500 to-yellow-400",
                href: "/watermelon",
              },
              {
                emoji: "🧵",
                title: "실뜨기",
                desc: "손가락에 실을 걸어 멋진 모양을 만들자!",
                bg: "from-indigo-500 to-purple-500",
                href: "/catscradle",
              },
              {
                emoji: "🍚",
                title: "밥 먹이기",
                desc: "떨어지는 음식을 받아서 아이에게 먹여주세요!",
                bg: "from-yellow-400 to-orange-400",
                href: "/feeding",
              },
              {
                emoji: "📱",
                title: "앱 만들기",
                desc: "나만의 앱을 개발하고 출시하자!",
                bg: "from-indigo-400 to-purple-500",
                href: "/appmaker",
              },
              {
                emoji: "😈",
                title: "형 괴롭히기",
                desc: "들키지 않게 형을 괴롭혀라!",
                bg: "from-orange-400 to-red-500",
                href: "/annoybro",
              },
              {
                emoji: "👻",
                title: "동생 놀래키기",
                desc: "다양한 방법으로 동생을 놀래켜라!",
                bg: "from-purple-500 to-indigo-600",
                href: "/scaresis",
              },
              {
                emoji: "⚔️",
                title: "RPG 모험",
                desc: "직업을 골라 마왕을 물리쳐라!",
                bg: "from-indigo-500 to-purple-600",
                href: "/rpg",
              },
              {
                emoji: "🌍",
                title: "세상 창조하기",
                desc: "원소를 조합해서 세상을 만들자!",
                bg: "from-blue-500 to-green-500",
                href: "/worldcreator",
              },
              {
                emoji: "⭐",
                title: "별 진화시키기",
                desc: "우주 먼지에서 블랙홀까지 별을 키워라!",
                bg: "from-yellow-500 to-purple-600",
                href: "/starevolution",
              },
              {
                emoji: "📺",
                title: "아빠한테 리모콘 빼앗기",
                desc: "아빠 몰래 리모콘을 빼앗아라!",
                bg: "from-blue-600 to-indigo-700",
                href: "/remotedad",
              },
              {
                emoji: "🦷",
                title: "치과의사",
                desc: "환자의 이를 치료해주세요!",
                bg: "from-cyan-500 to-teal-600",
                href: "/dentist",
              },
              {
                emoji: "🧸",
                title: "파피 플레이타임",
                desc: "버려진 장난감 공장에서 살아남아라!",
                bg: "from-red-600 to-indigo-900",
                href: "/poppy",
              },
              {
                emoji: "🏗️",
                title: "건축 퍼즐",
                desc: "블록을 쌓아 멋진 건물을 지어라!",
                bg: "from-emerald-500 to-teal-600",
                href: "/architect",
              },
              {
                emoji: "🪵",
                title: "젠가",
                desc: "블록을 빼도 무너지지 않게!",
                bg: "from-amber-500 to-orange-600",
                href: "/jenga",
              },
              {
                emoji: "🎮",
                title: "프로게이머",
                desc: "세계 최고의 프로게이머가 되자!",
                bg: "from-purple-600 to-indigo-800",
                href: "/progamer",
              },
              {
                emoji: "🔴",
                title: "피구왕",
                desc: "공을 던지고 피하고 잡아라!",
                bg: "from-red-500 to-orange-600",
                href: "/dodgeball",
              },
              {
                emoji: "💩",
                title: "똥 대작전",
                desc: "최고의 똥을 만들어라!",
                bg: "from-amber-600 to-yellow-800",
                href: "/poop",
              },
              {
                emoji: "🛁",
                title: "씻기 싫어! 떼쓰기",
                desc: "엄마한테 안 씻겠다고 떼써라!",
                bg: "from-cyan-500 to-blue-700",
                href: "/nobath",
              },
              {
                emoji: "🤐",
                title: "아빠 입막기",
                desc: "날아오는 잔소리를 막아라!",
                bg: "from-gray-600 to-slate-800",
                href: "/shutdad",
              },
              {
                emoji: "🧒",
                title: "나의 하루",
                desc: "현실적인 초등학생 생활 시뮬레이션!",
                bg: "from-sky-400 to-green-300",
                href: "/reallife",
              },
              {
                emoji: "🦸",
                title: "히어로 만들기",
                desc: "나만의 히어로를 만들고 빌런과 싸워라!",
                bg: "from-indigo-600 to-purple-800",
                href: "/herocreator",
              },
              {
                emoji: "🪑",
                title: "가구 만들기",
                desc: "나만의 가구를 직접 만들자!",
                bg: "from-amber-600 to-stone-800",
                href: "/furniture",
              },
              {
                emoji: "📱",
                title: "게임 개발자",
                desc: "앱을 만들고 직접 플레이하자!",
                bg: "from-violet-600 to-indigo-800",
                href: "/gamedev",
              },
              {
                emoji: "🌍",
                title: "언어 만들기",
                desc: "나만의 글자, 단어, 문법을 만들자!",
                bg: "from-purple-600 to-red-800",
                href: "/language",
              },
              {
                emoji: "🔪",
                title: "어몽어스",
                desc: "임포스터를 찾아라!",
                bg: "from-red-600 to-indigo-900",
                href: "/amongus",
              },
              {
                emoji: "🐍",
                title: "스네이크",
                desc: "먹고, 자라고, 살아남아라!",
                bg: "from-green-600 to-emerald-900",
                href: "/snake",
              },
              {
                emoji: "🔌",
                title: "전선 연결하기",
                desc: "같은 색 전선을 연결하라!",
                bg: "from-yellow-500 via-red-500 to-blue-500",
                href: "/wire",
              },
              {
                emoji: "🏃",
                title: "탈출하기",
                desc: "감옥에서 탈출하라!",
                bg: "from-red-600 via-gray-900 to-orange-600",
                href: "/escape",
              },
              {
                emoji: "💥",
                title: "부부싸움 막기",
                desc: "엄마 아빠 싸움을 막아라!",
                bg: "from-pink-500 via-red-500 to-orange-500",
                href: "/parentfight",
              },
              {
                emoji: "👑",
                title: "왕 되기",
                desc: "농부에서 황제가 되어라!",
                bg: "from-yellow-600 via-amber-600 to-orange-600",
                href: "/king",
              },
              {
                emoji: "🧱",
                title: "레고 조립하기",
                desc: "블록으로 멋진 작품을 만들자!",
                bg: "from-red-500 via-yellow-500 to-blue-500",
                href: "/lego",
              },
              {
                emoji: "⚔️",
                title: "검 만들기",
                desc: "최강의 검을 제작하라!",
                bg: "from-gray-800 via-orange-900 to-gray-900",
                href: "/swordcraft",
              },
              {
                emoji: "🧹",
                title: "엄마 청소 못하게",
                desc: "방을 어지럽혀라!",
                bg: "from-pink-500 via-yellow-500 to-green-500",
                href: "/stopmomclean",
              },
              {
                emoji: "💎",
                title: "귀한 물건 만들기",
                desc: "원소를 조합해 보물을 만들자!",
                bg: "from-purple-600 via-indigo-600 to-amber-500",
                href: "/precious",
              },
              {
                emoji: "💾",
                title: "USB 만들기",
                desc: "나만의 USB를 제작하자!",
                bg: "from-gray-700 via-blue-800 to-gray-900",
                href: "/usb",
              },
              {
                emoji: "🤖",
                title: "AI 만들기",
                desc: "나만의 AI를 훈련시키자!",
                bg: "from-gray-900 via-cyan-800 to-gray-900",
                href: "/aimaker",
              },
              {
                emoji: "📸",
                title: "사진 찍기",
                desc: "최고의 순간을 포착하라!",
                bg: "from-sky-400 via-blue-500 to-purple-500",
                href: "/photo",
              },
              {
                emoji: "🚗",
                title: "자동차 만들기",
                desc: "나만의 드림카를 제작하라!",
                bg: "from-gray-700 via-red-600 to-gray-800",
                href: "/carmaker",
              },
              {
                emoji: "🎲",
                title: "랜덤 게임",
                desc: "어떤 게임이 나올까?!",
                bg: "from-purple-600 via-pink-500 to-indigo-600",
                href: "/randomgame",
              },
              {
                emoji: "🧒",
                title: "소개 페이지 게임",
                desc: "진유현을 알아가는 모험!",
                bg: "from-pink-400 via-blue-400 to-yellow-400",
                href: "/introgame",
              },
              {
                emoji: "🟦",
                title: "테트리스",
                desc: "블록을 쌓아 줄을 없애라!",
                bg: "from-gray-900 via-indigo-800 to-gray-900",
                href: "/tetris",
              },
              {
                emoji: "🍄",
                title: "마리오",
                desc: "점프하고 코인 모아라!",
                bg: "from-sky-400 via-blue-500 to-sky-400",
                href: "/mario",
              },
              {
                emoji: "🟡",
                title: "팩맨",
                desc: "도트를 먹고 유령을 피해라!",
                bg: "from-indigo-900 via-blue-900 to-indigo-900",
                href: "/pacman",
              },
              {
                emoji: "🏊",
                title: "수영",
                desc: "경주하고 다이빙하자!",
                bg: "from-cyan-500 via-blue-500 to-cyan-600",
                href: "/swimming",
              },
              {
                emoji: "👵",
                title: "할머니한테서 도망치기",
                desc: "할머니를 피해 숨어라!",
                bg: "from-amber-700 via-orange-800 to-stone-800",
                href: "/rungrandma",
              },
              {
                emoji: "📱",
                title: "핸드폰 만들기",
                desc: "나만의 스마트폰을 만들자!",
                bg: "from-gray-800 via-slate-700 to-gray-900",
                href: "/phonemaker",
              },
              {
                emoji: "✨",
                title: "신 되기",
                desc: "우주를 창조하는 신이 되자!",
                bg: "from-purple-900 via-indigo-900 to-yellow-700",
                href: "/god",
              },
              {
                emoji: "🥷",
                title: "닌자고",
                desc: "스핀짓주로 닌자고를 구해라!",
                bg: "from-gray-900 via-red-900 to-gray-900",
                href: "/ninjago",
              },
              {
                emoji: "🦕",
                title: "다이노스터",
                desc: "공룡을 모으고 배틀하자!",
                bg: "from-green-900 via-emerald-800 to-gray-900",
                href: "/dinostar",
              },
            ].map((item) => {
              const Card = (
                <div
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-center shadow-md transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer"
                >
                  <div className={`bg-gradient-to-br ${item.bg} py-8 text-5xl`}>
                    {item.emoji}
                  </div>
                  <div className="p-5">
                    <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
              return item.href ? (
                <Link key={item.title} href={item.href}>{Card}</Link>
              ) : (
                <div key={item.title}>{Card}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fun Facts Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            ✨ 재미있는 사실
          </h2>
          <div className="space-y-4">
            {[
              { emoji: "📖", text: "청덕초등학교 2학년 1반에서 열심히 공부하고 있어요" },
              { emoji: "🎮", text: "로블록스에서 새로운 게임을 발견하는 것을 좋아해요" },
              { emoji: "💻", text: "이 멋진 웹페이지는 제 소개를 위해 만들었어요" },
              { emoji: "😊", text: "항상 밝고 즐겁게 생활하고 있어요" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-5 shadow-sm transition-colors hover:bg-pink-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-zinc-700 dark:text-zinc-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white/50 px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-5xl text-center text-sm text-zinc-400 dark:text-zinc-500">
          <p className="mb-1">진유현의 자기소개 페이지</p>
          <p>&copy; 2026 Yuhyun Jin. Made with ❤️</p>
        </div>
      </footer>
    </div>
  );
}
