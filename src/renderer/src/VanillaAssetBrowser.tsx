import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen, Search, FileBox, Image, Music, FileCode, File,
  ChevronRight, ChevronDown, Copy, ExternalLink, Package,
  ArrowDownToLine, RefreshCw, X, AlertCircle, CheckCircle2, Layers,
  Filter, Clock, Settings
} from 'lucide-react';

// ============================================================================
// VanillaAssetBrowser — Browse unpacked FO4 base-game assets
// v1.0.0
// Users unpack all 44 FO4 BA2 archives to a Data/ folder on disk.
// This panel lets them browse, search, and copy any vanilla mesh/texture/
// material/audio to their own mod project for customization or replacement.
// ============================================================================

const getApi = () => (window as any).electron?.api as Record<string, any> | undefined;

type AssetKind = 'mesh' | 'texture' | 'material' | 'audio' | 'script' | 'other';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  kind?: AssetKind;
}

interface DirNode {
  path: string;
  name: string;
  expanded: boolean;
  children: DirNode[];
  loaded: boolean;
}

function assetKind(name: string): AssetKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'nif' || ext === 'btr' || ext === 'bto') return 'mesh';
  if (['dds', 'png', 'tga'].includes(ext)) return 'texture';
  if (['bgsm', 'bgem', 'mat'].includes(ext)) return 'material';
  if (['wav', 'xwm', 'fuz', 'lip'].includes(ext)) return 'audio';
  if (['pex', 'psc'].includes(ext)) return 'script';
  return 'other';
}

function KindIcon({ kind, className = 'w-4 h-4' }: { kind: AssetKind; className?: string }) {
  switch (kind) {
    case 'mesh':     return <FileBox className={className} />;
    case 'texture':  return <Image className={className} />;
    case 'material': return <Layers className={className} />;
    case 'audio':    return <Music className={className} />;
    case 'script':   return <FileCode className={className} />;
    default:         return <File className={className} />;
  }
}

const KIND_COLORS: Record<AssetKind, string> = {
  mesh:     'text-blue-400',
  texture:  'text-purple-400',
  material: 'text-amber-400',
  audio:    'text-green-400',
  script:   'text-rose-400',
  other:    'text-slate-400',
};

const KIND_LABELS: Record<AssetKind, string> = {
  mesh:     'Mesh (NIF)',
  texture:  'Texture (DDS)',
  material: 'Material (BGSM)',
  audio:    'Audio (WAV/XWM)',
  script:   'Script (PEX)',
  other:    'Other',
};

const KNOWN_ROOTS = [
  { sub: 'Meshes' },
  { sub: 'Textures' },
  { sub: 'Materials' },
  { sub: 'Sound' },
  { sub: 'Scripts' },
];

function parseBgsmTextures(raw: string): string[] {
  const matches = raw.match(/[A-Za-z0-9_\\/]+\.dds/gi) ?? [];
  return [...new Set(matches)];
}

