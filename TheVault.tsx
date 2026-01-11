import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Container, Search, Filter, FolderPlus, Tag, HardDrive, FileImage, FileAudio, FileCode, BrainCircuit, RefreshCw, Eye, Grid, List, Scan, Check, Box, Lock, Globe, ShieldCheck, FileKey } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'audio' | 'model' | 'script';
  tags: string[];
  previewUrl?: string;
  size: string;
  analyzed: boolean;
  privacy: 'local' | 'shared'; // New privacy field
}

const initialAssets: Asset[] = [
    { id: '1', name: 'personal_photo_001.png', path: 'C:/Users/Admin/Pictures', type: 'image', tags: ['personal', 'photo'], previewUrl: 'https://placehold.co/400x400/1e293b/475569?text=Private+Photo', size: '2.4 MB', analyzed: false, privacy: 'local' },
    { id: '2', name: 'mod_tutorial_01.mp4', path: 'D:/Downloads/Tutorials', type: 'audio', tags: ['tutorial', 'learning'], size: '45.0 MB', analyzed: true, privacy: 'shared' },
    { id: '3', name: 'char_cyber_ninja.nif', path: 'D:/Assets/Models', type: 'model', tags: [], size: '14.2 MB', analyzed: false, privacy: 'local' },
    { id: '4', name: 'react_docs_pdf', path: 'D:/Docs', type: 'image', tags: ['docs', 'reference'], previewUrl: 'https://placehold.co/400x400/0f172a/38bdf8?text=React+Docs', size: '1.1 MB', analyzed: true, privacy: 'shared' },
    { id: '5', name: 'secrets_config.json', path: 'C:/Dev/Keys', type: 'script', tags: ['config', 'keys'], size: '4 KB', analyzed: false, privacy: 'local' },
];

