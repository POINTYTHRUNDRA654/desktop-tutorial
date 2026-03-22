"""
Shap-E Integration for Fallout 4 Add-on
Text-to-3D and Image-to-3D generation using OpenAI's Shap-E
"""

import atexit
import multiprocessing
import multiprocessing.connection  # explicit sub-module import required for type annotations
import threading
import time
from pathlib import Path
from typing import Any, Dict

try:
    import bpy  # type: ignore
except ImportError:  # pragma: no cover - worker processes run without Blender
    bpy = None
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty

# ---------------------------------------------------------------------------
# Module-level model cache — models are expensive to load (several seconds),
# so we keep them alive between generation calls and only reload when the
# active compute device changes.
#
# The transmitter (xm) is shared between text and image pipelines — loading
# it twice wastes VRAM and initialization time when both modes are used in
# the same session.
# ---------------------------------------------------------------------------
_shap_e_transmitter = None   # dict: {xm, device}  -- shared between text & image
_shap_e_text_models = None   # dict: {model, diffusion, device}
_shap_e_image_models = None  # dict: {model, diffusion, device}

# Background worker state (keeps heavy models out of the UI thread)
_SHAP_E_WORKER_PROC: multiprocessing.Process | None = None
_SHAP_E_WORKER_CONN: multiprocessing.connection.Connection | None = None
_SHAP_E_WORKER_LOCK = threading.Lock()


def _pytorch_required_message(detail=""):
    """Return a user-friendly message explaining that PyTorch must be installed."""
    msg = (
        "PyTorch (torch) is required but not installed.\n\n"
        "To install PyTorch, run in Blender's Python:\n"
        "   pip install torch torchvision\n\n"
        "For GPU (CUDA) support, see: https://pytorch.org/get-started/locally/"
    )
    if detail:
        msg += f"\n\nError: {detail}"
    return msg


def _stop_shap_e_worker():
    """Terminate the Shap-E worker process and clean up its connection."""
    global _SHAP_E_WORKER_PROC, _SHAP_E_WORKER_CONN
    if _SHAP_E_WORKER_CONN is not None:
        try:
            _SHAP_E_WORKER_CONN.send({"cmd": "stop"})
        except Exception:
            pass
        try:
            _SHAP_E_WORKER_CONN.close()
        except Exception:
            pass

    if _SHAP_E_WORKER_PROC is not None:
        try:
            _SHAP_E_WORKER_PROC.join(timeout=0.2)
            if _SHAP_E_WORKER_PROC.is_alive():
                _SHAP_E_WORKER_PROC.kill()
        except Exception:
            pass

    _SHAP_E_WORKER_PROC = None
    _SHAP_E_WORKER_CONN = None


def _shap_e_worker_main(conn: multiprocessing.connection.Connection):
    """Background worker loop that keeps heavy models off the UI thread."""
    while True:
        try:
            message = conn.recv()
        except EOFError:
            break

        if not isinstance(message, dict):
            continue

        cmd = message.get("cmd")
        payload: Dict[str, Any] = message.get("payload", {}) or {}

        if cmd == "stop":
            break

        try:
            if cmd == "text":
                result = ShapEHelpers.generate_from_text(**payload)
            elif cmd == "image":
                result = ShapEHelpers.generate_from_image(**payload)
            else:
                result = (False, f"Unknown Shap-E command: {cmd}")
        except Exception as exc:  # pragma: no cover - defensive against torch failures
            result = (False, f"Shap-E worker error: {exc}")

        try:
            conn.send(result)
        except Exception:
            break

    try:
        conn.close()
    except Exception:
        pass


def _ensure_shap_e_worker() -> bool:
    """Start the Shap-E worker if needed."""
    global _SHAP_E_WORKER_PROC, _SHAP_E_WORKER_CONN
    if _SHAP_E_WORKER_PROC is not None and _SHAP_E_WORKER_PROC.is_alive():
        return True

    _stop_shap_e_worker()

    try:
        ctx = multiprocessing.get_context("spawn")
        parent_conn, child_conn = ctx.Pipe()
        proc = ctx.Process(target=_shap_e_worker_main, args=(child_conn,))
        proc.daemon = True
        proc.start()
        child_conn.close()
        _SHAP_E_WORKER_PROC = proc
        _SHAP_E_WORKER_CONN = parent_conn
        return True
    except Exception:
        _stop_shap_e_worker()
        return False


