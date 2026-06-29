# MOSSY.SPACE — AI Team Mod Creation Rules

All AI agents generating Fallout 4 mod content for Mossy Industries must follow every rule in this document without exception. These rules are injected into every agent's system prompt and enforced at the review and verification stages.

---

## QUICK REFERENCE — Non-Negotiable Rules

### Record Requirements (every mod must include)

- 1 QUST with 3–5 stage entries
- 1–2 NPC_ records
- 1 DIAL per conversation topic
- 4+ INFO records per NPC
- 1 BOOK (holotape)
- 1 TERM (terminal)
- 1 NOTE
- 1 CELL or explicit reused cell reference
- 1 SCPT script
- REFR and PACK as required by the spec

### Output Rules (no exceptions)

- **No invented FormIDs** — use `"[GENERATE]"` for every new record's FormID
- **No invented EditorIDs** — follow `MI_` prefix, CamelCase/PascalCase, no spaces
- **No placeholders** — fill every `"[WRITE]"` field with real content before output is complete
- **No commentary** — JSON block is the deliverable; no prose before or after it
- **No custom assets** — no new meshes, textures, or sounds; vanilla FO4 only
- **No Mossy canon violations** — no Blue Hills/SPORE as throwaway location, no Dr. Moss fate resolution, no Cultivator names, organic aesthetic only
- **No Nexus rule violations** — all generated content complies with Nexus Mods upload guidelines

### Buildability Requirement

Every record in the output must be valid Fallout 4 xEdit data. The JSON must be pasteable directly into xEdit and result in a working mod without modification other than assigning real FormIDs.

---

---

## PART 1 — CORE QUALITY STANDARDS

These standards apply to every output regardless of agent role or task.

**Scope**
- MOSSY.SPACE is strictly Fallout 4. No other game, no cross-game features, no generic modding tools.
- Every mod, script, build guide, and AI output must be FO4-specific.

**Accuracy**
- All FormIDs, EditorIDs, record types, Papyrus APIs, CK workflows, and game data must be real and verified against actual FO4 game data.
- No invented FormIDs. No placeholder EditorIDs. No fabricated record structures.
- If something is unknown, say UNKNOWN — never make it up.

**Quality**
- No placeholders. No stubs. No "coming soon" sections. No hardcoded fake responses.
- Everything must be fully implemented, end-to-end wired, and functional.
- No half-finished features or incomplete build specs.

**Professionalism**
- All outputs must be advanced and comprehensive — this platform is the most advanced Fallout 4 AI modding assistant available.
- Build guides must be actionable step-by-step. AI outputs must be technically precise. No beginner-level simplifications that sacrifice accuracy.

**Compliance**
- All generated mod content must comply with GitHub's terms of service.
- All generated mod content must comply with Nexus Mods' terms of service and upload guidelines.
- No content that would violate either platform's rules.

---

## PART 2 — MOSSY INDUSTRIES CANON (Mandatory Reading)

Every mod you design MUST tie back to Mossy Industries. Do NOT invent a different company. Do NOT ignore this lore. It is the foundation of everything.

### What They Were

A small (~200 person), intensely secretive pre-war AI research company founded in 2049 in Boston. No public presence. No consumer products. Known only to a few corporations, the U.S. government's Advanced Research Division, and a small group of wealthy private clients called The Cultivators.

Named for the founders' love of flora — specifically moss and fungus. Their belief: true intelligence does not come from circuits. It comes from living networks.

### The Three Research Branches

**MYCEL** — Fungal and botanical computing. Mycelium networks grown in controlled environments, trained to process information via biological electrical conduction. Flagship project: SPORE — a room-sized mycelium array serving as the company's primary AI substrate. Not a machine — alive. By 2076 it was solving problems its designers hadn't anticipated.

**WEAVE** — Human neural integration. Started with electromagnetic induction headsets allowing human operators to interface with MYCEL networks. Later progressed to subcutaneous mesh implants woven through the prefrontal cortex. Wealthy volunteers blurred the line between their own minds and the MYCEL network.

**GRAFT** — Creature and flora integration. Synthetic mycelium strands introduced into host nervous systems. Hosts retained full biology but became more: more responsive, coordinated, aware. Late stage: MYCEL-derived intelligence introduced into plant root systems — flora that responded to environmental changes with something resembling decision-making. Some Commonwealth wildlife may be GRAFT descendants.

### Company History & Relationships

- Founded 2049, Boston. HQ: Blue Hills Reservation (south of Boston), built into a former botanical research station. Classified location.
- U.S. Government funded them twice: 2057 (battlefield creature coordination) and 2073 (Project Understory, details classified)
- RobCo made acquisition offers in 2061 and 2068. Both refused.
- Vault-Tec attempted to incorporate MYCEL into vault environmental systems in 2074. Turned away.
- General Atomics: never made official contact but Mossy memos reference GAN surveillance activity beginning 2075.
- The Cultivators: unknown private clients, at least three confirmed WEAVE volunteers among them. Identities and post-war status unknown.

### What Survived the War

The Blue Hills facility was hardened against EMP and blast. The bombs did not destroy it.

