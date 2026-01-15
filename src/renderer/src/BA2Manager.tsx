import React, { useState } from 'react';
import { Archive, FolderOpen, Download, Upload, FileArchive, HardDrive, AlertCircle, Info } from 'lucide-react';

interface BA2File {
  name: string;
  size: number;
  compressed: number;
  ratio: string;
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
                <Download className="w-4 h-4" />
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
    </div>
  );
};
