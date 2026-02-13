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
