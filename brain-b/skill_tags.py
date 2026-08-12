#!/usr/bin/env python3
"""
skill_tags.py — the skill-tag vocabulary for the learner model

A flat list, not a prerequisite graph — that's later work, once there's real
learner_signals/learner_state data to design it from. Tags are derived PER
SOURCE PAGE, not per chunk: a page-to-tags mapping is small, reviewable, and
scales to hundreds of pages without needing per-chunk hand-tagging. Every
chunk from a given page inherits that page's tags (see ingest_ck_wiki.py's
write_page_jsonl, which reads PAGE_SKILL_TAGS via tags_for_page()).

Bootstrap entries (bootstrap_fallout4_knowledge.py) don't have individual
page titles to key on — they're mapped by their existing `category` field
instead, via CATEGORY_SKILL_TAGS.
"""

from __future__ import annotations

SKILL_TAG_VOCABULARY = [
    # Papyrus language fundamentals
    "papyrus-basics", "papyrus-variables", "papyrus-properties", "papyrus-arrays",
    "papyrus-structs", "papyrus-states", "papyrus-events", "papyrus-functions",
    # Core script APIs (one per major native script class)
    "objectreference-api", "actor-api", "actorbase-api", "form-api",
    "faction-api", "location-api", "cell-api", "keyword-api",
    "referencealias-api", "weapon-api", "perk-api", "package-ai",
    "activemagiceffect-api", "quest-scripting",
    # F4SE
    "f4se-basics",
    # Creation Kit
    "creation-kit-basics", "creation-kit-facegen", "creation-kit-navmesh",
    "creation-kit-landscape", "creation-kit-precombine",
    # xEdit / plugin work
    "xedit-basics", "xedit-conflicts", "xedit-leveled-lists", "load-order",
    # Assets
    "nif-blender-export", "nifskope", "bodyslide",
    # Packaging & release
    "ba2-packaging", "fomod-packaging", "mo2-deployment", "wabbajack-deployment",
    "wrye-bash",
    # Visuals / performance
    "enb-visual", "community-shaders", "performance-tuning", "gpu-config",
    # Diagnostics
    "crash-analysis",
    # Other domains
    "audio", "settlement-building", "sim-settlements",
]

# Page title (must match the exact title ingest_ck_wiki.py fetches) -> skill tags.
PAGE_SKILL_TAGS: dict[str, list[str]] = {
    "ObjectReference Script": ["objectreference-api", "papyrus-functions"],
    "Actor Script": ["actor-api", "papyrus-functions"],
    "ActorBase Script": ["actorbase-api", "papyrus-functions"],
    "Form Script": ["form-api", "papyrus-functions"],
    "FavoritesManager Script": ["papyrus-functions"],
    "F4SE Script": ["f4se-basics", "papyrus-functions"],
    "Quest Script": ["quest-scripting", "papyrus-functions"],
    "Faction Script": ["faction-api", "papyrus-functions"],
    "Location Script": ["location-api", "papyrus-functions"],
    "Cell Script": ["cell-api", "papyrus-functions"],
    "Keyword Script": ["keyword-api", "papyrus-functions"],
    "ReferenceAlias Script": ["referencealias-api", "quest-scripting"],
    "Weapon Script": ["weapon-api", "papyrus-functions"],
    "Perk Script": ["perk-api", "papyrus-functions"],
    "Package Script": ["package-ai", "papyrus-functions"],
    "ActiveMagicEffect Script": ["activemagiceffect-api", "papyrus-functions"],
    "Papyrus Introduction": ["papyrus-basics"],
    "Arrays (Papyrus)": ["papyrus-arrays"],
    "Bethesda Tutorial Papyrus Hello World": ["papyrus-basics"],
    "Structs (Papyrus)": ["papyrus-structs"],
    "Variables and Properties": ["papyrus-variables", "papyrus-properties"],
    "Using States In Papyrus": ["papyrus-states"],
    "Scripting Tutorial Using Functions": ["papyrus-basics", "papyrus-functions"],
    "Scripting Tutorial Pressure Plate": ["papyrus-basics", "objectreference-api"],
    "Safely increment variable from multiple scripts": ["papyrus-variables", "papyrus-events"],
}

# bootstrap_fallout4_knowledge.py entries key on `category`, not a page title.
CATEGORY_SKILL_TAGS: dict[str, list[str]] = {
    "creation-kit": ["creation-kit-basics"],
    "xedit": ["xedit-basics", "xedit-conflicts"],
    "nif-mesh": ["nif-blender-export"],
    "nifskope": ["nifskope"],
    "bodyslide": ["bodyslide"],
    "enb": ["enb-visual"],
    "community-shaders": ["community-shaders"],
    "f4se": ["f4se-basics"],
    "papyrus": ["papyrus-basics"],
    "ba2": ["ba2-packaging"],
    "fomod": ["fomod-packaging"],
    "mo2": ["mo2-deployment"],
    "wabbajack": ["wabbajack-deployment"],
    "wrye-bash": ["wrye-bash"],
    "load-order": ["load-order"],
    "performance": ["performance-tuning"],
    "precombine": ["creation-kit-precombine"],
    "gpu": ["gpu-config"],
    "crash-analysis": ["crash-analysis"],
    "audio": ["audio"],
    "settlement": ["settlement-building"],
    "sim-settlements": ["sim-settlements"],
    "mod-compatibility": ["load-order"],
    "version-management": ["f4se-basics"],
    "windows": [],
    "user-profile": [],
}


def tags_for_page(title: str) -> list[str]:
    return PAGE_SKILL_TAGS.get(title, [])


def tags_for_category(category: str) -> list[str]:
    return CATEGORY_SKILL_TAGS.get(category, [])
