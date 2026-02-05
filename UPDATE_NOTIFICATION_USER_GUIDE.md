# Update Notification System - User Guide

## What Users Will See

When an update is available, users will see a modal notification on app startup that looks like this:

```
┌─────────────────────────────────────────────┐
│ ⚠️  UPDATE AVAILABLE                      [X]│
├─────────────────────────────────────────────┤
│                                             │
│ A new version of Mossy is available!       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Current Version: 3.0.0                  │ │
│ │ Latest Version:  3.1.0                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ RELEASE NOTES:                          │ │
│ │                                         │ │
│ │ - New AI features                       │ │
│ │ - Performance improvements              │ │
│ │ - Bug fixes                             │ │
│ │ - UI enhancements...                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────────────┐ ┌──────────────────┐  │
│ │ ⬇️  DOWNLOAD     │ │     LATER        │  │
│ └──────────────────┘ └──────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## User Interactions

### Option 1: Download Update
- Click **DOWNLOAD** button
- Opens GitHub releases page in new browser tab
- User can download and install latest version
- Modal closes automatically

### Option 2: Update Later
- Click **LATER** button
- Modal closes
- Won't see update notification again in current session
- Will check again next session or after 24 hours

### Option 3: Close Modal
- Click **[X]** button (top right)
- Same effect as LATER button
- Dismisses notification

## When You'll See It

The system checks for updates at these times:
1. ✓ **App Startup**: Every time you launch the app
2. ✓ **Periodically**: Every 24 hours while app is running

## Example Scenarios

### Scenario 1: Minor Update Available
```
Current Version: 3.0.5
Latest Version:  3.0.6
→ Update notification shown
```

### Scenario 2: Major Update Available
```
Current Version: 3.0.0
Latest Version:  3.1.0
→ Update notification shown
```

### Scenario 3: You're Running Latest
```
Current Version: 3.1.0
Latest Version:  3.1.0
→ No notification (you're up to date)
```

### Scenario 4: You're Running Newer (Dev Version)
```
Current Version: 3.2.0 (development)
Latest Version:  3.1.0 (stable)
→ No notification (current is newer)
```

## Privacy & Security

✓ **No Data Collection**: The system only reads your local app version
✓ **GitHub Only**: Only communicates with GitHub API
✓ **Transparent**: All version comparisons happen locally
✓ **Optional**: Users can dismiss and ignore updates
✓ **No Auto-Install**: Never installs updates automatically

## Troubleshooting for Users

### "I see an update notification but I don't want to update"
- Click the **LATER** button
- The notification will be dismissed for the current session
- If you restart the app, the notification will appear again

### "How do I stop seeing update notifications?"
- Currently, you'll see the notification on each app restart
- A future feature will add a "Skip This Version" option

### "The download link doesn't work"
- Check your internet connection
- The GitHub releases page should open in your browser
- If it doesn't work, you can manually visit: 
  `https://github.com/POINTYTHRUNDRA654/desktop-tutorial/releases`

## For Developers

### Testing the Update System

1. **Simulate an update check**:
   - Open browser DevTools (F12)
   - Check the Network tab to see GitHub API calls
   - Console should show successful version checks

2. **Force clear the dismissal**:
   ```javascript
   localStorage.removeItem('mossy_update_dismissed');
   location.reload();
   ```

3. **Check current version**:
   ```javascript
   fetch('/package.json').then(r => r.json()).then(p => console.log(p.version));
   ```

### Creating a Test Release on GitHub

To test the update notification:
1. Create a new GitHub release on your repo
2. Tag it with a version higher than current (e.g., `v3.1.0`)
3. Make sure it's not marked as "Draft" or "Pre-release"
4. The app will detect it within 24 hours or on next restart

---

**Summary**: Users get automatic notifications when updates are available, with simple options to download or dismiss the notification. The system is transparent, secure, and respects user choice.
