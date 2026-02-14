#!/bin/sh
set -e
# Configure local git to use the repo's .githooks directory
git config core.hooksPath .githooks
chmod +x .githooks/pre-push
printf "Git hooks configured (core.hooksPath set to .githooks).\nRun 'git status' to verify.\n"