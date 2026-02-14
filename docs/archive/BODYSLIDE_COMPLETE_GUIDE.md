# Bodyslide Guide for Fallout 4

## Overview

Bodyslide is an essential tool for customizing body shapes and proportions in Fallout 4. It allows you to apply preset body shapes to individual outfits, armor, and your base character. This guide covers installation, usage, and troubleshooting.

**Guide Author**: Lindeboombier (attributed with permission)
**Last Updated**: June 2025

---

## What You'll Need

To use Bodyslide effectively, you'll need these components:

### Required Files (5-6 items)

1. **Bodyslide Program** - The main application
   - Nexus Mods: https://www.nexusmods.com/fallout4/mods/25
   - Download via Vortex for easy management

2. **Body Texture/Model** - Base body to customize
   - **Recommended**: CBBE (Caliente's Beautiful Bodies Edition)
   - Nexus Mods: https://www.nexusmods.com/fallout4/mods/15
   - Works with most presets and clothing mods

3. **Bodyslide Preset** - Shape configuration file
   - Nexus Mods: https://www.nexusmods.com/fallout4/mods/15734
   - Or create your own (advanced, more time-intensive)

4. **Clothing Mod with Bodyslide Support** - The outfit to customize
   - Example: Gunner Operator (https://www.nexusmods.com/fallout4/mods/44863)
   - Must have native Bodyslide support

5. **Bodyslide Patch** (if needed) - Converts unsupported outfits
   - Example: Bodyslide for Gunner (https://www.nexusmods.com/fallout4/mods/45027)
   - Only needed if outfit doesn't include Bodyslide support

---

## Installation

### Installation Paths (Important!)

Bodyslide installs to specific locations depending on your game:

- **Fallout 4**: `<game folder>/Data/Tools/BodySlide`
- **Skyrim/Skyrim SE**: `<game folder>/Data/CalienteTools/BodySlide`

These paths are used by default and make installing addons easier. When setting up shortcuts in mod managers, always point to the **real game folder** (Steam installation), not the mod manager's virtual folders.

### Method 1: Vortex Mod Manager (Recommended)

We recommend managing all Bodyslide files through Vortex for easier organization and updates.

**Download in this order:**
1. Bodyslide program
2. CBBE body mod
3. Bodyslide preset(s)
4. Your desired clothing mod(s)
5. Any required Bodyslide patches

**Installation Steps:**

1. **Download and Install**
   - Install Bodyslide archive to Vortex like any other mod
   - Enable the mod

2. **Deploy Mods**
   - Click "Deploy Mods" toolbar button in the "Mods" section
   - Ensure Vortex deploys correctly

3. **Add Tool to Vortex**
   - Go to Vortex dashboard
   - Click "Add Tool"
   - In the "Target" field, browse to `BodySlide x64.exe`
   - **Critical**: Choose from your game's real data folder, NOT Vortex mods folder
     - For FO4: `<game folder>/Data/Tools/BodySlide/BodySlide x64.exe`
     - For Skyrim: `<game folder>/Data/CalienteTools/BodySlide/BodySlide x64.exe`

4. **Install Addons**
   - Install body mods, presets, and outfit patches to Vortex as well
   - Enable all required mods

5. **Launch Bodyslide**
   - Open Vortex dashboard
   - Scroll to **Tools** section
   - Look for **"Bodyslide"** option
   - Click the icon to launch

### Method 2: Mod Organizer 2

**Installation Steps:**

1. **Download and Install**
   - Download Bodyslide archive
   - Install to MO2 like any other mod
   - Enable the mod

2. **Add Shortcut**
   - Go to MO2's "Data" tab
   - Find `BodySlide x64.exe`
   - Add shortcut to run from game's real data folder
   - **Critical**: Point to real game folder, NOT MO mods folder
     - For FO4: `<game folder>/Data/Tools/BodySlide/BodySlide x64.exe`
     - For Skyrim: `<game folder>/Data/CalienteTools/BodySlide/BodySlide x64.exe`

3. **Install Addons**
   - Install body mods, presets, and outfits to MO2
   - Enable all required mods

4. **Launch Bodyslide**
   - Use the shortcut you created in MO2
   - Bodyslide will launch with MO2's virtual file system

### Method 3: Manual Installation (Advanced)

**Not recommended**, but possible:

1. Download Bodyslide archive
2. Extract to game installation's "Data" folder using 7-Zip
3. Verify folder structure is correct (see Installation Paths above)
4. Launch executable from the installation folder

### Initial Setup

On first launch, Bodyslide will display a **Target Game** dialog.

**Steps:**
1. Select the "Data" folder of your game (Fallout 4)
2. Games found in registry will auto-fill paths
3. Click continue

**Note**: You can only choose one target game at a time. This can be changed later in Settings.

The program is now ready to use!

### Installation Troubleshooting

**Issue: Bodyslide not appearing in Vortex Tools**
- Ensure you deployed mods correctly
- Verify Bodyslide mod is enabled
- Check that executable path points to real game folder

**Issue: "Game not found" or path errors**
- Verify game is properly installed via Steam/GOG
- Check that you selected the correct "Data" folder
- For Vortex/MO2: Confirm shortcut points to real game folder, not mod manager folders

**Issue: Body mod not matching game version**
- Download CBBE SE for Skyrim SE/AE (not CBBE LE)
- Download FO4 version for Fallout 4
- Verify game version on Nexus mod page

**Issue: Other mods not working**
- If using Vortex/MO2, first confirm other mods work in-game
- This indicates your mod manager is set up correctly
- Then troubleshoot Bodyslide specifically

---

## Understanding the Bodyslide Interface

When you open Bodyslide, you'll see a screen with many sliders and options. Don't be overwhelmed—here are the 5 key areas:

### 1. Preset Selector
**Location**: Top area with dropdown menu

- Contains all saved and installed presets
- Click to open dropdown and select your desired body preset
- Selection automatically adjusts all sliders to match the preset
- Examples: "Jossie CBBE Body", custom presets you've created

### 2. Outfit Selector
**Location**: Second dropdown menu

- Choose specific outfit/body to customize
- Allows you to adjust individual items without affecting everything
- Examples: Gunner outfit, Vault Suit, base body (nude)
- Leave blank to affect all outfits

### 3. Batch Build
**Location**: Left section with checkboxes

- Applies a preset to ALL outfits that support Bodyslide
- **Critical**: Ensure "Build Morphs" is checked
- Also check: "Build Meshes\Actors\Characters..." path
- Saves time when customizing multiple outfits at once

### 4. Preview
**Location**: Right side of interface

- Shows current outfit with current preset applied
- Visual reference for how it looks in-game
- **Important Note**: Preview often shows larger proportions than actual in-game result (take with grain of salt)
- Useful for quick confirmation before building

### 5. Build
**Location**: Right side buttons

- Builds ONLY the current selected outfit with current preset
- Use for individual outfit adjustments
- Faster than batch build when customizing specific items

---

## Basic Workflow: Building Your First Preset

### Example: Gunner Operator Outfit with Jossie CBBE Body

1. **Launch Bodyslide** from Vortex

2. **Select Preset**
   - Click preset dropdown (area 1)
   - Select "Jossie CBBE Body" (or your preferred preset)

3. **Select Outfit**
   - Click outfit dropdown (area 2)
   - Select "Gunner Operator CBBE Body"

4. **Preview (Optional)**
   - Click Preview to see result
   - Adjust appearance if needed using sliders

5. **Batch Build**
   - Click **Batch Build** button
   - Popup will appear asking what to build
   - Leave all checkboxes marked (default)
   - Click **Build**

6. **Confirmation**
   - After a few seconds, completion popup appears
   - Now in-game: Gunner outfit will have Jossie preset shape
   - Nude body will also match the preset

### That's It!
Your clothing mod now has your custom body shape applied.

---

## Understanding Sliders and Body Customization

### Slider Categories

Bodyslide provides dozens of sliders organized into several categories. Understanding these will help you create custom body shapes.

#### Fat Distribution Sliders
- Control where fat accumulates on the body
- Range: 0-100% (adjustable per slider)
- Examples:
  - Belly/Abdomen fat
  - Thigh fat
  - Arm fat
  - Breast size/shape

#### Muscle Definition Sliders
- Control muscle tone and definition
- Range: 0-100% (adjustable per slider)
- Examples:
  - Arm muscle definition
  - Leg muscle tone
  - Abdominal muscle visibility
  - Back muscle definition

#### Bone Structure Sliders
- Adjust skeletal frame and proportions
- Affects overall body shape
- Examples:
  - Shoulder width
  - Hip width
  - Rib cage size
  - Height/proportions (varies by preset)

#### Individual Body Part Settings
- Fine-tune specific body parts
- Located in Body Part Settings panel
- Allows precise adjustments to:
  - Breast shape, size, position
  - Buttocks shape and size
  - Limb length and thickness
  - Torso proportions

### Using Preset Bodies as Starting Points

**Recommended Workflow**:

1. **Start with a Preset**
   - Browse available presets in dropdown
   - Select one that's close to your desired look
   - Don't start from scratch—saves time

2. **Make Incremental Adjustments**
   - Adjust sliders in small increments (5-10% at a time)
   - Preview changes after each major adjustment
   - Fine-tune using Body Part Settings panel

3. **Save Your Custom Preset**
   - Click "Save As" button
   - Give your preset a unique name
   - Your custom preset will appear in dropdown for future use

4. **Test In-Game**
   - Build your custom preset
   - Load game to verify appearance
   - Adjust and rebuild if needed

### Slider Tips

**Best Practices**:
- ✓ Make changes gradually (avoid extreme values initially)
- ✓ Preview frequently to see cumulative effects
- ✓ Remember: Preview shows larger proportions than in-game
- ✓ Save variations as different presets for comparison
- ✓ Use symmetry when adjusting (both arms, both legs, etc.)

**Common Mistakes**:
- ✗ Maxing out all sliders (creates unrealistic proportions)
- ✗ Ignoring bone structure (affects how clothing fits)
- ✗ Not testing in-game before finalizing
- ✗ Forgetting to save custom presets

### Body Part Settings Panel

The Body Part Settings panel provides advanced control over individual body parts.

**Access**: Usually located on the right side of the Bodyslide interface

**Key Features**:
- **Individual Part Selection**: Click on specific body part to edit
- **Shape Adjustments**: Modify curvature, angles, positioning
- **Size Scaling**: Adjust size independently from sliders
- **Symmetry Toggle**: Mirror changes to both sides

**Example Use Cases**:
- Adjust breast positioning without changing size
- Fine-tune muscle definition in specific areas
- Correct asymmetry in body shape
- Create unique body characteristics

---

## Advanced Configuration

### Pro Tip: Separate Clothed vs. Nude Body

Many users apply different presets for clothing vs. nude bodies to look more natural in-game.

**Process**:

1. **Batch Build Everything First**
   - Select your main preset (e.g., "Jossie CBBE Body")
   - Click Batch Build
   - This applies to all outfits

2. **Build Nude Body Separately**
   - Select outfit: "CBBE Body Physics" or "CBBE Body (Nude)"
   - Change preset to nude variant (e.g., "Jossie CBBE Body (Nude)")
   - Click regular **Build** (not batch)
   - This overrides just the nude body

**Result**: Clothing looks one way, base body looks different—more natural appearance in-game

---

## Important Notes & Best Practices

### 1. Naked vs. Clothed Bodies
- Personally batch build everything in one go for consistency
- Then go back and solo build a "nude" preset variant
- Makes the transition between clothed/naked more natural looking

### 2. Outfit Conflicts
**Scenario**: Two mods modify the same clothing (e.g., Classy Chassis Outfits + CBBE body)

**What Happens**:
- Batch build will ask which version you want to use
- Simply select the one you prefer
- Won't cause in-game problems—only one version will be active

**Example**: Choose between "Outfit A CBBE" or "Outfit B CBBE"

### 3. Essential Checkboxes
**Always verify these are checked before building**:
- ✓ "Build Morphs" - Creates the shape morphs
- ✓ "Build Meshes\Actors\Characters..." - Applies to character meshes
- These ensure the preset is properly applied

---

## Troubleshooting

### Issue: Texture/Skin Problems on Clothed Bodies

**Symptoms**: Body looks fine naked, but skin texture breaks when wearing clothes

**Possible Causes & Solutions**:

#### 1. Body-Outfit Mismatch
- **Problem**: Outfit designed for different body (e.g., CBBE outfit on Zex-Fusion Girl body)
- **Solution**: Use matching body and outfit combination
- **Result**: Skin becomes weird or invisible with wrong pairing

#### 2. Missing Body Mod
- **Problem**: Clothing mod requires a body mod you haven't installed
- **Solution**: Install the required body mod (usually CBBE or similar)
- **Check**: Mod page requirements section

#### 3. Race Mod Incompatibility
- **Problem**: Race mod (e.g., IKAROS-Androids) not patched for your clothes
- **Solution**: Find/install patches for that race + clothing combo
- **Where**: Check Nexus mod page "Mods requiring this file" section
- **Note**: Different race mods need separate patches for each clothing type

#### 4. Corrupted Installation
- **Problem**: Files got corrupted during installation
- **Solution**: Uninstall and reinstall the outfit mod completely
- **Vortex**: Simply uninstall via Vortex and re-download

#### 5. Unsupported Clothing Mod
- **Problem**: Clothing doesn't have Bodyslide support built-in
- **Solution**: Look for fan-made Bodyslide patch on Nexus
- **Where**: Original mod page → "Mods requiring this file" section
- **Note**: This usually won't cause texture issues, just shape won't change

### Issue: Bodyslide Program Won't Launch

**Solutions**:
1. Ensure you downloaded the Bodyslide program mod (not just preset)
2. Verify Fallout 4 is selected during initial setup
3. Reinstall Bodyslide through Vortex
4. Check Vortex Tools section—refresh if needed

### Issue: Preset Not Showing in Dropdown

**Solutions**:
1. Ensure preset mod is properly installed via Vortex
2. Restart Bodyslide
3. Check preset naming—verify it matches what Bodyslide expects
4. Clear Bodyslide cache and restart (advanced)

### Issue: Changes Not Appearing In-Game

**Solutions**:
1. Verify "Build Morphs" is checked ✓
2. Verify "Build Meshes\Actors\Characters..." is checked ✓
3. Ensure you clicked Build (not just Preview)
4. Wait for completion popup
5. Restart game completely (not just reload save)
6. Check that clothing mod is enabled in Vortex and in-game

---

## Recommended Workflow Summary

### Quick Start (5 minutes)
1. Open Bodyslide from Vortex
2. Select preset (e.g., "Jossie CBBE Body")
3. Select outfit (or leave blank for all)
4. Click Batch Build
5. Confirm build
6. Done!

### Optimized Workflow (15 minutes)
1. Batch build with main preset on everything
2. Solo build nude body with nude preset variant
3. Check preview for any conflicts
4. Launch game to verify in-game appearance
5. Adjust sliders and rebuild if needed

### Advanced Workflow (with customization)
1. Batch build with main preset
2. Solo build specific outfits you want different
3. Solo build nude body variant
4. Create custom presets by adjusting sliders
5. Save custom presets for future use

---

## Bodyslide Settings Reference

Understanding the various settings available in Bodyslide helps you create more precise customizations.

### Main Settings Overview

| Setting Category | Description | Range/Options |
|-----------------|-------------|---------------|
| **Body Part Settings** | Adjusts shape and size of individual body parts | Varies by body part |
| **Fat Settings** | Controls distribution of fat across the body | 0-100% per area |
| **Muscle Settings** | Controls muscle definition and tone | 0-100% per muscle group |
| **Bone Settings** | Adjusts skeletal structure and frame | Varies by bone/joint |
| **Skin Settings** | Texture and skin tone (preset-dependent) | Varies by preset |

### Detailed Slider Categories

#### Fat Distribution
- **Belly Fat**: Abdomen and stomach area
- **Breast Fat**: Affects breast size and fullness
- **Buttocks Fat**: Affects size and shape
- **Thigh Fat**: Upper and lower thigh distribution
- **Arm Fat**: Upper arm distribution
- **Overall Weight**: General body fat percentage

#### Muscle Definition
- **Arm Muscles**: Biceps, triceps, forearm definition
- **Leg Muscles**: Quadriceps, calves, hamstrings
- **Abdominal Muscles**: Six-pack visibility and tone
- **Back Muscles**: Lat definition and back width
- **Chest Muscles**: Pectoral definition (depending on preset)

#### Structural Settings
- **Shoulder Width**: Broadness of shoulder frame
- **Hip Width**: Pelvic bone width
- **Waist Size**: Waist circumference
- **Torso Length**: Upper body proportions
- **Limb Length**: Arm and leg length proportions

### Preset-Specific Options

Different body presets may include unique sliders:
- **Breast Shape Options**: Perkiness, positioning, separation
- **Buttocks Shape Options**: Lift, roundness, projection
- **Advanced Muscle Options**: Individual muscle groups
- **Asymmetry Options**: Left/right side differences (some presets)

---

## Bodyslide Settings and Configuration

Access settings from the main BodySlide window (Settings button or menu).

### Game Settings

#### Target Game
- **Purpose**: Specifies which game you're using BodySlide/Outfit Studio for
- **Options**: Fallout 4, Skyrim, Skyrim SE, Fallout 76, etc.
- **Effect**: Changing this adjusts game data path and reference skeleton automatically
- **Note**: Only one target game can be active at a time

#### Game Data Path
- **Purpose**: Points to the "Data" folder of your active game
- **Default**:
  - Fallout 4: `<game folder>/Data`
  - Skyrim: `<game folder>/Data`
- **Usage**: Program loads resources from this path and builds output files here
- **Important**: Must be correct for BodySlide to find outfits and build files properly

#### Advanced: Output Path (Optional)
- **Purpose**: Override where built files are saved
- **Use Case**: Separate resource loading from build output location
- **Example**: Load from game Data folder, build to custom testing folder
- **Leave Empty**: If you want to use default game data path

#### Advanced: Project Path (Optional)
- **Purpose**: Override where BodySlide projects are loaded from
- **Default**: Uses executable's directory if empty
- **Use Case**: Share projects across multiple installations

### General Settings

#### Override Warning
- **Purpose**: Controls batch build conflict dialog
- **Enabled**: Shows selection dialog when multiple projects override same files
- **Disabled**: Silently uses first/last project (depending on order)
- **Recommendation**: Keep enabled to avoid accidental overwrites

#### BSA Textures
- **Purpose**: Scan BSA/BA2 archives for textures in preview windows
- **Enabled**: Reads textures from game archives
- **Disabled**: Only uses loose files
- **Performance**: Disable for faster loading if you have loose texture files

#### Language
- **Purpose**: Change BodySlide's interface language
- **Requirements**: Translation files must exist
- **Options**: English, German, French, Russian, etc. (if available)

#### Data Files
- **Purpose**: Select which BSA/BA2 archives to scan for resources
- **Resources**: Material files, texture files, meshes
- **Performance Tip**: Disable archives containing only sound files
- **Recommendation**: Keep selection minimal for better performance

### Rendering Settings

#### Background Color
- **Purpose**: Set background color for preview windows
- **Applies To**: Both BodySlide and Outfit Studio
- **Use Case**: Personal preference or better contrast with body meshes

### Advanced Configuration (Config.xml)

Some settings are only accessible by editing the `Config.xml` file directly.

**Location**: Same folder as BodySlide executable

#### SliderMinimum and SliderMaximum
- **Purpose**: Extend slider range beyond default 0-100
- **Use Case**: Experiment with extreme values
- **Warning**: Clipping likely outside 0-100 range—not officially supported!
- **Example**: Set to -50 and 150 for extended range

---

## Conversion References Workflow

### What are Conversion References?

**Conversion references** allow you to convert outfits from one body type to another using Outfit Studio. They consist of sliders that morph a mesh from one shape to another.

The mesh provided with the conversion reference is the **reference shape**. Other meshes can be conformed to these sliders so they morph along with the reference.

**Example Use Case**: Convert an outfit from Vanilla body to CBBE body (slider 0% → 100%)

### Loading Conversion References

**Method 1: Using Templates**
1. Choose **File → Load Reference**
2. Select your reference from the **Template** dropdown
3. Templates are defined in `RefTemplates.xml` and point to installed projects

**Method 2: Manual Selection**
1. Choose **File → Load Reference**
2. Browse to the project file (`.osp`) manually
3. Only one shape can be the reference at a time

**Note**: NIF files can be loaded as references but don't have sliders, so they're not useful for conversions.

### Bridge Conversions

If no direct conversion reference exists from source to target, use intermediate shapes as "bridges":

- **A → B → C**: Convert twice through an intermediate shape
- **Example**: Vanilla → CBBE → Custom Body

### Step-by-Step Conversion Tutorial

Follow these steps to convert meshes from one body type to another:

#### Step 1: Create New Project
1. Click **New Project** button or use menu item
2. Select the reference template you need (e.g., "Vanilla to CBBE")
3. Click **Next**

#### Step 2: Load Outfit
1. Choose the outfit/mesh file to convert (e.g., `outfit.nif`)
2. Click **Next**
3. **For Skyrim**: High weight variants have `_1` suffix
4. **Other games** (FO3, FO4): No weight variants

#### Step 3: Clean Up
1. Delete duplicate body shapes loaded with the outfit
2. Select the shape and press **DEL** key
3. Or right-click → **Delete Shape**
4. This prevents duplicate body exports

#### Step 4: Conform to Reference
1. Use **Slider → Conform All** menu
2. All shapes will conform to reference sliders
3. Selected shape doesn't matter—everything conforms

#### Step 5: Set Base Shape
1. Change the conversion slider to **100%**
2. Use **Slider → Set Base Shape**
3. This makes 100% slider value the default shape
4. **Note**: Clipping at this stage is normal and will be fixed later

#### Step 6: Load Target Reference
1. Use **File → Load Reference**
2. Select the target body template/project (e.g., "CBBE Body")
3. Or choose the `.nif` file of target body
4. This loads the mesh you'll actually use in-game

#### Step 7: Fix Clipping
1. Select outfit shapes to adjust
2. Use brush tools to fix clipping and make tweaks
3. This edits base shapes, not slider morphs
4. See **Brushes** section for tool details

#### Step 8: Copy Bone Weights
1. Multi-select all outfit shapes in the list
2. Right-click → **Copy Bone Weights**
3. This ensures proper animation in-game

#### Step 9: Export
1. Use **File → Export → To NIF With Reference**
2. **For Skyrim**: Replace high weight variant (`_1.nif`)
3. Then repeat entire process for low weight variant (`_0.nif`)

---

## Creating BodySlide Projects

### What are BodySlide Projects?

BodySlide projects contain outfits or bodies with sliders for customization. They can be:
- Selected from a list in BodySlide
- Built straight into the game's data folder
- Customized with presets

**Requirements**: Outfit must already be converted to the base shape of the body/reference (e.g., CBBE base shape).

### Project Files Structure

Projects consist of multiple files in specific folders:

```
BodySlide/
├── SliderSets/
│   └── YourProject.osp          (can contain multiple projects)
├── ShapeData/
│   └── YourProject/
│       ├── YourProject.osd       (slider data)
│       └── YourProject.nif       (meshes)
└── SliderGroups/
    └── YourGroups.xml            (optional grouping)
```

**Share these files** with users maintaining the folder structure shown above.

### Step-by-Step Project Creation

#### Step 1: Create New Project
1. Click **New Project** button
2. Select conversion reference, template, or project file with needed sliders
3. **Example**: "CBBE Body"
4. Click **Next**

#### Step 2: Load Outfit
1. Choose outfit/mesh file (e.g., `outfit.nif`)
2. Click **Next**
3. **For Skyrim**: High weight variants have `_1` suffix
4. **Other games**: No weight variants

#### Step 3: Clean Up Duplicates
1. Delete duplicate body shape if present
2. Select shape → Press **DEL**
3. Or right-click → **Delete Shape**

#### Step 4: Fix Base Shape Clipping
1. Select outfit shape to adjust
2. Use brush tools to fix clipping
3. Make any desired tweaks
4. This edits base shapes, not slider morphs
5. See **Brushes** and **Tools** pages for details

#### Step 5: Conform to Sliders
1. Use **Slider → Conform All**
2. All outfit shapes conform to reference sliders
3. Selected shape doesn't matter

#### Step 6: Fix Slider Clipping (Optional but Recommended)
1. Select shape needing fixes
2. Click **Edit** button next to slider
3. Brush on the selected shape to fix clipping
4. **Important Rules**:
   - Only edit one slider at a time
   - Can edit multiple shapes with same slider
   - Edit outfit shapes, NOT body/reference
   - Extreme sliders might be hard to perfect

#### Step 7: Copy Bone Weights
1. Multi-select all outfit shapes
2. Right-click → **Copy Bone Weights**
3. Ensures correct animation in-game

#### Step 8: Save Project
1. Open **File → Save Project As...**
2. Fill out all text fields
3. **Read tooltips carefully** when hovering over fields
4. Project becomes immediately available in BodySlide
5. See **Saving a Project** page for details

#### Step 9: Set Up Groups
1. Open group manager (top-right of BodySlide frame)
2. Add outfit to appropriate groups
3. This makes presets available for selection
4. Groups enable easy batch building
5. **Important**: Add outfit to master group (e.g., "CBBE") too
6. Save groups to XML file in `SliderGroups` folder

#### Step 10: Share Your Work
1. Package the files shown in structure above
2. Maintain correct folder structure
3. Users can drop into their BodySlide folder

---

## Copying Bone Weights

### What are Bone Weights?

**Bone weights** tell the game engine which parts of a mesh move with specific bones during animations. They consist of:
- **Vertex assignment**: Which vertices are affected by which bones
- **Weight factor**: How strongly each vertex is affected (0.0 to 1.0)

Proper bone weights are essential for correct in-game animation and movement.

### When to Copy Bone Weights

Copy bone weights when:
- Converting outfits to new body types
- Creating new armor pieces
- Fixing animation issues
- Matching movement with body mesh

### Step-by-Step Weight Copying

#### Step 1: Create New Project
1. Launch Outfit Studio
2. Click **New Project**

#### Step 2: Load Reference
1. Choose NIF file or reference template with needed weights
2. This is typically a body mesh
3. Click **Next**

#### Step 3: Load Target Outfit
1. Select outfit/mesh to copy weights TO
2. Click **Finish**

#### Step 4: Select Shapes
1. Multi-select all shapes needing weight copy
2. Use **CTRL** to multi-select in the shape list

#### Step 5: Choose Method

**Method A: Copy All Bones (Simple)**
1. Use **Shape → Copy Bone Weights** menu
2. All bones copied automatically

**Method B: Copy Selected Bones (Advanced)**
1. Switch to **Bones** tab
2. Select specific bones with **CTRL** multi-select
3. Use **Shape → Copy Selected Weights** menu
4. More control over which bones are copied

#### Step 6: Configure Copy Settings
1. Weight copy settings dialog appears
2. Default settings work for most cases
3. Customize if needed (see **Weight Copy Options** page)

#### Step 7: Export or Save
1. **For standalone mesh**: Use **File → Export → To NIF**
2. **For BodySlide project**: Save the project instead

---

## Adding Zaps to Projects

### What are Zaps?

**Zaps** are special toggles that remove parts of meshes during BodySlide builds:

- Appear as **sliders** in Outfit Studio
- Appear as **checkboxes** in BodySlide
- Remove predefined parts when enabled
- Can be visible or hidden from users

### Common Uses for Zaps

1. **Optional parts**: Hoods, sleeves, accessories
2. **Body part removal**: Prevent clipping by removing hidden body parts
3. **Variations**: Different versions of same outfit
4. **Hidden cleanup**: Auto-remove conflicting geometry

**Note**: In Outfit Studio, zaps only move mesh around. Only BodySlide actually deletes the zapped parts during preview and builds.

### Step-by-Step Zap Creation

#### Prerequisites
- Working BodySlide project loaded
- Knowledge of mask brush usage

#### Step 1: Load Project
1. Launch Outfit Studio
2. Load or create the project

#### Step 2: Select Mask Brush
1. Click **Mask Brush** in toolbar
2. The mask tool is essential for zap creation

#### Step 3: Mask Protected Areas
1. **Mask = what STAYS** (not deleted)
2. **Unmasked = what GETS ZAPPED** (deleted)
3. Brush on areas to protect from zapping
4. **To invert**: Use **Tool → Invert Mask** menu

#### Step 4: Create Zap Slider
1. Use **Slider → New Zap Slider** menu
2. Name the slider appropriately
3. Zap created for all selected shapes
4. Unmasked areas will be zapped in BodySlide

#### Step 5: Refine Zap (Optional)
1. Enter edit mode of the zap
2. Use any brush to define more zap areas
3. Anything affected by slider = zapped later

#### Step 6: Hidden Zaps (Optional)
1. Activate edit mode of the zap
2. Press **TAB** or use **Slider → Properties**
3. Set **default value** to **100**
4. Enable **Hidden** checkbox
5. Zap will be always active and invisible to users

#### Step 7: Save Project
1. Use **File → Save Project (As)**
2. Follow on-screen tooltips
3. Test zaps in BodySlide preview window

---

## Updating Projects for New Sliders

### When to Update Projects

Update existing BodySlide projects when:
- Reference body adds new sliders
- Body mod releases major update
- Want to add newly available customization options

The reference and its sliders must be swapped without breaking existing slider data.

### Step-by-Step Update Process

#### Step 1: Load Existing Project
1. Use **File → Load Project**
2. Select the project to update

#### Step 2: Load Updated Reference
1. Use **File → Load Reference**
2. Choose the updated reference
3. New sliders and base mesh are added
4. **Note**: Extra sliders and zaps temporarily disappear

#### Step 3: Restore Extra Sliders (Optional)
1. Use **Slider → New Slider**
2. Type the **EXACT same slider name** as before
3. Slider restored with previous functionality
4. Repeat for each extra slider/zap

#### Step 4: Restore Slider Properties (Optional)
1. Enter edit mode of each restored slider
2. Press **TAB** or **Slider → Properties**
3. Verify settings:
   - Was it a zap?
   - Was it hidden?
   - Correct default values?

#### Step 5: Select New Sliders Only
1. Uncheck all slider checkboxes in the list
2. Check only newly added/changed sliders
3. **Why**: Preserves existing slider data without re-fixing clipping

#### Step 6: Conform to New Sliders
1. Use **Slider → Conform All**
2. Only checked sliders are conformed
3. Existing slider data remains intact

#### Step 7: Save Updated Project
1. Use **File → Save Project**
2. Project now uses updated reference
3. Latest sliders are available in BodySlide

---

## Packing Projects for Sharing

### Why Pack Projects?

When sharing projects with friends or releasing publicly, multiple files must be collected:
- Slider set files (.osp)
- Shape data files (.osd, .nif)
- Group XML files

Outfit Studio can automatically package all required files into folders or ZIP archives.

### Pack Projects Dialog

**Access**: **File → Pack Projects...**

### Packing Options

**Select Projects**:
- Choose one or more projects to share
- Projects merge into single .osp file
- Provide merged project name

**Output Format**:
- **Pack Folder...**: Creates folder with all files
- **Pack Archive...**: Creates ZIP archive

**Optional Group File**:
- Select group XML file to merge
- Access Group Manager from dialog
- Create groups before packing

### File Structure in Package

```
PackagedProject/
├── SliderSets/
│   └── PackagedProject.osp
├── ShapeData/
│   └── PackagedProject/
│       ├── *.osd
│       └── *.nif
└── SliderGroups/
    └── Groups.xml (optional)
```

---

## Making Conversion References (External Tools)

### When to Use External Tools

Use 3D software (Blender, 3ds Max) when:
- Normal Outfit Studio method insufficient
- Need precise mesh wrapping
- Complex body shape differences
- Professional-grade conversion required

**Try standard method first**: See "Conversion References Workflow" section

### Requirements

- 3D software: Blender, 3ds Max, or similar
- Shrinkwrap modifier knowledge (or equivalent)
- Basic 3D modeling skills

### Step-by-Step External Method

**Example**: Creating CBBE → Other Body conversion

#### Step 1: Export Other Body
1. Load other body NIF into Outfit Studio
2. Use **Shape → Export → To OBJ**
3. Save OBJ file

#### Step 2: Export Base Body
1. Load CBBE Body reference template
2. Use **Shape → Export → To OBJ**
3. Save OBJ file

#### Step 3: Import to 3D Software
1. Import both OBJ files into Blender/3ds Max
2. CBBE acts as "bridge" between body types

#### Step 4: Apply Shrinkwrap
1. Use Shrinkwrap modifier (Blender) or similar
2. Wrap **CBBE shape around other body** (not reverse!)
3. Manually align body beforehand for accuracy
4. All anatomy parts must line up properly
5. Recreating other body's shape using CBBE's mesh

**Blender Shrinkwrap Settings**:
- Target: Other body mesh
- Wrap Method: Nearest Surface Point
- Offset: 0.0

#### Step 5: Export Wrapped Mesh
1. Export shaped base body as OBJ
2. **Critical**: Maintain same vertex count and order
3. Check export options carefully

#### Step 6: Create New Project
1. New Project in Outfit Studio
2. Use same reference from Step 2 (CBBE)

#### Step 7: Create New Slider
1. Use **Slider → New Slider**
2. Name it (e.g., "CBBE → Other Body")

#### Step 8: Import Slider Data
1. Click **Edit** button on new slider
2. Use **Slider → Import Slider Data → Import OBJ**
3. Select OBJ from Step 5
4. Creates slider from difference between meshes

#### Step 9: Save Conversion Reference
1. Use **File → Save Project As**
2. Output paths/filenames don't matter (not used in BodySlide)
3. Enter display name → Click **To Project**

#### Step 10: Create Reverse (Optional)
1. Set slider to **100%**
2. Use **File → Make Conversion Reference**
3. Name opposite way ("Other Body → CBBE")
4. Save reversed project

---

## Keyboard Shortcuts Reference

### BodySlide Shortcuts

#### Building
| Shortcut | Action |
|----------|--------|
| **CTRL + Click Build** | Build to current working directory |
| **CTRL + Click Batch Build** | Select target directory |
| **ALT + Click Build** | Delete target files |
| **ALT + Click Batch Build** | Delete all batch target files |
| **Right-click in Batch** | Select/deselect all sets |

#### Rendering
| Shortcut | Action |
|----------|--------|
| **W** | Toggle wireframe mode |
| **T** | Toggle texture rendering |
| **L** | Toggle lighting |

---

### Outfit Studio Shortcuts

#### Projects
| Shortcut | Action |
|----------|--------|
| **CTRL + N** | New Project dialog |
| **CTRL + O** | Load Project |
| **CTRL + W** | Unload current project |
| **CTRL + S** | Save project |
| **CTRL + Shift + S** | Save Project As dialog |

#### Files
| Shortcut | Action |
|----------|--------|
| **CTRL + E** | Export NIF file |
| **CTRL + ALT + E** | Export NIF with reference |

#### Shapes
| Shortcut | Action |
|----------|--------|
| **Del** | Delete selected shape(s) |
| **F2** | Rename selected shape |

#### Sliders
| Shortcut | Action |
|----------|--------|
| **Tab** | Show slider properties (in edit mode) |
| **CTRL + Mouse Wheel** | Toggle edit mode of next/previous slider |

#### Brushing
| Shortcut | Action |
|----------|--------|
| **0-6** | Select different brush |
| **S + Mouse Wheel** | Adjust brush size |
| **CTRL (hold)** | Paint mask with any brush |
| **CTRL + ALT (hold)** | Erase mask with any brush |
| **CTRL + A** | Clear mask |
| **CTRL + I** | Invert mask |
| **CTRL + Z** | Undo brush stroke |
| **CTRL + Y** | Redo brush stroke |

#### Editing
| Shortcut | Action |
|----------|--------|
| **X** | Toggle X-Mirror |
| **C** | Toggle Edit Connected Only |
| **B** | Toggle Global Brush Collision |
| **Q** | Toggle vertex selection mode |
| **F** | Toggle transform tool |
| **V** | Move single vertex dialog |

#### Rendering
| Shortcut | Action |
|----------|--------|
| **W** | Toggle wireframe mode |
| **T** | Toggle texture rendering |
| **L** | Toggle lighting |
| **G** | Toggle visibility of selected shape(s) |
| **Shift + 1/2/3/4** | View: Front/Back/Left/Right |
| **Shift + 5** | Toggle perspective mode |

---

## Saving Projects (Detailed)

### Save Project Dialog Fields

**Access**: **File → Save Project As**

#### Display Name
**Purpose**: Name shown in BodySlide outfit list  
**Example**: "Gunner Operator - CBBE"  
**Tips**: Keep relevant to content, avoid special characters

#### To Project Button
**Purpose**: Copy display name to all project fields below  
**Use When**: Simple projects without custom folder structures  
**Benefit**: Saves time, ensures consistency

#### Output File Name
**Purpose**: Name of built file in game data path  
**Format**: Without file extension (auto-appended)  
**Skyrim**: Don't include `_0` or `_1` suffix (auto-added)

**Example**:  
- Input: `GunnerOperator`
- Output: `GunnerOperator_0.nif` and `GunnerOperator_1.nif`

#### Output Data Path
**Purpose**: Location in game data where files are built  
**Format**: Relative to game's Data folder  
**Example**: `Meshes\Armor\GunnerOperator`

**Note**: Does NOT include output file name

#### Weight Output
**Purpose**: Decides low/high weight variants  
**Options**:
- **Low/High Weight**: Separate builds with `_0` and `_1` (Skyrim only)
- **Single Weight**: One build, no suffix (FO4, FO3, etc.)

#### Slider Set File
**Purpose**: .osp file name in SliderSets folder  
**Can Contain**: Multiple projects in one file  
**Example**: `CBBEOutfits.osp` can contain 20+ projects

#### Shape Data Folder
**Purpose**: Subfolder in ShapeData directory  
**Can Include**: Multiple subfolders  
**Examples**:  
- `GunnerOperator`
- `Dresses\FormalWear`
- `Armor\Combat\Gunner`

#### Shape Data File
**Purpose**: Mesh filename saved to shape data folder  
**Format**: Without extension (auto-appended)  
**Example**: `GunnerOperator` → `GunnerOperator.nif`

#### Copy Reference Shape Into Output
**Purpose**: Include reference (green) shape in saved project  
**When to Enable**:
- Want body mesh included in project
- Creating standalone outfit pack

**When to Disable**:
- Using separate body mod
- Outfit only (no body)

---

## Weight Copy Options (Detailed)

### Weight Copy Dialog

When copying bone weights, an options dialog appears with customization settings.

### How Weight Copying Works

Every source vertex spreads its bone weights to target vertices based on:
1. **Search Radius**: Distance from source vertex
2. **Max Vertex Targets**: How many targets receive weights

**Example**:  
- Source vertex (green)
- 5 target vertices (red) within radius (blue circle)
- Max targets = 4
- Only 4 of 5 receive weights from that source

### Weight Averaging

All received weights are:
- **Averaged** across all sources
- **Limited** to maximum 4 bones per vertex
- **Normalized** to sum to 1.0

### Settings

**Search Radius**:
- Larger = broader weight influence
- Smaller = more precise weight copying
- Default usually sufficient

**Max Vertex Targets**:
- How many targets per source
- Higher = smoother transitions
- Lower = more precise control

---

## Weight Normalization

### What is Weight Normalization?

For skinned meshes in NIFs:
- Bone weights per vertex **must sum to 1.0**
- **Maximum 4 bones** can affect single vertex

**Normalization Process**:
1. Keep 4 strongest bone influences per vertex
2. Discard weaker influences
3. Normalize remaining weights to sum to 1.0

### Live Normalization

**Checkbox**: "Normalize Weights" in Outfit Studio

**When Enabled**:
- Normalizes as you paint with weight brush
- Instant feedback
- Increasing weight on one bone decreases others
- Decreasing weight adds to other bones

**Preference**:
- Adds weight to bones that already have weight
- Avoids adding to bones with zero weight

### Normalized/Locked Bones

Control which bones are affected during normalization using **"modify during normalization" flag** next to bones.

#### Two Operation Modes

**Mode 1: No Flags Set (or only selected bone flagged)**
- Flags ignored
- Weight added/removed from any bone

**Mode 2: Multiple Bones Flagged**
- Only flagged bones modified
- Other bones locked
- Selected bone and x-mirror bone excluded from lock

#### Special Cases

**Case 1: Weights Not Normalized**
- Can happen after "Copy Weights"
- Painting causes sudden normalization
- May see big weight changes

**Case 2: Single Modifiable Bone**
- One flagged bone (not selected/x-mirror)
- Flagged bone has zero weight
- Selected bone can only take from x-mirror
- **Useful for**: Equalizing centerline weights

---

## Brushes Reference

### Brush Settings Panel

**Access**: Click "Brush Settings" at top of Outfit Studio

**Settings**:
- **Size**: Brush circle diameter
- **Strength**: Effect intensity
- **Focus**: Falloff from center to border (higher = stronger outer effect)
- **Spacing**: Distance between brush actions (higher = fewer updates)

### Brush Tools

#### 0. Select Tool
**Shortcut**: **0**  
**Purpose**: Click shapes to select for brushing/actions  
**Modifier**: None

---

#### 1. Mask Brush
**Shortcut**: **1**  
**Purpose**: Mask/unmask parts of meshes  
**Modifiers**:
- **Hold ALT**: Remove mask
- **Hold CTRL (any brush)**: Paint mask without switching

**Effect**: Masked parts can't be edited, weights won't copy to masked areas

---

#### 2. Inflate Brush
**Shortcut**: **2**  
**Purpose**: Push vertices toward camera (most common for fixing clipping)  
**Direction**: Along normal of vertex under cursor  
**Modifier**: **Hold ALT** to deflate

---

#### 3. Deflate Brush
**Shortcut**: **3**  
**Purpose**: Push vertices away from camera  
**Direction**: Along normal of vertex under cursor  
**Note**: Opposite of inflate brush

---

#### 4. Move Brush
**Shortcut**: **4**  
**Purpose**: Pull affected parts in direction  
**Type**: 2D move based on camera facing  
**Use**: Repositioning mesh areas

---

#### 5. Smooth Brush
**Shortcut**: **5**  
**Purpose**: Even out vertices, smooth area  
**Warning**: Watch for texture warping or distortions  
**Use**: Fixing bumpy areas, blending transitions

---

#### 6. Weight Brush
**Shortcut**: **6**  
**Availability**: Only in Bones tab  
**Purpose**: Edit bone weighting for shapes  
**Colors**:
- **Blue**: Weak weight (0.0)
- **Red**: Strong weight (1.0)

**Modifiers**:
- **Hold ALT**: Weaken weights
- **Hold SHIFT**: Smooth/even out weights

---

#### 7. Color Brush
**Shortcut**: **7**  
**Availability**: Only in Colors tab  
**Purpose**: Edit vertex colors  
**Requirements**: Vertex colors enabled in shader properties

---

#### 8. Alpha Brush
**Shortcut**: **8**  
**Availability**: Only in Colors tab  
**Purpose**: Edit vertex alpha (transparency)  
**Requirements**: Vertex alpha enabled in shader, alpha property assigned

---

### Brush Options

#### X-Mirror (X)
**Effect**: Mirror all brush actions across X-axis  
**Use**: Symmetrical editing  
**Disable**: For one-sided edits

#### Edit Connected Only (C)
**Effect**: Only affect vertices connected to cursor vertex  
**Use**: Prevent accidental editing of disconnected areas

#### Global Brush Collision (B)
**Effect**: With multiple shapes selected, brush affects all vs. last selected  
**Enabled**: Brush collides with all selected shapes  
**Disabled**: Only last selected shape affected

---

## Tools Reference

### Transform Tool (F)
**Shortcut**: **F**  
**Purpose**: Move, rotate, scale meshes in 3D

**Controls**:
- **Drag arrows**: Move
- **Drag circles**: Rotate
- **Drag cubes**: Scale

**Applies to**: Selected shapes

---

### Vertex Selection (Q)
**Shortcut**: **Q**  
**Purpose**: Select/deselect individual vertices

**Usage**:
- **Drag over vertices**: Unmask/select
- **Hold CTRL + Drag**: Mask/unselect

**Similar to**: Mask brush but for individual vertex control

---

### Mesh Editing Tools

#### Collapse Vertex
**Purpose**: Delete mesh vertex by clicking  
**Requirements**: Vertex must have ≤3 connections  
**Behavior**: If 3 connections, triangle added to prevent hole

**Use Cases**:
- Simplifying mesh
- Removing unnecessary vertices
- Reducing poly count

---

#### Flip Edge
**Purpose**: Flip mesh edge by clicking  
**Requirements**: Edge not on boundary or weld  
**Behavior**: Two triangles replaced, opposite vertices connected

**Use Cases**:
- Fixing mesh flow
- Correcting triangle orientation
- Optimizing topology

---

#### Split Edge
**Purpose**: Split edge in two with new vertex  
**Behavior**:
- New vertex at midpoint (adjusted for surface curvature)
- Neighboring triangles split in two

**Use Cases**:
- Adding detail to mesh
- Creating subdivision
- Refining geometry

---

## Clearing All Transforms

### What are Transforms?

**Types**:
1. **Node transforms** (NiNode)
2. **Static shape transforms** (NiTriShape, BSTriShape)
3. **Global-to-skin transforms** (NiSkinData - not saved for FO4)
4. **Bone transforms** (NiSkinData, BSSkin::BoneData) per bone

### When to Clear Transforms

**Symptoms**:
- Mesh aligned in Outfit Studio but wrong in-game
- Mesh becomes invisible when close
- Game thinks mesh is "out-of-bounds"

### Step-by-Step Transform Clearing

#### Step 1: Align in Outfit Studio
1. Load clean reference mesh (body)
2. Verify shapes appear correctly aligned
3. If misaligned, use transform tool or **Shape → Move**

#### Step 2: Clear Global-to-Skin Transform
1. Open **Shape Properties** for each shape
2. Go to **"Coordinates" tab**
3. Set origin/rotation to **0, 0, 0**
4. Set scale to **1.0**
5. **Check**: "Recalculate geometry's coordinates so it doesn't move"
6. Click **OK**
7. Repeat for all shapes

#### Step 3: Update Bone Transforms
1. Use **Edit → Reset Transforms** (once)
2. Affects all shapes
3. Clears static shape transforms
4. Updates bone transforms

---

## Shape Properties

### What are Shape Properties?

**Access**: Double-click shape in list, or **Shape → Properties**

Shape properties modify mesh attributes such as shaders, skinning, or extra data. Properties only apply to the selected shape (mesh/object).

**Four Property Tabs**:
1. **Shader** - Materials, textures, transparency
2. **Geometry** - Precision, skinning, sub-indexing
3. **Extra Data** - Custom string/integer data
4. **Coordinates** - Global-to-skin transforms

---

### Shader Tab

#### Name/Material
**Purpose**: Shader name or material file path  
**Fallout 4**: Points to BGSM/BGEM material file  
**Other Games**: Usually empty but can be set

#### Type
**Purpose**: Tells game how to render and which texture slots to use  
**Common Types**:
- Default
- Environment Map
- Face/Skin Tint

#### Shader Properties
| Property | Purpose |
|----------|---------|
| **Specular Color** | Color of specular highlight |
| **Specular Strength** | Strength of highlight |
| **Specular Power** | Reflectivity power |
| **Emissive Color** | Light emission color (if enabled) |
| **Emissive Multiplier** | Light emission strength |

#### Buttons
- **Add/Remove**: Add or remove shader from shape
- **Textures**: Opens dialog to assign texture paths to slots

**Note**: More variables available in NifSkope or material files

---

### Transparency

| Property | Purpose |
|----------|---------|
| **Threshold** | Alpha testing value (when pixel becomes transparent) |
| **Add/Remove** | Add or remove alpha property |

**Fallout 4 Note**: When using material files, values and texture paths come from .bgsm or .bgem files. Shader type still matters.

**Limitations**: Properties in shader tab not complete. Use NifSkope for full shader control.

---

### Geometry Tab

#### Full Precision
**Purpose**: Store vertex data in 4-byte format  
**Availability**: Fallout 4 only  
**When to Use**: Only when extra precision absolutely needed  
**Warning**: Use carefully, increases file size

#### Sub Index
**Purpose**: Toggle BSTriShape ↔ BSSubIndexTriShape blocks  
**Use**: Enable segmentation for VATS and dismemberment (FO4)  
**Requirements**: Segments must be painted and assigned

#### Skinned
**Purpose**: Toggle skinned flag  
**Behavior**:
- **Unchecking**: Removes skinning data, converts to static mesh
- **Re-checking**: Resets and clears bones/skinning
- **Use Case**: Convert skinned mesh to static

---

### Extra Data Tab

**Purpose**: Assign custom data to shapes

#### Data Types

**NiStringExtraData**:
- Store text as value
- Has name and value properties

**NiIntegerExtraData**:
- Store numbers as value
- Has name and value properties

**Uses**:
- Game features
- Third-party plugins
- Custom software integration

---

### Coordinates Tab

**Purpose**: Change or clear global-to-skin transform

**Transform**: Difference between static and skinned position/rotation/scale

#### Clearing Transform
1. Verify mesh is correctly aligned first
2. Set origin to **0, 0, 0**
3. Set rotation to **0, 0, 0**
4. Set scale to **1.0**
5. **Check**: "Recalculate geometry's coordinates so it doesn't move"
6. Click **OK**

**FO4 Exception**: Meshes don't store this transform in file (guessed from bone positions). Don't clear—"under-the-ground" meshes provide higher precision.

---

## Merging Geometry

### What is Geometry Merging?

**Access**: **Shape → Merge Geometry...**

Merging combines two shapes into one. Useful for:
- Simplifying projects
- Combining outfit parts
- Reducing shape count

### Merge Requirements

Shapes must match in these areas:

| Requirement | Details |
|-------------|---------|
| **Different Shapes** | Target ≠ source |
| **Partitions** | Amount and slots must match |
| **Segments** | Amount, sub-segments, info, and file must match |
| **Vertex Count** | Result can't exceed limits |
| **Triangle Count** | Result can't exceed limits |
| **Shaders** | Both have/don't have shader, same type |
| **Base Texture** | Same base/diffuse texture path |
| **Alpha Property** | Both have/don't have, same flags + threshold |

### Merge Dialog Options

**Delete Source Shape**:
- **Default**: Source deleted after merge
- **Keep Source**: Original remains, merged copy created
- **Use Case**: Experiment with merging while preserving original

**Mismatch Handling**: Dialog displays any mismatches preventing merge

---

## Reference Templates

### What are Reference Templates?

**Definition**: Shortcuts to load specific shapes from existing projects as conversion references

**Location**: Defined in `RefTemplates.xml` or `RefTemplates/` folder

**Purpose**: Quick access to frequently used conversion references

**Important**: Templates are links, not actual project files

### Template Usage

**Access**: Load Reference dialog in Outfit Studio

**Benefit**: Faster than manually browsing for project files

### Defining Custom Templates

**File**: `RefTemplates.xml`

**Syntax**:
```xml
<RefTemplates>
    <Template sourcefile="SliderSets\CBBE.osp" set="CBBE Body" shape="CBBE">CBBE Body</Template>
    <Template>...</Template>
</RefTemplates>
```

**Attributes**:
- **sourcefile**: Path to .osp file (relative to BodySlide folder)
- **set**: Project name inside .osp file
- **shape**: Mesh name to become reference shape
- **Element text**: Display name in template list

**Example**:
```xml
<Template sourcefile="SliderSets\CBBE.osp" set="CBBE Body" shape="CBBE">CBBE Body</Template>
```

### Hidden Projects

**Use Case**: Project visible in Outfit Studio but hidden from BodySlide users

**Method**: Store .osp outside SliderSets directory (e.g., ConversionSets folder)

---

## Mesh Editing Examples

### Example 1: Collapse Vertex with 4+ Connections

**Problem**: Vertex has more than 3 connections, can't use collapse tool directly

**Solution**:
1. Use **Flip Edge** to reduce connections to 3
2. Flip edges around vertex until only 3 remain
3. Use **Collapse Vertex** to remove

**Key Insight**: Collapse tool requires ≤3 connections

---

### Example 2: Closing One-Triangle Hole

**Problem**: Surface missing triangle, leaving hole

**Solution**:
1. Pick corner vertex to collapse
2. Use **Flip Edge** 3 times to reduce connections to 3
3. Use **Collapse Vertex** to close hole
4. Clean up: **Split Edge** + **Flip Edge** to restore proper mesh

**Steps**:
- Hole with 3 corner vertices
- Pick vertex with most connections
- Flip edges to isolate vertex
- Collapse to close
- Split and flip to regularize

---

### Example 3: Creating One-Triangle Hole

**Problem**: Want to punch hole in surface

**Solution**:
1. Use **Split Edge** twice to create center vertex in triangle
2. **Flip Edge** + **Collapse Vertex** to remove extra vertex
3. **Mask** center vertex with small brush
4. **Invert Mask**
5. **Delete Vertices**

**Key Technique**: Must create vertex in center before deleting

---

### Example 4: Regularizing Mesh (Remove Texture Distortion)

**Problem**: Texture distortion from irregular mesh

**Solution**:
1. Use **Collapse Vertex** to remove unwanted vertices
2. Reduce to minimum vertices needed for regular mesh
3. **Flip Edges** to regularize triangulation
4. Use **Move Tool** to arrange vertices in grid
5. Fix UV coordinates in UV editor

**Result**: Smooth texture with regular mesh

**Key Insight**: Regular mesh = better texture mapping

---

### Example 5: Cutting Lattice Pattern

**Problem**: Cut multiple holes in surface with lattice texture

**Solution**:
1. Use **Split Edge** to add vertices at each hole corner
2. **Flip Edges** along hole boundaries
3. Adjust UV coordinates in UV editor
4. Adjust space coordinates with move tool
5. Add center vertex to each hole (split + flip + collapse)
6. **Mask** center vertices
7. **Invert Mask** + **Delete Vertices**

**Key Steps**: UV adjustment before space adjustment often easier

---

### Example 6: Refining Coarse Low-Polygon Region

**Problem**: Not enough vertices, rough appearance with sliders

**Solution**:
1. Use **Split Edge** on diagonal edges (doubles vertices)
2. Split horizontal/vertical edges (doubles again)
3. **Flip Edges** to shorten long edges
4. Check smoothness with all sliders
5. Adjust slider diffs if needed

**Key Insight**: Split-edge generates reasonable coordinates but check slider smoothness

---

### Example 7: Restoring Accidentally-Deleted Surface

**Problem**: Small piece of surface deleted, too late to undo

**Solution**:
1. Move boundary vertices to new boundary positions
2. **Flip Edges** to reduce unwanted vertices to 3 connections
3. **Collapse Vertex** to remove unwanted vertices
4. Use **Split Edge** to add missing internal vertices
5. **Flip Edges** for regular triangulation
6. Fix UV coordinates in UV editor
7. Smooth and adjust slider diffs

**Result**: Roughly restored surface

---

### Example 8: Smoothing by Edge-Flipping

**Problem**: Surface rough despite enough vertices (long, thin triangles)

**Solution**:
1. Identify long edges creating indentations
2. Use **Flip Edge** to shorten triangle edges
3. Goal: Make edges as short as possible
4. Shorter edges = smoother curved surface

**Key Principle**: Long edges indent curved surfaces more

**Result**: Smoother appearance without adding vertices

---

## Video Tutorials

### Official Community Tutorials

**In-depth Installation and Usage** - Gopher  
Comprehensive BodySlide setup and usage guide  
**Find on**: YouTube (search "Gopher BodySlide")

**Outfit Studio Guidance** - Nightasy/Brain Poof  
Detailed Outfit Studio workflow tutorials  
**Find on**: YouTube (search "Nightasy Outfit Studio")

**Turning Armor into Static Meshes** - Elianora  
Convert outfits to static decorative meshes  
**Find on**: YouTube (search "Elianora static mesh")

**Updating Body References** - Brigand231  
How to update projects when body mods change  
**Find on**: YouTube (search "Brigand231 BodySlide")

---

## What is Outfit Studio?

**Outfit Studio** is the companion tool to BodySlide for advanced mesh editing.

### Key Features
- **Convert outfits** between different body types using conversion references
- **Create custom sliders** for BodySlide projects
- **Edit animation weights** to fix clipping and improve movement
- **Sculpt meshes** using brushes and transform tools
- **Create outfit mashups** by combining multiple outfits
- **Import/Export** .FBX, .OBJ, .NIF files (meshes and sliders)
- **Edit static meshes** (advanced users only)

**Access**: Outfit Studio button in main BodySlide window

**Note**: Requires 3D modeling knowledge—most users only need BodySlide for body customization.

---

## Tips & Tricks

### Performance
- Batch building is faster than individual outfit builds
- Build all outfits at once when possible
- Single outfit builds are fine for tweaks

### Customization
- You can manually adjust sliders if presets don't match your vision
- Save your custom slider configurations as new presets
- Presets are reusable—save good ones!

### Compatibility
- CBBE is most compatible with most mods
- Check mod requirements before downloading
- Conflicts usually handled gracefully by Bodyslide

### In-Game Testing
- Always restart game completely after building
- Load into a safe location to check results
- Don't trust preview—it's often wrong
- Take screenshots to compare before/after

---

## Related Guides

- **[Modding Fallout 4](FALLOUT4_MODDING_GUIDE.md)** - General modding guide by Lindeboombier
- **[Using Vortex Mod Manager](VORTEX_MOD_MANAGER_GUIDE.md)** - Vortex installation and usage
- **[CBBE Body Customization](CBBE_CUSTOMIZATION.md)** - Advanced CBBE setup
- **[Outfit Mod Compatibility](OUTFIT_MOD_COMPATIBILITY.md)** - Troubleshooting outfit mods

---

## Community Resources

### Nexus Mods Links
- **Bodyslide**: https://www.nexusmods.com/fallout4/mods/25
- **CBBE Body**: https://www.nexusmods.com/fallout4/mods/15
- **Bodyslide Presets**: Search "Bodyslide" on Nexus

### Popular Body Mods
- CBBE (Caliente's Beautiful Bodies Edition)
- Zex Fusion Girl
- Atomic Lust
- Physics Mods for bodies

### Finding Patches
For unsupported outfits:
1. Find the outfit mod on Nexus
2. Go to "Mods requiring this file" section
3. Look for Bodyslide patches
4. Download and install via Vortex

---

## Frequently Asked Questions

**Q: Do I need CBBE specifically?**
A: No, but it's most widely supported. Other bodies like Zex Fusion Girl also work—just ensure outfit supports your chosen body.

**Q: Can I use multiple presets for different outfits?**
A: Yes! Build each outfit individually with different presets selected.

**Q: Will Bodyslide affect my texture mods?**
A: No, Bodyslide only changes shape/morphs, not textures or colors.

**Q: Why does my body look different than the preview?**
A: Bodyslide preview often shows larger proportions than in-game. Always verify in actual game.

**Q: Can I share my custom presets?**
A: Yes! Presets are simple text files you can share with others.

**Q: How do I create my own custom body from scratch?**
A: Start with a preset as a base, then adjust sliders to your liking. Use the "Save As" button to save your custom configuration. Creating from complete scratch is time-consuming—always use a preset as a starting point.

**Q: Can I revert back to the original body type?**
A: Yes! Simply select the default vanilla preset (if available) or reinstall the base body mod without Bodyslide modifications. You can also batch build with a "vanilla" preset.

**Q: How do I use Bodyslide with other mods that modify bodies?**
A: Ensure all mods use the same body framework (e.g., all use CBBE). Check compatibility on the mod pages. Some mods may conflict—load order matters in these cases.

**Q: Can I adjust individual body parts without affecting the whole body?**
A: Yes! Use the Body Part Settings panel to fine-tune specific parts. You can also solo build specific outfits with different slider settings.

**Q: What's the difference between "Build" and "Batch Build"?**
A: "Build" applies changes to the currently selected outfit only. "Batch Build" applies changes to all outfits that support Bodyslide. Use Build for individual tweaks, Batch Build for consistency across all outfits.

**Q: Why are some sliders grayed out or unavailable?**
A: Some sliders are preset-specific. Different presets have different available sliders. Also, some sliders only appear when certain body parts are selected.

**Q: Can I use Bodyslide on console (Xbox/PlayStation)?**
A: No, Bodyslide is PC-only. Console players can use pre-made body mods but cannot customize them with Bodyslide.

**Q: How do I know which body type an outfit uses?**
A: Check the outfit mod's requirements section on Nexus. It will list the required body mod (CBBE, Fusion Girl, etc.). Also look in the files section for "CBBE" or similar indicators.

---

## Credits

**Guide Written By**: Lindeboombier  
**Original Date**: June 2025  
**Fallout 4 Modding Resource**: https://steamcommunity.com/app/377160/guides  
**Official BodySlide Documentation**: https://github.com/ousnius/BodySlide-and-Outfit-Studio/wiki

Thanks to Lindeboombier for the original guide, the BodySlide project maintainers for official documentation, and the community for feedback and troubleshooting reports.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2025 | Initial guide creation by Lindeboombier |
| 1.1 | January 2026 | Expanded troubleshooting, added FAQ, improved formatting |
| 1.2 | January 2026 | Integrated official workflows: conversion references, project creation, bone weights, zaps |
| 1.3 | January 2026 | Added comprehensive reference: keyboard shortcuts, brushes, tools, weight normalization, updating projects, packing projects, transform clearing |
| 1.4 | January 2026 | Added advanced content: shape properties, merging geometry, reference templates, mesh editing examples (8 techniques), video tutorials |

---

**Last Updated**: January 24, 2026
**Status**: Complete and Ready for Use
