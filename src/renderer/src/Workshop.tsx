import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Folder, FileCode, FileImage, FileBox, ChevronRight, ChevronDown, Play, Save, RefreshCw, Box, Layers, Code, CheckCircle2, AlertCircle, Share2, Workflow, Plus, Zap, ArrowRight, Package, BookOpen, Copy } from 'lucide-react';

// --- Types ---
interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileType?: 'script' | 'mesh' | 'texture' | 'config';
  content?: string; // For scripts
  children?: FileNode[];
  isOpen?: boolean;
}

interface GraphNode {
  id: string;
  type: 'event' | 'action' | 'condition' | 'variable';
  label: string;
  x: number;
  y: number;
  outputs: string[]; // IDs of nodes this connects to
}

// --- Sample Data ---
const initialFileSystem: FileNode[] = [
  {
    id: 'root',
    name: 'MyMod_Project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'scripts',
        name: 'Scripts',
        type: 'folder',
        isOpen: true,
        children: [
          { 
              id: 'script1', 
              name: 'QuestHandler.psc', 
              type: 'file', 
              fileType: 'script',
              content: `Scriptname QuestHandler extends Quest

; Mossy Auto-Generated Script
; Handles stage updates for the artifact retrieval

Actor Property PlayerRef Auto
ObjectReference Property ArtifactContainer Auto
GlobalVariable Property CurrentStage Auto

Event OnStageSet(int auiStageID, int auiItemID)
    if auiStageID == 10
        Debug.Notification("The signal is getting stronger...")
        ArtifactContainer.Enable()
    endif

    if auiStageID == 20
        PlayerRef.AddItem(ArtifactContainer, 1)
        SetObjectiveCompleted(10)
        SetObjectiveDisplayed(20)
    endif
EndEvent` 
          },
          { 
              id: 'script2', 
              name: 'TerminalLock.psc', 
              type: 'file', 
              fileType: 'script',
              content: `Scriptname TerminalLock extends ObjectReference

bool Property IsLocked = true Auto

Event OnInit()
    BlockActivation(true)
EndEvent

Event OnActivate(ObjectReference akActionRef)
    if IsLocked
        Debug.Notification("System Lockdown Active. Authorization Required.")
    else
        Activate(akActionRef)
    endif
EndEvent`
          }
        ]
      },
      {
        id: 'meshes',
        name: 'Meshes',
        type: 'folder',
        isOpen: true,
        children: [
          { id: 'mesh1', name: 'CyberSword.nif', type: 'file', fileType: 'mesh' },
          { id: 'mesh2', name: 'Helmet_Visor.nif', type: 'file', fileType: 'mesh' }
        ]
      },
      {
        id: 'textures',
        name: 'Textures',
        type: 'folder',
        children: [
          { id: 'tex1', name: 'Sword_d.dds', type: 'file', fileType: 'texture' },
          { id: 'tex2', name: 'Sword_n.dds', type: 'file', fileType: 'texture' }
        ]
      }
    ]
  }
];

const initialQuestNodes: GraphNode[] = [
    { id: 'n1', type: 'event', label: 'Event: OnStageSet', x: 50, y: 50, outputs: ['n2', 'n3'] },
    { id: 'n2', type: 'condition', label: 'If Stage == 10', x: 250, y: 50, outputs: ['n4', 'n5'] },
    { id: 'n3', type: 'condition', label: 'If Stage == 20', x: 250, y: 200, outputs: ['n6', 'n7'] },
    { id: 'n4', type: 'action', label: 'Show Msg: "Signal Stronger"', x: 500, y: 20, outputs: [] },
    { id: 'n5', type: 'action', label: 'ArtifactContainer.Enable()', x: 500, y: 80, outputs: [] },
    { id: 'n6', type: 'action', label: 'Player.AddItem(Artifact)', x: 500, y: 170, outputs: [] },
    { id: 'n7', type: 'action', label: 'Update Objectives', x: 500, y: 230, outputs: [] },
];