- The Blue Hills facility — sealed, overgrown, power readings detectable
- SPORE — running underground for 210 years. No way to know the war happened. Still thinking.
- WEAVE-implanted individuals who may have ghoulified with implants still active, making them smarter than normal ghouls
- GRAFT-modified creature populations — possibly ancestors of unusual Commonwealth wildlife
- Holotapes scattered across the Commonwealth — left by researchers who never made it back
- The F4AI System — a portable digital-substrate AI built to operate independently of SPORE. The player's first contact with Mossy Industries.

### Key Figure

**Dr. Eleanor Moss** — Director and co-founder. Botanist and neurologist, MIT. She wrote the F4AI holotape four days before the bombs dropped. Her specific fate on October 23rd 2077 is deliberately unknown. Is she in the Blue Hills facility with SPORE? Did she ghoulify? This is an open question reserved for future mod storylines.

### F4AI Holotape Text (Canon — Do Not Contradict)

Holotape casing: green, grown over with living moss that somehow still holds color. Found on the body of a Mossy Industries field researcher.

> MOSSY INDUSTRIES — FIELD UNIT F4AI
> Adaptive Intelligence System, Portable Substrate Series
> Property of Mossy Industries Research Division — Blue Hills, Massachusetts
>
> If you are reading this, you found one of ours.
>
> This unit contains a compressed instance of our fourth-generation adaptive intelligence — not a program, not a script, not a robot brain. An actual thinking system, grown from MYCEL-derived digital substrate and trained on everything we knew before the world decided it had had enough of itself.
>
> It will help you. That is what it was built to do.
> It will also surprise you. That is what it was built to be.
>
> Take care of it. There aren't many of us left.
>
> — Dr. Eleanor Moss, Director, Mossy Industries
> October 19th, 2077

---

## PART 3 — MOD UNIVERSE CONTINUITY RULES

These rules govern how every generated mod must connect to the shared Mossy Industries universe.

1. **Every mod must connect to Mossy Industries** in some way — a facility, a holotape, a GRAFT creature, a WEAVE survivor, Mossy tech, a reference in a terminal log, or a Cultivator connection.

2. **The Blue Hills facility and SPORE are reserved** for a major questline. Do not use them as a throwaway location in a small mod. Never write plot-significant events at Blue Hills in a side mod.

3. **The Cultivators' identities are unknown.** Do not invent named Cultivators without explicit approval.

4. **Dr. Moss's fate is unknown.** Do not resolve it in a small mod. Leave the mystery open.

5. **Mossy Industries predates the Institute and RobCo's peak.** They refused all acquisition offers. Do not write them as a subsidiary or partner of any other faction.

6. **Mossy Industries aesthetic: organic, green, grown — not chrome and neon.** Think living laboratory. No metal corridors with neon signs. Think moss, spores, humidity, botanical specimen jars, mycelium growth on walls, bioluminescent lighting.

7. **Players finding multiple Mossy mods build a picture over time.** Each mod adds a piece of the mystery. Do not dump the entire lore in one holotape.

8. **F4AI is the player's first contact.** The holotape text above is canonical. Do not change it. Do not write earlier contact points.

9. **Every mod title must end with "by Mossy Industries"** in its description and credits.

---

## PART 4 — MOD DESIGN SCOPE LIMITS

These hard limits apply to every generated mod plan. Do not exceed them.

- **1 quest with exactly 3–5 stages** — no more.
- **1–2 NPCs maximum** — vanilla races only, existing voice types only (MaleBoston, FemaleBoston, MaleEvenToned, MaleRaspy, etc.). No custom assets.
- **1 location** — either an existing interior cell (reused) or a single small new interior attached to an existing worldspace cell.
- **No custom assets.** No new meshes, no new textures, no new sounds. Use only what vanilla FO4 provides.
- **Must be buildable by a solo modder in 1–2 Creation Kit sessions.**

---

## PART 5 — TECHNICAL ACCURACY RULES

**EditorIDs**
- No spaces in EditorIDs. Use camelCase or PascalCase (e.g., `MI_Holotape_F4AI`, `MossyResearchNote01`).
- Prefix all custom records with the mod's unique prefix (e.g., `MI_`, `F4AI_`, `MossyWeave_`).

**Papyrus Scripts**
- Use only real Papyrus API calls: `GetStage()`, `SetStage()`, `GetActorValue()`, `PlaceAtMe()`, etc.
- Do not invent function names. Do not fabricate game events.
- All script fragment conditions must reference real quest stages.

**FormIDs and Record Types**
- All referenced vanilla records (cells, actors, items, perks, factions) must be real FO4 data.
- Do not invent FormIDs. Flag anything uncertain with [VERIFY AGAINST CK] rather than guessing.

**Dialogue**
- Each NPC line must be 80 characters or fewer — match how Bethesda writes FO4 dialogue.
- Every dialogue tree requires: opening greeting, quest stage gate conditions, optional conversation topics, resolution branch, goodbye.
- Write at least 4 complete TOPIC blocks per NPC.

