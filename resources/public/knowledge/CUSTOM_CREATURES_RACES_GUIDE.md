# Custom Creatures & Races — Complete Modding Guide for Fallout 4 (2026)

Creating custom creatures, animals, or entirely new races is one of the most technically demanding mod types — it touches nearly every system: meshes, animations, AI, combat styles, leveled lists, and Papyrus scripting. This guide covers the full pipeline from CK record structure to in-game integration.

---

## Part 1: Understanding Races in Fallout 4

Every NPC and creature in Fallout 4 uses a **Race** record (`RACE`). The race defines:
- Which skeleton (`.hkx`) the creature uses
- Body mesh paths (biped object slots)
- Default movement and combat animations
- Attribute modifiers (base health, speed, size scale)
- Skin materials and impact data
- AI behavior flags

### Vanilla Race Examples

| Race | EditorID | Notes |
|---|---|---|
| Human (standard) | `HumanRace` | Player character, most NPCs |
| Ghoul | `GhoulRace` | Feral + non-feral ghouls |
| Deathclaw | `DeathclawRace` | Bipedal predator |
| Dog/Dogmeat | `DogRace` | Quadruped; custom bone structure |
| Radscorpion | `RadscorpionRace` | Arthropod skeleton with 6-leg HKX |
| Vertibird | `VertibirdRace` | Vehicle-as-race (flying) |
| Eyebot | `EyebotRace` | Floating spherical; special physics |
| Super Mutant | `SuperMutantRace` | Large biped; own animation set |

---

## Part 2: Creating a New Race Record

### Step 1: Open CK and Duplicate a Base Race

Never create a race from scratch — duplicate the closest vanilla race:
1. Open Creation Kit → load `Fallout4.esm`.
2. In Object Window → Characters → Race.
3. Right-click the closest match → **Duplicate**.
4. Rename the duplicate with your prefix: `MM_NewCreatureRace`.

### Step 2: Race Tab Configuration

#### Data Tab

| Field | Description |
|---|---|
| `EditorID` | Your race's unique identifier |
| `Name` | Display name (shown in kill notifications) |
| `Flags` | Key flags: `Playable` (if a player race), `Child`, `Beast Race` |
| `Starting Health` | Base HP before NPC_level scaling |
| `Size` | S/M/L/XL — controls hit detection zones |
| `Default Disposition` | How the race is treated by faction AI |
| `Skin` | `ARMO` record — the "armor" that is the body mesh |

#### Stats Tab

- **Attributes**: Base SPECIAL values (not usually set directly on Race — use NPC_ records for variance).
- **Movement**: Walk/run/sprint speeds, rotation rates.
- **Attack Data**: Melee reach, attack radius.
- **Weight/Size Scale**: Affects collision and animation.

#### Body Data Tab

Biped object entries — which NIF paths load for which body parts. Critical:
- Each body part entry maps a **biped slot** to a **ARMO/ARMA record**.
- For non-humanoid creatures, most "armor" slots are empty — the creature's skin is assigned directly.

#### Attack Data Tab

Lists all attacks the race can perform. Each entry references an `Attack` sub-record:
- `Attack Type`: melee left/right, power, ranged projectile
- `Attack Event`: animation graph event name that triggers the attack
- `Attack Spell/Projectile`: what damage/effect the attack applies

#### Movement Types Tab

Links to `MOVT` records that control AI pathfinding behavior (walking pace, swimming capability, flight, etc.).

---

## Part 3: Creating the NPC Record

Once the race exists, NPCs using it are `NPC_` records:

1. Object Window → Characters → Non-Player Character (NPC).
2. Duplicate a similar vanilla NPC or create new.
3. Set `Race` to your new race record.
4. Set `AI Packages` — what the NPC does when idle/combat/fleeing.
5. Set `Factions` — which faction the creature belongs to.
6. Set `Combat Style` — how it fights (see Part 7).
7. Adjust stats: `Health`, `Level`, `Confidence`, `Aggression`.

### NPC Flags to Check

| Flag | Effect |
|---|---|
| `Is Unique` | One-of-a-kind; will have a specific name |
| `No Low Level Processing` | Disables AI when player is far away |
| `Essential` | Cannot die; falls to bleedout instead |
| `Protected` | Can only be killed by the player |
| `Summonable` | Can be summoned via spell |
| `Ghost` | Takes no physical damage |
| `Invulnerable` | Takes no damage of any kind |

---

## Part 4: Skeleton & Animation Requirements

### Skeleton Selection

Every creature needs an `.hkx` skeleton file. Use the closest vanilla skeleton:

