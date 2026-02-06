import{c as C,r as l,s as oe,v as ne,j as e,M as ae,Z as _,b as S,C as I,A as le,S as ie}from"./index-CEqdjNqX.js";import{T as ce}from"./terminal-B8DiE4iy.js";import{E as u}from"./eye-Dh4PfBEc.js";import{D as de}from"./database-V2h3OpNj.js";import{R as D}from"./refresh-cw-DBu6amVw.js";import{T as B}from"./triangle-alert-zWUHrt1_.js";import{D as k}from"./download-BCBaShzR.js";import{B as Y}from"./box-CqrwuAlR.js";import{C as b}from"./clipboard-0cBvso-N.js";import{F as f}from"./folder-open-ChFxcFn0.js";import{K as me}from"./keyboard-D9Ms42eN.js";import{L as pe}from"./lock-DPhdJk5y.js";import{S as xe}from"./search-CnzEPZHT.js";import{H as he}from"./hard-drive-DHH0ZOHn.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ue=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],be=C("circle-question-mark",ue);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fe=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M11 18h2",key:"12mj7e"}],["path",{d:"M12 12v6",key:"3ahymv"}],["path",{d:"M9 13v-.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v.5",key:"qbrxap"}]],ye=C("file-type",fe);/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ge=[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]],ve=C("server",ge),F=[{id:"os_shell",name:"Windows Shell",icon:ce,status:"active",version:"10.0.19045",latency:12,permissions:["fs.read","fs.write","exec"]},{id:"fs_watcher",name:"File System Watcher",icon:u,status:"active",version:"2.1.0",latency:5,permissions:["fs.watch","read.recursive"]},{id:"xedit",name:"xEdit Data Link",icon:de,status:"active",version:"4.0.4",latency:45,permissions:["plugin.read","record.edit"]},{id:"ck",name:"Creation Kit Telemetry",icon:oe,status:"active",version:"1.10",latency:80,permissions:["cell.view"]},{id:"vscode",name:"VS Code Host",icon:ne,status:"inactive",version:"1.85.1",latency:0,permissions:["editor.action","workspace"]}],De=()=>{const[we,Ne]=l.useState(()=>{try{const s=localStorage.getItem("mossy_bridge_drivers");if(s){const t=JSON.parse(s);return F.map(r=>{const o=t.find(d=>d.id===r.id);return o?{...r,status:o.status}:r})}}catch{}return F}),[y,E]=l.useState(()=>{try{const s=localStorage.getItem("mossy_bridge_logs");return s?JSON.parse(s):[]}catch{return[]}}),O=l.useRef(null),[a,g]=l.useState(!1),[p,P]=l.useState(null),[v,H]=l.useState(!1),[w,T]=l.useState(!1),[i,U]=l.useState(null),[R,V]=l.useState(null),[N,G]=l.useState(""),[M,$]=l.useState("C:\\"),[A,W]=l.useState([]),[c,q]=l.useState("setup"),[x,h]=l.useState(localStorage.getItem("mossy_blender_active")==="true");l.useEffect(()=>{var s;(s=O.current)==null||s.scrollIntoView({behavior:"smooth"})},[y]),l.useEffect(()=>{const s=()=>{try{const r=localStorage.getItem("mossy_bridge_logs");r&&E(JSON.parse(r));const o=localStorage.getItem("mossy_bridge_active")==="true";g(o);const d=localStorage.getItem("mossy_bridge_version");P(d);const m=localStorage.getItem("mossy_blender_active")==="true";h(m)}catch{}};s(),window.addEventListener("storage",s),window.addEventListener("mossy-bridge-connected",s);const t=setInterval(s,1e3);return()=>{window.removeEventListener("storage",s),window.removeEventListener("mossy-bridge-connected",s),clearInterval(t)}},[]),l.useEffect(()=>{const s=async()=>{const r=await L(),o=localStorage.getItem("mossy_blender_active")==="true";r!==o&&(localStorage.setItem("mossy_blender_active",r?"true":"false"),h(r),window.dispatchEvent(new CustomEvent("mossy-blender-linked",{detail:r})),r?n("System","Blender add-on connected! (Port 9999 active)","success"):n("System","Blender add-on disconnected. (Enable toggle in Blender)","warn"))},t=setInterval(s,5e3);return s(),()=>clearInterval(t)},[x]);const z=()=>{const s=`
import time
import json
import base64
import os
import threading
import sys
import platform
import subprocess
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# Attempt imports with friendly error
try:
    import mss
    import pyautogui
    import pyperclip
    import psutil
except ImportError as e:
    print(f"\\n[ERROR] Missing dependency: {e.name}")
    print("Please run: pip install flask flask-cors mss pyautogui pyperclip psutil")
    input("Press Enter to exit...")
    sys.exit(1)

# --- CONFIGURATION ---
PORT = 21337
app = Flask(__name__)
# Allow CORS for ALL origins to prevent local network issues
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    # Enable Private Network Access for modern browsers (Chrome/Edge)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

print(f"\\n[MOSSY BRIDGE] Initializing Neural Link on port {PORT}...")
print("[MOSSY BRIDGE] Capabilities: Screen (Eyes), Clipboard (Hands), Hardware (Senses)")
print("[MOSSY BRIDGE] Hardware Endpoint: Ready (v5.0)")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "version": "5.0.0"})

@app.route('/hardware', methods=['GET'])
def get_hardware():
    """Returns real system specifications"""
    try:
        # Memory
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3))
        
        # GPU (Windows specific approach)
        gpu_name = "Generic / Integrated"
        try:
            if platform.system() == "Windows":
                cmd = "wmic path win32_VideoController get name"
                proc = subprocess.check_output(cmd, shell=True).decode()
                lines = [line.strip() for line in proc.split('\\n') if line.strip() and "Name" not in line]
                if lines:
                    gpu_name = lines[0]
        except:
            pass

        return jsonify({
            "status": "success",
            "os": f"{platform.system()} {platform.release()}",
            "cpu": platform.processor(),
            "ram": total_ram_gb,
            "gpu": gpu_name,
            "python": platform.python_version()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/capture', methods=['GET'])
def capture_screen():
    """Takes a screenshot of the primary monitor and returns base64"""
    try:
        with mss.mss() as sct:
            # Capture primary monitor
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            
            # Convert to PNG bytes
            png_bytes = mss.tools.to_png(sct_img.rgb, sct_img.size)
            
            # Encode to base64
            b64_string = base64.b64encode(png_bytes).decode('utf-8')
            
            return jsonify({
                "status": "success",
                "image": f"data:image/png;base64,{b64_string}",
                "resolution": f"{monitor['width']}x{monitor['height']}"
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/clipboard', methods=['POST'])
def set_clipboard():
    """Sets the system clipboard text"""
    try:
        data = request.json
        text = data.get('text', '')
        pyperclip.copy(text)
        return jsonify({"status": "success", "message": "Clipboard updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/files', methods=['POST'])
def list_files():
    """Lists files in a directory"""
    try:
        data = request.json
        path = data.get('path', '.')
        if not os.path.exists(path):
            return jsonify({"status": "error", "message": "Path not found"}), 404
            
        files = []
        for entry in os.scandir(path):
            files.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else 0
            })
        return jsonify({"status": "success", "files": files})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    try:
        # Run on 0.0.0.0 to ensure loopback works from any local address
        app.run(host='0.0.0.0', port=PORT)
    except Exception as e:
        print(f"Failed to start server: {e}")
        input("Press Enter to close...")
      `,t=new Blob([s],{type:"text/x-python"}),r=URL.createObjectURL(t),o=document.createElement("a");o.href=r,o.download="mossy_server.py",document.body.appendChild(o),o.click(),document.body.removeChild(o),n("System","Generated NEW mossy_server.py (v5.0)","success")},K=()=>{const s=`@echo off
title Mossy Bridge Server
echo ===================================================
echo    MOSSY NEURAL LINK - INITIALIZATION SEQUENCE
echo ===================================================
echo.

set PYTHON_CMD=

echo [System] Searching for Python...

:: 1. Check Standard PATH
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [System] Found 'python' in PATH.
    set PYTHON_CMD=python
    goto :FOUND
)

:: 2. Check Python Launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [System] Found 'py' launcher.
    set PYTHON_CMD=py
    goto :FOUND
)

:: 3. Check Common Installation Directories (Deep Search)
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe"
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe"
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python310\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python310\\python.exe"
if exist "C:\\Python312\\python.exe" set PYTHON_CMD="C:\\Python312\\python.exe"
if exist "C:\\Python311\\python.exe" set PYTHON_CMD="C:\\Python311\\python.exe"

if defined PYTHON_CMD (
    echo [System] Found Python at: %PYTHON_CMD%
    goto :FOUND
)

:ERROR
echo.
echo [ERROR] Python was NOT found on this system.
echo.
echo =======================================================
echo                 CRITICAL ERROR
echo =======================================================
echo 1. You likely do NOT have Python installed.
echo 2. Go to https://www.python.org/downloads/
echo 3. Download and Install Python 3.10 or newer.
echo 4. IMPORTANT: Check "Add Python to PATH" in the installer.
echo =======================================================
echo.
pause
exit /b

:FOUND
echo.
echo [1/2] Installing dependencies (flask, mss, pyautogui, psutil)...
%PYTHON_CMD% -m pip install flask flask-cors mss pyautogui pyperclip psutil
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Dependency install failed.
    echo If this is a network error, check your internet.
    echo Attempting to launch anyway...
)

echo.
echo [2/2] Launching Bridge Core...
%PYTHON_CMD% mossy_server.py
pause
`,t=new Blob([s],{type:"text/plain"}),r=URL.createObjectURL(t),o=document.createElement("a");o.href=r,o.download="start_mossy.bat",document.body.appendChild(o),o.click(),document.body.removeChild(o),n("System","Generated improved start_mossy.bat","success")},J=()=>{const s=`
import bpy
import os
import socket
import json
import threading
import time

bl_info = {
    "name": "Mossy Link",
    "author": "POINTYTHRUNDRA654",
    "version": (5, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Mossy",
    "description": "Neural Link for Mossy AI Assistant - Socket-based communication",
    "category": "System",
    "support": "COMMUNITY"
}

# Global socket server
MOSSY_SERVER = None
MOSSY_PORT = 9999
MOSSY_HOST = '127.0.0.1'

class MossySocketServer:
    def __init__(self, host=MOSSY_HOST, port=MOSSY_PORT):
        self.host = host
        self.port = port
        self.socket = None
        self.running = False
        self.thread = None
        
    def start(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(1)
            self.running = True
            self.thread = threading.Thread(target=self._accept_connections, daemon=True)
            self.thread.start()
            print(f"[Mossy Link] Server listening on {self.host}:{self.port}")
        except Exception as e:
            print(f"[Mossy Link] Failed to start server: {e}")
    
    def _accept_connections(self):
        while self.running:
            try:
                self.socket.settimeout(1.0)
                client, addr = self.socket.accept()
                print(f"[Mossy Link] Connection from {addr}")
                self._handle_client(client)
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    print(f"[Mossy Link] Server error: {e}")
    
    def _handle_client(self, client):
        try:
            data = client.recv(1024).decode('utf-8')
            if data.startswith('EXECUTE:'):
                script = data.replace('EXECUTE:', '', 1)
                result = self._execute_script(script)
                client.send(result.encode('utf-8'))
            elif data == 'PING':
                client.send(b'PONG')
            client.close()
        except Exception as e:
            print(f"[Mossy Link] Client error: {e}")
    
    def _execute_script(self, script):
        try:
            # Execute in Blender context
            exec(script, {'bpy': bpy, 'D': bpy.data, 'C': bpy.context})
            return "SUCCESS"
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def stop(self):
        self.running = False
        if self.socket:
            self.socket.close()

class MOSSY_PT_Panel(bpy.types.Panel):
    bl_label = "Mossy Neural Link"
    bl_idname = "MOSSY_PT_Panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Mossy'

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        row = layout.row()
        row.prop(scene, "mossy_link_active", text="Link Status", toggle=True)
        
        if scene.mossy_link_active:
            box = layout.box()
            box.label(text="✓ Connected", icon='WORLD')
            box.label(text=f"Port: {MOSSY_PORT}", icon='NETWORK_DRIVE')
            box.label(text="Ready for commands...", icon='PLAY')
        else:
            layout.label(text="✗ Link Offline", icon='ERROR')

class MOSSY_OT_TestConnection(bpy.types.Operator):
    bl_idname = "mossy.test_connection"
    bl_label = "Test Mossy Connection"
    
    def execute(self, context):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect((MOSSY_HOST, MOSSY_PORT))
            sock.send(b'PING')
            response = sock.recv(1024).decode('utf-8')
            sock.close()
            
            if response == 'PONG':
                self.report({'INFO'}, 'Mossy Link: Connection successful!')
                return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f'Mossy Link: {str(e)}')
            return {'CANCELLED'}

def update_mossy_link_active(self, context):
    global MOSSY_SERVER
    if self.mossy_link_active:
        if MOSSY_SERVER is None:
            MOSSY_SERVER = MossySocketServer()
            MOSSY_SERVER.start()
    else:
        if MOSSY_SERVER is not None:
            MOSSY_SERVER.stop()
            MOSSY_SERVER = None

def register():
    # Register classes first
    bpy.utils.register_class(MOSSY_PT_Panel)
    bpy.utils.register_class(MOSSY_OT_TestConnection)
    
    # Clean up any existing property from old version
    if hasattr(bpy.types.Scene, 'mossy_link_active'):
        try:
            del bpy.types.Scene.mossy_link_active
        except:
            pass
    
    # Register property after classes
    bpy.types.Scene.mossy_link_active = bpy.props.BoolProperty(
        name="Mossy Link Active",
        description="Enable Mossy Neural Link socket server",
        default=False,
        update=update_mossy_link_active
    )
    print("[Mossy Link] Add-on v5.0 registered successfully!")

def unregister():
    global MOSSY_SERVER
    # Stop server before unregistering
    if MOSSY_SERVER is not None:
        MOSSY_SERVER.stop()
        MOSSY_SERVER = None
    
    # Delete property before unregistering classes
    if hasattr(bpy.types.Scene, 'mossy_link_active'):
        try:
            del bpy.types.Scene.mossy_link_active
        except:
            pass
    
    bpy.utils.unregister_class(MOSSY_OT_TestConnection)
    bpy.utils.unregister_class(MOSSY_PT_Panel)
    print("[Mossy Link] Add-on v5.0 unregistered.")

if __name__ == "__main__":
    register()
    `,t=new Blob([s],{type:"text/x-python"}),r=URL.createObjectURL(t),o=document.createElement("a");o.href=r,o.download="mossy_link.py",document.body.appendChild(o),o.click(),document.body.removeChild(o),n("System","Generated Blender Add-on (mossy_link.py) v4.0","success")},n=(s,t,r="ok")=>{const o={id:Date.now().toString()+Math.random(),timestamp:new Date().toLocaleTimeString(),source:s,event:t,status:r};E(d=>{const m=[...d.slice(-19),o];return localStorage.setItem("mossy_bridge_logs",JSON.stringify(m)),m})},Q=async()=>{T(!0),n("Bridge","Testing connectivity to port 21337...","ok");const s=["http://127.0.0.1:21337/health","http://localhost:21337/health"];let t=!1;for(const r of s)try{const o=new AbortController,d=setTimeout(()=>o.abort(),1500),m=await fetch(r,{signal:o.signal,mode:"cors"});if(clearTimeout(d),m.ok){const j=await m.json();n("Bridge",`Connected via ${r.includes("127.0.0.1")?"IP":"Localhost"}! (v${j.version})`,"success"),g(!0),P(j.version),localStorage.setItem("mossy_bridge_active","true"),localStorage.setItem("mossy_bridge_version",j.version),t=!0;break}}catch(o){console.warn(`[DesktopBridge] Fetch to ${r} failed`,o)}return t||(n("Bridge","Connection failed: All endpoints unreachable.","err"),n("Bridge","TROUBLESHOOTING: 1. Is Python server running? 2. Check Firewall. 3. Try running as Admin.","warn"),g(!1)),T(!1),t},L=async()=>{var s,t;if(typeof((t=(s=window.electron)==null?void 0:s.api)==null?void 0:t.checkBlenderAddon)=="function")try{return(await window.electron.api.checkBlenderAddon()).connected===!0}catch(r){return console.error("Error checking for Blender addon socket:",r),!1}return!1},Z=async()=>{n("System","Checking Blender add-on socket (port 9999)...","ok"),await L()?(localStorage.setItem("mossy_blender_active","true"),h(!0),window.dispatchEvent(new CustomEvent("mossy-blender-linked",{detail:!0})),n("System","Blender add-on socket connected! Neural Link verified!","success")):(localStorage.setItem("mossy_blender_active","false"),h(!1),window.dispatchEvent(new CustomEvent("mossy-blender-linked",{detail:!1})),n("System","Blender add-on not responding on port 9999.","warn"),n("System","Make sure: 1) Blender is open, 2) Add-on is installed, 3) Toggle is ON in Mossy panel","ok"))},X=async()=>{try{const s=await fetch("http://127.0.0.1:21337/hardware");if(s.ok){const t=await s.json();return U(t),n("Hardware","System specs retrieved","success"),t}}catch(s){console.error("[DesktopBridge] fetchHardwareInfo failed",s);const t=s instanceof Error?s.message:"Unknown error";n("Hardware",`Failed to fetch specs: ${t}`,"err")}return null},ee=async()=>{try{n("Vision","Requesting screenshot...","ok");const s=await fetch("http://127.0.0.1:21337/capture");if(s.ok){const t=await s.json();return V(t.image),n("Vision",`Captured ${t.resolution}`,"success"),t.image}}catch(s){console.error("[DesktopBridge] captureScreen failed",s);const t=s instanceof Error?s.message:"Unknown error";n("Vision",`Screen capture failed: ${t}`,"err")}return null},se=async s=>{try{if((await fetch("http://127.0.0.1:21337/clipboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:s})})).ok)return n("Clipboard","Text copied to system clipboard","success"),!0}catch(t){console.error("[DesktopBridge] setClipboard failed",t);const r=t instanceof Error?t.message:"Unknown error";n("Clipboard",`Failed to set clipboard: ${r}`,"err")}return!1},te=async s=>{try{n("Files",`Scanning ${s}...`,"ok");const t=await fetch("http://127.0.0.1:21337/files",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:s})});if(t.ok){const r=await t.json();return W(r.files),n("Files",`Found ${r.files.length} items`,"success"),r.files}}catch(t){console.error("[DesktopBridge] listFiles failed",t);const r=t instanceof Error?t.message:"Unknown error";n("Files",`Directory scan failed: ${r}`,"err")}return[]},re=a&&(!p||parseInt(p.split(".")[0])<5);return e.jsxs("div",{className:"h-full bg-[#050910] overflow-hidden flex flex-col",children:[e.jsxs("div",{className:"p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-2xl font-bold text-white flex items-center gap-3",children:[e.jsx(ae,{className:"w-6 h-6 text-emerald-400"}),"Desktop Bridge"]}),e.jsx("p",{className:"text-sm text-slate-400 mt-1",children:"Local system integration - Port 21337"})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800",children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${a?"bg-emerald-500 animate-pulse":"bg-red-500"}`}),e.jsx("span",{className:"text-xs font-bold text-slate-300 uppercase",children:a?"ONLINE":"OFFLINE"})]}),a&&p&&e.jsxs("div",{className:"text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800",children:["v",p]}),e.jsxs("button",{onClick:Q,disabled:w,className:"px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-colors",children:[w?e.jsx(D,{className:"w-4 h-4 animate-spin"}):e.jsx(_,{className:"w-4 h-4"}),w?"Testing...":"Test Connection"]})]})]}),re&&e.jsxs("div",{className:"mx-6 mt-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce",children:[e.jsx(B,{className:"w-8 h-8 text-red-500"}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-bold text-white",children:"UPDATE REQUIRED"}),e.jsxs("p",{className:"text-sm text-red-200",children:["You are connected to version ",p||"?",". Hardware scanning requires v5.0+.",e.jsx("br",{}),e.jsx("strong",{children:"Action:"})," Download the new server script below."]})]})]}),e.jsx("div",{className:"flex border-b border-slate-800 bg-slate-900 px-6 pt-4 gap-1",children:[{id:"setup",icon:k,label:"Setup"},{id:"blender",icon:Y,label:"Blender Link"},{id:"hardware",icon:S,label:"Hardware"},{id:"vision",icon:u,label:"Vision"},{id:"clipboard",icon:b,label:"Clipboard"},{id:"files",icon:f,label:"Files"}].map(s=>e.jsxs("button",{onClick:()=>q(s.id),className:`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${c===s.id?"bg-slate-800 text-white border-t border-x border-slate-700":"text-slate-400 hover:text-white hover:bg-slate-800/50"}`,children:[e.jsx(s.icon,{className:"w-4 h-4"}),s.label]},s.id))}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-6 bg-slate-900/30",children:[c==="setup"&&e.jsxs("div",{className:"max-w-4xl mx-auto space-y-6",children:[e.jsxs("div",{className:`rounded-xl border p-6 ${a?"bg-emerald-900/10 border-emerald-500/50":"bg-slate-900 border-slate-700"}`,children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2 mb-4",children:[e.jsx(ve,{className:a?"text-emerald-400":"text-slate-400"}),"Python Server Setup"]}),a?e.jsxs("div",{className:"p-4 bg-emerald-900/10 border border-emerald-500/20 rounded",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 font-bold text-emerald-400",children:[e.jsx(I,{className:"w-5 h-5"})," Bridge Active"]}),e.jsx("p",{className:"text-sm text-emerald-300",children:"Python server is responding on port 21337. All systems operational."})]}):e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"p-4 bg-black/40 rounded-lg border border-slate-700",children:[e.jsxs("h4",{className:"font-bold text-white mb-3 flex items-center gap-2",children:[e.jsx(me,{className:"w-4 h-4"})," Quick Start"]}),e.jsxs("ol",{className:"list-decimal pl-5 space-y-2 text-sm text-slate-300",children:[e.jsx("li",{children:"Download both files using the buttons below"}),e.jsxs("li",{children:["Save them to a new folder (e.g., ",e.jsx("code",{className:"bg-slate-800 px-2 py-0.5 rounded",children:"C:\\Mossy"}),")"]}),e.jsxs("li",{children:["Double-click ",e.jsx("strong",{children:"start_mossy.bat"})]}),e.jsx("li",{children:'Wait for console to show "Running on http://127.0.0.1:21337"'}),e.jsx("li",{children:'Click "Test Connection" above'})]})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-3",children:[e.jsxs("button",{onClick:z,className:"flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors",children:[e.jsx(k,{className:"w-5 h-5"})," 1. Download Server (.py)"]}),e.jsxs("button",{onClick:K,className:"flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg",children:[e.jsx(ye,{className:"w-5 h-5"})," 2. Download Launcher (.bat)"]})]}),v&&e.jsxs("div",{className:"p-4 bg-red-900/20 border border-red-500/30 rounded",children:[e.jsxs("h5",{className:"font-bold text-red-400 flex items-center gap-2 mb-2",children:[e.jsx(B,{className:"w-4 h-4"})," Common Issues"]}),e.jsxs("div",{className:"space-y-3 text-sm text-slate-300",children:[e.jsxs("div",{children:[e.jsx("strong",{children:'"Python is not recognized"'}),e.jsxs("p",{className:"text-xs text-slate-400 mt-1",children:["Python isn't installed or not in PATH. Download from ",e.jsx("a",{href:"https://python.org",target:"_blank",className:"text-blue-400 hover:underline",children:"python.org"}),' and check "Add Python to PATH" during install.']})]}),e.jsxs("div",{children:[e.jsx("strong",{children:'"Permission denied" or "Already in use"'}),e.jsx("p",{className:"text-xs text-slate-400 mt-1",children:"Port 21337 is blocked. Check Windows Firewall or close any other app using that port."})]})]})]}),e.jsxs("button",{onClick:()=>H(!v),className:"text-sm text-blue-400 hover:text-white flex items-center gap-1",children:[e.jsx(be,{className:"w-4 h-4"}),v?"Hide":"Show"," Troubleshooting"]})]})]}),e.jsxs("div",{className:"bg-black border border-slate-800 rounded-xl flex flex-col overflow-hidden h-96",children:[e.jsxs("div",{className:"p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center",children:[e.jsxs("span",{className:"text-xs font-bold text-slate-500 uppercase flex items-center gap-2",children:[e.jsx(le,{className:"w-4 h-4"})," Event Log"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${a?"bg-emerald-500 animate-pulse":"bg-red-500"}`}),e.jsx("span",{className:`text-[10px] ${a?"text-emerald-400":"text-red-400"}`,children:a?"LIVE":"OFFLINE"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs",children:[y.length===0&&e.jsx("div",{className:"text-slate-700 italic text-center mt-20",children:"No events yet..."}),y.map(s=>e.jsxs("div",{className:"flex gap-3 animate-fade-in",children:[e.jsxs("span",{className:"text-slate-600 shrink-0",children:["[",s.timestamp,"]"]}),e.jsx("span",{className:`font-bold shrink-0 w-20 ${s.status==="err"?"text-red-400":s.status==="success"?"text-emerald-400":"text-blue-400"}`,children:s.source}),e.jsx("span",{className:`break-all ${s.status==="warn"?"text-yellow-400":s.status==="err"?"text-red-400":s.status==="success"?"text-emerald-400":"text-slate-300"}`,children:s.event})]},s.id)),e.jsx("div",{ref:O})]})]})]}),c==="blender"&&e.jsxs("div",{className:"max-w-4xl mx-auto space-y-6",children:[e.jsxs("div",{className:"rounded-xl border border-blue-500/30 bg-blue-900/10 p-6",children:[e.jsxs("div",{className:"flex justify-between items-start mb-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2",children:[e.jsx(Y,{className:"text-blue-400"}),"Mossy Link for Blender"]}),e.jsx("p",{className:"text-sm text-blue-200 mt-1 leading-relaxed",children:"Enable the direct neural connection between Blender and Mossy."})]}),e.jsxs("div",{className:`px-4 py-2 rounded-lg border flex items-center gap-2 ${x?"bg-emerald-500/10 border-emerald-500/30 text-emerald-400":"bg-red-500/10 border-red-500/30 text-red-400"}`,children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${x?"bg-emerald-500 animate-pulse":"bg-red-500"}`}),e.jsx("span",{className:"text-xs font-bold uppercase tracking-wider",children:x?"Connected":"Disconnected"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6",children:[e.jsxs("div",{className:"bg-black/40 p-4 rounded-lg border border-slate-700",children:[e.jsxs("h4",{className:"font-bold text-white mb-2 flex items-center gap-2 text-sm",children:[e.jsx(I,{className:"w-4 h-4 text-emerald-400"})," Key Capabilities"]}),e.jsxs("ul",{className:"text-xs text-slate-300 space-y-2",children:[e.jsx("li",{children:"• One-click FO4 Standards Alignment"}),e.jsx("li",{children:"• Automated Mesh Generation"}),e.jsx("li",{children:"• Animation Batch Processing"}),e.jsx("li",{children:"• Real-time Scene Analysis"})]})]}),e.jsxs("div",{className:"bg-black/40 p-4 rounded-lg border border-slate-700",children:[e.jsxs("h4",{className:"font-bold text-white mb-2 flex items-center gap-2 text-sm",children:[e.jsx(ie,{className:"w-4 h-4 text-blue-400"})," Installation"]}),e.jsxs("ol",{className:"text-xs text-slate-300 space-y-2 list-decimal pl-4",children:[e.jsxs("li",{children:["Download ",e.jsx("strong",{children:"mossy_link.py"})," below"]}),e.jsxs("li",{children:["In Blender: ",e.jsx("em",{children:"Edit > Preferences > Add-ons"})]}),e.jsxs("li",{children:["Click ",e.jsx("strong",{children:"Install..."})," and select the file"]}),e.jsx("li",{children:'Enable "System: Mossy Link" checkbox'})]})]})]}),e.jsxs("div",{className:"flex flex-col gap-3",children:[x?e.jsxs("button",{onClick:()=>{localStorage.setItem("mossy_blender_active","false"),h(!1),window.dispatchEvent(new CustomEvent("mossy-blender-linked",{detail:!1}))},className:"w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all",children:[e.jsx(pe,{className:"w-6 h-6"}),"Disconnect Link"]}):e.jsxs("button",{onClick:Z,className:"w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]",children:[e.jsx(_,{className:"w-6 h-6"}),"FINAL STEP: Connect Now"]}),e.jsxs("button",{onClick:J,className:"w-full py-3 border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-all group",children:[e.jsx(k,{className:"w-5 h-5 group-hover:animate-bounce"}),"Download Mossy Link Add-on (v4.0)"]})]})]}),e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-6",children:[e.jsxs("h4",{className:"font-bold text-white mb-4 flex items-center gap-2",children:[e.jsx(_,{className:"w-4 h-4 text-yellow-400"})," Pro Tip: Automated Workflows"]}),e.jsx("p",{className:"text-xs text-slate-400 italic",children:`"Once enabled, you can say things like 'Mossy, align my Blender scene to Fallout 4' or 'Create a test cube in Blender' and I'll execute the code through the link."`})]})]}),c==="hardware"&&e.jsx("div",{className:"max-w-4xl mx-auto",children:e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-6",children:[e.jsxs("div",{className:"flex justify-between items-start mb-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2",children:[e.jsx(S,{className:"w-6 h-6 text-amber-400"}),"System Hardware Detection"]}),e.jsx("p",{className:"text-sm text-slate-400 mt-1",children:"Read real hardware specs from your PC"})]}),e.jsxs("button",{onClick:X,disabled:!a,className:"px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors",children:[e.jsx(D,{className:"w-4 h-4"}),"Scan Hardware"]})]}),!a&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(S,{className:"w-16 h-16 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:"Bridge must be online to scan hardware"}),e.jsx("p",{className:"text-xs mt-2",children:"Go to Setup tab and start the server"})]}),i&&e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"Operating System"}),e.jsx("div",{className:"text-lg font-bold text-white",children:i.os})]}),e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"CPU"}),e.jsx("div",{className:"text-lg font-bold text-white truncate",title:i.cpu,children:i.cpu})]}),e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"RAM"}),e.jsxs("div",{className:"text-lg font-bold text-white",children:[i.ram," GB"]})]}),e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"GPU"}),e.jsx("div",{className:"text-lg font-bold text-white truncate",title:i.gpu,children:i.gpu})]}),e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"Python Version"}),e.jsx("div",{className:"text-lg font-bold text-white",children:i.python})]}),e.jsxs("div",{className:"bg-slate-800 p-4 rounded-lg border border-slate-700",children:[e.jsx("div",{className:"text-xs text-slate-500 uppercase font-bold mb-2",children:"Status"}),e.jsx("div",{className:"text-lg font-bold text-emerald-400",children:i.status})]})]})]})}),c==="vision"&&e.jsx("div",{className:"max-w-5xl mx-auto",children:e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-6",children:[e.jsxs("div",{className:"flex justify-between items-start mb-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2",children:[e.jsx(u,{className:"w-6 h-6 text-blue-400"}),"Screen Capture"]}),e.jsx("p",{className:"text-sm text-slate-400 mt-1",children:"Take screenshots for Mossy to analyze"})]}),e.jsxs("button",{onClick:ee,disabled:!a,className:"px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors",children:[e.jsx(u,{className:"w-4 h-4"}),"Capture Now"]})]}),!a&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(u,{className:"w-16 h-16 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:"Bridge must be online to capture screenshots"})]}),R&&e.jsx("div",{className:"bg-black rounded-lg border border-slate-700 overflow-hidden",children:e.jsx("img",{src:R,alt:"Screenshot",className:"w-full"})})]})}),c==="clipboard"&&e.jsx("div",{className:"max-w-3xl mx-auto",children:e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-6",children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2 mb-6",children:[e.jsx(b,{className:"w-6 h-6 text-purple-400"}),"System Clipboard Control"]}),!a&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(b,{className:"w-16 h-16 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:"Bridge must be online to control clipboard"})]}),a&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("textarea",{value:N,onChange:s=>G(s.target.value),placeholder:"Enter text to copy to system clipboard...",className:"w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"}),e.jsxs("button",{onClick:()=>se(N),disabled:!N,className:"w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors",children:[e.jsx(b,{className:"w-5 h-5"}),"Copy to System Clipboard"]}),e.jsx("p",{className:"text-xs text-slate-500 text-center",children:"This sends the text to your Windows clipboard. You can paste it anywhere with Ctrl+V."})]})]})}),c==="files"&&e.jsx("div",{className:"max-w-5xl mx-auto",children:e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-6",children:[e.jsxs("h3",{className:"text-xl font-bold text-white flex items-center gap-2 mb-6",children:[e.jsx(f,{className:"w-6 h-6 text-green-400"}),"File System Browser"]}),!a&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(f,{className:"w-16 h-16 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:"Bridge must be online to browse files"})]}),a&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("input",{type:"text",value:M,onChange:s=>$(s.target.value),placeholder:"Enter directory path...",className:"flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"}),e.jsxs("button",{onClick:()=>te(M),className:"px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors",children:[e.jsx(xe,{className:"w-4 h-4"}),"Browse"]})]}),A.length>0&&e.jsx("div",{className:"bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-96 overflow-y-auto",children:A.map((s,t)=>e.jsxs("div",{className:"flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors",children:[s.is_dir?e.jsx(f,{className:"w-5 h-5 text-yellow-400"}):e.jsx(he,{className:"w-5 h-5 text-blue-400"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-sm font-bold text-white truncate",children:s.name}),!s.is_dir&&e.jsxs("div",{className:"text-xs text-slate-500",children:[(s.size/1024).toFixed(2)," KB"]})]})]},t))})]})]})})]})]})};export{De as default};
