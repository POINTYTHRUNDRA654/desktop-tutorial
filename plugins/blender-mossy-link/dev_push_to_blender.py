"""
dev_push_to_blender.py
======================
Development utility: copies all source .py files directly to the installed
Blender addon directory and clears __pycache__.

Run from the repo root:
    python dev_push_to_blender.py

Then just restart Blender — no zip install needed.
"""
import shutil, pathlib, ast, sys

SOURCE    = pathlib.Path(__file__).parent
INSTALLED = pathlib.Path(
    r"C:\Users\Owner\AppData\Roaming\Blender Foundation\Blender\5.1"
    r"\extensions\user_default\blender_game_tools"
)

EXCLUDES = {'.git', '__pycache__', '.mypy_cache', '.venv', 'node_modules'}
EXCLUDE_EXT = {'.pyc', '.pyo', '.orig'}

if not INSTALLED.exists():
    print(f"ERROR: Installed path not found: {INSTALLED}")
    sys.exit(1)

errors = []
copied = 0

for src in sorted(SOURCE.rglob('*')):
    if any(part in EXCLUDES for part in src.parts):
        continue
    if src.suffix in EXCLUDE_EXT:
        continue
    if not src.is_file():
        continue
    # skip this script itself
    if src.name == 'dev_push_to_blender.py':
        continue

    rel = src.relative_to(SOURCE)
    dst = INSTALLED / rel
    dst.parent.mkdir(parents=True, exist_ok=True)

    # syntax check .py files before copying
    if src.suffix == '.py':
        try:
            ast.parse(src.read_text(encoding='utf-8', errors='replace'))
        except SyntaxError as e:
            errors.append(f"SYNTAX ERROR {rel}: {e}")
            continue

    shutil.copy2(src, dst)
    copied += 1

# clear all __pycache__ so Blender picks up new .py files
cleared = 0
for cache in INSTALLED.rglob('__pycache__'):
    shutil.rmtree(cache, ignore_errors=True)
    cleared += 1

print(f"Copied {copied} files to {INSTALLED}")
print(f"Cleared {cleared} __pycache__ folder(s)")

if errors:
    print(f"\n{len(errors)} file(s) skipped due to syntax errors:")
    for e in errors:
        print(f"  {e}")
    sys.exit(1)
else:
    print("\nAll done — restart Blender to pick up changes.")

print("""
NOTE: The following Niftools files at
  ...\\scripts\\addons\\io_scene_niftools\\
have been manually patched and are NOT touched by this script:
  modules/nif_import/geometry/vertex/__init__.py  — use_auto_smooth guard (Blender 4.1+)
  operators/nif_import_op.py                      — invoke/execute redirect to PyNifly
  operators/nif_export_op.py                      — invoke/execute redirect to PyNifly
These patches survive Blender restarts but NOT a Niftools reinstall/update.
""")
