# Mossy Onboarding & Privacy System

## Overview

When users download and launch Mossy for the first time, they're greeted with a comprehensive 4-step onboarding tutorial that sets up their installation with privacy at the forefront. This document explains the system architecture and how it works.

## Onboarding Flow

### Step 1: Welcome to Mossy
**Purpose:** Introduce the user to Mossy and set expectations for the setup process.

**Content:**
- Greeting from Mossy as their AI assistant for Fallout 4 modding
- Overview of the 4 setup steps
- Emphasis that privacy and security are top priorities

**Technical Details:**
- Component: `MossyOnboarding.tsx`
- This step is informational and doesn't require user input

### Step 2: Connect Your Tools
**Purpose:** Allow users to select which modding tools they have installed.

**Available Tools:**
- **Creation Tools:**
  - Creation Kit - Fallout 4 Creation Kit for worldspace and quest editing
  - xEdit - Advanced record editor and cleaning tool
  - Blender - 3D modeling and mesh creation
  - NifSkope - NIF file editor for mesh optimization
  - Papyrus Compiler - Fallout 4 script compilation

- **Mod Tools:**
  - Wrye Bash - Mod management and conflict resolution

**Features:**
- Users can toggle each tool they have installed
- Selections are saved to localStorage as `mossy_connections`
- Tools can be added/removed later from Settings
- Each tool has an icon and description

**Implementation:**
```tsx
const [connections, setConnections] = useState<ConnectionChoice[]>([...]);

const toggleConnection = (id: string) => {
  setConnections(connections.map(c => 
    c.id === id ? { ...c, selected: !c.selected } : c
  ));
};
```

### Step 3: Your Privacy Settings
**Purpose:** Allow users to control how their data is stored and shared.

**Privacy Tiers:**

#### Tier 1: Data Storage (Always On)
- **Keep All Data Local** - Default enabled
- All project data, conversations, and learning stays on the user's computer
- Nothing is sent to external servers
- Users control their own data completely

#### Tier 2: Knowledge Base Contributions (Opt-In)
- **Contribute to Knowledge Base** - Default disabled
  - Share script patterns, mesh techniques, and solutions with all Mossy users
  - Helps improve recommendations for the entire community
  - Only anonymized patterns are shared - no personal project data

#### Tier 3: Specific Sharing Patterns (Opt-In, Depends on Tier 2)
- **Share Script Patterns** - Default disabled
  - Contribute Papyrus script patterns and coding techniques
  - Requires "Contribute to Knowledge Base" to be enabled

- **Share Mesh Optimizations** - Default disabled
  - Share 3D mesh optimization methods discovered during work
  - Requires "Contribute to Knowledge Base" to be enabled

#### Tier 4: Quality & Support (Opt-In)
- **Share Bug Reports** - Default disabled
  - Send information about bugs and errors encountered
  - Helps fix issues faster for everyone
  - Bug reports are reviewed for privacy before analysis

**Privacy Promise:**
- Your data is yours - never sold or monetized
- Default privacy - permission requested before sharing anything
- Local first - computer is primary storage
- Transparent sharing - shared data is anonymized and reviewed

**Implementation:**
```tsx
interface PrivacySettings {
  keepLocalOnly: boolean;
  shareModProjectData: boolean;
  shareScriptPatterns: boolean;
  shareMeshOptimizations: boolean;
  shareBugReports: boolean;
  contributeToKnowledgeBase: boolean;
  allowAnalytics: boolean;
}

const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
  keepLocalOnly: true,      // Always true, always local
  shareModProjectData: false,
  shareScriptPatterns: false,
  shareMeshOptimizations: false,
  shareBugReports: false,
  contributeToKnowledgeBase: false,
  allowAnalytics: false
});
```

### Step 4: You're All Set!
**Purpose:** Confirm setup is complete and guide user to first steps.

**Content:**
- Summary of setup (tools connected, privacy configured)
- Confirmation that data is secure and user-controlled
- Next steps guide for first project
- Information about accessing settings later

**Features:**
- Shows count of connected tools
- Confirms privacy settings are in place
- Provides clear next steps for new users

## Settings Integration

### Privacy Settings Page
**Route:** `/settings/privacy`
**Component:** `PrivacySettings.tsx`

Users can access detailed privacy settings at any time from the Sidebar:
1. Click "Privacy Settings" in the sidebar
2. View current settings grouped by category
3. Toggle any setting (with dependency awareness)
4. Learn details about what each setting does
5. Export or delete their local data

