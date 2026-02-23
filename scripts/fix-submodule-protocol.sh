#!/bin/bash
# fix-submodule-protocol.sh
# Switches submodule access from SSH to HTTPS and performs a clean re-initialization.
# Use this if 'git submodule update --init --recursive' fails with SSH/permission errors.
#
# Usage: bash scripts/fix-submodule-protocol.sh

set -e

echo "==> Configuring this repository to use HTTPS instead of SSH for github.com..."
# Uses --local to limit the URL rewrite to this repository only.
git config --local url."https://github.com/".insteadOf "git@github.com:"

echo "==> Syncing submodule URLs from .gitmodules..."
git submodule sync --recursive

echo "==> Deinitializing all submodules (clean slate)..."
git submodule deinit -f .

echo "==> Initializing and updating all submodules with HTTPS..."
git submodule update --init --recursive

echo ""
echo "Done. Submodules initialized via HTTPS."
echo "Paths: external/CV-CUDA, external/DALI, external/TensorRT, external/tripo-3d-for-blender"
