"""Asset Library Browser for the Fallout 4 add-on.

Provides a searchable, filterable panel that lets the user point to a folder
(or a .blend library file) containing all their game assets — meshes, textures,
and materials.  Separate paths can be configured for each asset type so that
organised project layouts are fully supported.

Scanning builds a flat list of every importable file found under each path.
Items are shown in a UIList and can be appended / linked into the scene with
a single click.
"""

from __future__ import annotations

import os
from pathlib import Path

import bpy
from bpy.props import (
    BoolProperty,
    CollectionProperty,
    EnumProperty,
    IntProperty,
    StringProperty,
)
from bpy.types import Operator, PropertyGroup, UIList


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_MESH_EXTS: frozenset[str] = frozenset({
    '.fbx', '.obj', '.nif', '.gltf', '.glb', '.dae', '.ply', '.stl',
})
_TEXTURE_EXTS: frozenset[str] = frozenset({
    '.dds', '.png', '.tga', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.exr',
})
_MATERIAL_EXTS: frozenset[str] = frozenset({
    '.blend',
})
_ALL_EXTS: frozenset[str] = _MESH_EXTS | _TEXTURE_EXTS | _MATERIAL_EXTS

# Keywords used to infer an asset's category from its path / name.
# Checked in order; first match wins.
_CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("Characters", [
        "human", "character", "npc", "people", "person",
        "male", "female", "body", "head", "skeleton", "humanoid",
    ]),
    ("Weapons", [
        "weapon", "gun", "rifle", "pistol", "sword", "blade",
        "melee", "ammo", "explosive", "launcher", "knife", "axe", "hammer",
    ]),
    ("Vegetation", [
        "tree", "foliage", "plant", "bush", "shrub", "grass",
        "leaf", "flower", "weed", "vine", "vegetation", "nature",
    ]),
    ("Architecture", [
        "building", "arch", "wall", "floor", "ceiling", "door",
        "window", "ruin", "structure", "room", "interior", "exterior", "bridge",
    ]),
    ("Vehicles", [
        "vehicle", "car", "truck", "bus", "bike",
        "motorcycle", "tank", "plane", "helicopter", "boat", "ship",
    ]),
    ("Props", [
        "prop", "furniture", "table", "chair", "bed", "lamp",
        "box", "barrel", "crate", "cabinet", "shelf", "misc", "item",
    ]),
]

_CATEGORY_ITEMS: list[tuple[str, str, str]] = [
    ('ALL',          "All",          "Show every asset"),
    ('Meshes',       "Meshes",       "3D mesh files (FBX, OBJ, NIF …)"),
    ('Textures',     "Textures",     "Image / texture files (DDS, PNG, TGA …)"),
    ('Materials',    "Materials",    "Blender material libraries (.blend)"),
    ('Characters',   "Characters",   "Human / NPC models"),
    ('Weapons',      "Weapons",      "Weapon models"),
    ('Vegetation',   "Vegetation",   "Trees, plants, foliage"),
    ('Architecture', "Architecture", "Buildings and structures"),
    ('Vehicles',     "Vehicles",     "Vehicle models"),
    ('Props',        "Props",        "Props and miscellaneous items"),
    ('Other',        "Other",        "Uncategorised assets"),
]

def get_category_icon(category: str) -> str:
    """Return the Blender icon name for a given asset category."""
    return _CATEGORY_ICONS.get(category, 'DOT')

# Icons shown per category in the list
_CATEGORY_ICONS: dict[str, str] = {
    'Meshes':       'MESH_DATA',
    'Textures':     'IMAGE_DATA',
    'Materials':    'MATERIAL',
    'Characters':   'ARMATURE_DATA',
    'Weapons':      'GP_MULTIFRAME_EDITING',
    'Vegetation':   'OUTLINER_OB_CURVES',
    'Architecture': 'HOME',
    'Vehicles':     'AUTO',
    'Props':        'OBJECT_DATA',
    'Other':        'DOT',
}


