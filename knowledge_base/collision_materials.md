# Collision and materials

- Collision: keep simple, convex where possible. Name with `UCX_` prefix (Fallout 4 / FBX standard,
  e.g. `UCX_TreeTrunk`). Apply transforms. Avoid high-poly collisions.
- Collision mesh must have **no materials and no vertex groups** – it is purely a physics shape and
  must be invisible in-game.
- Collision mesh should be **parented to the source (visual) mesh** so they are exported as a unit.
- Configure the collision as a static **Rigid Body (PASSIVE)** in Blender so the Niftools NIF
  exporter can emit the correct bhkCollisionObject / bhkRigidBody nodes for Fallout 4.
- Physics scale: ensure 1 unit = 1 meter after applying transforms.
- Materials for FO4: BGSM/BGEM expect DDS inputs. Keep consistent texture channel usage.
- Tangents/normals: enable Auto Smooth; ensure tangents exported for correct normal maps.
- Cleanup: remove loose verts/edges, fix non-manifold, triangulate before export.
