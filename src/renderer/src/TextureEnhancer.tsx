/**
 * Texture Enhancer - AI-Powered Material Enhancement System
 * 
 * Leverages Blender (Neural Link) via existing BridgeServer infrastructure:
 * - Blender's imaging & compositing nodes (GPU acceleration)
 * - Material map generation (Metallic, AO, Cavity via Blender Python)
 * - Normal map enhancement via shader nodes
 * - Specular/Roughness optimization
 * - PBR material definition generation
 * 
 * No external ESRGAN/Python processes - uses Blender's native capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import './TextureEnhancer.css';

interface EnhancementJob {
  id: string;
  modPath: string;
  modName: string;
  textureCount: number;
  estimatedSize: string;
  totalSize: number;
  status: 'idle' | 'analyzing' | 'upscaling' | 'generating' | 'packaging' | 'complete' | 'error';
  progress: number;
  currentFile: string;
  startTime: number;
  estimatedTimeRemaining: string;
  blenderStatus?: string;
  error?: string;
}

interface TextureStats {
  totalTextures: number;
  diffuseCount: number;
  normalCount: number;
  specularCount: number;
  totalSize: number;
  estimatedEnhancedSize: number;
}

interface MaterialDefinition {
  version: '1.0';
  modName: string;
  enhancedAt: string;
  enhancementLevel: 4 | 8 | 16;
  textures: {
    diffuse: string[];
    normal: string[];
    specular: string[];
    metallic: string[];
    ao: string[];
    cavity: string[];
  };
  materials: Array<{
    name: string;
    baseTexture: string;
    hasMetallic: boolean;
    hasAO: boolean;
    hasCavity: boolean;
    roughnessChannel: 'alpha' | 'rgb' | 'r' | 'g' | 'b';
  }>;
}

export const TextureEnhancer: React.FC = () => {
  const [jobs, setJobs] = useState<EnhancementJob[]>([]);
  const [selectedMod, setSelectedMod] = useState<string | null>(null);
  const [textureStats, setTextureStats] = useState<TextureStats | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enhancementLevel, setEnhancementLevel] = useState<4 | 8 | 16>(4);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize IPC listeners
  useEffect(() => {
    const handleEnhancerProgress = (data: any) => {
      setJobs(prev => prev.map(job => 
        job.id === data.jobId
          ? {
              ...job,
              status: data.status || 'processing',
              progress: data.progress || job.progress,
              currentFile: data.currentFile || job.currentFile,
              blenderStatus: data.blenderStatus || job.blenderStatus,
            }
          : job
      ));
    };

    const handleEnhancerComplete = (data: any) => {
      setJobs(prev => prev.map(job =>
        job.id === data.jobId
          ? { 
              ...job, 
              status: 'complete', 
              progress: 100,
              currentFile: 'Complete!',
            }
          : job
      ));
      setIsProcessing(false);
    };

    const handleEnhancerError = (data: any) => {
      setJobs(prev => prev.map(job =>
        job.id === data.jobId
          ? { ...job, status: 'error', error: data.error }
          : job
      ));
      setIsProcessing(false);
    };

    const handleJobStarted = (data: any) => {
      setJobs(prev => prev.map(job =>
        job.id === data.jobId
          ? { 
              ...job,
              status: 'upscaling',
              currentFile: 'Starting texture enhancement...',
            }
          : job
      ));
    };

    // Register IPC listeners via window.electronAPI
    const unsubscribeProgress = window.electronAPI?.onEnhancerProgress?.(handleEnhancerProgress);
    const unsubscribeComplete = window.electronAPI?.onEnhancerComplete?.(handleEnhancerComplete);
    const unsubscribeError = window.electronAPI?.onEnhancerError?.(handleEnhancerError);
    const unsubscribeStarted = window.electronAPI?.onEnhancerJobStarted?.(handleJobStarted);

    return () => {
      // Cleanup listeners
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
      unsubscribeStarted?.();
    };
  }, []);

  // Handle mod selection
  const handleSelectMod = async () => {
    try {
      // Use Electron API to select folder (add to preload if needed)
      const result = await window.electronAPI?.selectDirectory?.();
      if (result) {
        setSelectedMod(result);
        analyzeTextures(result);
      }
    } catch (err) {
      console.error('Failed to select mod:', err);
    }
  };

  // Analyze textures in mod
  const analyzeTextures = async (modPath: string) => {
    try {
      // Call IPC handler to analyze mod textures
      const response = await window.electronAPI?.invoke?.('texture-enhancer:analyze', modPath);
      
      if (response?.success && response?.analysis) {
        setTextureStats(response.analysis);
      } else {
        console.error('Analysis failed:', response?.error);
      }
    } catch (err) {
      console.error('Failed to analyze textures:', err);
    }
  };

  // Start enhancement process
  const handleStartEnhancement = async () => {
    if (!selectedMod) return;

    setIsProcessing(true);
    const jobId = `job-${Date.now()}`;

    const newJob: EnhancementJob = {
      id: jobId,
      modPath: selectedMod,
      modName: selectedMod.split('\\').pop() || 'Unknown Mod',
      textureCount: textureStats?.totalTextures || 0,
      estimatedSize: `${Math.round((textureStats?.estimatedEnhancedSize || 0) / 1024 / 1024)} MB`,
      totalSize: textureStats?.estimatedEnhancedSize || 0,
      status: 'analyzing',
      progress: 0,
      currentFile: 'Initializing...',
      startTime: Date.now(),
      estimatedTimeRemaining: 'Calculating...',
      blenderStatus: 'Waiting for Blender...',
    };

    setJobs(prev => [...prev, newJob]);

    try {
      // Call IPC handler to start enhancement via Blender
      const result = await window.electronAPI?.invoke?.('texture-enhancer:enhance', {
        jobId,
        modPath: selectedMod,
        level: enhancementLevel,
        materials: selectedMaterials.length > 0 ? selectedMaterials : undefined,
      });
      
      if (!result?.success) {
        throw new Error(result?.message || 'Enhancement failed');
      }
      
      console.log('Enhancement started:', jobId);
    } catch (err) {
      console.error('Enhancement failed:', err);
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: 'error', error: String(err) }
          : job
      ));
      setIsProcessing(false);
    }
  };

  return (
    <div className="texture-enhancer-container">
      <div className="enhancer-header">
        <h1>🎨 Advanced Texture Enhancer</h1>
        <p className="subtitle">AI-powered 4x upscaling + material generation</p>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <section className="mod-selection">
          <h2>Step 1: Select Mod</h2>
          <button 
            className="btn-primary"
            onClick={handleSelectMod}
            disabled={isProcessing}
          >
            📁 Select Mod Folder
          </button>
          
          {selectedMod && (
            <div className="selected-mod">
              <span className="mod-name">{selectedMod.split('\\').pop()}</span>
              <span className="mod-path">{selectedMod}</span>
            </div>
          )}
        </section>

        {/* Texture Analysis */}
        {textureStats && (
          <section className="texture-analysis">
            <h2>Step 2: Texture Analysis</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Textures</span>
                <span className="stat-value">{textureStats.totalTextures}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Diffuse Maps</span>
                <span className="stat-value">{textureStats.diffuseCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Normal Maps</span>
                <span className="stat-value">{textureStats.normalCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Specular Maps</span>
                <span className="stat-value">{textureStats.specularCount}</span>
              </div>
              <div className="stat-card full-width">
                <span className="stat-label">Estimated Size After Enhancement</span>
                <span className="stat-value">
                  {Math.round(textureStats.totalSize / 1024 / 1024)} MB → {Math.round(textureStats.estimatedEnhancedSize / 1024 / 1024)} MB
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Enhancement Options */}
        <section className="enhancement-options">
          <h2>Step 3: Enhancement Settings</h2>
          
          <div className="option-group">
            <label>Enhancement Level</label>
            <div className="quality-selector">
              {[
                { level: 4, label: '4x (Fast)', desc: '~5-10 min' },
                { level: 8, label: '8x (Quality)', desc: '~15-25 min' },
                { level: 16, label: '16x (Maximum)', desc: '~30-60 min' },
              ].map(opt => (
                <button
                  key={opt.level}
                  className={`quality-btn ${enhancementLevel === opt.level ? 'active' : ''}`}
                  onClick={() => setEnhancementLevel(opt.level as 4 | 8 | 16)}
                  disabled={isProcessing}
                >
                  <span className="level-label">{opt.label}</span>
                  <span className="level-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <label>
              <input 
                type="checkbox" 
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                disabled={isProcessing}
              />
              Advanced Material Options
            </label>
          </div>

          {showAdvanced && (
            <div className="advanced-options">
              <p className="info">Select specific material types to generate (leave all unchecked for default enhancement only):</p>
              <div className="material-list">
                {[
                  { key: 'metallic', label: 'Generate Metallic Maps' },
                  { key: 'ao', label: 'Generate Ambient Occlusion' },
                  { key: 'cavity', label: 'Generate Cavity Maps' },
                ].map(({ key, label }) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(key)}
                      disabled={isProcessing}
                      onChange={(e) =>
                        setSelectedMaterials(prev =>
                          e.target.checked ? [...prev, key] : prev.filter(m => m !== key)
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <section className="action-buttons">
          <button
            className="btn-primary btn-large"
            onClick={handleStartEnhancement}
            disabled={!selectedMod || !textureStats || isProcessing}
          >
            {isProcessing ? '⏳ Processing...' : '🚀 Start Enhancement'}
          </button>
        </section>
      </div>

      {/* Jobs Monitor */}
      <div className="jobs-monitor">
        <h2>Enhancement Jobs</h2>
        {jobs.length === 0 ? (
          <p className="empty-state">No enhancement jobs yet</p>
        ) : (
          <div className="jobs-list">
            {jobs.map(job => (
              <EnhancementJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Job Card Component
const EnhancementJobCard: React.FC<{ job: EnhancementJob }> = ({ job }) => {
  const statusColors: Record<string, string> = {
    analyzing: '#3498db',
    upscaling: '#e74c3c',
    generating: '#f39c12',
    packaging: '#9b59b6',
    complete: '#27ae60',
    error: '#c0392b',
  };

  return (
    <div className="job-card" data-status={job.status}>
      <div className="job-header">
        <span className="job-name">{job.modName}</span>
        <span className={`job-status status-${job.status}`}>{job.status.toUpperCase()}</span>
      </div>

      <div className="job-stats">
        <span>{job.textureCount} textures • {job.estimatedSize}</span>
        <span className="time-remaining">{job.estimatedTimeRemaining}</span>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${job.progress}%`,
            backgroundColor: statusColors[job.status],
          }}
        />
        <span className="progress-text">{job.progress}%</span>
      </div>

      {job.currentFile && (
        <div className="current-file">
          <span className="label">Processing:</span>
          <span className="filename">{job.currentFile}</span>
        </div>
      )}

      {job.error && (
        <div className="error-message">
          ❌ {job.error}
        </div>
      )}

      {job.status === 'complete' && (
        <div className="completion-actions">
          <button className="btn-secondary">📂 Open Output</button>
          <button className="btn-secondary">📋 View Materials</button>
        </div>
      )}
    </div>
  );
};

export default TextureEnhancer;
