# Installing Blender (Practical Guide)

This guide summarizes Blender distribution options, system requirements, and platform‑specific install tips — without relying on any fake UI buttons.

## Release Channels
- Stable Release: feature‑complete, tested; new versions ~every 3 months.
- Long‑Term Support (LTS): highly stable builds for long projects; supported ~2 years; only bug fixes and patches.
- Daily Builds: automatically updated test builds (Alpha/Beta/RC); newest changes, may be unstable.
- Build from Source: full control and customization; for advanced users and contributors.
- Steam: cross-platform auto-updates; see [BLENDER_INSTALLING_STEAM.md](BLENDER_INSTALLING_STEAM.md).

## System Requirements
- Platforms: Windows, macOS, Linux.
- Graphics: up‑to‑date GPU drivers with proper OpenGL support.
- Hardware: meet minimums; prefer recommended specs for good performance.
- Extras: tablets and 3D mice setup covered later (see hardware config docs).

## Download
- Get official builds from blender.org (choose Stable, LTS, or Daily depending on your needs).
- Studios often pick LTS; hobbyists may prefer Stable or Daily for new features.

## Updates
Blender does not auto‑update. Download new versions manually and follow platform‑specific upgrade steps.

## Install on Windows
- See detailed steps: [BLENDER_INSTALLING_WINDOWS.md](BLENDER_INSTALLING_WINDOWS.md)
  - Installer, zip extraction, Microsoft Store, multi-version setups, GPU driver tips, and PowerShell headless examples.

## Install on macOS
- See detailed steps: [BLENDER_INSTALLING_MAC.md](BLENDER_INSTALLING_MAC.md)
  - DMG install, first-launch approval, updating, multiple versions side-by-side, and Metal notes.

## Install on Linux
- See detailed steps: [BLENDER_INSTALLING_LINUX.md](BLENDER_INSTALLING_LINUX.md)
	- Official tarball, package managers, Snap, updates, windowing notes, and known pitfalls.

## Install from Steam
- Find Blender in Steam, install like any app.
- Steam keeps it updated to the selected channel; still verify drivers.

## Choosing a Channel
- Need stability over features: LTS.
- Balanced features/stability: Stable.
- Testing or newest tools: Daily (Alpha/Beta/RC).
- Custom development: Source build.

## Quick Checks After Install
- Launch Blender; confirm it opens a default scene.
- Preferences → System: verify GPU detected; set Cycles device (CPU/GPU) as desired.
- Help → About: confirm version; read release notes for changed behavior.

## Useful Links
- Release notes: summary of new features and changes.
- Download page: official builds (Stable, LTS, Daily).
- Build instructions: compiling from source.

For add‑on development and automation, see:
- [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
- [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)
- Headless runner: [scripts/blender/run_blender_ops.ps1](scripts/blender/run_blender_ops.ps1)
