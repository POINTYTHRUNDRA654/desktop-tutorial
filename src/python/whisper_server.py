#!/usr/bin/env python3
"""
Mossy Persistent Whisper Server -- v2 (GPU-accelerated)
========================================================
Runs as a long-lived background process managed by the Electron main process.
Loads the faster-whisper model ONCE on startup (on GPU if available, CPU otherwise),
then handles unlimited transcription requests via stdin/stdout -- zero model-reload
overhead per clip.

Protocol
--------
Request  (stdin,  one line):  {"id": "1", "path": "/tmp/mossy_audio.webm"}
Response (stdout, one line):  {"id": "1", "success": true, "text": "...", "language": "en", "language_probability": 0.99}

Startup signals (stdout):
  {"type": "ready", "device": "cuda", "compute": "float16"}   -- GPU path
  {"type": "ready", "device": "cpu",  "compute": "int8"}      -- CPU fallback
  {"type": "ready", "error": "..."}                           -- startup failed

Environment variables
---------------------
MOSSY_WHISPER_MODEL       Model size: tiny.en | base.en | small.en | medium.en
                          (.en variants skip language-detection, loading faster)
                          Default: base.en
MOSSY_WHISPER_CACHE_DIR   Where model files are stored (optional)
MOSSY_WHISPER_LANG        Force language code, e.g. "en" (default: "en")
MOSSY_WHISPER_BEAM        Beam size: 1=greedy/fastest, 5=most accurate
                          Default: 1 (greedy is plenty for short voice clips)
MOSSY_WHISPER_DEVICE      Override: "cuda" | "cpu" | "auto" (default: auto)

GPU prerequisites (install once in your venv):
  pip install faster-whisper nvidia-cublas-cu12 nvidia-cudnn-cu12
  (ctranslate2 is pulled in automatically by faster-whisper)

Speed comparison (base model, ~3-second voice clip):
  CPU  int8   beam=5  ~2.5 s   <-- old path (whisper_service.py spawn + model load)
  CPU  int8   beam=1  ~0.8 s   <-- this server on CPU
  GPU float16 beam=1  ~0.15 s  <-- this server with NVIDIA GPU
"""

import sys
import os
import json
import traceback


def _detect_device():
    """Return ('cuda', 'float16') when CUDA GPU available, else ('cpu', 'int8')."""
    override = os.environ.get("MOSSY_WHISPER_DEVICE", "auto").strip().lower()
    if override == "cpu":
        return "cpu", "int8"
    if override == "cuda":
        return "cuda", "float16"

    try:
        import ctranslate2
        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass

    return "cpu", "int8"


def main() -> None:
    model_size = os.environ.get("MOSSY_WHISPER_MODEL", "base.en").strip()
    cache_dir  = os.environ.get("MOSSY_WHISPER_CACHE_DIR") or None
    lang       = os.environ.get("MOSSY_WHISPER_LANG", "en").strip() or None
    beam_size  = int(os.environ.get("MOSSY_WHISPER_BEAM", "1"))

    # -- Import faster-whisper ------------------------------------------------
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        _send({"type": "ready", "error": "faster_whisper_not_installed",
               "hint": "pip install faster-whisper nvidia-cublas-cu12 nvidia-cudnn-cu12"})
        return

    # -- Auto-detect device ---------------------------------------------------
    device, compute_type = _detect_device()

    # -- Load model -----------------------------------------------------------
    try:
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=cache_dir,
            cpu_threads=0 if device == "cuda" else max(4, os.cpu_count() or 4),
            num_workers=1,
        )
    except Exception as e:
        if device == "cuda":
            # GPU load failed -- fall back to CPU automatically
            try:
                device, compute_type = "cpu", "int8"
                model = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    download_root=cache_dir,
                    cpu_threads=max(4, os.cpu_count() or 4),
                    num_workers=1,
                )
            except Exception as e2:
                _send({"type": "ready", "error": "model_load_failed: " + str(e2)})
                return
        else:
            _send({"type": "ready", "error": "model_load_failed: " + str(e)})
            return

    # Signal ready
    _send({"type": "ready", "device": device, "compute": compute_type,
           "model": model_size, "beam": beam_size})

    # -- Request loop ---------------------------------------------------------
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
                       "message": "Audio file not found: " + audio_path})
                continue

            req_lang = req.get("language", lang)
            req_beam = int(req.get("beam", beam_size))

            segments, info = model.transcribe(
                audio_path,
                beam_size=req_beam,
                language=req_lang,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=300,
                    speech_pad_ms=200,
                ),
                condition_on_previous_text=False,
                without_timestamps=True,
                word_timestamps=False,
            )

            text = " ".join(seg.text.strip() for seg in segments).strip()

            _send({
                "id": req_id,
                "success": True,
                "text": text,
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "device": device,
            })

        except json.JSONDecodeError as e:
            _send({"id": req_id, "success": False, "error": "invalid_json", "message": str(e)})
        except Exception as e:
            _send({"id": req_id, "success": False, "error": "transcribe_failed",
                   "message": str(e), "traceback": traceback.format_exc()})


def _send(obj: dict) -> None:
    print(json.dumps(obj), flush=True)


if __name__ == "__main__":
    main()
