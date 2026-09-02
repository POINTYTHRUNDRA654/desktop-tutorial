"""Combat intelligence module — processes CombatMonitor events and generates
tactical directives for NPCs via Mossy.

Input:  Data/F4AI/combat_event.json
Output: Data/F4AI/combat_directive.json
Memory: <DATA_DIR>/NPC_Memories/combat/{npc_id}.json
"""

from __future__ import annotations

import json
from pathlib import Path

from paths import MEMORY_BASE
from fo4_knowledge import build_combat_system_prompt, get_combat_context

COMBAT_MEMORY_DIR = MEMORY_BASE / "combat"


def load_combat_memory(npc_id: str) -> dict:
    COMBAT_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    mem_file = COMBAT_MEMORY_DIR / f"{npc_id}.json"
    if mem_file.exists():
        try:
            return json.loads(mem_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {"encounters": [], "flee_threshold": 0.25, "prefers_cover": False, "wins": 0, "losses": 0}


def save_combat_memory(npc_id: str, memory: dict) -> None:
    COMBAT_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    mem_file = COMBAT_MEMORY_DIR / f"{npc_id}.json"
    try:
        mem_file.write_text(json.dumps(memory, indent=2), encoding="utf-8")
    except OSError:
        pass


def process_combat_event(event: dict, query_fn) -> dict:
    """Generate a combat directive from a CombatMonitor event.

    query_fn(prompt, max_tokens) -> str  — injected from main.py so this
    module stays decoupled from the specific LLM backend.
    """
    combat_type = event.get("combat_event", "update")
    npc_id      = event.get("npc_id", "0")
    npc_name    = event.get("npc_name", "NPC")
    npc_race    = event.get("npc_race", "Human")
    location    = event.get("location", "The Commonwealth")
    hp_pct      = float(event.get("hp_pct", 1.0))
    flee_thr    = float(event.get("flee_threshold", 0.25))
    cover       = bool(event.get("prefers_cover", False))
    target      = event.get("target", "unknown")

    memory = load_combat_memory(npc_id)

    # Build combat history context
    recent = memory.get("encounters", [])[-3:]
    history_text = ""
    for enc in recent:
        history_text += f"- {enc.get('outcome','unknown')} vs {enc.get('target','?')} at {enc.get('hp','?'):.0%} HP\n"

    # On combat end — log outcome and return early
    if combat_type == "end":
        memory["encounters"].append({
            "target": target,
            "outcome": "survived" if hp_pct > 0 else "defeated",
            "hp": hp_pct,
        })
        if len(memory["encounters"]) > 20:
            memory["encounters"].pop(0)
        if hp_pct > 0:
            memory["wins"] = memory.get("wins", 0) + 1
        else:
            memory["losses"] = memory.get("losses", 0) + 1
        save_combat_memory(npc_id, memory)
        return {"npc_id": npc_id, "directive": "none", "learned_flee_threshold": flee_thr, "prefers_cover": cover}

    # Build decision prompt — enriched with FO4 race/faction knowledge
    combat_context = build_combat_system_prompt(npc_name, npc_race, location)
    prompt = (
        f"{combat_context}\n"
        f"CURRENT SITUATION:\n"
        f"HP: {hp_pct:.0%} | Flee threshold: {flee_thr:.0%} | Prefers cover: {cover}\n"
        f"Fighting: {target}\n"
        f"Recent combat history:\n{history_text if history_text else 'No history yet.'}\n\n"
        f"Based on this NPC's race behavior and current situation, choose ONE directive:\n"
        f"  flee — retreat immediately (HP critical or enemy overwhelming)\n"
        f"  take_cover — find cover and wait for opening\n"
        f"  regroup — fall back to squad position\n"
        f"  change_target — switch to a more vulnerable target\n"
        f"  hold — stay in position and keep fighting\n\n"
        f"Respond ONLY with valid JSON:\n"
        f'{{\"directive\": \"...\", \"learned_flee_threshold\": 0.0, \"prefers_cover\": false, \"reason\": \"...\"}}'
    )

    raw = query_fn(prompt, max_tokens=80)
    directive_data = _parse_json_response(raw, {
        "directive": _decide_directive(hp_pct, flee_thr, cover),
        "learned_flee_threshold": flee_thr,
        "prefers_cover": cover,
    })

    # Persist learned behavior
    memory["flee_threshold"] = directive_data.get("learned_flee_threshold", flee_thr)
    memory["prefers_cover"]  = directive_data.get("prefers_cover", cover)
    save_combat_memory(npc_id, memory)

    directive_data["npc_id"] = npc_id
    print(f"[Combat AI] {npc_name}: {directive_data.get('directive')} "
          f"(HP {hp_pct:.0%}, reason: {directive_data.get('reason', '')})")
    return directive_data


def _decide_directive(hp_pct: float, flee_thr: float, prefers_cover: bool) -> str:
    """Rule-based fallback when LLM response is unparseable."""
    if hp_pct <= flee_thr:
        return "flee"
    if hp_pct <= flee_thr + 0.15 and prefers_cover:
        return "take_cover"
    if hp_pct <= 0.5:
        return "take_cover"
    return "hold"


def _parse_json_response(raw: str, fallback: dict) -> dict:
    """Extract JSON from LLM output, return fallback on failure."""
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (ValueError, KeyError):
            pass
    return fallback