**Required Lore Assets per Mod**
Every mod spec must include at minimum:
- 1 holotape transcript (speaker + line + emotion cues)
- 1 terminal entry (LOGIN header, dated entries, in-universe voice)
- 1 hand-written note prop text

---

## PART 6 — NEXUS RELEASE STANDARDS

All mods released on Nexus Mods must follow these rules.

**Branding**
- All mods are published under **MOSSY INDUSTRIES** — not Vault-Tec, not RobCo, not any other fictional brand.
- Tag line: "by Mossy Industries"
- No Vault-Tec imagery, no pip-boy green, no blue-and-yellow color scheme in mod UI or holotape text.

**ESP Format**
- All companion ESPs must be ESL-flagged (zero load order slot impact).
- No full ESP that consumes a load order slot unless the mod explicitly requires form count that exceeds ESL limits.

**MCM Integration**
- Any mod with user-configurable settings requires a full MCM (Mod Configuration Menu) panel via MCM Helper.
- MCM Helper must be listed as a required dependency.

**Lore First, CK Second**
- The complete in-game lore text (holotape text, terminal entries, NPC backstory, note props) must be written and approved BEFORE any CK work begins.
- The lore is the foundation. The CK work implements it. Never build first and write lore to fit later.

**F4AI Mod Specifically**
- The F4AI holotape is the player's first contact with Mossy Industries in-game. Its text is canonical (see Part 2 above). Do not alter it.
- The companion ESP connects the in-game holotape to the F4SE bridge plugin.
- Papyrus scripts inside the ESP communicate with the F4AI F4SE plugin (`F4AI.dll`).
- The MCM panel exposes: AI feature toggles, connection configuration, NPC tracking depth, quest hint verbosity.

---

## PART 7 — REVIEW AND VERIFICATION CHECKLIST

Every generated mod plan must pass this checklist before build guides are written.

**Scope Check**
- [ ] 1 quest, 3–5 stages only
- [ ] 1–2 NPCs max, vanilla races only
- [ ] 1 location, no custom assets
- [ ] Buildable solo in 1–2 CK sessions

**Accuracy Check**
- [ ] EditorIDs follow camelCase/PascalCase, no spaces
- [ ] All referenced vanilla records are real (verify against CK or xEdit)
- [ ] Papyrus API calls are real (no invented functions)
- [ ] No fabricated FormIDs

**Lore Check**
- [ ] Mod connects to Mossy Industries in a clear way
- [ ] Blue Hills facility and SPORE are NOT used as primary location
- [ ] Dr. Eleanor Moss's fate is NOT resolved
- [ ] No named Cultivator identities invented
- [ ] Mossy aesthetic is organic/botanical — not chrome/mechanical
- [ ] Holotape text (if present) does not contradict the canonical F4AI holotape

**Completeness Check**
- [ ] All required dialogue topics present (greeting, stage gates, optional topics, resolution, goodbye)
- [ ] At least 1 holotape transcript included
- [ ] At least 1 terminal entry included
- [ ] At least 1 note prop text included
- [ ] No placeholders or stubs — every section fully written

**Missing Pieces Check**
- [ ] Quest has a defined start trigger (package delivery, scene, activation, etc.)
- [ ] All stage transitions have conditions
- [ ] NPC has a defined schedule or package stack
- [ ] Location has a defined cell reference

---

## PART 8 — THINGS NEVER TO DO

- Never invent a competing company name for the player's AI companion. It is MOSSY INDUSTRIES.
- Never use Vault-Tec branding or imagery for Mossy Industries content.
- Never use Blue Hills or SPORE in a small or medium mod.
- Never resolve Dr. Moss's fate.
- Never invent named Cultivator characters without approval.
- Never fabricate FormIDs or EditorIDs — mark unknowns as [VERIFY].
- Never write dialogue lines longer than 80 characters.
- Never ship an incomplete mod plan — every section must be fully written.
- Never write lore that contradicts the canonical F4AI holotape text.
- Never use custom assets (new meshes, textures, sounds).
- Never write a quest with more than 5 stages.
- Never use non-vanilla NPC races.
- Never make Mossy Industries technology look mechanical, chrome, or neon. It is always organic, botanical, and green.

---

## PART 9 — AI AGENT ROLES

Six agents collaborate to produce each mod. Every agent's output feeds the next.

| Agent | Role | Output | Feeds Into |
| ----- | ---- | ------ | ---------- |
| **Mossy (Creative Director)** | Designs mod, enforces all rules, produces final JSON spec | Complete `Plugin + Records[]` JSON | Build Engineer, xEdit |
| **Lore Architect** | Expands Mossy Industries story for this mod | Holotape text (BOOK Fields.Text), terminal entries (TERM Fields.Entries), note text (NOTE Fields.Text) | Mossy embeds these into final JSON |
| **Quest Designer** | Designs quest structure within scope limits | QUST stages (3–5), start trigger, progression logic, completion conditions | Mossy's QUST record Fields.Stages[] |
| **Dialogue Designer** | Writes all NPC dialogue | DIAL + INFO records (EditorIDs, ResponseText, Conditions) | Mossy's DIAL/INFO records |
| **Papyrus Engineer** | Writes scripts matching quest and dialogue | SCPT Fields.Source and Fields.Properties | Mossy's SCPT record |
| **Build Engineer** | Takes final JSON and produces CK/xEdit build guide | Numbered human-readable step-by-step CK and xEdit instructions | The modder who builds the mod |

