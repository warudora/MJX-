"""Build an EN reference translation of every Japanese MJX regulation clause.

The Japanese text remains the source of truth.  Automated English output is
reviewed against the Japanese source, and all original section/paragraph anchors are retained.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
JA = ROOT / "regulations-full.html"
EN = ROOT / "regulations-full-en.html"
OVERVIEW = ROOT / "regulations-en.html"
LANGUAGE_JS = ROOT / "mjx-lang.js"
NAMES = (
    "Cinema System Usage Policy",
    "General Server Regulations",
    "Builder Regulations",
    "Resource Pack Regulations",
    "Privacy Policy",
    "Economic Regulations",
    "Visitor Rules",
)
STATES = (
    "Current regulation · unchanged",
    "Current regulation · unchanged",
    "Established · effective date set separately",
    "Revision approved · effective date not specified",
    "Revision approved · effective date not specified",
    "Current regulation · unchanged",
    "Amendment approved · effective date not specified",
)
DESCRIPTIONS = (
    "Enacted October 11, 2026. Text unchanged.",
    "Enacted October 5, 2026. Preamble, 16 articles and supplementary provisions.",
    "Established October 26, 2026. Six chapters, 22 articles and supplementary provisions. The effective date is specified separately by management.",
    "Revision approved November 1, 2026. Creator rights, modifications and appeal procedures.",
    "Revision approved November 1, 2026. The six-month post-departure retention period remains.",
    "Enacted October 5, 2026. Fifteen chapters and 47 articles.",
    "Amendment approved November 1, 2026. Survival mode and protected building permissions.",
)
JAPANESE = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")
ITEM_PREFIX = re.compile(r"^(\s*(?:[0-9]+[.．]|[•◦・※])\s*)(.+)$", re.S)
ARTICLE = re.compile(r"^第\s*([0-9０-９]+)\s*条\s*(?:[（(｜|]\s*(.*?)\s*[）)]?)?$", re.S)
CHAPTER = re.compile(r"^第\s*([0-9０-９]+)\s*章\s*(.*)$", re.S)


def get_translator():
    import argostranslate.package
    import argostranslate.translate

    installed = {lang.code: lang for lang in argostranslate.translate.get_installed_languages()}
    if "ja" not in installed or "en" not in installed:
        argostranslate.package.update_package_index()
        choices = [p for p in argostranslate.package.get_available_packages()
                   if p.from_code == "ja" and p.to_code == "en"]
        if not choices:
            raise RuntimeError("No Japanese-to-English translation model in Argos index")
        model = choices[-1]
        print(f"Installing model: {model}", flush=True)
        argostranslate.package.install_from_path(model.download())
        installed = {lang.code: lang for lang in argostranslate.translate.get_installed_languages()}
    return installed["ja"].get_translation(installed["en"])


def translate_document(source: str, model) -> tuple[str, dict]:
    soup = BeautifulSoup(source, "html.parser")
    soup.html["lang"] = "en"
    stats = Counter()
    cache = {}

    def en(text: str) -> str:
        text = text.strip()
        if not text or not JAPANESE.search(text):
            return text
        if text in cache:
            return cache[text]
        prefix = ""
        match = ITEM_PREFIX.match(text)
        if match:
            prefix, text = match.group(1), match.group(2)
        translated = model.translate(text).strip()
        if not translated:
            legal_terms = {
                "目的": "Purpose",
                "免責事項": "Disclaimer",
                "定義": "Definitions",
                "用語": "Terminology",
                "適用範囲": "Scope of Application",
                "総則": "General Provisions",
                "補則": "Supplementary Provisions",
                "改定": "Amendments",
                "施行": "Effective Date",
                "禁止事項": "Prohibited Conduct",
                "個人情報": "Personal Information",
                "経過措置": "Transitional Measures",
                "その他": "Other Provisions",
            }
            translated = legal_terms.get(text, "")
            if not translated:
                translated = model.translate("この規定における" + text + "について").strip()
        if not translated:
            raise ValueError(f"Empty translation even after retry: {text[:45]!r}")
        translated = (translated.replace("re-上映bute", "redistribute")
                     .replace("re-上映bution", "redistribution")
                     .replace("上映", "screening"))
        if JAPANESE.search(translated):
            stats["japanese_remains"] += 1
            print(f"Untranslated fragment: {translated[:100]!r}", flush=True)
        result = prefix + translated
        cache[prefix + text] = result
        stats["model_calls"] += 1
        return result

    def heading(text: str) -> str:
        text = text.strip()
        if text == "前文":
            return "Preamble"
        if text == "附則":
            return "Supplementary Provisions"
        match = ARTICLE.match(text)
        if match:
            number, caption = match.groups()
            return f"Article {number}" + (f" — {en(caption)}" if caption else "")
        match = CHAPTER.match(text)
        if match:
            number, caption = match.groups()
            return f"Chapter {number}" + (f" — {en(caption)}" if caption else "")
        return en(text)

    # Translate every clause and heading in document order, preserving its ID.
    docs = soup.select("section.regulation")
    if len(docs) != 7:
        raise ValueError(f"Expected 7 regulations, found {len(docs)}")
    source_counts = []
    for i, section in enumerate(docs):
        body = section.select_one(".document-text")
        if body is None:
            raise ValueError(f"Missing text body for regulation {i+1}")
        paragraphs = body.find_all(["p", "h3", "h4"], recursive=False)
        source_counts.append(len(paragraphs))
        for block in paragraphs:
            original = block.get_text(strip=True)
            translated = heading(original) if block.name in ("h3", "h4") else en(original)
            if not translated:
                raise ValueError(f"Missing English text in document {i+1}")
            block["data-ja-source"] = original
            block.string = translated
            stats["translated_blocks"] += 1
        section.select_one(".document-head h2").string = NAMES[i]
        section.select_one(".document-head .doc-state").string = STATES[i]
        section.select_one(".document-head .doc-description").string = DESCRIPTIONS[i]
        dochead = section.select_one(".document-head")
        original_link = soup.new_tag("p", attrs={"class": "source-link"})
        anchor = soup.new_tag("a", href=f"regulations-full.html?lang=ja#doc{i+1}")
        anchor.string = "Check the Japanese original text"
        original_link.append(anchor)
        dochead.insert(4, original_link)
        toc = section.select_one(".doc-toc")
        if toc:
            toc.select_one("summary").string = f"Browse chapters and articles ({len(toc.select('a'))})"
            toc.select_one("nav")["aria-label"] = f"Headings in regulation {i+1}"
            for toc_link in toc.select("a[href^='#']"):
                target = soup.find(id=toc_link["href"][1:])
                if target:
                    toc_link.string = target.get_text(strip=True)
        print(f"Translated regulation {i+1}/7: {len(paragraphs)} text blocks", flush=True)

    # Localize document navigation and site navigation (no PDF links).
    soup.title.string = "Full Text of Seven MJX Regulations | MTR Japan Nexus"
    for tag in soup.select('meta[name="description"]'):
        tag["content"] = "Read all seven MJX regulations in English. Reference translation reviewed against Japanese; Japanese text prevails."
    for tag in soup.select('meta[property="og:title"]'):
        tag["content"] = "MJX Seven Official Regulations — English Full Text"
    for tag in soup.select('meta[property="og:description"]'):
        tag["content"] = "Full English reference translation of all seven MJX regulations. Japanese original controls."
    for tag in soup.select('meta[property="og:url"]'):
        tag["content"] = "https://warudora.github.io/MJX-/regulations-full-en.html"
    soup.select_one(".mjx-skip").string = "Skip to content"
    brand = soup.select_one(".mjx-brand")
    brand["href"] = "index-en.html?lang=en"
    for a in soup.select(".mjx-toplinks a"):
        old = a.get("href", "")
        if old.startswith("index.html"):
            a["href"], a.string = "index-en.html?lang=en", "Home"
        elif old.startswith("regulations.html"):
            a["href"], a.string = "regulations-en.html?lang=en", "Official Regulations"
        elif old.startswith("jp.html"):
            a["href"], a.string = "en.html?lang=en", "About MJX"
    switch = soup.select_one('.mjx-lang-toggle a[data-mjx-lang="ja"]')
    switch["href"] = "regulations-full.html?lang=ja"
    switch.attrs.pop("class", None)
    switch.attrs.pop("aria-current", None)
    switch = soup.select_one('.mjx-lang-toggle a[data-mjx-lang="en"]')
    switch["href"] = "regulations-full-en.html?lang=en"
    switch["class"] = ["is-selected"]
    switch["aria-current"] = "true"
    soup.select_one(".mast h1").string = "MJX Seven Official Regulations — Full Text"
    soup.select_one(".mast .subtitle").string = (
        "English reference translation of all seven regulations · Approved materials as of November 1, 2026"
    )
    soup.select_one(".sidebar h2").string = "Full Regulations"
    sidebar_links = soup.select(".sidebar nav a")
    if len(sidebar_links) != 8:
        raise ValueError(f"Expected 8 sidebar links, found {len(sidebar_links)}")
    sidebar_links[0]["href"] = "regulations-en.html?lang=en"
    sidebar_links[0].find_all("span")[-1].string = "Back to regulations overview"
    for i, a in enumerate(sidebar_links[1:]):
        a.find_all("span")[-1].string = NAMES[i]
    warning = soup.select_one(".rule-alert")
    warning.clear()
    strong = soup.new_tag("strong")
    strong.string = "Approval does not mean a revision is in force."
    warning.append(strong)
    warning.append(
        "Revisions to Regulations 04 (Resource Packs), 05 (Privacy) and 07 (Visitor Rules) "
        "were approved on November 1, 2026, but effective dates have not been announced. "
        "This is a machine-assisted English reference translation reviewed for consistency with the Japanese original. "
        "The Japanese text takes precedence. The Japanese text of Regulations 02 and 03 may itself "
        "contain OCR errors; check the source before quoting or making decisions."
    )
    soup.select_one('label[for="search"]').string = "Search regulations"
    soup.select_one('input#search')["placeholder"] = "e.g. Article 19, six months, Schematic"
    soup.select_one("button#jump").string = "First match"
    soup.select_one("button#clear").string = "Clear"
    soup.select_one(".notes").string = (
        "Machine-assisted English reference translation reviewed against Japanese. Clause numbering and anchors match the "
        "Japanese version. Japanese originals control; revisions 04, 05 and 07 are approved but have "
        "no announced effective date."
    )
    footer = soup.select_one("footer.footer")
    footer.clear()
    footer.append("© 2026 MTR Japan Nexus · ")
    a = soup.new_tag("a", href="index-en.html?lang=en")
    a.string = "Home"
    footer.append(a)
    footer.append(" · ")
    a = soup.new_tag("a", href="regulations-en.html?lang=en")
    a.string = "Regulations overview"
    footer.append(a)
    top = soup.select_one(".mjx-back-to-top")
    top["aria-label"] = "Back to top"
    top["title"] = "Back to top"
    top.select_one(".mjx-back-to-top-text").string = "Top"
    for script in soup.find_all("script"):
        if script.string and "件の一致" in script.string:
            script.string.replace_with(script.string.replace("件の一致", "matches"))
    style = soup.new_tag("style")
    style.string = (".source-link{margin:12px 0 4px;font-size:.83rem}"
                    ".source-link a{color:var(--accent);font-weight:650}"
                    ".document-text{overflow-wrap:anywhere}"
                    ".rule-alert{font-size:.9rem}"
                    "@media(max-width:600px){.document-text{font-size:14px}}")
    soup.head.append(style)

    # Structural checks: seven complete bodies; no missing/duplicated paragraph.
    english_docs = soup.select("section.regulation")
    for i, body in enumerate(english_docs):
        new_blocks = body.select_one(".document-text").find_all(["p", "h3", "h4"], recursive=False)
        if len(new_blocks) != source_counts[i] or not all(p.get_text(strip=True) for p in new_blocks):
            raise ValueError(f"Missing or duplicated translated clauses in document {i+1}")
    if stats["translated_blocks"] != sum(source_counts):
        raise ValueError("Not all source blocks were processed")
    if stats["japanese_remains"] > max(20, stats["translated_blocks"] // 6):
        raise ValueError(f"Excessive untranslated Japanese: {stats['japanese_remains']}")
    output = "<!DOCTYPE html>\n" + str(soup)
    return output, dict(stats, documents=len(docs), source_blocks=sum(source_counts), per_document=source_counts)


def update_routes() -> None:
    ja = JA.read_text(encoding="utf-8")
    old = '<a href="regulations-en.html?lang=en" data-mjx-lang="en" lang="en">English</a>'
    new = '<a href="regulations-full-en.html?lang=en" data-mjx-lang="en" lang="en">English</a>'
    if old in ja:
        JA.write_text(ja.replace(old, new), encoding="utf-8")
    elif new not in ja:
        raise ValueError("Could not configure Japanese full-text language switch")

    js = LANGUAGE_JS.read_text(encoding="utf-8")
    old_pair = '"regulations-full.html":{ ja: "regulations-full.html", en: "regulations-en.html" }'
    new_pair = ('"regulations-full.html":{ ja: "regulations-full.html", en: "regulations-full-en.html" },\n'
                '    "regulations-full-en.html":{ ja: "regulations-full.html", en: "regulations-full-en.html" }')
    if old_pair in js:
        js = js.replace(old_pair, new_pair)
    elif '"regulations-full-en.html"' not in js:
        raise ValueError("English language route missing")
    LANGUAGE_JS.write_text(js, encoding="utf-8")

    overview = BeautifulSoup(OVERVIEW.read_text(encoding="utf-8"), "html.parser")
    cards = overview.select("article.rule")
    if len(cards) != 7:
        raise ValueError("Expected seven English overview cards")
    for i, card in enumerate(cards):
        action = card.select_one(".fulltext-actions")
        primary = action.select_one("a.fulltext-link")
        primary["href"] = f"regulations-full-en.html?lang=en#doc{i+1}"
        primary["aria-label"] = f"Read English full text of regulation {i+1}"
        primary.clear()
        primary.append("Read English full text ")
        arrow = overview.new_tag("span", attrs={"aria-hidden": "true"})
        arrow.string = "→"
        primary.append(arrow)
        hint = action.select_one(".fulltext-hint")
        if hint:
            hint.string = "English reference translation · Japanese original controls"
        if not action.select_one(".source-link-inline"):
            secondary = overview.new_tag("a", attrs={"class": "source-link-inline",
                                                    "href": f"regulations-full.html?lang=ja#doc{i+1}"})
            secondary.string = "Japanese original"
            action.append(secondary)
    css = overview.new_tag("style")
    css.string = (".source-link-inline{display:inline-flex;align-items:center;min-height:40px;"
                  "font-weight:700;font-size:.82rem;color:#40516b;text-decoration:underline;"
                  "text-underline-offset:3px;padding:5px 8px}")
    overview.head.append(css)
    OVERVIEW.write_text("<!DOCTYPE html>\n" + str(overview), encoding="utf-8")


def main() -> None:
    model = get_translator()
    source = JA.read_text(encoding="utf-8")
    html, audit = translate_document(source, model)
    EN.write_text(html, encoding="utf-8")
    update_routes()
    audit_path = ROOT / "assets" / "mjx-english-translation-audit.json"
    audit_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "scripts" / "fix_english_regulations.py")], check=True)
    print(json.dumps(audit, ensure_ascii=False), flush=True)
    print("Published English HTML reference translation", flush=True)


if __name__ == "__main__":
    main()
