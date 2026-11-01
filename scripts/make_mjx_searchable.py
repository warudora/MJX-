"""Build searchable MJX PDF set without modifying visible legal text."""
from pathlib import Path
import subprocess
import tempfile
import fitz

ROOT = Path(__file__).resolve().parents[1]
COMBINED = ROOT / "MJX_all_seven_regulations_2026-11-01.pdf"
PARTS = ROOT / "regulations" / "fulltext"
FILENAMES = (
    "01-cinema-policy.pdf",
    "02-general-server-rules.pdf",
    "03-builder-regulations.pdf",
    "04-resource-pack-rules.pdf",
    "05-privacy-policy.pdf",
    "06-economic-regulations.pdf",
    "07-visitor-rules.pdf",
)
STARTS = (1, 5, 10, 21, 29, 35, 53)
ENDS = (4, 9, 20, 28, 34, 52, 55)
SCANNED = frozenset((*range(6, 10), *range(11, 21)))

def main() -> None:
    if not COMBINED.is_file():
        raise FileNotFoundError(COMBINED)
    with fitz.open(COMBINED) as pdf, tempfile.TemporaryDirectory(prefix="mjx_ocr_") as tmp:
        assert len(pdf) == 55, f"Expected 55 pages, found {len(pdf)}"
        scratch = Path(tmp)
        for number in range(1, 56):
            page = pdf[number - 1]
            if number in SCANNED:
                image_path = scratch / f"page_{number:02}.png"
                page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(image_path)
                output = scratch / f"page_{number:02}"
                command = [
                    "tesseract", str(image_path), str(output),
                    "-l", "jpn+eng", "--psm", "3",
                    "-c", "textonly_pdf=1", "pdf",
                ]
                process = subprocess.run(command, capture_output=True, text=True, timeout=90)
                if process.returncode:
                    raise RuntimeError(f"OCR page {number}: {process.stderr[:600]}")
                with fitz.open(str(output) + ".pdf") as layer:
                    if len(layer[0].get_text().strip()) < 100:
                        raise RuntimeError(f"Too little OCR text on page {number}")
                    page.show_pdf_page(page.rect, layer, 0, overlay=True)
            page.add_redact_annot(fitz.Rect(260, 795, 335, 825), fill=(1, 1, 1))
            page.apply_redactions(images=0, graphics=0, text=0)
            folio = f"{number} / 55"
            size = 9
            width = fitz.get_text_length(folio, fontname="helv", fontsize=size)
            page.insert_text(
                ((page.rect.width - width) / 2, 815), folio,
                fontsize=size, fontname="helv", color=(.26, .31, .4), overlay=True,
            )
        pdf.set_toc([
            [1, f"{i:02} {name.removesuffix('.pdf')}", start]
            for i, (name, start) in enumerate(zip(FILENAMES, STARTS), 1)
        ])
        pdf.set_metadata({
            **pdf.metadata,
            "title": "MJX Seven Regulations: Searchable 55-page edition",
            "subject": "Visible Japanese regulation text unchanged; OCR layer unproofread.",
        })
        final_path = scratch / "final.pdf"
        pdf.save(final_path, garbage=4, deflate=True)
        with fitz.open(final_path) as verified:
            assert len(verified) == 55
            assert len(verified.get_toc()) == 7
            for n in range(1, 56):
                text = verified[n - 1].get_text()
                assert text.count(f"{n} / 55") == 1, f"Folio error: {n}"
                if n in SCANNED:
                    assert len(text.strip()) >= 250, f"Missing OCR: {n}"
            for name, first, last in zip(FILENAMES, STARTS, ENDS):
                with fitz.open() as part:
                    part.insert_pdf(verified, from_page=first - 1, to_page=last - 1)
                    part.save(PARTS / name, garbage=4, deflate=True)
        COMBINED.write_bytes(final_path.read_bytes())
        print("Updated 55 pages, 14 OCR text layers, consistent folios.")

if __name__ == "__main__":
    main()
