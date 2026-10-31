import { z } from "zod";
import { askJSON } from "@/lib/llm";
import { presetEvidence } from "@/lib/fallback";
import { SOURCES } from "@/lib/sources";
import { searchPubMed, type PubMedArticle } from "@/lib/pubmed";
import type { KnowledgeEntry, Needs, SourceDoc, SubQuestion } from "@/lib/types";

export const maxDuration = 120;

const QuerySchema = z.object({ queries: z.array(z.object({ subQId: z.string(), query: z.string() })) });
const QUERY_SYSTEM = `你是医学文献检索助手。为每个子问题生成一个简洁的英文 PubMed 检索式，返回 queries（subQId 与输入完全一致）。
药物使用英文通用名，如玛仕度肽为 mazdutide、司美格鲁肽为 semaglutide。结合疾病、人群或结局关键词，用 AND / OR 连接。
不要让检索式过长或过窄：按需用 OR 合并同义词；文献未必在摘要中写出所问年龄或剂量，避免把所有条件都用 AND 强制限定。保留药物关键词。对“大研究”等含糊指代，可以根据输入资料标题核实与本次药物匹配的试验名称；不同药物的资料必须忽略。询问某试验的入组、对照或未纳入人群时，用药名 AND 试验名查研究本体，不额外 AND 年龄或结局词而排除原始论文。多词短语用英文双引号，不使用 [Title/Abstract] 等数据库专用字段标签，以兼容 Europe PMC 备用入口。不得预设检索结果。`;

const Schema = z.object({
  analysis: z.array(
    z.object({
      subQId: z.string(),
      answerability: z.enum(["direct", "partial", "insufficient"]),
      approach: z.string(),
    }),
  ),
  links: z.array(z.object({ subQId: z.string(), sourceId: z.string(), reason: z.string() })),
  kbLinks: z.array(z.object({ subQId: z.string(), kbId: z.string(), reason: z.string() })),
  gaps: z.array(z.object({ subQId: z.string(), gap: z.string() })),
  sourceNotes: z.array(z.object({ sourceId: z.string(), zh: z.string().max(80), scope: z.string().max(40) })),
});

const SYSTEM = `你是药企医学部的资料分析助手。医学人员拿到问题前，你先做准备工作，帮他们节省查资料的时间。
输入：一线的需求说明、若干子问题、企业论文/资料库（sources）、企业问题库（kb，医学部已确认过的历史答复）。
对每个子问题：
1. analysis：判断现有资料能否回答——direct（资料可直接回答）/ partial（只能回答一部分）/ insufficient（资料不足）；approach 用 1–2 句话（不超过 80 字）写出“建议怎么答”：引用哪类资料、注意什么边界或口径差异。这是给医学人员的线索，不要写成最终答复，不要下诊疗结论。
2. links：从 sources 中选出真正相关的资料（每题最多 4 条），reason 一句话（不超过 30 字）说明它提供了什么。
3. kbLinks：如果 kb 中有相关的已确认历史答复，列出并说明可以参考哪部分；适用性仍需医学人员判断。
4. gaps：资料覆盖不到、且影响回答的地方（例如所问人群不在研究范围内、没有直接对比研究），一句话写明（不超过 60 字）；资料足以回答的题不要写缺口。
5. sourceNotes：只为 links 中实际引用到的 PubMed 文献写中文整理 zh（不超过 80 字）和研究人群、条件 scope（不超过 40 字）。只陈述摘要中明确提供的信息；范围未写明时如实说明。内置资料不需要 sourceNotes。
规则：PubMed 文献只能依据所给摘要内容，不得补充摘要中没有的数据。只能引用输入中存在的 id；不得编造资料或数据；数据不一致的资料（如论文与新闻稿）都列出并提示差异；使用简体中文。`;

