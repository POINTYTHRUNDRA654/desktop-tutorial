# Mossy Privacy-First Architecture Document

## Executive Summary

Mossy implements a privacy-first architecture where:
- **Local-first**: All data stays on user's computer by default
- **Opt-in sharing**: Users explicitly choose what to share
- **Anonymized patterns**: Shared data contains no personal information
- **User control**: Privacy settings always in user's hands
- **Transparent**: Users know exactly what's stored and shared

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mossy Frontend (React)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ MossyOnboarding    │  │ PrivacySettings    │                 │
│  │                    │  │                    │                 │
│  │ • Step 1: Welcome  │  │ • View settings    │                 │
│  │ • Step 2: Tools    │  │ • Toggle sharing   │                 │
│  │ • Step 3: Privacy  │  │ • Export data      │                 │
│  │ • Step 4: Ready    │  │ • Delete data      │                 │
│  └────────────────────┘  └────────────────────┘                 │
│           ↑                         ↑                            │
│           └────────┬────────────────┘                            │
│                    │                                             │
│        ┌───────────↓──────────────┐                             │
│        │ localStorage Management   │                             │
│        │                           │                             │
│        │ • mossy_privacy_settings │                             │
│        │ • mossy_connections      │                             │
│        │ • mossy_projects         │                             │
│        │ • mossy_conversations    │                             │
│        └───────────┬──────────────┘                             │
│                    │                                             │
└────────────────────┼─────────────────────────────────────────────┘
                     │
        ┌────────────↓────────────┐
        │  Data Access Control    │
        │                         │
        │  Check privacy settings │
        │  Before any operation   │
        └────────────┬────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
    ┌─────────────┐      ┌──────────────┐
    │ Local Only  │      │ Can Share?   │
    │ (Always)    │      │ (Opt-in)     │
    │             │      │              │
    │ • Projects  │      │ • Patterns   │
    │ • Chats     │      │ • Techniques │
    │ • Settings  │      │ • Bug fixes  │
    └─────────────┘      └──────┬───────┘
                                │
                       ┌────────↓─────────┐
                       │  Anonymizer      │
                       │                  │
                       │ Strip personal:  │
                       │ • Names          │
                       │ • Paths          │
                       │ • Mod details    │
                       │ • User info      │
                       └────────┬─────────┘
                                │
                       ┌────────↓──────────┐
                       │  Community KnowDB │
                       │  (Cloud)          │
                       │                   │
                       │ • Script patterns │
                       │ • Optimizations   │
                       │ • Solutions       │
                       └───────────────────┘
```

## File Structure

### Components
```
src/renderer/src/
├── MossyOnboarding.tsx           # 4-step onboarding modal
├── PrivacySettings.tsx           # Privacy settings page
├── ChatInterface.tsx             # Chat with privacy context
├── App.tsx                       # App with onboarding check
└── Sidebar.tsx                   # Navigation with privacy link
```

### Data Storage
```
localStorage/
├── mossy_onboarding_completed    # "true" | undefined
├── mossy_privacy_settings        # JSON PrivacySettings object
├── mossy_connections             # JSON ConnectionChoice[] array
├── mossy_bridge_active           # "true" | "false"
├── mossy_collected_patterns      # JSON CollectablePattern[] array
└── [project_data]                # User project files
```

### Types (Interface Definitions)
```typescript
// Privacy Settings - User's data sharing preferences
interface PrivacySettings {
  keepLocalOnly: boolean;          // Always true (enforced)
  shareModProjectData: boolean;    // Deprecated, always false
  shareScriptPatterns: boolean;    // Opt-in pattern sharing
  shareMeshOptimizations: boolean; // Opt-in technique sharing
  shareBugReports: boolean;        // Opt-in bug contributions
  contributeToKnowledgeBase: boolean; // Master toggle for KB
  allowAnalytics: boolean;         // Future: usage metrics
}

// Connection Choices - Selected modding tools
interface ConnectionChoice {
  id: string;                      // 'creation-kit', 'blender', etc.
  name: string;                    // Display name
  description: string;             // What tool does
  icon: React.ReactNode;           // Icon element
  category: string;                // 'Creation Tools' | 'Mod Tools'
  selected: boolean;               // User selected this
}

