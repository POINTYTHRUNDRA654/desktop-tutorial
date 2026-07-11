"""
Hunyuan3D-2 AI model integration for generating 3D meshes from text and images.
This module provides optional AI-powered mesh generation using Tencent's Hunyuan3D-2 model.

Note: This is an OPTIONAL feature. The add-on works perfectly without it.
Installing Hunyuan3D-2 requires significant disk space and GPU resources.

Installation:
1. Clone the repository: gh repo clone Tencent-Hunyuan/Hunyuan3D-2
2. Follow their installation instructions
3. The add-on will automatically detect if it's available
"""

import bpy
import importlib.util
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Check if Hunyuan3D-2 is available
# None = not yet checked; True = available; False = not available
HUNYUAN3D_AVAILABLE = None
HUNYUAN3D_ERROR = None

# NOTE: TORCH_AVAILABLE is intentionally NOT evaluated at module-import time.
# The user's PyTorch custom path is added to sys.path only during register(),
# which runs after this module is first imported.  Evaluating it here would
# always return False and the flag would never update.  Instead we use the
# lazy helper _torch_available() which calls find_spec at invocation time.


def _mossy_provides_torch() -> bool:
    """Return True when the Mossy bridge is online and provides PyTorch.

    When Mossy is connected, PyTorch runs inside the Mossy desktop app -
    a local Blender-side torch install is not required for AI inference.
    Safe to call from background threads; all bpy.context access is guarded.
    """
    try:
        import bpy as _bpy
        wm = _bpy.context.window_manager
        if getattr(wm, 'mossy_bridge_status', "").startswith("Mossy Bridge online"):
            return True
        try:
            from . import preferences as _prefs
            p = _prefs.get_preferences()
            if p is not None and getattr(p, 'use_mossy_as_ai', False):
                return True
        except Exception:
            pass
    except Exception:
        pass
    return False


def _register_torch_dll_dirs() -> None:
    """Register PyTorch DLL directories with Windows before any torch import.
    Fixes WinError 126 for standalone installs like D:\\PyTorch.
    """
    import os
    if os.name != "nt":
        return
    try:
        import pathlib, string
        drives = [f"{d}:\\" for d in string.ascii_uppercase
                  if pathlib.Path(f"{d}:\\").exists()]
        candidates = []
        for drive in drives:
            for sub in ("PyTorch", "pytorch", "blender_tools/PyTorch"):
                p = pathlib.Path(drive) / sub
                candidates += [p, p / "torch" / "lib"]
        try:
            import importlib.util as _ilu
            spec = _ilu.find_spec("torch")
            if spec and spec.origin:
                candidates.insert(0, pathlib.Path(spec.origin).parent / "lib")
        except Exception:
            pass
        for p in candidates:
            try:
                if p.is_dir():
                    os.add_dll_directory(str(p))
            except (OSError, AttributeError):
                pass
    except Exception:
        pass


def _torch_available() -> bool:
    """Return True if torch is available locally or via the Mossy bridge.

    Checks (1) a fast local find_spec so custom-path installs are detected,
    then (2) whether the Mossy bridge is online (Mossy hosts PyTorch, so no
    local install is needed).  Called at invocation time, never at import
    time, so it correctly reflects the runtime state.
    """
    _register_torch_dll_dirs()
    if importlib.util.find_spec("torch") is not None:
        return True
    return _mossy_provides_torch()


# We don't actually import Hunyuan3D here to keep the add-on lightweight
# It will be imported dynamically when needed


def _dll_init_error_message(exc_str: str = "") -> str:
    """Return a user-friendly message when WinError 1114 (DLL init failure) occurs.

    This error typically means a CUDA-version mismatch between the installed
    PyTorch and the system GPU driver, or a missing Visual C++ Redistributable.

    Args:
        exc_str: String representation of the original OSError.  When provided,
                 the actual failing DLL path is extracted and shown in the message.
    """
    import re as _re
    dll_path = ""
    if exc_str:
        m = _re.search(r"'([^']+\.(?:dll|pyd))'", exc_str, _re.IGNORECASE)
        if m:
            dll_path = m.group(1)
    dll_line = (
        f"A file such as {dll_path} could not be loaded.\n"
        if dll_path
        else "A torch DLL (e.g. torch\\lib\\c10.dll) could not be loaded.\n"
    )
    return (
        "PyTorch DLL initialisation failed (WinError 1114).\n"
        "This usually means a CUDA/driver version mismatch.\n"
        + dll_line + "\n"
        "Suggested fixes:\n"
        "1. Reinstall PyTorch matching your CUDA toolkit version:\n"
        "   https://pytorch.org/get-started/locally/\n"
        "2. Install the latest Visual C++ Redistributable from Microsoft:\n"
        "   https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
        "3. Update your GPU driver to one compatible with your CUDA version.\n"
        "4. If no GPU is present, install the CPU-only PyTorch build:\n"
        "   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
    )


