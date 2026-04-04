# Fallout 4 – Common Modding Pitfalls

A curated list of mistakes that reliably cause broken mods, CTDs, or hours
of debugging — and how to avoid them.

---

## Mesh & Export

### 1. Unapplied transforms (most common cause of wrong-size collision)
Blender stores scale/rotation separately from mesh data.  If you export
with un-applied scale the collision mesh will be the wrong size and the
physics body will be misaligned.  Always press `Ctrl+A → All Transforms`
before export.

### 2. Missing UV map
BSTriShape requires at least one UV map.  Without it PyNifly will fail
silently and the NIF will contain garbage geometry.  The add-on auto-creates
one if missing, but verify the UV layout is correct afterwards.

### 3. N-gons in mesh
FO4 NIFs store only triangles.  N-gons (faces with > 4 vertices) can produce
unexpected triangulation that distorts normals and breaks textures.  Use the
Triangulate modifier or `Ctrl+T` in Edit Mode before export.

### 4. Vertex count > 65,535
BSTriShape uses uint16 indices, so no single mesh can exceed 65,535 vertices.
Split large meshes with the "Split at Poly Limit" operator.

### 5. Non-manifold collision mesh
Havok physics (`bhkConvexVerticesShape`) requires a fully closed, manifold
surface.  Use the "Generate Collision" operator (which builds a convex hull)
rather than manually trimmed geometry.

### 6. Object name with spaces or non-ASCII characters
Some NIF exporters and the CK reject object names with spaces or accented
characters.  Use underscores: `My Object` → `My_Object`.

---

## Armature & Rigging

### 7. Bone names don't match the FO4 skeleton
Bone names are case-sensitive and must exactly match the game skeleton
(e.g. `Spine1` not `spine1`, `L Calf` not `lCalf`).  Use the "Clean
Imported Armature" operator to auto-rename bones to FO4 conventions.

### 8. More than 4 bone influences per vertex
FO4's vertex format only stores 4 skin weights per vertex.  Extra influences
are silently dropped, which causes mesh distortion.  Use Blender's
`Limit Total` weight-paint operator (set to 4) before export.

### 9. Root bone missing or mis-named
The FO4 character skeleton expects `COM` as the root bone (or `Root` for
non-biped rigs).  A missing root bone causes the mesh to fly off to the
origin when animated in-game.

### 10. Unapplied armature modifier
Apply the Armature modifier (or use PyNifly's "export modifiers" option)
so the mesh is in bind pose at export.

---

## Textures & Materials

### 11. DDS format mismatch
- Diffuse (`_d`): BC1 (DXT1) for opaque, BC3 (DXT5) for alpha
- Normal (`_n`): BC5 (ATI2) for FO4; BC3 for older games
- Specular (`_s`): BC4 (ATI1) greyscale or BC1 RGB
- Do NOT use uncompressed DDS — textures will be blurry or missing in-game.

### 12. Texture path case sensitivity
The BSA archive builder and the game itself treat texture paths as case-
sensitive on some platforms.  Always use lowercase paths inside .bgsm
and .nif files.

### 13. Missing `_n.dds` normal map
Every FO4 material requires a normal map.  If `_n.dds` is missing the mesh
will appear flat-lit and may show errors in the CK.  Use a flat-normal
placeholder (`128, 128, 255` RGB) if no real normal map exists yet.

---

## Plugin / ESP

### 14. Dirty edits (unintended CELL/WRLD records)
Opening any interior or exterior cell in the CK will mark it as modified
even if you make no changes.  Always close cells you did not intentionally
edit before saving.  Use FO4Edit's "Remove Identical to Master" to clean.

### 15. Missing MODT record (alternate textures not working)
When using the CK's "Alternate Textures" field, the corresponding MODT
record must reference the correct NIF paths.  Without MODT the CK will not
replace textures on individual instances.

---

## Animation

### 16. Wrong FPS on export
FO4 animations must be exported at 30 FPS.  Blender defaults to 24 FPS.
Set the scene frame rate to 30 before exporting with ck-cmd or Havok2FBX.

### 17. Root motion not baked
Animations that move the character use root-bone motion baked onto the
`COM` bone.  If you animate using NLA strips or constraints, bake the
animation (`Action → Bake Action` with "Clear Constraints") before export.

### 18. HKX skeleton mismatch
ck-cmd requires a matching `skeleton.hkx` to convert FBX animations.
Using the wrong skeleton (e.g. a creature skeleton for a human animation)
will produce a corrupt HKX that crashes the game.
