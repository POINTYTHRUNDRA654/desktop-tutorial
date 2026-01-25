import React, { useState } from 'react';
import styles from './GuideStyles.module.css';

const PaperScriptQuickStartGuide: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quick_start: true,
    requirements: false,
    project_setup: false,
    writing: false,
    compilation: false,
    syntax: false,
    configuration: false,
    preprocessor: false,
    patterns: false,
    troubleshooting: false,
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

  const Checklist: React.FC<{
    items: string[];
  }> = ({ items }) => (
    <ul className={styles.checklist}>
      {items.map((item, idx) => (
        <li key={idx}>✓ {item}</li>
      ))}
    </ul>
  );

  const StepGuide: React.FC<{
    steps: Array<{ title: string; content: React.ReactNode }>;
  }> = ({ steps }) => (
    <div className={styles.stepGuide}>
      {steps.map((step, idx) => (
        <div key={idx} className={styles.step}>
          <div className={styles.stepNumber}>{idx + 1}</div>
          <div className={styles.stepContent}>
            <h5>{step.title}</h5>
            {step.content}
          </div>
        </div>
      ))}
    </div>
  );

  const ComparisonTable: React.FC<{
    headers: string[];
    rows: string[][];
  }> = ({ headers, rows }) => (
    <table className={styles.comparisonTable}>
      <thead>
        <tr>
          {headers.map((h, i) => <th key={i}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((cell, i) => <td key={i}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.guideContainer}>
      <div className={styles.guideHeader}>
        <h1>PaperScript Quick Start Guide</h1>
        <p>Get up and running with PaperScript in 15 minutes</p>
      </div>

      {/* Quick Start Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Quick Start" 
          section="quick_start"
          subtitle="Get your first script working"
        />
        {expandedSections.quick_start && (
          <div className={styles.sectionContent}>
            <p>
              This guide walks you through setting up PaperScript, creating your first project, 
              and building a working script in under 15 minutes.
            </p>

            <StepGuide steps={[
              {
                title: "Create Project Directory",
                content: <CodeBlock code={`mkdir MyPaperScriptProject\ncd MyPaperScriptProject`} language="bash" />
              },
              {
                title: "Initialize Project",
                content: (
                  <>
                    <CodeBlock code={`paperscript init`} language="bash" />
                    <p><strong>Note:</strong> Run as Administrator for automatic path detection.</p>
                  </>
                )
              },
              {
                title: "Configure project.yaml",
                content: (
                  <>
                    <CodeBlock code={`projectName: My First Project\nprojectVersion: 1.0.0\ngame: SkyrimSE  # or FO4`} language="yaml" />
                    <p>Verify all paths point to your game installation.</p>
                  </>
                )
              },
              {
                title: "Create Source File",
                content: (
                  <>
                    <p>Create <code>src/HelloWorld.pps</code>:</p>
                    <CodeBlock code={`script HelloWorldQuest : Quest {
  auto property PlayerREF: Actor
  auto property Gold001: MiscItem
  
  event OnInit() {
    RegisterForSingleUpdate()
  }
  
  event OnUpdate() {
    GiveGoldToActor(PlayerREF, 10)
  }
  
  def GiveGoldToActor(actor: Actor, amount: Int) {
    actor.AddItem(Gold001, amount)
  }
}`} language="paperscript" />
                  </>
                )
              },
              {
                title: "Build Your Script",
                content: (
                  <>
                    <CodeBlock code={`paperscript build .`} language="bash" />
                    <p>Look for success message and check generated <code>.psc</code> files.</p>
                  </>
                )
              },
              {
                title: "Compile in Creation Kit",
                content: (
                  <ol>
                    <li>Open Creation Kit</li>
                    <li>Load your plugin</li>
                    <li>CK compiles <code>.psc</code> to <code>.pex</code></li>
                    <li>Test in-game!</li>
                  </ol>
                )
              }
            ]} />
          </div>
        )}
      </div>

      {/* Requirements Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Requirements" 
          section="requirements"
          subtitle="Before you start"
        />
        {expandedSections.requirements && (
          <div className={styles.sectionContent}>
            <FeatureBox title="PaperScript Installation">
              <ol>
                <li>Download latest release from GitHub</li>
                <li>Extract to your development folder</li>
                <li>Add to PATH (optional)</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Game & Tools">
              <h5>For Skyrim SE/AE:</h5>
              <Checklist items={[
                "Skyrim Special Edition or Anniversary Edition",
                "Creation Kit",
                "Script sources (run CK once first)",
                "Papyrus Compiler (included with CK)"
              ]} />
              <h5 style={{ marginTop: '1.5rem' }}>For Fallout 4:</h5>
              <Checklist items={[
                "Fallout 4",
                "Creation Kit",
                "Script sources",
                "Papyrus Compiler"
              ]} />
            </FeatureBox>

            <FeatureBox title="Text Editor Setup">
              <h5>Recommended: Visual Studio Code</h5>
              <ol>
                <li>Install VS Code</li>
                <li>Install PaperScript VSCode Extension</li>
                <li>Get syntax highlighting and error detection</li>
              </ol>
              <h5 style={{ marginTop: '1.5rem' }}>Alternatives:</h5>
              <ul>
                <li><strong>Notepad++</strong> - Custom syntax definition available</li>
                <li><strong>Sublime Text</strong> - Community packages</li>
                <li><strong>Any editor</strong> - Plain text editing works</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Project Setup Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Project Setup" 
          section="project_setup"
          subtitle="Organize your project structure"
        />
        {expandedSections.project_setup && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Folder Structure">
              <CodeBlock code={`MyProject/
├── project.yaml           # Configuration
├── src/                   # PaperScript source files
│   ├── HelloWorld.pps
│   └── Utils.pps
├── build/                 # Generated Papyrus files
│   ├── HelloWorld.psc
│   └── Utils.psc
└── README.md`} language="text" />
            </FeatureBox>

            <FeatureBox title="Organization Patterns">
              <h5>By Functionality:</h5>
              <CodeBlock code={`src/
├── quests/
├── items/
└── utils/`} language="text" />
              
              <h5 style={{ marginTop: '1.5rem' }}>By System:</h5>
              <CodeBlock code={`src/
├── combat/
├── dialogue/
├── player/
└── world/`} language="text" />
              
              <h5 style={{ marginTop: '1.5rem' }}>Flat (Small Projects):</h5>
              <CodeBlock code={`src/
├── Script1.pps
├── Script2.pps
└── Script3.pps`} language="text" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Writing Code Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Writing Your First Script" 
          section="writing"
          subtitle="Code examples to get started"
        />
        {expandedSections.writing && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Minimal Script">
              <CodeBlock code={`script MyScript {
  // Empty script is valid
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Event Handler">
              <CodeBlock code={`script ItemEquipHandler : ObjectReference {
  auto property BonusItem: MiscItem
  auto property PlayerREF: Actor
  
  event OnEquipped(actor: Actor) {
    if (actor == PlayerREF) {
      actor.AddItem(BonusItem, 1)
      Debug.Notification("Item equipped!")
    }
  }
  
  event OnUnequipped(actor: Actor) {
    if (actor == PlayerREF) {
      actor.RemoveItem(BonusItem, 1)
      Debug.Notification("Item unequipped!")
    }
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Quest Script">
              <CodeBlock code={`script MainQuestScript : Quest {
  auto property StartMarker: ObjectReference
  auto property Player: Actor
  auto property QuestStage: Int = 0
  
  event OnInit() {
    RegisterForSingleUpdate(5.0)
  }
  
  event OnUpdate() {
    CheckQuestProgress()
    RegisterForSingleUpdate(5.0)
  }
  
  def CheckQuestProgress() {
    if (Player.GetDistance(StartMarker) < 100.0) {
      if (QuestStage == 0) {
        AdvanceQuest()
      }
    }
  }
  
  def AdvanceQuest() {
    QuestStage = 1
    Debug.Notification("Quest advanced!")
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Multiple Functions">
              <CodeBlock code={`script UtilityScript {
  auto property Target: Actor
  auto property BonusItem: MiscItem
  
  def GiveReward(amount: Int) {
    Target.AddItem(BonusItem, amount)
    ShowNotification("Reward given!")
  }
  
  def TakeItem(count: Int) -> Bool {
    if (Target.GetItemCount(BonusItem) >= count) {
      Target.RemoveItem(BonusItem, count)
      return true
    }
    return false
  }
  
  def ShowNotification(message: String) {
    Debug.Notification(message)
  }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Compilation Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Compilation" 
          section="compilation"
          subtitle="Build and test your scripts"
        />
        {expandedSections.compilation && (
          <div className={styles.sectionContent}>
            <FeatureBox title="One-Time Build">
              <CodeBlock code={`paperscript build .`} language="bash" />
              <p>This will:</p>
              <ol>
                <li>Transpile all <code>.pps</code> files to <code>.psc</code></li>
                <li>Output to configured scriptOutputPath</li>
                <li>Run Papyrus compiler if configured</li>
                <li>Report any errors</li>
              </ol>
            </FeatureBox>

            <FeatureBox title="Watch Mode (Coming Soon)">
              <CodeBlock code={`paperscript watch`} language="bash" />
              <p>
                Automatically recompiles on file changes. Watch GitHub for updates on this feature.
              </p>
            </FeatureBox>

            <FeatureBox title="Troubleshooting Compilation">
              <div className={styles.troubleshootingBox}>
                <h5>"PapyrusCompiler not found"</h5>
                <p>→ Check path in project.yaml</p>
                <p>→ Ensure executable exists at specified location</p>
                
                <h5 style={{ marginTop: '1rem' }}>"Script sources not found"</h5>
                <p>→ Verify scriptFolderPath in project.yaml</p>
                <p>→ Run Creation Kit to generate script sources</p>
                
                <h5 style={{ marginTop: '1rem' }}>Type errors in output</h5>
                <p>→ Check function parameter types match game API</p>
                <p>→ Verify property types are correct</p>
              </div>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Syntax Reference Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Syntax Reference" 
          section="syntax"
          subtitle="Core language constructs"
        />
        {expandedSections.syntax && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Script Block">
              <CodeBlock code={`script ScriptName : ExtendScript {
  // script body
}

script StandaloneScript {
  // no extension
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Properties & Variables">
              <CodeBlock code={`auto property PlayerREF: Actor
auto property Count: Int = 0

myInt: Int = 10
myFloat: Float = 3.14
myString: String = "hello"`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Functions & Events">
              <CodeBlock code={`def NoReturn() {
  Debug.Notification("Hello")
}

def WithReturn(x: Int) -> Bool {
  return x > 0
}

event OnInit() {
  Debug.Notification("Initialized")
}

event OnEquipped(actor: Actor) {
  // Handle equip
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Control Flow">
              <CodeBlock code={`if (condition) {
  DoSomething()
} elseif (other) {
  DoOther()
} else {
  DoDefault()
}

while (condition) {
  counter++
}

range item in items {
  Debug.Notification(item.GetName())
}

switch status {
    case 1 => Debug.Notification("Active");
    case 2 => Debug.Notification("Inactive");
    default => Debug.Notification("Unknown");
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Array Initialization">
              <CodeBlock code={`numbers: Int[] = [1, 2, 3, 4, 5]

strings: String[] = [
  "Hello",
  "World"
]

point: Point = { x: 1, y: 2 }`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Project Configuration" 
          section="configuration"
          subtitle="project.yaml reference"
        />
        {expandedSections.configuration && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Complete Example">
              <CodeBlock code={`projectName: My Awesome Project
projectVersion: 2.1.5

scriptFolderPath: "Q:/Games/Skyrim SE/Data/Scripts/Source"
scriptOutputPath: "Q:/Games/Skyrim SE/Data/Scripts"
papyrusFlagsPath: "Q:/Games/Skyrim SE/Data/Scripts/Source/TESV_Papyrus_Flags.flg"
papyrusCompilerPath: "Q:/Games/Skyrim SE/Papyrus Compiler/PapyrusCompiler.exe"

sourceGlob: "src/**/*.pps"
game: SkyrimSE

globalDefines:
  DEBUG: true
  VERSION: "1.0.0"`} language="yaml" />
            </FeatureBox>

            <FeatureBox title="Configuration Fields">
              <ComparisonTable 
                headers={['Field', 'Required', 'Description']}
                rows={[
                  ['projectName', 'Yes', 'Project display name'],
                  ['projectVersion', 'Yes', 'Version string (e.g., "1.0.0")'],
                  ['scriptFolderPath', 'Yes', 'Path to Scripts/Source folder'],
                  ['scriptOutputPath', 'Yes', 'Path to Scripts folder'],
                  ['papyrusFlagsPath', 'Yes', 'Path to .flg file'],
                  ['papyrusCompilerPath', 'Yes', 'Path to PapyrusCompiler.exe'],
                  ['sourceGlob', 'No', 'File pattern (default: "src/**/*.pps")'],
                  ['game', 'Yes', 'SkyrimSE or FO4'],
                  ['globalDefines', 'No', 'Preprocessor defines'],
                ]}
              />
            </FeatureBox>

            <FeatureBox title="Path Configuration Tips">
              <ul>
                <li>Use forward slashes <code>/</code> even on Windows</li>
                <li>Quote paths with spaces</li>
                <li>Run <code>paperscript init</code> as Administrator for auto-detection</li>
                <li>Manually verify paths after initialization</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Global Defines">
              <p>Define preprocessor variables accessible in all scripts:</p>
              <CodeBlock code={`globalDefines:
  DEBUG: true
  VERSION: "1.0.0"
  AUTHOR: "Your Name"`} language="yaml" />
              <p style={{ marginTop: '1rem' }}>Usage in scripts:</p>
              <CodeBlock code={`#if DEBUG
Debug.Notification("Debug enabled")
#endif`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Preprocessor Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Preprocessor System" 
          section="preprocessor"
          subtitle="Conditional compilation and defines"
        />
        {expandedSections.preprocessor && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Defines">
              <CodeBlock code={`#define DEBUG
#define VERSION "1.0.0"
#define AUTHOR "Your Name"`} language="paperscript" />
              <p style={{ marginTop: '1rem' }}>
                Value-less defines default to <code>true</code>. Valued defines must be quoted.
              </p>
            </FeatureBox>

            <FeatureBox title="Conditional Compilation">
              <CodeBlock code={`#define DEBUG
#define LOG_LEVEL 2

#if DEBUG
Debug.Notification("Debug enabled")
#if LOG_LEVEL >= 2
Debug.MessageBox("Verbose logging")
#endif
#endif`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Substitution">
              <CodeBlock code={`#define PROJECT_NAME "Demo"
#define VERSION "1.0.0"

event OnInit() {
  Debug.Notification("Running " + PROJECT_NAME + " v" + VERSION)
}`} language="paperscript" />
              <p style={{ marginTop: '1rem' }}>
                <strong>Caution:</strong> Use unique define names to avoid accidental replacements.
              </p>
            </FeatureBox>

            <FeatureBox title="Special Defines">
              <ComparisonTable 
                headers={['Define Name', 'Description', 'Set By']}
                rows={[
                  ['OUTPUT_FILE_NAME', 'Override output filename', 'Script'],
                  ['DEBUG', 'Debug mode flag', 'project.yaml or script'],
                  ['PROJECT_NAME', 'Project name', 'project.yaml'],
                  ['PROJECT_VERSION', 'Project version', 'project.yaml'],
                ]}
              />
            </FeatureBox>

            <FeatureBox title="Includes">
              <CodeBlock code={`#include "fragment.psc"`} language="paperscript" />
              <p style={{ marginTop: '1rem' }}>
                <strong>Note:</strong> Included code must be Papyrus (not PaperScript) and is relative to the including file.
              </p>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Common Patterns Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Common Patterns" 
          section="patterns"
          subtitle="Reusable code patterns"
        />
        {expandedSections.patterns && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Initialization Pattern">
              <CodeBlock code={`event OnInit() {
  InitializeScript()
}

def InitializeScript() {
  if (Player == none) {
    Player = Game.GetPlayer()
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Update Loop Pattern">
              <CodeBlock code={`auto property UpdateInterval: Float = 5.0

event OnInit() {
  RegisterForUpdate(UpdateInterval)
}

event OnUpdate() {
  DoPeriodicCheck()
  RegisterForUpdate(UpdateInterval)
}

def DoPeriodicCheck() {
  // Your logic here
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Array Iteration Pattern">
              <CodeBlock code={`def GiveAllItems() {
  range item in Items {
    Player.AddItem(item, 1)
  }
}

def CountItems() -> Int {
  count: Int = 0
  range item in Items {
    count += Player.GetItemCount(item)
  }
  return count
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Error Handling Pattern">
              <CodeBlock code={`def SafeGiveItem(item: MiscItem, count: Int) {
  if (Target && item && count > 0) {
    Target.AddItem(item, count)
    Debug.Notification("Item given")
  } else {
    Debug.Notification("Invalid parameters")
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Debug Pattern">
              <CodeBlock code={`#define DEBUG
#define DEBUG_LEVEL 2

def LogDebug(message: String) {
  #if DEBUG
  Debug.Notification(message)
  #if DEBUG_LEVEL >= 2
  Debug.MessageBox(message)
  #endif
  #endif
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Troubleshooting Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Troubleshooting" 
          section="troubleshooting"
          subtitle="Common issues and solutions"
        />
        {expandedSections.troubleshooting && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Common Errors">
              <div className={styles.troubleshootingBox}>
                <h5>"Unknown identifier" error</h5>
                <ul>
                  <li>Check spelling of functions and variables</li>
                  <li>Verify imports are included</li>
                  <li>Ensure property names are correct</li>
                </ul>

                <h5 style={{ marginTop: '1rem' }}>Type mismatch errors</h5>
                <ul>
                  <li>Check parameter types match function signature</li>
                  <li>Verify property types are correct</li>
                  <li>Review game API documentation</li>
                </ul>

                <h5 style={{ marginTop: '1rem' }}>Compilation fails silently</h5>
                <ul>
                  <li>Run with <code>--verbose</code> flag</li>
                  <li>Check configuration paths in project.yaml</li>
                  <li>Ensure Papyrus Compiler can be found</li>
                </ul>

                <h5 style={{ marginTop: '1rem' }}>Scripts don't update in-game</h5>
                <ul>
                  <li>Verify you compiled the .pex files</li>
                  <li>Check scripts in correct folder</li>
                  <li>Recompile in Creation Kit</li>
                  <li>Restart game</li>
                </ul>
              </div>
            </FeatureBox>

            <FeatureBox title="Debug Workflow">
              <ol>
                <li><strong>Write and transpile</strong> - <code>paperscript build .</code></li>
                <li><strong>Check output</strong> - Review generated <code>.psc</code> files</li>
                <li><strong>Verify paths</strong> - Ensure files in correct location</li>
                <li><strong>Compile in CK</strong> - Let Creation Kit compile to <code>.pex</code></li>
                <li><strong>Test in-game</strong> - Load plugin and test functionality</li>
              </ol>
            </FeatureBox>
          </div>
        )}
      </div>

      <div className={styles.documentFooter}>
        <p>PaperScript Quick Start Guide | Version 1.0 | Last Updated: January 24, 2026</p>
        <p>Part of Mossy - Complete Fallout 4 Modding Documentation</p>
      </div>
    </div>
  );
};

export default PaperScriptQuickStartGuide;
