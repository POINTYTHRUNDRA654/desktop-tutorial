# Fallout 4 Advanced AI — Required Masters & Dependencies

## Hard Requirements (Mod will NOT work without these)

| Mod | Why | Link |
|-----|-----|------|
| **Fallout 4** (latest patch) | Base game | — |
| **F4SE 0.6.23+** | Script Extender — enables advanced Papyrus functions, GetActorsInRange, storage, string ops | https://f4se.silverlock.org/ |
| **Address Library for F4SE Plugins** | Required by F4SE-dependent mods for game version compatibility | https://www.nexusmods.com/fallout4/mods/47327 |
| **MCM Helper** | In-game configuration menu (FallUI MCM) | https://www.nexusmods.com/fallout4/mods/21497 |

## Soft Requirements (Highly Recommended)

| Mod | Why | Link |
|-----|-----|------|
| **FallUI** | Enhanced HUD for MCM menus | https://www.nexusmods.com/fallout4/mods/48758 |
| **Buffout 4** | Crash fixes and stability — needed for any script-heavy mod | https://www.nexusmods.com/fallout4/mods/47359 |
| **Backported Archive2 Support** | Required if using latest FO4 update (Next-Gen) | https://www.nexusmods.com/fallout4/mods/81859 |

## For Mossy Bridge (PC-side memory system)

| Requirement | Why |
|-------------|-----|
| **Python 3.10+** | Runs the bridge server |
| **Mossy Desktop AI** | The AI assistant that connects to the bridge |

## ESP Master Flags (set in .esp header)

The Advanced AI .esp must list these as masters in its header:
```
Fallout4.esm          (base game)
DLCRobot.esm          (Automatron — robot AI)
DLCCoast.esm          (Far Harbor — creature AI)
DLCworkshop01.esm     (Wasteland Workshop)
DLCworkshop02.esm     (Contraptions)
DLCworkshop03.esm     (Vault-Tec)
DLCNukaWorld.esm      (Nuka-World — faction AI)
MCMHelper.esp         (MCM configuration)
```

## Load Order (LOOT recommended)

Place Advanced AI **after**:
- All DLC ESMs
- MCM Helper
- Any combat overhauls (Arbitration, SKK Combat Stalkers)
- Any NPC overhauls (Settlers of the Commonwealth, etc.)

Place Advanced AI **before**:
- Patch ESPs that reference the same NPCs

## Compatibility Notes

- **Arbitration**: Compatible. Advanced AI handles behavior/detection; Arbitration handles combat gameplay feel. Both can run together.
- **SKK Combat Stalkers**: Compatible. Uses different hooks.
- **Companion mods (Amazing Follower Tweaks, etc.)**: Use the ExternalAffinityMod() API to avoid conflicts.
- **Better Companions**: Load Better Companions after Advanced AI.
- **Sim Settlements 2**: Fully compatible — no overlapping scripts.
