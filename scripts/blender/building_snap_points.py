"""
Building Snap Points - Add snap points for building pieces
"""

import bpy
import mathutils

bl_info = {
    "name": "Building Snap Points",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Snap Points",
    "description": "Add snap points for building pieces in Fallout 4",
    "category": "Object",
}

class FO4_OT_AddSnapPoints(bpy.types.Operator):
    """Add Snap Points"""
    bl_idname = "object.fo4_add_snap_points"
    bl_label = "Add Snap Points"
    bl_options = {'REGISTER', 'UNDO'}
    
    snap_type: bpy.props.EnumProperty(
        name="Snap Type",
        description="Type of snap points to add",
        items=[
            ('CORNERS', 'Corners', 'Add snap points at corners'),
            ('EDGES', 'Edges', 'Add snap points at edge midpoints'),
            ('CENTER', 'Center', 'Add snap point at center'),
            ('CUSTOM', 'Custom', 'Add snap points at 3D cursor'),
        ],
        default='CORNERS'
    )
    
    snap_size: bpy.props.FloatProperty(
        name="Snap Marker Size",
        description="Size of snap point empties",
        default=0.1,
        min=0.01,
        max=10.0
    )
    
    def execute(self, context):
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        snap_points = []
        
        for obj in selected:
            # Get bounding box
            bbox = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
            
            # Calculate positions based on type
            positions = []
            
            if self.snap_type == 'CORNERS':
                positions = bbox
            
            elif self.snap_type == 'EDGES':
                # Add midpoints of edges
                for i in range(0, 8, 2):
                    for j in range(i+1, min(i+4, 8)):
                        midpoint = (bbox[i] + bbox[j]) / 2
                        positions.append(midpoint)
            
            elif self.snap_type == 'CENTER':
                # Center of bounding box
                center = sum(bbox, mathutils.Vector()) / 8
                positions.append(center)
            
            elif self.snap_type == 'CUSTOM':
                # Use 3D cursor location
                positions.append(context.scene.cursor.location.copy())
            
            # Create empties at snap points
            for i, pos in enumerate(positions):
                empty = bpy.data.objects.new(f"{obj.name}_snap_{i}", None)
                empty.location = pos
                empty.empty_display_type = 'SPHERE'
                empty.empty_display_size = self.snap_size
                context.collection.objects.link(empty)
                empty.parent = obj
                snap_points.append(empty.name)
        
        # Move to collection
        collection_name = "SnapPoints"
        if collection_name not in bpy.data.collections:
            coll = bpy.data.collections.new(collection_name)
            context.scene.collection.children.link(coll)
        else:
            coll = bpy.data.collections[collection_name]
        
        for snap_name in snap_points:
            snap = bpy.data.objects[snap_name]
            for c in snap.users_collection:
                c.objects.unlink(snap)
            coll.objects.link(snap)
        
        print(f"\n=== Snap Points Added ===")
        print(f"  Type: {self.snap_type}")
        print(f"  Total: {len(snap_points)}")
        
        self.report({'INFO'}, f"Added {len(snap_points)} snap points")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_AddSnapPoints.bl_idname, text="Add Snap Points")

def register():
    bpy.utils.register_class(FO4_OT_AddSnapPoints)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_AddSnapPoints)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
