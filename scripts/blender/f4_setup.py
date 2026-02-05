import bpy
import math

def setup_f4_standards():
    """
    Sets Blender scene to Fallout 4 standards:
    - Units: Metric, Scale 1.0, Length Centimeters
    - FPS: 60
    - Viewport FOV: ~90 degrees (18mm focal length)
    """
    # 1. Set Units
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.unit_settings.length_unit = 'CENTIMETERS'
    
    # 2. Set FPS
    bpy.context.scene.render.fps = 60
    
    # 3. Set Viewport FOV (Focal Length 18mm = ~90deg FOV on 36mm sensor)
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.lens = 18
                    
    print("Fallout 4 standards applied successfully.")

if __name__ == "__main__":
    setup_f4_standards()
