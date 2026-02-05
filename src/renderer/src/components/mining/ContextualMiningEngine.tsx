/**
 * Contextual Mining Engine Component
 *
 * UI component for the Contextual Mining Engine that provides
 * user-centric mining with adaptive learning and personalized recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Brain,
  Users,
  TrendingUp,
  Target,
  RefreshCw,
  Settings,
  Eye,
  MessageSquare
} from 'lucide-react';

// Mock function for real-time status fetching
const fetchMiningEngineStatus = async (engine: string) => {
  // In a real implementation, this would call the backend API
  // For now, simulate real-time updates
  return {
    isRunning: true,
    interactionsProcessed: Math.floor(Math.random() * 1000),
    recommendationsGenerated: Math.floor(Math.random() * 500),
    learningProgress: Math.random(),
    lastUpdate: new Date()
  };
};

interface ContextualMiningEngineProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  onConfigure?: () => void;
  status?: {
    isRunning: boolean;
    interactionsProcessed: number;
    recommendationsGenerated: number;
    learningProgress: number;
    lastUpdate: Date;
  };
  results?: {
    userProfile: any;
    contextualRecommendations: any[];
    behaviorPatterns: any[];
    personalizationMetrics: any;
  };
}

export const ContextualMiningEngine: React.FC<ContextualMiningEngineProps> = ({
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
        // Poll for real-time status updates
        const updatedStatus = await fetchMiningEngineStatus('contextual');
        if (updatedStatus) {
          setRealTimeStatus(updatedStatus);
        }
      } catch (error) {
        console.warn('Failed to fetch real-time status:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  const currentStatus = realTimeStatus || status;

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle?.(!isActive);
    } catch (error) {
      console.error('Failed to toggle engine:', error);
      // Don't change state on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          Contextual Mining Engine
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
            <div className="text-2xl font-bold text-blue-600">
              {currentStatus?.interactionsProcessed || 0}
            </div>
            <div className="text-sm text-muted-foreground">Interactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {currentStatus?.recommendationsGenerated || 0}
            </div>
            <div className="text-sm text-muted-foreground">Recommendations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((currentStatus?.learningProgress || 0) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Learning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {results?.behaviorPatterns?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Patterns</div>
          </div>
        </div>

        {/* Learning Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Learning Progress
            </span>
            <span>{Math.round((currentStatus?.learningProgress || 0) * 100)}%</span>
          </div>
          <Progress value={(currentStatus?.learningProgress || 0) * 100} className="h-2" />
        </div>

        {/* User Profile Summary */}
        {results?.userProfile && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">User Profile Active</div>
                <div className="text-sm text-muted-foreground">
                  Preferences: {Object.keys(results.userProfile.preferences || {}).length} categories
                  • Patterns: {results.userProfile.behaviorPatterns?.length || 0}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Recommendations */}
        {results?.contextualRecommendations && results.contextualRecommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Recent Recommendations
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {results.contextualRecommendations.slice(0, 3).map((rec: any, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{rec.item}</div>
                    <div className="text-xs text-muted-foreground">{rec.reasoning?.[0]}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(rec.confidence * 100)}%
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
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Engine Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Learning Rate</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  defaultValue="0.5"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Recommendations</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="10"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Frequency</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="1000">1 second</option>
                  <option value="5000">5 seconds</option>
                  <option value="10000">10 seconds</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Privacy Level</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
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

        {/* Last Update */}
        {currentStatus?.lastUpdate && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last updated: {currentStatus.lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};