# BodyGen — Randomized NPC Body Morphs (No Per-NPC Builds)

## What it does
**BodyGen** (part of the **LooksMenu / F4EE** ecosystem) gives NPCs **varied body shapes at runtime** without shipping a separate mesh for every NPC. Instead of baking hundreds of bodies, you ship two small INI files and let the game randomize.

## Requirements
- **LooksMenu (F4EE)** installed.
- A body (e.g. CBBE/Fusion Girl) that has **BodySlide morph data**. In BodySlide you **must tick "Build Morphs"** so the runtime sliders exist — without it, BodyGen has nothing to drive.

## Files
Location: `Data/F4SE/Plugins/F4EE/BodyGen/<YourPlugin.esp>/`

- **`templates.ini`** — named morph sets:
  ```
  Curvy=Breasts@0.6,Butt@0.8,Waist@0.3
  Athletic=Waist@0.2,Arms@0.5
  ```
- **`morphs.ini`** — maps NPCs to templates with probability weights:
  ```
  YourPlugin.esp|000ABCDE=Curvy
  All|female=Curvy|Athletic
  ```
  You can target a **specific FormID** or use wildcards like `All|female`.

## Enabling
Enable BodyGen in-game (LooksMenu) or via ini. NPCs receive randomized shapes the **first time they load**, and the result is saved so they stay consistent.

## Good uses
- Immersion mods that want **varied settlers and NPCs** without hundreds of baked meshes.
- Giving a follower a distinct silhouette without a dedicated mesh.

## Common mistakes
- **Forgetting "Build Morphs"** in BodySlide → no effect at all (the most common failure).
- **Wrong plugin folder name** → the ini is never read.
- Accidentally morphing **unique named NPCs** whose look you wanted to keep — target them explicitly or exclude them.
- Expecting changes on **already-loaded** NPCs — BodyGen applies on first load in a save.

## Related
See: BodySlide / Outfit Studio notes, LooksMenu, and the armor/biped-slot guide (morphs must match the body reference the armor was built for).
