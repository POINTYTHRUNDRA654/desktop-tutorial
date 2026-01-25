# Complete Havok Animation Guide for Fallout 4

## Table of Contents
1. What is Havok?
2. Why Use Havok for Fallout 4?
3. Havok in the Fallout 4 Ecosystem
4. Installation & Setup
5. Core Concepts
6. The Havok SDK Overview
7. HavokMax Plugin
8. HavokLib Integration
9. Animation Workflow Basics
10. Troubleshooting & Resources

---

## 1. What is Havok?

**Havok** is a powerful physics and animation middleware engine developed by Autodesk. It provides professional-grade tools for:

- **Physics Simulation**: Realistic collision detection, rigid body dynamics, character physics
- **Character Animation**: Skeletal animation, ragdoll systems, locomotion
- **Cloth & Particles**: Advanced cloth simulation and particle effects
- **Audio-Visual Effects**: Integration with visual effects and sound
- **Performance Optimization**: Multi-platform support with optimized performance

### Havok Products Relevant to Fallout 4

| Product | Purpose | Use Case |
|---------|---------|----------|
| **Havok Physics** | Core physics engine | Collision, gravity, rigid bodies |
| **Havok Animation** | Skeletal animation system | Character movement, blending, IK |
| **Havok Behavior** | State machine system | Complex animation logic and AI |
| **Havok Cloth** | Cloth simulation | Armor, clothing, cape physics |

---

## 2. Why Use Havok for Fallout 4?

### Native Engine Support
Fallout 4's engine (Creation Engine, Gamebryo-based) has Havok integrated at its core:
- All NPC animations use Havok skeletons
- Physics systems rely on Havok collision shapes
- Ragdoll physics powered by Havok
- Behavior trees use Havok's state machine architecture

### Professional Animation Workflow
Havok provides tools that match professional game development:
- **3DS Max Plugin (HavokMax)**: Seamless integration with industry-standard 3D software
- **Behavior Editor**: Visual editing of complex animation states
- **Physics Authoring**: Precise control over collision and physics properties
- **Debugging Tools**: Visualize and debug physics and animation in real-time

### Why It Matters for Modding
Without understanding Havok:
- Custom animations won't work correctly with Fallout 4's physics
- Character models may float, clip, or ragdoll unexpectedly
- Complex behaviors (climbing, mantling, interaction animations) won't function
- Performance issues and crashes can result from improper Havok setup

---

## 3. Havok in the Fallout 4 Ecosystem

### Havok Components in Fallout 4

```
Havok Engine (Creation Engine Integration)
├── Physics System
│   ├── Rigid Body Dynamics
│   ├── Collision Detection (hkpShape)
│   └── Constraints
├── Animation System
│   ├── Skeletal Animation (hkpRigidBody bones)
│   ├── Blending & Layering
│   └── IK (Inverse Kinematics)
├── Behavior System
│   ├── State Machines
│   ├── Event Graphs
│   └── Character Controllers
└── Cloth & Particles
    ├── Cloth Simulation
    └── Particle Dynamics
```

### Key Havok File Formats in Fallout 4

| File Extension | Purpose | Contains |
|----------------|---------|----------|
| `.nif` (Havok embedded) | Mesh & Skeleton | 3D geometry, bones, physics shapes |
| `.hkx` | Havok Data Container | Physics, animation, behavior data |
| `.txt` (Behavior)| Behavior Graph | Animation state machines, events |
| `.xml` (Behavior) | Behavior Authoring | Human-readable behavior definitions |

---

## 4. Installation & Setup

### Prerequisites

- **3DS Max 2018+** (or compatible version)
- **Havok SDK 2010.2.0 or 2012.1** (for Fallout 4 compatibility)
- **HavokMax Plugin** (3DS Max integration)
- **Fallout 4 Creation Kit** (optional but recommended)

### Step 1: Install Havok SDK

1. **Download Havok SDK**
   - Autodesk Havok official website or via GameDev access
   - For Fallout 4: Version 2010.2.0 or 2012.1

2. **Install SDK**
   ```bash
   # Extract to a known location
   # Example: C:\HavokSDK\hk2010_2_0
   ```

3. **Set Environment Variables**
   - `HK_HAVOK_SDK`: Point to your Havok SDK root
   - Add SDK `bin` folder to system PATH

### Step 2: Install HavokMax Plugin

1. **Download HavokMax**
   ```bash
   gh repo clone PredatorCZ/HavokMax
   ```

