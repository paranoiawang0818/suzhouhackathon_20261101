import { z } from "zod";
import { askJSON } from "@/lib/llm";
import { presetCheck } from "@/lib/fallback";
import type { AnswerItem, SubQuestion } from "@/lib/types";

export const maxDuration = 60;

const Schema = z.object({
  items: z.array(
    z.object({
      subQId: z.string(),
      verdict: z.enum(["answered", "insufficient", "missing"]),
      note: z.string(),
    }),
  ),
});

const SYSTEM = `你是医学答复的“完整性检查”助手。对照最初提交的问题，逐个子问题检查医学人员的答复是否作出了回应。
你只检查“有没有回应、有没有答偏”，不评价医学内容是否正确，不输出正确率，不改写答复。
verdict 取值：
- answered：答复正面回应了该子问题。
- insufficient：答复明确说明了现有资料不足或无法回答，并说明了原因。这是可以接受的处理结果。
- missing：没有答复、答复空白，或答复没有回应该子问题问的内容（答偏/只回答了一部分）。
note：一句中文，说明判断依据；为 missing 时指出具体缺了什么。
必须对每个子问题都给出一条结果。使用简体中文。`;

export async function POST(req: Request) {
  const { original, subQuestions, answers } = (await req.json()) as {
    original: string;
    subQuestions: SubQuestion[];
    answers: AnswerItem[];
  };
  const user = `医生原话：${original}\n\n${subQuestions
    .map((q) => {
      const a = answers.find((x) => x.subQId === q.id);
      return `【${q.id}】子问题：${q.text}\n医学答复：${a?.text?.trim() || "（空）"}${a?.insufficient ? "\n（医学人员已勾选：资料不足）" : ""}`;
    })
    .join("\n\n")}`;
  try {
    const out = await askJSON(SYSTEM, user, Schema);
    const items = subQuestions.map(
      (q) =>
        out.items.find((i) => i.subQId === q.id) ?? {
          subQId: q.id,
          verdict: "missing" as const,
          note: "AI 未返回该题结果，请人工核对。",
        },
    );
    return Response.json({ items, source: "ai" });
  } catch (e) {
    return Response.json({ items: presetCheck(subQuestions, answers), source: "preset", error: String(e) });
  }
}
