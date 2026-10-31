import "server-only";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface PubMedArticle {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  doi: string;
  abstract: string;
  retrievedVia?: "NCBI" | "Europe PMC";
}

type XmlNode = Record<string, unknown>;
const nodes = (value: unknown): XmlNode[] => Array.isArray(value) ? value : [];
const elements = (value: unknown, tag: string) => nodes(value).filter((node) => tag in node);
const content = (value: unknown, tag: string) => elements(value, tag).flatMap((node) => nodes(node[tag]));

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).join("");
  if (value && typeof value === "object") {
    return Object.entries(value).filter(([key]) => key !== ":@").map(([, item]) => text(item)).join("");
  }
  return "";
}

const clean = (value: unknown) => text(value).replace(/\s+/g, " ").trim();
const attribute = (node: XmlNode, name: string) => String((node[":@"] as XmlNode | undefined)?.[`@_${name}`] ?? "");

/** 保留行内标签前后的文字顺序，并合并带标签的结构化摘要。 */
export function parsePubMedXml(xml: string): PubMedArticle[] {
  try {
    if (XMLValidator.validate(xml) !== true) return [];
    const parsed = new XMLParser({ ignoreAttributes: false, preserveOrder: true, trimValues: false, parseTagValue: false }).parse(xml);
    const articles: PubMedArticle[] = [];
    for (const node of elements(content(parsed, "PubmedArticleSet"), "PubmedArticle")) {
      const citation = content(node.PubmedArticle, "MedlineCitation");
      const article = content(citation, "Article");
      const journal = content(article, "Journal");
      const date = content(content(journal, "JournalIssue"), "PubDate");
      const abstract = elements(content(article, "Abstract"), "AbstractText").map((part) => {
        const label = attribute(part, "Label");
        const body = clean(part.AbstractText);
        return body ? `${label ? `${label}: ` : ""}${body}` : "";
      }).filter(Boolean).join("\n").slice(0, 1500);
      const pmid = clean(content(citation, "PMID"));
      const title = clean(content(article, "ArticleTitle"));
      if (!abstract || !title || !/^\d+$/.test(pmid)) continue;
      const ids = content(content(node.PubmedArticle, "PubmedData"), "ArticleIdList");
      const doi = elements(ids, "ArticleId").find((id) => attribute(id, "IdType") === "doi");
      articles.push({
        pmid, title, abstract,
        journal: clean(content(journal, "Title")),
        year: clean(content(date, "Year")) || clean(content(date, "MedlineDate")).match(/^\d{4}/)?.[0] || "",
        doi: doi ? clean(doi.ArticleId) : "",
      });
    }
    return articles;
  } catch {
    return [];
  }
}

