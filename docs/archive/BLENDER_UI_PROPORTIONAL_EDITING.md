# Blender UI: Proportional Editing

## Overview

Proportional Editing is a fundamental transformation technique in Blender that allows you to modify selected elements while simultaneously affecting nearby unselected elements in a graduated manner. The influence decreases with distance, creating smooth, organic deformations without requiring manual adjustment of individual vertices or objects.

This feature is essential for:
- Creating smooth organic shapes in dense geometry
- Avoiding harsh creases and lumps in mesh deformation
- Performing smooth transitions across mesh surfaces
- Deforming character meshes and organic models
- Creating landscape terrain from grid geometry
- Transforming multiple objects with interdependent relationships

Proportional Editing works in both **Object Mode** and **Edit Mode**, with additional topological options available in Edit Mode. The technique combines transform operations (move, rotate, scale) with a customizable falloff curve to distribute changes smoothly across nearby geometry.

**Quick Access:**
- Shortcut: **O** (toggle enable/disable)
- Shift+O (change falloff type)
- Header: **Proportional Editing** button or popover
- Location: Header ‣ Proportional Editing

---

## Core Concepts

### What Is Proportional Editing?

Proportional Editing creates a "sphere of influence" around your selected geometry. Any unselected elements within this sphere are affected by your transform operation, but the amount of influence decreases with distance according to a falloff curve.

**Key Characteristics:**

1. **Selection-Based**: Only directly selected elements initiate the transformation. The effect radiates outward from these selected elements.

2. **Distance-Dependent**: The farther an unselected element is from the selection, the less it moves. This gradient creates natural, smooth deformations.

3. **Falloff-Shaped**: The shape of the influence follows a mathematical curve (linear, smooth, sharp, sphere, etc.) that you can customize in real-time.

4. **Radius-Controlled**: The size of the influence sphere can be adjusted during transformation using scroll wheel or page up/down keys.

5. **Real-Time Adjustable**: All parameters can be modified while actively transforming, allowing instant visual feedback.

### How It Differs From Normal Transformation

**Normal Transform (Proportional Editing OFF):**
- Only selected geometry moves
- Unselected geometry remains stationary
- Creates hard edges and discontinuities
- Useful for precise, constrained edits

**Proportional Transform (Proportional Editing ON):**
- Selected geometry moves the most
- Nearby unselected geometry moves progressively less
- Creates smooth, continuous deformations
- Useful for organic shapes and smooth transitions

**Example Scenario:**
If you select a single vertex on a sphere and move it with Proportional Editing disabled, only that vertex moves, creating a point. With Proportional Editing enabled, the vertex moves significantly, but surrounding vertices follow it with decreasing influence, creating a smooth bulge in the sphere's surface.

---

## Enabling and Disabling Proportional Editing

### Toggle Controls

**Keyboard Shortcut:** **O**
Pressing O quickly toggles Proportional Editing on and off. This is the fastest method during active work.

**Header Button:** 
The Proportional Editing button appears in the header of the 3D Viewport. Click it to toggle the mode on/off. The button highlights when enabled.

**Popover Access:**
Click the dropdown arrow next to the Proportional Editing button to access:
- Falloff type selector
- Connected Only toggle (Edit Mode only)
- Proportional Size slider
- Projected from View option

### State Indicators

When Proportional Editing is active:
- The header button becomes highlighted/active
- A circular influence indicator appears around selected elements during transform
- The falloff curve icon displays in the header

When disabled:
- Only selected elements are affected by transforms
- No influence circle appears
- Standard transform behavior applies

### Practical Usage Patterns

**Modeling Workflow:**
1. Start with Proportional Editing OFF for precise vertex placement
2. Toggle ON (O) when you need to smooth adjacent geometry
3. Adjust radius and falloff as needed
4. Toggle OFF when done with smooth deformation
5. Return to precise edits

**Sculpting Alternative:**
Note that Blender also includes a dedicated Sculpting workspace with specialized brushes that provide similar proportional deformation without requiring individual vertex visibility. For dense geometry, Sculpt Mode may be more efficient than Edit Mode with Proportional Editing.

---

## Proportional Size and Influence Radius

### Understanding the Influence Sphere

The influence radius determines which unselected elements are affected by the transformation. The radius is centered on the selected element(s) and extends in all directions.

**Radius Behavior:**
- Elements within the radius are affected
- Elements exactly at the radius edge receive minimal influence
- Elements beyond the radius are completely unaffected
- Radius is visualized as a circle during transformation

### Adjusting Size During Transformation

**Primary Methods:**

1. **Mouse Wheel (Scroll Wheel)**
   - Scroll up: Increase radius
   - Scroll down: Decrease radius
   - Provides smooth, fine control
   - Works during active transformation

2. **Page Up/Page Down Keys**
   - Page Up: Increase radius
   - Page Down: Decrease radius
   - Larger increments than scroll wheel
   - Useful for large radius changes

3. **Proportional Size Slider**
   - Access via Proportional Editing popover
   - Numeric value adjustment
   - Useful when exact values are needed
   - Shows the current radius value

**Visual Feedback:**
As you adjust the radius during transformation, the influence circle in the viewport dynamically resizes. You can see in real-time how many surrounding vertices will be affected and to what degree.

**Optimal Radius Selection:**
- Too small: Only immediate neighbors affected, creating creases
- Too large: Entire mesh affected, reducing precision
- Sweet spot: Radius encompasses area where visible deformation is desired
- Usually 2-5 times the size of your selection

### Relative vs. Absolute Sizing

The radius is absolute in 3D space, not relative to viewport zoom. This means:
- Zooming in doesn't change the actual influence radius
- Moving the view doesn't affect radius
- The influence circle remains the same size regardless of zoom level
- When zoomed far away, the circle appears small on screen but covers the same world space

This absolute sizing ensures predictable, consistent behavior across different viewport distances.

---

## Falloff Types and Curves

### What Is Falloff?

Falloff defines the mathematical relationship between distance and influence. Rather than a sharp boundary where the radius ends, falloff curves define a smooth transition from full influence at the center to zero influence at the edge.

