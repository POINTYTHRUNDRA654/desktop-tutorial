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
        # bpy.ops.export_scene.nif is the OLD Niftools exporter (Blender <=3.6
        # only) -- PyNifly (what this script's docstring actually requires)
        # registers bpy.ops.export_scene.pynifly instead. intuit_defaults
        # must be forced off here too: it defaults True and is only forced
        # False inside PyNifly's own invoke() (the interactive File>Export
        # path), which this direct execute()-style call never goes through --
        # without it PyNifly silently re-detects the target game itself.
        bpy.ops.export_scene.pynifly(filepath=out_path, target_game='FO4',
                                      intuit_defaults=False)
        exported.append(out_path)
        print(f"  Exported: {out_path}")
    except Exception as e:
        print(f"  ERROR exporting {lod_name}: {e}")

print(f"\nLOD NIFs exported ({len(exported)}/{len(lods)}):")
for f in exported:
    print(f"  {f}")
