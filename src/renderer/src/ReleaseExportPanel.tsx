/**
 * ReleaseExportPanel — Step 5 of the FO4 Packaging & Release Hub
 *
 * Covers:
 *  - Release zip construction guidance
 *  - Release notes / changelog builder (copy-to-clipboard)
 *  - One-click links to Nexus Mods upload and Bethesda.net upload
 *  - Version bump assistant
 *  - Final pre-publish sanity checklist
 */

import React, { useState } from 'react';
import {
  Rocket,
  FileText,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Package,
  Tag,
  Globe,
  Shield,
} from 'lucide-react';
import { openExternal } from './utils/openExternal';

const openUrl = (url: string) => void openExternal(url);

// ─── Release Notes Builder ───────────────────────────────────────────────────

interface ReleaseNotesState {
  modName: string;
  version: string;
  gameVersion: 'OG' | 'NG' | 'Both';
  ba2Header: 'V1' | 'V2' | 'Both';
  summary: string;
  whatsNew: string;
  requirements: string;
  knownIssues: string;
  installNotes: string;
  saveCompatibility: 'safe' | 'not-safe' | 'clean-save-needed';
  distribution: 'nexus' | 'bethesda' | 'discord' | 'private';
}

const DEFAULT_NOTES: ReleaseNotesState = {
  modName: '',
  version: '1.0.0',
  gameVersion: 'Both',
  ba2Header: 'V1',
  summary: '',
  whatsNew: '',
  requirements: 'Fallout 4 (Steam)\nF4SE (matching your game version)',
  knownIssues: 'None known.',
  installNotes: 'Install with Mod Organizer 2 or Vortex. Requires a new game or a clean save.',
  saveCompatibility: 'clean-save-needed',
  distribution: 'nexus',
};

const STORAGE_KEY = 'mossy_release_notes_v1';

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

const buildNotesText = (n: ReleaseNotesState): string => {
  const lines: string[] = [];
  lines.push(`# ${n.modName || 'My Mod'} — v${n.version}`);
  lines.push('');

  const gameLabel = n.gameVersion === 'OG' ? 'Pre-NG (1.10.163)' : n.gameVersion === 'NG' ? 'NG/AE (1.10.984+)' : 'Pre-NG and NG/AE';
  const ba2Label = n.ba2Header === 'Both' ? 'V1 + V2 (dual archive)' : `BA2 Header ${n.ba2Header}`;
  lines.push(`**Target Game Version:** ${gameLabel}`);
  lines.push(`**Archive Format:** ${ba2Label}`);
  lines.push('');

  if (n.summary) {
    lines.push('## Description');
    lines.push(n.summary);
    lines.push('');
  }

  if (n.whatsNew) {
    lines.push("## What's New");
    n.whatsNew.split('\n').filter(Boolean).forEach((l) => lines.push(`- ${l.replace(/^[-•]\s*/, '')}`));
    lines.push('');
  }

  lines.push('## Requirements');
  n.requirements.split('\n').filter(Boolean).forEach((l) => lines.push(`- ${l.replace(/^[-•]\s*/, '')}`));
  lines.push('');

  lines.push('## Installation');
  lines.push(n.installNotes);
  lines.push('');

  const saveLabels = {
    safe: '[Safe] Safe to add/remove mid-save.',
    'not-safe': '[Warning] Do NOT add or remove mid-save. This can corrupt your save file.',
    'clean-save-needed': '[Clean Save Required] Requires a clean save or new game when updating from a previous version.',
  };
  lines.push('## Save Compatibility');
  lines.push(saveLabels[n.saveCompatibility]);
  lines.push('');

  if (n.knownIssues) {
    lines.push('## Known Issues');
    lines.push(n.knownIssues);
    lines.push('');
  }

  return lines.join('\n');
};

// ─── Pre-Publish Sanity Items ────────────────────────────────────────────────

