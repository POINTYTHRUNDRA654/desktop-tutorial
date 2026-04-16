# Mossy Implementation Guide: Knowledge Database & Privacy

This guide explains how to integrate the shared knowledge database with the privacy settings system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     User's Computer (Local)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐      ┌──────────────────────────┐ │
│  │   Private Local Data     │      │  Privacy Settings Store  │ │
│  │                          │      │                          │ │
│  │ • Project files          │      │ • keepLocalOnly: true    │ │
│  │ • Conversations          │ ←→   │ • sharePatterns: false   │ │
│  │ • Settings               │      │ • shareBugReports: false │ │
│  │ • Sensitive config       │      │ • contributeToKB: false  │ │
│  └──────────────────────────┘      └──────────────────────────┘ │
│           ↓                                                       │
│   ┌──────────────────────────────────────────────┐               │
│   │  Analysis Engine (Local)                      │               │
│   │  • Pattern extraction                         │               │
│   │  • Technique identification                   │               │
│   │  • Anonymization processor                    │               │
│   │  • Privacy-compliant data transformer         │               │
│   └──────────────────────────────────────────────┘               │
│           ↓                                                       │
│   ┌──────────────────────────────────────────────┐               │
│   │  Privacy Filter (Privacy Settings Aware)      │               │
│   │                                               │               │
│   │  if shareScriptPatterns:                     │               │
│   │    ✓ Send anonymized Papyrus patterns        │               │
│   │  if shareMeshOptimizations:                  │               │
│   │    ✓ Send anonymized 3D techniques           │               │
│   │  if shareBugReports:                         │               │
│   │    ✓ Send sanitized error logs               │               │
│   │                                               │               │
│   └──────────────────────────────────────────────┘               │
│                       ↓                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                ┌─────↓─────────────────────────────────────────┐
                │      Community Knowledge Database (Cloud)      │
                ├────────────────────────────────────────────────┤
                │                                                 │
                │  ┌─────────────────────────────────────────┐   │
                │  │  Papyrus Script Patterns                │   │
                │  │  • Event listener optimization patterns │   │
                │  │  • Form initialization best practices   │   │
                │  │  • Quest completion handling techniques │   │
                │  │  • Storage optimization methods         │   │
                │  └─────────────────────────────────────────┘   │
                │                                                 │
                │  ┌─────────────────────────────────────────┐   │
                │  │  Mesh Optimization Techniques            │   │
                │  │  • Polygon reduction strategies          │   │
                │  │  • Texture optimization methods          │   │
                │  │  • LOD generation techniques             │   │
                │  │  • Performance improvements metrics      │   │
                │  └─────────────────────────────────────────┘   │
                │                                                 │
                │  ┌─────────────────────────────────────────┐   │
                │  │  Community Solutions                     │   │
                │  │  • Common bug fixes                      │   │
                │  │  • Performance optimization wins         │   │
                │  │  • Compatibility solutions               │   │
                │  │  • Best practice patterns                │   │
                │  └─────────────────────────────────────────┘   │
                │                                                 │
                └────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Data Collection Layer
Create `KnowledgeCollector.ts`:

```typescript
import { PrivacySettings } from './PrivacySettings';

interface CollectablePattern {
  type: 'script' | 'mesh' | 'bug' | 'optimization';
  pattern: unknown;
  context: string;
  timestamp: number;
}

class KnowledgeCollector {
  constructor(private privacySettings: PrivacySettings) {}

  // Collect a pattern from user activity
  collectPattern(pattern: CollectablePattern): void {
    if (!this.canShare(pattern.type)) {
      console.log('Pattern collection skipped due to privacy settings');
      return;
    }

    // Store locally for analysis
    this.storeLocalPattern(pattern);
  }

  private canShare(type: string): boolean {
    switch (type) {
      case 'script':
        return this.privacySettings.shareScriptPatterns && 
               this.privacySettings.contributeToKnowledgeBase;
      case 'mesh':
        return this.privacySettings.shareMeshOptimizations &&
               this.privacySettings.contributeToKnowledgeBase;
      case 'bug':
        return this.privacySettings.shareBugReports;
      default:
        return false;
    }
  }

  private storeLocalPattern(pattern: CollectablePattern): void {
    const patterns = JSON.parse(
      localStorage.getItem('mossy_collected_patterns') || '[]'
    );
    patterns.push(pattern);
    localStorage.setItem('mossy_collected_patterns', JSON.stringify(patterns));
  }
}

export default KnowledgeCollector;
```

