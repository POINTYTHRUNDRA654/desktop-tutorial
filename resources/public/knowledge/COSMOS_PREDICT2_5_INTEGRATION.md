# Cosmos Predict2.5 Integration (Mossy)

This document wires the local Cosmos Predict2.5 repository into Mossy as a documented AI/ML integration. The repo lives in this workspace under:

- external/nvidia-cosmos/cosmos-predict2.5

Mossy does not run Cosmos Predict2.5 directly inside the app yet. Instead, this integration provides a stable, documented entry point and a repeatable path for local indexing and reference.

## What It Is

Cosmos Predict2.5 is a world foundation model stack focused on prediction and control tasks, with tooling for inference and post-training workflows.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Workflow notes: Use this doc as the authoritative pointer to the local clone.

## Recommended Workflow

1. Open Knowledge Search in Mossy.
2. Add the repo folder as a knowledge root:
   - external/nvidia-cosmos/cosmos-predict2.5
3. Build/refresh the index.
4. Ask questions or search docs using Knowledge Search.

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: external/nvidia-cosmos/cosmos-predict2.5/README.md
- Setup guide: external/nvidia-cosmos/cosmos-predict2.5/docs/setup.md
- Inference guide: external/nvidia-cosmos/cosmos-predict2.5/docs/inference.md
- Auto multiview inference: external/nvidia-cosmos/cosmos-predict2.5/docs/inference_auto_multiview.md
- Post-training guide: external/nvidia-cosmos/cosmos-predict2.5/docs/post-training.md
- Troubleshooting: external/nvidia-cosmos/cosmos-predict2.5/docs/troubleshooting.md

## License Notes

- Code: Apache 2.0 (see external/nvidia-cosmos/cosmos-predict2.5/LICENSE)
- Models: NVIDIA Open Model License (see repo README for details)

## Status

- Integrated as a documented, indexable local repo.
- No runtime execution is wired into the UI yet.
- If you want a direct UI workflow (launch, prompts, outputs), we can add it next.
