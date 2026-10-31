# 任务：把「品牌沟通助手」正式版改造为真实可用版本，并重新部署上线

本任务分两部分：
- **第一部分：改代码**。接入 PubMed 实时文献检索，去掉演示痕迹，保留“一键填入示例”的按钮。
- **第二部分：重新部署**。打包代码，通过腾讯云网页终端上传并更新到服务器。

请先通读全文再动手。每完成一个阶段，用一两句话向我汇报。

---

## 背景信息

- **正式版代码目录（只改这里）**：`<workspace>/brand-assistant-prod`，当前在 git 的 `prod` 分支上。
- **演示版目录（禁止修改）**：`<workspace>/brand-assistant`。这是答辩时的备用版本，**任何情况下都不要修改、删除或提交这个目录里的文件**。
- 技术栈：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind 4 + zustand。数据存在浏览器 localStorage 里。AI 调用走 DeepSeek（OpenAI 兼容接口），封装在 `src/lib/llm.ts` 的 `askJSON(system, user, zodSchema)` 中。
- 注意：`AGENTS.md` 提到这一版 Next.js 和你训练数据里的版本有差异。遇到 Next.js API 方面的疑问，请先查 `node_modules/next/dist/docs/`。
- `.env.local` 里放着 DeepSeek API Key。**不要读取、打印、修改或提交这个文件。**
- 线上地址：`https://soochowhackathon261101.noiamist.com`。服务器在腾讯云香港，项目部署在 `/opt/brand-assistant`，由 pm2 运行，进程名是 `brand-assistant`。

## 必须遵守的规则

1. 只修改 `brand-assistant-prod` 目录。
2. 不读取、不显示、不提交 `.env.local`；也不要把 key 写进任何其他文件。
3. 不修改 `src/lib/llm.ts` 里的模型和调用方式（`askJSON` 的函数签名保持不变）。
4. 每完成一个阶段，都要跑一次 `npx tsc --noEmit` 和 `npx eslint src`，确认没有错误。
5. 只在本地 git 提交（`prod` 分支），**不要 push 到任何远程仓库**。
6. 部署阶段的登录、密码、验证码都由我本人完成，遇到就停下等我。
7. 任何一步和下面的描述对不上，或者出了报错，先停下来告诉我，不要自行大改。

---

## 第一部分：改代码

### 阶段 A：去掉演示痕迹，保留“一键填入示例”

目标：线上版本看起来是一个真实可用的产品，而不是演示。示例数据只在用户主动点按钮时才填入。

1. **去掉自动演示和演示向导**
   - `src/app/layout.tsx`：去掉 `<DemoGuide />` 和 `<Director />` 及它们的 import。`src/components/DemoGuide.tsx` 和 `src/components/Director.tsx` 两个文件可以删除。
   - 全局搜索 `startDirector`、`data-demo-guide`、`useDirector`，清理所有引用。`data-demo="..."` 这类属性保留不影响，可以不删。

2. **首页 `src/app/page.tsx`**
   - 去掉“▶ 自动演示（带字幕）”按钮。
   - “一键开始演示”改成“开始使用 →”，点击后跳转到 `/new`，不再自动创建任务。删除 `startDemo` 和相关 import。
   - 删掉“演示案例：内分泌科医生询问……”那一行。
   - 页脚第二行改为：“资料来源：PubMed 公开文献实时检索 + 企业资料库；AI 结果仅作线索，结论由医学部负责。”

3. **页头 `src/components/Header.tsx`**
   - 删除“重置演示”按钮。
   - “演示角色”改为“当前视角”。角色切换要保留，因为目前没有登录系统，需要靠它切换销售和医学部的视角。

4. **角色名称 `src/lib/store.ts`**
   - `ROLE_NAME` 改为 `{ sales: "销售", medical: "医学部" }`。
   - 持久化的 key 从 `"brand-assistant-v2"` 改为 `"brand-assistant-prod-v1"`，避免线上用户浏览器里残留旧的演示数据。

5. **不再预置演示数据 `src/lib/seed.ts`**
   - `SEED_TASKS`、`SEED_KNOWLEDGE`、`SEED_EXPERIENCE` 全部改为空数组 `[]`。文件里原来的演示数据定义可以删掉。
   - 删掉之后，`store.ts` 的 `reset` 如果已经没有地方调用，可以一并删除。

