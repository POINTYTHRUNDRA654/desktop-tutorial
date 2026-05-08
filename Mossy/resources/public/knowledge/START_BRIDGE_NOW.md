# START THE MOSSY BRIDGE - Quick Instructions

## The Problem
- ✓ Blender addon is running (port 9999)
- ✗ Mossy Bridge is NOT running (port 21337)
- Result: Mossy detects Blender, but can't send commands to it

## Solution: Start the Bridge

### **Option 1: From Mossy Desktop App (Easiest)**

1. **Open Mossy Desktop app**
2. Go to the **Bridge** panel (look for "DesktopBridge" tab or settings area)
3. Click **"Download mossy_server.py"** button
4. Click **"Download start_mossy.bat"** button
5. **Open the downloaded files** (usually in Downloads folder)
6. **Double-click "start_mossy.bat"**
7. A PowerShell window should open and show:
   ```
   [MOSSY BRIDGE] Initializing Neural Link on port 21337...
   ```
8. **Leave this window open** (the Bridge runs in the background)

### **Option 2: Manual PowerShell (if .bat doesn't work)**

```powershell
# Open PowerShell in the project folder
cd "D:\Projects\desktop-tutorial\desktop-tutorial"

# Install dependencies
python -m pip install flask flask-cors mss pyautogui pyperclip psutil

# Start the Bridge
python mossy_server.py
```

You should see:
```
[MOSSY BRIDGE] Initializing Neural Link on port 21337...
[MOSSY BRIDGE] Capabilities: Screen (Eyes), Clipboard (Hands), Hardware (Senses)
[MOSSY BRIDGE] Hardware Endpoint: Ready (v3.0)
```

---

## After Starting the Bridge

1. **Go back to Blender**
2. Scene Properties → Mossy Link panel
3. Click **"Test Bridge Connection"** button
4. Should show: ✓ "Mossy Bridge is RUNNING on port 21337!"
5. Status should change from "Inactive" to **"✓ Active"**

6. **Go back to Mossy Desktop**
7. The setup test should complete successfully
8. Should show: ✓ "Connected via Localhost! (v3.0)"

---

## Now Test It Works

Ask Mossy in chat:
- *"Create a UV sphere in the center"*
- *"Scale it by 2"*
- *"Tell me what objects are in the scene"*

Check Blender—the sphere should appear and move!

---

## Troubleshooting

**If .bat file doesn't open:**
- Right-click → Edit → Make sure it has the Python path
- Or use Option 2 (manual PowerShell)

**If you get "Port 21337 already in use":**
- Another Bridge instance is running
- PowerShell: `taskkill /F /IM python.exe` (kills all Python processes)
- Or restart computer

**If Bridge starts but Blender still says "Disconnected":**
- In Blender, toggle "Toggle Mossy Link Server" off/on
- Then check Test Bridge Connection again

---

**Keep the Bridge running while you use Mossy!**
