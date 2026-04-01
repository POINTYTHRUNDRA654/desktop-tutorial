/**
 * Mod Project Storage Service
 * Handles persistence of mod projects to localStorage and file system.
 *
 * Dual-persistence pattern (same as Knowledge Vault):
 *   - localStorage  → fast read/write during normal use
 *   - userData/mod-projects.json → durable backup that survives app reinstalls
 *     and localStorage clears
 *
 * On first access, if localStorage is empty the service automatically restores
 * from the file backup so users never lose their mod work.
 */

import type {
  ModProject,
  ModProjectListItem,
  CreateModProjectInput,
  CreateModStepInput,
  UpdateModProjectInput,
  UpdateModStepInput,
  ModStep
} from '../types/ModProject';

const STORAGE_KEY = 'mossy_mod_projects';
const CURRENT_MOD_KEY = 'mossy_current_mod';

// Whether we've already attempted to restore from the file backup this session.
let _restoreAttempted = false;

/** Write projects to both localStorage and the userData file backup. */
function persistProjects(projects: ModProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  // Fire-and-forget — failures are logged but must not interrupt normal use.
  window.electron?.api?.saveModProjects(projects).catch((err: unknown) => {
    console.error('[ModProjectStorage] Failed to write file backup:', err);
  });
}

/** Load projects from localStorage; if empty, attempt a one-time file restore. */
async function loadProjectsWithRestore(): Promise<ModProject[]> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ModProject[]) : [];
    } catch {
      return [];
    }
  }

  // localStorage is empty — try restoring from the file backup once per session.
  if (_restoreAttempted) return [];
  _restoreAttempted = true;

  try {
    const fromFile = await window.electron?.api?.loadModProjectsFromFile?.() ?? [];
    if (Array.isArray(fromFile) && fromFile.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fromFile));
      console.info('[ModProjectStorage] Restored', fromFile.length, 'project(s) from file backup.');
      return fromFile as ModProject[];
    }
  } catch (err) {
    console.error('[ModProjectStorage] File restore failed:', err);
  }
  return [];
}

export class ModProjectStorage {
  
  // --- MOD PROJECT CRUD ---
  
  static createModProject(input: CreateModProjectInput): ModProject {
    const id = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const project: ModProject = {
      id,
      name: input.name,
      description: input.description || '',
      type: input.type,
      status: 'planning',
      version: '0.1.0',
      author: input.author,
      createdAt: now,
      updatedAt: now,
      steps: [],
      completionPercentage: 0,
      requirements: input.requirements || [],
      dependencies: input.dependencies || [],
      tags: [],
      notes: '',
      resourcesLinks: [],
      projectPath: input.projectPath,
      espName: input.espName,
    };
    
    const projects = this.getAllProjects();
    projects.push(project);
    persistProjects(projects);
    
    return project;
  }
  
  static getProject(projectId: string): ModProject | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }
  
  static getAllProjects(): ModProject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Async variant of getAllProjects that also attempts a file restore if
   * localStorage is empty. Call this on component mount.
   */
  static async getAllProjectsWithRestore(): Promise<ModProject[]> {
    return loadProjectsWithRestore();
  }
  
  static updateProject(projectId: string, updates: UpdateModProjectInput): ModProject | null {
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index === -1) return null;
    
    const project = projects[index];
    projects[index] = {
      ...project,
      ...updates,
      updatedAt: Date.now(),
      completionPercentage: this.calculateCompletion(project)
    };
    
    persistProjects(projects);
    return projects[index];
  }
  
  static deleteProject(projectId: string): boolean {
    const projects = this.getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    
    if (filtered.length === projects.length) return false;
    
    persistProjects(filtered);
    
    // If this was the current mod, clear it
    if (this.getCurrentModId() === projectId) {
      localStorage.removeItem(CURRENT_MOD_KEY);
    }
    
    return true;
  }
  
  // --- STEP MANAGEMENT ---
  
  static addStep(projectId: string, input: CreateModStepInput): ModStep | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const step: ModStep = {
      id: stepId,
      title: input.title,
      description: input.description || '',
      status: 'pending',
      priority: input.priority || 'medium',
      notes: '',
      toolsUsed: input.toolsUsed || [],
      createdAt: Date.now(),
      estimatedHours: input.estimatedHours,
    };
    
    project.steps.push(step);
    project.updatedAt = Date.now();
    project.completionPercentage = this.calculateCompletion(project);
    
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = project;
      persistProjects(projects);
    }
    
    return step;
  }
  
  static updateStep(projectId: string, stepId: string, updates: UpdateModStepInput): ModStep | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const stepIndex = project.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;
    
    const step = project.steps[stepIndex];
    project.steps[stepIndex] = {
      ...step,
      ...updates,
    };
    
    // Mark completion time if just completed
    if (updates.status === 'completed' && !step.completedAt) {
      project.steps[stepIndex].completedAt = Date.now();
    }
    
    project.updatedAt = Date.now();
    project.completionPercentage = this.calculateCompletion(project);
    
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = project;
      persistProjects(projects);
    }
    
    return project.steps[stepIndex];
  }
  
  static deleteStep(projectId: string, stepId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;
    
    const filtered = project.steps.filter(s => s.id !== stepId);
    if (filtered.length === project.steps.length) return false;
    
    project.steps = filtered;
    project.updatedAt = Date.now();
    project.completionPercentage = this.calculateCompletion(project);
    
    const projects = this.getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = project;
      persistProjects(projects);
    }
    
    return true;
  }
  
  static getProjectListItems(): ModProjectListItem[] {
    return this.getAllProjects().map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      version: p.version,
      completionPercentage: p.completionPercentage,
      updatedAt: p.updatedAt,
      stepCount: p.steps.length,
      completedStepCount: p.steps.filter(s => s.status === 'completed').length,
    }));
  }
  
  // --- CURRENT MOD ---
  
  static setCurrentMod(projectId: string): boolean {
    if (!this.getProject(projectId)) return false;
    localStorage.setItem(CURRENT_MOD_KEY, projectId);
    return true;
  }
  
  static getCurrentMod(): ModProject | null {
    const projectId = localStorage.getItem(CURRENT_MOD_KEY);
    if (!projectId) return null;
    return this.getProject(projectId);
  }
  
  static getCurrentModId(): string | null {
    return localStorage.getItem(CURRENT_MOD_KEY);
  }
  
  static clearCurrentMod(): void {
    localStorage.removeItem(CURRENT_MOD_KEY);
  }
  
  // --- UTILITY ---
  
  private static calculateCompletion(project: ModProject): number {
    if (project.steps.length === 0) return 0;
    const completed = project.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / project.steps.length) * 100);
  }
  
  static getProjectStats(projectId: string) {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    const completedSteps = project.steps.filter(s => s.status === 'completed');
    const totalEstimatedHours = project.steps.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
    const totalActualHours = project.steps.reduce((sum, s) => sum + (s.actualHours || 0), 0);
    
    return {
      totalSteps: project.steps.length,
      completedSteps: completedSteps.length,
      pendingSteps: project.steps.filter(s => s.status === 'pending').length,
      inProgressSteps: project.steps.filter(s => s.status === 'in-progress').length,
      blockedSteps: project.steps.filter(s => s.status === 'blocked').length,
      completionPercentage: project.completionPercentage,
      totalEstimatedHours,
      totalActualHours,
      averageHoursPerStep: project.steps.length > 0 ? (totalActualHours / completedSteps.length || 0).toFixed(1) : 0,
    };
  }
}
