"""
Point-E Integration for Fallout 4 Add-on
Text-to-3D and Image-to-3D generation using OpenAI's Point-E
Generates 3D point clouds that can be converted to meshes
"""

import bpy
import time
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty

# ---------------------------------------------------------------------------
# Module-level model cache — Point-E models take significant time to load
# from disk and to download checkpoints, so we cache them between calls and
# only reload when the active compute device changes.
#
# The upsampler model is shared between text and image pipelines to avoid
# holding duplicate weights in VRAM when both modes are used in one session.
#
# The PointCloudSampler and diffusion objects are NOT cached here — they are
# created cheaply on each generation call so that the user's grid_size and
# inference_steps settings take effect immediately without reloading weights.
# ---------------------------------------------------------------------------
_point_e_text_models = None   # dict: {base_model, device}
_point_e_image_models = None  # dict: {base_model, device}
_point_e_upsampler = None     # dict: {model, device}  -- shared between text & image


def _load_point_e_upsampler(device, torch_module):
    """Load (or return cached) the shared Point-E upsampler model.

    The upsampler checkpoint is identical for text-to-3D and image-to-3D
    pipelines, so it is loaded once and reused to avoid double VRAM usage.
    """
    global _point_e_upsampler
    from point_e.models.download import load_checkpoint
    from point_e.models.configs import MODEL_CONFIGS, model_from_config

    device_str = str(torch_module.device(device))
    if _point_e_upsampler is not None and _point_e_upsampler['device'] == device_str:
        return _point_e_upsampler

    print("Loading Point-E upsampler (shared, first use or device change)…")
    upsampler_model = model_from_config(MODEL_CONFIGS['upsample'], device)
    upsampler_model.eval()
    upsampler_model.load_state_dict(load_checkpoint('upsample', device))
    if torch_module.device(device).type == 'cuda':
        upsampler_model.half()
    if hasattr(torch_module, 'compile') and torch_module.device(device).type == 'cuda':
        print("Compiling Point-E upsampler with torch.compile() (one-time, ~15 s)…")
        upsampler_model = torch_module.compile(upsampler_model, mode="reduce-overhead")
    _point_e_upsampler = {'model': upsampler_model, 'device': device_str}
    print("Point-E upsampler loaded and cached.")
    return _point_e_upsampler


def _load_point_e_text_models(device):
    """Load (or return cached) Point-E text-to-3D base model.

    Only the base (text-conditioned) model weights are cached here.
    The upsampler is shared via _load_point_e_upsampler.
    The PointCloudSampler and diffusion configs are created per generation
    call so that grid_size and inference_steps settings take effect without
    reloading weights.
    """
    global _point_e_text_models
    import torch as _torch
    device_str = str(_torch.device(device))
    if _point_e_text_models is not None and _point_e_text_models['device'] == device_str:
        return _point_e_text_models

    from point_e.models.download import load_checkpoint
    from point_e.models.configs import MODEL_CONFIGS, model_from_config

    print("Loading Point-E text base model (first use or device change)…")
    # Ensure shared upsampler is loaded first (cached after first call).
    _load_point_e_upsampler(device, _torch)

    base_name = 'base40M-textvec'
    base_model = model_from_config(MODEL_CONFIGS[base_name], device)
    base_model.eval()
    base_model.load_state_dict(load_checkpoint(base_name, device))

    # Pre-convert to half precision on CUDA to halve GPU memory bandwidth and
    # avoid per-step autocast conversion overhead.
    if _torch.device(device).type == 'cuda':
        base_model.half()
    # torch.compile() (PyTorch ≥ 2.0) fuses ops into optimized CUDA kernels,
    # giving ~20-40 % faster inference.  The one-time compilation cost is paid
    # here at cache-fill time, so all subsequent generation calls are fast.
    if hasattr(_torch, 'compile') and _torch.device(device).type == 'cuda':
        print("Compiling Point-E text base model with torch.compile() (one-time, ~20 s)…")
        base_model = _torch.compile(base_model, mode="reduce-overhead")

    _point_e_text_models = {'base_model': base_model, 'device': device_str}
    print("Point-E text base model loaded and cached.")
    return _point_e_text_models