const papyrusSnippets = [
    { label: 'OnHit Event', code: 'Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, bool abPowerAttack, bool abSneakAttack, bool abBashAttack, bool abHitBlocked, string asMaterialName)\n    ; Code\nEndEvent' },
    { label: 'OnEquip Event', code: 'Event OnEquipped(Actor akActor)\n    if akActor == Game.GetPlayer()\n        ; Code\n    endif\nEndEvent' },
    { label: 'Remote Event', code: 'RegisterForRemoteEvent(PlayerRef, "OnItemAdded")\n\nEvent ObjectReference.OnItemAdded(ObjectReference akSender, Form akBaseItem, int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)\n    ; Code\nEndEvent' },
    { label: 'Loop (While)', code: 'while (condition)\n    ; Code\nendWhile' },
    { label: 'Message Box', code: 'int button = MyMessage.Show()\nif button == 0\n    ; Option 1\nelseif button == 1\n    ; Option 2\nendif' },
];

// --- 3D Wireframe Preview Component ---
const WireframePreview: React.FC<{ active: boolean }> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!active || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let rotation = 0;
        let animationId: number;

        const drawCube = (rot: number) => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#38bdf8'; // Forge Accent
            ctx.lineWidth = 2;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const size = 60;

            const vertices = [
                {x: -1, y: -1, z: -1}, {x: 1, y: -1, z: -1},
                {x: 1, y: 1, z: -1}, {x: -1, y: 1, z: -1},
                {x: -1, y: -1, z: 1}, {x: 1, y: -1, z: 1},
                {x: 1, y: 1, z: 1}, {x: -1, y: 1, z: 1}
            ];

            const rotated = vertices.map(v => {
                // Rotate Y
                let x = v.x * Math.cos(rot) - v.z * Math.sin(rot);
                let z = v.x * Math.sin(rot) + v.z * Math.cos(rot);
                // Rotate X
                let y = v.y * Math.cos(rot * 0.5) - z * Math.sin(rot * 0.5);
                z = v.y * Math.sin(rot * 0.5) + z * Math.cos(rot * 0.5);
                
                // Project
                const scale = 200 / (200 + z * 50); // Perspective
                return {
                    x: cx + x * size * scale,
                    y: cy + y * size * scale
                };
            });

            const edges = [
                [0,1], [1,2], [2,3], [3,0], // Back face
                [4,5], [5,6], [6,7], [7,4], // Front face
                [0,4], [1,5], [2,6], [3,7]  // Connecting edges
            ];

            ctx.beginPath();
            edges.forEach(edge => {
                const v1 = rotated[edge[0]];
                const v2 = rotated[edge[1]];
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
            });
            ctx.stroke();
        };

        const animate = () => {
            rotation += 0.02;
            drawCube(rotation);
            animationId = requestAnimationFrame(animate);
        };

        // Resize
        canvas.width = canvas.parentElement?.clientWidth || 300;
        canvas.height = canvas.parentElement?.clientHeight || 300;

        animate();
        return () => cancelAnimationFrame(animationId);
    }, [active]);

    return <canvas ref={canvasRef} className="w-full h-full bg-slate-900/50" />;
};

