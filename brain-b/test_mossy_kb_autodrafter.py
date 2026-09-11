"""
test_mossy_kb_autodrafter.py -- regression tests for mossy_kb_autodrafter.py.

Why this exists: Billy asked for "a test to verify that when the information
is scanned ... it's accurate". The parser reads real values straight out of
xEdit's own dump, so there's no LLM guessing involved -- but "reads real
values" does NOT mean "never has a bug." Case in point: the very first
version of build_chains() silently dropped the Demolition Expert chain
entirely, because it assumed a chain's start is "whatever nothing points
to" -- which breaks the moment a game record loops (DemolitionExpert04's
Next Perk really does point back to DemolitionExpert01 in the live game
data). That bug produced ZERO output and no error -- the dangerous kind.

So "verify accuracy" here means: lock in known-correct ground truth as
fixtures, and re-check the parser against it on every change. This is a
regression suite, not a claim that the parser is infallible -- it's the
thing that would have caught the NNAM-loop bug before it shipped, and the
next thing like it.

Run with:
    python -m pytest test_mossy_kb_autodrafter.py -v
or, with no pytest installed:
    python test_mossy_kb_autodrafter.py
"""

from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mossy_kb_autodrafter import (  # noqa: E402
    build_chains,
    draft_kb_entry,
    parse_dump,
    raw_perk_to_rank,
    verify_chain,
)

# --------------------------------------------------------------------------
# Fixture: real text copied verbatim from xEdit's own MossyDumpRecord_output.txt
# (Fallout4.esm, Demolition Expert, all 4 ranks -- the same case study that
# was hand-verified in xEdit and shipped as perk-001/perk-002 in
# bootstrap_fallout4_knowledge.py). This is ground truth, not invented data.
# --------------------------------------------------------------------------

