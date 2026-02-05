# Havok Animation for Fallout 4: Advanced Integration Guide

**Professional animation workflows, FO4-specific systems, and advanced Havok integration techniques.**

---

## Part 1: Fallout 4 Animation Architecture

### The Creation Engine's Animation System

Fallout 4 uses the **Creation Engine** (evolved Gamebryo), with Havok deeply integrated:

```
Creation Engine
├── Havok Physics Core
│   ├── Character Physics Controller
│   │   ├── Gravity & Ground Detection
│   │   ├── Collision Response
│   │   └── Movement Constraints
│   ├── Rigid Body Dynamics
│   │   ├── Ragdoll Physics
│   │   ├── Destructible Objects
│   │   └── Cloth Simulation
│   └── Collision System
│       ├── Shape Types (Capsule, Sphere, Box)
│       ├── Collision Layers (Character, Object, Terrain)
│       └── Convex Hull Generation
├── Havok Animation System
│   ├── Skeletal Animation
│   │   ├── Bone Hierarchies
│   │   ├── Keyframe Interpolation
│   │   ├── Inverse Kinematics (IK)
│   │   └── Animation Blending
│   ├── Animation Behavior
│   │   ├── State Machines
│   │   ├── Transition Logic
│   │   └── Event Handling
│   └── Character Controllers
│       ├── Idle/Walk/Run States
│       ├── Combat Stance
│       └── Custom Controllers
└── Audio-Visual Integration
    ├── Animation Events (sound triggers)
    ├── Effect Spawning
    ├── Impact Detection
    └── Timing Synchronization
```

### The 3 Levels of Fallout 4 Animation

#### Level 1: Static Animations (.nif embedded)
Simple animations embedded directly in mesh files. Used for:
- Furniture sitting/sleeping
- Terminal interaction
- Door opening
- Simple idle variants

**Files**: `meshes/interiors/objects/` (typically)

#### Level 2: Behavior-Driven Animations
Complex state-machine animations with multi-state logic. Used for:
- Combat animations
- Movement (walk, run, sneak)
- Complex interactions
- Dynamic response animations

**Files**: `meshes/actors/character/behaviors/` and behavior graph definitions

#### Level 3: Advanced Character Control
Full AI-driven animation with physics blending. Used for:
- NPC behavior response
- Environmental interaction
- Physics ragdoll transitions
- Complex AI states

**Files**: Behavior graphs + physics configurations + animation files

---

## Part 2: Fallout 4 Skeleton Structure

### Standard Fallout 4 Character Skeleton

Fallout 4 uses a highly specialized skeleton for characters:

```
Root (0,0,0 origin)
│
└─ NPC Root [Pelvis parent]
   ├─ Pelvis [PRIMARY CONTROL BONE]
   │  ├─ Spine [Lower Back - L3/L4]
   │  │  ├─ Spine1 [Mid Back - T8/T9]
   │  │  │  ├─ Spine2 [Upper Back - T1]
   │  │  │  │  ├─ Neck [Cervical]
   │  │  │  │  │  ├─ Head [Main Head]
   │  │  │  │  │  ├─ HeadTrack [Secondary - tracking)
   │  │  │  │  │  └─ Eyes [Eye target]
   │  │  │  │  │
   │  │  │  │  ├─ LClavicle [Left Shoulder Socket]
   │  │  │  │  │  ├─ LUpperArm [Shoulder to Elbow]
   │  │  │  │  │  │  ├─ LForeArm [Elbow to Wrist]
   │  │  │  │  │  │  │  └─ LHand [Hand Bone]
   │  │  │  │  │  │  │     ├─ LIndex[1-3]
   │  │  │  │  │  │  │     ├─ LMiddle[1-3]
   │  │  │  │  │  │  │     ├─ LPinky[1-3]
   │  │  │  │  │  │  │     ├─ LRing[1-3]
   │  │  │  │  │  │  │     └─ LThumb[1-3]
   │  │  │  │  │  │  └─ LWeapon [Weapon Slot Anchor]
   │  │  │  │  │  │
   │  │  │  │  │  └─ RClavicle (mirror of LClavicle)
   │  │  │  │  │     └─ RUpperArm, RForeArm, RHand (finger bones), RWeapon
   │  │  │  │  │
   │  │  │  │  └─ WeaponBack [Back Weapon Slot]
   │  │  │  │
   │  │  │  └─ Chest [Armor Tracking - optional for some models]
   │  │  │
   │  │  └─ [Additional Spine Variants depending on race]
   │  │
   │  ├─ LThigh [Upper Leg - Femur]
   │  │  ├─ LCalf [Lower Leg - Tibia]
   │  │  │  ├─ LFoot [Foot]
   │  │  │  │  ├─ LToe
   │  │  │  │  └─ LBallOfFoot
   │  │  │  └─ LFootIK [IK Target]
   │  │  │
   │  │  └─ LWeapon [Leg Weapon Slot - if used]
   │  │
   │  └─ RThigh (mirror of LThigh)
   │     └─ RCalf, RFoot, RToe, RBallOfFoot, RFootIK
   │
   └─ Root + Variations
      ├─ Tail [If race has tail]
      ├─ Wings [If race has wings]
      └─ [Other unique bones per race]
```

