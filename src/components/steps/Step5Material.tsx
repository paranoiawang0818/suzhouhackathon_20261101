"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { now, uid, useStore, ROLE_NAME } from "@/lib/store";
import { fmt, extraSources } from "@/lib/flow";
import { runMaterial } from "@/lib/actions";
import { sourceById } from "@/lib/sources";
import { Badge, Button, Card, RoleGate, SourceTag, inputCls } from "@/components/ui";
import type { Task } from "@/lib/types";

export function Step5Material({ t }: { t: Task }) {
  const role = useStore((s) => s.role);
  const mutate = useStore((s) => s.mutate);
  const experience = useStore((s) => s.experience);
  const upsertExperience = useStore((s) => s.upsertExperience);
  const pref = experience.find((e) => e.kind === "表达偏好" && e.author === ROLE_NAME.sales);
  const [style, setStyle] = useState(pref?.action ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const ans = t.answers.at(-1);
  const mat = t.materials.at(-1);
  const req = t.reqVersions.find((r) => r.v === ans?.reqV);
  if (!ans || !req) return <Card className="p-8 text-center text-sm text-gray-500">等待医学部确认答复。</Card>;

  const editable = role === "sales" && t.stage === "material";
  const outdated = mat && mat.basedOnAnswerV !== ans.v;
  const refs = Array.from(new Set(ans.items.flatMap((i) => i.cited)));

  const gen = async () => {
    setLoading(true);
    try {
      await runMaterial(t.id, style);
    } finally {
      setLoading(false);
    }
  };

  const exportPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `沟通卡_v${mat?.v ?? 1}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const editSection = (idx: number, body: string) =>
    mutate(t.id, (x) => {
      x.materials.at(-1)!.card.sections[idx].body = body;
    });

  const cardText = mat
    ? `${mat.card.headline}\n\n${mat.card.sections.map((s) => `【${s.title}】\n${s.body}`).join("\n\n")}\n\n注意：\n${mat.card.cautions.map((c) => `· ${c}`).join("\n")}\n\n参考资料：\n${refs
        .map((r) => {
          const s = sourceById(r, extraSources(t));
          return s ? `[${r}] ${s.title}. ${s.publisher}` : r;
        })
        .join("\n")}`
    : "";

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-brand">
        <h2 className="text-lg font-bold text-brand">5 销售制作品牌材料</h2>
        <p className="mt-1 text-sm text-gray-500">使用企业模板，保留已审医学事实、风险、适用范围与引用。AI 只组织已确认答复，不增添医学结论。</p>
      </Card>
      {role !== "sales" && t.stage === "material" && <RoleGate need="销售" />}

      {editable && (
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            个人表达偏好
            {pref && <Badge tone="green">已从个人 SOP 载入</Badge>}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={style} onChange={(e) => setStyle(e.target.value)} placeholder="例如：先结论后数据，语气专业克制" />
            <Button
              variant="kb"
              disabled={!style.trim()}
              onClick={() => {
                upsertExperience({
                  id: pref?.id ?? uid("X"),
                  kind: "表达偏好",
                  scope: "个人",
                  title: "沟通卡表达偏好",
                  scene: "给医生的一页沟通卡",
                  action: style,
                  result: "",
                  author: ROLE_NAME.sales,
                  at: now(),
                  taskId: t.id,
                });
                setSaved(true);
              }}
            >
              {saved ? "已保存" : "保存为个人偏好"}
            </Button>
            <Button data-demo="gen-card" loading={loading} onClick={gen}>
              {mat ? "重新生成" : "用模板生成沟通卡"}
            </Button>
          </div>
        </Card>
      )}

      {mat ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap font-medium">沟通卡 v{mat.v}</span>
              <SourceTag source={mat.source} />
              {editable && (
                <span className="ml-auto flex gap-1.5">
                  <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setEditing(!editing)}>
                    {editing ? "完成编辑" : "编辑文字"}
                  </Button>
                  <Button variant="secondary" className="px-2.5 py-1 text-xs" loading={exporting} disabled={editing} onClick={exportPng}>
                    导出图片
                  </Button>
                </span>
              )}
            </div>
            <div className="mb-2 flex gap-2">
              <Badge tone="gray">依据医学答复 v{mat.basedOnAnswerV}</Badge>
              <Badge tone="orange">材料未经医学部审核</Badge>
            </div>
            {outdated &&<div className="mb-2 rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-800">所依据的医学答复已更新为 v{ans.v}，请重新生成。</div>}
            <div ref={cardRef} data-demo="card" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="bg-navy px-6 py-4 text-white">
                <div className="text-xs text-white/60">{t.request.product} · 医学信息沟通</div>
                <div className="text-lg font-bold">{mat.card.headline}</div>
              </div>
              <div className="space-y-4 p-5">
                {mat.card.sections.map((s, i) => (
                  <div key={i}>
                    <div className="mb-1 text-sm font-semibold text-brand">{s.title}</div>
                    {editable && editing ? (
                      <textarea rows={3} className={inputCls} value={s.body} onChange={(e) => editSection(i, e.target.value)} />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{s.body}</div>
                    )}
                  </div>
                ))}
                <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                  {mat.card.cautions.map((c, i) => (
                    <div key={i}>· {c}</div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-2 text-[11px] leading-5 text-gray-400">
                  <div className="mb-1 text-gray-500">依据医学部确认答复 v{mat.basedOnAnswerV} 整理 · 参考资料：</div>
                  {refs.map((r) => {
                    const s = sourceById(r, extraSources(t));
                    return s ? <div key={r}>[{r}] {s.title}. {s.publisher}</div> : null;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">原文对照：医学答复 v{ans.v}</div>
            <div className="space-y-3">
              {req.subQuestions.map((q, i) => {
                const a = ans.items.find((x) => x.subQId === q.id);
                return (
                  <Card key={q.id} className="p-3 text-sm" accent="border-l-med">
                    <div className="text-xs text-gray-400">Q{i + 1} {q.text}</div>
                    <div className="mt-1 whitespace-pre-wrap">{a?.text}</div>
                  </Card>
                );
              })}
              <div className="text-xs text-gray-400">
                {ans.confirmedBy} 确认于 {fmt(ans.at)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !editable && <Card className="p-6 text-center text-sm text-gray-400">销售尚未生成材料</Card>
      )}

      {editable && mat && (
        <div className="flex items-center justify-end gap-3 rounded-md border border-loop/30 bg-orange-50/40 px-4 py-3">
          <span className="mr-auto text-sm text-loop">如修改了医学内容：需返回第 3 步，由医学部人工审核通过后再进入第 4 步。</span>
          <Button
            variant="loop"
            onClick={() =>
              mutate(
                t.id,
                (x) => {
                  x.draft = structuredClone(x.answers.at(-1)!.items);
                  x.draftUsedPreset = x.answers.at(-1)!.usedPreset;
                  x.stage = "answer";
                },
                "销售修改涉及医学内容，退回医学部审核",
              )
            }
          >
            退回医学部
          </Button>
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(cardText)}>
            复制文本
          </Button>
          <Button
            data-demo="deliver"
            onClick={() =>
              mutate(
                t.id,
                (x) => {
                  x.deliveries.push({ id: uid("d"), materialId: mat.id, materialV: mat.v, at: now(), status: "未获反馈", doctorWords: "", myNote: "" });
                  x.stage = "feedback";
                },
                `确认交付沟通卡 v${mat.v}（依据医学答复 v${mat.basedOnAnswerV}）`,
              )
            }
          >
            确认使用已审内容并交付 →
          </Button>
        </div>
      )}
    </div>
  );
}
