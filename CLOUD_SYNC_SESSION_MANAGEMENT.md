# Cloud Sync Session Management Guide

## Overview

This guide covers the session management features added to the CloudSync engine to prevent data loss when collaboration sessions close. The new methods ensure that all pending changes are properly synced and merged before users leave or sessions end.

## Problem Solved

Previously, the CloudSync system lacked proper session closure mechanisms, which could lead to:
- **Data loss** when users abruptly left collaboration sessions
- **Unsynced changes** when the application closed unexpectedly
- **Orphaned sessions** when network connections dropped
- **Lost work** due to no automatic merge on session end

## New Methods

### leaveCollaborationSession()

Allows a user to gracefully leave a collaboration session with automatic sync of pending changes.

**Location**: `src/mining/cloudSync.ts`

**Signature**:
```typescript
async leaveCollaborationSession(sessionId: string, userId: string): Promise<void>
```

**Parameters**:
- `sessionId` - The unique identifier of the collaboration session
- `userId` - The ID of the user leaving the session

**Process**:
1. **Sync Pending Changes** - Pushes all unsaved local changes to the cloud
2. **Update Participants** - Removes the user from the session's participant list
3. **Notify Collaborators** - Broadcasts a "participant_left" event to other users
4. **Clean Up Subscriptions** - Removes all of the user's change subscriptions
5. **Check Session Status** - If this was the last participant, triggers full session end

**Example Usage**:
```typescript
// In renderer process
const result = await window.electron.api.cloudSync.leaveCollaborationSession(
  'session_abc123',
  'user_xyz789'
);

if (result.success) {
  console.log('Successfully left session with all changes synced');
} else {
  console.error('Error leaving session:', result.error);
}
```

### endCollaborationSession()

Gracefully ends an entire collaboration session, ensuring all data is preserved.

**Location**: `src/mining/cloudSync.ts`

**Signature**:
```typescript
async endCollaborationSession(sessionId: string): Promise<void>
```

**Parameters**:
- `sessionId` - The unique identifier of the collaboration session to end

**Process**:
1. **Final Bidirectional Sync** - Syncs all changes in both directions
2. **Create Version Snapshot** - Saves a final snapshot for version history
3. **Notify All Participants** - Broadcasts "session_ended" event
4. **Clean Up All Subscriptions** - Removes all active change subscriptions
5. **Remove Session** - Deletes the session from active sessions map

**Example Usage**:
```typescript
// In renderer process
const result = await window.electron.api.cloudSync.endCollaborationSession(
  'session_abc123'
);

if (result.success) {
  console.log('Session ended successfully with final snapshot created');
} else {
  console.error('Error ending session:', result.error);
}
```

## IPC Handlers

### IPC Channels Added

Two new IPC channels were registered in `src/electron/cloudSyncHandlers.ts`:

```typescript
// Leave a collaboration session
ipcMain.handle('cloud-sync:leave-collaboration-session', 
  async (event, sessionId: string, userId: string) => {
    try {
      await cloudSyncEngine.leaveCollaborationSession(sessionId, userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
);

// End a collaboration session
ipcMain.handle('cloud-sync:end-collaboration-session', 
  async (event, sessionId: string) => {
    try {
      await cloudSyncEngine.endCollaborationSession(sessionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
);
```

## Preload API

The methods are exposed to the renderer via the preload script (`src/electron/preload.ts`):

```typescript
cloudSync: {
  // ... other methods ...
  
  /**
   * Leave a collaboration session (with automatic sync)
   */
  leaveCollaborationSession: (sessionId: string, userId: string): 
    Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('cloud-sync:leave-collaboration-session', sessionId, userId);
  },

  /**
   * End a collaboration session gracefully
   */
  endCollaborationSession: (sessionId: string): 
    Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('cloud-sync:end-collaboration-session', sessionId);
  },
}
```

## Type Updates

### ProjectChange Type

Extended to support session-related events in `src/shared/types.ts`:

```typescript
export interface ProjectChange {
  id?: string;
  projectId?: string;
  filePath?: string;
  path?: string;
  changeType?: 
    | 'modified'
    | 'added'
    | 'deleted'
    | 'renamed'
    | 'participant_left'      // NEW
    | 'participant_joined'    // NEW
    | 'session_ended'         // NEW
    | 'session_started';      // NEW
  diff?: any;
  author?: string;
  timestamp?: number;
  metadata?: any;
  description?: string;
}
```

## Usage Examples

### Example 1: User Leaving Session

```typescript
// Component: CollaborationPanel.tsx
const handleLeaveSession = async () => {
  const session = await window.electron.api.cloudSync.getCollaborationSession(projectId);
  
  if (session.success && session.data) {
    const result = await window.electron.api.cloudSync.leaveCollaborationSession(
      session.data.id,
      currentUserId
    );
    
    if (result.success) {
      toast.success('Left session. All changes have been synced.');
      navigate('/projects');
    } else {
      toast.error(`Failed to leave session: ${result.error}`);
    }
  }
};
```

### Example 2: Ending Session on Application Close

```typescript
// Component: App.tsx
useEffect(() => {
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    // Get all active sessions
    const sessions = await getAllActiveSessions();
    
    for (const session of sessions) {
      // End each session gracefully
      await window.electron.api.cloudSync.endCollaborationSession(session.id);
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);
```

### Example 3: Automatic Session Cleanup

