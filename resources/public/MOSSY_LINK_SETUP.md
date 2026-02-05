# Mossy Link Add-on for Blender 4.5.5+ (v3.0)

This add-on enables **real-time AI-driven control** of Blender from Mossy v3.0 (the OmniForge AI assistant).

## What It Does

- **AI Script Execution**: Mossy can write and execute Python scripts directly in Blender
- **Real-time Communication**: Socket server on port 9999 for instant command execution
- **Scene Control**: Select objects, create geometry, modify properties—all via AI instructions
- **Feedback Loop**: Results are returned to Mossy for further processing

## Installation

### Step 1: Download the Add-on
1. Download `mossy_link_addon.py` from the OmniForge app or public folder
2. Save it somewhere accessible (e.g., Downloads folder)

### Step 2: Install in Blender 4.5.5+
1. **Open Blender**
2. Go to **Edit → Preferences**
3. Click **Add-ons** tab
4. Click **Install...** button (top right)
5. Navigate to where you saved `mossy_link_addon.py`
6. Select it and click **Install Add-on**

### Step 3: Enable the Add-on
1. In the Add-ons search box, type **"Mossy Link"**
2. Find "Mossy Link - AI Assistant Integration"
3. Check the **checkbox** to enable it

### Step 4: Verify It's Running
1. The add-on panel should appear in the **Scene Properties** (right panel in the 3D view)
2. You should see "✓ Active" status
3. It shows: "Listening on: 127.0.0.1:9999"

## Usage

### Automatic (Recommended)
Once installed and enabled, **Mossy automatically detects it**:
- When you launch Blender with the add-on active, Mossy will see it
- You can then ask her: *"Create a cube and scale it by 2"*
- She'll execute the command directly in your scene

### Manual Toggle
- In the Mossy Link panel, click **"Toggle Mossy Link Server"** to start/stop manually
- Status updates in real-time

## Supported Commands

| Command | Example | Result |
|---------|---------|--------|
| **Script** | Execute Python code | Runs in Blender context |
| **Select** | Select object by name | Activates object |
| **Create** | Create mesh/light/etc | New object in scene |
| **Property** | Get object property | Returns value |
| **Status** | Check scene state | Version, objects, etc |

## Example: Mossy Commands

```
"Create a UV sphere in the center"
→ Mossy executes: bpy.ops.mesh.primitive_uv_sphere_add(location=(0,0,0))

"Scale the selected object by 2 on the X axis"
→ Mossy executes: bpy.context.object.scale.x = 2

"Select the object named 'Cube'"
→ Mossy executes: select command to activate that object
```

## Troubleshooting

### "Blender Link is offline"
- **Solution**: Make sure the add-on is installed AND enabled in Blender preferences
- Check that Blender is actually running
- Try clicking "Toggle Mossy Link Server" to reconnect

### Port 9999 already in use
- **Solution**: Close other applications using port 9999, or:
  - Edit `mossy_link_addon.py` line 47: change `port=9999` to another port (e.g., `9998`)
  - Reinstall the add-on

### Script execution fails with "ImportError: No module named 'X'"
- **Solution**: The module is not installed in Blender's Python
- Use Blender's package manager or install via `pip` in Blender's Python path

### Add-on doesn't appear in preferences
- **Solution**: Make sure you saved the file with `.py` extension
- Try restarting Blender
- Check the Console (Window → Toggle System Console) for error messages

## System Requirements

- **Blender**: 4.5.0 or newer
- **Python**: 3.10+ (included with Blender)
- **Port 9999**: Must be available on localhost
- **OS**: Windows, macOS, or Linux

## Advanced: Manual Configuration

### Change the Server Port
Edit the add-on file `mossy_link_addon.py`:
```python
# Line 47
mossy_server = MossyLinkServer('127.0.0.1', 9999)  # ← Change 9999 to your port
```

### Disable Auto-Start
Modify the `register()` function to comment out auto-start:
```python
def register():
    # ... registration code ...
    
    # Auto-start server on load (comment out to disable)
    # mossy_server = MossyLinkServer('127.0.0.1', 9999)
```

## Uninstall

1. Go to **Edit → Preferences → Add-ons**
2. Search for "Mossy Link"
3. Click the **dropdown** on the add-on entry
4. Click **Remove**
5. Save Preferences

---

**Questions?** Check the OmniForge documentation or Mossy can help troubleshoot!
