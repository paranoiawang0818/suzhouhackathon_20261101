import assert from 'node:assert/strict';

const base = process.argv[2] ?? 'http://localhost:3001';
const cases = [
  { product:'玛仕度肽（信尔美）', original:'玛仕度肽那个大研究纳入的是多大年龄的人？跟什么比的？我那边老年患者挺多，能用吗？', questions:['玛仕度肽大型研究的入组年龄范围是多少？是否包含75岁以上老年肥胖患者？','该研究的对照方案是什么？','针对75岁以上老年肥胖患者，现有证据和安全性局限是什么？'] },
  { product:'司美格鲁肽', original:'司美格鲁肽在慢性肾病患者中需要调整剂量吗？有没有相关研究？', questions:['司美格鲁肽在慢性肾病患者中需要调整剂量吗？','有哪些相关临床研究，覆盖哪些人群？'] },
];
for (const [i,c] of cases.entries()) {
  const start = performance.now();
  const r = await fetch(`${base}/api/evidence`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...c,subQuestions:c.questions.map((text,j)=>({id:`q${j+1}`,text}))}),signal:AbortSignal.timeout(120000)});
  const o = await r.json();
  const elapsedSeconds = Math.round((performance.now()-start)/100)/10;
  const pmids = o.fetchedSources?.map(s=>s.id) ?? [];
  console.log(JSON.stringify({product:c.product,status:r.status,elapsedSeconds,source:o.source,pmids,retrievedVia:[...new Set(o.fetchedSources?.map(s=>s.retrievedVia))],queries:o.queries}));
  assert.equal(r.status,200);
  assert.equal(o.source,'ai');
  assert.ok(pmids.length > 0,'没有实时文献');
  if (i === 0) assert.ok(pmids.includes('PMID-40421736'),'未引用到 GLORY-1 原始论文');
  assert.ok(elapsedSeconds <= 40,'证据分析超过40秒');
}
