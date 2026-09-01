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

## Part 13: Community Animation Frameworks — Patching Your Mod In

Some of the best animation mods in the FO4 community expose a **keyword-based patching API** — meaning you can make your mod's items play their custom animations without ever touching the animation mod's files. This section documents how to use the two most important ones.

---

### Immersive Animation Framework (IAF) — Ingestible Animations

**Mod:** Immersive Animation Framework by AnotherOne | Nexus #50555  
**What it adds:** Full 1st/3rd person eat, drink, and drug-use animations for all vanilla ingestibles — plus a keyword system any mod author can use to hook their items in.

See `RECOMMENDED_MODS_LIST.md` for full credits, permissions, and install notes.

#### How IAF's Keyword System Works

IAF detects what animation to play by checking which **keywords** are present on the `ALCH` (consumable) record being used. You do **not** modify IAF's files. You only add keywords to your own item records.

#### Adding Keywords in xEdit

1. Open xEdit with your mod loaded alongside `IAF.esp` (or whatever the IAF plugin is named).
2. Navigate to your `ALCH` record.
3. Right-click the `Keywords (KWDA)` subrecord → Add.
4. Type or paste the IAF keyword FormID/EditorID for the animation category that fits your item.
5. Save.

#### IAF Keyword Categories

| Keyword EditorID | Animation Played | Use For |
|---|---|---|
| `IAF_kFood` | Generic food eating animation | Solid food items |
| `IAF_kDrink` | Generic drinking animation | Liquid bottles and cans |
| `IAF_kNukaCola` | Nuka-Cola bottle tilt animation | Any Nuka-Cola variant |
| `IAF_kWater` | Water drinking animation | Water items (dirty, purified, etc.) |
| `IAF_kDrug` | Drug injection/inhalation animation | Chems, stimpaks, RadAway |
| `IAF_kPsycho` | Psycho rage animation (threat-response) | Psycho and psycho-type drugs |
| `IAF_kMilk` | Milk bottle animation | Extension base — milk-type items |
| `IAF_kBandage` | Bandage wrap animation | Extension base — medical wraps |
| `IAF_kDoctorBag` | Doctor bag use animation | Extension base — doctor bags |
| `IAF_kSarsaparilla` | Vim/Sasparilla bottle animation | Vim! and Sarsaparilla variants |
| `IAF_kWaterBottle` | FO3/NV-style water bottle animation | Retro water bottle items |
| `IAF_kWaterFlask` | Canteen/flask animation | Canteen and flask items |
| `IAF_kNukaBottleWater` | Empty Nuka bottle filled with water | Repurposed Nuka bottles |

> **Note:** Always verify keyword EditorIDs in xEdit against the IAF plugin you have installed — the author may have updated them between versions. The EditorIDs above reflect the current release as of 2026.

#### CK Method (Alternative to xEdit)

1. Open the CK with IAF as an active file (or as a master).
2. Open your `ALCH` record → Keywords tab.
3. Click the keyword picker → search for `IAF_` → add the matching keyword.
4. Save your plugin.

#### Minimal Papyrus Patch (if xEdit/CK method isn't sufficient)

For dynamically spawned items (e.g., items added at runtime by a script), you can add keywords via Papyrus if the item is a non-base-game form:

```papyrus
; Add IAF keyword to a custom item at runtime (only works on non-reference forms you own)
Form Property MyCustomFood Auto
Keyword Property IAF_kFood Auto     ; fill with the IAF keyword form

Event OnInit()
    ; Note: AddKeyword is only available via F4SE extension — check F4SE Papyrus docs
    ; For most cases, just add the keyword directly in xEdit instead
EndEvent
```

For most mods the xEdit/CK method is cleaner — runtime keyword injection requires F4SE and is rarely needed.

#### Testing Your Patch

1. Load the game with your patched ESP and IAF both active.
2. Spawn your item via console: `player.additem [FormID] 1`
3. Consume the item.
4. Verify the correct animation plays in both 1st and 3rd person.
5. Test multiple times — IAF randomizes animation variants, so play it 4–5 times to see the full set.

---

### First-Person Swimming Animations — No Patching Required

**Mod:** First-Person Swimming Animations by neeher | Nexus #62123  
**What it adds:** Visible player arms in all first-person swimming animations.

See `RECOMMENDED_MODS_LIST.md` for full credits, permissions, and install notes.

This mod replaces vanilla `.hkx` behavior files for the player swimming state — it requires no patching and has no keyword API. If you are creating a **custom player race** or a mod that **replaces the player skeleton**, test swimming animations to confirm compatibility. The mod installs via ESL, loose files, or archive — see the recommended mods list for which to choose.

