# Collision and materials

- Collision: keep simple, convex where possible. Name with clear prefixes (e.g., UCX_*) or pair per mesh. Apply transforms. Avoid high-poly collisions.
- Physics scale: ensure 1 unit = 1 meter after applying transforms.
- Materials for FO4: BGSM/BGEM expect DDS inputs. Keep consistent texture channel usage.
- Tangents/normals: enable Auto Smooth; ensure tangents exported for correct normal maps.
- Cleanup: remove loose verts/edges, fix non-manifold, triangulate before export.
