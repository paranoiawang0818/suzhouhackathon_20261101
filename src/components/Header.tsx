"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_NAME, useHydrated, useStore } from "@/lib/store";
import { cx } from "./ui";
import type { Role } from "@/lib/types";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/tasks", label: "任务看板" },
  { href: "/new", label: "提交需求" },
  { href: "/kb", label: "知识库" },
];

export function Header() {
  const path = usePathname();
  const hydrated = useHydrated();
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 lg:flex-nowrap lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-navy">品</span>
          <div className="hidden sm:block">
            <div className="text-[15px] font-bold leading-tight tracking-wide">品牌沟通助手</div>
            <div className="text-[11px] text-white/50">医学问询协作平台</div>
          </div>
        </Link>
        <nav className="order-last flex w-full gap-1 overflow-x-auto rounded-full bg-white/5 p-1 ring-1 ring-white/10 lg:order-none lg:w-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition",
                (n.href === "/" ? path === "/" : path.startsWith(n.href) || (n.href === "/tasks" && path.startsWith("/task/")))
                  ? "bg-white font-medium text-navy"
                  : "text-white/70 hover:text-white",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-white/50 md:inline">当前视角</span>
          <div className="flex rounded-full bg-white/5 p-1 ring-1 ring-white/10">
            {(["sales", "medical"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cx(
                  "whitespace-nowrap rounded-full px-3 py-1 text-sm transition",
                  hydrated && role === r ? (r === "sales" ? "bg-brand" : "bg-med") : "text-white/70 hover:text-white",
                )}
              >
                {ROLE_NAME[r]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
