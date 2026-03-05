"""Simple build script for the add-on.

Usage from PowerShell:
    py build.py          # use the launcher, works even if "python" isn't on PATH

The script rebuilds the zip exactly the same as makezip.py but also writes a
line to build.log so you can see when the archive was created.
"""
import pathlib, re, zipfile, datetime

root = pathlib.Path(__file__).resolve().parent
ADDON_PACKAGE = "fallout4_tutorial_helper"


def read_version() -> str:
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r"\"version\"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)", init_text)
    if not match:
        return "0.0.0"
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{patch}"


def should_skip(rel: pathlib.Path) -> bool:
    skip_roots = {".git", ".github"}
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if rel.parts and (rel.parts[0] in skip_roots or rel.parts[0].startswith(".venv")):
        return True
    if rel.name.startswith(f"{ADDON_PACKAGE}-") and rel.name.endswith(".zip"):
        return True
    return any(part in cache_dirs or part.endswith(".pyc") for part in rel.parts)


def main():
    version = read_version()
    zip_name = f"{ADDON_PACKAGE}-v{version}.zip"
    zip_path = root / zip_name

    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel):
                continue
            arcname = pathlib.Path(ADDON_PACKAGE) / rel
            zf.write(path, arcname)

    log = root / "build.log"
    with open(log, "a") as f:
        f.write(f"{datetime.datetime.now().isoformat()} built {zip_name}\n")

    print("Rebuilt", zip_path)


if __name__ == "__main__":
    main()
