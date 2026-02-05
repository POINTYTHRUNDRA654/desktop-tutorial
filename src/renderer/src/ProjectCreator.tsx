import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, X, Save } from 'lucide-react';
import { ModProject, ProjectSettings } from '../../shared/types';

interface ProjectCreatorProps {
  onClose?: () => void;
  onProjectCreated?: (project: ModProject) => void;
}

export const ProjectCreator: React.FC<ProjectCreatorProps> = ({
  onClose,
  onProjectCreated,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    path: '',
    game: 'fallout4' as ModProject['game'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBrowsePath = async () => {
    try {
      if (window.electronAPI?.pickDirectory) {
        const selectedPath = await window.electronAPI.pickDirectory();
        if (selectedPath) {
          setFormData(prev => ({ ...prev, path: selectedPath }));
        }
      }
    } catch (err) {
      console.error('Failed to browse directory:', err);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.path.trim()) {
      setError('Project path is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        path: formData.path.trim(),
        game: formData.game,
        settings: {
          xeditPath: '',
          nifSkopePath: '',
          creationKitPath: '',
          blenderPath: '',
          gamePath: '',
          dataPath: '',
          outputPath: '',
          archivePath: '',
          preferredTools: [],
          autoBackup: true,
          backupInterval: 30,
        } as ProjectSettings,
        collaborators: [],
        versionControl: undefined,
        metadata: {
          modFiles: [],
          lastBackup: undefined,
          size: 0,
          tags: [],
        },
      };

      if (window.electronAPI?.createProject) {
        const newProject = await window.electronAPI.createProject(projectData);
        if (onProjectCreated) {
          onProjectCreated(newProject);
        }
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create New Project</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
              placeholder="My Awesome Mod"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-green-500 focus:outline-none resize-none"
              placeholder="A brief description of your mod project..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Game *
            </label>
            <select
              value={formData.game}
              onChange={(e) => setFormData(prev => ({ ...prev, game: e.target.value as ModProject['game'] }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-green-500 focus:outline-none"
            >
              <option value="fallout4">Fallout 4</option>
              <option value="skyrim">The Elder Scrolls V: Skyrim</option>
              <option value="skyrimse">Skyrim Special Edition</option>
              <option value="fallout76">Fallout 76</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Path *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                placeholder="C:\Mods\MyProject"
                required
              />
              <button
                type="button"
                onClick={handleBrowsePath}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                title="Browse Directory"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose an empty directory or existing mod project folder
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};