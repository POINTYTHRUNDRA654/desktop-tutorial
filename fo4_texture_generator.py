"""
fo4_texture_generator.py
========================
Generate brand-new FO4-ready textures from a text description using Mossy AI.

Outputs a complete PBR texture set:
  name_d.dds  — diffuse (BC7)
  name_n.dds  — normal map (BC5)
  name_s.dds  — specular composite (BC7)
"""

import bpy, os, base64, tempfile

TEXTURE_PRESETS = [
    ("Rusted Iron",      "rusted iron metal heavily corroded orange rust streaks"),
    ("Weathered Wood",   "weathered wooden planks cracked grain dark stains"),
    ("Concrete Wall",    "cracked concrete wall gray stains moss crevices"),
    ("Leather Armor",    "dark brown worn leather armor scratches stitching"),
    ("Circuit Board",    "green circuit board electronic traces solder points"),
    ("Bark / Tree",      "rough tree bark brown gray mossy crevices"),
    ("Dirt Ground",      "dry cracked dirt ground sandy brown"),
    ("Metal Grate",      "industrial metal grate rust holes bolts"),
    ("Brick Wall",       "old red brick wall mortar cracks worn"),
    ("Fabric Cloth",     "rough burlap fabric woven texture brown"),
    ("Ceramic Tile",     "white ceramic tile grout lines dirty"),
    ("Vault Wall",       "vault-tec yellow painted concrete panels bolts"),
]

PRESET_ITEMS = [(p, p, d) for p, d in TEXTURE_PRESETS]


