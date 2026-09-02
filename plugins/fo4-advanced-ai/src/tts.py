"""TTS and lipgen execution helpers."""

from __future__ import annotations

import subprocess

import numpy as np
import scipy.io.wavfile as wavf


def execute_headless_lipgen(
    wav_relative_path: str,
    subtitle_string: str,
    ck_exe: str = "CreationKit32.exe",
) -> None:
    """Invoke CreationKit32.exe lip generation with safe argument quoting.

    Args:
        wav_relative_path: WAV path relative to the Fallout 4 root.
        subtitle_string: Subtitle text used to sync lip animation timing.
        ck_exe: Full path to CreationKit32.exe (or bare name if on PATH).
    """
    command = [
        ck_exe,
        f"-GenerateSingleLip:{wav_relative_path}",
        subtitle_string,
    ]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    if result.returncode != 0:
        print(f"[LipGen Error] CreationKit32.exe returned code {result.returncode}.")


def check_lipgen_eligibility(npc_name: str) -> bool:
    """Bypass lip generation for non-human/mechanical companions."""
    blacklist = {"Codsworth", "Curie", "Nick Valentine", "Strong"}
    if npc_name in blacklist:
        print(f"[Vision/Lip Guard] Bypassing lip generation for actor: {npc_name}")
        return False
    return True


def normalize_audio_for_lipgen(input_wav_path: str) -> None:
    """Normalize WAV into strict 16-bit mono 16000 Hz PCM for CreationKit lip gen.

    Properly resamples from Piper's native output rate (typically 22050 Hz) to
    16000 Hz so the audio pitch and duration are correct after conversion.
    """
    from scipy.signal import resample as sp_resample

    original_rate, data = wavf.read(input_wav_path)

    # --- Convert to mono ---
    if len(data.shape) > 1:
        data = data[:, 0]

    # --- Normalise to float32 in [-1, 1] ---
    if data.dtype == np.int16:
        data_f = data.astype(np.float32) / 32767.0
    elif data.dtype == np.float32:
        data_f = data.copy()
    elif data.dtype == np.int32:
        data_f = data.astype(np.float32) / 2147483647.0
    else:
        data_f = data.astype(np.float32) / float(np.iinfo(data.dtype).max)

    # --- Resample to 16000 Hz if the source rate differs ---
    if original_rate != 16000:
        num_samples = int(round(len(data_f) * 16000 / original_rate))
        data_f = sp_resample(data_f, num_samples)

    # --- Clip and convert to int16 ---
    data_out = np.clip(data_f * 32767.0, -32768, 32767).astype(np.int16)
    wavf.write(input_wav_path, 16000, data_out)
