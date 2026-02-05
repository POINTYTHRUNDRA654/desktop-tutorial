import React, { useState, useEffect } from 'react';
import { Folder, ChevronDown, Plus, Settings } from 'lucide-react';
import { ModProject } from '../../shared/types';

interface ProjectSelectorProps {
  currentProject: ModProject | null;
  onProjectChange: (project: ModProject) => void;
  onOpenProjectManager: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  currentProject,
  onProjectChange,
  onOpenProjectManager
}) => {
  const [projects, setProjects] = useState<ModProject[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (window.electronAPI?.listProjects) {
        const allProjects = await window.electronAPI.listProjects();
        setProjects(allProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (project: ModProject) => {
    try {
      if (window.electronAPI?.switchProject) {
        await window.electronAPI.switchProject(project.id);
        onProjectChange(project);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to switch project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 transition-colors min-w-[200px]"
      >
        <Folder className="w-4 h-4 text-green-400" />
        <span className="text-white truncate">
          {currentProject ? currentProject.name : 'No project selected'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1">
                Projects
              </div>

              {projects.length === 0 ? (
                <div className="px-2 py-3 text-center text-gray-500">
                  No projects available
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        currentProject?.id === project.id
                          ? 'bg-green-600 text-white'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {project.path}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-600 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenProjectManager();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 text-gray-300 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Manage Projects</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};