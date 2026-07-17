"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  courage: number;
  wisdom: number;
  charm: number;
  luck: number;
}

interface Choice {
  text: string;
  next: string;
  statChanges?: Partial<Stats>;
}

interface Scene {
  id: string;
  bg: string;
  character: string;
  characterName: string;
  npc?: string;
  npcName?: string;
  text: string;
  choices?: Choice[];
  ending?: string;
  endingTitle?: string;
  endingDesc?: string;
  mood?: string;
}

interface StoryData {
  id: string;
  title: string;
  emoji: string;
  genre: string;
  difficulty: string;
  time: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  scenes: Record<string, Scene>;
  startScene: string;
  endings: string[];
}

// ─── Story Data ──────────────────────────────────────────────────────────────

const STORIES: Record<string, StoryData> = {
  hero: {
    id: "hero",
    title: "슈퍼 유현",
    emoji: "🦸",
    genre: "히어로물",
    difficulty: "⭐⭐",
    time: "5분",
    color: "from-red-500 to-yellow-500",
    gradientFrom: "#ef4444",
    gradientTo: "#eab308",
    startScene: "h1",
    endings: ["전설의 히어로", "그림자 히어로", "은퇴한 히어로", "빌런이 된 히어로"],
    scenes: {
      h1: {
        id: "h1", bg: "from-blue-200 to-blue-400", character: "😲", characterName: "유현",
        npc: "✋✨", npcName: "",
        text: "평범한 하루... 학교에서 수업을 듣고 있는데, 갑자기 손에서 빛이 나온다! 눈부신 빛이 교실을 비추고, 모두가 놀란 눈으로 쳐다본다. 이 힘... 어떻게 해야 하지?!",
        choices: [
          { text: "🤫 숨긴다", next: "h2a", statChanges: { wisdom: 2 } },
          { text: "🤝 친구에게 보여준다", next: "h2b", statChanges: { charm: 2 } },
          { text: "🏫 선생님한테 말한다", next: "h2c", statChanges: { wisdom: 1, courage: 1 } },
        ],
      },
      h2a: {
        id: "h2a", bg: "from-gray-600 to-gray-800", character: "😰", characterName: "유현",
        npc: "😈", npcName: "???",
        text: "아무도 모르게 방과후 혼자 학교 옥상에서 힘을 연습한다. 빛을 자유자재로 다룰 수 있게 되었을 때... 건물 뒤에서 수상한 그림자가 보인다! 도시를 파괴하려는 빌런이다!",
        choices: [
          { text: "⚔️ 싸운다!", next: "h3_fight", statChanges: { courage: 3 } },
          { text: "🏃 도망친다", next: "h3_run", statChanges: { luck: 2 } },
          { text: "📞 경찰에 신고", next: "h3_police", statChanges: { wisdom: 2 } },
        ],
      },
      h2b: {
        id: "h2b", bg: "from-pink-300 to-purple-400", character: "😎", characterName: "유현",
        npc: "📱😆", npcName: "친구",
        text: "가장 친한 친구에게 보여줬더니... \"야 이거 대박이다!!\" 친구가 SNS에 올렸다! 순식간에 100만 뷰! 사람들이 '빛의 히어로'라고 부르기 시작한다! 유명해졌다!",
        choices: [
          { text: "🦸 히어로 활동 시작!", next: "h3_famous", statChanges: { courage: 2, charm: 2 } },
          { text: "🕵️ 숨어서 활동한다", next: "h3_shadow", statChanges: { wisdom: 2, luck: 1 } },
        ],
      },
      h2c: {
        id: "h2c", bg: "from-green-200 to-green-400", character: "😊", characterName: "유현",
        npc: "👨‍🏫", npcName: "선생님",
        text: "선생님에게 말씀드렸더니 놀라시면서 \"이건 비밀로 하자. 하지만 네 힘을 좋은 곳에 쓸 수 있을 거야.\" 선생님이 비밀 훈련을 도와준다! 알고 보니 선생님도 은퇴한 히어로?!",
        choices: [
          { text: "💪 훈련에 집중!", next: "h3_train", statChanges: { courage: 2, wisdom: 2 } },
          { text: "🤔 선생님의 과거가 궁금해", next: "h3_past", statChanges: { wisdom: 3 } },
        ],
      },
      h3_fight: {
        id: "h3_fight", bg: "from-red-500 to-orange-500", character: "😤", characterName: "유현",
        npc: "👿", npcName: "빌런",
        text: "용기를 내어 빌런에게 맞선다! \"이 도시는 내가 지킨다!\" 빛의 힘으로 공격하지만 빌런도 만만치 않다. 어둠의 힘이 밀려온다! 최종 대결이 시작된다!",
        choices: [
          { text: "💥 정면 대결!", next: "h4_direct", statChanges: { courage: 3 } },
          { text: "🧠 함정 설치!", next: "h4_trap", statChanges: { wisdom: 3 } },
          { text: "🛡️ 시민 대피 우선!", next: "h4_save", statChanges: { charm: 3 } },
        ],
      },
      h3_run: {
        id: "h3_run", bg: "from-yellow-300 to-orange-400", character: "😨", characterName: "유현",
        npc: "📰", npcName: "",
        text: "도망쳤지만... 다음 날 뉴스에서 빌런이 도시를 공격했다는 소식을 본다. 나만 막을 수 있는데... 양심의 가책이 든다. 돌아가야 할까?",
        choices: [
          { text: "🔥 돌아간다!", next: "h4_return", statChanges: { courage: 4 } },
          { text: "😔 포기한다...", next: "end_retired", statChanges: { luck: -1 } },
        ],
      },
      h3_police: {
        id: "h3_police", bg: "from-blue-400 to-blue-600", character: "🤝", characterName: "유현",
        npc: "👮", npcName: "경찰관",
        text: "경찰에 신고했지만 믿어주지 않는다. \"초능력이 있다고? 장난치지 마!\" 하지만 곧 빌런이 나타나고... 경찰도 당할 수 없다. 결국 내가 나서야 한다!",
        choices: [
          { text: "⚡ 나선다!", next: "h4_direct", statChanges: { courage: 3 } },
          { text: "🤝 경찰과 협력", next: "h4_coop", statChanges: { wisdom: 2, charm: 2 } },
        ],
      },
      h3_famous: {
        id: "h3_famous", bg: "from-yellow-400 to-pink-400", character: "🦸", characterName: "빛의 히어로 유현",
        npc: "📸", npcName: "기자들",
        text: "히어로로 유명해진 유현! 매일 사건을 해결하고, 팬이 생기고, 인터뷰도 한다! 하지만... 빌런이 유현의 정체를 알아내고 학교를 공격한다! 모두가 위험해!",
        choices: [
          { text: "💥 정면 대결!", next: "h4_direct", statChanges: { courage: 3 } },
          { text: "🛡️ 친구들을 먼저 지킨다!", next: "h4_save", statChanges: { charm: 3, courage: 1 } },
        ],
      },
      h3_shadow: {
        id: "h3_shadow", bg: "from-indigo-600 to-purple-800", character: "🕵️", characterName: "그림자 히어로",
        npc: "🌙", npcName: "",
        text: "정체를 숨기고 밤에만 활동하는 그림자 히어로! 아무도 내 정체를 모른다. 범죄율이 떨어지고, 사람들은 수호천사가 있다고 믿기 시작한다. 하지만 빌런이 도전장을 내밀었다!",
        choices: [
          { text: "🌙 그림자 전술로 싸운다", next: "h4_stealth", statChanges: { wisdom: 3, luck: 1 } },
          { text: "☀️ 정체를 드러낸다", next: "h4_direct", statChanges: { courage: 3, charm: 1 } },
        ],
      },
      h3_train: {
        id: "h3_train", bg: "from-emerald-400 to-teal-500", character: "💪", characterName: "유현",
        npc: "👨‍🏫", npcName: "선생님",
        text: "선생님의 특훈! 빛을 검처럼 만들기, 방패 만들기, 순간이동까지! 엄청 강해졌다! 그때 빌런이 학교를 습격! 선생님이 \"이제 네가 나설 차례다!\" 라고 한다!",
        choices: [
          { text: "⚔️ 배운 모든 것을 사용!", next: "h4_mastery", statChanges: { courage: 2, wisdom: 2 } },
          { text: "🤝 선생님과 함께 싸운다", next: "h4_coop", statChanges: { charm: 2, courage: 2 } },
        ],
      },
      h3_past: {
        id: "h3_past", bg: "from-amber-300 to-orange-500", character: "🤔", characterName: "유현",
        npc: "👨‍🏫😢", npcName: "선생님",
        text: "선생님의 과거... 20년 전, 선생님도 히어로였다! 그리고 지금의 빌런은... 선생님의 옛 친구였다?! \"우리는 같은 실험에서 힘을 얻었지... 그가 어둠에 빠진 건 내 탓이야.\" 빌런의 약점을 알게 되었다!",
        choices: [
          { text: "💡 약점을 이용한다!", next: "h4_weakness", statChanges: { wisdom: 4 } },
          { text: "💝 빌런을 설득한다", next: "h4_persuade", statChanges: { charm: 4 } },
        ],
      },
      h4_direct: {
        id: "h4_direct", bg: "from-red-600 to-yellow-500", character: "🦸‍♂️", characterName: "유현",
        npc: "👿💀", npcName: "다크 셰도우",
        text: "\"다크 셰도우! 오늘이 마지막이다!\" 빛의 힘을 최대로 끌어올린다! 거대한 빛의 검이 만들어지고, 어둠과 빛이 충돌! 도시 전체가 빛난다! 최후의 일격!!!",
        choices: [
          { text: "☀️ 빛의 폭발!!!", next: "end_legend", statChanges: { courage: 2 } },
          { text: "🤝 \"같이 끝내자\" 빌런에게 손을 내밀다", next: "end_villain_friend", statChanges: { charm: 3 } },
        ],
      },
      h4_trap: {
        id: "h4_trap", bg: "from-purple-500 to-indigo-600", character: "🧠✨", characterName: "유현",
        npc: "😈❓", npcName: "다크 셰도우",
        text: "머리를 쓴다! 빛으로 빌런을 유인하고, 거울로 빛을 반사시키는 함정을 만든다! 빌런이 함정에 빠졌다! \"뭐... 뭐야 이건!\" 빛의 감옥에 갇힌 빌런!",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "지혜와 용기로 빌런을 물리친 유현! 사람들은 너를 '빛의 수호자'라고 부른다. 이제 이 도시는 안전하다! 하지만 새로운 모험은 계속된다...",
      },
      h4_save: {
        id: "h4_save", bg: "from-sky-400 to-blue-500", character: "🛡️✨", characterName: "유현",
        npc: "👨‍👩‍👧‍👦", npcName: "시민들",
        text: "싸움보다 중요한 건 사람들! 빛의 방패로 시민들을 지키면서 대피시킨다. 모두가 안전해지자, 빌런에게 전력으로 맞선다! 시민들의 응원이 힘이 된다! \"유현 화이팅!!!\"",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "시민을 지키는 진정한 히어로! 모두의 응원 속에 빌런을 물리치고, 도시의 수호자가 된 유현. 매일 시민들이 감사 인사를 한다. 진정한 영웅이란 사람들을 지키는 것!",
      },
      h4_return: {
        id: "h4_return", bg: "from-orange-500 to-red-600", character: "😤🔥", characterName: "유현",
        npc: "👿", npcName: "빌런",
        text: "도망쳤지만 다시 돌아왔다! \"도망치는 건 이제 끝이야!\" 두려움을 이기고 빌런에게 맞선다! 처음엔 밀리지만, 포기하지 않는 마음이 더 강한 빛을 만든다!",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "두려움을 이겨낸 진짜 용기! 한 번 도망쳤지만, 다시 돌아온 유현. 그 용기가 가장 밝은 빛을 만들어냈다. 이제 어떤 어둠도 두렵지 않다!",
      },
      h4_coop: {
        id: "h4_coop", bg: "from-blue-400 to-green-400", character: "🤝", characterName: "유현",
        npc: "👮👨‍🏫🦸", npcName: "팀",
        text: "혼자가 아니야! 선생님, 경찰, 그리고 나. 팀을 이뤄 빌런에 맞선다! 선생님이 방어, 경찰이 시민 대피, 나는 공격! 완벽한 팀워크로 빌런을 물리친다!",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "팀워크의 승리! 혼자가 아닌 함께여서 이길 수 있었다. 유현은 히어로 팀의 리더가 되어 도시를 지키게 되었다. 진짜 히어로는 혼자가 아니야!",
      },
      h4_stealth: {
        id: "h4_stealth", bg: "from-indigo-800 to-black", character: "🕵️✨", characterName: "그림자 히어로",
        npc: "👿😵", npcName: "빌런",
        text: "어둠 속에서 빛이 가장 빛난다! 그림자처럼 움직이며 빌런의 약점을 찾아낸다. 빌런이 쓰러졌지만, 아무도 내 정체를 모른다. 그게 좋다. 나는 그림자 히어로니까.",
        ending: "그림자 히어로",
        endingTitle: "🌙 그림자 히어로",
        endingDesc: "아무도 정체를 모르는 수수께끼의 히어로! 밤마다 도시를 지키는 그림자. 사람들은 수호천사라 부르지만 내 정체는 영원한 비밀. 이것이 나의 길.",
      },
      h4_mastery: {
        id: "h4_mastery", bg: "from-yellow-400 to-white", character: "🦸‍♂️⚔️", characterName: "유현",
        npc: "👿💥", npcName: "다크 셰도우",
        text: "빛의 검, 빛의 방패, 빛의 순간이동! 모든 기술을 사용해 빌런을 압도한다! \"이 힘은 선생님이 가르쳐 주셨어! 좋은 곳에 쓰는 거다!\" 최종 기술: 빛의 봉인!!!",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "스승의 가르침으로 최강의 히어로가 된 유현! 빌런을 봉인하고, 다음 세대 히어로를 가르치게 된다. 전설은 계속된다!",
      },
      h4_weakness: {
        id: "h4_weakness", bg: "from-emerald-400 to-yellow-400", character: "🧠💡", characterName: "유현",
        npc: "👿😰", npcName: "다크 셰도우",
        text: "빌런의 약점... 그것은 빛이 아니라 '우정'이었다! 옛날 선생님과의 추억을 보여주자 빌런이 멈칫한다. \"그때... 우리...\" 어둠이 조금씩 사라진다!",
        choices: [
          { text: "💝 \"아직 늦지 않았어\"", next: "end_villain_friend", statChanges: { charm: 3 } },
          { text: "⚔️ 틈을 노려 공격!", next: "end_legend", statChanges: { courage: 2 } },
        ],
      },
      h4_persuade: {
        id: "h4_persuade", bg: "from-pink-300 to-purple-400", character: "😊💝", characterName: "유현",
        npc: "👿😢", npcName: "다크 셰도우",
        text: "\"싸우고 싶지 않아! 선생님이 말해줬어, 너도 원래는 좋은 사람이었다고!\" 빌런의 눈에서 눈물이... \"그... 그래... 나도... 영웅이 되고 싶었어...\"",
        ending: "빌런이 된 히어로",
        endingTitle: "🤝 빌런과 친구",
        endingDesc: "싸움이 아닌 마음으로 이겼다! 빌런은 다시 선한 마음을 되찾고, 선생님과 재회한다. 유현, 선생님, 그리고 옛 빌런... 셋이서 새로운 히어로 팀을 만들었다!",
      },
      end_legend: {
        id: "end_legend", bg: "from-yellow-300 to-amber-500",
        character: "🦸‍♂️🏆", characterName: "전설의 히어로 유현",
        text: "",
        ending: "전설의 히어로",
        endingTitle: "🏆 전설의 히어로",
        endingDesc: "빛의 힘으로 세상을 지키는 전설! 모든 어둠을 밝히는 희망의 빛, 유현! 이 도시의 수호자로서 전설은 영원히 계속된다!",
      },
      end_villain_friend: {
        id: "end_villain_friend", bg: "from-pink-400 to-purple-500",
        character: "🦸‍♂️🤝👿", characterName: "유현",
        text: "",
        ending: "빌런이 된 히어로",
        endingTitle: "💜 반전: 빌런과 친구",
        endingDesc: "적이었던 빌런과 친구가 되다! 가장 어려운 승리는 싸움이 아닌 이해였다. 유현은 모두에게 두 번째 기회를 주는 히어로가 되었다.",
      },
      end_retired: {
        id: "end_retired", bg: "from-gray-400 to-gray-600",
        character: "😔", characterName: "유현",
        text: "",
        ending: "은퇴한 히어로",
        endingTitle: "😔 은퇴한 히어로",
        endingDesc: "힘이 있어도 용기가 없으면 히어로가 될 수 없다. 유현은 평범한 일상으로 돌아갔지만, 가끔 하늘을 올려다보며 생각한다. '그때 돌아갔으면...' 하고.",
      },
    },
  },
  fantasy: {
    id: "fantasy",
    title: "마법학교 입학",
    emoji: "🧙",
    genre: "판타지물",
    difficulty: "⭐⭐⭐",
    time: "7분",
    color: "from-purple-500 to-indigo-500",
    gradientFrom: "#a855f7",
    gradientTo: "#6366f1",
    startScene: "f1",
    endings: ["대마법사", "마법 교수", "마왕 처치 영웅", "마왕과 친구"],
    scenes: {
      f1: {
        id: "f1", bg: "from-purple-300 to-indigo-400", character: "😃", characterName: "유현",
        npc: "🦉✉️", npcName: "부엉이",
        text: "어느 날, 창문을 두드리는 부엉이! 편지를 물고 있다. '유현 학생, 마법학교 합격을 축하합니다!' 마법학교에 도착하니 기숙사를 골라야 한다!",
        choices: [
          { text: "🔥 불의 기숙사", next: "f2_fire", statChanges: { courage: 2 } },
          { text: "💧 물의 기숙사", next: "f2_water", statChanges: { wisdom: 2 } },
          { text: "💨 바람의 기숙사", next: "f2_wind", statChanges: { luck: 2 } },
          { text: "🌿 땅의 기숙사", next: "f2_earth", statChanges: { charm: 2 } },
        ],
      },
      f2_fire: {
        id: "f2_fire", bg: "from-red-400 to-orange-500", character: "😅🔥", characterName: "유현",
        npc: "👨‍🏫🔥", npcName: "불꽃 교수",
        text: "불의 기숙사! 첫 수업은 파이어볼! 주문을 외우는데... \"파이어... 볼!\" ...폭발! 교실 천장에 구멍이! 교수님 머리카락에 불이 붙었다! 어떡하지?!",
        choices: [
          { text: "😂 웃으며 넘긴다", next: "f3_laugh", statChanges: { charm: 2, luck: 1 } },
          { text: "🏃 도망간다!", next: "f3_run", statChanges: { luck: 2 } },
          { text: "🔥 다시 시도!", next: "f3_retry", statChanges: { courage: 3 } },
        ],
      },
      f2_water: {
        id: "f2_water", bg: "from-cyan-300 to-blue-500", character: "😅💧", characterName: "유현",
        npc: "👩‍🏫💧", npcName: "물결 교수",
        text: "물의 기숙사! 첫 수업에서 물을 조종하는데... \"워터... 볼!\" 물이 너무 많이 나와서 교실이 수영장이 됐다! 친구들이 둥둥 떠다닌다!",
        choices: [
          { text: "😂 같이 수영하자!", next: "f3_laugh", statChanges: { charm: 3 } },
          { text: "🏃 도망!", next: "f3_run", statChanges: { luck: 2 } },
          { text: "💧 다시 시도!", next: "f3_retry", statChanges: { wisdom: 3 } },
        ],
      },
      f2_wind: {
        id: "f2_wind", bg: "from-sky-200 to-blue-400", character: "😅💨", characterName: "유현",
        npc: "👴💨", npcName: "바람 교수",
        text: "바람의 기숙사! 바람 마법을 쓰는데... \"윈드... 블라스트!\" 태풍이 교실에서 일어났다! 모두의 가방과 책이 날아다닌다! 교수님 모자가 하늘 높이!",
        choices: [
          { text: "😂 우하하!", next: "f3_laugh", statChanges: { charm: 2, luck: 1 } },
          { text: "🏃 도망!", next: "f3_run", statChanges: { luck: 2 } },
          { text: "💨 다시!", next: "f3_retry", statChanges: { courage: 2, wisdom: 1 } },
        ],
      },
      f2_earth: {
        id: "f2_earth", bg: "from-green-300 to-emerald-500", character: "😅🌿", characterName: "유현",
        npc: "👩‍🏫🌿", npcName: "자연 교수",
        text: "땅의 기숙사! 식물 마법을 배운다. \"그로우!\" 작은 씨앗에서... 거대한 나무가 교실을 뚫고 자랐다!!! 3층까지 올라갔다! 교수님이 나무 위에 매달려있다!",
        choices: [
          { text: "😂 멋지다!", next: "f3_laugh", statChanges: { charm: 2, luck: 1 } },
          { text: "🏃 도... 도망!", next: "f3_run", statChanges: { luck: 2 } },
          { text: "🌿 다시 도전!", next: "f3_retry", statChanges: { wisdom: 2, courage: 1 } },
        ],
      },
      f3_laugh: {
        id: "f3_laugh", bg: "from-yellow-200 to-pink-300", character: "😄", characterName: "유현",
        npc: "😄😄😄", npcName: "친구들",
        text: "모두 같이 웃었다! 실수해도 괜찮아! 덕분에 친구들이 많이 생겼다. 그날 밤, 기숙사에서 친구들과 이야기하다가... 금지된 숲에서 이상한 소리가 들린다! 으스스...!",
        choices: [
          { text: "🌲 숲으로 들어간다!", next: "f4_forest", statChanges: { courage: 2 } },
          { text: "🏫 선생님한테 알린다", next: "f4_tell", statChanges: { wisdom: 2 } },
          { text: "🤝 친구와 함께 간다!", next: "f4_friends", statChanges: { charm: 2 } },
        ],
      },
      f3_run: {
        id: "f3_run", bg: "from-gray-300 to-blue-300", character: "😰", characterName: "유현",
        npc: "🐱", npcName: "마법 고양이",
        text: "도망치다가 복도에서 말하는 고양이를 만났다! \"야, 실수 좀 하면 어때? 나도 처음엔 생선 대신 바위를 소환했다구.\" 고양이 덕에 기분이 나아졌다. 그런데 금지된 숲에서 소리가...!",
        choices: [
          { text: "🌲 숲으로!", next: "f4_forest", statChanges: { courage: 2 } },
          { text: "🏫 선생님한테!", next: "f4_tell", statChanges: { wisdom: 2 } },
          { text: "🐱 고양이와 함께!", next: "f4_friends", statChanges: { luck: 2 } },
        ],
      },
      f3_retry: {
        id: "f3_retry", bg: "from-amber-300 to-orange-400", character: "😤🔥", characterName: "유현",
        npc: "👨‍🏫👏", npcName: "교수님",
        text: "다시 도전! 이번엔 집중... 집중... 성공! 완벽한 마법! 교수님이 깜짝 놀랐다! \"대단한 재능이야!\" 밤이 되자 금지된 숲에서 이상한 소리가... 궁금하다!",
        choices: [
          { text: "🌲 혼자 들어간다!", next: "f4_forest", statChanges: { courage: 3 } },
          { text: "🏫 선생님한테 알린다", next: "f4_tell", statChanges: { wisdom: 3 } },
          { text: "🤝 친구 데려간다", next: "f4_friends", statChanges: { charm: 2 } },
        ],
      },
      f4_forest: {
        id: "f4_forest", bg: "from-green-800 to-emerald-900", character: "😨", characterName: "유현",
        npc: "🐉✨", npcName: "???",
        text: "어두운 숲 속으로... 나뭇가지가 부러지는 소리, 빛나는 눈들... 그리고 숲 깊은 곳에서... 전설의 생물 아기 드래곤을 발견! 반짝이는 비늘, 큰 눈! 귀엽다!",
        choices: [
          { text: "🤝 친구가 되자!", next: "f5_befriend", statChanges: { charm: 3 } },
          { text: "🏃 도망!", next: "f5_flee", statChanges: { luck: 1 } },
          { text: "📸 사진 찍자!", next: "f5_photo", statChanges: { wisdom: 1 } },
        ],
      },
      f4_tell: {
        id: "f4_tell", bg: "from-amber-400 to-yellow-300", character: "😊", characterName: "유현",
        npc: "👨‍🏫😮", npcName: "교장선생님",
        text: "교장선생님에게 알렸더니 깜짝 놀란다! \"그 소리는... 전설의 생물이 깨어난 것!\" 교장선생님과 함께 숲에 간다. 아기 드래곤이 있다! 교장선생님도 처음 본다고!",
        choices: [
          { text: "🤝 다가간다", next: "f5_befriend", statChanges: { courage: 2, charm: 1 } },
          { text: "📚 연구한다", next: "f5_photo", statChanges: { wisdom: 3 } },
        ],
      },
      f4_friends: {
        id: "f4_friends", bg: "from-green-600 to-teal-700", character: "😄", characterName: "유현",
        npc: "😄😄🐱", npcName: "친구들",
        text: "친구들과 함께 숲에 간다! 다 같이 있으니 안 무섭다! 숲 속에서 반짝이는 것을 발견! 아기 드래곤이다! 친구들 모두 놀란다! \"대박!!!!\"",
        choices: [
          { text: "🤝 다 같이 친구!", next: "f5_befriend", statChanges: { charm: 3, luck: 1 } },
          { text: "📸 인증샷!", next: "f5_photo", statChanges: { charm: 1, luck: 1 } },
        ],
      },
      f5_befriend: {
        id: "f5_befriend", bg: "from-pink-300 to-purple-400", character: "😊🐉", characterName: "유현 & 드래곤",
        npc: "😈💀", npcName: "마왕",
        text: "드래곤과 친구가 됐다! 이름은 '반짝이'! 매일 같이 놀고, 마법 연습도 같이 한다. 그런데 어느 날... 하늘이 어두워지고 마왕이 학교를 습격했다!! \"이 학교를 없애주마!\"",
        choices: [
          { text: "👫 학생들과 힘을 합친다!", next: "f6_unite", statChanges: { charm: 3 } },
          { text: "💪 혼자 맞선다!", next: "f6_solo", statChanges: { courage: 4 } },
          { text: "🐉 반짝이에게 도움 요청!", next: "f6_dragon", statChanges: { luck: 3 } },
        ],
      },
      f5_flee: {
        id: "f5_flee", bg: "from-gray-500 to-gray-700", character: "😨", characterName: "유현",
        npc: "😈", npcName: "마왕",
        text: "도망쳤다! 하지만 며칠 후 마왕이 학교를 습격! 숲의 드래곤이 생각난다. 그때 친구가 됐으면 도움을 받을 수 있었을 텐데... 그래도 싸워야 한다!",
        choices: [
          { text: "👫 학생들과 힘을 합친다!", next: "f6_unite", statChanges: { charm: 2 } },
          { text: "💪 혼자 맞선다!", next: "f6_solo", statChanges: { courage: 3 } },
        ],
      },
      f5_photo: {
        id: "f5_photo", bg: "from-yellow-300 to-amber-400", character: "📸😄", characterName: "유현",
        npc: "🐉😊", npcName: "드래곤",
        text: "드래곤 사진을 찍었다! 근데 드래곤이 카메라에 관심을 보인다. 같이 셀카도 찍고, 점점 친해진다! 연구도 하면서 드래곤에 대해 많이 알게 되었다. 그런데 마왕이 습격!",
        choices: [
          { text: "👫 학생들과 함께!", next: "f6_unite", statChanges: { charm: 2, wisdom: 1 } },
          { text: "🐉 드래곤에게 도움 요청!", next: "f6_dragon", statChanges: { luck: 2, wisdom: 1 } },
        ],
      },
      f6_unite: {
        id: "f6_unite", bg: "from-rainbow to-rainbow", character: "🧙‍♂️🔥💧💨🌿", characterName: "유현 & 친구들",
        npc: "😈💀", npcName: "마왕",
        text: "\"다 같이 힘을 합치자!\" 불, 물, 바람, 땅 기숙사 모두가 하나로! 네 원소의 마법이 합쳐져 무지개 빛 마법이 탄생! 마왕에게 발사! \"이게 우리의 힘이다!!!\"",
        ending: "마왕 처치 영웅",
        endingTitle: "⚔️ 마왕 처치 영웅",
        endingDesc: "모두의 힘을 하나로 모아 마왕을 물리쳤다! 유현은 마법학교의 영웅이 되었고, 졸업 후 전설의 마법사가 되었다. 우정이 가장 강한 마법이라는 걸 배웠다!",
      },
      f6_solo: {
        id: "f6_solo", bg: "from-red-600 to-purple-700", character: "🧙‍♂️✨", characterName: "유현",
        npc: "😈", npcName: "마왕",
        text: "혼자 맞선다! 첫 수업에서 실수했던 그 마법... 이번엔 다르다! 온 힘을 다해 최강의 마법을 쏜다! 마왕이 밀린다! 하지만 나도 쓰러진다... 눈을 뜨니 병실이다.",
        ending: "대마법사",
        endingTitle: "🧙 대마법사",
        endingDesc: "혼자 마왕을 물리친 전설! 회복 후 유현은 역대 최연소 대마법사가 되었다. 모든 원소를 다루는 유일한 마법사. 하지만 가끔 생각한다... 친구들과 함께했으면 덜 아팠을 텐데.",
      },
      f6_dragon: {
        id: "f6_dragon", bg: "from-purple-500 to-pink-500", character: "🧙‍♂️🐉", characterName: "유현 & 반짝이",
        npc: "😈😱", npcName: "마왕",
        text: "\"반짝이, 도와줘!\" 드래곤이 하늘에서 내려온다! 거대한 날개, 빛나는 불꽃! 유현이 드래곤 위에 타고 마왕에게 맞선다! 마왕도 드래곤은 무섭다! \"뭐... 뭐야 저건!\"",
        choices: [
          { text: "🔥 공격!", next: "end_fantasy_hero", statChanges: { courage: 2 } },
          { text: "🤝 \"마왕, 왜 이러는 거야?\"", next: "end_fantasy_friend", statChanges: { charm: 3 } },
        ],
      },
      end_fantasy_hero: {
        id: "end_fantasy_hero", bg: "from-amber-400 to-yellow-300",
        character: "🧙‍♂️🏆", characterName: "영웅 유현",
        text: "",
        ending: "마왕 처치 영웅",
        endingTitle: "⚔️ 마왕 처치 영웅",
        endingDesc: "드래곤과 함께 마왕을 물리쳤다! 유현은 드래곤 기사이자 대마법사가 되었다. 반짝이와 함께 하늘을 날며 세계를 지킨다!",
      },
      end_fantasy_friend: {
        id: "end_fantasy_friend", bg: "from-pink-300 to-purple-300",
        character: "🧙‍♂️🤝😈", characterName: "유현",
        text: "",
        ending: "마왕과 친구",
        endingTitle: "💜 비밀 엔딩: 마왕과 친구",
        endingDesc: "마왕은 사실 외로웠던 거였다! 친구가 없어서 화가 났던 것. 유현이 친구가 되어주자 마왕은 선한 마법사가 되었다. 유현은 마법학교 교수가 되어 '누구와도 친구가 될 수 있다'고 가르친다.",
      },
    },
  },
  mystery: {
    id: "mystery",
    title: "탐정 유현",
    emoji: "🔍",
    genre: "추리물",
    difficulty: "⭐⭐⭐",
    time: "6분",
    color: "from-amber-600 to-yellow-500",
    gradientFrom: "#d97706",
    gradientTo: "#eab308",
    startScene: "m1",
    endings: ["명탐정", "미스터리 작가", "경찰이 된 유현", "범인을 놓침"],
    scenes: {
      m1: {
        id: "m1", bg: "from-amber-200 to-yellow-300", character: "🤔", characterName: "유현",
        npc: "👨‍💼😰", npcName: "교장선생님",
        text: "\"유현아, 큰일났다!\" 교장선생님이 달려온다. 학교 100주년 기념 보물 '황금 종'이 사라졌다! \"네가 학교에서 제일 똑똑하니까... 찾아줄 수 있겠니?\"",
        choices: [
          { text: "🔍 수락합니다!", next: "m2", statChanges: { courage: 1, wisdom: 1 } },
          { text: "😅 저는 좀...", next: "m1b", statChanges: { luck: 1 } },
        ],
      },
      m1b: {
        id: "m1b", bg: "from-amber-200 to-yellow-300", character: "😅", characterName: "유현",
        npc: "👨‍💼🙏", npcName: "교장선생님",
        text: "\"제발!!!! 경찰한테는 비밀로 하고 싶어!!!\" 교장선생님이 매달린다. 이러면 거절 못 하지... ㅋㅋㅋ 결국 수락!",
        choices: [
          { text: "🔍 알겠습니다... (결국 수락)", next: "m2", statChanges: { charm: 1, luck: 1 } },
        ],
      },
      m2: {
        id: "m2", bg: "from-gray-300 to-gray-500", character: "🕵️", characterName: "탐정 유현",
        npc: "👤🧹🎨", npcName: "용의자들",
        text: "용의자 3명을 찾았다! 1) 수상한 전학생 - 어제 밤에 학교에 있었다고? 👤 2) 청소 아저씨 - 모든 방의 열쇠를 가지고 있다! 🧹 3) 미술 선생님 - 황금 종 그림을 그리고 있었다! 🎨",
        choices: [
          { text: "👤 전학생 조사!", next: "m3_student", statChanges: { courage: 2 } },
          { text: "🧹 청소 아저씨 조사!", next: "m3_janitor", statChanges: { wisdom: 2 } },
          { text: "🎨 미술 선생님 조사!", next: "m3_art", statChanges: { wisdom: 1, charm: 1 } },
        ],
      },
      m3_student: {
        id: "m3_student", bg: "from-slate-400 to-gray-600", character: "🕵️", characterName: "유현",
        npc: "👤😰", npcName: "전학생",
        text: "전학생을 조사한다! \"어제 밤에 왜 학교에 있었어?\" \"그... 그건...\" 전학생이 말을 더듬는다. 가방에서 이상한 것 발견! 발자국, 물감 자국, 열쇠... 세 가지 단서!",
        choices: [
          { text: "👟 발자국 추적!", next: "m4_footprint", statChanges: { wisdom: 2 } },
          { text: "🎨 물감 자국 추적!", next: "m4_paint", statChanges: { wisdom: 2 } },
          { text: "🔑 열쇠 조사!", next: "m4_key", statChanges: { wisdom: 2 } },
        ],
      },
      m3_janitor: {
        id: "m3_janitor", bg: "from-green-700 to-green-900", character: "🕵️", characterName: "유현",
        npc: "🧹😊", npcName: "청소 아저씨",
        text: "청소 아저씨를 만난다. \"아저씨, 어젯밤에 이상한 거 못 봤어요?\" \"음... 미술실에서 불이 켜져 있었어. 그리고 이상한 발자국도 있었지.\" 단서를 얻었다!",
        choices: [
          { text: "👟 발자국 추적!", next: "m4_footprint", statChanges: { wisdom: 2, luck: 1 } },
          { text: "🎨 미술실 조사!", next: "m4_paint", statChanges: { wisdom: 3 } },
        ],
      },
      m3_art: {
        id: "m3_art", bg: "from-pink-300 to-red-400", character: "🕵️", characterName: "유현",
        npc: "🎨😅", npcName: "미술 선생님",
        text: "미술 선생님에게 묻는다. \"선생님, 황금 종 그림을 왜 그리고 계셨어요?\" \"아, 그건 기념 전시회 준비야. 근데... 그림을 그리다가 열쇠를 하나 발견했어.\" 수상한 열쇠!",
        choices: [
          { text: "🔑 열쇠 조사!", next: "m4_key", statChanges: { wisdom: 3 } },
          { text: "🎨 미술실 더 조사!", next: "m4_paint", statChanges: { wisdom: 2, charm: 1 } },
        ],
      },
      m4_footprint: {
        id: "m4_footprint", bg: "from-amber-600 to-brown-700", character: "🕵️🔍", characterName: "유현",
        npc: "👟❓", npcName: "",
        text: "발자국을 따라간다! 운동장 → 미술실 → 지하 창고! 발자국은 지하 창고로 이어진다! 문이 살짝 열려있다... 안에서 소리가 난다!",
        choices: [
          { text: "🫣 숨어서 관찰!", next: "m5_observe", statChanges: { wisdom: 3 } },
          { text: "💪 직접 대면!", next: "m5_confront", statChanges: { courage: 3 } },
          { text: "🪤 함정 설치!", next: "m5_trap", statChanges: { wisdom: 2, luck: 2 } },
        ],
      },
      m4_paint: {
        id: "m4_paint", bg: "from-pink-400 to-purple-500", character: "🕵️🎨", characterName: "유현",
        npc: "🖼️❓", npcName: "",
        text: "물감 자국을 따라간다! 미술실 바닥에 빨간 물감 자국이... 물감 자국이 벽의 그림 뒤로! 그림을 옮기니 비밀 통로가 있다!! 지하실로 이어지는 계단!",
        choices: [
          { text: "🫣 조용히 내려간다", next: "m5_observe", statChanges: { wisdom: 3 } },
          { text: "💪 \"거기 누구야!\" 소리친다", next: "m5_confront", statChanges: { courage: 3 } },
          { text: "🪤 입구에 함정!", next: "m5_trap", statChanges: { wisdom: 2, luck: 2 } },
        ],
      },
      m4_key: {
        id: "m4_key", bg: "from-yellow-500 to-amber-600", character: "🕵️🔑", characterName: "유현",
        npc: "🔑✨", npcName: "",
        text: "수상한 열쇠를 조사한다! 열쇠에 'B-07'이라고 적혀있다. 학교 지도를 찾아보니... B-07은 지하 비밀 창고! 아무도 모르는 곳! 범인은 여기에 보물을 숨겼다!",
        choices: [
          { text: "🫣 몰래 가본다", next: "m5_observe", statChanges: { wisdom: 2, luck: 1 } },
          { text: "💪 바로 간다!", next: "m5_confront", statChanges: { courage: 3 } },
          { text: "🪤 함정을 준비!", next: "m5_trap", statChanges: { wisdom: 3 } },
        ],
      },
      m5_observe: {
        id: "m5_observe", bg: "from-gray-700 to-gray-900", character: "🕵️👀", characterName: "유현",
        npc: "🎨😈", npcName: "???",
        text: "숨어서 관찰한다! 어둠 속에서 누군가 황금 종을 닦고 있다. 가까이 보니... 미술 선생님?! \"후후... 이 아름다운 종을 미술관에 전시하면 유명해질 수 있어...\" 범인은 미술 선생님이었다!",
        choices: [
          { text: "📋 증거를 제시한다!", next: "m6_evidence", statChanges: { wisdom: 3 } },
          { text: "🗣️ 자백을 유도한다", next: "m6_confess", statChanges: { charm: 3 } },
          { text: "🏃 도망가는 범인 추격!", next: "m6_chase", statChanges: { courage: 3 } },
        ],
      },
      m5_confront: {
        id: "m5_confront", bg: "from-red-500 to-orange-500", character: "🕵️😤", characterName: "유현",
        npc: "🎨😱", npcName: "미술 선생님",
        text: "\"거기 서!!!\" 소리치니 깜짝 놀란 사람은... 미술 선생님?! 손에 황금 종을 들고 있다! \"유... 유현이?! 이건 오해야!\" 하지만 증거는 충분하다!",
        choices: [
          { text: "📋 증거를 대며 추궁!", next: "m6_evidence", statChanges: { courage: 2, wisdom: 1 } },
          { text: "🗣️ 차분하게 이야기", next: "m6_confess", statChanges: { charm: 3 } },
          { text: "🏃 도망치는 선생님 추격!", next: "m6_chase", statChanges: { courage: 3 } },
        ],
      },
      m5_trap: {
        id: "m5_trap", bg: "from-indigo-500 to-purple-600", character: "🕵️😏", characterName: "유현",
        npc: "🎨😵", npcName: "미술 선생님",
        text: "함정을 설치! 가짜 황금 종 전시회 포스터를 만들어서 범인을 유인한다. 밤에 몰래 오는 사람을 기다리는데... 미술 선생님이 나타났다! 함정에 걸렸다! \"으앗!\"",
        choices: [
          { text: "📋 \"잡았다!\" 증거 제시!", next: "m6_evidence", statChanges: { wisdom: 2, luck: 2 } },
          { text: "🗣️ \"왜 그러셨어요...\"", next: "m6_confess", statChanges: { charm: 3 } },
        ],
      },
      m6_evidence: {
        id: "m6_evidence", bg: "from-yellow-300 to-amber-400", character: "🕵️📋", characterName: "탐정 유현",
        npc: "🎨😢", npcName: "미술 선생님",
        text: "발자국, 물감 자국, 열쇠 증거를 모두 제시한다! \"이 물감은 선생님 미술실에만 있는 특수 물감이에요. 발자국도 선생님 신발 사이즈고요. 그리고 이 열쇠!\" 완벽한 추리! 미술 선생님이 고개를 숙인다. \"미안하다... 너무 아름다워서 갖고 싶었어...\"",
        ending: "명탐정",
        endingTitle: "🔍 명탐정 유현",
        endingDesc: "완벽한 증거로 사건 해결! 교장선생님이 감동해서 '유현 탐정 사무소' 간판을 선물로 줬다. 이후로도 학교에서 사건이 생기면 모두가 \"유현이 부르자!\" 한다. 명탐정 유현의 전설은 계속된다!",
      },
      m6_confess: {
        id: "m6_confess", bg: "from-pink-200 to-purple-300", character: "🕵️😊", characterName: "유현",
        npc: "🎨😭", npcName: "미술 선생님",
        text: "\"선생님, 왜 이러셨어요?\" 차분하게 묻자 미술 선생님이 울기 시작한다. \"사실 미술관 전시 기회를 얻으려면 특별한 작품이 필요했어... 하지만 이건 잘못된 방법이었지. 미안해.\" 선생님이 자진 반납했다.",
        ending: "미스터리 작가",
        endingTitle: "📖 미스터리 작가 유현",
        endingDesc: "범인의 마음까지 이해한 유현. 이 사건을 글로 쓰기 시작했다. '탐정 유현 시리즈'는 베스트셀러가 되었고, 유현은 유명한 미스터리 작가가 되었다! 모든 사건 뒤에는 사연이 있다.",
      },
      m6_chase: {
        id: "m6_chase", bg: "from-orange-400 to-red-500", character: "🏃💨", characterName: "유현",
        npc: "🎨🏃", npcName: "미술 선생님",
        text: "미술 선생님이 도망친다! 복도를 달리고, 계단을 뛰어오르고! 옥상까지 추격전! \"선생님 멈춰요!\" 결국 옥상에서 막다른 길! 황금 종을 되찾았다!",
        ending: "경찰이 된 유현",
        endingTitle: "👮 경찰이 된 유현",
        endingDesc: "추격전의 스릴을 잊을 수 없는 유현! 커서 경찰이 되기로 결심했다. 정의를 위해 달리는 경찰관 유현! 학교 시절 탐정 경험이 큰 도움이 된다!",
      },
    },
  },
  school: {
    id: "school",
    title: "전학생의 하루",
    emoji: "🏫",
    genre: "학교물",
    difficulty: "⭐",
    time: "5분",
    color: "from-green-400 to-blue-400",
    gradientFrom: "#4ade80",
    gradientTo: "#60a5fa",
    startScene: "s1",
    endings: ["인싸", "공부 1등", "운동 스타", "찐친 사귐", "전학 또 감"],
    scenes: {
      s1: {
        id: "s1", bg: "from-green-200 to-blue-200", character: "😊", characterName: "유현",
        npc: "👨‍🏫", npcName: "담임선생님",
        text: "새 학교 첫 날! 담임선생님이 \"자, 전학생을 소개합니다~\" 교실 앞에 서니 30명의 시선이 집중! 심장이 두근두근... 자기소개를 어떻게 할까?",
        choices: [
          { text: "😎 쿨하게 한다", next: "s2_cool", statChanges: { charm: 3 } },
          { text: "😳 부끄러워한다", next: "s2_shy", statChanges: { charm: 1, luck: 1 } },
          { text: "😂 개그를 친다", next: "s2_funny", statChanges: { charm: 2, luck: 2 } },
        ],
      },
      s2_cool: {
        id: "s2_cool", bg: "from-sky-200 to-blue-300", character: "😎", characterName: "유현",
        npc: "👋😄", npcName: "반 아이들",
        text: "\"안녕, 유현이야. 잘 지내보자.\" 짧고 쿨한 인사! 아이들이 \"오~\" 하고 감탄한다! 쉬는 시간에 여러 명이 다가온다. 점심시간이 됐다! 누구랑 먹지?",
        choices: [
          { text: "😎 인기쟁이 그룹과!", next: "s3_popular", statChanges: { charm: 2 } },
          { text: "🤫 조용한 아이와", next: "s3_quiet", statChanges: { wisdom: 2 } },
          { text: "🍱 혼자 먹는다", next: "s3_alone", statChanges: { luck: 1 } },
        ],
      },
      s2_shy: {
        id: "s2_shy", bg: "from-pink-100 to-pink-200", character: "😳", characterName: "유현",
        npc: "😊", npcName: "옆자리 아이",
        text: "\"안... 안녕하세요... 유현이에요...\" 얼굴이 빨개진다. 그런데 옆자리 아이가 다가온다. \"괜찮아! 나도 작년에 전학왔어. 같이 밥 먹자!\" 따뜻한 아이다!",
        choices: [
          { text: "😊 같이 먹자!", next: "s3_quiet", statChanges: { charm: 2, luck: 1 } },
          { text: "😎 다른 친구도 사귀어볼까", next: "s3_popular", statChanges: { courage: 2 } },
        ],
      },
      s2_funny: {
        id: "s2_funny", bg: "from-yellow-200 to-orange-200", character: "😂", characterName: "유현",
        npc: "😂😂😂", npcName: "반 아이들",
        text: "\"안녕! 나는 유현이야. 취미는 밥 먹기, 특기는 잠자기! 앞으로 잘 부탁해~!\" 반 전체가 빵 터진다! 😂😂😂 순식간에 인기인! 점심시간!",
        choices: [
          { text: "😎 인기쟁이 그룹과!", next: "s3_popular", statChanges: { charm: 3 } },
          { text: "🤫 웃기지 않았던 조용한 아이가 신경 쓰인다", next: "s3_quiet", statChanges: { wisdom: 2 } },
        ],
      },
      s3_popular: {
        id: "s3_popular", bg: "from-orange-200 to-yellow-200", character: "😊", characterName: "유현",
        npc: "😎😎😎", npcName: "인기쟁이 그룹",
        text: "인기쟁이 그룹과 점심! 재밌는 이야기도 하고, 급식 후식도 나눠먹고! 다음은 체육시간! 축구를 한다!",
        choices: [
          { text: "⚽ 골을 넣는다!", next: "s4_goal", statChanges: { courage: 2 } },
          { text: "🛡️ 수비한다!", next: "s4_defense", statChanges: { wisdom: 2 } },
          { text: "📣 응원한다!", next: "s4_cheer", statChanges: { charm: 2 } },
        ],
      },
      s3_quiet: {
        id: "s3_quiet", bg: "from-blue-100 to-indigo-200", character: "😊", characterName: "유현",
        npc: "🤓😊", npcName: "수민",
        text: "조용한 아이 '수민'과 점심! 수민이는 책을 좋아한다. \"이 만화책 재밌어!\" 같이 만화 보며 친해진다. 오후는 체육시간! 축구다!",
        choices: [
          { text: "⚽ 골 넣자!", next: "s4_goal", statChanges: { courage: 2 } },
          { text: "🛡️ 수비!", next: "s4_defense", statChanges: { wisdom: 2 } },
          { text: "📣 수민이랑 응원!", next: "s4_cheer", statChanges: { charm: 2 } },
        ],
      },
      s3_alone: {
        id: "s3_alone", bg: "from-gray-200 to-gray-300", character: "😐", characterName: "유현",
        npc: "🐕", npcName: "강아지",
        text: "혼자 먹으려고 나갔는데... 학교 앞에 귀여운 강아지가! 도시락을 나눠먹었다. 강아지가 꼬리를 흔든다! 체육시간이다!",
        choices: [
          { text: "⚽ 축구 열심히!", next: "s4_goal", statChanges: { courage: 2 } },
          { text: "🛡️ 수비 맡기", next: "s4_defense", statChanges: { wisdom: 1, luck: 1 } },
          { text: "📣 구경!", next: "s4_cheer", statChanges: { luck: 2 } },
        ],
      },
      s4_goal: {
        id: "s4_goal", bg: "from-green-300 to-green-500", character: "⚽😆", characterName: "유현",
        npc: "👏👏👏", npcName: "반 아이들",
        text: "유현이 드리블한다! 한 명 제치고, 두 명 제치고... 슛!!! 골인!!!! ⚽🎉 반 아이들 모두 환호! \"유현이 축구 잘한다!!\" 체육 스타 등극! 방과후 시간!",
        choices: [
          { text: "📚 학원 간다", next: "s5_academy", statChanges: { wisdom: 2 } },
          { text: "🏠 친구네 집!", next: "s5_friend", statChanges: { charm: 2 } },
          { text: "🎮 PC방!", next: "s5_pcroom", statChanges: { luck: 2 } },
          { text: "📖 도서관", next: "s5_library", statChanges: { wisdom: 3 } },
        ],
      },
      s4_defense: {
        id: "s4_defense", bg: "from-blue-300 to-blue-500", character: "🧤😤", characterName: "유현",
        npc: "👏", npcName: "팀원들",
        text: "수비를 맡았다! 상대팀 에이스가 달려온다! 유현이 막는다! 또 막는다! 철벽 수비! 팀이 이겼다! \"유현이 수비 대박!\" 든든한 수비수! 방과후 시간!",
        choices: [
          { text: "📚 학원!", next: "s5_academy", statChanges: { wisdom: 2 } },
          { text: "🏠 친구 집!", next: "s5_friend", statChanges: { charm: 2 } },
          { text: "🎮 PC방!", next: "s5_pcroom", statChanges: { luck: 2 } },
          { text: "📖 도서관!", next: "s5_library", statChanges: { wisdom: 3 } },
        ],
      },
      s4_cheer: {
        id: "s4_cheer", bg: "from-yellow-300 to-orange-300", character: "📣😄", characterName: "유현",
        npc: "😄", npcName: "친구들",
        text: "응원을 열심히 한다! \"화이팅! 우리팀 최고!\" 응원 덕에 팀 사기가 올라간다! 골도 넣고 이겼다! \"유현이 응원 덕분이야!\" 분위기 메이커! 방과후!",
        choices: [
          { text: "📚 학원!", next: "s5_academy", statChanges: { wisdom: 2 } },
          { text: "🏠 친구 집!", next: "s5_friend", statChanges: { charm: 2 } },
          { text: "🎮 PC방!", next: "s5_pcroom", statChanges: { luck: 2 } },
          { text: "📖 도서관!", next: "s5_library", statChanges: { wisdom: 3 } },
        ],
      },
      s5_academy: {
        id: "s5_academy", bg: "from-blue-200 to-indigo-300", character: "📚😤", characterName: "유현",
        npc: "👩‍🏫", npcName: "학원 선생님",
        text: "학원에서 열심히 공부! 수학, 영어, 과학! 힘들지만 실력이 늘고 있다! 그리고 드디어 학교 축제가 다가온다! 뭘 할까?",
        choices: [
          { text: "🎸 밴드 공연!", next: "s6_band", statChanges: { charm: 3, courage: 1 } },
          { text: "🎭 연극!", next: "s6_play", statChanges: { charm: 2, courage: 2 } },
          { text: "🎪 부스 운영!", next: "s6_booth", statChanges: { wisdom: 2, charm: 1 } },
          { text: "🎠 놀러만 다닌다!", next: "s6_play_around", statChanges: { luck: 2 } },
        ],
      },
      s5_friend: {
        id: "s5_friend", bg: "from-orange-200 to-pink-200", character: "😄🏠", characterName: "유현",
        npc: "😄🎮", npcName: "친구",
        text: "친구네 집에서 놀기! 게임도 하고, 과자도 먹고, 숙제도 같이! 밤늦게까지 이야기하고 돌아왔다. 찐친이 생긴 것 같다! 학교 축제가 다가온다!",
        choices: [
          { text: "🎸 밴드 공연!", next: "s6_band", statChanges: { charm: 3, courage: 1 } },
          { text: "🎭 연극!", next: "s6_play", statChanges: { charm: 2, courage: 2 } },
          { text: "🎪 부스 운영!", next: "s6_booth", statChanges: { wisdom: 2, charm: 1 } },
          { text: "🎠 놀러 다니기!", next: "s6_play_around", statChanges: { luck: 2 } },
        ],
      },
      s5_pcroom: {
        id: "s5_pcroom", bg: "from-gray-700 to-blue-800", character: "🎮😆", characterName: "유현",
        npc: "🎮😆", npcName: "PC방 친구",
        text: "PC방에서 게임! 친구들이랑 같이 했더니 최고! 게임 실력도 늘고 친구도 늘었다! 근데 엄마한테 혼났다... ㅋㅋ 학교 축제가 온다!",
        choices: [
          { text: "🎸 밴드!", next: "s6_band", statChanges: { charm: 2, courage: 2 } },
          { text: "🎭 연극!", next: "s6_play", statChanges: { charm: 2, courage: 2 } },
          { text: "🎪 부스!", next: "s6_booth", statChanges: { wisdom: 2, charm: 1 } },
          { text: "🎠 놀기!", next: "s6_play_around", statChanges: { luck: 3 } },
        ],
      },
      s5_library: {
        id: "s5_library", bg: "from-amber-100 to-amber-300", character: "📖🤓", characterName: "유현",
        npc: "📚", npcName: "",
        text: "도서관에서 조용히 공부! 재미있는 책도 발견하고, 시험 준비도 완벽! 성적이 쑥쑥! 도서관에서 만난 친구와도 친해졌다. 축제가 온다!",
        choices: [
          { text: "🎸 밴드!", next: "s6_band", statChanges: { charm: 2, courage: 2 } },
          { text: "🎭 연극!", next: "s6_play", statChanges: { charm: 2, courage: 2 } },
          { text: "🎪 부스!", next: "s6_booth", statChanges: { wisdom: 3 } },
          { text: "🎠 놀기!", next: "s6_play_around", statChanges: { luck: 2 } },
        ],
      },
      s6_band: {
        id: "s6_band", bg: "from-purple-400 to-pink-400", character: "🎸🤩", characterName: "유현",
        npc: "👏👏👏🎉", npcName: "관객들",
        text: "축제 밴드 공연! 기타를 치며 노래한다! 관객들이 열광! \"유현! 유현!\" 앙코르까지 받았다! 학교의 스타가 되었다! 이제 기말고사다!",
        choices: [
          { text: "📝 벼락치기!", next: "end_school_inssa", statChanges: { luck: 2 } },
          { text: "📚 꾸준히 공부!", next: "end_school_study", statChanges: { wisdom: 3 } },
          { text: "👀 컨닝...?", next: "end_school_bad", statChanges: { luck: -3 } },
        ],
      },
      s6_play: {
        id: "s6_play", bg: "from-red-300 to-amber-300", character: "🎭✨", characterName: "유현",
        npc: "👏🎉", npcName: "관객들",
        text: "축제 연극에서 주인공 역할! 대사도 완벽, 연기도 완벽! 관객들이 감동해서 울었다! \"유현이 연기 미쳤다!\" 연극 대상까지 받았다! 기말고사!",
        choices: [
          { text: "📝 벼락치기!", next: "end_school_friend", statChanges: { luck: 2 } },
          { text: "📚 꾸준히 공부!", next: "end_school_study", statChanges: { wisdom: 3 } },
          { text: "👀 컨닝...?", next: "end_school_bad", statChanges: { luck: -3 } },
        ],
      },
      s6_booth: {
        id: "s6_booth", bg: "from-green-300 to-teal-300", character: "🎪😄", characterName: "유현",
        npc: "😋🧁", npcName: "손님들",
        text: "떡볶이 부스 운영! 재료 준비, 요리, 판매까지! 줄이 길어질 만큼 인기! 수익금 전액 기부까지! \"유현이네 부스 최고!\" 뿌듯하다! 기말고사!",
        choices: [
          { text: "📝 벼락치기!", next: "end_school_friend", statChanges: { luck: 2 } },
          { text: "📚 꾸준히!", next: "end_school_study", statChanges: { wisdom: 3 } },
          { text: "👀 컨닝...?", next: "end_school_bad", statChanges: { luck: -3 } },
        ],
      },
      s6_play_around: {
        id: "s6_play_around", bg: "from-yellow-300 to-pink-300", character: "🎠😆", characterName: "유현",
        npc: "🎡🎪🎠", npcName: "",
        text: "축제에서 신나게 놀았다! 모든 부스 다 가보고, 친구들이랑 사진도 찍고! 최고의 추억! 기말고사가 다가온다!",
        choices: [
          { text: "📝 벼락치기!", next: "end_school_inssa", statChanges: { luck: 3 } },
          { text: "📚 이제라도 공부!", next: "end_school_study", statChanges: { wisdom: 2 } },
          { text: "👀 컨닝...?", next: "end_school_bad", statChanges: { luck: -3 } },
        ],
      },
      end_school_inssa: {
        id: "end_school_inssa", bg: "from-pink-300 to-purple-300",
        character: "😎🌟", characterName: "인싸 유현",
        text: "",
        ending: "인싸",
        endingTitle: "🌟 인싸 유현",
        endingDesc: "전학 첫 날부터 인싸가 된 유현! 모든 친구들의 사랑을 받고, 축제의 스타, 학교의 인기인! 매일이 즐거운 학교생활! 이 학교에 전학 오길 잘했다!",
      },
      end_school_study: {
        id: "end_school_study", bg: "from-blue-300 to-indigo-300",
        character: "🤓🏆", characterName: "공부왕 유현",
        text: "",
        ending: "공부 1등",
        endingTitle: "🏆 공부 1등 유현",
        endingDesc: "꾸준한 노력의 결과! 기말고사 전교 1등! 선생님들도 놀라고, 부모님도 감동! 공부도 잘하고 친구도 많은 완벽한 학교생활! 노력은 배신하지 않는다!",
      },
      end_school_friend: {
        id: "end_school_friend", bg: "from-orange-300 to-pink-300",
        character: "😊🤝😊", characterName: "유현 & 친구들",
        text: "",
        ending: "찐친 사귐",
        endingTitle: "💝 찐친 사귐",
        endingDesc: "성적보다 소중한 것을 찾았다! 평생 함께할 진짜 친구! 같이 웃고, 같이 울고, 같이 성장하는 찐친이 생겼다. 어른이 되어서도 이 우정은 계속될 거야!",
      },
      end_school_bad: {
        id: "end_school_bad", bg: "from-gray-500 to-gray-700",
        character: "😱💀", characterName: "유현",
        text: "",
        ending: "전학 또 감",
        endingTitle: "😱 전학 또 감",
        endingDesc: "컨닝이 들켰다!!! 선생님한테 불려가고, 부모님한테 혼나고... 결국 또 전학을 가게 되었다. 정직이 최선이라는 걸 배웠다... 다음 학교에서는 잘 하자!",
      },
    },
  },
  space: {
    id: "space",
    title: "우주 탐험가",
    emoji: "🚀",
    genre: "SF물",
    difficulty: "⭐⭐⭐⭐",
    time: "8분",
    color: "from-blue-600 to-purple-600",
    gradientFrom: "#2563eb",
    gradientTo: "#9333ea",
    startScene: "sp1",
    endings: ["전설의 탐험가", "외계 대사", "새 행성의 왕", "시간 여행자"],
    scenes: {
      sp1: {
        id: "sp1", bg: "from-gray-800 to-blue-900", character: "😃🚀", characterName: "유현",
        npc: "🛸", npcName: "",
        text: "서기 2150년! 유현은 우주 탐사대에 선발되었다! 인류 최초의 은하계 탐사! 우주선 '스타드림호'에서 역할을 정해야 한다!",
        choices: [
          { text: "👨‍✈️ 선장!", next: "sp2_captain", statChanges: { courage: 2, charm: 1 } },
          { text: "🔬 과학자!", next: "sp2_scientist", statChanges: { wisdom: 3 } },
          { text: "🚀 파일럿!", next: "sp2_pilot", statChanges: { courage: 3 } },
          { text: "👨‍⚕️ 의사!", next: "sp2_doctor", statChanges: { wisdom: 2, charm: 1 } },
        ],
      },
      sp2_captain: {
        id: "sp2_captain", bg: "from-indigo-600 to-purple-700", character: "👨‍✈️", characterName: "선장 유현",
        npc: "🌍✨", npcName: "미지의 행성",
        text: "선장 유현! \"출발!\" 우주를 항해하던 중 미지의 행성을 발견! 아름다운 초록빛 행성! 생명체가 있을 수도 있다! 선장으로서 결정해야 한다!",
        choices: [
          { text: "🛬 착륙한다!", next: "sp3_land", statChanges: { courage: 2 } },
          { text: "🛰️ 궤도에서 관찰", next: "sp3_observe", statChanges: { wisdom: 2 } },
          { text: "➡️ 무시하고 지나간다", next: "sp3_pass", statChanges: { luck: 1 } },
        ],
      },
      sp2_scientist: {
        id: "sp2_scientist", bg: "from-teal-600 to-cyan-700", character: "🔬", characterName: "과학자 유현",
        npc: "🌍✨", npcName: "미지의 행성",
        text: "과학자 유현! 연구실에서 데이터를 분석하다가 센서에 이상 반응! 미지의 행성에서 생명 신호가 감지된다! 이건 엄청난 발견이 될 수 있어!",
        choices: [
          { text: "🛬 착륙해서 조사!", next: "sp3_land", statChanges: { courage: 1, wisdom: 2 } },
          { text: "🛰️ 더 분석한다", next: "sp3_observe", statChanges: { wisdom: 3 } },
        ],
      },
      sp2_pilot: {
        id: "sp2_pilot", bg: "from-blue-700 to-indigo-800", character: "🚀", characterName: "파일럿 유현",
        npc: "🌍✨", npcName: "미지의 행성",
        text: "파일럿 유현! 우주선을 능숙하게 조종하며 은하계를 횡단! 갑자기 계기판이 반응한다! 미지의 행성이 나타났다! 착륙 기술에 자신 있다!",
        choices: [
          { text: "🛬 멋지게 착륙!", next: "sp3_land", statChanges: { courage: 3 } },
          { text: "🛰️ 궤도 비행으로 관찰", next: "sp3_observe", statChanges: { wisdom: 2 } },
          { text: "➡️ 지나간다", next: "sp3_pass", statChanges: { luck: 1 } },
        ],
      },
      sp2_doctor: {
        id: "sp2_doctor", bg: "from-green-600 to-teal-700", character: "👨‍⚕️", characterName: "의사 유현",
        npc: "🌍✨", npcName: "미지의 행성",
        text: "우주선 의사 유현! 대원들의 건강을 돌보며 항해 중, 미지의 행성에서 이상한 전파가 온다. 분석해보니 도움을 요청하는 신호 같다! 의사로서 도와야 할까?",
        choices: [
          { text: "🛬 도우러 간다!", next: "sp3_land", statChanges: { charm: 2, courage: 1 } },
          { text: "🛰️ 신중하게 관찰", next: "sp3_observe", statChanges: { wisdom: 3 } },
        ],
      },
      sp3_land: {
        id: "sp3_land", bg: "from-green-500 to-emerald-600", character: "😲", characterName: "유현",
        npc: "👽✨", npcName: "외계인",
        text: "행성에 착륙! 공기는 맑고 식물이 가득! 그런데... 빛나는 생명체가 다가온다! 외계인이다! 투명한 몸에 큰 눈, 빛으로 소통하는 것 같다!",
        choices: [
          { text: "👋 소통을 시도한다!", next: "sp4_communicate", statChanges: { charm: 3 } },
          { text: "🛡️ 방어 태세!", next: "sp4_defend", statChanges: { courage: 2 } },
          { text: "🎁 선물을 준다!", next: "sp4_gift", statChanges: { charm: 2, luck: 2 } },
        ],
      },
      sp3_observe: {
        id: "sp3_observe", bg: "from-blue-800 to-indigo-900", character: "🔭", characterName: "유현",
        npc: "👽📡", npcName: "외계 신호",
        text: "궤도에서 관찰! 스캔 결과 고도 문명의 흔적이 있다! 외계인이 우주선에 통신을 보내온다! 화면에 빛으로 만든 그림이 나타난다. 소통하려는 것 같다!",
        choices: [
          { text: "📡 응답한다!", next: "sp4_communicate", statChanges: { wisdom: 2, charm: 1 } },
          { text: "🛡️ 조심한다", next: "sp4_defend", statChanges: { wisdom: 2, courage: 1 } },
        ],
      },
      sp3_pass: {
        id: "sp3_pass", bg: "from-gray-700 to-gray-900", character: "😐", characterName: "유현",
        npc: "⚠️", npcName: "",
        text: "지나치려고 했는데... 우주선에 이상이 생겼다! 엔진이 꺼진다! 미지의 행성 근처에서 멈춰버렸다! 어쩔 수 없이 착륙해야 한다! 그런데 외계인이 기다리고 있다?!",
        choices: [
          { text: "👋 인사한다!", next: "sp4_communicate", statChanges: { charm: 2, luck: 1 } },
          { text: "🛡️ 경계!", next: "sp4_defend", statChanges: { courage: 2 } },
        ],
      },
      sp4_communicate: {
        id: "sp4_communicate", bg: "from-purple-400 to-pink-400", character: "😊🤝", characterName: "유현",
        npc: "👽😊", npcName: "루미 (외계인)",
        text: "빛의 언어로 소통 성공! 외계인 이름은 '루미'! 루미가 마을로 안내한다. 빛의 도시! 아름다운 문명! 그런데 우주선이 고장났다!",
        choices: [
          { text: "🔧 직접 수리!", next: "sp5_repair", statChanges: { wisdom: 2, courage: 1 } },
          { text: "👽 루미에게 도움 요청!", next: "sp5_alien_help", statChanges: { charm: 3 } },
          { text: "🛟 탈출 포드 사용!", next: "sp5_escape", statChanges: { luck: 2 } },
        ],
      },
      sp4_defend: {
        id: "sp4_defend", bg: "from-red-500 to-orange-500", character: "🛡️😤", characterName: "유현",
        npc: "👽😢", npcName: "외계인들",
        text: "방어 태세! 하지만 외계인들은 공격하지 않는다. 오히려 겁먹은 것 같다. 손을 내밀며 빛을 보낸다. 평화의 신호인 것 같다... 우주선도 고장이 나 있다!",
        choices: [
          { text: "🤝 손을 잡는다", next: "sp5_alien_help", statChanges: { charm: 3 } },
          { text: "🔧 혼자 수리한다", next: "sp5_repair", statChanges: { courage: 2, wisdom: 1 } },
        ],
      },
      sp4_gift: {
        id: "sp4_gift", bg: "from-yellow-300 to-pink-300", character: "🎁😊", characterName: "유현",
        npc: "👽🎁😄", npcName: "루미",
        text: "지구의 초콜릿을 선물! 외계인이 먹어보더니 눈이 반짝! \"!!!✨✨✨\" 기뻐한다! 초콜릿 하나로 우정이 시작! 루미가 답례로 빛나는 보석을 준다! 우주선이 고장!",
        choices: [
          { text: "👽 루미가 도와줘!", next: "sp5_alien_help", statChanges: { charm: 3, luck: 1 } },
          { text: "🔧 직접 수리!", next: "sp5_repair", statChanges: { wisdom: 2, courage: 1 } },
        ],
      },
      sp5_repair: {
        id: "sp5_repair", bg: "from-gray-600 to-blue-700", character: "🔧😤", characterName: "유현",
        npc: "🚀💥", npcName: "",
        text: "직접 수리한다! 우주복을 입고 우주선 밖으로! 엔진을 고치는데... 성공! 우주선이 다시 움직인다! 그런데 멀리서 블랙홀이 보인다! 거대한 소용돌이!",
        choices: [
          { text: "🔬 연구한다!", next: "sp6_research", statChanges: { wisdom: 3 } },
          { text: "🏠 지구로 돌아간다!", next: "end_space_explorer", statChanges: { wisdom: 1, luck: 1 } },
          { text: "🌀 안으로 들어간다(!)", next: "end_space_time", statChanges: { courage: 5 } },
        ],
      },
      sp5_alien_help: {
        id: "sp5_alien_help", bg: "from-purple-500 to-pink-500", character: "😊🤝👽", characterName: "유현 & 루미",
        npc: "🚀✨", npcName: "",
        text: "루미와 외계 친구들이 우주선을 고쳐준다! 외계 기술로 업그레이드까지! 이제 우주선이 10배 빨라졌다! 루미가 은하계 지도도 준다! 블랙홀의 존재도 알려준다!",
        choices: [
          { text: "🔬 블랙홀 연구!", next: "sp6_research", statChanges: { wisdom: 3 } },
          { text: "🏠 지구로!", next: "end_space_ambassador", statChanges: { charm: 2 } },
          { text: "🌀 블랙홀 안으로!", next: "end_space_time", statChanges: { courage: 4 } },
        ],
      },
      sp5_escape: {
        id: "sp5_escape", bg: "from-orange-500 to-red-500", character: "😨🛟", characterName: "유현",
        npc: "🌍", npcName: "행성",
        text: "탈출 포드로 도망치려 했지만... 포드가 행성에 불시착! 외계인들이 다가오는데 무섭지 않다. 도와주려는 것 같다. 어쩔 수 없이 함께 지내게 되었다.",
        choices: [
          { text: "🏠 여기서 새 삶을!", next: "end_space_king", statChanges: { charm: 2, luck: 2 } },
          { text: "🤝 외계인과 협력해서 우주선 수리", next: "sp5_alien_help", statChanges: { charm: 2, wisdom: 1 } },
        ],
      },
      sp6_research: {
        id: "sp6_research", bg: "from-indigo-700 to-purple-900", character: "🔬🤩", characterName: "유현",
        npc: "🌀✨", npcName: "블랙홀",
        text: "블랙홀을 연구한다! 놀라운 발견! 이 블랙홀은 다른 은하로 가는 통로! 엄청난 논문감이다! 하지만 직접 들어가보면 더 많은 것을 알 수 있다... 위험하지만!",
        choices: [
          { text: "🏠 연구 결과 가지고 지구로!", next: "end_space_explorer", statChanges: { wisdom: 3 } },
          { text: "🌀 직접 들어간다!", next: "end_space_time", statChanges: { courage: 5 } },
        ],
      },
      end_space_explorer: {
        id: "end_space_explorer", bg: "from-blue-400 to-cyan-400",
        character: "🧑‍🚀🏆", characterName: "전설의 탐험가 유현",
        text: "",
        ending: "전설의 탐험가",
        endingTitle: "🌟 전설의 탐험가",
        endingDesc: "인류 최초로 외계 문명을 발견하고 돌아온 유현! 지구에서 영웅이 되었다! 우주 탐사의 전설로 역사에 이름을 남기다! 유현의 발견으로 인류는 새로운 시대를 맞이한다!",
      },
      end_space_ambassador: {
        id: "end_space_ambassador", bg: "from-purple-300 to-pink-300",
        character: "🤝👽🌍", characterName: "외계 대사 유현",
        text: "",
        ending: "외계 대사",
        endingTitle: "🌐 외계 대사 유현",
        endingDesc: "지구와 외계 문명의 다리! 유현은 인류 최초의 '외계 대사'가 되었다! 루미와 함께 두 문명의 평화를 이끌고, 은하계 평화 조약을 맺었다! 우정이 우주를 연결했다!",
      },
      end_space_king: {
        id: "end_space_king", bg: "from-amber-400 to-yellow-300",
        character: "👑🌍", characterName: "행성의 왕 유현",
        text: "",
        ending: "새 행성의 왕",
        endingTitle: "👑 새 행성의 왕",
        endingDesc: "외계 행성에서 새 삶을 시작한 유현! 외계인들과 함께 살며 리더가 되었다! 두 문명의 장점을 합쳐 이상적인 사회를 만들었다. 새 행성의 이름? '유현성'! ㅋㅋ",
      },
      end_space_time: {
        id: "end_space_time", bg: "from-purple-900 to-black",
        character: "⏰🌀🧑‍🚀", characterName: "시간 여행자 유현",
        text: "",
        ending: "시간 여행자",
        endingTitle: "⏰ 비밀 엔딩: 시간 여행자",
        endingDesc: "블랙홀에 들어갔더니... 시간이 거꾸로! 과거로, 미래로 자유롭게 여행할 수 있게 되었다! 역사 속을 모험하는 시간 여행자 유현! 이번엔 공룡 시대로 가볼까? 아님 3000년 미래로?",
      },
    },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProtagonistPage() {
  // Game state
  const [screen, setScreen] = useState<"title" | "genre" | "game" | "ending" | "gallery">("title");
  const [currentStory, setCurrentStory] = useState<string | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string>("");
  const [stats, setStats] = useState<Stats>({ courage: 0, wisdom: 0, charm: 0, luck: 0 });
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Achievements & gallery
  const [unlockedEndings, setUnlockedEndings] = useState<Record<string, string[]>>({});
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);

  // Refs
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullTextRef = useRef("");

  // Load saved data
  useEffect(() => {
    try {
      const saved = localStorage.getItem("protagonist_endings");
      if (saved) setUnlockedEndings(JSON.parse(saved));
      const savedAch = localStorage.getItem("protagonist_achievements");
      if (savedAch) setAchievements(JSON.parse(savedAch));
    } catch {}
  }, []);

  // Save data
  useEffect(() => {
    try {
      localStorage.setItem("protagonist_endings", JSON.stringify(unlockedEndings));
    } catch {}
  }, [unlockedEndings]);

  useEffect(() => {
    try {
      localStorage.setItem("protagonist_achievements", JSON.stringify(achievements));
    } catch {}
  }, [achievements]);

  // Typewriter effect
  const typeText = useCallback((text: string) => {
    if (typingRef.current) clearTimeout(typingRef.current);
    fullTextRef.current = text;
    setDisplayedText("");
    setIsTyping(true);
    setShowChoices(false);
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        typingRef.current = setTimeout(tick, 35);
      } else {
        setIsTyping(false);
        setShowChoices(true);
      }
    };
    typingRef.current = setTimeout(tick, 100);
  }, []);

  // Skip typing
  const skipTyping = useCallback(() => {
    if (isTyping) {
      if (typingRef.current) clearTimeout(typingRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
      setShowChoices(true);
    }
  }, [isTyping]);

  // Start story
  const startStory = useCallback((storyId: string) => {
    const story = STORIES[storyId];
    if (!story) return;
    setCurrentStory(storyId);
    setStats({ courage: 0, wisdom: 0, charm: 0, luck: 0 });
    setFadeOut(true);
    setTimeout(() => {
      setCurrentSceneId(story.startScene);
      setScreen("game");
      setFadeOut(false);
      setFadeIn(true);
      typeText(story.scenes[story.startScene].text);
      setTimeout(() => setFadeIn(false), 500);
    }, 400);
  }, [typeText]);

  // Make choice
  const makeChoice = useCallback((choice: Choice) => {
    if (!currentStory) return;
    const story = STORIES[currentStory];
    if (!story) return;

    // Apply stat changes
    if (choice.statChanges) {
      setStats(prev => ({
        courage: Math.max(0, Math.min(20, prev.courage + (choice.statChanges?.courage || 0))),
        wisdom: Math.max(0, Math.min(20, prev.wisdom + (choice.statChanges?.wisdom || 0))),
        charm: Math.max(0, Math.min(20, prev.charm + (choice.statChanges?.charm || 0))),
        luck: Math.max(0, Math.min(20, prev.luck + (choice.statChanges?.luck || 0))),
      }));
    }

    const nextScene = story.scenes[choice.next];
    if (!nextScene) return;

    setFadeOut(true);
    setTimeout(() => {
      setCurrentSceneId(choice.next);
      setFadeOut(false);
      setFadeIn(true);

      if (nextScene.ending) {
        // Unlock ending
        setUnlockedEndings(prev => {
          const storyEndings = prev[currentStory] || [];
          if (!storyEndings.includes(nextScene.ending!)) {
            return { ...prev, [currentStory]: [...storyEndings, nextScene.ending!] };
          }
          return prev;
        });

        // Check achievements
        setTimeout(() => {
          checkAchievements(nextScene.ending!);
        }, 100);

        setScreen("ending");
      } else {
        typeText(nextScene.text);
      }
      setTimeout(() => setFadeIn(false), 500);
    }, 400);
  }, [currentStory, typeText]);

  // Check achievements
  const checkAchievements = (ending: string) => {
    const newAchievements: string[] = [];

    // Bad ending achievement
    const badEndings = ["빌런이 된 히어로", "은퇴한 히어로", "범인을 놓침", "전학 또 감"];
    if (badEndings.includes(ending) && !achievements.includes("반전 주인공")) {
      newAchievements.push("반전 주인공");
    }

    // Good endings
    const goodEndings = ["전설의 히어로", "대마법사", "마왕 처치 영웅", "명탐정", "공부 1등", "전설의 탐험가"];
    if (goodEndings.includes(ending) && !achievements.includes("선한 주인공")) {
      newAchievements.push("선한 주인공");
    }

    // All endings collector
    const totalEndings = Object.values(STORIES).reduce((sum, s) => sum + s.endings.length, 0);
    const totalUnlocked = Object.values(unlockedEndings).reduce((sum, e) => sum + e.length, 0) + 1;
    if (totalUnlocked >= totalEndings && !achievements.includes("모든 엔딩 수집가")) {
      newAchievements.push("모든 엔딩 수집가");
    }

    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
      setShowAchievement(newAchievements[0]);
      setTimeout(() => setShowAchievement(null), 3000);
    }
  };

  const currentScene: Scene | null = currentStory && currentSceneId
    ? STORIES[currentStory]?.scenes[currentSceneId] || null
    : null;

  // ─── Stat Bar ────────────────────────────────────────────────────────────

  const StatBar = ({ label, emoji, value, color }: { label: string; emoji: string; value: number; color: string }) => (
    <div className="flex items-center gap-1">
      <span className="text-xs">{emoji}</span>
      <span className="text-[10px] text-white/80 w-6">{label}</span>
      <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${(value / 20) * 100}%` }} />
      </div>
      <span className="text-[10px] text-white/80 w-3">{value}</span>
    </div>
  );

  // ─── Title Screen ───────────────────────────────────────────────────────

  if (screen === "title") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated bg elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                opacity: 0.3,
              }}
            >
              {["⭐", "✨", "🌟", "💫", "🎭", "📖"][i % 6]}
            </div>
          ))}
        </div>

        <Link
          href="/"
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-all z-10"
        >
          ← 홈으로
        </Link>

        <div className="text-center z-10">
          <div className="text-8xl mb-4 animate-bounce">🎭</div>
          <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg">
            주인공 되기
          </h1>
          <p className="text-lg text-white/80 mb-8">
            내가 주인공인 이야기! 선택이 운명을 바꾼다!
          </p>

          <button
            onClick={() => setScreen("genre")}
            className="px-12 py-4 bg-white text-purple-700 font-bold text-xl rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform mb-4"
          >
            🎬 이야기 시작!
          </button>

          <br />
          <button
            onClick={() => setScreen("gallery")}
            className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl hover:bg-white/30 transition-all mt-3"
          >
            🖼️ 엔딩 갤러리
          </button>

          {achievements.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
              {achievements.map(a => (
                <span key={a} className="px-3 py-1 bg-yellow-400/30 rounded-full text-sm text-yellow-200">
                  🏅 {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
          }
          .animate-float { animation: float 4s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // ─── Genre Select Screen ────────────────────────────────────────────────

  if (screen === "genre") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setScreen("title")}
              className="bg-white/80 px-4 py-2 rounded-full text-sm hover:bg-white transition-all shadow"
            >
              ← 뒤로
            </button>
            <h2 className="text-2xl font-black text-amber-800">📚 이야기를 골라봐!</h2>
            <div className="w-16" />
          </div>

          <div className="grid gap-4">
            {Object.values(STORIES).map(story => {
              const storyEndings = unlockedEndings[story.id] || [];
              const progress = Math.round((storyEndings.length / story.endings.length) * 100);

              return (
                <button
                  key={story.id}
                  onClick={() => startStory(story.id)}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                >
                  <div className={`bg-gradient-to-r ${story.color} p-5`}>
                    <div className="flex items-start gap-4">
                      <div className="text-5xl group-hover:scale-110 transition-transform">
                        {story.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full text-white">
                            {story.genre}
                          </span>
                          <span className="text-xs text-white/80">{story.difficulty}</span>
                          <span className="text-xs text-white/80">⏱️ {story.time}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{story.title}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/80">{progress}%</span>
                        </div>
                        <p className="text-xs text-white/70 mt-1">
                          엔딩 {storyEndings.length}/{story.endings.length}
                        </p>
                      </div>
                      <div className="text-white/60 text-2xl group-hover:translate-x-1 transition-transform">
                        ▶
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Gallery Screen ─────────────────────────────────────────────────────

  if (screen === "gallery") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setScreen("title")}
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-white hover:bg-white/30 transition-all"
            >
              ← 뒤로
            </button>
            <h2 className="text-2xl font-black text-white">🖼️ 엔딩 갤러리</h2>
            <div className="w-16" />
          </div>

          {Object.values(STORIES).map(story => {
            const storyEndings = unlockedEndings[story.id] || [];
            return (
              <div key={story.id} className="mb-8">
                <h3 className="text-lg font-bold text-white mb-3">
                  {story.emoji} {story.title}
                  <span className="text-sm text-white/60 ml-2">
                    ({storyEndings.length}/{story.endings.length})
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {story.endings.map(ending => {
                    const unlocked = storyEndings.includes(ending);
                    return (
                      <div
                        key={ending}
                        className={`rounded-xl p-4 text-center transition-all ${
                          unlocked
                            ? "bg-gradient-to-br from-amber-400/30 to-yellow-400/30 border border-amber-400/40"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div className={`text-3xl mb-2 ${unlocked ? "" : "grayscale opacity-30"}`}>
                          {unlocked ? "🏆" : "🔒"}
                        </div>
                        <p className={`text-sm font-bold ${unlocked ? "text-amber-300" : "text-white/30"}`}>
                          {unlocked ? ending : "???"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mt-8 p-4 rounded-xl bg-white/10 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-3">🏅 업적</h3>
            <div className="space-y-2">
              {[
                { name: "선한 주인공", desc: "좋은 선택으로 좋은 엔딩 달성!", icon: "😇" },
                { name: "반전 주인공", desc: "나쁜 엔딩을 경험하다!", icon: "😈" },
                { name: "모든 엔딩 수집가", desc: "모든 엔딩을 수집하다!", icon: "🏆" },
              ].map(ach => {
                const unlocked = achievements.includes(ach.name);
                return (
                  <div
                    key={ach.name}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      unlocked ? "bg-yellow-400/20" : "bg-white/5"
                    }`}
                  >
                    <span className={`text-2xl ${unlocked ? "" : "grayscale opacity-30"}`}>
                      {unlocked ? ach.icon : "🔒"}
                    </span>
                    <div>
                      <p className={`font-bold text-sm ${unlocked ? "text-yellow-300" : "text-white/30"}`}>
                        {ach.name}
                      </p>
                      <p className={`text-xs ${unlocked ? "text-white/60" : "text-white/20"}`}>
                        {ach.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ending Screen ──────────────────────────────────────────────────────

  if (screen === "ending" && currentScene && currentStory) {
    const story = STORIES[currentStory];
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentScene.bg} flex flex-col items-center justify-center p-4 relative`}>
        {/* Achievement popup */}
        {showAchievement && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce">
            🏅 업적 달성: {showAchievement}!
          </div>
        )}

        <div className={`text-center max-w-md transition-all duration-500 ${fadeIn ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
          <div className="text-7xl mb-6">{currentScene.character}</div>
          <h2 className="text-3xl font-black text-white mb-4 drop-shadow-lg">
            {currentScene.endingTitle}
          </h2>
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <p className="text-white text-base leading-relaxed">
              {currentScene.endingDesc}
            </p>
          </div>

          {/* Final Stats */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6">
            <p className="text-sm text-white/80 mb-3 font-bold">📊 최종 능력치</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <span className="text-2xl">💪</span>
                <p className="text-xs text-white/80">용기</p>
                <p className="text-lg font-bold text-white">{stats.courage}</p>
              </div>
              <div className="text-center">
                <span className="text-2xl">🧠</span>
                <p className="text-xs text-white/80">지혜</p>
                <p className="text-lg font-bold text-white">{stats.wisdom}</p>
              </div>
              <div className="text-center">
                <span className="text-2xl">✨</span>
                <p className="text-xs text-white/80">매력</p>
                <p className="text-lg font-bold text-white">{stats.charm}</p>
              </div>
              <div className="text-center">
                <span className="text-2xl">🍀</span>
                <p className="text-xs text-white/80">운</p>
                <p className="text-lg font-bold text-white">{stats.luck}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => startStory(currentStory)}
              className="px-8 py-3 bg-white text-purple-700 font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              🔄 다시 플레이
            </button>
            <button
              onClick={() => {
                setScreen("genre");
                setCurrentStory(null);
                setCurrentSceneId("");
              }}
              className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl hover:bg-white/30 transition-all"
            >
              📚 다른 이야기
            </button>
            <button
              onClick={() => {
                setScreen("title");
                setCurrentStory(null);
                setCurrentSceneId("");
              }}
              className="px-8 py-3 bg-white/10 text-white/80 rounded-2xl hover:bg-white/20 transition-all text-sm"
            >
              🏠 처음으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Screen ────────────────────────────────────────────────────────

  if (screen === "game" && currentScene && currentStory) {
    const story = STORIES[currentStory];
    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${currentScene.bg} flex flex-col relative overflow-hidden transition-opacity duration-400 ${fadeOut ? "opacity-0" : "opacity-100"} ${fadeIn ? "opacity-0" : ""}`}
        onClick={skipTyping}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScreen("genre");
              setCurrentStory(null);
              setCurrentSceneId("");
              if (typingRef.current) clearTimeout(typingRef.current);
            }}
            className="bg-white/20 px-3 py-1.5 rounded-full text-xs text-white hover:bg-white/30 transition-all"
          >
            ← 나가기
          </button>
          <div className="text-sm font-bold text-white/90">
            {story.emoji} {story.title}
          </div>
          <div className="text-xs text-white/60">
            🎵
          </div>
        </div>

        {/* Stats panel */}
        <div className="absolute top-14 right-3 bg-black/30 backdrop-blur-sm rounded-xl p-2 z-10">
          <StatBar label="용기" emoji="💪" value={stats.courage} color="bg-red-400" />
          <StatBar label="지혜" emoji="🧠" value={stats.wisdom} color="bg-blue-400" />
          <StatBar label="매력" emoji="✨" value={stats.charm} color="bg-pink-400" />
          <StatBar label="운" emoji="🍀" value={stats.luck} color="bg-green-400" />
        </div>

        {/* Scene area with characters */}
        <div className="flex-1 flex items-end justify-center px-4 pb-2 relative">
          {/* NPC */}
          {currentScene.npc && (
            <div className="absolute top-1/4 right-8 text-center">
              <div className="text-6xl animate-pulse">{currentScene.npc}</div>
              {currentScene.npcName && (
                <p className="text-xs text-white/70 mt-1 bg-black/30 rounded-full px-2 py-0.5">
                  {currentScene.npcName}
                </p>
              )}
            </div>
          )}

          {/* Protagonist */}
          <div className="text-center mb-2">
            <div className="text-7xl">{currentScene.character}</div>
          </div>
        </div>

        {/* Text box */}
        <div className="bg-black/60 backdrop-blur-md border-t border-white/20 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 bg-white/20 rounded-lg px-2 py-1">
              <span className="text-lg">{currentScene.character.slice(0, 2)}</span>
              <p className="text-[10px] text-white/80 text-center">{currentScene.characterName}</p>
            </div>
            <div className="flex-1 min-h-[60px]">
              <p className="text-white text-sm leading-relaxed">
                {displayedText}
                {isTyping && <span className="animate-pulse">▌</span>}
              </p>
              {isTyping && (
                <p className="text-[10px] text-white/40 mt-1">탭하면 스킵</p>
              )}
            </div>
          </div>

          {/* Choices */}
          {showChoices && currentScene.choices && (
            <div className="space-y-2 mt-2">
              {currentScene.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    makeChoice(choice);
                  }}
                  className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/25 active:bg-white/30 border border-white/20 rounded-xl text-white text-sm font-medium transition-all hover:translate-x-1"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {choice.text}
                  {choice.statChanges && (
                    <span className="float-right text-xs opacity-60">
                      {choice.statChanges.courage ? `💪+${choice.statChanges.courage} ` : ""}
                      {choice.statChanges.wisdom ? `🧠+${choice.statChanges.wisdom} ` : ""}
                      {choice.statChanges.charm ? `✨+${choice.statChanges.charm} ` : ""}
                      {choice.statChanges.luck ? `🍀${choice.statChanges.luck > 0 ? "+" : ""}${choice.statChanges.luck}` : ""}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-600">
      <button
        onClick={() => setScreen("title")}
        className="px-8 py-4 bg-white text-purple-700 font-bold rounded-2xl shadow-lg"
      >
        🏠 처음으로
      </button>
    </div>
  );
}
