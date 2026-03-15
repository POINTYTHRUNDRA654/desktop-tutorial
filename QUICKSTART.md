# Quick Start Guide

This guide will help you get started with the Desktop Tutorial Integration add-on for Blender in just a few minutes.

## Step 1: Install the Add-on

1. Download the `__init__.py` file from this repository
2. Open Blender
3. Go to **Edit → Preferences → Add-ons**
4. Click the **Install...** button at the top
5. Navigate to the downloaded `__init__.py` file
6. Click **Install Add-on**
7. Enable it by checking the checkbox next to "Development: Desktop Tutorial Integration"

## Step 2: Start the Example Tutorial Server

Open a terminal/command prompt and run:

```bash
python example_tutorial_server.py
```

You should see:
```
Desktop Tutorial Server
Server running on http://localhost:8080
Waiting for connections from Blender add-on...
```

## Step 3: Connect Blender to the Tutorial Server

1. In Blender, press **N** to show the sidebar (if it's not already visible)
2. Click on the **Tutorial** tab
3. You'll see the "Desktop Tutorial" panel
4. Click **Connect to Tutorial App**
5. The status should change to "✓ Connected"

## Step 4: Try the Tutorial Controls

Now you can:
- Click **Next Tutorial Step** to advance to the next step
- Click **Mark Step Complete** to mark the current step as done
- Watch the server console to see events being logged

## Step 5: Configure Settings (Optional)

1. Go to **Edit → Preferences → Add-ons**
2. Find "Desktop Tutorial Integration" and expand it
3. Configure:
   - **Server Host**: Change if your tutorial app runs on a different machine
   - **Server Port**: Change if using a different port
   - **Auto Connect**: Enable to connect automatically when Blender starts

## Troubleshooting

### Panel not visible?
- Press **N** in the 3D Viewport
- Look for the "Tutorial" tab on the right sidebar

### Cannot connect?
- Make sure the tutorial server is running
- Check that the host/port settings match
- Verify no firewall is blocking the connection

### Add-on won't enable?
- Make sure you're using Blender 2.80 or higher
- Check the Blender console (Window → Toggle System Console) for errors

## What's Next?

- Read the full [README.md](README.md) for detailed documentation
- Check [DEVELOPMENT.md](DEVELOPMENT.md) if you want to customize the add-on
- Modify `example_tutorial_server.py` to integrate with your own tutorial application

## Example Tutorial Flow

1. Start the server
2. Connect Blender
3. Server shows "Step 1: Introduction - Welcome to the Blender tutorial!"
4. Complete actions in Blender
5. Click "Mark Step Complete"
6. Click "Next Tutorial Step"
7. Repeat for each tutorial step

## Customization

To integrate with your own desktop tutorial app:
1. Implement the same HTTP endpoints as `example_tutorial_server.py`
2. Or modify `__init__.py` to match your app's API
3. Configure the host/port in Blender preferences

Enjoy your integrated Blender tutorial experience!
Get started with the Fallout 4 Tutorial Add-on in 5 minutes!

## Installation (30 seconds)

1. Download the add-on
2. In Blender: `Edit > Preferences > Add-ons > Install`
3. Select the add-on folder/zip
4. Enable "Fallout 4 Tutorial Helper"
5. Press `N` in 3D Viewport to see the "Fallout 4" tab

## Your First Mesh (2 minutes)

### Create
1. Click **"Create Base Mesh"** in Mesh Helpers panel
2. A FO4-optimized cube appears

### Edit
1. Press `Tab` to enter Edit Mode
2. Select faces and press `E` to extrude
3. Shape your object
4. Press `Tab` to exit Edit Mode

### Optimize
1. Click **"Optimize for FO4"**
2. Your mesh is now FO4-ready!

### Validate
1. Click **"Validate Mesh"**
2. Check for any warnings
3. Fix issues if needed

## Add Textures (1 minute)

1. Select your mesh
2. Click **"Setup FO4 Materials"**
3. Click **"Install Texture"**
4. Choose "Diffuse" and select a texture file
5. Repeat for Normal and Specular maps
6. Click **"Validate Textures"**

## Export (30 seconds)

1. Select your mesh
2. Click **"Validate Before Export"**
3. Fix any issues
4. Click **"Export Mesh (.nif)"**
5. Choose save location
6. Done! (FBX file created, convert to NIF with external tools)

## Next Steps

- **Learn More**: Read TUTORIALS.md for detailed walkthroughs
- **Advanced**: Check API_REFERENCE.md for scripting
- **Help**: See FAQ.md for common questions

## Keyboard Shortcuts

While in Blender:
- `N` - Toggle sidebar (to see add-on)
- `Tab` - Toggle Edit Mode
- `E` - Extrude (in Edit Mode)
- `S` - Scale
- `R` - Rotate
- `G` - Move/Grab
- `Ctrl+A` - Apply transformations

## Tips

✅ **Do:**
- Validate before exporting
- Apply scale (Ctrl+A > Scale)
- Keep poly count under 65k
- Use power-of-2 texture sizes

❌ **Don't:**
- Skip validation steps
- Export without UV maps
- Use extremely high poly counts
- Forget to save your work

## Need Help?

- Read the full README.md
- Check FAQ.md
- Look at example_script.py
- Visit Fallout 4 modding forums

Happy modding! 🎮
