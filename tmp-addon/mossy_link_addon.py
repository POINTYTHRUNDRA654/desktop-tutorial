"""
Mossy Link Add-on for Blender 4.0+ — Fallout 4 Edition  v6.0
==============================================================
One add-on that does everything:

  • Connects Blender to the Mossy AI desktop app via a local TCP socket
    so Mossy can see your scene, write scripts, and guide you in real time.
  • Integrates the Move X by One and Cursor Array example operators from the
    original example add-ons (blender_move_x.py / blender_cursor_array.py).
  • Integrates the Fallout 4 scene setup from f4_setup.py
    (METRIC units, 60 FPS, 18mm viewport lens).
  • Adds a full FO4 automation suite: align scene, check mesh, clean mesh,
    apply transforms, prep rig, UV check, lightmap UV, LOD setup, batch export.
  • Works straight out of the box — pure Python stdlib + bpy, no pip installs.

INSTALLATION (new users)
  1. Open Blender → Edit → Preferences → Add-ons → Install…
  2. Select this file and click Install Add-on.
  3. Search for "Mossy Link" and enable the checkbox.
  4. The add-on auto-starts on port 9999.
  5. In Mossy: Desktop Bridge → Blender tab → Connect Now.

N-PANEL (View3D sidebar, press N → "Mossy" tab)
  • Connection status + Connect / Disconnect button
  • Test Desktop Bridge button
  • FO4 Quick Actions: one-click automation buttons
  • FO4 Export Warnings: live scene issues

SUPPORTED MOSSY COMMANDS (sent as JSON over TCP port 9999)
  script          – Execute arbitrary Python in Blender context
  text            – Write (and optionally run) a Text datablock
  property        – Read a bpy.context property by dot-path
  status          – Return version / scene / object counts (v5 compat)
  select          – Select an object by name
  create          – Create a new empty mesh object
  get_context     – Full FO4-aware scene snapshot + warnings
  export_fbx      – FBX export (FO4-safe defaults)
  export_obj      – OBJ export (Outfit-Studio-safe defaults)
  run_automation  – Run a named FO4 automation preset (see list below)

AUTOMATION PRESETS (run_automation)
  fo4_setup_scene     – METRIC units, 60 FPS, 18mm FOV  (from f4_setup.py)
  fo4_align           – IMPERIAL units, 30 FPS, scale 1.0 (HKX pipeline)
  fo4_apply_transforms– Apply Loc/Rot/Scale to selected meshes
  fo4_clean_mesh      – Remove doubles, loose geo, degenerate faces
  fo4_check           – Full readiness report printed to console
  fo4_prep_rig        – Apply rest pose to selected armature
  fo4_uv_check        – UV layer coverage report
  fo4_generate_lightmap_uv – Add lightmap UV + Smart UV Project
  fo4_lod_setup       – Add Decimate modifiers at LOD1/2/4 ratios
  fo4_batch_export    – Batch-export selected meshes to directory
  move_x              – Move all scene objects +1 on X (from blender_move_x.py)
  cursor_array        – Create linked copies between object and cursor (from blender_cursor_array.py)

HEADLESS / COMMAND LINE
  Use scripts/blender/run_blender_ops.ps1 on Windows for automated batch runs.
"""

import bpy
import socket
import threading
import json
import sys
import os
import traceback
from io import StringIO

# ---------------------------------------------------------------------------
# bl_info
# ---------------------------------------------------------------------------
bl_info = {
    "name":        "Mossy Link — Fallout 4 AI Assistant",
    "blender":     (4, 0, 0),
    "author":      "OmniForge AI",
    "version":     (6, 0, 0),
    "location":    "View3D > Sidebar > Mossy  |  Properties > Scene",
    "description": (
        "Real-time AI guidance for Fallout 4 modding: scene awareness, FO4 "
        "validation, one-click automation, Move X, Cursor Array, and direct "
        "script execution via Mossy Desktop Bridge."
    ),
    "warning":     "",
    "wiki_url":    "",
    "tracker_url": "",
    "category":    "3D View",
    "support":     "COMMUNITY",
}

# ---------------------------------------------------------------------------
# Addon preferences
# ---------------------------------------------------------------------------
class MossyLinkPreferences(bpy.types.AddonPreferences):
    bl_idname = __name__

    port: bpy.props.IntProperty(
        name="Port",
        description="TCP port for Mossy socket connection (match Desktop Bridge)",
        default=9999, min=1024, max=65535,
    )
    autostart: bpy.props.BoolProperty(
        name="Auto-start on launch",
        description="Start the Mossy Link server automatically when Blender opens",
        default=True,
    )
    show_fo4_warnings: bpy.props.BoolProperty(
        name="Show live FO4 warnings",
        description="Display export warnings in the N-panel Warnings sub-panel",
        default=True,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "port")
        layout.prop(self, "autostart")
        layout.prop(self, "show_fo4_warnings")


def _get_prefs():
    addon = bpy.context.preferences.addons.get(__name__)
    return addon.preferences if addon else None


# ---------------------------------------------------------------------------
# FO4 constants
# ---------------------------------------------------------------------------
FO4_FPS_HKX      = 30        # Havok / in-game animation rate
FO4_FPS_STUDIO   = 60        # f4_setup.py original — studio/baking rate
FO4_UNIT_SYSTEM  = "IMPERIAL"
FO4_UNIT_SCALE   = 1.0
FO4_MAX_TRIS     = 65534
FO4_MAX_BONES    = 80
FO4_SCALE_WARN   = 0.0001
FO4_FOCAL_LEN_MM = 18.0      # ~90-deg FOV on 36mm sensor


