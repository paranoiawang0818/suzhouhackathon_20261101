"use client";

import { AnimatePresence, motion } from "motion/react";
import { useUI } from "@/lib/ui";

/** AI 处理过程浮层：逐行展示 AI 正在做什么 */
export function AIOverlay() {
  const run = useUI((s) => s.aiRun);
  return (
    <AnimatePresence>
      {run && (
        <motion.div
          data-ai-overlay
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ y: 16, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                AI
                {run.idx < run.steps.length && <span className="absolute inset-0 animate-ping rounded-lg bg-white/15" />}
              </span>
              <div>
                <div className="font-semibold">{run.title}</div>
                <div className="text-xs text-white/60">{run.idx < run.steps.length ? "处理中…" : "已完成"}</div>
              </div>
            </div>
            <ol className="space-y-2.5 px-5 py-4">
              {run.steps.map((s, i) => {
                const state = i < run.idx ? "done" : i === run.idx ? "doing" : "todo";
                return (
                  <motion.li
                    key={s}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: state === "todo" ? 0.35 : 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {state === "done" ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-kb text-[11px] text-white"
                        >
                          ✓
                        </motion.span>
                      ) : state === "doing" ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-300" />
                      )}
                    </span>
                    <span className={state === "doing" ? "font-medium text-navy" : "text-gray-600"}>{s}</span>
                  </motion.li>
                );
              })}
            </ol>
            <div className="h-1 bg-gray-100">
              <motion.div
                className="h-full bg-brand"
                animate={{ width: `${(Math.min(run.idx, run.steps.length) / run.steps.length) * 100}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