The falloff curve determines:
- How quickly influence decreases with distance
- The shape of deformation (smooth bulge vs. sharp cone vs. constant influence)
- Visual quality and aesthetic result of the deformation

### Accessing Falloff Menu

**Methods:**

1. **Shift+O Pie Menu**
   Press Shift+O to open a circular menu showing all falloff options with icons. Select desired falloff by clicking.

2. **Header Icon**
   Click the falloff curve icon in the Proportional Editing header section to open a popover with falloff options.

3. **During Transformation**
   Press Shift+O while actively transforming to change falloff without interrupting the operation.

### Falloff Types

Each falloff type has a specific curve shape that affects how influence diminishes with distance:

#### **Constant (No Falloff)**

**Curve Characteristic:** Horizontal line at full influence, then sudden drop to zero at radius edge.

**Behavior:**
- Full influence throughout entire radius
- Abrupt cutoff at radius boundary
- Creates uniform deformation within sphere
- Hard transition to unaffected geometry outside radius

**Visual Result:**
- Sharp, defined edges of influence
- Uniform bulging or deformation
- Unnatural appearance for organic shapes
- Useful for mechanical or geometric deformations

**Best For:**
- Precise, uniform changes to geometry
- Mechanical or architectural models
- Situations requiring defined boundaries
- Uniform scaling or rotation of clusters

**Example:** Moving vertices in a grid pattern for architectural elements where sharp transitions are acceptable.

#### **Linear Falloff**

**Curve Characteristic:** Straight diagonal line from full influence at center to zero at radius edge.

**Behavior:**
- Influence decreases proportionally with distance
- Equal rate of decrease across entire radius
- Smooth, predictable transition
- Mathematically simple falloff

**Visual Result:**
- Conical deformation shape (cone-like bulge)
- Smooth gradient from influenced to uninfluenced
- Somewhat harsh compared to smoother curves
- Clear but natural-looking transitions

**Best For:**
- General-purpose proportional editing
- Situations where smooth transitions matter
- Creating gentle slopes and gradients
- Default choice for most modeling tasks

**Example:** Raising a region of terrain where you want smooth slopes transitioning to flat areas.

#### **Smooth Falloff**

**Curve Characteristic:** Curved line (ease-in/ease-out style) creating smoother transitions.

**Behavior:**
- Begins with full influence at center
- Slowly decreases initially
- Accelerates falloff near radius edge
- Creates smooth, natural curves

**Visual Result:**
- Rounded, organic bulges
- Smooth transitions without harsh gradients
- Natural, organic appearance
- Professional-looking deformations

**Best For:**
- Organic modeling (characters, creatures, plants)
- Creating natural-looking bumps and deformations
- Areas where smooth aesthetics are important
- Most sculpting-like proportional edits

**Example:** Deforming a character face where soft, natural transitions between deformed and original geometry are essential.

#### **Sharp Falloff**

**Curve Characteristic:** Curved line that maintains influence longer, then drops sharply near edge.

**Behavior:**
- High influence maintained through much of radius
- Sudden drop-off near boundary
- Combines smooth gradation with defined edge
- Creates more localized deformations

**Visual Result:**
- Concentrated deformation in central region
- Sharper transition at outer edges
- More controlled, less spread-out effect
- Useful for intentional, concentrated changes

**Best For:**
- Creating bumps and protrusions
- Localizing deformation to specific area
- Situations where you want influence concentrated
- Defining specific geometric features

**Example:** Creating a sharp bump or ridge on a surface where smooth inner transition leads to quick cutoff.

#### **Root Falloff**

**Curve Characteristic:** Inverted curve starting slowly then accelerating decrease.

**Behavior:**
- Influence drops quickly near center
- Slower falloff near radius edge
- Inverse of smooth falloff
- Creates edge-focused influence

**Visual Result:**
- Deformation concentrated at outer edges of radius
- Center of selection less affected proportionally
- Unusual, specialized deformation pattern
- Creates expanding wave-like effects

**Best For:**
- Specialized effects (wave propagation, ring effects)
- Situations needing edge-concentrated influence
- Creating expanding deformation rings
- Unusual artistic effects

**Example:** Creating a ripple effect where the influence is strongest at the edges of the influence radius.

#### **Sphere Falloff**

**Curve Characteristic:** Smooth sphere-shaped curve, symmetric falloff.

**Behavior:**
- Smooth, spherical influence gradient
- Natural three-dimensional appearance
- Full influence at center, zero at edge
- Follows spherical distance in 3D space

**Visual Result:**
- Naturally rounded, ball-like deformations
- Perfect for creating bulges and indentations
- Three-dimensional quality
- Organic, natural appearance

**Best For:**
- Creating rounded bumps and features
- Organic modeling requiring 3D symmetry
- Any situation needing natural, rounded deformation
- Character and creature modeling

**Example:** Creating a swelling on a character's arm where you want a naturally rounded bulge in all directions.

#### **Inverse Square Falloff**

**Curve Characteristic:** Steep initial drop then gradual long falloff (inverse square law).

**Behavior:**
- Very quick falloff near center
- Maintains influence far from center
- Creates long, gentle gradient
- Based on physical inverse-square laws

**Visual Result:**
- Wide, gentle influence spread
- Deformation felt far from selection
- Smooth, distributed effect across large area
- Subtle, gradual transitions

**Best For:**
- Large-scale deformations
- Creating wide, gentle slopes
- Terrain deformation at landscape scale
- Situations requiring broad, subtle influence

**Example:** Deforming a large landscape where you want influence to spread far but with gentle falloff.

#### **Random Falloff**

**Curve Characteristic:** Chaotic, irregular falloff pattern.

**Behavior:**
- Non-uniform, randomized influence
- Unpredictable variation with distance
- Creates noisy, irregular deformations
- Different every time it's generated

**Visual Result:**
- Noisy, irregular surface features
- Random bumps and deformations
- Organic, chaotic appearance
- Varied, unpredictable results

**Best For:**
- Creating rocky, rough surfaces
- Adding natural variation to terrain
- Creating chaotic, organic features
- Special effects and artistic work

**Example:** Creating rough, weathered surfaces or terrain with natural-looking irregularities.

### Switching Falloff During Transformation

