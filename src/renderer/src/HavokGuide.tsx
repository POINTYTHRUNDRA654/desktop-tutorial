import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openExternal } from './utils/openExternal';

const HavokGuide = () => {
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

  const linkStyle: React.CSSProperties = {
    color: '#00ff00',
    textDecoration: 'none',
    cursor: 'pointer',
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
    void openExternal(url);
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
        Havok Animation System Guide
      </h1>
      <p style={{ color: '#00d000', marginBottom: '30px' }}>
        Professional physics and animation middleware for Fallout 4 modding
      </p>

      <div style={calloutStyle}>
        <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '6px' }}>Tools / Install / Verify (Fallout 4)</div>
        <div>
          In Fallout 4 modding, “Havok” usually means <strong>HKX animation data + behavior graphs</strong>. The fastest success path is:
          <strong> author in Blender → export → convert to FO4 HKX → validate → test in-game</strong>.
        </div>
        <div style={{ marginTop: '8px' }}>
          <strong>Fast verification loop:</strong> swap a single known vanilla HKX (in a throwaway test mod), launch game, confirm the new motion plays.
        </div>
        <div style={buttonRowStyle}>
          <button style={buttonStyle} onClick={() => navigate('/animation-guide')}>In-app: Animation Guide</button>
          <button style={buttonStyle} onClick={() => navigate('/animation-validator')}>In-app: Animation Validator</button>
          <button style={buttonStyle} onClick={() => navigate('/vault')}>In-app: The Vault</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('HKXPack')}>Nexus search: HKXPack</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('Bethesda Archive Extractor')}>Nexus search: BAE</button>
        </div>
      </div>

      {/* What is Havok */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('what-is')}>
          <span style={expandArrowStyle}>►</span>
          What is Havok?
        </div>
        {expandedSection === 'what-is' && (
          <div style={contentStyle}>
            <p>
              <strong>Havok</strong> is a powerful physics and animation middleware engine developed by Autodesk. 
              It provides professional-grade tools for physics simulation, character animation, cloth simulation, 
              and audio-visual integration.
            </p>
            <div style={headingStyle}>Key Havok Products:</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Use in FO4</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Havok Physics</td>
                  <td style={tdStyle}>Core physics engine</td>
                  <td style={tdStyle}>Collision, ragdoll, character control</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Havok Animation</td>
                  <td style={tdStyle}>Skeletal animation</td>
                  <td style={tdStyle}>Character movement, blending</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Havok Behavior</td>
                  <td style={tdStyle}>State machine system</td>
                  <td style={tdStyle}>Animation logic, AI control</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Havok Cloth</td>
                  <td style={tdStyle}>Cloth simulation</td>
                  <td style={tdStyle}>Clothing, armor physics</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Why Havok Matters for FO4 */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('why-matters')}>
          <span style={expandArrowStyle}>►</span>
          Why Havok Matters for Fallout 4
        </div>
        {expandedSection === 'why-matters' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Native Engine Integration</div>
            <p>
              Fallout 4's Creation Engine has Havok deeply integrated at its core:
            </p>
            <ul>
              <li>All NPC animations use Havok skeletons</li>
              <li>Physics systems rely on Havok collision shapes</li>
              <li>Ragdoll physics powered by Havok</li>
              <li>Behavior trees use Havok's state machine architecture</li>
            </ul>
            
            <div style={headingStyle}>Professional Animation Workflow</div>
            <p>
              Havok provides tools that match professional game development:
            </p>
            <ul>
              <li><strong>3DS Max Plugin (HavokMax):</strong> Seamless integration with industry-standard 3D software</li>
              <li><strong>Behavior Editor:</strong> Visual editing of complex animation states</li>
              <li><strong>Physics Authoring:</strong> Precise control over collision and physics</li>
              <li><strong>Debugging Tools:</strong> Visualize and debug physics in real-time</li>
            </ul>

            <div style={headingStyle}>Why It Matters for Modding</div>
            <p>
              Without understanding Havok, custom animations will have issues:
            </p>
            <ul>
              <li>Custom animations won't work correctly with FO4's physics</li>
              <li>Character models may float, clip, or ragdoll unexpectedly</li>
              <li>Complex behaviors won't function properly</li>
              <li>Performance issues and crashes can result</li>
            </ul>
          </div>
        )}
      </div>

      {/* Havok Components */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('components')}>
          <span style={expandArrowStyle}>►</span>
          Havok Components in Fallout 4
        </div>
        {expandedSection === 'components' && (
          <div style={contentStyle}>
            <p>The Creation Engine integrates Havok at multiple levels:</p>
            
            <div style={headingStyle}>Physics System</div>
            <div style={codeBlockStyle}>
              {`Rigid Body Dynamics
Collision Detection (hkpShape)
Constraints & Joint Limits
Character Controller
Cloth Simulation`}
            </div>

            <div style={headingStyle}>Animation System</div>
            <div style={codeBlockStyle}>
              {`Skeletal Animation (hkpRigidBody bones)
Keyframe Interpolation
Inverse Kinematics (IK)
Animation Blending & Layering
Character Controllers`}
            </div>

            <div style={headingStyle}>Behavior System</div>
            <div style={codeBlockStyle}>
              {`State Machines
Transition Logic
Event Handling
Custom Controllers`}
            </div>
          </div>
        )}
      </div>

      {/* Key File Formats */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('formats')}>
          <span style={expandArrowStyle}>►</span>
          Key Havok File Formats
        </div>
        {expandedSection === 'formats' && (
          <div style={contentStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Contents</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>.nif</td>
                  <td style={tdStyle}>Mesh + Skeleton</td>
                  <td style={tdStyle}>3D geometry, bones, embedded Havok physics</td>
                </tr>
                <tr>
                  <td style={tdStyle}>.hkx</td>
                  <td style={tdStyle}>Havok Container</td>
                  <td style={tdStyle}>Animation data, physics shapes, behavior info</td>
                </tr>
                <tr>
                  <td style={tdStyle}>.xml/.txt</td>
                  <td style={tdStyle}>Behavior Graph</td>
                  <td style={tdStyle}>State machines, events, animation sequences</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Havok SDK Overview */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('sdk')}>
          <span style={expandArrowStyle}>►</span>
          Havok SDK Structure
        </div>
        {expandedSection === 'sdk' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Core Libraries</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Library</th>
                  <th style={thStyle}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>hkBase</td>
                  <td style={tdStyle}>Foundation types, memory, serialization</td>
                </tr>
                <tr>
                  <td style={tdStyle}>hkCore</td>
                  <td style={tdStyle}>Reflection, type system, containers</td>
                </tr>
                <tr>
                  <td style={tdStyle}>hkPhysics</td>
                  <td style={tdStyle}>Physics engine and dynamics</td>
                </tr>
                <tr>
                  <td style={tdStyle}>hkAnimation</td>
                  <td style={tdStyle}>Animation systems and controllers</td>
                </tr>
                <tr>
                  <td style={tdStyle}>hkBehavior</td>
                  <td style={tdStyle}>Behavior graph execution</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>SDK Directory Structure</div>
            <div style={codeBlockStyle}>
              {`HavokSDK/
├── bin/         (Runtime libraries)
├── lib/         (Static libraries for linking)
├── include/     (Header files)
├── samples/     (Example projects)
└── docs/        (API documentation)`}
            </div>
          </div>
        )}
      </div>

      {/* HavokMax Plugin */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('havokmax')}>
          <span style={expandArrowStyle}>►</span>
          HavokMax Plugin for 3DS Max
        </div>
        {expandedSection === 'havokmax' && (
          <div style={contentStyle}>
            <div style={headingStyle}>What is HavokMax?</div>
            <p>
              <strong>HavokMax</strong> is a powerful 3DS Max plugin by Lukas Cone that provides:
            </p>
            <ul>
              <li>Native Havok export from 3DS Max</li>
              <li>Physics shape editing and placement</li>
              <li>Animation export with bone constraints</li>
              <li>Behavior graph support</li>
              <li>Real-time Havok physics preview</li>
              <li>Full integration with existing 3DS Max workflows</li>
            </ul>

            <div style={headingStyle}>Plugin Information</div>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <td style={tdStyle}><strong>Author</strong></td>
                  <td style={tdStyle}>Lukas Cone</td>
                </tr>
                <tr>
                  <td style={tdStyle}><strong>Repository</strong></td>
                  <td style={tdStyle}>github.com/PredatorCZ/HavokMax</td>
                </tr>
                <tr>
                  <td style={tdStyle}><strong>License</strong></td>
                  <td style={tdStyle}>GNU General Public License v3</td>
                </tr>
                <tr>
                  <td style={tdStyle}><strong>Current Version</strong></td>
                  <td style={tdStyle}>1.13+</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Export Capabilities</div>
            <ul>
              <li><strong>Meshes:</strong> Geometry with materials and textures</li>
              <li><strong>Skeletons:</strong> Full bone hierarchies with constraints</li>
              <li><strong>Physics Shapes:</strong> Place and export collision shapes</li>
              <li><strong>Animation:</strong> Keyframe animation with compression</li>
              <li><strong>Materials:</strong> Texture references and shader properties</li>
            </ul>
          </div>
        )}
      </div>

      {/* Core Concepts */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('concepts')}>
          <span style={expandArrowStyle}>►</span>
          Core Havok Concepts
        </div>
        {expandedSection === 'concepts' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Havok Skeleton</div>
            <p>
              A skeleton is a hierarchy of bones (joints) that define the character's structure. 
              Each bone has a parent (except Root) and inherits transformations from its parent.
            </p>

            <div style={headingStyle}>Havok Animation Data (hkxAnim)</div>
            <div style={codeBlockStyle}>
              {`hkxAnimation contains:
- Duration (in frames)
- Tracks (one per bone)
  ├── Position Keyframes
  ├── Rotation Keyframes
  └── Scale Keyframes
- Frame Rate (30 FPS for FO4)
- Compression Settings`}
            </div>

            <div style={headingStyle}>Physics Shapes</div>
            <p>
              Havok provides various collision shape types:
            </p>
            <ul>
              <li><strong>Capsule:</strong> Cylinders with hemispherical ends (limbs)</li>
              <li><strong>Sphere:</strong> Perfect spheres (joints, simple objects)</li>
              <li><strong>Box:</strong> Rectangular boxes (armor, rigid pieces)</li>
              <li><strong>Cylinder:</strong> Cylinders (weapons, limbs)</li>
              <li><strong>Compound:</strong> Combination of shapes (complex objects)</li>
            </ul>

            <div style={headingStyle}>Character Controller</div>
            <p>
              Havok provides a specialized character controller for:
            </p>
            <ul>
              <li>Ground detection and friction</li>
              <li>Slope walking and climbing</li>
              <li>Jumping mechanics</li>
              <li>Collision response</li>
              <li>Speed limiting and acceleration</li>
            </ul>
          </div>
        )}
      </div>

      {/* Animation Workflow */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('workflow')}>
          <span style={expandArrowStyle}>►</span>
          Complete Animation Workflow
        </div>
        {expandedSection === 'workflow' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Phase 1: Planning</div>
            <div style={codeBlockStyle}>
              {`Define Animation Requirements:
- Purpose (locomotion, attack, interact)
- Duration (frames needed)
- Bones Involved (which bones move)
- Impact Events (when hit detection occurs)
- Transitions (how animation starts/ends)`}
            </div>

            <div style={headingStyle}>Phase 2: Modeling & Animation</div>
            <ol>
              <li>Reference gathering (video, images, base animations)</li>
              <li>Skeleton validation (bones, naming, constraints)</li>
              <li>Animation creation (block, polish, refine)</li>
              <li>Subtle details (breathing, weight shift)</li>
            </ol>

            <div style={headingStyle}>Phase 3: Physics Setup</div>
            <ol>
              <li>Shape placement (capsules, spheres, boxes)</li>
              <li>Constraint configuration (rotation limits, friction)</li>
              <li>Mass and inertia setup (realistic values)</li>
            </ol>

            <div style={headingStyle}>Phase 4: Export</div>
            <ol>
              <li>Configure export options (frame range, compression)</li>
              <li>Export to HKX format</li>
              <li>Verify data integrity</li>
            </ol>

            <div style={headingStyle}>Phase 5: Testing & Iteration</div>
            <ol>
              <li>In-game testing (verify playback)</li>
              <li>Refinement (adjust timing, physics)</li>
              <li>Final polish (synchronization, artifacts)</li>
            </ol>
          </div>
        )}
      </div>

      {/* Common Animation Types */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('types')}>
          <span style={expandArrowStyle}>►</span>
          Common Fallout 4 Animation Types
        </div>
        {expandedSection === 'types' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Locomotion (Movement)</div>
            <ul>
              <li>Idle (standing)</li>
              <li>Walk (forward/backward)</li>
              <li>Run (sprint)</li>
              <li>Sneak (crouched movement)</li>
              <li>Combat stance (in-combat idle)</li>
            </ul>

            <div style={headingStyle}>Actions</div>
            <ul>
              <li>Melee Attack (sword, fist)</li>
              <li>Ranged Attack (bow, gun)</li>
              <li>Spell Cast</li>
              <li>Block</li>
              <li>Dodge</li>
            </ul>

            <div style={headingStyle}>Interactions</div>
            <ul>
              <li>Activate Object (lever, terminal)</li>
              <li>Pickup Item</li>
              <li>Consume Food/Drink</li>
              <li>Crafting Animation</li>
              <li>Dialogue (talking)</li>
            </ul>

            <div style={headingStyle}>Expressions</div>
            <ul>
              <li>Emotion (anger, fear, joy)</li>
              <li>Gesture (pointing, waving)</li>
              <li>Reaction (pain, shock)</li>
              <li>Synchronization (with other character)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Resources */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('resources')}>
          <span style={expandArrowStyle}>►</span>
          Learning Resources & Tools
        </div>
        {expandedSection === 'resources' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Official Documentation</div>
            <ul>
              <li>Havok SDK Manual (included with SDK download)</li>
              <li>API Reference (PDF documentation)</li>
              <li>Sample Projects (Animation, Physics, Behavior)</li>
            </ul>

            <div style={headingStyle}>Community Resources</div>
            <ul>
              <li>Nexus Mods animation tutorials</li>
              <li>Fallout 4 modding forums</li>
              <li>GitHub repositories (PredatorCZ projects)</li>
              <li>Game development courses</li>
            </ul>

            <div style={headingStyle}>Video Tutorials</div>
            <ul>
              <li><a href="https://www.youtube.com/watch?v=PZ5nP8mwzDA&list=PLGGw--fFEeZd5HM9shaaANPuXP9zAgmAN" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>FO4 Havok animation playlist</a> (step-by-step fundamentals)</li>
            </ul>

            <div style={headingStyle}>Key Tools</div>
            <ul>
              <li><strong>Nifskope:</strong> NIF file viewer/editor</li>
              <li><strong>HavokMax:</strong> 3DS Max plugin</li>
              <li><strong>Creation Kit:</strong> Test animations in-game</li>
              <li><strong>Havok Behavior Editor:</strong> Edit animation state machines</li>
            </ul>

            <div style={headingStyle}>Practice Projects</div>
            <ol>
              <li>Simple idle animation</li>
              <li>Basic walk cycle</li>
              <li>Combat animation sequence</li>
              <li>Complex action sequence</li>
              <li>Ragdoll setup from scratch</li>
            </ol>

            <div style={headingStyle}>Credits & Sources</div>
            <ul>
              <li>Fallout 4 Animation Kit (F4AK) by ShadeAnimator — original kit and guide</li>
              <li>DexesTTP — HKXPack/HKXAnim tools</li>
              <li>MaikCG — <a href="https://www.nexusmods.com/fallout4/mods/16691" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>F4Biped animation rig</a> and workflow tips</li>
              <li>Contributors: CPU, NifTools team, JoshNZ, Kimbale, Caliente/Ousnius (CBBE)</li>
              <li>F4AK Nexus release: <a href="https://www.nexusmods.com/fallout4/mods/16694" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>Nexus mod 16694</a></li>
              <li>Guide/Wiki mirror: <a href="https://wiki.nexusmods.com/index.php/Animation_In_Fallout_4" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>Animation in Fallout 4</a></li>
            </ul>
          </div>
        )}
      </div>

      {/* Quick Reference */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('reference')}>
          <span style={expandArrowStyle}>►</span>
          Quick Reference
        </div>
        {expandedSection === 'reference' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Animation Duration Reference</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Animation Type</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Frames (30 FPS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Blink</td>
                  <td style={tdStyle}>0.2 sec</td>
                  <td style={tdStyle}>6 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Idle breathing</td>
                  <td style={tdStyle}>1-2 sec</td>
                  <td style={tdStyle}>30-60 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Walk cycle</td>
                  <td style={tdStyle}>0.8-1.2 sec</td>
                  <td style={tdStyle}>24-36 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Run cycle</td>
                  <td style={tdStyle}>0.4-0.6 sec</td>
                  <td style={tdStyle}>12-18 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Attack</td>
                  <td style={tdStyle}>0.5-1.5 sec</td>
                  <td style={tdStyle}>15-45 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Death</td>
                  <td style={tdStyle}>1-3 sec</td>
                  <td style={tdStyle}>30-90 frames</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Installation Checklist</div>
            <div style={codeBlockStyle}>
              {`□ Havok SDK downloaded & installed
□ HavokMax plugin built & installed
□ 3DS Max restarted
□ HavokLib built & ready
□ Environment variables configured
□ Test import/export successful`}
            </div>

            <div style={headingStyle}>Animation Export Template</div>
            <div style={codeBlockStyle}>
              {`Export Settings:
- Animation Range: [START] to [END] frames
- Frame Rate: 30 FPS
- Compression: Medium (0.001 error)
- Include Physics: Yes
- Behavior Data: Yes
- Texture References: Yes`}
            </div>
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
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>What You Now Know</h3>
        <ul style={{ color: '#cccccc' }}>
          <li>✓ What Havok is and why it matters for Fallout 4</li>
          <li>✓ How Havok integrates with the Creation Engine</li>
          <li>✓ Havok SDK structure and core libraries</li>
          <li>✓ HavokMax plugin capabilities</li>
          <li>✓ Core animation and physics concepts</li>
          <li>✓ Complete animation workflow</li>
          <li>✓ Common animation types for FO4</li>
          <li>✓ Resources for learning advanced techniques</li>
        </ul>
        <p style={{ color: '#00d000', marginTop: '15px' }}>
          <strong>Next:</strong> See the Quick Start guide to install Havok and create your first animation in 30 minutes.
        </p>
      </div>
    </div>
  );
};

export default HavokGuide;
