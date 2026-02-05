/**
 * Phase 2 Mining Dashboard Component
 *
 * Main dashboard component that integrates all Phase 2 mining engines
 * with real-time status displays and comprehensive mining controls
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Brain,
  Cpu,
  HardDrive,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Play,
  Pause
} from 'lucide-react';

// Lazy load individual engine components for better performance
const ContextualMiningEngine = React.lazy(() => import('./ContextualMiningEngine').then(module => ({ default: module.ContextualMiningEngine })));
const MLConflictPredictionEngine = React.lazy(() => import('./MLConflictPredictionEngine').then(module => ({ default: module.MLConflictPredictionEngine })));
const PerformanceBottleneckEngine = React.lazy(() => import('./PerformanceBottleneckEngine').then(module => ({ default: module.PerformanceBottleneckEngine })));
const HardwareAwareMiningEngine = React.lazy(() => import('./HardwareAwareMiningEngine').then(module => ({ default: module.HardwareAwareMiningEngine })));
const LongitudinalMiningEngine = React.lazy(() => import('./LongitudinalMiningEngine').then(module => ({ default: module.LongitudinalMiningEngine })));

interface Phase2MiningDashboardProps {
  // Engine status and control
  engines?: {
    contextual: {
      isActive: boolean;
      status?: any;
      results?: any;
    };
    mlConflict: {
      isActive: boolean;
      status?: any;
      results?: any;
    };
    performance: {
      isActive: boolean;
      status?: any;
      results?: any;
    };
    hardware: {
      isActive: boolean;
      status?: any;
      results?: any;
    };
    longitudinal: {
      isActive: boolean;
      status?: any;
      results?: any;
    };
  };
  onEngineToggle?: (engine: string, active: boolean) => void;
  onEngineConfigure?: (engine: string) => void;
  onStartAll?: () => void;
  onStopAll?: () => void;
  onRefreshAll?: () => void;
}

export const Phase2MiningDashboard: React.FC<Phase2MiningDashboardProps> = ({
  engines = {
    contextual: { isActive: false },
    mlConflict: { isActive: false },
    performance: { isActive: false },
    hardware: { isActive: false },
    longitudinal: { isActive: false }
  },
  onEngineToggle,
  onEngineConfigure,
  onStartAll,
  onStopAll,
  onRefreshAll
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const activeEnginesCount = Object.values(engines).filter(engine => engine.isActive).length;
  const totalEngines = Object.keys(engines).length;

  const handleStartAll = async () => {
    setIsLoading(true);
    try {
      await onStartAll?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAll = async () => {
    setIsLoading(true);
    try {
      await onStopAll?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setIsLoading(true);
    try {
      await onRefreshAll?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phase 2 Mining Engines</h1>
          <p className="text-muted-foreground">
            Advanced AI-powered mining with ML conflict prediction, performance analysis, and hardware optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {activeEnginesCount}/{totalEngines} Active
          </Badge>
        </div>
      </div>

      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Engine Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartAll}
              disabled={isLoading || activeEnginesCount === totalEngines}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Start All Engines
            </Button>
            <Button
              onClick={handleStopAll}
              disabled={isLoading || activeEnginesCount === 0}
              variant="destructive"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop All Engines
            </Button>
            <Button
              onClick={handleRefreshAll}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Engine Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <div className="text-sm font-medium">Contextual Mining</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {engines.contextual.status?.interactionsProcessed || 0}
            </div>
            <div className="text-xs text-muted-foreground">Interactions processed</div>
            <Badge variant={engines.contextual.isActive ? "default" : "secondary"} className="mt-2">
              {engines.contextual.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-purple-500" />
              <div className="text-sm font-medium">ML Conflict Prediction</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {Math.round((engines.mlConflict.status?.modelAccuracy || 0) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Model accuracy</div>
            <Badge variant={engines.mlConflict.isActive ? "default" : "secondary"} className="mt-2">
              {engines.mlConflict.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-orange-500" />
              <div className="text-sm font-medium">Performance Analysis</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {engines.performance.status?.systemHealthScore || 0}%
            </div>
            <div className="text-xs text-muted-foreground">System health</div>
            <Badge variant={engines.performance.isActive ? "default" : "secondary"} className="mt-2">
              {engines.performance.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-500" />
              <div className="text-sm font-medium">Hardware-Aware</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {engines.hardware.status?.compatibilityScore || 0}%
            </div>
            <div className="text-xs text-muted-foreground">Compatibility</div>
            <Badge variant={engines.hardware.isActive ? "default" : "secondary"} className="mt-2">
              {engines.hardware.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <div className="text-sm font-medium">Longitudinal Analysis</div>
            </div>
            <div className="text-2xl font-bold mt-2">
              {engines.longitudinal.status?.dataPointsCollected || 0}
            </div>
            <div className="text-xs text-muted-foreground">Data points</div>
            <Badge variant={engines.longitudinal.isActive ? "default" : "secondary"} className="mt-2">
              {engines.longitudinal.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Engine Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contextual">Contextual</TabsTrigger>
          <TabsTrigger value="ml-conflict">ML Conflict</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="longitudinal">Longitudinal</TabsTrigger>
        </TabsList>

        <TabsContent value="contextual" className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <ContextualMiningEngine
              isActive={engines.contextual.isActive}
              onToggle={(active) => onEngineToggle?.('contextual', active)}
              onConfigure={() => onEngineConfigure?.('contextual')}
              status={engines.contextual.status}
              results={engines.contextual.results}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="ml-conflict" className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>}>
            <MLConflictPredictionEngine
              isActive={engines.mlConflict.isActive}
              onToggle={(active) => onEngineToggle?.('mlConflict', active)}
              onConfigure={() => onEngineConfigure?.('mlConflict')}
              status={engines.mlConflict.status}
              results={engines.mlConflict.results}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>}>
            <PerformanceBottleneckEngine
              isActive={engines.performance.isActive}
              onToggle={(active) => onEngineToggle?.('performance', active)}
              onConfigure={() => onEngineConfigure?.('performance')}
              status={engines.performance.status}
              results={engines.performance.results}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="hardware" className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div></div>}>
            <HardwareAwareMiningEngine
              isActive={engines.hardware.isActive}
              onToggle={(active) => onEngineToggle?.('hardware', active)}
              onConfigure={() => onEngineConfigure?.('hardware')}
              status={engines.hardware.status}
              results={engines.hardware.results}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="longitudinal" className="space-y-4">
          <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
            <LongitudinalMiningEngine
              isActive={engines.longitudinal.isActive}
              onToggle={(active) => onEngineToggle?.('longitudinal', active)}
              onConfigure={() => onEngineConfigure?.('longitudinal')}
              status={engines.longitudinal.status}
              results={engines.longitudinal.results}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* System Status Alert */}
      {activeEnginesCount > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Phase 2 Mining Active</AlertTitle>
          <AlertDescription>
            {activeEnginesCount} of {totalEngines} mining engines are currently running.
            Real-time analysis and optimization recommendations are being generated.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};