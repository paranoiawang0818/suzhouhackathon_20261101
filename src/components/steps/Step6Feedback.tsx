"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { ROLE_NAME, now, uid, useStore } from "@/lib/store";
import { fmt } from "@/lib/flow";
import { Badge, Button, Card, Field, RoleGate, cx, inputCls } from "@/components/ui";
import type { FeedbackStatus, Task } from "@/lib/types";

const STATUSES: FeedbackStatus[] = ["已解决", "部分解决", "未解决", "未获反馈"];

export function Step6Feedback({ t }: { t: Task }) {
  const role = useStore((s) => s.role);
  const mutate = useStore((s) => s.mutate);
  const upsertExperience = useStore((s) => s.upsertExperience);
  const last = t.deliveries.at(-1);
  const [f, setF] = useState({ status: last?.status ?? "未获反馈", doctorWords: last?.doctorWords ?? "", myNote: last?.myNote ?? "" });
  const [exp, setExp] = useState({ title: "", scene: "", action: "", result: "", scope: "个人" as "个人" | "团队" });
  const [expSaved, setExpSaved] = useState(false);
  const editable = role === "sales" && (t.stage === "feedback" || t.stage === "done");
  const kbCount = useStore((s) => s.knowledge.filter((k) => k.taskId === t.id).length);
  const expCount = useStore((s) => s.experience.filter((x) => x.taskId === t.id).length);

  if (!t.deliveries.length)
    return t.stage === "done" ? (
      <DoneSummary t={t} kbCount={kbCount} expCount={expCount} />
    ) : (
      <Card className="p-8 text-center text-sm text-gray-500">材料交付后在这里记录医生反馈。</Card>
    );

  const save = () =>
    mutate(
      t.id,
      (x) => {
        const d = x.deliveries.at(-1)!;
        Object.assign(d, f);
        if (f.status === "已解决") x.stage = "done";
      },
      `记录医生反馈：${f.status}`,
    );

  return (
    <div className="space-y-4">
      <Card className="p-5" accent="border-l-brand">
        <h2 className="text-lg font-bold text-brand">6 记录医生反馈</h2>
        <p className="mt-1 text-sm text-gray-500">反馈绑定具体交付版本。生成、预览、复制不计为交付；再次交付新版本时新建独立记录。</p>
      </Card>
      {t.stage === "done" && <DoneSummary t={t} kbCount={kbCount} expCount={expCount} />}
      {role !== "sales" && t.stage !== "done" && <RoleGate need="销售" />}

      <Card className="divide-y divide-gray-100">
        {t.deliveries.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span>交付沟通卡 v{d.materialV}</span>
            <span className="text-gray-400">{fmt(d.at)}</span>
            <Badge tone={d.status === "已解决" ? "green" : d.status === "未获反馈" ? "gray" : d.status === "部分解决" ? "yellow" : "red"}>{d.status}</Badge>
            {d.doctorWords && <span className="truncate text-gray-500">医生原话：“{d.doctorWords}”</span>}
          </div>
        ))}
      </Card>

      {editable && (
        <Card className="space-y-3 p-5">
          <div className="text-sm font-medium">最近一次交付（沟通卡 v{last!.materialV}）的反馈</div>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                data-demo={`fb-${s}`}
                onClick={() => setF({ ...f, status: s })}
                className={cx("rounded-md border px-4 py-1.5 text-sm", f.status === s ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50")}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="医生原话" hint="尽量原样记录">
              <textarea rows={2} className={inputCls} value={f.doctorWords} onChange={(e) => setF({ ...f, doctorWords: e.target.value })} />
            </Field>
            <Field label="我的判断 / 备注">
              <textarea rows={2} className={inputCls} value={f.myNote} onChange={(e) => setF({ ...f, myNote: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3">
            {(f.status === "部分解决" || f.status === "未解决") && (
              <Link href="/new" className="text-sm text-loop hover:underline">
                医生有新的医学疑问 → 提交新需求
              </Link>
            )}
            <Button data-demo="save-fb" onClick={save}>保存反馈</Button>
          </div>
        </Card>
      )}

      {editable && (
        <Card className="space-y-3 border-kb/30 p-5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-kb">沉淀一条工作经验</span>
            <span className="text-xs text-gray-500">由你本人确认后保存到“经验与 SOP”，下次制作时参考</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="标题">
              <input className={inputCls} value={exp.title} onChange={(e) => setExp({ ...exp, title: e.target.value })} placeholder="如：老年患者问题先说明研究年龄范围" />
            </Field>
            <Field label="归属">
              <select className={inputCls} value={exp.scope} onChange={(e) => setExp({ ...exp, scope: e.target.value as "个人" | "团队" })}>
                <option>个人</option>
                <option>团队</option>
              </select>
            </Field>
            <Field label="场景">
              <input className={inputCls} value={exp.scene} onChange={(e) => setExp({ ...exp, scene: e.target.value })} />
            </Field>
            <Field label="采取的做法">
              <input className={inputCls} value={exp.action} onChange={(e) => setExp({ ...exp, action: e.target.value })} />
            </Field>
            <Field label="观察到的结果">
              <input className={inputCls} value={exp.result} onChange={(e) => setExp({ ...exp, result: e.target.value })} placeholder={f.status} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              variant="kb"
              disabled={!exp.title.trim() || expSaved}
              onClick={() => {
                upsertExperience({ id: uid("X"), taskId: t.id, kind: "经验案例", author: ROLE_NAME.sales, at: now(), ...exp, result: exp.result || f.status });
                setExpSaved(true);
              }}
            >
              {expSaved ? "已保存到经验库" : "保存经验"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DoneSummary({ t, kbCount, expCount }: { t: Task; kbCount: number; expCount: number }) {
  const mins = Math.max(1, Math.round((new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 60000));
  const dur = mins < 60 ? `${mins} 分钟` : mins < 1440 ? `${(mins / 60).toFixed(1)} 小时` : `${Math.round(mins / 1440)} 天`;
  const stats = [
    ["全程用时", dur],
    ["需求版本", `${t.reqVersions.length} 版`],
    ["医学答复", `v${t.answers.at(-1)?.v ?? "-"}`],
    ["沉淀医学知识", `${kbCount} 条`],
    ["沉淀经验", `${expCount} 条`],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-xl bg-kb text-white shadow-md"
    >
      <div className="flex items-center gap-4 px-6 py-5">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl font-bold text-kb"
        >
          ✓
        </motion.span>
        <div>
          <div className="text-lg font-bold">任务已完成</div>
          <div className="text-sm text-white/75">医学答复已进入企业知识库，下一次类似问询可以直接找到参考。</div>
        </div>
        <Link href="/kb" className="ml-auto rounded-full bg-white/15 px-4 py-1.5 text-sm hover:bg-white/25">
          查看知识库 →
        </Link>
      </div>
      <div className="grid grid-cols-5 divide-x divide-white/15 border-t border-white/15 bg-black/10">
        {stats.map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="px-5 py-3"
          >
            <div className="text-[11px] text-white/60">{k}</div>
            <div className="text-lg font-semibold">{v}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