### Key Bone Groups by Function

#### Control Bones (Primary Animation Points)
```
Core Movement (Pelvis drives movement):
- Pelvis: Main character position & rotation
- Root: Secondary control point

Upper Body (Spine-driven):
- Spine, Spine1, Spine2: Torso rotation & lean
- Neck, Head: Head direction

Upper Limbs (Arm movement):
- LClavicle/RClavicle: Shoulder positioning
- LUpperArm/RUpperArm: Upper arm rotation
- LForeArm/RForeArm: Forearm rotation
- LHand/RHand: Hand positioning
```

#### Lower Limbs (Locomotion)
```
Legs drive forward/backward movement:
- LThigh/RThigh: Hip angle
- LCalf/RCalf: Knee angle
- LFoot/RFoot: Foot angle
- LToe/RToe: Toe angle (running animation detail)
```

#### Weapon Slots (Item Positioning)
```
Weapon anchors (position items without affecting animations):
- LWeapon: Left hand weapon attachment
- RWeapon: Right hand weapon attachment
- WeaponBack: Back weapon slot (sword, bow)
- LWeapon (leg): Leg-mounted weapon (rarely used)
```

#### Finger Bones (High Detail)
```
Each hand has 5 fingers with 3 bones each:
- LIndex1, LIndex2, LIndex3 (index finger)
- LMiddle1, LMiddle2, LMiddle3 (middle finger)
- LRing1, LRing2, LRing3 (ring finger)
- LPinky1, LPinky2, LPinky3 (pinky finger)
- LThumb1, LThumb2, LThumb3 (thumb)

(Same for right hand: R prefix)

Note: Most animations ignore finger bones
(too expensive to animate all 30 finger bones)
```

---

## Part 3: Fallout 4 Behavior Graphs

### What are Behavior Graphs?

**Behavior Graphs** are state machines that define HOW animations play, WHEN they play, and HOW they transition.

```
Behavior Graph (simplified example):

Combat Behavior State Machine:
┌─────────────────────────────────┐
│         IDLE_COMBAT             │
│  (Ready Stance, Weapon Up)      │
└──────────┬──────────────────────┘
           │ (OnCombatStart)
           ↓
┌─────────────────────────────────┐
│    COMBAT_READY_STANCE          │
│ (Stand With Weapon - Loop)      │
├─────────────────────────────────┤
│ Transitions:                    │
│ - OnHit → REACT_HIT             │
│ - OnAttack → ATTACK_RIGHT       │
│ - OnDodge → DODGE_ROLL          │
│ - OnMove → COMBAT_WALK          │
└──────────┬──────────────────────┘
           │
       (OnAttack)
           ↓
┌─────────────────────────────────┐
│    ATTACK_RIGHT_1 (0-20 frames) │
│ (Swing animation)               │
├─────────────────────────────────┤
│ Event at frame 12:              │
│ - Fire "OnHit" event            │
│   (triggers impact damage)      │
└──────────┬──────────────────────┘
           │
      (End of animation)
           ↓
   (Return to COMBAT_READY)
```

