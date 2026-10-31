// 品牌沟通助手 · 路演 PPT 生成脚本
// 用法：node build_deck.js <截图目录> <输出pptx>
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");

const SKILL = process.env.PPTX_SKILL_DIR || "<pptx-skill-dir>";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const SHOTS = path.resolve(process.argv[2] ?? "shots");
const OUT = path.resolve(process.argv[3] ?? "deck.pptx");

const HEX = {
  navy: "0F1D3A",
  brand: "2457C5",
  med: "6B46A6",
  kb: "1F8A5F",
  amber: "B45309",
  ice: "8FB3FF",
  canvas: "F3F6FB",
  ink: "1F2937",
  muted: "6B7280",
  line: "E3E8F0",
  white: "FFFFFF",
};

const THEME = {
  name: "品牌沟通助手",
  headFontFace: "PingFang SC",
  bodyFontFace: "PingFang SC",
  colors: {
    dk1: HEX.ink,
    lt1: HEX.white,
    dk2: HEX.navy,
    lt2: HEX.canvas,
    accent1: HEX.brand,
    accent2: HEX.med,
    accent3: HEX.kb,
    accent4: HEX.amber,
    accent5: HEX.ice,
    accent6: HEX.muted,
    hlink: HEX.brand,
    folHlink: HEX.med,
  },
};

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// 截图裁出关键区域（原图 2880x1800）
const CROPS = {
  "02_clarify.png": { left: 690, top: 780, width: 1980, height: 1010 },
  "04_evidence.png": { left: 690, top: 420, width: 1980, height: 1230 },
  "06_check_missing.png": { left: 650, top: 610, width: 2150, height: 1190 },
  "05_medical_answer.png": { left: 690, top: 230, width: 1980, height: 1230 },
  "08_card.png": { left: 680, top: 360, width: 2120, height: 1440 },
  "10_kb.png": { left: 905, top: 480, width: 1900, height: 1300 },
};
const SIZES = {};

