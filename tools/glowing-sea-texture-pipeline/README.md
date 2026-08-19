# Glowing Sea Batch Texture Enhancement Pipeline

Standalone 4-stage Python pipeline for AI-enhancing FO4 diffuse textures
(Glowing Sea fungal/organic style) while guaranteeing no pixel outside the
original silhouette can drift, and the alpha channel is preserved
byte-for-byte. Not wired into MOSSY.SPACE — run it from the command line.

## Stages

1. `extract_uv_mask.py` — derives a binary "used" mask per texture from its
   alpha channel.
2. `enhance.py` — runs each texture through ComfyUI img2img (reuses the exact
   node graph MOSSY.SPACE's own Texture Enhancer uses — see
   `src/electron/main.ts`'s `buildComfyImg2ImgWorkflow`/`comfyuiRunWorkflow`,
   ported to Python rather than reimplemented).
3. `composite_lock.py` — the load-bearing stage. Resizes the enhanced result
   to the original's exact dimensions, flags large spatial drift (FFT phase
   correlation) or scale correction for manual review, composites original
   pixels everywhere the mask says "unused" and enhanced pixels only where
   it says "used," then copies the original alpha channel back byte-for-byte.
4. `finalize.py` — noise reduction, sharpening, and a mild contrast/color
   pass (RGB only — alpha is left untouched), then re-composites RGB against
   the same real mask from stage 1 (the finishing filters run over the whole
   canvas for context, but any pixel outside the mask must come out exactly
   as it went in — confirmed necessary against a real file, see "Known real
   limits" below), then writes to `Output/` under the original filename, in
   the original's real `.dds` compression format (via `texconv.exe`).

Run all four via `run_pipeline.bat "<folder>"`, where `<folder>\Input\`
contains your source textures. Each stage's intermediate output is kept on
disk so a failure partway through doesn't force re-running earlier (paid/
metered) stages.

## Mask convention (confirmed against real files, 2026-08-19)

Before writing `extract_uv_mask.py`, its assumed alpha convention was checked
against Billy's actual source textures — both
`E:\Mod.Organizer-3 Work Mods&Overwrites\Fallout 4 Moss AIO - Glowing Sea Now
Glows Redux\Textures\` and `F:\FO4 WORKING FLODER\Textures`. Finding:

- Most FO4 diffuse `.dds` files have a completely flat, fully opaque alpha
  channel (every pixel = 255). There is no per-pixel "unused" signal to
  extract for these — the whole canvas genuinely is painted/used content, not
  a texture atlas with dead space. Treating this as "mask = full canvas" is
  the accurate answer, not a fallback guess.
- A minority — alpha-tested cutout geometry like foliage/plant cards
  (e.g. `gsfunguscarnivorousplant04_d.dds`) — have real alpha variation
  (observed range roughly 134-255). That variation IS a genuine silhouette
  and is used as the real per-pixel mask.
- No solid-color-background convention exists in the RGB channels either;
  corner/center samples on flat-alpha files were real painted content, not a
  placeholder fill that could substitute for a missing alpha signal.

`extract_uv_mask.py` branches per-file on this (`FLAT_ALPHA_RANGE_THRESHOLD =
8` in that file), rather than assuming one convention for an entire batch.
This means for the common flat-alpha case, `composite_lock.py`'s "no pixel
outside the mask" guarantee is nearly vacuous (there's no "outside") — the
real protection it provides is for the minority of files with genuine cutout
alpha, where stage 2's generation is spatially confined to the actual
silhouette instead of leaking into transparent/unused regions.

## Testing

`test_pipeline.py` runs the full pipeline against a handful of real source
textures (not synthetic ones) and asserts, per output file:

1. Dimensions match the original.
2. Alpha matches the original byte-for-byte inside the mask's "used" region.
3. Alpha is exactly 0 (fully transparent) for every pixel outside the mask —
   composite_lock.py forces this rather than leaving whatever partial alpha
   the original silhouette edge happened to have.
4. Every RGB pixel outside the mask's "used" region is byte-identical to the
   original — the actual "no floating artifacts" guarantee, checked directly
   rather than eyeballed.

If ComfyUI isn't reachable when the test runs, stage 2 is skipped and the
original image is used unmodified as a stand-in, so stages 3/4's mechanics
still get exercised — this is stated plainly in the test's own output and
never presented as a full end-to-end pass.

```bash
python test_pipeline.py "<real texture folder>" [count]
```

## Known real limits

- **BC-compressed alpha is lossy.** BC1/BC2/BC3/BC7 encode alpha as a small
  set of interpolated values, not raw bytes. Writing a `.dds` back out through
  `texconv` in the source's original format introduced real, small alpha
  drift on every real cutout-alpha file tested (2026-08-19): 2/255 max on a
  4096x4096 Glowing Sea texture, up to 10/255 max on a 512x512 Assaultron arm
  texture (smooth quantization histogram, no outliers — a real BC3 property,
  not a bug). `test_pipeline.py` checks exact equality first and only allows
  a small, explicit tolerance (`ALPHA_TOLERANCE_BC = 16`, set with headroom
  above the largest real value observed) for BC-format output — this is a
  property of the compressed format itself, not something this pipeline can
  avoid while still writing a real game-compatible `.dds`. Alpha=0 outside
  the mask boundary is unaffected by this — 0 and 255 are always exact
  endpoints in BC's alpha ramp, confirmed zero-tolerance-exact on every real
  file tested.
- **BC-compressed RGB is also lossy, at mask-boundary blocks specifically.**
  Confirmed against `gsfunguscarnivorousplant04_d.dds`: RGB is byte-identical
  to the original outside the mask immediately after composite_lock.py and
  finalize.py's own PNG-stage re-masking (0 pixels differ). The only drift
  appears after the final `.dds` write — BC block compression operates on 4x4
  pixel blocks, and a block straddling the mask edge (pristine pixels next to
  enhanced ones) can't represent both exactly, so pristine-side pixels in
  those blocks quantize slightly (2.8% of unused pixels affected, mean delta
  ~1.4/255, max ~83/255 in the worst block). This does not produce a visible
  artifact in-game: those same pixels have alpha=0 (see above), so they don't
  render regardless of RGB value. `test_pipeline.py` only fails on RGB drift
  that coincides with nonzero alpha (an actually visible leak) and reports
  alpha=0 drift as a diagnostic.
- **This machine's `texconv.exe` build doesn't support `-y`** (it dumps its
  usage text and exits 1 instead of erroring cleanly) and only accepts modern
  DXGI format names for `-f`, not legacy FourCC strings like `DXT5` — both
  confirmed directly and fixed in `common.py`. If a different texconv build
  is used elsewhere, re-verify both of these.

## Requirements

```
pip install -r requirements.txt
```

Needs `texconv.exe` (Microsoft DirectXTex CLI) for `.dds` output — path is
set in `config.json`'s `texconv_path`. Needs ComfyUI running locally
(`http://127.0.0.1:8188` by default) for stage 2.
