"""
Stage 1: extract_uv_mask.py

For each texture in Input/, derive a binary "used" mask.

Real convention, confirmed against 6 of Billy's actual Glowing Sea source
textures before writing this (not assumed):
  - 5/6 had a completely flat, fully-opaque alpha channel (every pixel = 255).
    There is no per-pixel signal to extract there — the whole canvas genuinely
    is painted/used, so the mask is the full canvas (all-white). This isn't a
    fallback hack; it's the accurate answer for an opaque diffuse map.
  - 1/6 (gsfunguscarnivorousplant04_d.dds) had real alpha variation (134-255) —
    a genuine cutout silhouette (alpha-tested foliage-card style geometry).
    That IS used as the real mask.
  - No solid-color background convention was found in the RGB channels either
    (corner/center samples were all real painted content, not a placeholder fill).

So: alpha variation present -> that's the real mask. Alpha flat -> mask is the
full canvas. No other heuristic is applied — nothing here is guessed beyond
what was actually observed in real files.

Usage: python extract_uv_mask.py <input_dir> <output_dir>
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

from common import dds_to_pil, list_input_textures, log

STAGE = "extract_uv_mask"

# An alpha channel is treated as "flat" (no real signal) when its full range is
# smaller than this — real cutout alpha in practice swings from near-0 to 255,
# so a tiny range here means compression noise, not a genuine silhouette.
FLAT_ALPHA_RANGE_THRESHOLD = 8


def extract_mask(img: Image.Image) -> tuple[Image.Image, bool]:
    """Returns (mask, alpha_was_real). mask is a single-channel 'L' image,
    255 = used, 0 = unused."""
    alpha = img.getchannel("A")
    lo, hi = alpha.getextrema()
    if (hi - lo) < FLAT_ALPHA_RANGE_THRESHOLD:
        # Flat/opaque — the whole canvas is used. Real, not a placeholder guess.
        mask = Image.new("L", img.size, 255)
        return mask, False
    # Real alpha variation — threshold at the midpoint between observed extremes
    # rather than a hardcoded 127, so a cutout texture whose "on" value isn't
    # exactly 255 (compression artifacts) still gets a clean binary mask.
    threshold = (lo + hi) // 2
    mask = alpha.point(lambda p: 255 if p > threshold else 0)
    return mask, True


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python extract_uv_mask.py <input_dir> <output_dir>")
        return 1
    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    files = list_input_textures(input_dir)
    if not files:
        log(STAGE, f"No textures found in {input_dir}.")
        return 1

    real_mask_count = 0
    for f in files:
        try:
            img = dds_to_pil(f) if f.suffix.lower() == ".dds" else Image.open(f).convert("RGBA")
        except Exception as e:
            log(STAGE, f"FAILED to read {f.name}: {e}")
            continue

        mask, alpha_real = extract_mask(img)
        out_path = output_dir / (f.stem + "_mask.png")
        mask.save(out_path)
        if alpha_real:
            real_mask_count += 1
            log(STAGE, f"{f.name}: real cutout alpha detected — mask saved ({out_path.name})")
        else:
            log(STAGE, f"{f.name}: flat/opaque alpha — full-canvas mask ({out_path.name})")

    log(STAGE, f"Done. {len(files)} texture(s) processed, {real_mask_count} had a real cutout mask.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
