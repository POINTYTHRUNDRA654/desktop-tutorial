import React, { useState } from 'react';
import styles from './GuideStyles.module.css';

const PaperScriptGuide: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    intro: true,
    what: false,
    why: false,
    getting_started: false,
    syntax: false,
    features: false,
    comparison: false,
    advanced: false,
    resources: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader: React.FC<{ 
    title: string; 
    section: string;
    subtitle?: string;
  }> = ({ title, section, subtitle }) => (
    <button
      className={styles.sectionHeader}
      onClick={() => toggleSection(section)}
    >
      <span className={styles.sectionTitle}>{title}</span>
      {subtitle && <span className={styles.sectionSubtitle}>{subtitle}</span>}
      <span className={styles.expandIcon}>
        {expandedSections[section] ? '▼' : '▶'}
      </span>
    </button>
  );

  const CodeBlock: React.FC<{ 
    code: string; 
    language?: string;
  }> = ({ code, language = 'paperscript' }) => (
    <pre className={styles.codeBlock}>
      <code className={styles[`lang-${language}`]}>
        {code}
      </code>
    </pre>
  );

  const FeatureBox: React.FC<{ 
    title: string; 
    children: React.ReactNode 
  }> = ({ title, children }) => (
    <div className={styles.featureBox}>
      <h4>{title}</h4>
      <div className={styles.featureContent}>{children}</div>
    </div>
  );

  const ComparisonTable: React.FC<{
    data: Array<[string, string, string]>;
  }> = ({ data }) => (
    <table className={styles.comparisonTable}>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Papyrus</th>
          <th>PaperScript</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const SyntaxExample: React.FC<{
    title: string;
    paperscript: string;
    papyrus: string;
  }> = ({ title, paperscript, papyrus }) => (
    <div className={styles.syntaxExample}>
      <h5>{title}</h5>
      <div className={styles.syntaxComparison}>
        <div className={styles.syntaxColumn}>
          <h6>PaperScript</h6>
          <CodeBlock code={paperscript} language="paperscript" />
        </div>
        <div className={styles.syntaxColumn}>
          <h6>Papyrus</h6>
          <CodeBlock code={papyrus} language="papyrus" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.guideContainer}>
      <div className={styles.guideHeader}>
        <h1>PaperScript Guide</h1>
        <p>Modern Scripting for Fallout 4 & Skyrim</p>
      </div>

      {/* Introduction Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Introduction" 
          section="intro"
          subtitle="What is PaperScript?"
        />
        {expandedSections.intro && (
          <div className={styles.sectionContent}>
            <p>
              PaperScript is a modern scripting language that transpiles into valid Papyrus code, 
              offering a more developer-friendly alternative to writing Papyrus directly. It's inspired 
              by C#, Rust, and Scala, bringing modern language features to Fallout 4 and Skyrim modding.
            </p>
            
            <FeatureBox title="Key Facts">
              <ul>
                <li><strong>Status:</strong> Early development (V1)</li>
                <li><strong>Supported Games:</strong> Skyrim SE/AE, Fallout 4</li>
                <li><strong>Output:</strong> Transpiles to valid Papyrus .psc files</li>
                <li><strong>Compatibility:</strong> 100% compatible with existing Papyrus</li>
              </ul>
            </FeatureBox>

            <div className={styles.infoBox}>
              <h4>Transpilation Pipeline</h4>
              <p><code>PaperScript Code → Transpiler → Papyrus Code → Game Engine</code></p>
            </div>
          </div>
        )}
      </div>

      {/* What is PaperScript Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="What is PaperScript" 
          section="what"
          subtitle="Modern syntax for Papyrus scripting"
        />
        {expandedSections.what && (
          <div className={styles.sectionContent}>
            <FeatureBox title="What PaperScript Adds">
              <ul>
                <li><strong>Modern Syntax:</strong> C#/Rust-inspired code style</li>
                <li><strong>Better DX:</strong> Clearer organization and reduced boilerplate</li>
                <li><strong>Full Compatibility:</strong> 100% compatible with Papyrus</li>
                <li><strong>Same Performance:</strong> Compiles to identical Papyrus code</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="What PaperScript Is NOT">
              <ul>
                <li><strong>Not Standalone:</strong> Requires transpilation to Papyrus</li>
                <li><strong>Not Complete Yet:</strong> V2 will compile directly to PEX</li>
                <li><strong>Not Faster:</strong> Same runtime as Papyrus (same output code)</li>
                <li><strong>Not Removing Papyrus:</strong> Still need Papyrus knowledge</li>
              </ul>
            </FeatureBox>

            <SyntaxExample
              title="Quick Comparison"
              paperscript={`script OnEquipHandler : ObjectReference {
    auto property PlayerREF: Actor
    auto property Gold001: MiscItem
    
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(Gold001, 10)
    }
}`}
              papyrus={`ScriptName OnEquipHandler extends ObjectReference

Actor Property PlayerREF Auto
MiscItem Property Gold001 Auto

Event OnEquipped(Actor akActor)
    PlayerREF.AddItem(Gold001, 10)
EndEvent`}
            />
          </div>
        )}
      </div>

      {/* Why Use PaperScript Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Why Use PaperScript" 
          section="why"
          subtitle="Benefits and advantages"
        />
        {expandedSections.why && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Development Speed">
              <p>
                PaperScript's concise syntax means less boilerplate and clearer intent. 
                The same logic takes fewer lines and is easier to understand.
              </p>
              <ul>
                <li>Shorter function declarations</li>
                <li>Type inference in many cases</li>
                <li>Cleaner property syntax</li>
                <li>Less repetition</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Code Clarity">
              <p>
                Modern syntax makes complex logic easier to understand and maintain. 
                Your future self will thank you.
              </p>
              <ul>
                <li>Modern control flow syntax</li>
                <li>Consistent naming conventions</li>
                <li>Clearer function purposes</li>
                <li>Less visual clutter</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Better Tooling">
              <p>
                As PaperScript develops, expect improved tooling:
              </p>
              <ul>
                <li>IDE syntax highlighting</li>
                <li>Better error detection</li>
                <li>Automated refactoring</li>
                <li>Code analysis and suggestions</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Future-Proofing">
              <p>
                Learning PaperScript now prepares you for:
              </p>
              <ul>
                <li>V2 bytecode compilation (when released)</li>
                <li>Potential performance improvements</li>
                <li>Advanced features not possible in Papyrus</li>
                <li>Easier migration from other languages</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Getting Started Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Getting Started" 
          section="getting_started"
          subtitle="Installation and setup"
        />
        {expandedSections.getting_started && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Basic Workflow">
              <ol>
                <li>Write PaperScript code (<code>.paper</code> files)</li>
                <li>Run transpiler (generates <code>.psc</code> files)</li>
                <li>Copy <code>.psc</code> to Fallout 4 scripts folder</li>
                <li>Compile in Creation Kit as normal</li>
                <li>Package mod with compiled <code>.pex</code> files</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Project Structure">
              <CodeBlock code={`MyMod/
├── PaperScript/
│   ├── src/
│   │   ├── EquipHandler.paper
│   │   └── ItemFunctions.paper
│   └── build/
│       ├── EquipHandler.psc
│       └── ItemFunctions.psc
├── Scripts/
│   └── (generated .psc files)
└── README.md`} language="text" />
            </FeatureBox>

            <FeatureBox title="Installation Steps">
              <ol>
                <li>Download latest PaperScript release from GitHub</li>
                <li>Extract to your development folder</li>
                <li>Add transpiler to PATH (optional)</li>
                <li>Create your first <code>.paper</code> file</li>
                <li>Run transpiler to generate <code>.psc</code> output</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Recommended Editors">
              <ul>
                <li><strong>Visual Studio Code</strong> - Extensions available</li>
                <li><strong>Notepad++</strong> - With custom syntax definition</li>
                <li><strong>Any text editor</strong> - Basic editing works fine</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Basic Syntax Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Basic Syntax" 
          section="syntax"
          subtitle="Core language constructs"
        />
        {expandedSections.syntax && (
          <div className={styles.sectionContent}>
            <SyntaxExample
              title="Script Declaration"
              paperscript="script MyScript : ObjectReference {"
              papyrus="ScriptName MyScript extends ObjectReference"
            />

            <SyntaxExample
              title="Properties"
              paperscript={`auto property PlayerREF: Actor
auto property Count: Int = 10
property Hidden: Float  // Hidden by default`}
              papyrus={`Actor Property PlayerREF Auto
Int Property Count = 10 Auto
Float Property Hidden Auto Hidden`}
            />

            <SyntaxExample
              title="Functions with Returns"
              paperscript={`def GetValue() -> Int {
    return 42
}

def Add(a: Int, b: Int) -> Int {
    return a + b
}`}
              papyrus={`Function GetValue() returns Int
    return 42
EndFunction

Function Add(int a, int b) returns Int
    return a + b
EndFunction`}
            />

            <SyntaxExample
              title="Control Flow"
              paperscript={`if (condition) {
    DoSomething()
} else if (other) {
    DoOther()
} else {
    DoDefault()
}

while (condition) {
    DoLoop()
}`}
              papyrus={`If (condition)
    DoSomething()
ElseIf (other)
    DoOther()
Else
    DoDefault()
EndIf

While (condition)
    DoLoop()
EndWhile`}
            />

            <FeatureBox title="Preprocessor Support">
              <p>PaperScript includes a C-like preprocessor:</p>
              <CodeBlock code={`#define DEBUG
#define VERSION "1.0"

#if DEBUG
Debug.Notification("Debug mode")
#endif`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Features & Examples Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Features & Examples" 
          section="features"
          subtitle="Practical code examples"
        />
        {expandedSections.features && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Example: Event Handler">
              <CodeBlock code={`script OnEquipHandler : ObjectReference {
    auto property PlayerREF: Actor
    auto property Gold001: MiscItem
    
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(Gold001, 10)
        Debug.MessageBox("Armor grants you money")
    }
    
    event OnUnequipped(actor: Actor) {
        PlayerREF.RemoveItem(Gold001, 10)
        Debug.MessageBox("Armor takes your money")
    }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example: Functions">
              <CodeBlock code={`script SomeFunctions {
    auto property Gold001: MiscItem

    def VoidWithNoArgs() {
        Debug.MessageBox("Hello World")
    }
    
    def VoidWithArgs(player: Actor, amount: Int) {
        player.AddItem(Gold001, amount)
    }
    
    def BoolWithNoArgs() -> Bool {
        return true
    }
    
    def FloatWithArgs(first: Float, second: Float) -> Float {
        return first + second
    }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example: Conditional Compilation">
              <CodeBlock code={`#define DEBUG
#define LOG_LEVEL 2

script DebugScript {
    def LogMessage(msg: String) {
        #if DEBUG
        Debug.Notification(msg)
        #if LOG_LEVEL >= 2
        Debug.MessageBox(msg)
        #endif
        #endif
    }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example: Safe Operations">
              <CodeBlock code={`def SafeAddItem(actor: Actor, item: MiscItem, count: Int) {
    if (actor && item && count > 0) {
        actor.AddItem(item, count)
    }
}

event OnInit() {
    if (PlayerREF == none) {
        PlayerREF = Game.GetPlayer()
    }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Comparison Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Comparison with Papyrus" 
          section="comparison"
          subtitle="Feature and syntax differences"
        />
        {expandedSections.comparison && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Syntax Differences">
              <ComparisonTable data={[
                ['Script Declaration', 'ScriptName X extends Y', 'script X : Y { }'],
                ['Properties', 'Type Property Name Auto', 'auto property Name: Type'],
                ['Functions', 'Function Name()', 'def Name()'],
                ['Return Type', 'returns Type', '-> Type'],
                ['End Block', 'EndFunction/EndIf', '} (brace-based)'],
                ['Comments', '; comment', '// comment'],
                ['Type Position', 'Type variable', 'variable: Type'],
              ]} />
            </FeatureBox>

            <FeatureBox title="Feature Support">
              <ComparisonTable data={[
                ['Basic scripting', '✓', '✓'],
                ['Events', '✓', '✓'],
                ['Properties', '✓', '✓'],
                ['Functions', '✓', '✓'],
                ['Conditionals', '✓', '✓'],
                ['Type inference', '✗', '✓'],
                ['Preprocessor', 'Limited', 'Full C-like'],
                ['Modern syntax', '✗', '✓'],
              ]} />
            </FeatureBox>

            <FeatureBox title="Learning Path">
              <p><strong>If experienced with Papyrus:</strong></p>
              <ul>
                <li>Different syntax, same concepts</li>
                <li>Quick transition (1-2 hours)</li>
                <li>Can reference Papyrus guides</li>
                <li>All game functions still available</li>
              </ul>
              <p><strong>If new to scripting:</strong></p>
              <ul>
                <li>PaperScript is more accessible</li>
                <li>Modern syntax is intuitive</li>
                <li>Consider learning Papyrus concepts first</li>
                <li>Both knowledge is beneficial</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Advanced Topics Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Advanced Topics" 
          section="advanced"
          subtitle="Build systems and integration"
        />
        {expandedSections.advanced && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Custom Build System">
              <p>Automate transpilation with a batch file:</p>
              <CodeBlock code={`@echo off
echo Transpiling PaperScript files...

set PAPERSCRIPT_PATH=C:\\PaperScript\\transpiler
set SOURCE_DIR=PaperScript\\src
set BUILD_DIR=Scripts\\Source

for %%f in (%SOURCE_DIR%\\*.paper) do (
    echo Transpiling %%f
    %PAPERSCRIPT_PATH%\\paperscript.exe %%f -o %BUILD_DIR%\\
)

echo Build complete!`} language="batch" />
            </FeatureBox>

            <FeatureBox title="Creation Kit Workflow">
              <ol>
                <li><strong>Development:</strong> Edit .paper files</li>
                <li><strong>Transpile:</strong> Run transpiler for .psc output</li>
                <li><strong>Creation Kit:</strong> CK compiles .psc to .pex</li>
                <li><strong>Testing:</strong> Test in-game</li>
                <li><strong>Distribution:</strong> Package only .pex files</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Best Practices">
              <ul>
                <li>Keep .paper files in src/ folder</li>
                <li>Don't edit generated .psc files directly</li>
                <li>Regenerate on every change</li>
                <li>Use version control for source</li>
                <li>Document build process in README</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Code Organization">
              <p>Group related functionality logically:</p>
              <CodeBlock code={`script MyScript {
    // Properties first
    auto property Item: MiscItem
    
    // Initialization
    event OnInit() { }
    
    // Event handlers
    event OnEquipped(actor: Actor) { }
    
    // Helper functions
    def DoSomething() { }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Resources Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Resources & Community" 
          section="resources"
          subtitle="Learning and support"
        />
        {expandedSections.resources && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Official Resources">
              <ul>
                <li><strong>GitHub Repository</strong> - Source code and issue tracking</li>
                <li><strong>Documentation</strong> - Official guides and API reference</li>
                <li><strong>Release Notes</strong> - Latest features and changes</li>
                <li><strong>Examples</strong> - Sample code for common tasks</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Community Resources">
              <ul>
                <li><strong>Modding Forums</strong> - Nexus Mods, Reddit, specialized forums</li>
                <li><strong>Discord Servers</strong> - Real-time help and discussion</li>
                <li><strong>GitHub Discussions</strong> - Ask questions and share ideas</li>
                <li><strong>Papyrus Guides</strong> - Still relevant for game functions</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Recommended Learning Path">
              <ol>
                <li><strong>Learn Papyrus Fundamentals</strong> - Understand game functions</li>
                <li><strong>Study PaperScript Syntax</strong> - Read docs and examples</li>
                <li><strong>Practice Simple Scripts</strong> - Event handlers, basic functions</li>
                <li><strong>Build More Complex Mods</strong> - Expand your toolkit</li>
                <li><strong>Join Community</strong> - Ask questions and help others</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Staying Updated">
              <ul>
                <li>Watch GitHub repository for releases</li>
                <li>Check official documentation frequently</li>
                <li>Participate in community discussions</li>
                <li>Report issues and suggest features</li>
                <li>Share your work with community</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      <div className={styles.documentFooter}>
        <p>PaperScript Guide | Version 1.0 | Last Updated: January 24, 2026</p>
        <p>Part of Mossy - Complete Fallout 4 Modding Documentation</p>
      </div>
    </div>
  );
};

export default PaperScriptGuide;
