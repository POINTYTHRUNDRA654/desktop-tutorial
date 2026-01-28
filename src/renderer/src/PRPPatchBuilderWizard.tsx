import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, GitMerge, Send, ShieldCheck, Wrench } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

type State = {
  yourModName: string;
  otherModName: string;
  targetWorldspace: 'Commonwealth' | 'Far Harbor' | 'Nuka-World' | 'Other';
  otherWorldspaceText: string;
  modManager: 'MO2' | 'Vortex' | 'Other' | 'Unknown';
  otherManagerText: string;
  patchShipsMergedFiles: boolean;
  includeNexusBlock: boolean;
  yourEdits: {
    addsObjects: boolean;
    movesOrDeletesVanilla: boolean;
    landscapeOrWater: boolean;
  };
  notes: string;
};

const STORAGE_KEY = 'mossy_prp_patch_builder_state_v1';
const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';

const DEFAULT_STATE: State = {
  yourModName: '',
  otherModName: '',
  targetWorldspace: 'Commonwealth',
  otherWorldspaceText: '',
  modManager: 'Unknown',
  otherManagerText: '',
  patchShipsMergedFiles: true,
  includeNexusBlock: true,
  yourEdits: {
    addsObjects: true,
    movesOrDeletesVanilla: false,
    landscapeOrWater: false,
  },
  notes: '',
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const CheckboxRow: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-black/40 p-3 cursor-pointer hover:border-slate-600 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 accent-emerald-500"
    />
    <div className="min-w-0">
      <div className="text-xs font-black text-white">{label}</div>
      {hint ? <div className="text-[11px] text-slate-400 mt-1">{hint}</div> : null}
    </div>
  </label>
);

const InputLabel: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div>
    <div className="text-xs font-black tracking-widest uppercase text-slate-400">{label}</div>
    {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    <div className="mt-2">{children}</div>
  </div>
);

