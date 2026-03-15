# Internet Access Failure — DNS Resolution Blocked

**Date:** 2026-03-15  
**Status:** ❌ Outbound DNS failing

## Findings
- Mossy cannot reach external HTTPS hosts; DNS lookups fail.
- Reproduced with curl in the desktop environment:
  - `curl https://api.duckduckgo.com/?q=test&format=json` → `Could not resolve host: api.duckduckgo.com`
  - `curl https://fallout.fandom.com/api.php?...` → `Could not resolve host: fallout.fandom.com`
  - `curl https://mossy.onrender.com/health` → `Could not resolve host: mossy.onrender.com`
- Because DNS fails, Mossy’s live web search (`web-search` / `browse-web`) and backend calls cannot go online.

## Impact
- Automatic web search injection returns empty or errors.
- `scan_fallout4_live` cannot fetch wiki or web results.
- Backend fallback to `https://mossy.onrender.com` cannot resolve.

## Recommended Fixes
1. Restore DNS resolution for outbound HTTPS (check resolver, VPN, or firewall rules).
2. Verify the three hosts above resolve and allow HTTPS traffic.
3. If network egress is intentionally restricted, provide an allowlist for `api.duckduckgo.com`, `fallout.fandom.com`, and `mossy.onrender.com`, or point Mossy at a reachable local backend (`MOSSY_BACKEND_URL`).
