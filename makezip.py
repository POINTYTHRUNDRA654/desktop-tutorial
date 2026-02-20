import pathlib
import re
import zipfile

root = pathlib.Path(__file__).resolve().parent

# The folder name used inside the zip must be a valid Python identifier so that
# Blender can import the package.  The repository directory is named
# "Blender-add-on." which contains hyphens and a trailing period — both illegal
# in Python package names.  We therefore use a fixed, sanitised name here.
ADDON_PACKAGE = "fallout4_tutorial_helper"


def read_version() -> str:
    """Extract the add-on version from __init__.py as a dotted string."""
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r"\"version\"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)", init_text)
    if not match:
        return "0.0.0"
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{patch}"


def should_skip(rel: pathlib.Path, zip_name: str = "") -> bool:
    """Skip development, cache, and virtual env paths from the ZIP."""
    skip_roots = {".git"}
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if rel.parts and (rel.parts[0] in skip_roots or rel.parts[0].startswith(".venv")):
        return True
    # Exclude only the add-on's own output zip to avoid self-referential archives.
    # Other .zip files (bundled assets, tools) are kept.
    if zip_name and rel.name == zip_name:
        return True
    return any(part in cache_dirs or part.endswith(".pyc") for part in rel.parts)


def main() -> None:
    version = read_version()
    zip_name = f"{ADDON_PACKAGE}-v{version}.zip"
    # Place the zip in the repo root so it is easy to download from GitHub
    zip_path = root / zip_name

    # Use a low compression level to keep packaging fast for large bundled tools like ffmpeg
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel, zip_name):
                continue
            arcname = pathlib.Path(ADDON_PACKAGE) / rel
            zf.write(path, arcname)

    print("Created", zip_path)


if __name__ == "__main__":
    main()
