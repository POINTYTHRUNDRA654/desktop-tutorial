#!/usr/bin/env python3
"""
Mossy Persistent Whisper Server
================================
Runs as a long-lived background process managed by the Electron main process.
Loads the faster-whisper model ONCE on startup, then handles unlimited
transcription requests via stdin/stdout (one JSON object per line).

Protocol
--------
Request  (stdin,  one line):  {"id": "1", "path": "/tmp/mossy_audio.webm"}
Response (stdout, one line):  {"id": "1", "success": true, "text": "...", "language": "en", "language_probability": 0.99}

Startup signal (stdout):
  {"type": "ready"}                       — model loaded, ready for requests
  {"type": "ready", "error": "..."}       — startup failed

Environment variables
---------------------
MOSSY_WHISPER_MODEL      Model size: base (default), small, medium
MOSSY_WHISPER_CACHE_DIR  Directory where model files are stored
"""

import sys
import os
import json
import traceback


def main() -> None:
    model_size = os.environ.get("MOSSY_WHISPER_MODEL", "base")
    cache_dir = os.environ.get("MOSSY_WHISPER_CACHE_DIR") or None

    # ── Load model ────────────────────────────────────────────────────────────
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        _send({"type": "ready", "error": "faster_whisper_not_installed"})
        return

    try:
        model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",
            download_root=cache_dir,
        )
    except Exception as e:
        _send({"type": "ready", "error": f"model_load_failed: {e}"})
        return

    # Signal that we are ready for requests
    _send({"type": "ready"})

    # ── Request loop ─────────────────────────────────────────────────────────
    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        req_id = "0"
        try:
            req = json.loads(raw_line)
            req_id = str(req.get("id", "0"))
            audio_path = req.get("path", "")

            if not audio_path or not os.path.exists(audio_path):
                _send({"id": req_id, "success": False, "error": "file_not_found",
                       "message": f"Audio file not found: {audio_path}"})
                continue

            segments, info = model.transcribe(
                audio_path,
                beam_size=5,
                language=None,        # auto-detect
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
            )
            # Consume generator (does the actual inference)
            text = " ".join(seg.text.strip() for seg in segments).strip()

            _send({
                "id": req_id,
                "success": True,
                "text": text,
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
            })

        except json.JSONDecodeError as e:
            _send({"id": req_id, "success": False, "error": "invalid_json",
                   "message": str(e)})
        except Exception as e:
            _send({"id": req_id, "success": False, "error": "transcribe_failed",
                   "message": str(e), "traceback": traceback.format_exc()})


def _send(obj: dict) -> None:
    """Write a JSON object to stdout and flush immediately."""
    print(json.dumps(obj), flush=True)


if __name__ == "__main__":
    main()
