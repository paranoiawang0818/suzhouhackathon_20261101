"use client";

import { useStore } from "@/lib/store";
import { confirmedReq, extraSources } from "@/lib/flow";
import { SOURCES } from "@/lib/sources";
import { Badge, Card, Reveal, SourceTag } from "@/components/ui";
import { ANSWERABILITY, AnalysisBox, EvidenceList, KbHits } from "@/components/Evidence";
import { NeedsSummary } from "@/components/NeedsSummary";
import type { Task } from "@/lib/types";

export function Step2Evidence({ t }: { t: Task }) {
  const kb = useStore((s) => s.knowledge);
  const req = confirmedReq(t);
  const ev = t.evidence;
  if (!req) return null;
  if (!ev) return <Card className="p-8 text-center text-sm text-gray-500">AI 正在分析问题、检索论文库与企业问题库…</Card>;

  const analysis = ev.analysis ?? [];
  const kbLinks = ev.kbLinks ?? [];
  const direct = analysis.filter((a) => a.answerability === "direct").length;

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-brand">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-brand">2 AI 分析问题并调取资料</h2>
          <SourceTag source={ev.source} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          在医学部动手之前，AI 先判断每个问题能不能答、建议怎么答，实时检索 PubMed，并从内置资料库和企业问题库调出相关资料与历史答复，减少医学部查找资料的时间。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="blue">PubMed 实时检索 · {t.fetchedSources?.length ?? 0} 篇</Badge>
          <Badge tone="gray">内置资料库 · {SOURCES.length} 条</Badge>
          <Badge tone="green">企业问题库 · {kb.filter((k) => k.taskId !== t.id && k.status === "有效").length} 条已确认答复</Badge>
        </div>
        {t.fetchedSources?.some((s) => s.retrievedVia === "Europe PMC") && (
          <p className="mt-2 text-xs text-blue-700">本次通过 Europe PMC 公开接口检索 PubMed 收录文献；论文链接仍指向 PubMed。</p>
        )}
      </Card>

      <NeedsSummary needs={req.needs} />

      <Card demo="analysis" className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-semibold text-navy">AI 预判</span>
          <span className="text-sm text-gray-500">
            {req.subQuestions.length} 个子问题中，{direct} 个资料可直接回答
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {req.subQuestions.map((q, i) => {
            const a = analysis.find((x) => x.subQId === q.id);
            const n = ev.links.filter((l) => l.subQId === q.id).length;
            const m = kbLinks.filter((l) => l.subQId === q.id).length;
            return (
              <Reveal key={q.id} i={i} className="rounded-xl bg-canvas p-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand">Q{i + 1}</span>
                  {a && <Badge tone={ANSWERABILITY[a.answerability].tone}>{ANSWERABILITY[a.answerability].label}</Badge>}
                </div>
                <div className="mt-1.5 line-clamp-2 text-sm text-gray-700">{q.text}</div>
                <div className="mt-2 text-xs text-gray-500">
                  原文证据 {n} 条 · 历史答复 {m} 条
                </div>
              </Reveal>
            );
          })}
        </div>
      </Card>

      {req.subQuestions.map((q, i) => {
        const links = ev.links.filter((l) => l.subQId === q.id);
        const gap = ev.gaps.find((g) => g.subQId === q.id);
        return (
          <Reveal key={q.id} i={i + 1}>
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-brand">Q{i + 1}</span>
                <span className="font-medium">{q.text}</span>
              </div>
              <AnalysisBox a={analysis.find((x) => x.subQId === q.id)} />
              <p className="break-words text-xs text-gray-500">PubMed 检索式：{ev.queries?.find((query) => query.subQId === q.id)?.query ?? "未生成（当前使用离线预设结果）"}</p>
              <KbHits hits={kbLinks.filter((l) => l.subQId === q.id)} kb={kb} />
              <div>
                <div className="mb-2 text-xs font-medium text-gray-500">论文与资料库 · {links.length} 条原文证据</div>
                <EvidenceList links={links} extra={extraSources(t)} />
              </div>
              {gap && (
                <div data-demo="gap" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <b>资料缺口：</b>
                  {gap.gap}
                </div>
              )}
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}
