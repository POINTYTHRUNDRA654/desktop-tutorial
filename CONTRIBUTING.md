# Contributing to Mossy

Thanks for your interest in contributing! Mossy is a Fallout 4 modding assistant built with Electron + React + TypeScript. Bug fixes, knowledge-base updates, UI improvements, and Blender addon work are all welcome.

---

## Branch Policy — Single-branch workflow

This repository follows a strict *single-branch* workflow: **master is the only long-lived branch**.

**Why:**
- Keeps history simple and eliminates accidental branch proliferation.
- Ensures CI/tests always run against the canonical branch.

**Policy:**
- All changes must end up on `master`.
- Do work on `master` locally, run tests, then push.
- If a non-master branch is pushed, automation will attempt to auto-merge it into `master`. If auto-merge fails a PR will be opened and labeled `needs-merge` for manual resolution.

**Local safeguard:**
1. Install the local git hook that prevents pushing non-master branches:
   ```sh
   sh scripts/setup-git-hooks.sh
   ```
2. After installation, `git push` will be blocked for non-master branches.

**Server-side enforcement:**
- A GitHub Action (`.github/workflows/auto-merge-to-master.yml`) will attempt to merge any pushed branch into `master` and delete the branch on success. Conflicted branches will generate a PR for manual resolution.

If you need an exception or a temporary branch for an experimental workflow, contact the repo owner and we will handle it centrally.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- A code editor with TypeScript support (VS Code recommended)

### Local Setup

```bash
git clone https://github.com/POINTYTHRUNDRA654/desktop-tutorial.git
cd desktop-tutorial
npm install
cp .env.example .env.local   # fill in your API keys
npm run dev
```

The dev server starts at `http://127.0.0.1:5174` with Electron hot-reload.

### API Keys

You'll need at least a **Groq API key** (free tier works) for AI features. Set it in `.env.local`:

```
GROQ_API_KEY=your_key_here
```

See `.env.example` for all available options. **Never commit `.env.local` or any file containing real API keys.**

---

## Development Commands

```bash
npm run dev          # Start dev server (Vite + Electron, hot reload)
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Vitest unit tests
npm run build        # Production build
npm run package:win  # Build Windows NSIS installer
```

---

## Code Conventions

- **TypeScript everywhere** — strict types, no `any` unless unavoidable
- **ESLint + Prettier** enforced — run `npm run format` before committing
- **No placeholder features** — every module must be functional (see `README.md`)
- **Secrets never in source** — use `.env.local` (git-ignored) or the in-app Settings UI
- **IPC wrappers live in `src/electron/preload.ts`** — not in `src/main/preload.ts`
- **Explicit user permission** required for all system integrations — see `src/integrations/README.md`

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues) with:

- Mossy version (shown in Settings)
- OS / Windows version
- Steps to reproduce, expected vs. actual behaviour
- Relevant console output (open DevTools with `Ctrl+Shift+I`)

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md) — please do not open a public issue.

---

## License

By contributing you agree that your changes will be licensed under the project's [MIT License](LICENSE).