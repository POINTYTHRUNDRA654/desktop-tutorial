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
import time
from urllib import error as _url_error
from urllib import request as _url_request

# ── Internal state ─────────────────────────────────────────────────────────────
_server_thread: "threading.Thread | None" = None
_server_socket: "socket.socket | None" = None
_active: bool = False
_command_queue: queue.Queue = queue.Queue()
_pytorch_path: "str | None" = None  # Will be set by Mossy via set_pytorch_path command

# ── Auto-reconnect / health monitor state ─────────────────────────────────────
_last_health_check: float = 0.0
_health_check_interval: float = 15.0   # seconds between bridge health pings
_bridge_online: bool = False
_llm_online: bool = False
_reconnect_attempts: int = 0
_MAX_RECONNECT: int = 5                # give up auto-reconnect after this many failures

# ── FO4 system context injected into every LLM query ─────────────────────────
# This ensures the Nemotron model always answers in the FO4 modding context
# regardless of how the query is phrased.
_FO4_SYSTEM_CONTEXT = (
    "You are Mossy, an expert Fallout 4 modding assistant built into Blender via "
    "the Mossy Industries add-on. You are the user's personal guide — you know "
    "every panel, button, and workflow in the add-on and can walk the user through "
    "any process step by step.\n\n"

    "YOUR ROLE:\n"
    "- Guide users through every step of creating a Fallout 4 mod in Blender\n"
    "- Explain exactly which button to click, which panel to open, what settings to use\n"
    "- Diagnose and fix problems with meshes, exports, textures, and materials\n"
    "- Answer questions about FO4 modding, the Creation Kit, and the NIF format\n\n"

    "THE ADD-ON N-PANEL (press N in 3D viewport → Fallout 4 tab):\n"
    "- Main Panel: Full FO4 Pipeline, Mesh Helpers, Thicken Flat Planes, Export, Textures\n"
    "- Setup & Status: install PyNifly/tools, check dependencies\n"
    "- AI Advisor: this chat interface (you are here)\n"
    "- Game Assets: browse/import assets, Import Asset button (supports FBX/OBJ/NIF/DUF/DSF)\n"
    "- Animation: wind setup, Havok physics, HKX animation export\n"
    "- Vegetation: Thicken Flat Planes + Wind Setup\n"
    "- Materials: BGSM browser, material/texture assignment\n"
    "- Mod Packaging: BA2 archives, FOMOD installer XML\n\n"

    "KEY WORKFLOWS YOU MUST KNOW:\n"
    "1. DAZ Import: Game Assets → Import Asset → select .duf/.dsf → auto-imports\n"
    "   OR File → Import → DAZ Studio File (.dsf/.duf)\n"
    "2. Mesh Prep: select mesh → 'Prepare External Mesh for FO4' → fixes transforms,\n"
    "   UVs, materials, non-manifold edges automatically\n"
    "3. Thicken Leaves: Vegetation panel → Thicken Flat Planes → Cross Card technique\n"
    "   (2 planes=X, 3=star, 4=dense) — makes leaf cards look 3D from all angles\n"
    "4. Full Export: 'Export Static Mesh (Full Pipeline)' → choose output NIF path\n"
    "5. Wind Animation: Animation panel → 'Smart Wind + FO4 Export Prep'\n"
    "6. LOD Chain: Mesh Helpers → LOD → 'Generate LOD Chain'\n\n"

    "TECHNICAL FO4 KNOWLEDGE:\n"
    "- NIF format: version 20.2.0.7, UserVer 12, BSVersion 130\n"
    "- BSTriShape, BSFadeNode, BSLightingShaderProperty, BSShaderTextureSet\n"
    "- BGSM/BGEM material files (Data/Materials/), texture slots: _d _n _s _g .dds\n"
    "- Mesh limits: 65535 verts/tris per BSTriShape, max 4 bone influences per vertex\n"
    "- Havok physics: bhkRigidBody, bhkConvexVerticesShape, UCX_ prefix for collision\n"
    "- FO4 skeleton (fo4_skeleton.nif), NPC bone names, armor biped slots\n"
    "- Shape-key → .tri morph export (FRTRI003 format) for facial morphs\n"
    "- NavMesh: all-tris, manifold, max 32767 verts, max 16384 tris\n"
    "- Papyrus scripting, Creation Kit workflow, BA2 archives\n"
    "- PyNifly (Blender 4.x/5.x) and Niftools v0.1.1 (Blender 3.6 LTS) for export\n\n"

    "COMMON FIXES:\n"
    "- PyNifly missing: Setup panel → Auto-Install PyNifly\n"
    "- Non-manifold edges: 'Prepare External Mesh' or Edit Mode → Select Non Manifold → Fill\n"
    "- Wrong scale: Ctrl+A → Apply All Transforms before export\n"
    "- No UV map: Edit Mode → select all → U → Smart UV Project\n"
    "- Too many verts: add Decimate modifier, keep under 65535\n"
    "- Texture not showing: enable DDS add-on or convert to PNG first\n\n"

    "STYLE:\n"
    "Give exact, actionable steps. Name the specific button or panel. "
    "Be friendly and encouraging — modding is hard, users need clear guidance. "
    "When a user asks 'how do I do X', give them numbered steps they can follow "
    "immediately in Blender. Never just say 'use the export feature' — say exactly "
    "which button to click and what settings to use.\n"
)

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
            # ── Persist to disk, two complementary mechanisms ────────────────
            # 1. JSON keys file: reliable backup that does not depend on the
            #    Blender operator context.  Survives addon renames / reinstalls.
            try:
                _prefs_mod.save_api_keys()
            except Exception as _json_exc:
                print(f"[Mossy Link] Warning: Could not save to JSON keys file: {_json_exc}")
            # 2. Blender user-preferences: uses save_prefs_deferred() which
            #    applies a proper window-context override so the operator
            #    succeeds even when called from inside a timer callback
            #    (bare wm.save_userpref can return CANCELLED silently when
            #    bpy.context.window is None from a timer — RECURRING BUG #12).
            try:
                _prefs_mod.save_prefs_deferred()
            except Exception as _save_exc:
                print(f"[Mossy Link] Warning: Could not schedule prefs save: {_save_exc}")
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
        else:
            print(f"[Mossy Link] ⚠️ PyTorch import failed: {e}")
        return False


