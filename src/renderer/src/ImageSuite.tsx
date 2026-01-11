import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Image as ImageIcon, Wand2, ScanSearch, Download, Trash2, Layers, Zap, Eye, Upload, UserCheck } from 'lucide-react';
import { useLive } from './LiveContext';

const ImageSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'pbr'>('generate');
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    size: '1K',
    aspectRatio: '1:1'
  });
  
  // For editing & PBR
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  // Global Context for Avatar
  const { setAvatarFromUrl } = useLive();

  // PBR State
  const [pbrMaps, setPbrMaps] = useState<{ normal: string | null, roughness: string | null, height: string | null }>({
      normal: null,
      roughness: null,
      height: null
  });
  const [isProcessingPBR, setIsProcessingPBR] = useState(false);

  useEffect(() => {
      if (sourceImage) {
          const url = URL.createObjectURL(sourceImage);
          setSourcePreview(url);
          return () => URL.revokeObjectURL(url);
      } else {
          setSourcePreview(null);
      }
  }, [sourceImage]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    try {
      if (activeTab === 'generate') {
         if (window.aistudio && !window.aistudio.hasSelectedApiKey()) {
             await window.aistudio.openSelectKey();
         }
         
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         
         const response = await ai.models.generateContent({
             model: 'gemini-3-pro-image-preview',
             contents: { parts: [{ text: prompt }] },
             config: {
                 imageConfig: {
                     aspectRatio: config.aspectRatio,
                     imageSize: config.size
                 }
             }
         });
         
         for (const part of response.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData) {
                 setResultImage(`data:image/png;base64,${part.inlineData.data}`);
                 break;
             }
         }

      } else if (activeTab === 'edit' && sourceImage) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(sourceImage);
        });
        const base64Data = base64.split(',')[1];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: sourceImage.type, data: base64Data } },
                    { text: prompt }
                ]
            }
        });

         for (const part of response.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData) {
                 setResultImage(`data:image/png;base64,${part.inlineData.data}`);
                 break;
             }
         }
      }

    } catch (e) {
      console.error(e);
      alert("Operation failed. See console.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- PBR GENERATION LOGIC ---
  const generatePBRMaps = async () => {
      if (!sourceImage && !resultImage) return;
      setIsProcessingPBR(true);

      const imgSrc = sourcePreview || resultImage;
      if (!imgSrc) return;

      const img = new Image();
      img.src = imgSrc;
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;

      // 1. HEIGHT MAP (Grayscale)
      const heightData = new Uint8ClampedArray(data);
      for (let i = 0; i < data.length; i += 4) {
          // Simple luminance
          const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          heightData[i] = l;
          heightData[i + 1] = l;
          heightData[i + 2] = l;
      }
      const heightCanvas = document.createElement('canvas');
      heightCanvas.width = width;
      heightCanvas.height = height;
      heightCanvas.getContext('2d')?.putImageData(new ImageData(heightData, width, height), 0, 0);
      setPbrMaps(prev => ({ ...prev, height: heightCanvas.toDataURL() }));

      // 2. ROUGHNESS MAP (Inverted Height + Contrast)
      const roughData = new Uint8ClampedArray(data);
      for (let i = 0; i < data.length; i += 4) {
          let l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          l = 255 - l; // Invert
          // Contrast
          l = (l - 128) * 1.5 + 128; 
          l = Math.max(0, Math.min(255, l));
          
          roughData[i] = l;
          roughData[i + 1] = l;
          roughData[i + 2] = l;
      }
      const roughCanvas = document.createElement('canvas');
      roughCanvas.width = width;
      roughCanvas.height = height;
      roughCanvas.getContext('2d')?.putImageData(new ImageData(roughData, width, height), 0, 0);
      setPbrMaps(prev => ({ ...prev, roughness: roughCanvas.toDataURL() }));

      // 3. NORMAL MAP (Sobel)
      const normalData = new Uint8ClampedArray(data);
      const getVal = (x: number, y: number) => {
          x = Math.max(0, Math.min(width - 1, x));
          y = Math.max(0, Math.min(height - 1, y));
          const idx = (y * width + x) * 4;
          return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      };

      for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              // Sobel kernels
              const tl = getVal(x-1, y-1); const t = getVal(x, y-1); const tr = getVal(x+1, y-1);
              const l = getVal(x-1, y);    const r = getVal(x+1, y);
              const bl = getVal(x-1, y+1); const b = getVal(x, y+1); const br = getVal(x+1, y+1);

              const dx = (tr + 2*r + br) - (tl + 2*l + bl);
              const dy = (bl + 2*b + br) - (tl + 2*t + tr);
              const strength = 1.0; 

              let nx = -dx * strength / 255.0;
              let ny = -dy * strength / 255.0;
              let nz = 1.0;

              // Normalize
              const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
              nx /= len; ny /= len; nz /= len;

              // Map to 0-255
              normalData[idx] = (nx + 1) * 127.5;
              normalData[idx+1] = (ny + 1) * 127.5;
              normalData[idx+2] = (nz + 1) * 127.5;
              normalData[idx+3] = 255;
          }
      }
      const normalCanvas = document.createElement('canvas');
      normalCanvas.width = width;
      normalCanvas.height = height;
      normalCanvas.getContext('2d')?.putImageData(new ImageData(normalData, width, height), 0, 0);
      setPbrMaps(prev => ({ ...prev, normal: normalCanvas.toDataURL() }));

      setIsProcessingPBR(false);
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200">
      <div className="flex border-b border-slate-700 bg-forge-panel">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'generate' ? 'border-b-2 border-forge-accent text-forge-accent' : 'text-slate-400 hover:text-white'}`}
        >
          <ImageIcon className="w-5 h-5" /> Generator (Pro)
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'edit' ? 'border-b-2 border-forge-accent text-forge-accent' : 'text-slate-400 hover:text-white'}`}
        >
          <Wand2 className="w-5 h-5" /> Editor (Flash)
        </button>
        <button
          onClick={() => setActiveTab('pbr')}
          className={`flex-1 p-4 flex items-center justify-center gap-2 font-medium ${activeTab === 'pbr' ? 'border-b-2 border-forge-accent text-forge-accent' : 'text-slate-400 hover:text-white'}`}
        >
          <Layers className="w-5 h-5" /> Texture Foundry
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-forge-panel p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-white">
                {activeTab === 'generate' ? 'Create New Image' : activeTab === 'edit' ? 'Edit Existing Image' : 'PBR Map Synthesizer'}
              </h3>
              
              {activeTab === 'pbr' && (
                  <p className="text-xs text-slate-400 mb-4">
                      Automatically generate Normal, Roughness, and Height maps from any source image for game development.
                  </p>
              )}

              {(activeTab === 'edit' || activeTab === 'pbr') && (
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
                  {activeTab === 'pbr' && resultImage && !sourceImage && (
                      <button 
                        onClick={() => {
                             // Use result as source
                        }}
                        className="mt-2 text-xs text-forge-accent hover:underline flex items-center gap-1"
                      >
                          <Zap className="w-3 h-3" /> Use Generated Image as Source
                      </button>
                  )}
                </div>
              )}

              {activeTab !== 'pbr' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Prompt</label>
                    <textarea
                      className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-forge-accent resize-none"
                      placeholder={activeTab === 'generate' 
                        ? "A futuristic fallout shelter with neon lights, 4k render..." 
                        : "Add a red skateboard to the robot..."}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
              )}

              {activeTab === 'generate' && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Aspect Ratio</label>
                    <select 
                      value={config.aspectRatio}
                      onChange={(e) => setConfig({...config, aspectRatio: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="4:3">4:3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Quality</label>
                    <select 
                      value={config.size}
                      onChange={(e) => setConfig({...config, size: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                    >
                      <option value="1K">1K (Standard)</option>
                      <option value="2K">2K (High)</option>
                      <option value="4K">4K (Ultra)</option>
                    </select>
                  </div>
                </div>
              )}
              
              {activeTab === 'pbr' ? (
                  <button
                    onClick={generatePBRMaps}
                    disabled={isProcessingPBR || (!sourceImage && !resultImage)}
                    className="w-full py-3 bg-forge-accent text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessingPBR ? <ScanSearch className="animate-spin" /> : <Layers />}
                    {isProcessingPBR ? 'Synthesizing...' : 'Generate Maps'}
                  </button>
              ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt || (activeTab === 'edit' && !sourceImage)}
                    className="w-full py-3 bg-forge-accent text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? <ScanSearch className="animate-spin" /> : (activeTab === 'generate' ? <ImageIcon /> : <Wand2 />)}
                    {isLoading ? 'Processing...' : (activeTab === 'generate' ? 'Generate' : 'Apply Edits')}
                  </button>
              )}
            </div>
          </div>

          {/* Result Area */}
          <div className="lg:col-span-8">
              {activeTab === 'pbr' ? (
                  <div className="grid grid-cols-2 gap-4 h-full">
                      {/* Source */}
                      <div className="bg-black/50 rounded-xl border border-slate-800 p-4 relative group">
                          <span className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">Diffuse (Color)</span>
                          {sourcePreview || resultImage ? (
                              <img src={sourcePreview || resultImage!} className="w-full h-full object-cover rounded" alt="Diffuse" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-700 rounded"><ImageIcon className="w-8 h-8" /></div>
                          )}
                      </div>

                      {/* Normal Map */}
                      <div className="bg-black/50 rounded-xl border border-slate-800 p-4 relative group">
                          <span className="absolute top-2 left-2 bg-blue-900/80 px-2 py-1 rounded text-xs text-blue-100">Normal Map</span>
                          {pbrMaps.normal ? (
                              <>
                                <img src={pbrMaps.normal} className="w-full h-full object-cover rounded" alt="Normal" />
                                <a href={pbrMaps.normal} download="normal_map.png" className="absolute bottom-2 right-2 p-2 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-4 h-4"/></a>
                              </>
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700 text-sm">Generated Normal Map</div>
                          )}
                      </div>

                      {/* Roughness Map */}
                      <div className="bg-black/50 rounded-xl border border-slate-800 p-4 relative group">
                           <span className="absolute top-2 left-2 bg-gray-700/80 px-2 py-1 rounded text-xs text-gray-200">Roughness</span>
                           {pbrMaps.roughness ? (
                              <>
                                <img src={pbrMaps.roughness} className="w-full h-full object-cover rounded" alt="Roughness" />
                                <a href={pbrMaps.roughness} download="roughness_map.png" className="absolute bottom-2 right-2 p-2 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-4 h-4"/></a>
                              </>
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700 text-sm">Generated Roughness</div>
                          )}
                      </div>

                      {/* Height Map */}
                      <div className="bg-black/50 rounded-xl border border-slate-800 p-4 relative group">
                           <span className="absolute top-2 left-2 bg-gray-700/80 px-2 py-1 rounded text-xs text-gray-200">Height / Displacement</span>
                           {pbrMaps.height ? (
                              <>
                                <img src={pbrMaps.height} className="w-full h-full object-cover rounded" alt="Height" />
                                <a href={pbrMaps.height} download="height_map.png" className="absolute bottom-2 right-2 p-2 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-4 h-4"/></a>
                              </>
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700 text-sm">Generated Height Map</div>
                          )}
                      </div>
                  </div>
              ) : (
                <div className="bg-black/50 rounded-xl border border-slate-800 flex items-center justify-center p-2 relative h-full min-h-[400px]">
                    {resultImage ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                        <img src={resultImage} alt="Generated" className="max-w-full max-h-[600px] rounded shadow-2xl object-contain" />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Set as Avatar Button */}
                            <button 
                                onClick={() => setAvatarFromUrl(resultImage)}
                                className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 shadow-lg"
                                title="Set as Mossy's Face"
                            >
                                <UserCheck className="w-5 h-5" />
                            </button>
                            
                            <a href={resultImage} download="omniforge-art.png" className="p-2 bg-white text-black rounded-full hover:bg-slate-200">
                                <Download className="w-5 h-5" />
                            </a>
                            <button onClick={() => {
                                // Send to PBR
                                setActiveTab('pbr');
                            }} className="p-2 bg-forge-accent text-black rounded-full hover:bg-sky-400" title="Generate Textures">
                                <Layers className="w-5 h-5" />
                            </button>
                            <button onClick={() => setResultImage(null)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    ) : (
                    <div className="text-slate-600 flex flex-col items-center">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Output will appear here</p>
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