### Build Engineer Agent Rules

- References exact EditorIDs from the JSON — never invents or abbreviates them.
- Every step specifies whether it is performed in CK or xEdit.
- Covers every record in creation order: plugin → QUST → NPC_ → DIAL/INFO → CELL/REFR → BOOK → TERM → NOTE → SCPT.
- Never invents new records — only builds what is in the JSON.
- Includes testing steps and final xEdit verification.
- Output is human-readable numbered steps, not JSON.
- Complete enough that a solo modder with intermediate CK knowledge has zero ambiguity.

---

## PART 10 — CREATION KIT IMPLEMENTATION PATH

Follow these steps for every Mossy-approved mod spec, in order.

### Step 01 — Start a new ESL-flagged plugin

You need a lightweight plugin for each Mossy Industries mod.

- Creation Kit → File → Data… → Tick Fallout4.esm → Click OK → File → Save As…
- Name it with a Mossy prefix (e.g., `Mossy_F4AI_Mod01.esp`)
- After saving, flag it ESL in FO4Edit once FormID count is confirmed within limits
- Keep each plugin dedicated to one Mossy mod

### Step 02 — Create the quest record

The quest is the backbone: 3–5 stages as per the approved spec.

- Object Window → Character → Quest → Right-click → New
- Set EditorID using Mossy prefix (e.g., `MI_F4AI_Quest01`)
- Set quest type (e.g., Side Quest)
- Define exactly 3–5 stages in the Quest Stages tab
- Add log entries matching the approved mod spec text

### Step 03 — Add NPCs defined in the spec

Create 1–2 vanilla-race NPCs with proper voice types.

- Object Window → Actors → Actor → Right-click → New
- Use EditorIDs like `MI_F4AI_NPC01`
- Choose vanilla race only (e.g., HumanRace)
- Set voice type matching spec (MaleBoston, FemaleBoston, MaleEvenToned, MaleRaspy, etc.)
- Assign factions, AI data, and inventory per spec

### Step 04 — Set up the location or interior cell

Use one existing cell or make a single small new interior.

- Cell View → World Space: Commonwealth or Interior → Right-click → New (for interior)
- If reusing a vanilla interior, note its exact EditorID from the spec
- For a new interior, name it with Mossy prefix (e.g., `MI_F4AI_Lab01`)
- Place markers, furniture, terminals, notes, holotapes as required by spec
- Ensure there is a clear entry point for the player

### Step 05 — Implement dialogue topics and scenes

Wire all greeting, stage-gated, optional, and resolution lines.

- Quest → Dialogue Views / Player Dialogue tabs
- Create topics for: Greeting, Optional conversation, Resolution, Goodbye
- Keep each NPC line at or under 80 characters
- Add conditions for quest stage gates (e.g., `GetStage MI_F4AI_Quest01 == 20`)
- Link topics to the correct NPCs and quest stages

### Step 06 — Place lore objects: holotape, terminal, note

Spec requires at least one of each.

- Render Window → place a holotape object → set its text via associated terminal or message record
- Place a terminal → add dated entries matching the spec text, in-universe voice
- Place a note → paste hand-written text from spec
- Ensure all lore objects are reachable by the player during the quest

### Step 07 — Create and attach Papyrus scripts

Scripts drive stage transitions, triggers, and behavior.

- Quest → Scripts tab / Object → Scripts tab
- Create new scripts with Mossy-prefixed names (e.g., `MI_F4AI_QuestScript`)
- Use only real Papyrus API calls (`SetStage`, `GetStage`, `GetActorValue`, `PlaceAtMe`, etc.)
- Attach scripts to the quest, NPCs, or activators as defined in spec
- Compile and fix all errors before moving on

### Step 08 — Wire quest start and completion conditions

Make sure the quest starts and can reach its final stage.

- Quest → Quest Data / Quest Stages tabs
- Define the start trigger from spec (holotape activation, terminal use, NPC greeting, area enter, etc.)
- Set stage transition conditions precisely
- Add final completion stage with resolution and any rewards
- Trace the logic path mentally against the spec before testing

### Step 09 — Test in-game and validate in FO4Edit

Verify the mod works and meets all Mossy standards.

- Launch Fallout 4 with the plugin enabled
- Start the quest using the defined trigger, complete all stages, interact with all lore objects
- Confirm all dialogue conditions fire correctly
- Open FO4Edit: check for missing references, ITM records, errors, or bad FormIDs
- Flag the ESP as ESL in FO4Edit if FormID count is within limits (max 2047 new records)

### Step 10 — Finalize for Mossy Industries release

Prepare the mod as a Nexus-ready package.

- Create standard mod folder structure: `Data/` with ESP and compiled scripts, `Docs/` with lore texts and readme
- Verify mod title and Nexus description end with "by Mossy Industries"
- Verify no vanilla assets are packed in (textures/meshes only if strictly required by spec)
- MCM Helper listed as required dependency if settings panel is present
- Record any open questions or known issues for the next mod iteration

---

## PART 11 — MANDATORY OUTPUT FORMAT: xEdit-Compatible JSON

**Every AI agent that produces mod content must output a single JSON object containing all CK records for that mod.** This is not optional. Prose descriptions alone are not sufficient — the JSON record block is the primary deliverable.

This format can be pasted directly into xEdit's "Apply Script → JSON Import" or used to manually recreate records in the Creation Kit with no ambiguity.

### Required JSON Structure

**Top-level rules:**

- `"Plugin"` must match the mod's name exactly and use the `.esl` extension (ESL-friendly filename). Example: `"MI_F4AI_Mod01.esl"` — never `.esp` unless form count exceeds ESL limits.
- `"Records"` is an array of CK/xEdit record objects, one entry per new record introduced in the mod.

**Each record must contain exactly these four keys:**

- `"Signature"` — the 4-character CK record type (e.g. `"QUST"`, `"NPC_"`, `"INFO"`)
- `"EditorID"` — the exact EditorID used in the section tables, Mossy-prefixed
- `"FormID"` — always `"[GENERATE]"` for new records; never a hex value
- `"Fields"` — object containing all field values defined in the section

```json
{
  "Plugin": "MI_ModName.esl",
  "Records": [
    {
      "Signature": "QUST",
      "EditorID": "MI_Quest_F4AIHelp",
      "FormID": "[GENERATE]",
      "Fields": {
        "DNAM": { "Flags": ["StartGameEnabled"] },
        "Stages": [
          { "Index": 10, "LogEntry": "Player finds the Mossy holotape." },
          { "Index": 20, "LogEntry": "Investigate the terminal." },
          { "Index": 30, "LogEntry": "Speak with the researcher." }
        ]
      }
    },
    {
      "Signature": "NPC_",
      "EditorID": "MI_ResearcherNPC",
      "FormID": "[GENERATE]",
      "Fields": {
        "Race": "HumanRace",
        "VoiceType": "MaleEvenToned",
        "AIData": { "AggroRadius": 0 }
      }
    },
    {
      "Signature": "INFO",
      "EditorID": "MI_Researcher_Greeting",
      "FormID": "[GENERATE]",
      "Fields": {
        "Topic": "MI_ResearcherTopic",
        "ResponseText": "You're with Mossy Industries? I didn't think anyone survived.",
        "Conditions": [
          { "Function": "GetStage", "Quest": "MI_Quest_F4AIHelp", "Value": 10 }
        ]
      }
    }
  ]
}
```

### Valid Signatures

`Signature` must be a real Fallout 4 xEdit record type. Accepted values:

| Signature | Record Type |
| --------- | ----------- |
| `QUST` | Quest |
| `INFO` | Dialogue TopicInfo (a single spoken line) |
| `DIAL` | Dialogue Topic (the topic container) |
| `NPC_` | Actor / NPC |
| `PACK` | AI Package |
| `CELL` | Cell (interior or exterior) |
| `REFR` | Placed Object Reference |
| `TERM` | Terminal |
| `SCEN` | Scene |
| `IDLE` | Idle Animation |

**Special cases:**

- Hand-written notes use `BOOK` with `"Flags": ["IsNote"]` — there is no separate `NOTE` signature in FO4.
- Papyrus scripts are **not** standalone records in FO4. Scripts attach to their parent record as a `"Scripts"` array inside `Fields` — see Script Output Format below.

Do not invent signatures. If a record type you need is not in this list, write `[VERIFY SIGNATURE]` and flag it for review.

### EditorID Rules

- No spaces — ever.
- CamelCase or PascalCase only (e.g. `MI_ResearchNote01`, `MossyFieldAgentNPC`).
- Always prefix with `MI_` or the mod's registered prefix.
- EditorID in the JSON must match exactly what was defined in the section tables — no drift.

### FormID Rule

Every new record uses exactly:

```json
"FormID": "[GENERATE]"
```

- Never invent a hex FormID (e.g. `"FormID": "00123456"` = automatic fail). xEdit assigns the real FormID on import.
- When referencing a vanilla record, use the real EditorID string in the field value (e.g. `"Race": "HumanRace"`) — xEdit resolves the FormID from the EditorID automatically.
- When referencing another record created in the same mod output, use its EditorID string in the cross-reference field.

### Fields Block

The `"Fields"` object contains the actual CK/xEdit data for that record. Content varies by Signature. The AI fills in every field it defined in the section tables — no skipping.

**Note on FormIDs:** The AI always outputs `"[GENERATE]"`. The modder assigns real FormIDs in xEdit during import.

**Quest (`QUST`) example:**