# ---------------------------------------------------------------------------
# Scene context helpers
# ---------------------------------------------------------------------------
def _build_scene_context():
    """Return a dict that fully describes the Blender scene for Mossy."""
    scene  = bpy.context.scene
    active = bpy.context.active_object
    selected = [o.name for o in bpy.context.selected_objects]

    active_action, pose_markers = None, 0
    if active and active.animation_data and active.animation_data.action:
        act           = active.animation_data.action
        active_action = act.name
        pose_markers  = len(act.pose_markers)

    ctx = {
        "blender_version": bpy.app.version_string,
        "scene":           scene.name,
        "mode":            bpy.context.mode,
        "activeObject":    active.name if active else None,
        "activeType":      active.type if active else None,
        "selected":        selected,
        "objectCount":     len(bpy.data.objects),
        "meshCount":       len(bpy.data.meshes),
        "armatureCount":   len(bpy.data.armatures),
        "unitSystem":      scene.unit_settings.system,
        "unitScale":       round(scene.unit_settings.scale_length, 6),
        "fps":             scene.render.fps,
        "frameStart":      scene.frame_start,
        "frameEnd":        scene.frame_end,
        "activeAction":    active_action,
        "actionPoseMarkers": pose_markers,
        "addonVersion":    list(bl_info["version"]),
    }

    if active and active.type == "MESH":
        mesh     = active.data
        tri_est  = sum(max(0, len(p.vertices) - 2) for p in mesh.polygons)
        ctx["activeMesh"] = {
            "vertices":         len(mesh.vertices),
            "polygons":         len(mesh.polygons),
            "triangleEstimate": tri_est,
            "uvLayers":         len(mesh.uv_layers),
            "materials":        len(active.material_slots),
            "modifiers":        [m.name for m in active.modifiers],
        }
    return ctx


def _build_fo4_warnings(ctx):
    """Return a list of human-readable FO4 export warnings."""
    warnings = []

    fps = ctx.get("fps", 0)
    if fps not in (FO4_FPS_HKX, FO4_FPS_STUDIO):
        warnings.append(
            f"FPS is {fps}. FO4 HKX pipelines expect {FO4_FPS_HKX} FPS; "
            f"studio baking typically uses {FO4_FPS_STUDIO} FPS. "
            f"Fix: Scene Properties → Frame Rate."
        )

    if ctx.get("unitSystem") not in ("IMPERIAL", "NONE", "METRIC"):
        warnings.append(
            f"Unit system is '{ctx['unitSystem']}'. "
            "FO4 pipelines use IMPERIAL or METRIC — verify with your rig guide."
        )
    if abs(ctx.get("unitScale", 1.0) - FO4_UNIT_SCALE) > FO4_SCALE_WARN:
        warnings.append(
            f"Unit scale is {ctx['unitScale']} (expected {FO4_UNIT_SCALE}). "
            "Fix: Scene Properties → Units → Scale."
        )

    for obj in bpy.context.selected_objects:
        if obj.type == "MESH":
            sx, sy, sz = obj.scale
            if any(abs(s - 1.0) > FO4_SCALE_WARN for s in (sx, sy, sz)):
                warnings.append(
                    f"'{obj.name}' has unapplied scale ({sx:.3f}, {sy:.3f}, {sz:.3f}). "
                    "Apply before exporting: Ctrl+A → Apply Scale."
                )

    mesh_info = ctx.get("activeMesh")
    if mesh_info:
        tri_est = mesh_info.get("triangleEstimate", 0)
        if tri_est > FO4_MAX_TRIS:
            warnings.append(
                f"Active mesh has ~{tri_est:,} tris (hard limit {FO4_MAX_TRIS:,}). "
                "Use a Decimate modifier or split the mesh."
            )
        if mesh_info.get("uvLayers", 0) < 1:
            warnings.append(
                "Active mesh has no UV map. "
                "FO4 textures require at least one UV layer."
            )

    for obj in bpy.context.selected_objects:
        if obj.type == "ARMATURE":
            bones = len(obj.data.bones)
            if bones > FO4_MAX_BONES:
                warnings.append(
                    f"Armature '{obj.name}' has {bones} bones "
                    f"(recommended max {FO4_MAX_BONES}). "
                    "High counts can cause NIF export errors."
                )

    if ctx.get("activeAction") and ctx.get("actionPoseMarkers", 0) == 0:
        warnings.append(
            f"Action '{ctx['activeAction']}' has no pose markers. "
            "HKX pipelines rely on annotation markers for event timing."
        )

    return warnings


# ---------------------------------------------------------------------------
# Automation presets
# ---------------------------------------------------------------------------
def _run_automation(preset, params=None):
    """Dispatch a named FO4 automation preset and return a status string."""
    params = params or {}
    dispatch = {
        "fo4_setup_scene":          lambda: _auto_fo4_setup_scene(),
        "fo4_align":                lambda: _auto_fo4_align(),
        "fo4_apply_transforms":     lambda: _auto_apply_transforms(),
        "fo4_clean_mesh":           lambda: _auto_clean_mesh(params.get("threshold", 0.0001)),
        "fo4_check":                lambda: _auto_fo4_check(),
        "fo4_prep_rig":             lambda: _auto_prep_rig(),
        "fo4_uv_check":             lambda: _auto_uv_check(),
        "fo4_generate_lightmap_uv": lambda: _auto_generate_lightmap_uv(),
        "fo4_lod_setup":            lambda: _auto_lod_setup(),
        "fo4_batch_export":         lambda: _auto_batch_export(
            params.get("directory", os.path.expanduser("~/Desktop/FO4_Exports")),
            params.get("format", "FBX"),
        ),
        # Operators from original example add-ons, accessible via automation
        "move_x":      lambda: _auto_move_x(),
        "cursor_array": lambda: _auto_cursor_array(int(params.get("total", 4))),
    }
    fn = dispatch.get(preset)
    if fn:
        return fn()
    return (
        f"Unknown preset '{preset}'. Available: "
        + ", ".join(sorted(dispatch.keys()))
    )


