/**
 * Hardware-Aware Mining Engine Component
 *
 * UI component for the Hardware-Aware Mining Engine
 * that provides hardware-specific optimization recommendations
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
  Monitor,
  Zap,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface HardwareAwareMiningEngineProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
  status?: {
    isRunning: boolean;
    hardwareProfileDetected: boolean;
    recommendationsGenerated: number;
    compatibilityScore: number;
    lastScan: Date;
  };
  results?: {
    hardwareProfile: {
      cpu: {
        cores: number;
        speed: number;
        model: string;
      };
      gpu: Array<{
        model: string;
        vram: number;
        driver: string;
      }>;
      ram: {
        total: number;
        speed: number;
      };
      storage: Array<{
        type: string;
        size: number;
        speed: number;
      }>;
    };
    compatibilityAnalysis: {
      overallScore: number;
      componentScores: Record<string, number>;
      limitingFactors: string[];
    };
    optimizationRecommendations: Array<{
      category: 'cpu' | 'gpu' | 'ram' | 'storage' | 'settings';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      difficulty: 'easy' | 'medium' | 'hard';
      expectedImprovement: {
        fps: number;
        loadTime: number;
        stability: number;
      };
    }>;
    performancePredictions: {
      currentEstimatedFPS: number;
      optimizedEstimatedFPS: number;
      bottleneckAnalysis: string;
    };
  };
}

export const HardwareAwareMiningEngine: React.FC<HardwareAwareMiningEngineProps> = ({
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

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Cpu className="h-5 w-5 text-green-500" />
          Hardware-Aware Mining
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
            <div className={`text-2xl font-bold ${getCompatibilityColor(status?.compatibilityScore || 0)}`}>
              {status?.compatibilityScore || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Compatibility</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status?.recommendationsGenerated || 0}
            </div>
            <div className="text-sm text-muted-foreground">Recommendations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {results?.performancePredictions?.currentEstimatedFPS || 0}
            </div>
            <div className="text-sm text-muted-foreground">Est. FPS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status?.hardwareProfileDetected ? "Yes" : "No"}
            </div>
            <div className="text-sm text-muted-foreground">Profile</div>
          </div>
        </div>

        {/* Hardware Profile */}
        {results?.hardwareProfile && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Hardware Profile</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Cpu className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">CPU</div>
                  <div className="text-xs text-muted-foreground">
                    {results.hardwareProfile.cpu.model} • {results.hardwareProfile.cpu.cores} cores
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Monitor className="h-4 w-4 text-green-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">GPU</div>
                  <div className="text-xs text-muted-foreground">
                    {results.hardwareProfile.gpu[0]?.model || 'Unknown'} • {results.hardwareProfile.gpu[0]?.vram || 0}GB VRAM
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">RAM</div>
                  <div className="text-xs text-muted-foreground">
                    {results.hardwareProfile.ram.total}GB • {results.hardwareProfile.ram.speed}MHz
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Storage</div>
                  <div className="text-xs text-muted-foreground">
                    {results.hardwareProfile.storage[0]?.size || 0}GB {results.hardwareProfile.storage[0]?.type || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compatibility Analysis */}
        {results?.compatibilityAnalysis && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Compatibility Analysis</div>
                <div className="text-sm text-muted-foreground">
                  Overall Score: <span className={getCompatibilityColor(results.compatibilityAnalysis.overallScore)}>
                    {results.compatibilityAnalysis.overallScore}%
                  </span>
                </div>
                {results.compatibilityAnalysis.limitingFactors.length > 0 && (
                  <div className="text-sm text-muted-foreground mt-2">
                    <div className="font-medium text-orange-600">Limiting Factors:</div>
                    <ul className="list-disc list-inside ml-2">
                      {results.compatibilityAnalysis.limitingFactors.slice(0, 2).map((factor, index) => (
                        <li key={index} className="text-xs">{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Predictions */}
        {results?.performancePredictions && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Performance Predictions
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-lg font-bold text-blue-600">
                  {results.performancePredictions.currentEstimatedFPS}
                </div>
                <div className="text-xs text-muted-foreground">Current FPS</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-md">
                <div className="text-lg font-bold text-green-600">
                  {results.performancePredictions.optimizedEstimatedFPS}
                </div>
                <div className="text-xs text-muted-foreground">Optimized FPS</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {results.performancePredictions.bottleneckAnalysis}
            </div>
          </div>
        )}

        {/* Optimization Recommendations */}
        {results?.optimizationRecommendations && results.optimizationRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Optimization Recommendations
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.optimizationRecommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded-md">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${getImpactColor(rec.impact)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{rec.title}</div>
                    <div className="text-xs text-muted-foreground">{rec.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Expected: +{rec.expectedImprovement.fps} FPS, {rec.expectedImprovement.stability * 100}% stability
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="text-xs">
                      {rec.impact} impact
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rec.difficulty}
                    </Badge>
                  </div>
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
            <Monitor className="h-4 w-4 mr-2" />
            Hardware Scan
          </Button>
        </div>

        {/* Last Scan */}
        {status?.lastScan && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last scanned: {status.lastScan.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};