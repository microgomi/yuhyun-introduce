import Link from "next/link";

export default function FriendsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            🏠 소개페이지
          </Link>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">🤝 친구 추가 가이드</span>
          <div className="w-20" />
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-32 pb-16 text-center">
        <div className="animate-fade-in-up">
          <span className="mb-4 inline-block text-7xl">🤝</span>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            로블록스에서
            <span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent"> 친구 추가하기</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
            친구와 함께하면 로블록스가 100배 더 재밌어요! 친구를 추가하는 방법을 알아볼까요?
          </p>
        </div>
      </section>

      {/* Method 1: Search */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🔍 방법 1: 이름으로 검색하기
          </h2>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: "로블록스 접속하기",
                desc: "로블록스 앱이나 웹사이트에 로그인해요.",
                icon: "🖥️",
              },
              {
                step: 2,
                title: "검색창 찾기",
                desc: "화면 위쪽에 있는 검색창(돋보기 아이콘)을 클릭해요.",
                icon: "🔎",
              },
              {
                step: 3,
                title: "친구 이름 입력하기",
                desc: "추가하고 싶은 친구의 로블록스 사용자 이름을 정확하게 입력해요.",
                icon: "⌨️",
              },
              {
                step: 4,
                title: "검색 결과에서 \"사람\" 탭 선택",
                desc: "검색 결과에서 \"사람(People)\" 탭을 눌러서 사용자 목록을 확인해요.",
                icon: "👤",
              },
              {
                step: 5,
                title: "친구 추가 버튼 클릭!",
                desc: "원하는 친구를 찾았으면 \"친구 추가(Add Friend)\" 버튼을 눌러요. 상대방이 수락하면 완료!",
                icon: "✅",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:bg-pink-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-100 text-2xl dark:bg-pink-900/30">
                  {item.icon}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-pink-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      STEP {item.step}
                    </span>
                    <h3 className="font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Method 2: In-Game */}
      <section className="bg-zinc-50 px-6 py-16 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🎮 방법 2: 게임 안에서 추가하기
          </h2>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: "게임에 들어가기",
                desc: "좋아하는 로블록스 게임에 들어가요.",
                icon: "🎮",
              },
              {
                step: 2,
                title: "리더보드 열기",
                desc: "게임 화면에서 오른쪽 위에 있는 사람 목록(리더보드)을 확인해요.",
                icon: "📋",
              },
              {
                step: 3,
                title: "플레이어 이름 클릭하기",
                desc: "친구로 추가하고 싶은 플레이어의 이름을 클릭해요.",
                icon: "👆",
              },
              {
                step: 4,
                title: "친구 요청 보내기",
                desc: "프로필이 뜨면 \"친구 추가(Add Friend)\" 버튼을 눌러서 요청을 보내요!",
                icon: "💌",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:bg-rose-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-2xl dark:bg-rose-900/30">
                  {item.icon}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      STEP {item.step}
                    </span>
                    <h3 className="font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Method 3: Friend Request */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            📩 친구 요청 수락하기
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-zinc-500 dark:text-zinc-400">
            누군가 나에게 친구 요청을 보냈다면 이렇게 수락할 수 있어요!
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                emoji: "🔔",
                title: "알림 확인",
                desc: "화면 위쪽 종 모양 아이콘을 눌러 알림을 확인해요.",
              },
              {
                emoji: "👀",
                title: "요청 확인",
                desc: "친구 요청 목록에서 누가 보냈는지 확인해요.",
              },
              {
                emoji: "✅",
                title: "수락하기",
                desc: "\"수락(Accept)\" 버튼을 누르면 친구가 돼요!",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="mb-3 block text-5xl">{item.emoji}</span>
                <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="bg-zinc-50 px-6 py-16 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🛡️ 안전하게 친구 사귀기
          </h2>
          <div className="space-y-4">
            {[
              { emoji: "🔒", text: "개인정보(본명, 전화번호, 주소, 학교 이름)는 절대 알려주지 않아요" },
              { emoji: "👨‍👩‍👧", text: "모르는 사람의 친구 요청은 부모님과 상의한 후 결정해요" },
              { emoji: "🚫", text: "불편하거나 이상한 말을 하는 사람은 바로 차단하고 신고해요" },
              { emoji: "💬", text: "채팅할 때는 예의 바르게, 좋은 말만 사용해요" },
              { emoji: "🤗", text: "실제로 아는 친구를 먼저 추가하는 것이 가장 안전해요" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-5 dark:border-yellow-900/50 dark:bg-yellow-900/10"
              >
                <span className="text-2xl">{item.emoji}</span>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fun Together */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            🎉 친구와 함께 할 수 있는 것들
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { emoji: "🏠", title: "같이 게임 플레이", desc: "친구와 같은 서버에 들어가서 함께 게임을 즐겨요!", color: "from-blue-400 to-cyan-300" },
              { emoji: "💬", title: "채팅하기", desc: "게임 안에서 친구와 대화하며 소통할 수 있어요!", color: "from-green-400 to-emerald-300" },
              { emoji: "🎁", title: "아이템 교환", desc: "일부 게임에서는 친구와 아이템을 교환할 수 있어요!", color: "from-purple-400 to-violet-300" },
              { emoji: "🏗️", title: "같이 건축하기", desc: "친구와 함께 멋진 건물을 만들어 보세요!", color: "from-orange-400 to-amber-300" },
            ].map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-transform hover:scale-105 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className={`bg-gradient-to-r ${item.color} px-6 py-4`}>
                  <span className="text-3xl">{item.emoji}</span>
                </div>
                <div className="p-5">
                  <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="px-6 py-16 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 dark:bg-white dark:text-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          홈으로 돌아가기
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white/50 px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-5xl text-center text-sm text-zinc-400 dark:text-zinc-500">
          <p>&copy; 2026 진유현의 로블록스 친구 추가 가이드 🤝</p>
        </div>
      </footer>
    </div>
  );
}