One of the most powerful aspects of Proportional Editing is the ability to change falloff types while actively transforming:

1. Begin transformation with initial falloff type
2. While still moving/rotating/scaling, press Shift+O
3. The pie menu appears
4. Click desired falloff type
5. Transformation continues with new falloff applied

This allows real-time experimentation with different falloff curves to achieve the exact visual result you need.

---

## Proportional Editing in Object Mode

### Basic Object Mode Behavior

While Proportional Editing is typically used in Edit Mode for mesh refinement, it's equally powerful in Object Mode for:
- Deforming collections of objects
- Creating group-level transformations with influence
- Setting up object-to-object relationships
- Creating interdependent object movements

### How It Works in Object Mode

**Selection Focus:**
Select one or more objects to be the center of influence. When you transform these objects, other objects within the influence radius also move, rotate, or scale.

**Influence Application:**
The influence spreads to other objects based on their distance from the selected object(s). Objects closer to the selection move more; distant objects move less.

**Transform Operations:**
- **Move (G key):** Other objects translate toward/away from the moved selection
- **Rotate (R key):** Other objects rotate around the center of influence
- **Scale (S key):** Other objects scale relative to the influence center

### Practical Example: Multiple Cylinder Deformation

**Scenario:** Three cylinders arranged horizontally. The leftmost cylinder is scaled up vertically.

**Without Proportional Editing:**
- Only the selected leftmost cylinder changes
- Middle and right cylinders remain unchanged
- Creates obvious separation

**With Proportional Editing:**
- Leftmost cylinder scales up significantly
- Middle cylinder scales up slightly (moderate influence)
- Right cylinder scales up minimally (edge of radius)
- Creates smooth, coordinated growth across all three objects

**Visual Result:**
All three cylinders deform together in a coordinated manner, creating a wave-like effect across the group.

### Object Mode Workflow

1. Select objects to be the center of influence (G to grab/move first)
2. Press O to enable Proportional Editing
3. Press G/R/S to transform
4. Adjust radius with scroll wheel to include/exclude other objects
5. Adjust falloff with Shift+O if needed
6. Confirm transformation with LMB or Enter
7. Press O to disable when done

### Object Mode Limitations

- No "Connected Only" option (only available in Edit Mode)
- Influence based purely on distance in 3D space
- No topological awareness of object hierarchies
- Less precise control than Edit Mode
- Better for approximate deformations than detailed work

---

## Proportional Editing in Edit Mode

### Advanced Edit Mode Features

Edit Mode provides the most powerful Proportional Editing capabilities with additional options and control:
- Topological awareness through "Connected Only" mode
- Per-vertex precision control
- Integration with other Edit Mode tools
- Advanced selection workflows

### Selection Modes in Edit Mode

Proportional Editing works differently depending on your selection mode:

#### **Vertex Selection Mode (Default)**

**Behavior:**
- Selected vertices are centers of influence
- Influence radiates through 3D space
- All nearby vertices affected, whether connected or not
- Most common and straightforward mode

**Use Case:**
- General mesh deformation
- Creating smooth shapes
- Moderate precision work

#### **Edge Selection Mode**

**Behavior:**
- Selected edge centers are influence points
- Influence affects vertices of selected and nearby edges
- Useful for edge-based operations
- Less common than vertex mode

**Use Case:**
- Deforming edge loops
- Working with edge-based geometry
- Edge selection workflows

#### **Face Selection Mode**

**Behavior:**
- Selected face centers are influence points
- Influence affects all vertices in selected and nearby faces
- Deformation affects larger regions
- Coarser control than vertex mode

**Use Case:**
- Large-scale mesh deformations
- Working with face selections
- Proportional face-based modeling

### Connected Only Mode (Alt+O)

#### Purpose and Behavior

**Connected Only** is an exclusive Edit Mode feature that changes how influence spreads. Instead of using purely spatial distance, influence follows the topological connections of the mesh itself.

**Spatial Distance (Default):**
- Influence reaches elements based on 3D distance
- Travels directly through space
- Affects all nearby geometry regardless of connectivity
- Line of sight: straight line through space

**Topological Distance (Connected Only):**
- Influence follows edge connections in the mesh
- Travels along connected edges only
- Unconnected geometry unaffected, even if spatially close
- Path: follows geometry edges

#### Visual Indicator

When Connected Only is active, the falloff icon in the header displays with a **blue center**, clearly indicating this mode is enabled.

#### Practical Example: Hand with Fingers

**Scenario:** Hand model with fingers separated by gaps in the topology.

**Without Connected Only (Spatial):**
- Select finger tip vertex and move it
- Influence reaches across the gap to adjacent fingers
- Other fingers deform along with selected finger
- Creates unrealistic finger movement

**With Connected Only:**
- Select finger tip vertex and move it
- Influence follows only the connected topology of that finger
- Other fingers remain unaffected (topologically separate)
- Only that finger deforms naturally

**Result:** Connected Only enables selective deformation of individual fingers without affecting adjacent fingers, even though they're physically close.

#### Common Applications

**Character Modeling:**
- Deforming individual limbs without affecting adjacent limbs
- Modifying specific facial features without affecting entire face
- Adjusting fingers individually
- Working with separate body parts

**Creature Modeling:**
- Deforming tentacles independently
- Moving wings without affecting body
- Adjusting multiple appendages separately

**Complex Geometry:**
- Working with detailed mechanical models
- Deforming interconnected structures selectively
- Modifying branching geometry

#### Enabling Connected Only

**Methods:**
1. **Keyboard Shortcut:** Alt+O
2. **Proportional Editing Popover:** Check "Connected Only" checkbox
3. **Header Option:** Toggle in Proportional Editing button dropdown

**Toggle Behavior:**
Like regular Proportional Editing, Connected Only can be toggled on/off with Alt+O while transforming. You can switch between spatial and topological modes mid-transformation.

### Projected from View Option

#### Understanding View Projection

**Normal Mode (Projected from View OFF):**
- Influence radius is a true sphere in 3D space
- Extends equally in all directions (front, back, left, right, up, down)
- Includes geometry behind the view plane
- Creates influence behind the selected element

