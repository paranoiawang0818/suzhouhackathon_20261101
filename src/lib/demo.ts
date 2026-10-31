import type { RequestInput } from "./types";

export const DEMO_REQUEST: RequestInput = {
  product: "玛仕度肽（信尔美）",
  original: "玛仕度肽那个大研究纳入的是多大年龄的人？跟什么比的？我那边老年患者挺多，能用吗？",
  purpose: "回复医生学术问询",
  audience: "内分泌科医生",
  delivery: "一页沟通卡",
};

export function demoDeadline() {
  const x = new Date();
  x.setDate(x.getDate() + 3);
  return x.toISOString().slice(0, 10);
}
