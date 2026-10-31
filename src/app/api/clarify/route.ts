import { z } from "zod";
import { askJSON } from "@/lib/llm";
import { presetClarify } from "@/lib/fallback";
import type { NeedKey, RequestInput } from "@/lib/types";

export const maxDuration = 60;

const NeedSchema = z.object({ value: z.string(), clear: z.boolean(), ask: z.string() });
const Schema = z.object({
  needs: z.object({ info: NeedSchema, goal: NeedSchema, deliver: NeedSchema }),
  subQuestions: z.array(z.string()),
});

const DEFAULT_ASK: Record<NeedKey, string> = {
  info: "请确认需要医学部提供哪些具体事实或数据。",
  goal: "请确认这次想帮医生解决的具体问题（如目标人群、使用场景）。",
  deliver: "请确认希望医学部答到什么程度（只要事实 / 也要说明证据边界）。",
};

const SYSTEM = `你是药企内部“医学问询协作平台”的需求澄清助手，服务对象是一线销售 / 代表。
目标：在交给医学部之前，帮一线人员把“自己到底要什么”说清楚。不是让销售去追问医生，而是帮销售想清楚三件事：
- info 想得到什么信息：需要医学部提供哪些事实或数据。
- goal 想解决什么问题：这次沟通要帮医生解决什么、背后的场景（例如是否考虑给某类患者用药）。
- deliver 希望医学部给什么：答复的深度和形式，是否需要说明证据覆盖不到的地方。

规则：
- 每一项写出你的理解 value（一句话，不超过 50 字）。能从医生原话、用途、交付要求和销售填写的内容中明确得出时 clear=true，ask 留空。
- 判断标准：
  · info 可以从医生原话推断：只要能列出需要哪些具体事实就算明确，不要因为原话口语化（如“那个大研究”）判为不明确。
  · goal 和 deliver 必须由一线人员自己说明：除非“销售填写的需求”里已经写了，或医生原话里明确说出了具体场景（例如“想给 80 岁的患者用”），否则一律 clear=false。“用途：回复医生学术问询”和“交付要求：一页沟通卡”只说明了形式，不足以说明想解决什么、要到什么深度。
- 不能明确时 clear=false，value 写你的推测，ask 写一个简短的问题请销售补充（一句话，不超过 45 字），可在括号里附 1–2 个选项示例。
- 销售已经填写的项视为明确，value 直接采用其内容（可略作整理，不改变含义），clear=true。
- 再根据三项内容，把需求拆成 2–4 个医学部可以逐一回答的子问题 subQuestions，忠实于原意，不扩大、不缩小范围。
- 你不回答医学问题本身，也不得把未知信息填成事实。
- 全部使用简体中文。`;

export async function POST(req: Request) {
  const { request, userNeeds = {} } = (await req.json()) as {
    request: RequestInput;
    userNeeds?: Partial<Record<NeedKey, string>>;
  };
  const filled = (k: NeedKey) => userNeeds[k]?.trim() || "（未填写）";
  const user = `产品/议题：${request.product}
医生原话：${request.original}
用途：${request.purpose}
沟通对象：${request.audience}
交付要求：${request.delivery}

销售填写的需求：
- 想得到什么信息：${filled("info")}
- 想解决什么问题：${filled("goal")}
- 希望医学部给什么：${filled("deliver")}`;
  try {
    const out = await askJSON(SYSTEM, user, Schema);
    for (const k of ["info", "goal", "deliver"] as NeedKey[]) {
      const n = out.needs[k];
      // 销售填写过的项以销售为准
      if (userNeeds[k]?.trim()) {
        out.needs[k] = { ...n, clear: true, ask: "" };
        continue;
      }
      // 产品规则：goal / deliver 必须由一线人员本人确认，AI 只能给出推测
      const clear = k === "info" ? n.clear : false;
      const bare = n.value.replace(/[（(]推测[)）]/g, "").trim();
      out.needs[k] = { ...n, clear, value: clear ? bare : `（推测）${bare}`, ask: clear ? "" : n.ask || DEFAULT_ASK[k] };
    }
    return Response.json({ ...out, source: "ai" });
  } catch (e) {
    return Response.json({ ...presetClarify(request, userNeeds), source: "preset", error: String(e) });
  }
}