**Projected from View Mode (ON):**
- Influence projects onto the view plane
- Extends in all directions within the view
- Ignores depth (Z-axis along view direction)
- Only affects visible regions in current view

#### Practical Differences

**Example: Two Vertices at Same Screen Position (Different Depths)**

**Without Projection:**
- Both vertices are equidistant from selection (one behind, one in front)
- Both equally affected by proportional influence
- Creates unexpected deformations with hidden geometry

**With Projection:**
- Only the closer vertex (visible on screen) is in the influence radius
- The vertex behind the view plane is outside influence
- Creates more predictable, view-centric deformations
- Hidden geometry behind selected element unaffected

#### When to Use Projected from View

**Use Projected Mode When:**
- Working with dense overlapping geometry
- Hidden geometry interferes with expected results
- You want influence based on screen position, not world space
- Modeling from a specific camera angle

**Use Normal Mode When:**
- Working with simple, non-overlapping geometry
- You need true spherical influence in 3D space
- Hidden geometry should be affected
- Working with wireframe or transparent view modes

#### Visual Comparison

The reference material includes side-by-side comparisons showing:
- **Left Side (Projected OFF):** Wider influence including background geometry
- **Right Side (Projected ON):** Narrower influence limited to foreground view projection

---

## Proportional Editing Workflows

### Workflow 1: Deforming Dense Mesh Geometry

**Objective:** Smooth deformation of a complex, high-poly mesh without visible creases.

**Scenario:** High-resolution character model with detailed geometry that requires smooth, organic deformation.

**Step-by-Step Process:**

1. **Enter Edit Mode**
   - Tab to enter Edit Mode
   - Model is fully visible with all vertices

2. **Select Target Vertex**
   - Alt+A to deselect all
   - Click single vertex or small vertex group
   - Usually select vertex at deformation center

3. **Enable Proportional Editing**
   - Press O to enable
   - Circular influence indicator appears around selection

4. **Choose Transformation (Move)**
   - Press G to grab/move
   - Move mouse to desired position
   - Vertex moves most; surrounding geometry follows smoothly

5. **Adjust Influence Radius**
   - Scroll wheel up to increase radius
   - Observe how more geometry becomes affected
   - Find optimal radius containing desired deformation area
   - Scroll down to decrease if radius too large

6. **Adjust Falloff Type (Optional)**
   - Press Shift+O during transformation
   - Select smooth or sphere falloff for organic results
   - Observe change in deformation curve
   - Confirm selection

7. **Fine-Tune Position**
   - Continue moving mouse to perfect position
   - Influence applies in real-time
   - Confirm with LMB or Enter

8. **Repeat as Needed**
   - Adjust nearby areas
   - Use same or different falloff
   - Create smooth, continuous surface

**Result:** Smooth, artifact-free deformation without visible creases or bumps where undeformed geometry meets deformed areas.

**Pro Tips:**
- Use Smooth or Sphere falloff for best organic results
- Smaller radius = more localized, controlled deformation
- Multiple small adjustments better than one large move
- Check multiple view angles to ensure smooth result

### Workflow 2: Landscape Terrain Generation

**Objective:** Create natural-looking landscape terrain from a simple grid using proportional deformation.

**Scenario:** Flat grid mesh transformed into rolling hills and valleys.

**Step-by-Step Process:**

1. **Create Base Mesh**
   - Add plane with multiple subdivisions (50x50 vertices)
   - Subdivision creates dense grid suitable for deformation
   - Ensure adequate geometry for terrain detail

2. **Switch to Edit Mode and Vertex Selection**
   - Tab to enter Edit Mode
   - Press 1 to ensure Vertex Selection mode
   - Ready to deform individual heights

3. **Deselect All**
   - Alt+A to deselect all vertices
   - Start with blank selection

4. **Create First Hill**
   - Click single vertex near desired hill center
   - Press G then Z to constrain movement to Z-axis
   - Move up slightly (5-10 Blender units)
   - Observe how surrounding vertices follow

5. **Enable Proportional Editing**
   - Press O to enable
   - Circular influence appears around selected vertex

6. **Adjust Radius for Landscape Scale**
   - During movement, scroll wheel up
   - Create broader hill with gradual slopes
   - Radius should encompass 1/4 to 1/3 of terrain area
   - Larger radius = gentler slopes

7. **Select Falloff Type**
   - Press Shift+O to open falloff menu
   - Choose Inverse Square for gentle, natural slopes
   - Or Smooth for rounder hills
   - Confirm selection

8. **Confirm Hill**
   - Press Enter or LMB to confirm
   - Press O to disable Proportional Editing
   - First hill is complete

9. **Create Valleys**
   - Select vertex for valley location
   - Press O to enable Proportional Editing
   - Press G then Z to move vertically
   - Move down to create depression
   - Scroll to adjust radius
   - Confirm with Enter

10. **Add More Detail**
    - Repeat hill/valley process in different areas
    - Vary radius and height for natural variation
    - Create ridgelines and depressions
    - Layer deformations for complex terrain

11. **Refine With Smaller Adjustments**
    - Use smaller radius and height for fine details
    - Add rocks, outcrops, gullies
    - Use different falloff types for varied features
    - Ensure consistent water flow direction

12. **View and Export**
    - Rotate view to verify terrain from multiple angles
    - Use Wireframe to verify even distribution
    - Export as model or bake as texture
    - Save final blend file

**Result:** Natural-looking landscape terrain with rolling hills, valleys, and varied topography generated entirely from proportional editing.

**Pro Tips:**
- Proportional Editing excels at terrain generation
- Use Z-axis constraint (G→Z) to control vertical movement
- Inverse Square falloff creates most natural slopes
- Build terrain from large shapes first, add details last
- Reference real landscapes for realistic proportions
- Disable Proportional Editing between hill creations to prevent interference

### Workflow 3: Character Face Deformation

**Objective:** Adjust facial features subtly while maintaining natural appearance.

**Scenario:** Character face model requiring cheekbone adjustment, lip adjustment, or brow modification.

**Step-by-Step Process:**

1. **Load Character Model**
   - Open existing character model in Edit Mode
   - Verify sufficient geometry density for facial work
   - Frontal view recommended for face work

