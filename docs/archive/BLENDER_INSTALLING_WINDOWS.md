# Installing Blender on Windows

This guide covers Windows-specific installation, updates, and configuration options.

## Architecture Compatibility
- Blender provides separate builds for x64 (Intel/AMD) and ARM64 (newer Snapdragon).
- Download the variant matching your CPU architecture.
- Most Windows machines use x64; confirm via Settings → System → About or `msinfo32`.

## Install from Windows Installer (`.msi` or `.exe`)
1. Download the installer for your architecture from blender.org.
2. Run the installer; it requires administrator rights.
3. Choose installation folder (default: `Program Files\Blender Foundation\Blender`).
4. Installer automatically:
   - Creates a Start menu entry.
   - Associates `.blend` files with Blender.
   - May prompt for administrator approval.
5. Launch via Start menu or double-click a `.blend` file.

## Install from Zip
1. Download the zip file for your architecture.
2. Extract to a folder you control (e.g., `C:\Apps\Blender` or `%USERPROFILE%\Software\Blender`).
3. Run `blender.exe` from the extracted folder.
4. No Start menu entry or file association is created.
5. Optional file association: click "Register" in Preferences → System tab, or run:

```powershell
./blender.exe -r
```

6. Multiple versions can coexist; keep each in its own folder.

## Install from Microsoft Store
1. Open Microsoft Store, search "Blender".
2. Click "Install"; the app downloads and installs automatically.
3. Launch from the Windows Start menu.

## Updating on Windows
- **Installer**: download new version, run installer, and uninstall the old version (Windows Settings → Apps).
- **Zip**: download new version, extract to a new folder. Keep old folders for multi-version setups.
- **Microsoft Store**: updates are applied automatically.

## Post-Install Checks
- Launch Blender; confirm the default scene loads.
- Preferences → System: verify GPU device (NVIDIA CUDA/OptiX, AMD HIP, Intel, or CPU).
- Read release notes for major feature changes.

## GPU Driver Updates (Windows)
For best performance and compatibility with Cycles GPU rendering:

### NVIDIA
- Download drivers from nvidia.com.
- Or use GeForce Experience (auto-updates).
- Ensure CUDA Compute Capability 5.0+; check in Preferences → System.

### AMD
- Download drivers from amd.com (Adrenalin).
- HIP support requires Radeon RX series or newer.
- Verify in Preferences → System after updating.

### Intel
- Download from intel.com or via Windows Update.
- ARC A-series GPUs support Cycles rendering.
- Verify device in Preferences → System.

## Tips
- Portable Installation: set up a self-contained folder with configs if needed.
- Multiple versions: no conflict; keep in separate folders or use installer + portable mix.
- Command-line register: `blender.exe -r` to associate `.blend` files without GUI.

## Headless & Batch Rendering (PowerShell)
For headless rendering with auto-exec, see:
- [scripts/blender/run_blender_ops.ps1](scripts/blender/run_blender_ops.ps1) for operator examples.
- [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md) for general notes.

## Related Docs
- General install guide: [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
- Linux install: [BLENDER_INSTALLING_LINUX.md](BLENDER_INSTALLING_LINUX.md)
- macOS install: [BLENDER_INSTALLING_MAC.md](BLENDER_INSTALLING_MAC.md)
- Add-on tutorial: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
