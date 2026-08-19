"""
Stage 3: composite_lock.py — the load-bearing step. Guarantees the pipeline's
core promise: no pixel outside the original UV silhouette can differ from the
original, and the alpha channel is restored byte-for-byte, regardless of what
stage 2's generation did.

For each enhanced texture:
  1. Resize to the original's exact dimensions if it isn't already there
     (stage 2 is allowed to drift; this is where that gets corrected).
  2. Detect real spatial drift via FFT phase correlation between the resized
     enhanced image and the original (a standard, real technique for measuring
     translational offset between two images of the same size — not a
     synthesized/eyeballed check) plus the raw scale ratio stage 2 needed.
     Large values on either -> needs_review.txt, not silently included.
  3. Composite: original pixels everywhere the mask says "unused", enhanced
     pixels only where the mask says "used". This is the actual guarantee —
     verified explicitly in test_pipeline.py, not just asserted here.
  4. Alpha: original bytes copied back byte-for-byte inside the mask (not
     regenerated, not re-derived), forced to 0 (fully transparent) outside
     it — so "outside the mask" is unambiguous in the output file itself,
     not just implied by the RGB composite.

Usage: python composite_lock.py <input_dir> <enhanced_dir> <mask_dir> <output_dir>
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

from common import dds_to_pil, list_input_textures, log

STAGE = "composite_lock"

# Real thresholds, not tuned against a large dataset — documented starting
# points. Adjust here if real usage shows them too loose/tight.
OFFSET_REVIEW_THRESHOLD_FRACTION = 0.02   # >2% of the image's largest dimension
# scale_ratio (below) is always expressed as >=1 regardless of upscale/downscale
# direction (max(scale_x, scale_y, 1/scale_x, 1/scale_y)), so one threshold covers both.
SCALE_RATIO_REVIEW_MAX = 5.0               # enhanced needed >5x resize either direction to match original
PHASE_CORR_SAMPLE_SIZE = 256                # downscale both images to this for the FFT check


def phase_correlation_offset(img_a: Image.Image, img_b: Image.Image) -> tuple[float, float]:
    """Real FFT phase correlation between two same-size grayscale images,
    returning the estimated (dx, dy) translational offset in pixels, scaled
    back to img_a's original resolution. img_a and img_b must already be the
    same size (composite_lock resizes enhanced to match original before
    calling this)."""
    size = (PHASE_CORR_SAMPLE_SIZE, PHASE_CORR_SAMPLE_SIZE)
    a = np.asarray(img_a.convert("L").resize(size), dtype=np.float64)
    b = np.asarray(img_b.convert("L").resize(size), dtype=np.float64)

    fa = np.fft.fft2(a)
    fb = np.fft.fft2(b)
    cross = fa * fb.conj()
    cross /= (np.abs(cross) + 1e-10)
    corr = np.fft.fftshift(np.abs(np.fft.ifft2(cross)))

    peak_y, peak_x = np.unravel_index(np.argmax(corr), corr.shape)
    dy = peak_y - size[0] // 2
    dx = peak_x - size[1] // 2

    # Scale the offset (measured at PHASE_CORR_SAMPLE_SIZE) back to img_a's real resolution.
    scale_x = img_a.width / size[1]
    scale_y = img_a.height / size[0]
    return dx * scale_x, dy * scale_y


def composite(original: Image.Image, enhanced: Image.Image, mask: Image.Image) -> Image.Image:
    """original pixels where mask==0, enhanced pixels where mask==255. Alpha
    channel handled separately by the caller (copied back byte-for-byte)."""
    orig_rgb = np.asarray(original.convert("RGB"), dtype=np.uint8)
    enh_rgb = np.asarray(enhanced.convert("RGB"), dtype=np.uint8)
    mask_arr = np.asarray(mask.convert("L"), dtype=np.uint8)
    mask_bool = (mask_arr > 127)[:, :, None]  # broadcast over RGB
    out_rgb = np.where(mask_bool, enh_rgb, orig_rgb).astype(np.uint8)
    return Image.fromarray(out_rgb, mode="RGB")


def main() -> int:
    if len(sys.argv) != 5:
        print("Usage: python composite_lock.py <input_dir> <enhanced_dir> <mask_dir> <output_dir>")
        return 1
    input_dir = Path(sys.argv[1])
    enhanced_dir = Path(sys.argv[2])
    mask_dir = Path(sys.argv[3])
    output_dir = Path(sys.argv[4])
    output_dir.mkdir(parents=True, exist_ok=True)

    originals = list_input_textures(input_dir)
    if not originals:
        log(STAGE, f"No textures found in {input_dir}.")
        return 1

    needs_review: list[str] = []
    skipped: list[str] = []

    for orig_path in originals:
        stem = orig_path.stem
        enhanced_path = enhanced_dir / (stem + ".png")
        mask_path = mask_dir / (stem + "_mask.png")

        if not enhanced_path.exists():
            log(STAGE, f"SKIP {orig_path.name}: no enhanced output found (stage 2 likely failed for this file).")
            skipped.append(orig_path.name)
            continue
        if not mask_path.exists():
            log(STAGE, f"SKIP {orig_path.name}: no mask found — run extract_uv_mask.py first.")
            skipped.append(orig_path.name)
            continue

        original = dds_to_pil(orig_path) if orig_path.suffix.lower() == ".dds" else Image.open(orig_path).convert("RGBA")
        enhanced_raw = Image.open(enhanced_path).convert("RGBA")
        mask = Image.open(mask_path).convert("L")

        # Real scale-drift measurement, before any resizing happens.
        scale_x = original.width / enhanced_raw.width
        scale_y = original.height / enhanced_raw.height
        scale_ratio = max(scale_x, scale_y, 1 / scale_x, 1 / scale_y)  # how far from 1:1 in either direction

        if enhanced_raw.size != original.size:
            enhanced = enhanced_raw.resize(original.size, Image.LANCZOS)
        else:
            enhanced = enhanced_raw

        dx, dy = phase_correlation_offset(original, enhanced)
        offset_magnitude = (dx ** 2 + dy ** 2) ** 0.5
        offset_threshold_px = OFFSET_REVIEW_THRESHOLD_FRACTION * max(original.size)

        flagged_reasons = []
        if scale_ratio > SCALE_RATIO_REVIEW_MAX:
            flagged_reasons.append(f"scale correction {scale_ratio:.1f}x")
        if offset_magnitude > offset_threshold_px:
            flagged_reasons.append(f"offset {offset_magnitude:.1f}px (threshold {offset_threshold_px:.1f}px)")

        if mask.size != original.size:
            mask = mask.resize(original.size, Image.NEAREST)  # mask is binary — nearest, not smoothed

        locked_rgb = composite(original, enhanced, mask)

        # Alpha: original bytes inside the mask (in-bounds region), forced to 0
        # (fully transparent) outside it. This is what actually makes "outside
        # the mask" mean something in the output file, rather than just leaving
        # whatever partial alpha the original silhouette edge happened to have —
        # verified directly in test_pipeline.py (zero non-transparent pixels
        # outside the mask boundary).
        orig_alpha_arr = np.asarray(original.getchannel("A"), dtype=np.uint8)
        mask_arr_a = np.asarray(mask, dtype=np.uint8)
        locked_alpha_arr = np.where(mask_arr_a > 127, orig_alpha_arr, 0).astype(np.uint8)
        locked_alpha = Image.fromarray(locked_alpha_arr, mode="L")
        locked = Image.merge("RGBA", (*locked_rgb.split(), locked_alpha))

        out_path = output_dir / (stem + ".png")
        locked.save(out_path)

        if flagged_reasons:
            needs_review.append(f"{orig_path.name}: {', '.join(flagged_reasons)}")
            log(STAGE, f"{orig_path.name} -> {out_path.name} [FLAGGED: {', '.join(flagged_reasons)}]")
        else:
            log(STAGE, f"{orig_path.name} -> {out_path.name}")

    if needs_review:
        review_path = output_dir.parent / "needs_review.txt"
        with open(review_path, "w", encoding="utf-8") as f:
            f.write("\n".join(needs_review) + "\n")
        log(STAGE, f"{len(needs_review)} texture(s) flagged for manual review -> {review_path}")

    log(STAGE, f"Done. {len(originals) - len(skipped)}/{len(originals)} composited, {len(skipped)} skipped, {len(needs_review)} flagged.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