2. **Select Face Region**
   - Circle select (C key) or lasso select (Alt+C) to select vertices
   - Select cheekbone area (example: 10-20 vertices)
   - Avoid selecting far edges to prevent unwanted influence

3. **Enable Proportional Editing**
   - Press O
   - Observe influence circle around selection

4. **Begin Adjustment**
   - Press G to grab/move
   - Move outward and up to enhance cheekbone
   - Observe how surrounding face follows smoothly

5. **Adjust Influence Radius**
   - Scroll wheel to refine radius
   - Should cover cheekbone area plus surrounding face
   - Avoid extending to nose or ears
   - Smaller radius = more localized change

6. **Select Smooth Falloff**
   - Press Shift+O
   - Select Smooth falloff type
   - Ensures natural transitions in facial geometry
   - Sphere also works well for rounded features

7. **Fine-Tune Position**
   - Continue adjusting position for subtle result
   - Proportional influence creates natural blending
   - Preview in multiple views (side, 3/4, etc.)

8. **Confirm Adjustment**
   - Press Enter to confirm
   - Check result from multiple angles
   - Verify no harsh transitions or artifacts

9. **Adjust Additional Features**
   - Press O to enable again
   - Select lips, brows, or other features
   - Repeat process with different regions

10. **Final Check**
    - Disable Proportional Editing
    - View model without influence circle
    - Verify all adjustments are subtle and natural
    - Check symmetry if applicable

**Result:** Natural-looking facial adjustments with smooth transitions and organic appearance.

**Pro Tips:**
- Use small radius for facial work (avoid affecting entire face)
- Smooth or Sphere falloff essential for natural appearance
- Make multiple small adjustments rather than one large change
- Check both profile and frontal views
- Consider symmetry mirror modifier for consistent results
- Use wireframe overlay to verify vertex distribution

### Workflow 4: Proportional Rotation

**Objective:** Rotate an element with proportional influence for natural, organic rotation effects.

**Scenario:** Rotating a character's limb where other nearby limbs should follow subtly.

**Step-by-Step Process:**

1. **Select Limb Region**
   - Select vertices/edges comprising the limb to rotate
   - Or in Object Mode, select object to rotate
   - Selection center becomes rotation pivot

2. **Enable Proportional Editing**
   - Press O
   - Influence circle appears

3. **Begin Rotation**
   - Press R to enter rotate mode
   - Press X/Y/Z to constrain to axis (optional)
   - Move mouse in circular motion to rotate
   - Rotation applies with proportional influence

4. **Adjust Radius**
   - Scroll wheel to expand/contract radius
   - Larger radius pulls in more surrounding geometry
   - Smaller radius keeps rotation localized

5. **Select Appropriate Falloff**
   - Press Shift+O during rotation
   - Choose falloff appropriate to rotation feel
   - Sphere or Smooth for natural effects
   - Confirm selection

6. **Fine-Tune Rotation**
   - Continue rotating to desired angle
   - Surrounding geometry follows naturally
   - Real-time visual feedback guides rotation

7. **Confirm Rotation**
   - Press Enter to confirm
   - Press O to disable Proportional Editing

**Result:** Natural-looking rotation where primary selection rotates fully and surrounding geometry follows proportionally, creating organic movement.

**Pro Tips:**
- Rotation is excellent for joint-like movements (shoulders, hips, elbows)
- Constrain to appropriate axis (R→X for arm rotation, etc.)
- Proportional rotation creates natural joint effects
- Use in Object Mode for coordinated group rotations
- Combines well with follow-through animation principles

### Workflow 5: Smooth Mesh Imperfections

**Objective:** Remove harsh creases, bumps, or imperfections from mesh surface.

**Scenario:** Model with obvious seams, hard transitions, or geometric artifacts that need smoothing.

**Step-by-Step Process:**

1. **Identify Problem Area**
   - Zoom in on imperfect geometry
   - Identify crease or bump to smooth
   - Select small vertex group at problem area

2. **Enable Proportional Editing**
   - Press O
   - Small influence circle centered on problem area

3. **Move to Average Position**
   - Press G to grab
   - Slightly move selection toward average position of surrounding geometry
   - Small movement prevents overcorrection
   - Goal is to "average out" harsh transitions

4. **Set Appropriate Radius**
   - Scroll wheel to refine radius
   - Radius should cover imperfection plus surrounding good geometry
   - Larger radius smooths over larger area

5. **Use Smooth or Sphere Falloff**
   - Press Shift+O
   - Choose Smooth or Sphere for gentle smoothing
   - Inverse Square also works for wide smoothing
   - Avoid Sharp or Root for smoothing work

6. **Confirm Smoothing**
   - Enter to confirm
   - Check from multiple angles
   - Repeat if necessary with smaller adjustments

7. **Blend with Surrounding Areas**
   - May require secondary smoothing passes
   - Each pass blends result more with surroundings
   - Multiple small adjustments better than one large move

**Result:** Smooth, artifact-free mesh surface with eliminated harsh transitions and creases.

**Pro Tips:**
- Small adjustments essential for smoothing work
- Don't move too far from original position
- Proportional Editing excels at removing artifacts
- Multiple passes create better blending
- Combine with Smooth shading for best results
- Use Wireframe mode to see exact vertex positions

---

## Advanced Techniques and Tips

### Technique 1: Chained Deformations

**Concept:** Using multiple consecutive proportional edits to build complex shapes progressively.

**Method:**
1. Make initial proportional deformation with moderate radius
2. Confirm and press O to disable
3. Select different vertex group nearby
4. Enable Proportional Editing again and adjust
5. Deformations chain together creating complex shapes
6. Each deformation respects existing geometry

**Advantage:** 
- More control than single large deformation
- Easier to maintain geometry quality
- Can fine-tune each stage independently
- Creates natural, believable results

**Example:** Sculpting character shoulders by:
- First deforming outer shoulder
- Then adjusting upper arm
- Then refining collarbone area
- Each step builds on previous, creating natural joint shapes

### Technique 2: Axis-Constrained Proportional Moves

**Concept:** Combining axis constraint with proportional editing for directional control.

**Method:**
1. Select target vertices
2. Press O to enable Proportional Editing
3. Press G then X/Y/Z to constrain to axis
4. Move along constrained axis
5. Proportional influence applies along axis
6. Other axes not affected

