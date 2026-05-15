# Mossy's Recommended Mods — Download List & Credits

This is Mossy's curated list of recommended mods — mods that are high quality, widely used, and worth knowing about whether you're a player building a modlist or a modder learning from best-in-class examples. Each entry includes full author credits, a permissions summary, and install notes.

> **Respect the authors.** Every mod here was made by a person who gave their time freely. Read the permissions before using their assets in your own work. Support them if you can.

---

## How to Use This List

- **Players**: Use these as a foundation for an immersive, stable experience.
- **Mod authors**: Study these mods as references. The permissions column tells you exactly what you can and cannot do with their assets.
- **Links**: Always download from the official Nexus page listed. Never from mirrors or repacks.

---

## Animation Mods

---

### Immersive Animation Framework (IAF)

| Field | Details |
|---|---|
| **Author** | AnotherOne (AnotherOne Mods) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/50555 |
| **Category** | Animation — Ingestibles (food, drink, drugs) |
| **DLC Required** | Far Harbor, Nuka World |
| **F4SE Required** | Yes |
| **Console (Bethesda.net)** | ❌ Not available — PC only |

#### What It Does

A full, professionally crafted set of immersive first-person and third-person animations for every ingestible in the game — food, drink, chems, and drugs. Instead of the vanilla "item disappears instantly" consumption, the player now visibly eats, drinks, and uses items with context-appropriate animations.

Key features:
- 1st and 3rd person animations for all vanilla ingestibles
- Multiple animation variants per item type (randomized per session)
- Nuka-Cola bottle variants and food bowl variants based on item type
- Random utensil selection (fork, spoon, etc.) each game session
- Psycho drug reaction animation (combat threat awareness while using)
- **Keyword-based patching system** — any mod can hook into IAF by adding the correct keywords to their ingestible items (no ESP edits to IAF required)
- Extension bases for milk, bandage, doctor bag, sarsaparilla, water bottles, water flask, FO3/NV-style water bottle
- BA2 archived for load performance

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires author permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |

> All assets belong to AnotherOne or are from free-to-use modder's resources. Contact the author via their Nexus profile before using any assets.

#### Credits (as listed by the author)

- **octodecoy** — great help with scripts and MCM
- **Haru404** — vodka animation base
- **TroyIrving** — nuka-cola animation reference
- **UrbanRanger88** — has permission to port to Xbox (the only Xbox port authorised)

#### Author Support Pages

