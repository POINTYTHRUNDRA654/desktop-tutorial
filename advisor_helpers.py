"""
Advisor helpers: scene checks and optional LLM-backed suggestions (opt-in).
The assistant stays rules-first and offline by default. LLM calls are opt-in via preferences.
"""

import bpy
import json
import urllib.request
import urllib.error
import contextlib
from mathutils import Matrix

from . import mesh_helpers, texture_helpers, preferences, export_helpers, notification_system, knowledge_helpers


class AdvisorHelpers:
    """Scene analysis and optional LLM suggestion helper."""

    _last_signature = None
    _timer_registered = False

    @staticmethod
    def _is_identity_matrix(mat: Matrix, tol: float = 1e-4) -> bool:
        return all(abs(mat[i][j] - (1.0 if i == j else 0.0)) < tol for i in range(3) for j in range(3))

    @staticmethod
    def analyze_scene(context, use_llm: bool = False):
        selected = [obj for obj in context.selected_objects if obj.type in {'MESH', 'ARMATURE'}]
        report = {
            "objects_checked": len(selected),
            "issues": [],
            "suggestions": [],
            "llm": None,
        }

        if not selected:
            report["issues"].append("No mesh or armature selected. Select assets to analyze.")
            return report

        for obj in selected:
            if obj.type == 'MESH':
                AdvisorHelpers._analyze_mesh(obj, report)
            elif obj.type == 'ARMATURE':
                AdvisorHelpers._analyze_armature(obj, report)

        # Export readiness quick check (uses existing helpers)
        export_ok, export_issues = export_helpers.ExportHelpers.validate_before_export(selected[0]) if selected else (True, [])
        if not export_ok and export_issues:
            for issue in export_issues:
                report["issues"].append(f"Export validation: {issue}")

        if use_llm:
            llm_resp = AdvisorHelpers.query_llm(report)
            if llm_resp:
                report["llm"] = llm_resp

        # Derive suggestions from findings
        AdvisorHelpers._derive_suggestions(report)
        return report

    @staticmethod
    def _analyze_mesh(obj, report):
        # Transforms
        scale = obj.scale
        if any(abs(s - 1.0) > 1e-3 for s in scale):
            report["issues"].append(f"{obj.name}: Scale not applied ({scale[0]:.2f},{scale[1]:.2f},{scale[2]:.2f}) → Apply transforms.")
        rot = obj.rotation_euler
        if any(abs(r) > 1e-3 for r in rot):
            report["issues"].append(f"{obj.name}: Rotation not applied ({rot[0]:.2f},{rot[1]:.2f},{rot[2]:.2f}) → Apply transforms.")

        # Mesh validation via existing helper
        ok, mesh_issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        if not ok:
            for issue in mesh_issues:
                report["issues"].append(f"{obj.name}: {issue}")

        # Texture validation
        if obj.data.materials:
            tex_ok, tex_issues = texture_helpers.TextureHelpers.validate_textures(obj)
            if not tex_ok:
                for issue in tex_issues:
                    report["issues"].append(f"{obj.name}: {issue}")

        # Shading/auto smooth
        if not obj.data.use_auto_smooth:
            report["issues"].append(f"{obj.name}: Auto Smooth disabled → enable for tangents/normals.")

    @staticmethod
    def _analyze_armature(obj, report):
        if not obj.animation_data:
            report["issues"].append(f"{obj.name}: No animation_data set (ok for static rigs).")

    @staticmethod
    def _derive_suggestions(report):
        # Simple mapping from issues to suggested actions
        for issue in report["issues"]:
            if "Scale not applied" in issue or "Rotation not applied" in issue:
                report["suggestions"].append("Apply transforms on selected meshes.")
            if "Auto Smooth disabled" in issue:
                report["suggestions"].append("Enable Auto Smooth and shade smooth.")
            if "textures" in issue.lower():
                report["suggestions"].append("Convert textures to DDS (BC1/BC3/BC5) and relink.")
            if "non-manifold" in issue.lower():
                report["suggestions"].append("Fix non-manifold geometry before export.")
            if "Export validation" in issue:
                report["suggestions"].append("Run Validate Before Export and fix blockers.")

    @staticmethod
    def query_llm(meta_report):
        """Optional LLM call using user-configured endpoint. Sends only summary strings."""
        cfg = preferences.get_llm_config()
        if not cfg.get("enabled"):
            return None
        if not cfg.get("endpoint") or not cfg.get("api_key"):
            return None

        kb_snippets = []
        prefs = preferences.get_preferences()
        if prefs and getattr(prefs, "knowledge_base_enabled", False):
            kb_snippets = knowledge_helpers.load_snippets(max_files=6, max_chars=1200)

        payload = {
            "model": cfg.get("model", ""),
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Blender→Fallout4 export assistant. Reply briefly with prioritized fixes for export readiness, textures, and scale/rig issues."
                },
                {
                    "role": "user",
                    "content": json.dumps({
                        "issues": meta_report.get("issues", [])[:20],
                        "suggestions": meta_report.get("suggestions", [])[:20],
                        "objects_checked": meta_report.get("objects_checked", 0),
                        "kb": kb_snippets[:6],
                    })
                }
            ]
        }
        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['api_key']}",
        }
        req = urllib.request.Request(cfg['endpoint'], data=data, headers=headers, method="POST")
        try:
            with contextlib.closing(urllib.request.urlopen(req, timeout=8)) as resp:
                text = resp.read().decode("utf-8", errors="replace")
                # Best-effort parse minimal JSON; otherwise return raw text
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, dict):
                        # Try OpenAI-style choices
                        if 'choices' in parsed and parsed['choices']:
                            return parsed['choices'][0].get('message', {}).get('content', text)
                    return text
                except json.JSONDecodeError:
                    return text
        except Exception as e:
            return f"LLM call failed: {e}"

    @staticmethod
    def apply_quick_fix(context, action: str):
        objs = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not objs:
            return False, "No mesh objects selected"

        if bpy.ops.object.mode_set.poll():
            try:
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass

        if action == 'APPLY_TRANSFORMS':
            for obj in objs:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            return True, "Transforms applied to selected meshes"

        if action == 'SHADE_SMOOTH_AUTOSMOOTH':
            for obj in objs:
                obj.data.use_auto_smooth = True
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.shade_smooth()
            return True, "Enabled Auto Smooth and Shade Smooth"

        if action == 'VALIDATE_EXPORT':
            success, issues = export_helpers.ExportHelpers.validate_before_export(objs[0])
            if success:
                return True, "Validation passed"
            return False, "; ".join(issues)

        return False, f"Unknown action: {action}"

    @staticmethod
    def _signature_from_report(report: dict) -> str:
        issues = report.get("issues", [])
        suggestions = report.get("suggestions", [])
        key = "|".join(sorted(issues + suggestions))
        return str(hash(key))

    @staticmethod
    def auto_monitor_tick():
        prefs = preferences.get_preferences()
        if not prefs or not prefs.advisor_auto_monitor_enabled:
            AdvisorHelpers._timer_registered = False
            return None

        interval = max(5.0, float(prefs.advisor_auto_monitor_interval))

        context = bpy.context
        if context is None:
            return interval

        selected = [obj for obj in context.selected_objects if obj.type in {'MESH', 'ARMATURE'}]
        if not selected:
            return interval

        report = AdvisorHelpers.analyze_scene(context, use_llm=prefs.llm_enabled)
        sig = AdvisorHelpers._signature_from_report(report)
        if sig != AdvisorHelpers._last_signature:
            AdvisorHelpers._last_signature = sig
            if report.get("issues"):
                msg = f"Advisor: {len(report['issues'])} issues detected."
                notification_system.FO4_NotificationSystem.notify(msg, 'WARNING')
            else:
                notification_system.FO4_NotificationSystem.notify("Advisor: no issues detected.", 'INFO')

        return interval

    @staticmethod
    def start_auto_monitor():
        if AdvisorHelpers._timer_registered:
            return
        bpy.app.timers.register(AdvisorHelpers.auto_monitor_tick, persistent=True)
        AdvisorHelpers._timer_registered = True

    @staticmethod
    def stop_auto_monitor():
        # Timers self-remove when returning None; mark as not registered
        AdvisorHelpers._timer_registered = False
