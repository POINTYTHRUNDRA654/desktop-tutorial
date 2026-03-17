"""Standalone script to download/install external CLI tools for the add-on.

This can be invoked directly from setup scripts or manually by the user.
"""

import sys
from pathlib import Path

# ensure project root in path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

import tool_installers

if __name__ == "__main__":
    print(tool_installers.install_ffmpeg())
    print(tool_installers.install_nvtt())
    print(tool_installers.install_texconv())
    print(tool_installers.install_whisper())
    # Niftools not included here; use Powershell script separately if needed.
