"""
Notification system for the Fallout 4 Tutorial Add-on
Provides error notifications and guidance to users
"""

import bpy
import json
import os
import datetime
from bpy.props import CollectionProperty, StringProperty

class FO4_NotificationItem(bpy.types.PropertyGroup):
    """Property group for storing notifications"""
    message: StringProperty(name="Notification Message")
    notification_type: StringProperty(name="Type")  # 'INFO', 'WARNING', 'ERROR'


class OperationLog:
    """Persistent operation log — writes every operation to a JSON file on disk.

    The log file lives in Blender's user config directory so it survives
    add-on reloads and Blender restarts.  Each entry records:
      • timestamp  – ISO-8601 string
      • type       – 'INFO', 'WARNING', or 'ERROR'
      • message    – human-readable description of the operation
    """

    MAX_ENTRIES = 200  # cap so the file never grows unbounded

    @staticmethod
    def get_log_path():
        """Return the absolute path to the JSON log file."""
        config_path = bpy.utils.user_resource('CONFIG')
        log_dir = os.path.join(config_path, 'fo4_addon')
        os.makedirs(log_dir, exist_ok=True)
        return os.path.join(log_dir, 'operation_log.json')

    @staticmethod
    def _load_raw():
        """Load raw list of entries from disk.  Returns [] on any failure."""
        path = OperationLog.get_log_path()
        if not os.path.exists(path):
            return []
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                data = json.load(fh)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return []

    @staticmethod
    def _save_raw(entries):
        """Write list of entries to disk.  Silently ignores write errors."""
        path = OperationLog.get_log_path()
        try:
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump(entries, fh, indent=2, ensure_ascii=False)
        except Exception:
            pass

    @staticmethod
    def log_operation(message, op_type='INFO'):
        """Append one entry to the persistent log."""
        entries = OperationLog._load_raw()
        entries.append({
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'type': op_type,
            'message': message,
        })
        # Keep only the most recent MAX_ENTRIES
        if len(entries) > OperationLog.MAX_ENTRIES:
            entries = entries[-OperationLog.MAX_ENTRIES:]
        OperationLog._save_raw(entries)

    @staticmethod
    def get_entries(limit=50):
        """Return the *limit* most recent log entries (newest last)."""
        entries = OperationLog._load_raw()
        return entries[-limit:]

    @staticmethod
    def clear():
        """Delete all log entries."""
        OperationLog._save_raw([])

class FO4_NotificationSystem:
    """Central notification system"""
    
    @staticmethod
    def notify(message, notification_type='INFO'):
        """Add a notification to the system"""
        # Always persist to the operation log so no work is ever lost
        OperationLog.log_operation(message, notification_type)

        try:
            scene = bpy.context.scene
        except AttributeError:
            print(f"[FO4 Notifications] {notification_type}: {message}")
            return

        # fo4_notifications must be a registered CollectionProperty.  If it is
        # missing (e.g. registration failed) fall back gracefully.
        if not hasattr(scene, 'fo4_notifications'):
            print(f"[FO4 Notifications] fo4_notifications not registered — {notification_type}: {message}")
            return

        # Add notification item in-place (CollectionProperty does not support
        # direct slice assignment; use add() / remove() instead).
        item = scene.fo4_notifications.add()
        item.message = f"[{notification_type}] {message}"
        item.notification_type = notification_type

        # Keep only the last 10 notifications by removing oldest entries
        while len(scene.fo4_notifications) > 10:
            scene.fo4_notifications.remove(0)
        
        # Also show in Blender's UI — must run on the main thread.
        # Background install threads call notify() after work completes, so
        # we schedule the popup via bpy.app.timers to avoid the
        # "Missing 'window' in context" RuntimeError on Blender 5.
        _icon = 'ERROR' if notification_type in ('ERROR', 'WARNING') else 'INFO'
        _msg = message  # capture for closure

        def _show_popup():
            try:
                bpy.ops.fo4.show_message('INVOKE_DEFAULT', message=_msg, icon=_icon)
            except Exception:
                pass
            return None  # returning None de-registers the timer

        try:
            bpy.app.timers.register(_show_popup, first_interval=0.0, persistent=False)
        except Exception:
            pass
    
    @staticmethod
    def check_common_errors(context):
        """Check for common errors in the scene"""
        errors = []
        warnings = []
        
        # Check if any object is selected
        if not context.selected_objects:
            warnings.append("No objects selected")
        
        # Check mesh validity
        for obj in context.selected_objects:
            if obj.type == 'MESH':
                mesh = obj.data
                
                # Check for non-manifold geometry
                if len(mesh.vertices) > 0:
                    # Check for loose vertices
                    if any(not v.select for v in mesh.vertices):
                        warnings.append(f"Object '{obj.name}' may have issues")
                
                # Check for materials
                if len(obj.material_slots) == 0:
                    warnings.append(f"Object '{obj.name}' has no materials")
        
        return errors, warnings
    
    @staticmethod
    def validate_for_fallout4(obj):
        """Validate object for Fallout 4 compatibility"""
        issues = []
        
        if obj.type != 'MESH':
            issues.append("Object is not a mesh")
            return issues
        
        mesh = obj.data
        
        # Check poly count
        if len(mesh.polygons) > 65535:
            issues.append(f"Poly count too high: {len(mesh.polygons)} (max 65535)")
        
        # Check for UV maps
        if not mesh.uv_layers:
            issues.append("No UV map found")
        
        # Check for vertex colors (optional but recommended)
        # Blender 3.2+ uses color_attributes; vertex_colors removed in 5.0
        has_color = (
            bool(mesh.color_attributes)
            if hasattr(mesh, 'color_attributes')
            else bool(mesh.vertex_colors)
        )
        if not has_color:
            issues.append("No vertex colors (recommended for FO4)")
        
        # Check scale
        if obj.scale[0] != 1.0 or obj.scale[1] != 1.0 or obj.scale[2] != 1.0:
            issues.append("Object scale is not applied (should be 1,1,1)")
        
        return issues

def register():
    """Register notification classes"""
    bpy.utils.register_class(FO4_NotificationItem)
    bpy.types.Scene.fo4_notifications = CollectionProperty(type=FO4_NotificationItem)

def unregister():
    """Unregister notification classes"""
    if hasattr(bpy.types.Scene, 'fo4_notifications'):
        del bpy.types.Scene.fo4_notifications
    bpy.utils.unregister_class(FO4_NotificationItem)
