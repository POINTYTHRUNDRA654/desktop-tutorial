# Mossy v4.0.0 - Release Notes

Release date: 2026-01-27

## 📦 Download

**Recommended download for testers:**
- `Mossy Setup 4.0.0.exe` (Windows NSIS installer)

## ✅ What’s New in v4

### 🌍 UI Language (New)
- Language selection is available during first-run onboarding.
- Language can be changed later in **Settings → Language**.
- Supported UI languages:
  - English (`en`)
  - Español (`es`)
  - Français (`fr`)
  - Deutsch (`de`)
  - Русский (`ru`)
  - 中文（简体）(`zh-Hans`)

### 🧭 First-Run Onboarding Improvements
- First launch now guides you through:
  1. UI language selection
  2. System scan for modding tools
  3. Tool approvals / integration permissions

### 🧰 Install Wizard “Chrome” Localized
- Core Install Wizard UI text (buttons/headings/tooltips/section labels) is localized to match the selected UI language.

### 🧾 Documentation Refresh
- Updated docs to match v4 onboarding and settings paths:
  - `README.md`
  - `QUICK_START_2025.md`
  - `USER_GUIDE.md`
- In-app knowledge docs are kept in sync during build.

### 🔐 Security / Key Handling Hardening
- API keys are configured via the app’s Settings UI (recommended).
- Dev-only environment keys can be supplied via `.env.local` (main process only).
- Avoid putting secrets into `VITE_*` env vars (renderer-exposed).

### 🏷️ Branding / Packaging
- App and installer branding is standardized as **Mossy**.
- Windows installer output goes to `release/`.

## 💻 System Requirements

- Windows 10/11 (64-bit)
- Internet connection only required for optional cloud providers

## 🛠️ Installation (Windows)

1. Run `Mossy Setup 4.0.0.exe`.
2. Launch Mossy.
3. Complete onboarding (language → scan → approvals).

## 🧪 Tester Notes

When reporting issues, please include:
- What you clicked / did (step-by-step)
- Screenshot(s) if possible
- Any console/log export the app provides
- Your Windows version and whether you installed as admin

## Known Limitations (v4)

- “Request a language” link is intentionally not wired to a public URL yet (pending Nexus page).
