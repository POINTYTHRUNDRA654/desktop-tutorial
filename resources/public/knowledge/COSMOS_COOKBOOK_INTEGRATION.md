# Cosmos Cookbook Integration (Mossy)

This document wires the local Cosmos Cookbook repository into Mossy as a documented AI/ML integration. The repo lives in this workspace under:

- external/nvidia-cosmos/cosmos-cookbook

Mossy does not run Cosmos Cookbook directly inside the app yet. Instead, this integration provides a stable, documented entry point and a repeatable path for local indexing and reference.

## What It Is

Cosmos Cookbook is a collection of guides, recipes, and reference material for Cosmos workflows, including setup, core concepts, and practical examples.

## How Mossy Uses It

- Documentation and reference: Mossy can index the repo for local knowledge search.
- Workflow notes: Use this doc as the authoritative pointer to the local clone.

## Recommended Workflow

1. Open Knowledge Search in Mossy.
2. Add the repo folder as a knowledge root:
   - external/nvidia-cosmos/cosmos-cookbook
3. Build/refresh the index.
4. Ask questions or search docs using Knowledge Search.

## Upstream Docs (Local)

These files are available inside the repo clone:

- README: external/nvidia-cosmos/cosmos-cookbook/README.md
- Docs index: external/nvidia-cosmos/cosmos-cookbook/docs/index.md
- Docs summary: external/nvidia-cosmos/cosmos-cookbook/docs/SUMMARY.md
- Getting started: external/nvidia-cosmos/cosmos-cookbook/docs/getting_started/
- Core concepts: external/nvidia-cosmos/cosmos-cookbook/docs/core_concepts/
- Recipes: external/nvidia-cosmos/cosmos-cookbook/docs/recipes/
- FAQ: external/nvidia-cosmos/cosmos-cookbook/docs/faq.md

## License Notes

- Code/docs: Apache 2.0 (see external/nvidia-cosmos/cosmos-cookbook/LICENSE)

## Status

- Integrated as a documented, indexable local repo.
- No runtime execution is wired into the UI yet.
- If you want a direct UI workflow (launch, prompts, outputs), we can add it next.
