# Blender UI: Image Editor, Scenes, and Object Management

## Overview

This documentation covers three fundamental aspects of Blender's interface:

1. **Image Editor**: Creating, viewing, editing images, render results, and compositor output
2. **Scenes**: Organizing work into manageable units with independent settings
3. **Object Management**: Creating, selecting, and manipulating scene objects

These systems work together to provide complete control over your Blender projects:
- **Image Editor** displays textures, renders, and image data
- **Scenes** organize different shots, lighting setups, and production stages
- **Objects** populate scenes with geometry, lights, cameras, and other elements

**Quick Access:**
- Image Editor: Editors Selector ‣ Image Editor
- Scene Selector: Topbar ‣ Scene data-block menu
- Add Object: 3D Viewport ‣ Shift+A

---

## Part 1: Image Editor

### Introduction

The Image Editor is a specialized editor for working with 2D image data in Blender. It serves multiple purposes:
- View and edit texture images
- Display render results
- Show intermediate Compositor output
- Preview UV unwrapping layouts
- Paint textures directly on meshes
- Create new images from scratch

**Primary Functions:**
1. **Image Viewing**: Display existing images with color management
2. **Texture Painting**: Paint directly on 3D model textures
3. **Render Display**: View completed renders and render passes
4. **Compositor Preview**: See real-time compositor node output
5. **UV Editing**: Preview UV layouts and texture mapping
6. **Masking**: Create and edit masks for compositing

**Typical Workflows:**
- Texture artist: Load reference images, paint textures, export results
- Lighting artist: View render results, compare render passes
- Compositor: Preview compositor output, adjust color grading
- Modeler: Check UV unwrapping, verify texture coordinates

### Toolbar

The toolbar contains tools for sampling and annotating images.

#### **Sample Tool**

**Purpose**: Sample the color value of one or more pixels in the image.

**Usage**:
1. Select Sample tool from toolbar
2. Click and hold **LMB** on image
3. Footer displays comprehensive color information
4. Release **LMB** to stop sampling

**Information Displayed** (while sampling):
- **X and Y Coordinates**: Pixel position under cursor
- **Color in RGBA**: Red, Green, Blue, Alpha values (0.0-1.0)
- **Color After Color Management**: Values after view transform applied
- **Color in HSV**: Hue, Saturation, Value representation
- **Luminance**: Brightness value (perceptual luminosity)

**Sample Size Setting**:
- **Purpose**: Defines dimensions of square used to sample pixels
- **Value 1 (default)**: Samples single pixel under cursor
- **Value > 1**: Samples area and returns average of all pixels
- **Use Case**: Larger sample size smooths out noise in detailed textures

**Practical Applications**:
- **Color Matching**: Sample existing colors to match in new textures
- **Exposure Analysis**: Check if values are clipping (pure white/black)
- **Color Grading**: Verify color balance across image
- **Technical Analysis**: Verify specific pixel values for procedural work

**Alternative Sampling**: Hold **RMB** anywhere in the editor to temporarily sample a single pixel without activating the Sample tool.

#### **Annotate Tool**

**Purpose**: Draw hand-drawn notes and markers on images.

**Features**:
- Freehand drawing over images
- Multiple annotation layers
- Color-coded annotations
- Visibility control
- Persistent across sessions

**See Also**: [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md) for complete annotation documentation.

### Header

The Image Editor header contains mode selectors, view controls, image management, and display settings.

#### **Mode Selector**

**Purpose**: Switch between different Image Editor operating modes.

**Modes**:

**View Mode**:
- **Function**: Standard image viewing and display
- **Features**: Pan, zoom, color channel display
- **Use Case**: Viewing renders, reference images, textures
- **Tools**: Sample, annotate only

**Paint Mode (Texture Paint)**:
- **Function**: Paint directly on texture images
- **Features**: Brushes, color picking, symmetry, masks
- **Use Case**: Creating and editing textures
- **Tools**: Full brush system available
- **See Also**: Texture Paint documentation

**Mask Mode**:
- **Function**: Create and edit masks for compositing
- **Features**: Bezier curves, feathering, animation
- **Use Case**: Rotoscoping, compositing masks
- **Tools**: Mask creation and editing tools

#### **View Controls**

**Purpose**: Tools for controlling content display in the editor.

**Features**:
- Pan and zoom controls
- Fit image to view
- Zoom to specific levels
- Frame selection
- Render region controls

**See Also**: View Menu section below for complete list.

#### **Image Controls**

**Purpose**: Tools for opening, saving, and manipulating images.

**Indicator**: Asterisk (*) appears after image name if unsaved changes exist.

**Features**:
- Open existing images
- Save modified images
- Create new images
- Replace images
- Reload from disk
- Edit externally

**See Also**: Editing section below for detailed image operations.

#### **Image Data-Block Selector**

**Purpose**: Select which image to display in the editor.

**Standard Images**:
- All loaded images from current blend-file
- External images linked via file browser
- Generated/procedural images
- Packed images

**Special Items**:

**Render Result**:
- **Purpose**: Displays completed renders
- **Activation**: Automatically selected after rendering
- **Features**: Multiple slots, view layers, render passes
- **Additional Selectors**: When selected, Slot/View Layer/Render Pass selectors appear

**Viewer Node**:
- **Purpose**: Displays output from Compositor's Viewer Node
- **Activation**: Automatically updates when Viewer Node connected
- **Use Case**: Real-time compositor preview
- **Workflow**: Connect any node output to Viewer Node to preview

**New Image Creation**:
Click **+** or select **New** to create new image with options:

- **Name**: Image name
- **Width/Height**: Pixel dimensions (powers of 2 recommended for textures)
- **Color**: Initial fill color (default black)
- **Alpha**: Include alpha channel (transparency)
- **Type**: Blank, UV Grid, Color Grid (test patterns)
- **Tiled**: Enable UDIM support for multiple texture tiles
- **32-bit Float**: Use floating-point precision (HDR images)

**Generated Image Options**:
- **Blank**: Solid color fill
- **UV Grid**: Test grid showing UV coordinates
- **Color Grid**: Colored test pattern