// Collectable Pattern - Data for knowledge base
interface CollectablePattern {
  type: 'script' | 'mesh' | 'bug' | 'optimization';
  pattern: unknown;                // The actual pattern data
  context: string;                 // Source of pattern
  timestamp: number;               // When collected
}
```

## Data Flow Diagrams

### Onboarding Flow
```
User launches app
       ↓
Check: localStorage.getItem('mossy_onboarding_completed')
       ├─ Missing → Show MossyOnboarding modal
       │           ↓
       │       Step 1: Welcome
       │       (user clicks Next)
       │           ↓
       │       Step 2: Select Tools
       │       (save to mossy_connections)
       │           ↓
       │       Step 3: Privacy Settings
       │       (save to mossy_privacy_settings)
       │           ↓
       │       Step 4: Confirm Setup
       │           ↓
       │       Set localStorage flag
       │       Show app
       │
       └─ Exists → Show app directly
```

### Data Sharing Flow
```
User modifies project
       ↓
Check privacy settings (mossy_privacy_settings)
       │
       ├─ keepLocalOnly = true
       │  └─ Store in localStorage ONLY
       │     (Never sent anywhere)
       │
       └─ shareScriptPatterns OR shareMeshOptimizations OR shareBugReports?
          ├─ NO → Store locally, don't share
          └─ YES → 
             ├─ Extract pattern from user action
             ├─ Store in mossy_collected_patterns
             ├─ Anonymize (remove personal info)
             ├─ On daily schedule: Upload to community KB
             └─ Cloud: Patterns available to all users
```

### Privacy Setting Toggle Flow
```
User clicks toggle in PrivacySettings
       ↓
Update state: prevSettings[key] = !prevSettings[key]
       ↓
localStorage.setItem('mossy_privacy_settings', JSON.stringify(new))
       ↓
Show "Saving..." indicator
       ↓
Show "Saved" confirmation (2 seconds)
       ↓
Next time user shares: New setting is respected
```

## Security Implementation

### Local Data Protection
- **Encryption**: Local data encrypted at rest
- **Browser Storage**: Uses localStorage (isolated per domain)
- **No Network**: Local data never leaves device unless explicitly shared
- **User Control**: Users can export or delete anytime

### Shared Data Protection
- **Anonymization**: Remove all identifiable information
  - No usernames
  - No file paths
  - No project names
  - No personal details

- **Pattern Extraction**: Only extract relevant technique
  - Keep: "Event listener improves performance 15%"
  - Remove: "In my mod 'XYZ' at path 'C:\Users\John\...'"

- **Data Verification**: Check shared data for privacy before storage
  - Reject if personal information detected
  - Log rejected patterns for review

### Audit Trail
```typescript
interface AuditLog {
  timestamp: number;
  action: 'collected' | 'anonymized' | 'uploaded' | 'shared' | 'deleted';
  dataType: string;
  result: 'success' | 'failed' | 'rejected';
  reason?: string;
}

// Stored in localStorage: mossy_audit_trail
```

## Privacy Compliance

### GDPR (General Data Protection Regulation)
- ✅ **Lawful basis**: User consent (Onboarding)
- ✅ **Data minimization**: Only collect necessary data
- ✅ **Transparency**: Clear disclosure in onboarding
- ✅ **User rights**: Can export, delete, change consent
- ✅ **Data processors**: Any services clearly labeled
- ✅ **DPA**: Data Processing Agreement with any third parties

### CCPA (California Consumer Privacy Act)
- ✅ **Disclosure**: Privacy Settings page explains data handling
- ✅ **Opt-out**: Users can disable all sharing
- ✅ **Right to delete**: "Delete All Data" button available
- ✅ **Right to know**: Users can see what's stored (in localStorage)
- ✅ **Right to export**: "Export My Data" button available
- ✅ **No selling**: Data is never sold to third parties

### HIPAA (if health data involved)
- Not applicable (modding doesn't involve health data)
- But architecture is HIPAA-compatible for future use

## Implementation Checklist

### Phase 1: Current (Completed)
- ✅ MossyOnboarding component (4 steps)
- ✅ PrivacySettings page with toggles
- ✅ localStorage persistence for settings
- ✅ Privacy Settings link in Sidebar
- ✅ Onboarding check in App.tsx
- ✅ Routes for all privacy pages

### Phase 2: Knowledge Collection (Ready to implement)
- ⭕ KnowledgeCollector class
- ⭕ Pattern extraction logic
- ⭕ Local pattern storage
- ⭕ Periodic collection (e.g., after user saves script)

### Phase 3: Anonymization (Ready to implement)
- ⭕ DataAnonymizer class
- ⭕ Remove project identifiers
- ⭕ Remove file paths
- ⭕ Remove usernames
- ⭕ Verify no personal data remains

### Phase 4: Upload & Sync (Requires backend)
- ⭕ KnowledgeUploader class
- ⭕ Upload to community database
- ⭕ Daily sync schedule
- ⭕ Retry logic for failed uploads
- ⭕ Conflict resolution

### Phase 5: Community Features (Future)
- ⭕ Pattern rating/voting
- ⭕ Most helpful techniques ranking
- ⭕ Community contributor stats (anonymized)
- ⭕ Knowledge base search/browsing
- ⭕ Pattern recommendations based on user's tools

## Testing Strategy

### Unit Tests
```typescript
// MossyOnboarding
- Can't navigate past step without completing
- Settings save to localStorage
- Onboarding_completed flag set after finish

