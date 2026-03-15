# Vegetation & Landscaping Guide

## Overview

Creating vegetation for Fallout 4 requires careful attention to performance. This guide shows you how to create beautiful, detailed vegetation that won't kill your FPS.

## The FPS Problem

**Why Vegetation Impacts Performance:**
- Each separate mesh = 1 draw call
- 100 trees = 100 draw calls = FPS drop
- Textures, materials, and polygons all add up
- Distance rendering compounds the problem

**The Solution:**
- **Combine meshes** into single objects
- **Share materials** across instances
- **Use LOD systems** for distance rendering
- **Optimize polygon counts** aggressively
- **Remove hidden geometry** that won't be seen

## Quick Start: Creating Vegetation

### Step 1: Create Base Vegetation

1. Open the **Vegetation & Landscaping** panel
2. Click **Create Vegetation**
3. Select vegetation type:
   - **Tree**: Full tree with trunk and canopy
   - **Bush**: Shrub/bush base
   - **Grass Clump**: Ground grass
   - **Fern**: Plant/fern base
   - **Rock**: Decorative rock
   - **Dead Tree**: Wasteland tree

**Result:** You get a FO4-optimized base mesh to customize.

### Step 2: Customize Your Vegetation

1. Enter **Edit Mode** (Tab key)
2. Model your vegetation:
   - Add detail to branches
   - Sculpt the shape
   - Adjust proportions
3. Exit **Edit Mode** (Tab key)

**Tip:** Keep it simple! You'll be scattering many instances.

### Step 3: Scatter Across Area

1. Select your vegetation mesh
2. Click **Scatter Vegetation**
3. Configure:
   - **Count**: Number of instances (20-100 typical)
   - **Scatter Radius**: Area to cover (10-50m)
   - **Random Scale**: Vary sizes (recommended)
   - **Random Rotation**: Vary angles (recommended)
4. Click OK

**Result:** Multiple vegetation instances scattered across an area.

### Step 4: Combine for Performance

**This is the magic step!**

1. Select all scattered vegetation (Shift+Click or Box Select with B)
2. Click **Combine Selected**
3. Choose options:
   - ✅ **Merge Materials**: Combines materials (better FPS)
   - ✅ **Generate LOD**: Creates simplified distance version
4. Click OK

**Result:** 
- All vegetation merged into ONE mesh
- Draw calls: 100 → 1 (100x performance improvement!)
- Optional LOD for even better distance rendering

### Step 5: Optimize for FPS

1. Select the combined mesh
2. Click **Optimize for FPS**
3. Configure:
   - **Target Poly Count**: 5000 (adjust based on needs)
   - ✅ **Remove Hidden Faces**: Removes downward-facing polygons
4. Click OK

**Result:** Optimized mesh with reduced polygon count and cleaned geometry.

### Step 6: Create LOD Chain (Optional)

For even better performance:

1. Select your optimized mesh
2. Click **Create LOD Chain**
3. Wait for processing

**Result:** 4 LOD levels created:
- **LOD0**: Full detail (close range)
- **LOD1**: 50% detail (medium range)
- **LOD2**: 25% detail (far range)
- **LOD3**: 10% detail (very far range)

### Step 7: Export

1. Select your final combined mesh (and LODs if created)
2. Use **Export Mesh** to save as FBX
3. Convert to NIF using external tools
4. Place in your FO4 mod folder

## Complete Workflow Example

### Creating a Forest Patch

```
Goal: Create a forest area with 50 trees

1. Create base tree (Tree preset)
2. Customize in Edit Mode (5 minutes)
3. Scatter 50 instances (radius: 30m)
4. Select all 50 trees
5. Combine Selected (merge materials: Yes, LOD: Yes)
6. Optimize for FPS (target: 8000 polys)
7. Create LOD Chain
8. Export

Result:
- Before: 50 meshes, 50 draw calls, ~150,000 polys
- After: 1 mesh, 1 draw call, ~8,000 polys
- FPS Impact: Minimal (thanks to single mesh + LODs)
```

