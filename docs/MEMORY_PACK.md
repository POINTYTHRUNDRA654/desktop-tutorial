# Mossy starter memory pack

The starter memory is the output of Mossy's own Fallout 4 scanners (`scripts/fo4_*.py`), built ahead of time. A new user can download it from **Settings > Your PC** and skip hours of scanning. It lands in Mossy's game-scan folder: Mossy's data folder by default, or another drive if the user chooses one.

## What's in it

- 59 files of game knowledge from Fallout 4, its DLCs and Creation Club content: FormIDs, record graphs, placements, leveled lists, object mods and so on. That's about 117 MB unpacked, as a 7 MB zip.
- **Bethesda data only.** The build fails if any file names a plugin from a third-party mod.
- **Facts only, no game text.** These files are left out entirely:
  - `fo4_world_strings` (in-game strings)
  - `fo4_dialogue_graph` (dialogue)
  - `fo4_terminals` (terminal text)

  In every other file, any prose string (60 or more characters with 8 or more spaces, such as a description, a quest log entry or a documentation comment) is removed. Short names and identifiers stay.
- **No machine paths.** Absolute paths are cut to the part from `Data\` on, or dropped if they have no `Data\` part.

A user's own scans always win: the installer only adds files they don't already have. Their own scans also fill in the text-heavy files from their own copy of the game.

## Building and publishing

```
python scripts/build_memory_pack.py "%APPDATA%\mossy-desktop\game-scan-cache" <out-dir> 1
```

This writes `mossy-memory-pack-v1.zip` and `mossy-memory-pack-v1.manifest.json`. The manifest holds the SHA-256 of the zip and of every file inside it.

Upload both files to a GitHub release tagged `memory-pack-v1` on this repo. Mossy downloads from that tag and refuses anything that doesn't match the manifest. Draft releases can't be downloaded by other users, so the release has to be published before it works for them.
