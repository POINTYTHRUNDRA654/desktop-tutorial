# Community Knowledge Sharing System

## Overview
Mossy's Memory Vault now includes a community knowledge sharing system that allows users to share tutorials, guides, and modding tips while maintaining privacy for personal notes.

## How It Works

### 1. Adding Knowledge
- Navigate to **Memory Vault** in the sidebar
- Click **"Ingest Knowledge"**
- Upload PDF, text files, videos, or paste content directly
- Fill in required fields:
  - **Title**: Name of the knowledge
  - **Content**: The actual tutorial/guide/tip
  - **Source**: Where it came from (URL or file name)
  - **Credit Name**: Author/creator (required for proper attribution)
  - **Credit URL**: Link to original source (optional)
  - **Trust Level**: Personal, Community, or Official
  - **Tags**: Searchable keywords
- **Check "Share with Community"** if you want to make this available to others

### 2. Sharing Your Knowledge

#### Manual Export/Import Method (Current)
1. **Mark items for sharing**:
   - Hover over any memory card
   - Click the share icon to mark it for community sharing
   - Items marked for sharing show a purple "Shared" badge

2. **Export shared knowledge**:
   - Click **"Export Shared"** in the header
   - A JSON file will be downloaded with only your shared items
   - Private notes are excluded automatically

3. **Share the file**:
   - Upload to GitHub (create a repo or gist)
   - Share on Discord/Reddit/Forums
   - Send directly to other users

4. **Import community knowledge**:
   - Click **"Import Community"**
   - Select a JSON file another user shared
   - Knowledge is imported with "Community" trust level
   - Credits are preserved from original author

### 3. Privacy & Safety

✅ **What Gets Shared:**
- Only items explicitly marked with "Share with Community"
- Title, content, tags, source, and credit information
- Trust level (for filtering)

❌ **What Never Gets Shared:**
- Items without the "Share with Community" flag
- Your personal notes and private knowledge
- Any metadata you didn't approve
- Your API keys or settings

### 4. Use Cases

**For Content Creators:**
- Share your modding tutorials in portable format
- Build a knowledge base for your mod team
- Distribute quick reference guides
- Create themed knowledge packs (e.g., "Papyrus Performance Tips")

**For Community Members:**
- Import popular mod author tips
- Build personal knowledge libraries
- Share solutions to common problems
- Collaborate on documentation

**For Mod Teams:**
- Standardize team knowledge
- Onboard new members quickly
- Share internal best practices
- Create workflow documentation

## Future Enhancements (Planned)

### GitHub Integration (Coming Soon)
- Direct push/pull from GitHub repos
- Automatic sync with designated repositories
- Version control for knowledge updates
- Conflict resolution for duplicates

### Community Hub (Roadmap)
- Centralized knowledge repository
- User ratings and reviews
- Searchable community database
- Curated collections

### Collaborative Features (Future)
- Multi-user knowledge bases
- Team synchronization
- Change tracking and updates
- Merge conflict resolution

## File Format

Community knowledge files are JSON with this structure:

```json
{
  "version": "1.0",
  "exported": "2026-02-13T12:00:00.000Z",
  "items": [
    {
      "title": "Advanced Papyrus Performance",
      "content": "Performance tips and best practices...",
      "source": "https://www.creationkit.com/...",
      "creditName": "Bethesda Docs",
      "creditUrl": "https://...",
      "trustLevel": "official",
      "tags": ["papyrus", "performance", "scripting"],
      "shareWithCommunity": true,
      "sharedDate": "2026-02-13T12:00:00.000Z"
    }
  ]
}
```

## Best Practices

1. **Always Credit Sources**: Fill in credit name and URL
2. **Use Descriptive Tags**: Makes searching easier for everyone
3. **Set Appropriate Trust Levels**: 
   - Personal: Your own notes
   - Community: User-contributed content
   - Official: Bethesda docs, tool documentation
4. **Review Before Sharing**: Check content for accuracy and completeness
5. **Keep It Organized**: Use consistent naming and tagging conventions

## Troubleshooting

**Q: I accidentally marked something as shared. How do I undo it?**  
A: Hover over the memory card and click the purple share icon to toggle it off.

**Q: Can I edit imported community knowledge?**  
A: Not directly, but you can delete it and create your own version with your edits.

**Q: How do I know if a knowledge item is from the community?**  
A: Check the "Trust" badge - community imports are marked "Community".

**Q: What if someone shares incorrect information?**  
A: Always review imported content. Trust levels and credits help you verify sources.

**Q: Can I share my entire vault?**  
A: Use "Export All" for personal backup. Only "Export Shared" sends community-approved items.

## Contributing

Want to share your Fallout 4 modding knowledge?

1. Create high-quality tutorials in the Memory Vault
2. Mark them for community sharing
3. Export and share on:
   - [Nexus Mods Forums](https://forums.nexusmods.com/)
   - [r/FalloutMods](https://reddit.com/r/FalloutMods)
   - GitHub repos
   - Discord servers

## License

Community knowledge sharing respects original content licenses. When sharing:
- Provide proper attribution
- Link to original sources
- Respect copyright and fair use
- Give credit to original authors

---

**Remember**: The goal is to help the modding community grow while respecting everyone's privacy and intellectual property. Share responsibly! 🌟
