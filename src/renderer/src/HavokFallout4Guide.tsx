import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HavokFallout4Guide = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    borderLeft: '4px solid #00d000',
    paddingLeft: '15px',
    paddingTop: '10px',
    paddingBottom: '10px',
    backgroundColor: '#0a0e27',
    borderRadius: '4px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00ff00',
    cursor: 'pointer',
    userSelect: 'none',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  };

  const expandArrowStyle: React.CSSProperties = {
    marginRight: '10px',
    transition: 'transform 0.3s',
    transform: expandedSection ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const contentStyle: React.CSSProperties = {
    color: '#cccccc',
    lineHeight: '1.6',
    fontSize: '14px',
  };

  const headingStyle: React.CSSProperties = {
    color: '#00ff00',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '15px',
    marginBottom: '10px',
  };

  const codeBlockStyle: React.CSSProperties = {
    backgroundColor: '#000000',
    border: '1px solid #00d000',
    padding: '12px',
    borderRadius: '4px',
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#00ff00',
    marginTop: '10px',
    marginBottom: '10px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    marginBottom: '10px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: '#1a1f3a',
    color: '#00ff00',
    padding: '10px',
    textAlign: 'left',
    borderBottom: '2px solid #00d000',
  };

  const tdStyle: React.CSSProperties = {
    color: '#cccccc',
    padding: '8px',
    borderBottom: '1px solid #00441a',
  };

  const calloutStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 255, 0, 0.06)',
    border: '1px solid #00441a',
    borderLeft: '4px solid #00ff00',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '18px',
    color: '#cccccc',
    lineHeight: '1.6',
    fontSize: '14px',
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#0a0e27',
    border: '1px solid #00d000',
    color: '#00ff00',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
  };

  const openUrl = (url: string) => {
    try {
      const anyWindow = window as any;
      if (anyWindow?.electron?.openExternal) {
        anyWindow.electron.openExternal(url);
        return;
      }
    } catch {
      // ignore
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#0a0e27',
      color: '#00ff00',
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#00ff00' }}>
        Havok Animation for Fallout 4: Advanced Guide
      </h1>
      <p style={{ color: '#00d000', marginBottom: '30px' }}>
        FO4-specific systems, animation architecture, and professional integration techniques
      </p>

      <div style={calloutStyle}>
        <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '6px' }}>Tools / Install / Verify (FO4)</div>
        <div>
          Don’t block on “installing Havok.” For Fallout 4, you can validate progress with:
          <strong> extraction → animation authoring → HKX conversion → in-game test</strong>.
        </div>
        <ul style={{ marginLeft: '18px', marginTop: '8px' }}>
          <li><strong>Extract</strong> a vanilla HKX + skeleton for reference (BAE).</li>
          <li><strong>Author</strong> in Blender (see in-app animation guide).</li>
          <li><strong>Convert</strong> to FO4 HKX with a community toolchain (HKXPack is a common starting point).</li>
          <li><strong>Validate</strong> format/version issues before launching the game.</li>
        </ul>
        <div style={buttonRowStyle}>
          <button style={buttonStyle} onClick={() => navigate('/animation-guide')}>In-app: Animation Guide</button>
          <button style={buttonStyle} onClick={() => navigate('/animation-validator')}>In-app: Animation Validator</button>
          <button style={buttonStyle} onClick={() => navigate('/vault')}>In-app: The Vault</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('Bethesda Archive Extractor')}>Nexus search: BAE</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('HKXPack')}>Nexus search: HKXPack</button>
        </div>
      </div>

      {/* Engine Architecture */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('architecture')}>
          <span style={expandArrowStyle}>►</span>
          Fallout 4 Engine Architecture
        </div>
        {expandedSection === 'architecture' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Creation Engine & Havok Integration</div>
            <p>
              Fallout 4 uses the <strong>Creation Engine</strong> (evolved Gamebryo), with Havok deeply integrated:
            </p>
            <div style={codeBlockStyle}>
              {`Creation Engine
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
│       ├── Shape Types & Collision Layers
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
└── Audio-Visual Integration
    ├── Animation Events
    ├── Effect Spawning
    └── Timing Synchronization`}
            </div>

            <div style={headingStyle}>Three Levels of Animation in FO4</div>
            <p><strong>Level 1: Static Animations (.nif embedded)</strong></p>
            <ul>
              <li>Simple animations directly in mesh files</li>
              <li>Used for: furniture, terminals, doors</li>
              <li>Files: <code>meshes/interiors/objects/</code></li>
            </ul>

            <p><strong>Level 2: Behavior-Driven Animations</strong></p>
            <ul>
              <li>Complex state-machine animations</li>
              <li>Used for: combat, movement, complex interactions</li>
              <li>Files: behavior graphs + animation files</li>
            </ul>

            <p><strong>Level 3: Advanced Character Control</strong></p>
            <ul>
              <li>Full AI-driven animation with physics blending</li>
              <li>Used for: NPC behavior, environmental response</li>
              <li>Files: behavior graphs + physics + animations</li>
            </ul>
          </div>
        )}
      </div>

      {/* FO4 Skeleton */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('skeleton')}>
          <span style={expandArrowStyle}>►</span>
          Fallout 4 Character Skeleton
        </div>
        {expandedSection === 'skeleton' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Standard FO4 Skeleton Structure</div>
            <p>
              Fallout 4 uses a highly specialized skeleton with specific bone naming and hierarchy:
            </p>
            <div style={codeBlockStyle}>
              {`Root (0,0,0 origin)
└─ NPC Root [Pelvis parent]
   ├─ Pelvis [PRIMARY CONTROL BONE]
   │  ├─ Spine [Lower Back - L3/L4]
   │  │  ├─ Spine1 [Mid Back - T8/T9]
   │  │  │  ├─ Spine2 [Upper Back - T1]
   │  │  │  │  ├─ Neck [Cervical]
   │  │  │  │  │  ├─ Head [Main Head]
   │  │  │  │  │  ├─ HeadTrack [Secondary]
   │  │  │  │  │  └─ Eyes [Eye target]
   │  │  │  │  ├─ LClavicle/RClavicle [Shoulders]
   │  │  │  │  │  └─ [Arms, hands, fingers...]
   │  │  │  │  └─ WeaponBack [Back Weapon Slot]
   │  ├─ LThigh/RThigh [Legs - Femur]
   │  │  └─ [Calves, feet, toes...]
   └─ Root Variants (tails, wings, etc.)`}
            </div>

            <div style={headingStyle}>Bone Groups by Function</div>
            <p><strong>Control Bones (Primary Animation Points)</strong></p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Group</th>
                  <th style={thStyle}>Bones</th>
                  <th style={thStyle}>Function</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Core Movement</td>
                  <td style={tdStyle}>Pelvis, Root</td>
                  <td style={tdStyle}>Character position & rotation</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Upper Body</td>
                  <td style={tdStyle}>Spine, Spine1, Spine2, Neck, Head</td>
                  <td style={tdStyle}>Torso rotation & head direction</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Arms</td>
                  <td style={tdStyle}>Clavicle, UpperArm, ForeArm, Hand</td>
                  <td style={tdStyle}>Arm positioning & rotation</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Legs</td>
                  <td style={tdStyle}>Thigh, Calf, Foot, Toe</td>
                  <td style={tdStyle}>Locomotion & movement</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Weapons</td>
                  <td style={tdStyle}>LWeapon, RWeapon, WeaponBack</td>
                  <td style={tdStyle}>Item positioning (no anim)</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Finger Bones (High Detail)</div>
            <p>
              Each hand has 5 fingers with 3 bones each (30 total finger bones):
            </p>
            <div style={codeBlockStyle}>
              {`Left Hand Fingers:
├─ LIndex1, LIndex2, LIndex3 (index)
├─ LMiddle1, LMiddle2, LMiddle3 (middle)
├─ LRing1, LRing2, LRing3 (ring)
├─ LPinky1, LPinky2, LPinky3 (pinky)
└─ LThumb1, LThumb2, LThumb3 (thumb)

Right Hand: R prefix

Note: Most animations ignore finger bones
(too expensive to animate all 30 finger bones)`}
            </div>
          </div>
        )}
      </div>

      {/* Behavior Graphs */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('behavior')}>
          <span style={expandArrowStyle}>►</span>
          Behavior Graphs & State Machines
        </div>
        {expandedSection === 'behavior' && (
          <div style={contentStyle}>
            <div style={headingStyle}>What are Behavior Graphs?</div>
            <p>
              <strong>Behavior Graphs</strong> are state machines that define HOW, WHEN, and WHEN animations play.
            </p>
            <div style={codeBlockStyle}>
              {`Combat Behavior State Machine:

IDLE_COMBAT
 ↓ (OnCombatStart)
COMBAT_READY_STANCE [Loop]
 ├─ OnHit → REACT_HIT
 ├─ OnAttack → ATTACK_RIGHT
 ├─ OnDodge → DODGE_ROLL
 └─ OnMove → COMBAT_WALK
      ↓
 (End animation)
      ↓
 (Return to COMBAT_READY)`}
            </div>

            <div style={headingStyle}>Behavior File Structure (XML)</div>
            <div style={codeBlockStyle}>
              {`<?xml version="1.0" encoding="utf-8"?>
<hkobject>
  <!-- Animation binding -->
  <hkparam name="stringData">
    <hkobject>
      <hkparam name="value">Idle_Combat</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="value">Attack_Right_1</hkparam>
    </hkobject>
  </hkparam>
  
  <!-- State transitions -->
  <hkparam name="transitions">
    <hkobject>
      <hkparam name="fromStateId">IDLE_COMBAT</hkparam>
      <hkparam name="toStateId">ATTACK_RIGHT_1</hkparam>
      <hkparam name="transitionEvent">OnAttack</hkparam>
      <hkparam name="blendTime">0.05</hkparam>
    </hkobject>
  </hkparam>
</hkobject>`}
            </div>
          </div>
        )}
      </div>

      {/* Animation Events */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('events')}>
          <span style={expandArrowStyle}>►</span>
          Animation Events & Synchronization
        </div>
        {expandedSection === 'events' && (
          <div style={contentStyle}>
            <div style={headingStyle}>What are Animation Events?</div>
            <p>
              <strong>Events</strong> are markers within animations that trigger game logic at specific frames:
            </p>
            <div style={codeBlockStyle}>
              {`Attack Animation Timeline:

Frame 0:   Start (blend in)
Frame 5:   Weapon starts moving
Frame 12:  ★ IMPACT EVENT ★
           └─ Triggers: Damage calc, sound, effect
Frame 15:  Peak power moment
Frame 20:  Weapon retracting
Frame 25:  Ready for next action
Frame 30:  End (return to ready)`}
            </div>

            <div style={headingStyle}>Common Fallout 4 Animation Events</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>Trigger</th>
                  <th style={thStyle}>Effect</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>AttackStart</td>
                  <td style={tdStyle}>Frame 0</td>
                  <td style={tdStyle}>Combat begins</td>
                </tr>
                <tr>
                  <td style={tdStyle}>AttackImpact</td>
                  <td style={tdStyle}>Mid-swing</td>
                  <td style={tdStyle}>Damage, hit effects</td>
                </tr>
                <tr>
                  <td style={tdStyle}>FootstepLeft/Right</td>
                  <td style={tdStyle}>Foot down</td>
                  <td style={tdStyle}>Footstep sound</td>
                </tr>
                <tr>
                  <td style={tdStyle}>SoundPlay:[file]</td>
                  <td style={tdStyle}>Specified frame</td>
                  <td style={tdStyle}>Play sound effect</td>
                </tr>
                <tr>
                  <td style={tdStyle}>EffectSpawn:[name]</td>
                  <td style={tdStyle}>Specified frame</td>
                  <td style={tdStyle}>Spawn visual effect</td>
                </tr>
                <tr>
                  <td style={tdStyle}>ArrowRelease</td>
                  <td style={tdStyle}>Frame of release</td>
                  <td style={tdStyle}>Fire projectile</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Adding Events in HavokMax</div>
            <div style={codeBlockStyle}>
              {`In 3DS Max:
1. Go to frame where event occurs
2. Havok > Animation Events > Add Event
3. Select event type from list
4. Specify parameters (sound file, effect)
5. Set timing offset if needed
6. Export with animation

Result: .hkx includes event markers
Game triggers at correct frames`}
            </div>
          </div>
        )}
      </div>

      {/* Installing Animations */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('install')}>
          <span style={expandArrowStyle}>►</span>
          Installing Animations in Fallout 4
        </div>
        {expandedSection === 'install' && (
          <div style={contentStyle}>
            <div style={headingStyle}>File Organization Workflow</div>
            <div style={codeBlockStyle}>
              {`Your Mod Folder Structure:
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
   │        └─ skeleton.nif
   │
   └─ Documentation & credits`}
            </div>

            <div style={headingStyle}>Method 1: Using Nifskope</div>
            <ol>
              <li>Open base model NIF in Nifskope</li>
              <li>Block {'->'} Attach {'->'} Havok Data</li>
              <li>Right-click HavokData {'->'} Edit</li>
              <li>Set Animation Index to your animation</li>
              <li>Click OK</li>
              <li>File {'->'} Save</li>
            </ol>

            <div style={headingStyle}>Method 2: Using HavokMax Export</div>
            <ol>
              <li>Import base mesh + skeleton in 3DS Max</li>
              <li>Import or create animations</li>
              <li>File {'->'} Export {'->'} Export Selected</li>
              <li>Choose NIF format</li>
              <li>Enable: "Embed Havok Data"</li>
              <li>Select animation to embed</li>
              <li>Export complete NIF with embedded animation</li>
            </ol>

            <div style={headingStyle}>Registering in Behavior Graphs</div>
            <div style={codeBlockStyle}>
              {`<!-- custom_behaviors.xml -->
<?xml version="1.0" encoding="utf-8"?>
<hkobject>
  <hkparam name="stringData">
    <!-- Animation names -->
    <hkobject>
      <hkparam name="value">YourNewAnimation_Idle</hkparam>
    </hkobject>
    <hkobject>
      <hkparam name="value">YourNewAnimation_Attack</hkparam>
    </hkobject>
  </hkparam>
  
  <hkparam name="transitions">
    <!-- Transitions using your animations -->
    <hkobject>
      <hkparam name="animationIndex">0</hkparam>
      <hkparam name="toStateId">YOUR_IDLE_STATE</hkparam>
    </hkobject>
  </hkparam>
</hkobject>`}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Techniques */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('advanced')}>
          <span style={expandArrowStyle}>►</span>
          Advanced Havok Techniques
        </div>
        {expandedSection === 'advanced' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Physics Shape Configuration</div>
            <p><strong>Ragdoll Setup (Complete Body)</strong></p>
            <div style={codeBlockStyle}>
              {`Human Character Ragdoll:

Head Group:
- Shape: Sphere, Radius: 0.12m, Mass: 2kg

Spine Group (series):
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

Total Mass: ~60kg (realistic adult)`}
            </div>

            <div style={headingStyle}>Animation Blending</div>
            <p>Smooth transitions between animation states:</p>
            <div style={codeBlockStyle}>
              {`Walk to Run Transition (2 seconds):

Frame 0:   Walk_Forward fully [████░░░░░░░]
Frame 10:  45% Walk, 55% Run  [█████████░░]
Frame 20:  Run_Forward fully  [░░░░░░░░███]

Blend Parameters:
- Blend time: 2 seconds (60 frames at 30 FPS)
- Curve: Linear interpolation
- Smooth transition without popping`}
            </div>

            <div style={headingStyle}>Character Controller Integration</div>
            <p>Havok provides specialized character controller for:</p>
            <ul>
              <li>Gravity application</li>
              <li>Ground detection and friction</li>
              <li>Slope walking and climbing</li>
              <li>Jump mechanics</li>
              <li>Collision response</li>
              <li>Speed limiting and acceleration</li>
            </ul>
          </div>
        )}
      </div>

      {/* Common Issues & Fixes */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('issues')}>
          <span style={expandArrowStyle}>►</span>
          Common FO4 Animation Issues & Fixes
        </div>
        {expandedSection === 'issues' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Issue: Animation Pops or Jumps</div>
            <p><strong>Symptom:</strong> Character jerks when entering animation</p>
            <p><strong>Causes:</strong></p>
            <ul>
              <li>First keyframe doesn't match previous animation's exit pose</li>
              <li>Blend time too short</li>
              <li>Bone constraint violated (exceeds rotation limits)</li>
            </ul>
            <p><strong>Solutions:</strong></p>
            <div style={codeBlockStyle}>
              {`1. Record exit pose of previous animation
2. Set first keyframe of new animation to match
3. Increase blend time: 0.05 {{'->'}} 0.2 seconds
4. Check rotation limits allow starting pose
5. Adjust constraint angles if needed
6. Re-export`}
            </div>

            <div style={headingStyle}>Issue: Character Floats or Sinks</div>
            <p><strong>Symptom:</strong> Character hovers above or clips below ground</p>
            <p><strong>Solutions:</strong></p>
            <div style={codeBlockStyle}>
              {`1. Verify Root bone:
   - Frame 0: Position should be (0, 0, 0)
   - Frame N: Position matches movement

2. Check Pelvis height:
   - Standard: ~0.9m above ground (standing)
   - Compare against reference model
   - Adjust if off-ground

3. Physics shape positioning:
   - Reposition Havok shapes to match body
   - Adjust capsule lengths/radii
   - Test ragdoll in preview`}
            </div>

            <div style={headingStyle}>Issue: Animation Doesn't Loop</div>
            <p><strong>Symptom:</strong> Jerky transition when animation repeats</p>
            <p><strong>Solutions:</strong></p>
            <div style={codeBlockStyle}>
              {`1. Perfect loop:
   - Copy Frame 0 keyframes to Frame N+1
   - Blends smoothly at loop point

2. Define loop event:
   - Mark animation as "Loop = Yes"
   - Set blend time: 0.1-0.2 sec

3. Verify behavior graph:
   - Transition back to self configured
   - Event triggers correctly at end`}
            </div>

            <div style={headingStyle}>Issue: Ragdoll Unstable</div>
            <p><strong>Symptom:</strong> Character flails or flies away when ragdoll</p>
            <p><strong>Solutions:</strong></p>
            <div style={codeBlockStyle}>
              {`1. Balance mass distribution:
   - Head: 2kg, Torso: 20kg
   - Arms: 3kg each, Legs: 6kg each
   - Total: ~60kg realistic

2. Adjust constraint stiffness:
   - Reduce: 0.8 {{'->'}} 0.6
   - Increase damping: 0.1 {{'->'}} 0.3
   - Results in floppy but stable ragdoll

3. Limit initial velocity:
   - Ragdoll cap: 5 m/s
   - Prevent excessive forces

4. Test in preview before export`}
            </div>
          </div>
        )}
      </div>

      {/* Integration Checklist */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('checklist')}>
          <span style={expandArrowStyle}>►</span>
          Integration Checklist
        </div>
        {expandedSection === 'checklist' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Pre-Export Verification</div>
            <div style={codeBlockStyle}>
              {`Animation Quality
□ No bone clipping or penetration
□ Smooth keyframe curves (smooth tangents)
□ Duration appropriate for animation type
□ Frame rate set to 30 FPS
□ Blend times configured (0.1-0.2 sec)

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
□ Behavior graph updated
□ Paths in behavior graph correct`}
            </div>

            <div style={headingStyle}>Post-Export Testing</div>
            <p><strong>In Creation Kit:</strong></p>
            <ul>
              <li>Load behavior with custom animation</li>
              <li>Verify animation plays</li>
              <li>Check transitions work smoothly</li>
              <li>Monitor for floating/sinking</li>
              <li>Test ragdoll functionality</li>
              <li>Verify events trigger at correct frames</li>
              <li>Performance acceptable ({'{'}{'}'} 45 FPS)</li>
            </ul>

            <p><strong>In Game:</strong></p>
            <ul>
              <li>Test with actual game physics</li>
              <li>Verify NPC animation plays correctly</li>
              <li>Check interaction animations work</li>
              <li>Test equipment interactions</li>
              <li>Verify ragdoll death response</li>
              <li>Look for animation jittering</li>
            </ul>
          </div>
        )}
      </div>

      {/* Performance & Resources */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('performance')}>
          <span style={expandArrowStyle}>►</span>
          Performance Optimization & Resources
        </div>
        {expandedSection === 'performance' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Animation File Size Reference</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Animation Type</th>
                  <th style={thStyle}>No Compression</th>
                  <th style={thStyle}>Medium</th>
                  <th style={thStyle}>High</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Simple Idle (30 frames)</td>
                  <td style={tdStyle}>15KB</td>
                  <td style={tdStyle}>8KB</td>
                  <td style={tdStyle}>5KB</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Walk Cycle (32 frames)</td>
                  <td style={tdStyle}>45KB</td>
                  <td style={tdStyle}>20KB</td>
                  <td style={tdStyle}>12KB</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Attack (40 frames)</td>
                  <td style={tdStyle}>35KB</td>
                  <td style={tdStyle}>15KB</td>
                  <td style={tdStyle}>9KB</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Behavior Graph</td>
                  <td style={tdStyle}>N/A</td>
                  <td style={tdStyle}>50-200KB</td>
                  <td style={tdStyle}>N/A</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Mod Budget Suggestion</div>
            <div style={codeBlockStyle}>
              {`Total Mod Size Guidelines:
- Animations: <10MB
- Behavior graphs: <5MB
- Mesh assets: <20MB
- Total mod: <50MB for reasonable size

Performance Impact:
- Single animation: negligible
- Multiple animations: cumulative
- Behavior graphs: moderate CPU cost
- Physics: scales with complexity`}
            </div>

            <div style={headingStyle}>Learning Resources</div>
            <p><strong>Official:</strong></p>
            <ul>
              <li>Havok SDK Manual (PDF with SDK)</li>
              <li>API Reference (included documentation)</li>
              <li>Sample Projects (physics, animation, behavior)</li>
            </ul>

            <p><strong>Community:</strong></p>
            <ul>
              <li><a href="https://www.youtube.com/watch?v=PZ5nP8mwzDA&list=PLGGw--fFEeZd5HM9shaaANPuXP9zAgmAN" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>FO4 Havok animation playlist</a> (visual walkthroughs)</li>
              <li>Nexus Mods tutorials</li>
              <li>Fallout 4 modding forums</li>
              <li>GitHub (PredatorCZ projects)</li>
              <li>Game dev courses</li>
            </ul>

            <p><strong>Tools:</strong></p>
            <ul>
              <li>Nifskope (NIF viewer/editor)</li>
              <li>HavokMax (3DS Max plugin)</li>
              <li>Creation Kit (in-game testing)</li>
              <li>Havok Behavior Editor (state machines)</li>
            </ul>

            <div style={headingStyle}>Credits & Sources</div>
            <ul>
              <li>Fallout 4 Animation Kit (F4AK) by ShadeAnimator — author of the kit and guide</li>
              <li>DexesTTP — HKXPack/HKXAnim tools</li>
              <li>MaikCG — <a href="http://www.nexusmods.com/fallout4/mods/16691/?" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>F4Biped animation rig</a> and guidance</li>
              <li>Contributors: CPU, NifTools team, JoshNZ, Kimbale, Caliente/Ousnius (CBBE)</li>
              <li>F4AK Nexus release (credit when used): <a href="http://www.nexusmods.com/fallout4/mods/16694/?" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>Nexus mod 16694</a></li>
              <li>Guide/Wiki mirror: <a href="http://wiki.nexusmods.com/index.php/Animation_In_Fallout_4" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>Animation in Fallout 4</a></li>
            </ul>
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#1a1f3a',
        borderLeft: '4px solid #00d000',
        borderRadius: '4px'
      }}>
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>Mastery Path</h3>
        <p style={{ color: '#cccccc' }}>
          <strong>Level 1 (Basic):</strong> Simple animations, basic export<br />
          <strong>Level 2 (Intermediate):</strong> Physics shapes, behavior graphs, events<br />
          <strong>Level 3 (Advanced):</strong> Complex IK, animation blending, optimization<br />
          <strong>Level 4 (Expert):</strong> Custom character controllers, AI behavior design
        </p>
        <p style={{ color: '#00d000', marginTop: '15px' }}>
          You now have the knowledge to create professional Fallout 4 animations using Havok. 
          Start with simple animations and progress to complex behavior-driven systems.
        </p>
      </div>
    </div>
  );
};

export default HavokFallout4Guide;
