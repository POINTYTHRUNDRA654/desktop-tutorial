# Blender Splash Screen

When starting Blender, the splash screen appears in the center of the window. It contains options to create new projects or open recent ones.

## Closing the Splash Screen

To close the splash screen and start a new project:

- **Click** anywhere outside the splash screen (but inside the Blender window), or
- **Press** Esc

The splash screen will disappear, revealing the default Blender workspace. 

To reopen the splash screen at any time, click on the **Blender icon** in the Topbar and select **Splash Screen**.

## Splash Screen Components

### Splash Image

The upper part of the splash screen displays the splash image with the **Blender version** number in the top right corner. This helps you quickly identify which version of Blender is running.

### Interactive Region

The interactive region is the bottom half of the splash screen and contains several options:

#### New File

Start a new project based on a template. Options typically include:

- **General** - Standard empty scene (default)
- **2D Animation** - Grease Pencil optimized setup
- **3D Modeling** - Basic modeling scene
- **Sculpting** - Sculpt mode workspace with optimal settings
- **VFX** - Compositing and tracking setup
- **Motion Tracking** - Camera tracking workspace
- **And other specialized templates**

Each template pre-configures workspaces, units, and render settings appropriate for the workflow.

#### Recent Files

Your most recently opened blend-files are listed here. This gives quick and easy access to your recent projects. The list includes:

- File name
- Modification date
- File size
- Full path (on hover)

Click any recent file to open it immediately.

#### Open

Opens a file browser dialog that allows you to navigate to and open an existing blend-file from anywhere on your system.

#### Recover Last Session

Blender will try to recover the last session based on temporary files. This is useful if Blender crashes or unexpectedly closes. See the **Recovering Data** section in the Blender manual for more details on data recovery.

#### What's New

Opens the latest release notes for your version of Blender in a web browser. This is useful for:

- Learning about new features
- Understanding deprecations or changes
- Reviewing bug fixes and improvements
- Checking known issues

#### Donate to Blender

Opens Blender's Development Fund website in your web browser. This allows you to support Blender's continued development through donations, sponsorships, or other contributions.

## First-Time Setup

When starting Blender for the first time or updating to a new version, the interactive region contains a **Quick Set Up Process** that guides you through initial configuration:

- **Language selection** - Choose your interface language
- **Keymap preference** - Select between Blender, 2.7x, or Industry Compatible keymaps
- **Theme selection** - Choose a color theme
- **Spacebar action** - Configure whether spacebar triggers Play, Tools, or Search

This quick setup helps new users get started and allows experienced users updating Blender to match their previous configuration.

## Tips

1. **Templates save time** - Use templates for specialized workflows to get pre-configured scenes and workspaces.
2. **Recent files are persistent** - Your recent files list persists between Blender sessions, so you can always quickly return to your work.
3. **Recover often fails gracefully** - If recovery data is unavailable, Blender will simply open an empty scene.
4. **Check What's New** - Always review release notes when updating to learn about new features that might improve your workflow.

## Related Documentation

- [Window System Introduction](/BLENDER_WINDOW_SYSTEM_INTRODUCTION.md) - Overview of the main Blender interface
- [Preferences](/BLENDER_PREFERENCES.md) - Full preferences configuration including startup options
- [Help System](/BLENDER_HELP_SYSTEM.md) - Built-in help and resources
