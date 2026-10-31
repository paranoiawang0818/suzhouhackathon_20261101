/**
 * AI 不可用时的预设兜底逻辑。返回结果统一标记 source: "preset"，界面上如实展示。
 */
import { SOURCES } from "./sources";
import type { Answerability, AnswerItem, CheckItem, KnowledgeEntry, MaterialCard, Need, NeedKey, Needs, QAnalysis, RequestInput, SourceDoc, SubQuestion } from "./types";

const DEMO_HINT = /玛仕度肽|GLORY|mazdutide/i;

/** 需求三问的预设判断：销售填写过的项视为明确；示例问题给出推测与追问 */
export function presetClarify(request: RequestInput, userNeeds: Partial<Record<NeedKey, string>>) {
  const u = (k: NeedKey) => userNeeds[k]?.trim() ?? "";
  const isDemo = DEMO_HINT.test(request.original) && /年龄|岁|老年|老人/.test(request.original);
  const need = (k: NeedKey, guess: string, ask: string, clearByDefault = false): Need =>
    u(k) ? { value: u(k), clear: true, ask: "", byUser: true } : clearByDefault ? { value: guess, clear: true, ask: "" } : { value: `（推测）${guess}`, clear: false, ask };

  if (isDemo) {
    const goalText = u("goal");
    const age = goalText.match(/\d{2}\s*岁(以上)?/)?.[0];
    const wantsSafety = /安全|不良|副作用/.test(`${goalText}${u("deliver")}`);
    const needs: Needs = {
      info: need("info", "GLORY-1 研究的纳入年龄、对照设置，以及现有证据能否支持老年患者使用", "", true),
      goal: need(
        "goal",
        "医生在考虑是否给老年肥胖患者用药，想知道研究证据是否覆盖这类患者",
        "这次答复主要想帮医生解决什么？“老年”具体指多大年龄？例如：判断 75 岁以上患者能否使用 / 只了解研究设计",
      ),
      deliver: need(
        "deliver",
        "一页沟通卡，内容以研究事实为主",
        "希望医学部给到什么程度？例如：只要研究事实 / 同时说明证据覆盖不到的人群 / 需要安全性数据",
      ),
    };
    return {
      needs,
      subQuestions: [
        "GLORY-1 研究纳入人群的年龄范围及主要入选条件是什么？",
        "GLORY-1 研究的比较对象（对照组）是什么？",
        age
          ? `现有资料能否回答 ${age}患者使用的${wantsSafety ? "安全性与疗效" : "疗效与安全性"}？`
          : "现有资料能否回答医生所指“老年”人群的疗效与安全性？",
      ],
    };
  }

  const parts = request.original
    .split(/[？?；;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  return {
    needs: {
      info: need("info", request.original, "", true),
      goal: need("goal", `${request.purpose || "回复医生问询"}`, "这次沟通想帮医生解决什么问题？背后是什么场景？"),
      deliver: need("deliver", request.delivery || "书面答复", "希望医学部给到什么程度？只要事实，还是也要说明证据边界？"),
    } satisfies Needs,
    subQuestions: (parts.length ? parts : [request.original]).map((p) => (/[？?]$/.test(p) ? p : `${p}？`)),
  };
}

function tokens(s: string) {
  const out = new Set<string>();
  const clean = s.replace(/[，。？?、：:（）()“”"\s]/g, "");
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2));
  return out;
}

const KEYWORD_MAP: [RegExp, string[], string][] = [
  [/年龄|入选|纳入|人群/, ["S2", "S10"], "给出了研究纳入年龄与入选条件"],
  [/比较|对照|跟什么比|对比/, ["S3", "S1"], "给出了分组与对照设置"],
  [/老年|75|65|以上/, ["S2", "S7"], "研究年龄上限及该人群内的安全性数据"],
  [/安全|不良|副作用|停药/, ["S7"], "描述了不良事件与停药比例"],
  [/终点/, ["S4"], "给出了主要终点定义"],
  [/减重|效果|幅度|疗效/, ["S5", "S6", "S11"], "给出了体重变化数据（注意论文与新闻稿口径不同）"],
  [/机制|靶点|作用/, ["S8"], "描述了作用机制"],
  [/糖尿病|血糖|T2D/i, ["S12"], "说明了 2 型糖尿病适应症的审评状态"],
];

const AGE_GAP = "资料范围内未找到 75 岁以上人群的研究数据；GLORY-1 仅纳入 18–75 岁。";

/** 资料覆盖不到的问题：给出相关资料，同时写明缺口 */
const GAP_RULES: [RegExp, string[], string, string][] = [
  [/司美格鲁肽|替尔泊肽|头对头|直接对比/, ["S3"], "说明了 GLORY-1 的对照为安慰剂", "资料范围内没有玛仕度肽与司美格鲁肽的头对头研究；GLORY-1 的对照为安慰剂，不能据此做跨研究比较。"],
  [/多久|缓解|持续时间/, ["S7"], "描述了胃肠道不良事件的严重程度", "摘要未报告胃肠道反应的持续时间或缓解时间，需查阅全文或其他资料。"],
];

export function presetEvidence(subQs: SubQuestion[], pool: SourceDoc[] = SOURCES, kb: KnowledgeEntry[] = []) {
  const links: { subQId: string; sourceId: string; reason: string }[] = [];
  const gaps: { subQId: string; gap: string }[] = [];
  for (const q of subQs) {
    const mapped = new Map<string, string>();
    for (const [re, ids, reason] of KEYWORD_MAP)
      if (re.test(q.text)) ids.forEach((id) => !mapped.has(id) && mapped.set(id, reason));
    for (const [re, ids, reason] of GAP_RULES) if (re.test(q.text)) ids.forEach((id) => !mapped.has(id) && mapped.set(id, reason));
    if (mapped.size) {
      [...mapped].slice(0, 4).forEach(([sourceId, reason]) => links.push({ subQId: q.id, sourceId, reason: `${reason}（预设检索）` }));
      const g = GAP_RULES.find(([re]) => re.test(q.text)) ?? (/老年|75|65|以上/.test(q.text) ? [null, [], "", AGE_GAP] : null);
      if (g) gaps.push({ subQId: q.id, gap: g[3] as string });
      continue;
    }
    const qt = tokens(q.text);
    const scored = pool
      .map((s) => {
        const st = tokens(`${s.zh}${s.scope}${s.location}`);
        let hit = 0;
        qt.forEach((t) => st.has(t) && hit++);
        return { s, hit };
      })
      .filter((x) => x.hit >= 2)
      .sort((a, b) => b.hit - a.hit)
      .slice(0, 3);
    scored.forEach(({ s }) =>
      links.push({ subQId: q.id, sourceId: s.id, reason: "关键词匹配（预设检索）" }),
    );
    if (/老年|75|65|以上/.test(q.text))
      gaps.push({ subQId: q.id, gap: "资料范围内未找到 75 岁以上人群的研究数据；GLORY-1 仅纳入 18–75 岁。" });
    else if (!scored.length) gaps.push({ subQId: q.id, gap: "资料范围内未找到直接相关的内容。" });
  }
  const analysis: QAnalysis[] = subQs.map((q) => {
    const rule = APPROACH_RULES.find(([re]) => re.test(q.text));
    if (rule) return { subQId: q.id, answerability: rule[1], approach: rule[2] };
    const has = links.some((l) => l.subQId === q.id);
    return has
      ? { subQId: q.id, answerability: "partial", approach: "可参考匹配到的资料，建议医学人员核对适用性后作答。" }
      : { subQId: q.id, answerability: "insufficient", approach: "资料范围内未找到相关内容，建议医学人员补查。" };
  });
  const kbLinks: { subQId: string; kbId: string; reason: string }[] = [];
  for (const q of subQs) {
    const qg = TOPICS.filter(([, re]) => re.test(q.text)).map(([name]) => name);
    for (const k of kb.filter((x) => x.status === "有效")) {
      const item = k.items.find((i) => TOPICS.some(([name, re]) => qg.includes(name) && re.test(i.q)));
      if (item) kbLinks.push({ subQId: q.id, kbId: k.id, reason: `已确认答复中有「${item.q}」，可参考（预设检索）` });
    }
  }
  return { analysis, links, gaps, kbLinks };
}

/** 预设的“能不能答、怎么答”判断：按问题内容给出思路（仅作线索） */
const APPROACH_RULES: [RegExp, Answerability, string][] = [
  [/老年|75|65|以上/, "partial", "先说明研究年龄上限为 18–75 岁，再引用研究人群内的安全性数据作参考；明确 75 岁以上人群缺乏数据，不外推。"],
  [/司美格鲁肽|替尔泊肽|头对头|直接对比/, "partial", "说明 GLORY-1 以安慰剂为对照、没有头对头研究；不建议跨研究比较减重幅度。"],
  [/多久|缓解|持续时间/, "partial", "可引用不良事件的类型与严重程度；持续时间摘要未报告，需补查全文。"],
  [/年龄|入选|纳入/, "direct", "直接引用 GLORY-1 入选标准回答；可对照获批适应症，说明人群表述一致。"],
  [/比较|对照|跟什么比/, "direct", "引用研究分组设计回答，并说明未与其他减重药物直接比较。"],
  [/停药/, "direct", "引用各组因不良事件停药的比例，注明观察期为 48 周。"],
  [/不良|副作用|安全/, "direct", "引用安全性结果：最常见不良事件的类型与严重程度。"],
  [/终点/, "direct", "引用主要终点的定义与评估时间点（第 32 周）。"],
  [/减重|效果|幅度|疗效/, "direct", "以论文第 32 / 48 周数据为准；新闻稿数字口径不同，建议不混用。"],
];

const TOPICS: [string, RegExp][] = [
  ["age", /年龄|入选|纳入|老年|岁/],
  ["safety", /不良|副作用|安全|停药|胃肠/],
  ["endpoint", /终点/],
  ["efficacy", /减重|效果|幅度|疗效/],
];

export function presetCheck(subQs: SubQuestion[], items: AnswerItem[]): CheckItem[] {
  return subQs.map((q) => {
    const a = items.find((i) => i.subQId === q.id);
    if (!a || a.text.trim().length < 6)
      return { subQId: q.id, verdict: "missing", note: "未找到针对该子问题的答复内容。" };
    if (a.insufficient || /不足|无法回答|未纳入|没有数据/.test(a.text))
      return { subQId: q.id, verdict: "insufficient", note: "答复已明确说明资料不足。" };
    return { subQId: q.id, verdict: "answered", note: "有对应答复（预设规则判断，未做语义核对）。" };
  });
}

export function presetMaterial(subQs: SubQuestion[], items: AnswerItem[]): MaterialCard {
  return {
    headline: "医学问询答复要点",
    sections: subQs.map((q) => ({
      title: q.text,
      body: items.find((i) => i.subQId === q.id)?.text ?? "",
      subQId: q.id,
    })),
    cautions: ["以上内容依据医学部确认的答复整理，具体用药请以说明书及医生判断为准。"],
  };
}
