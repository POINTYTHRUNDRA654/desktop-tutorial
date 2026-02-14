Contributing — Single-branch policy

This repository follows a strict *single-branch* workflow: **master is the only branch**.

Why
- Keeps history simple and eliminates accidental branch proliferation.
- Ensures CI/tests always run against the canonical branch.

Policy (what this means for contributors)
- All changes must end up on `master`.
- Do work on `master` locally, run tests, then push.
- If a non-master branch is pushed, automation will attempt to auto-merge it into `master`. If auto-merge fails a PR will be opened and labeled `needs-merge` for manual resolution.

Local safeguard
1. Install the local git hook that prevents pushing non-master branches:
   sh scripts/setup-git-hooks.sh
2. After installation, `git push` will be blocked for non-master branches.

Server-side enforcement
- A GitHub Action (`.github/workflows/auto-merge-to-master.yml`) will attempt to merge any pushed branch into `master` and delete the branch on success. Conflicted branches will generate a PR for manual resolution.

If you need an exception or a temporary branch for an experimental workflow, contact the repo owner and we will handle it centrally.