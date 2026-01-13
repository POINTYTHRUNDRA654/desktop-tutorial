import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Wand2, ScanSearch, Download, Trash2, Layers, Zap, Eye, Upload, UserCheck } from 'lucide-react';
import { useLive } from './LiveContext';

const ImageSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pbr' | 'convert'>('pbr');
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [isProcessingPBR, setIsProcessingPBR] = useState(false);
  const [conversionFormat, setConversionFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  
  // Global Context for Avatar
  const { setAvatarFromUrl } = useLive();

  // PBR State
  const [pbrMaps, setPbrMaps] = useState<{
    normal: string | null;
    roughness: string | null;
    height: string | null;
    metallic: string | null;
    ao: string | null;
  }>({
    normal: null,
    roughness: null,
    height: null,
    metallic: null,
    ao: null
  });

  useEffect(() => {
    if (sourceImage) {
      const url = URL.createObjectURL(sourceImage);
      setSourcePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSourcePreview(null);
    }
  }, [sourceImage]);

  // --- REAL PBR GENERATION VIA IPC ---
  const generatePBRMaps = async () => {
    if (!sourceImage && !sourcePreview) return;
    setIsProcessingPBR(true);

    try {
      const file = sourceImage;
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          // Call IPC handlers in parallel for all maps
          const [normal, roughness, height, metallic, ao] = await Promise.all([
            window.electron.api.generateNormalMap(base64Data),
            window.electron.api.generateRoughnessMap(base64Data),
            window.electron.api.generateHeightMap(base64Data),
            window.electron.api.generateMetallicMap(base64Data),
            window.electron.api.generateAOMap(base64Data)
          ]);
          
          setPbrMaps({
            normal,
            roughness,
            height,
            metallic,
            ao
          });
        } catch (err) {
          console.error('PBR generation error:', err);
          alert('Failed to generate PBR maps. Check console for details.');
        } finally {
          setIsProcessingPBR(false);
        }
      };
      
      reader.readAsDataURL(file || (sourcePreview ? await fetch(sourcePreview).then(r => r.blob()) : null) as Blob);
    } catch (err) {
      console.error('File reading error:', err);
      setIsProcessingPBR(false);
    }
  };

  // --- FORMAT CONVERSION ---
  const convertImageFormat = async () => {
    if (!sourceImage && !sourcePreview) return;
    setIsConverting(true);

    try {
      const file = sourceImage;
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          const converted = await window.electron.api.convertImageFormat(base64Data, conversionFormat, {});
          
          // Download the converted file
          const link = document.createElement('a');
          link.href = converted;
          link.download = `converted-image.${conversionFormat.toLowerCase()}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Format conversion error:', err);
          alert('Failed to convert image format. Check console for details.');
        } finally {
          setIsConverting(false);
        }
      };
      
      reader.readAsDataURL(file || (sourcePreview ? await fetch(sourcePreview).then(r => r.blob()) : null) as Blob);
    } catch (err) {
      console.error('File reading error:', err);
      setIsConverting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200">
      <div className="flex border-b border-slate-700 bg-forge-panel">
        <button
          onClick={() => setActiveTab('pbr')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'pbr' ? 'border-b-2 border-forge-accent text-forge-accent' : 'text-slate-400 hover:text-white'}`}
        >
          <Layers className="w-5 h-5" /> PBR Synthesizer
        </button>
        <button
          onClick={() => setActiveTab('convert')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'convert' ? 'border-b-2 border-forge-accent text-forge-accent' : 'text-slate-400 hover:text-white'}`}
        >
          <ScanSearch className="w-5 h-5" /> Format Converter
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-forge-panel p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-white">
                {activeTab === 'pbr' ? 'PBR Map Synthesizer' : 'Format Converter'}
              </h3>
              
              {activeTab === 'pbr' && (
                <p className="text-xs text-slate-400 mb-4">
                  Automatically generate Normal, Roughness, Height, Metallic, and Ambient Occlusion maps from any source image for game-ready textures.
                </p>
              )}
              
              {activeTab === 'convert' && (
                <p className="text-xs text-slate-400 mb-4">
                  Convert textures between PNG, JPG, TGA, and DDS formats with customizable compression options.
                </p>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">Source Image</label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-forge-accent cursor-pointer transition-colors relative h-32 flex items-center justify-center">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={(e) => e.target.files && setSourceImage(e.target.files[0])}
                  />
                  {sourceImage ? (
                    <div className="relative z-10">
                      <div className="text-forge-accent font-medium truncate max-w-[200px]">{sourceImage.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{(sourceImage.size / 1024).toFixed(0)} KB</div>
                    </div>
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center">
                      <Upload className="w-8 h-8 mb-2 opacity-50" />
                      Drag & drop or click
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'convert' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Target Format</label>
                  <select 
                    value={conversionFormat}
                    onChange={(e) => setConversionFormat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpg">JPG (Lossy)</option>
                    <option value="tga">TGA (Uncompressed)</option>
                    <option value="dds">DDS (BC1/BC3 Compressed)</option>
                  </select>
                </div>
              )}
              
              {activeTab === 'pbr' ? (
                <button
                  onClick={generatePBRMaps}
                  disabled={isProcessingPBR || !sourceImage}
                  className="w-full py-3 bg-forge-accent text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingPBR ? <ScanSearch className="animate-spin" /> : <Layers />}
                  {isProcessingPBR ? 'Synthesizing Maps...' : 'Generate PBR Maps'}
                </button>
              ) : (
                <button
                  onClick={convertImageFormat}
                  disabled={isConverting || !sourceImage}
                  className="w-full py-3 bg-forge-accent text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isConverting ? <ScanSearch className="animate-spin" /> : <Download />}
                  {isConverting ? 'Converting...' : 'Convert & Download'}
                </button>
              )}
            </div>
          </div>

          {/* Result Area */}
          <div className="lg:col-span-8">
            {activeTab === 'pbr' ? (
              <div className="grid grid-cols-3 gap-3 h-full">
                {/* Source */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group col-span-1 row-span-2">
                  <span className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white z-10">Source</span>
                  {sourcePreview ? (
                    <img src={sourcePreview} className="w-full h-full object-cover rounded" alt="Source" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-700 rounded">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Normal Map */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group">
                  <span className="absolute top-2 left-2 bg-blue-900/80 px-2 py-1 rounded text-xs text-blue-100 z-10">Normal</span>
                  {pbrMaps.normal ? (
                    <>
                      <img src={pbrMaps.normal} className="w-full h-32 object-cover rounded" alt="Normal" />
                      <a href={pbrMaps.normal} download="normal_map.png" className="absolute bottom-2 right-2 p-1 bg-white text-black rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3"/>
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-700 text-xs">Normal Map</div>
                  )}
                </div>

                {/* Roughness Map */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group">
                  <span className="absolute top-2 left-2 bg-gray-700/80 px-2 py-1 rounded text-xs text-gray-200 z-10">Roughness</span>
                  {pbrMaps.roughness ? (
                    <>
                      <img src={pbrMaps.roughness} className="w-full h-32 object-cover rounded" alt="Roughness" />
                      <a href={pbrMaps.roughness} download="roughness_map.png" className="absolute bottom-2 right-2 p-1 bg-white text-black rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3"/>
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-700 text-xs">Roughness</div>
                  )}
                </div>

                {/* Height Map */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group">
                  <span className="absolute top-2 left-2 bg-purple-700/80 px-2 py-1 rounded text-xs text-purple-200 z-10">Height</span>
                  {pbrMaps.height ? (
                    <>
                      <img src={pbrMaps.height} className="w-full h-32 object-cover rounded" alt="Height" />
                      <a href={pbrMaps.height} download="height_map.png" className="absolute bottom-2 right-2 p-1 bg-white text-black rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3"/>
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-700 text-xs">Height</div>
                  )}
                </div>

                {/* Metallic Map */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group">
                  <span className="absolute top-2 left-2 bg-yellow-700/80 px-2 py-1 rounded text-xs text-yellow-200 z-10">Metallic</span>
                  {pbrMaps.metallic ? (
                    <>
                      <img src={pbrMaps.metallic} className="w-full h-32 object-cover rounded" alt="Metallic" />
                      <a href={pbrMaps.metallic} download="metallic_map.png" className="absolute bottom-2 right-2 p-1 bg-white text-black rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3"/>
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-700 text-xs">Metallic</div>
                  )}
                </div>

                {/* AO Map */}
                <div className="bg-black/50 rounded-xl border border-slate-800 p-3 relative group">
                  <span className="absolute top-2 left-2 bg-amber-700/80 px-2 py-1 rounded text-xs text-amber-200 z-10">Ambient Occlusion</span>
                  {pbrMaps.ao ? (
                    <>
                      <img src={pbrMaps.ao} className="w-full h-32 object-cover rounded" alt="AO" />
                      <a href={pbrMaps.ao} download="ao_map.png" className="absolute bottom-2 right-2 p-1 bg-white text-black rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3"/>
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-slate-700 text-xs">Ambient Occlusion</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-black/50 rounded-xl border border-slate-800 flex items-center justify-center p-4 relative h-full min-h-[400px]">
                {sourcePreview ? (
                  <div className="relative group w-full h-full flex items-center justify-center">
                    <img src={sourcePreview} alt="Preview" className="max-w-full max-h-[500px] rounded shadow-2xl object-contain" />
                  </div>
                ) : (
                  <div className="text-slate-600 flex flex-col items-center">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p>Image preview will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageSuite;