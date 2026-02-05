# Installing Blender on Linux

This guide covers Linux-specific installation, updates, windowing notes, and common pitfalls.

## Install from blender.org (Recommended)
1. Download the Linux build for your architecture from blender.org.
2. Extract the tarball to a folder you control (e.g., `~/software` or `/usr/local`).
3. Launch Blender by running the `blender` executable in that folder.
   - Multiple versions can coexist; keep each in its own directory.
4. Optional: add a desktop/menu entry and associate `.blend` files (Register Blender).
5. For a fully self-contained setup, use a Portable Installation.

## Install via Package Manager
- Many distros provide Blender packages. Pros: consistent with system packages, auto menu integration, update notifications.
- Cons: may lag behind official releases; some builds omit features (e.g., Cycles GPU) for policy/licensing reasons.
- If your distro’s package is outdated or missing features, prefer the official tarball.

## Install via Snap
If `snapd` is available:

```bash
sudo snap install blender --classic
```

- Benefit: automatic updates via Snap.
- Snap builds tend to be more consistent than per-distro packages.

## Running from the Terminal
- From the extracted folder:

```bash
./blender
```

- To run a specific `.blend`:

```bash
./blender /path/to/scene.blend
```

- Headless render or scripting: see the add-on and headless examples in
  [scripts/blender/README_BLENDER_ADDONS.md](scripts/blender/README_BLENDER_ADDONS.md).

## Graphics System (X11 & Wayland)
- Blender supports both X11 and Wayland.
- Choose the session that best fits your driver and compositor setup; performance may vary.

## Avoiding Alt+Mouse Conflicts
Some window managers use `Alt+Left/Right Click` for window moves/resizes, conflicting with Blender operations (3‑button mouse emulation, edge loop selection, multi‑property changes).

- GNOME: switch modifier to Super (Meta) for window actions:

```bash
gsettings set org.gnome.desktop.wm.preferences mouse-button-modifier '<Super>'
```

- KDE: System Settings → Window Management → Window Behavior → Window Actions, change from Alt to Meta.

## Updating Blender on Linux
- Official tarball: download the new version and replace/extract to a new folder; keep old versions as needed.
- Package manager: update as you do other applications (may lag official releases).
- Snap: updates are applied automatically.

## Known Limitations
- Archive extraction: do not use 7‑Zip for the official tarball; use `tar`.
  - Example:

```bash
tar -xvf blender-<version>-linux-x64.tar.xz -C ~/software
```

- See upstream issue references for details (e.g., #104070).

## Quick Post-Install Checks
- Launch Blender; confirm a default scene opens.
- Preferences → System: verify OpenGL/GPU detection, set Cycles device.
- Read release notes for major changes affecting your workflows.

## Related Docs
- General install guide: [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
- Add‑on tutorial: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
- Headless runner (PowerShell examples on Windows): [scripts/blender/README_BLENDER_ADDONS.md](scripts/blender/README_BLENDER_ADDONS.md)
