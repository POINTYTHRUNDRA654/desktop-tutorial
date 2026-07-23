"""
fo4_reference_library.py

Reference library: an index of known-good, in-game-working FO4 assets --
meshes, textures, and materials (e.g. a full extracted Data/ folder) -- that
Mossy pulls real examples from when working on similar assets, instead of
guessing at FO4 conventions.

Two tiers per asset kind, because the reference library can be huge (the
vanilla+DLC FO4 mesh library alone is ~224k .nif files) and a full structural
parse of every file up front is impractical:

  1. Fast index (:func:`build_index`) -- pure path walk, no file parsing.
     Persisted once as JSON per kind; category = the asset's top-level
     sub-folder under the configured root (Armor, Weapons, Actors, ...).
  2. Deep-parse cache (:func:`get_reference_examples`) -- real structural
     introspection, done lazily and only for the handful of files actually
     looked up, cached to a second JSON file keyed by relative path:
       - mesh:     PyNifly ``NifFile`` (shape/block type, shader, alpha,
                   partitions)
       - material: ``bgsm_helpers.read_bgsm`` (texture slots, alpha/shader
                   flags, specular/smoothness)
       - texture:  a minimal DDS header read (width/height/format/mipmaps --
                   never loads pixel data)
"""

from __future__ import annotations

import json
import os
import random
import struct
import threading
from pathlib import Path

try:
    import bpy
except Exception:
    bpy = None

try:
    from io_scene_nifly.pyn import pynifly as _pynifly
except Exception:
    _pynifly = None

# kind -> (index json filename, deep-cache json filename, file extensions)
_KINDS = {
    "mesh":     ("fo4_reference_mesh_index.json", "fo4_reference_mesh_structures.json", (".nif",)),
    "material": ("fo4_reference_material_index.json", "fo4_reference_material_structures.json", (".bgsm", ".bgem")),
    "texture":  ("fo4_reference_texture_index.json", "fo4_reference_texture_structures.json", (".dds",)),
}

_index_cache: dict = {}   # kind -> index dict
_deep_cache: dict = {}    # kind -> {relpath: info}


def is_available() -> bool:
    """True if PyNifly's low-level Python API could be imported (needed for
    the mesh deep-parse cache -- materials/textures don't need it)."""
    return _pynifly is not None


def _tools_root() -> Path:
    from . import tool_installers
    return tool_installers.get_tools_root()


def _index_path(kind: str) -> Path:
    return _tools_root() / _KINDS[kind][0]


def _deep_cache_path(kind: str) -> Path:
    return _tools_root() / _KINDS[kind][1]


def derive_sibling_root(meshes_root, sibling_name: str) -> "str | None":
    """Given a Meshes-folder root, return the sibling folder with the same
    parent (e.g. .../Meshes -> .../Textures), mirroring the same convention
    export_helpers.py already uses for BGSM output paths. Returns None if the
    root doesn't look like a Meshes folder or the sibling doesn't exist."""
    root = Path(meshes_root)
    if root.name.lower() != "meshes":
        return None
    candidate = root.parent / sibling_name
    return str(candidate) if candidate.is_dir() else None


def build_index(root, kind: str = "mesh", progress_cb=None) -> dict:
    """Walk *root* and record ``{name, relpath, category}`` for every file
    matching *kind*'s extensions. Pure path walk -- no file parsing. Returns
    the index dict and writes it to disk. ``progress_cb(count, relpath)``,
    if given, is called periodically so a caller can report progress."""
    extensions = _KINDS[kind][2]
    root = Path(root)
    entries = []
    count = 0
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in filenames:
            if not fn.lower().endswith(extensions):
                continue
            full = Path(dirpath) / fn
            try:
                rel = full.relative_to(root)
            except ValueError:
                rel = full
            parts = rel.parts
            category = parts[0] if parts else "Unknown"
            entries.append({"name": full.stem, "relpath": str(rel), "category": category})
            count += 1
            if progress_cb and count % 2000 == 0:
                progress_cb(count, str(rel))

    index = {"root": str(root), "count": len(entries), "entries": entries}
    tools_root = _tools_root()
    tools_root.mkdir(parents=True, exist_ok=True)
    with open(_index_path(kind), "w", encoding="utf-8") as f:
        json.dump(index, f)

    _index_cache[kind] = index
    if progress_cb:
        progress_cb(count, "done")
    return index


