# Blender By Attribute Selection & Mesh Operators Guide

## Overview

This guide covers the **By Attribute** selection operator and summarizes where to find core mesh editing operators in Blender. It is focused on practical usage in Edit Mode with shortcuts, menus, requirements, and troubleshooting.

---

## By Attribute Selection

**Reference**
- **Mode**: Edit Mode
- **Menu**: Select ‣ By Attribute
- **Requirement**: Active Attribute must be **Boolean** and on the current domain (vertex, edge, or face)

**What it does**
Selects elements where the active attribute is `true` on the chosen domain. Works for custom boolean attributes or built-in boolean flags you expose to the attribute system.

**Usage**
1. Create or expose a boolean attribute on the desired domain (vertex/edge/face).
2. Make that attribute **active** in the Attribute List (Spreadsheet or Attribute panel).
3. Enter **Edit Mode** and ensure you are in the matching selection mode (Vertex/Edge/Face).
4. Run **Select ‣ By Attribute**.
5. The operator selects all elements with attribute value `true`.

**Tips & Domain Notes**
- The active attribute must live on the same domain you are selecting (e.g., vertex attribute requires Vertex select mode).
- The operator ignores non-boolean attributes; convert them first (Geometry Nodes: Compare/Boolean, or Attribute Math to bool).
- If nothing selects, verify the attribute is active and boolean.

**Common Workflows**
- **Topology flags**: Use Geometry Nodes to tag boundary/feature verts with a boolean, then select them in Edit Mode for manual tweaks.
- **Material-driven masks**: Write a boolean attribute from material/ID map; select faces to reassign materials.
- **UV/island marking**: Bake a boolean for UV seams or islands, then select to adjust.
- **Cleanup**: Tag degenerate or loose elements via a node setup, then select and delete in Edit Mode.

**Troubleshooting**
- **No selection happens**: Ensure attribute is boolean, active, and on the current domain.
- **Wrong elements selected**: Attribute may be on a different domain; switch selection mode or move attribute.
- **Operator disabled**: Likely no active attribute or type not boolean.
- **Mixed domains**: Convert attributes to a single domain via Geometry Nodes (Store Named Attribute after domain conversion).

**Best Practices**
- Name attributes clearly (e.g., `is_boundary`, `needs_fix`).
- Keep boolean attributes lightweight; avoid float when only true/false is needed.
- Use Geometry Nodes to author attributes; apply to mesh when you need Edit Mode selection.
- Combine with **Select Similar** or **Select Sharp Edges** after the attribute selection for refinement.

---

## Mesh Editing Operators: Where to Find Them

Blender’s mesh operators are grouped in menus and shortcuts. Key access points:

### Access Points
- **Header Menus**: `Mesh`, `Vertex`, `Edge`, `Face`, `UV` menus in Edit Mode.
- **Context Menus**: Right-click in 3D Viewport.
- **Hotkey Menus**:
  - `Ctrl-V` Vertex menu
  - `Ctrl-E` Edge menu
  - `Ctrl-F` Face menu
- **Search**: `F3` to search any operator by name.

### Transform Operators (Mesh Menu)
- Move, Rotate, Scale, To Sphere, Shear, Bend, Push/Pull, Warp, Randomize, Shrink/Fatten, Skin Resize
- Mirror (Interactive; X/Y/Z Global/Local)

### Duplicate & Extrude
- Duplicate, Spin, Extrude (Faces, Along Normals, Individual Faces, Manifold, Edges, Vertices, Repeat)

### Merge & Split
- Merge (By Distance), Split, Separate

### Cutting Tools
- Bisect; Knife Project; Knife Topology Tool

### Surface Construction
- Convex Hull, Symmetrize, Snap to Symmetry

### Normals
- Flip, Recalculate, Set from Faces, Rotate, Point to Target, Merge/Split/Average/Copy/Paste/ Smooth/Reset Vectors; Select/Set Face Strength

### Shading
- Shade Smooth/Flat

### Attributes & Sorting
- Set Attribute, Sort Elements

### Clean Up
- Delete Loose, Decimate Geometry, Degenerate Dissolve, Limited Dissolve, Make Planar Faces, Split Non-Planar/Concave Faces, Merge by Distance, Fill Holes

### Deleting & Dissolving
- Delete, Dissolve, Collapse Edges & Faces, Edge Loops

### Vertex Operators
- Extrude Vertices; Extrude to Cursor/Add; Bevel Vertices; New Edge/Face from Vertices; Connect Vertex Path/Pairs; Rip (Standard/Fill/Extend); Slide Vertices; Smooth Vertices; Laplacian Smooth; Blend from Shape; Propagate to Shapes; Vertex Groups; Hooks; Make Vertex Parent

### Edge Operators
- Extrude Edges; Bevel Edges; Bridge Edge Loops; Screw; Subdivide/Subdivide Edge-Ring; Un-Subdivide; Rotate Edge; Edge Slide/Offset Edge Slide; Loop Cut and Slide; Edge Data

### Face Operators
- Extrude Faces (Standard/Along Normals/Individual); Inset; Poke; Triangulate; Tris-to-Quads; Solidify; Wireframe; Fill/Grid Fill/Beautify; Intersect (Knife/Boolean); Weld Edges into Faces; Shade Smooth & Flat; Face Data

### UV Operators
- Unwrap; Smart UV Project; Lightmap Pack; Follow Active Quads; Cube/Cylinder/Sphere Projection; Project from View; Project from View (Bounds); Reset

**Operator Access Reminders**
- Many of these appear in **Mesh menu** or the respective **Vertex/Edge/Face** menus.
- The same shortcuts (`Ctrl-V/E/F`) open context menus under cursor for speed.
- **Precision modifiers**: `Ctrl`/`Shift` snapping/scaling apply to many transforms; not all respect pivot/orientation.

**Quick Navigation**
- Use `F3` search to jump directly to any operator by name.
- Keep an eye on the **Adjust Last Operation** panel (bottom-left) after running operators to tweak options without re-running.

---

## Quick Reference

| Operation | Mode | Access |
|-----------|------|--------|
| By Attribute | Edit | Select ‣ By Attribute (active boolean attribute on correct domain) |
| Vertex menu | Edit | `Ctrl-V` |
| Edge menu | Edit | `Ctrl-E` |
| Face menu | Edit | `Ctrl-F` |
| Operator Search | Any | `F3` |

---

## Troubleshooting (By Attribute)
- **Nothing selected**: Ensure boolean type, correct domain, and attribute is active.
- **Greyed out operator**: No active attribute or wrong type/domain.
- **Unexpected elements**: Attribute exists on a different domain; convert or switch selection mode.
- **Performance**: Large meshes with dense attributes—apply Geometry Nodes to mesh before selecting.

---

## Related Docs
- Blender Modeling Guide
- Blender Meshes Guide
- Blender Mesh Tools Guide
- Blender Mesh Selection and Creation Tools
- Blender Advanced Mesh Selection Tools
- Blender Selection Loops and Linked Geometry Guide
