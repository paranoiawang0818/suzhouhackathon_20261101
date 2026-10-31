import type { AnswerItem, CheckResult, Role, Stage, Task } from "./types";

export const STEPS: { stage: Stage; no: string; title: string; who: Role | "ai" }[] = [
  { stage: "clarify", no: "1", title: "说清需求", who: "sales" },
  { stage: "evidence", no: "2", title: "AI 分析并调取资料", who: "ai" },
  { stage: "answer", no: "3", title: "医学部答复", who: "medical" },
  { stage: "check", no: "4", title: "AI 对照原问题审核", who: "medical" },
  { stage: "material", no: "5", title: "销售制作品牌材料", who: "sales" },
  { stage: "feedback", no: "6", title: "记录医生反馈", who: "sales" },
];

export const stageIndex = (s: Stage) => (s === "done" ? 6 : STEPS.findIndex((x) => x.stage === s));

export const STATUS: Record<Stage, { label: string; handler: string; next: string; who: Role | "ai" }> = {
  clarify: { label: "待澄清", handler: "销售", next: "说清三个需求问题并确认", who: "sales" },
  evidence: { label: "AI 分析中", handler: "AI", next: "AI 预判并调取资料，完成后交医学部", who: "ai" },
  answer: { label: "医学处理中", handler: "医学部", next: "查证并逐题撰写答复", who: "medical" },
  check: { label: "完整性待核对", handler: "医学部", next: "处理 AI 提示并确认答复版本", who: "medical" },
  material: { label: "医学答复已确认", handler: "销售", next: "制作沟通材料并交付", who: "sales" },
  feedback: { label: "等待反馈", handler: "销售", next: "记录医生反馈", who: "sales" },
  done: { label: "已完成", handler: "—", next: "—", who: "sales" },
};

/** 答复内容指纹：答复一改，旧的完整性检查即视为过期 */
export function answerHash(items: AnswerItem[]) {
  const s = JSON.stringify(items.map((i) => [i.subQId, i.text.trim(), i.insufficient]));
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function currentReq(t: Task) {
  return t.reqVersions[t.reqVersions.length - 1];
}

export function confirmedReq(t: Task) {
  return [...t.reqVersions].reverse().find((r) => r.confirmed);
}

export const extraSources = (t: Task) => [...t.manualSources, ...(t.fetchedSources ?? [])];

export function latestCheck(t: Task): CheckResult | undefined {
  return t.checks[t.checks.length - 1];
}

export function checkIsStale(t: Task, c?: CheckResult) {
  if (!c) return true;
  return c.answerHash !== answerHash(t.draft) || c.reqV !== confirmedReq(t)?.v;
}

export function checkAllHandled(c?: CheckResult) {
  return !!c && c.items.every((i) => i.verdict !== "missing" || i.resolution);
}

export function fmt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function daysLeft(deadline: string) {
  if (!deadline) return null;
  const ms = new Date(deadline + "T23:59:59").getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}
