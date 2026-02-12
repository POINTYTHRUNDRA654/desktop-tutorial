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
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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

  async saveCurrentSession(): Promise<void> {
    try {
      // Collect current session data
      const sessionData: UserSession = {
        id: this.sessionId,
        timestamp: Date.now(),
        currentRoute: window.location.hash || '/',
        chatHistory: this.getCurrentChatHistory(),
        workInProgress: this.getCurrentWorkInProgress(),
        settings: this.getCurrentSettings(),
        uiState: this.getCurrentUIState()
      };

      // Save to cache
      await cacheManager.saveUserSession(this.sessionId, sessionData);

      // Also save chat history separately for easier access
      if (sessionData.chatHistory.length > 0) {
        await cacheManager.saveChatHistory(`chat-${this.sessionId}`, sessionData.chatHistory);
      }

      console.log('Session auto-saved:', this.sessionId);
    } catch (error) {
      console.error('Failed to auto-save session:', error);
    }
  }

  async loadLastSession(): Promise<UserSession | null> {
    try {
      // Get all sessions and find the most recent one
      const sessions = await this.getAllSessions();
      if (sessions.length === 0) return null;

      // Sort by timestamp, get most recent
      sessions.sort((a, b) => b.timestamp - a.timestamp);
      const lastSession = sessions[0];

      // Load the session data
      const sessionData = await cacheManager.loadUserSession(lastSession.id);
      if (sessionData) {
        console.log('Loaded last session:', lastSession.id);
        return sessionData;
      }
    } catch (error) {
      console.error('Failed to load last session:', error);
    }
    return null;
  }

  async getAllSessions(): Promise<Array<{ id: string; timestamp: number }>> {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to maintain a separate index
      const stats = await cacheManager.getStats();
      // For now, we'll return a placeholder - you'd need to implement
      // a way to list all session keys
      return [];
    } catch (error) {
      console.error('Failed to get sessions:', error);
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
      progress
    };

    try {
      await cacheManager.set('user-sessions', wipId, wip, 24 * 60 * 60 * 1000); // 24 hours
      console.log('Work-in-progress saved:', wipId);
      return wipId;
    } catch (error) {
      console.error('Failed to save work-in-progress:', error);
      throw error;
    }
  }

  async loadWorkInProgress(wipId: string): Promise<WorkInProgress | null> {
    try {
      return await cacheManager.get('user-sessions', wipId);
    } catch (error) {
      console.error('Failed to load work-in-progress:', error);
      return null;
    }
  }

  async deleteWorkInProgress(wipId: string): Promise<void> {
    try {
      await cacheManager.delete('user-sessions', wipId);
      console.log('Work-in-progress deleted:', wipId);
    } catch (error) {
      console.error('Failed to delete work-in-progress:', error);
    }
  }

  // Chat history management
  async saveChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    const chatMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    try {
      // Get current chat history
      const currentHistory = await cacheManager.loadChatHistory(`chat-${this.sessionId}`) || [];
      currentHistory.push(chatMessage);

      // Save updated history
      await cacheManager.saveChatHistory(`chat-${this.sessionId}`, currentHistory);
      console.log('Chat message saved');
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      return await cacheManager.loadChatHistory(`chat-${this.sessionId}`) || [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  }

  // Crash recovery
  async recoverFromCrash(): Promise<UserSession | null> {
    console.log('Attempting crash recovery...');
    return this.loadLastSession();
  }

  // Manual save
  async manualSave(): Promise<void> {
    await this.saveCurrentSession();
  }

  // Cleanup old data
  async cleanupOldData(): Promise<void> {
    try {
      // Clear sessions older than 7 days
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

      // This would require iterating through all sessions
      // For now, we'll rely on TTL in the cache manager

      console.log('Old data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // State updates (called by UI layer)
  updateCurrentChatHistory(history: ChatMessage[]): void {
    this._currentChatHistory = Array.isArray(history) ? history : [];
  }

  updateCurrentWorkInProgress(items: WorkInProgress[]): void {
    this._currentWorkInProgress = Array.isArray(items) ? items : [];
  }

  updateCurrentSettings(settings: Record<string, any>): void {
    this._currentSettings = settings && typeof settings === 'object' ? settings : {};
  }

  updateCurrentUIState(uiState: Record<string, any>): void {
    this._currentUIState = uiState && typeof uiState === 'object' ? uiState : {};
  }

  // Getters for current state (to be implemented by the app)
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

  // Cleanup
  destroy(): void {
    this.stopAutoSave();
  }
}

// Export singleton instance
export const autoSaveManager = new AutoSaveManager();