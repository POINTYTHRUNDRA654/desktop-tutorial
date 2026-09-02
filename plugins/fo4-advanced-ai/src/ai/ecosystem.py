"""Ecosystem AI module — processes EcosystemMonitor events and generates
territory/population directives via Mossy.

Input:  Data/F4AI/ecosystem_event.json
Output: Data/F4AI/ecosystem_directive.json
Memory: <DATA_DIR>/NPC_Memories/ecosystem/
"""

from __future__ import annotations

import json
from pathlib import Path

from paths import MEMORY_BASE

ECOSYSTEM_MEMORY_DIR = MEMORY_BASE / "ecosystem"


def load_ecosystem_memory(region: str) -> dict:
    ECOSYSTEM_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    safe_region = region.replace(" ", "_").replace("/", "_")
    mem_file = ECOSYSTEM_MEMORY_DIR / f"{safe_region}.json"
    if mem_file.exists():
        try:
            return json.loads(mem_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {"history": [], "territory_owner": "", "dominant_species": ""}


def save_ecosystem_memory(region: str, memory: dict) -> None:
    ECOSYSTEM_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    safe_region = region.replace(" ", "_").replace("/", "_")
    mem_file = ECOSYSTEM_MEMORY_DIR / f"{safe_region}.json"
    try:
        mem_file.write_text(json.dumps(memory, indent=2), encoding="utf-8")
    except OSError:
        pass


def process_ecosystem_event(event: dict, query_fn) -> dict:
    """Generate ecosystem directive from EcosystemMonitor snapshot."""
    region          = event.get("region", "The Commonwealth")
    season          = event.get("season", "Summer")
    eco_state       = event.get("ecosystem_state", "balanced")
    territory_owner = event.get("territory_owner", "")
    predators       = int(event.get("predator_count", 0))
    prey            = int(event.get("prey_count", 0))
    species         = event.get("species", {})

    memory = load_ecosystem_memory(region)
    history = memory.get("history", [])[-3:]
    history_text = "\n".join(
        f"- {h.get('state','?')} ({h.get('season','?')}): owner={h.get('owner','?')}"
        for h in history
    )

    dominant = _find_dominant_species(species)

    prompt = (
        f"You are an ecosystem AI managing wildlife in Fallout 4's {region} region.\n"
        f"Season: {season} | State: {eco_state} | Territory owner: {territory_owner or 'contested'}\n"
        f"Predators: {predators} | Prey: {prey} | Dominant species: {dominant}\n"
        f"Species counts: {json.dumps(species)}\n"
        f"Recent history:\n{history_text if history_text else 'No history.'}\n\n"
        "Choose ONE directive: migrate, territorial_pressure, prey_boom, reset_territory, or none.\n"
        "Respond ONLY with valid JSON:\n"
        '{"directive": "...", "species": "...", "region": "...", '
        '"target_region": "...", "new_owner": "...", "reason": "..."}'
    )

    raw = query_fn(prompt, max_tokens=100)
    directive = _parse_json_response(raw, _rule_based_directive(eco_state, season, dominant, region))

    # Update memory
    memory["history"].append({
        "state": eco_state,
        "season": season,
        "owner": territory_owner,
        "predators": predators,
        "prey": prey,
    })
    if len(memory["history"]) > 30:
        memory["history"].pop(0)
    memory["territory_owner"] = directive.get("new_owner", territory_owner)
    memory["dominant_species"] = dominant
    save_ecosystem_memory(region, memory)

    print(f"[Ecosystem AI] {region}: {directive.get('directive')} "
          f"({eco_state}, {season}, owner={territory_owner})")
    return directive


def _find_dominant_species(species: dict) -> str:
    if not species:
        return "Unknown"
    return max(species, key=lambda k: int(species.get(k, 0)))


def _rule_based_directive(state: str, season: str, dominant: str, region: str) -> dict:
    """Fallback directive when LLM is unavailable."""
    if state == "overhunted":
        return {"directive": "territorial_pressure", "species": dominant,
                "region": region, "target_region": "", "new_owner": "", "reason": "prey declining"}
    if state == "prey_boom":
        return {"directive": "prey_boom", "species": dominant,
                "region": region, "target_region": "", "new_owner": "", "reason": "spring surge"}
    if state == "predator_starving":
        return {"directive": "migrate", "species": dominant,
                "region": region, "target_region": "The Commonwealth", "new_owner": "", "reason": "no prey"}
    return {"directive": "none", "species": "", "region": region,
            "target_region": "", "new_owner": "", "reason": "balanced"}


def _parse_json_response(raw: str, fallback: dict) -> dict:
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (ValueError, KeyError):
            pass
    return fallback
