"""
Mossy Link – two-way bridge between Blender and Mossy, your AI modding tutor.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────┐    TCP (port 9999)   ┌───────────────────────┐
  │   Mossy AI   │ ──────────────────▶ │  MossyLinkServer      │
  │  (desktop)   │  ← Blender control   │  (running in Blender) │
  └──────┬───────┘                      └───────────────────────┘
         │
         │ HTTP (port 8080)   ← AI queries from Blender → Mossy
         ▼
  Mossy's HTTP server  (ask_mossy / query_mossy)

Blender → Mossy (outbound HTTP):
  ask_mossy({"query": "…", "context": {…}})
    → POST http://localhost:8080/ask
    → returns Mossy's AI response string

Mossy → Blender (inbound TCP on port 9999):
  {"type": "status"}                           → Blender/scene info
  {"type": "get_advisor_report"}               → run advisor, return findings
  {"type": "script",  "code": "<python src>"}  → execute Python in Blender
  {"type": "text",    "name": "<text-block>"}  → run a Blender text block
  {"type": "get_object", "name": "<obj>"}      → object transforms/visibility
  {"type": "run_operator", "operator": "ns.id",
           "kwargs": {...}}                    → call bpy.ops.<ns>.<id>(**kwargs)

All inbound commands accept an optional "token" field when a secret is set.

SECURITY NOTE: The "script" and "text" handlers execute arbitrary Python with
full Blender privileges.  The server binds to 127.0.0.1 only and supports
optional token auth.  Set a strong token and never expose port 9999 to an
untrusted network.
"""

import bpy
import contextlib
import json
import socket
import threading
import urllib.request
import urllib.error


# ---------------------------------------------------------------------------
# Preference helper  (safe against bpy.context being None)
# ---------------------------------------------------------------------------

def _get_prefs():
    """Return the add-on preferences, or None if not yet registered.

    Guards against ``bpy.context`` being ``None`` (can happen during
    registration or when called from a load-post handler before the context
    is fully rebuilt).
    """
    try:
        ctx = bpy.context
        if ctx is None:
            return None
        addon = ctx.preferences.addons.get(__package__.split(".")[0])
        return addon.preferences if addon else None
    except Exception:
        return None


def _get_wm():
    """Return ``bpy.context.window_manager`` or ``None`` if unavailable."""
    try:
        ctx = bpy.context
        return ctx.window_manager if ctx else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

# module-level server instance, kept alive even when the current .blend changes
_server = None

