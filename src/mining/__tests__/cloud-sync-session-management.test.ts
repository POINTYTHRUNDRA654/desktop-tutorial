/**
 * Cloud Sync Session Management Tests
 * 
 * Tests for leaveCollaborationSession and endCollaborationSession methods
 */

import { vi } from 'vitest';
import { CloudSyncEngine } from '../cloudSync';
import type { CollaborationSession, ProjectChange } from '../../shared/types';

describe('CloudSync Session Management', () => {
  let cloudSync: CloudSyncEngine;
  let mockSession: CollaborationSession;
  const projectId = 'test-project-123';
  const sessionId = 'session-abc-456';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  beforeEach(async () => {
    // Initialize CloudSync engine
    cloudSync = new CloudSyncEngine({
      enabled: true,
      backend: 'self-hosted',
      autoSync: false,
    });

    // Mock initialize to avoid actual backend connection
    vi.spyOn(cloudSync as any, 'initializeSelfHosted').mockResolvedValue(undefined);
    await cloudSync.initialize();

    // Create a mock collaboration session
    mockSession = {
      id: sessionId,
      projectId,
      participants: [
        { 
          id: userId1, 
          name: 'User One', 
          role: 'owner', 
          email: 'user1@test.com',
          lastActive: Date.now(),
          permissions: { canEdit: true, canDelete: true, canInvite: true, canManageSettings: true }
        },
        { 
          id: userId2, 
          name: 'User Two', 
          role: 'editor', 
          email: 'user2@test.com',
          lastActive: Date.now(),
          permissions: { canEdit: true, canDelete: false, canInvite: false, canManageSettings: false }
        },
      ],
      activeFiles: ['file1.esp', 'file2.pex'],
      lastActivity: Date.now(),
      status: 'active',
    };

    // Set up the mock session in the engine
    (cloudSync as any).collaborationSessions.set(projectId, mockSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('leaveCollaborationSession', () => {
    it('should sync changes before leaving', async () => {
      const syncSpy = vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 5,
        bytesSync: 1024,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 100,
        timestamp: Date.now(),
      });

      await cloudSync.leaveCollaborationSession(sessionId, userId1);

      expect(syncSpy).toHaveBeenCalledWith(projectId, 'push');
    });

    it('should remove user from participants', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      await cloudSync.leaveCollaborationSession(sessionId, userId1);

      const updatedSession = cloudSync.getCollaborationSession(projectId);
      expect(updatedSession?.participants).toHaveLength(1);
      expect(updatedSession?.participants[0].id).toBe(userId2);
    });

    it('should broadcast participant_left event', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      const broadcastSpy = vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      await cloudSync.leaveCollaborationSession(sessionId, userId1);

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          changeType: 'participant_left',
          author: userId1,
        })
      );
    });

    it('should clean up user subscriptions', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      // Create a subscription for the user
      const subId = await cloudSync.subscribeToChanges(projectId, () => {});
      expect((cloudSync as any).activeSubscriptions.has(subId)).toBe(true);

      await cloudSync.leaveCollaborationSession(sessionId, userId1);

      // Subscription should be removed
      expect((cloudSync as any).activeSubscriptions.has(subId)).toBe(false);
    });

    it('should end session when last participant leaves', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      const endSessionSpy = vi.spyOn(cloudSync, 'endCollaborationSession').mockResolvedValue(undefined);

      // Leave with first user (one remains)
      await cloudSync.leaveCollaborationSession(sessionId, userId1);
      expect(endSessionSpy).not.toHaveBeenCalled();

      // Leave with last user
      await cloudSync.leaveCollaborationSession(sessionId, userId2);
      expect(endSessionSpy).toHaveBeenCalledWith(sessionId);
    });

    it('should throw error if session not found', async () => {
      await expect(
        cloudSync.leaveCollaborationSession('non-existent-session', userId1)
      ).rejects.toThrow('Collaboration session not found');
    });

    it('should throw error if engine not initialized', async () => {
      const uninitializedEngine = new CloudSyncEngine();
      
      await expect(
        uninitializedEngine.leaveCollaborationSession(sessionId, userId1)
      ).rejects.toThrow('Cloud sync engine not initialized');
    });
  });

  describe('endCollaborationSession', () => {
    it('should perform final bidirectional sync', async () => {
      const syncSpy = vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 10,
        bytesSync: 2048,
        conflictsDetected: 2,
        conflictsResolved: 2,
        duration: 200,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
        version: '1.0.0',
        timestamp: Date.now(),
        author: 'system',
        message: `Collaboration session ${sessionId} ended`,
        fileCount: 10,
        totalSize: 2048,
        checksum: 'abc123',
      });

      await cloudSync.endCollaborationSession(sessionId);

      expect(syncSpy).toHaveBeenCalledWith(projectId, 'bidirectional');
    });

    it('should create final snapshot', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      const createSnapshotSpy = vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
        version: '1.0.0',
        timestamp: Date.now(),
        author: 'system',
        message: `Collaboration session ${sessionId} ended`,
        fileCount: 0,
        totalSize: 0,
        checksum: 'abc123',
      });

      await cloudSync.endCollaborationSession(sessionId);

      expect(createSnapshotSpy).toHaveBeenCalledWith(
        projectId,
        `Collaboration session ${sessionId} ended`
      );
    });

    it('should broadcast session_ended event', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
        version: '1.0.0',
        timestamp: Date.now(),
        author: 'system',
        message: `Collaboration session ${sessionId} ended`,
      });

      const broadcastSpy = vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      await cloudSync.endCollaborationSession(sessionId);

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          changeType: 'session_ended',
          author: 'system',
        })
      );
    });

    it('should clean up all subscriptions', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
      });

      // Create multiple subscriptions with small delay to ensure unique IDs
      const sub1 = await cloudSync.subscribeToChanges(projectId, () => {});
      await new Promise(resolve => setTimeout(resolve, 5)); // Small delay
      const sub2 = await cloudSync.subscribeToChanges(projectId, () => {});
      
      // Verify both subscriptions exist
      expect((cloudSync as any).activeSubscriptions.size).toBeGreaterThanOrEqual(2);

      await cloudSync.endCollaborationSession(sessionId);

      // All subscriptions should be removed
      expect((cloudSync as any).activeSubscriptions.size).toBe(0);
    });

    it('should remove session from active sessions', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
      });

      expect(cloudSync.getCollaborationSession(projectId)).not.toBeNull();

      await cloudSync.endCollaborationSession(sessionId);

      expect(cloudSync.getCollaborationSession(projectId)).toBeNull();
    });

    it('should handle non-existent session gracefully', async () => {
      await expect(
        cloudSync.endCollaborationSession('non-existent-session')
      ).resolves.not.toThrow();
    });

    it('should throw error if engine not initialized', async () => {
      const uninitializedEngine = new CloudSyncEngine();
      
      await expect(
        uninitializedEngine.endCollaborationSession(sessionId)
      ).rejects.toThrow('Cloud sync engine not initialized');
    });

    it('should not delete session when sync fails', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: false,
        filesSync: 0,
        bytesSync: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 0,
        timestamp: Date.now(),
        error: 'network error',
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);

      await expect(
        cloudSync.endCollaborationSession(sessionId)
      ).rejects.toThrow('Failed to end collaboration session');

      // Session must still exist because sync did not succeed
      expect(cloudSync.getCollaborationSession(projectId)).not.toBeNull();
    });

    it('should not delete session when conflicts remain unresolved', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 3,
        bytesSync: 512,
        conflictsDetected: 2,
        conflictsResolved: 1, // One conflict still unresolved
        duration: 150,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-partial',
        projectId,
      });

      await expect(
        cloudSync.endCollaborationSession(sessionId)
      ).rejects.toThrow('Failed to end collaboration session');

      // Session must still exist because not all conflicts were resolved
      expect(cloudSync.getCollaborationSession(projectId)).not.toBeNull();
    });

    it('should ignore a concurrent call for the same session', async () => {
      let resolveSyncFirst = (): void => {};
      const firstSyncStarted = new Promise<void>((resolve) => {
        resolveSyncFirst = resolve;
      });
      let releaseFirstSync = (): void => {};
      const firstSyncGate = new Promise<void>((resolve) => {
        releaseFirstSync = resolve;
      });

      // First call: blocks until we manually release it
      const syncMock = vi
        .spyOn(cloudSync, 'syncProject')
        .mockImplementationOnce(async () => {
          resolveSyncFirst(); // signal that the first call has started
          await firstSyncGate; // wait until we release it
          return {
            success: true,
            filesSync: 0,
            bytesSync: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            duration: 0,
            timestamp: Date.now(),
          };
        })
        .mockResolvedValue({
          success: true,
          filesSync: 0,
          bytesSync: 0,
          conflictsDetected: 0,
          conflictsResolved: 0,
          duration: 0,
          timestamp: Date.now(),
        });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-concurrent',
        projectId,
      });

      // Start first call (will block at syncProject)
      const firstCall = cloudSync.endCollaborationSession(sessionId);
      await firstSyncStarted;

      // While the first call is still running, trigger a second call
      const secondCall = cloudSync.endCollaborationSession(sessionId);
      await secondCall; // second call should return immediately (no-op)

      // The second call must not have triggered another syncProject
      expect(syncMock).toHaveBeenCalledTimes(1);

      // Release the first call and let it finish
      releaseFirstSync();
      await firstCall;
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete session lifecycle', async () => {
      vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 5,
        bytesSync: 1024,
        conflictsDetected: 0,
        conflictsResolved: 0,
        duration: 100,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-123',
        projectId,
      });

      // Start: Session has 2 participants
      let session = cloudSync.getCollaborationSession(projectId);
      expect(session?.participants).toHaveLength(2);
      expect(session?.status).toBe('active');

      // User 1 leaves
      await cloudSync.leaveCollaborationSession(sessionId, userId1);
      session = cloudSync.getCollaborationSession(projectId);
      expect(session?.participants).toHaveLength(1);
      expect(session?.status).toBe('active'); // Still active with 1 user

      // User 2 leaves (last one)
      await cloudSync.leaveCollaborationSession(sessionId, userId2);
      session = cloudSync.getCollaborationSession(projectId);
      expect(session).toBeNull(); // Session should be ended
    });

    it('should sync all pending changes when ending session', async () => {
      const syncSpy = vi.spyOn(cloudSync, 'syncProject').mockResolvedValue({
        success: true,
        filesSync: 15,
        bytesSync: 4096,
        conflictsDetected: 3,
        conflictsResolved: 3,
        duration: 500,
        timestamp: Date.now(),
      });

      vi.spyOn(cloudSync, 'broadcastChange').mockResolvedValue(undefined);
      vi.spyOn(cloudSync as any, 'createSnapshot').mockResolvedValue({
        id: 'snapshot-final',
        projectId,
      });

      await cloudSync.endCollaborationSession(sessionId);

      // Verify sync was called with bidirectional mode
      expect(syncSpy).toHaveBeenCalledWith(projectId, 'bidirectional');
      
      // Verify sync result indicates all changes were processed
      const syncResult = await syncSpy.mock.results[0].value;
      expect(syncResult.filesSync).toBe(15);
      expect(syncResult.conflictsResolved).toBe(3);
    });
  });
});