DEMOLITION_EXPERT_DUMP = r"""
===== DemolitionExpert03 "Demolition Expert" [PERK:0004C925] =====
FormID (load order): 0004C925
FormID (local):      0004C925
EditorID:            DemolitionExpert03
Signature:           PERK
File:                Fallout4.esm
-- full field tree --
[PERK] (PERK)
  PERK \ EDID - Editor ID = DemolitionExpert03
  PERK \ FULL - Name = Demolition Expert
  PERK \ DESC - Description = Your explosives now do 75% more damage and affect a larger area.
  [PERK \ DATA - Data] (DATA)
    PERK \ DATA - Data \ Trait = False
    PERK \ DATA - Data \ Level = 22
    PERK \ DATA - Data \ Num Ranks = 4
    PERK \ DATA - Data \ Playable = True
    PERK \ DATA - Data \ Hidden = False
  PERK \ NNAM - Next Perk = DemolitionExpert04 "Demolition Expert" [PERK:00065E13]   -> LINKS TO: DemolitionExpert04 "Demolition Expert" [PERK:00065E13]
  [PERK \ Effects]
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Mod Player Explosion Damage
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Multiply Value
      [PERK \ Effects \ Effect \ Perk Conditions]
        [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition] (PRKC)
          [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions]
            [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition] (CTDA)
              [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA] (CTDA)
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Comparison Value = 0.000000
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Function = HasPerk
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Parameter #1 = DemolitionExpert04 "Demolition Expert" [PERK:00065E13]   -> LINKS TO: DemolitionExpert04 "Demolition Expert" [PERK:00065E13]
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Run On = Subject
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 1.750000
      PERK \ Effects \ Effect \ PRKF - End Marker =
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Mod Player Explosion Scale
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Multiply Value
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 1.250000
      PERK \ Effects \ Effect \ PRKF - End Marker =

===== DemolitionExpert02 "Demolition Expert" [PERK:0004C924] =====
FormID (load order): 0004C924
FormID (local):      0004C924
EditorID:            DemolitionExpert02
Signature:           PERK
File:                Fallout4.esm
-- full field tree --
[PERK] (PERK)
  PERK \ EDID - Editor ID = DemolitionExpert02
  PERK \ FULL - Name = Demolition Expert
  [PERK \ DATA - Data] (DATA)
    PERK \ DATA - Data \ Level = 10
  PERK \ NNAM - Next Perk = DemolitionExpert03 "Demolition Expert" [PERK:0004C925]   -> LINKS TO: DemolitionExpert03 "Demolition Expert" [PERK:0004C925]
  [PERK \ Effects]
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Mod Player Explosion Damage
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Multiply Value
      [PERK \ Effects \ Effect \ Perk Conditions]
        [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition] (PRKC)
          [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions]
            [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition] (CTDA)
              [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA] (CTDA)
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Comparison Value = 0.000000
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Function = HasPerk
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Parameter #1 = DemolitionExpert03 "Demolition Expert" [PERK:0004C925]   -> LINKS TO: DemolitionExpert03 "Demolition Expert" [PERK:0004C925]
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Run On = Subject
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 1.500000
      PERK \ Effects \ Effect \ PRKF - End Marker =
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Show Grenade Trajectory
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Set Value
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 1.000000
      PERK \ Effects \ Effect \ PRKF - End Marker =

===== DemolitionExpert01 "Demolition Expert" [PERK:0004C923] =====
FormID (load order): 0004C923
FormID (local):      0004C923
EditorID:            DemolitionExpert01
Signature:           PERK
File:                Fallout4.esm
-- full field tree --
[PERK] (PERK)
  PERK \ EDID - Editor ID = DemolitionExpert01
  PERK \ FULL - Name = Demolition Expert
  [PERK \ DATA - Data] (DATA)
    PERK \ DATA - Data \ Level = 0
  PERK \ NNAM - Next Perk = DemolitionExpert02 "Demolition Expert" [PERK:0004C924]   -> LINKS TO: DemolitionExpert02 "Demolition Expert" [PERK:0004C924]
  [PERK \ Effects]
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Mod Player Explosion Damage
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Multiply Value
      [PERK \ Effects \ Effect \ Perk Conditions]
        [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition] (PRKC)
          [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions]
            [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition] (CTDA)
              [PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA] (CTDA)
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Comparison Value = 0.000000
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Function = HasPerk
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Parameter #1 = DemolitionExpert02 "Demolition Expert" [PERK:0004C924]   -> LINKS TO: DemolitionExpert02 "Demolition Expert" [PERK:0004C924]
                PERK \ Effects \ Effect \ Perk Conditions \ Perk Condition \ Conditions \ Condition \ CTDA - CTDA \ Run On = Subject
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 1.250000
      PERK \ Effects \ Effect \ PRKF - End Marker =

===== DemolitionExpert04 "Demolition Expert" [PERK:00065E13] =====
FormID (load order): 00065E13
FormID (local):      00065E13
EditorID:            DemolitionExpert04
Signature:           PERK
File:                Fallout4.esm
-- full field tree --
[PERK] (PERK)
  PERK \ EDID - Editor ID = DemolitionExpert04
  PERK \ FULL - Name = Demolition Expert
  [PERK \ DATA - Data] (DATA)
    PERK \ DATA - Data \ Level = 34
  PERK \ NNAM - Next Perk = DemolitionExpert01 "Demolition Expert" [PERK:0004C923]   -> LINKS TO: DemolitionExpert01 "Demolition Expert" [PERK:0004C923]
  [PERK \ Effects]
    [PERK \ Effects \ Effect] (PRKE)
      [PERK \ Effects \ Effect \ PRKE - Header] (PRKE)
        PERK \ Effects \ Effect \ PRKE - Header \ Type = Entry Point
      [PERK \ Effects \ Effect \ DATA - Effect Data] (DATA)
        [PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point]
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Entry Point = Mod Player Explosion Damage
          PERK \ Effects \ Effect \ DATA - Effect Data \ Entry Point \ Function = Multiply Value
      [PERK \ Effects \ Effect \ Function Parameters] (EPFT)
        PERK \ Effects \ Effect \ Function Parameters \ EPFT - Type = Float
        [PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data] (EPFD)
          PERK \ Effects \ Effect \ Function Parameters \ EPFD - Data \ Float = 2.000000
      PERK \ Effects \ Effect \ PRKF - End Marker =
"""


