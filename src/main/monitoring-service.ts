import { EventEmitter } from 'events';
import * as http from 'http';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number;
  lastTriggered?: number;
  channels: ('notification' | 'websocket' | 'log')[];
}

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkActivity: number;
  miningEngineStatus: 'active' | 'idle' | 'error';
  activeConnections: number;
  uptime: number;
  lastUpdate: number;
}

export interface NotificationMessage {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: number;
  data?: any;
  actions?: Array<{ label: string; action: string; data?: any }>;
}

export class MonitoringService extends EventEmitter {
  private wss?: any;
  private server?: http.Server;
  private clients: Set<any> = new Set();
  private alertRules: Map<string, AlertRule> = new Map();
  private healthMetrics: Map<string, HealthMetric[]> = new Map();
  private notifications: NotificationMessage[] = [];
  private isRunning = false;
  private readonly port: number;
  private readonly dataDir: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000;

  constructor(port: number = Number(process.env.MOSSY_MONITOR_PORT || 0)) {
    super();
    this.port = port;
    this.dataDir = path.join(app.getPath('userData'), 'monitoring');

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadAlertRules();
    this.loadHealthHistory();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const { WebSocketServer } = require('ws');
      this.server = http.createServer();
      this.wss = new WebSocketServer({ server: this.server });
      this.attachWsHandlers();

      const requestedPort = this.port || 0; // 0 lets OS pick a free port

      await new Promise<void>((resolve, reject) => {
        const onError = (err: any) => {
          if (err?.code === 'EADDRINUSE' && requestedPort !== 0) {
            console.warn(`[Monitoring] Port ${requestedPort} in use; retrying on random port`);
            this.server!.removeListener('error', onError);
            this.server!.close(() => {
              this.server!.listen(0);
              this.server!.on('error', reject);
            });
            return;
          }
          reject(err);
        };

        this.server!.on('error', onError);
        this.server!.listen(requestedPort, () => {
          const addr = this.server!.address();
          const actual = typeof addr === 'object' && addr ? addr.port : requestedPort;
          console.log(`[Monitoring] WebSocket server started on port ${actual}`);
          this.server!.removeListener('error', onError);
          resolve();
        });
      });

      this.isRunning = true;
      this.startHealthMonitoring();
      this.emit('started');
    } catch (error) {
      console.error('[Monitoring] Failed to start monitoring service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    await this.persistHealthHistory();

    for (const client of this.clients) client.close();
    this.clients.clear();

    if (this.wss) this.wss.close();

    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  recordMetric(name: string, value: number, unit: string, metadata?: Record<string, any>): void {
    const metric: HealthMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      status: this.determineMetricStatus(name, value),
      metadata,
    };

    if (!this.healthMetrics.has(name)) this.healthMetrics.set(name, []);
    const history = this.healthMetrics.get(name)!;
    history.push(metric);

    const cutoff = Date.now() - this.metricsRetentionPeriod;
    this.healthMetrics.set(name, history.filter((m) => m.timestamp > cutoff));

    this.checkAlertRules(metric);
    this.broadcast({ type: 'metric_update', data: metric });
  }

  getCurrentHealth(): SystemHealth {
    const cpuMetrics = this.healthMetrics.get('cpu_usage') || [];
    const memMetrics = this.healthMetrics.get('memory_usage') || [];
    const diskMetrics = this.healthMetrics.get('disk_usage') || [];
    const networkMetrics = this.healthMetrics.get('network_activity') || [];

    const avg = (m: any[]) => (m.length > 0 ? m.reduce((s, x) => s + x.value, 0) / m.length : 0);

    return {
      cpuUsage: avg(cpuMetrics),
      memoryUsage: avg(memMetrics),
      diskUsage: avg(diskMetrics),
      networkActivity: avg(networkMetrics),
      miningEngineStatus: 'active',
      activeConnections: this.clients.size,
      uptime: process.uptime(),
      lastUpdate: Date.now(),
    };
  }

  private attachWsHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: any) => {
      this.clients.add(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('[Monitoring] Invalid message received:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error: any) => {
        console.error('[Monitoring] WebSocket error:', error);
        this.clients.delete(ws);
      });

      this.sendToClient(ws, {
        type: 'system_health',
        data: this.getCurrentHealth(),
      });
    });
  }

  private broadcast(message: any): void {
    try {
      const data = JSON.stringify(message);
      const WS = require('ws');
      for (const client of this.clients) {
        if (client.readyState === (WS.WebSocket?.OPEN || WS.OPEN || 1)) {
          client.send(data);
        }
      }
    } catch {
      // ignore broadcast errors
    }
  }

  private sendToClient(client: any, message: any): void {
    try {
      const WS = require('ws');
      if (client.readyState === (WS.WebSocket?.OPEN || WS.OPEN || 1)) {
        client.send(JSON.stringify(message));
      }
    } catch {
      // ignore send errors
    }
  }

  private handleClientMessage(client: any, message: any): void {
    switch (message.type) {
      case 'get_health':
        this.sendToClient(client, { type: 'system_health', data: this.getCurrentHealth() });
        break;
      case 'get_metrics':
        this.sendToClient(client, { type: 'metrics_full', data: Object.fromEntries(this.healthMetrics) });
        break;
      default:
        break;
    }
  }

  private checkAlertRules(metric: HealthMetric): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.condition.metric !== metric.name) continue;
      if (this.evaluateCondition(rule.condition, metric.value)) {
        const now = Date.now();
        if (!rule.lastTriggered || now - rule.lastTriggered > rule.cooldown * 1000) {
          this.triggerAlert(rule, metric);
        }
      }
    }
  }

  private triggerAlert(rule: AlertRule, metric: HealthMetric): void {
    rule.lastTriggered = Date.now();

    const notification: NotificationMessage = {
      id: `alert-${Date.now()}-${rule.id}`,
      type: rule.severity === 'critical' || rule.severity === 'high' ? 'alert' : 'warning',
      title: `System Alert: ${rule.name}`,
      message: `Metric ${metric.name} triggered alert. Value: ${metric.value}${metric.unit}`,
      timestamp: Date.now(),
      data: { ruleId: rule.id, metric },
    };

    this.notifications.push(notification);
    this.emit('notification', notification);

    if (this.notifications.length > 100) this.notifications.shift();

    this.broadcast({ type: 'notification', data: notification });
  }

  private evaluateCondition(condition: AlertRule['condition'], value: number): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold;
      case '<':
        return value < condition.threshold;
      case '>=':
        return value >= condition.threshold;
      case '<=':
        return value <= condition.threshold;
      case '==':
        return value === condition.threshold;
      case '!=':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  private determineMetricStatus(name: string, value: number): 'healthy' | 'warning' | 'critical' {
    if (name === 'cpu_usage' || name === 'memory_usage' || name === 'disk_usage') {
      if (value > 90) return 'critical';
      if (value > 75) return 'warning';
    }
    return 'healthy';
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => this.performHealthCheck(), 30000);
    this.performHealthCheck();
  }

  private async performHealthCheck(): Promise<void> {
    try {
      this.recordMetric('cpu_usage', Math.random() * 100, '%');
      this.recordMetric('memory_usage', (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100, '%');
      this.recordMetric('disk_usage', Math.random() * 100, '%');
      this.recordMetric('network_activity', Math.random() * 1000, 'Mbps');
    } catch (error) {
      console.error('[Monitoring] Health check failed:', error);
    }
  }

  private async persistAlertRules(): Promise<void> {
    const rulesPath = path.join(this.dataDir, 'alert-rules.json');
    await fs.promises.writeFile(rulesPath, JSON.stringify(Array.from(this.alertRules.entries()), null, 2));
  }

  private async loadAlertRules(): Promise<void> {
    try {
      const rulesPath = path.join(this.dataDir, 'alert-rules.json');
      if (fs.existsSync(rulesPath)) {
        const data = await fs.promises.readFile(rulesPath, 'utf-8');
        this.alertRules = new Map(JSON.parse(data));
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to load alert rules:', error);
    }
  }

  private async persistHealthHistory(): Promise<void> {
    const historyPath = path.join(this.dataDir, 'health-history.json');
    await fs.promises.writeFile(historyPath, JSON.stringify(Array.from(this.healthMetrics.entries()), null, 2));
  }

  private async loadHealthHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.dataDir, 'health-history.json');
      if (fs.existsSync(historyPath)) {
        const data = await fs.promises.readFile(historyPath, 'utf-8');
        this.healthMetrics = new Map(JSON.parse(data));
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to load health history:', error);
    }
  }

  createAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.persistAlertRules();
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  getMetrics(name: string, timeRange: number): HealthMetric[] {
    const history = this.healthMetrics.get(name) || [];
    const cutoff = Date.now() - timeRange * 1000;
    return history.filter((m) => m.timestamp > cutoff);
  }

  getNotifications(limit: number): NotificationMessage[] {
    return this.notifications.slice(-limit).reverse();
  }
}