def _build_hunyuan3d_candidates() -> list:
    """Return an ordered list of candidate paths to search for Hunyuan3D-2.

    The tools-root location (set by the addon installer or the user's
    ``tools_root`` preference) is checked first so that the auto-installed
    copy on D:\\blender_tools takes priority over any stray clone in the
    user's home directory that might be missing the hy3dgen package.
    """
    from . import tool_installers as _tli

    candidates = []

    # 1. User-configured tools_root preference (highest priority)
    try:
        for addon_id in (
            "bl_ext.user_default.blender_game_tools",
            __name__.split(".")[0],
        ):
            entry = bpy.context.preferences.addons.get(addon_id)
            if entry:
                tr = getattr(entry.preferences, "tools_root", "")
                if tr:
                    candidates.append(os.path.join(tr, "Hunyuan3D-2"))
                break
    except Exception:
        pass

    # 2. tool_installers default root (D:\blender_tools\Hunyuan3D-2)
    try:
        candidates.append(str(_tli.get_tools_root() / "Hunyuan3D-2"))
    except Exception:
        pass

    # 3. Common user-home and system locations (legacy / manual installs)
    candidates += [
        os.path.expanduser("~/Hunyuan3D-2"),
        os.path.expanduser("~/Projects/Hunyuan3D-2"),
        "/opt/Hunyuan3D-2",
        os.path.join(os.path.dirname(__file__), "..", "Hunyuan3D-2"),
    ]

    return candidates


def _detect_hunyuan_version(path: str) -> str:
    """Return '2.1', '2.0', or '' for a Hunyuan3D install directory."""
    p = Path(path)
    ver_file = p / "VERSION"
    if ver_file.exists():
        try:
            v = ver_file.read_text().strip()
            if v.startswith("2.1"): return "2.1"
            if v.startswith("2"):   return "2.0"
        except Exception:
            pass
    if (p / "hy3dgen" / "shapegen").is_dir(): return "2.1"
    if (p / "hy3dgen").is_dir():              return "2.0"
    return ""


def _is_valid_hunyuan_install(path: str) -> bool:
    """Return True if *path* is a Hunyuan3D-2.x directory with the hy3dgen package."""
    return os.path.isdir(path) and os.path.isdir(os.path.join(path, "hy3dgen"))


def check_hunyuan3d_availability():
    """Check if Hunyuan3D-2 is installed and available.

    As a side-effect, updates the module-level ``HUNYUAN3D_AVAILABLE`` and
    ``HUNYUAN3D_ERROR`` globals so that ``get_cached_availability()`` always
    reflects the most recent result without requiring a separate cache layer.

    Returns:
        tuple: (available: bool, message: str)
    """
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR

    if not _torch_available():
        result = False, "PyTorch not installed. Install with: pip install torch torchvision"
        HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
        return result

    # Probe torch to catch DLL init failures (WinError 1114 - CUDA/driver mismatch).
    # find_spec only verifies the files exist; it does not load the DLLs.
    # Skip the probe when: (a) torch is already loaded in this process, or
    # (b) torch runs inside Mossy - there are no local DLLs to verify.
    if sys.modules.get("torch") is None and not _mossy_provides_torch():
        try:
            importlib.import_module("torch")
        except OSError as _e:
            if getattr(_e, 'winerror', None) == 1114 or "WinError 1114" in str(_e):
                result = False, _dll_init_error_message(str(_e))
            else:
                result = False, f"PyTorch failed to load: {_e}"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result
        except ImportError as _e:
            result = False, f"PyTorch not available: {_e}"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result

    candidates = _build_hunyuan3d_candidates()

    # First pass: prefer 2.1 over 2.0 when both are present
    best_path = None
    best_ver  = ""
    for path in candidates:
        if _is_valid_hunyuan_install(path):
            ver = _detect_hunyuan_version(path)
            if best_path is None or ver > best_ver:
                best_path, best_ver = path, ver

    if best_path is not None:
        label = f"Hunyuan3D-{best_ver}" if best_ver else "Hunyuan3D-2"
        result = True, f"{label} available at: {best_path}"
        HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
        return result

    # Second pass: report any directory found but missing the hy3dgen package
    for path in candidates:
        if os.path.isdir(path):
            result = False, f"Hunyuan3D-2 found at {path} but hy3dgen package not found"
            HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
            return result

    result = False, (
        "Hunyuan3D-2 not found. Clone it with:\n"
        "gh repo clone Tencent-Hunyuan/Hunyuan3D-2\n"
        "Or: git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git"
    )
    HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR = result
    return result


