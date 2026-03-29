"""
mossy_link.py
=============
Connects the Blender add-on to the Mossy desktop application.

Two-way connection
------------------
1. **TCP command server (Blender side, port 9999)**
   Mossy's Bridge Server (running on port 21337) forwards commands here.
   The server receives JSON payloads and executes them inside Blender on the
   main thread using ``bpy.app.timers``.

   Supported command types (matching BridgeServer.ts):
     • ``{"type": "script", "code": "..."}``  – exec Python inside Blender
     • ``{"type": "text",   "code": "...",
          "name": "...", "run": true/false}``  – create/update a Text datablock

2. **Nemotron LLM client (outbound, port 5000)**
   ``ask_mossy()`` sends natural-language queries to Mossy's local Nemotron
   AI service (``POST http://localhost:5000/nemotron``).  This is the
   "Mossy brain" that answers FO4-modding questions without sending any data
   to the cloud.

3. **Bridge health check (outbound, port 21337)**
   ``check_bridge()`` pings ``GET http://localhost:21337/health`` to confirm
   the Mossy desktop app is running.

Ports are read from the add-on preferences on every call so the user can
change them without restarting Blender.
"""

import json
import os
import queue
import socket
import sys
import threading
from urllib import error as _url_error
from urllib import request as _url_request

# ── Internal state ─────────────────────────────────────────────────────────────
_server_thread: "threading.Thread | None" = None
_server_socket: "socket.socket | None" = None
_active: bool = False
_command_queue: queue.Queue = queue.Queue()
_pytorch_path: "str | None" = None  # Will be set by Mossy via set_pytorch_path command

# ── Port helpers ───────────────────────────────────────────────────────────────

def _get_ports():
    """Return (tcp_port, llm_port, token) from prefs, falling back to defaults."""
    tcp_port = 9999
    llm_port = 5000
    token = ""
    try:
        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs:
            tcp_port = getattr(prefs, "port",            tcp_port)
            llm_port = getattr(prefs, "mossy_http_port", llm_port)
            token    = getattr(prefs, "token",           token)
    except Exception:
        pass
    return tcp_port, llm_port, token


def _store_pytorch_path_in_prefs(path: str) -> None:
    """Store the PyTorch path in Blender preferences so it persists."""
    global _pytorch_path
    _pytorch_path = path
    try:
        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs:
            prefs.pytorch_path = path
            print(f"[Mossy Link] Stored PyTorch path in preferences: {path}")
    except Exception as e:
        print(f"[Mossy Link] Warning: Could not store path in prefs: {e}")


def _load_pytorch_path_from_prefs() -> "str | None":
    """Load the PyTorch path from Blender preferences if available."""
    global _pytorch_path
    try:
        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs and hasattr(prefs, "pytorch_path"):
            path = getattr(prefs, "pytorch_path", None)
            if path:
                _pytorch_path = path
                print(f"[Mossy Link] Loaded PyTorch path from preferences: {path}")
                # Also apply to sys.path and environment
                _apply_pytorch_path(path)
                return path
    except Exception as e:
        print(f"[Mossy Link] Could not load path from prefs: {e}")
    return None


