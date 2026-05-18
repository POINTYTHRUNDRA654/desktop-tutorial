# Fallout 4 Local AI Bridge Pipeline Guide (Free, Offline, Two-Way)

This guide describes a complete local architecture for advanced Fallout 4 AI interactions using:

- F4SE + Papyrus for in-game event capture
- A local Python bridge process for orchestration
- A local LLM backend (KoboldCPP/Ollama)
- A local TTS backend (Piper/xVASynth)

The goal is a 100% free, publicly distributable mod workflow suitable for Nexus Mods packaging.

---

## 1) Architecture Overview

```text
[ Fallout 4 + F4SE/Papyrus ]
           │
           ▼
[ Data/F4AI/bridge_input.json ]  --> written by Papyrus
           │
           ▼
[ External Python Bridge ]
  - Reads input JSON
  - Queries local LLM endpoint
  - Generates local TTS WAV
  - Writes bridge_output.json
           │
           ▼
[ Data/F4AI/bridge_output.json ] --> read by Papyrus
           │
           ▼
[ Subtitle Notification + Sound Playback in Fallout 4 ]
```

Recommended local stack:

- LLM: Llama-3 / Mistral GGUF via KoboldCPP or Ollama
- STT (optional): Faster-Whisper
- TTS: Piper TTS or xVASynth

---

## 2) Part 1 — Papyrus Event Detector (One-Way Input)

Attach to a quest alias or test NPC. This example writes player/NPC context to `bridge_input.json`.

```papyrus
Scriptname F4AI_ConversationBridge extends ReferenceAlias

; Define the path where the Python server looks for files
String Property BridgeFilePath = "Data/F4AI/bridge_input.json" Auto Const

; Fires automatically when the player activates (talks to) the NPC
Event OnActivate(ObjectReference akActionRef)
    Actor PlayerRef = Game.GetPlayer()
    
    If (akActionRef == PlayerRef)
        Actor TargetNPC = self.GetActorReference()
        String NPCName = TargetNPC.GetActorBase().GetName()
        String CurrentLocation = PlayerRef.GetCurrentLocation().GetName()
        
        ; Build a simple flat JSON string manually to avoid complex struct bugs
        String jsonPayload = "{"
        jsonPayload += "\"npc_name\": \"" + NPCName + "\","
        jsonPayload += "\"location\": \"" + CurrentLocation + "\","
        jsonPayload += "\"player_level\": " + PlayerRef.GetLevel() as String
        jsonPayload += "}"
        
        ; Use F4SE file system utility to dump the string to your hard drive
        Debug.Notification("Sending data to Local AI Server...")
        MiscUtil.WriteToFile(BridgeFilePath, jsonPayload, append = false)
    EndIf
EndEvent
```

---

## 3) Part 2 — Python Bridge (One-Way Local LLM Response)

Install dependency:

```bash
pip install requests
```

```python
import os
import json
import time
import requests

# Paths and local API settings
BRIDGE_FILE = r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data\F4AI\bridge_input.json"
KOBOLD_API_URL = "http://localhost:5001/api/v1/generate"  # Default local KoboldCPP port

def query_local_llm(prompt):
    """Sends a prompt to the free, locally-running KoboldCPP API."""
    payload = {
        "prompt": prompt,
        "max_context_length": 2048,
        "max_length": 80,  # Keeps NPC lines short and natural
        "temperature": 0.7,
        "stop_sequence": ["\n", "Player:", "NPC:"]
    }
    try:
        response = requests.post(KOBOLD_API_URL, json=payload)
        if response.status_code == 200:
            return response.json()['results'][0]['text'].strip()
    except requests.exceptions.ConnectionError:
        return "[Error: Ensure KoboldCPP is running on port 5001]"
    return ""

def process_game_event():
    """Reads the JSON payload injected by Fallout 4 and constructs the prompt."""
    print("Found new game event! Processing...")
    
    with open(BRIDGE_FILE, "r") as f:
        data = json.load(f)
        
    npc = data.get("npc_name", "Settler")
    loc = data.get("location", "The Commonwealth")
    level = data.get("player_level", 1)
    
    # Constructing a free open-source style character prompt (e.g. Llama-3 format)
    system_prompt = f"You are {npc}, an NPC in the video game Fallout 4. You are currently at {loc}. A level {level} player walks up and greets you. Respond in character with one or two short sentences."
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    
    print(f"Generating line for {npc}...")
    ai_response = query_local_llm(full_prompt)
    print(f"\n[{npc}]: {ai_response}\n")
    
    # Clean up the file so the loop waits for the next dialogue activation
    os.remove(BRIDGE_FILE)

if __name__ == "__main__":
    print("Fallout 4 Local AI Bridge Active. Monitoring game files...")
    while True:
        if os.path.exists(BRIDGE_FILE):
            try:
                process_game_event()
            except Exception as e:
                print(f"Error reading bridge file: {e}")
                time.sleep(1)
        time.sleep(0.5) # Prevent high CPU usage while idling
```