### 2. Anonymization Engine
Create `DataAnonymizer.ts`:

```typescript
interface ScriptPattern {
  eventName: string;
  handlerApproach: string;
  performanceImpact: string;
  projectName?: string;
}

interface AnonymizedScriptPattern {
  eventName: string;
  handlerApproach: string;
  performanceImpact: string;
  // projectName removed
}

class DataAnonymizer {
  // Remove project-specific identifiers
  static anonymizeScriptPattern(pattern: ScriptPattern): AnonymizedScriptPattern {
    const { projectName, ...anonymized } = pattern;
    return anonymized;
  }

  // Remove file paths and identifiers
  static anonymizeMeshOptimization(data: any): any {
    return {
      polygonReduction: data.polygonReduction,
      performanceGain: data.performanceGain,
      technique: data.technique,
      // Remove: filePath, modName, author, etc.
    };
  }

  // Sanitize bug reports
  static sanitizeBugReport(report: any): any {
    return {
      errorType: report.errorType,
      stackTrace: this.sanitizeStackTrace(report.stackTrace),
      version: report.version,
      // Remove: username, file paths, personal data
    };
  }

  private static sanitizeStackTrace(trace: string): string {
    // Remove file paths, user names, sensitive info
    return trace
      .replace(/C:\\Users\\[^\\]+/g, 'USER_PATH')
      .replace(/D:\\[^\\]+/g, 'PROJECT_PATH')
      .replace(/"[^"]*\.esp"/g, 'MOD.esp');
  }
}

export default DataAnonymizer;
```

### 3. Privacy-Aware Uploader
Create `KnowledgeUploader.ts`:

```typescript
import { PrivacySettings } from './PrivacySettings';
import DataAnonymizer from './DataAnonymizer';

class KnowledgeUploader {
  constructor(
    private privacySettings: PrivacySettings,
    private apiEndpoint: string = 'https://api.mossy-kb.com/patterns'
  ) {}

  // Upload patterns to community database
  async uploadCollectedPatterns(): Promise<void> {
    if (!this.shouldUpload()) {
      return;
    }

    const patterns = this.loadLocalPatterns();
    const anonymized = await this.anonymizeAllPatterns(patterns);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patterns: anonymized,
          timestamp: Date.now(),
          mossyVersion: '2.4.2'
        })
      });

      if (response.ok) {
        this.markPatternsUploaded(patterns);
      }
    } catch (error) {
      console.error('Failed to upload patterns:', error);
      // Patterns stay local, will retry later
    }
  }

  private shouldUpload(): boolean {
    return this.privacySettings.contributeToKnowledgeBase &&
           (this.privacySettings.shareScriptPatterns ||
            this.privacySettings.shareMeshOptimizations ||
            this.privacySettings.shareBugReports);
  }

  private loadLocalPatterns(): any[] {
    return JSON.parse(
      localStorage.getItem('mossy_collected_patterns') || '[]'
    );
  }

  private async anonymizeAllPatterns(patterns: any[]): Promise<any[]> {
    return patterns.map(pattern => {
      switch (pattern.type) {
        case 'script':
          return DataAnonymizer.anonymizeScriptPattern(pattern.pattern);
        case 'mesh':
          return DataAnonymizer.anonymizeMeshOptimization(pattern.pattern);
        case 'bug':
          return DataAnonymizer.sanitizeBugReport(pattern.pattern);
        default:
          return pattern;
      }
    });
  }

  private markPatternsUploaded(patterns: any[]): void {
    const remaining = this.loadLocalPatterns().filter(
      p => !patterns.includes(p)
    );
    localStorage.setItem('mossy_collected_patterns', JSON.stringify(remaining));
  }
}

export default KnowledgeUploader;
```

### 4. Mossy Integration
Integrate into ChatInterface or SystemBus:

```typescript
import KnowledgeCollector from './KnowledgeCollector';
import KnowledgeUploader from './KnowledgeUploader';

export const ChatInterface = () => {
  const privacySettings = JSON.parse(
    localStorage.getItem('mossy_privacy_settings') || '{}'
  );

  const knowledgeCollector = new KnowledgeCollector(privacySettings);
  const knowledgeUploader = new KnowledgeUploader(privacySettings);

  // Example: Collect script pattern when user creates one
  const handleScriptCreated = (script: string) => {
    const pattern: CollectablePattern = {
      type: 'script',
      pattern: {
        eventName: extractEventName(script),
        handlerApproach: extractApproach(script),
        performanceImpact: analyzePerformance(script)
      },
      context: 'user_created_script',
      timestamp: Date.now()
    };

    knowledgeCollector.collectPattern(pattern);
  };

  // Periodically upload (e.g., daily)
  useEffect(() => {
    const uploadInterval = setInterval(() => {
      knowledgeUploader.uploadCollectedPatterns();
    }, 24 * 60 * 60 * 1000); // Daily

    return () => clearInterval(uploadInterval);
  }, []);

  // ... rest of component
};
```