def _apply_pytorch_path(path: str) -> None:
    """Apply the PyTorch path to sys.path and environment variables."""
    global _pytorch_path

    # Add to sys.path if not already there
    if path and path not in sys.path:
        sys.path.insert(0, path)
        print(f"[Mossy Link] Added {path} to sys.path")

    # Set PYTHONPATH environment variable so subprocesses (Blender operators, etc.) can find torch
    current_pythonpath = os.environ.get("PYTHONPATH", "")
    if path:
        paths = [p for p in current_pythonpath.split(os.pathsep) if p]  # Remove empty strings
        if path not in paths:
            paths.insert(0, path)
            os.environ["PYTHONPATH"] = os.pathsep.join(paths)
            print(f"[Mossy Link] Updated PYTHONPATH environment variable")

    _pytorch_path = path

    # Try to import torch as a test
    try:
        import torch
        print(f"[Mossy Link] ✅ PyTorch {torch.__version__} is accessible from {path}")
        return True
    except ImportError as e:
        # Check if it's a DLL error (CUDA mismatch) vs regular import error
        error_msg = str(e)
        if "DLL" in error_msg or "CUDA" in error_msg or "driver" in error_msg or "WinError 1114" in error_msg:
            print(f"[Mossy Link] ❌ PyTorch DLL failed to load (likely CPU vs GPU version mismatch)")
            print(f"[Mossy Link] Error: {e}")
            print(f"[Mossy Link] ")
            print(f"[Mossy Link] FIX: Mossy likely installed a GPU version but Blender needs CPU-only")
            print(f"[Mossy Link] ")
            print(f"[Mossy Link] Reinstall PyTorch CPU-only version:")
            print(f"[Mossy Link]   1. Open Mossy Settings → PyTorch Manager")
            print(f"[Mossy Link]   2. Click 'Uninstall PyTorch'")
            print(f"[Mossy Link]   3. Click 'Install PyTorch (CPU-only)' Button")
            print(f"[Mossy Link]   4. Restart Blender")
            print(f"[Mossy Link] ")
            print(f"[Mossy Link] OR manually reinstall:")
            print(f"[Mossy Link]   python.exe -m pip uninstall torch torchvision torchaudio -y")
            print(f"[Mossy Link]   python.exe -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu")
            return False
        else:
            print(f"[Mossy Link] ⚠️ PyTorch import failed: {e}")
            return False

        cmd = json.loads(data.decode("utf-8"))

        # Optional auth token check.
        if token and cmd.get("token") != token:
            conn.sendall(
                json.dumps({"status": "error", "message": "Unauthorized"}).encode()
            )
            conn.close()
            return

        # Hand off to the Blender main thread via the queue.
        response_event: threading.Event = threading.Event()
        response_holder: list = [None]
        _command_queue.put((cmd, response_event, response_holder))

        # Block this background thread until the main thread replies (10 s max).
        response_event.wait(timeout=10.0)
        result = response_holder[0] or {
            "status": "error", "message": "Blender main-thread timeout"
        }
        conn.sendall(json.dumps(result).encode("utf-8"))

    except Exception as exc:
        try:
            conn.sendall(
                json.dumps({"status": "error", "message": str(exc)}).encode()
            )
        except Exception:
            pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _tcp_server_loop(host: str, port: int, token: str) -> None:
    """Background thread: accept TCP connections and queue commands."""
    global _server_socket, _active
    try:
        _server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        _server_socket.bind((host, port))
        _server_socket.listen(5)
        _server_socket.settimeout(1.0)   # allows periodic _active check
        print(f"[Mossy Link] TCP server listening on {host}:{port}")
        while _active:
            try:
                conn, _addr = _server_socket.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            threading.Thread(
                target=_handle_connection,
                args=(conn, token),
                daemon=True,
            ).start()
    except Exception as exc:
        print(f"[Mossy Link] TCP server error: {exc}")
    finally:
        try:
            if _server_socket:
                _server_socket.close()
        except Exception:
            pass
        _server_socket = None
        print("[Mossy Link] TCP server stopped.")


def _process_command_queue() -> "float | None":
    """
    Called by ``bpy.app.timers`` on the Blender main thread every 0.1 s.
    Drains the command queue and executes each command in Blender's context.
    Returns ``None`` to unregister itself when the server has been stopped.
    """
    import bpy  # only available on the main thread

    try:
        while not _command_queue.empty():
            cmd, event, holder = _command_queue.get_nowait()
            try:
                holder[0] = _execute_command_on_main_thread(cmd, bpy)
            except Exception as exc:
                holder[0] = {"status": "error", "message": str(exc)}
            finally:
                event.set()
    except Exception:
        pass

    return 0.1 if _active else None


