"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ROLE_NAME, now, uid, useStore } from "@/lib/store";
import { checkAllHandled, checkIsStale, confirmedReq, fmt, latestCheck } from "@/lib/flow";
import { runCheck } from "@/lib/actions";
import { Badge, Button, Card, RoleGate, SourceTag, cx, inputCls } from "@/components/ui";
import type { CheckItem, Task, Verdict } from "@/lib/types";

const VERDICT: Record<Verdict, { label: string; tone: "green" | "yellow" | "red" }> = {
  answered: { label: "有对应答复", tone: "green" },
  insufficient: { label: "已明确说明资料不足", tone: "yellow" },
  missing: { label: "可能遗漏 / 需核对", tone: "red" },
};

export function Step4Check({ t, goAnswer }: { t: Task; goAnswer: () => void }) {
  const role = useStore((s) => s.role);
  const mutate = useStore((s) => s.mutate);
  const addKnowledge = useStore((s) => s.addKnowledge);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const req = confirmedReq(t);
  const c = latestCheck(t);
  if (!req || !c) return <Card className="p-8 text-center text-sm text-gray-500">等待医学部提交答复后进行检查。</Card>;

  const stale = checkIsStale(t, c);
  const handled = checkAllHandled(c);
  const active = t.stage === "check";
  const editable = role === "medical" && active;
  const nextV = t.answers.length + 1;

  const recheck = async () => {
    setLoading(true);
    try {
      await runCheck(t.id);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = (qid: string) => {
    mutate(
      t.id,
      (x) => {
        const it = x.checks[x.checks.length - 1].items.find((i) => i.subQId === qid)!;
        it.resolution = { type: "dismissed", reason };
      },
      `说明 AI 提示不成立：${reason}`,
    );
    setDismissing(null);
    setReason("");
  };

  const confirm = () => {
    const at = now();
    mutate(
      t.id,
      (x) => {
        x.answers.push({
          v: nextV,
          at,
          items: structuredClone(x.draft),
          author: ROLE_NAME.medical,
          confirmedBy: ROLE_NAME.medical,
          reqV: req.v,
          usedPreset: x.draftUsedPreset,
        });
        x.stage = "material";
      },
      `医学人员确认答复 v${nextV}，归档企业知识库`,
    );
    addKnowledge({
      id: uid("K"),
      taskId: t.id,
      answerV: nextV,
      title: t.title,
      question: t.request.original,
      context: `${t.request.audience || "医生"}${t.request.purpose}；产品：${t.request.product}`,
      items: req.subQuestions.map((q) => {
        const a = t.draft.find((d) => d.subQId === q.id);
        return { q: q.text, a: a?.text ?? "", refs: a?.cited ?? [], insufficient: !!a?.insufficient };
      }),
      confirmedBy: ROLE_NAME.medical,
      confirmedAt: at,
      status: "有效",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-brand">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-brand">4 AI 对照原问题审核</h2>
          <SourceTag source={c.source} />
          <span className="text-xs text-gray-400">检查于 {fmt(c.at)} · 需求 v{c.reqV}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          对照最初提交的问题，检查是否遗漏或答偏。这是<b>完整性检查</b>，不评价医学内容是否正确；AI 可能误判，医学人员可说明理由并处理。
        </p>
      </Card>

      <Coverage key={c.id} items={c.items} stale={stale && active} />

      {role !== "medical" && active && <RoleGate need="医学部" />}

      {stale && active && (
        <div className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          答复已修改，以下检查结果已过期，不能作为当前结果。
          {editable && (
            <Button data-demo="recheck" variant="loop" loading={loading} onClick={recheck} className="ml-auto">
              重新检查
            </Button>
          )}
        </div>
      )}

      <Card className={cx("overflow-hidden", stale && active && "opacity-60")}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="w-[26%] px-4 py-2 font-medium">原问题</th>
              <th className="w-[34%] px-4 py-2 font-medium">医学答复</th>
              <th className="px-4 py-2 font-medium">检查结果与处理</th>
            </tr>
          </thead>
          <tbody>
            {req.subQuestions.map((q, i) => {
              const it = c.items.find((x) => x.subQId === q.id);
              const a = t.draft.find((d) => d.subQId === q.id) ?? t.answers.at(-1)?.items.find((d) => d.subQId === q.id);
              if (!it) return null;
              const v = VERDICT[it.verdict];
              return (
                <motion.tr
                  key={`${c.id}-${q.id}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.12 }}
                  className={cx(
                    "border-t border-gray-100 align-top",
                    it.verdict === "missing" && !it.resolution && "bg-red-50/40",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="mr-1 font-semibold text-brand">Q{i + 1}</span>
                    {q.text}
                  </td>
                  <td className="px-4 py-3">
                    {editable && it.verdict === "missing" && !it.resolution ? (
                      <textarea
                        data-demo="missing-input"
                        rows={4}
                        className={inputCls}
                        value={a?.text ?? ""}
                        placeholder="在此补充答复，或写明资料不足的原因"
                        onChange={(e) =>
                          mutate(t.id, (x) => {
                            x.draft = x.draft.map((d) => (d.subQId === q.id ? { ...d, text: e.target.value } : d));
                          })
                        }
                      />
                    ) : (
                      <div className={cx("whitespace-pre-wrap", !a?.text && "text-gray-400")}>{a?.text || "（空）"}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={v.tone}>{v.label}</Badge>
                    <div className="mt-1 text-gray-600">{it.note}</div>
                    {it.resolution && (
                      <div className="mt-1.5 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                        医学人员说明提示不成立：{it.resolution.reason}
                      </div>
                    )}
                    {editable && it.verdict === "missing" && !it.resolution && (
                      <div className="mt-2">
                        {dismissing === q.id ? (
                          <div className="flex gap-2">
                            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="说明为何该提示不成立" />
                            <Button variant="secondary" disabled={!reason.trim()} onClick={() => dismiss(q.id)}>
                              提交
                            </Button>
                          </div>
                        ) : (
                          <button onClick={() => setDismissing(q.id)} className="text-xs text-gray-500 hover:text-brand">
                            AI 误报？说明理由并处理
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {active && (
        <div className="flex items-center justify-end gap-3">
          {!stale && !handled && <span className="text-sm text-loop">仍有可能遗漏的问题未处理：补充答复后重新检查，或说明提示不成立。</span>}
          {editable && (
            <Button
              variant="secondary"
              onClick={() => {
                mutate(t.id, (x) => void (x.stage = "answer"), "退回第 3 步继续编辑答复");
                goAnswer();
              }}
            >
              回到第 3 步编辑
            </Button>
          )}
          {editable && !stale && (
            <Button variant="secondary" loading={loading} onClick={recheck}>
              重新检查
            </Button>
          )}
          <Button data-demo="confirm-answer" variant="med" disabled={!editable || stale || !handled} onClick={confirm}>
            医学人员确认答复 v{nextV}
          </Button>
        </div>
      )}
      {!active && t.answers.length > 0 && (
        <div className="rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-kb">
          医学答复 v{t.answers.at(-1)!.v} 已由 {t.answers.at(-1)!.confirmedBy} 确认（{fmt(t.answers.at(-1)!.at)}），已归档至企业知识库。
        </div>
      )}
    </div>
  );
}

/** 覆盖情况：一眼看出每个子问题的处理结果 */
function Coverage({ items, stale }: { items: CheckItem[]; stale: boolean }) {
  const n = items.length || 1;
  const answered = items.filter((i) => i.verdict === "answered").length;
  const insufficient = items.filter((i) => i.verdict === "insufficient").length;
  const dismissed = items.filter((i) => i.verdict === "missing" && i.resolution).length;
  const missing = items.filter((i) => i.verdict === "missing" && !i.resolution).length;
  const handled = n - missing;
  const segs = [
    { k: "已回应", v: answered, c: "bg-kb" },
    { k: "已说明资料不足", v: insufficient, c: "bg-amber-400" },
    { k: "误报已说明", v: dismissed, c: "bg-gray-400" },
    { k: "可能遗漏", v: missing, c: "bg-red-500" },
  ];
  return (
    <Card demo="coverage" className={cx("p-5", stale && "opacity-60")}>
      <div className="flex items-center gap-8">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eef1f6" strokeWidth="3.2" />
            <motion.circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke={missing ? "#2457c5" : "#1f8a5f"}
              strokeWidth="3.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: handled / n }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-navy">
              {handled}/{items.length}
            </span>
            <span className="text-[10px] text-gray-400">已处理</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-navy">
            {missing ? `还有 ${missing} 个子问题可能遗漏，需要医学人员处理` : "每个子问题都有明确处理结果，可以确认答复"}
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
            {segs.map((s, i) =>
              s.v ? (
                <motion.div
                  key={s.k}
                  className={s.c}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.v / n) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2 flex gap-5 text-xs text-gray-500">
            {segs.map((s) => (
              <span key={s.k} className="flex items-center gap-1.5">
                <span className={cx("h-2 w-2 rounded-full", s.c)} />
                {s.k} <b className="text-gray-700">{s.v}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