def _dispatch_shap_e_job(cmd: str, payload: Dict[str, Any]):
    """Send a generation request to the background worker."""
    with _SHAP_E_WORKER_LOCK:
        if not _ensure_shap_e_worker() or _SHAP_E_WORKER_CONN is None:
            return False, "Shap-E worker unavailable. Check installation and retry."

        try:
            _SHAP_E_WORKER_CONN.send({"cmd": cmd, "payload": payload})
            return _SHAP_E_WORKER_CONN.recv()
        except EOFError:
            _stop_shap_e_worker()
            return False, "Shap-E worker crashed during generation. Please retry."
        except Exception as exc:
            _stop_shap_e_worker()
            return False, f"Shap-E worker communication failed: {exc}"


atexit.register(_stop_shap_e_worker)


def _load_shap_e_transmitter(device, torch_module):
    """Load (or return cached) the shared Shap-E transmitter (xm).

    The transmitter is used by both text-to-3D and image-to-3D for decoding
    latents into meshes, so it is cached once and reused across both pipelines.
    """
    global _shap_e_transmitter
    device_str = str(torch_module.device(device))
    if _shap_e_transmitter is not None and _shap_e_transmitter['device'] == device_str:
        return _shap_e_transmitter

    from shap_e.models.download import load_model

    print("Loading Shap-E transmitter (shared, first use or device change)…")
    xm = load_model('transmitter', device=device)
    xm.eval()
    if torch_module.device(device).type == 'cuda':
        xm.half()
        # cudnn auto-tuner picks the fastest convolution algorithm for the
        # fixed input sizes used during inference — one-time benchmark cost,
        # then faster on every subsequent forward pass.
        torch_module.backends.cudnn.benchmark = True
    if hasattr(torch_module, 'compile') and torch_module.device(device).type == 'cuda':
        print("Compiling Shap-E transmitter with torch.compile() (one-time, ~15 s)…")
        xm = torch_module.compile(xm, mode="reduce-overhead")
    _shap_e_transmitter = {'xm': xm, 'device': device_str}
    print("Shap-E transmitter loaded and cached.")
    return _shap_e_transmitter


def _load_shap_e_text_models(device):
    """Load (or return cached) Shap-E text-to-3D models.

    Models are cached by device string.  If the user switches between CPU and
    GPU the cache is invalidated and models are reloaded on the new device.
    The transmitter is shared with the image pipeline via _load_shap_e_transmitter.
    """
    global _shap_e_text_models
    import torch as _torch
    device_str = str(_torch.device(device))
    if _shap_e_text_models is not None and _shap_e_text_models['device'] == device_str:
        return _shap_e_text_models

    from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
    from shap_e.models.download import load_model, load_config

    print("Loading Shap-E text model (first use or device change)…")
    # Load the shared transmitter first (cached after first call).
    _load_shap_e_transmitter(device, _torch)
    model = load_model('text300M', device=device)
    diffusion = diffusion_from_config(load_config('diffusion'))
    # Eval mode disables Dropout / BatchNorm training-time overhead.
    model.eval()
    # Pre-convert to half precision on CUDA to halve GPU memory bandwidth and
    # avoid per-step autocast conversion overhead.
    if _torch.device(device).type == 'cuda':
        model.half()
    # torch.compile() (PyTorch ≥ 2.0) fuses ops into optimized CUDA kernels,
    # giving ~20-40 % faster inference.  The one-time compilation cost is paid
    # here at cache-fill time, so all subsequent generation calls are fast.
    if hasattr(_torch, 'compile') and _torch.device(device).type == 'cuda':
        print("Compiling Shap-E text300M with torch.compile() (one-time, ~20 s)…")
        model = _torch.compile(model, mode="reduce-overhead")
    _shap_e_text_models = {'model': model, 'diffusion': diffusion, 'device': device_str}
    print("Shap-E text model loaded and cached.")
    return _shap_e_text_models


