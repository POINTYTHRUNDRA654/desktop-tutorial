"""
NVIDIA Texture Tools (NVTT) integration helper
Provides DDS texture conversion functionality for Fallout 4 modding
"""

from __future__ import annotations

import bpy
import os
import subprocess
import shutil
from pathlib import Path

from . import preferences

class NVTTHelpers:
    """Helper functions for NVIDIA Texture Tools integration"""
    
    @staticmethod
    def is_nvtt_available():
        """Check if NVIDIA Texture Tools (nvcompress) is available in PATH or prefs."""
        return NVTTHelpers.get_nvtt_path() is not None
    
    @staticmethod
    def get_nvtt_path():
        """Get the path to nvcompress executable (pref override or PATH)."""
        configured = preferences.get_configured_nvcompress_path()
        if configured:
            return configured
        nvcompress_path = shutil.which('nvcompress')
        return nvcompress_path if nvcompress_path else None

    @staticmethod
    def is_texconv_available():
        """Check if texconv is available in PATH or prefs."""
        return NVTTHelpers.get_texconv_path() is not None

    @staticmethod
    def get_texconv_path():
        """Get path to texconv executable (pref override or PATH)."""
        configured = preferences.get_configured_texconv_path()
        if configured:
            return configured
        texconv_path = shutil.which('texconv')
        return texconv_path if texconv_path else None
    
    @staticmethod
    def check_nvtt_installation():
        """Check NVTT installation and return status message."""
        if NVTTHelpers.is_nvtt_available():
            nvtt_path = NVTTHelpers.get_nvtt_path()
            return True, f"NVIDIA Texture Tools found at: {nvtt_path}"
        install_msg = (
            "NVIDIA Texture Tools not found. To install:\n"
            "- Preferred: set nvcompress in add-on preferences (path or folder)\n"
            "- Or put nvcompress in PATH. Source: gh repo clone castano/nvidia-texture-tools\n"
            "- Or use DirectXTex texconv (add path in preferences)"
        )
        return False, install_msg

    @staticmethod
    def check_texconv_installation():
        """Check texconv installation and return status message."""
        if NVTTHelpers.is_texconv_available():
            return True, f"texconv found at: {NVTTHelpers.get_texconv_path()}"
        return False, "texconv not found. Run tools/install_texconv.ps1 or set path in preferences."

    @staticmethod
    def _find_converter(preferred: str | None):
        """Pick available converter. Returns (tool, path, message)."""
        preferred = (preferred or "auto").lower()

        nv_path = NVTTHelpers.get_nvtt_path()
        tex_path = NVTTHelpers.get_texconv_path()

        if preferred == "nvtt" and nv_path:
            return "nvtt", nv_path, None
        if preferred == "texconv" and tex_path:
            return "texconv", tex_path, None

        # Auto: prefer nvtt if available, else texconv
        if nv_path:
            return "nvtt", nv_path, None
        if tex_path:
            return "texconv", tex_path, None

        return None, None, "No converter found (nvcompress or texconv). Configure paths in preferences."

    @staticmethod
    def _texconv_format(format_lower: str) -> str:
        mapping = {
            "bc1": "BC1_UNORM",
            "bc3": "BC3_UNORM",
            "bc5": "BC5_UNORM",
            "bc7": "BC7_UNORM",
            "dxt1": "BC1_UNORM",
            "dxt5": "BC3_UNORM",
            "ati2": "BC5_UNORM",
        }
        return mapping.get(format_lower)
    
    @staticmethod
    def convert_to_dds(input_path, output_path=None, compression_format='bc1', quality='production', preferred_tool=None):
        """
        Convert an image to DDS format using nvcompress or texconv
        
        Args:
            input_path: Path to input image (PNG, JPG, TGA, etc.)
            output_path: Path for output DDS file (optional, defaults to input_path with .dds extension)
            compression_format: DDS compression format
                - 'bc1' (DXT1): For diffuse textures without alpha
                - 'bc3' (DXT5): For textures with alpha channel
                - 'bc5' (ATI2): For normal maps
            quality: Compression quality ('fastest', 'normal', 'production', 'highest')
        
        Returns: (bool success, str message)
        """
        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"

        if output_path is None:
            output_path = os.path.splitext(input_path)[0] + '.dds'

        valid_formats = {
            'bc1': 'DXT1',
            'bc3': 'DXT5',
            'bc5': 'ATI2',
            'bc7': 'BC7',
            'dxt1': 'DXT1',
            'dxt5': 'DXT5',
            'ati2': 'ATI2'
        }

        format_lower = compression_format.lower()
        if format_lower not in valid_formats:
            return False, f"Invalid compression format: {compression_format}. Use bc1, bc3, bc5, or bc7"

        tool, tool_path, tool_message = NVTTHelpers._find_converter(preferred_tool)
        if not tool:
            return False, tool_message

        try:
            if tool == "nvtt":
                cmd = [
                    tool_path,
                    f'-{format_lower}',
                    f'-{quality}',
                    input_path,
                    output_path
                ]
            else:  # texconv
                texconv_format = NVTTHelpers._texconv_format(format_lower)
                if not texconv_format:
                    return False, f"texconv does not support format: {compression_format}"

                out_dir = os.path.dirname(output_path) or os.getcwd()
                os.makedirs(out_dir, exist_ok=True)
                cmd = [
                    tool_path,
                    "-y",
                    "-f", texconv_format,
                    "-o", out_dir,
                    input_path,
                ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=90
            )

            if result.returncode == 0:
                expected = output_path
                if not os.path.exists(expected):
                    # texconv may uppercase extension
                    alt = os.path.splitext(output_path)[0] + '.DDS'
                    expected = alt if os.path.exists(alt) else output_path
                if os.path.exists(expected):
                    file_size = os.path.getsize(expected)
                    size_kb = file_size / 1024
                    return True, f"Converted ({tool}) to DDS ({compression_format.upper()}): {expected} ({size_kb:.1f} KB)"
                return False, f"Conversion completed but output file not found: {expected}"

            error_msg = result.stderr if result.stderr else result.stdout
            return False, f"{tool} failed: {error_msg}"

        except subprocess.TimeoutExpired:
            return False, "Texture conversion timed out (90 seconds)"
        except Exception as e:
            return False, f"Failed to convert texture: {str(e)}"
    
    @staticmethod
    def batch_convert_textures(texture_list, output_dir=None, compression_map=None, preferred_tool=None):
        """
        Convert multiple textures to DDS format
        
        Args:
            texture_list: List of (input_path, texture_type) tuples
            output_dir: Directory for output files (optional)
            compression_map: Dict mapping texture_type to compression format
        
        Returns: (int success_count, list results)
        """
        if compression_map is None:
            # Default compression formats for different texture types
            compression_map = {
                'DIFFUSE': 'bc1',    # DXT1 for diffuse
                'NORMAL': 'bc5',     # ATI2 for normal maps
                'SPECULAR': 'bc1',   # DXT1 for specular
                'ALPHA': 'bc3',      # DXT5 for textures with alpha
            }
        
        success_count = 0
        results = []
        
        for input_path, texture_type in texture_list:
            # Determine compression format
            compression = compression_map.get(texture_type, 'bc1')
            
            # Determine output path
            if output_dir:
                filename = os.path.basename(input_path)
                base_name = os.path.splitext(filename)[0]
                output_path = os.path.join(output_dir, base_name + '.dds')
            else:
                output_path = None
            
            # Convert
            success, message = NVTTHelpers.convert_to_dds(
                input_path,
                output_path,
                compression,
                preferred_tool=preferred_tool,
            )
            
            results.append({
                'input': input_path,
                'type': texture_type,
                'success': success,
                'message': message
            })
            
            if success:
                success_count += 1
        
        return success_count, results
    
    @staticmethod
    def get_texture_type_for_node(node_name):
        """
        Determine texture type from node name
        Returns: texture type string for compression mapping
        """
        node_name_lower = node_name.lower()
        
        if 'diffuse' in node_name_lower or 'color' in node_name_lower or 'albedo' in node_name_lower:
            return 'DIFFUSE'
        elif 'normal' in node_name_lower:
            return 'NORMAL'
        elif 'specular' in node_name_lower or 'spec' in node_name_lower:
            return 'SPECULAR'
        elif 'alpha' in node_name_lower or 'opacity' in node_name_lower:
            return 'ALPHA'
        else:
            return 'DIFFUSE'  # Default
    
    @staticmethod
    def convert_object_textures(obj, output_dir, preferred_tool=None):
        """
        Convert all textures used by an object to DDS format
        
        Args:
            obj: Blender object
            output_dir: Directory to save converted textures
        
        Returns: (bool success, str message, list converted_files)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", []
        
        if not obj.data.materials:
            return False, "Object has no materials", []
        
        tool, path, msg = NVTTHelpers._find_converter(preferred_tool)
        if not tool:
            return False, msg, []
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Collect textures from material
        texture_list = []
        
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    # Get image file path
                    img = node.image
                    if img.filepath:
                        # Get absolute path
                        img_path = bpy.path.abspath(img.filepath)
                        if os.path.exists(img_path):
                            texture_type = NVTTHelpers.get_texture_type_for_node(node.name)
                            texture_list.append((img_path, texture_type))
        
        if not texture_list:
            return False, "No textures found in object materials", []
        
        # Convert textures
        success_count, results = NVTTHelpers.batch_convert_textures(
            texture_list,
            output_dir,
            preferred_tool=tool,
        )
        
        # Collect converted file paths
        converted_files = []
        for result in results:
            if result['success']:
                # Extract output path from message
                if 'converted to DDS' in result['message']:
                    parts = result['message'].split(': ')
                    if len(parts) >= 2:
                        path_part = parts[1].split(' (')[0]
                        converted_files.append(path_part)
        
        if success_count > 0:
            message = f"Converted {success_count}/{len(texture_list)} textures to DDS format"
            return True, message, converted_files
        else:
            return False, "Failed to convert any textures", []

def register():
    """Register NVTT helper functions"""
    pass

def unregister():
    """Unregister NVTT helper functions"""
    pass