(async () => {
  for (const [f, c] of Object.entries(CROPS)) {
    const out = path.join(SHOTS, "crop_" + f);
    await sharp(path.join(SHOTS, f)).extract(c).png().toFile(out);
    SIZES["crop_" + f] = { w: c.width, h: c.height };
  }
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pres.title = "品牌沟通助手 · 路演";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const W = 13.333;

  // ---------- 版式 ----------
  pres.defineSlideMaster({
    title: "DARK",
    background: { color: HEX.navy },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: 0.8, y: 1.55, w: 6, h: 0.4, fontSize: 14, color: HEX.ice, bold: true, charSpacing: 4, align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 6.4, h: 1.6, fontSize: 44, bold: true, color: HEX.white, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.75, w: 6.2, h: 1.4, fontSize: 20, color: "D7E0F2", valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "STATEMENT",
    background: { color: HEX.navy },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: 0.8, y: 0.9, w: 11.7, h: 0.4, fontSize: 14, color: HEX.ice, bold: true, charSpacing: 4, align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.4, w: 11.7, h: 1.2, fontSize: 38, bold: true, color: HEX.white, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.2, w: 11.7, h: 2.0, fontSize: 22, color: "D7E0F2", valign: "top", align: "left", margin: 0, lineSpacingMultiple: 1.4 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: HEX.white },
    margin: [0.5, 0.6, 0.5, 0.6],
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.4, w: 12.1, h: 0.85, fontSize: 32, bold: true, color: HEX.navy, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { text: { text: "品牌沟通助手 · 医学问询协作平台", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: "9AA3B2", margin: 0 } } },
    ],
    slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: "9AA3B2", align: "right" },
  });

  // ---------- 小组件 ----------
  const card = (s, x, y, w, h, fill = HEX.canvas, name = "card") =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill }, objectName: name });

  const iconCircle = async (s, Comp, x, y, d, bg, fg = HEX.white) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg }, objectName: "icon-bg" });
    const pad = d * 0.27;
    s.addImage({ data: await icon(Comp, fg), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, objectName: "icon" });
  };

  const text = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, fontSize: 14, color: HEX.ink, valign: "top", ...o });

  // 截图：白底圆角框 + 阴影
  const shot = (s, file, x, y, w) => {
    const ratio = SIZES[file] ? SIZES[file].h / SIZES[file].w : 900 / 1440;
    const h = w * ratio;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.1,
      fill: { color: HEX.white }, line: { color: HEX.line, width: 0.75 },
      shadow: { type: "outer", color: "0F1D3A", opacity: 0.18, blur: 12, offset: 3, angle: 90 },
      objectName: "shot-frame",
    });
    s.addImage({ path: path.join(SHOTS, file), x, y, w, h, objectName: "screenshot", altText: file });
    return h;
  };

  const chip = (s, t, x, y, color) => {
    const w = 0.22 + t.length * 0.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.16, fill: { color, transparency: 85 }, line: { color, transparency: 85 }, objectName: "chip" });
    text(s, t, { x, y, w, h: 0.32, fontSize: 11, bold: true, color, align: "center", valign: "middle" });
    return w;
  };

  // =============== 1 封面 ===============
  pres.addSection({ title: "开场" });
  let s = pres.addSlide({ masterName: "DARK", sectionTitle: "开场" });
  s.addText("苏州黑客松 · 医药 × AI", { placeholder: "kicker" });
  s.addText("品牌沟通助手", { placeholder: "title" });
  s.addText([
    { text: "医生的问题，医学部答得准，销售说得清", options: { breakLine: true, bold: true, color: HEX.white } },
    { text: "药企一线 × 医学部的医学问询协作平台", options: { fontSize: 16, color: HEX.ice } },
  ], { placeholder: "body" });
  shot(s, "01_home.png", 7.35, 1.75, 5.4);
  s.addNotes("大家好，我们的项目叫品牌沟通助手。一句话：帮助药企的一线代表和医学部，又快又合规地回应医生的专业问询——医学部答得准，销售说得清。");

  // =============== 2 痛点 ===============
  pres.addSection({ title: "问题" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "问题" });
  s.addText("一个专业问题，往往要来回好几轮", { placeholder: "title" });
  const nodes = [
    ["医生提问", fa.FaUserDoctor, HEX.navy],
    ["一线代表转述", fa.FaUserTie, HEX.brand],
    ["医学部查证作答", fa.FaBookMedical, HEX.med],
    ["回到一线沟通", fa.FaComments, HEX.brand],
  ];
  for (let i = 0; i < nodes.length; i++) {
    const x = 0.9 + i * 3.1;
    await iconCircle(s, nodes[i][1], x + 0.62, 1.55, 0.86, nodes[i][2]);
    text(s, nodes[i][0], { x: x - 0.2, y: 2.5, w: 2.5, h: 0.4, fontSize: 16, bold: true, align: "center", color: HEX.navy });
    if (i < nodes.length - 1)
      s.addShape(pres.shapes.LINE, { x: x + 1.65, y: 1.98, w: 1.4, h: 0, line: { color: "B8C2D3", width: 1.5, endArrowType: "triangle" }, objectName: "arrow" });
  }
  text(s, "↺ 需求没说清，医学部反复确认", { x: 3.2, y: 3.0, w: 3.3, h: 0.3, fontSize: 12, color: HEX.amber, align: "center" });
  text(s, "↺ 漏答一问，回到一线才发现", { x: 6.3, y: 3.0, w: 3.3, h: 0.3, fontSize: 12, color: HEX.amber, align: "center" });

  const pains = [
    [fa.FaCircleQuestion, "需求没说清就转出去", "一线自己没想清楚要什么：要哪些信息、想帮医生解决什么、希望医学部给到什么程度。"],
    [fa.FaMagnifyingGlass, "资料反复查找", "每个问题都要从论文、说明书里重新定位原文、出处和适用范围。"],
    [fa.FaRotate, "答复遗漏、经验难复用", "漏答要到一线沟通时才发现；答过的问题和好的沟通方式没有沉淀下来。"],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 3.6, 3.85, 2.55);
    await iconCircle(s, pains[i][0], x + 0.3, 3.9, 0.6, HEX.amber);
    text(s, pains[i][1], { x: x + 1.05, y: 3.98, w: 2.6, h: 0.45, fontSize: 18, bold: true, color: HEX.navy, valign: "middle" });
    text(s, pains[i][2], { x: x + 0.3, y: 4.75, w: 3.25, h: 1.25, fontSize: 14, color: "4B5563", lineSpacingMultiple: 1.25 });
  }
  text(s, "访谈依据：简单问题在群里很快能解决；深入问题要转交医学部，资料查找和沟通往返最耗时。", { x: 0.6, y: 6.35, w: 12.1, h: 0.35, fontSize: 12, color: HEX.muted, italic: true });
  s.addNotes("我们访谈了医药行业的从业者。简单问题群里很快就能解决，但只要问题深一点，就要转给医学部。问题出在三个地方：背景丢失导致反复补问；资料要一遍遍重新查找；答复漏了一问，要回到一线才发现，而且答过的内容没有沉淀。");

  // =============== 3 用户 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "问题" });
  s.addText("我们服务两类人，各自解决最头疼的事", { placeholder: "title" });
  const personas = [
    {
      name: "一线代表 / 销售", who: "直接面对医生，负责把问题提进来、把答复讲清楚", color: HEX.brand, Icon: fa.FaUserTie,
      pain: ["专业问题答不了，又说不清医生到底想问什么", "拿到答复后，改写成沟通材料时怕说错、越界"],
      get: ["AI 帮你把需求三问说清楚，再交给医学部", "基于已确认答复一键生成沟通卡，标明依据版本"],
    },
    {
      name: "医学部人员", who: "负责专业查证与答复，对答复内容负责", color: HEX.med, Icon: fa.FaUserDoctor,
      pain: ["收到的问题缺背景，要先花时间问清楚", "资料要从头找，答完还担心漏答"],
      get: ["拿到准备好的资料包：解答思路 + 原文证据 + 历史答复", "AI 逐题对照原问题，提示可能遗漏的地方"],
    },
  ];
  for (let i = 0; i < 2; i++) {
    const p = personas[i];
    const x = 0.6 + i * 6.15;
    card(s, x, 1.5, 5.95, 5.15);
    await iconCircle(s, p.Icon, x + 0.35, 1.8, 0.85, p.color);
    text(s, p.name, { x: x + 1.4, y: 1.82, w: 4.3, h: 0.45, fontSize: 22, bold: true, color: p.color });
    text(s, p.who, { x: x + 1.4, y: 2.3, w: 4.3, h: 0.4, fontSize: 13, color: HEX.muted });
    text(s, "现在的难处", { x: x + 0.35, y: 3.0, w: 5, h: 0.35, fontSize: 14, bold: true, color: HEX.amber });
    text(s, p.pain.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < p.pain.length - 1 } })), { x: x + 0.35, y: 3.38, w: 5.3, h: 1.2, fontSize: 15, paraSpaceAfter: 6 });
    text(s, "我们给他们的", { x: x + 0.35, y: 4.75, w: 5, h: 0.35, fontSize: 14, bold: true, color: HEX.kb });
    text(s, p.get.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < p.get.length - 1 } })), { x: x + 0.35, y: 5.13, w: 5.3, h: 1.2, fontSize: 15, paraSpaceAfter: 6 });
  }
  s.addNotes("我们的用户是两类人。一线代表直接面对医生：答不了专业问题，转述又容易失真，改写材料时怕越界。医学部负责专业答复：收到的问题缺背景，资料要从头找，答完还怕漏答。我们分别给他们对应的帮助。");

  // =============== 4 方案原则 ===============
  pres.addSection({ title: "方案" });
  s = pres.addSlide({ masterName: "STATEMENT", sectionTitle: "方案" });
  s.addText("我们的方案", { placeholder: "kicker" });
  s.addText("AI 做整理和检查，专业结论由医学部负责", { placeholder: "title" });
  const cols = [
    ["销售 / 一线代表", fa.FaUserTie, HEX.brand, ["记录医生原意，补充并确认需求", "用企业模板制作沟通材料", "记录交付与医生反馈"], "问题包 · 沟通材料 · 反馈"],
    ["AI 助手", fa.FaRobot, "3A4A6B", ["帮一线说清需求三问", "预判能否解答，调取论文与问题库", "对照原问题检查遗漏"], "解答思路 · 证据 · 检查结果"],
    ["医学部", fa.FaUserDoctor, HEX.med, ["判断证据适用性，补查资料", "逐题撰写答复，说明依据与限制", "确认答复并对结果负责"], "带依据与适用范围的答复"],
  ];
  for (let i = 0; i < 3; i++) {
    const [name, Icon, color, items, out] = cols[i];
    const x = 0.8 + i * 4.0;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.35, w: 3.7, h: 3.45, rectRadius: 0.12, fill: { color: HEX.white, transparency: 93 }, line: { color: HEX.white, transparency: 80 }, objectName: "role-card" });
    await iconCircle(s, Icon, x + 0.3, 3.6, 0.7, color);
    text(s, name, { x: x + 1.15, y: 3.72, w: 2.4, h: 0.45, fontSize: 19, bold: true, color: HEX.white, valign: "middle" });
    text(s, items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1 } })), { x: x + 0.3, y: 4.55, w: 3.2, h: 1.5, fontSize: 14, color: "D7E0F2", paraSpaceAfter: 6 });
    text(s, "交出：" + out, { x: x + 0.3, y: 6.25, w: 3.2, h: 0.35, fontSize: 12, color: HEX.ice });
  }
  s.addNotes("我们的核心原则是：AI 做整理和检查，专业结论由医学部负责。销售负责问清楚和说清楚；AI 负责拆问题、找证据、查遗漏；医学部负责专业判断并对答复负责。三方责任清楚，这也是药企合规最看重的一点。");

  // =============== 5 流程 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "方案" });
  s.addText("一条任务，六个环节，责任清楚", { placeholder: "title" });
  const steps = [
    ["1", "说清需求", "销售", HEX.brand, "要什么信息、解决什么问题、希望医学部给什么"],
    ["2", "AI 分析调取", "AI", HEX.navy, "预判能否解答，调出论文与历史答复"],
    ["3", "医学部答复", "医学部", HEX.med, "要点一键引用，结论由医学人员写"],
    ["4", "AI 对照审核", "AI", HEX.navy, "逐题检查是否遗漏或答偏"],
    ["5", "销售制作材料", "销售", HEX.brand, "企业模板 + 个人表达风格"],
    ["6", "记录医生反馈", "销售", HEX.brand, "四种结果，绑定交付版本"],
  ];
  for (let i = 0; i < 6; i++) {
    const [no, name, role, color, desc] = steps[i];
    const x = 0.6 + i * 2.05;
    card(s, x, 1.55, 1.85, 2.6);
    text(s, no, { x: x + 0.2, y: 1.7, w: 0.6, h: 0.6, fontSize: 30, bold: true, color: "C3CBD8" });
    chip(s, role, x + 1.85 - 0.2 - (0.22 + role.length * 0.2), 1.82, color);
    text(s, name, { x: x + 0.2, y: 2.45, w: 1.5, h: 0.75, fontSize: 16, bold: true, color: HEX.navy });
    text(s, desc, { x: x + 0.2, y: 3.22, w: 1.5, h: 0.85, fontSize: 12, color: HEX.muted });
  }
  const loops = [
    [0.6, "↺ 需求没说清 → 补充后重新整理"],
    [4.7, "↺ 需补正 → 医学部补充答复并重新审核"],
    [8.8, "↺ 修改了医学内容 → 退回医学部"],
  ];
  for (const [x, t] of loops) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.35, w: 3.9, h: 0.45, rectRadius: 0.08, fill: { color: "FDF4E7" }, line: { color: "F2D3A8", dashType: "dash" }, objectName: "loop" });
    text(s, t, { x: x + 0.15, y: 4.35, w: 3.6, h: 0.45, fontSize: 13, color: HEX.amber, valign: "middle" });
  }
  const kbs = [
    [fa.FaDatabase, "企业知识库", "只保存医学部确认的答复，关联来源、适用范围和版本；下次检索时作为线索提供给医学人员。"],
    [fa.FaBookOpen, "个人 SOP 与偏好", "销售确认后保存表达风格与工作经验，可查看、修改、删除；下次制作材料时自动带入。"],
  ];
  for (let i = 0; i < 2; i++) {
    const x = 0.6 + i * 6.15;
    card(s, x, 5.05, 5.95, 1.6, "EAF5EF");
    await iconCircle(s, kbs[i][0], x + 0.3, 5.3, 0.6, HEX.kb);
    text(s, kbs[i][1], { x: x + 1.1, y: 5.33, w: 4.5, h: 0.45, fontSize: 17, bold: true, color: HEX.kb, valign: "middle" });
    text(s, kbs[i][2], { x: x + 1.1, y: 5.82, w: 4.6, h: 0.75, fontSize: 13, color: "374151" });
  }
  s.addNotes("一条任务走六个环节：提交确认、查找证据、医学部答复、对照审核、制作材料、记录反馈。流程里有三个回环，对应真实工作中的补问、补正和退回。同时沉淀两类知识：医学部确认的答复进入企业知识库，销售的经验沉淀为个人 SOP。");

  // =============== 6 演示①：问清楚 + 找证据 ===============
  pres.addSection({ title: "产品演示" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "产品演示" });
  s.addText("先把需求说清楚，再把资料包送到医学部", { placeholder: "title" });
  const hA = Math.max(shot(s, "crop_02_clarify.png", 0.6, 1.55, 5.95), shot(s, "crop_04_evidence.png", 6.75, 1.55, 5.95));
  const capY = 1.55 + hA + 0.3;
  chip(s, "第 1 步", 0.6, capY, HEX.brand);
  text(s, "需求三问：要什么信息、解决什么问题、希望医学部给什么；没说清的 AI 给出追问，说清了才往下走", { x: 1.6, y: capY - 0.02, w: 4.95, h: 0.75, fontSize: 14 });
  chip(s, "第 2 步", 6.75, capY, HEX.navy);
  text(s, "AI 先预判每题能不能答、建议怎么答，再调出论文原文和医学部确认过的历史答复", { x: 7.75, y: capY - 0.02, w: 4.95, h: 0.75, fontSize: 14 });
  s.addNotes("演示案例：医生问“这个研究纳入多大年龄的人？老年患者能不能用？”。第一步不是急着转给医学部，而是帮一线说清三件事：要什么信息、想帮医生解决什么、希望医学部给到什么程度。没说清的，AI 会给出追问。说清之后，AI 先预判每个问题能不能答、建议怎么答，再从论文库和企业问题库调出原文和历史答复；资料覆盖不到的地方如实标出。");

  // =============== 6b 医学部怎么做 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "产品演示" });
  s.addText("医学部：AI 准备到要点，结论由医学部来写", { placeholder: "title" });
  shot(s, "crop_05_medical_answer.png", 0.6, 1.55, 7.2);
  const med = [
    [fa.FaListCheck, HEX.navy, "AI 包揽准备工作", "预判能否解答、给出解答思路、调出原文与历史答复"],
    [fa.FaFileMedical, HEX.med, "要点一键引用", "原文要点、医学部确认过的历史答复，一键插入答复"],
    [fa.FaUserDoctor, HEX.med, "结论由医学人员写", "AI 不起草答复、不下结论，医学部对结果负责"],
    [fa.FaShieldHalved, HEX.kb, "为什么不让 AI 直接写", "审核者容易照单全收，责任边界会变模糊"],
  ];
  for (let i = 0; i < med.length; i++) {
    const y = 1.6 + i * 1.22;
    await iconCircle(s, med[i][0], 8.25, y, 0.6, med[i][1]);
    text(s, med[i][2], { x: 9.05, y: y - 0.02, w: 3.7, h: 0.4, fontSize: 16, bold: true, color: HEX.navy });
    text(s, med[i][3], { x: 9.05, y: y + 0.4, w: 3.7, h: 0.6, fontSize: 13, color: HEX.muted });
  }
  s.addNotes("医学部这一环我们讨论过两种做法：让 AI 直接写好答案给医生审，或者 AI 只给线索。我们选了中间：AI 把最耗时的准备工作全包——判断能不能答、给出思路、找原文、找历史答复，医学部可以一键引用；但结论必须由医学人员来写。因为让 AI 直接写稿，审核者容易照单全收，责任边界会变模糊，这在药企是最不能接受的。");

  // =============== 7 演示②：对照审核 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "产品演示" });
  s.addText("医学部答完，AI 逐题对照原问题查遗漏", { placeholder: "title" });
  shot(s, "crop_06_check_missing.png", 0.6, 1.55, 7.6);
  const pts = [
    [fa.FaUserDoctor, HEX.med, "专业答复由医学人员撰写", "AI 准备资料与思路，结论由医学部写"],
    [fa.FaListCheck, HEX.brand, "逐题对照，标出可能遗漏", "演示中第 3 题未回应，被直接标红"],
    [fa.FaCodeBranch, HEX.amber, "答复一改，旧检查自动作废", "必须重新检查，避免拿过期结论去确认"],
    [fa.FaCircleCheck, HEX.kb, "每题都有处理结果才能确认", "“资料不足”也是明确的处理结果"],
  ];
  for (let i = 0; i < pts.length; i++) {
    const y = 1.6 + i * 1.22;
    await iconCircle(s, pts[i][0], 8.65, y, 0.6, pts[i][1]);
    text(s, pts[i][2], { x: 9.45, y: y - 0.02, w: 3.3, h: 0.4, fontSize: 16, bold: true, color: HEX.navy });
    text(s, pts[i][3], { x: 9.45, y: y + 0.4, w: 3.3, h: 0.6, fontSize: 13, color: HEX.muted });
  }
  s.addNotes("这是我们最核心的一屏。医学人员写完答复后，AI 对照最初的问题逐题检查——它不评价医学内容对不对，只看有没有回应。演示里第 3 题被漏答，直接标了出来。医学人员补充“资料不足”的原因后，旧的检查结果自动作废、重新检查，全部有处理结果才能确认。以前这种遗漏要回到一线才会被发现。");

  // =============== 8 演示③：材料 + 知识库 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "产品演示" });
  s.addText("销售说得清，经验留得住", { placeholder: "title" });
  const hB = Math.max(shot(s, "crop_08_card.png", 0.6, 1.55, 5.95), shot(s, "crop_10_kb.png", 6.75, 1.55, 5.95));
  const capY2 = 1.55 + hB + 0.3;
  chip(s, "第 5 步", 0.6, capY2, HEX.brand);
  text(s, "企业模板 + 个人表达偏好生成沟通卡，和医学原文左右对照，标明依据的答复版本", { x: 1.6, y: capY2 - 0.02, w: 4.95, h: 0.75, fontSize: 14 });
  chip(s, "沉淀", 6.75, capY2, HEX.kb);
  text(s, "确认过的答复自动进入企业知识库，可搜索、可追溯原任务；下次类似问询直接给出线索", { x: 7.65, y: capY2 - 0.02, w: 5.05, h: 0.75, fontSize: 14 });
  s.addNotes("确认后的答复交回销售。销售用企业模板，加上自己保存的表达偏好，一键生成沟通卡，左右对照医学原文；卡片标明依据的答复版本，不会冒用“医学部已审核”。确认过的答复自动进入企业知识库，下次遇到类似问询，第 2 步就会直接给出参考线索。");

  // =============== 9 可信设计 ===============
  pres.addSection({ title: "为什么可信" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "为什么可信" });
  s.addText("每一步都可追溯，AI 不越界", { placeholder: "title" });
  const trust = [
    [fa.FaCodeBranch, HEX.brand, "版本绑定", "需求、医学答复、沟通卡各有版本，材料记录它依据的答复版本"],
    [fa.FaClockRotateLeft, HEX.amber, "检查结果会过期", "答复或需求一改，旧的完整性检查自动失效"],
    [fa.FaShieldHalved, HEX.med, "不冒用医学审核", "医学部确认的是答复；衍生材料不会自动显示“已审核”"],
    [fa.FaTriangleExclamation, HEX.amber, "缺口如实标注", "资料覆盖不到的人群、对比，明确写出缺口"],
    [fa.FaCircleQuestion, HEX.brand, "未知不猜成事实", "问不到的信息标为未知，交医学部判断"],
    [fa.FaTag, HEX.kb, "AI 来源如实标识", "实时生成与离线预设结果分开标注，失败不伪装成功"],
  ];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.6 + row * 2.6;
    card(s, x, y, 3.85, 2.35);
    await iconCircle(s, trust[i][0], x + 0.3, y + 0.3, 0.65, trust[i][1]);
    text(s, trust[i][2], { x: x + 1.15, y: y + 0.38, w: 2.5, h: 0.5, fontSize: 18, bold: true, color: HEX.navy, valign: "middle" });
    text(s, trust[i][3], { x: x + 0.3, y: y + 1.15, w: 3.3, h: 1.0, fontSize: 14, color: "4B5563", lineSpacingMultiple: 1.2 });
  }
  s.addNotes("医药行业最在意合规。我们在设计上做了六件事：版本绑定、检查过期、不冒用医学审核、缺口如实标注、未知不猜成事实、AI 来源如实标识。每一步都可追溯，AI 始终不越界。");

  // =============== 10 价值验证 ===============
  pres.addSection({ title: "价值与计划" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "价值与计划" });
  s.addText("我们用四个指标验证价值", { placeholder: "title" });
  const kpis = [
    [fa.FaCircleQuestion, "问题澄清次数", "医学部向一线补问的轮数"],
    [fa.FaMagnifyingGlass, "医学人员处理时间", "从收到问题到确认答复的实际用时"],
    [fa.FaRotate, "返工次数", "答复返回一线后被发现遗漏、需重答的次数"],
    [fa.FaStopwatch, "任务总耗时", "从医生提问到沟通交付的全流程时间"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.6, 2.85, 3.3);
    await iconCircle(s, kpis[i][0], x + 0.3, 1.9, 0.7, HEX.brand);
    text(s, "↓", { x: x + 1.85, y: 1.8, w: 0.8, h: 0.9, fontSize: 44, bold: true, color: HEX.kb, align: "right" });
    text(s, kpis[i][1], { x: x + 0.3, y: 2.9, w: 2.4, h: 0.5, fontSize: 18, bold: true, color: HEX.navy });
    text(s, kpis[i][2], { x: x + 0.3, y: 3.45, w: 2.3, h: 1.2, fontSize: 14, color: HEX.muted });
  }
  card(s, 0.6, 5.2, 12.1, 1.45, "EEF3FC");
  await iconCircle(s, fa.FaFlask, 0.9, 5.47, 0.6, HEX.brand);
  text(s, "实话实说", { x: 1.75, y: 5.42, w: 3, h: 0.4, fontSize: 16, bold: true, color: HEX.brand });
  text(s, "今天的演示证明的是流程和功能：使用公开资料（NEJM GLORY-1 摘要、NMPA 获批公告）、自拟需求和模拟角色。节省多少时间，需要在真实试点中按以上四个指标实测，我们不填未经验证的数字。", { x: 1.75, y: 5.82, w: 10.7, h: 0.75, fontSize: 14, color: "374151" });
  s.addNotes("价值怎么衡量？我们定了四个指标：澄清次数、医学人员处理时间、返工次数、任务总耗时。实话实说，今天演示的是流程和功能，用的是公开资料和模拟角色；节省多少时间，要在真实试点中实测，我们不编数字。");

  // =============== 11 路线图 + 技术 ===============
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "价值与计划" });
  s.addText("从演示到落地：三步走", { placeholder: "title" });
  const phases = [
    ["现在", "首版演示", HEX.brand, ["六环节主流程完整可用", "两类知识沉淀与检索", "自动演示 + 离线预设兜底"]],
    ["下一步", "企业试点", HEX.med, ["接入企业资料库与说明书", "真实医学人员参与验证", "按四个指标实测效率"]],
    ["之后", "规模化", HEX.kb, ["文件自动解析、更多数据库", "组织权限与多人协同", "个人 Agent 与团队 SOP"]],
  ];
  s.addShape(pres.shapes.LINE, { x: 0.9, y: 2.05, w: 11.5, h: 0, line: { color: "C9D2E1", width: 2 }, objectName: "timeline" });
  for (let i = 0; i < 3; i++) {
    const [when, name, color, items] = phases[i];
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 1.87, w: 0.36, h: 0.36, fill: { color }, line: { color: HEX.white, width: 3 }, objectName: "dot" });
    text(s, when, { x: x + 0.75, y: 1.82, w: 2, h: 0.45, fontSize: 14, bold: true, color, valign: "middle" });
    card(s, x, 2.55, 3.85, 2.6);
    text(s, name, { x: x + 0.3, y: 2.75, w: 3.3, h: 0.5, fontSize: 20, bold: true, color: HEX.navy });
    text(s, items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1 } })), { x: x + 0.3, y: 3.35, w: 3.35, h: 1.6, fontSize: 14, color: "374151", paraSpaceAfter: 6 });
  }
  text(s, "技术实现", { x: 0.6, y: 5.5, w: 3, h: 0.4, fontSize: 16, bold: true, color: HEX.navy });
  const tech = ["Next.js 16 + React 19", "Claude 结构化输出", "按子问题的证据匹配", "版本与检查指纹", "离线预设兜底"];
  let tx = 0.6;
  for (const t of tech) {
    const w = 0.45 + [...t].reduce((a, c) => a + (/[\u4e00-\u9fff]/.test(c) ? 0.19 : 0.1), 0);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx, y: 6.0, w, h: 0.45, rectRadius: 0.22, fill: { color: HEX.canvas }, line: { color: HEX.line }, objectName: "tech-chip" });
    text(s, t, { x: tx, y: 6.0, w, h: 0.45, fontSize: 13, color: HEX.navy, align: "center", valign: "middle" });
    tx += w + 0.2;
  }
  s.addNotes("落地分三步：现在是首版演示，主流程和两类知识沉淀都能跑通；下一步找企业试点，接入真实资料库，由真实医学人员参与验证；之后再做文件解析、组织权限和个人 Agent。技术上我们用 Next.js 加 Claude 的结构化输出，所有 AI 结果都有离线兜底，演示不会因为网络掉链子。");

  // =============== 12 结尾 ===============
  pres.addSection({ title: "结尾" });
  s = pres.addSlide({ masterName: "STATEMENT", sectionTitle: "结尾" });
  s.addText("品牌沟通助手", { placeholder: "kicker" });
  s.addText("让每一次医学问询，都成为下一次的积累", { placeholder: "title" });
  s.addText([
    { text: "AI 整理问题与证据，发现遗漏", options: { breakLine: true } },
    { text: "医学部完成专业答复，并对结果负责", options: { breakLine: true } },
    { text: "销售把专业内容说清楚，经验持续沉淀" },
  ], { placeholder: "body" });
  text(s, "谢谢！欢迎体验现场演示", { x: 0.8, y: 5.6, w: 8, h: 0.5, fontSize: 18, bold: true, color: HEX.ice });
  s.addNotes("最后总结：AI 整理和检查，医学部负责结论，销售说清楚，经验持续沉淀。让每一次医学问询，都成为下一次的积累。谢谢大家，欢迎现场体验。");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
