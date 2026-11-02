"""Fix short Japanese legal headings that Argos sometimes translates as blank."""
from pathlib import Path
import ast

script = Path(__file__).with_name("generate_english_regulations.py")
content = script.read_text(encoding="utf-8")
old = """        if not translated:
            raise ValueError(f"Empty translation: {text[:45]!r}")
        if JAPANESE.search(translated):"""
new = """        if not translated:
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
        if JAPANESE.search(translated):"""
if old in content:
    content = content.replace(old, new)
elif "legal_terms = {" not in content:
    raise ValueError("Source translation function no longer matches patch")
ast.parse(content)
script.write_text(content, encoding="utf-8")
print("Legal heading fallback and translation glossary enabled.")
