# Fallout 4 export quick checklist

- Scale: target 1 unit = 1 meter. Apply transforms (loc/rot/scale) before export.
- Normals/tangents: enable Auto Smooth and Shade Smooth. Ensure tangents exported.
- Collision: include a simplified collision mesh named `UCX_{meshname}` (Fallout 4 / FBX standard).
  Collision mesh must have **no materials, no vertex groups**. It must be parented to the source
  mesh and configured as a static Rigid Body (PASSIVE) so the NIF exporter emits correct
  bhkCollisionObject / bhkRigidBody nodes. Use the "Generate Collision" button in the add-on.
- Materials: FO4 expects BGSM/BGEM; textures must be DDS.
- NIF export: use game profile Fallout 4. If NIF exporter unavailable, export FBX and convert externally.
- Animation: ensure armature modifier uses correct skeleton; apply scale.
- Triangulate before export; remove loose geometry; fix non-manifold.
- Manifest: meshes (.nif), textures (.dds), materials (.bgsm/.bgem), animations (.hkx).
