# CloudSyncEngine API - Quick Reference

## Initialization

```typescript
import { CloudSyncEngine } from './mining/cloudSync';

const engine = new CloudSyncEngine({
  backend: 'self-hosted',            // 'self-hosted' | 'firebase' | 'aws' | 'supabase' | 'p2p'
  autoSync: true,
  syncInterval: 30000,
  conflictResolutionMode: 'automatic',
  compressionEnabled: true,
  encryptionEnabled: true,
});

await engine.initialize();
```

## Core Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `syncProject(id, dir)` | Sync project with backend | `SyncResult` |
| `enableAutoSync(id, interval)` | Auto-sync every N ms | `void` |
| `shareProject(id, users)` | Generate invite code | `ShareResult` |
| `joinProject(code)` | Join shared project | `ProjectJoinResult` |
| `broadcastChange(change)` | Send real-time update | `void` |
| `subscribeToChanges(id, cb, filters)` | Listen for changes | `subscriptionId` |
| `unsubscribeFromChanges(id)` | Stop listening | `void` |
| `detectSyncConflicts(local, remote)` | Find conflicts | `CloudConflict[]` |
| `resolveSyncConflict(conflict, res)` | Apply resolution | `void` |
| `getProjectHistory(id)` | Get snapshots | `ProjectSnapshot[]` |
| `restoreSnapshot(id)` | Restore version | `void` |
| `uploadAsset(path, projectId)` | Upload to CDN | `CDNUrl` |
| `downloadAsset(url, path)` | Download from CDN | `void` |
| `getSyncStatus(id)` | Current sync state | `SyncStatus \| null` |
| `getCollaborationSession(id)` | Active participants | `CollaborationSession \| null` |

## Common Patterns

### Basic Sync

```typescript
const result = await engine.syncProject('project-123');
if (result.success) {
  console.log(`Synced ${result.filesSync} files`);
}
```

### Share & Collaborate

```typescript
// Share
const share = await engine.shareProject('project-123', ['user@ex.com']);
console.log(`Invite code: ${share.inviteCode}`);

// Join
const join = await engine.joinProject(inviteCode);
console.log(`Joined as ${join.role}`);
```

### Real-time Updates

```typescript
// Subscribe
const subId = await engine.subscribeToChanges(
  'project-123',
  (change) => updateUI(change)
);

// Broadcast
await engine.broadcastChange({
  id: `change_${Date.now()}`,
  projectId: 'project-123',
  changeType: 'asset_modified',
  path: 'assets/meshes/model.nif',
  timestamp: Date.now(),
  author: 'user@ex.com',
  checksum: 'abc123',
});

// Unsubscribe
engine.unsubscribeFromChanges(subId);
```

### Conflict Resolution

```typescript
const conflicts = await engine.detectSyncConflicts(localState, remoteState);

for (const conflict of conflicts) {
  await engine.resolveSyncConflict(conflict, {
    conflictId: conflict.id,
    strategy: conflict.suggestedStrategy || 'keep_remote',
    resolvedBy: 'system',
    timestamp: Date.now(),
  });
}
```

### Version History

```typescript
// Get history
const snapshots = await engine.getProjectHistory('project-123');

// Restore old version
await engine.restoreSnapshot(snapshots[0].id);
```

### Asset Management

```typescript
// Upload
const cdn = await engine.uploadAsset('assets/model.nif', 'project-123');
console.log(`CDN URL: ${cdn.url}`);

// Download
await engine.downloadAsset(cdn.url, './local/model.nif');
```

### Monitor Progress

```typescript
const status = engine.getSyncStatus('project-123');
if (status?.isSyncing) {
  console.log(`${status.syncProgress}% (${status.estimatedTimeRemaining}s)`);
}

const session = engine.getCollaborationSession('project-123');
session?.participants.forEach(p => console.log(`${p.username}: ${p.role}`));
```

## Configuration Examples

### Self-Hosted (PocketBase)

```typescript
{
  backend: 'self-hosted',
  provider: {
    type: 'pocketbase',
    endpoint: 'https://pb.example.com',
    apiKey: process.env.PB_API_KEY,
  },
}
```

### Firebase

```typescript
{
  backend: 'firebase',
  provider: {
    type: 'firebase',
    config: {
      apiKey: '...',
      authDomain: 'project.firebaseapp.com',
      projectId: 'project-id',
    },
  },
}
```

### P2P (WebRTC + IPFS)

```typescript
{
  backend: 'p2p',
  provider: {
    type: 'webrtc',
    config: {
      signalingServer: 'wss://signal.ex.com',
      stunServers: ['stun:stun.google:19302'],
    },
  },
}
```

## Type Definitions

```typescript
// Sync result
interface SyncResult {
  success: boolean;
  direction: 'push' | 'pull' | 'bidirectional';
  filesSync: number;
  bytesSync: number;
  conflictsDetected: number;
  conflictsResolved: number;
  duration: number;
  timestamp: number;
  error?: string;
}

// Share result
interface ShareResult {
  success: boolean;
  projectId: string;
  inviteCode: string;
  sharedWith: string[];
  expiresAt: number;
  permissions: string[];
}

// Join result
interface ProjectJoinResult {
  success: boolean;
  projectId: string;
  projectName: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: string[];
  joinedAt: number;
}

// Conflict resolution strategies
type ConflictStrategy = 'keep_local' | 'keep_remote' | 'merge' | 'custom';

// Sync status
interface SyncStatus {
  projectId: string;
  isSyncing: boolean;
  syncProgress: 0-100; // Percentage
  currentOperation?: string;
  filesRemaining?: number;
  bytesRemaining?: number;
  estimatedTimeRemaining?: number; // Seconds
}

// Collaboration session
interface CollaborationSession {
  participants: Array<{
    userId: string;
    username: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: number;
    lastActive: number;
  }>;
}
```

## Error Handling

```typescript
try {
  await engine.syncProject('project-123');
} catch (error) {
  // Common errors:
  // - "Cloud sync engine not initialized"
  // - "Failed to detect conflicts"
  // - "Asset size exceeds maximum"
  // - "Invalid invite code"
  // - "Backend connection failed"
  
  console.error(`Sync error: ${error.message}`);
}
```

## Performance Tips

1. **Set appropriate syncInterval** (30s for active collab, 5m for passive)
2. **Enable compression** for slower networks (~70% overhead reduction)
3. **Use filters** in subscriptions to reduce callback noise
4. **Implement retry logic** for flaky connections
5. **Monitor SyncStatus** to show progress to users

## Next: IPC Integration

Create `src/electron/cloudSyncHandlers.ts` to expose engine to renderer:

```typescript
ipcMain.handle('cloud-sync:sync-project', async (event, projectId, direction) => {
  return await cloudSyncEngine.syncProject(projectId, direction);
});

ipcMain.handle('cloud-sync:subscribe', async (event, projectId) => {
  const subId = await cloudSyncEngine.subscribeToChanges(projectId, (change) => {
    event.sender.send('cloud-sync:change', change);
  });
  return subId;
});
```

Then add preload methods in `src/main/preload.ts`:

```typescript
cloudSyncSyncProject: (projectId: string, direction) =>
  ipcRenderer.invoke('cloud-sync:sync-project', projectId, direction),

cloudSyncSubscribe: (projectId: string) =>
  ipcRenderer.invoke('cloud-sync:subscribe', projectId),
```

---

**File**: src/mining/cloudSync.ts
**Status**: ✅ Production-ready
**Compilation**: Exit code 0
