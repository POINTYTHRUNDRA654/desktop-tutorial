# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.x (latest) | ✅ |
| < 5.0 | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing the repository owner directly through your GitHub account (see the profile linked to [POINTYTHRUNDRA654](https://github.com/POINTYTHRUNDRA654)), or by using [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature on this repository.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code

You should receive a response within **72 hours**. If the vulnerability is confirmed, a patch will be prioritised and a release published as soon as possible. You'll be credited in the release notes unless you prefer to remain anonymous.

## API Keys & Secrets

Mossy uses API keys (Groq, OpenAI, Deepgram, etc.) that users supply themselves via the in-app Settings UI or a local `.env.local` file. These files are **git-ignored** and are never included in the repository.

The `.env.encrypted` file, which was historically used to bundle pre-loaded keys, has been removed from version control. Users must provide their own API keys.

## Known Security Scope

The following are **not** considered vulnerabilities in scope for this project:

- Issues requiring physical access to the user's machine
- Issues in third-party Electron, Chromium, or Node.js internals that are not specific to Mossy
- Theoretical attacks with no practical exploit path on a desktop application
