"""
meshlab_helpers.py
==================
High-quality mesh processing for Fallout 4 assets via PyMeshLab.

Credits
-------
MeshLab:
    P. Cignoni, M. Callieri, M. Corsini, M. Dellepiane, F. Ganovelli, G. Ranzuglia
    "MeshLab: an Open-Source Mesh Processing Tool"
    Sixth Eurographics Italian Chapter Conference, pp. 129-136, 2008
    https://github.com/cnr-isti-vclab/meshlab

PyMeshLab (Python bindings by Alessandro Muntoni, VCLab ISTI-CNR):
    https://github.com/cnr-isti-vclab/PyMeshLab
    PyPI: https://pypi.org/project/pymeshlab/

PyMeshLab is installed on demand via pip into Blender's Python environment.
No bundled files are required — internet access needed only on first use.
"""

from __future__ import annotations

import os
import tempfile

import bpy
from bpy.props import BoolProperty, FloatProperty, IntProperty
from bpy.types import Operator, Panel


# ── Availability ─────────────────────────────────────────────────────────────

def _pymeshlab_available() -> tuple[bool, str]:
    """Return (ok, short_message) for PyMeshLab availability."""
    # Ensure the ML lib dir is on sys.path — it is NOT added automatically at
    # startup, only lazily when _ensure_ml_on_path() is called.  Without this,
    # pymeshlab is invisible to Python even when it is already installed there.
    try:
        from . import tool_installers as _ti
        _ti._ensure_ml_on_path()
    except Exception:
        pass
    try:
        import pymeshlab
        ver = getattr(pymeshlab, "__version__", "unknown")
        return True, f"PyMeshLab {ver}"
    except ImportError:
        return False, "PyMeshLab not installed"


def _require_pymeshlab():
    ok, msg = _pymeshlab_available()
    if not ok:
        raise RuntimeError(
            "PyMeshLab not installed. Use FO4 Tools → Install PyMeshLab."
        )
    import pymeshlab
    return pymeshlab


# ── OBJ interchange (Blender 3.6 / 4.x compatible) ───────────────────────────

def _obj_export(filepath: str) -> bool:
    """Export selected objects to OBJ.  Returns False on failure."""
    try:
        if hasattr(bpy.ops.wm, "obj_export"):
            bpy.ops.wm.obj_export(
                filepath=filepath,
                export_selected_objects=True,
                apply_modifiers=True,
                export_uv=True,
                export_normals=True,
                export_materials=False,
                export_triangulated_mesh=True,
            )
        else:
            bpy.ops.export_scene.obj(
                filepath=filepath,
                use_selection=True,
                use_mesh_modifiers=True,
                use_uvs=True,
                use_normals=True,
                use_materials=False,
                use_triangles=True,
            )
        return True
    except Exception as exc:
        print(f"[MeshLab] OBJ export failed: {exc}")
        return False


def _obj_import(filepath: str) -> list:
    """Import an OBJ file.  Returns list of newly created Blender objects."""
    before = {o.name for o in bpy.data.objects}
    try:
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=filepath)
        else:
            bpy.ops.import_scene.obj(filepath=filepath)
    except Exception as exc:
        print(f"[MeshLab] OBJ import failed: {exc}")
        return []
    after = {o.name for o in bpy.data.objects}
    return [bpy.data.objects[n] for n in (after - before) if n in bpy.data.objects]


def _setup_selection(context, obj) -> None:
    if context.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    context.view_layer.objects.active = obj
    obj.select_set(True)


def _replace_mesh(original_obj, new_obj) -> None:
    """Swap new_obj's mesh onto original_obj, then discard new_obj."""
    old_mesh = original_obj.data
    original_obj.data = new_obj.data
    original_obj.data.name = original_obj.name
    bpy.data.objects.remove(new_obj, do_unlink=True)
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)


# ── Core processing functions ─────────────────────────────────────────────────

