import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Clock,
  Archive,
  RotateCcw,
  FileText,
  Plus,
  Minus,
  AlertCircle,
  RefreshCw,
  Upload,
  Download,
  GitMerge,
  User,
} from 'lucide-react';
import { GitRepo, CommitHistory, Backup as BackupType, DiffResult } from '../../shared/types';

interface VersionControlProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Primitive replacements (no MUI)
// ---------------------------------------------------------------------------

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-[#141814] border border-slate-700/40 rounded-xl overflow-hidden ${className}`}>{children}</div>
);

const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

const CardFoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-5 pb-4 flex gap-2">{children}</div>
);

const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, onClick, disabled, variant = 'ghost', icon, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
      ${variant === 'solid'
        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
        : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
      } ${className}`}
  >
    {icon}{children}
  </button>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">{children}</label>
);

const NativeSelect: React.FC<{ value: string; onChange: (v: string) => void; children: React.ReactNode; label?: string }> = ({ value, onChange, children, label }) => (
  <div className="space-y-1">
    {label && <Label>{label}</Label>}
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0f120f] border border-slate-700/50 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500/60">
      {children}
    </select>
  </div>
);

const TextInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; label?: string; multiline?: boolean; rows?: number }> = ({ value, onChange, placeholder, label, multiline, rows = 4 }) => (
  <div className="space-y-1">
    {label && <Label>{label}</Label>}
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-[#0f120f] border border-slate-700/50 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 resize-none font-mono" />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#0f120f] border border-slate-700/50 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-emerald-500/60" />
    )}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
    <span className="text-sm text-slate-300">{label}</span>
  </label>
);

const BadgeCount: React.FC<{ count: number; children: React.ReactNode }> = ({ count, children }) => (
  <span className="relative inline-flex">
    {children}
    {count > 0 && (
      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
        {count}
      </span>
    )}
  </span>
);

const Hr: React.FC = () => <hr className="border-slate-700/50 my-4" />;

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; actions: React.ReactNode }> = ({ open, onClose, title, children, actions }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#141814] border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-700/50"><h3 className="text-base font-bold text-white">{title}</h3></div>
        <div className="px-6 py-4 space-y-3">{children}</div>
        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-2 justify-end">{actions}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const TABS = ['Repository Status', 'Changes Viewer', 'Commit Panel', 'History Timeline', 'Branch Manager', 'Backup & Restore'];

export const VersionControl: React.FC<VersionControlProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentBranch, setCurrentBranch] = useState('master');
  const [uncommittedChanges, setUncommittedChanges] = useState(0);
  const [lastCommit, setLastCommit] = useState<CommitHistory | null>(null);
  const [remoteStatus, setRemoteStatus] = useState({ ahead: 0, behind: 0 });

  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);

  const [commitMessage, setCommitMessage] = useState('');
  const [commitTemplate, setCommitTemplate] = useState('default');
  const [amendLastCommit, setAmendLastCommit] = useState(false);

  const [commitHistory, setCommitHistory] = useState<CommitHistory[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<CommitHistory | null>(null);
  const [commitDetails, setCommitDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [createBranchDialog, setCreateBranchDialog] = useState(false);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  const [backups, setBackups] = useState<BackupType[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupType | null>(null);

  const commitTemplates: Record<string, string> = {
    default: '', feat: 'feat: add new feature', fix: 'fix: resolve issue',
    docs: 'docs: update documentation', style: 'style: format code',
    refactor: 'refactor: restructure code', test: 'test: add tests', chore: 'chore: maintenance tasks',
  };

  useEffect(() => { loadRepositoryStatus(); loadCommitHistory(); loadBranches(); loadBackups(); }, []);

  const loadRepositoryStatus = async () => {
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlStatus?.('default');
      if (res?.success && res.status) {
        setCurrentBranch(res.status.currentBranch || 'master');
        setUncommittedChanges(res.status.uncommittedChanges ?? 0);
        setRemoteStatus({ ahead: res.status.ahead ?? 0, behind: res.status.behind ?? 0 });
        setLastCommit(res.status.lastCommit ?? null);
        setStagedFiles(res.status.stagedFiles ?? []);
        setModifiedFiles(res.status.modifiedFiles ?? []);
      } else {
        setError(res?.error || 'Failed to load repository status');
      }
    } catch { setError('Failed to load repository status'); } finally { setLoading(false); }
  };

  const loadCommitHistory = async () => {
    try {
      const res = await (window as any).electronAPI?.versionControlHistory?.(50);
      setCommitHistory(res?.success ? (res.history?.commits ?? []) : []);
    }
    catch { setError('Failed to load commit history'); }
  };

  const loadBranches = async () => {
    try {
      const res = await (window as any).electronAPI?.versionControlGetBranches?.('default');
      setBranches(res?.success ? (res.branches ?? []).map((b: any) => b.name) : []);
    } catch { setError('Failed to load branches'); }
  };

  const loadBackups = async () => {
    try { const l = await (window as any).electronAPI?.versionControlListBackups?.(); setBackups(l ?? []); }
    catch { setError('Failed to load backups'); }
  };

  const handleQuickCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlCommit?.(commitMessage);
      if (!res?.success) { setError(res?.error || 'Failed to commit changes'); return; }
      setCommitMessage(''); await loadRepositoryStatus(); await loadCommitHistory();
    }
    catch { setError('Failed to commit changes'); } finally { setLoading(false); }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlCreateBranch?.(newBranchName);
      if (!res?.success) { setError(res?.error || 'Failed to create branch'); return; }
      setNewBranchName(''); setCreateBranchDialog(false); await loadBranches();
    }
    catch { setError('Failed to create branch'); } finally { setLoading(false); }
  };

  const handleMergeBranches = async () => {
    if (!mergeSource || !mergeTarget) return;
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlMergeBranch?.(mergeSource, mergeTarget);
      if (!res?.success) { setError(res?.error || 'Failed to merge branches'); return; }
      await loadRepositoryStatus();
    }
    catch { setError('Failed to merge branches'); } finally { setLoading(false); }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlBackup?.(undefined);
      if (!res?.success) setError(res?.error || 'Failed to create backup');
      await loadBackups();
    }
    catch { setError('Failed to create backup'); } finally { setLoading(false); }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    try {
      setLoading(true);
      const res = await (window as any).electronAPI?.versionControlRestore?.(selectedBackup.id, undefined);
      if (!res?.success) setError(res?.error || 'Failed to restore backup');
      setRestoreDialog(false); setSelectedBackup(null);
      await loadRepositoryStatus();
    }
    catch { setError('Failed to restore backup'); } finally { setLoading(false); }
  };

  const handleViewCommitDetails = async (commit: CommitHistory) => {
    try {
      const res = await (window as any).electronAPI?.versionControlShowChanges?.(commit.hash);
      setSelectedCommit(commit);
      if (res?.success && res.diff) {
        setCommitDetails({
          ...res.diff,
          files: res.diff.changes.map((c: any) => ({ fileA: c.file, fileB: c.file, additions: c.additions, deletions: c.deletions })),
        });
      } else {
        setCommitDetails(null);
        setError(res?.error || 'Failed to load commit details');
      }
    } catch { setError('Failed to load commit details'); }
  };

  const filteredHistory = commitHistory.filter(c =>
    c.message.toLowerCase().includes(searchQuery.toLowerCase()) || c.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fileCount = (c: CommitHistory) => typeof c.files === 'number' ? c.files : (c.files as string[])?.length ?? 0;

  return (
    <div className={`w-full h-full flex flex-col gap-4 ${className ?? ''}`}>
      <h2 className="text-xl font-bold text-white tracking-tight">Version Control</h2>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-500/40 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">✕</button>
        </div>
      )}

      <div className="flex gap-1 bg-[#0f120f] border border-slate-700/50 rounded-xl p-1 overflow-x-auto shrink-0">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === i ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/40'}`}>{tab}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {activeTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-white mb-4">Current Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300"><GitBranch className="w-4 h-4 text-emerald-400" />Branch: <span className="text-white font-mono ml-1">{currentBranch}</span></div>
                  <div className="flex items-center gap-2 text-sm text-slate-300"><BadgeCount count={uncommittedChanges}><FileText className="w-4 h-4 text-amber-400" /></BadgeCount><span className="ml-1">Uncommitted Changes</span></div>
                  <div className="flex items-center gap-2 text-sm text-slate-300"><Upload className="w-4 h-4 text-green-400" />Ahead: <span className="text-white ml-1">{remoteStatus.ahead}</span></div>
                  <div className="flex items-center gap-2 text-sm text-slate-300"><Download className="w-4 h-4 text-orange-400" />Behind: <span className="text-white ml-1">{remoteStatus.behind}</span></div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-white mb-4">Last Commit</h3>
                {lastCommit ? (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-slate-500">{lastCommit.hash.substring(0, 7)}</p>
                    <p className="text-sm text-white">{lastCommit.message}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{lastCommit.author}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(lastCommit.date ?? lastCommit.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-400">No commits yet</p>}
              </CardBody>
              <CardFoot>
                <Btn variant="solid" icon={<GitCommit className="w-4 h-4" />} onClick={handleQuickCommit} disabled={!commitMessage.trim() || loading}>Quick Commit</Btn>
              </CardFoot>
            </Card>
          </div>
        )}

        {activeTab === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-white mb-3">Modified Files</h3>
                <ul className="space-y-1">
                  {modifiedFiles.map(f => (
                    <li key={f} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-700/20">
                      <span className="text-sm text-slate-300 font-mono truncate flex-1">{f}</span>
                      <button onClick={() => setStagedFiles(prev => stagedFiles.includes(f) ? prev : [...prev, f])} disabled={stagedFiles.includes(f)} className="ml-2 p-1 rounded text-slate-400 hover:text-emerald-400 disabled:opacity-30 transition-colors"><Plus className="w-4 h-4" /></button>
                    </li>
                  ))}
                  {modifiedFiles.length === 0 && <p className="text-xs text-slate-500 py-2">No modified files</p>}
                </ul>
              </CardBody>
              <CardFoot><Btn onClick={() => setStagedFiles([...modifiedFiles])}>Stage All</Btn></CardFoot>
            </Card>
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-white mb-3">Staged Files</h3>
                <ul className="space-y-1">
                  {stagedFiles.map(f => (
                    <li key={f} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-700/20">
                      <span className="text-sm text-slate-300 font-mono truncate flex-1">{f}</span>
                      <button onClick={() => setStagedFiles(prev => prev.filter(x => x !== f))} className="ml-2 p-1 rounded text-slate-400 hover:text-red-400 transition-colors"><Minus className="w-4 h-4" /></button>
                    </li>
                  ))}
                  {stagedFiles.length === 0 && <p className="text-xs text-slate-500 py-2">No staged files</p>}
                </ul>
              </CardBody>
              <CardFoot><Btn onClick={() => setStagedFiles([])}>Unstage All</Btn></CardFoot>
            </Card>
          </div>
        )}

        {activeTab === 2 && (
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-base font-semibold text-white">Commit Changes</h3>
              <NativeSelect label="Template" value={commitTemplate} onChange={v => { setCommitTemplate(v); setCommitMessage(commitTemplates[v] ?? ''); }}>
                {Object.entries(commitTemplates).map(([key, tpl]) => <option key={key} value={key}>{tpl || 'Custom'}</option>)}
              </NativeSelect>
              <TextInput label="Commit Message" value={commitMessage} onChange={setCommitMessage} placeholder="Describe your changes..." multiline rows={4} />
              <Toggle checked={amendLastCommit} onChange={setAmendLastCommit} label="Amend last commit" />
            </CardBody>
            <CardFoot>
              <Btn variant="solid" icon={<GitCommit className="w-4 h-4" />} onClick={handleQuickCommit} disabled={!commitMessage.trim() || loading}>
                {amendLastCommit ? 'Amend Commit' : 'Create Commit'}
              </Btn>
            </CardFoot>
          </Card>
        )}

        {activeTab === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Commit History</h3>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search commits..." className="bg-[#0f120f] border border-slate-700/50 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 w-48" />
                  </div>
                  <ul className="space-y-1">
                    {filteredHistory.map(commit => (
                      <li key={commit.hash} onClick={() => handleViewCommitDetails(commit)} className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selectedCommit?.hash === commit.hash ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-700/20'}`}>
                        <p className="text-sm text-white">{commit.message}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{commit.hash.substring(0, 7)} · {commit.author} · {new Date(commit.date ?? commit.timestamp).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{fileCount(commit)} files · +{commit.insertions} -{commit.deletions}</p>
                      </li>
                    ))}
                    {filteredHistory.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">No commits found</p>}
                  </ul>
                </CardBody>
              </Card>
            </div>
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-white mb-3">Commit Details</h3>
                {selectedCommit && commitDetails ? (
                  <>
                    <p className="text-xs font-mono text-slate-500">{selectedCommit.hash}</p>
                    <p className="text-sm text-white mt-1 font-medium">{selectedCommit.message}</p>
                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      <p><span className="text-slate-300 font-medium">Author:</span> {selectedCommit.author}</p>
                      <p><span className="text-slate-300 font-medium">Date:</span> {new Date(selectedCommit.date ?? selectedCommit.timestamp).toLocaleString()}</p>
                      <p><span className="text-slate-300 font-medium">Files:</span> {fileCount(selectedCommit)}</p>
                    </div>
                    <Hr />
                    <p className="text-xs text-slate-400 mb-2">Changed Files:</p>
                    <ul className="space-y-1">
                      {commitDetails.files?.map((file: DiffResult) => (
                        <li key={file.fileA} className="text-xs"><p className="text-slate-300 font-mono truncate">{file.fileA}</p><p className="text-slate-500">+{file.additions} -{file.deletions}</p></li>
                      ))}
                    </ul>
                  </>
                ) : <p className="text-sm text-slate-400">Select a commit to view details</p>}
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 4 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-white mb-3">Branches</h3>
                  <ul className="space-y-1">
                    {branches.map(branch => (
                      <li key={branch} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-700/20">
                        <span className="text-sm text-slate-300 font-mono">{branch}</span>
                        {branch === currentBranch && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">Current</span>}
                      </li>
                    ))}
                  </ul>
                </CardBody>
                <CardFoot><Btn icon={<Plus className="w-4 h-4" />} onClick={() => setCreateBranchDialog(true)}>Create Branch</Btn></CardFoot>
              </Card>
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="text-base font-semibold text-white">Merge Branches</h3>
                  <NativeSelect label="Source Branch" value={mergeSource} onChange={setMergeSource}>
                    <option value="">Select source...</option>
                    {branches.filter(b => b !== currentBranch).map(b => <option key={b} value={b}>{b}</option>)}
                  </NativeSelect>
                  <NativeSelect label="Target Branch" value={mergeTarget} onChange={setMergeTarget}>
                    <option value="">Select target...</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </NativeSelect>
                </CardBody>
                <CardFoot>
                  <Btn variant="solid" icon={<GitMerge className="w-4 h-4" />} onClick={handleMergeBranches} disabled={!mergeSource || !mergeTarget || loading}>Merge</Btn>
                </CardFoot>
              </Card>
            </div>
            <Modal open={createBranchDialog} onClose={() => setCreateBranchDialog(false)} title="Create New Branch"
              actions={<><Btn onClick={() => setCreateBranchDialog(false)}>Cancel</Btn><Btn variant="solid" onClick={handleCreateBranch} disabled={!newBranchName.trim()}>Create</Btn></>}>
              <TextInput label="Branch Name" value={newBranchName} onChange={setNewBranchName} placeholder="feature/my-new-feature" />
            </Modal>
          </>
        )}

        {activeTab === 5 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardBody className="space-y-4">
                  <h3 className="text-base font-semibold text-white">Backup Settings</h3>
                  <Toggle checked={autoBackupEnabled} onChange={setAutoBackupEnabled} label="Enable automatic backups" />
                  {autoBackupEnabled && (
                    <NativeSelect label="Schedule" value={backupSchedule} onChange={setBackupSchedule}>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </NativeSelect>
                  )}
                </CardBody>
                <CardFoot>
                  <Btn variant="solid" icon={<Archive className="w-4 h-4" />} onClick={handleCreateBackup} disabled={loading}>Create Backup</Btn>
                </CardFoot>
              </Card>
              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-white mb-3">Available Backups</h3>
                  <ul className="space-y-1">
                    {backups.map(backup => (
                      <li key={backup.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-700/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 truncate">{backup.description}</p>
                          <p className="text-xs text-slate-500">{new Date(backup.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={() => { setSelectedBackup(backup); setRestoreDialog(true); }} className="ml-2 p-1.5 rounded text-slate-400 hover:text-amber-400 transition-colors" title="Restore this backup"><RotateCcw className="w-4 h-4" /></button>
                      </li>
                    ))}
                    {backups.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">No backups yet</p>}
                  </ul>
                </CardBody>
              </Card>
            </div>
            <Modal open={restoreDialog} onClose={() => setRestoreDialog(false)} title="Restore Backup"
              actions={<><Btn onClick={() => setRestoreDialog(false)}>Cancel</Btn><Btn variant="solid" onClick={handleRestoreBackup} className="bg-amber-600 hover:bg-amber-500">Restore</Btn></>}>
              <p className="text-sm text-slate-300">Are you sure you want to restore the backup from <span className="text-white font-medium">{selectedBackup && new Date(selectedBackup.timestamp).toLocaleString()}</span>?</p>
              <p className="text-xs text-slate-500">This will overwrite current files with the backup contents.</p>
            </Modal>
          </>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      )}
    </div>
  );
};