2. **Build HavokMax**
   ```bash
   cd HavokMax
   cmake -G "Visual Studio 16 2019" -DCMAKE_BUILD_TYPE=Release .
   cmake --build . --config Release
   ```

3. **Install Plugin**
   - Copy built `.dlu` file to 3DS Max plugins folder:
     - Windows: `C:\Program Files\Autodesk\3ds Max [VERSION]\plugins\`

4. **Restart 3DS Max**

### Step 3: Setup HavokLib

1. **Clone HavokLib**
   ```bash
   gh repo clone PredatorCZ/HavokLib
   cd HavokLib
   ```

2. **Build HavokLib**
   ```bash
   mkdir build && cd build
   cmake -G "Visual Studio 16 2019" -DCMAKE_BUILD_TYPE=Release ..
   cmake --build . --config Release
   ```

3. **Library is ready for linking in tools**

---

## 5. Core Concepts

### Havok Skeleton Structure

A Havok skeleton consists of:

```
hkaSkeleton
├── hkaBone (Root)
│   ├── hkaBone (Pelvis)
│   │   ├── hkaBone (Spine) [constraints to parent]
│   │   │   ├── hkaBone (Chest)
│   │   │   │   ├── hkaBone (Left Shoulder)
│   │   │   │   │   ├── hkaBone (Left Arm)
│   │   │   │   │   │   └── hkaBone (Left Hand)
│   │   │   │   │   └── hkaBone (Left Elbow)
│   │   │   │   └── hkaBone (Neck)
│   │   │   │       └── hkaBone (Head)
│   │   │   └── [Right side mirror]
│   │   └── [Other bones]
│   └── [Additional hierarchy]
```

**Key Properties:**
- **Bone Names**: Standardized (Left/Right, consistent naming)
- **Parent Relationships**: Inheritance chain for transformations
- **Constraints**: Limits on rotation/translation per bone
- **Collision Shapes** (hkpShape): Capsules, spheres, boxes defining physical volume

### Havok Animation Data (hkxAnim)

```
hkxAnimation
├── Duration (in frames)
├── Tracks (one per bone)
│   ├── Position Keyframes
│   ├── Rotation Keyframes
│   └── Scale Keyframes
├── Frame Rate (typically 30 FPS)
└── Compression Settings
```

### Havok Physics Shape Hierarchy

```
hkpShape (Abstract)
├── hkpCapsuleShape (cylinders with hemispherical ends)
├── hkpSphereShape (spheres)
├── hkpBoxShape (rectangular boxes)
├── hkpCompoundShape (combination of shapes)
└── hkpMeshShape (triangle mesh, for terrain/static geometry)
```

### Character Controller System

Havok provides a character controller for:
- Ground detection and friction
- Slope walking
- Jumping mechanics
- Collision response
- Speed limiting and acceleration

---

## 6. The Havok SDK Overview

### SDK Structure

```
HavokSDK/
├── bin/
│   ├── havok.dll (Runtime library)
│   └── [various tools]
├── lib/
│   ├── hkBase.lib
│   ├── hkCore.lib
│   ├── hkGeometryUtilities.lib
│   ├── hkPhysics.lib
│   ├── hkAnimation.lib
│   └── [additional libraries]
├── include/
│   ├── Common/
│   │   ├── Base/
│   │   └── Serialize/
│   ├── Physics/
│   │   ├── Collide/
│   │   ├── Dynamics/
│   │   └── Utilities/
│   ├── Animation/
│   │   ├── Animation/
│   │   ├── Ragdoll/
│   │   └── Behavior/
│   └── [other includes]
└── samples/
    ├── AnimationDemo
    ├── PhysicsDemo
    └── [example projects]
