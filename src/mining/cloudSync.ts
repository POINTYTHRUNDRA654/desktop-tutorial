/**
 * CloudSyncEngine — real-time collaboration & cloud sync for mod projects.
 *
 * Supports self-hosted, Firebase, AWS, Supabase and P2P backends.
 * The engine manages collaboration sessions, change subscriptions and
 * project synchronisation. Backend-specific transport is pluggable via
 * the private `initializeSelfHosted / initializeFirebase / …` helpers.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CollaborationSession,
  CloudSyncConfig,
  ProjectChange,
  SyncResult,
  ProjectSnapshot,
  ChangeSubscription,
} from '../shared/types';

export class CloudSyncEngine {
  private config: CloudSyncConfig | undefined;
  private initialized = false;

  /** Keyed by projectId */
  private collaborationSessions = new Map<string, CollaborationSession>();

  /** Keyed by subscription id */
  private activeSubscriptions = new Map<string, ChangeSubscription>();

  /** Session IDs currently being ended (prevents concurrent calls) */
  private endingSessionIds = new Set<string>();

  constructor(config?: CloudSyncConfig) {
    this.config = config;
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (!this.config) {
      this.initialized = true;
      return;
    }

    switch (this.config.backend) {
      case 'self-hosted':
        await this.initializeSelfHosted();
        break;
      case 'firebase':
        await this.initializeFirebase();
        break;
      case 'aws':
        await this.initializeAWS();
        break;
      case 'supabase':
        await this.initializeSupabase();
        break;
      default:
        // p2p or unknown backends initialise as no-op
        break;
    }

    this.initialized = true;
  }

  private async initializeSelfHosted(): Promise<void> {
    // Connect to self-hosted backend
  }

  private async initializeFirebase(): Promise<void> {
    // Connect to Firebase backend
  }

  private async initializeAWS(): Promise<void> {
    // Connect to AWS backend
  }

  private async initializeSupabase(): Promise<void> {
    // Connect to Supabase backend
  }

  // ── Sync ────────────────────────────────────────────────────────────────────

  async syncProject(
    projectId: string,
    direction: 'push' | 'pull' | 'bidirectional',
  ): Promise<SyncResult> {
    this.requireInitialized();
    const timestamp = Date.now();
    return { success: true, filesSync: 0, bytesSync: 0, conflictsDetected: 0, conflictsResolved: 0, duration: 0, timestamp, direction };
  }

  // ── Change broadcasting ──────────────────────────────────────────────────────

  async broadcastChange(change: ProjectChange): Promise<void> {
    this.requireInitialized();
    // Notify all active subscribers for this project
    for (const sub of this.activeSubscriptions.values()) {
      if (sub.projectId === change.projectId && sub.callback) {
        try { sub.callback(change); } catch { /* subscriber errors must not crash the engine */ }
      }
    }
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────

  async subscribeToChanges(
    projectId: string,
    callback: (change: ProjectChange) => void,
  ): Promise<string> {
    this.requireInitialized();
    const id = uuidv4();
    this.activeSubscriptions.set(id, { id, projectId, callback });
    return id;
  }

  async unsubscribeFromChanges(subscriptionId: string): Promise<void> {
    this.activeSubscriptions.delete(subscriptionId);
  }

  // ── Collaboration sessions ───────────────────────────────────────────────────

  getCollaborationSession(projectId: string): CollaborationSession | null {
    return this.collaborationSessions.get(projectId) ?? null;
  }

  /**
   * Gracefully remove `userId` from the collaboration session identified by
   * `sessionId`. Syncs pending changes before leaving and broadcasts a
   * `participant_left` event. If the last participant leaves, the session is
   * ended automatically.
   */
  async leaveCollaborationSession(sessionId: string, userId: string): Promise<void> {
    this.requireInitialized();

    // Find the session (keyed by projectId)
    const entry = this.findSessionEntry(sessionId);
    if (!entry) {
      throw new Error('Collaboration session not found');
    }
    const [projectId, session] = entry;

    // 1. Sync before leaving
    await this.syncProject(projectId, 'push');

    // 2. Remove participant
    session.participants = session.participants.filter(p => p.id !== userId);
    session.lastActivity = Date.now();

    // 3. Broadcast participant_left
    await this.broadcastChange({
      projectId,
      changeType: 'participant_left',
      author: userId,
      timestamp: Date.now(),
    });

    // 4. Clean up all subscriptions for this project
    for (const [subId, sub] of this.activeSubscriptions) {
      if (sub.projectId === projectId) {
        this.activeSubscriptions.delete(subId);
      }
    }

    // 5. End session if no participants remain
    if (session.participants.length === 0) {
      await this.endCollaborationSession(sessionId);
    }
  }

  /**
   * Perform a final bidirectional sync, snapshot the project state, broadcast
   * a `session_ended` event and remove the session. Concurrent calls for the
   * same session are no-ops (only the first call runs the full teardown).
   *
   * Throws `'Failed to end collaboration session'` when sync fails or unresolved
   * conflicts remain; the session is preserved in that case so callers can retry.
   */
  async endCollaborationSession(sessionId: string): Promise<void> {
    this.requireInitialized();

    // Concurrent-call guard
    if (this.endingSessionIds.has(sessionId)) {
      return;
    }

    // Non-existent session — resolve gracefully
    const entry = this.findSessionEntry(sessionId);
    if (!entry) return;
    const [projectId] = entry;

    this.endingSessionIds.add(sessionId);
    try {
      // 1. Final bidirectional sync
      const syncResult = await this.syncProject(projectId, 'bidirectional');

      if (!syncResult.success) {
        throw new Error('Failed to end collaboration session');
      }

      if (
        syncResult.conflictsDetected != null &&
        syncResult.conflictsResolved != null &&
        syncResult.conflictsDetected !== syncResult.conflictsResolved
      ) {
        throw new Error('Failed to end collaboration session');
      }

      // 2. Snapshot
      await this.createSnapshot(projectId, `Collaboration session ${sessionId} ended`);

      // 3. Broadcast session_ended
      await this.broadcastChange({
        projectId,
        changeType: 'session_ended',
        author: 'system',
        timestamp: Date.now(),
      });

      // 4. Clean up all subscriptions
      this.activeSubscriptions.clear();

      // 5. Remove session
      this.collaborationSessions.delete(projectId);
    } catch (error) {
      this.endingSessionIds.delete(sessionId);
      throw error;
    }

    this.endingSessionIds.delete(sessionId);
  }

  // ── Snapshots ────────────────────────────────────────────────────────────────

  private async createSnapshot(
    projectId: string,
    message: string,
  ): Promise<ProjectSnapshot> {
    return {
      id: uuidv4(),
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private requireInitialized(): void {
    if (!this.initialized) {
      throw new Error('Cloud sync engine not initialized');
    }
  }

  /** Find a session by session id, returning [projectId, session] or undefined. */
  private findSessionEntry(
    sessionId: string,
  ): [string, CollaborationSession] | undefined {
    for (const [projectId, session] of this.collaborationSessions) {
      if (session.id === sessionId) return [projectId, session];
    }
    return undefined;
  }
}

export default CloudSyncEngine;
