"""
Texture helper functions for Fallout 4 mod creation
"""

import bpy
import os

class TextureHelpers:
    """Helper functions for texture setup and validation"""

    # ---------------------------------------------------------------------------
    # Fallout 4 texture naming conventions
    # FO4 .dds textures follow strict suffixes recognised by the game engine:
    #   _d  – diffuse/albedo colour map        (BC1 or BC3 with alpha)
    #   _n  – tangent-space normal map          (BC5 / ATI2N)
    #   _s  – specular / smoothness map         (BC1)
    #   _g  – glow / emissive mask              (BC1)
    #   _e  – environment / cube-map mask       (BC1)
    # The helpers use these conventions for auto-detection and compression.
    # ---------------------------------------------------------------------------
    _FO4_SUFFIX_MAP = {
        '_d': 'DIFFUSE',
        '_n': 'NORMAL',
        '_s': 'SPECULAR',
        '_g': 'GLOW',
        '_e': 'EMISSIVE',
    }

    @staticmethod
    def detect_fo4_texture_type(filepath):
        """Return the FO4 texture type for *filepath* based on its filename suffix.

        Fallout 4 uses a strict `_<letter>` suffix convention immediately before
        the ``.dds`` extension.  For example ``rust_metal_d.dds`` is a diffuse
        map and ``rust_metal_n.dds`` is a normal map.

        Returns one of: ``'DIFFUSE'``, ``'NORMAL'``, ``'SPECULAR'``, ``'GLOW'``,
        ``'EMISSIVE'``, or ``'DIFFUSE'`` as the safe default when no recognised
        suffix is found.
        """
        if not filepath:
            return 'DIFFUSE'
        stem = os.path.splitext(os.path.basename(filepath))[0].lower()
        for suffix, tex_type in TextureHelpers._FO4_SUFFIX_MAP.items():
            if stem.endswith(suffix):
                return tex_type
        return 'DIFFUSE'

    @staticmethod
    def setup_fo4_material(obj):
        """Setup a Fallout 4 compatible material for the object"""
        if obj.type != 'MESH':
            return None
        
        # Create new material
        mat_name = f"{obj.name}_FO4_Material"
        mat = bpy.data.materials.new(name=mat_name)
        mat.use_nodes = True
        
        # Clear default nodes
        nodes = mat.node_tree.nodes
        nodes.clear()
        
        # Create shader nodes for Fallout 4 material
        # Output node
        output_node = nodes.new(type='ShaderNodeOutputMaterial')
        output_node.location = (500, 0)
        
        # Principled BSDF (main shader)
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.location = (100, 0)
        
        # Diffuse / base-colour texture (_d)
        # Niftools (io_scene_niftools) identifies texture slots via a CONTAINS
        # check on the node label against TEX_SLOTS constants defined in
        # io_scene_niftools/utils/consts.py.  TEX_SLOTS.BASE = "Base" — so the
        # label MUST contain "Base".  "Diffuse" is NOT in the recognised set and
        # raises "Do not know how to export texture node … with label 'Diffuse'."
        diffuse_tex = nodes.new(type='ShaderNodeTexImage')
        diffuse_tex.name = "Base"
        diffuse_tex.label = "Base"
        diffuse_tex.location = (-400, 300)

        # Normal map texture (_n) — label "Normal" → Niftools TEX_SLOTS.NORMAL
        normal_tex = nodes.new(type='ShaderNodeTexImage')
        normal_tex.name = "Normal"
        normal_tex.label = "Normal"
        normal_tex.location = (-400, 0)
        # Colorspace will be set when image is loaded in install_texture
        
        # Normal map node
        normal_map = nodes.new(type='ShaderNodeNormalMap')
        normal_map.location = (-100, 0)
        
        # Specular texture (_s) — label "Specular" → Niftools TEX_SLOTS.SPECULAR
        specular_tex = nodes.new(type='ShaderNodeTexImage')
        specular_tex.name = "Specular"
        specular_tex.label = "Specular"
        specular_tex.location = (-400, -300)
        # Colorspace will be set when image is loaded in install_texture

        # Glow / emissive texture (_g) — label "Glow" → Niftools TEX_SLOTS.GLOW
        glow_tex = nodes.new(type='ShaderNodeTexImage')
        glow_tex.name = "Glow"
        glow_tex.label = "Glow"
        glow_tex.location = (-400, -600)
        
        # Connect nodes
        links = mat.node_tree.links
        links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
        links.new(diffuse_tex.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
        links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
        # 'Specular' was renamed to 'Specular IOR Level' in Blender 4.0
        specular_input = bsdf.inputs.get('Specular IOR Level') or bsdf.inputs.get('Specular')
        if specular_input:
            links.new(specular_tex.outputs['Color'], specular_input)
        # Glow/emissive → Emission input
        emission_input = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
        if emission_input:
            links.new(glow_tex.outputs['Color'], emission_input)
        
        # Assign material to object
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
        
        return mat
    
    @staticmethod
    def install_texture(obj, texture_path, texture_type='DIFFUSE'):
        """Install a texture into the object's material.

        *texture_type* accepts both the FO4 node-name convention (``'Diffuse'``,
        ``'Normal'``, ``'Specular'``, ``'Glow'``, ``'Emissive'``) and the
        upper-case enum used elsewhere in the add-on (``'DIFFUSE'``, ``'NORMAL'``,
        ``'SPECULAR'``, ``'GLOW'``, ``'EMISSIVE'``).  If *texture_path* is given
        and *texture_type* is omitted, :meth:`detect_fo4_texture_type` will
        auto-detect the type from the FO4 filename suffix.
        """
        if not obj.data.materials:
            return False, "Object has no materials"
        
        mat = obj.data.materials[0]
        if not mat.use_nodes:
            return False, "Material does not use nodes"

        # Auto-detect type from filename suffix if caller left it at the default
        # and the path has a recognisable FO4 suffix.
        detected = TextureHelpers.detect_fo4_texture_type(texture_path)
        if texture_type == 'DIFFUSE' and detected != 'DIFFUSE':
            texture_type = detected

        # Normalise to the internal node-name key (upper-case enum).
        texture_type = texture_type.upper()
        
        # Find the appropriate texture node.
        # Node names match the niftools TEX_SLOTS canonical labels:
        #   DIFFUSE → "Base"  (TEX_SLOTS.BASE)
        #   NORMAL  → "Normal"
        #   SPECULAR→ "Specular"
        #   GLOW    → "Glow"
        node_name_map = {
            'DIFFUSE':  'Base',
            'NORMAL':   'Normal',
            'SPECULAR': 'Specular',
            'GLOW':     'Glow',
            'EMISSIVE': 'Glow',   # EMISSIVE and GLOW share the same node slot
        }
        
        node_name = node_name_map.get(texture_type)
        if not node_name:
            return False, f"Unknown texture type: {texture_type}"
        
        # Find the texture node
        tex_node = mat.node_tree.nodes.get(node_name)
        if not tex_node:
            return False, f"Material does not have a {node_name} texture node"
        
        # Load the image
        if not os.path.exists(texture_path):
            return False, f"Texture file not found: {texture_path}"
        
        try:
            img = bpy.data.images.load(texture_path)
            tex_node.image = img

            # ----------------------------------------------------------------
            # FO4 colorspace requirements:
            #   Diffuse  → sRGB  (Blender default – gamma-correct colour data)
            #   Normal   → Non-Color (raw tangent-space vectors, no gamma)
            #   Specular → Non-Color (linear greyscale / RGB mask)
            #   Glow     → Non-Color (linear emissive mask)
            # ----------------------------------------------------------------
            if texture_type in ('NORMAL', 'SPECULAR', 'GLOW', 'EMISSIVE'):
                img.colorspace_settings.name = 'Non-Color'
            else:
                # Diffuse – ensure sRGB so the NIF exporter gets correct colour
                img.colorspace_settings.name = 'sRGB'

            # ----------------------------------------------------------------
            # DDS check – Fallout 4 requires DDS textures in-game.
            # Accepted formats per slot:
            #   DIFFUSE  → BC1 (DXT1) or BC3 (DXT5) if alpha is needed
            #   NORMAL   → BC5 (ATI2 / two-channel tangent-space)
            #   SPECULAR → BC1 (DXT1)
            #   GLOW     → BC1 (DXT1)
            # ----------------------------------------------------------------
            _FO4_FORMAT_HINT = {
                'DIFFUSE':  'BC1 (DXT1) – or BC3 if alpha is needed',
                'NORMAL':   'BC5 (ATI2) – two-channel tangent-space',
                'SPECULAR': 'BC1 (DXT1)',
                'GLOW':     'BC1 (DXT1)',
                'EMISSIVE': 'BC1 (DXT1)',
            }
            is_dds = os.path.splitext(texture_path)[1].lower() == '.dds'
            if is_dds:
                return True, f"{texture_type} texture installed: {os.path.basename(texture_path)}"
            else:
                fmt_hint = _FO4_FORMAT_HINT.get(texture_type, 'BC1 (DXT1)')
                return True, (
                    f"{texture_type} texture installed: {os.path.basename(texture_path)}. "
                    f"IMPORTANT: Fallout 4 requires DDS in-game. "
                    f"Convert to DDS using '{fmt_hint}' before exporting your NIF."
                )
        except Exception as e:
            return False, f"Failed to load texture: {str(e)}"
    
    @staticmethod
    def setup_vegetation_material(obj):
        """Setup a Fallout 4 vegetation / foliage material for *obj*.

        This is a wrapper around :meth:`setup_fo4_material` that additionally
        configures the material for vegetation-specific rendering requirements:

        * **Alpha Clip** (``blend_mode = 'CLIP'``) – uses an alpha test so that
          transparent pixels in the diffuse texture (e.g. leaf edges) are
          discarded on the GPU rather than blended.  In Fallout 4 this maps to
          the ``Alpha_Testing`` flag on the BSLightingShaderProperty with a
          threshold of 128 (0x80).  Use ``Alpha Clip`` in Blender for cutout
          foliage; ``Alpha Blend`` is reserved for translucent glass/water.

        * **Two-sided rendering** (``use_backface_culling = False``) – grass
          planes and leaf cards are single-face quads that must be visible from
          both the front and back.  Disabling backface culling in Blender
          matches the ``Two_Sided`` flag written into the NIF's
          BSLightingShaderProperty by Niftools.

        * **Alpha threshold 0.5** – Blender maps ``alpha_threshold = 0.5`` to
          the 0–1 range; the Niftools exporter writes this as 128/255 (the FO4
          default cutoff).

        Returns the created / modified material, or ``None`` if the object is
        not a mesh.
        """
        mat = TextureHelpers.setup_fo4_material(obj)
        if mat is None:
            return None

        # Alpha Clip → BSLightingShaderProperty.Alpha_Testing in the NIF.
        # Must be 'CLIP' (not 'HASHED' or 'BLEND') so Niftools emits the
        # correct Alpha_Testing flag rather than an alpha blend setup.
        try:
            mat.blend_mode = 'CLIP'
        except (AttributeError, TypeError):
            pass

        # Alpha threshold 0.5 → 128/255 which is the FO4 standard cutoff.
        try:
            mat.alpha_threshold = 0.5
        except (AttributeError, TypeError):
            pass

        # Disable backface culling so grass/leaf quads render from both sides.
        # This corresponds to the BSLightingShaderProperty Two_Sided flag.
        try:
            mat.use_backface_culling = False
        except (AttributeError, TypeError):
            pass

        # Shadow mode must also be set to 'CLIP' for correct alpha shadows in
        # Blender 3.x/4.x preview.
        try:
            mat.shadow_method = 'CLIP'
        except (AttributeError, TypeError):
            pass

        return mat

    @staticmethod
    def validate_textures(obj):
        """Validate textures for Fallout 4 compatibility"""
        issues = []

        if not obj.data.materials:
            issues.append("Object has no materials")
            return False, issues

        mat = obj.data.materials[0]

        if not mat.use_nodes:
            issues.append("Material does not use nodes")
            return False, issues

        # ----------------------------------------------------------------
        # Per-slot requirements
        # ----------------------------------------------------------------
        # slot name → (required, expected_colorspace, fo4_dds_format)
        # Node names match TEX_SLOTS constants from niftools consts.py.
        _SLOT_SPEC = {
            'Base':     (True,  'sRGB',      'BC1 (DXT1) or BC3 (DXT5) if alpha'),
            'Normal':   (True,  'Non-Color', 'BC5 (ATI2) – two-channel tangent-space'),
            'Specular': (False, 'Non-Color', 'BC1 (DXT1)'),
            'Glow':     (False, 'Non-Color', 'BC1 (DXT1)'),
        }

        nodes = mat.node_tree.nodes

        for tex_name, (required, expected_cs, dds_fmt) in _SLOT_SPEC.items():
            tex_node = nodes.get(tex_name)
            if not tex_node:
                if required:
                    issues.append(f"Missing {tex_name} texture node")
                continue

            if not tex_node.image:
                # No image assigned to this slot – skip further checks.
                # An empty slot is not a blocking error: the user may load
                # textures later or the mesh may be exported untextured.
                continue

            img = tex_node.image

            # Dimension check
            if img.size[0] == 0 or img.size[1] == 0:
                issues.append(f"{tex_name} texture has invalid size (0×0)")
                continue

            width, height = img.size[0], img.size[1]
            if not ((width & (width - 1)) == 0):
                issues.append(
                    f"{tex_name} width ({width}px) is not a power of 2 "
                    "(FO4 requires 512, 1024, 2048, or 4096)"
                )
            if not ((height & (height - 1)) == 0):
                issues.append(
                    f"{tex_name} height ({height}px) is not a power of 2 "
                    "(FO4 requires 512, 1024, 2048, or 4096)"
                )

            # Colorspace check
            cs = getattr(getattr(img, 'colorspace_settings', None), 'name', None)
            if cs:
                # Non-Color and Raw are both acceptable for data textures
                ok_for_data = cs in ('Non-Color', 'Raw')
                if expected_cs == 'Non-Color' and not ok_for_data:
                    issues.append(
                        f"{tex_name} colorspace is '{cs}' – must be 'Non-Color' "
                        "to avoid incorrect values when the NIF exporter reads the texture"
                    )
                elif expected_cs == 'sRGB' and cs not in ('sRGB', 'Linear Rec.709', 'Filmic Log'):
                    # 'sRGB' is the standard Blender name for gamma-correct colour data.
                    # 'Linear Rec.709' / 'Filmic Log' appear in some ACES/filmic configs
                    # and are also acceptable for diffuse colour textures.
                    issues.append(
                        f"{tex_name} colorspace is '{cs}' – expected 'sRGB' "
                        "for correct colour in Fallout 4"
                    )

            # DDS format check – FO4 REQUIRES DDS textures in-game
            filepath = bpy.path.abspath(img.filepath) if img.filepath else ''
            ext = os.path.splitext(filepath)[1].lower() if filepath else ''
            if filepath and ext != '.dds':
                issues.append(
                    f"{tex_name} is not a DDS file ({os.path.basename(filepath)}). "
                    f"Fallout 4 requires DDS format in-game. "
                    f"Convert using {dds_fmt} before exporting your NIF."
                )

        if not issues:
            return True, ["All textures are valid for Fallout 4 NIF export"]

        return False, issues

def register():
    """Register texture helper functions"""
    pass

def unregister():
    """Unregister texture helper functions"""
    pass
