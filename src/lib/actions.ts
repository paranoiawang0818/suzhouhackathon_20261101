"use client";

import { useStore, now, uid } from "./store";
import { answerHash, confirmedReq, currentReq } from "./flow";
import { runAI } from "./ui";
import { NEED_LABEL } from "./types";
import type { AnswerItem, MaterialCard, NeedKey, Needs, QAnalysis, ResultSource, SourceDoc, SubQuestion, Task } from "./types";

async function post<T>(url: string, body: unknown): Promise<T & { source: ResultSource; error?: string }> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const get = (id: string) => useStore.getState().tasks.find((t) => t.id === id)!;
const mutate = (...a: Parameters<ReturnType<typeof useStore.getState>["mutate"]>) => useStore.getState().mutate(...a);

/** 1 需求澄清：围绕“需求三问”生成新的需求版本（未确认） */
export async function runClarify(id: string, userNeeds: Partial<Record<NeedKey, string>>) {
  const t = get(id);
  const supplemented = Object.values(userNeeds).some((v) => v?.trim());
  const out = await runAI(
    supplemented ? "按补充重新整理需求" : "AI 正在梳理需求",
    supplemented
      ? ["读取销售补充的内容", "核对三个问题是否已说清", "重新拆分子问题", "生成新的需求版本"]
      : ["读取医生原话与背景", "梳理：想得到什么信息", "梳理：想解决什么问题", "梳理：希望医学部给什么", "拆分为可逐一回答的子问题"],
    () => post<{ needs: Needs; subQuestions: string[] }>("/api/clarify", { request: t.request, userNeeds }),
  );
  const subQuestions: SubQuestion[] = out.subQuestions.map((text, i) => ({ id: `q${i + 1}`, text }));
  for (const k of Object.keys(out.needs) as NeedKey[]) if (userNeeds[k]?.trim()) out.needs[k].byUser = true;
  const supplement = (Object.keys(userNeeds) as NeedKey[])
    .filter((k) => userNeeds[k]?.trim())
    .map((k) => `${NEED_LABEL[k].title}：${userNeeds[k]!.trim()}`)
    .join("；");
  mutate(
    id,
    (x) => {
      x.clarify = { needs: out.needs, subQuestions, source: out.source, at: now() };
      const v = (x.reqVersions[x.reqVersions.length - 1]?.v ?? 0) + 1;
      x.reqVersions.push({ v, at: now(), needs: out.needs, supplement, subQuestions, unknowns: [], confirmed: false });
    },
    supplemented ? "销售补充需求，AI 重新整理" : "AI 梳理需求三问与问题清单",
  );
  return out;
}

/** 2 AI 分析问题并调取资料（论文库 + 企业问题库） */
export async function runEvidence(id: string) {
  const t = get(id);
  const req = confirmedReq(t)!;
  const kb = useStore.getState().knowledge.filter((k) => k.taskId !== id && k.status === "有效");
  const out = await runAI(
    "AI 分析问题并调取资料",
    [
      "判断能否解答",
      "生成英文检索式",
      "实时检索 PubMed",
      `检索企业问题库（${kb.length} 条已确认答复）`,
      "整理解答思路与原文出处",
      "标注资料缺口，交给医学部",
    ],
    () =>
      post<{
        analysis: QAnalysis[];
        links: { subQId: string; sourceId: string; reason: string }[];
        kbLinks: { subQId: string; kbId: string; reason: string }[];
        gaps: { subQId: string; gap: string }[];
        fetchedSources: SourceDoc[];
        queries: { subQId: string; query: string }[];
      }>("/api/evidence", { subQuestions: req.subQuestions, extraSources: t.manualSources, kb, needs: req.needs, product: t.request.product, original: t.request.original }),
  );
  useStore.getState().mutate(id, (x) => {
    x.fetchedSources = out.fetchedSources;
    x.evidence = {
      queries: out.queries,
      analysis: out.analysis,
      kbLinks: out.kbLinks,
      links: out.links.map((l) => ({ ...l, id: uid("e"), status: "candidate", addedBy: "ai" })),
      gaps: out.gaps,
      scope: "PubMed 实时检索 + 内置资料库 + 企业问题库",
      source: out.source,
      at: now(),
    };
    x.stage = "answer";
    x.draft = req.subQuestions.map((q) => ({ subQId: q.id, text: "", cited: [], insufficient: false }));
    const direct = out.analysis.filter((a) => a.answerability === "direct").length;
    x.log.push({ at: now(), actor: "AI", action: `完成分析：${direct}/${req.subQuestions.length} 题可由资料直接回答，调取证据 ${out.links.length} 条、历史答复 ${out.kbLinks.length} 条，交医学部` });
  });
  return out;
}

/** 4 完整性检查 */
export async function runCheck(id: string) {
  const t = get(id);
  const req = confirmedReq(t)!;
  const out = await runAI(
    "AI 对照原问题审核",
    ["读取最初提交的问题", "逐题定位医学答复段落", "检查是否遗漏或答偏", "生成问题—答复对照表"],
    () =>
      post<{ items: { subQId: string; verdict: "answered" | "insufficient" | "missing"; note: string }[] }>("/api/check", {
        original: t.request.original,
        subQuestions: req.subQuestions,
        answers: t.draft,
      }),
  );
  useStore.getState().mutate(id, (x) => {
    x.checks.push({ id: uid("c"), at: now(), answerHash: answerHash(t.draft), reqV: req.v, items: out.items, source: out.source });
    x.stage = "check";
    const miss = out.items.filter((i) => i.verdict === "missing").length;
    x.log.push({ at: now(), actor: "AI", action: `完成完整性检查：${miss ? `${miss} 项可能遗漏` : "各问题均已回应"}` });
  });
  return out;
}

/** 5 生成沟通卡 */
export async function runMaterial(id: string, style: string) {
  const t = get(id);
  const ans = t.answers[t.answers.length - 1];
  const req = t.reqVersions.find((r) => r.v === ans.reqV) ?? confirmedReq(t)!;
  const out = await runAI(
    "AI 正在制作沟通卡",
    [`读取已确认的医学答复 v${ans.v}`, "套用企业一页沟通卡模板", "保留适用范围、限制与引用", style ? "按个人表达偏好调整语气" : "统一专业表达"],
    () =>
      post<{ card: MaterialCard }>("/api/material", {
        subQuestions: req.subQuestions,
        answers: ans.items,
        purpose: t.request.purpose,
        audience: t.request.audience,
        style,
      }),
  );
  mutate(
    id,
    (x) => {
      x.materials.push({ id: uid("m"), v: x.materials.length + 1, at: now(), basedOnAnswerV: ans.v, card: out.card, source: out.source, style });
    },
    `生成沟通卡 v${t.materials.length + 1}（依据医学答复 v${ans.v}）`,
  );
  return out;
}

export function subQs(t: Task) {
  return (confirmedReq(t) ?? currentReq(t))?.subQuestions ?? [];
}

export function emptyDraft(qs: SubQuestion[]): AnswerItem[] {
  return qs.map((q) => ({ subQId: q.id, text: "", cited: [], insufficient: false }));
}
