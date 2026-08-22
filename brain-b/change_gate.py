"""
ChangeGate — real propose/approve/reject flow for candidate new knowledge.

Built 2026-08-22 for Screen Awareness (Phase 2 "Seeing"), whose task spec
referenced this as "the existing mechanism the self-practice pipeline
already uses" — a real research pass found neither actually existed
anywhere in the repo (grepped for ChangeGate/propose_change/self-practice/
self_practice, zero matches). This is the real first version, not a
rediscovery. See groq_native_tool_calling_migration memory for how the same
kind of fabricated-premise check played out earlier the same session.

Design: proposals are LOCAL-ONLY (PENDING_PATH lives under brain-b/data/,
which .gitignore already excludes wholesale — see the "Brain B local build
outputs" block) until a human calls approve(). approve() promotes a
proposal into its program's real, git-tracked pattern file under
brain-b/knowledge/ (e.g. blender_mistake_patterns.json) — the exact file
the recognition pass reads as "what Mossy already knows to check for" for
that program. approve() only writes that local file; it deliberately does
NOT commit or push git on the caller's behalf. Shipping the change to every
user is a separate, visible, human git action (review the diff, commit,
push) — never something this module does silently. That's the whole reason
this module exists: a garbled or wrong vision-model observation must not
silently become permanent, shipped knowledge.
"""
import json
import time
import uuid
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
PENDING_PATH = BASE_DIR / "data" / "pending_screen_proposals.json"
KNOWLEDGE_DIR = BASE_DIR / "knowledge"

# Real, narrow, explicit mapping -- one pattern file per program. Matches
# Screen Awareness's own first-slice scope (Blender only). Extend this dict
# when Creation Kit / xEdit patterns get added later; don't invent a second
# path convention elsewhere.
_PATTERN_FILES = {
    "blender": KNOWLEDGE_DIR / "blender_mistake_patterns.json",
}


def _pattern_file_for(program: str) -> Path:
    if program not in _PATTERN_FILES:
        raise ValueError(
            f"No known pattern file for program {program!r} -- add one to "
            f"change_gate._PATTERN_FILES before proposing changes for it."
        )
    return _PATTERN_FILES[program]


def _load_pending() -> list[dict]:
    if not PENDING_PATH.exists():
        return []
    try:
        return json.loads(PENDING_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_pending(items: list[dict]) -> None:
    PENDING_PATH.parent.mkdir(parents=True, exist_ok=True)
    PENDING_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")


def propose_change(program: str, observation: str, suggested_correction: Optional[str],
                    source_context: dict) -> str:
    """
    Persists a real candidate pattern -- something the recognition pass saw
    that didn't match anything in the program's known-pattern file.
    Real validation: raises immediately (before writing anything) if
    `program` isn't a program Screen Awareness actually has a pattern file
    for, rather than silently accepting a proposal that could never be
    approved later.
    """
    _pattern_file_for(program)
    proposal_id = f"proposal-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    items = _load_pending()
    items.append({
        "id": proposal_id,
        "program": program,
        "observation": observation,
        "suggestedCorrection": suggested_correction,
        "sourceContext": source_context,
        "status": "pending",
        "proposedAt": time.time(),
    })
    _save_pending(items)
    return proposal_id


def list_pending(program: Optional[str] = None) -> list[dict]:
    items = [p for p in _load_pending() if p.get("status") == "pending"]
    if program:
        items = [p for p in items if p.get("program") == program]
    return items


def approve(proposal_id: str, reviewer_note: Optional[str] = None) -> dict:
    """
    Real promotion into the program's real, git-tracked pattern file.
    `severity: "unreviewed"` on the promoted entry is deliberate -- marks it
    as having come through the screen-awareness auto-proposal path rather
    than a hand-authored pattern, so a later human read of the pattern file
    can tell the difference (matches this codebase's own "auto vs curated"
    distinction already established for get_runtime_collection() vs
    get_curated_collection()).
    """
    items = _load_pending()
    match = next((p for p in items if p["id"] == proposal_id), None)
    if match is None:
        raise ValueError(f"No pending proposal with id {proposal_id!r}")
    if match["status"] != "pending":
        raise ValueError(f"Proposal {proposal_id!r} is already {match['status']!r}, not pending")

    pattern_file = _pattern_file_for(match["program"])
    data = json.loads(pattern_file.read_text(encoding="utf-8"))
    new_id = f"{match['program']}-mistake-{uuid.uuid4().hex[:8]}"
    data["patterns"].append({
        "id": new_id,
        "whatToLookFor": match["observation"],
        "correction": match.get("suggestedCorrection")
            or "(no correction text proposed -- needs a human pass before this is useful to speak aloud)",
        "severity": "unreviewed",
        "approvedFrom": proposal_id,
        "reviewerNote": reviewer_note,
    })
    pattern_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    match["status"] = "approved"
    match["approvedAt"] = time.time()
    match["promotedPatternId"] = new_id
    _save_pending(items)
    return {"proposalId": proposal_id, "patternId": new_id, "patternFile": str(pattern_file)}


def get_known_patterns(program: str) -> list[dict]:
    """
    Real, current contents of the program's pattern file -- what the
    recognition pass sends as "what Mossy already knows to check for."
    Always reads fresh from disk (not cached) since approve() can change
    this file at any time and a stale in-memory copy would mean a freshly-
    approved pattern doesn't get checked against until a process restart.
    """
    pattern_file = _pattern_file_for(program)
    if not pattern_file.exists():
        return []
    data = json.loads(pattern_file.read_text(encoding="utf-8"))
    return data.get("patterns", [])


def reject(proposal_id: str, reviewer_note: Optional[str] = None) -> None:
    items = _load_pending()
    match = next((p for p in items if p["id"] == proposal_id), None)
    if match is None:
        raise ValueError(f"No pending proposal with id {proposal_id!r}")
    if match["status"] != "pending":
        raise ValueError(f"Proposal {proposal_id!r} is already {match['status']!r}, not pending")
    match["status"] = "rejected"
    match["rejectedAt"] = time.time()
    match["reviewerNote"] = reviewer_note
    _save_pending(items)
