import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FolderOpen as FolderIcon, X, Save, FolderTree as FolderTreeIcon, ChevronRight, CheckCircle2, Package, Crosshair, Shield, BookOpen, Users, Building2, Map, Music, Image as ImageIcon, Folder, FileText } from 'lucide-react';
import { ModProject, ProjectSettings } from '../../shared/types';

interface ProjectCreatorProps {
  onClose?: () => void;
  onProjectCreated?: (project: ModProject) => void;
}

type ModType =
  | 'general'
  | 'weapon'
  | 'armor'
  | 'quest'
  | 'npc'
  | 'settlement'
  | 'worldedit'
  | 'audio'
  | 'texture';

interface FolderNode {
  name: string;
  children?: FolderNode[];
}

const MOD_TYPES: { value: ModType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { value: 'general',    label: 'General Mod',        icon: Package,    description: 'All-purpose structure for any mod type' },
  { value: 'weapon',     label: 'Weapon Mod',         icon: Crosshair,  description: 'Meshes, textures, sounds and scripts for weapons' },
  { value: 'armor',      label: 'Armor / Outfit',     icon: Shield,     description: 'Includes BodySlide and material folders' },
  { value: 'quest',      label: 'Quest Mod',          icon: BookOpen,   description: 'Dialogue, scripts, and sequence folders' },
  { value: 'npc',        label: 'NPC / Companion',    icon: Users,      description: 'Face data, scripts, and dialogue assets' },
  { value: 'settlement', label: 'Settlement / Build',  icon: Building2,  description: 'Workshop objects, meshes, and navmesh' },
  { value: 'worldedit',  label: 'World Edit',         icon: Map,        description: 'Cell edits, LOD, and landscape data' },
  { value: 'audio',      label: 'Audio / Music',      icon: Music,      description: 'Sound descriptors, voice, and music tracks' },
  { value: 'texture',    label: 'Texture / Retexture', icon: ImageIcon,  description: 'DDS textures and material swaps' },
];

