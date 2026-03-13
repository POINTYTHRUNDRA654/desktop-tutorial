"""
Export helper functions for Fallout 4 mod creation
"""

import bpy
import os
import json
import sys
import traceback

# ---------------------------------------------------------------------------
# NIF game profiles
# ---------------------------------------------------------------------------
# Per-game NIF version numbers and export settings for every game supported
# by Niftools v0.1.1.  These drive both the scene-level ``niftools_scene``
# property group and the export-operator kwargs so that any game produces a
# well-formed NIF without manual configuration.
#
# Field reference
# ---------------
# aliases               – alternative enum spellings tried when setting ns.game
# nif_version           – NIF file format version string
# user_version          – studio / engine version (stored in NIF header)
# user_version_2        – BS header version (stored in NIF header)
# use_tangent_space     – emit tangent/bitangent vectors (required for
#                         BSLightingShaderProperty normal maps)
# scale_correction      – Blender units → NIF units multiplier
# skin_partition        – whether to build NiSkinPartition / BSSkinInstance
# max_bones_per_partition – maximum bones in a single skin partition
# max_bones_per_vertex  – maximum bone influences per vertex
# ---------------------------------------------------------------------------
_NIF_GAME_PROFILES = {
    "MORROWIND": {
        # TES3: The Elder Scrolls III – Morrowind
        "aliases":                  ["MORROWIND", "Morrowind", "morrowind"],
        "nif_version":              "4.0.0.2",
        "user_version":             0,
        "user_version_2":           0,
        "use_tangent_space":        False,
        "scale_correction":         1.0,
        "skin_partition":           False,
        "max_bones_per_partition":  4,
        "max_bones_per_vertex":     4,
    },
    "OBLIVION": {
        # TES4: The Elder Scrolls IV – Oblivion
        # nif.xml: V20_0_0_5_OBL  user=11  bsver=11
        "aliases":                  ["OBLIVION", "Oblivion", "oblivion"],
        "nif_version":              "20.0.0.5",
        "user_version":             11,
        "user_version_2":           11,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           True,
        "max_bones_per_partition":  18,
        "max_bones_per_vertex":     4,
    },
    "FALLOUT_3": {
        # FO3: Fallout 3
        "aliases":                  ["FALLOUT_3", "Fallout 3", "fallout_3"],
        "nif_version":              "20.2.0.7",
        "user_version":             11,
        "user_version_2":           34,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           True,
        "max_bones_per_partition":  18,
        "max_bones_per_vertex":     4,
    },
    "FALLOUT_NV": {
        # FONV: Fallout: New Vegas
        "aliases":                  ["FALLOUT_NV", "Fallout: New Vegas", "fallout_nv"],
        "nif_version":              "20.2.0.7",
        "user_version":             11,
        "user_version_2":           34,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           True,
        "max_bones_per_partition":  18,
        "max_bones_per_vertex":     4,
    },
    "SKYRIM": {
        # TES5: The Elder Scrolls V – Skyrim (original / Legendary Edition)
        "aliases":                  ["SKYRIM", "Skyrim", "skyrim"],
        "nif_version":              "20.2.0.7",
        "user_version":             12,
        "user_version_2":           83,
        "use_tangent_space":        True,
        "scale_correction":         0.1,
        "skin_partition":           True,
        "max_bones_per_partition":  24,
        "max_bones_per_vertex":     4,
    },
    "SKYRIM_SE": {
        # TES5SE: The Elder Scrolls V – Skyrim Special Edition
        "aliases":                  ["SKYRIM_SE", "Skyrim SE", "SKYRIM SE", "skyrim_se"],
        "nif_version":              "20.2.0.7",
        "user_version":             12,
        "user_version_2":           100,
        "use_tangent_space":        True,
        "scale_correction":         0.1,
        "skin_partition":           True,
        "max_bones_per_partition":  80,
        "max_bones_per_vertex":     8,
    },
    "FALLOUT_4": {
        # FO4 OG: Fallout 4 – original 2015 release.
        # nif.xml: V20_2_0_7_FO4  user=12  bsver=130
        # FO4 uses BSTriShape / BSSubIndexTriShape; old-style NiSkinPartition
        # is not used, so skin_partition is False.
        # NOTE: niftools v0.1.1 is the version that first exposed full FO4
        # export support.  These version numbers are verified against the
        # authoritative niftools/nifxml nif.xml master specification.
        "aliases":                  ["FALLOUT_4", "Fallout 4", "FALLOUT4", "fallout_4"],
        "nif_version":              "20.2.0.7",
        "user_version":             12,
        "user_version_2":           130,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           False,
        "max_bones_per_partition":  4,
        "max_bones_per_vertex":     4,
    },
    "FALLOUT_4_NG": {
        # FO4 NG: Fallout 4 – Next Gen update (April 25 2024).
        # Standard game assets continue to use bsver=130; new content added
        # by the NG update can use bsver 131–134.  Export targets 130 so
        # that generated NIFs load on both pre-NG and post-NG installations.
        # nif.xml ref: V20_2_0_7_FO4  user=12  bsver=130
        "aliases":                  ["FALLOUT_4_NG", "Fallout 4 NG", "fallout_4_ng", "FO4NG"],
        "nif_version":              "20.2.0.7",
        "user_version":             12,
        "user_version_2":           130,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           False,
        "max_bones_per_partition":  4,
        "max_bones_per_vertex":     4,
    },
    "FALLOUT_4_AE": {
        # FO4 AE: Fallout 4 – Anniversary Edition (November 10 2025).
        # Built on the NG engine; no bsver change from the NG update was
        # reported.  Includes all six DLCs + 150+ Creation Club items and
        # introduces the revamped "Creations" system.
        # nif.xml ref: V20_2_0_7_FO4  user=12  bsver=130
        "aliases":                  ["FALLOUT_4_AE", "Fallout 4 AE", "fallout_4_ae", "FO4AE"],
        "nif_version":              "20.2.0.7",
        "user_version":             12,
        "user_version_2":           130,
        "use_tangent_space":        True,
        "scale_correction":         1.0,
        "skin_partition":           False,
        "max_bones_per_partition":  4,
        "max_bones_per_vertex":     4,
    },
}

