# Fallout 4 Modding Community Resources Guide

Finding the right community resource at the right time is half the battle in Fallout 4 modding. This guide maps out every significant platform, Discord server, wiki, YouTube channel, and tool repository in the FO4 modding ecosystem — along with how to use them effectively, how to ask for help without frustrating experts, and how to give back.

---

## Nexus Mods (nexusmods.com/fallout4)

Nexus Mods is the primary distribution platform for Fallout 4 PC mods. As of 2025, it hosts over 70,000 FO4 mods.

### Finding Mods Effectively

- **Search with filters**: Use the category sidebar (Armour, Weapons, Settlements, etc.) and sort by Endorsements (all time) for established quality mods.
- **Collections**: Curated mod lists built by community members. Useful for preset modded setups but always review what's included — some collections include mods with known issues.
- **"Requirements" tab**: Every well-maintained mod lists its dependencies here. Install all required mods before the mod itself.
- **"Posts" tab**: The bug report and discussion section. Search here before reporting a bug — it's likely already known and answered.
- **"Articles" tab**: Some authors post changelogs, known issues, and compatibility guides here.

### Mod Manager Download

Always use **Mod Organizer 2** or **Vortex** with the mod manager download button — it one-clicks installation with conflict detection. Never manually extract mods into the game Data folder; it makes tracking and removal nearly impossible.

- **MO2**: https://www.modorganizer.org/ (preferred by most power users)
- **Vortex**: https://www.nexusmods.com/about/vortex/ (official Nexus tool; easier for beginners)

### Nexus Premium

Premium membership enables unlimited download speeds and direct CDN downloads. If you're downloading large texture or LOD packs regularly, it's worth considering. Without Premium, downloads are throttled and served through slower servers.

### Tracking and Notifications

- Click "Track" on mods you use. Nexus sends email or site notifications when tracked mods update.
- Use the "Collections" watchlist to follow curated load order updates.

---

## Reddit

### r/Fallout4Mods
- **URL**: https://www.reddit.com/r/Fallout4Mods/
- **Purpose**: PC mod recommendations, help requests, showcase posts
- **Flair system**: Use [Request], [Help], [PC], [XB1], [PS4] flairs
- **Best for**: "What mod does X?" questions, discovery posts, community polls on best mods in a category
- **Note**: Heavily filtered for spam. New accounts may have posts held for review.

### r/FO4mods
- **URL**: https://www.reddit.com/r/FO4mods/
- **Purpose**: Similar to above; slightly smaller but often faster response on niche questions
- **Best for**: Technical modding questions when r/Fallout4Mods feels oversaturated

### r/Fallout4ModsXB1
- **URL**: https://www.reddit.com/r/Fallout4ModsXB1/
- **Purpose**: Xbox/console mod help (Bethesda.net mods only)
- **Note**: Console modding is more limited; F4SE and most PC-specific tools are unavailable

### r/FalloutMods
- **URL**: https://www.reddit.com/r/FalloutMods/
- **Purpose**: All Fallout games; relevant for cross-game comparisons and shared tool discussion (xEdit, Wrye Bash)

### Posting Tips for Reddit
- Include your **load order** (as a pastebin link or screenshot) when asking for troubleshooting help
- Specify **game version** (OG/NG/1.10.984/1.11.x) and **F4SE version** upfront
- Use the **search function first** — most common questions have been answered dozens of times

---

## Discord Servers

