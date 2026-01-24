import React, { useState, useEffect } from 'react';
import { Hexagon, Plus, Trash2, GitBranch, CheckCircle2, AlertTriangle, Download, Upload, Package, Zap, Wrench, Play, StopCircle, Clock, FileText, Copy } from 'lucide-react';

interface ModProject {
    id: string;
    name: string;
    description: string;
    version: string;
    type: 'quest' | 'settlement' | 'dungeon' | 'npc' | 'location' | 'overhaul';
    status: 'development' | 'testing' | 'ready' | 'released';
    author: string;
    files: string[];
    dependencies: Dependency[];
    created: number;
    workspacePath?: string;
}

interface Dependency {
    name: string;
    version: string;
    required: boolean;
}

interface BuildStep {
    id: string;
    name: string;
    command: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    duration: number;
}

interface BuildPipeline {
    id: string;
    projectId: string;
    steps: BuildStep[];
    version: string;
    createdAt: number;
}

const BUILD_STEPS: BuildStep[] = [
    { id: '1', name: 'Compile Papyrus Scripts', command: 'papyrus-compile', status: 'pending', duration: 0 },
    { id: '2', name: 'Validate xEdit Records', command: 'xedit-validate', status: 'pending', duration: 0 },
    { id: '3', name: 'Check NIF Meshes', command: 'nif-verify', status: 'pending', duration: 0 },
    { id: '4', name: 'Package Assets', command: 'zip-bundle', status: 'pending', duration: 0 },
    { id: '5', name: 'Generate Changelog', command: 'git-diff', status: 'pending', duration: 0 }
];

