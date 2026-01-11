import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Package, Plus, Trash2, Eye, Code, Wand2, RefreshCw, FileText, Layers, CheckSquare, Image as ImageIcon, ChevronRight, ChevronDown, Download } from 'lucide-react';

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

const initialStructure: FomodNode[] = [
    {
        id: 'page1', type: 'page', name: 'Install Options', isExpanded: true, children: [
            {
                id: 'grp1', type: 'group', name: 'Texture Resolution', groupType: 'SelectExactlyOne', isExpanded: true, children: [
                    { id: 'opt1', type: 'option', name: '2K Textures', description: 'Recommended for most users.', imagePath: 'Images/2k_preview.png' },
                    { id: 'opt2', type: 'option', name: '4K Textures', description: 'For high-end systems only.', imagePath: 'Images/4k_preview.png' }
                ]
            },
            {
                id: 'grp2', type: 'group', name: 'Optional Patches', groupType: 'SelectAny', isExpanded: true, children: [
                    { id: 'opt3', type: 'option', name: 'Darker Nights Patch', description: 'Compatibility for Darker Nights.', imagePath: '' },
                    { id: 'opt4', type: 'option', name: 'ENB Light Patch', description: 'Adds complex particle lights.', imagePath: '' }
                ]
            }
        ]
    }
];

const mockFiles = [
    "Textures/Weapons/Rifle_2k_d.dds",
    "Textures/Weapons/Rifle_2k_n.dds",
    "Textures/Weapons/Rifle_4k_d.dds",
    "Textures/Weapons/Rifle_4k_n.dds",
    "Meshes/Weapons/Rifle.nif",
    "MyMod.esp",
    "Patches/MyMod_DarkerNights.esp",
    "Patches/MyMod_ENB.esp"
];

const TheAssembler: React.FC = () => {
    const [structure, setStructure] = useState<FomodNode[]>(initialStructure);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'xml'>('editor');
    const [isGenerating, setIsGenerating] = useState(false);

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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
            Act as a FOMOD installer architect.
            I have these files in my mod folder: ${JSON.stringify(mockFiles)}.
            
            Analyze the filenames to determine logical grouping (e.g. Resolution options, Patches).
            Generate a JSON structure representing the FOMOD pages/groups/options.
            Structure format: Array of Objects.
            - type: "page" | "group" | "option"
            - name: string
            - description: string
            - groupType: "SelectExactlyOne" | "SelectAny" (only for groups)
            - children: array of same objects.
            
            Do not include file paths mapping, just the visual structure.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            // Clean markdown fences if present
            let cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
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
    const generateXML = () => {
        let xml = `<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">\n`;
        xml += `  <moduleName>My Mod</moduleName>\n  <installSteps order="Explicit">\n`;
        
        structure.forEach(page => {
            xml += `    <installStep name="${page.name}">\n      <optionalFileGroups order="Explicit">\n`;
            page.children?.forEach(group => {
                xml += `        <group name="${group.name}" type="${group.groupType}">\n          <plugins order="Explicit">\n`;
                group.children?.forEach(option => {
                    xml += `            <plugin name="${option.name}">\n`;
                    xml += `              <description>${option.description || ''}</description>\n`;
                    if (option.imagePath) xml += `              <image path="${option.imagePath}" />\n`;
                    xml += `              <typeDescriptor>\n                <type name="Optional"/>\n              </typeDescriptor>\n`;
                    xml += `            </plugin>\n`;
                });
                xml += `          </plugins>\n        </group>\n`;
            });
            xml += `      </optionalFileGroups>\n    </installStep>\n`;
        });
        
        xml += `  </installSteps>\n</config>`;
        return xml;
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
                <div className="flex-1 flex p-4 gap-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] bg-[#222]">
                    {/* Left: Image */}
                    <div className="w-1/3 bg-black border border-[#555] flex items-center justify-center relative">
                        {selectedId && findNode(structure, selectedId)?.imagePath ? (
                            <img src={`https://placehold.co/300x400/111/fff?text=${findNode(structure, selectedId)?.imagePath}`} className="w-full h-full object-cover opacity-80" />
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
                            Detected {mockFiles.length} files in workspace.
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
                                    <button className="text-purple-400 hover:text-white flex items-center gap-1">
                                        <Download className="w-3 h-3" /> Save
                                    </button>
                                </div>
                                <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-emerald-300 custom-scrollbar leading-relaxed">
                                    {generateXML()}
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