#### **Image Pin**

**Purpose**: Prevent automatic image switching when selecting objects.

**Default Behavior (Unpinned)**:
- In Texture Paint mode, selecting different objects automatically switches to their textures
- Image Editor updates to show active object's texture

**Pinned Behavior**:
- Current image stays displayed regardless of object selection
- Useful for comparing multiple textures or keeping reference visible

**Use Cases**:
- Reference image viewing while painting different objects
- Comparing textures across multiple objects
- Keeping specific image visible during workflow

#### **Show Sequencer Scene**

**Visibility**: Only visible when viewing Render Result and Sequencer Scene differs from active scene.

**Purpose**: Toggle between render from active scene vs. sequencer scene.

**Behavior**:
- Automatically set based on render type
- Useful for complex multi-scene compositing
- Allows viewing sequencer output in Image Editor

#### **Slot Selector** (Render Result only)

**Purpose**: Select which render slot to view and render to.

**Functionality**:
- 8 available render slots (numbered 1-8)
- Each slot stores independent render
- New renders overwrite current slot
- Preserved until overwritten

**Usage Workflow**:
1. Select empty slot before rendering
2. Render new image
3. Switch between slots to compare renders
4. Previous renders preserved in other slots

**Navigation**:
- **Slot Selector**: Click to choose slot from list
- **J**: Cycle forward through slots
- **Alt+J**: Cycle backward through slots
- **Number Keys (1-8)**: Jump directly to slot number

**Naming**:
- Double-click slot name in Image panel (Sidebar) to rename
- Custom names help identify render variations
- Names persist across sessions

**Use Cases**:
- Compare different lighting setups
- Test material variations
- Iterate on composition
- A/B testing render settings

#### **View Layer Selector** (Render Result only)

**Purpose**: Select which View Layer to display from the render.

**Functionality**:
- Shows list of all View Layers in scene
- Each View Layer can have different objects, overrides, render passes
- Switch between layers without re-rendering

**Use Cases**:
- Separate character and environment renders
- Isolate specific object groups
- Render different passes for compositing

#### **Render Pass Selector** (Render Result only)

**Purpose**: Display specific render pass instead of combined result.

**Available Passes** (depends on render engine):
- Combined (default full render)
- Diffuse Color / Direct / Indirect
- Specular Color / Direct / Indirect
- Transmission / Emission / Environment
- Ambient Occlusion
- Shadow
- Normal / Position / Vector
- Denoising Data
- Cryptomatte passes
- Custom AOVs (Arbitrary Output Variables)

**Use Cases**:
- Analyze lighting contribution
- Debug material issues
- Isolate specific render elements
- Prepare passes for compositing

#### **Viewport Gizmos**

**Purpose**: Show/hide navigation and display gizmos.

**Toggle Button**: Click to enable/disable all gizmos at once.

**Drop-Down Menu**:
- **Navigate**: Pan and zoom gizmos
- Individual gizmo visibility controls

**Navigate Gizmos**:
- Pan gizmo: Click and drag to pan view
- Zoom gizmo: Click to zoom in/out
- Useful when mouse wheel unavailable

**See Also**: Navigation section below for gizmo usage.

#### **Display Channels**

**Purpose**: Select which color channels are displayed.

**Options**:

**Color & Alpha**:
- **Display**: Full color with transparency
- **Background**: Checkerboard pattern shows transparent areas
- **Use Case**: Standard viewing mode for images with alpha

**Color**:
- **Display**: RGB channels only, no transparency
- **Background**: Solid color (theme-dependent)
- **Use Case**: Viewing images without alpha channel

**Alpha**:
- **Display**: Alpha channel as grayscale
- **Visualization**: White = opaque (1.0), Black = transparent (0.0), Gray = semi-transparent
- **Use Case**: Checking transparency masks, verifying alpha edges

**Z-Buffer** (Render Result only):
- **Display**: Depth information as grayscale
- **Range**: From Clip Start (white) to Clip End (black)
- **Source**: Camera settings define range
- **Use Case**: Depth compositing, fog effects, depth of field

**Red / Green / Blue**:
- **Display**: Individual color channel as grayscale
- **Use Case**: Analyzing color channel distribution, checking for clipping

**Practical Applications**:
- Alpha: Verify transparency edges are clean
- Z-Buffer: Check depth map for compositing
- Individual Channels: Diagnose color issues, verify packed data

### Asset Shelf Region

**Availability**: Depends on current mode.

**Purpose**: Quick access to mode-specific assets.

**Paint Mode**:
- Brush assets for texture painting
- Material presets
- Texture stamps

**Features**:
- Drag-and-drop asset application
- Category organization
- Preview thumbnails
- Search and filtering

**See Also**: Asset Browser documentation for comprehensive asset management.

### Main View

**Primary Display Area**: Central region showing the active image.

**Interactive Features**:
- Click and drag to pan (MMB by default)
- Scroll wheel to zoom
- Right-click sample (**RMB** samples single pixel, no tool required)

**Display Characteristics**:
- Respects color management settings
- Shows transparency as checkerboard (Color & Alpha mode)
- Can display metadata overlays
- Updates in real-time for Compositor/Viewer Node

**Pixel Grid**:
- Visible at high zoom levels
- Shows individual pixels clearly
- Useful for pixel-perfect editing

### Navigation

**Purpose**: Control view position and zoom level within the Image Editor.

#### **Panning**

**Mouse Method**:
- Hold **MMB** and drag to pan
- View moves with mouse movement
- Release **MMB** to stop panning

**Alternative**: Use Navigation Gizmo (see Gizmos section)

#### **Zooming**

**Mouse Wheel Method**:
- **Scroll Up**: Zoom in
- **Scroll Down**: Zoom out
- Zooms toward cursor position

**Numpad Method**:
- **Numpad Plus (+)**: Zoom in
- **Numpad Minus (-)**: Zoom out
- Zooms toward view center

**View Menu Shortcuts**: See View Menu section for preset zoom levels.

### Navigation Gizmos

**Location**: Top right corner of editor, next to Sidebar.

**Purpose**: Provide alternative navigation when mouse wheel unavailable (tablets, touchpads, accessibility).

**Gizmos Available**:

**Pan Gizmo**:
- Four directional arrows
- Click and drag to pan in direction
- Continuous panning while held

**Zoom Gizmo**:
- Plus/minus buttons
- Click to zoom in/out incrementally
- Multiple clicks for larger zoom changes

**Visibility**: Toggle via **Viewport Gizmos** button in header.

### View Menu

**Purpose**: Commands for controlling view display, zoom, and visibility.

#### **Toolbar** (T)
- Toggle visibility of Toolbar region (left side)
- Contains Sample and Annotate tools

#### **Sidebar** (N)
- Toggle visibility of Sidebar region (right side)
- Contains Image settings, View options, Scopes

#### **Tool Settings**
- Show/hide settings for currently active tool
- Displayed below header when visible
- Contains tool-specific parameters

#### **Asset Shelf**
- Toggle Asset Shelf region visibility
- Only visible in modes that support assets (e.g., Paint mode)

#### **Adjust Last Operation**
- Displays pop-up panel for last operation
- Allows changing parameters after execution
- Disappears after performing different operation

#### **Update Automatically**

**Purpose**: Control real-time updates to other editors.

**Enabled (default)**:
- Changes in Image Editor instantly update other editors
- 3D Viewport updates when painting textures
- Compositor updates when changing images
- Real-time preview across editors

**Disabled**:
- Other editors don't update automatically
- Manual refresh required (orbit 3D Viewport, etc.)
- Improves performance with heavy scenes
- Useful when working on large images

#### **Show Metadata**

**Purpose**: Display metadata about Render Result.

**Information Shown**:
- Date/Time: Render timestamp
- Render Time: Time taken to render
- Frame: Current frame number
- Scene: Scene name
- View Layer: Active view layer
- Render Engine: Cycles, EEVEE, etc.
- Camera: Camera used
- Custom metadata fields

**Configuration**: Properties ‣ Output ‣ Metadata panel defines included metadata.

#### **Zoom Submenu**

**Purpose**: Convenient zoom levels and operations.

**Preset Zoom Levels** (based on image vs. screen resolution):

- **12.5% (1:8)** - Numpad 8: Extreme zoom out
- **25% (1:4)** - Numpad 4: Major zoom out
- **50% (1:2)** - Numpad 2: Half size
- **100% (1:1)** - Numpad 1: Actual pixels (1 image pixel = 1 screen pixel)
- **200% (2:1)** - Ctrl+Numpad 2: Double size
- **400% (4:1)** - Ctrl+Numpad 4: Quadruple size
- **800% (8:1)** - Ctrl+Numpad 8: Extreme zoom in

**Zoom Operations**:

**Zoom In/Out** (Wheel):
- Incremental zoom toward/away cursor
- Smooth, continuous zoom control

**Zoom to Fit** (Shift+Home):
- Fits entire image in editor window
- Uses maximum available space
- Centers image in view

**Zoom Region** (Shift+B):
- Interactive: Draw rectangle with mouse
- Zooms to fit selected region
- Useful for focusing on specific area

**Frame All** (Home):
- Centers image in view
- Ensures entire image visible
- Maintains current zoom level (if image fits)

**Center View to Cursor**:
- Pans view so 2D cursor at editor center
- Zoom level unchanged
- Useful for refocusing on specific point

#### **Render Region** (Ctrl+B, Render Result only)

**Purpose**: Define rectangular region for rendering.

**Usage**:
1. Select Render Result in Image Editor
2. Press **Ctrl+B**
3. Drag rectangle over desired region
4. Region highlighted
5. Next render only renders this region

**Benefits**:
- Faster test renders
- Focus on specific area
- Iterate quickly on problem regions

**Clear Render Region** (Ctrl+Alt+B):
- Removes render region restriction
- Next render covers full frame

#### **Render Slot Navigation** (J / Alt+J)

**Purpose**: Quickly switch between render slots.

**J (Next)**: Cycle forward through slots containing renders
**Alt+J (Previous)**: Cycle backward through slots

**Behavior**: Skips empty slots, only cycles through slots with actual renders.

#### **Area**

**Purpose**: Adjust editor area properties.

**Options**: Standard area controls (split, join, etc.)

### Sidebar

The Sidebar (press **N** to toggle) contains multiple tabs with settings and information.

#### **Tool Tab**

**Purpose**: Display settings for active tool.

**Contents**: Dynamic based on selected tool:
- Sample tool: Sample size options
- Brush tools: Brush settings, strength, radius
- Mask tools: Mask properties

#### **Image Tab**

**Purpose**: Image properties and management.

**Contents**:
- Image metadata display
- File path information
- Image settings (see Image Settings section)
- Source controls (see Source section)

#### **View Tab**

**Purpose**: Display options for the Image Editor.

**See Also**: Display panel section below.

#### **Display Panel** (View Tab)

**Purpose**: Control how images are displayed.

**Aspect Ratio**:
- **Purpose**: Display aspect for image
- **Effect**: Stretches/squeezes image display
- **Note**: Display only, doesn't affect rendering

**Repeat Image**:
- **Purpose**: Tile image to fill entire editor
- **Effect**: Image repeats horizontally and vertically
- **Use Case**: Seamless texture preview, pattern checking

**Annotations Options**:
- Standard annotation settings
- See [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md)

#### **Scopes Tab**

**Purpose**: Display statistical information about image colors.

**Visibility**: Hidden when active object is in Edit Mode or Texture Paint Mode.

**Scope Types**:

##### **Histogram**

**Purpose**: Graph showing color value distribution.

**Display**:
- **X Axis**: Color values (0.0 to 1.0, or 0 to 255)
- **Y Axis**: Number of pixels with that value
- **Interpretation**: Peak at left = dark image, peak at right = bright image

**Modes**:
- **Luma**: Luminosity histogram (brightness)
- **RGB**: Red, Green, Blue stacked on top of each other
- **R / G / B / A**: Individual color channels

**Show Line**:
- Display as line graph instead of filled shapes
- Easier to see overlapping channels in RGB mode