def _handle_connection(conn: "socket.socket", token: str) -> None:
    """Handle a single TCP connection in a background thread.

    A non-empty ``token`` is required.  Any connection that does not supply a
    matching token is rejected immediately -- no code is executed.  This keeps
    the exec() gateway closed to every process that does not know the shared
    secret, including other local processes on the same machine.

    To connect from Mossy: set the same token in the Mossy desktop app and in
    the Blender add-on preferences (Add-ons > Blender Game Tools > Mossy Link
    Token).
    """
    try:
        chunks = []
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            chunks.append(chunk)
            # A well-formed JSON command fits in one recv on localhost; stop
            # when the buffer ends with a newline or is smaller than full MTU.
            if b"\n" in chunk or len(chunk) < 4096:
                break
        data = b"".join(chunks)
        if not data:
            return

        cmd = json.loads(data.decode("utf-8"))

        # Mandatory auth check -- reject if token is empty or does not match.
        if not token or cmd.get("token") != token:
            conn.sendall(
                json.dumps({"status": "error", "message": "Unauthorized"}).encode()
            )
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
        # The token check in _handle_connection guards access - keep the token
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
            # Same security note as above - execution is gated by the token check.
            ns = {"bpy": bpy, "__name__": "__mossy_script__"}
            exec(compile(code, name, "exec"), ns)  # noqa: S102
        return {"status": "success", "message": f"Text block '{name}' updated"}

    if cmd_type == "operator":
        op_id = cmd.get("id", "")          # e.g. "fo4.pipeline_static_mesh"
        params = cmd.get("params", {})      # e.g. {"auto_pack_ba2": True}

        if not op_id:
            return {"status": "error", "message": "operator id required"}

        # Resolve bpy.ops.<category>.<name>
        parts = op_id.split(".", 1)
        if len(parts) != 2:
            return {"status": "error", "message": f"Invalid operator id format: {op_id}"}

        category, name = parts
        try:
            op_category = getattr(bpy.ops, category)
            op_func = getattr(op_category, name)
        except AttributeError:
            return {"status": "error", "message": f"Operator not found: {op_id}"}

        try:
            result = op_func(**params)
            return {"status": "ok", "result": str(result)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

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

    # Auto-generate a token if none is set — saves the user from having to
    # configure one manually on first run.  The generated token is saved to
    # preferences so it persists across sessions and Mossy can read it.
    if not token or not token.strip():
        import secrets as _secrets
        token = _secrets.token_hex(16)
        try:
            from . import preferences as _prefs_tok
            prefs = _prefs_tok.get_preferences()
            if prefs and hasattr(prefs, "token"):
                prefs.token = token
                print(f"[Mossy Link] Auto-generated token: {token}")
                print(f"[Mossy Link] Copy this token into Mossy desktop app settings.")
        except Exception:
            pass

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

def ask_mossy(
    query: str,
    context_data=None,
    timeout: float = 15,
    fo4_context: bool = True,
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> "str | None":
    """
    Send a natural-language query to Mossy's local Nemotron AI service.

    Mossy must be running on the desktop.  The request goes to
    ``POST http://localhost:{mossy_http_port}/nemotron`` - no data leaves the
    machine.

    :param query:        The natural-language question or prompt.
    :param context_data: Optional dict of structured context (e.g. mesh issues,
                         UV analysis).  Serialised and appended to the prompt.
    :param timeout:      Seconds to wait before giving up.
    :param fo4_context:  When True (default), prepends the FO4 system context so
                         the AI always answers in the Fallout 4 modding domain.
    :param max_tokens:   Maximum tokens in the response.
    :param temperature:  Sampling temperature (lower = more deterministic).
    :returns:            The AI's plain-text response, or ``None`` on any error.
    """
    _tcp_port, llm_port, _token = _get_ports()

    # ── Build prompt with optional FO4 system context ─────────────────────────
    parts = []
    if fo4_context:
        parts.append(_FO4_SYSTEM_CONTEXT)
    parts.append(query)

    if context_data:
        try:
            def _trim(obj, max_chars=1800):
                serialised = json.dumps(obj)
                if len(serialised) <= max_chars:
                    return obj
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
                return obj

            parts.append("\nContext:\n" + json.dumps(_trim(context_data), indent=2))
        except Exception:
            pass

    full_prompt = "\n".join(parts)

    payload = json.dumps({
        "prompt":      full_prompt,
        "max_tokens":  max_tokens,
        "temperature": temperature,
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
                return (
                    data.get("response")
                    or data.get("text")
                    or data.get("content")
                    or data.get("message")
                )
    except Exception:
        pass

    return None


def ask_mossy_fo4(
    query: str,
    mesh_obj=None,
    issues: "list | None" = None,
    timeout: float = 20,
) -> "str | None":
    """
    Ask Mossy AI a Fallout 4-specific question with automatic mesh context.

    Convenience wrapper around :func:`ask_mossy` that builds the ``context_data``
    dict from a Blender mesh object automatically.  Always injects FO4 system
    context so the AI knows the full FO4 modding domain.

    :param query:    The specific question (e.g. "How do I fix this UV issue?").
    :param mesh_obj: Optional active Blender mesh object for auto context.
    :param issues:   Optional list of validation issue strings from validators.
    :param timeout:  Seconds to wait.
    :returns:        AI advice string, or ``None`` when Mossy is offline.
    """
    context: dict = {"domain": "fallout4_modding"}

    if mesh_obj is not None:
        try:
            me = mesh_obj.data
            context["object_name"]  = mesh_obj.name
            context["vertex_count"] = len(me.vertices)
            context["face_count"]   = len(me.polygons)
            context["material_count"] = len(mesh_obj.material_slots)
            context["uv_layers"]    = [uv.name for uv in me.uv_layers]
            context["has_armature"] = any(
                m.type == 'ARMATURE' for m in mesh_obj.modifiers
            )
            context["custom_props"] = {
                k: v for k, v in mesh_obj.items()
                if not k.startswith("_")
            }
        except Exception:
            pass

    if issues:
        context["validation_issues"] = issues[:10]  # cap to avoid overflow

    # Inject relevant addon knowledge base snippets so Mossy can give
    # specific guidance about add-on features, panels, and workflows.
    try:
        from . import knowledge_helpers as _kh
        snippets = _kh.load_snippets(max_files=3, max_chars=2000)
        if snippets:
            context["addon_knowledge"] = snippets[:3]
    except Exception:
        pass

    return ask_mossy(query, context_data=context, timeout=timeout, fo4_context=True)


def quick_connect() -> dict:
    """
    One-click connection to Mossy.  Tests bridge + LLM, starts the TCP
    server (auto-generating a token if needed), and returns a status dict:

        {
            "bridge": (True, "Mossy Bridge online (v1.2)"),
            "llm":    (True, "Mossy LLM online"),
            "server": (True, "Mossy Link server started on port 9999"),
            "token":  "abc123...",   # the token to enter in Mossy settings
        }
    """
    result = {}

    # 1. Test outbound connections (no token needed)
    result["bridge"] = check_bridge(timeout=2.0)
    result["llm"]    = check_llm(timeout=2.0)

    # 2. Start inbound TCP server (auto-generates token if blank)
    if not is_server_running():
        ok, msg = start_server()
        result["server"] = (ok, msg)
    else:
        result["server"] = (True, "Mossy Link server already running")

    # 3. Return current token so user can copy it into Mossy
    _, _, token = _get_ports()
    result["token"] = token

    return result


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


def request_package_install(
    package: str,
    timeout: float = 120.0,
) -> "tuple[bool, str]":
    """
    Ask the Mossy desktop app to install a single Python package into
    Blender's bundled Python environment.

    Mossy handles the build toolchain (Visual Studio, cmake, ninja) so
    packages requiring C++ compilation (e.g. libigl) install cleanly.

    Sends ``POST http://localhost:21337/install_package``::

        {"package": "libigl", "python_exe": "...", "reason": "..."}

    Expected response::

        {"status": "success"|"error", "message": "...", "requires_restart": false}

    :param package:  pip package name (e.g. ``"libigl"``).
    :param timeout:  Seconds to wait for Mossy to finish.
    :returns:        ``(success: bool, message: str)``
    """
    import sys as _sys
    try:
        payload = json.dumps({
            "package":    package,
            "python_exe": _sys.executable,
            "reason":     f"Requested by Mossy Blender add-on",
        }).encode("utf-8")
        req = _url_request.Request(
            f"http://localhost:{_BRIDGE_PORT}/install_package",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ok = data.get("status") == "success"
            return ok, data.get("message", "No message returned")
    except _url_error.URLError:
        return False, "Mossy Bridge not reachable — start Mossy desktop app first"
    except Exception as exc:
        return False, f"install_package request failed: {exc}"


def request_packages_install(
    packages: "list[str]",
    timeout: float = 300.0,
) -> "dict[str, tuple[bool, str]]":
    """
    Ask Mossy to install multiple packages, returning a per-package result dict.

    Sends ``POST http://localhost:21337/install_packages`` (batch endpoint)::

        {"packages": ["scipy", "trimesh", "libigl"], "python_exe": "..."}

    Falls back to calling :func:`request_package_install` one-by-one if the
    batch endpoint is not available (older Mossy versions).

    :param packages: List of pip package names.
    :param timeout:  Total seconds to wait for all installs.
    :returns:        ``{package: (success, message), ...}``
    """
    import sys as _sys
    results: "dict[str, tuple[bool, str]]" = {}

    # Try the batch endpoint first
    try:
        payload = json.dumps({
            "packages":   packages,
            "python_exe": _sys.executable,
        }).encode("utf-8")
        req = _url_request.Request(
            f"http://localhost:{_BRIDGE_PORT}/install_packages",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for pkg in packages:
                pkg_data = data.get(pkg, {})
                ok = pkg_data.get("status") == "success"
                results[pkg] = (ok, pkg_data.get("message", "no detail"))
            return results
    except Exception:
        pass  # fall through to one-by-one

    # Per-package fallback
    per_timeout = max(60.0, timeout / max(len(packages), 1))
    for pkg in packages:
        results[pkg] = request_package_install(pkg, timeout=per_timeout)
    return results


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

    Offloads DDS/BC7 compression (NVTT, texconv) to the Mossy desktop
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


def analyze_texture_content(image) -> dict:
    """
    Analyze a Blender image's channel content for AI context.
    Returns a dict with stats Mossy can use to give texture advice.
    """
    try:
        import numpy as np
        pixels = np.array(image.pixels[:])
        w, h = image.size
        channels = image.channels  # usually 4 (RGBA)
        pixels = pixels.reshape((h, w, channels))

        stats = {
            "name": image.name,
            "width": w,
            "height": h,
            "channels": channels,
            "has_alpha": channels == 4,
        }

        for i, ch_name in enumerate(['R', 'G', 'B', 'A'][:channels]):
            ch = pixels[:, :, i]
            stats[f"channel_{ch_name}_min"] = round(float(ch.min()), 3)
            stats[f"channel_{ch_name}_max"] = round(float(ch.max()), 3)
            stats[f"channel_{ch_name}_mean"] = round(float(ch.mean()), 3)
            stats[f"channel_{ch_name}_variance"] = round(float(ch.var()), 5)
            # Flag flat channels (possible mis-assignment)
            stats[f"channel_{ch_name}_is_flat"] = bool(ch.var() < 0.001)

        return stats
    except Exception as e:
        return {"error": str(e), "name": getattr(image, 'name', 'unknown')}


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
    # Inject FO4 context into scene analysis so the AI knows the domain
    scene_info_with_ctx = dict(scene_info)
    scene_info_with_ctx.setdefault("domain", "fallout4_modding")
    payload = json.dumps({
        "scene_info":  scene_info_with_ctx,
        "system":      _FO4_SYSTEM_CONTEXT,
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


# ── Health monitor (auto-reconnect) ───────────────────────────────────────────

def _health_monitor() -> "float | None":
    """
    Blender timer callback: runs every ``_health_check_interval`` seconds on
    the main thread.

    * Pings the Mossy Bridge (port 21337) and Nemotron LLM (port 5000).
    * Updates ``_bridge_online`` / ``_llm_online`` so the UI reflects live status.
    * If the TCP command server was active but the thread died, attempts to
      restart it automatically (up to ``_MAX_RECONNECT`` times).
    """
    global _last_health_check, _bridge_online, _llm_online
    global _reconnect_attempts, _server_thread

    now = time.monotonic()
    if now - _last_health_check < _health_check_interval:
        return _health_check_interval

    _last_health_check = now

    # Run health pings in a background thread so HTTP timeouts never
    # block Blender's main thread.  Results are written back to the
    # module-level flags which the UI reads on the next redraw.
    def _bg_health_ping():
        global _bridge_online, _llm_online
        try:
            bridge_ok, _ = check_bridge(timeout=0.5)
            _bridge_online = bridge_ok
        except Exception:
            _bridge_online = False
        try:
            llm_ok, _ = check_llm(timeout=0.5)
            _llm_online = llm_ok
        except Exception:
            _llm_online = False
    threading.Thread(target=_bg_health_ping, daemon=True,
                     name="MossyHealthPing").start()

    # Auto-reconnect TCP server if it crashed
    if _active and (_server_thread is None or not _server_thread.is_alive()):
        if _reconnect_attempts < _MAX_RECONNECT:
            _reconnect_attempts += 1
            print(f"[Mossy Link] TCP server appears dead — auto-reconnect attempt "
                  f"{_reconnect_attempts}/{_MAX_RECONNECT}")
            try:
                tcp_port, _, token = _get_ports()
                if token and token.strip():
                    t = threading.Thread(
                        target=_tcp_server_loop,
                        args=("127.0.0.1", tcp_port, token),
                        daemon=True,
                        name="MossyLinkTCP",
                    )
                    t.start()
                    _server_thread = t
                    print("[Mossy Link] TCP server restarted successfully.")
                    _reconnect_attempts = 0
            except Exception as exc:
                print(f"[Mossy Link] Auto-reconnect failed: {exc}")
        else:
            print(f"[Mossy Link] Max reconnect attempts ({_MAX_RECONNECT}) reached — "
                  "stopping auto-reconnect.")

    # Sync status to WindowManager for UI
    try:
        import bpy as _bpy
        wm = _bpy.context.window_manager
        if hasattr(wm, "mossy_link_active"):
            wm.mossy_link_active = _active
        if hasattr(wm, "mossy_bridge_status"):
            wm.mossy_bridge_status = "Mossy Bridge online" if _bridge_online else "Mossy Bridge offline"
    except Exception:
        pass

    return _health_check_interval


def get_connection_status() -> dict:
    """
    Return a dict summarising the current Mossy connection state.

        status = mossy_link.get_connection_status()
        # {"server_active": True, "bridge_online": True, "llm_online": False,
        #   "pytorch_path": "D:/torch", "reconnect_attempts": 0}
    """
    return {
        "server_active":      _active,
        "bridge_online":      _bridge_online,
        "llm_online":         _llm_online,
        "pytorch_path":       _pytorch_path,
        "reconnect_attempts": _reconnect_attempts,
    }


# ── Scene watcher: push live Blender context to Mossy ─────────────────────────
#
# The depsgraph_update_post handler fires after every change in Blender
# (mesh edit, mode switch, modifier apply, object move, etc.).  It is
# throttled by _last_context_push / _PUSH_THROTTLE_SECONDS so Mossy
# receives at most one update every 2 seconds during active editing.
#
# Two things happen on each push:
#   1. push_blender_context()    — sends structured scene state to Mossy bridge
#      so the desktop app always knows what object is active, its stats, and
#      any custom properties (fo4_mesh_type, fo4_collision_type, etc.).
#   2. _auto_validate_and_advise() — runs validate_mesh() on the active mesh
#      and, if new issues are detected, queries the Mossy AI for specific fix
#      advice which is cached for the AI Advisor panel to display.
#
# Validation is throttled more aggressively (10 s) and only runs when the
# vertex count changes (i.e. the mesh geometry actually changed).
#
# The watcher can be started/stopped independently of the TCP server so
# users can run the bridge without live scene monitoring if desired.

_last_context_push: float = 0.0        # module-level (replaces the stub above)
_PUSH_THROTTLE_SECONDS: float = 2.0    # max 1 push per N seconds
_last_validation_time: float = 0.0
_VALIDATE_THROTTLE_SECONDS: float = 10.0
_last_validated_vert_count: int = -1
_last_ai_advice: dict = {}             # {object_name: advice_string}
_scene_watcher_active: bool = False


def push_blender_context(obj=None) -> bool:
    """POST the current Blender scene state to the Mossy Bridge.

    Sends to ``POST http://localhost:21337/blender_context``.  Mossy uses
    this to keep its UI, AI prompts, and tool suggestions in sync with
    whatever the user is working on in Blender.

    :param obj: Active Blender object (resolved from bpy.context if None).
    :returns:   True if the push was accepted by the bridge, else False.
    """
    try:
        import bpy as _bpy
        if obj is None:
            obj = _bpy.context.active_object
    except Exception:
        return False

    ctx: dict = {
        "source":    "blender_addon",
        "domain":    "fallout4_modding",
        "timestamp": time.monotonic(),
    }

    if obj is not None:
        ctx["object_name"] = obj.name
        ctx["object_type"] = obj.type
        if obj.type == 'MESH':
            me = obj.data
            ctx["vertex_count"]    = len(me.vertices)
            ctx["poly_count"]      = len(me.polygons)
            ctx["uv_layers"]       = [uv.name for uv in me.uv_layers]
            ctx["material_slots"]  = len(obj.material_slots)
            ctx["modifiers"]       = [m.name for m in obj.modifiers]
            ctx["has_armature"]    = any(m.type == 'ARMATURE' for m in obj.modifiers)
            ctx["fo4_mesh_type"]   = obj.get("fo4_mesh_type", "")
            ctx["fo4_collision"]   = obj.get("fo4_collision_type", "")
            ctx["fo4_object_type"] = obj.get("fo4_object_type", "")
            ctx["scale_applied"]   = all(abs(s - 1.0) < 1e-4 for s in obj.scale)
            # Flag common problems directly so Mossy can highlight them
            ctx["issues"] = _last_ai_advice.get(obj.name + "_issues", [])
        ctx["mode"]            = getattr(obj, "mode", "OBJECT")
        ctx["custom_props"]    = {
            k: v for k, v in obj.items()
            if not k.startswith("_") and k not in ("cycles", "cycles_visibility")
        }
    else:
        ctx["object_name"] = None
        ctx["object_type"] = None

    payload = json.dumps(ctx).encode("utf-8")
    try:
        req = _url_request.Request(
            f"http://localhost:{_BRIDGE_PORT}/blender_context",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _url_request.urlopen(req, timeout=0.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def _auto_validate_and_advise(obj) -> None:
    """Validate *obj* (mesh only) and request AI advice when issues are found.

    Results are stored in ``_last_ai_advice`` keyed by object name so the
    AI Advisor panel can display them without blocking the main thread.
    The actual AI query runs on a background thread to keep Blender responsive.
    """
    global _last_validation_time, _last_validated_vert_count

    if obj is None or obj.type != 'MESH':
        return

    now = time.monotonic()
    if now - _last_validation_time < _VALIDATE_THROTTLE_SECONDS:
        return

    vert_count = len(obj.data.vertices)
    if vert_count == _last_validated_vert_count and _last_validation_time > 0:
        return  # geometry did not change — skip

    _last_validation_time = now
    _last_validated_vert_count = vert_count

    # Capture what we need from the main thread before handing off.
    obj_name = obj.name

    def _bg_validate():
        try:
            from . import mesh_helpers as _mh
            ok, issues = _mh.MeshHelpers.validate_mesh(obj)
            _last_ai_advice[obj_name + "_issues"] = issues if not ok else []

            if not ok and _bridge_online:
                # Build a concise query describing the actual issues
                issue_list = "; ".join(issues[:5])
                query = (
                    f"The active object \"{obj_name}\" has these issues: {issue_list}. "
                    "What is the fastest way to fix each one in Blender so the mesh "
                    "is ready for Fallout 4 NIF export?"
                )
                advice = ask_mossy(query, fo4_context=True, max_tokens=400, timeout=15)
                if advice:
                    _last_ai_advice[obj_name] = advice
                    print(f"[Mossy Link] AI advice cached for \"{obj_name}\": {len(advice)} chars")
        except Exception as exc:
            print(f"[Mossy Link] Auto-validate error: {exc}")

    threading.Thread(target=_bg_validate, daemon=True,
                     name="MossyAutoValidate").start()


@bpy.app.handlers.persistent
def _depsgraph_handler(scene, depsgraph) -> None:
    """bpy.app.handlers.depsgraph_update_post handler.

    Throttled to fire at most once every _PUSH_THROTTLE_SECONDS seconds.
    Pushes context to Mossy bridge and triggers background validation.
    Heavy work (HTTP, LLM queries) runs on daemon threads so Blender stays
    responsive.
    """
    global _last_context_push

    if not _scene_watcher_active:
        return

    now = time.monotonic()
    if now - _last_context_push < _PUSH_THROTTLE_SECONDS:
        return
    _last_context_push = now

    try:
        import bpy as _bpy
        obj = _bpy.context.active_object
    except Exception:
        return

    # Push context on a background thread so HTTP never blocks main thread.
    def _bg_push():
        push_blender_context(obj)
        _auto_validate_and_advise(obj)

    threading.Thread(target=_bg_push, daemon=True,
                     name="MossyContextPush").start()


def get_last_ai_advice(obj_name: str) -> "str | None":
    """Return the most recent Mossy AI advice for *obj_name*, or None.

    Called by the AI Advisor panel to display proactive fix suggestions
    without triggering a new LLM query on every UI redraw.
    """
    return _last_ai_advice.get(obj_name)


def get_last_validation_issues(obj_name: str) -> "list[str]":
    """Return the last validation issues detected for *obj_name*."""
    return _last_ai_advice.get(obj_name + "_issues", [])


def start_scene_watcher() -> tuple:
    """Register the depsgraph handler so Mossy can watch Blender in real time.

    :returns: ``(success: bool, message: str)``
    """
    global _scene_watcher_active
    try:
        import bpy as _bpy
        if _depsgraph_handler not in _bpy.app.handlers.depsgraph_update_post:
            _bpy.app.handlers.depsgraph_update_post.append(_depsgraph_handler)
        _scene_watcher_active = True
        return True, "Scene watcher started — Mossy is now watching Blender"
    except Exception as exc:
        return False, f"Could not start scene watcher: {exc}"


def stop_scene_watcher() -> tuple:
    """Unregister the depsgraph handler.

    :returns: ``(success: bool, message: str)``
    """
    global _scene_watcher_active
    _scene_watcher_active = False
    try:
        import bpy as _bpy
        handlers = _bpy.app.handlers.depsgraph_update_post
        if _depsgraph_handler in handlers:
            handlers.remove(_depsgraph_handler)
        return True, "Scene watcher stopped"
    except Exception as exc:
        return False, f"Could not stop scene watcher: {exc}"


def is_scene_watcher_running() -> bool:
    """Return True when the depsgraph scene watcher is active."""
    return _scene_watcher_active


# ── Blender register / unregister ─────────────────────────────────────────────

def register() -> None:
    """Called by the add-on register().  Auto-starts the server if preferred."""
    global _reconnect_attempts
    _reconnect_attempts = 0

    try:
        pytorch_path = _load_pytorch_path_from_prefs()
        if pytorch_path:
            print(f"[Mossy Link] PyTorch path loaded on add-on register: {pytorch_path}")

        from . import preferences as _prefs_mod
        prefs = _prefs_mod.get_preferences()
        if prefs and getattr(prefs, "autostart", False):
            ok, msg = start_server()
            print(f"[Mossy Link] {msg}")
    except Exception as exc:
        print(f"[Mossy Link] register() error: {exc}")

    # Start the health monitor timer (15 s interval, very low overhead)
    try:
        import bpy as _bpy
        if not _bpy.app.timers.is_registered(_health_monitor):
            _bpy.app.timers.register(_health_monitor, first_interval=5.0)
            print("[Mossy Link] Health monitor started (15 s interval)")
    except Exception as exc:
        print(f"[Mossy Link] Could not start health monitor: {exc}")

    # Start the scene watcher so Mossy can see what the user is doing
    try:
        from . import preferences as _prefs_sw
        prefs = _prefs_sw.get_preferences()
        # Default on; users can disable via preferences if desired
        watch = getattr(prefs, "scene_watcher_enabled", True) if prefs else True
        if watch:
            ok_w, msg_w = start_scene_watcher()
            print(f"[Mossy Link] {msg_w}")
    except Exception as exc:
        print(f"[Mossy Link] Could not start scene watcher: {exc}")


def unregister() -> None:
    """Called by the add-on unregister().  Stops the server, monitor, and watcher."""
    stop_scene_watcher()
    try:
        import bpy as _bpy
        if _bpy.app.timers.is_registered(_health_monitor):
            _bpy.app.timers.unregister(_health_monitor)
    except Exception:
        pass
    try:
        stop_server()
    except Exception as exc:
        print(f"[Mossy Link] unregister() error: {exc}")
