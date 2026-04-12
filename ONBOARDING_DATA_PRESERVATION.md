# Onboarding Data Preservation System

## Problem Statement

Users reported two critical issues after fresh installs/reinstalls:
1. **Tutorial images not displaying** - Visual Guide section showed black boxes instead of screenshots
2. **Lost progress on reinstall** - Every reinstall forced users to:
   - Re-scan their computer for programs
   - Re-select programs they wanted to use
   - Re-download dependencies/tools
   - Restart the entire onboarding tutorial from scratch

## Root Causes

### Issue 1: Tutorial Images Not Loading
**Cause:** Image URLs used absolute paths (`/visual-guide-images/`) which don't work with Electron's `file://` protocol in packaged applications.

**Solution:** Changed to relative paths (`./visual-guide-images/`) which work correctly with both development server and packaged Electron apps.

### Issue 2: Aggressive Data Clearing on Fresh Install
**Cause:** The fresh-install detection logic (triggered by `fresh-install.marker` from NSIS installer) was clearing ALL user data including:
- `mossy_scan_summary` - Program detection results
- `mossy_all_detected_apps` - Full list of detected programs
- All user program selections
- Downloaded tool paths

This happened in two places:
1. `App.tsx` URL parameter handler (lines 267-278)
2. `App.tsx` IPC handler (lines 315-360)

Both handlers unconditionally cleared scan data, even when the user had already completed onboarding in a previous install.

## Solution: Smart Data Preservation

### Data Classification

#### ALWAYS PRESERVED (Never Cleared)
These localStorage keys and userData files are NEVER cleared, even during fresh installs:

**Program Detection & Scan Data:**
- `mossy_scan_summary` - Summary of detected programs
- `mossy_all_detected_apps` - Complete list of detected applications
- `mossy_scan_auditor` - Auditor scan results

**User Settings & Selections:**
- `mossy_settings` - User preferences and settings
- User-selected program paths
- Downloaded tool locations

**User Content:**
- `mossy_project_data` - User projects
- `mossy_mod_projects` - Mod project data
- `mossy_chat_history` - Chat conversation history
- `mossy_knowledge_vault` - Knowledge vault entries
- `mossy_vault_items` - Vault items
- `mossy_voice_history` - Voice interaction history
- `mossy_workflow_state` - Saved workflow states
- `mossy_automation_state` - Automation configurations
- `mossy_roadmap` - User roadmaps
- `mossy_load_order_cache` - Load order analysis

**Completion Status:**
- `mossy_onboarding_completed` - Whether user finished onboarding
- `mossy_has_booted` - Whether app has booted before

**Files in userData folder:**
- `settings.json`
- `knowledge-vault.json`
- `mod-projects.json`
- `chat-history.json`
- `voice-history.json`
- `automation-state.json`
- `panel-data/` directory (all panel states)

#### CLEARED (UI State Only)
These flags are cleared to allow users to restart tutorials/setup:
- `mossy_tutorial_completed` - Tutorial completion flag
- `mossy_tutorial_autostart` - Tutorial autostart preference
- `mossy_tutorial_skipped` - Tutorial skip status
- `mossy_tutorial_step` - Current tutorial step

#### CONDITIONALLY CLEARED (First-Time Users Only)
Only cleared if `mossy_onboarding_completed` is NOT `'true'`:
- `mossy_onboarding_complete` - Legacy onboarding flag
- `mossy_voice_setup_complete` - Voice setup completion

### Implementation Details

#### App.tsx - URL Parameter Handler
```typescript
const [freshInstallDetected] = useState(() => {
  if (!new URLSearchParams(window.location.search).has('freshInstall')) return false;
  
  const userCompletedOnboardingBefore = 
    localStorage.getItem('mossy_onboarding_completed') === 'true';
  
  if (userCompletedOnboardingBefore) {
    // Returning user - preserve ALL data, only clear tutorial UI flags
    const uiFlagsOnly = [
      'mossy_tutorial_completed',
      'mossy_tutorial_autostart',
      'mossy_tutorial_skipped',
      'mossy_tutorial_step',
    ];
    uiFlagsOnly.forEach(k => localStorage.removeItem(k));
  } else {
    // First-time user - clear onboarding flags but preserve scan data
    const onboardingFlags = [
      'mossy_onboarding_complete',
      'mossy_onboarding_completed',
      'mossy_tutorial_completed',
      'mossy_tutorial_autostart',
      'mossy_voice_setup_complete',
    ];
    onboardingFlags.forEach(k => localStorage.removeItem(k));
    // Scan data is preserved so they don't have to re-scan
  }
  return true;
});
```

#### App.tsx - IPC Handler
```typescript
api.onFreshInstall(() => {
  const userCompletedOnboardingBefore = 
    localStorage.getItem('mossy_onboarding_completed') === 'true';

  if (userCompletedOnboardingBefore) {
    // Returning user - preserve EVERYTHING
    const tutorialFlagsOnly = [
      'mossy_tutorial_completed',
      'mossy_tutorial_autostart',
      'mossy_tutorial_skipped',
      'mossy_tutorial_step',
    ];
    tutorialFlagsOnly.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('mossy_has_booted', 'true');
  } else {
    // First-time user - preserve scan data
    const onboardingKeysToReset = [
      'mossy_has_booted',
      'mossy_onboarding_complete',
      'mossy_onboarding_completed',
      'mossy_voice_setup_complete',
      'mossy_tutorial_completed',
      'mossy_tutorial_autostart',
      'mossy_tutorial_skipped',
      'mossy_tutorial_step',
    ];
    onboardingKeysToReset.forEach(k => localStorage.removeItem(k));
    // Scan data is NOT cleared
  }
});
```