**Interactive**:
- Drag **LMB** in histogram to adjust vertical zoom
- Useful for analyzing low-frequency data

**Use Cases**:
- Balance tonal range in images
- Identify clipping (spikes at 0 or 255)
- Compare exposure across images
- Ensure full dynamic range utilization

##### **Waveform**

**Purpose**: Plot color distribution for each vertical line of pixels.

**Display**:
- **X Axis**: Horizontal position in image (left to right)
- **Y Axis**: Color value range (0.0 to 1.0)
- **Brightness**: More pixels at a value = brighter point

**Waveform Opacity**:
- Control point opacity
- Higher values = stronger visibility

**Waveform Modes**:

**Luma**:
- Single waveform plotting luminosity
- Shows overall brightness distribution
- Good for checking exposure

**YCbCr** (Y, Cb, Cr):
- Y: Luma (brightness)
- Cb: Blue-difference chroma
- Cr: Red-difference chroma
- Three waveforms side-by-side
- Video color space representation

**Parade** (R, G, B):
- Red, Green, Blue waveforms side-by-side
- Each channel separate
- Easy to compare channel levels
- Industry-standard color grading view

**Red Green Blue**:
- R, G, B waveforms overlaid
- Combined view shows color relationships
- Compact display

**Use Cases**:
- Check exposure consistency across image width
- Identify overexposed/underexposed regions
- Verify color balance
- Professional color grading

##### **Vectorscope**

**Purpose**: Display color distribution in radial/circular format.

**Display**:
- **Angle**: Hue (color)
- **Distance from Center**: Saturation (color intensity)
- **Brightness**: More pixels with that hue/saturation = brighter

**Vectorscope Opacity**:
- Control point opacity
- Adjust visibility

**Interpretation**:
- Center: Neutral gray/white (no saturation)
- Edge: Fully saturated colors
- Angle indicates hue direction
- Red at 0°, Green at 120°, Blue at 240°

**Use Cases**:
- Analyze color palette
- Check for color casts
- Verify skin tone placement
- Ensure broadcast-safe colors
- Color grading analysis

##### **Sample Line**

**Purpose**: Same as Histogram but from pixels along a drawn line.

**Usage**:
1. Click "Sample Line" tool
2. Drag line across image
3. Histogram shows color values along that line
4. Update by redrawing line

**Use Cases**:
- Check gradient smoothness
- Analyze specific image region
- Verify color transitions
- Technical quality control

#### **Samples Settings**

**Full Sample**:
- **Enabled**: Sample every pixel in image
- **Disabled**: Sample subset of pixels
- Trade-off: Accuracy vs. performance

**Accuracy** (when Full Sample disabled):
- Proportion of pixels to sample
- 0.0 to 1.0 (0% to 100%)
- Lower values = faster, less accurate
- Higher values = slower, more accurate

---

## Part 2: Scenes

### Introduction

**Purpose**: Scenes organize your Blender work into distinct, manageable units.

**Core Concept**: Each blend-file can contain multiple scenes, and scenes can share data (objects, materials, collections) or be completely independent.

**What a Scene Defines**:
- Visible objects and collections
- Active camera and camera settings
- Lighting setup and environment
- Render settings and output
- Animation data (timeline, keyframes)
- Physics simulations
- World settings (background, lighting)

**Common Scene Uses**:
- **Multi-Shot Projects**: Each shot as separate scene
- **Lighting Variations**: Multiple lighting setups for same geometry
- **Production Pipeline**: Modeling scene, animation scene, rendering scene
- **Asset Organization**: Reference scenes for assets
- **Render Comparisons**: Different render settings per scene

**Relationship to Blender's Data System**:
Scenes are data-blocks that can link to other data-blocks. Understanding Library and Data System is helpful for advanced scene management.

### Scenes as Assets

**Purpose**: Mark scenes as reusable assets accessible via Asset Browser.

**Functionality**:
- Scenes appear in Asset Browser when marked as assets
- Drag-and-drop into any blend-file
- Stores all scene data (camera, lights, render settings)
- Preview images auto-generated

**Preview Generation**:
- Renders from active camera
- Uses Solid View shading mode
- Requires active camera in scene
- Automatic when scene marked as asset

**Asset Actions** (dragging scene asset):

**Link or Append**:
- Imports scene into current blend-file
- Link: Scene references original data (updates when original changes)
- Append: Scene copied as independent data

**Activate**:
- Sets imported scene as active in window
- Immediately usable

**Typical Uses**:
- **Lighting Rigs**: Pre-built 3-point lighting, studio setups
- **Shot Templates**: Camera framing templates for consistent shots
- **Render Presets**: Scenes with optimized render settings
- **Base Templates**: Starting points for new projects
- **Department Templates**: Modeling scene, animation scene, etc.

**Workflow Example**:
1. Create scene with studio lighting setup
2. Mark scene as asset
3. Save to asset library
4. Reuse lighting in future projects by dragging from Asset Browser

### Scenes in the Video Sequencer

**Purpose**: Use scenes as strips in Video Sequencer timeline.

**Functionality**:
- Each scene becomes a strip in sequencer
- Scenes render dynamically during playback
- No intermediate file rendering required
- Share data-blocks unless using Full Copy

**Workflow**:
1. Create scene for each shot
2. Set up animation in each scene
3. Create master scene with Video Sequencer
4. Add scene strips for each shot scene
5. Arrange strips in timeline order
6. Render master scene to get final video

**Benefits**:
- Non-destructive editing
- Easy shot rearrangement
- Dynamic updates when changing shot scenes
- Multi-shot project management
- Trailer/preview creation

**Use Cases**:
- Multi-shot animations
- Animatics and previsualization
- Layout editing
- Shot sequencing
- Trailer creation

### Scene Controls

**Location**: Topbar ‣ Scene data-block menu

**Purpose**: Select and create scenes.

#### **Scene List**

**Display**: Dropdown showing all scenes in current blend-file.

**Selection**: Click scene name to make it active.

**Active Scene Indicator**: Current scene name displayed in selector.

