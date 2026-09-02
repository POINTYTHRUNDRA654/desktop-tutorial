"""World state module — processes WorldMonitor events, maintains a shared
world context that all other AI modules can reference.

Input:  Data/F4AI/world_event.json
Output: Data/F4AI/world_directive.json  (rarely issued — mostly context storage)
Memory: <DATA_DIR>/NPC_Memories/world_state.json
        <DATA_DIR>/NPC_Memories/world_history.json
"""

from __future__ import annotations

import json
from pathlib import Path

from paths import MEMORY_BASE

WORLD_STATE_FILE   = MEMORY_BASE / "world_state.json"
WORLD_HISTORY_FILE = MEMORY_BASE / "world_history.json"

# In-memory cache so other modules can call get_world_context() without disk reads
_cache: dict = {}


def load_world_state() -> dict:
    if WORLD_STATE_FILE.exists():
        try:
            return json.loads(WORLD_STATE_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    return {
        "season": "Summer",
        "season_day": 1,
        "weather": "Clear",
        "is_raining": False,
        "is_snowing": False,
        "is_storming": False,
        "time_of_day": "Afternoon",
        "hour": 12.0,
        "is_night": False,
        "player_region": "The Commonwealth",
        "last_updated": 0.0,
    }


def save_world_state(state: dict) -> None:
    try:
        WORLD_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        WORLD_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError:
        pass


def get_world_context() -> dict:
    """Public API for other AI modules to pull current world context."""
    global _cache
    if _cache:
        return _cache
    return load_world_state()


def append_world_history(entry: dict) -> None:
    history: list = []
    if WORLD_HISTORY_FILE.exists():
        try:
            history = json.loads(WORLD_HISTORY_FILE.read_text(encoding="utf-8"))
            if not isinstance(history, list):
                history = []
        except (OSError, ValueError):
            pass

    history.append(entry)
    if len(history) > 100:
        history.pop(0)

    try:
        WORLD_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        WORLD_HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")
    except OSError:
        pass


def process_world_event(event: dict, query_fn) -> dict:
    """Store world state and optionally request a weather/event directive from Mossy."""
    global _cache

    state = load_world_state()

    # Update fields from event
    season      = event.get("season", state["season"])
    season_day  = int(event.get("season_day", state["season_day"]))
    weather     = event.get("weather", state["weather"])
    is_raining  = bool(event.get("is_raining", state["is_raining"]))
    is_snowing  = bool(event.get("is_snowing", state["is_snowing"]))
    is_storming = bool(event.get("is_storming", state["is_storming"]))
    time_of_day = event.get("time_of_day", state["time_of_day"])
    hour        = float(event.get("hour", state["hour"]))
    is_night    = bool(event.get("is_night", state["is_night"]))
    region      = event.get("player_region", state["player_region"])
    game_time   = float(event.get("game_time", 0.0))

    # Detect significant changes that might warrant a directive
    season_changed  = season != state.get("season", "")
    weather_changed = weather != state.get("weather", "")
    region_changed  = region != state.get("player_region", "")

    new_state = {
        "season": season,
        "season_day": season_day,
        "weather": weather,
        "is_raining": is_raining,
        "is_snowing": is_snowing,
        "is_storming": is_storming,
        "time_of_day": time_of_day,
        "hour": hour,
        "is_night": is_night,
        "player_region": region,
        "last_updated": game_time,
    }

    # Update in-memory cache immediately so other modules see it
    _cache = new_state
    save_world_state(new_state)

    # Append to history when something notable changes
    if season_changed or weather_changed or region_changed:
        append_world_history({
            "game_time": game_time,
            "season": season,
            "season_day": season_day,
            "weather": weather,
            "region": region,
            "is_night": is_night,
        })

    # Only query LLM on major environmental transitions — not every 30s tick
    # This avoids burning tokens on routine world updates
    if not (season_changed or (weather_changed and is_storming) or region_changed):
        return {"directive": "none", "reason": "no significant change"}

    # Build transition prompt for interesting events
    transition = []
    if season_changed:
        transition.append(f"season changed to {season}")
    if weather_changed and is_storming:
        transition.append("storm rolling in")
    if region_changed:
        transition.append(f"player entered {region}")

    prompt = (
        f"You are Mossy, world-aware AI for Fallout 4.\n"
        f"Environmental transition: {', '.join(transition)}\n"
        f"Current: {season} day {season_day} | {weather} | {time_of_day} | {region}\n"
        f"Night: {is_night}\n\n"
        "Should this trigger any world event directive? Options: set_weather, none.\n"
        "Keep responses rare — only suggest set_weather if a storm would genuinely add drama.\n"
        "Respond ONLY with valid JSON:\n"
        '{"directive": "none|set_weather", "weather_type": "Clear|Rain|Storm|Snow", '
        '"player_advisory": "...", "reason": "..."}'
    )

    raw = query_fn(prompt, max_tokens=80)
    directive = _parse_json_response(raw, {"directive": "none", "reason": "transition noted"})

    print(f"[World State] {', '.join(transition)} → {directive.get('directive', 'none')}")
    return directive


def _parse_json_response(raw: str, fallback: dict) -> dict:
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (ValueError, KeyError):
            pass
    return fallback
