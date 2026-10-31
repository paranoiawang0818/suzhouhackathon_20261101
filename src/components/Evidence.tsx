"use client";

import { sourceById } from "@/lib/sources";
import { Badge, cx } from "./ui";
import type { Answerability, EvidenceLink, KnowledgeEntry, QAnalysis, SourceDoc } from "@/lib/types";

export function SourceBody({ s, compact }: { s: SourceDoc; compact?: boolean }) {
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={(s.kind === "论文摘要" || s.kind === "PubMed 文献") ? "blue" : s.kind === "企业新闻稿" ? "orange" : s.kind === "医学部补充" ? "purple" : "gray"}>{s.kind}</Badge>
        <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-gray-800 hover:text-brand hover:underline">
          {s.title}
        </a>
      </div>
      <div className="mt-1 text-xs text-gray-400">
        {s.publisher} · {s.date} · <span className="text-gray-500">{s.location}</span>
        {s.retrievedVia && <span> · 检索入口：{s.retrievedVia}</span>}
      </div>
      {s.quote && (
        <div className="mt-2 border-l-2 border-gray-300 pl-2 text-xs italic text-gray-600">
          <span className="not-italic text-gray-400">原文：</span>“{s.quote}”
        </div>
      )}
      <div className="mt-1.5 text-gray-700">
        <span className="text-xs text-gray-400">中文整理：</span>
        {s.zh}
      </div>
      {!compact && (
        <div className="mt-1 text-xs text-gray-500">
          <span className="text-gray-400">适用范围：</span>
          {s.scope}
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL = { candidate: "候选", adopted: "采用", excluded: "排除" } as const;

export function EvidenceList({
  links,
  extra,
  onStatus,
  onInsert,
}: {
  links: EvidenceLink[];
  extra: SourceDoc[];
  onStatus?: (linkId: string, s: EvidenceLink["status"]) => void;
  onInsert?: (s: SourceDoc) => void;
}) {
  if (!links.length) return <div className="text-sm text-gray-400">资料库中未匹配到相关资料。</div>;
  return (
    <ul className="space-y-2.5">
      {links.map((l) => {
        const s = sourceById(l.sourceId, extra);
        if (!s) return null;
        return (
          <li
            key={l.id}
            data-demo="evidence"
            className={cx(
              "rounded-lg border p-3.5 transition",
              l.status === "adopted" ? "border-kb/40 bg-emerald-50/40" : l.status === "excluded" ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200",
            )}
          >
            <div className="mb-1.5 flex items-center gap-2 text-xs">
              <span className={cx("shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 font-medium", l.addedBy === "ai" ? "bg-navy/5 text-navy" : "bg-med/10 text-med")}>
                {l.addedBy === "ai" ? "AI 匹配" : "医学部补充"}
              </span>
              <span className="min-w-0 flex-1 truncate text-gray-500" title={l.reason}>
                {l.reason}
              </span>
              <span className="flex shrink-0 gap-1 whitespace-nowrap">
                {onInsert && l.status !== "excluded" && (
                  <button
                    data-demo="insert-evidence"
                    onClick={() => onInsert(s)}
                    className="rounded border border-med/40 px-2 py-0.5 text-med hover:bg-med/5"
                  >
                    插入要点
                  </button>
                )}
                {onStatus ? (
                  (["adopted", "excluded"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onStatus(l.id, l.status === st ? "candidate" : st)}
                      className={cx(
                        "rounded border px-2 py-0.5",
                        l.status === st ? (st === "adopted" ? "border-kb bg-kb text-white" : "border-gray-500 bg-gray-500 text-white") : "border-gray-300 text-gray-500 hover:bg-gray-50",
                      )}
                    >
                      {STATUS_LABEL[st]}
                    </button>
                  ))
                ) : (
                  <Badge tone={l.status === "adopted" ? "green" : "gray"}>{STATUS_LABEL[l.status]}</Badge>
                )}
              </span>
            </div>
            <SourceBody s={s} />
          </li>
        );
      })}
    </ul>
  );
}

export const ANSWERABILITY: Record<Answerability, { label: string; tone: "green" | "yellow" | "red" }> = {
  direct: { label: "资料可直接回答", tone: "green" },
  partial: { label: "资料只能回答一部分", tone: "yellow" },
  insufficient: { label: "现有资料不足", tone: "red" },
};

/** AI 对单个子问题的预判：能不能答、建议怎么答 */
export function AnalysisBox({ a, compact }: { a?: QAnalysis; compact?: boolean }) {
  if (!a) return null;
  return (
    <div className={cx("rounded-lg border border-navy/10 bg-navy/[0.03]", compact ? "px-3 py-2" : "px-4 py-3")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-navy">AI 建议的解答思路</span>
        <Badge tone={ANSWERABILITY[a.answerability].tone}>{ANSWERABILITY[a.answerability].label}</Badge>
        <span className="text-gray-400">仅作线索，结论由医学部判断</span>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-gray-700">{a.approach}</p>
    </div>
  );
}

/** 企业问题库命中：医学部已确认过的历史答复 */
export function KbHits({
  hits,
  kb,
  onUse,
}: {
  hits: { kbId: string; reason: string }[];
  kb: KnowledgeEntry[];
  onUse?: (k: KnowledgeEntry) => void;
}) {
  const list = hits.map((h) => ({ h, k: kb.find((x) => x.id === h.kbId) })).filter((x) => x.k);
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      {list.map(({ h, k }) => (
        <div key={h.kbId} className="rounded-lg border border-kb/25 bg-emerald-50/50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-kb/10 px-1.5 py-0.5 font-medium text-kb">问题库 · 已确认答复</span>
            <a href={`/kb?focus=${k!.id}`} className="font-medium text-gray-800 hover:text-kb hover:underline">
              {k!.title}
            </a>
            <span className="text-gray-400">
              {k!.confirmedBy} · 答复 v{k!.answerV}
            </span>
            {onUse && (
              <button onClick={() => onUse(k!)} className="ml-auto rounded border border-kb/40 px-2 py-0.5 text-kb hover:bg-kb/10">
                引用到答复
              </button>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-600">{h.reason}</div>
        </div>
      ))}
    </div>
  );
}
