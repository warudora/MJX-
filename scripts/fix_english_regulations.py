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
    if len(blocks) != len(japanese):
        raise ValueError(f"Bilingual block count mismatch: EN={len(blocks)}, JA={len(japanese)}")
    for i, (block, text) in enumerate(zip(blocks, japanese)):
        if block.get("data-ja-source") != text:
            raise ValueError(f"Japanese source mismatch for English block {i}")
    fixes = json.loads(FIXES.read_text(encoding="utf-8"))
    if len(fixes) != len(blocks):
        raise ValueError(f"Expected a reviewed English override for every clause: {len(fixes)}/{len(blocks)}")
    if set(fixes) != {str(i) for i in range(len(blocks))}:
        raise ValueError("Correction indices must be a complete 0-based sequence")
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
    tests = {
        "YouTube publication does not grant permission": (11, "Public availability on YouTube does not mean"),
        "Cinema access-restriction bypass": (16, "Circumventing access restrictions"),
        "Server overload prohibited": (149, "not to place an excessive load"),
        "No immediate revocation for silence": (243, "must not be revoked immediately"),
        "Public-price floor": (591, "must not offer goods or services"),
        "Work duration is three hours, not three minutes": (675, "no more than 3 hours"),
        "Supreme Administrator's rights are preserved": (737, "not restricted by these Regulations"),
        "Labor is distinct from employment": (548, '"Labor"'),
        "Wage chapter names labor rather than contracts": (642, "Wages and Labor"),
        "Privacy third-party disclosure follows lawful grounds": (485, "based on applicable law"),
        "Priority holdings require approved areas and development purpose": (162, "development purpose"),
        "Builder decisions are made by authorized management": (153, "Routine decisions concerning Builders"),
        "Approved housing scheme uses twelve months": (609, "12 months"),
        "Six months after leaving remains retention period": (476, "six months"),
        "Supreme Administrator may grant exemptions": (90, "may waive the application"),
        "Builder infrastructure work includes development": (127, "development and upkeep of railway"),
        "Builder development is an effort duty": (133, "make reasonable efforts"),
        "Priority holder effort duty": (166, "must make reasonable efforts"),
        "Required owner signage": (177, "must install signs"),
        "Building and display prohibitions preserved": (232, "Buildings, displays, or activities"),
        "Work disputes not limited to contracts": (292, "Schematics, work, or similar matters"),
        "Specific reasons without an added publication condition": (357, "on specific grounds"),
        "Builder labor is distinct from employment": (553, "housing, labor, and other"),
        "Visitor labor is distinct from employment": (563, "engage in labor"),
        "Monopoly is not automatically prohibited": (706, "not, in itself, automatically prohibited"),
    }
    for name, (position, expected) in tests.items():
        if expected not in blocks[position].get_text():
            raise ValueError(f"Semantic invariant failed: {name}")
    # Japanese punctuation in visible English usually signals a broken model output.
    stray = [(i, block.get_text(" ", strip=True)[:80]) for i, block in enumerate(blocks)
             if re.search(r"[。、]", block.get_text(" ", strip=True))]
    if stray:
        raise ValueError(f"Japanese punctuation in English text: {stray[:10]}")
    if "must not be less than 1,000G" not in blocks[653].get_text():
        raise ValueError("Minimum wage meaning inverted")
    if "must not exceed 10,000G" not in blocks[655].get_text():
        raise ValueError("Maximum wage meaning inverted")
    if "obstructing" not in blocks[232].get_text():
        raise ValueError("Builder prohibitions mis-translated")
    # Table-of-contents labels must exactly match translated headings in the document.
    for section in soup.select("section.regulation"):
        for link in section.select(".doc-toc a[href^='#']"):
            target = soup.find(id=link["href"][1:])
            if target is None:
                raise ValueError(f"Broken heading link {link['href']}")
            link.string = target.get_text(strip=True)
    fixed = re.sub(r"^(?:\s*<!doctype html>\s*)+", "<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + str(soup), flags=re.I)
    ENG.write_text(fixed, encoding="utf-8")

    en_overview = OVERVIEW.read_text(encoding="utf-8")
    en_overview = re.sub(r"^(?:\s*<!doctype html>\s*)+", "<!DOCTYPE html>\n", en_overview, flags=re.I)
    OVERVIEW.write_text(en_overview, encoding="utf-8")

    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    audit["corrected_blocks"] = len(fixes)
    audit["japanese_visible_after_review"] = 0
    audit["manual_translation_status"] = "Reviewed and corrected against the Japanese source; Japanese original governs"
    AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Audited {len(blocks)} clauses, corrected {len(fixes)}, checked structural integrity")


if __name__ == "__main__":
    apply_fixes()
