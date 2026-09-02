"""Local microphone speech-to-text pipeline using faster-whisper."""

from __future__ import annotations

import io
import wave

import numpy as np
import speech_recognition as sr
from faster_whisper import WhisperModel


class FalloutVoiceReceiver:
    """Captures microphone audio and transcribes to text."""

    def __init__(self) -> None:
        print("[STT Engine] Initializing Faster-Whisper Model...")
        self.model = WhisperModel("base.en", device="cpu", compute_type="int8")
        print("[STT Engine] Calibrating microphone peripherals...")
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = False
        self.recognizer.pause_threshold = 1.2

    def listen_and_transcribe(self) -> str:
        """Capture one phrase and return flat transcribed text."""
        with sr.Microphone(sample_rate=16000) as source:
            print("\n🎤 [Microphone Active] Speak your line to the NPC...")
            try:
                audio_data = self.recognizer.listen(source, timeout=10, phrase_time_limit=15)
                print("[STT Engine] Processing audio data capture...")

                raw_audio_bytes = audio_data.get_raw_data(convert_rate=16000, convert_width=2)
                filtered_bytes = apply_acoustic_noise_gate(raw_audio_bytes)

                wav_stream = io.BytesIO()
                with wave.open(wav_stream, "wb") as wav_writer:
                    wav_writer.setnchannels(1)
                    wav_writer.setsampwidth(2)
                    wav_writer.setframerate(16000)
                    wav_writer.writeframes(filtered_bytes)
                wav_stream.seek(0)

                segments, _ = self.model.transcribe(wav_stream, beam_size=3, language="en")
                transcribed_text = " ".join(segment.text for segment in segments).strip()
                print(f"👉 [Transcribed Voice]: '{transcribed_text}'")
                return transcribed_text
            except sr.WaitTimeoutError:
                print("[STT Engine Warning] Player did not say anything.")
                return ""
            except (RuntimeError, OSError, ValueError) as exc:
                print(f"[STT Engine Error] Critical loop fault: {exc}")
                return ""


def apply_acoustic_noise_gate(wav_bytes_data: bytes) -> bytes:
    """
    Zero low-energy noise and clamp non-speech spikes before Whisper inference.
    """
    audio_data = np.frombuffer(wav_bytes_data, dtype=np.int16).copy()

    noise_floor = 500
    audio_data[np.abs(audio_data) < noise_floor] = 0

    max_speech_volume = 28000
    audio_data = np.clip(audio_data, -max_speech_volume, max_speech_volume)

    return audio_data.astype(np.int16).tobytes()
