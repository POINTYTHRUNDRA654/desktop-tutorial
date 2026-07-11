"""
FO4 Auto-BGSM Material Generator
Run in Blender's Scripting tab, or use standalone with Python.
Generates a .bgsm file for use with NifSkope / Material Editor.
Fill in your DDS texture paths before running.
"""
import json, pathlib

# ── Fill in your DDS paths ────────────────────────────────────────────────
DIFFUSE   = "textures\\YourMod\\YourAsset_d.dds"
NORMAL    = "textures\\YourMod\\YourAsset_n.dds"
ROUGHNESS = "textures\\YourMod\\YourAsset_s.dds"
AO        = "textures\\YourMod\\YourAsset_ao.dds"

# ── BGSM settings (matches FO4 Metal Rusty template) ─────────────────────
bgsm = {
    "Diffuse":                  DIFFUSE,
    "Normal":                   NORMAL,
    "SmoothSpec":               ROUGHNESS,
    "AmbientOcclusion":         AO,
    "Smoothness":               0.15,
    "Specular":                 0.2,
    "Roughness":                0.85,
    "Metallic":                 1.0,
    "EnableRimLighting":        False,
    "EnableSubsurface":         False,
    "EnableGlow":               False,
    "EnableEnvironmentMapping": True,
    "EnvironmentMapScale":      0.15,
}

out = pathlib.Path("material.bgsm")
out.write_text(json.dumps(bgsm, indent=4))
print(f"BGSM generated: {out.resolve()}")