#### **Add Scene Menu**

**New**:
- **Function**: Creates empty scene with default values
- **Contents**: Default world, camera, light, cube
- **Settings**: Default render settings
- **Use Case**: Starting completely fresh scene

**Copy Settings**:
- **Function**: Creates empty scene copying render and world settings from active scene
- **Contents**: No objects, just settings
- **Copied**: Render settings, world shader, color management
- **Not Copied**: Objects, collections, animation
- **Use Case**: New scene with same render setup

**Linked Copy**:
- **Function**: Creates new scene sharing all data with current scene
- **Shared**: Collections, objects, all data-blocks
- **Behavior**: Changes in one scene automatically affect the other
- **Relationship**: Both scenes reference identical data
- **Use Case**: Testing variations with same geometry

**Full Copy**:
- **Function**: Creates fully independent scene
- **Copied**: All objects and their data
- **Behavior**: Changes independent between scenes
- **Relationship**: Complete duplicate with no data sharing
- **Use Case**: Creating variations that shouldn't affect original

**Data Sharing Note**:
Objects reference Object Data (meshes, curves, lights). Scenes can share or duplicate these relationships depending on copy type:
- Linked Copy: Both scenes reference same objects and object data
- Full Copy: New scene has duplicate objects with duplicate object data

#### **Delete Scene** (🗑️)

**Function**: Deletes current scene data-block.

**Restriction**: Cannot delete last remaining scene in blend-file (Blender requires at least one scene).

**Warning**: Permanently removes scene and its specific settings. Linked objects remain in blend-file if used by other scenes.

### Scene Properties

**Location**: Properties Editor ‣ Scene Properties (film strip icon)

**Purpose**: Configure scene-specific settings.

#### **Scene Panel**

**Camera**:
- **Purpose**: Select active camera for rendering
- **Selector**: Dropdown of all cameras in scene
- **Shortcut**: Set active camera in 3D Viewport with **Ctrl+Numpad 0**
- **Rendering**: This camera used for final render
- **Viewport**: Numpad 0 views through this camera

**Background Scene**:
- **Purpose**: Use another scene as background
- **Behavior**: Background scene visible but not directly editable
- **Workflow**: Switch to background scene in Scene selector to edit its contents
- **Use Case**: Separate foreground and background work
- **Animation**: Background scene can have independent animation/physics
- **Recursion**: Background scenes can have their own backgrounds

**Typical Uses**:
- Environment as background, animated characters as foreground
- Static set as background, animated props as foreground
- Referenced scene from different blend-file (via linking)

**Tip**: Combine with Library Linking to reuse environments across multiple blend-files.

**Active Clip**:
- **Purpose**: Select Movie Clip for Motion Tracking
- **Selector**: Dropdown of loaded movie clips
- **Usage**: Motion Tracking Constraints reference this clip
- **Camera Background**: Can display as camera background image

#### **Units Panel**

**Purpose**: Configure measurement units for scene.

**Unit System**:
- **None**: Unitless numbers (same as Metric without unit names)
- **Metric**: Meters, centimeters, kilograms, etc.
- **Imperial**: Feet, inches, pounds, etc.

**Unit Scale**:
- **Purpose**: Scale factor between internal units and displayed values
- **Range**: 0.00001 to 100000
- **Default**: 1.0
- **Use Case**: Modeling at microscopic or astronomical scales
- **Note**: Display only, doesn't affect physics simulations

**Example**: Unit Scale 0.001 displays internal 1.0 as 1mm.

**Separate Units**:
- **Purpose**: Display properties as multiple values
- **Enabled**: 2.285m becomes "2m 28.5cm"
- **Disabled**: 2.285m stays as "2.285m"
- **Availability**: Metric and Imperial only

**Rotation**:
- **Degrees**: Standard 0-360° angles (default)
- **Radians**: Mathematical 0-2π angles

**Length / Mass / Time / Temperature**:
- **Adaptive**: Unit changes based on magnitude (23cm vs 10km)
- **Fixed Units**: Specific unit for all values (always meters, always feet, etc.)
- **Options**: See tables below

**Imperial Length Units**:

| Full Name | Short Name(s) | Scale (Meters) |
|-----------|---------------|----------------|
| thou | mil | 0.0000254 |
| inch | ", in | 0.0254 |
| foot, feet | ', ft | 0.3048 |
| yard | yd | 0.9144 |
| chain | ch | 20.1168 |
| furlong | fur | 201.168 |
| mile | mi, m | 1609.344 |

**Metric Length Units**:

| Full Name | Short Name(s) | Scale (Meters) |
|-----------|---------------|----------------|
| micrometer | um | 0.000001 |
| millimeter | mm | 0.001 |
| centimeter | cm | 0.01 |
| decimeter | dm | 0.1 |
| meter | m | 1.0 |
| dekameter | dam | 10.0 |
| hectometer | hm | 100.0 |
| kilometer | km | 1000.0 |

#### **Gravity Panel**

**Purpose**: Control global gravity for physics simulations.

**Settings**:
- X, Y, Z gravity values (default: 0, 0, -9.81 m/s²)
- Earth gravity: -9.81 m/s² on Z axis
- Custom gravity for different planets or artistic effect

**Affected Systems**:
- Rigid Body physics
- Soft Body physics
- Cloth simulation
- Fluid simulation
- Particle systems (when gravity enabled)

**See Also**: Physics documentation for simulation details.

#### **Simulation Panel**

**Purpose**: Define simulation frame range separate from scene range.

**Simulation Range**:
- **Enabled**: Simulation uses custom frame range
- **Disabled**: Simulation uses scene frame range

**Start / End**:
- Frame at which simulation begins/ends
- Override for Simulation Nodes
- Nodes without override use these values

**Use Case**: Simulate longer than rendered range, cache simulation separately.

#### **Keying Sets Panel**

**Purpose**: Manage Keying Sets for animation.

**See Also**: Animation Keying Sets documentation.

#### **Audio Panel**

**Purpose**: Control global audio settings for scene.

**Volume**:
- Master volume for scene (0.0 to 100.0)
- Affects all sounds in scene
- Separate from Blender's audio preferences

