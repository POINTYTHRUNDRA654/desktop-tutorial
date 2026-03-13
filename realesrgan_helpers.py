"""
Real-ESRGAN integration helper
Provides AI-powered texture upscaling functionality for Fallout 4 modding
"""

import bpy
import os
import subprocess
import shutil
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Availability check TTL cache
# ---------------------------------------------------------------------------
# Refreshed at most once every 5 seconds so the UI doesn't hammer the
# filesystem or PATH lookup on every redraw, but picks up a successful
# install within a few seconds.
_avail_cache: dict = {"ts": 0.0, "result": None, "status": None}
_CACHE_TTL = 5.0  # seconds


class RealESRGANHelpers:
    """Helper functions for Real-ESRGAN integration"""

    @staticmethod
    def _local_ncnn_exe() -> str | None:
        """Return the path to the locally-installed NCNN Vulkan binary (if any).

        The add-on installs the binary into the tools directory via
        :func:`tool_installers.install_realesrgan_ncnn`.  This helper looks
        there first so the binary does **not** need to be on PATH.
        """
        try:
            from . import tool_installers
            exe = tool_installers.get_realesrgan_ncnn_exe()
            if exe and exe.is_file():
                return str(exe)
        except Exception:
            pass
        return None

    @staticmethod
    def _local_weights_dir() -> str | None:
        """Return the local model-weights directory (if it has any .pth files)."""
        try:
            from . import tool_installers
            d = tool_installers.get_realesrgan_weights_dir()
            if d.exists() and any(d.glob("*.pth")):
                return str(d)
        except Exception:
            pass
        return None

    @staticmethod
    def _resolve_vulkan_exe() -> str | None:
        """Return the best available NCNN Vulkan executable path or None.

        Checks (in order):
          1. Locally installed binary in ``tools/realesrgan/bin/``.
          2. Binary found on the system PATH.
        """
        local = RealESRGANHelpers._local_ncnn_exe()
        if local:
            return local
        return shutil.which('realesrgan-ncnn-vulkan')

    @staticmethod
    def is_realesrgan_available() -> bool:
        """Return True if any Real-ESRGAN method is ready to run.

        Result is cached for up to 5 seconds to avoid hammering the filesystem
        on every UI redraw.  The cache is invalidated automatically so a
        successful one-click install is reflected within a few seconds.
        """
        now = time.monotonic()
        if now - _avail_cache["ts"] < _CACHE_TTL and _avail_cache["result"] is not None:
            return _avail_cache["result"]

        # 1. Locally installed NCNN Vulkan binary (preferred)
        if RealESRGANHelpers._local_ncnn_exe():
            _avail_cache.update(ts=now, result=True)
            return True
        # 2. NCNN Vulkan binary found on PATH
        if shutil.which('realesrgan-ncnn-vulkan'):
            _avail_cache.update(ts=now, result=True)
            return True
        # 3. Python package (basicsr / realesrgan)
        try:
            import importlib.util
            if importlib.util.find_spec('basicsr') is not None:
                _avail_cache.update(ts=now, result=True)
                return True
        except Exception:
            pass

        _avail_cache.update(ts=now, result=False)
        return False

    @staticmethod
    def get_install_status() -> tuple[bool, str]:
        """Return (available, human-readable status string) for UI display.

        Result is cached for up to 5 seconds (same TTL as
        :meth:`is_realesrgan_available`).
        """
        now = time.monotonic()
        if now - _avail_cache["ts"] < _CACHE_TTL and _avail_cache["status"] is not None:
            return _avail_cache["result"], _avail_cache["status"]

        local_exe = RealESRGANHelpers._local_ncnn_exe()
        if local_exe:
            status = f"NCNN Vulkan ready: {os.path.basename(local_exe)}"
            _avail_cache.update(ts=now, result=True, status=status)
            return True, status
        if shutil.which('realesrgan-ncnn-vulkan'):
            status = "NCNN Vulkan ready (PATH)"
            _avail_cache.update(ts=now, result=True, status=status)
            return True, status
        try:
            import importlib.util
            if importlib.util.find_spec('basicsr') is not None:
                status = "Python (basicsr) ready"
                _avail_cache.update(ts=now, result=True, status=status)
                return True, status
        except Exception:
            pass
        status = "Not installed — click 'Install AI Upscaler'"
        _avail_cache.update(ts=now, result=False, status=status)
        return False, status

    @staticmethod
    def get_realesrgan_path():
        """Return (path_or_sentinel, method) for the best available method.

        Checks (in order):
          1. Locally installed NCNN Vulkan binary in tools dir.
          2. NCNN Vulkan binary on PATH.
          3. Python package (basicsr).
        """
        local_exe = RealESRGANHelpers._local_ncnn_exe()
        if local_exe:
            return local_exe, 'vulkan'
        vulkan_path = shutil.which('realesrgan-ncnn-vulkan')
        if vulkan_path:
            return vulkan_path, 'vulkan'
        try:
            import importlib.util
            if importlib.util.find_spec('basicsr') is not None:
                return 'python', 'python'
        except Exception:
            pass
        return None, None

    @staticmethod
    def check_realesrgan_installation():
        """Check Real-ESRGAN installation and return a detailed status message.

        Returns: (bool success, str message)
        """
        available, status = RealESRGANHelpers.get_install_status()
        if available:
            return True, f"Real-ESRGAN is ready — {status}"
        return False, (
            "Real-ESRGAN is not installed yet.\n\n"
            "Click 'Install AI Upscaler' in the Texture Helpers panel for a "
            "fully automatic one-click installation. No external subscriptions "
            "or manual steps required."
        )

    @staticmethod
    def upscale_texture_vulkan(input_path, output_path=None, scale=4,
                               model='realesr-animevideov3', exe_path=None):
        """Upscale a texture using the Real-ESRGAN NCNN Vulkan binary.

        Args:
            input_path: Path to input texture
            output_path: Path for output (optional; derived from input if omitted)
            scale: Upscale factor (2 or 4)
            model: Model name passed to the binary (``-n`` flag)
            exe_path: Explicit path to the NCNN Vulkan executable.  When
                *None* (default) the method resolves the binary automatically
                from the local tools directory or system PATH.

        Returns: (bool success, str message)
        """
        # Resolve executable: explicit arg > local tools dir > PATH
        if exe_path is None:
            exe_path = RealESRGANHelpers._resolve_vulkan_exe()
        if not exe_path:
            return False, (
                "Real-ESRGAN NCNN Vulkan executable not found. "
                "Click 'Install AI Upscaler' to download it automatically."
            )

        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"

        # Determine output path
        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_upscaled{ext}"

        try:
            cmd = [
                exe_path,
                '-i', input_path,
                '-o', output_path,
                '-s', str(scale),
                '-n', model,
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes
            )

            if result.returncode == 0 and os.path.exists(output_path):
                size_mb = os.path.getsize(output_path) / (1024 * 1024)
                return True, (
                    f"Texture upscaled {scale}x successfully: "
                    f"{output_path} ({size_mb:.1f} MB)"
                )
            else:
                # Some tools write errors to stdout instead of stderr — capture both.
                error_msg = (result.stderr.strip() or result.stdout.strip()
                             or f"exit code {result.returncode}")
                return False, f"Upscaling failed: {error_msg}"

        except subprocess.TimeoutExpired:
            return False, "Texture upscaling timed out (5 minutes)"
        except Exception as e:
            return False, f"Failed to upscale texture: {str(e)}"

    @staticmethod
    def upscale_texture_python(input_path, output_path=None, scale=4, model='RealESRGAN_x4plus'):
        """Upscale texture using the Real-ESRGAN Python package.

        Args:
            input_path: Path to input texture
            output_path: Path for output (optional; derived from input if omitted)
            scale: Upscale factor (2 or 4)
            model: Model name (e.g. 'RealESRGAN_x4plus', 'RealESRGAN_x2plus')

        Returns: (bool success, str message)
        """
        try:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer
            import numpy as np
            import cv2
        except Exception:
            return False, (
                "Real-ESRGAN Python dependencies not installed or failed to load. "
                "Install with: pip install realesrgan basicsr. "
                "If already installed, check for version compatibility issues "
                "(e.g. torchvision/torch version mismatch)."
            )

        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"

        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_upscaled{ext}"

        try:
            # Load input image (keep alpha channel if present)
            img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
            if img is None:
                return False, f"Failed to load image: {input_path}"

            # Select the correct RRDBNet architecture for the requested model
            if model in ('RealESRGAN_x4plus', 'RealESRNet_x4plus'):
                net = RRDBNet(
                    num_in_ch=3, num_out_ch=3,
                    num_feat=64, num_block=23, num_grow_ch=32, scale=4
                )
                netscale = 4
            elif model == 'RealESRGAN_x2plus':
                net = RRDBNet(
                    num_in_ch=3, num_out_ch=3,
                    num_feat=64, num_block=23, num_grow_ch=32, scale=2
                )
                netscale = 2
            elif model in ('RealESRGAN_x4plus_anime_6B',):
                net = RRDBNet(
                    num_in_ch=3, num_out_ch=3,
                    num_feat=64, num_block=6, num_grow_ch=32, scale=4
                )
                netscale = 4
            else:
                # Generic fallback: x4 architecture
                net = RRDBNet(
                    num_in_ch=3, num_out_ch=3,
                    num_feat=64, num_block=23, num_grow_ch=32, scale=4
                )
                netscale = 4

            # Locate model weights.
            # Priority: local tools weights dir → realesrgan_path weights/
            # RealESRGANer will attempt to download if model_path is None.
            model_path_candidates: list[str] = []
            local_weights = RealESRGANHelpers._local_weights_dir()
            if local_weights:
                model_path_candidates.append(
                    os.path.join(local_weights, f"{model}.pth")
                )
            try:
                from . import tool_installers
                rdir = str(tool_installers.get_realesrgan_weights_dir())
                model_path_candidates.append(os.path.join(rdir, f"{model}.pth"))
            except Exception:
                pass
            model_weights_path = next(
                (p for p in model_path_candidates if os.path.exists(p)),
                None,
            )

            # RealESRGANer will attempt to download the model if model_path is None
            upsampler = RealESRGANer(
                scale=netscale,
                model_path=model_weights_path,
                model=net,
                tile=0,
                tile_pad=10,
                pre_pad=0,
                half=False,
            )

            # Run upscaling
            output, _ = upsampler.enhance(img, outscale=scale)

            # Save result
            cv2.imwrite(output_path, output)
            return True, f"Upscaled to {output_path} (×{scale})"

        except Exception as e:
            return False, f"Failed to upscale texture: {str(e)}"

    @staticmethod
    def upscale_texture(input_path, output_path=None, scale=4, method='auto'):
        """Upscale texture using best available method.

        Args:
            input_path: Path to input texture
            output_path: Path for output (optional)
            scale: Upscale factor (2 or 4)
            method: 'auto', 'vulkan', or 'python'

        Returns: (bool success, str message)
        """
        path, detected_method = RealESRGANHelpers.get_realesrgan_path()

        if not path:
            return False, (
                "Real-ESRGAN is not installed. "
                "Click 'Install AI Upscaler' in the Texture Helpers panel to "
                "download it automatically (no external accounts required)."
            )

        # Determine which method to use
        if method == 'auto':
            method = detected_method

        if method == 'vulkan':
            # Pass the resolved executable path so upscale_texture_vulkan does
            # not have to re-resolve it (avoids a second shutil.which call and
            # ensures the locally-installed binary is always used).
            exe = path if path != 'python' else None
            return RealESRGANHelpers.upscale_texture_vulkan(
                input_path, output_path, scale, exe_path=exe
            )
        elif method == 'python':
            return RealESRGANHelpers.upscale_texture_python(
                input_path, output_path, scale
            )
        else:
            return False, f"Unknown upscaling method: {method}"

    @staticmethod
    def batch_upscale_textures(texture_list, output_dir, scale=4):
        """Upscale multiple textures.

        Args:
            texture_list: List of input texture paths
            output_dir: Directory for output files
            scale: Upscale factor

        Returns: (int success_count, list results)
        """
        os.makedirs(output_dir, exist_ok=True)

        success_count = 0
        results = []

        for input_path in texture_list:
            filename = os.path.basename(input_path)
            base_name, ext = os.path.splitext(filename)
            output_path = os.path.join(output_dir, f"{base_name}_upscaled{ext}")

            success, message = RealESRGANHelpers.upscale_texture(
                input_path, output_path, scale
            )

            results.append({
                'input':   input_path,
                'output':  output_path if success else None,
                'success': success,
                'message': message,
            })

            if success:
                success_count += 1

        return success_count, results

    @staticmethod
    def upscale_object_textures(obj, output_dir, scale=4):
        """Upscale all textures used by a mesh object.

        Args:
            obj: Blender object
            output_dir: Directory to save upscaled textures
            scale: Upscale factor (2 or 4)

        Returns: (bool success, str message, list upscaled_files)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", []

        if not obj.data.materials:
            return False, "Object has no materials", []

        if not RealESRGANHelpers.is_realesrgan_available():
            return False, (
                "Real-ESRGAN is not installed. "
                "Click 'Install AI Upscaler' in the Texture Helpers panel."
            ), []

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Collect textures from material nodes
        texture_list = []
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    img = node.image
                    if img.filepath:
                        img_path = bpy.path.abspath(img.filepath)
                        if os.path.exists(img_path):
                            texture_list.append(img_path)

        if not texture_list:
            return False, "No textures found in object materials", []

        success_count, results = RealESRGANHelpers.batch_upscale_textures(
            texture_list, output_dir, scale
        )

        upscaled_files = [r['output'] for r in results if r['success'] and r['output']]

        if success_count > 0:
            return True, f"Upscaled {success_count}/{len(texture_list)} textures ({scale}x)", upscaled_files
        return False, "Failed to upscale any textures", []

    @staticmethod
    def _nearest_power_of_two(n):
        """Return the nearest power of two >= *n* (minimum 1).

        When *n* is exactly a power of two it is returned unchanged.
        When *n* falls between two powers of two, the closer one is chosen;
        ties round up.
        """
        if n < 1:
            return 1
        p = 1
        while p < n:
            p <<= 1
        # p is the first power-of-two >= n.
        if p == n or (p - n) <= (n - p // 2):
            return p
        return p // 2

    @staticmethod
    def upscale_krea_legacy_style(input_path, output_path=None, scale=4):
        """Upscale a texture using a KREA AI Legacy-style approach.

        Uses Real-ESRGAN (RealESRGAN_x4plus model) when available for the best
        quality result.  Falls back to high-quality Lanczos upscaling combined
        with an unsharp-mask sharpening pass to approximate the crisp, detailed
        output characteristic of the KREA AI Legacy upscaler.

        Args:
            input_path: Path to the input texture file
            output_path: Destination path (optional; derived from input if omitted)
            scale: Integer upscale factor (2 or 4)

        Returns: (bool success, str message)
        """
        if not os.path.exists(input_path):
            return False, f"Input file not found: {input_path}"

        if output_path is None:
            base, ext = os.path.splitext(input_path)
            output_path = f"{base}_krea_legacy{ext}"

        # Prefer Real-ESRGAN when available — highest quality
        if RealESRGANHelpers.is_realesrgan_available():
            path, method = RealESRGANHelpers.get_realesrgan_path()
            if method == 'python':
                success, message = RealESRGANHelpers.upscale_texture_python(
                    input_path, output_path, scale, model='RealESRGAN_x4plus'
                )
                if success:
                    return True, f"Texture upscaled {scale}x (KREA AI Legacy style via Real-ESRGAN): {output_path}"
                # Fall through to PIL fallback on failure
            elif method == 'vulkan':
                success, message = RealESRGANHelpers.upscale_texture_vulkan(
                    input_path, output_path, scale,
                    model='realesrgan-x4plus',
                    exe_path=path,
                )
                if success:
                    return True, f"Texture upscaled {scale}x (KREA AI Legacy style via Real-ESRGAN Vulkan): {output_path}"
                # Fall through to PIL fallback on failure

        # Fallback: Lanczos + unsharp mask (always available with Pillow)
        try:
            from PIL import Image, ImageFilter, ImageEnhance
        except ImportError:
            return False, (
                "Neither Real-ESRGAN nor Pillow is available. "
                "Install Pillow with: pip install Pillow"
            )

        try:
            img = Image.open(input_path)
            orig_width, orig_height = img.size

            # Round to the nearest power of 2 (Fallout 4 requirement).
            new_width  = RealESRGANHelpers._nearest_power_of_two(orig_width  * scale)
            new_height = RealESRGANHelpers._nearest_power_of_two(orig_height * scale)

            # High-quality Lanczos resample
            upscaled = img.resize((new_width, new_height), Image.LANCZOS)

            # Unsharp mask to recover fine detail (KREA Legacy characteristic sharpness)
            upscaled = upscaled.filter(
                ImageFilter.UnsharpMask(radius=1.5, percent=130, threshold=3)
            )

            # Subtle contrast boost for richer appearance
            upscaled = ImageEnhance.Contrast(upscaled).enhance(1.05)

            upscaled.save(output_path)
            return True, (
                f"Texture upscaled to {new_width}×{new_height} (KREA AI Legacy style): {output_path}. "
                "Convert to DDS (BC1/BC3/BC5) before importing into Fallout 4."
            )
        except Exception as e:
            return False, f"Failed to upscale texture: {str(e)}"

    @staticmethod
    def get_recommended_scale(image_width, image_height):
        """Get recommended upscale factor based on current resolution.

        Returns: int scale factor (2 or 4)
        """
        if image_width <= 512 or image_height <= 512:
            return 4
        elif image_width <= 1024 or image_height <= 1024:
            return 2
        return 1

    @staticmethod
    def estimate_output_size(input_path, scale):
        """Estimate output file size after upscaling.

        Returns: tuple (width, height, estimated_size_mb)
        """
        try:
            import cv2
            img = cv2.imread(input_path)
            if img is not None:
                h, w = img.shape[:2]
                new_w = w * scale
                new_h = h * scale
                # Rough estimate: assume PNG compression
                estimated_size = (new_w * new_h * 3) / (1024 * 1024) * 0.3
                return new_w, new_h, estimated_size
        except Exception:
            pass
        return None, None, None


def register():
    """Register Real-ESRGAN helper functions"""
    pass

def unregister():
    """Unregister Real-ESRGAN helper functions"""
    pass