**Features:**
- Group-based organization (Data Storage, Knowledge Base, Quality & Support)
- Learn More expandable sections explaining what gets shared
- Encryption status indicator
- Local storage size calculation
- Data export functionality
- Complete data deletion option

## Data Storage Architecture

### Local Storage Structure
```
localStorage keys saved by Mossy:
- mossy_onboarding_completed: 'true' | 'false'
- mossy_connections: JSON string of selected tools
- mossy_privacy_settings: JSON string of privacy preferences
- mossy_bridge_active: 'true' | 'false'
- mossy_pip_mode: 'true' | 'false'
- [Project data]: Stored locally only
- [Conversations]: Stored locally only
```

### What Stays Local vs. What Can Be Shared

**Always Local (Never Shared):**
- Project files and directories
- Personal modifications and configurations
- Individual mod details
- Conversation history with specific project context
- User preferences and settings
- Sensitive file paths

**Can Be Shared (If User Opts In):**
- Anonymized script patterns (without personal project context)
- Mesh optimization techniques (without specific model details)
- Bug reports (reviewed for privacy)
- General coding patterns and best practices
- Performance improvement techniques

**Example:**
- ❌ DON'T share: "User is working on a mod called 'Vault_111_Overhaul'"
- ✅ DO share: "Pattern: Using event listeners in Papyrus scripts improves performance by 15%"

## Implementation Details

### Onboarding Integration (App.tsx)
```tsx
const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('mossy_onboarding_completed');
  });

  if (showOnboarding) {
    return (
      <MossyOnboarding 
        onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('mossy_onboarding_completed', 'true');
        }}
      />
    );
  }
  // ... rest of app
};
```

### Settings Access (Sidebar.tsx)
```tsx
const navItems = [
  // ... other nav items
  { to: '/settings/privacy', icon: Settings, label: 'Privacy Settings' },
];
```

### Route Configuration (App.tsx)
```tsx
<Route path="/settings/privacy" element={<PrivacySettings />} />
```

## User Journey

### First-Time User
1. Launch app
2. See MossyOnboarding modal (can't dismiss until complete)
3. Go through 4 steps:
   - Learn about Mossy
   - Select tools
   - Configure privacy
   - Confirm setup
4. Settings saved to localStorage
5. App loads normally

### Returning User
1. Launch app
2. Check for `mossy_onboarding_completed` in localStorage
3. If present: Skip onboarding, load normally
4. If missing: Show onboarding again (can re-run setup)

### Accessing Privacy Settings Later
1. From sidebar, click "Privacy Settings"
2. View grouped settings with detailed descriptions
3. Toggle settings as needed
4. Changes save automatically
5. Data export/deletion available

## Privacy Guarantees

### For Users
- **Default Private:** All data stays local by default
- **Explicit Consent:** Must opt-in to any sharing
- **Transparent:** Know exactly what can be shared and why
- **Control:** Can change settings anytime
- **Irreversible Sharing:** Once data is shared anonymously, it can't be recalled (but future sharing can be disabled)

### For the Community
- **Collective Knowledge:** Shared patterns help all users
- **Anonymized Data:** No personal information in shared data
- **Reviewed:** Bug reports reviewed for privacy before processing
- **Improved Assistance:** Better knowledge base = better recommendations for everyone

## Technical Considerations

### Encryption
- Local data is encrypted at rest
- Encryption status shown in Privacy Settings

### Data Export
- Users can export their privacy settings and data
- Format: JSON file with timestamp and version

### Compliance
- No analytics by default (users can't enable this in v1)
- No tracking cookies
- No telemetry without explicit opt-in
- GDPR-compliant (user data controls, right to be forgotten via deletion)

## Future Enhancements

Potential additions to the privacy system:
1. Data sync across devices (encrypted, user-controlled)
2. Granular permission controls per tool
3. Anonymous usage statistics dashboard
4. Community contribution leaderboard (for those who opt-in)
5. Data anonymization audit reports
6. Scheduled automatic backups
7. Data retention policies configurable per category

## Testing the System

### Manual Testing
1. Clear localStorage: `localStorage.clear()`
2. Refresh page: Onboarding appears
3. Go through all 4 steps
4. Navigate to `/settings/privacy`
5. Toggle settings and verify they save
6. Refresh page: Settings should persist

### Verifying Privacy
1. Open DevTools → Application → Local Storage
2. Check keys for tool connections
3. Check keys for privacy settings
4. Verify no API keys or sensitive data stored
5. Verify no external API calls without user consent

## Support & Documentation

Users can:
- Access onboarding again via Settings → Help & Tutorial (future)
- Read detailed privacy policy
- Contact support about data handling
- Request data deletion
- Ask about specific data handling for their use case
