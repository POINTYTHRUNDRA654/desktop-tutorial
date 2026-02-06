import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ChevronDown, ChevronRight, Zap, AlertTriangle, CheckCircle2, Code, FileText, Settings } from 'lucide-react';
import { openExternal } from './utils/openExternal';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export const LeveledListInjectionGuide: React.FC = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
  };

  const sections: GuideSection[] = [
    {
      id: 'tools-install-verify',
      title: 'Tools / Install / Verify (No Guesswork)',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">Minimum Toolchain</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong>Creation Kit:</strong> used to create quests, attach scripts, and compile Papyrus.
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => openUrl('https://store.steampowered.com/search/?term=Creation%20Kit%20Fallout%204')}
                  >
                    Steam search: Creation Kit
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => navigate('/ck-quest-dialogue')}
                  >
                    In-app: CK Quest/Dialogue Wizard
                  </button>
                </div>
              </li>
              <li>
                <strong>FO4Edit (xEdit):</strong> inspect leveled lists, check conflicts, build simple patches.
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => openNexusSearch('FO4Edit')}
                  >
                    Nexus search: FO4Edit
                  </button>
                </div>
              </li>
              <li>
                <strong>F4SE (for script injection):</strong> required if you want runtime injection or an MCM toggle.
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => openUrl('https://f4se.silverlock.org/')}
                  >
                    Official: f4se.silverlock.org
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => openNexusSearch('Address Library for F4SE Plugins')}
                  >
                    Nexus search: Address Library
                  </button>
                </div>
              </li>
              <li>
                <strong>(Optional) MCM:</strong> if you want a user-facing toggle.
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                    onClick={() => openNexusSearch('Mod Configuration Menu')}
                  >
                    Nexus search: MCM
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">Fast Verification Loop (10–15 minutes)</h4>
            <ol className="text-sm text-slate-200 space-y-2 list-decimal list-inside">
              <li>
                <strong>Confirm F4SE is loading</strong> (if you’re doing script injection).
                <div className="text-xs text-slate-400 mt-1">In-game console: try a known F4SE command (or check your mod manager logs).</div>
              </li>
              <li>
                <strong>Create a tiny quest</strong> in CK: Start Game Enabled, attach an injection script, compile to a <code className="text-orange-300">.pex</code>.
              </li>
              <li>
                <strong>Log a proof</strong>: add a <code className="text-orange-300">Debug.Trace("MyMod: Injection ran")</code> and verify it appears in Papyrus logs.
              </li>
              <li>
                <strong>Verify the injected form exists</strong> in FO4Edit: your plugin + injected list records look sane (no overrides of vanilla lists unless intentional).
              </li>
              <li>
                <strong>In-game check</strong>: spawn or loot the target container/NPC enough times to prove your item/NPC can appear.
              </li>
            </ol>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-2">In-App Shortcuts</h4>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white" onClick={() => navigate('/install-wizard')}>
                Install Wizard
              </button>
              <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white" onClick={() => navigate('/settings/tools')}>
                Tool Settings
              </button>
              <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white" onClick={() => navigate('/packaging-release')}>
                Packaging & Release
              </button>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-2">Common Failure Causes</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Script compiles but doesn’t run: quest not Start Game Enabled, script not attached, or plugin not loading.</li>
              <li>Trace doesn’t appear: Papyrus logging disabled or writing to a different profile/runtime folder.</li>
              <li>Nothing spawns: wrong list type (LVLI vs LVLN), wrong level/count, or you injected into an unused list.</li>
              <li>Conflicts: you accidentally overrode the vanilla leveled list record instead of injecting at runtime.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'overview',
      title: 'What Are Leveled Lists?',
      icon: List,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-2">📋 Definition</h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              Leveled Lists are Fallout 4&apos;s core spawning system. They define what creatures, NPCs, or items appear in the world based on player level, location, and probability.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white">Types of Leveled Lists</h4>
            
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <p className="font-bold text-green-400 mb-1">LVLN (Leveled NPC)</p>
              <p className="text-sm text-slate-300">Spawns NPCs and creatures in the world. Example: <code className="text-orange-300">EncRaider01Template</code> determines which raider types spawn.</p>
              <p className="text-xs text-slate-400 mt-2">Use case: Add your custom creature to spawn alongside vanilla creatures</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <p className="font-bold text-purple-400 mb-1">LVLI (Leveled Item)</p>
              <p className="text-sm text-slate-300">Spawns items in containers, loot tables, and NPC inventories. Example: <code className="text-orange-300">LLD_Gun_Pistol</code> controls pistol spawns.</p>
              <p className="text-xs text-slate-400 mt-2">Use case: Add custom weapon to raider inventories</p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <p className="font-bold text-cyan-400 mb-1">LVLC (Leveled Creature)</p>
              <p className="text-sm text-slate-300">Specifically for creatures. Example: <code className="text-orange-300">EncMoleRat</code> controls mole rat spawns.</p>
              <p className="text-xs text-slate-400 mt-2">Use case: Add new plant/creature type to biome spawns</p>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-2">⚠️ Why You Can&apos;t Just Edit Vanilla Lists</h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              If you directly edit vanilla leveled lists in your ESP, your mod will <strong>conflict</strong> with every other mod that edits the same list. Result: Only the last-loaded mod&apos;s changes apply.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong>Solution:</strong> Use injection methods (script-based or patch-based) to ADD entries without replacing the entire list.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'injection-methods',
      title: 'Injection Methods Compared',
      icon: Code,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Script Injection */}
            <div className="bg-green-900/10 border border-green-700/30 rounded p-4">
              <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Script Injection (Recommended)
              </h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-green-400 mb-1">✅ Pros</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>100% compatible with other mods</li>
                    <li>No ESP conflicts</li>
                    <li>Can be toggled on/off via MCM</li>
                    <li>Runtime injection (works mid-game)</li>
                    <li>Clean uninstall</li>
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold text-red-400 mb-1">❌ Cons</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Requires F4SE</li>
                    <li>Needs Papyrus scripting knowledge</li>
                    <li>Slightly more complex setup</li>
                  </ul>
                </div>

                <div className="bg-green-950/30 border border-green-800/50 rounded p-2">
                  <p className="text-xs font-bold text-green-300 mb-1">Best For:</p>
                  <p className="text-xs text-slate-300">Creatures, NPCs, items that need maximum compatibility</p>
                </div>
              </div>
            </div>

            {/* ESP Patch */}
            <div className="bg-blue-900/10 border border-blue-700/30 rounded p-4">
              <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ESP-Based Patch
              </h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-green-400 mb-1">✅ Pros</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>No F4SE required</li>
                    <li>Easier to create (FO4Edit)</li>
                    <li>Visible in load order</li>
                    <li>Can be merged into main ESP</li>
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold text-red-400 mb-1">❌ Cons</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Conflicts with other list edits</li>
                    <li>Requires manual patches for multi-mod</li>
                    <li>Cannot be toggled at runtime</li>
                    <li>Load order dependent</li>
                  </ul>
                </div>

                <div className="bg-blue-950/30 border border-blue-800/50 rounded p-2">
                  <p className="text-xs font-bold text-blue-300 mb-1">Best For:</p>
                  <p className="text-xs text-slate-300">Single-player, standalone mods where user controls load order</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">💡 Recommendation</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              For maximum compatibility: <strong>Use script injection</strong>. It&apos;s the modding community standard for leveled list changes. Provide an MCM toggle so users can disable your spawns if needed.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'script-injection',
      title: 'Script Injection Workflow',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">📝 Step-by-Step: F4SE Script Injection</h4>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-bold text-green-400 mb-2">Step 1: Create Your Quest Script</p>
                <p className="text-sm text-slate-300 mb-2">
                  In Creation Kit, create a new Quest (e.g., <code className="text-orange-300">MyCreatureInjectionQuest</code>). Set &quot;Start Game Enabled&quot; = TRUE.
                </p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2">
                  <p className="text-xs text-slate-500 mb-2">Quest Properties:</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Priority: 80 (runs early)</li>
                    <li>Start Game Enabled: Yes</li>
                    <li>Run Once: No (in case you want to add more later)</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-bold text-blue-400 mb-2">Step 2: Write Injection Script</p>
                <p className="text-sm text-slate-300 mb-2">
                  Attach a script to the quest. Use <code className="text-orange-300">LeveledItem.AddForm()</code> or <code className="text-orange-300">LeveledActor.AddForm()</code>.
                </p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2 overflow-x-auto">
                  <pre className="text-xs text-green-300">
{`Scriptname MyCreatureInjectionScript extends Quest

LeveledItem Property LL_EncSupermutant Auto Const
Actor Property MyNewCreature Auto Const

Event OnQuestInit()
    ; Inject your creature into vanilla leveled list
    LL_EncSupermutant.AddForm(MyNewCreature, 1, 1)
    ; Parameters: (Form, Level, Count)
    ; Level = minimum player level for spawn
    ; Count = how many added to list
    
    Debug.Trace("MyMod: Injected creature into leveled lists")
EndEvent`}
                  </pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="font-bold text-purple-400 mb-2">Step 3: Fill Properties in Creation Kit</p>
                <p className="text-sm text-slate-300 mb-2">
                  In CK, open your quest script properties and assign:
                </p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li><code className="text-orange-300">LL_EncSupermutant</code> = Find vanilla leveled list (e.g., EncSupermutant01Template)</li>
                  <li><code className="text-orange-300">MyNewCreature</code> = Your custom creature actor</li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="font-bold text-orange-400 mb-2">Step 4: Test In-Game</p>
                <p className="text-sm text-slate-300 mb-2">
                  Load Fallout 4, start new game or load save. Your quest runs automatically on game load.
                </p>
                <div className="bg-orange-950/30 border border-orange-800/50 rounded p-2 mt-2">
                  <p className="text-xs text-orange-300 mb-1">🔍 Verification:</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Open console: <code className="text-orange-300">sqv MyCreatureInjectionQuest</code></li>
                    <li>Check for your Debug.Trace in logs</li>
                    <li>Visit spawn locations (e.g., where Supermutants spawn)</li>
                    <li>Wait 3-7 in-game days for new spawns to appear</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="border-l-4 border-cyan-500 pl-4">
                <p className="font-bold text-cyan-400 mb-2">Step 5: Add MCM Toggle (Optional)</p>
                <p className="text-sm text-slate-300 mb-2">
                  Let users enable/disable your spawns via MCM menu.
                </p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2 overflow-x-auto">
                  <pre className="text-xs text-green-300">
{`Event OnQuestInit()
    If MyModMCM.IsSpawnsEnabled() ; User setting
        LL_EncSupermutant.AddForm(MyNewCreature, 1, 1)
        Debug.Trace("MyMod: Spawns enabled by user")
    Else
        Debug.Trace("MyMod: Spawns disabled by user")
    EndIf
EndEvent`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">✅ Advantages of This Method</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Works with unlimited mods (no conflicts)</li>
              <li>Clean save-safe (quest can be stopped/restarted)</li>
              <li>Users can toggle spawns on/off</li>
              <li>No load order management needed</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'esp-patch',
      title: 'ESP-Based Leveled List Editing',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">📝 Step-by-Step: FO4Edit Leveled List Patch</h4>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-bold text-green-400 mb-2">Step 1: Open FO4Edit (xEdit)</p>
                <p className="text-sm text-slate-300 mb-2">
                  Launch FO4Edit. Load your mod ESP and <code className="text-orange-300">Fallout4.esm</code>.
                </p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2">
                  <p className="text-xs text-slate-500 mb-2">What to Load:</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>✅ Fallout4.esm (required)</li>
                    <li>✅ Your mod ESP (contains your custom creature/item)</li>
                    <li>⚠️ Other mods (optional, if you want to see their changes)</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-bold text-blue-400 mb-2">Step 2: Find Vanilla Leveled List</p>
                <p className="text-sm text-slate-300 mb-2">
                  Navigate: <code className="text-orange-300">Fallout4.esm → Leveled NPC → [Search for list name]</code>
                </p>
                <div className="bg-blue-950/30 border border-blue-800/50 rounded p-3 mt-2">
                  <p className="text-xs text-blue-300 mb-2">Common Leveled Lists:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <p className="font-bold text-slate-200">Creatures:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>EncRadroach</li>
                        <li>EncMoleRat</li>
                        <li>EncDeathclaw</li>
                        <li>EncFeral</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">Humanoids:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>EncRaider01Template</li>
                        <li>EncGunner</li>
                        <li>EncSupermutant</li>
                        <li>EncSynth</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="font-bold text-purple-400 mb-2">Step 3: Copy Leveled List as Override</p>
                <p className="text-sm text-slate-300 mb-2">
                  Right-click the leveled list → <strong>&quot;Copy as override into...&quot;</strong> → Select your ESP.
                </p>
                <div className="bg-purple-950/30 border border-purple-800/50 rounded p-2 mt-2">
                  <p className="text-xs text-purple-300">⚠️ This creates a copy in YOUR ESP. Now you can edit without touching the vanilla file.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="font-bold text-orange-400 mb-2">Step 4: Add Your Creature/Item</p>
                <p className="text-sm text-slate-300 mb-2">
                  In the right panel (your ESP&apos;s override), expand <strong>&quot;Leveled List Entries&quot;</strong>.
                </p>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside ml-4">
                  <li>Right-click &quot;Leveled List Entries&quot; → <strong>Add</strong></li>
                  <li>Set <code className="text-orange-300">Reference</code> = Your creature/item</li>
                  <li>Set <code className="text-orange-300">Level</code> = Minimum player level (e.g., 1 for always, 20 for high-level)</li>
                  <li>Set <code className="text-orange-300">Count</code> = How many (usually 1)</li>
                  <li>Set <code className="text-orange-300">Chance None</code> = 0 (always spawn)</li>
                </ol>
              </div>

              {/* Step 5 */}
              <div className="border-l-4 border-cyan-500 pl-4">
                <p className="font-bold text-cyan-400 mb-2">Step 5: Save and Test</p>
                <p className="text-sm text-slate-300 mb-2">
                  Close FO4Edit, save changes to your ESP. Load Fallout 4 and test.
                </p>
                <div className="bg-cyan-950/30 border border-cyan-800/50 rounded p-2 mt-2">
                  <p className="text-xs text-cyan-300 mb-1">🔍 Testing:</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Visit spawn locations (where that creature type appears)</li>
                    <li>Use console: <code className="text-orange-300">player.placeatme [FormID]</code> to test spawn</li>
                    <li>Wait 3-7 in-game days for leveled lists to respawn</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700/30 rounded p-4">
            <h4 className="font-bold text-red-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Conflict Warning
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              If another mod ALSO edits the same leveled list, only the last-loaded mod&apos;s version will apply. The earlier mod&apos;s changes are lost.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong>Solution:</strong> Create a merged patch using FO4Edit&apos;s &quot;Merged Patch&quot; feature, or tell users to use a leveled list merger tool (e.g., Wrye Bash).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'spawn-chances',
      title: 'Spawn Chances & Balancing',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">🎲 Understanding Spawn Probability</h4>
            <p className="text-sm text-slate-300 mb-4">
              Leveled lists don't spawn EVERY entry. They randomly select based on <strong>Count</strong> and <strong>Level</strong> parameters.
            </p>

            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-orange-300 mb-2">Count Parameter</p>
                <p className="text-sm text-slate-300 mb-2">
                  How many times your entry appears in the list (higher = more common).
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-900 border border-slate-700 rounded p-2">
                    <p className="font-bold text-green-400">Count = 1</p>
                    <p className="text-slate-400 mt-1">Rare spawn</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded p-2">
                    <p className="font-bold text-yellow-400">Count = 3</p>
                    <p className="text-slate-400 mt-1">Common spawn</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded p-2">
                    <p className="font-bold text-red-400">Count = 10</p>
                    <p className="text-slate-400 mt-1">Very common</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-purple-300 mb-2">Level Parameter</p>
                <p className="text-sm text-slate-300 mb-2">
                  Minimum player level required for this entry to spawn.
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">Level 1:</span>
                    <span>Spawns from game start (low-level creature)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold">Level 10:</span>
                    <span>Mid-game spawn (moderate difficulty)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">Level 30+:</span>
                    <span>Late-game spawn (high difficulty, rare variant)</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-cyan-300 mb-2">Chance None</p>
                <p className="text-sm text-slate-300 mb-2">
                  Percentage chance the list spawns NOTHING. Usually 0 for creatures, higher for rare loot.
                </p>
                <div className="flex gap-2 text-xs">
                  <div className="bg-slate-900 border border-slate-700 rounded p-2 flex-1">
                    <p className="font-bold text-green-400">Chance None = 0</p>
                    <p className="text-slate-400 mt-1">Always spawns something</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded p-2 flex-1">
                    <p className="font-bold text-orange-400">Chance None = 75</p>
                    <p className="text-slate-400 mt-1">75% chance of nothing (rare loot)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-3">📊 Balancing Examples</h4>
            
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Example 1: Common Low-Level Creature</p>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>• <strong>List:</strong> EncRadroach (radroaches spawn everywhere)</p>
                  <p>• <strong>Level:</strong> 1 (spawns from game start)</p>
                  <p>• <strong>Count:</strong> 5 (very common)</p>
                  <p>• <strong>Result:</strong> Your creature will be as common as radroaches</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Example 2: Rare High-Level Variant</p>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>• <strong>List:</strong> EncDeathclaw (deadly encounters)</p>
                  <p>• <strong>Level:</strong> 35 (late-game only)</p>
                  <p>• <strong>Count:</strong> 1 (rare)</p>
                  <p>• <strong>Result:</strong> Your creature is a rare late-game boss variant</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Example 3: Regional Plant Spawn</p>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>• <strong>List:</strong> LL_FarmPlants (crops/plants in settlements)</p>
                  <p>• <strong>Level:</strong> 1 (available immediately)</p>
                  <p>• <strong>Count:</strong> 3 (common but not overwhelming)</p>
                  <p>• <strong>Result:</strong> Your plant appears alongside vanilla crops</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">💡 Balancing Tips</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Start with <strong>Count = 1</strong> and test. Increase if too rare.</li>
              <li>Match level to creature difficulty (don&apos;t spawn deathclaws at Level 1)</li>
              <li>Test in multiple locations (Commonwealth, Far Harbor, Nuka-World)</li>
              <li>Consider lore (don&apos;t put tropical plants in snowy areas)</li>
              <li>Respect player experience (don&apos;t overwhelm with new spawns)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'multi-list',
      title: 'Injecting Into Multiple Lists',
      icon: List,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-2">🌍 Why Inject Into Multiple Lists?</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Fallout 4 uses dozens of leveled lists for different biomes, factions, and difficulty zones. To make your creature/NPC appear across the world, you need to inject into MULTIPLE lists.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">📝 Script Example: Multi-List Injection</h4>
            <div className="bg-slate-950 border border-slate-700 rounded p-3 overflow-x-auto">
              <pre className="text-xs text-green-300">
{`Scriptname MyMultiListInjection extends Quest

; Define all target leveled lists
LeveledItem Property LL_EncRadroach Auto Const
LeveledItem Property LL_EncMoleRat Auto Const
LeveledItem Property LL_EncFeral Auto Const
LeveledItem Property LL_EncSupermutant Auto Const

; Your custom creature
Actor Property MyNewCreature Auto Const

Event OnQuestInit()
    ; Inject into all lists at once
    InjectIntoList(LL_EncRadroach, 1, 2)       ; Common in radroach areas
    InjectIntoList(LL_EncMoleRat, 1, 3)        ; Very common in mole rat areas
    InjectIntoList(LL_EncFeral, 10, 1)         ; Rare in feral areas (level 10+)
    InjectIntoList(LL_EncSupermutant, 20, 1)   ; Rare in mutant areas (level 20+)
    
    Debug.Trace("MyMod: Injected into 4 leveled lists")
EndEvent

Function InjectIntoList(LeveledItem list, Int minLevel, Int count)
    list.AddForm(MyNewCreature, minLevel, count)
EndFunction`}
              </pre>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">🗺️ Common Leveled List Categories</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-blue-300 mb-2">🏜️ Wasteland Creatures</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>EncRadroach</li>
                  <li>EncMoleRat</li>
                  <li>EncBloodbug</li>
                  <li>EncStingwing</li>
                  <li>EncRadstag</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-300 mb-2">💀 Hostile Creatures</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>EncDeathclaw</li>
                  <li>EncYaoGuai</li>
                  <li>EncRadscorpion</li>
                  <li>EncMirelurk</li>
                  <li>EncFeral</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-orange-300 mb-2">👥 Humanoid Factions</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>EncRaider01Template</li>
                  <li>EncGunner</li>
                  <li>EncSupermutant</li>
                  <li>EncSynth</li>
                  <li>EncScavenger</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-green-300 mb-2">🌱 Environmental</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  <li>LL_FarmPlants</li>
                  <li>LL_WildPlants</li>
                  <li>LL_ForestCreatures</li>
                  <li>LL_SwampCreatures</li>
                  <li>LL_UrbanWildlife</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-4">
            <h4 className="font-bold text-purple-300 mb-3">🔍 How to Find Leveled List Names</h4>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>Open Creation Kit or FO4Edit</li>
              <li>Navigate to <strong>Leveled NPC</strong> or <strong>Leveled Item</strong> section</li>
              <li>Search for keywords: &quot;Enc&quot; (encounters), &quot;LL_&quot; (leveled list), faction names</li>
              <li>Inspect existing vanilla creatures to see which lists they&apos;re in</li>
              <li>Document all relevant lists for your biome/faction</li>
            </ol>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">✅ Best Practices</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Don&apos;t inject into EVERY list (overwhelming for players)</li>
              <li>Choose 3-7 relevant lists for your creature type</li>
              <li>Vary spawn chances (common in some areas, rare in others)</li>
              <li>Test in all target zones before release</li>
              <li>Document which lists you modified in your README</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'testing',
      title: 'Testing Spawns',
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h4 className="font-bold text-white mb-3">🧪 Testing Workflow</h4>
            
            <div className="space-y-3">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-bold text-green-400 mb-2">Step 1: Verify Script Ran</p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2">
                  <p className="text-xs text-slate-300 mb-2">Console commands:</p>
                  <div className="space-y-1 text-xs font-mono text-orange-300">
                    <p>sqv MyCreatureInjectionQuest</p>
                    <p>; Check quest stage and script variables</p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-bold text-blue-400 mb-2">Step 2: Check Leveled List</p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2">
                  <p className="text-xs text-slate-300 mb-2">Open FO4Edit and inspect the leveled list. Your entry should appear.</p>
                  <p className="text-xs text-slate-400 mt-2">Note: Script changes are runtime-only (won't show in FO4Edit for script injection)</p>
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <p className="font-bold text-purple-400 mb-2">Step 3: Force Spawn Test</p>
                <div className="bg-slate-950 border border-slate-700 rounded p-3 mt-2">
                  <p className="text-xs text-slate-300 mb-2">Console test:</p>
                  <div className="space-y-1 text-xs font-mono text-orange-300">
                    <p>player.placeatme [YourCreatureFormID] 10</p>
                    <p>; Spawns 10 copies at your location</p>
                    <p>; Verify behavior, combat AI, loot</p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <p className="font-bold text-orange-400 mb-2">Step 4: Natural Spawn Test</p>
                <p className="text-sm text-slate-300 mb-2">
                  Visit known spawn locations for your target leveled list. Wait 3-7 in-game days for respawns.
                </p>
                <div className="bg-orange-950/30 border border-orange-800/50 rounded p-3 mt-2">
                  <p className="text-xs text-orange-300 mb-2">⚠️ Patience Required</p>
                  <p className="text-xs text-slate-300">
                    Leveled lists don't respawn immediately. You may need to sleep/wait multiple days or visit NEW locations you haven't discovered yet.
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-cyan-500 pl-4">
                <p className="font-bold text-cyan-400 mb-2">Step 5: Multi-Mod Testing</p>
                <p className="text-sm text-slate-300 mb-2">
                  Load your mod WITH popular leveled list mods (e.g., Darker Nights, Survival mods).
                </p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li>Verify your spawns still appear</li>
                  <li>Check for conflicts or crashes</li>
                  <li>Test with different load orders</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
            <h4 className="font-bold text-blue-300 mb-3">🔍 Common Testing Issues</h4>
            
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ &quot;My creature never spawns&quot;</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li>Check player level vs creature's minimum level requirement</li>
                  <li>Verify script ran (check Debug.Trace in logs)</li>
                  <li>Visit NEW locations (already-spawned areas won&apos;t update)</li>
                  <li>Count might be too low (increase from 1 to 3-5)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ &quot;Creature spawns but crashes game&quot;</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li>Missing mesh/texture files</li>
                  <li>Broken NIF (validate in NifSkope)</li>
                  <li>Invalid AI package or faction</li>
                  <li>Check Papyrus logs for error messages</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ &quot;Too many spawns (overwhelming)&quot;</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li>Reduce Count parameter (from 5 to 1-2)</li>
                  <li>Increase minimum level requirement</li>
                  <li>Remove from some leveled lists</li>
                  <li>Add MCM toggle for users to disable</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-2">✅ Testing Checklist</h4>
            <div className="space-y-2 text-sm text-slate-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Quest script executes without errors</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Creature appears when force-spawned (placeatme)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Creature spawns naturally in target biomes</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Spawn frequency feels balanced</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Combat AI functions correctly</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Loot drops are appropriate</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>No crashes when encountering creature</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Works with other leveled list mods</span>
              </label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: 'Best Practices & Troubleshooting',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700/30 rounded p-4">
            <h4 className="font-bold text-green-300 mb-3">✅ Best Practices</h4>
            
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">1. Always Provide MCM Toggle</p>
                <p className="text-sm text-slate-300">
                  Let users enable/disable your spawns. Some players want lore-friendly only, others want everything.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">2. Document Your Lists</p>
                <p className="text-sm text-slate-300 mb-2">
                  In your README, list which leveled lists you modify. Example:
                </p>
                <div className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 font-mono">
                  <p>Modified Leveled Lists:</p>
                  <p>- EncRadroach (adds MyCreature, count=2, level=1)</p>
                  <p>- EncMoleRat (adds MyCreature, count=3, level=5)</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">3. Test Across DLCs</p>
                <p className="text-sm text-slate-300">
                  Your leveled list might apply to Far Harbor or Nuka-World. Test in all DLC zones if applicable.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">4. Respect Player Level</p>
                <p className="text-sm text-slate-300">
                  Don&apos;t spawn level-50 creatures at level 1. Match difficulty to player progression.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">5. Use Descriptive Naming</p>
                <p className="text-sm text-slate-300">
                  Name your quest/script clearly: <code className="text-orange-300">MyModName_LeveledListInjection</code> (not &quot;Quest01&quot;)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700/30 rounded p-4">
            <h4 className="font-bold text-red-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Common Mistakes
            </h4>
            
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ Editing Vanilla ESP Directly</p>
                <p className="text-xs text-slate-300">Never edit Fallout4.esm or DLC ESMs. Always use overrides or scripts.</p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ Not Testing Multi-Mod Compatibility</p>
                <p className="text-xs text-slate-300">Your mod alone works, but breaks when combined with popular mods? Test with top 20 mods.</p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ Ignoring Spawn Balance</p>
                <p className="text-xs text-slate-300">Count=100 means your creature is EVERYWHERE. Start small (Count=1-3).</p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ No Error Handling in Scripts</p>
                <p className="text-xs text-slate-300">Check if LeveledItem exists before calling AddForm(). Prevent crashes if user has weird setup.</p>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-red-400 mb-1">❌ Forgetting to Set Quest Priority</p>
                <p className="text-xs text-slate-300">Low priority quests run late. Set priority=80 so injection happens before world spawns.</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-700/30 rounded p-4">
            <h4 className="font-bold text-orange-300 mb-3">🔧 Troubleshooting Guide</h4>
            
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Problem: Script doesn&apos;t run</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li><strong>Check:</strong> Quest &quot;Start Game Enabled&quot; = TRUE</li>
                  <li><strong>Check:</strong> Script attached to quest</li>
                  <li><strong>Check:</strong> Properties filled in Creation Kit</li>
                  <li><strong>Check:</strong> F4SE installed (if using F4SE functions)</li>
                  <li><strong>Fix:</strong> Enable Papyrus logging, check for errors</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Problem: Creature spawns but is invisible</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li><strong>Cause:</strong> Missing NIF or texture files</li>
                  <li><strong>Fix:</strong> Verify all meshes/textures are in mod folder</li>
                  <li><strong>Fix:</strong> Check NIF in NifSkope for errors</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Problem: Spawn rate too high/low</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li><strong>Too high:</strong> Reduce Count parameter</li>
                  <li><strong>Too low:</strong> Increase Count, inject into more lists</li>
                  <li><strong>Fix:</strong> Test in 5+ different locations before releasing</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-700 rounded p-3">
                <p className="font-bold text-white mb-2">Problem: Conflicts with other mods</p>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside ml-4">
                  <li><strong>Script injection:</strong> Should auto-merge with others</li>
                  <li><strong>ESP patch:</strong> Create merged patch in FO4Edit</li>
                  <li><strong>Tell users:</strong> Document compatible/incompatible mods</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-4">
            <h4 className="font-bold text-purple-300 mb-2">📚 Further Resources</h4>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
              <li>Creation Kit Wiki: Leveled List documentation</li>
              <li>F4SE Documentation: AddForm() and leveled list functions</li>
              <li>FO4Edit: Leveled list merge tutorials</li>
              <li>Nexus Mods: Search "leveled list" for example implementations</li>
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
          <List className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Leveled List Injection Guide</h1>
            <p className="text-sm text-slate-400">Automatically spawn creatures, NPCs, and plants without hand-placement</p>
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
                    <Icon className="w-5 h-5 text-green-400" />
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
      <div className="p-4 bg-green-900/20 border-t border-slate-700">
        <p className="text-xs text-green-300 text-center">
          💡 Tip: Use script injection for maximum compatibility. ESP patches work but require manual merging with other mods.
        </p>
      </div>
    </div>
  );
};
