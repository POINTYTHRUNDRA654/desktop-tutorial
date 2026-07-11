"""
FO4 Texture Enhancement Pipeline
Auto-detects source resolution and picks the correct upscale tier:
  1K  → 4K intermediate  → normal/specular/AO extracted → output at 1K
  2K  → 8K intermediate  → normal/specular/AO extracted → output at 2K
  4K  → 16K intermediate → normal/specular/AO extracted → output at 4K

Uses the addon's fo4.enhance_texture_1k operator (tier property selects the mode).
Run inside Blender's Scripting tab with your mesh selected.
"""
import bpy, os

obj = bpy.context.active_object
if obj is None or obj.type != 'MESH':
    raise RuntimeError("Select a mesh object first")

mat = obj.active_material
if mat is None or not mat.use_nodes:
    raise RuntimeError("Active material has no nodes")

# Find BaseColor image texture node
img_node = next(
    (n for n in mat.node_tree.nodes
     if n.type == 'TEX_IMAGE' and n.image),
    None
)
if img_node is None or img_node.image is None:
    raise RuntimeError("No Image Texture node found — assign your diffuse texture first")

base_path = bpy.path.abspath(img_node.image.filepath)
if not os.path.exists(base_path):
    raise RuntimeError(f"Texture file not found: {base_path}")

# Auto-detect source resolution → pick tier
w, h = img_node.image.size
short = min(w, h)
if short >= 3072:
    tier = "4K_16K"   # 4K → 16K intermediate → output 4K
elif short >= 1536:
    tier = "2K_8K"    # 2K → 8K intermediate  → output 2K
else:
    tier = "1K_4K"    # 1K → 4K intermediate  → output 1K

print(f"[FO4 Texture Pipeline] Source: {w}x{h}  →  tier: {tier}")
print(f"  Upscale 4× → generate normal/specular/AO → downscale → DDS BC7")

# ── Run full 4-stage pipeline ─────────────────────────────────────────────
bpy.ops.fo4.enhance_texture_1k(filepath=base_path, tier=tier)

# ── Convert all object textures to DDS BC7 ────────────────────────────────
bpy.ops.fo4.convert_object_textures_to_dds()

# ── Report outputs ────────────────────────────────────────────────────────
stem = os.path.splitext(os.path.basename(base_path))[0].replace("_d", "")
base_dir = os.path.dirname(base_path)
out_size = {"1K_4K": "1024", "2K_8K": "2048", "4K_16K": "4096"}.get(tier, "?")
print(f"\nFO4 texture pipeline complete. Output at {out_size}px:")
for suffix in ("_d.dds", "_n.dds", "_s.dds", "_ao.dds"):
    out = os.path.join(base_dir, stem + suffix)
    print(f"  {'✓' if os.path.exists(out) else '?'} {os.path.basename(out)}")
