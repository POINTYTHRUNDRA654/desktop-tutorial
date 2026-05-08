# Armor & Clothing Pipeline Guide — Fallout 4 (2026)

This guide covers the complete pipeline for creating wearable armor and clothing: ARMO/ARMA record structure, biped slot matrix, keyword layering, BodySlide integration, and mod packaging.

---

## 1. Core Records

| Record | Purpose |
|---|---|
| **ARMO** | The wearable item — displayed name, value, weight, enchantments, biped slot list |
| **ARMA** (Armor Addon) | The actual mesh attachment — NIF paths per body gender/race, biped slot, shader properties |
| **KYWD** | Keywords — armor type (Armor_Body, Armor_Arm_Left, etc.), crafting, perk conditions |
| **COBJ** | Crafting recipe — materials required at workbench |
| **ENCH** | Enchantment — magical effect applied to the armor |

An **ARMO** record is the inventory item. It can reference multiple **ARMA** records — one per mesh component. For example, a full suit might have separate ARMA records for chest, left arm, right arm, left leg, right leg.

---

## 2. Biped Object Slot Matrix

Each piece of armor occupies one or more biped slots. Slots 30–61 are the usable range:

| Slot # | Name | Used for |
|---|---|---|
| 30 | Head | Helmets, hats |
| 31 | Hair | Hair meshes (usually HDPT, not armor) |
| 32 | Body | Chest/torso armor |
| 33 | Left Hand | Left gauntlet |
| 34 | Right Hand | Right gauntlet |
| 35 | [Ring] | (Unused vanilla — available for mods) |
| 36 | [Amulet] | (Unused vanilla — necklace mods use this) |
| 37 | Back | Backpacks, jetpacks |
| 38 | Misc | Assorted accessories |
| 39 | [Unkown] | Rarely used |
| 40 | Decals | Body decals (tattoos, dirt) |
| 41 | Left Leg | Lower left leg |
| 42 | Right Leg | Lower right leg |
| 43 | Left Thigh | Upper left leg |
| 44 | Right Thigh | Upper right leg |
| 45 | Pelvis | Pelvis/groin |
| 46 | [Weapon Slot] | Holster meshes |
| 47 | [Ear] | Earrings, headphones |
| 48–61 | Custom | Reserved for mod-added slots |

### Slot Assignment Rules

- **One ARMO can occupy multiple slots** — a full vault suit occupies slots 32 (body), 38, 41, 42, 43, 44, 45
- **Two ARMOs cannot share any slot** — equipping a new item unequips the conflicting one
- **Power Armor** uses its own separate race and biped slots and does not conflict with regular armor

---

## 3. ARMO Record — Key Fields

Open any vanilla armor in xEdit:

### BOD2 (Biped Body Template)
Contains the biped slot bitmask. Each bit = one slot number. Example:
- Slot 32 only = `0x00000004`
- Slots 32+37 = `0x00000084` (body + back)

In xEdit's BOD2 editor, you check boxes rather than entering hex directly.

### KWDA (Keywords)
Essential keywords to assign:

| Keyword | Purpose |
|---|---|
| `ArmorTypeLight` / `ArmorTypeHeavy` | Determines which perk applies (Local Leader, etc.) |
| `ArmorTypePower` | Power armor — use Power Armor perk set |
| `WorkbenchWeapons` | Do NOT use for armor |
| `WorkbenchArmor` | Makes this armor modifiable at the Armor Workbench |
| `Armor_Body` / `Armor_Arm_Left` | Slot-type identifiers used by some mods and conditions |
| `VaultSuit` | Used by Vault-Tec Rep rewards, quests, etc. |

### RNAM (Race)
Which race can wear this armor. Usually `HumanRace`. Must match the ARMA records.

### MODL (World Model)
The NIF path for the dropped/on-ground model.

---

## 4. ARMA Record — Armor Addon

The ARMA record defines the actual wearable mesh. An ARMO can reference multiple ARMAs.

### Key ARMA Fields

| Field | Description |
|---|---|
| **BOD2** | Biped slot bitmask — must match the ARMO's slots |
| **MODL** | Male world model NIF (on ground) |
| **MOD2** | Male 1st person NIF |
| **MOD3** | Female world model NIF |
| **MOD4** | Female 1st person NIF |
| **RNAM** | Race this ARMA applies to (usually HumanRace) |
| **DNAM** | Priority — higher priority ARMAs render on top |
| **SNAMx** | Additional races (e.g., GhoulRace, SuperMutantRace) |

### NIF Structure for Armor

```
ArmorAddon/
├── BSFadeNode (root)
│   ├── NiNode "Armor"
│   │   ├── BSTriShape "Body_Mesh"   ← weighted to body skeleton
│   │   └── BSLightingShaderProperty
│   │       ├── BSShaderTextureSet
│   │       │   ├── [0] Diffuse: textures\armor\yourarmor\d.dds
│   │       │   ├── [1] Normal: textures\armor\yourarmor\n.dds
│   │       │   └── [7] Specular: textures\armor\yourarmor\s.dds
│   │       └── Shader flags: SLSF1_CAST_SHADOWS, SLSF2_ZBUFFER_WRITE
│   └── bhkCollisionObject (optional for stiff pieces)
```

### Shader Type for Armor

- Regular armor: Shader Type = `Default` (type 1) with environment map flag for metal pieces
- Smooth/cloth: Shader Type = `Default`, no env map
- Glowing armor: Add `SLSF1_EXTERNAL_EMITTANCE` flag and set emittance multiplier

---

## 5. BodySlide Integration

BodySlide lets users fit your armor to their custom body shape. To support it, you must provide **BodySlide sliders**.

### Workflow Overview

1. In Blender, model your armor over the CBBE/Fusion Girl reference body
2. Export base shape `.nif` (as shipped) and a high-weight morph `.nif`
3. Use BodySlide's **Outfit Studio** to define slider morphs:
   - Import your `.nif` as a new outfit
   - Use the reference body's sliders to conform your mesh
   - Build a `SliderSet` XML file + `OSP` file
4. Package the BodySlide project files under `CalienteTools\BodySlide\SliderSets\` and `ShapeData\YourArmor\`
5. Users run BodySlide → select your armor → Build to generate the fitted `.nif`

### Required Files per Armor Piece

```
CalienteTools\BodySlide\
├── SliderSets\YourArmor.osp           ← slider definition (Outfit Studio project)
└── ShapeData\YourArmor\
    ├── YourArmor.nif                  ← low-weight base
    └── YourArmor_1.nif                ← high-weight morph
```

See `BODYSLIDE_COMPLETE_GUIDE.md` and `BODYSLIDE_REFERENCE_COMPLETE.md` for the full pipeline.

---

## 6. Crafting Recipes (COBJ)

To make armor craftable at the Armor Workbench:

```
COBJ record:
  CNAM = [Leather×5, Steel×3, Adhesive×2]  ← materials
  BNAM = WorkbenchArmor                     ← workbench keyword
  YNAM = YourArmorItem                      ← output item
  INTV = 1                                  ← quantity
  Conditions: GetActorValue(Armorer) >= 1   ← perk gate (optional)
```

---

## 7. Armor Mods (OMODs) for Armor

Armor also supports OMODs for linings, bracings, and material upgrades:

| Slot keyword | Description |
|---|---|
| `ArmorModLining` | Ballistic weave / linings |
| `ArmorModBracing` | Mechanical arm bracings |
| `ArmorModMaterial` | Leather/metal/shadowed/other material upgrade |
| `ArmorModMisc` | Miscellaneous — headlamp, pocketed, padded |

The ARMO record → `KWDA` must include the mod slot keyword to enable it at the workbench. OMOD DATA properties work identically to weapon OMODs — add/remove DR, ER, radiation resist, weight, etc.

---

## 8. Power Armor Specifics

Power armor is fundamentally different:
- Uses **PowerArmorRace** not HumanRace
- Each power armor frame part is a ARMO attached to the frame NPC_ via FLST
- PA pieces reference `PowerArmorModObject` OMOD system for modifications
- PA-specific keywords: `ArmorTypePower`, `pa_BodyPart_Torso`, `pa_BodyPart_LLeg`, etc.
- **Do not mix** regular armor biped slots with PA slots — they are completely separate systems

---

## 9. LOD and Performance

Armor has no separate LOD system (unlike plants/trees). However:
- **Keep polygon count reasonable**: player-visible close-up = max 15K polys per piece; background NPC armor = max 5K
- **Use precombines for placed armor references** — if you place armor as world decorations (hanging, on mannequins), regenerate precombines
- **Texture streaming**: ensure all armor textures are in BA2, not loose — loose textures bypass VRAM streaming

---

## 10. Checklist

- [ ] ARMO record: biped slot bitmask set correctly
- [ ] ARMO record: `ArmorTypeLight` / `ArmorTypeHeavy` keyword assigned
- [ ] ARMO record: `WorkbenchArmor` keyword assigned if moddable
- [ ] ARMA records: biped slots match ARMO
- [ ] ARMA records: male + female NIF paths set (both 3rd and 1st person)
- [ ] ARMA record: race = HumanRace (+ any additional races in SNAMx)
- [ ] NIF: mesh weighted to skeleton bones correctly
- [ ] NIF: BSLightingShaderProperty with correct shader type and texture paths
- [ ] BodySlide SliderSet packaged for user customization
- [ ] COBJ crafting recipe with material list and workbench keyword
- [ ] OMOD records for material upgrades if applicable
- [ ] Textures in BA2 archive (not loose)

*Last updated: May 2026.*
