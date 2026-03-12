# Fallout 4 Scale Reference Guide

## Overview

Getting the scale right is one of the most important – and most commonly
botched – parts of Fallout 4 modding.  An object that looks great in Blender
may turn out giant or tiny once it is in-game.

The add-on's **Scale References** panel adds non-renderable wire-frame
silhouettes of common FO4 characters and objects so you can check proportions
at a glance without leaving Blender.

---

## The Blender Unit / NIF Unit Relationship

The Niftools Blender add-on (v0.1.1) exports meshes with **no scale
correction** by default: 1 Blender Unit (BU) maps directly to 1 NIF unit.

| Blender Units | NIF units | Approximate real-world |
|---|---|---|
| 1.00 BU | 100 NIF | ≈ 1.4375 m (game world) |
| 0.70 BU | 70 NIF  | ≈ 1.00 m (real world) |
| 1.00 BU | 100 NIF | ≈ 1.00 m (FO4 collision) |

> The 1.4375 m / NIF-unit conversion comes from the Gamebryo/Creation Engine
> internal scale and affects how the game positions objects relative to each
> other, **but for practical modding purposes just work at 1 BU = 1 NIF unit**
> and compare directly against the reference objects.

---

## Reference Object Sizes

| Reference ID | Label | Dimensions (X × Y × Z BU) | Notes |
|---|---|---|---|
| `HUMAN_MALE` | Human (Male NPC) | 0.35 × 0.25 × 1.28 | Adult male NPC standing |
| `HUMAN_FEMALE` | Human (Female NPC) | 0.32 × 0.22 × 1.22 | Adult female NPC standing |
| `CHILD` | Child | 0.25 × 0.18 × 0.90 | Child character (e.g. Shaun age 10) |
| `POWER_ARMOR` | Power Armor (T-60/X-01) | 0.55 × 0.40 × 1.72 | Occupied suit; shoulder ~1.50 |
| `DEATHCLAW` | Deathclaw | 0.80 × 0.60 × 2.20 | Standing on hind legs |
| `BRAHMIN` | Brahmin | 2.50 × 1.00 × 1.30 | Two-headed brahmin; length × shoulder |
| `PRE_WAR_CAR` | Pre-war Car (sedan) | 4.20 × 1.80 × 1.30 | Typical pre-war sedan |
| `DOOR_FRAME` | Standard Door Frame | 1.10 × 0.10 × 1.80 | Interior door opening |
| `CUBE_1M` | 1-Metre Reference Cube | 0.70 × 0.70 × 0.70 | 1 m real-world cube |
| `SETTLEMENT_FLOOR` | Settlement Floor Panel | 4.00 × 4.00 × 0.05 | Snap-build floor section |

---

## Practical Scale Examples

### Item / Prop sizing

| Object type | Approximate size in BU | Example |
|---|---|---|
| Coffee mug | 0.08 × 0.08 × 0.10 | Nuka-Cola cup |
| Pistol | 0.20 × 0.06 × 0.15 | 10mm pistol |
| Rifle | 0.90 × 0.08 × 0.25 | Hunting Rifle |
| Briefcase | 0.45 × 0.20 × 0.35 | Attache case |
| Desk | 1.20 × 0.60 × 0.75 | Office desk |
| Car / vehicle | 4.00–5.00 BU long | Pre-war sedan |
| House / shack | 6.00 × 4.00 × 3.50 | Single-room shack |

### Door & window sizing

| Opening type | Width BU | Height BU |
|---|---|---|
| Interior door (standard) | 1.10 | 1.80 |
| Exterior door (large) | 1.40 | 2.20 |
| Window (small) | 0.80 | 0.90 |
| Window (tall sash) | 0.80 | 1.50 |
| Vault door (standard) | 3.80 | 3.80 |

---

## Tips

- **Always compare against the Human Male reference** when creating any prop
  that humans interact with.  Doors should reach above their heads (≥ 1.80 BU);
  furniture should be at hip/shoulder level (0.75–0.95 BU high).

- **Apply scale before export**: After sculpting or scaling objects, always
  apply the object scale (Ctrl+A → Scale) before export.  The diagnostics
  panel will flag this if you forget.

- **LOD transitions**: FO4 uses 4 LOD levels.  A common rule of thumb:
  - LOD0 (full detail): used within ~30 BU of camera
  - LOD1 (50% polys): used to ~60 BU
  - LOD2 (25% polys): used to ~120 BU
  - LOD3 (10% polys): used beyond 120 BU

- **Power Armor clearance**: If your mod includes a settlement structure that
  players can enter in Power Armor, all doorways should be ≥ 1.50 BU wide and
  ≥ 2.00 BU tall to avoid clipping.

- **Vehicle interactability**: The "sit / get in" interaction radius for
  vehicles uses the collision mesh bounds.  Keep the UCX_ collision mesh tight
  to the body panels (not the undercarriage).
