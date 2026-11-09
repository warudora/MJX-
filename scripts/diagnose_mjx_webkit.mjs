import { webkit } from "playwright";

const base = "https://warudora.github.io/MJX-/";
const endpointHost = "mjx-rule-ai.warudora36.workers.dev";
const question = "ビジターは建築できますか？";

async function testCase(browser, { label, embedded = false, mobile = false, blockNetwork = false }) {
  const context = await browser.newContext({
    locale: "ja-JP",
    viewport: mobile ? { width: 390, height: 844 } : { width: 920, height: 780 },
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {})
  });
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
  page.on("response", (response) => {
    if (response.url().includes(endpointHost)) {
      requests.push({ status: response.status(), method: response.request().method(), path: new URL(response.url()).pathname });
    }
  });
  try {
    if (blockNetwork) {
      await page.route("**/mjx-rule-ai.warudora36.workers.dev/**", async (route) => {
        await route.abort("failed");
      });
    }
    const path = embedded
      ? "regulations.html?lang=ja&diagnostic=20261109b"
      : "rules-ai.html?lang=ja&diagnostic=20261109b";
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
    const texts = await target.locator(".mjx-ai-message--assistant:not(.mjx-ai-message--thinking)").allTextContents();
    const lastMessage = texts.at(-1) || "";
    const okay = blockNetwork
      ? status.includes("AI通信失敗") && lastMessage.includes("診断: NETWORK")
      : status.includes("AI応答正常");
    console.log(JSON.stringify({
      label, okay, elapsedMs, initial, finalStatus: status,
      diagnosticShown: lastMessage.includes("診断: "),
      requests, failures
    }));
    if (!okay) throw new Error(label + " unexpectedly changed status");
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
  for (const options of [
    { label: "desktop-direct" },
    { label: "desktop-embedded", embedded: true },
    { label: "mobile-embedded", embedded: true, mobile: true },
    { label: "simulated-network-failure", mobile: true, blockNetwork: true }
  ]) {
    try { await testCase(browser, options); }
    catch { failed = true; }
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