// PrivacySettings
- Toggles update state
- Changes save to localStorage
- Dependent settings respect dependencies
- Data export works
- Data deletion clears localStorage

// Data Anonymization
- Remove project names
- Remove file paths
- Remove usernames
- Keep relevant patterns
- Verify no PII in output
```

### Integration Tests
```typescript
// Privacy Settings → App behavior
- Change setting to OFF
- Attempt to collect pattern
- Verify pattern not stored

- Change setting to ON
- Collect pattern
- Verify pattern stored and anonymized

// Onboarding → First app launch
- Clear localStorage
- Open app
- Verify onboarding shown
- Complete onboarding
- Refresh page
- Verify onboarding NOT shown
```

### Privacy Tests
```typescript
// Verify no data leakage
- Check network requests (should be none unless shared)
- Verify localStorage only (no cookies)
- Check browser console (no sensitive data logged)
- Verify export doesn't contain PII
- Verify shared patterns anonymized

// Edge cases
- Disabled sharing, then enable → Respects new setting
- Data collected before settings changed → Handled correctly
- Network failure during upload → Patterns stay local
- User deletes data mid-upload → Safe cleanup
```

## Deployment Considerations

### Before Public Release
- [ ] GDPR/CCPA legal review
- [ ] Privacy policy written and accessible
- [ ] Security audit of local storage
- [ ] Anonymization verified by privacy expert
- [ ] Backend infrastructure secured (if using cloud)
- [ ] Data encryption in transit verified
- [ ] Rate limiting on knowledge uploads
- [ ] DDoS protection on API endpoints

### Infrastructure
- Encrypted local storage (AES-256)
- TLS/HTTPS for all network traffic
- Server-side validation of anonymized data
- Regular security audits
- Incident response plan
- Data backup and recovery
- GDPR Data Processing Agreement with any processors

### Monitoring
- Count of patterns shared per type
- Failed uploads (retry logic)
- Rejected patterns (privacy violations)
- User privacy setting distribution
- Opt-in rates by feature
- Data export requests
- Data deletion requests

## Support & Maintenance

### User Support
- Explain privacy settings clearly
- Respond to privacy questions quickly
- Honor data deletion requests within 30 days
- Provide data export on request
- Maintain privacy policy transparency

### Developer Maintenance
- Regular security updates
- Anonymization logic reviews
- Audit trail analysis
- Community feedback on shared patterns
- Knowledge base quality monitoring

## Future Enhancements

### Advanced Privacy
- **Differential privacy**: Add mathematical noise to patterns
- **Federated learning**: Train on local data without uploading
- **Zero-knowledge proofs**: Verify patterns without seeing them

### User Controls
- **Granular permissions**: Per-tool sharing controls
- **Time-based sharing**: Temporarily disable sharing
- **Pattern review**: Users preview before sharing
- **Blacklist**: Never share certain projects

### Community Features
- **Pattern voting**: Rate usefulness of techniques
- **Attribution**: Anonymized contributor recognition
- **Marketplace**: Trade patterns or solutions
- **Analytics**: See impact of your contributions

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Architecture Finalized, Implementation In Progress