// --- Visual Graph Editor Component ---
const GraphEditor: React.FC<{ 
    nodes: GraphNode[], 
    setNodes: React.Dispatch<React.SetStateAction<GraphNode[]>> 
}> = ({ nodes, setNodes }) => {
    
    const [isThinking, setIsThinking] = useState(false);

    const handleAiExpand = async () => {
        setIsThinking(true);
        // Simulate AI generating a new logic node
        setTimeout(() => {
            const newNode: GraphNode = {
                id: `ai-${Date.now()}`,
                type: 'condition',
                label: 'AI: If Stage == 30',
                x: 250,
                y: 350,
                outputs: [`ai-act-${Date.now()}`]
            };
            const newAction: GraphNode = {
                id: newNode.outputs[0],
                type: 'action',
                label: 'Start Boss Fight',
                x: 500,
                y: 350,
                outputs: []
            };
            
            // Connect to root event if possible, for now just add
            setNodes(prev => [...prev, newNode, newAction]);
            
            // Link from root node if it exists
            setNodes(prev => prev.map(n => {
                if (n.type === 'event') return { ...n, outputs: [...n.outputs, newNode.id] };
                return n;
            }));
            
            setIsThinking(false);
        }, 1500);
    };

    return (
        <div className="w-full h-full bg-[#1e1e1e] relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>
            
            <svg className="w-full h-full absolute top-0 left-0 pointer-events-none">
                {nodes.map(node => (
                    node.outputs.map(outId => {
                        const target = nodes.find(n => n.id === outId);
                        if (!target) return null;
                        return (
                            <path 
                                key={`${node.id}-${target.id}`}
                                d={`M ${node.x + 180} ${node.y + 40} C ${node.x + 230} ${node.y + 40}, ${target.x - 50} ${target.y + 40}, ${target.x} ${target.y + 40}`}
                                fill="none"
                                stroke="#525252"
                                strokeWidth="2"
                            />
                        );
                    })
                ))}
            </svg>

            {nodes.map(node => (
                <div 
                    key={node.id}
                    className={`absolute w-48 rounded-lg border shadow-lg p-0 transition-transform hover:scale-105 cursor-grab active:cursor-grabbing
                        ${node.type === 'event' ? 'bg-red-900/40 border-red-500' : 
                          node.type === 'condition' ? 'bg-blue-900/40 border-blue-500' : 
                          'bg-slate-800 border-slate-600'}
                    `}
                    style={{ left: node.x, top: node.y }}
                >
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-t-lg
                        ${node.type === 'event' ? 'bg-red-500/20 text-red-200' : 
                          node.type === 'condition' ? 'bg-blue-500/20 text-blue-200' : 
                          'bg-slate-700 text-slate-300'}
                    `}>
                        {node.type}
                    </div>
                    <div className="p-3 text-xs font-mono text-slate-200 font-bold">
                        {node.label}
                    </div>
                    {/* Ports */}
                    <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-400 rounded-full"></div>
                    <div className="absolute top-1/2 -right-1 w-2 h-2 bg-slate-400 rounded-full"></div>
                </div>
            ))}
            
            {/* Graph Controls */}
            <div className="absolute bottom-6 right-6 flex gap-2">
                <button 
                    onClick={handleAiExpand}
                    disabled={isThinking}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                >
                    {isThinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    {isThinking ? 'Dreaming...' : 'AI Expand Graph'}
                </button>
                <button className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            
            <div className="absolute top-4 left-4 bg-black/50 p-2 rounded text-[10px] text-slate-400 font-mono">
                The Loom v1.0 (Visual Scripting)
            </div>
        </div>
    );
};

const Workshop: React.FC = () => {
  const [fileSystem, setFileSystem] = useState<FileNode[]>(initialFileSystem);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(fileSystem[0].children![0].children![0]); // Select first script
  const [codeContent, setCodeContent] = useState(selectedFile?.content || '');
  const [viewMode, setViewMode] = useState<'code' | 'graph'>('code');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(initialQuestNodes);
  const [showSnippets, setShowSnippets] = useState(true);
  
  const [compiling, setCompiling] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
      "Mossy Workshop v2.4 initialized.",
      "Target Context: Fallout 4 (Papyrus)",
      "Connected to Local Bridge: ACTIVE",
      "Ready for input."
  ]);

  const toggleFolder = (nodeId: string, nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
          if (node.id === nodeId) return { ...node, isOpen: !node.isOpen };
          if (node.children) return { ...node, children: toggleFolder(nodeId, node.children) };
          return node;
      });
  };

  const handleNodeClick = (node: FileNode) => {
      if (node.type === 'folder') {
          setFileSystem(prev => toggleFolder(node.id, prev));
      } else {
          setSelectedFile(node);
          if (node.fileType === 'script') {
              setCodeContent(node.content || '');
              // Reset view to code when switching files usually
          }
      }
  };

  const insertSnippet = (snippet: string) => {
      setCodeContent(prev => prev + '\n\n' + snippet);
  };

  const handleCompile = () => {
      setCompiling(true);
      setConsoleOutput(prev => [...prev, `> Compiling ${selectedFile?.name}...`]);
      setConsoleOutput(prev => [...prev, `> Linking against Fallout4.esm...`]);
      
      setTimeout(() => {
          setCompiling(false);
          const success = Math.random() > 0.1; // 90% success
          if (success) {
              setConsoleOutput(prev => [...prev, `> Compilation SUCCESS (0 Errors, 0 Warnings)`, "> Object script attached to Data/Scripts/Source/User/"]);
          } else {
              setConsoleOutput(prev => [...prev, `> Compilation FAILED`, `> Error on Line 14: mismatched types (Int vs Float)`]);
          }
      }, 1500);
  };
  
  const handleDeploy = () => {
      if (deploying) return;
      setDeploying(true);
      setConsoleOutput(prev => [...prev, `> Deploying project to Game Data Folder...`]);
      
      setTimeout(() => {
          setConsoleOutput(prev => [...prev, `> Copying Meshes... OK`, `> Copying Scripts... OK`, `> Updating Plugins.txt... OK`, `> DEPLOY COMPLETE. Ready to launch.`]);
          setDeploying(false);
      }, 2000);
  };

  const handleSave = () => {
      setConsoleOutput(prev => [...prev, `> Saving ${selectedFile?.name}... Done.`]);
      // Update content in memory
      const updateContent = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(n => {
              if (n.id === selectedFile?.id) return { ...n, content: codeContent };
              if (n.children) return { ...n, children: updateContent(n.children) };
              return n;
          });
      };
      setFileSystem(prev => updateContent(prev));
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
      return nodes.map(node => (
          <div key={node.id}>
              <div 
                  className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-slate-800 transition-colors ${selectedFile?.id === node.id ? 'bg-slate-800 text-forge-accent' : 'text-slate-400'}`}
                  style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  onClick={() => handleNodeClick(node)}
              >
                  {node.type === 'folder' && (
                      node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                  )}
                  {node.type === 'folder' ? <Folder className="w-4 h-4 text-emerald-500" /> : 
                   node.fileType === 'script' ? <FileCode className="w-4 h-4 text-yellow-500" /> :
                   node.fileType === 'mesh' ? <Box className="w-4 h-4 text-blue-400" /> :
                   <FileImage className="w-4 h-4 text-purple-400" />
                  }
                  <span className="text-xs font-mono truncate">{node.name}</span>
              </div>
              {node.type === 'folder' && node.isOpen && node.children && (
                  <div>{renderTree(node.children, depth + 1)}</div>
              )}
          </div>
      ));
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-700 bg-forge-panel flex items-center px-4 justify-between shadow-md z-10">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="w-6 h-6 text-forge-accent" />
              <div>
                  <div className="leading-none">The Workshop</div>
                  <div className="text-[10px] text-slate-500 font-normal">IDE Mode: {viewMode === 'code' ? 'Scripting' : 'Visual Graph'}</div>
              </div>
          </div>
          <div className="flex gap-2">
              <button 
                onClick={handleDeploy}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/50 hover:bg-purple-900 border border-purple-500/30 rounded text-xs text-purple-200 font-bold transition-all"
              >
                 {deploying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                 {deploying ? 'Deploying...' : 'Deploy to Game'}
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
              <button 
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs transition-colors"
              >
                  <Save className="w-3 h-3" /> Save
              </button>
              <button 
                onClick={handleCompile}
                disabled={compiling || selectedFile?.fileType !== 'script'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
              >
                  {compiling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  {compiling ? 'Building...' : 'Compile'}
              </button>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* File Explorer */}
          <div className="w-64 border-r border-slate-700 bg-slate-900/50 flex flex-col">
              <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700/50 flex justify-between items-center">
                  <span>Explorer</span>
                  <span className="text-[10px] bg-slate-800 px-1 rounded">v2.4</span>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                  {renderTree(fileSystem)}
              </div>
          </div>

          {/* Editor / Preview Area */}
          <div className="flex-1 flex flex-col bg-slate-900 relative">
              {/* Tabs */}
              <div className="flex bg-slate-900 border-b border-slate-700 justify-between items-center pr-2">
                  <div className="flex">
                    <div className="px-4 py-2 text-xs font-medium bg-slate-800 border-r border-slate-700 border-t-2 border-t-forge-accent text-slate-200 flex items-center gap-2">
                        {selectedFile?.fileType === 'script' ? <FileCode className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                        {selectedFile?.name}
                        <span className="ml-2 hover:bg-slate-700 rounded-full p-0.5"><code className="text-[10px]">x</code></span>
                    </div>
                  </div>
                  
                  {/* View Toggles for Scripts */}
                  {selectedFile?.fileType === 'script' && (
                      <div className="flex items-center gap-2">
                          <button onClick={() => setShowSnippets(!showSnippets)} className={`p-1.5 rounded ${showSnippets ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`} title="Toggle Snippets">
                              <BookOpen className="w-3 h-3" />
                          </button>
                          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 scale-90">
                              <button 
                                  onClick={() => setViewMode('code')}
                                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'code' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                              >
                                  <Code className="w-3 h-3" /> Code
                              </button>
                              <button 
                                  onClick={() => setViewMode('graph')}
                                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all ${viewMode === 'graph' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                              >
                                  <Workflow className="w-3 h-3" /> Loom
                              </button>
                          </div>
                      </div>
                  )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden relative flex">
                  {selectedFile?.fileType === 'script' ? (
                      viewMode === 'code' ? (
                          <>
                            <textarea
                                className="flex-1 bg-slate-900 p-4 font-mono text-sm text-slate-300 resize-none focus:outline-none leading-relaxed"
                                value={codeContent}
                                onChange={(e) => {
                                    setCodeContent(e.target.value);
                                }}
                                spellCheck={false}
                            />
                            
                            {/* Snippets Sidebar */}
                            {showSnippets && (
                                <div className="w-56 bg-slate-900 border-l border-slate-700 flex flex-col animate-slide-in-right">
                                    <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/50">
                                        Papyrus Kit
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {papyrusSnippets.map((snip, i) => (
                                            <div key={i} className="group bg-slate-800 p-2 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-300">{snip.label}</span>
                                                    <button onClick={() => insertSnippet(snip.code)} className="text-slate-500 hover:text-forge-accent">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <pre className="text-[8px] text-slate-500 font-mono truncate">{snip.code.split('\n')[0]}</pre>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                          </>
                      ) : (
                          <GraphEditor nodes={graphNodes} setNodes={setGraphNodes} />
                      )
                  ) : selectedFile?.fileType === 'mesh' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-slate-900 to-black">
                          <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded text-xs font-mono border border-slate-700/50 backdrop-blur-sm">
                              <div className="text-slate-400 mb-1 font-bold">MESH STATISTICS</div>
                              <div>Vertices: <span className="text-forge-accent">1,240</span></div>
                              <div>Triangles: <span className="text-forge-accent">2,408</span></div>
                              <div>Material: <span className="text-forge-accent">PBR_MetalRough</span></div>
                          </div>
                          <WireframePreview active={true} />
                          <div className="absolute bottom-4 flex flex-col items-center animate-pulse">
                              <div className="text-xs text-forge-accent font-mono uppercase tracking-widest mb-1">Holo-Preview Active</div>
                              <div className="w-32 h-px bg-gradient-to-r from-transparent via-forge-accent to-transparent"></div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600">
                          <FileImage className="w-16 h-16 mb-4 opacity-20" />
                          <p>Preview not available for this file type.</p>
                      </div>
                  )}
              </div>
              
              {/* Console Panel */}
              <div className="h-32 bg-black border-t border-slate-700 p-2 font-mono text-xs overflow-y-auto">
                  {consoleOutput.map((line, i) => (
                      <div key={i} className={`mb-1 ${line.includes('FAILED') || line.includes('Error') ? 'text-red-400' : line.includes('SUCCESS') ? 'text-emerald-400' : line.includes('Deploy') ? 'text-purple-400' : 'text-slate-400'}`}>
                          {line}
                      </div>
                  ))}
                  {(compiling || deploying) && <div className="text-forge-accent animate-pulse">_</div>}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Workshop;