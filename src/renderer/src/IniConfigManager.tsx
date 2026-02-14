import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Monitor, 
  Zap, 
  Save, 
  RotateCcw, 
  Upload, 
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
interface IniFile {
  name: string;
  path: string;
  content: string;
  lastModified?: Date;
}

interface IniParameter {
  file: string;
  section: string;
  key: string;
  value: string;
  currentValue?: string;
  recommendedValue?: string;
  reason?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  modRequirement?: string;
}

interface HardwareProfile {
  cpu?: string;
  ram?: number;
  gpu?: string;
  vram?: number;
  resolution?: string;
}

interface Preset {
  name: string;
  description: string;
  icon: string;
  targetHardware: 'low' | 'medium' | 'high' | 'ultra';
  settings: IniParameter[];
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

const IniConfigManager: React.FC = () => {
  // State
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [iniFiles, setIniFiles] = useState<IniFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<IniFile | null>(null);
  const [parameters, setParameters] = useState<IniParameter[]>([]);
  const [recommendations, setRecommendations] = useState<IniParameter[]>([]);
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const contentRef = useRef<HTMLDivElement>(null);
  
  // API
  const api = (window as any).electron?.api || (window as any).electronAPI;

  // Presets
  const presets: Preset[] = [
    {
      name: 'Best Performance',
      description: 'Maximize FPS, lower visual quality',
      icon: '⚡',
      targetHardware: 'low',
      settings: []
    },
    {
      name: 'Balanced',
      description: 'Good mix of performance and visuals',
      icon: '⚖️',
      targetHardware: 'medium',
      settings: []
    },
    {
      name: 'Best Visuals',
      description: 'Maximum visual quality',
      icon: '🎨',
      targetHardware: 'high',
      settings: []
    }
  ];

  // Effects
  useEffect(() => {
    loadHardwareProfile();
    scanForIniFiles();
  }, []);

  // Methods
  const loadHardwareProfile = async () => {
    try {
      if (api?.iniConfigManager?.getHardwareProfile) {
        const profile = await api.iniConfigManager.getHardwareProfile();
        setHardwareProfile(profile);
      } else if (api?.getSystemInfo) {
        const systemInfo = await api.getSystemInfo();
        setHardwareProfile({
          cpu: systemInfo?.cpu?.model || 'Unknown CPU',
          ram: systemInfo?.mem?.total ? Math.round(systemInfo.mem.total / (1024 ** 3)) : 0,
          gpu: systemInfo?.graphics?.[0]?.model || 'Unknown GPU',
          vram: systemInfo?.graphics?.[0]?.vram || 0,
          resolution: `${systemInfo?.display?.primary?.bounds?.width || 1920}x${systemInfo?.display?.primary?.bounds?.height || 1080}`
        });
      }
    } catch (error) {
      console.error('Failed to load hardware profile:', error);
    }
  };

  const scanForIniFiles = async () => {
    setIsScanning(true);
    try {
      // Use the new INI Manager API to find files
      if (api?.iniConfigManager?.findFiles) {
        const results = await api.iniConfigManager.findFiles();
        const foundFiles: IniFile[] = [];
        
        // Read content for files that exist
        for (const result of results) {
          if (result.exists) {
            try {
              const content = await api.iniConfigManager.readFile(result.path);
              foundFiles.push({
                name: result.name,
                path: result.path,
                content,
                lastModified: new Date()
              });
            } catch (err) {
              console.error(`Failed to read ${result.name}:`, err);
            }
          }
        }

        setIniFiles(foundFiles);
        if (foundFiles.length > 0) {
          setSelectedFile(foundFiles[0]);
          analyzeFile(foundFiles[0]);
        } else {
          showMessage('info', 'No INI files found. Please ensure Fallout 4 is installed.');
        }
      } else {
        showMessage('error', 'INI Manager API not available');
      }
    } catch (error) {
      console.error('Failed to scan for INI files:', error);
      showMessage('error', 'Failed to scan for INI files');
    } finally {
      setIsScanning(false);
    }
  };

  const analyzeFile = async (file: IniFile) => {
    setIsAnalyzing(true);
    try {
      // Parse INI file
      const parsed = parseIniContent(file.content);
      setParameters(parsed);

      // Generate recommendations based on hardware
      const recs = generateRecommendations(parsed, hardwareProfile);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to analyze file:', error);
      showMessage('error', 'Failed to analyze INI file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseIniContent = (content: string): IniParameter[] => {
    const lines = content.split('\n');
    const params: IniParameter[] = [];
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Section header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
      }
      // Key-value pair
      else if (trimmed.includes('=') && !trimmed.startsWith(';')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        
        params.push({
          file: selectedFile?.name || '',
          section: currentSection,
          key: key.trim(),
          value,
          currentValue: value,
          severity: 'info'
        });
      }
    }

    return params;
  };

  const generateRecommendations = (params: IniParameter[], hardware: HardwareProfile | null): IniParameter[] => {
    if (!hardware) return [];

    const recs: IniParameter[] = [];
    
    // Resolution recommendation
    const resolutionWidth = params.find(p => p.key === 'iSize W' && p.section === 'Display');
    const resolutionHeight = params.find(p => p.key === 'iSize H' && p.section === 'Display');
    
    if (resolutionWidth && hardware.resolution) {
      const [targetW, targetH] = hardware.resolution.split('x').map(Number);
      if (parseInt(resolutionWidth.value) !== targetW) {
        recs.push({
          ...resolutionWidth,
          recommendedValue: targetW.toString(),
          reason: `Your monitor is ${hardware.resolution}`,
          severity: 'warning'
        });
      }
    }

    // Shadow quality based on GPU
    const shadowQuality = params.find(p => p.key === 'iShadowMapResolution' && p.section === 'Display');
    if (shadowQuality && hardware.vram) {
      const currentVal = parseInt(shadowQuality.value);
      let recommended = 2048;
      
      if (hardware.vram >= 8192) {
        recommended = 4096;
      } else if (hardware.vram >= 4096) {
        recommended = 2048;
      } else {
        recommended = 1024;
      }

      if (currentVal !== recommended) {
        recs.push({
          ...shadowQuality,
          recommendedValue: recommended.toString(),
          reason: `Your GPU has ${hardware.vram}MB VRAM`,
          severity: currentVal > recommended ? 'warning' : 'info'
        });
      }
    }

    // ENB requirement check
    const floatPoint = params.find(p => p.key === 'bFloatPointRenderTarget' && p.section === 'Display');
    if (floatPoint && floatPoint.value === '0') {
      recs.push({
        ...floatPoint,
        recommendedValue: '1',
        reason: 'Required for ENB and some visual mods',
        severity: 'info',
        modRequirement: 'ENB'
      });
    }

    return recs;
  };

  const applyPreset = (preset: Preset) => {
    showMessage('info', `Applying ${preset.name} preset...`);
    
    // Apply each setting from the preset to the parameters
    if (preset.settings && preset.settings.length > 0) {
      const updated = parameters.map(p => {
        const presetSetting = preset.settings.find(
          s => s.file === p.file && s.section === p.section && s.key === p.key
        );
        
        if (presetSetting) {
          // Update both value (file content) and currentValue (UI display) to keep them in sync
          return { ...p, value: presetSetting.value, currentValue: presetSetting.value };
        }
        return p;
      });
      
      setParameters(updated);
      showMessage('success', `Applied ${preset.name} preset successfully`);
    } else {
      // If preset has no settings, show a message
      showMessage('info', `${preset.name} preset has no settings configured yet`);
    }
  };

  const applyRecommendation = (rec: IniParameter) => {
    const updated = parameters.map(p => 
      p.section === rec.section && p.key === rec.key
        ? { ...p, value: rec.recommendedValue || p.value, currentValue: rec.recommendedValue || p.value }
        : p
    );
    setParameters(updated);
    
    // Remove from recommendations
    setRecommendations(recommendations.filter(r => r !== rec));
    showMessage('success', `Applied: ${rec.key} = ${rec.recommendedValue}`);
  };

  const applyAllRecommendations = () => {
    recommendations.forEach(rec => {
      const updated = parameters.map(p =>
        p.section === rec.section && p.key === rec.key
          ? { ...p, value: rec.recommendedValue || p.value, currentValue: rec.recommendedValue || p.value }
          : p
      );
      setParameters(updated);
    });
    
    setRecommendations([]);
    showMessage('success', 'Applied all recommendations');
  };

  const saveChanges = async () => {
    if (!selectedFile) return;
    
    setIsSaving(true);
    try {
      // Backup file first
      if (api?.iniConfigManager?.backupFile) {
        await api.iniConfigManager.backupFile(selectedFile.path);
      }
      
      // Reconstruct INI content
      const content = reconstructIniContent(parameters);
      
      // Save file using INI Manager API
      if (api?.iniConfigManager?.writeFile) {
        const success = await api.iniConfigManager.writeFile(selectedFile.path, content);
        if (success) {
          showMessage('success', 'INI file saved successfully (backup created)');
        } else {
          showMessage('error', 'Failed to save INI file');
        }
      } else {
        showMessage('error', 'INI Manager API not available');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      showMessage('error', 'Failed to save INI file');
    } finally {
      setIsSaving(false);
    }
  };

  const reconstructIniContent = (params: IniParameter[]): string => {
    const sections = new Map<string, IniParameter[]>();
    
    params.forEach(p => {
      if (!sections.has(p.section)) {
        sections.set(p.section, []);
      }
      sections.get(p.section)?.push(p);
    });

    let content = '';
    sections.forEach((params, section) => {
      content += `[${section}]\n`;
      params.forEach(p => {
        content += `${p.key}=${p.value}\n`;
      });
      content += '\n';
    });

    return content;
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Render: Beginner Mode
  const renderBeginnerMode = () => (
    <div className="space-y-6">
      {/* Hardware Detection */}
      <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-bold text-white">Your Hardware</h3>
        </div>
        
        {hardwareProfile ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">GPU:</span>
              <span className="ml-2 text-white font-mono">{hardwareProfile.gpu || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-400">VRAM:</span>
              <span className="ml-2 text-white font-mono">{hardwareProfile.vram || 0} MB</span>
            </div>
            <div>
              <span className="text-slate-400">RAM:</span>
              <span className="ml-2 text-white font-mono">{hardwareProfile.ram || 0} GB</span>
            </div>
            <div>
              <span className="text-slate-400">Monitor:</span>
              <span className="ml-2 text-white font-mono">{hardwareProfile.resolution || 'Unknown'}</span>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">Detecting hardware...</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">🎯 What do you want?</h3>
        
        <div className="grid grid-cols-1 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-4 p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-green-500/50 rounded-lg transition-all text-left"
            >
              <span className="text-3xl">{preset.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-white">{preset.name}</div>
                <div className="text-sm text-slate-400">{preset.description}</div>
              </div>
              <Zap className="w-5 h-5 text-green-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Configure */}
      {recommendations.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold text-white">Found {recommendations.length} Improvements</h3>
            </div>
            <button
              onClick={applyAllRecommendations}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all font-bold"
            >
              Apply All
            </button>
          </div>
          <p className="text-sm text-slate-300">
            We found settings that don't match your hardware. Click "Apply All" to optimize automatically.
          </p>
        </div>
      )}
    </div>
  );

  // Render: Intermediate Mode
  const renderIntermediateMode = () => (
    <div className="space-y-6">
      {/* Current vs Recommended */}
      <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Current vs Recommended Settings</h3>
        
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p>All settings look good!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-white mb-1">
                      {rec.key}
                      {rec.modRequirement && (
                        <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          Required by {rec.modRequirement}
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Current:</span>
                        <span className="text-red-400 font-mono">{rec.currentValue}</span>
                        {rec.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Recommended:</span>
                        <span className="text-green-400 font-mono">{rec.recommendedValue}</span>
                      </div>
                      {rec.reason && (
                        <div className="text-slate-400 text-xs mt-2">
                          💡 {rec.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => applyRecommendation(rec)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render: Advanced Mode
  const renderAdvancedMode = () => (
    <div className="space-y-6">
      {/* Raw Editor */}
      <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">📝 Raw INI Editor</h3>
        
        {selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Info className="w-4 h-4" />
              <span>File: {selectedFile.path}</span>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {Array.from(new Set(parameters.map(p => p.section))).map(section => (
                <div key={section} className="bg-slate-900/50 border border-slate-700 rounded-lg">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-all"
                  >
                    <span className="font-bold text-green-400">[{section}]</span>
                    {expandedSections.has(section) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  
                  {expandedSections.has(section) && (
                    <div className="p-3 pt-0 space-y-1">
                      {parameters
                        .filter(p => p.section === section)
                        .map((param, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm font-mono">
                            <span className="text-slate-400">{param.key}=</span>
                            <input
                              type="text"
                              value={param.value}
                              onChange={(e) => {
                                const updated = parameters.map(p =>
                                  p === param ? { ...p, value: e.target.value } : p
                                );
                                setParameters(updated);
                              }}
                              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white focus:border-green-500 focus:outline-none"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-green-900/30 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">INI Configuration Manager</h1>
              <p className="text-sm text-slate-400">Optimize your Fallout 4 settings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={saveChanges}
              disabled={isSaving || !selectedFile}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all font-bold"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Skill Level Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSkillLevel('beginner')}
            className={`px-4 py-2 rounded-lg transition-all font-bold ${
              skillLevel === 'beginner'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            🟢 Easy Mode
          </button>
          <button
            onClick={() => setSkillLevel('intermediate')}
            className={`px-4 py-2 rounded-lg transition-all font-bold ${
              skillLevel === 'intermediate'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            🟡 Standard
          </button>
          <button
            onClick={() => setSkillLevel('advanced')}
            className={`px-4 py-2 rounded-lg transition-all font-bold ${
              skillLevel === 'advanced'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            🔴 Expert
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`px-6 py-3 border-b ${
            message.type === 'success'
              ? 'bg-green-900/20 border-green-500/30 text-green-300'
              : message.type === 'error'
              ? 'bg-red-900/20 border-red-500/30 text-red-300'
              : 'bg-blue-900/20 border-blue-500/30 text-blue-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
        {isScanning ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
              <p className="text-slate-400">Scanning for INI files...</p>
            </div>
          </div>
        ) : iniFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No INI Files Found</h3>
              <p className="text-slate-400 mb-4">
                Could not locate Fallout 4 INI files. Please ensure the game is installed.
              </p>
              <button
                onClick={scanForIniFiles}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all"
              >
                Scan Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {skillLevel === 'beginner' && renderBeginnerMode()}
            {skillLevel === 'intermediate' && renderIntermediateMode()}
            {skillLevel === 'advanced' && renderAdvancedMode()}
          </>
        )}
      </div>
    </div>
  );
};

export default IniConfigManager;
