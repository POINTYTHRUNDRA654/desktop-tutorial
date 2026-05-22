# F4AI Production Asset Templates (`main.py` + `F4AI_QueueManager.psc`)

This page stores two canonical alpha templates:

1. Python backend server (`main.py`)
2. Papyrus queue manager (`F4AI_QueueManager.psc`)

Use these as baseline references and adapt paths/properties for your local setup.

---

## Asset 1: Production Python Server (`main.py`)

Save as `main.py` in your development workspace.

```python
import os
import sys
import json
import time
import glob
import subprocess
import requests
import numpy as np
import scipy.io.wavfile as wavf

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

if hasattr(sys, '_MEIPASS'):
    DATA_DIR = os.path.dirname(sys.executable)
else:
    DATA_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_FILE = os.path.join(DATA_DIR, "bridge_input.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "bridge_output.json")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")
MEMORY_DIR = os.path.join(DATA_DIR, "NPC_Memories")
FALLOUT_ROOT = os.path.abspath(os.path.join(DATA_DIR, "..", ".."))
CK_32_EXE = os.path.join(FALLOUT_ROOT, "CreationKit32.exe")
KOBOLD_API_URL = "http://localhost:5001/api/v1/generate"

def locate_installed_voice_model():
    found_models = glob.glob(os.path.join(DATA_DIR, "*.onnx"))
    return found_models[0] if found_models else None

def load_user_config():
    defaults = {"ai_temperature": 0.7, "enable_memory": 1, "speech_speed": 1.0}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return defaults
    return defaults

def load_or_create_memory(npc_name):
    if "Curie" in npc_name:
        npc_name = "Curie"
    os.makedirs(MEMORY_DIR, exist_ok=True)
    memory_file = os.path.join(MEMORY_DIR, f"{npc_name.replace(' ', '_')}.json")
    if os.path.exists(memory_file):
        try:
            with open(memory_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"conversations": []}

def update_npc_memory(npc_name, player_line, npc_line):
    if "Curie" in npc_name:
        npc_name = "Curie"
    memory_file = os.path.join(MEMORY_DIR, f"{npc_name.replace(' ', '_')}.json")
    memory_data = load_or_create_memory(npc_name)
    memory_data["conversations"].append({"p": player_line, "n": npc_line})
    if len(memory_data["conversations"]) > 5:
        memory_data["conversations"].pop(0)
    try:
        with open(memory_file, "w") as f:
            json.dump(memory_data, f, indent=4)
    except IOError:
        pass

def check_lipgen_eligibility(npc_name):
    blacklist = ["Codsworth", "Curie", "Nick Valentine", "Strong"]
    return not any(b in npc_name for b in blacklist)

def query_local_llm(prompt, temperature):
    payload = {"prompt": prompt, "max_context_length": 1024, "max_length": 50, "temperature": temperature}
    try:
        response = requests.post(KOBOLD_API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            return response.json()['results'][0]['text'].strip()
    except Exception:
        return "System logic matrices are running behind schedule."
    return "My processors failed to yield a prompt response clear enough to speak."

def process_game_event():
    time.sleep(0.05)
    try:
        with open(INPUT_FILE, "r") as f:
            context = json.load(f)
    except (IOError, json.JSONDecodeError):
        return

    try:
        os.remove(INPUT_FILE)
    except OSError:
        pass

    npc = context.get("npc_name", "Settler")
    location = context.get("location", "The Commonwealth")
    player_input = context.get("player_speech", "[Greets you silently]")
    config = load_user_config()

    history_string = ""
    if config.get("enable_memory") == 1:
        memory = load_or_create_memory(npc)
        for turn in memory["conversations"]:
            history_string += f"Player: {turn['p']}\nYou: {turn['n']}\n"

    system_prompt = f"You are the companion {npc} in Fallout 4. You are currently located at {location}. Respond in character with one short sentence."
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}\n\n{history_string}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{player_input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"

    ai_response = query_local_llm(full_prompt, config.get("ai_temperature", 0.7))
    ai_response = ai_response.replace("*", "").replace("\"", "").strip()
    print(f"[{npc}]: {ai_response}")

    voice_model = locate_installed_voice_model()
    audio_wav_path = os.path.join(DATA_DIR, "f4ai_voice.wav")
    if voice_model:
        piper_cmd = ["piper", "--model", voice_model, "--length_scale", str(config.get("speech_speed", 1.0)), "--output_file", audio_wav_path]
        subprocess.run(piper_cmd, input=ai_response.encode("utf-8"), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

        if os.path.exists(audio_wav_path):
            try:
                sr, data = wavf.read(audio_wav_path)
                if data.dtype == np.float32:
                    data = (data * 32767).astype(np.int16)
                wavf.write(audio_wav_path, 16000, data)
            except Exception:
                pass

            if os.path.exists(CK_32_EXE) and check_lipgen_eligibility(npc):
                rel_wav = os.path.relpath(audio_wav_path, FALLOUT_ROOT)
                lip_cmd = [CK_32_EXE, f"-GenerateSingleLip:{rel_wav}", ai_response]
                subprocess.run(lip_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

    if config.get("enable_memory") == 1:
        update_npc_memory(npc, player_input, ai_response)

    output_payload = {
        "subtitle_text": ai_response,
        "audio_file": "F4AI/f4ai_voice.wav",
        "display_duration": max(2.5, len(ai_response) / 13.0)
    }
    try:
        with open(OUTPUT_FILE, "w") as out_f:
            json.dump(output_payload, out_f)
    except IOError:
        print("[System Fault] Failed to write output payload.")

if __name__ == "__main__":
    print("F4AI standalone bridge service running...")
    while True:
        if os.path.exists(INPUT_FILE):
            process_game_event()
        time.sleep(0.1)
```

