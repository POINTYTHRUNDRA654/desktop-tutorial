import React, { useState, useEffect } from 'react';
import { Users, GitBranch, GitCommit, GitPullRequest, Share2, UserPlus, X } from 'lucide-react';
import { CollaborationSession, Collaborator, VersionControlConfig } from '../../shared/types';

interface CollaborationManagerProps {
  onClose?: () => void;
}

export const CollaborationManager: React.FC<CollaborationManagerProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CollaborationSession | null>(null);
  const [gitConfig, setGitConfig] = useState<VersionControlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');

  useEffect(() => {
    loadCollaborationData();
  }, []);

  const loadCollaborationData = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      if (settings?.collaborationEnabled && settings?.collaborationSessions) {
        setSessions(settings.collaborationSessions);
      }
      // Git config would be per-project, so we'd need to get current project
      // For now, we'll initialize it as needed
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      // For now, we'll create a session by updating settings
      // In a real implementation, this would call an IPC method
      const settings = await window.electronAPI?.getSettings?.();
      if (settings) {
        const newSession: CollaborationSession = {
          id: `session_${Date.now()}`,
          projectId: settings.currentProjectId || '',
          participants: [],
          activeFiles: [],
          lastActivity: Date.now(),
          status: 'active'
        };
        const updatedSessions = [...(settings.collaborationSessions || []), newSession];
        await window.electronAPI?.setSettings?.({
          ...settings,
          collaborationSessions: updatedSessions
        });
        setSessions(updatedSessions);
        setNewSessionName('');
        setNewSessionDescription('');
        setShowCreateSession(false);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      if (window.electronAPI?.joinCollaborationSession) {
        const session = await window.electronAPI.joinCollaborationSession(sessionId);
        setCurrentSession(session);
      }
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleLeaveSession = async () => {
    if (!currentSession) return;

    try {
      if (window.electronAPI?.leaveCollaborationSession) {
        await window.electronAPI.leaveCollaborationSession(currentSession.id);
        setCurrentSession(null);
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  };

  const handleGitInit = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      const projectId = settings?.currentProjectId;
      if (projectId && window.electronAPI?.initGitRepository) {
        const gitConfig: VersionControlConfig = {
          type: 'git',
          repository: '',
          branch: 'main',
          remote: '',
          autoCommit: false,
          commitMessageTemplate: 'Update {files}',
          ignorePatterns: ['*.tmp', '*.bak', 'node_modules/']
        };
        await window.electronAPI.initGitRepository(projectId, gitConfig);
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to initialize git:', error);
    }
  };

  const handleGitCommit = async (message: string) => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      const projectId = settings?.currentProjectId;
      if (projectId && window.electronAPI?.gitCommit) {
        await window.electronAPI.gitCommit(projectId, message);
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to commit changes:', error);
    }
  };

  const handleGitPush = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      const projectId = settings?.currentProjectId;
      if (projectId && window.electronAPI?.gitPush) {
        await window.electronAPI.gitPush(projectId);
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to push changes:', error);
    }
  };

  const handleGitPull = async () => {
    try {
      const settings = await window.electronAPI?.getSettings?.();
      const projectId = settings?.currentProjectId;
      if (projectId && window.electronAPI?.gitPull) {
        await window.electronAPI.gitPull(projectId);
        await loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to pull changes:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-bold text-green-400">Collaboration & Version Control</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateSession(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-green-400">Active Session</h3>
                <p className="text-gray-300">Session {currentSession.id}</p>
              </div>
            </div>
            <button
              onClick={handleLeaveSession}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Leave
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{currentSession.participants.length}</div>
              <div className="text-gray-400 text-sm">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">{currentSession.activeFiles.length}</div>
              <div className="text-gray-400 text-sm">Active Files</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-400">
                {new Date(currentSession.lastActivity).toLocaleDateString()}
              </div>
              <div className="text-gray-400 text-sm">Last Activity</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                {currentSession.status === 'active' ? 'Active' : currentSession.status === 'idle' ? 'Idle' : 'Ended'}
              </div>
              <div className="text-gray-400 text-sm">Status</div>
            </div>
          </div>

          {currentSession.participants.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-2">Participants</h4>
              <div className="flex flex-wrap gap-2">
                {currentSession.participants.map((participant, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Git Version Control */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Version Control
        </h3>

        <div className="space-y-4">
          <div className="text-center py-8">
            <GitBranch className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Git version control for current project</p>
            <button
              onClick={handleGitInit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Initialize Git Repository
            </button>
          </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded">
                  <GitCommit className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <button
                    onClick={() => {
                      const message = prompt('Commit message:');
                      if (message) handleGitCommit(message);
                    }}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                  >
                    Commit Changes
                  </button>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded">
                  <GitPullRequest className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <button
                    onClick={handleGitPush}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    Push Changes
                  </button>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded">
                  <GitBranch className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <button
                    onClick={handleGitPull}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                  >
                    Pull Changes
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Available Sessions */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Available Sessions</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No collaboration sessions available</p>
            <p className="text-gray-500 text-sm mt-2">Create a new session to start collaborating</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded">
                <div>
                  <h4 className="text-white font-medium">Session {session.id.slice(-8)}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{session.participants.length} participants</span>
                    <span>{session.activeFiles.length} active files</span>
                    <span>Last activity: {new Date(session.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinSession(session.id)}
                  disabled={currentSession?.id === session.id}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  {currentSession?.id === session.id ? 'Joined' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Collaboration Session</h3>
              <button
                onClick={() => setShowCreateSession(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-1">Session Name</label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:outline-none"
                  placeholder="Enter session name"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-1">Description (Optional)</label>
                <textarea
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Describe the collaboration session"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateSession(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};