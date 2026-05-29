import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  RefreshCw,
  Folder
} from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

// Combined types from both scanners
interface DuplicateFile {
  path: string;
  name?: string;
  size: number;
  hash?: string;
  modName?: string;
  lastModified?: Date;
}

interface DuplicateGroup {
  hash: string;
  files: (DuplicateFile | string)[]; // Support both file objects and paths
  size?: number;
  totalSize?: number;
  vramWaste?: number;
  fileType?: 'texture' | 'mesh' | 'other';
  recommended?: DuplicateFile;
}

interface ScanResult {
  groups: DuplicateGroup[];
  scanId?: string;
  totalDuplicates?: number;
  totalWastedSpace?: number;
  totalVramWaste?: number;
  scannedFiles?: number;
  scannedFolders?: number;
  pendingTools?: string[];
}

interface Progress {
  stage: string;
  message?: string;
  current?: number;
  total?: number;
  scanId?: string;
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

const humanBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** idx;
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const defaultExtensions = ['.dds', '.nif', '.png', '.tga', '.jpg', '.jpeg', '.glb', '.fbx', '.obj', '.dae'];

/**
 * AssetDeduplicator - Unified duplicate file detection tool
 * Combines functionality from AssetDuplicateScanner and DuplicateFinder
 */
export const AssetDeduplicator: React.FC = () => {
  // API
  const api = (window as any).electron?.api || (window as any).electronAPI;

  // State - Scan configuration
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [extensions, setExtensions] = useState<string[]>(defaultExtensions);
  const [minSizeBytes, setMinSizeBytes] = useState<number>(1);

  // State - Scanning
  const [scanId, setScanId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // State - UI
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInstallRecovery, setShowInstallRecovery] = useState(false);
  const [toolsNeedingSetup, setToolsNeedingSetup] = useState<string[]>([]);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const listenerRef = useRef<(() => void) | null>(null);
  const scanIdRef = useRef<string | null>(null);

  // Effects
  // Load on mount
  useEffect(() => {
    loadLastScanPath();
  }, []);

  // Effect: Maintain progress listener even when component unmounts/remounts
  // This prevents the scan from being cancelled when navigating away
  useEffect(() => {
    // Clean up old listener if it exists
    if (listenerRef.current) {
      listenerRef.current();
    }

    // Set up progress listener (modern API)
    let unsubscribe: (() => void) | null = null;

    if (api?.onDedupeProgress) {
      const progressHandler = (p: Progress) => {
        if (!p) return;

        // Adopt scanId from progress if we don't have one yet
        if (!scanIdRef.current && p.scanId) {
          setScanId(p.scanId);
          scanIdRef.current = p.scanId;
        }

        // Ignore unrelated scan events
        if (scanIdRef.current && p.scanId && p.scanId !== scanIdRef.current) return;

        setProgress(p);

        // Save state to persistent storage so we can recover if user navigates away
        if (api?.savePanelData) {
          api.savePanelData('assetDeduplicator', {
            isScanning: p.stage !== 'done' && p.stage !== 'canceled' && p.stage !== 'error',
            scanId: scanIdRef.current,
            progress: p,
            scanPaths,
            extensions,
            minSizeBytes,
          }).catch(() => {/* silent fail */ });
        }

        if (p.stage === 'done' || p.stage === 'canceled' || p.stage === 'error') {
          setIsScanning(false);
        }

        if (p.stage === 'error' && p.message) {
          setError(p.message);
        }
      };

      // Register listener and get unsubscribe function if API supports it
      const result = api.onDedupeProgress(progressHandler);
      if (typeof result === 'function') {
        unsubscribe = result;
      }
    }

    listenerRef.current = unsubscribe || (() => { }); // Always have a cleanup function

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [api, scanPaths, extensions, minSizeBytes]);

  // Check for pending installations after scan completes
  useEffect(() => {
    if (scanResult && !isScanning) {
      // Check if any tools from the asset scan need installation
      // This would be populated by the backend when scan detects missing dependencies
      if (scanResult.pendingTools && scanResult.pendingTools.length > 0) {
        setToolsNeedingSetup(scanResult.pendingTools);
        setShowInstallRecovery(true);

        // Save to persistent storage
        if (api?.savePanelData) {
          api.savePanelData('assetDeduplicator', {
            scanResult,
            toolsNeedingSetup: scanResult.pendingTools,
          });
        }
      }
    }
  }, [scanResult, isScanning, api]);

  // Computed values
  const totalGroups = scanResult?.groups?.length ?? 0;

  const totalDuplicateFiles = useMemo(() => {
    const groups = scanResult?.groups ?? [];
    return groups.reduce((sum, g) => sum + Math.max(0, g.files.length - 1), 0);
  }, [scanResult]);

  const estimatedSavings = useMemo(() => {
    const groups = scanResult?.groups ?? [];
    return groups.reduce((sum, g) => {
      const size = g.size || g.totalSize || 0;
      return sum + size * Math.max(0, g.files.length - 1);
    }, 0);
  }, [scanResult]);

  // Methods
  const loadLastScanPath = async () => {
    try {
      if (api?.assetScanner?.getLastScanPath) {
        const path = await api.assetScanner.getLastScanPath();
        if (path) setScanPaths([path]);
      }
    } catch (error) {
      console.debug('[AssetScanner] getLastScanPath handler not registered — skipping');
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const browseFoldersClick = async () => {
    try {
      // Try modern API first
      if (api?.pickDedupeFolders) {
        const picked: string[] = await api.pickDedupeFolders();
        if (picked?.length) {
          setScanPaths(picked);
          return;
        }
      }

      // Fallback to legacy API
      if (api?.assetScanner?.browseFolder) {
        const selectedPath = await api.assetScanner.browseFolder();
        if (selectedPath) {
          setScanPaths([selectedPath]);
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
    if (scanPaths.length === 0) {
      showMessage('error', 'Please select at least one folder to scan');
      return;
    }

    setError(null);
    setScanResult(null);
    setProgress(null);
    setExpandedGroups(new Set());
    setSelectedGroups(new Set());
    setScanId(null);
    setIsScanning(true);

    try {
      // Try modern dedupe API first
      if (api?.dedupeScan) {
        const result: ScanResult = await api.dedupeScan({
          roots: scanPaths,
          extensions,
          minSize: minSizeBytes,
        });

        setScanId(result.scanId || null);
        setScanResult(result);
        setIsScanning(false);

        if (result.groups.length === 0) {
          showMessage('success', 'No duplicates found! Your mod collection is clean.');
        } else {
          const savings = estimatedSavings || result.totalWastedSpace || 0;
          showMessage('info', `Found ${result.groups.length} duplicate groups. Potential savings: ${humanBytes(savings)}`);
        }
      }
      // Fallback to legacy scanner API
      else if (api?.assetScanner?.scanForDuplicates) {
        const result = await api.assetScanner.scanForDuplicates(scanPaths[0]);

        setScanResult(result);
        setIsScanning(false);

        if (result.totalDuplicates === 0) {
          showMessage('success', 'No duplicates found! Your mod collection is clean.');
        } else {
          showMessage('info', `Found ${result.totalDuplicates} duplicate files wasting ${humanBytes(result.totalWastedSpace || 0)}`);
        }
      } else {
        showMessage('error', 'Duplicate scan API not available');
        setIsScanning(false);
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(String(err?.message || err));
      setIsScanning(false);
    }
  };

  const cancelScan = async () => {
    if (!api?.dedupeCancel || !scanId) return;
    try {
      await api.dedupeCancel(scanId);
      setIsScanning(false);
    } catch (err: any) {
      console.error('Cancel failed:', err);
    }
  };

  const toggleGroup = (hash: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(hash)) {
      newExpanded.delete(hash);
    } else {
      newExpanded.add(hash);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSelect = (hash: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(hash)) {
      newSelected.delete(hash);
    } else {
      newSelected.add(hash);
    }
    setSelectedGroups(newSelected);
  };

  const selectAll = () => {
    const allHashes = new Set(scanResult?.groups.map(g => g.hash) || []);
    setSelectedGroups(allHashes);
  };

  const deselectAll = () => {
    setSelectedGroups(new Set());
  };

  const revealFile = async (filePath: string) => {
    try {
      if (api?.revealInFolder) {
        await api.revealInFolder(filePath);
      } else if (api?.assetScanner?.openFileLocation) {
        await api.assetScanner.openFileLocation(filePath);
      }
    } catch (error) {
      console.error('Failed to reveal file:', error);
      showMessage('error', 'Failed to open file location');
    }
  };

  const deleteSelected = async () => {
    if (selectedGroups.size === 0) {
      showMessage('info', 'No groups selected');
      return;
    }

    const confirmed = await window.electronAPI?.showConfirm?.(
      `Delete ${selectedGroups.size} duplicate group(s)?`,
      'This will move files to the Recycle Bin.'
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      const filesToDelete: string[] = [];
      const groups = scanResult?.groups || [];

      groups.forEach(group => {
        if (selectedGroups.has(group.hash)) {
          // Keep first file, delete the rest
          const files = group.files.slice(1);
          files.forEach(file => {
            const path = typeof file === 'string' ? file : file.path;
            if (path) filesToDelete.push(path);
          });
        }
      });

      if (api?.trashFiles) {
        const results = await api.trashFiles(filesToDelete);
        const successCount = results.filter((r: any) => r.ok).length;
        showMessage('success', `Moved ${successCount} files to trash`);
      } else if (api?.assetScanner?.deleteFiles) {
        await api.assetScanner.deleteFiles(filesToDelete);
        showMessage('success', `Deleted ${filesToDelete.length} files`);
      }

      // Refresh scan after deletion
      await startScan();
    } catch (error) {
      console.error('Delete failed:', error);
      showMessage('error', 'Failed to delete files');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render helpers
  const renderFile = (file: DuplicateFile | string, index: number) => {
    const filePath = typeof file === 'string' ? file : file.path;
    const fileName = typeof file === 'string' ? filePath.split(/[/\\]/).pop() : (file.name || filePath.split(/[/\\]/).pop());
    const fileSize = typeof file === 'string' ? 0 : file.size;

    return (
      <div key={index} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded text-xs">
        <div className="flex-1 min-w-0">
          <div className="truncate text-slate-200">{fileName}</div>
          <div className="truncate text-slate-500 text-[10px]">{filePath}</div>
        </div>
        {fileSize > 0 && (
          <div className="text-slate-400 ml-2">{humanBytes(fileSize)}</div>
        )}
        <button
          onClick={() => revealFile(filePath)}
          className="ml-2 p-1 hover:bg-slate-700 rounded"
          title="Show in folder"
        >
          <Eye className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  };

  const renderGroup = (group: DuplicateGroup) => {
    const isExpanded = expandedGroups.has(group.hash);
    const isSelected = selectedGroups.has(group.hash);
    const size = group.size || group.totalSize || 0;
    const wastedSpace = size * Math.max(0, group.files.length - 1);

    return (
      <div key={group.hash} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
        <div className="flex items-center p-4 cursor-pointer hover:bg-slate-800/50" onClick={() => toggleGroup(group.hash)}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(group.hash);
            }}
            className="mr-3"
          />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">
              {group.files.length} duplicate files
            </div>
            <div className="text-xs text-slate-400">
              Wasted space: {humanBytes(wastedSpace)}
              {group.fileType && ` • Type: ${group.fileType}`}
            </div>
          </div>
          <Copy className="w-4 h-4 text-amber-400 ml-2" />
        </div>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-1">
            {group.files.map((file, idx) => renderFile(file, idx))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto p-6" ref={contentRef}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-400 mb-2 flex items-center gap-2">
            <Copy className="w-8 h-8" />
            Asset Deduplicator
          </h1>
          <p className="text-slate-400">
            Find and remove duplicate files to save disk space and improve performance
          </p>
        </div>

        {/* Tools panel */}
        <ToolsInstallVerifyPanel
          accentClassName="text-green-300"
          description="Scan your mod folders to find duplicate textures, meshes, and other assets"
          tools={[]}
          verify={[
            'Select one or more folders to scan',
            'Click Start Scan to analyze for duplicates',
            'Review results and select groups to delete',
          ]}
          firstTestLoop={[]}
          troubleshooting={[
            'If scan fails, ensure you have read permissions for the selected folders',
            'Large scans may take several minutes - be patient',
          ]}
        />

        {/* Message banner */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/20 border-green-700 text-green-300' :
            message.type === 'error' ? 'bg-red-900/20 border-red-700 text-red-300' :
              'bg-blue-900/20 border-blue-700 text-blue-300'
            }`}>
            {message.text}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-4 rounded-lg border bg-red-900/20 border-red-700 text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Install Recovery Panel */}
        {showInstallRecovery && toolsNeedingSetup.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-300 mb-1">
                  Installation Recovery: {toolsNeedingSetup.length} Item{toolsNeedingSetup.length !== 1 ? 's' : ''} Pending
                </h3>
                <p className="text-xs text-amber-100 mb-3">
                  Your previous scan found these tools/dependencies that weren't fully installed. You can resume the installation process now.
                </p>
                <div className="space-y-2">
                  {toolsNeedingSetup.map((tool, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded px-3 py-2">
                      <div className="text-xs text-amber-100">{tool}</div>
                      <span className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending Setup
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowInstallRecovery(false);
                      // In a full implementation, this would trigger the installation workflow
                      setMessage({
                        type: 'info',
                        text: 'Installation workflow would be triggered here. Configure your tools and dependencies.',
                      });
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Resume Installation
                  </button>
                  <button
                    onClick={() => setShowInstallRecovery(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan configuration */}
        <div className="mb-6 space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <label className="block text-sm font-bold text-green-300 mb-2">
              Scan Folders
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300">
                {scanPaths.length > 0 ? scanPaths.join('; ') : 'No folders selected'}
              </div>
              <button
                onClick={browseFoldersClick}
                disabled={isScanning}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded text-sm font-bold flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Browse
              </button>
            </div>
          </div>

          {/* Skill level selector */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <label className="block text-sm font-bold text-green-300 mb-2">
              Skill Level
            </label>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setSkillLevel(level)}
                  className={`px-4 py-2 rounded text-sm font-bold ${skillLevel === level
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scan controls */}
        <div className="mb-6 flex gap-2">
          {!isScanning ? (
            <button
              onClick={startScan}
              disabled={scanPaths.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-lg font-bold flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Start Scan
            </button>
          ) : (
            <button
              onClick={cancelScan}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          )}

          {scanResult && !isScanning && (
            <>
              <button
                onClick={selectAll}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm"
              >
                Deselect All
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedGroups.size === 0 || isProcessing}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedGroups.size})
              </button>
            </>
          )}
        </div>

        {/* Progress */}
        {isScanning && progress && (
          <div className="mb-6 bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-300 mb-2">{progress.message || 'Scanning...'}</div>
            {progress.total && progress.total > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${((progress.current || 0) / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Results summary */}
        {scanResult && !isScanning && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{totalGroups}</div>
              <div className="text-sm text-slate-400">Duplicate Groups</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-400">{totalDuplicateFiles}</div>
              <div className="text-sm text-slate-400">Duplicate Files</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{humanBytes(estimatedSavings)}</div>
              <div className="text-sm text-slate-400">Potential Savings</div>
            </div>
          </div>
        )}

        {/* Results list */}
        {scanResult && scanResult.groups.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-green-300 mb-3">
              Duplicate Groups
            </h2>
            {scanResult.groups.map(group => renderGroup(group))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDeduplicator;
