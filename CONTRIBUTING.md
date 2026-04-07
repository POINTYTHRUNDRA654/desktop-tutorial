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

## Contributing Knowledge Base Content

The `resources/public/knowledge/` folder contains 300+ `.md` reference files bundled into the app and used by Mossy's AI to answer modding questions.

### Adding a knowledge file

1. Create `resources/public/knowledge/YOUR_TOPIC_GUIDE.md` using clear headings, code blocks, and tables
2. Add it to the index in `resources/public/knowledge/README.md`
3. Optionally add a bullet-point summary to the relevant section in `src/renderer/src/MossyBrain.ts` → `getFullSystemInstruction()` if it covers a topic Mossy answers frequently

### Expanding MossyBrain AI knowledge

`MossyBrain.ts` contains the system prompt that shapes Mossy's answers. To add knowledge:

1. Find the relevant `- **TOPIC:**` section in `getFullSystemInstruction()`, or add a new one before the `MASTER_TECHNICAL_GUIDE` injection
2. Keep entries concise — the system prompt is token-limited (~128K context)
3. Prefer specific technical facts (exact record types, file paths, flags, error messages) over prose

---

## Contributing Training Data

Mossy has a built-in fine-tuning pipeline. Every chat response now has 👍/👎 rating buttons. Ratings are saved to `userData/training-dataset.jsonl` in Unsloth-compatible ShareGPT format.

### How to contribute

1. Use Mossy for real FO4 modding questions
2. Rate responses — 👍 for correct answers, 👎 to flag bad ones (optionally edit the correct answer)
3. Export your curated pairs: open Mossy chat and say *"export my training data"* or use Settings → Local Capabilities → Export JSONL
4. Share the `.jsonl` file with the maintainer or open a PR adding it to a `training-data/` folder

### Format

Each line is a valid JSON object (ShareGPT format, directly compatible with Unsloth):

```json
{"conversations": [{"from": "human", "value": "How do I fix a broken precombine in xEdit?"}, {"from": "gpt", "value": "Open the cell record in xEdit..."}]}
```

High-value topics: xEdit records, Papyrus scripting, CK workflows, NIF structure, FOMOD XML, load order, BA2 packaging, HKX animation.

---

## License

By contributing you agree that your changes will be licensed under the project's [MIT License](LICENSE).