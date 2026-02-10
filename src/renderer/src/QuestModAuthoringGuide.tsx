import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, AlertTriangle, CheckCircle2, MessageCircle, Map, Users, Settings, Star, FileText, Wrench, ExternalLink, Rocket } from 'lucide-react';
import { openExternal } from './utils/openExternal';
import { CKQuestDialogueWizard } from './CKQuestDialogueWizard';
import { LeveledListInjectionGuide } from './LeveledListInjectionGuide';
import { PrecombineAndPRPGuide } from './PrecombineAndPRPGuide';
import { PrecombineChecker } from './PrecombineChecker';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

type HubStep = {
  id: string;
  title: string;
  description: string;
  sectionIds?: string[];
  blocks?: React.ReactNode[];
};

export const QuestModAuthoringGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('setup');

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const sections: GuideSection[] = [
    {
      id: 'tools',
      title: 'Tools, Install, Verify (No Guesswork)',
      icon: Wrench,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">What you need (minimum)</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li><strong>Fallout 4 + DLC</strong> installed and launching clean</li>
              <li><strong>Creation Kit</strong> (for quests, dialogue, scenes, lip generation)</li>
              <li><strong>xEdit (FO4Edit)</strong> for conflict checks, quick fixes, and sanity validation</li>
              <li><strong>Mod manager</strong> (MO2/Vortex) for predictable testing and clean profiles</li>
              <li><strong>Archive2</strong> (bundled with CK) if you ship BA2 archives</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">Where to get things (safe links)</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openUrl('https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-blue-700/40 rounded text-xs font-bold text-slate-200 flex items-center gap-2"
                title="Steam search for Creation Kit"
              >
                <ExternalLink className="w-4 h-4 text-blue-300" /> Steam: Creation Kit
              </button>
              <button
                onClick={() => openUrl('https://www.nexusmods.com/fallout4/search/?query=FO4Edit')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-blue-700/40 rounded text-xs font-bold text-slate-200 flex items-center gap-2"
                title="Nexus search for xEdit/FO4Edit"
              >
                <ExternalLink className="w-4 h-4 text-blue-300" /> Nexus: FO4Edit
              </button>
              <button
                onClick={() => openUrl('https://www.nexusmods.com/fallout4/search/?query=Buffout%204')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-blue-700/40 rounded text-xs font-bold text-slate-200 flex items-center gap-2"
                title="Nexus search for Buffout 4 (optional but strongly recommended)"
              >
                <ExternalLink className="w-4 h-4 text-blue-300" /> Nexus: Buffout 4
              </button>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed mt-3">
              Tip: If you’re unsure you installed something correctly, prefer <strong>search links</strong> over hard-coded URLs — pages move, searches don’t.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">Install & verify (fast checklist)</h4>
            <ul className="list-disc list-inside text-green-200 text-xs space-y-1">
              <li>Launch Fallout 4 once (so INI + registry paths exist)</li>
              <li>Launch Creation Kit → load <strong>Fallout4.esm</strong> only → save a tiny plugin</li>
              <li>In CK: confirm you can create a Quest record and set a stage without errors</li>
              <li>Launch FO4Edit → load your plugin → verify there are no missing masters</li>
              <li>If shipping audio: plan for <strong>XWM/FUZ + LIP</strong> (see the TTS/Audio page)</li>
            </ul>
          </div>

        </div>
      )
    },
    {
      id: 'overview',
      title: 'What Makes a Great Quest Mod?',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">📋 Definition</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              A quest mod adds new story-driven content to Fallout 4. It can be a simple fetch quest, a multi-stage main quest, or a branching narrative with custom characters, locations, and rewards.
            </p>
          </div>
          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">💡 Lore-Friendly Recommendation</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              For best player experience, keep your quest lore-friendly: respect Fallout's world, factions, and tone. Use existing lore as a foundation for your story, or clearly explain any creative departures.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'first-test',
      title: 'Minimal Working Quest (First Test Loop)',
      icon: Rocket,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">Goal</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              Get a tiny quest running end-to-end in under 15 minutes. This proves your CK setup, plugin loading, quest stages, and basic UI objective flow.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">Steps (recommended)</h4>
            <ol className="list-decimal list-inside text-green-200 text-xs space-y-1">
              <li>Create a new plugin in CK (ESL-flag later if you want; keep it simple now)</li>
              <li>Create a Quest: set <strong>Start Game Enabled</strong>, add Stage 10 + Stage 20</li>
              <li>On Stage 10: set an objective + display it (player sees something happened)</li>
              <li>Add a simple trigger: either a placed activator, or a dialogue topic that sets Stage 20</li>
              <li>In-game: new save → use a minimal test start (console-start if needed) → verify stage progression</li>
              <li>Open FO4Edit once to sanity-check records and masters before you build more</li>
            </ol>
          </div>

          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-2">If it fails (common causes)</h4>
            <ul className="list-disc list-inside text-orange-200 text-xs space-y-1">
              <li>Plugin not enabled / wrong profile in your mod manager</li>
              <li>Missing masters (FO4Edit will tell you immediately)</li>
              <li>Quest never starts (Start Game Enabled unchecked; no startup stage / no trigger)</li>
              <li>Objective doesn’t show (objective not displayed; wrong stage index)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'story',
      title: 'Story & Structure',
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">📝 Story Planning</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Define the quest's main goal and motivation</li>
              <li>Break story into logical stages (start, middle, end)</li>
              <li>Decide on branching paths or choices</li>
              <li>Write a summary of the quest for your README</li>
            </ul>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">Lore-Friendly Tips</h4>
            <ul className="list-disc list-inside text-blue-200 text-xs space-y-1">
              <li>Use existing factions, locations, and events as anchors</li>
              <li>Keep dialogue and objectives consistent with Fallout's tone</li>
              <li>Reference in-game history, but avoid contradicting canon</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'objectives',
      title: 'Objectives & Stages',
      icon: Star,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">🎯 Quest Objectives</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Define clear objectives for each quest stage</li>
              <li>Use quest markers to guide the player</li>
              <li>Set up conditions for stage completion</li>
              <li>Test for fail states and alternate outcomes</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'dialogue',
      title: 'Dialogue & Scenes',
      icon: MessageCircle,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">💬 Dialogue Implementation</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Write all dialogue for each stage and branch</li>
              <li>Use voice acting or silent subtitles (lore-friendly voice is best)</li>
              <li>Set up scenes for important conversations</li>
              <li>Test for lip sync and camera angles</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'scripting',
      title: 'Scripting & Logic',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">⚙️ Papyrus Scripting</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Use scripts to control quest flow, triggers, and outcomes</li>
              <li>Handle player choices and consequences</li>
              <li>Debug with Papyrus logging and in-game testing</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'world',
      title: 'World Integration',
      icon: Map,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">🌎 Integrating Into the World</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Place quest givers and objectives in logical locations</li>
              <li>Use map markers and fast travel points</li>
              <li>Integrate with existing world events and factions</li>
              <li>Test for conflicts with other mods</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'npcs',
      title: 'NPCs & Factions',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">👥 Custom NPCs & Faction Use</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Create memorable, lore-friendly NPCs</li>
              <li>Assign appropriate factions and AI packages</li>
              <li>Balance new factions with existing ones</li>
              <li>Test for AI bugs and dialogue triggers</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'rewards',
      title: 'Rewards & Endings',
      icon: Star,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">🏆 Rewards & Endings</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Offer meaningful, lore-friendly rewards (gear, caps, perks, etc.)</li>
              <li>Provide multiple endings if possible</li>
              <li>Show consequences for player choices</li>
              <li>Document all possible outcomes in your README</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'testing',
      title: 'Testing & Polish',
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">🧪 Testing Checklist</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Test every quest stage and branch</li>
              <li>Check for bugs, dead ends, and logic errors</li>
              <li>Playtest with other popular mods installed</li>
              <li>Ask others to beta test and provide feedback</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'docs',
      title: 'Documentation & Release',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">📄 Documentation</h4>
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
              <li>Write a README with quest summary, features, and known issues</li>
              <li>Document all custom assets, scripts, and credits</li>
              <li>Provide installation and compatibility notes</li>
              <li>Encourage user feedback and bug reports</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'pitfalls',
      title: 'Common Pitfalls & Warnings',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-2">⚠️ Common Pitfalls</h4>
            <ul className="list-disc list-inside text-orange-200 text-xs space-y-1">
              <li>Breaking lore or contradicting canon</li>
              <li>Unclear objectives or missing quest markers</li>
              <li>Unvoiced dialogue with no subtitles</li>
              <li>Unbalanced rewards or overpowered items</li>
              <li>Unfinished branches or dead ends</li>
              <li>Not testing with other mods</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const sectionById = (id: string) => sections.find((section) => section.id === id);

  const renderSectionBlock = (id: string) => {
    const section = sectionById(id);
    if (!section) return null;
    const Icon = section.icon;

    return (
      <div key={section.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-700">
          <Icon className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white text-lg">{section.title}</h3>
        </div>
        <div className="px-5 py-4">
          {section.content}
        </div>
      </div>
    );
  };

  const hubSteps: HubStep[] = [
    {
      id: 'setup',
      title: 'Setup & First Test Loop',
      description: 'Install the CK toolchain and prove the smallest quest runs end-to-end.',
      sectionIds: ['tools', 'first-test'],
    },
    {
      id: 'design',
      title: 'Quest Design & Structure',
      description: 'Plan the story, objectives, and stage flow before you script.',
      sectionIds: ['overview', 'story', 'objectives'],
    },
    {
      id: 'ck',
      title: 'CK Quest & Dialogue Build',
      description: 'Build the quest skeleton, dialogue, and minimal test line inside CK.',
      sectionIds: ['dialogue'],
      blocks: [
        <CKQuestDialogueWizard key="ck-quest-dialogue" embedded />,
      ],
    },
    {
      id: 'scripting',
      title: 'Scripting & Logic',
      description: 'Implement Papyrus logic and debug with clean, repeatable tests.',
      sectionIds: ['scripting'],
    },
    {
      id: 'world',
      title: 'World Integration',
      description: 'Place NPCs, objectives, rewards, and ensure lore-friendly placement.',
      sectionIds: ['world', 'npcs', 'rewards'],
    },
    {
      id: 'leveled-lists',
      title: 'Leveled Lists & Injection',
      description: 'Safely inject items/NPCs without load-order conflicts.',
      blocks: [
        <LeveledListInjectionGuide key="leveled-lists" embedded />,
      ],
    },
    {
      id: 'precombines',
      title: 'Precombines & PRP',
      description: 'If you touched exterior cells, rebuild and verify precombines.',
      blocks: [
        <PrecombineAndPRPGuide key="prp-guide" embedded />,
        <PrecombineChecker key="prp-checker" embedded />,
      ],
    },
    {
      id: 'release',
      title: 'Testing & Release',
      description: 'Stabilize, document, and ship with fewer surprises.',
      sectionIds: ['testing', 'docs', 'pitfalls'],
    },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Creation Kit Hub (All-in-One)</h1>
              <p className="text-sm text-slate-400">Quest authoring, CK workflows, leveled lists, and precombines in one ordered flow</p>
            </div>
          </div>
          <Link
            to="/reference"
            className="px-3 py-2 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-200 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            Help
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {hubSteps.map((step, index) => {
            const isExpanded = expandedSection === step.id;

            return (
              <div
                key={step.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? '' : step.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded border border-blue-500/30 text-blue-200">
                      Step {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{step.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 py-5 border-t border-slate-700 space-y-4">
                    {step.sectionIds?.map(renderSectionBlock)}

                    {step.blocks && step.blocks.length > 0 && (
                      <div className="space-y-4">
                        {step.blocks.map((block, blockIndex) => (
                          <div key={`${step.id}-block-${blockIndex}`}>
                            {block}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-blue-900/20 border-t border-slate-700">
        <p className="text-xs text-blue-300 text-center">
          💡 Tip: Plan your quest, keep it lore-friendly, and test every branch before release!
        </p>
      </div>
    </div>
  );
};