function parseNifTextures(raw: string): string[] {
  // eslint-disable-next-line no-control-regex
  const matches = raw.match(/textures[/\\][^\x00"<>|?*\r\n]{3,200}\.dds/gi) ?? [];
  return [...new Set(matches)];
}

const STORAGE_ROOT   = 'mossy_vanilla_vault_root';
const STORAGE_RECENT = 'mossy_vanilla_vault_recent';
const MAX_RECENT = 12;

export const VanillaAssetBrowser: React.FC = () => {
  const [vaultRoot, setVaultRoot]       = useState<string>(() => localStorage.getItem(STORAGE_ROOT) ?? '');
  const [sideTree, setSideTree]         = useState<DirNode[]>([]);
  const [activeDirPath, setActiveDirPath] = useState('');
  const [dirFiles, setDirFiles]         = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [kindFilter, setKindFilter]     = useState<AssetKind | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileTextures, setFileTextures] = useState<string[]>([]);
  const [loading, setLoading]           = useState(false);
  const [copying, setCopying]           = useState(false);
  const [copyStatus, setCopyStatus]     = useState<'idle' | 'ok' | 'err'>('idle');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem(STORAGE_ROOT));
  const [recentAssets, setRecentAssets] = useState<FileNode[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_RECENT) ?? '[]'); } catch { return []; }
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(recentAssets.slice(0, MAX_RECENT)));
  }, [recentAssets]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (!vaultRoot) return;
    const roots: DirNode[] = KNOWN_ROOTS.map(({ sub }) => ({
      name: sub,
      path: vaultRoot + '\\' + sub,
      expanded: false,
      children: [],
      loaded: false,
    }));
    setSideTree(roots);
    setActiveDirPath('');
    setDirFiles([]);
    setSelectedFile(null);
  }, [vaultRoot]);

  const pickRoot = async () => {
    const a = getApi();
    if (!a?.pickDirectory) return;
    const dir: string = await a.pickDirectory('Select unpacked FO4 Data folder');
    if (!dir) return;
    setVaultRoot(dir);
    localStorage.setItem(STORAGE_ROOT, dir);
    setShowSettings(false);
  };

  const loadDir = useCallback(async (dirPath: string) => {
    setLoading(true);
    setActiveDirPath(dirPath);
    setSelectedFile(null);
    setFileTextures([]);
    try {
      const a = getApi();
      const entries: FileNode[] = a?.browseDirectory ? await a.browseDirectory(dirPath) : [];
      const files = entries
        .filter((e) => e.type === 'file')
        .map((e) => ({ ...e, kind: assetKind(e.name) }));
      setDirFiles(files);
    } catch {
      setDirFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleNode = useCallback(async (node: DirNode) => {
    const toggle = async (nodes: DirNode[]): Promise<DirNode[]> => {
      const result: DirNode[] = [];
      for (const n of nodes) {
        if (n.path !== node.path) {
          result.push({ ...n, children: await toggle(n.children) });
          continue;
        }
        if (!n.expanded && !n.loaded) {
          try {
            const a = getApi();
            const entries: FileNode[] = a?.browseDirectory ? await a.browseDirectory(n.path) : [];
            const childDirs = entries
              .filter((e) => e.type === 'folder')
              .map((e): DirNode => ({ name: e.name, path: e.path, expanded: false, children: [], loaded: false }));
            result.push({ ...n, expanded: true, loaded: true, children: childDirs });
          } catch {
            result.push({ ...n, expanded: true, loaded: true, children: [] });
          }
        } else {
          result.push({ ...n, expanded: !n.expanded });
        }
      }
      return result;
    };
    setSideTree(await toggle(sideTree));
  }, [sideTree]);

  const selectFile = useCallback(async (file: FileNode) => {
    setSelectedFile(file);
    setFileTextures([]);
    setCopyStatus('idle');
    setRecentAssets((prev) => {
      const filtered = prev.filter((r) => r.path !== file.path);
      return [file, ...filtered].slice(0, MAX_RECENT);
    });
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'nif' || ext === 'bgsm' || ext === 'bgem') {
      try {
        const a = getApi();
        if (!a?.readFile) return;
        const raw: string = await a.readFile(file.path);
        const textures = ext === 'nif' ? parseNifTextures(raw) : parseBgsmTextures(raw);
        setFileTextures(textures);
      } catch { /* binary read may fail */ }
    }
  }, []);

  // PowerShell single-quoted strings escape an embedded ' by doubling it — without this,
  // any file/folder name containing a quote (a legal Windows filename character) breaks
  // out of the quoted literal, and could inject arbitrary PowerShell commands.
  const psQuote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

  const copyToFolder = useCallback(async () => {
    if (!selectedFile) return;
    const a = getApi();
    if (!a?.pickDirectory || !a?.runTool) return;
    const dest: string = await a.pickDirectory('Select target folder in your mod project');
    if (!dest) return;
    setCopying(true);
    setCopyStatus('idle');
    try {
      const result = await a.runTool({
        cmd: 'powershell',
        args: ['-NoProfile', '-Command',
          `Copy-Item -Path ${psQuote(selectedFile.path)} -Destination ${psQuote(dest + '\\' + selectedFile.name)} -Force`],
      });
      setCopyStatus(result.exitCode === 0 ? 'ok' : 'err');
      if (result.exitCode === 0) setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('err');
    } finally {
      setCopying(false);
    }
  }, [selectedFile]);

  const copyMirrored = useCallback(async () => {
    if (!selectedFile || !vaultRoot) return;
    const a = getApi();
    if (!a?.pickDirectory || !a?.runTool) return;
    const modRoot: string = await a.pickDirectory('Select your mod project root');
    if (!modRoot) return;
    const rel = selectedFile.path.replace(vaultRoot, '').replace(/^[/\\]+/, '');
    const destPath = modRoot + '\\' + rel;
    const destDir = destPath.substring(0, destPath.lastIndexOf('\\'));
    setCopying(true);
    setCopyStatus('idle');
    try {
      const result = await a.runTool({
        cmd: 'powershell',
        args: ['-NoProfile', '-Command',
          `New-Item -ItemType Directory -Force -Path ${psQuote(destDir)} | Out-Null; Copy-Item -Path ${psQuote(selectedFile.path)} -Destination ${psQuote(destPath)} -Force`],
      });
      setCopyStatus(result.exitCode === 0 ? 'ok' : 'err');
      if (result.exitCode === 0) setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('err');
    } finally {
      setCopying(false);
    }
  }, [selectedFile, vaultRoot]);

  const reveal = useCallback(() => {
    if (!selectedFile) return;
    getApi()?.revealInFolder?.(selectedFile.path);
  }, [selectedFile]);

  const filteredFiles = dirFiles.filter((f) => {
    if (kindFilter !== 'all' && f.kind !== kindFilter) return false;
    if (searchQuery) return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const renderTree = (nodes: DirNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={async () => { await toggleNode(node); await loadDir(node.path); }}
          className={
            'flex items-center gap-1.5 w-full text-left py-1 rounded text-xs transition-colors ' +
            (activeDirPath === node.path
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60')
          }
          style={{ paddingLeft: (8 + depth * 14) + 'px' }}
        >
          {node.expanded
            ? <ChevronDown className="w-3 h-3 shrink-0" />
            : <ChevronRight className="w-3 h-3 shrink-0" />}
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
          <span className="truncate">{node.name}</span>
        </button>
        {node.expanded && node.children.length > 0 && (
          <div>{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));

  if (!vaultRoot || showSettings) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 text-center px-8">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
          <Package className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-white mb-1">Vanilla Asset Vault</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Browse the full unpacked FO4 asset library. Find any base-game mesh, texture, or material
            and copy it directly into your mod project for customization or replacement.
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-left max-w-lg w-full">
          <p className="text-xs font-semibold text-slate-300 mb-3">One-time setup</p>
          <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
            <li>Download <span className="text-white font-mono">Bethesda Archive Extractor (BAE)</span> from Nexus Mods</li>
            <li>Open BAE, load each <span className="font-mono text-white">.ba2</span> from your FO4 <span className="font-mono text-emerald-400">Data\</span> folder</li>
            <li>Extract all archives to a single folder, e.g. <span className="font-mono text-emerald-400">D:\FO4_Unpacked\Data</span></li>
            <li>Click <span className="text-white font-semibold">Set Vault Root</span> and select that Data folder</li>
          </ol>
          <p className="text-xs text-slate-500 mt-3">~15 GB unpacked. Done once, used forever.</p>
        </div>
        <button
          onClick={pickRoot}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          Set Vault Root
        </button>
        {vaultRoot && (
          <button onClick={() => setShowSettings(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-800/60 bg-slate-900/40">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files...  ( / )"
            className="w-full pl-7 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        {(['all', 'mesh', 'texture', 'material', 'audio', 'script'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={
              'px-2 py-1 rounded text-[10px] font-semibold transition-colors ' +
              (kindFilter === k
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-500 hover:text-white hover:bg-slate-800')
            }
          >
            {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-600 font-mono truncate max-w-[180px] hidden lg:block">{vaultRoot}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
            title="Change vault root"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-44 shrink-0 border-r border-slate-800/60 overflow-y-auto py-2 bg-slate-900/20">
          <p className="text-[9px] font-bold text-slate-600 px-3 pb-1 uppercase tracking-widest">Vault Folders</p>
          {sideTree.length === 0
            ? <p className="text-xs text-slate-600 px-3">No folders found</p>
            : renderTree(sideTree)}
          {recentAssets.length > 0 && (
            <>
              <p className="text-[9px] font-bold text-slate-600 px-3 pt-4 pb-1 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Recent
              </p>
              {recentAssets.slice(0, 6).map((r) => (
                <button
                  key={r.path}
                  onClick={() => selectFile(r)}
                  className={
                    'flex items-center gap-1.5 w-full text-left px-3 py-1 text-[10px] transition-colors truncate ' +
                    (selectedFile?.path === r.path ? 'text-emerald-300' : 'text-slate-500 hover:text-white hover:bg-slate-800/40')
                  }
                >
                  <span className={KIND_COLORS[r.kind ?? 'other']}>
                    <KindIcon kind={r.kind ?? 'other'} className="w-3 h-3" />
                  </span>
                  <span className="truncate">{r.name}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* File list */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-slate-800/60">
          {!activeDirPath && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <FolderOpen className="w-10 h-10 text-slate-700" />
              <p className="text-sm text-slate-500">Select a folder from the sidebar</p>
              <p className="text-xs text-slate-600">Browse Meshes, Textures, Materials, Sound, or Scripts</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          )}
          {!loading && activeDirPath && filteredFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-5 h-5 text-slate-600" />
              <p className="text-xs text-slate-500">No files match</p>
            </div>
          )}
          {!loading && filteredFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => selectFile(file)}
              className={
                'flex items-center gap-2 w-full text-left px-3 py-2 border-b border-slate-800/40 transition-colors ' +
                (selectedFile?.path === file.path
                  ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                  : 'hover:bg-slate-800/50')
              }
            >
              <span className={KIND_COLORS[file.kind ?? 'other']}>
                <KindIcon kind={file.kind ?? 'other'} />
              </span>
              <span className="text-xs text-slate-200 truncate flex-1">{file.name}</span>
              <span className="text-[9px] text-slate-600 shrink-0">
                {file.name.split('.').pop()?.toUpperCase()}
              </span>
            </button>
          ))}
          {!loading && activeDirPath && dirFiles.length > 0 && (
            <p className="text-[10px] text-slate-600 px-3 py-2">
              {filteredFiles.length} / {dirFiles.length} files
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-72 shrink-0 overflow-y-auto p-4 bg-slate-900/30">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <File className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-500">Select an asset to see details and copy options</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <span className={'mt-0.5 ' + KIND_COLORS[selectedFile.kind ?? 'other']}>
                  <KindIcon kind={selectedFile.kind ?? 'other'} className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white break-all">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{KIND_LABELS[selectedFile.kind ?? 'other']}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Full Path</p>
                <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-800/50 rounded px-2 py-1.5 select-all">
                  {selectedFile.path}
                </p>
              </div>

              {vaultRoot && (
                <div>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Relative Path</p>
                  <p className="text-[10px] text-slate-400 font-mono break-all bg-slate-800/50 rounded px-2 py-1.5 select-all">
                    {selectedFile.path.replace(vaultRoot, '').replace(/^[/\\]+/, '')}
                  </p>
                </div>
              )}

              {fileTextures.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                    Referenced Textures ({fileTextures.length})
                  </p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {fileTextures.map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-800/40 rounded px-2 py-1">
                        <Image className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-[9px] text-slate-300 font-mono break-all">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Actions</p>
                <button
                  onClick={copyToFolder}
                  disabled={copying}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to Folder...
                </button>
                <button
                  onClick={copyMirrored}
                  disabled={copying}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Copy (mirror path) to Mod Root...
                </button>
                <button
                  onClick={reveal}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Reveal in Explorer
                </button>
                {copyStatus === 'ok' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Copied successfully
                  </div>
                )}
                {copyStatus === 'err' && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4" /> Copy failed
                  </div>
                )}
              </div>

              {selectedFile.kind === 'mesh' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
                  <p className="font-semibold mb-1">Using this mesh</p>
                  <p className="text-blue-400/80">
                    Keep the same relative path inside your mod's Meshes\ folder. Reference it in xEdit or the CK.
                    Open in NifSkope to swap materials or re-rig geometry.
                  </p>
                </div>
              )}
              {selectedFile.kind === 'texture' && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-300">
                  <p className="font-semibold mb-1">Using this texture</p>
                  <p className="text-purple-400/80">
                    Keep the same relative path inside your mod's Textures\ folder. Edit in Photoshop/GIMP with
                    the DDS plugin, then re-export as BC7 (color) or BC5 (normal map).
                  </p>
                </div>
              )}
              {selectedFile.kind === 'material' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                  <p className="font-semibold mb-1">Using this material</p>
                  <p className="text-amber-400/80">
                    Keep the same relative path inside Materials\. Open with BSMaterialEditor or edit
                    as text. Update texture paths to point to your custom DDS files.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VanillaAssetBrowser;
