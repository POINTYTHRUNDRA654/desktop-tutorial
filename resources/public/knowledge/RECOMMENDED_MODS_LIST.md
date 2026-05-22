# Mossy's Recommended Mods — Download List & Credits

This is Mossy's curated list of recommended mods — mods that are high quality, widely used, and worth knowing about whether you're a player building a modlist or a modder learning from best-in-class examples. Each entry includes full author credits, a permissions summary, and install notes.

> **Respect the authors.** Every mod here was made by a person who gave their time freely. Read the permissions before using their assets in your own work. Support them if you can.

---

## How to Use This List

- **Players**: Use these as a foundation for an immersive, stable experience.
- **Mod authors**: Study these mods as references. The permissions column tells you exactly what you can and cannot do with their assets.
- **Links**: Always download from the official Nexus page listed. Never from mirrors or repacks.

---

## Cubemap & Texture Authoring Toolchain (Nexus Publication Support)

This section tracks trusted external tools used for ultra-realistic Fallout 4 texture/cubemap workflows.  
Use these links when building `_d/_n/_s/_e/_m` pipelines and keep creator credits intact in your project notes.

| Tool | Credits / Maintainer | Official Source | Use in Pipeline |
|---|---|---|---|
| NVIDIA Texture Tools Exporter | NVIDIA Corporation | https://developer.nvidia.com/texture-tools-exporter | DDS compression, mip generation, Cube Map export for `_e.dds` |
| Materialize | Bounding Box Software | https://boundingboxsoftware.com/materialize/ | Seamless conversion and map extraction (height/metal/smoothness) |
| ShaderMap 4 | Rendering Systems Inc. | https://shadermap.com/ | DirectX normal generation, AO baking, micro-detail workflows |
| Photopea | Ivan Kuckir | https://www.photopea.com/ | Channel packing and reflection-mask authoring |
| Creation Kit Archive2 | Bethesda Game Studios | Bundled with Creation Kit (`Fallout 4/Tools/Archive2/Archive2.exe`) | Final BA2 split packaging (`Main.ba2` + `Textures.ba2`) |
| Hugin (optional) | Hugin open-source contributors | https://hugin.sourceforge.io/ | Panorama/cross-layout prep before Cube Map export |

### Attribution and Usage Notes

- Keep upstream author/org credits in your release notes when a workflow depends heavily on their tooling.
- For third-party assets/textures/HDRIs, follow each asset license and include explicit credit links on Nexus.
- Use official sources only; avoid mirror repacks.

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

### JNFA2026 — Just New Female Animations

| Field | Details |
|---|---|
| **Author** | cyb9erg (Nexus: Cyb9rg) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/100034 |
| **Category** | Animation — Female player character (idle, walk, run, sprint) |
| **Version** | 1.1 |
| **DLC Required** | None |
| **F4SE Required** | No |
| **Console (Bethesda.net)** | See note below |

#### What It Does

A re-release of the classic "Just New Female Animations" mod — feminine, natural-feeling movement replacers for the female player character, deliberately kept tasteful and not oversexualized. Replaces third-person idle, walk, run, and sprint animations with smoother, gender-authentic equivalents. One of the most-used animation replacers in the community for female character playthroughs.

Key features:
- Replaces 3rd-person idle, walk, run, and sprint animations for female characters
- Feminine motion that reads naturally without being exaggerated
- Pure animation file replacer — no plugin, no F4SE, no scripting overhead
- Installs as loose `.hkx` files or via mod manager
- Compatible with body replacers (CBBE, Fusion Girl, etc.) — animations are skeleton-driven, not mesh-dependent
- Use only one main movement animation replacer at a time to prevent conflicts

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires cyb9erg's permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires cyb9erg's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding (Bethesda.net) | ⚠️ See note |

> **Xbox note:** The standard Nexus permissions template lists this as unavailable on Bethesda.net. However, the author has added a personal note: *"Anyone who wants to upload it to Xbox is free to do so (I can't), as long as the entire page and descriptions are respected."* The author's note takes precedence for Xbox — you may upload to Bethesda.net for Xbox **if you reproduce the full mod page and description accurately and credit cyb9erg**.

#### Credits

- **cyb9erg** — re-upload and current maintainer. No additional file credits listed.
- Original "Just New Female Animations" lineage — a long-running community staple that cyb9erg has brought back and updated as JNFA2026.

#### Install Notes

Install via MO2 or Vortex using the Mod Manager Download button. No plugin required. No F4SE required. Place after any body mesh mods in MO2's left panel to ensure the animation files take priority. Only one movement animation replacer should be active at a time — disable or remove any conflicting female animation mods before enabling JNFA2026.

Install via MO2 or Vortex using the Mod Manager Download button. No plugin required. No F4SE required. Place after any body mesh mods in MO2's left panel to ensure the animation files take priority. Only one movement animation replacer should be active at a time — disable or remove any conflicting female animation mods before enabling JNFA2026.

---

### RAF — Random Animation Framework (Animation Overhaul for Humans)

| Field | Details |
|---|---|
| **Author** | SexyWitch |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/90839 |
| **Category** | Animation — NPC & player movement archetypes, behavioral variety |
| **DLC Required** | None |
| **F4SE Required** | No |
| **Scripts** | 1 lightweight script |
| **Console (Bethesda.net)** | ❌ Not available — PC only |
| **Uploaded** | January 2025 |
| **Last Updated** | October 2025 |

#### What It Does

RAF unlocks the full breadth of Fallout 4's built-in animation system — a system that has always existed in the engine but was barely used by the base game. Vanilla actors default to a single movement archetype; RAF distributes all nine vanilla archetypes across the population and adds dynamic speed variation, making every human in the Commonwealth move like an individual.

The core insight: Fallout 4 already has animations for confident walkers, nervous people, the elderly, military postures, babies being held, and more — they just weren't being used. RAF makes use of all of them.

**What RAF adds:**

- **80+ active animations** across 9 vanilla movement archetypes
- **6 walk animations in 1** — base + elderly + optional girly variant, blended seamlessly via dynamic speed switching
- **9 archetype rings** craftable at the chemistry workbench — equip an actor with a ring to assign their movement personality
- **RAF random speed** — 5 speed tiers with random switching for both player and NPCs, producing natural-feeling variation rather than robotic constant-speed movement
- All 9 vanilla archetypes deployed: `player`, `confident`, `fastwalk`, `nervous/depressed`, `elderly/tired`, `irritated`, `neutral`, and more
- **Baby-holding animation** repurposed as a general posture (not just the prologue)
- **Military flavor** edited for better general-use timing
- No load conflicts — 1 script

**Ring types (crafted at chemistry workbench):**

| Ring | Effect |
|---|---|
| RAF re | Resident Evil–style movement |
| RAF c | Even faster variant |
| RAF 11a | Recommended first pick — best all-around baseline |
| RAF Tcaa/nx-Bot | Base only — random speeds, random switching |
| RAF random speed | For player and actors — 5 speed types, random switching |

#### Recommended Install Order

For the full 6-walk-animation experience, install in this order:

1. Install RAF (this mod)
2. Install the included animation improvements (for seamless transitions)
3. Install **Elderly animation MOD** — adds the 5th walk animation
4. Install **Girly animation MOD** — adds the 6th walk animation *(optional)*

> The author notes: *"If you mix all together, IT MUST FIT — fit for nice transitions."* Only mix with compatible animation mods. Install after the Vault prologue for best results.

#### Companion Mods by the Same Author

SexyWitch has a suite of related animation mods worth exploring alongside RAF:
- **Eyes blinking and express natural face** — facial animation overhaul
- **HIT THE MASS** — combat hit reactions
- **Witch's DOGmeat animation overhaul** (parts 1 & 2) — Dogmeat movement improvements
- **Witch's CAT and Brahmin** — animal companion animations

Also recommended by the author: **Simple Slide or Stomp** by Cyan49.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires SexyWitch's permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires SexyWitch's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding | ❌ Not available on Bethesda.net |

#### Credits (as listed by the author)

- **SexyWitch** — mod author and primary creator
- **GoneFish** — contributor
- **Cyan49** — contributor

---

### Witch's Nature — Eyes, Blinking & Expressive Face Morphs

| Field | Details |
|---|---|
| **Author** | SexyWitch |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/89664 |
| **Category** | Animation — Facial expressions, blinking, eye & head tracking |
| **DLC Required** | None |
| **F4SE Required** | No |
| **Scripts** | None — vanilla record edits only |
| **Console (Bethesda.net)** | ✅ A specific person has been given permission to port — credit SexyWitch |
| **Versions** | ESP (recommended, load at end) and ESL (for those at the mod limit) |

#### What It Does

Witch's Nature overhauls the facial life of every character in the game — player and NPC alike — using only vanilla record edits. No scripts, no F4SE, no framework requirements. It makes characters look genuinely present during conversations and while going about their lives, through more frequent blinking, expressive face morphs, improved eye tracking angles, and better head movement timing.

