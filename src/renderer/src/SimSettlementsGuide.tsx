import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Zap, BookOpen, AlertCircle, Users, Hammer, CheckCircle2, HelpCircle, Lightbulb } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function SimSettlementsGuide() {
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-start');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const sections: Section[] = [
    {
      id: 'quick-start',
      title: '⚡ Quick Start (5 Minutes)',
      icon: <Zap className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Installation - Easiest Path</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Install Vortex from nexusmods.com</li>
              <li>Click "Sim Settlements 2 Starter" collection</li>
              <li>Let Vortex install all mods</li>
              <li>Launch Fallout 4</li>
            </ol>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Starting the Game</p>
            <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
              <li>Go to any settlement (Sanctuary)</li>
              <li>Activate workshop terminal</li>
              <li>Build Recruitment Radio Beacon</li>
              <li>Power and activate beacon</li>
              <li>Wait for Stranger NPC to appear</li>
              <li>Talk to them to start questline</li>
            </ol>
          </div>
          <div className="text-[#008000] text-xs">
            <strong>Pro Tip:</strong> Can use any settlement with a beacon, not just Sanctuary
          </div>
        </div>
      )
    },
    {
      id: 'what-is-ss2',
      title: '🏘️ What is Sim Settlements 2?',
      icon: <BookOpen className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm text-[#00ff00] font-mono">
          <p>
            Sim Settlements 2 (SS2) is a complete settlement management mod with a full questline. It asks: <span className="text-[#00d000]">"What if there was a reason to rebuild settlements?"</span>
          </p>
          <div className="border-l-2 border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Core Features</p>
            <ul className="list-disc list-inside space-y-1 text-xs mt-2">
              <li>Fully voiced main questline with 3 chapters</li>
              <li>Dozens of NPCs with their own stories and quests</li>
              <li>Automated settlement management via City Plans</li>
              <li>Choice between manual building or full automation</li>
              <li>Advanced settlement tools and management UI</li>
              <li>Community addon packs for endless customization</li>
            </ul>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Key Difference from SS1:</strong> SS2 is fundamentally different from original Sim Settlements. Nothing from SS1 is compatible. Start with SS2 if new to modding.
          </div>
        </div>
      )
    },
    {
      id: 'installation',
      title: '⚙️ Installation Methods',
      icon: <Download className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Option 1: Vortex Collections (Best for Beginners)</h4>
            <div className="text-xs space-y-1 ml-2">
              <p><span className="text-[#00d000]">1.</span> Install Vortex from nexusmods.com</p>
              <p><span className="text-[#00d000]">2.</span> Pick a starter collection:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Sim Settlements 2 Starter (core experience)</li>
                <li>Starter+ (core + community addons)</li>
                <li>Starter+ F4SE (everything + Script Extender)</li>
              </ul>
              <p><span className="text-[#00d000]">3.</span> Click collection link → Use Vortex installer</p>
              <p><span className="text-[#00d000]">4.</span> Collections are upgradeable without uninstalling</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Option 2: Vortex Manual</h4>
            <div className="text-xs space-y-1 ml-2">
              <p>Download and enable in order:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>HUD Framework</li>
                <li>Workshop Framework</li>
                <li>Sim Settlements 2</li>
                <li>Chapter 2 (optional)</li>
                <li>Chapter 3 (optional)</li>
              </ul>
              <p className="text-[#008000] mt-2">Make sure plugins are checked in Plugins tab!</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Option 3: Mod Organizer 2</h4>
            <div className="text-xs space-y-1 ml-2">
              <p>Right-click archives → Install → Enable in left panel</p>
              <p className="text-[#008000]">Works same as Vortex, just different interface</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Option 4: Xbox</h4>
            <div className="text-xs space-y-1 ml-2">
              <p>Launch game → Mods → Download in order:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Workshop Framework</li>
                <li>Sim Settlements 2</li>
                <li>HUD Framework</li>
              </ul>
              <p className="text-[#ff4444] mt-2">⚠️ Limited mod space! Start with base SS2 only.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'city-manager',
      title: '🛠️ City Manager Holotape',
      icon: <Hammer className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">How to Get the Holotape</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Build City Planner's Desk in settlement → Craft → Holotapes</li>
              <li>Vault 111 Overseer's Office (terminal, master lockpicking required)</li>
              <li>Via MCM menu if F4SE installed</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Main Functions</h4>
            <div className="text-xs space-y-2">
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Settlement Management</span></p>
                <p className="text-[#008000]">View status, assign settlers, configure plots</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Tools → Hijack</span></p>
                <p className="text-[#008000]">Toggle quest doors (fix conflicts with other mods)</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Tools → Advanced</span></p>
                <p className="text-[#008000]">Change main settlement, reboot failed quests</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Tools → Cheats</span></p>
                <p className="text-[#008000]">Skip questline, unlock all content (optional)</p>
              </div>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Tip:</strong> If Stranger doesn't appear, open holotape → Tools → Advanced → Click OK to reboot main quest
          </div>
        </div>
      )
    },
    {
      id: 'city-plans',
      title: '🏗️ City Plans & Automation',
      icon: <Hammer className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p>
            <span className="text-[#00d000]">City Plans</span> are pre-designed settlement layouts that automatically build your settlements with buildings, power, decorations, and settler assignments.
          </p>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">What Plans Include</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Building layouts and structure placement</li>
              <li>Automatic settler assignments</li>
              <li>Power distribution and wiring</li>
              <li>Defense setups</li>
              <li>Resource production optimization</li>
              <li>Decorative landscaping</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">How to Use</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Activate settlement workshop</li>
              <li>Open City Manager Holotape</li>
              <li>Select "City Plans"</li>
              <li>Choose plan for that settlement</li>
              <li>Watch settlers automatically build</li>
            </ol>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Plan Levels</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Level 1:</span> <span className="text-[#008000]">Foundation, defense, basic setup</span></p>
              <p><span className="text-[#00d000]">Level 2:</span> <span className="text-[#008000]">Housing, crafting stations</span></p>
              <p><span className="text-[#00d000]">Level 3:</span> <span className="text-[#008000]">Advanced crafting, production</span></p>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Available Plans:</strong> SS2 includes basic plans. Hundreds more in community addons (themed, specialized, large-scale)
          </div>
        </div>
      )
    },
    {
      id: 'addons',
      title: '📦 Addons & Expansions',
      icon: <Download className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Story Chapters</h4>
            <div className="text-xs space-y-2">
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">Chapter 2</p>
                <p className="text-[#008000]">Main story expansion with new NPCs and quests</p>
                <p className="text-[#004400]">Requires: Automatron DLC</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">Chapter 3</p>
                <p className="text-[#008000]">Story conclusion with faction warfare mechanics</p>
                <p className="text-[#004400]">Requires: Chapter 2 + Automatron DLC</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">SS2 Extended</p>
                <p className="text-[#008000]">All chapters + additional content (PC only)</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Popular Themed Packs</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Baseline Plots Brotherhood</span> - 99 BOS-themed plans</p>
              <p><span className="text-[#00d000]">Baseline Plots Raiders</span> - 110 Raider-themed plans</p>
              <p><span className="text-[#00d000]">Enclave Here</span> - Enclave-themed plots</p>
              <p><span className="text-[#00d000]">Tech Settlements</span> - High-tech infrastructure</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Advanced Functionality</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">IDEK's Logistics Station 2</span> - Auto supply line management</p>
              <p><span className="text-[#00d000]">Industrial Revolution</span> - 25 production plots</p>
              <p><span className="text-[#00d000]">SS2 Settlement Management Terminal</span> - Info terminal for settlements</p>
              <p><span className="text-[#00d000]">SS2 Settlers UI</span> - Settler management interface</p>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <p><strong>Find More:</strong> Visit <span className="text-[#00ff00]">simsettlements.com</span> addon database for searchable content</p>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: '🎮 Getting Started Guide',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Step 1: Prepare Installation</h4>
            <div className="text-xs space-y-1 ml-2">
              <p>✓ Install Fallout 4 (version 1.10.163.0+)</p>
              <p>✓ Set up Vortex, MO2, or use Xbox Mods</p>
              <p>✓ Download HUD Framework and Workshop Framework</p>
              <p>✓ Download Sim Settlements 2</p>
              <p>✓ Enable all mods in correct load order</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Step 2: Launch & Verify</h4>
            <div className="text-xs space-y-1 ml-2">
              <p>Check for these indicators in-game:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Magazine in Sanctuary workshop</li>
                <li>Terminal in Vault 111 Overseer's Office</li>
                <li>Holotape accessible from terminal</li>
                <li>HUD elements when you activate workshop</li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Step 3: Start Questline</h4>
            <div className="text-xs space-y-1 ml-2">
              <p><span className="text-[#00d000]">1.</span> Go to any settlement (Sanctuary recommended)</p>
              <p><span className="text-[#00d000]">2.</span> Activate workshop → Claim settlement</p>
              <p><span className="text-[#00d000]">3.</span> Build Recruitment Radio Beacon (Misc → Power)</p>
              <p><span className="text-[#00d000]">4.</span> Power and activate beacon</p>
              <p><span className="text-[#00d000]">5.</span> Wait in settlement (check buildings if needed)</p>
              <p><span className="text-[#00d000]">6.</span> Stranger appears → Talk to them</p>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Alternative:</strong> Use City Manager Holotape → Tools → Cheats → Unlock All to skip questline (optional)
          </div>
        </div>
      )
    },
    {
      id: 'prepopulation',
      title: '🌍 Prepopulation System',
      icon: <Lightbulb className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p>
            <span className="text-[#00d000]">Prepopulation</span> lets you build and populate settlements before leaving Vault 111 on new game+ using City Plans.
          </p>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">How to Use (New Game)</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Option 1:</span> In Prewar Sanctuary bedroom, find City Manager Holotape</p>
              <p><span className="text-[#00d000]">Option 2:</span> In Vault 111, activate ASAM Poster (behind doctors)</p>
              <p>Select "Configure Prepopulation"</p>
              <p>Choose which City Plans to use and their level</p>
              <p>Settlements auto-build when you leave vault</p>
            </div>
          </div>
          <div className="border-l border-[#00ff00] pl-2">
            <p className="text-[#00d000] font-bold">Benefits</p>
            <ul className="list-disc list-inside space-y-1 text-xs mt-1">
              <li>Jump straight into existing settlements</li>
              <li>Customize which plans to use</li>
              <li>Choose development level (1, 2, or 3)</li>
              <li>Start with infrastructure already built</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'mod-conflicts',
      title: '⚠️ Incompatible Mods',
      icon: <AlertCircle className="w-5 h-5 text-[#ff4444]" />,
      content: (
        <div className="space-y-3 text-sm text-[#ff4444] font-mono">
          <div>
            <h4 className="text-[#ff8888] font-bold mb-2">DO NOT USE With SS2</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Original Sim Settlements, Rise of Commonwealth (SS1)</li>
              <li>Conqueror (SS1 version)</li>
              <li>Unlocking Violence (breaks door hijack system)</li>
              <li>Mods that skip vanilla quests (Start Me Up, SKK Fast Start)</li>
              <li>Mods that disable Dialogue Camera</li>
              <li>Build limit set to -1 mods</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#ff8888] font-bold mb-2">Use With Caution</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#ff6666]">Full Dialogue Interface:</span> Keep Dialogue Camera ON</p>
              <p><span className="text-[#ff6666]">Scrapping Mods:</span> May break precombines</p>
              <p><span className="text-[#ff6666]">Settlement Mods:</span> Avoid for settlements with City Plans</p>
              <p><span className="text-[#ff6666]">Item Sorters:</span> Update when you update SS2</p>
            </div>
          </div>
          <div className="bg-[#330000] p-2 rounded text-[#ff6666] text-xs border border-[#660000]">
            <p><strong>Full List:</strong> Check Complete Guide's Mod Conflicts section for detailed compatibility matrix</p>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: '🔧 Troubleshooting',
      icon: <AlertCircle className="w-5 h-5 text-[#ffff00]" />,
      content: (
        <div className="space-y-3 text-sm text-[#ffff00] font-mono">
          <div>
            <h4 className="text-[#ffdd00] font-bold mb-2">Stranger Won't Appear</h4>
            <div className="text-xs ml-2">
              <p className="text-[#008000]">Solution:</p>
              <ol className="list-decimal list-inside ml-2 space-y-1">
                <li>Check other settlements with beacons</li>
                <li>Look inside buildings (Stranger wanders)</li>
                <li>Open City Manager Holotape → Tools → Advanced → Click OK</li>
                <li>Restart game and try again</li>
              </ol>
            </div>
          </div>
          <div>
            <h4 className="text-[#ffdd00] font-bold mb-2">No HUD/SS2 Icon</h4>
            <div className="text-xs ml-2">
              <p className="text-[#008000]">Solution:</p>
              <ol className="list-decimal list-inside ml-2 space-y-1">
                <li>Restart mod manager and game</li>
                <li>Check Plugins tab - make sure plugins are checked</li>
                <li>Verify load order matches guide</li>
              </ol>
            </div>
          </div>
          <div>
            <h4 className="text-[#ffdd00] font-bold mb-2">Quest Won't Progress</h4>
            <div className="text-xs ml-2">
              <p className="text-[#008000]">Common Causes:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Conflicting mods (check Incompatible Mods section)</li>
                <li>Dialogue Camera disabled</li>
                <li>Item Sorters not updated</li>
              </ul>
              <p className="text-[#008000] mt-2">Fix: Use console: CompleteQuest [questID]</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#ffdd00] font-bold mb-2">Plots Won't Place</h4>
            <div className="text-xs ml-2">
              <p className="text-[#008000]">Solution:</p>
              <ol className="list-decimal list-inside ml-2 space-y-1">
                <li>Install Place Everywhere mod</li>
                <li>Place plot with Place Everywhere</li>
                <li>Pick it up and cancel placement (registers location)</li>
              </ol>
            </div>
          </div>
          <div className="bg-[#333300] p-2 rounded text-[#008000] text-xs border border-[#666600]">
            <p><strong>More Issues?</strong> Check Complete Guide's Troubleshooting section or visit forums</p>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: '❓ FAQ',
      icon: <HelpCircle className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm text-[#00ff00] font-mono">
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Do I need to start a new game?</p>
            <p className="text-xs text-[#008000]">Yes, if your save ever had original Sim Settlements. Otherwise optional but recommended for story.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Can I use SS1 addons?</p>
            <p className="text-xs text-[#008000]">No. SS2 is fundamentally different. SS1 addons must be converted by authors.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Do I need all DLCs?</p>
            <p className="text-xs text-[#008000]">No. Base game only. Some chapters require Automatron. Some addons require other DLCs.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Can I skip the questline?</p>
            <p className="text-xs text-[#008000]">Yes. City Manager Holotape → Tools → Cheats → Unlock All (disables progression rewards)</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">How do I get more ASAM sensors?</p>
            <p className="text-xs text-[#008000]">Complete parts of the main questline. They unlock progressively.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Can I mix manual building with City Plans?</p>
            <p className="text-xs text-[#008000]">Yes. Use plans for some plots, manually build others. Total flexibility.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Why are updates so large?</p>
            <p className="text-xs text-[#008000]">Core code changes require re-issuing entire mod. Unavoidable given architecture.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Is there a roadmap for future content?</p>
            <p className="text-xs text-[#008000]">No official roadmap. Development continues with updates as they're ready.</p>
          </div>
        </div>
      )
    },
    {
      id: 'resources',
      title: '🌐 Community & Resources',
      icon: <Users className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Official Resources</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">📍 Official Website:</span> <span className="text-[#00d000]">simsettlements.com</span></p>
              <p><span className="text-[#00d000]">💬 Forums:</span> Official discussion, help, suggestions, contests</p>
              <p><span className="text-[#00d000]">🗄️ Addon Database:</span> Searchable catalog of all community content</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Community</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Discord: We Are Builders</span> - Building community for FO4</p>
              <p><span className="text-[#00d000]">Discord: Patreon Server</span> - Supporter community</p>
              <p><span className="text-[#00d000]">Nexus Mods</span> - Download location + mod discussions</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Getting Help</h4>
            <div className="text-xs space-y-1">
              <p>• Check forums first for existing answers</p>
              <p>• Report bugs on mod pages</p>
              <p>• Ask questions in Discord for real-time help</p>
              <p>• See Complete Guide's Troubleshooting section</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Contributing</h4>
            <div className="text-xs space-y-1">
              <p>• Create addon packs (City Plans, plot packs)</p>
              <p>• Share fan art and videos</p>
              <p>• Test content and report bugs</p>
              <p>• Help translate SS2</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#001a00] text-[#00ff00] font-mono rounded-lg border-2 border-[#00ff00] shadow-2xl">
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-[#00ff00]">
        <h1 className="text-3xl font-bold text-[#00d000] mb-2">Sim Settlements 2 Guide</h1>
        <p className="text-sm text-[#008000]">Complete reference for settlement automation, quests, and community content</p>
        <p className="text-xs text-[#004400] mt-2">Version 1.0 | Updated January 24, 2026</p>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-[#00ff00] rounded overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 bg-[#001a00] hover:bg-[#003300] flex items-center justify-between transition-colors text-left border-b border-[#00ff00]"
            >
              <div className="flex items-center gap-3">
                {section.icon}
                <span className="text-[#00d000] font-bold">{section.title}</span>
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="w-5 h-5 text-[#00ff00]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#00ff00]" />
              )}
            </button>

            {/* Section Content */}
            {expandedSection === section.id && (
              <div className="px-4 py-4 bg-[#000d00] border-t border-[#00ff00]">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-[#00ff00] text-xs text-[#008000]">
        <p>For more detailed information, see <span className="text-[#00d000]">SIM_SETTLEMENTS_2_COMPLETE_GUIDE.md</span></p>
        <p className="mt-2">Visit <span className="text-[#00d000]">simsettlements.com</span> for official updates and community resources</p>
      </div>
    </div>
  );
}
