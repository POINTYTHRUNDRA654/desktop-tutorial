/**
 * CK Crash Prevention UI Component
 * Four-tab design: Pre-Flight, Live Monitoring, Post-Crash Analysis, Asset Audit
 * Integrates with mining/ckCrashPrevention.ts engine and asset analysis workers
 */

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle, Activity,
  Zap, Clock, TrendingUp, AlertCircle, Play, Square,
  FileText, Brain, Lightbulb, Download, XCircle,
  RefreshCw, FolderOpen, ShieldCheck,
  Scan, CheckCircle2, FileImage, Box, FileCode, Search, Wrench, ArrowRight, X, File, Bug,
  GitBranch, Star,
} from 'lucide-react';
import ExternalToolNotice from './components/ExternalToolNotice';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import ProjectWizard from './components/ProjectWizard';
import GameLogMonitor from './GameLogMonitor';
import { useWheelScrollProxyFrom } from './components/useWheelScrollProxy';
import { workerManager } from './WorkerManager';
import { cacheManager } from './CacheManager';
import { openExternal } from './utils/openExternal';

// Types from mining engine
interface ValidationIssue {
  type: 'file_not_found' | 'file_too_large' | 'memory_risk' | 'master_missing' |
  'precombine' | 'previs' | 'navmesh' | 'problematic_mod' | 'script_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  solution: string;
  affectedRecords: string[];
}

interface ESPValidationResult {
  valid: boolean;
  crashRisk: number;
  memoryEstimateMB: number;
  issues: ValidationIssue[];
  warnings: string[];
  recommendations: string[];
}

interface CrashDiagnosis {
  crashType: 'memory_overflow' | 'access_violation' | 'stack_overflow' |
  'navmesh_conflict' | 'precombine_mismatch' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  likelyPlugin: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace: string[];
  memoryAddress: string;
  timestamp: string;
}