def get_index(kind: str = "mesh", force_reload: bool = False):
    """Load the persisted fast index for *kind*, or None if not built yet."""
    if kind in _index_cache and not force_reload:
        return _index_cache[kind]
    path = _index_path(kind)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                _index_cache[kind] = json.load(f)
                return _index_cache[kind]
        except Exception as exc:
            print(f"[FO4RefLib] failed to load {kind} index: {exc}")
    return None


def _load_deep_cache(kind: str) -> dict:
    if kind in _deep_cache:
        return _deep_cache[kind]
    path = _deep_cache_path(kind)
    cache = {}
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            pass
    _deep_cache[kind] = cache
    return cache


def _save_deep_cache(kind: str):
    try:
        tools_root = _tools_root()
        tools_root.mkdir(parents=True, exist_ok=True)
        with open(_deep_cache_path(kind), "w", encoding="utf-8") as f:
            json.dump(_deep_cache.get(kind, {}), f)
    except Exception as exc:
        print(f"[FO4RefLib] failed to save {kind} deep cache: {exc}")


def _parse_mesh(full_path) -> dict:
    if not is_available():
        return {"error": "PyNifly Python API not available"}
    nf = _pynifly.NifFile(str(full_path))
    info = {"root_name": nf.root.name, "shapes": []}
    for shape in nf.shapes:
        info["shapes"].append({
            "name": shape.name,
            "block_type": type(shape).__name__,
            "shader": shape.shader_block_name,
            "has_alpha": bool(shape.has_alpha_property),
            "partitions": [p.name for p in (shape.partitions or [])],
        })
    return info


def _parse_material(full_path) -> dict:
    from . import bgsm_helpers
    with open(full_path, "rb") as f:
        raw = f.read()
    try:
        data = bgsm_helpers.read_bgsm(raw)
    except Exception:
        data = bgsm_helpers._bgsm_scrape_textures(raw)
        if data is None:
            raise
    return {
        "diffuse": getattr(data, "diffuse_texture", ""),
        "normal": getattr(data, "normal_texture", ""),
        "specular": getattr(data, "smooth_spec_texture", ""),
        "glow": getattr(data, "glow_texture", ""),
        "alpha_test": bool(getattr(data, "alpha_test", False)),
        "smoothness": getattr(data, "smoothness", None),
        "shader_flags1": getattr(data, "shader_flags1", None),
        "shader_flags2": getattr(data, "shader_flags2", None),
    }


def _parse_texture(full_path) -> dict:
    """Minimal DDS header read -- width/height/format/mipmaps. Never reads
    pixel data (the header is the first ~148 bytes of the file)."""
    with open(full_path, "rb") as f:
        head = f.read(148)
    if len(head) < 128 or head[:4] != b"DDS ":
        return {"error": "not a DDS file"}
    height = struct.unpack_from("<I", head, 12)[0]
    width = struct.unpack_from("<I", head, 16)[0]
    mipmaps = struct.unpack_from("<I", head, 28)[0]
    fourcc = head[84:88]
    if fourcc == b"DX10" and len(head) >= 132:
        dxgi_fmt = struct.unpack_from("<I", head, 128)[0]
        fmt = f"DXGI_{dxgi_fmt}"
    else:
        try:
            fmt = fourcc.decode("ascii").strip("\x00") or "uncompressed"
        except Exception:
            fmt = fourcc.hex()
    return {"width": width, "height": height, "format": fmt, "mipmaps": mipmaps}


_PARSERS = {"mesh": _parse_mesh, "material": _parse_material, "texture": _parse_texture}


def _deep_parse(kind: str, full_path, relpath: str):
    cache = _load_deep_cache(kind)
    if relpath in cache:
        return cache[relpath]
    try:
        info = _PARSERS[kind](full_path)
    except Exception as exc:
        info = {"error": str(exc)}
    cache[relpath] = info
    _save_deep_cache(kind)
    return info


