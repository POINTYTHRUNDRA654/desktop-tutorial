import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, AlertTriangle, CheckCircle2, MessageCircle, Map, Users, Settings, Star, FileText } from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export const QuestModAuthoringGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  const sections: GuideSection[] = [
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

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Quest Mod Authoring Guide</h1>
            <p className="text-sm text-slate-400">Everything you need to build a lore-friendly Fallout 4 quest mod</p>
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
                    <Icon className="w-5 h-5 text-blue-400" />
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
      <div className="p-4 bg-blue-900/20 border-t border-slate-700">
        <p className="text-xs text-blue-300 text-center">
          💡 Tip: Plan your quest, keep it lore-friendly, and test every branch before release!
        </p>
      </div>
    </div>
  );
};
