"""Use the user's complete MJX logo image; never redraw or crop its content."""
import base64
import hashlib
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE_FOLDER = ASSETS / "original-logo"
SOURCE_PARTS = ("source-0.b64.txt", "source-1.b64.txt")
EXPECTED_SHA256 = "e13ec235551c1044a638ed7f9bfa2d67288de7160b6f0ff48ae39695b29d4136"


def load_logo() -> Image.Image:
    encoded = "".join((SOURCE_FOLDER / part).read_text(encoding="ascii").strip()
                      for part in SOURCE_PARTS)
    payload = base64.b64decode(encoded, validate=True)
    if hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise ValueError("MJX logo source checksum mismatch")
    with Image.open(BytesIO(payload)) as picture:
        if picture.size != (512, 512):
            raise ValueError(f"Unexpected MJX logo size: {picture.size}")
        return picture.convert("RGB")


def save_scaled(original: Image.Image, size: int, name: str) -> None:
    resized = original.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(ASSETS / name, format="PNG", optimize=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    logo = load_logo()

    # The whole square image is used, including the background and wordmark.
    # Resolution changes only: no cropping, text replacement or redrawing.
    save_scaled(logo, 512, "mjx-logo-original.png")
    save_scaled(logo, 512, "og-mjx.png")
    for pixels, filename in (
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "mjx-icon-192.png"),
        (512, "mjx-icon-512.png"),
    ):
        save_scaled(logo, pixels, filename)
    logo.save(ROOT / "favicon.ico", format="ICO", sizes=((16, 16), (32, 32), (48, 48)))

    for filename, dimension in (
        ("mjx-logo-original.png", 512),
        ("og-mjx.png", 512),
        ("favicon-32.png", 32),
        ("apple-touch-icon.png", 180),
        ("mjx-icon-192.png", 192),
        ("mjx-icon-512.png", 512),
    ):
        path = ASSETS / filename
        if not path.is_file():
            raise ValueError(f"Missing generated image: {filename}")
        with Image.open(path) as verified:
            if verified.size != (dimension, dimension):
                raise ValueError(f"Unexpected dimensions: {filename}")
    print("Generated unchanged-composition MJX logo for all site icons")


if __name__ == "__main__":
    main()
