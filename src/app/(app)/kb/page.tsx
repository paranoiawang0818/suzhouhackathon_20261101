"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useHydrated, useStore } from "@/lib/store";
import { fmt, extraSources } from "@/lib/flow";
import { sourceById } from "@/lib/sources";
import { Badge, Card, Empty, Reveal, cx, inputCls } from "@/components/ui";
import type { KnowledgeEntry } from "@/lib/types";

export default function KB() {
  const hydrated = useHydrated();
  const knowledge = useStore((s) => s.knowledge);
  const experience = useStore((s) => s.experience);
  const removeExperience = useStore((s) => s.removeExperience);
  const tasks = useStore((s) => s.tasks);
  const [tab, setTab] = useState<"med" | "exp">("med");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("focus") ?? ""));

  if (!hydrated) return null;
  const words = q.trim().split(/\s+/).filter(Boolean);
  const has = (s: string) => words.every((w) => s.toLowerCase().includes(w.toLowerCase()));
  const ks = knowledge.filter((k) => has(k.title + k.question + k.items.map((i) => i.q + i.a).join("")));
  const xs = experience.filter((x) => has(x.title + x.scene + x.action + x.result));
  const extra = tasks.flatMap((t) => extraSources(t));
  const current = ks.find((k) => k.id === sel) ?? ks[0];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-kb">知识沉淀</div>
          <h1 className="mt-1 text-[26px] font-bold text-navy">知识库</h1>
          <p className="mt-1 text-sm text-gray-500">企业医学知识在医学人员确认答复后沉淀；个人 SOP 与偏好由销售本人确认后保存。</p>
        </div>
        <div className="flex gap-3">
          <Stat n={knowledge.length} label="条医学知识" />
          <Stat n={experience.length} label="条经验与偏好" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-full border border-gray-200 bg-white p-1">
          {(
            [
              ["med", "企业医学知识"],
              ["exp", "经验与 SOP"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cx("rounded-full px-4 py-1.5 text-sm transition", tab === k ? "bg-kb text-white" : "text-gray-600 hover:text-kb")}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
          <input data-demo="kb-search" className={cx(inputCls, "rounded-full pl-8")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="关键词查找，如：年龄、终点、停药" />
        </div>
        {words.length > 0 && (
          <span className="text-sm text-gray-500">找到 {tab === "med" ? ks.length : xs.length} 条</span>
        )}
      </div>

      {tab === "med" &&
        (ks.length ? (
          <div className="grid grid-cols-[340px_1fr] gap-5">
            <div className="space-y-2">
              {ks.map((k, i) => (
                <Reveal key={k.id} i={i}>
                  <button
                    onClick={() => setSel(k.id)}
                    className={cx(
                      "w-full rounded-xl border bg-white p-4 text-left transition",
                      current?.id === k.id ? "border-kb shadow-md ring-1 ring-kb/30" : "border-gray-200 hover:border-kb/40",
                    )}
                  >
                    <div className="line-clamp-2 text-sm font-semibold text-navy">
                      <Hl text={k.title} words={words} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                      <Badge tone={k.status === "有效" ? "green" : "yellow"}>{k.status}</Badge>
                      <span>{k.items.length} 个子问题</span>
                      <span>·</span>
                      <span>答复 v{k.answerV}</span>
                      <span>·</span>
                      <span>{fmt(k.confirmedAt)}</span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {current && <Detail key={current.id} k={current} words={words} extra={extra} />}
            </AnimatePresence>
          </div>
        ) : (
          <Empty>没有匹配的医学知识条目</Empty>
        ))}

      {tab === "exp" &&
        (xs.length ? (
          <div className="grid grid-cols-3 gap-4">
            {xs.map((x, i) => (
              <Reveal key={x.id} i={i}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={x.kind === "表达偏好" ? "purple" : x.kind === "个人SOP" ? "blue" : "green"}>{x.kind}</Badge>
                    <Badge>{x.scope}</Badge>
                  </div>
                  <div className="mt-2 font-semibold text-navy">
                    <Hl text={x.title} words={words} />
                  </div>
                  <dl className="mt-3 flex-1 space-y-2 text-sm">
                    {x.scene && <Row k="场景" v={x.scene} words={words} />}
                    <Row k="做法" v={x.action} words={words} />
                    {x.result && <Row k="结果" v={x.result} words={words} />}
                  </dl>
                  <div className="mt-4 flex items-center border-t border-gray-100 pt-3 text-xs text-gray-400">
                    {x.author} · {fmt(x.at)}
                    {x.taskId && (
                      <Link href={`/task/${x.taskId}`} className="ml-2 text-brand hover:underline">
                        原任务
                      </Link>
                    )}
                    <button onClick={() => confirm("删除这条经验？") && removeExperience(x.id)} className="ml-auto hover:text-red-500">
                      删除
                    </button>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty>没有匹配的经验条目</Empty>
        ))}
    </div>
  );
}

function Detail({ k, words, extra }: { k: KnowledgeEntry; words: string[]; extra: Parameters<typeof sourceById>[1] }) {
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 bg-emerald-50/40 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-lg font-bold text-navy">
                <Hl text={k.title} words={words} />
              </div>
              <div className="mt-1 text-xs text-gray-500">{k.context}</div>
            </div>
            <Link href={`/task/${k.taskId}`} className="shrink-0 rounded-full border border-brand/30 px-3 py-1 text-xs text-brand hover:bg-brand/5">
              打开原任务 →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone={k.status === "有效" ? "green" : "yellow"}>{k.status}</Badge>
            <Badge tone="purple">医学答复 v{k.answerV}</Badge>
            <Badge>
              {k.confirmedBy} 确认 · {fmt(k.confirmedAt)}
            </Badge>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="text-xs text-gray-400">医生原话：</span>“{k.question}”
          </div>
          {k.items.map((it, i) => (
            <div key={i} className="border-l-2 border-kb/50 pl-4">
              <div className="text-sm font-semibold text-gray-800">
                Q{i + 1} <Hl text={it.q} words={words} /> {it.insufficient && <Badge tone="yellow">资料不足</Badge>}
              </div>
              <div className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                <Hl text={it.a} words={words} />
              </div>
              {it.refs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {it.refs.map((r) => {
                    const s = sourceById(r, extra);
                    return s ? (
                      <a
                        key={r}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        title={s.title}
                        className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-brand hover:text-brand"
                      >
                        [{r}] {s.kind} · {s.location}
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-xs text-gray-500">
            复用说明：新任务中检索到本条时，作为相关线索提供给医学人员，本次适用性仍由医学人员判断，不自动继承确认状态。
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-gray-200/70">
      <div className="text-xl font-bold text-kb">{n}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

function Row({ k, v, words }: { k: string; v: string; words: string[] }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{k}</dt>
      <dd className="mt-0.5 text-gray-700">
        <Hl text={v} words={words} />
      </dd>
    </div>
  );
}

/** 搜索关键词高亮 */
function Hl({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-inherit">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}