### Behavior File Structure (XML Format)

```xml
<?xml version="1.0" encoding="utf-8"?>
<hkobject>
  <hkparam name="characterPropertyValues">
    <!-- Character parameters -->
    <hkobject>
      <hkparam name="propertyId">0</hkparam>
      <hkparam name="value">
        <hkobject class="hkbVariableValue">
          <hkparam name="value">1.0</hkparam>
        </hkobject>
      </hkparam>
    </hkobject>
  </hkparam>
  
  <hkparam name="stringData">
    <!-- Animation binding (link animation file to state) -->
    <hkobject>
      <hkparam name="value">Idle_Combat</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="value">Attack_Right_1</hkparam>
    </hkobject>
  </hkparam>
  
  <hkparam name="eventInfo">
    <!-- Define custom events -->
    <hkobject>
      <hkparam name="id">OnAttack</hkparam>
      <hkparam name="payload">null</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="id">OnHit</hkparam>
      <hkparam name="payload">DamageInfo</hkparam>
    </hkobject>
  </hkparam>
  
  <hkparam name="transitions">
    <!-- State transitions -->
    <hkobject>
      <hkparam name="fromStateId">IDLE_COMBAT</hkparam>
      <hkparam name="toStateId">ATTACK_RIGHT_1</hkparam>
      <hkparam name="transitionEvent">OnAttack</hkparam>
      <hkparam name="blendTime">0.05</hkparam>
    </hkobject>
  </hkparam>
</hkobject>
```

---

## Part 4: Animation Events & Synchronization

### What are Animation Events?

**Events** are markers within animations that trigger game logic:

```
Attack Animation Timeline:
┌──────────────────────────────────────┐
│ Attack_Right_1 (30 frames)           │
├──────────────────────────────────────┤
│ Frame 0:   Start (blend in)          │
│ Frame 5:   Weapon starts moving      │
│ Frame 12:  ★ IMPACT EVENT ★          │
│            └─ Triggers: Damage calc  │
│               Sound effect           │
│               Hit effect spawn       │
│ Frame 15:  Peak power moment         │
│ Frame 20:  Weapon retracting         │
│ Frame 25:  Ready for next action     │
│ Frame 30:  End (return to ready)     │
└──────────────────────────────────────┘
```

### Common Fallout 4 Animation Events

| Event | Trigger Point | Effect |
|-------|---|---|
| `AttackStart` | Frame 0 | Combat animation begins |
| `AttackImpact` | Mid-swing | Damage roll, hit effects |
| `AttackEnd` | End of swing | Reset for next action |
| `FootstepLeft` | Left foot down | Footstep sound |
| `FootstepRight` | Right foot down | Footstep sound |
| `SoundPlay:[filename]` | Specified frame | Play sound effect |
| `EffectSpawn:[effectname]` | Specified frame | Spawn visual effect |
| `ArrowRelease` | Frame of release | Fire projectile |
| `ReloadStart` | Reload begins | Weapon reload animation |
| `InteractionStart` | Frame 0 | Object interaction begins |
| `InteractionEnd` | Final frame | Interaction complete |

### Adding Events to HavokMax Animations

```
In 3DS Max:

1. Go to frame where event should occur
2. Havok > Animation Events > Add Event
3. Select event type from list
4. Specify parameters (sound file, effect name)
5. Set timing offset if needed
6. Export with animation

Result: .hkx file includes event markers
Game triggers events during playback
```

---

## Part 5: Installing Animations in Fallout 4

### File Organization Workflow

