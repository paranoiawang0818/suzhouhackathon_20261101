"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import type { ExperienceEntry, KnowledgeEntry, RequestInput, Role, Task } from "./types";
import { SEED_EXPERIENCE, SEED_KNOWLEDGE, SEED_TASKS } from "./seed";
import { handoffToast } from "./ui";

export const now = () => new Date().toISOString();
export const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);

export const ROLE_NAME: Record<Role, string> = { sales: "销售", medical: "医学部" };

interface State {
  role: Role;
  tasks: Task[];
  knowledge: KnowledgeEntry[];
  experience: ExperienceEntry[];
  setRole: (r: Role) => void;
  createTask: (request: RequestInput, deadline: string) => string;
  mutate: (id: string, fn: (t: Task) => void, logAction?: string) => void;
  addKnowledge: (k: KnowledgeEntry) => void;
  upsertExperience: (e: ExperienceEntry) => void;
  removeExperience: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      role: "sales",
      tasks: SEED_TASKS,
      knowledge: SEED_KNOWLEDGE,
      experience: SEED_EXPERIENCE,
      setRole: (role) => set({ role }),
      createTask: (request, deadline) => {
        const id = uid("T");
        const t: Task = {
          id,
          title: request.original.slice(0, 40),
          createdAt: now(),
          updatedAt: now(),
          submitter: ROLE_NAME.sales,
          deadline,
          stage: "clarify",
          request,
          reqVersions: [],
          manualSources: [],
          draft: [],
          draftUsedPreset: false,
          checks: [],
          answers: [],
          materials: [],
          deliveries: [],
          log: [{ at: now(), actor: ROLE_NAME.sales, action: "提交需求" }],
        };
        set({ tasks: [t, ...get().tasks] });
        return id;
      },
      mutate: (id, fn, logAction) =>
        set({
          tasks: get().tasks.map((t) => {
            if (t.id !== id) return t;
            const c = structuredClone(t);
            fn(c);
            if (c.stage !== t.stage) handoffToast(t.stage, c.stage);
            c.updatedAt = now();
            if (logAction) c.log.push({ at: now(), actor: ROLE_NAME[get().role], action: logAction });
            return c;
          }),
        }),
      addKnowledge: (k) =>
        set({ knowledge: [k, ...get().knowledge.filter((x) => !(x.taskId === k.taskId && x.answerV === k.answerV))] }),
      upsertExperience: (e) =>
        set({ experience: [e, ...get().experience.filter((x) => x.id !== e.id)] }),
      removeExperience: (id) => set({ experience: get().experience.filter((x) => x.id !== id) }),
    }),
    { name: "brand-assistant-prod-v1" },
  ),
);

/** 避免 localStorage 与服务端渲染不一致 */
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useTask(id: string) {
  return useStore((s) => s.tasks.find((t) => t.id === id));
}