class TestParseDump(unittest.TestCase):
    def setUp(self):
        self.records = parse_dump(DEMOLITION_EXPERT_DUMP)

    def test_finds_all_four_ranks(self):
        edids = sorted(r.editor_id for r in self.records)
        self.assertEqual(
            edids,
            ["DemolitionExpert01", "DemolitionExpert02", "DemolitionExpert03", "DemolitionExpert04"],
        )

    def test_levels_are_correct(self):
        by_edid = {r.editor_id: r for r in self.records}
        self.assertEqual(by_edid["DemolitionExpert01"].level, "0")
        self.assertEqual(by_edid["DemolitionExpert02"].level, "10")
        self.assertEqual(by_edid["DemolitionExpert03"].level, "22")
        self.assertEqual(by_edid["DemolitionExpert04"].level, "34")

    def test_nnam_chain_including_the_loop(self):
        by_edid = {r.editor_id: r for r in self.records}
        self.assertEqual(by_edid["DemolitionExpert01"].next_perk_editor_id, "DemolitionExpert02")
        self.assertEqual(by_edid["DemolitionExpert02"].next_perk_editor_id, "DemolitionExpert03")
        self.assertEqual(by_edid["DemolitionExpert03"].next_perk_editor_id, "DemolitionExpert04")
        # This is the field that broke the first version of build_chains():
        # rank 4 loops back to rank 1 instead of terminating.
        self.assertEqual(by_edid["DemolitionExpert04"].next_perk_editor_id, "DemolitionExpert01")

    def test_native_grenade_trajectory_effect_has_no_condition(self):
        by_edid = {r.editor_id: r for r in self.records}
        rank2 = raw_perk_to_rank(by_edid["DemolitionExpert02"])
        grenade_fx = next(e for e in rank2.effects if e.entry_point == "Show Grenade Trajectory")
        self.assertTrue(grenade_fx.native, "Show Grenade Trajectory must come back native (no Perk Condition)")
        self.assertIsNone(grenade_fx.condition)
        self.assertEqual(grenade_fx.value, "1.000000")

    def test_damage_multiplier_effect_is_gated_by_condition(self):
        by_edid = {r.editor_id: r for r in self.records}
        rank1 = raw_perk_to_rank(by_edid["DemolitionExpert01"])
        dmg_fx = next(e for e in rank1.effects if e.entry_point == "Mod Player Explosion Damage")
        self.assertFalse(dmg_fx.native)
        self.assertEqual(dmg_fx.condition, "HasPerk(DemolitionExpert02) == false")


class TestBuildChains(unittest.TestCase):
    def setUp(self):
        self.records = parse_dump(DEMOLITION_EXPERT_DUMP)

    def test_all_four_ranks_form_a_single_chain_despite_the_loop(self):
        """Regression test for the exact bug found and fixed on 2026-09-08:
        the first build_chains() implementation used "nothing points to me"
        to find a chain's start, which produced ZERO chains here because
        DemolitionExpert04's NNAM loops back to DemolitionExpert01 -- every
        record was "pointed to" by something, so nothing qualified as a
        start, and the whole case study silently vanished."""
        chains = build_chains(self.records)
        self.assertEqual(len(chains), 1, "Demolition Expert must resolve to exactly one chain, not zero")
        chain = chains[0]
        self.assertEqual(
            [r.editor_id for r in chain],
            ["DemolitionExpert01", "DemolitionExpert02", "DemolitionExpert03", "DemolitionExpert04"],
            "Chain must be in rank order (Level 0 -> 10 -> 22 -> 34), starting from rank 1",
        )

    def test_no_duplicate_or_dropped_records_across_all_chains(self):
        """Whatever chains build_chains() produces, every parsed record must
        appear in exactly one of them -- never dropped, never duplicated."""
        chains = build_chains(self.records)
        seen = [r.editor_id for chain in chains for r in chain]
        self.assertEqual(sorted(seen), sorted(r.editor_id for r in self.records))
        self.assertEqual(len(seen), len(set(seen)), "no record should appear in more than one chain")


