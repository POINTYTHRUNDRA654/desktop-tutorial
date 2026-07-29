/**
 * CloudSyncEngine — session-aware cloud sync for collaborative modding.
 *
 * Manages collaboration sessions, project sync, change broadcasting,
 * and clean-up on participant leave / session end.
 */

import { EventEmitter } from 'events';
import type {
  CollaborationSession,
  ProjectChange,
  SyncResult,
  ProjectSnapshot,
} from '../shared/types';

export interface CloudSyncConfig {
  enabled?: boolean;
  backend?: 'github' | 'self-hosted' | 'none';
  autoSync?: boolean;
  backendUrl?: string;
  authToken?: string;
}

type SubscriptionCallback = (change: ProjectChange) => void;

interface SubscriptionEntry {
  projectId: string;
  callback: SubscriptionCallback;
}

export class CloudSyncEngine extends EventEmitter {
  private isInitialized = false;
  private readonly config: CloudSyncConfig;

  /** Keyed by projectId. */
  readonly collaborationSessions = new Map<string, CollaborationSession>();
  /** Keyed by subscription ID. */
  readonly activeSubscriptions = new Map<string, SubscriptionEntry>();
  /** Session IDs currently being ended (idempotency guard). */
  private readonly endingSessions = new Set<string>();

  constructor(config?: CloudSyncConfig) {
    super();
    this.config = config ?? {};
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.config.backend === 'self-hosted') {
      await this.initializeSelfHosted();
    }
    this.isInitialized = true;
  }

  private async initializeSelfHosted(): Promise<void> {
    // Real implementation would open a WebSocket / HTTP connection to the backend.
  }

  // ─── Sync & broadcast ───────────────────────────────────────────────────────

  async syncProject(projectId: string, _mode: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
    return {
      success: true,
      filesSync: 0,
      bytesSync: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      duration: 0,
      timestamp: Date.now(),
    };
  }

  async broadcastChange(_change: ProjectChange): Promise<void> {
    // Real implementation would publish the change to all subscribers.
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────────

  async subscribeToChanges(projectId: string, callback: SubscriptionCallback): Promise<string> {
    const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.activeSubscriptions.set(subId, { projectId, callback });
    return subId;
  }

  // ─── Session queries ────────────────────────────────────────────────────────

  /** Returns the collaboration session for the given project, or null. */
  getCollaborationSession(projectId: string): CollaborationSession | null {
    return this.collaborationSessions.get(projectId) ?? null;
  }

  // ─── Session operations ─────────────────────────────────────────────────────

  /**
   * Remove a participant from the collaboration session identified by sessionId.
   *
   * - Pushes local changes before leaving.
   * - Broadcasts a `participant_left` event.
   * - Cleans up all subscriptions for the project.
   * - Ends the session automatically when the last participant leaves.
   *
   * @throws 'Cloud sync engine not initialized' if initialize() was not called.
   * @throws 'Collaboration session not found' if sessionId is not known.
   */
  async leaveCollaborationSession(sessionId: string, userId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Cloud sync engine not initialized');
    }

    const { projectId, session } = this.findSession(sessionId);
    if (!projectId || !session) {
      throw new Error('Collaboration session not found');
    }

    // Sync outgoing changes before departing.
    await this.syncProject(projectId, 'push');

    // Remove the participant.
    session.participants = session.participants.filter(p => p.id !== userId);

    // Inform other participants.
    await this.broadcastChange({
      projectId,
      changeType: 'participant_left',
      author: userId,
      timestamp: Date.now(),
    });

    // Drop all active subscriptions for this project.
    for (const [subId, entry] of this.activeSubscriptions) {
      if (entry.projectId === projectId) {
        this.activeSubscriptions.delete(subId);
      }
    }

    // End the session when no participants remain.
    if (session.participants.length === 0) {
      await this.endCollaborationSession(sessionId);
    }
  }

  /**
   * Finalise and clean up a collaboration session.
   *
   * - Performs a bidirectional sync.
   * - Throws (and preserves the session) if the sync fails or leaves unresolved conflicts.
   * - Creates a final snapshot.
   * - Broadcasts `session_ended`.
   * - Clears all active subscriptions.
   * - Removes the session from the active set.
   *
   * Concurrent calls for the same sessionId are idempotent — only the first
   * call performs work; subsequent ones return immediately.
   *
   * @throws 'Cloud sync engine not initialized' if initialize() was not called.
   * @throws 'Failed to end collaboration session' if the final sync fails or
   *         has unresolved conflicts.
   */
  async endCollaborationSession(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Cloud sync engine not initialized');
    }

    const { projectId } = this.findSession(sessionId);
    if (!projectId) {
      // Non-existent session → graceful no-op.
      return;
    }

    // Idempotency guard: if a concurrent call is already finishing this session,
    // return immediately without duplicating work.
    if (this.endingSessions.has(sessionId)) return;
    this.endingSessions.add(sessionId);

    try {
      const syncResult = await this.syncProject(projectId, 'bidirectional');

      if (!syncResult.success) {
        throw new Error('Failed to end collaboration session: sync unsuccessful');
      }

      const unresolved = (syncResult.conflictsDetected ?? 0) - (syncResult.conflictsResolved ?? 0);
      if (unresolved > 0) {
        throw new Error('Failed to end collaboration session: unresolved conflicts remain');
      }

      await this.createSnapshot(projectId, `Collaboration session ${sessionId} ended`);

      await this.broadcastChange({
        projectId,
        changeType: 'session_ended',
        author: 'system',
        timestamp: Date.now(),
      });

      // Remove all active subscriptions (session is over).
      this.activeSubscriptions.clear();

      // Remove the session itself.
      this.collaborationSessions.delete(projectId);
    } catch (error) {
      this.endingSessions.delete(sessionId);
      throw error;
    }

    this.endingSessions.delete(sessionId);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private findSession(sessionId: string): { projectId: string | undefined; session: CollaborationSession | undefined } {
    for (const [pid, session] of this.collaborationSessions) {
      if (session.id === sessionId) {
        return { projectId: pid, session };
      }
    }
    return { projectId: undefined, session: undefined };
  }

  private async createSnapshot(projectId: string, message: string): Promise<ProjectSnapshot> {
    return {
      id: `snapshot-${Date.now()}`,
      projectId,
      version: '1.0.0',
      timestamp: Date.now(),
      author: 'system',
      message,
      fileCount: 0,
      totalSize: 0,
      checksum: '',
    };
  }
}
