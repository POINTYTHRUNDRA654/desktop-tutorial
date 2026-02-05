/**
 * Performance Bottleneck Detection Engine Component
 *
 * UI component for the Performance Bottleneck Detection Engine
 * that identifies and analyzes system performance bottlenecks
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Cpu,
  HardDrive,
  Zap,
  TrendingDown,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface PerformanceBottleneckEngineProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
  status?: {
    isRunning: boolean;
    bottlenecksDetected: number;
    optimizationsSuggested: number;
    systemHealthScore: number;
    lastAnalysis: Date;
    monitoringActive: boolean;
  };
  results?: {
    primaryBottlenecks: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      impact: {
        fps: number;
        memory: number;
        loadTime: number;
      };
      rootCause: string;
      affectedMods: string[];
    }>;
    systemLimitations: Array<{
      component: string;
      currentCapacity: number;
      recommendedMinimum: number;
      isLimiting: boolean;
      upgradeSuggestions: string[];
    }>;
    optimizationOpportunities: Array<{
      type: string;
      description: string;
      potentialGain: {
        fps: number;
        memory: number;
        loadTime: number;
      };
      difficulty: 'easy' | 'medium' | 'hard';
      affectedMods: string[];
    }>;
  };
}

export const PerformanceBottleneckEngine: React.FC<PerformanceBottleneckEngineProps> = ({
  isActive = false,
  onToggle,
  onConfigure,
  status,
  results
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle?.(!isActive);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Cpu className="h-5 w-5 text-orange-500" />
          Performance Analysis
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getHealthColor(status?.systemHealthScore || 0)}`}>
              {status?.systemHealthScore || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Health Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {status?.bottlenecksDetected || 0}
            </div>
            <div className="text-sm text-muted-foreground">Bottlenecks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status?.optimizationsSuggested || 0}
            </div>
            <div className="text-sm text-muted-foreground">Optimizations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status?.monitoringActive ? "Yes" : "No"}
            </div>
            <div className="text-sm text-muted-foreground">Monitoring</div>
          </div>
        </div>

        {/* System Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              System Health
            </span>
            <span className={getHealthColor(status?.systemHealthScore || 0)}>
              {status?.systemHealthScore || 0}%
            </span>
          </div>
          <Progress value={status?.systemHealthScore || 0} className="h-2" />
        </div>

        {/* Primary Bottlenecks */}
        {results?.primaryBottlenecks && results.primaryBottlenecks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Primary Bottlenecks
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.primaryBottlenecks.slice(0, 3).map((bottleneck, index) => (
                <div key={index} className={`flex items-start gap-2 p-3 border rounded-md ${getSeverityColor(bottleneck.severity)}`}>
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{bottleneck.rootCause}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Impact: {bottleneck.impact.fps > 0 ? `+${bottleneck.impact.fps}` : bottleneck.impact.fps} FPS
                      {bottleneck.impact.memory !== 0 && `, ${bottleneck.impact.memory > 0 ? '+' : ''}${bottleneck.impact.memory}MB RAM`}
                    </div>
                    {bottleneck.affectedMods.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Affects: {bottleneck.affectedMods.slice(0, 2).join(', ')}
                        {bottleneck.affectedMods.length > 2 && ` +${bottleneck.affectedMods.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {bottleneck.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Limitations */}
        {results?.systemLimitations && results.systemLimitations.length > 0 && (
          <Alert>
            <HardDrive className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">System Limitations Detected</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {results.systemLimitations.slice(0, 2).map((limitation, index) => (
                    <div key={index}>
                      {limitation.component.toUpperCase()}: {limitation.currentCapacity}
                      {limitation.component === 'ram' ? 'GB' : ' cores'} (min: {limitation.recommendedMinimum})
                    </div>
                  ))}
                  {results.systemLimitations.length > 2 && (
                    <div className="text-xs">+{results.systemLimitations.length - 2} more limitations</div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Optimization Opportunities */}
        {results?.optimizationOpportunities && results.optimizationOpportunities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Optimization Opportunities
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {results.optimizationOpportunities.slice(0, 2).map((opp, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded-md">
                  <Zap className="h-4 w-4 mt-0.5 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{opp.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Potential: {opp.potentialGain.fps > 0 ? `+${opp.potentialGain.fps}` : opp.potentialGain.fps} FPS
                      {opp.potentialGain.memory !== 0 && `, ${opp.potentialGain.memory > 0 ? '+' : ''}${opp.potentialGain.memory}MB RAM`}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {opp.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={isActive ? "destructive" : "default"}
            className="flex-1"
          >
            {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {isActive ? "Stop Engine" : "Start Engine"}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <TrendingDown className="h-4 w-4 mr-2" />
            View Report
          </Button>
        </div>

        {/* Last Analysis */}
        {status?.lastAnalysis && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last analyzed: {status.lastAnalysis.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};