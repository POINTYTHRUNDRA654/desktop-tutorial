import React, { useState } from 'react';
import { Archive, FolderOpen, ArrowDownToLine, Upload, FileArchive, HardDrive, AlertCircle, Info, Merge, Plus, X } from 'lucide-react';

interface BA2File {
  name: string;
  size: number;
  compressed: number;
  ratio: string;
}

interface MergeJob {
  id: string;
  inputArchives: string[];
  outputArchive: string;
  archiveType: 'general' | 'texture';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    success: boolean;
    message: string;
    outputPath?: string;
    extractedFiles?: number;
    finalFiles?: number;
    archiveType?: string;
  };
}

export const BA2Manager: React.FC = () => {
  const [archivePath, setArchivePath] = useState('');
  const [files, setFiles] = useState<BA2File[]>([]);
  const [loading, setLoading] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<{
    totalFiles: number;
    totalSize: number;
    compressedSize: number;
    compressionRatio: string;
  } | null>(null);

  // Merge functionality
  const [mergeJobs, setMergeJobs] = useState<MergeJob[]>([]);
  const [currentMergeJob, setCurrentMergeJob] = useState<MergeJob | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // This would connect to Desktop Bridge Python server with BA2 library
  const extractBA2 = async () => {
    if (!archivePath) return;
    
    setLoading(true);
    try {
      // In real implementation, this calls Desktop Bridge endpoint
      const response = await fetch('http://localhost:21337/ba2/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          archive: archivePath,
          destination: archivePath.replace('.ba2', '_extracted')
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Extracted ${data.fileCount} files to ${data.destination}`);
      }
    } catch (error) {
      console.error('BA2 extraction failed:', error);
      alert('BA2 extraction requires Desktop Bridge server with ba2toolkit library.\n\nInstall: pip install ba2toolkit');
    } finally {
      setLoading(false);
    }
  };

  // BA2 Merge functionality
  const startMergeJob = async (inputArchives: string[], outputArchive: string, archiveType: 'general' | 'texture') => {
    const job: MergeJob = {
      id: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inputArchives,
      outputArchive,
      archiveType,
      status: 'running'
    };

    setMergeJobs(prev => [...prev, job]);
    setCurrentMergeJob(job);

    try {
      const result = await window.electronAPI.mergeBA2(inputArchives, outputArchive, archiveType);
      
      setMergeJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: result.success ? 'completed' : 'failed', result }
          : j
      ));
      
      if (result.success) {
        alert(`BA2 merge completed!\n\nMerged ${result.extractedFiles} files into ${result.finalFiles} final files.\nOutput: ${result.outputPath}`);
      } else {
        alert(`BA2 merge failed: ${result.message}`);
      }
    } catch (error) {
      console.error('BA2 merge error:', error);
      setMergeJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, status: 'failed', result: { success: false, message: String(error) } }
          : j
      ));
      alert(`BA2 merge failed: ${error}`);
    } finally {
      setCurrentMergeJob(null);
    }
  };

  const removeMergeJob = (jobId: string) => {
    setMergeJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const packBA2 = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:21337/ba2/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: archivePath,
          output: archivePath + '.ba2',
          compression: 'default'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Packed ${data.fileCount} files into ${data.output}`);
      }
    } catch (error) {
      console.error('BA2 packing failed:', error);
      alert('BA2 packing requires Desktop Bridge server with ba2toolkit library.\n\nInstall: pip install ba2toolkit');
    } finally {
      setLoading(false);
    }
  };

  const listBA2Contents = async () => {
    if (!archivePath) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:21337/ba2/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: archivePath })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
        setArchiveInfo(data.info);
      } else {
        throw new Error('Listing failed');
      }
    } catch (error) {
      console.error('BA2 listing failed:', error);
      setFiles([]);
      setArchiveInfo(null);
      alert('Bridge offline - real data unavailable.\n\nTo use real BA2 archives:\n1. Start Desktop Bridge server\n2. Install: pip install ba2toolkit');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Merge Dialog Component
  const MergeDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [inputArchives, setInputArchives] = useState<string[]>(['']);
    const [outputArchive, setOutputArchive] = useState('');
    const [archiveType, setArchiveType] = useState<'general' | 'texture'>('general');
    const [merging, setMerging] = useState(false);

    const addArchive = () => {
      setInputArchives(prev => [...prev, '']);
    };

    const removeArchive = (index: number) => {
      setInputArchives(prev => prev.filter((_, i) => i !== index));
    };

    const updateArchive = (index: number, value: string) => {
      setInputArchives(prev => prev.map((archive, i) => i === index ? value : archive));
    };

    const handleMerge = async () => {
      const validArchives = inputArchives.filter(archive => archive.trim());
      if (validArchives.length < 2) {
        alert('Please add at least 2 input archives to merge.');
        return;
      }
      if (!outputArchive.trim()) {
        alert('Please specify an output archive path.');
        return;
      }

      setMerging(true);
      try {
        await startMergeJob(validArchives, outputArchive.trim(), archiveType);
        onClose();
      } finally {
        setMerging(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Merge className="w-5 h-5 text-amber-400" />
              Merge BA2 Archives
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Archive Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Archive Type</label>
              <select
                value={archiveType}
                onChange={(e) => setArchiveType(e.target.value as 'general' | 'texture')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="general">General (Meshes, Scripts, Sounds, etc.)</option>
                <option value="texture">Textures (DDS files only)</option>
              </select>
            </div>

            {/* Input Archives */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Input Archives</label>
              <div className="space-y-2">
                {inputArchives.map((archive, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={archive}
                      onChange={(e) => updateArchive(index, e.target.value)}
                      placeholder="Path to .ba2 file..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                    {inputArchives.length > 1 && (
                      <button
                        onClick={() => removeArchive(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addArchive}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Archive
                </button>
              </div>
            </div>

            {/* Output Archive */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Output Archive</label>
              <input
                type="text"
                value={outputArchive}
                onChange={(e) => setOutputArchive(e.target.value)}
                placeholder="Path for merged .ba2 file..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Info */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-bold text-blue-300 mb-1">BA2 Merging:</p>
                  <p>• Merges multiple BA2 archives of the same type into one</p>
                  <p>• Helps stay within Fallout 4's engine limits (256 General, 255 Texture)</p>
                  <p>• Requires BSArch tool (install from Nexus)</p>
                  <p>• Remember to update your ESP files to reference the new archive names</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={merging}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              {merging ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Merge className="w-4 h-4" />
                  Start Merge
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Archive className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">BA2 Archive Manager</h1>
            <p className="text-sm text-slate-400">Extract, pack, and manage Fallout 4 archive files</p>
          </div>
        </div>

        {/* File Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={archivePath}
            onChange={(e) => setArchivePath(e.target.value)}
            placeholder="Path to .ba2 file or folder to pack..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={listBA2Contents}
            disabled={!archivePath || loading}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileArchive className="w-4 h-4" />
            List Contents
          </button>
          <button
            onClick={() => setShowMergeDialog(true)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            <Merge className="w-4 h-4" />
            Merge Archives
          </button>
        </div>

        {/* Bridge Info */}
        <div className="mt-3 flex items-start gap-2 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            <span className="font-bold text-blue-300">Requires Desktop Bridge:</span> This feature uses the Python server with ba2toolkit library. 
            Install via: <code className="bg-slate-800 px-1 py-0.5 rounded">pip install ba2toolkit</code>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Left: Actions */}
        <div className="w-80 space-y-4">
          {/* Archive Info */}
          {archiveInfo && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3">Archive Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Files:</span>
                  <span className="text-white font-mono">{archiveInfo.totalFiles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uncompressed:</span>
                  <span className="text-white font-mono">{formatBytes(archiveInfo.totalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Compressed:</span>
                  <span className="text-white font-mono">{formatBytes(archiveInfo.compressedSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ratio:</span>
                  <span className="text-emerald-400 font-mono font-bold">{archiveInfo.compressionRatio}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={extractBA2}
                disabled={!archivePath || loading}
                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Extract Archive
              </button>
              <button
                onClick={packBA2}
                disabled={!archivePath || loading}
                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Pack to BA2
              </button>
            </div>
          </div>

          {/* Merge Jobs */}
          {mergeJobs.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="font-bold text-white mb-3">Merge Jobs</h3>
              <div className="space-y-2">
                {mergeJobs.map((job) => (
                  <div key={job.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200">
                        {job.archiveType === 'general' ? 'General' : 'Texture'} Merge
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          job.status === 'completed' ? 'bg-green-600 text-white' :
                          job.status === 'failed' ? 'bg-red-600 text-white' :
                          job.status === 'running' ? 'bg-blue-600 text-white' :
                          'bg-slate-600 text-slate-300'
                        }`}>
                          {job.status}
                        </span>
                        <button
                          onClick={() => removeMergeJob(job.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <p>Input: {job.inputArchives.length} archives</p>
                      <p>Output: {job.outputArchive}</p>
                      {job.result && (
                        <p className={job.result.success ? 'text-green-400' : 'text-red-400'}>
                          {job.result.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compression Guide */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3 text-sm">Compression Guide</h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div>
                <span className="font-bold text-slate-300">Textures (.dds):</span>
                <p>Already compressed by DDS format. BA2 compression adds minimal benefit.</p>
              </div>
              <div>
                <span className="font-bold text-slate-300">Meshes (.nif):</span>
                <p>Compress well, typically 40-60% reduction.</p>
              </div>
              <div>
                <span className="font-bold text-slate-300">Scripts (.pex):</span>
                <p>Excellent compression, 70-80% reduction.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: File List */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-bold text-white">Archive Contents</h3>
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading archive...</p>
              </div>
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <FileArchive className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No archive loaded</p>
                <p className="text-xs mt-2">Enter a BA2 path and click List Contents</p>
              </div>
            </div>
          )}

          {!loading && files.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-800 sticky top-0">
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase">
                    <th className="p-3">File Path</th>
                    <th className="p-3 w-28">Size</th>
                    <th className="p-3 w-28">Compressed</th>
                    <th className="p-3 w-20">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {files.map((file, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-sm text-slate-300 font-mono">{file.name}</td>
                      <td className="p-3 text-sm text-slate-400">{formatBytes(file.size)}</td>
                      <td className="p-3 text-sm text-slate-400">{formatBytes(file.compressed)}</td>
                      <td className="p-3 text-sm text-emerald-400 font-bold">{file.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Merge Dialog */}
      {showMergeDialog && <MergeDialog onClose={() => setShowMergeDialog(false)} />}
    </div>
  );
};
