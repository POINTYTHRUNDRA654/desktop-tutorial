import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

const HavokQuickStartGuide = () => {
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

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#0a0e27',
      color: '#00ff00',
      fontFamily: 'monospace',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#00ff00' }}>
        Havok Quick Start Guide
      </h1>
      <p style={{ color: '#00d000', marginBottom: '30px' }}>
        Get Havok installed and create your first animation in under 1 hour
      </p>

      <div style={{ maxWidth: 980, margin: '0 auto 18px auto' }}>
        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This page includes both the pragmatic FO4 path (Blender → convert → test) and legacy SDK workflows. Start with the smallest conversion/test loop first."
          tools={[
            { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official' },
            { label: 'Nexus search: HKXPackUI', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=HKXPackUI&gsearchtype=mods', kind: 'search' },
            { label: 'Nexus search: BAE', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=BAE&gsearchtype=mods', kind: 'search' },
            { label: 'HavokMax (GitHub)', href: 'https://github.com/PredatorCZ/HavokMax', kind: 'docs' },
            { label: 'HavokLib (GitHub)', href: 'https://github.com/PredatorCZ/HavokLib', kind: 'docs' },
            { label: 'CMake (official download)', href: 'https://cmake.org/download/', kind: 'official', note: 'Needed if you build from source.' },
            { label: 'Visual Studio (official download)', href: 'https://visualstudio.microsoft.com/downloads/', kind: 'official', note: 'Needed for MSVC builds on Windows.' },
          ]}
          verify={[
            'Use the in-page buttons to jump to Animation Guide/Validator and confirm navigation works.',
            'Confirm you can open the tool links above (or copy them) from inside the app.',
            'Confirm your “tiny test” export has a predictable frame rate and duration.'
          ]}
          firstTestLoop={[
            'Author a 20–30 frame clip in Blender → export FBX → convert to FO4 HKX using your chosen method.',
            'Test in-game early; only then invest in SDK/HavokMax builds if you truly need them.'
          ]}
          troubleshooting={[
            'If you are blocked on SDK licensing/installs, switch to the Blender → conversion toolchain path first.',
            'If conversion output is unusable, verify you are targeting the correct FO4 HKX profile/version.'
          ]}
          shortcuts={[
            { label: 'Animation Guide', to: '/animation-guide' },
            { label: 'Animation Validator', to: '/animation-validator' },
            { label: 'Export Settings', to: '/export-settings' },
            { label: 'The Vault', to: '/vault' },
          ]}
        />
      </div>

      <div style={calloutStyle}>
        <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '6px' }}>Reality check (Fallout 4 modding)</div>
        <div>
          For Fallout 4, most modders don’t start by installing a full Havok SDK. The practical path is:
          <strong> author animation in Blender → export → convert to FO4 HKX → verify in-game</strong>.
          Legacy SDK/HavokMax setups exist, but they’re not the easiest first win.
        </div>
        <div style={buttonRowStyle}>
          <button style={buttonStyle} onClick={() => navigate('/animation-guide')}>In-app: Animation Guide</button>
          <button style={buttonStyle} onClick={() => navigate('/animation-validator')}>In-app: Animation Validator</button>
          <button style={buttonStyle} onClick={() => navigate('/vault')}>In-app: The Vault</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('HKXPack')}>Nexus search: HKXPack</button>
          <button style={buttonStyle} onClick={() => openNexusSearch('Bethesda Archive Extractor')}>Nexus search: BAE</button>
        </div>
      </div>

      {/* 5-Step Setup */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('5-step')}>
          <span style={expandArrowStyle}>►</span>
          5-Step Setup (30 Minutes)
        </div>
        {expandedSection === '5-step' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Step 1: Choose a toolchain (10 min)</div>
            <ul>
              <li><strong>Recommended:</strong> Blender animation workflow + an HKX conversion toolchain (community tooling).</li>
              <li><strong>Legacy/Advanced:</strong> Havok SDK + HavokMax (3ds Max plugin) if you already have that environment working.</li>
            </ul>
            <p style={{ color: '#00d000' }}>
              If you’re here specifically for Fallout 4, start with the in-app animation guide and only come back to SDK setup if you need it.
            </p>

            <div style={headingStyle}>Step 2: (Optional) Install HavokMax (10 min)</div>
            <div style={codeBlockStyle}>
              {`git clone https://github.com/PredatorCZ/HavokMax.git
cd HavokMax
mkdir build && cd build
cmake -G "Visual Studio 16 2019" -DCMAKE_BUILD_TYPE=Release ..
cmake --build . --config Release`}
            </div>
            <p>
              Copy HavokMax.dlu to: <code>C:\Program Files\Autodesk\3ds Max [VERSION]\plugins\</code>
            </p>
            <p><strong>Restart 3DS Max</strong></p>

            <div style={headingStyle}>Step 3: Clone HavokLib (5 min)</div>
            <div style={codeBlockStyle}>
              {`git clone https://github.com/PredatorCZ/HavokLib.git`}
            </div>

            <div style={headingStyle}>Step 4: Get a reference skeleton/animation (3 min)</div>
            <ol>
              <li>Extract Fallout 4 assets using a BA2 extractor (BAE is common)</li>
              <li>Open <code>Data\meshes\actors\character\CharacterAssets\skeleton.nif</code></li>
              <li>Import to 3DS Max</li>
            </ol>

            <div style={headingStyle}>Step 5: Verify something works (2 min)</div>
            <ol>
              <li>If using HavokMax: confirm the Havok menu/toolbars exist.</li>
              <li>If using Blender pipeline: export a tiny animation and run it through your HKX conversion tool.</li>
              <li>Use the in-app validator to catch common format/version issues before testing in-game.</li>
            </ol>
          </div>
        )}
      </div>

      {/* 30-Minute Animation */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('first-anim')}>
          <span style={expandArrowStyle}>►</span>
          Create Your First Animation (30 Minutes)
        </div>
        {expandedSection === 'first-anim' && (
          <div style={contentStyle}>
            <p><strong>What you'll create:</strong> Simple idle animation with subtle weight shift</p>
            <p><strong>Duration:</strong> ~30 frames (1 second at 30 FPS)</p>
            <p><strong>Bones:</strong> Pelvis, Spine, Head</p>

            <div style={headingStyle}>Timeline Breakdown</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Task</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>0:00</td>
                  <td style={tdStyle}>Setup</td>
                  <td style={tdStyle}>Import skeleton, create track</td>
                </tr>
                <tr>
                  <td style={tdStyle}>5:00</td>
                  <td style={tdStyle}>Frame 0</td>
                  <td style={tdStyle}>Key neutral pose</td>
                </tr>
                <tr>
                  <td style={tdStyle}>10:00</td>
                  <td style={tdStyle}>Frame 15</td>
                  <td style={tdStyle}>Weight shift keyframe</td>
                </tr>
                <tr>
                  <td style={tdStyle}>15:00</td>
                  <td style={tdStyle}>Frame 30</td>
                  <td style={tdStyle}>Return to neutral</td>
                </tr>
                <tr>
                  <td style={tdStyle}>20:00</td>
                  <td style={tdStyle}>Polish</td>
                  <td style={tdStyle}>Smooth curves, details</td>
                </tr>
                <tr>
                  <td style={tdStyle}>25:00</td>
                  <td style={tdStyle}>Configure</td>
                  <td style={tdStyle}>Set animation properties</td>
                </tr>
                <tr>
                  <td style={tdStyle}>30:00</td>
                  <td style={tdStyle}>Export</td>
                  <td style={tdStyle}>Save as .hkx</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Detailed Steps</div>
            <p><strong>1. Setup (0-5 min)</strong></p>
            <ul>
              <li>File {'->'} New</li>
              <li>File {'->'} Import {'->'} [character skeleton.nif]</li>
              <li>Havok {'->'} Create Animation Track</li>
            </ul>

            <p><strong>2. Frame 0 - T Pose (5 min)</strong></p>
            <ul>
              <li>Timeline: Move to frame 0</li>
              <li>Select Pelvis, Head, Spine bones</li>
              <li>Set keyframes (Press K)</li>
            </ul>

            <p><strong>3. Frame 15 - Weight Shift (10 min)</strong></p>
            <ul>
              <li>Timeline: Move to frame 15</li>
              <li>Select Pelvis: Rotate ~5° left/right</li>
              <li>Select Head: Tilt ~3° opposite</li>
              <li>Set keyframes</li>
            </ul>

            <p><strong>4. Frame 30 - Return (15 min)</strong></p>
            <ul>
              <li>Move to frame 30</li>
              <li>Rotate bones back to neutral</li>
              <li>Set keyframes</li>
            </ul>

            <p><strong>5. Polish & Export (25-30 min)</strong></p>
            <ul>
              <li>Track View {'->'} Smooth keyframe curves</li>
              <li>Set animation properties (30 FPS, loop enabled)</li>
              <li>File {'->'} Export {'->'} Havok (.hkx)</li>
            </ul>

            <p><strong>Result:</strong> Your first Havok animation file! ✓</p>
          </div>
        )}
      </div>

      {/* Essential Concepts */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('concepts')}>
          <span style={expandArrowStyle}>►</span>
          Essential Concepts
        </div>
        {expandedSection === 'concepts' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Havok Skeleton Structure</div>
            <p>A <strong>skeleton</strong> is a hierarchy of <strong>bones</strong> (joints):</p>
            <div style={codeBlockStyle}>
              {`Root
└─ Pelvis (PRIMARY CONTROL)
   ├─ Spine
   │  ├─ Spine1
   │  │  ├─ Spine2
   │  │  │  ├─ Neck
   │  │  │  │  ├─ Head
   │  │  │  │  └─ Eyes
   │  │  │  └─ LClavicle/RClavicle (shoulders)
   ├─ LThigh/RThigh (legs)
   └─ Weapon slots`}
            </div>
            <p><strong>Key Point:</strong> Every bone has a parent. Child bones inherit movement from parents.</p>

            <div style={headingStyle}>Animation Keyframes</div>
            <p>A <strong>keyframe</strong> stores position and rotation at a specific time:</p>
            <div style={codeBlockStyle}>
              {`Frame 0: Neutral Pose
└─ Pelvis: Rotate=0°, Pos=(0,0,0)
└─ Head: Rotate=0°

Frame 15: Weight Shift
└─ Pelvis: Rotate=5°, Pos=(0.1,0,0)
└─ Head: Rotate=-3°

Frame 30: Back to Neutral
└─ Pelvis: Rotate=0°, Pos=(0,0,0)
└─ Head: Rotate=0°

(Engine interpolates between keyframes)`}
            </div>

            <div style={headingStyle}>Animation Properties</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Property</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Example</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Duration</td>
                  <td style={tdStyle}>Total frames</td>
                  <td style={tdStyle}>30 frames = 1 second</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Frame Rate</td>
                  <td style={tdStyle}>Playback speed</td>
                  <td style={tdStyle}>30 FPS (standard FO4)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Loop</td>
                  <td style={tdStyle}>Repeats</td>
                  <td style={tdStyle}>Yes (idle), No (attack)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Blend In</td>
                  <td style={tdStyle}>Smooth start</td>
                  <td style={tdStyle}>0.1 sec = 3 frames</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Blend Out</td>
                  <td style={tdStyle}>Smooth end</td>
                  <td style={tdStyle}>0.1 sec = 3 frames</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>Physics Shapes</div>
            <p>Havok provides collision shapes for realistic physics:</p>
            <ul>
              <li><strong>Capsule:</strong> Limbs, arms, legs (most common)</li>
              <li><strong>Sphere:</strong> Joints, head</li>
              <li><strong>Box:</strong> Armor pieces, objects</li>
              <li><strong>Compound:</strong> Complex objects</li>
            </ul>
          </div>
        )}
      </div>

      {/* Shortcuts & Workflows */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('shortcuts')}>
          <span style={expandArrowStyle}>►</span>
          Shortcuts & Workflows
        </div>
        {expandedSection === 'shortcuts' && (
          <div style={contentStyle}>
            <div style={headingStyle}>3DS Max Keyboard Shortcuts</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Key</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>K</td>
                  <td style={tdStyle}>Set keyframe for selected bone</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Delete</td>
                  <td style={tdStyle}>Remove keyframe at current frame</td>
                </tr>
                <tr>
                  <td style={tdStyle}>G</td>
                  <td style={tdStyle}>Go to specific frame</td>
                </tr>
                <tr>
                  <td style={tdStyle}>N</td>
                  <td style={tdStyle}>Create new animation track</td>
                </tr>
                <tr>
                  <td style={tdStyle}>{'< >'}</td>
                  <td style={tdStyle}>Previous/Next frame</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Home/End</td>
                  <td style={tdStyle}>First/Last frame</td>
                </tr>
              </tbody>
            </table>

            <div style={headingStyle}>HavokMax Typical Workflow</div>
            <div style={codeBlockStyle}>
              {`1. File > Import > [base skeleton]
2. Havok > Create Animation Track
3. Animate bones (set keyframes)
4. Havok > Animation Properties (configure)
5. File > Export > Havok (.hkx)
6. Test in game`}
            </div>

            <div style={headingStyle}>Quick Physics Setup</div>
            <div style={codeBlockStyle}>
              {`For a simple ragdoll:
1. Havok > Create Physics Shapes
2. For each limb:
   - Select bone
   - Havok > Add Capsule Shape
   - Adjust size/rotation
   - Set mass (1-5 per limb)
3. Export as .hkx`}
            </div>
          </div>
        )}
      </div>

      {/* File Formats */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('formats')}>
          <span style={expandArrowStyle}>►</span>
          File Format Reference
        </div>
        {expandedSection === 'formats' && (
          <div style={contentStyle}>
            <div style={headingStyle}>.hkx (Havok Data Container)</div>
            <ul>
              <li><strong>What:</strong> Binary format with Havok data</li>
              <li><strong>Contains:</strong> Animation keyframes, physics shapes, behavior data</li>
              <li><strong>Used for:</strong> Exporting from 3DS Max</li>
              <li><strong>Size:</strong> Usually 50KB-500KB</li>
              <li><strong>Created by:</strong> HavokMax export</li>
            </ul>

            <div style={headingStyle}>.nif (Fallout 4 Mesh Format)</div>
            <ul>
              <li><strong>What:</strong> 3D model format with embedded Havok</li>
              <li><strong>Contains:</strong> 3D geometry, skeleton, physics, animation</li>
              <li><strong>Used for:</strong> Characters, armor, weapons</li>
              <li><strong>Size:</strong> Usually 100KB-2MB</li>
            </ul>

            <div style={headingStyle}>.xml/.txt (Behavior Graphs)</div>
            <ul>
              <li><strong>What:</strong> Animation state machine definition</li>
              <li><strong>Contains:</strong> States, transitions, events</li>
              <li><strong>Used for:</strong> Complex animation logic</li>
              <li><strong>Format:</strong> Human-readable (XML structured text)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('troubleshooting')}>
          <span style={expandArrowStyle}>►</span>
          Troubleshooting Common Issues
        </div>
        {expandedSection === 'troubleshooting' && (
          <div style={contentStyle}>
            <div style={headingStyle}>HavokMax Not in 3DS Max</div>
            <div style={codeBlockStyle}>
              {`Fix:
1. Verify HavokMax.dlu in plugins folder
2. Check 3DS Max version (needs 2018+)
3. Restart 3DS Max
4. Check Asset Tracking for errors
5. Rebuild HavokMax if still missing`}
            </div>

            <div style={headingStyle}>Animation Plays Too Fast/Slow</div>
            <div style={codeBlockStyle}>
              {`Fix:
1. Check Frame Rate (should be 30 FPS)
2. Count actual frames
3. Duration / Frame Rate = seconds
4. Adjust Frame Rate in Properties
5. Re-export`}
            </div>

            <div style={headingStyle}>Bones Don't Move</div>
            <div style={codeBlockStyle}>
              {`Fix:
1. Verify keyframes set (check Track View)
2. Ensure animation track selected
3. Confirm bones in hierarchy
4. Check keyframe times (not all frame 0)
5. Verify track animation range`}
            </div>

            <div style={headingStyle}>Export Fails</div>
            <div style={codeBlockStyle}>
              {`Fix:
1. Select animated objects first
2. Check file write permissions
3. Verify Havok SDK environment variable
4. Try different folder
5. Check 3DS Max output log`}
            </div>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('next')}>
          <span style={expandArrowStyle}>►</span>
          Next Steps After First Animation
        </div>
        {expandedSection === 'next' && (
          <div style={contentStyle}>
            <div style={headingStyle}>Phase 1: Practice Basic Animations</div>
            <ol>
              <li>Walk cycle (16-24 frames)</li>
              <li>Run cycle (12-16 frames)</li>
              <li>Sitting to standing transition</li>
              <li>Combat idle stance</li>
            </ol>

            <div style={headingStyle}>Phase 2: Learn Physics</div>
            <ol>
              <li>Add capsule shapes to limbs</li>
              <li>Configure mass values</li>
              <li>Test ragdoll behavior</li>
              <li>Adjust constraints</li>
            </ol>

            <div style={headingStyle}>Phase 3: Advanced Animations</div>
            <ol>
              <li>Multi-part animations (blend tracks)</li>
              <li>Behavior graphs (state machines)</li>
              <li>Event synchronization (timing)</li>
              <li>Complex interactions (lockpicking, terminals)</li>
            </ol>

            <div style={headingStyle}>Phase 4: Integration</div>
            <ol>
              <li>Embed animation in NIF files</li>
              <li>Register in behavior graphs</li>
              <li>Link to game events</li>
              <li>Test in Creation Kit</li>
            </ol>
          </div>
        )}
      </div>

      {/* Animation Durations */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('durations')}>
          <span style={expandArrowStyle}>►</span>
          Animation Duration Cheat Sheet
        </div>
        {expandedSection === 'durations' && (
          <div style={contentStyle}>
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
                <tr>
                  <td style={tdStyle}>Emote</td>
                  <td style={tdStyle}>2-4 sec</td>
                  <td style={tdStyle}>60-120 frames</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tutorials */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('tutorials')}>
          <span style={expandArrowStyle}>►</span>
          Recommended Tutorials
        </div>
        {expandedSection === 'tutorials' && (
          <div style={contentStyle}>
            <ul>
              <li><a href="https://www.youtube.com/watch?v=PZ5nP8mwzDA&list=PLGGw--fFEeZd5HM9shaaANPuXP9zAgmAN" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>FO4 Havok animation playlist</a> (follow-along basics)</li>
            </ul>
            <p style={{ color: '#00d000', marginTop: '10px' }}>
              Watch alongside this quick start to see each step demonstrated in 3DS Max and HavokMax.
            </p>
          </div>
        )}
      </div>

      {/* Credits */}
      <div style={sectionStyle}>
        <div style={titleStyle} onClick={() => toggleSection('credits')}>
          <span style={expandArrowStyle}>►</span>
          Credits & Sources
        </div>
        {expandedSection === 'credits' && (
          <div style={contentStyle}>
            <ul>
              <li>Fallout 4 Animation Kit (F4AK) by ShadeAnimator — kit and original guide</li>
              <li>DexesTTP — HKXPack/HKXAnim tools</li>
              <li>MaikCG — <a href="http://www.nexusmods.com/fallout4/mods/16691/?" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>F4Biped animation rig</a> and guidance</li>
              <li>Contributors: CPU, NifTools team, JoshNZ, Kimbale, Caliente/Ousnius (CBBE)</li>
              <li>F4AK Nexus release: <a href="http://www.nexusmods.com/fallout4/mods/16694/?" target="_blank" rel="noreferrer" style={{ color: '#00ff00' }}>Nexus mod 16694</a></li>
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
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>You Can Now</h3>
        <ul style={{ color: '#cccccc' }}>
          <li>✓ Install Havok SDK, HavokMax, and HavokLib</li>
          <li>✓ Create simple animations in 3DS Max</li>
          <li>✓ Export animations to .hkx format</li>
          <li>✓ Understand Havok skeleton structure</li>
          <li>✓ Configure animation properties correctly</li>
          <li>✓ Troubleshoot common setup issues</li>
          <li>✓ Create your first animation in 30 minutes</li>
        </ul>
        <p style={{ color: '#00d000', marginTop: '15px' }}>
          <strong>For deeper learning:</strong> See the complete Havok guides for physics configuration, 
          behavior graphs, and advanced Fallout 4 integration techniques.
        </p>
      </div>
    </div>
  );
};

export default HavokQuickStartGuide;
