/**
 * Analytics Dashboard UI Component
 * Comprehensive analytics dashboard with overview cards, activity timeline,
 * asset breakdown, feature usage heatmap, performance trends, and goals tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<any>({
    start: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: Date.now(),
    period: 'month',
  });

  const [metrics, setMetrics] = useState<any>(null);
  const [buildStats, setBuildStats] = useState<any>(null);
  const [assetUsage, setAssetUsage] = useState<any>(null);
  const [performanceHistory, setPerformanceHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const metricsData = await window.electronAPI.getAnalyticsMetrics(timeRange);
      setMetrics(metricsData);
      // For now, mock the other data structures until the full API is implemented
      setBuildStats({
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageTime: 0,
        buildTrend: [],
        errorFrequency: {},
      });
      setAssetUsage({
        totalAssets: 0,
        assetsByType: {},
        mostReferenced: [],
        unusedAssets: [],
        optimizationSavings: 0,
      });
      setPerformanceHistory({
        dataPoints: [],
        averageFps: 0,
        memoryTrend: [],
        buildTimeTrend: [],
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleTimeRangeChange = (period: 'hour' | 'day' | 'week' | 'month' | 'year') => {
    const now = Date.now();
    let start: number;

    switch (period) {
      case 'hour':
        start = now - (60 * 60 * 1000);
        break;
      case 'day':
        start = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        start = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = now - (365 * 24 * 60 * 60 * 1000);
        break;
    }

    setTimeRange({ start, end: now, period });
  };

  const exportReport = async (format: 'json' | 'csv' | 'html') => {
    try {
      const report = await window.electronAPI.exportAnalyticsReport(format);
      const blob = new Blob([report], {
        type: format === 'html' ? 'text/html' : format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mossy-analytics-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header with time range selector and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <select
            value={timeRange.period}
            onChange={(e) => handleTimeRangeChange(e.target.value as 'hour' | 'day' | 'week' | 'month' | 'year')}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <Button onClick={() => exportReport('json')}>
            Export JSON
          </Button>
          <Button onClick={() => exportReport('csv')}>
            Export CSV
          </Button>
          <Button onClick={() => exportReport('html')}>
            Export HTML
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="assets">Asset Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="goals">Goals & Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab metrics={metrics} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimelineTab performanceHistory={performanceHistory} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetAnalyticsTab assetUsage={assetUsage} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab buildStats={buildStats} performanceHistory={performanceHistory} />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Overview Tab Component
interface OverviewTabProps {
  metrics: any;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assets Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.assetsCreated}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Build Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.successRate * 100).toFixed(1)}%</div>
            <Progress value={metrics.successRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(metrics.timeSpent / 60)}h {metrics.timeSpent % 60}m</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Used Features */}
      <Card>
        <CardHeader>
          <CardTitle>Top Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.topFeatures.slice(0, 5).map((feature, index) => (
              <div key={feature.feature} className="flex items-center justify-between">
                <span className="text-sm">{feature.feature}</span>
                <Badge variant="secondary">{feature.usage} uses</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Activity Timeline Tab Component
interface ActivityTimelineTabProps {
  performanceHistory: any;
}

const ActivityTimelineTab: React.FC<ActivityTimelineTabProps> = ({ performanceHistory }) => {
  if (!performanceHistory) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Build Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded flex items-end justify-center">
            <div className="text-center text-muted-foreground">
              Activity timeline chart would be rendered here
              <br />
              <small>Data points: {performanceHistory.dataPoints.length}</small>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Build Time Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              Build time trend chart would be rendered here
              <br />
              <small>Avg FPS: {performanceHistory.averageFps.toFixed(1)}</small>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Asset Analytics Tab Component
interface AssetAnalyticsTabProps {
  assetUsage: any;
}

const AssetAnalyticsTab: React.FC<AssetAnalyticsTabProps> = ({ assetUsage }) => {
  if (!assetUsage) return null;

  return (
    <div className="space-y-6">
      {/* Asset Type Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(assetUsage.assetsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{type}</span>
                  <Badge>{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(assetUsage.optimizationSavings / 1024 / 1024).toFixed(1)} MB
            </div>
            <p className="text-sm text-muted-foreground">Potential space savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Referenced Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Most Referenced Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assetUsage.mostReferenced.map((asset) => (
              <div key={asset.name} className="flex items-center justify-between">
                <span className="text-sm truncate">{asset.name}</span>
                <Badge>{asset.references} refs</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unused Assets */}
      {assetUsage.unusedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unused Assets ({assetUsage.unusedAssets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {assetUsage.unusedAssets.slice(0, 10).map((asset, index) => (
                <div key={index} className="text-sm text-muted-foreground truncate">
                  {asset}
                </div>
              ))}
              {assetUsage.unusedAssets.length > 10 && (
                <div className="text-sm text-muted-foreground">
                  ... and {assetUsage.unusedAssets.length - 10} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Performance Tab Component
interface PerformanceTabProps {
  buildStats: any;
  performanceHistory: any;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ buildStats, performanceHistory }) => {
  if (!buildStats || !performanceHistory) return null;

  return (
    <div className="space-y-6">
      {/* Build Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildStats.totalBuilds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buildStats.totalBuilds > 0 ? ((buildStats.successfulBuilds / buildStats.totalBuilds) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Build Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildStats.averageTime.toFixed(1)}s</div>
          </CardContent>
        </Card>
      </div>

      {/* Build Time Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Build Time Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              Build time trend chart would be rendered here
              <br />
              <small>Data points: {performanceHistory.buildTimeTrend.length}</small>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Error Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(buildStats.errorFrequency).map(([error, count]) => (
              <div key={error} className="flex items-center justify-between p-3 border rounded">
                <div className="text-sm truncate">{error}</div>
                <Badge variant="destructive">{count} times</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Goals & Milestones Tab Component
const GoalsTab: React.FC = () => {
  const [goals] = useState([
    { id: 1, title: 'Complete 100 Assets', current: 67, target: 100, deadline: '2026-03-01' },
    { id: 2, title: 'Achieve 95% Build Success Rate', current: 87, target: 95, deadline: '2026-02-28' },
    { id: 3, title: 'Reduce Average Build Time', current: 45, target: 30, deadline: '2026-03-15' },
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{goal.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} />
                <div className="text-xs text-muted-foreground">
                  Deadline: {new Date(goal.deadline).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>🎯 First 50 assets completed</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>🚀 90% build success rate achieved</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>⚡ Reduce build time to under 30s</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>🎨 Implement advanced asset optimization</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};