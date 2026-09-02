#!/usr/bin/env python3
"""Auto-increment alpha version in VERSION file."""

from __future__ import annotations

import re
from pathlib import Path

VERSION_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)-Alpha\.(\d+)$")


def bump_alpha(version: str) -> str:
    match = VERSION_PATTERN.match(version.strip())
    if not match:
        return "0.1.0-Alpha.1"

    major, minor, patch, build = match.groups()
    return f"{major}.{minor}.{patch}-Alpha.{int(build) + 1}"


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    version_file = repo_root / "VERSION"

    current = version_file.read_text(encoding="utf-8").strip() if version_file.exists() else ""
    new_version = bump_alpha(current)
    version_file.write_text(f"{new_version}\n", encoding="utf-8")
    print(new_version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
