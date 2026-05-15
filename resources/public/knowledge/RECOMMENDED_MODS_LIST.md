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

## Animation Mods as Learning References

These three mods — IAF, First-Person Swimming Animations, and Kicks And Punches — are excellent study material for anyone learning Fallout 4 animation modding. Here's what each one teaches:

| Mod | Key Learning |
|---|---|
| **Immersive Animation Framework** (#50555) | How to build a keyword-driven animation dispatch system; how to structure 1st/3rd person variant sets; how to use MCM for an animation mod |
| **First-Person Swimming Animations** (#62123) | How to replace behavior graph–driven first-person animations; the limits of the vanilla behavior graph (no strafe/back states); three different distribution formats (ESL/loose/archive) |
| **Kicks And Punches** (#45402) | How to replace third-person actor animations via directory-based `.hkx` file replacement; how shared animation pools affect all actors of a type; the simplest possible animation mod architecture |

**Study approach:** Install each mod, examine its files in MO2's "Data" tab to see the exact folder structure, open the `.hkx` files in HKXPackUI or the Havok Preview Tool, and compare to the vanilla equivalents. Cross-reference with `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` for the technical context behind what you're looking at.

---

## How to Suggest a Mod for This List

If you've found a mod that belongs here — high quality, widely compatible, respectful permissions — tell Mossy about it. Include the Nexus URL and why you think it deserves a place. Mossy will evaluate it and add it with full credits if it meets the bar.

---

*List maintained by Mossy. All credits belong to the respective mod authors. Mossy does not host, mirror, or distribute any mod files — always download from the official Nexus pages linked above.*

*Last updated: May 2026.*