// ponytail: 本实例串行请求，至少间隔 350 ms；多实例高并发时再使用统一限流。
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;
function request(url: URL): Promise<Response> {
  const result = queue.then(async () => {
    const wait = Math.max(0, 350 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const ncbi = url.hostname === "eutils.ncbi.nlm.nih.gov";
    const response = await fetch(ncbi ? `${url.origin}${url.pathname}` : url.toString(), {
      method: ncbi ? "POST" : "GET", ...(ncbi ? { body: url.searchParams.toString() } : {}),
      signal: AbortSignal.timeout(10000), cache: "no-store",
      headers: { ...(ncbi ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), Accept: (url.searchParams.get("retmode") ?? url.searchParams.get("format")) === "json" ? "application/json" : "application/xml", "Accept-Encoding": "identity" },
    });
    if (!response.ok) {
      console.warn("[PubMed] HTTP failure", { utility: ncbi ? (url.pathname.endsWith("esearch.fcgi") ? "esearch" : "efetch") : "europepmc", status: response.status });
      throw new Error("PubMed 请求失败");
    }
    return response;
  });
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function endpoint(utility: string, params: Record<string, string>) {
  const url = new URL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${utility}.fcgi`);
  url.search = new URLSearchParams({ db: "pubmed", tool: "brand-assistant", ...params }).toString();
  if (process.env.NCBI_API_KEY) url.searchParams.set("api_key", process.env.NCBI_API_KEY);
  return url;
}

export async function searchNcbiPubMed(query: string, max = 5): Promise<PubMedArticle[]> {
  if (!query.trim()) return [];
  const count = Math.max(1, Math.min(12, Math.trunc(max) || 5));
  let phase = "esearch";
  try {
    const search = await request(endpoint("esearch", { retmode: "json", sort: "relevance", retmax: String(count), term: query.trim().slice(0, 1000) }));
    phase = "esearch-json";
    const raw = await search.text();
    let data: { esearchresult?: { idlist?: unknown[] } };
    try {
      data = JSON.parse(raw);
    } catch (error) {
      const format = !raw.trim() ? "empty" : /^\s*[\[{]/.test(raw) ? "json-like" : /^\s*(<!doctype\s+html|<html)/i.test(raw) ? "html" : /^\s*</.test(raw) ? "xml-like" : "other";
      const mime = search.headers.get("content-type")?.split(";")[0];
      const pageType = /tencent|腾讯|edgeone/i.test(raw) ? "platform-page" : /captcha|verify.{0,20}human|robot|challenge/i.test(raw) ? "verification-page" : /access.denied|blocked|forbidden/i.test(raw) ? "access-denied" : "other";
      console.warn("[PubMed] Unexpected search format", { format, mime: ["application/json", "application/xml", "text/xml", "text/html"].includes(mime ?? "") ? mime : "other", characters: raw.length, pageType, responseHost: search.url ? new URL(search.url).hostname : "unknown" });
      throw error;
    }
    const ids = (data.esearchresult?.idlist ?? []).filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)).slice(0, count);
    if (!ids.length) {
      console.info("[PubMed] No matching PMIDs");
      return [];
    }
    phase = "efetch";
    const fetched = await request(endpoint("efetch", { retmode: "xml", id: ids.join(",") }));
    phase = "efetch-xml";
    const articles = parsePubMedXml(await fetched.text()).filter((article) => ids.includes(article.pmid)).slice(0, count);
    if (!articles.length) console.warn("[PubMed] No usable abstracts", { phase });
    return articles;
  } catch (error) {
    const knownCodes = ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_TLS_CERT_ALTNAME_INVALID"];
    const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
    const name = error instanceof Error && ["Error", "TypeError", "SyntaxError", "TimeoutError", "AbortError"].includes(error.name) ? error.name : "Error";
    console.warn("[PubMed] Request failed", { phase, error: name, code: typeof code === "string" && knownCodes.includes(code) ? code : "OTHER" });
    return [];
  }
}

// Europe PMC 的 MED 记录对应 PubMed；仅接受真实 PMID 和可用摘要。
function plainHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/<\/h[1-6]>/gi, ": ").replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (full, entity: string) => {
    if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? full;
    const code = parseInt(entity.slice(entity[1].toLowerCase() === "x" ? 2 : 1), entity[1].toLowerCase() === "x" ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).replace(/\s+/g, " ").trim();
}

export function parseEuropePmc(data: unknown): PubMedArticle[] {
  const rows = (data as { resultList?: { result?: unknown } } | null)?.resultList?.result;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const a = row as { source?: unknown; pmid?: unknown; title?: unknown; abstractText?: unknown; pubYear?: unknown; doi?: unknown; journalInfo?: { journal?: { title?: unknown } } };
    const title = plainHtml(a.title);
    const abstract = plainHtml(a.abstractText).slice(0, 1500);
    if (a.source !== "MED" || typeof a.pmid !== "string" || !/^\d+$/.test(a.pmid) || !title || !abstract) return [];
    return [{ pmid: a.pmid, title, abstract, journal: plainHtml(a.journalInfo?.journal?.title), year: /^\d{4}$/.test(String(a.pubYear ?? "")) ? String(a.pubYear) : "", doi: plainHtml(a.doi), retrievedVia: "Europe PMC" as const }];
  });
}

export async function searchPubMed(query: string, max = 5): Promise<PubMedArticle[]> {
  // 当前已获用户授权启用 Europe PMC；NCBI 直连保留为解除限制后的可选入口。
  if (process.env.PUBMED_PROVIDER === "ncbi") return searchNcbiPubMed(query, max);
  if (!query.trim()) return [];
  const count = Math.max(1, Math.min(12, Math.trunc(max) || 5));
  const normalized = query.replace(/\[[^\]]+\]/g, "").trim().slice(0, 1000);
  try {
    const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
    url.search = new URLSearchParams({ query: `SRC:MED AND HAS_ABSTRACT:Y AND (${normalized})`, format: "json", resultType: "core", pageSize: String(count) }).toString();
    const response = await request(url);
    return parseEuropePmc(await response.json()).slice(0, count);
  } catch {
    console.warn("[PubMed] Europe PMC search unavailable");
    return [];
  }
}