function getFolderStructure(modType: ModType, projectName: string): FolderNode {
  const safe = projectName.trim() || 'MyMod';

  const common: FolderNode[] = [
    { name: 'Data', children: [
      { name: 'Scripts', children: [
        { name: 'Source' }
      ]},
    ]},
    { name: 'docs' },
    { name: '.gitignore' },
  ];

  const structures: Record<ModType, FolderNode> = {
    general: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [{ name: safe }] },
          { name: 'Textures', children: [{ name: safe }] },
          { name: 'Sound', children: [{ name: 'FX' }] },
          { name: 'Interface' },
          { name: 'Strings' },
        ]},
        { name: 'docs' },
        { name: 'tools' },
      ],
    },
    weapon: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [
            { name: 'Weapons', children: [{ name: safe }, { name: safe + '_1stPerson' }] },
          ]},
          { name: 'Textures', children: [
            { name: 'Weapons', children: [{ name: safe }] },
          ]},
          { name: 'Sound', children: [
            { name: 'FX', children: [
              { name: 'Weapons', children: [{ name: safe }] },
            ]},
          ]},
          { name: 'Materials', children: [
            { name: 'Weapons', children: [{ name: safe }] },
          ]},
        ]},
        { name: 'nifskope' },
        { name: 'blender' },
        { name: 'docs' },
      ],
    },
    armor: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [
            { name: 'Armor', children: [{ name: safe }] },
            { name: 'CalienteTools', children: [
              { name: 'BodySlide', children: [
                { name: 'SliderGroups' },
                { name: 'SliderPresets' },
                { name: 'ShapeData', children: [{ name: safe }] },
              ]},
            ]},
          ]},
          { name: 'Textures', children: [
            { name: 'Armor', children: [{ name: safe }] },
          ]},
          { name: 'Materials', children: [
            { name: 'Armor', children: [{ name: safe }] },
          ]},
        ]},
        { name: 'blender' },
        { name: 'docs' },
      ],
    },
    quest: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'DialogueViews' },
          { name: 'Seq' },
          { name: 'Strings' },
          { name: 'Sound', children: [
            { name: 'Voice', children: [
              { name: safe + '.esp', children: [
                { name: 'MaleEvenToned' },
                { name: 'FemaleEvenToned' },
              ]},
            ]},
          ]},
          { name: 'Textures', children: [{ name: safe }] },
          { name: 'Meshes', children: [{ name: safe }] },
        ]},
        { name: 'storyboard' },
        { name: 'dialogue' },
        { name: 'docs' },
      ],
    },
    npc: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [
            { name: 'Actors', children: [
              { name: 'Character', children: [
                { name: 'FaceGenData', children: [
                  { name: 'FaceGeom', children: [{ name: safe + '.esp' }] },
                  { name: 'FaceTint', children: [{ name: safe + '.esp' }] },
                ]},
              ]},
            ]},
          ]},
          { name: 'Textures', children: [
            { name: 'Actors', children: [{ name: safe }] },
          ]},
          { name: 'Sound', children: [
            { name: 'Voice', children: [
              { name: safe + '.esp' },
            ]},
          ]},
        ]},
        { name: 'looksmenu' },
        { name: 'docs' },
      ],
    },
    settlement: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [
            { name: 'Workshop', children: [{ name: safe }] },
            { name: 'Previsibines' },
          ]},
          { name: 'Textures', children: [
            { name: 'Workshop', children: [{ name: safe }] },
          ]},
          { name: 'Materials', children: [{ name: safe }] },
          { name: 'Interface', children: [
            { name: 'Workshop' },
          ]},
        ]},
        { name: 'blender' },
        { name: 'docs' },
      ],
    },
    worldedit: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Meshes', children: [
            { name: 'Landscape', children: [{ name: safe }] },
            { name: 'LOD' },
          ]},
          { name: 'Textures', children: [
            { name: 'Landscape', children: [{ name: safe }] },
            { name: 'LOD' },
          ]},
          { name: 'Terrain' },
          { name: 'F4SE', children: [{ name: 'Plugins' }] },
        ]},
        { name: 'xedit' },
        { name: 'docs' },
      ],
    },
    audio: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Scripts', children: [{ name: 'Source' }] },
          { name: 'Sound', children: [
            { name: 'FX', children: [{ name: safe }] },
            { name: 'Music', children: [{ name: safe }] },
            { name: 'Voice', children: [{ name: safe + '.esp' }] },
            { name: 'Ambience' },
          ]},
        ]},
        { name: 'raw_audio' },
        { name: 'exports' },
        { name: 'docs' },
      ],
    },
    texture: {
      name: safe,
      children: [
        { name: 'Data', children: [
          { name: 'Textures', children: [{ name: safe }] },
          { name: 'Materials', children: [{ name: safe }] },
        ]},
        { name: 'source_psd' },
        { name: 'exports_dds' },
        { name: 'reference' },
        { name: 'docs' },
      ],
    },
  };

  return structures[modType] ?? structures.general;
}

