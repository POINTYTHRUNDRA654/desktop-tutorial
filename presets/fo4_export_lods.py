"""
FO4 Auto-LOD NIF Exporter
Run inside Blender's Scripting tab with your LOD0 mesh selected.
Exports LOD0, LOD1, LOD2 as separate NIF files.
Requires pyNIF addon installed and configured for Fallout 4.
"""
import bpy, pathlib

obj = bpy.context.active_object
if obj is None:
    raise RuntimeError("Select the LOD0 mesh first")

base = obj.name.removesuffix("_LOD0")
out_dir = pathlib.Path(bpy.path.abspath("//"))  # Same folder as .blend file

lods = ["_LOD0", "_LOD1", "_LOD2"]
exported = []

for suffix in lods:
    lod_name = base + suffix
    lod_obj = bpy.data.objects.get(lod_name)
    if lod_obj is None:
        print(f"  SKIP: {lod_name} not found")
        continue

    # Deselect all, select this LOD
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = lod_obj
    lod_obj.select_set(True)

    out_path = str(out_dir / f"{lod_name}.nif")
    try:
        bpy.ops.export_scene.nif(filepath=out_path)
        exported.append(out_path)
        print(f"  Exported: {out_path}")
    except Exception as e:
        print(f"  ERROR exporting {lod_name}: {e}")

print(f"\nLOD NIFs exported ({len(exported)}/{len(lods)}):")
for f in exported:
    print(f"  {f}")
