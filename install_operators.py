"""Tool installation and status-check operators."""

import bpy
import sys
import importlib
import threading
import os as _os
from bpy.types import Operator
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty


def _safe_import(name):
    """Import a submodule of this package safely; returns None on failure."""
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        sys.modules.pop(f"{__package__}.{name}", None)
        print(f"install_operators: Skipped module {name} due to error: {exc}")
        return None


knowledge_helpers         = _safe_import("knowledge_helpers")
umodel_helpers            = _safe_import("umodel_helpers")
asset_studio_helpers      = _safe_import("asset_studio_helpers")
asset_ripper_helpers      = _safe_import("asset_ripper_helpers")
notification_system       = _safe_import("notification_system")
tool_installers           = _safe_import("tool_installers")
ue_importer_helpers       = _safe_import("ue_importer_helpers")
umodel_tools_helpers      = _safe_import("umodel_tools_helpers")
mesh_helpers              = _safe_import("mesh_helpers")
unity_fbx_importer_helpers = _safe_import("unity_fbx_importer_helpers")
realesrgan_helpers        = _safe_import("realesrgan_helpers")
instantngp_helpers        = _safe_import("instantngp_helpers")
preferences               = _safe_import("preferences")


class FO4_OT_InstallCollectiveModdingToolkit(Operator):
    """Auto-download the Collective Modding Toolkit (wxMichael) from GitHub."""
    bl_idname = "fo4.install_collective_modding_toolkit"
    bl_label  = "Install Collective Modding Toolkit"

    def execute(self, context):
        try:
            from . import tool_installers
        except ImportError:
            self.report({'ERROR'}, "tool_installers module unavailable")
            return {'CANCELLED'}
        ok, msg = tool_installers.install_collective_modding_toolkit()
        level = 'INFO' if ok else 'ERROR'
        self.report({level}, msg.split("\n")[0])
        try:
            from . import notification_system
            notification_system.FO4_NotificationSystem.notify(msg.split("\n")[0], level)
        except Exception:
            pass
        return {'FINISHED'} if ok else {'CANCELLED'}


class FO4_OT_InstallGradio(Operator):
    """Install Gradio web UI framework via pip (automatic)."""
    bl_idname = "fo4.install_gradio"
    bl_label = "Auto-Install Gradio"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING GRADIO")
            print("=" * 60)
            ok, msg = tool_installers.install_gradio()
            print(msg)
            print("=" * 60 + "\n")
            if ok:
                try:
                    from . import gradio_helpers as _gh
                    _gh.refresh_availability()
                except Exception as exc:
                    print(f"⚠ gradio_helpers.refresh_availability() failed: {exc}")
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing Gradio in background - check console (Window > Toggle System Console)")
        return {'FINISHED'}


class FO4_OT_CheckKBTools(Operator):
    """Check knowledge-base tooling (pypdf, ffmpeg, whisper)"""
    bl_idname = "fo4.check_kb_tools"
    bl_label = "Check KB Tools"

    def execute(self, context):
        status = knowledge_helpers.tool_status()
        lines = []
        for key, label in (
            ("pypdf",  "pypdf (PDF parsing)"),
            ("ffmpeg", "ffmpeg (audio extract)"),
            ("whisper", "whisper CLI (transcription)"),
        ):
            ok = status.get(key, False)
            mark = "✓" if ok else "✗"
            lines.append(f"{mark} {label}")

        summary = "; ".join(lines)
        self.report({'INFO'}, summary)
        notification_system.FO4_NotificationSystem.notify(summary, 'INFO')
        print("\nKB TOOLS STATUS")
        for line in lines:
            print(line)
        print("Use tools/pdf_to_md.py and tools/video_to_txt.ps1 for bulk conversion.")
        return {'FINISHED'}


class FO4_OT_CheckUEImporter(Operator):
    """Check and (if missing) download/register the UE importer."""
    bl_idname = "fo4.check_ue_importer"
    bl_label = "Check UE Importer"

    def execute(self, context):
        actions = []

        ready, message = ue_importer_helpers.status()

        if not ready and "missing" in message.lower():
            ok, msg = ue_importer_helpers.download_latest()
            actions.append(msg)
            if ok:
                ue_importer_helpers.register()
                ready, message = ue_importer_helpers.status()

        # If present but not registered, attempt to register
        elif not ready:
            ue_importer_helpers.register()
            ready, message = ue_importer_helpers.status()

        status_lines = [message] + actions
        status_text = "; ".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'ERROR'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("UE IMPORTER STATUS")
        print(status_text)
        print(f"Path: {ue_importer_helpers.importer_path()}")
        return {'FINISHED'}


class FO4_OT_InstallUEImporter(Operator):
    """Auto-download and register the Blender-UE4-Importer add-on."""
    bl_idname = "fo4.install_ue_importer"
    bl_label = "Auto-Install UE Importer"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING UE IMPORTER")
            print("=" * 60)
            try:
                ok, msg = ue_importer_helpers.download_latest()
                print(msg)
                if ok:
                    # bpy.utils.register_class() cannot be called from a
                    # background thread - schedule on the main thread via timer.
                    def _finish():
                        ue_importer_helpers.register()
                        _, status_msg = ue_importer_helpers.status()
                        print("=" * 60 + "\n")
                        notification_system.FO4_NotificationSystem.notify(
                            status_msg, 'INFO'
                        )
                        return None  # de-register the timer

                    bpy.app.timers.register(_finish, first_interval=0.0)
                    return  # notification dispatched from _finish()
            except Exception as exc:
                ok, msg = False, f"UE Importer install error: {exc}"
                print(msg)
            print("=" * 60 + "\n")
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing UE Importer in background - check console")
        return {'FINISHED'}


