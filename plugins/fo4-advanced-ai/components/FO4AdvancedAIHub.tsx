import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, GitBranch, Zap, Bug, Cpu, Shield,
  ChevronRight, Star, Activity, AlertTriangle, ExternalLink
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'companion-ai',
    route: '/companion-ai',
    icon: User,
    color: 'emerald',
    title: 'Companion AI Designer',
    description: 'Build advanced human/synth companions with personality matrices, affinity systems, dialogue trees, and Papyrus export.',
    features: ['Personality Sliders (6 ActorValues)', 'Dynamic Dialogue + AI Generation', 'Affinity Threshold System', 'Combat Behavior Config', 'Papyrus .psc Export'],
    badge: 'Companion',
  },
  {
    id: 'npc-behavior',
    route: '/npc-behavior-forge',
    icon: GitBranch,
    color: 'amber',
    title: 'NPC & Creature Behavior Forge',
    description: 'Full AI behavior system for all Fallout 4 entity types — humanoids, creatures, robots, synths, mutants, and undead.',
    features: [
      '9 Preset Entities (Deathclaw, Courser, Behemoth...)',
      '6 Entity Categories',
      'Detection System (Sight, Hearing, Stealth)',
      'Patrol & Daily Schedule Packages',
      'Faction Logic & Relations',
      'Papyrus .psc Export',
    ],
    badge: 'All Entities',
  },
];

const ENTITY_TYPES = [
  { label: 'Humanoids',  desc: 'Raiders, Settlers, Gunners, BoS, Minutemen',    color: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/20',   icon: User },
  { label: 'Creatures',  desc: 'Deathclaw, Radscorpion, Mirelurk, Bloatfly',   color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/20',  icon: Bug },
  { label: 'Robots',     desc: 'Assaultron, Sentry Bot, Protectron, Eyebot',   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',   icon: Cpu },
  { label: 'Synths',     desc: 'Gen 1, Gen 2, Coursers, Synth Striders',       color: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/20', icon: Zap },
  { label: 'Mutants',    desc: 'Super Mutants, Behemoths, Mutant Hounds',       color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/20', icon: Shield },
  { label: 'Undead',     desc: 'Feral Ghouls, Glowing Ones, Bloated Ghouls',   color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/20',    icon: AlertTriangle },
];

const STATS = [
  { label: 'Entity Presets',    value: '9',   sub: 'Ready to use' },
  { label: 'Entity Categories', value: '6',   sub: 'Full coverage' },
  { label: 'AI Parameters',     value: '30+', sub: 'Configurable' },
  { label: 'Script Exports',    value: '2',   sub: 'Papyrus .psc' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const FO4AdvancedAIHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#050910] text-slate-200 overflow-y-auto">
      {/* Hero Header */}
      <div className="relative px-8 pt-10 pb-8 border-b border-slate-800 overflow-hidden flex-shrink-0">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-transparent to-amber-950/20 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/10 border border-emerald-500/20">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-mono font-bold text-slate-100">FO4 Advanced AI</h1>
                  <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 uppercase tracking-wider">Plugin</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Mossy AI Assistant — Fallout 4 AI System Designer</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              Advanced AI configuration for <span className="text-emerald-400">every entity type</span> in Fallout 4.
              Design companion personalities, creature behaviors, combat AI, detection systems, and export directly to Papyrus scripts.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0 ml-8">
            {STATS.map(s => (
              <div key={s.label} className="px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/40 text-center min-w-[90px]">
                <div className="text-xl font-mono font-bold text-emerald-400">{s.value}</div>
                <div className="text-[10px] font-mono text-slate-400">{s.label}</div>
                <div className="text-[9px] text-slate-600">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-8">
        {/* Tool Cards */}
        <div>
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Tools</h2>
          <div className="grid grid-cols-2 gap-4">
            {TOOLS.map(tool => {
              const Icon = tool.icon;
              const isEmerald = tool.color === 'emerald';
              const accent = isEmerald
                ? { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/40 hover:bg-emerald-500/5' }
                : { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   hover: 'hover:border-amber-500/40 hover:bg-amber-500/5' };

              return (
                <button
                  key={tool.id}
                  onClick={() => navigate(tool.route)}
                  className={`group text-left p-5 rounded-xl border ${accent.border} ${accent.hover}
                              bg-slate-900/40 transition-all duration-200 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${accent.bg} border ${accent.border}`}>
                      <Icon className={`w-5 h-5 ${accent.text}`} />
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-mono ${accent.bg} border ${accent.border} rounded ${accent.text} uppercase tracking-wider`}>
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className={`text-sm font-mono font-semibold ${accent.text} mb-1.5`}>{tool.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{tool.description}</p>

                  <ul className="space-y-1 mb-4">
                    {tool.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Star className={`w-2.5 h-2.5 ${accent.text} flex-shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className={`flex items-center gap-1 text-xs font-mono ${accent.text}
                                   opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Open Tool <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entity Coverage */}
        <div>
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Entity Coverage</h2>
          <div className="grid grid-cols-3 gap-3">
            {ENTITY_TYPES.map(et => {
              const Icon = et.icon;
              return (
                <div key={et.label} className={`p-4 rounded-lg border ${et.border} ${et.bg}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${et.color}`} />
                    <span className={`text-xs font-mono font-semibold ${et.color}`}>{et.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{et.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow Guide */}
        <div className="p-5 rounded-xl border border-slate-700/40 bg-slate-900/30">
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Workflow</h2>
          <div className="flex items-start gap-0">
            {[
              { n: '1', title: 'Choose Entity Type',      desc: 'Select category: companion, creature, robot, synth, mutant, or undead' },
              { n: '2', title: 'Load a Preset or Build',  desc: 'Start from a preset (Deathclaw, Courser, etc.) or build from scratch' },
              { n: '3', title: 'Configure AI Parameters', desc: 'Set combat style, detection radii, patrol packages, faction relations' },
              { n: '4', title: 'Export Papyrus Script',   desc: 'Download the generated .psc file and compile it with FO4 CK or F4SE' },
            ].map((step, i, arr) => (
              <React.Fragment key={step.n}>
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center
                                  text-xs font-mono text-emerald-400 font-bold mb-2">
                    {step.n}
                  </div>
                  <p className="text-xs font-mono text-slate-300 mb-1">{step.title}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-[140px]">{step.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center pt-3 px-1 text-slate-700">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 pb-6">
          <a href="https://www.nexusmods.com/fallout4" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> Nexus Mods
          </a>
          <a href="https://www.creationkit.com/fallout4/index.php" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> Creation Kit Wiki
          </a>
          <a href="https://f4se.silverlock.org/" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> F4SE
          </a>
        </div>
      </div>
    </div>
  );
};

export default FO4AdvancedAIHub;
