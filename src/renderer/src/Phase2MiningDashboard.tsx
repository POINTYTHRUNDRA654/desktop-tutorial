/**
 * Phase 2 Mining Dashboard Component
 *
 * Advanced UI for Phase 2 mining operations with ML-based conflict prediction,
 * performance bottleneck detection, hardware-aware recommendations,
 * longitudinal trend analysis, and contextual insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import {
  Brain,
  Cpu,
  HardDrive,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target
} from 'lucide-react';

interface Phase2MiningDashboardProps {
  miningResults?: {
    mlConflictPredictions?: any;
    performanceBottlenecks?: any;
    hardwareCompatibility?: any;
    longitudinalTrends?: any;
    contextualInsights?: any;
  };
  onEngineToggle?: (engine: string, enabled: boolean) => void;
  onActionExecute?: (action: string, params?: any) => void;
}

export const Phase2MiningDashboard: React.FC<Phase2MiningDashboardProps> = ({
  miningResults,
  onEngineToggle,
  onActionExecute
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Phase 2 Mining Operations
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced AI-powered modding assistance with predictive analytics
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Brain className="w-4 h-4 mr-1" />
          AI Enhanced
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="contextual">Contextual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Phase2Overview
            results={miningResults}
            onEngineToggle={onEngineToggle}
          />
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-6">
          <MLConflictPredictions
            predictions={miningResults?.mlConflictPredictions}
            onActionExecute={onActionExecute}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceBottlenecks
            bottlenecks={miningResults?.performanceBottlenecks}
            onActionExecute={onActionExecute}
          />
        </TabsContent>

        <TabsContent value="hardware" className="space-y-6">
          <HardwareCompatibility
            compatibility={miningResults?.hardwareCompatibility}
            onActionExecute={onActionExecute}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <LongitudinalTrends
            trends={miningResults?.longitudinalTrends}
            onActionExecute={onActionExecute}
          />
        </TabsContent>

        <TabsContent value="contextual" className="space-y-6">
          <ContextualInsights
            insights={miningResults?.contextualInsights}
            onActionExecute={onActionExecute}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Phase2Overview: React.FC<{
  results?: any;
  onEngineToggle?: (engine: string, enabled: boolean) => void;
}> = ({ results, onEngineToggle }) => {
  const engines = [
    {
      id: 'ml-conflict-prediction',
      name: 'ML Conflict Prediction',
      icon: Brain,
      description: 'AI-powered conflict detection and resolution',
      status: results?.mlConflictPredictions ? 'active' : 'inactive',
      metrics: results?.mlConflictPredictions?.metadata
    },
    {
      id: 'performance-bottleneck',
      name: 'Performance Analysis',
      icon: Cpu,
      description: 'Real-time bottleneck detection and optimization',
      status: results?.performanceBottlenecks ? 'active' : 'inactive',
      metrics: results?.performanceBottlenecks?.summary
    },
    {
      id: 'hardware-aware',
      name: 'Hardware Compatibility',
      icon: HardDrive,
      description: 'Tailored recommendations for your hardware',
      status: results?.hardwareCompatibility ? 'active' : 'inactive',
      metrics: results?.hardwareCompatibility?.summary
    },
    {
      id: 'longitudinal',
      name: 'Trend Analysis',
      icon: TrendingUp,
      description: 'Performance trends and degradation detection',
      status: results?.longitudinalTrends ? 'active' : 'inactive',
      metrics: results?.longitudinalTrends?.summary
    },
    {
      id: 'contextual',
      name: 'Contextual Learning',
      icon: Users,
      description: 'Personalized recommendations based on behavior',
      status: results?.contextualInsights ? 'active' : 'inactive',
      metrics: results?.contextualInsights?.summary
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      {engines.map((engine) => (
        <Card key={engine.id} className="relative h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <engine.icon className="w-6 h-6 text-blue-500" />
                <CardTitle className="text-lg">{engine.name}</CardTitle>
              </div>
              <Badge
                variant={engine.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {engine.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {engine.description}
            </p>

            {engine.metrics && (
              <div className="space-y-3">
                {engine.metrics.totalMeasurements && (
                  <div className="flex justify-between text-sm">
                    <span>Data Points:</span>
                    <span className="font-medium">{engine.metrics.totalMeasurements}</span>
                  </div>
                )}
                {engine.metrics.confidence && (
                  <div className="flex justify-between text-sm">
                    <span>Confidence:</span>
                    <span className="font-medium">{Math.round(engine.metrics.confidence * 100)}%</span>
                  </div>
                )}
                {engine.metrics.dataPoints && (
                  <div className="flex justify-between text-sm">
                    <span>Analysis Points:</span>
                    <span className="font-medium">{engine.metrics.dataPoints}</span>
                  </div>
                )}
              </div>
            )}

            {onEngineToggle && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => onEngineToggle(engine.id, engine.status === 'inactive')}
              >
                {engine.status === 'active' ? 'Disable' : 'Enable'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const MLConflictPredictions: React.FC<{
  predictions?: any;
  onActionExecute?: (action: string, params?: any) => void;
}> = ({ predictions, onActionExecute }) => {
  if (!predictions) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>ML Conflict Prediction engine not active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Brain className="w-6 h-6" />
            <span>ML Conflict Predictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {predictions.metadata?.totalPredictions || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Predictions</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {predictions.metadata?.criticalConflicts || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Critical Conflicts</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {predictions.metadata?.resolvedConflicts || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Auto-Resolved</div>
            </div>
          </div>

          {predictions.predictions?.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-medium text-lg">Recent Predictions</h3>
              {predictions.predictions.slice(0, 5).map((prediction: any, index: number) => (
                <div key={index} className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-lg">
                      {prediction.modA} ↔ {prediction.modB}
                    </span>
                    <Badge
                      variant={
                        prediction.severity === 'critical' ? 'destructive' :
                        prediction.severity === 'high' ? 'default' : 'secondary'
                      }
                      className="text-sm px-3 py-1"
                    >
                      {prediction.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Probability: {Math.round(prediction.probability * 100)}%
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {prediction.mitigationStrategies?.slice(0, 2).map((strategy: any, idx: number) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => onActionExecute?.('apply_strategy', {
                          prediction,
                          strategy
                        })}
                        className="px-4 py-2"
                      >
                        {strategy.type}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PerformanceBottlenecks: React.FC<{
  bottlenecks?: any;
  onActionExecute?: (action: string, params?: any) => void;
}> = ({ bottlenecks, onActionExecute }) => {
  if (!bottlenecks) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Performance Bottleneck engine not active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Zap className="w-6 h-6" />
              <span>Current Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average FPS</span>
                  <span className="font-medium">{bottlenecks.summary?.averageFPS?.toFixed(1) || 'N/A'}</span>
                </div>
                <Progress value={Math.min((bottlenecks.summary?.averageFPS || 0) / 60 * 100, 100)} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Memory Usage</span>
                  <span className="font-medium">{bottlenecks.summary?.averageMemory?.toFixed(1) || 'N/A'} MB</span>
                </div>
                <Progress value={Math.min((bottlenecks.summary?.averageMemory || 0) / 8192 * 100, 100)} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <span>Active Bottlenecks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.currentAnalysis?.primaryBottlenecks?.length > 0 ? (
              <div className="space-y-4">
                {bottlenecks.currentAnalysis.primaryBottlenecks.map((bottleneck: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium capitalize text-base">{bottleneck.type} Bottleneck</span>
                      <Badge variant={
                        bottleneck.severity === 'critical' ? 'destructive' :
                        bottleneck.severity === 'high' ? 'default' : 'secondary'
                      } className="px-3 py-1">
                        {bottleneck.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{bottleneck.rootCause}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onActionExecute?.('optimize_bottleneck', bottleneck)}
                      className="px-4 py-2"
                    >
                      Optimize
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active bottlenecks detected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {bottlenecks.optimizationOpportunities?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottlenecks.optimizationOpportunities.map((opportunity: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{opportunity.description}</h4>
                    <Badge variant="outline">{opportunity.difficulty}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">FPS Gain:</span>
                      <span className="font-medium text-green-600 ml-1">
                        +{opportunity.potentialGain.fps}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Memory:</span>
                      <span className="font-medium text-blue-600 ml-1">
                        {opportunity.potentialGain.memory > 0 ? '+' : ''}{opportunity.potentialGain.memory}MB
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Load Time:</span>
                      <span className="font-medium text-purple-600 ml-1">
                        {opportunity.potentialGain.loadTime > 0 ? '+' : ''}{opportunity.potentialGain.loadTime}s
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActionExecute?.('apply_optimization', opportunity)}
                  >
                    Apply Optimization
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const HardwareCompatibility: React.FC<{
  compatibility?: any;
  onActionExecute?: (action: string, params?: any) => void;
}> = ({ compatibility, onActionExecute }) => {
  if (!compatibility) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Hardware Compatibility engine not active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {compatibility.systemScore || 0}
              </div>
              <Progress value={compatibility.systemScore || 0} className="mb-2" />
              <p className="text-sm text-gray-600">Overall Hardware Score</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hardware Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {compatibility.hardwareProfile && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">CPU:</span>
                  <span className="text-sm font-medium">
                    {compatibility.hardwareProfile.cpu?.model || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">GPU:</span>
                  <span className="text-sm font-medium">
                    {compatibility.hardwareProfile.gpu?.[0]?.model || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">RAM:</span>
                  <span className="text-sm font-medium">
                    {compatibility.hardwareProfile.ram?.total || 0} GB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Storage:</span>
                  <span className="text-sm font-medium">
                    {compatibility.hardwareProfile.storage?.type || 'Unknown'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {compatibility.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hardware Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compatibility.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.description}</h4>
                    <Badge variant={
                      rec.priority === 'high' ? 'destructive' :
                      rec.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Expected FPS Gain:</span>
                      <span className="font-medium text-green-600 ml-1">
                        +{rec.expectedImprovement.fps}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium ml-1">{rec.cost}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActionExecute?.('apply_hardware_rec', rec)}
                  >
                    Learn More
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const LongitudinalTrends: React.FC<{
  trends?: any;
  onActionExecute?: (action: string, params?: any) => void;
}> = ({ trends, onActionExecute }) => {
  if (!trends) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Longitudinal Trend engine not active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Overall Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${
                trends.summary?.trendDirection === 'improving' ? 'text-green-600' :
                trends.summary?.trendDirection === 'degrading' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {trends.summary?.trendDirection || 'stable'}
              </div>
              <p className="text-sm text-gray-600">Performance Direction</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {trends.summary?.dataPoints || 0}
              </div>
              <p className="text-sm text-gray-600">Historical Measurements</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Degradation Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {trends.degradationAlerts?.length || 0}
              </div>
              <p className="text-sm text-gray-600">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {trends.degradationAlerts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Performance Degradation Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.degradationAlerts.map((alert: any, index: number) => (
                <Alert key={index} className={
                  alert.severity === 'critical' ? 'border-red-500' :
                  alert.severity === 'high' ? 'border-orange-500' : 'border-yellow-500'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{alert.message}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <p>{alert.details?.potentialCauses?.[0]}</p>
                      <div className="flex space-x-2">
                        {alert.details?.recommendedActions?.slice(0, 2).map((action: string, idx: number) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => onActionExecute?.('apply_degradation_fix', { alert, action })}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trends.predictions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Performance Predictions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.predictions.map((prediction: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{prediction.metric} Prediction</span>
                    <Badge variant="outline">
                      {Math.round(prediction.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Predicted Value:</span>
                      <span className="font-medium ml-1">
                        {typeof prediction.predictedValue === 'number' ?
                          prediction.predictedValue.toFixed(2) : prediction.predictedValue}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Trend:</span>
                      <span className={`font-medium ml-1 ${
                        prediction.trendDirection === 'improving' ? 'text-green-600' :
                        prediction.trendDirection === 'degrading' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {prediction.trendDirection}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ContextualInsights: React.FC<{
  insights?: any;
  onActionExecute?: (action: string, params?: any) => void;
}> = ({ insights, onActionExecute }) => {
  if (!insights) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Contextual Learning engine not active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Modding Style:</span>
                <Badge variant="outline">
                  {insights.userProfile?.preferences?.moddingStyle || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Performance Priority:</span>
                <Badge variant="outline">
                  {insights.userProfile?.preferences?.performancePriority || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Technical Proficiency:</span>
                <Badge variant="outline">
                  {insights.userProfile?.preferences?.technicalProficiency || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Risk Tolerance:</span>
                <Badge variant="outline">
                  {insights.userProfile?.preferences?.riskTolerance || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Profile Completeness</span>
                  <span>{Math.round((insights.summary?.profileCompleteness || 0) * 100)}%</span>
                </div>
                <Progress value={(insights.summary?.profileCompleteness || 0) * 100} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Learning Progress</span>
                  <span>{Math.round(insights.summary?.learningProgress || 0)}%</span>
                </div>
                <Progress value={insights.summary?.learningProgress || 0} />
              </div>
              <div className="text-sm text-gray-600">
                Interactions: {insights.summary?.totalInteractions || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {insights.insights?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Contextual Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.insights.map((insight: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{insight.title}</h4>
                    <div className="flex space-x-2">
                      <Badge variant={
                        insight.impact === 'high' ? 'default' :
                        insight.impact === 'medium' ? 'secondary' : 'outline'
                      }>
                        {insight.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  {insight.actionable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onActionExecute?.('apply_insight', insight)}
                    >
                      Take Action
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personalized Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant="outline">{rec.category}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <div className="flex items-center space-x-4 text-sm mb-3">
                    <span>Relevance: {Math.round(rec.relevance * 100)}%</span>
                    <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                    <span>Action: {rec.actionRequired}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActionExecute?.('apply_recommendation', rec)}
                  >
                    Apply Recommendation
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Phase2MiningDashboard;