class FO4_OT_CheckUModelTools(Operator):
    """Check and (if missing) download/register UModel Tools add-on."""
    bl_idname = "fo4.check_umodel_tools"
    bl_label = "Check UModel Tools"

    def execute(self, context):
        actions = []

        ready, message = umodel_tools_helpers.status()

        missing_modules = []
        for mod_name in ("ordered_set", "lark", "tqdm"):
            try:
                __import__(mod_name)
            except ImportError:
                missing_modules.append(mod_name)

        needs_download = (
            not ready and (
                "missing" in message.lower() or "incomplete" in message.lower()
            )
        )

        if needs_download:
            ok, msg = umodel_tools_helpers.download_latest()
            actions.append(msg)
            if ok:
                umodel_tools_helpers.register()
                tool_installers.auto_configure_preferences()
                ready, message = umodel_tools_helpers.status()
        elif not ready:
            umodel_tools_helpers.register()
            ready, message = umodel_tools_helpers.status()

        if missing_modules:
            actions.append(
                f"Missing python deps: {', '.join(missing_modules)} (pip install -r tools/umodel_tools/requirements.txt)"
            )

        status_lines = [message] + actions
        status_text = "; ".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'ERROR'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("UMODEL TOOLS STATUS")
        print(status_text)
        print(f"Path: {umodel_tools_helpers.addon_path()}")
        return {'FINISHED'}


class FO4_OT_OpenUModelToolsPage(Operator):
    """Auto-download UModel Tools from GitHub (replaces browser open)."""
    bl_idname = "fo4.open_umodel_tools_page"
    bl_label = "Download UModel Tools"

    def execute(self, context):
        import threading

        def _run():
            ok, msg = umodel_tools_helpers.download_latest()
            if ok:
                tool_installers.auto_configure_preferences()
            level = 'INFO' if ok else 'ERROR'
            print(f"[UModel Tools] {msg}")
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Downloading UModel Tools in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallUModelTools(Operator):
    """Auto-download UModel Tools and install its Python dependencies."""
    bl_idname = "fo4.install_umodel_tools"
    bl_label = "Auto-Install UModel Tools"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING UMODEL TOOLS")
            print("=" * 60)
            try:
                # 1. Download the repo
                ok, msg = umodel_tools_helpers.download_latest()
                print(msg)
                if not ok:
                    print("=" * 60 + "\n")
                    notification_system.FO4_NotificationSystem.notify(msg, 'ERROR')
                    return

                # 2. Install Python dependencies (ordered_set, tqdm, lark)
                deps_ok, deps_msg = tool_installers._pip_install(
                    ["ordered_set", "tqdm", "lark"]
                )
                print(deps_msg)

                # 3. Also install from requirements.txt if present
                req = umodel_tools_helpers.get_tool_dir() / "requirements.txt"
                req_ok = True
                if req.exists():
                    req_ok, req_msg = tool_installers._pip_install_requirements(req)
                    print(req_msg)

                all_deps_ok = deps_ok and req_ok
                final_msg = (
                    f"{msg} - Python deps installed. "
                    "UModel Tools downloaded and ready. "
                    "Install it as a Blender addon via "
                    "Edit > Preferences > Add-ons > Install."
                ) if all_deps_ok else (
                    f"{msg} - Warning: some Python deps failed to install: {deps_msg}"
                )

                # Wire any newly discovered tools into prefs immediately
                tool_installers.auto_configure_preferences()
            except Exception as exc:
                final_msg = f"UModel Tools install error: {exc}"
                print(final_msg)
            print("=" * 60 + "\n")
            notification_system.FO4_NotificationSystem.notify(final_msg, 'INFO')

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing UModel Tools in background - check console")
        return {'FINISHED'}


class FO4_OT_CheckUModel(Operator):
    """Check and download UModel (UE Viewer) by Konstantin Nosov (Gildor)."""
    bl_idname = "fo4.check_umodel"
    bl_label = "Check/Install UModel"

    def execute(self, context):
        if not umodel_helpers:
            self.report({'ERROR'}, "umodel_helpers module unavailable")
            return {'CANCELLED'}
        ready, message = umodel_helpers.status()
        actions = []

        if not ready:
            # Try to download/install
            ok, msg = umodel_helpers.download_latest()
            actions.append(msg)
            ready, message = umodel_helpers.status()

        status_lines = [message] + actions
        status_text = "\n".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'WARNING'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("="*70)
        print("UMODEL (UE VIEWER) STATUS")
        print("="*70)
        print(status_text)
        print(f"Tool path: {umodel_helpers.tool_path()}")
        if umodel_helpers.executable_path():
            print(f"Executable: {umodel_helpers.executable_path()}")
        print("Credit: UModel by Konstantin Nosov (Gildor)")
        print("https://www.gildor.org/en/projects/umodel")
        print("="*70)
        return {'FINISHED'}