def _detect_category(filepath: str, ext: str) -> str:
    """Return the most likely category for an asset given its path and extension."""
    lower = filepath.lower()
    for category, keywords in _CATEGORY_KEYWORDS:
        for kw in keywords:
            if kw in lower:
                return category
    if ext in _TEXTURE_EXTS:
        return 'Textures'
    if ext in _MATERIAL_EXTS:
        return 'Materials'
    return 'Meshes'


def _scan_folder(folder: str, allowed_exts: frozenset[str]) -> list[dict]:
    """Recursively collect importable files under *folder*."""
    results: list[dict] = []
    try:
        root = Path(folder)
        if not root.is_dir():
            return results
        for p in sorted(root.rglob("*")):
            if not p.is_file():
                continue
            ext = p.suffix.lower()
            if ext not in allowed_exts:
                continue
            results.append({
                "name":     p.stem,
                "filepath": str(p),
                "category": _detect_category(str(p), ext),
                "filetype": ext.lstrip('.').upper(),
            })
    except Exception as exc:
        print(f"[Asset Library] scan_folder({folder}): {exc}")
    return results


def _scan_blend(blend_path: str) -> list[dict]:
    """List every Object datablock inside a .blend without loading any data."""
    results: list[dict] = []
    try:
        with bpy.data.libraries.load(blend_path, link=False) as (src, _):
            for name in sorted(src.objects):
                results.append({
                    "name":     name,
                    "filepath": blend_path,
                    "category": _detect_category(name, '.blend'),
                    "filetype": "BLEND",
                })
    except Exception as exc:
        print(f"[Asset Library] scan_blend({blend_path}): {exc}")
    return results


# ---------------------------------------------------------------------------
# Property group — one row in the asset list
# ---------------------------------------------------------------------------

class FO4_AssetLibraryItem(PropertyGroup):
    """One entry in the scanned asset library."""
    # 'name' is inherited from PropertyGroup and is the display label
    filepath: StringProperty(name="File Path",  default="", subtype='FILE_PATH')
    category: StringProperty(name="Category",   default="Other")
    filetype: StringProperty(name="File Type",  default="")


# ---------------------------------------------------------------------------
# UIList — scrollable list with live search + category filtering
# ---------------------------------------------------------------------------

