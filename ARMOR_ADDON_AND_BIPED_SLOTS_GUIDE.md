# Armor (ARMO) vs Armor Addon (ARMA) & the 33 Biped Slots

In Fallout 4 a wearable item is **two linked records**. Getting the relationship and the biped slots right is the core skill for any armor or clothing mod.

## ARMO vs ARMA
- **ARMO (Armor)** — the record the player sees in the inventory: name, value, weight, armor rating, keywords, material swaps, and the **BOD2** biped-slot mask. It **points to** one or more Armor Addons.
- **ARMA (Armor Addon)** — supplies the **actual meshes** per race, gender, and skin:
  - Male & female **world models** and **first-person models** (`.nif`).
  - **Skin material** (`TXST`).
  - The **race** it fits (usually `HumanRace`) plus any **additional races** (ghoul, synth, child).

A missing **female model** → invisible on female characters. A missing **first-person model** → the item vanishes in first person.

## The 33 biped slots (30–61)
Slots decide what a piece **occupies** and therefore what it **hides**. Common ones:

| Slot | Use | Slot | Use |
|------|-----|------|-----|
| 30 | Hair Top | 41 | (headwear logic) |
| 31 | Hair Long | 43 | (aux) |
| 33 | **Body / Torso** | 44 | (aux) |
| 34 | L Arm | 45 | (aux) |
| 35 | R Arm | 46 | Eyes |
| 36 | L Leg | 47 | Beard |
| 37 | R Leg | 48 | Mouth |
| 38 | Shield/Back | 49 | Neck |

Slot **33** is the main body-armor slot. Over-armor pieces (harnesses, jackets) use additional slots so they can layer.

## BOD2 field
On the ARMO, **BOD2** sets:
- the **biped slots** the item occupies, and
- the **armor type**: Clothing, Light, Heavy, or Power Armor.

## Build workflow
1. Model in **Blender**; export `.nif` (with the correct FO4 skeleton weights).
2. Set texture paths and shader flags in **NifSkope**.
3. In the **Creation Kit**:
   - Create the **ARMA** — assign race, biped slots, male/female/1st-person meshes, skin material.
   - Create the **ARMO** — reference the ARMA, set BOD2 slots + armor type, keywords, stats.
4. Add the ARMO to a **leveled list** or a **crafting recipe (COBJ)** so players can get it.

## Common mistakes
- **Wrong biped slots** → gear hides other equipment unexpectedly, or two items fight over slot 33.
- Slot-33 body pieces **clipping** vanilla clothing.
- **Skin material not assigned** → the mesh shows solid purple in game.
- Forgetting **additional races** → the item is invisible on ghoul/synth NPCs.
- First-person model omitted → invisible arms/body in first person.

## Related
See: `NIFSKOPE_DIVA11_GUIDE`, BodySlide/Outfit Studio notes, `LEVELED_LIST_INJECTION_GUIDE`, and the OMOD/material-swap material.
