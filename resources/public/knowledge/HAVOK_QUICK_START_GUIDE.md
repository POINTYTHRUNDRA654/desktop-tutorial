# Havok Animation Quick Start for Fallout 4

**Get Havok animation tools installed and create your first animation in under an hour.**

---

## 5-Step Setup (30 Minutes)

### Step 1: Install Havok SDK (10 min)

1. **Get Havok SDK**
   - Download from Autodesk: https://www.autodesk.com/products/havok/overview
   - Or academic/gamedev license access
   - For Fallout 4: Use version **2010.2.0** or **2012.1**

2. **Extract & Set Path**
   ```bash
   # Extract to folder (example path)
   C:\HavokSDK\hk2010_2_0
   
   # Add to Windows PATH environment variable
   # (Control Panel > System > Environment Variables)
   ```

3. **Verify Installation**
   ```bash
   # In Command Prompt:
   echo %HK_HAVOK_SDK%
   # Should show your Havok path
   ```

### Step 2: Install HavokMax (10 min)

1. **Clone & Build**
   ```bash
   # Clone repository
   git clone https://github.com/PredatorCZ/HavokMax.git
   cd HavokMax
   
   # Create build directory
   mkdir build && cd build
   
   # Configure and build
   cmake -G "Visual Studio 16 2019" -DCMAKE_BUILD_TYPE=Release ..
   cmake --build . --config Release
   
   # Find built .dlu file in bin/Release/
   ```

2. **Install to 3DS Max**
   ```
   Copy HavokMax.dlu to:
   C:\Program Files\Autodesk\3ds Max [VERSION]\plugins\
   
   (3DS Max version 2018 or newer)
   ```

3. **Restart 3DS Max**
   - Launch 3DS Max normally
   - Check if HavokMax menu appears in main menu bar

### Step 3: Clone HavokLib (5 min)

```bash
git clone https://github.com/PredatorCZ/HavokLib.git

# You now have the library for advanced tools
# (HavokMax already includes what you need for basic animation)
```

### Step 4: Get Reference Model (3 min)

1. **Extract Fallout 4 Assets**
   - Use Nifskope to open `Data\meshes\actors\character\CharacterAssets\` files
   - Extract a base skeleton NIF (e.g., `skeleton.nif`)

2. **Import to 3DS Max**
   - File > Import > Select skeleton NIF
   - Import mesh reference model

### Step 5: Test HavokMax Features (2 min)

1. **In 3DS Max**, look for new menu items:
   - **Havok** (main menu)
   - **Animation Tools** (toolbar)
   - **Physics Tools** (toolbar)

2. **Verify plugin loaded**:
   - Open Asset Tracking and search for "Havok"
   - Should show HavokMax plugin registered

---

## 30-Minute First Animation

### What You'll Create
A simple idle animation with subtle weight shift.

**Duration**: ~30 frames (1 second at 30 FPS)  
**Bones Involved**: Pelvis, Spine, Head

### Timeline

| Time | Task | Details |
|------|------|---------|
| 0:00 | Setup | Import skeleton, create empty animation |
| 5:00 | Frame 0 | Key neutral pose |
| 10:00 | Frame 15 | Key weight shift (slight pelvis rotation) |
| 15:00 | Frame 30 | Key return to neutral |
| 20:00 | Polish | Smooth curves, add subtle head tilt |
| 25:00 | Configure | Set animation properties |
| 30:00 | Export | Save as .hkx |

### Detailed Steps

#### Setup (0-5 min)

1. **Create New Scene**
   ```
   File > New
   ```

2. **Import Skeleton**
   ```
   File > Import > [character skeleton.nif]
   Check "Import Bones Only"
   ```

3. **Create Animation Track**
   ```
   Havok > Create Animation Track
   Select all bones (Ctrl+A)
   Confirm
   ```

#### Animation (5-25 min)

1. **Frame 0 - T Pose**
   ```
   Timeline: Move to frame 0
   Select Pelvis bone
   Set keyframe (press K)
   Select Head bone
   Set keyframe
   Select all Spine bones
   Set keyframes
   ```

2. **Frame 15 - Weight Shift**
   ```
   Timeline: Move to frame 15
   Select Pelvis
   Rotate slightly (~5 degrees) left or right
   Set keyframe
   Select Head
   Tilt opposite direction (~3 degrees)
   Set keyframe
   ```

3. **Frame 30 - Return to Start**
   ```
   Timeline: Move to frame 30
   Select Pelvis, rotate back to neutral
   Select Head, tilt back
   Set keyframes on both
   ```

4. **Smooth Curves**
   ```
   Track View > Select animation track
   Right-click keyframes > Smooth
   ```

#### Configuration (25-30 min)

1. **Set Animation Properties**
   ```
   Havok > Animation Properties
   Set:
   - Name: "Idle_Subtle"
   - Duration: 30 frames
   - Frame Rate: 30 FPS
   - Loop: Yes
   - Blend In: 0.1 sec
   - Blend Out: 0.1 sec
   ```

2. **Configure Compression**
   ```
   Havok > Export Options
   - Compression Level: Medium
   - Error Threshold: 0.001
   ```

3. **Export**
   ```
   File > Export > Export Selected
   Format: Havok (.hkx)
   Filename: Idle_Subtle.hkx
   ```

**Result**: Your first Havok animation file ready!

---

## Essential Concepts You Need to Know

### Havok Skeleton
A **skeleton** is a hierarchy of **bones** (joints) that define the character's structure.

```
Havok Skeleton in Fallout 4:
Root (origin point)
├── Pelvis (hips - main control bone)
│   ├── Spine (lower back)
│   │   ├── Spine1 (mid back)
│   │   │   ├── Spine2 (upper back)
│   │   │   │   └── Neck (neck connection)
│   │   │   │       └── Head (main head bone)
│   │   │   ├── L Clavicle (left shoulder)
│   │   │   │   ├── L UpperArm
│   │   │   │   │   └── L Forearm
│   │   │   │   │       └── L Hand
│   │   │   │   └── L Clavicle (weapon slot)
│   │   │   └── R Clavicle (right shoulder)
│   │   │       ├── R UpperArm
│   │   │       │   └── R Forearm
│   │   │       │       └── R Hand
│   │   │       └── R Clavicle (weapon slot)
│   ├── L Thigh (upper leg)
│   │   ├── L Calf (lower leg)
│   │   │   └── L Foot (foot)
│   │   │       └── L Toe (toes)
│   ├── R Thigh (upper leg)
│   │   ├── R Calf (lower leg)
│   │   │   └── R Foot (foot)
│   │   │       └── R Toe (toes)
│   └── Tail (if applicable to character)
```

**Important**: Every bone has a parent (except Root). Animations move bones relative to their parents.

### Animation Keyframes

A **keyframe** is a stored position and rotation at a specific time.

```
3 Keyframes Over 30 Frames:

Frame 0: Neutral Pose
└─ Pelvis: Rotate=0°, Position=(0,0,0)
└─ Head: Rotate=0°

Frame 15: Weight Shift
└─ Pelvis: Rotate=5°, Position=(0.1,0,0)
└─ Head: Rotate=-3°

Frame 30: Back to Neutral
└─ Pelvis: Rotate=0°, Position=(0,0,0)
└─ Head: Rotate=0°

(The animation engine interpolates the movement between these keyframes)
```

### Animation Properties

Every animation has properties that control playback:

| Property | Purpose | Example |
|----------|---------|---------|
| **Duration** | Total frames | 30 frames = 1 second (at 30 FPS) |
| **Frame Rate** | Playback speed | 30 FPS (standard for Fallout 4) |
| **Loop** | Repeats | Yes (for idle), No (for attack) |
| **Blend In** | Smooth start | 0.1 sec = 3 frames of blending |
| **Blend Out** | Smooth end | 0.1 sec = 3 frames of blending |

---

## Common Shortcuts & Workflows

### 3DS Max Animation Basics

```
Keyboard Shortcuts:
K          = Set keyframe for selected bone
Delete     = Remove keyframe at current frame
G          = Go to specific frame
N          = Create new animation track

Navigation:
< >        = Previous/Next frame
Home/End   = First/Last frame
Play       = Start animation preview
```

### HavokMax Typical Workflow

```
1. File > Import > [base skeleton]
2. Havok > Create Animation Track
3. Animate bones (set keyframes)
4. Havok > Animation Properties (configure)
5. File > Export > Havok (.hkx)
6. Test in game
```

### Physics Shape Quick Setup

```
For a simple ragdoll:

1. Havok > Create Physics Shapes
2. For each limb:
   ├── Select bone
   ├── Havok > Add Capsule Shape
   ├── Adjust size/rotation
   ├── Set mass (1-5 per limb)
