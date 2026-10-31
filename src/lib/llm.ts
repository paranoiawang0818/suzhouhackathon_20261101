import "server-only";
import OpenAI from "openai";
import { z } from "zod";

/** DeepSeek（OpenAI 兼容接口）。配置见 .env.example */
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
const THINKING = process.env.DEEPSEEK_THINKING === "disabled" ? "disabled" : "enabled";

export function llmConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

let client: OpenAI | null = null;
function getClient() {
  if (!client)
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      timeout: 55_000,
      maxRetries: 1,
    });
  return client;
}

/**
 * 调用模型并按 zod schema 返回结构化结果。
 * DeepSeek 的 JSON 模式要求提示词里出现“json”并给出结构；输出为空或不合格时重试一次，仍失败则抛错，由调用方降级为预设结果。
 */
export async function askJSON<T extends z.ZodType>(system: string, user: string, schema: T): Promise<z.infer<T>> {
  if (!llmConfigured()) throw new Error("LLM 未配置");
  const shape = JSON.stringify(z.toJSONSchema(schema));
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: `${system}\n\n只输出一个 json 对象，不要输出其他文字。json 必须符合以下 JSON Schema：\n${shape}` },
    { role: "user", content: user },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const params = {
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      max_tokens: 6000,
      thinking: { type: THINKING },
    } as OpenAI.ChatCompletionCreateParamsNonStreaming;
    const res = await getClient().chat.completions.create(params);
    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      lastError = `模型返回空内容（finish_reason: ${res.choices[0]?.finish_reason}）`;
      continue;
    }
    try {
      const parsed = schema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      lastError = `输出不符合结构：${parsed.error.message.slice(0, 300)}`;
    } catch {
      lastError = "输出不是合法 json";
    }
    messages.push({ role: "assistant", content }, { role: "user", content: `上一次输出有问题：${lastError}。请严格按 JSON Schema 重新输出 json。` });
  }
  throw new Error(lastError);
}
