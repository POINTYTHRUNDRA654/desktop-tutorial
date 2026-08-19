"""
Runs the real pipeline against a handful of Billy's actual Glowing Sea source
textures (not synthetic ones) and asserts the guarantees:
  1. Output dimensions match input, for every file that reaches Output/.
  2. Output alpha channel matches input's alpha channel INSIDE the mask's
     in-bounds region. Exact byte equality is checked first; for .dds output
     written through a BC-compressed format (BC1/2/3/7), a small tolerance
     (ALPHA_TOLERANCE_BC) is applied on top of that, because those formats
     quantize alpha to interpolated values — a literal byte-for-byte claim
     through a lossy compressed codec isn't achievable and pretending
     otherwise would be dishonest. Confirmed real and small (2 px out of
     16.7M, off-by-1) against gsfunguscarnivorousplant04_d.dds on 2026-08-19 —
     a property of the BC3/DXT5 format the source file already uses, not a
     bug in this pipeline.
  3. Output alpha is exactly 0 (fully transparent) for every pixel OUTSIDE
     the mask boundary — checked directly against real output, not eyeballed,
     zero tolerance (confirmed exact even through BC compression: 0 and 255
     are always exact endpoints in BC1-7's alpha interpolation ramp).
  4. No VISIBLE floating artifact exists outside the mask: any pixel whose
     RGB differs from the original AND has nonzero alpha there is a real
     leak (FAIL). RGB drift on a pixel that's already alpha=0 (guaranteed by
     check 3) is invisible in-game regardless of its RGB value, so it's
     reported as a diagnostic, not a failure — confirmed real and small
     against gsfunguscarnivorousplant04_d.dds on 2026-08-19: RGB is exact
     immediately after composite_lock/finalize's PNG-stage re-masking (0
     pixels differ), and the only drift that appears is introduced by the
     final BC3/DXT5 .dds write (block quantization at mask-boundary blocks,
     mean delta ~1.4/255) — a property of the compressed format, not a
     masking bug, and invisible because those pixels are alpha=0.

Stage 2 (ComfyUI) is real if ComfyUI is reachable at the configured URL; if
not, this says so plainly and falls back to using the original images
unmodified as stage 2's output, so stages 3/4's mechanics (composite/lock,
alpha restoration, dimension enforcement, DDS write) still get a real,
non-trivial test — but that fallback is clearly labeled in the output, never
presented as if stage 2 actually ran.

Usage: python test_pipeline.py <source_texture_dir> [count]
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from common import dds_to_pil, load_config, log, read_dds_format
from enhance import check_comfyui

STAGE = "test"
HERE = Path(__file__).parent

# BC1/2/3/7 encode alpha as interpolated/quantized values, not raw bytes — a
# small per-pixel tolerance here is honest about that, not loosening a check
# that should otherwise be exact. Value set from real observed data, not
# guessed: 2/255 max on a 4096x4096 Glowing Sea texture, up to 10/255 max
# (smooth histogram, no outliers — genuine quantization, not a bug pattern)
# on a 512x512 Assaultron arm texture, both 2026-08-19. 16 leaves headroom
# above the largest real value seen while still catching an actual leak,
# which would show as large, non-smooth diffs concentrated at 255 or 0.
ALPHA_TOLERANCE_BC = 16


def run_stage(script: str, *args: str) -> bool:
    result = subprocess.run([sys.executable, str(HERE / script), *args], cwd=HERE)
    return result.returncode == 0


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python test_pipeline.py <source_texture_dir> [count]")
        return 1
    source_dir = Path(sys.argv[1])
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    work_dir = HERE / "_test_run"
    if work_dir.exists():
        shutil.rmtree(work_dir)
    input_dir = work_dir / "Input"
    input_dir.mkdir(parents=True)

    real_files = sorted(source_dir.rglob("*_d.dds")) + sorted(source_dir.rglob("*_D.DDS"))
    real_files = real_files[:count]
    if not real_files:
        log(STAGE, f"No *_d.dds files found under {source_dir}. Cannot test against real textures.")
        return 1

    for f in real_files:
        shutil.copy2(f, input_dir / f.name)
    log(STAGE, f"Copied {len(real_files)} real source texture(s) into {input_dir}: {[f.name for f in real_files]}")

    # ── Stage 1: real ─────────────────────────────────────────────────────
    if not run_stage("extract_uv_mask.py", str(input_dir), str(work_dir / "UV_Mask")):
        log(STAGE, "FAIL: stage 1 (extract_uv_mask) failed.")
        return 1

    # ── Stage 2: real if ComfyUI is up, honestly-labeled fallback if not ──
    cfg = load_config()
    online, reason = check_comfyui(cfg["comfyui_base"])
    enhanced_dir = work_dir / "Enhanced"
    enhanced_dir.mkdir(parents=True)
    if online:
        log(STAGE, "ComfyUI is reachable — running stage 2 for real.")
        if not run_stage("enhance.py", str(input_dir), str(enhanced_dir)):
            log(STAGE, "FAIL: stage 2 (enhance) failed even though ComfyUI was reachable.")
            return 1
    else:
        log(STAGE, f"ComfyUI NOT reachable ({reason}) — stage 2 skipped. Using original images unmodified "
                   f"as a stand-in so stages 3/4's real mechanics still get tested. This run does NOT verify "
                   f"the actual AI enhancement step.")
        for f in real_files:
            img = dds_to_pil(f)
            img.save(enhanced_dir / (f.stem + ".png"))

    # ── Stage 3: real ─────────────────────────────────────────────────────
    if not run_stage("composite_lock.py", str(input_dir), str(enhanced_dir), str(work_dir / "UV_Mask"), str(work_dir / "UV-Locked")):
        log(STAGE, "FAIL: stage 3 (composite_lock) failed.")
        return 1

    # ── Stage 4: real ─────────────────────────────────────────────────────
    output_dir = work_dir / "Output"
    if not run_stage("finalize.py", str(input_dir), str(work_dir / "UV-Locked"), str(work_dir / "UV_Mask"), str(output_dir)):
        log(STAGE, "FAIL: stage 4 (finalize) failed.")
        return 1

    # ── Assertions against REAL output files ────────────────────────────
    all_passed = True
    for f in real_files:
        out_path = output_dir / f.name
        if not out_path.exists():
            log(STAGE, f"FAIL {f.name}: no output file produced at {out_path}")
            all_passed = False
            continue

        original = dds_to_pil(f)
        result = Image.open(out_path).convert("RGBA")

        # 1. Dimensions match.
        if result.size != original.size:
            log(STAGE, f"FAIL {f.name}: dimension mismatch — original {original.size}, output {result.size}")
            all_passed = False
            continue

        mask_path = work_dir / "UV_Mask" / (f.stem + "_mask.png")
        mask = np.asarray(Image.open(mask_path).convert("L").resize(original.size, Image.NEAREST))
        used = mask > 127
        unused = ~used

        orig_alpha = np.asarray(original.getchannel("A"))
        out_alpha = np.asarray(result.getchannel("A"))

        # 2. Alpha matches INSIDE the mask — exact first, then a documented
        #    tolerance for BC-compressed .dds output (lossy alpha encoding).
        if np.any(used):
            abs_diff = np.abs(orig_alpha[used].astype(np.int16) - out_alpha[used].astype(np.int16))
            exact_mismatches = int(np.sum(abs_diff != 0))
            fmt_info = read_dds_format(f) if f.suffix.lower() == ".dds" else None
            is_bc = bool(fmt_info and fmt_info.texconv_format.startswith("BC"))
            tolerance = ALPHA_TOLERANCE_BC if is_bc else 0
            over_tolerance = int(np.sum(abs_diff > tolerance))
            if over_tolerance > 0:
                log(STAGE, f"FAIL {f.name}: alpha differs from original at {over_tolerance} in-bounds pixel(s) "
                           f"beyond tolerance ({tolerance}).")
                all_passed = False
            elif exact_mismatches > 0:
                log(STAGE, f"PASS {f.name}: alpha matches original inside the mask within BC-compression tolerance "
                           f"({exact_mismatches} px differ by <= {tolerance}, out of {int(np.sum(used))} px).")
            else:
                log(STAGE, f"PASS {f.name}: alpha matches original byte-for-byte inside the mask ({int(np.sum(used))} px).")
        else:
            log(STAGE, f"{f.name}: mask is entirely 'unused' — nothing in-bounds to check for alpha match.")

        # 3. Alpha is exactly 0 OUTSIDE the mask — the literal "zero
        #    non-transparent pixels outside the mask boundary" check.
        if np.any(unused):
            nonzero_outside = int(np.sum(out_alpha[unused] != 0))
            if nonzero_outside > 0:
                log(STAGE, f"FAIL {f.name}: {nonzero_outside} pixel(s) outside the mask are NOT fully transparent "
                           f"(out of {int(np.sum(unused))} unused pixels).")
                all_passed = False
            else:
                log(STAGE, f"PASS {f.name}: all {int(np.sum(unused))} out-of-mask pixels are fully transparent (alpha=0).")
        else:
            log(STAGE, f"{f.name}: entire canvas is 'used' (flat/opaque alpha) — no unused region to check; dimension+alpha checks above are the real guarantee for this file.")

        # 4. No VISIBLE floating artifact outside the mask: RGB drift only
        #    matters where alpha is nonzero there (if check 3 passed, alpha
        #    is 0 everywhere outside the mask, so any RGB drift is invisible
        #    in-game and reported as a diagnostic, not a failure).
        orig_rgb = np.asarray(original.convert("RGB"))
        out_rgb = np.asarray(result.convert("RGB"))
        if np.any(unused):
            rgb_diff = np.any(orig_rgb[unused] != out_rgb[unused], axis=-1)
            alpha_nonzero = out_alpha[unused] != 0
            visible_leak = rgb_diff & alpha_nonzero
            visible_leak_count = int(np.sum(visible_leak))
            diagnostic_only_count = int(np.sum(rgb_diff & ~alpha_nonzero))
            if visible_leak_count > 0:
                log(STAGE, f"FAIL {f.name}: {visible_leak_count} pixel(s) outside the mask have BOTH altered RGB "
                           f"AND nonzero alpha — a real, visible floating-artifact leak.")
                all_passed = False
            elif diagnostic_only_count > 0:
                log(STAGE, f"PASS {f.name}: {diagnostic_only_count} unused-region pixel(s) have RGB drift from BC "
                           f"compression, but all are alpha=0 (invisible in-game) — no visible leak "
                           f"(out of {int(np.sum(unused))} unused pixels).")
            else:
                log(STAGE, f"PASS {f.name}: all {int(np.sum(unused))} unused-region RGB pixels are byte-identical to the original.")

    log(STAGE, "=" * 60)
    log(STAGE, "ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED — see above.")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