class FO4_OT_ScanFO4Readiness(Operator):
    """Scan the entire scene for FO4 export readiness (meshes, LODs, collision)."""
    bl_idname = "fo4.scan_fo4_readiness"
    bl_label = "Scan FO4 Readiness"
    bl_options = {'REGISTER'}

    max_collisions_per_object: IntProperty(
        name="Max Collisions per Object",
        description="Soft limit for UCX_ collision meshes per object; higher counts can bloat Havok data",
        default=32,
        min=1,
        max=1024,
    )

    max_collisions_scene: IntProperty(
        name="Max Collisions in Scene",
        description="Soft limit for total collision meshes before export; large collision counts can exceed Havok block limits",
        default=512,
        min=1,
        max=5000,
    )

    @staticmethod
    def _is_collision(obj):
        name_up = obj.name.upper()
        return (
            obj.get("fo4_collision")
            or name_up.startswith("UCX_")
            or name_up.endswith("_COLLISION")
            or name_up.startswith("COLLISION")
        )

    @staticmethod
    def _is_lod(obj):
        name_low = obj.name.lower()
        return (
            "_lod" in name_low
            or name_low.startswith("lod")
            or name_low.endswith(".lod")
        )

    def execute(self, context):
        scene = context.scene
        mesh_objects = [o for o in scene.objects if getattr(o, "type", None) == 'MESH']

        if not mesh_objects:
            self.report({'WARNING'}, "No mesh objects in scene to scan")
            return {'CANCELLED'}

        collisions = [o for o in mesh_objects if self._is_collision(o)]
        lods = [o for o in mesh_objects if not self._is_collision(o) and self._is_lod(o)]
        bases = [o for o in mesh_objects if o not in collisions and o not in lods]

        issues = []
        warnings = []

        # Per-object validation
        for obj in mesh_objects:
            success, obj_issues = mesh_helpers.MeshHelpers.validate_mesh(
                obj, is_collision=self._is_collision(obj)
            )
            if not success and obj_issues:
                issues.append((obj.name, obj_issues))

        # Collision presence and limits
        for base in bases:
            armature_mod = any(m.type == 'ARMATURE' for m in getattr(base, "modifiers", []))
            if armature_mod:
                continue  # skinned meshes manage collision via skeleton

            ucx_prefix = f"UCX_{base.name}".upper()
            base_collisions = [
                c for c in collisions
                if c.parent == base
                or c.name.upper() == ucx_prefix
                or c.name.upper().startswith(f"{ucx_prefix}_")
            ]

            if not base_collisions and len(base.data.polygons) >= 4:
                warnings.append(f"{base.name}: no UCX_ collision mesh found")
            elif len(base_collisions) > self.max_collisions_per_object:
                warnings.append(
                    f"{base.name}: {len(base_collisions)} collision meshes (soft limit {self.max_collisions_per_object})"
                )

        # LOD sanity checks
        orphan_lods = []
        for lod_obj in lods:
            name_low = lod_obj.name.lower()
            root_name = name_low.split("_lod")[0]
            has_base = any(b.name.lower() == root_name for b in bases)
            if not has_base:
                orphan_lods.append(lod_obj.name)

        if orphan_lods:
            warnings.append(
                f"LOD meshes without matching base object: {', '.join(sorted(orphan_lods)[:5])}"
                + ("..." if len(orphan_lods) > 5 else "")
            )

        if len(collisions) > self.max_collisions_scene:
            warnings.append(
                f"Scene has {len(collisions)} collision meshes (soft limit {self.max_collisions_scene})"
            )

        # Print human-readable report to the system console
        print("\n" + "=" * 70)
        print("FO4 READINESS SCAN (LOD / Collision / Export)")
        print("=" * 70)
        print(f"Base meshes: {len(bases)}")
        print(f"LOD meshes:  {len(lods)}")
        print(f"Collision meshes: {len(collisions)}")

        if issues:
            print("\nBlocking issues:")
            for obj_name, obj_issues in issues:
                print(f" - {obj_name}:")
                for item in obj_issues:
                    print(f"    • {item}")

        if warnings:
            print("\nWarnings:")
            for w in warnings:
                print(f" - {w}")

        if not issues and not warnings:
            msg = "FO4 readiness scan passed – scene is export-ready"
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        else:
            msg = (
                f"Readiness scan found {len(issues)} blocking issue group(s) "
                f"and {len(warnings)} warning(s)"
            )
            level = 'WARNING' if issues else 'INFO'
            self.report({level}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, level)

        return {'FINISHED'}


class FO4_OT_CheckUnityFBXImporter(Operator):
    """Check and (if missing) download UnityFBX-To-Blender-Importer repo."""
    bl_idname = "fo4.check_unity_fbx_importer"
    bl_label = "Check Unity FBX Importer"

    def execute(self, context):
        ready, message = unity_fbx_importer_helpers.status()
        actions = []

        if not ready:
            ok, msg = unity_fbx_importer_helpers.download_latest()
            actions.append(msg)
            ready, message = unity_fbx_importer_helpers.status()

        status_lines = [message] + actions
        status_text = "; ".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'ERROR'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("UNITY FBX IMPORTER STATUS")
        print(status_text)
        print(f"Repo: {unity_fbx_importer_helpers.repo_path()}")
        print(f"Unity package: {unity_fbx_importer_helpers.package_path()}")
        return {'FINISHED'}


