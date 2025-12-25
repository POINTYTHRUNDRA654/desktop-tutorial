# -*- coding: utf-8 -*-
import os

# Point to CUDA 12 runtime (from your navigator conda env) + cuDNN 9.13 bin
os.add_dll_directory(r"C:\Users\billy\.ai-navigator\conda\envs\navigator\Library\bin")
os.add_dll_directory(r"C:\Program Files\NVIDIA\CUDNN\v9.13\bin\12.9")
import sounddevice as sd, numpy as np, tempfile, soundfile as sf
from faster_whisper import WhisperModel

RATE, DURATION = 16000, 5
print("Speak for 5 seconds...")
audio = sd.rec(int(DURATION*RATE), samplerate=RATE, channels=1, dtype="float32")
sd.wait()

tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
sf.write(tmp, audio, RATE)
print("Saved:", tmp)

model = WhisperModel("small", device="cuda", compute_type="float16")
segments, info = model.transcribe(tmp, beam_size=1, vad_filter=True)
print("Detected language:", info.language)
print("---- Transcript ----")
for s in segments:
    print(f"[{s.start:.2f}->{s.end:.2f}] {s.text}")
