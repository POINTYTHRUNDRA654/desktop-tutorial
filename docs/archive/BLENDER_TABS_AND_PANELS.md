# Blender Tabs & Panels

Tabs and Panels are fundamental organizational units in the Blender user interface. Understanding how to use and customize them helps you work more efficiently.

## Tabs

Tabs are used to control overlapping sections in the user interface. The content of only one Tab is visible at a time. Tabs are listed in a Tab header, which can be horizontal or vertical.

### Tab Headers

- **Horizontal Tab headers** - Typically appear in the Topbar (workspaces, scene selection)
- **Vertical Tab headers** - Appear in sidebars and property editors, showing tab icons

### Switching and Cycling Tabs

Vertical tabs can be switched in several ways:

**Ctrl-Wheel**
- Hover your mouse over the tab region and scroll with Ctrl-Wheel to cycle through tabs
- Works from anywhere in the tab area

**Ctrl-Tab and Shift-Ctrl-Tab**
- **Ctrl-Tab** - Cycle forward through tabs
- **Shift-Ctrl-Tab** - Cycle backward through tabs
- Works globally when the mouse is in the tab region

**Click and Drag on Tab Header**
- Press down LMB and move the mouse over the tab header icons to switch tabs
- Useful for quickly flipping through multiple tabs

**Numpad Period**
- **NumpadPeriod** - Scrolls to the active tab in case it is out of view
- Useful when you have many tabs and the active one is hidden

### Note on Workspace Tabs

These shortcuts do **not apply to Workspace tabs**. See the Workspace controls section in the Workspaces documentation for workspace-specific controls.

## Panels

A panel is the smallest organizational unit in the user interface. The panel header shows the title of the panel and is always visible. Some panels also include subpanels (nested panels within a panel).

### Panel Structure

**Panel Header**
- Shows the title of the panel
- Always visible, even when the panel is collapsed
- Contains controls for expanding/collapsing and other options

**Panel Content**
- The properties, settings, and controls within the panel
- Only visible when the panel is expanded

**Subpanels**
- Panels nested within a parent panel
- Can be collapsed/expanded independently
- Useful for organizing related properties

### Collapsing and Expanding

A panel can either be expanded to show its contents, or collapsed to hide its contents.

**Visual Indicators**
- **Down-arrow (▼)** - Indicates an expanded panel
- **Right-arrow (►)** - Indicates a collapsed panel

**Keyboard and Mouse Controls**

**LMB on panel header**
- Click the left mouse button on any part of the panel header to expand or collapse it

**A key**
- Press **A** to expand/collapse the panel under the mouse pointer
- Quick way to toggle panels without clicking

**Ctrl-LMB on collapsed panel header**
- Expands the panel and collapses all other panels at the same level
- Useful for focusing on one panel at a time

**Ctrl-LMB on expanded panel header**
- Expands or collapses all subpanels within that panel
- Useful for showing/hiding detailed options

**Drag over multiple headers**
- Press and hold LMB and drag over multiple panel headers to expand or collapse many at once
- Efficient for reorganizing large property lists

### Panel Position

You can change the position of a panel within its region by:

1. Locate the **grip widget** (::::) on the right side of the panel header
2. Click and drag the grip widget to move the panel up or down
3. The panel will shift position within the same tab region

**Use Case**: Rearrange panels in the Sidebar or Properties editor to put frequently-used panels at the top for faster access.

## Pinning Panels

Sometimes it is desirable to view panels from different tabs at the same time. For example, having access to a camera's properties while other objects are selected. This is solved by making panels pinnable.

A pinned panel remains visible regardless of which tab has been selected.

### How to Pin a Panel

**Method 1: Pin Icon**
1. Click the **pin icon** (📌) in the panel header
2. The panel becomes pinned and stays visible when switching tabs

**Method 2: Right-Click Menu**
1. Right-click on the panel header
2. Select **Pin** from the context menu
3. The panel becomes pinned

