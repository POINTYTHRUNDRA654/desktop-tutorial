/**
 * Cloud Sync Component
 * Manages project synchronization, collaboration, conflicts, and version control
 * 
 * Six Main Sections:
 * 1. Sync Dashboard - Status, bandwidth, storage, auto-sync
 * 2. Project Sharing - Invite, permissions, collaborators
 * 3. Change Feed - Real-time activity stream
 * 4. Conflict Resolver - Side-by-side diff, merge options
 * 5. Version History - Snapshots, restore, compare
 * 6. Settings - Provider, strategy, encryption, limits
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  Share2,
  Activity,
  AlertTriangle,
  Clock,
  Settings as SettingsIcon,
  Plus,
  Download,
  Trash2,
  User,
  Copy,
  Check,
  X,
  Eye,
  Edit2,
  Shield,
} from 'lucide-react';

interface SyncDashboardState {
  status: 'synced' | 'syncing' | 'conflicts' | 'error';
  lastSync: number;
  nextSync?: number;
  bandwidthUsage: number;
  autoSyncEnabled: boolean;
  syncProgress: number;
}

interface ProjectSharingState {
  collaborators: Array<{
    userId: string;
    username: string;
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    avatar?: string;
  }>;
  inviteLink?: string;
  showInviteDialog: boolean;
}

interface ChangeEntry {
  id: string;
  userId: string;
  username: string;
  timestamp: number;
  type: 'file-add' | 'file-modify' | 'file-delete' | 'metadata-change';
  path: string;
  message?: string;
}

interface ConflictEntry {
  id: string;
  filePath: string;
  localAuthor: string;
  remoteAuthor: string;
  localTimestamp: number;
  remoteTimestamp: number;
  resolution?: 'keep-local' | 'keep-remote' | 'merge';
}

interface VersionSnapshot {
  id: string;
  timestamp: number;
  author: string;
  message?: string;
  fileCount: number;
  size: number;
}

export function CloudSync() {
  // Dashboard state
  const [dashboard, setDashboard] = useState<SyncDashboardState>({
    status: 'synced',
    lastSync: Date.now() - 5 * 60000, // 5 minutes ago
    autoSyncEnabled: true,
    bandwidthUsage: 0,
    syncProgress: 100,
  });

  // Sharing state
  const [sharing, setSharing] = useState<ProjectSharingState>({
    collaborators: [
      {
        userId: 'user1',
        username: 'Alice',
        email: 'alice@example.com',
        role: 'owner',
        avatar: '👩‍💻',
      },
      {
        userId: 'user2',
        username: 'Bob',
        email: 'bob@example.com',
        role: 'editor',
        avatar: '👨‍💻',
      },
    ],
    showInviteDialog: false,
  });

  // Change feed state
  const [changeLog, setChangeLog] = useState<ChangeEntry[]>([
    {
      id: 'change1',
      userId: 'user1',
      username: 'Alice',
      timestamp: Date.now() - 30000,
      type: 'file-modify',
      path: 'assets/meshes/character.nif',
      message: 'Updated character model',
    },
    {
      id: 'change2',
      userId: 'user2',
      username: 'Bob',
      timestamp: Date.now() - 60000,
      type: 'file-add',
      path: 'textures/character_face.dds',
    },
    {
      id: 'change3',
      userId: 'user1',
      username: 'Alice',
      timestamp: Date.now() - 120000,
      type: 'metadata-change',
      path: 'project.json',
    },
  ]);

  // Conflicts state
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([
    {
      id: 'conflict1',
      filePath: 'scripts/quest.psc',
      localAuthor: 'Alice',
      remoteAuthor: 'Bob',
      localTimestamp: Date.now() - 30000,
      remoteTimestamp: Date.now() - 60000,
    },
  ]);

  // Version history state
  const [versions, setVersions] = useState<VersionSnapshot[]>([
    {
      id: 'v1',
      timestamp: Date.now(),
      author: 'Alice',
      message: 'Latest - Updated character',
      fileCount: 342,
      size: 156 * 1024 * 1024,
    },
    {
      id: 'v2',
      timestamp: Date.now() - 3600000,
      author: 'Bob',
      message: 'Added texture assets',
      fileCount: 340,
      size: 152 * 1024 * 1024,
    },
    {
      id: 'v3',
      timestamp: Date.now() - 7200000,
      author: 'Alice',
      message: 'Initial commit',
      fileCount: 315,
      size: 140 * 1024 * 1024,
    },
  ]);

  // Settings state
  const [settings, setSettings] = useState({
    provider: 'pocketbase',
    conflictResolution: 'manual' as const,
    compressionEnabled: true,
    encryptionEnabled: true,
    bandwidthLimit: 1000, // KB/s
    excludePatterns: ['*.tmp', '.DS_Store', 'node_modules/'],
  });

  // Active section
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'sharing' | 'feed' | 'conflicts' | 'history' | 'settings'
  >('dashboard');

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  // Handlers
  const handleManualSync = useCallback(() => {
    setDashboard((prev) => ({
      ...prev,
      status: 'syncing',
      syncProgress: 0,
    }));

    // Simulate sync progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDashboard((prev) => ({
          ...prev,
          status: 'synced',
          syncProgress: 100,
          lastSync: Date.now(),
        }));
      } else {
        setDashboard((prev) => ({
          ...prev,
          syncProgress: progress,
        }));
      }
    }, 300);
  }, []);

  const handleToggleAutoSync = useCallback(() => {
    setDashboard((prev) => ({
      ...prev,
      autoSyncEnabled: !prev.autoSyncEnabled,
    }));
  }, []);

  const handleInviteCollaborator = useCallback(() => {
    if (!inviteEmail.trim()) return;

    // Add collaborator
    setSharing((prev) => ({
      ...prev,
      collaborators: [
        ...prev.collaborators,
        {
          userId: `user_${Date.now()}`,
          username: inviteEmail.split('@')[0],
          email: inviteEmail,
          role: inviteRole,
        },
      ],
      showInviteDialog: false,
    }));

    setInviteEmail('');
  }, [inviteEmail, inviteRole]);

  const handleCopyInviteLink = useCallback(() => {
    const link = `https://fallout-modding.app/join/abc123def456`;
    navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }, []);

  const handleRevokeAccess = useCallback((userId: string) => {
    setSharing((prev) => ({
      ...prev,
      collaborators: prev.collaborators.filter((c) => c.userId !== userId),
    }));
  }, []);

  const handleResolveConflict = useCallback(
    (conflictId: string, resolution: 'keep-local' | 'keep-remote' | 'merge') => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? { ...c, resolution }
            : c
        )
      );
    },
    []
  );

  const handleRestoreVersion = useCallback((versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      alert(`Would restore to: ${version.message}`);
      // Trigger actual restore
    }
  }, [versions]);

  // Storage quota simulation
  const storageUsed = 456 * 1024 * 1024; // 456 MB
  const storageTotal = 1024 * 1024 * 1024; // 1 GB
  const storagePercentage = Math.round((storageUsed / storageTotal) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Cloud className="w-8 h-8 text-blue-400" />
            Cloud Sync Control
          </h1>
          <p className="text-slate-400 mt-2">Manage project synchronization and collaboration</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-700 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Cloud },
            { id: 'sharing', label: 'Sharing', icon: Share2 },
            { id: 'feed', label: 'Activity', icon: Activity },
            { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`px-4 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeSection === id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* SYNC DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Status Card */}
            <div
              className={`rounded-lg border p-6 backdrop-blur ${
                dashboard.status === 'synced'
                  ? 'border-green-500/30 bg-green-500/10'
                  : dashboard.status === 'syncing'
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-red-500/30 bg-red-500/10'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Sync Status</h2>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                    dashboard.status === 'synced'
                      ? 'bg-green-500/20 text-green-300'
                      : dashboard.status === 'syncing'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {dashboard.status.charAt(0).toUpperCase() + dashboard.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Last Sync</p>
                  <p className="text-lg font-mono">
                    {new Date(dashboard.lastSync).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Sync Progress</p>
                  <p className="text-lg font-mono">{Math.round(dashboard.syncProgress)}%</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Bandwidth</p>
                  <p className="text-lg font-mono">{dashboard.bandwidthUsage.toFixed(1)} KB/s</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Auto-Sync</p>
                  <p className="text-lg font-mono">
                    {dashboard.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {dashboard.status === 'syncing' && (
                <div className="mb-4">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${dashboard.syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleManualSync}
                  disabled={dashboard.status === 'syncing'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {dashboard.status === 'syncing' ? 'Syncing...' : 'Manual Sync'}
                </button>
                <button
                  onClick={handleToggleAutoSync}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  {dashboard.autoSyncEnabled ? 'Disable' : 'Enable'} Auto-Sync
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bandwidth Graph */}
              <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
                <h3 className="font-semibold mb-4">Bandwidth Usage</h3>
                <div className="bg-slate-700/50 rounded h-40 flex items-end justify-around gap-1 p-4">
                  {[30, 45, 20, 60, 50, 40, 55].map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                      style={{ height: `${(value / 60) * 100}%` }}
                    />
                  ))}
                </div>
                <p className="text-slate-400 text-sm mt-2">Current: 45 KB/s</p>
              </div>

              {/* Storage Quota */}
              <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
                <h3 className="font-semibold mb-4">Storage Quota</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      {(storageUsed / (1024 * 1024)).toFixed(0)} MB / 1024 MB
                    </span>
                    <span className="font-mono text-blue-300">{storagePercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full"
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs">
                    {((storageTotal - storageUsed) / (1024 * 1024)).toFixed(0)} MB remaining
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROJECT SHARING */}
        {activeSection === 'sharing' && (
          <div className="space-y-6">
            {/* Collaborators List */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Collaborators ({sharing.collaborators.length})</h2>
                <button
                  onClick={() => setSharing((prev) => ({ ...prev, showInviteDialog: true }))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite
                </button>
              </div>

              <div className="space-y-3">
                {sharing.collaborators.map((c) => (
                  <div
                    key={c.userId}
                    className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-semibold">
                        {c.avatar || c.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{c.username}</p>
                        <p className="text-sm text-slate-400">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.role === 'owner'
                            ? 'bg-purple-500/20 text-purple-300'
                            : c.role === 'editor'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {c.role.charAt(0).toUpperCase() + c.role.slice(1)}
                      </span>
                      {c.role !== 'owner' && (
                        <button
                          onClick={() => handleRevokeAccess(c.userId)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Link */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
              <h3 className="text-lg font-semibold mb-4">Share Link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="https://fallout-modding.app/join/abc123def456"
                  readOnly
                  className="flex-1 px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-slate-400 text-sm mt-2">Expires in 7 days</p>
            </div>

            {/* Invite Dialog */}
            {sharing.showInviteDialog && (
              <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/50">
                <h3 className="text-lg font-semibold mb-4">Invite Collaborator</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="collaborator@example.com"
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="editor">Editor (Can modify files)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleInviteCollaborator}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                    >
                      Send Invite
                    </button>
                    <button
                      onClick={() => setSharing((prev) => ({ ...prev, showInviteDialog: false }))}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHANGE FEED */}
        {activeSection === 'feed' && (
          <div className="space-y-6">
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

              <div className="space-y-3">
                {changeLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-lg font-semibold">
                      {entry.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <span className="text-blue-300">{entry.username}</span>
                        {' '}
                        <span className="text-slate-400">
                          {entry.type === 'file-add'
                            ? 'added'
                            : entry.type === 'file-modify'
                              ? 'modified'
                              : entry.type === 'file-delete'
                                ? 'deleted'
                                : 'updated metadata in'}
                        </span>
                        {' '}
                        <span className="text-amber-300 font-mono text-sm">{entry.path.split('/').pop()}</span>
                      </p>
                      {entry.message && <p className="text-slate-400 text-sm mt-1">{entry.message}</p>}
                      <p className="text-slate-500 text-xs mt-2">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button className="px-3 py-1 bg-slate-600/50 hover:bg-slate-600 rounded text-sm transition-colors">
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONFLICT RESOLVER */}
        {activeSection === 'conflicts' && (
          <div className="space-y-6">
            {conflicts.length === 0 ? (
              <div className="border border-green-500/30 rounded-lg p-8 bg-green-500/10 text-center">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-lg font-medium">No Conflicts</p>
                <p className="text-slate-400">All files are synchronized</p>
              </div>
            ) : (
              conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="border border-red-500/30 rounded-lg p-6 bg-red-500/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        {conflict.filePath}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Conflicting changes by {conflict.localAuthor} and {conflict.remoteAuthor}
                      </p>
                    </div>
                    {conflict.resolution && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                        ✓ Resolved
                      </span>
                    )}
                  </div>

                  {!conflict.resolution && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Local Version */}
                      <div className="bg-slate-700/30 rounded p-4 border border-blue-500/30">
                        <p className="text-sm font-medium text-blue-300 mb-2">Local Version</p>
                        <p className="text-xs text-slate-400 mb-2">
                          by {conflict.localAuthor} • {new Date(conflict.localTimestamp).toLocaleString()}
                        </p>
                        <pre className="text-xs bg-slate-800 p-2 rounded overflow-auto max-h-24 text-slate-300">
                          {`// Local version content\n// Modified by ${conflict.localAuthor}`}
                        </pre>
                      </div>

                      {/* Remote Version */}
                      <div className="bg-slate-700/30 rounded p-4 border border-purple-500/30">
                        <p className="text-sm font-medium text-purple-300 mb-2">Remote Version</p>
                        <p className="text-xs text-slate-400 mb-2">
                          by {conflict.remoteAuthor} • {new Date(conflict.remoteTimestamp).toLocaleString()}
                        </p>
                        <pre className="text-xs bg-slate-800 p-2 rounded overflow-auto max-h-24 text-slate-300">
                          {`// Remote version content\n// Modified by ${conflict.remoteAuthor}`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {!conflict.resolution && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'keep-local')}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg font-medium transition-colors text-blue-300"
                      >
                        Keep Local
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'keep-remote')}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg font-medium transition-colors text-purple-300"
                      >
                        Keep Remote
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'merge')}
                        className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 rounded-lg font-medium transition-colors text-amber-300"
                      >
                        Merge
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* VERSION HISTORY */}
        {activeSection === 'history' && (
          <div className="space-y-6">
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">Project Snapshots</h2>

              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 hover:bg-slate-700/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {version.message}
                          {index === 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                              Latest
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          by {version.author} • {new Date(version.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-slate-300">
                          {(version.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                        <p className="text-xs text-slate-400">{version.fileCount} files</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleRestoreVersion(version.id)}
                        className="px-3 py-1 bg-slate-600/50 hover:bg-slate-600 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Restore
                      </button>
                      <button className="px-3 py-1 bg-slate-600/50 hover:bg-slate-600 rounded text-sm font-medium flex items-center gap-1 transition-colors">
                        <Eye className="w-3 h-3" />
                        Compare
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium flex items-center gap-2 transition-colors w-full justify-center">
                <Plus className="w-4 h-4" />
                Create Manual Snapshot
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/30">
              <h2 className="text-xl font-semibold mb-6">Sync Settings</h2>

              <div className="space-y-6">
                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium mb-2">Cloud Provider</label>
                  <select
                    value={settings.provider}
                    onChange={(e) => setSettings((prev) => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="pocketbase">PocketBase (Self-Hosted)</option>
                    <option value="firebase">Firebase</option>
                    <option value="aws">AWS</option>
                    <option value="supabase">Supabase</option>
                  </select>
                </div>

                {/* Conflict Resolution */}
                <div>
                  <label className="block text-sm font-medium mb-2">Conflict Resolution</label>
                  <select
                    value={settings.conflictResolution}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, conflictResolution: e.target.value as any }))
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="last-write-wins">Last Write Wins</option>
                    <option value="manual">Manual Resolution</option>
                    <option value="merge-automatic">Automatic Merge</option>
                  </select>
                </div>

                {/* Bandwidth Limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bandwidth Limit (KB/s)
                  </label>
                  <input
                    type="number"
                    value={settings.bandwidthLimit}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, bandwidthLimit: parseInt(e.target.value) }))
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Compression */}
                <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <div>
                    <p className="font-medium">Enable Compression</p>
                    <p className="text-sm text-slate-400">Reduce file size with gzip</p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, compressionEnabled: !prev.compressionEnabled }))
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.compressionEnabled
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}
                  >
                    {settings.compressionEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Encryption */}
                <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Enable Encryption
                    </p>
                    <p className="text-sm text-slate-400">AES-256 end-to-end encryption</p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, encryptionEnabled: !prev.encryptionEnabled }))
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.encryptionEnabled
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}
                  >
                    {settings.encryptionEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Exclude Patterns */}
                <div>
                  <label className="block text-sm font-medium mb-2">Exclude Patterns (.gitignore style)</label>
                  <textarea
                    value={settings.excludePatterns.join('\n')}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        excludePatterns: e.target.value.split('\n').filter((p) => p.trim()),
                      }))
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm h-32"
                  />
                  <p className="text-slate-400 text-xs mt-2">One pattern per line</p>
                </div>

                {/* Save Button */}
                <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CloudSync;