class FO4_OT_CheckAssetStudio(Operator):
    """Check and (if missing) download AssetStudio repo."""
    bl_idname = "fo4.check_asset_studio"
    bl_label = "Check AssetStudio"

    def execute(self, context):
        if not asset_studio_helpers:
            self.report({'ERROR'}, "asset_studio_helpers module unavailable")
            return {'CANCELLED'}
        ready, message = asset_studio_helpers.status()
        actions = []

        if not ready:
            ok, msg = asset_studio_helpers.download_latest()
            actions.append(msg)
            ready, message = asset_studio_helpers.status()

        status_lines = [message] + actions
        status_text = "; ".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'ERROR'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("ASSET STUDIO STATUS")
        print(status_text)
        print(f"Repo: {asset_studio_helpers.repo_path()}")
        return {'FINISHED'}


class FO4_OT_CheckAssetRipper(Operator):
    """Check and (if missing) download AssetRipper repo."""
    bl_idname = "fo4.check_asset_ripper"
    bl_label = "Check AssetRipper"

    def execute(self, context):
        if not asset_ripper_helpers:
            self.report({'ERROR'}, "asset_ripper_helpers module unavailable")
            return {'CANCELLED'}
        ready, message = asset_ripper_helpers.status()
        actions = []

        if not ready:
            ok, msg = asset_ripper_helpers.download_latest()
            actions.append(msg)
            ready, message = asset_ripper_helpers.status()

        status_lines = [message] + actions
        status_text = "; ".join([s for s in status_lines if s])
        level = 'INFO' if ready else 'ERROR'
        self.report({level}, status_text)
        notification_system.FO4_NotificationSystem.notify(status_text, level)
        print("ASSET RIPPER STATUS")
        print(status_text)
        print(f"Repo: {asset_ripper_helpers.repo_path()}")
        return {'FINISHED'}


class FO4_OT_InstallFFmpeg(Operator):
    """Download and install FFmpeg to the workspace."""
    bl_idname = "fo4.install_ffmpeg"
    bl_label = "Install FFmpeg"

    def execute(self, context):
        import threading
        from . import tool_installers, preferences

        def _run():
            ok, msg = tool_installers.install_ffmpeg()
            level = 'INFO' if ok else 'ERROR'
            print("FFMPEG INSTALL", msg)
            prefs = preferences.get_preferences() if ok else None

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
                if prefs:
                    tools_root = tool_installers.get_tools_root()
                    ffmpeg_dir = tools_root / "ffmpeg"
                    for exe_name in ("ffmpeg.exe", "ffmpeg"):
                        for exe in ffmpeg_dir.rglob(exe_name):
                            prefs.ffmpeg_path = str(exe)
                            print(f"ffmpeg path configured: {exe}")
                            break
                        if prefs.ffmpeg_path:
                            break
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "FFmpeg installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_InstallNVTT(Operator):
    """Download and install NVIDIA Texture Tools (nvcompress)."""
    bl_idname = "fo4.install_nvtt"
    bl_label = "Install NVTT"

    def execute(self, context):
        import threading
        from . import tool_installers, preferences

        def _run():
            from pathlib import Path
            ok, msg = tool_installers.install_nvtt()
            level = 'INFO' if ok else 'ERROR'
            print("NVTT INSTALL", msg)
            prefs = preferences.get_preferences() if ok else None

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
                if prefs:
                    # Check new D:/blender_tools/ location first
                    tools_root = tool_installers.get_tools_root()
                    nvtt_dir = tools_root / "nvtt"
                    for exe in nvtt_dir.rglob("nvcompress.exe"):
                        prefs.nvtt_path = str(exe)
                        print(f"NVTT path configured: {exe}")
                        break
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "NVTT installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_InstallTexconv(Operator):
    """Download and install DirectXTex texconv.exe."""
    bl_idname = "fo4.install_texconv"
    bl_label = "Install texconv"

    def execute(self, context):
        import threading
        from . import tool_installers, preferences

        def _run():
            from pathlib import Path
            ok, msg = tool_installers.install_texconv()
            level = 'INFO' if ok else 'ERROR'
            print("TEXCONV INSTALL", msg)
            prefs = preferences.get_preferences() if ok else None

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
                if prefs:
                    # Check new D:/blender_tools/ location first
                    tools_root = tool_installers.get_tools_root()
                    texconv_dir = tools_root / "texconv"
                    for exe in texconv_dir.rglob("texconv.exe"):
                        prefs.texconv_path = str(exe)
                        print(f"texconv path configured: {exe}")
                        break
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "texconv installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_InstallWhisper(Operator):
    """Install whisper Python package for transcription."""
    bl_idname = "fo4.install_whisper"
    bl_label = "Install Whisper"

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            ok, msg = tool_installers.install_whisper()
            level = 'INFO' if ok else 'ERROR'
            print("WHISPER INSTALL", msg)

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Whisper installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_InstallHavok2FBX(Operator):
    """Open browser to download Havok2FBX and prepare tools folder."""
    bl_idname = "fo4.install_havok2fbx"
    bl_label = "Get Havok2FBX"

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            ok, msg = tool_installers.install_havok2fbx()
            level = 'INFO' if ok else 'ERROR'
            print("HAVOK2FBX INSTALL", msg)

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Havok2FBX helper started (browser may open).")
        return {'FINISHED'}


