import React, { useState, useCallback } from 'react';
import {
  Cpu, GitBranch, Crosshair, Map, Users, Bug, Shield,
  ChevronDown, ChevronRight, Zap, Download, RotateCcw,
  Eye, Activity, Layers, AlertTriangle, Code, Play, Save
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EntityCategory =
  | 'humanoid'   // Raiders, Settlers, Gunners, BoS
  | 'creature'   // Deathclaw, Mirelurk, Radscorpion, Bloatfly, etc.
  | 'robot'      // Assaultron, Protectron, Sentry Bot, Eyebot
  | 'synth'      // Gen 1, Gen 2, Gen 3 (Coursers)
  | 'mutant'     // Super Mutants, Behemoths
  | 'undead';    // Feral Ghouls, Glowing Ones

interface CombatStyle {
  approachType: 'charge' | 'flank' | 'ranged' | 'ambush' | 'swarm' | 'berserker';
  aggressionLevel: number;      // 0-100
  attackPatterns: string[];
  specialAbilities: string[];
  fleeThreshold: number;        // % hp
  groupTactics: boolean;
  packBehavior: boolean;        // For creatures
  ambushReady: boolean;
}

interface DetectionSystem {
  sightRadius: number;
  hearingRadius: number;
  alertDelay: number;          // seconds before fully alerted
  investigatesNoise: boolean;
  remembersThreat: boolean;    // stays alert after losing sight
  alertState: 'normal' | 'suspicious' | 'searching' | 'combat';
  nightVision: boolean;
  detectStealth: number;       // 0-100 difficulty to sneak past
}

interface PatrolPackage {
  type: 'sandbox' | 'patrol' | 'guard' | 'wander' | 'flee' | 'hunt';
  radius: number;
  schedule: { time: string; package: string }[];
  activationConditions: string[];
}

interface FactionLogic {
  primaryFaction: string;
  allied: string[];
  hostile: string[];
  neutral: string[];
  factionResponseOnAttack: 'retaliate' | 'flee' | 'call_backup' | 'surrender';
  crimeResponse: boolean;
}

interface EntityAIProfile {
  name: string;
  category: EntityCategory;
  level: number;
  combat: CombatStyle;
  detection: DetectionSystem;
  patrol: PatrolPackage;
  faction: FactionLogic;
  lootTable: string[];
  deathBehavior: 'normal' | 'explode' | 'ragdoll' | 'dissolve' | 'frenzy_allies';
}

// ─────────────────────────────────────────────────────────────────────────────
// Creature & Entity Database
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_PRESETS: Record<string, Partial<EntityAIProfile>> = {
  Deathclaw: {
    category: 'creature',
    combat: {
      approachType: 'charge', aggressionLevel: 95,
      attackPatterns: ['Claw Swipe', 'Gore', 'Tail Whip', 'Leap Attack'],
      specialAbilities: ['Berserk Rage (<30% HP)', 'Rock Throw', 'Burrow (Albino)'],
      fleeThreshold: 5, groupTactics: false, packBehavior: false, ambushReady: true,
    },
    detection: { sightRadius: 4000, hearingRadius: 2000, alertDelay: 0.5, investigatesNoise: false, remembersThreat: true, alertState: 'normal', nightVision: true, detectStealth: 85 },
    deathBehavior: 'ragdoll',
  },
  'Mirelurk Queen': {
    category: 'creature',
    combat: {
      approachType: 'charge', aggressionLevel: 90,
      attackPatterns: ['Claw Strike', 'Acid Spit', 'Spawn Hatchlings', 'Shell Slam'],
      specialAbilities: ['Spawn Wave (3x hatchlings)', 'Acid Cloud', 'Charge'],
      fleeThreshold: 10, groupTactics: true, packBehavior: true, ambushReady: false,
    },
    detection: { sightRadius: 3000, hearingRadius: 2500, alertDelay: 1, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: false, detectStealth: 60 },
    deathBehavior: 'normal',
  },
  Radscorpion: {
    category: 'creature',
    combat: {
      approachType: 'ambush', aggressionLevel: 80,
      attackPatterns: ['Claw Pinch', 'Tail Sting (Paralyze)', 'Burrow', 'Venomous Strike'],
      specialAbilities: ['Burrow Ambush', 'Paralytic Venom', 'Predatory Crouch'],
      fleeThreshold: 15, groupTactics: false, packBehavior: true, ambushReady: true,
    },
    detection: { sightRadius: 2000, hearingRadius: 3000, alertDelay: 2, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: true, detectStealth: 70 },
    deathBehavior: 'ragdoll',
  },
  'Bloatfly': {
    category: 'creature',
    combat: {
      approachType: 'swarm', aggressionLevel: 60,
      attackPatterns: ['Larva Spit', 'Ram', 'Swarm Rush'],
      specialAbilities: ['Swarm Behavior', 'Exploding Larva', 'Erratic Flight Pattern'],
      fleeThreshold: 30, groupTactics: true, packBehavior: true, ambushReady: false,
    },
    detection: { sightRadius: 1500, hearingRadius: 800, alertDelay: 0.5, investigatesNoise: false, remembersThreat: false, alertState: 'normal', nightVision: false, detectStealth: 30 },
    deathBehavior: 'explode',
  },
  'Synth Courser': {
    category: 'synth',
    combat: {
      approachType: 'flank', aggressionLevel: 88,
      attackPatterns: ['Pistol Burst', 'Melee Strike', 'Teleport Rush', 'Suppressive Fire'],
      specialAbilities: ['Institute Teleport', 'Stim Self-Heal', 'Call Reinforcements'],
      fleeThreshold: 0, groupTactics: true, packBehavior: false, ambushReady: true,
    },
    detection: { sightRadius: 3500, hearingRadius: 2500, alertDelay: 0.3, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: true, detectStealth: 90 },
    deathBehavior: 'normal',
  },
  'Super Mutant Behemoth': {
    category: 'mutant',
    combat: {
      approachType: 'berserker', aggressionLevel: 100,
      attackPatterns: ['Ground Slam', 'Hurl Object', 'Charge', 'Stomp'],
      specialAbilities: ['Seismic Slam (AoE)', 'Debris Throw', 'War Cry (Rally Mutants)'],
      fleeThreshold: 0, groupTactics: false, packBehavior: false, ambushReady: false,
    },
    detection: { sightRadius: 5000, hearingRadius: 3000, alertDelay: 0.2, investigatesNoise: false, remembersThreat: true, alertState: 'normal', nightVision: false, detectStealth: 95 },
    deathBehavior: 'ragdoll',
  },
  Assaultron: {
    category: 'robot',
    combat: {
      approachType: 'charge', aggressionLevel: 85,
      attackPatterns: ['Head Laser (Charge)', 'Claw Slash', 'Electromagnetic Pulse', 'Self-Destruct Warning'],
      specialAbilities: ['Head Laser (Destroy Limbs)', 'Stealth Field', 'Plasma Blade'],
      fleeThreshold: 0, groupTactics: true, packBehavior: false, ambushReady: true,
    },
    detection: { sightRadius: 3000, hearingRadius: 2000, alertDelay: 0.4, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: true, detectStealth: 75 },
    deathBehavior: 'explode',
  },
  'Feral Ghoul': {
    category: 'undead',
    combat: {
      approachType: 'swarm', aggressionLevel: 85,
      attackPatterns: ['Frenzied Claw', 'Bite', 'Charge Rush', 'Glowing Radiation Burst'],
      specialAbilities: ['Radiation Resistance', 'Frenzy (on near-death)', 'Glowing One Buff Pulse'],
      fleeThreshold: 0, groupTactics: true, packBehavior: true, ambushReady: false,
    },
    detection: { sightRadius: 1800, hearingRadius: 2200, alertDelay: 0.8, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: true, detectStealth: 40 },
    deathBehavior: 'normal',
  },
  Raider: {
    category: 'humanoid',
    combat: {
      approachType: 'flank', aggressionLevel: 70,
      attackPatterns: ['Suppressive Fire', 'Rush', 'Grenade Toss', 'Take Cover'],
      specialAbilities: ['Call for Backup', 'Drug Use (Psycho)', 'Intimidation Bark'],
      fleeThreshold: 25, groupTactics: true, packBehavior: false, ambushReady: true,
    },
    detection: { sightRadius: 2500, hearingRadius: 2000, alertDelay: 1.5, investigatesNoise: true, remembersThreat: true, alertState: 'normal', nightVision: false, detectStealth: 50 },
    deathBehavior: 'ragdoll',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default profile
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: EntityAIProfile = {
  name: 'CustomEntity',
  category: 'humanoid',
  level: 20,
  combat: {
    approachType: 'flank',
    aggressionLevel: 65,
    attackPatterns: ['Primary Attack', 'Secondary Attack'],
    specialAbilities: [],
    fleeThreshold: 20,
    groupTactics: true,
    packBehavior: false,
    ambushReady: false,
  },
  detection: {
    sightRadius: 2500,
    hearingRadius: 1800,
    alertDelay: 1.5,
    investigatesNoise: true,
    remembersThreat: true,
    alertState: 'normal',
    nightVision: false,
    detectStealth: 50,
  },
  patrol: {
    type: 'sandbox',
    radius: 1024,
    schedule: [
      { time: '08:00', package: 'Sandbox — patrol base perimeter' },
      { time: '20:00', package: 'Sleep — find nearest bed' },
    ],
    activationConditions: ['OnCombatStart', 'OnAlarm'],
  },
  faction: {
    primaryFaction: 'CustomFaction',
    allied: [],
    hostile: ['PlayerFaction'],
    neutral: [],
    factionResponseOnAttack: 'retaliate',
    crimeResponse: false,
  },
  lootTable: ['CommonAmmo', 'CommonWeapon', 'Caps'],
  deathBehavior: 'ragdoll',
};

// ─────────────────────────────────────────────────────────────────────────────
// Papyrus generator
// ─────────────────────────────────────────────────────────────────────────────

function generateEntityScript(p: EntityAIProfile): string {
  return `; ─────────────────────────────────────────────────────────────────────────
; ${p.name} Entity AI Script — Generated by Mossy FO4 Advanced AI Plugin
; Category: ${p.category.toUpperCase()} | Level: ${p.level}
; ─────────────────────────────────────────────────────────────────────────
Scriptname ${p.name}EntityAIScript extends Actor

; ── Detection Properties ────────────────────────────────────────────────────
float Property SightRadius    = ${p.detection.sightRadius}.0 Auto
float Property HearingRadius  = ${p.detection.hearingRadius}.0 Auto
float Property AlertDelay     = ${p.detection.alertDelay} Auto
bool  Property HasNightVision = ${p.detection.nightVision} Auto
float Property StealthDifficulty = ${p.detection.detectStealth / 100.0} Auto

; ── Combat Properties ───────────────────────────────────────────────────────
float Property AggressionLevel  = ${p.combat.aggressionLevel / 100.0} Auto
float Property FleeThresholdPct = ${p.combat.fleeThreshold / 100.0} Auto
bool  Property GroupTactics     = ${p.combat.groupTactics} Auto
bool  Property PackBehavior     = ${p.combat.packBehavior} Auto
bool  Property AmbushReady      = ${p.combat.ambushReady} Auto

; ── State Tracking ──────────────────────────────────────────────────────────
int _alertState = 0    ; 0=Normal 1=Suspicious 2=Searching 3=Combat
Actor _currentTarget = None
float _alertTimer = 0.0

; ── Initialization ──────────────────────────────────────────────────────────
Event OnInit()
  RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
  RegisterForUpdateGameTime(AlertDelay)
  ApplyPersonalityAV()
  ${p.combat.ambushReady ? 'PrepareAmbush()' : '; No ambush setup required'}
EndEvent

Function ApplyPersonalityAV()
  ; Set actor value overrides from profile
  ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
  ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
  Self.SetValue(avAggr, AggressionLevel * 100.0)
  Self.SetValue(avConf, ${(100 - p.combat.fleeThreshold) / 100.0} * 100.0)
EndFunction

${p.combat.ambushReady ? `
Function PrepareAmbush()
  ; Entity enters stealth/crouch state until player enters detection radius
  Self.SetRestrained(True)
  Self.SetCriticalStage(0)
  Debug.Notification("[${p.name}] Ambush posture active")
EndFunction
` : ''}

; ── Detection System ────────────────────────────────────────────────────────
Event OnSneakStateBegin(Actor akTarget, int aiDetectionLevel)
  If akTarget == Game.GetPlayer()
    HandleDetectionEscalation(aiDetectionLevel)
  EndIf
EndEvent

Function HandleDetectionEscalation(int level)
  If level >= 75 && _alertState < 3
    _alertState = 3
    Self.StartCombat(Game.GetPlayer())
    ${p.combat.ambushReady ? 'Self.SetRestrained(False)' : ''}
    ${p.combat.groupTactics ? `AlertNearbyAllies(SightRadius)` : ''}
  ElseIf level >= 40 && _alertState < 2
    _alertState = 2
    InvestigateLastKnownPosition()
  ElseIf level >= 10 && _alertState < 1
    _alertState = 1
    Debug.Notification("[${p.name}] Suspicious...")
  EndIf
EndFunction

${p.combat.groupTactics ? `
Function AlertNearbyAllies(float radius)
  Actor[] allies = Self.GetActorsInRange(radius, 10)
  Int i = 0
  While i < allies.Length
    If allies[i] != None && !allies[i].IsInCombat()
      allies[i].StartCombat(Game.GetPlayer())
    EndIf
    i += 1
  EndWhile
EndFunction
` : ''}

${p.detection.investigatesNoise ? `
Function InvestigateLastKnownPosition()
  ; Move to last known player position
  Self.SetRestrained(False)
  Game.GetPlayer().GetLinkedRef()  ; investigate trigger
  Debug.Notification("[${p.name}] Investigating noise...")
EndFunction
` : ''}

; ── Combat Events ────────────────────────────────────────────────────────────
Event OnCombatStateChanged(int aeCombatState)
  If aeCombatState == 1
    _alertState = 3
    HandleCombatEntry()
  ElseIf aeCombatState == 0
    HandleCombatExit()
    ${p.detection.remembersThreat ? '_alertState = 2 ; Remain searching' : '_alertState = 0 ; Return to normal'}
  EndIf
EndEvent

Function HandleCombatEntry()
  ; Approach type: ${p.combat.approachType}
${p.combat.approachType === 'charge' ? '  Self.SetValue(Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue, 100)' : ''}
${p.combat.approachType === 'ambush' ? '  ; Maintain stealth until optimal strike range' : ''}
${p.combat.approachType === 'swarm'  ? `  AlertNearbyAllies(${p.detection.hearingRadius})` : ''}
${p.combat.approachType === 'ranged' ? '  ; Prefer ranged attack packages — hang back' : ''}
${p.combat.approachType === 'flank'  ? '  ; Activate flank AI package — circle target' : ''}
  EvaluatePackage()
EndFunction

Function HandleCombatExit()
  Float maxHP = Self.GetBaseValue(Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue)
  Float curHP = Self.GetValue(Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue)
  If (curHP / maxHP) < FleeThresholdPct && FleeThresholdPct > 0
    Debug.Notification("[${p.name}] Fleeing — health critical")
    ; Trigger flee package
  EndIf
EndFunction

${p.combat.specialAbilities.map(ab => `
; Special Ability: ${ab}
; TODO: Implement ${ab} trigger condition and effect
`).join('')}

; ── Death Behavior: ${p.deathBehavior} ─────────────────────────────────────
${p.deathBehavior === 'explode' ? `
Event OnDeath(Actor akKiller)
  Explosion kExplosion = Game.GetFormFromFile(0x00060B3F, "Fallout4.esm") as Explosion
  Self.PlaceAtMe(kExplosion)
EndEvent
` : ''}
${p.deathBehavior === 'frenzy_allies' ? `
Event OnDeath(Actor akKiller)
  AlertNearbyAllies(SightRadius * 1.5)
  Debug.Notification("[${p.name}] Death cry — rallying allies!")
EndEvent
` : ''}

; ── Patrol Package: ${p.patrol.type} ────────────────────────────────────────
; Radius: ${p.patrol.radius} units
${p.patrol.schedule.map(s => `; ${s.time} → ${s.package}`).join('\n')}
; Activation: ${p.patrol.activationConditions.join(', ')}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, icon, children, defaultOpen = true
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">{icon} {title}</div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 bg-slate-900/40 space-y-3">{children}</div>}
    </div>
  );
};

const CategoryBadge: React.FC<{ category: EntityCategory }> = ({ category }) => {
  const styles: Record<EntityCategory, string> = {
    humanoid: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    creature:  'text-green-400 bg-green-500/10 border-green-500/20',
    robot:     'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    synth:     'text-purple-400 bg-purple-500/10 border-purple-500/20',
    mutant:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
    undead:    'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-mono rounded border uppercase tracking-wider ${styles[category]}`}>
      {category}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const NPCBehaviorForge: React.FC = () => {
  const [profile, setProfile] = useState<EntityAIProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<'identity' | 'combat' | 'detection' | 'patrol' | 'faction' | 'export'>('identity');
  const [generatedScript, setGeneratedScript] = useState('');
  const [newAttack, setNewAttack] = useState('');
  const [newAbility, setNewAbility] = useState('');

  const applyPreset = useCallback((name: string) => {
    const preset = ENTITY_PRESETS[name];
    if (!preset) return;
    setProfile(p => ({
      ...p,
      ...preset,
      name,
      combat: { ...p.combat, ...(preset.combat ?? {}) },
      detection: { ...p.detection, ...(preset.detection ?? {}) },
    }));
  }, []);

  const updateCombat = <K extends keyof CombatStyle>(key: K, val: CombatStyle[K]) =>
    setProfile(p => ({ ...p, combat: { ...p.combat, [key]: val } }));

  const updateDetection = <K extends keyof DetectionSystem>(key: K, val: DetectionSystem[K]) =>
    setProfile(p => ({ ...p, detection: { ...p.detection, [key]: val } }));

  const updatePatrol = <K extends keyof PatrolPackage>(key: K, val: PatrolPackage[K]) =>
    setProfile(p => ({ ...p, patrol: { ...p.patrol, [key]: val } }));

  const updateFaction = <K extends keyof FactionLogic>(key: K, val: FactionLogic[K]) =>
    setProfile(p => ({ ...p, faction: { ...p.faction, [key]: val } }));

  const generateScript = () => {
    setGeneratedScript(generateEntityScript(profile));
    setActiveTab('export');
  };

  const APPROACH_TYPES = ['charge', 'flank', 'ranged', 'ambush', 'swarm', 'berserker'] as const;
  const PATROL_TYPES = ['sandbox', 'patrol', 'guard', 'wander', 'flee', 'hunt'] as const;
  const DEATH_BEHAVIORS = ['normal', 'explode', 'ragdoll', 'dissolve', 'frenzy_allies'] as const;
  const FACTION_RESPONSES = ['retaliate', 'flee', 'call_backup', 'surrender'] as const;
  const CATEGORIES: EntityCategory[] = ['humanoid', 'creature', 'robot', 'synth', 'mutant', 'undead'];

  const tabs = [
    { id: 'identity',  label: 'Identity',  icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'combat',    label: 'Combat',    icon: <Crosshair className="w-3.5 h-3.5" /> },
    { id: 'detection', label: 'Detection', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'patrol',    label: 'Patrol',    icon: <Map className="w-3.5 h-3.5" /> },
    { id: 'faction',   label: 'Faction',   icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'export',    label: 'Export',    icon: <Code className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#050910] text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <GitBranch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-mono font-semibold text-slate-100">NPC & Creature Behavior Forge</h1>
            <p className="text-xs text-slate-500">Full AI system for all Fallout 4 entity types</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfile(DEFAULT_PROFILE)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-700 rounded-md
                       text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={generateScript}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-amber-500/10
                       border border-amber-500/30 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Download className="w-3 h-3" /> Export Papyrus
          </button>
        </div>
      </div>

      {/* Preset Quick-Load */}
      <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/20 flex-shrink-0">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Load Preset</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(ENTITY_PRESETS).map(name => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded-md border transition-colors
                ${profile.name === name
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-slate-800/60">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-t transition-colors
              ${activeTab === tab.id
                ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/5'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* IDENTITY TAB */}
        {activeTab === 'identity' && (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">Entity Name</label>
                <input
                  type="text" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50
                             rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">Level</label>
                <input
                  type="number" min={1} max={100} value={profile.level}
                  onChange={e => setProfile(p => ({ ...p, level: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50
                             rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">Death Behavior</label>
                <select
                  value={profile.deathBehavior}
                  onChange={e => setProfile(p => ({ ...p, deathBehavior: e.target.value as typeof profile.deathBehavior }))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50
                             rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  {DEATH_BEHAVIORS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Entity Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProfile(p => ({ ...p, category: cat }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors
                      ${profile.category === cat
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-500'}`}
                  >
                    <CategoryBadge category={cat} />
                  </button>
                ))}
              </div>
            </div>

            {/* Category-specific info */}
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs font-mono text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {profile.category === 'creature'  && 'Creature AI: Natural instincts, pack behavior, special attacks'}
                {profile.category === 'robot'     && 'Robot AI: No fear, 100% aggression until destroyed, EMP vulnerability'}
                {profile.category === 'synth'     && 'Synth AI: Institute protocols, teleport capability, self-repair'}
                {profile.category === 'mutant'    && 'Mutant AI: High aggression, rally nearby mutants, radiation immunity'}
                {profile.category === 'undead'    && 'Undead AI: Frenzy on damage, radiation aura (Glowing), swarm behavior'}
                {profile.category === 'humanoid'  && 'Humanoid AI: Tactics, cover, faction loyalty, morale system'}
              </p>
              <p className="text-[10px] text-slate-400">
                Category determines base ActorValue overrides, death behavior defaults, and available special ability slots in Papyrus.
              </p>
            </div>
          </div>
        )}

        {/* COMBAT TAB */}
        {activeTab === 'combat' && (
          <div className="max-w-2xl space-y-4">
            <Section title="Approach Type" icon={<Crosshair className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-3 gap-2">
                {APPROACH_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => updateCombat('approachType', t)}
                    className={`px-3 py-2 text-xs font-mono rounded-md border capitalize transition-colors
                      ${profile.combat.approachType === t
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-500'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 p-2 rounded bg-slate-800/40">
                {profile.combat.approachType === 'charge'    && 'Rush directly at target — max aggression, ignore cover'}
                {profile.combat.approachType === 'flank'     && 'Circle target, use cover, attack from sides and rear'}
                {profile.combat.approachType === 'ranged'    && 'Maintain distance, suppressive fire, retreat if closed'}
                {profile.combat.approachType === 'ambush'    && 'Remain hidden/still until target enters range, then strike'}
                {profile.combat.approachType === 'swarm'     && 'Multiple entities overwhelm target simultaneously'}
                {profile.combat.approachType === 'berserker' && 'Ignore damage, never flee, maximum damage output'}
              </div>
            </Section>

            <Section title="Combat Parameters" icon={<Activity className="w-3.5 h-3.5" />}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-mono text-slate-300">Aggression Level</span>
                    <span className="text-xs font-mono text-amber-400">{profile.combat.aggressionLevel}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={profile.combat.aggressionLevel}
                    onChange={e => updateCombat('aggressionLevel', parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-amber-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-mono text-slate-300">Flee Health Threshold</span>
                    <span className="text-xs font-mono text-amber-400">
                      {profile.combat.fleeThreshold === 0 ? 'Never' : `${profile.combat.fleeThreshold}%`}
                    </span>
                  </div>
                  <input type="range" min={0} max={75} value={profile.combat.fleeThreshold}
                    onChange={e => updateCombat('fleeThreshold', parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'groupTactics', label: 'Group Tactics', desc: 'Coordinate with allies' },
                    { key: 'packBehavior', label: 'Pack Behavior',  desc: 'Alert group when aggro' },
                    { key: 'ambushReady',  label: 'Ambush Ready',   desc: 'Start in stealth posture' },
                  ].map(flag => (
                    <label key={flag.key} className="flex flex-col gap-1 cursor-pointer p-2.5 rounded-lg border border-slate-700/40 hover:border-slate-600 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors
                          ${(profile.combat[flag.key as keyof CombatStyle] as boolean)
                            ? 'border-amber-500 bg-amber-500' : 'border-slate-600 bg-slate-800'}`}
                          onClick={() => updateCombat(flag.key as keyof CombatStyle, !(profile.combat[flag.key as keyof CombatStyle]) as never)}
                        />
                        <span className="text-[10px] font-mono text-slate-300">{flag.label}</span>
                      </div>
                      <span className="text-[9px] text-slate-500">{flag.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Attack Patterns" icon={<Layers className="w-3.5 h-3.5" />}>
              <div className="space-y-2">
                {profile.combat.attackPatterns.map((atk, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-slate-800/60 border border-slate-700/40">
                    <span className="text-xs font-mono text-slate-300">{atk}</span>
                    <button onClick={() => updateCombat('attackPatterns', profile.combat.attackPatterns.filter((_, j) => j !== i))}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" placeholder="New attack pattern..." value={newAttack}
                    onChange={e => setNewAttack(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newAttack) { updateCombat('attackPatterns', [...profile.combat.attackPatterns, newAttack]); setNewAttack(''); }}}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-800 border border-slate-700/50 rounded
                               text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button onClick={() => { if (newAttack) { updateCombat('attackPatterns', [...profile.combat.attackPatterns, newAttack]); setNewAttack(''); }}}
                    className="px-3 py-2 text-xs font-mono bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/20 transition-colors">
                    + Add
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Special Abilities" icon={<Zap className="w-3.5 h-3.5" />} defaultOpen={false}>
              <div className="space-y-2">
                {profile.combat.specialAbilities.map((ab, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-slate-800/60 border border-amber-500/20">
                    <span className="text-xs font-mono text-amber-300">{ab}</span>
                    <button onClick={() => updateCombat('specialAbilities', profile.combat.specialAbilities.filter((_, j) => j !== i))}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs">✕</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" placeholder="Special ability (e.g. Acid Spit, Berserk Rage)..." value={newAbility}
                    onChange={e => setNewAbility(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newAbility) { updateCombat('specialAbilities', [...profile.combat.specialAbilities, newAbility]); setNewAbility(''); }}}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-800 border border-slate-700/50 rounded
                               text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button onClick={() => { if (newAbility) { updateCombat('specialAbilities', [...profile.combat.specialAbilities, newAbility]); setNewAbility(''); }}}
                    className="px-3 py-2 text-xs font-mono bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/20 transition-colors">
                    + Add
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* DETECTION TAB */}
        {activeTab === 'detection' && (
          <div className="max-w-2xl space-y-4">
            <Section title="Sensory Radii" icon={<Eye className="w-3.5 h-3.5" />}>
              <div className="space-y-4">
                {[
                  { key: 'sightRadius',   label: 'Sight Radius',   min: 500, max: 8000, unit: 'units' },
                  { key: 'hearingRadius', label: 'Hearing Radius',  min: 200, max: 5000, unit: 'units' },
                  { key: 'detectStealth', label: 'Detect Stealth',  min: 0,   max: 100,  unit: '%' },
                  { key: 'alertDelay',    label: 'Alert Delay',     min: 0,   max: 10,   unit: 's' },
                ].map(field => (
                  <div key={field.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-mono text-slate-300">{field.label}</span>
                      <span className="text-xs font-mono text-amber-400">
                        {profile.detection[field.key as keyof DetectionSystem]} {field.unit}
                      </span>
                    </div>
                    <input type="range" min={field.min} max={field.max}
                      value={profile.detection[field.key as keyof DetectionSystem] as number}
                      onChange={e => updateDetection(field.key as keyof DetectionSystem, parseFloat(e.target.value) as never)}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-amber-500"
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Behavior Flags" icon={<Shield className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'nightVision',       label: 'Night Vision',       desc: 'Full sight in darkness' },
                  { key: 'investigatesNoise', label: 'Investigates Noise', desc: 'Moves toward heard sounds' },
                  { key: 'remembersThreat',   label: 'Remembers Threat',   desc: 'Stays alert after losing sight' },
                ].map(flag => (
                  <label key={flag.key} className="flex items-start gap-3 cursor-pointer group p-2.5 rounded-lg border border-slate-700/40 hover:border-slate-600 transition-colors">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                        ${(profile.detection[flag.key as keyof DetectionSystem] as boolean)
                          ? 'border-amber-500 bg-amber-500' : 'border-slate-600 bg-slate-800'}`}
                      onClick={() => updateDetection(flag.key as keyof DetectionSystem, !(profile.detection[flag.key as keyof DetectionSystem]) as never)}
                    />
                    <div>
                      <p className="text-xs font-mono text-slate-300">{flag.label}</p>
                      <p className="text-[10px] text-slate-500">{flag.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            {/* Detection Cone Visualization */}
            <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
              <p className="text-xs font-mono text-slate-400 mb-3">Detection Profile</p>
              <div className="relative flex items-center justify-center h-32 bg-slate-900/60 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Sight ring */}
                  <div className="absolute rounded-full border border-amber-500/30"
                    style={{ width: `${(profile.detection.sightRadius / 8000) * 90}%`, height: `${(profile.detection.sightRadius / 8000) * 90}%` }}
                  />
                  {/* Hearing ring */}
                  <div className="absolute rounded-full border border-blue-500/30"
                    style={{ width: `${(profile.detection.hearingRadius / 8000) * 90}%`, height: `${(profile.detection.hearingRadius / 8000) * 90}%` }}
                  />
                  <div className="w-3 h-3 rounded-full bg-amber-500 z-10" />
                </div>
                <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-px bg-amber-500/60 inline-block" /> Sight</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-px bg-blue-500/60 inline-block" /> Hearing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PATROL TAB */}
        {activeTab === 'patrol' && (
          <div className="max-w-2xl space-y-4">
            <Section title="Package Type" icon={<Map className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-3 gap-2">
                {PATROL_TYPES.map(t => (
                  <button key={t} onClick={() => updatePatrol('type', t)}
                    className={`px-3 py-2 text-xs font-mono rounded-md border capitalize transition-colors
                      ${profile.patrol.type === t
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-mono text-slate-300">Package Radius</span>
                  <span className="text-xs font-mono text-amber-400">{profile.patrol.radius} units</span>
                </div>
                <input type="range" min={128} max={4096} step={64} value={profile.patrol.radius}
                  onChange={e => updatePatrol('radius', parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-amber-500"
                />
              </div>
            </Section>

            <Section title="Daily Schedule" icon={<Activity className="w-3.5 h-3.5" />}>
              <div className="space-y-2">
                {profile.patrol.schedule.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded bg-slate-800/60 border border-slate-700/40">
                    <input type="time" value={s.time}
                      onChange={e => {
                        const updated = [...profile.patrol.schedule];
                        updated[i] = { ...s, time: e.target.value };
                        updatePatrol('schedule', updated);
                      }}
                      className="px-2 py-1 text-xs font-mono bg-slate-700 border border-slate-600 rounded text-amber-300 focus:outline-none"
                    />
                    <input type="text" value={s.package}
                      onChange={e => {
                        const updated = [...profile.patrol.schedule];
                        updated[i] = { ...s, package: e.target.value };
                        updatePatrol('schedule', updated);
                      }}
                      className="flex-1 px-2 py-1 text-xs font-mono bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none"
                    />
                    <button onClick={() => updatePatrol('schedule', profile.patrol.schedule.filter((_, j) => j !== i))}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs">✕</button>
                  </div>
                ))}
                <button
                  onClick={() => updatePatrol('schedule', [...profile.patrol.schedule, { time: '12:00', package: 'New package' }])}
                  className="w-full py-2 text-xs font-mono border border-dashed border-slate-700 rounded text-slate-500
                             hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                >
                  + Add Schedule Entry
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* FACTION TAB */}
        {activeTab === 'faction' && (
          <div className="max-w-2xl space-y-4">
            <Section title="Faction Identity" icon={<Users className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">Primary Faction</label>
                  <input type="text" value={profile.faction.primaryFaction}
                    onChange={e => updateFaction('primaryFaction', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50 rounded
                               text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">On Attack Response</label>
                  <select value={profile.faction.factionResponseOnAttack}
                    onChange={e => updateFaction('factionResponseOnAttack', e.target.value as typeof profile.faction.factionResponseOnAttack)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-800/60 border border-slate-700/50 rounded
                               text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    {FACTION_RESPONSES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Relations" icon={<Shield className="w-3.5 h-3.5" />}>
              {[
                { key: 'allied',   label: 'Allied Factions',  color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5' },
                { key: 'hostile',  label: 'Hostile Factions', color: 'text-red-400',     border: 'border-red-500/20 bg-red-500/5' },
                { key: 'neutral',  label: 'Neutral Factions', color: 'text-slate-400',   border: 'border-slate-500/20 bg-slate-500/5' },
              ].map(rel => (
                <div key={rel.key} className={`p-3 rounded-lg border ${rel.border}`}>
                  <p className={`text-[10px] font-mono ${rel.color} mb-2 uppercase tracking-wider`}>{rel.label}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(profile.faction[rel.key as keyof FactionLogic] as string[]).map((f, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono
                                               bg-slate-800/60 border border-slate-700/40 rounded text-slate-300">
                        {f}
                        <button
                          onClick={() => updateFaction(rel.key as keyof FactionLogic, (profile.faction[rel.key as keyof FactionLogic] as string[]).filter((_, j) => j !== i) as never)}
                          className="text-slate-500 hover:text-red-400 ml-0.5"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder={`Add ${rel.label.toLowerCase()}...`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                        updateFaction(rel.key as keyof FactionLogic, [...(profile.faction[rel.key as keyof FactionLogic] as string[]), (e.target as HTMLInputElement).value] as never);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                    className="w-full px-2 py-1.5 text-[10px] font-mono bg-slate-800/60 border border-slate-700/50 rounded
                               text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="max-w-3xl space-y-4">
            {!generatedScript ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <Code className="w-10 h-10 text-slate-600" />
                <p className="text-sm font-mono text-slate-400">No script generated yet</p>
                <button onClick={generateScript}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-amber-500/10
                             border border-amber-500/30 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors">
                  <Play className="w-3.5 h-3.5" /> Generate Papyrus Script
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{profile.name}EntityAIScript.psc</span>
                    <CategoryBadge category={profile.category} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generatedScript)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-700 rounded-md
                                 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors">
                      <Save className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedScript], { type: 'text/plain' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${profile.name}EntityAIScript.psc`;
                        a.click();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-amber-500/10
                                 border border-amber-500/30 rounded-md text-amber-400 hover:bg-amber-500/20 transition-colors">
                      <Download className="w-3 h-3" /> Download .psc
                    </button>
                  </div>
                </div>
                <pre className="p-4 rounded-lg bg-slate-900 border border-slate-700/50 text-xs font-mono
                               text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {generatedScript}
                </pre>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default NPCBehaviorForge;
