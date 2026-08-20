#!/usr/bin/env python3
"""
CANONICAL SOURCE — vendored as-is into d:\\Projects\\blender-addon-repo\\
papyrus_lint.py so papyrus_helpers.py's export() can self-check generated
output with no extra runtime dependency (stdlib only, works inside
Blender's own Python). If you change this file, copy it over there too —
same "known, accepted limitation, not a silent gap" treatment as
check_parity.py's ARTIFACT_PAIRS: documented here so it doesn't drift
unnoticed the way brain-b's forked files did before that check existed.

papyrus_lint.py — mechanical scan for known Papyrus anti-patterns. No LLM
call, no model to fool with confident-sounding generation: regex/state-
machine text scanning only, deterministic, can't hallucinate a false pass.

Why this exists: src/shared/FO4KnowledgeBase.ts's papyrusThreadingGotchas
section documents three real anti-patterns found during a real trap-script
review (2026-08-19, MossySporeTrap.psc) — but having the knowledge sitting
in a retrieval corpus doesn't make anything check for it automatically.
Retrieval answers questions; it doesn't audit code someone hands you unless
something tells it to. This is that something, for the one piece of the
problem that doesn't need a model at all:

  1. Utility.Wait() inside an event handler — Papyrus locks the script
     instance for the duration of the Wait(), so a second call to that same
     event queues and blocks instead of being dropped, firing the full
     effect sequence later against whoever/whatever triggered the second
     call, even if they're long gone by the time it runs.
  2. .Remove() called on a property that was faded in via .ApplyCrossFade()
     — cuts out abruptly instead of fading out to match. The real fix is
     ImageSpaceModifier.RemoveCrossFade(...), a GLOBAL function (verified
     against the real Creation Kit wiki), not an instance method.
  3. (informational only, not a hard failure — this one has legitimate
     exceptions) PlayAnimation() followed by state-changing calls in the
     same block with no RegisterForAnimationEvent anywhere in the file —
     those effects fire the instant the animation STARTS, not when it
     visually lands. Often intentional; flagged for review, not blocked.

Usage:
    python papyrus_lint.py <file_or_dir> [<file_or_dir> ...]
    python papyrus_lint.py --self-test

Exit 0 = no HIGH-severity findings (INFO findings don't affect exit code).
Exit 1 = at least one HIGH-severity finding, or --self-test failed.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

EVENT_START_RE = re.compile(r"^\s*Event\s+", re.IGNORECASE)
EVENT_END_RE = re.compile(r"^\s*EndEvent\b", re.IGNORECASE)
EVENT_NAME_RE = re.compile(r"^\s*Event\s+(?:[\w.]+\.)?(\w+)\s*\(", re.IGNORECASE)

WAIT_RE = re.compile(r"\bUtility\.(Wait|WaitMenuMode)\s*\(", re.IGNORECASE)
APPLY_CROSSFADE_RE = re.compile(r"\b(\w+)\.ApplyCrossFade\s*\(", re.IGNORECASE)
INSTANCE_REMOVE_RE = re.compile(r"\b(\w+)\.Remove\s*\(\s*\)", re.IGNORECASE)
GLOBAL_REMOVE_CROSSFADE_RE = re.compile(r"\bImageSpaceModifier\.RemoveCrossFade\s*\(", re.IGNORECASE)
INSTANCE_REMOVE_CROSSFADE_RE = re.compile(r"\b(\w+)\.RemoveCrossFade\s*\(", re.IGNORECASE)
PLAY_ANIMATION_RE = re.compile(r"\bPlayAnimation\s*\(", re.IGNORECASE)
REGISTER_ANIM_EVENT_RE = re.compile(r"\bRegisterForAnimationEvent\s*\(", re.IGNORECASE)
IMMEDIATE_EFFECT_RE = re.compile(r"\b(PlaceAtMe|DamageValue|DamageActorValue|ApplyCrossFade)\s*\(", re.IGNORECASE)


@dataclass
class Finding:
    file: str
    line: int
    severity: str  # "HIGH" or "INFO"
    rule: str
    message: str

    def __str__(self) -> str:
        return f"[{self.severity}] {self.file}:{self.line} ({self.rule}) {self.message}"


def _event_blocks(lines: list[str]) -> list[tuple[str, int, int]]:
    """Returns (event_name, start_line_1indexed, end_line_1indexed) for every
    top-level Event...EndEvent block. Papyrus events don't nest, so a simple
    open/close scan is exact — no need for a real parser."""
    blocks: list[tuple[str, int, int]] = []
    open_start: int | None = None
    open_name: str = "?"
    for i, line in enumerate(lines, start=1):
        if open_start is None and EVENT_START_RE.match(line):
            open_start = i
            m = EVENT_NAME_RE.match(line)
            open_name = m.group(1) if m else "?"
        elif open_start is not None and EVENT_END_RE.match(line):
            blocks.append((open_name, open_start, i))
            open_start = None
    return blocks


def lint_text(text: str, file_label: str) -> list[Finding]:
    findings: list[Finding] = []
    lines = text.splitlines()
    blocks = _event_blocks(lines)

    # Rule 1: Utility.Wait()/WaitMenuMode() inside any event handler.
    for name, start, end in blocks:
        block_text = "\n".join(lines[start - 1:end])
        for m in WAIT_RE.finditer(block_text):
            line_no = start - 1 + block_text.count("\n", 0, m.start()) + 1
            findings.append(Finding(
                file_label, line_no, "HIGH", "wait-inside-event-handler",
                f"Utility.{m.group(1)}() inside Event {name}(...) — the script instance stays "
                f"locked for the duration; a second call to this event while suspended here "
                f"queues and blocks instead of being dropped, firing the full sequence later "
                f"against whoever/whatever triggered it, even if they're long gone by then. "
                f"Use RegisterForSingleUpdate()/GoToState(\"Busy\") instead — see "
                f"papyrusThreadingGotchas.utilityWaitInsideEventHandlersQueuesRatherThanDrops."
            ))

    # Rule 2: .Remove() on a property that was faded in via .ApplyCrossFade().
    crossfaded_props = {m.group(1) for m in APPLY_CROSSFADE_RE.finditer(text)}
    for i, line in enumerate(lines, start=1):
        for m in INSTANCE_REMOVE_RE.finditer(line):
            prop = m.group(1)
            if prop in crossfaded_props:
                findings.append(Finding(
                    file_label, i, "HIGH", "abrupt-remove-after-crossfade",
                    f"{prop}.Remove() clears an effect that was faded IN via "
                    f"{prop}.ApplyCrossFade(...) elsewhere in this file — cuts out abruptly "
                    f"instead of fading out to match. Use ImageSpaceModifier.RemoveCrossFade(...) "
                    f"(a GLOBAL function, not an instance method) instead."
                ))

    # Rule 2b: RemoveCrossFade called via instance syntax instead of the global.
    for i, line in enumerate(lines, start=1):
        for m in INSTANCE_REMOVE_CROSSFADE_RE.finditer(line):
            if m.group(1).lower() == "imagespacemodifier":
                continue  # this IS the correct global-call form
            findings.append(Finding(
                file_label, i, "HIGH", "removecrossfade-wrong-scope",
                f"{m.group(1)}.RemoveCrossFade(...) — RemoveCrossFade is declared "
                f"'native global' on the real Creation Kit API (verified against the wiki), "
                f"callable only as ImageSpaceModifier.RemoveCrossFade(...), not via an instance "
                f"reference. Likely a compile error, or at best silently calls the wrong thing."
            ))

    # Rule 3 (INFO only): PlayAnimation() with immediate effects in the same
    # block and no RegisterForAnimationEvent anywhere in the file. Genuine
    # exceptions exist (immediate-fire can be the intended design), so this
    # never affects the exit code — it's a "worth a second look", not a FAIL.
    has_anim_registration = bool(REGISTER_ANIM_EVENT_RE.search(text))
    if not has_anim_registration:
        for name, start, end in blocks:
            block_text = "\n".join(lines[start - 1:end])
            play_m = PLAY_ANIMATION_RE.search(block_text)
            if not play_m:
                continue
            effect_m = IMMEDIATE_EFFECT_RE.search(block_text, play_m.end())
            if effect_m:
                line_no = start - 1 + block_text.count("\n", 0, effect_m.start()) + 1
                findings.append(Finding(
                    file_label, line_no, "INFO", "unsynced-playanimation-effect",
                    f"Event {name}(...): PlayAnimation() doesn't block until the animation "
                    f"actually plays — this effect fires the instant the animation STARTS, not "
                    f"when it visually lands. May be intentional; if not, register for the real "
                    f"animation event instead (RegisterForAnimationEvent/OnAnimationEvent). See "
                    f"papyrusThreadingGotchas.playAnimationDoesNotBlockUntilTheAnimationPlays."
                ))

    return findings


def lint_path(path: Path) -> list[Finding]:
    if path.is_file():
        return lint_text(path.read_text(encoding="utf-8", errors="replace"), str(path))
    findings: list[Finding] = []
    for p in sorted(path.rglob("*.psc")):
        findings.extend(lint_text(p.read_text(encoding="utf-8", errors="replace"), str(p)))
    return findings


# ---------------------------------------------------------------------------
# Self-test: regression fixtures so the linter's own correctness is checked,
# not just assumed. Excerpts are the real before/after patterns from the
# actual MossySporeTrap.psc review, not synthetic strawmen.
# ---------------------------------------------------------------------------

_BUGGY_FIXTURE = '''
ScriptName Buggy extends ObjectReference

Bool bReady = true

Event OnTriggerEnter(ObjectReference akActionRef)
    If !bReady
        Return
    EndIf
    bReady = false
    Self.PlayAnimation("Snap")
    Actor akActor = akActionRef as Actor
    akActor.DamageValue(Health, 10.0)
    BlurFX.ApplyCrossFade(1.0)
    Utility.Wait(8.0)
    BlurFX.Remove()
    Utility.Wait(3.0)
    bReady = true
EndEvent
'''

_FIXED_FIXTURE = '''
ScriptName Fixed extends ObjectReference

Bool _bBlurPending = false

Event OnTriggerEnter(ObjectReference akActionRef)
    Actor akActor = akActionRef as Actor
    If !akActor
        Return
    EndIf
    GoToState("Busy")
    RegisterForAnimationEvent(Self, "Snap")
    Self.PlayAnimation("Snap")
    RegisterForSingleUpdate(8.0)
EndEvent

State Busy
    Event OnAnimationEvent(ObjectReference akSource, String asEventName)
        akActor.DamageValue(Health, 10.0)
        BlurFX.ApplyCrossFade(1.0)
    EndEvent

    Event OnUpdate()
        ImageSpaceModifier.RemoveCrossFade(1.0)
        GoToState("")
    EndEvent
EndState
'''


def self_test() -> bool:
    ok = True

    buggy_findings = lint_text(_BUGGY_FIXTURE, "buggy_fixture")
    buggy_rules = {f.rule for f in buggy_findings if f.severity == "HIGH"}
    expected_buggy = {"wait-inside-event-handler", "abrupt-remove-after-crossfade"}
    if not expected_buggy.issubset(buggy_rules):
        print(f"SELF-TEST FAIL: buggy fixture should trigger {expected_buggy}, "
              f"only got {buggy_rules}")
        ok = False
    else:
        print(f"SELF-TEST OK: buggy fixture correctly flagged ({sorted(buggy_rules)})")

    fixed_findings = lint_text(_FIXED_FIXTURE, "fixed_fixture")
    fixed_high = [f for f in fixed_findings if f.severity == "HIGH"]
    if fixed_high:
        print(f"SELF-TEST FAIL: fixed fixture should have zero HIGH findings, got:")
        for f in fixed_high:
            print(f"  {f}")
        ok = False
    else:
        print("SELF-TEST OK: fixed fixture has zero HIGH findings (false-positive check passed)")

    return ok


def main() -> int:
    args = sys.argv[1:]
    if not args or args == ["--self-test"]:
        return 0 if self_test() else 1

    all_findings: list[Finding] = []
    for arg in args:
        p = Path(arg)
        if not p.exists():
            print(f"ERROR: {p} does not exist.")
            return 1
        all_findings.extend(lint_path(p))

    high = [f for f in all_findings if f.severity == "HIGH"]
    info = [f for f in all_findings if f.severity == "INFO"]

    for f in high:
        print(f)
    for f in info:
        print(f)

    print(f"\n{len(high)} HIGH-severity finding(s), {len(info)} INFO-severity finding(s).")
    return 1 if high else 0


if __name__ == "__main__":
    sys.exit(main())
