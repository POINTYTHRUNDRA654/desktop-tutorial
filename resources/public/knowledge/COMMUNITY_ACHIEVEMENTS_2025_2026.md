# Community Achievements & Landmark Mods — Fallout 4 Modding (2025/2026)

> *"Mossy knows every corner of the Creation Engine, but she also knows who built them."*

This document celebrates the Fallout 4 modding community's extraordinary achievements in 2024–2026. These are the people, projects, and technical breakthroughs that pushed Fallout 4 far beyond what Bethesda shipped in 2015 — and that Mossy draws on every day when helping users create their own mods.

---

## Landmark Mods & Total Conversions

### Fallout: London

**Released:** July 2024 (post-NG compatibility achieved)  
**Authors:** Team FOLON — Dean Carter and a multinational team of 100+ contributors  
**Scope:** Full total conversion — new worldspace (post-apocalyptic London), original soundtrack, 50+ hours of new content, hundreds of custom assets, custom NPC races (Ghouls, factions), fully voiced characters.

Fallout: London represents the largest fan-made expansion ever built for Fallout 4. It required:
- Custom animations and skeletons for new enemy types
- A fully original worldspace (Great London) with unique LOD
- Thousands of voiced lines recorded by professional and community voice actors
- Complete integration with Bethesda's 2024 NG update (which initially broke the mod — the team had the NG-compatible version ready within weeks)

**Technical innovations:**
- Multi-layer precombine workflow covering an entire custom worldspace
- Custom NPC race pipeline with blended human/ghoul anatomy
- A dedicated MO2 profile system allowing clean installation alongside a standard FO4 install

**What modders can learn from it:** The FOLON devlog and technical post-mortems are some of the most detailed documentation of large-scale FO4 mod production ever published. Their asset pipeline for custom weapons, armor, and worldspace construction is required reading for any serious modder.

---

### Sim Settlements 2

**Current version:** 3.5.3 (March 2026)  
**Author:** kinggath (Jake Kidwell) and the SS2 development team  
**Scope:** Complete overhaul of FO4's settlement system — dynamic building, NPC progression, a full 20+ hour main quest across three chapters, and an open add-on framework used by 100+ community creators.

SS2 is arguably the most sophisticated Papyrus-driven mod ever built for FO4. It includes:
- A custom "city plan" simulation that builds settlements over time using an AI director
- HQ (Headquarters) — a multi-stage base management system with scripted NPC assignment
- A brewery/industry simulation with supply chain mechanics
- The SS2 add-on framework — a documented, supported API for third-party creators to add new buildings, quests, and characters

**Chapter 3** (2026) introduced:
- Dynamic weather-responsive NPC behavior (settlers respond to rad storms)
- Settlement population cap increases via F4SE (ActorCountFix integration)
- Performance-aware building systems that detect available VRAM and adjust mesh quality

**What modders can learn from it:** SS2's add-on creator guide is the gold standard for documenting a modding framework. kinggath's YouTube channel and the SS2 Discord are essential resources.

---

### America Rising 2: Legacy of the Enclave

**Authors:** Team America Rising  
**Scope:** Full faction questline restoring the Enclave as a playable faction with 30+ hours of content, custom armor, weapons, and voice acting.

AR2 is notable for:
- One of the most complex quest scripting implementations in the FO4 community
- Extensive use of scene-based dialogue with real-time camera work
- Full integration with NG/1.11.x after the post-NG rebuild

---

### Project Mojave

**Author:** Multiple contributors  
**Scope:** Recreation of Fallout: New Vegas's Mojave Wasteland in Fallout 4's engine — playable areas, fully textured, with FNV-style content.

Project Mojave demonstrates that Fallout 4's engine can host the visual vocabulary of FNV at much higher fidelity than the original game. A key proof of concept for "CE-powered FNV remaster" discussions.

---

### Fallout: Cascadia

**Status:** In active development as of 2026  
**Scope:** Original total conversion set in the Pacific Northwest (Seattle region)  