def run_repair(obj, context,
               close_holes: bool = True,
               max_hole_size: int = 30,
               smooth_passes: int = 0) -> tuple[bool, str]:
    """
    Full mesh repair pipeline via PyMeshLab:
      1. Remove duplicate vertices and faces
      2. Remove null / degenerate faces
      3. Repair non-manifold edges and vertices
      4. Remove unreferenced vertices
      5. Optionally close holes up to max_hole_size edges
      6. Optionally apply mild Taubin smoothing (volume-preserving)
    """
    pml = None
    tmp_in = tmp_out = None
    try:
        pml = _require_pymeshlab()
        _setup_selection(context, obj)

        tmp_in = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
        tmp_in.close()
        tmp_out = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
        tmp_out.close()

        if not _obj_export(tmp_in.name):
            return False, "OBJ export failed"

        ms = pml.MeshSet()
        ms.load_new_mesh(tmp_in.name)

        before_v = ms.current_mesh().vertex_number()
        before_f = ms.current_mesh().face_number()

        ms.meshing_remove_duplicate_vertices()
        ms.meshing_remove_duplicate_faces()
        ms.meshing_remove_null_faces()
        ms.meshing_repair_non_manifold_edges()
        ms.meshing_repair_non_manifold_vertices()
        ms.meshing_remove_unreferenced_vertices()

        if close_holes:
            try:
                ms.meshing_close_holes(maxholesize=max_hole_size)
            except Exception:
                pass

        if smooth_passes > 0:
            try:
                ms.apply_coord_taubin_smoothing(stepsmoothnum=smooth_passes)
            except Exception:
                pass

        after_v = ms.current_mesh().vertex_number()
        after_f = ms.current_mesh().face_number()

        ms.save_current_mesh(tmp_out.name)
        new_objs = _obj_import(tmp_out.name)
        if new_objs:
            _replace_mesh(obj, new_objs[0])
            for extra in new_objs[1:]:
                bpy.data.objects.remove(extra, do_unlink=True)

        dv = before_v - after_v
        df = before_f - after_f
        return True, (
            f"Repair complete: removed {dv} verts, {df} faces. "
            f"Result: {after_v:,} verts / {after_f:,} faces."
        )

    except Exception as exc:
        return False, f"Repair failed: {exc}"
    finally:
        for p in (tmp_in, tmp_out):
            if p:
                try:
                    os.unlink(p.name)
                except OSError:
                    pass


def run_decimate(obj, context,
                 target_faces: int = 5000,
                 quality_threshold: float = 0.3,
                 preserve_boundary: bool = True,
                 preserve_normals: bool = True) -> tuple[bool, str]:
    """
    High-quality quadric-error decimation via PyMeshLab.
    Uses texture-aware collapse when the mesh has UV coordinates.
    Produces significantly cleaner LOD meshes than Blender's Decimate modifier.
    """
    pml = None
    tmp_in = tmp_out = None
    try:
        pml = _require_pymeshlab()
        _setup_selection(context, obj)

        tmp_in = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
        tmp_in.close()
        tmp_out = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
        tmp_out.close()

        if not _obj_export(tmp_in.name):
            return False, "OBJ export failed"

        ms = pml.MeshSet()
        ms.load_new_mesh(tmp_in.name)

        before_f = ms.current_mesh().face_number()
        if before_f <= target_faces:
            return True, (
                f"Already at or below target ({before_f:,} ≤ {target_faces:,} faces) — skipped."
            )

        # Prefer texture-aware decimation to preserve UV seams
        has_tex = False
        try:
            has_tex = ms.current_mesh().has_wedge_tex_coord()
        except AttributeError:
            pass

        decimated = False
        if has_tex:
            try:
                ms.meshing_decimation_quadric_edge_collapse_with_texture(
                    targetfacenum=target_faces,
                    qualitythr=quality_threshold,
                    preserveboundary=preserve_boundary,
                    optimalplacement=True,
                )
                decimated = True
            except Exception:
                pass  # fall through to plain QEC

        if not decimated:
            ms.meshing_decimation_quadric_edge_collapse(
                targetfacenum=target_faces,
                qualitythr=quality_threshold,
                preserveboundary=preserve_boundary,
                preservenormal=preserve_normals,
                optimalplacement=True,
                autoclean=True,
            )

        after_f = ms.current_mesh().face_number()
        ms.save_current_mesh(tmp_out.name)

        new_objs = _obj_import(tmp_out.name)
        if new_objs:
            _replace_mesh(obj, new_objs[0])
            for extra in new_objs[1:]:
                bpy.data.objects.remove(extra, do_unlink=True)

        pct = 100.0 * (1.0 - after_f / max(1, before_f))
        method = "UV-preserving" if has_tex else "standard"
        return True, (
            f"Decimated {before_f:,} → {after_f:,} faces ({pct:.1f}% reduction, {method})."
        )

    except Exception as exc:
        return False, f"Decimation failed: {exc}"
    finally:
        for p in (tmp_in, tmp_out):
            if p:
                try:
                    os.unlink(p.name)
                except OSError:
                    pass