class FO4_UL_AssetLibrary(UIList):
    """Scrollable, filterable list of scanned game assets."""

    def draw_item(self, _ctx, layout, _data, item,
                  _icon, _active_data, _active_propname, _index):
        icon = _CATEGORY_ICONS.get(item.category, 'DOT')
        row = layout.row(align=True)
        row.label(text=item.name, icon=icon)
        sub = row.row()
        sub.alignment = 'RIGHT'
        sub.scale_x = 0.6
        sub.label(text=item.filetype)

    def filter_items(self, context, data, propname):
        items = getattr(data, propname)
        scene = context.scene
        search      = getattr(scene, 'fo4_asset_lib_search',   '').lower()
        cat_filter  = getattr(scene, 'fo4_asset_lib_category', 'ALL')

        flt_flags: list[int] = []
        for item in items:
            visible = True
            if search and (
                search not in item.name.lower()
                and search not in item.category.lower()
                and search not in item.filetype.lower()
            ):
                visible = False
            if cat_filter != 'ALL' and item.category != cat_filter:
                visible = False
            flt_flags.append(self.bitflag_filter_item if visible else 0)

        return flt_flags, []


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_SetAssetLibPath(Operator):
    """Choose a folder or .blend file that contains all your game assets"""
    bl_idname  = "fo4.set_asset_lib_path"
    bl_label   = "Set Asset Library Path"
    bl_description = (
        "Choose the folder (or .blend file) that holds all your assets. "
        "After setting the path the library is scanned automatically."
    )

    # Only used for the 'all' slot (file or folder picker)
    slot: StringProperty(default='all', options={'SKIP_SAVE'})

    filepath:  StringProperty(subtype='FILE_PATH')
    directory: StringProperty(subtype='DIR_PATH')
    filter_glob: StringProperty(
        default="*.blend;*.fbx;*.obj;*.nif;*.dds;*.png;*.tga",
        options={'HIDDEN'},
    )
    use_filter_folder: BoolProperty(default=True)

    def execute(self, context):
        path = (self.filepath or self.directory).rstrip("/\\")

        if not path:
            self.report({'ERROR'}, "No path selected")
            return {'CANCELLED'}

        setattr(context.scene, 'fo4_asset_lib_path', path)

        # Auto-scan immediately
        bpy.ops.fo4.scan_asset_library()
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SetAssetFolderPath(Operator):
    """Choose a folder for a specific asset type (meshes, textures, or materials)"""
    bl_idname  = "fo4.set_asset_folder_path"
    bl_label   = "Select Asset Folder"
    bl_description = (
        "Navigate to the folder that contains your assets and click "
        "'Accept' — the entire folder (including sub-folders) will be scanned."
    )

    # Which slot to fill: 'meshes', 'textures', or 'materials'
    slot: StringProperty(default='meshes', options={'SKIP_SAVE'})

    # Defining only 'directory' (no 'filepath') tells Blender to open the
    # file browser in folder-selection mode so the user picks a whole folder
    # rather than an individual file.
    directory: StringProperty(subtype='DIR_PATH')

    def execute(self, context):
        path = self.directory.rstrip("/\\")

        if not path:
            self.report({'ERROR'}, "No folder selected")
            return {'CANCELLED'}

        prop_map = {
            'meshes':    'fo4_asset_lib_mesh_path',
            'textures':  'fo4_asset_lib_tex_path',
            'materials': 'fo4_asset_lib_mat_path',
        }
        prop = prop_map.get(self.slot, 'fo4_asset_lib_mesh_path')
        setattr(context.scene, prop, path)

        # Auto-scan immediately
        bpy.ops.fo4.scan_asset_library()
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ScanAssetLibrary(Operator):
    """Scan all configured paths and rebuild the asset list"""
    bl_idname  = "fo4.scan_asset_library"
    bl_label   = "Scan Asset Library"
    bl_description = (
        "Scan the configured mesh, texture, and material paths and rebuild "
        "the browsable asset list"
    )

    def execute(self, context):
        scene = context.scene
        combined_path = bpy.path.abspath(
            getattr(scene, 'fo4_asset_lib_path', '').strip()
        )
        mesh_path = bpy.path.abspath(
            getattr(scene, 'fo4_asset_lib_mesh_path', '').strip()
        )
        tex_path  = bpy.path.abspath(
            getattr(scene, 'fo4_asset_lib_tex_path', '').strip()
        )
        mat_path  = bpy.path.abspath(
            getattr(scene, 'fo4_asset_lib_mat_path', '').strip()
        )

        if not any([combined_path, mesh_path, tex_path, mat_path]):
            self.report(
                {'WARNING'},
                "No asset paths configured — use 'Set Path' to choose a folder",
            )
            return {'CANCELLED'}

        all_items: list[dict] = []

        # Combined path (any asset type)
        if combined_path and Path(combined_path).exists():
            p = Path(combined_path)
            if p.suffix.lower() == '.blend':
                all_items.extend(_scan_blend(combined_path))
            elif p.is_dir():
                all_items.extend(_scan_folder(combined_path, _ALL_EXTS))

        # Dedicated mesh path — force category to 'Meshes' for any item
        # that didn't match a more specific keyword (e.g. 'Other' or 'Textures').
        if mesh_path and Path(mesh_path).is_dir():
            found = _scan_folder(mesh_path, _MESH_EXTS)
            _SEMANTIC = {
                'Characters', 'Weapons', 'Vegetation',
                'Architecture', 'Vehicles', 'Props',
            }
            for d in found:
                if d['category'] not in _SEMANTIC:
                    d['category'] = 'Meshes'
            all_items.extend(found)

        # Dedicated texture path
        if tex_path and Path(tex_path).is_dir():
            found = _scan_folder(tex_path, _TEXTURE_EXTS)
            for d in found:
                d['category'] = 'Textures'
            all_items.extend(found)

        # Dedicated material (.blend) path
        if mat_path and Path(mat_path).is_dir():
            found = _scan_folder(mat_path, _MATERIAL_EXTS)
            for d in found:
                if d['filetype'] == 'BLEND':
                    # Scan inside each .blend for objects
                    blend_items = _scan_blend(d['filepath'])
                    for bi in blend_items:
                        bi['category'] = 'Materials'
                    all_items.extend(blend_items)
                else:
                    d['category'] = 'Materials'
                    all_items.append(d)

        # Deduplicate by filepath + name
        seen: set[tuple[str, str]] = set()
        unique: list[dict] = []
        for d in all_items:
            key = (d['filepath'], d['name'])
            if key not in seen:
                seen.add(key)
                unique.append(d)

        lib = scene.fo4_asset_lib_items
        lib.clear()
        for d in unique:
            item = lib.add()
            item.name     = d['name']
            item.filepath = d['filepath']
            item.category = d['category']
            item.filetype = d['filetype']

        scene.fo4_asset_lib_active = 0
        count = len(unique)
        msg = f"Found {count} asset{'s' if count != 1 else ''}"
        self.report({'INFO'}, msg)
        return {'FINISHED'}


