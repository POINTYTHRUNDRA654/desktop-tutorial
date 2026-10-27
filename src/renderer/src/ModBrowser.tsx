import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, ExternalLink, BookOpen, ChevronDown, ChevronUp, FolderOpen, Send, Lightbulb } from 'lucide-react';
import type { Collection, CollectionItem } from '../../shared/types';
import { openExternal } from './utils/openExternal';
import {
  buildCommunitySubmissionIssueBody,
  buildGithubNewIssueUrl,
  loadCommunitySubmissionContributor,
  saveCommunitySubmissionContributor,
} from './communitySubmissionProfile';

type ModBrowserBridge = {
  modBrowser?: {
    createCollection: (name: string, items: CollectionItem[], description?: string) => Promise<Collection>;
    shareCollection: (collectionId: string) => Promise<{ success: boolean; exportPath?: string; error?: string }>;
    revealCollection: (exportPath: string) => Promise<{ success: boolean; error?: string }>;
  };
};

const bridge = ((window as any).electron?.api || (window as any).electronAPI) as ModBrowserBridge;

// Mossy has no Nexus account link: finding mods happens on the Nexus Mods website itself,
// opened in the user's browser. Nothing here calls the Nexus API.
const NEXUS_FO4_MODS = 'https://www.nexusmods.com/games/fallout4/mods';
export const buildNexusSearchUrl = (query: string): string => {
  const q = query.trim();
  return q ? `${NEXUS_FO4_MODS}?keyword=${encodeURIComponent(q)}` : NEXUS_FO4_MODS;
};

const QUICK_LINKS: { label: string; url: string }[] = [
  { label: 'All Fallout 4 mods', url: NEXUS_FO4_MODS },
  { label: 'Modders\' resources', url: buildNexusSearchUrl('modders resource') },
  { label: 'Fallout 4 on Bethesda.net', url: 'https://creations.bethesda.net/en/fallout4/all' },
];