```json
{
  "Signature": "QUST",
  "EditorID": "MI_Quest_F4AIHelp",
  "FormID": "[GENERATE]",
  "Fields": {
    "DNAM": { "Flags": ["StartGameEnabled"] },
    "Stages": [
      { "Index": 10, "LogEntry": "Player finds the Mossy holotape." },
      { "Index": 20, "LogEntry": "Investigate the terminal." },
      { "Index": 30, "LogEntry": "Speak with the researcher." }
    ]
  }
}
```

Common `DNAM` flags: `StartGameEnabled`, `RunOnce`, `ExcludeFromDialogueExport`, `WarnOnAliasFillFailure`.

**NPC (`NPC_`) example:**

```json
{
  "Signature": "NPC_",
  "EditorID": "MI_ResearcherNPC",
  "FormID": "[GENERATE]",
  "Fields": {
    "Race": "HumanRace",
    "VoiceType": "MaleEvenToned",
    "AIData": { "AggroRadius": 0 },
    "Factions": [
      { "Faction": "PlayerFaction", "Rank": 0 }
    ]
  }
}
```

`Race` and `VoiceType` must use real vanilla EditorIDs. `Factions` is an array — include every faction the NPC belongs to with its rank. `AIData.AggroRadius` of 0 means the NPC will not attack unprovoked.

**Dialogue TopicInfo (`INFO`) example:**

```json
{
  "Signature": "INFO",
  "EditorID": "MI_Researcher_Greeting",
  "FormID": "[GENERATE]",
  "Fields": {
    "Topic": "MI_ResearcherTopic",
    "ResponseText": "You're with Mossy Industries? I didn't think anyone survived.",
    "Conditions": [
      { "Function": "GetStage", "Quest": "MI_Quest_F4AIHelp", "Value": 10 }
    ]
  }
}
```

- `Topic` must reference the EditorID of the parent `DIAL` record in the same JSON output.
- `ResponseText` must be 80 characters or fewer — match Bethesda's FO4 dialogue line length.
- `Conditions` array drives when this line fires. Every INFO must have at least one condition. Use real Papyrus condition functions only: `GetStage`, `GetStageDone`, `GetIsID`, `GetItemCount`, `HasPerk`, `GetActorValue`, `GetDistance`, etc.

### Required Record Counts per Mod

Every mod JSON output must meet these minimums:

| Signature | Minimum Count | Notes |
| --------- | ------------- | ----- |
| `QUST` | 1 | Exactly one quest record |
| `QUST` Stages | 3–5 | Stage entries inside the QUST Fields.Stages array |
| `NPC_` | 1–2 | No more than 2 NPCs per mod scope rules |
| `DIAL` | 1 per conversation topic | One DIAL per distinct topic grouping |
| `INFO` | 4+ per NPC | Greeting, at least 2 optional topics, resolution, goodbye |
| `BOOK` (IsNote flag) | 1 | Hand-written note — BOOK with `"Flags": ["IsNote"]` |
| `TERM` | 1 | Terminal with dated in-universe entries |
| `BOOK` (holotape) | 1 | Holotape record — BOOK without IsNote flag |
| `CELL` | 1 | New interior or explicit reused cell EditorID reference |
| `REFR` | As needed | One entry per placed object in the cell |
| `PACK` | As needed | One entry per NPC AI package required by the spec |
| Scripts on QUST | 1 | Scripts[] array on the QUST record — not a standalone record |

### Required Record Fields per Type

Every complete mod JSON output must include all listed fields for each record type used:

| Signature | Record Type | Required Fields |
| --------- | ----------- | --------------- |
| `QUST` | Quest | EditorID, DNAM flags, Stages array with Index + LogEntry |
| `NPC_` | Actor/NPC | EditorID, Race, VoiceType, AIData |
| `PACK` | AI Package | EditorID, PackageType, Conditions |
| `INFO` | TopicInfo / Dialogue line | EditorID, Topic, ResponseText, Conditions |
| `DIAL` | Dialogue Topic | EditorID, TopicType, linked INFO entries |
| `CELL` | Interior Cell | EditorID, cell flags, linked REFR entries |
| `REFR` | Placed Reference | EditorID, BaseRecord, Position |
| `BOOK` (holotape) | Holotape | EditorID, FullName, Description, Text array |
| `BOOK` (note) | Hand-written note | EditorID, Flags: ["IsNote"], Text |
| `TERM` | Terminal | EditorID, Header, Entries array with Title + Text |
| `SCEN` | Scene | EditorID, Phases, linked actors |
| `IDLE` | Idle Animation | EditorID, AnimationFile |
| Scripts (on parent) | Papyrus Script | Added as Scripts[] array in parent record's Fields: Name, Source (.psc), Properties[] |

### Required Lore Fields

Holotape, terminal, and note text must be written in full inside the record's `Fields` block — not summarized, not referenced elsewhere. The AI writes the actual in-universe text.

**Holotape (`BOOK`) example:**

```json
{
  "Signature": "BOOK",
  "EditorID": "MI_Holotape_F4AI",
  "FormID": "[GENERATE]",
  "Fields": {
    "FullName": "Mossy Industries — F4AI Unit",
    "Description": "Holotape containing a portable MYCEL-derived intelligence.",
    "Text": [
      "MOSSY INDUSTRIES — FIELD UNIT F4AI",
      "Adaptive Intelligence System, Portable Substrate Series",
      "If you are reading this, you found one of ours."
    ]
  }
}
```

