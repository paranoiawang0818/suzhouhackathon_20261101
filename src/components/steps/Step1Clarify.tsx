"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { runClarify, runEvidence } from "@/lib/actions";
import { currentReq } from "@/lib/flow";
import { Badge, Button, Card, Reveal, RoleGate, SourceTag, cx, inputCls } from "@/components/ui";
import { NEED_LABEL } from "@/lib/types";
import { DEMO_REQUEST } from "@/lib/demo";
import type { Need, NeedKey, Task } from "@/lib/types";

const KEYS: NeedKey[] = ["info", "goal", "deliver"];

export function Step1Clarify({ t }: { t: Task }) {
  const role = useStore((s) => s.role);
  const mutate = useStore((s) => s.mutate);
  const req = currentReq(t);
  const locked = t.stage !== "clarify";
  const [loading, setLoading] = useState<"" | "clarify" | "confirm">("");
  const [err, setErr] = useState("");
  const [drafts, setDrafts] = useState<Partial<Record<NeedKey, string>>>({});
  const [editing, setEditing] = useState<Partial<Record<NeedKey, boolean>>>({});
  const started = useRef(false);

  const needs = t.clarify?.needs ?? req?.needs;

  const doClarify = async (userNeeds: Partial<Record<NeedKey, string>>) => {
    setLoading("clarify");
    setErr("");
    try {
      await runClarify(t.id, userNeeds);
      setDrafts({});
      setEditing({});
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading("");
    }
  };

  // 首次进入自动梳理
  useEffect(() => {
    if (!t.clarify && !started.current && t.stage === "clarify") {
      started.current = true;
      doClarify({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editQ = (qid: string, text: string) =>
    mutate(t.id, (x) => {
      const r = x.reqVersions[x.reqVersions.length - 1];
      r.subQuestions = r.subQuestions.map((q) => (q.id === qid ? { ...q, text } : q));
    });
  const delQ = (qid: string) =>
    mutate(t.id, (x) => {
      const r = x.reqVersions[x.reqVersions.length - 1];
      r.subQuestions = r.subQuestions.filter((q) => q.id !== qid);
    });
  const addQ = () =>
    mutate(t.id, (x) => {
      const r = x.reqVersions[x.reqVersions.length - 1];
      const n = Math.max(0, ...r.subQuestions.map((q) => Number(q.id.slice(1)) || 0)) + 1;
      r.subQuestions.push({ id: `q${n}`, text: "" });
    });

  const confirm = async () => {
    setLoading("confirm");
    mutate(
      t.id,
      (x) => {
        const r = x.reqVersions[x.reqVersions.length - 1];
        r.confirmed = true;
        r.subQuestions = r.subQuestions.filter((q) => q.text.trim());
        x.stage = "evidence";
      },
      `确认需求 v${req!.v}，进入 AI 分析与证据查找`,
    );
    try {
      await runEvidence(t.id);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading("");
    }
  };

  const canEdit = role === "sales" && !locked;
  const unclear = needs ? KEYS.filter((k) => !needs[k].clear) : [];
  const hasDraft = KEYS.some((k) => drafts[k]?.trim());
  const resubmit = () => {
    const userNeeds: Partial<Record<NeedKey, string>> = {};
    for (const k of KEYS) {
      const d = drafts[k]?.trim();
      if (d) userNeeds[k] = d;
      else if (needs?.[k].byUser) userNeeds[k] = needs[k].value;
    }
    doClarify(userNeeds);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-brand">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-bold text-brand">1 说清需求</h2>
          <span className="text-sm text-gray-400">先把一线的需求说清楚，再交给医学部</span>
        </div>
        <div className="rounded-md bg-gray-50 p-3 text-sm">
          <div className="text-xs text-gray-400">医生原话</div>
          <div className="mt-1 text-[15px]">“{t.request.original}”</div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            <span>用途：{t.request.purpose}</span>
            <span>对象：{t.request.audience || "未填"}</span>
            <span>交付：{t.request.delivery}</span>
          </div>
        </div>
      </Card>

      {role !== "sales" && !locked && <RoleGate need="销售" />}

      {loading === "clarify" && !t.clarify && <Card className="p-8 text-center text-sm text-gray-500">AI 正在梳理需求…</Card>}
      {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{err}</div>}

      {needs && req && (
        <>
          <Card demo="needs" className="p-5">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-navy">先把需求说清楚：三个问题</span>
              <Badge tone={unclear.length ? "orange" : "green"}>已说清 {3 - unclear.length} / 3</Badge>
              <SourceTag source={t.clarify?.source} />
              <span className="ml-auto text-xs text-gray-400">需求 v{req.v}</span>
            </div>
            <p className="mb-4 text-xs text-gray-500">不一定要再去问医生——这里要说清的是你作为一线人员想要什么。没说清的项，请按 AI 的提示补充。</p>
            <div className="grid grid-cols-3 gap-4">
              {KEYS.map((k, i) => (
                <Reveal key={`${req.v}-${k}`} i={i}>
                  <NeedCard
                    k={k}
                    need={needs[k]}
                    canEdit={canEdit}
                    editing={!!editing[k] || (!needs[k].clear && canEdit)}
                    draft={drafts[k] ?? ""}
                    onDraft={(v) => setDrafts({ ...drafts, [k]: v })}
                    onEdit={() => {
                      setEditing({ ...editing, [k]: true });
                      setDrafts({ ...drafts, [k]: needs[k].value.replace(/^（推测）/, "") });
                    }}
                  />
                </Reveal>
              ))}
            </div>
            {canEdit && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
                {t.request.original === DEMO_REQUEST.original && (
                  <Button variant="secondary" onClick={() => {
                    setDrafts({ ...drafts, goal: "帮医生判断 75 岁以上的老年肥胖患者能不能用，医生最担心安全性", deliver: "书面要点即可：研究事实 + 明确说明证据覆盖不到的人群，附出处" });
                    setEditing({ ...editing, goal: true, deliver: true });
                  }}>
                    填入示例补充
                  </Button>
                )}
                {unclear.length > 0 && <span className="text-xs text-loop">还有 {unclear.length} 项没说清，补充后再继续</span>}
                <Button data-demo="reclarify" variant="loop" disabled={!hasDraft} loading={loading === "clarify"} onClick={resubmit}>
                  按补充重新整理
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-semibold">交给医学部的问题清单</span>
              <Badge tone={req.confirmed ? "green" : "gray"}>{req.confirmed ? "销售已确认" : "待确认"}</Badge>
            </div>
            <p className="mb-3 text-xs text-gray-500">AI 根据上面三项拆出的子问题，请核对是否符合你的需求，可直接修改。</p>
            <ol className="space-y-2">
              {req.subQuestions.map((q, i) => (
                <Reveal key={`${req.v}-${q.id}`} i={i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-brand">Q{i + 1}</span>
                  {canEdit ? (
                    <>
                      <textarea rows={1} className={inputCls + " resize-none"} value={q.text} onChange={(e) => editQ(q.id, e.target.value)} />
                      <button onClick={() => delQ(q.id)} className="mt-2 text-xs text-gray-400 hover:text-red-500">
                        删除
                      </button>
                    </>
                  ) : (
                    <div className="py-1.5 text-sm">{q.text}</div>
                  )}
                </Reveal>
              ))}
            </ol>
            {canEdit && (
              <button onClick={addQ} className="mt-2 text-sm text-brand hover:underline">
                + 添加子问题
              </button>
            )}
            {!locked && (
              <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                {unclear.length > 0 && <span className="text-xs text-gray-400">三个问题都说清后才能交给医学部</span>}
                <Button
                  data-demo="confirm-req"
                  disabled={!canEdit || unclear.length > 0 || !req.subQuestions.some((q) => q.text.trim())}
                  loading={loading === "confirm"}
                  onClick={confirm}
                >
                  需求已说清，交给 AI 分析 →
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function NeedCard({
  k,
  need,
  canEdit,
  editing,
  draft,
  onDraft,
  onEdit,
}: {
  k: NeedKey;
  need: Need;
  canEdit: boolean;
  editing: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onEdit: () => void;
}) {
  const guess = need.value.startsWith("（推测）");
  return (
    <div className={cx("flex h-full flex-col rounded-xl border p-4", need.clear ? "border-kb/30 bg-emerald-50/40" : "border-loop/30 bg-orange-50/50")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-navy">{NEED_LABEL[k].title}</span>
        <Badge tone={need.clear ? (need.byUser ? "blue" : "green") : "orange"}>{need.clear ? (need.byUser ? "你已确认" : "已说清") : "待补充"}</Badge>
      </div>
      <div className="mt-0.5 text-[11px] text-gray-400">{NEED_LABEL[k].hint}</div>
      <div className={cx("mt-3 text-sm leading-6", guess ? "text-gray-500" : "text-gray-800")}>
        <span className="text-xs text-gray-400">{guess ? "AI 推测：" : need.byUser ? "你的说明：" : "AI 理解："}</span>
        {need.value.replace(/^（推测）/, "")}
      </div>
      {!need.clear && need.ask && (
        <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-loop ring-1 ring-loop/20">
          <span className="font-medium">请补充：</span>
          {need.ask}
        </div>
      )}
      {canEdit && editing && guess && !draft && (
        <button
          data-demo={`use-guess-${k}`}
          onClick={() => onDraft(need.value.replace(/^（推测）/, ""))}
          className="mt-3 self-start rounded-md border border-brand/30 bg-white px-2.5 py-1 text-xs text-brand hover:bg-blue-50"
        >
          AI 理解得对，用它 →
        </button>
      )}
      {canEdit && editing && (
        <textarea
          data-demo={`need-${k}`}
          rows={3}
          className={cx(inputCls, "mt-3")}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="用你自己的话写清楚"
        />
      )}
      {canEdit && !editing && (
        <button onClick={onEdit} className="mt-auto self-start pt-3 text-xs text-gray-500 hover:text-brand">
          修改
        </button>
      )}
    </div>
  );
}
