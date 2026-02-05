/**
 * Longitudinal Mining Engine Component
 *
 * UI component for the Longitudinal Mining Engine
 * that analyzes performance trends over time
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface LongitudinalMiningEngineProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
  status?: {
    isRunning: boolean;
    dataPointsCollected: number;
    trendsAnalyzed: number;
    predictionsMade: number;
    lastAnalysis: Date;
    monitoringDuration: number; // hours
  };
  results?: {
    performanceTrends: Array<{
      metric: string;
      trend: 'improving' | 'stable' | 'degrading';
      changePercent: number;
      timeRange: string;
      confidence: number;
    }>;
    degradationAnalysis: Array<{
      component: string;
      degradationRate: number; // % per day
      estimatedLifespan: number; // days
      rootCause: string;
      mitigationSteps: string[];
    }>;
    futurePredictions: Array<{
      timeFrame: string;
      predictedFPS: number;
      confidence: number;
      riskFactors: string[];
    }>;
    modImpactAnalysis: Array<{
      modName: string;
      performanceImpact: {
        immediate: number;
        longTerm: number;
        stability: number;
      };
      usagePatterns: {
        frequency: number;
        duration: number;
        peakUsage: number;
      };
    }>;
  };
}

export const LongitudinalMiningEngine: React.FC<LongitudinalMiningEngineProps> = ({
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-50';
      case 'degrading': return 'text-red-600 bg-red-50';
      case 'stable': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          Longitudinal Analysis
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
            <div className="text-2xl font-bold text-indigo-600">
              {status?.dataPointsCollected || 0}
            </div>
            <div className="text-sm text-muted-foreground">Data Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status?.trendsAnalyzed || 0}
            </div>
            <div className="text-sm text-muted-foreground">Trends</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {status?.predictionsMade || 0}
            </div>
            <div className="text-sm text-muted-foreground">Predictions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatDuration(status?.monitoringDuration || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Monitoring</div>
          </div>
        </div>

        {/* Performance Trends */}
        {results?.performanceTrends && results.performanceTrends.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Performance Trends
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.performanceTrends.slice(0, 3).map((trend, index) => (
                <div key={index} className={`flex items-center gap-2 p-2 border rounded-md ${getTrendColor(trend.trend)}`}>
                  {getTrendIcon(trend.trend)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{trend.metric}</div>
                    <div className="text-xs text-muted-foreground">
                      {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}% over {trend.timeRange}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(trend.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Degradation Analysis */}
        {results?.degradationAnalysis && results.degradationAnalysis.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Component Degradation Analysis</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {results.degradationAnalysis.slice(0, 2).map((analysis, index) => (
                    <div key={index}>
                      <span className="font-medium">{analysis.component}:</span> {analysis.degradationRate.toFixed(2)}% per day
                      {analysis.estimatedLifespan > 0 && (
                        <span className="text-orange-600"> • {Math.round(analysis.estimatedLifespan)} days remaining</span>
                      )}
                    </div>
                  ))}
                  {results.degradationAnalysis.length > 2 && (
                    <div className="text-xs">+{results.degradationAnalysis.length - 2} more components</div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Future Predictions */}
        {results?.futurePredictions && results.futurePredictions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Future Predictions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.futurePredictions.slice(0, 2).map((prediction, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <div className="text-sm font-medium">{prediction.timeFrame}</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    {prediction.predictedFPS} FPS
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Confidence: {Math.round(prediction.confidence * 100)}%
                  </div>
                  {prediction.riskFactors.length > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      Risks: {prediction.riskFactors.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mod Impact Analysis */}
        {results?.modImpactAnalysis && results.modImpactAnalysis.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Mod Impact Analysis
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {results.modImpactAnalysis.slice(0, 2).map((mod, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{mod.modName}</div>
                    <div className="text-xs text-muted-foreground">
                      Performance: {mod.performanceImpact.immediate > 0 ? '+' : ''}{mod.performanceImpact.immediate} FPS immediate
                      {mod.performanceImpact.longTerm !== 0 && `, ${mod.performanceImpact.longTerm > 0 ? '+' : ''}${mod.performanceImpact.longTerm} FPS long-term`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Usage: {mod.usagePatterns.frequency}x frequency, {mod.usagePatterns.duration}h duration
                    </div>
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
            <TrendingUp className="h-4 w-4 mr-2" />
            View Trends
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