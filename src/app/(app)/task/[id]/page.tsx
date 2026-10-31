"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useHydrated, useTask } from "@/lib/store";
import { STATUS, STEPS, daysLeft, stageIndex } from "@/lib/flow";
import { Badge, Card, cx } from "@/components/ui";
import { Step1Clarify } from "@/components/steps/Step1Clarify";
import { Step2Evidence } from "@/components/steps/Step2Evidence";
import { Step3Answer } from "@/components/steps/Step3Answer";
import { Step4Check } from "@/components/steps/Step4Check";
import { Step5Material } from "@/components/steps/Step5Material";
import { Step6Feedback } from "@/components/steps/Step6Feedback";
import { History } from "@/components/steps/History";
import type { Stage } from "@/lib/types";

type View = Stage | "history";

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const t = useTask(id);
  const [view, setView] = useState<View | null>(null);
  const stage = t?.stage;

  // 任务推进到新环节时，自动跳到当前环节
  const [seenStage, setSeenStage] = useState(stage);
  if (stage !== seenStage) {
    setSeenStage(stage);
    setView(null);
  }

  if (!hydrated) return null;
  if (!t)
    return (
      <div className="text-gray-500">
        任务不存在。<Link href="/tasks" className="text-brand">返回看板</Link>
      </div>
    );

  const cur = stageIndex(t.stage);
  const v = view ?? (t.stage === "done" ? "feedback" : t.stage);
  const st = STATUS[t.stage];
  const dl = daysLeft(t.deadline);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-6">
        <div>
          <Link href="/tasks" className="text-xs text-gray-400 hover:text-brand">← 任务看板</Link>
          <h1 className="mt-1 text-xl font-bold text-navy">{t.title}</h1>
          <div className="mt-1 text-sm text-gray-500">
            {t.request.product} · {t.request.audience || "对象未填"} · {t.request.purpose}
          </div>
        </div>
        <Card className="flex shrink-0 gap-6 px-4 py-2.5 text-sm">
          <div>
            <div className="text-xs text-gray-400">当前状态</div>
            <Badge tone={t.stage === "done" ? "green" : st.who === "medical" ? "purple" : "blue"}>{st.label}</Badge>
          </div>
          <div>
            <div className="text-xs text-gray-400">当前处理人</div>
            <div>{st.handler}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">下一节点</div>
            <div>{st.next}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">截止</div>
            <div className={cx(dl !== null && dl <= 2 && t.stage !== "done" && "text-loop")}>{t.deadline || "—"}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-5">
        <nav className="sticky top-20 space-y-1 self-start">
          {STEPS.map((s, i) => {
            const reached = i <= cur;
            const active = v === s.stage;
            const done = i < cur;
            return (
              <button
                key={s.stage}
                data-demo={`step-${s.stage}`}
                disabled={!reached}
                onClick={() => setView(s.stage)}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-md border-l-4 px-3 py-2.5 text-left text-sm transition",
                  active ? "bg-white shadow-sm" : "hover:bg-white/60",
                  s.stage === "answer" ? "border-med" : "border-brand",
                  !reached && "cursor-not-allowed border-gray-200 opacity-45",
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done ? "bg-kb text-white" : i === cur ? (s.stage === "answer" ? "bg-med text-white" : "bg-brand text-white") : "bg-gray-200 text-gray-500",
                  )}
                >
                  {done ? "✓" : s.no}
                </span>
                <span className="flex-1">
                  <span className={cx("block", active && "font-semibold text-navy")}>{s.title}</span>
                  <span className={cx("text-[11px]", s.who === "medical" ? "text-med/70" : "text-gray-400")}>
                    {s.who === "sales" ? "销售" : s.who === "medical" ? "医学部" : "AI"}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setView("history")}
            className={cx("mt-3 w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/60", v === "history" && "bg-white font-semibold text-navy shadow-sm")}
          >
            🕘 历史记录与版本
          </button>
        </nav>

        <div className="min-w-0">
          {v === "clarify" && <Step1Clarify t={t} />}
          {v === "evidence" && <Step2Evidence t={t} />}
          {v === "answer" && <Step3Answer t={t} />}
          {v === "check" && <Step4Check t={t} goAnswer={() => setView("answer")} />}
          {v === "material" && <Step5Material t={t} />}
          {(v === "feedback" || v === "done") && <Step6Feedback t={t} />}
          {v === "history" && <History t={t} />}
        </div>
      </div>
    </div>
  );
}
