# Update Notification System

## Overview

The Update Notification System automatically checks for new app versions and notifies users when updates are available. It fetches the latest release information from GitHub and displays a styled modal with version details and release notes.

## Features

- ✅ **Automatic Update Checking**: Checks for updates on app startup and periodically (every 24 hours)
- ✅ **GitHub Integration**: Fetches latest release from GitHub repository
- ✅ **Version Comparison**: Smart semantic version comparison (e.g., 3.0.0 vs 3.1.0)
- ✅ **Release Notes Display**: Shows release notes from GitHub
- ✅ **User Control**: Users can dismiss the update notification
- ✅ **Session Persistence**: Won't show update modal again in the same session if dismissed
- ✅ **Fallout Terminal Theme**: Matches the app's retro-futuristic styling

## Files

### Components
- **[UpdateNotifier.tsx](src/renderer/src/UpdateNotifier.tsx)**: Main React component that displays the update modal
  - Fetches current version from package.json
  - Uses GitHub release checker to find updates
  - Displays version comparison and release notes
  - Provides Download and Later buttons

### Utilities
- **[githubReleaseChecker.ts](src/renderer/src/utils/githubReleaseChecker.ts)**: GitHub API integration
  - Fetches latest release from repository
  - Extracts version information from git tags
  - Compares versions to determine if update is available
  - Provides release notes from GitHub

- **[versionUtils.ts](src/renderer/src/utils/versionUtils.ts)**: Version handling utilities
  - `compareVersions()`: Compares semantic versions
  - `isNewerVersionAvailable()`: Checks if newer version exists
  - `parseVersion()`: Parses version strings
  - `getCurrentVersion()`: Reads current version from package.json

## Architecture

```
UpdateNotifier (React Component)
    ├── Calls GitHub Release Checker
    │   └── Fetches from: https://api.github.com/repos/POINTYTHRUNDRA654/desktop-tutorial/releases/latest
    ├── Uses Version Utils for comparison
    ├── Stores state in localStorage
    └── Displays modal with:
        ├── Current version
        ├── Latest version
        ├── Release notes
        └── Download button
```

## How It Works

1. **Initialization** (App startup):
   - UpdateNotifier component mounts
   - Checks localStorage for `mossy_update_dismissed` flag
   - If not dismissed in session, proceeds to check for updates

2. **Version Check**:
   - Fetches current version from package.json
   - Calls GitHub API to get latest release
   - Compares versions using semantic versioning rules
   - If newer version available and not dismissed, shows modal

3. **User Interaction**:
   - **Download**: Opens GitHub release page in new tab
   - **Later**: Dismisses modal and sets `mossy_update_dismissed` flag in localStorage
   - **Close (X)**: Same as Later button

4. **Periodic Checking**:
   - Checks again after 24 hours
   - localStorage flag is reset each session

## Configuration

### Current Settings
- **Repository**: `POINTYTHRUNDRA654/desktop-tutorial`
- **Check Interval**: 24 hours
- **Skips**: Draft and pre-release versions (only stable releases trigger notifications)

### Customization

To change the repository:
1. Edit [githubReleaseChecker.ts](src/renderer/src/utils/githubReleaseChecker.ts), line 10:
```typescript
const GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPO';
```

To change check interval in [UpdateNotifier.tsx](src/renderer/src/UpdateNotifier.tsx):
```typescript
const interval = setInterval(checkForUpdates_, 24 * 60 * 60 * 1000); // Change 24 to desired hours
```

## Integration

The UpdateNotifier is automatically integrated into the main app in [App.tsx](src/renderer/src/App.tsx):

```tsx
import UpdateNotifier from './UpdateNotifier';

// Inside App component return:
<ErrorBoundary>
  <LiveProvider>
    <OpenAIVoiceProvider>
      <PipBoyFrame>
        {renderAppContent()}
      </PipBoyFrame>
      <UpdateNotifier />
    </OpenAIVoiceProvider>
  </LiveProvider>
</ErrorBoundary>
```

## UI/UX Design

### Modal Styling
- **Theme**: Fallout terminal green (#00ff00, #00d000) with dark background
- **Border**: 2px solid green with glowing shadow effect
- **Content**:
  - Header with AlertCircle icon and title
  - Version comparison display
  - Release notes preview (first 500 characters)
  - Action buttons (Download, Later)

### User Experience
- Non-blocking modal overlay
- High z-index (10000) ensures visibility
- Dismissible by clicking X, Later button, or Download
- Session-persistent dismissal

## Error Handling

- **Network Errors**: Silently logged to console, no modal shown
- **Missing package.json**: Returns version "0.0.0"
- **GitHub API Failures**: Returns null, no update notification
- **Version Parse Errors**: Gracefully handles malformed versions

## Testing

### Manual Testing
1. Start app and check browser console for update check messages
2. Dismiss update modal and verify `mossy_update_dismissed` in localStorage
3. Refresh app and verify modal doesn't reappear in same session
4. Wait 24+ hours (or modify interval) to see periodic checks
5. Check GitHub releases and verify correct version comparison

### Version Comparison Examples
- Current: 3.0.0, Latest: 3.1.0 → Update available ✓
- Current: 3.1.0, Latest: 3.0.5 → No update ✓
- Current: 3.0.0, Latest: 3.0.0 → No update ✓
- Current: 2.9.9, Latest: 3.0.0 → Update available ✓

## Future Enhancements

Potential improvements:
- [ ] Add electron-updater for automatic background downloads
- [ ] Implement delta updates for faster downloads
- [ ] Add "skip this version" option
- [ ] Display update progress/download status
- [ ] Support multiple update channels (stable, beta, nightly)
- [ ] Add update changelog with detailed changes
- [ ] Implement auto-update on app restart
- [ ] Add notification badge to sidebar
- [ ] Track update metrics (dismissals, downloads)

## Troubleshooting

**Modal not showing**:
- Check localStorage: `localStorage.getItem('mossy_update_dismissed')`
- Clear with: `localStorage.removeItem('mossy_update_dismissed')`
- Check GitHub releases exist and are not drafts/pre-releases

**Incorrect version detected**:
- Verify package.json has correct version field
- Check GitHub tags use format: `v3.0.0` (with 'v' prefix)

**GitHub API rate limiting**:
- GitHub allows 60 requests/hour for unauthenticated requests
- Consider adding authentication token if issues persist

## Related Files
- [package.json](package.json) - Current app version
- [App.tsx](src/renderer/src/App.tsx) - Main app component
- [vite.config.ts](vite.config.ts) - Build configuration