const TheHive: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'projects' | 'build' | 'deploy'>('projects');
    const [projects, setProjects] = useState<ModProject[]>([]);
    const [buildPipelines, setBuildPipelines] = useState<BuildPipeline[]>([]);
    const [selectedProject, setSelectedProject] = useState<ModProject | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [buildRunning, setBuildRunning] = useState(false);

    // Load from localStorage
    const loadProjects = () => {
        const saved = localStorage.getItem('hive_projects');
        if (saved) {
            const parsed = JSON.parse(saved);
            setProjects(parsed);
            if (parsed.length > 0 && !selectedProject) {
                setSelectedProject(parsed[0]);
            }
        }
    };

    useEffect(() => {
        loadProjects();

        // Listen for external updates (e.g. from Mossy AI)
        window.addEventListener('hive-projects-updated', loadProjects);
        return () => window.removeEventListener('hive-projects-updated', loadProjects);
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('hive_projects', JSON.stringify(projects));
        }
    }, [projects]);

    const addProject = () => {
        if (!newProjectName) return;
        const newProject: ModProject = {
            id: Date.now().toString(),
            name: newProjectName,
            description: 'New mod project',
            version: '0.1.0',
            type: 'quest',
            status: 'development',
            author: 'User',
            files: [],
            dependencies: [],
            created: Date.now(),
            workspacePath: `C:/Games/Fallout 4/Data/Mossy/${newProjectName.replace(/\s+/g, '_')}`
        };
        setProjects([...projects, newProject]);
        setSelectedProject(newProject);
        setNewProjectName('');
    };

    const deleteProject = (id: string) => {
        setProjects(projects.filter(p => p.id !== id));
        if (selectedProject?.id === id) {
            const remaining = projects.filter(p => p.id !== id);
            setSelectedProject(remaining[0] || null);
        }
    };

    const startBuild = async () => {
        if (!selectedProject) return;
        
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (!bridgeActive) {
            alert('Bridge Offline: Build pipelines require a running Desktop Bridge server.');
            return;
        }

        setBuildRunning(true);

        const newPipeline: BuildPipeline = {
            id: Date.now().toString(),
            projectId: selectedProject.id,
            steps: BUILD_STEPS.map(s => ({ ...s, status: 'running' as const })),
            version: selectedProject.version,
            createdAt: Date.now()
        };
        setBuildPipelines([newPipeline, ...buildPipelines]);

        try {
            const response = await fetch('http://localhost:21337/build/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: selectedProject })
            });
            
            if (!response.ok) throw new Error('Build failed');
            
            // In a real app, you'd poll the status here
        } catch (error) {
            setBuildPipelines(prev => prev.map(p => 
                p.id === newPipeline.id 
                ? { ...p, steps: p.steps.map(s => ({ ...s, status: 'failed' })) }
                : p
            ));
        } finally {
            setBuildRunning(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-sans relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-black pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Hexagon className="w-6 h-6 text-blue-400 animate-pulse" />
                            The Hive
                        </h1>
                        <p className="text-xs text-slate-400 font-mono mt-1">Mod Project Manager & Build Coordinator</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-t border-slate-800 pt-4">
                    {[
                        { id: 'projects', label: 'Projects', icon: '📦' },
                        { id: 'build', label: 'Build Pipeline', icon: '⚙️' },
                        { id: 'deploy', label: 'Deployment', icon: '🚀' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-400 text-blue-300'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto relative z-10">
                {activeTab === 'projects' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Projects List */}
                            <div className="lg:col-span-2">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Active Projects</h2>
                                    <span className="text-xs text-slate-500">{projects.length} total</span>
                                </div>

                                <div className="space-y-4">
                                    {projects.map(proj => (
                                        <div
                                            key={proj.id}
                                            onClick={() => setSelectedProject(proj)}
                                            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                                                selectedProject?.id === proj.id
                                                    ? 'bg-blue-900/20 border-blue-500/50'
                                                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-white text-lg">{proj.name}</h3>
                                                    <p className="text-sm text-slate-400">{proj.description}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteProject(proj.id);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                                                <div>
                                                    <span className="text-slate-500">Version</span>
                                                    <div className="font-mono text-slate-300">{proj.version}</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Type</span>
                                                    <div className="text-slate-300">{proj.type}</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Files</span>
                                                    <div className="text-slate-300">{proj.files.length}</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Status</span>
                                                    <div className={`font-bold ${
                                                        proj.status === 'released' ? 'text-emerald-400' :
                                                        proj.status === 'testing' ? 'text-yellow-400' :
                                                        'text-blue-400'
                                                    }`}>{proj.status}</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {proj.dependencies.map((dep, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                                        {dep.name} {dep.required ? '●' : '○'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* New Project Form */}
                            <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> New Project
                                </h3>
                                <input
                                    type="text"
                                    placeholder="Project name..."
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && addProject()}
                                />
                                <button
                                    onClick={addProject}
                                    disabled={!newProjectName}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
                                >
                                    Create Project
                                </button>

                                <div className="mt-8">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Beginner Blueprints</h4>
                                    <div className="space-y-2">
                                        {[
                                            { name: 'My First Quest', type: 'quest', desc: 'Pre-configured with start-up script and dialogue branch.' },
                                            { name: 'Settlement Item', type: 'location', desc: 'Workshop-ready asset template with collision setup.' },
                                            { name: 'NPC Companion', type: 'npc', desc: 'AI package and follower script skeleton.' }
                                        ].map((bp, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setNewProjectName(bp.name);
                                                    // Manual trigger logic would go here
                                                }}
                                                className="w-full text-left p-3 rounded bg-slate-900/40 border border-slate-700/50 hover:bg-slate-700/30 hover:border-blue-500/50 transition-all group"
                                            >
                                                <div className="font-bold text-xs text-white group-hover:text-blue-400">{bp.name}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">{bp.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-4 italic">
                                        * Blueprints automatically apply FO4 community standards (30FPS/1.0Scale).
                                    </p>
                                </div>

                                {selectedProject && (
                                    <>
                                        <div className="mt-6 pt-6 border-t border-slate-700">
                                            <h4 className="font-bold text-slate-300 mb-4 text-sm">Project Files</h4>
                                            <div className="space-y-2">
                                                {selectedProject.files.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between text-sm text-slate-400 bg-slate-900/50 p-2 rounded">
                                                        <span className="font-mono text-[11px]">{file}</span>
                                                        <Copy className="w-3 h-3 hover:text-white cursor-pointer" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'build' && (
                    <div className="p-8 max-w-4xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Build Pipeline</h2>
                            {selectedProject ? (
                                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{selectedProject.name}</h3>
                                            <p className="text-sm text-slate-400">v{selectedProject.version}</p>
                                        </div>
                                        <button
                                            onClick={startBuild}
                                            disabled={buildRunning}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded transition-colors disabled:opacity-50"
                                        >
                                            {buildRunning ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            {buildRunning ? 'Building...' : 'Start Build'}
                                        </button>
                                    </div>

                                    {/* Build Steps */}
                                    <div className="space-y-3">
                                        {BUILD_STEPS.map((step, i) => (
                                            <div key={step.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                                    {step.status === 'running' && <Zap className="w-5 h-5 text-blue-400 animate-pulse" />}
                                                    {step.status === 'pending' && <Clock className="w-5 h-5 text-slate-600" />}
                                                    <span className="font-bold text-white">{step.name}</span>
                                                    <span className={`text-[10px] ml-auto ${
                                                        step.status === 'success' ? 'text-emerald-400' :
                                                        step.status === 'running' ? 'text-blue-400' :
                                                        'text-slate-500'
                                                    }`}>
                                                        {step.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px]">
                                                    <span className="font-mono text-slate-500">$ {step.command}</span>
                                                    {step.status === 'success' && (
                                                        <span className="ml-auto text-slate-600">{step.duration}ms</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p>Select a project to view its build pipeline</p>
                                </div>
                            )}
                        </div>

                        {/* Build History */}
                        {buildPipelines.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Build History</h3>
                                <div className="space-y-3">
                                    {buildPipelines.slice(0, 5).map(pipeline => (
                                        <div key={pipeline.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-white">Build v{pipeline.version}</div>
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        {new Date(pipeline.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    <span className="text-xs text-emerald-400">Success</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'deploy' && (
                    <div className="p-8 max-w-4xl mx-auto">
                        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6">Deployment Manager</h2>
                        {selectedProject ? (
                            <div className="grid gap-6">
                                {/* Release Package */}
                                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-blue-400" /> Release Package
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <span className="text-slate-500 text-sm">Current Version</span>
                                            <div className="font-mono text-white text-lg">{selectedProject.version}</div>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-sm">Status</span>
                                            <div className={`font-bold text-lg ${
                                                selectedProject.status === 'released' ? 'text-emerald-400' :
                                                selectedProject.status === 'testing' ? 'text-yellow-400' :
                                                'text-blue-400'
                                            }`}>
                                                {selectedProject.status}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded transition-colors">
                                            <Package className="w-4 h-4" /> Generate Package
                                        </button>
                                        <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded transition-colors">
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                    </div>
                                </div>

                                {/* Version Control */}
                                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <GitBranch className="w-5 h-5 text-blue-400" /> Version History
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                                            <div>
                                                <div className="font-bold text-white">v{selectedProject.version}</div>
                                                <div className="text-xs text-slate-500">Current Release</div>
                                            </div>
                                            <span className="text-emerald-400 font-bold">Live</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                                            <div>
                                                <div className="font-bold text-white">v1.2.0</div>
                                                <div className="text-xs text-slate-500">2 weeks ago</div>
                                            </div>
                                            <span className="text-slate-500 text-xs">Archive</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deployment Checklist */}
                                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                    <h3 className="font-bold text-white mb-4">Pre-Release Checklist</h3>
                                    <div className="space-y-3">
                                        {[
                                            'All scripts compile successfully',
                                            'Mesh files validate without errors',
                                            'Dependencies documented',
                                            'Changelog generated',
                                            'Version number bumped',
                                            'Readme updated'
                                        ].map((item, i) => (
                                            <label key={i} className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded" />
                                                <span className="text-slate-300">{item}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <p>Select a project to manage deployments</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheHive;