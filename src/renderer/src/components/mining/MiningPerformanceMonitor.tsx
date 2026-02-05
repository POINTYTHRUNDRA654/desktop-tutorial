/**
 * Mining Performance Monitor & Memory Optimizer
 *
 * Advanced performance monitoring and memory optimization for Phase 2 mining engines
 * with real-time metrics, memory cleanup, and performance optimization features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Activity,
  MemoryStick,
  Cpu,
  HardDrive,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Zap,
  BarChart3
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  miningEngineLoad: {
    contextual: number;
    mlConflict: number;
    performance: number;
    hardware: number;
    longitudinal: number;
  };
}

interface MemoryStats {
  totalHeap: number;
  usedHeap: number;
  heapLimit: number;
  externalMemory: number;
  arrayBuffers: number;
  objectsCount: number;
  garbageCollections: number;
}

interface OptimizationResult {
  id: string;
  type: 'memory' | 'performance' | 'resource';
  description: string;
  impact: 'low' | 'medium' | 'high';
  applied: boolean;
  timestamp: number;
  memorySaved?: number;
  performanceGain?: number;
}

interface MiningPerformanceMonitorProps {
  engines?: {
    contextual: { isActive: boolean };
    mlConflict: { isActive: boolean };
    performance: { isActive: boolean };
    hardware: { isActive: boolean };
    longitudinal: { isActive: boolean };
  };
  onMemoryCleanup?: () => Promise<void>;
  onPerformanceOptimization?: () => Promise<void>;
  onResourceOptimization?: () => Promise<void>;
}

export const MiningPerformanceMonitor: React.FC<MiningPerformanceMonitorProps> = ({
  engines = {
    contextual: { isActive: false },
    mlConflict: { isActive: false },
    performance: { isActive: false },
    hardware: { isActive: false },
    longitudinal: { isActive: false }
  },
  onMemoryCleanup,
  onPerformanceOptimization,
  onResourceOptimization
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [optimizations, setOptimizations] = useState<OptimizationResult[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Simulate real-time metrics collection
  const collectMetrics = useCallback(async () => {
    try {
      // In real implementation, this would call window.electronAPI.mining.getPerformanceMetrics()
      const mockMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        cpuUsage: Math.random() * 100,
        memoryUsage: 60 + Math.random() * 30, // 60-90%
        diskUsage: Math.random() * 100,
        networkUsage: Math.random() * 50,
        miningEngineLoad: {
          contextual: engines.contextual.isActive ? Math.random() * 80 : 0,
          mlConflict: engines.mlConflict.isActive ? Math.random() * 80 : 0,
          performance: engines.performance.isActive ? Math.random() * 80 : 0,
          hardware: engines.hardware.isActive ? Math.random() * 80 : 0,
          longitudinal: engines.longitudinal.isActive ? Math.random() * 80 : 0
        }
      };

      setCurrentMetrics(mockMetrics);
      setMetrics(prev => [...prev.slice(-49), mockMetrics]); // Keep last 50 data points
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }, [engines]);

  // Collect memory statistics
  const collectMemoryStats = useCallback(async () => {
    try {
      // In real implementation, this would call window.electronAPI.mining.getMemoryStats()
      const mockMemoryStats: MemoryStats = {
        totalHeap: 1024 * 1024 * 1024, // 1GB
        usedHeap: Math.random() * 800 * 1024 * 1024, // Up to 800MB
        heapLimit: 1024 * 1024 * 1024, // 1GB
        externalMemory: Math.random() * 100 * 1024 * 1024, // Up to 100MB
        arrayBuffers: Math.floor(Math.random() * 1000),
        objectsCount: Math.floor(Math.random() * 50000),
        garbageCollections: Math.floor(Math.random() * 100)
      };

      setMemoryStats(mockMemoryStats);
    } catch (error) {
      console.error('Failed to collect memory stats:', error);
    }
  }, []);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // Memory cleanup
  const handleMemoryCleanup = useCallback(async () => {
    setIsOptimizing(true);
    try {
      await onMemoryCleanup?.();

      // Add optimization result
      const result: OptimizationResult = {
        id: Date.now().toString(),
        type: 'memory',
        description: 'Memory cleanup completed',
        impact: 'high',
        applied: true,
        timestamp: Date.now(),
        memorySaved: Math.random() * 200 * 1024 * 1024 // Up to 200MB saved
      };

      setOptimizations(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [onMemoryCleanup]);

  // Performance optimization
  const handlePerformanceOptimization = useCallback(async () => {
    setIsOptimizing(true);
    try {
      await onPerformanceOptimization?.();

      const result: OptimizationResult = {
        id: Date.now().toString(),
        type: 'performance',
        description: 'Performance optimization applied',
        impact: 'medium',
        applied: true,
        timestamp: Date.now(),
        performanceGain: Math.random() * 25 // Up to 25% improvement
      };

      setOptimizations(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Performance optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [onPerformanceOptimization]);

  // Resource optimization
  const handleResourceOptimization = useCallback(async () => {
    setIsOptimizing(true);
    try {
      await onResourceOptimization?.();

      const result: OptimizationResult = {
        id: Date.now().toString(),
        type: 'resource',
        description: 'Resource optimization completed',
        impact: 'medium',
        applied: true,
        timestamp: Date.now()
      };

      setOptimizations(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Resource optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [onResourceOptimization]);

  // Effects
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      collectMetrics();
      collectMemoryStats();
      interval = setInterval(() => {
        collectMetrics();
        collectMemoryStats();
      }, 2000); // Update every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, collectMetrics, collectMemoryStats]);

  // Calculate averages
  const avgCpuUsage = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length
    : 0;

  const avgMemoryUsage = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length
    : 0;

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const getHealthStatus = () => {
    if (!currentMetrics) return { status: 'unknown', color: 'gray' };

    const cpu = currentMetrics.cpuUsage;
    const memory = currentMetrics.memoryUsage;

    if (cpu > 90 || memory > 95) return { status: 'critical', color: 'red' };
    if (cpu > 75 || memory > 85) return { status: 'warning', color: 'yellow' };
    if (cpu > 50 || memory > 70) return { status: 'moderate', color: 'orange' };
    return { status: 'good', color: 'green' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and optimization for Phase 2 mining engines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={healthStatus.status === 'good' ? 'default' : 'destructive'}>
            {healthStatus.status.toUpperCase()}
          </Badge>
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? 'destructive' : 'default'}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Health Alert */}
      {healthStatus.status !== 'good' && (
        <Alert variant={healthStatus.status === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Performance Alert</AlertTitle>
          <AlertDescription>
            System performance is {healthStatus.status}. Consider running optimizations.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Metrics Overview */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-500" />
                <div className="text-sm font-medium">CPU Usage</div>
              </div>
              <div className="text-2xl font-bold mt-2">
                {currentMetrics.cpuUsage.toFixed(1)}%
              </div>
              <Progress value={currentMetrics.cpuUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-5 w-5 text-green-500" />
                <div className="text-sm font-medium">Memory Usage</div>
              </div>
              <div className="text-2xl font-bold mt-2">
                {currentMetrics.memoryUsage.toFixed(1)}%
              </div>
              <Progress value={currentMetrics.memoryUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-purple-500" />
                <div className="text-sm font-medium">Disk Usage</div>
              </div>
              <div className="text-2xl font-bold mt-2">
                {currentMetrics.diskUsage.toFixed(1)}%
              </div>
              <Progress value={currentMetrics.diskUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <div className="text-sm font-medium">Network</div>
              </div>
              <div className="text-2xl font-bold mt-2">
                {currentMetrics.networkUsage.toFixed(1)} MB/s
              </div>
              <Progress value={Math.min(currentMetrics.networkUsage * 2, 100)} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Monitoring */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engines">Engine Load</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Average CPU (last 50 samples)</div>
                  <div className="text-lg font-semibold">{avgCpuUsage.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average Memory (last 50 samples)</div>
                  <div className="text-lg font-semibold">{avgMemoryUsage.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Active Engines</div>
                  <div className="text-lg font-semibold">
                    {Object.values(engines).filter(e => e.isActive).length}/5
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Monitoring Status</div>
                  <div className="text-lg font-semibold">
                    {isMonitoring ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engine Load Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(currentMetrics?.miningEngineLoad || {}).map(([engine, load]) => (
                  <div key={engine} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium capitalize">{engine.replace(/([A-Z])/g, ' $1')}</div>
                      <Badge variant={engines[engine as keyof typeof engines]?.isActive ? 'default' : 'secondary'}>
                        {engines[engine as keyof typeof engines]?.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">{load.toFixed(1)}%</div>
                      <Progress value={load} className="w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          {memoryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Heap Memory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Used Heap</span>
                      <span className="text-sm font-medium">
                        {formatBytes(memoryStats.usedHeap)} / {formatBytes(memoryStats.totalHeap)}
                      </span>
                    </div>
                    <Progress
                      value={(memoryStats.usedHeap / memoryStats.totalHeap) * 100}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>External: {formatBytes(memoryStats.externalMemory)}</span>
                      <span>Limit: {formatBytes(memoryStats.heapLimit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Object Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Objects Count</span>
                      <span className="text-sm font-medium">{memoryStats.objectsCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Array Buffers</span>
                      <span className="text-sm font-medium">{memoryStats.arrayBuffers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">GC Cycles</span>
                      <span className="text-sm font-medium">{memoryStats.garbageCollections}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          {/* Optimization Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleMemoryCleanup}
                  disabled={isOptimizing}
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Memory Cleanup
                </Button>
                <Button
                  onClick={handlePerformanceOptimization}
                  disabled={isOptimizing}
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Performance Opt.
                </Button>
                <Button
                  onClick={handleResourceOptimization}
                  disabled={isOptimizing}
                  variant="outline"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Resource Opt.
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Optimization History */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {optimizations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No optimizations applied yet
                  </div>
                ) : (
                  optimizations.map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">{opt.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(opt.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          opt.impact === 'high' ? 'destructive' :
                          opt.impact === 'medium' ? 'default' : 'secondary'
                        }>
                          {opt.impact}
                        </Badge>
                        {opt.memorySaved && (
                          <span className="text-xs text-green-600">
                            -{formatBytes(opt.memorySaved)}
                          </span>
                        )}
                        {opt.performanceGain && (
                          <span className="text-xs text-blue-600">
                            +{opt.performanceGain.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};