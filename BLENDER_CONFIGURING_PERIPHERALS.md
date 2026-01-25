# Configuring Peripherals in Blender

Blender supports a wide range of input and display hardware. This guide covers displays, input devices, and head-mounted displays (VR).

## Displays

**Recommendation:** Full HD (1920×1080) or higher.

Blender fully supports multi-monitor setups. Workspaces can span multiple monitors for expanded workspace and increased productivity.

## Input Devices

Blender supports:
- Keyboard (recommended: English layout with numeric keypad)
- Mouse (recommended: 3-button with scroll wheel)
- Graphic Tablet
- Touchpad
- NDOF Device (3D Mouse, e.g., SpaceMouse)

**Note:** Emulations for missing hardware (middle button, numpad) are available in Preferences but may reduce access to certain shortcuts.

## Mouse

**Recommended:** 3-button mouse with scroll wheel (scroll wheel acts as middle button).

### Mouse Button Emulation
If you have a 2-button mouse, emulate the 3-button via Preferences → Input → Mouse → Emulate 3 Button Mouse:

| Action | 3-Button Mouse | 2-Button Mouse |
|--------|----------------|----------------|
| Left Click | LMB | LMB |
| Middle Click | MMB | Alt + LMB |
| Right Click | RMB | RMB |

## Keyboard

**Recommended:** Full-sized keyboard with numeric keypad (104-key layout).

### Numpad Emulation
If your keyboard lacks a numeric keypad, enable Preferences → Input → Keyboard → Emulate Numpad. This uses the top number row instead, but loses access to those keys' original functions (e.g., selection mode switching in Edit Mode).

### Non-English Keyboards
If using a non-English layout, consider switching to US or UK layout in Blender for optimal shortcut compatibility. Change keymaps via Preferences → Input → Keymap if needed.

## Touch Screens

For touch-enabled devices, enable these Preferences settings:

- **Show Handles:** simplifies area resizing and management.
- **Increase Border Width:** makes area edges easier to select with a finger.

## Graphic Tablet

Graphics tablets provide pen-based mouse control with pressure sensitivity, ideal for artists accustomed to painting and drawing.

**Troubleshooting:** If pressure sensitivity fails, try placing the mouse pointer in the Blender window and reconnecting the tablet.

## Touchpad

**Supported on:** Windows, macOS, Linux (Wayland).

Use multi-touch gestures from Preferences → Input → Touchpad:

| Gesture | Effect |
|---------|--------|
| Pan | Shift + two-finger drag |
| Zoom | Ctrl/Cmd + two-finger drag |
| Orbit | Two-finger drag |
| Emulate right-click | Two-finger tap |

## NDOF (3D Mouse)

**Supported:** 3Dconnexion devices (e.g., SpaceMouse).

NDOF devices enable intuitive scene navigation and simplify Fly/Walk modes. Configure via Preferences → Input → NDOF. The NDOF device menu button also provides quick access to settings.

## Head-Mounted Displays (Virtual Reality)

Blender supports VR via the **OpenXR** multi-platform standard for immersive scene inspection.

### Supported Platforms

| Platform | OS | Notes |
|----------|----|----|
| HTC Vive Cosmos | Windows | Developer Preview |
| HTC Vive Focus 3 | Windows | Developer Preview |
| Monado | GNU/Linux | Testing only; not production-ready |
| Meta (Oculus Rift/Quest) | Windows | Requires Oculus v31+ Software Update |
| SteamVR | Windows, GNU/Linux | Requires SteamVR 1.16+ |
| Varjo | Windows | Full OpenXR support |
| Windows Mixed Reality | Windows | Requires Windows 10 May 2019 Update (1903) |

### VR Setup Steps

**All Platforms:**
1. Install platform-specific software (see details below).
2. Enable the **VR Scene Inspection** add-on in Blender (Preferences → Add-ons → search "VR").

**HTC Vive Cosmos:**
- Follow steps from Vive Developer Forums.
- Enable VR Scene Inspection add-on.

**HTC Vive Focus 3:**
- Follow steps from Vive Developer Forums.
- Enable VR Scene Inspection add-on.

**Monado (Linux, testing only):**
- Install packages (Ubuntu/Debian available).
- Compile from source for other systems (not recommended for beginners).
- Enable VR Scene Inspection add-on.

**Meta (Oculus Rift/Quest):**
- Download and install Oculus Rift/Oculus Link software.
- Set Oculus as active OpenXR runtime in Oculus App Settings → General.
- Enable VR Scene Inspection add-on.
- **Passthrough:** disabled by default in Quest Link; manually enable in app settings if desired.
- **Tip:** Use USB direct or Ethernet for better passthrough performance.

**SteamVR:**
- Install SteamVR 1.16 or later.
- Set SteamVR as active OpenXR runtime in SteamVR Settings → Developer.
- Enable VR Scene Inspection add-on.
- **Note:** SteamVR runtime also works with Vive Cosmos, Oculus, and Windows Mixed Reality.

**Varjo:**
- Install Varjo Base software (includes OpenXR support).
- Enable VR Scene Inspection add-on.

**Windows Mixed Reality:**
- Ensure Windows 10 May 2019 Update (1903) or later.
- Verify system meets requirements using Windows Mixed Reality PC Check (Microsoft Store).
- Launch Mixed Reality Portal → menu (⋯) → Set up OpenXR.
- Enable VR Scene Inspection add-on.
- **Switching runtimes:** download OpenXR Developer Tools (Microsoft Store) and set Windows Mixed Reality as active.

## Related Docs
- Input Preferences: [BLENDER_PREFERENCES.md](BLENDER_PREFERENCES.md)
- Add-on installation: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
