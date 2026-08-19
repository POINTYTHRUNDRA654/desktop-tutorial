"""
Stage 4: finalize.py — sharpening, noise reduction, and a contrast/color pass
on the already UV-locked result, then write to Output/ under the exact
original filename and resolution, in the original's real .dds compression
format (via texconv — see common.py's read_dds_format/png_to_dds).

Only the RGB channels are touched by the classical filters below — the alpha
channel is the one composite_lock.py already restored (original bytes inside
the mask, forced 0 outside it), and finalize.py re-attaches that same
untouched alpha after filtering, rather than risking it through another PIL
round-trip.

The finishing filters (median/unsharp/contrast/saturation) operate on the
whole canvas, including pixels stage 3 locked to the pristine original RGB
outside the mask — confirmed as a real bug against gsfunguscarnivorousplant04_d.dds
(2026-08-19: 6.8M of 9.7M unused-region pixels came out altered). So RGB is
re-composited against the same mask a second time here, after filtering,
using the real original pixels — the "no floating artifacts" guarantee has
to survive finalize.py's own filters, not just composite_lock.py's.

Usage: python finalize.py <input_dir> <uv_locked_dir> <mask_dir> <output_dir>
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

from common import list_input_textures, load_config, log, png_to_dds, read_dds_format

STAGE = "finalize"


def apply_finishing_pass(rgb: Image.Image, cfg: dict) -> Image.Image:
    out = rgb
    # Mild noise reduction first — sharpening after a median filter reads as
    # "crisp detail", sharpening before it just re-amplifies the noise.
    if cfg.get("noise_reduction_size", 0) > 1:
        out = out.filter(ImageFilter.MedianFilter(size=cfg["noise_reduction_size"]))
    if cfg.get("sharpen_amount", 0) > 0:
        out = out.filter(ImageFilter.UnsharpMask(
            radius=cfg.get("sharpen_radius", 2), percent=int(cfg["sharpen_amount"] * 100), threshold=cfg.get("sharpen_threshold", 3),
        ))
    if cfg.get("contrast", 1.0) != 1.0:
        out = ImageEnhance.Contrast(out).enhance(cfg["contrast"])
    if cfg.get("saturation", 1.0) != 1.0:
        out = ImageEnhance.Color(out).enhance(cfg["saturation"])
    return out


def main() -> int:
    if len(sys.argv) != 5:
        print("Usage: python finalize.py <input_dir> <uv_locked_dir> <mask_dir> <output_dir>")
        return 1
    input_dir = Path(sys.argv[1])
    locked_dir = Path(sys.argv[2])
    mask_dir = Path(sys.argv[3])
    output_dir = Path(sys.argv[4])
    output_dir.mkdir(parents=True, exist_ok=True)

    cfg = load_config()
    finishing_cfg = {
        "noise_reduction_size": cfg.get("finalize_noise_reduction_size", 3),
        "sharpen_amount": cfg.get("finalize_sharpen_amount", 0.5),
        "sharpen_radius": cfg.get("finalize_sharpen_radius", 1.5),
        "sharpen_threshold": cfg.get("finalize_sharpen_threshold", 3),
        "contrast": cfg.get("finalize_contrast", 1.05),
        "saturation": cfg.get("finalize_saturation", 1.0),
    }
    texconv_path = cfg["texconv_path"]

    originals = list_input_textures(input_dir)
    if not originals:
        log(STAGE, f"No textures found in {input_dir}.")
        return 1

    skipped: list[str] = []
    written = 0

    for orig_path in originals:
        stem = orig_path.stem
        locked_path = locked_dir / (stem + ".png")
        if not locked_path.exists():
            log(STAGE, f"SKIP {orig_path.name}: no UV-locked output found (composite_lock.py likely skipped or failed this file).")
            skipped.append(orig_path.name)
            continue

        locked = Image.open(locked_path).convert("RGBA")
        rgb, alpha = locked.convert("RGB"), locked.getchannel("A")

        finished_rgb = apply_finishing_pass(rgb, finishing_cfg)

        # Re-lock RGB against the real mask: filters run over the whole
        # canvas (they need surrounding context to look right at the edge),
        # but any pixel outside the mask must come out exactly as it went
        # in, matching composite_lock.py's own guarantee.
        mask_path = mask_dir / (stem + "_mask.png")
        if mask_path.exists():
            mask_img = Image.open(mask_path).convert("L")
            if mask_img.size != finished_rgb.size:
                mask_img = mask_img.resize(finished_rgb.size, Image.NEAREST)
            mask_bool = (np.asarray(mask_img, dtype=np.uint8) > 127)[:, :, None]
            finished_arr = np.asarray(finished_rgb, dtype=np.uint8)
            orig_arr = np.asarray(rgb, dtype=np.uint8)
            relocked_arr = np.where(mask_bool, finished_arr, orig_arr).astype(np.uint8)
            finished_rgb = Image.fromarray(relocked_arr, mode="RGB")
        else:
            log(STAGE, f"WARN {orig_path.name}: no mask found at {mask_path} — finishing pass applied unrestricted.")

        final = Image.merge("RGBA", (*finished_rgb.split(), alpha))  # alpha untouched by filters

        # Last guardrail before Output/, not trusting composite_lock blindly —
        # a real dimension mismatch here means something upstream is broken and
        # this file should NOT be silently written as if it were correct.
        original_size = Image.open(orig_path).size
        if final.size != original_size:
            log(STAGE, f"FAILED {orig_path.name}: dimension mismatch — original is {original_size}, finalized is {final.size}. Not writing to Output/.")
            skipped.append(orig_path.name)
            continue

        out_name = orig_path.name  # exact original filename, same extension
        out_path = output_dir / out_name

        if orig_path.suffix.lower() == ".dds":
            tmp_png = output_dir / (stem + "_tmp_finalize.png")
            final.save(tmp_png)
            fmt_info = read_dds_format(orig_path)
            ok, msg = png_to_dds(tmp_png, out_path, fmt_info, texconv_path)
            tmp_png.unlink(missing_ok=True)
            if not ok:
                log(STAGE, f"FAILED {orig_path.name}: {msg}")
                skipped.append(orig_path.name)
                continue
            log(STAGE, f"{orig_path.name} -> {out_path.name} ({msg})")
        else:
            final.save(out_path)
            log(STAGE, f"{orig_path.name} -> {out_path.name}")
        written += 1

    log(STAGE, f"Done. {written}/{len(originals)} written to {output_dir}, {len(skipped)} skipped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