```
Your Mod Folder Structure:
└─ YourModName\
   ├─ meshes\
   │  └─ actors\character\
   │     ├─ animations\
   │     │  ├─ Idle_Subtle.hkx
   │     │  ├─ Attack_Right_1.hkx
   │     │  └─ Walk_Forward.hkx
   │     ├─ behaviors\
   │     │  └─ Character_Behaviors.xml
   │     └─ CharacterAssets\
   │        └─ skeleton.nif [with embedded animations]
   │
   └─ meshes\
      └─ interiors\objects\
         ├─ YourCustomObject.nif [with idle animation]
         └─ [other objects]
```

### Embedding Animation in NIF Files

#### Method 1: Using Nifskope

```
1. Open base model NIF in Nifskope
2. Block > Attach > Havok Data
3. Right-click HavokData block > Edit
4. Set Animation Index to your animation
5. Click OK
6. File > Save
```

#### Method 2: Using HavokMax Export

```
In 3DS Max:

1. Import base mesh + skeleton
2. Import animations (or create them)
3. File > Export > Export Selected
4. Choose NIF format
5. Enable: "Embed Havok Data"
6. Select animation to embed
7. Export complete NIF with embedded animation
```

### Registering Animations in Behavior Graphs

```xml
<!-- custom_behaviors.xml -->
<?xml version="1.0" encoding="utf-8"?>
<hkobject>
  <hkparam name="stringData">
    <!-- Animation names (referenced by indices) -->
    <hkobject>
      <hkparam name="value">YourNewAnimation_Idle</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="value">YourNewAnimation_Attack</hkparam>
    </hkobject>
  </hkparam>
  
  <hkparam name="transitions">
    <!-- Transitions that use your animations -->
    <hkobject>
      <hkparam name="animationIndex">0</hkparam> <!-- Idle -->
      <hkparam name="toStateId">YOUR_IDLE_STATE</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="animationIndex">1</hkparam> <!-- Attack -->
      <hkparam name="toStateId">YOUR_ATTACK_STATE</hkparam>
    </hkobject>
  </hkparam>
</hkobject>
```

---

## Part 6: Advanced Havok Techniques

### Physics Shape Configuration for Characters

#### Ragdoll Setup (Complete Body)

```
Human Character Ragdoll:

Head Group:
- Shape: Sphere, Radius: 0.12m, Mass: 2kg

Spine Group (connected in series):
- Spine: Capsule, Height: 0.15m, Radius: 0.06m, Mass: 8kg
- Chest: Capsule, Height: 0.12m, Radius: 0.07m, Mass: 6kg

Arm Group (each side):
- Upper Arm: Capsule, Height: 0.25m, Radius: 0.05m, Mass: 4kg
- Forearm: Capsule, Height: 0.22m, Radius: 0.04m, Mass: 2kg
- Hand: Sphere, Radius: 0.05m, Mass: 0.8kg

Leg Group (each side):
- Thigh: Capsule, Height: 0.35m, Radius: 0.08m, Mass: 6kg
- Calf: Capsule, Height: 0.30m, Radius: 0.06m, Mass: 4kg
- Foot: Box, Size: (0.06, 0.04, 0.2), Mass: 1kg

Total Mass: ~60kg (realistic for adult human)
```

#### Constraint Types and Configuration

```
Ragdoll Constraints:

Type: Point-to-Point (Ball Joint)
┌──────────────────────────────────┐
│ Chest <--●--> Neck               │
│ Position: Relative offset        │
│ Max Angular Error: 10°           │
│ Stiffness: 0.8                   │
└──────────────────────────────────┘

Type: Hinge (Limited Rotation)
┌──────────────────────────────────┐
│ Upper Arm <--●--> Forearm        │
│ Axis: X (allows elbow bend)      │
│ Min Angle: -120°                 │
│ Max Angle: 15°                   │
│ Stiffness: 0.9                   │
└──────────────────────────────────┘

Type: Cone Twist (Shoulder Movement)
┌──────────────────────────────────┐
│ Chest <--●--> Upper Arm          │
│ Cone Angle: 60° (shoulder range) │
│ Twist Angle: 90° (rotation)      │
│ Stiffness: 0.7                   │
└──────────────────────────────────┘
```

