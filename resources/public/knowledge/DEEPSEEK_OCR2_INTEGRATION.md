# DeepSeek-OCR-2 Integration (Mossy)

This document wires the local DeepSeek-OCR-2 repository into Mossy as a documented OCR/vision integration. The repo is expected to live in this workspace under:

- external/deepseek-ai/DeepSeek-OCR-2

Mossy does not run DeepSeek-OCR-2 directly inside the app yet. Instead, this integration provides a stable, documented entry point for local indexing, dependency setup, and reference.

## What It Is

DeepSeek-OCR-2 is a document OCR model and workflow for converting images or PDFs into structured markdown with layout awareness.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Dependency notes: Use this doc as the local checklist for the upstream Python stack.
- Workflow notes: Use the local clone path below when wiring external OCR experiments.

## Recommended Clone Path

```bash
git clone https://github.com/deepseek-ai/DeepSeek-OCR-2.git external/deepseek-ai/DeepSeek-OCR-2
```

## Recommended Workflow

1. Clone the repo into:
   - `external/deepseek-ai/DeepSeek-OCR-2`
2. Open Knowledge Search in Mossy.
3. Add the repo folder as a knowledge root:
   - `external/deepseek-ai/DeepSeek-OCR-2`
4. Build/refresh the index.
5. Ask questions against the local docs or inspect the upstream examples before wiring OCR automation.

## Fallout 4 Compatibility Profile

DeepSeek-OCR-2 is best treated as a document/spec extraction stage. It does **not** directly generate Fallout 4-ready meshes by itself, so Mossy should route any downstream asset work through the existing Fallout 4 Blender/NIF pipeline.

Use these downstream Fallout 4 targets when turning OCR output into mesh work:

- Treat OCR output as structured reference (`markdown`, dimensions, labels, material notes), not as final mesh data.
- Build meshes in Blender with the Mossy Fallout 4 scene assumptions already used elsewhere in the app:
  - unit scale `1.0`
  - applied transforms before export
  - at least one UV map
  - active mesh budget under Mossy's existing `65,534` triangle guidance
  - armatures under the existing `80` bone guidance
- Export through the Fallout 4 path already used by Mossy:
  - PyNifly `game_type='FO4'`
  - legacy fallback `game='FALLOUT_4'`
  - NIF target version `20.2.0.7`
- Prefer the existing Mossy Blender automation chain after OCR-assisted planning:
  - `fo4_setup_scene`
  - `fo4_apply_transforms`
  - `fo4_check`
  - `fo4_generate_lightmap_uv`
  - `fo4_batch_export`

## Future Runtime Wiring

For future runtime wiring, keep the OCR stage focused on extracting clean Fallout 4 asset specifications, then hand those specs to the Blender add-on/export pipeline for FO4-safe mesh generation.

## Upstream Dependency Notes

Upstream README currently targets:

- Python `3.12.9`
- CUDA `11.8`
- PyTorch `2.6.0`

Baseline upstream `requirements.txt`:

- `transformers==4.46.3`
- `tokenizers==0.20.3`
- `PyMuPDF`
- `img2pdf`
- `einops`
- `easydict`
- `addict`
- `Pillow`
- `numpy`

Optional upstream full-inference extras called out in the README:

- `torch==2.6.0`
- `torchvision==0.21.0`
- `torchaudio==2.6.0`
- `vllm==0.8.5` (via upstream wheel)
- `flash-attn==2.7.3`

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: `external/deepseek-ai/DeepSeek-OCR-2/README.md`
- Requirements: `external/deepseek-ai/DeepSeek-OCR-2/requirements.txt`
- vLLM config/examples: `external/deepseek-ai/DeepSeek-OCR-2/DeepSeek-OCR2-vllm/`
- Transformers example: `external/deepseek-ai/DeepSeek-OCR-2/DeepSeek-OCR2-hf/`
- Paper: `external/deepseek-ai/DeepSeek-OCR-2/DeepSeek_OCR2_paper.pdf`

## Status

- Integrated as a documented, indexable local repo.
- Blender Link now includes direct DeepSeek-OCR-2 FO4 profile controls (prepare/run) through Mossy Link commands.
- Fallout 4 use should flow through Mossy's existing FO4 Blender/NIF export settings, not a standalone OCR-only output path.
- Runtime execution still depends on your local DeepSeek-OCR-2 repo + Python environment being configured in Blender add-on preferences.
