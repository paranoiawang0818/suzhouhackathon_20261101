"use client";

import { useEffect, useState } from "react";
import { useStore, uid } from "@/lib/store";
import { confirmedReq, extraSources } from "@/lib/flow";
import { runCheck, emptyDraft } from "@/lib/actions";
import { sourceById } from "@/lib/sources";
import { Button, Card, Field, Reveal, RoleGate, cx, inputCls } from "@/components/ui";
import { AnalysisBox, EvidenceList, KbHits } from "@/components/Evidence";
import { NeedsSummary } from "@/components/NeedsSummary";
import type { AnswerItem, KnowledgeEntry, SourceDoc, Task } from "@/lib/types";

export function Step3Answer({ t }: { t: Task }) {
  const role = useStore((s) => s.role);
  const mutate = useStore((s) => s.mutate);
  const kb = useStore((s) => s.knowledge);
  const req = confirmedReq(t);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const editable = role === "medical" && t.stage === "answer";

  useEffect(() => {
    if (req && t.stage === "answer" && t.draft.length === 0) mutate(t.id, (x) => void (x.draft = emptyDraft(req.subQuestions)));
  }, [req, t.stage, t.draft.length, t.id, mutate]);

  if (!req) return null;
  const answered = t.draft.filter((d) => d.text.trim() || d.insufficient).length;
  const isPast = t.stage !== "answer" && t.answers.length > 0;
  const shown: AnswerItem[] = t.stage === "answer" || t.stage === "check" || !t.answers.length ? t.draft : t.answers[t.answers.length - 1].items;

  const setItem = (qid: string, patch: Partial<AnswerItem>) =>
    mutate(t.id, (x) => {
      x.draft = x.draft.map((d) => (d.subQId === qid ? { ...d, ...patch } : d));
    });
  const setLink = (linkId: string, status: "candidate" | "adopted" | "excluded") =>
    mutate(t.id, (x) => {
      const l = x.evidence!.links.find((l) => l.id === linkId)!;
      l.status = status;
      const it = x.draft.find((d) => d.subQId === l.subQId);
      if (it && status === "adopted" && !it.cited.includes(l.sourceId)) it.cited.push(l.sourceId);
      if (it && status === "excluded") it.cited = it.cited.filter((c) => c !== l.sourceId);
    });

  /** 把原文要点或历史答复引用进答复框，结论仍由医学人员撰写 */
  const appendTo = (qid: string, text: string, cite?: string) =>
    mutate(t.id, (x) => {
      const it = x.draft.find((d) => d.subQId === qid);
      if (!it) return;
      it.text = it.text.trim() ? `${it.text.trim()}\n${text}` : text;
      if (cite && !it.cited.includes(cite)) it.cited.push(cite);
    });
  const insertSource = (qid: string, src: SourceDoc) => appendTo(qid, `据 [${src.id}]：${src.zh}`, src.id);
  const insertKb = (qid: string, k: KnowledgeEntry) =>
    appendTo(qid, `【参考历史答复「${k.title}」，需核对本次适用性】${k.items.map((i) => i.a).join("；")}`);

  const submit = async () => {
    setLoading(true);
    setErr("");
    try {
      await runCheck(t.id);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-med">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-med">3 AI 整理问题与证据 / 医学部答复</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          AI 已给出解答思路、原文证据和历史答复，可一键插入要点；<b>结论由医学人员查证、撰写并确认</b>，医学部对答复结果负责。AI 不替医学部下结论。
        </p>
        {editable && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAdding(!adding)} className="border-med/40 text-med">
              + 医学部人员补充资料
            </Button>
          </div>
        )}
        {adding && editable && <AddSource t={t} onDone={() => setAdding(false)} />}
      </Card>

      <NeedsSummary needs={req.needs} />

      {role !== "medical" && t.stage === "answer" && <RoleGate need="医学部" />}
      {isPast && (
        <div className="text-sm text-gray-500">
          以下为已确认的医学答复 v{t.answers[t.answers.length - 1].v}（只读）。
        </div>
      )}

      {req.subQuestions.map((q, i) => {
        const links = t.evidence?.links.filter((l) => l.subQId === q.id) ?? [];
        const gap = t.evidence?.gaps.find((g) => g.subQId === q.id);
        const it = shown.find((d) => d.subQId === q.id);
        const citable = Array.from(new Set([...links.filter((l) => l.status !== "excluded").map((l) => l.sourceId)]));
        return (
          <Reveal key={q.id} i={i}>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-purple-50/40 px-4 py-2.5">
              <span className="font-semibold text-med">Q{i + 1}</span>
              <span className="font-medium">{q.text}</span>
            </div>
            <div className="space-y-2 border-b border-gray-100 px-4 py-3">
              <AnalysisBox compact a={t.evidence?.analysis?.find((x) => x.subQId === q.id)} />
              <KbHits
                hits={t.evidence?.kbLinks?.filter((l) => l.subQId === q.id) ?? []}
                kb={kb}
                onUse={editable ? (k) => insertKb(q.id, k) : undefined}
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="max-h-[460px] overflow-auto p-4">
                <div className="mb-2 text-xs font-medium text-gray-500">证据候选（{links.length}）</div>
                <EvidenceList links={links} extra={extraSources(t)} onStatus={editable ? setLink : undefined} onInsert={editable ? (src) => insertSource(q.id, src) : undefined} />
                {gap && <div data-demo="gap" className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">资料缺口：{gap.gap}</div>}
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-gray-500">医学人员答复</div>
                {editable ? (
                  <textarea
                    rows={6}
                    className={inputCls}
                    value={it?.text ?? ""}
                    onChange={(e) => setItem(q.id, { text: e.target.value })}
                    placeholder="逐项写出答复，说明依据、限制和暂时无法回答的部分"
                  />
                ) : (
                  <div className={cx("min-h-24 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm", !it?.text && "text-gray-400")}>
                    {it?.text || "（医学部尚未作答）"}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-gray-400">引用：</span>
                  {(editable ? citable : it?.cited ?? []).map((sid) => {
                    const on = it?.cited.includes(sid);
                    const s = sourceById(sid, extraSources(t));
                    return (
                      <button
                        key={sid}
                        disabled={!editable}
                        title={s ? `${s.title} · ${s.location}` : sid}
                        onClick={() => it && setItem(q.id, { cited: on ? it.cited.filter((c) => c !== sid) : [...it.cited, sid] })}
                        className={cx("rounded border px-1.5 py-0.5", on ? "border-med bg-med text-white" : "border-gray-300 text-gray-500")}
                      >
                        [{sid}] {s?.location.split("（")[1]?.replace("）", "") ?? s?.kind}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" disabled={!editable} checked={!!it?.insufficient} onChange={(e) => setItem(q.id, { insufficient: e.target.checked })} />
                  明确说明：现有资料不足以回答（需在答复中写明原因）
                </label>
              </div>
            </div>
          </Card>
          </Reveal>
        );
      })}

      {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      {editable && (
        <div className="sticky bottom-4 z-20 flex items-center gap-4 rounded-xl border border-med/20 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-gray-600">
            已作答 <b className="text-med">{answered}</b> / {req.subQuestions.length} 题
          </span>
          <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-med transition-all" style={{ width: `${(answered / Math.max(1, req.subQuestions.length)) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400">未作答的题也可以提交，AI 会在对照审核中标出</span>
          <Button data-demo="submit-check" variant="med" className="ml-auto" loading={loading} onClick={submit}>
            提交 AI 对照原问题审核 →
          </Button>
        </div>
      )}
    </div>
  );
}

function AddSource({ t, onDone }: { t: Task; onDone: () => void }) {
  const mutate = useStore((s) => s.mutate);
  const req = confirmedReq(t)!;
  const [f, setF] = useState({ title: "", url: "", location: "", quote: "", zh: "", qid: req.subQuestions[0]?.id ?? "" });
  const save = () => {
    const id = `M${t.manualSources.length + 1}`;
    const s: SourceDoc = {
      id,
      title: f.title,
      kind: "医学部补充",
      publisher: "医学部人员补充",
      date: new Date().toISOString().slice(0, 10),
      url: f.url || "#",
      location: f.location || "—",
      quote: f.quote,
      zh: f.zh || f.quote,
      scope: "由医学人员补充，适用范围见答复",
    };
    mutate(
      t.id,
      (x) => {
        x.manualSources.push(s);
        x.evidence!.links.push({ id: uid("e"), subQId: f.qid, sourceId: id, reason: "医学人员补查", status: "adopted", addedBy: "medical" });
        const it = x.draft.find((d) => d.subQId === f.qid);
        if (it) it.cited.push(id);
      },
      `医学部补充资料：${f.title}`,
    );
    onDone();
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border border-med/30 bg-purple-50/30 p-4">
      <Field label="资料标题">
        <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </Field>
      <Field label="关联子问题">
        <select className={inputCls} value={f.qid} onChange={(e) => setF({ ...f, qid: e.target.value })}>
          {req.subQuestions.map((q, i) => (
            <option key={q.id} value={q.id}>
              Q{i + 1} {q.text.slice(0, 24)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="链接">
        <input className={inputCls} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
      </Field>
      <Field label="页码 / 段落">
        <input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
      </Field>
      <Field label="原文片段">
        <textarea rows={2} className={inputCls} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} />
      </Field>
      <Field label="中文整理">
        <textarea rows={2} className={inputCls} value={f.zh} onChange={(e) => setF({ ...f, zh: e.target.value })} />
      </Field>
      <div className="col-span-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>取消</Button>
        <Button variant="med" disabled={!f.title.trim()} onClick={save}>保存补充资料</Button>
      </div>
    </div>
  );
}
