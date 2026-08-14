# DRAFT — GitHub Security Advisory (for review before publishing)

Not yet published. Review and edit, then either paste this into GitHub's
"Security Advisories → New draft security advisory" form or ask me to do it
via `gh` once you confirm the affected-version range below.

---

## Title

Unauthenticated local HTTP server allowed arbitrary command execution and
desktop access from any web page

## Severity

**Critical.** No privileges or user interaction were required beyond having
Mossy running and visiting any web page in any browser tab. Suggested CVSS
vector for your own scoring (I'm not certifying a score, just giving you the
building blocks): local network vector, low attack complexity, no privileges
required, no user interaction, but **confidentiality/integrity/availability:
High** for command execution — this genuinely maps close to a 9.x/Critical.

## Summary

Mossy's Desktop Bridge — a local HTTP server (`BridgeServer.ts`) that the
app starts automatically on every launch to provide screen capture,
clipboard access, hardware info, file access, and Blender integration — had
**no authentication on any endpoint** and was reachable by any web page open
in any browser tab while Mossy was running, including tabs unrelated to
Mossy.

One of its endpoints, `/execute` with `type: "shell"`, ran the request body's
`script` field directly through Node's `child_process.exec()` with no
sandboxing — arbitrary OS command execution, achievable from a plain
cross-origin `fetch()` POST. Wide-open CORS (`Access-Control-Allow-Origin:
*`) did not meaningfully protect against this: CORS only controls whether a
page's JavaScript can *read* a cross-origin response, not whether the
request is sent or takes effect server-side. A background tab from any site
could fire the POST and have it execute, whether or not it could read the
result.

Beyond shell execution, the same lack of authentication exposed every other
Bridge endpoint to any web page: screen capture, clipboard read/write, file
listing, hardware info, and the relay to a locally running Blender instance
(itself independently vulnerable — see below).

## Affected component

`src/electron/BridgeServer.ts`, bound to `127.0.0.1` (not reachable from
other devices on the network, but reachable from any process/page on the
same machine — including any browser tab).

## Affected versions

Introduced in commit `75e7d610` (2026-01-15). **Every released version
containing this file through v5.6.0 is affected** — I don't have a fully
confident earliest public-release tag from git history alone; please confirm
the first shipped version number from your own release records before
publishing (my best read of the repo history puts it at or shortly after
what was tagged v4.0.0, but that tag's commit date doesn't cleanly line up
with the file's introduction date, so verify rather than trust that number).

**Fixed in:** the release following this advisory (add version number here
once tagged).

## A second, related issue: Blender add-on fail-open

The companion Blender add-on (`public/mossy_link_addon.py`, a separate local
socket server on port 9999 that Mossy's Bridge relays Python execution to)
had a fail-open authentication bug: if no token had been configured yet in
the add-on's Blender preferences — the default state for any user who
installed the add-on but hadn't completed the manual copy-paste-token step —
it accepted connections from anyone with no token at all. This is also
fixed in the same release (the add-on now always rejects when unconfigured,
never defaults to trusting the caller).

## Impact

Any web page open in a browser tab while Mossy AI was running could, without
any user interaction beyond having that tab open:
- Run arbitrary OS commands on the user's machine (`type: "shell"`)
- Capture the user's screen
- Read and write the user's clipboard
- List files on the user's filesystem
- Read hardware/system information
- If Blender was also running with the (commonly unconfigured) add-on: send
  arbitrary Python to execute inside the user's Blender session

This required no phishing beyond ordinary web browsing — any site the user
visited, or any ad/tracking script running on any site they visited, could
have attempted this while Mossy was open in the background.

We have no evidence of in-the-wild exploitation, but the bar to exploit was
low enough that we're disclosing proactively rather than assuming none
occurred.

## Fix

- Every Bridge Server endpoint now requires a locally-generated
  `X-Mossy-Token` header, compared using a timing-safe comparison
  (`crypto.timingSafeEqual`). The token is generated on first launch, stored
  in the user's own local settings file, and supplied automatically by
  Mossy's own renderer via Electron's `contextBridge` — same-origin
  isolation means other web content cannot read it.
- The `type: "shell"` handler (arbitrary `exec()`) has been **removed
  outright**, not merely gated behind auth. It was unused by Mossy's own UI.
- The Bridge Server's HTTP port is now OS-assigned at each launch instead of
  a fixed, publicly documented port (21337) — this is defense in depth, not
  a substitute for the token.
- The Blender add-on's token check now fails closed: no configured token
  means every connection is rejected, never accepted.

## Workarounds (for anyone who can't update immediately)

- Close Mossy when you're not actively using it — the exposure only exists
  while the app is running.
- Avoid browsing untrusted sites while Mossy is open, until you've updated.
- If you use the Blender add-on, set a token in its Blender preferences
  panel now, even before updating — the current (vulnerable) add-on code
  will at least start honoring it once one is set, closing that half of the
  exposure early.

## Credit

(Add attribution here if the Nexus user who raised this wants credit — ask
before publishing a name.)

## References

- Fix commits: (fill in once committed)
- `docs/ARCHITECTURE.md` — "Bridge auth: current state and intended
  direction" section, for the longer-term per-client scoped-token design
