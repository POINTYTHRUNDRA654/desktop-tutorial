# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.4.x (latest) | ✅ Yes |
| < 5.4.0 | ❌ No |

Always use the [latest release](https://github.com/POINTYTHRUNDRA654/mossy-ai/releases/latest) for the most recent security fixes.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately using one of these methods:

1. **GitHub Security Advisories (preferred):**  
   Use [Security → Report a vulnerability](https://github.com/POINTYTHRUNDRA654/mossy-ai/security/advisories/new) to submit a private report. We respond within **72 hours**.

2. **GitHub profile:**  
   Contact the maintainer at [POINTYTHRUNDRA654](https://github.com/POINTYTHRUNDRA654) via GitHub's DM/contact feature.

Please include:
- A clear description of the vulnerability and its potential impact
- Steps to reproduce (OS, app version, configuration)
- Any proof-of-concept code, logs, or screenshots

---

## In-Scope Areas

- **Electron main process** — IPC injection, arbitrary file write, privilege escalation
- **Local secrets** — leakage of the local bridge tokens (Neural Bridge, Brain B) stored in `userData/settings.json`
- **Blender TCP bridge** — unauthorized command execution via the local TCP bridge (port 9999)
- **Neural Bridge token** — token bypass or brute-force
- **GGUF model import** — path traversal or command injection via the Ollama model import handler
- **Renderer XSS** — cross-site scripting reaching main process IPC channels

## Out of Scope

- Issues in third-party tools Mossy integrates with (xEdit, Blender, Ollama, MO2, etc.) — report those upstream
- Issues requiring physical access to the machine
- Theoretical attacks with no practical exploit path on a local desktop app

---

## Security Architecture

- **No API keys and no cloud services.** This edition contains no cloud AI, no accounts and no API keys. AI runs on the user's own computer (Ollama, KoboldCpp).
- **No `VITE_*` secrets.** Vite exposes `VITE_*` vars to the renderer bundle. All secret config uses main-process-only env vars.
- **IPC channels are allowlisted.** `contextBridge` exposes only named, typed wrapper functions — no raw `ipcRenderer.invoke` from renderer.
- **Neural Bridge token authentication.** The Blender TCP bridge requires a 32-character auto-generated hex token stored in `settings.json`. Empty tokens accepted for backward compatibility.
- **Input sanitization.** All paths and strings passed to exec/spawn/file write operations are validated in the main process before use.
- **No game assets shipped.** The repository contains no Bethesda-owned game data (meshes, textures, plugins). All FO4 file format knowledge is reference documentation only.

---

## API Keys & Secrets

Mossy contains no API keys and sends no conversations to any AI service. The local bridge tokens (Neural Bridge, Brain B) are generated on the user's own computer and kept in `userData/settings.json`, which is not part of the repository.

---

*Security policy effective as of April 2026.*