class FO4_OT_ImportLibraryAsset(Operator):
    """Append the selected asset into the current scene"""
    bl_idname  = "fo4.import_library_asset"
    bl_label   = "Import Selected"
    bl_description = (
        "Import (append) the highlighted asset into the current Blender scene"
    )
    bl_options = {'REGISTER', 'UNDO'}

    use_link: BoolProperty(
        name="Link instead of Append",
        description="Link the asset from the library rather than making a local copy",
        default=False,
    )

    def execute(self, context):
        from . import notification_system

        scene = context.scene
        lib   = scene.fo4_asset_lib_items
        idx   = scene.fo4_asset_lib_active

        if not lib or idx < 0 or idx >= len(lib):
            self.report({'WARNING'}, "No asset selected — click one in the list first")
            return {'CANCELLED'}

        item     = lib[idx]
        filepath = bpy.path.abspath(item.filepath)
        name     = item.name
        filetype = item.filetype

        try:
            if filetype == 'BLEND':
                op = bpy.ops.wm.link if self.use_link else bpy.ops.wm.append
                op(
                    filepath=os.path.join(filepath, "Object", name),
                    directory=os.path.join(filepath, "Object") + os.sep,
                    filename=name,
                )
                verb = "Linked" if self.use_link else "Appended"
                self.report({'INFO'}, f"{verb} '{name}' from blend library")

            elif filetype == 'FBX':
                bpy.ops.import_scene.fbx(filepath=filepath)
                self.report({'INFO'}, f"Imported FBX: {name}")

            elif filetype == 'OBJ':
                if hasattr(bpy.ops.wm, 'obj_import'):
                    bpy.ops.wm.obj_import(filepath=filepath)
                else:
                    bpy.ops.import_scene.obj(filepath=filepath)
                self.report({'INFO'}, f"Imported OBJ: {name}")

            elif filetype == 'NIF':
                if hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'nif'):
                    bpy.ops.import_scene.nif(filepath=filepath)
                    self.report({'INFO'}, f"Imported NIF: {name}")
                else:
                    self.report(
                        {'ERROR'},
                        "NIF import requires the Niftools add-on — install it via "
                        "Preferences → Add-ons",
                    )
                    return {'CANCELLED'}

            elif filetype in ('GLTF', 'GLB'):
                bpy.ops.import_scene.gltf(filepath=filepath)
                self.report({'INFO'}, f"Imported glTF: {name}")

            elif filetype == 'DAE':
                bpy.ops.wm.collada_import(filepath=filepath)
                self.report({'INFO'}, f"Imported Collada: {name}")

            elif filetype in (
                'DDS', 'PNG', 'TGA', 'JPG', 'JPEG', 'BMP', 'TIFF', 'TIF', 'EXR',
            ):
                bpy.data.images.load(filepath, check_existing=True)
                self.report({'INFO'}, f"Loaded texture: {name}")

            else:
                self.report(
                    {'WARNING'},
                    f"'{filetype}' format is not directly importable — "
                    "try opening it via File → Import",
                )
                return {'CANCELLED'}

            notification_system.FO4_NotificationSystem.notify(
                f"Imported '{name}'", 'INFO'
            )
            return {'FINISHED'}

        except (OSError, RuntimeError, TypeError, AttributeError) as exc:
            print(f"[Asset Library] Import failed for '{name}' ({filepath}): {exc}")
            self.report({'ERROR'}, f"Import failed: {exc}")
            return {'CANCELLED'}