const ModBrowser: React.FC = () => {
  const [query, setQuery] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionName, setCollectionName] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareType, setShareType] = useState<CollectionItem['type']>('technique');
  const [shareContent, setShareContent] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorLink, setContributorLink] = useState('');
  const [shareConsent, setShareConsent] = useState(false);
  const [communityRepo, setCommunityRepo] = useState('');
  const [installGuideOpen, setInstallGuideOpen] = useState(true);

  useEffect(() => {
    const existing = loadCommunitySubmissionContributor();
    if (existing) {
      setContributorName(existing.contributorName);
      setContributorLink(existing.contributorLink || '');
    }
    (async () => {
      try {
        const s = await (window as any).electronAPI?.getSettings?.();
        setCommunityRepo((s?.communityRepo || '').trim() || 'POINTYTHRUNDRA654/desktop-tutorial');
      } catch { /* repo stays unset */ }
    })();
  }, []);

  const searchNexus = async (url = buildNexusSearchUrl(query)) => {
    try {
      await openExternal(url);
    } catch (err) {
      console.error(err);
      toast.error('Could not open your browser');
    }
  };

  const createCollection = async () => {
    if (!collectionName.trim()) { toast.error('Provide a collection name'); return; }
    if (!shareTitle.trim() || !shareContent.trim()) { toast.error('Add a title and content for what you want to share'); return; }
    try {
      const item: CollectionItem = { title: shareTitle.trim(), type: shareType, content: shareContent.trim() };
      const col = await bridge?.modBrowser?.createCollection(collectionName.trim(), [item], 'Shared from ModBrowser');
      if (!col) { toast.error('Failed to create collection'); return; }
      const shareResult = await bridge?.modBrowser?.shareCollection(col.id);
      if (!shareResult?.success) {
        toast.error(shareResult?.error || 'Failed to package collection');
        return;
      }
      setCollections((c) => [{ ...col, exportPath: shareResult.exportPath }, ...c]);
      setCollectionName('');
      toast.success('Saved a local zip copy - use Reveal to find it on disk.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create collection');
    }
  };

  const revealCollection = async (exportPath?: string) => {
    if (!exportPath) return;
    const res = await bridge?.modBrowser?.revealCollection(exportPath);
    if (!res?.success) toast.error(res?.error || 'Could not open folder');
  };

  const submitToGithub = async () => {
    if (!communityRepo) { toast.error('No community repo configured - set it in Settings.'); return; }
    if (!contributorName.trim()) { toast.error('Enter your name (for credit).'); return; }
    if (!shareTitle.trim() || !shareContent.trim()) { toast.error('Add a title and content for what you want to share'); return; }
    if (!shareConsent) { toast.error('Consent is required to submit publicly.'); return; }

    saveCommunitySubmissionContributor(contributorName.trim(), contributorLink.trim());

    const body = buildCommunitySubmissionIssueBody({
      item: { title: shareTitle.trim(), type: shareType, content: shareContent.trim() },
      contributorName: contributorName.trim(),
      contributorLink: contributorLink.trim() || undefined,
    });
    const url = buildGithubNewIssueUrl({
      repo: communityRepo,
      title: `Community submission: ${shareTitle.trim()}`,
      body,
      labels: ['community-submission'],
      template: 'community-submission.md',
    });

    try {
      await openExternal(url);
      toast.success('Opened a draft GitHub issue - submit it from your browser to be reviewed for a future Mossy update.');
      setShareTitle('');
      setShareContent('');
    } catch (err) {
      console.error(err);
      toast.error('Could not open browser');
    }
  };

  return (
    <div className="min-h-full p-6 bg-[#0b0f0b] text-slate-100">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Find Mods</h1>
          <p className="text-sm text-slate-400">Search Nexus Mods in your browser, then use the install guide below to set mods up in MO2 or Vortex.</p>
        </div>

        <div className="mb-6 p-4 border border-slate-800 rounded-lg bg-[#0a0e0a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#0f1313] border border-slate-800 rounded px-3 py-2 flex-1">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input className="bg-transparent outline-none flex-1 text-sm" placeholder="Search Fallout 4 mods, e.g. 'settlement objects'" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchNexus()} />
            </div>
            <button className="px-4 py-2 bg-emerald-700/20 hover:bg-emerald-700/30 border border-emerald-700/50 rounded text-sm flex items-center gap-2" onClick={() => searchNexus()}>
              <ExternalLink className="w-4 h-4" />Search on Nexus Mods
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <button key={l.url} className="px-2.5 py-1 bg-black/20 hover:bg-black/40 border border-slate-800 rounded text-xs flex items-center gap-1.5" onClick={() => searchNexus(l.url)}>
                <ExternalLink className="w-3 h-3" />{l.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Results open on the Nexus Mods website. Download there (a free Nexus account is needed for downloads), then install with your mod manager.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="border border-emerald-800/50 rounded-lg bg-emerald-950/20 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setInstallGuideOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">How to Install a Mod — Step-by-Step Guide</span>
                </div>
                {installGuideOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {installGuideOpen && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-4 text-[13px] text-slate-300">
                  <div className="bg-black/20 rounded p-3">
                    <div className="font-black text-blue-300 mb-2">Mod Organizer 2 (Recommended)</div>
                    <ol className="space-y-1 list-decimal list-inside text-slate-300">
                      <li>Open <strong>Mod Organizer 2</strong>.</li>
                      <li>Click the toolbar button <em>"Install a new mod from an archive"</em> (or drag the mod ZIP onto MO2).</li>
                      <li>Follow the FOMOD installer if one appears.</li>
                      <li>The mod appears in the <strong>left pane</strong> — make sure it is checked.</li>
                      <li>The plugin (.esp/.esm/.esl) appears in the <strong>right pane (Plugins)</strong> — enable it there too.</li>
                      <li>Run <strong>LOOT</strong> to sort your load order, then launch the game through MO2.</li>
                    </ol>
                  </div>

                  <div className="bg-black/20 rounded p-3">
                    <div className="font-black text-purple-300 mb-2">Vortex</div>
                    <ol className="space-y-1 list-decimal list-inside text-slate-300">
                      <li>Open <strong>Vortex</strong> and ensure Fallout 4 is the active game.</li>
                      <li>Click <strong>Mods → Install From File</strong> and select the mod archive.</li>
                      <li>Vortex will install and ask to <strong>Deploy</strong> — click Deploy.</li>
                      <li>Go to the <strong>Plugins</strong> tab and enable the plugin.</li>
                      <li>Use the <strong>Sort</strong> button to apply LOOT sorting.</li>
                      <li>Launch through Vortex's Play button.</li>
                    </ol>
                  </div>

                  <div className="bg-black/20 rounded p-3">
                    <div className="font-black text-amber-300 mb-2">Manual (No Mod Manager)</div>
                    <ol className="space-y-1 list-decimal list-inside text-slate-300">
                      <li>Extract the mod archive with 7-Zip or WinRAR.</li>
                      <li>Copy the extracted <strong>Data\</strong> folder contents into your Fallout 4 <strong>Data\</strong> folder (e.g. <code>C:\...\Fallout 4\Data\</code>).</li>
                      <li>Open <strong>plugins.txt</strong> (in <code>%LOCALAPPDATA%\Fallout4\</code>) and add the plugin name on a new line, prefixed with <code>*</code>.</li>
                      <li>Launch the game. Manual installs are harder to remove cleanly — keep backups.</li>
                    </ol>
                  </div>

                  <div className="col-span-3 pt-2 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Ask Mossy in the <strong>AI Chat</strong> for help with specific mods, load order issues, or FOMOD options. She knows the full MO2/Vortex workflow.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1">
            <div className="p-3 border border-slate-800 rounded bg-[#0a0e0a]">
              <div className="text-sm font-semibold mb-1">Share with the Community</div>
              <div className="text-[11px] text-slate-500 mb-2">
                Submit your own techniques, scripts, or notes as a GitHub issue on{' '}
                <span className="text-slate-300 font-mono">{communityRepo || '(no repo configured)'}</span>{' '}
                for review and possible inclusion in a future Mossy update.
              </div>
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="Your name (for credit)" value={contributorName} onChange={e => setContributorName(e.target.value)} />
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="Link (optional)" value={contributorLink} onChange={e => setContributorLink(e.target.value)} />
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="Collection name (for the local copy)" value={collectionName} onChange={e => setCollectionName(e.target.value)} />
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="Title (e.g. 'Precombine fix script')" value={shareTitle} onChange={e => setShareTitle(e.target.value)} />
              <select className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" value={shareType} onChange={e => setShareType(e.target.value as CollectionItem['type'])}>
                <option value="technique">Technique</option>
                <option value="script">Script</option>
                <option value="note">Note</option>
              </select>
              <textarea className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" rows={4} placeholder="Paste your script or describe your technique..." value={shareContent} onChange={e => setShareContent(e.target.value)} />
              <label className="flex items-start gap-2 text-[11px] text-slate-400 mb-2">
                <input type="checkbox" className="mt-0.5" checked={shareConsent} onChange={e => setShareConsent(e.target.checked)} />
                I consent to share this publicly. Keep it high-level - don't include file paths, API keys, or personal info.
              </label>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-purple-700/10 rounded text-sm" onClick={createCollection}>Save Local Copy</button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={submitToGithub}>
                  <Send className="w-3 h-3" />Submit to GitHub
                </button>
              </div>
              {collections.length > 0 && (
                <div className="mt-3 space-y-2">
                  {collections.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-xs text-slate-400 bg-black/10 rounded px-2 py-1.5">
                      <span className="truncate">{c.name}</span>
                      <button className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 whitespace-nowrap" onClick={() => revealCollection(c.exportPath)}>
                        <FolderOpen className="w-3 h-3" />Reveal
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModBrowser;
