# Copilot Instructions for Mossy (Fallout 4 Modding Assistant)

## Project Overview
Mossy is a production-ready Electron + React + TypeScript desktop app for Fallout 4 modding, featuring real AI assistance, live tool monitoring, and asset analysis. All modules are functional—no placeholders or fake features. See [README.md](../README.md) for a full module list and architecture rationale.

## Architecture & Key Patterns
- **Electron Main Process** (`src/main/`): Handles window management, secure IPC (contextBridge), settings, and persistent storage (lowdb). Never expose secrets to the renderer.
- **Renderer** (`src/renderer/`): React UI, main app logic, and user interaction.
- **Integrations** (`src/integrations/`): System/app connectors (e.g., Blender, CK, xEdit). All require explicit user permission and input validation. See [src/integrations/README.md](../src/integrations/README.md).
- **Shared Types** (`src/shared/types.ts`): Strict TypeScript interfaces for cross-process data.
- **Asset & Modding Docs**: Root `.md` files and `resources/public/knowledge/` provide in-app knowledge base and reference.
- **Blender/CK/xEdit Monitoring**: Via Neural Link; see integration code for process detection and session awareness.

## Developer Workflows
- **Dev server**: `npm run dev` (Vite + Electron, hot reload, port 5174)
- **Build**: `npm run build` (outputs to `dist/`, `dist-electron/`)
- **Package**: `npm run package:win` (Windows NSIS installer)
- **Test**: `npm run test`, `npm run test:watch`
- **Lint/Format**: `npm run lint`, `npm run format`
- **Custom avatar**: Place PNG in `public/mossy-avatar.png` or upload in-app
- **API keys**: Set in `.env.local` (main process only; never use `VITE_*` for secrets)

## Project-Specific Conventions
- **TypeScript everywhere**; strict types in shared interfaces
- **ESLint + Prettier** enforced
- **Explicit user permission** for all system integrations (see [src/integrations/README.md](../src/integrations/README.md))
- **No fake features**: All modules must be functional; see [README.md](../README.md) for removed/placeholder modules
- **Settings & secrets**: Never expose secrets to renderer; use Electron main storage
- **Blender automation**: See [scripts/blender/README_BLENDER_ADDONS.md](../../scripts/blender/README_BLENDER_ADDONS.md) and `run_blender_ops.ps1` for headless ops

## Integration & Security
All integrations must:
- Prompt user for permission before file/app/system access
- Validate and sanitize all inputs
- Log actions for audit
- Run with least privilege
- Be opt-in/disabled by default if risky

## Key References & Examples
- [README.md](../README.md): Architecture, workflows, module list
- [src/integrations/README.md](../src/integrations/README.md): Integration security & patterns
- [src/electron/README.md](../src/electron/README.md): Electron wrapper, program detection, IPC
- [resources/public/knowledge/README.md](../resources/public/knowledge/README.md): Modding docs index
- [scripts/blender/README_BLENDER_ADDONS.md](../../scripts/blender/README_BLENDER_ADDONS.md): Blender automation

### Example Patterns
- **Integration config**: See `IntegrationConfig` in `src/integrations/example-integration.ts`
- **IPC API**: Use `window.electron.api` for renderer-main comms
- **Asset analysis**: See Auditor module for NIF/DDS/ESP checks

---

For new features, follow these conventions and reference the listed files for examples. When in doubt, prefer explicit user prompts, strict typing, and real, working functionality.
