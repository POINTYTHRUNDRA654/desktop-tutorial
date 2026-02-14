/**
 * Creation Kit Crash Prevention Engine
 * 
 * Proactive validation, real-time monitoring, and crash pattern analysis
 * to prevent common CK crashes before they happen.
 */

export interface ModData {
    pluginPath: string;
    pluginName: string;
    masters: string[];
    recordCount: number;
    fileSize: number;
    lastModified: Date;
    hasScripts: boolean;
    hasNavmesh: boolean;
    hasPrecombines: boolean;
}

export interface CKValidationResult {
    isValid: boolean;
    severity: 'safe' | 'warning' | 'danger';
    issues: ValidationIssue[];
    recommendations: string[];
    estimatedCrashRisk: number; // 0-100
}

export interface ValidationIssue {
    type: 'missing_master' | 'corrupted_record' | 'memory_intensive' | 'navmesh_conflict' | 'script_error' | 'form_id_conflict';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    affectedRecords?: string[];
    solution: string;
}

export interface CKHealthMetrics {
    timestamp: number;
    memoryUsageMB: number;
    handleCount: number;
    threadCount: number;
    cpuPercent: number;
    responsiveness: 'normal' | 'slow' | 'frozen';
    warningSignals: string[];
}

export interface CrashDiagnosis {
    crashType: 'memory_overflow' | 'access_violation' | 'stack_overflow' | 'infinite_loop' | 'missing_asset' | 'navmesh_conflict' | 'unknown';
    rootCause: string;
    affectedComponent: string;
    stackTrace?: string[];
    recommendations: string[];
    preventable: boolean;
    relatedIssues: string[];
}

export interface ModContext {
    plugin: ModData;
    loadOrder: string[];
    installedMods: string[];
    ckVersion: string;
    systemMemoryGB: number;
    previousCrashes: CrashDiagnosis[];
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
    command?: string;
}

export class CKCrashPreventionEngine {
    private monitoringIntervals: Map<number, NodeJS.Timeout> = new Map();
    private crashPatterns: Map<string, number> = new Map();

    /**
     * Validate mod data before opening in Creation Kit
     */
    async validateBeforeCK(modData: ModData): Promise<CKValidationResult> {
        const issues: ValidationIssue[] = [];
        let crashRisk = 0;

        // Check 1: Missing masters
        const missingMasters = await this.checkMissingMasters(modData.masters);
        if (missingMasters.length > 0) {
            issues.push({
                type: 'missing_master',
                severity: 'critical',
                message: `Missing required master files: ${missingMasters.join(', ')}`,
                solution: 'Install missing master plugins or remove dependencies from the plugin',
                affectedRecords: missingMasters
            });
            crashRisk += 50;
        }

        // Check 2: File size (>50MB is risky)
        if (modData.fileSize > 50 * 1024 * 1024) {
            issues.push({
                type: 'memory_intensive',
                severity: 'high',
                message: `Large plugin file (${(modData.fileSize / 1024 / 1024).toFixed(1)}MB) may cause memory issues`,
                solution: 'Consider splitting into multiple plugins or cleaning unused records'
            });
            crashRisk += 20;
        }

        // Check 3: Navmesh detection
        if (modData.hasNavmesh) {
            issues.push({
                type: 'navmesh_conflict',
                severity: 'medium',
                message: 'Plugin contains navmesh data - CK may crash when editing complex navmeshes',
                solution: 'Save frequently, avoid dragging large navmesh sections, use navmesh cut tool'
            });
            crashRisk += 15;
        }

        // Check 4: Precombines (known CK crash source)
        if (modData.hasPrecombines) {
            issues.push({
                type: 'memory_intensive',
                severity: 'high',
                message: 'Plugin contains precombine/previs data - high crash risk when editing cells',
                solution: 'Disable precombines before opening in CK, regenerate after changes'
            });
            crashRisk += 30;
        }

        // Check 5: Record count (>5000 records is intensive)
        if (modData.recordCount > 5000) {
            issues.push({
                type: 'memory_intensive',
                severity: 'medium',
                message: `High record count (${modData.recordCount}) may impact CK stability`,
                solution: 'Close other applications, ensure 8GB+ RAM available'
            });
            crashRisk += 10;
        }

        // Check 6: Script compilation issues
        if (modData.hasScripts) {
            const scriptIssues = await this.checkScriptValidity(modData.pluginPath);
            if (scriptIssues.length > 0) {
                issues.push({
                    type: 'script_error',
                    severity: 'medium',
                    message: 'Script compilation errors detected',
                    solution: 'Fix script errors before opening in CK to prevent editor crashes',
                    affectedRecords: scriptIssues
                });
                crashRisk += 15;
            }
        }

        // Determine severity
        let severity: 'safe' | 'warning' | 'danger' = 'safe';
        if (crashRisk > 60) severity = 'danger';
        else if (crashRisk > 30) severity = 'warning';

        // Generate recommendations
        const recommendations = this.generateRecommendations(issues);

        return {
            isValid: crashRisk < 70,
            severity,
            issues,
            recommendations,
            estimatedCrashRisk: Math.min(crashRisk, 100)
        };
    }

    /**
     * Monitor Creation Kit process in real-time
     */
    monitorCKProcess(pid: number, callback: (metrics: CKHealthMetrics) => void): void {
        const interval = setInterval(async () => {
            try {
                const metrics = await this.collectProcessMetrics(pid);
                callback(metrics);

                // Auto-alert on critical conditions
                if (metrics.memoryUsageMB > 3500) {
                    metrics.warningSignals.push('⚠️ Memory usage approaching 4GB limit - save now!');
                }
                if (metrics.handleCount > 10000) {
                    metrics.warningSignals.push('⚠️ High handle count - resource leak detected');
                }
                if (metrics.responsiveness === 'frozen') {
                    metrics.warningSignals.push('🚨 CK may be frozen - prepare to force quit');
                }
            } catch (error) {
                console.error('Failed to collect CK metrics:', error);
                this.stopMonitoring(pid);
            }
        }, 2000); // Check every 2 seconds

        this.monitoringIntervals.set(pid, interval);
    }

    /**
     * Stop monitoring a CK process
     */
    stopMonitoring(pid: number): void {
        const interval = this.monitoringIntervals.get(pid);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(pid);
        }
    }

    /**
     * Analyze CK crash log
     */
    async analyzeCrashLog(logPath: string): Promise<CrashDiagnosis> {
        const logContent = await this.readCrashLog(logPath);
        
        // Pattern matching for common crash types
        let crashType: CrashDiagnosis['crashType'] = 'unknown';
        let rootCause = 'Unknown cause';
        let affectedComponent = 'Unknown';
        const recommendations: string[] = [];
        let preventable = false;

        // Memory overflow patterns
        if (logContent.includes('out of memory') || logContent.includes('std::bad_alloc')) {
            crashType = 'memory_overflow';
            rootCause = 'Creation Kit exceeded 4GB memory limit (32-bit application)';
            affectedComponent = 'Memory Manager';
            recommendations.push('Close unnecessary plugins before opening CK');
            recommendations.push('Split large mods into multiple smaller plugins');
            recommendations.push('Use 64-bit tools (xEdit, Wrye Bash) for bulk operations');
            recommendations.push('Disable precombine/previs before editing cells');
            preventable = true;
        }

        // Access violation patterns
        if (logContent.includes('access violation') || logContent.includes('0xC0000005')) {
            crashType = 'access_violation';
            
            if (logContent.includes('navmesh')) {
                rootCause = 'Invalid navmesh operation (common with complex navmesh edits)';
                affectedComponent = 'Navmesh Editor';
                recommendations.push('Save before editing navmeshes');
                recommendations.push('Avoid dragging large navmesh sections');
                recommendations.push('Use navmesh cut tool instead of delete');
                recommendations.push('Regenerate navmesh if corruption suspected');
                preventable = true;
            } else if (logContent.includes('precombine') || logContent.includes('previs')) {
                rootCause = 'Precombine/Previs data corruption or conflict';
                affectedComponent = 'Precombine System';
                recommendations.push('Disable precombines before CK edit: CompressPSG OFF');
                recommendations.push('Edit in CK without precombined data');
                recommendations.push('Regenerate precombines after completion');
                preventable = true;
            } else {
                rootCause = 'Memory access to invalid address (corrupted data or missing asset)';
                affectedComponent = 'Unknown';
                recommendations.push('Run plugin validation (xEdit: Check for Errors)');
                recommendations.push('Check for missing assets (meshes, textures, scripts)');
                recommendations.push('Clean plugin with xEdit (Remove Identical to Master)');
            }
        }

        // Stack overflow patterns
        if (logContent.includes('stack overflow') || logContent.includes('0xC00000FD')) {
            crashType = 'stack_overflow';
            rootCause = 'Infinite recursion or deeply nested operations';
            affectedComponent = 'Script System or Object References';
            recommendations.push('Check for circular script references');
            recommendations.push('Review quest aliases and conditions');
            recommendations.push('Simplify complex object reference chains');
            preventable = true;
        }

        // Missing asset patterns
        if (logContent.includes('file not found') || logContent.includes('missing')) {
            crashType = 'missing_asset';
            rootCause = 'Required file missing (mesh, texture, script, or sound)';
            affectedComponent = 'Asset Loader';
            recommendations.push('Check Data folder for missing files');
            recommendations.push('Verify all mod dependencies are installed');
            recommendations.push('Run Archive Invalidation if using loose files');
            preventable = true;
        }

        // Extract stack trace if available
        const stackTrace = this.extractStackTrace(logContent);

        // Track crash patterns
        this.crashPatterns.set(crashType, (this.crashPatterns.get(crashType) || 0) + 1);

        return {
            crashType,
            rootCause,
            affectedComponent,
            stackTrace,
            recommendations,
            preventable,
            relatedIssues: this.findRelatedIssues(crashType)
        };
    }

    /**
     * Generate prevention plan based on mod context
     */
    generatePreventionPlan(modContext: ModContext): PreventionPlan {
        const steps: PreventionStep[] = [];
        let riskReduction = 0;
        let priority: PreventionPlan['priority'] = 'low';

        // Step 1: Validate masters
        steps.push({
            order: 1,
            action: 'Verify Master Files',
            description: 'Ensure all required master files are installed and in correct load order',
            automated: true,
            tool: 'LOOT',
            command: 'loot --sort'
        });
        riskReduction += 15;

        // Step 2: Clean plugin
        if (modContext.plugin.recordCount > 100) {
            steps.push({
                order: 2,
                action: 'Clean Plugin Records',
                description: 'Remove identical-to-master records and undelete references',
                automated: true,
                tool: 'xEdit',
                command: 'FO4Edit.exe -quickautoclean -autoload'
            });
            riskReduction += 20;
        }

        // Step 3: Disable precombines/previs
        if (modContext.plugin.hasPrecombines) {
            steps.push({
                order: 3,
                action: 'Disable Precombines',
                description: 'Remove precombine/previs data before CK editing',
                automated: true,
                tool: 'CK',
                command: 'CompressPSG OFF via batch file'
            });
            riskReduction += 30;
            priority = 'high';
        }

        // Step 4: Memory optimization
        if (modContext.systemMemoryGB < 8 || modContext.plugin.fileSize > 30 * 1024 * 1024) {
            steps.push({
                order: 4,
                action: 'Optimize System Memory',
                description: 'Close unnecessary applications, clear Windows cache',
                automated: false,
                tool: 'Task Manager'
            });
            riskReduction += 10;
        }

        // Step 5: Create backup
        steps.push({
            order: 5,
            action: 'Create Plugin Backup',
            description: 'Backup current plugin state before CK modifications',
            automated: true,
            tool: 'File System'
        });
        riskReduction += 5;

        // Step 6: Review previous crash patterns
        if (modContext.previousCrashes.length > 0) {
            const commonCrashType = this.getMostCommonCrashType(modContext.previousCrashes);
            steps.push({
                order: 6,
                action: 'Address Previous Crash Pattern',
                description: `Previous crashes were ${commonCrashType} - apply specific mitigations`,
                automated: false
            });
            riskReduction += 15;
            priority = 'critical';
        }

        // Estimate time
        const estimatedMinutes = steps.length * 2; // ~2 minutes per step
        const estimatedTime = estimatedMinutes < 60 
            ? `${estimatedMinutes} minutes` 
            : `${Math.ceil(estimatedMinutes / 60)} hour${estimatedMinutes >= 120 ? 's' : ''}`;

        return {
            steps,
            estimatedRiskReduction: Math.min(riskReduction, 85),
            estimatedTime,
            priority
        };
    }

    // Private helper methods

    private async checkMissingMasters(masters: string[]): Promise<string[]> {
        // In real implementation, check Data folder for .esm/.esp files
        // For now, return empty array (would use electron IPC to check filesystem)
        return [];
    }

    private async checkScriptValidity(pluginPath: string): Promise<string[]> {
        // In real implementation, extract and validate script properties
        return [];
    }

    private generateRecommendations(issues: ValidationIssue[]): string[] {
        const recommendations = new Set<string>();

        issues.forEach(issue => {
            if (issue.type === 'memory_intensive') {
                recommendations.add('💾 Save frequently (Ctrl+S every 5 minutes)');
                recommendations.add('🔄 Restart CK every 30-45 minutes to clear memory');
            }
            if (issue.type === 'navmesh_conflict') {
                recommendations.add('🗺️ Back up plugin before navmesh edits');
                recommendations.add('✂️ Use navmesh cut tool instead of direct deletion');
            }
            if (issue.severity === 'critical') {
                recommendations.add('🚨 Fix critical issues before opening in CK');
            }
        });

        recommendations.add('📊 Monitor memory usage with Task Manager');
        recommendations.add('💻 Close other applications to free RAM');

        return Array.from(recommendations);
    }

    private async collectProcessMetrics(pid: number): Promise<CKHealthMetrics> {
        // In real implementation, query process via Electron IPC
        // For now, return placeholder
        return {
            timestamp: Date.now(),
            memoryUsageMB: 2048,
            handleCount: 5000,
            threadCount: 12,
            cpuPercent: 45,
            responsiveness: 'normal',
            warningSignals: []
        };
    }

    private async readCrashLog(logPath: string): Promise<string> {
        // In real implementation, read actual crash log file
        return '';
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

    private findRelatedIssues(crashType: CrashDiagnosis['crashType']): string[] {
        const related: string[] = [];

        switch (crashType) {
            case 'memory_overflow':
                related.push('Large texture files in plugin');
                related.push('Complex cell edits with many objects');
                related.push('Multiple master file dependencies');
                break;
            case 'access_violation':
                related.push('Corrupted plugin records');
                related.push('Missing asset files');
                related.push('Invalid object references');
                break;
            case 'navmesh_conflict':
                related.push('Overlapping navmesh triangles');
                related.push('Invalid navmesh finalization');
                break;
        }

        return related;
    }

    private getMostCommonCrashType(crashes: CrashDiagnosis[]): string {
        const counts = new Map<string, number>();
        crashes.forEach(crash => {
            counts.set(crash.crashType, (counts.get(crash.crashType) || 0) + 1);
        });

        let maxCount = 0;
        let commonType = 'unknown';
        counts.forEach((count, type) => {
            if (count > maxCount) {
                maxCount = count;
                commonType = type;
            }
        });

        return commonType;
    }
}

// Singleton instance
export const ckCrashPrevention = new CKCrashPreventionEngine();