class FO4_OT_InstallNiftools(Operator):
    """Run the PowerShell script to install Niftools Blender add-on."""
    bl_idname = "fo4.install_niftools"
    bl_label = "Install Niftools"

    blender_version: bpy.props.StringProperty(
        name="Blender Version",
        default="3.6",
    )

    def execute(self, context):
        import threading
        from . import tool_installers

        # On Blender 4.2+ / 5.x, Niftools v0.1.1 is a legacy add-on and must
        # be installed to the scripts/addons directory (not the extensions path).
        # The PowerShell installer already targets scripts/addons.  After
        # installation the user must enable "Allow Legacy Add-ons" in
        # Edit → Preferences → Add-ons and then enable the add-on.
        # Runtime API incompatibilities (calc_normals_split removal, etc.) are
        # patched automatically before every NIF export by this add-on.
        if bpy.app.version >= (4, 2, 0):
            self.report(
                {'INFO'},
                "Niftools will be installed as a Legacy Add-on. "
                "After install: Edit → Preferences → Add-ons → enable "
                "'Allow Legacy Add-ons', then enable 'NetImmerse/Gamebryo (.nif)'.",
            )

        blender_version = self.blender_version

        def _run():
            ok, msg = tool_installers.install_niftools(blender_version)
            level = 'INFO' if ok else 'ERROR'
            print("NIFTOOLS INSTALL", msg)

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Niftools installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_EnableAddon(Operator):
    """Enable a Blender add-on that is already installed (e.g. a built-in)."""
    bl_idname = "fo4.enable_addon"
    bl_label = "Enable Add-on"
    bl_description = "Enable this add-on in Blender Preferences"
    bl_options = {'REGISTER', 'INTERNAL'}

    addon_id: bpy.props.StringProperty(
        name="Add-on Module",
        description="The Python module name of the add-on to enable",
        default="",
        options={'SKIP_SAVE'},
    )

    def execute(self, context):
        if not self.addon_id:
            self.report({'ERROR'}, "No add-on ID specified")
            return {'CANCELLED'}
        try:
            result = bpy.ops.preferences.addon_enable(module=self.addon_id)
            if 'FINISHED' in result:
                self.report({'INFO'}, f"Enabled: {self.addon_id}")
                # Invalidate the scan cache so the panel status updates immediately
                from . import addon_integration
                addon_integration.AddonIntegrationSystem._scan_cache = None
                notification_system.FO4_NotificationSystem.notify(
                    f"Add-on '{self.addon_id}' enabled ✓", 'INFO'
                )
            else:
                self.report({'WARNING'}, f"Could not enable '{self.addon_id}' - it may not be installed")
        except Exception as exc:
            self.report({'ERROR'}, f"Could not enable '{self.addon_id}': {exc}")
        return {'FINISHED'}


class FO4_OT_ConfigureFallout4Settings(Operator):
    """Configure optimal settings for Fallout 4 mod creation"""
    bl_idname = "fo4.configure_fallout4_settings"
    bl_label = "Configure for Fallout 4"
    bl_description = "Auto-configure all settings for optimal Fallout 4 modding workflow"

    def execute(self, context):
        from . import preferences, export_helpers, tool_installers

        messages = []
        prefs = preferences.get_preferences()

        # Check PyNifly installation (primary / recommended exporter)
        pynifly_ok, pynifly_msg = export_helpers.ExportHelpers.pynifly_exporter_available()
        if pynifly_ok:
            messages.append("✓ PyNifly ready - primary NIF exporter (BadDog / BadDogSkyrim)")
        else:
            messages.append(f"⚠ PyNifly not installed - use 'Auto-Install PyNifly (Latest)' button")
            messages.append(f"  {pynifly_msg}")
            # Check Niftools as fallback
            nif_available, nif_msg = export_helpers.ExportHelpers.nif_exporter_available()
            if nif_available:
                messages.append("✓ Niftools v0.1.1 found (fallback exporter - NIF 20.2.0.7, BSTriShape)")
            else:
                messages.append(f"⚠ Niftools v0.1.1 also not installed: {nif_msg}")
                messages.append("  Native NIF writer will be used as last-resort fallback.")

        # Check texture conversion tools
        from . import nvtt_helpers
        if nvtt_helpers.NVTTHelpers.is_nvtt_available():
            messages.append("✓ NVTT (nvcompress) available for DDS conversion")
        elif nvtt_helpers.NVTTHelpers.is_texconv_available():
            messages.append("✓ texconv available for DDS conversion")
        else:
            messages.append("⚠ No DDS converter - install NVTT or texconv")

        # Configure optimal defaults if preferences exist
        if prefs:
            # Set optimal mesh optimization settings for FO4
            if hasattr(prefs, 'optimize_apply_transforms'):
                prefs.optimize_apply_transforms = True
                messages.append("✓ Set: Apply transforms before export")

            if hasattr(prefs, 'optimize_preserve_uvs'):
                prefs.optimize_preserve_uvs = True
                messages.append("✓ Set: Preserve UV maps")

        # Report all paths
        if prefs:
            tools_root = tool_installers.get_tools_root()
            messages.append(f"\n📁 Tools directory: {tools_root}")

            if prefs.nvtt_path:
                messages.append(f"📁 NVTT: {prefs.nvtt_path}")
            if prefs.texconv_path:
                messages.append(f"📁 texconv: {prefs.texconv_path}")

        messages.append("\n✓ Fallout 4 export settings are configured automatically:")
        messages.append("  • NIF 20.2.0.7 (user ver 12, uv2 130)")
        messages.append("  • BSTriShape geometry nodes")
        messages.append("  • BSLightingShaderProperty shaders")
        messages.append("  • Tangent space enabled for normal maps")
        messages.append("  • Scale 1:1 (no correction needed)")
        messages.append("  • Auto-triangulation on export")

        summary = "\n".join(messages)
        print("=== FALLOUT 4 CONFIGURATION ===")
        print(summary)
        print("=== END CONFIGURATION ===")

        self.report({'INFO'}, "Configuration complete - see console for details")
        notification_system.FO4_NotificationSystem.notify("Fallout 4 settings configured", 'INFO')
        return {'FINISHED'}


