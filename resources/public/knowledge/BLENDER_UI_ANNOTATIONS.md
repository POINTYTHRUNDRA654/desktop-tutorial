# Blender Annotations

## Overview

Annotations are freehand drawing and markup tools available across multiple Blender editors, allowing you to add notes, sketches, arrows, and visual guides directly to your work. Annotations can be used to mark important areas on 3D objects, annotate node setups, indicate design decisions, or create visual references without modifying the underlying geometry or data.

**Common Annotation Uses:**
- Pointing out specific areas on 3D models
- Adding notes to node graphs and shader editors
- Creating visual guides and layout sketches
- Marking problem areas for later revision
- Team communication and feedback on designs
- Animation planning and timing notes
- Reference sketches and planning drawings

**Key Characteristics:**
- Non-destructive (annotations don't modify scene data)
- Persistent within project (saved with blend file)
- Organized into layers for complex annotated projects
- Available in 3D Viewport, Node Editors, Image Editor, Video Sequencer
- Support for multiple drawing styles and decorations

## Accessing the Annotation Tool

**Toolbar Location:**
- Annotation tool is available in the Toolbar (left side)
- Shortcut: `D` (in some contexts, verify in your keymap)
- Tool can be activated like any other tool from the Toolbar

**Sub-Tools Available:**
- Annotate (freehand drawing)
- Annotate Line (straight lines with optional arrows)
- Annotate Polygon (multi-point connected lines)
- Annotate Eraser (remove strokes)

## Annotation Tools

### Annotate (Freehand Drawing)

**Purpose:** Draw freehand strokes for sketching and general annotation

**Activation:** Select Annotate from Annotation tool group in Toolbar

**Drawing Process:**
1. Click and hold LMB in the viewport
2. Move mouse to draw freehand stroke
3. Release LMB to complete stroke
4. Stroke appears immediately in viewport
5. Continue drawing additional strokes

**Workflow Example:**
1. Activate Annotate tool
2. Draw freehand circle around problem area on 3D model
3. Draw arrow pointing to specific vertex
4. Add text-like symbols or sketches as needed
5. Each stroke is independent and can be edited

**Common Uses:**
- Sketching design ideas directly on models
- Circling areas needing attention
- Creating visual references
- Planning deformation or modification areas

### Annotate Line

**Purpose:** Create straight line segments with optional arrow decorations

**Activation:** Select Annotate Line from Annotation tool group

**Drawing Process:**
1. Click starting point in viewport (LMB click)
2. Drag to ending point (LMB drag)
3. Release LMB to create line
4. Style options appear in Tool Settings
5. Optionally add arrow at start and/or end

**Line Decoration Styles:**

**Start Style Options:**
- None (default, no decoration)
- Arrow (pointing arrowhead)
- Arrow Open (unfilled arrowhead)
- Circle (circular endpoint)
- Diamond (diamond-shaped endpoint)
- Slash (diagonal line at endpoint)

**End Style Options:**
- Same options as Start Style
- Typically set to Arrow for directional annotation
- Can be different at start and end for specific effects

**Workflow Example:**
1. Activate Annotate Line tool
2. Click on area to point from
3. Drag to area to point to
4. In Tool Settings, set End Style to "Arrow"
5. Line with arrow appears in viewport
6. Create multiple annotated lines to indicate relationships

**Arrow Annotations:**
- Single arrow: Click-drag from problem to normal area
- Double arrow: Set both Start and End to arrows
- Open arrow: Use "Arrow Open" for softer appearance
- Directional arrows: Indicate flow or sequence

### Annotate Polygon

**Purpose:** Create multiple connected line segments for complex shapes and paths

**Activation:** Select Annotate Polygon from Annotation tool group

**Drawing Process:**
1. Click first point in viewport (LMB click)
2. Move mouse and click additional points (LMB click for each)
3. Points connect with line segments as you click
4. Continue clicking to add more points
5. Press **Return** to finalize polygon
6. Or press **Esc** to cancel (no polygon created)

**Creating Polygons:**
- Each click adds a new point
- Line segments connect consecutive points
- Visual feedback shows line being drawn
- Can create open path or closed shape

**Workflow Example:**
1. Activate Annotate Polygon tool
2. Click point A (around model area)
3. Click point B (connected with line)
4. Click point C (new line from B to C)
5. Click point D (continue building path)
6. Press Return to complete
7. Polygon with multiple segments appears

**Polygon Use Cases:**
- Drawing complex paths or arrows
- Outlining irregular regions
- Creating reference shapes
- Indicating flow or direction with multiple segments
- Architectural or design sketches

### Annotate Eraser

**Purpose:** Remove or partially erase annotation strokes

**Activation:** Select Annotate Eraser from Annotation tool group

**Erasing Process:**
1. Activate Annotate Eraser tool
2. Click and drag over strokes to erase
3. Eraser radius determines how much is removed
4. Can partially erase by dragging briefly
5. Can completely erase by passing over entire stroke

**Eraser Settings:**
- **Radius** setting in Tool Settings controls eraser size
- Larger radius removes more area per stroke
- Smaller radius for precise erasing
- Adjust radius in Tool Settings panel

**Erasing Tips:**
- Erase whole strokes or partial sections
- Useful for correcting mistakes
- Can erase specific parts of complex annotations
- Non-destructive (easily undo with Ctrl-Z)

## Tool Settings

### Common Settings

These settings apply to multiple annotation tools:

#### Color

**Purpose:** Set color for new annotations and adjust existing stroke colors

**Color Selection:**
- Click color field to open Color Picker
- Select any color from color space
- New strokes use selected color
- Can also recolor existing strokes (varies by editor)

**Color Workflow:**
1. Choose annotation color before drawing
2. Draw strokes in selected color
3. Switch color and draw more strokes
4. Create color-coded annotations for organization
5. Example: Red for problems, Green for approved areas

**Color Persistence:**
- Color setting persists until changed
- Each layer can have different color settings
- Recolor existing strokes by selecting color then applying

#### Annotation Layer

**Purpose:** Access and manage annotation layers

**Interface:**
- Pop-over menu showing current layer name
- Click to access Annotation Layers panel
- Shows list of available layers
- Switch between layers with single click

**Layer Management:**
- Default layer created automatically
- Create new layers for organizing annotations
- Layers can be hidden/shown
- Layers support opacity and thickness controls

**Workflow:**
1. Default annotations go to current layer
2. Add new layer for different annotation type
3. Switch to layer and draw
4. Organize by annotation purpose
5. Hide/show layers as needed

### Placement Settings

Placement determines where annotations appear in relation to the scene or view.

#### 3D Cursor Placement

**Availability:** 3D Viewport only

**Behavior:**
- Annotations become part of 3D scene
- Drawn on imaginary plane through 3D Cursor
- Plane aligned to current viewport view
- Annotations move with viewport rotation
- Annotations scale with viewport zoom

**Use Cases:**
- Marking specific areas in 3D space
- Annotations persist in 3D (move with view)
- Creating spatial notes and markers
- Planning modifications to 3D geometry

**Workflow:**
1. Position 3D Cursor where annotations should be
2. Set Placement to "3D Cursor"
3. Draw annotations
4. Annotations appear on invisible plane through Cursor
5. Rotate view to see annotations from different angles

#### Surface Placement

**Availability:** 3D Viewport only

**Behavior:**
- Annotations drawn onto object surfaces
- Snaps to surface under mouse cursor
- If no surface below mouse, uses 3D Cursor behavior
- Annotations stick to object surface
- Follow surface as object deforms (if deformed after annotation)

**Use Cases:**
- Marking specific points on object geometry
- Annotations follow surface topology
- Natural placement on 3D models
- Detailed surface notes and markers

**Workflow:**
1. Set Placement to "Surface"
2. Hover over object surface
3. Draw annotations directly on surface
4. Strokes snap to surface geometry
5. Annotations appear embedded on model

#### Image Placement

**Availability:** Image Editor and 2D editors only

**Behavior:**
- Annotations exist in 2D image space
- Position and size change with pan/zoom
- Annotations move and scale with image editing
- Useful for image reference notes

**Use Cases:**
- Annotating reference images
- Marking areas in texture images
- Image editing notes
- Reference drawing annotations

**Workflow:**
1. Open Image Editor with reference image
2. Set Placement to "Image"
3. Draw annotations on image
4. Pan and zoom image to see annotations scale
5. Annotations remain positioned relative to image

#### View Placement

**Availability:** All editors

**Behavior:**
- Annotations are 2D, stuck to screen
- Position remains fixed on screen
- Size and rotation don't change with view
- Unaffected by pan, orbit, or zoom
- Appears like overlay on viewport

**Use Cases:**
- General notes and instructions
- UI/UX feedback annotations
- Global scene notes
- Status messages and reminders

**Workflow:**
1. Set Placement to "View" (default)
2. Draw annotations
3. Annotations appear on screen surface
4. Rotate/zoom viewport - annotations stay fixed
5. Useful for persistent notes

### Placement-Specific Options

#### Only End Points Surface Placement

**Availability:** When Surface Placement is active

**Purpose:** Limit snapping to endpoints of strokes

**Behavior:**
- First and last points snap to surface
- Middle points may not align to surface
- Creates lines stretching from surface points
- Reduces jitter from mid-stroke snapping

**Use Case:**
- Drawing lines between specific surface points
- Cleaner annotations with less surface-following
- More predictable stroke paths

**Workflow:**
1. Set Placement to "Surface"
2. Enable "Only End Points Surface Placement"
3. Draw stroke from point A to point B
4. Both endpoints snap to surface
5. Line travels in straight path between them

#### Project Onto Selected Surface Placement

**Availability:** When Surface Placement is active

**Purpose:** Restrict snapping to selected objects only

**Behavior:**
- Annotations only snap to selected objects
- Unselected objects are ignored
- Uses 3D Cursor fallback if drawing over unselected area
- Precise control over snapping targets

**Use Case:**
- Annotating specific object while ignoring nearby objects
- Complex scenes with overlapping geometry
- Precise surface annotations

**Workflow:**
1. Select specific object to annotate
2. Set Placement to "Surface"
3. Enable "Project Onto Selected Surface Placement"
4. Draw annotations - only snap to selected object
5. Annotations ignore all other scene geometry

### Stroke Settings

#### Stabilize Stroke

**Purpose:** Reduce jitter and improve smoothness of drawn strokes

**How It Works:**
- Delays stroke point calculation
- Corrects stroke location to reduce shaky lines
- Creates smoother freehand drawing
- Configurable smoothness parameters

**When to Use:**
- Freehand drawing (Annotate tool)
- Shaky hand or tablet issues
- Smooth, controlled lines needed
- Artistic annotation style

**Stabilize Parameters:**

**Radius:**
- Minimum distance from last point before stroke continues
- Higher values skip more points (smoother but less responsive)
- Lower values capture more detail (follows hand closer)
- Typical range: 0.5 to 5.0 pixels
- Default: 2 pixels

**Factor:**
- Smooth factor for stroke correction
- Higher values produce smoother strokes
- Trade-off: Higher values feel like "pulling" the stroke
- Lower values more responsive to hand movement
- Typical range: 0.5 to 2.0
- Default: 1.0

**Workflow Example:**
1. Enable Stabilize Stroke in Tool Settings
2. Adjust Radius to 1.5 pixels for smooth lines
3. Set Factor to 1.5 for medium smoothing
4. Draw strokes - appear significantly smoother
5. Adjust if needed based on personal drawing style

### Annotate Line Settings

#### Start/End Styles

**Style Options:**
- **None**: No decoration (default)
- **Arrow**: Solid filled arrowhead
- **Arrow Open**: Unfilled arrowhead (outline only)
- **Circle**: Circular endpoint
- **Diamond**: Diamond-shaped endpoint
- **Slash**: Diagonal line at endpoint

**Workflow:**
1. Draw line with Annotate Line tool
2. In Tool Settings, set "Style Start" to desired option
3. Set "Style End" to different option if needed
4. Line appears with decorations at endpoints

**Creating Arrows:**
- Start: None, End: Arrow = Single directional arrow
- Start: Arrow, End: Arrow = Double-ended arrow
- Start: Circle, End: Arrow = Circle with arrow
- Mix and match for different visual effects

## Annotation Layers

When the annotation tool is enabled, layer management appears in the Sidebar.

### Accessing Annotation Layers

**Location:** Sidebar (N) ‣ View ‣ Annotations panel

**Visibility:** Panel appears when annotation tool is active

**Layer List:**
- Shows all annotation layers in current editor
- Default layer created automatically
- Click layer name to select it
- All active drawing goes to selected layer

### Layer Management Features

#### Opacity

**Purpose:** Control transparency of annotation strokes

**Settings:**
- Slider from 0.0 (invisible) to 1.0 (fully opaque)
- Affects all strokes in layer
- Individual stroke opacity cannot be set separately
- Applies to existing and new strokes

**Use Cases:**
- Fade out old annotations
- Create background vs foreground annotations
- Reduce visual clutter
- Emphasis through opacity contrast

**Workflow:**
1. Select annotation layer
2. Adjust Opacity slider
3. Strokes become more/less transparent
4. Use low opacity for reference, high for important notes

#### Thickness

**Purpose:** Control stroke width

**Settings:**
- Adjusts line thickness for all strokes in layer
- Affects existing and new strokes
- Thicker lines more visible from distance
- Thinner lines for detail work

**Use Cases:**
- Make important annotations thicker
- Fine details with thin strokes
- Consistency across layer
- Visual hierarchy through thickness

**Workflow:**
1. Select annotation layer
2. Adjust Thickness slider
3. All strokes in layer update immediately
4. Useful for distinguishing annotation types

#### Onion Skin

**Purpose:** Show ghosted image of strokes from other frames

**Availability:** 3D Viewport and Video Sequencer only

**What It Shows:**
- Ghosted (semi-transparent) annotations from other frames
- Helps visualize annotation changes over time
- Shows before and after current frame
- Useful for animation planning

**Before/After Settings:**
- **Before Frames**: Number of frames to show before current
  - Default: 1 frame
  - Increase to show more history
  
- **After Frames**: Number of frames to show after current
  - Default: 1 frame
  - Increase to preview future annotations

- **Ghost Color Before**: Color for annotations from earlier frames
  - Typically darker or different hue
  
- **Ghost Color After**: Color for annotations from later frames
  - Typically different from before color

**Workflow Example:**
1. Create annotation on frame 1
2. Move to frame 5
3. Create different annotation
4. Enable Onion Skin
5. Set Before: 5, After: 5
6. See faded annotations from frames 0-10
7. Understand annotation changes over animation

## Annotation Workflows

### Workflow 1: Model Review Markup

**Objective:** Mark areas needing revision on 3D model

1. Load model in 3D Viewport
2. Activate Annotate tool
3. Set Placement to "Surface"
4. Set Color to red for problem areas
5. Draw circles around problematic geometry
6. Add Annotate Line with arrows pointing to issues
7. Switch to green color for approved areas
8. Mark good geometry
9. Save annotations with blend file
10. Share with team for review

### Workflow 2: Node Graph Documentation

**Objective:** Annotate complex node setups for clarity

1. Open Shader Editor or Compositor
2. Activate Annotate tool
3. Set Placement to "View" (annotations stuck to screen)
4. Add labels using freehand drawing
5. Use Annotate Line with arrows to show data flow
6. Color-code by data type (colors match node colors)
7. Add reference notes and explanations
8. Make node graph self-documenting
9. Team members understand setup without explanation

### Workflow 3: Animation Planning

**Objective:** Plan animation using annotations with onion skin

1. Open 3D Viewport with character model
2. Set up animation keyframes
3. Activate Annotate tool
4. Frame 1: Draw reference pose
5. Frame 10: Switch to next pose, draw different annotation
6. Enable Onion Skin to see pose progression
7. Annotations show planned movement
8. Helps visualize timing and spacing
9. Identify where timing adjustments needed

### Workflow 4: Texture Reference Markup

**Objective:** Mark reference areas in texture images

1. Open Image Editor with reference texture
2. Activate Annotate tool
3. Set Placement to "Image"
4. Draw arrows indicating light direction
5. Circle color reference points
6. Add freehand notes about material properties
7. Zoom and pan - annotations scale with image
8. Use as reference while painting textures

## Practical Tips and Best Practices

### Organization

**Use Layers:**
- Create separate layers for different annotation types
- Example: "Problems", "Approved", "Reference"
- Hide layers to reduce visual clutter
- Show/hide specific layers during review

**Color Coding:**
- Red for issues or problem areas
- Green for approved areas
- Blue for reference or information
- Yellow for important highlights
- Consistent color scheme across project

### Clarity

**Clear Strokes:**
- Use thicker strokes for visibility
- Avoid overlapping annotations
- Leave space for clarity
- Use arrows to indicate specific points
- Create legend if using many colors

**Legibility:**
- Keep annotations simple
- One annotation per issue
- Use line decorations (arrows, circles) for emphasis
- Avoid cramped or overlapping notes

### Archiving

**Keeping Records:**
- Save blend file with annotations
- Create annotated screenshots for reports
- Use Onion Skin to document progression
- Export images with annotations visible

## Related Documentation

- [Blender UI Tool System](BLENDER_UI_TOOL_SYSTEM.md) - Tool activation and switching
- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Tool button interaction
- [Blender Regions](BLENDER_REGIONS.md) - Sidebar and annotation panel location
- [Blender UI Operators](BLENDER_UI_OPERATORS.md) - Layer management operators
- [Blender 3D Viewport](BLENDER_3D_VIEWPORT.md) - 3D Cursor and view controls
- [Blender Grease Pencil](BLENDER_GREASE_PENCIL.md) - Advanced drawing with Grease Pencil
