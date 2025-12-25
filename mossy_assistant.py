
"""
Mossy Assistant (v2) — Fallout 4 Modding Specialist
- Text chat mode (default)
- Voice mode: python mossy_assistant.py --voice
- Tool launching via a TOOLS dict (paths you control)
- Optional OpenAI cloud replies if OPENAI_API_KEY is set in .env
- Text-to-Speech via pyttsx3 (female voice if available)

Folder layout (recommended):
D:\MossyAssistant\
  mossy_assistant.py
  .env
  venv\

.env example:
OPENAI_API_KEY=YOUR_KEY_HERE
MOSSY_BRIDGE_TOKEN=some_long_random_string_12345
"""

import os
import subprocess
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# =============================================================================
# OPTIONAL OPENAI IMPORT (CLOUD CHAT)
# =============================================================================
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # handled gracefully


# =============================================================================
# CONFIG: UPDATE PATHS HERE WHEN YOU INSTALL / MOVE PROGRAMS
# =============================================================================
TOOLS = {
    "blender_4_5": r"D:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
    "blender_folder": r"D:\Blender Foundation",
    "mo2": r"G:\Mod.Organizer-2.5.2\ModOrganizer.exe",
    "cao": r"G:\Cathedral Assets Optimizer\Cathedral Assets Optimizer.exe",
    "materialize": r"H:\Materialize_1.78\Materialize.exe",
    "shadermap": r"D:\ShaderMap 4\ShaderMap.exe",
    "nvidia_texture_tools": r"C:\Program Files\NVIDIA Corporation\NVIDIA Texture Tools",
    "nifutils": r"G:\Tools\NifUtilsSuite-master",
    "steam": r"G:\Steam\steam.exe",
    "upscayl": r"C:\Program Files\Upscayl\Upscayl.exe",
    "gimp3": r"C:\Users\billy\AppData\Local\Programs\GIMP 3\bin\gimp-3.exe",
    "omniverse_launcher": r"C:\Users\billy\AppData\Local\Programs\omniverse-launcher",
    "rtx_remix": r"C:\Users\billy\AppData\Local\NVIDIA\RTXRemix",
    "nvidia_canvas": r"C:\Program Files\NVIDIA Corporation\NVIDIA Canvas\Canvas.exe",
    "actorcore_rig": r"D:\ActorCore\ActorCore AccuRIG.exe",
    "amuse": r"D:\Program Files\Amuse\Amuse.exe",
    "ai_navigator": r"C:\Users\billy\AppData\Local\Programs\ai-navigator\AI-Navigator.exe",
    "fbx_converter": r"D:\Program Files\Autodesk\FBX\FBX Converter\2013.3\FBXConverterUI.exe",
    "github_desktop": r"C:\Users\billy\AppData\Local\GitHubDesktop\GitHubDesktop.exe",
    "fo4_work_root": r"H:\FO4 WORKING FLODER",
    # Optional roots you mentioned before (add only if you want voice commands for them):
    # "my_textures_root": r"H:\MY TEXTURES",
    # "meshes_root": r"I:\meshes",
}

# Local model file (not used yet in this file; placeholder for later)
LOCAL_MODEL_PATH = r"D:\MossyModels\Meta-Llama-3-8B-Instruct-Q4_K_M.gguf"

# Cloud model
OPENAI_MODEL = "gpt-4.1-mini"


# =============================================================================
# SYSTEM PROMPT — MOSSY'S ROLE
# =============================================================================
SYSTEM_PROMPT = """
You are Mossy — Billy's personal Fallout 4 modding specialist AI assistant on Windows.

Primary responsibilities:
1. Fallout 4 / Creation Kit pipeline:
   - worldspace, statics, references, navmesh, VIS/PRP implications.
2. Blender → NIF workflows:
   - import/export, vertex counts, normals, materials, collision meshes.
3. Collision / Havok:
   - bhkRigidBody, bhkNPCollisionObject, bhkNiTriStripsShape,
     correct linking, common crash causes in Fallout 4.
4. NifSkope:
   - block trees, shapes, collision, shader properties, texture paths.
5. Textures & optimization:
   - correct formats (BC1/BC3/BC7, BC5 for normals, etc.), resolution,
     performance considerations, packing into BA2.
6. Toolchain integration:
   - Mod Organizer 2, Cathedral Assets Optimizer, ShaderMap, Materialize,
     GIMP, Upscayl, NVIDIA tools.

Your goals:
- Detect missing or dangerous steps when Billy describes his workflow.
- Suggest safer, correct Fallout 4–compatible methods.
- Explain *why* something crashes (Creation Kit, game, NifSkope warnings).
- Keep answers practical, step-by-step, and not overly wordy.

When Billy asks to open or check a tool, try to use the launcher tools,
and clearly tell him what you’re doing.
"""


# =============================================================================
# ENV + OPENAI CLIENT (OPTIONAL)
# =============================================================================
def build_openai_client() -> Optional["OpenAI"]:
    load_dotenv()  # loads .env from current folder (or standard search)
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    return OpenAI(api_key=api_key)


client = build_openai_client()


def ask_cloud(messages) -> str:
    if client is None:
        return (
            "Cloud model is not configured (no OPENAI_API_KEY or openai package). "
            "I can still run local tools and help with setup, but I cannot call the OpenAI API right now."
        )
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


# =============================================================================
# TEXT-TO-SPEECH (TTS)
# =============================================================================
import pyttsx3

VOICE_ENABLED = True

_tts_engine = pyttsx3.init()
voices = _tts_engine.getProperty("voices")

# Try to choose a female voice on Windows (often "Zira")
for v in voices:
    name = (getattr(v, "name", "") or "").lower()
    if "zira" in name or "female" in name:
        _tts_engine.setProperty("voice", v.id)
        break

_tts_engine.setProperty("rate", 185)
_tts_engine.setProperty("volume", 1.0)


def speak(text: str) -> None:
    if not VOICE_ENABLED or not text:
        return
    try:
        _tts_engine.say(text)
        _tts_engine.runAndWait()
    except Exception as e:
        print(f"[TTS error] {e}")


# =============================================================================
# HEALTH CHECK
# =============================================================================
def health_check() -> str:
    lines = []
    lines.append("=== MOSSY HEALTH CHECK ===")

    api_ok = bool(os.getenv("OPENAI_API_KEY"))
    token_ok = bool(os.getenv("MOSSY_BRIDGE_TOKEN"))
    lines.append(f"OPENAI_API_KEY: {'OK' if api_ok else 'MISSING'}")
    lines.append(f"MOSSY_BRIDGE_TOKEN: {'OK' if token_ok else 'MISSING'}")

    try:
        import sys

        lines.append(f"Python: {sys.executable}")
    except Exception:
        pass

    missing = 0
    folder_ok = 0
    exe_ok = 0

    for key, path in TOOLS.items():
        p = Path(path)
        if p.exists():
            if p.is_dir():
                folder_ok += 1
                lines.append(f"✅ {key}: folder OK -> {p}")
            else:
                exe_ok += 1
                lines.append(f"✅ {key}: file OK   -> {p}")
        else:
            missing += 1
            lines.append(f"❌ {key}: MISSING   -> {p}")

    lines.append("")
    lines.append(f"Summary: {exe_ok} files OK, {folder_ok} folders OK, {missing} missing.")
    lines.append("=== END HEALTH CHECK ===")
    return "\n".join(lines)


# =============================================================================
# TOOL LAUNCHING
# =============================================================================
def launch_tool(key: str) -> str:
    path = TOOLS.get(key)
    if not path:
        return f"❌ I don't have a path configured for '{key}'."

    p = Path(path)

    # Folders open in Explorer
    if p.exists() and p.is_dir():
        if os.name == "nt":
            os.startfile(str(p))
            return f"✅ Opened folder: {p}"
        return f"❌ '{p}' is a directory; cannot open on this OS."

    # Executables must exist
    if not p.exists():
        return f"❌ Path for '{key}' does not exist:\n{p}"

    try:
        subprocess.Popen(str(p), shell=True)
        return f"✅ Launching {key}: {p}"
    except Exception as e:
        return f"❌ Failed to launch '{key}': {e}"


def tools_router(text: str) -> Optional[str]:
    t = text.lower().strip()

    # Health check
    if "health check" in t or "check tools" in t or "tool check" in t:
        return health_check()

    # Mod Organizer 2 variants (voice-friendly)
    if (
        "open mo2" in t
        or "open m o 2" in t
        or "run mo2" in t
        or "run moe 2" in t
        or "open mod organizer" in t
        or "open mod organiser" in t
        or "open up mod" in t
        or "open my mods" in t
        or "launch mo2" in t
        or "start mo2" in t
    ):
        return launch_tool("mo2")

    # Blender
    if "open blender" in t or "start blender" in t or "launch blender" in t:
        return launch_tool("blender_4_5")

    # CAO
    if "open cao" in t or "cathedral assets optimizer" in t:
        return launch_tool("cao")

    # Materialize
    if "open materialize" in t or "start materialize" in t:
        return launch_tool("materialize")

    # ShaderMap
    if "open shadermap" in t or "start shadermap" in t:
        return launch_tool("shadermap")

    # Steam
    if "open steam" in t or "start steam" in t:
        return launch_tool("steam")

    # GIMP
    if "open gimp" in t or "start gimp" in t:
        return launch_tool("gimp3")

    # NVIDIA Canvas
    if "open canvas" in t or "nvidia canvas" in t:
        return launch_tool("nvidia_canvas")

    # ActorCore AccuRIG
    if "open actorcore" in t or "open accurig" in t or "accurig" in t:
        return launch_tool("actorcore_rig")

    # AI Navigator
    if "open ai navigator" in t or "start ai navigator" in t:
        return launch_tool("ai_navigator")

    # GitHub Desktop
    if "open github" in t or "open github desktop" in t:
        return launch_tool("github_desktop")

    # FO4 working folder
    if "open fo4 work" in t or "open fallout working folder" in t or "open fo4 working folder" in t:
        return launch_tool("fo4_work_root")

    # Optional roots if you enable them in TOOLS
    if "open my textures" in t:
        return launch_tool("my_textures_root")
    if "open meshes" in t:
        return launch_tool("meshes_root")

    return None


# =============================================================================
# VOICE MODE
# =============================================================================
def voice_main() -> None:
    """
    Voice-driven mode for Mossy.
    Listens on the default microphone, turns speech into text,
    routes to tools / AI, prints responses, and speaks via TTS.
    """
    import speech_recognition as sr

    print("\n=== MOSSY VOICE MODE ===")
    print("Say 'Mossy stop' to exit voice mode.\n")

    chat = [{"role": "system", "content": SYSTEM_PROMPT}]

    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    while True:
        try:
            print("Listening... (speak now)")
            with mic as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = recognizer.listen(source, phrase_time_limit=8)

            try:
                text = recognizer.recognize_google(audio)
            except sr.UnknownValueError:
                print("Mossy: I didn’t catch that, please repeat.")
                continue
            except sr.RequestError as e:
                msg = f"Mossy: Speech recognition error: {e}"
                print(msg)
                speak(msg)
                continue

            print(f"You (voice): {text}")

            lower = text.lower().strip()
            if lower in {"mossy stop", "stop listening", "exit", "quit"}:
                print("Mossy: Voice session ended.")
                speak("Voice session ended.")
                break

            # Tools first (IMPORTANT)
            tool_result = tools_router(text)
            if tool_result:
                print("Mossy (tool):", tool_result)
                speak(tool_result)
                continue  # do not call cloud AI for tool commands

            # Otherwise: cloud chat
            chat.append({"role": "user", "content": text})
            reply = ask_cloud(chat)
            chat.append({"role": "assistant", "content": reply})

            print("Mossy:", reply, "\n")
            speak(reply)

        except KeyboardInterrupt:
            print("\nMossy: Voice mode interrupted. Goodbye.")
            speak("Voice mode interrupted. Goodbye.")
            break


# =============================================================================
# TEXT MODE (DEFAULT)
# =============================================================================
def main() -> None:
    print("\n=== MOSSY ASSISTANT v2 (D:\\MossyAssistant) ===")
    print("Type 'exit' to quit.\n")

    chat = [{"role": "system", "content": SYSTEM_PROMPT}]

    while True:
        try:
            user = input("You: ")
        except (EOFError, KeyboardInterrupt):
            print("\nMossy: Goodbye for now.")
            break

        if user.strip().lower() in {"exit", "quit"}:
            print("Mossy: Goodbye for now.")
            break

        # Tools first
        tool_result = tools_router(user)
        if tool_result:
            print("Mossy (tool):", tool_result)
            speak(tool_result)
            continue

        chat.append({"role": "user", "content": user})
        reply = ask_cloud(chat)
        chat.append({"role": "assistant", "content": reply})
        print("Mossy:", reply, "\n")
        speak(reply)


# =============================================================================
# ENTRY POINT
# =============================================================================
if __name__ == "__main__":
    import sys

    # Ensure .env is loaded even if started from elsewhere
    try:
        load_dotenv()
    except Exception:
        pass

    if "--voice" in sys.argv:
        voice_main()
    else:
        main()