def _summarize(kind: str, info: dict) -> "str | None":
    if not info or info.get("error"):
        return None
    if kind == "mesh":
        bits = []
        for s in info.get("shapes", [])[:2]:
            bit = s["block_type"]
            if s.get("partitions"):
                bit += f" +{len(s['partitions'])} partition(s)"
            if s.get("has_alpha"):
                bit += " +alpha"
            bits.append(bit)
        return "; ".join(bits) if bits else None
    if kind == "material":
        slots = [k for k in ("diffuse", "normal", "specular", "glow") if info.get(k)]
        bit = f"slots={'/'.join(slots) or 'none'}"
        if info.get("alpha_test"):
            bit += " +alpha_test"
        if info.get("smoothness") is not None:
            bit += f" smoothness={info['smoothness']:.0f}"
        return bit
    if kind == "texture":
        return f"{info.get('width')}x{info.get('height')} {info.get('format')} ({info.get('mipmaps')} mips)"
    return None


def get_reference_examples(category: str, root=None, n: int = 2, kind: str = "mesh") -> str:
    """Return a short plain-text summary of up to *n* real assets of *kind*
    matching *category* (case-insensitive substring match against the fast
    index's category field). Deep-parses only those *n* files (cached), so
    this stays cheap even against a 200k+-file index. Empty string if the
    index hasn't been built or nothing matches."""
    index = get_index(kind)
    if not index or not index.get("entries"):
        return ""
    entries = [e for e in index["entries"] if category.lower() in e["category"].lower()]
    if not entries:
        return ""
    sample = random.sample(entries, min(n, len(entries)))
    root_path = Path(root or index.get("root", ""))
    lines = []
    for e in sample:
        info = _deep_parse(kind, root_path / e["relpath"], e["relpath"])
        summary = _summarize(kind, info)
        if summary:
            lines.append(f"- {e['name']} ({e['relpath']}): {summary}")
    if not lines:
        return ""
    label = {"mesh": "meshes", "material": "materials", "texture": "textures"}[kind]
    return f"Reference {label} from the FO4 library ({category}):\n" + "\n".join(lines)


def scan_in_background(root, kind: str = "mesh", on_done=None):
    """Run build_index() on a worker thread so the UI stays responsive."""
    def _run():
        try:
            index = build_index(root, kind=kind)
            if on_done:
                on_done(True, f"Indexed {index['count']:,} {kind} file(s)")
        except Exception as exc:
            if on_done:
                on_done(False, str(exc))
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t


# ---------------------------------------------------------------------------
# Operator + registration
# ---------------------------------------------------------------------------
if bpy is not None:

    class FO4_OT_ScanReferenceMeshLibrary(bpy.types.Operator):
        """Scan the configured FO4 Reference Mesh Library folder (meshes,
        plus its sibling Textures/Materials folders if present) and build
        fast name/category indexes. Run this once after setting the path (or
        whenever the folder changes) -- Mossy uses the resulting indexes to
        pull in real examples automatically."""
        bl_idname  = "fo4.scan_reference_mesh_library"
        bl_label   = "Scan Reference Mesh Library"
        bl_options = {'REGISTER'}

        def execute(self, context):
            from . import preferences as _prefs_mod
            prefs = _prefs_mod.get_preferences()
            root = (getattr(prefs, "fo4_reference_meshes_path", "") or "").strip()
            if not root:
                self.report({'ERROR'}, "Set 'FO4 Reference Mesh Library' path in preferences first")
                return {'CANCELLED'}
            if not os.path.isdir(root):
                self.report({'ERROR'}, f"Not a folder: {root}")
                return {'CANCELLED'}

            def _on_done(kind):
                def _cb(ok, msg):
                    try:
                        from . import notification_system
                        notification_system.FO4_NotificationSystem.notify(
                            f"Reference {kind} library: {msg}", 'INFO' if ok else 'ERROR'
                        )
                    except Exception:
                        print(f"[FO4RefLib] {kind}: {msg}")
                return _cb

            scan_in_background(root, kind="mesh", on_done=_on_done("mesh"))

            tex_root = derive_sibling_root(root, "Textures")
            if tex_root:
                scan_in_background(tex_root, kind="texture", on_done=_on_done("texture"))
            mat_root = derive_sibling_root(root, "Materials")
            if mat_root:
                scan_in_background(mat_root, kind="material", on_done=_on_done("material"))

            self.report({'INFO'}, f"Scanning '{root}' (+ sibling Textures/Materials if found) in the background")
            return {'FINISHED'}

    _classes = (FO4_OT_ScanReferenceMeshLibrary,)
else:
    _classes = ()


def register():
    if bpy is None:
        return
    for cls in _classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"[FO4RefLib] register {cls.__name__} failed: {exc}")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
