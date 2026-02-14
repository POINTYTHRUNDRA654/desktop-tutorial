import fs from 'fs';
import path from 'path';
import type {
  CKValidationInput,
  CKValidationResult,
  ValidationIssue as SharedValidationIssue,
  ValidationWarning,
  PreventionPlan,
  PreventionStep,
  CrashDiagnosis,
} from '../shared/types';

// ============================================================================
// TYPE DEFINITIONS (Local types not in shared - internal use only)
// ============================================================================

// Internal validation result format
interface InternalValidationIssue {
  type: 'file_size' | 'missing_master' | 'problematic_mod' | 'memory_intensive' | 'corrupted';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  solution: string;
}

export interface ESPValidationResult {
  isValid: boolean;
  severity: 'safe' | 'warning' | 'danger';
  issues: InternalValidationIssue[];
  recommendations: string[];
  estimatedCrashRisk: number; // 0-100
  memoryEstimate: number; // MB
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
   * Main validation method called from IPC handlers
   * Validates ESP file before opening in Creation Kit
   */
  async validateBeforeCK(input: CKValidationInput): Promise<CKValidationResult> {
    const espValidation = this.validateESP(input.espPath);
    
    // Convert internal validation result to shared CKValidationResult
    const issues: SharedValidationIssue[] = espValidation.issues.map(issue => ({
      type: issue.type === 'file_size' ? 'file_size' : 
            issue.type === 'missing_master' ? 'missing_master' :
            issue.type === 'corrupted' ? 'corrupted_mesh' :
            issue.type === 'problematic_mod' ? 'known_mod' : 'memory',
      severity: issue.severity === 'low' ? 'warning' :
                issue.severity === 'medium' ? 'warning' :
                issue.severity === 'high' ? 'error' : 'critical',
      message: issue.message,
      fix: issue.solution
    }));
    
    return {
      safe: espValidation.isValid && espValidation.severity !== 'danger',
      issues,
      warnings: [],
      recommendations: espValidation.recommendations,
      estimatedMemoryUsage: espValidation.memoryEstimate,
      riskLevel: espValidation.severity === 'danger' ? 'critical' :
                 espValidation.severity === 'warning' ? 'medium' : 'low'
    };
  }

  /**
   * Validate ESP file before opening in Creation Kit
   */
  validateESP(espPath: string): ESPValidationResult {
    const issues: InternalValidationIssue[] = [];
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
   * Analyze crash log and provide diagnosis
   */
  analyzeCrashLog(logPath: string): CrashDiagnosis {
    try {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      return this.parseCrashLog(logContent);
    } catch (error) {
      return {
        exceptionType: 'unknown',
        rootCause: `Failed to read crash log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fixSteps: ['Verify log file path and permissions'],
        relatedKnowledgeArticles: []
      };
    }
  }

  /**
   * Parse crash log content
   */
  parseCrashLog(logContent: string): CrashDiagnosis {
    let exceptionType: CrashDiagnosis['exceptionType'] = 'unknown';
    let rootCause = 'Unknown cause';
    const fixSteps: string[] = [];

    // Pattern 1: Memory overflow
    if (logContent.includes('out of memory') || logContent.includes('std::bad_alloc')) {
      exceptionType = 'memory_error';
      rootCause = 'Creation Kit exceeded 4GB memory limit (32-bit application)';
      fixSteps.push('Split large mods into smaller plugins');
      fixSteps.push('Close unnecessary applications before CK');
      fixSteps.push('Use 64-bit tools (xEdit) for bulk operations');
      fixSteps.push('Restart CK every 30-45 minutes to clear memory');
    }

    // Pattern 2: Access violation with navmesh
    else if (logContent.includes('access violation') && logContent.toLowerCase().includes('navmesh')) {
      exceptionType = 'access_violation';
      rootCause = 'Invalid navmesh operation causing access violation';
      fixSteps.push('Save before editing navmeshes');
      fixSteps.push('Use navmesh cut tool instead of delete');
      fixSteps.push('Avoid dragging large navmesh sections');
      fixSteps.push('Regenerate navmesh if corruption suspected');
    }

    // Pattern 3: Access violation with precombine
    else if (logContent.includes('access violation') && 
             (logContent.toLowerCase().includes('precombine') || 
              logContent.toLowerCase().includes('previs'))) {
      exceptionType = 'access_violation';
      rootCause = 'Precombine/Previs data corruption or conflict';
      fixSteps.push('Disable precombines before CK: CompressPSG OFF');
      fixSteps.push('Edit without precombined data');
      fixSteps.push('Regenerate precombines after completion');
    }

    // Pattern 4: Generic access violation
    else if (logContent.includes('access violation') || logContent.includes('0xC0000005')) {
      exceptionType = 'access_violation';
      rootCause = 'Memory access to invalid address';
      fixSteps.push('Run plugin validation with xEdit');
      fixSteps.push('Check for missing assets (meshes, textures)');
      fixSteps.push('Clean plugin with xEdit');
      fixSteps.push('Verify all master files are present');
    }

    // Pattern 5: Timeout
    else if (logContent.includes('timeout') || logContent.includes('not responding')) {
      exceptionType = 'timeout';
      rootCause = 'Operation took too long and timed out';
      fixSteps.push('Check for circular script references');
      fixSteps.push('Review quest aliases and conditions');
      fixSteps.push('Simplify complex object reference chains');
    }

    return {
      exceptionType,
      rootCause,
      fixSteps,
      relatedKnowledgeArticles: []
    };
  }

  /**
   * Generate prevention plan based on validation results
   */
  generatePreventionPlan(validationResult: ESPValidationResult): PreventionPlan {
    const steps: PreventionStep[] = [];

    // Step 1: Clean plugin
    steps.push({
      id: 'clean-plugin',
      title: 'Clean Plugin with xEdit',
      description: 'Remove identical-to-master records and undelete references',
      tool: 'FO4Edit',
      completed: false
    });

    // Step 2: Backup
    steps.push({
      id: 'backup',
      title: 'Create Backup',
      description: 'Backup current plugin state before modifications',
      tool: 'File System',
      completed: false
    });

    // Step 3: Disable precombines if detected
    const hasPrecombineIssue = validationResult.issues.some(i => 
      i.message.toLowerCase().includes('precombine')
    );
    if (hasPrecombineIssue) {
      steps.push({
        id: 'disable-precombines',
        title: 'Disable Precombines',
        description: 'Run CompressPSG OFF to remove precombine data',
        tool: 'CompressPSG',
        completed: false
      });
    }

    // Step 4: Memory optimization
    if (validationResult.memoryEstimate > 1000) {
      steps.push({
        id: 'optimize-memory',
        title: 'Optimize System Memory',
        description: 'Close unnecessary applications, clear Windows cache',
        tool: 'Task Manager',
        completed: false
      });
    }

    // Step 5: Verify masters
    steps.push({
      id: 'verify-masters',
      title: 'Verify Master Files',
      description: 'Ensure all required masters are installed and in load order',
      completed: false
    });

    const priority: 'low' | 'medium' | 'high' = 
      validationResult.estimatedCrashRisk > 70 ? 'high' :
      validationResult.estimatedCrashRisk > 40 ? 'medium' : 'low';

    return {
      priority,
      steps,
      estimatedTime: 15 // minutes
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateRecommendations(
    issues: InternalValidationIssue[], 
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