def _load_shap_e_image_models(device):
    """Load (or return cached) Shap-E image-to-3D models.

    Models are cached by device string.  If the user switches between CPU and
    GPU the cache is invalidated and models are reloaded on the new device.
    The transmitter is shared with the text pipeline via _load_shap_e_transmitter.
    """
    global _shap_e_image_models
    import torch as _torch
    device_str = str(_torch.device(device))
    if _shap_e_image_models is not None and _shap_e_image_models['device'] == device_str:
        return _shap_e_image_models

    from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
    from shap_e.models.download import load_model, load_config

    print("Loading Shap-E image model (first use or device change)…")
    # Load the shared transmitter first (cached after first call).
    _load_shap_e_transmitter(device, _torch)
    model = load_model('image300M', device=device)
    diffusion = diffusion_from_config(load_config('diffusion'))
    # Eval mode disables Dropout / BatchNorm training-time overhead.
    model.eval()
    # Pre-convert to half precision on CUDA to halve GPU memory bandwidth and
    # avoid per-step autocast conversion overhead.
    if _torch.device(device).type == 'cuda':
        model.half()
    # torch.compile() (PyTorch ≥ 2.0) fuses ops into optimized CUDA kernels,
    # giving ~20-40 % faster inference.  The one-time compilation cost is paid
    # here at cache-fill time, so all subsequent generation calls are fast.
    if hasattr(_torch, 'compile') and _torch.device(device).type == 'cuda':
        print("Compiling Shap-E image300M with torch.compile() (one-time, ~20 s)…")
        model = _torch.compile(model, mode="reduce-overhead")
    _shap_e_image_models = {'model': model, 'diffusion': diffusion, 'device': device_str}
    print("Shap-E image model loaded and cached.")
    return _shap_e_image_models