6. **医学部答复页 `src/components/steps/Step3Answer.tsx`**
   - 删除“载入模拟医学答复（演示样稿）”按钮（`data-demo="load-preset"`）和 `loadPreset` 函数。
   - 删除“含预置模拟答复样稿”的徽标。
   - `Step4Check.tsx`、`Step5Material.tsx` 里和 `usedPreset`、`draftUsedPreset` 相关的显示文字也一并删除。类型里的字段可以保留，不影响。
   - `src/lib/fallback.ts` 里的 `presetMedicalAnswer` 如果已经没人使用，就删掉。
   - **“+ 医学部人员补充资料”和“插入要点”“引用到答复”这些功能都要保留。**

7. **保留“一键填入示例”**
   - `src/app/(app)/new/page.tsx` 顶部那排示例问题按钮保留，标题改为“没有想法？点一个示例问题快速体验”。点击后只把内容填进表单，不自动提交。
   - 在 `src/components/steps/Step1Clarify.tsx` 的需求三问区域，新增一个按钮“填入示例补充”。**只有当任务的医生原话和 `src/lib/demo.ts` 里 `DEMO_REQUEST.original` 完全相同时才显示。** 点击后把以下两段文字填进对应输入框，不自动提交：
     - 想解决什么问题：`帮医生判断 75 岁以上的老年肥胖患者能不能用，医生最担心安全性`
     - 希望医学部给什么：`书面要点即可：研究事实 + 明确说明证据覆盖不到的人群，附出处`

8. **空状态**
   - 任务看板 `src/app/(app)/tasks/page.tsx`：没有任务时，显示“还没有任务”和一个“提交第一个问题 →”按钮，跳转到 `/new`。
   - 知识库页现有的空状态保留即可。

**阶段 A 完成标准**：首页、页头、各个步骤里都看不到“演示”二字（运行 `grep -rn "演示" src`，只允许剩下 `demo.ts` 和示例按钮相关的地方）；新开浏览器时任务看板是空的；示例按钮可以正常填入表单。

### 阶段 B：接入 PubMed 实时文献检索

目标：第 2 步“AI 分析并调取资料”时，针对任何药物和问题，都能实时去 PubMed 检索论文摘要，和内置资料库（`src/lib/sources.ts` 里的 12 条资料，保留不动）一起交给 AI 分析。

**1. 新建 `src/lib/pubmed.ts`（仅在服务端使用，第一行写 `import "server-only";`）**

使用 NCBI E-utilities 公开接口，不需要 key：
- 检索：`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=5&term=<检索式>`
- 取摘要：`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=<PMID 列表，逗号分隔>`
- 每个请求都带上 `&tool=brand-assistant`。如果环境变量里有 `NCBI_API_KEY`，再加上 `&api_key=...`（可选，不设置也能用）。
- NCBI 限制无 key 时每秒最多 3 个请求，所以请求要**串行发出**，或者把并发控制在 2 以内。
- 每个请求设置 10 秒超时（用 `AbortSignal.timeout(10000)`）。任何失败都返回空数组，**不要抛错**。
- 解析 XML：安装 `fast-xml-parser`（`npm i fast-xml-parser`）。从每篇文章中提取：PMID、标题（ArticleTitle）、期刊名（Journal/Title）、年份（PubDate/Year，没有就用 MedlineDate 的前 4 位）、DOI（ArticleIdList 里 IdType="doi" 的那一项）、摘要（AbstractText 可能有多段并带 Label 属性，需要拼接成“Label: 文本”的形式）。
- 摘要截断到最多 1500 个字符，没有摘要的文章直接丢弃。
- 导出函数：`searchPubMed(query: string, max = 5): Promise<PubMedArticle[]>`。

**2. 类型 `src/lib/types.ts`**
- `SourceDoc.kind` 的联合类型里加上 `"PubMed 文献"`。
- `Task` 加一个可选字段 `fetchedSources?: SourceDoc[]`，用来保存这次实时检索到的文献。
- `EvidenceResult` 加一个可选字段 `queries?: { subQId: string; query: string }[]`，用来在界面上展示检索式。

