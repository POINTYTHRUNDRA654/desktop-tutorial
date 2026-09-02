"""
build_engine_executable.py
Compiles src/main.py into Fallout4_AI_Engine.exe using PyInstaller.

Must be run on Windows. Output goes to release_staging/core/Data/F4AI/.
"""

import subprocess
import sys
import shutil
from pathlib import Path

ROOT       = Path(__file__).resolve().parent.parent
SRC        = ROOT / "src" / "main.py"
DIST_EXE   = ROOT / "dist" / "engine" / "Fallout4_AI_Engine.exe"
STAGE_EXE  = ROOT / "release_staging" / "core" / "Data" / "F4AI" / "Fallout4_AI_Engine.exe"

if sys.platform != "win32":
    print("[ERROR] build_engine_executable.py must be run on Windows.")
    sys.exit(1)

# Auto-install PyInstaller if missing
try:
    import PyInstaller
except ImportError:
    print("[Setup] Installing PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

print(f"[Build] Compiling {SRC.name} -> Fallout4_AI_Engine.exe ...")

cmd = [
    sys.executable, "-m", "PyInstaller",
    "--onefile",
    "--name", "Fallout4_AI_Engine",
    "--distpath", str(DIST_EXE.parent),
    "--workpath", str(ROOT / "build" / "pyinstaller"),
    "--specpath", str(ROOT / "build"),
    "--noconfirm",
    str(SRC),
]

result = subprocess.run(cmd, cwd=str(ROOT))
if result.returncode != 0:
    print("[ERROR] PyInstaller failed.")
    sys.exit(1)

# Copy compiled exe into staging
STAGE_EXE.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(DIST_EXE, STAGE_EXE)
print(f"[OK] Copied to staging: {STAGE_EXE}")