def _load_point_e_image_models(device):
    """Load (or return cached) Point-E image-to-3D base model.

    Only the base (image-conditioned) model weights are cached here.
    The upsampler is shared via _load_point_e_upsampler.
    The PointCloudSampler and diffusion configs are created per generation
    call so that grid_size and inference_steps settings take effect without
    reloading weights.
    """
    global _point_e_image_models
    import torch as _torch
    device_str = str(_torch.device(device))
    if _point_e_image_models is not None and _point_e_image_models['device'] == device_str:
        return _point_e_image_models

    from point_e.models.download import load_checkpoint
    from point_e.models.configs import MODEL_CONFIGS, model_from_config

    print("Loading Point-E image base model (first use or device change)…")
    # Ensure shared upsampler is loaded first (cached after first call).
    _load_point_e_upsampler(device, _torch)

    base_name = 'base40M'
    base_model = model_from_config(MODEL_CONFIGS[base_name], device)
    base_model.eval()
    base_model.load_state_dict(load_checkpoint(base_name, device))

    # Pre-convert to half precision on CUDA to halve GPU memory bandwidth and
    # avoid per-step autocast conversion overhead.
    if _torch.device(device).type == 'cuda':
        base_model.half()
    # torch.compile() (PyTorch ≥ 2.0) fuses ops into optimized CUDA kernels,
    # giving ~20-40 % faster inference.  The one-time compilation cost is paid
    # here at cache-fill time, so all subsequent generation calls are fast.
    if hasattr(_torch, 'compile') and _torch.device(device).type == 'cuda':
        print("Compiling Point-E image base model with torch.compile() (one-time, ~20 s)…")
        base_model = _torch.compile(base_model, mode="reduce-overhead")

    _point_e_image_models = {'base_model': base_model, 'device': device_str}
    print("Point-E image base model loaded and cached.")
    return _point_e_image_models


def _grid_size_to_num_points(grid_size):
    """Map the user-facing grid_size setting to Point-E num_points=[base, upsample].

    The upsampler output count scales with grid_size while the base model output
    is kept at 1024 (its training distribution).  Lower grid sizes produce fewer
    upsampled points, directly reducing the upsampling stage cost.

    Speedup figures are relative to the old hardcoded default of [1024, 4096]:

    grid_size  base_pts  upsample_pts  upsample speedup vs. old default
    --------   --------  ------------  -------------------------------------
    32         1024      1024          ~4× (1024 vs 4096 pts to diffuse)
    64         1024      2048          ~2×
    128        1024      4096          1× (same as old hardcoded default)
    256        1024      8192          ~0.5× (more detail, slower)
    """
    upsample_pts = max(1024, grid_size * 32)
    return [1024, upsample_pts]



class PointEHelpers:
    """Helper functions for Point-E integration"""

    # Cache for is_point_e_installed() — avoids repeated torch/point_e import attempts
    # on every Blender UI redraw.
    _cache = None
    _cache_time = 0.0
    _CACHE_TTL = 5.0  # seconds
    
    @staticmethod
    def is_point_e_installed():
        """Check if Point-E is installed (result cached for 5 s)."""
        now = time.monotonic()
        if (PointEHelpers._cache is not None and
                (now - PointEHelpers._cache_time) < PointEHelpers._CACHE_TTL):
            return PointEHelpers._cache
        result = PointEHelpers._is_point_e_installed_uncached()
        PointEHelpers._cache = result
        PointEHelpers._cache_time = now
        return result

    @staticmethod
    def _is_point_e_installed_uncached():
        """Perform the actual (uncached) Point-E installation check."""
        try:
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
                    else:
                        raise ImportError(msg)
            except ImportError:
                # TorchPathManager not available, use regular import
                import torch

            import point_e
            return True, "Point-E is installed"
        except FileNotFoundError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, (
                    "Windows path length error detected. PyTorch cannot load due to Windows MAX_PATH limitation.\n\n"
                    "Quick Fix - Use the 'Install PyTorch to Short Path' button in preferences\n"
                    "Or manually:\n"
                    "1. Enable long paths in Windows (Recommended):\n"
                    "   - Run 'gpedit.msc' > Computer Config > Admin Templates > System > Filesystem\n"
                    "   - Enable 'Win32 long paths', restart\n\n"
                    "2. Install PyTorch in a shorter path:\n"
                    "   - Create venv in C:\\t\n"
                    "   - Install PyTorch there\n\n"
                    f"Original error: {str(e)}"
                )
            return False, f"File error loading Point-E: {str(e)}"
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Point-E"""
        return """
