/**
 * Bethel Uploader - Auto Mod Enhancement Interface
 * 
 * Drag-drop mod upload → automatic enhancement → download enhanced mod
 * Complete workflow in one interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { Rocket, FolderOpen, Search, Sparkles, Loader2, Package, Download, RefreshCw, Upload, BarChart3, Info, CheckCircle, XCircle } from 'lucide-react';
import './BethelUploader.css';

interface BethelJob {
  jobId: string;
  uploadedAt: number;
  modName: string;
  modPath: string;
  enhancedModPath?: string;
  status: 'uploading' | 'analyzing' | 'enhancing' | 'packaging' | 'complete' | 'error';
  progress: number;
  message: string;
  textureStats?: any;
  manifest?: any;
  error?: string;
  exportFormat: 'zip' | 'fomod' | 'default';
  downloadUrl?: string;
  expiresAt?: number;
}

export const BethelUploader: React.FC = () => {
  const [jobs, setJobs] = useState<BethelJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [enhancementLevel, setEnhancementLevel] = useState<4 | 8 | 16>(4);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load job history on mount
  useEffect(() => {
    loadJobHistory();
    
    // Listen for Bethel events
    const unsubAnalyzed = window.electronAPI?.onBethelAnalyzed?.(handleAnalyzed);
    const unsubEnhancementComplete = window.electronAPI?.onBethelEnhancementComplete?.(handleEnhancementComplete);
    const unsubExportComplete = window.electronAPI?.onBethelExportComplete?.(handleExportComplete);

    return () => {
      unsubAnalyzed?.();
      unsubEnhancementComplete?.();
      unsubExportComplete?.();
    };
  }, []);

  // Load job history from main process
  const loadJobHistory = async () => {
    try {
      const response = await window.electronAPI?.bethel?.listJobs?.(10);
      if (response?.success && response?.jobs) {
        setJobs(response.jobs);
      }
    } catch (err) {
      console.error('Failed to load job history:', err);
    }
  };

  const handleAnalyzed = (job: BethelJob) => {
    updateJob(job.jobId, job);
  };

  const handleEnhancementComplete = (job: BethelJob) => {
    updateJob(job.jobId, job);
  };

  const handleExportComplete = (job: BethelJob) => {
    updateJob(job.jobId, job);
  };

  const updateJob = (jobId: string, updatedJob: BethelJob) => {
    setJobs(prev => prev.map(job =>
      job.jobId === jobId ? updatedJob : job
    ));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Drag-drop gives DataTransferItemList; open folder picker since Electron needs the path
    await handleCreateSession();
  };

  // Create new session, then let user pick their mod folder
  const handleCreateSession = async () => {
    try {
      const response = await window.electronAPI?.bethel?.createSession?.();
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to create session');
      }

      const newJob = response.job as BethelJob;
      setJobs(prev => [newJob, ...prev]);
      setActiveJobId(newJob.jobId);

      // Prompt the user to pick their mod folder
      const pickedPath = await (window.electronAPI as any)?.pickDirectory?.('Select your Fallout 4 mod folder');
      if (!pickedPath) return; // user cancelled

      const pathResult = await (window.electronAPI as any)?.bethel?.setModPath?.(newJob.jobId, pickedPath);
      if (!pathResult?.success) {
        throw new Error(pathResult?.error || 'Failed to set mod path');
      }

      // Refresh to show updated modName
      const jobResult = await (window.electronAPI as any)?.bethel?.getJob?.(newJob.jobId);
      if (jobResult?.success && jobResult?.job) {
        updateJob(newJob.jobId, jobResult.job);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  // Start analysis
  const handleAnalyze = async (jobId: string) => {
    try {
      const response = await window.electronAPI?.bethel?.analyzeUploadedMod?.(jobId);
      if (!response?.success) {
        throw new Error(response?.error || 'Analysis failed');
      }
      updateJob(jobId, response.job);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  // Start enhancement
  const handleEnhance = async (jobId: string) => {
    try {
      const response = await window.electronAPI?.bethel?.enhanceMod?.(jobId, enhancementLevel);
      if (!response?.success) {
        throw new Error(response?.error || 'Enhancement failed');
      }
      updateJob(jobId, response.job);
    } catch (err) {
      console.error('Enhancement failed:', err);
    }
  };

  // Start export
  const handleExport = async (jobId: string, format: 'zip' | 'fomod' | 'default' = 'zip') => {
    try {
      const response = await window.electronAPI?.bethel?.exportEnhancedMod?.(jobId, format);
      if (!response?.success) {
        throw new Error(response?.error || 'Export failed');
      }
      updateJob(jobId, response.job);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    const s: React.CSSProperties = { width: '1em', height: '1em', display: 'inline', flexShrink: 0 };
    switch (status) {
      case 'uploading': return <Upload style={s} />;
      case 'analyzing': return <Search style={s} />;
      case 'enhancing': return <Sparkles style={s} />;
      case 'packaging': return <Package style={s} />;
      case 'complete': return <CheckCircle style={{ ...s, color: '#4CAF50' }} />;
      case 'error': return <XCircle style={{ ...s, color: '#F44336' }} />;
      default: return <Loader2 style={s} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return '#2196F3';
      case 'analyzing': return '#FFC107';
      case 'enhancing': return '#9C27B0';
      case 'packaging': return '#FF9800';
      case 'complete': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#757575';
    }
  };

  return (
    <div className="bethel-uploader-container">
      <div className="bethel-header">
        <h1><Rocket style={{ width: '1em', height: '1em', display: 'inline', marginRight: '6px' }} />Bethel - Auto Mod Enhancement</h1>
        <p className="subtitle">Upload mod → Enhance textures → Download enhanced</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        ref={dragRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <div className="upload-icon"><FolderOpen style={{ width: '3rem', height: '3rem' }} /></div>
          <h2>Drop Mod Folder Here</h2>
          <p>or</p>
          <button
            className="btn-primary"
            onClick={handleCreateSession}
          >
            <FolderOpen style={{ width: '1em', height: '1em', display: 'inline', marginRight: '4px' }} />Create Upload Session
          </button>
          <p className="upload-hint">
            Upload a Fallout 4 mod folder to automatically enhance all textures
          </p>
        </div>
      </div>

      {/* Enhancement Settings */}
      <div className="settings-panel">
        <h3>Enhancement Settings</h3>
        <div className="setting-group">
          <label>Upscaling Level:</label>
          <select
            value={enhancementLevel}
            onChange={(e) => setEnhancementLevel(Number(e.target.value) as 4 | 8 | 16)}
          >
            <option value={4}>4x (Standard Quality)</option>
            <option value={8}>8x (High Quality)</option>
            <option value={16}>16x (Ultra Quality)</option>
          </select>
          <span className="hint">Higher levels take longer but produce better results</span>
        </div>
      </div>

      {/* Job List */}
      <div className="jobs-container">
        <h2>Enhancement Jobs</h2>
        {jobs.length === 0 ? (
          <div className="empty-state">
            <p>No enhancement jobs yet. Create one above to get started!</p>
          </div>
        ) : (
          <div className="jobs-list">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className={`job-card ${activeJobId === job.jobId ? 'active' : ''}`}
                onClick={() => setActiveJobId(job.jobId)}
              >
                <div className="job-header">
                  <span className="status-icon">{getStatusIcon(job.status)}</span>
                  <div className="job-info">
                    <h3>{job.modName || 'Unknown Mod'}</h3>
                    <p className="job-id">{job.jobId.substring(0, 8)}...</p>
                  </div>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(job.status) }}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="job-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${job.progress}%`,
                        backgroundColor: getStatusColor(job.status),
                      }}
                    />
                  </div>
                  <span className="progress-text">{job.progress}%</span>
                </div>

                <p className="job-message">{job.message}</p>

                {job.error && (
                  <div className="error-message">
                    <strong>Error:</strong> {job.error}
                  </div>
                )}

                {job.textureStats && (
                  <div className="texture-stats">
                    <span><BarChart3 style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '3px' }} />{job.textureStats.totalTextures} textures</span>
                    <span>• {job.textureStats.diffuseCount} diffuse</span>
                    <span>• {job.textureStats.normalCount} normal</span>
                    <span>• {job.textureStats.specularCount} specular</span>
                  </div>
                )}

                <div className="job-actions">
                  {job.status === 'uploading' && (
                    <button
                      className="btn-secondary"
                      onClick={() => handleAnalyze(job.jobId)}
                    >
                      <Search style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Analyze
                    </button>
                  )}

                  {job.status === 'analyzing' && (
                    <button
                      className="btn-secondary"
                      onClick={() => handleEnhance(job.jobId)}
                    >
                      <Sparkles style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Start Enhancement
                    </button>
                  )}

                  {job.status === 'enhancing' && (
                    <span className="processing"><Loader2 style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Processing...</span>
                  )}

                  {job.status === 'packaging' && (
                    <span className="processing"><Package style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Packaging...</span>
                  )}

                  {job.status === 'complete' && (
                    <div className="complete-actions">
                      <button
                        className="btn-success"
                        onClick={() => handleExport(job.jobId, 'zip')}
                      >
                        <Download style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Download (ZIP)
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleExport(job.jobId, 'fomod')}
                      >
                        <Package style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />FOMOD Package
                      </button>
                    </div>
                  )}

                  {job.status === 'error' && (
                    <button
                      className="btn-danger"
                      onClick={() => handleAnalyze(job.jobId)}
                    >
                      <RefreshCw style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Retry
                    </button>
                  )}
                </div>

                {job.downloadUrl && (
                  <div className="download-info">
                    <a href={job.downloadUrl} className="download-link">
                      <Download style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Download Enhanced Mod
                    </a>
                    <span className="expires">
                      Available for 7 days
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="info-panel">
        <h3><Info style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />How Bethel Works</h3>
        <ol>
          <li><strong>Upload:</strong> Select your Fallout 4 mod folder</li>
          <li><strong>Analyze:</strong> Scan textures (diffuse, normal, specular, etc.)</li>
          <li><strong>Enhance:</strong> Upscale textures using Blender + Pillow</li>
          <li><strong>Package:</strong> Create installable enhanced mod</li>
          <li><strong>Download:</strong> Get your enhanced mod ready to install</li>
        </ol>
        <p className="note">
          <Info style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px', flexShrink: 0 }} />All processing happens on your computer. Enhanced mods are stored locally.
        </p>
      </div>
    </div>
  );
};

export default BethelUploader;
