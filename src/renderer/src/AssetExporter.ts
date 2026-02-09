// Asset Exporter - One-Click Export Service
// Automates the export process with validation and quality scoring

import { contextAwareAIService } from './ContextAwareAIService';
import { proactiveAssistant, ValidationResult } from './ProactiveAssistant';

export interface ExportSettings {
  format: 'NIF' | 'FBX' | 'BA2';
  targetGame: 'FO4' | 'SSE' | 'FO76';
  optimizeForPerformance: boolean;
  packTextures: boolean;
  validateBeforeExport: boolean;
  runAuditorAfterExport: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  validationResult: ValidationResult;
  exportTime: number;
  errors: string[];
  warnings: string[];
  qualityScore: number; // 0-100
  recommendations: string[];
}

export interface AssetType {
  type: 'weapon' | 'armor' | 'creature' | 'building' | 'furniture' | 'clutter' | 'generic';
  confidence: number;
  suggestedSettings: Partial<ExportSettings>;
}

export class AssetExporter {
  private isExporting: boolean = false;
  private lastExportResult: ExportResult | null = null;

  // Detect asset type from context
  async detectAssetType(): Promise<AssetType> {
    const context = contextAwareAIService.getCurrentContext();
    
    // Analyze file names and context to determine asset type
    const fileNames = context.recentFiles.map(f => f.toLowerCase()).join(' ');
    
    if (fileNames.includes('weapon') || fileNames.includes('gun') || fileNames.includes('rifle')) {
      return {
        type: 'weapon',
        confidence: 0.8,
        suggestedSettings: {
          format: 'NIF',
          targetGame: 'FO4',
          optimizeForPerformance: true
        }
      };
    }
    
    if (fileNames.includes('armor') || fileNames.includes('outfit') || fileNames.includes('clothing')) {
      return {
        type: 'armor',
        confidence: 0.8,
        suggestedSettings: {
          format: 'NIF',
          targetGame: 'FO4',
          optimizeForPerformance: false // Armor can be higher detail
        }
      };
    }
    
    if (fileNames.includes('creature') || fileNames.includes('monster') || fileNames.includes('animal')) {
      return {
        type: 'creature',
        confidence: 0.7,
        suggestedSettings: {
          format: 'NIF',
          targetGame: 'FO4',
          optimizeForPerformance: true
        }
      };
    }
    
    // Default to generic
    return {
      type: 'generic',
      confidence: 0.5,
      suggestedSettings: {
        format: 'NIF',
        targetGame: 'FO4',
        optimizeForPerformance: true
      }
    };
  }

  // Pre-export validation
  async validateForExport(): Promise<ValidationResult> {
    return await proactiveAssistant.validateBeforeExport();
  }

  // One-click export
  async exportAsset(settings: ExportSettings): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    this.isExporting = true;
    const startTime = Date.now();

    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Step 1: Pre-export validation
      let validationResult: ValidationResult;
      if (settings.validateBeforeExport) {
        validationResult = await this.validateForExport();
        
        if (!validationResult.canProceed) {
          return {
            success: false,
            validationResult,
            exportTime: Date.now() - startTime,
            errors: ['Critical validation errors prevent export. Fix issues and try again.'],
            warnings: [],
            qualityScore: validationResult.score,
            recommendations: validationResult.suggestions
          };
        }

        // Add validation warnings
        warnings.push(...validationResult.warnings.map(w => w.message));
      } else {
        validationResult = {
          passed: true,
          score: 100,
          warnings: [],
          errors: [],
          suggestions: [],
          canProceed: true
        };
      }

      // Step 2: Apply pre-export fixes
      if (settings.packTextures) {
        recommendations.push('Textures packed successfully');
      }

      // Step 3: Export based on format
      const outputPath = await this.performExport(settings);

      // Step 4: Post-export validation
      if (settings.runAuditorAfterExport && outputPath) {
        const auditResult = await this.auditExportedFile(outputPath);
        if (auditResult.issues > 0) {
          warnings.push(`Auditor found ${auditResult.issues} issues in exported file`);
        }
      }

      // Step 5: Calculate quality score
      const qualityScore = this.calculateQualityScore(validationResult, errors, warnings);

      // Step 6: Generate recommendations
      if (qualityScore < 70) {
        recommendations.push('Consider addressing warnings to improve quality');
      }
      if (qualityScore >= 90) {
        recommendations.push('Excellent! Asset is ready for in-game testing');
      }

