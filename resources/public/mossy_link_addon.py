"""
Mossy Link Add-on for Blender 4.5.5+
Enables real-time AI-driven script execution and control via the OmniForge Desktop Bridge

This add-on creates a socket server that listens for commands from Mossy (the AI assistant)
and executes Python scripts in Blender's context, returning results for AI feedback.

Installation:
1. Download this file: mossy_link_addon.py
2. Open Blender → Edit → Preferences → Add-ons → Install...
3. Select this file and click "Install Add-on"
4. Search for "Mossy Link" and enable it
5. The add-on will automatically start listening on port 9999

Usage:
- Mossy will automatically detect when this add-on is active
- AI commands will be executed directly in your Blender scene
- Results are streamed back to Mossy for further processing
"""

import bpy
import socket
import threading
import json
import sys
import traceback
from io import StringIO
from pathlib import Path

bl_info = {
    "name": "Mossy Link - AI Assistant Integration",
    "blender": (4, 5, 0),
    "author": "OmniForge AI",
    "version": (5, 0, 0),
    "location": "View3D > Mossy Link Panel",
    "description": "Real-time AI script execution and Blender control via Mossy v4.0+ Desktop Bridge",
    "warning": "",
    "wiki_url": "",
    "tracker_url": "",
    "category": "System",
    "support": "COMMUNITY",
}


class MossyLinkPreferences(bpy.types.AddonPreferences):
    bl_idname = __name__

    port: bpy.props.IntProperty(
        name="Port",
        description="Port that Mossy connects to",
        default=9999,
        min=1024,
        max=65535,
    )
    token: bpy.props.StringProperty(
        name="Access Token",
        description="Optional shared secret to authorize Mossy connections",
        default="",
        subtype='PASSWORD',
    )
    autostart: bpy.props.BoolProperty(
        name="Autostart",
        description="Start Mossy Link when Blender launches",
        default=True,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "port")
        layout.prop(self, "token")
        layout.prop(self, "autostart")


def _get_prefs():
    addon = bpy.context.preferences.addons.get(__name__)
    return addon.preferences if addon else None

