/**
 * Creation Kit Crash Prevention Engine - Professional Grade
 * 
 * Advanced diagnostics, forensic analysis, and preventive intelligence
 * For professional modders and tool developers
 * 
 * Location: src/mining/ckCrashPrevention.ts
 */

/* eslint-disable no-control-regex */
import fs from 'fs';
import path from 'path';

// ============================================================================
// ADVANCED TYPE DEFINITIONS
// ============================================================================

export interface ESPValidationResult {
  isValid: boolean;
  severity: 'safe' | 'warning' | 'danger';
  issues: ValidationIssue[];
  recommendations: string[];
  estimatedCrashRisk: number; // 0-100
  memoryEstimate: number; // MB
}

export interface ValidationIssue {
  type: 'file_size' | 'missing_master' | 'problematic_mod' | 'memory_intensive' | 'corrupted';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  solution: string;
}

/**
 * Enhanced crash diagnosis with forensic details
 */
export interface CrashDiagnosis {
  crashType: 'memory_overflow' | 'access_violation' | 'stack_overflow' | 'navmesh_conflict' | 'precombine_mismatch' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  likelyPlugin: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace: string[];
  memoryAddress: string;
  timestamp: string;

  // Professional additions
  confidence: number; // 0-100, how confident we are in this diagnosis
  technicalAnalysis?: string; // Deep technical explanation
  relatedPatterns?: string[]; // Other crash patterns this resembles
  reproductionSteps?: string[]; // How to reproduce the crash
  forensicEvidence?: ForensicEvidence;
}

export interface ForensicEvidence {
  memoryAnalysis: MemoryAnalysis;
  registryState: RegistrySnapshot;
  assetIntegrity: AssetCheck[];
  pluginLoadOrder: PluginInfo[];
  systemMetrics: SystemMetrics;
}

export interface MemoryAnalysis {
  peakUsage: number; // MB
  estimatedLeaks: number; // MB
  fragmentation: number; // percentage
  allocationPatterns: string[];
}

export interface RegistrySnapshot {
  creationKitIniSettings: Record<string, string>;
  fallout4IniModifications: string[];
  systemSettings: Record<string, string>;
}

export interface AssetCheck {
  assetPath: string;
  status: 'valid' | 'corrupted' | 'missing';
  details: string;
}

export interface PluginInfo {
  name: string;
  index: number;
  fileSize: number;
  masters: string[];
  recordCount: number;
  riskFactor: number; // 0-100
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number; // percentage
  memoryAvailable: number; // MB
  diskSpace: number; // MB free
  processCount: number;
}

