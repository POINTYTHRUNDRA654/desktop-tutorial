import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, FileCode, HelpCircle, Lightbulb, Bot } from 'lucide-react';
import { getCompatibilityTips, getModByName, checkConflicts, generateTailoredConflicts } from './PopularModsKnowledge';
import { FO4KnowledgeBase } from '../../shared/FO4KnowledgeBase';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    files?: string[];
     suggestions?: Array<{ label: string; route?: string; payload?: any; query?: string }>;
     patchPrefill?: { recordTypes: string[]; mods: Array<{ name: string; usage: string; risk: string }> };
  };
}

export const AICopilot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [projectContext, setProjectContext] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load conversation history
    const saved = localStorage.getItem('mossy_copilot_history');
    if (saved) {
      try {
        const history = JSON.parse(saved);
        setMessages(history.slice(-50)); // Keep last 50 messages
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }

    // Welcome message
    if (messages.length === 0) {
      addMessage('assistant', 'Hi! I\'m your AI Modding Copilot. I can help you with Papyrus scripting, load order issues, optimization, and any Fallout 4 modding questions. What are you working on?');
    }

    // Load project context
    const context = localStorage.getItem('mossy_project_context');
    if (context) {
      setProjectContext(JSON.parse(context));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, context?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      context
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      localStorage.setItem('mossy_copilot_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || thinking) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setThinking(true);

    // Record action for ML pattern learning
    LocalAIEngine.recordAction('chat_query', { query: userMessage });

    try {
      // Check if user is asking for FO4 specific knowledge first (Hybrid Engine)
      const staticResponse = generateResponse(userMessage);
      
      // If we have a local ML service, use it for smarter, non-fake responses
      const ollamaActive = await LocalAIEngine.checkOllama();
      
      if (ollamaActive) {
        const sysPrompt = getFullSystemInstruction("You are currently using the LOCAL OLLAMA ENGINE for real machine learning. No simulated responses allowed.");
        const localResponse = await LocalAIEngine.generateResponse(userMessage, sysPrompt);
        
        // Combine static knowledge with ML intelligence
        if (staticResponse.content.includes("I detected") || staticResponse.content === "") {
             addMessage('assistant', localResponse.content, localResponse.context);
        } else {
             const mergedContent = `**[Local ML Analysis]**\n${localResponse.content}\n\n---\n**[Reference Knowledge]**\n${staticResponse.content}`;
             addMessage('assistant', mergedContent, { ...staticResponse.context, source: 'hybrid_ml' });
        }
      } else {
        // Fallback to static responses if Ollama is missing
        addMessage('assistant', staticResponse.content, staticResponse.context);
      }
    } catch (error) {
       addMessage('assistant', "I encountered an error connecting to my local neural networks. Please ensure your AI services (Ollama) are running.");
    } finally {
      setThinking(false);
    }
  };

  const generateResponse = (query: string): { content: string; context?: any } => {
    const lowerQuery = query.toLowerCase();

    // Animation/Rigging help (Enhanced with real knowledge from FO4KnowledgeBase)
    if (lowerQuery.includes('animation') || lowerQuery.includes('rigging') || lowerQuery.includes('skeleton') || lowerQuery.includes('blender') && (lowerQuery.includes('anim') || lowerQuery.includes('rig'))) {
      const blenderInfo = FO4KnowledgeBase.blenderToFO4;
      const toolsList = blenderInfo.requiredTools.map(t => `- ${t}`).join('\n');
      const rulesList = blenderInfo.riggingSkinning.rules.map(r => `- ${r}`).join('\n');

      return {
        content: `I have extensive knowledge of the Blender 4.1 to Fallout 4 workflow! For creating mods and animations, you should follow these production-grade standards:\n\n### 🛠️ Required Production Tools\n${toolsList}\n\n### 📐 Scene Configuration\n- **Units:** ${blenderInfo.sceneSetup.units}\n- **Scale:** ${blenderInfo.sceneSetup.scale}\n- **FPS:** ${blenderInfo.sceneSetup.fps}\n- **Orientation:** ${blenderInfo.sceneSetup.orientation}\n\n### 🦴 Rigging & Skinning Rules\n${rulesList}\n\n### 🔄 Standard Workflow\n1. **Setup:** Use Meters and 1.0 scale with Z Up.\n2. **Import:** Use PyNifly to bring in the vanilla skeleton (${blenderInfo.riggingSkinning.skeletonNames.human}).\n3. **Animate:** Use Pose Markers for event annotations like "Hit" or "Footstep".\n4. **Export:** Export via PyNifly or FBX (2010.2.0-r1 build profile).\n\nWould you like me to walk you through a specific part of this pipeline, such as setting up the skeleton or configuring Havok annotations?`,
        context: {
          suggestions: [
            { label: 'Blender Animation Guide', route: '/animation-guide' },
            { label: 'Skeleton Reference', route: '/skeleton-reference' },
            { label: 'Export Settings Helper', route: '/export-settings' }
          ]
        }
      };
    }

    // Export settings help
    if (lowerQuery.includes('export') && (lowerQuery.includes('nif') || lowerQuery.includes('blender') || lowerQuery.includes('setting'))) {
      return {
        content: `Export settings are critical! Wrong settings = failed animation or scaled wrong character.\n\n🎯 **Quick Rules:**\n✓ Scale: ALWAYS 1.0 Metric (1 unit = 1 meter in Blender 4.2+)\n✓ Only Armature Selected (deselect mesh first)\n✓ Export Animation ON/OFF depends on scenario\n✓ Export Skeleton ON/OFF depends on scenario\n✓ Animation Name: Set if exporting animation\n✓ Export Mesh: Usually OFF (unless custom body)\n\nI've built an **Export Settings Helper** that shows exact settings for:\n1. Custom Mesh/Armor (no animation)\n2. Animation Only\n3. Custom Rigged Character (full)\n4. Skeleton Only\n\nEach scenario has a pre-export checklist and common mistakes list.`,
        context: {
          suggestions: [
            { label: 'Export Settings Helper', route: '/export-settings' },
            { label: 'Blender Animation Guide', route: '/animation-guide' },
            { label: 'Animation Validator', route: '/animation-validator' }
          ]
        }
      };
    }

    // Rigging mistakes / debugging
    if ((lowerQuery.includes('wrong') || lowerQuery.includes('error') || lowerQuery.includes('problem') || lowerQuery.includes('fix')) && 
        (lowerQuery.includes('animation') || lowerQuery.includes('rig') || lowerQuery.includes('mesh') || lowerQuery.includes('export'))) {
      return {
        content: `Let me help you debug! Common rigging issues fall into these categories:\n\n❌ **Weight Painting Problems**\n- Single bone has 100% weight everywhere → mesh deforms wrong\n- Hard edges at joints (no blending) → visible seams\n- Unweighted vertices (blue areas) → mesh tears\n\n❌ **Bone/Skeleton Issues**\n- Bone names don't match FO4 standard → animation won't play\n- Custom bones added → game crashes\n\n❌ **Animation Issues**\n- Animation jerky at loop point → first frame ≠ last frame\n- Root bone animated → character drifts off-screen\n\n❌ **Export Issues**\n- Scale wrong (0.1 instead of 1.0) → character 10x smaller\n- Export Animation flag wrong → animation doesn't appear\n- Mesh selected during export → file bloated\n- Animation Name blank → no animation data\n\nI've built a **Rigging Mistakes Gallery** with 12+ documented mistakes, visual symptoms, and exact fixes. Filter by category and expand each mistake for step-by-step solutions.`,
        context: {
          suggestions: [
            { label: 'Rigging Mistakes Gallery', route: '/rigging-mistakes' },
            { label: 'Animation Validator', route: '/animation-validator' },
            { label: 'Export Settings Helper', route: '/export-settings' }
          ]
        }
      };
    }

    // Leveled List Injection help
    if (lowerQuery.includes('leveled list') || lowerQuery.includes('spawn') && (lowerQuery.includes('creature') || lowerQuery.includes('npc') || lowerQuery.includes('plant')) ||
        lowerQuery.includes('inject') || lowerQuery.includes('automatic spawn') || lowerQuery.includes('hand place')) {
      return {
        content: `Automatic spawning is essential for creature/NPC/plant mods! Here's how:

🎯 **Two Main Methods:**

1️⃣ **Script Injection (Recommended)**
✅ 100% compatible with other mods
✅ Can be toggled via MCM
✅ No ESP conflicts
✅ Runtime injection (works mid-game)
❌ Requires F4SE + Papyrus scripting

2️⃣ **ESP-Based Patch**
✅ No F4SE required
✅ Easier to create (FO4Edit)
❌ Conflicts with other list edits
❌ Cannot be toggled at runtime

📋 **What Are Leveled Lists?**
FO4 uses leveled lists (LVLN, LVLI, LVLC) to control what spawns where. Examples:
- EncRadroach = radroach spawns
- EncRaider01Template = raider spawns
- LL_FarmPlants = settlement plants

🔧 **How It Works:**
Your script/patch ADDS your creature to existing vanilla lists. You set:
- **Level**: Minimum player level (1=always, 20=late-game)
- **Count**: Spawn frequency (1=rare, 5=common)
- **Lists**: Which biomes/factions (inject into 3-7 relevant lists)

✨ **Example Use Cases:**
- New creature spawns alongside mole rats
- Custom plant appears in settlements
- Unique NPC variant joins raider encounters
- Rare boss creature in high-level zones

I've built a comprehensive guide covering script injection, ESP patches, spawn balancing, multi-list injection, and troubleshooting!`,
        context: {
          suggestions: [
            { label: 'Leveled List Injection Guide', route: '/leveled-list-injection' },
            { label: 'Template Generator', route: '/devtools' },
            { label: 'Script Analyzer', route: '/devtools' }
          ]
        }
      };
    }

    // Precombine & PRP help
    if (lowerQuery.includes('precombine') || lowerQuery.includes('prp') || lowerQuery.includes('invisible object') || 
        (lowerQuery.includes('broken') && (lowerQuery.includes('mesh') || lowerQuery.includes('object'))) ||
        lowerQuery.includes('z-fighting') || lowerQuery.includes('mesh flicker')) {
      return {
        content: `Precombines are critical for worldspace mods! Here's what you need to know:\n\n🔴 **What Are Precombines?**\nFO4 pre-combines distant objects into single meshes for performance. Any worldspace object placement change breaks them.\n\n⚠️ **Common Symptoms of Broken Precombines:**\n- Objects invisible when camera far away\n- Z-fighting (flickering meshes)\n- Visual glitches in modified cells\n- FPS drops in changed areas\n\n✅ **The Solution: PRP Tool**\nThe Precombine & Previsibines (PRP) tool rebuilds broken precombines automatically. Multi-mod compatible!\n\n📋 **Pre-Release Checklist:**\n- Run PRP tool on your ESP\n- Include Meshes\\Precombined\\ files in mod\n- Document PRP usage in README\n- Test with other precombine mods\n- Verify no invisible objects in-game\n\nI've built comprehensive guides:\n\n📚 **Precombine & PRP Guide** - Full process from detection to release\n✅ **Precombine Checker** - Pre-release validation checklist (25+ checks)`,
        context: {
          suggestions: [
            { label: 'Precombine & PRP Guide', route: '/precombine-prp' },
            { label: 'Precombine Checker', route: '/precombine-checker' },
            { label: 'Popular Mods Database', route: '/popular-mods' }
          ]
        }
      };
    }

    // One-click patch generator for mod pairs
    if (lowerQuery.includes('patch') && (lowerQuery.includes(' + ') || lowerQuery.includes('and') || lowerQuery.includes('with'))) {
      // Extract mod names (e.g., "patch WBO + Modern Firearms")
      const modNames = query.match(/(?:patch|create patch|merge)\s+(.+)/i)?.[1] || '';
      const parts = modNames.split(/\s*(?:\+|and|with)\s*/i).filter(p => p.trim());
      
      if (parts.length >= 2) {
        const modA = parts[0].trim();
        const modB = parts[1].trim();
        const modAObj = getModByName(modA);
        const modBObj = getModByName(modB);
        
        if (modAObj && modBObj) {
          const tailoredConflicts = generateTailoredConflicts(modA, modB);
          const prefill = {
            recordTypes: Array.from(new Set(tailoredConflicts.map(c => c.type))),
            mods: [
              { name: modAObj.name, usage: modAObj.usage, risk: 'high' },
              { name: modBObj.name, usage: modBObj.usage, risk: 'high' }
            ],
            demoConflicts: tailoredConflicts
          };
          localStorage.setItem('mossy_patch_prefill', JSON.stringify(prefill));
          return {
            content: `Creating a patch for ${modAObj.name} and ${modBObj.name}.\n\nI've identified ${tailoredConflicts.length} likely conflicts:\n${tailoredConflicts.map(c => `• ${c.record}: ${c.modA.value} vs ${c.modB.value}`).join('\n')}\n\nOpening Patch Generator with these pre-filled. You can adjust resolutions as needed.`,
            context: { suggestions: [ { label: 'Open Patch Generator', route: '/patch-gen', payload: { type: 'patch-prefill' } } ] }
          };
        } else {
          return {
            content: `I couldn't find one or both mods (${modA}, ${modB}) in the popular mods database. Try:\n- "Patch Modern Firearms + Weapon Balance Overhaul"\n- "Patch AWKCR + Armorsmith Extended"\n- "Patch Sim Settlements 2 + Place Everywhere"\n\nOr open Patch Generator manually and name your mods.`,
            context: { suggestions: [ { label: 'Open Patch Generator', route: '/patch-gen' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
          };
        }
      }
    }

    // Checklist generator
    if (lowerQuery.includes('checklist')) {
      if (lowerQuery.includes('weapon')) {
        return {
          content: `Weapon Mod Compatibility Checklist\n\n1) Keywords: Use AWKCR weapon/armor keywords\n2) Leveled Lists: Inject via script or provide LVLI patch\n3) Balance: Consider WBO users; avoid extreme damage edits\n4) Ammo: Check ammo compat with Modern Firearms\n5) Crafting: Provide COBJ entries aligned with AWKCR\n6) Tags: VIS-G/DEF_UI tags for sorting\n7) Testing: Validate with MF + WBO + UFO4P\n8) Load Order: Place your patch after both mods\n9) LOOT: Provide metadata notes`,
          context: { suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' }, { label: 'Open Patch Generator', route: '/patch-gen' } ] }
        };
      }
      if (lowerQuery.includes('armor')) {
        return {
          content: `Armor Mod Compatibility Checklist\n\n1) AWKCR: Use standard armor keywords\n2) Armorsmith: Provide patch for slots & crafting\n3) Slots: Document and avoid slot conflicts\n4) COBJ: Proper recipes and categories\n5) Tags: VIS-G/DEF_UI item tags\n6) Balance: Avoid overriding vanilla wildly\n7) Testing: AWKCR + Armorsmith + UFO4P\n8) Load Order: Armor mod before patches\n9) LOOT: Add metadata`,
          context: { suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' } ] }
        };
      }
      if (lowerQuery.includes('settlement')) {
        return {
          content: `Settlement Mod Compatibility Checklist\n\n1) SS2: Test with Sim Settlements 2 active\n2) Scripts: Avoid heavy OnUpdate in workshop\n3) Objects: Proper snapping/collision (Place Everywhere users)\n4) Categories: Workshop menu consistency\n5) Performance: Check with SS2 script load\n6) Plots: Provide SS2 plot if applicable\n7) Navmesh: Validate for placed objects\n8) Load Order: Early-mid for SS2 compat\n9) LOOT: Add metadata`,
          context: { suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' }, { label: 'Open Live Game Monitor', route: '/game-monitor' } ] }
        };
      }
      if (lowerQuery.includes('texture') || lowerQuery.includes('visual')) {
        return {
          content: `Texture Mod Compatibility Checklist\n\n1) Formats: BC7 (diffuse), BC5 (normal), BC3 (spec)\n2) Mipmaps: Ensure generated for all textures\n3) Sizes: Provide 2K and 4K options; avoid VRAM overflow\n4) Vivid Fallout: Note compatibility; allow easy overrides (loose files)\n5) ENB: Test color/alpha with ENB enabled\n6) Paths: Consistent folder structure and naming\n7) Performance: Consider atlases for many small textures\n8) Tools: Convert via Asset Optimizer\n9) Docs: README with format guidance`,
          context: { suggestions: [ { label: 'Asset Optimizer', route: '/optimizer' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
        };
      }
      if (lowerQuery.includes('ui') || lowerQuery.includes('hud')) {
        return {
          content: `UI/HUD Mod Compatibility Checklist\n\n1) FallUI: Test widgets and layouts (F4SE required)\n2) DEF_UI: Provide tags/patches if applicable\n3) Positioning: Avoid overlapping; respect safe zones\n4) Scaling: Verify at multiple resolutions\n5) Assets: Package SWF and dependencies correctly\n6) MCM: Add toggles/settings for users\n7) Input: Controller/keybind compatibility\n8) Load Order: Place UI mods appropriately\n9) LOOT: Metadata or user instructions`,
          context: { suggestions: [ { label: 'Quick Reference', route: '/reference' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
        };
      }
      if (lowerQuery.includes('script') || lowerQuery.includes('gameplay')) {
        return {
          content: `Gameplay/Script Compatibility Checklist\n\n1) F4SE: Declare minimum version when used\n2) MCM: Add toggles and safety options\n3) Updates: Prefer RegisterForSingleUpdate over tight loops\n4) Events: Use event-driven patterns (OnInit/OnQuestStart/etc.)\n5) Caching: Store refs/values; avoid repeated lookups\n6) Survival: Don’t force survival settings; respect user configs\n7) Performance: Profile in Live Game Monitor\n8) Errors: Guard None refs; add try/catch-like checks\n9) Load Order: Avoid overwriting vanilla unnecessarily`,
          context: { suggestions: [ { label: 'Live Game Monitor', route: '/game-monitor' }, { label: 'Template Generator', route: '/devtools' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
        };
      }
      if (lowerQuery.includes('3d') || lowerQuery.includes('mesh')) {
        return {
          content: `3D Assets Compatibility Checklist\n\n1) Poly Budget: Weapons <10k, Armor <20k (target)\n2) LODs: Provide lower-detail models for distance\n3) Collision: Accurate collision meshes (no convex-only unless valid)\n4) Materials: Correct shader flags and maps\n5) Normals/Tangents: Recalculate consistently\n6) Skinning: Proper weights for armor/clothes\n7) NIF Settings: Validate in NifSkope\n8) Optimization: Merge verts; remove hidden faces\n9) Testing: Inspect in Asset Viewer 3D`,
          context: { suggestions: [ { label: 'Asset Viewer 3D', route: '/3d-viewer' }, { label: 'Asset Optimizer', route: '/optimizer' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
        };
      }
    }

    // Compatibility advisor (mod type awareness)
    if ((lowerQuery.includes('create') || lowerQuery.includes('make') || lowerQuery.includes('build') || lowerQuery.includes('mod')) &&
        (lowerQuery.includes('weapon') || lowerQuery.includes('armor') || lowerQuery.includes('settlement') || lowerQuery.includes('script'))) {

      // Weapon mods
      if (lowerQuery.includes('weapon')) {
        const tips = getCompatibilityTips('weapon');
        const mf = getModByName('Modern Firearms');
        const wbo = getModByName('Weapon Balance Overhaul');
        const awkcr = getModByName('Armor Weapon Keywords Community Resource');
        return {
          content: `Making a weapon mod? Here's compatibility guidance:\n\n${tips.map(t => `• ${t}`).join('\n')}\n\nPopular ecosystems that impact weapons:\n• ${mf?.name ?? 'Modern Firearms'} (${mf?.usage ?? 45}% usage)\n• ${wbo?.name ?? 'Weapon Balance Overhaul'} (${wbo?.usage ?? 35}%)\n• ${awkcr?.name ?? 'AWKCR'} (${awkcr?.usage ?? 52}%)\n\nTip: Provide a leveled list patch and align keywords with AWKCR.`,
          context: { suggestions: ['Popular Mods Database', 'Patch Generator', 'Load Order Help'] }
        };
      }

      // Armor mods
      if (lowerQuery.includes('armor')) {
        const tips = getCompatibilityTips('armor');
        const awkcr = getModByName('Armor Weapon Keywords Community Resource');
        const ae = getModByName('Armorsmith Extended');
        return {
          content: `Creating armor? Here's compatibility guidance:\n\n${tips.map(t => `• ${t}`).join('\n')}\n\nKey dependencies to consider:\n• ${awkcr?.name ?? 'AWKCR'} (${awkcr?.usage ?? 52}% usage)\n• ${ae?.name ?? 'Armorsmith Extended'} (${ae?.usage ?? 40}%)\n\nTip: Use AWKCR keywords and provide a patch for Armorsmith Extended.`,
          context: { suggestions: ['Popular Mods Database', 'Patch Generator'] }
        };
      }

      // Settlement mods
      if (lowerQuery.includes('settlement')) {
        const tips = getCompatibilityTips('settlement');
        const ss2 = getModByName('Sim Settlements 2');
        const pe = getModByName('Place Everywhere');
        return {
          content: `Working on settlements? Consider these compatibility points:\n\n${tips.map(t => `• ${t}`).join('\n')}\n\nPopular settlement mods:\n• ${ss2?.name ?? 'Sim Settlements 2'} (${ss2?.usage ?? 38}% usage)\n• ${pe?.name ?? 'Place Everywhere'} (${pe?.usage ?? 55}%)\n\nTip: Avoid heavy scripts on workshop events and test with SS2 active.`,
          context: { suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' }, { label: 'Live Game Monitor', route: '/game-monitor' }, { label: 'Performance Predictor', route: '/performance' } ] }
        };
      }

      // Script/gameplay mods
      if (lowerQuery.includes('script')) {
        const tips = getCompatibilityTips('script');
        const f4se = getModByName('F4SE');
        const mcm = getModByName('MCM');
        const ufo4p = getModByName('UFO4P');
        return {
          content: `Gameplay scripts? Keep compatibility in mind:\n\n${tips.map(t => `• ${t}`).join('\n')}\n\nCommon script-related platforms:\n• ${f4se?.name ?? 'F4SE'} (${f4se?.usage ?? 75}% usage)\n• ${mcm?.name ?? 'MCM'} (${mcm?.usage ?? 70}%)\n• ${ufo4p?.name ?? 'UFO4P'} (${ufo4p?.usage ?? 92}%)\n\nTip: Provide MCM toggles and avoid OnUpdate spam; consider UFO4P changes.`,
          context: { suggestions: ['Template Generator', 'Live Game Monitor', 'Popular Mods Database'] }
        };
      }
    }

    // Conflict detection by record types
    if (lowerQuery.includes('leveled list') || lowerQuery.includes('lvli') || lowerQuery.includes('npc') || lowerQuery.includes('weap') || lowerQuery.includes('armo')) {
      const recordTypes: string[] = [];
      if (lowerQuery.includes('leveled list') || lowerQuery.includes('lvli')) recordTypes.push('LVLI');
      if (lowerQuery.includes('npc')) recordTypes.push('NPC_');
      if (lowerQuery.includes('weap') || lowerQuery.includes('weapon')) recordTypes.push('WEAP');
      if (lowerQuery.includes('armo') || lowerQuery.includes('armor')) recordTypes.push('ARMO');
      const conflicts = checkConflicts(recordTypes);
      return {
        content: `I scanned your focus areas (${recordTypes.join(', ')}) for popular-mod conflicts. Highlights:\n\n${conflicts.map(c => `• ${c.mod.name} (${c.mod.usage}) — risk: ${c.risk}`).join('\n')}\n\nReminder: Last plugin wins in conflicts. Use a patch to merge changes and keep compatibility without losing features.`,
        context: { suggestions: [ { label: 'Open Patch Generator', route: '/patch-gen', payload: { type: 'patch-prefill' } }, { label: 'Load Order Analyzer', route: '/load-order' }, { label: 'Popular Mods Database', route: '/popular-mods' } ], patchPrefill: { recordTypes, mods: conflicts.slice(0,4).map(c => ({ name: c.mod.name, usage: c.mod.usage, risk: c.risk })) } }
      };
    }

    // Script analysis
    if (lowerQuery.includes('script') && (lowerQuery.includes('error') || lowerQuery.includes('not work') || lowerQuery.includes('ctd'))) {
      return {
        content: `Let me help you debug that script. Common Papyrus issues that cause CTDs:

**1. Infinite Loops**
\`\`\`papyrus
While condition
    ; If condition never becomes false, game freezes
    ; Always modify the condition inside!
EndWhile
\`\`\`

**2. Null Reference Errors**
\`\`\`papyrus
; WRONG:
Actor target = SomeForm as Actor
target.Kill() ; Crashes if target is None!

; RIGHT:
Actor target = SomeForm as Actor
If target
    target.Kill()
EndIf
\`\`\`

**3. OnUpdate() Running Too Fast**
\`\`\`papyrus
; WRONG: Updates every frame = lag!
RegisterForUpdate(0.01)

; RIGHT: Update every 1-5 seconds
RegisterForUpdate(1.0)
\`\`\`

Want me to analyze your specific script? Use the Script Analyzer tool or paste your code here!`,
        context: {
          suggestions: [
            { label: 'Open Script Analyzer', route: '/devtools' },
            { label: 'View Common Patterns', query: 'Show common Papyrus patterns' },
            { label: 'Debug Checklist', query: 'Papyrus debug checklist' }
          ]
        }
      };
    }

    // Load order help
    if (lowerQuery.includes('load order') || lowerQuery.includes('conflict')) {
      return {
        content: `Load order can be tricky! Here's my approach:

      **Core Principles:**
      1. Masters (\`.esm\`) load first
2. DLC in release order (Robot → Workshop → Coast → Contraptions → Vault-Tec → Nuka)
3. Unofficial Patch after all DLC
4. Large overhauls (e.g., Sim Settlements) early
5. Patches last

**Conflict Resolution:**
- Red conflicts = same record edited by 2+ mods
- Last mod in load order WINS
- Use Load Order Analyzer to see conflicts
- Create patch plugins to merge changes


Need help with specific mods? Use the Load Order tool!`,
        context: {
          suggestions: [
            { label: 'Open Load Order Analyzer', route: '/load-order' },
            { label: 'Open Patch Generator', route: '/patch-gen' },
            { label: 'Popular Mods Database', route: '/popular-mods' }
          ]
        }
      };
    }

    // Performance optimization
    if (lowerQuery.includes('performance') || lowerQuery.includes('fps') || lowerQuery.includes('lag')) {
      return {
        content: `Let's optimize your mod for better performance!

**Script Optimization:**
\`\`\`papyrus
; BAD: Expensive function in loop
While i < 100
    Float dist = Player.GetDistance(SomeRef)
    i += 1
EndWhile

; GOOD: Cache outside loop
Float dist = Player.GetDistance(SomeRef)
While i < 100
    ; Use dist here
    i += 1
EndWhile
\`\`\`

**Texture Performance:**
- 4K textures = 64MB VRAM each!
- 2K = 16MB, 1K = 4MB
- Use 2K for large objects, 1K for small
- Always generate mipmaps


**Script Load:**

Want me to analyze your specific assets? Use the Performance Predictor!`,
        context: {
          suggestions: [
            { label: 'Performance Predictor', route: '/performance' },
            { label: 'Asset Optimizer', route: '/optimizer' },
            { label: 'Popular Mods Database', route: '/popular-mods' }
          ]
        }
      };
    }

    // Papyrus help
    if (lowerQuery.includes('how') && lowerQuery.includes('papyrus')) {
      // Weapon mod compatibility quick tips
      if (lowerQuery.includes('weapon') && (lowerQuery.includes('mod') || lowerQuery.includes('make') || lowerQuery.includes('create'))) {
        const tips = getCompatibilityTips('weapon');
        return {
          content: `Making a weapon mod? Great! Here's what you need to know about compatibility:\n\n${tips.map(tip => tip).join('\n')}\n\n**Popular Mods to Consider:**\n• Modern Firearms (45% usage)\n• Weapon Balance Overhaul (35%)\n• AWKCR (52%)\n\nWant to see the full Popular Mods Database?`,
          context: {
            suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' }, { label: 'Open Patch Generator', route: '/patch-gen' }, { label: 'Load Order Help', route: '/load-order' } ]
          }
        };
      }

      // Armor mod compatibility quick tips
      if (lowerQuery.includes('armor') && (lowerQuery.includes('mod') || lowerQuery.includes('make') || lowerQuery.includes('create'))) {
        const tips = getCompatibilityTips('armor');
        return {
          content: `Creating armor? Here's compatibility guidance:\n\n${tips.map(tip => tip).join('\n')}\n\n**Must-Know:**\n• AWKCR (52% usage) - use their keywords\n• Armorsmith Extended (40%)\n\nCheck Popular Mods Database for details!`,
          context: {
            suggestions: [ { label: 'Popular Mods Database', route: '/popular-mods' }, { label: 'Open Patch Generator', route: '/patch-gen' } ]
          }
        };
      }

      // General Papyrus help
      return {
        content: `I can help with Papyrus! What do you want to do?\n\n**Common Tasks:**\n- Detect when player enters area → Use OnCellAttach or OnTriggerEnter\n- Give player items → Game.GetPlayer().AddItem(ItemForm, Count)\n- Start quest stage → MyQuest.SetStage(10)\n- Spawn actors → PlaceActorAtMe(ActorBase)\n- Teleport player → Game.GetPlayer().MoveTo(MarkerRef)\n- Damage actor → SomeActor.DamageValue(ActorValue.Health, 50)\n\nOr try the Template Generator for instant code!`,
        context: { suggestions: [ { label: 'Template Generator', route: '/devtools' }, { label: 'Quick Reference', route: '/reference' }, { label: 'Popular Mods Database', route: '/popular-mods' } ] }
      };
    }

    // Texture help
    if (lowerQuery.includes('texture') || lowerQuery.includes('dds')) {
      return {
        content: `Texture questions? I've got you covered!

**Format Guide:**
- Diffuse (color): BC7 or BC1
- Normal maps: BC5 or BC7
- Specular: BC1 or BC3

**Size Recommendations:**
- Architecture: 2K-4K depending on size

❌ No compression → huge file sizes

Use the Asset Optimizer to batch convert!`,
        context: {
          suggestions: [ { label: 'Asset Optimizer', route: '/optimizer' }, { label: 'Quick Reference', route: '/reference' }, { label: 'Popular Mods Database', route: '/popular-mods' } ]
        }
      };
    }

    // General help
    return {
      content: `I'm here to help with your Fallout 4 modding! I can assist with:\n\n🔧 Technical Issues\n- Script errors and CTDs\n- Load order conflicts\n- Performance optimization\n- Asset formatting\n\n💡 Guidance\n- Best practices\n- Common patterns\n- Step-by-step tutorials\n\n⚡ Quick Tasks\n- Generate Papyrus code\n- Analyze scripts\n- Optimize assets\n- Debug problems\n\nWhat are you working on right now?`,
      context: {
        suggestions: [
          { label: 'Script Help', query: 'Help me with Papyrus scripts' },
          { label: 'Load Order', route: '/load-order' },
          { label: 'Optimization', route: '/performance' },
          { label: 'Popular Mods Database', route: '/popular-mods' }
        ]
      }
    };
  };

  const quickActions = [
    { icon: FileCode, label: 'Debug My Script', query: 'My script is causing CTDs, help me debug it' },
    { icon: HelpCircle, label: 'Load Order Help', query: 'Help me organize my load order' },
    { icon: Lightbulb, label: 'Optimization Tips', query: 'How can I improve performance?' },
    { icon: Sparkles, label: 'Animation & Rigging', query: 'How do I rig a custom character for Fallout 4 animation?' }
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Modding Copilot</h1>
            <p className="text-sm text-slate-400">Your intelligent Fallout 4 modding assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl ${msg.role === 'user' ? 'bg-violet-600' : 'bg-slate-800 border border-slate-700'} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                {msg.role === 'assistant' && <Bot className="w-4 h-4 text-violet-400" />}
                <span className="text-xs font-bold text-slate-400">
                  {msg.role === 'user' ? 'You' : 'Mossy AI'}
                </span>
                <span className="text-xs text-slate-500">{msg.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="text-sm text-white whitespace-pre-wrap">{msg.content}</div>
              
              {msg.context?.suggestions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.context.suggestions.map((sug: { label: string; route?: string; payload?: any; query?: string }, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (sug.route) {
                          // Pre-fill patch generator if payload indicates
                          if (sug.payload?.type === 'patch-prefill' && msg.context?.patchPrefill) {
                            localStorage.setItem('mossy_patch_prefill', JSON.stringify(msg.context.patchPrefill));
                          }
                          const event = new CustomEvent('mossy-control', {
                            detail: { action: 'navigate', payload: { path: sug.route } }
                          });
                          window.dispatchEvent(event);
                        } else if (sug.query) {
                          setInput(sug.query);
                        } else {
                          setInput(sug.label);
                        }
                      }}
                      className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded transition-colors"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400 animate-pulse" />
                <span className="text-sm text-slate-400">Mossy is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(action.query);
                }}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <action.icon className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-white">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about Fallout 4 modding..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
