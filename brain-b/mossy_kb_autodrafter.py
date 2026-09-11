"""
mossy_kb_autodrafter.py -- turns a MossyDumpRecord.pas dump into DRAFT
knowledge-base entries, automatically.

This is the automation Billy asked for on 2026-09-08: "have her start using
[xEdit] and getting all the references that she can and add them to her
brain." It closes the loop that was previously all-manual (dump record in
xEdit -> read it -> hand-write a KNOWLEDGE_ENTRIES dict -> hand-write a
flowchart page) for the PERK record type, which is the shape that was
proven end-to-end with the Demolition Expert case study.

IMPORTANT -- what this does NOT do, on purpose:
  * It never writes into bootstrap_fallout4_knowledge.py's KNOWLEDGE_ENTRIES
    directly, and never touches ChromaDB. Standing rule: nothing reaches
    Mossy's shipped/curated knowledge base without a human (Billy) reading
    it first. This script's whole job stops at producing a reviewable draft.
  * It never fabricates a value. Everything in a draft is read straight out
    of the dump text; if a field can't be found, the draft says so instead
    of guessing.
  * It only understands PERK records for now (Entry Point effects, Perk
    Conditions/CTDA, NNAM rank-chaining). Extending to QUST/SCEN/other
    signatures is a natural follow-up, not attempted here.

Usage:
    python mossy_kb_autodrafter.py <path-to-MossyDumpRecord_output.txt> \\
        [--filter "Demolition Expert"] [--out-dir pending_review]

For every PERK "chain" found (a rank-0 perk plus everything it reaches via
NNAM/Next Perk), writes two files into --out-dir:
    <slug>.draft.py    -- a ready-to-eyeball KNOWLEDGE_ENTRIES-shaped dict,
                           wrapped in a big REVIEW-ME banner
    <slug>.trace.html  -- the same chain rendered via perk_flowchart.py,
                           so Billy can look at the diagram, not just prose

Nothing here is appended anywhere else. Promoting a draft into
bootstrap_fallout4_knowledge.py is a deliberate, separate, human step.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perk_flowchart import Effect, Rank, render_chain_page  # noqa: E402


# --------------------------------------------------------------------------
# Parsing MossyDumpRecord_output.txt
# --------------------------------------------------------------------------

HEADER_RE = re.compile(r'^===== (?P<edid>.+?) "(?P<full>.*?)" \[(?P<sig>\w+):(?P<formid>[0-9A-Fa-f]+)\] =====$')
LINE_RE = re.compile(r'^(?P<indent>\s*)(?P<path>.+?) = (?P<value>.*)$')
LINKS_TO_RE = re.compile(r'^(?P<value>.*?)\s+-> LINKS TO: .*$')
BRACKET_RE = re.compile(r'\[(\w+):([0-9A-Fa-f]+)\]')


@dataclass
class RawEffect:
    entry_point: str | None = None
    function: str | None = None
    param_value: str | None = None
    param_type: str | None = None
    cond_function: str | None = None
    cond_target: str | None = None
    cond_comparison: str | None = None
    cond_run_on: str | None = None


@dataclass
class RawPerk:
    editor_id: str
    form_id: str
    full_name: str
    file: str
    desc: str | None = None
    level: str | None = None
    num_ranks: str | None = None
    next_perk_editor_id: str | None = None
    next_perk_form_id: str | None = None
    effects: list[RawEffect] = field(default_factory=list)


def _strip_links_to(value: str) -> str:
    m = LINKS_TO_RE.match(value)
    return m.group("value") if m else value


def parse_dump(text: str) -> list[RawPerk]:
    """Parse every PERK record found in a MossyDumpRecord.pas output file."""
    records: list[RawPerk] = []
    current: RawPerk | None = None
    current_effect: RawEffect | None = None

    for raw_line in text.splitlines():
        header = HEADER_RE.match(raw_line)
        if header:
            if header.group("sig") != "PERK":
                current = None
                current_effect = None
                continue
            current = RawPerk(
                editor_id=header.group("edid"),
                form_id=header.group("formid"),
                full_name=header.group("full"),
                file="",
            )
            records.append(current)
            current_effect = None
            continue

        if current is None:
            continue

        m = LINE_RE.match(raw_line)
        if not m:
            continue
        path, value = m.group("path").strip(), m.group("value")

        if path == "File":
            current.file = value.strip()
            continue

        if not path.startswith("PERK \\"):
            continue

        value = _strip_links_to(value)

        if path.endswith("FULL - Name"):
            current.full_name = value
        elif path.endswith("DESC - Description"):
            current.desc = value
        elif path.endswith("DATA - Data \\ Level"):
            current.level = value
        elif path.endswith("DATA - Data \\ Num Ranks"):
            current.num_ranks = value
        elif path.endswith("NNAM - Next Perk"):
            bm = BRACKET_RE.search(value)
            current.next_perk_form_id = bm.group(2) if bm else None
            current.next_perk_editor_id = value.split(' "')[0].strip()

        elif "Effects \\ Effect \\ PRKE - Header \\ Type" in path:
            current_effect = RawEffect()
            current.effects.append(current_effect)
        elif "Effects \\ Effect \\ PRKF - End Marker" in path:
            current_effect = None
        elif current_effect is not None:
            if path.endswith("Entry Point \\ Entry Point"):
                current_effect.entry_point = value
            elif path.endswith("Entry Point \\ Function"):
                current_effect.function = value
            elif "Function Parameters \\ EPFT - Type" in path:
                current_effect.param_type = value
            elif re.search(r"EPFD - Data \\ \w+$", path):
                current_effect.param_value = value
            elif path.endswith("Conditions \\ Condition \\ CTDA - CTDA \\ Function"):
                current_effect.cond_function = value
            elif path.endswith("Conditions \\ Condition \\ CTDA - CTDA \\ Comparison Value"):
                current_effect.cond_comparison = value
            elif path.endswith("Conditions \\ Condition \\ CTDA - CTDA \\ Parameter #1"):
                if current_effect.cond_target is None:
                    current_effect.cond_target = value.split(' "')[0].strip()
            elif path.endswith("Conditions \\ Condition \\ CTDA - CTDA \\ Run On"):
                current_effect.cond_run_on = value

    return records


# --------------------------------------------------------------------------
# Turning raw perks into perk_flowchart chains
# --------------------------------------------------------------------------

def _condition_str(eff: RawEffect) -> str | None:
    if not eff.cond_function:
        return None
    target = f"({eff.cond_target})" if eff.cond_target else "()"
    cmp = eff.cond_comparison
    suffix = ""
    if cmp is not None:
        try:
            fcmp = float(cmp)
            suffix = " == false" if fcmp == 0.0 else (" == true" if fcmp == 1.0 else f" == {cmp}")
        except ValueError:
            suffix = f" == {cmp}"
    return f"{eff.cond_function}{target}{suffix}"


def raw_perk_to_rank(rp: RawPerk) -> Rank:
    effects = [
        Effect(
            entry_point=eff.entry_point or "(unknown entry point)",
            function=eff.function or "(unknown function)",
            value=eff.param_value or "(unknown value)",
            condition=_condition_str(eff),
            native=(eff.cond_function is None),
        )
        for eff in rp.effects
        if eff.entry_point or eff.function
    ]
    level = rp.level
    try:
        level_i = int(level) if level is not None else 0
    except ValueError:
        level_i = 0
    return Rank(name=rp.editor_id, form_id=rp.form_id, level=level_i, effects=effects)


def _level_of(r: RawPerk) -> float:
    try:
        return float(r.level) if r.level is not None else float("inf")
    except ValueError:
        return float("inf")


def build_chains(records: list[RawPerk]) -> list[list[RawPerk]]:
    """Group PERK records into rank chains via NNAM (Next Perk).

    Real dumps aren't always a clean DAG -- some perk chains loop the last
    rank's NNAM back to rank 1 (e.g. Demolition Expert 04 -> 01), so "start
    = nothing points to me" silently drops those chains entirely. Instead:
    group records into connected components via NNAM edges (undirected),
    then within each component start at the lowest-Level record and walk
    forward, stopping once every component member has been visited once.
    """
    by_edid = {r.editor_id: r for r in records}

    # Union-find over NNAM edges.
    parent = {r.editor_id: r.editor_id for r in records}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for r in records:
        if r.next_perk_editor_id and r.next_perk_editor_id != r.editor_id and r.next_perk_editor_id in by_edid:
            union(r.editor_id, r.next_perk_editor_id)

    components: dict[str, list[RawPerk]] = {}
    for r in records:
        components.setdefault(find(r.editor_id), []).append(r)

    chains: list[list[RawPerk]] = []
    for members in components.values():
        members_by_edid = {r.editor_id: r for r in members}
        start = min(members, key=_level_of)
        chain = [start]
        seen = {start.editor_id}
        cur = start
        while cur.next_perk_editor_id and cur.next_perk_editor_id in members_by_edid and cur.next_perk_editor_id not in seen:
            cur = members_by_edid[cur.next_perk_editor_id]
            chain.append(cur)
            seen.add(cur.editor_id)
        # Any component members not reached by walking forward (disconnected
        # sub-fragments, rare) still get surfaced rather than silently dropped.
        for r in members:
            if r.editor_id not in seen:
                chain.append(r)
                seen.add(r.editor_id)
        chains.append(chain)
    return chains


# --------------------------------------------------------------------------
# Verification -- automated sanity checks on a drafted chain, BEFORE it's
# treated as trustworthy enough to sit in the "verified" pile. This is not
# a claim that verified == flawless; it's a claim that the specific failure
# modes this parser is known to have (unresolved fields, empty chains,
# dropped records) are not present in this particular result. Anything that
# fails even one check goes to needs_attention/ instead, unchanged.
# --------------------------------------------------------------------------

def verify_chain(chain: list[RawPerk]) -> tuple[bool, list[str]]:
    """Run structural sanity checks on a drafted chain. Returns
    (passed, warnings). This checks internal consistency of what the
    parser extracted -- it does NOT re-verify against the game itself,
    so "passed" means "nothing here looks like a parser miss", not
    "guaranteed correct". A human should still skim verified/ output
    before it goes anywhere near bootstrap_fallout4_knowledge.py; this
    just sorts the obviously-broken ones out of that pile first.
    """
    warnings: list[str] = []

    if not chain:
        return False, ["empty chain"]

    seen_form_ids = set()
    for r in chain:
        if r.form_id in seen_form_ids:
            warnings.append(f"duplicate FormID {r.form_id} within chain")
        seen_form_ids.add(r.form_id)

        if not r.effects:
            warnings.append(f"{r.editor_id}: no Effects found at all -- likely script-only, VMAD-only, or a parser miss")
            continue

        for eff in r.effects:
            if eff.entry_point is None and eff.function is None:
                warnings.append(f"{r.editor_id}: an Effect block had neither Entry Point nor Function -- probably not an Entry Point effect type this parser understands")
                continue
            if eff.entry_point is None:
                warnings.append(f"{r.editor_id}: Effect has a Function ({eff.function}) but no Entry Point name")
            if eff.function is None:
                warnings.append(f"{r.editor_id}: Effect has an Entry Point ({eff.entry_point}) but no Function")
            if eff.param_value is None:
                warnings.append(f"{r.editor_id}: Effect '{eff.entry_point}' has no resolved value (EPFD)")
            if eff.cond_function is not None and eff.cond_comparison is None:
                warnings.append(f"{r.editor_id}: condition '{eff.cond_function}' has no Comparison Value -- condition phrasing may be wrong")

    # Chain-order sanity: levels should be non-decreasing along the chain
    # we walked (rank 1 -> rank N). A level that goes backwards means
    # build_chains() may have ordered this chain wrong.
    levels = [_level_of(r) for r in chain]
    if levels != sorted(levels):
        warnings.append(f"chain levels are not in ascending order: {[r.level for r in chain]} -- chain ordering may be wrong")

    return (len(warnings) == 0), warnings


# --------------------------------------------------------------------------
# Drafting the KB entry text (deterministic, template-based -- no guessing)
# --------------------------------------------------------------------------

def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def draft_kb_entry(chain: list[RawPerk], dump_path: str) -> dict:
    subject = chain[0].full_name
    slug = _slug(subject)
    lines = []
    lines.append(
        f"Verified by dumping the live PERK records in xEdit (auto-drafted, not guessed): "
        f"{subject} is {len(chain)} separate PERK record(s) "
        + ("chained via NNAM (Next Perk) -- " if len(chain) > 1 else "-- ")
        + ", ".join(f'{r.editor_id} [PERK:{r.form_id}] (Level {r.level or "?"})' for r in chain)
        + "."
    )
    for r in chain:
        if not r.effects:
            lines.append(f"{r.editor_id} has no Entry Point effects in the dump (likely script-only or data-only -- verify before relying on this).")
            continue
        for eff in r.effects:
            rank = raw_perk_to_rank(r)
            e = next((x for x in rank.effects if x.entry_point == eff.entry_point and x.function == eff.function), None)
            if e is None:
                continue
            cond_note = "with ZERO Perk Conditions attached -- unconditional native engine behavior" if e.native else f"gated by Perk Condition {e.condition}"
            lines.append(f"{r.editor_id}: Entry Point '{e.entry_point}', Function '{e.function}', value {e.value}, {cond_note}.")
    lines.append(
        "AUTO-DRAFTED -- needs a human read before this ships: verify the plain-English condition "
        "phrasing above against the raw dump (comparison-value 0/1 was assumed to mean false/true), "
        "and confirm no VMAD/Papyrus script also exists on these records (this parser only reads PRKE/DATA/EPFT/EPFD, "
        "not VMAD)."
    )
    content = " ".join(lines)

    tags = ["perk", "entry-point", "auto-drafted", "xedit"] + [_slug(r.editor_id) for r in chain]

    return {
        "id": f"perk-auto-{slug}",
        "title": f"Case Study (DRAFT): {subject}",
        "content": content,
        "category": "papyrus",
        "tags": tags,
        "_source_dump": dump_path,
        "_needs_review": True,
    }


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("dump_path", help="Path to a MossyDumpRecord_output.txt file")
    ap.add_argument("--filter", default=None, help="Only draft chains whose subject name contains this text")
    ap.add_argument("--out-dir", default="pending_review", help="Directory to write draft .py + .html files into")
    args = ap.parse_args()

    text = open(args.dump_path, encoding="utf-8", errors="replace").read()
    records = parse_dump(text)
    chains = build_chains(records)
    if args.filter:
        chains = [c for c in chains if args.filter.lower() in c[0].full_name.lower()]

    os.makedirs(args.out_dir, exist_ok=True)
    verified_dir = os.path.join(args.out_dir, "verified")
    attention_dir = os.path.join(args.out_dir, "needs_attention")
    os.makedirs(verified_dir, exist_ok=True)
    os.makedirs(attention_dir, exist_ok=True)

    written = []
    n_verified = 0
    n_flagged = 0
    for chain in chains:
        passed, warnings = verify_chain(chain)
        target_dir = verified_dir if passed else attention_dir
        entry = draft_kb_entry(chain, args.dump_path)
        entry["_verified"] = passed
        entry["_warnings"] = warnings
        slug = _slug(chain[0].full_name)
        if passed:
            n_verified += 1
        else:
            n_flagged += 1

        draft_py_path = os.path.join(target_dir, f"{slug}.draft.py")
        with open(draft_py_path, "w", encoding="utf-8") as f:
            status_banner = (
                "# VERIFIED -- passed all automated structural checks (see mossy_kb_autodrafter.verify_chain).\n"
                "# This means no unresolved fields, no dropped/duplicate records, no ordering problems --\n"
                "# NOT a guarantee of correctness. Still read it before it goes anywhere near the live KB.\n"
                if passed
                else "# NEEDS ATTENTION -- failed one or more automated checks. See _warnings below.\n"
                "# Do not promote this without reading it and understanding why it was flagged.\n"
            )
            f.write(
                status_banner
                + "# Read this, fix anything wrong, then hand-copy the dict below into\n"
                "# bootstrap_fallout4_knowledge.py's KNOWLEDGE_ENTRIES and re-run that script.\n"
                f"# Source dump: {entry['_source_dump']}\n\n"
                f"KB_DRAFT = {entry!r}\n"
            )

        ranks = [raw_perk_to_rank(r) for r in chain]
        hot_index = None
        for i, r in enumerate(chain):
            if any(not e.native for e in ranks[i].effects for e in [e]) or any(e.native for e in ranks[i].effects):
                pass
        html = render_chain_page(
            title=f"{chain[0].full_name} -- Auto Trace (DRAFT)",
            subject=chain[0].full_name,
            source_file=chain[0].file or "Fallout4.esm",
            tool="MossyDumpRecord.pas + mossy_kb_autodrafter.py (auto-drafted)",
            chain=ranks,
            verdict_title="AUTO-DRAFTED -- NEEDS HUMAN REVIEW",
            verdict_body=[
                "This trace was built automatically from a raw xEdit dump. Every value is real, "
                "read straight from the record -- nothing here is invented.",
                "It has not been read by a human yet. Check the condition phrasing, and confirm "
                "no VMAD/Papyrus script also exists on these records before treating this as verified.",
            ],
            dump_path=entry["_source_dump"],
        )
        html_path = os.path.join(target_dir, f"{slug}.trace.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)

        written.append((entry["id"], draft_py_path, html_path, passed))

    print(f"Parsed {len(records)} PERK record(s) into {len(chains)} chain(s).")
    print(f"  {n_verified} passed automated verification -> {verified_dir}")
    print(f"  {n_flagged} need attention -> {attention_dir}")
    if not written:
        print("No chains matched. Nothing written.")


if __name__ == "__main__":
    main()
