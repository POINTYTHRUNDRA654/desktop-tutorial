import os
import sys
import platform
import subprocess
import socket
import json
import base64
from flask import Flask, jsonify, request
from flask_cors import CORS

# Attempt imports with friendly error
try:
    import mss
    import pyautogui
    import pyperclip
    import psutil
except ImportError as e:
    print(f"\n[ERROR] Missing dependency: {getattr(e, 'name', str(e))}")
    print("Please run: pip install flask flask-cors mss pyautogui pyperclip psutil")
    sys.exit(1)

PORT = 21337
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

print(f"\n[MOSSY BRIDGE] Initializing Neural Link on port {PORT}...")
print("[MOSSY BRIDGE] Capabilities: Screen (Eyes), Clipboard (Hands), Hardware (Senses)")
print("[MOSSY BRIDGE] Hardware Endpoint: Ready (v5.0)")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "version": "5.0.0"})

@app.route('/hardware', methods=['GET'])
def get_hardware():
    try:
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3))
        gpu_name = "Generic / Integrated"
        try:
            if platform.system() == "Windows":
                cmd = "wmic path win32_VideoController get name"
                proc = subprocess.check_output(cmd, shell=True).decode()
                lines = [line.strip() for line in proc.split('\n') if line.strip() and "Name" not in line]
                if lines:
                    gpu_name = lines[0]
        except Exception:
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
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            png_bytes = mss.tools.to_png(sct_img.rgb, sct_img.size)
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
    try:
        data = request.json
        text = data.get('text', '')
        pyperclip.copy(text)
        return jsonify({"status": "success", "message": "Clipboard updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/files', methods=['POST'])
def list_files():
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
    try:
        data = request.json
        if data is None:
            error_msg = "Invalid JSON or missing Content-Type header"
            print(f"[BRIDGE] ERROR: {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 400
        cmd_type = data.get('type', 'blender')
        if cmd_type == 'blender':
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                script = data.get('script', '')
                print(f"[BRIDGE] Received Blender command, forwarding to addon:")
                print(f"[BRIDGE] Script: {script[:100]}..." if len(script) > 100 else f"[BRIDGE] Script: {script}")
                command = json.dumps({'type': 'script', 'code': script})
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()
                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                return jsonify({"status": "success", "message": "Blender command executed", "response": response})
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 504
        elif cmd_type == 'text':
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                code = data.get('script') or data.get('code') or ''
                name = data.get('name') or 'MOSSY_SCRIPT'
                run = bool(data.get('run', False))
                print(f"[BRIDGE] Writing text block '{name}', run={run}")
                command = json.dumps({'type': 'text', 'code': code, 'name': name, 'run': run})
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()
                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                return jsonify({"status": "success", "message": "Blender text updated", "response": response})
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({"status": "error", "message": error_msg}), 504
        else:
            error_msg = f"Unknown command type: {cmd_type}"
            print(f"[BRIDGE] ERROR: {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 400
    except Exception as e:
        error_msg = f"Bridge execute error: {str(e)}"
        print(f"[BRIDGE] ERROR: {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 500

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=PORT)
    except Exception as e:
        print(f"Failed to start server: {e}")