Key features:
- **More blinking** — increased natural blink frequency for all characters
- **Improved eye and head angle movement** — tracking feels more alive; angles are tuned for believable attention
- **Expressive face morphs** — subtle emotional expressions during idle and dialogue
- **NPC and PC talk timing** — improves the rhythm of speech animations so conversations feel more grounded
- **Alpha and Beta variants:**
  - *Beta* — different timing for normal vs. dialogue emotion states
  - *Alpha* — more precise, detail-focused version
- **Zero overhead** — pure vanilla edits, fully compatible with everything at time of writing
- Works with player comment mods, custom companion heads (e.g. MAYA), and all custom NPC mods
- **Modular eyes-only variant** available separately: https://www.nexusmods.com/fallout4/mods/89879

> Already mentioned in the RAF (#90839) entry as part of SexyWitch's animation suite — this is the full standalone entry with complete credits and install details.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires SexyWitch's permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires SexyWitch's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding (Bethesda.net) | ✅ **A specific person has been granted permission to port — credit SexyWitch** |

> Unlike RAF (#90839) which is PC-only, this mod has an authorised console port. If you see it on Bethesda.net for Xbox, that is a legitimate upload made with the author's permission.

#### Credits

- **SexyWitch** — mod author. No additional credits listed.
- Ko-fi support page linked on the Nexus mod page.

#### Install Notes

Install via MO2 or Vortex. **Choose one version:**
- **ESP version** — recommended; place at the **end of your load order** for best results
- **ESL version** — use if you are at or near the 255 ESP plugin limit

Can be installed or updated at any time — no save dependency. No conflicts reported with any current mods.

**Pairs naturally with the rest of SexyWitch's suite:**
- RAF (#90839) — movement and archetype variety
- HIT THE MASS (#90416) — combat hit reactions (see entry below)
- Witch's DOGmeat animation overhaul — Dogmeat animations

---

### HIT THE MASS — Combat Hit Reactions & Impact Overhaul

| Field | Details |
|---|---|
| **Author** | SexyWitch |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/90416 |
| **Category** | Combat — Hit reactions, hitstop, knockback, VFX, panic criticals |
| **DLC Required** | Far Harbor, Nuka World |
| **F4SE Required** | No |
| **Scripts** | 2 lightweight scripts |
| **Size** | ~30 KB |
| **Console (Bethesda.net)** | ✅ A specific person has been granted permission to port — credit SexyWitch |

#### What It Does

HIT THE MASS makes Fallout 4's combat feel like a modern action game. Inspired by Cyberpunk 2077 and Dishonored, it adds the hit feedback that vanilla Fallout 4 completely lacks — the physical sense that attacks connect with real bodies rather than passing through them. Everything is probabilistic (10–50% chance per hit, scaled by skills and weapon type), so the effects feel organic rather than mechanical.

**8 new hit effect types (10 total with variations):**

| Effect | Description |
|---|---|
| **HITlight** | Subtle impact flash for both guns and melee weapons |
| **HITshake** | 3 types of camera/screen shake with variations — scales by hit weight |
| **HITstop** | 2 types of freeze-frame stop animations with VFX — the "BANG-BANG-stop-BANG" feel of impactful hits |
| **KNOCKback** | Heavy weapon knockback with improved ragdoll physics for natural-looking impacts |
| **WIDEspread PANIC criticals** | Critical hits trigger visible panic reactions in targets |

**Two install variants:**
- **AP cost / NO race edits version** — maximum compatibility; no race record edits
- **MORE AP cost version** — very small race edits for a stronger feel; compatibility patches included for character customisation and damage reaction mods

**Asset permission note:** Uses assets from the **ROBOTIZED** mod — permission from ROBOTIZED has been explicitly granted and is confirmed.

**Unarmed compatibility:**
- Classic unarmed pack from **GrilledTurkey** is shipped empty for non-unarmed-pack users
- If you use GrilledTurkey's unarmed weapon pack, use the original version of that file instead

**Part of SexyWitch's Full Total Combat Overhaul** — designed to work alongside RAF (#90839) and Witch's Nature (#89664) as a complete suite.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires SexyWitch's permission |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires SexyWitch's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding (Bethesda.net) | ✅ **A specific person has been granted permission to port — credit SexyWitch** |

#### Credits

- **SexyWitch** — mod author and primary creator
- **ROBOTIZED** — asset permission explicitly granted for this mod
- No other credits listed by the author

#### Install Notes

Install via MO2 or Vortex. Choose the AP cost / no race edits version unless you specifically want the enhanced feel of the race-edits variant. If using the race-edits version, apply the included compatibility patches for any character customisation or damage reaction mods you have active.

Requires Far Harbor and Nuka World DLCs. Recommended as part of SexyWitch's full suite:
1. Witch's Nature (#89664) — facial life
2. RAF (#90839) — movement variety
3. **HIT THE MASS (#90416) — combat impact**

---

## Animation Frameworks

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

### Animated World Framework (Animated World 2)

| Field | Details |
|---|---|
| **Author** | Knundrum (Nexus: Kewin568) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/100946 |
| **Category** | Animation Framework — world object interaction animations (F4SE-native) |
| **F4SE Required** | ✅ Yes |
| **Address Library Required** | ✅ Yes |
| **MCM Required** | ✅ Yes |
| **DLC Required** | None |
| **Console (Bethesda.net)** | ❌ No console permission listed |
| **Note** | The framework itself does **not** include animations — animations are on a separate download page by the same author |

#### What It Does

Animated World Framework (AWF, also called Animated World 2) enables modders to add animations to virtually any world interaction — opening doors, activating objects, harvesting plants, picking up items, consuming food/chems, equipping gear, toggling your flashlight, and more. It works at the engine level via F4SE, which means it **doesn't alter the objects themselves** — a key design choice that eliminates the most common source of incompatibilities with other mods.

This is a true framework: no scripting required for patch authors, minimal CK/xEdit knowledge needed, and complete separation between framework updates and animation pack updates.

**Supported interaction types (all F4SE-native):**

| Trigger | Description |
|---|---|
| Vanilla activate | Open, activate, harvest, etc. with the vanilla activate key |
| Pick up items | Animations when picking up items from the ground |
| Quick container take | Animations when taking from a quick container |
| Consume item | Animations when eating/drinking/using a chem |
| Equip item | Animations when equipping an item |
| Add to inventory | Animations when adding an item to your inventory |
| Flashlight toggle | Animation when toggling your flashlight |
| NPC consume | NPCs play animations when they consume items (e.g. psycho) |
| Equip from ground | Papyrus/Perk based — picks item up and equips it |

**FallSouls compatible:** Yes — if you want animations to play during menus, FallSouls is required.

#### For Mod Authors — Adding Your Animations

Requirements: Your animations already exist as `.hkx` files. The Creation Kit must be installed (or xEdit).

**Basic workflow:**

1. Create your mod in CK with `Animated World - Base.esp` as a master
2. Add your Animation Object (AO) and sounds as needed
3. Go to **Gameplay → Animations...**
4. Select either `_1stPerson RootBehavior` or `RaiderRootBehavior`
5. Find and unwrap `AW_ActionActivate`, `AW_EquipAnimAction`, or `AW_ItemAddedAction`
6. Insert a child node for the condition you want (e.g. `GetIsID-Potion:SquirrelBits==1.0`)
7. Set your Anim Event, animation path, and when to play it
8. Save your mod — that's it

> **Important:** The game reads animation sequences **top-down**. Be as specific as possible in your condition queries — being too broad will cause your entry to override other mods' animations, or be overridden by them.

**No scripting required.** See the articles section and example files on the mod page for full details.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / release bug fixes | ✅ **Allowed — credit Knundrum as original creator** |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires Knundrum's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding | ❌ No permission granted |

#### Credits (as listed by the author)

- **Geluxrum** — F4SE help, setting up a workspace, answering all the questions
- **Bingle** — GitHub work on C++ functions; saved significant time when learning
- **LuBuCake** — work on the IdleStop fix
- **Shiagur42** — Blender Animation setup (see Shiagur's rigs in this list)
- **Omega4D2's Discord community** — support throughout development

#### Install Notes

Install via MO2 or Vortex. The framework itself has no animations — download the author's separate vanilla animations pack from the mod page to get started. Animation pack authors do not need to update their packs when the framework updates (unless the author dramatically restructures animation categories, which they aim to avoid).

---

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

### Custom Power Armor Rig (3rd-Person Animation Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/39089 |
| **Category** | Modder's Resource — Power Armor animation rig |
| **Type** | Custom rig for creating Fallout 4 Power Armor 3rd-person animations |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

A custom Power Armor rig released for mod authors who want to animate Power Armor in 3rd person. The author describes it as an early rig that is not perfect, but functional and used in shipped weapon-mod animation work.

The page notes the workflow is broadly similar to:
- Fallout 4 Animation Kit
- F4Biped animation rig

If you already build 1st/3rd-person FO4 animations, the author indicates this rig follows a familiar process.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / improve features | ❌ Must get author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mod | ❌ Must get author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed by the author)

- **ShadeAnimator** — credited by the author for the Animation Kit and helping them learn custom animation workflows.
- **MaikCG** — credited by the author for the first human rig.
- Nexus page author (mod creator).
- No additional file credits listed in the permissions tab.

#### Notes for Mod Authors

- The author did not provide a full tutorial for this rig.
- The page asks users not to repost the rig elsewhere.
- Author indicates they may attempt a super-mutant rig in the future.

---

### Shiagur's Blender Animation Rig Suite (Human + Power Armor)

> These two mods are designed as a pair by the same author. The v2.0 guide covers both together. **Read the permissions carefully — they differ between the two rigs.**

#### Power Armor Rig — Nexus #81279

| Field | Details |
|---|---|
| **Author** | Shiagur (Nexus: Shiagur42) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/81279 |
| **Category** | Modder's Resource — Blender animation rig for Power Armor |
| **Version** | 2.6.0 (Sound update) |
| **Blender Required** | 4.1+ |
| **Havok Content Tools** | 2014 64-bit v1.1 (specific build required) |
| **FBXImporter** | Nexus #59849 (by andrelo1) — to convert FBX → HKT |

**Permissions for #81279 (Power Armor Rig):**

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires Shiagur's permission |
| Convert to other games | ✅ **Allowed — credit Shiagur as creator** |
| Use assets in your mod | ❌ Requires Shiagur's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding | ❌ Won't work on consoles / not acceptable on Bethesda.net |

#### Human 1st/3rd Person Rig — Nexus #82537

| Field | Details |
|---|---|
| **Author** | Shiagur (Nexus: Shiagur42) |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/82537 |
| **Category** | Modder's Resource — Blender animation rig for human 1st and 3rd person animations |
| **Version** | 2.6.0 (Sound update) |
| **Blender Required** | 4.1+ |
| **Havok Content Tools** | 2014 64-bit v1.1 |
| **FBXImporter** | Nexus #59849 (by andrelo1) |

**Permissions for #82537 (Human Rig):**

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / release bug fixes | ✅ **Allowed — credit Shiagur as original creator** |
| Convert to other games | ❌ Not allowed |
| Use assets in your mod | ❌ Requires Shiagur's permission |
| Use assets in paid mods | ❌ Not allowed |
| Use assets in DP-earning mods | ❌ Not allowed |
| Console modding | ✅ **A specific person has been granted permission to port to Bethesda.net — credit the author** |

> ⚠️ Note the difference: the Human rig (#82537) **allows modification with credit** and **has a console port authorised**, while the PA rig (#81279) **allows cross-game conversion with credit** but **does not allow modification or console ports**. Always check each mod's page before using assets.

#### What the Suite Covers

The definitive Blender-native animation pipeline for Fallout 4 — covering human first-person, third-person, and Power Armor animations in a single workflow. Version 2.0 merged what were previously two separate guides and replaced all manual Havok Content Tools steps with a Python automation script ("FO4 Tools") built into the Blender file.

Previously, creating FO4 animations required 3ds Max (see MaikCG F4Biped above). Shiagur's rigs made this possible entirely in Blender, which most newer modders already use.

**What the rig covers:**
- Third-person character and weapon animations
- First-person weapon animations (additive and non-additive)
- First-person Power Armor animations (uses same skeleton as human; overridden by subgraph data in-game)
- Weapon attachment system (attach weapons/props to rig bones via the Attach panel)
- Full IK/FK rig with drivers for arm, leg, finger, and spine control
- Annotation (Havok event) creation and import via Pose Markers
- Three methods to extract annotations from vanilla animations
- In-rig Havok Viewer preview workflow (using included skeleton .hkx files)

**Files included:**

| File | Purpose |
|---|---|
| Main `.blend` file | Rig, meshes, "FO4 Tools" Python panels, sample 10mm pistol animation |
| `assets/TMP/` | Auto-generated import/export staging folder |
| `assets/programm_paths.txt` | Tool paths — copy to other projects to avoid re-entering paths |
| `skeleton Human 1stP for Havok Viewer.hkx` | Preview 1st-person animations in Havok Viewer |
| `skeleton Human 3rdP for Havok Viewer.hkx` | Preview 3rd-person animations in Havok Viewer |
| `skeleton PA for Havok Viewer.hkx` | Preview Power Armor animations in Havok Viewer |
| `Havok Filter Config.hko` | HCT filter presets (less critical in v2.0 but included) |

**Full toolchain required:**
- Blender 4.1+: https://www.blender.org/
- Havok Content Tools 2014 64-bit v1.1: https://archive.org/download/Havok-Content-Tools-2014/
- FBX Importer (Nexus #59849): https://www.nexusmods.com/fallout4/mods/59849
- havok2fbx OR F4AK_HKXPackUI (Nexus #16694): https://www.nexusmods.com/fallout4/mods/16694
- Autodesk FBX Converter: https://aps.autodesk.com/developer/overview/fbx-converter-archives
- A .ba2 extractor — any of: BAE (#78), BSA Browser (#17061), Archive2 (CK), BSArchPro (#63243)
- PyNifly (for importing/exporting .nif mesh files): Nexus #52319 — https://www.nexusmods.com/fallout4/mods/52319 | GitHub releases — https://github.com/BadDogSkyrim/PyNifly/releases

**Suggested Blender add-ons (all free, two built-in):**
- Animation: Copy Global Transform (built-in Blender)
- Animation: Pose Library (built-in Blender)
- AnimAide — reposition already-animated bones

#### Credits (as listed by the author — applies to both mods)

- **EngineGaming** — beta reading and testing; creator of "Story Action Poses" (the inspiration for bringing this workflow to Blender)
- **andrelo1** — creator of FBXImporter (Nexus #59849)
- **Highflex** — creator of Havok2Gbx
- Bethesda, Blender Foundation, all linked tool providers
- **havok2fbx** — Copyright © 2015 Alex M, BSD 3-Clause License (full text on mod page)

#### Author Contact & Support

- **Discord:** https://discord.gg/5ydKyYSy6U — active community, best place for questions and feedback
- **Nexus profile:** https://www.nexusmods.com/fallout4/users/125098883
- Ko-fi donations accepted (link on Nexus page)

#### For Mod Authors — Complete Workflow

See `BLENDER_ANIMATION_RIG_GUIDE.md` for the full Shiagur rig workflow section, including: the FO4 Tools panel reference, driver system, bone descriptions, annotation extraction (3 methods), Havok Viewer preview, first-person vs third-person conventions, and PA-specific notes.

---

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

### PyNifly — Blender NIF Import/Export Add-on

| Field | Details |
|---|---|
| **Author** | BadDogSkyrim |
| **Nexus** | https://www.nexusmods.com/fallout4/mods/52319 |
| **GitHub** | https://github.com/BadDogSkyrim/PyNifly |
| **GitHub Releases** | https://github.com/BadDogSkyrim/PyNifly/releases |
| **Latest Version** | V25.15.1 (Collision fix — May 2026) |
| **Category** | Modder's Resource — Blender add-on for NIF import/export |
| **Blender Required** | 4.4 or later (official releases only) |
| **Platform** | Windows only |
| **License** | GNU General Public License v3.0 (GPL-3.0) |
| **Console (Bethesda.net)** | ❌ Not applicable — authoring tool, not an in-game mod |

#### What It Does

PyNifly is a Blender add-on that provides direct import and export between Blender and Fallout 4's NIF mesh format. It is built on top of the nifly library from Bodyslide/Outfit Studio, which handles the low-level NIF read/write. This makes it the recommended path for working with FO4 meshes directly in Blender without needing to round-trip through NifSkope or Outfit Studio for every change.

Key features for Fallout 4 workflows:

- Full NIF import and export for Fallout 4 meshes (armor, weapons, workshop objects, head parts, creatures)
- Handles tris and base mesh in one step — no need to manually separate UV seams or triangulate before export
- Handles expression and chargen tri files for FO4 face/head work
- Import tris into an existing mesh or as standalone
- Supports Bodyslide tri files on import and export for body morphs
- Handles FO4 partitions and FO4 segments correctly
- Handles skinned and unskinned meshes — exports head parts correctly
- Shader setup: configure shaders in Blender and export directly
- Collision handling — collisions are represented as editable meshes in Blender
- Animation: direct import/export to HKX files for FO4
- Special handling for FO4 connect points on weapons, armor, and workshop parts
- Supports animated NIFs
- Import-and-forget design: what you import will export correctly without manual re-configuration

> **Download from Nexus** as well as GitHub so BadDogSkyrim gets credit for the work. The Nexus page (#52319) is the official distribution point for Fallout 4 users.

> 🛠️ **A note from Mossy:** The Mossy Blender add-on that is currently in development works **because of BadDogSkyrim's efforts on PyNifly**. The NIF import/export capability it provides is the foundation our Blender integration is built on. None of that would be possible without his work. Please support him — download from his Nexus page, endorse the mod, and credit him if you use his tool in your own work.

#### Permissions Summary

PyNifly is released under the **GPL-3.0** open-source license. As a GPL project:

| Permission | Status |
|---|---|
| Use the add-on freely | ✅ Allowed |
| Modify the source code | ✅ Allowed — must keep GPL-3.0 and credit source |
| Redistribute modified versions | ✅ Allowed — must be GPL-3.0 and disclose source |
| Use in your own mods/tools | ✅ Allowed (it is an authoring tool, not a runtime mod dependency) |
| Close-source commercial redistribution | ❌ Not permitted under GPL-3.0 |

> Always check the Nexus page (https://www.nexusmods.com/fallout4/mods/52319) for any additional distribution or use terms the author has listed there beyond the GPL license.

#### Credits (as listed by the author)

**Core technology**

- **Ousnius** — creator of the nifly library that PyNifly is built on (from Bodyslide/Outfit Studio)

**Critical information on NIF/HKX encoding**

- Candoran2
- DagobaKing
- Nikolivanov
- Nitaigao
- PredatorCZ

**Contributions to the tool**

- bitbanger
- jgernandt
- Reddraconi
- ShroomTip
- ZenithVal

#### Author & Support

- **GitHub:** https://github.com/BadDogSkyrim/PyNifly
- **GitHub Releases (latest builds):** https://github.com/BadDogSkyrim/PyNifly/releases
- **Nexus page (Fallout 4):** https://www.nexusmods.com/fallout4/mods/52319
- **Documentation:** Full documentation is in the GitHub wiki at https://github.com/BadDogSkyrim/PyNifly/wiki

---

## Frameworks & Authoring References (Creation Kit / Data Work)

---

### 2025–2026 Coverage Gap Fill (Official Toolchain + Learning Resources)

This subsection targets high-impact gaps for modern Fallout 4 authoring workflows after the OG/NG/AE split and recent toolchain changes.

#### Deep Scan — Platform Coverage (2026 pass)

| Platform | Coverage Status | Primary References in Mossy Knowledge |
|---|---|---|
| Nexus Mods (download/distribution) | ✅ Covered | `COMMUNITY_RESOURCES_GUIDE.md` (Nexus section), entries throughout this list |
| GitHub (tool source + releases) | ✅ Covered | CMT, xEdit/FO4Edit, papyrus-lang sections below; `COMMUNITY_RESOURCES_GUIDE.md` (GitHub section) |
| Bethesda / Creation Kit ecosystem | ✅ Covered | `CREATION_KIT_RESOURCES_INDEX.md`, `COMMUNITY_RESOURCES_GUIDE.md` (Wikis section) |
| Reddit + Discord community help | ✅ Covered | `COMMUNITY_RESOURCES_GUIDE.md` (Reddit + Discord sections), bug-report template in that guide |
| Tool-specific support channels | ✅ Covered | xEdit Discord, F4SE Discord, CommonLibF4 references in `COMMUNITY_RESOURCES_GUIDE.md` |

#### Deep Scan — Asset Workflow Coverage (2026 pass)

| Asset / Workflow Area | Coverage Status | Primary References in Mossy Knowledge |
|---|---|---|
| Animation authoring + frameworks | ✅ Covered | Animation sections in this list; `HAVOK_FALLOUT4_ANIMATION_GUIDE.md` |
| Mesh/NIF authoring | ✅ Covered | `NIFSKOPE_DIVA11_GUIDE.md`, clutter/workshop resource entries in this list |
| Texture/material pipeline | ✅ Covered | `DDS_TEXTURE_CREATION_GUIDE.md`, `GIMP_FOR_FALLOUT4_TEXTURES.md`, `PHOTOPEA_FOR_FALLOUT4_TEXTURES.md` |
| Audio/voice pipeline | ✅ Covered | `AUDIO_STUDIO_GUIDE.md`, `VOICE_GENERATION_GUIDELINES.md`, radio tutorial entry in this list |
| Quest/dialogue authoring | ✅ Covered | `QUEST_SCRIPTING_GUIDE.md`, `DIALOGUE_CONVERSATION_GUIDE.md` |
| Papyrus scripting + tooling | ✅ Covered | papyrus-lang section below; `PAPYRUS_*` and `EXTENDING_SCRIPTS_PAPYRUS_GUIDE.md` docs |
| Worldspace/previs/precombine | ✅ Covered | `PRECOMBINE_PREVIS_DEEP_DIVE.md`, `PRP_COMPREHENSIVE_GUIDE.md`, previs cluster resource in this list |

### The Midnight Ride — Modern FO4 Setup Baseline (Learning Reference)

| Field | Details |
|---|---|
| **Official Site** | https://themidnightride.moddinglinked.com/ |
| **Category** | Learning Resource — stable modern setup baseline (OG/NG-era practices) |
| **Type** | Curated guide, not a downloadable mod asset |
| **Console (Bethesda.net)** | N/A — web-based external guide |

#### Why It’s Included

- Referenced in Mossy docs as a baseline setup resource (for example: `PRP_COMPREHENSIVE_GUIDE.md` and `COMMUNITY_ACHIEVEMENTS_2025_2026.md`).
- Useful as the first stop before deeper per-asset workflows (animation, scripts, previs, and conflict-resolution work).

#### Credits

- **The Midnight Ride maintainers/contributors** (community-maintained guide project)

---

### Collective Modding Toolkit (CMT) — 2025/2026 Compatibility Toolkit

| Field | Details |
|---|---|
| **Official Source** | https://github.com/wxMichael/Collective-Modding-Toolkit |
| **Latest Download** | https://github.com/wxMichael/Collective-Modding-Toolkit/releases/latest/download/cm-toolkit.zip |
| **Category** | Toolchain Utility — setup diagnostics, downgrade/upgrade, archive patching |
| **Type** | Standalone toolkit for Fallout 4 troubleshooting and environment validation |

#### What It Adds (2025/2026 relevance)

- Explicit OG/NG/AE-era support improvements in recent releases
- Better F4SE DLL version-split detection across OG/NG/AE
- Archive patcher fixes for modern Windows 11 + MO2 workflows
- Built-in scanner for common setup/config errors in modded installs

Recent release highlights:
- **v0.6.0**: initial Anniversary Edition support
- **v0.6.1**: AE texture patch detection + improved OG/NG/AE DLL detection + archive patcher fixes

#### Permissions / Usage Notes

- Distributed from the project’s official GitHub releases.
- Follow the repository’s published license/terms and release notes.

#### Credits

- **wxMichael** — project author/maintainer
- **Collective Modding community contributors** (suggestions and testing acknowledged in release notes)

---

### xEdit / FO4Edit (Official Project + Live Build Channels)

| Field | Details |
|---|---|
| **Official Project** | https://github.com/TES5Edit/TES5Edit |
| **FO4Edit Nexus Page** | https://www.nexusmods.com/fallout4/mods/2737 |
| **Build Channel** | xEdit Discord (`#xedit-builds`) — linked from project README |
| **Category** | Core Data Tool — plugin cleaning, conflict analysis, record editing, scripting |

#### Why It Matters for Current Mod Authors

- xEdit remains the canonical data-layer tool for FO4 plugin authoring and compatibility patching.
- The current project README points to the live “What’s New” stream and active build channels, which is important for post-update modding cycles.
- Use xEdit docs (`tes5edit.github.io/docs`) for current workflow details instead of older PDF-era guides.

#### Credits (from the official project summary)

- **ElminsterAU** — original xEdit foundation
- **Hlp, Zilav, Sharlikran** — FO4-era xEdit development
- **Sheson** — LOD-management contributions

---

### papyrus-lang (VS Code) — Modern Papyrus Authoring Toolkit

| Field | Details |
|---|---|
| **Official Source** | https://github.com/joelday/papyrus-lang |
| **VS Code Marketplace** | https://marketplace.visualstudio.com/items?itemName=joelday.papyrus-lang-vscode |
| **Manual** | https://github.com/joelday/papyrus-lang/wiki |
| **Category** | Scripting Toolchain — Papyrus language tooling/LSP-style workflow support |
| **License** | MIT (project license) |

#### What It Provides

- Modern editing UX for Papyrus (completion, jump-to-definition, hover, symbol search)
- PPJ-based build-task integration
- Live diagnostics while authoring scripts

This is a major quality-of-life accelerator for authors maintaining larger script-heavy mods in 2025/2026.

#### Credits (from project README/license)

- **joelday** — project author
- Additional listed contributors: **Scrivener07**, **shad0wshayd3**, **rjstone**
- Includes Pyro-related contributions credited to **fireundubh** and **Nyo**

---

### Dynamic Spawn Framework (DSFW)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/96276 |
| **Category** | Framework — dynamic creature/NPC spawning systems |
| **Type** | Dependency framework for other mods |
| **F4SE Required** | ✅ Yes (required for Garden of Eden integration) |
| **Garden of Eden Papyrus Script Extender Required** | ✅ Yes (required for water spawn restrictions) |
| **DLC Required** | None listed |

#### What It Does

A shared spawn framework for advanced ecosystem and encounter logic, including:
- Pack/herd spawning (Brahmin, Radstags, Mongrels, faction pets/tames)
- Object-reference-driven spawns on load (plants, references, optional NPC spawn chances)
- Dual-month nest/baby spawning toggles
- Bird zone randomization with hourly/monthly/weather restrictions

Load order note from the author:
- **Load framework high**
- **Load DSFW patches low**

#### Permissions Summary

| Permission | Status |
|---|---|
| Use as framework/resource in your own mods | ✅ **Allowed** |
| Edit/repurpose scripts for your own works | ✅ **Allowed** |
| Credit requirement | ✅ **Required — endorse and credit the author when repurposing assets/scripts** |

#### Credits (as listed on the page)

- No additional third-party file credits listed by the author.

---

### Fallout4.esm Full Records Spreadsheet (Modder Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/100679 |
| **Category** | Modder's Resource — FO4 data reference/export |
| **Type** | Excel table containing Fallout4.esm records |
| **DLC Required** | N/A |
| **F4SE Required** | No |

#### What It Is

An authoring reference file (not a gameplay mod) containing exported Fallout4.esm records for fast filtering and lookups by:
- FormID
- Record Type
- EditorID
- Full Name

Useful for CK/xEdit planning, consistency checks, and fast form discovery during plugin authoring.

#### Permissions Summary

| Permission | Status |
|---|---|
| General modder resource usage | ✅ **Allowed — “do what you want”** |
| Commercial/paid mod use | ❌ **Not allowed** |
| Credit expectation | ✅ **Credit recommended when redistributing derivative resource work** |

#### Credits (as listed on the page)

- Author notes this spreadsheet was produced using an xEdit export script referenced on the Nexus description.
- No additional file-credit entries were listed.

---

### Tutorial — Creating Your Own Radio Station in Fallout 4

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/101520 |
| **Category** | Tutorial / Modder's Resource — CK radio quest pipeline |
| **Type** | End-to-end instructional guide + example project assets |
| **Core Tools Mentioned** | Creation Kit, MultiXwm, Archive2, BA2 Archive Version Patcher, audio editor |
| **DLC Required** | N/A (tutorial resource) |

#### What It Covers

A full beginner-to-advanced radio-station workflow:
- Audio prep and conversion (`.wav`/`.xwm`) with level normalization guidance
- CK setup for Sound Descriptors, radio transmitter placement, quest aliases, and scene logic
- Non-repeating random playlist logic in Papyrus
- Radio silence prevention pattern (`RestartScene` timer workflow)
- Optional host segments, additional scene loops, and packaging flow with BA2 patching

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ **Allowed with credit to author** |
| Modify / bug-fix / improve | ✅ **Allowed with credit to author** |
| Use assets in your own mod | ✅ **Allowed with credit to author** |
| Convert to other games | ❌ Not allowed |
| Use in paid mods / sold files | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

#### Credits (as listed by the author)

The author identifies this as a compilation of prior community tutorials/knowledge and credits:
- **Tutorial - Creating Your Own Radio Station** — RadioactiveNuke
- **Create Radio Stations with Custom Music & Shuffle Scripting** — HeartImpaled
- **Bethesda Mod School** — Kinggath
- **`Function RestartScene()` pattern** — Glitchfinder

---

### FO4 INI Settings and GMST Dump (Reference Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/38496 |
| **Category** | Modder's Resource — Engine/config reference (INI + GameSettings) |
| **Type** | Full INI settings index + 5,500+ GMST text dump from Fallout4.exe |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

A technical reference pack for Fallout 4 authors containing:
- A complete INI settings list (alphabetically organized)
- A text dump of 5,500+ GMSTs (GameSettings), also organized alphabetically

The page positions this as a research/testing aid for modders who tune engine behavior, validate settings, and prototype gameplay/system changes.

#### Workflow Notes from the Page

To fetch corresponding live values for INI settings, the page includes an optional `GetValues` batch file workflow:
1. Extract optional `GetValues` into `...steamapps\common\Fallout 4`.
2. Confirm `getvl.txt` is present in that Fallout 4 root directory.
3. Launch Fallout 4, open console, run: `bat getvl`.

Suggested console-history buffer setting before running:
- `iConsoleHistoryCharBufferSize=9000000` under `[Menu]` in `Fallout4.ini`
- Or via console: `setini "iConsoleHistoryCharBufferSize:Menu" 9000000`

Reason: this larger buffer helps retain long console output when dumping large setting/value lists so results are not truncated.

GMST caveat noted by the author:
- Some GMSTs will report `NOT FOUND` via console/batch and must be applied through an ESP instead.
- Example ESP-only cases listed: `bEnableConsoleMenuDuringSurvival`, `fSurvivalPerceptionCompassBase`, `fSurvivalPerceptionCompassMult`.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / bug fixes / improvements | ✅ **Allowed with credit to original creator** |
| Convert to other games | ✅ **Allowed with credit to creator** |
| Use assets/files in your own mod | ✅ **Allowed with credit to creator** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (mod creator).
- No additional file credits listed.
- No extra author permission notes listed.

---

### BGSM/BGEM JSON Material Library for 3ds Max Beth Shaders

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/38289 |
| **Category** | Modder's Resource — Material/shader pipeline tooling |
| **Type** | Converted BGSM/BGEM material set for 3ds Max 2013 Beth shader workflows |
| **Target DCC** | 3ds Max 2013 |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

A resource pack of BGSM/BGEM data converted to load into Beth shaders in 3ds Max 2013 and auto-populate fields.

The page describes:
- Scripted conversion of 9,900+ materials that ship with the game
- A replacement release using **Zilav's** highly optimized version
- Intended use with Figment's NIF importer once paths are adjusted

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / improvements | ❌ Must get author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Must get author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed by the author)

- **Zilav** — credited in file credits and for the optimized shared version.
- Nexus page author (mod creator).
- Author also thanks **MunkySpunk** in the description for raising the Figment JSON-material issue.

#### Setup Notes (from the page)

- Keep vanilla extracted materials accessible under a `data\materials` path.
- Common structure shown on the page:
  - Move original binary materials to `data\data\materials`
  - Place converted JSON materials at `data\materials`
  - Example absolute layout: `C:\PROJECTS\FALLOUT4\BUILD\PC\DATA\data\materials` (originals) and `C:\PROJECTS\FALLOUT4\BUILD\PC\DATA\materials` (JSON set)
- Update `[Fallout 4]` paths in `MaxNifTools.ini` (especially `MaterialRootPath`) to match your local data-root layout.
- Verify root data paths and correct skeleton path spacing issues if present.

---

### Object palettes 1.0 (OPAL) — Level Design Palette Resource

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/39733 |
| **Category** | Modder's Resource — Creation Kit level-design workflow |
| **Type** | 98 object palettes for interior, exterior, and misc set-dressing workflows |
| **DLC Required** | Far Harbor, Nuka World |
| **Off-site Requirements** | Creation Kit (to load files) |
| **Console (Bethesda.net)** | ❌ Won't work on consoles / not acceptable on Bethesda.net |

#### What It Is

A practical Creation Kit authoring resource focused on speed and consistency when building interiors/exteriors. OPAL ships curated object-palette collections so modders can place coherent groups of assets quickly instead of repeatedly searching for individual records.

Current package scope:
- 98 object palettes total
- Organized into exterior, interior, and misc groups
- Intended as a core level-design quality-of-life toolkit

The page also links the CK wiki Object Palette reference:
- https://www.creationkit.com/index.php?title=Object_Palettes

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ **Allowed with credit to the creator** |
| Modify files / bug fixes / improvements | ✅ **Allowed without permission or credit** |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mod | ✅ **Allowed with credit to the creator** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Won't work on consoles / not acceptable on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (mod creator).
- No additional file credits listed by the author.
- Author notes section lists no extra permission notes.

#### Install Notes

Extract the ZIP contents into your Fallout 4 Creation Kit location (example from the page):

`C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\OPAL`

If the `OPAL` folder is not present, create it.

#### Quick Usage Notes

In Creation Kit:
1. Click in the render window, then press `Shift + O` (or `World` → `Object palette editing`).
2. In the OPAL window, pick the OPAL folder.
3. In `Palette objects`, click the first item, hold `Shift`, then click the last item to multi-select the full range.
4. In render window, hold `Ctrl + Alt` and left-click to place a random object from the selected palette list.

Known issue from the page:
- Some palettes currently contain only 1–2 items because they are unfinished or had specific assets removed.

---

### Clutter/Object Authoring Resource

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/37329 |
| **Category** | Modder's Resource — Clutter/object creation workflows |
| **Type** | Authoring helper resource for clutter-object creation and related use cases |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |
| **Changelog Note** | 1.1 adds info about `StaticCollectionPivotDummy` |

#### What It Is

A creator-focused helper resource described by the author as useful for making clutter objects and broader object-authoring workflows.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / bug fixes / improvements | ✅ **Allowed with credit to original creator** |
| Convert to other games | ✅ **Allowed with credit to creator** |
| Use assets/files in your own mod | ✅ **Allowed with credit to creator** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (mod creator).
- No additional file credits listed.
- No additional author notes listed.

---

### Workshop Resources (NIF Collection for Mod Authors)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/32628 |
| **Category** | Modder's Resource — Mesh/NIF clutter-object assets |
| **Type** | Resource-only NIF collection for reuse in other mods (not a standalone gameplay mod) |
| **DLC Required** | Automatron, Contraptions Workshop, Far Harbor, Nuka World, Vault-Tec Workshop, Wasteland Workshop |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

A creator resource pack of NIF assets intended to reduce time spent decorating settlements and building clutter-rich scenes.

Author usage notes from the page:
- Best used as workshop items
- If used in cells, disable Havok simulation and choose "Don't Havok Settle" on placed objects
- Some included meshes emit light (for example flip lighter, blow torch, bunsen burner, and angler-stalk bottle variants)

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ **Allowed with credit to creator** |
| Modify files / improvements | ✅ **Allowed without permission or credit** |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ **Allowed without permission or credit** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ⚠️ **Requires permission** |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (mod creator).
- No additional file credits listed.
- No additional author permission notes listed.

#### Install/Path Notes (from the page)

- Place NIFs under your chosen `Meshes` folders and point Creation Kit records to those paths.
- The author indicates some resources rely on DLC-backed objects and recommends having all listed DLCs loaded during authoring.

---

### LeafTongue's Papyrus Repository

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/98641 |
| **Category** | Modder's Resource — Papyrus scripting resources |
| **Type** | Free Papyrus code repository for Fallout 4 authors |
| **DLC Required** | N/A (authoring resource) |
| **Nexus Requirements** | Reading comprehension and ability to reason |

#### What It Is

A shared repository of free Papyrus resources intended to help mod authors ship faster by reusing common scripting patterns and components.

#### Permissions Summary

| Permission | Status |
|---|---|
| Use repository code in your own mods | ✅ **Allowed — author states code is free to use** |
| Credit requirement | ✅ **Credit LeafTongue when reusing repository code** |

#### Credits (as listed on the page)

- **LeafTongue** — repository author and original code contributor.
- No additional third-party file credits listed.

---

### Dynamic Terminal (Papyrus Library)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/21536 |
| **Category** | Modder's Resource — Papyrus terminal scripting library |
| **Type** | Library for dynamic terminal form substitution and paginated form selection |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

Dynamic Terminal is a Papyrus library inspired by **Settlement Management Software** behavior patterns by **matzman666**. It is aimed at mod authors who need reliable terminal-driven selection workflows.

The library supports:
- Dynamic form substitution into terminal content
- Selecting forms from paginated terminal lists
- Multi-step option-selection flows that combine choices to produce outcome-specific results

Important page notes:
- Due to engine restrictions, these dynamic terminals cannot be displayed on the Pip-Boy
- End users should not install this unless a mod author explicitly requires it

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / improvements | ❌ Must get author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ **Allowed with credit to creator** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (library creator).
- **Settlement Management Software** by **matzman666** — listed as inspiration for the library behavior model.
- No additional file credits listed.

---

### Inject-Tec (Papyrus Library)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/21530 |
| **Category** | Modder's Resource — Papyrus injection library |
| **Type** | Library for injections into Form Lists, Leveled Lists, and Instance Naming Records |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net for console users |

#### What It Is

Inject-Tec is a Papyrus library built to make injection workflows faster and more approachable for mod authors, including authors newer to programming and Bethesda tooling.

Primary capabilities described on the page:
- Injecting records into **Form Lists**
- Injecting records into **Leveled Lists**
- Injecting records into **Instance Naming Records**
- Improving cross-plugin compatibility workflows

Important page note:
- End users should not install Inject-Tec unless a mod author explicitly instructs them to do so.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files / improvements | ❌ Must get author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ **Allowed with credit to creator** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Asset ownership note from page permissions: assets belong to the author or free-to-use modder resources.

#### Credits (as listed on the page)

- Nexus page author (library creator).
- No additional file credits listed.
- No additional author permission notes listed.

---

### OMOD Effect Injection Script Source (Nexus #21510)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/21510 |
| **Category** | Modder's Resource — Papyrus equip-time OMOD injection logic |
| **Type** | Open-source quest script source from Perforation for adding custom OMOD effects on equip |
| **License** | GPLv3 (author instruction: code is open source under GPLv3) |

#### What It Is

A script-source resource demonstrating an equip-time OMOD injection approach designed to preserve compatibility and avoid destructive replacement behavior.

Behavior highlights described on the page:
- Adds target effects when the player equips OMOD-capable items
- No compatibility patches required for new/current/future weapons
- Silent operation (no "Removed / Added" spam)
- Handles multiple base objects in inventory (processed on equip)
- Re-equips processed weapons and preserves favorite quickslot assignment
- Preserves legendary OMODs, including custom/mod-added legendary effects
- Hidden helper OMOD does not appear in the workbench UI
- Script is intended to fire once per weapon per game

Technical note from the page:
- Current implementation uses the **NONE attach-point temporary chain trick** (v4.0), with two bound OMODs left in place after temporary swap/removal.

#### Permissions / License Summary

- Source code is declared open source under **GPLv3** by the author.
- The request did not include additional Nexus permissions-grid restrictions for this page; follow GPLv3 terms and the Nexus page for distribution details.

#### Credits (as listed by the author)

- Nexus page author — all source code.
- **tim-timman** — credited for the mod-swap "floating" method concept.
- **Wenderer** — credited for FOMOD Creation Tool.

---

### PaperScript (Papyrus Transpiler Language)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/94351 |
| **Category** | Scripting Toolchain — Papyrus authoring language/transpiler |
| **Type** | Modern language that transpiles to valid Papyrus (`.psc`) and compiles to `.pex` |
| **Project Status** | Alpha / proof-of-concept stage |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

PaperScript is a modern Papyrus alternative syntax that transpiles into Papyrus, aimed at improving readability and quality-of-life (for example, more expressive iteration and modern control-flow features) while still producing Fallout 4-compatible outputs.

The mod page notes:
- Fallout 4 support is available in current alpha releases
- Project mode can transpile/copy/compile scripts in one workflow
- Ongoing active development and feedback channels (docs, source repo, Discord)

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Requires author permission |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

#### Credits (as listed on the page)

- PaperScript project author (Nexus page owner).
- No additional third-party file credits listed.

---

### Animal Animation Rigs (Author Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/95105 |
| **Category** | Modder's Resource — Animation rigs for FO4 animals |
| **Type** | Rig resource for creating animal animations |
| **Current Supported Animals** | Radstag, Radchicken, Cats |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

A growing collection of animal animation rigs intended for author workflows. The author recommends following established FO4 animation tutorials and using these rigs in place of the human rig where appropriate.

The page notes that some workflows may require resources from:
- MaikCG Animation Rig
- Animation Kit
- Direct HKX import plugin referenced by the author

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ✅ **Allowed — permission and credit not required** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Author clarification: paid mods are not allowed; optional donations are fine.

#### Credits (as listed on the page)

- **LeafTongue** — animal rig author.
- **MaikCG** — thanked by the author for foundational resources.
- **ShadeAnimator** — thanked by the author for foundational resources.

---

### Feral Ghoul Animation Rig (Author Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/88906 |
| **Category** | Modder's Resource — Animation rig (feral ghouls) |
| **Type** | Dedicated feral ghoul rig for FO4 animation authoring |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A feral ghoul-specific animation rig intended for creators following FO4 animation tutorials. The author notes workflows may require related tools/resources such as:
- MaikCG Animation Rig
- Animation Kit
- Direct HKX import plugin referenced on the page

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ✅ **Allowed — permission and credit not required** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

> Author clarification: paid mods are not allowed; optional donations are fine.

#### Credits (as listed on the page)

- Rig author (Nexus page owner).
- **MaikCG** — thanked by the author for foundational resources.
- **ShadeAnimator** — thanked by the author for foundational resources.

---

### Insect & Similar Creature Animation Rigs (Author Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/88872 |
| **Category** | Modder's Resource — Animation rigs (insects/similar creatures) |
| **Type** | Creature rig pack for non-humanoid FO4 animation authoring |
| **Current Supported Creatures** | Radroach-family users (including Nuka-World ants and Mirelurk hatchlings), Radscorpion |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

A rig resource set for insect-like and similar creatures, intended for use with established FO4 animation tutorials in place of human rigs where appropriate.

The page notes possible dependency on common authoring resources/tools such as:
- MaikCG Animation Rig
- Animation Kit
- Direct HKX import plugin referenced on the page

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ✅ **Allowed — permission and credit not required** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available on Bethesda.net |

> Author clarification: paid mods are not allowed; optional donations are fine.

#### Credits (as listed on the page)

- Rig author (Nexus page owner).
- **MaikCG** — thanked by the author for foundational resources.
- **ShadeAnimator** — thanked by the author for foundational resources.

---

### Alien Animation Rig (Author Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/88871 |
| **Category** | Modder's Resource — Animation rig (aliens) |
| **Type** | Alien-specific rig for FO4 animation authoring |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A dedicated alien animation rig for author workflows. The author recommends using standard FO4 animation tutorials and substituting this alien rig for the human rig when building alien animation content.

Referenced companion resources/tools include:
- MaikCG Animation Rig
- Animation Kit
- Direct HKX import plugin referenced on the page

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ✅ **Allowed — permission and credit not required** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

> Author clarification: paid mods are not allowed; optional donations are fine.

#### Credits (as listed on the page)

- Rig author (Nexus page owner).
- **MaikCG** — thanked by the author for foundational resources.
- **ShadeAnimator** — thanked by the author for foundational resources.

---

### Super Mutant Animation Rig (Author Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/78103 |
| **Category** | Modder's Resource — Animation rig (super mutants) |
| **Type** | Super mutant-specific rig for FO4 animation authoring |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A dedicated super mutant animation rig for creator workflows. The author recommends using standard FO4 animation tutorials and substituting this rig for the human rig in super mutant animation projects.

Referenced companion resources/tools include:
- MaikCG Animation Rig
- Animation Kit
- Direct HKX import plugin referenced on the page

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ✅ **Allowed — permission and credit not required** |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

> Author clarification: paid mods are not allowed; optional donations are fine.

#### Credits (as listed on the page)

- Rig author (Nexus page owner).
- **MaikCG** — thanked by the author for foundational resources.
- **ShadeAnimator** — thanked by the author for foundational resources.

---

### Shared Assets Pack (Mod Dependency Resource)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/91788 |
| **Category** | Shared Assets / Framework dependency |
| **Type** | Shared models, textures, behaviors, and animation assets for dependent mods |
| **Nexus Requirement** | Merged RootBehavior (for custom behaviors) |
| **Console (Bethesda.net)** | Not listed |

#### What It Includes

The author-maintained shared asset base for current/future mods, including:
- Gun attachment models and textures
- Custom behavior edits (including windowed magazine workflows)
- Custom 1st-person gun behaviors (WIP)
- Animation sets

The page also includes a **debug file** for diagnosing first-person reload issues; the author describes it as troubleshooting-only and not a replacement for the main merged root behavior setup.

#### Permissions Summary

| Permission | Status |
|---|---|
| Use assets in your mod | ✅ **Allowed while this mod remains a required dependency** |
| Earn donation points / optional external donations | ✅ Allowed |
| Use in paywalled/paid mods | ❌ Not allowed |

#### Credits (as listed on the page)

- Author-provided shared assets for dependent mods (no additional third-party file credits listed).

---

### Mortar-Karl Resource (Automatron Asset Pack)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/93786 |
| **Category** | Modder's Resource — PNG textures and NIF assets |
| **Type** | Automatron-focused resource asset pack (also usable as habitation object) |
| **DLC Required** | Automatron |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

A resource package containing PNG textures and NIF files for an Automatron-oriented object set ("Mortar-Karl"), intended for reuse in mod-author workflows subject to the permissions below.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets in your own mods | ❌ Requires author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Creation Kit World Position XLS Reference

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/92295 |
| **Category** | Modder's Resource — CK workflow reference |
| **Type** | Spreadsheet map/coordinate lookup aid for faster Creation Kit navigation |
| **Format** | XLS/XLS-like spreadsheet (Excel-compatible) |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

A modder-facing spreadsheet reference intended to speed up worldspace/location lookup in Creation Kit by providing position values and map-oriented coordinate context, helping authors quickly inspect one build zone and move to the next.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Requires author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Realistic Human Skeleton Proportions Resource

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/92263 |
| **Category** | Modder's Resource — Human skeleton/rig proportions |
| **Type** | Alternative human skeleton proportion setup for Fallout 4 |
| **Console (Bethesda.net)** | ❌ Not available on Bethesda.net |

#### What It Is

An author resource that provides a more realistic proportional approach to the human skeleton versus vanilla proportions, intended for creators working on animation/character movement pipelines.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify files | ❌ Requires author permission first |
| Convert to other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Requires author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available on Bethesda.net |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### FO4Edit → CSV → XML → RobCoPatcher Workflow

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/92210 |
| **Category** | Modder's Resource — Data pipeline / patching workflow |
| **Type** | Workflow guide/scripts for exporting records and generating RobCoPatcher-ready output |
| **Nexus Requirement** | RobCo Patcher |
| **Off-site Requirements** | Python runtime/compiler (e.g. Thonny), CSV→XML converter tool |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A productivity workflow for large-scale leveled-list or record patching that chains:
1. FO4Edit record export to CSV  
2. CSV conversion to XML  
3. Python transformation into formatted RobCoPatcher-style text output

The goal is to speed up conversion of large armor/weapon record sets into patch-ready rule blocks with less manual formatting.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed with credit |
| Convert for other games | ✅ Allowed with credit |
| Use assets/files in your own mod | ✅ Allowed with credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

#### Credits (as listed on the page)

- Resource/workflow author (Nexus page owner).
- No additional third-party file credits listed.
- Author indicates parts of the code were sourced from internet examples and invites attribution claims if needed.

---

### FO4Edit NPC Editing Scripts

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/91166 |
| **Category** | Modder's Resource — FO4Edit utility scripts |
| **Type** | Script pack for NPC appearance randomization and cleanup in FO4Edit |
| **Nexus Requirement** | FO4Edit |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A utility-focused FO4Edit script collection for changing NPC data, including random replacement of hair, hair color, beard, and eyes, plus cleanup helpers for face tint layers and CharGen face preset flags.

This resource is intended for mod authors with working FO4Edit knowledge and is designed as an editing/override workflow rather than a standalone in-game mod.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ✅ Allowed with credit |
| Convert for other games | ✅ Allowed with credit |
| Use assets/files in your own mod | ✅ Allowed with credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- xEdit
- xEdit Documentation
- matortheeternal
- FiftyTifty
- Effelo
- Author notes that open-source/publicly available code informed development and asks for source credit when directly copying code.

---

### Blender Texture Node Group Utility File

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/87441 |
| **Category** | Modder's Resource — Blender material/texture workflow |
| **Type** | `.blend` utility file with reusable node groups for Fallout-style texture work |
| **Off-site Requirements** | Blender 4.1 recommended; Blender experience required |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A small Blender utility file containing reusable node groups for Fallout-style texture authoring, including material look matching, cubemap display variants, AO blending, normal mixing, and masked texture-set mixing.

The author positions it as a helper resource for Blender users trying to get results closer to in-game Fallout 4 textures.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed with credit |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Requires author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- Blender — https://www.blender.org/

---

### Previs Cluster Spreadsheet

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/84717 |
| **Category** | Modder's Resource — Previs / worldspace reference data |
| **Type** | Spreadsheet reference for previs cluster lookup, cell coordinates, form IDs, and editor IDs |
| **Off-site Requirements** | Excel or a compatible spreadsheet viewer/editor; Google Docs version also mentioned by the author |
| **Console (Bethesda.net)** | ❌ Not available for Bethesda.net console users |

#### What It Is

A reference spreadsheet for Fallout 4 previs work covering the Commonwealth, Nuka-World, and Far Harbor, intended to speed up previs-cluster calculation and quick lookup of related cell metadata.

The author also notes it can be used to quickly check cell coordinates, form IDs, and editor IDs during patching and worldspace workflow.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ❌ Requires author permission first |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ❌ Requires author permission first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available for Bethesda.net console users |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- the xedit scripting team, for help in exporting the cell information

---

### Animated Texture Guide

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/75528 |
| **Category** | Tutorial / Modder's Resource — Animated texture workflow |
| **Type** | Step-by-step guide for building animated textures from a spritesheet and exporting the final mesh for Fallout 4 |
| **Off-site Requirements** | 3ds Max 2013, Havok Content Tools 2013, Bethesda NIF exporter, NifSkope, an image editor (Photoshop/GIMP/etc.), and a spritesheet or GIF-to-spritesheet workflow |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A hands-on tutorial for creating animated textures in Fallout 4 using a vertically arranged spritesheet, UV offset keyframing in 3ds Max, NIF export, Elrich conversion, and final flag cleanup in NifSkope.

The guide assumes prior familiarity with exporting meshes from 3ds Max with Havok-related tooling and focuses specifically on the animated-texture portion of the pipeline rather than general collision or Havok setup.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ⚠️ Ask author first |
| Modify/improve and release | ⚠️ Ask author first |
| Convert for other games | ⚠️ Ask author first |
| Use assets/files in your own mod | ⚠️ Ask author first |
| Use in paid/sold mods | ⚠️ Ask author first |
| Use in DP-earning mods | ⚠️ Ask author first |
| Console publishing | ❌ Not suitable for Bethesda.net console distribution |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- IceStormNG — for walking the author through animation work

---

### Functional Custom Crops Tutorial

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/74398 |
| **Category** | Tutorial / Modder's Resource — Workshop crop functionality |
| **Type** | Step-by-step guide and helper files for making custom crops generate workshop resources correctly |
| **Off-site Requirements** | FO4Edit (basic working knowledge assumed); Notepad++ optional; PapyrusPlusPlus optional |
| **Console (Bethesda.net)** | ✅ Allowed on Bethesda.net when the author is credited |

#### What It Is

A detailed tutorial explaining how to make custom crops behave like fully functional vanilla workshop food objects, including passive production during settlement workshop cycles instead of only manual harvesting.

The walkthrough covers FO4Edit record setup, script-injected workshop quest hooks, functional flora object setup, iteration for multiple crops, in-game testing, and an optional compatibility pass for renaming and shipping the included scripts.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed without permission or credit |
| Convert for other games | ✅ Allowed with credit |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ✅ Allowed with credit |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.
- The author states in the FAQ that credit is not required when using the included scripts, which were modified from existing open-permission script injector packs.

---

### 3rd Person One-Handed Melee Vanilla Animations Resource

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/66487 |
| **Category** | Modder's Resource — Animation authoring reference |
| **Type** | Vanilla one-handed melee animation conversion pack (3DS Max clips, FBX, HKX, XML) |
| **Off-site Requirements** | 3DS Max/animation tooling if you plan to edit or rework the included source clips |
| **Console (Bethesda.net)** | ❌ Not available for Bethesda.net console users |

#### What It Is

An animator-focused resource pack containing converted vanilla Fallout 4 third-person one-handed melee animations prepared for easier editing workflows.

The author notes the conversion process was time-intensive and shared these working files to help other animators skip setup overhead and begin iteration faster.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ✅ Allowed without permission or credit |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available for Bethesda.net console users |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Vertibird Minigun Turret Vanilla Animations Resource

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/70018 |
| **Category** | Modder's Resource — Animation authoring reference |
| **Type** | Vanilla 1st/3rd-person vertibird minigun turret animation conversion pack (3DS Max clips, FBX, HKX, XML) |
| **Off-site Requirements** | 3DS Max/animation tooling if you plan to edit or rework the included source clips |
| **Console (Bethesda.net)** | ❌ Not available for Bethesda.net console users |

#### What It Is

An animator-focused resource containing converted vanilla Fallout 4 vertibird minigun turret animations in both first-person and third-person sets for easier DCC editing workflows.

The pack is positioned as a time-saver for animation authors and includes both vanilla and converted HKX data alongside clips and interchange formats.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ✅ Allowed without permission or credit |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not available for Bethesda.net console users |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Physics Playground (Destructible Objects Demo)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/62947 |
| **Category** | Modder's Resource — Destruction physics / workshop asset reference |
| **Type** | Demo worldspace + resource ESP showcasing prebuilt destructible objects/prefabs not normally workshop-buildable |
| **Off-site Requirements** | Creation Kit knowledge recommended for inspecting movable-static + script setup; console command usage for access (`coc Physdemo`) |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

A modder-focused demo resource built for testing physics limits and showcasing destructible objects/prefabs that are normally unavailable to player workshop building.

The page also notes these destructible setups can be reused in other mods, with navmesh present in the demo worldspace for spawned-enemy testing and workflow iteration.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed without permission or credit |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Random Encounter Framework

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/60074 |
| **Category** | Framework — Story Manager / random encounter compatibility |
| **Type** | Core framework plugin that reorganizes vanilla random encounter Story Manager trees for mod-safe integration |
| **DLC Requirements** | Automatron, Far Harbor, Nuka World |
| **Console (Bethesda.net)** | ✅ Allowed on Bethesda.net when the author is credited |

#### What It Is

A lightweight framework for Fallout 4 mod authors that makes the base game's random encounter Story Manager structure safer and more compatible for modded encounter additions.

In addition to compatibility-oriented tree cleanup, the mod also reduces the relative frequency of certain Nuka-World and Automatron encounter branches in the Commonwealth.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed without permission or credit |
| Convert for other games | ✅ Allowed with credit |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ✅ Allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ✅ Allowed with credit |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Custom Races in Fallout 4 (FaceGen + Outfit Studio Tutorial)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/53650 |
| **Category** | Tutorial / Modder's Resource — Character race creation pipeline |
| **Type** | Long-form (51+ page) step-by-step custom race authoring tutorial with images |
| **Off-site Requirements** | FaceGen Customiser, FaceGen Modeller, Outfit Studio, Creation Kit (plus referenced workflow context for 3DS Max and Blender) |
| **Console (Bethesda.net)** | ❌ Not available for Bethesda.net console users |

#### What It Is

A detailed, image-supported tutorial that walks through the author's end-to-end process for creating custom races in Fallout 4.

The guide emphasizes practical workflow coverage across multiple tools and is intended as a deep, descriptive reference rather than a quick-start checklist.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ✅ Allowed with credit |
| Modify/improve and release | ✅ Allowed with credit |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ⚠️ Ask author first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available for Bethesda.net console users |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.

---

### Fallout 4 Data Structures (F4DS)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/53089 |
| **Category** | Framework — Papyrus scripting extension (F4SE plugin) |
| **Type** | Native data-structure framework for Papyrus (arrays, sets, dictionaries, iterators) |
| **Requirements** | Fallout 4 Script Extender (F4SE) — mandatory |
| **Console (Bethesda.net)** | ❌ Not suitable/accepted for Bethesda.net console distribution |

#### What It Is

An F4SE plugin aimed at mod authors that adds multiple data-structure primitives to Papyrus scripts to bypass vanilla engine limitations.

Core capabilities include large one-dimensional arrays (with sorting), typed sets, typed dictionaries (including key-to-array mappings), and iterator-based traversal support for set/dictionary workflows.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ✅ Allowed with credit |
| Convert for other games | ✅ Allowed with credit |
| Use assets/files in your own mod | ✅ Allowed without permission or credit |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ✅ Allowed |
| Console publishing | ❌ Not suitable for Bethesda.net console rules |

#### Credits (as listed on the page)

- F4SE Team.
- F4SE plugin authors for shared learning source code.
- LoversLab community for shared learning source code.
- Eskella (bug reports).
- weefbellington (bug reports).
- DeadlyStr1ke (bug report).

---

### Outfit Conversion Tutorial (Bodybase Conversion + BodySlide Workflow)

| Field | Details |
|---|---|
| **Nexus** | https://www.nexusmods.com/fallout4/mods/50006 |
| **Category** | Tutorial / Modder's Resource — Outfit conversion pipeline |
| **Type** | Illustrated step-by-step guide for converting outfits across bodybases, including dismemberment, cloth bones, and BodySlide setup |
| **Off-site Requirements** | Outfit Studio, BodySlide workflow familiarity, plus referenced toolchain context (Fusion Girl/Fusion Girl Reduced, CBBE variants) |
| **Console (Bethesda.net)** | ❌ Not available for Bethesda.net console users |

#### What It Is

A long-form practical tutorial for converting Fallout 4 outfits to different bodybases with a publication-ready workflow focus.

The guide explicitly covers dismemberment setup, cloth-bone handling, slider/zap authoring, and Nexus-ready packaging considerations, with specific guidance for Fusion Girl Reduced conversions.

#### Permissions Summary

| Permission | Status |
|---|---|
| Upload to other sites | ❌ Not allowed |
| Modify/improve and release | ⚠️ Ask author first |
| Convert for other games | ❌ Not allowed |
| Use assets/files in your own mod | ⚠️ Ask author first |
| Use in paid/sold mods | ❌ Not allowed |
| Use in DP-earning mods | ❌ Not allowed |
| Console publishing | ❌ Not available for Bethesda.net console users |

#### Credits (as listed on the page)

- Resource author (Nexus page owner).
- No additional third-party file credits listed.
- Additional tutorial acknowledgements mention: ZeX Team (including TheBottomhoodOfSteel/Motherofdeathclaws), erri120, and panzou1919.

---

## How to Suggest a Mod for This List

If you've found a mod that belongs here — high quality, widely compatible, respectful permissions — tell Mossy about it. Include the Nexus URL and why you think it deserves a place. Mossy will evaluate it and add it with full credits if it meets the bar.

---

*List maintained by Mossy. All credits belong to the respective mod authors. Mossy does not host, mirror, or distribute any mod files — always download from the official Nexus pages linked above.*

*Last updated: May 2026.*
