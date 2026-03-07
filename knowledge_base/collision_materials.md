# Collision and materials

- Collision: keep simple, convex where possible. Name with `UCX_` prefix (Fallout 4 / FBX standard,
  e.g. `UCX_TreeTrunk`). Apply transforms. Avoid high-poly collisions.
- Collision mesh must have **no materials and no vertex groups** – it is purely a physics shape and
  must be invisible in-game.
- Collision mesh should be **parented to the source (visual) mesh** so they are exported as a unit.
- Configure the collision as a static **Rigid Body (PASSIVE)** in Blender so the Niftools NIF
  exporter can emit the correct bhkCollisionObject / bhkRigidBody nodes for Fallout 4.
- **Required physics values for FO4 bhkRigidBody:**
  - `mass = 0.0` – fixed/static bodies must have zero mass; non-zero mass causes Niftools to
    emit wrong motion-system flags in the bhkRigidBody node.
  - `friction = 0.8` – matches vanilla FO4 static world geometry.
  - `restitution = 0.1` – minimal bounce; matches FO4 static geometry.
- **Vertex limit: ≤ 256 vertices** – Fallout 4's `bhkConvexVerticesShape` (the Havok node for
  convex collision) supports at most 256 vertices. Exceeding this silently corrupts the NIF.
  The add-on automatically decimates and rebuilds if this limit is exceeded.
- **Outward face normals** – `bhkConvexVerticesShape` computes supporting half-planes from face
  normals; all normals must point outward. Use `bmesh.ops.recalc_face_normals` after building
  the hull to guarantee this.
- **FBX fallback: include the UCX_ collision mesh** – when exporting FBX for external NIF
  conversion, both the visual mesh and the UCX_ collision must be in the same FBX file.
  NIF-conversion tools (CK, Cathedral Assets Optimizer) match them by stripping the UCX_ prefix.
- Physics scale: ensure 1 unit = 1 meter after applying transforms.
- Materials for FO4: BGSM/BGEM expect DDS inputs. Keep consistent texture channel usage.
- **Normal map colorspace must be 'Non-Color'** – sRGB colorspace applies gamma correction and
  produces incorrect tangent-space vectors when exported to NIF.
- Tangents/normals: enable Auto Smooth; ensure tangents exported for correct normal maps.
- Cleanup: remove loose verts/edges, fix non-manifold, triangulate before export.
