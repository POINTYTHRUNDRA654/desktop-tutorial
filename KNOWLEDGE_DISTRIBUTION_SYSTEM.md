# Knowledge Distribution System

## Overview

Mossy features a complete knowledge distribution system that allows you to:
1. **Bundle core tutorials** with the installer
2. **Share knowledge packs** via GitHub
3. **Auto-notify users** when new community knowledge is available

## System Architecture

### 1. Bundled Knowledge (Included in Installer)

**Location:** `/bundled-knowledge/`

These knowledge packs are included in every installer and automatically imported when a user first opens Memory Vault.

**Files:**
- `manifest.json` - Tracks available bundled packs and versions
- `core-tutorials.json` - Welcome tutorial (auto-imported)
- *(Add more pack files as needed)*

**Structure:**

```json
// manifest.json
{
  "version": "1.0.0",
  "lastUpdated": "2026-02-13",
  "description": "Bundled knowledge packs",
  "packs": [
    {
      "id": "core-tutorials-v1",
      "name": "Core Tutorials",
      "version": "1.0.0",
      "file": "core-tutorials.json",
      "description": "Essential getting started tutorials",
      "itemCount": 1,
      "auto-import": true
    }
  ]
}

// core-tutorials.json (or any pack file)
{
  "packId": "core-tutorials-v1",
  "packName": "Core Tutorials",
  "packVersion": "1.0.0",
  "exportDate": "2026-02-13",
  "items": [
    {
      "id": "unique-id",
      "title": "Tutorial Title",
      "content": "Full tutorial content...",
      "source": "Where this came from",
      "creditName": "Author Name",
      "creditUrl": "https://...",
      "trustLevel": "official",
      "tags": ["tag1", "tag2"],
      "date": "2026-02-13T00:00:00.000Z",
      "status": "learned"
    }
  ]
}
```

### 2. Community Knowledge (GitHub Repository)

**Your GitHub Repo:** `https://github.com/YOUR_USERNAME/mossy-knowledge/`

**Folder Structure:**
```
mossy-knowledge/
└── community-knowledge/
    ├── brush-tutorial.json
    ├── texture-guide.json
    ├── papyrus-optimization.json
    └── (more knowledge packs)
```

**How It Works:**
1. Users export knowledge from Memory Vault → "Export Shared"
2. You upload the JSON file to `community-knowledge/` in your repo
3. Mossy checks every 6 hours for new packs
4. Users see a red badge notification on "Browse Library"
5. Users click to view available packs and import what they want

### 3. Notification System

**Features:**
- ✅ Auto-checks GitHub every 6 hours
- ✅ Red badge shows count of new packs
- ✅ Version tracking prevents re-importing
- ✅ Last check timestamp visible

**Storage Keys:**
```javascript
localStorage.setItem('mossy_imported_knowledge_versions', JSON.stringify({
  'pack-id-v1': true,
  'pack-id-v2': true
}));

localStorage.setItem('mossy_last_github_check', Date.now());
```

## Setup Instructions

### Step 1: Update GitHub Username

Edit `src/renderer/src/MossyMemoryVault.tsx`:

Find these lines and replace `YOUR_USERNAME`:
- Line ~578 (in `checkGitHubForNewKnowledge` function)
- Line ~633 (in `fetchCommunityKnowledge` function)

```typescript
const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
```

### Step 2: Create Your GitHub Repository

1. Create a new public repo: `https://github.com/YOUR_USERNAME/mossy-knowledge`
2. Create folder: `community-knowledge/`
3. Add a README explaining the repo purpose

### Step 3: Add Bundled Knowledge

**To update installer's bundled knowledge:**

1. Edit `bundled-knowledge/manifest.json`:
   - Increment version
   - Add new pack entry
   
2. Create new pack file (e.g., `advanced-tutorials.json`)

3. Set `"auto-import": true` for packs you want auto-imported

4. Rebuild installer:
   ```bash
   npm run build && npm run package:win
   ```

### Step 4: Publish Community Knowledge

**To share knowledge via GitHub:**

1. Open Memory Vault in Mossy
2. Select knowledge items you want to share
3. Click "Export Shared" → saves JSON file
4. Upload JSON to your `mossy-knowledge/community-knowledge/` folder
5. Commit and push to GitHub

Within 6 hours, users will see the new pack in "Browse Library"!