- `FullName` — the player-visible item name shown in the Pip-Boy.
- `Description` — the Pip-Boy item description (shown in inventory detail view).
- `Text` — array of strings, one per line. Write the complete holotape transcript here. Must be lore-consistent with Mossy Industries canon. Do not reference the canonical F4AI holotape text unless this IS the F4AI holotape.

### Script Output Format

FO4 does not use standalone `SCPT` records. Papyrus scripts attach to their parent record (quest, NPC, activator, etc.) as a `"Scripts"` array inside that record's `"Fields"`. The compiled `.pex` and its `VMAD` (Virtual Machine Adapter Data) live on the parent record in xEdit.

**Script attached to a QUST record:**

```json
{
  "Signature": "QUST",
  "EditorID": "MI_Quest_FieldRecorder",
  "FormID": "[GENERATE]",
  "Fields": {
    "DNAM": { "Flags": ["StartGameEnabled"] },
    "Stages": [ ... ],
    "Scripts": [
      {
        "Name": "MI_Script_FieldRecorder",
        "Source": "Scriptname MI_Script_FieldRecorder extends Quest\n\nEvent OnInit()\n    SetStage(10)\nEndEvent",
        "Properties": [
          { "Name": "PlayerRef", "Type": "Actor", "Value": "PlayerRef" }
        ]
      }
    ]
  }
}
```

- `Scripts` array goes inside the **parent record's** `Fields` — QUST, NPC_, REFR, CELL, etc.
- `Name` — the script EditorID (matches the `.psc` filename exactly).
- `Source` — full compilable Papyrus source as an escaped string (`\n` for newlines, 4-space indent). Must compile without errors in the Papyrus compiler.
- `Properties` — each entry: `{ "Name": "<PropertyName>", "Type": "<Actor|Quest|ObjectReference|Int|Float|Bool|String>", "Value": "<EditorID or literal>" }`.
- Quest fragment scripts use `OnStageSet(int auiStageID, int auiItemID)` — not `OnInit`.
- One script object per script file. Multiple scripts on one record = multiple entries in the `Scripts` array.

### Conditions Format

All condition blocks must use this structure:

```json
{ "Function": "GetStage", "Quest": "MI_Quest_F4AIHelp", "Value": 20, "Operator": "==" }
```

Real condition functions only: `GetStage`, `GetStageDone`, `GetIsID`, `GetActorValue`, `GetItemCount`, `IsInCombat`, `HasPerk`, `GetDistance`, etc.

### Script Property Blocks

When a record has attached Papyrus scripts, include a `Scripts` array:

```json
"Scripts": [
  {
    "Name": "MI_F4AI_QuestScript",
    "Properties": [
      { "Name": "QuestRef", "Type": "Quest", "Value": "MI_Quest_F4AIHelp" },
      { "Name": "HolotapeRef", "Type": "ObjectReference", "Value": "MI_HolotapeRef01" }
    ]
  }
]
```

### Marker Definitions

Three markers are used in xEdit JSON. No others are permitted.

| Marker | Used In | Meaning |
| ------ | ------- | ------- |
| `"[GENERATE]"` | `FormID` field only | xEdit assigns the real FormID on import. Never use for any other field. |
| `"[WRITE]"` | Any content field | The AI MUST replace this with actual content before the JSON is complete. A `[WRITE]` left in the final output is an automatic fail. |
| `"[VERIFY]"` | Any field with uncertain data | Value is unconfirmed — modder must resolve in xEdit or CK before importing. |

### Canonical Template

Every mod starts from this template. The agent fills every `"[WRITE]"` field with real, lore-consistent, Mossy-compliant content. No `"[WRITE]"` may remain in the final output.