3. Export as .hkx
```

---

## File Format Quick Reference

### .hkx (Havok Data Container)
- **What**: Binary format containing Havok data
- **Contains**: Animation keyframes, physics shapes, behavior data
- **Used for**: Exporting from 3DS Max, importing to Fallout 4
- **Created by**: HavokMax export
- **Size**: Usually 50KB-500KB per file

### .nif (Fallout 4 Mesh Format)
- **What**: 3D model format with embedded Havok
- **Contains**: 3D geometry, skeleton, physics shapes, animation (embedded)
- **Used for**: Characters, armor, weapons
- **Size**: Usually 100KB-2MB per file

### .xml/.txt (Behavior Graphs)
- **What**: Animation state machine definition
- **Contains**: States, transitions, event handlers
- **Used for**: Complex animation logic (combat, interaction)
- **Human readable**: Yes (XML is structured text)

---

## Troubleshooting Quick Fixes

### HavokMax Not Appearing in 3DS Max

```
Fix:
1. Verify HavokMax.dlu is in plugins folder
2. Check 3DS Max version (needs 2018+)
3. Restart 3DS Max
4. Check Asset Tracking for errors
5. Rebuild HavokMax if still missing
```

### Animation Plays Too Fast/Slow

```
Fix:
1. Check Frame Rate (should be 30 FPS)
2. Count actual frames (Duration / Frame Rate = seconds)
3. Adjust Frame Rate in Animation Properties
4. Re-export
```

### Bones Don't Move in Animation

```
Fix:
1. Verify keyframes are set (check track view)
2. Ensure animation track is selected, not object
3. Confirm bones in hierarchy (not isolated)
4. Check keyframe times (not all at frame 0)
5. Verify track animation range
```

### Export Fails

```
Fix:
1. Select all animated objects first
2. Check file write permissions
3. Verify Havok SDK environment variable set
4. Try exporting to different folder
5. Check 3DS Max output log for specific error
```

---

## Next Steps After First Animation

### Phase 1: Practice Basic Animations
1. Walk cycle (16-24 frames)
2. Run cycle (12-16 frames)
3. Sitting to standing transition
4. Combat idle stance

### Phase 2: Learn Physics
1. Add capsule shapes to limbs
2. Configure mass values
3. Test ragdoll behavior
4. Adjust constraints

### Phase 3: Advanced Animations
1. Multi-part animations (blend multiple tracks)
2. Behavior graphs (animation state machines)
3. Event synchronization (sound, effects timing)
4. Complex interactions (lockpicking, terminal use)

### Phase 4: Integration with Fallout 4
1. Embed animation in NIF files
2. Register in behavior graphs
3. Link to game events
4. Test in Creation Kit

---

## Reference Resources

### Included in Havok SDK
- `samples/AnimationDemo/` (example animation project)
- `samples/Physics/` (ragdoll examples)
- API documentation (PDF)
- Sample data files (.hkx, .nif)

### Community Resources
- **Nifskope**: NIF file viewer/editor (https://github.com/niftools/nifskope)
- **PredatorCZ Projects**: HavokMax & HavokLib source code
- **Nexus Mods**: Animation tutorials and examples
- **Fallout 4 Creation Kit**: In-game animation preview

### Official Documentation
- Havok SDK Manual (with SDK download)
- 3DS Max Plugin Documentation
- Fallout 4 Creation Kit Guide

### Credits & Sources
- ShadeAnimator — Fallout 4 Animation Kit (F4AK) and original guide (Nexus: https://www.nexusmods.com/fallout4/mods/16694)
- Bizz — 32-bit skeleton/animation conversion workflow and tutorial
- Figment — updated NifTools tools
- Mars — tutorial hosting and support
- DexesTTP — HKXPack/HKXAnim tools (HKXPack v0.1.5-beta: https://github.com/Dexesttp/hkxpack/releases/tag/v0.1.5-beta)
- MaikCG — F4Biped animation rig: https://www.nexusmods.com/fallout4/mods/16691
- Contributors: CPU, NifTools team, JoshNZ, Kimbale, Caliente/Ousnius (CBBE)
- F4AK guide/wiki mirror: https://wiki.nexusmods.com/index.php/Animation_In_Fallout_4
- Havok animation playlist: https://www.youtube.com/watch?v=PZ5nP8mwzDA&list=PLGGw--fFEeZd5HM9shaaANPuXP9zAgmAN

---

## Cheat Sheet: Common Animation Lengths

| Animation Type | Typical Duration | Frame Count (30 FPS) |
|---|---|---|
| Blink | 0.2 sec | 6 frames |
| Idle breathing | 1-2 sec | 30-60 frames |
| Walk cycle | 0.8-1.2 sec | 24-36 frames |
| Run cycle | 0.4-0.6 sec | 12-18 frames |
| Attack | 0.5-1.5 sec | 15-45 frames |
| Death | 1-3 sec | 30-90 frames |
| Emote gesture | 2-4 sec | 60-120 frames |

---

## Summary

**You can now:**
- ✅ Install Havok tools and HavokMax
- ✅ Create simple animations in 3DS Max
- ✅ Export animations to .hkx format
- ✅ Understand Havok skeleton structure
- ✅ Configure animation properties
- ✅ Troubleshoot common issues

**For deeper learning**, see the complete [HAVOK_ANIMATION_GUIDE.md](HAVOK_ANIMATION_GUIDE.md) for:
- Physics configuration and ragdoll setup
- Advanced behavior graphs
- Complex animation techniques
- Integration with Fallout 4 ecosystems

---

**Edition**: 1.0  
**Last Updated**: January 2026
