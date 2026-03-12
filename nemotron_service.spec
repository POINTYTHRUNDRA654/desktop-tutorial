# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Nemotron standalone service
Creates: nemotron-service.exe (self-contained, no dependencies needed)
"""

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

a = Analysis(
    ['nemotron_service.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Include transformers data files
        *collect_data_files('transformers'),
        *collect_data_files('torch'),
        *collect_data_files('tokenizers'),
    ],
    hiddenimports=[
        'transformers',
        'torch',
        'transformers.models',
        'transformers.models.auto',
        'transformers.tokenization_utils_base',
    ] + collect_submodules('transformers'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='nemotron-service',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Console window for debugging/logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='nemotron-service',
)