function FolderTree({ node, depth = 0 }: { node: FolderNode; depth?: number }) {
  const isLeaf = !node.children || node.children.length === 0;
  const isFile = node.name.includes('.');

  return (
    <div>
      <div
        className="flex items-center gap-1 text-xs py-0.5"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {!isLeaf && <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />}
        {isLeaf && !isFile && <span className="w-3 h-3 flex-shrink-0" />}
        <div className="flex items-center gap-1">
          {isFile
            ? <FileText className="w-3 h-3 text-yellow-400 shrink-0" />
            : depth === 0
            ? <FolderOpen className="w-3 h-3 text-green-400 shrink-0" />
            : <Folder className="w-3 h-3 text-slate-400 shrink-0" />
          }
          <span className={isFile ? 'text-yellow-400' : depth === 0 ? 'text-green-400 font-bold' : 'text-slate-300'}>
            {node.name}
          </span>
        </div>
      </div>
      {node.children?.map((child, i) => (
        <FolderTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function countFolders(node: FolderNode): number {
  if (!node.children) return 0;
  return node.children.filter(c => !c.name.includes('.')).length +
    node.children.reduce((sum, c) => sum + countFolders(c), 0);
}

export const ProjectCreator: React.FC<ProjectCreatorProps> = ({
  onClose,
  onProjectCreated,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [modType, setModType] = useState<ModType>('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    path: '',
    game: 'fallout4' as ModProject['game'],
  });
  const [loading, setLoading] = useState(false);
  const [scaffoldStatus, setScaffoldStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const folderStructure = getFolderStructure(modType, formData.name || 'MyMod');
  const folderCount = countFolders(folderStructure);

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

  /** Recursively collect all folder paths to create */
  function collectPaths(node: FolderNode, base: string): string[] {
    const current = base + '/' + node.name;
    const paths: string[] = [];
    if (!node.name.includes('.')) {
      paths.push(current);
    }
    if (node.children) {
      for (const child of node.children) {
        paths.push(...collectPaths(child, current));
      }
    }
    return paths;
  }

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
    setScaffoldStatus([]);

    try {
      // Scaffold folder structure if the API supports it
      if ((window.electronAPI as any)?.createDirectories) {
        const paths = collectPaths(folderStructure, formData.path.trim());
        setScaffoldStatus(['Creating folder structure…']);
        await (window.electronAPI as any).createDirectories(paths);
        setScaffoldStatus(paths.map(p => '✓ ' + p.split('/').slice(-1)[0]));
      } else if ((window.electronAPI as any)?.ensureDir) {
        // Fallback: create one at a time
        const paths = collectPaths(folderStructure, formData.path.trim());
        for (const p of paths) {
          setScaffoldStatus(prev => [...prev, '✓ ' + p.split('/').slice(-1)[0]]);
          await (window.electronAPI as any).ensureDir(p);
        }
      }

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
          tags: [modType],
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
      } else {
        // Dev / browser fallback — simulate success
        setScaffoldStatus(prev => [...prev, '✓ Project record created']);
        setTimeout(() => {
          if (onClose) onClose();
          else navigate('/dashboard');
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: pick mod type ────────────────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 px-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Create New Project</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            <p className="text-sm text-slate-400 mb-4">
              Choose a mod type to scaffold the right folder structure automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOD_TYPES.map(mt => (
                <button
                  key={mt.value}
                  onClick={() => setModType(mt.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    modType === mt.value
                      ? 'border-green-500 bg-green-900/20 ring-1 ring-green-500/40'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  {React.createElement(mt.icon, { className: "w-6 h-6 text-green-400 shrink-0 mt-0.5" })}
                  <div>
                    <div className="text-sm font-semibold text-white">{mt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{mt.description}</div>
                  </div>
                  {modType === mt.value && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setStep('details')}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Next: Project Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: details + folder preview ────────────────────────────────────
  const selectedType = MOD_TYPES.find(mt => mt.value === modType)!;
  const SelectedIcon = selectedType.icon;

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('type')}
              className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-gray-600">|</span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <SelectedIcon className="w-5 h-5 text-green-400" />
              {selectedType.label}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-0 divide-x divide-gray-700">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-4">
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
              <p className="text-xs text-gray-500 mt-1">Used as the root folder name</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-green-500 focus:outline-none resize-none"
                placeholder="A brief description of your mod…"
                rows={2}
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
                <option value="fallout4">Fallout 4 (Standard — v1.10.163)</option>
                <option value="fallout4ng">Fallout 4 Next-Gen (v1.10.980+)</option>
                <option value="fallout4creations">Fallout 4 Creations (v1.11.x)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Parent Directory *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-green-500 focus:outline-none text-sm"
                  placeholder="C:\Mods"
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
              {formData.path && formData.name && (
                <p className="text-xs text-green-400 mt-1">
                  Will create: {formData.path}\{formData.name.trim() || 'MyMod'}
                </p>
              )}
            </div>

            {/* Scaffold progress */}
            {scaffoldStatus.length > 0 && (
              <div className="bg-green-900/10 border border-green-500/20 rounded p-3 max-h-28 overflow-y-auto">
                {scaffoldStatus.map((s, i) => (
                  <p key={i} className="text-xs text-green-300 font-mono">{s}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {loading ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Create &amp; Scaffold Project
              </button>
            </div>
          </form>

          {/* Folder preview */}
          <div className="w-64 p-4 bg-gray-950/60 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <FolderTreeIcon className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Folder Preview</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {folderCount} folders will be created automatically.
            </p>
            <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-2 text-xs font-mono">
              <FolderTree node={folderStructure} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
