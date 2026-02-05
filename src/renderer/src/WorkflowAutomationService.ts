import { cacheManager, CacheManager } from './CacheManager';

export interface WorkflowStep {
    id: string;
    action: string;
    parameters: Record<string, any>;
    timestamp: number;
    component?: string;
    description?: string;
}

export interface WorkflowMacro {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    createdAt: number;
    lastModified: number;
    tags: string[];
    isActive: boolean;
}

export interface WorkflowSession {
    id: string;
    macroId: string;
    startTime: number;
    endTime?: number;
    steps: WorkflowStep[];
    status: 'recording' | 'playing' | 'paused' | 'completed' | 'failed';
    currentStepIndex?: number;
}

export class WorkflowAutomationService {
    private cacheManager: CacheManager;
    private currentSession: WorkflowSession | null = null;
    private macros: Map<string, WorkflowMacro> = new Map();
    private listeners: Set<(event: string, data: any) => void> = new Set();

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
        this.loadMacros();
    }

    // Event system for UI updates
    addListener(callback: (event: string, data: any) => void) {
        this.listeners.add(callback);
    }

    removeListener(callback: (event: string, data: any) => void) {
        this.listeners.delete(callback);
    }

    private emit(event: string, data: any) {
        this.listeners.forEach(listener => listener(event, data));
    }

    // Macro management
    async createMacro(name: string, description: string, tags: string[] = []): Promise<string> {
        const macro: WorkflowMacro = {
            id: `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            steps: [],
            createdAt: Date.now(),
            lastModified: Date.now(),
            tags,
            isActive: true
        };

        this.macros.set(macro.id, macro);
        await this.saveMacros();
        this.emit('macroCreated', macro);
        return macro.id;
    }

    async updateMacro(macroId: string, updates: Partial<WorkflowMacro>): Promise<void> {
        const macro = this.macros.get(macroId);
        if (!macro) throw new Error(`Macro ${macroId} not found`);

        Object.assign(macro, updates, { lastModified: Date.now() });
        await this.saveMacros();
        this.emit('macroUpdated', macro);
    }

    async deleteMacro(macroId: string): Promise<void> {
        if (!this.macros.has(macroId)) throw new Error(`Macro ${macroId} not found`);

        this.macros.delete(macroId);
        await this.saveMacros();
        this.emit('macroDeleted', macroId);
    }

    getMacro(macroId: string): WorkflowMacro | undefined {
        return this.macros.get(macroId);
    }

    getAllMacros(): WorkflowMacro[] {
        return Array.from(this.macros.values());
    }

    // Recording functionality
    startRecording(macroId: string): void {
        if (this.currentSession) {
            throw new Error('Recording session already in progress');
        }

        const macro = this.macros.get(macroId);
        if (!macro) throw new Error(`Macro ${macroId} not found`);

        this.currentSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            macroId,
            startTime: Date.now(),
            steps: [],
            status: 'recording'
        };

        this.emit('recordingStarted', this.currentSession);
    }

    recordStep(action: string, parameters: Record<string, any>, component?: string, description?: string): void {
        if (!this.currentSession || this.currentSession.status !== 'recording') {
            return; // Silently ignore if not recording
        }

        const step: WorkflowStep = {
            id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action,
            parameters,
            timestamp: Date.now(),
            component,
            description
        };

        this.currentSession.steps.push(step);
        this.emit('stepRecorded', step);
    }

    stopRecording(): WorkflowMacro | null {
        if (!this.currentSession || this.currentSession.status !== 'recording') {
            return null;
        }

        this.currentSession.endTime = Date.now();
        this.currentSession.status = 'completed';

        const macro = this.macros.get(this.currentSession.macroId);
        if (macro) {
            macro.steps = this.currentSession.steps;
            macro.lastModified = Date.now();
            this.saveMacros();
            this.emit('recordingStopped', { session: this.currentSession, macro });
        }

        const completedMacro = macro || null;
        this.currentSession = null;
        return completedMacro;
    }

    // Playback functionality
    async playMacro(macroId: string): Promise<void> {
        const macro = this.macros.get(macroId);
        if (!macro) throw new Error(`Macro ${macroId} not found`);
        if (!macro.steps.length) throw new Error('Macro has no steps to play');

        const session: WorkflowSession = {
            id: `playback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            macroId,
            startTime: Date.now(),
            steps: [...macro.steps],
            status: 'playing',
            currentStepIndex: 0
        };

        this.currentSession = session;
        this.emit('playbackStarted', session);

        try {
            for (let i = 0; i < macro.steps.length; i++) {
                if (this.currentSession?.status !== 'playing') break;

                session.currentStepIndex = i;
                const step = macro.steps[i];

                this.emit('stepExecuting', { session, step });

                // Execute the step
                await this.executeStep(step);

                // Small delay between steps for UI responsiveness
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (this.currentSession?.status === 'playing') {
                session.status = 'completed';
                session.endTime = Date.now();
                this.emit('playbackCompleted', session);
            }
        } catch (error) {
            if (this.currentSession) {
                this.currentSession.status = 'failed';
                this.currentSession.endTime = Date.now();
                this.emit('playbackFailed', { session: this.currentSession, error });
            }
        } finally {
            this.currentSession = null;
        }
    }

    pausePlayback(): void {
        if (this.currentSession?.status === 'playing') {
            this.currentSession.status = 'paused';
            this.emit('playbackPaused', this.currentSession);
        }
    }

    resumePlayback(): void {
        if (this.currentSession?.status === 'paused') {
            this.currentSession.status = 'playing';
            this.emit('playbackResumed', this.currentSession);
        }
    }

    stopPlayback(): void {
        if (this.currentSession && ['playing', 'paused'].includes(this.currentSession.status)) {
            this.currentSession.status = 'completed';
            this.currentSession.endTime = Date.now();
            this.emit('playbackStopped', this.currentSession);
            this.currentSession = null;
        }
    }

    // Step execution logic
    private async executeStep(step: WorkflowStep): Promise<void> {
        // This would integrate with the actual UI components
        // For now, we'll emit events that components can listen to
        this.emit('executeStep', step);

        // Simulate execution time based on step type
        const executionTime = this.getStepExecutionTime(step);
        await new Promise(resolve => setTimeout(resolve, executionTime));
    }

    private getStepExecutionTime(step: WorkflowStep): number {
        // Estimate execution time based on action type
        const actionTimes: Record<string, number> = {
            'click': 200,
            'type': 100,
            'navigate': 500,
            'analyze': 1000,
            'generate': 2000,
            'default': 300
        };
        return actionTimes[step.action] || actionTimes.default;
    }

    // Session management
    getCurrentSession(): WorkflowSession | null {
        return this.currentSession;
    }

    // Persistence
    private async loadMacros(): Promise<void> {
        try {
            const cached = await this.cacheManager.get('user-sessions', 'workflowMacros');
            if (cached && typeof cached === 'string') {
                const macrosData = JSON.parse(cached);
                this.macros = new Map(Object.entries(macrosData));
            }
        } catch (error) {
            console.error('Failed to load workflow macros:', error);
        }
    }

    private async saveMacros(): Promise<void> {
        try {
            const macrosData = Object.fromEntries(this.macros);
            await this.cacheManager.set('user-sessions', 'workflowMacros', JSON.stringify(macrosData));
        } catch (error) {
            console.error('Failed to save workflow macros:', error);
        }
    }

    // Utility methods
    exportMacro(macroId: string): string | null {
        const macro = this.macros.get(macroId);
        return macro ? JSON.stringify(macro, null, 2) : null;
    }

    async importMacro(macroJson: string): Promise<string> {
        try {
            const macro: WorkflowMacro = JSON.parse(macroJson);
            // Generate new ID to avoid conflicts
            macro.id = `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            macro.createdAt = Date.now();
            macro.lastModified = Date.now();

            this.macros.set(macro.id, macro);
            await this.saveMacros();
            this.emit('macroImported', macro);
            return macro.id;
        } catch (error) {
            throw new Error('Invalid macro JSON format');
        }
    }

    // Search and filter
    searchMacros(query: string): WorkflowMacro[] {
        const lowercaseQuery = query.toLowerCase();
        return this.getAllMacros().filter(macro =>
            macro.name.toLowerCase().includes(lowercaseQuery) ||
            macro.description.toLowerCase().includes(lowercaseQuery) ||
            macro.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        );
    }

    getMacrosByTag(tag: string): WorkflowMacro[] {
        return this.getAllMacros().filter(macro => macro.tags.includes(tag));
    }
}

// Factory function for creating service instances
export const createWorkflowAutomationService = (cacheManagerInstance: any): WorkflowAutomationService => {
    return new WorkflowAutomationService(cacheManagerInstance);
};

// Singleton instance - only created when accessed
let _singletonInstance: WorkflowAutomationService | null = null;

export const getWorkflowAutomationService = (): WorkflowAutomationService => {
    if (!_singletonInstance) {
        _singletonInstance = new WorkflowAutomationService(cacheManager);
    }
    return _singletonInstance;
};