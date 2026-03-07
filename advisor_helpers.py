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
            # Try Mossy first (local, no API key needed).
            # Fall back to the configured remote LLM endpoint if Mossy is not
            # available or not configured as the AI advisor.
            ai_resp = AdvisorHelpers.query_mossy(report)
            if not ai_resp:
                ai_resp = AdvisorHelpers.query_llm(report)
            if ai_resp:
                report["llm"] = ai_resp

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

        # Shading / auto-smooth
        # `use_auto_smooth` was removed in Blender 4.1 (shading by angle is
        # now the default).  Only check the attribute when it actually exists
        # so we don't crash on modern Blender versions.
        if hasattr(obj.data, 'use_auto_smooth') and not obj.data.use_auto_smooth:
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
    def query_mossy(meta_report):
        """Send the advisor report to Mossy's HTTP AI endpoint and return its response.

        This is the Mossy-specific AI path.  Unlike :meth:`query_llm`, which
        requires an OpenAI-compatible remote endpoint and API key, this calls
        Mossy's local HTTP server directly — no API key needed, no data leaves
        your machine.

        Mossy must be running on the desktop and ``use_mossy_as_ai`` must be
        enabled in the add-on preferences.  The function returns ``None``
        silently when either condition is not met, so the caller can fall back
        to the standard LLM path without branching logic.
        """
        prefs = preferences.get_preferences()
        if not prefs or not getattr(prefs, 'use_mossy_as_ai', False):
            return None

        # Build the context we send to Mossy (summary strings only — no mesh
        # or texture binaries ever leave Blender).
        kb_snippets = []
        if getattr(prefs, "knowledge_base_enabled", False):
            kb_snippets = knowledge_helpers.load_snippets(max_files=4, max_chars=800)

        context_data = {
            "issues":          meta_report.get("issues",      [])[:20],
            "suggestions":     meta_report.get("suggestions", [])[:10],
            "objects_checked": meta_report.get("objects_checked", 0),
            "kb":              kb_snippets[:4],
        }
        query = (
            "I'm working on Fallout 4 mod assets in Blender. "
            "Please review these export-readiness issues and give me clear, "
            "prioritised fixes as a beginner-friendly step-by-step list."
        )

        try:
            from . import mossy_link as _ml
            response = _ml.ask_mossy(query, context_data=context_data, timeout=10)
            # ask_mossy() returns None on any connection/parse failure, so
            # returning it directly lets analyze_scene() fall through to the
            # remote LLM endpoint without any further checks.
            return response  # str with content, or None
        except Exception:
            return None

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
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj
                # Apply shade-smooth first (works on all Blender versions).
                bpy.ops.object.shade_smooth()
                # Blender ≤4.0: enable use_auto_smooth and set angle to 180°
                # so ALL faces are smooth-shaded and tangents export cleanly.
                # Blender 4.1+: use_auto_smooth was removed; shade_smooth_by_angle
                # is the equivalent.  We try both paths gracefully.
                if hasattr(obj.data, 'use_auto_smooth'):
                    try:
                        obj.data.use_auto_smooth = True
                        obj.data.auto_smooth_angle = 3.14159265358979  # 180 °
                    except AttributeError:
                        pass
                else:
                    # Blender 4.1+: shade_smooth_by_angle with 180° keeps all
                    # faces smooth-shaded, matching the Blender ≤4.0 behaviour.
                    try:
                        bpy.ops.object.shade_smooth_by_angle(angle=3.14159265358979)
                    except Exception:
                        pass  # operator not available in all contexts; skip
            return True, "Shade Smooth + Auto Smooth applied to selected meshes"

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


def register():
    pass


def unregister():
    pass