const TheVault: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'local' | 'shared'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sanitizePII, setSanitizePII] = useState(true);

  // Filter Logic
  const filteredAssets = assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || asset.type === filterType;
      const matchesPrivacy = privacyFilter === 'all' || asset.privacy === privacyFilter;
      return matchesSearch && matchesType && matchesPrivacy;
  });

  // --- AI Logic ---

  const handleScanFolder = () => {
      setIsScanning(true);
      // Simulate scanning disk
      setTimeout(() => {
          const newAssets: Asset[] = [
              { id: `new-${Date.now()}-1`, name: 'bank_statement.pdf', path: 'C:/Documents', type: 'image', tags: [], previewUrl: 'https://placehold.co/400x300/3f3f46/71717a?text=Sensitive+Doc', size: '3.1 MB', analyzed: false, privacy: 'local' },
              { id: `new-${Date.now()}-2`, name: 'open_source_lib.zip', path: 'D:/OSS', type: 'audio', tags: [], size: '1.2 MB', analyzed: false, privacy: 'shared' },
          ];
          setAssets(prev => [...prev, ...newAssets]);
          setIsScanning(false);
      }, 1500);
  };

  const handleAnalyze = async (asset: Asset) => {
      if (asset.analyzed) return;
      
      setAnalyzingIds(prev => new Set(prev).add(asset.id));
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          let generatedTags: string[] = [];
          
          // Simulation of analysis
          await new Promise(r => setTimeout(r, 1200));
          
          if (asset.privacy === 'local' && sanitizePII) {
              // Simulate PII scrubbing
              generatedTags = ['[PII_REDACTED]', 'private_data', 'secure_storage'];
          } else {
              generatedTags = ['analyzed', 'content_verified', 'public_safe'];
          }

          setAssets(prev => prev.map(a => 
              a.id === asset.id 
              ? { ...a, analyzed: true, tags: [...a.tags, ...generatedTags] }
              : a
          ));
      } catch (e) {
          console.error("Analysis failed", e);
      } finally {
          setAnalyzingIds(prev => {
              const next = new Set(prev);
              next.delete(asset.id);
              return next;
          });
      }
  };

  const handleAnalyzeAll = () => {
      const unanalyzed = assets.filter(a => !a.analyzed);
      unanalyzed.forEach(a => handleAnalyze(a));
  };

  const togglePrivacy = (id: string) => {
      setAssets(prev => prev.map(a => a.id === id ? { ...a, privacy: a.privacy === 'local' ? 'shared' : 'local' } : a));
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-forge-panel flex flex-col gap-4 shadow-md z-10">
          <div className="flex justify-between items-center">
              <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Container className="w-6 h-6 text-forge-accent" />
                      The Vault
                  </h1>
                  <p className="text-xs text-slate-400 font-mono mt-1">Secure Asset Management & Privacy Partition</p>
              </div>
              <div className="flex gap-2">
                  <button 
                      onClick={() => setSanitizePII(!sanitizePII)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
                          sanitizePII 
                          ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' 
                          : 'bg-slate-800 border-slate-600 text-slate-400'
                      }`}
                      title="Automatically redact personal info during analysis"
                  >
                      {sanitizePII ? <ShieldCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 opacity-50" />}
                      {sanitizePII ? 'PII Scrubbing: ON' : 'PII Scrubbing: OFF'}
                  </button>
                  <div className="h-8 w-px bg-slate-700 mx-2"></div>
                  <button 
                      onClick={handleScanFolder}
                      disabled={isScanning}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-bold transition-colors"
                  >
                      {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                      {isScanning ? 'Scanning...' : 'Index Local'}
                  </button>
                  <button 
                      onClick={handleAnalyzeAll}
                      className="flex items-center gap-2 px-4 py-2 bg-forge-accent hover:bg-sky-400 text-slate-900 rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                  >
                      <BrainCircuit className="w-4 h-4" />
                      Auto-Tag
                  </button>
              </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-4">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                      type="text" 
                      placeholder="Search secure assets..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-forge-accent text-slate-200"
                  />
              </div>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                  <button 
                      onClick={() => setPrivacyFilter('all')}
                      className={`px-3 py-1 text-xs rounded font-medium transition-colors ${privacyFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      All
                  </button>
                  <button 
                      onClick={() => setPrivacyFilter('local')}
                      className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${privacyFilter === 'local' ? 'bg-red-900/50 text-red-200' : 'text-slate-500 hover:text-red-400'}`}
                  >
                      <Lock className="w-3 h-3" /> Local
                  </button>
                  <button 
                      onClick={() => setPrivacyFilter('shared')}
                      className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${privacyFilter === 'shared' ? 'bg-blue-900/50 text-blue-200' : 'text-slate-500 hover:text-blue-400'}`}
                  >
                      <Globe className="w-3 h-3" /> Shared
                  </button>
              </div>
              <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-forge-accent"
              >
                  <option value="all">All Types</option>
                  <option value="image">Images</option>
                  <option value="audio">Audio</option>
                  <option value="model">3D Models</option>
                  <option value="script">Scripts</option>
              </select>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                      <Grid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                      <List className="w-4 h-4" />
                  </button>
              </div>
          </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0c1220]">
          {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                  <HardDrive className="w-12 h-12 mb-4 opacity-20" />
                  <p>No assets found matching your security criteria.</p>
              </div>
          ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredAssets.map(asset => (
                      <div key={asset.id} className={`group relative bg-slate-800/50 border rounded-xl overflow-hidden hover:border-forge-accent transition-all hover:shadow-xl ${asset.privacy === 'local' ? 'border-red-900/30' : 'border-slate-700'}`}>
                          {/* Preview Area */}
                          <div className="aspect-square bg-slate-900 relative overflow-hidden flex items-center justify-center">
                              {asset.previewUrl ? (
                                  <img src={asset.previewUrl} alt={asset.name} className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${asset.privacy === 'local' ? 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100' : ''}`} />
                              ) : (
                                  <div className="text-slate-600">
                                      {asset.type === 'audio' ? <FileAudio className="w-12 h-12" /> :
                                       asset.type === 'model' ? <Box className="w-12 h-12" /> :
                                       <FileCode className="w-12 h-12" />}
                                  </div>
                              )}
                              
                              {/* Overlay Actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button className="p-2 bg-slate-700 hover:bg-white hover:text-black rounded-full transition-colors" title="Preview">
                                      <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={() => togglePrivacy(asset.id)}
                                      className={`p-2 rounded-full transition-colors ${asset.privacy === 'local' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`} 
                                      title={asset.privacy === 'local' ? 'Make Shared' : 'Make Local Only'}
                                  >
                                      {asset.privacy === 'local' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                  </button>
                              </div>

                              {/* Privacy Badge */}
                              <div className={`absolute top-2 right-2 px-2 py-0.5 backdrop-blur rounded text-[10px] uppercase font-bold flex items-center gap-1 ${
                                  asset.privacy === 'local' ? 'bg-red-900/80 text-red-200 border border-red-500/50' : 'bg-blue-900/80 text-blue-200 border border-blue-500/50'
                              }`}>
                                  {asset.privacy === 'local' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                  {asset.privacy}
                              </div>
                          </div>

                          {/* Info Area */}
                          <div className="p-3">
                              <div className="font-medium text-sm text-slate-200 truncate mb-1" title={asset.name}>{asset.name}</div>
                              <div className="flex flex-wrap gap-1 mb-2 h-12 overflow-hidden content-start">
                                  {asset.tags.length > 0 ? (
                                      asset.tags.map((tag, i) => (
                                          <span key={i} className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-[10px] hover:text-white cursor-default">
                                              #{tag}
                                          </span>
                                      ))
                                  ) : (
                                      <span className="text-[10px] text-slate-600 italic flex items-center gap-1">
                                          <Scan className="w-3 h-3" /> Untagged
                                      </span>
                                  )}
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-700 pt-2">
                                  <span className="truncate max-w-[100px]">{asset.size}</span>
                                  {asset.analyzed && <span className="flex items-center gap-1 text-emerald-500"><Check className="w-3 h-3" /> Indexed</span>}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              // List View
              <div className="flex flex-col gap-2">
                  {filteredAssets.map(asset => (
                      <div key={asset.id} className={`flex items-center gap-4 p-3 bg-slate-800/50 border rounded-lg hover:bg-slate-800 transition-colors group ${asset.privacy === 'local' ? 'border-red-900/30' : 'border-slate-700'}`}>
                          <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center shrink-0">
                               {asset.type === 'image' ? <FileImage className="w-5 h-5 text-purple-400" /> :
                                asset.type === 'audio' ? <FileAudio className="w-5 h-5 text-yellow-400" /> :
                                asset.type === 'model' ? <Box className="w-5 h-5 text-blue-400" /> :
                                <FileCode className="w-5 h-5 text-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-slate-200 truncate">{asset.name}</span>
                                  <div className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${asset.privacy === 'local' ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-blue-900/20 text-blue-400 border-blue-900/50'}`}>
                                      {asset.privacy}
                                  </div>
                              </div>
                              <div className="text-xs text-slate-500 truncate font-mono">{asset.path}</div>
                          </div>
                          <div className="flex gap-2 max-w-[30%] flex-wrap justify-end">
                              {asset.tags.slice(0, 4).map((tag, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-[10px]">
                                      #{tag}
                                  </span>
                              ))}
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="text-xs text-slate-500 w-16 text-right">{asset.size}</div>
                              <button 
                                  onClick={() => togglePrivacy(asset.id)}
                                  className={`p-1.5 rounded transition-colors ${asset.privacy === 'local' ? 'text-red-500 hover:bg-red-900/20' : 'text-blue-500 hover:bg-blue-900/20'}`}
                              >
                                  {asset.privacy === 'local' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default TheVault;