```

### Key SDK Libraries

| Library | Purpose |
|---------|---------|
| `hkBase` | Foundation types, memory, serialization |
| `hkCore` | Reflection, type system, containers |
| `hkPhysics` | Physics engine and dynamics |
| `hkAnimation` | Animation systems and controllers |
| `hkBehavior` | Behavior graph execution |
| `hkSceneData` | Scene serialization and loading |

### Havok Serialization Format

Havok data is serialized using a binary format (.hkx):
- **Type Information**: Every object carries metadata
- **Class Hierarchies**: Inheritance preserved in serialization
- **References**: Objects can reference other objects
- **Version Compatibility**: Havok handles version differences

Example structure:
```cpp
struct hkxAnimatedFloat {
  float value;
  enum Type { TYPE_CONSTANT, TYPE_ANIMATED };
  Serialized format includes class descriptor and member metadata
};
```

---

## 7. HavokMax Plugin

### What is HavokMax?

**HavokMax** is an unofficial but powerful 3DS Max plugin by Lukas Cone that provides:
- Native Havok export from 3DS Max
- Physics shape editing and placement
- Animation export with bone constraints
- Behavior graph support
- Real-time Havok physics preview
- Integration with existing 3DS Max workflows

### Installation Details

**Author**: Lukas Cone  
**Repository**: https://github.com/PredatorCZ/HavokMax  
**License**: GNU General Public License v3  
**Current Version**: 1.13  

### Plugin Architecture

```
HavokMax.dlu (3DS Max Plugin)
├── HavokExport.cpp (Export engine)
├── HavokImport.cpp (Import engine)
├── HavokMax.cpp (Main plugin interface)
└── Dependencies
    ├── HavokLib (core serialization)
    ├── 3DS Max SDK
    └── Havok SDK
```

### Key Features

#### Export Capabilities
- **Meshes**: Geometry with materials and textures
- **Skeletons**: Full bone hierarchies with constraints
- **Physics Shapes**: Place and export collision shapes
- **Animation**: Keyframe animation with compression
- **Materials**: Texture references and shader properties

#### Import Capabilities
- **Havok Files**: Load existing .hkx and .nif files
- **Physics Data**: Preview and edit collision shapes
- **Animation Data**: Review imported animations
- **Behavior Graphs**: Load and inspect behavior trees

#### Physics Shape Tools
```
Shape Palette
├── Capsule (most common for bones)
├── Sphere (joints, simple objects)
├── Box (armor parts, rigid pieces)
├── Cylinder (weapons, limbs)
├── List (compound shapes)
└── Convex Hull (custom shapes)
```

### Using HavokMax in Workflow

#### Basic Export Workflow

1. **Setup 3DS Max Scene**
   - Import base mesh and skeleton
   - Create animations on skeleton
   - Apply modifiers and materials

2. **Add Physics Shapes**
   - Select bones to add collision
   - Choose shape type (Capsule for limbs)
   - Adjust size and position
   - Set mass and friction properties

3. **Configure Constraints**
   - Set rotation limits per bone
   - Define friction and damping
   - Configure collision groups

4. **Export**
   ```
   File > Export > Export Selected
   Choose Havok (.hkx) format
   Configure export options:
     - Animation range
     - Compression level
     - Physics fidelity
   ```

5. **Result**
   - .hkx file with all data
   - Can be imported to Fallout 4 NIF files

---

## 8. HavokLib Integration

### What is HavokLib?

**HavokLib** is a C++ library that provides:
- Havok file format parsing (.hkx)
- Physics and animation data structures
- Serialization and deserialization
- Standalone tools for Havok data manipulation
- Direct API for programmatic Havok interaction

### Repository Structure

```
HavokLib/
├── src/
│   ├── hkStd/ (standard library implementations)
│   ├── hkCore/ (core Havok types)
│   ├── hkAnimation/ (animation system)
│   ├── hkPhysics/ (physics system)
│   ├── hkBehavior/ (behavior system)
│   └── hkIO/ (serialization)
├── include/ (public headers)
├── CMakeLists.txt (build configuration)
└── LICENSE (GNU GPL v3)
```

### Using HavokLib Programmatically

#### Example: Load Animation Data
```cpp
#include "hkAnimation/hkaAnimation.h"
#include "hkIO/hkSerializer.h"

int main() {
    // Initialize Havok
    hkMemoryRouter::getInstance().setFrameBufferSize(1024000);
    
    // Load animation file
    hkSerializer serializer;
    hkxScene* scene = serializer.loadScene("animation.hkx");
    
    // Access animation data
    for (int i = 0; i < scene->numAnimations; ++i) {
        hkxAnimation* anim = scene->animations[i];
        float duration = anim->duration;
        int numTracks = anim->numTracks;
        
        // Process animation tracks
        for (int t = 0; t < numTracks; ++t) {
            hkaAnimatedReferenceFrame* track = anim->tracks[t];
            // Access keyframes, rotation, position data
        }
    }
    
    return 0;
}
```

#### Example: Create Physics Shape
```cpp
#include "hkPhysics/hkphysics.h"

