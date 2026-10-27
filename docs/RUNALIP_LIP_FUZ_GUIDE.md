# Runalip: LIP / FUZ generation for Fallout 4 (verified)

Runalip (v1.6.0.0, by Perchik71) makes `.LIP` lip-sync files, and optionally `.FUZ` files, in bulk from `.WAV` or `.FUZ` voice files plus a Lazy Voice Finder `.CSV`.
It ships as `Runalip.exe` (console) and `RunalipUI.exe` (interface). Put it in a folder of your choice; the examples below call that folder `<Runalip>`.

## Verified command (tested 2026-10-17, produced a valid .lip, exit code 0)

    Runalip -genlips FO4 "file.csv" "SrcPath" "DstPath" [-nfuz] [-hq]

Version 1.6 REQUIRES `-genlips` first. The bundled README and the Nexus page leave it out; without it Runalip only prints usage and exits with code 1.

- `-nfuz`: also build new `.FUZ` files. `-hq`: high quality `.FUZ` (WAV sources only). The `-nfuz` option has not been tested yet.
- Other modes: `-volume`, `-high_quality`, `-reduce`, `-reduce2`, `-loudnorm`, `-declick` (see the usage text Runalip prints).
- Tip: keep a small batch file next to `Runalip.exe` with the CSV, source and destination paths at the top, so a run is one double-click.

## Requirements
- `FaceFXWrapper.exe` in `<Runalip>\tools\` (it comes with the Creation Kit tools; copy it there).
- On first run Runalip unpacks its own ffmpeg, sox, fuz_extractor and xWMAEncode into `tools\`. No separate downloads or compiling needed.
- Microsoft Visual C++ Redistributable.
- All paths fully English. Loose files only (unpack BA2 archives first).

## Input layout
`<SrcPath>\<Plugin.esp>\<VoiceType>\<filename>.wav` (or .fuz). The CSV must have exactly 6 columns:
`"State","Plugin","Filename","Voice Type","Dialogue 1 - en","Dialogue 2 - en"`. The last column is the text used for lip-sync. UTF-8 for Fallout 4. Rows with fewer than 6 columns are skipped with a warning (a trailing blank line gives two harmless warnings).

## Output
`<DstPath>\<Plugin.esp>\<VoiceType>\<filename>.lip`. Errors go to `Runalip.log`.

## Related local AI
KoboldCpp (`http://localhost:5001`, OpenAI-compatible, has text-to-speech) can make the voice lines on your own PC; Runalip then makes the lips.
