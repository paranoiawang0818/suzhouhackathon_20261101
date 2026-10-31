"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { cx } from "@/components/ui";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const ROLE_CHIP: Record<string, string> = {
  销售: "bg-brand/10 text-brand",
  AI: "bg-navy/10 text-navy",
  医学部: "bg-med/10 text-med",
};

const FLOW = [
  { no: "1", title: "说清需求", role: "销售", desc: "AI 帮一线说清三件事：要什么信息、解决什么问题、希望医学部给什么", loop: "没说清 → 补充后重新整理" },
  { no: "2", title: "AI 分析并调取资料", role: "AI", desc: "预判能否解答、给出解答思路，调出论文库原文与问题库历史答复" },
  { no: "3", title: "医学部答复", role: "医学部", desc: "要点可一键引用；结论由医学人员撰写并确认，对结果负责" },
  { no: "4", title: "AI 对照原问题审核", role: "AI", desc: "对照最初提交的问题，逐题检查是否遗漏或答偏", loop: "需补正 → 补充答复并重新审核" },
  { no: "5", title: "销售制作品牌材料", role: "销售", desc: "企业模板 + 个人表达风格，保留已审事实、风险与引用", loop: "改了医学内容 → 退回医学部" },
  { no: "6", title: "记录医生反馈", role: "销售", desc: "已解决 / 部分解决 / 未解决 / 未获反馈，经验沉淀复用" },
];

