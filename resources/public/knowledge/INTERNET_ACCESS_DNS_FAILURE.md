# Internet Access — Multi-Provider Fallback (Updated 2026-03-21)

**Status:** ✅ Multi-provider fallback implemented (see Fix #30 in CHANGES.md)

## Original Finding (2026-03-15)
DNS lookups were failing in the CI/sandbox environment for:
- `api.duckduckgo.com` — DuckDuckGo Instant Answer API
- `fallout.fandom.com` — Fallout 4 Fandom MediaWiki
- `mossy.onrender.com` — Render backend

## Fix Applied (2026-03-21)
`src/electron/main.ts` web-search handler now tries multiple providers in sequence,
falling back to the next provider when DNS/network fails:

### Wiki queries (Fallout 4 topics)
1. **fallout.wiki** — The Vault (independent Fallout wiki, primary)
2. **fallout.fandom.com** — Fallout Fandom wiki (secondary)

### General queries
1. **api.duckduckgo.com** — DuckDuckGo Instant Answer API (primary)
2. **en.wikipedia.org** — Wikipedia search + extract API (fallback)

If all providers for a query type fail, the error is logged and the response guard
in `LocalAIEngine.ts` handles the retry with a hard-override system prompt.

## Network Allowlist (for restricted environments)
If outbound HTTPS is allowlisted, ensure these domains are permitted:
- `fallout.wiki`
- `fallout.fandom.com`
- `api.duckduckgo.com`
- `en.wikipedia.org`
- `mossy.onrender.com`