class MossyLinkServer:
    """Socket server for receiving and executing Mossy commands"""
    
    def __init__(self, host='127.0.0.1', port=9999, token=""):
        self.host = host
        self.port = port
        self.token = token
        self.socket = None
        self.running = False
        self.thread = None
        self.client_socket = None
        
    def start(self):
        """Start the socket server in a background thread"""
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
        """Stop the socket server"""
        self.running = False
        if self.client_socket:
            try:
                self.client_socket.close()
            except:
                pass
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        print("[Mossy Link] Server stopped")
    
    def _server_loop(self):
        """Main server loop (runs in background thread)"""
        while self.running:
            try:
                self.client_socket, addr = self.socket.accept()
                print(f"[Mossy Link] Connection from {addr}")
                self._handle_client()
            except OSError:
                # Socket closed
                break
            except Exception as e:
                if self.running:
                    print(f"[Mossy Link] Server error: {e}")
    
    def _handle_client(self):
        """Handle a single client connection"""
        buffer = ""
        try:
            while self.running:
                # Receive command
                data = self.client_socket.recv(16384).decode('utf-8')
                if not data:
                    break
                buffer += data

                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    print(f"[Mossy Link] Received data: {line[:200]}..." if len(line) > 200 else f"[Mossy Link] Received data: {line}")

                    try:
                        command = json.loads(line)
                        command = self._normalize_command(command)
                        if not self._authorize(command):
                            response = json.dumps({"success": False, "error": "Unauthorized"})
                        else:
                            print(f"[Mossy Link] Parsed command type: {command.get('type', 'unknown')}")
                            result = self._execute_command(command)
                            print(f"[Mossy Link] Command result: {result[:100]}..." if len(str(result)) > 100 else f"[Mossy Link] Command result: {result}")
                            response = json.dumps({"success": True, "result": result})
                    except json.JSONDecodeError as e:
                        print(f"[Mossy Link] JSON decode error: {e}")
                        response = json.dumps({"success": False, "error": f"Invalid JSON: {str(e)}"})
                    except Exception as e:
                        print(f"[Mossy Link] Command execution error: {e}")
                        response = json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()})

                    # Send response
                    print(f"[Mossy Link] Sending response: {response[:200]}..." if len(response) > 200 else f"[Mossy Link] Sending response: {response}")
                    self.client_socket.sendall((response + "\n").encode('utf-8'))

        except Exception as e:
            print(f"[Mossy Link] Client handler error: {e}")
        finally:
            try:
                self.client_socket.close()
            except:
                pass

    def _authorize(self, command):
        if not self.token:
            return True
        return command.get('token') == self.token

    def _normalize_command(self, command):
        if 'type' in command:
            return command

        cmd = command.get('command')
        args = command.get('args', {}) if isinstance(command.get('args', {}), dict) else {}
        if not cmd:
            return command

        if cmd == 'script':
            return {'type': 'script', 'code': args.get('code', ''), 'token': command.get('token')}
        if cmd == 'text':
            return {
                'type': 'text',
                'code': args.get('code', ''),
                'name': args.get('name', 'MOSSY_SCRIPT'),
                'run': bool(args.get('run', False)),
                'token': command.get('token'),
            }
        if cmd == 'property':
            return {'type': 'property', 'path': args.get('path', ''), 'token': command.get('token')}
        if cmd == 'status':
            return {'type': 'status', 'token': command.get('token')}
        if cmd == 'select':
            return {'type': 'select', 'name': args.get('name', ''), 'token': command.get('token')}
        if cmd == 'create':
            return {
                'type': 'create',
                'type_arg': args.get('type', 'MESH'),
                'name': args.get('name', 'Object'),
                'token': command.get('token'),
            }

        return command
    
    def _execute_command(self, command):
        """Execute a command from Mossy"""
        cmd_type = command.get('type', 'script')
        
        if cmd_type == 'script':
            return self._execute_script(command.get('code', ''))
        elif cmd_type == 'text':
            # Create/update a Text datablock and optionally execute it
            code = command.get('code', '')
            name = command.get('name', 'MOSSY_SCRIPT')
            run = bool(command.get('run', False))
            return self._write_text_block(code, name, run)
        elif cmd_type == 'property':
            return self._get_property(command.get('path', ''))
        elif cmd_type == 'status':
            return self._get_status()
        elif cmd_type == 'select':
            return self._select_object(command.get('name', ''))
        elif cmd_type == 'create':
            obj_type = command.get('type_arg', command.get('type', 'MESH'))
            return self._create_object(obj_type, command.get('name', 'Object'))
        else:
            raise ValueError(f"Unknown command type: {cmd_type}")
    
    def _execute_script(self, code):
        """Execute Python code in Blender's context"""
        if not code:
            return "No code provided"
        
        print(f"[Mossy Link] Executing script: {code[:100]}..." if len(code) > 100 else f"[Mossy Link] Executing script: {code}")
        
        # Capture output
        old_stdout = sys.stdout
        sys.stdout = output_buffer = StringIO()
        
        try:
            # Create execution namespace with Blender context
            namespace = {
                'bpy': bpy,
                'C': bpy.context,
                'D': bpy.data,
                'ops': bpy.ops,
            }
            # Ensure Object Mode for operations that require it
            try:
                obj = bpy.context.active_object
                if obj and obj.mode != 'OBJECT':
                    bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                # Ignore mode errors; continue with execution
                pass

            # Prefer executing with a 3D View context override when using operators
            uses_ops = ('bpy.ops.' in code) or ('ops.' in code)
            area = None
            try:
                # Find a VIEW_3D area for correct context
                for a in bpy.context.window.screen.areas:
                    if a.type == 'VIEW_3D':
                        area = a
                        break
            except Exception:
                area = None

            if uses_ops and area is not None:
                try:
                    with bpy.context.temp_override(area=area):
                        exec(code, namespace)
                except Exception:
                    # Fallback to plain exec if override fails
                    exec(code, namespace)
            else:
                exec(code, namespace)
            result = output_buffer.getvalue()
            final_result = result if result else "Script executed successfully (no output)"
            print(f"[Mossy Link] Result: {final_result}", file=sys.stderr)  # Log to stderr so it's visible
            return final_result
        except Exception as e:
            error_result = f"Error executing script: {str(e)}\n{traceback.format_exc()}"
            print(f"[Mossy Link] ERROR: {error_result}", file=sys.stderr)
            return error_result
        finally:
            sys.stdout = old_stdout

    def _write_text_block(self, code, name="MOSSY_SCRIPT", run=False):
        """Create or update a Blender Text datablock with the provided code, and optionally execute it."""
        try:
            if not code:
                return "No code provided"
            # Create or get text block
            text = bpy.data.texts.get(name)
            if text is None:
                text = bpy.data.texts.new(name)
            text.clear()
            text.write(code)
            print(f"[Mossy Link] Wrote script to Text block: {name}")

            if run:
                # Execute using same safe context as _execute_script
                return self._execute_script(code)
            else:
                return f"Text block '{name}' updated (run=False)"
        except Exception as e:
            return f"Error writing text block: {str(e)}\n{traceback.format_exc()}"
    
    def _get_property(self, path):
        """Get a Blender property value"""
        try:
            parts = path.split('.')
            obj = bpy.context
            for part in parts:
                obj = getattr(obj, part)
            return str(obj)
        except AttributeError as e:
            return f"Property not found: {path}"
    
    def _get_status(self):
        """Get current Blender status"""
        try:
            active_obj = bpy.context.active_object
            scene = bpy.context.scene
            return {
                "version": bpy.app.version_string,
                "scene": scene.name if scene else "None",
                "active_object": active_obj.name if active_obj else "None",
                "object_count": len(bpy.data.objects),
                "mesh_count": len(bpy.data.meshes),
                "addon_version": bl_info['version']
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _select_object(self, name):
        """Select an object by name"""
        try:
            obj = bpy.data.objects.get(name)
            if not obj:
                return f"Object '{name}' not found"
            
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            return f"Selected '{name}'"
        except Exception as e:
            return f"Error selecting object: {str(e)}"
    
    def _create_object(self, obj_type, name):
        """Create a new object"""
        try:
            if obj_type == 'MESH':
                mesh = bpy.data.meshes.new(name)
                obj = bpy.data.objects.new(name, mesh)
                bpy.context.collection.objects.link(obj)
                return f"Created mesh object '{name}'"
            else:
                return f"Unsupported object type: {obj_type}"
        except Exception as e:
            return f"Error creating object: {str(e)}"


# Global server instance
mossy_server = None


class MOSSY_PT_MainPanel(bpy.types.Panel):
    """Main panel for Mossy Link in the properties"""
    bl_label = "Mossy Link"
    bl_idname = "MOSSY_PT_main_panel"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "scene"
    
    def draw(self, context):
        layout = self.layout
        wm = context.window_manager
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        
        layout.label(text="AI Assistant Integration", icon='PREFERENCES')
        
        box = layout.box()
        if wm.mossy_link_active:
            box.label(text="✓ Active", icon='CHECKMARK')
            box.label(text="Status: Connected", icon='LINKED')
            box.label(text=f"Listening on: 127.0.0.1:{port}")
        else:
            box.label(text="○ Inactive", icon='CHECKBOX_DEHLT')
        
        layout.separator()
        layout.operator("wm.mossy_link_toggle", text="Toggle Mossy Link Server")
        layout.operator("mossy.test_bridge", text="Test Bridge Connection")


class WM_OT_MossyLinkToggle(bpy.types.Operator):
    """Toggle the Mossy Link server on/off"""
    bl_idname = "wm.mossy_link_toggle"
    bl_label = "Toggle Mossy Link"
    
    def execute(self, context):
        global mossy_server
        wm = context.window_manager
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        token = prefs.token if prefs else ""
        
        if wm.mossy_link_active:
            # Stop server
            if mossy_server:
                mossy_server.stop()
            mossy_server = None
            wm.mossy_link_active = False
            self.report({'INFO'}, "Mossy Link disconnected")
        else:
            # Start server
            mossy_server = MossyLinkServer('127.0.0.1', port, token)
            if mossy_server.start():
                wm.mossy_link_active = True
                self.report({'INFO'}, f"Mossy Link connected (port {port})")
            else:
                self.report({'ERROR'}, "Failed to start Mossy Link server")
                mossy_server = None
        
        return {'FINISHED'}


class MOSSY_OT_TestBridge(bpy.types.Operator):
    """Test connection to Mossy Bridge"""
    bl_idname = "mossy.test_bridge"
    bl_label = "Test Bridge"
    
    def execute(self, context):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            
            # Try to connect to Bridge on port 21337
            try:
                sock.connect(('127.0.0.1', 21337))
                sock.close()
                self.report({'INFO'}, "✓ Mossy Bridge is RUNNING on port 21337!")
                return {'FINISHED'}
            except ConnectionRefusedError:
                self.report({'ERROR'}, "✗ Bridge NOT running on 21337. Start the Desktop Bridge first.")
                return {'CANCELLED'}
            except socket.timeout:
                self.report({'ERROR'}, "✗ Bridge timeout. Check if port 21337 is accessible.")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"✗ Error: {str(e)}")
            return {'CANCELLED'}


