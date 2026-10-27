"""
Build Mossy's optional "starter memory" pack from a game-scan-cache folder.

The pack is the output of Mossy's own Fallout 4 scanners (scripts/fo4_*.py),
pre-built so a new user can skip hours of scanning. It is published as a
GitHub release asset and installed by Mossy only when the user asks for it.

Rules (decided 2026-10-26, see docs/MEMORY_PACK.md):
  * Facts only, no game text: files that are mostly Bethesda's written text are
    left out entirely, and any remaining prose string (60+ characters with 8+
    spaces: descriptions, quest log entries, documentation comments) is
    removed from the files that are kept. Short names/identifiers stay.
  * Bethesda data only: the build fails if any record names a plugin outside
    Fallout4.esm, its DLCs and Creation Club (cc*.es?) content.
  * No machine paths: absolute paths are cut to the part from "Data\\" on, or
    dropped when they have none.

Usage:
  python scripts/build_memory_pack.py <game-scan-cache dir> <output dir> [version]
Writes mossy-memory-pack-v<version>.zip and a .manifest.json (sha256 per file
and for the zip) next to it.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

EXCLUDE = {
    'fo4_world_strings.json': 'in-game text strings',
    'fo4_dialogue_graph.json': 'dialogue text',
    'fo4_terminals.json': 'terminal text',
    'knowledge-vault.json': "the user's own knowledge vault (personal)",
}
BETHESDA = re.compile(r'^(fallout4|dlcrobot|dlcworkshop0[123]|dlccoast|dlcnukaworld|dlcultrahighresolution|cc[a-z0-9]+)\.(esm|esl|esp)$', re.I)
# Bethesda's own internal source-plugin names, referenced inside DLC static collections.
BETHESDA_INTERNAL = re.compile(r'^(gravato|rwisnewski|scornett)[\w-]*\.esp$', re.I)
PLUGIN = re.compile(r'[\w .&\'()+-]+\.(?:esm|esp|esl)\b', re.I)
ABS_PATH = re.compile(r'^[A-Za-z]:[\\/]')


def is_prose(s: str) -> bool:
    return len(s) >= 60 and s.count(' ') >= 8


def clean_path(s: str) -> str | None:
    m = re.search(r'[\\/]data[\\/](.*)$', s, re.I)
    return m.group(1) if m else None


def clean(o, stats):
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            c = clean(v, stats)
            if c is not _DROP:
                out[k] = c
        return out
    if isinstance(o, list):
        return [c for c in (clean(v, stats) for v in o) if c is not _DROP]
    if isinstance(o, str):
        if ABS_PATH.match(o):
            stats['paths'] += 1
            rel = clean_path(o)
            return rel if rel is not None else _DROP
        if is_prose(o):
            stats['prose'] += 1
            return _DROP
    return o


_DROP = object()


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    version = sys.argv[3] if len(sys.argv) > 3 else '1'
    stage = out / f'mossy-memory-pack-v{version}'
    stage.mkdir(parents=True, exist_ok=True)
    files, skipped, problems = {}, {}, []

    for f in sorted(src.glob('fo4_*.json')) + sorted(src.glob('knowledge-vault.json')):
        if f.name in EXCLUDE:
            skipped[f.name] = EXCLUDE[f.name]
            continue
        raw = f.read_text(encoding='utf-8')
        plugins = {p.strip() for p in PLUGIN.findall(raw)}
        foreign = sorted(p for p in plugins if not BETHESDA.match(p) and not BETHESDA_INTERNAL.match(p))
        if foreign:
            problems.append(f'{f.name}: non-Bethesda plugins {foreign[:5]}')
            continue
        stats = {'paths': 0, 'prose': 0}
        data = clean(json.loads(raw), stats)
        target = stage / f.name
        target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        # Verify the written file, not the intent: no absolute paths, no prose left.
        written = target.read_text(encoding='utf-8')
        if re.search(r'"[A-Za-z]:\\\\', written):
            problems.append(f'{f.name}: absolute path survived cleaning')
        files[f.name] = {'sha256': sha256(target), 'bytes': target.stat().st_size, 'paths_cleaned': stats['paths'], 'prose_removed': stats['prose']}
        print(f'{f.name:52} {target.stat().st_size // 1024:>7} KB  paths {stats["paths"]:>4}  prose removed {stats["prose"]:>5}')

    if problems:
        print('\nBUILD FAILED:\n  ' + '\n  '.join(problems))
        return 1

    zip_path = out / f'mossy-memory-pack-v{version}.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in files:
            z.write(stage / name, name)
    manifest = {
        'name': 'Mossy starter memory',
        'version': version,
        'built_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'zip': zip_path.name,
        'zip_sha256': sha256(zip_path),
        'zip_bytes': zip_path.stat().st_size,
        'files': files,
        'left_out': skipped,
        'rules': 'Bethesda data only; facts only (prose strings and text-heavy files removed); machine paths stripped.',
    }
    (out / f'mossy-memory-pack-v{version}.manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'\n{zip_path} {zip_path.stat().st_size / 1048576:.1f} MB, {len(files)} files, left out: {", ".join(skipped)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