def run_split(obj, context,
              min_component_tris: int = 50) -> tuple[bool, str]:
    """
    Split a mesh into its connected components as separate Blender objects.
    Components smaller than min_component_tris triangles are discarded.
    Original object is left untouched.
    """
    pml = None
    tmp_in = None
    tmp_parts = []
    try:
        pml = _require_pymeshlab()
        _setup_selection(context, obj)

        tmp_in = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
        tmp_in.close()

        if not _obj_export(tmp_in.name):
            return False, "OBJ export failed"

        ms = pml.MeshSet()
        ms.load_new_mesh(tmp_in.name)
        ms.generate_splitting_by_connected_components()

        n = ms.number_meshes()
        if n <= 1:
            return True, "Mesh has only one connected component — nothing to split."

        created = []
        skipped = 0
        for i in range(n):
            ms.set_current_mesh(i)
            if ms.current_mesh().face_number() < min_component_tris:
                skipped += 1
                continue

            tmp_part = tempfile.NamedTemporaryFile(suffix=".obj", delete=False)
            tmp_part.close()
            tmp_parts.append(tmp_part.name)
            ms.save_current_mesh(tmp_part.name)

            new_objs = _obj_import(tmp_part.name)
            if new_objs:
                part_obj = new_objs[0]
                part_num = str(len(created) + 1).zfill(2)
                part_obj.name = f"{obj.name}_Part{part_num}"
                part_obj.location = obj.location.copy()
                part_obj.rotation_euler = obj.rotation_euler.copy()
                part_obj.scale = obj.scale.copy()
                for slot in obj.material_slots:
                    if slot.material:
                        part_obj.data.materials.append(slot.material)
                for extra in new_objs[1:]:
                    bpy.data.objects.remove(extra, do_unlink=True)
                created.append(part_obj)

        msg = f"Split into {len(created)} part(s)"
        if skipped:
            msg += f" ({skipped} tiny component(s) < {min_component_tris} tris discarded)"
        return True, msg

    except Exception as exc:
        return False, f"Split failed: {exc}"
    finally:
        if tmp_in:
            try:
                os.unlink(tmp_in.name)
            except OSError:
                pass
        for p in tmp_parts:
            try:
                os.unlink(p)
            except OSError:
                pass


# ── Install guard ─────────────────────────────────────────────────────────────
# Prevents concurrent pip runs when the button is double-clicked.

_install_running: bool = False


def _tag_redraw_viewports() -> None:
    try:
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == "VIEW_3D":
                    area.tag_redraw()
    except Exception:
        pass


# ── Operators ─────────────────────────────────────────────────────────────────

class FO4_OT_MeshLabInstall(Operator):
    """Install PyMeshLab into Blender's Python via pip"""
    bl_idname = "fo4.meshlab_install"
    bl_label = "Install PyMeshLab"

    def execute(self, context):
        global _install_running
        import threading

        # Already installed — nothing to do.
        ok, msg = _pymeshlab_available()
        if ok:
            self.report({"INFO"}, f"{msg} is already installed.")
            return {"FINISHED"}

        # Another thread is already installing — don't start a second one.
        if _install_running:
            self.report({"WARNING"}, "Install already in progress — please wait.")
            return {"CANCELLED"}

        _install_running = True

        def _run():
            global _install_running
            try:
                from . import tool_installers
                ok, msg = tool_installers.install_pymeshlab()
                if ok:
                    print(f"[MeshLab Install] ✓ {msg}")
                    print(
                        "[MeshLab Install] Note: any 'filter_*.dll does not exist' warnings "
                        "above are harmless — the PyPI package intentionally omits MeshLab's "
                        "GUI filter DLLs. All Python mesh processing functions work normally."
                    )
                else:
                    print(f"[MeshLab Install] ✗ pip install failed: {msg}")
            except Exception as exc:
                print(f"[MeshLab Install] ✗ Unexpected error: {exc}")
            finally:
                _install_running = False

            bpy.app.timers.register(_tag_redraw_viewports, first_interval=0.1)

        threading.Thread(target=_run, daemon=True).start()
        self.report({"INFO"}, "Installing PyMeshLab — check console for progress.")
        return {"FINISHED"}


