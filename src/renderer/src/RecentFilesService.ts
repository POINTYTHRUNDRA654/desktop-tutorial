/**
 * RecentFilesService - Tracks and manages recently accessed files
 * Part of Quick Win Feature #1: Recent Files & Favorites Sidebar
 */

export interface RecentFile {
  path: string;
  name: string;
  type: 'nif' | 'dds' | 'esp' | 'esm' | 'esl' | 'blend' | 'fbx' | 'ba2' | 'pex' | 'psc' | 'txt' | 'json' | 'xml' | 'other';
  timestamp: number;
  size?: number;
  projectName?: string;
}

const RECENT_FILES_STORAGE_KEY = 'mossy_recent_files';
const MAX_RECENT_FILES = 10;

class RecentFilesService {
  private listeners: Array<() => void> = [];

  /**
   * Add a file to recent files list
   */
  addRecentFile(file: Omit<RecentFile, 'timestamp'>): void {
    try {
      const recentFiles = this.getRecentFiles();
      
      // Remove if already exists (to update timestamp)
      const filtered = recentFiles.filter(f => f.path !== file.path);
      
      // Add to front with current timestamp
      const newFile: RecentFile = {
        ...file,
        timestamp: Date.now()
      };
      
      // Keep only MAX_RECENT_FILES
      const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES);
      
      localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(updated));
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to add recent file:', error);
    }
  }

  /**
   * Get all recent files, sorted by most recent first
   */
  getRecentFiles(limit?: number): RecentFile[] {
    try {
      const stored = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
      if (!stored) return [];
      
      const files: RecentFile[] = JSON.parse(stored);
      
      // Sort by timestamp (most recent first)
      const sorted = files.sort((a, b) => b.timestamp - a.timestamp);
      
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.warn('Failed to get recent files:', error);
      return [];
    }
  }

  /**
   * Remove a specific file from recent files
   */
  removeRecentFile(path: string): void {
    try {
      const recentFiles = this.getRecentFiles();
      const filtered = recentFiles.filter(f => f.path !== path);
      
      localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(filtered));
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to remove recent file:', error);
    }
  }

  /**
   * Clear all recent files
   */
  clearRecentFiles(): void {
    try {
      localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to clear recent files:', error);
    }
  }

  /**
   * Get file type from extension
   */
  getFileType(filePath: string): RecentFile['type'] {
    const ext = filePath.toLowerCase().split('.').pop();
    
    const typeMap: Record<string, RecentFile['type']> = {
      'nif': 'nif',
      'dds': 'dds',
      'esp': 'esp',
      'esm': 'esm',
      'esl': 'esl',
      'blend': 'blend',
      'fbx': 'fbx',
      'ba2': 'ba2',
      'pex': 'pex',
      'psc': 'psc',
      'txt': 'txt',
      'json': 'json',
      'xml': 'xml'
    };
    
    return typeMap[ext || ''] || 'other';
  }

  /**
   * Subscribe to changes in recent files
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.warn('Error in recent files listener:', error);
      }
    });
  }

  /**
   * Format timestamp as relative time
   */
  formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    // Format as date
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }

  /**
   * Format file size
   */
  formatSize(bytes?: number): string {
    if (!bytes) return '';
    
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    if (kb >= 1) return `${kb.toFixed(1)} KB`;
    return `${bytes} B`;
  }
}

// Export singleton instance
export const recentFilesService = new RecentFilesService();
