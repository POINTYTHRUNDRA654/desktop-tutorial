/**
 * CK Crash Prevention Engine
 * Provides pre-flight validation, monitoring, and crash analysis for Creation Kit operations
 */

import * as fs from 'fs';
import * as path from 'path';

// Re-export types from shared types
export type {
  CKValidationInput,
  CKValidationResult,
  ValidationIssue,
  ValidationWarning,
  CKMonitoringSession,
  CKHealthMetrics,
  CrashDiagnosis,
  KnownCKIssue,
  PreventionPlan,
  PreventionStep
} from '../shared/types';

import type {
  CKValidationInput,
  CKValidationResult,
  ValidationIssue,
  ValidationWarning,
  CrashDiagnosis,
  PreventionPlan,
  PreventionStep
} from '../shared/types';

export class CKCrashPreventionEngine {
  private knownProblematicMods = [
    'Fusion City Rising',
    'Hookers of the Commonwealth',
    'Outcast and Remnants'
  ];

  /**
   * Validate ESP file before CK operations
   */
  async validateBeforeCK(input: CKValidationInput): Promise<CKValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];
    let estimatedMemoryUsage = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    try {
      // Check file exists
      if (!fs.existsSync(input.espPath)) {
        issues.push({
          type: 'file_size',
          severity: 'critical',
          message: 'ESP file not found',
          fix: 'Verify the file path is correct'
        });
        return { safe: false, issues, warnings, recommendations, estimatedMemoryUsage: 0, riskLevel: 'critical' };
      }

      // Check file size
      const stats = fs.statSync(input.espPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      estimatedMemoryUsage = fileSizeMB * 4; // Rough estimate

      if (fileSizeMB > 250) {
        issues.push({
          type: 'file_size',
          severity: 'critical',
          message: `File exceeds Fallout 4's 250MB plugin limit (${fileSizeMB.toFixed(2)}MB)`,
          fix: 'Split the mod into multiple plugins or reduce content'
        });
        riskLevel = 'critical';
      } else if (fileSizeMB > 200) {
        warnings.push({
          message: `File approaching 250MB limit (${fileSizeMB.toFixed(2)}MB)`,
          recommendation: 'Monitor file size carefully during development'
        });
        riskLevel = 'high';
      }

      // Check for known problematic mods
      if (input.modName) {
        const isProblematic = this.knownProblematicMods.some(mod => 
          input.modName?.toLowerCase().includes(mod.toLowerCase())
        );
        
        if (isProblematic) {
          warnings.push({
            message: `This mod is known to cause CK crashes during precombine generation`,
            recommendation: 'Exclude problematic cells before running precombine generation'
          });
          recommendations.push('Review known crash cells in documentation');
          if (riskLevel === 'low') riskLevel = 'medium';
        }
      }

      // Memory estimation
      if (input.cellCount && input.cellCount > 5000) {
        warnings.push({
          message: `Large number of cells (${input.cellCount}) requires significant RAM`,
          recommendation: 'Ensure at least 32GB RAM available. Consider moving texture archives temporarily.'
        });
        recommendations.push('Move .ba2 texture files to external drive during generation');
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // Generate recommendations
      if (estimatedMemoryUsage > 8000) {
        recommendations.push('Increase virtual memory/page file to at least 16GB');
        recommendations.push('Close all other applications before running CK');
      }

      if (issues.length === 0 && warnings.length === 0) {
        recommendations.push('File appears safe for CK operations');
      }

      const safe = issues.filter(i => i.severity === 'critical' || i.severity === 'error').length === 0;

      return {
        safe,
        issues,
        warnings,
        recommendations,
        estimatedMemoryUsage,
        riskLevel
      };

    } catch (error: any) {
      issues.push({
        type: 'file_size',
        severity: 'critical',
        message: `Validation error: ${error.message}`,
        fix: 'Check file permissions and path'
      });
      return { safe: false, issues, warnings, recommendations, estimatedMemoryUsage: 0, riskLevel: 'critical' };
    }
  }

  /**
   * Analyze crash log file
   */
  async analyzeCrashLog(logPath: string): Promise<CrashDiagnosis> {
    try {
      if (!fs.existsSync(logPath)) {
        return {
          exceptionType: 'unknown',
          rootCause: 'Log file not found',
          fixSteps: ['Verify log file path', 'Check Documents\\My Games\\Fallout 4 Creation Kit\\'],
          relatedKnowledgeArticles: []
        };
      }

      const logContent = fs.readFileSync(logPath, 'utf-8');
      const lines = logContent.split('\n');

      // Detect exception code
      const exceptionLine = lines.find(line => /exception|0xc0000005/i.test(line));
      let exceptionCode: string | undefined;
      let exceptionType: CrashDiagnosis['exceptionType'] = 'unknown';

      if (exceptionLine) {
        if (exceptionLine.includes('0xc0000005')) {
          exceptionCode = '0xc0000005';
          exceptionType = 'access_violation';
        }
        if (/memory|out of memory/i.test(exceptionLine)) {
          exceptionType = 'memory_error';
        }
      }

      // Detect problematic cell
      let problematicCell: string | undefined;
      const cellLine = lines.find(line => /cell|processing/i.test(line));
      if (cellLine) {
        const cellMatch = cellLine.match(/cell\s+([A-Fa-f0-9]+)/i);
        if (cellMatch) {
          problematicCell = cellMatch[1];
        }
      }

      // Generate diagnosis
      let rootCause = 'Unknown crash cause';
      const fixSteps: string[] = [];
      const relatedArticles: string[] = [
        'RESOLVING_CREATION_KIT_CRASHES.md',
        'PRP_PATCH_CREATION_GUIDE.md'
      ];

      if (exceptionType === 'access_violation') {
        rootCause = 'Access violation (0xc0000005) - Problematic mesh or conflicting geometry';
        fixSteps.push('Identify the problematic CELL from CK logs');
        fixSteps.push('Open patch in xEdit and find the problematic CELL record');
        fixSteps.push('Delete the CELL record from your patch');
        fixSteps.push('Save and retry precombine generation');
        fixSteps.push('Document crash cell on GitHub for community');
      } else if (exceptionType === 'memory_error') {
        rootCause = 'Out of memory - Insufficient RAM or page file';
        fixSteps.push('Increase virtual memory/page file to 16GB+');
        fixSteps.push('Move texture .ba2 files to external drive temporarily');
        fixSteps.push('Close all other applications');
        fixSteps.push('Consider upgrading to 32GB RAM for large mods');
      } else {
        rootCause = 'Unable to determine exact cause from log';
        fixSteps.push('Verify CK Fixes 1.81 is installed');
        fixSteps.push('Verify Steamless applied to CreationKit.exe');
        fixSteps.push('Check hex edits are applied correctly');
        fixSteps.push('Try increasing page file size');
      }

      if (problematicCell) {
        fixSteps.unshift(`Focus on CELL: ${problematicCell}`);
      }

      return {
        exceptionCode,
        exceptionType,
        problematicCell,
        rootCause,
        fixSteps,
        relatedKnowledgeArticles: relatedArticles
      };

    } catch (error: any) {
      return {
        exceptionType: 'unknown',
        rootCause: `Error analyzing log: ${error.message}`,
        fixSteps: ['Verify log file is readable', 'Check file permissions'],
        relatedKnowledgeArticles: []
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
