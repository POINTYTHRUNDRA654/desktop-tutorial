# Licensing

This repository contains two separately-licensed things. They are not the
same license, and one cannot be relicensed as the other.

## Code — MIT

Everything in this repository except the knowledge pack described below
(the Electron/React/TypeScript application, the Python Brain B service, all
scripts and tooling) is licensed under the MIT License — see [LICENSE](LICENSE).

## Knowledge pack content — CC BY-SA 2.5

Content under `brain-b/knowledge/` (and anything built from it, including
the curated ChromaDB collection Brain B ships/downloads) is sourced from the
[Fallout 4 Creation Kit Wiki](https://falloutck.uesp.net/) (maintained by
UESP), which is licensed under **Creative Commons Attribution-ShareAlike 2.5**
— confirmed directly via the wiki's own MediaWiki `rightsinfo` declaration,
not just page text.

BY-SA is copyleft: reuse requires attributing the source article and
providing access to it and its edit history (both satisfied per-page in
`brain-b/knowledge/ck_wiki/*.jsonl` and summarized in
[brain-b/knowledge/ATTRIBUTION_CK_WIKI.md](brain-b/knowledge/ATTRIBUTION_CK_WIKI.md)),
**and requires that any derivative work be distributed under the same BY-SA
terms.** This repo's MIT license does NOT extend to this content — it can't,
since MIT is permissive and BY-SA's ShareAlike clause is not waivable by
being generous elsewhere in the project. Being free/open-source doesn't
satisfy the obligation either; it applies regardless of whether money
changes hands.

**Practically:**
- Don't strip attribution/license metadata from `brain-b/knowledge/**/*.jsonl`
  entries when editing or adding to them.
- A built curated ChromaDB package distributed anywhere (Nexus, a GitHub
  Release, etc.) must carry a CC BY-SA 2.5 notice and a pointer back to
  `ATTRIBUTION_CK_WIKI.md`, separate from and in addition to this repo's MIT
  notice for the code.
- New knowledge sources ingested by future scripts must have their own
  license checked and recorded the same way before being added here — don't
  assume BY-SA applies to a different source without verifying it directly
  (see how `ingest_ck_wiki.py` verified this one, via the wiki's own
  `rightsinfo` API rather than trusting a page's footer text).
