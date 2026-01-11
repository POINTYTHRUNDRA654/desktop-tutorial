import React, { useState, useEffect, useRef } from 'react';
import { Monitor, CheckCircle2, Wifi, Shield, Cpu, Terminal, Power, Layers, Box, Code, Image as ImageIcon, MessageSquare, Activity, RefreshCw, Lock, AlertOctagon, Link, Zap, Eye, Globe, Database, Wrench, FolderOpen, HardDrive, ArrowRightLeft, ArrowRight, Keyboard, Download, Server, Clipboard, FileType, HelpCircle, AlertTriangle } from 'lucide-react';

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
      } catch {}
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
          } catch {}
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
      `;
      
      const blob = new Blob([serverCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mossy_server.py'; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('System', 'Generated NEW mossy_server.py (v5.0)', 'success');
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

  const isOutdated = bridgeConnected && (!bridgeVersion || !bridgeVersion.startsWith('5.'));

  return (
    <div className="h-full bg-[#050910] p-8 overflow-y-auto font-sans text-slate-200">
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
            <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-emerald-400" />
                    Neural Interconnect
                </h2>
                <div className="flex items-center gap-4 mt-2">
                    <p className="text-slate-400 font-mono text-sm">
                        Localhost Bridge Service <span className="text-slate-600">|</span> Port: 21337
                    </p>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        <div className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {bridgeConnected ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE'}
                        </span>
                    </div>
                    {bridgeConnected && bridgeVersion && (
                        <div className="text-[10px] font-mono text-slate-500">v{bridgeVersion}</div>
                    )}
                </div>
            </div>
        </div>

        {isOutdated && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                    <h3 className="font-bold text-white">UPDATE REQUIRED</h3>
                    <p className="text-sm text-red-200">
                        You are connected to an old version of <code>mossy_server.py</code> (v{bridgeVersion || '?'}). 
                        Hardware scanning and new features will not work.
                        <br/>
                        <strong>Action:</strong> Click "Get Server (.py)" below and overwrite your existing file.
                    </p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
            {/* Left Column: Driver Grid */}
            <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* PYTHON SERVER CARD */}
                <div className={`rounded-xl border p-6 relative overflow-hidden transition-all duration-500 ${
                    bridgeConnected ? 'bg-emerald-900/10 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-slate-900 border-slate-700'
                }`}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Server className={`w-6 h-6 ${bridgeConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
                                    Desktop Server Core
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">This script gives Mossy eyes (screenshots) and hands (clipboard).</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                bridgeConnected 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }`}>
                                {bridgeConnected ? 'CONNECTED' : 'DISCONNECTED'}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {bridgeConnected ? (
                                <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded text-sm text-emerald-300">
                                    <div className="flex items-center gap-2 mb-2 font-bold"><CheckCircle2 className="w-4 h-4"/> System Active</div>
                                    <p className="text-xs opacity-80">Python bridge is responding. Telemetry streaming.</p>
                                    <div className="mt-2 pt-2 border-t border-emerald-500/20 text-xs">
                                        <button onClick={handleDownloadServer} className="underline hover:text-white flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3"/> Re-download Server Script (v5.0)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-black/40 rounded-lg border border-slate-700/50 text-sm text-slate-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-white flex items-center gap-2"><Clipboard className="w-4 h-4"/> Easy Installation</h4>
                                        <button onClick={() => setShowHelp(!showHelp)} className="text-xs text-blue-400 hover:text-white flex items-center gap-1">
                                            <HelpCircle className="w-3 h-3" /> Troubleshooting
                                        </button>
                                    </div>
                                    <ol className="list-decimal pl-4 space-y-2 text-slate-400">
                                        <li>Download both files below to a new folder.</li>
                                        <li>Double-click <strong>start_mossy.bat</strong>.</li>
                                        <li>Wait for the "BRIDGE ONLINE" status above to turn green.</li>
                                    </ol>
                                    
                                    {showHelp && (
                                        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-xs text-slate-300">
                                            <strong className="text-red-400 flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3"/> "Python is not recognized"?</strong>
                                            <p className="mb-2">Your computer doesn't know where Python is installed.</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>Reinstall Python from <a href="https://python.org" target="_blank" className="text-blue-400 hover:underline">python.org</a>.</li>
                                                <li><strong>IMPORTANT:</strong> Check the box <strong>"Add Python to PATH"</strong> at the bottom of the installer.</li>
                                                <li>Then try running the .bat file again.</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={handleDownloadServer}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Download className="w-4 h-4" /> 1. Get Server (.py)
                                </button>
                                <button 
                                    onClick={handleDownloadBatch}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
                                >
                                    <FileType className="w-4 h-4" /> 2. Get Launcher (.bat)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-2 mt-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Standard Drivers
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drivers.map(driver => (
                        <div 
                            key={driver.id}
                            className={`relative overflow-hidden rounded-xl border transition-all p-4 group ${
                                driver.status === 'active' 
                                ? 'bg-slate-900 border-emerald-500/50' 
                                : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${driver.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        <driver.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{driver.name}</div>
                                        <div className="text-[10px] text-slate-500">v{driver.version}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleDriver(driver.id)}
                                    className={`p-1.5 rounded border transition-colors ${driver.status === 'active' ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-slate-700 hover:text-white'}`}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Telemetry & Log */}
            <div className="flex flex-col gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Security Protocols
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Localhost Loopback Only</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Clipboard Access Granted</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-black border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Event Log
                        </span>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className={`text-[10px] ${bridgeConnected ? 'text-emerald-500' : 'text-red-500'}`}>{bridgeConnected ? 'LIVE' : 'OFFLINE'}</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                        {logs.length === 0 && (
                            <div className="text-slate-700 italic text-center mt-10">Awaiting traffic...</div>
                        )}
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-3 animate-fade-in">
                                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                <span className={`font-bold shrink-0 w-20 truncate ${
                                    log.status === 'err' ? 'text-red-500' : 
                                    log.status === 'success' ? 'text-emerald-400' : 'text-blue-400'
                                }`}>{log.source}</span>
                                <span className={`break-all ${
                                    log.status === 'warn' ? 'text-yellow-400' :
                                    log.status === 'err' ? 'text-red-400' :
                                    log.status === 'success' ? 'text-emerald-400' :
                                    'text-slate-300'
                                }`}>
                                    {log.event}
                                </span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopBridge;