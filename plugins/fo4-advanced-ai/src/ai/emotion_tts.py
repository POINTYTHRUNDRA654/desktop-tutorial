"""Emotion-tag prompt and TTS rendering helpers for offline voice pipelines."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import requests

XVASYNTH_API_URL = "http://localhost:8002/synthesize"

# Determine bundled piper path
if hasattr(sys, "_MEIPASS"):
    DATA_DIR = Path(sys.executable).resolve().parent
else:
    DATA_DIR = Path(__file__).resolve().parents[1]

PIPER_EXE = DATA_DIR / "piper.exe"


def build_emotional_system_prompt(npc_name: str, location: str, mental_state: str) -> str:
    """Build strict prompt that forces one explicit emotional tag."""
    return (
        f"You are {npc_name} in Fallout 4 exploring {location}. Your current mental state is: {mental_state}. "
        "You MUST choose exactly ONE emotional tag and prepend it to your speech. "
        "Allowed tags: [NORMAL], [ANGRY], [SAD], [WHISPER]. "
        "Do not include any other brackets or meta-text. Keep dialogue to one short sentence.\n\n"
        "Example:\n[ANGRY] Get back, you synth filth!"
    )


def parse_emotion_tag(raw_llm_output: str) -> tuple[str, str]:
    """Extract leading [TAG] and return (emotion, clean_text)."""
    match = re.match(r"^\[([A-Z]+)\]\s*(.*)", raw_llm_output)
    if not match:
        return "NORMAL", raw_llm_output.strip()
    return match.group(1), match.group(2).strip()


def render_emotional_speech_piper(
    raw_llm_output: str,
    output_wav_path: str,
    model_path: str,
) -> str:
    """Apply emotion-based Piper controls and render WAV."""
    emotion, clean_text = parse_emotion_tag(raw_llm_output)

    length_scale = 1.0
    noise_scale = 0.667

    if emotion == "ANGRY":
        length_scale = 0.85
        noise_scale = 0.85
        clean_text = f"Hey! {clean_text}!"
    elif emotion == "SAD":
        length_scale = 1.35
        noise_scale = 0.40
    elif emotion == "WHISPER":
        length_scale = 1.15
        noise_scale = 0.50

    command = [
        str(PIPER_EXE),
        "--model",
        model_path,
        "--length_scale",
        str(length_scale),
        "--noise_scale",
        str(noise_scale),
        "--output_file",
        output_wav_path,
    ]
    subprocess.run(command, input=clean_text, text=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    return clean_text


def render_emotional_speech_xvasynth(
    emotion_tag: str,
    clean_text: str,
    voice_model_id: str,
    out_path: str,
    api_url: str = XVASYNTH_API_URL,
) -> None:
    """Render speech using xVASynth native emotion sliders."""
    emotion_matrix = {"angry": 0.0, "happy": 0.0, "sad": 0.0, "surprised": 0.0}
    if emotion_tag == "ANGRY":
        emotion_matrix["angry"] = 0.85
    elif emotion_tag == "SAD":
        emotion_matrix["sad"] = 0.90

    payload = {
        "text": clean_text,
        "voice_id": voice_model_id,
        "output_path": str(Path(out_path)),
        "emotions": emotion_matrix,
        "pace": 1.0,
    }
    try:
        response = requests.post(api_url, json=payload, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"[xVASynth Error] {exc}")