def _execute_command_on_main_thread(cmd: dict, bpy) -> dict:
    """Execute a single command dict.  Must run on the Blender main thread."""
    global _pytorch_path

    cmd_type = cmd.get("type", "script")

    # NEW: Handle set_pytorch_path command from Mossy
    if cmd_type == "set_pytorch_path":
        path = cmd.get("path", "")
        if not path:
            return {"status": "error", "message": "No path provided"}

        # Check if path exists
        if not os.path.isdir(path):
            return {"status": "error", "message": f"Path does not exist: {path}"}

        # Apply the path and store it
        _store_pytorch_path_in_prefs(path)
        success = _apply_pytorch_path(path)

        if success:
            return {"status": "success", "message": f"PyTorch path set and verified: {path}"}
        else:
            return {"status": "warning", "message": f"Path set ({path}) but torch not found"}

    if cmd_type == "script":
        code = cmd.get("code", "")
        # SECURITY NOTE: this executes arbitrary Python code sent by Mossy.
        # The token check in _handle_connection guards access — keep the token
        # non-empty and private to limit who can send commands.
        ns = {"bpy": bpy, "__name__": "__mossy_script__"}
        exec(compile(code, "<mossy_script>", "exec"), ns)  # noqa: S102
        return {"status": "success", "message": "Script executed"}

    if cmd_type == "text":
        name = cmd.get("name") or "MOSSY_SCRIPT"
        code = cmd.get("code", "")
        run  = bool(cmd.get("run", False))
        if name in bpy.data.texts:
            text_block = bpy.data.texts[name]
            text_block.clear()
        else:
            text_block = bpy.data.texts.new(name)
        text_block.write(code)
        if run:
            # Same security note as above — execution is gated by the token check.
            ns = {"bpy": bpy, "__name__": "__mossy_script__"}
            exec(compile(code, name, "exec"), ns)  # noqa: S102
        return {"status": "success", "message": f"Text block '{name}' updated"}

    return {"status": "error", "message": f"Unknown command type: {cmd_type!r}"}

# ── Public server control ──────────────────────────────────────────────────────

def is_server_running() -> bool:
    """Return ``True`` if the Mossy Link TCP server is currently active."""
    return _active


def start_server() -> tuple:
    """
    Start the TCP command server.

    :returns: ``(success: bool, message: str)``
    """
    global _server_thread, _active

    if _active:
        return True, "Mossy Link server is already running."

    tcp_port, _llm_port, token = _get_ports()
    _active = True

    # Load PyTorch path from preferences if available
    pytorch_path = _load_pytorch_path_from_prefs()
    if pytorch_path:
        print(f"[Mossy Link] PyTorch path loaded and ready: {pytorch_path}")

    _server_thread = threading.Thread(
        target=_tcp_server_loop,
        args=("127.0.0.1", tcp_port, token),
        daemon=True,
        name="MossyLinkTCP",
    )
    _server_thread.start()

    # Register the main-thread queue processor with Blender's timer system.
    try:
        import bpy
        if not bpy.app.timers.is_registered(_process_command_queue):
            bpy.app.timers.register(_process_command_queue, first_interval=0.1)
    except Exception:
        pass

    return True, f"Mossy Link server started on port {tcp_port}."


def stop_server() -> tuple:
    """
    Stop the TCP command server.

    :returns: ``(success: bool, message: str)``
    """
    global _active, _server_socket

    if not _active:
        return True, "Mossy Link server is not running."

    _active = False

    # Unblock the accept() call by closing the socket.
    try:
        if _server_socket:
            _server_socket.close()
    except Exception:
        pass

    # Unregister the Blender timer (safe to call even if not registered).
    try:
        import bpy
        if bpy.app.timers.is_registered(_process_command_queue):
            bpy.app.timers.unregister(_process_command_queue)
    except Exception:
        pass

    # Update the WindowManager property if we can reach bpy.
    try:
        import bpy
        bpy.context.window_manager["mossy_link_active"] = False
    except Exception:
        pass

    return True, "Mossy Link server stopped."

# ── Outbound: Nemotron LLM (Mossy brain) ──────────────────────────────────────

