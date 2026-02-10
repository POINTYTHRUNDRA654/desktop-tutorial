import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, AlertCircle, Users, Hammer, CheckCircle2, HelpCircle, Lightbulb, Code, Zap } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

type SimSettlementsAddonGuideProps = {
  embedded?: boolean;
};

export default function SimSettlementsAddonGuide({ embedded = false }: SimSettlementsAddonGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-start');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
  };

  const sections: Section[] = [
    {
      id: 'quick-start',
      title: '⚡ Quick Start (30 Minutes)',
      icon: <Zap className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Install Tools (15 min)</h4>
            <div className="text-xs space-y-2">
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">1. Creation Kit</p>
                <p className="text-[#008000]">Steam → Search "Creation Kit" → Free install</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">2. FO4Edit</p>
                <p className="text-[#008000]">Nexus Mods → Extract to folder</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">3. Nifskope</p>
                <p className="text-[#008000]">GitHub → Dev 7 build → Extract</p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000]">4. Addon Maker's Toolkit</p>
                <p className="text-[#008000]">Nexus Mods → Extract, copy scripts</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">First Addon (15 min)</h4>
            <p className="text-xs text-[#008000]">Create a building skin (recolor):</p>
            <ol className="list-decimal list-inside space-y-1 text-xs mt-2 text-[#008000]">
              <li>Open Creation Kit, load SS2</li>
              <li>Find building, duplicate it</li>
              <li>Change material to new color</li>
              <li>Create weapon record for skin</li>
              <li>Register with addon config</li>
              <li>Save and test in-game</li>
            </ol>
          </div>

          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <p className="text-[#00d000] font-bold">Fast verification loop</p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>CK launches and can load the SS2 masters (no missing-file errors).</li>
              <li>You can compile a trivial Papyrus script (produces a <strong>.pex</strong>).</li>
              <li>Your test plugin loads in-game and the new record appears (craftable item, holotape, or building skin).</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'overview',
      title: '🎯 Addon Creator Overview',
      icon: <BookOpen className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p>
            Sim Settlements 2 is extremely moddable. Create <span className="text-[#00d000]">buildings, city plans, HQ content</span>, and more!
          </p>
          <div className="border-l-2 border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Content Types You Can Create</p>
            <ul className="list-disc list-inside space-y-1 text-xs mt-2">
              <li>Building Skins (recolors/variants)</li>
              <li>Single-level Buildings</li>
              <li>Multi-level Buildings (L1→L3)</li>
              <li>City Plans (pre-built settlements)</li>
              <li>HQ Room Designs</li>
              <li>Advanced Systems (holidays, flags, etc.)</li>
            </ul>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Learning Path:</strong> Skins → Buildings → City Plans → Advanced
          </div>
        </div>
      )
    },
    {
      id: 'tools',
      title: '🛠️ Required Tools',
      icon: <Hammer className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Essential (Free)</h4>
            <div className="text-xs space-y-2">
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000] font-bold">Creation Kit</p>
                <p className="text-[#008000]">Core tool for all addon work. Steam download.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-[#002200] hover:bg-[#003300]" onClick={() => openUrl('https://store.steampowered.com/search/?term=Creation%20Kit%20Fallout%204')}>Steam search</button>
                </div>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000] font-bold">XEdit / FO4Edit</p>
                <p className="text-[#008000]">Automates tedious work. Nexus Mods.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-[#002200] hover:bg-[#003300]" onClick={() => openNexusSearch('FO4Edit')}>Nexus search</button>
                </div>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p className="text-[#00d000] font-bold">Nifskope</p>
                <p className="text-[#008000]">3D model editing. GitHub (Dev 7+)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-[#002200] hover:bg-[#003300]" onClick={() => openUrl('https://github.com/search?q=NifSkope+release&type=repositories')}>GitHub search</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Recommended (Free)</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Open Office Calc:</span> <span className="text-[#008000]">Spreadsheet software (Excel alternative)</span></p>
              <p><span className="text-[#00d000]">Material Editor:</span> <span className="text-[#008000]">Custom textures and materials</span></p>
              <p><span className="text-[#00d000]">Addon Maker's Toolkit:</span> <span className="text-[#008000]">Scripts, templates, helpers</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button className="px-3 py-1 rounded bg-[#002200] hover:bg-[#003300]" onClick={() => openNexusSearch("Add-On Maker's Toolkit")}>Toolkit (Nexus search)</button>
                <button className="px-3 py-1 rounded bg-[#002200] hover:bg-[#003300]" onClick={() => openNexusSearch('Sim Settlements 2')}>SS2 (Nexus search)</button>
              </div>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <p><strong>Total Setup Time:</strong> 30-45 minutes for all tools</p>
            <p className="mt-1"><strong>Verify:</strong> CK opens SS2 masters, FO4Edit opens your plugin, NifSkope opens a reference .nif without missing textures.</p>
          </div>
        </div>
      )
    },
    {
      id: 'building-series',
      title: '🏗️ Learn to Create Buildings',
      icon: <Hammer className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p className="text-[#00d000] font-bold">8 Tutorials in Guided Series (Complete in Order)</p>
          <div className="text-xs space-y-2">
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">00 - Intro to Addon Creation</p>
              <p className="text-[#008000]">How tutorials work, color codes, format</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">01 - Getting Started</p>
              <p className="text-[#008000]">Install & configure all tools (45 min)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">02 - Your First Addon</p>
              <p className="text-[#008000]">Build simple recolor skin (1-2 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">03 - Your First Building</p>
              <p className="text-[#008000]">Create kit-bashed building model (2-4 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">04 - Decorating Your Buildings</p>
              <p className="text-[#008000]">Add furniture, clutter, lights (2-3 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">05 - Supporting Upgrades</p>
              <p className="text-[#008000]">Create Levels 2 & 3 (2-4 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">06 - Advanced Customization</p>
              <p className="text-[#008000]">Randomized clutter, shops, flags (3-5 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">07 - Navmeshing</p>
              <p className="text-[#008000]">NPC pathfinding setup (2-4 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">08 - Making a Building Pack</p>
              <p className="text-[#008000]">Release-ready addon (5-10 hours)</p>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>Total Time:</strong> 20-40 hours from zero to releasable addon
          </div>
        </div>
      )
    },
    {
      id: 'city-plans',
      title: '🏘️ Learn to Create City Plans',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p className="text-[#00d000] font-bold">4 Tutorials for Settlement Designs</p>
          <div className="text-xs space-y-2">
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">00 - Preparing to Create City Plans</p>
              <p className="text-[#008000]">Export settings, recommended mods (30 min)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">01 - Your First City Plan</p>
              <p className="text-[#008000]">Design → export → web tool (1-2 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">02 - Leveled City Plans</p>
              <p className="text-[#008000]">Multiple levels, organic upgrade (2-4 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">03 - Wasteland Reconstruction Kit</p>
              <p className="text-[#008000]">Expand building options (1 hour)</p>
            </div>
          </div>
          <div className="border-l border-[#00ff00] pl-2 mt-2">
            <p className="text-[#00d000] font-bold">Process</p>
            <p className="text-[#008000] text-xs">1. Build in-game 2. Export 3. Use web tool 4. Download</p>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <strong>No Creation Kit required!</strong> Just design in-game and export.
          </div>
        </div>
      )
    },
    {
      id: 'hq-content',
      title: '🏰 Learn to Create HQ Content',
      icon: <Code className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <p className="text-[#00d000] font-bold">7 Tutorials for Headquarters Design</p>
          <div className="text-xs space-y-2">
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">00 - Intro to HQ</p>
              <p className="text-[#008000]">Overview and what's possible (10-15 min)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">01 - Your First Room Design</p>
              <p className="text-[#008000]">Alternate room layout, no modeling (1-2 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">02 - Understanding Room Configs</p>
              <p className="text-[#008000]">Customize room purpose prompts (1-2 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">03 - Adding Room Functionality</p>
              <p className="text-[#008000]">Gameplay impact, advanced fields (2-3 hours)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">04 - Updating Room Designs</p>
              <p className="text-[#008000]">Edit and fix designs (COMING SOON)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">05 - Room Upgrades</p>
              <p className="text-[#008000]">Layer upgrades and tech trees (COMING SOON)</p>
            </div>
            <div className="border-l border-[#00ff00] pl-2">
              <p className="text-[#00d000]">07 - Allies and Advisors</p>
              <p className="text-[#008000]">HQ NPCs and story content (2-3 hours)</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'topics',
      title: '📚 Topic Series (Advanced)',
      icon: <BookOpen className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Gameplay Systems</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Brewery System:</span> <span className="text-[#008000]">Beer recipes</span></p>
              <p><span className="text-[#00d000]">Character Stats:</span> <span className="text-[#008000]">NPC preferences</span></p>
              <p><span className="text-[#00d000]">Leaders System:</span> <span className="text-[#008000]">Settlement leaders with traits</span></p>
              <p><span className="text-[#00d000]">Discovery System:</span> <span className="text-[#008000]">Caravan-based unlocks</span></p>
              <p><span className="text-[#00d000]">Pets & Pet Names:</span> <span className="text-[#008000]">Purchasable creatures</span></p>
              <p><span className="text-[#00d000]">World Repopulation:</span> <span className="text-[#008000]">Populate world buildings</span></p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Visual & Customization</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Dynamic Flags:</span> <span className="text-[#008000]">Custom banners</span></p>
              <p><span className="text-[#00d000]">Holiday System:</span> <span className="text-[#008000]">Seasonal decorations</span></p>
              <p><span className="text-[#00d000]">Theme Tags:</span> <span className="text-[#008000]">Organize content</span></p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: '✨ Best Practices',
      icon: <Lightbulb className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Building Design Philosophy</h4>
            <div className="text-xs space-y-2">
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Level 1:</span> <span className="text-[#008000]">Struggling (minimal decoration)</span></p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Level 2:</span> <span className="text-[#008000]">Improving (better furniture)</span></p>
              </div>
              <div className="border-l border-[#00ff00] pl-2">
                <p><span className="text-[#00d000]">Level 3:</span> <span className="text-[#008000]">Thriving (luxury & clutter)</span></p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Development Tips</h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-[#008000]">
              <li>Test frequently → Get content in-game ASAP</li>
              <li>Start small → Skins before buildings</li>
              <li>Use spreadsheets → Import tool saves hours</li>
              <li>Kit-bash models → No 3D modeling needed</li>
              <li>Get feedback → Share before final release</li>
              <li>Document changes → Track improvements</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Performance Optimization</h4>
            <p className="text-xs text-[#008000]">Tag clutter, lights, and decorations so players can disable them on weak systems. Xbox players especially appreciate this!</p>
          </div>
        </div>
      )
    },
    {
      id: 'release',
      title: '🚀 Releasing Your Addon',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Pre-Release Checklist</h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-[#008000]">
              <li>Content created and tested</li>
              <li>Shared with friends for feedback</li>
              <li>Load order verified</li>
              <li>All files included</li>
              <li>Mod page created</li>
              <li>Version number set</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Distribution Options</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Nexus Mods:</span> <span className="text-[#008000]">Most popular, recommended</span></p>
              <p><span className="text-[#00d000]">Bethesda.net:</span> <span className="text-[#008000]">PC and console access</span></p>
              <p><span className="text-[#00d000]">Forums:</span> <span className="text-[#008000]">Direct sharing</span></p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Post-Release</h4>
            <div className="text-xs space-y-1">
              <p><strong>Never delete forms</strong> (causes save corruption)</p>
              <p><strong>Tag obsolete content</strong> with "_Obsolete" suffix</p>
              <p><strong>Increase version global</strong> when adding content</p>
              <p><strong>Test on existing saves</strong> before updating</p>
            </div>
          </div>
          <div className="bg-[#001a00] p-2 rounded text-[#008000] text-xs border border-[#004400]">
            <p><strong>Community loves new content!</strong> Start small, gather feedback, iterate. You'll find an audience for quality work!</p>
          </div>
        </div>
      )
    },
    {
      id: 'community',
      title: '🌐 Community & Resources',
      icon: <Users className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Official Resources</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">📍 Website:</span> simsettlements.com</p>
              <p><span className="text-[#00d000]">💬 Forums:</span> Official discussion, help, announcements</p>
              <p><span className="text-[#00d000]">🎮 Discord:</span> Real-time help, immediate feedback</p>
              <p><span className="text-[#00d000]">📦 Addon Database:</span> Browse community creations</p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Learning Resources</h4>
            <div className="text-xs space-y-1">
              <p><span className="text-[#00d000]">Video Tutorials:</span> <span className="text-[#008000]">Companion videos for guides</span></p>
              <p><span className="text-[#00d000]">Example Addons:</span> <span className="text-[#008000]">Study official SS2 content</span></p>
              <p><span className="text-[#00d000]">Branding Guide:</span> <span className="text-[#008000]">Logos, fonts, design resources</span></p>
            </div>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Getting Help</h4>
            <div className="text-xs space-y-1 text-[#008000]">
              <p>• Join Discord for real-time support</p>
              <p>• Post questions in forums</p>
              <p>• Share work-in-progress for feedback</p>
              <p>• Help other creators learn</p>
            </div>
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
            <p className="text-[#00d000] font-bold">Do I need 3D modeling experience?</p>
            <p className="text-xs text-[#008000]">No! Kit-bashing existing models covers most needs. Just rearrange and combine existing pieces.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">How long does content creation take?</p>
            <p className="text-xs text-[#008000]">Highly variable: 30 min for skins, hours for buildings. Start small and build up.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">What's the simplest addon to start with?</p>
            <p className="text-xs text-[#008000]">Building skins (recolors). Then single-level buildings. Then multi-level. Then City Plans.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Do I need DLC to create addons?</p>
            <p className="text-xs text-[#008000]">No DLC required. Some classes require Automatron for players, but not creators.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Can I port SS1 addons?</p>
            <p className="text-xs text-[#008000]">Yes! Architecture is different, but your knowledge transfers. Conversion guide available.</p>
          </div>
          <div className="border-l border-[#00ff00] pl-3">
            <p className="text-[#00d000] font-bold">Can I make money from addons?</p>
            <p className="text-xs text-[#008000]">These are free mods. Focus on quality content—the community will appreciate it!</p>
          </div>
        </div>
      )
    }
  ];

  const containerClassName = `w-full ${embedded ? 'p-4' : 'max-w-4xl mx-auto p-6'} bg-[#001a00] text-[#00ff00] font-mono rounded-lg border-2 border-[#00ff00] shadow-2xl`;

  return (
    <div className={containerClassName}>
      {/* Header */}
      {!embedded && (
        <div className="mb-8 pb-4 border-b-2 border-[#00ff00]">
          <h1 className="text-3xl font-bold text-[#00d000] mb-2">Sim Settlements 2 Addon Creator Guide</h1>
          <p className="text-sm text-[#008000]">Master addon creation: buildings, city plans, HQ content, and advanced systems</p>
          <p className="text-xs text-[#004400] mt-2">Version 1.0 | Updated January 24, 2026</p>
        </div>
      )}

      <ToolsInstallVerifyPanel
        accentClassName="text-emerald-300"
        description="Use this page as a quick-start map. The safest first win is: CK loads SS2 masters → compile one script → ship one tiny record → test in-game."
        tools={[
          { label: 'Steam search: Fallout 4 Creation Kit', href: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit', kind: 'search' },
          { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search' },
          { label: 'Nexus search: NifSkope', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=NifSkope&gsearchtype=mods', kind: 'search', note: 'Optional for mesh/material inspection.' },
          { label: 'Nexus search: Addon Maker Toolkit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Addon%20Maker%27s%20Toolkit&gsearchtype=mods', kind: 'search', note: 'If you plan to ship SS2-specific scripts/workflows.' },
        ]}
        verify={[
          'Confirm CK can launch and load SS2 masters without missing-file errors.',
          'Confirm you can compile a trivial Papyrus script and it produces a .pex.'
        ]}
        firstTestLoop={[
          'Create one tiny record (holotape/craftable/building skin) → save plugin → load in-game → confirm it appears.',
          'Only after a clean loop should you add city plans/HQ content or more complex quests.'
        ]}
        troubleshooting={[
          'If CK cannot load masters, stop and resolve missing files/paths first (don’t keep editing).',
          'If scripts do not compile, confirm your CK install is correct before you change more logic.'
        ]}
      />

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
        <p>📚 Complete guides: <span className="text-[#00d000]">SIM_SETTLEMENTS_2_ADDON_CREATOR_GUIDE.md</span></p>
        <p>⚡ Quick start: <span className="text-[#00d000]">SIM_SETTLEMENTS_2_ADDON_QUICK_START.md</span></p>
        <p className="mt-2">🌐 Official: <span className="text-[#00d000]">simsettlements.com</span></p>
      </div>
    </div>
  );
}