## User Experience Flow

```
1. User installs Mossy
   ↓
2. Opens Memory Vault (first time)
   ↓
3. ✅ Core tutorials auto-imported from bundled-knowledge/
   ↓
4. User sees welcome tutorial explaining system
   ↓
5. After 6 hours...
   ↓
6. 🔴 Badge appears on "Browse Library" button
   ↓
7. User clicks "Browse Library"
   ↓
8. Sees list: "Advanced Papyrus - 5 items - Import"
   ↓
9. Clicks "Import"
   ↓
10. ✅ Knowledge added, badge count decreases
```

## API Rate Limiting

**GitHub API limits** (unauthenticated):
- 60 requests per hour per IP
- Checking every 6 hours = 4 requests/day
- Well within limits ✅

**If you need more:**
- Add a GitHub Personal Access Token (optional)
- Increases limit to 5,000 requests/hour

## File Format Specification

### Trust Levels
- `personal` - Your own notes and tutorials
- `community` - Shared by community members
- `official` - From official sources (Bethesda, tool authors)

### Required Fields
```typescript
{
  "id": string,           // Unique identifier
  "title": string,        // Display name
  "content": string,      // Full tutorial/guide text
  "source": string,       // Origin description
  "trustLevel": string,   // personal | community | official
  "tags": string[],       // Searchable keywords
  "date": string,         // ISO date
  "status": string        // learned | digesting
}
```

### Optional Fields
```typescript
{
  "creditName": string,   // Author name
  "creditUrl": string     // Link to source
}
```

## Testing Your Setup

### Test Bundled Knowledge
1. Delete localStorage: `localStorage.clear()`
2. Restart Mossy
3. Open Memory Vault
4. Should see welcome tutorial auto-imported

### Test GitHub Library
1. Upload test pack to your GitHub repo
2. In Mossy DevTools console:
   ```javascript
   localStorage.removeItem('mossy_last_github_check');
   localStorage.removeItem('mossy_imported_knowledge_versions');
   ```
3. Refresh page
4. Should see badge appear on "Browse Library"

## Troubleshooting

### Bundled knowledge not importing
- Check `bundled-knowledge/manifest.json` exists
- Verify `auto-import: true` is set
- Check browser console for errors
- Clear localStorage and try again

### GitHub library not updating
- Verify your GitHub repo is public
- Check username is correct in code
- Wait 6 hours or force check by clearing `mossy_last_github_check`
- Check browser console for 404 or network errors

### Import not working
- Ensure JSON format matches specification
- Check all required fields are present
- Verify pack ID is unique and not already imported

## Best Practices

### For Bundled Knowledge
- Keep bundled packs small (under 10 items)
- Focus on essential "getting started" content
- Update version in manifest when adding packs
- Test before releasing installer

### For Community Knowledge
- Include detailed credits and sources
- Use descriptive titles and tags
- Break large guides into smaller packs
- Version your packs (e.g., `papyrus-v1`, `papyrus-v2`)

### For Users
- Import only packs you need
- Use search and filters to find content
- Export your best work to share back
- Report broken packs to maintainer

## Future Enhancements

Potential improvements:
- [ ] Pack categories/collections
- [ ] User ratings and reviews
- [ ] Automatic updates for imported packs
- [ ] Multi-repo support
- [ ] Search within packs before importing
- [ ] Pack dependencies

## Support

For questions or issues:
- GitHub Issues: Your repo's issue tracker
- Documentation: This file
- Community: Mossy Discord/Forums

---

**Happy knowledge sharing! 📚✨**
# Mossy Community Knowledge System

Complete implementation of bundled + GitHub-based knowledge distribution with automatic update notifications.

## How It Works

### For Installer (Bundled Knowledge)
1. **Bundled with Every Install**: Knowledge packs in `resources/public/bundled-knowledge/` are included in the installer
2. **Auto-Import on First Run**: Packs marked with `"autoImport": true` are automatically imported when user first opens Memory Vault
3. **No Action Required**: Users get your core tutorials immediately

### For GitHub Updates (Community Knowledge)
1. **Automatic Checking**: Mossy checks your GitHub repo every 6 hours for new knowledge packs
2. **Notification Badge**: When new knowledge is available, a red badge appears on "Browse Library" button
3. **User Choice**: Users click "Browse Library" to see available packs and choose what to download
4. **Version Tracking**: Mossy remembers what's been imported to avoid duplicates

