/**
 * DDS Converter UI Component (Three-Section Redesign)
 * Professional texture conversion with Single, Batch, and Guide sections
 */

import React, { useState, useEffect } from 'react';
import { 
  Image, FileImage, Layers, Zap, Download, Upload, 
  Settings, CheckCircle, XCircle, AlertCircle, 
  FolderOpen, RefreshCw, TrendingDown, Clock, Info,
  Eye, ArrowRight, BarChart3, HelpCircle
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type TextureFormat = 'DDS_DXT1' | 'DDS_DXT3' | 'DDS_DXT5' | 'DDS_BC5' | 'DDS_BC7' | 'DDS_UNCOMPRESSED' | 'PNG' | 'TGA' | 'BMP' | 'JPG';
type TextureType = 'diffuse' | 'normal' | 'specular' | 'emissive' | 'roughness' | 'metallic';
type ActiveSection = 'single' | 'batch' | 'guide';

interface ConversionSettings {
  format: TextureFormat;
  textureType: TextureType;
  generateMipmaps: boolean;
  mipmapLevels?: number;
  quality: 'fast' | 'normal' | 'high' | 'ultra';
  flipY: boolean;
}

interface SingleFile {
  path: string;
  name: string;
  size: number;
  format?: TextureFormat;
  preview?: string; // Base64 preview
}

interface BatchFile {
  id: string;
  path: string;
  name: string;
  size: number;
  format?: TextureFormat;
  status: 'pending' | 'converting' | 'success' | 'error';
  result?: any;
  error?: string;
}

interface FormatMappingRule {
  pattern: string; // User-friendly pattern (e.g., "*_n.png")
  format: TextureFormat;
  enabled: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export const DDSConverter: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('single');
  
  // Single Conversion State
  const [singleFile, setSingleFile] = useState<SingleFile | null>(null);
  const [singleSettings, setSingleSettings] = useState<ConversionSettings>({
    format: 'DDS_DXT1',
    textureType: 'diffuse',
    generateMipmaps: true,
    quality: 'high',
    flipY: false
  });
  const [singleConverting, setSingleConverting] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  
  // Batch Conversion State
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [batchSettings, setBatchSettings] = useState<ConversionSettings>({
    format: 'DDS_DXT1',
    textureType: 'diffuse',
    generateMipmaps: true,
    quality: 'high',
    flipY: false
  });
  const [formatMappingEnabled, setFormatMappingEnabled] = useState(true);
  const [formatRules, setFormatRules] = useState<FormatMappingRule[]>([
    { pattern: '*_n.png', format: 'DDS_BC5', enabled: true },
    { pattern: '*_d.png', format: 'DDS_DXT1', enabled: true },
    { pattern: '*_s.png', format: 'DDS_DXT5', enabled: true },
    { pattern: '*_g.png', format: 'DDS_DXT1', enabled: true },
    { pattern: '*_m.png', format: 'DDS_BC7', enabled: true },
    { pattern: '*_r.png', format: 'DDS_BC7', enabled: true }
  ]);
  const [batchConverting, setBatchConverting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [batchResults, setBatchResults] = useState<any>(null);
  
  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, []);
  
  const loadPresets = async () => {
    try {
      const result = await (window.electron.api as any).ddsGetAllPresets();
      if (result.success) {
        console.log('Loaded presets:', result.presets);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  // ============================================================================
  // Single Conversion Handlers
  // ============================================================================

  const handleSingleFilePick = async () => {
    try {
      const result = await (window.electron.api as any).ddsPickFiles();
      if (result.success && result.paths && result.paths.length > 0) {
        const filePath = result.paths[0];
        const fileName = filePath.split(/[\\/]/).pop() || 'Unknown';
        
        setSingleFile({
          path: filePath,
          name: fileName,
          size: 0,
          preview: undefined
        });
        
        // Detect format
        const formatResult = await (window.electron.api as any).ddsDetectFormat(filePath);
        if (formatResult.success) {
          setSingleFile(prev => prev ? { ...prev, format: formatResult.format } : null);
        }
        
        // TODO: Generate preview using sharp library
        setSingleResult(null);
      }
    } catch (error) {
      console.error('File picker error:', error);
      alert('Failed to open file picker');
    }
  };

  const handleSingleConvert = async () => {
    if (!singleFile) return;
    
    setSingleConverting(true);
    setSingleResult(null);
    
    try {
      const input = {
        inputPath: singleFile.path,
        outputPath: singleFile.path.replace(/\.[^.]+$/, '.dds'),
        format: singleSettings.format,
        quality: singleSettings.quality,
        generateMipmaps: singleSettings.generateMipmaps,
        mipmapLevels: singleSettings.mipmapLevels,
        flipY: singleSettings.flipY,
        textureType: singleSettings.textureType
      };
      
      const result = await (window.electron.api as any).ddsConvert(input);
      setSingleResult(result);
      
      if (result.success) {
        alert(`Conversion successful!\nSaved to: ${result.outputPath}\nCompression: ${result.compressionRatio.toFixed(2)}x`);
      } else {
        alert(`Conversion failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      setSingleResult({ success: false, error: error.message });
    } finally {
      setSingleConverting(false);
    }
  };

  // ============================================================================
  // Batch Conversion Handlers
  // ============================================================================

  const handleBatchFilePick = async () => {
    try {
      const result = await (window.electron.api as any).ddsPickFiles();
      if (result.success && result.paths) {
        const newFiles: BatchFile[] = result.paths.map((path: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          path,
          name: path.split(/[\\/]/).pop() || 'Unknown',
          size: 0,
          status: 'pending' as const
        }));
        
        setBatchFiles(newFiles);
        setBatchResults(null);
        
        // Detect formats
        for (const file of newFiles) {
          detectBatchFileFormat(file.path, file.id);
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
      alert('Failed to open file picker');
    }
  };

  const detectBatchFileFormat = async (filePath: string, fileId: string) => {
    try {
      const result = await (window.electron.api as any).ddsDetectFormat(filePath);
      if (result.success) {
        setBatchFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, format: result.format } : f
        ));
      }
    } catch (error) {
      console.error('Format detection error:', error);
    }
  };

  const handleBatchConvert = async () => {
    if (batchFiles.length === 0) return;
    
    setBatchConverting(true);
    setBatchProgress({ current: 0, total: batchFiles.length, currentFile: '' });
    setBatchResults(null);
    
    try {
      // Prepare input files
      const inputs = batchFiles.map(file => ({
        inputPath: file.path,
        outputPath: file.path.replace(/\.[^.]+$/, '.dds'),
        format: batchSettings.format,
        quality: batchSettings.quality,
        generateMipmaps: batchSettings.generateMipmaps,
        mipmapLevels: batchSettings.mipmapLevels,
        flipY: batchSettings.flipY,
        textureType: batchSettings.textureType
      }));
      
      // Prepare batch options with format mapping rules
      const options = {
        defaultFormat: batchSettings.format,
        defaultQuality: batchSettings.quality,
        generateMipmaps: batchSettings.generateMipmaps,
        formatMappingRules: formatMappingEnabled 
          ? formatRules
              .filter(rule => rule.enabled)
              .map(rule => ({
                pattern: convertPatternToRegex(rule.pattern),
                format: rule.format
              }))
          : [],
        onProgress: (current: number, total: number, filePath: string) => {
          setBatchProgress({ current, total, currentFile: filePath });
        },
        onError: (filePath: string, error: string) => {
          console.error(`Batch error for ${filePath}:`, error);
        }
      };
      
      const result = await (window.electron.api as any).ddsConvertBatch(inputs, options);
      setBatchResults(result);
      
      // Update file statuses
      setBatchFiles(prev => prev.map((file, index) => ({
        ...file,
        status: result.results[index]?.success ? 'success' : 'error',
        result: result.results[index],
        error: result.results[index]?.error
      })));
      
      alert(`Batch conversion complete!\nSuccess: ${result.successCount}/${result.totalFiles}\nTotal time: ${(result.totalProcessingTime / 1000).toFixed(2)}s`);
    } catch (error: any) {
      console.error('Batch conversion error:', error);
      alert(`Batch conversion failed: ${error.message}`);
    } finally {
      setBatchConverting(false);
    }
  };

  // Convert user-friendly pattern to regex string
  const convertPatternToRegex = (pattern: string): string => {
    // Convert * to .*, escape dots
    return pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
  };

  // ============================================================================
  // Render: Main Layout
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Image size={32} />
          <h1 className="text-2xl font-bold">DDS Texture Converter</h1>
        </div>
        <p className="text-sm opacity-90">Professional texture conversion with BC1/BC3/BC5/BC7 compression formats</p>
      </div>

      {/* Section Tabs */}
      <div className="bg-slate-800 rounded-lg p-1 flex gap-1">
        <button
          onClick={() => setActiveSection('single')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeSection === 'single'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <FileImage size={18} />
          Single Conversion
        </button>
        <button
          onClick={() => setActiveSection('batch')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeSection === 'batch'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Layers size={18} />
          Batch Processing
        </button>
        <button
          onClick={() => setActiveSection('guide')}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeSection === 'guide'
              ? 'bg-purple-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <HelpCircle size={18} />
          Format Guide
        </button>
      </div>

      {/* Section Content */}
      {activeSection === 'single' && renderSingleSection()}
      {activeSection === 'batch' && renderBatchSection()}
      {activeSection === 'guide' && renderGuideSection()}
    </div>
  );

  // ============================================================================
  // Render: Single Conversion Section
  // ============================================================================

  function renderSingleSection() {
    return (
      <div className="space-y-4">
        {/* File Selection */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload size={20} />
            Select Source File
          </h2>
          
          {!singleFile ? (
            <button
              onClick={handleSingleFilePick}
              className="w-full py-12 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 hover:bg-slate-700/50 transition-all flex flex-col items-center gap-3"
            >
              <FileImage size={48} className="text-gray-400" />
              <span className="text-lg text-gray-300">Click to select texture file</span>
              <span className="text-sm text-gray-500">Supports PNG, TGA, BMP, JPG, DDS</span>
            </button>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{singleFile.name}</p>
                    <p className="text-sm text-gray-400">
                      Current Format: {singleFile.format || 'Detecting...'}
                    </p>
                  </div>
                  <button
                    onClick={handleSingleFilePick}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Preview Area */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Eye size={16} />
                    Original
                  </h3>
                  <div className="aspect-square bg-slate-600 rounded flex items-center justify-center">
                    {singleFile.preview ? (
                      <img src={singleFile.preview} alt="Preview" className="max-w-full max-h-full" />
                    ) : (
                      <span className="text-gray-500 text-sm">Preview not available</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ArrowRight size={16} />
                    Preview ({singleSettings.format})
                  </h3>
                  <div className="aspect-square bg-slate-600 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Convert to preview</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conversion Settings */}
        {singleFile && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings size={20} />
              Conversion Settings
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Target Format</label>
                <select
                  value={singleSettings.format}
                  onChange={(e) => setSingleSettings({ ...singleSettings, format: e.target.value as TextureFormat })}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="DDS_DXT1">BC1 (DXT1) - No Alpha</option>
                  <option value="DDS_DXT3">BC2 (DXT3) - Sharp Alpha</option>
                  <option value="DDS_DXT5">BC3 (DXT5) - Smooth Alpha</option>
                  <option value="DDS_BC5">BC5 - Normal Maps</option>
                  <option value="DDS_BC7">BC7 - High Quality</option>
                  <option value="DDS_UNCOMPRESSED">Uncompressed</option>
                </select>
              </div>

              {/* Texture Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Texture Type</label>
                <select
                  value={singleSettings.textureType}
                  onChange={(e) => setSingleSettings({ ...singleSettings, textureType: e.target.value as TextureType })}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="diffuse">Diffuse</option>
                  <option value="normal">Normal Map</option>
                  <option value="specular">Specular</option>
                  <option value="emissive">Emissive/Glow</option>
                  <option value="roughness">Roughness (PBR)</option>
                  <option value="metallic">Metallic (PBR)</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm font-medium mb-2">Compression Quality</label>
                <select
                  value={singleSettings.quality}
                  onChange={(e) => setSingleSettings({ ...singleSettings, quality: e.target.value as any })}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra (Slow)</option>
                </select>
              </div>

              {/* Mipmaps */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleSettings.generateMipmaps}
                    onChange={(e) => setSingleSettings({ ...singleSettings, generateMipmaps: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Generate Mipmaps</span>
                </label>
                {singleSettings.generateMipmaps && (
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={singleSettings.mipmapLevels || ''}
                    onChange={(e) => setSingleSettings({ ...singleSettings, mipmapLevels: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="w-full mt-2 bg-slate-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>

            {/* Convert Button */}
            <button
              onClick={handleSingleConvert}
              disabled={singleConverting}
              className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {singleConverting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Convert Texture
                </>
              )}
            </button>
          </div>
        )}

        {/* Result Display */}
        {singleResult && (
          <div className={`rounded-lg p-6 ${singleResult.success ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              {singleResult.success ? (
                <>
                  <CheckCircle size={20} className="text-green-500" />
                  <h3 className="font-bold text-green-500">Conversion Successful</h3>
                </>
              ) : (
                <>
                  <XCircle size={20} className="text-red-500" />
                  <h3 className="font-bold text-red-500">Conversion Failed</h3>
                </>
              )}
            </div>
            {singleResult.success ? (
              <div className="space-y-1 text-sm">
                <p>Output: {singleResult.outputPath}</p>
                <p>Compression Ratio: {singleResult.compressionRatio.toFixed(2)}x</p>
                <p>Processing Time: {singleResult.processingTime}ms</p>
              </div>
            ) : (
              <p className="text-sm text-red-300">{singleResult.error}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render: Batch Conversion Section
  // ============================================================================

  function renderBatchSection() {
    return (
      <div className="space-y-4">
        {/* File Selection */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FolderOpen size={20} />
              Batch Files ({batchFiles.length})
            </h2>
            <button
              onClick={handleBatchFilePick}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2"
            >
              <Upload size={16} />
              Add Files
            </button>
          </div>

          {batchFiles.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center gap-3 text-gray-400">
              <Layers size={48} />
              <span>No files selected</span>
              <span className="text-sm">Click "Add Files" to start batch conversion</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {batchFiles.map(file => (
                <div key={file.id} className="bg-slate-700 rounded p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400">Format: {file.format || 'Detecting...'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'success' && <CheckCircle size={18} className="text-green-500" />}
                    {file.status === 'error' && <XCircle size={18} className="text-red-500" />}
                    {file.status === 'converting' && <RefreshCw size={18} className="text-blue-500 animate-spin" />}
                    {file.status === 'pending' && <Clock size={18} className="text-gray-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Format Mapping Rules */}
        {batchFiles.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap size={20} />
                Format Mapping Rules
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formatMappingEnabled}
                  onChange={(e) => setFormatMappingEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Enable Auto-Mapping</span>
              </label>
            </div>

            {formatMappingEnabled && (
              <div className="space-y-2">
                {formatRules.map((rule, index) => (
                  <div key={index} className="bg-slate-700 rounded p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => {
                        const newRules = [...formatRules];
                        newRules[index].enabled = e.target.checked;
                        setFormatRules(newRules);
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 flex items-center gap-3">
                      <code className="px-2 py-1 bg-slate-600 rounded text-xs font-mono">{rule.pattern}</code>
                      <ArrowRight size={16} className="text-gray-500" />
                      <span className="text-sm font-medium">{rule.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!formatMappingEnabled && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Format mapping disabled. All files will use default format.
              </div>
            )}
          </div>
        )}

        {/* Batch Settings */}
        {batchFiles.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings size={20} />
              Default Settings
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Format</label>
                <select
                  value={batchSettings.format}
                  onChange={(e) => setBatchSettings({ ...batchSettings, format: e.target.value as TextureFormat })}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2 text-sm"
                >
                  <option value="DDS_DXT1">BC1 (DXT1)</option>
                  <option value="DDS_DXT5">BC3 (DXT5)</option>
                  <option value="DDS_BC5">BC5 (Normal)</option>
                  <option value="DDS_BC7">BC7 (High Quality)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select
                  value={batchSettings.quality}
                  onChange={(e) => setBatchSettings({ ...batchSettings, quality: e.target.value as any })}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2 text-sm"
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchSettings.generateMipmaps}
                    onChange={(e) => setBatchSettings({ ...batchSettings, generateMipmaps: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Generate Mipmaps</span>
                </label>
              </div>
            </div>

            {/* Convert Button */}
            <button
              onClick={handleBatchConvert}
              disabled={batchConverting}
              className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {batchConverting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Converting {batchProgress.current}/{batchProgress.total}
                </>
              ) : (
                <>
                  <Layers size={18} />
                  Convert All Files
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Summary */}
        {batchResults && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Batch Results
            </h2>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-900/20 border border-blue-700 rounded p-4 text-center">
                <p className="text-2xl font-bold">{batchResults.totalFiles}</p>
                <p className="text-sm text-gray-400">Total Files</p>
              </div>
              <div className="bg-green-900/20 border border-green-700 rounded p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{batchResults.successCount}</p>
                <p className="text-sm text-gray-400">Successful</p>
              </div>
              <div className="bg-red-900/20 border border-red-700 rounded p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{batchResults.failureCount}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
              <div className="bg-purple-900/20 border border-purple-700 rounded p-4 text-center">
                <p className="text-2xl font-bold text-purple-500">{batchResults.totalCompressionRatio.toFixed(2)}x</p>
                <p className="text-sm text-gray-400">Compression</p>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400 text-center">
              Processing time: {(batchResults.totalProcessingTime / 1000).toFixed(2)}s
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render: Format Guide Section
  // ============================================================================

  function renderGuideSection() {
    return (
      <div className="space-y-4">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Info size={24} />
            DDS Format Guide
          </h2>
          <p className="text-sm opacity-90">
            Learn about DirectX texture compression formats and choose the optimal format for your textures.
          </p>
        </div>

        {/* Format Comparison */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Format Comparison</h3>
          
          <div className="space-y-3">
            {/* BC1 (DXT1) */}
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-green-400">BC1 (DXT1)</h4>
                <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">6:1 Compression</span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                Best for diffuse textures without alpha channel. Highest compression ratio.
              </p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-600 rounded">No Alpha</span>
                <span className="px-2 py-1 bg-slate-600 rounded">4 bits/pixel</span>
                <span className="px-2 py-1 bg-slate-600 rounded">Best Compression</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use for: Diffuse maps, emissive maps, environment maps</p>
            </div>

            {/* BC3 (DXT5) */}
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-blue-400">BC3 (DXT5)</h4>
                <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">4:1 Compression</span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                Ideal for textures with smooth alpha gradients (specular, transparency).
              </p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-600 rounded">Smooth Alpha</span>
                <span className="px-2 py-1 bg-slate-600 rounded">8 bits/pixel</span>
                <span className="px-2 py-1 bg-slate-600 rounded">Good Balance</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use for: Specular maps with gloss, foliage, hair</p>
            </div>

            {/* BC5 */}
            <div className="bg-slate-700 rounded-lg p-4 border-2 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-purple-400">BC5 (Recommended for Normal Maps)</h4>
                <span className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded">4:1 Compression</span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                Optimized 2-channel compression specifically designed for normal maps. Superior to BC3.
              </p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-600 rounded">2-Channel</span>
                <span className="px-2 py-1 bg-slate-600 rounded">8 bits/pixel</span>
                <span className="px-2 py-1 bg-slate-600 rounded">Normal Map Optimized</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use for: Normal maps, height maps (better quality than BC3)</p>
            </div>

            {/* BC7 */}
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-yellow-400">BC7</h4>
                <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">4:1 Compression</span>
              </div>
              <p className="text-sm text-gray-300 mb-2">
                Modern high-quality compression. Best for PBR textures (roughness, metallic).
              </p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-slate-600 rounded">High Quality</span>
                <span className="px-2 py-1 bg-slate-600 rounded">8 bits/pixel</span>
                <span className="px-2 py-1 bg-slate-600 rounded">Slower Encoding</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use for: PBR roughness, PBR metallic, high-quality diffuse</p>
            </div>
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingDown size={20} />
            Memory Usage Comparison (1024x1024 texture)
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-400">PNG (Uncompressed)</div>
              <div className="flex-1 bg-slate-700 rounded-full h-8 relative">
                <div className="absolute inset-0 bg-red-600 rounded-full" style={{ width: '100%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">4.0 MB</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-400">BC7 (High Quality)</div>
              <div className="flex-1 bg-slate-700 rounded-full h-8 relative">
                <div className="absolute inset-0 bg-yellow-600 rounded-full" style={{ width: '25%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">1.0 MB</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-400">BC5 (Normal Maps)</div>
              <div className="flex-1 bg-slate-700 rounded-full h-8 relative">
                <div className="absolute inset-0 bg-purple-600 rounded-full" style={{ width: '25%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">1.0 MB</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-400">BC3 (DXT5)</div>
              <div className="flex-1 bg-slate-700 rounded-full h-8 relative">
                <div className="absolute inset-0 bg-blue-600 rounded-full" style={{ width: '25%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">1.0 MB</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-400">BC1 (DXT1)</div>
              <div className="flex-1 bg-slate-700 rounded-full h-8 relative">
                <div className="absolute inset-0 bg-green-600 rounded-full" style={{ width: '12.5%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">0.5 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            Best Practices
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Use BC5 for Normal Maps</p>
                <p className="text-gray-400 text-xs">BC5 provides better quality than BC3 for normal maps with same compression ratio</p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Use BC1 for Opaque Diffuse Textures</p>
                <p className="text-gray-400 text-xs">Highest compression ratio without quality loss for textures without alpha</p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Enable Format Mapping for Batch Conversions</p>
                <p className="text-gray-400 text-xs">Automatically apply optimal formats based on filename patterns (*_n → BC5, *_d → BC1)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Always Generate Mipmaps</p>
                <p className="text-gray-400 text-xs">Mipmaps improve performance and visual quality at different view distances</p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Use BC7 for PBR Textures</p>
                <p className="text-gray-400 text-xs">Modern BC7 format provides best quality for roughness and metallic maps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
