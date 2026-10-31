import type { SourceDoc } from "./types";

const NEJM_URL = "https://pubmed.ncbi.nlm.nih.gov/40421736/";
const NEJM_TITLE =
  "Once-Weekly Mazdutide in Chinese Adults with Obesity or Overweight (GLORY-1)";
const NEJM_PUB = "N Engl J Med 2025;392(22):2215-2225 · DOI 10.1056/NEJMoa2411528";
const PR_URL = "https://finance.sina.com.cn/roll/2025-06-27/doc-infcppey5875854.shtml";

/**
 * 预置公开资料库（Demo 资料范围）。
 * quote 仅放逐字原文短片段（无则留空），zh 为中文整理，二者在界面上分开展示。
 */
export const SOURCES: SourceDoc[] = [
  {
    id: "S1",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Methods（研究设计）",
    quote: "",
    zh: "GLORY-1 为在中国开展的 III 期、双盲、安慰剂对照研究。",
    scope: "中国成人超重/肥胖人群",
  },
  {
    id: "S2",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Methods（入选人群）",
    quote: "",
    zh: "纳入 18–75 岁成人；BMI≥28，或 24≤BMI<28 且合并至少一种体重相关疾病。",
    scope: "年龄 18–75 岁；未覆盖 75 岁以上及未成年人",
  },
  {
    id: "S3",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Methods（分组与疗程）",
    quote: "",
    zh: "按 1:1:1 随机分配至玛仕度肽 4 mg、6 mg 或安慰剂组，每周一次，治疗 48 周。比较对象为安慰剂，非其他减重药物。",
    scope: "对照为安慰剂；无头对头阳性药对照",
  },
  {
    id: "S4",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Methods（主要终点）",
    quote: "",
    zh: "主要终点：第 32 周体重相对基线变化百分比，以及体重下降≥5% 的受试者比例。采用治疗策略估计目标（treatment-policy estimand）。",
    scope: "主要终点时间点为第 32 周",
  },
  {
    id: "S5",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Results（第 32 周）",
    quote: "",
    zh: "共 610 例，基线平均体重 87.2 kg、平均 BMI 31.1。第 32 周体重变化：4 mg −10.09%，6 mg −12.55%，安慰剂 +0.45%；体重下降≥5% 比例：73.9%、82.0%、10.5%（均 P<0.001）。",
    scope: "治疗策略估计目标，第 32 周",
  },
  {
    id: "S6",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Results（第 48 周）",
    quote: "",
    zh: "第 48 周体重变化：4 mg −11.00%，6 mg −14.01%，安慰剂 +0.30%；体重下降≥15% 比例：35.7%、49.5%、2.0%。",
    scope: "治疗策略估计目标，第 48 周",
  },
  {
    id: "S7",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Results（安全性）",
    quote: "mostly mild to moderate in severity",
    zh: "最常见不良事件为胃肠道反应，多为轻至中度。因不良事件停药比例：4 mg 1.5%，6 mg 0.5%，安慰剂 1.0%。",
    scope: "研究人群 18–75 岁；48 周观察期",
  },
  {
    id: "S8",
    title: NEJM_TITLE,
    kind: "论文摘要",
    publisher: NEJM_PUB,
    date: "2025-05-25",
    url: NEJM_URL,
    location: "Abstract · Background（作用机制）",
    quote: "a glucagon-like peptide-1 and glucagon receptor dual agonist",
    zh: "玛仕度肽为 GLP-1 受体与胰高糖素（GCG）受体双重激动剂。",
    scope: "机制描述",
  },
  {
    id: "S9",
    title: "ClinicalTrials.gov 注册记录 NCT05607680（GLORY-1）",
    kind: "注册信息",
    publisher: "ClinicalTrials.gov",
    date: "2022",
    url: "https://clinicaltrials.gov/study/NCT05607680",
    location: "注册页 · Eligibility",
    quote: "NCT05607680",
    zh: "GLORY-1 的试验注册号。完整入排标准以注册页为准，Demo 未收录注册页全文。",
    scope: "仅收录注册号，未收录全文",
  },
  {
    id: "S10",
    title: "信尔美®（玛仕度肽注射液）获 NMPA 批准上市",
    kind: "企业新闻稿",
    publisher: "信达生物公告（新浪财经转载）",
    date: "2025-06-27",
    url: PR_URL,
    location: "公告正文 · 获批适应症",
    quote: "用于在控制饮食和增加体力活动基础上对成人患者的长期体重控制",
    zh: "获批适应症为成人长期体重控制：初始 BMI≥28，或 BMI≥24 且伴至少一种体重相关合并症。",
    scope: "中国获批适应症（成人）；以正式说明书为准",
  },
  {
    id: "S11",
    title: "信尔美®（玛仕度肽注射液）获 NMPA 批准上市",
    kind: "企业新闻稿",
    publisher: "信达生物公告（新浪财经转载）",
    date: "2025-06-27",
    url: PR_URL,
    location: "公告正文 · GLORY-1 第 48 周结果",
    quote: "4mg、6mg和安慰剂组体重相对基线百分比变化的均值分别为−12.0%、−14.8%和−0.5%",
    zh: "新闻稿报告第 48 周体重变化 −12.0% / −14.8% / −0.5%，与论文摘要（−11.00% / −14.01% / +0.30%）不同，可能为不同统计口径，需医学人员核对。",
    scope: "统计口径未在新闻稿中说明",
  },
  {
    id: "S12",
    title: "信尔美®（玛仕度肽注射液）获 NMPA 批准上市",
    kind: "企业新闻稿",
    publisher: "信达生物公告（新浪财经转载）",
    date: "2025-06-27",
    url: PR_URL,
    location: "公告正文 · 后续适应症",
    quote: "用于T2D成人患者的血糖控制",
    zh: "截至 2025 年 6 月公告时，2 型糖尿病血糖控制适应症的上市申请仍在审评中。",
    scope: "时点信息，后续进展需另查",
  },
];

export function sourceById(id: string, extra: SourceDoc[] = []): SourceDoc | undefined {
  return [...SOURCES, ...extra].find((s) => s.id === id);
}

export const SOURCE_SCOPE = `预置公开资料 ${SOURCES.length} 条：NEJM GLORY-1 论文摘要、ClinicalTrials.gov 注册号、信达生物获批公告`;
