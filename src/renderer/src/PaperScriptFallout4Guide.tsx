import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openExternal } from './utils/openExternal';

const PaperScriptFallout4Guide = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('fo4-features');

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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>PaperScript for Fallout 4</h1>
        <p style={subtitleStyle}>Advanced features and installation guide</p>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={{ color: '#00ff00', marginTop: 0 }}>Tools / Install / Verify (FO4 Integration)</h3>
        <ul style={{ marginLeft: '1.25rem', color: '#b0b0b0', lineHeight: 1.6 }}>
          <li><strong>PaperScript</strong> to generate <code style={{ color: '#00ff00' }}>.psc</code>.</li>
          <li><strong>Creation Kit</strong> to compile <code style={{ color: '#00ff00' }}>.psc</code> → <code style={{ color: '#00ff00' }}>.pex</code>.</li>
          <li><strong>Mod manager</strong> (MO2/Vortex) so you can verify installs with a clean profile.</li>
          <li><strong>(Optional) FO4Edit</strong> for dependency and record sanity checks.</li>
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
          <strong>First test loop:</strong> build one script → compile to <code style={{ color: '#00ff00' }}>.pex</code> → ship it in a tiny test plugin → trigger it on game start.
        </div>
      </div>

      {/* FO4 Features */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('fo4-features')}
          style={sectionHeaderStyle(expandedSection === 'fo4-features')}
        >
          <span>🎮 Fallout 4 Specific Features</span>
          <span>{expandedSection === 'fo4-features' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'fo4-features' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Property Groups</h4>
              <p style={{marginBottom: '0.5rem'}}>Organize properties logically:</p>
              <pre style={codeBlockStyle}>{`script MyScript : ObjectReference {
    group "Rewards"
        auto property GoldAmount: Int
        auto property ItemReward: MiscItem
    endgroup
    
    group "Behavior"
        auto property Enabled: Bool = true
    endgroup
}`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Namespaces</h4>
              <p style={{marginBottom: '0.5rem'}}>Prevent naming conflicts:</p>
              <pre style={codeBlockStyle}>{`namespace MyMod {
    def Helper() { }
}

namespace OtherMod {
    def Helper() { }
}

// Call namespace-specific version
MyMod.Helper()`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Structs</h4>
              <p style={{marginBottom: '0.5rem'}}>Bundle related data together:</p>
              <pre style={codeBlockStyle}>{`struct RewardData {
    Int gold
    MiscItem item
    Bool enabled
}

event OnComplete() {
    RewardData reward = new RewardData()
    reward.gold = 100
    reward.item = GoldItem
}`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>The 'is' Operator</h4>
              <p style={{marginBottom: '0.5rem'}}>Type checking in conditions:</p>
              <pre style={codeBlockStyle}>{`event OnCellLoad() {
    if (Game.GetPlayer() is Actor) {
        Actor player = Game.GetPlayer() as Actor
        player.AddItem(gold, 10)
    }
}`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Dynamic Typing (var)</h4>
              <p style={{marginBottom: '0.5rem'}}>Handle dynamic types:</p>
              <pre style={codeBlockStyle}>{`var item = GetRandomItem()  // Type inferred
var count = 10              // Int
var name = "Reward"         // String`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Flags</h4>
              <p style={{marginBottom: '0.5rem'}}>Boolean optimization:</p>
              <pre style={codeBlockStyle}>{`script MyScript {
    bool flag:Quest_Started
    bool flag:NPC_Killed
    bool flag:Reward_Given
}`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Installation Guide */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('installation')}
          style={sectionHeaderStyle(expandedSection === 'installation')}
        >
          <span>📦 Installation Guide (All Platforms)</span>
          <span>{expandedSection === 'installation' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'installation' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Windows</h4>
            <ol style={{marginLeft: '1.5rem', marginBottom: '1.5rem'}}>
              <li style={{margin: '0.5rem 0'}}>Download PaperScript release (.zip)</li>
              <li style={{margin: '0.5rem 0'}}>Extract to <code style={{color: '#00ff00'}}>C:\Dev\PaperScript</code></li>
              <li style={{margin: '0.5rem 0'}}>Add to PATH:
                <ul style={{marginTop: '0.5rem', marginLeft: '1rem'}}>
                  <li>Right-click "This PC" → Properties</li>
                  <li>Advanced system settings → Environment Variables</li>
                  <li>Add PaperScript folder to PATH</li>
                </ul>
              </li>
              <li style={{margin: '0.5rem 0'}}>Test: Open cmd, type <code style={{color: '#00ff00'}}>paperscript</code></li>
            </ol>

            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Linux</h4>
            <ol style={{marginLeft: '1.5rem', marginBottom: '1.5rem'}}>
              <li style={{margin: '0.5rem 0'}}>Download PaperScript release (.tar.gz)</li>
              <li style={{margin: '0.5rem 0'}}>Extract: <code style={{color: '#00ff00'}}>tar -xzf paperscript.tar.gz</code></li>
              <li style={{margin: '0.5rem 0'}}>Make executable: <code style={{color: '#00ff00'}}>chmod +x paperscript/bin/paperscript</code></li>
              <li style={{margin: '0.5rem 0'}}>Add to PATH in ~/.bashrc:
                <pre style={codeBlockStyle}>{`export PATH="$PATH:/path/to/paperscript/bin"`}</pre>
              </li>
              <li style={{margin: '0.5rem 0'}}>Test: <code style={{color: '#00ff00'}}>paperscript</code></li>
            </ol>

            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>macOS</h4>
            <ol style={{marginLeft: '1.5rem'}}>
              <li style={{margin: '0.5rem 0'}}>Download PaperScript release (.dmg)</li>
              <li style={{margin: '0.5rem 0'}}>Mount: <code style={{color: '#00ff00'}}>open paperscript.dmg</code></li>
              <li style={{margin: '0.5rem 0'}}>Copy to Applications</li>
              <li style={{margin: '0.5rem 0'}}>Add to PATH in ~/.zshrc:
                <pre style={codeBlockStyle}>{`export PATH="$PATH:/Applications/PaperScript/bin"`}</pre>
              </li>
              <li style={{margin: '0.5rem 0'}}>Test: <code style={{color: '#00ff00'}}>paperscript</code></li>
            </ol>
          </div>
        )}
      </div>

      {/* CLI Reference */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('cli')}
          style={sectionHeaderStyle(expandedSection === 'cli')}
        >
          <span>⚙️ CLI Reference</span>
          <span>{expandedSection === 'cli' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'cli' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Common Commands</h4>
            <pre style={codeBlockStyle}>{`# Single file transpile
paperscript script.paper -o Scripts/Source/

# Batch transpile directory
paperscript src/ -o Scripts/Source/

# Watch mode (auto-recompile on change)
paperscript src/ --watch -o Scripts/Source/

# Verbose output
paperscript script.paper -v

# Show version
paperscript --version

# Show help
paperscript --help`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Advanced Options</h4>
            <pre style={codeBlockStyle}>{`# Target specific game
paperscript script.paper --target fallout4

# Emit Papyrus directly to stdout
paperscript script.paper --emit-papyrus

# Custom include paths
paperscript script.paper --include ./include

# Strict mode (strict type checking)
paperscript script.paper --strict

# Generate source maps
paperscript script.paper --sourcemap`}</pre>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Pro Tip: Batch Script</h4>
              <p style={{marginBottom: '0.5rem'}}>Create a build.bat file for easy transpilation:</p>
              <pre style={codeBlockStyle}>{`@echo off
echo Transpiling PaperScript files...
paperscript src/ --watch -o Scripts/Source/
echo Done!`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Example Scripts */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('examples')}
          style={sectionHeaderStyle(expandedSection === 'examples')}
        >
          <span>📝 Complete Example Scripts</span>
          <span>{expandedSection === 'examples' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'examples' && (
          <div style={contentStyle}>
            <h4 style={{color: '#00ff00', marginBottom: '1rem'}}>Example 1: Quest Event Handler</h4>
            <pre style={codeBlockStyle}>{`script QuestRewardScript : Quest {
    auto property PlayerREF: Actor
    auto property RewardGold: MiscItem
    auto property RewardWeapon: Weapon

    event OnInit() {
        RegisterForRemoteEvent(PlayerREF, "OnLocationChange")
    }

    event Actor.OnLocationChange(Actor akSender, Location akOld, Location akNew) {
        if (akNew.GetName() == "MyDungeon") {
            SetStage(100)
            akSender.AddItem(RewardGold, 500)
        }
    }

    event OnStageSet(int stage, int itemID) {
        if (stage == 100) {
            PlayerREF.AddItem(RewardWeapon, 1)
        }
    }
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Example 2: Property Group Organization</h4>
            <pre style={codeBlockStyle}>{`script ComplexScript : ObjectReference {
    group "Settings"
        auto property Enabled: Bool = true
        auto property Difficulty: Int = 2
    endgroup

    group "References"
        auto property Player: Actor
        auto property Target: Actor
    endgroup

    group "Items"
        auto property Rewards: MiscItem
        auto property Penalty: Potion
    endgroup

    event OnInit() {
        if (Enabled) {
            DoInitialization()
        }
    }

    def DoInitialization() {
        Player = Game.GetPlayer()
        Target = GetLinkedRef()
    }
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Example 3: Type Safety with 'is' Operator</h4>
            <pre style={codeBlockStyle}>{`script SafeScript : ObjectReference {
    event OnEquipped(actor: Actor) {
        if (actor is Actor) {
            Actor safeActor = actor as Actor
            if (safeActor.GetLevel() >= 10) {
                safeActor.AddItem(Game.GetForm(0x00000005), 100)
            }
        }
    }

    def ProcessForm(form: Form) {
        if (form is Weapon) {
            Weapon weapon = form as Weapon
            weapon.SetEnchantment(GetEnchantment())
        } else if (form is Armor) {
            Armor armor = form as Armor
            armor.SetEnchantment(GetEnchantment())
        }
    }
}`}</pre>

            <h4 style={{color: '#00ff00', marginBottom: '1rem', marginTop: '1.5rem'}}>Example 4: Struct Usage</h4>
            <pre style={codeBlockStyle}>{`struct PlayerReward {
    Int gold
    Weapon mainReward
    Potion bonusReward
    Bool claimed
}

script RewardDistributor : ObjectReference {
    auto property Player: Actor

    def GiveReward(reward: PlayerReward) {
        if (!reward.claimed) {
            Player.AddItem(reward.mainReward, 1)
            Player.AddItem(reward.gold, 1)
            Player.AddItem(reward.bonusReward, 3)
            reward.claimed = true
        }
    }

    event OnInit() {
        PlayerReward myReward = new PlayerReward()
        myReward.gold = 500
        GiveReward(myReward)
    }
}`}</pre>
          </div>
        )}
      </div>

      {/* Best Practices */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('best-practices')}
          style={sectionHeaderStyle(expandedSection === 'best-practices')}
        >
          <span>✨ Best Practices & Optimization</span>
          <span>{expandedSection === 'best-practices' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'best-practices' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Performance Tips</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li style={{margin: '0.5rem 0'}}>Use flags for boolean state (lighter weight)</li>
                <li style={{margin: '0.5rem 0'}}>Avoid frequent form lookups; cache in properties</li>
                <li style={{margin: '0.5rem 0'}}>Register for events selectively</li>
                <li style={{margin: '0.5rem 0'}}>Clean up with UnregisterForAllEvents()</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Code Organization</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li style={{margin: '0.5rem 0'}}>Use property groups logically</li>
                <li style={{margin: '0.5rem 0'}}>Keep related functions together</li>
                <li style={{margin: '0.5rem 0'}}>Use namespaces to avoid conflicts</li>
                <li style={{margin: '0.5rem 0'}}>Write self-documenting code</li>
              </ul>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Safety First</h4>
              <ul style={{marginLeft: '1.5rem'}}>
                <li style={{margin: '0.5rem 0'}}>Always check for None before use</li>
                <li style={{margin: '0.5rem 0'}}>Use 'is' operator for type validation</li>
                <li style={{margin: '0.5rem 0'}}>Validate game state assumptions</li>
                <li style={{margin: '0.5rem 0'}}>Test thoroughly in-game</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Common Issues */}
      <div style={sectionStyle}>
        <button 
          onClick={() => toggleSection('issues')}
          style={sectionHeaderStyle(expandedSection === 'issues')}
        >
          <span>🐛 Common Issues & Solutions</span>
          <span>{expandedSection === 'issues' ? '▼' : '▶'}</span>
        </button>
        {expandedSection === 'issues' && (
          <div style={contentStyle}>
            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Property Not Assigned</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> "You must assign a value to property X before the script runs"</p>
              <p style={{marginTop: '0.5rem'}}>Solution: Set property as Auto or assign in OnInit</p>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>None Reference</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> Script crashes with None reference error</p>
              <p style={{marginTop: '0.5rem'}}>Solution: Check for None before using objects</p>
              <pre style={codeBlockStyle}>{`if (myActor) { myActor.Kill() }`}</pre>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Event Not Firing</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> Your event handler never runs</p>
              <p style={{marginTop: '0.5rem'}}>Solution: Ensure you RegisterFor the event first</p>
            </div>

            <div style={featureBoxStyle}>
              <h4 style={{color: '#00ff00', marginBottom: '0.5rem'}}>Type Mismatch</h4>
              <p><strong style={{color: '#00d000'}}>Problem:</strong> "Cannot convert X to Y"</p>
              <p style={{marginTop: '0.5rem'}}>Solution: Use 'as' operator for safe casting</p>
              <pre style={codeBlockStyle}>{`Actor a = form as Actor`}</pre>
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop: '3rem', borderTop: '1px solid #00d000', paddingTop: '1.5rem', textAlign: 'center', color: '#00d000'}}>
        <p>PaperScript for Fallout 4 Guide | Part of Mossy</p>
      </div>
    </div>
  );
};

export default PaperScriptFallout4Guide;