**Distance Model**:
- **Purpose**: Calculate sound attenuation based on distance
- **Options**:
  - **Inverse** (physically correct): Volume = 1 / distance
  - **Linear**: Volume decreases linearly with distance
  - **Exponential**: Rapid falloff with distance
  - **Clamped versions**: Limit volume to max 100% when closer than reference distance

**OpenAL Documentation**: See OpenAL docs for exact mathematical descriptions.

**Doppler Speed**:
- **Purpose**: Speed of sound for Doppler effect calculations
- **Default**: 343.3 m/s (air at 20°C)
- **Water**: ~1560 m/s
- **Real-World**: Set to match medium (air, water, etc.)

**Doppler Factor**:
- **Purpose**: Strength of Doppler pitch shifting
- **Range**: 0.0 to 100.0
- **1.0**: Physically correct
- **< 1.0**: Attenuated effect
- **> 1.0**: Exaggerated effect

**Update Animation Cache**:
- **Purpose**: Refresh audio animation cache
- **Use Case**: Fix audio artifacts or sync issues
- **Action**: Click button to rebuild cache

#### **Rigid Body World Panel**

**Purpose**: Configure rigid body physics simulation.

**Contents**: Settings for rigid body world including:
- Gravity and physics substeps
- Collision collections
- Cache settings
- Solver iterations

**See Also**: Rigid Body World documentation for detailed physics settings.

#### **Animation Panel**

**Purpose**: Control animation data for scene properties.

**Scene Selector**:
- Action: Which action stores scene animation
- Slot: Which slot within action
- Assignment: Manually assign actions and slots

**Use Case**: Animate scene properties like camera switching, render settings changes.

**See Also**: Animation Actions and Slots documentation.

#### **Custom Properties Panel**

**Purpose**: Create custom data storage in scene data-block.

**Features**:
- Add arbitrary properties
- Store numbers, strings, booleans
- Python API access
- Custom UI elements

**See Also**: Custom Properties documentation.

---

## Part 3: Objects

### Introduction

**Purpose**: Objects are the fundamental building blocks of 3D scenes.

**Scene Geometry**: Scenes are constructed from one or more objects (lights, shapes, cameras, armatures, etc.).

**Object Structure**:
Every Blender object consists of two parts:

**Object**:
- Position (location in 3D space)
- Rotation (orientation)
- Scale (size)
- Transform properties

**Object Data** ("ObData"):
- Geometry: vertices, edges, faces (meshes)
- Camera settings: focal length, sensor size, depth of field
- Light settings: type, color, intensity
- Curve control points, surface patches, etc.

**Data Sharing**:
- Multiple objects can share the same Object Data
- Example: 10 trees using same mesh data (instances)
- Editing shared data affects all objects using it
- Efficient for repeated elements

### Object Types

**Location**: 3D Viewport ‣ Add menu (Shift+A)

**Purpose**: Create new objects in the scene.

**Available Types**:

#### **Mesh**
- **Description**: Objects made of vertices, edges, and polygonal faces
- **Editing**: Extensive mesh editing tools available
- **Primitives**: Cube, Sphere, Cylinder, Cone, Torus, Plane, etc.
- **See Also**: Mesh Primitives documentation, [BLENDER_UI_INTERACTIVE_MESH_TOOLS.md](BLENDER_UI_INTERACTIVE_MESH_TOOLS.md)

#### **Curve**
- **Description**: Mathematically defined curves with control handles/points
- **Editing**: Manipulate handles to adjust curvature and length
- **Types**: Bezier curves, NURBS curves
- **Use Cases**: Paths, pipes, cables, organic shapes
- **See Also**: Curves Primitives documentation

#### **Surface**
- **Description**: Mathematically defined patches with control points
- **Editing**: NURBS surface manipulation
- **Use Cases**: Simple rounded forms, organic landscapes
- **See Also**: Surfaces Primitives documentation

#### **Metaball**
- **Description**: Objects defined by mathematical functions (implicit surfaces)
- **Geometry**: No vertices or control points, just 3D volume
- **Behavior**: Merge smoothly when near each other (liquid-like)
- **Use Cases**: Organic blobs, liquid effects, soft-body shapes
- **See Also**: Meta Primitives documentation

#### **Text**
- **Description**: 2D representation of text
- **Features**: Font support, extrusion, beveling
- **Use Cases**: Titles, logos, 3D text effects
- **Conversion**: Can convert to mesh for detailed editing

#### **Volume**
- **Description**: Container for OpenVDB volumetric data
- **Source**: External software or Blender's Fluid Simulator
- **Use Cases**: Smoke, fire, clouds, volumetric effects
- **Format**: OpenVDB file format

#### **Grease Pencil**
- **Description**: Objects created by drawing strokes
- **2D/3D**: 2D drawing in 3D space
- **Use Cases**: Animation, storyboarding, 2D/3D hybrid
- **See Also**: Grease Pencil Primitives documentation

#### **Armature**
- **Description**: Skeletal rig for character animation
- **Components**: Bones with parent-child relationships
- **Use Cases**: Character rigging, mechanical rigs, inverse kinematics
- **Workflow**: Create armature, add bones, skin mesh to bones

#### **Lattice**
- **Description**: Non-renderable wireframe deformation cage
- **Function**: Deforms other objects via Lattice Modifier
- **Use Cases**: Organic deformation, bend/twist operations
- **Rendering**: Invisible in final render

#### **Empty**
- **Description**: Null object with no geometry
- **Rendering**: Not rendered
- **Use Cases**: Transform nodes, parent objects, target objects, array centers
- **Display**: Various shapes for visual identification (arrows, spheres, etc.)

#### **Image (Empty Type)**
- **Description**: Empty that displays image in 3D Viewport
- **Use Cases**: Reference images, modeling guides, background plates
- **Features**: Image scaling, opacity control, viewport-only display

#### **Image Plane**
- **Description**: Mesh plane with material and texture from image file
- **Features**: Automatic aspect ratio calculation, ready-to-render
- **Use Cases**: Background images, photo references, viewport renders

