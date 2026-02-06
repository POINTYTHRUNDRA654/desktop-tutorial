# Cosmos RL Integration (Mossy)

This document wires the local Cosmos RL repository into Mossy as a documented AI/ML integration. The repo lives in this workspace under:

- external/nvidia-cosmos/cosmos-rl

Mossy does not run Cosmos RL directly inside the app yet. Instead, this integration provides a stable, documented entry point and a repeatable path for local indexing and reference.

## What It Is

Cosmos RL provides reinforcement learning tooling, configurations, and examples for Cosmos workflows, including distributed training and rollout patterns.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Workflow notes: Use this doc as the authoritative pointer to the local clone.

## Recommended Workflow

1. Open Knowledge Search in Mossy.
2. Add the repo folder as a knowledge root:
   - external/nvidia-cosmos/cosmos-rl
3. Build/refresh the index.
4. Ask questions or search docs using Knowledge Search.

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: external/nvidia-cosmos/cosmos-rl/README.md
- Docs index: external/nvidia-cosmos/cosmos-rl/docs/index.rst
- Docs README: external/nvidia-cosmos/cosmos-rl/docs/README.md
- Quickstart: external/nvidia-cosmos/cosmos-rl/docs/quickstart/
- Rollout: external/nvidia-cosmos/cosmos-rl/docs/rollout/
- Parallelism: external/nvidia-cosmos/cosmos-rl/docs/parallelism/
- Quantization: external/nvidia-cosmos/cosmos-rl/docs/quantization/

## License Notes

- Code/docs: Apache 2.0 (see external/nvidia-cosmos/cosmos-rl/LICENSE)

## Status

- Integrated as a documented, indexable local repo.
- No runtime execution is wired into the UI yet.
- If you want a direct UI workflow (launch, prompts, outputs), we can add it next.