### Fallout 4 Modding Community
- **Purpose**: General FO4 modding help; channels for CK questions, script help, texture work, and more
- **How to find**: Search "Fallout 4 Modding" on Disboard (https://disboard.org) or via Nexus community links
- **Best channels**: `#ck-help`, `#scripting-papyrus`, `#texture-mesh-work`, `#mod-showcase`
- **Etiquette**: Read the pinned FAQs before asking. Include load order and logs in help requests.

### CommonLibF4 Development
- **Purpose**: Development of CommonLibF4 — the C++ library for F4SE plugin authoring
- **Access**: Via the F4SE Discord or direct invite links posted in CommonLibF4 GitHub README
- **Best for**: Native code plugin development, NG compatibility questions, ASM/RE discussions
- **Note**: Highly technical. Don't ask basic Papyrus questions here.

### Sim Settlements 2 Discord
- **Purpose**: Support and development for Sim Settlements 2 — the most complex FO4 mod framework
- **Best for**: Addon pack development, SS2 scripting API questions, settlement system behavior
- **Access**: Link in SS2's Nexus page description

### xEdit Discord
- **URL**: Via xEdit GitHub or Nexus page for xEdit
- **Purpose**: xEdit (FO4Edit) usage, scripting xEdit Pascal scripts, conflict resolution
- **Channels**: `#fo4-help`, `#scripting`, `#general`
- **Best for**: Plugin conflict analysis, mastering your mod for release, record structure questions

### F4SE Discord
- **Purpose**: F4SE (Fallout 4 Script Extender) development, DLL plugin development, F4SE API questions
- **Access**: https://discord.gg/f4se (or via F4SE website)
- **Best for**: F4SE-dependent mod issues, DLL plugin authoring, NG compatibility for F4SE plugins
- **Note**: For users of F4SE mods having installation issues, post in general FO4 Modding Community Discord instead — F4SE Discord is for developers.

### Bethesda Game Studios (Official)
- **Note**: BGS has an official Discord, but it's not focused on modding support. Modding-specific help is better found in community servers.

---

## GitHub Repositories

These are the authoritative source repositories. **Only download tools from official sources** — unofficial mirrors may bundle malware.

### F4SE (Fallout 4 Script Extender)
- **GitHub**: https://github.com/ianpatt/f4se
- **Releases (download here)**: https://f4se.silverlock.org/
- **Purpose**: Script extender enabling Papyrus additions and DLL plugins
- **Compatibility**: Check version table on the website — F4SE version must match game version exactly

### CommonLibF4
- **GitHub**: https://github.com/Ryan-rsm-McKenzie/CommonLibF4 (original) and https://github.com/rethesda/CommonLibF4 (NG fork)
- **Purpose**: C++ library for developing F4SE plugins targeting the new generation runtime
- **Use for**: Building DLL-based F4SE plugins in C++

### Previsibines Repair Pack (PRP)
- **GitHub**: https://github.com/kinggath/PRP (or search on Nexus — GitHub may redirect)
- **Nexus**: https://www.nexusmods.com/fallout4/mods/46403
- **Purpose**: Restores precombined mesh data broken by many mods; critical for performance

### Community Shaders
- **GitHub**: https://github.com/doodlum/skyrim-community-shaders (Skyrim), FO4 port in development
- **Nexus**: https://www.nexusmods.com/fallout4/ (search "Community Shaders")
- **Purpose**: Open-source shader framework adding parallax, SSS, improved lighting to FO4

### xEdit (FO4Edit)
- **GitHub**: https://github.com/TES5Edit/TES5Edit (unified repo for all games)
- **Purpose**: Plugin editor, conflict resolver, record inspector
- **Download**: Always from GitHub Releases — never from third-party mirrors

### DynDOLOD
- **Official source**: https://www.nexusmods.com/fallout4/mods/20155 and https://stepmodifications.org/forum/forum/200-dyndo lod/
- **Purpose**: LOD generation for trees, objects, and terrain
- **Do NOT download from**: Any random upload on file sharing sites

### Wrye Bash
- **GitHub**: https://github.com/wrye-bash/wrye-bash
- **Purpose**: Mod manager with Bashed Patch for leveled list merging
- **Download**: GitHub Releases page

### Buffout 4 / Addictol
- **Buffout 4 NG**: https://www.nexusmods.com/fallout4/mods/47359
- **Addictol**: https://www.nexusmods.com/fallout4/mods/ (search "Addictol" — latest unified crash suite)
- **Purpose**: Crash prevention, crash logging, engine bug fixes

### CLASSIC (Crash Log Scanner)
- **GitHub**: https://github.com/evildarkarchon/CLASSIC-Fallout4
- **Purpose**: Auto-scans Buffout/Addictol crash logs and identifies likely culprit plugins

---

## Wikis

### Creation Kit Wiki (ck.uesp.net)
- **URL**: https://ck.uesp.net/wiki/Fallout4Mod:Main_Page
- **Purpose**: Comprehensive reference for all CK record types, Papyrus functions, scripting events
- **Best sections**:
  - Papyrus function reference: https://ck.uesp.net/wiki/Category:Fallout_4_Script_Reference
  - Actor Value reference, Form Types, Script Events
- **Contribution**: Anyone can create an account and edit. Many FO4-specific articles need improvement — consider contributing.

### Fallout Wiki (fallout.fandom.com)
- **URL**: https://fallout.fandom.com/wiki/Fallout_4
- **Purpose**: Lore, vanilla game content, item IDs for modding reference
- **Modding use**: Lookup vanilla record names, FormIDs, NPC names, and location data

### STEP Project Wiki
- **URL**: https://stepmodifications.org/wiki/
- **Purpose**: Detailed guides for stable, quality mod configurations; more Skyrim-focused but FO4 section exists
- **Best for**: Stability-first mod list building methodology

---

## YouTube Channels

### Darkfox127
- **Channel**: https://www.youtube.com/@Darkfox127
- **Focus**: Detailed Creation Kit tutorials — world building, quest creation, dialogue, NPC setup
- **Best series**: "Fallout 4 Creation Kit Tutorials" playlist
- **Level**: Beginner to intermediate

### LadyAlekto
- **Focus**: Advanced modding tutorials, SS2 addon development, scripting
- **Search**: YouTube search "LadyAlekto Fallout 4"
- **Level**: Intermediate to advanced

### Seddon4494
- **Focus**: CK basics, placing objects, cell editing
- **Level**: Beginner

### FudgeMuppet
- **Focus**: Lore, build guides — useful for understanding the game context that affects modding choices
- **Modding content**: Occasional modding showcase

### GingasVR
- **Focus**: xEdit tutorials, conflict resolution, cleaning plugins
- **Best video**: "FO4Edit Conflict Resolution Tutorial"

### Finding More
Search YouTube for:
- "Fallout 4 Creation Kit tutorial [specific topic]"
- "FO4Edit tutorial"
- "Fallout 4 [tool name] tutorial"

Many tutorials are from 2015–2017 but the CK fundamentals haven't changed significantly.

---

## Bethesda.net Forums

- **URL**: https://community.bethesda.net/
- **Current status**: Primarily used for console modding (Xbox/PlayStation); PC modding discussion has largely migrated to Reddit, Discord, and Nexus.
- **Creator Portal**: https://creations.bethesda.net/ — for publishing mods through the official Creations system (post-AE update)
- **Relevance for PC modders**: Low. Nexus and Discord are preferred.

---

## How to Report Bugs Effectively

A good bug report gets your issue fixed faster and earns goodwill from mod authors. Always include:

### Required information:
1. **Mod version**: Exact version number (e.g., `v1.2.1`, not "the latest")
2. **Game version**: `1.10.984` (OG NG), `1.11.191`, etc.
3. **F4SE version**: `0.7.7`, `0.7.3-ng`, etc.
4. **Load order**: Export from MO2 (right-click → Export to text file) or copy from Vortex. Post as pastebin link if long.
5. **Steps to reproduce**: Exact sequence of actions that triggers the bug
6. **Expected result**: What should have happened
7. **Actual result**: What happened instead

### For crashes (CTDs):
8. **Crash log**: The Addictol/Buffout crash log from `Documents\My Games\Fallout4\F4SE\`
9. **CLASSIC output**: Run CLASSIC on the crash log and paste the scan results

### For script bugs:
10. **Papyrus log**: Enable logging in INI, reproduce the issue, attach `Papyrus.0.log`

### Template (paste into Nexus "Posts" or bug report):
```
**Mod Version**: 1.2.1
**Game Version**: 1.10.984 (NG)
**F4SE Version**: 0.7.7
**Other relevant mods**: [list any that interact with this mod]
**Steps to reproduce**:
1. Start new game
2. Go to Sanctuary
3. Open workshop
4. Bug occurs when...

**Expected behavior**: Workshop opens normally
**Actual behavior**: CTD / item disappears / [specific issue]

**Crash log**: [pastebin link or attachment]
**Load order**: [pastebin link or MO2 export]
```

---

## How to Ask for Help Effectively

### Before posting:
- **Search first**: Check Nexus Posts tab, Reddit search, Discord search with keywords from your error message
- **Read the mod's description page**: Most common issues are documented in the FAQ section
- **Check requirements**: Ensure all required mods and correct versions are installed
- **Try without other mods**: Isolate whether the issue is mod conflict (disable half your load order, binary search)

### When posting:
- **Be specific**: "The mod doesn't work" is unhelpful. "The workbench activator at [location] doesn't open the crafting menu after the [quest] stage completes" is actionable.
- **Include context**: Game version, mod version, relevant other mods
- **One issue per post**: Don't bundle 5 unrelated bugs
- **Don't demand urgency**: Mod authors are volunteers. Phrases like "please fix ASAP" or "this is urgent" are off-putting.

### Tone:
- "I noticed X might be a bug — here's my log and steps" → helpful, gets response
- "This mod is broken" → unhelpful, may be ignored
- "How do I do X? I've read the description and tried Y and Z" → good; shows effort

---

## Recommended Mods — Download List & Credits

Mossy maintains a curated list of high-quality mods worth knowing — both as a player building a modlist and as a mod author studying excellent examples. Each entry includes full author credits, permissions, requirements, and install notes.

➡️ **See [`RECOMMENDED_MODS_LIST.md`](RECOMMENDED_MODS_LIST.md)** for the full list.

Current entries:
- **Immersive Animation Framework** (Nexus #50555) by AnotherOne — ingestible animations with keyword patching API
- **First-Person Swimming Animations** (Nexus #62123) by neeher — arms visible while swimming
- **Kicks And Punches — Unarmed Animations** (Nexus #45402) by Flovici — martial arts replacer for unarmed/boxing combat
- **JNFA2026 — Just New Female Animations** (Nexus #100034) by cyb9erg — feminine movement replacer for female player character
- **RAF — Random Animation Framework** (Nexus #90839) by SexyWitch — 80+ animations, 9 NPC archetypes, dynamic walk/run speeds
- **Witch's Nature** (Nexus #89664) by SexyWitch — blinking, expressive face morphs, eye & head tracking, no scripts
- **HIT THE MASS** (Nexus #90416) by SexyWitch — combat hit reactions, hitstop, knockback, VFX panic criticals
- **NAF — Native Animation Framework** (Nexus #73889) by Snapdragon/Deweh — multi-character animation framework, ESP-less packs, face animations
- **Animated World Framework** (Nexus #100946) by Knundrum — F4SE-native world interaction animations; no scripting required for patch authors
- **MaikCG F4Biped** (Nexus #16691) by MaikCG — professional animation rig for 3ds Max, Maya, and MotionBuilder
- **2025–2026 Toolchain Gap-Fill Section** — now includes Collective Modding Toolkit (OG/NG/AE diagnostics), xEdit/FO4Edit official build channels, and papyrus-lang VS Code tooling with credits and source links

---

## Tools and Their Official Sources

**Only ever download modding tools from these official locations:**

| Tool | Official Source |
|---|---|
| F4SE | https://f4se.silverlock.org/ |
| xEdit (FO4Edit) | GitHub Releases: TES5Edit/TES5Edit |
| Wrye Bash | GitHub Releases: wrye-bash/wrye-bash |
| DynDOLOD | Nexus + stepmodifications.org forum |
| xLODGen | Nexus + stepmodifications.org forum |
| Mod Organizer 2 | https://www.modorganizer.org/ |
| Vortex | https://www.nexusmods.com/about/vortex/ |
| NifSkope | GitHub Releases: niftools/nifskope |
| Cathedral Assets Optimizer | Nexus |
| BodySlide and Outfit Studio | Nexus |
| LOOT | https://loot.github.io/ |
| CLASSIC | GitHub: evildarkarchon/CLASSIC-Fallout4 |
| Addictol | Nexus (search "Addictol") |
| Spriggit | GitHub: Mutagen-Modding/Spriggit |
| Archive2 | Bundled with Creation Kit (Steam) |
| Papyrus Compiler | Bundled with Creation Kit (Steam) |

> **⚠️ WARNING**: Do NOT download F4SE, xEdit, or other core tools from random file-sharing sites, YouTube video descriptions, or "modding packs." These are common vectors for bundled malware. Always use the official sources above.

---

## How to Give Back to the Community

The modding community runs on volunteer effort. Here's how to contribute:

### Testing
- Volunteer as a beta tester for mods in development. Post in mod forums with "[Beta Testing Available]".
- Report bugs with complete information using the template above.
- Test mods in diverse load order configurations and report compatibility.

### Writing Wiki Articles
- Create an account on ck.uesp.net and improve or create articles.
- Focus on FO4-specific pages — many have less detail than their Skyrim equivalents.
- Document Papyrus functions that lack examples.

### Supporting Authors Financially
- Many mod authors have Ko-fi or Patreon links on their Nexus pages.
- Nexus Mods has a "Support the author" donation button on mod pages (goes directly to author).
- Even small amounts help sustain long-term mod development.

### Creating Guides and Tutorials
- Write Nexus Articles or STEP Wiki pages documenting techniques you've discovered.
- Record tutorials for tasks that lack good documentation (e.g., specific CK workflows).
- Respond to Reddit and Discord help questions when you know the answer.

### Compatibility Patches
- When you identify a conflict between two mods you use, create a compatibility patch.
- Share it on Nexus (check both mod authors' permissions first — most allow patches).
- Tag it with "Compatibility Patch" category and list both parent mods as requirements.

### Translation
- Translate popular mods into other languages (with author permission).
- Nexus has a specific "Translation" category for this.
- Many mod authors explicitly invite translations in their descriptions.

### Tools and Code
- Contribute bug fixes or features to open-source tools (xEdit, Wrye Bash, CommonLibF4) via GitHub pull requests.
- Document your contributions in the PR — explain what you changed and why.
