"""
fo4_scanner.py — Fallout 4 Game Asset Scanner
==============================================
Adds an "FO4 Asset Scanner" section to the FO4 Pipeline sidebar.

Operators:
  fo4.scan_quick             - Check paths, count assets, read F4SE plugins (~2s)
  fo4.scan_bones             - Validate selected armature against FO4 bone names (instant)
  fo4.scan_textures          - Sample DDS files, extract suffix patterns (~10-20s, background)
  fo4.scan_meshes            - Catalog NIF files by category (~10-30s, background)
  fo4.validate_texture_slots - Check material texture nodes use correct FO4 suffixes + color space
  fo4.find_vanilla_mesh      - Search vanilla NIF catalog by keyword
  fo4.push_scan_to_mossy     - Push cached scan data to Mossy's brain neuron system
  fo4.clear_scan_cache       - Clear all locally cached scan results
"""

from __future__ import annotations

import bpy
import json
import os
import re
import sys
import time
import threading
import tempfile
from collections import Counter
from bpy.props import StringProperty, BoolProperty
from bpy.types import Operator, Panel, PropertyGroup
from bpy.utils import register_class, unregister_class

# Mossy link — graceful fallback if unavailable
try:
    from . import mossy_link as _mossy
    _MOSSY_AVAILABLE = True
except ImportError:
    _mossy = None  # type: ignore[assignment]
    _MOSSY_AVAILABLE = False

# ---------------------------------------------------------------------------
# Reference data — hardcoded FO4 standards, no disk read needed
# ---------------------------------------------------------------------------

FO4_BIPED_BONES: list[str] = [
    "Bip01", "Bip01 Pelvis",
    "Bip01 Spine", "Bip01 Spine1", "Bip01 Spine2",
    "Bip01 Neck", "Bip01 Neck1", "Bip01 Head",
    "Bip01 L Clavicle", "Bip01 L UpperArm", "Bip01 L Forearm", "Bip01 L Hand",
    "Bip01 L Finger0", "Bip01 L Finger01",
    "Bip01 L Finger1", "Bip01 L Finger11",
    "Bip01 L Finger2", "Bip01 L Finger21",
    "Bip01 L Finger3", "Bip01 L Finger31",
    "Bip01 L Finger4", "Bip01 L Finger41",
    "Bip01 R Clavicle", "Bip01 R UpperArm", "Bip01 R Forearm", "Bip01 R Hand",
    "Bip01 R Finger0", "Bip01 R Finger01",
    "Bip01 R Finger1", "Bip01 R Finger11",
    "Bip01 R Finger2", "Bip01 R Finger21",
    "Bip01 R Finger3", "Bip01 R Finger31",
    "Bip01 R Finger4", "Bip01 R Finger41",
    "Bip01 L Thigh", "Bip01 L Calf", "Bip01 L Foot", "Bip01 L Toe0",
    "Bip01 R Thigh", "Bip01 R Calf", "Bip01 R Foot", "Bip01 R Toe0",
]

FO4_POWER_ARMOR_BONES: list[str] = [
    "PA_Helmet", "PA_Chest",
    "PA_LArm_Upper", "PA_LArm_Lower",
    "PA_RArm_Upper", "PA_RArm_Lower",
    "PA_LLeg_Upper", "PA_LLeg_Lower",
    "PA_RLeg_Upper", "PA_RLeg_Lower",
]

FO4_ALL_VALID_BONES: set[str] = set(
    FO4_BIPED_BONES + FO4_POWER_ARMOR_BONES
    + ["Weapon", "WEAPON", "Shield", "COM", "HEAD", "Neck",
       "NPC Root [Root]", "NPC COM [COM ]", "Camera3rd [Cam0]"]
)

TEXTURE_SUFFIXES: dict[str, str] = {
    "_d":   "Diffuse / Albedo — sRGB color space",
    "_n":   "Normal Map — Non-Color, connect via Normal Map node",
    "_s":   "Specular / Gloss — Non-Color",
    "_g":   "Glow / Emissive — sRGB, connect to Emission",
    "_e":   "Environment Mask — Non-Color, mix factor for env reflections",
    "_r":   "Reflection / Roughness — Non-Color",
    "_a":   "Alpha / Ambient — Non-Color",
    "_ao":  "Ambient Occlusion — Non-Color",
    "_em":  "Emissive Mask — Non-Color",
    "_m":   "Metalness / Mask — Non-Color",
}

