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

for (const path of ["index.html", "index-en.html", "regulations.html", "regulations-en.html", "regulations-full.html", "regulations-full-en.html", "jp.html", "en.html"]) {
  assert.match(readFileSync(join(root, path), "utf8"), /href="rules-ai.html\?lang=(?:ja|en)"/, path + " must link to assistant");
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
  console.log("MJX rule AI: 130 source anchors, cross-page links, 3 grounded questions, CORS passed.");
} finally {
  globalThis.fetch = originalFetch;
}
