"""
Animation helper functions for Fallout 4 mod creation
"""

import bpy
from mathutils import Vector

# preview handler stored at module scope
_wind_preview_handler = None

# On addon reload the previous module's handler closure may still be registered.
# Remove any stale handlers we tagged with _mossy_wind_preview before resetting.
try:
    _stale = [h for h in bpy.app.handlers.frame_change_post
              if getattr(h, '_mossy_wind_preview', False)]
    for _h in _stale:
        bpy.app.handlers.frame_change_post.remove(_h)
except Exception:
    pass


# ---------------------------------------------------------------------------
# Blender Action API compatibility shim
# ---------------------------------------------------------------------------
# Blender 4.4 replaced the flat ``action.fcurves`` collection with a layered
# Action system: ``action.layers[n].strips[n].fcurves``.  Blender 5.0 carries
# this further - ``action.fcurves`` no longer exists at all on newly-created
# actions.  The helper below returns the correct fcurves container regardless
# of Blender version and also assigns the action slot when required so the
# animation data resolves correctly in 4.4+.

def _assign_action_to_id(anim_data, action):
    """Assign *action* to *anim_data* and bind the correct slot (Blender ≥ 4.4).

    In Blender < 4.4 simply setting ``anim_data.action = action`` is sufficient.
    From Blender 4.4 onward each action has *slots* (formerly "bindings") that
    map it to a specific ID type.  Without a valid slot assignment the
    animation channels are invisible to the object even though the action is
    technically assigned.
    """
    anim_data.action = action

    # Slot / binding system – introduced in Blender 4.4.
    if not hasattr(anim_data, 'action_slot'):
        return  # Blender < 4.4: nothing more to do

    if not action.slots:
        # Create the first slot with a generic name; the engine will match it
        # to the owner ID automatically.
        try:
            slot = action.slots.new(id_type='OBJECT', name='Slot')
        except Exception:
            try:
                slot = action.slots.new()
            except Exception:
                return
    else:
        slot = action.slots[0]

    try:
        anim_data.action_slot = slot
    except Exception:
        pass


def _get_action_fcurves(action):
    """Return the fcurves container for *action*, creating layers/strips as needed.

    * Blender < 4.4 (legacy action): returns ``action.fcurves`` directly.
    * Blender 4.4–4.x (layered action): ``action.fcurves`` does not exist;
      returns ``strip.fcurves`` after ensuring the default layer/strip exist.
    * Blender 5.0+ (layered action v2): ``strip.fcurves`` was also removed;
      fcurves are now per-slot via ``strip.channels(slot.handle).fcurves``.
    """
    # Legacy path: action still exposes a flat fcurves collection.
    if hasattr(action, 'fcurves'):
        return action.fcurves

    # Layered path (Blender 4.4+ / 5.0).
    if not action.layers:
        layer = action.layers.new(name="Layer")
    else:
        layer = action.layers[0]

    if not layer.strips:
        # 'KEYFRAME' is the standard strip type for traditional keyframe data.
        strip = layer.strips.new(type='KEYFRAME')
    else:
        strip = layer.strips[0]

    # Blender 4.4–4.x: strip still exposes a flat .fcurves collection.
    if hasattr(strip, 'fcurves'):
        return strip.fcurves

    # Blender 5.0+: fcurves are per-slot.  Ensure a slot exists first.
    if not action.slots:
        try:
            slot = action.slots.new(id_type='OBJECT', name='Slot')
        except TypeError:
            slot = action.slots.new()
    else:
        slot = action.slots[0]

    # strip.channels(slot.handle) creates the ChannelBag on demand and returns it.
    if hasattr(strip, 'channels'):
        return strip.channels(slot.handle).fcurves

    # Blender 5.1+: strip.channels was removed; channelbags is the only API.
    # The collection is empty on a fresh strip, so create one if needed.
    # new() expects the ActionSlot object, not slot.handle (an int).
    if hasattr(strip, 'channelbags'):
        if strip.channelbags:
            return strip.channelbags[0].fcurves
        channelbag = strip.channelbags.new(slot)
        return channelbag.fcurves

    raise RuntimeError(
        f"Cannot resolve action fcurves on Blender "
        f"{bpy.app.version[0]}.{bpy.app.version[1]}"
    )


def _read_color_attr_per_vertex(mesh, ca, channel_avg_rgb=False):
    """Read one value per vertex out of color attribute *ca*, handling both
    the POINT domain (indexed directly by vertex) and CORNER/loop domain
    (indexed by loop, requiring a vertex_index lookup) -- mixing these up
    causes an IndexError (POINT-domain data is only len(vertices) long, not
    len(loops)). If channel_avg_rgb, returns the average of R/G/B (PyNifly's
    own convention for its "VERTEX_ALPHA" map); otherwise returns the alpha
    (4th) channel."""
    mesh_verts = len(mesh.vertices)
    values = {}
    if ca.domain == 'POINT':
        for vi in range(mesh_verts):
            c = ca.data[vi].color
            values[vi] = (c[0] + c[1] + c[2]) / 3.0 if channel_avg_rgb else c[3]
    else:
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                vi = mesh.loops[li].vertex_index
                if vi not in values:
                    c = ca.data[li].color
                    values[vi] = (c[0] + c[1] + c[2]) / 3.0 if channel_avg_rgb else c[3]
    return values


def _read_wind_color_alpha_per_vertex(mesh_obj, attr_name="Col"):
    """Read the baked wind alpha per vertex, PyNifly-style: prefer a
    "VERTEX_ALPHA" color attribute (averaging its R/G/B -- that's what
    PyNifly's own exporter actually reads as the alpha channel, see
    apply_wind_vertex_colors's docstring for why), falling back to
    *attr_name*'s own alpha component when "VERTEX_ALPHA" doesn't exist.
    Returns a dict {vertex_index: alpha}, or {} if neither attribute exists.
    """
    mesh = mesh_obj.data
    try:
        va = mesh.color_attributes.get("VERTEX_ALPHA")
        if va is not None:
            return _read_color_attr_per_vertex(mesh, va, channel_avg_rgb=True)
    except Exception:
        pass
    try:
        ca = mesh.color_attributes.get(attr_name)
        if ca is not None:
            return _read_color_attr_per_vertex(mesh, ca, channel_avg_rgb=False)
    except Exception:
        pass
    # Legacy vertex_colors API (Blender 3.x without color_attributes).
    alphas = {}
    try:
        vc = mesh.vertex_colors.get(attr_name)
        if vc is not None:
            for poly in mesh.polygons:
                for li in poly.loop_indices:
                    vi = mesh.loops[li].vertex_index
                    if vi not in alphas:
                        alphas[vi] = vc.data[li].color[3]
    except Exception:
        pass
    return alphas


def _find_unwelded_near_duplicates(mesh_obj, epsilon=0.001):
    """Return the list of (vert_i, vert_j) pairs that sit within *epsilon* of
    each other in world space but aren't connected by a mesh edge -- i.e.
    they only look connected at rest. This is the classic result of
    Object > Join-ing new geometry (e.g. a Solidify-thickened plane) onto an
    existing mesh without a follow-up Merge by Distance: the seam isn't
    actually welded, so any bend (wind, armature) pulls the pieces apart
    proportional to how far that region moves -- worst at high-wind-weight
    tips, invisible near the anchored base."""
    from mathutils import kdtree as _kdtree

    me = mesh_obj.data
    n = len(me.vertices)
    if n == 0:
        return []

    coords = [mesh_obj.matrix_world @ v.co for v in me.vertices]
    kd = _kdtree.KDTree(n)
    for i, co in enumerate(coords):
        kd.insert(co, i)
    kd.balance()

    edge_set = {frozenset(e.vertices) for e in me.edges}

    seen_pairs = set()
    pairs = []
    for i, co in enumerate(coords):
        for _co2, j, _dist in kd.find_range(co, epsilon):
            if j <= i:
                continue
            pair = (i, j)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            if frozenset((i, j)) not in edge_set:
                pairs.append(pair)
    return pairs


def _count_unwelded_near_duplicates(mesh_obj, epsilon=0.001):
    """Count of _find_unwelded_near_duplicates -- see that function for what
    this actually detects and why."""
    return len(_find_unwelded_near_duplicates(mesh_obj, epsilon))