def generate_texture_via_mossy(description: str, output_dir: str,
                                 base_name: str, resolution: int = 1024) -> dict:
    """Ask Mossy AI to generate a texture from description.
    Falls back to procedural generation if Mossy is offline.
    Returns {success, diffuse, normal, specular, message}
    """
    result = {"success": False, "diffuse": None, "normal": None,
               "specular": None, "message": ""}
    os.makedirs(output_dir, exist_ok=True)

    # Try Mossy first
    try:
        from . import mossy_link
        ok, _ = mossy_link.check_bridge()
        if ok:
            payload = mossy_link.ask_mossy(
                f"Generate a seamless PBR texture: {description}. "
                f"Output base64-encoded PNG for diffuse, normal, and specular maps.",
                fo4_context=True, max_tokens=50
            )
            # Mossy texture generation via process_texture endpoint
            import json
            req_data = json.dumps({
                "description": description,
                "resolution":  resolution,
                "maps":        ["diffuse", "normal", "specular"],
            }).encode()
            from urllib import request as _req
            req = _req.Request(
                "http://localhost:5000/generate_texture",
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with _req.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
            for map_type in ("diffuse","normal","specular"):
                b64 = data.get(map_type, "")
                if b64:
                    suffix = {"diffuse":"_d","normal":"_n","specular":"_s"}[map_type]
                    png_path = os.path.join(output_dir, base_name + suffix + ".png")
                    with open(png_path, "wb") as fh:
                        fh.write(base64.b64decode(b64))
                    result[map_type] = png_path
            if result["diffuse"]:
                result["success"] = True
                result["message"] = f"Mossy generated texture set for: {description}"
                return _convert_to_dds(result, output_dir, base_name)
    except Exception as exc:
        print(f"[Tex Gen] Mossy generation failed: {exc}, falling back to procedural")

    # Procedural fallback — generates a basic tileable texture using NumPy + PIL
    return _generate_procedural(description, output_dir, base_name, resolution)


def _generate_procedural(description: str, output_dir: str,
                           base_name: str, resolution: int = 1024) -> dict:
    """Generate a basic procedural texture from description keywords."""
    result = {"success": False, "diffuse": None, "normal": None,
               "specular": None, "message": ""}
    try:
        import numpy as np
        from PIL import Image, ImageFilter
    except ImportError:
        result["message"] = "NumPy / Pillow not available for procedural generation"
        return result

    desc = description.lower()
    rng  = np.random.default_rng(hash(description) % (2**31))
    res  = resolution

    # ── Base color from keywords ─────────────────────────────────────────
    color_map = {
        "rust": (140, 70, 40), "iron": (80, 80, 90), "metal": (100, 100, 110),
        "wood": (90, 65, 40),  "bark": (70, 50, 35), "concrete": (130, 130, 125),
        "dirt": (110, 85, 60), "brick": (160, 80, 60), "leather": (80, 50, 35),
        "fabric": (140, 115, 80), "green": (60, 100, 60), "blue": (60, 80, 140),
        "yellow": (200, 180, 60), "white": (220, 220, 215), "black": (30, 30, 35),
        "vault": (220, 190, 50), "circuit": (40, 100, 60), "ceramic": (210, 210, 205),
    }
    base_color = (128, 100, 80)  # default brownish
    for kw, col in color_map.items():
        if kw in desc:
            base_color = col
            break

    # ── Noise base ───────────────────────────────────────────────────────
    noise = rng.random((res, res)).astype(np.float32)

    # Multi-octave noise
    for scale in [4, 8, 16, 32]:
        small = rng.random((res // scale, res // scale)).astype(np.float32)
        from PIL import Image as _Im
        upscaled = np.array(
            _Im.fromarray((small * 255).astype(np.uint8)).resize((res, res), _Im.LANCZOS),
            dtype=np.float32
        ) / 255.0
        noise = noise * 0.5 + upscaled * 0.5

    # ── Diffuse ──────────────────────────────────────────────────────────
    r = (base_color[0] + (noise - 0.5) * 40).clip(0, 255).astype(np.uint8)
    g = (base_color[1] + (noise - 0.5) * 40).clip(0, 255).astype(np.uint8)
    b = (base_color[2] + (noise - 0.5) * 40).clip(0, 255).astype(np.uint8)
    diffuse_img = Image.fromarray(np.stack([r, g, b], axis=-1))
    diff_path   = os.path.join(output_dir, base_name + "_d.png")
    diffuse_img.save(diff_path)
    result["diffuse"] = diff_path

    # ── Normal map from diffuse ──────────────────────────────────────────
    from scipy.ndimage import gaussian_filter
    gray = (noise * 255).astype(np.float32)
    try:
        gray = gaussian_filter(gray, sigma=1.5)
    except Exception:
        pass
    from numpy.lib.stride_tricks import sliding_window_view
    kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    pad  = np.pad(gray / 255.0, 1, mode="edge")
    wins = sliding_window_view(pad, (3,3))
    gx   = (wins * kx).sum(axis=(-2,-1)) * 2.0
    gy   = -(wins * ky).sum(axis=(-2,-1)) * 2.0
    nz   = np.ones_like(gx)
    ln   = np.maximum(np.sqrt(gx**2 + gy**2 + nz**2), 1e-6)
    nr = ((gx/ln + 1)*0.5*255).clip(0,255).astype(np.uint8)
    ng = ((gy/ln + 1)*0.5*255).clip(0,255).astype(np.uint8)
    nb = ((nz/ln + 1)*0.5*255).clip(0,255).astype(np.uint8)
    norm_img = Image.fromarray(np.stack([nr, ng, nb], axis=-1))
    norm_path = os.path.join(output_dir, base_name + "_n.png")
    norm_img.save(norm_path)
    result["normal"] = norm_path

    # ── Specular (inverted roughness) ────────────────────────────────────
    rough_kw = ["rust","dirt","wood","bark","concrete","fabric","brick"]
    shiny_kw = ["metal","iron","circuit","ceramic","glass","chrome"]
    base_spec = 60 if any(k in desc for k in rough_kw) else 140
    spec = (base_spec + (noise - 0.5) * 30).clip(0, 255).astype(np.uint8)
    spec_img  = Image.fromarray(np.stack([spec, spec, spec], axis=-1))
    spec_path = os.path.join(output_dir, base_name + "_s.png")
    spec_img.save(spec_path)
    result["specular"] = spec_path

    result["success"] = True
    result["message"] = f"Procedural texture generated for: {description}"
    return _convert_to_dds(result, output_dir, base_name)


def _convert_to_dds(result: dict, output_dir: str, base_name: str) -> dict:
    """Convert PNG maps to DDS using texconv if available."""
    import subprocess
    try:
        from . import preferences as _prefs_mod
        prefs   = _prefs_mod.get_preferences()
        texconv = getattr(prefs, "texconv_path", "").strip() if prefs else ""
    except Exception:
        texconv = ""

    if not texconv or not os.path.isfile(texconv):
        result["message"] += " (PNG only — texconv not configured for DDS)"
        return result

    fmt_map = {"diffuse": "BC7_UNORM", "normal": "BC5_UNORM", "specular": "BC7_UNORM"}
    for map_type, fmt in fmt_map.items():
        png = result.get(map_type)
        if png and os.path.isfile(png):
            try:
                subprocess.run([texconv, "-f", fmt, "-o", output_dir, png],
                               capture_output=True, timeout=60)
                dds = png.replace(".png", ".dds")
                if os.path.isfile(dds):
                    result[map_type] = dds
            except Exception:
                pass

    return result


class FO4_OT_SetTexturePreset(bpy.types.Operator):
    bl_idname  = "fo4.set_texture_preset"
    bl_label   = "Set Texture Preset"
    bl_options = {"INTERNAL"}
    preset: bpy.props.StringProperty(default="")
    def execute(self, context):
        if hasattr(context.scene, "fo4_tex_description"):
            context.scene.fo4_tex_description = self.preset
        return {"FINISHED"}


class FO4_OT_GenerateTexture(bpy.types.Operator):
    """Generate a new PBR texture set from a text description.
    Outputs diffuse + normal + specular maps as DDS files ready for FO4.
    """
    bl_idname  = "fo4.generate_texture"
    bl_label   = "Generate Texture from Description"
    bl_options = {"REGISTER"}

    def execute(self, context):
        desc     = getattr(context.scene, "fo4_tex_description", "rusted metal")
        out_dir  = bpy.path.abspath(getattr(context.scene, "fo4_tex_output", "//"))
        base_name= getattr(context.scene, "fo4_tex_name", "generated")
        resolution = getattr(context.scene, "fo4_tex_resolution", 1024)

        result = generate_texture_via_mossy(desc, out_dir, base_name, resolution)
        if result["success"]:
            self.report({"INFO"}, result["message"])
        else:
            self.report({"WARNING"}, result["message"])
        return {"FINISHED"}


_CLASSES = [FO4_OT_SetTexturePreset, FO4_OT_GenerateTexture]

_SCENE_PROPS = [
    ("fo4_tex_description", bpy.props.StringProperty(
        name="Description", default="rusted iron metal heavily corroded",
        description="Describe the texture material",
    )),
    ("fo4_tex_name", bpy.props.StringProperty(
        name="Base Name", default="generated",
        description="Output filename prefix (e.g. 'ironwall' → ironwall_d.dds)",
    )),
    ("fo4_tex_output", bpy.props.StringProperty(
        name="Output Folder", subtype="DIR_PATH", default="",
    )),
    ("fo4_tex_resolution", bpy.props.EnumProperty(
        name="Resolution",
        items=[("512","512",""),("1024","1024",""),("2048","2048",""),("4096","4096","")],
        default="1024",
    )),
]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass
    for name, prop in _SCENE_PROPS:
        try: setattr(bpy.types.Scene, name, prop)
        except Exception: pass


def unregister():
    for name, _ in reversed(_SCENE_PROPS):
        try: delattr(bpy.types.Scene, name)
        except Exception: pass
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
