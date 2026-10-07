"""
ChangeGate — real propose/approve/reject flow for candidate new knowledge.

Built 2026-08-22 for Screen Awareness (Phase 2 "Seeing"), whose task spec
referenced this as "the existing mechanism the self-practice pipeline
already uses" — a real research pass found neither actually existed
anywhere in the repo (grepped for ChangeGate/propose_change/self-practice/
self_practice, zero matches). This is the real first version, not a
rediscovery.

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

import os

BASE_DIR = Path(__file__).resolve().parent
# Both overridable so the packaged Brain B (brain_b_slim.exe, whose bundle is
# not a sensible place to write) can keep lessons in a real folder: main.ts
# passes MOSSY_LESSONS_DIR / MOSSY_LESSONS_PENDING_PATH when it spawns it.
# Defaults are the dev layout: brain-b/knowledge (git-tracked, ships in the
# next commit) and brain-b/data (gitignored).
PENDING_PATH = Path(os.environ.get("MOSSY_LESSONS_PENDING_PATH") or (BASE_DIR / "data" / "pending_screen_proposals.json"))
KNOWLEDGE_DIR = Path(os.environ.get("MOSSY_LESSONS_DIR") or (BASE_DIR / "knowledge"))

# One pattern file per program/topic, created on first approval. Originally
# Blender-only (Screen Awareness's first slice); generalized 2026-09-26 so
# Mossy can learn from everything she touches -- textures, meshes, plugins,
# previs, every modding tool -- not just Blender. KNOWN_PROGRAMS is the
# suggested vocabulary (keeps names consistent so lessons about the same
# thing land in the same file); any other safe slug is also accepted.
import re

KNOWN_PROGRAMS = (
    "blender", "creation-kit", "xedit", "nifskope", "textures", "materials",
    "meshes", "collision", "previs", "plugins", "papyrus", "archive2",
    "mod-organizer", "bodyslide", "outfit-studio", "gimp", "comfyui",
)

_ALIASES = {
    "ck": "creation-kit", "creationkit": "creation-kit",
    "fo4edit": "xedit", "sseedit": "xedit",
    "texture": "textures", "dds": "textures", "bgsm": "materials", "bgem": "materials",
    "mesh": "meshes", "nif": "meshes", "precombines": "previs", "precombine": "previs",
    "plugin": "plugins", "esp": "plugins", "esm": "plugins", "esl": "plugins", "plugin-scan": "plugins",
    "script": "papyrus", "scripts": "papyrus", "mo2": "mod-organizer", "ba2": "archive2",
}

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,39}$")


def normalize_program(program: str) -> str:
    slug = re.sub(r"[\s_]+", "-", str(program or "").strip().lower())
    return _ALIASES.get(slug, slug)


def _pattern_file_for(program: str) -> Path:
    slug = normalize_program(program)
    if not _SLUG_RE.match(slug):
        raise ValueError(
            f"Invalid program/topic {program!r} -- use a short name like "
            f"{', '.join(KNOWN_PROGRAMS[:6])}, ..."
        )
    return KNOWLEDGE_DIR / f"{slug.replace('-', '_')}_mistake_patterns.json"


def _new_pattern_file(program: str) -> dict:
    return {
        "_meta": {
            "description": f"Known mistakes/lessons for {program}. New entries only get added via "
                           "ChangeGate's approve() (change_gate.py) -- never edited by hand as a "
                           "shortcut around review.",
            "program": program,
            "schemaVersion": 1,
        },
        "patterns": [],
    }


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
    `program` isn't a safe program/topic slug. Any program or topic is
    accepted (see KNOWN_PROGRAMS for the suggested names); its pattern file
    is created on first approval.
    """
    program = normalize_program(program)
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
        program = normalize_program(program)
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
    if pattern_file.exists():
        data = json.loads(pattern_file.read_text(encoding="utf-8"))
    else:
        data = _new_pattern_file(normalize_program(match["program"]))
        pattern_file.parent.mkdir(parents=True, exist_ok=True)
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


# ── Approved lessons -> chat/voice answers ──────────────────────────────────
# Approved patterns used to be read only by Screen Awareness's vision pass.
# relevant_lessons() lets /enrich fold the ones that match a question into
# every chat/voice turn, so an approved lesson actually changes what Mossy
# says. Cheap keyword scoring over small local files -- no embeddings needed.

_STOPWORDS = set("""
the and for with that this from what when where which your you are was were how why can
does into have has not but all any its it's use using should would could about there their
them then than just like make made get got need needs want mod mods file files fallout
""".split())


def _words(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9_]{3,}", str(text or "").lower()) if w not in _STOPWORDS}


def _program_terms(program: str) -> set:
    terms = {program, program.replace("-", " "), program.replace("-", "")}
    terms.update(alias for alias, target in _ALIASES.items() if target == program)
    return {t for t in terms if t}


def relevant_lessons(question: str, limit: int = 6, min_score: int = 2) -> list[dict]:
    """
    Approved lessons that plausibly apply to `question`, best first. Score:
    +3 if the question names the lesson's program/topic (or an alias of it),
    +1 per meaningful word shared with the lesson text. Only lessons scoring
    at least `min_score` are returned, so an unrelated question pulls none.
    """
    q_lower = str(question or "").lower()
    q_words = _words(q_lower)
    if not q_words or not KNOWLEDGE_DIR.exists():
        return []
    scored = []
    for pattern_file in KNOWLEDGE_DIR.glob("*_mistake_patterns.json"):
        try:
            data = json.loads(pattern_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        program = normalize_program((data.get("_meta") or {}).get("program")
                                    or pattern_file.name.replace("_mistake_patterns.json", ""))
        named = any(re.search(rf"\b{re.escape(t)}\b", q_lower) for t in _program_terms(program))
        for pat in data.get("patterns", []):
            text = f"{pat.get('whatToLookFor', '')} {pat.get('correction', '')}"
            score = (3 if named else 0) + len(q_words & _words(text))
            if score >= min_score:
                scored.append((score, {"program": program, **pat}))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]


def format_lessons(lessons: list[dict]) -> str:
    if not lessons:
        return ""
    lines = [
        f"- [{l['program']}] Watch for: {l.get('whatToLookFor', '').strip()} "
        f"Correct approach: {str(l.get('correction', '')).strip()}"
        for l in lessons
    ]
    return (
        "\nLESSONS MOSSY HAS LEARNED (verified and approved in review -- when one applies, "
        "follow it over general knowledge and say so):\n" + "\n".join(lines) + "\n"
    )
