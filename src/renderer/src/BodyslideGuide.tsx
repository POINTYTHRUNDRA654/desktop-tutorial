/**
 * Bodyslide Guide Component
 * Comprehensive guide for using Bodyslide in Fallout 4
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { openExternal } from './utils/openExternal';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const BodyslideGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('quickstart');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const NexusLink: React.FC<{ id: number; label: string }> = ({ id, label }) => (
    <a
      href={`https://www.nexusmods.com/fallout4/mods/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#00ff00] hover:text-[#00d000] flex items-center gap-2 font-mono"
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
  };

  const sections: Section[] = [
    {
      id: 'quickstart',
      title: '⚡ Quick Start (5 minutes)',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-[#00ff00] font-mono text-sm">
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">What You Need:</h4>
            <ul className="list-disc list-inside space-y-1 text-[#008000]">
              <li>Bodyslide program</li>
              <li>CBBE body mod</li>
              <li>Bodyslide preset</li>
              <li>Outfit mod with Bodyslide support</li>
              <li>(Optional) Bodyslide patch</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#00d000] font-bold mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000]">
              <li>Vortex → Tools → Bodyslide</li>
              <li>Select Preset (dropdown 1)</li>
              <li>Select Outfit (dropdown 2)</li>
              <li>Click Batch Build</li>
              <li>Leave checkboxes marked → Click Build</li>
              <li>Wait for completion ✓</li>
            </ol>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <p className="text-[#00d000]">💚 Your outfit now has custom body shape!</p>
          </div>
        </div>
      )
    },
    {
      id: 'installation',
      title: '⚙️ Installation & Setup',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Installation Paths</h4>
            <div className="text-xs space-y-1 text-[#008000]">
              <p><span className="text-[#00ff00]">Fallout 4:</span> &lt;game folder&gt;/Data/Tools/BodySlide</p>
              <p><span className="text-[#00ff00]">Skyrim:</span> &lt;game folder&gt;/Data/CalienteTools/BodySlide</p>
              <p className="text-[#00d000] mt-2">⚠️ Always point to REAL game folder, not mod manager folders!</p>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Vortex Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000] text-xs">
              <li>Install Bodyslide mod + enable</li>
              <li>Click "Deploy Mods" button</li>
              <li>Dashboard → "Add Tool"</li>
              <li>Target: BodySlide x64.exe from REAL game folder</li>
              <li>Install body mods + outfits to Vortex</li>
            </ol>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Mod Organizer 2 Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000] text-xs">
              <li>Install Bodyslide mod + enable</li>
              <li>Data tab → add shortcut to BodySlide x64.exe</li>
              <li>Point to REAL game folder (not MO mods folder)</li>
              <li>Install body mods + outfits to MO2</li>
              <li>Launch via MO2 shortcut</li>
            </ol>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">First Launch</h4>
            <p className="text-[#008000] text-xs">Select "Data" folder of Fallout 4 when prompted. Games found in registry will auto-fill. You can change this later in Settings.</p>
          </div>
        </div>
      )
    },
    {
      id: 'downloads',
      title: '📦 Download Links',
      icon: <ExternalLink className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-4 space-y-3">
            <div>
              <p className="text-[#008000] text-xs font-mono mb-1">BODYSLIDE PROGRAM</p>
              <NexusLink id={25} label="Download Bodyslide v5.0+" />
            </div>
            <div>
              <p className="text-[#008000] text-xs font-mono mb-1">BODY MOD (RECOMMENDED)</p>
              <NexusLink id={15} label="Download CBBE Body" />
            </div>
            <div>
              <p className="text-[#008000] text-xs font-mono mb-1">PRESETS</p>
              <NexusLink id={15734} label="Download Bodyslide Preset" />
            </div>
            <div>
              <p className="text-[#008000] text-xs font-mono mb-1">EXAMPLE: GUNNER OUTFIT</p>
              <div className="space-y-1">
                <NexusLink id={44863} label="Gunner Operator Outfit" />
                <NexusLink id={45027} label="Bodyslide for Gunner" />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'interface',
      title: '🎮 Interface Guide',
      icon: <AlertCircle className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <div className="mb-2">
              <span className="text-[#00d000] font-bold">1. Preset Selector</span>
              <p className="text-[#008000] text-xs">Select body shape from dropdown. Auto-adjusts all sliders.</p>
            </div>
            <div className="mb-2">
              <span className="text-[#00d000] font-bold">2. Outfit Selector</span>
              <p className="text-[#008000] text-xs">Choose specific outfit to customize. Leave blank for all.</p>
            </div>
            <div className="mb-2">
              <span className="text-[#00d000] font-bold">3. Batch Build</span>
              <p className="text-[#008000] text-xs">Apply preset to ALL outfits. (Must have "Build Morphs" ✓)</p>
            </div>
            <div className="mb-2">
              <span className="text-[#00d000] font-bold">4. Preview</span>
              <p className="text-[#008000] text-xs">Visual reference (unreliable! Often shows larger proportions)</p>
            </div>
            <div>
              <span className="text-[#00d000] font-bold">5. Build</span>
              <p className="text-[#008000] text-xs">Apply to current outfit only. Use for individual tweaks.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'advanced',
      title: '🔧 Advanced Techniques',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Separate Clothed vs. Nude Bodies</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000]">
              <li>Batch build with main preset (e.g., "Jossie CBBE Body")</li>
              <li>Solo build "CBBE Body (Nude)" with nude preset variant</li>
              <li>Result: Natural transition between clothed/naked</li>
            </ol>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Handling Outfit Conflicts</h4>
            <p className="text-[#008000] mb-2">When two mods affect same outfit:</p>
            <ul className="list-disc list-inside space-y-1 text-[#008000]">
              <li>Batch build will ask which version you want</li>
              <li>Select preferred outfit</li>
              <li>No in-game problems—only one version is active</li>
            </ul>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Essential Checkboxes</h4>
            <p className="text-[#008000]">Always verify before building:</p>
            <ul className="list-disc list-inside space-y-1 text-[#008000]">
              <li>✓ "Build Morphs"</li>
              <li>✓ "Build Meshes\Actors\Characters..."</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'verify-troubleshoot',
      title: '🧪 Verify & Troubleshoot (First Test Loop)',
      icon: <AlertCircle className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Fast verification loop (5–10 minutes)</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000] text-xs">
              <li>Run BodySlide from your mod manager (so it sees the same virtual file system).</li>
              <li>Pick a preset → Batch Build → Build (leave default selections unless you know why).</li>
              <li>Confirm output meshes were written somewhere you control:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>MO2:</strong> check the Overwrite folder or a dedicated “BodySlide Output” mod.</li>
                  <li><strong>Vortex:</strong> confirm deployment and that BodySlide is pointed at the real game folder.</li>
                </ul>
              </li>
              <li>Launch the game and equip the affected outfit; confirm the shape changed.</li>
            </ol>
          </div>

          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Common problems</h4>
            <ul className="list-disc list-inside space-y-1 text-[#008000] text-xs">
              <li><strong>Nothing changes in-game:</strong> output meshes aren’t being used (wrong folder, wrong profile, or another mod overrides them).</li>
              <li><strong>Clipping/exploding meshes:</strong> outfit isn’t made for your body (wrong reference) or missing BodySlide files.</li>
              <li><strong>No sliders / can’t edit body in-game:</strong> you’re thinking of LooksMenu sliders, not BodySlide. BodySlide changes meshes on disk.</li>
              <li><strong>Batch Build prompts a conflict:</strong> pick the outfit variant you actually want active.</li>
            </ul>
          </div>

          <div className="bg-[#001a00] border border-[#004400] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Helpful searches</h4>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 rounded bg-black/40 hover:bg-black/60 text-xs" onClick={() => openNexusSearch('LooksMenu')}>Nexus search: LooksMenu</button>
              <button className="px-3 py-1 rounded bg-black/40 hover:bg-black/60 text-xs" onClick={() => openNexusSearch('BodySlide and Outfit Studio')}>Nexus search: BodySlide</button>
              <button className="px-3 py-1 rounded bg-black/40 hover:bg-black/60 text-xs" onClick={() => openNexusSearch('CBBE')}>Nexus search: CBBE</button>
            </div>
          </div>

        </div>
      )
    },
    {
      id: 'sliders',
      title: '🎚️ Sliders & Customization',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Slider Categories</h4>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Fat Distribution (0-100%)</p>
                <p className="text-[#008000]">Belly, Breast, Buttocks, Thigh, Arm fat sliders</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Muscle Definition (0-100%)</p>
                <p className="text-[#008000]">Arm, Leg, Abdominal, Back, Chest muscle sliders</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Bone Structure</p>
                <p className="text-[#008000]">Shoulder width, Hip width, Torso/Limb proportions</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Body Part Settings Panel</p>
                <p className="text-[#008000]">Fine-tune specific parts: shape, size, position</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Custom Preset Workflow</h4>
            <ol className="list-decimal list-inside space-y-1 text-[#008000] text-xs">
              <li>Start with existing preset as base</li>
              <li>Adjust sliders gradually (5-10% at a time)</li>
              <li>Use Body Part Settings for fine-tuning</li>
              <li>Preview changes (but don't trust it completely)</li>
              <li>Click "Save As" to save custom preset</li>
              <li>Test in-game and adjust if needed</li>
            </ol>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">⚠️ Common Mistakes</h4>
            <ul className="list-disc list-inside space-y-1 text-[#008000] text-xs">
              <li>Maxing all sliders (unrealistic proportions)</li>
              <li>Ignoring bone structure (affects clothing fit)</li>
              <li>Not testing in-game before finalizing</li>
              <li>Forgetting to save custom work</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'workflows',
      title: '📋 Workflows & Tutorials',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          {/* Conversion References */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">🔄 Converting Outfits Between Body Types</h4>
            <p className="text-[#008000] text-xs mb-3">
              Use <span className="text-[#00ff00]">Conversion References</span> in Outfit Studio to morph meshes from one body type to another.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[#008000] text-xs">
              <li><span className="text-[#00ff00]">New Project</span> → Select reference template (e.g., "Vanilla to CBBE")</li>
              <li>Load outfit file to convert</li>
              <li>Delete duplicate body shapes (if any)</li>
              <li><span className="text-[#00ff00]">Slider → Conform All</span> to conform outfit to reference</li>
              <li>Set conversion slider to <span className="text-[#00ff00]">100%</span> → <span className="text-[#00ff00]">Slider → Set Base Shape</span></li>
              <li>Load target body reference (<span className="text-[#00ff00]">File → Load Reference</span>)</li>
              <li>Fix clipping with brush tools</li>
              <li>Multi-select outfit shapes → Right-click → <span className="text-[#00ff00]">Copy Bone Weights</span></li>
              <li><span className="text-[#00ff00]">Export → To NIF With Reference</span></li>
            </ol>
            <p className="text-[#00d000] text-xs mt-2">
              💡 No direct conversion? Use "bridge" conversions: A → B → C
            </p>
          </div>

          {/* Creating Projects */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">🛠️ Creating BodySlide Projects</h4>
            <p className="text-[#008000] text-xs mb-3">
              Turn converted outfits into BodySlide projects with slider support.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[#008000] text-xs">
              <li><span className="text-[#00ff00]">New Project</span> → Select body with sliders (e.g., "CBBE Body")</li>
              <li>Load your converted outfit</li>
              <li>Delete duplicate body shapes</li>
              <li>Fix any base shape clipping</li>
              <li><span className="text-[#00ff00]">Slider → Conform All</span></li>
              <li>(Optional) Fix slider clipping: Select shape → Click Edit on slider → Brush fixes</li>
              <li>Multi-select all outfit shapes → <span className="text-[#00ff00]">Copy Bone Weights</span></li>
              <li><span className="text-[#00ff00]">File → Save Project As...</span> → Fill all fields</li>
              <li>Set up groups in Group Manager (top-right)</li>
              <li>Test in BodySlide!</li>
            </ol>
            <div className="bg-black/30 rounded p-2 mt-2">
              <p className="text-[#00ff00] text-xs font-bold">Project Files:</p>
              <ul className="text-[#008000] text-xs space-y-1 mt-1">
                <li>SliderSets/*.osp</li>
                <li>ShapeData/YourProject/*.osd</li>
                <li>ShapeData/YourProject/*.nif</li>
                <li>SliderGroups/*.xml</li>
              </ul>
            </div>
          </div>

          {/* Copying Bone Weights */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">🦴 Copying Bone Weights</h4>
            <p className="text-[#008000] text-xs mb-3">
              Bone weights control how meshes animate. Copy from reference to ensure correct movement.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[#008000] text-xs">
              <li><span className="text-[#00ff00]">New Project</span> in Outfit Studio</li>
              <li>Choose reference with correct weights (usually body mesh)</li>
              <li>Load target outfit</li>
              <li>Multi-select all shapes needing weights</li>
              <li><span className="text-[#00ff00]">Method A:</span> Shape → Copy Bone Weights (all bones)</li>
              <li><span className="text-[#00ff00]">Method B:</span> Bones tab → Select specific bones → Copy Selected Weights</li>
              <li>Configure copy settings (default usually fine)</li>
              <li>Export or save project</li>
            </ol>
          </div>

          {/* Adding Zaps */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">✂️ Adding Zaps (Remove Parts)</h4>
            <p className="text-[#008000] text-xs mb-3">
              <span className="text-[#00ff00]">Zaps</span> remove mesh parts during builds. Use for optional parts (hoods, sleeves) or hidden body cleanup.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[#008000] text-xs">
              <li>Load existing project in Outfit Studio</li>
              <li>Select <span className="text-[#00ff00]">Mask Brush</span> from toolbar</li>
              <li>Mask areas to <span className="text-[#00ff00]">KEEP</span> (masked = stays, unmasked = zapped)</li>
              <li>(Optional) <span className="text-[#00ff00]">Tool → Invert Mask</span> to flip selection</li>
              <li><span className="text-[#00ff00]">Slider → New Zap Slider</span> → Name it</li>
              <li>(Optional) Edit mode → Use brushes to refine zap areas</li>
              <li><span className="text-[#00ff00]">Hidden Zaps:</span> Edit mode → TAB → Set default to 100 + check "Hidden"</li>
              <li>Save project</li>
            </ol>
            <p className="text-[#00d000] text-xs mt-2">
              📌 Zaps only preview in Outfit Studio—BodySlide actually removes parts during builds
            </p>
          </div>

          {/* Quick Reference */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">⚡ Quick Reference</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Slider → Conform All</p>
                <p className="text-[#008000]">Apply reference sliders to outfit</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Slider → Set Base Shape</p>
                <p className="text-[#008000]">Make slider value the default</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">File → Load Reference</p>
                <p className="text-[#008000]">Load template or project as reference</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Copy Bone Weights</p>
                <p className="text-[#008000]">Copy animation data to outfit</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Export → To NIF With Reference</p>
                <p className="text-[#008000]">Export conversion result</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Save Project As</p>
                <p className="text-[#008000]">Create BodySlide project</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: '⚙️ Settings & Configuration',
      icon: <AlertCircle className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Game Settings</h4>
            <div className="text-xs space-y-2 text-[#008000]">
              <div>
                <p className="text-[#00ff00]">Target Game:</p>
                <p>Select Fallout 4 (or your game). Changes data path + skeleton.</p>
              </div>
              <div>
                <p className="text-[#00ff00]">Game Data Path:</p>
                <p>Points to game's Data folder. Must be correct for builds to work.</p>
              </div>
              <div>
                <p className="text-[#00ff00]">Output Path (Advanced):</p>
                <p>Optional override for where files are built. Leave empty for default.</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">General Settings</h4>
            <div className="text-xs space-y-2 text-[#008000]">
              <div>
                <p className="text-[#00ff00]">Override Warning:</p>
                <p>Shows dialog when batch build has conflicts. Keep enabled!</p>
              </div>
              <div>
                <p className="text-[#00ff00]">BSA Textures:</p>
                <p>Scan archives for textures. Disable for better performance.</p>
              </div>
              <div>
                <p className="text-[#00ff00]">Data Files:</p>
                <p>Select BSA/BA2 archives to scan. Keep minimal for speed.</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Advanced (Config.xml)</h4>
            <div className="text-xs text-[#008000]">
              <p className="text-[#00ff00]">SliderMinimum/Maximum:</p>
              <p>Extend slider range beyond 0-100. Causes clipping—not supported!</p>
              <p className="text-[#00d000] mt-2">⚠️ Edit Config.xml directly for these options</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'shortcuts',
      title: '⌨️ Keyboard Shortcuts',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">BodySlide</h4>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Building</p>
                <div className="text-[#008000] space-y-1 ml-2">
                  <p><span className="text-[#00d000]">CTRL + Click Build:</span> Build to working directory</p>
                  <p><span className="text-[#00d000]">CTRL + Click Batch:</span> Select target directory</p>
                  <p><span className="text-[#00d000]">ALT + Click Build:</span> Delete target files</p>
                  <p><span className="text-[#00d000]">ALT + Click Batch:</span> Delete all batch targets</p>
                </div>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Rendering</p>
                <div className="text-[#008000] space-y-1 ml-2">
                  <p><span className="text-[#00d000]">W:</span> Toggle wireframe</p>
                  <p><span className="text-[#00d000]">T:</span> Toggle textures</p>
                  <p><span className="text-[#00d000]">L:</span> Toggle lighting</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">Outfit Studio</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold mb-1">Projects</p>
                <div className="text-[#008000] space-y-1">
                  <p><span className="text-[#00d000]">CTRL+N:</span> New Project</p>
                  <p><span className="text-[#00d000]">CTRL+O:</span> Load Project</p>
                  <p><span className="text-[#00d000]">CTRL+S:</span> Save Project</p>
                </div>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold mb-1">Shapes</p>
                <div className="text-[#008000] space-y-1">
                  <p><span className="text-[#00d000]">Del:</span> Delete shape</p>
                  <p><span className="text-[#00d000]">F2:</span> Rename shape</p>
                  <p><span className="text-[#00d000]">G:</span> Toggle visibility</p>
                </div>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold mb-1">Brushing</p>
                <div className="text-[#008000] space-y-1">
                  <p><span className="text-[#00d000]">0-8:</span> Select brush</p>
                  <p><span className="text-[#00d000]">S+Wheel:</span> Brush size</p>
                  <p><span className="text-[#00d000]">CTRL+Z/Y:</span> Undo/Redo</p>
                  <p><span className="text-[#00d000]">CTRL+A:</span> Clear mask</p>
                  <p><span className="text-[#00d000]">CTRL+I:</span> Invert mask</p>
                </div>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold mb-1">Editing</p>
                <div className="text-[#008000] space-y-1">
                  <p><span className="text-[#00d000]">X:</span> X-Mirror</p>
                  <p><span className="text-[#00d000]">C:</span> Edit Connected</p>
                  <p><span className="text-[#00d000]">B:</span> Brush Collision</p>
                  <p><span className="text-[#00d000]">F:</span> Transform Tool</p>
                  <p><span className="text-[#00d000]">Q:</span> Vertex Select</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'brushes',
      title: '🖌️ Brushes & Tools',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Brush Tools</h4>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[#00ff00] font-bold">1. Mask Brush</p>
                  <p className="text-[#008000]">Protect areas from editing</p>
                  <p className="text-[#00d000]">ALT = erase mask</p>
                </div>
                <div>
                  <p className="text-[#00ff00] font-bold">2. Inflate Brush</p>
                  <p className="text-[#008000]">Push toward camera</p>
                  <p className="text-[#00d000]">ALT = deflate</p>
                </div>
                <div>
                  <p className="text-[#00ff00] font-bold">3. Deflate Brush</p>
                  <p className="text-[#008000]">Push away from camera</p>
                </div>
                <div>
                  <p className="text-[#00ff00] font-bold">4. Move Brush</p>
                  <p className="text-[#008000]">Pull in direction (2D)</p>
                </div>
                <div>
                  <p className="text-[#00ff00] font-bold">5. Smooth Brush</p>
                  <p className="text-[#008000]">Even out vertices</p>
                </div>
                <div>
                  <p className="text-[#00ff00] font-bold">6. Weight Brush</p>
                  <p className="text-[#008000]">Edit bone weights</p>
                  <p className="text-[#00d000]">Blue=weak, Red=strong</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Transform & Vertex Tools</h4>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Transform Tool (F)</p>
                <p className="text-[#008000]">Arrows=move, Circles=rotate, Cubes=scale</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Vertex Selection (Q)</p>
                <p className="text-[#008000]">Drag to select, CTRL+Drag to deselect</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Mesh Editing</p>
                <div className="text-[#008000] ml-2 space-y-1">
                  <p><span className="text-[#00d000]">Collapse Vertex:</span> Delete vertex (≤3 connections)</p>
                  <p><span className="text-[#00d000]">Flip Edge:</span> Reverse edge orientation</p>
                  <p><span className="text-[#00d000]">Split Edge:</span> Add vertex at midpoint</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Brush Options</h4>
            <div className="text-xs space-y-1 text-[#008000]">
              <p><span className="text-[#00ff00]">X-Mirror (X):</span> Mirror actions across X-axis</p>
              <p><span className="text-[#00ff00]">Edit Connected (C):</span> Only affect connected vertices</p>
              <p><span className="text-[#00ff00]">Global Collision (B):</span> Brush affects all selected shapes</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'advanced-editing',
      title: '🔬 Advanced Mesh Editing',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-4 text-sm text-[#00ff00] font-mono">
          {/* Shape Properties */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Shape Properties</h4>
            <p className="text-[#008000] text-xs mb-2">Double-click shape or Shape → Properties</p>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Shader Tab</p>
                <p className="text-[#008000]">Materials, textures, transparency, specular/emissive</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Geometry Tab</p>
                <p className="text-[#008000]">Full precision, sub-index, skinned toggle</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Extra Data Tab</p>
                <p className="text-[#008000]">NiStringExtraData, NiIntegerExtraData</p>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Coordinates Tab</p>
                <p className="text-[#008000]">Global-to-skin transforms (set to 0,0,0)</p>
              </div>
            </div>
          </div>

          {/* Merging Geometry */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Merging Geometry</h4>
            <p className="text-[#008000] text-xs mb-2">Shape → Merge Geometry...</p>
            <div className="text-xs space-y-1 text-[#008000]">
              <p><span className="text-[#00d000]">Requirements:</span> Same shaders, textures, partitions, segments</p>
              <p><span className="text-[#00d000]">Result:</span> Two shapes combined into one</p>
              <p><span className="text-[#00d000]">Option:</span> Keep or delete source shape</p>
            </div>
          </div>

          {/* Mesh Editing Techniques */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-3">Mesh Editing Techniques</h4>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[#00ff00] font-bold">Collapse Vertex (4+ connections)</p>
                <ol className="text-[#008000] ml-4 space-y-1">
                  <li>1. Flip edges to reduce to 3 connections</li>
                  <li>2. Collapse vertex</li>
                </ol>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Close One-Triangle Hole</p>
                <ol className="text-[#008000] ml-4 space-y-1">
                  <li>1. Pick corner vertex</li>
                  <li>2. Flip edges 3× to reduce connections</li>
                  <li>3. Collapse vertex</li>
                  <li>4. Split + flip to clean up</li>
                </ol>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Create Hole</p>
                <ol className="text-[#008000] ml-4 space-y-1">
                  <li>1. Split edge 2× to create center vertex</li>
                  <li>2. Flip + collapse extra vertex</li>
                  <li>3. Mask center, invert, delete vertices</li>
                </ol>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Fix Texture Distortion</p>
                <ol className="text-[#008000] ml-4 space-y-1">
                  <li>1. Collapse unwanted vertices</li>
                  <li>2. Flip edges for regular triangulation</li>
                  <li>3. Move vertices to grid</li>
                  <li>4. Fix UV coordinates</li>
                </ol>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Refine Low-Poly Area</p>
                <ol className="text-[#008000] ml-4 space-y-1">
                  <li>1. Split diagonal edges (doubles vertices)</li>
                  <li>2. Split horizontal/vertical (doubles again)</li>
                  <li>3. Flip edges to shorten</li>
                  <li>4. Check slider smoothness</li>
                </ol>
              </div>
              <div>
                <p className="text-[#00ff00] font-bold">Smooth by Edge-Flipping</p>
                <p className="text-[#008000] ml-4">Flip long edges to make them shorter. Shorter edges = smoother curves</p>
              </div>
            </div>
          </div>

          {/* Reference Templates */}
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">Reference Templates</h4>
            <p className="text-[#008000] text-xs mb-2">Define in RefTemplates.xml</p>
            <div className="bg-black/30 rounded p-2 text-xs">
              <p className="text-[#00ff00]">&lt;Template sourcefile="SliderSets\CBBE.osp"</p>
              <p className="text-[#00ff00] ml-4">set="CBBE Body"</p>
              <p className="text-[#00ff00] ml-4">shape="CBBE"&gt;</p>
              <p className="text-[#00ff00] ml-2">CBBE Body</p>
              <p className="text-[#00ff00]">&lt;/Template&gt;</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: '🔨 Troubleshooting',
      icon: <AlertCircle className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="space-y-3 text-sm">
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">❌ Texture Problems on Clothes</h4>
            <div className="text-[#008000] space-y-1 text-xs font-mono">
              <p><span className="text-[#00ff00]">Body-Outfit Mismatch:</span> Use same body type for both</p>
              <p><span className="text-[#00ff00]">Missing Body Mod:</span> Install required body mod first</p>
              <p><span className="text-[#00ff00]">Race Mod Issue:</span> Get patches from Nexus for that race</p>
              <p><span className="text-[#00ff00]">Corrupted Files:</span> Uninstall and reinstall outfit</p>
              <p><span className="text-[#00ff00]">No Bodyslide Support:</span> Find fan-made patch on Nexus</p>
            </div>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">❌ Program Won't Launch</h4>
            <ul className="list-disc list-inside text-[#008000] space-y-1 text-xs font-mono">
              <li>Reinstall Bodyslide program via Vortex</li>
              <li>Verify Fallout 4 selected in initial setup</li>
              <li>Refresh Vortex Tools section</li>
            </ul>
          </div>
          <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-3">
            <h4 className="text-[#00d000] font-bold mb-2">❌ Changes Not in Game</h4>
            <ul className="list-disc list-inside text-[#008000] space-y-1 text-xs font-mono">
              <li>Verify "Build Morphs" is checked ✓</li>
              <li>Verify "Meshes\Actors\..." is checked ✓</li>
              <li>Restart game completely (not just reload)</li>
              <li>Check outfit mod is enabled in Vortex</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: '💡 Pro Tips',
      icon: <CheckCircle2 className="w-5 h-5 text-[#00ff00]" />,
      content: (
        <div className="bg-[#0a0e0a] border border-[#00d000] rounded p-4 space-y-2 text-[#00ff00] font-mono text-sm">
          <div className="flex items-start gap-2">
            <span className="text-[#00d000]">✓</span>
            <div>
              <p className="font-bold">Batch build everything at once</p>
              <p className="text-[#008000] text-xs">Faster and ensures consistency across all outfits</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00d000]">✓</span>
            <div>
              <p className="font-bold">Solo build nude body separately</p>
              <p className="text-[#008000] text-xs">Makes clothed-to-naked transition look more natural</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00d000]">✓</span>
            <div>
              <p className="font-bold">Don't trust preview</p>
              <p className="text-[#008000] text-xs">Preview often shows larger proportions than actual in-game</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00d000]">✓</span>
            <div>
              <p className="font-bold">Save custom presets</p>
              <p className="text-[#008000] text-xs">Reuse good slider configurations for consistency</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#00d000]">✓</span>
            <div>
              <p className="font-bold">Always restart game fully</p>
              <p className="text-[#008000] text-xs">Don't just load save—close and reopen the game</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0a0e0a]" style={{ color: '#00ff00' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#1a3a1a] to-[#0a0e0a] border-b-2 border-[#00d000] px-6 py-4">
        <h1 className="text-2xl font-bold font-mono tracking-wider mb-1">BODYSLIDE FOR FALLOUT 4</h1>
        <p className="text-[#008000] text-sm font-mono">Complete guide to customizing body shapes and outfits</p>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-[#1a3a1a] border-l-4 border-[#00d000] rounded p-4 mb-6">
          <p className="text-[#00ff00] font-mono text-sm mb-2">
            Bodyslide is an essential tool for customizing body shapes and proportions in Fallout 4. This guide covers installation, usage, and troubleshooting.
          </p>
          <p className="text-[#008000] font-mono text-xs">
            📖 Guide by Lindeboombier | Updated January 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-[#0a0e0a] border border-[#00d000] rounded overflow-hidden transition-all hover:border-[#00ff00]"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1a3a1a] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <h2 className="text-lg font-bold font-mono">{section.title}</h2>
                </div>
                <div className="text-[#00d000]">
                  {expandedSection === section.id ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>

              {/* Section Content */}
              {expandedSection === section.id && (
                <div className="px-6 py-4 bg-[#0a0e0a] border-t border-[#00d000]">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-[#1a3a1a] border border-[#00d000] rounded p-6">
          <h3 className="text-lg font-bold font-mono text-[#00d000] mb-4">❓ FAQ</h3>
          <div className="space-y-4 text-sm text-[#00ff00] font-mono">
            <div>
              <p className="text-[#00d000] font-bold">Do I need CBBE specifically?</p>
              <p className="text-[#008000]">No, other bodies work too (Zex Fusion Girl, etc.), but ensure outfit supports your chosen body.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Can I use different presets for different outfits?</p>
              <p className="text-[#008000]">Yes! Build each outfit individually with different presets selected.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Will Bodyslide affect textures?</p>
              <p className="text-[#008000]">No, Bodyslide only changes shape/morphs, not textures or colors.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Why does my body look different in-game?</p>
              <p className="text-[#008000]">Preview shows larger proportions than actual in-game. Always verify in-game.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Can I create custom bodies from scratch?</p>
              <p className="text-[#008000]">Yes, but start with a preset as base. Use "Save As" to save custom configurations.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Can I revert to original body?</p>
              <p className="text-[#008000]">Yes! Select default vanilla preset or reinstall base body mod without modifications.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">What's the difference between Build and Batch Build?</p>
              <p className="text-[#008000]">Build = current outfit only. Batch Build = all supported outfits at once.</p>
            </div>
            <div>
              <p className="text-[#00d000] font-bold">Can I use Bodyslide on console?</p>
              <p className="text-[#008000]">No, Bodyslide is PC-only. Console players must use pre-made body mods.</p>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 bg-[#0a0e0a] border border-[#00d000] rounded p-6">
          <h3 className="text-lg font-bold font-mono text-[#00d000] mb-4">📚 Full Documentation</h3>
          <div className="space-y-2 text-sm font-mono">
            <p className="text-[#00ff00]">For complete details, see:</p>
            <ul className="list-disc list-inside text-[#008000] space-y-1">
              <li>BODYSLIDE_COMPLETE_GUIDE.md (detailed walkthrough)</li>
              <li>BODYSLIDE_QUICK_START.md (5-minute summary)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[#008000] font-mono text-xs">
          <p>Guide created for Fallout 4 modding community</p>
          <p>Last updated: January 24, 2026</p>
        </div>
      </div>
    </div>
  );
};

export default BodyslideGuide;
