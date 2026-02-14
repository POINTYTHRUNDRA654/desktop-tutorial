import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPE DEFINITIONS
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

export interface CrashDiagnosis {
  crashType: 'memory_overflow' | 'access_violation' | 'stack_overflow' | 'navmesh' | 'precombine' | 'unknown';
  rootCause: string;
  affectedComponent: string;
  recommendations: string[];
  preventable: boolean;
  stackTrace?: string[];
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
// KNOWN PROBLEMATIC MODS DATABASE
// ============================================================================

const PROBLEMATIC_MODS = [
  {
    name: 'Fusion City Rising',
    pattern: /fusion.*city.*rising/i,
    issue: 'Massive worldspace with complex navmesh - known CK crasher',
    solution: 'Load alone, disable all other mods, increase system pagefile to 32GB'
  },
  {
    name: 'Boston FPS Fix',
    pattern: /boston.*fps.*fix/i,
    issue: 'Known CK precombine conflicts',
    solution: 'Disable precombines before editing: CompressPSG OFF'
  },
  {
    name: 'Sim Settlements',
    pattern: /sim.*settlements/i,
    issue: 'Complex scripts can slow CK performance',
    solution: 'Save frequently, restart CK every 30 minutes'
  },
  {
    name: 'Ultra Interior Lighting',
    pattern: /ultra.*interior/i,
    issue: 'Heavy lighting data can cause memory issues',
    solution: 'Close other applications before editing'
  },
  {
    name: 'Tales from the Commonwealth',
    pattern: /tales.*from.*the.*commonwealth/i,
    issue: 'Large worldspace additions can cause navmesh conflicts',
    solution: 'Do not edit navmesh while loaded, use separate patch ESP'
  },
  {
    name: 'Fallout 4-76',
    pattern: /fallout.*4.*76/i,
    issue: 'Massive mod with >200MB file size, extreme memory usage',
    solution: 'Only load when necessary, close all other programs'
  },
  {
    name: 'Project Valkyrie',
    pattern: /project.*valkyrie/i,
    issue: 'Complex quest dependencies can corrupt CK dialogue trees',
    solution: 'Create backup before editing any quests or dialogue'
  },
  {
    name: 'Depravity',
    pattern: /depravity/i,
    issue: 'Complex scripting and scene data can cause CK hangs',
    solution: 'Edit in small increments, save every 5 minutes'
  }
];

// ============================================================================
// CORE ENGINE CLASS
// ============================================================================

export class CKCrashPreventionEngine {
  /**
   * Validate ESP file before opening in Creation Kit
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

      // Check 2: File size (250MB limit for stable CK)
      const stats = fs.statSync(espPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      memoryEstimate = fileSizeMB * 4; // Rough estimate: 4x file size in memory

      if (fileSizeMB > 250) {
        issues.push({
          type: 'file_size',
          severity: 'critical',
          message: `Large ESP file (${fileSizeMB.toFixed(1)}MB exceeds 250MB recommended limit)`,
          solution: 'Split into multiple smaller ESPs or clean unused records with xEdit'
        });
        crashRisk += 50;
      } else if (fileSizeMB > 100) {
        issues.push({
          type: 'file_size',
          severity: 'high',
          message: `Moderately large ESP (${fileSizeMB.toFixed(1)}MB)`,
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

      // Check 3: Read header and check for TES4 signature
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
      const mastMatches = fileContent.match(/MAST\x00\x00[\s\S]{4}(.+?)\x00/g);
      
      if (mastMatches) {
        mastMatches.forEach((match) => {
          const masterName = match.replace(/MAST\x00\x00[\s\S]{4}/, '').replace(/\x00/g, '');
          if (masterName) masters.push(masterName);
        });
      }

      // Check 5: Known problematic mods
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
          message: 'Plugin contains precombine/previs data',
          solution: 'Disable precombines before CK editing: CompressPSG OFF'
        });
        crashRisk += 30;
        memoryEstimate += 200; // Precombines add significant memory
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

      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, fileSizeMB, memoryEstimate);

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
   * Generate prevention plan
   */
  generatePreventionPlan(validation: CKValidationResult): PreventionPlan {
    const steps: PreventionStep[] = [];
    let priority: 'low' | 'medium' | 'high' = 'low';
    let estimatedTime = 5;

    if (validation.riskLevel === 'critical' || validation.riskLevel === 'high') {
      priority = 'high';
      estimatedTime = 30;

      steps.push({
        id: 'backup',
        title: 'Backup your work',
        description: 'Create a backup of your ESP/ESM file before proceeding',
        completed: false
      });
    }

    validation.issues.forEach((issue, index) => {
      if (issue.fix) {
        steps.push({
          id: `fix-issue-${index}`,
          title: issue.message,
          description: issue.fix,
          completed: false
        });
      }
    });

    validation.recommendations.forEach((rec, index) => {
      steps.push({
        id: `rec-${index}`,
        title: rec,
        description: 'Follow this recommendation before proceeding',
        completed: false
      });
    });

    if (steps.length === 0) {
      steps.push({
        id: 'ready',
        title: 'Ready to proceed',
        description: 'No critical issues detected. You can safely run CK operations.',
        completed: false
      });
    }

    return {
      priority,
      steps,
      estimatedTime
    };
  }
}

