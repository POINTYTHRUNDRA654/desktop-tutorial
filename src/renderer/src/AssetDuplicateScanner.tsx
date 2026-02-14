import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  FolderOpen,
  Zap,
  Eye,
  Settings,
  TrendingDown,
  HardDrive,
  FileText,
  Copy,
  X,
  RefreshCw
} from 'lucide-react';

// Types
interface DuplicateFile {
  path: string;
  name: string;
  size: number;
  hash: string;
  modName: string;
  lastModified: Date;
}

interface DuplicateGroup {
  hash: string;
  files: DuplicateFile[];
  totalSize: number;
  vramWaste: number;
  fileType: 'texture' | 'mesh' | 'other';
  recommended?: DuplicateFile; // Which one to keep
}

interface ScanResult {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  totalWastedSpace: number;
  totalVramWaste: number;
  scannedFiles: number;
  scannedFolders: number;
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

const AssetDuplicateScanner: React.FC = () => {
  // State
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [scanPath, setScanPath] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const contentRef = useRef<HTMLDivElement>(null);

  // API
  const api = (window as any).electron?.api || (window as any).electronAPI;

  // Effects
  useEffect(() => {
    loadLastScanPath();
  }, []);

  // Methods
  const loadLastScanPath = async () => {
    try {
      if (api?.assetScanner?.getLastScanPath) {
        const path = await api.assetScanner.getLastScanPath();
        if (path) setScanPath(path);
      }
    } catch (error) {
      console.error('Failed to load last scan path:', error);
    }
  };

  const browseFolderClick = async () => {
    try {
      if (api?.assetScanner?.browseFolder) {
        const selectedPath = await api.assetScanner.browseFolder();
        if (selectedPath) {
          setScanPath(selectedPath);
        }
      } else {
        showMessage('error', 'Folder browser not available');
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
      showMessage('error', 'Failed to open folder browser');
    }
  };

  const startScan = async () => {
    if (!scanPath) {
      showMessage('error', 'Please select a folder to scan');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing scan...');
    setScanResult(null);

    try {
      if (api?.assetScanner?.scanForDuplicates) {
        // Listen for progress updates
        const progressHandler = (_event: any, progress: any) => {
          setScanProgress(progress.percent);
          setScanStatus(progress.status);
        };

        if (api.assetScanner.onScanProgress) {
          api.assetScanner.onScanProgress(progressHandler);
        }

        // Start scan
        const result = await api.assetScanner.scanForDuplicates(scanPath);
        setScanResult(result);
        
        if (result.totalDuplicates === 0) {
          showMessage('success', 'No duplicates found! Your mod collection is clean.');
        } else {
          showMessage('info', `Found ${result.totalDuplicates} duplicate files wasting ${formatBytes(result.totalWastedSpace)}`);
        }
      } else {
        showMessage('error', 'Asset scanner API not available');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      showMessage('error', 'Scan failed. Please check the path and try again.');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  const handleQuickFix = async () => {
    if (!scanResult || scanResult.groups.length === 0) return;

    // Select all groups for cleanup
    const allHashes = new Set(scanResult.groups.map(g => g.hash));
    setSelectedGroups(allHashes);

    // Process cleanup
    await processCleanup(allHashes);
  };

  const processCleanup = async (groupHashes: Set<string>) => {
    if (!scanResult) return;

    setIsProcessing(true);
    try {
      const groupsToClean = scanResult.groups.filter(g => groupHashes.has(g.hash));
      const filesToRemove: string[] = [];

      // For each group, remove all files except the recommended one
      groupsToClean.forEach(group => {
        const keepFile = group.recommended || group.files[0];
        group.files.forEach(file => {
          if (file.path !== keepFile.path) {
            filesToRemove.push(file.path);
          }
        });
      });

      if (api?.assetScanner?.cleanupDuplicates) {
        const result = await api.assetScanner.cleanupDuplicates(filesToRemove);
        if (result.success) {
          showMessage('success', `Removed ${result.removedCount} duplicate files. Backups created.`);
          // Re-scan to update results
          await startScan();
        } else {
          showMessage('error', `Cleanup failed: ${result.error}`);
        }
      } else {
        showMessage('error', 'Cleanup API not available');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      showMessage('error', 'Cleanup failed. Check logs for details.');
    } finally {
      setIsProcessing(false);
      setSelectedGroups(new Set());
    }
  };

  const toggleGroupSelection = (hash: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(hash)) {
      newSelection.delete(hash);
    } else {
      newSelection.add(hash);
    }
    setSelectedGroups(newSelection);
  };

  const toggleGroupExpanded = (hash: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(hash)) {
      newExpanded.delete(hash);
    } else {
      newExpanded.add(hash);
    }
    setExpandedGroups(newExpanded);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Render helpers
  const renderBeginnerMode = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      {scanResult && (
        <div className="bg-gradient-to-br from-green-900/20 to-slate-900/40 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">
                {scanResult.totalDuplicates === 0 ? '✨ All Clean!' : '🎯 Optimization Available'}
              </h3>
              {scanResult.totalDuplicates > 0 && (
                <>
                  <p className="text-slate-300 text-lg mb-4">
                    Free up <span className="text-green-400 font-bold">{formatBytes(scanResult.totalWastedSpace)}</span> of disk space
                    and <span className="text-green-400 font-bold">{formatBytes(scanResult.totalVramWaste)}</span> of VRAM
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{scanResult.totalDuplicates} duplicate files found across {scanResult.groups.length} groups</span>
                  </div>
                </>
              )}
            </div>
            {scanResult.totalDuplicates > 0 && (
              <button
                onClick={handleQuickFix}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {isProcessing ? 'Fixing...' : 'Quick Fix'}
              </button>
            )}
          </div>

          {scanResult.totalDuplicates > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Disk Space Waste</div>
                <div className="text-2xl font-bold text-red-400">{formatBytes(scanResult.totalWastedSpace)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">VRAM Waste</div>
                <div className="text-2xl font-bold text-yellow-400">{formatBytes(scanResult.totalVramWaste)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Duplicate Files</div>
                <div className="text-2xl font-bold text-blue-400">{scanResult.totalDuplicates}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900/40 rounded-lg p-6 border border-slate-700">
        <h4 className="text-lg font-semibold text-green-400 mb-3">What does this do?</h4>
        <ul className="space-y-2 text-slate-300">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Finds duplicate textures and meshes across all your mods</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Keeps the highest quality version automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Creates backups before removing anything</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Improves game performance and load times</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderIntermediateMode = () => (
    <div className="space-y-4">
      {scanResult && scanResult.groups.length > 0 && (
        <>
          {/* Action Bar */}
          <div className="flex items-center justify-between bg-slate-900/40 rounded-lg p-4 border border-slate-700">
            <div className="text-slate-300">
              <span className="font-semibold">{selectedGroups.size}</span> of <span className="font-semibold">{scanResult.groups.length}</span> groups selected
            </div>
            <button
              onClick={() => processCleanup(selectedGroups)}
              disabled={selectedGroups.size === 0 || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {isProcessing ? 'Removing...' : `Remove Selected (${selectedGroups.size})`}
            </button>
          </div>

          {/* Duplicate Groups */}
          <div className="space-y-3">
            {scanResult.groups.map(group => (
              <div
                key={group.hash}
                className="bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden"
              >
                {/* Group Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(group.hash)}
                      onChange={() => toggleGroupSelection(group.hash)}
                      className="w-5 h-5 rounded border-slate-600 text-green-500 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-200">{group.files[0].name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {group.fileType}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        {group.files.length} copies • Waste: {formatBytes(group.totalSize - group.files[0].size)} disk, {formatBytes(group.vramWaste)} VRAM
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleGroupExpanded(group.hash)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className={`w-5 h-5 text-slate-400 transition-transform ${expandedGroups.has(group.hash) ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded File List */}
                {expandedGroups.has(group.hash) && (
                  <div className="border-t border-slate-700 bg-slate-950/50">
                    {group.files.map((file, idx) => (
                      <div
                        key={file.path}
                        className={`p-3 flex items-center justify-between ${idx !== group.files.length - 1 ? 'border-b border-slate-800' : ''}`}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-mono text-slate-300 truncate">{file.path}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Mod: {file.modName} • Size: {formatBytes(file.size)}
                          </div>
                        </div>
                        {group.recommended?.path === file.path && (
                          <div className="ml-4 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ Keep
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {scanResult && scanResult.groups.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg">No duplicates found!</p>
          <p className="text-sm mt-2">Your mod collection is already optimized.</p>
        </div>
      )}
    </div>
  );

  const renderAdvancedMode = () => (
    <div className="space-y-4">
      {/* Hash Analysis */}
      {scanResult && (
        <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700">
          <h4 className="text-sm font-semibold text-green-400 mb-3">Hash Analysis</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Algorithm</div>
              <div className="text-slate-200 font-mono">MD5</div>
            </div>
            <div>
              <div className="text-slate-500">Unique Hashes</div>
              <div className="text-slate-200 font-mono">{scanResult.groups.length}</div>
            </div>
            <div>
              <div className="text-slate-500">Files Scanned</div>
              <div className="text-slate-200 font-mono">{scanResult.scannedFiles}</div>
            </div>
            <div>
              <div className="text-slate-500">Folders Scanned</div>
              <div className="text-slate-200 font-mono">{scanResult.scannedFolders}</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Groups (same as intermediate) */}
      {renderIntermediateMode()}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/10 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6" ref={contentRef}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Asset Duplicate Scanner
          </h1>
          <p className="text-slate-400">Find and remove duplicate textures and meshes to improve performance</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
            message.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
            'bg-blue-500/20 border border-blue-500/50 text-blue-300'
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Skill Level Selector */}
        <div className="mb-6 flex items-center gap-4">
          <span className="text-slate-400">Experience Level:</span>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setSkillLevel(level)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  skillLevel === level
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Controls */}
        <div className="bg-slate-900/60 rounded-lg p-6 border border-slate-700 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Mod Folder Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  placeholder="C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-green-500"
                  disabled={isScanning}
                />
                <button
                  onClick={browseFolderClick}
                  disabled={isScanning}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>
            <div className="pt-6">
              <button
                onClick={startScan}
                disabled={isScanning || !scanPath}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Start Scan
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scan Progress */}
          {isScanning && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>{scanStatus}</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {scanResult && (
          <div className="bg-slate-900/60 rounded-lg p-6 border border-slate-700">
            {skillLevel === 'beginner' && renderBeginnerMode()}
            {skillLevel === 'intermediate' && renderIntermediateMode()}
            {skillLevel === 'advanced' && renderAdvancedMode()}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDuplicateScanner;