def _count_stale_wind_colors(mesh_obj, weights, tolerance=0.05):
    """Count vertices whose baked "Col" alpha no longer matches *weights*
    (the current Wind group weight, indexed by vertex index) beyond
    *tolerance*. Returns 0 if there's no "Col" attribute yet (nothing to be
    stale relative to)."""
    alphas = _read_wind_color_alpha_per_vertex(mesh_obj)
    if not alphas:
        return 0
    stale = 0
    for vi, alpha in alphas.items():
        if vi >= len(weights):
            continue
        if abs(alpha - weights[vi]) > tolerance:
            stale += 1
    return stale


class AnimationHelpers:
    """Helper functions for animation setup and validation"""
    
    @staticmethod
    def setup_fo4_armature():
        """Create a Fallout 4 compatible biped armature.

        Bone names match the FO4 vanilla skeleton convention used in
        ``HumanRace.nif`` / ``HumanRace.hkx``.  The "NPC X [Abbrev]" format
        is required by the Creation Kit and vanilla equipment so that armour
        and clothing pieces deform correctly when parented to this skeleton.

        Hierarchy (simplified - fingers/facial bones omitted for base meshes):

        Root
        └─ COM [COM]
           └─ Pelvis [Pelvis]
              ├─ Spine [Spine]
              │  ├─ Spine1 [Spine1]
              │  │  └─ Spine2 [Spine2]
              │  │     ├─ Neck [Neck]
              │  │     │  └─ Head [Head]
              │  │     ├─ NPC L Clavicle [LClav]
              │  │     │  └─ NPC L UpperArm [LUpArm]
              │  │     │     └─ NPC L Forearm [LForearm]
              │  │     │        └─ NPC L Hand [LHand]
              │  │     └─ NPC R Clavicle [RClav]
              │  │        └─ NPC R UpperArm [RUpArm]
              │  │           └─ NPC R Forearm [RForearm]
              │  │              └─ NPC R Hand [RHand]
              ├─ NPC L Thigh [LThigh]
              │  └─ NPC L Calf [LCalf]
              │     └─ NPC L Foot [LFoot]
              │        └─ NPC L Toe0 [LToe0]
              └─ NPC R Thigh [RThigh]
                 └─ NPC R Calf [RCalf]
                    └─ NPC R Foot [RFoot]
                       └─ NPC R Toe0 [RToe0]
        """
        # Create armature
        bpy.ops.object.armature_add(location=(0, 0, 0))
        armature_obj = bpy.context.active_object
        if armature_obj is None:
            raise RuntimeError("armature_add() did not produce an active object — check context mode")
        armature_obj.name = "FO4_Armature"
        armature = armature_obj.data
        armature.name = "FO4_Armature"

        # Enter edit mode to add bones
        bpy.ops.object.mode_set(mode='EDIT')

        edit_bones = armature.edit_bones
        # rename the default bone that armature_add creates
        root_bone = edit_bones[0]
        root_bone.name = "Root"
        root_bone.head = Vector((0, 0, 0))
        root_bone.tail = Vector((0, 0, 0.1))

        # ── Centre of Mass ──────────────────────────────────────────────
        com = edit_bones.new("COM [COM]")
        com.head = Vector((0, 0, 0.9))
        com.tail = Vector((0, 0, 1.0))
        com.parent = root_bone

        # ── Pelvis ──────────────────────────────────────────────────────
        pelvis = edit_bones.new("NPC Pelvis [Pelvis]")
        pelvis.head = Vector((0, 0, 1.0))
        pelvis.tail = Vector((0, 0, 1.1))
        pelvis.parent = com

        # ── Spine chain ─────────────────────────────────────────────────
        spine = edit_bones.new("NPC Spine [Spine]")
        spine.head = Vector((0, 0, 1.1))
        spine.tail = Vector((0, 0, 1.2))
        spine.parent = pelvis

        spine1 = edit_bones.new("NPC Spine1 [Spine1]")
        spine1.head = Vector((0, 0, 1.2))
        spine1.tail = Vector((0, 0, 1.35))
        spine1.parent = spine

        spine2 = edit_bones.new("NPC Spine2 [Spine2]")
        spine2.head = Vector((0, 0, 1.35))
        spine2.tail = Vector((0, 0, 1.5))
        spine2.parent = spine1

        # ── Neck / Head ─────────────────────────────────────────────────
        neck = edit_bones.new("NPC Neck [Neck]")
        neck.head = Vector((0, 0, 1.5))
        neck.tail = Vector((0, 0, 1.6))
        neck.parent = spine2

        head = edit_bones.new("NPC Head [Head]")
        head.head = Vector((0, 0, 1.6))
        head.tail = Vector((0, 0, 1.8))
        head.parent = neck

        # ── Left arm ────────────────────────────────────────────────────
        l_clav = edit_bones.new("NPC L Clavicle [LClav]")
        l_clav.head = Vector((0.1, 0, 1.48))
        l_clav.tail = Vector((0.3, 0, 1.46))
        l_clav.parent = spine2

        l_upper_arm = edit_bones.new("NPC L UpperArm [LUar]")
        l_upper_arm.head = Vector((0.3, 0, 1.46))
        l_upper_arm.tail = Vector((0.6, 0, 1.4))
        l_upper_arm.parent = l_clav

        l_forearm = edit_bones.new("NPC L Forearm [LLar]")
        l_forearm.head = Vector((0.6, 0, 1.4))
        l_forearm.tail = Vector((0.9, 0, 1.35))
        l_forearm.parent = l_upper_arm

        l_hand = edit_bones.new("NPC L Hand [LHnd]")
        l_hand.head = Vector((0.9, 0, 1.35))
        l_hand.tail = Vector((1.05, 0, 1.32))
        l_hand.parent = l_forearm

        # ── Right arm ───────────────────────────────────────────────────
        r_clav = edit_bones.new("NPC R Clavicle [RClav]")
        r_clav.head = Vector((-0.1, 0, 1.48))
        r_clav.tail = Vector((-0.3, 0, 1.46))
        r_clav.parent = spine2

        r_upper_arm = edit_bones.new("NPC R UpperArm [RUar]")
        r_upper_arm.head = Vector((-0.3, 0, 1.46))
        r_upper_arm.tail = Vector((-0.6, 0, 1.4))
        r_upper_arm.parent = r_clav

        r_forearm = edit_bones.new("NPC R Forearm [RLar]")
        r_forearm.head = Vector((-0.6, 0, 1.4))
        r_forearm.tail = Vector((-0.9, 0, 1.35))
        r_forearm.parent = r_upper_arm

        r_hand = edit_bones.new("NPC R Hand [RHnd]")
        r_hand.head = Vector((-0.9, 0, 1.35))
        r_hand.tail = Vector((-1.05, 0, 1.32))
        r_hand.parent = r_forearm

        # ── Left leg ────────────────────────────────────────────────────
        l_thigh = edit_bones.new("NPC L Thigh [LThg]")
        l_thigh.head = Vector((0.18, 0, 1.0))
        l_thigh.tail = Vector((0.2, 0, 0.55))
        l_thigh.parent = pelvis

        l_calf = edit_bones.new("NPC L Calf [LClf]")
        l_calf.head = Vector((0.2, 0, 0.55))
        l_calf.tail = Vector((0.2, 0, 0.15))
        l_calf.parent = l_thigh

        l_foot = edit_bones.new("NPC L Foot [Lft ]")
        l_foot.head = Vector((0.2, 0, 0.15))
        l_foot.tail = Vector((0.2, 0.12, 0.05))
        l_foot.parent = l_calf

        l_toe = edit_bones.new("NPC L Toe0 [LToe0]")
        l_toe.head = Vector((0.2, 0.12, 0.05))
        l_toe.tail = Vector((0.2, 0.2, 0.02))
        l_toe.parent = l_foot

        # ── Right leg ───────────────────────────────────────────────────
        r_thigh = edit_bones.new("NPC R Thigh [RThg]")
        r_thigh.head = Vector((-0.18, 0, 1.0))
        r_thigh.tail = Vector((-0.2, 0, 0.55))
        r_thigh.parent = pelvis

        r_calf = edit_bones.new("NPC R Calf [RClf]")
        r_calf.head = Vector((-0.2, 0, 0.55))
        r_calf.tail = Vector((-0.2, 0, 0.15))
        r_calf.parent = r_thigh

        r_foot = edit_bones.new("NPC R Foot [Rft ]")
        r_foot.head = Vector((-0.2, 0, 0.15))
        r_foot.tail = Vector((-0.2, 0.12, 0.05))
        r_foot.parent = r_calf

        r_toe = edit_bones.new("NPC R Toe0 [RToe0]")
        r_toe.head = Vector((-0.2, 0.12, 0.05))
        r_toe.tail = Vector((-0.2, 0.2, 0.02))
        r_toe.parent = r_foot

        bpy.ops.object.mode_set(mode='OBJECT')

        return armature_obj
    
    @staticmethod
    def auto_weight_paint(mesh_obj, armature_obj):
        """Automatically weight paint mesh to armature.

        If the Python package ``libigl`` is installed it will be used to compute
        bounded biharmonic weights (BBW) for higher quality skinning.  In that
        case bones are treated as handles and BBW results replace the vertex
        groups produced by the default Blender auto weights.  If ``libigl`` is
        missing the method falls back to ``ARMATURE_AUTO``.

        The function will attempt to install ``libigl`` via pip if an import
        failure occurs; this requires a working internet connection and write
        access to the current Python environment.  Installation problems are
        reported in the returned message but do not prevent the Blender
        fallback from running.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        if armature_obj.type != 'ARMATURE':
            return False, "Target is not an armature"

        # try libigl first
        igl = None
        try:
            import igl
        except ImportError:
            # try local wheel first
            try:
                from pathlib import Path, PurePath
                import subprocess, sys
                wheel_dir = Path(__file__).resolve().parent / "tools"
                candidates = list(wheel_dir.glob("libigl*.whl"))
                if candidates:
                    subprocess.check_call([sys.executable, "-m", "pip", "install",
                                           "--no-warn-script-location", str(candidates[0])])
                    import igl
                else:
                    subprocess.check_call([sys.executable, "-m", "pip", "install",
                                           "--no-warn-script-location", "libigl"])
                    import igl
            except Exception:
                igl = None
        if igl:
            try:
                import numpy as np
                mesh = mesh_obj.data
                # world-space vertex coordinates
                V = np.array([mesh_obj.matrix_world @ v.co for v in mesh.vertices])
                # face indices
                F = np.array([p.vertices for p in mesh.polygons], dtype=int)
                # handles: one per bone at bone head position
                bones = [b for b in armature_obj.data.bones]
                H = np.array([armature_obj.matrix_world @ b.head_local for b in bones])
                # compute bbw weights (vertices x handles)
                print("[auto_weight_paint] computing BBW weights via libigl...")
                # give user some feedback
                try:
                    bpy.ops.wm.progress_begin(0, 100)
                except Exception:
                    pass
                W = igl.bbw(V, F, H)
                try:
                    bpy.ops.wm.progress_end()
                except Exception:
                    pass
                # clear existing groups and add new weights
                mesh_obj.vertex_groups.clear()
                for vi, wrow in enumerate(W):
                    for bi, wval in enumerate(wrow):
                        if wval <= 0.0:
                            continue
                        name = bones[bi].name
                        vg = mesh_obj.vertex_groups.get(name) or mesh_obj.vertex_groups.new(name=name)
                        vg.add([vi], float(wval), 'REPLACE')
                return True, "BBW weights applied via libigl"
            except Exception:
                # fall back to blender method below
                pass

        # Select mesh and armature for blender auto weights
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj

        # Parent with automatic weights
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        return True, "Automatic weights applied successfully"    
    @staticmethod
    def validate_animation(armature_obj):
        """Validate armature and animation for Fallout 4"""
        issues = []
        
        if armature_obj.type != 'ARMATURE':
            issues.append("Object is not an armature")
            return False, issues
        
        armature = armature_obj.data
        
        # Check bone count
        if len(armature.bones) == 0:
            issues.append("Armature has no bones")
        elif len(armature.bones) > 80:  # FO4 limit: 80 deform bones per skinned mesh
            issues.append(f"Too many bones: {len(armature.bones)} (FO4 limit: 256)")
        
        # Check for root bone
        root_bones = [b for b in armature.bones if b.parent is None]
        if len(root_bones) == 0:
            issues.append("No root bone found")
        elif len(root_bones) > 1:
            issues.append(f"Multiple root bones found: {len(root_bones)}")
        
        # Check for animation data
        if armature_obj.animation_data:
            if armature_obj.animation_data.action:
                action = armature_obj.animation_data.action
                
                # Check frame range
                frame_start = int(action.frame_range[0])
                frame_end = int(action.frame_range[1])
                
                if frame_end - frame_start > 3600:
                    issues.append(f"Animation too long: {frame_end - frame_start} frames")
        else:
            # No animation data is acceptable for static (non-animated) objects.
            pass
        
        # Check bone naming conventions.
        # NOTE: FO4 bone names follow the "NPC X [Abbrev]" convention which
        # deliberately includes spaces (e.g. "NPC L UpperArm [LUpArm]").
        # Flagging spaces as errors is INCORRECT for FO4 skeletons.
        # We instead warn only about names that are completely empty.
        for bone in armature.bones:
            if not bone.name.strip():
                issues.append(f"Bone has an empty name (index in armature: unnamed)")
        
        if not issues:
            return True, ["Armature is valid for Fallout 4"]
        
        return False, issues
    
    @staticmethod
    def create_idle_animation(armature_obj, duration=60):
        """Create a simple idle animation"""
        if armature_obj.type != 'ARMATURE':
            return False, "Object is not an armature"
        
        # Create new action
        action = bpy.data.actions.new(name=f"{armature_obj.name}_Idle")
        
        if not armature_obj.animation_data:
            armature_obj.animation_data_create()
        
        armature_obj.animation_data.action = action
        
        # Set frame range
        bpy.context.scene.frame_start = 0
        bpy.context.scene.frame_end = duration
        
        # Add keyframes for subtle movement
        bpy.context.scene.frame_set(0)
        armature_obj.keyframe_insert(data_path="location", frame=0)
        
        bpy.context.scene.frame_set(duration)
        armature_obj.keyframe_insert(data_path="location", frame=duration)
        
        return True, "Idle animation created"

    @staticmethod
    def scan_wind_readiness(mesh_obj):
        """Pre-flight check that *mesh_obj* is safe for wind setup.

        The armature-driven wind bends the mesh by rotating a bone that the
        Wind vertex group follows.  If the object still carries an **unapplied
        scale** (especially a non-uniform one) or **unapplied rotation**, that
        transform sandwiches the bone rotation and turns part of it into a
        shear/scale every cycle — the plant appears to "breathe" (inflate and
        deflate) instead of swaying.  A pivot that sits at the mesh centre
        rather than the base makes the whole plant swing about its middle.

        This scan looks for those mesh-specific problems *before* any bone is
        built.  It changes nothing — it only reports.  Use
        :func:`ensure_wind_ready` to auto-fix.

        **Returns:** ``(ready: bool, issues: list[str], info: dict)``
        where ``issues`` is empty when the mesh is safe and ``info`` carries the
        raw measurements (scale, rotation, origin offset, gradient state).
        """
        issues = []
        info = {}
        if mesh_obj is None or mesh_obj.type != 'MESH':
            return False, ["Object is not a mesh"], info

        # --- scale applied & uniform -----------------------------------
        sx, sy, sz = mesh_obj.scale
        info['scale'] = (sx, sy, sz)
        scale_off = max(abs(sx - 1.0), abs(sy - 1.0), abs(sz - 1.0))
        non_uniform = max(abs(sx - sy), abs(sy - sz), abs(sx - sz)) > 1e-4
        if scale_off > 1e-3:
            if non_uniform:
                issues.append(
                    f"Scale is not applied and is NON-UNIFORM "
                    f"({sx:.3f}, {sy:.3f}, {sz:.3f}) — this is the usual cause "
                    f"of the 'breathing'/inflating wind bug"
                )
            else:
                issues.append(
                    f"Scale is not applied ({sx:.3f}, {sy:.3f}, {sz:.3f})"
                )

        # --- rotation applied ------------------------------------------
        rx, ry, rz = (mesh_obj.rotation_euler
                      if mesh_obj.rotation_mode not in {'QUATERNION', 'AXIS_ANGLE'}
                      else mesh_obj.rotation_euler)
        info['rotation'] = (rx, ry, rz)
        if max(abs(rx), abs(ry), abs(rz)) > 1e-3:
            issues.append(
                f"Rotation is not applied "
                f"({rx:.3f}, {ry:.3f}, {rz:.3f} rad) — the wind gradient axis "
                f"will not line up with the mesh"
            )

        # --- origin at the base (min-Z), not the centre ----------------
        me = mesh_obj.data
        if me.vertices:
            world_z = [(mesh_obj.matrix_world @ v.co).z for v in me.vertices]
            min_z, max_z = min(world_z), max(world_z)
            height = max_z - min_z
            origin_z = mesh_obj.matrix_world.translation.z
            info['height'] = height
            info['origin_above_base'] = origin_z - min_z
            if height > 1e-4 and (origin_z - min_z) > 0.15 * height:
                pct = (origin_z - min_z) / height * 100.0
                issues.append(
                    f"Origin sits {pct:.0f}% up the mesh, not at the base — "
                    f"the plant will swing about its middle"
                )

        # --- unwelded seams: near-duplicate vertices with no connecting edge ---
        # Joining new geometry (e.g. a Solidify-thickened plane) onto an
        # existing mesh via Object > Join does NOT weld touching vertices at
        # the seam -- the pieces only look connected at rest. Any bend then
        # pulls them apart proportional to how far that region actually
        # moves, which is why this shows up worst at the tip (highest wind
        # weight) and is invisible near the anchored base -- the "top
        # separates, bottom is fine" symptom. Skipped on very large meshes
        # (KD-tree cost).
        if me.vertices and len(me.vertices) <= 50000:
            unwelded = _count_unwelded_near_duplicates(mesh_obj)
            if unwelded:
                info['unwelded_seam_pairs'] = unwelded
                issues.append(
                    f"{unwelded} pair(s) of near-duplicate vertices are not "
                    "welded together (touching but not connected by an edge) "
                    "— likely a seam from joining new geometry without "
                    "merging it. These will visibly separate under wind "
                    "bending, worse the more they sway. Run Merge by Distance "
                    "(Edit Mode > Mesh > Merge > By Distance) before "
                    "re-exporting."
                )

        # --- armature modifiers ----------------------------------------
        arm_mods = [m for m in mesh_obj.modifiers if m.type == 'ARMATURE' and m.object]
        info['armature_mod_count'] = len(arm_mods)
        non_wind = [m for m in arm_mods
                    if not (m.object.type == 'ARMATURE'
                            and 'Wind' in m.object.data.bones)]
        if len(arm_mods) > 1:
            issues.append(
                f"{len(arm_mods)} armature modifiers present — stacked "
                f"deformers will fight the wind bone"
            )
        if non_wind:
            issues.append(
                "A non-Wind armature modifier is bound to this mesh"
            )

        # --- Wind vertex group gradient --------------------------------
        vg = mesh_obj.vertex_groups.get("Wind")
        uncovered = 0
        if vg is not None and me.vertices:
            weights = []
            for v in me.vertices:
                w = None
                for g in v.groups:
                    if g.group == vg.index:
                        w = g.weight
                        break
                if w is None:
                    uncovered += 1
                    w = 0.0
                weights.append(w)
            if weights:
                spread = max(weights) - min(weights)
                info['wind_weight_spread'] = spread
                if spread < 0.05:
                    issues.append(
                        "Existing 'Wind' group is uniform (no anchor→tip "
                        "gradient) — every vertex will sway equally"
                    )

            # --- Group coverage: vertices with NO Wind membership at all --
            # A uniform-spread check alone can't catch this: vertices that
            # were never added to the group (e.g. new geometry joined onto
            # an already wind-rigged mesh) are silently treated as weight 0
            # above, which still looks like a valid anchored region even
            # though it was simply never processed. This is the exact cause
            # of pieces visually separating from the rest of the mesh under
            # wind sway in-game.
            info['wind_uncovered_verts'] = uncovered
            if uncovered:
                issues.append(
                    f"{uncovered} vertex(es) have no 'Wind' group membership at "
                    "all — likely new geometry added after the initial wind "
                    "setup; re-run wind generation on the whole mesh"
                )

            # --- Vertex-color staleness: alpha vs. current group weight ---
            # apply_wind_vertex_colors() bakes the Wind group weight into the
            # "Col" attribute's alpha channel at the time it's run. If the
            # mesh changed afterward (more geometry, re-weighted verts) and
            # the colors were never regenerated, the baked alpha the engine
            # actually reads no longer matches the current gradient.
            stale = _count_stale_wind_colors(mesh_obj, weights)
            if stale:
                info['wind_stale_color_verts'] = stale
                issues.append(
                    f"{stale} vertex(es) have vertex-color alpha that doesn't "
                    "match the current Wind group weight — vertex colors are "
                    "stale, re-run 'Apply Vegetation Wind'"
                )

        return (len(issues) == 0), issues, info

    @staticmethod
    def ensure_wind_ready(mesh_obj, auto_fix=True):
        """Verify — and optionally repair — a mesh so wind behaves correctly.

        Runs :func:`scan_wind_readiness`.  When ``auto_fix`` is True it applies
        the non-destructive geometric fixes that eliminate the breathing bug:

        1. Applies rotation and scale (never location, so the mesh stays put).
        2. Moves the object origin to the bottom-centre (base) of the mesh so
           the wind bone pivots at the roots.

        Armature-modifier conflicts and a uniform Wind group are *reported* but
        never auto-deleted — those may be intentional, so they are left for the
        user to resolve.

        **Returns:** ``(ok: bool, actions: list[str], remaining: list[str])``
        where ``actions`` is what was fixed and ``remaining`` is what still
        needs manual attention.
        """
        ready, issues, info = AnimationHelpers.scan_wind_readiness(mesh_obj)
        if ready:
            return True, [], []
        if not auto_fix:
            return False, [], issues

        actions = []

        # --- apply rotation & scale ------------------------------------
        scale_off = max(abs(s - 1.0) for s in mesh_obj.scale)
        rot_off = max(abs(a) for a in mesh_obj.rotation_euler)
        if scale_off > 1e-3 or rot_off > 1e-3:
            prev_active = bpy.context.view_layer.objects.active
            prev_selected = [o for o in bpy.context.selected_objects]
            try:
                for o in prev_selected:
                    o.select_set(False)
                mesh_obj.select_set(True)
                bpy.context.view_layer.objects.active = mesh_obj
                bpy.ops.object.transform_apply(
                    location=False, rotation=True, scale=True
                )
                actions.append("Applied rotation & scale")
            except Exception as exc:
                return False, actions, [f"Could not apply transforms: {exc}"]
            finally:
                try:
                    mesh_obj.select_set(False)
                    for o in prev_selected:
                        if o:
                            o.select_set(True)
                    bpy.context.view_layer.objects.active = prev_active
                except Exception:
                    pass

        # --- move origin to base (bottom-centre) -----------------------
        me = mesh_obj.data
        if me.vertices:
            xs = [v.co.x for v in me.vertices]
            ys = [v.co.y for v in me.vertices]
            zs = [v.co.z for v in me.vertices]
            # Bottom-centre in local space (after transforms are applied).
            target = Vector((
                (min(xs) + max(xs)) * 0.5,
                (min(ys) + max(ys)) * 0.5,
                min(zs),
            ))
            if target.length > 1e-5:
                for v in me.vertices:
                    v.co -= target
                me.update()
                mesh_obj.location += mesh_obj.matrix_world.to_3x3() @ target
                actions.append("Moved origin to base of mesh")

        ready2, remaining, _ = AnimationHelpers.scan_wind_readiness(mesh_obj)
        return ready2, actions, remaining

    @staticmethod
    def generate_wind_weights(mesh_obj, group_name="Wind", axis='Z', invert=False,
                              base_anchor=0.15):
        """Generate a wind‑weight vertex group with an anchored (solid) base.

        The algorithm computes a falloff along the specified local axis
        (default Z, bottom-to-top).  The bottom ``base_anchor`` fraction of the
        plant's height is held fully anchored (near-zero weight) so the base
        stays planted in the ground and does not sway.  Above that anchor zone
        the weight ramps from 0 at the anchor line to 1.0 at the tip using a
        smoothstep ease-in, so the bend builds gradually up the plant instead of
        the whole mesh thrashing uniformly.  The result is stored in a vertex
        group named ``group_name`` (created or replaced).  The ``invert`` flag
        swaps the falloff direction (tip becomes the anchored end).

        This is intended for FO4 vegetation assets where the game uses a single
        weight channel to drive procedural wind/bending (often referred to as
        "vortex weight" in the community).  Plants can then be animated with a
        simple modifier or bone that deforms according to the weight.

        **Parameters:**
        - ``mesh_obj`` (bpy.types.Object): mesh to tag
        - ``group_name`` (str): name of the vertex group to create/update
        - ``axis`` (str): local axis to use for falloff ('X','Y','Z')
        - ``invert`` (bool): if True, highest coordinate becomes the anchored end
        - ``base_anchor`` (float): fraction (0.0-1.0) of the plant height, measured
          from the base, that stays solid/unmoving.  Default 0.15 keeps the
          bottom 15% planted.  Set to 0.0 for the old pure-gradient behaviour.

        **Returns:** ``(success: bool, message: str)``
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        # VertexGroup.add() raises RuntimeError if the object is in Edit Mode
        # (e.g. the user just ran Merge by Distance and re-ran wind generation
        # without leaving Edit Mode first) -- bail out to Object Mode first.
        if bpy.context.object == mesh_obj and bpy.context.mode == 'EDIT_MESH':
            bpy.ops.object.mode_set(mode='OBJECT')

        mesh = mesh_obj.data
        # ensure vertex group exists
        vg = mesh_obj.vertex_groups.get(group_name)
        if vg is None:
            vg = mesh_obj.vertex_groups.new(name=group_name)

        # figure out axis index
        idx = {'X': 0, 'Y': 1, 'Z': 2}.get(axis.upper(), 2)

        # clamp the anchor fraction into a sane range
        base_anchor = min(max(base_anchor, 0.0), 0.95)

        # gather coordinates in object space
        coords = [(mesh_obj.matrix_world @ v.co) for v in mesh.vertices]
        values = [c[idx] for c in coords]
        minv = min(values) if values else 0.0
        maxv = max(values) if values else 0.0
        diff = maxv - minv

        if abs(diff) < 1e-6:
            # degenerate case: all verts together, give them full weight
            for i in range(len(mesh.vertices)):
                vg.add([i], 1.0, 'REPLACE')
        else:
            # Height (0..1) of the anchor line above the base.  Below this the
            # plant is solid; above it, weight ramps 0 -> 1 up to the tip.
            span = 1.0 - base_anchor  # normalized height of the moving region
            for i, val in enumerate(values):
                # normalized position along the axis, 0 = base, 1 = tip
                pos = (val - minv) / diff
                if invert:
                    pos = 1.0 - pos

                if pos <= base_anchor or span < 1e-6:
                    # inside the solid base zone -> anchored
                    w = 0.0
                else:
                    # remap the moving region to 0..1, then smoothstep ease-in
                    t = (pos - base_anchor) / span
                    w = t * t * (3.0 - 2.0 * t)

                # Floor at 0.001: pure 0.0 weight is treated as "unweighted"
                # by PyNifly's exporter and causes a hard error.  0.001 is
                # imperceptibly small and won't cause visible root-sway.
                vg.add([i], max(0.001, w), 'REPLACE')

        return True, (
            f"Wind weights ('{group_name}') generated "
            f"(base {int(base_anchor * 100)}% anchored)"
        )

    @staticmethod
    def set_static_wind_weight(mesh_obj, group_name="Wind"):
        """Mark *mesh_obj* as fully static -- no wind sway anywhere.

        Some FO4 assets (e.g. a vine wrapped tight around a creature/prop)
        still need the "Wind" vertex group + vertex-alpha channel present --
        the shader expects it -- but must never actually move, unlike normal
        vegetation's root-anchored/tip-swaying gradient from
        :meth:`generate_wind_weights`. Writes a single uniform weight across
        every vertex instead of a gradient, then pushes it through
        :meth:`apply_wind_vertex_colors` so 'VERTEX_ALPHA' reads solid
        "anchored" everywhere.

        **Returns:** ``(success: bool, message: str)``
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        if bpy.context.object == mesh_obj and bpy.context.mode == 'EDIT_MESH':
            bpy.ops.object.mode_set(mode='OBJECT')

        mesh = mesh_obj.data
        vg = mesh_obj.vertex_groups.get(group_name)
        if vg is None:
            vg = mesh_obj.vertex_groups.new(name=group_name)

        # Same 0.001 floor used by generate_wind_weights -- pure 0.0 is
        # treated as "unweighted" by PyNifly's exporter and hard-errors.
        for i in range(len(mesh.vertices)):
            vg.add([i], 0.001, 'REPLACE')

        return AnimationHelpers.apply_wind_vertex_colors(mesh_obj, group_name=group_name)

    @staticmethod
    def apply_wind_vertex_colors(mesh_obj, group_name="Wind", attr_name="Col"):
        """Write the Wind vertex-group gradient into vertex color data.

        FO4's BSLeafAnimNode reads a per-vertex alpha value to decide how much
        each vertex sways (0 = anchored base/trunk, 1 = full sway/tips).
        Without this gradient the whole mesh sways uniformly ("breathing").

        PyNifly does **not** read this from ``attr_name``'s own alpha
        component -- confirmed in its own ``export_nif.py``
        (``ALPHA_MAP_NAME = "VERTEX_ALPHA"``, ``find_colormaps``/
        ``extract_colors``): if a color attribute named ``"VERTEX_ALPHA"``
        exists, PyNifly averages *its* R/G/B (greyscale) and uses that as the
        exported alpha, completely ignoring ``attr_name``'s alpha -- which is
        exactly what PyNifly's own NIF importer creates on import (see
        ``import_nif.py``: ``ALPHA_MAP_NAME = "VERTEX_ALPHA"``,
        ``COLOR_MAP_NAME = "Col"``, both created at ``domain='POINT'``). So
        this writes the Wind weight as greyscale RGB into ``"VERTEX_ALPHA"``
        (POINT domain, matching PyNifly's own convention exactly) -- this is
        the value that actually reaches the exported NIF for any mesh that
        already has that attribute (i.e. anything imported from an existing
        FO4 NIF). ``attr_name`` ("Col") is also written as a plain white tint
        for Blender-side preview and as the fallback PyNifly uses when
        ``"VERTEX_ALPHA"`` doesn't exist at all (freshly-authored meshes).

        If no Wind group exists the function returns False so the caller can
        run generate_wind_weights first.

        Returns ``(success, message)``.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        # Writing color_attributes data while the object is in Edit Mode
        # doesn't reliably propagate (and vertex-group reads below assume
        # Object Mode too) -- same fragility as generate_wind_weights.
        if bpy.context.object == mesh_obj and bpy.context.mode == 'EDIT_MESH':
            bpy.ops.object.mode_set(mode='OBJECT')

        vg = mesh_obj.vertex_groups.get(group_name)
        if vg is None:
            return False, f"No '{group_name}' vertex group — run Apply Vegetation Wind first"

        mesh = mesh_obj.data

        # Build a per-vertex weight lookup from the Wind group.
        weights = {}
        for v in mesh.vertices:
            for ge in v.groups:
                if ge.group == vg.index:
                    weights[v.index] = ge.weight
                    break

        wrote_alpha_map = False
        try:
            va = mesh.color_attributes.get("VERTEX_ALPHA")
            if va is None:
                va = mesh.color_attributes.new(
                    name="VERTEX_ALPHA", type='FLOAT_COLOR', domain='POINT'
                )
            for vi in range(len(mesh.vertices)):
                w = weights.get(vi, 0.0)
                va.data[vi].color = (w, w, w, 1.0)
            wrote_alpha_map = True
        except Exception as exc:
            print(f"[AnimationHelpers] Could not write 'VERTEX_ALPHA': {exc}")

        # Also write attr_name ("Col") as a white tint + alpha=weight, kept for
        # Blender-side preview and as PyNifly's fallback when VERTEX_ALPHA is
        # absent entirely.
        try:
            ca = mesh.color_attributes.get(attr_name)
            if ca is None:
                ca = mesh.color_attributes.new(
                    name=attr_name, type='FLOAT_COLOR', domain='POINT'
                )
            if ca.domain == 'POINT':
                for vi in range(len(mesh.vertices)):
                    w = weights.get(vi, 0.0)
                    ca.data[vi].color = (1.0, 1.0, 1.0, w)
            else:
                for poly in mesh.polygons:
                    for li in poly.loop_indices:
                        vi = mesh.loops[li].vertex_index
                        w = weights.get(vi, 0.0)
                        ca.data[li].color = (1.0, 1.0, 1.0, w)
        except Exception as exc:
            if not wrote_alpha_map:
                return False, f"Could not write vertex colors: {exc}"

        mesh.update()
        if wrote_alpha_map:
            return True, "Wind vertex colors written to 'VERTEX_ALPHA' (PyNifly's alpha channel) + 'Col'"
        return True, f"Wind vertex colors written to '{attr_name}' (alpha = Wind weight)"

    @staticmethod
    def apply_vegetation_wind(mesh_obj, amplitude: float = 0.2, period: float = 60.0):
        """Set up FO4 vegetation wind using vertex groups and vertex color alpha.

        FO4 vegetation wind is procedural in-engine.  The BSLeafAnimNode reads
        the vertex color alpha channel per-vertex (0=anchored, 1=full sway).
        This method generates both the Wind vertex group (for Blender preview)
        and the vertex color alpha gradient (for the in-game engine).

        Steps:
        1. Apply transforms / fix origin so the mesh can't "breathe" on export.
        2. Generate a Z-axis gradient on the ``Wind`` vertex group.
        3. Mirror that gradient into vertex color alpha (white RGB, alpha=weight).
        4. Tag the object as VEGETATION for export.

        Returns ``(success, message)``.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        # Pre-flight: apply transforms / fix origin so the mesh can't "breathe".
        ready, fixes, remaining = AnimationHelpers.ensure_wind_ready(mesh_obj, auto_fix=True)
        fix_note = f" [prep: {', '.join(fixes)}]" if fixes else ""

        ok, msg = AnimationHelpers.generate_wind_weights(mesh_obj, group_name="Wind")
        if not ok:
            return False, msg

        # Mirror the wind weights into vertex color alpha so FO4's BSLeafAnimNode
        # can read the per-vertex sway amount in-engine.
        vc_ok, vc_msg = AnimationHelpers.apply_wind_vertex_colors(mesh_obj)
        vc_note = f" | {vc_msg}" if not vc_ok else ""

        mesh_obj["fo4_object_type"]    = "VEGETATION"
        mesh_obj["fo4_wind_amplitude"] = amplitude
        mesh_obj["fo4_wind_period"]    = period

        return True, (
            f"Vegetation wind applied to '{mesh_obj.name}' "
            f"(vertex group + vertex color alpha gradient){fix_note}{vc_note}"
        )

    @staticmethod
    def apply_wind_animation(mesh_obj, amplitude: float = 0.2, period: float = 60.0, axis: str = 'X'):
        """Create a minimal armature and add a wind‑bone animation.

        - generates wind weights if missing
        - parents mesh to a new (or existing) armature with a "Wind" bone
        - creates an action with a noise‑modulated rotation on that bone
        - adjusts scene frame range to match ``period``

        ``amplitude`` controls the rotation strength (radians), ``period`` the
        length of the animation loop, and ``axis`` selects rotation axis.
        """
        if mesh_obj.type != 'MESH':
            return False, "Object is not a mesh"

        # Pre-flight: apply transforms / fix origin BEFORE building the wind
        # bone.  Skipping this on a mesh with unapplied (non-uniform) scale is
        # what makes the plant "breathe"/inflate instead of sway.
        AnimationHelpers.ensure_wind_ready(mesh_obj, auto_fix=True)

        # ensure weight channel exists
        AnimationHelpers.generate_wind_weights(mesh_obj)

        arm_obj = None
        # look for existing armature modifier with Wind bone
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE' and mod.object and mod.object.type == 'ARMATURE':
                if "Wind" in mod.object.data.bones:
                    arm_obj = mod.object
                    break
        if arm_obj is None and mesh_obj.parent and mesh_obj.parent.type == 'ARMATURE':
            if "Wind" in mesh_obj.parent.data.bones:
                arm_obj = mesh_obj.parent

        # create new armature if needed
        if arm_obj is None:
            arm = bpy.data.armatures.new(mesh_obj.name + "_WindArm")
            arm_obj = bpy.data.objects.new(mesh_obj.name + "_WindArmObj", arm)
            bpy.context.collection.objects.link(arm_obj)
            bpy.context.view_layer.objects.active = arm_obj
            bpy.ops.object.mode_set(mode='EDIT')
            bone = arm.edit_bones.new("Wind")
            bone.head = mesh_obj.location
            bone.tail = mesh_obj.location + Vector((0.0, 0.0, 0.1))
            bpy.ops.object.mode_set(mode='OBJECT')
            mesh_obj.parent = arm_obj
            wm = mesh_obj.modifiers.new(name="WindArmature", type='ARMATURE')
            wm.object = arm_obj
        else:
            mesh_obj.parent = arm_obj
            if not any(m.type == 'ARMATURE' and m.object == arm_obj for m in mesh_obj.modifiers):
                wm = mesh_obj.modifiers.new(name="WindArmature", type='ARMATURE')
                wm.object = arm_obj
            if "Wind" not in arm_obj.data.bones:
                return False, "Existing armature lacks a 'Wind' bone"

        # create/assign action
        if not arm_obj.animation_data:
            arm_obj.animation_data_create()
        action = bpy.data.actions.new(name=mesh_obj.name + "_WindAnim")
        # Use the compat helper so Blender 4.4+ slot assignment is handled
        # and Blender 5.0's layered action system is used correctly.
        _assign_action_to_id(arm_obj.animation_data, action)
        idx = {'X':0,'Y':1,'Z':2}.get(axis.upper(),0)
        data_path = f'pose.bones["Wind"].rotation_euler'
        # _get_action_fcurves() returns the right container on all Blender
        # versions: flat action.fcurves (< 4.4) or the layered-strip fcurves
        # (≥ 4.4 / 5.0) where action.fcurves no longer exists.
        fcurves = _get_action_fcurves(action)

        # PyNifly _parse_transform_curves requires all three euler axes to exist
        # (eu[0/1/2]).  It also requires BEZIER keyframes with non-degenerate
        # handles: LINEAR → NotImplementedError; flat BEZIER with auto-handles
        # → ZeroDivisionError in _key_blender_to_nif when handle.x == co.x.
        #
        # Primary axis: sine-wave keyframes (no NOISE modifier — PyNifly reads
        # raw keyframe data and ignores fcurve modifiers entirely).
        # Filler axes: flat BEZIER with explicit FREE handles that are offset
        # from the keyframe X so _key_blender_to_nif never divides by zero.
        for axis_idx in range(3):
            fc = fcurves.new(data_path=data_path, index=axis_idx)
            if axis_idx == idx:
                # Sine-wave: 5 points per 60-frame cycle (0, +A, 0, -A, 0)
                n_cyc = max(1, round(period / 60))
                cyc_len = period / n_cyc
                kf_data = []
                for c in range(n_cyc):
                    base = c * cyc_len
                    kf_data += [(base, 0.0), (base + cyc_len / 4, amplitude),
                                (base + cyc_len / 2, 0.0),
                                (base + 3 * cyc_len / 4, -amplitude)]
                kf_data.append((period, 0.0))

                fc.keyframe_points.add(count=len(kf_data))
                for i, (t, v) in enumerate(kf_data):
                    kp = fc.keyframe_points[i]
                    kp.co = (t, v)
                    kp.interpolation = 'BEZIER'
                fc.update()
                # VECTOR handles on end keyframes: Blender computes them toward
                # the neighbour so handle.x ≠ co.x → no ZeroDivisionError.
                fc.keyframe_points[0].handle_left_type   = 'VECTOR'
                fc.keyframe_points[-1].handle_right_type = 'VECTOR'
                fc.update()
                fcurve = fc
            else:
                # Filler axes: BEZIER with FREE handles explicitly offset so
                # handle.x ≠ co.x on both keyframes.
                fc.keyframe_points.add(count=2)
                kp0, kp1 = fc.keyframe_points[0], fc.keyframe_points[1]
                kp0.co = (0.0, 0.0)
                kp1.co = (period, 0.0)
                kp0.interpolation = kp1.interpolation = 'BEZIER'
                third = period / 3
                kp0.handle_left_type  = kp0.handle_right_type = 'FREE'
                kp0.handle_left   = (-third, 0.0)
                kp0.handle_right  = ( third, 0.0)
                kp1.handle_left_type  = kp1.handle_right_type = 'FREE'
                kp1.handle_left   = (period - third, 0.0)
                kp1.handle_right  = (period + third, 0.0)
        scene = bpy.context.scene
        scene.frame_start = 0
        scene.frame_end = int(period)
        # Tag the mesh as VEGETATION so detect_fo4_object_class() in
        # export_helpers does not mis-classify it as CREATURE because of the
        # Wind armature.  The armature itself is for authoring / preview only
        # and will NOT be exported — the NIF exporter reads the Wind vertex
        # group weights directly.
        mesh_obj["fo4_object_type"] = "VEGETATION"
        return True, "Wind animation armature created"

    @staticmethod
    def start_wind_preview(speed: float = 0.05, axis: str = 'X'):
        """Begin a simple live rotation of any Wind bones on frame change.

        This gives instant feedback without playing the timeline. Call
        ``stop_wind_preview()`` to remove the handler.
        """
        global _wind_preview_handler
        if _wind_preview_handler is not None:
            return False, "Preview already running"
        def _handler(scene):
            import math
            for obj in scene.objects:
                if obj.type == 'ARMATURE' and 'Wind' in obj.pose.bones:
                    bone = obj.pose.bones['Wind']
                    idx = {'X':0,'Y':1,'Z':2}.get(axis.upper(),0)
                    # Bounded oscillation.  The old code did '+= speed' every
                    # frame, so the rotation accumulated without limit and wound
                    # the weighted mesh into shards.  Set an absolute, small sway
                    # derived from the current frame instead (never accumulates).
                    bone.rotation_euler[idx] = math.sin(scene.frame_current * speed) * 0.12
        _handler._mossy_wind_preview = True
        bpy.app.handlers.frame_change_post.append(_handler)
        _wind_preview_handler = _handler
        return True, "Wind preview started"

    @staticmethod
    def stop_wind_preview():
        """Stop the live wind preview handler."""
        global _wind_preview_handler
        if _wind_preview_handler and _wind_preview_handler in bpy.app.handlers.frame_change_post:
            bpy.app.handlers.frame_change_post.remove(_wind_preview_handler)
            _wind_preview_handler = None
            return True, "Wind preview stopped"
        return False, "No wind preview running"

    @staticmethod
    def weld_wind_seams(mesh_obj, epsilon=0.001):
        """Weld only the specific unwelded near-duplicate vertex pairs
        `_find_unwelded_near_duplicates` finds -- NOT a blanket "select all,
        Merge by Distance" over the whole mesh.

        A whole-mesh merge is risky on dense foliage: it can weld unrelated
        close-together vertices that were never meant to be joined (e.g.
        opposite sides of a thin leaf blade thinner than the merge
        threshold), collapsing them into degenerate slivers -- confirmed
        live: this produced worse smeared/stretched texture artifacts, not a
        fix. Restricting the merge to just the flagged vertex indices (via
        `bmesh.ops.remove_doubles(..., verts=[...])`) can't touch anything
        outside that set.

        Returns ``(welded_pair_count: int, message: str)``.
        """
        import bmesh as _bmesh

        if mesh_obj.type != 'MESH':
            return 0, "Object is not a mesh"
        if bpy.context.object == mesh_obj and bpy.context.mode == 'EDIT_MESH':
            bpy.ops.object.mode_set(mode='OBJECT')

        pairs = _find_unwelded_near_duplicates(mesh_obj, epsilon)
        if not pairs:
            return 0, "No unwelded near-duplicate vertices found"

        flagged_indices = sorted({i for pair in pairs for i in pair})

        me = mesh_obj.data
        bm = _bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        target_verts = [bm.verts[i] for i in flagged_indices]
        before_count = len(bm.verts)
        _bmesh.ops.remove_doubles(bm, verts=target_verts, dist=epsilon)
        merged = before_count - len(bm.verts)
        bm.to_mesh(me)
        bm.free()
        me.update()

        return merged, f"Welded {merged} vertex(es) at {len(pairs)} flagged seam pair(s)"

    @staticmethod
    def test_wind_deformation(mesh_obj, test_angle_deg: float = 15.0, stretch_threshold: float = 0.3):
        """Physically test that *mesh_obj*'s wind setup won't visibly tear.

        Poses the mesh's Wind bone (creating a temporary one if none exists),
        evaluates the deformed mesh, and flags any edge whose length changes
        by more than *stretch_threshold* (30% by default) under the bend --
        the direct symptom of a piece visually separating from the rest of
        the mesh in-game because part of it has stale/missing wind weights
        relative to its neighbours (e.g. new geometry joined on after the
        original wind setup, see scan_wind_readiness's coverage/staleness
        checks for the same root cause detected without a simulation).

        Non-destructive: any temporary armature/modifier created for the
        test is removed afterward, and the Wind bone's pose is restored.

        Returns ``(passed: bool, issues: list[str], flagged_vertex_indices: set[int])``.
        On failure, the flagged vertices are also written into a
        "WindTestFailures" vertex group so they can be selected/inspected in
        Weight Paint mode.
        """
        import math

        if mesh_obj.type != 'MESH':
            return False, ["Object is not a mesh"], set()

        _ready, issues, _info = AnimationHelpers.scan_wind_readiness(mesh_obj)
        issues = list(issues)

        me = mesh_obj.data
        if not me.vertices or not me.edges:
            return (len(issues) == 0), issues, set()

        original_positions = [mesh_obj.matrix_world @ v.co for v in me.vertices]

        # Find the armature already deforming this mesh via a "Wind" bone.
        arm_obj = None
        for mod in mesh_obj.modifiers:
            if mod.type == 'ARMATURE' and mod.object and mod.object.type == 'ARMATURE':
                if "Wind" in mod.object.data.bones:
                    arm_obj = mod.object
                    break
        if arm_obj is None and mesh_obj.parent and mesh_obj.parent.type == 'ARMATURE':
            if "Wind" in mesh_obj.parent.data.bones:
                arm_obj = mesh_obj.parent

        created_temp_rig = False
        prev_parent = mesh_obj.parent
        temp_mod_name = None

        if arm_obj is None:
            # No wind rig yet -- build a temporary one purely for this test
            # (same construction as apply_wind_animation's bone creation).
            arm = bpy.data.armatures.new("_WindTest_Arm")
            arm_obj = bpy.data.objects.new("_WindTest_ArmObj", arm)
            bpy.context.collection.objects.link(arm_obj)
            bpy.context.view_layer.objects.active = arm_obj
            bpy.ops.object.mode_set(mode='EDIT')
            bone = arm.edit_bones.new("Wind")
            bone.head = mesh_obj.location
            bone.tail = mesh_obj.location + Vector((0.0, 0.0, 0.1))
            bpy.ops.object.mode_set(mode='OBJECT')
            mesh_obj.parent = arm_obj
            wm = mesh_obj.modifiers.new(name="_WindTestArmature", type='ARMATURE')
            wm.object = arm_obj
            temp_mod_name = wm.name
            created_temp_rig = True

        pose_bone = arm_obj.pose.bones.get("Wind") if arm_obj.pose else None
        if pose_bone is None:
            issues.append("Wind armature has no 'Wind' pose bone")
            if created_temp_rig:
                mesh_obj.modifiers.remove(mesh_obj.modifiers[temp_mod_name])
                mesh_obj.parent = prev_parent
                bpy.data.objects.remove(arm_obj, do_unlink=True)
            return False, issues, set()

        prev_rotation = pose_bone.rotation_euler.copy()
        pose_bone.rotation_euler = (math.radians(test_angle_deg), 0.0, 0.0)

        depsgraph = bpy.context.evaluated_depsgraph_get()
        eval_obj = mesh_obj.evaluated_get(depsgraph)
        eval_mesh = eval_obj.to_mesh()
        deformed_positions = [eval_obj.matrix_world @ v.co for v in eval_mesh.vertices]
        eval_obj.to_mesh_clear()

        flagged = set()
        if len(deformed_positions) == len(original_positions):
            for e in me.edges:
                v1, v2 = e.vertices
                orig_len = (original_positions[v1] - original_positions[v2]).length
                new_len = (deformed_positions[v1] - deformed_positions[v2]).length
                if orig_len < 1e-6:
                    continue
                change = abs(new_len - orig_len) / orig_len
                if change > stretch_threshold:
                    flagged.add(v1)
                    flagged.add(v2)
        else:
            issues.append(
                "Evaluated mesh vertex count changed under deformation -- "
                "cannot compare edges"
            )

        # Restore pose, then tear down the temporary rig if one was created.
        pose_bone.rotation_euler = prev_rotation
        if created_temp_rig:
            mod = mesh_obj.modifiers.get(temp_mod_name)
            if mod:
                mesh_obj.modifiers.remove(mod)
            mesh_obj.parent = prev_parent
            bpy.data.objects.remove(arm_obj, do_unlink=True)

        if flagged:
            issues.append(
                f"{len(flagged)} vertex(es) stretch by more than "
                f"{int(stretch_threshold * 100)}% under a {test_angle_deg:.0f}° "
                "wind bend -- likely a seam between old and newly-added "
                "geometry with inconsistent wind weights"
            )
            vg = mesh_obj.vertex_groups.get("WindTestFailures")
            if vg is not None:
                mesh_obj.vertex_groups.remove(vg)
            vg = mesh_obj.vertex_groups.new(name="WindTestFailures")
            vg.add(list(flagged), 1.0, 'REPLACE')

        return (len(issues) == 0), issues, flagged

    @staticmethod
    def apply_emittance_pulse(
        obj,
        min_strength: float = 0.5,
        max_strength: float = 3.0,
        period: float = 60.0,
        noise_scale: float = 0.5,
    ):
        """Animate the Emission Strength of *obj*'s active material to create a
        realistic organic pulse (simulating the FO4 NifSkope
        ``BSLightingShaderProperty Float Controller / NiFloatInterpolator``).

        The animation uses a NOISE fcurve modifier so the brightness varies
        smoothly and irregularly – far more convincing than a sine wave.

        The Blender ``emission_strength`` value is mapped between
        ``min_strength`` (dark phase) and ``max_strength`` (bright phase).
        Keyframes are placed at frames 0 and ``period``; after export the NIF
        must have a ``BSLightingShaderPropertyFloatController`` added in
        NifSkope that targets ``EMISSIVE_MULTIPLE`` using keyframe data
        exported from this action.

        Parameters
        ----------
        obj          – mesh object whose active material will be animated
        min_strength – emission strength at the darkest pulse point (≥ 0)
        max_strength – emission strength at the brightest pulse point
        period       – animation loop length in frames (scene end is set to this)
        noise_scale  – controls how fast the noise changes; 0.3–0.8 feels organic

        Returns (success: bool, message: str)
        """
        if obj is None or obj.type != 'MESH':
            return False, "Object is not a mesh"

        # Ensure the active material exists and has nodes.
        mat = None
        if obj.data.materials:
            mat = obj.data.materials[obj.active_material_index]
        if mat is None:
            return False, "No material on the active slot"

        mat.use_nodes = True
        pbsdf = next(
            (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'),
            None,
        )
        if pbsdf is None:
            return False, "Material has no Principled BSDF node"

        # Ensure the material has animation data.
        if mat.animation_data is None:
            mat.animation_data_create()

        action_name = f"{mat.name}_GlowPulse"
        # Remove any existing pulse action so re-running is idempotent.
        if action_name in bpy.data.actions:
            bpy.data.actions.remove(bpy.data.actions[action_name])

        action = bpy.data.actions.new(name=action_name)
        # Use the compat helper so Blender 4.4+ slot binding works for
        # material animation data (same as armature animation data above).
        _assign_action_to_id(mat.animation_data, action)

        # Mid-point between min and max; the NOISE modifier will oscillate around it.
        mid = (min_strength + max_strength) / 2.0
        amplitude = (max_strength - min_strength) / 2.0

        # data_path for Emission Strength on the Principled BSDF node.
        node_path = f'nodes["{pbsdf.name}"].inputs["Emission Strength"].default_value'
        fcurves = _get_action_fcurves(action)
        fcurve = fcurves.new(data_path=node_path, index=0)
        fcurve.keyframe_points.add(count=2)
        fcurve.keyframe_points[0].co = (0.0, mid)
        fcurve.keyframe_points[1].co = (period, mid)
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'LINEAR'

        noise_mod = fcurve.modifiers.new(type='NOISE')
        noise_mod.strength = amplitude
        noise_mod.scale = period * noise_scale
        noise_mod.phase = 0.0
        noise_mod.depth = 2

        # Set scene frame range.
        bpy.context.scene.frame_start = 0
        bpy.context.scene.frame_end = int(period)

        # Tag the material so export scripts know this uses a pulse controller.
        mat["fo4_emittance_pulse"] = True
        mat["fo4_emittance_pulse_min"] = min_strength
        mat["fo4_emittance_pulse_max"] = max_strength
        mat["fo4_emittance_pulse_period"] = period

        return True, (
            f"Emittance pulse applied to '{mat.name}' "
            f"(min={min_strength:.1f}, max={max_strength:.1f}, period={int(period)} frames). "
            "Add a BSLightingShaderPropertyFloatController in NifSkope targeting "
            "EMISSIVE_MULTIPLE to reproduce this in-game."
        )

    @staticmethod
    def remove_emittance_pulse(obj):
        """Remove the pulsing emittance animation from *obj*'s active material.

        Clears the ``_GlowPulse`` action and resets the Emission Strength
        socket to its non-animated default value.

        Returns (success: bool, message: str)
        """
        if obj is None or obj.type != 'MESH':
            return False, "Object is not a mesh"

        mat = None
        if obj.data.materials:
            mat = obj.data.materials[obj.active_material_index]
        if mat is None:
            return False, "No material on the active slot"

        removed = False
        action_name = f"{mat.name}_GlowPulse"
        if action_name in bpy.data.actions:
            bpy.data.actions.remove(bpy.data.actions[action_name])
            removed = True

        if mat.animation_data and mat.animation_data.action is None:
            # If the removed action was the only one, clear animation data.
            pass

        # Reset Emission Strength to the stored min (non-animated state).
        pbsdf = next(
            (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'),
            None,
        ) if mat.use_nodes else None
        default_strength = mat.get("fo4_emittance_pulse_min", 1.0)
        if pbsdf and pbsdf.inputs.get("Emission Strength"):
            pbsdf.inputs["Emission Strength"].default_value = default_strength

        for key in ("fo4_emittance_pulse", "fo4_emittance_pulse_min",
                    "fo4_emittance_pulse_max", "fo4_emittance_pulse_period"):
            mat.pop(key, None)

        if removed:
            return True, f"Emittance pulse removed from '{mat.name}'"
        return False, f"No GlowPulse action found for '{mat.name}'"


def register():
    pass


def unregister():
    pass


def _fo4_post_process(obj, target_polys: int = 1000):
    """Placeholder — reserved for post-processing steps (decimation, cleanup).
    Not yet implemented; retained to avoid import errors from callers."""
    pass