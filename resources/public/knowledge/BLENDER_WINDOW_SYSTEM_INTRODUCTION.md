# Blender Window System Introduction

After starting Blender and closing the Splash Screen, the Blender window should look similar to a standard layout with three main parts.

## Main Window Components

Blender's interface is separated into three main parts:

### Topbar
Located at the very top of the window, the Topbar consists of the main menu, which is used for:
- Saving, importing and exporting files
- Configuring settings
- Rendering
- And other core functions

### Areas
The middle section is the main workspace, where you perform modeling, rendering, animation, and other creative tasks. Areas are subdivisions of the Blender window that contain different editors (3D Viewport, Shader Editor, Timeline, UV Editor, etc.).

### Status Bar
At the bottom of the window, the Status Bar displays:
- Shortcut suggestions for current operations
- Relevant statistics about your scene
- Notifications and messages from operations

## Customization

Blender's interface is highly customizable to match your workflow and preferences.

### Keyboard Shortcuts

Blender makes heavy use of keyboard shortcuts to speed up work. These can be customized in the **Keymap Editor**:

1. Open Preferences (Edit → Preferences on Windows/Linux, Blender → Preferences on macOS)
2. Navigate to the **Keymap** tab
3. Search for or expand the category containing the shortcut you want to modify
4. Click on the shortcut binding and press your desired keys
5. Confirm the change

Common customizations include:
- Selection operations (box select, circle select, lasso select)
- Transform tools (move, rotate, scale)
- View navigation (pan, zoom, orbit)
- Tool switching (creating custom shortcuts for frequently used tools)

### Theme Colors

Blender allows for most of its interface colors to be changed to suit your needs and visual preferences. If you find that the colors you see on screen do not match those in the Manual, it could be that your default theme has been altered.

To customize colors:

1. Open Preferences (Edit → Preferences)
2. Click on the **Themes** tab
3. Select a preexisting theme or create a new one
4. Modify individual color settings:
   - Click on any colored swatch to open a color picker
   - Adjust hue, saturation, value, or enter hex codes
5. Apply your changes immediately

Popular themes include:
- **Blender Light** - Light background with dark text (useful for bright environments)
- **Blender Dark** - Dark background with light text (reduces eye strain in low-light)
- **Industry Compatible** - Matches other software UI conventions

### Accessibility

Blender has several options for visibility customization to support users with different accessibility needs:

**Resolution Scale**
- Adjusts the overall scale of UI elements
- Useful for high-DPI displays or for users who need larger interface elements
- Range: 0.5 to 2.0 (50% to 200%)

**Custom Fonts**
- Load custom fonts for the interface
- Helps users with dyslexia or visual impairments
- Supports system fonts and custom TTF files

**Additional Settings**
- Color blindness support (customizable color palettes)
- High contrast mode
- Animation speed adjustments

These settings can be configured in the **Interface Preferences**:

1. Open Preferences (Edit → Preferences)
2. Click on **Interface** in the left menu
3. Adjust:
   - Resolution Scale slider
   - Font settings
   - Display options
   - Animation timing

## Getting Started with Customization

### Quick Tips

1. **Don't be afraid to explore** - Any changes to keyboard shortcuts or colors can be reverted by using the default presets.
2. **Start with presets** - Select a built-in theme or keymap variant that's close to your preference, then make small adjustments.
3. **Save custom settings** - After customizing, your settings are saved to your user profile and will persist between sessions.
4. **Use Preferences frequently** - The Preferences window (Edit → Preferences) is your main hub for all customization.

## Related Documentation

- [Preferences](/BLENDER_PREFERENCES.md) - Comprehensive preferences guide
- [Keymap](/BLENDER_KEYMAP.md) - Keyboard shortcuts and custom keymaps (when available)
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
- [Configuring Peripherals](/BLENDER_CONFIGURING_PERIPHERALS.md) - Hardware setup and input device configuration