class MossyLinkServer:
    def __init__(self, host='127.0.0.1', port=9999, token=""):
        self.host, self.port, self.token = host, port, token
        self.socket = None; self.running = False; self.thread = None

    def start(self):
        if self.running:
            return False
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(1)
            self.running = True
            self.thread = threading.Thread(target=self._server_loop, daemon=True)
            self.thread.start()
            print(f"[Mossy Link] Server started on {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"[Mossy Link] Failed to start server: {e}")
            self.running = False
            return False

    def stop(self):
        self.running = False
        if self.socket:
            try: self.socket.close()
            except: pass

    def _server_loop(self):
        while self.running:
            try:
                client, _ = self.socket.accept()
                self.client_socket = client
                data = client.recv(65536).decode('utf-8')
                # parse JSON, execute commands, send back response
                try:
                    cmd = json.loads(data)
                    resp = self._execute_command(cmd)
                except Exception as e:
                    resp = {"success": False, "error": str(e)}
                client.send(json.dumps(resp).encode('utf-8'))
                client.close()
            except Exception as e:
                if self.running: print("[Mossy Link] server error", e)

    def _execute_command(self, cmd):
        # Token authentication
        if self.token and cmd.get("token") != self.token:
            return {"success": False, "error": "unauthorized"}

        action = cmd.get("type") or cmd.get("action", "")

        if action == "status":
            return self._handle_status()
        elif action == "get_advisor_report":
            return self._handle_get_advisor_report()
        elif action == "script":
            return self._handle_script(cmd)
        elif action == "text":
            return self._handle_text(cmd)
        elif action == "get_object":
            return self._handle_get_object(cmd)
        elif action == "run_operator":
            return self._handle_run_operator(cmd)
        else:
            return {"success": False, "error": f"unknown command: {action!r}"}

    # ---- individual command handlers ----

    def _handle_status(self):
        try:
            scene_name = bpy.context.scene.name if (bpy.context and bpy.context.scene) else None
        except Exception:
            scene_name = None
        return {
            "success": True,
            "status": "online",
            "blender_version": ".".join(str(v) for v in bpy.app.version),
            "scene": scene_name,
        }

    def _handle_get_advisor_report(self):
        """Run the FO4 advisor on the current scene and return the report.

        Mossy can call this to get a fresh snapshot of all mesh/texture/export
        issues without needing the user to click anything in Blender.  The
        response contains the same fields as ``AdvisorHelpers.analyze_scene()``:
        ``objects_checked``, ``issues``, ``suggestions``.
        """
        try:
            from . import advisor_helpers
            ctx = bpy.context
            if ctx is None:
                return {"success": False, "error": "Blender context unavailable"}
            report = advisor_helpers.AdvisorHelpers.analyze_scene(ctx, use_llm=False)
            return {
                "success": True,
                "objects_checked": report.get("objects_checked", 0),
                "issues": report.get("issues", []),
                "suggestions": report.get("suggestions", []),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _handle_script(self, cmd):
        code = cmd.get("code", "")
        if not code:
            return {"success": False, "error": "no code provided"}
        exec_ns = {"bpy": bpy}
        try:
            exec(compile(code, "<mossy_link>", "exec"), exec_ns)
            return {"success": True, "result": exec_ns.get("__result__", {})}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _handle_text(self, cmd):
        name = cmd.get("name", "")
        block = bpy.data.texts.get(name)
        if block is None:
            return {"success": False, "error": f"text block not found: {name!r}"}
        exec_ns = {"bpy": bpy}
        try:
            exec(compile(block.as_string(), name, "exec"), exec_ns)
            return {"success": True, "result": exec_ns.get("__result__", {})}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _handle_get_object(self, cmd):
        name = cmd.get("name", "")
        obj = bpy.data.objects.get(name) if name else bpy.context.active_object
        if obj is None:
            return {"success": False, "error": "object not found"}
        return {
            "success": True,
            "object": {
                "name": obj.name,
                "type": obj.type,
                "location": list(obj.location),
                "rotation_euler": list(obj.rotation_euler),
                "scale": list(obj.scale),
                "visible": obj.visible_get(),
            },
        }

    def _handle_run_operator(self, cmd):
        op_id = cmd.get("operator", "")
        kwargs = cmd.get("kwargs", {})
        if not op_id or "." not in op_id:
            return {"success": False, "error": "invalid operator id"}
        module, func = op_id.split(".", 1)
        try:
            result = getattr(getattr(bpy.ops, module), func)(**kwargs)
            return {"success": True, "result": str(result)}
        except Exception as e:
            return {"success": False, "error": str(e)}




def _get_server():
    """Return the singleton server, creating it if needed.

    We store a reference at module level rather than on ``Scene`` so that the
    socket remains open when the user loads a new file.  ``WindowManager``
    carries a simple boolean that mirrors the connection state for the UI.
    """
    global _server
    if _server is None:
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        token = prefs.token if prefs else ""
        _server = MossyLinkServer(port=port, token=token)
    return _server


# ---------------------------------------------------------------------------
# Outbound HTTP client — Blender → Mossy's AI server
# ---------------------------------------------------------------------------

def ask_mossy(query: str, context_data: "dict | None" = None, timeout: int = 10):
    """Send an AI question to Mossy's HTTP server and return the response text.

    Mossy must be running and its HTTP server must be listening on the port
    configured in the add-on preferences (``mossy_http_port``, default 8080).

    Mossy's expected API contract
    ──────────────────────────────
    POST http://localhost:<port>/ask
    Content-Type: application/json
    Body: {
      "query":   "<natural-language question>",
      "context": {<optional structured data>},
      "mode":    "fo4_advisor"
    }

    Response (JSON): {
      "success":  true,
      "response": "<Mossy's answer as plain text>"
    }

    Returns the response string on success, or ``None`` on any failure
    (connection refused, timeout, malformed JSON, etc.) so callers can
    check for ``None`` and fall back to an alternative AI provider.
    Never raises.
    """
    prefs = _get_prefs()
    port = getattr(prefs, 'mossy_http_port', 8080) if prefs else 8080
    endpoint = f"http://localhost:{port}/ask"

    payload = {
        "query":   query,
        "context": context_data or {},
        "mode":    "fo4_advisor",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with contextlib.closing(urllib.request.urlopen(req, timeout=timeout)) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    result = (
                        parsed.get("response")
                        or parsed.get("message")
                        or parsed.get("answer")
                    )
                    # Return None (not empty string) so callers can fall back.
                    return result if result else None
            except json.JSONDecodeError:
                pass
            # Raw text response (non-JSON) — return only if non-empty.
            return text.strip() or None
    except Exception:
        # Connection refused, timeout, etc. — return None so callers can
        # fall back to the remote LLM endpoint without special-casing.
        return None


def mossy_http_available(timeout: int = 2) -> bool:
    """Return True if Mossy's HTTP server is reachable (quick health-check)."""
    prefs = _get_prefs()
    port = getattr(prefs, 'mossy_http_port', 8080) if prefs else 8080
    url = f"http://localhost:{port}/status"
    try:
        req = urllib.request.Request(url, method="GET")
        with contextlib.closing(urllib.request.urlopen(req, timeout=timeout)) as r:
            return r.status == 200
    except Exception:
        return False


# ---------------------------------------------------------------------------
# TCP client helper (for scripts running OUTSIDE Blender that want to
# send commands TO Blender's Mossy Link server)
# ---------------------------------------------------------------------------

def send_to_mossy(cmd: dict) -> "dict | None":
    """Send a command dict to Blender's Mossy Link TCP server and return the reply.

    This is intended for use from **external scripts** (e.g. Mossy's own code)
    that want to control Blender.  From inside Blender you can call the helper
    methods on ``MossyLinkServer`` directly.

    Returns the parsed JSON reply dict on success, or ``None`` if the
    connection fails or the response cannot be parsed.  Callers should
    handle ``None`` gracefully.

    Example (run from outside Blender):
        result = send_to_mossy({'type': 'status'})
        if result:
            print(result['blender_version'])

        report = send_to_mossy({'type': 'get_advisor_report'})
        if report:
            for issue in report.get('issues', []):
                print(issue)
    """
    prefs = _get_prefs()
    port = prefs.port if prefs else 9999
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(5)
        s.connect(('127.0.0.1', port))
        s.send((json.dumps(cmd) + '\n').encode())
        data = s.recv(65536).decode()
        return json.loads(data)
    except Exception:
        return None
    finally:
        s.close()


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class WM_OT_MossyLinkToggle(bpy.types.Operator):
    """Start or stop the Mossy Link TCP server"""
    bl_idname = "wm.mossy_link_toggle"
    bl_label = "Toggle Mossy Link"

    def execute(self, context):
        wm = context.window_manager
        server = _get_server()
        if wm.mossy_link_active:
            wm.mossy_link_active = False
            server.stop()
            self.report({'INFO'}, "Mossy Link stopped")
        else:
            ok = server.start()
            wm.mossy_link_active = ok
            if ok:
                prefs = _get_prefs()
                port = prefs.port if prefs else 9999
                self.report({'INFO'}, f"Mossy Link listening on 127.0.0.1:{port}")
            else:
                self.report({'ERROR'}, "Mossy Link failed to start – see console")
        return {'FINISHED'}


class WM_OT_MossyCheckHTTP(bpy.types.Operator):
    """Check whether Mossy's HTTP server (AI endpoint) is reachable"""
    bl_idname = "wm.mossy_check_http"
    bl_label = "Check Mossy HTTP"

    def execute(self, context):
        if mossy_http_available():
            prefs = _get_prefs()
            port = getattr(prefs, 'mossy_http_port', 8080) if prefs else 8080
            self.report({'INFO'}, f"Mossy HTTP server reachable on port {port} ✓")
        else:
            self.report({'WARNING'}, "Mossy HTTP server not reachable – is Mossy running?")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Panel  (Mossy tab – dedicated controls for the Mossy connection)
# ---------------------------------------------------------------------------

class MOSSY_PT_LinkPanel(bpy.types.Panel):
    """Mossy Link connection panel"""
    bl_label = "Mossy Link"
    bl_idname = "MOSSY_PT_link_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Mossy'

    def draw(self, context):
        layout = self.layout
        wm = context.window_manager
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        http_port = getattr(prefs, 'mossy_http_port', 8080) if prefs else 8080

        # ── TCP server (Mossy → Blender) ─────────────────────────────────
        tcp_box = layout.box()
        tcp_box.label(text="Blender ← Mossy  (TCP control)", icon='NETWORK_DRIVE')
        if wm.mossy_link_active:
            tcp_box.label(text=f"✓ Listening on 127.0.0.1:{port}", icon='CHECKMARK')
        else:
            tcp_box.label(text=f"✗ Server stopped", icon='ERROR')
        tcp_box.operator(
            "wm.mossy_link_toggle",
            text="Stop Server" if wm.mossy_link_active else "Start Server",
            icon='CANCEL' if wm.mossy_link_active else 'PLAY',
        )

        # ── HTTP client (Blender → Mossy AI) ─────────────────────────────
        http_box = layout.box()
        http_box.label(text="Blender → Mossy AI  (HTTP queries)", icon='URL')
        http_box.label(text=f"Mossy HTTP port: {http_port}")
        http_box.operator("wm.mossy_check_http", text="Check Mossy HTTP", icon='QUESTION')

        # ── Quick-start guide ────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Quick Start", icon='INFO')
        info_box.label(text="1. Launch Mossy on your desktop")
        info_box.label(text="2. Click 'Start Server' above")
        info_box.label(text="3. Mossy will auto-connect to Blender")
        info_box.label(text="4. Go to Fallout 4 → Advisor → Ask Mossy")
        info_box.label(text="Set port/token in Add-on Preferences")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def _on_load_post(dummy=None):
    """Re-start the Mossy Link server after a new .blend file is loaded.

    Guards against ``bpy.context`` being ``None``, which can happen during
    file-load before the main window is ready.
    """
    prefs = _get_prefs()
    wm = _get_wm()
    was_active = getattr(wm, 'mossy_link_active', False) if wm else False

    if (prefs and prefs.autostart) or was_active:
        server = _get_server()
        ok = server.start()
        if wm is not None:
            wm.mossy_link_active = ok


def _deferred_autostart():
    """Start the server once Blender's context is fully available."""
    prefs = _get_prefs()
    if prefs and prefs.autostart:
        server = _get_server()
        ok = server.start()
        wm = _get_wm()
        if wm is not None:
            wm.mossy_link_active = ok
    return None  # run once


def register():
    bpy.utils.register_class(WM_OT_MossyLinkToggle)
    bpy.utils.register_class(WM_OT_MossyCheckHTTP)
    bpy.utils.register_class(MOSSY_PT_LinkPanel)
    bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(
        name="Mossy Link Active",
        description="Whether the Mossy Link TCP server is running",
        default=False,
    )

    # Create the singleton server object (does NOT start the socket yet –
    # deferred until bpy.context is fully available after registration).
    _get_server()

    # Defer autostart so bpy.context.window_manager is safe to access.
    bpy.app.timers.register(_deferred_autostart, first_interval=0.5)

    # Re-start the server whenever a new .blend file is loaded.
    if _on_load_post not in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.append(_on_load_post)


def unregister():
    # Stop the server when the add-on is disabled.
    global _server
    if _server:
        _server.stop()
        _server = None

    if _on_load_post in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(_on_load_post)

    try:
        del bpy.types.WindowManager.mossy_link_active
    except AttributeError:
        pass

    try:
        bpy.utils.unregister_class(MOSSY_PT_LinkPanel)
    except Exception:
        pass
    try:
        bpy.utils.unregister_class(WM_OT_MossyCheckHTTP)
    except Exception:
        pass
    try:
        bpy.utils.unregister_class(WM_OT_MossyLinkToggle)
    except Exception:
        pass