export default function Landing() {
  const hydrated = useHydrated();
  const kbCount = useStore((s) => s.knowledge.length);
  const expCount = useStore((s) => s.experience.length);



  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:px-6 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              药企一线 × 医学部 · 医学问询协作平台
            </span>
            <h1 className="mt-6 text-[30px] font-bold leading-[1.25] tracking-tight sm:text-[38px] lg:text-[44px]">
              医生的问题，
              <br />
              医学部<span className="text-[#8fb3ff]">答得准</span>，销售<span className="text-[#8fb3ff]">说得清</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/70">
              AI 把问题整理清楚、把证据送到医学人员面前，由医学人员完成专业答复；AI 再逐题对照检查遗漏，销售据此制作沟通材料。确认过的答复与一线经验，留给下一次。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/new" className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-navy shadow-lg shadow-black/20 transition hover:-translate-y-0.5">
                开始使用 →
              </Link>
              <Link href="/tasks" className="px-2 py-3 text-sm text-white/60 hover:text-white">
                任务看板 →
              </Link>
            </div>
          </motion.div>
          <HeroMock />
        </div>
      </section>

      {/* 痛点 */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-6 lg:py-16">
        <motion.div {...fadeUp} className="grid gap-4 md:grid-cols-3 md:gap-5">
          {[
            ["需求没说清就转给医学部", "AI 帮一线先说清：要什么信息、解决什么问题、希望医学部给什么，说清了才往下走。"],
            ["专业资料反复查找", "AI 先预判每个问题能不能答、怎么答，从论文库和问题库调出原文与历史答复。"],
            ["答复与经验反复从头整理", "医学部确认的答复进入企业知识库；销售的表达偏好与经验沉淀为个人 SOP。"],
          ].map(([t, d], i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/70"
            >
              <div className="text-xs font-medium text-gray-400">减少第 {i + 1} 类重复劳动</div>
              <div className="mt-2 text-lg font-bold text-navy">{t}</div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{d}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 流程 */}
      <section data-demo="flow" className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionTitle eyebrow="产品流程" title="一条任务，六个环节，责任清楚" />
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {FLOW.map((f, i) => (
              <motion.div
                key={f.no}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative flex flex-col"
              >
                <div
                  className={cx(
                    "flex-1 rounded-xl border-t-4 bg-canvas p-4",
                    f.role === "医学部" ? "border-med" : f.role === "AI" ? "border-navy" : "border-brand",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-300">{f.no}</span>
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", ROLE_CHIP[f.role])}>{f.role}</span>
                  </div>
                  <div className="mt-2 font-semibold text-navy">{f.title}</div>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500">{f.desc}</p>
                </div>
                {f.loop && (
                  <div className="mt-2 rounded-md border border-dashed border-loop/40 bg-amber-50/60 px-2 py-1.5 text-[11px] leading-4 text-loop">↺ {f.loop}</div>
                )}
                {i < FLOW.length - 1 && <span className="absolute -right-2.5 top-10 z-10 hidden text-gray-300 lg:block">›</span>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 职责 */}
      <section data-demo="roles" className="mx-auto max-w-7xl px-5 py-12 lg:px-6 lg:py-16">
        <SectionTitle eyebrow="职责分工" title="AI 做整理和检查，专业结论由医学部负责" />
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          <RoleCard
            tone="brand"
            role="销售 / 一线代表"
            who="销售"
            items={["记录医生原意，补充背景并确认需求", "用企业模板制作沟通材料", "记录交付与医生反馈，沉淀经验"]}
            out="问题包 · 沟通材料 · 反馈与经验"
          />
          <RoleCard
            tone="navy"
            role="AI 助手"
            who="DeepSeek"
            items={["提示问题缺项，检索整理证据", "对照原问题检查答复是否遗漏", "按已确认答复组织材料，不增添医学结论"]}
            out="建议 · 证据候选 · 完整性检查结果"
          />
          <RoleCard
            tone="med"
            role="医学部"
            who="医学部"
            items={["判断证据适用性，补查资料", "逐题撰写答复，说明依据与限制", "处理遗漏提示，确认答复并负责"]}
            out="带依据与适用范围的医学答复"
          />
        </div>
      </section>

      {/* 沉淀 */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionTitle eyebrow="知识沉淀" title="每完成一次问询，下一次就更快" />
          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
            <KnowCard
              title="企业知识库"
              count={hydrated ? kbCount : undefined}
              unit="条已确认医学答复"
              desc="仅保存医学部确认的答复，关联来源、适用范围和版本。下次检索时作为线索提供给医学人员，适用性仍由医学人员判断。"
              when="第 4 步医学人员确认后自动归档"
            />
            <KnowCard
              title="个人 SOP 与偏好"
              count={hydrated ? expCount : undefined}
              unit="条经验与偏好"
              desc="销售确认后保存表达风格与工作步骤，可查看、修改和删除。下次制作材料时自动带入。"
              when="第 5、6 步由销售本人保存"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-xs leading-6 text-gray-400">
        职责：AI 整理问题与相关证据；医学人员查证、撰写答复并确认，对答复结果负责。
        <br />
        资料来源：PubMed 收录文献实时检索（Europe PMC 入口）+ 企业资料库；AI 结果仅作线索，结论由医学部负责。
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div {...fadeUp}>
      <div className="text-xs font-semibold tracking-widest text-brand">{eyebrow}</div>
      <h2 className="mt-2 text-[22px] font-bold text-navy md:text-[28px]">{title}</h2>
    </motion.div>
  );
}

function RoleCard({ tone, role, who, items, out }: { tone: "brand" | "navy" | "med"; role: string; who: string; items: string[]; out: string }) {
  const c = { brand: "bg-brand", navy: "bg-navy", med: "bg-med" }[tone];
  return (
    <motion.div {...fadeUp} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70">
      <div className={cx("px-6 py-4 text-white", c)}>
        <div className="text-lg font-bold">{role}</div>
        <div className="text-xs text-white/70">参与角色：{who}</div>
      </div>
      <ul className="space-y-2.5 px-6 py-5 text-sm text-gray-700">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
            {i}
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-500">交出：{out}</div>
    </motion.div>
  );
}

function KnowCard({ title, count, unit, desc, when }: { title: string; count?: number; unit: string; desc: ReactNode; when: string }) {
  return (
    <motion.div {...fadeUp}>
      <Link href="/kb" className="block rounded-2xl border-l-4 border-kb bg-canvas p-6 transition hover:shadow-md">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-kb">{title}</span>
          <span className="text-sm text-gray-500">
            <b className="text-2xl text-navy">{count ?? "–"}</b> {unit}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-600">{desc}</p>
        <div className="mt-3 text-xs text-gray-400">{when} →</div>
      </Link>
    </motion.div>
  );
}

/** 首屏右侧：一条问询从问题包到对照审核的动态示意 */
function HeroMock() {
  const rows = [
    { q: "Q1 研究纳入的年龄范围？", ev: "证据 · NEJM 摘要 · 入选人群", state: "ok" },
    { q: "Q2 比较对象是什么？", ev: "证据 · NEJM 摘要 · 分组与疗程", state: "ok" },
    { q: "Q3 75 岁以上人群能否回答？", ev: "资料缺口 · 研究仅纳入 18–75 岁", state: "gap" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-white/60">
        <span>流程示意 · 医学问询协作</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">医学部处理中</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <motion.div
            key={r.q}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.25 }}
            className="rounded-xl bg-white px-4 py-3 text-navy shadow"
          >
            <div className="text-sm font-semibold">{r.q}</div>
            <div className={cx("mt-1 text-xs", r.state === "gap" ? "text-loop" : "text-gray-500")}>{r.ev}</div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="mt-4 rounded-xl bg-navy/60 px-4 py-3 ring-1 ring-white/10"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/80">AI 对照原问题审核</span>
          <span className="text-emerald-300">3 / 3 已处理</span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: 0 }} animate={{ width: "66.6%" }} transition={{ delay: 1.6, duration: 0.6 }} className="bg-emerald-400" />
          <motion.div initial={{ width: 0 }} animate={{ width: "33.4%" }} transition={{ delay: 2.1, duration: 0.4 }} className="bg-amber-400" />
        </div>
        <div className="mt-1.5 flex gap-4 text-[11px] text-white/60">
          <span>● 2 已回应</span>
          <span>● 1 已说明资料不足</span>
          <span>● 0 遗漏</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
