import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, FolderOpen, FileCode, FileBox, Play, Save, RefreshCw, Home, ChevronUp, Trash2, AlertCircle, Info } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';

// ============================================================================
// WORKSHOP — File Browser, Editor & Papyrus Compiler
// v3.3.0 — Papyrus syntax highlighting overlay · line numbers · persisted compiler path · plugin info panel
// ============================================================================

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

/** Plugin type info derived from file extension — no binary parsing needed */
function getPluginInfo(fileType: string | undefined): { label: string; color: string; notes: string } | null {
  switch (fileType) {
    case 'esp': return {
      label: 'ESP Plugin',
      color: 'text-amber-300',
      notes: 'Standard plugin — counts against the 255-plugin limit. Can hold up to 16M FormIDs. Open in xEdit or the Creation Kit.',
    };
    case 'esm': return {
      label: 'ESM Master',
      color: 'text-amber-500',
      notes: 'Master file — loaded before ESPs. Hardcoded masters (Fallout4.esm, DLC*.esm) cannot be edited safely. Mods using ESM flags load with higher priority.',
    };
    case 'esl': return {
      label: 'ESL Light Plugin',
      color: 'text-emerald-300',
      notes: 'Light plugin — does NOT consume an ESP slot. Capped at 2047 new FormIDs. Ideal for small patches and weapon/armor packs. Set via xEdit File Header flag.',
    };
    case 'ba2': return {
      label: 'BA2 Archive',
      color: 'text-orange-300',
      notes: 'Bethesda Archive 2 — contains packed textures (BC7/BC1/BC5) or general assets. Must be registered in plugin or INI (sResourceArchive2List). Do not open manually; use BAE or Archive2.',
    };
    default: return null;
  }
}

/** Papyrus keyword coloring — applied as inline spans via dangerouslySetInnerHTML */
function highlightPapyrus(code: string): string {
  const keywords = /\b(ScriptName|Extends|Import|Auto|Property|EndProperty|Event|EndEvent|Function|EndFunction|If|ElseIf|Else|EndIf|While|EndWhile|Return|True|False|None|Self|Parent|As|New|Length|PushBack|Find|Remove|Debug|Game|Utility|Actor|Quest|ObjectReference|Form|Int|Float|Bool|String|Var)\b/g;
  const comments = /(;[^\n]*)/g;
  const strings = /("(?:[^"\\]|\\.)*")/g;
  const numbers = /\b(\d+(?:\.\d+)?)\b/g;

  // Escape HTML first
  let h = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply coloring (order matters — strings before keywords)
  h = h.replace(strings, '<span style="color:#98c379">$1</span>');
  h = h.replace(comments, '<span style="color:#636d83;font-style:italic">$1</span>');
  h = h.replace(keywords, '<span style="color:#c678dd">$1</span>');
  h = h.replace(numbers, '<span style="color:#d19a66">$1</span>');
  return h;
}

// ── PapyrusEditor ─────────────────────────────────────────────────────────────
// Transparent textarea over a syntax-highlighted pre/code div.
// Both elements share identical font metrics so highlighted text stays aligned
// with the cursor at all times.
interface PapyrusEditorProps {
  value: string;
  isPsc: boolean;
  onChange: (v: string) => void;
}
const EDITOR_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, Consolas, "Courier New", monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  padding: '1rem',
  margin: 0,
  border: 'none',
  outline: 'none',
  whiteSpace: 'pre',
  overflowWrap: 'normal',
  wordBreak: 'normal',
  tabSize: 4,
};

