# Cosmos Dependencies Integration (Mossy)

This document wires the local Cosmos Dependencies repository into Mossy as a documented AI/ML integration. The repo lives in this workspace under:

- external/nvidia-cosmos/cosmos-dependencies

Mossy does not run Cosmos Dependencies directly inside the app yet. Instead, this integration provides a stable, documented entry point and a repeatable path for local indexing and reference.

## What It Is

Cosmos Dependencies provides versioned dependency manifests and tooling for Cosmos environments, including CUDA and PyTorch combinations.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Workflow notes: Use this doc as the authoritative pointer to the local clone.

## Recommended Workflow

1. Open Knowledge Search in Mossy.
2. Add the repo folder as a knowledge root:
   - external/nvidia-cosmos/cosmos-dependencies
3. Build/refresh the index.
4. Ask questions or search docs using Knowledge Search.

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: external/nvidia-cosmos/cosmos-dependencies/README.md
- Docs root: external/nvidia-cosmos/cosmos-dependencies/docs/
- Versioned manifests: external/nvidia-cosmos/cosmos-dependencies/docs/v1.4.0/
- Simple manifests: external/nvidia-cosmos/cosmos-dependencies/docs/simple/
- Latest manifests: external/nvidia-cosmos/cosmos-dependencies/docs/latest/

## License Notes

- Code/docs: Apache 2.0 (see external/nvidia-cosmos/cosmos-dependencies/LICENSE)

## Status

- Integrated as a documented, indexable local repo.
- No runtime execution is wired into the UI yet.
- If you want a direct UI workflow (launch, prompts, outputs), we can add it next.
