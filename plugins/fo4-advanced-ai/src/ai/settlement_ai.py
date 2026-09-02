"""Settlement AI module — processes SettlementMonitor and MinutemanNetwork events,
generates tactical directives for settlement defense and mutual aid.

Inputs:  Data/F4AI/settlement_event.json
         Data/F4AI/network_event.json
Outputs: Data/F4AI/settlement_directive.json
         Data/F4AI/network_directive.json
Memory:  <DATA_DIR>/NPC_Memories/settlements/{name}_state.json
         <DATA_DIR>/NPC_Memories/settlements/{name}_history.json
"""

from __future__ import annotations

import json
from pathlib import Path

from paths import MEMORY_BASE

SETTLEMENTS_MEMORY_DIR = MEMORY_BASE / "settlements"


def _safe_name(name: str) -> str:
    return name.replace(" ", "_").replace("/", "_").replace("\\", "_")


def load_settlement_state(name: str) -> dict:
    SETTLEMENTS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    state_file = SETTLEMENTS_MEMORY_DIR / f"{_safe_name(name)}_state.json"
    if state_file.exists():
        try:
            return json.loads(state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {"defense": 0, "population": 0, "attacks_survived": 0,
            "last_directive": "", "ally_settlements": []}


def save_settlement_state(name: str, state: dict) -> None:
    SETTLEMENTS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    state_file = SETTLEMENTS_MEMORY_DIR / f"{_safe_name(name)}_state.json"
    try:
        state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError:
        pass


def load_settlement_history(name: str) -> list:
    SETTLEMENTS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    hist_file = SETTLEMENTS_MEMORY_DIR / f"{_safe_name(name)}_history.json"
    if hist_file.exists():
        try:
            data = json.loads(hist_file.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (OSError, ValueError):
            pass
    return []


def append_settlement_history(name: str, entry: dict) -> None:
    history = load_settlement_history(name)
    history.append(entry)
    if len(history) > 50:
        history.pop(0)
    SETTLEMENTS_MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    hist_file = SETTLEMENTS_MEMORY_DIR / f"{_safe_name(name)}_history.json"
    try:
        hist_file.write_text(json.dumps(history, indent=2), encoding="utf-8")
    except OSError:
        pass


def process_settlement_event(event: dict, query_fn) -> dict:
    """Generate tactical directive for a settlement event."""
    event_type   = event.get("event_type", "status_update")
    ws_id        = int(event.get("workshop_id", -1))
    name         = event.get("settlement_name", f"Settlement_{ws_id}")
    defense      = int(event.get("defense", 0))
    population   = int(event.get("population", 0))
    food         = int(event.get("food", 0))
    water        = int(event.get("water", 0))
    happiness    = int(event.get("happiness", 50))
    under_attack = bool(event.get("under_attack", False))
    triangle_ctx = event.get("triangle_context", "")
    # SS2 build limits
    plots_used   = int(event.get("ss2_plots_estimated", 0))
    plots_max    = int(event.get("ss2_plots_max", 128))
    plot_pct     = float(event.get("ss2_plot_pct", 0.0))

    state = load_settlement_state(name)

    # Detect important changes
    prev_attacks = state.get("attacks_survived", 0)
    if under_attack and event_type == "under_attack":
        state["attacks_survived"] = prev_attacks + 1

    # Build context for LLM
    recent_history = load_settlement_history(name)[-3:]
    history_text = "\n".join(
        f"- {h.get('event','?')}: directive={h.get('directive','?')}"
        for h in recent_history
    )

    # SS2 plot pressure warning
    plot_warning = ""
    if plot_pct >= 0.85:
        plot_warning = (f"⚠ Plot budget critical: {plots_used}/{plots_max} plots used "
                        f"({plot_pct:.0%}). Prioritize resource/defensive plots over decorative.")
    elif plot_pct >= 0.65:
        plot_warning = (f"Plot budget moderate: {plots_used}/{plots_max} plots used. "
                        f"Avoid adding decorative plots.")

    prompt = (
        f"You are a settlement AI managing {name} in Fallout 4 (Minutemen playthrough).\n"
        f"Build system: Sim Settlements 2 — 255 objects/plot max, {plots_max} plots/settlement max.\n"
        f"Event: {event_type}\n"
        f"Defense: {defense} | Population: {population} | Food: {food} | "
        f"Water: {water} | Happiness: {happiness}\n"
        f"SS2 plots: ~{plots_used}/{plots_max} used ({plot_pct:.0%} of budget)\n"
        f"Under attack: {under_attack}\n"
        f"Total attacks survived: {state.get('attacks_survived', 0)}\n"
    )
    if plot_warning:
        prompt += f"{plot_warning}\n"
    if triangle_ctx:
        prompt += f"Triangle context: {triangle_ctx}\n"
    if history_text:
        prompt += f"Recent history:\n{history_text}\n"

    prompt += (
        "\nChoose ONE directive: rally_defenders, call_aid, prioritize_gate, "
        "raise_alarm, stand_down, or none.\n"
        "If plot budget is high, recommend plot type in player_advisory "
        "(e.g. 'Build resource plots, skip decorative').\n"
        "If attack: advisory should be a combat warning (under 15 words).\n"
        "Respond ONLY with valid JSON:\n"
        '{"directive": "...", "target_settlement": "...", '
        '"player_advisory": "...", "reason": "..."}'
    )

    raw = query_fn(prompt, max_tokens=120)
    directive = _parse_json_response(raw, _rule_based_settlement(
        event_type, defense, population, food, water, under_attack
    ))

    # Update state
    state["defense"] = defense
    state["population"] = population
    state["last_directive"] = directive.get("directive", "none")
    save_settlement_state(name, state)

    # Append history
    append_settlement_history(name, {
        "event": event_type,
        "defense": defense,
        "population": population,
        "directive": directive.get("directive", "none"),
        "under_attack": under_attack,
    })

    print(f"[Settlement AI] {name}: {directive.get('directive')} "
          f"(defense={defense}, pop={population}, attack={under_attack})")
    return directive


def process_network_event(event: dict, query_fn) -> dict:
    """Generate strategic directive for a Minuteman network event."""
    event_type      = event.get("event_type", "network_attack")
    attacked_id     = int(event.get("attacked_id", -1))
    attacked_name   = event.get("attacked_name", "Unknown")
    attacked_defense= int(event.get("attacked_defense", 0))
    attacked_pop    = int(event.get("attacked_population", 0))
    connected       = event.get("connected_settlements", "")
    network_size    = int(event.get("total_network_size", 1))
    is_triangle     = bool(event.get("is_triangle", False))

    state = load_settlement_state(attacked_name)
    attacks_survived = state.get("attacks_survived", 0)

    prompt = (
        f"You are Mossy, strategic AI for the Minutemen in Fallout 4.\n"
        f"Network event: {event_type}\n"
        f"Under attack: {attacked_name} (ID {attacked_id})\n"
        f"Defense: {attacked_defense} | Population: {attacked_pop}\n"
        f"Is Triangle (Sanctuary/Red Rocket/Abernathy): {is_triangle}\n"
        f"Connected settlements: {connected if connected else 'none'}\n"
        f"Total network size: {network_size} settlements\n"
        f"Times {attacked_name} has survived attacks: {attacks_survived}\n\n"
        "Choose ONE strategic directive: reroute_supply_lines, fortify, "
        "rebuild_network_map, or none.\n"
        "Write a brief player advisory (under 20 words) to show on screen.\n"
        "Respond ONLY with valid JSON:\n"
        '{"directive": "...", "target_settlement_id": 0, '
        '"from_id": "", "to_id": "", "player_advisory": "...", "reason": "..."}'
    )

    raw = query_fn(prompt, max_tokens=120)
    directive = _parse_json_response(raw, _rule_based_network(
        attacked_name, attacked_defense, attacked_pop, is_triangle, network_size
    ))

    print(f"[Network AI] {event_type}: {attacked_name} → directive={directive.get('directive')}")
    return directive


def _rule_based_settlement(event_type: str, defense: int, population: int,
                            food: int, water: int, under_attack: bool) -> dict:
    """Fallback when LLM unavailable."""
    if under_attack or event_type == "under_attack":
        if defense < 30:
            return {"directive": "call_aid", "target_settlement": "",
                    "player_advisory": f"Settlement is outmatched — reinforcements needed!",
                    "reason": "low defense under attack"}
        return {"directive": "rally_defenders", "target_settlement": "",
                "player_advisory": "Settlement is under attack! Defenders rallying.",
                "reason": "under attack, defense adequate"}
    if defense < 20:
        return {"directive": "raise_budget", "target_settlement": "",
                "player_advisory": "", "reason": "defense too low"}
    if food < population or water < population:
        return {"directive": "none", "target_settlement": "",
                "player_advisory": "", "reason": "resource shortage — build more farms/pumps"}
    return {"directive": "none", "target_settlement": "", "player_advisory": "", "reason": "stable"}


def _rule_based_network(name: str, defense: int, population: int,
                         is_triangle: bool, network_size: int) -> dict:
    """Fallback network directive."""
    advisory = f"{name} is under attack!"
    if is_triangle:
        advisory = f"Triangle settlement {name} under attack — all units mobilizing!"
    if defense < 30:
        return {"directive": "fortify", "target_settlement_id": 0,
                "from_id": "", "to_id": "",
                "player_advisory": advisory + " Defense critical.", "reason": "low defense"}
    return {"directive": "none", "target_settlement_id": 0,
            "from_id": "", "to_id": "",
            "player_advisory": advisory, "reason": "defense adequate"}


def _parse_json_response(raw: str, fallback: dict) -> dict:
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (ValueError, KeyError):
            pass
    return fallback
