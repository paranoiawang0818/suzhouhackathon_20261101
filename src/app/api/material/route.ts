import { z } from "zod";
import { askJSON } from "@/lib/llm";
import { presetMaterial } from "@/lib/fallback";
import type { AnswerItem, SubQuestion } from "@/lib/types";

export const maxDuration = 60;

const Schema = z.object({
  headline: z.string(),
  sections: z.array(z.object({ title: z.string(), body: z.string(), subQId: z.string() })),
  cautions: z.array(z.string()),
});

const SYSTEM = `你帮助药企一线销售，把医学部已确认的答复整理成给医生的一页沟通卡。
硬性约束：
- 只能使用给定的医学答复内容，不得新增任何医学结论、数据、适应症或比较。
- 保留答复中的研究条件、适用范围、限制和“资料不足”的说明，不得弱化或删除。
- 每个 section 对应一个子问题（subQId 必须与输入一致），title 改写为简短的小标题，body 用更易读的表达复述答复。
- cautions 最多 3 条：只列需要提醒医生的限制、适用范围或证据边界（来自答复原文），不要重复正文里的事实；最后一条固定为“具体用药请以说明书及医生判断为准”。
- 可以按销售的表达偏好调整语气和结构，但偏好与以上约束冲突时以约束为准。
- 使用简体中文。`;

export async function POST(req: Request) {
  const { subQuestions, answers, purpose, audience, style } = (await req.json()) as {
    subQuestions: SubQuestion[];
    answers: AnswerItem[];
    purpose: string;
    audience: string;
    style: string;
  };
  const user = `用途：${purpose}\n对象：${audience}\n销售的表达偏好：${style || "（无）"}\n\n医学部已确认答复：\n${subQuestions
    .map((q) => {
      const a = answers.find((x) => x.subQId === q.id);
      return `【${q.id}】${q.text}\n${a?.text ?? ""}`;
    })
    .join("\n\n")}`;
  try {
    const out = await askJSON(SYSTEM, user, Schema);
    return Response.json({ card: out, source: "ai" });
  } catch (e) {
    return Response.json({ card: presetMaterial(subQuestions, answers), source: "preset", error: String(e) });
  }
}