def ask_mossy(query: str, context_data=None, timeout: float = 15) -> "str | None":
    """
    Send a natural-language query to Mossy's local Nemotron AI service.

    Mossy must be running on the desktop.  The request goes to
    ``POST http://localhost:{mossy_http_port}/nemotron`` — no data leaves the
    machine.

    :param query:        The natural-language question or prompt.
    :param context_data: Optional dict of structured context (e.g. mesh issues,
                         UV analysis).  Serialised and appended to the prompt.
    :param timeout:      Seconds to wait before giving up.
    :returns:            The AI's plain-text response, or ``None`` on any error.
    """
    _tcp_port, llm_port, _token = _get_ports()

    # Build a single prompt string.
    parts = [query]
    if context_data:
        try:
            # Truncate context_data BEFORE serialising so the result is always
            # valid JSON (truncating after serialisation can split mid-escape).
            def _trim(obj, max_chars=1800):
                serialised = json.dumps(obj)
                if len(serialised) <= max_chars:
                    return obj
                # Rebuild with fewer items / shorter strings until it fits.
                if isinstance(obj, dict):
                    trimmed = {}
                    for k, v in obj.items():
                        trimmed[k] = v
                        if len(json.dumps(trimmed)) > max_chars:
                            trimmed.pop(k)
                            break
                    return trimmed
                if isinstance(obj, list):
                    result = []
                    for item in obj:
                        result.append(item)
                        if len(json.dumps(result)) > max_chars:
                            result.pop()
                            break
                    return result
                return obj  # scalar — return as-is

            parts.append("\nContext:\n" + json.dumps(_trim(context_data), indent=2))
        except Exception:
            pass
    full_prompt = "\n".join(parts)

    payload = json.dumps({
        "prompt":      full_prompt,
        "max_tokens":  500,
        "temperature": 0.7,
        "top_p":       0.9,
    }).encode("utf-8")

    try:
        req = _url_request.Request(
            f"http://localhost:{llm_port}/nemotron",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                # Nemotron returns {"response": "..."} — fall back to other keys
                # in case the endpoint changes.
                return (
                    data.get("response")
                    or data.get("text")
                    or data.get("content")
                    or data.get("message")
                )
    except Exception:
        pass

    return None

# ── Outbound: Bridge health check ─────────────────────────────────────────────

_BRIDGE_PORT = 21337

def check_bridge(timeout: float = 3.0) -> tuple:
    """
    Check whether the Mossy Bridge Server is running.

    :returns: ``(online: bool, message: str)``
    """
    try:
        req = _url_request.Request(
            f"http://localhost:{_BRIDGE_PORT}/health",
            method="GET",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                version = data.get("version", "unknown")
                return True, f"Mossy Bridge online (v{version})"
    except Exception as exc:
        return False, f"Mossy Bridge not reachable: {exc}"
    return False, "Mossy Bridge returned unexpected status"


def check_llm(timeout: float = 3.0) -> tuple:
    """
    Check whether Mossy's Nemotron LLM service is running.

    :returns: ``(online: bool, message: str)``
    """
    _tcp, llm_port, _tok = _get_ports()
    try:
        req = _url_request.Request(
            f"http://localhost:{llm_port}/health",
            method="GET",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return True, f"Mossy LLM online (port {llm_port})"
    except Exception as exc:
        return False, f"Mossy LLM not reachable on port {llm_port}: {exc}"
    return False, f"Mossy LLM returned unexpected status on port {llm_port}"

# ── Outbound: Mossy AI delegation helpers ─────────────────────────────────────
#
# These functions let the Blender add-on offload heavy AI work (mesh
# generation, texture processing, scene analysis) to the Mossy desktop
# application so the add-on itself does not need PyTorch or multi-gigabyte
# model weights installed locally.  Each call posts a JSON payload to a
# named endpoint on the Mossy LLM/AI service and returns the parsed
# response dict (or None on any error).

def generate_mesh(
    prompt: str,
    image_base64: "str | None" = None,
    style: str = "realistic",
    timeout: float = 120,
) -> "dict | None":
    """
    Ask Mossy AI to generate a 3-D mesh from a text description or image.

    Offloads heavy inference (Shape-E, Point-E, Image-to-3D, …) to the
    Mossy desktop application so the Blender add-on does not need local
    model weights.

    :param prompt:       Natural-language description of the desired object.
    :param image_base64: Optional base-64 encoded reference image (PNG/JPEG).
    :param style:        Generation style: ``"realistic"``, ``"stylized"``,
                         ``"lowpoly"``, or ``"armor"``.
    :param timeout:      Seconds to wait (AI generation can take a while).
    :returns:            On success a dict ``{"status": "success",
                         "obj_data": "<Wavefront OBJ text>",
                         "mesh_name": "generated_mesh"}``; ``None`` on error.
    """
    _tcp_port, llm_port, _token = _get_ports()
    payload = json.dumps({
        "prompt": prompt,
        "style":  style,
        "image":  image_base64,
    }).encode("utf-8")
    try:
        req = _url_request.Request(
            f"http://localhost:{llm_port}/generate_mesh",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"[Mossy Link] generate_mesh error: {exc}")
    return None


def process_texture(
    image_data_base64: str,
    fmt: str = "dds",
    quality: str = "high",
    timeout: float = 60,
) -> "dict | None":
    """
    Ask Mossy AI to convert or compress a texture.

    Offloads DDS/BC7 compression (NVTT, texconv, …) to the Mossy desktop
    application so the Blender add-on does not need local CLI tools.

    :param image_data_base64: Base-64 encoded source image (PNG/JPEG/TGA).
    :param fmt:               Target format: ``"dds"``, ``"png"``, ``"tga"``.
    :param quality:           Compression quality: ``"high"``, ``"medium"``,
                              ``"fast"``.
    :param timeout:           Seconds to wait.
    :returns:                 On success a dict ``{"status": "success",
                              "texture_data": "<base64 result>",
                              "format": "dds"}``; ``None`` on error.
    """
    _tcp_port, llm_port, _token = _get_ports()
    payload = json.dumps({
        "image_data": image_data_base64,
        "format":     fmt,
        "quality":    quality,
    }).encode("utf-8")
    try:
        req = _url_request.Request(
            f"http://localhost:{llm_port}/process_texture",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"[Mossy Link] process_texture error: {exc}")
    return None


def analyze_scene(scene_info: dict, timeout: float = 30) -> "str | None":
    """
    Send structured scene data to Mossy AI for analysis and advice.

    A richer alternative to :func:`ask_mossy` when you have structured
    mesh/material/physics data rather than a free-form question.

    :param scene_info: Dict with keys such as ``"mesh_stats"``,
                       ``"material_count"``, ``"polycount"``,
                       ``"physics_enabled"``, ``"issues"``.
    :param timeout:    Seconds to wait.
    :returns:          Plain-text analysis/advice, or ``None`` on error.
    """
    _tcp_port, llm_port, _token = _get_ports()
    payload = json.dumps({
        "scene_info":  scene_info,
        "max_tokens":  800,
        "temperature": 0.4,
    }).encode("utf-8")
    try:
        req = _url_request.Request(
            f"http://localhost:{llm_port}/analyze_scene",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return (
                    data.get("analysis")
                    or data.get("response")
                    or data.get("text")
                )
    except Exception as exc:
        print(f"[Mossy Link] analyze_scene error: {exc}")
    return None


# ── Blender register / unregister ─────────────────────────────────────────────

def register() -> None:
    """Called by the add-on register().  Auto-starts the server if preferred."""
    try:
        # Load PyTorch path from preferences on add-on load
        pytorch_path = _load_pytorch_path_from_prefs()
        if pytorch_path:
            print(f"[Mossy Link] PyTorch path loaded on add-on register: {pytorch_path}")

        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs and getattr(prefs, "autostart", True):
            ok, msg = start_server()
            print(f"[Mossy Link] {msg}")
    except Exception as exc:
        print(f"[Mossy Link] register() error: {exc}")


def unregister() -> None:
    """Called by the add-on unregister().  Stops the server."""
    try:
        stop_server()
    except Exception as exc:
        print(f"[Mossy Link] unregister() error: {exc}")