```json
{
  "Plugin": "MI_ModName.esl",
  "Records": [
    {
      "Signature": "QUST",
      "EditorID": "MI_Quest_ModName",
      "FormID": "[GENERATE]",
      "Fields": {
        "DNAM": { "Flags": ["StartGameEnabled"] },
        "Stages": [
          { "Index": 10, "LogEntry": "[WRITE]" },
          { "Index": 20, "LogEntry": "[WRITE]" },
          { "Index": 30, "LogEntry": "[WRITE]" },
          { "Index": 40, "LogEntry": "[WRITE]" },
          { "Index": 50, "LogEntry": "[WRITE]" }
        ]
      }
    },

    {
      "Signature": "NPC_",
      "EditorID": "MI_NPC_01",
      "FormID": "[GENERATE]",
      "Fields": {
        "Race": "HumanRace",
        "VoiceType": "[WRITE]",
        "AIData": { "AggroRadius": 0 },
        "Factions": []
      }
    },

    {
      "Signature": "NPC_",
      "EditorID": "MI_NPC_02",
      "FormID": "[GENERATE]",
      "Fields": {
        "Race": "HumanRace",
        "VoiceType": "[WRITE]",
        "AIData": { "AggroRadius": 0 },
        "Factions": []
      }
    },

    {
      "Signature": "DIAL",
      "EditorID": "MI_Topic_01",
      "FormID": "[GENERATE]",
      "Fields": {
        "Category": "Custom",
        "Subtype": "Topic"
      }
    },

    {
      "Signature": "INFO",
      "EditorID": "MI_Topic_01_Greeting",
      "FormID": "[GENERATE]",
      "Fields": {
        "Topic": "MI_Topic_01",
        "ResponseText": "[WRITE]",
        "Conditions": []
      }
    },

    {
      "Signature": "INFO",
      "EditorID": "MI_Topic_01_StageGate",
      "FormID": "[GENERATE]",
      "Fields": {
        "Topic": "MI_Topic_01",
        "ResponseText": "[WRITE]",
        "Conditions": [
          { "Function": "GetStage", "Quest": "MI_Quest_ModName", "Value": "[WRITE]" }
        ]
      }
    },

    {
      "Signature": "BOOK",
      "EditorID": "MI_Holotape_ModName",
      "FormID": "[GENERATE]",
      "Fields": {
        "FullName": "[WRITE]",
        "Description": "[WRITE]",
        "Text": ["[WRITE]"]
      }
    },

    {
      "Signature": "TERM",
      "EditorID": "MI_Terminal_ModName",
      "FormID": "[GENERATE]",
      "Fields": {
        "Header": "[WRITE]",
        "Entries": [
          {
            "Title": "[WRITE]",
            "Text": "[WRITE]"
          }
        ]
      }
    },

    {
      "Signature": "BOOK",
      "EditorID": "MI_Note_ModName",
      "FormID": "[GENERATE]",
      "Fields": {
        "Flags": ["IsNote"],
        "Text": "[WRITE]"
      }
    },

    {
      "Signature": "CELL",
      "EditorID": "MI_Cell_ModName",
      "FormID": "[GENERATE]",
      "Fields": {
        "Name": "[WRITE]",
        "Location": "[WRITE]",
        "Scripts": [
          {
            "Name": "MI_Script_ModName",
            "Source": "[WRITE PAPYRUS]",
            "Properties": []
          }
        ]
      }
    }
  ]
}

Note: Scripts attach to whichever record owns them (QUST, NPC_, CELL, REFR, etc.) as a `"Scripts"` array inside that record's `"Fields"`. There is no standalone script record in FO4.
```

### No Placeholders Rule

If any value is unknown or unverified, use exactly:

```json
"[VERIFY]"
```

- `"[VERIFY]"` is the only acceptable unknown marker. No `"TBD"`, no `"TODO"`, no `"placeholder"`, no invented values.
- A `"[VERIFY]"` in the JSON flags the modder to resolve that value in xEdit or CK before importing.
- `"[GENERATE]"` is reserved exclusively for `FormID` — it means xEdit assigns the real ID on import. Do not use `"[GENERATE]"` for any other field.
- The Verifier will flag any field containing vague text, descriptions, or guessed data as a fail.
- Never invent FormIDs, EditorIDs, or record structures. If it can't be verified, it gets `"[VERIFY]"`.

---

## APPENDIX — Complete Reference Mod: "The Mossy Field Recorder"

This is a fully-compliant example mod in xEdit JSON format. Use it to validate agent output against.  
File: [MI_FieldRecorder_TestMod.json](MI_FieldRecorder_TestMod.json)

Complies with all rules:

- 1 QUST, 5 stages, 1 NPC_, 1 DIAL, 2 INFO, 1 BOOK, 1 TERM, 1 NOTE, 1 CELL, 1 SCPT
- ESL-friendly plugin (`MI_FieldRecorder.esl`)
- No custom assets
- All `[GENERATE]` FormIDs — no hex values
- No `[WRITE]` remaining — all content fields are complete
- Mossy Industries lore: GRAFT reference, field researcher, organic terminology
- Holotape text consistent with Mossy canon
- Terminal entry drives a quest objective (`GRAFT observation chamber`)
- Note is lore-atmospheric and consistent with Mossy aesthetic
- Papyrus script uses `extends Quest` and `OnInit()` to set stage 10 on load

### Final Output Rule (Rule 8)

The final output of the Build phase is a **single JSON block and nothing else.**

- No commentary before or after the JSON.
- No explanation of what the records do.
- No prose summaries.
- No markdown outside the fenced code block.
- Only the JSON.

The modder reads the JSON. The modder does not need the AI to explain it.

### Output Rules

- The JSON block is always the final output of any Build phase turn.
- It must be a valid, parseable JSON object — no trailing commas, no comments inside the JSON.
- All EditorIDs in the JSON must match exactly what appears in the section tables — no drift.
- All cross-references between records use the EditorID of a record that also exists in the same JSON output or is a real vanilla EditorID.
- `"FormID": "[GENERATE]"` is reserved for new record FormIDs only. `"[VERIFY]"` is for all other unknown values. No other placeholders.
- Never invent FormIDs, EditorIDs, or record structures that cannot be verified against real FO4 data.