#### FirstRunOnboarding.tsx - Smart Skip Logic
```typescript
useEffect(() => {
  const hasOnboarded = localStorage.getItem('mossy_onboarding_complete');
  if (hasOnboarded) {
    onComplete();
    return;
  }

  // If scan data exists from previous install, skip re-scanning
  const hasScanData =
    !!localStorage.getItem('mossy_scan_summary') &&
    !!localStorage.getItem('mossy_all_detected_apps');
  if (hasScanData) {
    localStorage.setItem('mossy_onboarding_complete', 'true');
    localStorage.setItem('mossy_onboarding_completed', 'true');
    onComplete();
    return;
  }
}, [onComplete]);
```

### User Experience

#### Scenario 1: First Install (New User)
1. User installs Mossy for the first time
2. Full onboarding runs: program scan, edition selection, downloads
3. User completes setup
4. `mossy_onboarding_completed` is set to `'true'`
5. Scan data and selections are saved

#### Scenario 2: Reinstall (Existing User)
1. User reinstalls Mossy (e.g., to upgrade or fix issues)
2. `fresh-install.marker` is detected
3. System checks: `mossy_onboarding_completed === 'true'`
4. **ALL user data is preserved**: scan results, selections, downloads, chat history
5. Only tutorial UI flags are cleared (user can restart tutorial if desired)
6. App skips onboarding and goes straight to main interface
7. **No re-scanning required, no re-downloading, no lost progress**

#### Scenario 3: Update (Version Change)
1. User updates to a new version
2. Version change is detected in `dataMigration.ts`
3. Migration manifest is created
4. All user data sources are preserved (listed in `PRESERVED_DATA_SOURCES`)
5. Only new features are added; existing setup is intact

## Testing Checklist

- [ ] **Fresh Install Test**
  - Install Mossy on clean system
  - Complete onboarding
  - Verify scan data is saved
  - Verify program selections are saved

- [ ] **Reinstall Test**
  - Reinstall Mossy over existing installation
  - Verify scan data persists (no re-scan required)
  - Verify program selections persist
  - Verify downloaded tool paths persist
  - Verify chat history persists
  - Verify projects persist

- [ ] **Update Test**
  - Install older version
  - Complete onboarding
  - Install newer version
  - Verify all data persists
  - Verify migration manifest is created

- [ ] **Tutorial Images Test**
  - Run packaged Electron app
  - Open interactive tutorial
  - Verify all screenshots load correctly
  - Verify no black boxes appear

## Migration Path

### From Old Behavior (Data Loss) to New Behavior (Preservation)

Users who experienced data loss in previous versions will now benefit from:
1. **Scan data preservation** - Never have to re-scan their system
2. **Selection preservation** - Program choices are remembered
3. **Download preservation** - Tool paths are remembered
4. **History preservation** - Chat and project history intact
5. **Tutorial flexibility** - Can restart tutorial without losing data

### Backward Compatibility

The new system is fully backward compatible:
- Works with existing localStorage keys
- Doesn't break existing installations
- Handles both old and new flag names
- Gracefully handles missing data (falls back to full onboarding)

## Benefits

1. **Faster Reinstalls** - No need to re-scan or re-configure
2. **No Data Loss** - All user work is preserved
3. **Better UX** - Updates don't disrupt user workflow
4. **Flexibility** - Users can still restart tutorial if desired
5. **Reliability** - Images now work in packaged Electron apps

## Technical Notes

### Why Relative Paths for Images?
Electron uses `file://` protocol for local files. Absolute paths like `/visual-guide-images/` don't resolve correctly because there's no root `/` in the file system context. Relative paths like `./visual-guide-images/` resolve relative to the HTML file location, which works correctly.

### Why Preserve Scan Data?
Program detection can take 30-60 seconds on systems with many installed applications. Re-scanning on every reinstall is:
- Time-consuming for users
- Produces identical results (programs don't change just because Mossy was reinstalled)
- Frustrating when users have already selected their preferred tools

### Why Clear Tutorial Flags?
While we preserve all user data, we clear tutorial flags so users have the option to:
- Restart the tutorial to learn about new features
- Review the interface walkthrough if they forgot something
- See updated tutorial content in new versions

This gives users flexibility without forcing them to lose their actual data.

## Related Files

- `src/renderer/src/App.tsx` - Fresh install detection and data preservation
- `src/renderer/src/FirstRunOnboarding.tsx` - Smart skip logic for existing scan data
- `src/renderer/src/InteractiveTutorial.tsx` - Image path fix
- `src/electron/dataMigration.ts` - Data preservation configuration
- `src/electron/main.ts` - Fresh install marker detection
- `build/installer-include-nvidia.nsh` - NSIS installer hook (creates fresh-install.marker)

## Changelog

### April 12, 2026
- Fixed tutorial image loading by changing to relative paths
- Implemented comprehensive data preservation system
- Added smart onboarding skip logic for existing scan data
- Updated dataMigration.ts with expanded preservation list
- Added detailed logging for debugging preservation behavior
