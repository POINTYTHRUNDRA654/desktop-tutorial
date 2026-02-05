/**
 * ML Conflict Prediction Engine Component
 *
 * UI component for the ML-based conflict prediction engine
 * that detects and predicts mod conflicts using machine learning
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Shield,
  RefreshCw,
  Settings,
  Zap,
  Target
} from 'lucide-react';

// Mock function for real-time status fetching
const fetchMiningEngineStatus = async (engine: string) => {
  // In a real implementation, this would call the backend API
  return {
    isRunning: true,
    modelAccuracy: Math.random() * 0.3 + 0.7, // 70-100%
    predictionsMade: Math.floor(Math.random() * 1000),
    conflictsDetected: Math.floor(Math.random() * 100),
    lastTraining: new Date(),
    trainingProgress: Math.random()
  };
};

interface MLConflictPredictionEngineProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
  status?: {
    isRunning: boolean;
    modelAccuracy: number;
    predictionsMade: number;
    conflictsDetected: number;
    lastTraining: Date;
    trainingProgress: number;
  };
  results?: {
    insights: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      confidence: number;
    }>;
    recommendations: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      expectedImpact: string;
      affectedMods: string[];
    }>;
    modelMetrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
}

export const MLConflictPredictionEngine: React.FC<MLConflictPredictionEngineProps> = ({
  isActive = false,
  onToggle,
  onConfigure,
  status,
  results
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState(status);
  const [showConfig, setShowConfig] = useState(false);

  // Real-time status updates
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      try {
        const updatedStatus = await fetchMiningEngineStatus('ml-conflict');
        if (updatedStatus) {
          setRealTimeStatus(updatedStatus);
        }
      } catch (error) {
        console.warn('Failed to fetch real-time status:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive]);

  const currentStatus = realTimeStatus || status;

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
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          ML Conflict Prediction
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
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((currentStatus?.modelAccuracy || 0) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {currentStatus?.conflictsDetected || 0}
            </div>
            <div className="text-sm text-muted-foreground">Conflicts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currentStatus?.predictionsMade || 0}
            </div>
            <div className="text-sm text-muted-foreground">Predictions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {results?.modelMetrics?.f1Score ? Math.round(results.modelMetrics.f1Score * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">F1 Score</div>
          </div>
        </div>

        {/* Training Progress */}
        {currentStatus?.trainingProgress !== undefined && currentStatus.trainingProgress < 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Training Progress
              </span>
              <span>{Math.round((currentStatus.trainingProgress || 0) * 100)}%</span>
            </div>
            <Progress value={(currentStatus.trainingProgress || 0) * 100} className="h-2" />
          </div>
        )}

        {/* Model Metrics */}
        {results?.modelMetrics && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Model Performance</div>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                  <span>Precision: {Math.round(results.modelMetrics.precision * 100)}%</span>
                  <span>Recall: {Math.round(results.modelMetrics.recall * 100)}%</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Insights */}
        {results?.insights && results.insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Recent Insights
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results.insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(insight.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{insight.description}</div>
                    <div className="text-xs text-muted-foreground">{insight.type}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(insight.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {results?.recommendations && results.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Recommendations
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {results.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 p-2 border rounded-md">
                  <Target className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{rec.action}</div>
                    <div className="text-xs text-muted-foreground">{rec.expectedImpact}</div>
                    {rec.affectedMods.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Affects: {rec.affectedMods.slice(0, 2).join(', ')}
                        {rec.affectedMods.length > 2 && ` +${rec.affectedMods.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <Badge variant={rec.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                    {rec.priority}
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
          <Button variant="outline" onClick={() => setShowConfig(!showConfig)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ML Engine Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model Type</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="neural-network">Neural Network</option>
                  <option value="random-forest">Random Forest</option>
                  <option value="svm">SVM</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Training Frequency</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confidence Threshold</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  defaultValue="0.7"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Predictions</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  defaultValue="100"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowConfig(false)}>
                Save Settings
              </Button>
            </div>
          </div>
        )}

        {/* Last Training */}
        {currentStatus?.lastTraining && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last trained: {currentStatus.lastTraining.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};