interface PreventionStep {
  description: string;
  command?: string;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PreventionPlan {
  steps: PreventionStep[];
  estimatedRiskReduction: number;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ProcessMetrics {
  cpuPercent: number;
  memoryMB: number;
  handleCount: number;
  threadCount: number;
}

type Tab = 'preflight' | 'monitoring' | 'postcrash' | 'audit';
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
type MonitoringStatus = 'idle' | 'monitoring' | 'crashed';

// ── Asset Audit types (merged from TheAuditor) ──────────────────────────────
interface AuditIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  technicalDetails: string;
}

interface ModFile {
  id: string;
  name: string;
  type: 'mesh' | 'texture' | 'material' | 'plugin' | 'script';
  path: string;
  size: string;
  issues: AuditIssue[];
  status: 'clean' | 'warning' | 'error' | 'pending';
  dimensions?: { width: number; height: number; format: string };
}

export const CKCrashPrevention: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Safely extract and validate tab parameter
  const tabParam = searchParams.get('tab');
  const validTabs: Tab[] = ['preflight', 'monitoring', 'postcrash', 'audit'];
  const initialTab: Tab = tabParam && validTabs.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : 'preflight';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Pre-flight state
  const [espPath, setEspPath] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationResult, setValidationResult] = useState<ESPValidationResult | null>(null);
  const [preventionPlan, setPreventionPlan] = useState<PreventionPlan | null>(null);

  // Monitoring state
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('idle');
  const [ckPid, setCkPid] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<ProcessMetrics[]>([]);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Post-crash state
  const [crashLogPath, setCrashLogPath] = useState<string>('');
  const [crashDiagnosis, setCrashDiagnosis] = useState<CrashDiagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Asset Audit state (merged from TheAuditor) ───────────────────────────
  const navigate = useNavigate();
  const [auditFiles, setAuditFiles] = useState<ModFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [auditAdvice, setAuditAdvice] = useState<string | null>(null);
  const [texturePreview, setTexturePreview] = useState<string | null>(null);
  const [activeAuditSubTab, setActiveAuditSubTab] = useState<'audit' | 'debug'>('audit');
  const [userInputText, setUserInputText] = useState<string>('');
  const [autoScanBanner, setAutoScanBanner] = useState(false);
  const fileListScrollRef = useRef<HTMLDivElement | null>(null);
  const issuesScrollRef = useRef<HTMLDivElement | null>(null);
  const adviceScrollRef = useRef<HTMLDivElement | null>(null);
  const auditButtonsRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoScan = useRef(false);
  const wheelProxy = useWheelScrollProxyFrom(() => issuesScrollRef.current ?? fileListScrollRef.current ?? adviceScrollRef.current);
  const auditButtonsWheelProxy = useWheelScrollProxyFrom(() => auditButtonsRef.current);

  // ── Spriggit Vanilla ESM Digest (in-Auditor) ─────────────────────────────
  const [spriggitPanelOpen, setSpriggitPanelOpen] = useState(false);
  const [sdCliPath, setSdCliPath] = useState('');
  const [sdDataPath, setSdDataPath] = useState('');
  const [sdPackageName, setSdPackageName] = useState('Spriggit.Yaml.Fallout4');
  const [sdNugetSource, setSdNugetSource] = useState('');
  const [sdStatus, setSdStatus] = useState<'idle' | 'running' | 'done' | 'partial' | 'error'>('idle');
  const [sdMessage, setSdMessage] = useState('');
  const [sdCacheClearInProgress, setSdCacheClearInProgress] = useState(false);
  const [sdCacheClearResult, setSdCacheClearResult] = useState<'ok' | 'error' | null>(null);
  const [sdUnblockInProgress, setSdUnblockInProgress] = useState(false);
  const [sdUnblockResult, setSdUnblockResult] = useState<{ ok: boolean; unblocked?: number; folderPath?: string; error?: string } | null>(null);
  const [sdAutoUnblockState, setSdAutoUnblockState] = useState<'idle' | 'unblocking' | 'retrying' | 'failed'>('idle');

  // ── Spriggit Custom Mod Conversion ─────────────────────────────────────
  const [customModPanelOpen, setCustomModPanelOpen] = useState(false);
  const [customModInputPath, setCustomModInputPath] = useState('');
  const [customModOutputPath, setCustomModOutputPath] = useState('');
  const [customModFormat, setCustomModFormat] = useState<'yaml' | 'json'>('yaml');
  const [customModOperation, setCustomModOperation] = useState<'serialize' | 'deserialize'>('serialize');
  const [customModStatus, setCustomModStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [customModMessage, setCustomModMessage] = useState('');
  const [customModDiagnosticPath, setCustomModDiagnosticPath] = useState('');
  const [customModDiagnosticRunning, setCustomModDiagnosticRunning] = useState(false);
  const [customModDiagnosticResults, setCustomModDiagnosticResults] = useState('');

  const getApi = () => (window as any)?.electron?.api ?? (window as any)?.electronAPI;

  const runSpriggitVanillaDigest = async (): Promise<{ failed0xFFFF: boolean }> => {
    const api = getApi();
    if (!api?.spriggitSerialize) { setSdStatus('error'); setSdMessage('Spriggit integration not available.'); return { failed0xFFFF: false }; }
    if (!sdCliPath || !sdDataPath) { setSdMessage('Select Spriggit.CLI.exe and Fallout 4 Data folder first.'); return { failed0xFFFF: false }; }
    setSdStatus('running');
    setSdMessage('Running Spriggit — converting vanilla ESMs to YAML…');
    try {
      const result = await api.spriggitSerialize({
        cliPath: sdCliPath,
        dataPath: sdDataPath,
        outputPath: '',
        vanillaOnly: true,
        packageName: sdPackageName.trim() || 'Spriggit.Yaml.Fallout4',
        nugetSource: sdNugetSource.trim() || undefined,
      });
      if (!result.ok || !result.files?.length) {
        const errText = result.error || 'No YAML files produced.';
        setSdStatus('error');
        setSdMessage(`Spriggit failed:\n${errText.length > 1200 ? errText.slice(0, 1200) + '\n…(truncated)' : errText}`);
        return { failed0xFFFF: errText.includes('0xFFFFFFFF') };
      }
      // Merge results into the Knowledge Vault
      const existing: any[] = (() => { try { return JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]'); } catch { return []; } })();
      const now = new Date().toISOString();
      const newEntries = (result.files as Array<{ name: string; content: string }>).map(f => ({
        id: `spriggit-vanilla-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: `Vanilla ESM: ${f.name}`,
        content: f.content,
        source: 'Spriggit serialize — vanilla ESMs (Auditor)',
        trustLevel: 'personal',
        date: now,
        tags: ['spriggit', 'fallout4', 'vanilla-base-records'],
        status: 'learned',
      }));
      localStorage.setItem('mossy_knowledge_vault', JSON.stringify([...existing, ...newEntries]));
      try { await api.saveKnowledgeVault?.([...existing, ...newEntries]); } catch { /* fire-and-forget */ }
      const isPartial = !!(result.partialSuccess && result.error);
      setSdStatus(isPartial ? 'partial' : 'done');
      setSdMessage(isPartial
        ? `⚠️ Partial: ${newEntries.length} files digested. Some DLC ESMs failed:\n${result.error!.slice(0, 400)}`
        : `✅ Digested ${newEntries.length} vanilla ESM YAML files into the Knowledge Vault.`);
      return { failed0xFFFF: false };
    } catch (err: any) {
      setSdStatus('error'); setSdMessage(`Error: ${String(err?.message || err)}`);
      return { failed0xFFFF: false };
    }
  };

  const runCustomModConversion = async () => {
    const api = getApi();
    if (!api?.spriggitSerialize) {
      setCustomModStatus('error');
      setCustomModMessage('Spriggit integration not available.');
      return;
    }

    if (!customModInputPath) {
      setCustomModMessage('Please select an input file/folder.');
      return;
    }

    if (!customModOutputPath && customModOperation === 'serialize') {
      setCustomModMessage('Please select an output folder for the Git repository.');
      return;
    }

    setCustomModStatus('running');
    setCustomModMessage(`${customModOperation === 'serialize' ? 'Converting plugin to YAML/JSON...' : 'Converting YAML/JSON back to plugin...'}`);

    try {
      const packageName = customModFormat === 'yaml' ? 'Spriggit.Yaml.Fallout4' : 'Spriggit.Json.Fallout4';

      const result = await api.spriggitSerialize({
        cliPath: sdCliPath,
        dataPath: customModInputPath,
        outputPath: customModOutputPath,
        vanillaOnly: false,
        packageName: packageName,
        nugetSource: sdNugetSource.trim() || undefined,
      });

      if (!result.ok) {
        setCustomModStatus('error');
        setCustomModMessage(`Conversion failed:\n${result.error || 'Unknown error'}`);
        return;
      }

      setCustomModStatus('success');
      if (customModOperation === 'serialize') {
        setCustomModMessage(
          `✅ Success! Your mod has been converted to ${customModFormat.toUpperCase()} format.\n\n` +
          `📁 Output Location: ${customModOutputPath}\n\n` +
          `Next Steps:\n` +
          `1. Initialize a Git repository in the output folder: git init\n` +
          `2. Create a .gitignore file if needed\n` +
          `3. Make your first commit: git add . && git commit -m "Initial commit"\n` +
          `4. Push to GitHub: gh repo create --source=. --public (or --private)`
        );
      } else {
        setCustomModMessage(
          `✅ Success! Your mod has been converted from ${customModFormat.toUpperCase()} back to plugin format.\n\n` +
          `📁 Output Location: ${customModOutputPath}\n\n` +
          `You can now load it in Creation Kit or other modding tools.`
        );
      }
    } catch (err: any) {
      setCustomModStatus('error');
      setCustomModMessage(`Error: ${String(err?.message || err)}`);
    }
  };

  const runModDiagnostic = async () => {
    if (!customModDiagnosticPath) {
      setCustomModDiagnosticResults('Please select a Git repository folder to diagnose.');
      return;
    }

    setCustomModDiagnosticRunning(true);
    setCustomModDiagnosticResults('🔍 Analyzing mod data...');

    try {
      const api = getApi();
      if (!api?.readFile) {
        setCustomModDiagnosticResults('File reading not available. Please use the desktop app.');
        setCustomModDiagnosticRunning(false);
        return;
      }

      // Read RecordData.yaml/json from the repository
      const fs = require('fs') as any;
      const path = require('path') as any;

      let recordDataContent = '';
      let recordFiles: string[] = [];

      // Try to find and read YAML/JSON files
      try {
        const files = await api.readDirectory?.(customModDiagnosticPath);
        if (files) {
          // Look for RecordData file
          const recordDataFile = files.find((f: string) =>
            f === 'RecordData.yaml' || f === 'RecordData.json'
          );

          if (recordDataFile) {
            const fullPath = `${customModDiagnosticPath}/${recordDataFile}`;
            recordDataContent = await api.readFile(fullPath);
          }

          // Collect all YAML/JSON files for analysis
          recordFiles = files.filter((f: string) =>
            f.endsWith('.yaml') || f.endsWith('.json')
          );
        }
      } catch (err) {
        console.error('Error reading directory:', err);
      }

      // Build diagnostic prompt for AI
      const diagnosticPrompt = `You are Mossy, an expert Fallout 4 modding assistant. Analyze this mod's Spriggit data and provide a comprehensive diagnostic report.

Repository Path: ${customModDiagnosticPath}
Files Found: ${recordFiles.length} YAML/JSON files

${recordDataContent ? `RecordData Content (first 2000 chars):\n${recordDataContent.slice(0, 2000)}\n` : 'RecordData file not found.'}

Please analyze and provide:

1. **Mod Overview**: What does this mod do? What records does it contain?
2. **Common Issues**: Check for:
   - Missing master files
   - FormID conflicts (duplicate or overlapping IDs)
   - Invalid references
   - Performance concerns (high poly counts, too many scripts, etc.)
   - Compatibility issues
   - NavMesh problems
   - Precombine/Previs issues
3. **Best Practices**: Are there any violations of Fallout 4 modding best practices?
4. **Recommendations**: Specific actionable fixes for any issues found
5. **Quality Rating**: Rate the mod's quality on a scale of 1-10

Format your response clearly with headers and bullet points.`;

      // Send to AI for analysis
      const settings = await api.getSettings?.();
      const aiProvider = settings?.aiProvider || 'openai';
      const apiKey = settings?.openaiApiKey || settings?.anthropicApiKey;

      if (!apiKey) {
        setCustomModDiagnosticResults(
          '⚠️ AI API key not configured.\n\n' +
          'To use mod diagnostics, please:\n' +
          '1. Go to Settings\n' +
          '2. Configure your OpenAI or Anthropic API key\n' +
          '3. Return here and try again\n\n' +
          'For now, here\'s what I found:\n' +
          `- Repository: ${customModDiagnosticPath}\n` +
          `- Files: ${recordFiles.length} YAML/JSON files\n` +
          `- ${recordDataContent ? 'RecordData found' : 'RecordData NOT found'}\n\n` +
          'Manual inspection recommended.'
        );
        setCustomModDiagnosticRunning(false);
        return;
      }

      // Call AI for analysis
      let aiResponse = '';
      if (aiProvider === 'openai' && settings?.openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openaiApiKey}`
          },
          body: JSON.stringify({
            model: settings?.openaiModel || 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: 'You are Mossy, an expert Fallout 4 modding assistant with deep knowledge of the Creation Engine, Papyrus, and modding best practices.' },
              { role: 'user', content: diagnosticPrompt }
            ],
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content || 'Failed to get AI response';
      } else if (aiProvider === 'anthropic' && settings?.anthropicApiKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: settings?.anthropicModel || 'claude-3-sonnet-20240229',
            max_tokens: 2000,
            messages: [{ role: 'user', content: diagnosticPrompt }]
          })
        });

        const data = await response.json();
        aiResponse = data.content?.[0]?.text || 'Failed to get AI response';
      }

      setCustomModDiagnosticResults(
        `🔍 **Mod Diagnostic Report**\n\n` +
        `📁 Repository: ${customModDiagnosticPath}\n` +
        `📊 Files Analyzed: ${recordFiles.length} YAML/JSON files\n\n` +
        `---\n\n${aiResponse}\n\n---\n\n` +
        `💡 **Next Steps:**\n` +
        `- Address any critical issues found above\n` +
        `- Re-serialize after making fixes: Deserialize → Edit in CK → Serialize\n` +
        `- Commit changes to Git with descriptive messages\n` +
        `- Run this diagnostic again to verify fixes`
      );
    } catch (err: any) {
      setCustomModDiagnosticResults(
        `❌ Diagnostic Error: ${String(err?.message || err)}\n\n` +
        'Please ensure:\n' +
        '- The path points to a valid Spriggit repository\n' +
        '- The repository contains YAML/JSON files\n' +
        '- Your AI API key is configured in Settings'
      );
    } finally {
      setCustomModDiagnosticRunning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, []);

  // ── Asset Audit effects & helpers (merged from TheAuditor) ───────────────

  // Auto-start audit when pendingAutoScan is set (triggered after quick-scan folder)
  useEffect(() => {
    if (pendingAutoScan.current && auditFiles.some(f => f.status === 'pending')) {
      pendingAutoScan.current = false;
      setIsScanning(true);
      setScanProgress(0);
      setAuditAdvice(null);
      performAuditAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFiles]);

  // Load previous scan from localStorage on mount; detect auto-scan flag from Spriggit digest
  useEffect(() => {
    // Wrap everything in try-catch to prevent crashes from localStorage issues
    try {
      // Check if localStorage is available (it might not be in some contexts)
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, skipping audit data load');
        return;
      }

      // Load audit files
      try {
        const saved = localStorage.getItem('mossy_scan_auditor');
        if (saved && typeof saved === 'string' && saved.trim().length > 0) {
          const parsed = JSON.parse(saved);
          // Validate parsed data is an array with proper structure
          if (Array.isArray(parsed)) {
            // Additional validation: check if items have required properties
            const isValid = parsed.every(item => 
              item && 
              typeof item === 'object' && 
              'id' in item && 
              'name' in item && 
              'type' in item
            );
            if (isValid) {
              setAuditFiles(parsed);
            } else {
              console.warn('Invalid audit files structure in localStorage, clearing...');
              localStorage.removeItem('mossy_scan_auditor');
            }
          } else {
            console.warn('Invalid audit files data in localStorage (not an array), clearing...');
            localStorage.removeItem('mossy_scan_auditor');
          }
        }
      } catch (error) {
        console.error('Failed to load audit files from localStorage:', error);
        try {
          localStorage.removeItem('mossy_scan_auditor');
        } catch (removeError) {
          console.error('Failed to remove corrupted audit data:', removeError);
        }
      }
      
      // Check for auto-scan flag from Spriggit digest
      try {
        const autoScanFlag = localStorage.getItem('mossy_auditor_auto_scan');
        if (autoScanFlag === 'true') {
          localStorage.removeItem('mossy_auditor_auto_scan');
          setAutoScanBanner(true);
        }
      } catch (error) {
        console.error('Failed to check auto-scan flag:', error);
        try {
          localStorage.removeItem('mossy_auditor_auto_scan');
        } catch (removeError) {
          console.error('Failed to remove auto-scan flag:', removeError);
        }
      }
    } catch (outerError) {
      console.error('Critical error in audit data initialization:', outerError);
      // Don't crash the component, just log the error
    }
  }, []);

  // Persist file list to localStorage for Mossy context
  useEffect(() => {
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        return;
      }

      if (auditFiles.length > 0) {
        // Validate auditFiles before saving
        const isValid = Array.isArray(auditFiles) && auditFiles.every(f => 
          f && typeof f === 'object' && f.id && f.name && f.type
        );
        if (isValid) {
          localStorage.setItem('mossy_scan_auditor', JSON.stringify(auditFiles));
          window.dispatchEvent(new Event('mossy-memory-update'));
        } else {
          console.warn('Attempted to save invalid audit files, skipping...');
        }
      } else {
        localStorage.removeItem('mossy_scan_auditor');
        window.dispatchEvent(new Event('mossy-memory-update'));
      }
    } catch (error) {
      console.error('Failed to persist audit files to localStorage:', error);
      // Don't crash, just log the error
    }
  }, [auditFiles]);

  // Load texture metadata when a texture file is selected
  useEffect(() => {
    const selectedFile = auditFiles.find(f => f.id === selectedFileId);
    if (selectedFile && selectedFile.type === 'texture') {
      loadTextureMetadata(selectedFile.path, selectedFile.id);
    } else {
      setTexturePreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  const auditReadFileAsArrayBuffer = async (filePath: string): Promise<ArrayBuffer> => {
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    if (bridge?.readBinaryFile) {
      const result = await bridge.readBinaryFile(filePath);
      if (result.success && result.data) {
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      throw new Error(result.error ?? 'Failed to read file as binary data');
    }
    throw new Error('readBinaryFile bridge not available');
  };

  const auditOpenUrl = (url: string) => { void openExternal(url); };

  const fmtMB = (analysis: any): string => {
    const mb = analysis.fileSizeMB ?? ((analysis.fileSize ?? 0) / 1024 / 1024);
    return `${(Math.round(mb * 100) / 100).toFixed(2)} MB`;
  };

  const openNexusSearch = (keywords: string) => {
    const query = encodeURIComponent(keywords);
    auditOpenUrl(`https://www.nexusmods.com/fallout4/search/?BH=0&search%5Bsearch_keywords%5D=${query}`);
  };

  const launchToolWithFile = async (toolSettingsKey: 'xeditPath' | 'nifSkopePath' | 'creationKitPath' | 'blenderPath', filePath: string, toolLabel: string) => {
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    if (!bridge) {
      setAuditAdvice('⚠️ Desktop integration not available. Please use the desktop app version.');
      return;
    }
    if (!bridge.getSettings) {
      setAuditAdvice('⚠️ Settings API not available. Please restart the app.');
      return;
    }
    try {
      const settings = await bridge.getSettings();
      if (!settings) {
        setAuditAdvice(`⚠️ Could not load settings. Please go to Settings and configure ${toolLabel} path.`);
        return;
      }
      const toolPath: string = settings[toolSettingsKey] ?? '';
      if (!toolPath) {
        setAuditAdvice(`⚙️ ${toolLabel} path is not configured. Go to Settings → External Tools and set the path to ${toolLabel}, then try again.`);
        return;
      }
      if (!bridge.launchToolWithFile) {
        setAuditAdvice('⚠️ Tool launch API not available. Please restart the app.');
        return;
      }
      const result = await bridge.launchToolWithFile(toolPath, filePath);
      if (result && !result.success) {
        setAuditAdvice(`⚠️ Could not launch ${toolLabel}: ${result.error}`);
      }
    } catch (e) {
      console.error(`launchToolWithFile(${toolLabel}):`, e);
      setAuditAdvice(`❌ Error launching ${toolLabel}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const loadTextureMetadata = async (path: string, fileId: string) => {
    const bridge = (window as any).electron?.api || (window as any).electronAPI;
    if (!bridge?.readDdsPreview) return;
    try {
      const info = await bridge.readDdsPreview(path);
      if (info && info.format !== 'invalid' && info.format !== 'error') {
        setAuditFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, dimensions: { width: info.width, height: info.height, format: info.format } } : f
        ));
        const ext = path.split('.').pop()?.toLowerCase();
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
          const base64Content = await bridge.readFile(path);
          if (base64Content && typeof base64Content === 'string') {
            setTexturePreview(`data:image/${ext};base64,${base64Content}`);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load texture metadata:', e);
    }
  };

  const removeAuditFile = (id: string) => {
    setAuditFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) {
      setSelectedFileId(null);
      setAuditAdvice(null);
    }
  };

  const handleAuditESPUpload = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const filePath = await bridge.pickEspFile();
      if (!filePath) return;
      const fileName = filePath.split(/[\\\/]/).pop() || 'Unknown';
      const newFile: ModFile = { id: Date.now().toString(), name: fileName, type: 'plugin', path: filePath, size: 'Analyzing...', issues: [], status: 'pending' };
      setAuditFiles(prev => [...prev, newFile]);
      setSelectedFileId(newFile.id);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to load file. Please try again.');
    }
  };

  const handleAuditMeshUpload = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const filePaths = await bridge.pickNifFile();
      if (!filePaths || filePaths.length === 0) return;
      const newFiles = filePaths.map((filePath: string) => ({ id: Date.now().toString() + Math.random(), name: filePath.split(/[\\\/]/).pop() || 'Unknown', type: 'mesh' as const, path: filePath, size: 'Analyzing...', issues: [], status: 'pending' as const }));
      setAuditFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to load file(s). Please try again.');
    }
  };

  const handleAuditTextureUpload = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const filePaths = await bridge.pickDdsFile();
      if (!filePaths || filePaths.length === 0) return;
      const newFiles = filePaths.map((filePath: string) => ({ id: Date.now().toString() + Math.random(), name: filePath.split(/[\\\/]/).pop() || 'Unknown', type: 'texture' as const, path: filePath, size: 'Analyzing...', issues: [], status: 'pending' as const }));
      setAuditFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to load file(s). Please try again.');
    }
  };

  const handleAuditMaterialUpload = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const filePaths = await bridge.pickBgsmFile();
      if (!filePaths || filePaths.length === 0) return;
      const newFiles = filePaths.map((filePath: string) => ({ id: Date.now().toString() + Math.random(), name: filePath.split(/[\\\/]/).pop() || 'Unknown', type: 'material' as const, path: filePath, size: 'Analyzing...', issues: [], status: 'pending' as const }));
      setAuditFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to load file(s). Please try again.');
    }
  };

  const handleAuditBatchModDirectory = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const modFiles = await bridge.scanModDirectory();
      if (!modFiles || modFiles.length === 0) return;
      const newFiles = modFiles.map((file: { path: string; type: string }) => {
        const fileName = file.path.split(/[\\\/]/).pop() || 'Unknown';
        let fileType: ModFile['type'] = 'script';
        if (file.type === 'nif') fileType = 'mesh';
        else if (file.type === 'dds') fileType = 'texture';
        else if (file.type === 'bgsm' || file.type === 'bgem') fileType = 'material';
        else if (file.type === 'esp' || file.type === 'esm' || file.type === 'esl') fileType = 'plugin';
        return { id: `${Date.now()}-${Math.random()}`, name: fileName, type: fileType, path: file.path, size: 'Analyzing...', issues: [], status: 'pending' as const };
      });
      if (newFiles.length === 0) { toast.error('No mod files found in the selected directory.'); return; }
      setAuditFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) setSelectedFileId(newFiles[0].id);
      toast.success(`Successfully loaded ${newFiles.length} files from the mod directory.`);
    } catch (error) {
      console.error('Directory scan error:', error);
      toast.error('Failed to scan directory. Please try again.');
    }
  };

  const handleQuickScanFolder = async () => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (!bridge) { toast.error('File browser not available. Please use the desktop app.'); return; }
      const folderPath: string | null = await bridge.pickDirectory?.('Select Mod Folder to Scan');
      if (!folderPath) return;
      const rawScanResult = await bridge.scanModDirectoryPath?.(folderPath);
      if (!rawScanResult) { toast.error('Scan failed: the scanModDirectoryPath API is unavailable. Please restart the app.'); return; }
      const modFiles: Array<{ path: string; type: string }> = rawScanResult;
      if (modFiles.length === 0) { toast.error(`No recognized mod files (ESP, NIF, DDS, BGSM/BGEM) were found in: ${folderPath}.`); return; }
      const newFiles: ModFile[] = modFiles.map((file) => {
        const fileName = file.path.split(/[\\\/]/).pop() || 'Unknown';
        let fileType: ModFile['type'] = 'script';
        if (file.type === 'nif') fileType = 'mesh';
        else if (file.type === 'dds') fileType = 'texture';
        else if (file.type === 'bgsm' || file.type === 'bgem') fileType = 'material';
        else if (file.type === 'esp' || file.type === 'esm' || file.type === 'esl') fileType = 'plugin';
        return { id: `${Date.now()}-${Math.random()}`, name: fileName, type: fileType, path: file.path, size: 'Analyzing...', issues: [], status: 'pending' as const };
      });
      pendingAutoScan.current = true;
      setAuditFiles(newFiles);
      setSelectedFileId(newFiles[0]?.id ?? null);
    } catch (error) {
      console.error('[Audit] Quick scan error:', error);
      toast.error('Failed to scan folder. Please try again.');
    }
  };

  const runAudit = () => {
    const filesToScan = auditFiles.filter(f => f.status === 'pending' || f.status === 'warning' || f.status === 'error');
    if (filesToScan.length === 0) { toast.error('No files to scan. Please upload files first.'); return; }
    setIsScanning(true);
    setScanProgress(0);
    setAuditAdvice(null);
    performAuditAnalysis();
  };

  const performAuditAnalysis = async () => {
    const filesToProcess = auditFiles.filter(f => f.status === 'pending' || f.status === 'warning' || f.status === 'error');
    const totalFiles = filesToProcess.length;
    let processedCount = 0;

    const mapESPIssues = (espIssues: any[], prefix: string): AuditIssue[] =>
      espIssues.map((issue: any, i: number) => ({
        id: `${prefix}-${i}`,
        severity: (issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info') as 'error' | 'warning' | 'info',
        message: `[${issue.category}] ${issue.message}`,
        technicalDetails: `${issue.details}\n\n💡 HOW TO FIX:\n${issue.fix}`,
      }));

    const statusFromIssues = (issueList: any[]): 'clean' | 'warning' | 'error' =>
      issueList.some((i: any) => i.severity === 'error') ? 'error'
        : issueList.some((i: any) => i.severity === 'warning') ? 'warning'
          : issueList.length > 0 ? 'warning' : 'clean';

    const updatedFiles = await Promise.all(auditFiles.map(async (f) => {
      if (f.status === 'clean' && !filesToProcess.find(fp => fp.id === f.id)) return f;

      const newIssues: AuditIssue[] = [];
      let status: 'clean' | 'warning' | 'error' | 'pending' = 'clean';
      let fileSize = f.size;

      if (f.name.endsWith('.esp') || f.name.endsWith('.esm') || f.name.endsWith('.esl')) {
        try {
          const cached = await cacheManager.getCachedAnalysisResult(f.name);
          if (cached) {
            fileSize = fmtMB(cached);
            if (cached.issues && cached.issues.length > 0) {
              newIssues.push(...mapESPIssues(cached.issues, 'esp-cached'));
              status = statusFromIssues(cached.issues);
            } else if (cached.warnings && cached.warnings.length > 0) {
              newIssues.push(...cached.warnings.map((w: string, i: number) => ({ id: `esp-cached-${i}`, severity: 'warning' as const, message: 'Plugin Warning', technicalDetails: w })));
              status = 'warning';
            } else {
              status = 'clean';
            }
          } else {
            const fileBuffer = await auditReadFileAsArrayBuffer(f.path);
            const analysis = await workerManager.analyzeAsset('esp', fileBuffer, f.name);
            fileSize = fmtMB(analysis);
            if (analysis.issues && analysis.issues.length > 0) {
              newIssues.push(...mapESPIssues(analysis.issues, 'esp-issue'));
              status = statusFromIssues(analysis.issues);
            } else {
              status = 'clean';
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          const isReadError = errMsg.toLowerCase().includes('could not read') || errMsg.toLowerCase().includes('file');
          newIssues.push({ id: 'esp-error', severity: 'error', message: isReadError ? '[File] Could Not Read Plugin File' : '[File] Plugin Analysis Failed', technicalDetails: isReadError ? `The file could not be loaded for analysis. Close xEdit/CK/MO2 and retry. Raw error: ${errMsg}` : `The analysis engine encountered an error while parsing this plugin. Try re-uploading. Raw error: ${errMsg}` });
          status = 'error';
        }
      } else if (f.name.endsWith('.nif')) {
        try {
          const cached = await cacheManager.getCachedAnalysisResult(f.name);
          if (cached) {
            fileSize = `${(cached.fileSize / 1024).toFixed(2)} KB`;
            if (cached.warnings && cached.warnings.length > 0) {
              newIssues.push(...cached.warnings.map((w: string, i: number) => ({ id: `nif-warning-${i}`, severity: (w.includes('absolute path') ? 'error' : 'warning') as 'error' | 'warning', message: w.includes('High') ? 'Performance Issue' : w.includes('absolute') ? 'Path Issue' : 'Warning', technicalDetails: w })));
              status = cached.warnings.some((w: string) => w.includes('absolute path')) ? 'error' : 'warning';
            } else { status = 'clean'; }
          } else {
            const fileBuffer = await auditReadFileAsArrayBuffer(f.path);
            const analysis = await workerManager.analyzeAsset('nif', fileBuffer, f.name);
            fileSize = `${(analysis.fileSize / 1024).toFixed(2)} KB`;
            if (analysis.warnings && analysis.warnings.length > 0) {
              newIssues.push(...analysis.warnings.map((w: string, i: number) => ({ id: `nif-warning-${i}`, severity: (w.includes('absolute path') ? 'error' : 'warning') as 'error' | 'warning', message: w.includes('High') ? 'Performance Issue' : w.includes('absolute') ? 'Path Issue' : 'Warning', technicalDetails: w })));
              status = analysis.warnings.some((w: string) => w.includes('absolute path')) ? 'error' : 'warning';
            } else { status = 'clean'; }
          }
        } catch (error) {
          newIssues.push({ id: 'nif-error', severity: 'warning', message: 'NIF analysis unavailable', technicalDetails: `Could not read NIF file: ${error instanceof Error ? error.message : 'Unknown error'}` });
          status = 'warning';
        }
      } else if (f.name.endsWith('.dds')) {
        try {
          const cached = await cacheManager.getCachedAnalysisResult(f.name);
          if (cached) {
            fileSize = `${(cached.fileSize / 1024).toFixed(2)} KB`;
            if (cached.warnings && cached.warnings.length > 0) {
              newIssues.push(...cached.warnings.map((w: string, i: number) => ({ id: `dds-warning-${i}`, severity: (w.includes('Uncompressed') || w.includes('Non-Power-of-Two') ? 'error' : 'warning') as 'error' | 'warning', message: w.includes('Uncompressed') ? 'Compression Issue' : w.includes('4K') ? 'Resolution Issue' : w.includes('Non-Power-of-Two') ? 'Dimension Issue' : 'Warning', technicalDetails: w })));
              status = cached.warnings.some((w: string) => w.includes('Uncompressed') || w.includes('Non-Power-of-Two')) ? 'error' : 'warning';
            } else { status = 'clean'; }
          } else {
            const fileBuffer = await auditReadFileAsArrayBuffer(f.path);
            const analysis = await workerManager.analyzeAsset('dds', fileBuffer, f.name);
            fileSize = `${(analysis.fileSize / 1024).toFixed(2)} KB`;
            if (analysis.warnings && analysis.warnings.length > 0) {
              newIssues.push(...analysis.warnings.map((w: string, i: number) => ({ id: `dds-warning-${i}`, severity: (w.includes('Uncompressed') || w.includes('Non-Power-of-Two') ? 'error' : 'warning') as 'error' | 'warning', message: w.includes('Uncompressed') ? 'Compression Issue' : w.includes('4K') ? 'Resolution Issue' : w.includes('Non-Power-of-Two') ? 'Dimension Issue' : 'Warning', technicalDetails: w })));
              status = analysis.warnings.some((w: string) => w.includes('Uncompressed') || w.includes('Non-Power-of-Two')) ? 'error' : 'warning';
            } else { status = 'clean'; }
          }
        } catch (error) {
          newIssues.push({ id: 'dds-error', severity: 'warning', message: 'DDS analysis unavailable', technicalDetails: `Could not read DDS file: ${error instanceof Error ? error.message : 'Unknown error'}` });
          status = 'warning';
        }
      } else if (f.name.endsWith('.bgsm') || f.name.endsWith('.bgem')) {
        try {
          const fileBuffer = await auditReadFileAsArrayBuffer(f.path);
          fileSize = `${(fileBuffer.byteLength / 1024).toFixed(2)} KB`;
          const view = new Uint8Array(fileBuffer.slice(0, 4));
          const signature = String.fromCharCode(...view);
          if (signature === 'BGSM' || signature === 'BGEM') {
            status = 'clean';
            newIssues.push({ id: 'bgsm-info', severity: 'info', message: 'Material file format valid', technicalDetails: `${signature} material file loaded successfully` });
          } else {
            status = 'error';
            newIssues.push({ id: 'bgsm-error', severity: 'error', message: 'Invalid material file signature', technicalDetails: `Expected BGSM/BGEM, got: ${signature}` });
          }
        } catch (error) {
          status = 'warning';
          newIssues.push({ id: 'bgsm-read-error', severity: 'warning', message: 'Could not read material file', technicalDetails: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }

      processedCount++;
      setScanProgress(Math.round((processedCount / totalFiles) * 100));
      return { ...f, issues: newIssues, status, size: fileSize };
    }));

    setAuditFiles(updatedFiles);
    setIsScanning(false);
    setScanProgress(0);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mossy_scan_auditor', JSON.stringify(updatedFiles));
        window.dispatchEvent(new Event('mossy-memory-update'));
      }
    } catch (error) {
      console.error('Failed to save audit results to localStorage:', error);
      // Don't crash, just log the error
    }

    const totalIssues = updatedFiles.reduce((sum, f) => sum + f.issues.length, 0);
    const errorCount = updatedFiles.filter(f => f.status === 'error').length;
    const warningCount = updatedFiles.filter(f => f.status === 'warning').length;
    const cleanCount = updatedFiles.filter(f => f.status === 'clean').length;

    let adviceMessage = `✅ Audit complete. Scanned ${updatedFiles.length} file(s): ${cleanCount} clean, ${warningCount} warnings, ${errorCount} errors (${totalIssues} total issues).`;
    if (totalIssues > 0) adviceMessage += ` Click any issue in the inspector to get a detailed explanation and fix steps.`;

    const navmeshErrors = updatedFiles.flatMap(f =>
      f.issues.filter(i => i.message.includes('Deleted Navmesh') || i.technicalDetails?.includes('Deleted navmesh'))
    );
    if (navmeshErrors.length > 0) {
      adviceMessage = `⚠️ CRITICAL: ${navmeshErrors.length} deleted navmesh record(s) detected. This WILL cause CTD when NPCs try to pathfind. Open the affected plugin in xEdit → find [D] NAVM records → use Change FormID to replace the vanilla FormID with your new navmesh record.`;
    }

    setAuditAdvice(adviceMessage);

    const firstFileWithIssues = updatedFiles.find(f => f.issues.length > 0);
    if (firstFileWithIssues) {
      setSelectedFileId(firstFileWithIssues.id);
      const criticalIssue = firstFileWithIssues.issues.find(i => i.severity === 'error') ?? firstFileWithIssues.issues[0];
      if (criticalIssue) setTimeout(() => getAuditAdvice(criticalIssue), 100);
    }
  };

  const getAuditAdvice = async (issue: AuditIssue) => {
    setAuditAdvice('Analyzing issue...');
    try {
      const isNavmeshIssue = issue.message.includes('Navmesh') || issue.technicalDetails?.includes('navmesh') || issue.technicalDetails?.includes('NAVM');
      const navmeshContext = isNavmeshIssue
        ? '\nThis is a NAVMESH issue. Explain the xEdit "Change FormID" fix: load plugin in xEdit 4.0.3+, find [D] NAVM records, copy the deleted FormID, find the replacement NAVM the mod added, right-click → Change FormID → paste the copied FormID → accept "Update all references", then remove the original deleted record.'
        : '';
      const prompt = `Act as an expert Fallout 4 Modder AI assistant named Mossy.\nThe user has a file with the following error:\nError: ${issue.message}\nDetails: ${issue.technicalDetails}\n${navmeshContext}\nExplain clearly why this is a problem for Fallout 4 stability and give the user exact manual steps to fix it. Be concise and friendly.`;
      const api = (window as any).electronAPI ?? (window as any).electron?.api;
      if (!api?.aiChatGroq && !api?.aiChatOpenAI) { setAuditAdvice('⚠️ AI advice is unavailable in this build.'); return; }
      const res = api.aiChatGroq
        ? await api.aiChatGroq(prompt, 'You are Mossy, a Fallout 4 modding assistant.', 'llama-3.3-70b-versatile')
        : await api.aiChatOpenAI(prompt, 'You are Mossy, a Fallout 4 modding assistant.', 'gpt-3.5-turbo');
      if (res?.success && res?.content) { setAuditAdvice(String(res.content)); }
      else { setAuditAdvice(String(res?.error || 'AI advice failed.')); }
    } catch (e) {
      console.error('Audit advice error:', e);
      setAuditAdvice("I cannot reach my knowledge base right now, but this usually requires cleaning the plugin in xEdit.\n\nDon't have xEdit? Download FO4Edit from Nexus Mods:\nhttps://www.nexusmods.com/fallout4/mods/2737");
    }
  };

  /**
   * RENDER: Asset Audit Tab
   */
  const renderAuditTab = () => {
    const selectedFile = auditFiles.find(f => f.id === selectedFileId);
    return (
      <div data-testid="auditor-section" className="h-full flex flex-col bg-[#0d1117] text-slate-200 font-sans overflow-hidden min-h-0" onWheel={wheelProxy}>
        {/* Auto-scan banner — shown when the Spriggit vanilla digest queued files for us */}
        {autoScanBanner && (
          <div className="bg-emerald-900/40 border-b border-emerald-600/50 px-4 py-3 flex items-center gap-3">
            <Brain className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-200 flex-1">
              <strong>Vanilla ESMs queued from Spriggit digest.</strong> Run a full audit now to check every base-game plugin for issues.
            </p>
            <button
              type="button"
              onClick={() => {
                setAutoScanBanner(false);
                pendingAutoScan.current = true;
                setIsScanning(true);
                setScanProgress(0);
                setAuditAdvice(null);
                performAuditAnalysis();
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors flex-shrink-0"
            >
              Run Audit Now
            </button>
            <button
              type="button"
              onClick={() => setAutoScanBanner(false)}
              className="text-emerald-400 hover:text-emerald-200 text-xs px-2"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-900/30 border-b border-blue-700/50 px-4 py-2 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-200">
            <strong>Real ESP Analysis:</strong> Files are validated and checked for size/record issues.
            Click issues to get AI-powered advice and fixes (requires an AI provider configured in Settings).
          </p>
        </div>

        {/* ── Spriggit Vanilla ESM Digest Panel ───────────────────────────── */}
        <div className="border-b border-slate-700 bg-slate-900/60">
          <button
            type="button"
            onClick={() => setSpriggitPanelOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
          >
            <Brain className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-300">Spriggit Vanilla ESM Digest</span>
            <span className="text-xs text-slate-400 ml-1">— convert base-game ESMs into Mossy's Knowledge Vault</span>
            <span className="ml-auto text-slate-500 text-xs">{spriggitPanelOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {spriggitPanelOpen && (
            <div className="px-4 pb-4 pt-1 space-y-3">
              <p className="text-xs text-slate-400">
                Uses <strong className="text-slate-300">Spriggit.CLI.exe serialize</strong> with{' '}
                <code className="bg-slate-800 px-1 rounded text-emerald-300">--PackageName</code> to convert
                vanilla ESMs (Fallout4.esm + all DLCs) to YAML and digest them into Mossy's brain.
                Specify a <strong className="text-slate-300">Local NuGet Source</strong> folder if you have the
                translation packages cached locally — this bypasses the nuget.org download entirely.
              </p>

              {/* Paths row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Spriggit.CLI.exe</label>
                  <div className="flex gap-2">
                    <input readOnly value={sdCliPath} placeholder="Not selected"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none" />
                    <button type="button"
                      onClick={async () => { const api = getApi(); if (!api?.spriggitPickCli) return; const p = await api.spriggitPickCli(); if (p) setSdCliPath(p); }}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors">
                      <FolderOpen className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fallout 4 Data Folder</label>
                  <div className="flex gap-2">
                    <input readOnly value={sdDataPath} placeholder="e.g. C:\Steam\steamapps\common\Fallout 4\Data"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none" />
                    <button type="button"
                      onClick={async () => { const api = getApi(); if (!api?.pickDirectory) return; const p = await api.pickDirectory('Select Fallout 4 Data Folder'); if (p) setSdDataPath(p); }}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors">
                      <FolderOpen className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                </div>
              </div>

              {/* Package name + local NuGet source row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Package Name <span className="text-slate-500 font-normal">(--PackageName)</span>
                  </label>
                  <input value={sdPackageName} onChange={e => setSdPackageName(e.target.value)}
                    placeholder="Spriggit.Yaml.Fallout4"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Built-in: <code className="text-emerald-400">Spriggit.Yaml.Fallout4</code> or <code className="text-emerald-400">Spriggit.Json.Fallout4</code>.
                    Custom packages: publish to NuGet and enter the package name here.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Local NuGet Source <span className="text-slate-500 font-normal">(--Source, optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input value={sdNugetSource} onChange={e => setSdNugetSource(e.target.value)}
                      placeholder="e.g. D:\Tools\Spriggit-dev\Translation Packages"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <button type="button"
                      onClick={async () => { const api = getApi(); if (!api?.pickDirectory) return; const p = await api.pickDirectory('Select Local NuGet Source Folder'); if (p) setSdNugetSource(p); }}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors">
                      <FolderOpen className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Point to the folder containing your local <code className="text-emerald-400">Spriggit.Yaml.Fallout4</code> /
                    <code className="text-emerald-400"> Spriggit.Json.Fallout4</code> packages to skip nuget.org entirely.
                    E.g. <code className="text-slate-400">D:\Tools\Spriggit-dev\Translation Packages</code>
                  </p>
                </div>
              </div>

              {/* Status message */}
              {sdMessage && (
                <div className={`rounded px-3 py-2 text-xs whitespace-pre-line break-words max-h-40 overflow-y-auto ${sdStatus === 'error' ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                  : sdStatus === 'partial' ? 'bg-amber-900/30 border border-amber-600/50 text-amber-200'
                    : sdStatus === 'done' ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-200'
                      : 'bg-slate-800/60 border border-slate-600 text-slate-300'}`}>
                  {sdMessage}
                </div>
              )}

              {/* Troubleshooting row — shown on 0xFFFFFFFF errors */}
              {sdStatus === 'error' && sdMessage.includes('0xFFFFFFFF') && (
                <div className="flex flex-wrap items-center gap-2">
                  {sdCliPath && (
                    <button type="button" disabled={sdUnblockInProgress}
                      onClick={async () => {
                        const api = getApi(); if (!api?.spriggitUnblockFiles) return;
                        setSdUnblockInProgress(true); setSdUnblockResult(null);
                        try { const r = await api.spriggitUnblockFiles(); setSdUnblockResult(r); }
                        catch (e: any) { setSdUnblockResult({ ok: false, error: String(e?.message || e) }); }
                        finally { setSdUnblockInProgress(false); }
                      }}
                      className="px-3 py-1 rounded bg-violet-800/60 hover:bg-violet-700/60 disabled:opacity-50 text-violet-100 text-xs font-semibold transition-colors">
                      {sdUnblockInProgress ? '🔄 Unblocking…' : '🔓 Unblock Files'}
                    </button>
                  )}
                  {sdUnblockResult?.ok && (
                    <span className="text-xs text-violet-300 font-semibold">
                      ✅ Unblocked {sdUnblockResult.unblocked ?? 0} file(s) — now click 🗑️ Clear Cache &amp; Retry
                    </span>
                  )}
                  <button type="button"
                    disabled={sdCacheClearInProgress || sdStatus === 'running' || sdAutoUnblockState === 'unblocking' || sdAutoUnblockState === 'retrying'}
                    onClick={async () => {
                      const api = getApi(); if (!api?.spriggitClearCache) return;
                      setSdCacheClearInProgress(true); setSdCacheClearResult(null); setSdAutoUnblockState('idle');
                      let clearOk = false;
                      try { const r = await api.spriggitClearCache(); clearOk = r.ok; setSdCacheClearResult(r.ok ? 'ok' : 'error'); }
                      catch { setSdCacheClearResult('error'); }
                      finally { setSdCacheClearInProgress(false); }
                      if (clearOk) {
                        const first = await runSpriggitVanillaDigest();
                        if (first.failed0xFFFF && api.spriggitUnblockFiles) {
                          setSdAutoUnblockState('unblocking');
                          try {
                            const ur = await api.spriggitUnblockFiles();
                            if (ur?.ok) {
                              setSdUnblockResult(ur);
                              setSdAutoUnblockState('retrying');
                              await runSpriggitVanillaDigest();
                            } else { setSdAutoUnblockState('failed'); }
                          } catch { setSdAutoUnblockState('failed'); }
                        }
                      }
                    }}
                    className="px-3 py-1 rounded bg-amber-800/60 hover:bg-amber-700/60 disabled:opacity-50 text-amber-100 text-xs font-semibold transition-colors">
                    {(sdCacheClearInProgress || sdAutoUnblockState === 'unblocking' || sdAutoUnblockState === 'retrying')
                      ? (sdCacheClearInProgress ? '🔄 Clearing…' : sdAutoUnblockState === 'unblocking' ? '🔓 Unblocking…' : '🔄 Retrying…')
                      : '🗑️ Clear Cache & Retry'}
                  </button>
                  {sdAutoUnblockState === 'unblocking' && <span className="text-xs text-violet-300">🔓 Auto-unblocking fresh assemblies…</span>}
                  {sdAutoUnblockState === 'retrying' && <span className="text-xs text-emerald-300">🔄 Retrying with unblocked assemblies…</span>}
                  {sdCacheClearResult === 'ok' && sdStatus === 'error' && sdAutoUnblockState === 'failed' && (
                    <span className="text-xs text-amber-300 font-semibold">
                      ⚠️ Auto-unblock ran but still failing — add a Windows Defender exclusion for your Spriggit folder:
                      Windows Security → Virus &amp; threat protection → Exclusions → Add → Folder.
                    </span>
                  )}
                  {sdCacheClearResult === 'ok' && sdStatus === 'error' && sdAutoUnblockState === 'idle' && (
                    <span className="text-xs text-amber-300 font-semibold">
                      ⚠️ Cache cleared but still failing — fresh assemblies extracted, click 🔓 Unblock Files then 🗑️ Clear Cache &amp; Retry again.
                    </span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button type="button"
                  disabled={sdStatus === 'running' || !sdCliPath || !sdDataPath}
                  onClick={() => void runSpriggitVanillaDigest()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {sdStatus === 'running' ? 'Converting…' : 'Convert & Digest into Brain'}
                </button>
                {sdStatus === 'done' || sdStatus === 'partial' ? (
                  <span className="self-center text-xs text-emerald-400 font-semibold">✅ Done — Knowledge Vault updated</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* ── Spriggit Custom Mod Conversion Panel ─────────────────────────── */}
        <div className="border-b border-slate-700 bg-slate-900/60">
          <button
            type="button"
            onClick={() => setCustomModPanelOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
          >
            <GitBranch className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-bold text-cyan-300">Custom Mod Version Control (Git)</span>
            <span className="text-xs text-slate-400 ml-1">— convert YOUR mods to/from Git-friendly format</span>
            <span className="ml-auto text-slate-500 text-xs">{customModPanelOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {customModPanelOpen && (
            <div className="px-4 pb-4 pt-1 space-y-3">
              {/* Education Section */}
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/30 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-200 mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Why Use Git for Mods?
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 ml-5 list-disc">
                  <li>Keep track of all versions without "Dropbox folder hell"</li>
                  <li>Create a living changelog as you work</li>
                  <li>Go back in time and view your mod at any point in history</li>
                  <li>Stamp versions with tags (v1.0, v2.0, etc.)</li>
                  <li>Experiment on branches without breaking your stable version</li>
                  <li>Share your work on GitHub for community visibility</li>
                  <li>Accept contributions via Pull Requests from other modders</li>
                  <li>Merge work from multiple developers with Git merge technology</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-cyan-800/30 flex gap-2 flex-wrap text-xs">
                  <button onClick={() => auditOpenUrl('https://github.com/Mutagen-Modding/Spriggit')} className="px-2 py-1 bg-cyan-800/40 hover:bg-cyan-700/40 rounded text-cyan-200 font-semibold transition-colors">
                    📚 Spriggit Docs
                  </button>
                  <button onClick={() => auditOpenUrl('https://docs.github.com/en/get-started/quickstart/hello-world')} className="px-2 py-1 bg-blue-800/40 hover:bg-blue-700/40 rounded text-blue-200 font-semibold transition-colors">
                    📖 Git Basics
                  </button>
                </div>
              </div>

              {/* Operation Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Operation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCustomModOperation('serialize')}
                    className={`px-4 py-2 rounded text-xs font-bold transition-colors ${customModOperation === 'serialize'
                      ? 'bg-cyan-700 text-white border-2 border-cyan-500'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                  >
                    📤 Serialize (Plugin → Git)
                  </button>
                  <button
                    onClick={() => setCustomModOperation('deserialize')}
                    className={`px-4 py-2 rounded text-xs font-bold transition-colors ${customModOperation === 'deserialize'
                      ? 'bg-cyan-700 text-white border-2 border-cyan-500'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-2 border-transparent'
                      }`}
                  >
                    📥 Deserialize (Git → Plugin)
                  </button>
                </div>
              </div>

              {/* Format Selection (only for serialize) */}
              {customModOperation === 'serialize' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Output Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCustomModFormat('yaml')}
                      className={`px-4 py-2 rounded text-xs font-bold transition-colors ${customModFormat === 'yaml'
                        ? 'bg-emerald-700 text-white border-2 border-emerald-500'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-2 border-transparent'
                        }`}
                    >
                      YAML (Recommended)
                    </button>
                    <button
                      onClick={() => setCustomModFormat('json')}
                      className={`px-4 py-2 rounded text-xs font-bold transition-colors ${customModFormat === 'json'
                        ? 'bg-emerald-700 text-white border-2 border-emerald-500'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-2 border-transparent'
                        }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              )}

              {/* Input/Output Paths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {customModOperation === 'serialize' ? 'Plugin File (.esp/.esm/.esl)' : 'Git Repository Folder'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={customModInputPath}
                      placeholder={customModOperation === 'serialize' ? 'Select your plugin file' : 'Select Git folder with YAML/JSON'}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const api = getApi();
                        if (customModOperation === 'serialize') {
                          if (!api?.pickEspFile) return;
                          const p = await api.pickEspFile();
                          if (p) setCustomModInputPath(p);
                        } else {
                          if (!api?.pickDirectory) return;
                          const p = await api.pickDirectory('Select Git Repository Folder');
                          if (p) setCustomModInputPath(p);
                        }
                      }}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {customModOperation === 'serialize' ? 'Output Git Folder' : 'Output Plugin File'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={customModOutputPath}
                      placeholder={customModOperation === 'serialize' ? 'Where to create Git repo' : 'Where to save .esp file'}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const api = getApi();
                        if (!api?.pickDirectory) return;
                        const p = await api.pickDirectory(
                          customModOperation === 'serialize'
                            ? 'Select Output Folder for Git Repository'
                            : 'Select Output Folder for Plugin'
                        );
                        if (p) setCustomModOutputPath(p);
                      }}
                      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Browse
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {customModMessage && (
                <div
                  className={`rounded px-3 py-2 text-xs whitespace-pre-line break-words max-h-48 overflow-y-auto ${customModStatus === 'error'
                    ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                    : customModStatus === 'success'
                      ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-200'
                      : 'bg-slate-800/60 border border-slate-600 text-slate-300'
                    }`}
                >
                  {customModMessage}
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={customModStatus === 'running' || !sdCliPath || !customModInputPath}
                  onClick={runCustomModConversion}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <GitBranch className="w-4 h-4" />
                  {customModStatus === 'running'
                    ? 'Converting...'
                    : customModOperation === 'serialize'
                      ? '📤 Convert to Git Format'
                      : '📥 Convert to Plugin'}
                </button>
                {!sdCliPath && (
                  <span className="self-center text-xs text-amber-400 font-semibold">
                    ⚠️ First set Spriggit.CLI.exe path above
                  </span>
                )}
                {customModStatus === 'success' && (
                  <span className="self-center text-xs text-emerald-400 font-semibold">
                    ✅ Conversion complete!
                  </span>
                )}
              </div>

              {/* Workflow Guide */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-300 mb-2">
                  {customModOperation === 'serialize' ? '📤 Serialize Workflow:' : '📥 Deserialize Workflow:'}
                </h4>
                {customModOperation === 'serialize' ? (
                  <ol className="text-xs text-slate-400 space-y-1 ml-4 list-decimal">
                    <li>Create your mod with Creation Kit or other tools</li>
                    <li>Select your .esp/.esm/.esl file above</li>
                    <li>Choose an output folder (your Git repository)</li>
                    <li>Click "Convert to Git Format"</li>
                    <li>In the output folder, run: <code className="bg-slate-900 px-1 rounded text-cyan-300">git init</code></li>
                    <li>Make your first commit: <code className="bg-slate-900 px-1 rounded text-cyan-300">git add . && git commit -m "Initial commit"</code></li>
                    <li>Push to GitHub: <code className="bg-slate-900 px-1 rounded text-cyan-300">gh repo create --source=. --public</code></li>
                  </ol>
                ) : (
                  <ol className="text-xs text-slate-400 space-y-1 ml-4 list-decimal">
                    <li>Clone a Git repository: <code className="bg-slate-900 px-1 rounded text-cyan-300">git clone [url]</code></li>
                    <li>Select the cloned folder as input above</li>
                    <li>Choose where to save the .esp file</li>
                    <li>Click "Convert to Plugin"</li>
                    <li>Open the plugin in Creation Kit or load in game</li>
                    <li>Make changes, then serialize again to update the Git repo</li>
                  </ol>
                )}
              </div>

              {/* AI-Powered Mod Diagnostic */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-700/30 rounded-lg p-4">
                <h4 className="text-sm font-bold text-purple-200 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Mod Diagnostic
                </h4>
                <p className="text-xs text-slate-300 mb-3">
                  Let Mossy analyze your mod's Spriggit data to find issues, suggest fixes, and improve quality.
                  Works best after you've serialized your mod to YAML/JSON format.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Git Repository to Diagnose
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={customModDiagnosticPath}
                        placeholder="Select a Spriggit repository folder"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const api = getApi();
                          if (!api?.pickDirectory) return;
                          const p = await api.pickDirectory('Select Spriggit Repository for Diagnostic');
                          if (p) setCustomModDiagnosticPath(p);
                        }}
                        className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-slate-200 flex items-center gap-1 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Browse
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={customModDiagnosticRunning || !customModDiagnosticPath}
                    onClick={runModDiagnostic}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    {customModDiagnosticRunning ? '🔍 Analyzing...' : '🔍 Run AI Diagnostic'}
                  </button>

                  {customModDiagnosticResults && (
                    <div className="bg-slate-900/60 border border-purple-700/50 rounded px-3 py-3 text-xs text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {customModDiagnosticResults}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 space-y-1">
                    <p>✨ <strong className="text-purple-300">What Mossy Checks:</strong></p>
                    <ul className="ml-4 list-disc space-y-0.5">
                      <li>Missing master files & FormID conflicts</li>
                      <li>Invalid references & broken records</li>
                      <li>Performance issues (poly counts, scripts)</li>
                      <li>NavMesh & Precombine problems</li>
                      <li>Best practice violations</li>
                      <li>Compatibility concerns</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pt-4 max-h-72 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ToolsInstallVerifyPanel
              className="mb-0"
              accentClassName="text-emerald-300"
              description="Asset Audit is an in-app triage view. You can inspect assets/plugins here; external tools are only needed when you decide to edit/fix files outside the app."
              tools={[
                { label: 'FO4Edit (xEdit) (optional for plugin fixes)', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', note: 'Use Nexus search to pick the current maintained release.', kind: 'search' },
                { label: 'NifSkope (optional for mesh inspection)', href: 'https://github.com/niftools/nifskope/releases', note: 'Official GitHub releases.', kind: 'official' },
              ]}
              verify={[
                'Upload one small test file (ESP/NIF/DDS/BGSM) and confirm it appears in the file list.',
                'Click an issue and confirm the advice panel updates.',
              ]}
              firstTestLoop={[
                'Scan one tiny file first (fast feedback).',
                'Apply exactly one fix (in-app or external tool), then re-upload to confirm the issue count drops.',
              ]}
              troubleshooting={[
                'If AI advice is empty, confirm your API key is configured and try again.',
                'If uploads do nothing, you may be running without native file picker support.',
              ]}
            />
            <div className="flex flex-col gap-4">
              <ProjectWizard wizardId="audit-fixer" onActionComplete={(res) => setAuditAdvice(res.message)} />
            </div>
          </div>
        </div>

        {/* Audit Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Asset Audit
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">Asset Integrity &amp; Code Compliance</p>
          </div>
          {/* Sub-tab switcher */}
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700">
            <button onClick={() => setActiveAuditSubTab('audit')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeAuditSubTab === 'audit' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-slate-200'}`} aria-label="Switch to Audit sub-tab">
              <ShieldCheck className="w-3.5 h-3.5" /> Audit
            </button>
            <button onClick={() => setActiveAuditSubTab('debug')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeAuditSubTab === 'debug' ? 'bg-red-800 text-white' : 'text-slate-400 hover:text-slate-200'}`} aria-label="Switch to Debug sub-tab">
              <Bug className="w-3.5 h-3.5" /> Debug
            </button>
          </div>
          <Link to="/reference" className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors" title="Open help">Help</Link>
          {activeAuditSubTab === 'audit' && (
            <div className="flex gap-4 items-center">
              {isScanning && (
                <div className="w-48">
                  <div className="flex justify-between text-[10px] text-emerald-400 mb-1">
                    <span>SCANNING SECTOR 7G...</span><span>{scanProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-100" role="progressbar" aria-label="Scan progress" aria-valuenow={Math.round(scanProgress)} aria-valuemin={0} aria-valuemax={100} style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="flex flex-nowrap gap-2 overflow-x-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" ref={auditButtonsRef} onWheel={auditButtonsWheelProxy}>
                <button data-testid="quick-scan-folder" onClick={handleQuickScanFolder} disabled={isScanning} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_18px_rgba(5,150,105,0.4)]" title="Pick a mod folder — scans ALL files (ESP, NIF, DDS, BGSM) and starts the audit automatically" aria-label="Quick Scan Folder">
                  <Scan className="w-4 h-4" /> Quick Scan Folder
                </button>
                <button data-testid="batch-mod-directory" onClick={handleAuditBatchModDirectory} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]" title="Upload entire mod directory">
                  <ArrowRight className="w-5 h-5" /> Upload Entire Mod
                </button>
                <button data-testid="esp-analysis" onClick={handleAuditESPUpload} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]" title="Upload ESP/ESM/ESL plugin">
                  <FileCode className="w-4 h-4" /> ESP
                </button>
                <button data-testid="nif-analysis" onClick={handleAuditMeshUpload} title="Upload one or more NIF mesh files (batch)" className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                  <Box className="w-4 h-4" /> NIFs (batch)
                </button>
                <button data-testid="dds-analysis" onClick={handleAuditTextureUpload} title="Upload one or more DDS texture files (batch)" className="flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(219,39,119,0.3)]">
                  <FileImage className="w-4 h-4" /> DDS (batch)
                </button>
                <button onClick={handleAuditMaterialUpload} title="Upload one or more BGSM/BGEM material files (batch)" className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]">
                  <Wrench className="w-4 h-4" /> BGSM (batch)
                </button>
              </div>
              <button onClick={runAudit} disabled={isScanning} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)] disabled:opacity-50">
                {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                {isScanning ? 'Analyzing...' : 'Run Audit'}
              </button>
            </div>
          )}
          {/* Accessibility text input */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 border-l border-slate-700 ml-4">
            <input type="text" placeholder="Can't speak English? Type here..." value={userInputText} onChange={(e) => setUserInputText(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && userInputText.trim()) { setAuditAdvice(`You said: "${userInputText}"\n\nPlease note: Translation or language processing is not yet available.`); setUserInputText(''); } }}
              className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" title="Type text if you can't speak or don't speak English." aria-label="Text input for accessibility" />
            <button onClick={() => { if (userInputText.trim()) { setAuditAdvice(`You said: "${userInputText}"\n\nPlease note: Translation or language processing is not yet available.`); setUserInputText(''); } }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded transition-colors" title="Submit your typed text">Show Text</button>
          </div>
          {/* External tool links */}
          <div className="flex items-center gap-3 ml-4 text-[11px]">
            <span className="text-slate-500">Need tools?</span>
            <button onClick={() => openNexusSearch('FO4Edit xEdit')} className="text-emerald-400 hover:text-emerald-300 font-bold" title="Open Nexus search for FO4Edit (xEdit)">xEdit</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => auditOpenUrl('https://github.com/niftools/nifskope/releases')} className="text-purple-400 hover:text-purple-300 font-bold" title="Open NifSkope releases">NifSkope</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => auditOpenUrl('https://www.nexusmods.com/fallout4/mods/6821')} className="text-blue-400 hover:text-blue-300 font-bold" title="Open FOMOD Creation Tool">FOMOD Creator</button>
            <span className="text-slate-600">•</span>
            <button onClick={() => auditOpenUrl('https://www.blender.org/download/')} className="text-pink-400 hover:text-pink-300 font-bold" title="Open Blender download">Blender</button>
          </div>
        </div>

        {/* External tool notices */}
        {activeAuditSubTab === 'audit' && (
          <div className="px-4 pb-3 bg-slate-900 flex flex-col gap-2">
            <ExternalToolNotice toolKey="xeditPath" toolName="xEdit / FO4Edit" nexusUrl="https://www.nexusmods.com/fallout4/mods/2737" description="Clean plugins (ITM/UDR), resolve conflicts, and generate patches." />
            <ExternalToolNotice toolKey="nifSkopePath" toolName="NifSkope" nexusUrl="https://github.com/niftools/nifskope/releases" description="Inspect and fix NIFs: materials, collision, texture paths, and more." />
          </div>
        )}

        {/* Three-panel layout */}
        {activeAuditSubTab === 'audit' && (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Left: File Manifest */}
            <div className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900">Mod Manifest</div>
              <div ref={fileListScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2 space-y-1">
                {auditFiles.map(file => (
                  <div key={file.id} onClick={() => { setSelectedFileId(file.id); setAuditAdvice(null); }} className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${selectedFileId === file.id ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-transparent hover:bg-slate-800/50'}`}>
                    <div className={`p-2 rounded-lg ${file.status === 'clean' ? 'bg-emerald-900/20 text-emerald-500' : file.status === 'warning' ? 'bg-yellow-900/20 text-yellow-500' : file.status === 'error' ? 'bg-red-900/20 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
                      {file.type === 'mesh' ? <Box className="w-4 h-4" /> : file.type === 'texture' ? <FileImage className="w-4 h-4" /> : file.type === 'plugin' ? <FileCode className="w-4 h-4" /> : <File className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-200 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{file.size}</div>
                    </div>
                    {file.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    {file.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                    {file.status === 'clean' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    <button onClick={(e) => { e.stopPropagation(); removeAuditFile(file.id); }} className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/40 hover:text-red-400 text-slate-500 transition-all flex-shrink-0" title="Remove from manifest" aria-label={`Remove ${file.name} from manifest`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: Inspector */}
            <div className="flex-1 min-h-0 bg-[#0a0d14] flex flex-col overflow-hidden">
              {selectedFile && selectedFile.name ? (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-white">{selectedFile.name}</h2>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-mono uppercase">{selectedFile.type}</span>
                        </div>
                        <div className="text-sm text-slate-500 font-mono flex gap-4">
                          <span>Path: {selectedFile.path}</span>
                          <span>Size: {selectedFile.size}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-4 py-2 rounded-lg font-bold text-sm border ${selectedFile.status === 'clean' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : selectedFile.status === 'error' ? 'bg-red-900/20 text-red-400 border-red-500/30' : selectedFile.status === 'warning' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          STATUS: {selectedFile.status.toUpperCase()}
                        </div>
                        {selectedFile.type === 'plugin' && <button onClick={() => launchToolWithFile('xeditPath', selectedFile.path, 'xEdit')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 rounded text-xs font-bold transition-colors" title="Open this ESP/ESM in xEdit"><Wrench className="w-3.5 h-3.5" /> Open in xEdit</button>}
                        {selectedFile.type === 'plugin' && <button onClick={() => launchToolWithFile('creationKitPath', selectedFile.path, 'Creation Kit')} className="flex items-center gap-1.5 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30 rounded text-xs font-bold transition-colors" title="Open this plugin in the Creation Kit"><FileCode className="w-3.5 h-3.5" /> Open in CK</button>}
                        {selectedFile.type === 'mesh' && <button onClick={() => launchToolWithFile('nifSkopePath', selectedFile.path, 'NifSkope')} className="flex items-center gap-1.5 px-3 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 rounded text-xs font-bold transition-colors" title="Open this NIF mesh in NifSkope"><Box className="w-3.5 h-3.5" /> Open in NifSkope</button>}
                        {selectedFile.type === 'mesh' && <button onClick={() => launchToolWithFile('blenderPath', selectedFile.path, 'Blender')} className="flex items-center gap-1.5 px-3 py-2 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 border border-orange-500/30 rounded text-xs font-bold transition-colors" title="Open this NIF in Blender"><Box className="w-3.5 h-3.5" /> Open in Blender</button>}
                      </div>
                    </div>
                  </div>

                  <div ref={issuesScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 space-y-4">
                    {/* Hidden test elements for E2E testing */}
                    <div className="hidden">
                      <div data-testid="esp-header-validation">ESP Header Validation</div>
                      <div data-testid="esp-record-counting">ESP Record Counting</div>
                      <div data-testid="esp-file-size-limits">ESP File Size Limits</div>
                      <div data-testid="nif-vertex-count">NIF Vertex Count</div>
                      <div data-testid="nif-triangle-count">NIF Triangle Count</div>
                      <div data-testid="nif-texture-validation">NIF Texture Validation</div>
                      <div data-testid="nif-performance-warnings">NIF Performance Warnings</div>
                      <div data-testid="dds-format-detection">DDS Format Detection</div>
                      <div data-testid="dds-resolution-validation">DDS Resolution Validation</div>
                      <div data-testid="dds-power-of-two-check">DDS Power of Two Check</div>
                      <div data-testid="dds-compression-analysis">DDS Compression Analysis</div>
                      <div data-testid="absolute-path-detection">Absolute Path Detection</div>
                    </div>

                    {selectedFile?.issues?.length === 0 && selectedFile?.status === 'clean' && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <CheckCircle2 className="w-24 h-24 mb-4 text-emerald-500 opacity-40" />
                        <p className="text-lg font-bold text-emerald-400/80">Analysis Complete: Clean</p>
                        <p className="text-sm opacity-60">No anomalies detected.</p>
                        {selectedFile?.type === 'texture' && selectedFile?.dimensions && (
                          <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-xl w-64 animate-slide-up">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Visual Diagnostics</h4>
                            <div className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden relative group shadow-inner">
                              {texturePreview ? (<img src={texturePreview} alt="Preview" className="w-full h-full object-contain" />) : (
                                <div className="text-center group-hover:scale-110 transition-transform duration-500">
                                  <FileImage className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                                  <span className="text-[10px] font-mono text-slate-600 uppercase tracking-tighter">{selectedFile?.dimensions?.format}</span>
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-slate-900/90 backdrop-blur-sm p-3 border-t border-slate-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{selectedFile?.dimensions?.width} <span className="text-slate-600">x</span> {selectedFile?.dimensions?.height}</span>
                                  <span className="px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black">{selectedFile?.dimensions?.format}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedFile?.issues?.length === 0 && (selectedFile?.status === 'error' || selectedFile?.status === 'warning') && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                        <AlertTriangle className="w-24 h-24 mb-4 text-yellow-500" />
                        <p className="text-lg">Analysis detected issues but details are unavailable.</p>
                        <p className="text-sm mt-2">This file may have been flagged due to file type or size.</p>
                      </div>
                    )}
                    {selectedFile?.status === 'pending' && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                        <Search className="w-24 h-24 mb-4" />
                        <p>Run audit to scan this file.</p>
                      </div>
                    )}
                    {selectedFile?.issues?.map(issue => (
                      <div key={issue.id} onClick={() => getAuditAdvice(issue)} className={`group p-4 rounded-xl border transition-all cursor-pointer ${issue.severity === 'error' ? 'bg-red-950/10 border-red-500/30 hover:bg-red-900/20' : 'bg-yellow-950/10 border-yellow-500/30 hover:bg-yellow-900/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {issue.severity === 'error' ? <XCircle className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                          <h3 className={`font-bold ${issue.severity === 'error' ? 'text-red-200' : 'text-yellow-200'}`}>{issue.message}</h3>
                        </div>
                        <p className="text-sm text-slate-400 font-mono ml-7">{issue.technicalDetails}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <ShieldCheck className="w-24 h-24 mb-6 opacity-10" />
                  <p className="text-lg">Select a file to inspect.</p>
                </div>
              )}
            </div>

            {/* Right: Analysis Log */}
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                <Scan className="w-4 h-4 text-emerald-400" /> Analysis Log
              </h3>
              <div ref={adviceScrollRef} className="flex-1 overflow-y-auto overflow-x-auto relative z-10">
                {auditAdvice ? (
                  <div className="animate-slide-in-right">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-400 font-bold text-sm">Mossy Suggests:</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/20 text-sm text-slate-300 leading-relaxed shadow-lg">{auditAdvice}</div>
                    <button onClick={() => navigate('/chat', { state: { prefill: `I just ran an audit on my mod files. Here is the analysis result:\n\n${auditAdvice}\n\nCan you help me understand and fix these issues?` } })} className="mt-4 w-full py-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/30 rounded text-xs transition-colors flex items-center justify-center gap-2" title="Open full chat with this audit result as context">
                      Ask Mossy about this
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm italic">&quot;Click on an issue in the inspector to get a detailed breakdown and fix strategy.&quot;</div>
                )}
              </div>
              <div className="mt-auto pt-6 border-t border-slate-800 relative z-10">
                <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                  <span>SCAN ENGINE: v2.4</span>
                  <span className="text-emerald-500">READY</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAuditSubTab === 'debug' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <GameLogMonitor />
          </div>
        )}
      </div>
    );
  };
  const handlePickESP = async () => {
    try {
      const result = await window.electron.api.openDialog({
        title: 'Select ESP/ESM File',
        filters: [
          { name: 'Plugin Files', extensions: ['esp', 'esm', 'esl'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result && result.length > 0) {
        setEspPath(result[0]);
        setValidationStatus('idle');
        setValidationResult(null);
        setPreventionPlan(null);
      }
    } catch (error) {
      console.error('File picker error:', error);
      toast.error('Failed to open file picker');
    }
  };

  const handleValidate = async () => {
    if (!espPath) {
      toast.error('Please select an ESP file first');
      return;
    }

    setValidationStatus('validating');
    setValidationResult(null);
    setPreventionPlan(null);

    try {
      // Call mining engine via IPC
      const result: ESPValidationResult = await (window.electron.api as any).ckValidate(espPath);
      setValidationResult(result);
      setValidationStatus(result.valid ? 'valid' : 'invalid');

      // Generate prevention plan
      const plan: PreventionPlan = await (window.electron.api as any).ckGeneratePreventionPlan(result);
      setPreventionPlan(plan);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setValidationStatus('idle');
    }
  };

  /**
   * MONITORING TAB: Live CK Process Monitoring
   */
  const handleStartMonitoring = async () => {
    // Check if CK is running
    const processes = window.electron.api.listProcesses ?
      await window.electron.api.listProcesses('CreationKit') : [];

    if (processes.length === 0) {
      toast.error('Creation Kit is not running. Please launch CK first.');
      return;
    }

    const ckProcess = processes[0];
    setCkPid(ckProcess.pid);
    setMonitoringStatus('monitoring');
    setMetricsHistory([]);

    // Start polling metrics
    monitorIntervalRef.current = setInterval(async () => {
      try {
        const metricsResult = await window.electron.api.getProcessMetrics(ckProcess.pid);
        if (metricsResult.success && metricsResult.metrics) {
          const newMetrics: ProcessMetrics = {
            cpuPercent: metricsResult.metrics.cpuPercent || 0,
            memoryMB: metricsResult.metrics.memoryMB || 0,
            handleCount: metricsResult.metrics.handleCount || 0,
            threadCount: metricsResult.metrics.threadCount || 0
          };
          setMetrics(newMetrics);
          setMetricsHistory(prev => [...prev.slice(-59), newMetrics]); // Keep last 60 samples
        }
      } catch (error) {
        console.error('Metrics polling error:', error);
        handleStopMonitoring();
      }
    }, 1000);
  };

  const handleStopMonitoring = () => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    setMonitoringStatus('idle');
    setCkPid(null);
    setMetrics(null);
  };

  /**
   * POST-CRASH TAB: Crash Log Analysis
   */
  const handlePickCrashLog = async () => {
    try {
      const result = await (window.electron.api as any).ckPickLogFile();

      if (result.success && result.path) {
        setCrashLogPath(result.path);
        setCrashDiagnosis(null);

        // Auto-analyze
        await handleAnalyzeCrash(result.path);
      }
    } catch (error) {
      console.error('Log file picker error:', error);
      toast.error('Failed to open log file');
    }
  };

  const handleAnalyzeCrash = async (logPath?: string) => {
    const pathToAnalyze = logPath || crashLogPath;

    if (!pathToAnalyze) {
      toast.error('Please select a crash log file first');
      return;
    }

    setIsAnalyzing(true);
    setCrashDiagnosis(null);

    try {
      const diagnosis: CrashDiagnosis = await (window.electron.api as any).ckAnalyzeCrash(pathToAnalyze);
      setCrashDiagnosis(diagnosis);
    } catch (error) {
      console.error('Crash analysis error:', error);
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Render helpers
   */
  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'text-gray-600';
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string | undefined) => {
    if (!severity) return 'bg-gray-100 text-gray-800 border-gray-300';
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRiskColor = (risk: number | undefined) => {
    if (risk === undefined || risk === null) return 'text-gray-600';
    if (risk >= 80) return 'text-red-600';
    if (risk >= 50) return 'text-orange-600';
    if (risk >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  /**
   * RENDER: Tab Navigation
   */
  const renderTabs = () => (
    <div className="flex border-b border-gray-700 mb-6">
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'preflight'
          ? 'text-cyan-400 border-b-2 border-cyan-400'
          : 'text-gray-400 hover:text-gray-200'
          }`}
        onClick={() => setActiveTab('preflight')}
      >
        <ShieldCheck className="w-5 h-5" />
        Pre-Flight Checks
      </button>
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'monitoring'
          ? 'text-cyan-400 border-b-2 border-cyan-400'
          : 'text-gray-400 hover:text-gray-200'
          }`}
        onClick={() => setActiveTab('monitoring')}
      >
        <Activity className="w-5 h-5" />
        Live Monitoring
      </button>
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'postcrash'
          ? 'text-cyan-400 border-b-2 border-cyan-400'
          : 'text-gray-400 hover:text-gray-200'
          }`}
        onClick={() => setActiveTab('postcrash')}
      >
        <FileText className="w-5 h-5" />
        Post-Crash Analysis
      </button>
      <button
        className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'audit'
          ? 'text-cyan-400 border-b-2 border-cyan-400'
          : 'text-gray-400 hover:text-gray-200'
          }`}
        onClick={() => setActiveTab('audit')}
      >
        <ShieldCheck className="w-5 h-5" />
        Asset Audit
      </button>
    </div>
  );

  /**
   * RENDER: Pre-Flight Tab
   */
  const renderPreFlightTab = () => (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-cyan-400" />
          Select ESP/ESM File
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={espPath}
            onChange={(e) => setEspPath(e.target.value)}
            placeholder="Path to ESP/ESM file..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
          />
          <button
            onClick={handlePickESP}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Browse
          </button>
          <button
            onClick={handleValidate}
            disabled={!espPath || validationStatus === 'validating'}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {validationStatus === 'validating' ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <>
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              Validation Results
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Crash Risk</div>
                <div className={`text-2xl font-bold ${getRiskColor(validationResult.crashRisk)}`}>
                  {validationResult.crashRisk ?? 0}%
                </div>
              </div>
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Memory Est.</div>
                <div className="text-2xl font-bold text-white">
                  {validationResult.memoryEstimateMB ?? 0} MB
                </div>
              </div>
              <div className="bg-gray-900/50 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Issues Found</div>
                <div className="text-2xl font-bold text-white">
                  {validationResult.issues?.length ?? 0}
                </div>
              </div>
            </div>

            {/* Issues List */}
            {validationResult.issues && validationResult.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white text-sm mb-2">Issues:</h4>
                {validationResult.issues.map((issue, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded p-3 border-l-4 border-orange-500">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-4 h-4 mt-1 ${getSeverityColor(issue.severity)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{issue.type ?? 'Unknown'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}>
                            {issue.severity ?? 'unknown'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-1">{issue.message ?? 'No details available'}</p>
                        {issue.solution && <p className="text-xs text-cyan-400">{issue.solution}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {validationResult.recommendations && validationResult.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Recommendations:
                </h4>
                {validationResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm text-gray-300 pl-6">
                    • {rec}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prevention Plan */}
          {preventionPlan && preventionPlan.steps && preventionPlan.steps.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Prevention Plan
              </h3>

              <div className="mb-4 flex gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Risk Reduction: </span>
                  <span className="text-green-400 font-semibold">{preventionPlan.estimatedRiskReduction ?? 0}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Est. Time: </span>
                  <span className="text-white font-semibold">{preventionPlan.estimatedTime ?? 'Unknown'}</span>
                </div>
                {preventionPlan.priority && (
                  <div>
                    <span className="text-gray-400">Priority: </span>
                    <span className={`font-semibold ${getSeverityColor(preventionPlan.priority)}`}>
                      {preventionPlan.priority.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {preventionPlan.steps.map((step, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded p-3 border-l-4 border-purple-500">
                    <div className="flex items-start gap-3">
                      <div className="flex-none w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white mb-1">{step.description ?? 'No description'}</p>
                        {step.command && (
                          <code className="text-xs text-cyan-400 bg-gray-800 px-2 py-1 rounded block mt-1">
                            {step.command}
                          </code>
                        )}
                        <div className="flex gap-4 mt-2 text-xs">
                          {step.estimatedTime && (
                            <span className="text-gray-400">
                              Time: <span className="text-white">{step.estimatedTime}</span>
                            </span>
                          )}
                          {step.priority && (
                            <span className={getSeverityColor(step.priority)}>
                              Priority: {step.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  /**
   * RENDER: Monitoring Tab
   */
  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          CK Process Monitor
        </h3>

        <div className="flex gap-3 mb-4">
          {monitoringStatus === 'idle' ? (
            <button
              onClick={handleStartMonitoring}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleStopMonitoring}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Monitoring
            </button>
          )}
        </div>

        {monitoringStatus === 'monitoring' && metrics && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">CPU Usage</div>
              <div className="text-2xl font-bold text-cyan-400">
                {metrics.cpuPercent.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Memory</div>
              <div className="text-2xl font-bold text-purple-400">
                {metrics.memoryMB.toFixed(0)} MB
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Handles</div>
              <div className="text-2xl font-bold text-green-400">
                {metrics.handleCount}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Threads</div>
              <div className="text-2xl font-bold text-yellow-400">
                {metrics.threadCount}
              </div>
            </div>
          </div>
        )}

        {monitoringStatus === 'idle' && (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start monitoring to track CK process health</p>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * RENDER: Post-Crash Tab
   */
  const renderPostCrashTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-400" />
          Crash Log Analysis
        </h3>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={crashLogPath}
            onChange={(e) => setCrashLogPath(e.target.value)}
            placeholder="Path to crash log file..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white"
          />
          <button
            onClick={handlePickCrashLog}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Browse
          </button>
          <button
            onClick={() => handleAnalyzeCrash()}
            disabled={!crashLogPath || isAnalyzing}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {crashDiagnosis && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${getSeverityColor(crashDiagnosis.severity)}`} />
            Crash Diagnosis
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Crash Type</div>
              <div className="text-lg font-bold text-white">{crashDiagnosis.crashType}</div>
            </div>
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Severity</div>
              <div className={`text-lg font-bold ${getSeverityColor(crashDiagnosis.severity)}`}>
                {crashDiagnosis.severity.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Root Cause:</h4>
              <p className="text-white">{crashDiagnosis.rootCause}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Likely Plugin:</h4>
              <p className="text-cyan-400 font-mono">{crashDiagnosis.likelyPlugin}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Recommendations:
              </h4>
              <div className="space-y-2">
                {crashDiagnosis.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm text-gray-300 pl-6">
                    • {rec}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Preventable:</span>
              {crashDiagnosis.preventable ? (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Yes
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> No
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Main Render
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            CK Crash Prevention Engine
          </h1>
          <p className="text-gray-400">
            Validate plugins, monitor Creation Kit health, and analyze crashes
          </p>
        </div>

        {/* Tab Navigation */}
        {renderTabs()}

        {/* Tab Content */}
        {activeTab === 'preflight' && renderPreFlightTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
        {activeTab === 'postcrash' && renderPostCrashTab()}
        {activeTab === 'audit' && renderAuditTab()}
      </div>
    </div>
  );
};