**Known behavior graph limitation:** The vanilla FO4 behavior graph has no strafing or backward-swimming states. This mod (and any swimming animation mod) defaults to the idle swimming pose for those directions — this is an engine constraint, not a mod flaw.

---

### Kicks And Punches — Unarmed Animation Replacer

**Mod:** Kicks And Punches — Unarmed Animations Mod by Flovici (Florent Leibovici) | Nexus #45402  
**What it adds:** Martial arts replacer for all unarmed/boxing glove combat animations — kicks, backflip, power punch.

See `RECOMMENDED_MODS_LIST.md` for full credits, permissions, and install notes.

This is the simplest possible animation mod architecture and an excellent study reference:

#### How It Works (Pure Directory Replacer)

No plugin, no keywords, no F4SE. The mod works by placing replacement `.hkx` files directly into the vanilla animation directories that the behavior graph already points to:

```
Data\Meshes\Actors\Character\Animations\BoxingGlove\   ← boxing gloves / knuckles
Data\Meshes\Actors\Character\Animations\H2H\           ← hand-to-hand (bare fist)
```

The Creation Engine's behavior graph references these paths by convention. When your file is present at the expected path, it is loaded in place of the vanilla file — no record changes needed.

#### What Mod Authors Can Learn From This

- **Animation directory conventions**: `Meshes\Actors\Character\Animations\[WeaponType]\` is the standard path the behavior graph uses for weapon-type–specific animations.
- **Shared actor pools**: Replacing an animation in these directories affects **all humanoid actors** that use the same behavior graph — not just the player. If you want player-only animations, you need a framework like Open Animation Replacer (OAR).
- **No-plugin distribution**: For a pure animation replacer with no new records, no plugin is the cleanest approach. BA2 archive or loose files, installed via Vortex or manual copy.
- **Permissions to build on**: Flovici's mod has notably open permissions — modification, asset use, and DP-earning are all allowed with credit. This makes it a legal foundation for derivative unarmed animation projects.

#### Compatibility Pattern

```
Unarmed animation priority (highest to lowest):
  1. Open Animation Replacer (OAR) conditions — if installed
  2. Files in Data\Meshes\Actors\Character\Animations\H2H\ or \BoxingGlove\
  3. Vanilla behavior graph defaults (BA2-packed vanilla files)
```

This mod sits at level 2. OAR (if installed) can override it per-condition. It coexists cleanly with **Unarmed Gameplay Overhaul** because that mod changes stats and perks, not animation files.

---

### NAF — Native Animation Framework (ESP-less Packs & Face Animations)

**Mod:** Native Animation Framework by Snapdragon (Deweh) | Nexus #73889  
**What it adds:** A complete multi-character animation framework built in native F4SE C++ — successor to AAF.

See `RECOMMENDED_MODS_LIST.md` for full credits, permissions, requirements, and install notes.

#### Creating an ESP-less Animation Pack for NAF

NAF can play any HKX animation without a plugin by referencing file paths directly in XML. Place XML files in `Data\NAF\` — NAF discovers them automatically on startup.

**Basic `animationData` XML (ESP-less):**

```xml
<animationData>
  <!-- Replace formId with file= to go ESP-less -->
  <animation id="myMod_idle01"
             file="MyMod/Animations/MyIdle01.hkx"
             type="body" />

  <animation id="myMod_idle02"
             file="MyMod/Animations/MyIdle02.hkx"
             type="body" />
</animationData>
```

File paths are relative to `Data\Meshes\`. So `file="MyMod/Animations/MyIdle01.hkx"` maps to `Data\Meshes\MyMod\Animations\MyIdle01.hkx`.

#### raceData — Supporting Non-Human Races

By default, ESP-less packs use the `dyn_ActivationLoop` animation event. For non-human races, or races whose behavior graph root path NAF can't auto-detect, define them explicitly:

```xml
<raceData>
  <!-- Custom race with non-standard graph and start event -->
  <race formId="MyMod.esp|0x123456"
        graph="Actors\MyCreature\Behaviors\MyCreatureRootBehavior.hkx"
        startEvent="dyn_ActivationLoop" />
</raceData>
```

For humans, the graph is already known:
```
Actors\Character\Behaviors\RaiderRootBehavior.hkx
```

#### faceAnim XML — NAF's Own Type

NAF introduces a new XML type for face animations that no other framework supports:

```xml
<faceAnim id="myMod_smile01"
          file="MyMod/FaceAnims/smile01.naff" />
