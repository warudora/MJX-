"""Apply audited English overrides and catch broken machine translations."""
from __future__ import annotations
import json
import re
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ENG = ROOT / "regulations-full-en.html"
OVERVIEW = ROOT / "regulations-en.html"
FIXES = ROOT / "assets" / "mjx-english-corrections.json"
AUDIT = ROOT / "assets" / "mjx-english-translation-audit.json"
JA = ROOT / "regulations-full.html"
JAPANESE = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")
BAD_CONTENT = re.compile(
    r"\bthis website uses cookies to improve your browsing experience\b"
    r"|\bplease subscribe\b|\bcookie policy\b", re.I
)
SUSPECT = re.compile(r"[\ufffd]|â€™|ï¿½|\bundefined\b|\bNaN\b", re.I)


def apply_fixes() -> None:
    source = ENG.read_text(encoding="utf-8")
    # Old renderer prepended a second doctype on top of the source's doctype.
    source = re.sub(r"^(?:\s*<!doctype html>\s*)+", "<!DOCTYPE html>\n", source, flags=re.I)
    soup = BeautifulSoup(source, "html.parser")
    blocks = soup.select("[data-ja-source]")
    source_blocks = BeautifulSoup(JA.read_text(encoding="utf-8"), "html.parser")
    japanese = [n.get_text(strip=True) for n in source_blocks.select(".document-text > p, .document-text > h3, .document-text > h4")]
    if len(blocks) != len(japanese) or len(blocks) != 792:
        raise ValueError(f"Expected 792 bilingual blocks: EN={len(blocks)}, JA={len(japanese)}")
    for i, (block, text) in enumerate(zip(blocks, japanese)):
        if block.get("data-ja-source") != text:
            raise ValueError(f"Japanese source mismatch for English block {i}")
    fixes = json.loads(FIXES.read_text(encoding="utf-8"))
    for index, change in fixes.items():
        i = int(index)
        if i < 0 or i >= len(blocks):
            raise ValueError(f"Unknown translation block {i}")
        node = blocks[i]
        if node.get("data-ja-source") != change["source"]:
            raise ValueError(f"Reference source has changed at block {i}")
        new = change["english"]
        if not new or JAPANESE.search(new):
            raise ValueError(f"Invalid English correction at block {i}")
        node.string = new
    problem = [(i, b.get_text(" ", strip=True)[:100]) for i, b in enumerate(blocks)
               if JAPANESE.search(b.get_text(" ", strip=True)) or SUSPECT.search(b.get_text(" ", strip=True))
               or BAD_CONTENT.search(b.get_text(" ", strip=True))]
    if problem:
        raise ValueError(f"Untranslated or suspicious output still remains: {problem[:12]}")
    if "must not be less than 1,000G" not in blocks[652].get_text():
        raise ValueError("Minimum wage meaning inverted")
    if "must not exceed 10,000G" not in blocks[654].get_text():
        raise ValueError("Maximum wage meaning inverted")
    if "obstructing" not in blocks[231].get_text():
        raise ValueError("Builder prohibitions mis-translated")
    # Table-of-contents labels must exactly match translated headings in the document.
    for section in soup.select("section.regulation"):
        for link in section.select(".doc-toc a[href^='#']"):
            target = soup.find(id=link["href"][1:])
            if target is None:
                raise ValueError(f"Broken heading link {link['href']}")
            link.string = target.get_text(strip=True)
    fixed = "<!DOCTYPE html>\n" + str(soup)
    ENG.write_text(fixed, encoding="utf-8")

    en_overview = OVERVIEW.read_text(encoding="utf-8")
    en_overview = re.sub(r"^(?:\s*<!doctype html>\s*)+", "<!DOCTYPE html>\n", en_overview, flags=re.I)
    OVERVIEW.write_text(en_overview, encoding="utf-8")

    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    audit["corrected_blocks"] = len(fixes)
    audit["japanese_visible_after_review"] = 0
    audit["manual_translation_status"] = "Targeted corrections; remainder unreviewed machine translation"
    AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Audited {len(blocks)} clauses, corrected {len(fixes)}, checked structural integrity")


if __name__ == "__main__":
    apply_fixes()