### Character Controller Integration

```
Havok Character Controller:
┌─────────────────────────────────┐
│ Character Controller (hkpCharacterContext)
├─────────────────────────────────┤
│ Manages:
│ - Gravity application
│ - Ground detection
│ - Slope walking
│ - Jump mechanics
│ - Collision response
│ - Speed limiting
│
│ Usage in Fallout 4:
│ 1. Movement input → Controller processes
│ 2. Controller updates character position
│ 3. Animation blends to match movement
│ 4. Physics validates position
└─────────────────────────────────┘
```

---

## Part 7: Animation Blending & Layering

### Blend Space Concept

Animations can blend smoothly between states:

```
Walk to Run Transition (2 seconds):

Frame 0:   Walk_Forward fully
           │████░░░░░░░
           
Frame 10:  45% Walk, 55% Run
           │█████████░░
           
Frame 20:  Run_Forward fully
           │░░░░░░░░███

Blend Parameters:
- Blend time: 2 seconds (60 frames at 30 FPS)
- Curve: Linear interpolation
- Source state: Walk_Forward
- Target state: Run_Forward
```

### Animation Layers (Advanced)

Fallout 4 supports animation layering:

```
Complete Combat Animation Stack:

Layer 1 (Base): Walk/Run/Idle locomotion
Layer 2 (Upper Body): Weapon attack
Layer 3 (Fine Detail): Head look-at tracking
Layer 4 (Expression): Emotion/stress response

Result: Complex, realistic animation without separate animations
for every combination (walk+attack+look+stress, etc.)
```

### IK (Inverse Kinematics) Systems

IK allows automatic foot placement and hand positioning:

```
IK Foot Placement:

Walking up stairs:
Without IK: Foot penetrates stair
With IK:    Foot bends ankle to match stair height

IK Hand Placement:

Picking up object:
Without IK: Hand doesn't grip object properly
With IK:    Hand follows object position, fingers curl correctly

Implementation in Havok:
1. Define IK targets (foot targets, hand targets)
2. Set joint limits
3. Run IK solver
4. Animation updates to match targets
```

---

## Part 8: Performance Optimization

### Animation File Size Optimization

```
Compression Settings in HavokMax:

Compression Level: HIGH
├─ Error Threshold: 0.01 (units²)
├─ Key Reduction: Aggressive
└─ Result: 50-70% file size reduction

Compression Level: MEDIUM
├─ Error Threshold: 0.001
├─ Key Reduction: Moderate
└─ Result: 30-50% reduction (recommended)

Compression Level: LOW
├─ Error Threshold: 0.0001
├─ Key Reduction: Minimal
└─ Result: 10-20% reduction (best quality)
```

### Bone Importance Hierarchy

Not all bones need high-quality animation:

```
High Priority (Full Detail):
- Pelvis (movement control)
- Spine (upper body control)
- Head (visibility in cutscenes)
- Hands (visible in first person)

Medium Priority (Standard):
- Upper/Lower Arms
- Thighs, Calves (movement)

Low Priority (Can Compress):
- Finger bones (usually not visible/moving much)
- Toes (rarely visible)
- Small detail bones
```

### Creation Kit Performance Monitoring

```
When testing custom animations:

FPS Monitor:
- Baseline (vanilla): 60 FPS (uncapped)
- Custom animation: should maintain >45 FPS
- Many custom animations: cumulative impact

Memory Usage:
- Single animation: ~100KB-500KB
- Behavior graph: ~50-200KB
- Total character mod: plan for <10MB

Loading Time:
- Animation load time: should be <100ms
- Behavior graph compile: <500ms
- Test in-game to verify responsiveness
```

---

## Part 9: Common Fallout 4 Animation Issues & Fixes

### Issue: Animation Pops or Jumps

**Symptom**: Character suddenly jerks when entering animation