# --- individual preset implementations ---

def _auto_fo4_setup_scene():
    """METRIC units, 60 FPS, 18mm viewport FOV — original f4_setup.py behaviour."""
    scene = bpy.context.scene
    scene.unit_settings.system       = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit  = "CENTIMETERS"
    scene.render.fps = FO4_FPS_STUDIO
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.lens = FO4_FOCAL_LEN_MM
    return (
        f"Scene set to FO4 studio standards: METRIC / CENTIMETERS, "
        f"{FO4_FPS_STUDIO} FPS, {FO4_FOCAL_LEN_MM}mm viewport FOV."
    )


def _auto_fo4_align():
    """IMPERIAL units, 30 FPS, scale 1.0 — FO4 HKX export pipeline."""
    scene = bpy.context.scene
    scene.render.fps                 = FO4_FPS_HKX
    scene.unit_settings.system       = FO4_UNIT_SYSTEM
    scene.unit_settings.scale_length = FO4_UNIT_SCALE
    return (
        f"Scene aligned to FO4 HKX pipeline: "
        f"{FO4_UNIT_SYSTEM} units, scale {FO4_UNIT_SCALE}, {FO4_FPS_HKX} FPS."
    )


def _auto_apply_transforms():
    applied = []
    for obj in bpy.context.selected_objects:
        if obj.type == "MESH":
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            applied.append(obj.name)
    return (
        f"Applied transforms to: {', '.join(applied)}."
        if applied else
        "No mesh objects selected. Select mesh(es) and try again."
    )


def _auto_clean_mesh(threshold=0.0001):
    cleaned = []
    for obj in bpy.context.selected_objects:
        if obj.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.remove_doubles(threshold=threshold)
        bpy.ops.mesh.delete_loose()
        try:
            bpy.ops.mesh.dissolve_degenerate(threshold=threshold)
        except Exception:
            pass
        bpy.ops.object.mode_set(mode="OBJECT")
        cleaned.append(obj.name)
    return (
        f"Mesh cleaned (threshold={threshold}): {', '.join(cleaned)}."
        if cleaned else
        "No mesh objects selected."
    )


def _auto_fo4_check():
    ctx      = _build_scene_context()
    warnings = _build_fo4_warnings(ctx)
    lines    = ["=== Mossy FO4 Readiness Check ==="]
    lines.append(
        f"Scene: {ctx['scene']} | FPS: {ctx['fps']} | "
        f"Units: {ctx['unitSystem']} @ {ctx['unitScale']} | "
        f"Objects: {ctx['objectCount']}"
    )
    if ctx.get("activeMesh"):
        m = ctx["activeMesh"]
        lines.append(
            f"Active mesh '{ctx.get('activeObject')}': "
            f"{m['vertices']:,} verts | ~{m['triangleEstimate']:,} tris | "
            f"{m['uvLayers']} UV(s) | {m['materials']} material(s)"
        )
    if warnings:
        lines.append(f"\n{len(warnings)} issue(s) found:")
        for i, w in enumerate(warnings, 1):
            lines.append(f"  {i}. {w}")
    else:
        lines.append("\nNo FO4 export issues detected.")
    return "\n".join(lines)


def _auto_prep_rig():
    arm_objs = [o for o in bpy.context.selected_objects if o.type == "ARMATURE"]
    if not arm_objs:
        return (
            "No armature selected. Select your rig object and run again. "
            "The FO4 rig must use the Bethesda bone naming convention."
        )
    results = []
    for arm in arm_objs:
        bpy.context.view_layer.objects.active = arm
        try:
            bpy.ops.object.mode_set(mode="POSE")
            bpy.ops.pose.armature_apply(selected=False)
            bpy.ops.object.mode_set(mode="OBJECT")
            results.append(f"'{arm.name}': rest pose applied ({len(arm.data.bones)} bones).")
        except Exception as e:
            results.append(f"'{arm.name}': {e}")
    return "\n".join(results)


def _auto_uv_check():
    results = []
    for obj in bpy.context.selected_objects:
        if obj.type != "MESH":
            continue
        layers = len(obj.data.uv_layers)
        if layers == 0:
            results.append(
                f"'{obj.name}': NO UV map — FO4 textures need at least one. "
                "Add via Mesh Properties → UV Maps → '+'."
            )
        elif layers == 1:
            results.append(
                f"'{obj.name}': 1 UV layer. A second lightmap UV is needed "
                "for baked lighting (Smart UV Project on a second layer)."
            )
        else:
            results.append(f"'{obj.name}': {layers} UV layers — OK for FO4.")
    return "\n".join(results) if results else "No mesh objects selected."


def _auto_generate_lightmap_uv():
    results = []
    for obj in bpy.context.selected_objects:
        if obj.type != "MESH":
            continue
        lm_name = "UVMap_Lightmap"
        if lm_name not in obj.data.uv_layers:
            obj.data.uv_layers.new(name=lm_name)
        obj.data.uv_layers.active = obj.data.uv_layers[lm_name]
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
        bpy.ops.object.mode_set(mode="OBJECT")
        results.append(
            f"'{obj.name}': lightmap UV '{lm_name}' created and Smart-UV-Projected."
        )
    return "\n".join(results) if results else "No mesh objects selected."


