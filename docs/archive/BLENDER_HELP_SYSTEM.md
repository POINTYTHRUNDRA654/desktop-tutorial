# Blender Help System

Blender has a range of built-in and web-based help options to assist you with learning and troubleshooting.

## Tooltips

After hovering the mouse cursor over a button or setting for a few moments, a tooltip will appear with helpful information about that control.

### Tooltip Elements

Context-sensitive tooltips might contain any of these elements:

**Short Description**
- Related details depending on the control.

**Shortcut**
- A keyboard or mouse shortcut associated with the tool.

**Value**
- The value of the property.

**Color Preview**
- Hovering over a color property will display a large swatch preview of the color and the color's hexadecimal (hex), RGBA, and HSVA values.

**Library**
- Source file of the active object. See also Linked Libraries.

**Disabled (red)**
- The reason why the value is not editable.

**Python**
- When Python Tooltips are enabled in Preferences, a Python expression is displayed for scripting (usually an operator or property). This is useful for automating tasks via the Python Console.

## Context-Sensitive Manual Access

You may want to access help for a tool or area from within Blender directly.

### How to Access

To access help for a button or tool:

1. Hover the cursor over the tool or button you need help with.
2. Press **F1** or right-click and select **Online Manual** from the context menu.
3. A web page relating to the button under the cursor will open, supporting both tool and value buttons.

### Coverage Note

Blender does not currently have 100% coverage of all tools in the manual. You may see an alert in the info header if a tool does not have a direct link to the manual. In those cases, buttons may link to more general sections of the documentation instead.

## Help Menu

The Help Menu provides direct links to Blender-related resources and information.

### Web Links

The first options in the Help Menu provide direct links to Blender-related websites. The same links can also be found in the Splash Screen.

**Manual**
- Link to the Official Blender Manual.

**Support**
- Links to various sites, providing both community and professional support options.

**User Communities**
- Lists of many different community sites and support venues where you can connect with other Blender users.

**Get Involved**
- Learn how to give back to the Blender community by contributing to projects or donating.

**Release Notes**
- Link to the release notes for your current Blender version.

### Bug Reporting

**Report a Bug**
- Opens the Blender Bug Tracker (registration required). For more information on bug reporting, see the Reporting a Bug guide.

### System Information

**Save System Info**
- Extracts system information which can be useful for including in bug reports, inspecting the configuration, or diagnosing problems.

When selected, you will be prompted to save a text file called `system-info.txt`.

#### System Info Contents

The system-info.txt file contains the following sections:

**Blender**
- Blender version
- Build configuration details
- Path in which Blender is running

**Python**
- Version of your Python installation
- Path to Python

**Directories**
- Paths used for scripts, data files, presets, and temporary files
- These directories are configured using the Preferences Editor

**FFmpeg**
- Version of installed FFmpeg components
- Available codecs

**Other Libraries**
- Versions of other libraries used by Blender such as:
  - OpenColorIO
  - Alembic
  - USD
  - And others

**GPU**
- GPU vendor
- GPU version
- Capabilities of your hardware
- Driver capabilities

**Implementation Dependent GPU Limits**
- Specific limits on GPU functions related to how the current version of Blender was compiled.

**Cycles**
- Instruction sets and capabilities of each hardware render device available for use with Cycles.

**Enabled Add-Ons**
- Lists add-ons currently in use
- Versions and paths of each enabled add-on

## Using System Info for Troubleshooting

The system-info.txt file is invaluable for:

- **Bug Reports:** Include relevant sections when reporting bugs to provide context about your system configuration.
- **Compatibility Checking:** Verify your GPU, drivers, and libraries are up-to-date and compatible.
- **Configuration Auditing:** Review paths and settings to diagnose environment issues.
- **Add-on Debugging:** Check installed add-ons and their versions when troubleshooting add-on behavior.
- **Performance Analysis:** Examine GPU capabilities and Cycles device configurations when optimizing render settings.

## Quick Tips

1. **Hover First:** Always hover over unfamiliar buttons to read their tooltips—this is often the fastest way to learn.
2. **Use F1:** When you need deeper help, press F1 with the cursor over the button you're interested in.
3. **Check the Manual:** Use the Help Menu → Manual link to browse the full official documentation.
4. **Join Communities:** Visit the User Communities link to connect with other users who may have faced similar issues.
5. **Save System Info Before Reporting Bugs:** Having system-info.txt ready speeds up bug report triage.

## Related Documentation

- [Preferences](/BLENDER_PREFERENCES.md) - Configure Python tooltips and other help settings
- [Community Resources](/BLENDER_COMMUNITY.md) - Forums and support channels
- [Add-on Development](/BLENDER_ADDON_TUTORIAL.md) - Learn to create custom tools
