import React, { useState } from 'react';
import styles from './GuideStyles.module.css';

const PaperScriptFallout4Guide: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    intro: true,
    property_groups: false,
    namespaces: false,
    structs: false,
    is_operator: false,
    var_type: false,
    flags: false,
    installation: false,
    cli: false,
    examples: false,
    optimization: false,
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
    data: Array<string[]>;
  }> = ({ data }) => (
    <table className={styles.comparisonTable}>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Skyrim</th>
          <th>FO4</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
            <td>{row[3]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.guideContainer}>
      <div className={styles.guideHeader}>
        <h1>PaperScript Fallout 4 Features Guide</h1>
        <p>Advanced features, installation, and complete examples</p>
      </div>

      {/* Introduction Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Fallout 4 Specific Features" 
          section="intro"
          subtitle="New capabilities in FO4"
        />
        {expandedSections.intro && (
          <div className={styles.sectionContent}>
            <p>
              PaperScript has full support for all Papyrus features introduced with Fallout 4, 
              as of version 1.0.4-alpha.1. These features are not available in Skyrim.
            </p>

            <FeatureBox title="Enable Fallout 4 Support">
              <p><strong>In project.yaml:</strong></p>
              <CodeBlock code={`game: FO4`} language="yaml" />
              <p style={{ marginTop: '1rem' }}><strong>For one-off builds:</strong></p>
              <CodeBlock code={`paperscript build --game=FO4`} language="bash" />
            </FeatureBox>

            <FeatureBox title="What's New in FO4 Papyrus">
              <ComparisonTable data={[
                ['Property Groups', '✗', '✓', 'Organize properties visually in CK'],
                ['Namespaces', '✗', '✓', 'Scope scripts with :: separator'],
                ['Structs', '✗', '✓', 'Define custom data types'],
                ['is operator', '✗', '✓', 'Type checking with is Type'],
                ['var type', '✗', '✓', 'Dynamic variable typing'],
                ['Const properties', '✗', '✓', 'Read-only properties'],
                ['Mandatory properties', '✗', '✓', 'Required property assignment'],
                ['New function flags', '✗', '✓', 'DebugOnly, BetaOnly'],
                ['Script flags', '✗', '✓', 'Native, Const on scripts'],
              ]} />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Property Groups Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Property Groups" 
          section="property_groups"
          subtitle="Organize properties visually"
        />
        {expandedSections.property_groups && (
          <div className={styles.sectionContent}>
            <p>
              Property groups organize related properties into visually separated sections in Creation Kit. 
              They have no runtime effect but significantly improve usability for mod authors and end users.
            </p>

            <FeatureBox title="Basic Syntax">
              <CodeBlock code={`script ItemScript : ObjectReference {
  group Settings {
    auto property Enabled: Bool = true
    auto property Delay: Float = 5.0
    auto property MaxActivations: Int = 3
  }
  
  group References {
    auto property Player: Actor
    auto property TargetQuest: Quest
    auto property LinkedRef: ObjectReference
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Multiple Groups">
              <CodeBlock code={`script ComplexScript : ObjectReference {
  group General {
    auto property Name: String = "Default"
    auto property Enabled: Bool = true
  }
  
  group Timers {
    auto property UpdateInterval: Float = 5.0
    auto property CheckInterval: Float = 10.0
  }
  
  group Items {
    auto property Item1: MiscItem
    auto property Item2: MiscItem
    auto property Item3: MiscItem
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Best Practices">
              <h5>Do:</h5>
              <ul>
                <li>Use descriptive group names</li>
                <li>Group related properties logically</li>
                <li>Keep groups small (3-8 properties each)</li>
                <li>Order groups by importance</li>
              </ul>
              <h5 style={{ marginTop: '1rem' }}>Don't:</h5>
              <ul>
                <li>Create too many groups (more than 6)</li>
                <li>Mix unrelated properties</li>
                <li>Nest groups (not supported)</li>
                <li>Use very long group names</li>
              </ul>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Namespaces Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Namespaces" 
          section="namespaces"
          subtitle="Organize scripts and prevent conflicts"
        />
        {expandedSections.namespaces && (
          <div className={styles.sectionContent}>
            <p>
              Namespaces prevent name conflicts and organize related scripts into logical units. 
              Use the double colon (<code>::</code>) separator to define namespaces.
            </p>

            <FeatureBox title="Basic Syntax">
              <CodeBlock code={`script MyNamespace::UtilityScript {
  def DoSomething() {
    Debug.Notification("Doing something")
  }
}

script MyNamespace::AnotherScript {
  def DoOtherThing() {
    Debug.Notification("Doing other thing")
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Using Namespaces">
              <p><strong>Without Import (fully qualified):</strong></p>
              <CodeBlock code={`MyNamespace::UtilityScript.DoSomething()
MyNamespace::AnotherScript.DoOtherThing()`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>With Import (simplified):</strong></p>
              <CodeBlock code={`import MyNamespace

UtilityScript.DoSomething()
AnotherScript.DoOtherThing()`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Practical Example">
              <CodeBlock code={`// Quest utilities namespace
script QuestUtils::Helpers {
  def SetQuestStage(quest: Quest, stage: Int) {
    quest.SetStage(stage)
  }
  
  def GetQuestProgress(quest: Quest) -> Int {
    return quest.GetStage()
  }
}

// Item utilities namespace
script ItemUtils::Helpers {
  def GiveItem(actor: Actor, item: Form, count: Int) {
    actor.AddItem(item, count)
  }
  
  def TakeItem(actor: Actor, item: Form, count: Int) {
    actor.RemoveItem(item, count)
  }
}

// Usage
import QuestUtils
import ItemUtils

script MainScript : Quest {
  event OnInit() {
    Helpers.SetQuestStage(self, 10)
  }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Structs Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Structs" 
          section="structs"
          subtitle="Custom data types (FO4 only)"
        />
        {expandedSections.structs && (
          <div className={styles.sectionContent}>
            <p>
              Structs are custom data types that group related variables together. 
              <strong> Only available in Fallout 4.</strong>
            </p>

            <FeatureBox title="Defining Structs">
              <CodeBlock code={`struct Point {
    x: Int
    y: Int
}

struct Color {
    r: Int
    g: Int
    b: Int
}

struct PlayerStats {
    health: Int
    mana: Int
    stamina: Int
    level: Int
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Creating Struct Instances">
              <p><strong>Method 1: Default initialization with property assignment</strong></p>
              <CodeBlock code={`point1: Point = new Point
point1.x = 10
point1.y = 20`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Method 2: Struct initializer (recommended)</strong></p>
              <CodeBlock code={`point1: Point = { x: 10, y: 20 }

color: Color = { r: 255, g: 128, b: 64 }

stats: PlayerStats = {
  health: 100,
  mana: 50,
  stamina: 75,
  level: 20
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Using Structs in Functions">
              <CodeBlock code={`struct Vector {
  x: Float
  y: Float
  z: Float
}

script MathScript {
  def Distance(from: Vector, to: Vector) -> Float {
    dx: Float = to.x - from.x
    dy: Float = to.y - from.y
    dz: Float = to.z - from.z
    
    return (dx * dx + dy * dy + dz * dz) as Float
  }
  
  def MovePoint(point: Vector, offset: Vector) -> Vector {
    return {
      x: point.x + offset.x,
      y: point.y + offset.y,
      z: point.z + offset.z
    }
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Nested Structs">
              <CodeBlock code={`struct Point {
  x: Float
  y: Float
}

struct Rectangle {
  topLeft: Point
  bottomRight: Point
}

def CreateRectangle(x1: Float, y1: Float, x2: Float, y2: Float) -> Rectangle {
  return {
    topLeft: { x: x1, y: y1 },
    bottomRight: { x: x2, y: y2 }
  }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* is Operator Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="The `is` Operator" 
          section="is_operator"
          subtitle="Type checking (available in both Skyrim and FO4)"
        />
        {expandedSections.is_operator && (
          <div className={styles.sectionContent}>
            <p>
              The <code>is</code> operator checks if a variable is of a particular type. 
              It's available in both Skyrim and Fallout 4 PaperScript!
            </p>

            <FeatureBox title="Basic Usage">
              <CodeBlock code={`var1: Int = 0
if var1 is Int {
    Debug.Notification("It's an integer")
}

actor: Actor = Game.GetPlayer()
if actor is Actor {
    Debug.Notification("It's an actor")
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Type Checking">
              <CodeBlock code={`def ProcessObject(obj: ObjectReference) {
  if obj is Actor {
    actor: Actor = obj as Actor
    actor.SetHealth(100)
  } elseif obj is Container {
    Debug.Notification("It's a container")
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Practical Examples">
              <p><strong>Safe Type Conversion:</strong></p>
              <CodeBlock code={`def SafeGetActorName(obj: ObjectReference) -> String {
  if obj is Actor {
    actor: Actor = obj as Actor
    return actor.GetName()
  }
  return "Unknown"
}`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Type-Based Logic:</strong></p>
              <CodeBlock code={`def InteractWith(obj: ObjectReference) {
  if obj is Actor {
    actor: Actor = obj as Actor
    actor.SetAlert(true)
  } elseif obj is Container {
    container: Container = obj as Container
    container.Open(Game.GetPlayer())
  } else {
    obj.Activate(Game.GetPlayer(), Game.GetPlayer())
  }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* var Type Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="The `var` Type" 
          section="var_type"
          subtitle="Dynamic typing for flexibility"
        />
        {expandedSections.var_type && (
          <div className={styles.sectionContent}>
            <p>
              The <code>var</code> type allows dynamic typing, similar to <code>object</code> in C#. 
              Use sparingly as type-specific variables are safer and more efficient.
            </p>

            <FeatureBox title="Basic Usage">
              <CodeBlock code={`var1: Var = 123
var2: Var = "hello"
var3: Var = true
var4: Var = Game.GetPlayer()`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Flexible Function Parameters">
              <CodeBlock code={`def LogValue(value: Var) {
  Debug.Notification("Value: " + value)
}

LogValue(42)
LogValue("test")
LogValue(3.14)
LogValue(Game.GetPlayer())`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Use Cases">
              <ul>
                <li>Generic logging functions</li>
                <li>Dynamic method dispatch</li>
                <li>Flexible storage in collections</li>
                <li>Interop with external systems</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>
                <strong>Note:</strong> Prefer type-specific variables when possible for better performance and type safety.
              </p>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Flags Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Fallout 4 Flags" 
          section="flags"
          subtitle="New function, property, and script flags"
        />
        {expandedSections.flags && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Function Flags">
              <p><strong>DebugOnly:</strong> Only runs in debug builds</p>
              <CodeBlock code={`def DebugOnly Log(message: String) {
    Debug.MessageBox(message)
}`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>BetaOnly:</strong> Only available in beta builds</p>
              <CodeBlock code={`def BetaOnly TestFeature() {
    Debug.Notification("Beta feature")
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Property Flags">
              <p><strong>Const:</strong> Value cannot be changed after initialization</p>
              <CodeBlock code={`auto const property MaxHealth: Int = 100`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Mandatory:</strong> Must be assigned in Creation Kit editor</p>
              <CodeBlock code={`auto mandatory property PlayerREF: Actor`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Combined:</strong></p>
              <CodeBlock code={`auto const mandatory property GameVersion: String = "1.10.162"`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Variable Flags">
              <p><strong>Const:</strong> Variable cannot be modified</p>
              <CodeBlock code={`def Example() {
    const MaxRetries: Int = 3
    // MaxRetries cannot be changed
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Script Flags">
              <p><strong>Native:</strong> Implemented externally</p>
              <CodeBlock code={`native script ExternalFunction {
    // Implemented externally
}`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Const:</strong> All properties are constant</p>
              <CodeBlock code={`const script ReadOnlyScript {
    // Script properties are constant
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Installation Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Installation Guide" 
          section="installation"
          subtitle="Get PaperScript on your system"
        />
        {expandedSections.installation && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Windows Installation">
              <h5>Option 1: Binary from GitHub</h5>
              <ol>
                <li>Visit <strong>PaperScript GitHub Releases</strong></li>
                <li>Download latest Windows build</li>
                <li>Extract to a folder (e.g., <code>C:\PaperScript</code>)</li>
                <li>Add folder to Windows PATH</li>
                <li>Open PowerShell and verify: <code>paperscript version</code></li>
              </ol>
              
              <h5 style={{ marginTop: '1.5rem' }}>Option 2: Package Manager (Coming Soon)</h5>
              <ul>
                <li>WinGet package (coming soon)</li>
                <li>Chocolatey package (coming soon)</li>
              </ul>
              
              <h5 style={{ marginTop: '1.5rem' }}>Option 3: Installer (Coming Soon)</h5>
              <p>Dedicated Windows installer will be available soon</p>
            </FeatureBox>

            <FeatureBox title="Linux Installation">
              <p><strong>From Binary:</strong></p>
              <CodeBlock code={`tar -xzf paperscript-linux.tar.gz
cd paperscript
export PATH="$PATH:$(pwd)"
paperscript version`} language="bash" />
              
              <p style={{ marginTop: '1rem' }}><strong>Or copy to PATH:</strong></p>
              <CodeBlock code={`sudo cp paperscript /usr/local/bin/`} language="bash" />
              
              <p style={{ marginTop: '1rem' }}>Package manager (apt/rpm) coming soon</p>
            </FeatureBox>

            <FeatureBox title="macOS Installation">
              <p><strong>From Binary:</strong></p>
              <CodeBlock code={`tar -xzf paperscript-macos.tar.gz
cd paperscript
chmod +x paperscript
export PATH="$PATH:$(pwd)"
paperscript version`} language="bash" />
              
              <p style={{ marginTop: '1rem' }}>HomeBrew package coming soon</p>
            </FeatureBox>

            <FeatureBox title="Troubleshooting">
              <div className={styles.troubleshootingBox}>
                <h5>"paperscript: command not found"</h5>
                <ul>
                  <li>Make sure it's in your PATH</li>
                  <li>Try full path: <code>/path/to/paperscript version</code></li>
                  <li>Restart terminal after PATH changes</li>
                </ul>
                
                <h5 style={{ marginTop: '1rem' }}>"Cannot find .NET Runtime"</h5>
                <ul>
                  <li>Windows: Binary is standalone, shouldn't happen</li>
                  <li>Linux/Mac: Install .NET Runtime 6.0+</li>
                </ul>
                
                <h5 style={{ marginTop: '1rem' }}>Permission denied</h5>
                <ul>
                  <li>Linux/Mac: Run <code>chmod +x paperscript</code></li>
                  <li>Windows: Run PowerShell as Administrator</li>
                </ul>
              </div>
            </FeatureBox>
          </div>
        )}
      </div>

      {/* CLI Reference Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="CLI Reference" 
          section="cli"
          subtitle="Command line interface commands"
        />
        {expandedSections.cli && (
          <div className={styles.sectionContent}>
            <FeatureBox title="paperscript init">
              <p>Creates a new PaperScript project with directory structure.</p>
              <CodeBlock code={`paperscript init
paperscript init --force  # Force creation in non-empty directory`} language="bash" />
            </FeatureBox>

            <FeatureBox title="paperscript build">
              <p>Builds a project in the current directory.</p>
              <CodeBlock code={`paperscript build
paperscript build ./MyProject
paperscript build --no-compile
paperscript build --game=FO4
paperscript build --verbose`} language="bash" />
            </FeatureBox>

            <FeatureBox title="paperscript transpile">
              <p>Transpiles a single file from PaperScript to Papyrus.</p>
              <CodeBlock code={`paperscript transpile script.pps -o script.psc
paperscript transpile script.pps -s
paperscript transpile script.pps --game=FO4`} language="bash" />
            </FeatureBox>

            <FeatureBox title="paperscript version">
              <p>Prints version information.</p>
              <CodeBlock code={`paperscript version`} language="bash" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Examples Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Complete Examples" 
          section="examples"
          subtitle="Ready-to-use scripts"
        />
        {expandedSections.examples && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Example 1: Simple Toggle">
              <p>A simple on/off switch for buttons, levers, or containers.</p>
              <CodeBlock code={`script SimpleToggle : ObjectReference {
  toggle: Bool = false
  
  event OnActivate(actionRef: ObjectReference) {
    toggle = !toggle  // Flip the toggle
    
    if toggle {
      Debug.Notification("Enabled")
      // Do stuff when toggled ON
    } else {
      Debug.Notification("Disabled")
      // Do stuff when toggled OFF
    }
  }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example 2: Quest Item Tracker">
              <p>Tracks when a quest item is picked up or dropped, updating quest stages.</p>
              <CodeBlock code={`script DroppableQuestObject : ObjectReference {
    auto property PlayerREF: Actor
    auto property FromQuest: Quest
    auto property UncompleteEnabled: Bool = true
    auto property StageToStopQuestItem: Int = 99999
    auto property StageToSetOnPickup: Int = -1
    auto property ObjectiveToCompleteOnPickup: Int

    event OnContainerChanged(newContainer: ObjectReference, oldContainer: ObjectReference) {
        if FromQuest.GetStage() < StageToStopQuestItem {
            if newContainer == PlayerREF {
                FromQuest.SetObjectiveCompleted(ObjectiveToCompleteOnPickup)
                if StageToSetOnPickup >= 0 {
                    FromQuest.SetStage(StageToSetOnPickup)
                }
            }
        }
    }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example 3: Trigger Zone">
              <p>A trigger that activates when the player enters or exits.</p>
              <CodeBlock code={`script ExampleTrigger : ObjectReference {
    auto property PlayerREF: Actor

    event OnTriggerEnter(actionRef: ObjectReference) {
        if actionRef == PlayerREF {
            Debug.MessageBox("Player Entered!")
            OnPlayerEntered()
        }
    }
    
    event OnTriggerLeave(actionRef: ObjectReference) {
        if actionRef == PlayerREF {
            Debug.MessageBox("Player Left!")
            OnPlayerExited()
        }
    }
    
    def OnPlayerEntered() {
        // Custom logic when player enters
    }
    
    def OnPlayerExited() {
        // Custom logic when player exits
    }
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Example 4: Advanced with Groups & Structs">
              <CodeBlock code={`struct ItemState {
  useCount: Int
  lastUseTime: Float
}

script AdvancedItemScript : ObjectReference {
  group Settings {
    auto property Enabled: Bool = true
    auto property MaxUses: Int = 10
    auto property RechargeTime: Float = 24.0
  }
  
  group References {
    auto property Player: Actor
    auto property LinkedQuest: Quest
    auto property RewardItem: MiscItem
  }
  
  state: ItemState = { useCount: 0, lastUseTime: 0.0 }
  
  event OnActivate(actionRef: ObjectReference) {
    if Enabled && CanUse() {
      UseItem()
      state.useCount += 1
    }
  }
  
  def CanUse() -> Bool {
    return state.useCount < MaxUses
  }
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      {/* Optimization Section */}
      <div className={styles.section}>
        <SectionHeader 
          title="Optimization Tips" 
          section="optimization"
          subtitle="Best practices for performance"
        />
        {expandedSections.optimization && (
          <div className={styles.sectionContent}>
            <FeatureBox title="Performance Best Practices">
              <h5>Use Property Groups</h5>
              <ul>
                <li>Better organization in Creation Kit</li>
                <li>Faster to find properties</li>
                <li>No performance impact</li>
              </ul>
              
              <h5 style={{ marginTop: '1.5rem' }}>Use Structs for Related Data</h5>
              <ul>
                <li>Cleaner code organization</li>
                <li>Easier to manage related values</li>
                <li>More maintainable code</li>
              </ul>
              
              <h5 style={{ marginTop: '1.5rem' }}>Use Namespaces</h5>
              <ul>
                <li>Prevent naming conflicts</li>
                <li>Organize large projects</li>
                <li>No runtime overhead</li>
              </ul>
            </FeatureBox>

            <FeatureBox title="Minimize Update Events">
              <p><strong>Bad: Updates every frame</strong></p>
              <CodeBlock code={`event OnUpdate() {
  CheckCondition()
}`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Good: Periodic updates</strong></p>
              <CodeBlock code={`event OnInit() {
  RegisterForUpdate(5.0)
}

event OnUpdate() {
  CheckCondition()
  RegisterForUpdate(5.0)
}`} language="paperscript" />
            </FeatureBox>

            <FeatureBox title="Cache References">
              <p><strong>Bad: Gets player every time</strong></p>
              <CodeBlock code={`def DoSomething() {
  Game.GetPlayer().AddItem(Gold001, 10)
  Game.GetPlayer().RemoveItem(Gold001, 5)
}`} language="paperscript" />
              
              <p style={{ marginTop: '1rem' }}><strong>Good: Cache player reference</strong></p>
              <CodeBlock code={`def DoSomething() {
  player: Actor = Game.GetPlayer()
  player.AddItem(Gold001, 10)
  player.RemoveItem(Gold001, 5)
}`} language="paperscript" />
            </FeatureBox>
          </div>
        )}
      </div>

      <div className={styles.documentFooter}>
        <p>PaperScript Fallout 4 Features Guide | Version 1.0 | Last Updated: January 24, 2026</p>
        <p>Part of Mossy - Complete Fallout 4 Modding Documentation</p>
      </div>
    </div>
  );
};

export default PaperScriptFallout4Guide;
