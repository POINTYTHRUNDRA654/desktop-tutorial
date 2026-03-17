"""
Post-processing helpers for Fallout 4 mod creation.

Covers two distinct workflows:

1.  **Blender Compositor preview** — Sets up Blender's node-compositor so
    artists can preview how a scene will look with Fallout 4's built-in
    post-processing (colour grading, bloom, vignette, cinematic bars, etc.)
    *before* exporting.  All changes are non-destructive and can be removed
    with one click.

2.  **ImageSpace / IMAD data export** — Serialises the current settings to
    a JSON file that maps 1-to-1 onto Creation Kit ``ImageSpace (IMGS)`` and
    ``ImageSpace Modifier (IMAD)`` record fields.  The user imports the JSON
    with a CK plugin (e.g. xEdit's scripted import) or fills the CK form
    manually using the exported values.

Fallout 4 ImageSpace reference
-------------------------------
The in-game ``ImageSpace`` record (IMGS) stores:

    Eye Adapt Speed               – how quickly HDR exposure adapts
    Eye Adapt Strength            – max exposure compensation
    Bloom Blur Radius             – radius of bloom kernel (pixels)
    Bloom Threshold               – luminance cutoff before bloom fires
    Bloom Scale                   – overall bloom intensity multiplier
    Receive Bloom Threshold       – mesh-level threshold before receiving bloom
    White                         – white-level for tonemapper
    Sunlight Scale                – outdoor specular / sun brightness
    Sky Scale                     – sky luminance scale
    Saturation                    – colour saturation (0 = greyscale, 1 = normal)
    Contrast                      – contrast multiplier (1 = normal)
    Tint Color (RGBA)             – global tint overlaid on the screen
    Cinematic Bars                – letterbox black-bar height (0–1)

All values are floating-point.  The add-on exposes the most commonly edited
subset through Blender scene properties and maps them to compositor nodes so
artists see real-time feedback.
"""

import bpy
import json
import os

# ---------------------------------------------------------------------------
# FO4 ImageSpace preset definitions
# ---------------------------------------------------------------------------
# Each preset is a dict of raw float values that map directly to both the
# Blender compositor setup AND the CK ImageSpace record fields.
#
# Keys
# ----
# label          – human-readable name shown in the UI enum
# description    – tooltip text
# bloom_strength – brightness of the glare / bloom effect  (compositor)
# bloom_threshold– luminance cutoff for bloom firing       (compositor + CK)
# bloom_radius   – bloom kernel radius (normalised 0-1)    (compositor + CK)
# saturation     – colour saturation 0=grey, 1=normal, >1=vivid  (compositor + CK)
# contrast       – contrast multiplier                     (compositor + CK)
# brightness     – additive brightness offset (-1 to +1)   (compositor)
# tint_r/g/b     – RGB tint (0-1 each)                     (compositor + CK)
# tint_strength  – how much the tint mixes over the frame  (compositor + CK)
# vignette       – vignette darkness at screen edges        (compositor)
# cinematic_bars – letterbox bar height 0=off 0.1=subtle   (compositor + CK)
# dof_enabled    – enable depth-of-field node              (compositor)
# dof_fstop      – f-stop value for DoF node               (compositor)
# eye_adapt_speed– CK only (not reproduced in compositor)
# eye_adapt_strength – CK only
# white          – tonemapper white level  (CK only)
# ---------------------------------------------------------------------------

