"""
Hierarchy Organizer - Organize scene hierarchy into collections
"""

import bpy

bl_info = {
    "name": "Hierarchy Organizer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Organize",
    "description": "Organize objects into collections by type",
    "category": "Object",
}

class FO4_OT_OrganizeHierarchy(bpy.types.Operator):
    """Organize Scene Hierarchy"""
    bl_idname = "object.fo4_organize_hierarchy"
    bl_label = "Organize Hierarchy"
    bl_options = {'REGISTER', 'UNDO'}
    
    organize_by_type: bpy.props.BoolProperty(
        name="By Type",
        description="Organize by object type (Mesh, Armature, etc.)",
        default=True
    )
    
    organize_by_material: bpy.props.BoolProperty(
        name="By Material",
        description="Organize meshes by material",
        default=False
    )
    
    def execute(self, context):
        organized = {}
        
        if self.organize_by_type:
            # Create collections by type
            type_map = {
                'MESH': 'Meshes',
                'ARMATURE': 'Armatures',
                'LIGHT': 'Lights',
                'CAMERA': 'Cameras',
                'EMPTY': 'Empties',
                'CURVE': 'Curves',
            }
            
            for obj in context.scene.objects:
                obj_type = obj.type
                coll_name = type_map.get(obj_type, 'Other')
                
                # Create collection if needed
                if coll_name not in bpy.data.collections:
                    coll = bpy.data.collections.new(coll_name)
                    context.scene.collection.children.link(coll)
                else:
                    coll = bpy.data.collections[coll_name]
                
                # Move object to collection
                for c in obj.users_collection:
                    c.objects.unlink(obj)
                coll.objects.link(obj)
                
                if coll_name not in organized:
                    organized[coll_name] = []
                organized[coll_name].append(obj.name)
        
        if self.organize_by_material:
            # Organize meshes by material
            material_collections = {}
            
            for obj in context.scene.objects:
                if obj.type == 'MESH' and obj.data.materials:
                    for mat in obj.data.materials:
                        if mat:
                            coll_name = f"Mat_{mat.name}"
                            
                            if coll_name not in bpy.data.collections:
                                coll = bpy.data.collections.new(coll_name)
                                context.scene.collection.children.link(coll)
                            else:
                                coll = bpy.data.collections[coll_name]
                            
                            # Link object (can be in multiple)
                            if obj not in coll.objects[:]:
                                coll.objects.link(obj)
                            
                            if coll_name not in material_collections:
                                material_collections[coll_name] = []
                            if obj.name not in material_collections[coll_name]:
                                material_collections[coll_name].append(obj.name)
            
            organized.update(material_collections)
        
        # Report
        print(f"\n=== Hierarchy Organization ===")
        for coll_name, objects in organized.items():
            print(f"  {coll_name}: {len(objects)} objects")
            for obj_name in objects[:5]:
                print(f"    • {obj_name}")
            if len(objects) > 5:
                print(f"    ... and {len(objects) - 5} more")
        
        self.report({'INFO'}, f"Organized into {len(organized)} collections")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_OrganizeHierarchy.bl_idname, text="Organize Hierarchy")

def register():
    bpy.utils.register_class(FO4_OT_OrganizeHierarchy)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_OrganizeHierarchy)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
