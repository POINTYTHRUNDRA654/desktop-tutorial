import React, { useState, useEffect, useRef } from 'react';
import { Monitor, CheckCircle2, Wifi, Shield, Cpu, Terminal, Power, Layers, Box, Code, Image as ImageIcon, MessageSquare, Activity, RefreshCw, Lock, AlertOctagon, Link, Zap, Eye, Globe, Database, Wrench, FolderOpen, HardDrive, ArrowRightLeft, ArrowRight, Keyboard, Download, Server, Clipboard, FileType, HelpCircle, AlertTriangle, Settings, Search } from 'lucide-react';

interface Driver {
    id: string;
    name: string;
    icon: React.ElementType;
    status: 'active' | 'inactive' | 'mounting' | 'error';
    version: string;
    latency: number;
    permissions: string[];
}

interface LogEntry {
    id: string;
    timestamp: string;
    source: string;
    event: string;
    status: 'ok' | 'warn' | 'err' | 'success';
}

// Initial drivers
const initialDrivers: Driver[] = [
    { id: 'os_shell', name: 'Windows Shell', icon: Terminal, status: 'active', version: '10.0.19045', latency: 12, permissions: ['fs.read', 'fs.write', 'exec'] },
    { id: 'fs_watcher', name: 'File System Watcher', icon: Eye, status: 'active', version: '2.1.0', latency: 5, permissions: ['fs.watch', 'read.recursive'] },
    { id: 'xedit', name: 'xEdit Data Link', icon: Database, status: 'active', version: '4.0.4', latency: 45, permissions: ['plugin.read', 'record.edit'] },
    { id: 'ck', name: 'Creation Kit Telemetry', icon: Wrench, status: 'active', version: '1.10', latency: 80, permissions: ['cell.view'] },
    { id: 'vscode', name: 'VS Code Host', icon: Code, status: 'inactive', version: '1.85.1', latency: 0, permissions: ['editor.action', 'workspace'] },
];