# Suffixes that must be loaded as Non-Color (everything except diffuse + glow)
_LINEAR_SUFFIXES: frozenset[str] = frozenset(
    {"_n", "_s", "_e", "_r", "_a", "_ao", "_em", "_m"}
)

_SUFFIX_RE = re.compile(
    r'_(d|n|s|g|e|r|a|ao|em|m)(?:\.dds)?$', re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Scan result cache — stored in OS temp dir, 7-day default TTL
# ---------------------------------------------------------------------------

_CACHE_DIR  = os.path.join(tempfile.gettempdir(), "mossy_fo4_scan")
_CACHE_FILE = os.path.join(_CACHE_DIR, "scan_cache.json")


def _load_cache() -> dict:
    try:
        if os.path.isfile(_CACHE_FILE):
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_cache(data: dict) -> None:
    os.makedirs(_CACHE_DIR, exist_ok=True)
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[fo4_scanner] Cache write failed: {e}")


def _cache_get(key: str, max_age_hours: float = 168.0) -> dict | None:
    entry = _load_cache().get(key)
    if not entry:
        return None
    if (time.time() - entry.get("timestamp", 0)) / 3600 > max_age_hours:
        return None
    return entry.get("data")


def _cache_set(key: str, data: dict) -> None:
    cache = _load_cache()
    cache[key] = {"timestamp": time.time(), "data": data}
    _save_cache(cache)


# ---------------------------------------------------------------------------
# Path resolution — prefs → Mossy → fallback
# ---------------------------------------------------------------------------

_FO4_FALLBACK_ROOTS: list[str] = [
    r"F:\FO4 WORKING FLODER",
    r"E:\Steam\steamapps\common\Fallout 4\Data",
    r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data",
    r"D:\Steam\steamapps\common\Fallout 4\Data",
]


def _resolve_fo4_root(override: str = "") -> str:
    if override and os.path.isdir(override):
        return override

    # Try add-on prefs
    try:
        addon_prefs = bpy.context.preferences.addons.get(__package__)
        if addon_prefs:
            p = getattr(addon_prefs.preferences, "assets_root", "")
            if p and os.path.isdir(p):
                return p
    except Exception:
        pass

    # Try Mossy
    if _MOSSY_AVAILABLE and _mossy:
        try:
            p = _mossy.get_tool_path("fallout4Path")
            if p and os.path.isdir(p):
                return p
        except Exception:
            pass

    # Fallback
    for p in _FO4_FALLBACK_ROOTS:
        if os.path.isdir(p):
            return p
    return ""


# ---------------------------------------------------------------------------
# Pure scan functions — no bpy, safe to call from background threads
# ---------------------------------------------------------------------------

def _do_quick_scan(fo4_root: str) -> dict:
    result: dict = {
        "fo4_root": fo4_root,
        "dirs": {},
        "asset_counts": {},
        "missing_dirs": [],
        "f4se_plugins": [],
        "f4se_known": [],
    }

    for subdir in ("Meshes", "Textures", "Materials", "Sound", "Scripts", "Strings"):
        full = os.path.join(fo4_root, subdir)
        if os.path.isdir(full):
            result["dirs"][subdir] = full
            try:
                count = sum(len(fs) for _, _, fs in os.walk(full))
                result["asset_counts"][subdir] = count
            except Exception:
                result["asset_counts"][subdir] = -1
        else:
            result["missing_dirs"].append(subdir)

    # F4SE plugins
    f4se_dir = r"E:\Steam\steamapps\common\Fallout 4\Data\F4SE\Plugins"
    if os.path.isdir(f4se_dir):
        dlls = [f[:-4] for f in os.listdir(f4se_dir) if f.lower().endswith(".dll")]
        result["f4se_plugins"] = dlls
        _known = {
            "papyrusutil":  "PapyrusUtil — StorageUtil/MiscUtil/ActorUtil APIs",
            "mch":          "MCM Helper — user-configurable mod menus",
            "mcm":          "MCM Helper — user-configurable mod menus",
            "buffout4":     "Buffout4 — crash logger, logs at Documents/.../F4SE/",
            "f4se":         "F4SE core",
            "looksmenu":    "LooksMenu — character customization",
            "aaf":          "AAF — Adult Animation Framework",
        }
        result["f4se_known"] = [
            f"{dll}: {_known[dll.lower()]}"
            for dll in dlls if dll.lower() in _known
        ]

    return result


def _do_texture_scan(fo4_root: str, sample_limit: int = 6000) -> dict:
    tex_dir = os.path.join(fo4_root, "Textures")
    result: dict = {
        "tex_dir": tex_dir,
        "files_sampled": 0,
        "suffix_counts": {},
        "categories": {},
        "suffix_meanings": TEXTURE_SUFFIXES,
        "blender_node_setup": [
            "_d.dds → Image Texture [sRGB] → Principled BSDF Base Color",
            "_n.dds → Image Texture [Non-Color] → Normal Map node → Normal",
            "_s.dds → Image Texture [Non-Color] → Specular",
            "_g.dds → Image Texture [sRGB] → Emission Color + Strength",
            "_e.dds → Image Texture [Non-Color] → mix/env mask factor",
        ],
        "resolution_guide": {
            "512x512":   "Small props, UI elements, distant LOD",
            "1024x1024": "Standard props, clothing, weapons",
            "2048x2048": "Main character surfaces, architecture",
            "4096x4096": "Hero assets only — large landscape tiles",
        },
    }

    if not os.path.isdir(tex_dir):
        result["error"] = f"Directory not found: {tex_dir}"
        return result

    suffix_c: Counter = Counter()
    cat_c: Counter = Counter()

    for root, _, files in os.walk(tex_dir):
        rel = os.path.relpath(root, tex_dir)
        cat = rel.split(os.sep)[0] if os.sep in rel else rel
        for f in files:
            if not f.lower().endswith(".dds"):
                continue
            m = _SUFFIX_RE.search(os.path.splitext(f)[0].lower())
            if m:
                suffix_c[f"_{m.group(1)}"] += 1
            cat_c[cat] += 1
            result["files_sampled"] += 1
            if result["files_sampled"] >= sample_limit:
                break
        if result["files_sampled"] >= sample_limit:
            break

    result["suffix_counts"] = dict(suffix_c.most_common())
    result["categories"] = dict(cat_c.most_common(20))
    return result


def _do_mesh_scan(fo4_root: str, depth: int = 2, sample_cap: int = 40) -> dict:
    mesh_dir = os.path.join(fo4_root, "Meshes")
    result: dict = {
        "mesh_dir": mesh_dir,
        "categories": {},
        "sample_paths": [],
        "total": 0,
    }

    if not os.path.isdir(mesh_dir):
        result["error"] = f"Directory not found: {mesh_dir}"
        return result

    def _walk(path: str, remaining: int) -> list[str]:
        if remaining <= 0:
            return []
        out: list[str] = []
        try:
            for e in os.scandir(path):
                if e.is_dir(follow_symlinks=False):
                    out.extend(_walk(e.path, remaining - 1))
                elif e.name.lower().endswith(".nif"):
                    out.append(e.path)
        except OSError:
            pass
        return out

    cat_c: Counter = Counter()
    samples: list[str] = []
    total = 0

    try:
        for top in os.scandir(mesh_dir):
            if not top.is_dir():
                continue
            nifs = _walk(top.path, depth)
            cat_c[top.name] = len(nifs)
            total += len(nifs)
            for n in nifs[:sample_cap]:
                rel = os.path.relpath(n, mesh_dir).replace(os.sep, "/")
                samples.append(f"Meshes/{rel}")
    except OSError as exc:
        result["error"] = str(exc)

    result["categories"] = dict(cat_c.most_common(30))
    result["sample_paths"] = samples
    result["total"] = total
    return result


def _do_bone_check(context: bpy.types.Context) -> dict:
    result: dict = {
        "checked": 0,
        "valid": [],
        "invalid": [],
        "missing_essential": [],
        "compatible": False,
    }

    essential = {"Bip01", "Bip01 Pelvis", "Bip01 Spine"}

    for obj in context.selected_objects:
        arm = obj if obj.type == "ARMATURE" else (
            obj.parent if (obj.type == "MESH" and obj.parent
                          and obj.parent.type == "ARMATURE") else None
        )
        if not arm:
            continue
        result["checked"] += 1
        names = [b.name for b in arm.data.bones]
        for n in names:
            (result["valid"] if n in FO4_ALL_VALID_BONES else result["invalid"]).append(n)
        result["missing_essential"] = list(essential - set(names))
        result["compatible"] = (
            len(result["invalid"]) == 0
            and len(result["missing_essential"]) == 0
        )

    return result


def _do_mesh_search(fo4_root: str, keyword: str, limit: int = 25) -> list[str]:
    mesh_dir = os.path.join(fo4_root, "Meshes")
    if not os.path.isdir(mesh_dir):
        return []
    kw = keyword.lower()
    hits: list[str] = []
    for root, _, files in os.walk(mesh_dir):
        for f in files:
            if f.lower().endswith(".nif") and kw in f.lower():
                rel = os.path.relpath(os.path.join(root, f), mesh_dir).replace(os.sep, "/")
                hits.append(f"Meshes/{rel}")
                if len(hits) >= limit:
                    return hits
    return hits


# ---------------------------------------------------------------------------
# Scene property group
# ---------------------------------------------------------------------------

class FO4ScannerState(PropertyGroup):
    status:          StringProperty(default="")
    fo4_root_override: StringProperty(
        name="FO4 Root",
        description="Override auto-detected FO4 asset root (leave blank for auto)",
        default="",
        subtype="DIR_PATH",
    )
    search_keyword:  StringProperty(
        name="Search",
        description="Keyword to search vanilla mesh catalog (e.g. 'vault', 'pipe', 'desk')",
        default="",
    )


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class FO4_OT_scan_quick(Operator):
    """Check FO4 directories exist, count total assets, list F4SE plugins (~2s)"""
    bl_idname = "fo4.scan_quick"
    bl_label = "Quick Scan"

    def execute(self, context):
        root = _resolve_fo4_root(context.scene.fo4_scanner.fo4_root_override)
        if not root:
            self.report({"ERROR"}, "FO4 path not found — set Override above or configure in add-on prefs")
            return {"CANCELLED"}

        data = _do_quick_scan(root)
        _cache_set("quick", data)

        counts = data.get("asset_counts", {})
        status_parts = [f"{k}: {v:,}" for k, v in list(counts.items())[:4]]
        context.scene.fo4_scanner.status = " | ".join(status_parts)

        if data.get("missing_dirs"):
            self.report({"WARNING"}, f"Missing dirs: {', '.join(data['missing_dirs'])}")

        plugins = data.get("f4se_plugins", [])
        self.report({"INFO"},
            f"Scan OK — {len(data['dirs'])} dirs found, "
            f"{len(plugins)} F4SE plugin(s). See System Console for details.")

        print("\n[fo4_scanner] Quick Scan Results")
        print(f"  Root: {root}")
        for d, c in counts.items():
            print(f"  {d}: {c:,} files")
        if plugins:
            print(f"  F4SE plugins: {', '.join(plugins)}")
        for note in data.get("f4se_known", []):
            print(f"    → {note}")
        print()

        if _MOSSY_AVAILABLE and _mossy:
            _mossy.send_event("fo4_scan_complete", {"scan": "quick", "root": root, "data": data})

        return {"FINISHED"}


class FO4_OT_scan_bones(Operator):
    """Check selected armature or skinned mesh bone names against FO4 skeleton"""
    bl_idname = "fo4.scan_bones"
    bl_label = "Check Bones"

    def execute(self, context):
        r = _do_bone_check(context)

        if r["checked"] == 0:
            self.report({"WARNING"}, "Select an armature or skinned mesh first")
            return {"CANCELLED"}

        if r["compatible"]:
            self.report({"INFO"}, f"{len(r['valid'])} valid FO4 bones — rig is compatible")
        else:
            if r["invalid"]:
                preview = ", ".join(r["invalid"][:4])
                extra = f" +{len(r['invalid'])-4} more" if len(r["invalid"]) > 4 else ""
                self.report({"ERROR"}, f"Non-FO4 bones: {preview}{extra}")
            if r["missing_essential"]:
                self.report({"WARNING"}, f"Missing: {', '.join(r['missing_essential'])}")

        print("\n[fo4_scanner] Bone Check")
        print(f"  Valid bones ({len(r['valid'])}): {', '.join(r['valid'][:10])}")
        if r["invalid"]:
            print(f"  INVALID ({len(r['invalid'])}): {', '.join(r['invalid'])}")
        if r["missing_essential"]:
            print(f"  MISSING essential: {', '.join(r['missing_essential'])}")
        print()

        if _MOSSY_AVAILABLE and _mossy:
            _mossy.send_event("fo4_bone_check", r)
        return {"FINISHED"}


class FO4_OT_scan_textures(Operator):
    """Sample DDS files to extract FO4 texture suffix conventions (background, ~10-20s)"""
    bl_idname = "fo4.scan_textures"
    bl_label = "Scan Textures"

    def execute(self, context):
        root = _resolve_fo4_root(context.scene.fo4_scanner.fo4_root_override)
        if not root:
            self.report({"ERROR"}, "FO4 path not found")
            return {"CANCELLED"}

        context.scene.fo4_scanner.status = "Texture scan running..."
        self.report({"INFO"}, "Texture scan started — check System Console for progress")

        def _bg():
            data = _do_texture_scan(root)
            _cache_set("textures", data)
            top = list(data.get("suffix_counts", {}).items())[:6]
            msg = (f"Texture scan done: {data['files_sampled']:,} files. "
                   f"Top suffixes: {', '.join(f'{s}({c:,})' for s, c in top)}")
            print(f"[fo4_scanner] {msg}")

            def _ui_update():
                try:
                    bpy.context.scene.fo4_scanner.status = (
                        f"Textures: {data['files_sampled']:,} files scanned"
                    )
                except Exception:
                    pass
                return None  # unregister timer

            bpy.app.timers.register(_ui_update, first_interval=0.1)

            if _MOSSY_AVAILABLE and _mossy:
                _mossy.send_event("fo4_scan_complete", {"scan": "textures", "data": data})

        threading.Thread(target=_bg, daemon=True).start()
        return {"FINISHED"}


class FO4_OT_scan_meshes(Operator):
    """Walk NIF directories and catalog mesh categories (background, ~10-30s)"""
    bl_idname = "fo4.scan_meshes"
    bl_label = "Scan Meshes"

    def execute(self, context):
        root = _resolve_fo4_root(context.scene.fo4_scanner.fo4_root_override)
        if not root:
            self.report({"ERROR"}, "FO4 path not found")
            return {"CANCELLED"}

        context.scene.fo4_scanner.status = "Mesh scan running..."
        self.report({"INFO"}, "Mesh scan started — check System Console for progress")

        def _bg():
            data = _do_mesh_scan(root)
            _cache_set("meshes", data)
            top = list(data.get("categories", {}).items())[:6]
            msg = (f"Mesh scan done: {data['total']:,} NIFs. "
                   f"Top: {', '.join(f'{k}({v:,})' for k, v in top)}")
            print(f"\n[fo4_scanner] {msg}")
            print("  Sample paths:")
            for p in data.get("sample_paths", [])[:10]:
                print(f"    {p}")
            print()

            def _ui_update():
                try:
                    bpy.context.scene.fo4_scanner.status = (
                        f"Meshes: {data['total']:,} NIFs cataloged"
                    )
                except Exception:
                    pass
                return None

            bpy.app.timers.register(_ui_update, first_interval=0.1)

            if _MOSSY_AVAILABLE and _mossy:
                _mossy.send_event("fo4_scan_complete", {"scan": "meshes", "data": data})

        threading.Thread(target=_bg, daemon=True).start()
        return {"FINISHED"}


class FO4_OT_validate_texture_slots(Operator):
    """Check material texture nodes on selected objects for FO4 naming and color space"""
    bl_idname = "fo4.validate_texture_slots"
    bl_label = "Validate Texture Slots"

    def execute(self, context):
        issues: list[str] = []
        ok: list[str] = []

        for obj in context.selected_objects:
            if obj.type != "MESH":
                continue
            for slot in obj.material_slots:
                mat = slot.material
                if not mat or not mat.use_nodes:
                    continue
                for node in mat.node_tree.nodes:
                    if node.type != "TEX_IMAGE" or not node.image:
                        continue
                    img_name = node.image.name
                    base = os.path.splitext(img_name)[0].lower()
                    m = _SUFFIX_RE.search(base)
                    if not m:
                        issues.append(
                            f"{obj.name}/{mat.name}: '{img_name}' has no FO4 suffix "
                            f"(expected _d, _n, _s, _g, _e, etc.)"
                        )
                        continue

                    suf = f"_{m.group(1)}"
                    ok.append(f"{obj.name}: {suf} ({TEXTURE_SUFFIXES.get(suf, '?')})")

                    # Color space validation
                    cs = node.image.colorspace_settings.name
                    is_srgb = cs in ("sRGB", "Filmic sRGB")
                    should_be_linear = suf in _LINEAR_SUFFIXES

                    if should_be_linear and is_srgb:
                        issues.append(
                            f"{obj.name}/{mat.name}: '{img_name}' ({suf}) should be "
                            f"Non-Color data (currently {cs})"
                        )
                    elif not should_be_linear and not is_srgb:
                        issues.append(
                            f"{obj.name}/{mat.name}: '{img_name}' ({suf}) should be "
                            f"sRGB (currently {cs})"
                        )

        if not issues and not ok:
            self.report({"WARNING"}, "No texture image nodes found on selected objects")
            return {"FINISHED"}

        for issue in issues:
            self.report({"WARNING"}, issue)

        if issues:
            self.report({"ERROR"}, f"{len(issues)} issue(s) found — see warnings above")
        else:
            self.report({"INFO"}, f"All {len(ok)} texture slot(s) pass FO4 validation ✓")

        if _MOSSY_AVAILABLE and _mossy:
            _mossy.log_to_mossy(
                "error" if issues else "info",
                f"Texture slot check: {len(issues)} issues, {len(ok)} OK",
                {"issues": issues},
            )
        return {"FINISHED"}


class FO4_OT_find_vanilla_mesh(Operator):
    """Search the vanilla NIF catalog for meshes matching the keyword"""
    bl_idname = "fo4.find_vanilla_mesh"
    bl_label = "Search NIFs"

    def execute(self, context):
        kw = context.scene.fo4_scanner.search_keyword.strip()
        if not kw:
            self.report({"WARNING"}, "Enter a keyword in the Search field above")
            return {"CANCELLED"}

        root = _resolve_fo4_root(context.scene.fo4_scanner.fo4_root_override)
        if not root:
            self.report({"ERROR"}, "FO4 path not found")
            return {"CANCELLED"}

        hits = _do_mesh_search(root, kw)

        if not hits:
            self.report({"WARNING"}, f"No NIFs found matching '{kw}'")
            return {"CANCELLED"}

        print(f"\n[fo4_scanner] Mesh search '{kw}' — {len(hits)} result(s):")
        for h in hits:
            print(f"  {h}")
        print()

        self.report({"INFO"}, f"{len(hits)} NIF(s) found — see System Console for paths")

        if _MOSSY_AVAILABLE and _mossy:
            _mossy.send_event("fo4_mesh_search", {"keyword": kw, "results": hits})
        return {"FINISHED"}


class FO4_OT_push_scan_to_mossy(Operator):
    """Send all cached scan data to Mossy's brain neuron system via the HTTP bridge"""
    bl_idname = "fo4.push_scan_to_mossy"
    bl_label = "Push to Mossy Brain"

    def execute(self, context):
        if not _MOSSY_AVAILABLE or not _mossy:
            self.report({"ERROR"}, "mossy_link not available")
            return {"CANCELLED"}
        if not _mossy.get_status().get("running"):
            self.report({"WARNING"}, "Mossy is not running — open the Mossy desktop app first")
            return {"CANCELLED"}

        cache = _load_cache()
        if not cache:
            self.report({"WARNING"}, "No cached scans — run a scan first")
            return {"CANCELLED"}

        pushed = sum(
            1 for key, entry in cache.items()
            if _mossy.send_event("blender_scan_result", {
                "scan_key": key,
                "data": entry.get("data", {}),
                "timestamp": entry.get("timestamp", 0),
            })
        )
        self.report({"INFO"}, f"Pushed {pushed}/{len(cache)} scan(s) to Mossy")
        return {"FINISHED"}


class FO4_OT_clear_scan_cache(Operator):
    """Delete all locally cached FO4 scan results"""
    bl_idname = "fo4.clear_scan_cache"
    bl_label = "Clear Cache"

    def execute(self, context):
        try:
            if os.path.isfile(_CACHE_FILE):
                os.remove(_CACHE_FILE)
            context.scene.fo4_scanner.status = ""
            self.report({"INFO"}, "FO4 scan cache cleared")
        except Exception as exc:
            self.report({"ERROR"}, f"Failed: {exc}")
        return {"FINISHED"}


# ---------------------------------------------------------------------------
# Sidebar panel
# ---------------------------------------------------------------------------

class FO4_PT_scanner(Panel):
    bl_label       = "FO4 Asset Scanner"
    bl_idname      = "FO4_PT_scanner"
    bl_space_type  = "VIEW_3D"
    bl_region_type = "UI"
    bl_category    = "FO4 Pipeline"
    bl_options     = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        state  = context.scene.fo4_scanner

        # — Path ─────────────────────────────────────────────
        box = layout.box()
        box.label(text="FO4 Asset Root", icon="FILE_FOLDER")
        root = _resolve_fo4_root(state.fo4_root_override)
        if root:
            short = root[:46] + "..." if len(root) > 46 else root
            box.label(text=short, icon="CHECKMARK")
        else:
            box.label(text="Path not found — set override or add-on prefs", icon="ERROR")
        box.prop(state, "fo4_root_override", text="Override")

        # — Status ────────────────────────────────────────────
        if state.status:
            layout.label(text=state.status, icon="INFO")

        # — Scans ─────────────────────────────────────────────
        box = layout.box()
        box.label(text="Game Scans", icon="VIEWZOOM")
        row = box.row(align=True)
        row.operator("fo4.scan_quick",    icon="PREFERENCES", text="Quick")
        row.operator("fo4.scan_bones",    icon="ARMATURE_DATA", text="Bones")
        row = box.row(align=True)
        row.operator("fo4.scan_textures", icon="IMAGE_DATA",   text="Textures")
        row.operator("fo4.scan_meshes",   icon="MESH_DATA",    text="Meshes")

        # — Scene validation ──────────────────────────────────
        box = layout.box()
        box.label(text="Validate Scene", icon="CHECKMARK")
        box.operator("fo4.validate_texture_slots", icon="MATERIAL")
        box.operator("fo4.check_nif_ready",        icon="EXPORT")

        # — Mesh search ───────────────────────────────────────
        box = layout.box()
        box.label(text="Find Vanilla Mesh", icon="ZOOM_ALL")
        box.prop(state, "search_keyword", text="")
        box.operator("fo4.find_vanilla_mesh", icon="VIEWZOOM")

        # — Cache + Mossy ─────────────────────────────────────
        cache = _load_cache()
        if cache:
            box = layout.box()
            box.label(text=f"Cached: {', '.join(cache.keys())}", icon="DISK_DRIVE")
            row = box.row(align=True)
            if _MOSSY_AVAILABLE:
                row.operator("fo4.push_scan_to_mossy", icon="NETWORK_DRIVE", text="Push to Mossy")
            row.operator("fo4.clear_scan_cache", icon="TRASH", text="Clear")

        # — Texture quick-ref ─────────────────────────────────
        box = layout.box()
        box.label(text="Texture Suffix Reference", icon="TEXTURE_DATA")
        col = box.column(align=True)
        col.scale_y = 0.75
        for suf, meaning in TEXTURE_SUFFIXES.items():
            col.label(text=f"{suf}.dds  →  {meaning.split(' — ')[0]}")

        # — Bone quick-ref ────────────────────────────────────
        box = layout.box()
        box.label(text="Key Biped Bones", icon="ARMATURE_DATA")
        col = box.column(align=True)
        col.scale_y = 0.75
        key_bones = [
            "Bip01 Pelvis", "Bip01 Spine → Spine2",
            "Bip01 Neck → Head",
            "Bip01 L/R Clavicle → UpperArm → Forearm → Hand",
            "Bip01 L/R Thigh → Calf → Foot → Toe0",
            "Fingers: Finger0(thumb) … Finger4(pinky)",
            "  + suffix 01 = 2nd knuckle (Finger0 → Finger01)",
        ]
        for b in key_bones:
            col.label(text=b)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_classes = (
    FO4ScannerState,
    FO4_OT_scan_quick,
    FO4_OT_scan_bones,
    FO4_OT_scan_textures,
    FO4_OT_scan_meshes,
    FO4_OT_validate_texture_slots,
    FO4_OT_find_vanilla_mesh,
    FO4_OT_push_scan_to_mossy,
    FO4_OT_clear_scan_cache,
    FO4_PT_scanner,
)


def register() -> None:
    for cls in _classes:
        register_class(cls)
    bpy.types.Scene.fo4_scanner = bpy.props.PointerProperty(type=FO4ScannerState)


def unregister() -> None:
    for cls in reversed(_classes):
        unregister_class(cls)
    try:
        del bpy.types.Scene.fo4_scanner
    except AttributeError:
        pass