export const PRPPatchBuilderWizard: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>(() => safeParse(localStorage.getItem(STORAGE_KEY), DEFAULT_STATE));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const worldspaceLabel =
    state.targetWorldspace === 'Other'
      ? (state.otherWorldspaceText.trim() || 'Other')
      : state.targetWorldspace;

  const modManagerLabel =
    state.modManager === 'Other'
      ? (state.otherManagerText.trim() || 'Other')
      : state.modManager;

  const needsRebuild = useMemo(() => {
    const e = state.yourEdits;
    return e.addsObjects || e.movesOrDeletesVanilla || e.landscapeOrWater;
  }, [state.yourEdits]);

  const patchTitle = useMemo(() => {
    const your = state.yourModName.trim() || 'Your Mod';
    const other = state.otherModName.trim() || 'PRP / Other Precombine Mod';
    return `PRP Compatibility Patch — ${your} + ${other}`;
  }, [state.yourModName, state.otherModName]);

  const buildReadme = () => {
    const your = state.yourModName.trim() || 'Your Mod';
    const other = state.otherModName.trim() || 'Other Mod';

    const lines: string[] = [];
    lines.push(patchTitle);
    lines.push('');
    lines.push('What this patch is:');
    lines.push('- A compatibility patch for precombines in Fallout 4.');
    lines.push('- Built for the following combo:');
    lines.push(`  - ${other}`);
    lines.push(`  - ${your}`);
    lines.push('');

    lines.push('Target worldspace:');
    lines.push(`- ${worldspaceLabel}`);
    lines.push('');

    lines.push('When you need this:');
    lines.push('- If both mods touch the same exterior cells and ship/require precombine rebuilds.');
    lines.push('');

    lines.push('Requirements:');
    lines.push(`- A mod manager: ${modManagerLabel}`);
    lines.push(`- ${other}`);
    lines.push(`- ${your}`);
    lines.push('- PRP (if required by the other mod / your workflow)');
    lines.push('');

    lines.push('Install / Load Order:');
    lines.push('1) PRP (if used)');
    lines.push(`2) ${other}`);
    lines.push(`3) ${your}`);
    lines.push(`4) THIS PATCH (last)`);
    lines.push('');

    lines.push('What is included in this patch:');
    lines.push('- Patch plugin (ESP/ESL)');
    lines.push(
      state.patchShipsMergedFiles
        ? '- Merged precombine files (Meshes\\Precombined\\...) for the affected cells'
        : '- NOTE: This patch does NOT ship merged precombine files (not recommended unless you know exactly why)'
    );
    lines.push('');

    lines.push('Build notes (for maintainers):');
    lines.push('- This patch must be built against the same load order stated above.');
    lines.push('- Rebuild/merge precombines using PRP conflict/merge mode with all involved plugins present.');
    lines.push('');

    lines.push('Verification:');
    lines.push('- Test in a clean profile with ONLY the required mods + this patch.');
    lines.push('- Visit the affected areas; rotate the camera; confirm nothing pops in/out or disappears.');
    lines.push('- Confirm performance didn’t tank in those areas.');
    lines.push('');

    lines.push('Do I need to rebuild precombines for my mod?');
    lines.push(needsRebuild ? '- YES (you made exterior placement/landscape edits).' : '- Probably NO (no exterior placement/landscape edits selected).');
    lines.push('');

    if (state.notes.trim()) {
      lines.push('Extra notes:');
      lines.push(state.notes.trim());
      lines.push('');
    }

    lines.push('Generated by Mossy.Space — PRP Patch Builder');

    return lines.join('\n');
  };

  const buildNexusDescription = () => {
    const your = state.yourModName.trim() || 'Your Mod';
    const other = state.otherModName.trim() || 'Other Mod';

    const lines: string[] = [];
    lines.push('## Requirements');
    lines.push(`- ${other}`);
    lines.push(`- ${your}`);
    lines.push('- PRP (if required by the other mod / your workflow)');
    lines.push('');

    lines.push('## Install');
    lines.push(`- Install with ${modManagerLabel} (or your preferred manager).`);
    lines.push('- Activate the patch and ensure it loads after both mods.');
    lines.push('');

    lines.push('## Load Order');
    lines.push('1) PRP (if used)');
    lines.push(`2) ${other}`);
    lines.push(`3) ${your}`);
    lines.push('4) This patch (last)');
    lines.push('');

    lines.push('## Compatibility');
    lines.push(`- Target worldspace: ${worldspaceLabel}`);
    lines.push(
      state.patchShipsMergedFiles
        ? '- Includes merged precombine files for affected cells'
        : '- Does NOT include merged precombine files (advanced use only)'
    );
    lines.push('- Built for the specific combo listed in Requirements.');
    lines.push('');

    lines.push('## Verification');
    lines.push('- Test in a clean profile with ONLY the required mods + this patch.');
    lines.push('- Visit affected areas; rotate the camera; confirm nothing disappears or flickers.');
    lines.push('- Confirm performance is stable in those areas.');
    lines.push('');

    if (state.notes.trim()) {
      lines.push('## Notes');
      lines.push(state.notes.trim());
      lines.push('');
    }

    return lines.join('\n');
  };

  const buildChatPrefill = () => {
    const readme = buildReadme();
    const nexus = state.includeNexusBlock ? buildNexusDescription() : '';
    const lines: string[] = [];
    lines.push("I'm using Mossy's PRP Patch Builder. Please help me confirm my compatibility plan step-by-step.");
    lines.push('');
    lines.push('Here is my draft patch README:');
    lines.push('');
    lines.push(readme);
    if (state.includeNexusBlock) {
      lines.push('');
      lines.push('Here is my Nexus description block:');
      lines.push('');
      lines.push(nexus);
    }
    lines.push('');
    lines.push('What I want from you:');
    lines.push('1) Tell me whether I actually need a precombine rebuild for my edit type.');
    lines.push('2) Tell me the exact patch target combo and the safest load order.');
    lines.push('3) Give me a minimal verification checklist (cells/areas + what to look for).');
    return lines.join('\n');
  };

  const copyReadme = async () => {
    const text = buildReadme();
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  const copyNexus = async () => {
    const text = buildNexusDescription();
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  const copyAll = async () => {
    const parts: string[] = [];
    parts.push(buildReadme());
    if (state.includeNexusBlock) {
      parts.push('');
      parts.push('---');
      parts.push('');
      parts.push(buildNexusDescription());
    }

    const text = parts.join('\n');
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }
  };

  const sendToChat = async () => {
    const draft = buildChatPrefill();
    try {
      await navigator.clipboard?.writeText(draft);
    } catch {
      // ignore
    }
    try {
      localStorage.setItem(CHAT_PREFILL_KEY, draft);
    } catch {
      // ignore
    }
    navigate('/chat', { state: { prefill: draft, from: 'prp-patch-builder' } });
  };

  return (
    <div className="min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • PRP Patching</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">PRP Patch Builder</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Generate a clear patch target (mods + load order) and a ready-to-post README for PRP compatibility patches.
              This is designed to avoid the common mistake of shipping “just an ESP” without merged precombine files.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/precombine-prp"
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
              title="Open the Precombine & PRP Guide"
            >
              PRP Guide
            </Link>
            <Link
              to="/platforms"
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
              title="Back to Platforms"
            >
              Platforms
            </Link>
            <button
              type="button"
              onClick={sendToChat}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
              title="Send the generated plan to Chat"
            >
              <Send className="w-4 h-4" />
              Send to Chat
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setState(DEFAULT_STATE);
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 hover:bg-red-900/30 transition-colors"
              title="Reset"
            >
              Reset
            </button>
          </div>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This wizard generates a patch plan + README. Building the actual PRP compatibility output typically requires external tooling (xEdit and PRP workflow)."
          tools={[
            { label: 'Nexus search: PRP', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=PRP&gsearchtype=mods', kind: 'search', note: 'Search for “Previsibines Repair Pack (PRP)”.' },
            { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search' },
          ]}
          verify={[
            'Fill in “Your mod” + “Other mod” and confirm the README updates.',
            'Copy the README and confirm the clipboard has the full text.',
            'Use “Send to Chat” and confirm the generated plan is prefilled.'
          ]}
          firstTestLoop={[
            'Generate the README → build the patch with your PRP workflow → install into a clean test profile.',
            'Verify in the target worldspace: rotate camera, look for pop-in/out, and test affected cells.'
          ]}
          troubleshooting={[
            'If you ship only an ESP without required merged precombine files, you will likely get visual breakage; re-check the “ships merged files” toggle.',
            'If you are unsure whether you need a rebuild, use the PRP Guide and treat exterior edits as high risk.'
          ]}
          shortcuts={[
            { label: 'PRP Guide', to: '/precombine-prp' },
            { label: 'Platforms Hub', to: '/platforms' },
            { label: 'Install Wizard', to: '/install-wizard' },
            { label: 'Tool Settings', to: '/settings/tools' },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-black/40 p-5 space-y-6">
            <div className="flex items-center gap-3">
              <GitMerge className="w-5 h-5 text-emerald-300" />
              <div className="text-sm font-black text-white tracking-tight">Patch Target</div>
            </div>

            <InputLabel label="Your mod name" hint="Example: MySettlementOverhaul">
              <input
                value={state.yourModName}
                onChange={(e) => setState((s) => ({ ...s, yourModName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
                placeholder="Your mod"
              />
            </InputLabel>

            <InputLabel label="Other mod / PRP pack name" hint="The mod you want compatibility with (e.g., PRP base rebuild, a worldspace overhaul, etc.)">
              <input
                value={state.otherModName}
                onChange={(e) => setState((s) => ({ ...s, otherModName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
                placeholder="Other mod"
              />
            </InputLabel>

            <InputLabel label="Target worldspace">
              <div className="flex gap-2 flex-wrap">
                {(['Commonwealth', 'Far Harbor', 'Nuka-World', 'Other'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, targetWorldspace: w }))}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                      state.targetWorldspace === w
                        ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              {state.targetWorldspace === 'Other' ? (
                <input
                  value={state.otherWorldspaceText}
                  onChange={(e) => setState((s) => ({ ...s, otherWorldspaceText: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
                  placeholder="Worldspace name"
                />
              ) : null}
            </InputLabel>

            <InputLabel label="Mod manager">
              <div className="flex gap-2 flex-wrap">
                {(['MO2', 'Vortex', 'Other', 'Unknown'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, modManager: m }))}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                      state.modManager === m
                        ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {state.modManager === 'Other' ? (
                <input
                  value={state.otherManagerText}
                  onChange={(e) => setState((s) => ({ ...s, otherManagerText: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
                  placeholder="Mod manager name"
                />
              ) : null}
            </InputLabel>

            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Your edits</div>
              <div className="text-[11px] text-slate-500 mt-1">These determine whether you likely need a rebuild.</div>
              <div className="mt-3 space-y-2">
                <CheckboxRow
                  checked={state.yourEdits.addsObjects}
                  onChange={(checked) => setState((s) => ({ ...s, yourEdits: { ...s.yourEdits, addsObjects: checked } }))}
                  label="Adds objects to existing exterior cells"
                  hint="Even one placed object can break the precombine group for that cell."
                />
                <CheckboxRow
                  checked={state.yourEdits.movesOrDeletesVanilla}
                  onChange={(checked) => setState((s) => ({ ...s, yourEdits: { ...s.yourEdits, movesOrDeletesVanilla: checked } }))}
                  label="Moves / deletes / disables vanilla objects"
                  hint="High likelihood of breaking precombines in the touched cells."
                />
                <CheckboxRow
                  checked={state.yourEdits.landscapeOrWater}
                  onChange={(checked) => setState((s) => ({ ...s, yourEdits: { ...s.yourEdits, landscapeOrWater: checked } }))}
                  label="Landscape or water edits"
                  hint="Often requires precombine/previs rebuild in affected cells."
                />
              </div>
            </div>

            <CheckboxRow
              checked={state.patchShipsMergedFiles}
              onChange={(checked) => setState((s) => ({ ...s, patchShipsMergedFiles: checked }))}
              label="Patch ships merged precombine files"
              hint="Recommended: most PRP compatibility patches must include merged precombine NIF files, not just a plugin."
            />

            <CheckboxRow
              checked={state.includeNexusBlock}
              onChange={(checked) => setState((s) => ({ ...s, includeNexusBlock: checked }))}
              label="Generate Nexus description block"
              hint="Adds a copy-ready section formatted for a Nexus file description (Requirements / Load Order / Compatibility)."
            />

            <InputLabel label="Notes" hint="Optional: conflicts, affected locations, special install notes">
              <textarea
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
                placeholder="Example: Conflicts around Sanctuary + Red Rocket exterior cells..."
              />
            </InputLabel>
          </div>

          <div className="rounded-xl border border-slate-800 bg-black/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div className="text-sm font-black text-white tracking-tight">Generated README</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyAll}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                  title="Copy README + Nexus block"
                >
                  <Copy className="w-4 h-4" />
                  Copy all
                </button>
                <button
                  type="button"
                  onClick={copyReadme}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
                  title="Copy README"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-black/60 p-4">
              <pre className="text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">{buildReadme()}</pre>
            </div>

            {state.includeNexusBlock ? (
              <>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-emerald-300" />
                    <div className="text-sm font-black text-white tracking-tight">Nexus Description Block</div>
                  </div>
                  <button
                    type="button"
                    onClick={copyNexus}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
                    title="Copy Nexus block"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <div className="rounded-lg border border-slate-800 bg-black/60 p-4">
                  <pre className="text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">{buildNexusDescription()}</pre>
                </div>
              </>
            ) : null}

            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Quick Result
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                Likely rebuild needed: <span className={`font-black ${needsRebuild ? 'text-yellow-200' : 'text-emerald-200'}`}>{needsRebuild ? 'YES' : 'NO'}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                This is heuristic guidance; PRP analysis is the definitive check.
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Tip: If you want a more detailed “what cells are affected” workflow, open <Link className="text-blue-400 hover:underline" to="/precombine-checker">Precombine Checker</Link>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRPPatchBuilderWizard;
