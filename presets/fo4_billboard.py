"""
FO4 Distant Tree Billboard Generator
Creates a flat plane with your tree texture for use as a far-LOD billboard.
Run in Blender's Scripting tab. Replace <your tree texture> with the actual path.
"""
import bpy

# Create billboard plane
bpy.ops.mesh.primitive_plane_add(size=1)
plane = bpy.context.active_object
plane.name = "Tree_Billboard"

# Create and assign material
mat = bpy.data.materials.new(name="BillboardMat")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

bsdf = nodes["Principled BSDF"]

# Image texture
tex = nodes.new("ShaderNodeTexImage")
# Replace with your actual tree texture path:
# tex.image = bpy.data.images.load("C:\\path\\to\\tree_texture_d.dds")

# Alpha → transparent background (essential for billboard)
alpha = nodes.new("ShaderNodeAttribute")
alpha.attribute_name = "Alpha"

links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])

mat.blend_method = 'CLIP'  # Needed for alpha cutout
mat.shadow_method = 'CLIP'

plane.data.materials.append(mat)
print("Billboard created: Tree_Billboard")
print("Assign your tree diffuse DDS to the Image Texture node")
print("Export as NIF → use as far-LOD in xLODGen or CK LOD system")
