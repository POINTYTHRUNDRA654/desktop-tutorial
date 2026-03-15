# Fallout 4 export quick checklist

- Scale: target 1 unit = 1 meter. Apply transforms (loc/rot/scale) before export.
- Normals/tangents: enable Auto Smooth and Shade Smooth. Ensure tangents exported.
- Collision: include a simplified collision mesh; name with `UCX_` prefix if following common convention, or separate collision object per mesh.
- Materials: FO4 expects BGSM/BGEM; textures must be DDS.
- NIF export: use game profile Fallout 4. If NIF exporter unavailable, export FBX and convert externally.
- Animation: ensure armature modifier uses correct skeleton; apply scale.
- Triangulate before export; remove loose geometry; fix non-manifold.
- Manifest: meshes (.nif), textures (.dds), materials (.bgsm/.bgem), animations (.hkx).
