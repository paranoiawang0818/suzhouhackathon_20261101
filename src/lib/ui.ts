"use client";

import { create } from "zustand";
import type { Stage } from "./types";

/** 界面临时状态（不持久化）：AI 过程浮层与交接提示 */
interface AIRun {
  title: string;
  steps: string[];
  idx: number; // 当前进行到第几步；= steps.length 表示完成
}

export interface Toast {
  id: number;
  title: string;
  desc?: string;
  tone: "brand" | "med" | "kb" | "loop";
}

interface UIState {
  aiRun: AIRun | null;
  toasts: Toast[];
}

export const useUI = create<UIState>()(() => ({ aiRun: null, toasts: [] }));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STEP_MS = 620;

/** 运行一次 AI 调用，并把处理过程逐行展示出来；预设结果秒回时也保证过程可见 */
export async function runAI<T>(title: string, steps: string[], fn: () => Promise<T>): Promise<T> {
  useUI.setState({ aiRun: { title, steps, idx: 0 } });
  let i = 0;
  const timer = setInterval(() => {
    i = Math.min(i + 1, steps.length - 1);
    useUI.setState((s) => (s.aiRun ? { aiRun: { ...s.aiRun, idx: Math.max(s.aiRun.idx, i) } } : s));
  }, STEP_MS);
  try {
    const [res] = await Promise.all([fn(), sleep(STEP_MS * steps.length)]);
    clearInterval(timer);
    useUI.setState((s) => (s.aiRun ? { aiRun: { ...s.aiRun, idx: steps.length } } : s));
    await sleep(550);
    return res;
  } finally {
    clearInterval(timer);
    useUI.setState({ aiRun: null });
  }
}

let toastId = 0;
export function toast(t: Omit<Toast, "id">) {
  const id = ++toastId;
  useUI.setState((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
  setTimeout(() => useUI.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
}

/** 环节交接提示文案 */
export function handoffToast(from: Stage, to: Stage) {
  const back = (from === "check" || from === "material") && to === "answer";
  const map: Partial<Record<Stage, Omit<Toast, "id">>> = {
    evidence: { title: "需求已说清", desc: "交给 AI 预判问题并调取资料", tone: "brand" },
    answer: back
      ? { title: "已退回医学部", desc: "医学部补充或修改答复后重新审核", tone: "loop" }
      : { title: "分析与资料已就绪 · 已交给医学部", desc: "医学部查证并撰写答复", tone: "med" },
    check: { title: "答复已提交", desc: "AI 正在对照原问题检查是否遗漏", tone: "brand" },
    material: { title: "医学答复已确认 · 已交给销售", desc: "已归档企业知识库；销售 · 王晓 制作沟通材料", tone: "kb" },
    feedback: { title: "材料已交付", desc: "等待记录医生反馈", tone: "brand" },
    done: { title: "任务已完成", desc: "答复与经验已沉淀，下次可直接复用", tone: "kb" },
  };
  const t = map[to];
  if (t) toast(t);
}
