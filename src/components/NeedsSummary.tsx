"use client";

import { NEED_LABEL } from "@/lib/types";
import type { NeedKey, Needs } from "@/lib/types";

/** 一线需求摘要：让医学部一眼看到销售要什么 */
export function NeedsSummary({ needs }: { needs?: Needs }) {
  if (!needs) return null;
  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl border border-brand/15 bg-blue-50/40 p-4">
      {(["info", "goal", "deliver"] as NeedKey[]).map((k) => (
        <div key={k}>
          <div className="text-xs font-semibold text-brand">一线需求 · {NEED_LABEL[k].title}</div>
          <div className="mt-1 text-sm leading-6 text-gray-700">{needs[k].value.replace(/^（推测）/, "")}</div>
        </div>
      ))}
    </div>
  );
}