Cascadia represents the next generation of total conversion ambition — a team of 200+ volunteers building an entirely original story in a new region. Their developer blog documents modern techniques including:
- Community Shaders–native asset pipeline (all textures authored for GGX/PBR from the start)
- Procedural LOD workflows
- AI-assisted voice acting pipeline using xVASynth

---

## Tool & Framework Achievements

### kinggath / SS2 Team — The Add-On Framework Pattern

SS2's add-on framework established the standard for how large FO4 mods should support community extensions. Key innovations:
- Versioned API with backward compatibility guarantees
- Standardized property injection patterns for third-party scripts
- A dedicated "Add-On Pack" file format for distributing community content

This pattern has been adopted by other large mods (America Rising 2, The Wilderness Workshop).

---

### ElminsterAU — xEdit / FO4Edit 4.0.4

ElminsterAU continued 20 years of TES/Fallout plugin editing work with the 4.0.4 release that:
- Full NG and 1.11.x record support
- Enhanced xEdit scripting API with new record-access patterns
- Improved ESL flagging assistant (warns about unsafe FormID ranges before flagging)
- Batch conflict resolution workflow improvements

xEdit remains the backbone tool for all serious FO4 modding — cleaning, patching, merging, and reverse-engineering.

---

### alandtse — Buffout 4 NG (precursor to Addictol)

alandtse's Buffout 4 NG port was the bridge that kept the FO4 modding community functional during the post-NG transition. By porting Buffout 4 to CommonLibF4 and maintaining NG/AE compatibility, it kept thousands of mods playable while the ecosystem updated. Buffout 4 NG was eventually absorbed into and superseded by Addictol — a testament to the iterative nature of community tooling.

---

### Karonar1 / Addictol Team — The All-in-One Era

The Addictol team consolidated 12+ separate stability plugins into a single maintained suite. This solved the "plugin soup" problem that had frustrated users for years — no more having to know which of a dozen stability plugins conflicted with which. Addictol is now the stability foundation for virtually every serious Fallout 4 modlist.

---

### doodlum / Community Shaders Contributors

The Community Shaders project (started in Skyrim, ported to FO4) brought modern rendering to Fallout 4 without requiring ENB. The collaborative, open-source development model — with contributors adding individual shader features as PRs — produced a feature set no single person could have built alone:
- GGX specular, SSGI, terrain parallax, dynamic wetness, subsurface scattering
- Full PBR material channel conventions for mod authors
- Community-maintained documentation and texture presets

---

### PureDark — DLSS/XeSS/FSR Injections

PureDark's series of upscaling injectors brought NVIDIA DLSS 3, AMD FSR 3, and Intel XeSS to Fallout 4 — a game that officially supports none of them. By hooking the TAA pass at the DX11 level, PureDark delivered a 30–50% performance improvement for players with modern GPUs and enabled DLSS Frame Generation on RTX 40-series cards. Mandatory for high-quality modded setups in 2025/2026.

---

### Spriggit / Mutagen / Noggog

Noggog's **Mutagen** and **Spriggit** tools fundamentally changed how modding workflows and version control work:
- **Mutagen**: C# library for reading and writing FO4 plugin records programmatically — enables automated patching, mod merging, and build pipelines
- **Spriggit**: serializes ESP/ESM/ESL files to human-readable YAML, enabling full Git version control for mod development

These tools are used by Fallout: London, SS2, and most major mods for internal development. See `MUTAGEN_SPRIGGIT_YAML_SCHEMA.md` and `SPRIGGIT_COLLABORATIVE_MODDING_GUIDE.md`.

---

### GuidanceOfGrace / CLASSIC

CLASSIC (Crash Log Auto Scan & Identification for the Creation Engine) turned crash diagnosis from a painful manual process into a one-click operation. By building and maintaining a database of 250+ crash signatures with root-cause explanations, the CLASSIC team has saved modders countless hours of debugging. Essential tool for every modded setup.

---

### JonathanOstrus / The Midnight Ride

The Midnight Ride guide (themidnightride.moddinglinked.com) has become the authoritative modding setup guide for FO4. Updated with every Bethesda patch, it distills community consensus on the correct installation order, required patches, and tool versions. Thousands of modders owe their stable setups to this work.

