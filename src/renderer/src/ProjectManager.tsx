import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Settings, Trash2, GitBranch, Users, BarChart3 } from 'lucide-react';
import { ModProject, ProjectSettings } from '../../shared/types';

interface ProjectManagerProps {
  embedded?: boolean;
  onProjectSelect?: (project: ModProject) => void;
  onProjectCreate?: () => void;
  onProjectSettings?: (project: ModProject) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  embedded = false,
  onProjectSelect,
  onProjectCreate,
  onProjectSettings,
}) => {
  const [projects, setProjects] = useState<ModProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ModProject | null>(null);
  const [loading, setLoading] = useState(true);

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
          onClick={onProjectCreate}
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
                      onClick={() => onProjectSettings?.(project)}
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
    </div>
  );
};