PRESETS: dict = {
    "VANILLA": {
        "label":             "Vanilla",
        "description":       "Standard Fallout 4 look with neutral colour and subtle bloom",
        "bloom_strength":    0.4,
        "bloom_threshold":   0.8,
        "bloom_radius":      0.3,
        "saturation":        1.0,
        "contrast":          1.0,
        "brightness":        0.0,
        "tint_r":            1.0,
        "tint_g":            1.0,
        "tint_b":            1.0,
        "tint_strength":     0.0,
        "vignette":          0.25,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         1.4,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.5,
        "white":             1.0,
    },
    "PIPBOY": {
        "label":             "Pip-Boy",
        "description":       "Green monochrome screen effect used when the Pip-Boy is open",
        "bloom_strength":    0.8,
        "bloom_threshold":   0.5,
        "bloom_radius":      0.5,
        "saturation":        0.0,
        "contrast":          1.3,
        "brightness":        -0.1,
        "tint_r":            0.0,
        "tint_g":            1.0,
        "tint_b":            0.15,
        "tint_strength":     0.85,
        "vignette":          0.5,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         1.4,
        "eye_adapt_speed":   1.0,
        "eye_adapt_strength": 0.3,
        "white":             0.9,
    },
    "COMBAT": {
        "label":             "Combat",
        "description":       "High-contrast, slightly desaturated warzone look",
        "bloom_strength":    0.6,
        "bloom_threshold":   0.7,
        "bloom_radius":      0.2,
        "saturation":        0.75,
        "contrast":          1.25,
        "brightness":        0.05,
        "tint_r":            1.0,
        "tint_g":            0.9,
        "tint_b":            0.8,
        "tint_strength":     0.1,
        "vignette":          0.4,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         2.8,
        "eye_adapt_speed":   3.0,
        "eye_adapt_strength": 0.7,
        "white":             1.1,
    },
    "EXPLORATION": {
        "label":             "Exploration",
        "description":       "Warm, slightly golden-toned outdoor exploration lighting",
        "bloom_strength":    0.5,
        "bloom_threshold":   0.75,
        "bloom_radius":      0.35,
        "saturation":        1.1,
        "contrast":          1.05,
        "brightness":        0.05,
        "tint_r":            1.05,
        "tint_g":            1.0,
        "tint_b":            0.9,
        "tint_strength":     0.05,
        "vignette":          0.2,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         2.0,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.5,
        "white":             1.0,
    },
    "NIGHT": {
        "label":             "Night / Dark",
        "description":       "Dark scene with cool blue tint for night-time or interior areas",
        "bloom_strength":    0.7,
        "bloom_threshold":   0.4,
        "bloom_radius":      0.6,
        "saturation":        0.6,
        "contrast":          1.2,
        "brightness":        -0.25,
        "tint_r":            0.7,
        "tint_g":            0.8,
        "tint_b":            1.1,
        "tint_strength":     0.2,
        "vignette":          0.6,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         1.4,
        "eye_adapt_speed":   1.5,
        "eye_adapt_strength": 0.6,
        "white":             0.85,
    },
    "VAULT": {
        "label":             "Vault Interior",
        "description":       "Cool-white fluorescent lighting typical of vault interiors",
        "bloom_strength":    0.35,
        "bloom_threshold":   0.9,
        "bloom_radius":      0.2,
        "saturation":        0.9,
        "contrast":          1.1,
        "brightness":        0.0,
        "tint_r":            0.9,
        "tint_g":            0.95,
        "tint_b":            1.0,
        "tint_strength":     0.05,
        "vignette":          0.15,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         2.8,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.4,
        "white":             1.0,
    },
    "CINEMATIC": {
        "label":             "Cinematic",
        "description":       "Widescreen cinematic bars with film-grade colour",
        "bloom_strength":    0.6,
        "bloom_threshold":   0.65,
        "bloom_radius":      0.4,
        "saturation":        0.9,
        "contrast":          1.15,
        "brightness":        -0.05,
        "tint_r":            1.0,
        "tint_g":            0.95,
        "tint_b":            0.85,
        "tint_strength":     0.08,
        "vignette":          0.45,
        "cinematic_bars":    0.10,
        "dof_enabled":       True,
        "dof_fstop":         1.4,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.5,
        "white":             1.0,
    },
    "DRUG": {
        "label":             "Drug Effect",
        "description":       "Psychedelic colour distortion used for Jet / Mentats effects",
        "bloom_strength":    1.2,
        "bloom_threshold":   0.3,
        "bloom_radius":      0.7,
        "saturation":        2.0,
        "contrast":          1.4,
        "brightness":        0.1,
        "tint_r":            1.2,
        "tint_g":            0.8,
        "tint_b":            1.3,
        "tint_strength":     0.3,
        "vignette":          0.5,
        "cinematic_bars":    0.0,
        "dof_enabled":       True,
        "dof_fstop":         0.5,
        "eye_adapt_speed":   4.0,
        "eye_adapt_strength": 1.0,
        "white":             1.2,
    },
    "RADIATION": {
        "label":             "Radiation Sickness",
        "description":       "Sickly green tint used when the player is heavily irradiated",
        "bloom_strength":    0.9,
        "bloom_threshold":   0.5,
        "bloom_radius":      0.5,
        "saturation":        0.5,
        "contrast":          1.1,
        "brightness":        -0.1,
        "tint_r":            0.6,
        "tint_g":            1.1,
        "tint_b":            0.5,
        "tint_strength":     0.4,
        "vignette":          0.55,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         1.8,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.5,
        "white":             0.95,
    },
    "CUSTOM": {
        "label":             "Custom",
        "description":       "Fully customisable – adjust all sliders manually",
        "bloom_strength":    0.4,
        "bloom_threshold":   0.8,
        "bloom_radius":      0.3,
        "saturation":        1.0,
        "contrast":          1.0,
        "brightness":        0.0,
        "tint_r":            1.0,
        "tint_g":            1.0,
        "tint_b":            1.0,
        "tint_strength":     0.0,
        "vignette":          0.25,
        "cinematic_bars":    0.0,
        "dof_enabled":       False,
        "dof_fstop":         1.4,
        "eye_adapt_speed":   2.0,
        "eye_adapt_strength": 0.5,
        "white":             1.0,
    },
}