class ShapEHelpers:
    """Helper functions for Shap-E integration"""

    # Cache for is_shap_e_installed() — avoids repeated torch/shap_e import attempts
    # on every Blender UI redraw.
    _cache = None
    _cache_time = 0.0
    _CACHE_TTL = 5.0  # seconds

    @staticmethod
    def clear_cache():
        """Force the next availability check to re-scan (call after install completes)."""

    @staticmethod
    def _dll_init_error_message():
        """Return a user-friendly message when WinError 1114 (DLL init failure) occurs.

        This error typically means a CUDA-version mismatch between the installed
        PyTorch and the system GPU driver, or a missing Visual C++ Redistributable.
        Example path that fails: D:\\blender_torch\\torch\\lib\\c10.dll
        """
        return (
            "PyTorch DLL initialisation failed (WinError 1114).\n"
            "This usually means a CUDA/driver version mismatch.\n"
            "A file such as D:\\blender_torch\\torch\\lib\\c10.dll could not be loaded.\n\n"
            "Suggested fixes:\n"
            "1. Reinstall PyTorch matching your CUDA toolkit version:\n"
            "   https://pytorch.org/get-started/locally/\n"
            "2. Install the latest Visual C++ Redistributable from Microsoft:\n"
            "   https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
            "3. Update your GPU driver to one compatible with your CUDA version.\n"
            "4. If no GPU is present, install the CPU-only PyTorch build."
        )

        ShapEHelpers._cache = None
        ShapEHelpers._cache_time = 0.0

    @staticmethod
    def is_shap_e_installed():
        """Check if Shap-E is installed (result cached for 5 s)."""
        now = time.monotonic()
        if (ShapEHelpers._cache is not None and
                (now - ShapEHelpers._cache_time) < ShapEHelpers._CACHE_TTL):
            return ShapEHelpers._cache
        result = ShapEHelpers._is_shap_e_installed_uncached()
        ShapEHelpers._cache = result
        ShapEHelpers._cache_time = now
        return result

    @staticmethod
    def peek_cached_installation():
        """Return cached installation status without performing a new check."""
        if ShapEHelpers._cache is None:
            return None, "Status not checked (click Check Installation)"
        return ShapEHelpers._cache

    @staticmethod
    def _is_shap_e_installed_uncached():
        """Perform the actual (uncached) Shap-E installation check."""
        try:
            # Prefer locally managed tool paths if the user has a repo clone.
            try:
                from . import tool_installers
                import sys as _sys
                for candidate in (
                    *tool_installers.candidate_tool_paths("shap-e"),
                    *tool_installers.candidate_tool_paths("shap_e"),
                ):
                    repo_pkg = Path(candidate) / "shap_e"
                    if repo_pkg.exists():
                        cand_str = str(candidate)
                        if cand_str not in _sys.path:
                            _sys.path.insert(0, cand_str)
            except Exception:
                pass

            # Try to use TorchPathManager if available
            try:
                from . import torch_path_manager
                success, msg, torch_module = torch_path_manager.TorchPathManager.try_import_torch()
                if not success:
                    if msg == "windows_path_error":
                        return False, (
                            "Windows path length error detected. PyTorch cannot load due to Windows MAX_PATH limitation.\n\n"
                            "Quick Fix - Click the button below to auto-install PyTorch to D:/t\n"
                            "Or manually:\n"
                            "1. Enable long paths in Windows (Recommended):\n"
                            "   - Run 'gpedit.msc' > Computer Config > Admin Templates > System > Filesystem\n"
                            "   - Enable 'Win32 long paths', restart\n\n"
                            "2. Install PyTorch in a shorter path:\n"
                            "   - Create venv in C:\\t\n"
                            "   - Install PyTorch there"
                        )
                    elif msg == "dll_init_error":
                        return False, ShapEHelpers._dll_init_error_message()
                    else:
                        return False, _pytorch_required_message(msg)
            except ImportError:
                # TorchPathManager not available, use regular import
                try:
                    import torch
                except ImportError as torch_err:
                    return False, _pytorch_required_message(str(torch_err))

            import shap_e
            return True, "Shap-E is installed"
        except OSError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, (
                    "Windows path length error detected. PyTorch cannot load due to Windows MAX_PATH limitation.\n\n"
                    "Quick Fix - Use the 'Install PyTorch to Short Path' button in preferences\n"
                    "Or manually:\n"
                    "1. Enable long paths in Windows (Recommended):\n"
                    "   - Run 'gpedit.msc' > Computer Config > Admin Templates > System > Filesystem\n"
                    "   - Enable 'Win32 long paths', restart\n\n"
                    "2. Install PyTorch in a shorter path:\n"
                    "   - Create venv in C:\\venv\\blender\n"
                    "   - Install PyTorch there\n\n"
                    f"Original error: {str(e)}"
                )
            # Catches the rare case where the DLL failure bubbles up here instead
            # of being caught by TorchPathManager (e.g. import shap_e triggers it).
            if getattr(e, 'winerror', None) == 1114 or "WinError 1114" in str(e):
                return False, ShapEHelpers._dll_init_error_message()
            return False, f"File error loading Shap-E: {str(e)}"
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"

    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Shap-E"""
        return """
To install Shap-E:

1. Clone the repository:
   git clone https://huggingface.co/openai/shap-e
   cd shap-e

2. Install dependencies:
   pip install -e .
   pip install torch torchvision
   pip install trimesh

3. Download model weights (automatic on first use)

4. Restart Blender

