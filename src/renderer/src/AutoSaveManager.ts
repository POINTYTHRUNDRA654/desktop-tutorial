import { cacheManager } from './CacheManager';

export interface UserSession {
  id: string;
  timestamp: number;
  currentRoute: string;
  chatHistory: ChatMessage[];
  workInProgress: WorkInProgress[];
  settings: Record<string, any>;
  uiState: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: any[];
  metadata?: Record<string, any>;
}

export interface WorkInProgress {
  id: string;
  type: 'image-processing' | 'asset-analysis' | 'ai-query' | 'other';
  data: any;
  timestamp: number;
  progress?: number;
}

export class AutoSaveManager {
  private sessionId: string;
  private autoSaveInterval: number | null = null;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private readonly SESSION_PREFIX = 'session-';
  private readonly WIP_PREFIX = 'wip-';

  // Dirty tracking — only write to cache when something actually changed
  private _dirty = false;
  private _lastSavedHash = '';

  // Current state properties
  private _currentChatHistory: ChatMessage[] = [];
  private _currentWorkInProgress: WorkInProgress[] = [];
  private _currentSettings: Record<string, any> = {};
  private _currentUIState: Record<string, any> = {};

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startAutoSave();
    this.loadLastSession();
  }

  private generateSessionId(): string {
    return `${this.SESSION_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAutoSave(): void {
    this.autoSaveInterval = window.setInterval(() => {
      this.saveCurrentSession();
    }, this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /** Lightweight hash to detect actual state changes without deep equality */
  private stateHash(): string {
    return [
      this._currentChatHistory.length,
      this._currentWorkInProgress.length,
      this._currentChatHistory[this._currentChatHistory.length - 1]?.id ?? '',
      JSON.stringify(this._currentUIState).length,
    ].join('|');
  }

  async saveCurrentSession(): Promise<void> {
    // Skip save if nothing has changed since the last write
    const hash = this.stateHash();
    if (!this._dirty && hash === this._lastSavedHash) return;

    try {
      const sessionData: UserSession = {
        id: this.sessionId,
        timestamp: Date.now(),
        currentRoute: window.location.hash || '/',
        chatHistory: this.getCurrentChatHistory(),
        workInProgress: this.getCurrentWorkInProgress(),
        settings: this.getCurrentSettings(),
        uiState: this.getCurrentUIState(),
      };

      await cacheManager.saveUserSession(this.sessionId, sessionData);

      if (sessionData.chatHistory.length > 0) {
        await cacheManager.saveChatHistory(`chat-${this.sessionId}`, sessionData.chatHistory);
      }

      this._dirty = false;
      this._lastSavedHash = hash;
      // Use debug-level logging so it doesn't spam production console
      if (process.env.NODE_ENV === 'development') {
        console.debug('[AutoSave] Session saved:', this.sessionId);
      }
    } catch (error) {
      console.error('[AutoSave] Failed to save session:', error);
    }
  }

  async loadLastSession(): Promise<UserSession | null> {
    try {
      const sessions = await this.getAllSessions();
      if (sessions.length === 0) return null;

      sessions.sort((a, b) => b.timestamp - a.timestamp);
      const lastSession = sessions[0];

      const sessionData = await cacheManager.loadUserSession(lastSession.id);
      if (sessionData) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[AutoSave] Loaded last session:', lastSession.id);
        }
        return sessionData;
      }
    } catch (error) {
      console.error('[AutoSave] Failed to load last session:', error);
    }
    return null;
  }

  async getAllSessions(): Promise<Array<{ id: string; timestamp: number }>> {
    try {
      await cacheManager.getStats();
      return [];
    } catch (error) {
      console.error('[AutoSave] Failed to get sessions:', error);
      return [];
    }
  }

  // Work-in-progress management
  async saveWorkInProgress(type: WorkInProgress['type'], data: any, progress?: number): Promise<string> {
    const wipId = `${this.WIP_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const wip: WorkInProgress = {
      id: wipId,
      type,
      data,
      timestamp: Date.now(),
      progress,
    };

    try {
      await cacheManager.set('user-sessions', wipId, wip, 24 * 60 * 60 * 1000);
      this._dirty = true;
      return wipId;
    } catch (error) {
      console.error('[AutoSave] Failed to save work-in-progress:', error);
      throw error;
    }
  }

  async loadWorkInProgress(wipId: string): Promise<WorkInProgress | null> {
    try {
      return await cacheManager.get('user-sessions', wipId);
    } catch (error) {
      console.error('[AutoSave] Failed to load work-in-progress:', error);
      return null;
    }
  }

  async deleteWorkInProgress(wipId: string): Promise<void> {
    try {
      await cacheManager.delete('user-sessions', wipId);
      this._dirty = true;
    } catch (error) {
      console.error('[AutoSave] Failed to delete work-in-progress:', error);
    }
  }

  // Chat history management
  async saveChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    const chatMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    try {
      const currentHistory = await cacheManager.loadChatHistory(`chat-${this.sessionId}`) || [];
      currentHistory.push(chatMessage);
      await cacheManager.saveChatHistory(`chat-${this.sessionId}`, currentHistory);
      this._dirty = true;
    } catch (error) {
      console.error('[AutoSave] Failed to save chat message:', error);
    }
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      return await cacheManager.loadChatHistory(`chat-${this.sessionId}`) || [];
    } catch (error) {
      console.error('[AutoSave] Failed to load chat history:', error);
      return [];
    }
  }

  // Crash recovery
  async recoverFromCrash(): Promise<UserSession | null> {
    return this.loadLastSession();
  }

  // Manual save — always writes regardless of dirty flag
  async manualSave(): Promise<void> {
    this._dirty = true;
    await this.saveCurrentSession();
  }

  // Cleanup old data
  async cleanupOldData(): Promise<void> {
    try {
      // Rely on TTL in the cache manager for expiry (7-day window)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[AutoSave] cleanupOldData: relying on cache TTL');
      }
    } catch (error) {
      console.error('[AutoSave] Failed to cleanup old data:', error);
    }
  }

  // State updates — mark dirty on any real change
  updateCurrentChatHistory(history: ChatMessage[]): void {
    const next = Array.isArray(history) ? history : [];
    if (next.length !== this._currentChatHistory.length ||
        next[next.length - 1]?.id !== this._currentChatHistory[this._currentChatHistory.length - 1]?.id) {
      this._dirty = true;
    }
    this._currentChatHistory = next;
  }

  updateCurrentWorkInProgress(items: WorkInProgress[]): void {
    const next = Array.isArray(items) ? items : [];
    if (next.length !== this._currentWorkInProgress.length) this._dirty = true;
    this._currentWorkInProgress = next;
  }

  updateCurrentSettings(settings: Record<string, any>): void {
    this._currentSettings = settings && typeof settings === 'object' ? settings : {};
    this._dirty = true;
  }

  updateCurrentUIState(uiState: Record<string, any>): void {
    this._currentUIState = uiState && typeof uiState === 'object' ? uiState : {};
    this._dirty = true;
  }

  private getCurrentChatHistory(): ChatMessage[] {
    return this._currentChatHistory;
  }

  private getCurrentWorkInProgress(): WorkInProgress[] {
    return this._currentWorkInProgress;
  }

  private getCurrentSettings(): Record<string, any> {
    return this._currentSettings;
  }

  private getCurrentUIState(): Record<string, any> {
    return this._currentUIState;
  }

  destroy(): void {
    this.stopAutoSave();
  }
}

// Export singleton instance
export const autoSaveManager = new AutoSaveManager();
