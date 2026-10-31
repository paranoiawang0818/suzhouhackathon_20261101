// 录制自动演示：CDP 逐帧截屏 → ffmpeg 合成 MP4
// 用法：node record.mjs [url] [输出文件]
import { chromium } from "playwright-core";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:3100/?autoplay=1";
const out = path.resolve(process.argv[3] ?? "demo.mp4");
const framesDir = fs.mkdtempSync("/tmp/demo-frames-");

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "zh-CN" });
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && console.log("[page error]", m.text()));

// 先打开一次，清掉旧的本地数据
await page.goto(url.replace(/\?.*$/, ""));
await page.evaluate(() => localStorage.clear());

const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
  const file = path.join(framesDir, `${String(frames.length).padStart(6, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: Date.now() / 1000 });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

await page.goto(url);
await page.waitForFunction(() => window.__demoDone === false, null, { timeout: 30000 });
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 1 });
const t0 = Date.now();
await page.waitForFunction(() => window.__demoDone === true, null, { timeout: 8 * 60 * 1000, polling: 100 });
const endT = Date.now() / 1000;
await cdp.send("Page.stopScreencast");
console.log(`录制 ${(Date.now() - t0) / 1000}s，${frames.length} 帧`);
await browser.close();

// 每帧按真实时间间隔显示
const list = frames
  .map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? endT) - f.t).toFixed(4)}`)
  .join("\n");
fs.writeFileSync(path.join(framesDir, "list.txt"), `${list}\nfile '${frames.at(-1).file}'\n`);

execFileSync(
  ffmpeg.path,
  [
    "-y", "-f", "concat", "-safe", "0", "-i", path.join(framesDir, "list.txt"),
    "-vf", "fps=30,scale=1920:1200:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart",
    out,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
fs.rmSync(framesDir, { recursive: true, force: true });
console.log("输出：", out);
