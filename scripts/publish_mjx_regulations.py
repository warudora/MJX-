from pathlib import Path
import base64, json, zlib, re
import fitz

DATA = "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"
NAMES = ("01-cinema-policy.pdf","02-general-server-rules.pdf","03-builder-regulations.pdf","04-resource-pack-rules.pdf","05-privacy-policy.pdf","06-economic-regulations.pdf","07-visitor-rules.pdf")
START = (1,5,10,21,29,35,53)
ENDS = (4,9,20,28,34,52,55)
COVERS = {1:1,5:4,10:9,21:19,29:26,35:31,53:48}

def publish():
    root = Path(__file__).resolve().parents[1]
    directory = root / "regulations" / "fulltext"
    original_archive = root / "regulations" / "source-original"
    original = fitz.open()
    for name in NAMES:
        with fitz.open(original_archive / name) as part:
            original.insert_pdf(part)
    if len(original) != 50:
        raise ValueError("Expected 50 source pages")
    logo_png = original[7].get_pixmap(matrix=fitz.Matrix(2,2), clip=fitz.Rect(350,630,550,790), alpha=False).tobytes("png")
    if logo_png[:4] != bytes((137,80,78,71)):
        raise ValueError("Could not render complete logo")
    data = json.loads(zlib.decompress(base64.b64decode(DATA)))
    units = {}
    for doc,src,sy0,sy1,dest,dy0,dy1 in data:
        units.setdefault(dest, []).append([src,float(sy0),float(sy1),float(dy0),float(dy1)])
    title = units[12].pop()
    if title[:3] != [11,373.0,445.0]: raise ValueError("Builder page boundary changed")
    units[13].insert(0,title)
    if units[37][-2][:3] != [33,345.0,434.0] or units[37][-1][:3] != [33,450.0,548.0]:
        raise ValueError("Economic page boundary changed")
    article4 = units[37][-1]
    units[37] = units[37][:-2] + [[33,345.0,398.0,0,0]]
    units[38] = [[33,398.0,434.0,0,0],article4] + units[38]
    output = fitz.open()
    for num in range(1,56):
        if num in COVERS:
            source_id = COVERS[num]-1
            output.insert_pdf(original,from_page=source_id,to_page=source_id)
            continue
        page = output.new_page(width=595.276,height=841.89)
        page.draw_line((43,58),(552,58),color=(.83,.86,.90),width=.8)
        page.insert_text((43,42),"MTR JAPAN NEXUS   /   OFFICIAL REGULATIONS",fontname="hebo",fontsize=8,color=(.705,0,.337))
        page.draw_line((43,785.89),(552,785.89),color=(.86,.89,.92),width=.65)
        page.insert_text((43,803.89),"MJX  |  Approved document set 2026.11.01",fontname="helv",fontsize=7.2,color=(.42,.45,.52))
        items = units.get(num)
        if not items: raise ValueError(f"No chunks for page {num}")
        if num in (12,13,37,38):
            y,last=70.0,None
            for item in items:
                if last is not None:
                    y += max(3.0,min(12.0,item[1]-last[2])) if item[0] == last[0] else 6.0
                h=item[2]-item[1];item[3],item[4]=y,y+h;y+=h;last=item
            if y>=755: raise ValueError(f"Overflow on p{num}")
        for source_page,sy0,sy1,dy0,dy1 in items:
            page.show_pdf_page(fitz.Rect(0,dy0,595.276,dy1),original,source_page-1,
                               clip=fitz.Rect(0,sy0,595.0,sy1),keep_proportion=False)
        number=f"{num} / 55"
        x=(page.rect.width-fitz.get_text_length(number,fontname="helv",fontsize=7.8))/2
        page.insert_text((x,812),number,fontname="helv",fontsize=7.8,color=(.42,.47,.54))
        if num in ENDS and num not in (52, 55):
            # Pages 52 and 55 already contain the original logo; avoid a duplicate.
            page.insert_image(fitz.Rect(444,685,538,760),stream=logo_png,keep_proportion=True,overlay=True)
    output.set_toc([[1,f"{i:02d}  {NAMES[i-1][:-4]}",START[i-1]] for i in range(1,8)])
    output.save(root/"MJX_all_seven_regulations_2026-11-01.pdf",garbage=4,deflate=True)
    for name,first,last in zip(NAMES,START,ENDS):
        part=fitz.open()
        part.insert_pdf(output,from_page=first-1,to_page=last-1)
        part.save(directory/name,garbage=4,deflate=True)
        part.close()
    output.close()
    original.close()
    counts=[last-first+1 for first,last in zip(START,ENDS)]
    for fname,japanese in [("regulations.html",True),("regulations-en.html",False)]:
        path=root/fname
        html=path.read_text(encoding="utf-8")
        for i,count in enumerate(counts,1):
            start=html.index(f'<article class="rule" id="doc-{i:02d}"')
            end=html.index("</article>",start)
            card=html[start:end]
            if japanese:
                expr=r'(class="fulltext-hint">原文PDF\s*/\s*)\d+(ページ)'
            else:
                expr=r'(Japanese original\s*/\s*)\d+(\s*pages)'
            card,n=re.subn(expr,lambda m:m.group(1)+str(count)+m.group(2),card)
            if n!=1:raise ValueError(f"Page label missing: {fname}, {i}")
            if not japanese:
                card=re.sub(r'(document '+f"{i:02d}"+r' \()\d+( pages\))',
                            lambda m:m.group(1)+str(count)+m.group(2),card)
                # Updated full-set page ranges for the English metadata.
                ranges=[(1,4),(5,9),(10,20),(21,28),(29,34),(35,52),(53,55)]
                first,last=ranges[i-1]
                card=re.sub(r'Original PDF pages \d+[–-]\d+',
                            f'Updated set pages {first}–{last}',card)
            html=html[:start]+card+html[end:]
        path.write_text(html,encoding="utf-8")
    print("Published",counts,"pages",sum(counts))

if __name__=="__main__":
    publish()
