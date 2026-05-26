#!/usr/bin/env python3
"""
Mossy Local Whisper Transcription Service
==========================================
Accepts a single audio file path as a command-line argument, transcribes it
using a locally-downloaded faster-whisper model, and writes a JSON result to
stdout. The Electron main process reads that JSON and returns it to the renderer.

Usage:
    python whisper_service.py <audio_file_path>

Output (stdout, JSON):
    {"success": true, "text": "transcribed text here"}
    {"success": false, "error": "error description"}

Model: faster-whisper 'base' by default. Override with MOSSY_WHISPER_MODEL env var.
  - base:   74 MB,  good accuracy,  fast on CPU
  - small:  244 MB, better accuracy, still reasonable on CPU
  - medium: 769 MB, high accuracy,  GPU recommended
"""

import sys
import os
import json
import traceback

def transcribe(audio_path: str) -> dict:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {
            "success": False,
            "error": "faster_whisper_not_installed",
            "message": "faster-whisper is not installed. Mossy will install it on next launch."
        }

    if not os.path.exists(audio_path):
        return {"success": False, "error": "file_not_found", "message": f"Audio file not found: {audio_path}"}

    model_size = os.environ.get("MOSSY_WHISPER_MODEL", "base")

    # Use the models cache directory inside Mossy's AppData folder if set,
    # otherwise fall back to the default faster-whisper cache location.
    cache_dir = os.environ.get("MOSSY_WHISPER_CACHE_DIR", None)

    try:
        # device="cpu" works on all machines; int8 quantization keeps it fast.
        model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",
            download_root=cache_dir,
        )
    except Exception as e:
        return {"success": False, "error": "model_load_failed", "message": str(e)}

    try:
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            language=None,       # auto-detect language
            vad_filter=True,     # skip silent segments
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "success": True,
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
        }
    except Exception as e:
        return {"success": False, "error": "transcribe_failed", "message": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "no_audio_path_provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        result = transcribe(audio_path)
    except Exception as e:
        result = {
            "success": False,
            "error": "unexpected_error",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }

    print(json.dumps(result))