---

## 4) Part 3 — Upgraded Python Bridge (Two-Way LLM + TTS + Return Payload)

Install dependencies:

```bash
pip install piper-tts requests
```

```python
import os
import json
import time
import requests
import subprocess

# Local directories and configurations
DATA_DIR = r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data\F4AI"
INPUT_FILE = os.path.join(DATA_DIR, "bridge_input.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "bridge_output.json")
KOBOLD_API_URL = "http://localhost:5001/api/v1/generate"

# Download a free .onnx voice model from Piper's model repository
PIPER_MODEL_PATH = os.path.join(DATA_DIR, "en_US-lessac-medium.onnx")
AUDIO_OUTPUT_PATH = os.path.join(DATA_DIR, "f4ai_voice.wav")

def query_local_llm(prompt):
    """Queries KoboldCPP for text dialogue."""
    payload = {"prompt": prompt, "max_context_length": 2048, "max_length": 60, "temperature": 0.7}
    try:
        response = requests.post(KOBOLD_API_URL, json=payload)
        if response.status_code == 200:
            return response.json()['results']['text'].strip()
    except requests.exceptions.ConnectionError:
        return "I am having trouble connecting to my cognitive matrix."
    return ""

def generate_local_tts(text):
    """Uses Piper TTS via command line to quickly output an offline .wav file."""
    print("Synthesizing voice audio locally...")
    command = f'echo "{text}" | piper --model {PIPER_MODEL_PATH} --output_file {AUDIO_OUTPUT_PATH}'
    subprocess.run(command, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def process_game_event():
    """Reads game data, generates text + audio, and returns it to Fallout 4."""
    print("\n--- Event Detected ---")
    with open(INPUT_FILE, "r") as f:
        data = json.load(f)
        
    npc = data.get("npc_name", "Settler")
    loc = data.get("location", "The Commonwealth")
    
    # Context prompt matching the local Llama-3 format
    system_prompt = f"You are {npc} in Fallout 4. You are at {loc}. Keep answers to one sentence."
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    
    # 1. Text Generation
    ai_response = query_local_llm(full_prompt)
    print(f"[{npc}]: {ai_response}")
    
    # 2. Audio Generation
    generate_local_tts(ai_response)
    
    # 3. Create the response return payload for the game client
    output_payload = {
        "status": "READY",
        "subtitle_text": ai_response,
        "audio_file": "F4AI/f4ai_voice.wav"  # Path relative to the game's Data folder
    }
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output_payload, f)
        
    # Safely clear the input trigger file
    os.remove(INPUT_FILE)
    print("Sent audio and subtitles back to Fallout 4 successfully.")

if __name__ == "__main__":
    print("Fallout 4 Local AI Bridge Active. Waiting for player interactions...")
    while True:
        if os.path.exists(INPUT_FILE):
            try:
                process_game_event()
            except Exception as e:
                print(f"Error: {e}")
        time.sleep(0.2)
```

---

