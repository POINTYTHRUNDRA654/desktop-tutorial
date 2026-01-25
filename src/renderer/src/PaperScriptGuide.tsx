import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PaperScriptGuide = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('intro');

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
    fontSize: '1rem',
    color: '#00d000',
    marginBottom: '0.5rem'
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
    background: 'rgba(0, 32, 0, 0.5)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.3s ease',
    fontFamily: 'Courier New, monospace',
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    backgroundColor: isExpanded ? 'rgba(0, 64, 0, 0.5)' : 'rgba(0, 32, 0, 0.5)'
  });

  const contentStyle: React.CSSProperties = {
    padding: '1.5rem',
    background: 'rgba(0, 10, 0, 0.2)',
    borderTop: '1px solid #00d000',
    lineHeight: '1.6'
  };

  const codeBlockStyle: React.CSSProperties = {
    background: '#000000',
    border: '1px solid #00d000',
    borderRadius: '4px',
    padding: '1rem',
    overflowX: 'auto',
    margin: '1rem 0',
    fontSize: '0.9rem',
    color: '#00ff00',
    fontFamily: 'Courier New, monospace'
  };

  const featureBoxStyle: React.CSSProperties = {
    background: 'rgba(0, 128, 0, 0.1)',
    borderLeft: '4px solid #00ff00',
    padding: '1rem',
    margin: '1rem 0',
    borderRadius: '4px'
  };

  const listStyle: React.CSSProperties = {
    marginLeft: '1.5rem',
    color: '#b0b0b0'
  };

  const listItemStyle: React.CSSProperties = {
    margin: '0.5rem 0',
    lineHeight: '1.6'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>PaperScript Guide</h1>
        <p style={subtitleStyle}>Modern Scripting for Fallout 4</p>
      </div>

      {/* Introduction */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('intro')}
          style={sectionHeaderStyle(expandedSection === 'intro')}
        >
          <span>Introduction to PaperScript</span>
          <span>{expandedSection === 'intro' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'intro' && (
          <div style={contentStyle}>
            <p>PaperScript is a modern scripting language that transpiles into valid Papyrus code. It offers a more developer-friendly syntax while maintaining 100% compatibility with Fallout 4.</p>
            
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Key Facts</h4>
              <ul style={listStyle}>
                <li style={listItemStyle}><strong>Status:</strong> Production-ready</li>
                <li style={listItemStyle}><strong>Target:</strong> Fallout 4 & Skyrim</li>
                <li style={listItemStyle}><strong>Output:</strong> Transpiles to Papyrus .psc</li>
                <li style={listItemStyle}><strong>Compatibility:</strong> 100% compatible</li>
              </ul>
            </div>

            <h4 style={{color: '#00ff00', marginTop: '1.5rem'}}>Transpilation Pipeline</h4>
            <pre style={codeBlockStyle}>PaperScript Code → Transpiler → Papyrus → Game Engine</pre>
          </div>
        )}
      </div>

      {/* Why Use PaperScript */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('why')}
          style={sectionHeaderStyle(expandedSection === 'why')}
        >
          <span>Why Use PaperScript</span>
          <span>{expandedSection === 'why' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'why' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Development Speed</h4>
              <p>Concise syntax means less boilerplate and clearer code:</p>
              <ul style={listStyle}>
                <li style={listItemStyle}>Shorter function declarations</li>
                <li style={listItemStyle}>Better property syntax</li>
                <li style={listItemStyle}>Reduced repetition</li>
                <li style={listItemStyle}>Modern control flow</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Code Clarity</h4>
              <p>Modern syntax makes complex logic easier to read and maintain:</p>
              <ul style={listStyle}>
                <li style={listItemStyle}>Consistent naming conventions</li>
                <li style={listItemStyle}>Clear function purposes</li>
                <li style={listItemStyle}>Less visual clutter</li>
                <li style={listItemStyle}>Better organized code</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Future-Proofing</h4>
              <p>Learning PaperScript prepares you for upcoming features:</p>
              <ul style={listStyle}>
                <li style={listItemStyle}>V2 bytecode compilation</li>
                <li style={listItemStyle}>Advanced language features</li>
                <li style={listItemStyle}>Better tooling and IDE support</li>
                <li style={listItemStyle}>Community-driven improvements</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Getting Started */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('started')}
          style={sectionHeaderStyle(expandedSection === 'started')}
        >
          <span>Getting Started</span>
          <span>{expandedSection === 'started' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'started' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Basic Workflow</h4>
              <ol style={listStyle}>
                <li style={listItemStyle}>Write PaperScript code (.paper files)</li>
                <li style={listItemStyle}>Run transpiler (generates .psc files)</li>
                <li style={listItemStyle}>Copy .psc to Fallout 4 scripts folder</li>
                <li style={listItemStyle}>Compile in Creation Kit as normal</li>
                <li style={listItemStyle}>Package mod with compiled .pex files</li>
              </ol>
            </div>

            <h4 style={{color: '#00ff00', marginTop: '1.5rem'}}>Project Structure</h4>
            <pre style={codeBlockStyle}>{`MyMod/
├── PaperScript/
│   ├── src/
│   │   ├── EquipHandler.paper
│   │   └── ItemFunctions.paper
│   └── build/
│       ├── EquipHandler.psc
│       └── ItemFunctions.psc
├── Scripts/
│   └── (generated .psc files)
└── README.md`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Installation Steps</h4>
              <ol style={listStyle}>
                <li style={listItemStyle}>Download latest PaperScript release</li>
                <li style={listItemStyle}>Extract to your development folder</li>
                <li style={listItemStyle}>Create your first .paper file</li>
                <li style={listItemStyle}>Run transpiler to generate .psc output</li>
                <li style={listItemStyle}>Use in Creation Kit normally</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Syntax Basics */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('syntax')}
          style={sectionHeaderStyle(expandedSection === 'syntax')}
        >
          <span>Basic Syntax</span>
          <span>{expandedSection === 'syntax' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'syntax' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Script Declaration</h4>
            <pre style={codeBlockStyle}>{`script MyScript : ObjectReference {
    // Your code here
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Properties</h4>
            <pre style={codeBlockStyle}>{`auto property PlayerREF: Actor
auto property Count: Int = 10
property Hidden: Float`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Functions</h4>
            <pre style={codeBlockStyle}>{`def GetValue() -> Int {
    return 42
}

def Add(a: Int, b: Int) -> Int {
    return a + b
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Control Flow</h4>
            <pre style={codeBlockStyle}>{`if (condition) {
    DoSomething()
} else {
    DoOther()
}

while (condition) {
    DoLoop()
}`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Preprocessor Support</h4>
              <p>PaperScript includes C-like preprocessor directives:</p>
              <pre style={codeBlockStyle}>{`#define DEBUG
#define VERSION "1.0"

#if DEBUG
    Debug.Notification("Debug mode")
#endif`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('features')}
          style={sectionHeaderStyle(expandedSection === 'features')}
        >
          <span>Key Features & Examples</span>
          <span>{expandedSection === 'features' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'features' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Example: Event Handler</h4>
            <pre style={codeBlockStyle}>{`script OnEquipHandler : ObjectReference {
    auto property PlayerREF: Actor
    auto property Gold001: MiscItem
    
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(Gold001, 10)
        Debug.MessageBox("Armor grants you money")
    }
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Example: Functions with Type Safety</h4>
            <pre style={codeBlockStyle}>{`script SomeFunctions {
    auto property Gold001: MiscItem

    def GiveReward(player: Actor, amount: Int) {
        if (player && amount > 0) {
            player.AddItem(Gold001, amount)
        }
    }
    
    def GetBonus(value: Float) -> Float {
        return value * 1.5
    }
}`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Modern Language Features</h4>
              <ul style={listStyle}>
                <li style={listItemStyle}>Type inference in many contexts</li>
                <li style={listItemStyle}>Null-safety checks</li>
                <li style={listItemStyle}>Modern control flow syntax</li>
                <li style={listItemStyle}>Cleaner property declarations</li>
                <li style={listItemStyle}>Better function organization</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Comparison */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('comparison')}
          style={sectionHeaderStyle(expandedSection === 'comparison')}
        >
          <span>Comparison with Papyrus</span>
          <span>{expandedSection === 'comparison' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'comparison' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Syntax Differences</h4>
            </div>
            
            <table style={{width: '100%', marginBottom: '1rem', borderCollapse: 'collapse'}}>
              <thead style={{background: 'rgba(0, 32, 0, 0.5)'}}>
                <tr>
                  <th style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>Feature</th>
                  <th style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>Papyrus</th>
                  <th style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>PaperScript</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{borderBottom: '1px solid #00d000'}}>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem'}}>Script Declaration</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>ScriptName X extends Y</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>script X : Y {}</td>
                </tr>
                <tr style={{borderBottom: '1px solid #00d000'}}>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem'}}>Properties</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>Type Property Name Auto</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>auto property Name: Type</td>
                </tr>
                <tr style={{borderBottom: '1px solid #00d000'}}>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem'}}>Functions</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>Function Name()</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>def Name()</td>
                </tr>
                <tr style={{borderBottom: '1px solid #00d000'}}>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem'}}>Return Type</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>returns Type</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>{'->'} Type</td>
                </tr>
                <tr>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem'}}>End Block</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>EndFunction/EndIf</td>
                  <td style={{border: '1px solid #00d000', padding: '0.5rem', color: '#00ff00'}}>{'{}'} (braces)</td>
                </tr>
              </tbody>
            </table>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Learning Path</h4>
              <p><strong style={{color: '#00ff00'}}>If experienced with Papyrus:</strong></p>
              <ul style={listStyle}>
                <li style={listItemStyle}>Different syntax, same concepts</li>
                <li style={listItemStyle}>Quick transition (1-2 hours)</li>
                <li style={listItemStyle}>All game functions still available</li>
              </ul>
              <p style={{marginTop: '1rem'}}><strong style={{color: '#00ff00'}}>If new to scripting:</strong></p>
              <ul style={listStyle}>
                <li style={listItemStyle}>PaperScript is more accessible</li>
                <li style={listItemStyle}>Modern syntax is intuitive</li>
                <li style={listItemStyle}>Learn Papyrus concepts alongside</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Resources */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('resources')}
          style={sectionHeaderStyle(expandedSection === 'resources')}
        >
          <span>Resources & Community</span>
          <span>{expandedSection === 'resources' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'resources' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Official Resources</h4>
              <ul style={listStyle}>
                <li style={listItemStyle}><strong>GitHub Repository</strong> - Source code and issues</li>
                <li style={listItemStyle}><strong>Official Documentation</strong> - Complete API reference</li>
                <li style={listItemStyle}><strong>Release Notes</strong> - Latest features and changes</li>
                <li style={listItemStyle}><strong>Example Code</strong> - Sample scripts and tutorials</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Community Resources</h4>
              <ul style={listStyle}>
                <li style={listItemStyle}><strong>Modding Forums</strong> - Nexus Mods, Reddit</li>
                <li style={listItemStyle}><strong>Discord Servers</strong> - Real-time help</li>
                <li style={listItemStyle}><strong>GitHub Discussions</strong> - Ask questions</li>
                <li style={listItemStyle}><strong>Papyrus Guides</strong> - Still relevant for game functions</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Recommended Learning Path</h4>
              <ol style={listStyle}>
                <li style={listItemStyle}><strong>Learn Papyrus Fundamentals</strong> - Understand game functions</li>
                <li style={listItemStyle}><strong>Study PaperScript Syntax</strong> - Read docs and examples</li>
                <li style={listItemStyle}><strong>Practice Simple Scripts</strong> - Event handlers, basic functions</li>
                <li style={listItemStyle}><strong>Build Mods</strong> - Create actual projects</li>
                <li style={listItemStyle}><strong>Join Community</strong> - Ask and help others</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop: '3rem', borderTop: '1px solid #00d000', paddingTop: '1.5rem', textAlign: 'center', color: '#00d000'}}>
        <p>PaperScript Guide | Part of Mossy - Complete Fallout 4 Modding Documentation</p>
      </div>
    </div>
  );
};

export default PaperScriptGuide;