const PapyrusEditor: React.FC<PapyrusEditorProps> = ({ value, isPsc, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and highlight layer
  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop  = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const highlighted = isPsc ? highlightPapyrus(value) : value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden bg-[#1e1e1e]">
      {/* Highlighted layer (non-interactive) */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-auto pointer-events-none text-slate-300"
        style={{ ...EDITOR_STYLE, background: 'transparent' }}
        dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
      />
      {/* Editable layer — transparent text so highlight shows through */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="absolute inset-0 w-full h-full resize-none focus:outline-none bg-transparent caret-white"
        style={{
          ...EDITOR_STYLE,
          color: 'transparent',
          caretColor: '#e5e7eb',
          // Subtle selection highlight that doesn't hide the highlighted text
          WebkitTextFillColor: 'transparent',
        }}
      />
    </div>
  );
};

const COMPILER_PATH_KEY = 'workshop_compiler_path';
const CONSOLE_MAX_LINES = 200;

const Workshop: React.FC = () => {
  const fileListScrollRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const onWheel = useWheelScrollProxy(fileListScrollRef);

  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [compiling, setCompiling] = useState(false);
  // Persist compiler path across sessions
  const [compilerPath, setCompilerPath] = useState<string>(() => {
    try { return localStorage.getItem(COMPILER_PATH_KEY) ?? ''; } catch { return ''; }
  });
  const [compileResult, setCompileResult] = useState<CompilationResult | null>(null);

  const [scriptDeps, setScriptDeps] = useState<ScriptDeps | null>(null);
  const [meshInfo, setMeshInfo] = useState<MeshInfo | null>(null);
  const [textureInfo, setTextureInfo] = useState<TextureInfo | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    '[WORKSHOP v3.3.0] File browser · Papyrus compiler · Plugin inspector',
    '> Browse a directory or paste a path above to start.',
  ]);

  const api = (window as any).electron?.api || (window as any).electronAPI;

  // Auto-scroll console to bottom on new output
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  // Persist compiler path
  useEffect(() => {
    try {
      localStorage.setItem(COMPILER_PATH_KEY, compilerPath);
    } catch {
      // ignore storage quota/privacy-mode failures
    }
  }, [compilerPath]);

  const addLog = useCallback((lines: string | string[]) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    setConsoleOutput(prev => {
      const next = [...prev, ...arr];
      return next.length > CONSOLE_MAX_LINES ? next.slice(next.length - CONSOLE_MAX_LINES) : next;
    });
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleOutput(['> Console cleared.']);
  }, []);

  // ── Directory browsing ──────────────────────────────────────────────────────

  const browseDirectory = useCallback(async (dirPath?: string) => {
    if (!api) { addLog('> No Electron API available in this build.'); return; }
    const path = dirPath ?? currentPath;
    if (!path) { addLog('> Enter or select a directory path to browse.'); return; }

    setLoading(true);
    try {
      const entries: FileEntry[] = await api.browseDirectory(path);
      setCurrentPath(path);
      const sorted = [...entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFileTree(sorted);
      addLog(`[MOSSY] Mapped ${sorted.length} entries in ${path}`);
    } catch (err) {
      addLog(`> Error browsing directory: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [api, currentPath, addLog]);

  const pickAndBrowseDirectory = useCallback(async () => {
    if (!api) return;
    const picker = api.pickDirectory ?? api.selectDirectory;
    if (!picker) { addLog('> Folder picker unavailable in this build.'); return; }
    try {
      const selected: string | undefined = await picker('Select mod workspace folder');
      if (selected) await browseDirectory(selected);
    } catch (err) {
      addLog(`> Error selecting directory: ${err}`);
    }
  }, [api, browseDirectory, addLog]);

  // ── File open ───────────────────────────────────────────────────────────────

  const openFile = useCallback(async (file: FileEntry) => {
    if (!api || file.type === 'folder') return;
    setLoading(true);
    setIsDirty(false);
    setScriptDeps(null);
    setMeshInfo(null);
    setTextureInfo(null);
    setCompileResult(null);

    try {
      const content: string = await api.readFile(file.path);
      setFileContent(content);
      setSelectedFile(file);
      const lines = content.split('\n').length;
      addLog(`> Opened: ${file.name}  (${lines} lines)`);

      if (file.fileType === 'psc') {
        try {
          const deps: ScriptDeps = await api.parseScriptDeps(file.path);
          setScriptDeps(deps);
          addLog(`> Script deps: ${deps.imports.length} imports, ${deps.references.length} references`);
        } catch { /* non-fatal */ }
      } else if (file.fileType === 'dds') {
        try {
          const tex: TextureInfo = await api.readDdsPreview(file.path);
          setTextureInfo(tex);
          addLog(`> Texture: ${tex.width}×${tex.height}  format: ${tex.format}`);
        } catch { /* non-fatal */ }
      } else if (file.fileType === 'nif') {
        try {
          const mesh: MeshInfo = await api.readNifInfo(file.path);
          setMeshInfo(mesh);
          if (mesh) addLog(`> Mesh: ${mesh.vertices} vertices · ${mesh.triangles} triangles · ${mesh.materials.length} material(s)`);
        } catch { /* non-fatal */ }
      } else if (['esp', 'esm', 'esl'].includes(file.fileType ?? '')) {
        addLog(`> Plugin opened (${file.fileType?.toUpperCase()}). Binary content — use xEdit to inspect records.`);
      }
    } catch (err) {
      addLog(`> Error loading file: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [api, addLog]);

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveFile = useCallback(async () => {
    if (!api || !selectedFile) return;
    try {
      const success: boolean = await api.writeFile(selectedFile.path, fileContent);
      if (success) {
        setIsDirty(false);
        addLog(`> Saved: ${selectedFile.name}`);
      } else {
        addLog(`> Save failed: ${selectedFile.name}`);
      }
    } catch (err) {
      addLog(`> Error saving: ${err}`);
    }
  }, [api, selectedFile, fileContent, addLog]);

  // ── Compile ─────────────────────────────────────────────────────────────────

  const compileScript = useCallback(async () => {
    if (!api || !selectedFile || selectedFile.fileType !== 'psc') {
      addLog('> Select a .psc file first.'); return;
    }
    if (!compilerPath.trim()) {
      addLog('> Set the compiler path (PapyrusCompiler.exe) in the toolbar first.'); return;
    }
    setCompiling(true);
    addLog(`> Compiling ${selectedFile.name}…`);
    try {
      const result: CompilationResult = await api.runPapyrusCompiler(selectedFile.path, compilerPath);
      setCompileResult(result);
      if (result.exitCode === 0) {
        addLog('[MOSSY] Compilation SUCCESS — .pex ready for deployment.');
        if (result.stdout) addLog(result.stdout.trim());
      } else {
        addLog('[MOSSY] Compilation FAILED — errors below:');
        if (result.stderr) addLog(result.stderr.trim());
        if (result.stdout) addLog(result.stdout.trim());
      }
    } catch (err) {
      addLog(`> Compilation error: ${err}`);
    } finally {
      setCompiling(false);
    }
  }, [api, selectedFile, compilerPath, addLog]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const lastSlash = Math.max(currentPath.lastIndexOf('\\'), currentPath.lastIndexOf('/'));
    const parent = currentPath.substring(0, lastSlash);
    if (parent) browseDirectory(parent);
  }, [currentPath, browseDirectory]);

  // ── File type icon ──────────────────────────────────────────────────────────

  const renderFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'psc':  return <FileCode className="w-4 h-4 text-yellow-400" aria-label="Papyrus Source" />;
      case 'pex':  return <FileCode className="w-4 h-4 text-yellow-700" aria-label="Papyrus Compiled" />;
      case 'nif':  return <FileBox  className="w-4 h-4 text-blue-400"   aria-label="NIF Mesh" />;
      case 'dds':  return <FileBox  className="w-4 h-4 text-purple-400" aria-label="DDS Texture" />;
      case 'esp':  return <FileBox  className="w-4 h-4 text-amber-400"  aria-label="ESP Plugin" />;
      case 'esm':  return <FileBox  className="w-4 h-4 text-amber-600"  aria-label="ESM Master" />;
      case 'esl':  return <FileBox  className="w-4 h-4 text-emerald-400" aria-label="ESL Light Plugin" />;
      case 'ba2':  return <FileBox  className="w-4 h-4 text-orange-400" aria-label="BA2 Archive" />;
      case 'bgsm':
      case 'bgem': return <FileBox  className="w-4 h-4 text-teal-400"   aria-label="Material File" />;
      case 'hkx':  return <FileBox  className="w-4 h-4 text-pink-400"   aria-label="Havok Animation" />;
      case 'xwm':
      case 'wav':
      case 'fuz':  return <FileBox  className="w-4 h-4 text-indigo-400" aria-label="Audio File" />;
      default:     return <FileBox  className="w-4 h-4 text-slate-400" />;
    }
  };

  // ── Line numbers ────────────────────────────────────────────────────────────

  const lineCount = fileContent.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  // ── Console line coloring ───────────────────────────────────────────────────

  const consoleLineClass = (line: string) => {
    if (line.includes('FAILED') || line.startsWith('> Error') || line.startsWith('> Compilation error')) return 'text-red-400';
    if (line.includes('SUCCESS') || line.startsWith('[MOSSY]')) return 'text-emerald-400';
    if (line.startsWith('[WORKSHOP')) return 'text-amber-300';
    return 'text-slate-400';
  };

  const pluginInfo = selectedFile ? getPluginInfo(selectedFile.fileType) : null;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 overflow-hidden" onWheel={onWheel}>

      {/* ── Toolbar ── */}
      <div className="h-14 border-b border-black bg-[#2d2d2d] flex items-center px-3 gap-2 shadow-md z-10 flex-shrink-0">
        <button onClick={() => void pickAndBrowseDirectory()} className="p-1.5 hover:bg-slate-700 rounded transition-colors" title="Pick root directory">
          <Home className="w-4 h-4 text-slate-300" />
        </button>
        <button onClick={navigateUp} disabled={!currentPath} className="p-1.5 hover:bg-slate-700 rounded transition-colors disabled:opacity-40" title="Go up one level">
          <ChevronUp className="w-4 h-4 text-slate-300" />
        </button>

        <input
          value={currentPath}
          onChange={e => setCurrentPath(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void browseDirectory(currentPath); }}
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          placeholder="Paste directory path and press Enter…"
        />
        <button
          onClick={() => void pickAndBrowseDirectory()}
          disabled={loading}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
          title="Browse folder"
        >
          <Folder className="w-4 h-4 text-emerald-400" />
        </button>
        <button
          onClick={() => void browseDirectory()}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Browse'}
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Compiler path — persisted to localStorage */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 whitespace-nowrap">Compiler:</span>
          <input
            value={compilerPath}
            onChange={e => setCompilerPath(e.target.value)}
            className="w-44 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            placeholder="PapyrusCompiler.exe path…"
            title="Path to PapyrusCompiler.exe — saved automatically"
          />
        </div>

        <button
          onClick={() => void compileScript()}
          disabled={!selectedFile || selectedFile.fileType !== 'psc' || compiling}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors disabled:opacity-40"
        >
          {compiling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
          {compiling ? 'Compiling…' : 'Compile'}
        </button>

        <button
          onClick={() => void saveFile()}
          disabled={!selectedFile || !isDirty}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
            isDirty ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-slate-800 text-slate-500 disabled:opacity-40'
          }`}
          title={isDirty ? 'Save changes (unsaved)' : 'No unsaved changes'}
        >
          <Save className="w-3 h-3" />
          {isDirty ? 'Save*' : 'Save'}
        </button>

        <button
          onClick={() => setShowLineNumbers(p => !p)}
          className={`px-2 py-1.5 rounded text-[10px] transition-colors ${showLineNumbers ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-500'}`}
          title="Toggle line numbers"
        >
          #
        </button>

        <Link
          to="/reference"
          className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
        >
          Help
        </Link>
      </div>

      {/* ── Install/Verify panel ── */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="Workshop is a real file browser and Papyrus compiler front-end. Browse your mod workspace, open and edit .psc source files, compile them to .pex, and inspect NIF/DDS metadata — all without leaving Mossy."
          tools={[]}
          verify={[
            'Click Browse → confirm a file listing appears.',
            'Open a .psc file → confirm content loads with line numbers.',
            'Set compiler path → Compile → check console for SUCCESS or error output.',
          ]}
          firstTestLoop={[
            'Browse to your mod\'s Scripts/Source/ folder and open a .psc file.',
            'Edit a comment line, click Save* — console should say Saved.',
            'Click Compile with a valid PapyrusCompiler.exe path to test compilation.',
          ]}
          troubleshooting={[
            'Browse does nothing → app is running in web mode without Electron preload.',
            'Compiler fails → ensure path points to PapyrusCompiler.exe from the CK Data folder.',
            'Save* not shown → no edits detected; make a change first.',
          ]}
        />
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* File browser sidebar */}
        <div className="w-60 border-r border-black bg-[#252526] flex flex-col min-h-0">
          <div className="px-3 py-2 bg-[#333333] border-b border-black text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Files</span>
            <span className="text-slate-600">{fileTree.length > 0 ? `${fileTree.length} entries` : ''}</span>
          </div>
          <div ref={fileListScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden py-1">
            {fileTree.length === 0 ? (
              <div className="text-[11px] text-slate-600 p-3 text-center">Browse a directory to see files.</div>
            ) : (
              fileTree.map(entry => {
                const isFolder = entry.type?.toLowerCase() === 'folder';
                const isSelected = selectedFile?.path === entry.path;
                return (
                  <div
                    key={entry.path}
                    onClick={() => isFolder ? void browseDirectory(entry.path) : void openFile(entry)}
                    className={`flex items-center gap-2 py-1 px-2 cursor-pointer transition-colors text-xs font-mono truncate ${
                      isSelected ? 'bg-emerald-900/30 text-emerald-300' : 'text-slate-400 hover:bg-[#2d2d30] hover:text-slate-200'
                    }`}
                    title={entry.path}
                  >
                    {isFolder ? <Folder className="w-4 h-4 text-emerald-500 shrink-0" /> : renderFileIcon(entry.fileType)}
                    <span className="truncate">{entry.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Editor + info panel */}
        <div className="flex-1 min-h-0 flex flex-col bg-[#1e1e1e]">

          {selectedFile ? (
            <>
              {/* File tab bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-black text-xs flex-shrink-0">
                {renderFileIcon(selectedFile.fileType)}
                <span className="font-mono text-slate-300 font-semibold">{selectedFile.name}</span>
                {isDirty && <span className="text-amber-400 text-[10px] font-bold">● unsaved</span>}
                <span className="text-slate-600 text-[10px] truncate ml-1">{selectedFile.path}</span>
                <button
                  onClick={() => { const a = (window as any).electron?.api || (window as any).electronAPI; a?.revealInFolder?.(selectedFile.path); }}
                  className="ml-auto shrink-0 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Reveal in Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex overflow-hidden">

                {/* Plugin info notice — shown for esp/esm/esl/ba2 */}
                {pluginInfo ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                    <Info className="w-10 h-10 text-slate-600" />
                    <div>
                      <div className={`text-base font-black mb-1 ${pluginInfo.color}`}>{pluginInfo.label}</div>
                      <p className="text-sm text-slate-400 max-w-md leading-relaxed">{pluginInfo.notes}</p>
                    </div>
                    <div className="mt-2 p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-left max-w-md">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">File</div>
                        <button
                          onClick={() => { const a = (window as any).electron?.api || (window as any).electronAPI; a?.revealInFolder?.(selectedFile.path); }}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                          title="Reveal in Explorer"
                        >
                          <FolderOpen className="w-3 h-3" /> Reveal
                        </button>
                      </div>
                      <div className="font-mono text-xs text-slate-300">{selectedFile.path}</div>
                    </div>
                    {selectedFile.fileType === 'ba2' && (
                      <div className="p-3 bg-orange-900/20 border border-orange-700/40 rounded-lg text-xs text-orange-300 max-w-md">
                        Use <strong>Bethesda Archive Extractor (BAE)</strong> or <strong>Archive2.exe</strong> (from CK) to inspect or unpack BA2 contents.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Code editor — syntax highlight overlay + editable textarea */
                  <div className="flex-1 min-h-0 flex overflow-hidden font-mono text-sm">
                    {showLineNumbers && (
                      <div
                        className="select-none text-right text-slate-700 bg-[#1a1a1a] border-r border-slate-800 px-2 pt-4 text-xs leading-relaxed overflow-hidden flex-shrink-0"
                        style={{ minWidth: '3rem', userSelect: 'none', pointerEvents: 'none' }}
                        aria-hidden="true"
                      >
                        <pre className="leading-relaxed">{lineNumbers}</pre>
                      </div>
                    )}
                    {/* Overlay highlight editor:
                        The highlight div sits behind a transparent textarea.
                        Both share identical font/padding/scroll so they stay pixel-aligned. */}
                    <PapyrusEditor
                      value={fileContent}
                      isPsc={selectedFile.fileType === 'psc'}
                      onChange={v => { setFileContent(v); setIsDirty(true); }}
                    />
                  </div>
                )}

                {/* Info side panel */}
                <div className="w-64 border-l border-black bg-[#252526] flex flex-col overflow-y-auto flex-shrink-0">
                  {/* .psc — script dependencies */}
                  {selectedFile.fileType === 'psc' && (
                    <div className="p-3 space-y-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Script Info</div>
                      {scriptDeps ? (
                        <>
                          {scriptDeps.imports.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-slate-600 mb-1">Imports ({scriptDeps.imports.length})</div>
                              <div className="space-y-0.5">
                                {scriptDeps.imports.map(imp => (
                                  <div key={imp} className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono truncate">{imp}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {scriptDeps.references.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-slate-600 mb-1">References ({scriptDeps.references.length})</div>
                              <div className="space-y-0.5">
                                {scriptDeps.references.map(ref => (
                                  <div key={ref} className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-mono truncate">{ref}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-600">Loading dependencies…</div>
                      )}
                      {compileResult && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Compile</div>
                          <div className={`text-xs px-2 py-1.5 rounded font-bold ${compileResult.exitCode === 0 ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                            {compileResult.exitCode === 0 ? 'Success' : 'Failed'}
                          </div>
                        </div>
                      )}
                      {/* Line stats */}
                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-[10px] text-slate-600">Lines: <span className="text-slate-400">{lineCount}</span></div>
                        <div className="text-[10px] text-slate-600">Characters: <span className="text-slate-400">{fileContent.length.toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}

                  {/* .dds — texture info */}
                  {selectedFile.fileType === 'dds' && textureInfo && (
                    <div className="p-3 space-y-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Texture</div>
                      <div className="bg-slate-800 rounded p-2 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Dimensions</span><span className="text-emerald-300 font-bold">{textureInfo.width}×{textureInfo.height}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Format</span><span className="text-amber-300 font-mono">{textureInfo.format}</span></div>
                      </div>
                      <div className="text-[10px] text-slate-600 leading-relaxed">
                        BC7 = diffuse/complex · BC5 = normals · BC1 = single-channel. All must be power-of-two.
                      </div>
                    </div>
                  )}

                  {/* .nif — mesh info */}
                  {selectedFile.fileType === 'nif' && meshInfo && (
                    <div className="p-3 space-y-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mesh</div>
                      <div className="bg-slate-800 rounded p-2 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Vertices</span><span className="text-blue-300 font-bold">{meshInfo.vertices.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Triangles</span><span className="text-blue-300 font-bold">{meshInfo.triangles.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Materials</span><span className="text-slate-400">{meshInfo.materials.length}</span></div>
                      </div>
                      {meshInfo.materials.length > 0 && (
                        <div className="space-y-0.5">
                          {meshInfo.materials.map(mat => (
                            <div key={mat} className="text-[10px] text-slate-500 font-mono truncate" title={mat}>{mat}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generic text file stats */}
                  {!['psc', 'dds', 'nif', 'esp', 'esm', 'esl', 'ba2'].includes(selectedFile.fileType ?? '') && (
                    <div className="p-3 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">File Info</div>
                      <div className="text-[10px] text-slate-600">Lines: <span className="text-slate-400">{lineCount}</span></div>
                      <div className="text-[10px] text-slate-600">Chars: <span className="text-slate-400">{fileContent.length.toLocaleString()}</span></div>
                      <div className="text-[10px] text-slate-600">Type: <span className="text-slate-400">{selectedFile.fileType ?? 'unknown'}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-700">
              <div className="text-center">
                <FileCode className="w-14 h-14 mb-3 opacity-20 mx-auto" />
                <p className="text-sm">Browse a directory and open a file to begin.</p>
                <p className="text-xs mt-1 text-slate-800">Supports: .psc · .nif · .dds · .esp · .esm · .esl · .ba2 · .bgsm · .hkx · .fuz</p>
              </div>
            </div>
          )}

          {/* ── Console ── */}
          <div className="flex-shrink-0 border-t border-black bg-black" style={{ height: '140px' }}>
            <div className="flex items-center justify-between px-3 py-1 border-b border-slate-900">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Console</span>
              <button onClick={clearConsole} className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <div ref={consoleRef} className="overflow-y-auto px-3 py-1 font-mono text-[11px] h-[108px]">
              {consoleOutput.map((line, i) => (
                <div key={i} className={`leading-relaxed ${consoleLineClass(line)}`}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workshop;
