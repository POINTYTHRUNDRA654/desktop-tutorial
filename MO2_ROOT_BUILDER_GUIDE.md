# Mod Organizer 2 — Root Builder (Managing Root-Folder Tools)

## The problem it solves
By default **MO2 only virtualizes the `Data` folder**. But many essential tools live in the **Fallout 4 root** folder (next to `Fallout4.exe`): **F4SE**, **ENB**, **ReShade**, DLL/xSE plugins, **Buffout 4**, and `.exe` patchers. Without help, you have to install those manually into the real game directory, which defeats MO2's clean, profile-based setup.

## What Root Builder does
**Root Builder** (MO2 plugin by **Kezyma**) lets MO2 also manage root-folder files. You put a mod's root files in a special `Root` subfolder, and at launch MO2 maps them onto the game root — keeping the **real install clean** and per-profile.

## Setup
1. Install **Root Builder** via the MO2 **Plugin Finder** (or manually into `plugins/`).
2. Enable it in **Settings → Plugins → Root Builder**.
3. Inside a mod, put its root-folder files into a subfolder named **`Root`**:
   ```
   MyMod/
     Root/
       f4se_loader.exe
       f4se_1_10_163.dll
       Data/...        (optional)
   ```
4. Launch the game through MO2 — the `Root` contents are virtually placed in the game root.

## Modes
- **USVFS** (virtual) — cleanest, recommended for FO4, leaves nothing behind.
- **Link** (hardlinks) — writes hardlinks into the game folder; use only if a tool refuses to work under USVFS.

## Important: previsbine generation
**USVFS causes previs flickering** during generation. Generate **precombines and previs OUTSIDE MO2** (run the tools directly). This matches Mossy's previsbine-workflow warning.

## Common mistakes
- **F4SE or ENB not loading** because the files were left in `Data` instead of a `Root` folder, or Root Builder was not enabled.
- Confusing the **virtual root** with the **real game install** directory.
- Installing an `.exe` patcher through Root Builder and expecting it to permanently modify the real EXE — USVFS is virtual.

## Related
See: `NEXTGEN_VS_ANNIVERSARY_ENGINE_GUIDE` (which runtime you target), Buffout/ENB setup, and the F4SE notes in Mossy's brain.
