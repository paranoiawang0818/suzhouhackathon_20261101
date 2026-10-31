export type Role = "sales" | "medical";

export type Stage =
  | "clarify" // 1 提交并确认需求
  | "evidence" // 2 AI查找证据
  | "answer" // 3 医学部答复
  | "check" // 4 AI对照原问题审核
  | "material" // 5 销售制作品牌材料
  | "feedback" // 6 记录医生反馈
  | "done";

/** AI 结果来源：实时模型 / 预设兜底。界面必须如实标注 */
export type ResultSource = "ai" | "preset";

export interface SubQuestion {
  id: string;
  text: string;
}

/** 需求三问：一线人员想得到什么信息 / 想解决什么问题 / 希望医学部提供什么 */
export type NeedKey = "info" | "goal" | "deliver";

export interface Need {
  value: string; // AI 的理解，或销售填写的内容
  clear: boolean; // 是否已经说清楚
  ask: string; // 没说清时，AI 请销售补充的问题
  byUser?: boolean; // 销售本人填写/确认过
}

export type Needs = Record<NeedKey, Need>;

export const NEED_LABEL: Record<NeedKey, { title: string; hint: string }> = {
  info: { title: "想得到什么信息", hint: "需要医学部提供哪些事实或数据" },
  goal: { title: "想解决什么问题", hint: "这次沟通要帮医生解决什么、背后的场景" },
  deliver: { title: "希望医学部给什么", hint: "答复的深度、形式，是否需要说明证据边界" },
};

export interface ClarifyResult {
  needs: Needs;
  subQuestions: SubQuestion[];
  source: ResultSource;
  at: string;
}

export interface RequestInput {
  original: string; // 医生原话
  purpose: string; // 用途
  audience: string; // 对象
  delivery: string; // 交付要求
  product: string;
}

export interface ReqVersion {
  v: number;
  at: string;
  needs?: Needs;
  supplement: string;
  subQuestions: SubQuestion[];
  unknowns: string[]; // 明确标为未知、交医学人员判断
  confirmed: boolean;
}

/** 资料库中的一条资料片段 */
export interface SourceDoc {
  retrievedVia?: "NCBI" | "Europe PMC";
  id: string;
  title: string;
  kind: "论文摘要" | "监管/说明" | "注册信息" | "企业新闻稿" | "医学部补充" | "PubMed 文献";
  publisher: string;
  date: string;
  url: string;
  location: string; // 页码/段落
  quote: string; // 原文短片段（标注为摘要/全文/整理）
  zh: string; // 中文整理
  scope: string; // 资料中描述的研究条件 / 适用范围
}

export interface EvidenceLink {
  id: string;
  subQId: string;
  sourceId: string;
  reason: string;
  status: "candidate" | "adopted" | "excluded";
  addedBy: "ai" | "medical";
}

export type Answerability = "direct" | "partial" | "insufficient";

/** AI 对每个子问题的预判：能不能答、怎么答（只是线索，结论由医学部决定） */
export interface QAnalysis {
  subQId: string;
  answerability: Answerability;
  approach: string;
}

export interface EvidenceResult {
  queries?: { subQId: string; query: string }[];
  analysis?: QAnalysis[];
  kbLinks?: { subQId: string; kbId: string; reason: string }[];
  links: EvidenceLink[];
  gaps: { subQId: string; gap: string }[];
  scope: string;
  source: ResultSource;
  at: string;
}

export interface AnswerItem {
  subQId: string;
  text: string;
  cited: string[]; // sourceIds
  insufficient: boolean; // 明确说明资料不足
}

export interface AnswerVersion {
  v: number;
  at: string;
  items: AnswerItem[];
  author: string;
  confirmedBy: string;
  reqV: number;
  usedPreset: boolean;
}

export type Verdict = "answered" | "insufficient" | "missing";

export interface CheckItem {
  subQId: string;
  verdict: Verdict;
  note: string;
  resolution?: { type: "dismissed"; reason: string };
}

export interface CheckResult {
  id: string;
  at: string;
  answerHash: string;
  reqV: number;
  items: CheckItem[];
  source: ResultSource;
}

export interface MaterialCard {
  headline: string;
  sections: { title: string; body: string; subQId: string }[];
  cautions: string[];
}

export interface Material {
  id: string;
  v: number;
  at: string;
  basedOnAnswerV: number;
  card: MaterialCard;
  source: ResultSource;
  style: string;
}

export type FeedbackStatus = "已解决" | "部分解决" | "未解决" | "未获反馈";

export interface Delivery {
  id: string;
  materialId: string;
  materialV: number;
  at: string;
  status: FeedbackStatus;
  doctorWords: string;
  myNote: string;
}

export interface LogEntry {
  at: string;
  actor: string;
  action: string;
}

export interface Task {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  submitter: string;
  deadline: string;
  stage: Stage;
  request: RequestInput;
  clarify?: ClarifyResult;
  reqVersions: ReqVersion[];
  evidence?: EvidenceResult;
  manualSources: SourceDoc[]; // 医学部人员补充的资料
  fetchedSources?: SourceDoc[];
  draft: AnswerItem[];
  draftUsedPreset: boolean;
  checks: CheckResult[];
  answers: AnswerVersion[];
  materials: Material[];
  deliveries: Delivery[];
  log: LogEntry[];
}

export interface KnowledgeEntry {
  id: string;
  taskId: string;
  answerV: number;
  title: string;
  question: string;
  context: string;
  items: { q: string; a: string; refs: string[]; insufficient: boolean }[];
  confirmedBy: string;
  confirmedAt: string;
  status: "有效" | "待复核";
}

export interface ExperienceEntry {
  id: string;
  taskId?: string;
  kind: "经验案例" | "个人SOP" | "表达偏好";
  scope: "个人" | "团队";
  title: string;
  scene: string;
  action: string;
  result: string;
  author: string;
  at: string;
}
