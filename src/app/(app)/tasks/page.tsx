"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { STATUS, STEPS, daysLeft, fmt, stageIndex } from "@/lib/flow";
import { Badge, Button, Card, cx } from "@/components/ui";

export default function Home() {
  const hydrated = useHydrated();
  const tasks = useStore((s) => s.tasks);
  const role = useStore((s) => s.role);
  const [mine, setMine] = useState(false);
  if (!hydrated) return null;

  const isMine = (stage: keyof typeof STATUS) => stage !== "done" && STATUS[stage].who === role;
  const list = (mine ? tasks.filter((t) => isMine(t.stage)) : tasks).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const todo = tasks.filter((t) => isMine(t.stage));
  const dueSoon = tasks.filter((t) => t.stage !== "done" && (daysLeft(t.deadline) ?? 99) <= 2);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-navy">任务看板</h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === "sales" ? "需要我补什么、医学部是否已经回复，一眼看清。" : "问题是什么、证据在哪里、还有哪项未处理。"}
          </p>
        </div>
        {role === "sales" && (
          <Link href="/new">
            <Button>+ 提交新需求</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">待我处理</div>
          <div className="mt-1 text-3xl font-bold text-brand">{todo.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">2 天内到期</div>
          <div className={cx("mt-1 text-3xl font-bold", dueSoon.length ? "text-loop" : "text-gray-400")}>{dueSoon.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">已完成</div>
          <div className="mt-1 text-3xl font-bold text-kb">{tasks.filter((t) => t.stage === "done").length}</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <span className="font-medium">任务日历</span>
          <span className="text-xs text-gray-400">负责人 · 下一节点 · 截止时间 · 当前状态贯穿全程</span>
          <label className="ml-auto flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            只看待我处理
          </label>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">问题摘要</th>
              <th className="px-4 py-2 font-medium">进度</th>
              <th className="px-4 py-2 font-medium">当前处理人</th>
              <th className="px-4 py-2 font-medium">下一步</th>
              <th className="px-4 py-2 font-medium">截止</th>
              <th className="px-4 py-2 font-medium">更新</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => {
              const st = STATUS[t.stage];
              const dl = daysLeft(t.deadline);
              return (
                <tr key={t.id} className={cx("border-t border-gray-100 hover:bg-blue-50/40", isMine(t.stage) && "bg-blue-50/20")}>
                  <td className="px-4 py-3">
                    <Link href={`/task/${t.id}`} className="font-medium text-gray-800 hover:text-brand">
                      {t.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {t.request.product} · {t.submitter}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.stage === "done" ? "green" : st.who === "medical" ? "purple" : "blue"}>{st.label}</Badge>
                    <div className="mt-1.5 flex gap-0.5">
                      {STEPS.map((s, i) => {
                        const cur = stageIndex(t.stage);
                        return (
                          <span
                            key={s.stage}
                            title={s.title}
                            className={cx(
                              "h-1.5 w-5 rounded-full",
                              i < cur ? "bg-kb" : i === cur ? (s.who === "medical" ? "bg-med" : "bg-brand") : "bg-gray-200",
                            )}
                          />
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {st.handler}
                    {isMine(t.stage) && <span className="ml-1 text-xs text-brand">（我）</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{st.next}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {t.stage === "done" || dl === null ? (
                      <span className="text-gray-400">{t.deadline || "—"}</span>
                    ) : (
                      <span className={cx(dl < 0 ? "text-red-600" : dl <= 2 ? "text-loop" : "text-gray-600")}>
                        {t.deadline}
                        <span className="ml-1 text-xs">{dl < 0 ? `逾期${-dl}天` : `剩${dl}天`}</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">{fmt(t.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && (
          <div className="space-y-3 p-8 text-center text-sm text-gray-500">
            <p>{tasks.length ? "没有符合筛选条件的任务" : "还没有任务"}</p>
            {!tasks.length && <Link href="/new" className="inline-block font-medium text-brand hover:underline">提交第一个问题 →</Link>}
          </div>
        )}
      </Card>
    </div>
  );
}