**3. 改造 `src/app/api/evidence/route.ts`，分三步执行**

- **第 1 步，生成检索式**：调用一次 `askJSON`，schema 为 `{ queries: [{ subQId, query }] }`。让 AI 为每个子问题生成一个英文 PubMed 检索式：药名用英文通用名（例如玛仕度肽对应 mazdutide），组合疾病、人群、结局等关键词，用 AND / OR 连接，不要太长，确保能检索到结果。产品名从请求里传入（见第 4 点）。
- **第 2 步，检索**：对每个检索式调用 `searchPubMed(query, 4)`，按 PMID 去重，总数最多 12 篇。把每篇文章转换成 `SourceDoc`：
  - `id`：`PMID-<pmid>`
  - `kind`：`"PubMed 文献"`
  - `title`：英文标题
  - `publisher`：`${期刊} ${年份}`，有 DOI 的话再加上 ` · DOI ${doi}`
  - `date`：年份
  - `url`：`https://pubmed.ncbi.nlm.nih.gov/<pmid>/`
  - `location`：`PubMed 摘要`
  - `quote`：空字符串（**不要编造原文引用**）
  - `zh`、`scope`：先留空，等第 3 步由 AI 填写
- **第 3 步，分析**：沿用现在的分析调用，把资料库 corpus 扩充为“内置资料 + 医学部补充资料 + PubMed 文献”。PubMed 文献在 corpus 中带上摘要原文（`abstract` 字段），其他资料保持原来的字段。schema 在现有的 `analysis / links / kbLinks / gaps` 基础上，再加一项 `sourceNotes: [{ sourceId, zh, scope }]`：要求 AI 只为 `links` 里实际引用到的 PubMed 文献写中文整理（`zh` 不超过 80 字，只陈述摘要里写了的内容）和适用范围（`scope` 写研究人群和条件，不超过 40 字）。提示词里补充一句：“PubMed 文献只能依据所给摘要内容，不得补充摘要中没有的数据。”
- 把 `sourceNotes` 合并进对应的 PubMed `SourceDoc`。**只返回被 `links` 引用到的 PubMed 文献**，作为新字段 `fetchedSources` 返回；同时把 `queries` 也返回。
- 如果 PubMed 一篇也没检索到，或者检索失败，就只用内置资料继续分析，不能整体失败。检索失败时，在每个子问题的 `gaps` 里追加一句“PubMed 实时检索暂不可用，仅基于内置资料分析”。
- 预设兜底（`presetEvidence`）的逻辑保持不变，并让它返回 `fetchedSources: []`、`queries: []`。
- 把这个路由文件的 `maxDuration` 改为 `120`。

**4. 前端 `src/lib/actions.ts` 的 `runEvidence`**
- 请求体里加上 `product: t.request.product`，以及医生原话 `original: t.request.original`，供第 1 步生成检索式时使用。
- AI 过程浮层的步骤文字改为：`判断能否解答`、`生成英文检索式`、`实时检索 PubMed`、`检索企业问题库（N 条已确认答复）`、`整理解答思路与原文出处`、`标注资料缺口，交给医学部`。
- 收到结果后，把 `fetchedSources` 存进 `x.fetchedSources`，把 `queries` 存进 `x.evidence.queries`。

**5. 让所有用到资料的地方都能找到 PubMed 文献**

目前代码里用 `t.manualSources` 作为额外资料来源。请在 `src/lib/flow.ts` 新增一个函数：

```ts
export const extraSources = (t: Task) => [...t.manualSources, ...(t.fetchedSources ?? [])];
```

然后把下面这些位置里作为“额外资料”传入的 `t.manualSources` 全部替换为 `extraSources(t)`：
- `src/components/steps/Step2Evidence.tsx`（两处）
- `src/components/steps/Step3Answer.tsx` 第 138 行和第 160 行附近（**第 209、225 行“医学部补充资料”的编号和写入不要改**）
- `src/components/steps/Step5Material.tsx`（两处）
- `src/app/(app)/kb/page.tsx` 第 27 行：改为 `tasks.flatMap((t) => extraSources(t))`

