/**
 * Data Management and Privacy Service
 *
 * Handles data anonymization, GDPR compliance, secure storage,
 * and data export/import functionality.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface UserProfile {
  id: string;
  anonymizedId: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    analytics: boolean;
  };
  usageStats: {
    sessionsCount: number;
    totalTimeSpent: number;
    lastActivity: number;
    favoriteFeatures: string[];
  };
  moddingHistory: {
    projectsCreated: number;
    modsDownloaded: number;
    toolsUsed: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  createdAt: number;
  lastUpdated: number;
  consentGiven: boolean;
  dataRetentionPeriod: number; // days
}

export interface DataExport {
  id: string;
  userId: string;
  requestedAt: number;
  completedAt?: number;
  format: 'json' | 'csv' | 'xml';
  includesPersonalData: boolean;
  includesAnalytics: boolean;
  includesUsageData: boolean;
  downloadUrl?: string;
  expiresAt: number;
}

export interface GDPRRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: number;
  completedAt?: number;
  reason?: string;
  data?: any;
}

export interface DataAnonymizationRule {
  field: string;
  method: 'hash' | 'mask' | 'remove' | 'aggregate';
  parameters?: Record<string, any>;
}

export interface PrivacySettings {
  dataCollectionEnabled: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  personalizationEnabled: boolean;
  dataRetentionDays: number;
  anonymizeByDefault: boolean;
  exportDataOnRequest: boolean;
  autoDeleteOldData: boolean;
}

export class DataManagementService extends EventEmitter {
  private profiles: Map<string, UserProfile> = new Map();
  private dataExports: Map<string, DataExport> = new Map();
  private gdprRequests: Map<string, GDPRRequest> = new Map();
  private privacySettings: PrivacySettings;

  private readonly dataDir: string;
  private readonly encryptionKey: Buffer;
  private readonly anonymizationRules: DataAnonymizationRule[] = [
    { field: 'email', method: 'hash' },
    { field: 'ipAddress', method: 'mask', parameters: { keepPrefix: 2 } },
    { field: 'deviceId', method: 'hash' },
    { field: 'location', method: 'remove' },
  ];

  constructor() {
    super();
    this.dataDir = path.join(app.getPath('userData'), 'data-management');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();

    // Default privacy settings
    this.privacySettings = {
      dataCollectionEnabled: true,
      analyticsEnabled: false,
      crashReportingEnabled: true,
      personalizationEnabled: true,
      dataRetentionDays: 2555, // 7 years for GDPR compliance
      anonymizeByDefault: true,
      exportDataOnRequest: true,
      autoDeleteOldData: true,
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadData();
    this.startDataCleanup();
  }

  // User Profile Management
  async createUserProfile(userData: Partial<UserProfile>): Promise<string> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const anonymizedId = this.anonymizeData(id, 'hash');

    const profile: UserProfile = {
      id,
      anonymizedId,
      preferences: {
        theme: 'auto',
        language: 'en',
        notifications: true,
        analytics: false,
        ...userData.preferences,
      },
      usageStats: {
        sessionsCount: 0,
        totalTimeSpent: 0,
        lastActivity: Date.now(),
        favoriteFeatures: [],
        ...userData.usageStats,
      },
      moddingHistory: {
        projectsCreated: 0,
        modsDownloaded: 0,
        toolsUsed: [],
        skillLevel: 'beginner',
        ...userData.moddingHistory,
      },
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      consentGiven: userData.consentGiven || false,
      dataRetentionPeriod: userData.dataRetentionPeriod || this.privacySettings.dataRetentionDays,
    };

    this.profiles.set(id, profile);
    await this.persistProfiles();

    this.emit('profileCreated', profile);
    return id;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User profile not found');

    // Apply anonymization if enabled
    if (this.privacySettings.anonymizeByDefault) {
      updates = this.applyAnonymizationRules(updates);
    }

    Object.assign(profile, updates, { lastUpdated: Date.now() });
    this.profiles.set(userId, profile);

    await this.persistProfiles();
    this.emit('profileUpdated', profile);
  }

  async deleteUserProfile(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User profile not found');

    this.profiles.delete(userId);
    await this.persistProfiles();

    this.emit('profileDeleted', userId);
  }

  // Data Anonymization
  anonymizeData(data: any, method: 'hash' | 'mask' | 'remove' | 'aggregate', parameters?: Record<string, any>): any {
    if (!data) return data;

    switch (method) {
      case 'hash':
        return crypto.createHash('sha256').update(String(data)).digest('hex');

      case 'mask': {
        const str = String(data);
        const keepPrefix = parameters?.keepPrefix || 2;
        const keepSuffix = parameters?.keepSuffix || 2;
        if (str.length <= keepPrefix + keepSuffix) return str;
        return str.substring(0, keepPrefix) + '*'.repeat(str.length - keepPrefix - keepSuffix) + str.substring(str.length - keepSuffix);
      }

      case 'remove':
        return null;

      case 'aggregate': {
        // For numeric data, return ranges instead of exact values
        const num = Number(data);
        if (isNaN(num)) return data;
        const ranges = parameters?.ranges || [0, 10, 50, 100, 500, 1000];
        for (let i = 0; i < ranges.length - 1; i++) {
          if (num >= ranges[i] && num < ranges[i + 1]) {
            return `${ranges[i]}-${ranges[i + 1]}`;
          }
        }
        return `${ranges[ranges.length - 1]}+`;
      }

      default:
        return data;
    }
  }

  applyAnonymizationRules(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    const anonymized = { ...data };

    for (const rule of this.anonymizationRules) {
      if (Object.prototype.hasOwnProperty.call(anonymized, rule.field)) {
        anonymized[rule.field] = this.anonymizeData(anonymized[rule.field], rule.method, rule.parameters);
      }
    }

    return anonymized;
  }

  // GDPR Compliance
  async submitGDPRRequest(request: Omit<GDPRRequest, 'id' | 'requestedAt' | 'status'>): Promise<string> {
    const id = `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gdprRequest: GDPRRequest = {
      ...request,
      id,
      requestedAt: Date.now(),
      status: 'pending',
    };

    this.gdprRequests.set(id, gdprRequest);
    await this.persistGDPRRequests();

    // Process the request
    setTimeout(() => this.processGDPRRequest(id), 1000);

    this.emit('gdprRequestSubmitted', gdprRequest);
    return id;
  }

  async getGDPRRequest(id: string): Promise<GDPRRequest | null> {
    return this.gdprRequests.get(id) || null;
  }

  private async processGDPRRequest(requestId: string): Promise<void> {
    const request = this.gdprRequests.get(requestId);
    if (!request) return;

    request.status = 'processing';
    await this.persistGDPRRequests();

    try {
      switch (request.type) {
        case 'access':
          request.data = await this.generateDataExport(request.userId, {
            includesPersonalData: true,
            includesAnalytics: true,
            includesUsageData: true,
          });
          break;

        case 'erasure':
          await this.deleteUserProfile(request.userId);
          // Also delete associated data
          break;

        case 'portability':
          request.data = await this.generateDataExport(request.userId, {
            includesPersonalData: true,
            includesAnalytics: true,
            includesUsageData: true,
          });
          break;

        case 'rectification':
          // Would implement data correction logic
          break;

        case 'restriction':
          // Would implement data processing restriction
          break;

        case 'objection':
          // Would implement objection handling
          break;
      }

      request.status = 'completed';
      request.completedAt = Date.now();

    } catch (error) {
      request.status = 'rejected';
      request.reason = error instanceof Error ? error.message : 'Unknown error';
    }

    await this.persistGDPRRequests();
    this.emit('gdprRequestProcessed', request);
  }

  // Data Export/Import
  async requestDataExport(
    userId: string,
    options: {
      format?: 'json' | 'csv' | 'xml';
      includesPersonalData?: boolean;
      includesAnalytics?: boolean;
      includesUsageData?: boolean;
    } = {}
  ): Promise<string> {
    const id = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dataExport: DataExport = {
      id,
      userId,
      requestedAt: Date.now(),
      format: options.format || 'json',
      includesPersonalData: options.includesPersonalData ?? true,
      includesAnalytics: options.includesAnalytics ?? true,
      includesUsageData: options.includesUsageData ?? true,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    };

    this.dataExports.set(id, dataExport);
    await this.persistDataExports();

    // Process export asynchronously
    setTimeout(() => this.processDataExport(id), 100);

    this.emit('dataExportRequested', dataExport);
    return id;
  }

  async getDataExport(id: string): Promise<DataExport | null> {
    return this.dataExports.get(id) || null;
  }

  private async processDataExport(exportId: string): Promise<void> {
    const dataExport = this.dataExports.get(exportId);
    if (!dataExport) return;

    try {
      const exportData = await this.generateDataExport(
        dataExport.userId,
        {
          format: dataExport.format,
          includesPersonalData: dataExport.includesPersonalData,
          includesAnalytics: dataExport.includesAnalytics,
          includesUsageData: dataExport.includesUsageData,
        }
      );

      // Encrypt and save the export
      const encryptedData = this.encryptData(JSON.stringify(exportData));
      const fileName = `data-export-${dataExport.id}.${dataExport.format}`;
      const filePath = path.join(this.dataDir, 'exports', fileName);

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, encryptedData);

      dataExport.downloadUrl = filePath;
      dataExport.completedAt = Date.now();

    } catch (error) {
      console.error('Data export failed:', error);
      // Could set status to failed
    }

    await this.persistDataExports();
    this.emit('dataExportCompleted', dataExport);
  }

  private async generateDataExport(
    userId: string,
    options: {
      format?: 'json' | 'csv' | 'xml';
      includesPersonalData?: boolean;
      includesAnalytics?: boolean;
      includesUsageData?: boolean;
    }
  ): Promise<any> {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('User profile not found');

    const exportData: any = {
      exportedAt: Date.now(),
      userId: options.includesPersonalData ? userId : profile.anonymizedId,
    };

    if (options.includesPersonalData) {
      exportData.profile = profile;
    }

    if (options.includesAnalytics) {
      exportData.analytics = {
        // Would include analytics data
        sessions: profile.usageStats.sessionsCount,
        totalTime: profile.usageStats.totalTimeSpent,
      };
    }

    if (options.includesUsageData) {
      exportData.usage = profile.usageStats;
      exportData.moddingHistory = profile.moddingHistory;
    }

    // Convert format if needed
    switch (options.format) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'xml':
        return this.convertToXML(exportData);
      default:
        return exportData;
    }
  }

  // Privacy Settings
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    this.privacySettings = { ...this.privacySettings, ...settings };
    await this.persistPrivacySettings();

    this.emit('privacySettingsUpdated', this.privacySettings);
  }

  // Secure Storage
  encryptData(data: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('mossy-data'));
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  decryptData(encryptedData: Buffer): string {
    const iv = encryptedData.subarray(0, 16);
    const tag = encryptedData.subarray(16, 32);
    const encrypted = encryptedData.subarray(32);

    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('mossy-data'));
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  // Data Cleanup
  private startDataCleanup(): void {
    // Run cleanup daily
    setInterval(() => this.performDataCleanup(), 24 * 60 * 60 * 1000);
    // Initial cleanup
    setTimeout(() => this.performDataCleanup(), 60000); // 1 minute after start
  }

  private async performDataCleanup(): Promise<void> {
    if (!this.privacySettings.autoDeleteOldData) return;

    const cutoff = Date.now() - (this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [id, profile] of this.profiles) {
      if (profile.createdAt < cutoff) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.deleteUserProfile(id);
    }

    if (toDelete.length > 0) {
      console.log(`[DataManagement] Cleaned up ${toDelete.length} old user profiles`);
    }
  }

  // Persistence Methods
  private getOrCreateEncryptionKey(): Buffer {
    const keyPath = path.join(this.dataDir, 'encryption.key');
    try {
      return fs.readFileSync(keyPath);
    } catch {
      const key = crypto.randomBytes(32);
      fs.writeFileSync(keyPath, key);
      return key;
    }
  }

  private async persistProfiles(): Promise<void> {
    const profilesPath = path.join(this.dataDir, 'profiles.json');
    const profiles = Array.from(this.profiles.entries());
    const encrypted = this.encryptData(JSON.stringify(profiles));
    await fs.promises.writeFile(profilesPath, encrypted);
  }

  private async loadProfiles(): Promise<void> {
    try {
      const profilesPath = path.join(this.dataDir, 'profiles.json');
      if (fs.existsSync(profilesPath)) {
        const encrypted = await fs.promises.readFile(profilesPath);
        const decrypted = this.decryptData(encrypted);
        const profiles: [string, UserProfile][] = JSON.parse(decrypted);
        this.profiles = new Map(profiles);
      }
    } catch (error) {
      console.error('[DataManagement] Failed to load profiles:', error);
    }
  }

  private async persistDataExports(): Promise<void> {
    const exportsPath = path.join(this.dataDir, 'data-exports.json');
    const exports = Array.from(this.dataExports.entries());
    await fs.promises.writeFile(exportsPath, JSON.stringify(exports, null, 2));
  }

  private async loadDataExports(): Promise<void> {
    try {
      const exportsPath = path.join(this.dataDir, 'data-exports.json');
      if (fs.existsSync(exportsPath)) {
        const data = await fs.promises.readFile(exportsPath, 'utf-8');
        const exports: [string, DataExport][] = JSON.parse(data);
        this.dataExports = new Map(exports);
      }
    } catch (error) {
      console.error('[DataManagement] Failed to load data exports:', error);
    }
  }

  private async persistGDPRRequests(): Promise<void> {
    const requestsPath = path.join(this.dataDir, 'gdpr-requests.json');
    const requests = Array.from(this.gdprRequests.entries());
    await fs.promises.writeFile(requestsPath, JSON.stringify(requests, null, 2));
  }

  private async loadGDPRRequests(): Promise<void> {
    try {
      const requestsPath = path.join(this.dataDir, 'gdpr-requests.json');
      if (fs.existsSync(requestsPath)) {
        const data = await fs.promises.readFile(requestsPath, 'utf-8');
        const requests: [string, GDPRRequest][] = JSON.parse(data);
        this.gdprRequests = new Map(requests);
      }
    } catch (error) {
      console.error('[DataManagement] Failed to load GDPR requests:', error);
    }
  }

  private async persistPrivacySettings(): Promise<void> {
    const settingsPath = path.join(this.dataDir, 'privacy-settings.json');
    await fs.promises.writeFile(settingsPath, JSON.stringify(this.privacySettings, null, 2));
  }

  private async loadPrivacySettings(): Promise<void> {
    try {
      const settingsPath = path.join(this.dataDir, 'privacy-settings.json');
      if (fs.existsSync(settingsPath)) {
        const data = await fs.promises.readFile(settingsPath, 'utf-8');
        this.privacySettings = { ...this.privacySettings, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('[DataManagement] Failed to load privacy settings:', error);
    }
  }

  private async loadData(): Promise<void> {
    await Promise.all([
      this.loadProfiles(),
      this.loadDataExports(),
      this.loadGDPRRequests(),
      this.loadPrivacySettings(),
    ]);
  }

  // Utility Methods
  private convertToCSV(data: any): string {
    // Simple CSV conversion - would need more sophisticated implementation for complex data
    const rows: string[] = [];
    const flatten = (obj: any, prefix = ''): Array<[string, any]> => {
      const result: Array<[string, any]> = [];
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result.push(...flatten(value, newKey));
        } else {
          result.push([newKey, value]);
        }
      }
      return result;
    };

    const flattened = flatten(data);
    rows.push(flattened.map(([key]) => key).join(','));
    rows.push(flattened.map(([, value]) => JSON.stringify(value)).join(','));

    return rows.join('\n');
  }

  private convertToXML(data: any): string {
    const toXML = (obj: any, tag = 'data'): string => {
      if (typeof obj === 'object' && obj !== null) {
        const children = Object.entries(obj).map(([key, value]) =>
          toXML(value, key)
        ).join('');
        return `<${tag}>${children}</${tag}>`;
      }
      return `<${tag}>${obj}</${tag}>`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${toXML(data)}`;
  }
}