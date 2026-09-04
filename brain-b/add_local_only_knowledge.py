#!/usr/bin/env python3
"""
add_local_only_knowledge.py — push staged local-only knowledge into Brain B's
RUNTIME collection (never the curated/shipped one).

Why this exists: some knowledge Billy wants Mossy to know comes from paid
third-party tutorials/courses (e.g. a Gumroad tip). That's real, useful
knowledge for HIS local install, but it must never end up in the curated
ChromaDB that ships in the Nexus/GitHub release and gets redistributed to
every user — that would be redistributing someone else's paid content.

Flow: entries live in brain-b/data/local_only_knowledge_pending.json (that
whole data/ dir is gitignored — see brain-b/change_gate.py's docstring for
the same pattern). This script POSTs each one to the already-running Brain B
service's real /knowledge/add endpoint, which — per gemma_service_enhanced.py's
own docstring on that route — writes ONLY to get_runtime_collection(), the
local-only store, never the curated one. Requires gemma_service_enhanced.py
to already be running (python gemma_service_enhanced.py, default port 8766).

Usage:
    python add_local_only_knowledge.py
    python add_local_only_knowledge.py --file path/to/other_pending.json
    python add_local_only_knowledge.py --clear-after   # empties the pending file once ingested
"""
import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_PENDING = BASE_DIR / "data" / "local_only_knowledge_pending.json"
DEFAULT_URL = "http://127.0.0.1:8766/knowledge/add"


def post_entry(url: str, entry: dict) -> dict:
    payload = json.dumps({
        "title": entry["title"],
        "content": entry["content"],
        "tags": entry.get("tags", []),
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=str(DEFAULT_PENDING))
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--clear-after", action="store_true",
                     help="Empty the pending file once every entry is confirmed added.")
    args = ap.parse_args()

    pending_path = Path(args.file)
    if not pending_path.exists():
        print(f"No pending file at {pending_path} -- nothing to do.")
        return

    entries = json.loads(pending_path.read_text(encoding="utf-8"))
    if not entries:
        print("Pending file is empty -- nothing to do.")
        return

    print(f"Found {len(entries)} local-only entr{'y' if len(entries) == 1 else 'ies'} to add "
          f"to the RUNTIME (local-only) collection at {args.url} ...")

    ok = 0
    for e in entries:
        try:
            result = post_entry(args.url, e)
            print(f"  added: {e['title']!r} -> id {result.get('id')}")
            ok += 1
        except urllib.error.URLError as exc:
            print(f"  FAILED (is gemma_service_enhanced.py running?): {e['title']!r} -> {exc}")
            sys.exit(1)

    print(f"Done: {ok}/{len(entries)} added to runtime collection (local-only, not shipped).")

    if args.clear_after:
        pending_path.write_text("[]", encoding="utf-8")
        print(f"Cleared {pending_path}.")


if __name__ == "__main__":
    main()
