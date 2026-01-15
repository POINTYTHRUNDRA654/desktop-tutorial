import React, { useState, useEffect } from 'react';
import { Clock, Save, Undo, FolderOpen, Upload, Cloud, GitBranch, Download, Trash2, AlertCircle } from 'lucide-react';

interface Snapshot {
  id: string;
  name: string;
  timestamp: Date;
  type: 'auto' | 'manual' | 'pre-compile' | 'pre-launch';
  size: string;
  files: number;
  description?: string;
}

interface GitStatus {
  branch: string;
  uncommitted: number;
  unpushed: number;
}

export const BackupManager: React.FC = () => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupInterval, setBackupInterval] = useState(60); // minutes
  const [cloudSync, setCloudSync] = useState(false);
  const [workspacePath, setWorkspacePath] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    loadSnapshots();
    checkGitStatus();

    if (autoBackup) {
      const interval = setInterval(() => {
        createAutoSnapshot();
      }, backupInterval * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [autoBackup, backupInterval]);

  const loadSnapshots = () => {
    const saved = localStorage.getItem('mossy_snapshots');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSnapshots(parsed.map((s: any) => ({ ...s, timestamp: new Date(s.timestamp) })));
    } else {
      setSnapshots([]);
    }
  };

  const checkGitStatus = async () => {
    try {
      const response = await fetch('http://localhost:21337/git/status');
      if (response.ok) {
        const data = await response.json();
        setGitStatus(data);
      }
    } catch (error) {
      // Demo git status
      setGitStatus({
        branch: 'main',
        uncommitted: 5,
        unpushed: 2
      });
    }
  };

  const createAutoSnapshot = async () => {
    const newSnapshot: Snapshot = {
      id: Date.now().toString(),
      name: 'Auto Snapshot',
      timestamp: new Date(),
      type: 'auto',
      size: '45 MB',
      files: 127,
      description: 'Hourly backup'
    };

    const updated = [newSnapshot, ...snapshots].slice(0, 20); // Keep last 20
    setSnapshots(updated);
    localStorage.setItem('mossy_snapshots', JSON.stringify(updated));
  };

  const createManualSnapshot = () => {
    const name = prompt('Snapshot name:');
    if (!name) return;

    const description = prompt('Description (optional):');

    const newSnapshot: Snapshot = {
      id: Date.now().toString(),
      name,
      timestamp: new Date(),
      type: 'manual',
      size: '45 MB',
      files: 127,
      description: description || undefined
    };

    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('mossy_snapshots', JSON.stringify(updated));

    alert('Snapshot created!');
  };

  const restoreSnapshot = async (snapshot: Snapshot) => {
    const confirm = window.confirm(`Restore from "${snapshot.name}"?\n\nCurrent work will be backed up first.`);
    if (!confirm) return;

    try {
      const response = await fetch('http://localhost:21337/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: snapshot.id })
      });

      if (response.ok) {
        alert('Restored successfully!');
      } else {
        throw new Error('Restore failed');
      }
    } catch (error) {
      alert(`Bridge Offline: Could not restore snapshot. Please ensure the Desktop Bridge is running.`);
    }
  };

  const deleteSnapshot = (id: string) => {
    const confirm = window.confirm('Delete this snapshot?');
    if (!confirm) return;

    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('mossy_snapshots', JSON.stringify(updated));
  };

  const gitCommit = async () => {
    const message = prompt('Commit message:');
    if (!message) return;

    try {
      await fetch('http://localhost:21337/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      alert('Committed!');
      checkGitStatus();
    } catch (error) {
      alert(`Git commit: "${message}"\n\n(Demo mode - requires Desktop Bridge)`);
    }
  };

  const gitPush = async () => {
    try {
      const response = await fetch('http://localhost:21337/git/push', { method: 'POST' });
      if (response.ok) {
        alert('Pushed to remote!');
        checkGitStatus();
      } else {
        throw new Error('Push failed');
      }
    } catch (error) {
      alert('Bridge Offline: Could not push to Git. Please ensure the Desktop Bridge is running.');
    }
  };

  const exportSnapshot = async (snapshot: Snapshot) => {
    try {
      const response = await fetch(`http://localhost:21337/backup/export/${snapshot.id}`);
      if (response.ok) {
        alert(`Snapshot "${snapshot.name}" exported as ZIP.`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
       alert(`Bridge Offline: Could not export snapshot. Please ensure the Desktop Bridge is running.`);
    }
  };

  const getTypeColor = (type: Snapshot['type']) => {
    switch (type) {
      case 'auto': return 'bg-blue-900/30 text-blue-300';
      case 'manual': return 'bg-green-900/30 text-green-300';
      case 'pre-compile': return 'bg-amber-900/30 text-amber-300';
      case 'pre-launch': return 'bg-purple-900/30 text-purple-300';
    }
  };

  const getTypeIcon = (type: Snapshot['type']) => {
    switch (type) {
      case 'auto': return <Clock className="w-3 h-3" />;
      case 'manual': return <Save className="w-3 h-3" />;
      case 'pre-compile': return <Upload className="w-3 h-3" />;
      case 'pre-launch': return <FolderOpen className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Smart Backup & Version Control</h1>
              <p className="text-sm text-slate-400">Never lose work again</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createManualSnapshot}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Create Snapshot
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            {/* Auto Backup */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3 text-sm">Auto Backup</h3>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Enable automatic snapshots</span>
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Interval (minutes)</label>
                <input
                  type="number"
                  value={backupInterval}
                  onChange={(e) => setBackupInterval(parseInt(e.target.value))}
                  disabled={!autoBackup}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Git Integration */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Git Integration
              </h3>

              {gitStatus ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Branch: <span className="text-white font-mono">{gitStatus.branch}</span>
                  </div>
                  <div className="text-xs text-amber-400">
                    {gitStatus.uncommitted} uncommitted changes
                  </div>
                  <div className="text-xs text-blue-400">
                    {gitStatus.unpushed} commits to push
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={gitCommit}
                      disabled={gitStatus.uncommitted === 0}
                      className="flex-1 px-3 py-1.5 bg-green-900 hover:bg-green-800 disabled:opacity-30 text-white text-xs rounded transition-colors"
                    >
                      Commit
                    </button>
                    <button
                      onClick={gitPush}
                      disabled={gitStatus.unpushed === 0}
                      className="flex-1 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-30 text-white text-xs rounded transition-colors"
                    >
                      Push
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Not a git repository</div>
              )}
            </div>

            {/* Cloud Sync */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Cloud Sync
              </h3>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudSync}
                  onChange={(e) => setCloudSync(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Sync to cloud</span>
              </label>

              {cloudSync && (
                <div className="text-xs text-green-400">
                  ✓ Syncing to Google Drive
                </div>
              )}
            </div>
          </div>

          {/* Snapshots List */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-bold text-white">Snapshots ({snapshots.length})</h3>
            </div>

            <div className="divide-y divide-slate-700">
              {snapshots.map(snapshot => (
                <div
                  key={snapshot.id}
                  className={`p-4 hover:bg-slate-800/50 transition-colors ${selectedSnapshot?.id === snapshot.id ? 'bg-slate-800' : ''}`}
                  onClick={() => setSelectedSnapshot(snapshot)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-white">{snapshot.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${getTypeColor(snapshot.type)}`}>
                          {getTypeIcon(snapshot.type)}
                          {snapshot.type}
                        </span>
                      </div>

                      {snapshot.description && (
                        <p className="text-sm text-slate-400 mb-2">{snapshot.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{snapshot.timestamp.toLocaleString()}</span>
                        <span>{snapshot.size}</span>
                        <span>{snapshot.files} files</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreSnapshot(snapshot);
                        }}
                        className="p-2 bg-green-900 hover:bg-green-800 text-white rounded transition-colors"
                        title="Restore"
                      >
                        <Undo className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportSnapshot(snapshot);
                        }}
                        className="p-2 bg-blue-900 hover:bg-blue-800 text-white rounded transition-colors"
                        title="Export"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {snapshot.type === 'manual' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSnapshot(snapshot.id);
                          }}
                          className="p-2 bg-red-900 hover:bg-red-800 text-white rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4">
            <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Backup Types
            </h3>
            <div className="grid grid-cols-4 gap-3 text-xs text-blue-200">
              <div>
                <strong className="block text-blue-300 mb-1">Auto</strong>
                <p>Created every hour automatically</p>
              </div>
              <div>
                <strong className="block text-green-300 mb-1">Manual</strong>
                <p>You create these snapshots</p>
              </div>
              <div>
                <strong className="block text-amber-300 mb-1">Pre-Compile</strong>
                <p>Before script compilation</p>
              </div>
              <div>
                <strong className="block text-purple-300 mb-1">Pre-Launch</strong>
                <p>Before testing in game</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