**Method 3: Shift-LMB**
1. Hold Shift and click with the left mouse button on the panel header
2. The panel becomes pinned

### Unpinning a Panel

- Click the pin icon again to unpin the panel
- Or use the right-click menu and deselect Pin

### Availability Note

Pinning is not available for all panels. For example:

- **Available** - Sidebar panels, many custom property panels
- **Not Available** - Some Properties editor panels, certain workspace-specific panels

**Tip**: Check the context menu (right-click) on a panel header to see if pinning is available for that panel.

## Presets

Panels in Blender provide a **Presets menu** (gear icon ⚙) for quickly reusing common settings. Presets can save time by storing frequently used configurations, which can then be reapplied with a single click.

### Presets Menu Components

The Presets menu typically includes:

**Selector List**
- A list of available presets
- Selecting one will apply the stored values to the relevant properties
- Appears at the top of the menu

**Preset Name Input Field**
- Text field where you enter the name for a new preset
- Used before clicking the Add button to create a new preset

**Add Button (+)**
- Create a new preset using the current settings
- The preset is then saved and appears in the selector list for future reuse
- The name comes from the Preset Name field above

**Remove Button (X)**
- Deletes the selected preset from the list
- Use with caution as deletion is permanent

### Creating a Preset

1. Configure the panel settings to your preferred values
2. Enter a descriptive name in the **Preset Name** field
3. Click the **Add** button (+ icon)
4. Your preset is now saved and appears in the Selector list

**Example**: Create a "Soft Brush" preset by:
1. Adjusting brush settings (size, hardness, opacity, etc.)
2. Typing "Soft Brush" in the Preset Name field
3. Clicking Add
4. The preset is now available for any future brush selection

### Using a Preset

1. Open the Presets menu (gear icon) in any panel with presets
2. Select a preset from the Selector list
3. All stored values are instantly applied to the current panel

### Advanced: Editing Presets Directly

Presets are stored as Python files in Blender's configuration directory. Advanced users can:

- **Edit preset files directly** - Fine-tune settings beyond what the UI offers
- **Copy presets to other systems** - Share presets with teammates or across different computers
- **Create custom presets programmatically** - Write Python scripts to generate presets

**Preset Location** (varies by OS):

- **Windows**: `C:\Users\<YourUsername>\AppData\Roaming\Blender\<version>\scripts\presets\`
- **macOS**: `~/Library/Application Support/Blender/<version>/scripts/presets/`
- **Linux**: `~/.config/blender/<version>/scripts/presets/`

**Tip**: Presets are organized by category (brush_presets, operator_presets, camera_presets, etc.) in subdirectories.

## Common Preset Use Cases

1. **Brush Presets** - Save preferred brush settings for painting, sculpting, or texture work
2. **Render Presets** - Store render settings for different quality levels (draft, final, ultra)
3. **Animation Presets** - Save keyframe interpolation or easing settings
4. **Material Presets** - Store common material configurations
5. **Camera Presets** - Save lens configurations for different shot types

## Practical Workflow Tips

1. **Collapse unused panels** - Hide panels you don't need to reduce visual clutter
2. **Use Pin for multi-tasking** - Pin a properties panel from one object while selecting others
3. **Organize with drag** - Use the grip widget to move important panels to the top
4. **Create presets early** - Save presets for settings you use repeatedly to save time
5. **Name presets clearly** - Use descriptive names like "High Poly Sculpt Brush" instead of "Brush1"
6. **Share presets** - Copy preset files to share configurations with your team
7. **Ctrl-LMB to isolate** - Use Ctrl-LMB on a panel header to focus on just that panel
8. **Cycle with keyboard** - Use Ctrl-Wheel or Ctrl-Tab to quickly navigate tabs without the mouse

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of interface components
- [Regions](/BLENDER_REGIONS.md) - Regions that contain tabs and panels
- [Workspaces](/BLENDER_WORKSPACES.md) - Workspace-specific tab controls
- [Preferences](/BLENDER_PREFERENCES.md) - Configure panel and tab behavior
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and tooltips
