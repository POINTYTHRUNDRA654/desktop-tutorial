"""Multi-turn dialogue memory guards for local LLM pipelines."""

from __future__ import annotations

from pathlib import Path
from typing import Any

active_session_cache: dict[str, dict[str, Any]] = {}
MAX_TURNS = 5


def load_long_term_history(npc_name: str) -> dict[str, Any]:
    """Load persisted history; placeholder implementation."""
    if "Curie" in npc_name:
        npc_name = "Curie"
    _ = npc_name
    return {"history": []}


def verify_identity_integrity(game_payload: dict[str, Any]) -> bool:
    """Validate packet identity before reading or mutating memory."""
    current_npc = game_payload.get("npc_name")
    if not current_npc or str(current_npc).strip() == "":
        print("[Memory Guard Warning] Rejected corrupt or incomplete packet data.")
        return False
    return True


def add_to_history_with_pruning(
    session_data: dict[str, Any], player_line: str, npc_line: str
) -> dict[str, Any]:
    """Enforce sliding-window history for local 8B model stability."""
    session_data.setdefault("history", []).append({"p": player_line, "n": npc_line})
    if len(session_data["history"]) > MAX_TURNS:
        session_data["history"].pop(0)
        print("[Memory Guard] Pruned oldest conversation turn to protect GPU VRAM.")
    return session_data


def process_live_dialogue_turn(
    npc_name: str, player_speech: str, query_local_llm_backend
) -> tuple[str, dict[str, Any]]:
    """Run one dialogue turn while deferring persistent write until playback success."""
    if npc_name not in active_session_cache:
        active_session_cache[npc_name] = load_long_term_history(npc_name)

    session = active_session_cache[npc_name]
    history_block = "".join(
        f"Player: {turn['p']}\nYou: {turn['n']}\n" for turn in session.get("history", [])
    )
    full_prompt = f"[System Prompt Details]\n{history_block}Player: {player_speech}\nYou:"
    ai_response = query_local_llm_backend(npc_name, full_prompt)
    return ai_response, session


def write_flat_game_outputs(
    clean_subtitle: str,
    relative_audio_path: str,
    output_dir: str = "Data/F4AI",
) -> tuple[Path, Path]:
    """Write lightweight flat files for fast Papyrus reads."""
    base = Path(output_dir)
    base.mkdir(parents=True, exist_ok=True)
    text_path = base / "text_out.txt"
    audio_path = base / "audio_out.txt"
    text_path.write_text(clean_subtitle, encoding="utf-8")
    audio_path.write_text(relative_audio_path, encoding="utf-8")
    return text_path, audio_path
