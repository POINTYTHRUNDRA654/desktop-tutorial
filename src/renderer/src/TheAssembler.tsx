import React, { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Eye, Code, Wand2, RefreshCw, FileText, Layers, CheckSquare, Image as ImageIcon, ChevronRight, ChevronDown, Download, ExternalLink, Info, Settings } from 'lucide-react';
import ExternalToolNotice from './components/ExternalToolNotice';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useNavigate } from 'react-router-dom';
import type { Settings as AppSettings } from '../shared/types';

// --- Types ---
type NodeType = 'page' | 'group' | 'option';

interface FomodNode {
    id: string;
    type: NodeType;
    name: string;
    description?: string;
    children?: FomodNode[];
    // Specific properties
    groupType?: 'SelectExactlyOne' | 'SelectAny' | 'SelectAtMostOne';
    imagePath?: string;
    files?: { source: string; dest: string }[];
    isExpanded?: boolean;
}

const initialStructure: FomodNode[] = [];

const modFiles: string[] = [];

const TheAssembler: React.FC = () => {
    const [structure, setStructure] = useState<FomodNode[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'xml'>('editor');
    const [isGenerating, setIsGenerating] = useState(false);
    const [modFiles, setModFiles] = useState<string[]>([]);
    const [modName, setModName] = useState('New Mod Project');
    const [modAuthor, setModAuthor] = useState('User');
    const [modVersion, setModVersion] = useState('1.0.0');
    const [modWebsite, setModWebsite] = useState('');
    const [toolSettings, setToolSettings] = useState<AppSettings | null>(null);
    const navigate = useNavigate();

    const openUrl = (url: string) => {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (typeof api?.openExternal === 'function') {
            api.openExternal(url);
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        const init = async () => {
            try {
                const s = await window.electronAPI.getSettings();
                setToolSettings(s);
                window.electronAPI.onSettingsUpdated((ns) => setToolSettings(ns));
            } catch (e) {
                console.warn('[Assembler] Failed to load settings', e);
            }
        };
        init();
    }, []);

    // Helpers
    const findNode = (nodes: FomodNode[], id: string): FomodNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const updateNode = (id: string, updates: Partial<FomodNode>) => {
        const recursiveUpdate = (nodes: FomodNode[]): FomodNode[] => {
            return nodes.map(node => {
                if (node.id === id) return { ...node, ...updates };
                if (node.children) return { ...node, children: recursiveUpdate(node.children) };
                return node;
            });
        };
        setStructure(recursiveUpdate(structure));
    };

    const toggleExpand = (id: string) => {
        const node = findNode(structure, id);
        if (node) updateNode(id, { isExpanded: !node.isExpanded });
    };

    const deleteNode = (id: string) => {
        const recursiveDelete = (nodes: FomodNode[]): FomodNode[] => {
            return nodes.filter(n => n.id !== id).map(n => ({
                ...n,
                children: n.children ? recursiveDelete(n.children) : undefined
            }));
        };
        setStructure(recursiveDelete(structure));
        if (selectedId === id) setSelectedId(null);
    };

    // Launch external FOMOD Creation Tool
    const handleLaunchExternalTool = async () => {
        const toolPath = (toolSettings?.fomodCreatorPath && toolSettings.fomodCreatorPath.trim().length > 0)
            ? toolSettings.fomodCreatorPath
            : '';

        if (!toolPath) {
            alert('Set the FOMOD Creation Tool path in Tool Settings first.');
            openUrl('https://www.nexusmods.com/fallout4/mods/6821');
            return;
        }
        try {
            if (window.electron?.api?.openExternal) {
                await window.electron.api.openExternal(toolPath);
            } else {
                alert('External tool launch requires Desktop Bridge connection.');
            }
        } catch (error) {
            console.error('Failed to launch FOMOD Tool:', error);
            const errorMsg = `Could not launch FOMOD Creation Tool.

Check the configured path in Tool Settings.

Download the tool from Nexus Mods:
https://www.nexusmods.com/fallout4/mods/6821

After installing, you may need to update the tool path in settings.`;
            alert(errorMsg);
        }
    };

    // Browse for mod files
    const handleBrowseFiles = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.webkitdirectory = true;
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            const filePaths = files.map(f => f.webkitRelativePath || f.name);
            setModFiles(filePaths);
        };
        input.click();
    };

    // Assign files to selected option
    const handleAssignFiles = () => {
        if (!selectedNode || selectedNode.type !== 'option') return;
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            const filePaths = files.map(f => f.name);
            updateNode(selectedNode.id, { files: filePaths.map(f => ({ source: f, dest: f })) });
        };
        input.click();
    };

    const addNode = (parentId: string | null, type: NodeType) => {
        const newNode: FomodNode = {
            id: Date.now().toString(),
            type,
            name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            isExpanded: true,
            children: type !== 'option' ? [] : undefined
        };

        if (!parentId) {
            if (type === 'page') setStructure([...structure, newNode]);
            return;
        }

        const recursiveAdd = (nodes: FomodNode[]): FomodNode[] => {
            return nodes.map(node => {
                if (node.id === parentId) {
                    return { ...node, children: [...(node.children || []), newNode] };
                }
                if (node.children) return { ...node, children: recursiveAdd(node.children) };
                return node;
            });
        };
        setStructure(recursiveAdd(structure));
    };

    // --- AI Logic ---
    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        try {
            const systemPrompt = `You are a FOMOD installer architect. Generate JSON structure for FOMOD pages/groups/options based on file analysis.`;
            const userPrompt = `Analyze these files: ${JSON.stringify(modFiles)}.
            Group them logically (e.g. Resolution, Patches).
            Return JSON array with type, name, description, groupType, children.`;

            const aiResponse = await (window as any).electronAPI.aiChatOpenAI(userPrompt, systemPrompt, 'gpt-3.5-turbo');
            if (!aiResponse.success || !aiResponse.content) throw new Error(aiResponse.error);
            const result = { response: { text: () => aiResponse.content } };
            const response = await result.response;
            const text = response.text();

            // Clean markdown fences if present
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const generated = JSON.parse(cleanJson);
            
            // Add IDs and visual state
            const processGen = (nodes: any[]): FomodNode[] => {
                return nodes.map((n, i) => ({
                    ...n,
                    id: `gen-${Date.now()}-${i}-${Math.random()}`,
                    isExpanded: true,
                    children: n.children ? processGen(n.children) : undefined
                }));
            };

            setStructure(processGen(generated));

        } catch (e) {
            console.error(e);
            alert("Failed to auto-generate structure. AI returned invalid format.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- XML Generation ---
    const generateModuleConfigXML = () => {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">\n`;
        xml += `  <moduleName>${modName}</moduleName>\n`;
        xml += `  <installSteps order="Explicit">\n`;
        
        structure.forEach(page => {
            xml += `    <installStep name="${page.name}">\n`;
            xml += `      <optionalFileGroups order="Explicit">\n`;
            
            page.children?.forEach(group => {
                xml += `        <group name="${group.name}" type="${group.groupType}">\n`;
                xml += `          <plugins order="Explicit">\n`;
                
                group.children?.forEach(option => {
                    xml += `            <plugin name="${option.name}">\n`;
                    xml += `              <description>${option.description || ''}</description>\n`;
                    if (option.imagePath) {
                        xml += `              <image path="${option.imagePath}" />\n`;
                    }
                    
                    // Add file installation instructions
                    if (option.files && option.files.length > 0) {
                        xml += `              <files>\n`;
                        option.files.forEach(file => {
                            xml += `                <file source="${file.source}" destination="${file.dest}" />\n`;
                        });
                        xml += `              </files>\n`;
                    }
                    
                    xml += `              <typeDescriptor>\n`;
                    xml += `                <type name="Optional"/>\n`;
                    xml += `              </typeDescriptor>\n`;
                    xml += `            </plugin>\n`;
                });
                
                xml += `          </plugins>\n`;
                xml += `        </group>\n`;
            });
            
            xml += `      </optionalFileGroups>\n`;
            xml += `    </installStep>\n`;
        });
        
        xml += `  </installSteps>\n`;
        xml += `</config>`;
        return xml;
    };

    const generateInfoXML = () => {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<fomod>\n`;
        xml += `  <Name>${modName}</Name>\n`;
        xml += `  <Author>${modAuthor}</Author>\n`;
        xml += `  <Version>${modVersion}</Version>\n`;
        if (modWebsite) {
            xml += `  <Website>${modWebsite}</Website>\n`;
        }
        xml += `</fomod>`;
        return xml;
    };

    const handleExportFOMOD = () => {
        // Create a zip-like structure (for now, just download the XMLs)
        const moduleConfig = generateModuleConfigXML();
        const info = generateInfoXML();
        
        // Download ModuleConfig.xml
        const moduleBlob = new Blob([moduleConfig], { type: 'text/xml' });
        const moduleUrl = URL.createObjectURL(moduleBlob);
        const moduleLink = document.createElement('a');
        moduleLink.href = moduleUrl;
        moduleLink.download = 'ModuleConfig.xml';
        moduleLink.click();
        URL.revokeObjectURL(moduleUrl);
        
        // Download Info.xml
        setTimeout(() => {
            const infoBlob = new Blob([info], { type: 'text/xml' });
            const infoUrl = URL.createObjectURL(infoBlob);
            const infoLink = document.createElement('a');
            infoLink.href = infoUrl;
            infoLink.download = 'info.xml';
            infoLink.click();
            URL.revokeObjectURL(infoUrl);
        }, 100);
        
        alert('FOMOD files downloaded! Place ModuleConfig.xml in /fomod/ folder and info.xml in root.');
    };

    // --- Renderers ---
    const renderTree = (nodes: FomodNode[], depth = 0) => {
        return nodes.map(node => (
            <div key={node.id} className="select-none">
                <div 
                    className={`flex items-center gap-2 py-1 px-2 cursor-pointer transition-colors border-l-2 ${
                        selectedId === node.id 
                        ? 'bg-slate-800 border-forge-accent text-white' 
                        : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                >
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="hover:text-white">
                        {node.children ? (
                            node.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                        ) : <div className="w-3 h-3" />}
                    </button>
                    
                    {node.type === 'page' ? <FileText className="w-3 h-3 text-blue-400" /> :
                     node.type === 'group' ? <Layers className="w-3 h-3 text-yellow-400" /> :
                     <CheckSquare className="w-3 h-3 text-emerald-400" />}
                    
                    <span className="text-xs truncate">{node.name}</span>
                </div>
                
                {node.isExpanded && node.children && (
                    <div>{renderTree(node.children, depth + 1)}</div>
                )}
            </div>
        ));
    };

    const renderPreview = () => {
        // Simplified Preview of the First Page
        const page = structure[0];
        if (!page) return <div className="text-slate-500 text-center mt-20">No pages defined.</div>;

        return (
            <div className="w-full max-w-2xl mx-auto bg-[#2d2d2d] border border-black shadow-2xl rounded-sm overflow-hidden flex flex-col h-[500px]">
                {/* Title Bar */}
                <div className="bg-gradient-to-b from-[#444] to-[#333] p-2 flex justify-between items-center border-b border-black">
                    <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Mod Organizer 2 - Installer</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 flex p-4 gap-4 bg-[#222]">
                    {/* Left: Image */}
                    <div className="w-1/3 bg-black border border-[#555] flex items-center justify-center relative">
                        {selectedId && findNode(structure, selectedId)?.imagePath ? (
                            <div className="w-full h-full flex items-center justify-center p-3 text-center">
                                <div className="text-[10px] text-slate-300 font-mono break-words">
                                    {findNode(structure, selectedId)?.imagePath}
                                </div>
                            </div>
                        ) : (
                            <ImageIcon className="w-12 h-12 text-slate-700" />
                        )}
                        <div className="absolute bottom-0 w-full bg-black/80 text-[10px] text-slate-300 p-1 text-center">Preview</div>
                    </div>

                    {/* Right: Options */}
                    <div className="flex-1 flex flex-col">
                        <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-600 pb-2">{page.name}</h2>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {page.children?.map(group => (
                                <div key={group.id} className="space-y-1">
                                    <div className="text-xs font-bold text-[#e1ba5c] uppercase tracking-wider">{group.name}</div>
                                    <div className="space-y-0.5">
                                        {group.children?.map(opt => (
                                            <label key={opt.id} className="flex items-center gap-2 p-1 hover:bg-white/5 cursor-pointer group">
                                                <input 
                                                    type={group.groupType === 'SelectExactlyOne' ? 'radio' : 'checkbox'} 
                                                    name={group.id}
                                                    className="accent-[#e1ba5c] bg-[#333] border-[#555]"
                                                />
                                                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{opt.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Description Box */}
                        <div className="h-24 mt-4 bg-black/40 border border-[#444] p-2 text-xs text-slate-400 font-mono overflow-y-auto">
                            {selectedId ? findNode(structure, selectedId)?.description : "Hover over an option to see details."}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-[#333] border-t border-black flex justify-between">
                    <button className="px-4 py-1 bg-[#444] text-slate-300 text-xs border border-black shadow-inner">Back</button>
                    <button className="px-4 py-1 bg-[#444] text-slate-300 text-xs border border-black shadow-inner">Next</button>
                </div>
            </div>
        );
    };

    const selectedNode = selectedId ? findNode(structure, selectedId) : null;

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-forge-panel flex justify-between items-center shadow-md z-10">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Package className="w-6 h-6 text-purple-400" />
                        The Assembler
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">FOMOD Creation Tool v1.7</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigate('/settings/tools')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold flex items-center gap-2 transition-all"
                        title="Configure external tool paths"
                    >
                        <Settings className="w-4 h-4" /> Tool Settings
                    </button>
                    <button 
                        onClick={handleLaunchExternalTool}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded text-xs font-bold flex items-center gap-2 transition-all group relative"
                        title="Launch FOMOD Creation Tool 1.7\n\nRequires: FOMOD Creation Tool (Download from Nexus Mods)\nhttps://www.nexusmods.com/fallout4/mods/6821"
                    >
                        <ExternalLink className="w-4 h-4" /> Launch Tool
                        <Info className="w-3 h-3 text-blue-300 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button 
                        onClick={handleExportFOMOD}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center gap-2 transition-all"
                    >
                        <Download className="w-4 h-4" /> Export FOMOD
                    </button>
                    <button 
                        onClick={() => setViewMode('editor')}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'editor' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <Layers className="w-4 h-4" /> Structure
                    </button>
                    <button 
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button 
                        onClick={() => setViewMode('xml')}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'xml' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <Code className="w-4 h-4" /> XML
                    </button>
                </div>
            </div>

            <div className="px-4 pt-4 max-h-72 overflow-y-auto pr-2">
                <ToolsInstallVerifyPanel
                    className="mb-0"
                    accentClassName="text-purple-300"
                    description="Assembler lets you design a FOMOD structure and export it. Launching an external FOMOD editor is optional and only works if you set a real path in Tool Settings."
                    tools={[
                        {
                            label: 'FOMOD Creation Tool (optional external editor)',
                            href: 'https://www.nexusmods.com/fallout4/mods/6821',
                            note: 'Optional. Use Tool Settings to point Mossy at the executable you installed.',
                            kind: 'official',
                        },
                    ]}
                    verify={[
                        'Switch between Structure / Preview / XML to confirm all three views render.',
                        'Export FOMOD and verify files/folders are written to the chosen output.',
                        'If you use Launch Tool: set the tool path in Tool Settings first.',
                    ]}
                    firstTestLoop={[
                        'Create a tiny installer (one page, two options, one file mapping).',
                        'Export and inspect the output in Workshop.',
                        'Do one install/uninstall cycle in your mod manager before scaling up.',
                    ]}
                    troubleshooting={[
                        'If Launch Tool fails, no default path is assumed—configure it in Tool Settings.',
                        'If export output is missing, ensure your options include at least one file mapping.',
                    ]}
                    shortcuts={[
                        { label: 'Tool Settings', to: '/settings/tools' },
                        { label: 'Workshop', to: '/workshop' },
                        { label: 'Packaging', to: '/packaging-release' },
                        { label: 'Diagnostics', to: '/diagnostics' },
                    ]}
                />
            </div>
                        {/* External tool status */}
                        <div className="px-4 pt-2">
                                <ExternalToolNotice 
                                    toolKey="fomodCreatorPath" 
                                    toolName="FOMOD Creation Tool" 
                                    nexusUrl="https://www.nexusmods.com/fallout4/mods/6821"
                                    description="Use the external designer to finalize your installer. Configure the path and launch directly from here."
                                />
                        </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Structure Tree */}
                <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
                    <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Installer Tree</span>
                        <div className="flex gap-1">
                            <button onClick={() => addNode(selectedId, 'page')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="Add Page"><FileText className="w-3 h-3"/></button>
                            <button onClick={() => addNode(selectedId, 'group')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="Add Group"><Layers className="w-3 h-3"/></button>
                            <button onClick={() => addNode(selectedId, 'option')} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="Add Option"><CheckSquare className="w-3 h-3"/></button>
                            <button onClick={() => selectedId && deleteNode(selectedId)} className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {renderTree(structure)}
                    </div>
                    
                    {/* AI Tools */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Wand2 className="w-3 h-3" /> Auto-Assemble
                        </h4>
                        <div className="text-[10px] text-slate-500 mb-2">
                            Detected {modFiles.length} files in workspace.
                        </div>
                        <button 
                            onClick={handleAutoGenerate}
                            disabled={isGenerating}
                            className="w-full py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                            {isGenerating ? 'Analyzing...' : 'Generate Structure'}
                        </button>
                    </div>
                </div>

                {/* Center: Main Stage */}
                <div className="flex-1 flex flex-col bg-[#0f151f] overflow-hidden relative">
                    <div className="absolute inset-0 opacity-5 pointer-events-none" 
                         style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                    
                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                        {viewMode === 'editor' ? (
                            selectedNode ? (
                                <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl relative z-10">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        {selectedNode.type === 'page' ? <FileText className="w-5 h-5 text-blue-400" /> :
                                         selectedNode.type === 'group' ? <Layers className="w-5 h-5 text-yellow-400" /> :
                                         <CheckSquare className="w-5 h-5 text-emerald-400" />}
                                        Edit {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                                            <input 
                                                type="text" 
                                                value={selectedNode.name} 
                                                onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                                            />
                                        </div>

                                        {selectedNode.type === 'group' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selection Logic</label>
                                                <select 
                                                    value={selectedNode.groupType} 
                                                    onChange={(e) => updateNode(selectedNode.id, { groupType: e.target.value as any })}
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                                                >
                                                    <option value="SelectExactlyOne">Select Exactly One (Radio)</option>
                                                    <option value="SelectAny">Select Any (Checkbox)</option>
                                                    <option value="SelectAtMostOne">Select At Most One</option>
                                                </select>
                                            </div>
                                        )}

                                        {selectedNode.type === 'option' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                                    <textarea 
                                                        value={selectedNode.description || ''} 
                                                        onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                                                        className="w-full h-24 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none resize-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image Path</label>
                                                    <input 
                                                        type="text" 
                                                        value={selectedNode.imagePath || ''} 
                                                        onChange={(e) => updateNode(selectedNode.id, { imagePath: e.target.value })}
                                                        placeholder="Images/preview.png"
                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Files to Install</label>
                                                    <button 
                                                        onClick={handleAssignFiles}
                                                        className="w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center justify-center gap-2 mb-2"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Assign Files
                                                    </button>
                                                    {selectedNode.files && selectedNode.files.length > 0 && (
                                                        <div className="space-y-1 max-h-24 overflow-y-auto bg-slate-900/50 border border-slate-700 rounded p-2">
                                                            {selectedNode.files.map((file, i) => (
                                                                <div key={i} className="text-xs text-slate-300 font-mono truncate">
                                                                    📄 {file.source}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-600 flex flex-col items-center">
                                    <Package className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Select a node to edit properties.</p>
                                </div>
                            )
                        ) : viewMode === 'xml' ? (
                            <div className="w-full h-full max-w-4xl bg-[#1e1e1e] border border-slate-700 rounded-lg overflow-hidden flex flex-col shadow-2xl relative z-10">
                                <div className="bg-[#2d2d2d] p-2 border-b border-black text-xs text-slate-400 font-mono flex justify-between items-center">
                                    <span>ModuleConfig.xml</span>
                                    <button 
                                        onClick={handleExportFOMOD}
                                        className="text-purple-400 hover:text-white flex items-center gap-1"
                                    >
                                        <Download className="w-3 h-3" /> Export
                                    </button>
                                </div>
                                <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-emerald-300 custom-scrollbar leading-relaxed">
                                    {generateModuleConfigXML()}
                                </pre>
                            </div>
                        ) : (
                            renderPreview()
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheAssembler;