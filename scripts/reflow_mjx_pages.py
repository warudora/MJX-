"""Rebalance the MJX economy and Visitor sections without changing wording."""
from collections import Counter
from pathlib import Path
import os
import re
import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'MJX_all_seven_regulations_2026-11-01.pdf'
# (source page number, source top, source bottom, destination top).
# Small source slices start below the previous page's header rule.
FRAGMENTS = {
    49: [(49, 55, 494, 70), (50, 63, 110, 519)],
    50: [(50, 110, 703, 70), (51, 63, 111, 671)],
    51: [(51, 137, 658, 70)],
    54: [(54, 57, 376, 70), (54, 375, 421, 397), (55, 60, 317, 452)],
    55: [(55, 315, 555, 75)],
}

def body_tokens(doc, numbers):
    """Check that legally relevant text has not been dropped or duplicated."""
    words = []
    for number in numbers:
        for block in doc[number - 1].get_text('blocks'):
            if block[6] != 0 or not (58 < block[1] and block[3] < 761):
                continue
            if 'OFFICIAL REGULATIONS' in block[4] or 'Approved document set' in block[4]:
                continue
            words.extend(re.findall(r'[^\W_]+', block[4]))
    return Counter(words)

def reflow(source):
    if len(source) != 55:
        raise ValueError('Expected exactly 55 pages')
    revised = fitz.open()
    for number in range(1, 56):
        if number not in FRAGMENTS:
            revised.insert_pdf(source, from_page=number - 1, to_page=number - 1)
            continue
        page = revised.new_page(width=595.276, height=841.89)
        header = fitz.Rect(0, 0, 595.276, 56)
        page.show_pdf_page(header, source, 48, clip=header, keep_proportion=False)
        for source_number, y0, y1, target_y in FRAGMENTS[number]:
            clip = fitz.Rect(0, y0, 595.276, y1)
            rect = fitz.Rect(0, target_y, 595.276, target_y + y1 - y0)
            page.show_pdf_page(rect, source, source_number - 1, clip=clip, keep_proportion=False)
        if number == 55:
            # Copy the original complete bottom-right wordmark exactly once.
            logo = fitz.Rect(442, 666, 541, 762)
            page.show_pdf_page(logo, source, 54, clip=logo, keep_proportion=False)
        page.draw_line((43, 785.89), (552, 785.89), color=(.86, .89, .92), width=.65)
        page.insert_text(
            (43, 803.89), 'MJX  |  Approved document set 2026.11.01',
            fontname='helv', fontsize=7.2, color=(.42, .45, .52)
        )
        folio = f'{number} / 55'
        x = (page.rect.width - fitz.get_text_length(folio, fontname='helv', fontsize=9)) / 2
        page.insert_text((x, 815), folio, fontsize=9, fontname='helv', color=(.26, .31, .4))
    revised.set_toc(source.get_toc())
    revised.set_metadata(source.metadata)
    for group in ((49, 50, 51), (54, 55)):
        if body_tokens(source, group) != body_tokens(revised, group):
            raise ValueError(f'Text was lost or duplicated in pages {group}')
    for number in FRAGMENTS:
        text = revised[number - 1].get_text()
        if text.count(f'{number} / 55') != 1:
            raise ValueError(f'Page number is inconsistent on {number}')
    return revised

def main():
    with fitz.open(PDF) as source:
        with reflow(source) as updated:
            temporary = PDF.with_name(PDF.name + '.reflow.tmp')
            updated.save(temporary, garbage=4, deflate=True)
    os.replace(temporary, PDF)
    print('Rebalanced pages 49-51 and 54-55 without altering source text.')

if __name__ == '__main__':
    main()
