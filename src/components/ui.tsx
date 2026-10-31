"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import type { ResultSource } from "@/lib/types";
import { ROLE_NAME, useStore } from "@/lib/store";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "med" | "kb" | "loop";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  ghost: "text-brand hover:bg-brand/5",
  med: "bg-med text-white hover:bg-med/90",
  kb: "bg-kb text-white hover:bg-kb/90",
  loop: "bg-white text-loop border border-loop/50 hover:bg-orange-50",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        BTN[variant],
        className,
      )}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Card({ children, className, accent, demo }: { children: ReactNode; className?: string; accent?: string; demo?: string }) {
  return (
    <div data-demo={demo} className={cx("rounded-xl border border-gray-200/80 bg-white shadow-sm", accent && `border-l-4 ${accent}`, className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "blue" | "green" | "orange" | "purple" | "red" | "yellow" }) {
  const t = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-50 text-brand",
    green: "bg-emerald-50 text-kb",
    orange: "bg-orange-50 text-loop",
    purple: "bg-purple-50 text-med",
    red: "bg-red-50 text-red-600",
    yellow: "bg-amber-50 text-amber-700",
  }[tone];
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", t)}>{children}</span>;
}

/** 如实标注 AI 结果来源 */
export function SourceTag({ source, error }: { source?: ResultSource; error?: string }) {
  if (!source) return null;
  return source === "ai" ? (
    <Badge tone="blue">AI 实时生成</Badge>
  ) : (
    <span title={`AI 未调用成功，展示的是离线预设结果。${error ?? ""}`}>
      <Badge tone="gray">离线预设结果</Badge>
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-gray-700">
        {label}
        {hint && <span className="ml-2 font-normal text-gray-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15";

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{children}</div>;
}

/** 当前角色不负责本环节时的提示，可一键切换 */
export function RoleGate({ need }: { need: "销售" | "医学部" }) {
  const setRole = useStore((s) => s.setRole);
  const isMed = need === "医学部";
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        isMed ? "border-med/25 bg-purple-50/70 text-med" : "border-brand/25 bg-blue-50/70 text-brand",
      )}
    >
      <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white", isMed ? "bg-med" : "bg-brand")}>
        {isMed ? "医" : "销"}
      </span>
      <span className="text-gray-700">
        此环节由 <b className={isMed ? "text-med" : "text-brand"}>{isMed ? ROLE_NAME.medical : ROLE_NAME.sales}</b> 处理，你当前是只读视图。
      </span>
      <Button data-demo="switch-role" variant={isMed ? "med" : "primary"} className="ml-auto py-1.5" onClick={() => setRole(isMed ? "medical" : "sales")}>
        切换为{need}继续 →
      </Button>
    </motion.div>
  );
}

/** 结果依次入场 */
export function Reveal({ i = 0, children, className }: { i?: number; children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.09, duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
