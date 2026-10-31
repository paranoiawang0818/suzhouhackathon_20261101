import assert from 'node:assert/strict';
import { parsePubMedXml, parseEuropePmc, searchNcbiPubMed, searchPubMed } from '../src/lib/pubmed.ts';

const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>123</PMID><Article><ArticleTitle>Effect of <i>Drug A</i> on kidney disease</ArticleTitle><Journal><Title>Test Journal</Title><JournalIssue><PubDate><MedlineDate>2025 Winter</MedlineDate></PubDate></JournalIssue></Journal><Abstract><AbstractText Label="METHODS">Adults with <i>kidney disease</i> were studied.</AbstractText><AbstractText Label="RESULTS">Dose was assessed &amp; reported.</AbstractText></Abstract></Article></MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="pubmed">123</ArticleId><ArticleId IdType="doi">10.1000/test</ArticleId></ArticleIdList></PubmedData></PubmedArticle><PubmedArticle><MedlineCitation><PMID>124</PMID><Article><ArticleTitle>No abstract</ArticleTitle></Article></MedlineCitation></PubmedArticle><PubmedArticle><MedlineCitation><PMID>125</PMID><Article><ArticleTitle>Long abstract</ArticleTitle><Abstract><AbstractText>${'x'.repeat(1600)}</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
const parsed = parsePubMedXml(xml);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].title, 'Effect of Drug A on kidney disease');
assert.equal(parsed[0].year, '2025');
assert.equal(parsed[0].doi, '10.1000/test');
assert.equal(parsed[0].abstract, 'METHODS: Adults with kidney disease were studied.\nRESULTS: Dose was assessed & reported.');
assert.equal(parsed[1].abstract.length, 1500);
assert.deepEqual(parsePubMedXml('<broken>'), []);
const europeRecord = { source:'MED', pmid:'123', title:'Drug <i>A</i> &amp; kidney', abstractText:'<h4>METHODS</h4>Adults with eGFR &lt; 30 were studied.', pubYear:'2025', doi:'10.1000/test', journalInfo:{journal:{title:'Test Journal'}} };
const europePayload = {resultList:{result:[europeRecord,{...europeRecord,source:'PMC'},{...europeRecord,pmid:'bad'},{...europeRecord,pmid:'124',abstractText:''}]}};
const europeParsed = parseEuropePmc(europePayload);
assert.equal(europeParsed.length,1);
assert.equal(europeParsed[0].title,'Drug A & kidney');
assert.equal(europeParsed[0].abstract,'METHODS: Adults with eGFR < 30 were studied.');
assert.equal(europeParsed[0].retrievedVia,'Europe PMC');
assert.equal(parseEuropePmc({resultList:{result:[{...europeRecord,abstractText:'x'.repeat(1600)}]}})[0].abstract.length,1500);
assert.deepEqual(parseEuropePmc(null),[]);

const originalFetch = globalThis.fetch;
const starts = [];
let active = 0, peak = 0;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(typeof url, 'string');
    url = new URL(url);
    assert.equal(options.method, 'POST');
    url.search = options.body;
    assert.equal(url.searchParams.get('tool'), 'brand-assistant');
    assert.equal(options.headers['Accept-Encoding'], 'identity');
    assert.ok(options.signal instanceof AbortSignal);
    starts.push(Date.now());
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return url.pathname.includes('esearch')
      ? Response.json({ esearchresult: { idlist: ['123', 'bad', '124'] } })
      : new Response(xml);
  };
  const found = await Promise.all([searchNcbiPubMed('drug AND kidney', 3), searchNcbiPubMed('other drug', 3)]);
  assert.deepEqual(found.map((list) => list.map((a) => a.pmid)), [['123'], ['123']]);
  assert.equal(peak, 1);
  assert.ok(starts.slice(1).every((time, i) => time - starts[i] >= 330));
  globalThis.fetch = async (url, options) => {
    const endpoint = new URL(url);
    assert.equal(endpoint.hostname,'www.ebi.ac.uk');
    assert.equal(options.method,'GET');
    assert.ok(endpoint.searchParams.get('query').startsWith('SRC:MED AND HAS_ABSTRACT:Y AND ('));
    assert.ok(!endpoint.searchParams.get('query').includes('['));
    assert.equal(endpoint.searchParams.get('resultType'),'core');
    return Response.json(europePayload);
  };
  assert.equal((await searchPubMed('drug[Title/Abstract] AND kidney',3))[0].pmid,'123');
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  assert.deepEqual(await searchNcbiPubMed('drug'), []);
  assert.deepEqual(await searchPubMed('drug'), []);
  assert.deepEqual(await searchPubMed(''), []);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('PASS: NCBI XML, Europe PMC provenance and MED filtering, abstract text/length, query normalization, request pacing, and failure fallback');

if (process.argv.includes('--live')) {
  for (const query of ['mazdutide AND GLORY-1', 'semaglutide AND chronic kidney disease']) {
    const start = Date.now();
    const articles = await searchPubMed(query, 4);
    assert.ok(articles.length > 0, `No live abstracts returned for ${query}`);
    if (query.includes('GLORY-1')) assert.ok(articles.some((a) => a.pmid === '40421736'));
    console.log(JSON.stringify({ query, elapsedMs: Date.now() - start, pmids: articles.map((a) => a.pmid) }));
  }
}
