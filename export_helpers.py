"""
Export helper functions for Fallout 4 mod creation
"""

import bpy
import os
import json
import sys
import traceback

class ExportHelpers:
    """Helper functions for exporting to Fallout 4"""
    
    @staticmethod
    def _is_collision_mesh(obj):
        """Return True if *obj* is a collision or occlusion mesh.

        Collision/occlusion meshes are invisible in-game and do not need
        textures or a closed (manifold) surface.  They are identified by:
        - The ``fo4_collision`` custom property set by :func:`add_collision_mesh`
        - The ``UCX_`` prefix (Fallout 4 / FBX naming convention)
        - The ``_COLLISION`` suffix (legacy add-on naming convention)
        """
        if obj.get("fo4_collision"):
            return True
        name_upper = obj.name.upper()
        return name_upper.startswith("UCX_") or name_upper.endswith("_COLLISION")

    @staticmethod
    def validate_before_export(obj):
        """Validate object before export"""
        from . import mesh_helpers, texture_helpers, notification_system
        
        issues = []
        
        if obj.type == 'MESH':
            is_collision = ExportHelpers._is_collision_mesh(obj)

            # Validate mesh geometry; collision/occlusion meshes are exempt from
            # the UV-map and non-manifold requirements because they are invisible.
            success, mesh_issues = mesh_helpers.MeshHelpers.validate_mesh(
                obj, is_collision=is_collision
            )
            if not success:
                issues.extend(mesh_issues)
            
            # Texture validation is only meaningful for visible (non-collision)
            # meshes.  Collision and occlusion meshes are invisible in-game and
            # intentionally have no texture setup.
            if not is_collision and obj.data.materials:
                success, texture_issues = texture_helpers.TextureHelpers.validate_textures(obj)
                if not success:
                    issues.extend(texture_issues)
        
        elif obj.type == 'ARMATURE':
            # Validate armature
            from . import animation_helpers
            success, anim_issues = animation_helpers.AnimationHelpers.validate_animation(obj)
            if not success:
                issues.extend(anim_issues)
        
        return len(issues) == 0, issues

    @staticmethod
    def nif_exporter_available():
        """Check if the Niftools v0.1.1 exporter operator is registered."""
        blender_version = bpy.app.version
        version_str = f"{blender_version[0]}.{blender_version[1]}"
        export_scene = getattr(bpy.ops, "export_scene", None)
        if not export_scene:
            return False, f"bpy.ops.export_scene missing (Blender {version_str})"

        if not hasattr(export_scene, "nif"):
            if blender_version >= (4, 0, 0):
                return False, "Niftools exporter not registered; official v0.1.1 targets Blender ≤3.6. Install a 4.x-compatible fork or use 3.6 for export."
            return False, "Niftools exporter not registered"

        if blender_version >= (4, 0, 0):
            return True, "Niftools exporter detected on Blender 4.x (ensure compatibility; experimental)"

        return True, "Niftools exporter available"

    @staticmethod
    def pynifly_exporter_available():
        """Check if the PyNifly exporter operator (BadDogSkyrim/PyNifly) is registered.

        PyNifly is the recommended NIF exporter for Blender 4.x and 5.x.  It
        registers ``bpy.ops.export_scene.pynifly`` when installed.

        Returns
        -------
        tuple[bool, str]
            ``(True, message)`` when PyNifly is ready, ``(False, reason)`` otherwise.
        """
        export_scene = getattr(bpy.ops, "export_scene", None)
        if not export_scene:
            return False, "bpy.ops.export_scene not available"
        if hasattr(export_scene, "pynifly"):
            return True, "PyNifly exporter available (BadDog / BadDogSkyrim)"
        return False, (
            "PyNifly not installed — click 'Auto-Install PyNifly (Latest)' in the Setup & Status panel "
            "to auto-download and install it"
        )

    @staticmethod
    def get_nif_exporter_info():
        """Return which NIF exporter is active and whether it is available.

        Priority order (highest to lowest):
          1. **PyNifly** (BadDogSkyrim) — preferred for Blender 4.x / 5.x
          2. **Niftools v0.1.1**        — legacy, Blender 3.6 LTS only

        Returns
        -------
        tuple[str, bool, str]
            ``(exporter_name, available, message)`` where *exporter_name* is
            one of ``"pynifly"``, ``"niftools"``, or ``"none"``.
        """
        pynifly_ok, pynifly_msg = ExportHelpers.pynifly_exporter_available()
        if pynifly_ok:
            return "pynifly", True, pynifly_msg

        nif_ok, nif_msg = ExportHelpers.nif_exporter_available()
        if nif_ok:
            return "niftools", True, nif_msg

        return "none", False, (
            f"No NIF exporter installed.  "
            f"PyNifly: {pynifly_msg}.  "
            f"Niftools v0.1.1: {nif_msg}."
        )

    @staticmethod
    def _safe_enum(props, key, preferred, fallbacks=None):
        """Return *preferred* if it is a valid choice for the enum property *key*
        in *props*, otherwise try each item in *fallbacks* in order.

        Falls back to *preferred* unchanged when the property does not expose
        enum_items (so callers never pass an empty string to the operator).
        Returns ``None`` only when fallbacks are exhausted and enum_items are
        verifiably available.
        """
        try:
            enum_items = props[key].enum_items
            valid = {item.identifier for item in enum_items}
            if preferred in valid:
                return preferred
            for val in (fallbacks or []):
                if val in valid:
                    return val
            # preferred is not in this build's enum; skip the kwarg
            return None
        except Exception:
            # Property doesn't expose enum_items – assume preferred is valid
            return preferred

    @staticmethod
    def _build_nif_export_kwargs(filepath):
        """Assemble kwargs for the NIF exporter (Niftools v0.1.1) for Fallout 4.

        Fallout 4 NIF format requirements enforced by these settings:
          - NIF version 20.2.0.7 / user version 12 / user_version_2 130
            (automatically selected by game="FALLOUT_4")
          - BSTriShape geometry nodes – selected by the FALLOUT_4 game profile;
            do NOT use NiTriShape for FO4 or meshes will be invisible in-game.
          - BSLightingShaderProperty for materials (game profile handles this).
          - Tangent-space normal maps: use_tangent_space must be True so the
            exporter emits the tangent/bitangent vectors FO4 shaders expect.
          - Scale: 1 Blender unit = 1 NIF unit (scale_correction=1.0).
          - Geometry must be triangulated; apply_modifiers=True applies the
            temporary Triangulate modifier added by _prepare_mesh_for_nif.
        """
        kwargs = {
            "filepath": filepath,
            "use_selection": True,
        }

        try:
            props = bpy.ops.export_scene.nif.get_rna_type().properties
            prop_keys = props.keys()

            # ----------------------------------------------------------------
            # Game profile – FALLOUT_4 sets NIF 20.2.0.7 with user version 12
            # and user_version_2 130, and forces BSTriShape geometry nodes
            # which are required by Fallout 4's renderer.
            # Niftools v0.1.1 valid identifier: 'FALLOUT_4'.
            # ----------------------------------------------------------------
            if "game" in prop_keys:
                game_val = ExportHelpers._safe_enum(props, "game", "FALLOUT_4")
                if game_val:
                    kwargs["game"] = game_val

            # Export as a NIF geometry file, not a KF animation file.
            if "export_type" in prop_keys:
                et_val = ExportHelpers._safe_enum(
                    props, "export_type", "nif", fallbacks=["NIF", "nif_and_kf"]
                )
                if et_val:
                    kwargs["export_type"] = et_val

            # ----------------------------------------------------------------
            # Tangent space – FO4 BSLightingShaderProperty normal maps require
            # tangent vectors in the NIF.  Without this the mesh appears
            # flat-lit in-game regardless of the normal map texture.
            # Niftools v0.1.1 may expose this as 'use_tangent_space'.
            # ----------------------------------------------------------------
            for tkey in ("use_tangent_space", "tangent_space"):
                if tkey in prop_keys:
                    kwargs[tkey] = True
                    break

            # Keep smoothing consistent; only set when the property exists and
            # the value is a recognised enum item.
            if "smoothing" in prop_keys:
                smooth_val = ExportHelpers._safe_enum(props, "smoothing", "SMOOTH")
                if smooth_val:
                    kwargs["smoothing"] = smooth_val

            # 1 Blender unit = 1 NIF unit for FO4 (do not rescale geometry).
            if "scale_correction" in prop_keys:
                kwargs["scale_correction"] = 1.0

            # Apply modifiers so the temporary Triangulate modifier added by
            # _prepare_mesh_for_nif is baked into the exported geometry.
            if "apply_modifiers" in prop_keys:
                kwargs["apply_modifiers"] = True

            # Static (non-skinned) meshes do not carry skin data; flatten_skin
            # would corrupt weights on rigged actors so leave it False.
            if "flatten_skin" in prop_keys:
                kwargs["flatten_skin"] = False

        except Exception:
            # If anything goes wrong introspecting the operator, fall back to
            # the minimal set of kwargs so the export can still be attempted.
            pass

        return kwargs

    @staticmethod
    def _build_pynifly_export_kwargs(filepath):
        """Assemble kwargs for PyNifly (by BadDog) for Fallout 4 NIF export.

        Based on the official PyNifly IMPORT_EXPORT_OPTIONS.md:
          - ``target_game = "FO4"``    → Fallout 4 BSTriShape / BSSubIndexTriShape format
          - ``export_modifiers``       → apply modifiers (renamed from apply_modifiers)
          - ``export_collision``       → include collision meshes
          - ``export_colors``          → write vertex colours (default True, explicit for CK)
          - ``blender_xf = False``     → use NIF coordinates directly (correct for FO4)
          - ``rename_bones = True``    → convert Blender .L/.R names back to NIF names

        We introspect the operator's RNA properties at runtime so the code
        remains resilient to API differences across PyNifly releases.

        Credit: PyNifly by BadDog (BadDogSkyrim) — https://github.com/BadDogSkyrim/PyNifly
        """
        kwargs: dict = {
            "filepath": filepath,
        }
        try:
            props = bpy.ops.export_scene.pynifly.get_rna_type().properties
            prop_keys = props.keys()

            # ── Selection-only export ─────────────────────────────────────────
            # use_selection restricts the export to the currently-selected
            # objects.  The caller deselects everything then selects only the
            # target mesh (+ its collision child) before invoking the operator,
            # so this kwarg is critical to avoid exporting the entire scene.
            if "use_selection" in prop_keys:
                kwargs["use_selection"] = True

            # ── Target game ──────────────────────────────────────────────────
            # "target_game" is the current property name; older builds used "game".
            # "FO4" selects Fallout 4 BSTriShape / BSSubIndexTriShape format.
            for game_key in ("target_game", "game"):
                if game_key in prop_keys:
                    game_val = ExportHelpers._safe_enum(
                        props, game_key, "FO4",
                        fallbacks=["FALLOUT4", "Fallout4", "FALLOUT_4"],
                    )
                    if game_val:
                        kwargs[game_key] = game_val
                    break

            # ── Apply modifiers ───────────────────────────────────────────────
            # "export_modifiers" is the current name; older builds used "apply_modifiers".
            for mod_key in ("export_modifiers", "apply_modifiers"):
                if mod_key in prop_keys:
                    kwargs[mod_key] = True
                    break

            # ── Collision export ──────────────────────────────────────────────
            # export_collision tells PyNifly to include bhkCollisionObject
            # blocks, which are required for physics-enabled FO4 objects in CK.
            if "export_collision" in prop_keys:
                kwargs["export_collision"] = True

            # ── Vertex colours ────────────────────────────────────────────────
            # export_colors is True by default, but be explicit so CK
            # gets the vertex-colour data it needs for LOD and alpha blending.
            if "export_colors" in prop_keys:
                kwargs["export_colors"] = True

            # ── Coordinate system ─────────────────────────────────────────────
            # blender_xf applies a 90° rotation + scale when True.  For FO4 we
            # leave it False (NIF-native coordinates) — matching vanilla files.
            if "blender_xf" in prop_keys:
                kwargs["blender_xf"] = False

            # ── Bone naming ───────────────────────────────────────────────────
            # rename_bones converts Blender .L/.R names back to NIF convention.
            # Must match the setting used during import.
            if "rename_bones" in prop_keys:
                kwargs["rename_bones"] = True

            # ── Scale (legacy property, dropped in later builds) ──────────────
            # Set only if the property still exists for backwards compatibility.
            for scale_key in ("scale_factor", "scale_correction"):
                if scale_key in prop_keys:
                    kwargs[scale_key] = 1.0
                    break

        except Exception:
            pass  # fall back to minimal kwargs on any introspection error

        return kwargs

    @staticmethod
    def _prepare_mesh_for_nif(obj):
        """Prepare a mesh object so it meets Fallout 4 / PyNifly / Niftools v0.1.1 requirements.

        Performs (in order):
          1. Apply pending scale and rotation transforms – unapplied transforms
             are the single most common cause of distorted geometry in-game.
          2. Ensure at least one UV map exists – both exporters require UV
             coordinates on every exported mesh.
          3. Add a temporary ``_FO4_Triangulate`` modifier when the mesh
             contains quads or n-gons, because FO4 BSTriShape only stores
             triangles.  PyNifly can handle quads internally, but the
             modifier guarantees a clean result for both exporters.
          4. Enable Auto Smooth for consistent tangent/normal export (skipped
             silently on Blender 4.x where the attribute was removed).

        Returns a list of modifier names that were added.  The caller MUST
        remove them after export so the user's mesh is not permanently altered.
        """
        added_modifiers = []

        if bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')

        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # 1. Apply scale and rotation -----------------------------------------
        #    Unapplied scale causes geometry to arrive at the wrong size in FO4;
        #    unapplied rotation causes normals to point in the wrong direction.
        try:
            needs_scale = obj.scale[:] != (1.0, 1.0, 1.0)
            needs_rot = obj.rotation_euler[:] != (0.0, 0.0, 0.0)
        except Exception:
            needs_scale = needs_rot = True

        if needs_scale or needs_rot:
            try:
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            except Exception:
                pass  # context may not support transform_apply; continue anyway

        # 2. Ensure UV map -------------------------------------------------------
        #    Both Niftools v0.1.1 and PyNifly require at least one UV map;
        #    auto-create one (smart-unwrapped) when the mesh has none.
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
            try:
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.smart_project(angle_limit=66.0)
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                try:
                    bpy.ops.object.mode_set(mode='OBJECT')
                except Exception:
                    pass

        # 3. Triangulate ---------------------------------------------------------
        #    FO4 BSTriShape / BSSubIndexTriShape nodes only store triangles.
        #    Add a temporary Triangulate modifier (removed after export) to
        #    guarantee a clean tri-only mesh reaches the exporter.
        has_non_tris = any(len(p.vertices) > 3 for p in obj.data.polygons)
        if has_non_tris:
            mod = obj.modifiers.new(name="_FO4_Triangulate", type='TRIANGULATE')
            mod.quad_method = 'BEAUTY'
            mod.ngon_method = 'BEAUTY'
            try:
                mod.keep_custom_normals = True
            except AttributeError:
                pass  # older Blender builds lack this flag
            added_modifiers.append(mod.name)

        # 4. Auto Smooth ---------------------------------------------------------
        #    Ensures exported tangent vectors are coherent with mesh normals.
        #    The attribute was removed in Blender 4.x; skip silently.
        try:
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = 3.14159265358979  # 180° – smooth all
        except AttributeError:
            pass

        return added_modifiers
    
    @staticmethod
    def _find_collision_mesh(obj):
        """Return a collision object associated with *obj*, if any.

        Checks (in order):
        1. Direct children of *obj* that carry the ``fo4_collision`` flag AND
           whose name matches ``UCX_{obj.name}`` (most specific / fastest).
        2. Any direct child with the ``fo4_collision`` flag (less specific).
        3. Scene siblings whose name matches ``UCX_{name}`` (Fallout 4 / FBX
           convention) or the legacy ``{name}_COLLISION`` suffix.
        """
        ucx_name = f"UCX_{obj.name}".upper()
        legacy_name = f"{obj.name}_COLLISION".upper()

        # Fastest path: parented children – prefer exact name match
        for child in obj.children:
            if child.get("fo4_collision") and child.name.upper() == ucx_name:
                return child
        for child in obj.children:
            if child.get("fo4_collision"):
                return child

        for scene in getattr(obj, 'users_scene', []):
            for o in scene.objects:
                if o is obj:
                    continue
                oname = o.name.upper()
                if oname == ucx_name or oname == legacy_name:
                    return o
        return None

    @staticmethod
    def export_mesh_to_nif(obj, filepath):
        """Export mesh to NIF format, preferring PyNifly then Niftools v0.1.1,
        falling back to FBX when neither is installed.

        Exporter priority:
          1. **PyNifly** (BadDogSkyrim) — preferred for Blender 4.x / 5.x
          2. **Niftools v0.1.1**        — legacy, Blender 3.6 LTS only
          3. **FBX fallback**           — when no NIF exporter is available

        Pre-export preparation (applied automatically, reversed after export):
          - Scale and rotation transforms are applied so geometry arrives at the
            correct size and orientation in Fallout 4.
          - A UV map is created (smart-unwrapped) if the mesh has none.
          - A temporary Triangulate modifier is added when the mesh has quads /
            n-gons because FO4 BSTriShape nodes require triangles only.

        The NIF/FBX exporters are notoriously sensitive to stray vertex groups.
        If a mesh contains weights but isn't skinned to an armature the export
        can produce collapsed or otherwise corrupted geometry.  We fail early in
        that case so the user can clean up the mesh.
        """

        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        # ...existing code...

        # Do not export collision meshes created by the addon
        if obj.get("fo4_collision") or obj.name.upper().endswith("_COLLISION") or obj.name.upper().startswith("UCX_"):
            return False, "Collision meshes are not intended for export; select the source mesh instead"
        # ...existing code...

        # reject meshes with orphaned weights
        if obj.vertex_groups and not ExportHelpers._has_armature(obj):
            return False, "Mesh has vertex groups but no armature – remove weights or parent to an armature before exporting"

        exporter, nif_available, nif_message = ExportHelpers.get_nif_exporter_info()
        from . import mesh_helpers as _mh

        # Try native NIF export first when available
        if nif_available:
            added_mods = []
            try:
                # Auto-prepare FIRST (applies transforms, creates UV map, triangulates).
                # Validation runs afterwards so it sees the corrected state and does not
                # block on issues that the prep step has already resolved.
                added_mods = ExportHelpers._prepare_mesh_for_nif(obj)

                # Validate after prep – only hard errors (poly limit, non-manifold,
                # missing materials) will stop the export at this point.
                success, issues = ExportHelpers.validate_before_export(obj)
                if not success:
                    return False, f"Validation failed: {', '.join(issues)}"

                # gather objects to export (main mesh + optional collision)
                selection = [obj]
                # only include a collision object if the mesh is expected to have one
                ctype = getattr(obj, 'fo4_collision_type', 'DEFAULT')
                if ctype not in ('NONE', 'GRASS', 'MUSHROOM'):
                    coll = ExportHelpers._find_collision_mesh(obj)
                    if coll:
                        selection.append(coll)

                bpy.ops.object.select_all(action='DESELECT')
                for o in selection:
                    o.select_set(True)
                bpy.context.view_layer.objects.active = obj

                # Dispatch to the appropriate exporter.
                if exporter == "pynifly":
                    kwargs = ExportHelpers._build_pynifly_export_kwargs(filepath)
                    result = bpy.ops.export_scene.pynifly(**kwargs)
                    exporter_label = "PyNifly"
                else:
                    kwargs = ExportHelpers._build_nif_export_kwargs(filepath)
                    result = bpy.ops.export_scene.nif(**kwargs)
                    exporter_label = "Niftools v0.1.1"

                if isinstance(result, set) and 'FINISHED' in result:
                    ctype = getattr(obj, 'fo4_collision_type', 'DEFAULT')
                    sound = obj.get("fo4_collision_sound")
                    weight = obj.get("fo4_collision_weight")
                    extras = []
                    if ctype:
                        extras.append(f"type={ctype}")
                    if sound:
                        extras.append(f"sound={sound}")
                    if weight:
                        extras.append(f"weight={weight}")
                    note = " (" + ", ".join(extras) + ")" if extras else ""
                    # Send event to desktop tutorial server
                    try:
                        from . import desktop_tutorial_client
                        event_data = {
                            'mesh_name': obj.name,
                            'filepath': filepath,
                            'extras': extras,
                            'exporter': exporter_label,
                        }
                        desktop_tutorial_client.DesktopTutorialClient.send_event('mesh_exported', event_data)
                    except Exception as e:
                        print(f"[DesktopTutorialClient] Failed to send mesh export event: {e}")
                    return True, f"Exported NIF via {exporter_label}: {filepath}{note}"

                # If operator returns without FINISHED, fall back to FBX
                fallback_msg = f"NIF export did not finish ({result}); falling back to FBX."
            except Exception as e:
                # Print full traceback to the Blender console so the user can
                # see the root cause when they open the system console.
                print(
                    f"[FO4 Add-on] NIF export error for '{obj.name}':",
                    file=sys.stderr,
                )
                traceback.print_exc(file=sys.stderr)
                fallback_msg = f"NIF export failed ({e}); falling back to FBX."
            finally:
                # Always remove the temporary triangulate modifier so the
                # user's mesh is not permanently altered.
                for mod_name in added_mods:
                    mod = obj.modifiers.get(mod_name)
                    if mod:
                        obj.modifiers.remove(mod)
        else:
            # NIF exporter not available – validate before FBX fallback
            success, issues = ExportHelpers.validate_before_export(obj)
            if not success:
                return False, f"Validation failed: {', '.join(issues)}"
            fallback_msg = f"{nif_message}; exporting FBX for external conversion."

        # Export to FBX as a compatibility fallback
        try:
            base_path = os.path.splitext(filepath)[0]
            fbx_path = base_path + '.fbx'

            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

            # Include the UCX_ collision mesh in the FBX.  This is critical:
            # FO4 NIF-conversion tools (CK, Cathedral Assets Optimizer, etc.)
            # pair a UCX_{name} object with its visual mesh by name to generate
            # bhkConvexVerticesShape collision in the NIF.  Without it the
            # exported NIF has no collision at all.
            ctype_for_fbx = getattr(obj, 'fo4_collision_type', 'DEFAULT')
            if ctype_for_fbx not in ('NONE', 'GRASS', 'MUSHROOM'):
                coll_fb = ExportHelpers._find_collision_mesh(obj)
                if coll_fb:
                    coll_fb.select_set(True)

            bpy.ops.export_scene.fbx(
                filepath=fbx_path,
                use_selection=True,
                apply_scale_options='FBX_SCALE_ALL',
                mesh_smooth_type='FACE',
                use_mesh_modifiers=True,
            )

            ctype = getattr(obj, 'fo4_collision_type', 'DEFAULT')
            sound = obj.get("fo4_collision_sound")
            weight = obj.get("fo4_collision_weight")
            extras = []
            if ctype:
                extras.append(f"type={ctype}")
            if sound:
                extras.append(f"sound={sound}")
            if weight:
                extras.append(f"weight={weight}")
            note = " (" + ", ".join(extras) + ")" if extras else ""
            return True, f"{fallback_msg} Exported FBX: {fbx_path}{note}"
        except Exception as e:
            return False, f"Export failed: {str(e)}"
    
    @staticmethod
    def _has_armature(obj):
        """Return True if *obj* is skinned to an armature (parent or modifier).
        """
        if obj.parent and obj.parent.type == 'ARMATURE':
            return True
        for mod in getattr(obj, 'modifiers', []):
            if mod.type == 'ARMATURE':
                return True
        return False

    @staticmethod
    def export_mesh_with_collision(obj, filepath, simplify_ratio: float = 0.25):
        """Helper to generate a collision mesh and then export the pair to NIF.

        This mirrors the behaviour of the ``fo4.export_mesh_with_collision`` operator
        by creating a new collision mesh (or replacing an existing one) then calling
        :func:`export_mesh_to_nif` on the original object.

        Parameters
        ----------
        obj : bpy.types.Object
            Source mesh object
        filepath : str
            Destination NIF file path
        simplify_ratio : float, optional
            Simplification ratio for the collision mesh, by default 0.25
        """
        from . import mesh_helpers

        # ensure source object is ok
        if obj.type != 'MESH':
            return False, "Object is not a mesh"

        # generate or update collision mesh
        collision = mesh_helpers.MeshHelpers.add_collision_mesh(obj, simplify_ratio=simplify_ratio)
        if not collision:
            return False, "Failed to create collision mesh"

        # now export both
        return ExportHelpers.export_mesh_to_nif(obj, filepath)

    @staticmethod
    def export_scene_as_single_nif(scene, filepath):
        """Export all visible scene meshes and their collision meshes as one NIF file.

        This implements the intended workflow: import a NIF, add collision to the
        meshes that need it, then export the entire scene back out as a single NIF
        that is ready to go straight into the game.

        Each visible mesh object (that is not itself a collision proxy) is included
        in the export.  For each mesh, any associated collision mesh (identified by
        the UCX_ prefix, the fo4_collision flag on a parented child, or the
        legacy _COLLISION suffix) is also selected so that it travels along in the
        same NIF node hierarchy.

        Exporter priority: PyNifly > Niftools v0.1.1 > FBX fallback.

        Parameters
        ----------
        scene : bpy.types.Scene
            The Blender scene to export.
        filepath : str
            Destination ``.nif`` file path (or ``.fbx`` for the FBX fallback).

        Returns
        -------
        tuple[bool, str]
            ``(True, message)`` on success, ``(False, error_message)`` on failure.
        """
        # Collect all exportable (non-collision) mesh objects in the scene.
        meshes = [
            obj for obj in scene.objects
            if obj.type == 'MESH' and not ExportHelpers._is_collision_mesh(obj)
        ]

        if not meshes:
            return False, "No exportable meshes found in the scene"

        exporter, nif_available, nif_message = ExportHelpers.get_nif_exporter_info()

        # Track temporary modifiers added during preparation so we can remove
        # them when we're done, regardless of whether export succeeds or fails.
        added_mods_per_obj = {}
        try:
            bpy.ops.object.select_all(action='DESELECT')

            for obj in meshes:
                # Prepare each mesh (apply transforms, UV, triangulate).
                added_mods = ExportHelpers._prepare_mesh_for_nif(obj)
                added_mods_per_obj[obj.name] = added_mods
                obj.select_set(True)

                # Include the associated collision mesh so it is embedded in the
                # same NIF file rather than being left behind.
                ctype = getattr(obj, 'fo4_collision_type', 'DEFAULT')
                if ctype not in ('NONE', 'GRASS', 'MUSHROOM'):
                    coll = ExportHelpers._find_collision_mesh(obj)
                    if coll:
                        coll.select_set(True)

            # Set the first mesh as the active object so the exporter has a
            # valid context even when no object was explicitly activated.
            bpy.context.view_layer.objects.active = meshes[0]

            if nif_available:
                # Dispatch to the appropriate exporter.
                if exporter == "pynifly":
                    kwargs = ExportHelpers._build_pynifly_export_kwargs(filepath)
                    exporter_label = "PyNifly"
                    call = bpy.ops.export_scene.pynifly
                else:
                    kwargs = ExportHelpers._build_nif_export_kwargs(filepath)
                    exporter_label = "Niftools v0.1.1"
                    call = bpy.ops.export_scene.nif
                try:
                    result = call(**kwargs)
                    if isinstance(result, set) and 'FINISHED' in result:
                        mesh_count = len(meshes)
                        return True, f"Exported {mesh_count} mesh(es) as single NIF via {exporter_label}: {filepath}"
                    fallback_msg = f"NIF export did not finish ({result}); falling back to FBX."
                except Exception as e:
                    print(
                        f"[FO4 Add-on] Scene NIF export error: {e}",
                        file=sys.stderr,
                    )
                    traceback.print_exc(file=sys.stderr)
                    fallback_msg = f"NIF export failed ({e}); falling back to FBX."
            else:
                fallback_msg = f"{nif_message}; exporting FBX."

            # FBX fallback – keeps the UCX_ collision meshes in the selection so
            # they are embedded in the FBX and paired with visual meshes by the
            # NIF-conversion step.
            base_path = os.path.splitext(filepath)[0]
            fbx_path = base_path + ".fbx"
            bpy.ops.export_scene.fbx(
                filepath=fbx_path,
                use_selection=True,
                apply_scale_options='FBX_SCALE_ALL',
                mesh_smooth_type='FACE',
                use_mesh_modifiers=True,
            )
            mesh_count = len(meshes)
            return True, f"{fallback_msg} Exported {mesh_count} mesh(es) as FBX: {fbx_path}"

        except Exception as e:
            return False, f"Scene export failed: {str(e)}"
        finally:
            # Always restore the mesh objects to their original state by removing
            # any temporary modifiers that were added during preparation.
            for obj_name, mods in added_mods_per_obj.items():
                obj = scene.objects.get(obj_name)
                if obj:
                    for mod_name in mods:
                        mod = obj.modifiers.get(mod_name)
                        if mod:
                            obj.modifiers.remove(mod)

    @staticmethod
    def export_complete_mod(scene, output_dir):
        """Export complete mod with all assets"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        results = {
            'meshes': [],
            'textures': [],
            'animations': [],
            'errors': [],
            'skipped': []  # collision or otherwise excluded meshes
        }
        
        # Create directory structure
        mesh_dir = os.path.join(output_dir, "meshes")
        texture_dir = os.path.join(output_dir, "textures")
        
        os.makedirs(mesh_dir, exist_ok=True)
        os.makedirs(texture_dir, exist_ok=True)
        
        # Export all mesh objects
        for obj in scene.objects:
            if obj.type == 'MESH':
                # skip collision meshes generated by the add-on
                if obj.get("fo4_collision") or obj.name.upper().endswith("_COLLISION") or obj.name.upper().startswith("UCX_"):
                    results['skipped'].append(obj.name)
                    continue

                mesh_path = os.path.join(mesh_dir, f"{obj.name}.nif")
                success, message = ExportHelpers.export_mesh_to_nif(obj, mesh_path)

                if success:
                    results['meshes'].append(obj.name)
                else:
                    results['errors'].append(f"{obj.name}: {message}")
            
            elif obj.type == 'ARMATURE':
                # Export armature animation
                if obj.animation_data and obj.animation_data.action:
                    anim_name = obj.animation_data.action.name
                    results['animations'].append(anim_name)
        
        # Create manifest file
        manifest_path = os.path.join(output_dir, "manifest.json")
        with open(manifest_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Send event to desktop tutorial server after mod export
        try:
            from . import desktop_tutorial_client
            event_data = {
                'output_dir': output_dir,
                'results': results
            }
            desktop_tutorial_client.DesktopTutorialClient.send_event('mod_exported', event_data)
        except Exception as e:
            print(f"[DesktopTutorialClient] Failed to send mod export event: {e}")
        return True, results
    
    @staticmethod
    def create_mod_structure(mod_name, output_dir):
        """Create basic Fallout 4 mod directory structure"""
        if not mod_name:
            return False, "Mod name cannot be empty"
        
        mod_dir = os.path.join(output_dir, mod_name)
        
        # Create directory structure
        directories = [
            mod_dir,
            os.path.join(mod_dir, "meshes"),
            os.path.join(mod_dir, "textures"),
            os.path.join(mod_dir, "materials"),
            os.path.join(mod_dir, "animations"),
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
        
        # Create README
        readme_path = os.path.join(mod_dir, "README.txt")
        with open(readme_path, 'w') as f:
            f.write(f"Fallout 4 Mod: {mod_name}\n")
            f.write("=" * 50 + "\n\n")
            f.write("Created with Blender Fallout 4 Tutorial Add-on\n\n")
            f.write("Directory Structure:\n")
            f.write("- meshes/: 3D mesh files (.nif)\n")
            f.write("- textures/: Texture files (.dds)\n")
            f.write("- materials/: Material files (.bgsm, .bgem)\n")
            f.write("- animations/: Animation files (.hkx)\n")
        
        return True, f"Mod structure created at: {mod_dir}"

def register():
    """Register export helper functions"""
    pass

def unregister():
    """Unregister export helper functions"""
    pass
