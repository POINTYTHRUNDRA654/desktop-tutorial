"""
Texture helper functions for Fallout 4 mod creation
"""

import bpy
import os

class TextureHelpers:
    """Helper functions for texture setup and validation"""
    
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
        output_node.location = (400, 0)
        
        # Principled BSDF (main shader)
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.location = (0, 0)
        
        # Diffuse texture
        diffuse_tex = nodes.new(type='ShaderNodeTexImage')
        diffuse_tex.name = "Diffuse"
        diffuse_tex.label = "Diffuse (Color)"
        diffuse_tex.location = (-400, 300)
        
        # Normal map texture
        normal_tex = nodes.new(type='ShaderNodeTexImage')
        normal_tex.name = "Normal"
        normal_tex.label = "Normal Map"
        normal_tex.location = (-400, 0)
        # Colorspace will be set when image is loaded in install_texture
        
        # Normal map node
        normal_map = nodes.new(type='ShaderNodeNormalMap')
        normal_map.location = (-200, 0)
        
        # Specular texture
        specular_tex = nodes.new(type='ShaderNodeTexImage')
        specular_tex.name = "Specular"
        specular_tex.label = "Specular"
        specular_tex.location = (-400, -300)
        # Colorspace will be set when image is loaded in install_texture
        
        # Connect nodes
        links = mat.node_tree.links
        links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
        links.new(diffuse_tex.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
        links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
        links.new(specular_tex.outputs['Color'], bsdf.inputs['Specular'])
        
        # Assign material to object
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
        
        return mat
    
    @staticmethod
    def install_texture(obj, texture_path, texture_type='DIFFUSE'):
        """Install a texture into the object's material"""
        if not obj.data.materials:
            return False, "Object has no materials"
        
        mat = obj.data.materials[0]
        if not mat.use_nodes:
            return False, "Material does not use nodes"
        
        # Find the appropriate texture node
        node_name_map = {
            'DIFFUSE': 'Diffuse',
            'NORMAL': 'Normal',
            'SPECULAR': 'Specular'
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
            
            # Set colorspace for non-color textures
            if texture_type in ['NORMAL', 'SPECULAR']:
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
        
        if not issues:
            return True, ["Textures are valid for Fallout 4"]
        
        return False, issues

def register():
    """Register texture helper functions"""
    pass

def unregister():
    """Unregister texture helper functions"""
    pass
