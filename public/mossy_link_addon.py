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
    "version": (3, 0, 0),
    "location": "View3D > Mossy Link Panel",
    "description": "Real-time AI script execution and Blender control via Mossy v3.0 Desktop Bridge",
    "warning": "",
    "wiki_url": "",
    "tracker_url": "",
    "category": "System",
    "support": "COMMUNITY",
}

class MossyLinkServer:
    """Socket server for receiving and executing Mossy commands"""
    
    def __init__(self, host='127.0.0.1', port=9999):
        self.host = host
        self.port = port
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
        try:
            while self.running:
                # Receive command
                data = self.client_socket.recv(16384).decode('utf-8')
                if not data:
                    break
                
                try:
                    command = json.loads(data)
                    result = self._execute_command(command)
                    response = json.dumps({"success": True, "result": result})
                except json.JSONDecodeError as e:
                    response = json.dumps({"success": False, "error": f"Invalid JSON: {str(e)}"})
                except Exception as e:
                    response = json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()})
                
                # Send response
                self.client_socket.sendall(response.encode('utf-8'))
                
        except Exception as e:
            print(f"[Mossy Link] Client handler error: {e}")
        finally:
            try:
                self.client_socket.close()
            except:
                pass
    
    def _execute_command(self, command):
        """Execute a command from Mossy"""
        cmd_type = command.get('type', 'script')
        
        if cmd_type == 'script':
            return self._execute_script(command.get('code', ''))
        elif cmd_type == 'property':
            return self._get_property(command.get('path', ''))
        elif cmd_type == 'status':
            return self._get_status()
        elif cmd_type == 'select':
            return self._select_object(command.get('name', ''))
        elif cmd_type == 'create':
            return self._create_object(command.get('type', 'MESH'), command.get('name', 'Object'))
        else:
            raise ValueError(f"Unknown command type: {cmd_type}")
    
    def _execute_script(self, code):
        """Execute Python code in Blender's context"""
        if not code:
            return "No code provided"
        
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
            
            exec(code, namespace)
            result = output_buffer.getvalue()
            return result if result else "Script executed successfully (no output)"
        except Exception as e:
            return f"Error executing script: {str(e)}\n{traceback.format_exc()}"
        finally:
            sys.stdout = old_stdout
    
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
        
        layout.label(text="AI Assistant Integration", icon='PREFERENCES')
        
        box = layout.box()
        if wm.mossy_link_active:
            box.label(text="✓ Active", icon='CHECKMARK')
            box.label(text="Status: Connected", icon='LINKED')
            box.label(text="Listening on: 127.0.0.1:9999")
        else:
            box.label(text="○ Inactive", icon='CHECKBOX_DEHLT')
        
        layout.separator()
        layout.operator("wm.mossy_link_toggle", text="Toggle Mossy Link Server")


class WM_OT_MossyLinkToggle(bpy.types.Operator):
    """Toggle the Mossy Link server on/off"""
    bl_idname = "wm.mossy_link_toggle"
    bl_label = "Toggle Mossy Link"
    
    def execute(self, context):
        global mossy_server
        wm = context.window_manager
        
        if wm.mossy_link_active:
            # Stop server
            if mossy_server:
                mossy_server.stop()
            mossy_server = None
            wm.mossy_link_active = False
            self.report({'INFO'}, "Mossy Link disconnected")
        else:
            # Start server
            mossy_server = MossyLinkServer('127.0.0.1', 9999)
            if mossy_server.start():
                wm.mossy_link_active = True
                self.report({'INFO'}, "Mossy Link connected (port 9999)")
            else:
                self.report({'ERROR'}, "Failed to start Mossy Link server")
                mossy_server = None
        
        return {'FINISHED'}


def register():
    """Register the add-on"""
    global mossy_server
    
    # Register classes
    bpy.utils.register_class(MOSSY_PT_MainPanel)
    bpy.utils.register_class(WM_OT_MossyLinkToggle)
    
    # Add window manager property
    bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(default=False)
    
    # Auto-start server on load
    mossy_server = MossyLinkServer('127.0.0.1', 9999)
    if mossy_server.start():
        bpy.types.WindowManager.mossy_link_active = True
        print("[Mossy Link] Add-on initialized and server started")
    else:
        print("[Mossy Link] Warning: Could not start server (port may be in use)")


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
    
    print("[Mossy Link] Add-on unregistered")


if __name__ == "__main__":
    register()