# Reverse lookup: any alias string → canonical profile key.
_NIF_GAME_ALIAS_MAP = {
    alias: key
    for key, profile in _NIF_GAME_PROFILES.items()
    for alias in profile["aliases"]
}

# ---------------------------------------------------------------------------
# Collision NIF post-processing tables
# ---------------------------------------------------------------------------
# These tables drive both the pre-export Niftools property assignment
# (_apply_collision_nif_properties) and the post-export pyffi NIF patch
# (_postprocess_nif_set_collision).
#
# Every value here maps directly to a pyffi / Niftools enum identifier.
#
# havok_material      – Fallout4HavokMaterial enum → in-game collision sound
#                       and surface interaction (footstep sounds, decal
#                       placement, …).  FO4 uses the Fallout4HavokMaterial
#                       enum (FO4_HAV_MAT_* values); the Skyrim equivalents
#                       (SKY_HAV_MAT_*) are kept as fallbacks for older pyffi
#                       builds where Fallout4HavokMaterial is not defined.
# layer               – Fallout4Layer enum → collision filter group; controls
#                       which objects this mesh can interact with.  FO4 uses
#                       FOL_* values; SKYL_* values are fallbacks.
# motion_system       – MotionSystem enum → how the rigid body moves
#                       MO_SYS_BOX_STABILIZED = inertia-stabilised static
#                       MO_SYS_SPHERE_STABILIZED = creatures / dynamic bodies
# quality_type        – MotionQuality enum → simulation fidelity hint
# bsxflags            – BSXFlags integer bitmask written to the root NiNode
#                       bit 0 (1)  = Animated
#                       bit 1 (2)  = Has Havok collision  ← must be set
#                       bit 2 (4)  = Has Ragdoll
#                       bit 3 (8)  = Complex Havok (bhkMoppBvTreeShape)
# friction            – Blender rigid-body friction  → bhkRigidBody.friction
# restitution         – Blender rigid-body restitution → bhkRigidBody.restitution
# ---------------------------------------------------------------------------
_COLLISION_NIF_POSTPROCESS = {
    # (collision_type): {property: value, ...}
    'DEFAULT': {
        'havok_material': 'FO4_HAV_MAT_STONE',
        'havok_material_fallback': 'SKY_HAV_MAT_STONE',
        'layer':          'FOL_STATIC',
        'layer_fallback': 'SKYL_STATIC',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.8,
        'restitution':    0.1,
    },
    'ROCK': {
        'havok_material': 'FO4_HAV_MAT_STONE',
        'havok_material_fallback': 'SKY_HAV_MAT_STONE',
        'layer':          'FOL_STATIC',
        'layer_fallback': 'SKYL_STATIC',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.9,
        'restitution':    0.05,
    },
    'TREE': {
        'havok_material': 'FO4_HAV_MAT_WOOD',
        'havok_material_fallback': 'SKY_HAV_MAT_WOOD',
        'layer':          'FOL_TREES',
        'layer_fallback': 'SKYL_TREES',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.7,
        'restitution':    0.2,
    },
    'BUILDING': {
        'havok_material': 'FO4_HAV_MAT_STONE',
        'havok_material_fallback': 'SKY_HAV_MAT_STONE',
        'layer':          'FOL_STATIC',
        'layer_fallback': 'SKYL_STATIC',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.9,
        'restitution':    0.05,
    },
    'GRASS': {
        # GRASS and MUSHROOM skip collision generation but if a mesh arrives
        # here it gets minimal static settings.
        'havok_material': 'FO4_HAV_MAT_GRASS',
        'havok_material_fallback': 'SKY_HAV_MAT_GRASS',
        'layer':          'FOL_STATIC',
        'layer_fallback': 'SKYL_STATIC',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.5,
        'restitution':    0.05,
    },
    'MUSHROOM': {
        'havok_material': 'FO4_HAV_MAT_ORGANIC',
        'havok_material_fallback': 'SKY_HAV_MAT_ORGANIC',
        'layer':          'FOL_STATIC',
        'layer_fallback': 'SKYL_STATIC',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_FIXED',
        'bsxflags':       2,
        'friction':       0.5,
        'restitution':    0.1,
    },
    'CREATURE': {
        # Dynamic / ragdoll body – sphere-stabilised, ragdoll-flagged.
        'havok_material': 'FO4_HAV_MAT_SKIN',
        'havok_material_fallback': 'SKY_HAV_MAT_SKIN',
        'layer':          'FOL_BIPED',
        'layer_fallback': 'SKYL_BIPED',
        'motion_system':  'MO_SYS_SPHERE_STABILIZED',
        'quality_type':   'MO_QUAL_MOVING',
        'bsxflags':       6,   # bit 1 (Has Havok) + bit 2 (Has Ragdoll)
        'friction':       0.5,
        'restitution':    0.2,
    },
    'NONE': {
        'havok_material': 'FO4_HAV_MAT_STONE',
        'havok_material_fallback': 'SKY_HAV_MAT_STONE',
        'layer':          'FOL_UNIDENTIFIED',
        'layer_fallback': 'SKYL_UNIDENTIFIED',
        'motion_system':  'MO_SYS_BOX_STABILIZED',
        'quality_type':   'MO_QUAL_INVALID',
        'bsxflags':       0,
        'friction':       0.5,
        'restitution':    0.1,
    },
}


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
    def _apply_collision_nif_properties(collision_obj, collision_type):
        """Set Niftools/Blender collision properties on *collision_obj* before export.

        This is the **pre-export** half of the two-phase collision pipeline.
        It configures every Blender and Niftools property that the NIF export
        operator reads, so that Niftools emits a ``bhkNPCollisionObject`` /
        ``bhkRigidBody`` with the correct havok material, collision layer,
        motion system, and quality type for the given ``collision_type``.

        The **post-export** half (``_postprocess_nif_set_collision``) then
        opens the written NIF with pyffi and patches any fields that Niftools
        could not set through its operator interface alone.

        Parameters
        ----------
        collision_obj : bpy.types.Object
            The UCX_ collision object that will be exported.
        collision_type : str
            One of the MeshHelpers.COLLISION_TYPES keys.
        """
        if collision_obj is None:
            return

        props = _COLLISION_NIF_POSTPROCESS.get(
            collision_type,
            _COLLISION_NIF_POSTPROCESS['DEFAULT'],
        )

        # ── 1. Blender rigid-body physics ──────────────────────────────────
        # Niftools reads these to populate bhkRigidBody mass / friction /
        # restitution.  We also enforce CONVEX_HULL shape and PASSIVE type
        # so Niftools emits the correct motion-system flags.
        rb = getattr(collision_obj, 'rigid_body', None)
        if rb is not None:
            rb.mass        = 0.0  # FO4 static – non-zero mass breaks PASSIVE body
            rb.friction    = props['friction']
            rb.restitution = props['restitution']
            rb.collision_shape = 'CONVEX_HULL'
            rb.type = 'ACTIVE' if collision_type == 'CREATURE' else 'PASSIVE'

        # ── 2. niftools_collision property group ────────────────────────────
        # Available when Niftools v0.1.1 is installed.  Drives havokMaterial,
        # collision layer, motionSystem, and qualityType inside bhkRigidBody /
        # bhkNPCollisionObject.
        nc = getattr(collision_obj, 'niftools_collision', None)
        if nc is not None:
            # For havok_material use the FO4-specific value first; fall back to
            # the Skyrim-compatible name for older Niftools / pyffi builds.
            mat_primary  = props['havok_material']
            mat_fallback = props.get('havok_material_fallback', mat_primary)
            for mat_val in (mat_primary, mat_fallback):
                for mat_attr in ('havok_material', 'havokMaterial'):
                    try:
                        setattr(nc, mat_attr, mat_val)
                        if getattr(nc, mat_attr, None) == mat_val:
                            break
                    except (TypeError, AttributeError):
                        continue
                else:
                    continue
                break

            # For the collision layer use the FO4-specific FOL_* value first
            # ('fallout_layer' attribute), then try Skyrim-compatible SKYL_*
            # values on 'skyrim_layer' / 'oblivion_layer' for older builds.
            layer_primary  = props['layer']
            layer_fallback = props.get('layer_fallback', layer_primary)
            layer_set = False
            for layer_attr, layer_val in (
                ('fallout_layer', layer_primary),
                ('skyrim_layer',  layer_fallback),
                ('oblivion_layer', layer_fallback),
            ):
                try:
                    setattr(nc, layer_attr, layer_val)
                    if getattr(nc, layer_attr, None) == layer_val:
                        layer_set = True
                        break
                except (TypeError, AttributeError):
                    continue

            motion = props['motion_system']
            qual   = props['quality_type']
            for attr, val in (('motion_system', motion), ('quality_type', qual)):
                try:
                    setattr(nc, attr, val)
                except (TypeError, AttributeError):
                    pass

        # ── 3. BSXFlags on the collision object itself ──────────────────────
        # Tells the FO4 engine that this NIF node carries Havok collision.
        # Set on collision_obj; the source mesh gets its BSXFlags set by the
        # post-processor after the full NIF is written.
        nt = getattr(collision_obj, 'niftools', None)
        if nt is not None:
            for flag_attr in ('bsxflags', 'bs_xflags', 'objectflags'):
                try:
                    setattr(nt, flag_attr, props['bsxflags'])
                    break
                except (TypeError, AttributeError):
                    continue

    @staticmethod
    def _postprocess_nif_set_collision(filepath, collision_type):
        """Post-process a written NIF to inject FO4 Havok/collision settings.

        This is the **post-export** half of the two-phase collision pipeline.

        After Niftools writes the NIF file this method re-opens it with pyffi
        (the same library Niftools itself uses) and patches every collision
        block with the correct FO4 values.  This guarantees that the NIF
        works in-game regardless of which Niftools build or scene settings
        were used during export.

        Blocks patched
        --------------
        ``BSXFlags``
            Sets bit 1 (value 2) = "Has Havok" on every BSXFlags block so
            the Fallout 4 engine recognises the NIF as a collision-carrying
            asset.  Without this flag the engine completely ignores any
            ``bhkNPCollisionObject`` or ``bhkRigidBody`` in the file.

        ``bhkRigidBody`` / ``bhkRigidBodyT``  (Niftools-style output)
            · ``havok_material.material`` → surface sound / interaction
            · ``havok_filter.layer``      → collision filter group
            · ``motion_system``           → how the body moves
            · ``quality_type``            → simulation fidelity

        ``bhkNPCollisionObject``  (FO4 New Physics blocks, if present)
            Sets ``flags = 1`` (BHKCO_ACTIVE) so the engine treats the
            collision object as active.

        Extension point for animation
        -----------------------------
        The same pyffi infrastructure can be extended to inject animation
        properties (``NiControllerManager`` sequencer paths, animated
        ``BSXFlags`` bits, ``bhkPhysicsSystem`` HKX references) by adding
        another helper that calls ``_open_nif_with_pyffi`` and walks
        ``NiControllerManager`` / ``NiControllerSequence`` blocks.

        Parameters
        ----------
        filepath : str
            Absolute path to the NIF file that was just written.
        collision_type : str
            One of the MeshHelpers.COLLISION_TYPES keys.
        """
        props = _COLLISION_NIF_POSTPROCESS.get(
            collision_type,
            _COLLISION_NIF_POSTPROCESS['DEFAULT'],
        )

        # ── Locate pyffi ────────────────────────────────────────────────────
        # Niftools installs pyffi as a dependency; try the standard import
        # path first, then the path Niftools bundles inside its own package.
        NifFormat = None
        for _pyffi_path in (
            'pyffi.formats.nif',
            'io_scene_niftools.dependencies.pyffi.formats.nif',
        ):
            try:
                import importlib
                _mod = importlib.import_module(_pyffi_path)
                NifFormat = _mod.NifFormat
                break
            except (ImportError, AttributeError):
                continue

        if NifFormat is None:
            # pyffi not available – skip post-processing gracefully.
            print(
                "[FO4 Add-on] _postprocess_nif_set_collision: pyffi not found; "
                "collision properties will rely on pre-export Niftools settings only."
            )
            return

        # ── Read NIF ────────────────────────────────────────────────────────
        try:
            data = NifFormat.Data()
            with open(filepath, 'rb') as fh:
                data.read(fh)
        except Exception as exc:
            print(f"[FO4 Add-on] _postprocess_nif_set_collision: could not read "
                  f"'{filepath}': {exc}")
            return

        # ── Helper: safely set an enum attribute by name ────────────────────
        def _set_enum(block, attr, enum_class_name, value_name):
            """Set block.attr to the named enum value; no-op on any error."""
            try:
                enum_cls = getattr(NifFormat, enum_class_name, None)
                if enum_cls is None:
                    return
                val = getattr(enum_cls, value_name, None)
                if val is None:
                    return
                setattr(block, attr, val)
            except Exception:
                pass

        # ── Patch blocks ─────────────────────────────────────────────────────
        modified = False

        # Primary (FO4-specific) and fallback (Skyrim-compatible) names.
        mat_name         = props['havok_material']
        mat_name_fallback= props.get('havok_material_fallback', mat_name)
        layer_name       = props['layer']
        layer_name_fallback = props.get('layer_fallback', layer_name)
        motion_name = props['motion_system']
        qual_name   = props['quality_type']
        bsxflags    = props['bsxflags']

        def _set_enum_fo4(block, attr, fo4_cls, fo4_val, sky_cls, sky_val):
            """Try FO4 enum class first, then Skyrim enum class as fallback."""
            for cls_name, val_name in ((fo4_cls, fo4_val), (sky_cls, sky_val)):
                try:
                    enum_cls = getattr(NifFormat, cls_name, None)
                    if enum_cls is None:
                        continue
                    val = getattr(enum_cls, val_name, None)
                    if val is None:
                        continue
                    setattr(block, attr, val)
                    return True
                except Exception:
                    continue
            return False

        for block in data.blocks:

            # BSXFlags ──────────────────────────────────────────────────────
            # Must have bit 1 set (= 2, "Has Havok") or the FO4 engine ignores
            # the entire bhkNPCollisionObject / bhkRigidBody subtree.
            if isinstance(block, NifFormat.BSXFlags):
                try:
                    # Preserve any existing flags (e.g. Animated bit) and OR
                    # in the required collision bits for this type.
                    block.integer_data = int(block.integer_data) | bsxflags
                    modified = True
                except Exception:
                    pass

            # bhkRigidBody / bhkRigidBodyT ──────────────────────────────────
            # Niftools v0.1.1 produces these for both Skyrim and FO4 exports.
            # For true FO4 New Physics the game additionally needs
            # bhkNPCollisionObject + bhkPhysicsSystem (handled below), but
            # setting these fields ensures at minimum that Skyrim-compatible
            # collision works while a Cathedral Assets Optimizer pass converts
            # to full NP physics.
            elif isinstance(block, NifFormat.bhkRigidBody) or (
                    hasattr(NifFormat, 'bhkRigidBodyT')
                    and isinstance(block, NifFormat.bhkRigidBodyT)):
                # havokMaterial — try Fallout4HavokMaterial first, then
                # SkyrimHavokMaterial for older pyffi builds.
                for hm_attr in ('havok_material', 'havokMaterial'):
                    hm = getattr(block, hm_attr, None)
                    if hm is None:
                        continue
                    # The material sub-struct may expose .material or be the
                    # enum directly (varies by pyffi version).
                    if hasattr(hm, 'material'):
                        _set_enum_fo4(hm, 'material',
                                      'Fallout4HavokMaterial', mat_name,
                                      'SkyrimHavokMaterial', mat_name_fallback)
                        modified = True
                        break
                    else:
                        _set_enum_fo4(block, hm_attr,
                                      'Fallout4HavokMaterial', mat_name,
                                      'SkyrimHavokMaterial', mat_name_fallback)
                        modified = True
                        break

                # collision layer — try Fallout4Layer (FOL_*) first, then
                # SkyrimLayer (SKYL_*) for older pyffi builds.
                hf = getattr(block, 'havok_filter', None)
                if hf is not None and hasattr(hf, 'layer'):
                    _set_enum_fo4(hf, 'layer',
                                  'Fallout4Layer', layer_name,
                                  'SkyrimLayer', layer_name_fallback)
                    modified = True
                else:
                    for l_attr in ('layer', 'fallout_layer', 'oblivion_layer'):
                        if hasattr(block, l_attr):
                            _set_enum_fo4(block, l_attr,
                                          'Fallout4Layer', layer_name,
                                          'SkyrimLayer', layer_name_fallback)
                            modified = True
                            break

                # motionSystem
                _set_enum(block, 'motion_system', 'MotionSystem', motion_name)
                # qualityType
                _set_enum(block, 'quality_type', 'MotionQuality', qual_name)
                modified = True

            # bhkNPCollisionObject ──────────────────────────────────────────
            # FO4 "New Physics" collision object.  Set flags = BHKCO_ACTIVE (1)
            # so the engine activates the collision shape.
            elif type(block).__name__ == 'bhkNPCollisionObject':
                try:
                    block.flags = 1   # BHKCO_ACTIVE
                    modified = True
                except Exception:
                    pass

        # ── Write NIF back ───────────────────────────────────────────────────
        if modified:
            try:
                with open(filepath, 'wb') as fh:
                    data.write(fh)
            except Exception as exc:
                print(f"[FO4 Add-on] _postprocess_nif_set_collision: could not "
                      f"write '{filepath}': {exc}")

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
        """Check if the Niftools exporter operator is registered."""
        blender_version = bpy.app.version
        version_str = f"{blender_version[0]}.{blender_version[1]}"
        export_scene = getattr(bpy.ops, "export_scene", None)
        if not export_scene:
            return False, f"bpy.ops.export_scene missing (Blender {version_str})"

        if not hasattr(export_scene, "nif"):
            if blender_version >= (5, 0, 0):
                return False, (
                    "Niftools v0.1.1 is not compatible with Blender 5.x. "
                    "Use Blender 3.6 LTS for NIF export, or export FBX and "
                    "convert with Cathedral Assets Optimizer."
                )
            if blender_version >= (4, 0, 0):
                return False, "Niftools exporter not registered; official v0.1.1 targets Blender ≤3.6. Install a 4.x-compatible fork or use 3.6 for export."
            return False, "Niftools exporter not registered"

        # Exporter IS registered — give a version-appropriate status message.
        # (Reaching here on Blender 5.x would mean the user somehow force-installed
        # Niftools v0.1.1 despite it not being officially supported.)
        if blender_version >= (5, 0, 0):
            return True, "Niftools exporter detected on Blender 5.x (not officially supported; expect instability)"

        if blender_version >= (4, 0, 0):
            return True, "Niftools exporter detected on Blender 4.x (ensure compatibility; experimental)"

        return True, "Niftools exporter available"

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
    def _apply_niftools_scene_settings(game=None):
        """Configure Niftools scene properties for the target game.

        The Niftools exporter reads NIF version, game, and other settings from
        the scene-level ``niftools_scene`` property group.  If these are not
        configured the exporter raises "You have not selected a game."

        This method applies the full settings from ``_NIF_GAME_PROFILES`` so
        the user never has to visit the scene tab manually.  Every supported
        game (Morrowind, Oblivion, Fallout 3/NV, Skyrim, Skyrim SE, Fallout 4)
        is handled correctly with the right NIF version numbers, tangent-space
        flag, scale correction, and skin-partition settings.

        It is called automatically before every NIF export attempt.

        Parameters
        ----------
        game : str, optional
            Canonical game key from ``_NIF_GAME_PROFILES`` (e.g.
            ``"FALLOUT_4"``, ``"SKYRIM"``).  When *None* (default) the method
            reads ``niftools_scene.game``; if that is ``"UNKNOWN"`` it
            defaults to ``"FALLOUT_4"``.
        """
        try:
            scene = bpy.context.scene
            ns = getattr(scene, "niftools_scene", None)
            if ns is None:
                return  # Niftools not installed; nothing to configure

            # ------------------------------------------------------------------
            # Resolve which game profile to apply.
            # Priority: explicit argument > addon fo4_game_version scene prop >
            #           current niftools_scene.game setting > FALLOUT_4
            # ------------------------------------------------------------------
            if game is None:
                # Prefer the addon's own fo4_game_version scene property, which
                # the user sets via the Export panel.  This is the most direct
                # expression of intent and avoids relying on niftools_scene.game
                # being configured beforehand.
                addon_ver = getattr(scene, "fo4_game_version", None)
                if addon_ver and addon_ver in _NIF_GAME_PROFILES:
                    game = addon_ver
                else:
                    current = getattr(ns, "game", "UNKNOWN")
                    game = _NIF_GAME_ALIAS_MAP.get(current) or "FALLOUT_4"

            profile = _NIF_GAME_PROFILES.get(game, _NIF_GAME_PROFILES["FALLOUT_4"])

            # ------------------------------------------------------------------
            # Game enum – try each alias in the profile so we work across
            # different Niftools builds that use different identifier spellings.
            # Blender EnumProperty silently ignores invalid values without
            # raising an exception, so we read back the value to confirm that
            # the assignment was actually accepted before moving on.
            # ------------------------------------------------------------------
            for game_id in profile["aliases"]:
                try:
                    ns.game = game_id
                    # Confirm the assignment stuck (EnumProperty silently drops
                    # unrecognised values; if it didn't stick, try the next alias).
                    if getattr(ns, "game", None) == game_id:
                        break
                except (TypeError, AttributeError):
                    continue

            # Explicit NIF version numbers (belt-and-suspenders; the game
            # profile above should set these automatically in most builds).
            for attr, value in (
                ("nif_version",    profile["nif_version"]),
                ("user_version",   profile["user_version"]),
                ("user_version_2", profile["user_version_2"]),
            ):
                try:
                    setattr(ns, attr, value)
                except (TypeError, AttributeError):
                    pass

            # ------------------------------------------------------------------
            # Tangent space – required for BS-engine games (Oblivion and newer)
            # so that BSLightingShaderProperty normal-map lighting is correct.
            # ------------------------------------------------------------------
            for tattr in ("use_tangent_space", "tangent_space"):
                try:
                    setattr(ns, tattr, profile["use_tangent_space"])
                    break
                except (TypeError, AttributeError):
                    continue

            # Export type: geometry NIF, not a KF animation track.
            for et_val in ("nif", "NIF"):
                try:
                    ns.export_type = et_val
                    break
                except (TypeError, AttributeError):
                    continue

            # Scale correction: converts between Blender and NIF coordinate
            # units.  Most games use 1.0; Skyrim uses 0.1.
            try:
                ns.scale_correction = profile["scale_correction"]
            except (TypeError, AttributeError):
                pass

        except Exception:
            # Never block the export attempt if scene configuration fails.
            pass

    @staticmethod
    def _build_nif_export_kwargs(filepath):
        """Assemble kwargs for the NIF exporter (Niftools v0.1.1).

        Settings are derived from the active ``niftools_scene.game`` profile so
        that any supported game produces a well-formed NIF without manual
        configuration.  The full set of supported games and their correct NIF
        version numbers is defined in ``_NIF_GAME_PROFILES`` at the top of this
        module.

        Fallout 4 (OG / NG / AE) requirements enforced here:
          - NIF 20.2.0.7 / user_version 12 / user_version_2 (bsver) 130
            (authoritative values from niftools/nifxml nif.xml)
          - BSTriShape geometry nodes (selected by the FALLOUT_4 game profile)
          - use_tangent_space=True for BSLightingShaderProperty normal maps
          - scale_correction=1.0 (1 Blender unit = 1 NIF unit)
          - apply_modifiers=True to bake the temporary Triangulate modifier
          - skin_partition=False (FO4 uses BSSubIndexTriShape, not old partitions)
        """
        kwargs = {
            "filepath": filepath,
        }

        # Determine the active game profile.
        try:
            current_game = bpy.context.scene.niftools_scene.game
        except Exception:
            current_game = "UNKNOWN"

        canonical = _NIF_GAME_ALIAS_MAP.get(current_game, "FALLOUT_4")
        profile = _NIF_GAME_PROFILES.get(canonical, _NIF_GAME_PROFILES["FALLOUT_4"])

        try:
            props = bpy.ops.export_scene.nif.get_rna_type().properties
            prop_keys = props.keys()

            # Only pass use_selection when the NIF exporter supports it.
            # Niftools v0.1.1 does not expose this property; passing it
            # unconditionally triggers "keyword 'use_selection' unrecognized"
            # which causes the export to fail and fall back to FBX.
            if "use_selection" in prop_keys:
                kwargs["use_selection"] = True

            # ------------------------------------------------------------------
            # Game profile – drives NIF version numbers and geometry node type.
            # Try every alias in the profile because different Niftools builds
            # use different enum identifiers for the same game.
            # ------------------------------------------------------------------
            if "game" in prop_keys:
                game_val = ExportHelpers._safe_enum(
                    props, "game",
                    profile["aliases"][0],
                    fallbacks=profile["aliases"][1:],
                )
                if game_val:
                    kwargs["game"] = game_val

            # Export as a NIF geometry file, not a KF animation file.
            if "export_type" in prop_keys:
                et_val = ExportHelpers._safe_enum(
                    props, "export_type", "nif", fallbacks=["NIF", "nif_and_kf"]
                )
                if et_val:
                    kwargs["export_type"] = et_val

            # ------------------------------------------------------------------
            # Tangent space – required for BS-engine games (Oblivion and newer).
            # BSLightingShaderProperty normal maps need tangent vectors; without
            # them the mesh appears flat-lit regardless of the normal-map texture.
            # ------------------------------------------------------------------
            if profile["use_tangent_space"]:
                for tkey in ("use_tangent_space", "tangent_space"):
                    if tkey in prop_keys:
                        kwargs[tkey] = True
                        break

            # Smoothing – only set when the property is recognised.
            if "smoothing" in prop_keys:
                smooth_val = ExportHelpers._safe_enum(props, "smoothing", "SMOOTH")
                if smooth_val:
                    kwargs["smoothing"] = smooth_val

            # Scale correction from the game profile.
            if "scale_correction" in prop_keys:
                kwargs["scale_correction"] = profile["scale_correction"]

            # Apply modifiers so the temporary Triangulate modifier added by
            # _prepare_mesh_for_nif is baked into the exported geometry.
            if "apply_modifiers" in prop_keys:
                kwargs["apply_modifiers"] = True

            # Static meshes do not need flattened skin; flatten_skin would
            # corrupt vertex weights on rigged character meshes.
            if "flatten_skin" in prop_keys:
                kwargs["flatten_skin"] = False

            # ------------------------------------------------------------------
            # Skin partition – enabled only for games that use NiSkinPartition
            # (Oblivion, FO3/NV, Skyrim).  FO4 uses BSSubIndexTriShape instead.
            # Setting max_bones per game avoids the niftools quality warning.
            # ------------------------------------------------------------------
            if "skin_partition" in prop_keys:
                kwargs["skin_partition"] = profile["skin_partition"]

            if profile["skin_partition"]:
                if "max_bones_per_partition" in prop_keys:
                    kwargs["max_bones_per_partition"] = profile["max_bones_per_partition"]
                if "max_bones_per_vertex" in prop_keys:
                    kwargs["max_bones_per_vertex"] = profile["max_bones_per_vertex"]

        except Exception:
            # If introspecting the operator fails, fall back to the minimal
            # kwargs so the export can still be attempted.
            pass

        return kwargs

    @staticmethod
    def _apply_niftools_blender4_compat_patches():
        """Monkey-patch niftools v0.1.1 for Blender 4.x API compatibility.

        Blender 4.0 removed ``bpy.types.Object.face_maps``.  Niftools v0.1.1
        calls ``b_obj.face_maps.get()`` in ``get_polygon_parts`` (body-part
        assignments) and iterates ``b_obj.face_maps`` in
        ``export_skin_partition`` (partition-sort ordering).  Both calls raise
        ``AttributeError`` on Blender 4.x.

        These patches substitute safe no-op behaviour for the missing API so
        that NIF export can proceed.  Body-part assignments and partition
        ordering are omitted when face_maps is absent, which is correct for
        Fallout 4 (NiSkinInstance, not BSDismemberSkinInstance) and acceptable
        for other games where the user has not configured face maps.

        The patches are idempotent: calling this function multiple times is safe.
        Patching only occurs on Blender 4.x; Blender 3.x is left untouched.
        """
        if bpy.app.version < (4, 0, 0):
            return  # face_maps exists on Blender 3.x; no patch needed

        try:
            import numpy as np
            from io_scene_niftools.modules.nif_export.geometry.mesh import Mesh as _NiftoolsMesh

            # ------------------------------------------------------------------
            # Patch 1 – get_polygon_parts
            # Original (line 742 in niftools v0.1.1):
            #   face_map = b_obj.face_maps.get(bodypartgroupname)  → AttributeError
            # Fix: return np.array([]) immediately when face_maps is absent,
            # matching the function's own "no valid face maps" early-exit path.
            # ------------------------------------------------------------------
            if not getattr(_NiftoolsMesh.get_polygon_parts, "_fo4_patched", False):
                _orig_gpp = _NiftoolsMesh.get_polygon_parts

                def _patched_get_polygon_parts(self, b_obj, b_mesh):
                    if not hasattr(b_obj, "face_maps"):
                        return np.array([])
                    return _orig_gpp(self, b_obj, b_mesh)

                _patched_get_polygon_parts._fo4_patched = True
                _NiftoolsMesh.get_polygon_parts = _patched_get_polygon_parts

            # ------------------------------------------------------------------
            # Patch 2 – export_skin_partition
            # Original (line 671-672 in niftools v0.1.1):
            #   part_order = [... for face_map in b_obj.face_maps if ...]
            #     → AttributeError on Blender 4.x
            # Fix: when face_maps is absent replicate the function body but
            # use an empty part_sort_order list (it is only a hint for ordering
            # and is safe to omit).
            # ------------------------------------------------------------------
            if not getattr(_NiftoolsMesh.export_skin_partition, "_fo4_patched", False):
                _orig_esp = _NiftoolsMesh.export_skin_partition

                def _patched_export_skin_partition(self, b_obj, bodypartfacemap, triangles, n_geom):
                    if hasattr(b_obj, "face_maps"):
                        return _orig_esp(self, b_obj, bodypartfacemap, triangles, n_geom)
                    # Blender 4.x: replicate the function without the
                    # b_obj.face_maps iteration (part_sort_order = []).
                    try:
                        import bpy as _bpy
                        from io_scene_niftools.utils.singleton import NifOp, NifData
                        from io_scene_niftools.utils.logging import NifLog
                        from io_scene_niftools.modules.nif_export.geometry.mesh.skin_partition \
                            import update_skin_partition as _usp
                        if NifData.data.version >= 0x04020100 and NifOp.props.skin_partition:
                            game = _bpy.context.scene.niftools_scene.game
                            n_geom.update_skin_partition = _usp.__get__(n_geom)
                            lostweight = n_geom.update_skin_partition(
                                maxbonesperpartition=NifOp.props.max_bones_per_partition,
                                maxbonespervertex=NifOp.props.max_bones_per_vertex,
                                stripify=NifOp.props.stripify,
                                stitchstrips=NifOp.props.stitch_strips,
                                padbones=NifOp.props.pad_bones,
                                triangles=triangles,
                                trianglepartmap=bodypartfacemap,
                                maximize_bone_sharing=(
                                    game in ("FALLOUT_3", "FALLOUT_NV", "SKYRIM")
                                ),
                                part_sort_order=[],
                            )
                            if lostweight > NifOp.props.epsilon:
                                NifLog.warn(
                                    f"Lost {lostweight:f} in vertex weights while creating "
                                    f"a skin partition for Blender object '{b_obj.name}' "
                                    f"(nif block '{n_geom.name}')"
                                )
                    except Exception:
                        pass

                _patched_export_skin_partition._fo4_patched = True
                _NiftoolsMesh.export_skin_partition = _patched_export_skin_partition

        except Exception:
            # If the niftools module layout has changed, skip patching silently.
            # The export will still be attempted; if face_maps is truly absent
            # the original AttributeError will appear in the console as before.
            pass

    @staticmethod
    def _sanitize_material_node_labels(obj):
        """Normalise image texture node labels to the TEX_SLOTS set that niftools recognises.

        The niftools texture exporter
        (``io_scene_niftools/modules/nif_export/property/texture/__init__.py``)
        iterates over every ``ShaderNodeTexImage`` node in the material and
        checks whether any of its known ``TEX_SLOTS`` constant values is a
        **substring** of the node's label (case-sensitive).  If none match, the
        exporter raises the fatal error::

            "Do not know how to export texture node … with label … Delete it or
            change its label."

        The official ``TEX_SLOTS`` constants defined in niftools'
        ``io_scene_niftools/utils/consts.py`` are::

            TEX_SLOTS.BASE     = "Base"
            TEX_SLOTS.NORMAL   = "Normal"
            TEX_SLOTS.SPECULAR = "Specular"
            TEX_SLOTS.GLOW     = "Glow"
            TEX_SLOTS.GLOSS    = "Gloss"
            TEX_SLOTS.DARK     = "Dark"
            TEX_SLOTS.DETAIL   = "Detail"
            TEX_SLOTS.BUMP_MAP = "Bump Map"

        This method scans **all** ``ShaderNodeTexImage`` nodes in every material
        on *obj* and remaps any label that is not already recognised to the
        correct canonical TEX_SLOTS string.  The remapping table covers every
        label variant produced by previous versions of this add-on as well as
        common manual names a user might enter:

        ============  =============================================  ========
        Canonical     Recognised source-label patterns               NIF slot
        ============  =============================================  ========
        ``Base``      Diffuse, Base Color, Base Colour, Albedo,      slot 0
                      Diffuse (_d), Base (_d)
        ``Normal``    Normal Map, Normal (_n), Bump Map, Bump         slot 1
        ``Specular``  Specular Map, Specular (_s), Gloss Map          slot 3
        ``Glow``      Glow/Emissive, Emissive, Emission, Glow (_g)   slot 2
        ============  =============================================  ========

        Nodes whose labels already contain one of the canonical TEX_SLOTS
        strings are left unchanged.  Nodes with an empty label are also left
        alone — niftools falls back to the image file-name in that case, which
        works when the ``.dds`` files follow Fallout 4 naming conventions.
        """
        # All canonical TEX_SLOTS strings from niftools consts.py.
        # A node label is accepted by niftools if ANY of these is a substring.
        _NIFTOOLS_CANONICAL = frozenset({
            "Base", "Normal", "Specular", "Glow", "Gloss",
            "Dark", "Detail", "Bump Map", "Decal 0", "Decal 1", "Decal 2",
        })

        # Remapping table: (canonical, frozenset of lower-case substrings that
        # indicate this slot).  The first match wins, so more-specific patterns
        # are listed before general ones.
        _REMAP = [
            # slot 0 — base/diffuse colour
            ("Base", frozenset({
                "diffuse (_d)", "diffuse (_D)", "base (_d)",
                "base color", "base colour", "albedo",
                "diffuse",
            })),
            # slot 1 — tangent-space normal map
            ("Normal", frozenset({
                "normal map (_n)", "normal map (_N)",
                "normal map", "normal (_n)", "bump map",
            })),
            # slot 3 — specular / smoothness
            ("Specular", frozenset({
                "specular (_s)", "specular (_S)",
                "specular map", "gloss map",
            })),
            # slot 2 — glow / emissive mask
            ("Glow", frozenset({
                "glow/emissive (_g)", "glow/emissive (_G)",
                "glow/emissive", "emissive", "emission",
            })),
        ]

        if not obj.data.materials:
            return
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            for node in mat.node_tree.nodes:
                if node.type != 'TEX_IMAGE':
                    continue
                label = node.label
                if not label:
                    # Empty label: niftools falls back to the image name.
                    # Leave it alone — the image name will be used as-is.
                    continue

                # If the label already contains a recognised TEX_SLOTS string,
                # niftools will accept it — no changes needed.
                if any(canonical in label for canonical in _NIFTOOLS_CANONICAL):
                    continue

                # Attempt to remap the label to its canonical form.
                label_lower = label.lower()
                for canonical, patterns in _REMAP:
                    if any(p in label_lower for p in patterns):
                        node.label = canonical
                        break
                # If nothing matched, leave the label as-is.  The export will
                # either succeed (if niftools can handle it) or fail with its
                # original error message; we do not silently corrupt unknown
                # custom labels.

    @staticmethod
    def _prepare_mesh_for_nif(obj):
        """Prepare a mesh object so it meets Fallout 4 / Niftools v0.1.1 requirements.

        Performs (in order):
          1. Sanitise material node labels so Niftools can map every image node
             to the correct BSShaderTextureSet slot (fixes the "Do not know how
             to export texture node … with label …" error).
          2. Apply pending scale and rotation transforms – unapplied transforms
             are the single most common cause of distorted geometry in-game.
          3. Ensure at least one UV map exists – the Niftools exporter requires
             UV coordinates on every exported mesh.
          4. Add a temporary ``_FO4_Triangulate`` modifier when the mesh
             contains quads or n-gons, because FO4 BSTriShape only stores
             triangles and the exporter does NOT auto-triangulate.
          5. Enable Auto Smooth for consistent tangent/normal export (skipped
             silently on Blender 4.x where the attribute was removed).

        Returns a list of modifier names that were added.  The caller must
        remove them after export so the user's mesh is not permanently altered.
        """
        added_modifiers = []

        if bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')

        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # 1. Sanitise material node labels ---------------------------------------
        #    Niftools uses each image-texture node's label to choose the target
        #    BSShaderTextureSet slot.  Labels like "Diffuse (_d)" or
        #    "Normal Map (_n)" are not in its recognised set and cause:
        #        "Do not know how to export texture node … with label …"
        #    Renaming them to the bare canonical labels ("Diffuse", "Normal", …)
        #    before export silently fixes both freshly created and older materials
        #    that were set up with the previous verbose label scheme.
        ExportHelpers._sanitize_material_node_labels(obj)

        # 2. Apply scale and rotation -----------------------------------------
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

        # 3. Ensure UV map -------------------------------------------------------
        #    Niftools v0.1.1 raises an error if no UV map is present.
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

        # 4. Triangulate ---------------------------------------------------------
        #    Fallout 4 BSTriShape nodes only store triangles.  If the mesh has
        #    quads or n-gons, add a Triangulate modifier (removed after export).
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

        # 5. Auto Smooth ---------------------------------------------------------
        #    Ensures the exported tangent vectors are coherent with the mesh
        #    normals.  Removed in Blender 4.x (use_auto_smooth no longer exists).
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
        """Export mesh to NIF format using Niftools v0.1.1 when available, else fall back to FBX.

        Pre-export preparation (applied automatically, reversed after export):
          - Scale and rotation transforms are applied so geometry arrives at the
            correct size and orientation in Fallout 4.
          - A UV map is created (smart-unwrapped) if the mesh has none.
          - A temporary Triangulate modifier is added when the mesh has quads /
            n-gons because FO4 BSTriShape nodes require triangles only.

        The Niftools/FBX exporters are notoriously sensitive to stray vertex
        groups.  If a mesh contains weights but isn't skinned to an armature the
        export can produce collapsed or otherwise corrupted geometry.  We fail
        early in that case so the user can clean up the mesh.
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

        nif_available, nif_message = ExportHelpers.nif_exporter_available()
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
                coll = None  # kept in scope for post-processing below
                # only include a collision object if the mesh is expected to have one
                ctype = getattr(obj, 'fo4_collision_type', 'DEFAULT')
                if ctype not in ('NONE', 'GRASS', 'MUSHROOM'):
                    coll = ExportHelpers._find_collision_mesh(obj)
                    if coll:
                        selection.append(coll)
                        # PRE-EXPORT: configure Niftools/Blender collision
                        # properties (havokMaterial, layer, motionSystem, …)
                        # so the NIF exporter emits correct bhkRigidBody flags.
                        ExportHelpers._apply_collision_nif_properties(coll, ctype)

                bpy.ops.object.select_all(action='DESELECT')
                for o in selection:
                    o.select_set(True)
                bpy.context.view_layer.objects.active = obj

                # Automatically apply all required Niftools scene settings so
                # the user never has to visit the scene tab manually.
                ExportHelpers._apply_niftools_scene_settings()

                # Apply Blender 4.x compatibility patches to niftools so that
                # the missing face_maps API does not crash the export.
                ExportHelpers._apply_niftools_blender4_compat_patches()

                kwargs = ExportHelpers._build_nif_export_kwargs(filepath)
                result = bpy.ops.export_scene.nif(**kwargs)

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

                    # POST-EXPORT: re-open the NIF with pyffi and inject the
                    # BSXFlags, havokMaterial, layer, motionSystem, and
                    # qualityType values that Niftools cannot reliably set
                    # through its operator interface alone.  This step is what
                    # makes collision work in-game and is also the extension
                    # point for future animation property injection.
                    if coll is not None and ctype not in ('NONE',):
                        try:
                            ExportHelpers._postprocess_nif_set_collision(
                                filepath, ctype
                            )
                        except Exception as _pp_exc:
                            print(
                                f"[FO4 Add-on] collision post-process warning "
                                f"(non-fatal): {_pp_exc}"
                            )

                    # Send event to desktop tutorial server
                    try:
                        from . import desktop_tutorial_client
                        event_data = {
                            'mesh_name': obj.name,
                            'filepath': filepath,
                            'extras': extras
                        }
                        desktop_tutorial_client.DesktopTutorialClient.send_event('mesh_exported', event_data)
                    except Exception as e:
                        print(f"[DesktopTutorialClient] Failed to send mesh export event: {e}")
                    return True, f"Exported NIF: {filepath}{note}"

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

        The Niftools v0.1.1 exporter (or an FBX fallback) is used with the same
        settings as :func:`export_mesh_to_nif`.

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

        nif_available, nif_message = ExportHelpers.nif_exporter_available()

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
                # Automatically apply all required Niftools scene settings so
                # the user never has to visit the scene tab manually.
                ExportHelpers._apply_niftools_scene_settings()
                # Apply Blender 4.x compatibility patches to niftools so that
                # the missing face_maps API does not crash the export.
                ExportHelpers._apply_niftools_blender4_compat_patches()
                kwargs = ExportHelpers._build_nif_export_kwargs(filepath)
                try:
                    result = bpy.ops.export_scene.nif(**kwargs)
                    if isinstance(result, set) and 'FINISHED' in result:
                        mesh_count = len(meshes)
                        return True, f"Exported {mesh_count} mesh(es) as single NIF: {filepath}"
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
