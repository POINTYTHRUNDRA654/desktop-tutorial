/**
 * FileAnalyzerService
 * 
 * Routes dropped files to appropriate analyzers
 * Shows notifications with analysis results
 */

export interface FileAnalysisResult {
  fileName: string;
  fileType: string;
  success: boolean;
  message: string;
  details?: any;
  route?: string; // Route to view full analysis
}

class FileAnalyzerService {
  /**
   * Analyze dropped files and show results
   */
  async analyzeFiles(files: File[]): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];

    for (const file of files) {
      const result = await this.analyzeFile(file);
      results.push(result);
    }

    return results;
  }

  /**
   * Analyze a single file based on its type
   */
  private async analyzeFile(file: File): Promise<FileAnalysisResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const fileSize = this.formatFileSize(file.size);

    // Route based on file extension
    if (ext === 'nif') {
      return this.analyzeNIF(file);
    } else if (['dds', 'png', 'jpg', 'jpeg', 'tga', 'bmp'].includes(ext)) {
      return this.analyzeImage(file);
    } else if (['esp', 'esm', 'esl'].includes(ext)) {
      return this.analyzePlugin(file);
    } else if (ext === 'blend') {
      return this.analyzeBlenderFile(file);
    } else if (ext === 'fbx') {
      return this.analyzeFBX(file);
    } else if (ext === 'ba2') {
      return this.analyzeArchive(file);
    } else if (['pex', 'psc'].includes(ext)) {
      return this.analyzeScript(file);
    } else if (['json', 'xml', 'txt'].includes(ext)) {
      return this.analyzeTextFile(file);
    } else {
      return {
        fileName: file.name,
        fileType: ext.toUpperCase() || 'Unknown',
        success: false,
        message: `Unsupported file type: ${ext}. File size: ${fileSize}`,
      };
    }
  }

  private async analyzeNIF(file: File): Promise<FileAnalysisResult> {
    // In a real implementation, this would call TheAuditor's NIF analysis
    return {
      fileName: file.name,
      fileType: 'NIF',
      success: true,
      message: `NIF file ready for analysis. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Open in The Auditor for detailed analysis',
      },
      route: '/auditor',
    };
  }

  private async analyzeImage(file: File): Promise<FileAnalysisResult> {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    
    return {
      fileName: file.name,
      fileType: ext,
      success: true,
      message: `Image file ready. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Open in Image Suite for editing',
      },
      route: '/image-suite',
    };
  }

  private async analyzePlugin(file: File): Promise<FileAnalysisResult> {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    
    return {
      fileName: file.name,
      fileType: ext,
      success: true,
      message: `Plugin file detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Open in The Auditor for conflict analysis',
      },
      route: '/auditor',
    };
  }

  private async analyzeBlenderFile(file: File): Promise<FileAnalysisResult> {
    return {
      fileName: file.name,
      fileType: 'BLEND',
      success: true,
      message: `Blender file detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Use Blender Scripts Panel for automation',
      },
      route: '/tools/blender-scripts',
    };
  }

  private async analyzeFBX(file: File): Promise<FileAnalysisResult> {
    return {
      fileName: file.name,
      fileType: 'FBX',
      success: true,
      message: `FBX model detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Import into Blender for conversion',
      },
    };
  }

  private async analyzeArchive(file: File): Promise<FileAnalysisResult> {
    return {
      fileName: file.name,
      fileType: 'BA2',
      success: true,
      message: `Archive file detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Use Archive Extractor to view contents',
      },
    };
  }

  private async analyzeScript(file: File): Promise<FileAnalysisResult> {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    
    return {
      fileName: file.name,
      fileType: ext,
      success: true,
      message: `Papyrus script detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: ext === 'PSC' ? 'Source code file' : 'Compiled script',
      },
    };
  }

  private async analyzeTextFile(file: File): Promise<FileAnalysisResult> {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    
    return {
      fileName: file.name,
      fileType: ext,
      success: true,
      message: `Text file detected. Size: ${this.formatFileSize(file.size)}`,
      details: {
        suggestion: 'Configuration or data file',
      },
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Show a notification for file analysis results
   */
  showNotification(result: FileAnalysisResult): void {
    // In a real implementation, this would use a toast/notification system
    console.log('File Analysis:', result);
    
    // For now, use browser notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${result.fileType}: ${result.fileName}`, {
        body: result.message,
        icon: result.success ? '✅' : '❌',
      });
    }
  }
}

export const fileAnalyzerService = new FileAnalyzerService();
