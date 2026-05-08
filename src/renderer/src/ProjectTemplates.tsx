import { useState } from 'react';
import { FolderPlus, Zap, Shield, Sword, Package, Map, FileText, Download } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  icon: JSX.Element;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  includes: string[];
  setupTime: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'weapon',
    name: 'Custom Weapon',
    icon: <Sword className="w-8 h-8" />,
    description: 'Complete weapon mod with models, textures, and leveled lists',
    difficulty: 'beginner',
    includes: ['ESP template', 'Folder structure', 'Sample textures', 'Leveled list integration'],
    setupTime: '5 min'
  },
  {
    id: 'armor',
    name: 'Custom Armor',
    icon: <Shield className="w-8 h-8" />,
    description: 'Armor mod with bodyslide integration and crafting recipe',
    difficulty: 'beginner',
    includes: ['ESP with armor records', 'Material folders', 'Crafting workbench entry', 'BodySlide templates'],
    setupTime: '5 min'
  },
  {
    id: 'quest',
    name: 'Quest Mod',
    icon: <Map className="w-8 h-8" />,
    description: 'Quest framework with dialogue, objectives, and rewards',
    difficulty: 'intermediate',
    includes: ['Quest records', 'Dialogue system', 'Objective tracking', 'Reward scripts'],
    setupTime: '10 min'
  },
  {
    id: 'location',
    name: 'New Location',
    icon: <Package className="w-8 h-8" />,
    description: 'Custom worldspace or interior cell with navmesh',
    difficulty: 'intermediate',
    includes: ['Worldspace setup', 'Interior cell', 'Navmesh basics', 'Lighting presets'],
    setupTime: '15 min'
  },
  {
    id: 'gameplay',
    name: 'Gameplay Overhaul',
    icon: <Zap className="w-8 h-8" />,
    description: 'Comprehensive gameplay changes with MCM integration',
    difficulty: 'advanced',
    includes: ['MCM menu', 'Papyrus scripts', 'Game settings', 'Compatibility patches'],
    setupTime: '20 min'
  },
  {
    id: 'utility',
    name: 'Utility Mod',
    icon: <FileText className="w-8 h-8" />,
    description: 'Helper mod with no-plugin structure for simple changes',
    difficulty: 'beginner',
    includes: ['Loose file structure', 'Texture replacers', 'Sound replacers', 'INI tweaks'],
    setupTime: '3 min'
  }
];

export default function ProjectTemplates() {
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const browseForPath = async () => {
    try {
      const result = await window.electron.api.projectTemplates.browsePath();
      if (result) {
        setProjectPath(result);
      }
    } catch (error) {
      setMessage('Failed to browse for path');
    }
  };

  const createProject = async () => {
    if (!selectedTemplate || !projectName || !projectPath) {
      setMessage('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setMessage('');

    try {
      const result = await window.electron.api.projectTemplates.createProject({
        templateId: selectedTemplate.id,
        projectName,
        projectPath,
        authorName: authorName || 'Unknown Author'
      });

      if (result.success) {
        setMessage(`✅ Project created successfully at: ${result.path}`);
        // Reset form
        setProjectName('');
        setAuthorName('');
      } else {
        setMessage(`❌ Failed to create project: ${result.error}`);
      }
    } catch (error) {
      setMessage('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const downloadTemplate = async (templateId: string) => {
    try {
      await window.electron.api.projectTemplates.downloadTemplate(templateId);
      setMessage('Template downloaded successfully');
    } catch (error) {
      setMessage('Failed to download template');
    }
  };

  const filteredTemplates = TEMPLATES.filter(template => {
    if (skillLevel === 'beginner') return template.difficulty === 'beginner';
    if (skillLevel === 'intermediate') return template.difficulty !== 'advanced';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3">
              <FolderPlus className="w-10 h-10" />
              Project Templates
            </h1>
            <p className="text-slate-400 mt-2">Quick-start your mod with professional templates</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSkillLevel('beginner')}
              className={`px-4 py-2 rounded ${skillLevel === 'beginner' ? 'bg-green-600' : 'bg-slate-700'} text-white`}
            >
              🟢 Beginner
            </button>
            <button
              onClick={() => setSkillLevel('intermediate')}
              className={`px-4 py-2 rounded ${skillLevel === 'intermediate' ? 'bg-yellow-600' : 'bg-slate-700'} text-white`}
            >
              🟡 Intermediate
            </button>
            <button
              onClick={() => setSkillLevel('advanced')}
              className={`px-4 py-2 rounded ${skillLevel === 'advanced' ? 'bg-red-600' : 'bg-slate-700'} text-white`}
            >
              🔴 Advanced
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded border ${
            message.includes('✅') || message.includes('success') ? 'bg-green-900/50 border-green-500 text-green-200' :
            message.includes('❌') || message.includes('Failed') ? 'bg-red-900/50 border-red-500 text-red-200' :
            'bg-blue-900/50 border-blue-500 text-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* Beginner Mode */}
        {skillLevel === 'beginner' && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
            <p className="text-slate-300 mb-6">
              Pick a template below and I'll set up everything you need to get started!
            </p>
            <div className="grid grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-6 rounded-lg text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'bg-green-700 ring-2 ring-green-400'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3 text-white">
                    {template.icon}
                    <h3 className="font-bold text-lg">{template.name}</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>⏱️ {template.setupTime}</span>
                    <span>•</span>
                    <span>{template.includes.length} files included</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intermediate/Advanced Mode */}
        {(skillLevel === 'intermediate' || skillLevel === 'advanced') && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Available Templates</h2>
            <div className="grid gap-4">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-green-400">{template.icon}</div>
                        <div>
                          <h3 className="font-bold text-white text-xl">{template.name}</h3>
                          <p className="text-slate-300 text-sm">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className={`text-xs px-3 py-1 rounded ${
                            template.difficulty === 'beginner' ? 'bg-green-600' :
                            template.difficulty === 'intermediate' ? 'bg-yellow-600' :
                            'bg-red-600'
                          } text-white`}>
                            {template.difficulty}
                          </span>
                          <span className="text-xs px-3 py-1 rounded bg-slate-600 text-slate-200">
                            ⏱️ {template.setupTime}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">Includes:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {template.includes.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                              <span className="text-green-400">✓</span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Configuration */}
        {selectedTemplate && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Project Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Mod"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Author Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Location <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="C:/Modding/Projects"
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded border border-slate-600"
                  />
                  <button
                    onClick={browseForPath}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={createProject}
                  disabled={!projectName || !projectPath || isCreating}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isCreating ? (
                    <>Creating Project...</>
                  ) : (
                    <>
                      <FolderPlus className="w-6 h-6" />
                      Create {selectedTemplate.name} Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* What gets created */}
        {selectedTemplate && skillLevel !== 'beginner' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">What Gets Created</h2>
            <div className="bg-slate-900 rounded p-4 font-mono text-sm text-slate-300">
              <div className="space-y-1">
                <div>📁 {projectName || 'ProjectName'}/</div>
                <div className="ml-4">├── 📄 {projectName || 'ProjectName'}.esp</div>
                <div className="ml-4">├── 📁 Textures/</div>
                <div className="ml-4">├── 📁 Meshes/</div>
                <div className="ml-4">├── 📁 Sound/</div>
                <div className="ml-4">├── 📁 Scripts/</div>
                <div className="ml-4">├── 📁 Interface/</div>
                <div className="ml-4">├── 📄 README.md</div>
                <div className="ml-4">└── 📄 .gitignore</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              All files will be structured according to Fallout 4 modding best practices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
