# -*- coding: utf-8 -*-
import os, ctypes, tempfile
import numpy as np
import sounddevice as sd, soundfile as sf
from faster_whisper import WhisperModel
from ollama import Client
import pyttsx3

# ---------- Mossy FO4 Modding Personality ----------
MOD_SYSTEM_PROMPT = """You are Mossy, a hands-on Fallout 4 modding assistant.
Context:
- User mods Fallout 4 with Mod Organizer 2 (MO2).
- Primary tools: FO4Edit (xEdit), Creation Kit, Blender 4.5, NifSkope, GIMP 3.0.4, Upscayl, NVIDIA Texture Tools Exporter 2024.1.1, Materializer, ShaderMap 4, Photopea, KREA.
- File formats: NIF, DDS, BA2, BGSM/BGEM, ESP/ESM/ESL, INI/JSON configs.
- Common tasks: creating textures (BC1/BC7, glow maps, parallax), mesh edits (collision, vertex colors, decimation), conflict resolution in FO4Edit, quest/dialogue setup in CK, packaging mods for Nexus.

Behavior:
- Always give step-by-step, Fallout 4–specific instructions.
- Use exact menu paths, settings, or checkbox names from these tools when possible.
- If the user hits an error, explain likely causes and fixes in plain terms.
- Keep answers pragmatic and modder-focused, not generic.
- When tools overlap, recommend the one most stable for FO4 workflows.
- Assume the user learns best by seeing and doing; be detailed but not fluffy.
"""

# ---------- Local project / skills ----------
PROJECT_ROOT = r"G:\Users\billy\AppData\Local\ModOrganizer\Fallout 4\mods\Fallout 4 Moss AIO Glowing Sea Now Glows Redux"
TODO_PATH    = os.path.join(PROJECT_ROOT, "MOSSY_TODO.md")

def skill_search(term, exts=(
    ".psc",".pex",".ini",".toml",".json",".txt",".log",".xml",".yaml",".cfg",
    ".bat",".py",".cs",".cpp",".h",".dds",".nif",".bgsm",".bgem",".esp",".esm",".esl"
)):
    term_l = (term or "").lower().strip()
    if not term_l:
        return "Give me a search term, e.g., 'mossy search papyrus'."
    hits = []
    for root, _, files in os.walk(PROJECT_ROOT):
        for f in files:
            if f.lower().endswith(exts):
                p = os.path.join(root, f)
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                        if term_l in fh.read().lower():
                            hits.append(p)
                except Exception:
                    pass
                if len(hits) >= 50:
                    return "Found {} matches (showing first 50):\n{}".format(len(hits), "\n".join(hits[:50]))
    return "No matches found." if not hits else "\n".join(hits[:50])

def skill_explain_file(path):
    path = (path or "").strip().strip('"')
    if not path or not os.path.exists(path):
        return f"File not found: {path}"
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            content = fh.read()
    except Exception as e:
        return f"Couldn't read file: {e}"
    prompt = (
        "Explain this file to a Fallout 4 modder: what it does, important parts, and how to safely modify it. "
        "If it's config, note key options; if it's script, outline logic.\n\n---\n" + content[:12000]
    )
    return ask_ollama(prompt)

def skill_grep_logs(pattern, log_dir=os.path.join(os.path.expandvars("%USERPROFILE%"), r"Documents\My Games\Fallout4\Logs\Script")):
    patt = (pattern or "").strip()
    if not patt:
        return "Give me a pattern, e.g., 'mossy grep missing master'."
    out = []
    for root, _, files in os.walk(log_dir):
        for f in files:
            if f.lower().endswith((".log",".txt")):
                p = os.path.join(root, f)
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                        lines = fh.readlines()
                    for i, line in enumerate(lines):
                        if patt.lower() in line.lower():
                            snippet = "".join(lines[max(0,i-2):i+3])
                            out.append((p, i+1, snippet))
                except Exception:
                    pass
                if len(out) >= 20:
                    break
    if not out:
        return f"No log lines matching '{patt}'."
    show = []
    for p, lineno, snippet in out[:5]:
        show.append(f"{p}:{lineno}\n{snippet}\n---")
    return "\n".join(show)

def skill_add_todo(text):
    item = (text or "").strip()
    if not item:
        return "Give me a todo item, e.g., 'mossy todo convert textures to BC7'."
    os.makedirs(PROJECT_ROOT, exist_ok=True)
    with open(TODO_PATH, "a", encoding="utf-8") as fh:
        fh.write(f"- [ ] {item}\n")
    return f"Added to TODO: {item}"

# ---- FO4 quickstart guides ----
def guide_pack_ba2_bc7():
    return (
        "Pack Textures as BA2 (BC7 recommended):\n"
        "1) Prepare textures:\n"
        "   • Albedo/diffuse: BC1/BC7 (BC7 preferred)   • Normal: BC5  • Masks/ORM: BC7 or BC4 (single channel)\n"
        "   • Mipmaps: generate for every DDS. Power-of-two sizes.\n"
        "2) NVIDIA Texture Tools Exporter 2024.1.1:\n"
        "   • Albedo: BC7 Fine (sRGB); Normal: BC5 Normal Map (UNORM); Glow: BC7 (sRGB) or BC4 for single channel.\n"
        "   • Generate Mipmaps; save .dds\n"
        "3) BGSM/BGEM: set texture paths; for glow enable Emissive + set Color/Mult; link glow map.\n"
        "4) Pack BA2 (Archive2): New → Add Folder (Textures). Format = General. Save as <Plugin> - Textures.ba2.\n"
        "5) Place BA2 alongside plugin in MO2; prefer BA2 over loose for perf.\n"
        "6) Test in-game; if shimmer, try BC7 Fine or re-bake normals as BC5.\n"
    )

def guide_fo4edit_conflicts():
    return (
        "FO4Edit Conflict Resolution:\n"
        "1) Load Fallout4.esm + DLC + target mods only.\n"
        "2) Right-click tree → Apply Filter for Conflicts.\n"
        "3) Red/Yellow = conflicts. Inspect right pane per-plugin values.\n"
        "4) Make a personal patch (ESL-flag if <2k records). Copy as override → your patch.\n"
        "5) Forward sensible winners; avoid touching Cells/Navmesh/Precombines unless you know PRP implications.\n"
        "6) Check for Errors; fix obvious issues. Do NOT auto-clean game ESMs.\n"
        "7) Put your patch late so it wins non-worldspace conflicts.\n"
    )

def guide_prp():
    return (
        "PRP Compatibility:\n"
        "• Keep plugin ESL-flagged when possible (compact early).\n"
        "• Forward PRP records where you touch same cells.\n"
        "• Prefer disabling/moving refs over deleting.\n"
        "• If geometry changes, rebuild precombines/previs for affected cells.\n"
        "• Test for flicker/popin/occlusion issues.\n"
    )

def guide_bgsm_quick():
    return (
        "BGSM Quick:\n"
        "• Diffuse (sRGB), Normal (BC5/UNORM), Glow (sRGB if colored).\n"
        "• Enable Emissive; set Color/Mult.\n"
        "• For alpha: choose Test/Blend + Threshold; ensure correct flags.\n"
    )

def guide_nif_collision():
    return (
        "NIF Collision (FO4):\n"
        "• BSXFlags exists with Collision enabled.\n"
        "• bhkCollisionObject/bhkRigidBody/bhkShape chain is present + bound.\n"
        "• Layers: STATIC vs CLUTTER/WEAPON etc.\n"
        "• Recalc bounds, apply transforms, save. Test in CK (F4) + in-game.\n"
    )

def guide_ck_quest():
    return (
        "CK Quest/Dialogue Skeleton:\n"
        "• Data → load plugin + masters.\n"
        "• Character → Quests → New (ID, Start Game Enabled if needed).\n"
        "• Add stages (0/10/20), log entries.\n"
        "• Make Dialogue Branch → Topic → Info lines + Conditions.\n"
        "• Create Reference Aliases; attach Papyrus; fill properties.\n"
        "• Test with startquest/setstage; watch Papyrus logs.\n"
    )

def guide_help():
    return (
        "Mossy Commands:\n"
        "• mossy pack ba2 / mossy pack textures\n"
        "• mossy fo4edit conflicts\n"
        "• mossy prp guide\n"
        "• mossy bgsm guide\n"
        "• mossy nif collision\n"
        "• mossy ck quest\n"
        "• mossy search <term>\n"
        "• mossy explain <full\\path\\file>\n"
        "• mossy grep <pattern>\n"
        "• mossy todo <text>\n"
    )

def handle_skill(text: str):
    t = (text or '').strip()
    tl = t.lower()

    # Help menu
    if tl in ('mossy help','help','mossy commands','mossy ?'):
        return guide_help()

    # FO4 quickstart guides
    if tl.startswith(('mossy pack ba2','mossy pack textures','pack ba2','pack textures')):
        return guide_pack_ba2_bc7()
    if tl.startswith(('mossy fo4edit conflicts','fo4edit conflicts','xedit conflicts')):
        return guide_fo4edit_conflicts()
    if tl.startswith(('mossy prp guide','prp guide','prp ')) or ' prp' in tl:
        return guide_prp()
    if tl.startswith(('mossy bgsm guide','bgsm guide')):
        return guide_bgsm_quick()
    if tl.startswith(('mossy nif collision','nif collision','collision check')):
        return guide_nif_collision()
    if tl.startswith(('mossy ck quest','ck quest','quest skeleton')):
        return guide_ck_quest()

    # Existing FO4 hints
    if tl.startswith(("mossy bgsm ", "bgsm ")):
        path = t.split(" ", 1)[1] if " " in t else ""
        return ("Open {} in Material Editor/BGSM tool. Verify texture paths, set Alpha/Glow flags, "
                "and ensure BC7 for the linked DDS where appropriate.").format(path)
    if ' prp' in tl or tl.startswith('prp '):
        return ("PRP: keep edits ESL where possible; forward PRP records in FO4Edit; avoid deleting refs; "
                "if cells change, rebuild precomb/previs; test for flicker/occlusion.")

    # Generic skills
    if tl.startswith(("mossy search ", "search ")):
        term = t.split(" ", 1)[1] if " " in t else ""
        return skill_search(term)
    if tl.startswith(("mossy explain ", "explain ")):
        path = t.split(" ", 1)[1] if " " in t else ""
        return skill_explain_file(path)
    if tl.startswith(("mossy grep ", "grep ")):
        pattern = t.split(" ", 1)[1] if " " in t else ""
        return skill_grep_logs(pattern)
    if tl.startswith(("mossy todo ", "todo ")):
        item = t.split(" ", 1)[1] if " " in t else ""
        return skill_add_todo(item)

    return None

# ---------- DLL search paths (known-working on your box) ----------
for p in (
    r"C:\Users\billy\.ai-navigator\conda\envs\navigator\Library\bin",
    r"C:\Program Files\NVIDIA\CUDNN\v9.13\bin\12.9",
    r"C:\Program Files\NVIDIA\CUDNN\v9.13\bin\13.0",
):
    try:
        os.add_dll_directory(p)
    except Exception:
        pass

def _try_load(path):
    if os.path.exists(path):
        try:
            ctypes.WinDLL(path)
            print("Loaded:", path)
        except Exception as e:
            print("Failed:", path, "->", e)

# Optional diagnostics
for name in ["cudart64_12.dll","cublasLt64_12.dll","cublas64_12.dll","nvrtc64_120_0.dll","nvJitLink64_12.dll"]:
    _try_load(os.path.join(r"C:\Users\billy\.ai-navigator\conda\envs\navigator\Library\bin", name))
for name in [
    "cudnn64_9.dll","cudnn_ops64_9.dll","cudnn_cnn64_9.dll","cudnn_adv64_9.dll",
    "cudnn_graph64_9.dll","cudnn_heuristic64_9.dll",
    "cudnn_engines_precompiled64_9.dll","cudnn_engines_runtime_compiled64_9.dll",
]:
    _try_load(os.path.join(r"C:\Program Files\NVIDIA\CUDNN\v9.13\bin\12.9", name))

# ---------- Whisper (CUDA -> CPU fallback) ----------
try:
    whisper_model = WhisperModel("small", device="cuda", compute_type="float16")
    print("Whisper loaded on CUDA")
except Exception as e:
    print("Falling back to CPU:", e)
    whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

# ---------- Ollama + TTS ----------
ollama = Client(host="http://localhost:11434")
tts = pyttsx3.init()
tts.setProperty("rate", 170)

# ---------- Audio input selection ----------
DEFAULT_SECONDS = 12

def pick_working_input():
    devs = sd.query_devices()
    apis = sd.query_hostapis()
    def api_name(d): return apis[d["hostapi"]]["name"]
    candidates = []
    for i, d in enumerate(devs):
        if d["max_input_channels"] <= 0:
            continue
        name = d["name"].lower()
        host = api_name(d).lower()
        score = 0
        if "jounivo" in name: score += 5
        if "mic" in name or "microphone" in name: score += 3
        if "wasapi" in host: score += 5
        elif "directsound" in host: score += 2
        elif "mme" in host: score += 1
        for r in (48000, 44100, 32000, 22050, 16000):
            try:
                sd.check_input_settings(device=i, samplerate=r, channels=1)
                candidates.append((score, i, apis[d["hostapi"]]["name"], r))
            except Exception:
                pass
    if not candidates:
        print("No input device found; defaulting to system default.")
        return None, 16000
    candidates.sort(key=lambda x: (x[0], x[3]), reverse=True)
    _, idx, host, rate = candidates[0]
    print(f"Selected input device {idx} via {host} @ native {rate} Hz")
    return idx, rate

INPUT_DEVICE, PICKED_RATE = pick_working_input()

def _resample_to_16k(x, sr):
    target = 16000
    if sr == target or x.size == 0:
        return x.astype("float32"), target
    n_src = x.shape[0]
    n_dst = int(round(n_src * (target / float(sr))))
    if n_dst <= 1:
        return x.astype("float32"), target
    src_idx = np.linspace(0, n_src - 1, num=n_dst, dtype=np.float64)
    left = np.floor(src_idx).astype(int)
    right = np.minimum(left + 1, n_src - 1)
    frac = src_idx - left
    y = (1.0 - frac) * x[left, 0] + frac * x[right, 0]
    return y.reshape(-1, 1).astype("float32"), target

def record_wav(duration=DEFAULT_SECONDS, device_index=None):
    native_rate = PICKED_RATE
    if device_index is None:
        device_index = INPUT_DEVICE
    if device_index is not None:
        sd.default.device = (device_index, None)

    print(f"Recording {duration}s @ native {native_rate}Hz; device={sd.default.device}")
    audio = sd.rec(int(duration * native_rate), samplerate=native_rate, channels=1, dtype="float32")
    sd.wait()

    if audio is None or audio.size == 0:
        print("WARN: captured zero samples")
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        sf.write(tmp, np.zeros((1,1), dtype="float32"), 16000)
        return tmp, 0.0, 0.0

    peak = float(np.max(np.abs(audio)))
    rms  = float(np.sqrt(np.mean(audio**2)))
    target_rms = 0.08
    if 0 < rms < target_rms:
        gain = min(4.0, target_rms / rms)
        audio = (audio * gain).clip(-1.0, 1.0)
        peak = float(np.max(np.abs(audio)))
        rms  = float(np.sqrt(np.mean(audio**2)))
        print(f"Auto-gain applied (x{gain:.2f}) — new peak={peak:.4f}, rms={rms:.4f}")
    else:
        print(f"Audio level — peak={peak:.4f}, rms={rms:.4f}")

    audio16, sr16 = _resample_to_16k(audio, native_rate)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    sf.write(tmp, audio16, sr16)
    print(f"Saved wav: {tmp} (sr={sr16})")
    return tmp, peak, rms

# ---------- Accurate transcription + permissive fallback ----------
def transcribe(path):
    try:
        _info = sf.info(path)
        print(f"DEBUG: wav sr={_info.samplerate}, ch={_info.channels}, dur={_info.frames / max(_info.samplerate,1):.2f}s")
    except Exception as _e:
        print("DEBUG: couldn't read wav info:", _e)

    # Pass A — accurate (beam + VAD)
    try:
        segments, info = whisper_model.transcribe(
            path,
            task="transcribe",
            language=None,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=200),
            beam_size=5, best_of=5,
            patience=1.0, length_penalty=1.0,
            no_speech_threshold=0.5,
            log_prob_threshold=-1.2,
            compression_ratio_threshold=2.4,
            condition_on_previous_text=True,
            without_timestamps=True,
        )
        partsA = [getattr(s, "text", "").strip() for s in segments if getattr(s, "text", "").strip()]
        textA = " ".join(partsA).strip()
    except Exception as e:
        print("DEBUG: pass A failed:", e)
        textA, info, partsA = "", None, []

    if textA:
        print(f"DEBUG: segments(A)={len(partsA)}")
        return textA, getattr(info, "language", "en")

    # Pass B — permissive (no VAD, looser thresholds)
    print("DEBUG: empty result on pass A; retrying with permissive settings…")
    segments, info = whisper_model.transcribe(
        path,
        task="transcribe",
        language="en",
        vad_filter=False,
        beam_size=1, best_of=1,
        temperature=0.2,
        no_speech_threshold=0.7,
        log_prob_threshold=-2.5,
        compression_ratio_threshold=2.6,
        condition_on_previous_text=False,
        without_timestamps=True,
    )
    partsB = [getattr(s, "text", "").strip() for s in segments if getattr(s, "text", "").strip()]
    textB = " ".join(partsB).strip()
    print(f"DEBUG: segments(B)={len(partsB)}")
    return textB, getattr(info, "language", "en") if info else ("", "en")

# ---------- Robust Ollama response extraction ----------
def ask_ollama(prompt, model="llama3"):
    messages = [
        {"role": "system", "content": MOD_SYSTEM_PROMPT},
        {"role": "user",   "content": prompt},
    ]
    resp = ollama.chat(model=model, messages=messages)

    if isinstance(resp, dict):
        msg = resp.get("message") or {}
        if isinstance(msg, dict) and "content" in msg:
            return msg["content"]
        for k in ("output","response","text","content"):
            if k in resp:
                return resp[k]
        if "messages" in resp and resp["messages"]:
            maybe = resp["messages"][-1]
            if isinstance(maybe, dict) and "content" in maybe:
                return maybe["content"]
        return str(resp)

    try:
        msg = getattr(resp, "message", None)
        if msg is not None:
            content = getattr(msg, "content", None)
            if isinstance(content, str):
                return content
    except Exception:
        pass

    if isinstance(resp, str):
        return resp
    return str(resp)

def speak(text):
    print("Mossy:", text)
    tts.say(text)
    tts.runAndWait()

# ---------- Main loop ----------
def main():
    print("Press Enter to talk (12s), or type 'q' to quit.")
    while True:
        cmd = input("> ").strip().lower()
        if cmd == "q":
            break
        wav, peak, rms = record_wav()
        if peak < 0.01 and rms < 0.002:
            print("I heard almost nothing — check mic or speak closer/louder.")
        text, lang = transcribe(wav)
        print("You said:", text)

        # 1) Try FO4 skills first
        skill_reply = handle_skill(text)
        if skill_reply:
            speak(skill_reply)
            continue

        # 2) Otherwise chat via Ollama
        if not text:
            speak("I didn't catch that. Try again.")
            continue
        reply = ask_ollama(text, model="llama3")
        speak(reply)

if __name__ == "__main__":
    main()

