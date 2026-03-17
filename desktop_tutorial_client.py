"""
Desktop Tutorial Client
Enables Blender add-on to connect to desktop tutorial application
"""

import bpy
import json
import threading
from bpy.props import StringProperty, IntProperty, BoolProperty
from urllib import request, error
from urllib.parse import urljoin

class DesktopTutorialClient:
    """Client for connecting to desktop tutorial server"""
    
    # Connection state
    is_connected = False
    server_url = "http://localhost:8080"
    last_error = None
    connection_thread = None
    
    @staticmethod
    def set_server_url(host="localhost", port=8080):
        """Set the server URL"""
        DesktopTutorialClient.server_url = f"http://{host}:{port}"
    
    @staticmethod
    def test_connection():
        """Test connection to desktop tutorial server"""
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/status')
            req = request.Request(url, method='GET')
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    return True, f"Connected to server v{data.get('version', 'unknown')}"
                else:
                    return False, f"Server returned status {response.status}"
        
        except error.URLError as e:
            return False, f"Connection failed: {str(e.reason)}"
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def connect():
        """Connect to desktop tutorial server"""
        success, message = DesktopTutorialClient.test_connection()
        
        if success:
            DesktopTutorialClient.is_connected = True
            DesktopTutorialClient.last_error = None
            print(f"✓ Connected to desktop tutorial app: {DesktopTutorialClient.server_url}")
            return True, message
        else:
            DesktopTutorialClient.is_connected = False
            DesktopTutorialClient.last_error = message
            print(f"✗ Failed to connect: {message}")
            return False, message
    
    @staticmethod
    def disconnect():
        """Disconnect from desktop tutorial server"""
        DesktopTutorialClient.is_connected = False
        DesktopTutorialClient.last_error = None
        print("Disconnected from desktop tutorial app")
        return True, "Disconnected"
    
    @staticmethod
    def get_current_step():
        """Get current tutorial step from server"""
        if not DesktopTutorialClient.is_connected:
            return None, "Not connected to server"
        
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/current_step')
            req = request.Request(url, method='GET')
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    return data, "Success"
                else:
                    return None, f"Server error: {response.status}"
        
        except Exception as e:
            return None, f"Failed to get step: {str(e)}"
    
    @staticmethod
    def next_step():
        """Request next tutorial step from server"""
        if not DesktopTutorialClient.is_connected:
            return False, "Not connected to server"
        
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/next_step')
            req = request.Request(url, method='GET')
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    if data.get('success'):
                        return True, "Moved to next step"
                    else:
                        return False, data.get('message', 'No more steps')
                else:
                    return False, f"Server error: {response.status}"
        
        except Exception as e:
            return False, f"Failed to advance step: {str(e)}"
    
    @staticmethod
    def previous_step():
        """Request previous tutorial step from server"""
        if not DesktopTutorialClient.is_connected:
            return False, "Not connected to server"
        
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/previous_step')
            req = request.Request(url, method='GET')
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    if data.get('success'):
                        return True, "Moved to previous step"
                    else:
                        return False, data.get('message', 'Already at first step')
                else:
                    return False, f"Server error: {response.status}"
        
        except Exception as e:
            return False, f"Failed to go back: {str(e)}"
    
    @staticmethod
    def get_progress():
        """Get tutorial progress from server"""
        if not DesktopTutorialClient.is_connected:
            return None, "Not connected to server"
        
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/progress')
            req = request.Request(url, method='GET')
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    return data, "Success"
                else:
                    return None, f"Server error: {response.status}"
        
        except Exception as e:
            return None, f"Failed to get progress: {str(e)}"
    
    @staticmethod
    def send_event(event_type, event_data, timestamp=None):
        """Send event to desktop tutorial server"""
        if not DesktopTutorialClient.is_connected:
            return False, "Not connected to server"
        
        try:
            import time
            if timestamp is None:
                timestamp = int(time.time())
            
            url = urljoin(DesktopTutorialClient.server_url, '/event')
            
            payload = {
                'type': event_type,
                'data': event_data,
                'timestamp': timestamp
            }
            
            data = json.dumps(payload).encode('utf-8')
            req = request.Request(
                url,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    result = json.loads(response.read().decode('utf-8'))
                    return True, result.get('message', 'Event sent')
                else:
                    return False, f"Server error: {response.status}"
        
        except Exception as e:
            return False, f"Failed to send event: {str(e)}"
    
    @staticmethod
    def mark_step_complete(step_id):
        """Mark a tutorial step as complete on the server"""
        if not DesktopTutorialClient.is_connected:
            return False, "Not connected to server"
        
        try:
            url = urljoin(DesktopTutorialClient.server_url, '/mark_complete')
            
            payload = {'step_id': step_id}
            data = json.dumps(payload).encode('utf-8')
            req = request.Request(
                url,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    result = json.loads(response.read().decode('utf-8'))
                    return True, result.get('message', 'Step marked complete')
                else:
                    return False, f"Server error: {response.status}"
        
        except Exception as e:
            return False, f"Failed to mark complete: {str(e)}"
    
    @staticmethod
    def get_connection_status():
        """Get current connection status"""
        return {
            'connected': DesktopTutorialClient.is_connected,
            'server_url': DesktopTutorialClient.server_url,
            'last_error': DesktopTutorialClient.last_error
        }

    @staticmethod
    def pull_original_to_desktop():
        """Copy the addon zip file to the user's Desktop folder.

        Returns:
            (success: bool, message: str, destination: str)
        """
        import glob
        import os
        import platform
        import re
        import shutil

        # Locate the addon zip next to this file
        addon_dir = os.path.dirname(os.path.abspath(__file__))
        pattern = os.path.join(addon_dir, "fallout4_tutorial_helper-v*.zip")
        matches = glob.glob(pattern)

        if not matches:
            return False, "Addon zip file not found in addon directory.", ""

        # Sort by parsed version tuple so v10 > v2 (version-aware ordering)
        def _version_key(path):
            m = re.search(r"v(\d+)\.(\d+)\.(\d+)", os.path.basename(path))
            return tuple(int(x) for x in m.groups()) if m else (0, 0, 0)

        src = sorted(matches, key=_version_key)[-1]
        zip_name = os.path.basename(src)

        # Resolve the Desktop path across platforms
        home = os.path.expanduser("~")
        system = platform.system()
        if system in ("Windows", "Darwin"):
            desktop = os.path.join(home, "Desktop")
        else:
            # Linux/other – try xdg-user-dir, then user-dirs.dirs, then ~/Desktop
            desktop = ""
            try:
                import subprocess
                result = subprocess.run(
                    ["xdg-user-dir", "DESKTOP"],
                    capture_output=True, text=True, timeout=5,
                    check=False,
                )
                candidate = result.stdout.strip() if result.returncode == 0 else ""
                # Accept the path only if it is inside the user's home directory
                if candidate and os.path.commonpath([home, candidate]) == home:
                    desktop = candidate
            except Exception:
                pass

            if not desktop:
                user_dirs_file = os.path.join(home, ".config", "user-dirs.dirs")
                try:
                    with open(user_dirs_file, encoding="utf-8", errors="replace") as fh:
                        for line in fh:
                            line = line.strip()
                            if line.startswith("XDG_DESKTOP_DIR="):
                                value = line.split("=", 1)[1].strip().strip('"')
                                candidate = os.path.normpath(
                                    value.replace("$HOME", home)
                                )
                                # Safety: must be inside home directory
                                if os.path.commonpath([home, candidate]) == home:
                                    desktop = candidate
                                break
                except OSError:
                    pass

            if not desktop:
                desktop = os.path.join(home, "Desktop")

        if not os.path.isdir(desktop):
            return False, f"Desktop folder not found: {desktop}", ""

        dest_path = os.path.join(desktop, zip_name)
        try:
            shutil.copy2(src, dest_path)
        except Exception as exc:
            return False, f"Failed to copy file: {exc}", ""

        DesktopTutorialClient._open_in_file_manager(dest_path)

        return True, f"Addon zip copied to Desktop: {zip_name}", dest_path

    @staticmethod
    def _open_in_file_manager(file_path):
        """Reveal *file_path* in the system file manager.

        On Windows the file is selected inside Explorer.
        On macOS the file is revealed in Finder.
        On Linux (and other POSIX systems) the parent folder is opened with
        xdg-open so the user can see the file immediately.
        The call is best-effort: any exception is silently ignored so it never
        blocks the copy operation that already succeeded.
        """
        import os
        import platform
        import subprocess

        try:
            system = platform.system()
            if system == "Windows":
                # /select,<path> highlights the file in Explorer (no space before path)
                subprocess.Popen(
                    ["explorer", f"/select,{os.path.normpath(file_path)}"],
                    start_new_session=True,
                )
            elif system == "Darwin":
                # -R reveals (selects) the file in Finder
                subprocess.Popen(["open", "-R", file_path], start_new_session=True)
            else:
                # Linux / other POSIX – open the containing folder
                subprocess.Popen(
                    ["xdg-open", os.path.dirname(file_path)],
                    start_new_session=True,
                )
        except Exception:
            pass


def register():
    """Register desktop tutorial client properties"""
    
    # Add connection properties to scene
    bpy.types.Scene.fo4_desktop_connected = BoolProperty(
        name="Desktop App Connected",
        description="Whether connected to desktop tutorial app",
        default=False
    )
    
    bpy.types.Scene.fo4_desktop_server_host = StringProperty(
        name="Server Host",
        description="Host address of desktop tutorial app",
        default="localhost"
    )
    
    bpy.types.Scene.fo4_desktop_server_port = IntProperty(
        name="Server Port",
        description="Port of desktop tutorial app",
        default=8080,
        min=1024,
        max=65535
    )
    
    bpy.types.Scene.fo4_desktop_last_sync = StringProperty(
        name="Last Sync",
        description="Last synchronization timestamp",
        default=""
    )
    
    bpy.types.Scene.fo4_desktop_current_step_id = IntProperty(
        name="Current Step ID",
        description="Current tutorial step ID from desktop app",
        default=0
    )
    
    bpy.types.Scene.fo4_desktop_current_step_title = StringProperty(
        name="Current Step Title",
        description="Current tutorial step title from desktop app",
        default=""
    )


def unregister():
    """Unregister desktop tutorial client properties"""
    
    # Disconnect if connected
    if DesktopTutorialClient.is_connected:
        DesktopTutorialClient.disconnect()
    
    # Remove properties
    if hasattr(bpy.types.Scene, 'fo4_desktop_connected'):
        del bpy.types.Scene.fo4_desktop_connected
    if hasattr(bpy.types.Scene, 'fo4_desktop_server_host'):
        del bpy.types.Scene.fo4_desktop_server_host
    if hasattr(bpy.types.Scene, 'fo4_desktop_server_port'):
        del bpy.types.Scene.fo4_desktop_server_port
    if hasattr(bpy.types.Scene, 'fo4_desktop_last_sync'):
        del bpy.types.Scene.fo4_desktop_last_sync
    if hasattr(bpy.types.Scene, 'fo4_desktop_current_step_id'):
        del bpy.types.Scene.fo4_desktop_current_step_id
    if hasattr(bpy.types.Scene, 'fo4_desktop_current_step_title'):
        del bpy.types.Scene.fo4_desktop_current_step_title