#### **Light**
- **Description**: Light source objects for illumination
- **Types**: Point, Sun, Spot, Area
- **Use Cases**: Scene lighting, render illumination
- **Properties**: Color, intensity, shadows

#### **Light Probe**
- **Description**: EEVEE render engine lighting probes
- **Types**: Reflection, Irradiance Volume, Reflection Plane
- **Use Cases**: Indirect lighting, reflections, global illumination approximation

#### **Camera**
- **Description**: Virtual camera for rendering
- **Function**: Determines render output view
- **Settings**: Focal length, sensor size, depth of field, clipping
- **Rendering**: Scene rendered from active camera's viewpoint

#### **Speaker**
- **Description**: Audio source object
- **Function**: Positional audio in 3D space
- **Features**: Volume, pitch, distance attenuation
- **Use Cases**: Sound effects, ambient audio, directional sound

#### **Force Field**
- **Description**: Influences simulations with external forces
- **Types**: Wind, Vortex, Magnetic, Turbulence, etc.
- **Affected**: Particles, cloth, soft body, fluid
- **Representation**: Small control object in viewport

#### **Collection Instance**
- **Description**: Instance of entire collection
- **Function**: Display all objects from collection as single object
- **Use Cases**: Repeated complex assemblies, forest scatters, crowd duplication
- **Efficiency**: Shared data across all instances

### Common Object Options

**Available**: Adjust Last Operation panel after creating object

**Purpose**: Configure initial object properties immediately after creation.

**Type**:
- Change object type (available for some objects)
- Example: Change primitive mesh type

**Radius / Size**:
- Starting size of object
- Numeric input for precision

**Align**:
- **World**: Align to global space axes (default)
- **View**: Align to current viewport view
- **3D Cursor**: Match 3D cursor rotation

**Location**:
- X, Y, Z coordinates for object placement
- Default: 3D Cursor position
- Override for specific placement

**Rotation**:
- X, Y, Z rotation angles
- Override default orientation
- Applied after alignment

### Object Origin

**Purpose**: Each object has an origin point defining its position in 3D space.

**Visualization**:
- Small dot when object selected
- Origin location determines object's transform

**Transform Behavior**:
- Translation: Moves object relative to origin
- Rotation: Spins object around origin
- Scale: Expands/contracts from origin

**Origin Colors** (default theme):
- **Yellow**: Active object origin
- **Orange**: Selected (not active) object origin
- **White**: Unselected, unlinked object origin
- **Turquoise**: Linked object origin
- **Light Turquoise**: Selected linked object (not active)

**Note**: Colors customizable via theme preferences.

**See Also**: [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) for pivot point details.

#### **Set Origin**

**Location**: 3D Viewport ‣ Object ‣ Set Origin

**Purpose**: Move object origin and geometry relative to each other and 3D cursor.

**Operations**:

**Geometry to Origin**:
- **Effect**: Moves geometry to origin point
- **Result**: Origin becomes center of object
- **Geometry**: Shifts to origin location
- **Origin**: Stays in place

**Origin to Geometry**:
- **Effect**: Moves origin to center of geometry
- **Result**: Origin positioned at geometric center
- **Geometry**: Stays in place
- **Origin**: Moves to calculated center

**Origin to 3D Cursor**:
- **Effect**: Moves origin to 3D cursor position
- **Result**: Origin at cursor location
- **Geometry**: Stays in place
- **Use Case**: Custom origin placement

**Origin to Center of Mass**:
- **Effect**: Moves origin to calculated center of mass
- **Assumption**: Uniform density mesh
- **Result**: Origin at weighted center
- **Use Case**: Physics simulations, balanced rotation

**Center Options**:
- **Median Point Center**: Arithmetic center (average of all vertices)
- **Bounding Box Center**: Center of bounding box

**Tip: Direct Origin Transformation**:
Enable "Affect Only Origins" in Tool Settings to directly transform origin with G/R/S without moving geometry.

### Selecting Objects

**Purpose**: Select objects to perform operations on them.

**Selection Types**:
- Selected objects (orange)
- Active object (yellow)
- Unselected objects (black/gray)

**Selection Principle**: Most operations apply to all selected objects, with active object as reference.

#### **Selections and the Active Object**

**Selected Objects**:
- Multiple objects can be selected simultaneously
- Outlined in orange
- All selected objects affected by operations

**Active Object**:
- Last object selected or deselected
- Outlined in yellow
- Only one active object at a time
- Reference for many operations (parenting, linking, etc.)

**Changing Active Object**:
- **Shift+LMB**: Reselect object to make it active
- Doesn't change other selections

**Alt Modifier**:
- Hold **Alt** when confirming operations
- Applies operation to all selected objects
- Useful for batch operations

#### **Select Menu**

**Location**: 3D Viewport ‣ Select menu

**Purpose**: Various selection operations and filters.

##### **All** (A)
- Select all selectable objects in scene
- Doesn't affect hidden or disabled objects

##### **None** (Alt+A)
- Deselect all objects
- Active object remains unchanged (still yellow)

##### **Invert** (Ctrl+I)
- Toggle selection state of all visible objects
- Selected become unselected, unselected become selected

##### **Box Select** (B)
- Interactive rectangular selection
- Drag box around objects to select
- Click outside box to finish

##### **Circle Select** (C)
- Interactive circular selection
- Move circle over objects to select
- Scroll wheel adjusts circle size
- MMB or RMB to finish

##### **Lasso Select** (Ctrl+Alt+LMB)
- Freehand selection
- Draw around objects to select
- Release to confirm selection

##### **Select Active Camera**
- Selects scene's active camera
- Useful in complex scenes with multiple cameras

##### **Select Mirror**
- Select mirrored objects based on names
- Example: "sword.L" selects "sword.R"
- Naming convention: .L and .R suffixes

##### **Select Random**
- Randomly select unselected objects
- Probability percentage in Adjust Last Operation
- Note: Percentage is likelihood per object, not percentage of total

##### **Select More/Less** (Ctrl+NumpadPlus / Ctrl+NumpadMinus)

**Purpose**: Expand/contract selection based on hierarchy.