def _start_server_deferred():
    """Start server with a timer so it doesn't block Blender initialization"""
    global mossy_server
    try:
        prefs = _get_prefs()
        port = prefs.port if prefs else 9999
        token = prefs.token if prefs else ""
        if prefs and not prefs.autostart:
            print("[Mossy Link] Autostart disabled; server not started")
            return None

        mossy_server = MossyLinkServer('127.0.0.1', port, token)
        if mossy_server.start():
            bpy.context.window_manager.mossy_link_active = True
            print(f"[Mossy Link] Add-on v5.0 server started on port {port}")
        else:
            print("[Mossy Link] Warning: Could not start server (port may be in use)")
    except Exception as e:
        print(f"[Mossy Link] Error starting server: {e}")
    return None  # Don't repeat timer


def register():
    """Register the add-on"""
    global mossy_server
    
    # Register classes
    bpy.utils.register_class(MOSSY_PT_MainPanel)
    bpy.utils.register_class(WM_OT_MossyLinkToggle)
    bpy.utils.register_class(MOSSY_OT_TestBridge)
    
    # Add window manager property
    bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(default=False)
    
    # Schedule server startup on next timer (doesn't block Blender init)
    bpy.app.timers.register(_start_server_deferred, first_interval=0.5)
    print("[Mossy Link] Add-on v5.0 registered successfully!")


def unregister():
    """Unregister the add-on"""
    global mossy_server
    
    # Stop server
    if mossy_server:
        mossy_server.stop()
    mossy_server = None
    
    # Unregister classes
    bpy.utils.unregister_class(MOSSY_PT_MainPanel)
    bpy.utils.unregister_class(WM_OT_MossyLinkToggle)
    bpy.utils.unregister_class(MOSSY_OT_TestBridge)
    
    print("[Mossy Link] Add-on v5.0 unregistered")


if __name__ == "__main__":
    register()