def _auto_lod_setup():
    meshes = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    if not meshes:
        return "No mesh objects selected."
    lod_ratios = [("Mossy_LOD1", 0.75), ("Mossy_LOD2", 0.50), ("Mossy_LOD4", 0.25)]
    results = []
    for obj in meshes:
        for mod_name, ratio in lod_ratios:
            if mod_name not in obj.modifiers:
                mod = obj.modifiers.new(mod_name, "DECIMATE")
                mod.ratio = ratio
                mod.show_viewport = False
        results.append(
            f"'{obj.name}': LOD Decimate modifiers added (LOD1=75%, LOD2=50%, LOD4=25%). "
            "Enable each before applying."
        )
    return "\n".join(results)


def _auto_batch_export(directory, fmt="FBX"):
    meshes = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    if not meshes:
        return "No mesh objects selected for batch export."
    os.makedirs(directory, exist_ok=True)
    exported, failed = [], []
    for obj in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in obj.name)
        ext  = "fbx" if fmt.upper() == "FBX" else "obj"
        path = os.path.join(directory, f"{safe}.{ext}")
        try:
            if fmt.upper() == "FBX":
                bpy.ops.export_scene.fbx(
                    filepath=path, use_selection=True, global_scale=1.0,
                    apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL",
                    use_mesh_modifiers=True, mesh_smooth_type="FACE",
                    add_leaf_bones=False, bake_anim=False,
                )
            else:
                bpy.ops.export_scene.obj(
                    filepath=path, use_selection=True, global_scale=1.0,
                    use_mesh_modifiers=True, use_uvs=True,
                    use_materials=True, use_normals=True,
                )
            exported.append(safe)
        except Exception as e:
            failed.append(f"{obj.name}: {e}")
    lines = [f"Batch export → {directory}"]
    if exported:
        lines.append(f"Exported ({len(exported)}): {', '.join(exported)}")
    if failed:
        lines.append(f"Failed ({len(failed)}): {'; '.join(failed)}")
    return "\n".join(lines)


# Originals from blender_move_x.py
def _auto_move_x():
    count = 0
    for obj in bpy.context.scene.objects:
        obj.location.x += 1.0
        count += 1
    return f"Moved {count} object(s) +1 on X axis."


# Originals from blender_cursor_array.py
def _auto_cursor_array(total=4):
    obj = bpy.context.active_object
    if not obj:
        return "No active object. Select an object first."
    scene  = bpy.context.scene
    cursor = scene.cursor.location
    created = []
    for i in range(total):
        obj_new = obj.copy()
        scene.collection.objects.link(obj_new)
        factor          = i / total
        obj_new.location = (obj.location * factor) + (cursor * (1.0 - factor))
        created.append(obj_new.name)
    return (
        f"Cursor Array: created {total} linked copy/copies of '{obj.name}' "
        f"between object and cursor."
    )


# ---------------------------------------------------------------------------
# Export helpers (called directly by socket commands)
# ---------------------------------------------------------------------------
def _export_fbx(filepath, use_selection=True, bake_anim=False):
    if not filepath:
        return "Error: filepath required."
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    try:
        bpy.ops.export_scene.fbx(
            filepath=filepath,
            use_selection=use_selection,
            global_scale=1.0,
            apply_unit_scale=True,
            apply_scale_options="FBX_SCALE_ALL",
            use_mesh_modifiers=True,
            mesh_smooth_type="FACE",
            add_leaf_bones=False,
            bake_anim=bake_anim,
            bake_anim_use_all_bones=True,
            bake_anim_use_nla_strips=False,
            bake_anim_use_all_actions=False,
            bake_anim_simplify_factor=0.0,
        )
        return f"FBX exported: {filepath}"
    except Exception as e:
        return f"FBX export failed: {e}\n{traceback.format_exc()}"


def _export_obj(filepath, use_selection=True):
    if not filepath:
        return "Error: filepath required."
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    try:
        bpy.ops.export_scene.obj(
            filepath=filepath,
            use_selection=use_selection,
            global_scale=1.0,
            use_mesh_modifiers=True,
            use_uvs=True,
            use_materials=True,
            use_normals=True,
        )
        return f"OBJ exported: {filepath}"
    except Exception as e:
        return f"OBJ export failed: {e}\n{traceback.format_exc()}"


# ---------------------------------------------------------------------------
# TCP socket server
# ---------------------------------------------------------------------------
_server_instance = None  # module-level; also exposed as mossy_server below


