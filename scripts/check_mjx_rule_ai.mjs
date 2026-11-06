import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import worker from "../worker/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "regulations-full.html"), "utf8");
const entry = readFileSync(join(root, "rules-ai.html"), "utf8");
const frontend = readFileSync(join(root, "mjx-rule-ai.js"), "utf8");
const allSources = [...html.matchAll(/<h4\b[^>]*\bid="(doc[1-7]-article-\d+)"[^>]*>/g)];
assert.equal(allSources.length, 130, "Expected the 130 currently published article anchors");
assert.equal(new Set(allSources.map((x) => x[1])).size, 130);
assert.match(entry, /id="mjx-ai-form"/);
assert.match(entry, /id="mjx-ai-history"/);
assert.match(frontend, /new DOMParser\(\)/);

const floatScript = readFileSync(join(root, "mjx-ai-float.js"), "utf8");
const floatStyles = readFileSync(join(root, "mjx-ai-float.css"), "utf8");
const chatStyles = readFileSync(join(root, "mjx-rule-ai.css"), "utf8");
assert.match(entry, /mjx-ai-embed/);
assert.match(frontend, /mjx-rule-ai-close/);
assert.match(floatScript, /aria-expanded/);
assert.match(floatScript, /aria-labelledby/);
assert.match(floatScript, /rules-ai\.html/);
assert.match(floatScript, /searchParams\.set\("embed", "1"\)/);
assert.match(floatStyles, /safe-area-inset-left/);
assert.match(floatStyles, /@media\(max-width:600px\)/);
assert.match(floatStyles, /@media print/);
assert.match(chatStyles, /html\.mjx-ai-embed/);

assert.match(entry, /id="mjx-ai-faq"/);
assert.match(entry, /class="mjx-ai-contact"/);
assert.match(entry, /https:\/\/discord\.gg\/PehjWyGDHV/);
assert.equal((entry.match(/data-example-ja=/g) || []).length, 6, "Expected six FAQ questions");
assert.doesNotMatch(entry, /mjx-logo-original\.png/, "Chat page should not show a logo");
assert.doesNotMatch(floatScript, /mjx-logo-original\.png/, "Floating chat header should not show a logo");
assert.match(frontend, /function showThinking\(\)/);
assert.match(frontend, /aria-busy/);
assert.match(frontend, /mjx-ai-faq/);
assert.match(frontend, /thinking\.box\.remove\(\)/);
assert.match(chatStyles, /mjx-ai-message--thinking/);
assert.match(chatStyles, /@keyframes mjx-ai-dot/);
assert.match(floatScript, /20261106-compact-stays-open-1/);
assert.match(floatScript, /mjx-ai-float-expand/);
assert.match(floatScript, /aria-pressed/);
assert.match(floatStyles, /min\(480px/);
assert.match(floatStyles, /min\(700px/);
assert.match(floatStyles, /height:min\(560px,64dvh\)/);
assert.doesNotMatch(floatScript, /document\.addEventListener\("pointerdown"/, "Background taps must not close chat");
assert.doesNotMatch(floatStyles, /body\.mjx-ai-float-open\s*\{\s*overflow:\s*hidden/, "Background scrolling must remain possible");
assert.doesNotMatch(floatStyles, /body\.mjx-ai-float-open\s+#mjx-ai-float-root\s+\.mjx-ai-float-launcher\s*\{\s*display:none/, "Launcher must remain available");
assert.match(floatStyles, /mjx-ai-float-maximized/);
assert.match(entry, /id="mjx-ai-tools"/);
assert.match(frontend, /mjx-ai-more-sources/);
assert.match(frontend, /mjx-ai-top-excerpt/);
assert.match(frontend, /mjx-ai-tools/);
assert.match(chatStyles, /reading-first/i);


for (const path of ["index.html", "index-en.html", "regulations.html", "regulations-en.html", "regulations-full.html", "regulations-full-en.html", "jp.html", "en.html"]) {
  const markup = readFileSync(join(root, path), "utf8");
  assert.match(markup, /href="mjx-ai-float\.css\?v=/, path + " must load the floating style");
  assert.match(markup, /src="mjx-ai-float\.js\?v=/, path + " must load the floating assistant");
  assert.match(markup, /mjx-ai-float\.js\?v=20261106-compact-open-1/, path + " must invalidate cached widget");
  assert.doesNotMatch(markup, /<a href="rules-ai\.html\?lang=(?:ja|en)">(?:規定AI|Rules Assistant)<\/a>/, path + " should not show an AI navigation tab");
}

const originalFetch = globalThis.fetch;
let sourceReads = 0;
globalThis.fetch = async (input) => {
  assert.equal(String(input), "https://warudora.github.io/MJX-/regulations-full.html");
  sourceReads += 1;
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
};
let aiCalls = 0;
const env = {
  AI: { run: async (_model, body) => {
    aiCalls += 1;
    assert.match(body.messages[0].content, /ONLY from the provided official Japanese source excerpts/);
    assert.ok(body.messages.length >= 3);
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    return { choices: [{ message: { content: "参照条文を確認してください。[1]" } }] };
  } },
  RULE_AI_LIMIT: { limit: async () => ({ success: true }) }
};
async function question(value, lang = "ja", origin = "https://warudora.github.io") {
  const request = new Request("https://mjx-rule-ai.workers.dev/", {
    method: "POST", headers: {
      origin, "content-type": "application/json", "cf-connecting-ip": "127.0.0.1"
    }, body: JSON.stringify({ question: value, lang })
  });
  const response = await worker.fetch(request, env);
  return { status: response.status, data: await response.json() };
}
try {
  const ready = await worker.fetch(new Request("https://mjx-rule-ai.example/health", { method: "GET" }), env);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { service: "mjx-rule-ai", status: "ready" });
  const notReady = await worker.fetch(new Request("https://mjx-rule-ai.example/health", { method: "GET" }), {});
  assert.deepEqual(await notReady.json(), { service: "mjx-rule-ai", status: "missing_bindings" });
  const visitor = await question("ビジターは建築できますか？");
  assert.equal(visitor.status, 200);
  assert.equal(visitor.data.citations[0].id, "doc3-article-01");
  assert.match(visitor.data.citations[0].url, /regulations-full.html#doc3-article-01$/);

  const privacy = await question("個人情報の保存期間は？");
  assert.equal(privacy.status, 200);
  assert.equal(privacy.data.citations[0].id, "doc7-article-07");

  const film = await question("映画館で動画を上映する条件は？", "en");
  assert.equal(film.status, 200);
  assert.equal(film.data.citations[0].id.slice(0, 4), "doc6");

  const forbidden = await question("個人情報の保存期間は？", "ja", "https://invalid.example");
  assert.equal(forbidden.status, 403);
  assert.ok(aiCalls >= 3);
  assert.ok(sourceReads >= 3);
  console.log("MJX rule AI: 130 source anchors, compact persistent nonmodal chat, collapsible help and sources, 3 grounded questions, CORS and health passed.");
} finally {
  globalThis.fetch = originalFetch;
}
