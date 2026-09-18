#!/usr/bin/env python3
"""Generate the portrait sizes the design serves, from a full-resolution source.

Run once and commit the outputs; build.py never touches images.

    python3 design/tools/portrait.py /path/to/me.jpeg

Requires Pillow. Crops to 4:5 using the same window the site's CSS used to
show (the right-of-centre part of the landscape original), then writes a 1x and
a 2x JPEG into design/assets/. Colour profile and EXIF data are dropped.
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install Pillow")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
WIDTHS = (560, 1120)
ASPECT = (4, 5)
WINDOW = (0.30, 0.90)  # horizontal share of the source that matches the site's framing
QUALITY = 74


def crop_portrait(image):
    width, height = image.size
    left, right = int(width * WINDOW[0]), int(width * WINDOW[1])
    target_w = min(right - left, height * ASPECT[0] // ASPECT[1])
    target_h = target_w * ASPECT[1] // ASPECT[0]
    offset = left + (right - left - target_w) // 2
    top = (height - target_h) // 2
    return image.crop((offset, top, offset + target_w, top + target_h))


def main(source):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
    portrait = crop_portrait(image)
    for width in WIDTHS:
        resized = portrait.resize((width, width * ASPECT[1] // ASPECT[0]), Image.LANCZOS)
        path = OUT / f"peng-wu-{width}.jpg"
        resized.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        print(f"{path.relative_to(ROOT)}  {resized.size[0]}x{resized.size[1]}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
