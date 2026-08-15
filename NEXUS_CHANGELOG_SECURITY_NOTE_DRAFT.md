# DRAFT — Nexus changelog note (for review before posting)

Suggested placement: top of the changelog section for this release, above
the feature bullets, so it's the first thing anyone reading the update sees.

---

### ⚠️ Security fix — please update

This release fixes a security issue in the Desktop Bridge (the background
service that gives Mossy screen capture, clipboard, file, and Blender
integration). In prior versions, any web page open in your browser while
Mossy was running could talk to that service without any authentication —
including, in the worst case, running commands on your PC. This didn't
require you to do anything wrong; just having Mossy open while browsing was
enough for a malicious page to attempt it.

**We have no evidence this was ever exploited**, but the bar to attempt it
was low enough that we're telling you plainly rather than fixing it quietly.

**What to do:** update to this version. Every request to the Desktop Bridge
now requires a private key generated on your own machine that no web page
can access. If you can't update right away, close Mossy when you're not
using it and avoid browsing while it's open in the background.

Full technical writeup: <https://github.com/POINTYTHRUNDRA654/desktop-tutorial/security/advisories/GHSA-j6pr-83hv-46q5>

If you use the Blender add-on: this release also fixes a separate bug where
the add-on would accept connections with no password if you hadn't yet set
one in its Blender preferences (the default state for a fresh install). Set
a token now if you haven't, and update when you can.

---

Then your existing 5.6.x (or whatever this version becomes) feature bullets
follow below as normal.
