/**
 * Refined Performance Profiler Type Definitions (V2)
 * Enhanced specifications for detailed performance profiling
 */

export type ProfilingTargetV2 = 
  | { type: 'game'; processId: number }
  | { type: 'file'; logPath: string }
  | { type: 'mod'; modPath: string };

export interface ProfileSessionV2 {
  id: string;
  target: ProfilingTargetV2;
  startTime: number;
  status: 'running' | 'stopped' | 'paused';
}

export interface PerformanceSampleV2 {
  timestamp: number;
  fps: number;
  frameTime: number;
  cpuUsage: number;
  gpuUsage: number;
  memoryUsed: number;
}

export interface ProfileEventV2 {
  timestamp: number;
  type: 'lag-spike' | 'memory-peak' | 'crash' | 'load-screen' | 'marker';
  data: any;
}

export interface ProfileResultV2 {
  sessionId: string;
  duration: number;
  metrics: PerformanceMetricsV2;
  samples: PerformanceSampleV2[];
  events: ProfileEventV2[];
}

export interface PerformanceMetricsV2 {
  fps: {
    average: number;
    min: number;
    max: number;
    percentile95: number;
    frameTimeMs: number[];
  };
  memory: {
    totalUsed: number;
    textureMemory: number;
    meshMemory: number;
    scriptMemory: number;
    peak: number;
  };
  cpu: {
    totalUsage: number;
    mainThread: number;
    renderThread: number;
    scriptThread: number;
  };
  gpu: {
    usage: number;
    memoryUsed: number;
    drawCalls: number;
    triangles: number;
    shaders: number;
  };
  scripts: {
    stackDumps: number;
    suspendedStacks: number;
    eventsPerSecond: number;
    lagSpikes: LagSpikeV2[];
  };
}

export interface LagSpikeV2 {
  timestamp: number;
  duration: number;
  scriptName: string;
  functionName: string;
  stackTrace: string[];
}

export interface PerformanceAnalysisV2 {
  overallScore: number; // 0-100
  bottlenecks: BottleneckV2[];
  optimizations: OptimizationV2[];
  metrics: PerformanceMetricsV2;
  recommendations: string[];
}

export interface BottleneckV2 {
  type: 'mesh' | 'texture' | 'script' | 'draw-call' | 'memory';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  file?: string;
  impact: number;
  details: any;
}

export interface OptimizationV2 {
  id: string;
  title: string;
  description: string;
  estimatedGain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: string[];
  autoApplicable: boolean;
}

export interface MeshComplexityV2 {
  vertexCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  boneCount: number;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  recommendations: string[];
}

export interface TextureIssueV2 {
  path: string;
  currentSize: number;
  recommendedSize: number;
  potentialSaving: number;
}

export interface MemoryAnalysisV2 {
  totalSize: number;
  byFormat: Record<string, number>;
  byResolution: Record<string, number>;
  redundantTextures: string[];
  oversizedTextures: TextureIssueV2[];
}

export interface ScriptMetricsV2 {
  name: string;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
}

export interface ScriptPerformanceV2 {
  scripts: ScriptMetricsV2[];
  totalExecutionTime: number;
  averageFrameTime: number;
  lagSpikes: LagSpikeV2[];
  recommendations: string[];
}

export interface ChartDataV2 {
  type: 'line' | 'area' | 'bar' | 'pie';
  title: string;
  data: any[];
}

export interface PerformanceReportV2 {
  summary: string;
  score: number;
  charts: ChartDataV2[];
  bottlenecks: BottleneckV2[];
  optimizations: OptimizationV2[];
  exportedAt: number;
}
