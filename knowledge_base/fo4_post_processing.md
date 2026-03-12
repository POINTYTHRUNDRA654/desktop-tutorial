# Fallout 4 Post-Processing – Complete Reference

## Overview

Fallout 4 applies screen-space post-processing through two Creation Kit record
types:

| CK Record | Form type | Purpose |
|-----------|-----------|---------|
| `ImageSpace` | IMGS | Static visual settings used by a cell or weather |
| `ImageSpace Modifier` | IMAD | Animated transition between two visual states |

This add-on provides a **live compositor preview** in Blender (bloom, colour
grading, vignette, depth-of-field) and a **JSON export** that maps 1-to-1 onto
CK record fields, so you can author your post-processing look in Blender and
then reproduce it exactly in the game.

---

## Workflow

1. Open the **Post-Processing (FO4)** panel in the Fallout 4 sidebar.
2. Click **Setup Compositor** (choose a starting preset from the dropdown).
3. Switch the 3-D viewport shading to **Rendered** mode (`Z` → Rendered).
4. Adjust the sliders – the compositor preview updates in real time.
5. When satisfied, click **Export ImageSpace JSON** to save a `.json` file.
6. Open Creation Kit, locate or create your `ImageSpace` record, and enter
   the exported values (see mapping table below).

---

## Built-in Presets

| Preset ID    | Label              | Use case |
|--------------|--------------------|----------|
| `VANILLA`    | Vanilla            | Neutral starting point matching default FO4 |
| `PIPBOY`     | Pip-Boy            | Green monochrome when Pip-Boy is open |
| `COMBAT`     | Combat             | High-contrast desaturated warzone look |
| `EXPLORATION`| Exploration        | Warm golden outdoor lighting |
| `NIGHT`      | Night / Dark       | Cool blue tint for dark/interior areas |
| `VAULT`      | Vault Interior     | Cool-white fluorescent vault look |
| `CINEMATIC`  | Cinematic          | Widescreen bars + film-grade colour |
| `DRUG`       | Drug Effect        | Psychedelic for Jet / Mentats effects |
| `RADIATION`  | Radiation Sickness | Sickly green for heavy irradiation |
| `CUSTOM`     | Custom             | All sliders available for manual tuning |

---

## Field Reference: ImageSpace (IMGS)

| Add-on Property             | CK Field Name            | Range  | Default | Notes |
|-----------------------------|--------------------------|--------|---------|-------|
| `fo4_pp_bloom_strength`     | `BloomScale`             | 0–2    | 0.4     | Overall bloom multiplier |
| `fo4_pp_bloom_threshold`    | `BloomThreshold`         | 0–2    | 0.8     | Luminance before bloom fires |
| `fo4_pp_bloom_threshold`    | `ReceiveBloomThreshold`  | 0–2    | 0.8     | Mesh-level bloom receive threshold |
| `fo4_pp_bloom_radius`       | `BloomBlurRadius`        | 0–1    | 0.3     | Kernel radius (normalised) |
| `fo4_pp_saturation`         | `Saturation`             | 0–3    | 1.0     | 0 = greyscale, 1 = normal |
| `fo4_pp_contrast`           | `Contrast`               | 0–3    | 1.0     | 1 = normal |
| `fo4_pp_tint_r/g/b`         | `TintColor (R/G/B)`      | 0–2    | 1/1/1   | Screen tint colour |
| `fo4_pp_tint_strength`      | `TintColor (A)`          | 0–1    | 0.0     | Tint opacity |
| `fo4_pp_cinematic_bars`     | `CinematicBars`          | 0–0.5  | 0.0     | Letterbox height |
| `fo4_pp_eye_adapt_speed`    | `EyeAdaptSpeed`          | 0–10   | 2.0     | HDR exposure adaptation rate |
| `fo4_pp_eye_adapt_strength` | `EyeAdaptStrength`       | 0–2    | 0.5     | Max HDR exposure compensation |
| `fo4_pp_white`              | `White`                  | 0.1–2  | 1.0     | Tonemapper white level |

> **Note**: `Brightness` and `Vignette` are Blender-compositor-only effects.
> They do not have a direct CK equivalent.  Adjust `Contrast` slightly in CK
> to approximate the brightness change, and leave vignette as an artistic
> rendering aid only.

---

## Field Reference: ImageSpace Modifier (IMAD)

The IMAD record stores **animated** transitions.  The add-on exports a
`fo4_imagespace_modifier` block in the JSON with the following fields:

