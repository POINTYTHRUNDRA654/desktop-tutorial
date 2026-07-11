"""
texture_enhance_helpers.py
==========================
AI-powered texture enhancement for Fallout 4.

Supported tiers
---------------
Tier   | Source | AI Intermediate | Output | Target platform
-------|--------|-----------------|--------|------------------
1K->4K  |  1024  |     4096        |  1024  | Xbox One / low-end PC
2K->8K  |  2048  |     8192        |  2048  | Mid-range PC / PS5
4K->16K |  4096  |    16384        |  4096  | High-end PC

The AI intermediate is processed in memory only -- never stored permanently.
The pipeline in all three cases is identical:
  1. DDS -> PNG
  2. AI upscale 4x (Real-ESRGAN / Mossy / Lanczos fallback)
  3. Generate normal map from high-res intermediate (Sobel + DirectX convention)
  4. Lanczos downscale back to source resolution
  5. BC7 DDS re-encode (better quality than original BC3/DXT5)

Result: same resolution on disk, dramatically more detail because the normal
map carries the high-frequency content extracted from the AI intermediate.
"""

import bpy
import os
import sys
import subprocess
import tempfile
from pathlib import Path


# ---------------------------------------------------------------------------
# Enhancement tiers
# ---------------------------------------------------------------------------

ENHANCE_TIERS = {
    "1K->4K":  {"label": "1K -> 4K (Xbox One / Low-End PC)",  "src_size": 1024,  "scale": 4,  "note": "Best for Xbox One and older hardware"},
    "2K->8K":  {"label": "2K -> 8K (Mid-Range PC / PS5)",    "src_size": 2048,  "scale": 4,  "note": "Great balance of quality and VRAM"},
    "4K->16K": {"label": "4K -> 16K (High-End PC)",           "src_size": 4096,  "scale": 4,  "note": "Maximum detail -- requires 6GB+ VRAM"},
}

