import React, { useState } from 'react';
import { Folder, FileCode, FileBox, Play, Save, RefreshCw, Home, ChevronUp } from 'lucide-react';

// --- Types ---
interface FileEntry {
  name: string;
  type: 'folder' | 'file';
  path: string;
  fileType?: string;
}

interface CompilationResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ScriptDeps {
  imports: string[];
  references: string[];
}

interface MeshInfo {
  vertices: number;
  triangles: number;
  materials: string[];
}

interface TextureInfo {
  width: number;
  height: number;
  format: string;
}

const Workshop: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [compiling, setCompiling] = useState(false);
  const [compilerPath, setCompilerPath] = useState('');
  const [compileResult, setCompileResult] = useState<CompilationResult | null>(null);
  
  const [scriptDeps, setScriptDeps] = useState<ScriptDeps | null>(null);
  const [meshInfo, setMeshInfo] = useState<MeshInfo | null>(null);
  const [textureInfo, setTextureInfo] = useState<TextureInfo | null>(null);
  
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    'Workshop v3.0 - Real File Browser & Compilation',
    'Ready for input.'
  ]);

  const api = (window as any).electron?.api;

  // Browse directory and load files
  const browseDirectory = async (dirPath?: string) => {
    if (!api) return;
    setLoading(true);
    try {
      const path = dirPath || currentPath || 'D:\\';
      const entries = await api.browseDirectory(path);
      setCurrentPath(path);
      
      // Organize into tree
      const sorted = entries.sort((a: FileEntry, b: FileEntry) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      setFileTree(sorted);
      setConsoleOutput(prev => [...prev, `[MOSSY] Browsing complete. Directory structure for ${path} mapped, Architect.`]);
    } catch (err) {
      setConsoleOutput(prev => [...prev, `> Error browsing directory: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  // Load file content
  const openFile = async (file: FileEntry) => {
    if (!api || file.type === 'folder') return;
    
    setLoading(true);
    try {
      const content = await api.readFile(file.path);
      setFileContent(content);
      setSelectedFile(file);
      setConsoleOutput(prev => [...prev, `> Opened: ${file.name}`]);
      
      // Load additional info based on file type
      if (file.fileType === 'psc') {
        const deps = await api.parseScriptDeps(file.path);
        setScriptDeps(deps);
        setConsoleOutput(prev => [...prev, `> Dependencies: ${deps.imports.length} imports, ${deps.references.length} references`]);
      } else if (file.fileType === 'dds') {
        const tex = await api.readDdsPreview(file.path);
        setTextureInfo(tex);
        setConsoleOutput(prev => [...prev, `> Texture: ${tex.width}x${tex.height} (${tex.format})`]);
      } else if (file.fileType === 'nif') {
        const mesh = await api.readNifInfo(file.path);
        setMeshInfo(mesh);
        if (mesh) {
          setConsoleOutput(prev => [...prev, `> Mesh: ${mesh.vertices} vertices, ${mesh.triangles} triangles`]);
        }
      }
    } catch (err) {
      setConsoleOutput(prev => [...prev, `> Error loading file: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  // Save file
  const saveFile = async () => {
    if (!api || !selectedFile) return;
    
    try {
      const success = await api.writeFile(selectedFile.path, fileContent);
      if (success) {
        setConsoleOutput(prev => [...prev, `> Saved: ${selectedFile.name}`]);
      } else {
        setConsoleOutput(prev => [...prev, `> Failed to save: ${selectedFile.name}`]);
      }
    } catch (err) {
      setConsoleOutput(prev => [...prev, `> Error saving file: ${err}`]);
    }
  };

  // Compile script
  const compileScript = async () => {
    if (!api || !selectedFile || selectedFile.fileType !== 'psc' || !compilerPath) {
      setConsoleOutput(prev => [...prev, '> Error: Script not selected or compiler not set']);
      return;
    }

    setCompiling(true);
    setConsoleOutput(prev => [...prev, `> Compiling ${selectedFile.name}...`]);
    
    try {
      const result = await api.runPapyrusCompiler(selectedFile.path, compilerPath);
      setCompileResult(result);
      
      if (result.exitCode === 0) {
        setConsoleOutput(prev => [...prev, '[MOSSY] Compilation SUCCESS. The script is now optimized and ready for deployment.', '> Output: Papyrus script compiled']);
      } else {
        setConsoleOutput(prev => [...prev, `[MOSSY] Compilation FAILED. I detected errors in the logic flow.`, result.stderr || result.stdout]);
      }
    } catch (err) {
      setConsoleOutput(prev => [...prev, `> Compilation error: ${err}`]);
    } finally {
      setCompiling(false);
    }
  };

  // Navigate up directory
  const navigateUp = () => {
    if (!currentPath) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('\\'));
    browseDirectory(parent || 'D:\\');
  };

  // Navigate to home
  const navigateHome = () => {
    browseDirectory('D:\\');
  };

  const renderFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'psc': return <FileCode className="w-4 h-4 text-yellow-500" />;
      case 'nif': return <FileBox className="w-4 h-4 text-blue-400" />;
      case 'dds': return <FileBox className="w-4 h-4 text-purple-400" />;
      default: return <FileBox className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-700 bg-forge-panel flex items-center px-4 justify-between shadow-md z-10">
        <div className="flex items-center gap-2 flex-1">
          <button 
            onClick={navigateHome}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Home directory"
          >
            <Home className="w-4 h-4" />
          </button>
          <button 
            onClick={navigateUp}
            disabled={!currentPath}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
            title="Parent directory"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <input
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') browseDirectory(currentPath); }}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
            placeholder="Enter directory path..."
          />
          <button 
            onClick={() => browseDirectory()}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Browse'}
          </button>
        </div>

        <div className="flex gap-2 ml-4">
          <input
            value={compilerPath}
            onChange={(e) => setCompilerPath(e.target.value)}
            className="w-40 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
            placeholder="Compiler path..."
          />
          <button 
            onClick={compileScript}
            disabled={!selectedFile || selectedFile.fileType !== 'psc' || !compilerPath || compiling}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
          >
            {compiling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            {compiling ? 'Compiling...' : 'Compile'}
          </button>
          <button 
            onClick={saveFile}
            disabled={!selectedFile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Browser */}
        <div className="w-64 border-r border-slate-700 bg-slate-900/50 flex flex-col overflow-hidden">
          <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
            File Browser
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {fileTree.length === 0 ? (
              <div className="text-xs text-slate-500 p-2">No files loaded. Browse a directory above.</div>
            ) : (
              fileTree.map(entry => (
                <div
                  key={entry.path}
                  className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-slate-800 rounded transition-colors ${
                    selectedFile?.path === entry.path ? 'bg-slate-800 text-forge-accent' : 'text-slate-400'
                  }`}
                  onClick={() => entry.type === 'file' ? openFile(entry) : null}
                >
                  {entry.type === 'folder' ? (
                    <Folder className="w-4 h-4 text-emerald-500" />
                  ) : (
                    renderFileIcon(entry.fileType)
                  )}
                  <span className="text-xs font-mono truncate">{entry.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-slate-900 relative">
          {selectedFile && (
            <>
              {/* File Info */}
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {selectedFile.fileType === 'psc' ? <FileCode className="w-4 h-4 text-yellow-500" /> : <FileBox className="w-4 h-4" />}
                  <span className="font-mono text-slate-300">{selectedFile.name}</span>
                  <span className="text-slate-500 text-[10px]">{selectedFile.path}</span>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex gap-0">
                {/* Text Editor */}
                <div className="flex-1 flex flex-col">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="flex-1 bg-slate-900 p-4 font-mono text-sm text-slate-300 resize-none focus:outline-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                {/* Info Panel */}
                <div className="w-72 border-l border-slate-700 bg-slate-900 flex flex-col overflow-y-auto">
                  {selectedFile.fileType === 'psc' && scriptDeps && (
                    <div className="p-3 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase">Script Deps</div>
                      
                      {scriptDeps.imports.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">Imports</div>
                          <div className="space-y-0.5">
                            {scriptDeps.imports.map(imp => (
                              <div key={imp} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono">
                                {imp}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {scriptDeps.references.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">References</div>
                          <div className="space-y-0.5">
                            {scriptDeps.references.map(ref => (
                              <div key={ref} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono">
                                {ref}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFile.fileType === 'dds' && textureInfo && (
                    <div className="p-3 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase">Texture Info</div>
                      <div className="bg-slate-800 rounded p-2 space-y-1 text-xs">
                        <div><span className="text-slate-500">Dimensions:</span> <span className="text-forge-accent font-bold">{textureInfo.width}x{textureInfo.height}</span></div>
                        <div><span className="text-slate-500">Format:</span> <span className="text-forge-accent font-mono">{textureInfo.format}</span></div>
                      </div>
                    </div>
                  )}

                  {selectedFile.fileType === 'nif' && meshInfo && (
                    <div className="p-3 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase">Mesh Info</div>
                      <div className="bg-slate-800 rounded p-2 space-y-1 text-xs">
                        <div><span className="text-slate-500">Vertices:</span> <span className="text-forge-accent font-bold">{meshInfo.vertices}</span></div>
                        <div><span className="text-slate-500">Triangles:</span> <span className="text-forge-accent font-bold">{meshInfo.triangles}</span></div>
                        <div><span className="text-slate-500">Materials:</span></div>
                        {meshInfo.materials.map(mat => (
                          <div key={mat} className="text-[10px] text-slate-400 font-mono ml-2">{mat}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {compileResult && (
                    <div className="p-3 space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase">Compilation</div>
                      <div className={`text-xs p-2 rounded ${compileResult.exitCode === 0 ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                        {compileResult.exitCode === 0 ? 'Success' : 'Failed'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!selectedFile && (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <FileCode className="w-16 h-16 mb-4 opacity-20 mx-auto" />
                <p className="text-sm">Open a file from the browser to begin editing.</p>
              </div>
            </div>
          )}

          {/* Console */}
          <div className="h-32 bg-black border-t border-slate-700 p-2 font-mono text-xs overflow-y-auto">
            {consoleOutput.map((line, i) => (
              <div key={i} className={`mb-1 ${line.includes('FAILED') || line.includes('Error') ? 'text-red-400' : line.includes('SUCCESS') ? 'text-emerald-400' : 'text-slate-400'}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workshop;