class FO4_OT_ClearAssetLibrary(Operator):
    """Clear the scanned asset list without deleting any files"""
    bl_idname  = "fo4.clear_asset_library"
    bl_label   = "Clear List"
    bl_description = "Remove all entries from the asset list (no files are deleted)"

    def execute(self, context):
        context.scene.fo4_asset_lib_items.clear()
        context.scene.fo4_asset_lib_active = 0
        self.report({'INFO'}, "Asset library list cleared")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_CLASSES = [
    FO4_AssetLibraryItem,
    FO4_UL_AssetLibrary,
    FO4_OT_SetAssetLibPath,
    FO4_OT_SetAssetFolderPath,
    FO4_OT_ScanAssetLibrary,
    FO4_OT_ImportLibraryAsset,
    FO4_OT_ClearAssetLibrary,
]

_SCENE_PROPS: list[tuple[str, object]] = [
    # ── Paths ────────────────────────────────────────────────────────────────
    ("fo4_asset_lib_path", StringProperty(
        name="All Assets Path",
        description=(
            "Folder or .blend file that contains all your assets. "
            "Supports FBX, OBJ, NIF, glTF, DDS, PNG, TGA and .blend libraries"
        ),
        default="",
        subtype='FILE_PATH',
    )),
    ("fo4_asset_lib_mesh_path", StringProperty(
        name="Meshes Path",
        description="Dedicated folder for mesh files (FBX, OBJ, NIF, glTF …)",
        default="",
        subtype='DIR_PATH',
    )),
    ("fo4_asset_lib_tex_path", StringProperty(
        name="Textures Path",
        description="Dedicated folder for texture files (DDS, PNG, TGA, EXR …)",
        default="",
        subtype='DIR_PATH',
    )),
    ("fo4_asset_lib_mat_path", StringProperty(
        name="Materials Path",
        description=(
            "Dedicated folder for material libraries (.blend files whose "
            "objects will be listed for import)"
        ),
        default="",
        subtype='DIR_PATH',
    )),
    # ── List state ───────────────────────────────────────────────────────────
    ("fo4_asset_lib_items", CollectionProperty(type=FO4_AssetLibraryItem)),
    ("fo4_asset_lib_active", IntProperty(name="Active Asset", default=0, min=0)),
    # ── Filters ──────────────────────────────────────────────────────────────
    ("fo4_asset_lib_search", StringProperty(
        name="Search",
        description="Filter by name, category, or file type",
        default="",
    )),
    ("fo4_asset_lib_category", EnumProperty(
        name="Category",
        items=_CATEGORY_ITEMS,
        default='ALL',
    )),
]


def register() -> None:
    for cls in _CLASSES:
        bpy.utils.register_class(cls)
    for name, prop in _SCENE_PROPS:
        setattr(bpy.types.Scene, name, prop)


def unregister() -> None:
    for name, _ in reversed(_SCENE_PROPS):
        if hasattr(bpy.types.Scene, name):
            try:
                delattr(bpy.types.Scene, name)
            except Exception:
                pass
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