**6. 界面**
- `src/components/Evidence.tsx` 的 `SourceBody`：给“PubMed 文献”配上蓝色徽标；标题链接指向 PubMed 页面；`quote` 为空时不显示“原文”那一行（现有逻辑已经是这样，确认一下即可）。
- `Step2Evidence.tsx` 顶部的徽标改为三个：`PubMed 实时检索 · N 篇`（N 为 `fetchedSources` 的数量）、`内置资料库 · 12 条`、`企业问题库 · M 条已确认答复`。
- 每个子问题卡片里，在“AI 建议的解答思路”下面加一行小字：`PubMed 检索式：<query>`。
- 删除顶部说明文字里“预置公开资料”相关的说法。

**阶段 B 完成标准（先本地测试）**
1. 运行 `npm run dev -- -p 3001`（会读取 `.env.local`）。
2. 提交演示示例问题，走到第 2 步：应该能看到 GLORY-1 那篇 NEJM 论文以“PubMed 文献”的形式出现（PMID 40421736），每题下面都显示检索式，界面标注“AI 实时生成”。
3. 再提交一个和玛仕度肽无关的新问题，例如：“司美格鲁肽在慢性肾病患者中需要调整剂量吗？有没有相关研究？”。第 2 步应能检索到相关 PubMed 文献，不再只是“资料不足”。
4. 第 2 步耗时控制在 40 秒以内。如果超时，把每个检索式的结果数从 4 篇降到 3 篇。
5. `npx tsc --noEmit`、`npx eslint src`、`npm run build` 都没有报错。
6. 本地提交：`git add -A && git commit -m "正式版：PubMed 实时检索，去掉演示痕迹"`。

---

## 第二部分：重新部署到服务器

### 1. 打包（在 Mac 的终端里执行）
```bash
cd "<workspace>/brand-assistant-prod"
git archive --format=tar.gz -o "../部署包/brand-assistant.tar.gz" HEAD
tar -tzf "../部署包/brand-assistant.tar.gz" | grep -c "env.local"   # 必须输出 0
```

### 2. 上传
1. 打开腾讯云控制台，找到香港服务器，「登录」→ OrcaTerm 网页终端。遇到登录或验证时停下等我。
2. 用 OrcaTerm 的「文件上传」功能上传：`<workspace>/部署包/brand-assistant.tar.gz`，传到当前用户的主目录。如果同名文件已存在，选择覆盖。

### 3. 更新并重新构建（在服务器网页终端里执行）
```bash
sudo tar -xzf ~/brand-assistant.tar.gz -C /opt/brand-assistant
cd /opt/brand-assistant && sudo bash deploy/setup.sh
```
解压会覆盖代码文件，但**不会动服务器上的 `.env.local`**（压缩包里没有这个文件）。脚本会自动重新安装依赖、构建并重启应用，大约 3–8 分钟。结束后把最后 20 行输出告诉我。

### 4. 线上验证
1. 用浏览器打开 `https://soochowhackathon261101.noiamist.com`，确认首页、页头没有“演示”字样，任务看板是空的。
2. 进入“提交需求”，点一个示例问题提交。在第 1 步点“填入示例补充”，再点“按补充重新整理”，然后确认需求。
3. 第 2 步应能看到“PubMed 实时检索 · N 篇”、各题的检索式，以及 PMID 40421736 这篇文献，并标注“AI 实时生成”。
4. 再提交一个非示例的新问题，确认第 2 步也能检索到 PubMed 文献。
5. 验证完就停止，把结果向我汇报。

### 常见问题（先告诉我，经我同意后再处理）

| 现象 | 处理方式 |
|---|---|
| 线上第 2 步显示“PubMed 实时检索暂不可用” | 在服务器上运行 `curl -sI https://eutils.ncbi.nlm.nih.gov/` 检查连通性，把结果告诉我 |
| 第 2 步超时或报错 | 运行 `pm2 logs brand-assistant --lines 80`，把输出告诉我 |
| 构建时报错 | 把完整报错告诉我，不要修改服务器上的文件 |
| 页面还是旧版本的样子 | 浏览器强制刷新（Cmd+Shift+R），然后运行 `pm2 status` 确认进程在运行 |
