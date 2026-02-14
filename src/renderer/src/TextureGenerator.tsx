/**
 * Texture Generator UI Component
 * Four-tab interface for PBR material generation, procedural textures, tools, and gallery
 */

import React, { useState, useEffect } from 'react';
import {
  Layers, Wand2, Sparkles, Image as ImageIcon, Download, Upload,
  Settings, Grid3x3, Zap, Eye, RefreshCw, Check, X, Info,
  Plus, Trash2, Save, FolderOpen, ArrowUpCircle, Scissors,
  Box, Package, Palette, Sliders, TrendingUp
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type ActiveTab = 'material' | 'procedural' | 'tools' | 'gallery';
type MapType = 'diffuse' | 'normal' | 'height' | 'roughness' | 'metallic' | 'ao' | 'emissive' | 'specular';
type ProceduralType = 'noise' | 'checkerboard' | 'brick' | 'grid' | 'concrete' | 'metal' | 'fabric' | 'wood';
type MaterialStyle = 'realistic' | 'stylized' | 'game-ready';

interface GeneratedMap {
  type: MapType;
  path: string;
  success: boolean;
  preview?: string;
}

interface MaterialSet {
  name: string;
  maps: Record<MapType, GeneratedMap | null>;
  timestamp: number;
}

interface MapSettings {
  normalStrength: number;
  aoIntensity: number;
  roughnessMin: number;
  roughnessMax: number;
  metallicValue: number;
}

interface ProceduralSettings {
  width: number;
  height: number;
  scale: number;
  variation: number;
  weathering: number;
  seed: number;
}

interface ToolOperation {
  type: 'seamless' | 'upscale' | 'batch';
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const TextureGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('material');
  
  // Material Generator State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [materialStyle, setMaterialStyle] = useState<MaterialStyle>('game-ready');
  const [selectedMaps, setSelectedMaps] = useState<MapType[]>(['diffuse', 'normal', 'roughness', 'metallic', 'ao']);
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    normalStrength: 2.0,
    aoIntensity: 0.5,
    roughnessMin: 0.2,
    roughnessMax: 0.8,
    metallicValue: 0.0
  });
  const [generatedMaterial, setGeneratedMaterial] = useState<MaterialSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Procedural State
  const [proceduralType, setProceduralType] = useState<ProceduralType>('brick');
  const [proceduralSettings, setProceduralSettings] = useState<ProceduralSettings>({
    width: 1024,
    height: 1024,
    scale: 100,
    variation: 0.5,
    weathering: 0.3,
    seed: Date.now()
  });
  const [proceduralPreview, setProceduralPreview] = useState<string | null>(null);
  const [isGeneratingProcedural, setIsGeneratingProcedural] = useState(false);

  // Tools State
  const [toolOperation, setToolOperation] = useState<ToolOperation>({
    type: 'seamless',
    status: 'idle',
    progress: 0
  });
  const [toolInputFile, setToolInputFile] = useState<string | null>(null);
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  const [seamlessRadius, setSeamlessRadius] = useState(64);

  // Gallery State
  const [savedMaterials, setSavedMaterials] = useState<MaterialSet[]>([]);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<MaterialSet | null>(null);

  // ============================================================================
  // Material Generator Functions
  // ============================================================================

  const handleImageUpload = async () => {
    try {
      const result = await (window.electron.api as any).ddsPickFiles();
      if (result.success && result.paths && result.paths.length > 0) {
        setSourceImage(result.paths[0]);
        setGeneratedMaterial(null);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    }
  };

  const handleGenerateMaterial = async () => {
    if (!sourceImage) {
      alert('Please upload a source image first');
      return;
    }

    setIsGenerating(true);
    setGeneratedMaterial(null);

    try {
      const input = {
        name: `material_${Date.now()}`,
        basePath: sourceImage,
        outputDir: sourceImage.substring(0, sourceImage.lastIndexOf('\\')),
        resolution: 1024,
        generateMaps: selectedMaps,
        seamless: false,
        upscale: undefined
      };

      const result = await (window.electron.api as any).textureGenerateMaterialSet(input);
      
      if (result.success) {
        setGeneratedMaterial({
          name: result.name,
          maps: result.maps,
          timestamp: Date.now()
        });
        alert(`Material generation complete!\nTotal size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB\nTime: ${(result.totalProcessingTime / 1000).toFixed(2)}s`);
      } else {
        alert(`Material generation failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Material generation error:', error);
      alert(`Failed to generate material: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMap = async (map: GeneratedMap) => {
    if (map.success && map.path) {
      alert(`Map saved to: ${map.path}`);
    }
  };

  const handleDownloadAllMaps = () => {
    if (!generatedMaterial) return;
    
    const successfulMaps = Object.values(generatedMaterial.maps).filter(m => m?.success);
    alert(`All ${successfulMaps.length} maps have been saved to the output directory`);
  };

  const handleSaveMaterial = () => {
    if (!generatedMaterial) return;
    
    setSavedMaterials(prev => [...prev, generatedMaterial]);
    alert('Material saved to gallery!');
  };

  // ============================================================================
  // Procedural Generation Functions
  // ============================================================================

  const handleGenerateProcedural = async () => {
    setIsGeneratingProcedural(true);
    setProceduralPreview(null);

    try {
      const settings = {
        width: proceduralSettings.width,
        height: proceduralSettings.height,
        scale: proceduralSettings.scale,
        seed: proceduralSettings.seed,
        tileSize: Math.floor(proceduralSettings.width / 8),
        groutWidth: Math.floor(proceduralSettings.scale / 20)
      };

      const result = await (window.electron.api as any).textureGenerateProcedural(proceduralType, settings);
      
      if (result.success) {
        setProceduralPreview(result.outputPath);
        alert(`Procedural texture generated!\nSize: ${result.width}x${result.height}\nFile: ${(result.fileSize / 1024).toFixed(2)} KB`);
      } else {
        alert(`Procedural generation failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Procedural generation error:', error);
      alert(`Failed to generate procedural texture: ${error.message}`);
    } finally {
      setIsGeneratingProcedural(false);
    }
  };

  const handleRandomizeSeed = () => {
    setProceduralSettings(prev => ({ ...prev, seed: Date.now() }));
  };

  // ============================================================================
  // Texture Tools Functions
  // ============================================================================

  const handleToolFileSelect = async () => {
    try {
      const result = await (window.electron.api as any).ddsPickFiles();
      if (result.success && result.paths && result.paths.length > 0) {
        setToolInputFile(result.paths[0]);
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  };

  const handleMakeSeamless = async () => {
    if (!toolInputFile) {
      alert('Please select an image first');
      return;
    }

    setToolOperation({ type: 'seamless', status: 'processing', progress: 50 });

    try {
      const result = await (window.electron.api as any).textureMakeSeamless(toolInputFile, seamlessRadius);
      
      if (result.success) {
        setToolOperation({ 
          type: 'seamless', 
          status: 'complete', 
          progress: 100, 
          result 
        });
        alert(`Seamless texture created!\nSaved to: ${result.outputPath}\nProcessing time: ${result.processingTime}ms`);
      } else {
        setToolOperation({ 
          type: 'seamless', 
          status: 'error', 
          progress: 0, 
          error: result.error 
        });
        alert(`Failed to make seamless: ${result.error}`);
      }
    } catch (error: any) {
      setToolOperation({ 
        type: 'seamless', 
        status: 'error', 
        progress: 0, 
        error: error.message 
      });
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpscale = async () => {
    if (!toolInputFile) {
      alert('Please select an image first');
      return;
    }

    setToolOperation({ type: 'upscale', status: 'processing', progress: 50 });

    try {
      const result = await (window.electron.api as any).textureUpscale(toolInputFile, upscaleFactor);
      
      if (result.success) {
        setToolOperation({ 
          type: 'upscale', 
          status: 'complete', 
          progress: 100, 
          result 
        });
        alert(`Upscale complete!\nOriginal: ${result.originalWidth}x${result.originalHeight}\nUpscaled: ${result.upscaledWidth}x${result.upscaledHeight}\nSaved to: ${result.outputPath}`);
      } else {
        setToolOperation({ 
          type: 'upscale', 
          status: 'error', 
          progress: 0, 
          error: result.error 
        });
        alert(`Upscale failed: ${result.error}`);
      }
    } catch (error: any) {
      setToolOperation({ 
        type: 'upscale', 
        status: 'error', 
        progress: 0, 
        error: error.message 
      });
      alert(`Error: ${error.message}`);
    }
  };

  // ============================================================================
  // Render: Main Layout
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Wand2 size={32} />
          <h1 className="text-2xl font-bold">Texture Generator</h1>
        </div>
        <p className="text-sm opacity-90">
          Generate PBR materials, create procedural textures, and enhance existing textures with AI
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 rounded-lg p-1 grid grid-cols-4 gap-1">
        <button
          onClick={() => setActiveTab('material')}
          className={`py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'material'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Layers size={18} />
          Material Generator
        </button>
        <button
          onClick={() => setActiveTab('procedural')}
          className={`py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'procedural'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Grid3x3 size={18} />
          Procedural
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tools'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Sparkles size={18} />
          Tools
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'gallery'
              ? 'bg-indigo-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <FolderOpen size={18} />
          Gallery
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'material' && renderMaterialGenerator()}
      {activeTab === 'procedural' && renderProceduralGenerator()}
      {activeTab === 'tools' && renderTextureTools()}
      {activeTab === 'gallery' && renderGallery()}
    </div>
  );

  // ============================================================================
  // Render: Material Generator Tab
  // ============================================================================

  function renderMaterialGenerator() {
    return (
      <div className="space-y-4">
        {/* Source Image Upload */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload size={20} />
            Source Image
          </h2>

          {!sourceImage ? (
            <button
              onClick={handleImageUpload}
              className="w-full py-16 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all flex flex-col items-center gap-3"
            >
              <ImageIcon size={48} className="text-gray-400" />
              <span className="text-lg text-gray-300">Upload Diffuse/Base Texture</span>
              <span className="text-sm text-gray-500">PNG, JPG, TGA, BMP supported</span>
            </button>
          ) : (
            <div className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon size={24} className="text-indigo-400" />
                <div>
                  <p className="font-medium">{sourceImage.split('\\').pop()}</p>
                  <p className="text-sm text-gray-400">Source texture loaded</p>
                </div>
              </div>
              <button
                onClick={handleImageUpload}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Generation Settings */}
        {sourceImage && (
          <>
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings size={20} />
                Generation Settings
              </h2>

              {/* Material Style */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Material Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['realistic', 'stylized', 'game-ready'] as MaterialStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => setMaterialStyle(style)}
                      className={`py-2 px-4 rounded capitalize ${
                        materialStyle === style
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {style.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Maps to Generate</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['diffuse', 'normal', 'height', 'roughness', 'metallic', 'ao', 'emissive', 'specular'] as MapType[]).map(mapType => (
                    <button
                      key={mapType}
                      onClick={() => {
                        if (selectedMaps.includes(mapType)) {
                          setSelectedMaps(prev => prev.filter(t => t !== mapType));
                        } else {
                          setSelectedMaps(prev => [...prev, mapType]);
                        }
                      }}
                      className={`py-2 px-3 rounded text-sm capitalize flex items-center justify-center gap-2 ${
                        selectedMaps.includes(mapType)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {selectedMaps.includes(mapType) && <Check size={14} />}
                      {mapType}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strength Sliders */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>Normal Strength</span>
                    <span className="text-indigo-400">{mapSettings.normalStrength.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={mapSettings.normalStrength}
                    onChange={(e) => setMapSettings(prev => ({ ...prev, normalStrength: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>AO Intensity</span>
                    <span className="text-indigo-400">{mapSettings.aoIntensity.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={mapSettings.aoIntensity}
                    onChange={(e) => setMapSettings(prev => ({ ...prev, aoIntensity: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>Roughness Range</span>
                    <span className="text-indigo-400">{mapSettings.roughnessMin.toFixed(2)} - {mapSettings.roughnessMax.toFixed(2)}</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mapSettings.roughnessMin}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, roughnessMin: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mapSettings.roughnessMax}
                      onChange={(e) => setMapSettings(prev => ({ ...prev, roughnessMax: parseFloat(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>Metallic Value</span>
                    <span className="text-indigo-400">{mapSettings.metallicValue.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={mapSettings.metallicValue}
                    onChange={(e) => setMapSettings(prev => ({ ...prev, metallicValue: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateMaterial}
              disabled={isGenerating || selectedMaps.length === 0}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg font-bold text-lg flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  Generating Material...
                </>
              ) : (
                <>
                  <Zap size={24} />
                  Generate PBR Material Set
                </>
              )}
            </button>
          </>
        )}

        {/* Generated Material Preview */}
        {generatedMaterial && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye size={20} />
                Generated Material
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMaterial}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
                >
                  <Save size={16} />
                  Save to Gallery
                </button>
                <button
                  onClick={handleDownloadAllMaps}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-2"
                >
                  <Download size={16} />
                  Download All
                </button>
              </div>
            </div>

            {/* Map Grid */}
            <div className="grid grid-cols-4 gap-4">
              {selectedMaps.map(mapType => {
                const map = generatedMaterial.maps[mapType];
                return (
                  <div key={mapType} className="bg-slate-700 rounded-lg p-3">
                    <div className="aspect-square bg-slate-600 rounded mb-2 flex items-center justify-center">
                      {map?.success ? (
                        <Check size={32} className="text-green-500" />
                      ) : (
                        <X size={32} className="text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{mapType}</span>
                      {map?.success && (
                        <button
                          onClick={() => handleDownloadMap(map)}
                          className="p-1 hover:bg-slate-600 rounded"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render: Procedural Generator Tab
  // ============================================================================

  function renderProceduralGenerator() {
    return (
      <div className="space-y-4">
        {/* Pattern Selection */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Box size={20} />
            Pattern Type
          </h2>

          <div className="grid grid-cols-4 gap-3">
            {(['noise', 'checkerboard', 'brick', 'grid', 'concrete', 'metal', 'fabric', 'wood'] as ProceduralType[]).map(type => (
              <button
                key={type}
                onClick={() => setProceduralType(type)}
                className={`py-4 px-4 rounded-lg capitalize font-medium transition-all ${
                  proceduralType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Procedural Settings */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sliders size={20} />
            Customization
          </h2>

          <div className="space-y-4">
            {/* Resolution */}
            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <select
                value={proceduralSettings.width}
                onChange={(e) => {
                  const size = parseInt(e.target.value);
                  setProceduralSettings(prev => ({ ...prev, width: size, height: size }));
                }}
                className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2"
              >
                <option value="512">512x512</option>
                <option value="1024">1024x1024</option>
                <option value="2048">2048x2048</option>
                <option value="4096">4096x4096</option>
              </select>
            </div>

            {/* Scale */}
            <div>
              <label className="flex items-center justify-between text-sm mb-2">
                <span>Pattern Scale</span>
                <span className="text-indigo-400">{proceduralSettings.scale}</span>
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={proceduralSettings.scale}
                onChange={(e) => setProceduralSettings(prev => ({ ...prev, scale: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Variation */}
            <div>
              <label className="flex items-center justify-between text-sm mb-2">
                <span>Variation</span>
                <span className="text-indigo-400">{proceduralSettings.variation.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={proceduralSettings.variation}
                onChange={(e) => setProceduralSettings(prev => ({ ...prev, variation: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Weathering */}
            <div>
              <label className="flex items-center justify-between text-sm mb-2">
                <span>Weathering</span>
                <span className="text-indigo-400">{proceduralSettings.weathering.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={proceduralSettings.weathering}
                onChange={(e) => setProceduralSettings(prev => ({ ...prev, weathering: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Seed */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Random Seed</label>
                <input
                  type="number"
                  value={proceduralSettings.seed}
                  onChange={(e) => setProceduralSettings(prev => ({ ...prev, seed: parseInt(e.target.value) }))}
                  className="w-full bg-slate-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRandomizeSeed}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Randomize
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateProcedural}
          disabled={isGeneratingProcedural}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg font-bold text-lg flex items-center justify-center gap-3"
        >
          {isGeneratingProcedural ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap size={24} />
              Generate Procedural Texture
            </>
          )}
        </button>

        {/* Preview */}
        {proceduralPreview && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye size={20} />
              Preview
            </h2>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="aspect-square bg-slate-600 rounded flex items-center justify-center mb-3">
                <Package size={64} className="text-gray-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{proceduralPreview.split('\\').pop()}</span>
                <button
                  onClick={() => alert(`Saved to: ${proceduralPreview}`)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm flex items-center gap-2"
                >
                  <Download size={14} />
                  Open Location
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render: Texture Tools Tab
  // ============================================================================

  function renderTextureTools() {
    return (
      <div className="space-y-4">
        {/* File Selection */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload size={20} />
            Select Texture
          </h2>

          {!toolInputFile ? (
            <button
              onClick={handleToolFileSelect}
              className="w-full py-12 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-slate-700/50 transition-all flex flex-col items-center gap-3"
            >
              <ImageIcon size={48} className="text-gray-400" />
              <span className="text-lg text-gray-300">Select Image File</span>
            </button>
          ) : (
            <div className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon size={24} className="text-indigo-400" />
                <span className="font-medium">{toolInputFile.split('\\').pop()}</span>
              </div>
              <button
                onClick={handleToolFileSelect}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Seamless Tiling */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Scissors size={20} />
            Make Seamless
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center justify-between text-sm mb-2">
                <span>Blend Radius</span>
                <span className="text-indigo-400">{seamlessRadius}px</span>
              </label>
              <input
                type="range"
                min="16"
                max="256"
                step="16"
                value={seamlessRadius}
                onChange={(e) => setSeamlessRadius(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleMakeSeamless}
              disabled={!toolInputFile || toolOperation.status === 'processing'}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {toolOperation.type === 'seamless' && toolOperation.status === 'processing' ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Scissors size={18} />
                  Convert to Seamless
                </>
              )}
            </button>

            {toolOperation.type === 'seamless' && toolOperation.status === 'complete' && toolOperation.result && (
              <div className="bg-green-900/20 border border-green-700 rounded p-3 text-sm">
                <p className="text-green-400 font-medium mb-1">✓ Seamless conversion complete!</p>
                <p className="text-gray-300">Output: {toolOperation.result.outputPath}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Upscaler */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ArrowUpCircle size={20} />
            AI Upscaler
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upscale Factor</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setUpscaleFactor(2)}
                  className={`py-2 px-4 rounded ${
                    upscaleFactor === 2
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  2x Upscale
                </button>
                <button
                  onClick={() => setUpscaleFactor(4)}
                  className={`py-2 px-4 rounded ${
                    upscaleFactor === 4
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  4x Upscale
                </button>
              </div>
            </div>

            <button
              onClick={handleUpscale}
              disabled={!toolInputFile || toolOperation.status === 'processing'}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {toolOperation.type === 'upscale' && toolOperation.status === 'processing' ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Upscaling...
                </>
              ) : (
                <>
                  <TrendingUp size={18} />
                  Upscale {upscaleFactor}x
                </>
              )}
            </button>

            {toolOperation.type === 'upscale' && toolOperation.status === 'complete' && toolOperation.result && (
              <div className="bg-green-900/20 border border-green-700 rounded p-3 text-sm">
                <p className="text-green-400 font-medium mb-1">✓ Upscale complete!</p>
                <p className="text-gray-300">
                  {toolOperation.result.originalWidth}x{toolOperation.result.originalHeight} → {toolOperation.result.upscaledWidth}x{toolOperation.result.upscaledHeight}
                </p>
                <p className="text-gray-300">Output: {toolOperation.result.outputPath}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Gallery Tab
  // ============================================================================

  function renderGallery() {
    return (
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FolderOpen size={20} />
            Saved Materials ({savedMaterials.length})
          </h2>

          {savedMaterials.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Package size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No materials saved yet</p>
              <p className="text-sm">Generate materials and save them to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {savedMaterials.map((material, index) => (
                <div
                  key={index}
                  className="bg-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-600 transition-all"
                  onClick={() => setSelectedGalleryItem(material)}
                >
                  <div className="aspect-square bg-slate-600 rounded mb-3 flex items-center justify-center">
                    <Layers size={48} className="text-gray-500" />
                  </div>
                  <p className="font-medium truncate">{material.name}</p>
                  <p className="text-sm text-gray-400">
                    {Object.values(material.maps).filter(m => m?.success).length} maps
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Material Details */}
        {selectedGalleryItem && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedGalleryItem.name}</h2>
              <button
                onClick={() => setSelectedGalleryItem(null)}
                className="p-2 hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {Object.entries(selectedGalleryItem.maps).map(([type, map]) => {
                if (!map) return null;
                return (
                  <div key={type} className="bg-slate-700 rounded p-3">
                    <div className="aspect-square bg-slate-600 rounded mb-2 flex items-center justify-center">
                      {map.success ? (
                        <Check size={24} className="text-green-500" />
                      ) : (
                        <X size={24} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-sm capitalize">{type}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
};
