# Fallout 4 Advanced AI System
## Complete Install Guide

---

## What This Is

A real Fallout 4 mod that advances the game's AI for **every entity type**:
creatures, humanoids, robots, synths, super mutants, and feral ghouls.

Plus a **Mossy Bridge** — a PC-side memory system so NPCs can remember your
conversations and actions across sessions without hitting Papyrus memory limits.

---

## Mod Structure

```
mod/
  Data/
    Scripts/Source/
      AdvancedAIManager.psc     ← Core quest controller
      AdvancedCreatureAI.psc    ← Pack behavior, ambush, enrage
      AdvancedNPCAI.psc         ← Squad tactics, morale, drug use
      AdvancedCompanionAI.psc   ← Persistent memory + affinity
      AdvancedRobotAI.psc       ← Robot/Synth protocols
      AIConfigMCM.psc           ← MCM configuration
    MCM/Config/AdvancedAI/
      config.json               ← MCM menu layout
  fomod/
    info.xml                    ← FOMOD mod info
    ModuleConfig.xml            ← Installer steps

bridge/
  mossy_fo4_bridge.py           ← Python bridge server
  start_fo4_bridge.bat          ← Double-click to start

components/ (Mossy UI)
  FO4BridgePanel.tsx            ← Live monitor panel
  FO4AdvancedAIHub.tsx          ← Plugin hub
  CompanionAI.tsx               ← Companion designer
  NPCBehaviorForge.tsx          ← Entity AI designer
```

---

## Step 1 — Install Requirements

Install in this order:
1. **F4SE** → https://f4se.silverlock.org/
2. **Address Library for F4SE** → Nexus ID 47327
3. **MCM Helper** → Nexus ID 21497
4. **Buffout 4** (recommended) → Nexus ID 47359

---

## Step 2 — Build the .esp in Creation Kit

Open the Creation Kit and create `AdvancedAI.esp`:

1. Create a new Quest: `AdvancedAIQuest`
   - Type: General
   - Start Game Enabled: YES
   - Run Once: NO
   - Attach script: `AdvancedAIManager`

2. Add a PlayerAlias to the quest filled with the player ref

3. Create ActorAlias entries for creature groups, filled by condition (race/keyword)

4. Create the keyword records:
   - `AAI_PackBehavior`, `AAI_AmbushReady`, `AAI_ApexPredator`
   - `AAI_SquadLeader`, `AAI_Flanker`, `AAI_Medic`

5. Add the script properties pointing to:
   - The ActorValues (avAggression = 0x000002E7, etc.)
   - The keywords above
   - The CombatStyle records you create

6. Save as `AdvancedAI.esp` with the masters listed in REQUIREMENTS.md

---

## Step 3 — Compile Scripts

Use the Creation Kit script compiler or Pyro:

```bash
# Using Pyro (recommended)
pyro -i Data/Scripts/Source/AdvancedAIManager.psc -o Data/Scripts/
pyro -i Data/Scripts/Source/AdvancedCreatureAI.psc -o Data/Scripts/
pyro -i Data/Scripts/Source/AdvancedNPCAI.psc -o Data/Scripts/
pyro -i Data/Scripts/Source/AdvancedCompanionAI.psc -o Data/Scripts/
pyro -i Data/Scripts/Source/AdvancedRobotAI.psc -o Data/Scripts/
pyro -i Data/Scripts/Source/AIConfigMCM.psc -o Data/Scripts/
```

---

## Step 4 — Package with FOMOD

Use Mod Organizer 2 or 7-Zip to package:
```
AdvancedAI.esp
Data/
fomod/
```

The FOMOD installer will handle module selection and optional Mossy Bridge install.

---

## Step 5 — Mossy Bridge (Optional but Recommended)

The bridge enables the **External Memory System** — NPCs remember far more
than Papyrus allows because history is stored on your PC.

1. Double-click `bridge/start_fo4_bridge.bat` (uses Mossy's built-in Python — no separate install)
3. In Mossy, go to: **FO4 AI → Bridge** tab
4. Click **Refresh** — status should show Connected
5. In-game MCM → Advanced AI → Mossy Bridge → Enable External Memory

---

## Step 6 — Add to Mossy App.tsx

```tsx
// Add lazy imports:
const FO4BridgePanel    = React.lazy(() => import('./components/FO4BridgePanel'));
const FO4AdvancedAIHub  = React.lazy(() => import('./components/FO4AdvancedAIHub'));
const CompanionAI       = React.lazy(() => import('./components/CompanionAI'));
const NPCBehaviorForge  = React.lazy(() => import('./components/NPCBehaviorForge'));

// Add routes:
<Route path="/fo4-advanced-ai"    element={<FO4AdvancedAIHub />} />
<Route path="/fo4-bridge"         element={<FO4BridgePanel />} />
<Route path="/companion-ai"       element={<CompanionAI />} />
<Route path="/npc-behavior-forge" element={<NPCBehaviorForge />} />
```

---

## What the External Memory System Does

Papyrus can only store a few integers per NPC. This is why vanilla companions
feel forgetful — the engine just doesn't have room for real memory.

The Mossy Bridge solves this:
- Every conversation line is stored in a local SQLite database
- Every action (kill, steal, help, gift) is recorded with game time
- Affinity changes sync automatically
- NPCs can query their full history to respond in context
- No game memory used — all stored on your PC

---

## Nexus Release Checklist

- [ ] All scripts compiled (.pex files in Data/Scripts/)
- [ ] .esp built in CK with correct masters
- [ ] FOMOD installer tested in MO2
- [ ] MCM config.json validates
- [ ] README written
- [ ] Screenshots prepared
- [ ] Tested with/without each DLC
- [ ] Load order tested against Arbitration, Better Companions
- [ ] Mossy Bridge tested on clean Python install
