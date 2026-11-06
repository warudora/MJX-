"use strict";
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const base = "https://warudora.github.io/MJX-/";
const read = (file) => readFileSync(join(root, file), "utf8");
const expected = new Map([
  ["index.html", base],
  ["index-en.html", base + "index-en.html"],
  ["regulations.html", base + "regulations.html"],
  ["regulations-en.html", base + "regulations-en.html"],
  ["regulations-full.html", base + "regulations-full.html"],
  ["regulations-full-en.html", base + "regulations-full-en.html"],
  ["jp.html", base + "jp.html"],
  ["en.html", base + "en.html"],
  ["rules-ai.html", base + "rules-ai.html"]
]);

function attribute(tag, name) {
  const match = tag.match(new RegExp("(?:\\s|^)" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i"));
  return match ? match[2] : null;
}

function headMarkup(html) {
  const end = html.search(/<\/head\s*>/i);
  assert.ok(end !== -1, "An HTML page must have a closing head tag");
  return html.slice(0, end);
}

const sitemap = read("sitemap.xml");
assert.match(sitemap, /<urlset\b/);
assert.match(sitemap, /<\/urlset>/);
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.equal(new Set(listed).size, listed.length, "Sitemap must not contain duplicate URLs");
assert.deepEqual(new Set(listed), new Set(expected.values()), "Sitemap entries must match canonical public pages");
assert.doesNotMatch(sitemap, /rules-ai\.html\?lang=/, "Keep one canonical chatbot URL");

for (const [file, wantedCanonical] of expected) {
  const head = headMarkup(read(file));
  const tags = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const canonicalTags = tags.filter((tag) => attribute(tag, "rel") === "canonical");
  assert.equal(canonicalTags.length, 1, file + " must have exactly one canonical link");
  assert.equal(attribute(canonicalTags[0], "href"), wantedCanonical, file + " canonical is incorrect");
  assert.match(head, /<title>[^<]+<\/title>/i, file + " must include a title");
  const descriptions = [...head.matchAll(/<meta\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => attribute(tag, "name") === "description");
  assert.ok(descriptions.some((tag) => (attribute(tag, "content") || "").length > 45),
    file + " needs a meaningful description");
  assert.doesNotMatch(head, /<meta\b[^>]*\bname=["']robots["'][^>]*\bnoindex/i,
    file + " should not prohibit indexing");
}

const languagePairs = [
  ["index.html", "index-en.html"],
  ["regulations.html", "regulations-en.html"],
  ["regulations-full.html", "regulations-full-en.html"],
  ["jp.html", "en.html"]
];
for (const [ja, en] of languagePairs) {
  const jaCanonical = expected.get(ja);
  const enCanonical = expected.get(en);
  for (const file of [ja, en]) {
    const head = headMarkup(read(file));
    const alternates = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
      .filter((tag) => attribute(tag, "rel") === "alternate");
    assert.ok(alternates.some((tag) => attribute(tag, "hreflang") === "ja" &&
      attribute(tag, "href") === jaCanonical), file + " must link to Japanese");
    assert.ok(alternates.some((tag) => attribute(tag, "hreflang") === "en" &&
      attribute(tag, "href") === enCanonical), file + " must link to English");
  }
}

const generator = read("scripts/generate_english_regulations.py");
assert.match(generator, /tag\["href"\]\s*=\s*"https:\/\/warudora\.github\.io\/MJX-\/regulations-full-en\.html"/,
  "Regenerating English must preserve self-canonical URL");

for (const file of ["index.html", "index-en.html"]) {
  const head = headMarkup(read(file));
  const scripts = [...head.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1, file + " should contain one Organization");
  const data = JSON.parse(scripts[0][1]);
  assert.equal(data["@type"], "Organization");
  assert.equal(data.name, "MTR Japan Nexus");
  assert.equal(data.alternateName, "MJX");
  assert.equal(data.url, base);
  assert.ok(data.logo.startsWith(base));
}

console.log("MJX SEO: nine canonical URLs, sitemap, JA/EN alternates, Organization and generator checked.");
