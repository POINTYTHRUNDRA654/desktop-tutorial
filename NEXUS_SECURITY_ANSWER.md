# Mossy AI — Security & Privacy Q&A (for Nexus mod page)

*Written in response to a detailed security audit from a Nexus user.*

**Correction (2026-08-14):** an earlier version of this document, covering v5.4.62+, stated that the Bridge Server validated the `Origin` header and had removed wildcard CORS. **Those statements were inaccurate** — the shipped code at that time still had `Access-Control-Allow-Origin: '*'` and no Origin check anywhere, on every version through the one this correction accompanies. Combined with zero authentication on any Bridge Server endpoint, this meant any webpage open in any browser tab while Mossy was running could reach the Bridge — including, until this release, an unused-by-Mossy's-own-UI-but-still-live `/execute` handler that ran arbitrary OS shell commands via Node's `exec()`. This section now describes what is actually true as of this release, not what an earlier draft assumed had already shipped. See the GitHub Security Advisory for this repository for the full writeup and affected version range.

---

## 1. What local server endpoints are exposed while the app is running?

Mossy runs **two local servers** while the app is open:

**Port 8787 — Python backend**
Hosts the AI chat and (optional) cloud Whisper transcription routes. This port is bound to `0.0.0.0` (all interfaces) because the Electron renderer needs to reach it. It is only active when the backend process is running. Routes require a valid internal bearer token (`MOSSY_BACKEND_TOKEN`) for all AI calls.

**Port 21337 — Bridge Server ("Desktop Bridge")**
Provides hardware telemetry, file listing, and Blender add-on communication. Bound strictly to `127.0.0.1` (localhost only) — unreachable from any other device on your network. **As of this release, every request must carry a valid internal authentication token** (a random value generated locally on first launch, stored in your own settings file, and attached automatically by Mossy's own renderer — you never see or manage it directly). The token is what actually gates access — the port stays fixed so the Blender add-on can keep reaching it at a known address.

Both ports are only open while the Mossy app is running. They close when you exit the app.

---

## 2. Can any endpoint execute shell commands, and what actually protects against browser/localhost abuse?

**No endpoint executes arbitrary shell commands.** A `/execute?type=shell` handler that could run any shell command existed in the code — unused by Mossy's own UI, but still live and reachable by anyone who knew the wire format — until this release, when it was removed outright rather than gated. The only endpoint that shells out to anything (`/install_package`, for `pip install`) takes a specific package name, sanitizes it, and does not accept an arbitrary command string.

The `/execute` endpoint's remaining paths only forward Python scripts to the Blender add-on socket (port 9999), for a user-initiated "run this in Blender" action in the chat UI.

**What actually protects against browser/localhost abuse:**
- **A required, per-launch authentication token** (`X-Mossy-Token` header), compared using a timing-safe comparison, on every single Bridge Server request with no exceptions and no fallback-open state. This is the real protection — see the note below on why CORS restrictions alone would not have been sufficient even if implemented.

**Why this wasn't "just fix CORS"**: CORS headers only govern whether a webpage's own JavaScript is allowed to *read* a cross-origin response — they do not prevent the request from being sent, or from taking effect on the server. A same-origin-restricted CORS policy does not stop a malicious page from POSTing to a local server and having that POST's server-side action occur; it only stops the page's script from seeing what came back. An unauthenticated endpoint is exploitable regardless of CORS configuration. The token is what closes this, not CORS.

In plain English: a malicious website cannot make Mossy's Bridge Server do anything without knowing a secret that only Mossy's own renderer holds.

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

> **Privacy & Security:** Mossy AI runs its speech recognition (Whisper) locally on your PC — your voice never leaves your computer. The only data sent to the internet is the text of your chat messages, which go to the AI provider via a secure relay. No API keys required — the developer covers AI costs, Mossy is free. The local Bridge Server requires a per-launch authentication token on every request — a website cannot make it do anything without that token, which only Mossy's own interface holds. First-launch downloads (PyTorch + Whisper, ~350 MB total) are announced up-front before any download starts and are stored in your AppData folder. **A prior version of this document overstated protections that hadn't actually shipped yet — see the correction note at the top and the linked Security Advisory for the honest history.**