**Causes**:
- First keyframe doesn't match previous animation's last pose
- Blend time too short for smooth transition
- Bone constraint violated (bone rotates beyond limits)

**Solutions**:
```
Fix 1: Match Entry Pose
- Record exit pose of previous animation
- Set first keyframe of new animation to match exactly

Fix 2: Increase Blend Time
- Change blend time from 0.05 to 0.2 seconds
- Longer blend = smoother transition

Fix 3: Check Constraints
- Verify rotation limits allow the starting pose
- Adjust constraint angles if needed
- Re-export animation
```

### Issue: Character Floats or Sinks

**Symptom**: Character hovers above or clips below ground

**Causes**:
- Root bone position keyframes incorrect
- Pelvis height calculation wrong
- Physics shapes positioned incorrectly

**Solutions**:
```
Fix 1: Verify Root Bone
- Frame 0: Root position should be (0, 0, 0)
- Frame N: Root position should match movement direction
- Export using "Root Motion" option

Fix 2: Check Pelvis Height
- Standard: ~0.9m above ground for standing
- Verify against reference model
- Adjust if character is off-ground

Fix 3: Physics Shape Positioning
- Reposition Havok shapes to match actual body
- Adjust capsule lengths/radii
- Test ragdoll in Havok preview
```

### Issue: Animation Doesn't Loop Properly

**Symptom**: Jerky transitions when animation repeats

**Causes**:
- Start pose ≠ End pose
- Loop event not defined
- Behavior graph transition is delayed

**Solutions**:
```
Fix 1: Perfect Loop
- Copy Frame 0 keyframes to Frame N+1
- Behavior will blend smoothly at loop point

Fix 2: Define Loop Event
- Mark animation as "Loop = Yes"
- Set blend time for loop point: 0.1-0.2 sec

Fix 3: Behavior Graph
- Verify transition back to self is configured
- Check event triggers correctly at end
```

### Issue: Ragdoll Unstable or Explodes

**Symptom**: When character goes ragdoll, they flail or fly away

**Causes**:
- Mass distribution unrealistic
- Constraints too stiff
- Damping too low
- Initial velocity too high

**Solutions**:
```
Fix 1: Balance Mass
- Head: 2kg, Torso: 20kg, Arms: 3kg each, Legs: 6kg each
- Total: realistic for adult human (~60kg)

Fix 2: Adjust Stiffness
- Reduce constraint stiffness: 0.8 → 0.6
- Increase damping: 0.1 → 0.3
- Results in "floppy" but stable ragdoll

Fix 3: Limit Initial Velocity
- Ragdoll initial velocity cap: 5 m/s
- Prevent excessive forces in behavior

Fix 4: Test in Preview
- Use Havok preview in HavokMax
- Verify ragdoll behavior before export
```

---

## Part 10: Integration Checklist

### Pre-Export Verification

```
Animation Quality
□ No bone clipping or penetration
□ Smooth keyframe curves (use smooth tangents)
□ Duration appropriate for animation type
□ Frame rate set to 30 FPS
□ Blend times configured (typical: 0.1-0.2 sec)

Physics Configuration
□ All animated bones have collision shapes
□ Mass values realistic and balanced
□ Constraints don't exceed rotation limits
□ Constraint stiffness tested in preview

Events & Synchronization
□ Impact events placed at correct frames
□ Sound event triggers verified
□ Effect spawning timed correctly
□ Behavior transitions defined

File Organization
□ Animation file named clearly
□ File placed in correct mod folder
□ Behavior graph updated with new animation
□ Paths in behavior graph correct
```

### Post-Export Testing

```
In Creation Kit
□ Load behavior with custom animation
□ Verify animation plays
□ Check transitions work smoothly
□ Monitor for floating/sinking
□ Test ragdoll functionality
□ Verify events trigger (damage at correct frame, etc.)
□ Performance acceptable (>45 FPS)

In Game
□ Test with actual game physics
□ Verify NPC animation plays correctly
□ Check interaction animations work
□ Test equipment interactions
□ Verify ragdoll death response
□ Look for any animation jittering
```

