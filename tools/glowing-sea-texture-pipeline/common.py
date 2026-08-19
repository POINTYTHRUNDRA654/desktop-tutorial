"""
Shared utilities for the Glowing Sea batch texture enhancement pipeline.

Real conventions confirmed against Billy's actual source textures before writing
any of this (2026-08-19) — see README.md's "Mask convention" section for the full
finding. Short version: most FO4 diffuse .dds files have a completely flat, fully
opaque alpha channel (every pixel = 255) — there is no per-pixel "unused" signal
to extract for those, because the whole canvas genuinely is painted/used. A minority
(alpha-tested cutout geometry — foliage cards, etc.) have real alpha variation and
that IS a real silhouette. extract_uv_mask.py branches on this per-file rather than
assuming one convention for the whole batch.
"""
from __future__ import annotations

import json
import os
import struct
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from PIL import Image

# ─── Config ──────────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "comfyui_base": "http://127.0.0.1:8188",
    "texconv_path": r"E:\Steam\steamapps\common\Fallout 4\Tools\Elric\texconv.exe",
    "comfyui_model": "",
    "denoise": 0.45,
    "steps": 30,
    "cfg": 6.0,
    "positive_prompt": (
        "photoreal biological detail, fungal infection, aged wet organic tissue, "
        "moss and lichen growth, muted olive brown purple charcoal teal palette, "
        "restrained radioactive green accents, weathered surface, subtle bioluminescence, "
        "highly detailed texture, seamless"
    ),
    "negative_prompt": (
        "fantasy, rainbow colors, saturated, cartoon, stylized, low detail, blurry, "
        "text, watermark, logo, bright pink, bright blue, unrealistic color palette"
    ),
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception as e:
            print(f"[WARN] config.json exists but couldn't be parsed ({e}) — using defaults.")
    return cfg


def log(stage: str, msg: str) -> None:
    print(f"[{stage}] {msg}", flush=True)


# ─── DDS format detection (for texconv output matching the source's real format,
# not silently upgrading e.g. BC1 -> BC7 which changes file size/VRAM behavior) ──

# Minimal DXGI_FORMAT -> texconv -f string map, covering the FO4-relevant formats.
_DXGI_FORMAT_MAP = {
    70: "BC1_TYPELESS", 71: "BC1_UNORM", 72: "BC1_UNORM_SRGB",
    73: "BC2_TYPELESS", 74: "BC2_UNORM", 75: "BC2_UNORM_SRGB",
    76: "BC3_TYPELESS", 77: "BC3_UNORM", 78: "BC3_UNORM_SRGB",
    79: "BC4_TYPELESS", 80: "BC4_UNORM", 81: "BC4_SNORM",
    82: "BC5_TYPELESS", 83: "BC5_UNORM", 84: "BC5_SNORM",
    98: "BC7_TYPELESS", 99: "BC7_UNORM", 100: "BC7_UNORM_SRGB",
    28: "R8G8B8A8_UNORM", 29: "R8G8B8A8_UNORM_SRGB",
}

# Legacy FourCC -> modern DXGI equivalent. This texconv build's -f flag only
# accepts DXGI format names (confirmed 2026-08-19: passing the literal legacy
# string "DXT5" itself fails with "Invalid value specified with -f (DXT5)"),
# even though DXT5 is exactly BC3_UNORM under the hood.
_FOURCC_MAP = {
    b"DXT1": "BC1_UNORM", b"DXT2": "BC2_UNORM", b"DXT3": "BC2_UNORM",
    b"DXT4": "BC3_UNORM", b"DXT5": "BC3_UNORM",
}


@dataclass
class DdsFormatInfo:
    texconv_format: str  # value to pass to texconv's -f flag
    has_dx10_header: bool


def read_dds_format(path: Path) -> Optional[DdsFormatInfo]:
    """Parse just enough of a DDS header to recover its real compression format,
    so finalize.py can ask texconv to write the SAME format back out rather than
    guessing/upgrading. Returns None if the file doesn't look like a real DDS or
    uses an uncompressed/legacy format this pipeline doesn't need to special-case
    (texconv falls back to a sane default in that case)."""
    try:
        with open(path, "rb") as f:
            magic = f.read(4)
            if magic != b"DDS ":
                return None
            header = f.read(124)  # standard DDS header, 124 bytes after the magic
            if len(header) < 124:
                return None
            # pixelformat starts at offset 72 within this 124-byte header (per MS docs)
            pf_fourcc = header[80:84]
            if pf_fourcc == b"DX10":
                dx10 = f.read(20)
                if len(dx10) < 4:
                    return None
                dxgi_format = struct.unpack("<I", dx10[0:4])[0]
                fmt = _DXGI_FORMAT_MAP.get(dxgi_format)
                if fmt:
                    return DdsFormatInfo(texconv_format=fmt, has_dx10_header=True)
                return None
            fmt = _FOURCC_MAP.get(pf_fourcc)
            if fmt:
                return DdsFormatInfo(texconv_format=fmt, has_dx10_header=False)
            return None
    except Exception:
        return None


def dds_to_pil(path: Path) -> Image.Image:
    """Read a real FO4 .dds diffuse texture. Pillow reads DDS natively (confirmed
    working against real BC-compressed 4096x4096 files, 2026-08-19)."""
    return Image.open(path).convert("RGBA")


def png_to_dds(png_path: Path, dds_out_path: Path, format_info: Optional[DdsFormatInfo], texconv_path: str) -> tuple[bool, str]:
    """Compress a PNG to a real, game-usable .dds via texconv, matching the
    original's compression format when known. Returns (success, message) — never
    silently claims success without texconv actually producing the file."""
    texconv_exe = Path(texconv_path)
    if not texconv_exe.exists():
        return False, f"texconv.exe not found at {texconv_path} — cannot produce a real .dds. PNG left at {png_path}."

    out_dir = dds_out_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # No -y flag: this build of texconv.exe (DirectXTex, confirmed 2026-08-19
    # against the real Fallout 4 Tools\Elric copy) doesn't recognize it and
    # dumps its usage text instead of running — it overwrites by default anyway.
    args = [str(texconv_exe), "-nologo", "-o", str(out_dir)]
    if format_info:
        args += ["-f", format_info.texconv_format]
    args.append(str(png_path))

    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=120)
    except Exception as e:
        return False, f"texconv failed to run: {e}"

    if result.returncode != 0:
        return False, f"texconv exited {result.returncode}: {result.stderr.strip()[:300] or result.stdout.strip()[:300]}"

    # texconv names its output <input-stem>.dds in -o; rename to the exact target name/case.
    produced = out_dir / (png_path.stem + ".dds")
    if not produced.exists():
        return False, f"texconv reported success but no output found at {produced}."
    if produced != dds_out_path:
        try:
            if dds_out_path.exists():
                dds_out_path.unlink()
            produced.rename(dds_out_path)
        except Exception as e:
            return False, f"texconv succeeded but renaming {produced} -> {dds_out_path} failed: {e}"

    return True, f"Wrote real {format_info.texconv_format if format_info else 'default-format'} .dds to {dds_out_path}"


def list_input_textures(input_dir: Path) -> list[Path]:
    exts = {".dds", ".png", ".tga"}
    return sorted(p for p in input_dir.rglob("*") if p.is_file() and p.suffix.lower() in exts)