**Advantage:**
- Prevents unwanted deformation in undesired directions
- Creates more predictable, controlled results
- Preserves certain geometry aspects while deforming others
- Essential for certain modeling tasks

**Example:** Adjusting terrain height with G→Z constrains vertical movement while proportional influence handles horizontal smoothing naturally.

### Technique 3: Proportional Editing with Modifiers

**Concept:** Using proportional editing on models with modifiers applied or in construction history.

**Workflow:**
1. Apply modifiers non-destructively (make subsurface modifier adjustable)
2. Edit base geometry with proportional editing
3. Modifiers update to reflect proportional changes
4. Subsurface/subdivision modifiers smooth proportional results further
5. Can adjust proportional edit and see real-time modifier impact

**Advantage:**
- Combines smooth deformation with geometric smoothing
- Non-destructive workflow
- Can fine-tune results at multiple levels
- Proportional edit + modifier creates very smooth results

**Example:** High-poly character with subdivision surface modifier:
1. Edit base vertices with proportional editing
2. Subdivision surface immediately updates
3. Result combines proportional smoothing with geometric subdivision
4. Creates professional-quality deformations

### Technique 4: Connected-Only for Organic Parts

**Concept:** Using topological "Connected Only" mode for part-specific deformations.

**Method:**
1. Press Alt+O to enable Connected Only
2. Select vertices on one disconnected part
3. Press G/R/S to transform with proportional influence
4. Influence follows topology, ignoring other parts
5. Part deforms without affecting adjacent parts

**Advantage:**
- Selective deformation of individual parts
- No accidental influence on neighboring geometry
- Topological awareness prevents errors
- Essential for models with separate parts

**Example:** Character rigging work where you need to deform individual limbs:
- Deform left arm's bones without affecting right arm
- Influence follows bone chain topology
- Right arm completely unaffected despite proximity

### Technique 5: Radius Locking for Consistency

**Concept:** Maintaining consistent influence radius across multiple edits.

**Method:**
1. Set initial radius to desired size
2. Use same radius for subsequent edits (no scroll adjustment)
3. Creates consistent deformation scale across model
4. Multiple edits with identical radius feel cohesive

**Advantage:**
- Consistent visual appearance across deformations
- Faster workflow (no radius adjustment each time)
- Creates harmonious, balanced results
- Professional appearance

**Example:** Landscape with multiple hills:
- Set radius for first hill
- Keep exact same radius for all subsequent hills
- All hills feel proportionally similar
- Creates natural, uniform terrain appearance

### Technique 6: View-Angle Specific Deformations

**Concept:** Using Projected from View to deform based on current viewport angle.

**Method:**
1. Position view to desired angle
2. Enable Proportional Editing
3. Enable "Projected from View" option
4. Transform with view-projected influence
5. Influence matches screen view, not world space
6. Rotate view and repeat for different angles if needed

**Advantage:**
- Influence follows visible screen elements
- Predictable results from design/camera angle
- Hides issues with overlapping geometry
- Matches intent of viewpoint-specific modeling

**Example:** Designing character face from specific camera angle:
- Position camera/view for design
- Enable Projected from View
- Adjust facial features relative to camera view
- Result looks perfect from that camera angle

### Technique 7: Falloff Experimentation

**Concept:** Rapidly testing different falloff curves to find optimal appearance.

**Method:**
1. Begin transformation
2. Repeatedly press Shift+O to cycle through falloffs
3. Observe real-time change in influence curve
4. Select falloff that produces desired visual result
5. Confirm transformation

**Advantage:**
- Iterative refinement of appearance
- Visual feedback for each curve type
- Finds optimal falloff quickly
- Prevents unsatisfying results

**Example:** Character shoulder deformation:
- Start with Smooth falloff
- Press Shift+O during move
- Try Sphere, Inverse Square, Sharp in sequence
- Sphere produces best rounded shoulder shape
- Confirm with Sphere selected

### Technique 8: Scale with Proportional Editing

**Concept:** Using proportional scale to create natural size variations.

**Method:**
1. Select target vertices (usually small selection)
2. Press O for Proportional Editing
3. Press S for scale
4. Move mouse outward to scale up
5. Proportional influence scales nearby geometry gradually
6. Scroll to adjust radius

**Advantage:**
- Creates smooth size transitions
- Useful for organic shapes with size variation
- Proportional influence prevents hard edges
- Can create bulges, indentations, bumps

**Example:** Character muscle definition:
- Select small vertex group at bicep
- Scale up slightly with proportional influence
- Surrounding shoulder and forearm scale down gradually
- Creates natural muscle bulge effect

### Technique 9: Rotate + Move Combinations

**Concept:** Combining rotation and movement proportional edits for complex deformations.

**Method:**
1. First transformation: proportional rotate limb
2. Confirm transformation
3. Second transformation: proportional move in different location
4. Edits combine for complex, natural-looking result

**Advantage:**
- Can't do both simultaneously, but sequential works well
- Combines different transform types
- Creates more complex shapes than single transform
- Each stage is independently controllable

**Example:** Character arm adjustment:
1. Rotate forearm at elbow with proportional influence
2. Upper arm rotates slightly following proportional curve
3. Confirm rotation
4. Then proportionally move entire arm forward
5. Combined rotations and moves create natural arm pose

### Technique 10: Sculpt Mode vs. Proportional Editing

**Concept:** Understanding when to use Sculpt Mode brushes vs. Edit Mode proportional editing.

**Proportional Editing Best For:**
- Precise geometric deformations
- Transforms (move, rotate, scale) with proportional influence
- Models with moderate poly count
- Architectural and mechanical shapes
- Smooth, broad deformations

**Sculpt Mode Best For:**
- High-poly organic models
- Detailed surface features (bumps, wrinkles, creases)
- Painterly workflow with brushes
- Complex organic shapes (creatures, characters)
- Intuitive brush-based control

**Hybrid Approach:**
1. Use Sculpt Mode for initial organic shapes
2. Export as mesh
3. Use Proportional Editing in Edit Mode for precise adjustments
4. Combine both techniques for optimal results