const PRE_PUBLISH_ITEMS = [
  { id: 'pp-zip', text: 'Release zip built and opens cleanly in 7-Zip (no corrupt entries).' },
  { id: 'pp-paths', text: 'Folder paths inside zip match Data\\ root (textures\\, meshes\\, scripts\\, etc.).' },
  { id: 'pp-ba2', text: 'BA2 header version matches your stated target (V1 for OG, V2 for NG).' },
  { id: 'pp-esp', text: 'ESP/ESM/ESL opens in FO4Edit with zero "missing masters" errors.' },
  { id: 'pp-clean', text: 'xEdit quick-clean run: no ITMs, no UDRs remaining.' },
  { id: 'pp-profile', text: 'Clean-profile install test passed (only your mod + required deps).' },
  { id: 'pp-version', text: 'Version bumped — no two releases share the same version number.' },
  { id: 'pp-notes', text: 'Release notes written and attached (copy from builder above).' },
  { id: 'pp-frameworks', text: 'No deprecated frameworks (AWKCR, DEF_UI, legacy MCM DLL) shipped.' },
  { id: 'pp-prp', text: 'PRP/precombine compatibility documented if exterior cells were edited.' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

const ReleaseExportPanel: React.FC = () => {
  const [notes, setNotes] = useState<ReleaseNotesState>(() =>
    safeParse(localStorage.getItem(STORAGE_KEY), DEFAULT_NOTES)
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);

  const updateNotes = (patch: Partial<ReleaseNotesState>) => {
    setNotes((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleCheck = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));
  const checkedCount = PRE_PUBLISH_ITEMS.filter((i) => checked[i.id]).length;

  const handleCopy = async () => {
    const text = buildNotesText(notes);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  const previewText = buildNotesText(notes);

  const inputCls =
    'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors';
  const labelCls = 'block text-xs font-black tracking-widest uppercase text-slate-400 mb-1';

  return (
    <div className="space-y-5">

      {/* Section header */}
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-emerald-400" />
        <div>
          <div className="text-sm font-black text-white">Export &amp; Release</div>
          <div className="text-xs text-slate-400">Build release notes, verify the final checklist, and publish.</div>
        </div>
      </div>

      {/* ── Release Notes Builder ── */}
      <div className="rounded-xl border border-slate-800 bg-black/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 hover:bg-slate-900/70 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-300" />
            <span className="text-sm font-black text-white">Release Notes Builder</span>
          </div>
          {notesOpen ? <ChevronDown className="w-4 h-4 text-emerald-300" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>

        {notesOpen && (
          <div className="p-5 space-y-4 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mod Name */}
              <div>
                <label className={labelCls}>Mod Name</label>
                <input
                  type="text"
                  value={notes.modName}
                  onChange={(e) => updateNotes({ modName: e.target.value })}
                  placeholder="My Awesome Mod"
                  className={inputCls}
                />
              </div>

              {/* Version */}
              <div>
                <label className={labelCls}>Version</label>
                <input
                  type="text"
                  value={notes.version}
                  onChange={(e) => updateNotes({ version: e.target.value })}
                  placeholder="1.0.0"
                  className={inputCls}
                />
              </div>

              {/* Game Version */}
              <div>
                <label className={labelCls}>Target Game Version</label>
                <select
                  value={notes.gameVersion}
                  onChange={(e) => updateNotes({ gameVersion: e.target.value as ReleaseNotesState['gameVersion'] })}
                  className={inputCls}
                >
                  <option value="OG">Pre-NG only (1.10.163)</option>
                  <option value="NG">NG / AE only (1.10.984+)</option>
                  <option value="Both">Both (Pre-NG and NG/AE)</option>
                </select>
              </div>

              {/* BA2 Header */}
              <div>
                <label className={labelCls}>BA2 Archive Header</label>
                <select
                  value={notes.ba2Header}
                  onChange={(e) => updateNotes({ ba2Header: e.target.value as ReleaseNotesState['ba2Header'] })}
                  className={inputCls}
                >
                  <option value="V1">V1 — Pre-NG compatible</option>
                  <option value="V2">V2 — NG / AE required</option>
                  <option value="Both">Both (dual archive)</option>
                </select>
                {notes.gameVersion === 'NG' && notes.ba2Header === 'V1' && (
                  <p className="mt-1 text-[10px] text-red-400 font-bold">
                    <AlertCircle className="inline w-3 h-3 mr-1 flex-shrink-0" />V1 archives CTD on NG. Switch to V2 or ship dual archives.
                  </p>
                )}
                {notes.gameVersion === 'OG' && notes.ba2Header === 'V2' && (
                  <p className="mt-1 text-[10px] text-amber-400 font-bold">
                    <AlertCircle className="inline w-3 h-3 mr-1 flex-shrink-0" />V2 archives require NG. Pre-NG users need V1.
                  </p>
                )}
              </div>

              {/* Save Compatibility */}
              <div>
                <label className={labelCls}>Save Compatibility</label>
                <select
                  value={notes.saveCompatibility}
                  onChange={(e) => updateNotes({ saveCompatibility: e.target.value as ReleaseNotesState['saveCompatibility'] })}
                  className={inputCls}
                >
                  <option value="safe">Safe to add / remove mid-save</option>
                  <option value="clean-save-needed">Requires clean save when updating</option>
                  <option value="not-safe">NOT safe to add / remove mid-save</option>
                </select>
              </div>

              {/* Distribution */}
              <div>
                <label className={labelCls}>Distribution Channel</label>
                <select
                  value={notes.distribution}
                  onChange={(e) => updateNotes({ distribution: e.target.value as ReleaseNotesState['distribution'] })}
                  className={inputCls}
                >
                  <option value="nexus">Nexus Mods</option>
                  <option value="bethesda">Bethesda.net (Creation Club)</option>
                  <option value="discord">Discord / Private link</option>
                  <option value="private">Private / Internal</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className={labelCls}>Mod Summary</label>
              <textarea
                rows={2}
                value={notes.summary}
                onChange={(e) => updateNotes({ summary: e.target.value })}
                placeholder="A short description of what this mod does."
                className={inputCls}
              />
            </div>

            {/* What's New */}
            <div>
              <label className={labelCls}>What&apos;s New (one item per line)</label>
              <textarea
                rows={3}
                value={notes.whatsNew}
                onChange={(e) => updateNotes({ whatsNew: e.target.value })}
                placeholder="Fixed CTD when entering Vault 111&#10;Added MCM support for NG&#10;New texture variants"
                className={inputCls}
              />
            </div>

            {/* Requirements */}
            <div>
              <label className={labelCls}>Requirements (one per line)</label>
              <textarea
                rows={3}
                value={notes.requirements}
                onChange={(e) => updateNotes({ requirements: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Install Notes */}
            <div>
              <label className={labelCls}>Installation Notes</label>
              <textarea
                rows={2}
                value={notes.installNotes}
                onChange={(e) => updateNotes({ installNotes: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Known Issues */}
            <div>
              <label className={labelCls}>Known Issues</label>
              <textarea
                rows={2}
                value={notes.knownIssues}
                onChange={(e) => updateNotes({ knownIssues: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Preview + Copy */}
            <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-900/60">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    copied
                      ? 'bg-emerald-700/40 border border-emerald-600/40 text-emerald-300'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-emerald-600/40'
                  }`}
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-64">
                {previewText}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Pre-Publish Checklist ── */}
      <div className="rounded-xl border border-slate-800 bg-black/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-300" />
            <span className="text-sm font-black text-white">Pre-Publish Sanity Check</span>
          </div>
          <span className="text-xs font-mono text-emerald-400">{checkedCount} / {PRE_PUBLISH_ITEMS.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(checkedCount / PRE_PUBLISH_ITEMS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {PRE_PUBLISH_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleCheck(item.id)}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-black/20 hover:border-slate-700 transition-colors text-left"
            >
              <div
                className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked[item.id] ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-700'
                }`}
              >
                {checked[item.id] && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs leading-relaxed ${checked[item.id] ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                {item.text}
              </span>
            </button>
          ))}
        </div>

        {checkedCount === PRE_PUBLISH_ITEMS.length && (
          <div className="mt-4 rounded-lg bg-emerald-900/20 border border-emerald-600/30 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">All sanity checks passed — ready to publish!</span>
          </div>
        )}
      </div>

      {/* ── Publish Links ── */}
      <div className="rounded-xl border border-slate-800 bg-black/30 p-5">
        <button
          type="button"
          onClick={() => setPublishOpen((o) => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-300" />
            <span className="text-sm font-black text-white">Publish Destinations</span>
          </div>
          {publishOpen ? <ChevronDown className="w-4 h-4 text-emerald-300" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>

        {publishOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                label: 'Nexus Mods — Upload',
                url: 'https://www.nexusmods.com/fallout4/mods/add',
                note: 'Standard mod distribution. Requires a free Nexus account.',
                color: 'border-orange-600/30 bg-orange-900/10 text-orange-300',
              },
              {
                label: 'Bethesda.net — Creation Club',
                url: 'https://bethesda.net/en/mods/fallout4',
                note: 'Official platform, in-game browsable. Use BethelUploader below for automation.',
                color: 'border-blue-600/30 bg-blue-900/10 text-blue-300',
              },
              {
                label: 'Nexus — My Mod Files',
                url: 'https://www.nexusmods.com/users/myaccount?tab=files',
                note: 'Manage existing mod files and changelogs.',
                color: 'border-orange-600/20 bg-orange-900/5 text-orange-400',
              },
              {
                label: 'Nexus — Version Bump Guide',
                url: 'https://help.nexusmods.com/article/100-how-do-i-update-or-upload-a-new-version-of-my-file',
                note: 'Official guide: uploading a new version without breaking existing links.',
                color: 'border-slate-600/30 bg-slate-900/10 text-slate-300',
              },
            ].map((link) => (
              <button
                key={link.url}
                type="button"
                onClick={() => openUrl(link.url)}
                className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-opacity hover:opacity-80 ${link.color}`}
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black">{link.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{link.note}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Version Bump Reminder ── */}
      <div className="rounded-lg border border-amber-600/20 bg-amber-900/10 p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-amber-300">Version hygiene rules</p>
          <p>• Increment your version for <strong>every</strong> public upload. Never reuse a version number.</p>
          <p>• Use semantic-style versioning: <span className="font-mono">MAJOR.MINOR.PATCH</span> — bump MAJOR for save-breaking changes, MINOR for new features, PATCH for bugfixes.</p>
          <p>• If your mod has Papyrus scripts, changing script properties between versions may require a clean save. Always note this in your changelog.</p>
        </div>
      </div>

      {/* ── NG/AE Platform Note ── */}
      <div className="rounded-lg border border-blue-600/20 bg-blue-900/10 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-blue-300">2026 platform reality — NG/AE is the default</p>
          <p>• As of 2026, the majority of active players are on <strong>NG (1.10.984+)</strong> or <strong>AE (1.11.x)</strong>. Document which build you target prominently.</p>
          <p>• If you ship F4SE plugins, use <strong>F4SE 0.7.x</strong> (NG build) and <strong>Address Library for F4SE Plugins — All In One</strong> on Nexus.</p>
          <p>• Replace any <strong>AWKCR</strong> or <strong>DEF_UI</strong> dependencies with <strong>ECO/NEO</strong> and <strong>FallUI Suite</strong>.</p>
          <p>• Replace legacy MCM DLL with <strong>MCM Helper NG</strong>.</p>
        </div>
      </div>

    </div>
  );
};

export default ReleaseExportPanel;