### Creating Ground Cover

```
Goal: Add grass and small plants

1. Create grass clump (Grass preset)
2. Keep it simple (< 100 polys)
3. Scatter 200 instances (radius: 50m)
4. Select all
5. Combine Selected
6. Optimize for FPS (target: 3000 polys, remove hidden: Yes)
7. Export as "GroundCover_01"

Result:
- 200 grass clumps → 1 mesh
- Draw calls: 200 → 1
- Massive FPS improvement
```

## Best Practices

### Polygon Budget

**Per Vegetation Type:**
- Trees (combined): 5,000-10,000 polys
- Bushes (combined): 2,000-5,000 polys
- Grass (combined): 1,000-3,000 polys
- Rocks (combined): 1,000-2,000 polys

**Why?**
- Lower = better FPS
- Combined meshes can be higher because they're ONE draw call
- LODs reduce distance rendering cost

### Material Efficiency

**Always Merge Materials:**
- One material = simpler rendering
- Fewer texture switches = better FPS
- Use texture atlases when possible

**Texture Sizes:**
- Trees: 1024x1024 or 2048x2048
- Bushes: 512x512 or 1024x1024
- Grass: 256x256 or 512x512

### Scattering Tips

**Instance Counts:**
- Small area (10m): 10-30 instances
- Medium area (30m): 30-80 instances
- Large area (50m+): 80-200 instances

**Random Variations:**
- ✅ Always use random scale (0.7-1.3 range)
- ✅ Always use random rotation
- Consider creating 2-3 base variations for more diversity

### LOD Strategy

**When to Use LODs:**
- ✅ Large vegetation (trees)
- ✅ Dense areas (forests)
- ✅ Long view distances
- ❌ Small props close to player
- ❌ Interior cells

**LOD Distances (typical):**
- LOD0: 0-20m
- LOD1: 20-50m
- LOD2: 50-100m
- LOD3: 100m+

### Optimization Checklist

Before exporting vegetation:

- [ ] Combine scattered instances
- [ ] Merge materials
- [ ] Remove hidden/downward faces
- [ ] Check polygon count
- [ ] Create LODs if needed
- [ ] Validate mesh
- [ ] Test in-game FPS impact

## Advanced Techniques

### Technique 1: Billboard LODs

For extreme distances, create flat billboard versions:

1. Take screenshot of vegetation from front
2. Create plane with alpha texture
3. Use as LOD3 or LOD4
4. Massive FPS savings at distance

### Technique 2: Texture Atlasing

Combine multiple vegetation textures into one:

1. Create 2048x2048 atlas
2. Place tree, bush, grass textures in grid
3. Adjust UVs to match atlas positions
4. All vegetation shares ONE texture = better performance

### Technique 3: Layered Vegetation

Create depth with layers:

1. Background layer: LOD2/LOD3 trees (far)
2. Mid layer: LOD1 trees + bushes (medium)
3. Detail layer: LOD0 trees + grass (close)
4. Each layer optimized separately

### Technique 4: Ambient Occlusion Baking

Add depth without extra polygons:

1. Select vegetation mesh
2. Click **Setup AO Bake**
3. Go to Render Properties > Bake
4. Set Bake Type: Ambient Occlusion
5. Click Bake
6. Result: Shadowed texture for better depth

## Performance Comparison

### Before Optimization

```
Scene: Forest area
- 80 individual trees
- 40 individual bushes  
- 150 grass clumps
Total: 270 objects
Draw Calls: 270
Polygons: ~400,000
FPS: 25-30 (low)
```

### After Optimization

```
Scene: Same forest area
- 1 combined tree mesh (with LODs)
- 1 combined bush mesh (with LODs)
- 1 combined grass mesh
Total: 3 objects
Draw Calls: 3
Polygons: ~15,000 (with LOD switching)
FPS: 55-60 (smooth)
```