class MossyLinkServer:
    """TCP server that receives JSON commands from Mossy Desktop Bridge."""

    def __init__(self, host="127.0.0.1", port=9999):
        self.host = host
        self.port = port
        self.socket        = None
        self.running       = False
        self.thread        = None
        self.client_socket = None

    # ---- lifecycle -------------------------------------------------------

    def start(self):
        if self.running:
            return False
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(1)
            self.running = True
            self.thread  = threading.Thread(target=self._server_loop, daemon=True)
            self.thread.start()
            print(f"[Mossy Link v6] Server ready on {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"[Mossy Link v6] Failed to start: {e}")
            self.running = False
            return False

    def stop(self):
        self.running = False
        for s in (self.client_socket, self.socket):
            if s:
                try:
                    s.close()
                except Exception:
                    pass
        print("[Mossy Link v6] Server stopped.")

    # ---- networking ------------------------------------------------------

    def _server_loop(self):
        while self.running:
            try:
                self.client_socket, addr = self.socket.accept()
                print(f"[Mossy Link v6] Connection from {addr}")
                self._handle_client()
            except OSError:
                break
            except Exception as e:
                if self.running:
                    print(f"[Mossy Link v6] Server error: {e}")

    def _handle_client(self):
        buf = b""
        try:
            while self.running:
                chunk = self.client_socket.recv(65536)
                if not chunk:
                    break
                buf += chunk
                try:
                    command  = json.loads(buf.decode("utf-8"))
                    buf      = b""
                    result   = self._execute_command(command)
                    response = json.dumps({"success": True, "result": result})
                except json.JSONDecodeError:
                    if len(buf) > 1_048_576:
                        response = json.dumps({"success": False, "error": "Payload too large"})
                        buf = b""
                    else:
                        continue  # wait for more data
                except Exception as e:
                    response = json.dumps({
                        "success": False,
                        "error":   str(e),
                        "trace":   traceback.format_exc(),
                    })
                self.client_socket.sendall(response.encode("utf-8"))
        except Exception as e:
            print(f"[Mossy Link v6] Client handler error: {e}")
        finally:
            try:
                self.client_socket.close()
            except Exception:
                pass

    # ---- command dispatch ------------------------------------------------

    def _execute_command(self, command):
        t = command.get("type", "script")

        # --- v5 commands (backward-compatible) ---
        if   t == "script":   return self._exec_script(command.get("code", ""))
        elif t == "text":     return self._write_text_block(
                                  command.get("code", ""),
                                  command.get("name", "MOSSY_SCRIPT"),
                                  bool(command.get("run", False)))
        elif t == "property": return self._get_property(command.get("path", ""))
        elif t == "status":   return json.dumps(self._get_status())
        elif t == "select":   return self._select_object(command.get("name", ""))
        elif t == "create":   return self._create_object(
                                  command.get("type", command.get("object_type", "MESH")),
                                  command.get("name", "Object"))
        # --- v6 commands ---
        elif t == "get_context":    return json.dumps(self._get_full_context())
        elif t == "export_fbx":     return _export_fbx(
                                        command.get("filepath", ""),
                                        bool(command.get("use_selection", True)),
                                        bool(command.get("bake_anim", False)))
        elif t == "export_obj":     return _export_obj(
                                        command.get("filepath", ""),
                                        bool(command.get("use_selection", True)))
        elif t == "run_automation": return _run_automation(
                                        command.get("preset", ""),
                                        command.get("params", {}))
        else:
            raise ValueError(
                f"Unknown command type '{t}'. Supported: "
                "script, text, property, status, select, create, "
                "get_context, export_fbx, export_obj, run_automation"
            )

    # ---- command implementations -----------------------------------------

    def _exec_script(self, code):
        """Execute arbitrary Python code inside Blender's runtime."""
        if not code:
            return "No code provided"
        old_stdout = sys.stdout
        sys.stdout = buf = StringIO()
        try:
            ns = {"bpy": bpy, "C": bpy.context, "D": bpy.data, "ops": bpy.ops}
            # Ensure Object Mode where needed
            try:
                obj = bpy.context.active_object
                if obj and obj.mode != "OBJECT":
                    bpy.ops.object.mode_set(mode="OBJECT")
            except Exception:
                pass
            # Use VIEW_3D context for operators
            area = None
            try:
                for a in bpy.context.window.screen.areas:
                    if a.type == "VIEW_3D":
                        area = a
                        break
            except Exception:
                pass
            uses_ops = "bpy.ops." in code or "ops." in code
            if uses_ops and area:
                try:
                    with bpy.context.temp_override(area=area):
                        exec(code, ns)
                except Exception:
                    exec(code, ns)
            else:
                exec(code, ns)
            out = buf.getvalue()
            return out if out else "Script executed successfully (no output)"
        except Exception as e:
            return f"Script error: {e}\n{traceback.format_exc()}"
        finally:
            sys.stdout = old_stdout

    def _write_text_block(self, code, name="MOSSY_SCRIPT", run=False):
        if not code:
            return "No code provided"
        text = bpy.data.texts.get(name) or bpy.data.texts.new(name)
        text.clear()
        text.write(code)
        print(f"[Mossy Link v6] Text block '{name}' updated")
        return self._exec_script(code) if run else f"Text block '{name}' updated (run=False)"

    def _get_property(self, path):
        try:
            obj = bpy.context
            for part in path.split("."):
                obj = getattr(obj, part)
            return str(obj)
        except AttributeError:
            return f"Property not found: {path}"

    def _get_status(self):
        active = bpy.context.active_object
        scene  = bpy.context.scene
        return {
            "version":      bpy.app.version_string,
            "scene":        scene.name if scene else "None",
            "active_object": active.name if active else "None",
            "object_count": len(bpy.data.objects),
            "mesh_count":   len(bpy.data.meshes),
            "addon_version": list(bl_info["version"]),
        }

    def _get_full_context(self):
        ctx      = _build_scene_context()
        warnings = _build_fo4_warnings(ctx)
        return {"context": ctx, "warnings": warnings}

    def _select_object(self, name):
        obj = bpy.data.objects.get(name)
        if not obj:
            return f"Object '{name}' not found"
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        return f"Selected '{name}'"

    def _create_object(self, obj_type, name):
        if obj_type == "MESH":
            mesh = bpy.data.meshes.new(name)
            new  = bpy.data.objects.new(name, mesh)
            bpy.context.collection.objects.link(new)
            return f"Created mesh object '{name}'"
        return f"Unsupported object type: {obj_type}"


# ---------------------------------------------------------------------------
# Operators — original example add-ons (blender_move_x / blender_cursor_array)
# ---------------------------------------------------------------------------

class MOSSY_OT_MoveX(bpy.types.Operator):
    """Move all scene objects +1 on the X axis (from blender_move_x.py)"""
    bl_idname = "object.move_x"      # preserves original bl_idname
    bl_label  = "Move X by One"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        for obj in context.scene.objects:
            obj.location.x += 1.0
        return {"FINISHED"}


class MOSSY_OT_CursorArray(bpy.types.Operator):
    """Create linked copies of the active object between it and the 3D cursor
    (from blender_cursor_array.py)"""
    bl_idname = "object.cursor_array"   # preserves original bl_idname
    bl_label  = "Cursor Array"
    bl_options = {"REGISTER", "UNDO"}

    total: bpy.props.IntProperty(name="Steps", default=2, min=1, max=100)

    def execute(self, context):
        scene  = context.scene
        cursor = scene.cursor.location
        obj    = context.active_object
        if not obj:
            self.report({"WARNING"}, "No active object selected")
            return {"CANCELLED"}
        for i in range(self.total):
            obj_new          = obj.copy()
            scene.collection.objects.link(obj_new)
            factor           = i / self.total
            obj_new.location = (obj.location * factor) + (cursor * (1.0 - factor))
        return {"FINISHED"}


# menu helpers for example operators
def _menu_move_x(self, context):
    self.layout.operator(MOSSY_OT_MoveX.bl_idname)


def _menu_cursor_array(self, context):
    self.layout.operator(MOSSY_OT_CursorArray.bl_idname)


# ---------------------------------------------------------------------------
# Operators — connection
# ---------------------------------------------------------------------------

class WM_OT_MossyLinkToggle(bpy.types.Operator):
    """Start or stop the Mossy Link server"""
    bl_idname = "wm.mossy_link_toggle"
    bl_label  = "Toggle Mossy Link"

    def execute(self, context):
        global _server_instance
        wm    = context.window_manager
        prefs = _get_prefs()
        port  = prefs.port if prefs else 9999

        if wm.mossy_link_active:
            if _server_instance:
                _server_instance.stop()
            _server_instance = None
            wm.mossy_link_active = False
            self.report({"INFO"}, "Mossy Link disconnected")
        else:
            _server_instance = MossyLinkServer("127.0.0.1", port)
            if _server_instance.start():
                wm.mossy_link_active = True
                self.report({"INFO"}, f"Mossy Link connected on port {port}")
            else:
                self.report({"ERROR"}, "Failed to start — is the port already in use?")
                _server_instance = None
        return {"FINISHED"}


class MOSSY_OT_TestBridge(bpy.types.Operator):
    """Ping the Mossy Desktop Bridge on port 21337"""
    bl_idname = "mossy.test_bridge"
    bl_label  = "Test Desktop Bridge"

    def execute(self, context):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        try:
            s.connect(("127.0.0.1", 21337))
            s.close()
            self.report({"INFO"}, "Mossy Bridge RUNNING on port 21337")
            return {"FINISHED"}
        except ConnectionRefusedError:
            self.report({"ERROR"}, "Bridge not running — start Mossy Desktop app first")
            return {"CANCELLED"}
        except socket.timeout:
            self.report({"WARNING"}, "Bridge timeout — check firewall / port 21337")
            return {"CANCELLED"}
        except Exception as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


# ---------------------------------------------------------------------------
# Operators — FO4 quick-actions (all callable from N-panel buttons)
# ---------------------------------------------------------------------------

class MOSSY_OT_FO4SetupScene(bpy.types.Operator):
    """Apply f4_setup.py standards: METRIC, 60 FPS, 18mm viewport FOV"""
    bl_idname = "mossy.fo4_setup_scene"
    bl_label  = "FO4 Studio Setup (METRIC / 60 FPS)"

    def execute(self, context):
        self.report({"INFO"}, _auto_fo4_setup_scene())
        return {"FINISHED"}


class MOSSY_OT_FO4Align(bpy.types.Operator):
    """Apply HKX pipeline standards: IMPERIAL, 30 FPS, scale 1.0"""
    bl_idname = "mossy.fo4_align"
    bl_label  = "FO4 HKX Align (IMPERIAL / 30 FPS)"

    def execute(self, context):
        self.report({"INFO"}, _auto_fo4_align())
        return {"FINISHED"}


class MOSSY_OT_FO4ApplyTransforms(bpy.types.Operator):
    """Apply Location, Rotation, and Scale to all selected mesh objects"""
    bl_idname = "mossy.fo4_apply_transforms"
    bl_label  = "Apply All Transforms"

    def execute(self, context):
        self.report({"INFO"}, _auto_apply_transforms())
        return {"FINISHED"}


class MOSSY_OT_FO4CleanMesh(bpy.types.Operator):
    """Remove doubles, loose geometry, and degenerate faces from selected meshes"""
    bl_idname = "mossy.fo4_clean_mesh"
    bl_label  = "Clean Mesh"

    def execute(self, context):
        self.report({"INFO"}, _auto_clean_mesh())
        return {"FINISHED"}


class MOSSY_OT_FO4Check(bpy.types.Operator):
    """Run a full FO4 readiness check and print the report to the System Console"""
    bl_idname = "mossy.fo4_check"
    bl_label  = "FO4 Readiness Check"

    def execute(self, context):
        report = _auto_fo4_check()
        print(report)
        issues = report.count("issue")
        if "No FO4 export issues" in report:
            self.report({"INFO"}, "FO4 check passed — see console for details")
        else:
            self.report({"WARNING"}, f"{issues} issue(s) — see System Console")
        return {"FINISHED"}


class MOSSY_OT_FO4PrepRig(bpy.types.Operator):
    """Apply the rest pose to the selected armature (required before HKX export)"""
    bl_idname = "mossy.fo4_prep_rig"
    bl_label  = "Prep Rig for HKX"

    def execute(self, context):
        msg = _auto_prep_rig()
        print(msg)
        self.report({"INFO"}, msg[:200])
        return {"FINISHED"}


class MOSSY_OT_FO4UVCheck(bpy.types.Operator):
    """Check UV coverage on selected meshes and report to System Console"""
    bl_idname = "mossy.fo4_uv_check"
    bl_label  = "Check UVs"

    def execute(self, context):
        msg = _auto_uv_check()
        print(msg)
        self.report({"INFO"}, msg[:200])
        return {"FINISHED"}


class MOSSY_OT_FO4LightmapUV(bpy.types.Operator):
    """Add a lightmap UV channel and Smart-UV-Project it on selected meshes"""
    bl_idname = "mossy.fo4_lightmap_uv"
    bl_label  = "Generate Lightmap UV"

    def execute(self, context):
        msg = _auto_generate_lightmap_uv()
        print(msg)
        self.report({"INFO"}, msg[:200])
        return {"FINISHED"}


class MOSSY_OT_FO4LODSetup(bpy.types.Operator):
    """Add Decimate modifiers at LOD1 / LOD2 / LOD4 ratios (disabled by default)"""
    bl_idname = "mossy.fo4_lod_setup"
    bl_label  = "Add LOD Modifiers"

    def execute(self, context):
        msg = _auto_lod_setup()
        print(msg)
        self.report({"INFO"}, msg[:200])
        return {"FINISHED"}


# ---------------------------------------------------------------------------
# N-panel (View3D sidebar → "Mossy" tab)
# ---------------------------------------------------------------------------

class MOSSY_PT_LinkPanel(bpy.types.Panel):
    """Mossy Link — connection status and controls"""
    bl_label       = "Mossy Link"
    bl_idname      = "MOSSY_PT_link_panel"
    bl_space_type  = "VIEW_3D"
    bl_region_type = "UI"
    bl_category    = "Mossy"
    bl_order       = 0

    def draw(self, context):
        layout = self.layout
        wm     = context.window_manager
        prefs  = _get_prefs()
        port   = prefs.port if prefs else 9999

        box = layout.box()
        if wm.mossy_link_active:
            row = box.row()
            row.label(text="CONNECTED", icon="CHECKMARK")
            row.label(text=f"Port {port}")
        else:
            box.alert = True
            box.label(text="DISCONNECTED — click Connect below", icon="ERROR")

        layout.operator(
            "wm.mossy_link_toggle",
            text="Disconnect" if wm.mossy_link_active else "Connect to Mossy",
            icon="UNLINKED" if wm.mossy_link_active else "LINKED",
        )
        layout.operator("mossy.test_bridge", text="Test Desktop Bridge", icon="NETWORK_DRIVE")

        layout.separator()
        layout.label(text="Quick-start:", icon="INFO")
        col = layout.column(align=True)
        col.scale_y = 0.75
        col.label(text="1. Click Connect above")
        col.label(text="2. Open Mossy → Desktop Bridge")
        col.label(text="3. Chat — Mossy sees your scene!")


class MOSSY_PT_FO4Panel(bpy.types.Panel):
    """Mossy Link — Fallout 4 quick actions"""
    bl_label       = "FO4 Quick Actions"
    bl_idname      = "MOSSY_PT_fo4_panel"
    bl_space_type  = "VIEW_3D"
    bl_region_type = "UI"
    bl_category    = "Mossy"
    bl_order       = 1
    bl_options     = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout

        layout.label(text="Scene Setup", icon="SCENE_DATA")
        col = layout.column(align=True)
        col.operator("mossy.fo4_setup_scene", icon="SETTINGS")
        col.operator("mossy.fo4_align",       icon="OBJECT_ORIGIN")
        col.operator("mossy.fo4_check",       icon="CHECKMARK")

        layout.separator()
        layout.label(text="Mesh Prep", icon="MESH_DATA")
        col = layout.column(align=True)
        col.operator("mossy.fo4_apply_transforms", icon="ORIENTATION_GLOBAL")
        col.operator("mossy.fo4_clean_mesh",       icon="BRUSH_DATA")
        col.operator("mossy.fo4_uv_check",         icon="UV")
        col.operator("mossy.fo4_lightmap_uv",      icon="IMAGE_PLANE")

        layout.separator()
        layout.label(text="Rig & LOD", icon="ARMATURE_DATA")
        col = layout.column(align=True)
        col.operator("mossy.fo4_prep_rig",  icon="POSE_HLT")
        col.operator("mossy.fo4_lod_setup", icon="MOD_DECIM")

        layout.separator()
        layout.label(text="Object Utils", icon="OBJECT_DATA")
        col = layout.column(align=True)
        col.operator("object.move_x",      icon="ARROW_LEFTRIGHT")
        col.operator("object.cursor_array", icon="PIVOT_CURSOR")


class MOSSY_PT_WarningsPanel(bpy.types.Panel):
    """Mossy Link — live FO4 export warnings"""
    bl_label       = "FO4 Export Warnings"
    bl_idname      = "MOSSY_PT_warnings_panel"
    bl_space_type  = "VIEW_3D"
    bl_region_type = "UI"
    bl_category    = "Mossy"
    bl_order       = 2
    bl_options     = {"DEFAULT_CLOSED"}

    @classmethod
    def poll(cls, context):
        prefs = _get_prefs()
        return (prefs.show_fo4_warnings if prefs else True)

    def draw(self, context):
        layout = self.layout
        try:
            ctx      = _build_scene_context()
            warnings = _build_fo4_warnings(ctx)
            if not warnings:
                layout.label(text="No issues detected", icon="CHECKMARK")
            else:
                for w in warnings[:6]:
                    box = layout.box()
                    box.alert = True
                    for line in _wrap_text(w, 36):
                        box.label(text=line)
        except Exception as e:
            layout.label(text=f"Error: {e}", icon="ERROR")


# backward-compatible Properties-panel (v5.0 location)
class MOSSY_PT_MainPanel(bpy.types.Panel):
    """Mossy Link panel in Properties → Scene (legacy location)"""
    bl_label       = "Mossy Link"
    bl_idname      = "MOSSY_PT_main_panel"
    bl_space_type  = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context     = "scene"

    def draw(self, context):
        layout = self.layout
        wm     = context.window_manager
        prefs  = _get_prefs()
        port   = prefs.port if prefs else 9999
        layout.label(text="Mossy Link AI Assistant", icon="PREFERENCES")
        box = layout.box()
        if wm.mossy_link_active:
            box.label(text="Connected", icon="CHECKMARK")
            box.label(text=f"127.0.0.1:{port}")
        else:
            box.label(text="Disconnected", icon="CHECKBOX_DEHLT")
        layout.operator("wm.mossy_link_toggle", text="Toggle Server")
        layout.operator("mossy.test_bridge",    text="Test Bridge")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _wrap_text(text, width):
    words, lines, line = text.split(), [], ""
    for word in words:
        if len(line) + len(word) + 1 <= width:
            line = (line + " " + word).strip()
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines or [""]


# ---------------------------------------------------------------------------
# Keymap storage (Cursor Array Ctrl+Shift+T — from original addon)
# ---------------------------------------------------------------------------
_addon_keymaps = []


# ---------------------------------------------------------------------------
# Deferred server startup
# ---------------------------------------------------------------------------
def _start_server_deferred():
    global _server_instance
    try:
        prefs = _get_prefs()
        port  = prefs.port if prefs else 9999
        if prefs and not prefs.autostart:
            print("[Mossy Link v6] Autostart disabled.")
            return None
        _server_instance = MossyLinkServer("127.0.0.1", port)
        if _server_instance.start():
            bpy.context.window_manager.mossy_link_active = True
        else:
            print("[Mossy Link v6] Warning: port may already be in use — toggle manually.")
    except Exception as e:
        print(f"[Mossy Link v6] Startup error: {e}")
    return None  # do not repeat the timer


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
_CLASSES = (
    MossyLinkPreferences,
    # Connection
    WM_OT_MossyLinkToggle,
    MOSSY_OT_TestBridge,
    # Example operators (original add-ons)
    MOSSY_OT_MoveX,
    MOSSY_OT_CursorArray,
    # FO4 quick actions
    MOSSY_OT_FO4SetupScene,
    MOSSY_OT_FO4Align,
    MOSSY_OT_FO4ApplyTransforms,
    MOSSY_OT_FO4CleanMesh,
    MOSSY_OT_FO4Check,
    MOSSY_OT_FO4PrepRig,
    MOSSY_OT_FO4UVCheck,
    MOSSY_OT_FO4LightmapUV,
    MOSSY_OT_FO4LODSetup,
    # Panels
    MOSSY_PT_LinkPanel,
    MOSSY_PT_FO4Panel,
    MOSSY_PT_WarningsPanel,
    MOSSY_PT_MainPanel,      # legacy Properties panel
)

# Module-level alias kept for any external code that references mossy_server
mossy_server = _server_instance


def register():
    for cls in _CLASSES:
        bpy.utils.register_class(cls)

    bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(default=False)

    # Add example operators to the Object menu (original locations)
    bpy.types.VIEW3D_MT_object.append(_menu_move_x)
    bpy.types.VIEW3D_MT_object.append(_menu_cursor_array)

    # Cursor Array keymap: Ctrl+Shift+T in Object Mode (original)
    wm = bpy.context.window_manager
    kc = wm.keyconfigs.addon
    if kc:
        km  = kc.keymaps.new(name="Object Mode", space_type="EMPTY")
        kmi = km.keymap_items.new(
            MOSSY_OT_CursorArray.bl_idname, "T", "PRESS", ctrl=True, shift=True
        )
        kmi.properties.total = 4
        _addon_keymaps.append((km, kmi))

    bpy.app.timers.register(_start_server_deferred, first_interval=0.5)
    print("[Mossy Link v6] Registered — Fallout 4 AI Assistant ready.")


def unregister():
    global _server_instance

    if _server_instance:
        _server_instance.stop()
    _server_instance = None

    # Remove keymaps
    for km, kmi in _addon_keymaps:
        km.keymap_items.remove(kmi)
    _addon_keymaps.clear()

    # Remove menu entries
    bpy.types.VIEW3D_MT_object.remove(_menu_move_x)
    bpy.types.VIEW3D_MT_object.remove(_menu_cursor_array)

    for cls in reversed(_CLASSES):
        bpy.utils.unregister_class(cls)

    del bpy.types.WindowManager.mossy_link_active
    print("[Mossy Link v6] Unregistered.")


if __name__ == "__main__":
    register()