class FO4_OT_CheckToolPaths(Operator):
    """Report the status of configured tool paths and FO4 utilities."""
    bl_idname = "fo4.check_tool_paths"
    bl_label = "Check Tool Paths"

    def execute(self, context):
        import os
        from . import preferences, tool_installers
        import subprocess, sys
        prefs = preferences.get_preferences()
        lines = []
        if prefs:
            ff = preferences.get_configured_ffmpeg_path()
            nv = preferences.get_configured_nvcompress_path()
            tx = preferences.get_configured_texconv_path()
            hb = preferences.get_havok2fbx_path()
            def version(path, args):
                try:
                    out = subprocess.check_output([path] + args, stderr=subprocess.STDOUT, text=True)
                    return out.splitlines()[0]
                except Exception:
                    return None
            ffv = version(ff, ['-version']) if ff else None
            nvv = version(nv, ['--version']) if nv else None
            txv = version(tx, ['-?']) if tx else None
            hbv = None
            if hb and tool_installers.check_havok2fbx(hb):
                exe = os.path.join(hb, 'havok2fbx.exe')
                hbv = version(exe, ['--version']) or 'present'
            lines.append(f"ffmpeg: {ff or 'not set'}{('  '+ffv) if ffv else ''}")
            lines.append(f"nvcompress: {nv or 'not set'}{('  '+nvv) if nvv else ''}")
            lines.append(f"texconv: {tx or 'not set'}{('  '+txv) if txv else ''}")
            lines.append(f"Havok2FBX: {hb or 'not set'}{('  '+hbv) if hbv else ''}")
        else:
            lines.append("Preferences not available")
        for l in lines:
            self.report({'INFO'}, l)
            print(l)
        return {'FINISHED'}


class FO4_OT_RunAllInstallers(Operator):
    """Run all available installers in the background."""
    bl_idname = "fo4.install_all_tools"
    bl_label = "Install All Tools"

    def execute(self, context):
        import threading
        from . import tool_installers, preferences

        def _run():
            results = []
            any_failed = False
            for func in (
                tool_installers.install_ffmpeg,
                tool_installers.install_nvtt,
                tool_installers.install_texconv,
                tool_installers.install_whisper,
                tool_installers.install_torch_deps,
            ):
                ok, msg = func()
                if not ok:
                    any_failed = True
                results.append(msg)

            # Auto-wire newly installed tool paths into preferences
            tool_installers.auto_configure_preferences()

            summary = "; ".join(results)
            level = 'ERROR' if any_failed else 'INFO'
            print("ALL TOOL INSTALL RESULTS", summary)

            def _notify():
                notification_system.FO4_NotificationSystem.notify(summary, level)
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Tool installation started in the background. Check the console for progress.")
        return {'FINISHED'}


class FO4_OT_CheckRealESRGANInstallation(Operator):
    """Check if Real-ESRGAN is installed"""
    bl_idname = "fo4.check_realesrgan_installation"
    bl_label = "Check Real-ESRGAN Installation"
    
    def execute(self, context):
        success, message = realesrgan_helpers.RealESRGANHelpers.check_realesrgan_installation()
        
        if success:
            self.report({'INFO'}, message)
            print("\n" + "="*70)
            print("REAL-ESRGAN STATUS")
            print("="*70)
            print("✅ Real-ESRGAN is installed and ready!")
            print(message)
            print("\nYou can now upscale textures using AI.")
            print("Recommended for:")
            print("  - Enhancing low-resolution textures")
            print("  - Improving texture quality for FO4 mods")
            print("  - Upscaling 512x512 to 2048x2048 or 4096x4096")
            print("="*70 + "\n")
        else:
            self.report({'WARNING'}, "Real-ESRGAN not found")
            print("\n" + "="*70)
            print("REAL-ESRGAN INSTALLATION")
            print("="*70)
            print(message)
            print("\nFor detailed instructions, see NVIDIA_RESOURCES.md")
            print("="*70 + "\n")
        
        return {'FINISHED'}


class FO4_OT_InstallUpscalerDeps(Operator):
    """One-click installer for the Real-ESRGAN AI upscaler.

    Downloads the NCNN Vulkan binary (~50 MB, GPU-accelerated via Vulkan,
    works on NVIDIA/AMD/Intel with no Python dependencies) and falls back
    to installing the Python package stack (PyTorch CPU + basicsr +
    realesrgan, ~400 MB) if the binary download fails.

    Runs entirely in the background - Blender stays responsive.
    A notification pops up when the installation is complete."""
    bl_idname = "fo4.install_upscaler_deps"
    bl_label = "Install AI Upscaler"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("AI UPSCALER INSTALLATION")
            print("=" * 60)
            print("Step 1: Trying Real-ESRGAN NCNN Vulkan binary …")
            ok, msg = tool_installers.install_realesrgan()
            level = 'INFO' if ok else 'ERROR'
            status = "✅ Installation complete!" if ok else "❌ Installation failed"
            print(f"{status}\n{msg}")
            print("=" * 60 + "\n")

            # Expire the availability cache so the panel refreshes immediately.
            try:
                realesrgan_helpers.RealESRGANHelpers.clear_cache()
            except Exception:
                pass

            def _notify():
                notification_system.FO4_NotificationSystem.notify(
                    f"AI Upscaler: {msg[:120]}", level
                )
            bpy.app.timers.register(_notify, first_interval=0.1)

        threading.Thread(target=_run, daemon=True).start()
        self.report(
            {'INFO'},
            "Installing AI upscaler in the background. "
            "Check the Blender console for progress. "
            "You will be notified when complete."
        )
        return {'FINISHED'}