For more info: https://github.com/openai/shap-e
"""

    @staticmethod
    def generate_from_text_background(prompt, guidance_scale=15.0, num_inference_steps=32):
        """
        Run text-to-3D generation in a dedicated worker process to keep the UI responsive.
        """
        return _dispatch_shap_e_job(
            "text",
            {
                "prompt": prompt,
                "guidance_scale": guidance_scale,
                "num_inference_steps": num_inference_steps,
            },
        )

    @staticmethod
    def generate_from_image_background(image_path, guidance_scale=3.0, num_inference_steps=32):
        """
        Run image-to-3D generation in a dedicated worker process to keep the UI responsive.
        """
        return _dispatch_shap_e_job(
            "image",
            {
                "image_path": image_path,
                "guidance_scale": guidance_scale,
                "num_inference_steps": num_inference_steps,
            },
        )
    
    @staticmethod
    def generate_from_text(prompt, guidance_scale=15.0, num_inference_steps=16):
        """
        Generate 3D mesh from text prompt using Shap-E
        
        Args:
            prompt: Text description of object to generate
            guidance_scale: How closely to follow the prompt (higher = more faithful)
            num_inference_steps: Number of generation steps (higher = better quality, default 16)
        
        Returns:
            Tuple of (success, mesh_data or error_message)
        """
        try:
            import torch
            from shap_e.diffusion.sample import sample_latents
            from shap_e.util.notebooks import decode_latent_mesh

            t_total = time.monotonic()
            print(f"[Shap-E] Generating 3D mesh from text: '{prompt}'")

            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"[Shap-E] Device: {device}")

            # Load models (cached after first call).
            t0 = time.monotonic()
            cached = _load_shap_e_text_models(device)
            xm = _shap_e_transmitter['xm']
            model = cached['model']
            diffusion = cached['diffusion']
            print(f"[Shap-E] model load: {time.monotonic() - t0:.1f} s")

            # Inference — inference_mode + autocast for maximum throughput.
            print(f"[Shap-E] inference ({num_inference_steps} steps, guidance={guidance_scale})…")
            t0 = time.monotonic()
            batch_size = 1
            use_fp16 = device.type == 'cuda'
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_fp16):
                latents = sample_latents(
                    batch_size=batch_size,
                    model=model,
                    diffusion=diffusion,
                    guidance_scale=guidance_scale,
                    model_kwargs=dict(texts=[prompt] * batch_size),
                    progress=True,
                    clip_denoised=True,
                    use_fp16=use_fp16,
                    use_karras=True,
                    karras_steps=num_inference_steps,
                    sigma_min=1e-3,
                    sigma_max=160,
                    s_churn=0,
                )
            print(f"[Shap-E] inference: {time.monotonic() - t0:.1f} s")

            t0 = time.monotonic()
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_fp16):
                mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
            print(f"[Shap-E] mesh decode: {time.monotonic() - t0:.1f} s")

            vertices = mesh.verts
            faces = mesh.faces
            print(
                f"[Shap-E] TOTAL: {time.monotonic() - t_total:.1f} s  "
                f"({len(vertices)} verts, {len(faces)} faces)"
            )

            return True, {
                'vertices': vertices,
                'faces': faces,
                'prompt': prompt
            }

        except OSError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, "Windows path length error. Enable long paths in Windows or reinstall PyTorch in a shorter path (see Shap-E installation check for details)."
            return False, f"File error: {str(e)}"
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def generate_from_image(image_path, guidance_scale=3.0, num_inference_steps=32):
        """
        Generate 3D mesh from image using Shap-E
        
        Args:
            image_path: Path to input image
            guidance_scale: How closely to follow the image
            num_inference_steps: Number of generation steps
        
        Returns:
            Tuple of (success, mesh_data or error_message)
        """
        try:
            import torch
            from PIL import Image
            from shap_e.diffusion.sample import sample_latents
            from shap_e.util.notebooks import decode_latent_mesh

            t_total = time.monotonic()
            print(f"[Shap-E] Generating 3D mesh from image: '{image_path}'")

            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"[Shap-E] Device: {device}")

            # Load image
            t0 = time.monotonic()
            image = Image.open(image_path)
            print(f"[Shap-E] image load: {time.monotonic() - t0:.1f} s")

            # Load models (cached after first call).
            t0 = time.monotonic()
            cached = _load_shap_e_image_models(device)
            xm = _shap_e_transmitter['xm']
            model = cached['model']
            diffusion = cached['diffusion']
            print(f"[Shap-E] model load: {time.monotonic() - t0:.1f} s")

            # Inference — inference_mode + autocast for maximum throughput.
            print(f"[Shap-E] inference ({num_inference_steps} steps, guidance={guidance_scale})…")
            t0 = time.monotonic()
            batch_size = 1
            use_fp16 = device.type == 'cuda'
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_fp16):
                latents = sample_latents(
                    batch_size=batch_size,
                    model=model,
                    diffusion=diffusion,
                    guidance_scale=guidance_scale,
                    model_kwargs=dict(images=[image] * batch_size),
                    progress=True,
                    clip_denoised=True,
                    use_fp16=use_fp16,
                    use_karras=True,
                    karras_steps=num_inference_steps,
                    sigma_min=1e-3,
                    sigma_max=160,
                    s_churn=0,
                )
            print(f"[Shap-E] inference: {time.monotonic() - t0:.1f} s")

            t0 = time.monotonic()
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_fp16):
                mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
            print(f"[Shap-E] mesh decode: {time.monotonic() - t0:.1f} s")

            vertices = mesh.verts
            faces = mesh.faces
            print(
                f"[Shap-E] TOTAL: {time.monotonic() - t_total:.1f} s  "
                f"({len(vertices)} verts, {len(faces)} faces)"
            )

            return True, {
                'vertices': vertices,
                'faces': faces,
                'image_path': image_path
            }

        except OSError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, "Windows path length error. Enable long paths in Windows or reinstall PyTorch in a shorter path (see Shap-E installation check for details)."
            return False, f"File error: {str(e)}"
        except ImportError as e:
            return False, f"Shap-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"
    
    @staticmethod
    def create_mesh_from_data(mesh_data, name="ShapE_Generated"):
        """
        Create Blender mesh from Shap-E generated data
        
        Args:
            mesh_data: Dictionary with 'vertices' and 'faces'
            name: Name for the mesh object
        
        Returns:
            Created mesh object or None
        """
        try:
            if bpy is None:
                raise RuntimeError("Blender context unavailable (bpy not importable).")
            import numpy as np
            
            vertices = mesh_data['vertices']
            faces = mesh_data['faces']
            
            # Convert to numpy if needed
            if not isinstance(vertices, np.ndarray):
                vertices = np.array(vertices)
            if not isinstance(faces, np.ndarray):
                faces = np.array(faces)
            
            # Create mesh
            mesh = bpy.data.meshes.new(name)
            obj = bpy.data.objects.new(name, mesh)
            
            # Link to scene
            bpy.context.collection.objects.link(obj)
            
            # Create mesh from data
            mesh.from_pydata(vertices.tolist(), [], faces.tolist())
            mesh.update()
            
            # Apply scale for Fallout 4
            obj.scale = (0.1, 0.1, 0.1)  # Shap-E meshes are often large
            
            # Select the new object
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            
            print(f"Created mesh: {name}")
            return obj
            
        except Exception as e:
            print(f"Failed to create mesh: {str(e)}")
            return None


def register():
    """Register Shap-E properties"""
    if bpy is None:  # pragma: no cover - only runs inside Blender
        raise RuntimeError("Blender context unavailable; cannot register Shap-E properties.")
    
    # Add Shap-E properties to scene
    bpy.types.Scene.fo4_shap_e_prompt = StringProperty(
        name="Text Prompt",
        description="Describe the 3D object you want to generate",
        default="a wooden chair"
    )
    
    bpy.types.Scene.fo4_shap_e_image_path = StringProperty(
        name="Image Path",
        description="Path to image for image-to-3D generation",
        default="",
        subtype='FILE_PATH'
    )
    
    bpy.types.Scene.fo4_shap_e_guidance_scale = FloatProperty(
        name="Guidance Scale",
        description="How closely to follow the prompt/image (higher = more faithful)",
        default=15.0,
        min=1.0,
        max=30.0
    )
    
    bpy.types.Scene.fo4_shap_e_inference_steps = IntProperty(
        name="Inference Steps",
        description="Number of generation steps (higher = better quality, slower)",
        default=16,
        min=16,
        max=256
    )
    
    bpy.types.Scene.fo4_shap_e_use_gpu = BoolProperty(
        name="Use GPU",
        description="Use GPU acceleration if available",
        default=True
    )


def unregister():
    """Unregister Shap-E properties"""
    if bpy is None:  # pragma: no cover - only runs inside Blender
        return
    
    if hasattr(bpy.types.Scene, 'fo4_shap_e_prompt'):
        del bpy.types.Scene.fo4_shap_e_prompt
    if hasattr(bpy.types.Scene, 'fo4_shap_e_image_path'):
        del bpy.types.Scene.fo4_shap_e_image_path
    if hasattr(bpy.types.Scene, 'fo4_shap_e_guidance_scale'):
        del bpy.types.Scene.fo4_shap_e_guidance_scale
    if hasattr(bpy.types.Scene, 'fo4_shap_e_inference_steps'):
        del bpy.types.Scene.fo4_shap_e_inference_steps
    if hasattr(bpy.types.Scene, 'fo4_shap_e_use_gpu'):
        del bpy.types.Scene.fo4_shap_e_use_gpu
