"""
Notification system for the Fallout 4 Tutorial Add-on
Provides error notifications and guidance to users
"""

import bpy
from bpy.props import CollectionProperty, StringProperty

class FO4_NotificationItem(bpy.types.PropertyGroup):
    """Property group for storing notifications"""
    message: StringProperty(name="Notification Message")
    notification_type: StringProperty(name="Type")  # 'INFO', 'WARNING', 'ERROR'

class FO4_NotificationSystem:
    """Central notification system"""
    
    @staticmethod
    def notify(message, notification_type='INFO'):
        """Add a notification to the system"""
        scene = bpy.context.scene
        
        # Initialize notifications list if it doesn't exist
        if not hasattr(scene, 'fo4_notifications'):
            scene.fo4_notifications = []
        
        # Add notification
        scene.fo4_notifications.append(f"[{notification_type}] {message}")
        
        # Keep only last 10 notifications
        if len(scene.fo4_notifications) > 10:
            scene.fo4_notifications = scene.fo4_notifications[-10:]
        
        # Also show in Blender's UI
        if notification_type == 'ERROR':
            bpy.ops.fo4.show_message('INVOKE_DEFAULT', message=message, icon='ERROR')
        elif notification_type == 'WARNING':
            bpy.ops.fo4.show_message('INVOKE_DEFAULT', message=message, icon='ERROR')
        else:
            bpy.ops.fo4.show_message('INVOKE_DEFAULT', message=message, icon='INFO')
    
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
        if not mesh.vertex_colors:
            issues.append("No vertex colors (recommended for FO4)")
        
        # Check scale
        if obj.scale[0] != 1.0 or obj.scale[1] != 1.0 or obj.scale[2] != 1.0:
            issues.append("Object scale is not applied (should be 1,1,1)")
        
        return issues

def register():
    """Register notification classes"""
    bpy.types.Scene.fo4_notifications = []

def unregister():
    """Unregister notification classes"""
    if hasattr(bpy.types.Scene, 'fo4_notifications'):
        del bpy.types.Scene.fo4_notifications
