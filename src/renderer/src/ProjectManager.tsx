import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Settings, Trash2, GitBranch, Users, BarChart3, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModProject, ProjectSettings } from '../../shared/types';

interface ProjectManagerProps {
  embedded?: boolean;
  onProjectSelect?: (project: ModProject) => void;
  onProjectCreate?: () => void;
  onProjectSettings?: (project: ModProject) => void;
}

const GAME_OPTIONS: ModProject['game'][] = ['fallout4', 'skyrim', 'skyrimse', 'fallout76', 'other'];

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  embedded = false,
  onProjectSelect,
  onProjectCreate,
  onProjectSettings,
}) => {
  const [projects, setProjects] = useState<ModProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ModProject | null>(null);
  const [loading, setLoading] = useState(true);
  // ProjectHub.tsx renders this component with no callback props at all, so "New Project"
  // and "Settings" silently no-op'd. Both now work standalone via real IPC (createProject/
  // updateProject) when no callback is supplied, while still respecting explicit callbacks
  // from any parent that does wire them.
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [settingsProject, setSettingsProject] = useState<ModProject | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formGame, setFormGame] = useState<ModProject['game']>('fallout4');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (window.electronAPI?.listProjects) {
        const projectList = await window.electronAPI.listProjects();
        setProjects(projectList);

        if (window.electronAPI.getCurrentProject) {
          const current = await window.electronAPI.getCurrentProject();
          setCurrentProject(current);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSwitch = async (project: ModProject) => {
    try {
      if (window.electronAPI?.switchProject) {
        await window.electronAPI.switchProject(project.id);
        setCurrentProject(project);
        onProjectSelect?.(project);
      }
    } catch (error) {
      console.error('Failed to switch project:', error);
    }
  };

  const browseForPath = async () => {
    const api = window.electronAPI as any;
    const picked = await api?.pickDirectory?.('Select the project root folder');
    if (picked) setFormPath(picked);
  };

  const openCreateForm = () => {
    if (onProjectCreate) { onProjectCreate(); return; }
    setFormName(''); setFormDescription(''); setFormPath(''); setFormGame('fallout4');
    setShowCreateForm(true);
  };

  const submitCreateForm = async () => {
    if (!formName.trim() || !formPath.trim()) {
      toast.error('Name and path are required.');
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      const newProject: ModProject = {
        id: `project_${now}_${Math.random().toString(36).slice(2, 9)}`,
        name: formName.trim(),
        description: formDescription.trim(),
        path: formPath.trim(),
        game: formGame,
        createdAt: now,
        updatedAt: now,
        settings: { preferredTools: [], autoBackup: false, backupInterval: 30 },
        metadata: { modFiles: [], size: 0, tags: [] },
      };
      const res = await (window.electronAPI as any)?.createProject?.(newProject);
      if (res?.success === false) {
        toast.error(res.error || 'Failed to create project.');
        return;
      }
      toast.success(`Project "${newProject.name}" created.`);
      setShowCreateForm(false);
      await loadProjects();
    } catch (error: any) {
      toast.error(`Failed to create project: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const openSettingsForm = (project: ModProject) => {
    if (onProjectSettings) { onProjectSettings(project); return; }
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormPath(project.path);
    setFormGame(project.game);
    setSettingsProject(project);
  };

  const submitSettingsForm = async () => {
    if (!settingsProject) return;
    if (!formName.trim() || !formPath.trim()) {
      toast.error('Name and path are required.');
      return;
    }
    setSaving(true);
    try {
      const updated: ModProject = {
        ...settingsProject,
        name: formName.trim(),
        description: formDescription.trim(),
        path: formPath.trim(),
        game: formGame,
        updatedAt: Date.now(),
      };
      const res = await (window.electronAPI as any)?.updateProject?.(updated);
      if (res?.success === false) {
        toast.error(res.error || 'Failed to save project settings.');
        return;
      }
      toast.success('Project settings saved.');
      setSettingsProject(null);
      await loadProjects();
    } catch (error: any) {
      toast.error(`Failed to save project settings: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleProjectDelete = async (project: ModProject) => {
    if (!confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (window.electronAPI?.deleteProject) {
        await window.electronAPI.deleteProject(project.id);
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const containerClassName = embedded ? 'p-4 space-y-6' : 'p-6 space-y-6';

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-green-400">Project Manager</h2>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {currentProject && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400 font-medium">Current Project</span>
          </div>
          <h3 className="text-lg font-semibold text-white">{currentProject.name}</h3>
          <p className="text-gray-400 text-sm">{currentProject.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>Path: {currentProject.path}</span>
            <span>Game: {currentProject.game}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">All Projects</h3>

        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet. Create your first project to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`border rounded-lg p-4 transition-colors ${
                  currentProject?.id === project.id
                    ? 'border-green-500 bg-green-900/10'
                    : 'border-gray-600 bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-white">{project.name}</h4>
                    <p className="text-gray-400 text-sm mb-2">{project.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Path: {project.path}</span>
                      <span>Game: {project.game}</span>
                      <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {project.versionControl && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <GitBranch className="w-3 h-3" />
                          <span>Git</span>
                        </div>
                      )}
                      {project.collaborators && project.collaborators.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <Users className="w-3 h-3" />
                          <span>{project.collaborators.length} collaborators</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentProject?.id !== project.id && (
                      <button
                        onClick={() => handleProjectSwitch(project)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Switch
                      </button>
                    )}
                    <button
                      onClick={() => openSettingsForm(project)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Project Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleProjectDelete(project)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateForm || settingsProject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-gray-800 border border-gray-600 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {settingsProject ? `Settings — ${settingsProject.name}` : 'New Project'}
              </h3>
              <button
                onClick={() => { setShowCreateForm(false); setSettingsProject(null); }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  placeholder="My FO4 Mod"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Project Path</label>
                <div className="flex gap-2">
                  <input
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    placeholder="C:\ModOrganizer2\mods\MyMod"
                  />
                  <button onClick={browseForPath} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white">Browse</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Game</label>
                <select
                  value={formGame}
                  onChange={(e) => setFormGame(e.target.value as ModProject['game'])}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                >
                  {GAME_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowCreateForm(false); setSettingsProject(null); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
              >
                Cancel
              </button>
              <button
                onClick={settingsProject ? submitSettingsForm : submitCreateForm}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded"
              >
                {saving ? 'Saving…' : settingsProject ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};