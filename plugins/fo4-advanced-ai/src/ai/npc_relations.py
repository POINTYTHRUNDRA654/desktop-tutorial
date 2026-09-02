"""NPC social relations module — processes NPCDirector social events and
generates conversation directives with actual dialogue lines via Mossy.

Input:  Data/F4AI/social_event.json
Output: Data/F4AI/social_directive.json
Memory: <DATA_DIR>/NPC_Memories/relationships/{pair_key}.json
"""

from __future__ import annotations

import json
from pathlib import Path

from paths import MEMORY_BASE
from fo4_knowledge import build_social_system_prompt, get_faction_context

RELATIONS_MEMORY_DIR = MEMORY_BASE / "relationships"


def load_relationship(pair_key: str) -> dict:
    RELATIONS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    mem_file = RELATIONS_MEMORY_DIR / f"{pair_key}.json"
    if mem_file.exists():
        try:
            return json.loads(mem_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {"score": 0.0, "history": [], "last_topic": ""}


def save_relationship(pair_key: str, memory: dict) -> None:
    RELATIONS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    mem_file = RELATIONS_MEMORY_DIR / f"{pair_key}.json"
    try:
        mem_file.write_text(json.dumps(memory, indent=2), encoding="utf-8")
    except OSError:
        pass


def process_social_event(event: dict, query_fn) -> dict:
    """Generate NPC-to-NPC social directive with dialogue lines."""
    npc_a       = event.get("npc_a", {})
    npc_b       = event.get("npc_b", {})
    name_a      = npc_a.get("name", "Settler")
    name_b      = npc_b.get("name", "Settler")
    id_a        = npc_a.get("id", "0")
    id_b        = npc_b.get("id", "1")
    race_a      = npc_a.get("race", "Human")
    race_b      = npc_b.get("race", "Human")
    faction_a   = npc_a.get("faction", "Independent")
    faction_b   = npc_b.get("faction", "Independent")
    location    = event.get("location", "The Commonwealth")
    rel_score   = float(event.get("relationship", 0.0))
    rel_label   = event.get("relationship_label", "neutral")
    last_topic  = event.get("last_topic", "")
    season      = event.get("season", "Summer")
    time_of_day = event.get("time_of_day", "Afternoon")
    weather     = event.get("weather", "Clear")

    # Build pair key (lower ID first for consistency)
    pair_key = f"{min(id_a, id_b)}_{max(id_a, id_b)}"
    memory = load_relationship(pair_key)

    # Conversation history
    recent = memory.get("history", [])[-4:]
    history_text = "\n".join(
        f"- [{h.get('behavior','?')}] topic: {h.get('topic','?')}"
        for h in recent
    )

    # Build lore-grounded social prompt with faction knowledge
    social_context = build_social_system_prompt(name_a, faction_a, name_b, faction_b)
    prompt = (
        f"{social_context}\n\n"
        f"CURRENT ENCOUNTER:\n"
        f"{name_a} ({race_a}) and {name_b} ({race_b}) are together at {location}\n"
        f"Time: {time_of_day} | Season: {season} | Weather: {weather}\n"
        f"Their relationship: {rel_label} (score: {rel_score:.0f} / 100)\n"
        f"Last conversation topic: {last_topic if last_topic else 'never talked before'}\n"
        f"Recent interaction history:\n{history_text if history_text else 'This is their first meeting.'}\n\n"
        "Direct how these two NPCs interact right now. Consider their factions and personalities.\n"
        "Write brief, naturalistic dialogue — each line under 15 words, wasteland vernacular.\n"
        "Choose a behavior that fits the faction dynamic (e.g., BoS and Railroad would be tense).\n\n"
        "Respond ONLY with valid JSON:\n"
        '{"behavior": "converse|greet|warn|argue|threaten|trade|comfort|ignore", '
        '"topic": "...", "line_a": "...", "line_b": "...", '
        '"relationship_delta": 0.0, "reason": "..."}'
    )

    raw = query_fn(prompt, max_tokens=150)
    directive = _parse_json_response(raw, _rule_based_social(rel_label, faction_a, faction_b))

    # Update relationship memory
    memory["score"] = rel_score + float(directive.get("relationship_delta", 0.0))
    memory["score"] = max(-100.0, min(100.0, memory["score"]))
    memory["last_topic"] = directive.get("topic", "")
    memory["history"].append({
        "behavior": directive.get("behavior", "converse"),
        "topic": directive.get("topic", ""),
    })
    if len(memory["history"]) > 20:
        memory["history"].pop(0)
    save_relationship(pair_key, memory)

    directive["npc_a_id"] = id_a
    directive["npc_b_id"] = id_b

    print(f"[NPC Relations] {name_a} ↔ {name_b}: {directive.get('behavior')} "
          f"('{directive.get('topic', '')}', Δrel={directive.get('relationship_delta', 0):+.1f})")
    return directive


def _rule_based_social(rel_label: str, faction_a: str, faction_b: str) -> dict:
    """Fallback when LLM is unavailable."""
    # Hostile factions always argue
    hostile_pairs = {("Raiders", "Minutemen"), ("Raiders", "Brotherhood of Steel"),
                     ("Institute", "Railroad")}
    pair = (faction_a, faction_b)
    if pair in hostile_pairs or (pair[1], pair[0]) in hostile_pairs:
        return {"behavior": "warn", "topic": "faction tension",
                "line_a": "You'd better watch yourself.", "line_b": "Same to you.",
                "relationship_delta": -5.0, "reason": "hostile factions"}

    if rel_label in ("enemy", "rival"):
        return {"behavior": "argue", "topic": "old grudge",
                "line_a": "We've got nothing to talk about.", "line_b": "Fine by me.",
                "relationship_delta": -2.0, "reason": "poor relationship"}
    if rel_label in ("close_ally", "friend"):
        return {"behavior": "converse", "topic": "daily life",
                "line_a": "Things staying quiet out here?", "line_b": "Quiet enough.",
                "relationship_delta": 1.0, "reason": "friendly chat"}
    return {"behavior": "greet", "topic": "passing greeting",
            "line_a": "Hey.", "line_b": "Hey.", "relationship_delta": 0.0, "reason": "neutral"}


def _parse_json_response(raw: str, fallback: dict) -> dict:
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (ValueError, KeyError):
            pass
    return fallback