**Decision Tree:**
- Need geometric transform? → Proportional Editing
- Need surface detail? → Sculpt Mode
- Dense high-poly mesh? → Sculpt Mode
- Moderate poly, geometric work? → Proportional Editing
- Best quality result? → Combine both

---

## Best Practices and Recommendations

### General Best Practices

**1. Start with Proportional Editing Disabled**
- Most precise, controlled work without proportional influence
- Only enable when smoothing needed
- Prevents accidental widespread deformations
- Toggle with O as needed for specific operations

**2. Use Appropriate Falloff Types**
- Smooth/Sphere: Organic, character work
- Linear: General-purpose, versatile
- Inverse Square: Large-scale terrain
- Sharp: Concentrated, localized changes
- Constant: Mechanical, geometric work
- Experiment with falloff pie menu (Shift+O)

**3. Adjust Radius Carefully**
- Start with moderate radius
- Increase gradually with scroll wheel
- Too small: Creates creases
- Too large: Affects entire model
- Watch influence circle during adjustment

**4. Use Small, Incremental Moves**
- Large movements with proportional editing create artifacts
- Multiple small adjustments blend better
- Prevents overshooting desired result
- Allows fine-tuning and course correction

**5. Check from Multiple View Angles**
- Rotate view frequently during work
- Front, side, 3/4 views all important
- Hidden problems visible only from certain angles
- Wireframe and shaded modes reveal different issues

**6. Combine with Other Tools**
- Proportional Editing + Smooth Shading = Professional quality
- Works well with modifiers (subdivision surface, etc.)
- Combine with selection tools (box, circle, lasso)
- Use with symmetry modifier for bilateral work

**7. Understand Mesh Density Requirements**
- Dense geometry: Smooth, refined deformations
- Sparse geometry: Larger movements, visible blocky transitions
- Subdivide mesh if proportional editing shows artifacts
- Add edge loops before proportional work if needed

### Workflow Optimization

**Keyboard Shortcut Priority:**
1. **O**: Toggle Proportional Editing on/off (most frequent)
2. **Shift+O**: Open falloff pie menu (frequent during work)
3. **Alt+O**: Toggle Connected Only (when needed)
4. **G/R/S**: Grab/Rotate/Scale (standard transforms)
5. **Scroll Wheel**: Adjust radius (continuous fine-tuning)

**Viewport Configuration:**
- Enable wireframe overlay for vertex visibility
- Use X-ray mode to see hidden geometry
- Enable face orientation to verify normals
- Use object outlines for context

**Selection Strategy:**
- Small selections for precise, localized work
- Larger selections for broad deformations
- Alt+A to deselect before new selections
- Box select (B) for rectangular regions
- Circle select (C) for freeform selections

### Troubleshooting Common Issues

**Problem: Proportional Editing creates harsh edges**
- Solution: Reduce radius to avoid affecting unintended geometry
- Solution: Switch to Smooth or Sphere falloff
- Solution: Make smaller, incremental adjustments
- Solution: Check mesh density; may need subdivision

**Problem: Selected vertices don't move proportionally**
- Solution: Verify Proportional Editing is enabled (O)
- Solution: Check that falloff radius is large enough (scroll wheel up)
- Solution: Confirm falloff type isn't set to Constant

**Problem: Unwanted geometry gets affected**
- Solution: Use smaller radius (scroll wheel down)
- Solution: Switch to Connected Only mode (Alt+O) in Edit Mode
- Solution: Use different falloff type (Sharp for localized influence)
- Solution: Enable "Projected from View" to ignore background geometry

**Problem: Results look unnatural**
- Solution: Use Smooth or Sphere falloff instead of Linear
- Solution: Make multiple small adjustments instead of one large move
- Solution: Reduce radius to more localized influence
- Solution: Check model from multiple view angles

**Problem: Connected Only mode isn't working**
- Solution: Verify Alt+O is pressed to enable
- Solution: Icon should show blue center when enabled
- Solution: Only available in Edit Mode, not Object Mode
- Solution: Mesh must be connected; separate meshes won't see influence

**Problem: Radius adjustment doesn't seem to work**
- Solution: Verify you're in active transform (press G/R/S first)
- Solution: Ensure scroll wheel or Page Up/Down being used correctly
- Solution: Check that Proportional Editing is enabled (header shows active)
- Solution: Try Page Up instead of scroll wheel (larger increments)

---

## Related Viewport Features

### Viewport Gizmos

While Proportional Editing is transform-based, viewport gizmos provide alternative transform control:

**Move Gizmo:**
- Three color-coded axes (X-red, Y-green, Z-blue)
- Drag axes for constrained movement
- Small squares for two-axis movement
- White circle for free 3D movement

**Rotate Gizmo:**
- Large white circle for camera-relative rotation
- Translucent disc for trackball rotation
- Three axes for constrained rotation

**Scale Gizmo:**
- Area between circles for uniform scale
- Axes for individual axis scaling

**Relationship to Proportional Editing:**
- Gizmos provide precise transform control
- Proportional Editing adds influence spreading
- Can use gizmos with Proportional Editing enabled
- Gizmos more direct; Proportional Editing more fluid

### Viewport Overlays

Proportional Editing works best with certain viewport overlays enabled:

**Face Orientation Overlay:**
- Shows front faces in blue, back faces in red
- Verifies normals are correct before deformation
- Ensures deformations preserve face direction

**Wireframe Overlay:**
- Shows all edges on top of solid shading
- Reveals vertex positions during deformation
- Helps verify smooth transitions

**Vertex/Edge/Face Display:**
- Shows vertex/edge/face indices in Edit Mode
- Helps identify specific geometry being affected
- Useful for complex selections

### Viewport Shading Modes

Different shading modes reveal different aspects of proportional deformations:

**Wireframe Mode:**
- Shows all vertices and edges clearly
- Best for verifying vertex positions
- Less useful for assessing overall shape

**Solid Mode:**
- Default mode for proportional editing
- Shows shape clearly with lighting
- Good balance of clarity and detail
- Recommended for most work

**Material Preview Mode:**
- Shows materials and basic lighting
- Useful for checking result with textures
- Can reveal issues with deformation
- Good for final quality checking