```

`.naff` (NAF Face File) is a binary format generated by NAF's in-game face animation creator. Export from the in-game creator, then reference the file in XML.

#### NAF.ini — HeadPart Morph Patch

For mods adding custom face morphs without an ESP editing every headpart:

```ini
[Values]
bHeadPartMorphPatch=true
sHeadPartPatchTriPath=Actors\Character\CharacterAssets\FaceParts\MyCustomMorph.tri
sHeadPartPatchType=Eyes
; Supported types: Eyes, Misc (others may be added — check NAF release notes)
```

Save `NAF.ini` and restart the game. The morph is dynamically injected into all matching headparts at load time.

#### AAF Animation Pack Compatibility

Existing AAF XML files work in NAF without changes — copy them into `Data\NAF\`. NAF understands all major AAF XML types: `animationData`, `raceData`, `positionData`, `morphSetData`, `equipmentSetData`, `actionData`, `animationGroupData`, `furnitureData`, `positionTreeData`, `tagData`.

---

### MaikCG F4Biped — The Professional Animation Pipeline

**Tool:** MaikCG F4Biped Animation Rig | Nexus #16691  
**What it is:** The definitive rigging kit for creating Fallout 4 animations in 3ds Max, Maya, and MotionBuilder.

See `RECOMMENDED_MODS_LIST.md` for full credits, permissions, and file descriptions.

F4Biped is already cited in the Credits & Sources of this guide. This section documents the complete pipeline workflow that the rig enables.

#### Full Import Pipeline (Vanilla → 3ds Max)

```
1. Open 3ds Max with F4Animation.hko preset in HCT
2. Select: ConvertAnimation_x32
   - Merge Asset filter: choose vanilla .hkx file
   - Write to Platform: set output folder, format = Binary/Packfile/Win32MSVC
   - Click Run Configuration → outputs .hkx in 32-bit format

3. Place skeleton.hkx and converted .hkx in havok2fbx folder
4. Run: havok2fbx.exe -hk_skeleton skeleton.hkx -hk_anim MyAnim.hkx -fbx MyAnim.fbx

5. Open F4BipedImport.max in 3ds Max
6. Import the .fbx → File content: "Update animation" (NOT "Add and update animation")
7. Select Root bone → rotate to +Y (havok2fbx outputs at +X; Fallout 4 faces +Y)
8. In Named Selection Sets → choose "SaveAnimation"
   Menu: Animation → Save Animation...
   Settings: Animated tracks OFF, Include constraints OFF, Keyable tracks OFF,
             Segment ON (set frame range), Key per frame ON
   Save as .haf

9. Open F4Biped.max
   Named Selection Sets → "LoadAnimation"
   Menu: Animation → Load Animation...
   Settings: Load Into Active Layer OFF, Absolute ON, Replace ON,
             Motion Mapping/Retargeting → SaveLoadMapping.xmm
```

#### 1st Person vs 3rd Person — Key Differences

| Aspect | 1st Person | 3rd Person |
|---|---|---|
| File path | `Actors\Character\_1stPerson\Animations\` | `Actors\Character\Animations\` |
| Weapon facing | +Y axis | +Y axis (same) |
| Head/neck | Rotated back 90° (stays out of camera view) | Normal position |
| Body movement | Minimal — just to prevent arm-stretching | Mostly in-place; locomotion uses actual root displacement |
| Camera bones | CamTarget **absent** from Rig1st.txt | Bip_Camera and Bip_CamTarget must be manually positioned |
| HCT preset | `AnimationExport1stPerson` | `AnimationExport3rdPerson` |
| Skeleton difference | 14 skinning bones absent (no effect on animation) | Full skeleton |

#### Weapon Animation Directories

```
Actors\Character\Animations\            ← shared base animations for all weapons
Actors\Character\Animations\Weapon\     ← per-weapon pose bones (mostly static poses, no movement)
```

Weapon animations store just a pose in the `\Weapon\` directory — no motion data, only bone positions.

#### Annotations (Audio Events)

All animation events (including audio triggers) are stored in the **Note Track** of the Root object — specifically on the transformation track, not the main track. To view/edit them:
- In 3ds Max: open the Track View (Dope Sheet), navigate to the Root object's transformation track, find the Note Track.
- Event names in annotations control things like audio file playback and engine callbacks.
- To extract annotation names from a vanilla .hkx: use the Tagfile/XML export option in HCT (outputs `.hkt` which opens in notepad — search for `annotation`).

#### CAT Rig Workflow (Simpler Alternative)

For users who find Biped complex, especially for hand-keyed 1st-person work:

```
1. Import .fbx into F4BipedCATImport.max
2. Select Cat Root (_Bip) → Bake animation to new layer
3. Layer !ConstraintLayer! contains the skeleton constraints — DO NOT delete it
4. Save only the new CollapsedLayer with baked animations
5. Upload (load) to F4BipedCAT.max
```

---**

**Version**: 1.0  
**Scope**: Professional Fallout 4 animation development  
**Updated**: May 2026
