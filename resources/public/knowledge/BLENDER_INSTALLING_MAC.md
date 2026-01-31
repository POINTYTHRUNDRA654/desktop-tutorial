# Installing Blender on macOS

This guide covers macOS-specific installation and updating, including Apple Silicon vs Intel notes.

## Architecture Compatibility
- Blender provides separate builds for Apple Silicon (ARM64) and Intel (x86_64).
- Download the variant matching your CPU architecture.

## Install from a DMG (Recommended)
1. Download the macOS `.dmg` from blender.org for your architecture.
2. Double-click the `.dmg` to mount it.
3. Drag `Blender.app` into `Applications`.
4. First launch: macOS may prompt for approval (Privacy & Security). Allow the app to open.
5. Optional: set up a Portable Installation if you prefer a self-contained config.

## Updating on macOS
- Download the new `.dmg` from blender.org.
- Replace `Blender.app` in `Applications` with the new version.
- To keep multiple versions side-by-side, rename `Blender.app` (e.g., `Blender 4.2.app`) or place in a different folder.

## Post-Install Checks
- Launch Blender; confirm the default scene loads.
- Preferences → System: verify device settings (CPU/GPU). Metal GPU support requires compatible macOS + hardware.
- Review release notes for feature changes.

## Notes
- Portable Installation keeps settings within the app directory, useful for isolated setups.

## Related Docs
- General install guide: [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
- Linux install: [BLENDER_INSTALLING_LINUX.md](BLENDER_INSTALLING_LINUX.md)
- Add-on tutorial: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