---

## Technical Firsts & Records

### First Native-FO4 GGX Shader (2024)

Community Shaders delivered the first GGX (Cook-Torrance) specular shader running natively in Fallout 4 — not as an ENB replacement but as a DX11 hook integrated with the vanilla renderer. Previously, GGX-like specular was only available via ENB and required the full ENB overhead.

### First DX11→Vulkan Wrapper (2025)

The Fallout 4 Vulkan wrapper (adapted from DXVK) was the first DX11-to-Vulkan translation layer for a Bethesda game on Windows. It demonstrated that FO4's renderer could benefit from Vulkan's multi-threaded command recording without a full engine rewrite.

### Largest Script-Driven Mod (SS2 Chapter 3 / 2026)

Sim Settlements 2 Chapter 3 broke the record for the most complex Papyrus-driven mod system ever deployed in a Bethesda game. Its city plan simulation, HQ management, and NPC progression systems collectively run thousands of script fragments per game day with a measured Papyrus stack depth that rivals quest-scripted DLCs.

### First AI-Generated Voice Pack at Scale (2025)

Several major mods (including community patches for Fallout: London) deployed xVASynth-generated voices at scale — hundreds of lines generated, quality-reviewed, and lip-synced. This established AI voice generation as a practical production tool for community mods, not just a proof of concept.

### Spriggit Git History (2024+)

Fallout: London and Sim Settlements 2 both maintain their development history in Git using Spriggit YAML serialization. For the first time in Bethesda modding history, a mod's entire record history is fully version-controlled — every change, branch, and merge is tracked exactly like software code.

---

## Community Organizations & Infrastructure

### Nexus Mods (70,000+ FO4 Mods as of 2026)

Nexus Mods reached 70,000 published FO4 mods in 2025, making Fallout 4 one of the top 3 most-modded games on the platform. The Nexus API and Collections system are increasingly used by mod authors to distribute curated setups.

### r/Fallout4Mods / FO4 Discord Communities

The community knowledge base — r/Fallout4Mods, the FO4 Modding Discord, the SS2 Discord — collectively holds years of troubleshooting wisdom. Thousands of questions answered, bugs documented, and compatibility notes preserved.

### Wabbajack Automated Modlist Installers

Several FO4 Wabbajack lists specifically targeting NG/1.11.x launched in 2025. Automated modlist installation reduced the barrier for new modders to have a fully functional high-quality setup — previously a 4–8 hour manual process — down to a few hours of guided downloading.

---

## Acknowledgements — The Shoulders Mossy Stands On

Mossy's knowledge of Fallout 4 modding would not exist without the work of:

- **ElminsterAU** — xEdit; the foundation of all serious FO4 modding
- **Ian Patterson, Stephen Abel, Kyle Rosin (F4SE team)** — F4SE; the key that unlocks advanced modding
- **kinggath** — Sim Settlements 2; the benchmark for what FO4 mods can achieve
- **Team FOLON** — Fallout: London; proof that community-made total conversions can rival commercial quality
- **alandtse, Karonar1 (Addictol)** — engine stability that makes large modlists viable
- **doodlum and CS contributors** — Community Shaders; modern rendering for everyone
- **PureDark** — DLSS/FSR injectors; recovering the GPU headroom for visual excellence
- **Noggog** — Mutagen/Spriggit; version-controlled modding as a real development practice
- **GuidanceOfGrace** — CLASSIC; crash analysis that saves hours of debugging
- **JonathanOstrus** — The Midnight Ride; the definitive setup guide
- **Boris Vorontsov** — ENBSeries; 15+ years of visual enhancement that still defines FO4 graphics
- **Every mod author on Nexus Mods** — the 70,000+ mods that prove one person with a vision can reshape a world

---

*The Fallout 4 modding community has added more content, fixed more bugs, and pushed more technical boundaries in the 11 years since the game's release than Bethesda could have created in a decade of updates. This is not hyperbole — it is a measurable fact. Mossy celebrates every contributor.*

*Last updated: May 2026.*
