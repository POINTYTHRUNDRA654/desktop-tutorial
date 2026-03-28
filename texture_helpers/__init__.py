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
        
        # Diffuse texture (_d)
        diffuse_tex = nodes.new(type='ShaderNodeTexImage')
        diffuse_tex.name = "Diffuse"
        diffuse_tex.label = "Diffuse (_d)"
        diffuse_tex.location = (-400, 300)
        
        # Normal map texture (_n)
        normal_tex = nodes.new(type='ShaderNodeTexImage')
        normal_tex.name = "Normal"
        normal_tex.label = "Normal Map (_n)"
        normal_tex.location = (-400, 0)
        # Colorspace will be set when image is loaded in install_texture
        
        # Normal map node
        normal_map = nodes.new(type='ShaderNodeNormalMap')
        normal_map.location = (-100, 0)
        
        # Specular texture (_s)
        specular_tex = nodes.new(type='ShaderNodeTexImage')
        specular_tex.name = "Specular"
        specular_tex.label = "Specular (_s)"
        specular_tex.location = (-400, -300)
        # Colorspace will be set when image is loaded in install_texture

        # Glow / emissive texture (_g)
        glow_tex = nodes.new(type='ShaderNodeTexImage')
        glow_tex.name = "Glow"
        glow_tex.label = "Glow/Emissive (_g)"
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
        
        # Find the appropriate texture node
        node_name_map = {
            'DIFFUSE':  'Diffuse',
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
            
            # Non-colour textures must use 'Non-Color' colorspace so Blender
            # does not apply gamma correction before the NIF exporter reads them.
            if texture_type in ('NORMAL', 'SPECULAR', 'GLOW', 'EMISSIVE'):
                img.colorspace_settings.name = 'Non-Color'
            
            return True, f"Texture installed successfully: {texture_type}"
        except Exception as e:
            return False, f"Failed to load texture: {str(e)}"
    
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
        
        # Check for required texture nodes
        required_textures = ['Diffuse', 'Normal']
        nodes = mat.node_tree.nodes
        
        for tex_name in required_textures:
            tex_node = nodes.get(tex_name)
            if not tex_node:
                issues.append(f"Missing {tex_name} texture node")
            elif not tex_node.image:
                issues.append(f"{tex_name} texture is not loaded")
            else:
                # Check image properties
                img = tex_node.image
                if img.size[0] == 0 or img.size[1] == 0:
                    issues.append(f"{tex_name} texture has invalid size")
                
                # Check if dimensions are power of 2 (recommended for FO4)
                width, height = img.size[0], img.size[1]
                if not (width & (width - 1) == 0 and width != 0):
                    issues.append(f"{tex_name} width is not power of 2 (recommended: 512, 1024, 2048)")
                if not (height & (height - 1) == 0 and height != 0):
                    issues.append(f"{tex_name} height is not power of 2 (recommended: 512, 1024, 2048)")

                # Normal maps must use Non-Color colorspace.  Using sRGB causes
                # Blender to apply gamma correction and produces wrong tangent-
                # space vectors when the NIF exporter reads the image data.
                if tex_name == 'Normal':
                    cs = getattr(getattr(img, 'colorspace_settings', None), 'name', None)
                    if cs and cs not in ('Non-Color', 'Raw'):
                        issues.append(
                            f"Normal map colorspace is '{cs}' – must be 'Non-Color' "
                            "(Image Properties > Colorspace) to avoid washed-out "
                            "normals in Fallout 4"
                        )
        
        if not issues:
            return True, ["Textures are valid for Fallout 4"]
        
        return False, issues

def register():
    """Register texture helper functions and conversion operators"""
    from . import conversion_operators
    conversion_operators.register()

def unregister():
    """Unregister texture helper functions and conversion operators"""
    from . import conversion_operators
    conversion_operators.unregister()