// Create a capsule shape for a character limb
hkpCapsuleShape* createLimbShape() {
    hkVector4 bottom(0, 0, 0);
    hkVector4 top(0, 0.5f, 0); // 0.5 unit height
    float radius = 0.1f;
    
    return new hkpCapsuleShape(bottom, top, radius);
}
```

### Building HavokLib

```bash
# Clone repository
git clone https://github.com/PredatorCZ/HavokLib.git
cd HavokLib

# Create build directory
mkdir build && cd build

# Configure with CMake
cmake -G "Visual Studio 16 2019" -DCMAKE_BUILD_TYPE=Release ..

# Build
cmake --build . --config Release

# Result: havoklib.lib and headers ready for linking
```

### Linking HavokLib in Projects

```cmake
# CMakeLists.txt
find_library(HAVOKLIB havoklib REQUIRED)
target_link_libraries(MyProject PRIVATE ${HAVOKLIB})
target_include_directories(MyProject PRIVATE /path/to/HavokLib/include)
```

---

## 9. Animation Workflow Basics

### Complete Workflow for Custom Animation

#### Phase 1: Planning
```
Define Animation
├── Purpose (locomotion, attack, interact)
├── Duration (frames needed)
├── Bones Involved (which bones move)
├── Impact Events (when hit detection occurs)
└── Transitions (how animation starts/ends)
```

#### Phase 2: Modeling
```
1. Reference Gathering
   - Find base character model
   - Study NPC animations
   - Gather reference video/images

2. Skeleton Validation
   - Verify bone hierarchy
   - Check naming conventions
   - Ensure constraints match Fallout 4

3. Animation Creation
   - Block animation (rough keyframes)
   - Polish movement
   - Add subtle details (breathing, weight shift)
   - Refine transitions
```

#### Phase 3: Physics Setup
```
1. Shape Placement
   - Add capsules to limbs
   - Add spheres to joints
   - Configure collision groups

2. Constraint Configuration
   - Set rotation limits per bone
   - Define friction
   - Configure damping

3. Mass and Inertia
   - Set realistic mass values
   - Balance proportions
   - Test ragdoll behavior
```

#### Phase 4: Export
```
1. Configure Export Options
   - Animation frame range
   - Compression level
   - Physics fidelity

2. Export to HKX
   - Generate .hkx file
   - Verify data integrity

3. Integration
   - Embed in NIF file
   - Register in animation behavior tree
   - Test in-game
```

#### Phase 5: Testing & Iteration
```
1. In-Game Testing
   - Verify animation plays
   - Check transitions
   - Monitor physics

2. Refinement
   - Adjust timing if needed
   - Tune physics parameters
   - Fix clipping issues

3. Final Polish
   - Review synchronization
   - Confirm no artifacts
   - Performance verification
```

### Key Animation Parameters

| Parameter | Purpose | Typical Values |
|-----------|---------|-----------------|
| **Frame Rate** | Animation playback speed | 30 FPS (Fallout 4 standard) |
| **Duration** | Total animation length | 10-120 frames (0.3-4 seconds) |
| **Compression** | Reduce file size | Medium-High quality |
| **Blend Time** | Smooth transition in | 0.1-0.5 seconds |
| **Looping** | Animation repeats | Yes/No per animation |

### Common Fallout 4 Animation Types

```
Locomotion (Movement)
├── Idle (standing)
├── Walk (forward/backward)
├── Run (sprint)
├── Sneak (crouched movement)
└── Combat (in-combat stance)

Actions
├── Melee Attack (sword, fist, etc.)
├── Ranged Attack (bow, gun)
├── Spell Cast
├── Block
└── Dodge

Interactions
├── Activate Object (lever, terminal)
├── Pickup Item
├── Consume Food/Drink
├── Crafting Animation
└── Dialogue (talking)