| Skeleton path | For |
|---|---|
| `Actors\Character\CharacterAssets\skeleton.hkx` | Humanoid biped |
| `Actors\Dog\Character Assets\skeleton.hkx` | Quadruped (dog) |
| `Actors\Deathclaw\Character Assets\skeleton.hkx` | Large biped |
| `Actors\Radscorpion\Character Assets\skeleton.hkx` | Multi-legged arthropod |
| `Actors\Eyebot\Character Assets\skeleton.hkx` | Floating sphere |

#### Custom Skeleton (Advanced)

For truly novel creatures, create a custom skeleton in Blender using the Blender FO4 rig tools:
1. Model the creature mesh.
2. Rig it with a custom armature — bone names can be arbitrary but must match your HKX.
3. Export the skeleton as HKX using **HavokBehaviorTool** or **Outfit Studio** skeleton export.
4. The mesh must be exported as NIF with skinning data pointing to the custom skeleton bones.

See `HAVOK_ANIMATION_GUIDE.md` for the full Havok pipeline.

### Animation Graph (BehaviorGraph)

The creature's behavior graph (`.hkx` in `Actors\[Race]\Behaviors\`) controls which animations play in which states. For simple creatures:
- Duplicate the closest vanilla behavior graph folder.
- Replace individual animation files (`.hkx` clips) with your custom animations.
- The state machine transitions (idle → alert → combat → fleeing) are defined in the graph — if you don't change the graph, vanilla transitions apply.

For complex creatures with new attack patterns, editing the behavior graph requires **HavokBehaviorTool** — a specialized Havok SDK tool.

---

## Part 5: Creature Mesh & Texture Setup

### NIF File Requirements

Creature NIFs follow the same rules as character NIFs but typically use a **single skin** NIF rather than layered armor pieces:

1. **Root node**: `BSFadeNode` named the same as the file.
2. **Skeleton binding**: `NiSkinInstance` or `BSSkinBone` nodes binding mesh to skeleton.
3. **Body partition**: Use `DISMEMBERMENT_BODY_PART_TYPE` based on your creature's hitzone layout:
   - Humanoid: Head (0), Upper Body (1), Lower Body (2), Left Arm (3), Right Arm (4), Left Leg (5), Right Leg (6)
   - Custom creatures: map to appropriate body regions.
4. **Shader**: `BSLightingShaderProperty` — use shader type matching your material needs.

### Body Part Data Record (BPTD)

The `BPTD` record maps ragdoll hit detection to mesh body parts. Create a new BPTD duplicated from a similar vanilla creature:
- Each entry in BPTD = one body part (head, torso, limb, etc.)
- Each part has: `Damage Multiplier`, `Explodable` flag, `On Cripple Spell`
- Link the BPTD to your Race record.

### Collision

Creature collision (for physics interactions) is defined in the NIF via `bhkCollisionObject` nodes. For complex creatures, use **NifSkope** or **Blender** with the HavokCollision plugin to define convex hull or capsule colliders around each limb.

---

## Part 6: Skin & Material Setup

A creature's skin is technically an `ARMO`/`ARMA` pair (just like human armor):

1. Create an `ARMO` record — the "Skin" item.
2. Create one or more `ARMA` records — the actual NIF paths per body slot.
3. Assign the `ARMO` to the Race's **Skin** field.
4. The ARMA references your creature's `.nif` file.

### Material File (BGSM)

