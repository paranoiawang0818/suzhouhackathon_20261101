"use client";

import { AnimatePresence, motion } from "motion/react";
import { useUI } from "@/lib/ui";

const TONE = { brand: "bg-brand", med: "bg-med", kb: "bg-kb", loop: "bg-loop" } as const;

/** 环节交接提示 */
export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div data-toasts className="pointer-events-none fixed left-1/2 top-[72px] z-50 flex w-[360px] -translate-x-1/2 flex-col items-stretch gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="flex overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5"
          >
            <div className={`w-1.5 ${TONE[t.tone]}`} />
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-navy">{t.title}</div>
              {t.desc && <div className="mt-0.5 text-xs text-gray-500">{t.desc}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
