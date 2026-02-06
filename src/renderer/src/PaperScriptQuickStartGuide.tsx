import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openExternal } from './utils/openExternal';

const PaperScriptQuickStartGuide = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-start');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    background: '#0a0e27',
    color: '#e0e0e0',
    fontFamily: 'Courier New, monospace',
    minHeight: '100vh'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '2rem',
    borderBottom: '2px solid #00d000',
    paddingBottom: '1.5rem'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: '0.5rem',
    textShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: '#00d000'
  };

  const sectionStyle: React.CSSProperties = {
    border: '1px solid #00d000',
    borderRadius: '4px',
    overflow: 'hidden',
    background: 'rgba(0, 16, 0, 0.3)',
    marginBottom: '1.5rem'
  };

  const sectionHeaderStyle = (isExpanded: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '1rem',
    background: isExpanded ? 'rgba(0, 64, 0, 0.5)' : 'rgba(0, 32, 0, 0.5)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'Courier New, monospace',
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  });

  const contentStyle: React.CSSProperties = {
    padding: '1.5rem',
    background: 'rgba(0, 10, 0, 0.2)',
    borderTop: '1px solid #00d000'
  };

  const codeBlockStyle: React.CSSProperties = {
    background: '#000000',
    border: '1px solid #00d000',
    borderRadius: '4px',
    padding: '1rem',
    overflowX: 'auto',
    margin: '1rem 0',
    fontSize: '0.85rem',
    color: '#00ff00',
    fontFamily: 'Courier New, monospace',
    lineHeight: '1.4'
  };

  const featureBoxStyle: React.CSSProperties = {
    background: 'rgba(0, 128, 0, 0.1)',
    borderLeft: '4px solid #00ff00',
    padding: '1rem',
    margin: '1rem 0',
    borderRadius: '4px'
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem',
  };

  const smallButtonStyle: React.CSSProperties = {
    background: 'rgba(0, 255, 0, 0.08)',
    border: '1px solid #00d000',
    color: '#00ff00',
    padding: '0.35rem 0.6rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Courier New, monospace',
    fontSize: '0.85rem',
  };

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
  };

  const stepStyle: React.CSSProperties = {
    marginLeft: '1.5rem',
    paddingLeft: '1rem',
    borderLeft: '2px solid #00d000',
    marginBottom: '1rem'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>PaperScript Quick Start</h1>
        <p style={subtitleStyle}>Get started in 15 minutes</p>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>Tools / Install / Verify (Fallout 4)</h3>
        <ul style={{ marginLeft: '1.25rem', color: '#b0b0b0', lineHeight: 1.6 }}>
          <li><strong>PaperScript binary</strong> (transpiler) + a folder to put it in (e.g. <code style={{ color: '#00ff00' }}>C:\Dev\PaperScript</code>).</li>
          <li><strong>Creation Kit</strong> (Papyrus compile). You’ll compile the generated <code style={{ color: '#00ff00' }}>.psc</code> into <code style={{ color: '#00ff00' }}>.pex</code>.</li>
          <li><strong>FO4Edit</strong> (optional but strongly recommended) for sanity-checking your plugin + script assets.</li>
        </ul>
        <div style={buttonRowStyle}>
          <button style={smallButtonStyle} onClick={() => openUrl('https://github.com/search?q=PaperScript+Papyrus&type=repositories')}>GitHub search: PaperScript</button>
          <button style={smallButtonStyle} onClick={() => openUrl('https://store.steampowered.com/search/?term=Creation%20Kit%20Fallout%204')}>Steam search: Creation Kit</button>
          <button style={smallButtonStyle} onClick={() => openNexusSearch('FO4Edit')}>Nexus search: FO4Edit</button>
        </div>
        <div style={buttonRowStyle}>
          <button style={smallButtonStyle} onClick={() => navigate('/install-wizard')}>In-app: Install Wizard</button>
          <button style={smallButtonStyle} onClick={() => navigate('/ck-quest-dialogue')}>In-app: CK Quest/Dialogue Wizard</button>
          <button style={smallButtonStyle} onClick={() => navigate('/packaging-release')}>In-app: Packaging & Release</button>
        </div>
        <div style={{ marginTop: '0.75rem', color: '#b0b0b0' }}>
          <strong>Fast verify:</strong> run <code style={{ color: '#00ff00' }}>paperscript --version</code> → transpile one file → compile in CK → confirm <code style={{ color: '#00ff00' }}>.pex</code> is produced.
        </div>
      </div>

      {/* Quick Start */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('quick-start')}
          style={sectionHeaderStyle(expandedSection === 'quick-start')}
        >
          <span>⚡ 7-Step Quick Start (15 Minutes)</span>
          <span>{expandedSection === 'quick-start' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'quick-start' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 1: Download PaperScript</h4>
              <div style={stepStyle}>
                <p>Visit the PaperScript GitHub releases page and download the latest version for your OS.</p>
                <p style={{fontSize: '0.9rem', color: '#b0b0b0'}}>Supports: Windows, Linux, macOS</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <button style={smallButtonStyle} onClick={() => openUrl('https://github.com/search?q=PaperScript+Papyrus+releases&type=repositories')}>Find releases (GitHub search)</button>
                </div>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 2: Extract Files</h4>
              <div style={stepStyle}>
                <p>Extract the PaperScript release to a folder in your development directory.</p>
                <pre style={codeBlockStyle}>C:\Dev\PaperScript\</pre>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 3: Create Project Folder</h4>
              <div style={stepStyle}>
                <p>Set up your mod project structure:</p>
                <pre style={codeBlockStyle}>{`MyMod/
├── PaperScript/
│   └── src/
│       └── MyScript.paper
├── Scripts/
│   └── Source/
└── README.md`}</pre>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 4: Write Your First Script</h4>
              <div style={stepStyle}>
                <p>Create <code style={{color: '#00ff00'}}>MyScript.paper</code>:</p>
                <pre style={codeBlockStyle}>{`script MyScript : ObjectReference {
    auto property PlayerREF: Actor

    event OnInit() {
        PlayerREF = Game.GetPlayer()
    }
}`}</pre>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 5: Run the Transpiler</h4>
              <div style={stepStyle}>
                <p>Open command prompt/terminal and run:</p>
                <pre style={codeBlockStyle}>{`paperscript MyScript.paper -o Scripts/Source/`}</pre>
                <p style={{fontSize: '0.9rem', color: '#b0b0b0'}}>This generates <code style={{color: '#00ff00'}}>MyScript.psc</code></p>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 6: Compile with Creation Kit</h4>
              <div style={stepStyle}>
                <p>Open your .psc file in the Creation Kit script editor and compile as normal.</p>
                <p style={{fontSize: '0.9rem', color: '#b0b0b0'}}>Creates <code style={{color: '#00ff00'}}>MyScript.pex</code></p>
              </div>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Step 7: Test Your Mod</h4>
              <div style={stepStyle}>
                <p>Package your mod with the .pex files and test in-game!</p>
                <ul style={{ marginLeft: '1.25rem', color: '#b0b0b0', marginTop: '0.5rem' }}>
                  <li>Confirm <code style={{color: '#00ff00'}}>.pex</code> is inside your mod’s <code style={{color: '#00ff00'}}>Scripts\</code> folder (not only Source).</li>
                  <li>Start a new save or clean profile for the first test.</li>
                  <li>Trigger the script (quest/init/event) and confirm it runs (log, visible behavior, or a debug notification).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('requirements')}
          style={sectionHeaderStyle(expandedSection === 'requirements')}
        >
          <span>System Requirements</span>
          <span>{expandedSection === 'requirements' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'requirements' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Required</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li style={{margin: '0.5rem 0'}}>Fallout 4 or Skyrim SE/AE (installed game)</li>
                <li style={{margin: '0.5rem 0'}}>Creation Kit (for script compilation)</li>
                <li style={{margin: '0.5rem 0'}}>PaperScript release (Windows/Linux/macOS)</li>
                <li style={{margin: '0.5rem 0'}}>Text editor or IDE</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Optional but Recommended</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li style={{margin: '0.5rem 0'}}>Visual Studio Code with PaperScript syntax support</li>
                <li style={{margin: '0.5rem 0'}}>Git for version control</li>
                <li style={{margin: '0.5rem 0'}}>Papyrus documentation for reference</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Syntax Reference */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('syntax')}
          style={sectionHeaderStyle(expandedSection === 'syntax')}
        >
          <span>Syntax Reference</span>
          <span>{expandedSection === 'syntax' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'syntax' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Type System</h4>
            <pre style={codeBlockStyle}>{`Int                  // 32-bit integer
Float                // Floating-point number
String               // Text
Bool                 // True/false
ObjectReference      // Game object
Actor                // Actor/NPC
Form                 // Generic game form
and more...`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Operators</h4>
            <pre style={codeBlockStyle}>{`+    // Addition/concatenation
-    // Subtraction
*    // Multiplication
/    // Division
%    // Modulo
==   // Equal
!=   // Not equal
>    // Greater than
<    // Less than
&&   // Logical AND
||   // Logical OR
!    // Logical NOT`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Common Patterns</h4>
            <pre style={codeBlockStyle}>{`// Null check
if (actor) {
    actor.AddItem(item, 1)
}

// Type check
if (actor as Actor) {
    // Safe to use as Actor
}

// Loop
while (i < 10) {
    DoSomething()
    i = i + 1
}`}</pre>
          </div>
        )}
      </div>

      {/* Compilation */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('compilation')}
          style={sectionHeaderStyle(expandedSection === 'compilation')}
        >
          <span>Compilation & CLI</span>
          <span>{expandedSection === 'compilation' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'compilation' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Basic Usage</h4>
            <pre style={codeBlockStyle}>{`paperscript input.paper              # Transpile to stdout
paperscript input.paper -o outdir   # Transpile to directory
paperscript *.paper -o Scripts/Source  # Batch transpile`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Common Options</h4>
            <pre style={codeBlockStyle}>{`--version              # Show version
--help                 # Show help
--target <version>     # Target Fallout 4/Skyrim
--watch                # Watch for changes
--emit-papyrus         # Output Papyrus code`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Watch Mode for Development</h4>
              <p style={{marginBottom: '0.5rem'}}>Automatically recompile when files change:</p>
              <pre style={codeBlockStyle}>{`paperscript src/ --watch -o Scripts/Source/`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('config')}
          style={sectionHeaderStyle(expandedSection === 'config')}
        >
          <span>Project Configuration</span>
          <span>{expandedSection === 'config' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'config' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>paperscript.json</h4>
            <p style={{marginBottom: '1rem'}}>Create this in your project root to configure the transpiler:</p>
            <pre style={codeBlockStyle}>{`{
  "sourceDir": "PaperScript/src",
  "outputDir": "Scripts/Source",
  "target": "fallout4",
  "preprocessor": true,
  "strictMode": false,
  "includes": []
}`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Configuration Options</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li><strong style={{color: '#00ff00'}}>sourceDir</strong>: Where to find .paper files</li>
                <li><strong style={{color: '#00ff00'}}>outputDir</strong>: Where to put .psc files</li>
                <li><strong style={{color: '#00ff00'}}>target</strong>: "fallout4" or "skyrim"</li>
                <li><strong style={{color: '#00ff00'}}>preprocessor</strong>: Enable #define support</li>
                <li><strong style={{color: '#00ff00'}}>strictMode</strong>: Strict type checking</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('troubleshooting')}
          style={sectionHeaderStyle(expandedSection === 'troubleshooting')}
        >
          <span>Troubleshooting</span>
          <span>{expandedSection === 'troubleshooting' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'troubleshooting' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Transpiler Not Found</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> "paperscript is not recognized"</p>
              <p><strong style={{color: '#00d000'}}>Solution:</strong></p>
              <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                <li>Add PaperScript folder to PATH environment variable</li>
                <li>Or use full path: <code style={{color: '#00ff00'}}>/path/to/paperscript file.paper</code></li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Syntax Errors in Generated Code</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> Creation Kit can't compile the .psc file</p>
              <p><strong style={{color: '#00d000'}}>Solution:</strong></p>
              <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                <li>Check your .paper file for syntax errors</li>
                <li>Ensure property types match Fallout 4 API</li>
                <li>Look at generated .psc file for clues</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Script Crashes at Runtime</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> Game crashes when script runs</p>
              <p><strong style={{color: '#00d000'}}>Solution:</strong></p>
              <ul style={{marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                <li>Check Fallout 4 log file for error messages</li>
                <li>Verify all forms are correctly initialized</li>
                <li>Check for null references before use</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop: '3rem', borderTop: '1px solid #00d000', paddingTop: '1.5rem', textAlign: 'center', color: '#00d000'}}>
        <p>PaperScript Quick Start Guide | Part of Mossy</p>
      </div>
    </div>
  );
};

export default PaperScriptQuickStartGuide;
