/**
 * CK Crash Prevention Engine (clean, conflict-free)
 * - Minimal, deterministic implementation used for validation and unit tests.
 * - Aligns with `src/shared/types.ts` CK types.
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  CKValidationInput,
  CKValidationResult,
  ValidationIssue,
  ValidationWarning,
  PreventionPlan,
  PreventionStep,
  CrashDiagnosis,
} from '../shared/types';

export class CKCrashPreventionEngine {
  private knownProblematicMods = [
    'fusion city rising',
    'hookers of the commonwealth',
    'outcast and remnants',
  ];

  async validateBeforeCK(input: CKValidationInput): Promise<CKValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];
    let estimatedMemoryUsage = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    try {
      if (!fs.existsSync(input.espPath)) {
        issues.push({ type: 'file_size', severity: 'critical', message: 'ESP file not found', fix: 'Verify path' } as any);
        return { safe: false, issues, warnings, recommendations, estimatedMemoryUsage: 0, riskLevel: 'critical' };
      }

      const stats = fs.statSync(input.espPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      estimatedMemoryUsage = Math.round(fileSizeMB * 4);

      if (fileSizeMB > 250) {
        issues.push({ type: 'file_size', severity: 'critical', message: `File exceeds 250MB (${fileSizeMB.toFixed(1)}MB)`, fix: 'Split plugin or reduce assets' } as any);
        riskLevel = 'critical';
      } else if (fileSizeMB > 180) {
        warnings.push({ message: `Large ESP (${fileSizeMB.toFixed(1)}MB)`, recommendation: 'Monitor memory and consider splitting content' });
        riskLevel = 'high';
      }

      if (input.modName && this.knownProblematicMods.some(m => input.modName!.toLowerCase().includes(m))) {
        warnings.push({ message: 'Known problematic mod detected', recommendation: 'Review known issues before editing' });
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      if (input.cellCount && input.cellCount > 5000) {
        warnings.push({ message: `High cell count (${input.cellCount})`, recommendation: 'Requires large RAM / break into smaller regions' });
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      if (issues.length === 0 && warnings.length === 0) recommendations.push('File appears safe for CK operations');

      return { safe: issues.length === 0, issues, warnings, recommendations, estimatedMemoryUsage, riskLevel };
    } catch (err: any) {
      issues.push({ type: 'file_size', severity: 'critical', message: `Validation failed: ${String(err.message || err)}`, fix: 'Inspect file' } as any);
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

export const ckCrashPrevention = new CKCrashPreventionEngine();