class FO4_OT_MeshLabRepair(Operator):
    """Repair mesh: remove duplicates, fix non-manifold geometry, optionally close holes"""
    bl_idname = "fo4.meshlab_repair"
    bl_label = "Repair Mesh"
    bl_options = {"REGISTER", "UNDO"}

    close_holes: BoolProperty(name="Close Small Holes", default=True)
    max_hole_size: IntProperty(name="Max Hole Size (edges)", default=30, min=3, max=200)
    smooth_passes: IntProperty(
        name="Taubin Smooth Passes",
        description="Mild volume-preserving smoothing passes (0 = off)",
        default=0, min=0, max=20,
    )

    @classmethod
    def poll(cls, context):
        ok, _ = _pymeshlab_available()
        return ok and context.active_object and context.active_object.type == "MESH"

    def execute(self, context):
        ok, msg = run_repair(
            context.active_object, context,
            close_holes=self.close_holes,
            max_hole_size=self.max_hole_size,
            smooth_passes=self.smooth_passes,
        )
        self.report({"INFO"} if ok else {"ERROR"}, msg)
        return {"FINISHED"} if ok else {"CANCELLED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=340)


class FO4_OT_MeshLabDecimate(Operator):
    """High-quality mesh reduction using PyMeshLab quadric-error edge collapse — better than Blender's Decimate modifier"""
    bl_idname = "fo4.meshlab_decimate"
    bl_label = "Decimate Mesh (PyMeshLab)"
    bl_options = {"REGISTER", "UNDO"}

    target_faces: IntProperty(name="Target Face Count", default=5000, min=10, max=1000000)
    quality_threshold: FloatProperty(
        name="Quality Threshold",
        description="Higher = better shape preservation (slower). 0.3 is a good default.",
        default=0.3, min=0.0, max=1.0,
    )
    preserve_boundary: BoolProperty(
        name="Preserve Boundary Edges",
        description="Keep open boundary edges intact (important for game meshes)",
        default=True,
    )
    preserve_normals: BoolProperty(name="Preserve Normals", default=True)

    @classmethod
    def poll(cls, context):
        ok, _ = _pymeshlab_available()
        return ok and context.active_object and context.active_object.type == "MESH"

    def execute(self, context):
        ok, msg = run_decimate(
            context.active_object, context,
            target_faces=self.target_faces,
            quality_threshold=self.quality_threshold,
            preserve_boundary=self.preserve_boundary,
            preserve_normals=self.preserve_normals,
        )
        self.report({"INFO"} if ok else {"ERROR"}, msg)
        return {"FINISHED"} if ok else {"CANCELLED"}

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == "MESH":
            # Default to 50% of current face count
            current = sum(
                1 if len(p.vertices) == 3 else 2
                for p in obj.data.polygons
            )
            self.target_faces = max(100, current // 2)
        return context.window_manager.invoke_props_dialog(self, width=380)


class FO4_OT_MeshLabSplit(Operator):
    """Split mesh into connected components as separate Blender objects (original kept)"""
    bl_idname = "fo4.meshlab_split"
    bl_label = "Split Into Parts"
    bl_options = {"REGISTER", "UNDO"}

    min_component_tris: IntProperty(
        name="Min Component Size (tris)",
        description="Discard components smaller than this — filters stray triangles",
        default=50, min=1, max=10000,
    )

    @classmethod
    def poll(cls, context):
        ok, _ = _pymeshlab_available()
        return ok and context.active_object and context.active_object.type == "MESH"

    def execute(self, context):
        ok, msg = run_split(
            context.active_object, context,
            min_component_tris=self.min_component_tris,
        )
        self.report({"INFO"} if ok else {"ERROR"}, msg)
        return {"FINISHED"} if ok else {"CANCELLED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=340)


class FO4_OT_MeshLabCleanAndReduce(Operator):
    """Repair then decimate in one step — fastest path to a clean, game-ready mesh"""
    bl_idname = "fo4.meshlab_clean_and_reduce"
    bl_label = "Clean & Reduce"
    bl_options = {"REGISTER", "UNDO"}

    target_faces: IntProperty(name="Target Face Count", default=5000, min=10, max=1000000)
    quality_threshold: FloatProperty(
        name="Quality Threshold", default=0.3, min=0.0, max=1.0,
    )
    close_holes: BoolProperty(name="Close Small Holes", default=True)
    max_hole_size: IntProperty(name="Max Hole Size", default=30, min=3, max=200)

    @classmethod
    def poll(cls, context):
        ok, _ = _pymeshlab_available()
        return ok and context.active_object and context.active_object.type == "MESH"

    def execute(self, context):
        obj = context.active_object

        ok_r, msg_r = run_repair(
            obj, context,
            close_holes=self.close_holes,
            max_hole_size=self.max_hole_size,
        )
        if not ok_r:
            self.report({"WARNING"}, f"Repair step warning: {msg_r}")

        ok_d, msg_d = run_decimate(
            obj, context,
            target_faces=self.target_faces,
            quality_threshold=self.quality_threshold,
        )
        self.report(
            {"INFO"} if ok_d else {"ERROR"},
            f"Repair: {msg_r}  |  Decimate: {msg_d}",
        )
        return {"FINISHED"} if ok_d else {"CANCELLED"}

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == "MESH":
            current = sum(
                1 if len(p.vertices) == 3 else 2
                for p in obj.data.polygons
            )
            self.target_faces = max(100, current // 2)
        return context.window_manager.invoke_props_dialog(self, width=380)


# ── Panel ─────────────────────────────────────────────────────────────────────

class FO4_PT_MeshLabPanel(Panel):
    """PyMeshLab mesh processing tools — repair, reduce, split"""
    bl_label = "Mesh Tools (PyMeshLab)"
    bl_idname = "FO4_PT_meshlab_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Fallout 4"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        ok, version_msg = _pymeshlab_available()

        if not ok:
            box = layout.box()
            if _install_running:
                box.label(text="Installing PyMeshLab…", icon="TIME")
                box.label(text="Check Window → Toggle System Console for progress", icon="BLANK1")
            else:
                box.label(text="PyMeshLab not installed", icon="ERROR")
                box.label(text="Provides high-quality mesh repair and LOD reduction", icon="BLANK1")
                box.operator("fo4.meshlab_install", text="Install PyMeshLab", icon="IMPORT")
                box.separator(factor=0.5)
                col = box.column(align=True)
                col.scale_y = 0.8
                col.label(text="Credits: CNR-ISTI VCLab", icon="URL")
                col.label(text="cnr-isti-vclab/PyMeshLab (MIT)", icon="BLANK1")
            return

        has_mesh = bool(context.active_object and context.active_object.type == "MESH")

        # One-shot hero button
        hero = layout.box()
        hero.label(text="One-Shot Pipeline", icon="SHADERFX")
        r = hero.row()
        r.enabled = has_mesh
        r.scale_y = 1.4
        r.operator("fo4.meshlab_clean_and_reduce", text="Clean & Reduce", icon="MOD_DECIM")

        layout.separator(factor=0.4)

        # Repair
        rb = layout.box()
        rb.label(text="Repair", icon="TOOL_SETTINGS")
        rr = rb.row()
        rr.enabled = has_mesh
        rr.operator("fo4.meshlab_repair", text="Repair Mesh", icon="SHADERFX")

        layout.separator(factor=0.4)

        # Decimate
        db = layout.box()
        db.label(text="Reduce (LOD Quality)", icon="MOD_DECIM")
        dr = db.row()
        dr.enabled = has_mesh
        dr.operator("fo4.meshlab_decimate", text="Decimate Mesh", icon="MOD_DECIM")

        layout.separator(factor=0.4)

        # Split
        sb = layout.box()
        sb.label(text="Split Into Parts", icon="UNLINKED")
        sr = sb.row()
        sr.enabled = has_mesh
        sr.operator("fo4.meshlab_split", text="Split by Components", icon="MOD_EXPLODE")

        layout.separator(factor=0.4)
        layout.label(text=version_msg, icon="CHECKMARK")


# ── Registration ──────────────────────────────────────────────────────────────

classes = (
    FO4_OT_MeshLabInstall,
    FO4_OT_MeshLabRepair,
    FO4_OT_MeshLabDecimate,
    FO4_OT_MeshLabSplit,
    FO4_OT_MeshLabCleanAndReduce,
    FO4_PT_MeshLabPanel,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            existing = getattr(bpy.types, cls.__name__, None)
            if existing:
                try:
                    bpy.utils.unregister_class(existing)
                except Exception:
                    pass
            try:
                bpy.utils.register_class(cls)
            except Exception as exc:
                print(f"[meshlab_helpers] Failed to register {cls.__name__}: {exc}")


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
