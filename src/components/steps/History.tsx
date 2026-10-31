"use client";

import { fmt } from "@/lib/flow";
import { Badge, Card } from "@/components/ui";
import type { Task } from "@/lib/types";

export function History({ t }: { t: Task }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-bold text-navy">历史记录与版本</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {t.reqVersions.map((r) => (
            <Badge key={r.v} tone={r.confirmed ? "blue" : "gray"}>
              需求 v{r.v}{r.confirmed ? " 已确认" : ""}
            </Badge>
          ))}
          {t.answers.map((a) => (
            <Badge key={a.v} tone="purple">
              医学答复 v{a.v}（依据需求 v{a.reqV}）
            </Badge>
          ))}
          {t.materials.map((m) => (
            <Badge key={m.id} tone="orange">
              沟通卡 v{m.v}（依据答复 v{m.basedOnAnswerV}）
            </Badge>
          ))}
          {t.deliveries.map((d) => (
            <Badge key={d.id} tone="green">
              交付 v{d.materialV}：{d.status}
            </Badge>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <ol className="relative space-y-3 border-l-2 border-gray-200 pl-5">
          {t.log.map((l, i) => (
            <li key={i} className="text-sm">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand" />
              <span className="text-gray-400">{fmt(l.at)}</span>
              <span className="mx-2 font-medium">{l.actor}</span>
              <span className="text-gray-700">{l.action}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