def generate_mesh_from_text(prompt, output_path=None, resolution=256):
    """
    Generate a 3D mesh from a text prompt using Hunyuan3D-2.

    Hunyuan3D-2 uses a text-conditioned DiT pipeline.  The inference is run in
    a subprocess so that the hy3dgen package (which lives inside the cloned repo
    and requires torch) is imported in an isolated environment rather than
    polluting Blender's embedded Python.

    Args:
        prompt (str): Text description of the 3D model
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Unused – kept for API compatibility.

    Returns:
        tuple: (success: bool, object/error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    try:
        import glob as _glob

        # Locate the Hunyuan3D-2 installation directory
        hunyuan_path = next(
            (p for p in _build_hunyuan3d_candidates() if _is_valid_hunyuan_install(p)),
            None,
        )
        if not hunyuan_path:
            return False, "Hunyuan3D-2 installation not found"

        # Choose / create an output directory
        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_text_")
        os.makedirs(output_path, exist_ok=True)

        # Build an inline inference script so we don't need infer.py to exist.
        # sys.path.insert(0, hunyuan_path) exposes the hy3dgen package to the
        # subprocess even though it is not installed as a pip package.
        # The script is written to a private temp dir (not the user-supplied
        # output_path) to avoid placing executable code in a world-writable
        # location.
        out_file = os.path.join(output_path, "output.glb")
        _hf_cache = r"D:\.cache\huggingface\hub"
        _ipv4_patch = (
            "import socket as _sock_mod\n"
            "_AF_INET = _sock_mod.AF_INET\n"          # capture as int before any loop reuses names
            "_orig_gai = _sock_mod.getaddrinfo\n"
            "def _gai4(host, port, family=0, type=0, proto=0, flags=0):\n"
            "    r = _orig_gai(host, port, family, type, proto, flags)\n"
            "    v4 = [x for x in r if x[0] == _AF_INET]\n"
            "    return v4 if v4 else r\n"
            "_sock_mod.getaddrinfo = _gai4\n"
        )
        _script = (
            "import sys, os\n"
            f"os.environ['HUGGINGFACE_HUB_CACHE'] = {repr(_hf_cache)}\n"
            f"os.environ['HF_HOME'] = {repr(os.path.dirname(_hf_cache))}\n"
            f"os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'\n"
            f"os.environ['HF_HUB_OFFLINE'] = '1'\n"   # use cache only — never ping HF to verify
            + _ipv4_patch +
            f"sys.path.insert(0, {repr(hunyuan_path)})\n"
            "from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline\n"
            f"prompt = {repr(prompt)}\n"
            f"out_file = {repr(out_file)}\n"
            "pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(\n"
            "    'tencent/Hunyuan3D-2')\n"
            "mesh = pipeline(prompt=prompt)[0]\n"
            "try:\n"
            "    _raw_fc = len(mesh.faces)\n"
            "    _target_fc = int(os.environ.get('HY3D_TARGET_POLYS', '30000'))\n"
            "    if _raw_fc > _target_fc:\n"
            "        mesh = mesh.simplify_quadric_decimation(face_count=_target_fc)\n"
            "        print(f'Decimated {_raw_fc:,} → {len(mesh.faces):,} faces')\n"
            "except Exception as _simp_err:\n"
            "    print(f'[WARNING] Simplification skipped ({_simp_err})')\n"
            "mesh.export(out_file)\n"
            "print(f'Saved mesh to {out_file}')\n"
        )

        _script_dir = tempfile.mkdtemp(prefix="hy3d_script_")
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, dir=_script_dir
        ) as _f:
            _f.write(_script)
            _script_path = _f.name

        try:
            _rc, _out = _run_inference_subprocess(_script_path, "text inference")
        finally:
            try:
                os.unlink(_script_path)
            except OSError:
                pass

        if _rc != 0:
            print(f"[Hunyuan3D] Text inference failed (exit {_rc})")
            _lines = _out.strip().splitlines() or ["unknown error"]
            _err_kw = ("Error", "Exception", "Traceback", "FAILED", "fatal", "assert")
            _err_line = next(
                (l for l in reversed(_lines) if any(kw in l for kw in _err_kw)),
                _lines[-1],
            )
            return False, f"Hunyuan3D-2 inference failed: {_err_line} (see System Console for full log)"

        # Find the generated mesh (OBJ / GLB preferred)
        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = _glob.glob(os.path.join(output_path, ext))
            if matches:
                mesh_path = matches[0]
                success, obj_or_msg = import_mesh_file(
                    mesh_path,
                    mesh_name=f"Hunyuan3D_{prompt[:20].replace(' ', '_')}",
                )
                return success, obj_or_msg

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (1 hour). Check System Console for last progress line."
    except Exception as e:
        return False, f"Error generating mesh from text: {str(e)}"


def generate_mesh_from_image(image_path, output_path=None, resolution=256, target_polys=30000):
    """
    Generate a full 3D mesh from a 2D image using Hunyuan3D-2 AI model.
    This is different from height map conversion - it creates a complete 3D object.

    The inference is run in a subprocess so that the hy3dgen package (which
    lives inside the cloned repo and requires torch) is imported in an isolated
    environment rather than polluting Blender's embedded Python.

    Args:
        image_path (str): Path to the input image
        output_path (str): Path to save the generated mesh (optional)
        resolution (int): Unused – kept for API compatibility.

    Returns:
        tuple: (success: bool, object/error_message)
    """
    available, message = check_hunyuan3d_availability()
    if not available:
        return False, f"Hunyuan3D-2 not available: {message}"

    if not os.path.exists(image_path):
        return False, f"Image file not found: {image_path}"

    try:
        import glob as _glob

        hunyuan_path = next(
            (p for p in _build_hunyuan3d_candidates() if _is_valid_hunyuan_install(p)),
            None,
        )
        if not hunyuan_path:
            return False, "Hunyuan3D-2 installation not found"

        if output_path is None:
            output_path = tempfile.mkdtemp(prefix="hunyuan3d_img_")
        os.makedirs(output_path, exist_ok=True)

        # Build an inline inference script so we don't need infer.py to exist.
        # sys.path.insert(0, hunyuan_path) exposes the hy3dgen package to the
        # subprocess even though it is not installed as a pip package.
        # The script is written to a private temp dir (not the user-supplied
        # output_path) to avoid placing executable code in a world-writable
        # location.
        out_file = os.path.join(output_path, "output.glb")
        import pathlib as _pl
        _addon_lib = str(_pl.Path(__file__).parent / "lib")
        _dll_fix = (
            # Only add DLL directories from CUDA-capable torch installs.
            # D:\PyTorch and similar CPU-only installs have torch_cpu.dll but no
            # torch_cuda*.dll — loading their DLLs first breaks the real CUDA torch.
            "if __import__('os').name == 'nt':\n"
            "    import pathlib as _p, string, sys as _sys\n"
            "    # Prefer active Python's own torch lib first\n"
            "    for _sp in _sys.path:\n"
            "        _lib = _p.Path(_sp) / 'torch' / 'lib'\n"
            "        if _lib.is_dir() and list(_lib.glob('torch_cuda*.dll')):\n"
            "            try: __import__('os').add_dll_directory(str(_lib))\n"
            "            except Exception: pass\n"
            "            break\n"
            "    # Fallback drive scan — skip CPU-only installs (no torch_cuda*.dll)\n"
            "    for _d in [f'{c}:\\\\' for c in string.ascii_uppercase"
            " if _p.Path(f'{c}:\\\\').exists()]:\n"
            "        for _s in ('PyTorch','pytorch'):\n"
            "            _lib = _p.Path(_d) / _s / 'torch' / 'lib'\n"
            "            if _lib.is_dir() and list(_lib.glob('torch_cuda*.dll')):\n"
            "                try: __import__('os').add_dll_directory(str(_lib))\n"
            "                except Exception: pass\n"
        )
        # Point HF hub cache at D:\.cache so texgen finds what shapegen already downloaded
        _hf_cache = r"D:\.cache\huggingface\hub"
        # IPv4 patch: Windows resolves HuggingFace to an IPv6 CloudFront address whose
        # TLS handshake fails.  Prefer IPv4 by filtering getaddrinfo results.
        _ipv4_patch = (
            "import socket as _sock_mod\n"
            "_AF_INET = _sock_mod.AF_INET\n"          # capture as int before any loop reuses names
            "_orig_gai = _sock_mod.getaddrinfo\n"
            "def _gai4(host, port, family=0, type=0, proto=0, flags=0):\n"
            "    r = _orig_gai(host, port, family, type, proto, flags)\n"
            "    v4 = [x for x in r if x[0] == _AF_INET]\n"
            "    return v4 if v4 else r\n"
            "_sock_mod.getaddrinfo = _gai4\n"
        )
        _script = (
            "import sys, os\n"
            # Consistent HF cache across both pipelines
            f"os.environ['HUGGINGFACE_HUB_CACHE'] = {repr(_hf_cache)}\n"
            f"os.environ['HF_HOME'] = {repr(os.path.dirname(_hf_cache))}\n"
            f"os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'\n"
            f"os.environ['HF_HUB_OFFLINE'] = '1'\n"   # use cache only — never ping HF to verify
            f"os.environ['HY3D_TARGET_POLYS'] = '{int(target_polys)}'\n"
            + _ipv4_patch +
            f"sys.path.insert(0, {repr(hunyuan_path)})\n"
            f"sys.path.insert(0, {repr(_addon_lib)})\n"
            + _dll_fix +
            "from PIL import Image\n"
            "from hy3dgen.rembg import BackgroundRemover\n"
            "from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline\n"
            f"image_path = {repr(image_path)}\n"
            f"out_file = {repr(out_file)}\n"
            "image = Image.open(image_path).convert('RGBA')\n"
            "if image.mode != 'RGBA':\n"
            "    rembg = BackgroundRemover()\n"
            "    image = rembg(image)\n"
            "print('Loading shape pipeline...')\n"
            "pipeline_shape = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(\n"
            "    'tencent/Hunyuan3D-2')\n"
            "print('Generating shape...')\n"
            "mesh = pipeline_shape(image=image)[0]\n"
            # Simplify before texture so texgen works on a manageable mesh and
            # the exported GLB is already within FO4's 65,535-triangle limit.
            "print('Simplifying mesh for FO4...')\n"
            "try:\n"
            "    _raw_fc = len(mesh.faces)\n"
            "    _target_fc = int(os.environ.get('HY3D_TARGET_POLYS', '30000'))\n"
            "    if _raw_fc > _target_fc:\n"
            "        mesh = mesh.simplify_quadric_decimation(face_count=_target_fc)\n"
            "        print(f'Decimated {_raw_fc:,} → {len(mesh.faces):,} faces')\n"
            "    else:\n"
            "        print(f'Mesh at {_raw_fc:,} faces — under target, no simplification needed')\n"
            "except Exception as _simp_err:\n"
            "    print(f'[WARNING] Simplification skipped ({_simp_err}) — mesh may be too dense for FO4')\n"
            # Texture (Hunyuan3D-Paint) pipeline. Failures are non-fatal but are
            # now reported loudly with a TEXGEN: prefix so the reason a mesh came
            # out untextured is visible in the System Console instead of silent.
            "def _load_paint():\n"
            "    from hy3dgen.texgen import Hunyuan3DPaintPipeline\n"
            "    try:\n"
            "        return Hunyuan3DPaintPipeline.from_pretrained('tencent/Hunyuan3D-2')\n"
            "    except Exception as _e_off:\n"
            # First run: paint weights may not be in the offline cache yet. Retry
            # online once so they download instead of silently skipping texture.
            "        print(f'TEXGEN: offline load failed ({_e_off}); retrying online to fetch paint weights...')\n"
            "        import os as _os2\n"
            "        _os2.environ['HF_HUB_OFFLINE'] = '0'\n"
            "        return Hunyuan3DPaintPipeline.from_pretrained('tencent/Hunyuan3D-2')\n"
            "try:\n"
            "    print('TEXGEN: loading texture (paint) pipeline...')\n"
            "    pipeline_tex = _load_paint()\n"
            "    print('TEXGEN: baking texture from reference image...')\n"
            "    mesh = pipeline_tex(mesh, image=image)\n"
            "    print('TEXGEN: texture baked successfully')\n"
            # Save the baked diffuse next to the GLB so the Blender side always has
            # a real file on disk to wire into the material (the GLB also embeds it).
            "    try:\n"
            "        _vis = getattr(mesh, 'visual', None)\n"
            "        _mat = getattr(_vis, 'material', None)\n"
            "        _tex_img = None\n"
            "        if _mat is not None:\n"
            "            _tex_img = getattr(_mat, 'baseColorTexture', None) or getattr(_mat, 'image', None)\n"
            "        if _tex_img is None:\n"
            "            _tex_img = getattr(_vis, 'image', None)\n"
            "        if _tex_img is not None:\n"
            "            _dpath = out_file.rsplit('.', 1)[0] + '_texgen_d.png'\n"
            "            _tex_img.save(_dpath)\n"
            "            print(f'TEXGEN: saved baked diffuse -> {_dpath}')\n"
            "        else:\n"
            "            print('TEXGEN: baked texture is embedded in the GLB (no standalone image object)')\n"
            "    except Exception as _sv_err:\n"
            "        print(f'TEXGEN: could not save sidecar diffuse ({_sv_err})')\n"
            "except Exception as _tex_err:\n"
            "    print(f'TEXGEN: texture pipeline unavailable ({_tex_err}) - exporting shape only')\n"
            "mesh.export(out_file)\n"
            "print(f'Saved mesh to {out_file}')\n"
        )

        _script_dir = tempfile.mkdtemp(prefix="hy3d_script_")
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.py', delete=False, dir=_script_dir
        ) as _f:
            _f.write(_script)
            _script_path = _f.name

        try:
            _rc, _out = _run_inference_subprocess(_script_path, "image inference")
        finally:
            try:
                os.unlink(_script_path)
            except OSError:
                pass

        if _rc != 0:
            print(f"[Hunyuan3D] Image inference failed (exit {_rc})")
            _lines = _out.strip().splitlines() or ["unknown error"]
            _err_kw = ("Error", "Exception", "Traceback", "FAILED", "fatal", "assert")
            _err_line = next(
                (l for l in reversed(_lines) if any(kw in l for kw in _err_kw)),
                _lines[-1],
            )
            return False, f"Hunyuan3D-2 inference failed: {_err_line} (see System Console for full log)"

        for ext in ("*.glb", "*.obj", "*.ply"):
            matches = _glob.glob(os.path.join(output_path, ext))
            if matches:
                img_stem = os.path.splitext(os.path.basename(image_path))[0]
                success, obj_or_msg = import_mesh_file(
                    matches[0],
                    mesh_name=f"Hunyuan3D_{img_stem}",
                )
                return success, obj_or_msg

        return False, f"Inference finished but no mesh file found in {output_path}"

    except subprocess.TimeoutExpired:
        return False, "Hunyuan3D-2 inference timed out (1 hour). Check System Console for last progress line."
    except Exception as e:
        return False, f"Error generating mesh from image: {str(e)}"


def _ensure_textures_on_disk(obj, mesh_path):
    """Make sure a generated mesh's baked texture exists as a real .dds/.png file
    and is wired into the object's material so the FO4 NIF exporter (which reads
    the Principled Base Color image) writes it into BSShaderTextureSet slot 0.

    Handles two sources of texture:
      * a sidecar '<mesh>_texgen_d.png' saved by the texture pipeline, and
      * an image embedded in the imported GLB material (packed, in-memory).

    A 'textures/' folder is created next to the mesh with '<name>_d.dds' (via the
    project's DDS encoder when available, otherwise a .png fallback).  Never raises
    — texturing is advisory and must not break import.

    Returns (bool applied, str message).
    """
    try:
        import glob as _glob
        import shutil as _shutil

        if obj is None or getattr(obj, "type", None) != 'MESH':
            return False, "no mesh object"

        mesh_dir = os.path.dirname(mesh_path)
        stem = obj.name.replace(" ", "_")[:63] or "FO4_Asset"
        tex_dir = os.path.join(mesh_dir, "textures")

        # 1. Find a source image: sidecar diffuse first, else a packed material image.
        src_png = None
        sidecars = _glob.glob(os.path.join(mesh_dir, "*_texgen_d.png"))
        if sidecars:
            src_png = sidecars[0]

        bl_image = None
        if obj.data.materials:
            for mat in obj.data.materials:
                if not mat or not mat.use_nodes:
                    continue
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image is not None:
                        bl_image = node.image
                        break
                if bl_image:
                    break

        if src_png is None and bl_image is not None:
            # Unpack the GLB-embedded image to disk so the exporter has a file path.
            os.makedirs(tex_dir, exist_ok=True)
            src_png = os.path.join(tex_dir, f"{stem}_d.png")
            try:
                bl_image.filepath_raw = src_png
                bl_image.file_format = 'PNG'
                bl_image.save()
            except Exception:
                # Fall back to save_render on a copy of the pixels
                bl_image.save_render(src_png)

        if src_png is None:
            return False, "no baked texture found (mesh is untextured)"

        # 2. Encode a FO4-ready DDS next to the mesh (BC-compressed when possible).
        os.makedirs(tex_dir, exist_ok=True)
        dds_path = os.path.join(tex_dir, f"{stem}_d.dds")
        encoded = False
        try:
            from . import fo4_texture_generator as _ftg
            _enc = getattr(_ftg, "encode_dds", None) or getattr(_ftg, "png_to_dds", None)
            if callable(_enc):
                _enc(src_png, dds_path, "BC7_UNORM")
                encoded = os.path.exists(dds_path)
        except Exception as _enc_err:
            print(f"[Hunyuan3D] TEXGEN: DDS encode via project tool failed ({_enc_err})")
        if not encoded:
            try:
                from PIL import Image as _PIm
                _PIm.open(src_png).convert("RGB").save(
                    dds_path, dds_compression="dxt1"
                )
                encoded = os.path.exists(dds_path)
            except Exception:
                # Last resort: ship the PNG so nothing is lost.
                dds_path = os.path.join(tex_dir, f"{stem}_d.png")
                if os.path.abspath(src_png) != os.path.abspath(dds_path):
                    _shutil.copyfile(src_png, dds_path)

        # 3. Wire the image into the object's material Base Color so export sees it.
        try:
            img = bpy.data.images.load(src_png, check_existing=True)
            if not obj.data.materials:
                mat = bpy.data.materials.new(stem + "_mat")
                mat.use_nodes = True
                obj.data.materials.append(mat)
            mat = obj.data.materials[0]
            mat.use_nodes = True
            nt = mat.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf is None:
                bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
            tex_node = next(
                (n for n in nt.nodes
                 if n.type == 'TEX_IMAGE' and n.label == 'FO4_Diffuse'),
                None,
            )
            if tex_node is None:
                tex_node = nt.nodes.new('ShaderNodeTexImage')
                tex_node.label = 'FO4_Diffuse'
            tex_node.image = img
            nt.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
        except Exception as _wire_err:
            print(f"[Hunyuan3D] TEXGEN: material wire-up skipped ({_wire_err})")

        # 4. Record the FO4-relative diffuse path for the exporter / user.
        obj["fo4_diffuse"] = os.path.join("textures", os.path.basename(dds_path))
        return True, f"diffuse -> {os.path.basename(dds_path)}"

    except Exception as exc:
        return False, f"texture setup skipped: {exc}"


def import_mesh_file(filepath, mesh_name="AI_Generated_Mesh"):
    """
    Import a mesh file (OBJ, GLB, etc.) into Blender.
    
    Args:
        filepath (str): Path to the mesh file
        mesh_name (str): Name for the imported object
        
    Returns:
        tuple: (success: bool, object/error_message)
    """
    if not os.path.exists(filepath):
        return False, f"Mesh file not found: {filepath}"
    
    try:
        # Determine file type and import accordingly
        ext = os.path.splitext(filepath)[1].lower()
        
        if ext == '.obj':
            bpy.ops.import_scene.obj(filepath=filepath)
        elif ext in ['.glb', '.gltf']:
            bpy.ops.import_scene.gltf(filepath=filepath)
        elif ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=filepath)
        elif ext == '.stl':
            bpy.ops.import_mesh.stl(filepath=filepath)
        else:
            return False, f"Unsupported file format: {ext}"
        
        # Get the imported object
        obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
        if obj:
            obj.name = mesh_name
            # Wire any baked/embedded texture onto disk + into the material so the
            # NIF export carries a diffuse automatically.  Advisory: never fatal.
            try:
                _tex_ok, _tex_msg = _ensure_textures_on_disk(obj, filepath)
                print(f"[Hunyuan3D] TEXGEN: {_tex_msg}")
            except Exception as _te:
                print(f"[Hunyuan3D] TEXGEN: texture hook error ({_te})")
            # Snapshot the raw generated mesh so the evolution monitor can learn
            # from whatever you change afterward (poly cuts, downscale, cleanup).
            try:
                from . import fo4_mesh_evolution as _evo
                _evo.tag_baseline(obj, source_image=filepath)
            except Exception as _be:
                print(f"[Hunyuan3D] evolution baseline skipped ({_be})")
            return True, obj
        else:
            return False, "Import succeeded but no object was created"

    except Exception as e:
        return False, f"Error importing mesh: {str(e)}"


class Hunyuan3DHelpers:
    """Helper class for Hunyuan3D-2 AI operations"""
    
    @staticmethod
    def is_available():
        """Check if Hunyuan3D-2 is available"""
        available, _ = check_hunyuan3d_availability()
        return available
    
    @staticmethod
    def get_status_message():
        """Get the current status message for Hunyuan3D-2"""
        available, message = check_hunyuan3d_availability()
        if available:
            return f"✓ {message}"
        else:
            return f"✗ {message}"
    
    @staticmethod
    def get_installation_instructions():
        """Get installation instructions for Hunyuan3D-2"""
        return """
To install Hunyuan3D-2:

1. Install PyTorch (if not already installed):
   pip install torch torchvision

2. Clone the Hunyuan3D-2 repository:
   gh repo clone Tencent-Hunyuan/Hunyuan3D-2
   OR
   git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git

3. Follow the installation instructions in their README:
   cd Hunyuan3D-2
   pip install -r requirements.txt

4. Download the model weights (follow their documentation)

5. Restart Blender

Note: Hunyuan3D-2 requires:
- Several GB of disk space for models
- GPU with CUDA support recommended
- Significant computational resources

The add-on will automatically detect when it's installed.
"""


def get_cached_availability():
    """Return the most recently computed availability status without re-probing.

    Used by the UI draw() function to avoid heavy filesystem / DLL probes on
    every redraw.  Returns ``(None, "Not yet checked…")`` when no check has
    been run since startup or the last ``clear_availability_cache()`` call.
    Call the ``fo4.check_hunyuan3d_status`` operator to force a fresh probe.

    Returns:
        tuple: (available: bool | None, message: str)
    """
    if HUNYUAN3D_AVAILABLE is None:
        return None, "Not yet checked - click Check Status to refresh"
    return HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR or ""


def clear_availability_cache():
    """Reset any cached availability state so the next check runs fresh.

    Called by the install operator after a successful install to ensure
    the panel reflects the newly-installed state immediately.
    """
    global HUNYUAN3D_AVAILABLE, HUNYUAN3D_ERROR
    # Reset to None (not False) so the UI shows "Not checked" rather than
    # "Not installed", prompting the user to click Check Status after install.
    HUNYUAN3D_AVAILABLE = None
    HUNYUAN3D_ERROR = None



def _run_inference_subprocess(script_path: str, label: str, timeout: int = 3600) -> tuple:
    """Run a Python inference script as a subprocess, streaming output to System Console.

    Returns (returncode, combined_output_str).
    Times out after *timeout* seconds (default 1 hour — first run downloads weights).
    Output is printed line-by-line as it arrives so progress is visible immediately.
    """
    import time as _time
    proc = subprocess.Popen(
        [sys.executable, script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    lines = []
    deadline = _time.monotonic() + timeout
    print(f"[Hunyuan3D] {label} — streaming output (timeout {timeout//60} min):")
    try:
        for line in proc.stdout:
            line = line.rstrip("\n")
            lines.append(line)
            print(f"[Hunyuan3D] {line}")
            if _time.monotonic() > deadline:
                proc.kill()
                proc.wait()
                raise subprocess.TimeoutExpired(script_path, timeout)
    except subprocess.TimeoutExpired:
        raise
    except Exception:
        pass
    proc.wait()
    return proc.returncode, "\n".join(lines)


def _fo4_post_process(obj, target_polys: int = 10000, name: str = "") -> tuple:
    """Apply full FO4 post-processing to a generated mesh.
    Delegates to imageto3d_helpers.fo4_post_process for the canonical pipeline
    (triangulate, UV unwrap, poly-cap, scale apply, material slot).
    """
    try:
        from . import imageto3d_helpers as _ith
        if hasattr(_ith, 'fo4_post_process'):
            return _ith.fo4_post_process(obj, target_polys=target_polys, name=name)
    except Exception:
        pass
    # Minimal inline fallback
    import math, bpy as _bpy
    if obj is None or obj.type != 'MESH':
        return False, "Not a mesh"
    try:
        _bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        _bpy.ops.object.mode_set(mode='EDIT')
        _bpy.ops.mesh.select_all(action='SELECT')
        _bpy.ops.mesh.remove_doubles(threshold=0.0001)
        _bpy.ops.mesh.normals_make_consistent(inside=False)
        _bpy.ops.object.mode_set(mode='OBJECT')
        tri = obj.modifiers.new("Tri_FO4", 'TRIANGULATE')
        _bpy.ops.object.modifier_apply(modifier=tri.name)
        if not obj.data.uv_layers:
            _bpy.ops.object.mode_set(mode='EDIT')
            _bpy.ops.mesh.select_all(action='SELECT')
            _bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
            _bpy.ops.object.mode_set(mode='OBJECT')
        _bpy.ops.object.transform_apply(scale=True)
        poly = len(obj.data.polygons)
        limit = min(target_polys, 65535)
        if poly > limit:
            dec = obj.modifiers.new("Dec_FO4", 'DECIMATE')
            dec.ratio = max(0.01, limit / max(poly, 1))
            _bpy.ops.object.modifier_apply(modifier=dec.name)
        if name:
            obj.name = name.replace(" ", "_")[:63]
        if not any(s.material for s in obj.material_slots):
            import bpy
            mat = bpy.data.materials.new((obj.name or "FO4_Asset") + "_mat")
            mat.use_nodes = True
            obj.data.materials.append(mat)
        return True, f"FO4 ready: {len(obj.data.polygons):,} tris"
    except Exception as exc:
        try: import bpy; bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
        return False, str(exc)

def register():
    """Register Hunyuan3D helper functions.

    Intentionally does NOT call check_hunyuan3d_availability() here because
    torch_custom_path has not yet been added to sys.path at module-register
    time (that happens later in register() via restore_extra_python_paths()).
    The deferred_startup() task runs 2 seconds after load and populates
    HUNYUAN3D_AVAILABLE / HUNYUAN3D_ERROR with an accurate result.
    """
    # Leave HUNYUAN3D_AVAILABLE = None so the UI shows "Not checked"
    # rather than a potentially-stale "Not installed" during the 2-second
    # window before deferred_startup() fires.
    print("ℹ Hunyuan3D-2 availability check deferred to startup (torch paths not yet ready)")
    print("  (This is optional - the add-on works without it)")


def unregister():
    """Unregister Hunyuan3D helper functions"""
    pass
