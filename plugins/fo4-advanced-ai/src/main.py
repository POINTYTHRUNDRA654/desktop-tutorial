"""Production-style standalone bridge loop for Fallout 4 AI integration.

Part of Mossy Industries - Advancing AI in Gaming
A subsidiary of Mossy Industries open source project
"""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import requests

from tts import check_lipgen_eligibility, execute_headless_lipgen, normalize_audio_for_lipgen
from fo4_knowledge import build_npc_system_prompt
from ai.memory_store import save_dialogue_turn, build_history_string, set_npc_fact

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Exe-local dir — always the folder containing the running .exe (or .py in dev)
if hasattr(sys, "_MEIPASS"):
    _EXE_DIR = Path(sys.executable).resolve().parent
else:
    _EXE_DIR = Path(__file__).resolve().parent


def _locate_fo4_data_f4ai() -> Path:
    """
    Find the real Fallout 4 Data/F4AI/ folder so Papyrus file I/O and the bridge
    agree on the same location.  Priority:
      1. game_data_path key in config.json next to the exe
      2. Windows registry (Bethesda / Steam installs)
      3. Exe's own directory (dev / direct-in-Data installs)
    """
    # 1. Manual override in config.json
    local_cfg = _EXE_DIR / "config.json"
    if local_cfg.exists():
        try:
            cfg = json.loads(local_cfg.read_text(encoding="utf-8"))
            override = cfg.get("game_data_path", "").strip()
            if override:
                return Path(override)
        except (OSError, ValueError):
            pass

    # 2. Windows registry — Bethesda launcher and Steam both write this key
    try:
        import winreg
        for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            for subkey in (
                r"SOFTWARE\Bethesda Softworks\Fallout4",
                r"SOFTWARE\WOW6432Node\Bethesda Softworks\Fallout4",
            ):
                try:
                    key = winreg.OpenKey(hive, subkey)
                    install_path, _ = winreg.QueryValueEx(key, "installed path")
                    winreg.CloseKey(key)
                    candidate = Path(install_path) / "Data" / "F4AI"
                    return candidate
                except OSError:
                    continue
    except ImportError:
        pass

    # 3. Fall back — exe lives directly in Data/F4AI/ (non-MO2 installs)
    return _EXE_DIR


DATA_DIR      = _locate_fo4_data_f4ai()
INPUT_FILE    = DATA_DIR / "bridge_input.json"
OUTPUT_FILE   = DATA_DIR / "bridge_output.json"
TEXT_OUT_FILE = DATA_DIR / "text_out.txt"
CONFIG_FILE   = _EXE_DIR / "config.json"   # config stays next to the exe
MEMORY_DIR    = DATA_DIR / "NPC_Memories"
STATUS_FILE   = DATA_DIR / "bridge_status.json"
FALLOUT_ROOT  = DATA_DIR.parent.parent.resolve()
CK_32_EXE     = FALLOUT_ROOT / "CreationKit32.exe"
PIPER_EXE     = _EXE_DIR / "piper.exe"     # piper lives next to the exe
KOBOLD_API_URL         = os.getenv("F4AI_KOBOLD_API_URL", "http://localhost:5001/api/v1/generate")
MOSSY_DEFAULT_ENDPOINT = "http://127.0.0.1:8765/f4ai/bridge"

_RACE_TO_NPC_ROLE: dict[str, str] = {
    "ghoul": "ghoul", "feral ghoul": "ghoul",
    "super mutant": "raider",
    "synth": "robot", "protectron": "robot", "assaultron": "robot", "sentry bot": "robot",
    "settler": "settler", "minuteman": "settler",
    "companion": "companion",
}


def _race_to_npc_role(race: str) -> str:
    return _RACE_TO_NPC_ROLE.get(race.strip().lower(), "default")

# ─────────────────────────────────────────────────────────────────────────────
# Startup helpers
# ─────────────────────────────────────────────────────────────────────────────

def _f4ai(msg: str) -> None:
    """Print a [F4AI]-prefixed status line."""
    print(f"[F4AI] {msg}")


def check_mossy_connection(endpoint: str, timeout: float = 3.0) -> bool:
    """Return True if the Mossy F4AI Bridge is reachable at *endpoint*."""
    host_root = "/".join(endpoint.split("/")[:3])
    try:
        r = requests.get(f"{host_root}/health", timeout=timeout)
        data = r.json() if r.headers.get("Content-Type", "").startswith("application/json") else {}
        return r.status_code == 200 and data.get("ok") is True
    except requests.exceptions.ConnectionError:
        return False
    except Exception:
        return False


def print_startup_banner(config: dict) -> bool:
    """Print [F4AI] startup diagnostics. Returns True if Mossy is online."""
    mossy_enabled  = _is_enabled(config.get("enable_mossy_bridge", 0))
    mossy_endpoint = os.getenv(
        "F4AI_MOSSY_ENDPOINT",
        config.get("mossy_endpoint", MOSSY_DEFAULT_ENDPOINT),
    )
    timeout = float(config.get("mossy_timeout", 3.0))

    print("=" * 62)
    _f4ai("Fallout 4 Advanced AI - Mossy Bridge Mode")
    _f4ai(f"Endpoint : {mossy_endpoint}")
    _f4ai(f"Memory   : {MEMORY_DIR.parent}")
    print("=" * 62)

    mossy_online = False
    if mossy_enabled:
        _f4ai("Checking Mossy connection...")
        mossy_online = check_mossy_connection(mossy_endpoint, timeout)
        if mossy_online:
            _f4ai("Mossy detected — AI responses will use Mossy.")
        else:
            _f4ai(f"WARNING: Mossy not detected at {mossy_endpoint.split('/')[2]}")
            _f4ai("Falling back to local KoboldCPP AI.")
            _f4ai("To use Mossy: open the Mossy desktop app before launching Fallout 4.")
    else:
        _f4ai("Mossy bridge disabled — using local KoboldCPP AI.")
        _f4ai("To enable Mossy: set \"enable_mossy_bridge\": 1 in config.json")

    print("=" * 62)
    print()
    return mossy_online


# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

def locate_installed_voice_model() -> str | None:
    """Find the first ONNX voice model file in runtime directory."""
    found_models = glob.glob(str(DATA_DIR / "*.onnx"))
    return found_models[0] if found_models else None


def load_user_config() -> dict:
    """Load local config file with safe defaults."""
    defaults = {
        "ai_temperature": 0.7,
        "enable_memory": 1,
        "enable_voice_input": 0,
        "voice_history_turns": 8,
        "speech_speed": 1.0,
        "enable_mossy_bridge": 1,
        "mossy_endpoint": MOSSY_DEFAULT_ENDPOINT,
        "mossy_timeout": 5.0,
        "plugin_timeout": 3.0,
        "enable_plugin_hooks": 0,
        "plugin_endpoints": [],
    }
    if CONFIG_FILE.exists():
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as handle:
                user_cfg = json.load(handle)
                # Merge: user config overrides defaults
                defaults.update(user_cfg)
                return defaults
        except (OSError, ValueError):
            return defaults
    return defaults


# ─────────────────────────────────────────────────────────────────────────────
# NPC Memory
# ─────────────────────────────────────────────────────────────────────────────

def load_or_create_memory(npc_name: str) -> dict:
    """Load or initialize NPC memory with Curie unification guard."""
    if "Curie" in npc_name:
        npc_name = "Curie"
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    memory_file = MEMORY_DIR / f"{npc_name.replace(' ', '_')}.json"
    if memory_file.exists():
        try:
            with memory_file.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (OSError, ValueError):
            pass
    return {"conversations": []}


def update_npc_memory(npc_name: str, player_line: str, npc_line: str) -> None:
    """Write rolling dialogue memory with VRAM-safe turn cap."""
    if "Curie" in npc_name:
        npc_name = "Curie"
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    memory_file = MEMORY_DIR / f"{npc_name.replace(' ', '_')}.json"
    memory_data = load_or_create_memory(npc_name)
    memory_data["conversations"].append({"p": player_line, "n": npc_line})
    if len(memory_data["conversations"]) > 5:
        memory_data["conversations"].pop(0)
    try:
        with memory_file.open("w", encoding="utf-8") as handle:
            json.dump(memory_data, handle, indent=2)
    except OSError:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# LLM backends
# ─────────────────────────────────────────────────────────────────────────────