Expressions
├── Emotion (anger, fear, joy)
├── Gesture (pointing, waving)
├── Reaction (pain, shock)
└── Sync (synchronized with other character)
```

---

## 10. Troubleshooting & Resources

### Common Issues

#### Problem: Animation Jitter or Popping
**Causes**:
- Bone constraints too restrictive
- Keyframe spacing inconsistent
- Compression artifacts

**Solutions**:
- Review bone limit settings
- Ensure uniform keyframe intervals
- Reduce compression level

#### Problem: Character Floats or Sinks
**Causes**:
- Root bone not animated correctly
- Physics shapes positioned incorrectly
- Center of mass off

**Solutions**:
- Verify root bone transforms
- Adjust shape sizes and positions
- Rebalance mass distribution

#### Problem: Animation Doesn't Loop
**Causes**:
- Start and end poses not matching
- Blend time too long
- Event timing incorrect

**Solutions**:
- Match first and last keyframes
- Reduce blend time
- Review event markers

#### Problem: Physics Ragdoll Unstable
**Causes**:
- Mass values unrealistic
- Constraint stiffness too high
- Damping values incorrect

**Solutions**:
- Normalize mass values (1-50 for humans)
- Lower constraint stiffness
- Increase damping (0.1-0.5 range)

### Debugging Tools

**HavokMax Preview**
- Real-time physics visualization
- Check ragdoll behavior before export
- Inspect collision shapes visually

**Havok Stand-Alone Tools**
- `hkFileConvert`: Convert between file formats
- `hkVisualize`: View Havok scene data
- `hkxInspector`: Detailed binary inspection

**Fallout 4 Tools**
- **Nifskope**: View and edit NIF files with Havok data
- **Creation Kit**: Test animations in-game context
- **Behavior Editor**: Edit animation state machines

### Learning Resources

**Official Documentation**
- Havok SDK Manual (included with SDK download)
- API Reference (PDF documentation)
- Sample Projects (Animation, Physics, Behavior)

**Community Resources**
- Nexus Mods animation tutorials
- Fallout 4 modding forums
- GitHub repositories (PredatorCZ projects)
- University game development courses

**Practice Projects**
1. Simple idle animation
2. Basic walk cycle
3. Combat animation sequence
4. Complex action sequence
5. Ragdoll setup from scratch

### Credits & Sources
- ShadeAnimator — Fallout 4 Animation Kit (F4AK) and original guide (Nexus: http://www.nexusmods.com/fallout4/mods/16694/?)
- Bizz — 32-bit skeleton/animation conversion workflow and tutorial
- Figment — updated NifTools tools
- Mars — tutorial hosting and support
- DexesTTP — HKXPack/HKXAnim tools (HKXPack v0.1.5-beta: https://github.com/Dexesttp/hkxpack/releases/tag/v0.1.5-beta)
- MaikCG — F4Biped animation rig: http://www.nexusmods.com/fallout4/mods/16691/?
- Contributors: CPU, NifTools team, JoshNZ, Kimbale, Caliente/Ousnius (CBBE)
- F4AK guide/wiki mirror: http://wiki.nexusmods.com/index.php/Animation_In_Fallout_4
- Havok animation playlist: https://www.youtube.com/watch?v=PZ5nP8mwzDA&list=PLGGw--fFEeZd5HM9shaaANPuXP9zAgmAN

---

## Quick Reference

### File Types Checklist

- [x] `.nif` files contain embedded Havok data
- [x] `.hkx` files contain pure Havok containers
- [x] `.txt` behavior files define animation states
- [x] `.xml` behavior files are human-readable versions

### Installation Checklist

- [ ] Havok SDK downloaded and installed
- [ ] HavokMax plugin built and copied to 3DS Max plugins
- [ ] 3DS Max restarted after plugin installation
- [ ] HavokLib built and ready for linking
- [ ] Environment variables configured

### Animation Creation Checklist

- [ ] Reference material gathered
- [ ] Skeleton hierarchy verified
- [ ] Bone naming conventions confirmed
- [ ] Animation blocked out
- [ ] Physics shapes placed
- [ ] Constraints configured
- [ ] Export settings verified
- [ ] File tested in Fallout 4

### Export Configuration Template

```
Export Settings:
- Animation Range: [START] to [END] frames
- Frame Rate: 30 FPS
- Compression: Medium (0.001 error)
- Include Physics: Yes
- Behavior Data: Yes
- Texture References: Yes
```

---

## Summary

Havok is the physics and animation backbone of Fallout 4. Understanding its structure, tools, and workflows enables:

- **Professional Animation**: Industry-standard tools and practices
- **Physics Accuracy**: Realistic ragdoll and collision behavior
- **Complex Behaviors**: State machine-driven animation logic
- **Performance**: Optimized game engine integration

With HavokMax and HavokLib, you have everything needed to create professional animations for Fallout 4 mods.

---

**Version**: 1.0  
**Last Updated**: January 2026  
**License**: This guide is provided for educational purposes. Havok is proprietary software by Autodesk; refer to official Havok SDK license.