class FO4_OT_InstallInstantNGP(Operator):
    """Clone the Instant-NGP repository into the add-on tools directory.

    Requires git on PATH. After cloning, the user must build the project
    with CMake + CUDA (see console output for exact commands). Once built
    the add-on detects the executable automatically."""
    bl_idname = "fo4.install_instantngp"
    bl_label = "Auto-Install Instant-NGP"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTANT-NGP INSTALLATION")
            print("=" * 60)
            ok, msg = tool_installers.install_instantngp()
            print(msg)
            print("=" * 60 + "\n")
            # Expire the availability cache so the UI picks up the new state.
            try:
                instantngp_helpers.InstantNGPHelpers.clear_cache()
            except Exception:
                pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg[:200], level)

        threading.Thread(target=_run, daemon=True).start()
        self.report(
            {'INFO'},
            "Cloning Instant-NGP in the background - check the Blender console "
            "(Window > Toggle System Console) for progress."
        )
        return {'FINISHED'}


class FO4_OT_InstallShapE(Operator):
    """Install Shap-E (text/image → 3D mesh). Downloads PyTorch CPU + shap-e via pip."""
    bl_idname = "fo4.install_shap_e"
    bl_label = "Auto-Install Shap-E"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING SHAP-E")
            print("=" * 60)
            ok, msg = tool_installers.install_shap_e()
            print(msg)
            print("=" * 60 + "\n")
            if ok:
                # Invalidate the cached "not installed" result so the UI
                # reflects the successful install on the next redraw.
                try:
                    from . import shap_e_helpers
                    shap_e_helpers.ShapEHelpers.clear_cache()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing Shap-E in background - check console (Window > Toggle System Console)")
        return {'FINISHED'}


class FO4_OT_InstallPointE(Operator):
    """Install Point-E (text/image → point cloud). Downloads PyTorch CPU + point-e via pip."""
    bl_idname = "fo4.install_point_e"
    bl_label = "Auto-Install Point-E"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING POINT-E")
            print("=" * 60)
            ok, msg = tool_installers.install_point_e()
            print(msg)
            print("=" * 60 + "\n")
            if ok:
                try:
                    from . import point_e_helpers
                    point_e_helpers.PointEHelpers.clear_cache()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing Point-E in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallDiffusers(Operator):
    """Install Diffusers stack (Stable Diffusion, SDXL). Downloads torch CPU + diffusers via pip."""
    bl_idname = "fo4.install_diffusers"
    bl_label = "Auto-Install Diffusers"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING DIFFUSERS")
            print("=" * 60)
            ok, msg = tool_installers.install_diffusers()
            print(msg)
            print("=" * 60 + "\n")
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing Diffusers in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallLibigl(Operator):
    """Install libigl Python bindings (used by RigNet for mesh deformation)."""
    bl_idname = "fo4.install_libigl"
    bl_label = "Auto-Install libigl"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING LIBIGL")
            print("=" * 60)
            ok, msg = tool_installers.install_libigl()
            print(msg)
            print("=" * 60 + "\n")
            level = 'INFO' if ok else 'ERROR'
            # Expire the rignet/libigl status cache so the panel refreshes.
            try:
                from . import ui_panels as _ui
                _ui._invalidate_rignet_cache()
            except Exception:
                pass
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing libigl in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallZoeDepth(Operator):
    """Install ZoeDepth (depth-estimation for image-to-mesh). Clones repo + pip deps."""
    bl_idname = "fo4.install_zoedepth"
    bl_label = "Auto-Install ZoeDepth"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING ZOEDEPTH")
            print("=" * 60)
            ok, msg = tool_installers.install_zoedepth()
            print(msg)
            print("=" * 60 + "\n")
            # Re-run availability check to populate cache with fresh state.
            if ok:
                try:
                    from . import zoedepth_helpers
                    zoedepth_helpers.check_zoedepth_availability()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing ZoeDepth in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallTripoSR(Operator):
    """Install TripoSR (image → 3D). Clones repo + pip deps."""
    bl_idname = "fo4.install_triposr"
    bl_label = "Auto-Install TripoSR"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING TRIPOSR")
            print("=" * 60)
            ok, msg = tool_installers.install_triposr()
            print(msg)
            print("=" * 60 + "\n")
            # Expire the availability cache so the UI picks up the new state.
            if ok:
                try:
                    from . import imageto3d_helpers
                    imageto3d_helpers.ImageTo3DHelpers.clear_triposr_cache()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing TripoSR in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallHunyuan3D(Operator):
    """Install Hunyuan3D-2 (image → 3D). Clones repo + pip deps."""
    bl_idname = "fo4.install_hunyuan3d"
    bl_label = "Auto-Install Hunyuan3D-2"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING HUNYUAN3D-2")
            print("=" * 60)
            ok, msg = tool_installers.install_hunyuan3d()
            print(msg)
            print("=" * 60 + "\n")
            if ok:
                try:
                    from . import hunyuan3d_helpers
                    # Re-run availability check to populate cache with fresh state
                    hunyuan3d_helpers.check_hunyuan3d_availability()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing Hunyuan3D-2 in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallHyMotion(Operator):
    """Install HY-Motion-1.0 (motion generation). Clones repo + pip deps."""
    bl_idname = "fo4.install_hymotion"
    bl_label = "Auto-Install HY-Motion"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING HY-MOTION-1.0")
            print("=" * 60)
            ok, msg = tool_installers.install_hymotion()
            print(msg)
            print("=" * 60 + "\n")
            if ok:
                try:
                    from . import hymotion_helpers
                    # Re-run availability check to populate cache with fresh state
                    hymotion_helpers.check_hymotion_availability()
                except Exception:
                    pass
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing HY-Motion in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallMotionGeneration(Operator):
    """Install MotionDiffuse (text → motion). Clones repo + pip deps."""
    bl_idname = "fo4.install_motion_generation"
    bl_label = "Auto-Install MotionDiffuse"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING MOTIONDIFFUSE")
            print("=" * 60)
            ok, msg = tool_installers.install_motion_diffuse()
            print(msg)
            print("=" * 60 + "\n")
            level = 'INFO' if ok else 'ERROR'
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing MotionDiffuse in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallRigNet(Operator):
    """Install RigNet (auto-rigging). Clones repo + pip deps."""
    bl_idname = "fo4.install_rignet"
    bl_label = "Auto-Install RigNet"
    bl_options = {'REGISTER'}

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            print("\n" + "=" * 60)
            print("INSTALLING RIGNET")
            print("=" * 60)
            ok, msg = tool_installers.install_rignet()
            print(msg)
            print("=" * 60 + "\n")
            level = 'INFO' if ok else 'ERROR'
            # Expire the rignet/libigl status cache so the panel refreshes.
            try:
                from . import ui_panels as _ui
                _ui._invalidate_rignet_cache()
            except Exception:
                pass
            notification_system.FO4_NotificationSystem.notify(msg, level)

        threading.Thread(target=_run, daemon=True).start()
        self.report({'INFO'}, "Installing RigNet in background - check console")
        return {'FINISHED'}


