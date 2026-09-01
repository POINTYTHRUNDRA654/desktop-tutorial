# Blacklist System for Mods and Programs

**Date Added:** April 12, 2026  
**Status:** ✅ PRODUCTION READY

---

## Overview

The Blacklist System allows users to flag problematic mods and programs that are known to cause issues, conflicts, or problems. When users ask about blacklisted items, Mossy will actively warn against their use and suggest safer alternatives.

## Architecture

### Data Storage

Blacklists are stored in the user's privacy settings in `src/shared/types.ts`:

```typescript
interface Settings {
  privacySettings: {
    // ... other settings
    modContentBlacklist: string[];   // Problematic mods
    programBlacklist: string[];      // Problematic programs
  }
}
```

### How It Works

1. **User adds items** via Privacy Settings panel
2. **Items are stored** in local settings file (private, never uploaded)
3. **Dynamic context** passes blacklists to AI via ChatInterface.tsx
4. **MossyBrain** receives instructions on how to handle blacklisted items
5. **Mossy warns users** when they ask about blacklisted items

---

## User Interface

### Location
Privacy Settings → Scroll down to:
- **Mod Content Blacklist** section
- **Program Blacklist** section

### Features
- Add/remove items with text input + buttons
- Visual list of blacklisted items with removal buttons
- Orange/red color scheme to indicate warnings
- Counter showing total blacklisted items
- Real-time updates (changes take effect on next message)

---

## Usage Examples

### Blacklisting a Problematic Mod

**User adds:** "Broken Script Overhaul v1.2"

**When user asks about it later:**
- Mossy: "⚠️ I need to warn you about Broken Script Overhaul v1.2 — it's been flagged in your blacklist as problematic. This mod is known to cause script lag and CTDs in heavily modded setups. I'd recommend [safer alternative] instead, which provides similar features without the stability issues."

### Blacklisting a Problematic Program

**User adds:** "Old Corrupt Tool 2019"

**When user asks about it later:**
- Mossy: "⚠️ I strongly advise against using Old Corrupt Tool 2019 — it's been flagged in your blacklist as problematic. This tool is known to corrupt save files and has poor compatibility with modern mod managers. I recommend using [modern alternative] instead, which is actively maintained and much more reliable."

---

## Technical Implementation

### Files Modified

1. **src/shared/types.ts**
   - Added `modContentBlacklist: string[]` to privacySettings
   - Added `programBlacklist: string[]` to privacySettings
   - Updated DEFAULT_SETTINGS with empty arrays

2. **src/renderer/src/PrivacySettings.tsx**
   - Added state: `modBlacklistInput`, `programBlacklistInput`
   - Added handlers: `handleAddToModBlacklist`, `handleRemoveFromModBlacklist`
   - Added handlers: `handleAddToProgramBlacklist`, `handleRemoveFromProgramBlacklist`
   - Added UI sections: Mod Content Blacklist, Program Blacklist
   - Visual design: Orange buttons, alert icons, clear warnings

3. **src/renderer/src/ChatInterface.tsx**
   - Added blacklist extraction from settings
   - Added blacklist sections to dynamic system context
   - Passes blacklists to AI with clear instructions

4. **src/renderer/src/MossyBrain.ts**
   - Added **⚠️ MOD & PROGRAM BLACKLIST HANDLING** instructions
   - Instructs AI to warn users about blacklisted items
   - Encourages suggesting safer alternatives
   - Respects user choice if they insist

---

## Comparison: Whitelist vs Blacklist

### Whitelist (Existing)
- **Purpose:** Protect specific mods from being mentioned/touched
- **Behavior:** Complete avoidance — never mention, discuss, or interact
- **Use Case:** Mod authors protecting their work, users protecting privacy
- **Color:** Red (strict protection)
- **Response:** "I've been asked to fully protect that mod and cannot touch it"

### Blacklist (New)
- **Purpose:** Warn against problematic mods/programs
- **Behavior:** Active warnings — explain risks, suggest alternatives
- **Use Case:** Known buggy mods, outdated tools, conflict-prone programs
- **Color:** Orange (warning/caution)
- **Response:** "I need to warn you about [item] — here's why it's problematic and here's a better alternative"

---

## Best Practices

### When to Blacklist Mods
- Mods known to cause crashes or CTDs
- Mods with unresolved compatibility issues
- Outdated mods with better alternatives
- Mods with corrupted files or broken scripts
- Mods abandoned by authors with known bugs

### When to Blacklist Programs
- Outdated tools no longer maintained
- Programs known to corrupt files
- Tools incompatible with modern systems
- Programs with better, safer alternatives
- Tools that conflict with mod managers

### When NOT to Blacklist
- Personal preference (use whitelist instead)
- Mods you simply don't like
- Programs you're not familiar with
- Items you haven't verified as problematic

---

## Privacy & Security

- **Fully local:** Blacklists stored in user's private settings file
- **Never uploaded:** No data sent to servers
- **User control:** Only user can add/remove items
- **Transparent:** User always knows what's blacklisted
- **Reversible:** Remove items anytime

---

## Future Enhancements

Potential improvements (not yet implemented):

1. **Community Blacklist Integration**
   - Optional: Subscribe to community-curated blacklists
   - User approval required before adding community items
   - Regular updates from trusted sources

2. **Severity Levels**
   - Critical (crashes/corruption)
   - High (major bugs)
   - Medium (minor issues)
   - Low (outdated)

3. **Reason Field**
   - Let users add notes about why item is blacklisted
   - Display reason in warnings
   - Help remember why item was added

4. **Import/Export**
   - Share blacklists with team members
   - Import trusted community lists
   - Export for backup

5. **Auto-Suggest Alternatives**
   - Pre-load common problematic items with known alternatives
   - User can customize suggestions
   - Link to replacement mods/tools

---

## Testing

### Manual Test Cases

1. **Add mod to blacklist** → Verify it appears in list
2. **Ask AI about blacklisted mod** → Should receive warning
3. **Remove mod from blacklist** → Should no longer warn
4. **Add program to blacklist** → Verify it appears in list
5. **Ask AI about blacklisted program** → Should receive warning + alternative
6. **Add duplicate** → Should not create duplicate entry
7. **Empty input** → Button should be disabled
8. **Long name** → Should truncate properly in UI

### Expected Behavior

- Blacklists persist across sessions
- Changes take effect immediately (next message)
- UI updates in real-time
- No conflicts with whitelist (different purpose)
- Clear visual distinction (orange vs red)

---

## Support

For issues or questions:
- Check Privacy Settings panel
- Review this documentation
- Verify settings are saved (counter updates)
- Test with a simple query about blacklisted item

---

## Changelog

### April 12, 2026 - Initial Release
- Added modContentBlacklist and programBlacklist to Settings type
- Implemented UI in PrivacySettings.tsx
- Integrated with ChatInterface dynamic context
- Added instructions to MossyBrain.ts
- Created documentation
