import { webkit } from "playwright";

const base = "https://warudora.github.io/MJX-/";
const endpointHost = "mjx-rule-ai.warudora36.workers.dev";
const question = "ビジターは建築できますか？";

async function testCase(browser, label, embedded) {
  const context = await browser.newContext({ locale: "ja-JP", viewport: { width: 920, height: 780 } });
  const page = await context.newPage();
  const failures = [];
  const requests = [];
  page.on("pageerror", (error) => failures.push({ kind: "pageerror", name: error.name, message: error.message.slice(0, 180) }));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push({ kind: "console", message: message.text().slice(0, 180) });
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes(endpointHost)) {
      failures.push({ kind: "requestfailed", urlType: "worker", message: request.failure()?.errorText?.slice(0, 180) || "unknown" });
    }
  });
  page.on("response", async (response) => {
    if (response.url().includes(endpointHost)) {
      requests.push({ status: response.status(), method: response.request().method(), path: new URL(response.url()).pathname });
    }
  });
  try {
    const path = embedded ? "regulations.html?lang=ja&diagnostic=20261109" : "rules-ai.html?lang=ja&diagnostic=20261109";
    await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    let target;
    if (embedded) {
      await page.locator("#mjx-ai-float-launcher").click({ timeout: 20000 });
      target = page.frameLocator("iframe.mjx-ai-float-iframe");
    } else {
      target = page;
    }
    await target.locator("#mjx-ai-question").waitFor({ state: "visible", timeout: 45000 });
    const initial = await target.locator("#mjx-ai-mode").innerText();
    await target.locator("#mjx-ai-question").fill(question);
    const started = Date.now();
    await target.locator("#mjx-ai-submit").click();
    await target.locator('#mjx-ai-form[aria-busy="true"]').waitFor({ state: "detached", timeout: 80000 });
    const elapsedMs = Date.now() - started;
    const status = await target.locator("#mjx-ai-mode").innerText();
    const assistantText = (await target.locator(".mjx-ai-message--assistant:not(.mjx-ai-message--thinking)").allTextContents()).join(" ").slice(0, 240);
    const okay = status.includes("AI応答正常");
    console.log(JSON.stringify({ label, okay, elapsedMs, initial, finalStatus: status, assistantSample: assistantText, requests, failures }));
    if (!okay) throw new Error(label + " did not receive an AI reply");
  } catch (error) {
    console.error(JSON.stringify({ label, failure: String(error?.message || error).slice(0, 400), requests, failures }));
    throw error;
  } finally {
    await context.close();
  }
}

const browser = await webkit.launch({ headless: true });
let failed = false;
try {
  for (const [label, embedded] of [["direct", false], ["iframe", true]]) {
    try { await testCase(browser, label, embedded); }
    catch { failed = true; }
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