class TestDraftKbEntry(unittest.TestCase):
    def test_draft_content_matches_the_hand_verified_case_study(self):
        """Cross-check the auto-drafted text against the facts that were
        hand-verified in xEdit and shipped as perk-002 in
        bootstrap_fallout4_knowledge.py. If this ever drifts, the auto
        pipeline has diverged from ground truth and needs a human look
        before anything gets promoted."""
        records = parse_dump(DEMOLITION_EXPERT_DUMP)
        chains = build_chains(records)
        entry = draft_kb_entry(chains[0], "test-fixture")
        content = entry["content"]

        self.assertIn("4 separate PERK record(s)", content)
        self.assertIn("Show Grenade Trajectory", content)
        self.assertIn("ZERO Perk Conditions attached", content)
        self.assertIn("Set Value", content)
        self.assertIn("value 1.000000", content)
        self.assertTrue(entry["_needs_review"], "auto-drafted entries must never claim to be pre-approved")


def _no_unresolved_placeholders_anywhere(records) -> list[str]:
    """Sanity check usable on ANY real dump, not just the fixture: an
    effect with no entry_point/function/value resolved is a parser miss,
    not a game fact -- surface it instead of silently emitting
    "(unknown ...)" into a KB entry."""
    problems = []
    for r in records:
        for eff in r.effects:
            rank = raw_perk_to_rank(r)
            for e in rank.effects:
                if "(unknown" in e.entry_point or "(unknown" in e.function or "(unknown" in e.value:
                    problems.append(f"{r.editor_id}: unresolved field in effect {e.entry_point}/{e.function}/{e.value}")
    return problems


class TestNoUnresolvedPlaceholders(unittest.TestCase):
    def test_fixture_has_no_unresolved_fields(self):
        records = parse_dump(DEMOLITION_EXPERT_DUMP)
        self.assertEqual(_no_unresolved_placeholders_anywhere(records), [])


class TestVerifyChain(unittest.TestCase):
    def test_the_real_demolition_expert_chain_passes_verification(self):
        records = parse_dump(DEMOLITION_EXPERT_DUMP)
        chains = build_chains(records)
        passed, warnings = verify_chain(chains[0])
        self.assertTrue(passed, f"expected clean pass, got warnings: {warnings}")
        self.assertEqual(warnings, [])

    def test_empty_chain_fails(self):
        passed, warnings = verify_chain([])
        self.assertFalse(passed)
        self.assertTrue(warnings)

    def test_chain_with_no_effects_is_flagged_not_silently_dropped(self):
        records = parse_dump(DEMOLITION_EXPERT_DUMP)
        by_edid = {r.editor_id: r for r in records}
        stripped = by_edid["DemolitionExpert01"]
        stripped.effects = []
        passed, warnings = verify_chain([stripped])
        self.assertFalse(passed)
        self.assertTrue(any("no Effects found" in w for w in warnings))

    def test_out_of_order_levels_are_flagged(self):
        records = parse_dump(DEMOLITION_EXPERT_DUMP)
        by_edid = {r.editor_id: r for r in records}
        # Deliberately construct an out-of-order chain (rank 2 before rank 1).
        bad_chain = [by_edid["DemolitionExpert02"], by_edid["DemolitionExpert01"]]
        passed, warnings = verify_chain(bad_chain)
        self.assertFalse(passed)
        self.assertTrue(any("ascending order" in w for w in warnings))


if __name__ == "__main__":
    unittest.main(verbosity=2)