## 5) Part 4 — Upgraded Papyrus Return Reader (Two-Way In-Game Playback)

This script writes input, waits for `bridge_output.json`, reads subtitle text, shows text, and plays a configured sound descriptor.

```papyrus
Scriptname F4AI_ConversationBridge extends ReferenceAlias

String Property InputPath = "Data/F4AI/bridge_input.json" Auto Const
String Property OutputPath = "Data/F4AI/bridge_output.json" Auto Const
Sound Property F4AI_AudioOutputSound Auto Const ; Configure this sound descriptor in Creation Kit to point to Data/F4AI/f4ai_voice.wav

Event OnActivate(ObjectReference akActionRef)
    Actor PlayerRef = Game.GetPlayer()
    
    If (akActionRef == PlayerRef)
        Actor TargetNPC = self.GetActorReference()
        
        ; 1. Dump context out to Python
        String jsonPayload = "{\"npc_name\": \"" + TargetNPC.GetActorBase().GetName() + "\", \"location\": \"" + PlayerRef.GetCurrentLocation().GetName() + "\"}"
        MiscUtil.WriteToFile(InputPath, jsonPayload, append = false)
        
        ; 2. Enter a loop waiting for Python to create the output response file
        Int timeoutCounter = 0
        While (!MiscUtil.FileExists(OutputPath) && timeoutCounter < 30)
            Utility.Wait(0.2) ; Wait 200ms per frame loop
            timeoutCounter += 1
        EndWhile
        
        ; 3. Parse the return file if found
        If (MiscUtil.FileExists(OutputPath))
            ; Read the payload string containing our AI text line
            String fileContents = MiscUtil.ReadFromFile(OutputPath)
            
            ; Quick, basic string parsing to grab the subtitle text inside the JSON quotes
            Int startPos = StringUtil.Find(fileContents, "\"subtitle_text\": \"") + 18
            Int endPos = StringUtil.Find(fileContents, "\", \"audio_file\"")
            String finalSubtitle = StringUtil.Substring(fileContents, startPos, endPos - startPos)
            
            ; 4. Display the text and play the voice file inside the game engine
            Debug.Notification(TargetNPC.GetActorBase().GetName() + ": " + finalSubtitle)
            F4AI_AudioOutputSound.Play(TargetNPC) ; Plays the generated audio coming directly from the NPC's mouth
            
            ; Clean up the output file so it's fresh for the next interaction
            MiscUtil.DeleteFile(OutputPath)
        Else
            Debug.Notification("[AI Connection Timed Out]")
        EndIf
    EndIf
EndEvent
```

---

## 6) Local Test Workflow

1. Download and run KoboldCPP.
2. Load a free GGUF model such as `Llama-3-8B-Instruct-Q4_K_M.gguf`.
3. Launch the local API endpoint.
4. Run the Python bridge script and leave it active.
5. Start Fallout 4 with your F4SE-enabled mod.
6. Trigger NPC interaction and verify:
   - `bridge_input.json` appears
   - Python logs a response
   - `bridge_output.json` appears
   - Subtitle notification appears in-game
   - NPC playback uses generated WAV

---

## 7) Creation Kit Packaging Steps (Required for Audio Playback)

1. Open Creation Kit.
2. Go to **Object Window → Audio → Sound Descriptor**.
3. Create a new descriptor:
   - ID: `F4AI_AudioOutputSound`
   - Type: mono/3D as needed
   - File path: `F4AI\f4ai_voice.wav`
4. Assign `F4AI_AudioOutputSound` to the script property.
5. Package:
   - In-game plugin/scripts (`.esp` + Papyrus/F4SE assets)
   - External bridge executable (Python packaged via PyInstaller or Nuitka)

---

## 8) Distribution Constraint for Free Nexus Mods Releases

For a fully free and publicly redistributable release:

- Use local, open-source inference and synthesis only.
- Do not require paid cloud API keys.
- Keep all model execution on user hardware.

This keeps runtime cost at zero for end users and preserves offline usage.
