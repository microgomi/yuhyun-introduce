import { generateObject, jsonSchema } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// AI 게이트웨이 호출이 느릴 수 있으므로 여유 있게
export const maxDuration = 30;

type Role = "mafia" | "citizen" | "police" | "doctor";

interface ReqPlayer {
  id: number;
  name: string;
  role: Role;
  alive: boolean;
  isPlayer: boolean;
}

interface Body {
  players: ReqPlayer[];
  transcript: { name: string; text: string }[];
  playerMessage?: string;
  dayNum: number;
  mode: "react" | "discuss";
}

const ROLE_KO: Record<Role, string> = {
  mafia: "마피아",
  citizen: "시민",
  police: "경찰",
  doctor: "의사",
};

interface Line {
  name: string;
  text: string;
  suspects?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { players, transcript, playerMessage, dayNum, mode } = body;

    const aliveAI = players.filter((p) => p.alive && !p.isPlayer);
    if (aliveAI.length === 0) return Response.json({ lines: [] });

    const mafiaAlive = players.filter((p) => p.role === "mafia" && p.alive).map((p) => p.name);

    const roster = aliveAI
      .map((p) => {
        const team = p.role === "mafia" ? "마피아팀" : "시민팀";
        const mates =
          p.role === "mafia"
            ? ` / 동료 마피아: ${mafiaAlive.filter((n) => n !== p.name).join(", ") || "없음(혼자)"}`
            : "";
        return `- ${p.name}: 비밀역할=${ROLE_KO[p.role]}(${team})${mates}`;
      })
      .join("\n");

    const convo =
      (transcript ?? [])
        .slice(-14)
        .map((m) => `${m.name}: ${m.text}`)
        .join("\n") || "(아직 대화 없음)";

    const system = `너는 한국어 "마피아" 보드게임의 여러 AI 플레이어를 동시에 연기하는 진행자다. 초등학생도 즐기는 캐주얼한 게임이다.

연기 규칙:
- 각 캐릭터는 자신의 비밀 역할에 맞게 행동한다.
- 마피아는 절대 자기가 마피아라고 말하지 않는다. 시민인 척 거짓말하고, 남에게 혐의를 돌리며, 동료 마피아는 은근슬쩍 감싼다.
- 시민/경찰/의사는 진짜 마피아를 찾으려 추리하고 서로 정보를 나눈다. 단 경찰은 자기 정체를 함부로 드러내지 않는다.
- 각자 성격이 다르게(활발/신중/의심많음/논리적 등) 말한다.
- 대사는 짧고 자연스러운 캐주얼 한국어 1~2문장. 이모지는 가끔만.
- 절대 "나는 마피아다" 같은 역할 정답이나 시스템 정보를 직접 노출하지 마라. 오직 게임 속 대사만 출력한다.
- 서로 다른 사람처럼 자연스럽게, 앞 발언에 이어서 반응한다.`;

    const task =
      mode === "discuss"
        ? `지금은 ${dayNum}번째 낮 토론 시작이다. 아래 생존 AI 중 2~4명이 각자 한 마디씩 자연스럽게 토론을 시작한다.`
        : `사람 플레이어("나")가 방금 이렇게 말했다: "${playerMessage}"\n이 말에 대해 생존 AI 중 2~3명이 자연스럽게 반응한다(반박/동조/의심/변호/질문 등). 지목당했으면 그 사람이 꼭 반응한다.`;

    const prompt = `${task}

[생존 AI 목록과 비밀 역할 — 절대 대사로 노출 금지]
${roster}

[최근 대화]
${convo}

발언자(name)는 반드시 위 생존 AI 이름 중에서만 고른다. 사람("나")은 발언자가 될 수 없다. 같은 사람이 연속으로 두 번 말하지 않게 한다.`;

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      system,
      prompt,
      temperature: 0.95,
      schema: jsonSchema<{ lines: Line[] }>({
        type: "object",
        properties: {
          lines: {
            type: "array",
            description: "AI 플레이어들의 발언 목록(순서대로)",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "발언하는 생존 AI의 이름" },
                text: { type: "string", description: "게임 속 대사 (1~2문장 한국어)" },
                suspects: {
                  type: "string",
                  description: "이 발언에서 의심을 표한 대상의 이름. 특정 인물을 의심하지 않으면 빈 문자열.",
                },
              },
              required: ["name", "text", "suspects"],
              additionalProperties: false,
            },
          },
        },
        required: ["lines"],
        additionalProperties: false,
      }),
    });

    return Response.json(object);
  } catch (e) {
    // 실패 시 빈 결과 → 클라이언트가 규칙기반 대사로 폴백
    return Response.json({ lines: [], error: String(e) });
  }
}