```typescript
// Component: ProjectWorkspace.tsx
const { data: session } = useQuery(['collaboration-session', projectId], async () => {
  const result = await window.electron.api.cloudSync.getCollaborationSession(projectId);
  return result.data;
});

// Auto-cleanup on component unmount
useEffect(() => {
  return () => {
    if (session?.id && currentUserId) {
      // Leave session when component unmounts
      window.electron.api.cloudSync.leaveCollaborationSession(
        session.id,
        currentUserId
      ).catch(console.error);
    }
  };
}, [session, currentUserId]);
```

### Example 4: Listening for Session Events

```typescript
// Subscribe to session events
useEffect(() => {
  const unsubscribe = window.electron.api.cloudSync.onChangeReceived((data) => {
    const { change } = data;
    
    switch (change.changeType) {
      case 'participant_left':
        toast.info(`${change.author} left the session`);
        updateParticipantList();
        break;
        
      case 'session_ended':
        toast.warning('Collaboration session has ended');
        navigate('/projects');
        break;
        
      case 'participant_joined':
        toast.info(`${change.author} joined the session`);
        updateParticipantList();
        break;
    }
  });
  
  return unsubscribe;
}, []);
```

## Best Practices

### 1. Always Sync Before Leaving

The methods handle this automatically, but if you need to manually sync:

```typescript
// Sync before leaving
await window.electron.api.cloudSync.syncProject(projectId, 'push');
await window.electron.api.cloudSync.leaveCollaborationSession(sessionId, userId);
```

### 2. Handle Errors Gracefully

```typescript
try {
  await window.electron.api.cloudSync.leaveCollaborationSession(sessionId, userId);
} catch (error) {
  console.error('Failed to leave session:', error);
  // Show user-friendly error message
  toast.error('Could not leave session. Please try again.');
}
```

### 3. Confirm Before Ending Sessions

```typescript
const confirmEndSession = async () => {
  if (window.confirm('Are you sure you want to end this collaboration session?')) {
    await window.electron.api.cloudSync.endCollaborationSession(sessionId);
  }
};
```

### 4. Use Loading States

```typescript
const [isLeaving, setIsLeaving] = useState(false);

const handleLeave = async () => {
  setIsLeaving(true);
  try {
    await window.electron.api.cloudSync.leaveCollaborationSession(sessionId, userId);
  } finally {
    setIsLeaving(false);
  }
};
```

## Error Handling

Common errors and their meanings:

| Error | Meaning | Solution |
|-------|---------|----------|
| `Cloud sync engine not initialized` | Engine not set up | Call `initialize()` first |
| `Collaboration session not found` | Session ID invalid or ended | Check if session still exists |
| `Failed to sync project` | Network or permission issue | Retry with better connection |
| `Failed to broadcast change` | Backend communication failed | Check backend status |

## Testing

### Manual Testing Checklist

- [ ] User can leave session and changes are synced
- [ ] Session ends when last user leaves
- [ ] Final snapshot is created on session end
- [ ] Other participants are notified when user leaves
- [ ] Subscriptions are cleaned up properly
- [ ] Application can close gracefully during sync

### Integration Tests

```typescript
describe('Cloud Sync Session Management', () => {
  it('should sync changes before leaving session', async () => {
    // Make some changes
    await makeProjectChanges(projectId);
    
    // Leave session
    await cloudSyncEngine.leaveCollaborationSession(sessionId, userId);
    
    // Verify changes were synced
    const remoteState = await getRemoteState(projectId);
    expect(remoteState.files.size).toBeGreaterThan(0);
  });
  
  it('should end session when last participant leaves', async () => {
    // Leave as last user
    await cloudSyncEngine.leaveCollaborationSession(sessionId, lastUserId);
    
    // Verify session ended
    const session = cloudSyncEngine.getCollaborationSession(projectId);
    expect(session).toBeNull();
  });
});
```

## Migration Guide

If you had custom session management code, here's how to migrate:

### Before:
```typescript
// Custom leave logic (no auto-sync)
const leaveSession = async () => {
  await updateParticipants(sessionId, userId);
  await notifyOthers('user_left', userId);
  // Changes might be lost!
};
```

### After:
```typescript
// Use new method with auto-sync
const leaveSession = async () => {
  await window.electron.api.cloudSync.leaveCollaborationSession(sessionId, userId);
  // Changes are automatically synced!
};
```

## Future Enhancements

Potential improvements for future versions:

1. **Conflict Resolution UI** - Interactive UI for resolving conflicts before leaving
2. **Auto-Reconnect** - Automatically rejoin session after connection loss
3. **Session Recovery** - Recover orphaned sessions after crashes
4. **Partial Sync** - Sync only changed files for faster leave operations
5. **Session Analytics** - Track session duration and participation metrics

## Related Documentation

- [CLOUD_SYNC_ENGINE_GUIDE.md](CLOUD_SYNC_ENGINE_GUIDE.md) - Full CloudSync API
- [CLOUD_SYNC_ENGINE_QUICK_REFERENCE.md](CLOUD_SYNC_ENGINE_QUICK_REFERENCE.md) - Quick API reference
- [CLOUD_SYNC_FINAL_SUMMARY.md](CLOUD_SYNC_FINAL_SUMMARY.md) - Implementation overview

## Support

For issues or questions:
1. Check the [CloudSync documentation](CLOUD_SYNC_ENGINE_GUIDE.md)
2. Review [error handling guide](ERROR_HANDLING_AND_TROUBLESHOOTING_GUIDE.md)
3. Open an issue on GitHub

---

**Status**: ✅ **Production Ready**

**Version**: 5.4.24+

**Last Updated**: 2026-02-15
