# Complex Item Sorter (FIS / FallUI Item Sorter) — Auto-Tagging Weapons & Armor

**Tool type:** xEdit (FO4Edit) script · **Author:** antique_septum · **Replaces:** AWKCR / Valdacil-style sorting

## What it does
Complex Sorter automatically generates inventory tags — `[Weapon]`, `(Ammo)`, `{Armor}`, `<Aid>` — for every item across your **entire load order** by reading item records and Instance Naming Rules (INNR). It is the modern, AWKCR-free way to keep a heavily-modded inventory readable, and it pairs with **FallUI Inventory** / **FIS - The FallUI Item Sorter**.

## Where it fits in the mod-building ladder
Any time you create or install weapon/armor/aid content, the new items land in the inventory **untagged**. Complex Sorter is the release-time pass that makes your mod (and the player's whole game) sort cleanly.

## Workflow
1. Install **FIS - FallUI Item Sorter** (provides the config INIs) and load its scripts into your `Edit Scripts/` folder.
2. Launch **FO4Edit** with your full load order.
3. Right-click any plugin → **Apply Script** → **Complex Sorter**.
4. Choose a config:
   - **Tag mode** — adds icon/text tags (needs a tagged UI like FallUI/DEF_UI).
   - **DN Labels mode** — adds descriptive names without special icon fonts.
5. Let it build a single patch ESP (e.g. `Complex Sorter.esp`).
6. Place the patch at (or near) the **end** of the load order. ESL-flag it to save a slot.

## Config
- INIs live in `Edit Scripts/Complex Sorter/`. They map item categories to tags and control edge cases (legendaries, quest items, DLC).
- You can add custom rules for your own keywords so your mod's items tag correctly.

## Common mistakes
- Running it **before** all item mods are installed → new items stay untagged.
- Keeping **two** item-sorter patches active at once → double tags / conflicts.
- Forgetting to **rebuild** the patch after adding or updating a mod.
- Using Tag mode without a tag-aware UI → you see raw icon glyphs instead of icons.

## Related
See also: `OMOD` object modification, leveled-list injection, and the FOMOD packaging guide for shipping the sorter patch as an optional installer step.
