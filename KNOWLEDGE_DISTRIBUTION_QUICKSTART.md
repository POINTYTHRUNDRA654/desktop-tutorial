# Knowledge Distribution System - Quick Start Guide

## 🎯 What Was Implemented

A complete knowledge distribution system that allows you to:
- **Bundle tutorials** with your installer (auto-imported on first run)
- **Share knowledge** via GitHub
- **Auto-notify users** when new community knowledge is available
- **Import/Export** knowledge packs easily

---

## 📦 Files Created

### 1. Core System Files

```
bundled-knowledge/
├── manifest.json              # Tracks bundled packs and versions
└── core-tutorials.json        # Welcome tutorial (auto-imported)

src/renderer/public/
└── bundled-knowledge/         # Copy for Vite build (auto-deployed)
    ├── manifest.json
    └── core-tutorials.json

public/
└── bundled-knowledge/         # Copy for direct access
    ├── manifest.json
    └── core-tutorials.json
```

### 2. Documentation Files

- **KNOWLEDGE_DISTRIBUTION_SYSTEM.md** - Complete technical documentation
- **community-knowledge-example-github.json** - Example knowledge pack for sharing

### 3. Modified Files

- **src/renderer/src/MossyMemoryVault.tsx** - Added ~200 lines of knowledge distribution features

---

## 🚀 How It Works

### Auto-Import (First Run)

```javascript
// On first app launch:
User opens Memory Vault
  ↓
App checks: localStorage.getItem('mossy_bundled_imported')
  ↓
If not found → Auto-import from bundled-knowledge/
  ↓
Welcome tutorial appears in Memory Vault ✅
```

### GitHub Library (User Choice)

```javascript
// Every 6 hours:
App checks GitHub repo for new packs
  ↓
Compares with localStorage.getItem('mossy_imported_knowledge_versions')
  ↓
New packs detected → Red badge appears on "Browse Library" 🔴
  ↓
User clicks → Modal shows available packs
  ↓
User clicks "Import" → Knowledge added to vault ✅
```

---

## ⚙️ Setup Instructions

### Step 1: Update GitHub Username

**File:** `src/renderer/src/MossyMemoryVault.tsx`

**Find these two lines and replace `YOUR_USERNAME`:**

```typescript
// Line ~267 (in checkGitHubForNewKnowledge function)
const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';

// Line ~295 (in fetchCommunityKnowledge function)
const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
```

**Replace with:**
```typescript
const repoUrl = 'https://api.github.com/repos/POINTYTHRUNDRA654/mossy-knowledge/contents/community-knowledge';
```

### Step 2: Create Your GitHub Repository

1. Go to GitHub and create a new public repo: `mossy-knowledge`
2. Create folder structure:
   ```
   mossy-knowledge/
   └── community-knowledge/
       └── (your knowledge pack JSON files)
   ```
3. Add a README.md explaining the repo purpose

### Step 3: Add Bundled Knowledge (Optional)

**To add more tutorials to the installer:**

1. Edit `bundled-knowledge/manifest.json`:
   ```json
   {
     "packs": [
       {
         "id": "core-tutorials-v1",
         "name": "Core Tutorials",
         ...
       },
       {
         "id": "advanced-papyrus-v1",
         "name": "Advanced Papyrus",
         "version": "1.0.0",
         "file": "advanced-papyrus.json",
         "description": "Advanced Papyrus optimization techniques",
         "itemCount": 5,
         "auto-import": true
       }
     ]
   }
   ```

2. Create the pack file: `bundled-knowledge/advanced-papyrus.json`
3. Copy to `src/renderer/public/bundled-knowledge/`
4. Rebuild: `npm run build && npm run package:win`

### Step 4: Share Community Knowledge

**To share knowledge via GitHub:**

1. Open Memory Vault in Mossy
2. Mark items as "Community" trust level
3. Click "Export Shared" button → Downloads JSON file
4. Upload JSON to `mossy-knowledge/community-knowledge/` on GitHub
5. Commit and push

**Within 6 hours**, users will see your pack in "Browse Library"! 🎉

---

## 🎨 UI Features

### Memory Vault Header (New Buttons)

```
┌─────────────────────────────────────────────────────────┐
│ [Help] [Browse Library 🔴2] [Export Shared] [Export...] │
└─────────────────────────────────────────────────────────┘
```

- **Browse Library** - Opens modal with community packs (shows badge when new packs available)
- **Export Shared** - Exports community/official knowledge for sharing
- **Export Vault** - Exports entire vault (personal backup)

### Browse Library Modal

```
┌────────────────────────────────────────────────────────┐
│  📁 Community Knowledge Library                     [X] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Photoshop Brushes for FO4 Textures               │ │
│  │ Essential brush techniques for Fallout 4 textures│ │
│  │ Version: 1.0.0 | Items: 2 | By: CommunityModder │ │
│  │                                      [Import]     │ │
│  │                                                   │ │
│  │ Included items:                                  │ │
│  │ [Brush Basics] [Normal Map Brushes]              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  💡 Tip: Packs checked every 6 hours                   │
│  📤 Share: Export with "Export Shared"                 │
│  Last checked: 2/13/2026 6:15 PM                       │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Technical Details

### Storage Keys

| Key | Purpose | Example |
|-----|---------|---------|
| `mossy_knowledge_vault` | All knowledge items | `[{id, title, content...}]` |
| `mossy_bundled_imported` | Flag for first-run import | `"true"` |
| `mossy_imported_knowledge_versions` | Track imported packs | `{"pack-id-v1": true}` |
| `mossy_last_github_check` | Timestamp of last check | `"1707851700000"` |

### GitHub API Rate Limits

- **Unauthenticated:** 60 requests/hour per IP
- **Checking every 6 hours:** 4 requests/day ✅
- **Well within limits!**

### File Format (Knowledge Pack)

```json
{
  "packId": "unique-pack-id-v1",
  "packName": "Display Name",
  "packVersion": "1.0.0",
  "exportDate": "2026-02-13",
  "description": "Pack description",
  "author": "Your Name",
  "items": [
    {
      "id": "unique-item-id",
      "title": "Tutorial Title",
      "content": "Full tutorial content...",
      "source": "Source description",
      "creditName": "Author",
      "creditUrl": "https://...",
      "trustLevel": "community",
      "tags": ["tag1", "tag2"],
      "date": "2026-02-13T00:00:00.000Z",
      "status": "learned"
    }
  ]
}
```

---

## 🧪 Testing

### Test Bundled Knowledge

```javascript
// In DevTools Console:
localStorage.removeItem('mossy_bundled_imported');
// Refresh page → Welcome tutorial should auto-import
```

### Test GitHub Library

```javascript
// In DevTools Console:
localStorage.removeItem('mossy_last_github_check');
localStorage.removeItem('mossy_imported_knowledge_versions');
// Refresh page → Should check GitHub and show badge if packs available
```

### Manual Test

1. Open Mossy → Memory Vault
2. Should see welcome tutorial (auto-imported)
3. Click "Browse Library" (may show empty if no GitHub repo yet)
4. Create sample pack → Upload to GitHub
5. Wait 6 hours or clear `mossy_last_github_check`
6. Badge should appear → Click "Import"

---

## 🔧 Troubleshooting

### Bundled knowledge not importing

**Check:**
- Files exist in `src/renderer/public/bundled-knowledge/`
- `manifest.json` has `"auto-import": true`
- Clear `localStorage.removeItem('mossy_bundled_imported')`

**Fix:**
```bash
npm run build
# Verify: ls dist/bundled-knowledge/
```

### GitHub library not loading

**Check:**
- GitHub repo is public
- Folder name is exactly `community-knowledge`
- Username is correct in code
- JSON files are valid

**Fix:**
```javascript
// Check in DevTools Network tab for 404 errors
// Update username in MossyMemoryVault.tsx lines ~267 and ~295
```

### Badge not appearing

**Check:**
- Last check was >6 hours ago
- New packs not already in `mossy_imported_knowledge_versions`

**Fix:**
```javascript
localStorage.removeItem('mossy_last_github_check');
// Refresh page
```

---

## 🎓 Best Practices

### For Bundled Knowledge
- Keep small (under 10 items per pack)
- Focus on essential "getting started" content
- Test before releasing installer
- Update version in manifest when adding packs

### For Community Knowledge
- Include detailed credits and sources
- Use descriptive titles and tags
- Break large guides into smaller packs
- Version your packs (e.g., `papyrus-v1`, `papyrus-v2`)
- Test JSON validity before uploading

### For Users
- Import only packs you need
- Use search and filters to find content
- Export your best work to share back
- Report broken packs to maintainer

---

## 📈 Future Enhancements

Potential improvements:
- [ ] Pack categories/collections
- [ ] User ratings and reviews
- [ ] Automatic updates for imported packs
- [ ] Multi-repo support
- [ ] Search within packs before importing
- [ ] Pack dependencies
- [ ] GitHub authentication for higher rate limits

---

## ✅ Verification Checklist

- [x] Build succeeds: `npm run build` ✅
- [x] No lint errors: `npm run lint` ✅
- [x] Bundled knowledge in dist: `ls dist/bundled-knowledge/` ✅
- [x] UI buttons added: Browse Library, Export Shared ✅
- [x] Modal implemented: Full-featured library browser ✅
- [x] Badge system: Red notification badge ✅
- [x] Documentation: Complete guide created ✅

---

## 📞 Support

- **Documentation:** KNOWLEDGE_DISTRIBUTION_SYSTEM.md
- **Example Pack:** community-knowledge-example-github.json
- **This Guide:** KNOWLEDGE_DISTRIBUTION_QUICKSTART.md

---

**🎉 System is ready to use! Update the GitHub username and start sharing knowledge!**