class FO4_OT_InstallPyNifly(Operator):
    """Install the latest PyNifly NIF exporter (by BadDog / BadDogSkyrim).

    Automatically downloads the newest PyNifly release from GitHub if no local
    zip is found in the tools folder (D:\\Blender addon\\tools).  The zip is
    then installed directly into Blender as an add-on.

    PyNifly (by BadDog) is the recommended NIF exporter for Blender 4.x and
    5.x - it supports Fallout 4, Skyrim SE, and Starfield with full body-morph
    and material path support.

    Credit: BadDog (BadDogSkyrim) - https://github.com/BadDogSkyrim/PyNifly
    """
    bl_idname = "fo4.install_pynifly"
    bl_label = "Auto-Install PyNifly (Latest)"
    bl_description = (
        "Auto-download and install the latest PyNifly release by BadDog (BadDogSkyrim). "
        "Downloads the newest version from GitHub if not already in the tools folder."
    )

    def execute(self, context):
        import threading
        from . import tool_installers

        def _run():
            ok, msg = tool_installers.install_pynifly()
            level = 'INFO' if ok else 'ERROR'
            print("PYNIFLY INSTALL", msg)

            def _notify():
                notification_system.FO4_NotificationSystem.notify(msg, level)
            bpy.app.timers.register(_notify, first_interval=0.0)

        threading.Thread(target=_run, daemon=True).start()
        self.report(
            {'INFO'},
            "PyNifly installation started. Check the console for progress.",
        )
        return {'FINISHED'}



classes = (
    FO4_OT_InstallCollectiveModdingToolkit,
    FO4_OT_InstallGradio,
    FO4_OT_CheckKBTools,
    FO4_OT_CheckUEImporter,
    FO4_OT_InstallUEImporter,
    FO4_OT_CheckUModelTools,
    FO4_OT_OpenUModelToolsPage,
    FO4_OT_InstallUModelTools,
    FO4_OT_CheckUModel,
    FO4_OT_ScanFO4Readiness,
    FO4_OT_CheckUnityFBXImporter,
    FO4_OT_CheckAssetStudio,
    FO4_OT_CheckAssetRipper,
    FO4_OT_InstallFFmpeg,
    FO4_OT_InstallNVTT,
    FO4_OT_InstallTexconv,
    FO4_OT_InstallWhisper,
    FO4_OT_InstallHavok2FBX,
    FO4_OT_InstallNiftools,
    FO4_OT_EnableAddon,
    FO4_OT_ConfigureFallout4Settings,
    FO4_OT_CheckToolPaths,
    FO4_OT_RunAllInstallers,
    FO4_OT_CheckRealESRGANInstallation,
    FO4_OT_InstallUpscalerDeps,
    FO4_OT_InstallInstantNGP,
    FO4_OT_InstallShapE,
    FO4_OT_InstallPointE,
    FO4_OT_InstallDiffusers,
    FO4_OT_InstallLibigl,
    FO4_OT_InstallZoeDepth,
    FO4_OT_InstallTripoSR,
    FO4_OT_InstallHunyuan3D,
    FO4_OT_InstallHyMotion,
    FO4_OT_InstallMotionGeneration,
    FO4_OT_InstallRigNet,
    FO4_OT_InstallPyNifly,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
            except Exception as e2:
                print(f"\u26a0 Failed to register {cls.__name__}: {e2}")


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
