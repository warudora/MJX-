"""Render web icons and social preview from MJX SVG source."""
from pathlib import Path
from xml.etree import ElementTree as ET
from io import BytesIO
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
SVG = ASSETS / "mjx-logo.svg"

def gradient() -> str:
    return ('<defs><radialGradient id="bg" cx="50%" cy="49%" r="83%">'
            '<stop offset="0" stop-color="#b3114d"/>'
            '<stop offset="0.68" stop-color="#b30f4d"/>'
            '<stop offset="1" stop-color="#a7224e"/>'
            '</radialGradient></defs>')

def render_png(svg: str, width: int, height: int, destination: Path) -> None:
    raw = cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                           output_width=width, output_height=height)
    with Image.open(BytesIO(raw)) as image:
        image.convert("RGB").save(destination, optimize=True)

def main() -> None:
    tree = ET.parse(SVG)
    paths = tree.findall("{http://www.w3.org/2000/svg}path")
    if len(paths) != 2:
        raise ValueError("Expected official logo mark and wordmark paths")
    mark = paths[0].attrib["d"]
    word = paths[1].attrib["d"]
    icon = (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="512" height="512" viewBox="306 248 636 636">'
            f'{gradient()}<rect x="306" y="248" width="636" height="636" '
            f'fill="url(#bg)"/><path fill="white" fill-rule="evenodd" '
            f'd="{mark}"/></svg>')
    (ASSETS / "mjx-mark.svg").write_text(icon, encoding="utf-8")
    for px in (32, 180, 192, 512):
        name = {32: "favicon-32.png", 180: "apple-touch-icon.png",
                192: "mjx-icon-192.png", 512: "mjx-icon-512.png"}[px]
        render_png(icon, px, px, ASSETS / name)
    with Image.open(ASSETS / "mjx-icon-512.png") as large:
        large.save(ROOT / "favicon.ico", format="ICO",
                   sizes=((16, 16), (32, 32), (48, 48)))
    social = (f'<svg xmlns="http://www.w3.org/2000/svg" '
              f'width="1200" height="630" viewBox="0 0 1200 630">'
              f'{gradient()}<rect width="1200" height="630" fill="url(#bg)"/>'
              f'<g transform="translate(68 72) scale(.80) translate(-350 -290)">'
              f'<path fill="white" fill-rule="evenodd" d="{mark}"/></g>'
              f'<g transform="translate(575 285) scale(.62) translate(-174 -895)">'
              f'<path fill="white" fill-rule="evenodd" d="{word}"/></g></svg>')
    render_png(social, 1200, 630, ASSETS / "og-mjx.png")
    expected = ("mjx-mark.svg", "favicon-32.png", "apple-touch-icon.png",
                "mjx-icon-192.png", "mjx-icon-512.png", "og-mjx.png")
    for filename in expected:
        if not (ASSETS / filename).is_file():
            raise ValueError(f"Missing asset: {filename}")
    with Image.open(ASSETS / "og-mjx.png") as preview:
        assert preview.size == (1200, 630)
    with Image.open(ASSETS / "apple-touch-icon.png") as touch:
        assert touch.size == (180, 180)
    print("Created MJX favicon, touch icons, app icons and OG preview")

if __name__ == "__main__":
    main()