| JSON Field                | CK Field                     | Notes |
|---------------------------|------------------------------|-------|
| `Duration`                | Duration                     | Seconds for the full transition |
| `DepthOfField.Strength`   | DepthOfField → Strength      | 0 = off, 1 = full |
| `DepthOfField.Distance`   | DepthOfField → Distance      | Focus distance in game units |
| `DepthOfField.Range`      | DepthOfField → Range         | Depth of focus window |
| `Bloom.Strength`          | Bloom → Strength             | |
| `Tint.R/G/B/A`            | Color → R/G/B/A              | |
| `Saturation`              | Saturation → Value           | |
| `Contrast`                | Contrast → Value             | |

To create a transition effect (e.g. screen flash on explosion):
1. Export the "before" state JSON (neutral / Vanilla preset).
2. Change settings to the "after" state (e.g. very bright, saturated).
3. Export a second JSON.
4. In CK: create an IMAD record, fill the **Start** tab from JSON 1 and the
   **End** tab from JSON 2.
5. Set Duration to the desired flash length (e.g. 0.5 seconds).

---

## Creation Kit: How to Enter the Values

### Static ImageSpace (IMGS)

1. In CK, go to **World → Image Spaces**.
2. Open or create a new `ImageSpace` record.
3. In the **Cinematic** tab: enter `Saturation`, `Contrast`, `TintColor`.
4. In the **HDR** tab: enter `EyeAdaptSpeed`, `EyeAdaptStrength`,
   `BloomScale`, `BloomBlurRadius`, `BloomThreshold`.
5. Click **OK** and save.
6. Assign the IMGS record to your cell via the cell's **Image Space** field,
   or attach it to a Weather record.

### Animated ImageSpace Modifier (IMAD)

1. Go to **Special Effects → Image Space Modifiers**.
2. Create a new `ImageSpaceModifier` record.
3. Fill each tab (Bloom, Color, DepthOfField, etc.) with the values from the
   `fo4_imagespace_modifier` block in the exported JSON.
4. To play the effect in-game use the console:
   ```
   player.addspell <IMAD FormID>
   ```
   Or attach it to a Magic Effect / Script using `Utility.ApplyImageSpaceModifier`.

---

## Compositor Node Reference

The **Setup Compositor** operator creates the following node chain:

```
[Render Layers] → [Glare (Bloom)] → [Hue/Sat] → [Brightness/Contrast]
    → [Tint Mix] → [Vignette (Ellipse Mask + Blur + Invert + Multiply)]
    → [Defocus (optional, DoF)] → [Composite Output]
```

All nodes are named `FO4_PP_*` so **Clear Post-Processing** can remove them
without touching user-created nodes.

| Node name             | Type                      | Controls |
|-----------------------|---------------------------|----------|
| `FO4_PP_Input`        | Render Layers             | Scene render |
| `FO4_PP_Glare`        | Glare (BLOOM mode)        | Bloom |
| `FO4_PP_HueSat`       | Hue/Saturation/Value      | Saturation |
| `FO4_PP_Brightness`   | Brightness/Contrast       | Brightness, Contrast |
| `FO4_PP_TintMix`      | Mix RGB (MIX blend)       | Colour tint |
| `FO4_PP_Vignette`     | Ellipse Mask              | Vignette shape |
| `FO4_PP_VigBlur`      | Blur (GAUSS)              | Vignette softness |
| `FO4_PP_VigInvert`    | Invert                    | Edge darkening |
| `FO4_PP_VigMix`       | Mix RGB (MULTIPLY blend)  | Vignette strength |
| `FO4_PP_Defocus`      | Defocus (optional)        | Depth of field |
| `FO4_PP_Output`       | Composite                 | Final output |

---

## Tips

- **Vanilla as baseline**: Always start from the Vanilla preset and then
  tweak.  Most FO4 environments use very subtle post-processing; heavy
  saturation or colour tints become fatiguing quickly.

- **Pip-Boy effect**: The Pip-Boy IMAD is stored in
  `Fallout4.esm > ImageSpaceModifier > PipboyEffect`.  Copy its values into
  a custom IMAD if you want to trigger the Pip-Boy look from a script or
  spell.

- **Performance**: `EyeAdaptSpeed` affects how fast the in-game HDR exposure
  corrects in bright/dark areas.  Very low values (< 1) cause slow, cinematic
  adaptation; very high values (> 5) cause flickering in areas with mixed
  lighting.  2.0 is a safe default.

- **Cinematic bars**: These are purely cosmetic (added in the compositor).  In
  CK they are controlled by `CinematicBars` in the IMGS record.  A value of
  0.1 gives subtle widescreen bars; 0.15 is the typical cinematic cut-scene
  look.

- **Testing in-game**: Use the CK **Preview** button in the ImageSpace editor
  to get a rough live preview, then test with a test ESP in-game using
  `coc <yourcell>` console command.
