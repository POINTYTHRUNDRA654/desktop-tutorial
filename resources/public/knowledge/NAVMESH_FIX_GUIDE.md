# Navmesh (NAVM) Fix Guide — Fallout 4

> **Mossy authoritative reference for diagnosing and fixing navmesh issues in Fallout 4 mods.**
> Navmesh problems are one of the most crash-prone issues in the game. This guide covers detection, root causes, and the community-recommended repair workflow as of 2025.

---

## Why Navmesh Issues Cause Crashes

Fallout 4's pathfinding system relies on **NAVM (Navmesh)** records to tell NPCs where they can walk. When a mod **deletes** a vanilla navmesh record instead of replacing or disabling it:

- The engine holds a reference to a FormID that no longer resolves to valid data.
- NPCs attempting to pathfind into that area trigger a null-pointer access → **immediate CTD (Crash to Desktop)**.
- Save games that loaded while the cell was "known" can carry corrupt navmesh state and crash on reload even after the offending mod is removed.
- Symptoms include: NPCs frozen in place, NPCs refusing to enter/leave a building, crashes when approaching a specific location, or crashes upon fast-travelling to a settlement.

**Community rule: NEVER delete a vanilla navmesh record. Always replace or disable it.**

---

## How the Auditor Detects Navmesh Issues

When you scan an `.esp` or `.esm` file in The Auditor, Mossy checks for:

1. **NAVM records with the deleted flag** (record flag `0x00000020`) — these are broken and will crash the game.
2. **NAVM records present** (without deleted flag) — informational notice that the mod edits navmesh, requiring extra care in the Creation Kit.

A "deleted navmesh" finding is flagged as **Error** severity and marked **fixable via xEdit**.

---

## Root Causes

| Cause | How it happens |
|---|---|
| **Mod author deleted instead of replacing** | In Creation Kit, pressing Delete on a navmesh triangle or record instead of redrawing it |
| **Copy-paste from another cell** | Pasting a new navmesh region without merging border triangles — leaves orphaned references |
| **Conflict with another mod** | Two mods both editing the same cell's navmesh; one wins and the loser's formID becomes a dangling reference |
| **Outdated patch** | A PRP or compatibility patch was built against an older version of the mod; its navmesh references no longer match |
| **AE CC content without a patch** | Several of the 76 CC ESLs (e.g. Nuka-World on Tour) add new navmesh in existing cells; mods built pre-AE may conflict |

---

## Fix Workflow: xEdit (FO4Edit) — Change FormID Method

This is the **community-recommended method** (as of 2025) for fixing deleted navmeshes in an existing plugin.

### Prerequisites
- **xEdit 4.0.3+** — download from the xEdit GitHub page (tes5edit.github.io).
- The plugin (`.esp`/`.esm`) you need to fix.
- Optionally: Fallout 4 loaded with all masters present, so xEdit can resolve references.

### Step-by-step

**1. Load your plugin in xEdit**
```
1. Open xEdit (FO4Edit.exe or xEdit.exe with Fallout 4 as the game).
2. Check the boxes for Fallout4.esm, all DLCs, and the plugin you want to fix.
3. Wait for "Background Loader: finished" in the Messages panel.
```

**2. Find deleted NAVM records**
```
1. In the left tree, expand your plugin → expand the "Worldspace" or "Cell" section.
2. Look for records shown with [D] in their label (e.g. [D] NAVM:001A2B3C).
3. Alternatively: right-click the plugin → "Check for Errors" — deleted navmeshes appear as errors.
```

**3. Copy the FormID of the deleted record**
```
1. Click on the [D] NAVM record.
2. In the right panel, note the FormID (e.g. 001A2B3C).
3. Copy it to your clipboard or write it down.
```

**4. Find your replacement navmesh**
```
1. In the same cell, find the navmesh record your mod ADDED (not the vanilla one).
   It will have a new FormID in your plugin's FormID range.
2. Right-click it → "Change FormID".
3. Enter the FormID you copied in Step 3.
4. xEdit asks: "Update all references?" → click YES.
```

**5. Remove the deleted record**
```
1. Return to the original [D] NAVM record.
2. Right-click → "Remove" (NOT "Add master" or "Copy as override").
3. Confirm removal.
```

**6. Clean and verify**
```
1. Right-click the plugin → "Apply Script" → run "Check for Errors" again.
2. Ensure no new [D] NAVM records appear.
3. Save the plugin (Ctrl+S or close xEdit and accept changes).
```