const DesktopBridge: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
      try {
          const saved = localStorage.getItem('mossy_bridge_drivers');
          if (saved) {
              const parsed = JSON.parse(saved);
              return initialDrivers.map(d => {
                  const s = parsed.find((p: any) => p.id === d.id);
                  return s ? { ...d, status: s.status } : d;
              });
          }
      } catch (e) {
          console.error('Failed to load saved drivers:', e);
      }
      return initialDrivers;
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
      try {
          const saved = localStorage.getItem('mossy_bridge_logs');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Real bridge testing state
  const [testingBridge, setTestingBridge] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState('');
  const [filePath, setFilePath] = useState('C:\\');
  const [fileList, setFileList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'setup' | 'hardware' | 'vision' | 'clipboard' | 'files' | 'blender'>('setup');
  const [blenderLinked, setBlenderLinked] = useState(localStorage.getItem('mossy_blender_active') === 'true');
  
  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sync logs and check connection from LocalStorage (Updated by SystemBus)
  useEffect(() => {
      const syncState = () => {
          try {
              const savedLogs = localStorage.getItem('mossy_bridge_logs');
              if (savedLogs) setLogs(JSON.parse(savedLogs));
              
              const active = localStorage.getItem('mossy_bridge_active') === 'true';
              setBridgeConnected(active);

              const ver = localStorage.getItem('mossy_bridge_version');
              setBridgeVersion(ver);

              const bLinked = localStorage.getItem('mossy_blender_active') === 'true';
              setBlenderLinked(bLinked);
          } catch (e) {
              console.error('Failed to sync bridge state:', e);
          }
      };
      
      syncState(); // Initial check
      window.addEventListener('storage', syncState);
      window.addEventListener('mossy-bridge-connected', syncState);
      
      // Fallback poll for UI responsiveness
      const interval = setInterval(syncState, 1000);
      
      return () => {
          window.removeEventListener('storage', syncState);
          window.removeEventListener('mossy-bridge-connected', syncState);
          clearInterval(interval);
      };
  }, []);

  // Process Heartbeat - Automatically detect Blender/Tools
  useEffect(() => {
    const heartbeat = async () => {
      const isBlenderRunning = await checkBlenderProcess();
      const currentStatus = localStorage.getItem('mossy_blender_active') === 'true';
      
      if (isBlenderRunning !== currentStatus) {
        localStorage.setItem('mossy_blender_active', isBlenderRunning ? 'true' : 'false');
        setBlenderLinked(isBlenderRunning);
        window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: isBlenderRunning }));
        
        if (isBlenderRunning) {
          addLog('System', 'Blender add-on connected! (Port 9999 active)', 'success');
        } else {
          addLog('System', 'Blender add-on disconnected. (Enable toggle in Blender)', 'warn');
        }
      }
    };

    const interval = setInterval(heartbeat, 5000); // Check every 5 seconds
    heartbeat(); // Initial check
    
    return () => clearInterval(interval);
  }, [blenderLinked]);

  // --- PYTHON SERVER GENERATOR ---
  const handleDownloadServer = () => {
      const serverCode = `
import time
import json
import base64
import os
import threading
import sys
import platform
import subprocess
import socket
import json
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
print("[MOSSY BRIDGE] Hardware Endpoint: Ready (v3.0)")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "version": "3.0.0"})

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

@app.route('/execute', methods=['POST'])
def execute_blender_command():
    """Execute a command in Blender via the Mossy Link add-on"""
    try:
        data = request.json
        cmd_type = data.get('type', 'blender')
        
        if cmd_type == 'blender':
            # Forward to Blender addon on port 9999
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)
            
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                script = data.get('script', '')
                
                print(f"[BRIDGE] Received Blender command, forwarding to addon:")
                print(f"[BRIDGE] Script: {script[:100]}..." if len(script) > 100 else f"[BRIDGE] Script: {script}")
                
                # Send as JSON command (script)
                command = json.dumps({ 'type': 'script', 'code': script })
                
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()
                
                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                
                return jsonify({
                    "status": "success",
                    "message": "Blender command executed",
                    "response": response
                })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({
                    "status": "error",
                    "message": error_msg
                }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({
                    "status": "error",
                    "message": error_msg
                }), 504
        elif cmd_type == 'text':
            # Forward text block creation/update to addon
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)

            try:
                blender_socket.connect(('127.0.0.1', 9999))
                code = data.get('script') or data.get('code') or ''
                name = data.get('name') or 'MOSSY_SCRIPT'
                run = bool(data.get('run', False))

                print(f"[BRIDGE] Writing text block '{name}', run={run}")
                # Send as JSON command (text)
                command = json.dumps({ 'type': 'text', 'code': code, 'name': name, 'run': run })
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()

                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                return jsonify({ "status": "success", "message": "Blender text updated", "response": response })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 504
        else:
            error_msg = f"Unknown command type: {cmd_type}"
            print(f"[BRIDGE] ERROR: {error_msg}")
            return jsonify({ "status": "error", "message": error_msg }), 400
            
    except Exception as e:
        error_msg = f"Bridge execute error: {str(e)}"
        print(f"[BRIDGE] ERROR: {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 500

if __name__ == '__main__':
    try:
        # Run on 0.0.0.0 to ensure loopback works from any local address
        app.run(host='0.0.0.0', port=PORT)
    except Exception as e:
        print(f"Failed to start server: {e}")
        input("Press Enter to close...")
      `;
      
      const blob = new Blob([serverCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mossy_server.py'; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('System', 'Generated NEW mossy_server.py (v3.0)', 'success');
  };

  const handleDownloadBatch = () => {
      const batCode = `@echo off
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
`;
      const blob = new Blob([batCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'start_mossy.bat';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('System', 'Generated improved start_mossy.bat', 'success');
  };

  const handleDownloadAddon = () => {
    const addonCode = `
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
    print("[Mossy Link] Add-on v3.0 registered successfully!")

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
    print("[Mossy Link] Add-on v3.0 unregistered.")

if __name__ == "__main__":
    register()
    `;
    const blob = new Blob([addonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mossy_link.py'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog('System', 'Generated Blender Add-on (mossy_link.py) v3.0', 'success');
  };

  const addLog = (source: string, event: string, status: 'ok' | 'warn' | 'err' | 'success' = 'ok') => {
      const newLog = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          source,
          event,
          status
      };
      
      setLogs(prev => {
          const next = [...prev.slice(-19), newLog];
          localStorage.setItem('mossy_bridge_logs', JSON.stringify(next));
          return next;
      });
  };

  const toggleDriver = (id: string) => {
      setDrivers(prev => prev.map(d => {
          if (d.id !== id) return d;
          return { ...d, status: d.status === 'active' ? 'inactive' : 'active' };
      }));
  };

  // === REAL BRIDGE API TESTING FUNCTIONS ===
  
  const testBridgeConnection = async () => {
      setTestingBridge(true);
      addLog('Bridge', 'Testing connectivity to port 21337...', 'ok');
      
      const targets = ['http://127.0.0.1:21337/health', 'http://localhost:21337/health'];
      let success = false;

      for (const url of targets) {
          try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1500); // Fast fail

              const response = await fetch(url, { 
                  signal: controller.signal,
                  mode: 'cors' 
              });
              
              clearTimeout(timeoutId);

              if (response.ok) {
                  const data = await response.json();
                  addLog('Bridge', `Connected via ${url.includes('127.0.0.1') ? 'IP' : 'Localhost'}! (v${data.version})`, 'success');
                  setBridgeConnected(true);
                  setBridgeVersion(data.version);
                  localStorage.setItem('mossy_bridge_active', 'true');
                  localStorage.setItem('mossy_bridge_version', data.version);
                  success = true;
                  break;
              }
          } catch (e) {
              console.warn(`[DesktopBridge] Fetch to ${url} failed`, e);
          }
      }

      if (!success) {
          addLog('Bridge', 'Connection failed: All endpoints unreachable.', 'err');
          addLog('Bridge', 'TROUBLESHOOTING: 1. Is Python server running? 2. Check Firewall. 3. Try running as Admin.', 'warn');
          setBridgeConnected(false);
      }
      
      setTestingBridge(false);
      return success;
  };

  const checkBlenderProcess = async () => {
    // Check if socket on port 9999 is listening (addon is active)
    if (typeof window.electron?.api?.checkBlenderAddon === 'function') {
      try {
        const result = await window.electron.api.checkBlenderAddon();
        return result.connected === true;
      } catch (e) {
        console.error('Error checking for Blender addon socket:', e);
        return false;
      }
    }
    return false;
  };

  const testBlenderLink = async () => {
      addLog('System', 'Checking Blender add-on socket (port 9999)...', 'ok');
      
      const isBlenderRunning = await checkBlenderProcess();
      
      if (isBlenderRunning) {
          localStorage.setItem('mossy_blender_active', 'true');
          setBlenderLinked(true);
          window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: true }));
          addLog('System', 'Blender add-on socket connected! Neural Link verified!', 'success');
      } else {
          localStorage.setItem('mossy_blender_active', 'false');
          setBlenderLinked(false);
          window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
          addLog('System', 'Blender add-on not responding on port 9999.', 'warn');
          
          // Instruction for user
          addLog('System', 'Make sure: 1) Blender is open, 2) Add-on is installed, 3) Toggle is ON in Mossy panel', 'ok');
      }
  };

  const fetchHardwareInfo = async () => {
      try {
          const response = await fetch('http://127.0.0.1:21337/hardware');
          if (response.ok) {
              const data = await response.json();
              setHardwareInfo(data);
              addLog('Hardware', 'System specs retrieved', 'success');
              return data;
          }
      } catch (e) {
          console.error('[DesktopBridge] fetchHardwareInfo failed', e);
          const message = e instanceof Error ? e.message : 'Unknown error';
          addLog('Hardware', `Failed to fetch specs: ${message}`, 'err');
      }
      return null;
  };

  const captureScreen = async () => {
      try {
          addLog('Vision', 'Requesting screenshot...', 'ok');
          const response = await fetch('http://127.0.0.1:21337/capture');
          if (response.ok) {
              const data = await response.json();
              setScreenshot(data.image);
              addLog('Vision', `Captured ${data.resolution}`, 'success');
              return data.image;
          }
      } catch (e) {
          console.error('[DesktopBridge] captureScreen failed', e);
          const message = e instanceof Error ? e.message : 'Unknown error';
          addLog('Vision', `Screen capture failed: ${message}`, 'err');
      }
      return null;
  };

  const setClipboard = async (text: string) => {
      try {
          const response = await fetch('http://127.0.0.1:21337/clipboard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
          });
          if (response.ok) {
              addLog('Clipboard', 'Text copied to system clipboard', 'success');
              return true;
          }
      } catch (e) {
          console.error('[DesktopBridge] setClipboard failed', e);
          const message = e instanceof Error ? e.message : 'Unknown error';
          addLog('Clipboard', `Failed to set clipboard: ${message}`, 'err');
      }
      return false;
  };

  const listFiles = async (path: string) => {
      try {
          addLog('Files', `Scanning ${path}...`, 'ok');
          const response = await fetch('http://127.0.0.1:21337/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path })
          });
          if (response.ok) {
              const data = await response.json();
              setFileList(data.files);
              addLog('Files', `Found ${data.files.length} items`, 'success');
              return data.files;
          }
      } catch (e) {
          console.error('[DesktopBridge] listFiles failed', e);
          const message = e instanceof Error ? e.message : 'Unknown error';
          addLog('Files', `Directory scan failed: ${message}`, 'err');
      }
      return [];
  };

  const isOutdated = bridgeConnected && (!bridgeVersion || parseInt(bridgeVersion.split('.')[0]) < 5);

  return (
    <div className="h-full bg-[#050910] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-emerald-400" />
                  Desktop Bridge
              </h2>
              <p className="text-sm text-slate-400 mt-1">Local system integration - Port 21337</p>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <div className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs font-bold text-slate-300 uppercase">
                      {bridgeConnected ? 'ONLINE' : 'OFFLINE'}
                  </span>
              </div>
              {bridgeConnected && bridgeVersion && (
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      v{bridgeVersion}
                  </div>
              )}
              <button
                  onClick={testBridgeConnection}
                  disabled={testingBridge}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                  {testingBridge ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {testingBridge ? 'Testing...' : 'Test Connection'}
              </button>
          </div>
      </div>

      {isOutdated && (
          <div className="mx-6 mt-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                  <h3 className="font-bold text-white">UPDATE REQUIRED</h3>
                  <p className="text-sm text-red-200">
                      You are connected to version {bridgeVersion || '?'}. Hardware scanning requires v5.0+.
                      <br/>
                      <strong>Action:</strong> Download the new server script below.
                  </p>
              </div>
          </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900 px-6 pt-4 gap-1">
          {[
              { id: 'setup', icon: Download, label: 'Setup' },
              { id: 'blender', icon: Box, label: 'Blender Link' },
              { id: 'hardware', icon: Cpu, label: 'Hardware' },
              { id: 'vision', icon: Eye, label: 'Vision' },
              { id: 'clipboard', icon: Clipboard, label: 'Clipboard' },
              { id: 'files', icon: FolderOpen, label: 'Files' }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                      ? 'bg-slate-800 text-white border-t border-x border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
              >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
          {activeTab === 'setup' && (
              <div className="max-w-4xl mx-auto space-y-6">
                  {/* Setup Instructions */}
                  <div className={`rounded-xl border p-6 ${
                      bridgeConnected ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-900 border-slate-700'
                  }`}>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                          <Server className={bridgeConnected ? 'text-emerald-400' : 'text-slate-400'} />
                          Python Server Setup
                      </h3>
                      
                      {bridgeConnected ? (
                          <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded">
                              <div className="flex items-center gap-2 mb-2 font-bold text-emerald-400">
                                  <CheckCircle2 className="w-5 h-5"/> Bridge Active
                              </div>
                              <p className="text-sm text-emerald-300">Python server is responding on port 21337. All systems operational.</p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="p-4 bg-black/40 rounded-lg border border-slate-700">
                                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                      <Keyboard className="w-4 h-4"/> Quick Start
                                  </h4>
                                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300">
                                      <li>Download both files using the buttons below</li>
                                      <li>Save them to a new folder (e.g., <code className="bg-slate-800 px-2 py-0.5 rounded">C:\Mossy</code>)</li>
                                      <li>Double-click <strong>start_mossy.bat</strong></li>
                                      <li>Wait for console to show &quot;Running on http://127.0.0.1:21337&quot;</li>
                                      <li>Click &quot;Test Connection&quot; above</li>
                                  </ol>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-3">
                                  <button 
                                      onClick={handleDownloadServer}
                                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors"
                                  >
                                      <Download className="w-5 h-5" /> 1. Download Server (.py)
                                  </button>
                                  <button 
                                      onClick={handleDownloadBatch}
                                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
                                  >
                                      <FileType className="w-5 h-5" /> 2. Download Launcher (.bat)
                                  </button>
                              </div>

                              {showHelp && (
                                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
                                      <h5 className="font-bold text-red-400 flex items-center gap-2 mb-2">
                                          <AlertTriangle className="w-4 h-4"/> Common Issues
                                      </h5>
                                      <div className="space-y-3 text-sm text-slate-300">
                                          <div>
                                              <strong>&quot;Python is not recognized&quot;</strong>
                                              <p className="text-xs text-slate-400 mt-1">
                                                  Python isn&apos;t installed or not in PATH. Download from <a href="https://python.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">python.org</a> and check &quot;Add Python to PATH&quot; during install.
                                              </p>
                                          </div>
                                          <div>
                                              <strong>&quot;Permission denied&quot; or &quot;Already in use&quot;</strong>
                                              <p className="text-xs text-slate-400 mt-1">
                                                  Port 21337 is blocked. Check Windows Firewall or close any other app using that port.
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              <button
                                  onClick={() => setShowHelp(!showHelp)}
                                  className="text-sm text-blue-400 hover:text-white flex items-center gap-1"
                              >
                                  <HelpCircle className="w-4 h-4" />
                                  {showHelp ? 'Hide' : 'Show'} Troubleshooting
                              </button>
                          </div>
                      )}
                  </div>

                  {/* Event Log */}
                  <div className="bg-black border border-slate-800 rounded-xl flex flex-col overflow-hidden h-96">
                      <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                              <Activity className="w-4 h-4" /> Event Log
                          </span>
                          <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                              <span className={`text-[10px] ${bridgeConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {bridgeConnected ? 'LIVE' : 'OFFLINE'}
                              </span>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                          {logs.length === 0 && (
                              <div className="text-slate-700 italic text-center mt-20">No events yet...</div>
                          )}
                          {logs.map(log => (
                              <div key={log.id} className="flex gap-3 animate-fade-in">
                                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                  <span className={`font-bold shrink-0 w-20 ${
                                      log.status === 'err' ? 'text-red-400' :
                                      log.status === 'success' ? 'text-emerald-400' :
                                      'text-blue-400'
                                  }`}>{log.source}</span>
                                  <span className={`break-all ${
                                      log.status === 'warn' ? 'text-yellow-400' :
                                      log.status === 'err' ? 'text-red-400' :
                                      log.status === 'success' ? 'text-emerald-400' :
                                      'text-slate-300'
                                  }`}>{log.event}</span>
                              </div>
                          ))}
                          <div ref={logEndRef} />
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'blender' && (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Box className="text-blue-400" />
                                Mossy Link for Blender
                            </h3>
                            <p className="text-sm text-blue-200 mt-1 leading-relaxed">
                                Enable the direct neural connection between Blender and Mossy.
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${blenderLinked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${blenderLinked ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">{blenderLinked ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400"/> Key Capabilities
                            </h4>
                            <ul className="text-xs text-slate-300 space-y-2">
                                <li>• One-click FO4 Standards Alignment</li>
                                <li>• Automated Mesh Generation</li>
                                <li>• Animation Batch Processing</li>
                                <li>• Real-time Scene Analysis</li>
                            </ul>
                        </div>
                        <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <Settings className="w-4 h-4 text-blue-400"/> Installation
                            </h4>
                            <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
                                <li>Download <strong>mossy_link.py</strong> below</li>
                                <li>In Blender: <em>Edit &gt; Preferences &gt; Add-ons</em></li>
                                <li>Click <strong>Install...</strong> and select the file</li>
                                <li>Enable &quot;System: Mossy Link&quot; checkbox</li>
                            </ol>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {!blenderLinked ? (
                            <button 
                                onClick={testBlenderLink}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                <Zap className="w-6 h-6" />
                                FINAL STEP: Connect Now
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    localStorage.setItem('mossy_blender_active', 'false');
                                    setBlenderLinked(false);
                                    window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
                                }}
                                className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
                            >
                                <Lock className="w-6 h-6" />
                                Disconnect Link
                            </button>
                        )}
                        
                        <button 
                            onClick={handleDownloadAddon}
                            className="w-full py-3 border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-all group"
                        >
                            <Download className="w-5 h-5 group-hover:animate-bounce" />
                            Download Mossy Link Add-on (v4.0)
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400"/> Pro Tip: Automated Workflows
                  </h4>
                  <p className="text-xs text-slate-400 italic">
                      &quot;Once enabled, you can say things like &apos;Mossy, align my Blender scene to Fallout 4&apos; 
                      or &apos;Create a test cube in Blender&apos; and I&apos;ll execute the code through the link.&quot;
                  </p>
                </div>
            </div>
          )}

          {activeTab === 'hardware' && (
              <div className="max-w-4xl mx-auto">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  <Cpu className="w-6 h-6 text-amber-400" />
                                  System Hardware Detection
                              </h3>
                              <p className="text-sm text-slate-400 mt-1">Read real hardware specs from your PC</p>
                          </div>
                          <button
                              onClick={fetchHardwareInfo}
                              disabled={!bridgeConnected}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                          >
                              <RefreshCw className="w-4 h-4" />
                              Scan Hardware
                          </button>
                      </div>

                      {!bridgeConnected && (
                          <div className="text-center py-12 text-slate-500">
                              <Cpu className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p>Bridge must be online to scan hardware</p>
                              <p className="text-xs mt-2">Go to Setup tab and start the server</p>
                          </div>
                      )}

                      {hardwareInfo && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">Operating System</div>
                                  <div className="text-lg font-bold text-white">{hardwareInfo.os}</div>
                              </div>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">CPU</div>
                                  <div className="text-lg font-bold text-white truncate" title={hardwareInfo.cpu}>{hardwareInfo.cpu}</div>
                              </div>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">RAM</div>
                                  <div className="text-lg font-bold text-white">{hardwareInfo.ram} GB</div>
                              </div>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">GPU</div>
                                  <div className="text-lg font-bold text-white truncate" title={hardwareInfo.gpu}>{hardwareInfo.gpu}</div>
                              </div>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">Python Version</div>
                                  <div className="text-lg font-bold text-white">{hardwareInfo.python}</div>
                              </div>
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">Status</div>
                                  <div className="text-lg font-bold text-emerald-400">{hardwareInfo.status}</div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'vision' && (
              <div className="max-w-5xl mx-auto">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  <Eye className="w-6 h-6 text-blue-400" />
                                  Screen Capture
                              </h3>
                              <p className="text-sm text-slate-400 mt-1">Take screenshots for Mossy to analyze</p>
                          </div>
                          <button
                              onClick={captureScreen}
                              disabled={!bridgeConnected}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                          >
                              <Eye className="w-4 h-4" />
                              Capture Now
                          </button>
                      </div>

                      {!bridgeConnected && (
                          <div className="text-center py-12 text-slate-500">
                              <Eye className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p>Bridge must be online to capture screenshots</p>
                          </div>
                      )}

                      {screenshot && (
                          <div className="bg-black rounded-lg border border-slate-700 overflow-hidden">
                              <img src={screenshot} alt="Screenshot" className="w-full" />
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'clipboard' && (
              <div className="max-w-3xl mx-auto">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                          <Clipboard className="w-6 h-6 text-purple-400" />
                          System Clipboard Control
                      </h3>

                      {!bridgeConnected && (
                          <div className="text-center py-12 text-slate-500">
                              <Clipboard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p>Bridge must be online to control clipboard</p>
                          </div>
                      )}

                      {bridgeConnected && (
                          <div className="space-y-4">
                              <textarea
                                  value={clipboardText}
                                  onChange={(e) => setClipboardText(e.target.value)}
                                  placeholder="Enter text to copy to system clipboard..."
                                  className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                              />
                              <button
                                  onClick={() => setClipboard(clipboardText)}
                                  disabled={!clipboardText}
                                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                              >
                                  <Clipboard className="w-5 h-5" />
                                  Copy to System Clipboard
                              </button>
                              <p className="text-xs text-slate-500 text-center">
                                  This sends the text to your Windows clipboard. You can paste it anywhere with Ctrl+V.
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'files' && (
              <div className="max-w-5xl mx-auto">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                          <FolderOpen className="w-6 h-6 text-green-400" />
                          File System Browser
                      </h3>

                      {!bridgeConnected && (
                          <div className="text-center py-12 text-slate-500">
                              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p>Bridge must be online to browse files</p>
                          </div>
                      )}

                      {bridgeConnected && (
                          <div className="space-y-4">
                              <div className="flex gap-2">
                                  <input
                                      type="text"
                                      value={filePath}
                                      onChange={(e) => setFilePath(e.target.value)}
                                      placeholder="Enter directory path..."
                                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  />
                                  <button
                                      onClick={() => listFiles(filePath)}
                                      className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                                  >
                                      <Search className="w-4 h-4" />
                                      Browse
                                  </button>
                              </div>

                              {fileList.length > 0 && (
                                  <div className="bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-96 overflow-y-auto">
                                      {fileList.map((file, idx) => (
                                          <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors">
                                              {file.is_dir ? (
                                                  <FolderOpen className="w-5 h-5 text-yellow-400" />
                                              ) : (
                                                  <HardDrive className="w-5 h-5 text-blue-400" />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                  <div className="text-sm font-bold text-white truncate">{file.name}</div>
                                                  {!file.is_dir && (
                                                      <div className="text-xs text-slate-500">
                                                          {(file.size / 1024).toFixed(2)} KB
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DesktopBridge;