---

## Part 11: Advanced Fallout 4 Topics

### Furniture Animations

Furniture animations are special – character must match furniture shape:

```
Furniture Animation Setup:

1. Get furniture marker position from furniture NIF
   - Chair height, angle, positioning

2. Create animation with character approaching
   - Walk to marker
   - Sit down (IK legs match seat height)
   - Stay seated (idle in chair)
   - Stand up
   - Walk away

3. Define entry/exit points
   - Transition to sitting state
   - Transition from sitting state

4. Test in Creation Kit
   - Furniture animation blends properly
   - Character doesn't clip through chair
   - Exit animation smooth
```

### Custom Race Animations

Different races have different skeletons:

```
Custom Race Considerations:

Standard Human (Fallout 4 base):
- Skeleton height: ~1.8m
- Spine bones: Spine, Spine1, Spine2
- Finger bones: Standard 30 total

Custom Race (Shorter):
- Skeleton height: ~1.2m
- May have different spine layout
- Joint positions differ
- Animation keyframes may need scaling

Solution:
- Scale animation to new character height
- Re-adjust physics shapes
- Test in Creation Kit with custom race
```

### Behavior Graph Visual Editors

While editing XML is possible, visual editors help:

```
Available Tools:

1. Havok Behavior Editor (official, complex)
   - Visual state machine design
   - Event graph creation
   - Full feature set

2. Community Tools (simpler, limited)
   - State transition visualization
   - Basic event setup

3. Manual XML Editing (complete control)
   - Direct XML file manipulation
   - Requires understanding structure
   - Version control friendly
```

---

## Part 12: Resource Management

### Havok File Sizes Reference

```
Typical Fallout 4 Animation Files:

Simple Idle (30 frames):
- No compression: 15KB
- Medium compression: 8KB
- High compression: 5KB

Walk Cycle (32 frames, full body):
- No compression: 45KB
- Medium compression: 20KB
- High compression: 12KB

Attack Sequence (40 frames, upper body):
- No compression: 35KB
- Medium compression: 15KB
- High compression: 9KB

Complex Behavior Graph:
- Standalone: 50-200KB
- With multiple animations: 500KB-2MB

Total Mod Budget Suggestion:
- Animations: <10MB
- Behavior graphs: <5MB
- Mesh assets: <20MB
- Total: <50MB for reasonable mod
```

### Version Control Considerations

```
Git Tracking:

Include in Version Control:
✓ XML behavior files (text, compresses well)
✓ Source 3DS Max files (.max)
✓ Documentation and guides
✓ Configuration files

Exclude from Version Control:
✗ .hkx files (binary, large, regenerable)
✗ .nif files (binary, large, regenerable)
✗ Exported assets (regenerate from source)
✗ Temporary HavokMax backup files

Workflow:
1. Commit source files (.max, .xml)
2. Generate .hkx / .nif during build
3. Deploy built assets to mod folder
4. Store final .hkx/.nif in releases only
```

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

## Summary: Mastery Path

### Level 1: Basic (This Guide)
- ✅ Understand Havok in Fallout 4
- ✅ Create simple animations
- ✅ Export and embed in NIF
- ✅ Test basic behavior

### Level 2: Intermediate
- Add physics shapes and constraints
- Create behavior graphs with state machines
- Implement animation events
- Test complex interactions

### Level 3: Advanced
- Master IK and animation blending
- Optimize performance extensively
- Create custom race animations
- Design AI behavior systems

### Level 4: Expert
- Extend behavior graph systems
- Create physics-based character controllers
- Design complex animation trees
- Optimize entire animation pipelines

---

**Next: See [HAVOK_QUICK_START_GUIDE.md](HAVOK_QUICK_START_GUIDE.md) to get started immediately.**

**Version**: 1.0  
**Scope**: Professional Fallout 4 animation development  
**Updated**: January 2026