**7. Test in-game**
```
1. Load a save near the affected area.
2. Walk through the location and confirm NPCs pathfind normally.
3. Fast-travel in/out to ensure no CTD.
```

---

## Fix Workflow: Creation Kit — Triangle Replacement Method

Use this method when **you are the mod author** and have the original CK project.

**Rule: Never use Delete on a navmesh triangle. Cover it instead.**

```
1. Open the CK and load your plugin with all masters.
2. Navigate to the affected cell (double-click in the Cell View window).
3. Click the Navmesh button in the toolbar to enter navmesh editing mode.
4. Identify the problematic triangle(s).
5. CREATE a new triangle covering the same area (use the Create Triangle tool).
6. THEN delete the old triangle — the new triangle inherits the old index, preventing broken references.
7. Finalize navmesh: Navmesh menu → "Finalize Cell Navmesh".
8. Check borders: Navmesh menu → "Find Navmesh Errors" → resolve any edge/border issues.
9. Save the plugin.
```

**Critical: Always finalise navmesh before saving.** Unfinalised navmesh causes pathfinding errors even without deleted records.

---

## Fix Workflow: Quick Auto Clean (QAC) Method

For **multiple deleted navmeshes** across a plugin, use xEdit's Quick Auto Clean (QAC):

```
1. Open xEdit with only the plugin you want to clean (no other mods, just masters).
2. Right-click the plugin → "Quick Auto Clean".
3. QAC will identify and attempt to auto-fix deleted navmesh records.
4. Review the changes in the Messages panel.
5. Save.
```

> ⚠️ QAC is conservative — it may not fix all deleted navmesh cases. Always run "Check for Errors" afterwards and apply the manual Change FormID method for any remaining [D] NAVM records.

---

## Navmesh and AE / CC Content

The 76 CC items bundled with the November 2025 AE/NG update include several that add navmesh in existing cells:

| CC Item | Navmesh implication |
|---|---|
| Nuka-World on Tour | Adds NPC presence in Commonwealth cells — new navmesh in affected areas |
| Slocum Joe's | New interior cell with its own navmesh |
| Settlement Ambush Kit | New workshop objects that may affect settlement navmesh |

If a user reports navmesh crashes specifically with AE content active, check:
- Is PRP 81+ installed? (PRP 74 does not cover AE cells.)
- Does the conflicting mod have an "AE patch" on its Nexus page?
- Load the load order in xEdit and filter for NAVM records in the affected cell to see which plugins are competing.

---

## Navmesh and Settlements

Settlement mods (Sim Settlements 2, settlement overhauls) are particularly prone to navmesh issues because:

1. Placing new objects can block existing navmesh triangles.
2. SS2 regenerates settlement navmesh dynamically in-game — this can conflict with static navmesh edits in a plugin.
3. "Workshop navmesh" and "world navmesh" are separate systems; editing one incorrectly can break the other.

**Best practice for settlement mods:**
- Use the CK's settlement navmesh tools (not the world navmesh tools) for building areas.
- Run PRP + UFO4P before finalising your mod.
- Test in a clean settlement with zero placed objects, then with a full build.

---

## Diagnostic Questions to Ask the User

When a user reports NPC pathfinding issues or location-based crashes:

1. **Which cell / location is affected?** (Settlement name, dungeon name, or exterior area)
2. **Which mods edit that location?** (Use xEdit → Filter by FormID → look for NAVM records in that cell)
3. **Is PRP installed?** Which version? (Must be 81+ for AE/NG)
4. **Are there any mods marked [D] in xEdit for NAVM records?**
5. **Does the crash happen on a fresh save, or only existing saves?** (Existing saves may carry corrupt state)
6. **Do NPCs freeze specifically near a door/doorway?** (Classic sign of a broken cell-border navmesh link)

---

## Community Resources

| Resource | URL |
|---|---|
| Nexus article: Navmesh resources and videos | nexusmods.com/fallout4/articles/4209 |
| AFKMods: Navmesh Repair knowledge base | afkmods.com → Knowledge Base → Navmesh Repair |
| YouTube: "Fixing and Preventing Deleted Navmeshes for Fallout 4" (Real Jenn) | youtube.com/watch?v=yRBsmki8JHA |
| Nexus Forums: "How do I fix deleted navmesh in xEdit?" | forums.nexusmods.com/topic/13522083 |
| xEdit documentation | tes5edit.github.io |

---

*Last updated: March 2026.*
