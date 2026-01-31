# NVIDIA Canvas (Vita Canvas) Setup Guide

## What is NVIDIA Canvas?

NVIDIA Canvas (also called **Vita Canvas** by some users) is an AI-powered painting application that transforms simple brushstrokes into realistic landscape images. It's perfect for creating textures and landscapes for Fallout 4 mods.

---

## Installation

### Download NVIDIA Canvas

1. Visit: https://www.nvidia.com/en-us/studio/canvas/
2. Click **"Download Now"**
3. You'll need:
   - NVIDIA RTX GPU (20 series or newer)
   - Latest NVIDIA Studio or Game Ready drivers
   - Windows 10/11

### Install

1. Run the downloaded installer: `NVIDIACanvas_Setup.exe`
2. Follow the installation wizard
3. Default installation path:
   ```
   C:\Program Files\NVIDIA Corporation\NVIDIA Canvas\NVIDIACanvas.exe
   ```

---

## Configuring in Mossy

### Automatic Detection

Mossy should automatically detect NVIDIA Canvas if it's installed in the default location. To check:

1. Open **Settings** (gear icon in sidebar)
2. Scroll to **"NVIDIA Canvas (Vita Canvas)"**
3. If the path is filled in, it was detected automatically
4. Click **"Test Launch"** to verify it works

### Manual Configuration

If automatic detection didn't work:

1. Click **"Browse"** next to NVIDIA Canvas
2. Navigate to: `C:\Program Files\NVIDIA Corporation\NVIDIA Canvas\`
3. Select: `NVIDIACanvas.exe`
4. Click **"Save Settings"**
5. Test with **"Test Launch"**

---

## Common Issues

### "Can't Open Vita Canvas"

**Issue**: The executable path is wrong or not set.

**Solution**:
1. Open Windows Explorer
2. Navigate to: `C:\Program Files\NVIDIA Corporation\NVIDIA Canvas\`
3. Look for: `NVIDIACanvas.exe`
4. If it's there, copy the full path
5. Paste it into Mossy's External Tools settings
6. Save and test

### NVIDIA Canvas Not Installed

If you don't have NVIDIA Canvas:
- Check you have an NVIDIA RTX GPU (required)
- Download from: https://www.nvidia.com/en-us/studio/canvas/
- Install NVIDIA Studio drivers if needed

### Wrong Executable Selected

Some users accidentally select:
- `NVIDIACanvas_Setup.exe` (the installer, not the app)
- `Uninstall.exe` (the uninstaller)

Make sure you select `NVIDIACanvas.exe` (the actual application)

---

## Using NVIDIA Canvas with Mossy

### Launch via AI Assistant

You can ask Mossy to open Canvas:
- "Open NVIDIA Canvas"
- "Launch Vita Canvas"
- "Start Canvas for me"

### Launch via External Tools

1. Go to **Settings** → **External Tools**
2. Find **"NVIDIA Canvas (Vita Canvas)"**
3. Click **"Test Launch"** or launch from Mossy's tool panel

---

## Integration with Fallout 4 Modding

### Workflow

1. **Generate Base Texture in Canvas**
   - Paint terrain (mountains, grass, sky)
   - Export as high-res PNG

2. **Process in GIMP/Photopea**
   - Adjust colors, contrast
   - Add weathering effects
   - Crop to power-of-2 dimensions (512, 1024, 2048, 4096)

3. **Convert to DDS**
   - Use NVIDIA Texture Tools or GIMP DDS plugin
   - BC7 for color textures
   - BC5 for normal maps

4. **Import to Creation Kit**
   - Place in `Data/Textures/YourMod/`
   - Reference in material files

---

## Alternative Names

NVIDIA Canvas is sometimes called:
- **Vita Canvas** (informal name)
- **Canvas** (short name)
- **GauGAN** (the AI technology behind it)

All these names work with Mossy's launch commands!

---

## Support

If you're still having issues:
1. Verify NVIDIA Canvas is installed
2. Check you have the correct path in settings
3. Test launch from Windows Explorer first
4. Make sure your GPU supports it (RTX required)

For more help, check NVIDIA's official documentation or ask Mossy!
