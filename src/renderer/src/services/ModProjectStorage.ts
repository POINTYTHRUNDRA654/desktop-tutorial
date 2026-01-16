/**
 * Mod Project Storage Service
 * Handles persistence of mod projects to localStorage and file system
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
    
    // Save to localStorage
    const projects = this.getAllProjects();
    projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    
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
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[index];
  }
  
  static deleteProject(projectId: string): boolean {
    const projects = this.getAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    
    if (filtered.length === projects.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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

export { ModProjectStorage };
