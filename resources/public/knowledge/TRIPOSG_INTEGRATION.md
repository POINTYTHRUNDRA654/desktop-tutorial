# TripoSG Integration (Mossy)

This document wires the local TripoSG repository into Mossy as a documented image-to-3D integration. The repo is expected to live in this workspace under:

- `external/VAST-AI-Research/TripoSG`

Mossy can route TripoSG through Blender Link commands for a Fallout 4-compatible downstream mesh workflow.

## What It Is

TripoSG is a high-fidelity image-to-3D generation model that outputs mesh assets (commonly GLB) from image or scribble+prompt input.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Blender Link runtime: Mossy can send TripoSG FO4 profile commands to the Blender add-on.
- FO4 downstream handoff: generated GLB output should be cleaned/validated in Blender and exported with FO4-safe settings.

## Recommended Clone Path

```bash
git clone https://github.com/VAST-AI-Research/TripoSG.git external/VAST-AI-Research/TripoSG
```

## Recommended Workflow

1. Clone the repo into:
   - `external/VAST-AI-Research/TripoSG`
2. Configure TripoSG repo/python defaults in Blender Add-on Preferences → Mossy Link.
3. In Mossy → Desktop Bridge → Blender tab:
   - Prepare or run TripoSG FO4 profile command.
4. Import resulting `.glb` in Blender and run:
   - `fo4_setup_scene`
   - `fo4_apply_transforms`
   - `fo4_check`
5. Export with FO4-compatible NIF settings (PyNifly FO4 / legacy FALLOUT_4 fallback).

## Upstream Dependency Notes

Typical upstream setup:

- Python `3.10+`
- CUDA-capable GPU (8GB+ VRAM recommended)
- PyTorch + torchvision matching your CUDA build
- `pip install -r requirements.txt`

Upstream `requirements.txt` includes:

- `diffusers`
- `transformers`
- `einops`
- `huggingface_hub`
- `opencv-python`
- `trimesh`
- `omegaconf`
- `scikit-image`
- `numpy==1.22.3`
- `peft`
- `jaxtyping`
- `typeguard`
- `diso`
- `pymeshlab`

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: `external/VAST-AI-Research/TripoSG/README.md`
- Requirements: `external/VAST-AI-Research/TripoSG/requirements.txt`
- Image inference: `python -m scripts.inference_triposg ...`
- Scribble inference: `python -m scripts.inference_triposg_scribble ...`

## Fallout 4 Compatibility Notes

- TripoSG generates upstream mesh geometry (GLB); it does **not** directly produce FO4-ready NIFs.
- Always run FO4 checks in Blender before NIF export.
- Keep final export aligned with Mossy's existing FO4 constraints and NIF targets.

## Status

- Integrated as a documented, indexable local repo.
- Blender Link now includes direct TripoSG FO4 profile prepare/run actions via Mossy Link commands.
- Runtime execution depends on your local TripoSG repo + Python environment being configured.