**Rendered Mode:**
- Final render preview
- Shows exact result with all effects
- Slow for interactive editing
- Use for final verification only

---

## Proportional Editing and Other Transform Tools

### Proportional Editing vs. Sculpt Mode Brushes

| Aspect | Proportional Editing | Sculpt Mode |
|--------|---------------------|------------|
| **Geometry Type** | Moderate-poly meshes | High-poly sculpts |
| **Control Type** | Transform-based (move/rotate/scale) | Brush-based (paint surface) |
| **Precision** | High geometric precision | More organic, less precise |
| **Workflow** | Mathematical, calculated | Artistic, intuitive |
| **Geometry Density** | Works with sparse to moderate | Requires high density |
| **Surface Features** | Smooth deformations | Detailed surface details |
| **Performance** | Very fast | Slower with high poly |
| **Learning Curve** | Easy with transforms | More artistic skill needed |

### Proportional Editing vs. Mirror Modifier

**Mirror Modifier:**
- Creates mirrored geometry symmetrically
- Non-editable, applied to entire model
- Perfect mirror symmetry
- Fast, automatic approach

**Proportional Editing:**
- Manual deformation control
- Can be asymmetrical if desired
- Requires deliberate application
- More artistic control

**Combined Approach:**
1. Apply Mirror Modifier to model
2. Edit one half with Proportional Editing
3. Mirror modifier updates opposite half automatically
4. Creates perfect symmetry with proportional smoothing

### Proportional Editing vs. Smooth Shading

**Smooth Shading:**
- Smooths surface normals for appearance
- Doesn't change geometry
- Very fast, no vertex movement
- Good for visual improvement of rough geometry

**Proportional Editing:**
- Moves geometry to create smooth surface
- Actual topological change
- More computationally involved
- Creates geometrically smooth surfaces

**Combined Approach:**
1. Use Proportional Editing to adjust vertex positions
2. Apply Smooth Shading for normal smoothing
3. Both techniques together create professional results
4. Proportional edit geometry + smooth shade for final quality

---

## Performance Considerations

### Working with Large Meshes

**High-Poly Meshes (100k+ vertices):**
- Proportional Editing still works but may be slower
- Larger radius calculations affect more vertices
- Screen refresh may lag during transformation
- Consider using Sculpt Mode for very high-poly work

**Optimization Strategies:**
1. Reduce viewport shading complexity (use Wireframe or Solid)
2. Disable overlays you don't need
3. Hide objects outside working area
4. Temporarily disable modifiers
5. Work on sub-selections rather than entire mesh

### GPU vs. CPU Performance

**GPU Acceleration:**
- Some Blender operations use GPU
- Proportional Editing still CPU-based (vertices calculations)
- GPU primarily for rendering/shading
- High-poly proportional work still CPU-intensive

**CPU Considerations:**
- Large radii on high-poly meshes require more calculation
- Falloff curve calculation for each affected vertex
- Multiple affected vertices with complex falloff = slower
- Older CPUs slower with proportional transforms

---

## Common Workflows Summary

### Quick Reference: Proportional Editing Hotkeys

| Action | Hotkey | Alternative |
|--------|--------|-------------|
| **Toggle Proportional** | **O** | Header button |
| **Toggle Connected Only** | **Alt+O** | Popover checkbox |
| **Change Falloff** | **Shift+O** | Header icon |
| **Increase Radius** | **Scroll Up** | Page Up |
| **Decrease Radius** | **Scroll Down** | Page Down |
| **Move (Grab)** | **G** | - |
| **Rotate** | **R** | - |
| **Scale** | **S** | - |
| **Constrain to Axis** | **X/Y/Z** | After G/R/S |

### Decision Tree: When to Use Proportional Editing

```
Start: Do you want to transform selected geometry?
  ├─ Yes: Transform (move, rotate, scale)?
  │  ├─ Need precise control only?
  │  │  └─ No: Disable Proportional (standard transform)
  │  └─ Want smooth influence on surrounding?
  │     └─ Yes: Enable Proportional Editing
  │        ├─ In Object Mode?
  │        │  └─ Use spatial distance falloff
  │        └─ In Edit Mode?
  │           ├─ Separate parts/topology?
  │           │  └─ Enable Connected Only (Alt+O)
  │           └─ Overlapping geometry?
  │              └─ Enable Projected from View
  │
  └─ No: Don't use Proportional Editing
     ├─ Use Sculpt Mode for surface details
     └─ Use standard selection/transform tools
```

---

## Conclusion

Proportional Editing is a powerful, essential tool for Blender artists working with mesh deformation. Its combination of intuitive controls, real-time feedback, and flexible options makes it suitable for everything from precise character work to organic terrain generation.

**Key Takeaways:**

1. **Versatility:** Works in Object Mode and Edit Mode with specialized features in each
2. **Control:** Adjustable radius, falloff types, and connectivity options provide fine-grained control
3. **Integration:** Combines seamlessly with other transforms (move, rotate, scale)
4. **Quality:** Creates smooth, natural-looking deformations without artifacts
5. **Speed:** Much faster than manual vertex adjustment
6. **Learning Curve:** Simple to start with, deep advanced features for refinement

**Mastery Path:**
1. Start: Simple moves with default Smooth falloff
2. Intermediate: Experiment with all falloff types and radius control
3. Advanced: Connected Only mode, Projected from View, axis constraints
4. Expert: Combining with modifiers, hybrid Sculpt/Proportional workflows

With practice, Proportional Editing becomes second nature, and you'll find yourself using it instinctively for smooth, professional-quality mesh deformations across all your modeling work.

---

## Related Documentation

For comprehensive coverage of related viewport features and transform systems, see:

- [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md) - Core viewport interface and navigation
- [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md) - Advanced viewport controls
- [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) - Pivot point types and snapping systems
- [BLENDER_UI_SELECTING.md](BLENDER_UI_SELECTING.md) - Selection methods and techniques
- [BLENDER_UI_OPERATORS.md](BLENDER_UI_OPERATORS.md) - Operator system and transform tools
- [BLENDER_UI_TOOLS.md](BLENDER_UI_TOOLS.md) - Toolbar and tool system