- AnotherOne Mods (Nexus profile)
- [Patreon](https://www.patreon.com/anotheronemod) — supports development of this and unofficial mods
- [Ko-Fi](https://ko-fi.com/anotheronemod) — one-time tips welcome

#### Recommended Companion Mod

- **Retextured Water** by Ben Ephla — replaces the poor-quality vanilla water can and carton textures, which are visible during IAF drinking animations

#### Install Notes

Install via MO2 or Vortex. Requires Far Harbor and Nuka World DLCs. Requires F4SE. Load after any mods that add new ingestible items to ensure keyword patches work correctly.

#### For Mod Authors — Making Your Ingestibles Compatible

IAF uses a keyword-based system — you do **not** need to edit IAF's files. Simply add the appropriate IAF keywords to your ingestible `ALCH` records in xEdit or the CK. See `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` for the full keyword list and patching workflow.

---

### First-Person Swimming Animations

| Field | Details |
|---|---|
| **Author** | neeher |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/62123 |
| **Category** | Animation — Player (first-person swimming) |
| **DLC Required** | None |
| **F4SE Required** | No |
| **Console (Bethesda.net)** | ✅ Available — PC and console |

#### What It Does

A clean, focused mod that adds visible player arms to the first-person swimming animations. Vanilla Fallout 4 shows no hands or arms when swimming in first person — this mod fixes that with natural-looking arm stroke animations, making water traversal feel like a proper part of the world rather than a disembodied camera glide.

Key features:
- Visible arms in all standard forward-swimming first-person animations
- Water ripple effects preserved
- Three install options: ESL plugin, loose files, or bare archive
- No DLC or mod requirements whatsoever
- Available on Bethesda.net for console players

#### Known Limitations (from the author)

- No water splashing on the faster swimming animation — only ripple effects. The author notes there may be a complex workaround but chose to ship the clean solution.
- No strafing or backwards swimming animations — the vanilla behavior graph does not account for these states, so they default to the idle swimming pose instead.

#### Pairs Well With

- **First-Person Running Animations** (also by neeher) — extends the same immersive first-person arms philosophy to running

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires author permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |

> All assets belong to neeher or are from free-to-use modder's resources.

#### Credits (as listed by the author)

- **Grab a Snickers** — original idea, suggested by this viewer on neeher's YouTube channel
- neeher's YouTube community — encouraged development and asked for the mod to be made available

#### Install Notes

Three options — choose one:

1. **ESL version** (recommended): Install with MO2 or Vortex like any normal mod. Takes up no ESP slot. Works out of the box.
2. **Loose files**: Extract and drag directly into your `Fallout 4\Data\` folder. Requires `bInvalidateOlderFiles=1` in your `Fallout4Custom.ini` `[Archive]` section.
3. **Archive only**: Add the `.ba2` filename to the `sResourceArchive2List` line in your `Fallout4Custom.ini` manually — no plugin at all.

For most users: **use the ESL version**.

---

### Kicks And Punches — Unarmed Animations Mod

| Field | Details |
|---|---|
| **Author** | Flovici (Florent Leibovici) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/45402 |
| **Category** | Animation — Unarmed / Melee combat |
| **DLC Required** | None |
| **F4SE Required** | No |
| **Console (Bethesda.net)** | ❌ Not available — PC only |

#### What It Does

Replaces vanilla unarmed combat animations with a full set of martial arts moves — kicks, a backflip, and a power punch for critical hits. Activates whenever the player (or any human NPC in the Commonwealth) fights unarmed, with knuckles, or with boxing gloves. A fantastic reference for learning how third-person actor animation replacements work in Fallout 4.

Key features:
- New kick animations added to the unarmed moveset
- Backflip animation on special/critical attacks
- Power punch animation for critical damage hits
- Affects **all humanoid NPCs**, not just the player — the whole Commonwealth fights better
- Replaces animations in the vanilla `BoxingGlove` and `H2H` (hand-to-hand) directories
- Compatible with **Unarmed Gameplay Overhaul** by acignacio1 (both can run together — tested against v1.1)
- No plugin required — pure animation file replacer

#### Permissions Summary

> ⭐ **This mod has notably open permissions** — one of the more generous licenses in the animation space. Read carefully before using assets.

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / release bug fixes | ✅ **Allowed — credit Flovici as original creator** |
| Convert to other games | ✅ **Allowed — credit Flovici as original creator** |
| Use assets in your mod | ✅ **Allowed — credit Flovici** |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ✅ **Allowed** |
| Console modding | ❌ Not available on Bethesda.net |

> If you build on these animations — extend them, fix bugs, or adapt them — credit **Flovici (Florent Leibovici)** as the original creator in your mod's credits. That's all they ask.

#### Credits (as listed by the author)

- No additional credits listed by the author — all assets are original work by Flovici or from free-to-use modder's resources.

#### Install Notes

**Vortex (recommended):** Install directly through the Mod Manager Download button on Nexus. Vortex handles file placement automatically.

**Manual install:**
1. Unzip the archive.
2. Copy the extracted contents into your `Fallout 4\Data\` directory.

**Manual uninstall:**
1. Delete the `\BoxingGlove\` and `\H2H\` directories from:
   ```
   Fallout 4\Data\Meshes\Actors\Character\Animations\
   ```

No plugin (`.esp`/`.esl`) is needed — this is a pure animation file replacement. No load order management required.

#### Known Behaviour

The mod replaces the shared unarmed animation pool, so the martial arts moves will be visible on human NPCs in melee brawls too — settlers, raiders, everyone. Whether this is a feature or a quirk depends on your load order and play style. If you want player-only animation control, an animation framework (like Open Animation Replacer) would be required in addition.

---

## Animation Frameworks

---

### NAF — Native Animation Framework

| Field | Details |
|---|---|
| **Author** | Snapdragon (Nexus: Snapdragon2 / GitHub: Deweh) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/73889 |
| **GitHub** | https://github.com/Deweh/Native-Animation-Framework |
| **Category** | Animation Framework — multi-character scenes, face animations, ESP-less packs |
| **F4SE Required** | ✅ Yes |
| **Address Library Required** | ✅ Yes |
| **Microsoft C++ Redist 2019** | ✅ Yes |
| **MCM** | Optional — only needed for the menu hotkey (can use `cgf "NAF.ToggleMenu"` in console instead) |
| **LooksMenu** | Optional — only needed for body morphs |
| **Console (Bethesda.net)** | ❌ Not available — PC only |

#### What It Does

NAF is a new multi-character animation framework built entirely in native F4SE C++ — a ground-up successor to AAF, engineered for performance, reliability, and features that were never possible with a Papyrus-based approach. It is the most technically advanced animation framework ever built for Fallout 4.

**Core features:**

- **In-Game Animation Studio** — create full-body animations directly in the game with inverse kinematics, motion smoothing, and multi-character support. No Blender or 3DS Max required for basic animation creation. Export to a single shareable file with one click.
- **Keyframed Face Animations** — for the first time, every face morph (including custom morphs and eye position) can be animated frame-by-frame. Previously, modders were limited to vanilla face poses.
- **HeadPart Morph Patch** — dynamically injects custom face morphs into all headparts of the appropriate type at runtime, without requiring an ESP that edits every single headpart record.
- **ESP-less Animation Packs** — play HKX animations without any ESP/plugin at all by referencing file paths directly in XML. Frees up load order slots and simplifies animation pack distribution.
- **No Doppelganger** — uses the actual player character in multi-character scenes instead of a copy. Scenes start without a fade-to-black, and animators can use custom camera paths.
- **LookAt Cam** — a toggleable camera mode that keeps the view locked on the player's head or body for more immersive scenes.
- **80× Faster XML Loading** — NAF's XML mapping and caching system loads configuration files up to 80× faster than AAF. Bad XML is silently skipped rather than causing boot failures.
- **Instant Scenes** — no lock-in delay. Actors are pulled into scenes immediately.
- **Perfect Sync System** — synchronizes animations across different races by directly altering animation time, keeping multi-character scenes perfectly in step regardless of race differences.
- **Adjustable Scene Speed** — change animation playback speed in real-time without creating separate animations.
- **AAF Animation Pack Compatibility** — drop existing AAF XML files into `Data\NAF\` and they work. NAF understands all major AAF XML types: `animationData`, `raceData`, `positionData`, `morphSetData`, `equipmentSetData`, `actionData`, `animationGroupData`, `furnitureData`, `positionTreeData`, `tagData`, plus NAF's own `faceAnim` type.
- **Built-in LooksMenu Patch** — automatically patches the LooksMenu morphs issue in v1.6.20.
- **Multi-threaded Performance** — scans the full loaded area for actors and furniture in under 10ms using multi-threading.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ✅ **Allowed — credit Snapdragon** |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ✅ **Allowed** |
| Console modding | ❌ Not available on Bethesda.net |

#### Credits (as listed by the author)

- **Maxie** — information on eye coordinates, morphs, and fly cam
- **dagobaking** — original AAF, which inspired this framework
- **Fudgyduff** — CommonLibF4
- Everyone on the RE (Reverse Engineering) Discord for invaluable contributions to FO4 engine knowledge

#### Install Notes

1. Install **F4SE** (matching your game version) from f4se.silverlock.org.
2. Install **Address Library for F4SE Plugins** from Nexus.
3. Install **Microsoft C++ Redistributable 2019** — download from Microsoft's official site if not already present.
4. Install **NAF** via MO2 or Vortex (Mod Manager Download button).
5. Optionally install **MCM** (for in-game menu hotkey) and **LooksMenu** (for body morphs).
6. Launch the game. Open the NAF menu in-game to generate a default `NAF.ini` and configure settings.

**No ESP is required by NAF itself.** If you install animation packs that include an ESP, those follow normal load order rules.

#### For Mod Authors — Creating Animation Content for NAF

See `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` Part 13 for the full NAF mod-author integration guide, including:
- ESP-less animation pack XML format
- `raceData` configuration for non-human races
- Face animation creation workflow
- `NAF.ini` HeadPart morph patch configuration

---

## Modding Tools & Resources

These are not gameplay mods — they are tools and rigs used *during* mod creation. Every animation mod author should know about these.

---

### MaikCG F4Biped — Animation Rig for Fallout 4

| Field | Details |
|---|---|
| **Author** | MaikCG |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/16691 |
| **Category** | Modder's Resource — Animation rig (3ds Max, Maya, MotionBuilder) |
| **Type** | Tool / Resource — not a game mod |
| **F4SE Required** | No |
| **Console (Bethesda.net)** | N/A — modder's tool only |

#### What It Is

The definitive animation rig kit for creating and importing Fallout 4 animations. MaikCG built rigs for every major 3D application used by the modding community, wired directly to the FO4 skeleton with IK/FK support, twist bones, and Havok Content Tools presets included. This is the foundation that most serious FO4 animation work is built on.

**Files included:**

| File | Purpose |
|---|---|
| `F4Biped.max` | Main 3ds Max working file — Biped rig linked to the FO4 skeleton, IK/FK arms/legs, twist bones, armour/clothing skinning support |
| `F4BipedImport.max` | 3ds Max file for importing vanilla `.fbx` animations |
| `F4BipedCAT.max` | 3ds Max CAT-based rig — simpler alternative to Biped, especially suited for 1st-person animation |
| `F4BipedCATImport.max` | Import companion for the CAT rig |
| `F4Biped.FBX` | Same rig in FBX format for MotionBuilder — the best tool for processing motion capture data |
| `F4Biped.ma` | Same rig for Maya (HumanIK system) |
| `F4Animation.hko` | Havok Content Tools preset with three configurations: `ConvertAnimation_x32`, `AnimationExport1stPerson`, `AnimationExport3rdPerson` |
| `Fallout4Rig1st.txt` | Bone list for HCT 1st-person skeleton settings |
| `Fallout4Rig3rd.txt` | Bone list for HCT 3rd-person skeleton settings |
| `skeleton.hkx` | Reference skeleton for Havok 2 FBX Converter |

**Software this kit supports:**
- 3ds Max 2014
- MotionBuilder 2014
- Maya 2016
- HavokContentTools 2014-1-0
- niftools-max-plugins 3.8.0
- Havok 2 FBX Converter 0.1a

#### Permissions Summary

F4Biped is tagged as a **Modder's Resource** on Nexus. The explicit permissions grid is not posted, which under Nexus conventions means:

| Permission | Status |
|---|---|
| Use rig to create your own FO4 animations | ✅ **Intended use — this is a modder's resource** |
| Credit MaikCG in your mod's credits | ✅ **Required if you use it** |
| Upload the rig itself to other sites | ❌ Contact MaikCG for permission |
| Use in paid mods / commercial projects | ❌ Contact MaikCG for permission |

> **Always check the Nexus page permissions tab for any updates.** When in doubt, contact MaikCG directly via Nexus messages.

#### Credits

- **MaikCG** — all rig files, Havok presets, and documentation. No other credits listed by the author.

#### Notes for Mod Authors

- See `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` Part 13 for the full F4Biped pipeline — import workflow, 1st/3rd person conventions, weapon animation setup, and export to HCT.
- The HCT preset `AnimationExport1stPerson` and `AnimationExport3rdPerson` handle the skeleton differences between the two viewpoints automatically — always use the correct preset for the animation type you're exporting.
- 1st-person animations: weapon faces +Y, head/neck rotated back 90° to stay out of camera. Skeleton stored at `Actors\Character\_1stPerson\Animations\`.
- 3rd-person animations: mostly in-place; locomotion uses actual Bip/skeleton root displacement. Camera/CamTarget bone positions must be set manually.
- The Biped rig is best for motion capture processing and MotionBuilder pipeline. The CAT rig (`F4BipedCAT.max`) is easier for hand-keyed 1st-person work.

---

---

## Animation Mods as Learning References

These five mods and tools — IAF, First-Person Swimming, Kicks And Punches, NAF, and F4Biped — together cover the full spectrum of Fallout 4 animation modding, from the raw pipeline to full native framework development. Study them in order:

| Mod / Tool | Architecture | Key Learning |
|---|---|---|
| **MaikCG F4Biped** (#16691) | Modder's resource — rig kit | The canonical pipeline: 3ds Max / Maya / MotionBuilder → HCT → .hkx; 1st vs 3rd person skeleton conventions; Havok export presets |
| **Kicks And Punches** (#45402) | Directory-based HKX replacer | Simplest animation replacer architecture; shared actor animation pools; no-plugin distribution |
| **First-Person Swimming Animations** (#62123) | Behavior graph HKX replacement | Replacing behavior graph–driven 1st-person states; vanilla behavior graph limits; ESL/loose/archive distribution |
| **Immersive Animation Framework** (#50555) | Keyword dispatch + HKX files | Keyword-driven animation routing; 1st/3rd person variant sets; MCM integration for animation mods |
| **NAF — Native Animation Framework** (#73889) | Native F4SE C++ framework | Multi-character scene architecture; ESP-less XML-driven animation packs; face animation systems; framework-level performance engineering |

**Study approach:** Start with F4Biped to understand the raw pipeline → Kicks And Punches for the simplest in-game result → First-Person Swimming for behavior graph work → IAF for keyword dispatch → NAF for full framework design. Each level builds on concepts from the last. Cross-reference with `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` at every step.

---

## How to Suggest a Mod for This List

If you've found a mod that belongs here — high quality, widely compatible, respectful permissions — tell Mossy about it. Include the Nexus URL and why you think it deserves a place. Mossy will evaluate it and add it with full credits if it meets the bar.

---

*List maintained by Mossy. All credits belong to the respective mod authors. Mossy does not host, mirror, or distribute any mod files — always download from the official Nexus pages linked above.*

*Last updated: May 2026.*