---

## Asset 2: Papyrus Core Queue Framework (`F4AI_QueueManager.psc`)

Create at `Data/Scripts/Source/User/F4AI_QueueManager.psc`, then compile in CK.

```papyrus
Scriptname F4AI_QueueManager extends Quest

String Property InputPath = "Data/F4AI/bridge_input.json" Auto Const
String Property OutputPath = "Data/F4AI/bridge_output.json" Auto Const
Sound Property F4AI_AudioOutputSound Auto Const

Actor[] DialogueQueue
Bool IsProcessing = false

Event OnInit()
    DialogueQueue = new Actor[20]
EndEvent

Function PushToQueue(Actor npcRef)
    if (npcRef == None || npcRef.IsDead())
        return
    endif

    Int i = 0
    While (i < DialogueQueue.Length)
        if (DialogueQueue[i] == npcRef)
            return
        endif
        if (DialogueQueue[i] == None)
            DialogueQueue[i] = npcRef
            ProcessNextInQueue()
            return
        endif
        i += 1
    EndWhile
EndFunction

Function ProcessNextInQueue()
    if (IsProcessing)
        return
    endif

    Int i = 0
    Actor activeTargetNPC = None
    While (i < DialogueQueue.Length)
        if (DialogueQueue[i] != None)
            activeTargetNPC = DialogueQueue[i]
            DialogueQueue[i] = None
            i = DialogueQueue.Length
        endif
        i += 1
    EndWhile

    if (activeTargetNPC != None)
        IsProcessing = true
        ExecuteAITranslationThread(activeTargetNPC)
    endif
EndFunction

Function ExecuteAITranslationThread(Actor targetNPC)
    String npcName = targetNPC.GetActorBase().GetName()
    String curLoc = Game.GetPlayer().GetCurrentLocation().GetName()
    if (curLoc == "")
        curLoc = "The Commonwealth Wastes"
    endif

    String sampleSpeech = "Hello there."
    String jsonPayload = "{"
    jsonPayload += "\"npc_name\": \"" + npcName + "\","
    jsonPayload += "\"location\": \"" + curLoc + "\","
    jsonPayload += "\"player_speech\": \"" + sampleSpeech + "\""
    jsonPayload += "}"

    if (MiscUtil.FileExists(OutputPath))
        MiscUtil.DeleteFile(OutputPath)
    endif
    MiscUtil.WriteToFile(InputPath, jsonPayload, append = false)

    Int safetyTicks = 0
    Bool payloadReturned = false
    While (!payloadReturned && safetyTicks < 40)
        if (MiscUtil.FileExists(OutputPath))
            payloadReturned = true
        else
            Utility.WaitMenuMode(0.2)
            safetyTicks += 1
        endif
    EndWhile

    if (payloadReturned)
        String rawJson = MiscUtil.ReadFromFile(OutputPath)
        MiscUtil.DeleteFile(OutputPath)

        Int subStart = StringUtil.Find(rawJson, "\"subtitle_text\": \"") + 18
        Int subEnd = StringUtil.Find(rawJson, "\", \"audio_file\"")
        String cleanSubtitle = StringUtil.Substring(rawJson, subStart, subEnd - subStart)

        Int durStart = StringUtil.Find(rawJson, "\"display_duration\": ") + 20
        Float displayTime = StringUtil.Substring(rawJson, durStart, StringUtil.GetLength(rawJson) - durStart - 1) as Float

        Debug.Notification(npcName + ": " + cleanSubtitle)
        F4AI_AudioOutputSound.Play(targetNPC)
        Utility.WaitMenuMode(displayTime)
    else
        Debug.Notification("[AI Sync Matrix Timeout]")
    endif

    IsProcessing = false
    ProcessNextInQueue()
EndFunction
```

