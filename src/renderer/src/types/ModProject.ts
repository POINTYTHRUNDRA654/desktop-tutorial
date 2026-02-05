/**
 * Mod Project Management Types
 * Defines data structures for creating and tracking mod projects
 */

export type ModType = 'weapon' | 'armor' | 'quest' | 'settlement' | 'gameplay' | 'texture' | 'mesh' | 'script' | 'other';
export type ModStatus = 'planning' | 'in-progress' | 'testing' | 'released' | 'abandoned';
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface ModStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  priority: 'low' | 'medium' | 'high';
  notes: string;
  toolsUsed: string[]; // Tool IDs like 'xedit', 'blender', 'nifskope'
  createdAt: number;
  completedAt?: number;
  estimatedHours?: number;
  actualHours?: number;
}

export interface ModProject {
  id: string;
  name: string;
  description: string;
  type: ModType;
  status: ModStatus;
  version: string;
  author: string;
  
  // Tracking
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  
  // Project details
  requirements: string[]; // e.g., 'F4SE', 'HUD Framework', 'Base Fallout 4'
  dependencies: string[]; // Other mod names this depends on
  
  // Steps/Progress
  steps: ModStep[];
  completionPercentage: number; // 0-100
  
  // Tools and resources
  tags: string[];
  notes: string;
  resourcesLinks: Array<{ title: string; url: string }>;
  
  // Directory paths
  projectPath?: string; // Where the mod files are stored
  espName?: string; // Main ESP/ESM file name
  
  // AI Memory
  aiNotes?: string; // Notes from Mossy about the mod
  lastMossyInteraction?: number; // Timestamp of last Mossy update
}

export interface ModProjectListItem {
  id: string;
  name: string;
  type: ModType;
  status: ModStatus;
  version: string;
  completionPercentage: number;
  updatedAt: number;
  stepCount: number;
  completedStepCount: number;
}

export interface CreateModProjectInput {
  name: string;
  description?: string;
  type: ModType;
  author: string;
  requirements?: string[];
  dependencies?: string[];
  projectPath?: string;
  espName?: string;
}

export interface CreateModStepInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  toolsUsed?: string[];
}

export interface UpdateModProjectInput {
  name?: string;
  description?: string;
  status?: ModStatus;
  version?: string;
  notes?: string;
  tags?: string[];
  requirements?: string[];
  dependencies?: string[];
  aiNotes?: string;
}

export interface UpdateModStepInput {
  title?: string;
  description?: string;
  status?: StepStatus;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  toolsUsed?: string[];
  actualHours?: number;
}
