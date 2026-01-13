import React, { useState } from 'react';
import { Wand2, ChevronDown, ChevronRight, Settings, MessageCircle, Star, Users, FileText, PlusCircle, CheckCircle2 } from 'lucide-react';

interface AutomationSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export const QuestModAutomationSuite: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('template');

  const sections: AutomationSection[] = [
    {
      id: 'template',
      title: 'Quest Mod Template Generator',
      icon: Wand2,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">✨ Advanced Quest Mod Scaffolding</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Choose from expert-level templates: radiant, multi-stage, branching, or faction-based quests.</li>
              <li>Auto-generate folder structure, Papyrus stubs, quest records, and CK-compatible data files.</li>
              <li>Integrate advanced quest metadata: voice types, quest type flags, priority, and custom scripts.</li>
              <li>Validate for lore-friendliness, naming conventions, and mod compatibility (no FormID conflicts).</li>
              <li>Include documentation: implementation checklist, CK import steps, and best practices.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Template Type</label>
              <select className="bg-slate-900 border border-blue-700 rounded px-2 py-1 text-slate-200">
                <option>Radiant Quest</option>
                <option>Multi-Stage Quest</option>
                <option>Branching Quest</option>
                <option>Faction/Ally Quest</option>
                <option>Custom (Advanced)</option>
              </select>
              <label className="text-slate-400 text-xs mt-2">Quest Name</label>
              <input className="bg-slate-900 border border-blue-700 rounded px-2 py-1 text-slate-200" placeholder="Enter quest name..." />
              <label className="text-slate-400 text-xs mt-2">Author/Mod Team</label>
              <input className="bg-slate-900 border border-blue-700 rounded px-2 py-1 text-slate-200" placeholder="Your name or team..." />
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Generate Advanced Template</button>
            <div className="mt-4 bg-slate-900/60 border border-blue-800 rounded p-3">
              <h5 className="font-bold text-blue-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-blue-100 space-y-1">
                <li>Use unique EditorIDs and FormIDs to avoid conflicts with other mods.</li>
                <li>Document quest logic and dependencies for future updates and team collaboration.</li>
                <li>Plan for localization: avoid hardcoded strings, use string variables.</li>
                <li>Structure folders for easy CK import: scripts/, dialogs/, records/, docs/.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'objectives',
      title: 'Objective & Stage Builder',
      icon: Star,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">🎯 Advanced Objectives & Stages</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Define main and optional objectives, with fail/success conditions and stage triggers.</li>
              <li>Auto-generate stage skeletons with advanced logic: branching, fail states, and re-entry points.</li>
              <li>Support for radiant objectives, time-limited stages, and dynamic quest updates.</li>
              <li>Edge case handling: quest restarts, player death, companion loss, or world state changes.</li>
              <li>Preview Papyrus fragments for each stage and objective.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Add Objective</label>
              <input className="bg-slate-900 border border-green-700 rounded px-2 py-1 text-slate-200" placeholder="Objective description..." />
              <label className="text-slate-400 text-xs mt-2">Objective Type</label>
              <select className="bg-slate-900 border border-green-700 rounded px-2 py-1 text-slate-200">
                <option>Main</option>
                <option>Optional</option>
                <option>Radiant</option>
                <option>Fail Condition</option>
              </select>
              <label className="text-slate-400 text-xs mt-2">Stage Trigger</label>
              <input className="bg-slate-900 border border-green-700 rounded px-2 py-1 text-slate-200" placeholder="e.g. OnEnterCell, OnItemPickup..." />
            </div>
            <button className="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Add Advanced Objective</button>
            <div className="mt-4 bg-slate-900/60 border border-green-800 rounded p-3">
              <h5 className="font-bold text-green-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-green-100 space-y-1">
                <li>Use unique stage indices and document stage transitions for complex quests.</li>
                <li>Test fail and restart conditions thoroughly to avoid softlocks.</li>
                <li>Leverage Papyrus fragments for dynamic quest updates and notifications.</li>
                <li>Consider accessibility: provide clear journal updates and avoid ambiguous objectives.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dialogue',
      title: 'Dialogue & Scene Stubber',
      icon: MessageCircle,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-4">
            <h4 className="font-bold text-purple-300 mb-2">💬 Advanced Dialogue & Scene Builder</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Auto-generate dialogue stubs for each stage, with branching options and conditional responses.</li>
              <li>Support for player choices, skill checks, and dynamic responses based on quest state or world variables.</li>
              <li>Integrate scene setup: camera shots, idle animations, and voice type assignment.</li>
              <li>Preview dialogue tree structure and export as CK dialogue data or JSON.</li>
              <li>Expert validation: check for missing conditions, unreachable branches, and voice file placeholders.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Add Dialogue Line</label>
              <input className="bg-slate-900 border border-purple-700 rounded px-2 py-1 text-slate-200" placeholder="NPC or player line..." />
              <label className="text-slate-400 text-xs mt-2">Branch Condition (optional)</label>
              <input className="bg-slate-900 border border-purple-700 rounded px-2 py-1 text-slate-200" placeholder="e.g. HasItem, SkillCheck, QuestStage..." />
              <label className="text-slate-400 text-xs mt-2">Voice Type</label>
              <input className="bg-slate-900 border border-purple-700 rounded px-2 py-1 text-slate-200" placeholder="e.g. MaleRough, FemaleYoungEager..." />
            </div>
            <button className="mt-4 px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 transition">Add Advanced Dialogue</button>
            <div className="mt-4 bg-slate-900/60 border border-purple-800 rounded p-3">
              <h5 className="font-bold text-purple-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-purple-100 space-y-1">
                <li>Use conditions to create meaningful player choices and consequences.</li>
                <li>Test all branches for accessibility and logical flow.</li>
                <li>Assign voice types early for easier voice acting or xVASynth integration.</li>
                <li>Document scene setup for animators and voice actors.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'npc',
      title: 'NPC & Faction Template',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-4">
            <h4 className="font-bold text-yellow-300 mb-2">👥 Advanced NPC & Faction Generator</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Auto-generate custom NPCs with advanced AI packages: patrol, sandbox, follow, guard, or custom routines.</li>
              <li>Assign to new or existing factions, with relationship ranks (ally, enemy, neutral, rival, etc.).</li>
              <li>Customize appearance: race, gender, face presets, outfits, and inventory.</li>
              <li>Set dialogue topics, voice types, and quest-specific behaviors.</li>
              <li>Preview Papyrus AI package fragments and faction relationship data.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">NPC Name</label>
              <input className="bg-slate-900 border border-yellow-700 rounded px-2 py-1 text-slate-200" placeholder="Enter NPC name..." />
              <label className="text-slate-400 text-xs mt-2">AI Package</label>
              <select className="bg-slate-900 border border-yellow-700 rounded px-2 py-1 text-slate-200">
                <option>Patrol</option>
                <option>Sandbox</option>
                <option>Follow</option>
                <option>Guard</option>
                <option>Custom</option>
              </select>
              <label className="text-slate-400 text-xs mt-2">Faction</label>
              <input className="bg-slate-900 border border-yellow-700 rounded px-2 py-1 text-slate-200" placeholder="Faction name or ID..." />
              <label className="text-slate-400 text-xs mt-2">Relationship Rank</label>
              <select className="bg-slate-900 border border-yellow-700 rounded px-2 py-1 text-slate-200">
                <option>Ally</option>
                <option>Enemy</option>
                <option>Neutral</option>
                <option>Rival</option>
                <option>Custom</option>
              </select>
            </div>
            <button className="mt-4 px-4 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition">Add Advanced NPC</button>
            <div className="mt-4 bg-slate-900/60 border border-yellow-800 rounded p-3">
              <h5 className="font-bold text-yellow-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-yellow-100 space-y-1">
                <li>Use unique EditorIDs for all NPCs and factions to avoid conflicts.</li>
                <li>Test AI packages in-game for navigation and behavior bugs.</li>
                <li>Document faction relationships for complex quest logic.</li>
                <li>Assign voice types and dialogue topics for immersive interactions.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'rewards',
      title: 'Reward & Ending Generator',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-cyan-900/20 border border-cyan-700/30 rounded p-4">
            <h4 className="font-bold text-cyan-300 mb-2">🏆 Advanced Rewards & Endings</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Define multiple endings with complex conditions and branching consequences.</li>
              <li>Auto-generate reward logic: gear, caps, perks, unique items, or world state changes.</li>
              <li>Support for conditional rewards: based on player choices, skills, or hidden variables.</li>
              <li>Preview Papyrus reward scripts and ending triggers.</li>
              <li>Validate for balance, lore-friendliness, and exploit prevention.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Ending Description</label>
              <input className="bg-slate-900 border border-cyan-700 rounded px-2 py-1 text-slate-200" placeholder="Describe this ending..." />
              <label className="text-slate-400 text-xs mt-2">Reward Type</label>
              <select className="bg-slate-900 border border-cyan-700 rounded px-2 py-1 text-slate-200">
                <option>Gear</option>
                <option>Caps</option>
                <option>Perk</option>
                <option>Unique Item</option>
                <option>World State Change</option>
                <option>Custom</option>
              </select>
              <label className="text-slate-400 text-xs mt-2">Condition (optional)</label>
              <input className="bg-slate-900 border border-cyan-700 rounded px-2 py-1 text-slate-200" placeholder="e.g. PlayerHasItem, SkillCheck, FactionRank..." />
            </div>
            <button className="mt-4 px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 transition">Add Advanced Reward/Ending</button>
            <div className="mt-4 bg-slate-900/60 border border-cyan-800 rounded p-3">
              <h5 className="font-bold text-cyan-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-cyan-100 space-y-1">
                <li>Script all endings to update quest variables and world state for consistency.</li>
                <li>Test for exploits: ensure rewards can't be duplicated or abused.</li>
                <li>Balance rewards for difficulty and lore impact.</li>
                <li>Document all ending conditions for QA and future updates.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'customize',
      title: 'Customization & Export',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">⚙️ Advanced Customization & Export</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Review and edit all generated quest data, scripts, and documentation before export.</li>
              <li>Export as mod folder, Papyrus scripts, JSON, or CK-compatible records with validation checks.</li>
              <li>Validate for missing references, script errors, and CK import compatibility.</li>
              <li>Generate a README and implementation checklist for mod teams or Nexus release.</li>
              <li>Preview export structure and customize output paths or formats.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Export Format</label>
              <select className="bg-slate-900 border border-green-700 rounded px-2 py-1 text-slate-200">
                <option>Mod Folder</option>
                <option>Papyrus Scripts</option>
                <option>JSON Data</option>
                <option>CK Records</option>
                <option>Documentation Only</option>
              </select>
              <label className="text-slate-400 text-xs mt-2">Output Path</label>
              <input className="bg-slate-900 border border-green-700 rounded px-2 py-1 text-slate-200" placeholder="e.g. C:/Mods/MyQuest/" />
            </div>
            <button className="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Export Advanced Package</button>
            <div className="mt-4 bg-slate-900/60 border border-green-800 rounded p-3">
              <h5 className="font-bold text-green-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-green-100 space-y-1">
                <li>Always validate exports for missing references and script errors before CK import.</li>
                <li>Include a README and checklist for team collaboration and Nexus uploads.</li>
                <li>Customize output paths for easy integration with your modding workflow.</li>
                <li>Keep backups of all exports for version control and troubleshooting.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'papyrus',
      title: 'Papyrus Code Generator',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-4">
            <h4 className="font-bold text-purple-300 mb-2">📝 Advanced Papyrus Script Generator</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Auto-generate Papyrus scripts for quest stages, objectives, branching, and custom events.</li>
              <li>Support for advanced scripting patterns: state machines, event-driven logic, and modular functions.</li>
              <li>Insert error handling, debug logging, and compatibility checks for robust scripts.</li>
              <li>Preview, edit, and export scripts with syntax highlighting and CK-ready formatting.</li>
              <li>Expert documentation: inline comments, usage notes, and best practices for Papyrus scripting.</li>
            </ul>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-xs">Script Name</label>
              <input className="bg-slate-900 border border-purple-700 rounded px-2 py-1 text-slate-200" placeholder="Enter script name..." />
              <label className="text-slate-400 text-xs mt-2">Script Type</label>
              <select className="bg-slate-900 border border-purple-700 rounded px-2 py-1 text-slate-200">
                <option>Quest</option>
                <option>Stage</option>
                <option>Objective</option>
                <option>Custom Event</option>
                <option>Utility</option>
              </select>
            </div>
            <button className="mt-4 px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 transition">Generate Advanced Papyrus Code</button>
            <div className="mt-4 bg-slate-900/60 border border-purple-800 rounded p-3">
              <h5 className="font-bold text-purple-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-purple-100 space-y-1">
                <li>Use modular functions and events for maintainable scripts.</li>
                <li>Always include error handling and debug output for troubleshooting.</li>
                <li>Follow Papyrus naming conventions and comment all logic blocks.</li>
                <li>Test scripts in isolation before integrating into the full quest.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'branching',
      title: 'Branching Logic Editor',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">🔀 Advanced Visual Branching Editor</h4>
            <ul className="list-disc pl-6 text-slate-300 text-sm mb-2">
              <li>Design quest flow visually: add, connect, and reorder stages, conditions, and outcomes.</li>
              <li>Support for complex branching: nested conditions, fail states, and dynamic quest updates.</li>
              <li>Live diagram with drag-and-drop editing, color-coded branches, and error highlighting.</li>
              <li>Export as JSON, Papyrus-ready data, or CK importable structure.</li>
              <li>Expert validation: unreachable nodes, circular logic, and missing conditions.</li>
            </ul>
            <button className="mt-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Open Advanced Branching Editor</button>
            <div className="mt-4 bg-slate-900/60 border border-blue-800 rounded p-3">
              <h5 className="font-bold text-blue-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-blue-100 space-y-1">
                <li>Use color coding to track main, side, and fail branches.</li>
                <li>Validate for unreachable or circular logic before export.</li>
                <li>Document all conditions and outcomes for QA and future updates.</li>
                <li>Export diagrams for team review and CK planning.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ck',
      title: 'CK Integration & Export',
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">🔗 Expert Creation Kit Integration</h4>
            <ul className="list-decimal pl-6 text-slate-300 text-sm mb-2">
              <li>Export all quest data, scripts, and records in CK-ready formats (folders, scripts, JSON, CSV, etc.).</li>
              <li>Step-by-step import workflow: copying files, CK data import, record linking, and script attachment.</li>
              <li>Advanced troubleshooting: resolving FormID conflicts, script errors, and missing references.</li>
              <li>Validation: check for missing properties, broken links, and Papyrus compile errors before import.</li>
              <li>Expert tips: batch import, version control, and best practices for large quest mods.</li>
            </ul>
            <button className="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Export for CK (Expert Mode)</button>
            <div className="mt-4 bg-slate-900/60 border border-green-800 rounded p-3">
              <h5 className="font-bold text-green-200 mb-1 text-xs">Expert Tips</h5>
              <ul className="list-disc pl-5 text-xs text-green-100 space-y-1">
                <li>Always validate all exports before CK import to avoid data loss or corruption.</li>
                <li>Use version control for all scripts and data files during development.</li>
                <li>Document all import steps and troubleshooting for team members.</li>
                <li>Leverage batch import tools and Papyrus compiler logs for efficiency.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Quest Mod Automation Suite</h1>
            <p className="text-sm text-slate-400">Generate, customize, and export quest mod templates and content</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;

            return (
              <div
                key={section.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white text-lg">{section.title}</h3>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-6 py-4 border-t border-slate-700">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-purple-900/20 border-t border-slate-700">
        <p className="text-xs text-purple-300 text-center">
          💡 Tip: Use the automation suite to jumpstart your quest mod, then customize every detail for a unique, lore-friendly experience!
        </p>
      </div>
    </div>
  );
};