# Sorted list of (identifier, label, description) tuples for Blender EnumProperty
PRESET_ENUM_ITEMS = [
    (k, v["label"], v["description"])
    for k, v in PRESETS.items()
]


# ---------------------------------------------------------------------------
# Node-compositor tag constants
# ---------------------------------------------------------------------------
# Every compositor node created by this helper receives one of these names so
# it can be identified later (e.g. for removal or property-sync).
_TAG_COMPOSIT  = "FO4_PP_Compositor"
_TAG_GLARE     = "FO4_PP_Glare"
_TAG_COLOR_CORRECT = "FO4_PP_ColorCorrect"
_TAG_HUE_SAT   = "FO4_PP_HueSat"
_TAG_BRIGHTNESS = "FO4_PP_Brightness"
_TAG_TINT      = "FO4_PP_Tint"
_TAG_TINT_MIX  = "FO4_PP_TintMix"
_TAG_VIGNETTE  = "FO4_PP_Vignette"
_TAG_LENS      = "FO4_PP_LensDistort"
_TAG_DEFOCUS   = "FO4_PP_Defocus"
_TAG_INPUT     = "FO4_PP_Input"      # Render Layers / Image node
_TAG_OUTPUT    = "FO4_PP_Output"     # Composite output node


class PostProcessingHelpers:
    """Core post-processing helper for Fallout 4 Blender add-on."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def get_preset(preset_id: str) -> dict:
        """Return the preset dict for *preset_id*, falling back to VANILLA."""
        return PRESETS.get(preset_id, PRESETS["VANILLA"])

    @staticmethod
    def setup_compositor(scene, preset_id: str = "VANILLA") -> tuple[bool, str]:
        """Enable the compositor and build FO4-style post-processing nodes.

        Creates (or replaces) a node group consisting of:
        - Render Layers input
        - Glare (bloom simulation)
        - Hue/Saturation/Value
        - Brightness/Contrast
        - Colour tint (Alpha-Over mix)
        - Vignette (darken edges via Ellipse Mask + Mix)
        - Defocus (depth-of-field, optional)
        - Composite output

        All nodes are tagged with ``FO4_PP_*`` names so they can be found and
        removed later without touching user-created nodes.

        Parameters
        ----------
        scene : bpy.types.Scene
        preset_id : str
            Key into :data:`PRESETS`.

        Returns
        -------
        (True, message) on success, (False, error) on failure.
        """
        preset = PostProcessingHelpers.get_preset(preset_id)

        try:
            scene.use_nodes = True
            tree = scene.node_tree
            nodes = tree.nodes
            links = tree.links

            # Remove any previous FO4 post-processing nodes so we start clean.
            PostProcessingHelpers._remove_fo4_nodes(tree)

            # ── Render Layers input ──────────────────────────────────────────
            rl = nodes.new('CompositorNodeRLayers')
            rl.name = _TAG_INPUT
            rl.location = (-800, 300)

            # ── Glare (bloom / lens flare) ──────────────────────────────────
            glare = nodes.new('CompositorNodeGlare')
            glare.name = _TAG_GLARE
            glare.glare_type = 'BLOOM'
            glare.quality = 'MEDIUM'
            glare.threshold = preset["bloom_threshold"]
            # 'mix' on the Glare node ranges -1 (input only) to 1 (glare only).
            # We map bloom_strength 0-1 → mix -1 to 0 (i.e. blend in).
            glare.mix = max(-1.0, min(0.0, preset["bloom_strength"] - 1.0))
            # size 2–9 maps our 0-1 radius to Blender's integer scale
            glare.size = max(2, min(9, round(2 + preset["bloom_radius"] * 7)))
            glare.location = (-550, 300)
            links.new(rl.outputs['Image'], glare.inputs['Image'])

            # ── Colour Correction (saturation / contrast) ───────────────────
            huesat = nodes.new('CompositorNodeHueSat')
            huesat.name = _TAG_HUE_SAT
            huesat.inputs['Saturation'].default_value = max(0.0, preset["saturation"])
            huesat.inputs['Value'].default_value = 1.0  # value = brightness multiplier
            huesat.location = (-300, 300)
            links.new(glare.outputs['Image'], huesat.inputs['Image'])

            # ── Brightness / Contrast ────────────────────────────────────────
            bc = nodes.new('CompositorNodeBrightContrast')
            bc.name = _TAG_BRIGHTNESS
            bc.inputs['Bright'].default_value = preset["brightness"] * 100.0
            bc.inputs['Contrast'].default_value = (preset["contrast"] - 1.0) * 100.0
            bc.location = (-50, 300)
            links.new(huesat.outputs['Image'], bc.inputs['Image'])

            # ── Colour tint (Alpha-Over mix with flat colour) ────────────────
            # We use a Mix (RGB) node in 'MIX' mode blended by tint_strength.
            tint_node = nodes.new('CompositorNodeMixRGB')
            tint_node.name = _TAG_TINT_MIX
            tint_node.blend_type = 'MIX'
            tint_node.use_alpha = False
            tint_node.inputs['Fac'].default_value = preset["tint_strength"]
            tint_node.inputs[1].default_value = (1.0, 1.0, 1.0, 1.0)  # will be wired
            tint_node.inputs[2].default_value = (
                preset["tint_r"],
                preset["tint_g"],
                preset["tint_b"],
                1.0,
            )
            tint_node.location = (200, 300)
            links.new(bc.outputs['Image'], tint_node.inputs[1])

            # ── Vignette (darken screen edges) ───────────────────────────────
            # Use an Ellipse Mask to create a radial gradient, then multiply.
            ellipse = nodes.new('CompositorNodeEllipseMask')
            ellipse.name = _TAG_VIGNETTE
            ellipse.width  = 0.9
            ellipse.height = 0.9
            ellipse.location = (50, 0)

            blur_ell = nodes.new('CompositorNodeBlur')
            blur_ell.name = "FO4_PP_VigBlur"
            blur_ell.filter_type = 'GAUSS'
            blur_ell.use_relative = True
            blur_ell.factor_x = 0.15
            blur_ell.factor_y = 0.15
            blur_ell.location = (250, 0)
            links.new(ellipse.outputs['Mask'], blur_ell.inputs['Image'])

            # Invert the mask so edges are dark
            invert = nodes.new('CompositorNodeInvert')
            invert.name = "FO4_PP_VigInvert"
            invert.location = (400, 0)
            links.new(blur_ell.outputs['Image'], invert.inputs['Color'])

            # Make it black-based: darken only
            vignette_mult = nodes.new('CompositorNodeMixRGB')
            vignette_mult.name = "FO4_PP_VigMix"
            vignette_mult.blend_type = 'MULTIPLY'
            vignette_mult.use_alpha = False
            vignette_mult.inputs['Fac'].default_value = preset["vignette"]
            vignette_mult.location = (450, 300)
            links.new(tint_node.outputs['Image'], vignette_mult.inputs[1])
            # Build an almost-white colour from the inverted mask to darken edges
            # We can't directly wire greyscale mask to colour input on Multiply
            # so we convert via a SetAlpha + AlphaOver hack instead.  A simpler
            # approach: use a second MixRGB (MULTIPLY) where input2 = mask.
            # Blender will auto-expand greyscale → RGBA.
            links.new(invert.outputs['Color'], vignette_mult.inputs[2])

            # ── Depth-of-Field (optional) ────────────────────────────────────
            last_image_socket = vignette_mult.outputs['Image']
            if preset["dof_enabled"]:
                defocus = nodes.new('CompositorNodeDefocus')
                defocus.name = _TAG_DEFOCUS
                defocus.use_zbuffer = False
                defocus.f_stop = preset["dof_fstop"]
                defocus.blur_max = 24.0
                defocus.location = (700, 300)
                links.new(last_image_socket, defocus.inputs['Image'])
                last_image_socket = defocus.outputs['Image']

            # ── Composite output ─────────────────────────────────────────────
            composite = nodes.new('CompositorNodeComposite')
            composite.name = _TAG_OUTPUT
            composite.location = (900, 300)
            links.new(last_image_socket, composite.inputs['Image'])

            return True, f"FO4 post-processing compositor set up with preset '{PRESETS[preset_id]['label']}'"

        except Exception as exc:
            return False, f"Failed to set up compositor: {exc}"

    @staticmethod
    def clear_compositor(scene) -> tuple[bool, str]:
        """Remove all FO4 post-processing nodes created by this helper.

        User-created nodes are not touched.
        """
        if not scene.use_nodes or not scene.node_tree:
            return True, "Compositor has no nodes – nothing to remove"
        PostProcessingHelpers._remove_fo4_nodes(scene.node_tree)
        return True, "FO4 post-processing nodes removed"

    @staticmethod
    def apply_preset_to_compositor(scene, preset_id: str) -> tuple[bool, str]:
        """Update existing FO4 compositor nodes to match *preset_id*.

        If the nodes haven't been created yet, :meth:`setup_compositor` is
        called first to build them.
        """
        if not scene.use_nodes or not scene.node_tree:
            return PostProcessingHelpers.setup_compositor(scene, preset_id)

        tree = scene.node_tree
        fo4_nodes = {n.name for n in tree.nodes if n.name.startswith("FO4_PP_")}
        if not fo4_nodes:
            return PostProcessingHelpers.setup_compositor(scene, preset_id)

        preset = PostProcessingHelpers.get_preset(preset_id)
        nodes = tree.nodes

        # Glare
        glare = nodes.get(_TAG_GLARE)
        if glare:
            glare.threshold = preset["bloom_threshold"]
            glare.mix = max(-1.0, min(0.0, preset["bloom_strength"] - 1.0))
            glare.size = max(2, min(9, round(2 + preset["bloom_radius"] * 7)))

        # Hue/Sat
        huesat = nodes.get(_TAG_HUE_SAT)
        if huesat:
            huesat.inputs['Saturation'].default_value = max(0.0, preset["saturation"])

        # Brightness/Contrast
        bc = nodes.get(_TAG_BRIGHTNESS)
        if bc:
            bc.inputs['Bright'].default_value = preset["brightness"] * 100.0
            bc.inputs['Contrast'].default_value = (preset["contrast"] - 1.0) * 100.0

        # Tint mix
        tint = nodes.get(_TAG_TINT_MIX)
        if tint:
            tint.inputs['Fac'].default_value = preset["tint_strength"]
            tint.inputs[2].default_value = (
                preset["tint_r"],
                preset["tint_g"],
                preset["tint_b"],
                1.0,
            )

        # Vignette
        vig = nodes.get("FO4_PP_VigMix")
        if vig:
            vig.inputs['Fac'].default_value = preset["vignette"]

        # Defocus
        defocus = nodes.get(_TAG_DEFOCUS)
        if defocus:
            defocus.f_stop = preset["dof_fstop"]

        return True, f"Applied preset '{PRESETS[preset_id]['label']}'"

    @staticmethod
    def export_imagespace_data(scene, filepath: str) -> tuple[bool, str]:
        """Export current post-processing settings as a JSON file.

        The exported JSON maps directly onto Fallout 4 ``ImageSpace (IMGS)``
        and ``ImageSpace Modifier (IMAD)`` record fields so the values can be
        entered into Creation Kit (or imported via xEdit script).

        Parameters
        ----------
        scene : bpy.types.Scene
        filepath : str
            Destination ``.json`` file path.

        Returns
        -------
        (True, message) on success, (False, error) on failure.
        """
        try:
            data = PostProcessingHelpers._read_compositor_values(scene)

            # Build the export structure with CK record field names alongside
            # the Blender compositor values so it is self-documenting.
            export_data = {
                "fo4_imagespace": {
                    "_comment": (
                        "Fallout 4 ImageSpace (IMGS) record fields. "
                        "Enter these values in the Creation Kit ImageSpace editor "
                        "or import with an xEdit Papyrus script."
                    ),
                    "EyeAdaptSpeed":         data.get("eye_adapt_speed", 2.0),
                    "EyeAdaptStrength":      data.get("eye_adapt_strength", 0.5),
                    "BloomBlurRadius":       data.get("bloom_radius", 0.3),
                    "BloomThreshold":        data.get("bloom_threshold", 0.8),
                    "BloomScale":            data.get("bloom_strength", 0.4),
                    "ReceiveBloomThreshold": data.get("bloom_threshold", 0.8),
                    "White":                 data.get("white", 1.0),
                    "SunlightScale":         1.0,
                    "SkyScale":              1.0,
                    "Saturation":            data.get("saturation", 1.0),
                    "Contrast":              data.get("contrast", 1.0),
                    "TintColor": {
                        "R": data.get("tint_r", 1.0),
                        "G": data.get("tint_g", 1.0),
                        "B": data.get("tint_b", 1.0),
                        "A": data.get("tint_strength", 0.0),
                    },
                    "CinematicBars": data.get("cinematic_bars", 0.0),
                },
                "fo4_imagespace_modifier": {
                    "_comment": (
                        "Fallout 4 ImageSpace Modifier (IMAD) – used for animated "
                        "transitions. Values below can be used as the 'start' state; "
                        "duplicate and adjust for the 'end' state to create a transition."
                    ),
                    "Duration":      1.0,
                    "DepthOfField": {
                        "Strength": 1.0 if data.get("dof_enabled") else 0.0,
                        "Distance": 500.0,
                        "Range":    200.0,
                    },
                    "Bloom": {
                        "Strength": data.get("bloom_strength", 0.4),
                    },
                    "Tint": {
                        "R":        data.get("tint_r", 1.0),
                        "G":        data.get("tint_g", 1.0),
                        "B":        data.get("tint_b", 1.0),
                        "A":        data.get("tint_strength", 0.0),
                    },
                    "Saturation":   data.get("saturation", 1.0),
                    "Contrast":     data.get("contrast", 1.0),
                },
                "blender_compositor": {
                    "_comment": "Values as read from the Blender compositor nodes.",
                    **data,
                },
                "preset_name":     data.get("preset_name", "CUSTOM"),
                "addon_version":   "2.1.6",
            }

            os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
            with open(filepath, "w", encoding="utf-8") as fh:
                json.dump(export_data, fh, indent=2)

            return True, f"ImageSpace data exported: {filepath}"

        except Exception as exc:
            return False, f"Export failed: {exc}"

    @staticmethod
    def sync_from_scene_props(scene) -> tuple[bool, str]:
        """Read the FO4 scene properties and push them into the compositor.

        Called automatically when any of the ``fo4_pp_*`` scene properties
        change so the compositor preview updates in real time.
        """
        if not scene.use_nodes or not scene.node_tree:
            return False, "Compositor not initialised – run 'Setup Compositor' first"

        tree = scene.node_tree
        nodes = tree.nodes

        # Convenience wrapper: read scene prop with fallback
        def prop(name, default):
            return getattr(scene, name, default)

        glare = nodes.get(_TAG_GLARE)
        if glare:
            glare.threshold = prop("fo4_pp_bloom_threshold", 0.8)
            glare.mix = max(-1.0, min(0.0, prop("fo4_pp_bloom_strength", 0.4) - 1.0))
            glare.size = max(2, min(9, round(2 + prop("fo4_pp_bloom_radius", 0.3) * 7)))

        huesat = nodes.get(_TAG_HUE_SAT)
        if huesat:
            huesat.inputs['Saturation'].default_value = max(0.0, prop("fo4_pp_saturation", 1.0))

        bc = nodes.get(_TAG_BRIGHTNESS)
        if bc:
            bc.inputs['Bright'].default_value   = prop("fo4_pp_brightness", 0.0) * 100.0
            bc.inputs['Contrast'].default_value = (prop("fo4_pp_contrast", 1.0) - 1.0) * 100.0

        tint = nodes.get(_TAG_TINT_MIX)
        if tint:
            tint.inputs['Fac'].default_value = prop("fo4_pp_tint_strength", 0.0)
            tint.inputs[2].default_value = (
                prop("fo4_pp_tint_r", 1.0),
                prop("fo4_pp_tint_g", 1.0),
                prop("fo4_pp_tint_b", 1.0),
                1.0,
            )

        vig = nodes.get("FO4_PP_VigMix")
        if vig:
            vig.inputs['Fac'].default_value = prop("fo4_pp_vignette", 0.25)

        defocus = nodes.get(_TAG_DEFOCUS)
        if defocus:
            defocus.f_stop = prop("fo4_pp_dof_fstop", 1.4)

        return True, "Compositor updated from scene properties"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _remove_fo4_nodes(tree) -> None:
        """Delete all compositor nodes whose name starts with ``FO4_PP_``."""
        nodes = tree.nodes
        to_remove = [n for n in nodes if n.name.startswith("FO4_PP_")]
        for n in to_remove:
            nodes.remove(n)

    @staticmethod
    def _read_compositor_values(scene) -> dict:
        """Read current values from the FO4 compositor nodes (or scene props)."""
        data: dict = {}

        # Try to read live from scene props first (most reliable)
        def prop(name, default):
            return getattr(scene, name, default)

        data["bloom_strength"]    = prop("fo4_pp_bloom_strength",    0.4)
        data["bloom_threshold"]   = prop("fo4_pp_bloom_threshold",   0.8)
        data["bloom_radius"]      = prop("fo4_pp_bloom_radius",      0.3)
        data["saturation"]        = prop("fo4_pp_saturation",        1.0)
        data["contrast"]          = prop("fo4_pp_contrast",          1.0)
        data["brightness"]        = prop("fo4_pp_brightness",        0.0)
        data["tint_r"]            = prop("fo4_pp_tint_r",            1.0)
        data["tint_g"]            = prop("fo4_pp_tint_g",            1.0)
        data["tint_b"]            = prop("fo4_pp_tint_b",            1.0)
        data["tint_strength"]     = prop("fo4_pp_tint_strength",     0.0)
        data["vignette"]          = prop("fo4_pp_vignette",          0.25)
        data["cinematic_bars"]    = prop("fo4_pp_cinematic_bars",    0.0)
        data["dof_enabled"]       = prop("fo4_pp_dof_enabled",       False)
        data["dof_fstop"]         = prop("fo4_pp_dof_fstop",         1.4)
        data["eye_adapt_speed"]   = prop("fo4_pp_eye_adapt_speed",   2.0)
        data["eye_adapt_strength"]= prop("fo4_pp_eye_adapt_strength",0.5)
        data["white"]             = prop("fo4_pp_white",             1.0)
        data["preset_name"]       = prop("fo4_pp_preset",            "CUSTOM")

        return data


# ---------------------------------------------------------------------------
# Scene property registration helpers
# ---------------------------------------------------------------------------

def _update_compositor(self, context):
    """Called when any fo4_pp_* property changes."""
    try:
        PostProcessingHelpers.sync_from_scene_props(context.scene)
    except Exception:
        pass


def register():
    """Register FO4 post-processing scene properties."""

    # Active preset selector
    bpy.types.Scene.fo4_pp_preset = bpy.props.EnumProperty(
        name="Preset",
        description="Choose a Fallout 4 post-processing preset",
        items=PRESET_ENUM_ITEMS,
        default="VANILLA",
    )

    # ── Bloom ────────────────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_bloom_strength = bpy.props.FloatProperty(
        name="Bloom Strength",
        description="Intensity of the bloom / glare effect (CK: BloomScale)",
        default=0.4, min=0.0, max=2.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_bloom_threshold = bpy.props.FloatProperty(
        name="Bloom Threshold",
        description="Luminance cutoff before bloom fires (CK: BloomThreshold)",
        default=0.8, min=0.0, max=2.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_bloom_radius = bpy.props.FloatProperty(
        name="Bloom Radius",
        description="Radius of the bloom kernel 0-1 (CK: BloomBlurRadius)",
        default=0.3, min=0.0, max=1.0, step=1, precision=2,
        update=_update_compositor,
    )

    # ── Colour grading ───────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_saturation = bpy.props.FloatProperty(
        name="Saturation",
        description="Colour saturation: 0 = greyscale, 1 = normal (CK: Saturation)",
        default=1.0, min=0.0, max=3.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_contrast = bpy.props.FloatProperty(
        name="Contrast",
        description="Contrast multiplier: 1 = normal (CK: Contrast)",
        default=1.0, min=0.0, max=3.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_brightness = bpy.props.FloatProperty(
        name="Brightness",
        description="Additive brightness offset: 0 = normal",
        default=0.0, min=-1.0, max=1.0, step=1, precision=2,
        update=_update_compositor,
    )

    # ── Tint ─────────────────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_tint_r = bpy.props.FloatProperty(
        name="Tint R",
        description="Red component of the screen tint (CK: TintColor.R)",
        default=1.0, min=0.0, max=2.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_tint_g = bpy.props.FloatProperty(
        name="Tint G",
        description="Green component of the screen tint (CK: TintColor.G)",
        default=1.0, min=0.0, max=2.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_tint_b = bpy.props.FloatProperty(
        name="Tint B",
        description="Blue component of the screen tint (CK: TintColor.B)",
        default=1.0, min=0.0, max=2.0, step=1, precision=2,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_tint_strength = bpy.props.FloatProperty(
        name="Tint Strength",
        description="How strongly the tint overlays the frame (CK: TintColor.A)",
        default=0.0, min=0.0, max=1.0, step=1, precision=2,
        update=_update_compositor,
    )

    # ── Vignette ─────────────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_vignette = bpy.props.FloatProperty(
        name="Vignette",
        description="Darkness of the screen-edge vignette: 0 = off",
        default=0.25, min=0.0, max=1.0, step=1, precision=2,
        update=_update_compositor,
    )

    # ── Cinematic bars ───────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_cinematic_bars = bpy.props.FloatProperty(
        name="Cinematic Bars",
        description="Letterbox black-bar height 0 = none, 0.1 = subtle (CK: CinematicBars)",
        default=0.0, min=0.0, max=0.5, step=1, precision=2,
    )

    # ── Depth of Field ───────────────────────────────────────────────────────
    bpy.types.Scene.fo4_pp_dof_enabled = bpy.props.BoolProperty(
        name="Depth of Field",
        description="Enable depth-of-field defocus in the compositor preview",
        default=False,
        update=_update_compositor,
    )
    bpy.types.Scene.fo4_pp_dof_fstop = bpy.props.FloatProperty(
        name="f-stop",
        description="Lens f-stop (lower = more blur)",
        default=1.4, min=0.1, max=32.0, step=10, precision=1,
        update=_update_compositor,
    )

    # ── CK-only fields (not reproduced in compositor) ────────────────────────
    bpy.types.Scene.fo4_pp_eye_adapt_speed = bpy.props.FloatProperty(
        name="Eye Adapt Speed",
        description="How quickly HDR exposure adapts (CK: EyeAdaptSpeed)",
        default=2.0, min=0.0, max=10.0, step=10, precision=2,
    )
    bpy.types.Scene.fo4_pp_eye_adapt_strength = bpy.props.FloatProperty(
        name="Eye Adapt Strength",
        description="Maximum HDR exposure compensation (CK: EyeAdaptStrength)",
        default=0.5, min=0.0, max=2.0, step=1, precision=2,
    )
    bpy.types.Scene.fo4_pp_white = bpy.props.FloatProperty(
        name="White Level",
        description="Tonemapper white level (CK: White)",
        default=1.0, min=0.1, max=2.0, step=1, precision=2,
    )


def unregister():
    """Remove all FO4 post-processing scene properties."""
    _props = (
        "fo4_pp_preset",
        "fo4_pp_bloom_strength",
        "fo4_pp_bloom_threshold",
        "fo4_pp_bloom_radius",
        "fo4_pp_saturation",
        "fo4_pp_contrast",
        "fo4_pp_brightness",
        "fo4_pp_tint_r",
        "fo4_pp_tint_g",
        "fo4_pp_tint_b",
        "fo4_pp_tint_strength",
        "fo4_pp_vignette",
        "fo4_pp_cinematic_bars",
        "fo4_pp_dof_enabled",
        "fo4_pp_dof_fstop",
        "fo4_pp_eye_adapt_speed",
        "fo4_pp_eye_adapt_strength",
        "fo4_pp_white",
    )
    for p in _props:
        if hasattr(bpy.types.Scene, p):
            try:
                delattr(bpy.types.Scene, p)
            except Exception:
                pass
