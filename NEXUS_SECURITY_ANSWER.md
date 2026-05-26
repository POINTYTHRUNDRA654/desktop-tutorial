# Mossy AI — Security & Privacy Q&A (for Nexus mod page)

*Written in response to a detailed security audit from a Nexus user. Every answer below reflects the actual code in v5.4.62+.*

---

## 1. What local server endpoints are exposed while the app is running?

Mossy runs **two local servers** while the app is open:

**Port 8787 — Python backend**
Hosts the AI chat and (optional) cloud Whisper transcription routes. This port is bound to `0.0.0.0` (all interfaces) because the Electron renderer needs to reach it. It is only active when the backend process is running. Routes require a valid internal bearer token (`MOSSY_BACKEND_TOKEN`) for all AI calls.

**Port 21337 — Bridge Server ("Neural Link")**
Provides hardware telemetry, file listing, and Blender addon communication. This port is bound strictly to `127.0.0.1` (localhost only) — it is unreachable from any other device on your network.

Both ports are only open while the Mossy app is running. They close when you exit the app.

---

## 2. Can any endpoint execute shell commands, and what protects against browser/localhost abuse?

**No endpoint executes arbitrary shell commands.** A previous version of the Bridge Server contained a `/execute?type=shell` handler that could run any shell command — this was removed in v5.4.62.

The remaining `/execute` endpoint only forwards Python scripts to the Blender addon socket (port 9999). It does not touch your shell.

**Protection against browser/localhost abuse (DNS rebinding):**
- The Bridge Server validates the `Origin` header on every request. Only the Electron renderer (`null` origin, i.e. `file://`) and the local Vite dev server are allowed. Any other origin receives a `403 Forbidden` response immediately.
- CORS headers reflect the validated origin only — wildcard `*` was removed.
- `Access-Control-Allow-Private-Network: true` was removed. This header was the attack vector for DNS rebinding; without it, browsers block cross-origin requests to localhost from web pages.

In plain English: a malicious website cannot send requests to Mossy's local ports, even if you have the app open.

---

## 3. What gets downloaded or installed automatically on first launch?

Mossy installs two things automatically on first launch, and shows you a status notification before any download begins:

**PyTorch (~200 MB CPU build, or ~3 GB for the NVIDIA edition)**
Used by AI features (fine-tuning, local model inference). Installed via `pip` to `%APPDATA%\Mossy AI\pytorch-packages\`. You are shown a clear message before the download starts explaining what is downloading, where it goes, and that it only happens once. If PyTorch is already installed system-wide, Mossy detects and uses it instead — nothing is downloaded.

**faster-whisper + Whisper base model (~75 MB library + 74 MB model)**
Used for local, on-device speech recognition. Installed via `pip` system-wide; the model is stored in `%APPDATA%\Mossy AI\whisper-models\`. Again, a notification appears before the download, explaining what it is and where it goes. If faster-whisper is already installed, the download is skipped.

**Nothing else is downloaded without your interaction.** Python itself must already be installed on your system — Mossy does not install Python silently (it will prompt you with a link to python.org if Python is not found).

---

## 4. Are Windows Defender exclusions opt-in only?

**Yes — Mossy never adds Defender exclusions automatically.**

Mossy does not call `Add-MpPreference` or any similar command. No exclusions are added to Windows Defender, Windows Firewall, or any other security tool without the user explicitly choosing to do so. If you have seen a Defender prompt, it is Windows itself flagging a newly downloaded `.exe` (common for any Electron app) — Mossy did not trigger it.

---

## 5. What data is sent to the backend or third-party AI services?

**What stays on your PC:**
- Voice transcription (speech-to-text) — processed locally by faster-whisper. Your audio is converted to text on your machine and never sent to any server.
- Hardware telemetry (CPU, RAM, OS info) — collected for display in the UI, never transmitted.
- File listings when using file browser features — never sent off-device.

**What goes to the cloud (only when you use AI chat features):**
- The text of your chat messages is sent to the Mossy backend (`mossy.onrender.com`), which forwards them to the AI provider (Groq) and returns the response. The API keys are the developer's — users do not need to supply or pay for any API key. Mossy is free to use.
- The backend does not store your messages. It receives a request, forwards it to the AI provider, and returns the reply. That's it.

**No usage analytics, crash reports, or telemetry are collected by Mossy.** The app has no analytics SDK, no tracking pixels, and no "phone home" behavior. A voluntary donation page exists for users who want to support development, but it is never prompted automatically and is entirely optional.

---

## Short summary for the mod page description

> **Privacy & Security:** Mossy AI runs its speech recognition (Whisper) locally on your PC — your voice never leaves your computer. The only data sent to the internet is the text of your chat messages, which go to the AI provider via a secure relay. No API keys required — the developer covers AI costs, Mossy is free. No shell command execution endpoints exist. The local Bridge Server only accepts connections from the app itself (origin-locked, localhost-only). First-launch downloads (PyTorch + Whisper, ~350 MB total) are announced up-front before any download starts and are stored in your AppData folder.