**Improvement: 90x fewer draw calls, 95% fewer polygons, 2x FPS!**

## Troubleshooting

### Problem: Combined mesh looks wrong

**Solution:**
- Check normals (Auto-Fix Common Issues)
- Recalculate normals in Edit Mode
- Ensure all objects had scale applied before combining

### Problem: Too many polygons

**Solution:**
- Use Optimize for FPS
- Increase decimation ratio
- Simplify base mesh before scattering
- Remove unseen details

### Problem: Textures don't work after combining

**Solution:**
- Use Smart Material Setup before combining
- Merge materials option during combine
- Check UV maps are preserved

### Problem: FPS still low

**Solution:**
- Create more aggressive LODs
- Reduce scatter count
- Split into multiple combined meshes
- Use billboards for distant vegetation

## Integration with FO4

### Export Settings

When exporting vegetation:

1. Format: FBX
2. Scale: 1.0
3. Forward: -Z Forward
4. Up: Y Up
5. Apply Transform: Yes

### File Organization

```
YourMod/
├── Meshes/
│   ├── Landscape/
│   │   ├── Trees/
│   │   │   ├── PineTree_Combined.nif
│   │   │   ├── PineTree_LOD1.nif
│   │   │   └── PineTree_LOD2.nif
│   │   ├── Bushes/
│   │   │   └── Bush_Combined.nif
│   │   └── Grass/
│   │       └── GrassClump_Combined.nif
│   └── ...
└── Textures/
    └── Landscape/
        ├── PineTree_d.dds
        ├── PineTree_n.dds
        └── ...
```

### In-Game Testing

1. Import into Creation Kit
2. Place in exterior cell
3. Test draw distance
4. Check FPS with `tdt` console command
5. Adjust LOD distances if needed

## Real-World Examples

### Example 1: Post-Apocalyptic Forest

```
Components:
- 60 dead trees (Dead Tree preset)
- 30 sparse bushes (Bush preset)
- 80 dry grass clumps (Grass preset)

Workflow:
1. Create and scatter each type
2. Combine dead trees → 1 mesh (8000 polys)
3. Combine bushes → 1 mesh (3000 polys)
4. Combine grass → 1 mesh (2000 polys)
5. Create LOD chains for trees
6. Export all

Result: 3 draw calls, smooth FPS
```

### Example 2: Overgrown Settlement

```
Components:
- 40 trees (Tree preset)
- 60 bushes (Bush preset)
- 120 ferns (Fern preset)
- 30 rocks (Rock preset)

Workflow:
1. Create varied base meshes
2. Scatter in logical groups
3. Combine by type
4. Optimize each combined mesh
5. Create LOD chains
6. Export

Result: 4 draw calls, excellent performance
```

## Tips from the Pros

### Tip 1: Start Simple

Don't over-detail base meshes. You're combining many - keep each simple!

### Tip 2: Test Early

Scatter a few, combine, test FPS. Adjust before doing full area.

### Tip 3: Layer Your Details

Close detail (high poly) → Medium (medium poly) → Far (low poly/billboards)

### Tip 4: Reuse Combined Meshes

Create library of combined vegetation. Reuse across multiple mods!

### Tip 5: Profile Your Scene

Use FPS counter to identify problem areas. Focus optimization there.

## Summary

**Key Takeaways:**

1. ✅ **Always combine** scattered vegetation
2. ✅ **Merge materials** for better FPS
3. ✅ **Use LODs** for distant rendering
4. ✅ **Remove hidden geometry** (bottom faces)
5. ✅ **Keep poly counts** reasonable
6. ✅ **Test in-game** frequently

**The Golden Rule:**

> One combined mesh with LODs beats 100 individual meshes every time!

By following this guide, you can create lush, detailed vegetation that looks great and runs smoothly in Fallout 4.

Happy landscaping! 🌲🌿