### 5. Database Backend (Pseudo-code)
If implementing server-side:

```typescript
// Backend: /api/patterns/contribute
app.post('/api/patterns/contribute', async (req, res) => {
  const { patterns, mossyVersion } = req.body;

  // Verify patterns are anonymized
  for (const pattern of patterns) {
    if (hasPersonalData(pattern)) {
      return res.status(400).json({ error: 'Non-anonymized data detected' });
    }
  }

  // Store in knowledge database
  await knowledgeDB.insertPatterns(patterns);

  // Make available to all users
  await cache.invalidate('community_patterns');

  res.json({ success: true, patternsStored: patterns.length });
});

// Backend: /api/patterns/query
app.get('/api/patterns/query', async (req, res) => {
  const { type, category } = req.query;

  const patterns = await knowledgeDB.query({
    type,
    category,
    limit: 100
  });

  res.json({ patterns });
});
```

## Privacy Compliance Checklist

- [ ] Users can opt-out of all data sharing
- [ ] All shared data is anonymized before upload
- [ ] Anonymization removes project names, file paths, usernames
- [ ] Privacy settings are persistent and honored
- [ ] Users can delete all local data anytime
- [ ] No data is shared without explicit user consent
- [ ] Users know what data is being shared (documentation)
- [ ] Uploaded patterns don't reveal individual users
- [ ] Audit logs track what data was shared
- [ ] GDPR compliance: users can export their data
- [ ] GDPR compliance: users can request deletion
- [ ] CCPA compliance: transparent data collection
- [ ] No tracking or analytics without consent

## Testing

```typescript
// Test: Verify privacy settings block sharing
test('should not collect patterns if privacy disabled', () => {
  const settings: PrivacySettings = {
    contributeToKnowledgeBase: false,
    shareScriptPatterns: false,
    // ... other settings
  };

  const collector = new KnowledgeCollector(settings);
  collector.collectPattern(testPattern);

  expect(localStorage.getItem('mossy_collected_patterns')).toBe('[]');
});

// Test: Verify anonymization removes personal data
test('should remove project names from patterns', () => {
  const pattern = {
    projectName: 'My Secret Mod',
    eventName: 'OnInit',
    technique: 'Event listener'
  };

  const anonymized = DataAnonymizer.anonymizeScriptPattern(pattern);

  expect(anonymized.projectName).toBeUndefined();
  expect(anonymized.eventName).toBe('OnInit');
});

// Test: Verify upload respects privacy settings
test('should not upload if settings disabled', async () => {
  const settings: PrivacySettings = {
    contributeToKnowledgeBase: false,
    // ... other settings
  };

  const uploader = new KnowledgeUploader(settings);
  const uploadSpy = jest.spyOn(global, 'fetch');

  await uploader.uploadCollectedPatterns();

  expect(uploadSpy).not.toHaveBeenCalled();
});
```

## Monitoring & Metrics

Track (without identifying users):
- Number of patterns contributed
- Types of patterns shared most
- Community size growth
- Knowledge base engagement metrics
- Bug fix success rates for reported issues
- Most helpful optimization techniques

All metrics should be anonymized and aggregated.

## Future Enhancements

1. **Differential Privacy:** Add noise to patterns to further protect privacy
2. **Federated Learning:** Train models on local data without uploading
3. **Community Voting:** Let users vote on usefulness of shared patterns
4. **Contributor Recognition:** Badges for contributors (anonymized: "Contributor #42")
5. **Pattern Versioning:** Track technique improvements over time
6. **Smart Caching:** Cache patterns locally to reduce server load
7. **Offline Mode:** Full functionality without connection, auto-sync when online

## References

- [GDPR Data Protection](https://gdpr-info.eu/)
- [CCPA Privacy Rights](https://oag.ca.gov/privacy/ccpa)
- [Differential Privacy](https://en.wikipedia.org/wiki/Differential_privacy)
- [Data Anonymization Best Practices](https://www.privacytech.org/)
