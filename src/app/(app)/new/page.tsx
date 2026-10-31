"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { Button, Card, Field, RoleGate, cx, inputCls } from "@/components/ui";
import type { RequestInput } from "@/lib/types";
import { DEMO_REQUEST, demoDeadline } from "@/lib/demo";

const EXAMPLES: { label: string; req: RequestInput }[] = [
  { label: "老年患者能不能用", req: DEMO_REQUEST },
  {
    label: "副作用与停药",
    req: {
      ...DEMO_REQUEST,
      original: "玛仕度肽常见的副作用是什么？胃肠道反应一般多久能缓解？",
      audience: "全科医生",
    },
  },
  {
    label: "和司美格鲁肽比",
    req: {
      ...DEMO_REQUEST,
      original: "玛仕度肽的减重效果跟司美格鲁肽比怎么样？有没有直接对比的研究？",
      audience: "内分泌科主任",
    },
  },
];

const NEXT = [
  ["AI 梳理需求三问", "要什么信息、解决什么问题、希望医学部给什么"],
  ["你补充并确认", "没说清的按 AI 提示补充，说清了才往下走"],
  ["AI 分析并调取资料", "预判能否解答，调出论文库原文与问题库历史答复"],
  ["医学部答复", "医学人员查证、撰写并确认，AI 只做完整性检查"],
];

export default function NewTask() {
  const hydrated = useHydrated();
  const role = useStore((s) => s.role);
  const createTask = useStore((s) => s.createTask);
  const router = useRouter();
  const [f, setF] = useState<RequestInput>({ product: "", original: "", purpose: "回复医生学术问询", audience: "", delivery: "一页沟通卡" });
  const [deadline, setDeadline] = useState("");
  if (!hydrated) return null;

  const set = (k: keyof RequestInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <div className="text-xs font-semibold tracking-widest text-brand">第 1 步 · 销售</div>
        <h1 className="mt-1 text-[26px] font-bold text-navy">提交医生的问题</h1>
        <p className="mt-1 text-sm text-gray-500">可以先提交不完整的信息，AI 会帮你列出需要补充的内容。</p>
      </div>
      {role !== "sales" && <RoleGate need="销售" />}

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <Card className="space-y-5 p-6">
          <div>
            <div className="mb-2 text-xs text-gray-400">没有想法？点一个示例问题快速体验</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e.label}
                  onClick={() => {
                    setF(e.req);
                    setDeadline(demoDeadline());
                  }}
                  className={cx(
                    "rounded-full border px-3 py-1 text-sm transition",
                    f.original === e.req.original ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-600 hover:border-brand hover:text-brand",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="医生原话" hint="尽量保留医生的原始表述">
            <textarea
              rows={4}
              className={cx(inputCls, "text-[15px] leading-7")}
              value={f.original}
              onChange={set("original")}
              placeholder="例如：这个研究纳入的是多大年龄的人？"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="产品 / 议题">
              <input className={inputCls} value={f.product} onChange={set("product")} />
            </Field>
            <Field label="用途">
              <input className={inputCls} value={f.purpose} onChange={set("purpose")} />
            </Field>
            <Field label="沟通对象">
              <input className={inputCls} value={f.audience} onChange={set("audience")} placeholder="如：内分泌科医生" />
            </Field>
            <Field label="交付要求">
              <select className={inputCls} value={f.delivery} onChange={set("delivery")}>
                <option>一页沟通卡</option>
                <option>口头沟通要点</option>
                <option>FAQ</option>
              </select>
            </Field>
            <Field label="截止时间" hint="选填">
              <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            {!f.original.trim() && <span className="text-xs text-gray-400">填写医生原话后即可提交</span>}
            <Button disabled={!f.original.trim() || role !== "sales"} onClick={() => router.push(`/task/${createTask(f, deadline)}`)}>
              提交，让 AI 整理问题 →
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-sm font-semibold text-navy">提交之后会发生什么</div>
            <ol className="mt-4 space-y-4">
              {NEXT.map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span
                    className={cx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 3 ? "bg-med/10 text-med" : "bg-brand/10 text-brand",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{t}</div>
                    <div className="mt-0.5 text-xs leading-5 text-gray-500">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-xs leading-5 text-gray-500">
            提交后将实时检索 PubMed 公开文献，并结合企业资料库整理线索。资料不足时会明确标注，结论由医学部查证并确认。
          </div>
        </div>
      </div>
    </div>
  );
}