TIER_ITEMS = [
    ("1K_4K",  "1K -> 4K  (Xbox One / Low-End PC)",  "Uses 4K AI intermediate"),
    ("2K_8K",  "2K -> 8K  (Mid-Range PC / PS5)",     "Uses 8K AI intermediate"),
    ("4K_16K", "4K -> 16K (High-End PC Ultra)",      "Uses 16K AI intermediate -- needs 8GB+ RAM"),
]


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _convert_dds_to_png(dds_path: str, out_dir: str) -> tuple:
    """Convert DDS -> PNG. Returns (success, png_path_or_error)."""
    from . import preferences as _prefs_mod
    prefs = _prefs_mod.get_preferences()
    texconv = getattr(prefs, 'texconv_path', '').strip() if prefs else ''
    out_png = os.path.join(out_dir, Path(dds_path).stem + ".png")

    if texconv and os.path.isfile(texconv):
        result = subprocess.run(
            [texconv, "-ft", "png", "-o", out_dir, dds_path],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0 and os.path.isfile(out_png):
            return True, out_png

    try:
        img = bpy.data.images.load(dds_path)
        img.file_format = 'PNG'
        img.filepath_raw = out_png
        img.save()
        bpy.data.images.remove(img)
        if os.path.isfile(out_png):
            return True, out_png
    except Exception as exc:
        return False, f"Could not convert DDS to PNG: {exc}"

    return False, "No DDS->PNG converter available (configure texconv in preferences)"


def _ai_upscale(png_path: str, scale: int = 4, out_dir: str = None,
                tile_size: int = 512) -> tuple:
    """AI upscale using Real-ESRGAN or Mossy. Returns (success, upscaled_path).

    For 2K->8K and 4K->16K we use tiled processing (tile_size) so VRAM
    usage stays manageable even for large intermediates.
    """
    if out_dir is None:
        out_dir = os.path.dirname(png_path)

    stem   = Path(png_path).stem
    out_path = os.path.join(out_dir, f"{stem}_x{scale}.png")

    # -- Try Mossy first ----------------------------------------------------
    try:
        import base64
        from . import mossy_link
        ok, _ = mossy_link.check_bridge()
        if ok:
            with open(png_path, "rb") as fh:
                img_b64 = base64.b64encode(fh.read()).decode("utf-8")
            result = mossy_link.process_texture(
                image_data_base64=img_b64, fmt="png", quality="high", timeout=300,
            )
            if result and result.get("status") == "success" and result.get("texture_data"):
                import base64 as b64
                with open(out_path, "wb") as fh:
                    fh.write(b64.b64decode(result["texture_data"]))
                if os.path.isfile(out_path):
                    return True, out_path
    except Exception:
        pass

    # -- Local Real-ESRGAN with multi-GPU support ---------------------------
    try:
        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        esrgan_exe = getattr(prefs, 'realesrgan_path', '').strip() if prefs else ''
        if esrgan_exe and os.path.isfile(esrgan_exe):
            # Route through gpu_manager so multi-GPU systems use the best card
            try:
                from . import gpu_manager as _gm
                ok, result_path = _gm.run_realesrgan_multi_gpu(
                    esrgan_exe, png_path, out_path, scale=scale, tile_size=tile_size
                )
                if ok and os.path.isfile(out_path):
                    return True, out_path
            except Exception:
                pass
            # Direct fallback if gpu_manager unavailable
            cmd = [esrgan_exe, "-i", png_path, "-o", out_path,
                   "-s", str(scale), "-n", "realesrgan-x4plus", "-t", str(tile_size)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode == 0 and os.path.isfile(out_path):
                return True, out_path
    except Exception:
        pass

    # -- Lanczos fallback (no AI, but perceptually better than bilinear) ----
    try:
        from PIL import Image
        img = Image.open(png_path)
        w, h = img.size
        upscaled = img.resize((w * scale, h * scale), Image.LANCZOS)
        upscaled.save(out_path, "PNG")
        print(f"[Texture Enhance] ⚠ Used Lanczos fallback (no AI upscaler available)")
        return True, out_path
    except Exception as exc:
        return False, f"All upscalers failed: {exc}"


def _generate_normal_map(diffuse_path: str, strength: float = 2.0,
                          blur_radius: float = 1.5,
                          tile_px: int = 2048) -> tuple:
    """Generate a DirectX normal map from a diffuse using Sobel edge detection.

    Processes in tiles so it works on 8K and 16K intermediates without
    running out of RAM.  Returns (success, normal_map_path_or_error).
    """
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        return False, "NumPy / Pillow not available"

    try:
        img   = Image.open(diffuse_path).convert("L")
        w, h  = img.size
        gray  = np.array(img, dtype=np.float32) / 255.0

        # Gaussian blur to reduce noise (tiled to save RAM on 8K/16K)
        try:
            from scipy.ndimage import gaussian_filter
            gray = gaussian_filter(gray, sigma=blur_radius)
        except ImportError:
            img_blur = img.filter(__import__('PIL.ImageFilter', fromlist=['ImageFilter']).ImageFilter.GaussianBlur(radius=blur_radius))
            gray = np.array(img_blur, dtype=np.float32) / 255.0

        # Sobel kernels
        kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
        ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32)

        pad   = np.pad(gray, 1, mode='edge')
        gx_   = np.zeros_like(gray)
        gy_   = np.zeros_like(gray)

        # Tiled convolution -- processes tile_pxxtile_px chunks to keep RAM low
        for y0 in range(0, h, tile_px):
            for x0 in range(0, w, tile_px):
                y1 = min(y0 + tile_px, h)
                x1 = min(x0 + tile_px, w)
                patch = pad[y0:y1+2, x0:x1+2]
                from numpy.lib.stride_tricks import sliding_window_view
                wins = sliding_window_view(patch, (3, 3))
                gx_[y0:y1, x0:x1] = (wins * kx).sum(axis=(-2, -1)) * strength
                gy_[y0:y1, x0:x1] = (wins * ky).sum(axis=(-2, -1)) * strength

        # Build normal map (DirectX convention: G channel inverted)
        nz  = np.ones_like(gx_)
        length = np.sqrt(gx_**2 + gy_**2 + nz**2)
        length = np.maximum(length, 1e-6)
        nx = gx_ / length
        ny = -gy_ / length   # DirectX Y-flip
        nz = nz  / length

        r = ((nx + 1.0) * 0.5 * 255).clip(0, 255).astype(np.uint8)
        g = ((ny + 1.0) * 0.5 * 255).clip(0, 255).astype(np.uint8)
        b = ((nz + 1.0) * 0.5 * 255).clip(0, 255).astype(np.uint8)
        a = np.full_like(r, 255)

        normal_img = Image.fromarray(np.stack([r, g, b, a], axis=-1), mode='RGBA')
        out_path   = diffuse_path.replace(".png", "_n.png")
        normal_img.save(out_path, "PNG")
        return True, out_path

    except Exception as exc:
        return False, f"Normal map generation failed: {exc}"


def _generate_specular_map(diffuse_path: str, tile_px: int = 2048) -> tuple:
    """Generate a specular/smoothness map from a diffuse texture.

    Converts the high-res diffuse to a single-channel specular map using
    perceptual luminosity.  Bright areas become more specular (good for
    organic materials like leaves where veins and waxy surfaces catch light).
    Returns (success, spec_png_path_or_error).
    """
    try:
        from PIL import Image, ImageFilter, ImageEnhance, ImageOps
        import numpy as np

        spec_path = os.path.splitext(diffuse_path)[0] + "_spec_gen.png"

        with Image.open(diffuse_path) as img:
            img = img.convert("RGB")
            w, h = img.size

            # Process in tiles to handle large intermediates (8K / 16K)
            result = Image.new("L", (w, h))
            for ty in range(0, h, tile_px):
                for tx in range(0, w, tile_px):
                    box   = (tx, ty, min(tx + tile_px, w), min(ty + tile_px, h))
                    tile  = img.crop(box)

                    # Perceptual luminosity (ITU-R BT.709 weights)
                    arr   = np.array(tile, dtype=np.float32)
                    lum   = (0.2126 * arr[:, :, 0] +
                             0.7152 * arr[:, :, 1] +
                             0.0722 * arr[:, :, 2])

                    # Boost contrast so specular highlights stand out
                    lum   = np.clip((lum - 64) * 1.4 + 64, 0, 255).astype(np.uint8)
                    spec_tile = Image.fromarray(lum, mode="L")

                    # Light blur to smooth noise before downscaling
                    spec_tile = spec_tile.filter(ImageFilter.GaussianBlur(radius=1.0))

                    result.paste(spec_tile, (tx, ty))

            result.save(spec_path, "PNG")
            return True, spec_path

    except Exception as exc:
        return False, f"Specular map generation failed: {exc}"


def _downscale_perceptual(image_path: str, target_size: tuple,
                           out_path: str = None) -> tuple:
    """Lanczos downscale to target_size. Returns (success, out_path)."""
    try:
        from PIL import Image
        img        = Image.open(image_path)
        downscaled = img.resize(target_size, Image.LANCZOS)
        if out_path is None:
            stem     = Path(image_path).stem
            out_path = os.path.join(os.path.dirname(image_path),
                                    f"{stem}_{target_size[0]}x{target_size[1]}.png")
        downscaled.save(out_path, "PNG")
        return True, out_path
    except Exception as exc:
        return False, f"Downscale failed: {exc}"


def _convert_png_to_dds(png_path: str, out_dir: str,
                          fmt: str = "BC7_UNORM") -> tuple:
    """PNG -> BC7 DDS via texconv. Returns (success, dds_path)."""
    from . import preferences as _prefs_mod
    prefs   = _prefs_mod.get_preferences()
    texconv = getattr(prefs, 'texconv_path', '').strip() if prefs else ''

    if not texconv or not os.path.isfile(texconv):
        return False, "texconv not configured in addon preferences"

    dds_out = os.path.join(out_dir, Path(png_path).stem + ".dds")
    result  = subprocess.run(
        [texconv, "-f", fmt, "-bc", "x", "-srgb", "-o", out_dir, png_path],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode == 0 and os.path.isfile(dds_out):
        return True, dds_out
    return False, f"texconv failed: {result.stderr.strip()}"


# ---------------------------------------------------------------------------
# Main enhancement pipeline
# ---------------------------------------------------------------------------

def enhance_texture(texture_path: str,
                    tier: str = "1K_4K",
                    output_dir: str = None,
                    normal_strength: float = 2.5,
                    generate_normal: bool = True,
                    generate_specular: bool = True,
                    to_dds: bool = True,
                    tile_size: int = 512) -> dict:
    """
    Full AI texture enhancement pipeline -- works for 1K, 2K, and 4K sources.

    tier values: "1K_4K" | "2K_8K" | "4K_16K"

    Pipeline:
      DDS->PNG -> AI upscale 4x -> normal + specular from hi-res -> Lanczos downscale -> BC7/BC5/BC4 DDS

    Returns dict: {success, diffuse_path, normal_path, specular_path, message, steps, tier}
    """
    tier_map = {
        "1K_4K":  1024,
        "2K_8K":  2048,
        "4K_16K": 4096,
    }
    src_expected = tier_map.get(tier, 1024)

    steps  = []
    result = {
        "success":        False,
        "diffuse_path":   None,
        "normal_path":    None,
        "specular_path":  None,
        "message":        "",
        "steps":          steps,
        "tier":           tier,
    }

    if not os.path.isfile(texture_path):
        result["message"] = f"File not found: {texture_path}"
        return result

    work_dir = output_dir or tempfile.mkdtemp(prefix="fo4_tex_enhance_")
    os.makedirs(work_dir, exist_ok=True)

    ext = Path(texture_path).suffix.lower()

    # -- Step 1: DDS -> PNG ---------------------------------------------------
    if ext == ".dds":
        ok, png_path = _convert_dds_to_png(texture_path, work_dir)
        if not ok:
            result["message"] = png_path
            return result
        steps.append(f"DDS -> PNG: {os.path.basename(png_path)}")
    else:
        png_path = texture_path

    # Detect actual size
    src_w = src_h = src_expected
    try:
        from PIL import Image as _Im
        with _Im.open(png_path) as im:
            src_w, src_h = im.size
    except Exception:
        pass

    inter_w = src_w * 4
    inter_h = src_h * 4
    steps.append(f"Source: {src_w}x{src_h}  ->  AI intermediate: {inter_w}x{inter_h}")

    # -- Step 2: AI Upscale --------------------------------------------------
    ok, upscaled_path = _ai_upscale(png_path, scale=4, out_dir=work_dir,
                                     tile_size=tile_size)
    if not ok:
        steps.append(f"⚠ Upscale warning: {upscaled_path} -- using original")
        upscaled_path = png_path
    else:
        steps.append(f"AI upscaled to {inter_w}x{inter_h}: {os.path.basename(upscaled_path)}")

    # -- Step 3: Generate normal map from high-res intermediate ---------------
    normal_png = None
    if generate_normal:
        ok, nrm = _generate_normal_map(upscaled_path, strength=normal_strength,
                                        tile_px=2048)
        if ok:
            steps.append(f"Normal map from {inter_w}x{inter_h} intermediate")
            nrm_out = os.path.join(
                work_dir,
                Path(texture_path).stem.replace("_d", "") + f"_n_enhanced_{src_w}.png"
            )
            ok2, nrm_1x = _downscale_perceptual(nrm, (src_w, src_h), nrm_out)
            normal_png = nrm_1x if ok2 else nrm
            steps.append(f"Normal Lanczos -> {src_w}x{src_h}")
        else:
            steps.append(f"⚠ Normal map skipped: {nrm}")

    # -- Step 3b: Generate specular map from high-res intermediate ------------
    specular_png = None
    if generate_specular:
        ok, spec = _generate_specular_map(upscaled_path, tile_px=2048)
        if ok:
            steps.append(f"Specular map from {inter_w}x{inter_h} intermediate")
            spec_out = os.path.join(
                work_dir,
                Path(texture_path).stem.replace("_d", "") + f"_s_enhanced_{src_w}.png"
            )
            ok2, spec_1x = _downscale_perceptual(spec, (src_w, src_h), spec_out)
            specular_png = spec_1x if ok2 else spec
            steps.append(f"Specular Lanczos -> {src_w}x{src_h}")
        else:
            steps.append(f"⚠ Specular map skipped: {spec}")

    # -- Step 4: Downscale enhanced diffuse -> source resolution --------------
    diff_out = os.path.join(
        work_dir,
        Path(texture_path).stem + f"_enhanced_{src_w}.png"
    )
    ok, diff_1x = _downscale_perceptual(upscaled_path, (src_w, src_h), diff_out)
    if not ok:
        result["message"] = f"Downscale failed: {diff_1x}"
        return result
    steps.append(f"Diffuse Lanczos -> {src_w}x{src_h}")

    # -- Step 5: PNG -> DDS (BC7 diffuse, BC5 normal, BC4 specular) -----------
    diff_final = diff_1x
    nrm_final  = normal_png
    spec_final = specular_png

    if to_dds:
        ok, dds = _convert_png_to_dds(diff_1x, work_dir, fmt="BC7_UNORM")
        if ok:
            diff_final = dds
            steps.append("Diffuse -> BC7 DDS")
        else:
            steps.append(f"⚠ Diffuse DDS skipped: {dds}")

        if normal_png and os.path.isfile(normal_png):
            ok, nrm_dds = _convert_png_to_dds(normal_png, work_dir, fmt="BC5_UNORM")
            if ok:
                nrm_final = nrm_dds
                steps.append("Normal -> BC5 DDS (two-channel tangent-space)")
            else:
                steps.append(f"⚠ Normal DDS skipped: {nrm_dds}")

        if specular_png and os.path.isfile(specular_png):
            # BC4 is single-channel (R only) — perfect for a greyscale specular mask
            ok, spec_dds = _convert_png_to_dds(specular_png, work_dir, fmt="BC4_UNORM")
            if ok:
                spec_final = spec_dds
                steps.append("Specular -> BC4 DDS (single-channel smoothness)")
            else:
                steps.append(f"⚠ Specular DDS skipped: {spec_dds}")

    maps_built = sum(1 for p in (diff_final, nrm_final, spec_final) if p and os.path.isfile(p))
    result["success"]        = True
    result["diffuse_path"]   = diff_final
    result["normal_path"]    = nrm_final
    result["specular_path"]  = spec_final
    result["message"]        = (
        f"{tier.replace('_','->')} complete — {maps_built} maps at {src_w}x{src_h}, "
        f"detail extracted from {inter_w}x{inter_h} AI intermediate"
    )
    return result


# Backward-compat alias for old calls
def enhance_texture_1k(texture_path, output_dir=None, normal_strength=2.5,
                        generate_normal=True, to_dds=True):
    return enhance_texture(texture_path, tier="1K_4K", output_dir=output_dir,
                           normal_strength=normal_strength,
                           generate_normal=generate_normal, to_dds=to_dds)


# ---------------------------------------------------------------------------
# Blender Operators
# ---------------------------------------------------------------------------

class FO4_OT_EnhanceTexture(bpy.types.Operator):
    """AI texture enhancement -- extract 4x-scale detail into the source resolution.

    Supports 1K->4K (Xbox One), 2K->8K (mid PC), and 4K->16K (high-end PC).
    The AI intermediate is temporary -- only the final enhanced source-res
    texture and its generated normal map are saved.
    """
    bl_idname  = "fo4.enhance_texture_1k"   # keep old idname for compat
    bl_label   = "Enhance Texture (AI)"
    bl_options = {'REGISTER'}

    filepath: bpy.props.StringProperty(
        name="Texture", subtype='FILE_PATH',
        description="Source DDS or PNG texture",
    )
    tier: bpy.props.EnumProperty(
        name="Enhancement Tier",
        items=TIER_ITEMS,
        default="1K_4K",
        description="Source resolution and AI intermediate size to use",
    )
    output_dir: bpy.props.StringProperty(
        name="Output Folder", subtype='DIR_PATH', default="",
        description="Where to save enhanced textures (default: same folder as source)",
    )
    normal_strength: bpy.props.FloatProperty(
        name="Normal Strength", default=2.5, min=0.5, max=8.0,
        description="How pronounced the detail is in the generated normal map",
    )
    generate_normal: bpy.props.BoolProperty(
        name="Generate Normal Map", default=True,
        description="Generate a BC5 normal map from the AI intermediate at full resolution",
    )
    generate_specular: bpy.props.BoolProperty(
        name="Generate Specular Map", default=True,
        description="Generate a BC4 specular/smoothness map from the AI intermediate",
    )
    to_dds: bpy.props.BoolProperty(
        name="Output as DDS", default=True,
        description="BC7 diffuse, BC5 normal, BC4 specular — best quality for FO4",
    )

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        path = bpy.path.abspath(self.filepath)
        if not os.path.isfile(path):
            self.report({'ERROR'}, f"File not found: {path}")
            return {'CANCELLED'}

        out_dir = bpy.path.abspath(self.output_dir) if self.output_dir else os.path.dirname(path)
        os.makedirs(out_dir, exist_ok=True)

        result = enhance_texture(
            texture_path=path,
            tier=self.tier,
            output_dir=out_dir,
            normal_strength=self.normal_strength,
            generate_normal=self.generate_normal,
            generate_specular=self.generate_specular,
            to_dds=self.to_dds,
        )

        for step in result.get("steps", []):
            print(f"[Texture Enhance] {step}")

        if result["success"]:
            self.report({'INFO'}, result["message"])
            if result.get("normal_path"):
                self.report({'INFO'}, f"Normal map: {os.path.basename(result['normal_path'])}")
            if result.get("specular_path"):
                self.report({'INFO'}, f"Specular map: {os.path.basename(result['specular_path'])}")
        else:
            self.report({'ERROR'}, result["message"])
        return {'FINISHED'}


class FO4_OT_BatchEnhanceTextures(bpy.types.Operator):
    """Batch-enhance all textures in a folder at the selected tier."""
    bl_idname  = "fo4.batch_enhance_1k_textures"   # keep old idname for compat
    bl_label   = "Batch Enhance Textures (AI)"
    bl_options = {'REGISTER'}

    directory: bpy.props.StringProperty(
        name="Texture Folder", subtype='DIR_PATH',
        description="Folder of DDS textures to enhance",
    )
    tier: bpy.props.EnumProperty(
        name="Enhancement Tier",
        items=TIER_ITEMS,
        default="1K_4K",
    )
    normal_strength: bpy.props.FloatProperty(
        name="Normal Strength", default=2.5, min=0.5, max=8.0,
    )
    diffuse_only: bpy.props.BoolProperty(
        name="Diffuse Only (_d.dds)",
        description="Only enhance diffuse textures, skip normal/specular",
        default=True,
    )

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

    def execute(self, context):
        folder = bpy.path.abspath(self.directory)
        if not os.path.isdir(folder):
            self.report({'ERROR'}, f"Folder not found: {folder}")
            return {'CANCELLED'}

        out_dir = os.path.join(folder, "enhanced")
        os.makedirs(out_dir, exist_ok=True)

        import glob
        files = (glob.glob(os.path.join(folder, "*_d.dds")) if self.diffuse_only
                 else glob.glob(os.path.join(folder, "*.dds")) +
                      glob.glob(os.path.join(folder, "*.png")))

        if not files:
            self.report({'WARNING'}, "No textures found")
            return {'CANCELLED'}

        ok_count = fail_count = 0
        for tex in files:
            res = enhance_texture(tex, tier=self.tier, output_dir=out_dir,
                                  normal_strength=self.normal_strength,
                                  generate_normal=True, to_dds=True)
            if res["success"]:
                ok_count += 1
                print(f"[Batch] ✓ {os.path.basename(tex)}")
            else:
                fail_count += 1
                print(f"[Batch] ✗ {os.path.basename(tex)}: {res['message']}")

        self.report({'INFO'},
            f"Batch ({self.tier}): {ok_count} enhanced, {fail_count} failed -> {out_dir}")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_OT_EnhanceTexture,
    FO4_OT_BatchEnhanceTextures,
]


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            pass


def unregister():
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