   * Analyze crash log and provide diagnosis
   */
  analyzeCrashLog(logPath: string): CrashDiagnosis {
    try {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      return this.parseCrashLog(logContent);
    } catch (error) {
      return {
        crashType: 'unknown',
        rootCause: `Failed to read crash log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        affectedComponent: 'Unknown',
        recommendations: ['Verify log file path and permissions'],
        preventable: false
      };
    }
  }

  /**
   * Parse crash log content
   */
  parseCrashLog(logContent: string): CrashDiagnosis {
    let crashType: CrashDiagnosis['crashType'] = 'unknown';
    let rootCause = 'Unknown cause';
    let affectedComponent = 'Unknown';
    const recommendations: string[] = [];
    let preventable = false;

    // Pattern 1: Memory overflow
    if (logContent.includes('out of memory') || logContent.includes('std::bad_alloc')) {
      crashType = 'memory_overflow';
      rootCause = 'Creation Kit exceeded 4GB memory limit (32-bit application)';
      affectedComponent = 'Memory Manager';
      recommendations.push('Split large mods into smaller plugins');
      recommendations.push('Close unnecessary applications before CK');
      recommendations.push('Use 64-bit tools (xEdit) for bulk operations');
      recommendations.push('Restart CK every 30-45 minutes to clear memory');
      preventable = true;
    }

    // Pattern 2: Access violation with navmesh
    else if (logContent.includes('access violation') && logContent.toLowerCase().includes('navmesh')) {
      crashType = 'navmesh';
      rootCause = 'Invalid navmesh operation causing access violation';
      affectedComponent = 'Navmesh Editor';
      recommendations.push('Save before editing navmeshes');
      recommendations.push('Use navmesh cut tool instead of delete');
      recommendations.push('Avoid dragging large navmesh sections');
      recommendations.push('Regenerate navmesh if corruption suspected');
      preventable = true;
    }

    // Pattern 3: Access violation with precombine
    else if (logContent.includes('access violation') && 
             (logContent.toLowerCase().includes('precombine') || 
              logContent.toLowerCase().includes('previs'))) {
      crashType = 'precombine';
      rootCause = 'Precombine/Previs data corruption or conflict';
      affectedComponent = 'Precombine System';
      recommendations.push('Disable precombines before CK: CompressPSG OFF');
      recommendations.push('Edit without precombined data');
      recommendations.push('Regenerate precombines after completion');
      preventable = true;
    }

    // Pattern 4: Generic access violation
    else if (logContent.includes('access violation') || logContent.includes('0xC0000005')) {
      crashType = 'access_violation';
      rootCause = 'Memory access to invalid address';
      affectedComponent = 'Unknown';
      recommendations.push('Run plugin validation with xEdit');
      recommendations.push('Check for missing assets (meshes, textures)');
      recommendations.push('Clean plugin with xEdit');
      recommendations.push('Verify all master files are present');
      preventable = true;
    }

    // Pattern 5: Stack overflow
    else if (logContent.includes('stack overflow') || logContent.includes('0xC00000FD')) {
      crashType = 'stack_overflow';
      rootCause = 'Infinite recursion or deeply nested operations';
      affectedComponent = 'Script System';
      recommendations.push('Check for circular script references');
      recommendations.push('Review quest aliases and conditions');
      recommendations.push('Simplify complex object reference chains');
      preventable = true;
    }

    // Extract stack trace if available
    const stackTrace = this.extractStackTrace(logContent);

    return {
      crashType,
      rootCause,
      affectedComponent,
      recommendations,
      preventable,
      stackTrace
    };
  }

  /**
   * Generate prevention plan based on validation results
   */
  generatePreventionPlan(validationResult: ESPValidationResult): PreventionPlan {
    const steps: PreventionStep[] = [];
    let riskReduction = 0;

    // Step 1: Clean plugin
    steps.push({
      order: 1,
      action: 'Clean Plugin with xEdit',
      description: 'Remove identical-to-master records and undelete references',
      automated: true,
      tool: 'FO4Edit'
    });
    riskReduction += 20;

    // Step 2: Backup
    steps.push({
      order: 2,
      action: 'Create Backup',
      description: 'Backup current plugin state before modifications',
      automated: true,
      tool: 'File System'
    });
    riskReduction += 5;

    // Step 3: Disable precombines if detected
    const hasPrecombineIssue = validationResult.issues.some(i => 
      i.message.toLowerCase().includes('precombine')
    );
    if (hasPrecombineIssue) {
      steps.push({
        order: 3,
        action: 'Disable Precombines',
        description: 'Run CompressPSG OFF to remove precombine data',
        automated: true,
        tool: 'CompressPSG'
      });
      riskReduction += 30;
    }

    // Step 4: Memory optimization
    if (validationResult.memoryEstimate > 1000) {
      steps.push({
        order: steps.length + 1,
        action: 'Optimize System Memory',
        description: 'Close unnecessary applications, clear Windows cache',
        automated: false,
        tool: 'Task Manager'
      });
      riskReduction += 10;
    }

    // Step 5: Verify masters
    steps.push({
      order: steps.length + 1,
      action: 'Verify Master Files',
      description: 'Ensure all required masters are installed and in load order',
      automated: true,
      tool: 'LOOT'
    });
    riskReduction += 15;

    // Estimate time
    const estimatedMinutes = steps.length * 3; // ~3 minutes per step
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
      estimatedRiskReduction: Math.min(riskReduction, 85),
      estimatedTime,
      priority
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateRecommendations(
    issues: ValidationIssue[], 
    fileSizeMB: number, 
    memoryEstimate: number
  ): string[] {
    const recommendations = new Set<string>();

    issues.forEach(issue => {
      if (issue.type === 'file_size' || issue.type === 'memory_intensive') {
        recommendations.add('💾 Save frequently (Ctrl+S every 5 minutes)');
        recommendations.add('🔄 Restart CK every 30-45 minutes');
      }
      if (issue.severity === 'critical' || issue.severity === 'high') {
        recommendations.add('🚨 Address critical issues before opening in CK');
      }
    });

    if (fileSizeMB > 50) {
      recommendations.add('📊 Monitor memory usage with Task Manager');
      recommendations.add('💻 Close other applications to free RAM');
    }

    if (memoryEstimate > 2000) {
      recommendations.add('⚠️ Expected memory usage: ~' + memoryEstimate + 'MB');
      recommendations.add('🔧 Consider using xEdit for bulk record operations');
    }

    recommendations.add('📝 Always backup before major changes');

    return Array.from(recommendations);
  }

  private extractStackTrace(logContent: string): string[] | undefined {
    const stackLines: string[] = [];
    const lines = logContent.split('\n');
    let inStackTrace = false;

    for (const line of lines) {
      if (line.includes('Call stack:') || line.includes('Stack trace:')) {
        inStackTrace = true;
        continue;
      }
      if (inStackTrace) {
        if (line.trim() === '' || line.includes('---')) break;
        stackLines.push(line.trim());
      }
    }

    return stackLines.length > 0 ? stackLines : undefined;
  }
}

// Singleton instance
export const ckCrashPrevention = new CKCrashPreventionEngine();