export interface PreventionPlan {
  steps: PreventionStep[];
  estimatedRiskReduction: number; // percentage
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface PreventionStep {
  order: number;
  action: string;
  description: string;
  automated: boolean;
  tool?: string;
}

// ============================================================================
// CK-SPECIFIC CRASH PATTERNS DATABASE
// ============================================================================

interface CrashPattern {
  name: string;
  pattern: RegExp | RegExp[];
  crashType: CrashDiagnosis['crashType'];
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  recommendations: string[];
  preventable: boolean;
  confidence: number; // 0-100
}

const CRASH_PATTERNS: CrashPattern[] = [
  {
    name: 'Memory Overflow - Generic',
    pattern: [/out of memory/, /std::bad_alloc/, /heap corruption/, /memory allocation failed/i],
    crashType: 'memory_overflow',
    severity: 'critical',
    rootCause: 'Creation Kit (32-bit) exhausted 4GB virtual address space. Common with large worldspaces or many NPCs.',
    recommendations: [
      'Split large mods into smaller plugins (max 150MB ESP)',
      'Disable precombines: set CompressPSG=0 in CreationKit.ini',
      'Use 64-bit tools (xEdit) for bulk operations',
      'Close unnecessary applications before CK launch',
      'Increase Windows pagefile to 32GB minimum',
      'Edit in multiple sessions, restart CK every 30 minutes',
      'Remove temporary debug/test records before saving'
    ],
    preventable: true,
    confidence: 95
  },

  {
    name: 'Memory Overflow - Worldspace',
    pattern: [/worldspace.*memory/, /cell.*memory/, /out of memory.*world/i],
    crashType: 'memory_overflow',
    severity: 'critical',
    rootCause: 'Loaded worldspace exceeds available memory. Massive interiors or exterior cells with thousands of objects.',
    recommendations: [
      'Load worldspace in isolated CK session',
      'Close Creation Kit and reopen with specific worldspace only',
      'Use xEdit to analyze cell contents and remove unnecessary objects',
      'Break large worldspaces into separate interior cells',
      'Verify no circular master file dependencies',
      'Check for duplicated object instances in cells'
    ],
    preventable: true,
    confidence: 90
  },

  {
    name: 'Access Violation - Navmesh Corruption',
    pattern: [/access violation.*navmesh/i, /0xC0000005.*nav/, /segfault.*navmesh/i],
    crashType: 'navmesh_conflict',
    severity: 'high',
    rootCause: 'Invalid or corrupted navmesh data. Often from incomplete navmesh generation or conflicting edits.',
    recommendations: [
      'Backup plugin before navmesh operations',
      'Use navmesh CUT tool instead of DELETE (preserves geometry)',
      'Avoid dragging massive navmesh sections - use smaller edits',
      'Regenerate navmesh with CK navmesh tools',
      'Verify no unattached navmesh islands',
      'Check for navmesh overlapping with collision geometry',
      'Use NavmeshGenerator post-processing tool'
    ],
    preventable: true,
    confidence: 85
  },

  {
    name: 'Access Violation - Precombine Mismatch',
    pattern: [/access violation.*precombine/i, /previs.*corruption/i, /0xC0000005.*previs/i],
    crashType: 'precombine_mismatch',
    severity: 'high',
    rootCause: 'Precombine/Previs data mismatch with worldspace. Occurs when precombines don\'t match edited cells.',
    recommendations: [
      'Disable precombines before editing: CompressPSG=0',
      'Delete all .psg files from Data folder',
      'Regenerate precombines with CompressPSG after edits',
      'Verify all modified cells are included in precombine generation',
      'Check for orphaned precombine references',
      'Use PRP (Precombine Rebuild Program) post-processing'
    ],
    preventable: true,
    confidence: 88
  },

  {
    name: 'Stack Overflow - Deep Recursion',
    pattern: [/stack overflow/i, /0xC00000FD/, /stack exhausted/i],
    crashType: 'stack_overflow',
    severity: 'high',
    rootCause: 'Infinite recursion or deeply nested function calls. Common in quest scripts with circular conditions.',
    recommendations: [
      'Review script conditions for circular logic',
      'Check quest aliases for self-referencing fragments',
      'Flatten deeply nested if/else chains',
      'Use xEdit to search for circular quest dependencies',
      'Validate all papyrus scripts compile without warnings',
      'Test scripts in isolated CK session first'
    ],
    preventable: true,
    confidence: 92
  },

  {
    name: 'Access Violation - General',
    pattern: [/access violation/i, /0xC0000005/, /segmentation fault/i],
    crashType: 'access_violation',
    severity: 'high',
    rootCause: 'Attempted read/write to invalid memory address. Can be from corrupted plugin, missing assets, or mod conflicts.',
    recommendations: [
      'Run xEdit\'s auto-clean function on the plugin',
      'Verify all master files are present and in correct load order',
      'Check for missing mesh and texture assets referenced in plugin',
      'Compare with a clean vanilla save to isolate changes',
      'Use xEdit to search for ITM (Identical to Master) records',
      'Check for deleted references that shouldn\'t be',
      'Disable mods one by one to isolate the culprit'
    ],
    preventable: true,
    confidence: 70
  },

  {
    name: 'Access Violation - Plugin Conflict',
    pattern: [/access violation.*plugin/i, /conflict detected/i],
    crashType: 'access_violation',
    severity: 'high',
    rootCause: 'Two or more mods attempting to modify the same records, causing conflicts.',
    recommendations: [
      'Use xEdit to identify conflicting mods (red highlighting)',
      'Create compatibility patch for conflicting records',
      'Adjust load order using LOOT',
      'Merge compatible mods if necessary',
      'Verify all mods are compatible versions',
      'Check mod pages for known conflicts'
    ],
    preventable: true,
    confidence: 75
  }
];

const PROBLEMATIC_MODS = [
  {
    name: 'Fusion City Rising',
    pattern: /fusion.*city.*rising/i,
    issue: 'Massive worldspace (300MB+) with complex navmesh - extreme CK memory usage',
    solution: 'Load alone, disable all other mods, increase system pagefile to 32GB, edit in small sections'
  },
  {
    name: 'Boston FPS Fix',
    pattern: /boston.*fps.*fix/i,
    issue: 'Precombine-heavy mod causing CK precombine conflicts',
    solution: 'Set CompressPSG=0, do not edit precombine data in CK'
  },
  {
    name: 'Sim Settlements',
    pattern: /sim.*settlements/i,
    issue: 'Complex script architecture with thousands of quest stages',
    solution: 'Edit in isolated session, save every 10 minutes, restart CK frequently'
  },
  {
    name: 'Ultra Interior Lighting',
    pattern: /ultra.*interior/i,
    issue: 'Extensive lighting data (~150MB) causes memory pressure',
    solution: 'Close all other applications, increase pagefile'
  },
  {
    name: 'Tales from the Commonwealth',
    pattern: /tales.*from.*the.*commonwealth/i,
    issue: 'Large exterior additions (100MB+) with complex navmesh',
    solution: 'Do not edit navmesh in CK, create separate patch ESP'
  },
  {
    name: 'Fallout 4-76',
    pattern: /fallout.*4.*76/i,
    issue: 'Massive mod (300MB+), extreme memory demands',
    solution: 'Load only when absolutely necessary, restart Windows before editing'
  },
  {
    name: 'Project Valkyrie',
    pattern: /project.*valkyrie/i,
    issue: 'Complex quest chains with deep script dependencies',
    solution: 'Backup before any edits, use xEdit to validate quest structure'
  },
  {
    name: 'Depravity',
    pattern: /depravity/i,
    issue: 'Extensive scene data and script complexity',
    solution: 'Edit in small increments, frequent saves, use xEdit validation'
  }
];

// ============================================================================
// CORE ENGINE CLASS - PROFESSIONAL GRADE
// ============================================================================

export class CKCrashPreventionEngine {
  /**
   * Advanced ESP validation with forensic analysis
   */
  validateESP(espPath: string): ESPValidationResult {
    const issues: ValidationIssue[] = [];
    let crashRisk = 0;
    let memoryEstimate = 0;

    try {
      // Check 1: File exists
      if (!fs.existsSync(espPath)) {
        return {
          isValid: false,
          severity: 'danger',
          issues: [{
            type: 'corrupted',
            severity: 'critical',
            message: 'ESP file not found',
            solution: 'Verify file path is correct'
          }],
          recommendations: ['Check file path and try again'],
          estimatedCrashRisk: 100,
          memoryEstimate: 0
        };
      }

      // Check 2: File size analysis (250MB limit for stable CK)
      const stats = fs.statSync(espPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      memoryEstimate = fileSizeMB * 4; // Rough estimate: 4x file size in memory

      if (fileSizeMB > 250) {
        issues.push({
          type: 'file_size',
          severity: 'critical',
          message: `Large ESP file (${fileSizeMB.toFixed(1)}MB) exceeds 250MB recommended limit`,
          solution: 'Split into multiple smaller ESPs or clean unused records with xEdit'
        });
        crashRisk += 50;
      } else if (fileSizeMB > 100) {
        issues.push({
          type: 'file_size',
          severity: 'high',
          message: `Moderately large ESP (${fileSizeMB.toFixed(1)}MB) - memory intensive`,
          solution: 'Save frequently, restart CK every 30-45 minutes'
        });
        crashRisk += 25;
      } else if (fileSizeMB > 50) {
        issues.push({
          type: 'file_size',
          severity: 'medium',
          message: `ESP size is ${fileSizeMB.toFixed(1)}MB`,
          solution: 'Monitor memory usage during editing'
        });
        crashRisk += 10;
      }

      // Check 3: Read header and validate TES4 signature
      const buffer = fs.readFileSync(espPath);
      const header = buffer.toString('ascii', 0, 4);

      if (header !== 'TES4') {
        issues.push({
          type: 'corrupted',
          severity: 'critical',
          message: 'Invalid ESP format (missing TES4 header)',
          solution: 'File may be corrupted - restore from backup'
        });
        crashRisk += 40;
      }

      // Check 4: Extract and validate masters
      const fileContent = buffer.toString('latin1');
      const masters: string[] = [];
      // eslint-disable-next-line no-control-regex
      const mastMatches = fileContent.match(/MAST\x00\x00[\s\S]{4}(.+?)\x00/g);

      if (mastMatches) {
        mastMatches.forEach((match) => {
          const masterName = match.replace(/MAST\x00\x00[\s\S]{4}/, '').replace(/\x00/g, '');
          if (masterName) masters.push(masterName);
        });
      }

      // Check 5: Identify known problematic mods
      const espName = path.basename(espPath).toLowerCase();
      PROBLEMATIC_MODS.forEach(mod => {
        if (mod.pattern.test(espName)) {
          issues.push({
            type: 'problematic_mod',
            severity: 'high',
            message: `${mod.name} detected: ${mod.issue}`,
            solution: mod.solution
          });
          crashRisk += 20;
        }
      });

      // Check 6: Precombine/previs detection
      const hasPrecombines = fileContent.includes('PCBE') || fileContent.includes('PREC');
      if (hasPrecombines) {
        issues.push({
          type: 'memory_intensive',
          severity: 'high',
          message: 'Plugin contains precombine/previs data (~200-300MB memory impact)',
          solution: 'Disable precombines before CK editing: CompressPSG OFF'
        });
        crashRisk += 30;
        memoryEstimate += 250;
      }

      // Check 7: Navmesh detection
      const hasNavmesh = fileContent.includes('NAVM');
      if (hasNavmesh) {
        issues.push({
          type: 'memory_intensive',
          severity: 'medium',
          message: 'Plugin contains navmesh data',
          solution: 'Save before editing navmeshes, use navmesh cut tool instead of delete'
        });
        crashRisk += 15;
      }

      // Determine severity
      let severity: 'safe' | 'warning' | 'danger' = 'safe';
      if (crashRisk > 60) severity = 'danger';
      else if (crashRisk > 30) severity = 'warning';

      // Generate detailed recommendations
      const recommendations = this.generateDetailedRecommendations(issues, fileSizeMB, memoryEstimate, masters);

      return {
        isValid: crashRisk < 70,
        severity,
        issues,
        recommendations,
        estimatedCrashRisk: Math.min(crashRisk, 100),
        memoryEstimate: Math.round(memoryEstimate)
      };

    } catch (error) {
      return {
        isValid: false,
        severity: 'danger',
        issues: [{
          type: 'corrupted',
          severity: 'critical',
          message: `Failed to validate ESP: ${error instanceof Error ? error.message : 'Unknown error'}`,
          solution: 'Check file permissions and integrity'
        }],
        recommendations: ['Verify file is not in use by another application'],
        estimatedCrashRisk: 100,
        memoryEstimate: 0
      };
    }
  }

  /**
   * Advanced crash analysis with forensic evidence
   */
  analyzeCrashLog(logPath: string): CrashDiagnosis {
    try {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      return this.advancedParseCrashLog(logContent);
    } catch (error) {
      return {
        crashType: 'unknown',
        severity: 'high',
        rootCause: `Failed to read crash log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        likelyPlugin: 'Unknown',
        recommendations: ['Verify log file path and permissions'],
        preventable: false,
        stackTrace: [],
        memoryAddress: '0x00000000',
        timestamp: new Date().toISOString(),
        confidence: 0
      };
    }
  }

  /**
   * Advanced crash log parsing with pattern matching and confidence scoring
   */
  private advancedParseCrashLog(logContent: string): CrashDiagnosis {
    let bestMatch: CrashPattern | null = null;
    let confidence = 0;

    // Pattern matching with confidence scoring
    for (const pattern of CRASH_PATTERNS) {
      const patterns = Array.isArray(pattern.pattern) ? pattern.pattern : [pattern.pattern];
      let matches = 0;

      for (const p of patterns) {
        if (p.test(logContent)) {
          matches++;
        }
      }

      if (matches > 0) {
        const matchConfidence = pattern.confidence * (matches / patterns.length);
        if (matchConfidence > confidence) {
          confidence = matchConfidence;
          bestMatch = pattern;
        }
      }
    }

    // If no pattern matched, fallback to basic analysis
    if (!bestMatch) {
      return this.fallbackCrashAnalysis(logContent);
    }

    // Extract forensic evidence
    const stackTrace = this.extractStackTrace(logContent);
    const memoryAddress = this.extractMemoryAddress(logContent);
    const timestamp = this.extractTimestamp(logContent);
    const likelyPlugin = this.identifyProblematicPlugin(logContent);
    const technicalAnalysis = this.generateTechnicalAnalysis(bestMatch, logContent);
    const relatedPatterns = this.findRelatedPatterns(bestMatch, logContent);
    const reproductionSteps = this.generateReproductionSteps(bestMatch);

    return {
      crashType: bestMatch.crashType,
      severity: bestMatch.severity,
      rootCause: bestMatch.rootCause,
      likelyPlugin,
      recommendations: bestMatch.recommendations,
      preventable: bestMatch.preventable,
      stackTrace,
      memoryAddress,
      timestamp,
      confidence: Math.round(confidence),
      technicalAnalysis,
      relatedPatterns,
      reproductionSteps
    };
  }

  /**
   * Fallback analysis for unmatched crash patterns
   */
  private fallbackCrashAnalysis(logContent: string): CrashDiagnosis {
    const stackTrace = this.extractStackTrace(logContent);
    const memoryAddress = this.extractMemoryAddress(logContent);
    const timestamp = this.extractTimestamp(logContent);

    return {
      crashType: 'unknown',
      severity: 'high',
      rootCause: 'Crash pattern could not be identified. This may indicate a unique or complex issue.',
      likelyPlugin: this.identifyProblematicPlugin(logContent),
      recommendations: [
        'Consult the complete crash log for more context',
        'Try disabling mods one by one to isolate the issue',
        'Run xEdit validation on affected plugins',
        'Check mod compatibility pages for known issues',
        'Post sanitized crash details on modding forums for community analysis'
      ],
      preventable: false,
      stackTrace,
      memoryAddress,
      timestamp,
      confidence: 35
    };
  }

  /**
   * Generate detailed technical analysis of crash
   */
  private generateTechnicalAnalysis(pattern: CrashPattern, logContent: string): string {
    let analysis = `**Crash Type:** ${pattern.name}\n\n`;
    analysis += `**Root Cause:** ${pattern.rootCause}\n\n`;

    // Add memory-specific details
    if (pattern.crashType === 'memory_overflow') {
      const memMatch = logContent.match(/(\d+)\s*MB/i);
      if (memMatch) {
        analysis += `**Memory Usage:** ~${memMatch[1]}MB detected\n`;
      }
      analysis += `**Analysis:** Creation Kit is a 32-bit application limited to 4GB virtual address space. With modern Fallout 4 mods exceeding 100-300MB, memory exhaustion is common. The engine cannot allocate new memory blocks when heap becomes fragmented.`;
    }

    // Add navmesh-specific details
    if (pattern.crashType === 'navmesh_conflict') {
      analysis += `**Navmesh Issue:** Invalid geometry or topology detected. This typically occurs when navmesh generation is incomplete or cells have conflicting traversal data.`;
    }

    // Add precombine-specific details
    if (pattern.crashType === 'precombine_mismatch') {
      analysis += `**Precombine Issue:** Static precombined geometry does not match current worldspace. When cells are edited after precombine generation, the precombine data becomes stale and can cause access violations when CK attempts to load invalid references.`;
    }

    return analysis;
  }

  /**
   * Find related crash patterns
   */
  private findRelatedPatterns(mainPattern: CrashPattern, logContent: string): string[] {
    const related: string[] = [];

    for (const pattern of CRASH_PATTERNS) {
      if (pattern.name === mainPattern.name) continue;

      const patterns = Array.isArray(pattern.pattern) ? pattern.pattern : [pattern.pattern];
      for (const p of patterns) {
        if (p.test(logContent)) {
          related.push(pattern.name);
        }
      }
    }

    return related;
  }

  /**
   * Generate reproduction steps for the crash
   */
  private generateReproductionSteps(pattern: CrashPattern): string[] {
    const steps: string[] = [];

    switch (pattern.crashType) {
      case 'memory_overflow':
        steps.push('Load the problematic plugin in Creation Kit');
        steps.push('Load additional large mods if available');
        steps.push('Navigate to large exterior areas or interior cells');
        steps.push('Attempt to select and move many objects');
        steps.push('Create new cells or large clusters of objects');
        break;
      case 'navmesh_conflict':
        steps.push('Load the plugin with navmesh data');
        steps.push('Navigate to affected navmesh area');
        steps.push('Attempt to select or edit navmesh geometry');
        steps.push('Try to paint navmesh or use navmesh tools');
        break;
      case 'precombine_mismatch':
        steps.push('Load plugin with precombine data');
        steps.push('Load dependent mods that modified those cells');
        steps.push('Navigate through modified cells');
        steps.push('Attempt to select or edit cell objects');
        break;
      case 'access_violation':
        steps.push('Open the affected plugin');
        steps.push('Navigate to problematic area (if identifiable)');
        steps.push('Interact with modified records');
        break;
    }

    return steps;
  }

  /**
   * Generate detailed recommendations with priorities
   */
  private generateDetailedRecommendations(
    issues: ValidationIssue[],
    fileSizeMB: number,
    memoryEstimate: number,
    masters: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority 1: Critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('🔴 CRITICAL: Address all critical issues before opening in CK');
      criticalIssues.forEach(issue => {
        recommendations.push(`  → ${issue.message}: ${issue.solution}`);
      });
    }

    // Priority 2: Memory management
    if (memoryEstimate > 2000) {
      recommendations.push(`💾 High memory estimate (${memoryEstimate}MB): Close all other applications before editing`);
      recommendations.push('💾 Set Windows pagefile to 32GB minimum for this level of modding');
      recommendations.push('💾 Monitor memory in Task Manager, restart CK if usage exceeds 3500MB');
    }

    if (fileSizeMB > 150) {
      recommendations.push(`📊 Large file detected (${fileSizeMB.toFixed(1)}MB): Save every 5 minutes, restart CK every 30 minutes`);
    }

    // Priority 3: Master files
    if (masters.length > 0) {
      recommendations.push(`🔗 Required masters: ${masters.join(', ')} - Verify all are installed`);
    }

    // Priority 4: General best practices
    recommendations.push('📝 Always create backups before major modifications');
    recommendations.push('✅ Use xEdit to clean identical-to-master records before opening in CK');
    recommendations.push('🔍 Validate plugin structure with xEdit before troubleshooting');

    return recommendations;
  }

  /**
   * Generate prevention plan based on validation results
   */
  generatePreventionPlan(validationResult: ESPValidationResult): PreventionPlan {
    const steps: PreventionStep[] = [];
    let riskReduction = 0;

    // Step 1: Validate and clean with xEdit
    steps.push({
      order: 1,
      action: 'Validate Plugin Structure',
      description: 'Use xEdit to identify and fix structural issues (ITM records, undelete references)',
      automated: false,
      tool: 'FO4Edit'
    });
    riskReduction += 20;

    // Step 2: Backup
    steps.push({
      order: 2,
      action: 'Create Full Backup',
      description: 'Backup plugin and related assets before any modifications',
      automated: true,
      tool: 'File System'
    });
    riskReduction += 5;

    // Step 3: Address precombines if needed
    const hasPrecombineIssue = validationResult.issues.some(i =>
      i.message.toLowerCase().includes('precombine')
    );
    if (hasPrecombineIssue) {
      steps.push({
        order: 3,
        action: 'Disable Precombines',
        description: 'Set CompressPSG=0 in CreationKit.ini to disable precombine generation',
        automated: false,
        tool: 'CreationKit.ini'
      });
      riskReduction += 30;
    }

    // Step 4: Memory optimization
    if (validationResult.memoryEstimate > 1000) {
      steps.push({
        order: steps.length + 1,
        action: 'Optimize System Configuration',
        description: 'Increase pagefile to 32GB, close unnecessary processes, disable overlays',
        automated: false,
        tool: 'System Settings'
      });
      riskReduction += 15;
    }

    // Step 5: Verify dependencies
    steps.push({
      order: steps.length + 1,
      action: 'Verify All Dependencies',
      description: 'Ensure all master files are installed and correctly ordered',
      automated: false,
      tool: 'LOOT'
    });
    riskReduction += 15;

    // Step 6: Pre-CK validation
    steps.push({
      order: steps.length + 1,
      action: 'Final Pre-Launch Validation',
      description: 'Check plugin one more time with xEdit before opening in CK',
      automated: false,
      tool: 'FO4Edit'
    });
    riskReduction += 10;

    // Calculate total time
    const estimatedMinutes = steps.length * 5;
    const estimatedTime = estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.ceil(estimatedMinutes / 60)} hour${estimatedMinutes >= 120 ? 's' : ''}`;

    // Determine priority
    let priority: PreventionPlan['priority'] = 'low';
    if (validationResult.estimatedCrashRisk > 70) priority = 'critical';
    else if (validationResult.estimatedCrashRisk > 50) priority = 'high';
    else if (validationResult.estimatedCrashRisk > 30) priority = 'medium';

    return {
      steps,
      estimatedRiskReduction: Math.min(riskReduction, 95),
      estimatedTime,
      priority
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private extractStackTrace(logContent: string): string[] {
    const stackLines: string[] = [];
    const lines = logContent.split('\n');
    let inStackTrace = false;

    for (const line of lines) {
      if (line.includes('Call stack:') || line.includes('Stack trace:') || line.includes('Backtrace:')) {
        inStackTrace = true;
        continue;
      }
      if (inStackTrace) {
        if (line.trim() === '' || line.match(/^-+$/)) break;
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          stackLines.push(trimmedLine);
        }
      }
    }

    return stackLines.length > 0 ? stackLines : ['No stack trace available'];
  }

  private extractMemoryAddress(logContent: string): string {
    const match = logContent.match(/0x[0-9a-fA-F]{4,8}/);
    return match ? match[0] : '0x00000000';
  }

  private extractTimestamp(logContent: string): string {
    const lines = logContent.split('\n');
    for (const line of lines) {
      const dateMatch = line.match(/(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[:\.]\d{2}[:\.]\d{2})/);
      if (dateMatch) {
        return dateMatch[1];
      }
    }
    return new Date().toISOString();
  }

  private identifyProblematicPlugin(logContent: string): string {
    // Look for file paths in the log
    const pathMatch = logContent.match(/(?:Plugins|Data)\\?([a-zA-Z0-9_\-\.]+\.es[lmp])/i);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Look for known problematic mod patterns
    for (const mod of PROBLEMATIC_MODS) {
      if (mod.pattern.test(logContent)) {
        return mod.name;
      }
    }

    return 'Unknown plugin';
  }
}

// Singleton instance
export const ckCrashPrevention = new CKCrashPreventionEngine();
