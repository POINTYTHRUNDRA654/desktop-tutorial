import pathlib
import re
import zipfile

root = pathlib.Path(__file__).resolve().parent


def read_version() -> str:
    """Extract the add-on version from __init__.py as a dotted string."""
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r"\"version\"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)", init_text)
    if not match:
        return "0.0.0"
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{patch}"


def should_skip(rel: pathlib.Path) -> bool:
    """Skip development, cache, and virtual env paths from the ZIP."""
    skip_roots = {".git"}
    cache_dirs = {"__pycache__", ".mypy_cache", ".pytest_cache", ".idea", ".vscode"}
    if rel.parts and (rel.parts[0] in skip_roots or rel.parts[0].startswith(".venv")):
        return True
    return any(part in cache_dirs or part.endswith(".pyc") for part in rel.parts)


def main() -> None:
    version = read_version()
    addon_name = root.name
    zip_path = root.parent / f"{addon_name}-v{version}.zip"

    # Use a low compression level to keep packaging fast for large bundled tools like ffmpeg
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if should_skip(rel):
                continue
            arcname = pathlib.Path(addon_name) / rel
            zf.write(path, arcname)

    print("Created", zip_path)


if __name__ == "__main__":
    main()
