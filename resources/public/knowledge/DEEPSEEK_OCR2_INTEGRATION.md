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
- No runtime execution is wired into the UI yet.
- If you want a direct Mossy/Blender OCR workflow, we can add that next.