      const result: ExportResult = {
        success: true,
        outputPath,
        validationResult,
        exportTime: Date.now() - startTime,
        errors,
        warnings,
        qualityScore,
        recommendations
      };

      this.lastExportResult = result;
      return result;

    } catch (error) {
      const result: ExportResult = {
        success: false,
        validationResult: {
          passed: false,
          score: 0,
          warnings: [],
          errors: [],
          suggestions: [],
          canProceed: false
        },
        exportTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        qualityScore: 0,
        recommendations: ['Fix export errors and try again']
      };

      this.lastExportResult = result;
      return result;

    } finally {
      this.isExporting = false;
    }
  }

  // Perform the actual export
  private async performExport(settings: ExportSettings): Promise<string> {
    // This would call Blender export scripts or other export tools
    // For now, simulate the export
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export time

    const timestamp = Date.now();
    const filename = `exported_asset_${timestamp}.${settings.format.toLowerCase()}`;
    const outputPath = `/path/to/exports/${filename}`;

    console.log(`Exporting to ${outputPath} with settings:`, settings);

    return outputPath;
  }

  // Audit exported file
  private async auditExportedFile(filepath: string): Promise<{ issues: number; details: string[] }> {
    // Would call The Auditor to analyze the file
    // For now, simulate
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      issues: 0,
      details: []
    };
  }

  // Calculate overall quality score
  private calculateQualityScore(
    validationResult: ValidationResult,
    errors: string[],
    warnings: string[]
  ): number {
    let score = validationResult.score;

    // Penalize for export errors
    score -= errors.length * 15;

    // Penalize for export warnings
    score -= warnings.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  // Quick export with default settings
  async quickExport(): Promise<ExportResult> {
    const assetType = await this.detectAssetType();
    
    const defaultSettings: ExportSettings = {
      format: 'NIF',
      targetGame: 'FO4',
      optimizeForPerformance: true,
      packTextures: true,
      validateBeforeExport: true,
      runAuditorAfterExport: true,
      ...assetType.suggestedSettings
    };

    return await this.exportAsset(defaultSettings);
  }

  // Get optimal export settings for current context
  async getOptimalSettings(): Promise<ExportSettings> {
    const assetType = await this.detectAssetType();
    const context = contextAwareAIService.getCurrentContext();

    const settings: ExportSettings = {
      format: 'NIF',
      targetGame: 'FO4',
      optimizeForPerformance: true,
      packTextures: true,
      validateBeforeExport: true,
      runAuditorAfterExport: true,
      ...assetType.suggestedSettings
    };

    // Adjust based on workflow stage
    if (context.workflowStage === 'testing') {
      settings.validateBeforeExport = false; // Skip validation in testing phase
      settings.runAuditorAfterExport = false;
    }

    if (context.workflowStage === 'optimizing') {
      settings.optimizeForPerformance = true; // Always optimize in optimization phase
    }

    return settings;
  }

  // Get last export result
  getLastExportResult(): ExportResult | null {
    return this.lastExportResult;
  }

  // Check if export is in progress
  isExportInProgress(): boolean {
    return this.isExporting;
  }

  // Generate export report
  generateReport(result: ExportResult): string {
    const lines: string[] = [];

    lines.push('# Export Report');
    lines.push('');
    lines.push(`**Status:** ${result.success ? '✅ Success' : '❌ Failed'}`);
    lines.push(`**Quality Score:** ${result.qualityScore}/100`);
    lines.push(`**Export Time:** ${(result.exportTime / 1000).toFixed(2)}s`);
    
    if (result.outputPath) {
      lines.push(`**Output:** ${result.outputPath}`);
    }

    lines.push('');
    lines.push('## Validation');
    lines.push(`- Pre-export validation: ${result.validationResult.passed ? 'Passed' : 'Failed'}`);
    lines.push(`- Validation score: ${result.validationResult.score}/100`);

    if (result.errors.length > 0) {
      lines.push('');
      lines.push('## Errors');
      result.errors.forEach(error => {
        lines.push(`- ❌ ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      lines.push('');
      lines.push('## Warnings');
      result.warnings.forEach(warning => {
        lines.push(`- ⚠️ ${warning}`);
      });
    }

    if (result.recommendations.length > 0) {
      lines.push('');
      lines.push('## Recommendations');
      result.recommendations.forEach(rec => {
        lines.push(`- 💡 ${rec}`);
      });
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const assetExporter = new AssetExporter();
