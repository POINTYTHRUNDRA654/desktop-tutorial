#!/usr/bin/env python3
"""
build_nexus_package.py — build the complete shippable Brain B (Nexus edition) package

Produces brain-b/nexus/dist-package/, containing everything needed to run Brain B
with no Python installation, no GPU, and no pip install on the end user's machine:

  brain_b_slim/          — PyInstaller onedir build (exe + all bundled deps)
  knowledge/chroma_curated/ — prebuilt curated knowledge base
  embed-model/            — prebuilt fastembed (ONNX) embedding model cache

Run this from brain-b/nexus/ using a venv/env with requirements-nexus.txt installed:
    python build_nexus_package.py

Prerequisites this script does NOT install itself (see requirements-nexus.txt):
  pip install -r requirements-nexus.txt

Two known Windows/conda-specific gotchas this script works around — both found by
actually running the compiled exe and reading the real crash, not by guessing:

1. sqlite3.dll and its stdlib C-extension siblings (liblzma/libbz2/ffi/libexpat)
   aren't auto-detected by PyInstaller when building from a conda Python, because
   conda stores them under Library/bin/ instead of the standard DLLs/ folder
   PyInstaller's hooks check. Bundled explicitly via --add-binary below.
2. chromadb's Rust extension (chromadb.api.rust, backed by the separate
   chromadb_rust_bindings package) needs --collect-all, not just --collect-data —
   the data-only flag bundles chromadb's non-code resources but skips the compiled
   extension module itself, which then fails at import time with
   "ModuleNotFoundError: No module named 'chromadb.api.rust'".

--onedir, not --onefile: onefile's runtime self-extraction did not reliably put the
--add-binary DLLs on Windows' DLL search path (same sqlite3.dll failure persisted
even with it explicitly bundled). onedir also starts faster (no self-extraction
step) and is a perfectly fine shape for something Electron spawns as a child
process rather than a user-facing single-file download.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

NEXUS_DIR = Path(__file__).resolve().parent
DIST_PACKAGE = NEXUS_DIR / "dist-package"

# Conda-specific DLL locations — see module docstring, gotcha #1. If you're building
# from a different Python distribution, these may already be found automatically;
# this script still works, --add-binary just becomes a no-op duplicate in that case.
CONDA_ENV = Path(os.environ.get("MOSSY_CONDA_ENV", r"D:\Users\billy\anaconda3\envs\mossy"))
CONDA_LIB_BIN = CONDA_ENV / "Library" / "bin"
REQUIRED_DLLS = ["sqlite3.dll", "liblzma.dll", "libbz2.dll", "ffi.dll", "libexpat.dll"]


def run(cmd: list[str]) -> None:
    print(f"\n$ {' '.join(cmd)}\n")
    subprocess.run(cmd, check=True, cwd=NEXUS_DIR)


def main():
    python = sys.executable

    # Only relevant for a conda-distributed Python (see module docstring, gotcha #1).
    # A standard python.org / actions/setup-python install keeps these DLLs under the
    # regular DLLs/ folder that PyInstaller's own hooks already find — bundling them
    # explicitly is unnecessary there, not just harmless-if-skipped, so this is a
    # skip-with-a-note rather than an error when CONDA_LIB_BIN doesn't exist at all.
    # It's still a real error if CONDA_LIB_BIN exists but is missing an expected DLL —
    # that means MOSSY_CONDA_ENV points at a broken/incomplete env, not a different
    # (non-conda) Python that doesn't need this step.
    use_conda_dll_bundling = CONDA_LIB_BIN.exists()
    if use_conda_dll_bundling:
        missing_dlls = [d for d in REQUIRED_DLLS if not (CONDA_LIB_BIN / d).exists()]
        if missing_dlls:
            print(f"ERROR: {CONDA_LIB_BIN} exists but is missing: {missing_dlls}")
            print("MOSSY_CONDA_ENV points at an incomplete conda environment.")
            sys.exit(1)
    else:
        print(f"No conda env found at {CONDA_LIB_BIN} — skipping conda-specific DLL "
              f"bundling (expected on a stock Python install, e.g. CI).")

    # 1. Build the knowledge pack (fastembed-embedded — see build_knowledge_db_nexus.py's
    #    own docstring for why this must stay in sync with brain_b_slim.py's embed()).
    print("=" * 70)
    print("[1/3] Building knowledge pack...")
    print("=" * 70)
    build_env = dict(os.environ)
    build_env.setdefault("HF_HUB_DISABLE_XET", "1")  # see session notes: more reliable
                                                       # on flaky networks than the newer
                                                       # Xet transport, no functional downside
    build_env["MOSSY_BASE_DIR"] = str(NEXUS_DIR / "build")
    subprocess.run([python, "build_knowledge_db_nexus.py"], check=True, cwd=NEXUS_DIR, env=build_env)

    # 2. Compile brain_b_slim.py with PyInstaller.
    print("=" * 70)
    print("[2/3] Compiling brain_b_slim.py with PyInstaller...")
    print("=" * 70)
    spec_file = NEXUS_DIR / "brain_b_slim.spec"
    if spec_file.exists():
        spec_file.unlink()  # force a fresh spec each build — stale specs have caused
                             # confusing path-mangling issues before (see session notes)
    pyinstaller_cmd = [
        python, "-m", "PyInstaller",
        "--onedir",
        "--name", "brain_b_slim",
        "--distpath", "dist",
        "--workpath", "pyinstaller-build",
        "--specpath", ".",
        "--hidden-import=chromadb.telemetry.product.posthog",
        "--hidden-import=onnxruntime",
        "--hidden-import=fastembed",
        "--hidden-import=knowledge_manifest",
        "--hidden-import=bootstrap_fallout4_knowledge",
        "--collect-all", "chromadb",
        "--collect-all", "chromadb_rust_bindings",
        "--collect-data", "fastembed",
        "--collect-data", "tokenizers",
    ]
    if use_conda_dll_bundling:
        for dll in REQUIRED_DLLS:
            pyinstaller_cmd += ["--add-binary", f"{CONDA_LIB_BIN / dll};."]
    pyinstaller_cmd += ["--noconfirm", "brain_b_slim.py"]
    run(pyinstaller_cmd)

    # 3. Assemble the final shippable package.
    print("=" * 70)
    print("[3/4] Assembling dist-package/...")
    print("=" * 70)
    if DIST_PACKAGE.exists():
        shutil.rmtree(DIST_PACKAGE)
    DIST_PACKAGE.mkdir(parents=True)

    shutil.copytree(NEXUS_DIR / "dist" / "brain_b_slim", DIST_PACKAGE / "brain_b_slim")
    shutil.copytree(NEXUS_DIR / "build" / "data" / "chroma_curated",
                     DIST_PACKAGE / "knowledge" / "chroma_curated")
    shutil.copytree(NEXUS_DIR / "build" / "models", DIST_PACKAGE / "embed-model")

    def dir_size_mb(p: Path) -> float:
        return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) / 1e6

    # 4. Zip + checksum manifest. Both are load-bearing for the download path, not
    #    just packaging convenience: a 200+MB unattended download fails partway more
    #    often than you'd think, and a truncated ChromaDB doesn't announce itself —
    #    it opens, returns garbage or nothing, and looks like a retrieval bug three
    #    weeks later instead of a clean install-time failure. The manifest is a
    #    separate JSON asset (not parsed from release-notes text) so the app can
    #    verify the complete download against it before ever touching extraction —
    #    see main.ts's Brain B lifecycle wiring for the verify-then-extract flow.
    print("=" * 70)
    print("[4/4] Zipping + writing checksum manifest...")
    print("=" * 70)
    version = os.environ.get("MOSSY_BRAINB_VERSION", "dev")
    zip_name = f"brain-b-nexus-v{version}.zip"
    zip_path = NEXUS_DIR / zip_name
    if zip_path.exists():
        zip_path.unlink()
    shutil.make_archive(str(zip_path.with_suffix("")), "zip", DIST_PACKAGE)

    import hashlib
    import json
    from datetime import datetime, timezone

    sha256 = hashlib.sha256()
    with open(zip_path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            sha256.update(chunk)

    manifest = {
        "version": version,
        "filename": zip_name,
        "sha256": sha256.hexdigest().upper(),
        "size_bytes": zip_path.stat().st_size,
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    manifest_path = NEXUS_DIR / f"brain-b-nexus-v{version}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print("\n" + "=" * 70)
    print("BUILD COMPLETE")
    print("=" * 70)
    print(f"Package: {DIST_PACKAGE}")
    print(f"  brain_b_slim/  {dir_size_mb(DIST_PACKAGE / 'brain_b_slim'):.0f} MB")
    print(f"  knowledge/     {dir_size_mb(DIST_PACKAGE / 'knowledge'):.0f} MB")
    print(f"  embed-model/   {dir_size_mb(DIST_PACKAGE / 'embed-model'):.0f} MB")
    print(f"  TOTAL          {dir_size_mb(DIST_PACKAGE):.0f} MB")
    print(f"\nZip: {zip_path} ({manifest['size_bytes'] / 1e6:.0f} MB)")
    print(f"Manifest: {manifest_path}")
    print(f"SHA-256: {manifest['sha256']}")
    print("\nBoth files upload as separate GitHub Release assets. Set MOSSY_BRAINB_VERSION")
    print("to override the 'dev' default version tag used in the filename.")
    print("\nElectron spawns brain_b_slim/brain_b_slim.exe with env vars pointing at")
    print("knowledge/chroma_curated and embed-model — see main.ts's Brain B lifecycle wiring.")


if __name__ == "__main__":
    main()
