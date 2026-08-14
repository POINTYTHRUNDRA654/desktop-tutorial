#!/usr/bin/env bash
# Creates a DRAFT GitHub Security Advisory via the REST API (does NOT publish it —
# that's a separate step on the repo's Security tab, or a follow-up `gh api` PATCH
# once you've reviewed the draft and it has a CVE assigned if you want one).
#
# No placeholders left to fill in — the project is staying on 5.6.0 while under
# Nexus quarantine review (fixes ship as direct pushes, not version bumps), so
# both the vulnerable range and the patched version point at 5.6.0. The
# description explicitly calls out commit 7e67cb3f as the actual fix boundary
# so the advisory isn't misleading about what "5.6.0" means here.

set -euo pipefail

gh api repos/POINTYTHRUNDRA654/desktop-tutorial/security-advisories \
  --method POST \
  --input - <<'JSON'
{
  "summary": "Unauthenticated local HTTP server allowed arbitrary command execution and desktop access from any web page",
  "description": "Mossy's Desktop Bridge (`src/electron/BridgeServer.ts`) is a local HTTP server, bound to 127.0.0.1, that the app starts automatically on every launch to provide screen capture, clipboard access, hardware info, file access, and Blender integration. It had no authentication on any endpoint and was reachable by any web page open in any browser tab while Mossy was running.\n\nOne endpoint, `/execute` with `type: \"shell\"`, ran the request body's `script` field directly through Node's `child_process.exec()` with no sandboxing — arbitrary OS command execution, achievable from a plain cross-origin `fetch()` POST. Wide-open CORS (`Access-Control-Allow-Origin: *`) did not meaningfully protect against this: CORS only controls whether a page's JavaScript can *read* a cross-origin response, not whether the request is sent or takes effect server-side. A background tab from any site could fire the POST and have it execute, whether or not it could read the result.\n\nBeyond shell execution, the same lack of authentication exposed every other Bridge endpoint: screen capture, clipboard read/write, file listing, hardware info, and the relay to a locally running Blender instance.\n\nA related issue: the companion Blender add-on (`public/mossy_link_addon.py`, a separate local socket server on port 9999) had a fail-open bug — if no token had been configured yet (the default state for a fresh install before the manual copy-paste-token step), it accepted connections from anyone with no token at all.\n\n**Impact:** any web page open in a browser tab while Mossy AI was running could, without further user interaction, run arbitrary OS commands, capture the screen, read/write the clipboard, list files, read hardware info, and (if Blender was running with the commonly-unconfigured add-on) execute arbitrary Python inside the user's Blender session. No evidence of in-the-wild exploitation has been found; disclosing proactively given the low bar to attempt it.\n\n**Fix:** every Bridge Server endpoint now requires a locally-generated `X-Mossy-Token` header, compared with `crypto.timingSafeEqual`, supplied automatically by Mossy's own renderer via `contextBridge` (same-origin isolated, unreadable by other web content). The `type: \"shell\"` handler was removed outright rather than gated. The Bridge's HTTP port is now OS-assigned per launch instead of the fixed, publicly documented 21337. The Blender add-on's token check now fails closed.\n\n**A note on the version number:** this project is currently under Nexus Mods quarantine review and is deliberately staying on release 5.6.0 rather than fragmenting the review with a version bump for this fix. The fix itself shipped as commit `7e67cb3f` on 2026-08-14, pushed directly to `main` rather than as a new tagged version. \"5.6.0\" in this advisory's metadata refers to the same release both before and after that commit — if you're running any build of 5.6.0 downloaded before 2026-08-14, update to the current 5.6.0 build (or pull latest) rather than looking for a new version number.",
  "severity": "critical",
  "cwe_ids": ["CWE-306", "CWE-78"],
  "vulnerabilities": [
    {
      "package": {
        "ecosystem": "npm",
        "name": "mossy-ai"
      },
      "vulnerable_version_range": "<= 5.6.0",
      "patched_versions": "5.6.0"
    }
  ],
  "start_private_fork": false
}
JSON
