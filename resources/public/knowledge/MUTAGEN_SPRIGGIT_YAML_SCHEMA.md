# Mutagen & Spriggit YAML Schema Reference

Mossy uses Spriggit (built on **Mutagen.Bethesda.Serialization**) to convert vanilla Fallout 4 ESMs into YAML files that are ingested into the Knowledge Vault during onboarding. This document explains how that YAML is structured so Mossy can reason about it accurately.

**GitHub repos:**
- Mutagen: <https://github.com/Mutagen-Modding/Mutagen>
- Serialization library: <https://github.com/Mutagen-Modding/Mutagen.Bethesda.Serialization>
- Spriggit: <https://github.com/Mutagen-Modding/Spriggit>

---

## What is Mutagen?

Mutagen is a C# library by Noggog that models every Bethesda game record type as a strongly-typed .NET object. Spriggit is built on top of Mutagen — Mutagen handles binary parsing; Spriggit serializes the resulting objects to YAML/JSON via C# Source Generators.

The Source Generator approach means the serialization code is generated at compile time from Mutagen's type definitions, so the YAML schema is always a direct reflection of Mutagen's record model.

---

## Root File Layout

Spriggit outputs one folder per plugin. Inside each folder:

```
Fallout4/
  RecordData.yaml          # Plugin header (author, masters, version)
  NPC_/
    000B2930.yaml          # One file per NPC record
    NPCHumanMaleAverage.yaml
  KYWD/
    00045374.yaml          # ActorTypeHuman keyword
  GLOB/
    0000031C.yaml          # PlayerKarma global variable
  COBJ/
    00069090.yaml          # .45 Auto ammo recipe
  QUST/
    000AEFB9.yaml          # MQ101 — War Never Changes
  CELL/
    0001851C.yaml          # SanctuaryHillsHouse01
  WEAP/
  LVLI/                    # Leveled item lists
  LVLN/                    # Leveled NPC lists
  PERK/
  RACE/
  ...
```

Files are named by EditorID when available, otherwise by FormID hex.

---

## FormKey Format

All cross-record references in Spriggit YAML use the `FormKey` format:

```
{8-digit-hex}:{PluginFilename}
```

Examples:
- `000B2930:Fallout4.esm` — vanilla base-game record
- `00000000:MyMod.esp` — new record in a custom plugin
- `001234AB:DLCCoast.esm` — Far Harbor record

---

## Record Type Examples

### Plugin Header (`RecordData.yaml`)

```yaml
FormVersion: 131
Version: 0.95
Author: ""
Description: ""
MasterReferences:
  - Master: Fallout4.esm
```

### NPC_ (Actor)

```yaml
EditorID: NPCHumanMaleAverage
FormKey: 000B2930:Fallout4.esm
Name: "Human Male"
Race: 000013746:Fallout4.esm
Class: 000BE11B:Fallout4.esm
Factions:
  - Faction: 0001B2A4:Fallout4.esm
    Rank: 0
Stats:
  Level: 1
  Health: 100
AIPackages:
  - 00044B3B:Fallout4.esm
Keywords:
  - 00045374:Fallout4.esm   # ActorTypeHuman
```

### KYWD (Keyword)

```yaml
EditorID: ActorTypeHuman
FormKey: 00045374:Fallout4.esm
```

### GLOB (Global Variable)

```yaml
EditorID: PlayerKarma
FormKey: 0000031C:Fallout4.esm
Type: Float
Value: 0.0
```

### COBJ (Crafting Recipe)

```yaml
EditorID: RecipeAmmo45Auto
FormKey: 00069090:Fallout4.esm
CreatedObject: 0004CE87:Fallout4.esm
CreatedObjectCount: 10
WorkbenchKeyword: 00105F18:Fallout4.esm   # WorkbenchChemstation
Items:
  - Item: 001BF72E:Fallout4.esm           # Lead
    Count: 5
  - Item: 000AEC5D:Fallout4.esm           # Oil
    Count: 2
Conditions:
  - Function: HasPerk
    Parameter1: 0004A0CF:Fallout4.esm     # Scrapper
    CompareOperator: EqualTo
    Value: 1.0
```

### QUST (Quest)

```yaml
EditorID: MQ101
FormKey: 000AEFB9:Fallout4.esm
Name: "War Never Changes"
Flags: StartGameEnabled
Stages:
  - Index: 10
    LogEntries:
      - Flags: CompleteQuest
        Entry: "This stage completes the quest."
Aliases:
  - ID: 0
    Name: "Player"
    Flags: Player
```

### CELL (Interior Cell)

```yaml
EditorID: SanctuaryHillsHouse01
FormKey: 0001851C:Fallout4.esm
Flags: IsInteriorCell
Lighting:
  AmbientColor: "FF202020"
ImageSpace: 000B4FB2:Fallout4.esm
```

### LVLI (Leveled Item List)

```yaml
EditorID: LvlAmmoMissile
FormKey: 000CE962:Fallout4.esm
Flags: CalculateForEachItemInCount
ChanceNone: 0
Entries:
  - Level: 1
    Reference: 000CAB3A:Fallout4.esm    # AmmoMissile
    Count: 1
  - Level: 5
    Reference: 0004CE87:Fallout4.esm
    Count: 1
```

### PERK

```yaml
EditorID: Scrapper
FormKey: 0004A0CF:Fallout4.esm
Name: "Scrapper"
Description: "Junk items yield uncommon components like screws, aluminum, and copper."
Ranks:
  - Rank: 1
    Description: "Rank 1 description."
    Effects:
      - Effect: 000F69E3:Fallout4.esm
        Priority: 0
```

---

## How Mossy Uses This Data

During the onboarding Spriggit digest (vanillaOnly mode), Mossy ingests the above YAML into the Knowledge Vault tagged `vanilla-base-records`. When a user asks about:

- A specific base-game FormID → Mossy can look it up by EditorID
- How a vanilla recipe is structured → Mossy can reference the actual COBJ YAML
- What keywords an NPC has → Mossy can read the KYWD links from the NPC_ file
- How a quest is scripted → Mossy can read Stages/Aliases from QUST YAML

Custom mods queued in The Auditor are analysed separately for issues (deleted navmesh, broken precombines, missing masters, etc.) — that is a different workflow from the vanilla knowledge ingestion.

---

## Tips for Reading Spriggit Output

1. **FormKey links are references** — follow them across files to understand dependencies
2. **Folder path = record type**: `NPC_/NPCHumanMaleAverage.yaml` → NPC_ record
3. **Missing fields = game defaults** — Spriggit omits fields that match the default value
4. **`Conditions:` arrays** define trigger logic — read `Function + Parameter1 + Value`
5. **`Flags:` fields** are flag enums — multiple flags can be comma-separated
6. **EditorID is the human name** — FormKey is the permanent unique identifier