**More**: Expand to immediate parents and children
**Less**: Contract by deselecting boundary objects
**Parent**: Deselect current, select immediate parents
**Child**: Deselect current, select immediate children
**Extend Parent**: Add immediate parents to selection
**Extend Child**: Add immediate children to selection

##### **Select All by Type**

**Purpose**: Select all objects of specific type.

**Available Types**: All object types (Mesh, Curve, Light, Camera, etc.)

**Use Case**: Quick isolation of specific object categories.

##### **Select Grouped** (Shift+G)

**Purpose**: Select objects related to active object.

**Options**:

**Children**: All hierarchical descendants
**Immediate Children**: Direct children only
**Parent**: Parent of active object
**Siblings**: Objects with same parent (includes root-level if no parent)
**Type**: Objects of same type
**Collection**: Objects in same collection (list if multiple)
**Object Hooks**: Hooks belonging to active object
**Pass**: Objects in same render pass
**Color**: Objects with same Object Color
**Keying Set**: Objects in active Keying Set
**Light Type**: Matching light types

##### **Select Linked** (Shift+L)

**Purpose**: Select objects sharing common data-block with active object.

**Options**:

**Object Data**: Objects using same Object Data (same mesh, curve, etc.)
**Material**: Objects using same material
**Instanced Collection**: Objects linked to same collection instance
**Texture**: Objects using same texture
**Particle System**: Objects using same particle system
**Library**: Objects from same library
**Library (Object Data)**: Objects from same library, limited to Object Data

##### **Select Pattern**

**Purpose**: Select elements by name pattern matching.

**Wildcards**:
- `*`: Matches everything (house* = house, houseboat, housing)
- `?`: Matches single character (hou?e = house, houle, houge)
- `[abc]`: Matches a, b, or c
- `[!abc]`: Matches any character except a, b, or c

**Case Sensitive**: Optional case-sensitive matching

**Extend**: Add to current selection instead of replacing

**Examples**:
- `*house*`: Any name containing "house"
- `floor*`: Names starting with "floor"
- `Cube.0??`: Cube.001 through Cube.099

---

## Editing Objects Overview

**Purpose**: Modify, transform, and manipulate objects after creation.

**Common Operations**:
- **Transform**: Move, Rotate, Scale (see [BLENDER_UI_PROPORTIONAL_EDITING.md](BLENDER_UI_PROPORTIONAL_EDITING.md))
- **Mirror**: Create mirrored duplicates
- **Clear**: Reset transform values
- **Apply**: Bake transforms into geometry
- **Snap**: Align to grid or other objects (see [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md))
- **Duplicate**: Create copies
- **Join**: Merge multiple objects
- **Parent**: Create hierarchies
- **Modifiers**: Non-destructive modifications
- **Constraints**: Limit or link transforms

**Detailed Documentation**: Each operation has comprehensive documentation in dedicated files. See Related Documentation section below.

---

## Best Practices and Workflows

### Image Editor Workflows

**Texture Review**:
1. Load texture in Image Editor
2. Check histogram for tonal distribution
3. Use waveform to verify exposure consistency
4. Check vectorscope for color palette analysis
5. Sample specific pixels for technical verification

**Render Comparison**:
1. Render to Slot 1
2. Adjust lighting
3. Render to Slot 2
4. Press J to compare renders
5. Select best result or iterate

**Compositor Preview**:
1. Set up compositor nodes
2. Connect output to Viewer Node
3. Select "Viewer Node" in Image Editor
4. Real-time preview of compositing
5. Iterate without rendering

### Scene Organization

**Multi-Shot Project**:
1. Create scene for each shot (Shot_01, Shot_02, etc.)
2. Animate each shot independently
3. Create master scene with Video Sequencer
4. Add scene strips for all shots
5. Sequence and render

**Lighting Variations**:
1. Create base scene with geometry
2. Linked Copy scene for first lighting setup
3. Linked Copy for second lighting setup
4. Modify lights independently
5. Compare renders between scenes

**Asset Library**:
1. Create scene with reusable setup (lighting rig, camera framing)
2. Mark scene as asset
3. Save to asset library location
4. Drag into new projects as needed

### Object Management

**Efficient Instancing**:
1. Create single detailed object
2. Use Collection Instance for repeated elements
3. All instances share same data
4. Edit original to update all instances

**Hierarchical Animation**:
1. Create parent empty for control
2. Parent all related objects
3. Animate parent for coordinated movement
4. Animate children for local movement

**Selection Workflow**:
1. Use Select by Type to isolate object categories
2. Use Select Grouped for related objects
3. Use Select Pattern for naming-convention-based selection
4. Shift+G for quick hierarchical selection

---

## Related Documentation

For comprehensive coverage of related topics:

**Viewport and Transform**:
- [BLENDER_UI_3D_VIEWPORT.md](BLENDER_UI_3D_VIEWPORT.md) - Viewport interface and navigation
- [BLENDER_UI_VIEWPORT_CONTROLS.md](BLENDER_UI_VIEWPORT_CONTROLS.md) - Advanced viewport controls
- [BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md](BLENDER_UI_PIVOT_POINTS_AND_SNAPPING.md) - Snapping and pivot systems
- [BLENDER_UI_PROPORTIONAL_EDITING.md](BLENDER_UI_PROPORTIONAL_EDITING.md) - Proportional transform

**Mesh and Modeling**:
- [BLENDER_UI_INTERACTIVE_MESH_TOOLS.md](BLENDER_UI_INTERACTIVE_MESH_TOOLS.md) - Interactive mesh creation
- [BLENDER_UI_SELECTING.md](BLENDER_UI_SELECTING.md) - Selection methods
- [BLENDER_UI_OPERATORS.md](BLENDER_UI_OPERATORS.md) - Operator system

**Other Systems**:
- [BLENDER_UI_ANNOTATIONS.md](BLENDER_UI_ANNOTATIONS.md) - Annotation system
- [BLENDER_UI_TOOL_SYSTEM.md](BLENDER_UI_TOOL_SYSTEM.md) - Tool system and toolbar
