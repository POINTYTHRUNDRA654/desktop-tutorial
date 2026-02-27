"""
Mossy Link – lightweight TCP remote-control server for the Fallout 4 add-on.

Supported commands (sent as JSON objects):
  {"type": "status"}                              → Blender version / scene name
  {"type": "script",  "code": "<python src>"}    → execute arbitrary Python
  {"type": "text",    "name": "<text-block>"}    → execute a Blender text block
  {"type": "get_object", "name": "<obj>"}        → object transform / visibility
  {"type": "run_operator", "operator": "ns.id",
           "kwargs": {...}}                       → call bpy.ops.<ns>.<id>(**kwargs)

All commands accept an optional "token" field when a secret is configured.

SECURITY NOTE: The "script" and "text" handlers execute arbitrary Python with full
Blender privileges.  The server binds to 127.0.0.1 only and supports token auth to
limit exposure, but you should set a strong token and never expose the port to an
untrusted network.

Client helper (runs outside Blender):
  send_to_mossy({'type': 'status'})
"""

import bpy
import socket
import threading
import json


# ---------------------------------------------------------------------------
# Preference helper
# ---------------------------------------------------------------------------

def _get_prefs():
    """Return the add-on preferences, or None if not yet registered."""
    addon = bpy.context.preferences.addons.get(__package__.split(".")[0])
    return addon.preferences if addon else None


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

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
        return {
            "success": True,
            "status": "online",
            "blender_version": ".".join(str(v) for v in bpy.app.version),
            "scene": bpy.context.scene.name if bpy.context.scene else None,
        }

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


# ---------------------------------------------------------------------------
# Client helper (can be called from external scripts or Blender's text editor)
# ---------------------------------------------------------------------------

def send_to_mossy(cmd):
    import socket, json
    prefs = _get_prefs()
    port = prefs.port if prefs else 9999
    s = socket.socket()
    s.connect(('127.0.0.1', port))
    s.send((json.dumps(cmd) + '\n').encode())
    return json.loads(s.recv(65536).decode())

# example:
# print(send_to_mossy({'type': 'status'}))


# ---------------------------------------------------------------------------
# Operator
# ---------------------------------------------------------------------------

class WM_OT_MossyLinkToggle(bpy.types.Operator):
    bl_idname = "wm.mossy_link_toggle"
    bl_label = "Toggle Mossy Link"

    def execute(self, context):
        wm = context.window_manager
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        if wm.mossy_link_active:
            wm.mossy_link_active = False
            context.scene.mossy_link_server.stop()
        else:
            wm.mossy_link_active = context.scene.mossy_link_server.start()
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Panel
# ---------------------------------------------------------------------------

class MOSSY_PT_LinkPanel(bpy.types.Panel):
    bl_label = "Mossy Link"
    bl_idname = "MOSSY_PT_link_panel"
    bl_space_type = 'VIEW_3D'; bl_region_type = 'UI'; bl_category = 'Mossy'

    def draw(self, context):
        layout = self.layout
        wm = context.window_manager
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        if wm.mossy_link_active:
            layout.label(text=f"CONNECTED (port {port})", icon='CHECKMARK')
        else:
            layout.label(text="DISCONNECTED", icon='ERROR')
        layout.operator("wm.mossy_link_toggle",
                        text="Disconnect" if wm.mossy_link_active else "Connect to Mossy")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register():
    bpy.utils.register_class(WM_OT_MossyLinkToggle)
    bpy.utils.register_class(MOSSY_PT_LinkPanel)
    # … other operators …
    bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(default=False)
    prefs = _get_prefs()
    port = prefs.port if prefs else 9999
    token = prefs.token if prefs else ""
    bpy.types.Scene.mossy_link_server = MossyLinkServer(port=port, token=token)
    if prefs and prefs.autostart:
        bpy.types.Scene.mossy_link_server.start()


def unregister():
    server = getattr(bpy.types.Scene, 'mossy_link_server', None)
    if server:
        server.stop()
    try:
        del bpy.types.Scene.mossy_link_server
    except AttributeError:
        pass
    try:
        del bpy.types.WindowManager.mossy_link_active
    except AttributeError:
        pass
    bpy.utils.unregister_class(MOSSY_PT_LinkPanel)
    bpy.utils.unregister_class(WM_OT_MossyLinkToggle)
