# Fallout 4 Vanilla Records Reference

## Quick FormID & EditorID Lookup Guide

This guide provides instant reference for vanilla Fallout 4 records across the **base game and all DLCs**. Use this to quickly find FormIDs, understand record relationships, and avoid conflicts when modding.

---

## Table of Contents
1. [FormID Ranges](#formid-ranges)
2. [Weapons](#weapons)
3. [Armor & Clothing](#armor--clothing)
4. [Consumables](#consumables)
5. [Perks](#perks)
6. [Factions](#factions)
7. [Quests](#quests)
8. [Keywords](#keywords)
9. [Leveled Lists](#leveled-lists)
10. [DLC-Specific Records](#dlc-specific-records)

---

## FormID Ranges

Understanding FormID ranges helps you identify which plugin owns a record and avoid conflicts.

### Base Game
- **Fallout4.esm**: `00000000` - `00FFFFFF` (16,777,215 possible records)
  - Most vanilla content uses IDs in the `00000000` - `001FFFFF` range
  - High IDs (`00F00000`+) are often added in patches

### DLC Ranges
Each DLC has its own FormID space when loaded:

| DLC | ESM File | Typical Load Order | FormID Prefix (hex) |
|-----|----------|-------------------|---------------------|
| Automatron | DLCRobot.esm | 01 | `01xxxxxx` |
| Wasteland Workshop | DLCworkshop01.esm | 02 | `02xxxxxx` |
| Far Harbor | DLCCoast.esm | 03 | `03xxxxxx` |
| Contraptions Workshop | DLCworkshop02.esm | 04 | `04xxxxxx` |
| Vault-Tec Workshop | DLCworkshop03.esm | 05 | `05xxxxxx` |
| Nuka-World | DLCNukaWorld.esm | 06 | `06xxxxxx` |

**Note**: Load order can vary, so the prefix changes. Always reference by `FormID:PluginName` format (e.g., `01000F9E:DLCRobot.esm`).

### Creation Club Content (Anniversary Edition)
- CC items load as `.esl` masters
- Use ESL FormID format: `FExxxyyy` where `xxx` is ESL slot, `yyy` is record ID
- 150+ CC items bundled with 1.11.x Anniversary Edition
- Check `Data/` folder for `cc*.esl` files

---

## Weapons

### Ballistic Weapons (Base Game)

| Name | EditorID | FormID | Damage | Ammo Type | Weight | Value |
|------|----------|--------|--------|-----------|--------|-------|
| 10mm Pistol | 10mm | 0004F46A:Fallout4.esm | 18 | .45 ACP | 5.0 | 50 |
| Deliverer | DelivererUnique | 00225ABC:Fallout4.esm | 25 | 10mm | 3.0 | 119 |
| Pipe Pistol | PipePistol | 0004F678:Fallout4.esm | 13 | .38 | 3.5 | 28 |
| Pipe Revolver | PipeRevolver | 000DC8E7:Fallout4.esm | 20 | .45 | 4.5 | 32 |
| Combat Rifle | CombatRifle | 00060F76:Fallout4.esm | 30 | .45 | 13.1 | 144 |
| Assault Rifle | AssaultRifle | 000E5881:Fallout4.esm | 30 | 5.56mm | 13.1 | 144 |
| Hunting Rifle | HuntingRifle | 000E5882:Fallout4.esm | 37 | .308 | 8.6 | 99 |
| Laser Musket | LaserMusket | 0013E326:Fallout4.esm | 30 | Fusion Cell | 6.5 | 75 |
| Laser Gun | LaserGun | 000FF995:Fallout4.esm | 24 | Fusion Cell | 6.5 | 75 |
| Plasma Gun | PlasmaGun | 0010625F:Fallout4.esm | 24 | Plasma Cartridge | 7.5 | 150 |
| Institute Rifle | InstituteRifle | 000F9D18:Fallout4.esm | 30 | Fusion Cell | 6.5 | 75 |
| Gauss Rifle | GaussRifle | 0014831D:Fallout4.esm | 110 | 2mm EC | 10.9 | 500 |
| Minigun | Minigun | 001025AA:Fallout4.esm | 8 | 5mm | 27.7 | 1056 |
| Missile Launcher | MissileLauncher | 000E56D5:Fallout4.esm | 250 | Missile | 21.2 | 750 |
| Fat Man | FatMan | 000BD56F:Fallout4.esm | 468 | Mini Nuke | 30.3 | 1500 |
| Double-Barrel Shotgun | DoubleBarrelShotgun | 000E5881:Fallout4.esm | 110 | Shotgun Shell | 7.5 | 75 |
| Combat Shotgun | CombatShotgun | 0014831C:Fallout4.esm | 50 | Shotgun Shell | 10.4 | 144 |

### Energy Weapons (Base Game)

| Name | EditorID | FormID | Damage | Ammo Type | Notes |
|------|----------|--------|--------|-----------|-------|
| Laser Pistol | LaserPistol | 000FF995:Fallout4.esm | 24 | Fusion Cell | Modifiable to rifle |
| Plasma Pistol | PlasmaPistol | 0010625F:Fallout4.esm | 24 | Plasma Cartridge | Ballistic + energy damage |
| Gamma Gun | GammaGun | 00100AE9:Fallout4.esm | 110 | Gamma Round | Radiation damage |
| Cryolator | Cryolator | 00171B2B:Fallout4.esm | 20 | Cryo Cell | Freezing effect |
| Alien Blaster | AlienBlaster | 000FF9E5:Fallout4.esm | 50 | Fusion Cell | Unique weapon |

### DLC Weapons

#### Automatron (DLCRobot.esm)
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Robot Workbench | DLC01WorkbenchRobotWorkbench | 01000F9E:DLCRobot.esm | Build robot companions |
| Tesla Rifle | DLC01_TeslaRifle | 01001F65:DLCRobot.esm | Arc lightning weapon |
| Lightning Gun | DLC01_LightningGun | 01001F66:DLCRobot.esm | High-tech energy weapon |

#### Far Harbor (DLCCoast.esm)
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Harpoon Gun | DLC03HarpoonGun | 03006D9A:DLCCoast.esm | Underwater and land use |
| Radium Rifle | DLC03RadiumRifle | 03017B6C:DLCCoast.esm | Ballistic + radiation damage |
| Lever Action Rifle | DLC03LeverGun | 0300CFB5:DLCCoast.esm | Old-west style rifle |

#### Nuka-World (DLCNukaWorld.esm)
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Handmade Rifle | DLC04HandmadeRifle | 04026265:DLCNukaWorld.esm | 7.62mm assault rifle |
| Nuka-Nuke Launcher | DLC04ThirstZapperUnique | 0402A5C5:DLCNukaWorld.esm | Unique Fat Man variant |
| Thirst Zapper | DLC04ThirstZapper | 04014924:DLCNukaWorld.esm | Water weapon |

---

## Armor & Clothing

### Power Armor Frames & Pieces (Base Game)

| Type | EditorID | FormID | DR | Notes |
|------|----------|--------|-----|-------|
| Power Armor Frame | PowerArmor | 00154ABB:Fallout4.esm | - | Required chassis |
| T-45 Power Armor | PA_T45 | 00140C50:Fallout4.esm | - | Early-game PA |
| T-51 Power Armor | PA_T51 | 00140C51:Fallout4.esm | - | Mid-game PA |
| T-60 Power Armor | PA_T60 | 00140C52:Fallout4.esm | - | Brotherhood standard |
| X-01 Power Armor | PA_X01 | 00154AC0:Fallout4.esm | - | Advanced pre-war PA |

### Combat Armor (Base Game)

| Name | EditorID | FormID | DR | ER | Notes |
|------|----------|--------|-----|-----|-------|
| Leather Armor | Armor_Leather | 00023432:Fallout4.esm | 5 | 10 | Light armor |
| Metal Armor | Armor_Metal | 00023434:Fallout4.esm | 20 | 5 | Medium armor |
| Combat Armor | Armor_Combat | 00023433:Fallout4.esm | 15 | 15 | Balanced armor |
| Synth Armor | Armor_Synth | 001421CB:Fallout4.esm | 13 | 20 | Institute armor |

### Clothing & Outfits

| Name | EditorID | FormID | Bonuses | Notes |
|------|----------|--------|---------|-------|
| Vault 111 Jumpsuit | Vault111Jumpsuit | 00185C37:Fallout4.esm | - | Starting outfit |
| Vault-Tec Lab Coat | VaultTecLabCoat | 001942D6:Fallout4.esm | +2 INT | Science bonus |
| BOS Uniform | BoS_Uniform | 00134293:Fallout4.esm | - | Brotherhood outfit |
| Railroad Armored Coat | RailroadArmoredCoat | 001421D0:Fallout4.esm | - | Faction clothing |

### DLC Armor

#### Automatron
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Robot Armor | DLC01RobotArmor | 01001F62:DLCRobot.esm | Salvaged from robots |

#### Far Harbor
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Marine Armor | DLC03MarineArmor | 03005212:DLCCoast.esm | High DR/ER armor |
| Acadia's Shield | DLC03AcadiaShield | 030187F0:DLCCoast.esm | Unique armor piece |

#### Nuka-World
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Raider Power Armor | DLC04PowerArmor_Raider | 0400A715:DLCNukaWorld.esm | Raider-themed PA |

---

## Consumables

### Aid Items (Base Game)

| Name | EditorID | FormID | Effect | Weight | Value |
|------|----------|--------|--------|--------|-------|
| Stimpak | Stimpak | 00023736:Fallout4.esm | +30% HP over 5s | 0.1 | 48 |
| RadAway | RadAway | 00023742:Fallout4.esm | -300 Rads over 5s | 0.1 | 80 |
| Rad-X | RadX | 00024057:Fallout4.esm | +100 Rad Resist 3m | 0.1 | 40 |
| Buffout | Buffout | 000366C7:Fallout4.esm | +2 STR, +2 END, +50 HP 5m | 0.1 | 75 |
| Jet | Jet | 000366C5:Fallout4.esm | Slow time 10s | 0.1 | 50 |
| Psycho | Psycho | 000366C6:Fallout4.esm | +25% damage, +25 DR 5m | 0.1 | 50 |
| Med-X | MedX | 00033779:Fallout4.esm | +25 DR 5m | 0.1 | 50 |
| Mentats | Mentats | 000518BB:Fallout4.esm | +2 INT, +2 PER 5m | 0.1 | 50 |

### Food & Drink

| Name | EditorID | FormID | Effect | Rads |
|------|----------|--------|--------|------|
| Nuka-Cola | NukaCola | 0004835D:Fallout4.esm | +20 HP, +10 AP | +5 |
| Purified Water | PurifiedWater | 000366C3:Fallout4.esm | +20 HP | 0 |
| Grilled Radroach | GrilledRadroach | 00033691:Fallout4.esm | +10 HP | -3 |
| Noodle Cup | NoodleCup | 000330F4:Fallout4.esm | +10 HP | +6 |

### DLC Consumables

#### Far Harbor
| Name | EditorID | FormID | Effect |
|------|----------|--------|--------|
| Vim! | DLC03Vim | 0300EC06:DLCCoast.esm | +30 HP, +20 AP |
| Vim! Refresh | DLC03VimRefresh | 0300EC07:DLCCoast.esm | Unique variant |

#### Nuka-World
| Name | EditorID | FormID | Effect |
|------|----------|--------|--------|
| Nuka-Cola Quantum | DLC04NukaColaQuantum | 04000867:DLCNukaWorld.esm | +150 HP, +25 AP |
| Nuka-Mix | DLC04NukaMix | 04035374:DLCNukaWorld.esm | Custom soda recipes |

---

## Perks

### Base Game Perks (Essential)

| Name | EditorID | FormID | Ranks | Requirements | Effects |
|------|----------|--------|-------|--------------|---------|
| Gun Nut | Perk_GunNut | 001D2456:Fallout4.esm | 4 | INT 3 | Weapon mod crafting |
| Armorer | Perk_Armorer | 001D245B:Fallout4.esm | 4 | STR 3 | Armor mod crafting |
| Science! | Perk_Science | 001D2468:Fallout4.esm | 4 | INT 6 | Energy weapon mods, terminals |
| Locksmith | Perk_Locksmith | 001D2462:Fallout4.esm | 4 | PER 4 | Pick advanced locks |
| Hacker | Perk_Hacker | 001D2454:Fallout4.esm | 4 | INT 4 | Hack advanced terminals |
| Scrapper | Perk_Scrapper | 001D2477:Fallout4.esm | 2 | INT 5 | Salvage rare components |
| Local Leader | Perk_LocalLeader | 001D246D:Fallout4.esm | 2 | CHA 6 | Build supply lines |
| Medic | Perk_Medic | 001D2474:Fallout4.esm | 4 | INT 2 | Better healing |
| Bloody Mess | Perk_BloodyMess | 00065E3E:Fallout4.esm | 4 | LCK 3 | +5%/10%/15%/20% damage |

### S.P.E.C.I.A.L. Perks (Level 1)

| Name | EditorID | FormID | Stat | Effect |
|------|----------|--------|------|--------|
| Iron Fist | Perk_IronFist | 001DAFE8:Fallout4.esm | STR 1 | Unarmed damage |
| Big Leagues | Perk_BigLeagues | 001DAFE9:Fallout4.esm | STR 2 | Melee damage |
| Rifleman | Perk_Rifleman | 001DAFEC:Fallout4.esm | PER 2 | Non-auto rifle damage |
| Sneak | Perk_Sneak | 001D2479:Fallout4.esm | AGI 3 | Harder to detect |
| Ninja | Perk_Ninja | 001D246F:Fallout4.esm | AGI 7 | Sneak attack damage |

### DLC Perks

#### Automatron
| Name | EditorID | FormID | Requirements | Effect |
|------|----------|--------|--------------|--------|
| Robotics Expert | DLC01Perk_RoboticsExpert | 01000F9D:DLCRobot.esm | INT 8 | Hack robots |

#### Far Harbor
| Name | EditorID | FormID | Effect |
|------|----------|--------|--------|
| Marine Armor Training | DLC03Perk_MarineArmor | 03017B6E:DLCCoast.esm | Use Marine Armor |

#### Nuka-World
| Name | EditorID | FormID | Effect |
|------|----------|--------|--------|
| Amoral Combat | DLC04Perk_AmoralCombat | 04026267:DLCNukaWorld.esm | Raider gang bonuses |

---

## Factions

### Major Factions (Base Game)

| Name | EditorID | FormID | Alignment | Notes |
|------|----------|--------|-----------|-------|
| Player Faction | PlayerFaction | 0001C21C:Fallout4.esm | Neutral | Player's default faction |
| Minutemen | MinutemenFaction | 00050976:Fallout4.esm | Good | Commonwealth militia |
| Brotherhood of Steel | BoSFaction | 0005DE41:Fallout4.esm | Order | Techno-zealots |
| Railroad | RailroadFaction | 0001DA9D:Fallout4.esm | Good | Synth freedom fighters |
| Institute | InstituteFaction | 0001DA9E:Fallout4.esm | Neutral | Advanced scientists |
| Raiders | RaiderFaction | 0001C21F:Fallout4.esm | Evil | Generic hostiles |
| Gunners | GunnerFaction | 0004693C:Fallout4.esm | Evil | Mercenary group |
| Children of Atom | ChildrenOfAtomFaction | 000AEDE9:Fallout4.esm | Neutral | Radiation worshippers |
| Super Mutants | SuperMutantFaction | 0004693D:Fallout4.esm | Evil | Mutated humans |

### Faction Relationships

| Faction A | Faction B | Relationship | Combat? |
|-----------|-----------|--------------|---------|
| Minutemen | Raiders | Enemy | Yes |
| BoS | Institute | Enemy | Yes |
| Railroad | Institute | Enemy | Yes |
| BoS | Railroad | Neutral → Enemy | Conditional |
| Minutemen | BoS | Ally | No |
| Minutemen | Railroad | Ally | No |

### DLC Factions

#### Far Harbor
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Children of Atom (FH) | DLC03ChildrenOfAtom | 03003375:DLCCoast.esm | Far Harbor variant |
| Acadia | DLC03AcadiaFaction | 03003376:DLCCoast.esm | Synth refuge |
| Far Harbor | DLC03FarHarborFaction | 03003377:DLCCoast.esm | Islander faction |

#### Nuka-World
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| The Disciples | DLC04DisciplesFaction | 04026265:DLCNukaWorld.esm | Raider gang |
| The Operators | DLC04OperatorsFaction | 04026266:DLCNukaWorld.esm | Raider gang |
| The Pack | DLC04PackFaction | 04026268:DLCNukaWorld.esm | Raider gang |

---

## Quests

### Main Quest Line (Base Game)

| Name | EditorID | FormID | Stages | Notes |
|------|----------|--------|--------|-------|
| War Never Changes | MQ101 | 000AEFB9:Fallout4.esm | 0-900 | Tutorial quest |
| When Freedom Calls | MQ102 | 0006FA15:Fallout4.esm | 0-500 | Concord rescue |
| Jewel of the Commonwealth | MQ103 | 00022A23:Fallout4.esm | 0-300 | Diamond City |
| Reunions | MQ106 | 00022A26:Fallout4.esm | 0-800 | Kellogg hunt |
| Dangerous Minds | MQ201 | 00022A27:Fallout4.esm | 0-600 | Memory Den |
| The Glowing Sea | MQ202 | 00022A28:Fallout4.esm | 0-400 | Virgil location |
| Hunter/Hunted | MQ203 | 00022A29:Fallout4.esm | 0-500 | Courser chip |
| The Molecular Level | MQ204 | 00022A2A:Fallout4.esm | 0-1000 | Build teleporter |
| Institutionalized | MQ301 | 00022A2B:Fallout4.esm | 0-600 | Enter Institute |
| Nuclear Family | MQ305 | 00022A2F:Fallout4.esm | 0-800 | Institute ending |

### Faction Questlines

#### Minutemen
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| The First Step | Min00 | 00019CFF:Fallout4.esm | Join Minutemen |
| Taking Independence | Min03 | 000240B2:Fallout4.esm | Retake the Castle |
| Old Guns | Min04 | 000B1C48:Fallout4.esm | Artillery quest |

#### Brotherhood of Steel
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Fire Support | BoS100 | 0001539B:Fallout4.esm | Join BoS |
| Tour of Duty | BoS101 | 00056440:Fallout4.esm | Aboard the Prydwen |
| Shadow of Steel | BoS102 | 000B1D7B:Fallout4.esm | BoS main quest |
| Ad Victoriam | BoS302 | 000B1D87:Fallout4.esm | BoS ending |

#### Railroad
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Road to Freedom | RR101 | 00019CFC:Fallout4.esm | Find Railroad |
| Trade craft | RR102 | 00025A05:Fallout4.esm | Deacon introduction |
| Underground Undercover | RR302 | 000B1D88:Fallout4.esm | Railroad ending path |

#### Institute
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Institutionalized | Inst301 | 00022A2B:Fallout4.esm | Join Institute |
| Mankind - Redefined | Inst307 | 00024623:Fallout4.esm | Institute ending |

### DLC Quests

#### Automatron
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Mechanical Menace | DLC01MQ01 | 01000F9C:DLCRobot.esm | Start Automatron |
| A New Threat | DLC01MQ02 | 01000FA0:DLCRobot.esm | Investigate robots |
| Headhunting | DLC01MQ03 | 01000FA4:DLCRobot.esm | Find Mechanist |
| Restoring Order | DLC01MQ04 | 01000FA8:DLCRobot.esm | Defeat Mechanist |

#### Far Harbor
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Far From Home | DLC03MQ01 | 03003378:DLCCoast.esm | Travel to Far Harbor |
| Walk in the Park | DLC03MQ02 | 0300337C:DLCCoast.esm | Explore island |
| Where You Belong | DLC03MQ03 | 03003380:DLCCoast.esm | DiMA's memories |
| The Way Life Should Be | DLC03MQ04 | 03003384:DLCCoast.esm | Far Harbor ending |

#### Nuka-World
| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| All Aboard | DLC04MQ00 | 04014925:DLCNukaWorld.esm | Transit to Nuka-World |
| The Gauntlet | DLC04MQ01 | 04014929:DLCNukaWorld.esm | Arena challenge |
| An Ambitious Plan | DLC04MQ02 | 0401492D:DLCNukaWorld.esm | Become Overboss |
| Home Sweet Home | DLC04MQ03 | 04014931:DLCNukaWorld.esm | Raider settlements |
| Power Play | DLC04MQ04 | 04014935:DLCNukaWorld.esm | Gang warfare |

---

## Keywords

### Essential Keywords (Base Game)

| Name | EditorID | FormID | Usage |
|------|----------|--------|-------|
| Actor Type Human | ActorTypeHuman | 00045374:Fallout4.esm | Marks NPC as human |
| Actor Type Robot | ActorTypeRobot | 0007E021:Fallout4.esm | Marks NPC as robot |
| Actor Type Super Mutant | ActorTypeSuperMutant | 0007E022:Fallout4.esm | Marks NPC as mutant |
| Armor Type Power | ArmorTypePower | 0004D8A1:Fallout4.esm | Power armor pieces |
| Weapon Type Pistol | WeaponTypePistol | 001E6848:Fallout4.esm | Pistol weapons |
| Weapon Type Rifle | WeaponTypeRifle | 001E6849:Fallout4.esm | Rifle weapons |
| Weapon Type Heavy | WeaponTypeHeavy | 001E684A:Fallout4.esm | Heavy weapons |

### Crafting Keywords

| Name | EditorID | FormID | Usage |
|------|----------|--------|-------|
| Mod Weapon | ModWeapon | 001E6D2A:Fallout4.esm | Weapon mod component |
| Mod Armor | ModArmor | 001E6D2B:Fallout4.esm | Armor mod component |
| Recipe Filter | RecipeFilter | 00054BA9:Fallout4.esm | Crafting category |

### Settlement Keywords

| Name | EditorID | FormID | Usage |
|------|----------|--------|-------|
| WorkshopItem | WorkshopItem | 00054BA6:Fallout4.esm | Buildable object |
| Workbench Keyword | WorkbenchKeyword | 000F1A42:Fallout4.esm | Crafting station type |

---

## Leveled Lists

### Weapon Leveled Lists (Base Game)

| Name | EditorID | FormID | Contains |
|------|----------|--------|----------|
| Raider Weapon List | LLI_Weapon_Raider | 0007D94E:Fallout4.esm | Pipe weapons, 10mm, shotgun |
| Gunner Weapon List | LLI_Weapon_Gunner | 0007D950:Fallout4.esm | Combat rifle, assault rifle |
| Institute Weapon List | LLI_Weapon_Institute | 0007D952:Fallout4.esm | Laser rifles, plasma rifles |

### Armor Leveled Lists

| Name | EditorID | FormID | Contains |
|------|----------|--------|----------|
| Raider Armor List | LLI_Armor_Raider | 0007D94F:Fallout4.esm | Leather, metal armor |
| BoS Armor List | LLI_Armor_BoS | 0007D951:Fallout4.esm | Combat armor, power armor |

### Creature Leveled Lists

| Name | EditorID | FormID | Contains |
|------|----------|--------|----------|
| Raider Encounter | LVLN_Raider | 0001F257:Fallout4.esm | Raider variants by level |
| Super Mutant Encounter | LVLN_SuperMutant | 0001F259:Fallout4.esm | SM variants by level |
| Gunner Encounter | LVLN_Gunner | 0001F25B:Fallout4.esm | Gunner variants by level |

---

## DLC-Specific Records

### Automatron - Robot Parts

| Name | EditorID | FormID | Type |
|------|----------|--------|------|
| Assaultron Head | DLC01Robot_Assaultron_Head | 01000F9F:DLCRobot.esm | Robot part |
| Protectron Arms | DLC01Robot_Protectron_Arms | 01000FA1:DLCRobot.esm | Robot part |
| Sentry Bot Legs | DLC01Robot_SentryBot_Legs | 01000FA3:DLCRobot.esm | Robot part |

### Far Harbor - Unique Items

| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Marine Combat Helmet | DLC03MarineHelmet | 03005213:DLCCoast.esm | High-tier helmet |
| Atom's Judgement | DLC03AtomsJudgement | 030187F1:DLCCoast.esm | Unique super sledge |
| Recon Marine Armor | DLC03ReconMarineArmor | 03023D35:DLCCoast.esm | Legendary variant |

### Nuka-World - Park Zones

| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Galactic Zone | DLC04GalacticZone | 04026269:DLCNukaWorld.esm | Sci-fi themed park |
| Safari Adventure | DLC04SafariAdventure | 0402626A:DLCNukaWorld.esm | Wildlife park |
| Dry Rock Gulch | DLC04DryRockGulch | 0402626B:DLCNukaWorld.esm | Western park |
| Kiddie Kingdom | DLC04KiddieKingdom | 0402626C:DLCNukaWorld.esm | Children's park |
| Nuka-Town USA | DLC04NukaTownUSA | 0402626D:DLCNukaWorld.esm | Main hub |

### Wasteland Workshop - Buildables

| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Cage - Deathclaw | DLC02CageDeathclaw | 02000F9E:DLCworkshop01.esm | Capture deathclaw |
| Cage - Radscorpion | DLC02CageRadscorpion | 02000FA0:DLCworkshop01.esm | Capture radscorpion |
| Concrete Walls | DLC02ConcreteWalls | 02000FA2:DLCworkshop01.esm | Building materials |

### Contraptions Workshop - Machinery

| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Conveyor Belt | DLC04ConveyorBelt | 04000F9C:DLCworkshop02.esm | Manufacturing |
| Ammo Production | DLC04AmmoProduction | 04000FA0:DLCworkshop02.esm | Make ammo |
| Track Kit | DLC04TrackKit | 04000FA4:DLCworkshop02.esm | Ball track builder |

### Vault-Tec Workshop - Vault Parts

| Name | EditorID | FormID | Notes |
|------|----------|--------|-------|
| Vault Door | DLC05VaultDoor | 05000F9E:DLCworkshop03.esm | Build vaults |
| Overseer's Desk | DLC05OverseerDesk | 05000FA2:DLCworkshop03.esm | Vault furniture |
| Vault Experiments | DLC05Experiments | 05000FA6:DLCworkshop03.esm | Run experiments |

---

## Modding Best Practices

### FormID Collision Avoidance
1. **Never hardcode FormIDs** — use EditorID references in xEdit
2. **Check load order** before distributing mods
3. **ESL-flag when possible** — saves load order slots
4. **Compact FormIDs** before ESL flagging to avoid gaps

### DLC Dependencies
- If using DLC records, **add the DLC as a master**
- Use **conditional loading** for optional DLC support
- Always **test without DLC** if claiming vanilla-only compatibility

### Common Conflicts
- **Leveled list injection** — use FormID lists, not overrides
- **Cell edits** — minimize to avoid precombine breaks
- **Faction relationships** — test for unintended combat
- **Quest stage conflicts** — never re-use vanilla quest IDs

---

## See Also
- **FALLOUT4_GAME_SYSTEMS_MECHANICS.md** — Deep dive into game mechanics
- **FALLOUT4_MODDING_GUIDE.md** — Comprehensive modding workflows
- **SPRIGGIT_COLLABORATIVE_MODDING_GUIDE.md** — Version control for plugins

---

**Last Updated**: April 2026 (v1.11.x Anniversary Edition compatible)
