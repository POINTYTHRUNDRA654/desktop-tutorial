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


# ---------------------------------------------------------------------------
# Slot-aware format detection
# ---------------------------------------------------------------------------

# Mapping from texture slot name to DDS compression format.
# Slot names are returned by detect_slot_from_filename().
FORMAT_FOR_SLOT: dict[str, str] = {
    'diffuse':  'bc7',   # sRGB colour – BC7 for high quality
    'normal':   'bc5',   # two-channel tangent-space
    'specular': 'bc4',   # single-channel smoothspec / gloss mask
    'glow':     'bc7',   # emissive / glow
    'envmask':  'bc7',   # environment / cube-map mask
    'unknown':  'bc7',   # safe high-quality default
}


def detect_slot_from_filename(filename: str) -> str:
    """Detect the FO4 texture slot from a filename suffix.

    Checks the stem (without extension) for the standard FO4 suffixes:
      ``_d`` → diffuse
      ``_n`` → normal
      ``_s`` → specular / smoothspec
      ``_g`` → glow / emissive
      ``_e`` → environment / cube-map mask
      ``_r`` → roughness / reflection mask (treated as specular)

    Parameters
    ----------
    filename : str
        Filename or full path; only the stem (no extension) is examined.

    Returns
    -------
    str
        One of ``'diffuse'``, ``'normal'``, ``'specular'``, ``'glow'``,
        ``'envmask'``, or ``'unknown'``.
    """
    stem = Path(filename).stem  # strip extension
    # FO4 suffixes are typically the last two characters of the stem
    suffix = stem[-2:].lower() if len(stem) >= 2 else ""
    mapping = {
        '_d': 'diffuse',
        '_n': 'normal',
        '_s': 'specular',
        '_g': 'glow',
        '_e': 'envmask',
        '_r': 'specular',   # roughness – treat as specular channel
    }
    return mapping.get(suffix, 'unknown')


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
            "- Or put nvcompress in PATH. Source: https://github.com/castano/nvidia-texture-tools\n"
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
            "bc4": "BC4_UNORM",
            "bc5": "BC5_UNORM",
            "bc7": "BC7_UNORM",
            "dxt1": "BC1_UNORM",
            "dxt5": "BC3_UNORM",
            "ati2": "BC5_UNORM",
        }
        return mapping.get(format_lower)

    @staticmethod
    def get_fo4_dds_format(texture_type: str) -> str:
        """Return the recommended DDS compression format for a given FO4 texture type.

        Fallout 4 uses specific DDS block-compression formats for each texture
        channel.  This helper encodes the official recommendations so every
        part of the add-on uses a single source of truth:

        +-----------+---------+---------------------------------------------+
        | Type      | Format  | Reason                                      |
        +===========+=========+=============================================+
        | DIFFUSE   | BC1     | RGB colour without alpha – smallest size    |
        | DIFFUSE_A | BC3     | RGB colour *with* alpha (cutout/opacity)    |
        | NORMAL    | BC5     | Two-channel (R+G) tangent-space normals     |
        | SPECULAR  | BC1     | RGB smoothness/specular colour              |
        | GLOW      | BC1     | Greyscale or RGB emissive/glow mask         |
        | EMISSIVE  | BC1     | Alias for GLOW                              |
        | ALPHA     | BC3     | Any texture that stores an alpha channel   |
        | HIGH_QUAL | BC7     | High-quality variant (slower, larger)      |
        +-----------+---------+---------------------------------------------+

        Pass the result directly to :meth:`convert_to_dds`.
        """
        fmt_map = {
            'DIFFUSE':     'bc1',
            'DIFFUSE_A':   'bc3',  # diffuse with transparency/alpha
            'NORMAL':      'bc5',  # ATI2 / two-channel tangent-space
            'SPECULAR':    'bc1',
            'GLOW':        'bc1',
            'EMISSIVE':    'bc1',
            'ENVIRONMENT': 'bc1',  # cube-map mask (BC1 – greyscale/RGB)
            'ENV':         'bc1',
            'ALPHA':       'bc3',  # any texture with an alpha channel
            'HIGH_QUAL':   'bc7',  # high-quality (slower to compress)
        }
        return fmt_map.get(texture_type.upper(), 'bc1')
    
    @staticmethod
    def convert_to_dds(input_path, output_path=None, compression_format='bc1',
                       quality='production', preferred_tool=None, slot: str = None):
        """
        Convert an image to DDS format using nvcompress or texconv.

        The compression format can be chosen explicitly via *compression_format*,
        or automatically detected from the texture slot.  When *slot* is ``None``
        (the default) the slot is inferred from the filename using
        :func:`detect_slot_from_filename` and :data:`FORMAT_FOR_SLOT`.  Passing
        an explicit *compression_format* always overrides the slot-based selection.

        Args:
            input_path: Path to input image (PNG, JPG, TGA, etc.)
            output_path: Path for output DDS file (optional, defaults to input_path with .dds extension)
            compression_format: DDS compression format
                - 'bc1' (DXT1): For diffuse textures without alpha
                - 'bc3' (DXT5): For textures with alpha channel
                - 'bc4':        Single-channel masks (specular, gloss)
                - 'bc5' (ATI2): For normal maps
                - 'bc7':        High-quality (default for slot-based auto-selection)
            quality: Compression quality ('fastest', 'normal', 'production', 'highest')
            preferred_tool: 'nvtt', 'texconv', or None (auto)
            slot: Optional texture slot name ('diffuse', 'normal', 'specular',
                  'glow', 'envmask', 'unknown').  When given, overrides the
                  filename-based detection but is still overridden by an
                  explicit *compression_format* that differs from the default.

        Returns: (bool success, str message)
        """
        # Auto-select format from slot when the caller left compression_format
        # at its default value ('bc1').  An explicit non-default format is
        # always honoured without modification.
        if compression_format == 'bc1':
            resolved_slot = slot if slot is not None else detect_slot_from_filename(
                input_path
            )
            compression_format = FORMAT_FOR_SLOT.get(resolved_slot, 'bc7')
        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"

        if output_path is None:
            output_path = os.path.splitext(input_path)[0] + '.dds'

        valid_formats = {
            'bc1': 'DXT1',
            'bc3': 'DXT5',
            'bc4': 'BC4',   # single-channel greyscale (masks, AO, gloss)
            'bc5': 'ATI2',
            'bc7': 'BC7',
            'dxt1': 'DXT1',
            'dxt5': 'DXT5',
            'ati2': 'ATI2'
        }

        format_lower = compression_format.lower()
        if format_lower not in valid_formats:
            return False, f"Invalid compression format: {compression_format}. Use bc1, bc3, bc4, bc5, or bc7"

        tool, tool_path, tool_message = NVTTHelpers._find_converter(preferred_tool)
        if not tool:
            return False, tool_message

        # nvcompress (nvtt) does not support PNG input — convert to TGA first.
        # texconv handles PNG fine so this only applies to the nvtt path.
        _tmp_tga = None
        try:
            if tool == "nvtt" and str(input_path).lower().endswith(".png"):
                import tempfile
                _tmp_fd, _tmp_tga = tempfile.mkstemp(suffix=".tga")
                os.close(_tmp_fd)
                _converted = False
                # Try Pillow first (fast, no bpy dependency)
                try:
                    from PIL import Image as _PILImage
                    with _PILImage.open(input_path) as _im:
                        _im.save(_tmp_tga, format="TGA")
                    _converted = True
                except ImportError:
                    pass
                # Fall back to bpy image save
                if not _converted:
                    try:
                        import bpy as _bpy
                        _img = _bpy.data.images.load(input_path)
                        _img.file_format = 'TARGA'
                        _img.filepath_raw = _tmp_tga
                        _img.save()
                        _bpy.data.images.remove(_img)
                        _converted = True
                    except Exception:
                        pass
                # Last resort: pure-Python PNG→TGA via struct+zlib (no Pillow/bpy needed)
                if not _converted:
                    try:
                        import struct as _struct, zlib as _zlib
                        with open(input_path, "rb") as _pf:
                            _png = _pf.read()
                        # Parse PNG IHDR to get dimensions
                        _w = _struct.unpack(">I", _png[16:20])[0]
                        _h = _struct.unpack(">I", _png[20:24])[0]
                        # Decompress IDAT chunks
                        _idat = b""
                        _pos = 8
                        while _pos < len(_png) - 12:
                            _clen = _struct.unpack(">I", _png[_pos:_pos+4])[0]
                            _ctype = _png[_pos+4:_pos+8]
                            if _ctype == b"IDAT":
                                _idat += _png[_pos+8:_pos+8+_clen]
                            _pos += 12 + _clen
                        _raw = zlib.decompress(_idat)
                        # Reconstruct scanlines (filter byte per row)
                        _stride = _w * 4  # assume RGBA
                        _pixels = b""
                        for _row in range(_h):
                            _offset = _row * (_stride + 1) + 1
                            _pixels += _raw[_offset:_offset + _stride]
                        # Write 32-bit TGA (BGRA)
                        _bgra = bytearray()
                        for _i in range(0, len(_pixels), 4):
                            r, g, b, a = _pixels[_i], _pixels[_i+1], _pixels[_i+2], _pixels[_i+3]
                            _bgra += bytes([b, g, r, a])
                        _tga_hdr = _struct.pack('<BBBHHBHHHHBB',
                            0,0,2,0,0,0,0,0,0,0,_w,_h,32,0x20)
                        with open(_tmp_tga, "wb") as _tf:
                            _tf.write(_tga_hdr + bytes(_bgra))
                        _converted = True
                    except Exception as _py_err:
                        print(f"[NVTT] Pure-Python PNG→TGA fallback failed: {_py_err}")

                if _converted:
                    input_path = _tmp_tga
                else:
                    os.unlink(_tmp_tga)
                    _tmp_tga = None

        except Exception as _conv_err:
            print(f"[NVTT] PNG→TGA pre-convert warning: {_conv_err}")
            _tmp_tga = None

        try:
            if tool == "nvtt":
                cmd = [
                    tool_path,
                    f'-{format_lower}',
                    f'-{quality}',
                    '-mipmap',      # FO4 requires a full mip chain in DDS files
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
                    "-y",           # overwrite existing output
                    "-nologo",      # suppress version banner
                    "-m", "0",      # generate full mip chain (FO4 requirement)
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
        finally:
            # Clean up temporary TGA file created for nvcompress PNG workaround
            if _tmp_tga and os.path.exists(_tmp_tga):
                try:
                    os.unlink(_tmp_tga)
                except Exception:
                    pass

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
            # Default compression formats for FO4 texture types.
            # These match the recommendations in get_fo4_dds_format() and the
            # official FO4 modding guidelines.
            compression_map = {
                'DIFFUSE':     'bc1',  # DXT1 – RGB diffuse without alpha
                'NORMAL':      'bc5',  # ATI2 – two-channel tangent-space normals
                'SPECULAR':    'bc1',  # DXT1 – RGB specular / smoothness
                'GLOW':        'bc1',  # DXT1 – glow / emissive mask
                'EMISSIVE':    'bc1',  # DXT1 – alias for glow
                'ENVIRONMENT': 'bc1',  # DXT1 – cube-map environment mask
                'ENV':         'bc1',  # DXT1 – alias for environment
                'ALPHA':       'bc3',  # DXT5 – any texture with an alpha channel
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
        elif 'glow' in node_name_lower or 'emissive' in node_name_lower or 'emission' in node_name_lower:
            return 'GLOW'
        elif 'environment' in node_name_lower or 'env' in node_name_lower or 'cubemap' in node_name_lower:
            return 'ENVIRONMENT'
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


# ---------------------------------------------------------------------------
# Mossy AI texture routing
# ---------------------------------------------------------------------------

def _route_texture_via_mossy(image_path: str, fmt: str = "dds",
                              quality: str = "high") -> tuple:
    """Route texture conversion/compression through Mossy AI.

    Mossy handles NVTT/texconv externally so Blender does not need local
    CLI tools installed.  Returns (success, result_path_or_error).
    """
    try:
        import base64, os, tempfile
        from . import mossy_link
        with open(image_path, "rb") as fh:
            img_b64 = base64.b64encode(fh.read()).decode("utf-8")
        result = mossy_link.process_texture(
            image_data_base64=img_b64, fmt=fmt, quality=quality, timeout=60
        )
        if result and result.get("status") == "success":
            tex_data = result.get("texture_data", "")
            if tex_data:
                ext = "." + result.get("format", fmt)
                tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                tmp.write(base64.b64decode(tex_data))
                tmp.close()
                return True, tmp.name
        return False, result.get("message", "Mossy returned no texture data") if result else "Mossy offline"
    except Exception as exc:
        return False, f"Mossy texture route error: {exc}"


def register():
    """Register NVTT helper functions"""
    pass

def unregister():
    """Unregister NVTT helper functions"""
    pass