## Setup Instructions

### 1. Create GitHub Repository
```bash
# Create a new repo called "mossy-knowledge"
# Add folder: community-knowledge/
```

### 2. Update Mossy Code
Replace `YOUR_USERNAME` in MossyMemoryVault.tsx (line ~578 and ~633):
```typescript
const repoUrl = 'https://api.github.com/repos/YOUR_USERNAME/mossy-knowledge/contents/community-knowledge';
```

### 3. Add Knowledge to Bundled Folder
Place JSON files in: `resources/public/bundled-knowledge/`

Update `manifest.json`:
```json
{
  "version": "1.0.0",
  "packs": [
    {
      "id": "your-pack-id",
      "name": "Your Pack Name",
      "version": "1.0.0",
      "file": "your-pack.json",
      "description": "What this pack contains",
      "itemCount": 5,
      "autoImport": true
    }
  ]
}
```

### 4. Add Knowledge to GitHub Repo
Push your JSON files to: `your-github-username/mossy-knowledge/community-knowledge/`

## Creating Knowledge Packs

### Export from Mossy
1. Open Memory Vault
2. Add tutorials/knowledge
3. Mark items with "Share with Community"
4. Click "Export Shared"
5. Download JSON file

### Knowledge Pack Format
```json
{
  "version": "1.0.0",
  "packId": "unique-pack-id",
  "packName": "Display Name",
  "description": "What this pack contains",
  "credits": {
    "author": "Your Name",
    "license": "CC-BY 4.0"
  },
  "items": [
    {
      "title": "Tutorial Title",
      "content": "Tutorial content...",
      "source": "https://source-url.com",
      "creditName": "Author Name",
      "trustLevel": "community",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

## Updating Knowledge

### Update Bundled Knowledge
1. Modify files in `resources/public/bundled-knowledge/`
2. Update version in `manifest.json`
3. Rebuild installer: `npm run build && npm run package:win`
4. Distribute new installer

### Update GitHub Knowledge
1. Modify/add JSON files in your repo
2. Commit and push to GitHub
3. Mossy will detect updates within 6 hours
4. Users see notification badge
5. Users click "Browse Library" to download

## User Experience

### First Install
- Mossy auto-imports your core tutorials immediately
- User sees "Browse Library" button (no badge yet)

### After 6 Hours
- Mossy checks GitHub for new knowledge
- If new packs found, red badge appears on "Browse Library"
- Badge shows count of new packs

### User Action
- User clicks "Browse Library"
- Sees all available packs with descriptions
- Clicks "Import" on desired packs
- Knowledge added to Memory Vault
- Badge count decreases

## Commands

```bash
# Build with bundled knowledge
npm run build
npm run package:win

# Test bundled knowledge loading
npm run dev
# Clear localStorage and refresh to test auto-import

# Check what's bundled
ls resources/public/bundled-knowledge/
```

## File Locations

- **Bundled Knowledge**: `resources/public/bundled-knowledge/*.json`
- **Manifest**: `resources/public/bundled-knowledge/manifest.json`
- **GitHub Repo**: `https://github.com/YOUR_USERNAME/mossy-knowledge/community-knowledge/*.json`
- **User Storage**: `localStorage.getItem('mossy_knowledge_vault')`
- **Import Tracking**: `localStorage.getItem('mossy_imported_versions')`

## Best Practices

1. **Bundled Knowledge**: Core tutorials everyone needs (getting started, basic workflows)
2. **GitHub Knowledge**: Specialized tutorials, advanced topics, community contributions
3. **Version Numbers**: Increment when updating packs so users get notifications
4. **Pack Size**: Keep packs focused (5-20 items each) for easier browsing
5. **Credits**: Always include author and source information

## Troubleshooting

**Auto-import not working?**
- Clear localStorage: `localStorage.removeItem('mossy_bundled_knowledge_imported')`
- Verify files exist at: `/bundled-knowledge/manifest.json`

**GitHub updates not showing?**
- Check repo URL in code matches your GitHub username
- Verify JSON files are in `community-knowledge/` folder
- Check browser console for fetch errors

**Badge showing wrong count?**
- Clear check timestamp: `localStorage.removeItem('mossy_knowledge_last_check')`
- Refresh page to trigger new check
