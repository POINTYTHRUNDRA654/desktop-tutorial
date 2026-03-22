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
import queue
import socket
import threading
from urllib import error as _url_error
from urllib import request as _url_request

# ── Internal state ─────────────────────────────────────────────────────────────
_server_thread: "threading.Thread | None" = None
_server_socket: "socket.socket | None" = None
_active: bool = False
_command_queue: queue.Queue = queue.Queue()

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

# ── TCP command server ─────────────────────────────────────────────────────────

def _handle_connection(conn: socket.socket, token: str) -> None:
    """Read one JSON command from *conn*, queue it, wait for result, reply."""
    try:
        # Read until we have a complete JSON object (≤ 64 KB for safety).
        data = b""
        conn.settimeout(5.0)
        while len(data) < 65536:
            try:
                chunk = conn.recv(4096)
            except socket.timeout:
                break
            if not chunk:
                break
            data += chunk
            try:
                json.loads(data.decode("utf-8"))
                break          # valid JSON received
            except json.JSONDecodeError:
                continue       # wait for more bytes

        if not data:
            conn.close()
            return

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
    cmd_type = cmd.get("type", "script")

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

# ── Blender register / unregister ─────────────────────────────────────────────

def register() -> None:
    """Called by the add-on register().  Auto-starts the server if preferred."""
    try:
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
