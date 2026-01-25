import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, FileText, Trash2, Settings, CheckCircle2, Clock, AlertCircle, TrendingUp, FolderOpen, Zap } from 'lucide-react';
import { ModProjectStorage } from './services/ModProjectStorage';
import type { ModProject, ModProjectListItem, CreateModProjectInput, ModType } from './types/ModProject';

interface CreateModalState {
  isOpen: boolean;
  name: string;
  description: string;
  type: ModType;
  author: string;
}

const ModProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<ModProjectListItem[]>([]);
  const [currentMod, setCurrentMod] = useState<ModProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'create'>('list');
  
  const [createModal, setCreateModal] = useState<CreateModalState>({
    isOpen: false,
    name: '',
    description: '',
    type: 'weapon',
    author: 'Player',
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'steps' | 'settings'>('overview');

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
    const current = ModProjectStorage.getCurrentMod();
    setCurrentMod(current);
  }, []);

  const refreshProjects = () => {
    const items = ModProjectStorage.getProjectListItems();
    setProjects(items);
  };

  const handleCreateProject = () => {
    if (!createModal.name.trim()) {
      alert('Mod name is required');
      return;
    }

    const input: CreateModProjectInput = {
      name: createModal.name,
      description: createModal.description,
      type: createModal.type,
      author: createModal.author,
    };

    const newProject = ModProjectStorage.createModProject(input);
    refreshProjects();
    
    // Auto-set as current mod
    ModProjectStorage.setCurrentMod(newProject.id);
    setCurrentMod(newProject);

    // Reset modal
    setCreateModal({
      isOpen: false,
      name: '',
      description: '',
      type: 'weapon',
      author: 'Player',
    });

    // Go to detail view
    setSelectedProjectId(newProject.id);
    setActiveView('detail');
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveView('detail');
    const project = ModProjectStorage.getProject(projectId);
    if (project) {
      ModProjectStorage.setCurrentMod(projectId);
      setCurrentMod(project);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this mod project? This cannot be undone.')) {
      ModProjectStorage.deleteProject(projectId);
      refreshProjects();
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setActiveView('list');
        setCurrentMod(null);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-blue-400 bg-blue-900/20';
      case 'in-progress': return 'text-amber-400 bg-amber-900/20';
      case 'testing': return 'text-purple-400 bg-purple-900/20';
      case 'released': return 'text-emerald-400 bg-emerald-900/20';
      case 'abandoned': return 'text-slate-400 bg-slate-900/20';
      default: return 'text-slate-400 bg-slate-900/20';
    }
  };

  const getTypeIcon = (type: ModType) => {
    const icons: Record<ModType, string> = {
      weapon: '⚔️',
      armor: '🛡️',
      quest: '📜',
      settlement: '🏗️',
      gameplay: '🎮',
      texture: '🎨',
      mesh: '🔲',
      script: '⚙️',
      other: '📦',
    };
    return icons[type] || '📦';
  };

  // --- RENDER: LIST VIEW ---
  if (activeView === 'list') {
    return (
      <div className="h-full flex flex-col bg-[#0c0a09] text-slate-200 font-sans overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-800 bg-[#1c1917] flex justify-between items-center z-10">
          <div>
            <h1 className="text-2xl font-bold text-stone-200 flex items-center gap-3">
              <FolderOpen className="w-7 h-7 text-amber-500" />
              Mod Projects
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-1">Create and manage your modding projects</p>
          </div>
          <button
            onClick={() => setActiveView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            New Mod
          </button>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FolderOpen className="w-16 h-16 text-stone-700 mb-4" />
              <h3 className="text-xl font-bold text-stone-400 mb-2">No Projects Yet</h3>
              <p className="text-stone-500 mb-6 max-w-sm">
                Start your first mod by clicking "New Mod" above. Your mods will appear here.
              </p>
              <button
                onClick={() => setActiveView('create')}
                className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-all"
              >
                Create First Mod
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProject(proj.id)}
                  className={`p-5 rounded-lg border-2 transition-all cursor-pointer ${
                    currentMod?.id === proj.id
                      ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-500/20'
                      : 'border-stone-700 bg-stone-900/30 hover:border-stone-600 hover:bg-stone-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(proj.type)}</span>
                      <div>
                        <h3 className="font-bold text-stone-200 text-sm">{proj.name}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(proj.status)}`}>
                          {proj.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                      className="p-1 hover:bg-red-900/30 rounded text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-stone-400">Progress</span>
                      <span className="text-xs font-bold text-amber-500">{proj.completionPercentage}%</span>
                    </div>
                    <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500"
                        style={{ width: `${proj.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 text-[11px] text-stone-400 mb-3">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{proj.completedStepCount}/{proj.stepCount} steps</span>
                    <span className="text-stone-600">•</span>
                    <span>v{proj.version}</span>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors text-xs font-bold">
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: CREATE VIEW ---
  if (activeView === 'create') {
    const modTypes: ModType[] = ['weapon', 'armor', 'quest', 'settlement', 'gameplay', 'texture', 'mesh', 'script', 'other'];

    return (
      <div className="h-full flex flex-col bg-[#0c0a09] text-slate-200 font-sans overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-800 bg-[#1c1917] flex justify-between items-center z-10">
          <h1 className="text-2xl font-bold text-stone-200">Create New Mod Project</h1>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 text-stone-400 hover:text-stone-200 font-bold rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            <div className="space-y-6">
              {/* Mod Name */}
              <div>
                <label className="block text-sm font-bold text-stone-300 mb-2">Mod Name *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createModal.name}
                    onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })}
                    autoFocus
                    placeholder="e.g., 'Plasma Rifle Overhaul'"
                    className="flex-1 px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setCreateModal({ ...createModal, name: text });
                      } catch (err) {
                        console.warn('Clipboard read failed:', err);
                      }
                    }}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-stone-200 text-sm font-bold"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-stone-300 mb-2">Description</label>
                <textarea
                  value={createModal.description}
                  onChange={(e) => setCreateModal({ ...createModal, description: e.target.value })}
                  placeholder="What does this mod do? What's your vision for it?"
                  rows={4}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-bold text-stone-300 mb-2">Mod Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {modTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setCreateModal({ ...createModal, type })}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                        createModal.type === type
                          ? 'bg-amber-700 text-white border border-amber-600'
                          : 'bg-stone-900 text-stone-400 border border-stone-700 hover:border-stone-600'
                      }`}
                    >
                      {getTypeIcon(type)} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-bold text-stone-300 mb-2">Author</label>
                <input
                  type="text"
                  value={createModal.author}
                  onChange={(e) => setCreateModal({ ...createModal, author: e.target.value })}
                  placeholder="Your name or username"
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-all"
                />
              </div>

              {/* Create Button */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 py-3 px-6 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Mod Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DETAIL VIEW ---
  if (activeView === 'detail' && selectedProjectId) {
    const project = ModProjectStorage.getProject(selectedProjectId);
    if (!project) return null;

    const stats = ModProjectStorage.getProjectStats(selectedProjectId);

    return (
      <DetailView
        project={project}
        stats={stats}
        onBack={() => {
          setActiveView('list');
          setSelectedProjectId(null);
        }}
        onRefresh={() => {
          const updated = ModProjectStorage.getProject(selectedProjectId);
          if (updated) setCurrentMod(updated);
          refreshProjects();
        }}
      />
    );
  }

  return null;
};

// --- DETAIL VIEW COMPONENT ---

interface DetailViewProps {
  project: ModProject;
  stats: any;
  onBack: () => void;
  onRefresh: () => void;
}

const DetailView: React.FC<DetailViewProps> = ({ project, stats, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'settings'>('overview');
  const [editingName, setEditingName] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    ModProjectStorage.addStep(project.id, {
      title: newStepTitle,
      description: '',
      priority: 'medium',
    });
    setNewStepTitle('');
    setShowAddStep(false);
    onRefresh();
  };

  const handleUpdateStepStatus = (stepId: string, newStatus: any) => {
    ModProjectStorage.updateStep(project.id, stepId, { status: newStatus });
    onRefresh();
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm('Delete this step?')) {
      ModProjectStorage.deleteStep(project.id, stepId);
      onRefresh();
    }
  };

  const handleUpdateProjectStatus = (newStatus: any) => {
    ModProjectStorage.updateProject(project.id, { status: newStatus });
    onRefresh();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'text-blue-400 bg-blue-900/20',
      'in-progress': 'text-amber-400 bg-amber-900/20',
      testing: 'text-purple-400 bg-purple-900/20',
      released: 'text-emerald-400 bg-emerald-900/20',
      abandoned: 'text-slate-400 bg-slate-900/20',
    };
    return colors[status] || 'text-slate-400 bg-slate-900/20';
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in-progress':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0a09] text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-stone-800 bg-[#1c1917] flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-200">{project.name}</h1>
            <p className="text-xs text-stone-500 font-mono mt-1">v{project.version} • {project.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => handleUpdateProjectStatus(e.target.value)}
            className={`px-3 py-1 rounded text-xs font-bold border-0 outline-none cursor-pointer ${getStatusColor(
              project.status
            )}`}
          >
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="released">Released</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-800 bg-[#0c0a09] px-6 flex gap-1">
        {(['overview', 'steps', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab
                ? 'border-amber-600 text-amber-500'
                : 'border-transparent text-stone-500 hover:text-stone-400'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="max-w-4xl space-y-6">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                  <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Completed
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{stats.completedSteps}</div>
                  <div className="text-xs text-stone-600 mt-1">of {stats.totalSteps} steps</div>
                </div>

                <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                  <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    In Progress
                  </div>
                  <div className="text-2xl font-bold text-amber-400">{stats.inProgressSteps}</div>
                  <div className="text-xs text-stone-600 mt-1">active steps</div>
                </div>

                <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                  <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-400" />
                    Progress
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{stats.completionPercentage}%</div>
                  <div className="text-xs text-stone-600 mt-1">complete</div>
                </div>

                <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                  <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-400" />
                    Time Spent
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{Math.round(stats.totalActualHours)}h</div>
                  <div className="text-xs text-stone-600 mt-1">of {Math.round(stats.totalEstimatedHours)}h est.</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-stone-300">Overall Progress</span>
                <span className="text-sm font-bold text-amber-500">{project.completionPercentage}%</span>
              </div>
              <div className="h-3 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-500"
                  style={{ width: `${project.completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                <h3 className="text-sm font-bold text-stone-300 mb-2">About</h3>
                <p className="text-sm text-stone-400">{project.description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="max-w-4xl">
            {/* Add Step */}
            {!showAddStep ? (
              <button
                onClick={() => setShowAddStep(true)}
                className="mb-6 flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Step
              </button>
            ) : (
              <div className="mb-6 p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="Step title..."
                  autoFocus
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-200 focus:border-amber-600 outline-none mb-3"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddStep();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddStep}
                    className="flex-1 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded transition-all"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStep(false);
                      setNewStepTitle('');
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Steps List */}
            {project.steps.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-stone-700 mx-auto mb-4" />
                <p className="text-stone-400">No steps yet. Click "Add Step" to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.steps.map((step) => (
                  <div key={step.id} className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg hover:border-stone-700 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getStepStatusIcon(step.status)}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-stone-200">{step.title}</h4>
                          {step.description && <p className="text-xs text-stone-400 mt-1">{step.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <select
                              value={step.status}
                              onChange={(e) => handleUpdateStepStatus(step.id, e.target.value)}
                              className="text-xs px-2 py-1 bg-stone-800 border border-stone-700 rounded text-stone-200 outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                            </select>
                            <span className="text-[10px] text-stone-600">{step.priority} priority</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-2 hover:bg-red-900/30 rounded text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Version */}
            <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
              <label className="block text-sm font-bold text-stone-300 mb-2">Version</label>
              <input
                type="text"
                defaultValue={project.version}
                onBlur={(e) => ModProjectStorage.updateProject(project.id, { version: e.target.value })}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-200 focus:border-amber-600 outline-none"
              />
            </div>

            {/* Notes */}
            <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
              <label className="block text-sm font-bold text-stone-300 mb-2">Notes</label>
              <textarea
                defaultValue={project.notes}
                onBlur={(e) => ModProjectStorage.updateProject(project.id, { notes: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded text-stone-200 focus:border-amber-600 outline-none resize-none"
              />
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                <div className="text-xs text-stone-500 mb-1">Created</div>
                <div className="text-sm text-stone-200">{new Date(project.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="p-4 bg-stone-900/50 border border-stone-800 rounded-lg">
                <div className="text-xs text-stone-500 mb-1">Last Updated</div>
                <div className="text-sm text-stone-200">{new Date(project.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModProjectManager;