export async function POST(req: Request) {
  const {
    subQuestions,
    extraSources = [],
    kb = [],
    needs,
    product = "",
    original = "",
  } = (await req.json()) as {
    subQuestions: SubQuestion[];
    extraSources?: SourceDoc[];
    kb?: KnowledgeEntry[];
    needs?: Needs;
    product?: string;
    original?: string;
  };
  if (!Array.isArray(subQuestions) || !subQuestions.length || subQuestions.length > 12 || subQuestions.some((q) => typeof q?.id !== "string" || typeof q?.text !== "string")) {
    return Response.json({ error: "请提供 1–12 个有效子问题。" }, { status: 400 });
  }
  const pool = [...SOURCES, ...extraSources];
  const qids = new Set(subQuestions.map((q) => q.id));
  try {
    const knownTitles = [...new Set(SOURCES.map((s) => s.title))];
    const generated = await askJSON(QUERY_SYSTEM, `产品 / 议题：${product}\n医生原话：${original}\n子问题：${JSON.stringify(subQuestions)}\n现有资料标题（只用于核实与本次药物匹配的试验名称）：${JSON.stringify(knownTitles)}`, QuerySchema);
    const queryMap = new Map(generated.queries.filter((q) => qids.has(q.subQId) && q.query.trim()).map((q) => [q.subQId, q.query.trim()]));
    const queries = subQuestions.flatMap((q) => queryMap.has(q.id) ? [{ subQId: q.id, query: queryMap.get(q.id)! }] : []);
    const articles = new Map<string, PubMedArticle>();
    for (const query of new Set(queries.map((item) => item.query))) {
      for (const article of await searchPubMed(query, 4)) {
        if (articles.size < 12) articles.set(article.pmid, article);
      }
      if (articles.size >= 12) break;
    }
    const fetched: SourceDoc[] = [...articles.values()].map((a) => ({
      id: `PMID-${a.pmid}`, kind: "PubMed 文献", title: a.title,
      publisher: `${a.journal} ${a.year}${a.doi ? ` · DOI ${a.doi}` : ""}`.trim(),
      date: a.year, url: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, location: "PubMed 摘要", quote: "", zh: "", scope: "", retrievedVia: a.retrievedVia ?? "NCBI",
    }));
    const allSources = [...pool, ...fetched];
    const corpus = allSources.map(({ id, title, kind, date, location, quote, zh, scope }) => ({
      id, title, kind, date, location, quote, zh, scope,
      ...(kind === "PubMed 文献" ? { abstract: articles.get(id.replace("PMID-", ""))?.abstract } : {}),
    }));
    const kbCorpus = kb.map((k) => ({ id: k.id, title: k.title, items: k.items.map((i) => ({ q: i.q, a: i.a })) }));
    const user = `一线需求：
- 想得到什么信息：${needs?.info.value ?? "（无）"}
- 想解决什么问题：${needs?.goal.value ?? "（无）"}
- 希望医学部给什么：${needs?.deliver.value ?? "（无）"}

子问题：
${subQuestions.map((q) => `${q.id}: ${q.text}`).join("\n")}

资料库 sources：
${JSON.stringify(corpus, null, 1)}

问题库 kb：
${JSON.stringify(kbCorpus, null, 1)}`;
    const out = await askJSON(SYSTEM, user, Schema);
    const ids = new Set(allSources.map((s) => s.id));
    const kbIds = new Set(kb.map((k) => k.id));
    const links = out.links.filter((l) => ids.has(l.sourceId) && qids.has(l.subQId));
    const linkedIds = new Set(links.map((l) => l.sourceId));
    const notes = new Map(out.sourceNotes.map((note) => [note.sourceId, note]));
    const gaps = out.gaps.filter((g) => qids.has(g.subQId));
    if (!fetched.length) {
      const warning = "PubMed 实时检索暂不可用，仅基于内置资料分析";
      for (const q of subQuestions) {
        const gap = gaps.find((g) => g.subQId === q.id);
        if (gap) gap.gap = `${gap.gap} ${warning}`;
        else gaps.push({ subQId: q.id, gap: warning });
      }
    }
    return Response.json({
      analysis: out.analysis.filter((a) => qids.has(a.subQId)),
      links,
      kbLinks: out.kbLinks.filter((l) => kbIds.has(l.kbId) && qids.has(l.subQId)),
      gaps,
      fetchedSources: fetched.filter((s) => linkedIds.has(s.id)).map((s) => ({ ...s, zh: notes.get(s.id)?.zh ?? "", scope: notes.get(s.id)?.scope ?? "" })),
      queries,
      source: "ai",
    });
  } catch (e) {
    return Response.json({ ...presetEvidence(subQuestions, pool, kb), fetchedSources: [], queries: [], source: "preset", error: String(e) });
  }
}
