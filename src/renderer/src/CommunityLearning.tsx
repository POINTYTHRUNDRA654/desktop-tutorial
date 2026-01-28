import React, { useEffect, useMemo, useState } from 'react';
import { Github, Save, Send, ShieldCheck } from 'lucide-react';
import type { Settings } from '../../shared/types';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import {
  buildCommunityIssueBody,
  buildGithubNewIssueUrl,
  loadCommunityLearningProfile,
  saveCommunityLearningProfile,
  type CommunityLearningProfileV1,
} from './communityLearningProfile';

const DEFAULT_LABELS = ['community-learning'];

const CommunityLearning: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);

  const [contributorName, setContributorName] = useState('');
  const [contributorLink, setContributorLink] = useState('');
  const [goalsText, setGoalsText] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings(s);
      } catch {
        setSettings(null);
      }

      const existing = loadCommunityLearningProfile();
      if (existing) {
        setContributorName(existing.contributorName || '');
        setContributorLink(existing.contributorLink || '');
        setGoalsText((existing.goals || []).join('\n'));
        setNotes(existing.notes || '');
      }
    };
    init();
  }, []);

  const repo = useMemo(() => {
    const fromSettings = (settings as any)?.communityRepo;
    const fromEnv = (import.meta as any)?.env?.VITE_COMMUNITY_REPO;
    return (fromSettings || fromEnv || '').trim();
  }, [settings]);

  const draftProfile: CommunityLearningProfileV1 = useMemo(() => {
    const goals = goalsText
      .split(/\r?\n/)
      .map((g) => g.trim())
      .filter(Boolean);

    const existing = loadCommunityLearningProfile();
    const nowIso = new Date().toISOString();

    return {
      version: 1,
      contributorName: contributorName.trim(),
      contributorLink: contributorLink.trim() || undefined,
      goals,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };
  }, [contributorName, contributorLink, goalsText, notes]);

  const issueBody = useMemo(() => buildCommunityIssueBody(draftProfile), [draftProfile]);

  const saveLocal = () => {
    if (!draftProfile.contributorName.trim()) {
      setStatus('Please enter your name (for credit).');
      return;
    }
    if (draftProfile.goals.length === 0) {
      setStatus('Please add at least one goal.');
      return;
    }
    saveCommunityLearningProfile(draftProfile);
    setStatus('Saved locally.');
  };

  const openGithubIssue = async () => {
    setStatus('');

    if (!repo) {
      setStatus('Missing GitHub repo. Set VITE_COMMUNITY_REPO or add it to app settings.');
      return;
    }
    if (!draftProfile.contributorName.trim()) {
      setStatus('Please enter your name (for credit).');
      return;
    }
    if (draftProfile.goals.length === 0) {
      setStatus('Please add at least one goal.');
      return;
    }
    if (!consent) {
      setStatus('Consent is required to submit publicly.');
      return;
    }

    // Save first so nothing is lost.
    saveCommunityLearningProfile(draftProfile);

    const url = buildGithubNewIssueUrl({
      repo,
      title: `Community learning submission: ${draftProfile.contributorName}`,
      body: issueBody,
      labels: DEFAULT_LABELS,
    });

    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (bridge?.openExternal) {
        await bridge.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setStatus('Opened GitHub draft issue. Submit it from your browser.');
    } catch (e) {
      setStatus(`Could not open browser: ${String(e)}`);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Github className="w-7 h-7 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Community Learning</h1>
            <p className="text-sm text-slate-300">
              Save what you teach Mossy, then submit it publicly (with credit) as a GitHub Issue.
            </p>
          </div>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This workflow creates a draft GitHub Issue URL from your local profile. You control what is shared by checking consent before opening the browser."
          verify={[
            'Fill out your name + at least one goal and click “Save locally”.',
            'Enable consent and click “Open GitHub draft issue” to confirm the browser opens a pre-filled issue.',
            'Confirm the repo is set (VITE_COMMUNITY_REPO or app settings) before submitting publicly.'
          ]}
          firstTestLoop={[
            'Save locally first to avoid losing text.',
            'Open the draft issue and review the body carefully before submitting.',
            'If you prefer to stay local-only, keep consent disabled and only use the local save.'
          ]}
          troubleshooting={[
            'If the repo is missing, set VITE_COMMUNITY_REPO (or add it to settings) and reload the page.',
            'If the browser will not open, check Diagnostics and confirm openExternal is available.'
          ]}
          shortcuts={[
            { label: 'Privacy Settings', to: '/settings/privacy' },
            { label: 'Diagnostics', to: '/diagnostics' },
          ]}
        />

        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Your name (for credit)</label>
              <input
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                placeholder="e.g., Jane Modder"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Link (optional)</label>
              <input
                value={contributorLink}
                onChange={(e) => setContributorLink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                placeholder="GitHub/Nexus profile URL"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Modding goals (one per line)</label>
            <textarea
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              placeholder="e.g.\nCreate an NPC companion\nBuild a settlement overhaul\nLearn xEdit conflict resolution"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              placeholder="Anything Mossy should know about your goals, constraints, or preferences."
            />
          </div>

          <div className="flex items-start gap-3 bg-slate-950/40 border border-slate-700 rounded-lg p-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                I consent to share this publicly in the GitHub repo.
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Keep it high-level. Don’t include file paths, API keys, or personal info.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Repo target: <span className="text-slate-300 font-mono">{repo || '(not configured)'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={saveLocal}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg border border-slate-700"
            >
              <Save className="w-4 h-4" />
              Save locally
            </button>
            <button
              onClick={openGithubIssue}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black px-4 py-2 rounded-lg"
            >
              <Send className="w-4 h-4" />
              Submit to GitHub (Issue)
            </button>
          </div>

          {status && <div className="text-sm text-slate-200">{status}</div>}

          <details className="text-xs text-slate-300">
            <summary className="cursor-pointer text-slate-300">Preview payload (what will be posted)</summary>
            <pre className="mt-2 p-3 bg-slate-950 border border-slate-700 rounded-lg overflow-auto whitespace-pre-wrap">{issueBody}</pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default CommunityLearning;