To install Point-E:

1. Clone the repository:
   gh repo clone openai/point-e
   cd point-e

2. Install dependencies:
   pip install -e .
   pip install torch torchvision
   pip install pillow numpy

3. Download model weights (automatic on first use)

4. Restart Blender

For more info: https://github.com/openai/point-e
"""
    
    @staticmethod
    def generate_from_text(prompt, num_samples=1, grid_size=128, num_steps=64):
        """
        Generate 3D point cloud from text prompt using Point-E

        Args:
            prompt: Text description of object to generate
            num_samples: Number of point clouds to generate
            grid_size: Resolution of point cloud (32, 64, 128, 256).
                Mapped to num_points via _grid_size_to_num_points — lower values
                are proportionally faster because the upsampling stage is cheaper.
            num_steps: Number of diffusion timesteps per stage (default 64).
                Fewer steps = faster generation, lower quality.
                The full Point-E diffusion schedule has 1024 steps; 64 gives a
                ~16× speedup with acceptable quality for game asset prototypes.

        Returns:
            Tuple of (success, point_cloud_data or error_message)
        """
        try:
            # Try to use TorchPathManager if available
            try:
                from . import torch_path_manager
                success, msg, torch = torch_path_manager.TorchPathManager.try_import_torch()
                if not success:
                    if msg == "windows_path_error":
                        return False, "Windows path length error. Use the 'Install PyTorch to Short Path' button to install to D:/t"
                    else:
                        return False, msg
            except ImportError:
                # TorchPathManager not available, use regular import
                import torch

            print(f"Generating 3D point cloud from text: '{prompt}'")

            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")

            # Load model weights (cached after first call — avoids expensive reload
            # each time).  Sampler and diffusions are created fresh below so that
            # changes to grid_size and num_steps take effect without a cache miss.
            cached = _load_point_e_text_models(device)
            base_model = cached['base_model']
            upsampler_model = _point_e_upsampler['model']

            from point_e.diffusion.configs import DIFFUSION_CONFIGS, diffusion_from_config
            from point_e.diffusion.sampler import PointCloudSampler

            base_name = 'base40M-textvec'
            # Pass a copy so diffusion_from_config's pop() calls do not mutate
            # the shared DIFFUSION_CONFIGS entries.
            base_cfg = dict(DIFFUSION_CONFIGS[base_name])
            base_cfg['timestep_respacing'] = str(num_steps)
            base_diffusion = diffusion_from_config(base_cfg)

            up_cfg = dict(DIFFUSION_CONFIGS['upsample'])
            up_cfg['timestep_respacing'] = str(num_steps)
            upsampler_diffusion = diffusion_from_config(up_cfg)

            # num_points derived from grid_size so the UI setting is honoured.
            num_points = _grid_size_to_num_points(grid_size)
            print(
                f"Generating point cloud (grid_size={grid_size}, "
                f"num_points={num_points}, num_steps={num_steps})…"
            )

            sampler = PointCloudSampler(
                device=device,
                models=[base_model, upsampler_model],
                diffusions=[base_diffusion, upsampler_diffusion],
                num_points=num_points,
                aux_channels=['R', 'G', 'B'],
                guidance_scale=[3.0, 0.0],
                model_kwargs_key_filter=('texts', ''),
            )

            # Generate — use inference_mode (superset of no_grad; also disables
            # view tracking) and autocast for FP16 mixed-precision on CUDA.
            samples = None
            use_autocast = device.type == 'cuda'
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_autocast):
                for x in sampler.sample_batch_progressive(
                    batch_size=num_samples,
                    model_kwargs=dict(texts=[prompt] * num_samples),
                ):
                    samples = x

            # Extract point cloud
            pc = samples[0]  # First sample

            # Get coordinates and colors
            coords = pc.coords  # [N, 3] coordinates
            colors = pc.channels  # [N, 3] RGB colors if available

            print(f"Generated point cloud: {len(coords)} points")

            return True, {
                'coords': coords.cpu().numpy(),
                'colors': colors.cpu().numpy() if colors is not None else None,
                'prompt': prompt,
                'num_points': len(coords)
            }

        except FileNotFoundError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, "Windows path length error. Enable long paths in Windows or reinstall PyTorch in a shorter path (see Point-E installation check for details)."
            return False, f"File error: {str(e)}"
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"

    @staticmethod
    def generate_from_image(image_path, num_samples=1, grid_size=128, num_steps=64):
        """
        Generate 3D point cloud from image using Point-E

        Args:
            image_path: Path to input image
            num_samples: Number of point clouds to generate
            grid_size: Resolution of point cloud (32, 64, 128, 256).
                Mapped to num_points via _grid_size_to_num_points — lower values
                are proportionally faster because the upsampling stage is cheaper.
            num_steps: Number of diffusion timesteps per stage (default 64).
                Fewer steps = faster generation, lower quality.

        Returns:
            Tuple of (success, point_cloud_data or error_message)
        """
        try:
            # Try to use TorchPathManager if available
            try:
                from . import torch_path_manager
                success, msg, torch = torch_path_manager.TorchPathManager.try_import_torch()
                if not success:
                    if msg == "windows_path_error":
                        return False, "Windows path length error. Use the 'Install PyTorch to Short Path' button to install to D:/t"
                    else:
                        return False, msg
            except ImportError:
                # TorchPathManager not available, use regular import
                import torch

            from PIL import Image

            print(f"Generating 3D point cloud from image: '{image_path}'")

            # Set device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            print(f"Using device: {device}")

            # Load image
            image = Image.open(image_path)

            # Load model weights (cached after first call — avoids expensive reload
            # each time).  Sampler and diffusions are created fresh below so that
            # changes to grid_size and num_steps take effect without a cache miss.
            cached = _load_point_e_image_models(device)
            base_model = cached['base_model']
            upsampler_model = _point_e_upsampler['model']

            from point_e.diffusion.configs import DIFFUSION_CONFIGS, diffusion_from_config
            from point_e.diffusion.sampler import PointCloudSampler

            base_name = 'base40M'
            # Pass a copy so diffusion_from_config's pop() calls do not mutate
            # the shared DIFFUSION_CONFIGS entries.
            base_cfg = dict(DIFFUSION_CONFIGS[base_name])
            base_cfg['timestep_respacing'] = str(num_steps)
            base_diffusion = diffusion_from_config(base_cfg)

            up_cfg = dict(DIFFUSION_CONFIGS['upsample'])
            up_cfg['timestep_respacing'] = str(num_steps)
            upsampler_diffusion = diffusion_from_config(up_cfg)

            # num_points derived from grid_size so the UI setting is honoured.
            num_points = _grid_size_to_num_points(grid_size)
            print(
                f"Generating point cloud (grid_size={grid_size}, "
                f"num_points={num_points}, num_steps={num_steps})…"
            )

            sampler = PointCloudSampler(
                device=device,
                models=[base_model, upsampler_model],
                diffusions=[base_diffusion, upsampler_diffusion],
                num_points=num_points,
                aux_channels=['R', 'G', 'B'],
                guidance_scale=[3.0, 0.0],
            )

            # Generate — use inference_mode (superset of no_grad; also disables
            # view tracking) and autocast for FP16 mixed-precision on CUDA.
            samples = None
            use_autocast = device.type == 'cuda'
            with torch.inference_mode(), torch.amp.autocast(device.type, enabled=use_autocast):
                for x in sampler.sample_batch_progressive(
                    batch_size=num_samples,
                    model_kwargs=dict(images=[image] * num_samples),
                ):
                    samples = x

            # Extract point cloud
            pc = samples[0]

            # Get coordinates and colors
            coords = pc.coords
            colors = pc.channels

            print(f"Generated point cloud: {len(coords)} points")

            return True, {
                'coords': coords.cpu().numpy(),
                'colors': colors.cpu().numpy() if colors is not None else None,
                'image_path': image_path,
                'num_points': len(coords)
            }

        except FileNotFoundError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                return False, "Windows path length error. Enable long paths in Windows or reinstall PyTorch in a shorter path (see Point-E installation check for details)."
            return False, f"File error: {str(e)}"
        except ImportError as e:
            return False, f"Point-E not installed: {str(e)}"
        except Exception as e:
            return False, f"Generation failed: {str(e)}"


    @staticmethod
    def point_cloud_to_mesh(point_cloud_data, method='ball_pivoting', name="PointE_Generated"):
        """
        Convert point cloud to mesh using various reconstruction methods
        
        Args:
            point_cloud_data: Dictionary with 'coords' and optionally 'colors'
            method: Reconstruction method ('ball_pivoting', 'poisson', 'alpha_shape')
            name: Name for the mesh object
        
        Returns:
            Created mesh object or None
        """
        try:
            import numpy as np
            
            coords = point_cloud_data['coords']
            colors = point_cloud_data.get('colors')
            
            if method == 'ball_pivoting':
                # Use ball pivoting algorithm for surface reconstruction
                return PointEHelpers._ball_pivoting_reconstruction(coords, colors, name)
            elif method == 'poisson':
                # Use Poisson surface reconstruction
                return PointEHelpers._poisson_reconstruction(coords, colors, name)
            elif method == 'alpha_shape':
                # Use alpha shape reconstruction
                return PointEHelpers._alpha_shape_reconstruction(coords, colors, name)
            else:
                # Fallback: Create point cloud as mesh vertices
                return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
            
        except Exception as e:
            print(f"Failed to create mesh from point cloud: {str(e)}")
            return None
    
    @staticmethod
    def _create_point_cloud_mesh(coords, colors, name):
        """Create a simple point cloud visualization in Blender"""
        try:
            # Create mesh with vertices only (no faces)
            mesh = bpy.data.meshes.new(name)
            obj = bpy.data.objects.new(name, mesh)
            
            # Link to scene
            bpy.context.collection.objects.link(obj)
            
            # Add vertices
            mesh.from_pydata(coords.tolist(), [], [])
            mesh.update()
            
            # Apply scale for FO4
            obj.scale = (0.1, 0.1, 0.1)
            
            # Add vertex colors if available
            # Blender 3.2+ uses color_attributes; vertex_colors removed in 5.0
            if colors is not None:
                if hasattr(mesh, 'color_attributes'):
                    color_attr = mesh.color_attributes.new(
                        name='Col', type='BYTE_COLOR', domain='POINT'
                    )
                    for i, color in enumerate(colors):
                        color_attr.data[i].color = [color[0], color[1], color[2], 1.0]
                else:
                    color_layer = mesh.vertex_colors.new()
                    for i, color in enumerate(colors):
                        # Point-E colors are typically in [0, 1] range
                        color_layer.data[i].color = [color[0], color[1], color[2], 1.0]
            
            # Select the new object
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            
            print(f"Created point cloud: {name} with {len(coords)} points")
            return obj
            
        except Exception as e:
            print(f"Failed to create point cloud mesh: {str(e)}")
            return None
    
    @staticmethod
    def _ball_pivoting_reconstruction(coords, colors, name):
        """Ball pivoting algorithm for surface reconstruction"""
        # This would require Open3D or similar library
        # For now, fall back to simple point cloud
        print("Ball pivoting requires Open3D - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
    
    @staticmethod
    def _poisson_reconstruction(coords, colors, name):
        """Poisson surface reconstruction"""
        # This would require Open3D or similar library
        print("Poisson reconstruction requires Open3D - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)
    
    @staticmethod
    def _alpha_shape_reconstruction(coords, colors, name):
        """Alpha shape reconstruction"""
        # This would require specialized libraries
        print("Alpha shape requires additional libraries - using simple point cloud")
        return PointEHelpers._create_point_cloud_mesh(coords, colors, name)


def register():
    """Register Point-E properties"""
    
    # Add Point-E properties to scene
    bpy.types.Scene.fo4_point_e_prompt = StringProperty(
        name="Text Prompt",
        description="Describe the 3D object you want to generate",
        default="a wooden chair"
    )
    
    bpy.types.Scene.fo4_point_e_image_path = StringProperty(
        name="Image Path",
        description="Path to image for image-to-3D generation",
        default="",
        subtype='FILE_PATH'
    )
    
    bpy.types.Scene.fo4_point_e_num_samples = IntProperty(
        name="Number of Samples",
        description="Number of point clouds to generate",
        default=1,
        min=1,
        max=4
    )
    
    bpy.types.Scene.fo4_point_e_grid_size = EnumProperty(
        name="Grid Size",
        description="Resolution of point cloud",
        items=[
            ('32', "32 (Fast)", "Low resolution, fast generation"),
            ('64', "64 (Balanced)", "Medium resolution"),
            ('128', "128 (High)", "High resolution (recommended)"),
            ('256', "256 (Ultra)", "Very high resolution, slow"),
        ],
        default='128'
    )
    
    bpy.types.Scene.fo4_point_e_reconstruction_method = EnumProperty(
        name="Reconstruction Method",
        description="Method to convert point cloud to mesh",
        items=[
            ('point_cloud', "Point Cloud", "Display as point cloud"),
            ('ball_pivoting', "Ball Pivoting", "Surface reconstruction (requires Open3D)"),
            ('poisson', "Poisson", "Smooth surface (requires Open3D)"),
            ('alpha_shape', "Alpha Shape", "Alpha shape reconstruction"),
        ],
        default='point_cloud'
    )
    
    bpy.types.Scene.fo4_point_e_use_gpu = BoolProperty(
        name="Use GPU",
        description="Use GPU acceleration if available",
        default=True
    )

    bpy.types.Scene.fo4_point_e_inference_steps = IntProperty(
        name="Inference Steps",
        description=(
            "Number of diffusion timesteps per generation stage (fewer = faster). "
            "Point-E's full schedule is 1024 steps; 64 gives ~16× speedup with "
            "acceptable quality for game asset prototyping"
        ),
        default=64,
        min=16,
        max=1024,
    )


def unregister():
    """Unregister Point-E properties"""

    if hasattr(bpy.types.Scene, 'fo4_point_e_prompt'):
        del bpy.types.Scene.fo4_point_e_prompt
    if hasattr(bpy.types.Scene, 'fo4_point_e_image_path'):
        del bpy.types.Scene.fo4_point_e_image_path
    if hasattr(bpy.types.Scene, 'fo4_point_e_num_samples'):
        del bpy.types.Scene.fo4_point_e_num_samples
    if hasattr(bpy.types.Scene, 'fo4_point_e_grid_size'):
        del bpy.types.Scene.fo4_point_e_grid_size
    if hasattr(bpy.types.Scene, 'fo4_point_e_reconstruction_method'):
        del bpy.types.Scene.fo4_point_e_reconstruction_method
    if hasattr(bpy.types.Scene, 'fo4_point_e_use_gpu'):
        del bpy.types.Scene.fo4_point_e_use_gpu
    if hasattr(bpy.types.Scene, 'fo4_point_e_inference_steps'):
        del bpy.types.Scene.fo4_point_e_inference_steps