def query_local_llm(prompt: str, temperature: float = 0.7) -> str:
    """Query local Kobold endpoint with firewall-safe fallback text."""
    payload = {
        "prompt": prompt,
        "max_length": 120,
        "temperature": temperature,
        "top_p": 0.9,
        "rep_pen": 1.1,
        "stop_sequence": ["\n", "Player:", "You:"],
    }
    try:
        response = requests.post(KOBOLD_API_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        text = data.get("results", [{}])[0].get("text", "").strip()
        if text:
            return text
    except (requests.RequestException, KeyError, IndexError, ValueError):
        pass
    return "I have nothing to say right now."


def query_mossy_bridge(
    endpoint: str, payload: dict, timeout: float, event: str = "dialogue_request"
) -> str | None:
    """Send dialogue context to Mossy /f4ai/bridge and return NPC response text."""
    if event != "dialogue_request":
        return "ack"

    npc          = payload.get("npc_name", "Settler")
    npc_race     = payload.get("npc_race", "")
    npc_role     = _race_to_npc_role(npc_race)
    location     = payload.get("location", "The Commonwealth")
    player_input = payload.get("player_speech", "")
    history_str  = payload.get("history", "")

    # Convert "Player: ...\nYou: ...\n" history into Mossy's dialogue_history format
    dialogue_history: list[dict] = []
    for line in history_str.strip().splitlines():
        if line.startswith("Player: "):
            dialogue_history.append({"speaker": "player", "text": line[8:]})
        elif line.startswith("You: "):
            dialogue_history.append({"speaker": "assistant", "text": line[5:]})
        elif line.startswith(f"{npc}: "):
            dialogue_history.append({"speaker": "assistant", "text": line[len(npc) + 2:]})

    mossy_payload = {
        "npc_id":           payload.get("npc_id", npc.lower().replace(" ", "_")),
        "npc_name":         npc,
        "npc_role":         npc_role,
        "player_input":     player_input,
        "dialogue_history": dialogue_history,
        "context":          f"Location: {location}",
    }

    try:
        response = requests.post(endpoint, json=mossy_payload, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        if data.get("ok") is False:
            print(f"[Mossy] Error: {data.get('error', 'unknown')}")
            return None
        # Mossy returns {"dialogue": "..."} — also accept "text"/"npc_response" for compat
        text = data.get("dialogue") or data.get("text") or data.get("npc_response")
        if isinstance(text, str) and text.strip():
            return text.strip()
    except requests.ConnectionError:
        return None
    except requests.Timeout:
        print(f"[Mossy] Timed out after {timeout}s — falling back to local AI.")
        return None
    except requests.RequestException:
        return None
    except json.JSONDecodeError:
        print("[Mossy] Invalid JSON response.")
        return None
    return None


def post_plugin_event(endpoint: str, event: str, payload: dict, timeout: float) -> dict | None:
    """Send a plugin event and return parsed JSON dict when available."""
    try:
        response = requests.post(
            endpoint,
            json={"event": event, "payload": payload},
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else None
    except requests.RequestException:
        return None
    except json.JSONDecodeError:
        print(f"[Plugin Hook] Invalid JSON response from {endpoint} ({event}).")
        return None


def normalize_plugin_endpoints(value: object) -> list[str]:
    """Normalize plugin endpoint config into a validated list of URLs."""
    if isinstance(value, list):
        return [item.strip() for item in value if isinstance(item, str) and item.strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Output processing
# ─────────────────────────────────────────────────────────────────────────────

def process_ai_output(raw_output: str) -> tuple[str, int]:
    """Normalize generated output and extract emotion id."""
    emotion_id = extract_emotion_id(raw_output)
    response = strip_emotion_tag(raw_output).replace("*", "").replace('"', "").strip()
    return response, emotion_id


def extract_emotion_id(raw_llm_output: str) -> int:
    """Map emotion tags to compact Papyrus-friendly integer ids."""
    if "[ANGRY]"   in raw_llm_output: return 1
    if "[SAD]"     in raw_llm_output: return 2
    if "[WHISPER]" in raw_llm_output: return 3
    return 0


def strip_emotion_tag(raw_llm_output: str) -> str:
    """Remove leading [TAG] marker from generated line."""
    return re.sub(r"^\[(NORMAL|ANGRY|SAD|WHISPER)\]\s*", "", raw_llm_output).strip()


def _is_enabled(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _write_bridge_status(npc: str, location: str, player_input: str, response: str, source: str) -> None:
    """Write last-response status to Data/F4AI/ for external monitoring."""
    try:
        STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATUS_FILE.write_text(
            json.dumps({
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "source": source,
                "npc": npc,
                "location": location,
                "player": player_input,
                "response": response,
            }, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Main event loop
# ─────────────────────────────────────────────────────────────────────────────

def process_game_event() -> None:
    """Read bridge packet, generate response, render audio, and return payload."""
    time.sleep(0.05)
    try:
        with INPUT_FILE.open("r", encoding="utf-8") as handle:
            context = json.load(handle)
    except (OSError, ValueError):
        return

    try:
        INPUT_FILE.unlink(missing_ok=True)
    except OSError:
        pass

    # Delete any stale text_out.txt so the trigger doesn't read a previous response
    try:
        TEXT_OUT_FILE.unlink(missing_ok=True)
    except OSError:
        pass

    npc          = context.get("npc_name", "Settler")
    npc_race     = context.get("npc_race", "")
    npc_faction  = context.get("npc_faction", "")
    location     = context.get("location", "The Commonwealth")
    player_input = context.get("player_speech") or ""
    config       = load_user_config()

    mossy_enabled  = _is_enabled(config.get("enable_mossy_bridge", 1))
    mossy_endpoint = os.getenv(
        "F4AI_MOSSY_ENDPOINT",
        config.get("mossy_endpoint", MOSSY_DEFAULT_ENDPOINT),
    )
    request_timeout  = float(config.get("mossy_timeout", 5.0))
    plugin_enabled   = _is_enabled(config.get("enable_plugin_hooks", 0))
    plugin_endpoints = normalize_plugin_endpoints(config.get("plugin_endpoints", []))
    plugin_timeout   = float(config.get("plugin_timeout", request_timeout))

    # ── Voice input — capture player speech via microphone if enabled ──────────
    voice_input_enabled = _is_enabled(config.get("enable_voice_input", 0))
    if voice_input_enabled and not player_input:
        try:
            from stt import FalloutVoiceReceiver
            _f4ai(f"Voice mode: listening for player to speak to {npc}...")
            receiver = FalloutVoiceReceiver()
            spoken = receiver.listen_and_transcribe()
            if spoken:
                player_input = spoken
                _f4ai(f"Voice captured: '{player_input}'")
            else:
                player_input = "[Greets you silently]"
        except Exception as stt_err:
            print(f"[STT Error] {stt_err}")
            player_input = player_input or "[Greets you silently]"
    elif not player_input:
        player_input = "[Greets you silently]"

    # ── Persistent conversation history from SQLite (H:\\Mossy Memory) ─────────
    history_string = ""
    history_turns  = int(config.get("voice_history_turns", 8))
    if _is_enabled(config.get("enable_memory", 1)):
        history_string = build_history_string(npc, limit=history_turns)
        # Track last known location for this NPC
        set_npc_fact(npc, "last_seen_location", location)

    system_prompt = build_npc_system_prompt(npc, npc_race, npc_faction, location)

    if plugin_enabled and plugin_endpoints:
        pre_payload = {
            "npc_name": npc, "location": location,
            "player_speech": player_input, "history": history_string,
            "system_prompt": system_prompt,
        }
        prompt_extensions: list[str] = []
        for endpoint in plugin_endpoints:
            plugin_result = post_plugin_event(endpoint, "pre_dialogue", pre_payload, plugin_timeout)
            if not plugin_result:
                continue
            if isinstance(plugin_result.get("npc_name"), str) and plugin_result["npc_name"].strip():
                npc = plugin_result["npc_name"].strip()
            if isinstance(plugin_result.get("location"), str) and plugin_result["location"].strip():
                location = plugin_result["location"].strip()
            if isinstance(plugin_result.get("player_speech"), str) and plugin_result["player_speech"].strip():
                player_input = plugin_result["player_speech"].strip()
            if isinstance(plugin_result.get("system_prompt_append"), str) and plugin_result["system_prompt_append"].strip():
                prompt_extensions.append(plugin_result["system_prompt_append"].strip())
        if prompt_extensions:
            system_prompt = f"{system_prompt} {' '.join(prompt_extensions)}"

    full_prompt = (
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
        f"{system_prompt}\n\n{history_string}"
        "<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
        f"{player_input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    )

    raw_ai_output   = ""
    response_source = "LOCAL"

    if mossy_enabled:
        mossy_input_payload = {
            "npc_name": npc, "npc_race": npc_race,
            "location": location, "player_speech": player_input,
            "history": history_string, "system_prompt": system_prompt,
        }
        mossy_output = query_mossy_bridge(mossy_endpoint, mossy_input_payload, request_timeout)
        if mossy_output:
            raw_ai_output   = mossy_output
            response_source = "MOSSY"

    if not raw_ai_output:
        raw_ai_output   = query_local_llm(full_prompt, float(config.get("ai_temperature", 0.7)))
        response_source = "LOCAL"

    ai_response, emotion_id = process_ai_output(raw_ai_output)

    if plugin_enabled and plugin_endpoints:
        post_payload = {
            "npc_name": npc, "location": location,
            "player_speech": player_input,
            "npc_response": ai_response, "emotion_id": emotion_id,
        }
        for endpoint in plugin_endpoints:
            plugin_result = post_plugin_event(endpoint, "post_dialogue", post_payload, plugin_timeout)
            if not plugin_result:
                continue
            patched = plugin_result.get("npc_response")
            if isinstance(patched, str) and patched.strip():
                ai_response, emotion_id = process_ai_output(patched.strip())

    print(f"[{response_source}] [{npc}]: {ai_response}")
    _write_bridge_status(npc, location, player_input, ai_response, response_source)

    voice_model    = locate_installed_voice_model()
    audio_wav_path = DATA_DIR / "f4ai_voice.wav"
    if voice_model:
        cmd = [
            str(PIPER_EXE), "--model", voice_model,
            "--length_scale", str(config.get("speech_speed", 1.0)),
            "--output_file", str(audio_wav_path),
        ]
        subprocess.run(
            cmd, input=ai_response, text=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
        )
        if audio_wav_path.exists():
            normalize_audio_for_lipgen(str(audio_wav_path))
            if CK_32_EXE.exists() and check_lipgen_eligibility(npc):
                rel_wav = os.path.relpath(audio_wav_path, FALLOUT_ROOT)
                if rel_wav.startswith(".."):
                    print("[LipGen Warning] WAV path is outside Fallout root; using absolute path fallback.")
                    rel_wav = str(audio_wav_path)
                execute_headless_lipgen(rel_wav, ai_response, ck_exe=str(CK_32_EXE))

    if _is_enabled(config.get("enable_memory", 1)):
        # Persist to SQLite for long-term cross-session memory
        emotion_name = {0: "neutral", 1: "angry", 2: "sad", 3: "whisper"}.get(emotion_id, "neutral")
        save_dialogue_turn(
            npc_name=npc,
            player_line=player_input,
            npc_line=ai_response,
            location=location,
            emotion=emotion_name,
        )
        # Legacy JSON rolling window kept for backwards compat with any Papyrus readers
        update_npc_memory(npc, player_input, ai_response)

    output_payload = {
        "subtitle_text": ai_response,
        "audio_file": "F4AI/f4ai_voice.wav",
        "emotion_id": emotion_id,
        "display_duration": max(2.5, len(ai_response) / 13.0),
    }
    try:
        with OUTPUT_FILE.open("w", encoding="utf-8") as out_f:
            json.dump(output_payload, out_f)
    except OSError:
        print("[System Fault] Failed to write response payload.")

    # PushToTalkTrigger.psc reads plain text from text_out.txt — write it last
    # so Papyrus only sees the file once the full response is ready.
    try:
        TEXT_OUT_FILE.write_text(ai_response, encoding="utf-8")
    except OSError:
        print("[System Fault] Failed to write text_out.txt.")


if __name__ == "__main__":
    config = load_user_config()
    print_startup_banner(config)
    _f4ai("Bridge running — waiting for game events...")
    _f4ai(f"Game Data: {DATA_DIR}")
    _f4ai(f"Input    : {INPUT_FILE}")
    _f4ai(f"Output   : {OUTPUT_FILE}")
    _f4ai(f"Text out : {TEXT_OUT_FILE}")
    print()
    while True:
        if INPUT_FILE.exists():
            process_game_event()
        time.sleep(0.1)
