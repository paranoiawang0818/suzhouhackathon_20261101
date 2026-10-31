// 为路演 PPT 截取产品关键页面（无字幕、无向导）
// 用法：node shots.mjs [baseUrl] [输出目录]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = path.resolve(process.argv[3] ?? "shots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--hide-scrollbars"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "zh-CN" });
const page = await context.newPage();
const HIDE = "[data-demo-guide],[data-toasts]{display:none!important}";

const $ = (name) => page.locator(`[data-demo="${name}"]`).locator("visible=true").first();
const idle = async () => {
  await page.waitForFunction(() => !document.querySelector("[data-ai-overlay]"), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
};
const shot = async (name) => {
  await page.addStyleTag({ content: HIDE });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log("✓", name);
};
const go = async (url) => {
  await page.goto(base + url);
  await page.addStyleTag({ content: HIDE });
};

await go("/");
await page.evaluate(() => localStorage.clear());
await go("/");
await page.waitForTimeout(3000);
await shot("01_home");

await $("start").click();
await $("need-goal").waitFor();
await idle();
await page.evaluate(() => window.scrollTo(0, 0));
await shot("02_clarify");

await $("need-goal").fill("帮医生判断 75 岁以上的老年肥胖患者能不能用，医生最担心安全性");
await $("need-deliver").fill("书面要点即可：研究事实 + 明确说明证据覆盖不到的人群，附出处");
await $("reclarify").click();
await page.waitForTimeout(1500);
await shot("03_ai_overlay");
await idle();
await page.evaluate(() => window.scrollTo(0, 0));
await shot("02b_clarify_done");
await $("confirm-req").click();
await $("switch-role").waitFor({ timeout: 30000 });
await idle();
await $("step-evidence").click();
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("04_evidence");
await $("step-answer").click();

await $("switch-role").click();
await page.waitForTimeout(600);
await $("insert-evidence").click();
await page.evaluate(() => window.scrollTo(0, 380));
await page.waitForTimeout(600);
await shot("05_medical_answer");
await $("load-preset").click();
await $("submit-check").click();
await $("coverage").waitFor({ timeout: 30000 });
await idle();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await shot("06_check_missing");

await $("missing-input").fill("现有资料不足以回答：GLORY-1 仅纳入 18–75 岁成人，未纳入 75 岁以上人群，无法据此判断该人群的疗效与安全性。");
await $("recheck").click();
await page.locator('[data-demo="confirm-answer"]:not([disabled])').waitFor({ timeout: 30000 });
await idle();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await shot("07_check_done");
await $("confirm-answer").click();

await $("switch-role").click();
await $("gen-card").click();
await $("card").waitFor({ timeout: 30000 });
await idle();
await page.evaluate(() => window.scrollTo(0, 230));
await page.waitForTimeout(600);
await shot("08_card");

await $("deliver").click();
await $("fb-已解决").click();
await $("save-fb").click();
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await shot("09_done");

await go("/kb");
await $("kb-search").fill("年龄");
await page.waitForTimeout(1200);
await shot("10_kb");

await go("/tasks");
await page.waitForTimeout(1200);
await shot("11_board");

await browser.close();
