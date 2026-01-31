# Mossy + Blender Connection Diagnostic

**Status:** Both disconnected despite clicking connection button

---

## Quick Diagnosis Checklist

### **Step 1: Verify Blender Add-on is v5.0** ✓
- The addon has been updated to v5.0 to match your Mossy v4.0
- In Blender: Edit → Preferences → Add-ons → Search "Mossy Link"
- Should show: **"Mossy Link - AI Assistant Integration v5.0"**

### **Step 2: Check the Addon is ENABLED**
1. In the Add-ons list, make sure the checkbox next to "Mossy Link v5.0" is **checked** ✓
2. You should see a new panel in **Scene Properties** (right sidebar in 3D view)
3. Look for "Mossy Link" panel with:
   - Status indicator (✓ Active or ○ Inactive)
   - Button: "Toggle Mossy Link Server"
   - Button: **"Test Bridge Connection"** (NEW)

### **Step 3: Click "Test Bridge Connection"**
This is the KEY diagnostic tool. It will tell you **exactly what's wrong**:

**If you see:** ✓ "Mossy Bridge is RUNNING on port 21337!"
- Bridge is fine. Problem is likely in Mossy Desktop app.

**If you see:** ✗ "Bridge NOT running on 21337"
- **ACTION:** You need to start the Mossy Desktop Bridge
- See [Start the Bridge](#start-the-bridge) below

**If you see:** ✗ "Bridge timeout"
- Port 21337 is being blocked by firewall or port conflict
- See [Troubleshooting](#troubleshooting)

---

## Start the Bridge

The **Mossy Desktop Bridge** must be running on port 21337 for Blender commands to work.

### **Option A: Use DesktopBridge UI in Mossy (Easiest)**
1. In Mossy Desktop app, go to the **Bridge** panel
2. Click **"Download mossy_server.py"**
3. Click **"Download start_mossy.bat"** 
4. Run `start_mossy.bat` (it will auto-download deps and start the Bridge)
5. Should see: `[MOSSY BRIDGE] Initializing Neural Link on port 21337...`

### **Option B: Manual Python (if .bat fails)**
```powershell
# In PowerShell
cd D:\Projects\desktop-tutorial\desktop-tutorial
python -m pip install flask flask-cors mss pyautogui pyperclip psutil
python mossy_server.py
```

---

## Expected Connection Flow

1. **Blender addon starts** → Socket server listens on port **9999**
2. **Mossy Bridge runs** → Listens on port **21337**, relays commands
3. **User asks Mossy:** "Create a cube"
   - Mossy generates: `bpy.ops.mesh.primitive_cube_add()`
   - Sends to Bridge (port 21337)
   - Bridge forwards to addon (port 9999)
   - Addon executes in Blender
   - Result sent back to Mossy

---

## Troubleshooting

### **"Mossy Link" panel doesn't appear in Blender**
- ✓ Restart Blender completely (close all windows)
- ✓ Check Console for errors: Window → Toggle System Console
- ✓ Reinstall addon: Preferences → Add-ons → Remove "Mossy Link" → Install fresh

### **"Toggle Mossy Link Server" shows error**
- Port 9999 is already in use
- **Solution:** Change port in addon or kill the process using it:
  ```powershell
  # Find what's using port 9999
  netstat -ano | findstr :9999
  # Kill by PID: taskkill /PID <PID> /F
  ```

### **"Test Bridge Connection" says bridge not running**
- Mossy Bridge (mossy_server.py) is not running
- **Solution:** Start it first (see [Start the Bridge](#start-the-bridge))

### **Firewall blocking ports**
- Windows Defender may block local ports
- **Solution:**
  1. Go to Windows Defender Firewall → Advanced Settings
  2. Inbound Rules → New Rule
  3. Port → TCP → 9999, 21337
  4. Allow all

### **Still says "disconnected" after everything?**
- Check Mossy Desktop app itself:
  1. Go to Settings/External Tools
  2. Verify Blender path is set correctly
  3. Try restarting Mossy app completely

---

## Verify It's Working

Once everything is connected:

**In Blender:**
- Mossy Link panel should show: **"✓ Active"** + **"Status: Connected"**
- Test Bridge button should say: **"✓ Mossy Bridge is RUNNING on port 21337!"**

**In Mossy:**
- Go to Live Chat
- Ask: *"Create a UV sphere in the center"*
- **Check Blender:** A sphere should appear at world origin!

---

## Version Info
- **Mossy Desktop:** v4.0
- **Blender Add-on:** v5.0 (updated)
- **Bridge:** Runs on port 21337
- **Addon Socket:** Listens on port 9999
- **Blender Requirement:** 4.5.0+
