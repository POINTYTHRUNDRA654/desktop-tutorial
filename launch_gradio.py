#!/usr/bin/env python3
"""
Gradio Launcher for Mossy
Starts the Gradio Python code assistant interface
"""

import sys
import os
import subprocess
import socket
import time


def check_port_available(port: int) -> bool:
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('127.0.0.1', port))
        sock.close()
        return True
    except OSError:
        return False


def main():
    """Launch the Gradio interface"""
    print("=" * 60)
    print("🚀 Mossy Gradio Python Code Assistant Launcher")
    print("=" * 60)
    
    # Check if gradio is installed
    try:
        import gradio
        print(f"✓ Gradio {gradio.__version__} is installed")
    except ImportError:
        print("❌ Gradio is not installed!")
        print("\nPlease install dependencies:")
        print("  pip install -r requirements.txt")
        print("\nOr install Gradio directly:")
        print("  pip install gradio")
        return 1
    
    # Check if port 7860 is available
    port = 7860
    if not check_port_available(port):
        print(f"⚠️  Port {port} is already in use")
        print("   The Gradio interface may already be running")
        print(f"   Visit: http://127.0.0.1:{port}")
        return 1
    
    # Find the gradio_interface.py file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    interface_file = os.path.join(script_dir, 'gradio_interface.py')
    
    if not os.path.exists(interface_file):
        print(f"❌ Could not find {interface_file}")
        return 1
    
    print(f"✓ Found interface file: {interface_file}")
    print(f"\n🌐 Starting Gradio server on http://127.0.0.1:{port}")
    print("   Press Ctrl+C to stop\n")
    
    try:
        # Launch the Gradio interface
        subprocess.run([sys.executable, interface_file])
    except KeyboardInterrupt:
        print("\n\n👋 Gradio interface stopped")
        return 0
    except Exception as e:
        print(f"\n❌ Error launching Gradio: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