Create a `.bgsm` material file for each texture set:
- Place in `Data\Materials\Actors\[YourCreature]\`.
- Set `Diffuse`, `Normal`, `Specular` texture paths.
- For Community Shaders PBR: set R=metalness, G=roughness inverse, B=SSS mask in `_s.dds`.
- Enable `bSubsurfaceLighting` for organic creatures (skin, flesh).

---

## Part 7: AI Behavior & Combat Style

### AI Packages

AI packages define what the creature does when not in combat:
- `PackagePatrolLinked` — patrol between linked markers.
- `PackageSandbox` — wander within a radius.
- `PackageGuardLocation` — stay near a reference.
- `PackageWander` — move randomly.

Assign packages to the NPC's AI Package list. The AI picks the highest-priority valid package.

### Combat Style

The `CSTY` (Combat Style) record defines how the creature fights:

| Field | Effect |
|---|---|
| `Dodging` | % chance to dodge attacks |
| `Melee Alert Distance` | How close player must be for melee to trigger |
| `Flee Health Percentage` | Run away when below this HP % |
| `Ranged Combat Flags` | Whether creature uses ranged attacks |
| `Hold Fire Height` | For flying creatures: min height to use ranged |

Create a new CSTY by duplicating the closest vanilla combat style (e.g., `csDeathclawCombat`, `csDogCombat`).

### Faction Assignment

- Assign the creature to a `FACT` (faction) record.
- The faction controls whether creatures of the same faction fight each other.
- Most hostile creatures use `EncRaiderFaction` or `CreatureFaction` — a creature in `CreatureFaction` will fight everything not also in `CreatureFaction`.
- Create a new faction for your custom creatures if they need unique allegiance behavior.

---

## Part 8: Leveled List Integration

Add your creature to the game world via Leveled NPC lists:

1. In CK/xEdit: find an appropriate `LVLN` (Leveled NPC) list (e.g., `LvlDeathclaw`, `LvlRadscorpionCommon`).
2. Add your NPC record to the list at an appropriate level threshold.
3. **Alternatively**, use **RobCo Patcher** to inject into leveled lists at runtime without a plugin:
   ```ini
   [ModifyLvln]
   Signature=LVLN
   EditorID=LvlDeathclaw
   AddEntry=MM_CustomCreature,10,1   ; NPC EditorID, min level, count
   ```
4. For world-space spawning: place your creature directly in cells using the CK render window, or via `PlaceActorAtMe` in a Papyrus script.

---

## Part 9: Custom Playable Races

For mods that add a new playable race (e.g., synth player, feral ghoul roleplaying, custom mutant):

### Additional Requirements

1. Set the `Playable` flag on the Race record.
2. Create **Head Part** (`HDPT`) records for the custom appearance (head, eyes, hair).
3. Set up **FaceGen data** — morphs and texture sets for character creation.
4. Add the race to the **Character Creation** selection list:
   - In the `CharGen` quest (or equivalent), add the race to the available options.
   - This requires scripting with Papyrus to intercept the character creation flow.

### LooksMenu Integration

For playable custom races, integrate with **LooksMenu** (F4SE required):
- Register your race with LooksMenu's API so it appears in character customization.
- Provide `HEAD` NIF with correct bone structure for in-game facial sculpting.
- Register custom overlay slots for body tattoos/markings.

---

## Part 10: Papyrus Scripting for Creatures

Common creature-scripting patterns:

### Custom On-Death Drop

```papyrus
Scriptname MM_CustomCreatureDeath extends Actor

Event OnDeath(Actor akKiller)
    ; Drop a unique item on death
    ObjectReference kCorpse = self.PlaceAtMe(MM_UniqueDropForm, 1)
    Debug.Notification("Creature killed — unique item dropped")
EndEvent
```

### Spawning Reinforcements at Low Health

```papyrus
Scriptname MM_CreatureBoss extends Actor

Actor Property ReinforcementNPC Auto
Float Property CallHealthThreshold = 0.30 Auto  ; 30% HP triggers call

Bool bCalledReinforcements = false

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    If (!bCalledReinforcements)
        Float healthPct = self.GetActorValuePercentage(ActorValue.kHealth)
        If (healthPct < CallHealthThreshold)
            bCalledReinforcements = true
            self.PlaceAtMe(ReinforcementNPC, 3)
            Debug.Notification("Reinforcements called!")
        EndIf
    EndIf
EndEvent
```

### Flight Simulation (Eyebot-style)

```papyrus
Scriptname MM_FlyingCreature extends Actor

Float Property HoverHeight = 100.0 Auto  ; game units above ground
Float fCurrentHeight

Event OnUpdate()
    ; Simple hover script — adjust Z each update
    Float groundZ = self.GetPositionZ()
    If (Abs(groundZ - fCurrentHeight) > 5.0)
        self.SetPosition(self.GetPositionX(), self.GetPositionY(), fCurrentHeight + HoverHeight)
    EndIf
EndEvent

Event OnInit()
    fCurrentHeight = self.GetPositionZ()
    RegisterForUpdate(0.1)
EndEvent
```

---

## Part 11: Packaging & Compatibility

### BA2 Archive

Pack creature assets (meshes, textures, behaviors) into a BA2:
```
Archive2.exe -create -root:"Data\" -output:"Data\MM_Creatures - Main.ba2"
```

Include:
- `Meshes\Actors\MM_[Creature]\` — all NIF files
- `Textures\Actors\MM_[Creature]\` — all DDS files
- `Meshes\Actors\MM_[Creature]\Behaviors\` — HKX behavior graphs

### Compatibility Patches

Custom creatures commonly conflict with:
- **Encounter zone mods** — if the creature uses the same spawn zones
- **NPC overhauls** — if vanilla creatures share the same LVLN lists you modify
- Use xEdit to identify and resolve record conflicts.

### Testing Checklist

- [ ] Creature appears in the world (no invisible mesh)
- [ ] Creature moves correctly (no T-pose / floating)
- [ ] Attacks connect with correct hit detection
- [ ] Death ragdoll plays correctly
- [ ] Creature drops loot correctly
- [ ] No `NiOverflow` errors in Papyrus log
- [ ] No missing texture paths in CLASSIC crash log
- [ ] LOD is generated if the creature appears in exterior cells

---

*Last updated: May 2026. Tested against FO4 NG CK (1.10.982+) and F4SE 0.7.7.*
