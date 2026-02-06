# Cosmos Xenna Integration (Mossy)

This document wires the local Cosmos Xenna repository into Mossy as a documented AI/ML integration. The repo lives in this workspace under:

- external/nvidia-cosmos/cosmos-xenna

Mossy does not run Cosmos Xenna directly inside the app yet. Instead, this integration provides a stable, documented entry point and a repeatable path for local indexing and reference.

## What It Is

Cosmos Xenna provides tooling and libraries (including Rust and Python components) for Cosmos workflows, with examples and CLI utilities.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Workflow notes: Use this doc as the authoritative pointer to the local clone.

## Recommended Workflow

1. Open Knowledge Search in Mossy.
2. Add the repo folder as a knowledge root:
   - external/nvidia-cosmos/cosmos-xenna
3. Build/refresh the index.
4. Ask questions or search docs using Knowledge Search.

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: external/nvidia-cosmos/cosmos-xenna/README.md
- Changelog: external/nvidia-cosmos/cosmos-xenna/CHANGELOG.md
- Examples: external/nvidia-cosmos/cosmos-xenna/examples/
- Source: external/nvidia-cosmos/cosmos-xenna/src/

## License Notes

- Code/docs: Apache 2.0 (see external/nvidia-cosmos/cosmos-xenna/LICENSE)

## Status

- Integrated as a documented, indexable local repo.
- No runtime execution is wired into the UI yet.
- If you want a direct UI workflow (launch, prompts, outputs), we can add it next.
