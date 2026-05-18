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

### Path Configuration (Recommended)

Avoid hard-coded install paths in production. Prefer a single shared root:

```python
import os

FALLOUT_ROOT = os.getenv("FALLOUT4_ROOT", r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4")
DATA_DIR = os.path.join(FALLOUT_ROOT, "Data", "F4AI")
```

Then derive all file paths from `DATA_DIR`.

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
FALLOUT_ROOT = os.getenv("FALLOUT4_ROOT", r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4")
DATA_DIR = os.path.join(FALLOUT_ROOT, "Data", "F4AI")
BRIDGE_FILE = os.path.join(DATA_DIR, "bridge_input.json")
KOBOLD_API_URL = "http://localhost:5001/api/v1/generate"  # Default local KoboldCPP port

def query_local_llm(prompt):
    """Sends a prompt to the free, locally-running KoboldCPP API."""
    payload = {
        "prompt": prompt,
        "max_context_length": 2048,
        "max_length": 80,  # Keeps NPC lines short and natural
        "temperature": 0.7,
        # Tune stop sequences to your model template/token format.
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
    POLLING_INTERVAL = 0.5
    print("Fallout 4 Local AI Bridge Active. Monitoring game files...")
    while True:
        if os.path.exists(BRIDGE_FILE):
            try:
                process_game_event()
            except Exception as e:
                print(f"Error reading bridge file: {e}")
                time.sleep(1)
        time.sleep(POLLING_INTERVAL) # Prevent high CPU usage while idling
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
FALLOUT_ROOT = os.getenv("FALLOUT4_ROOT", r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4")
DATA_DIR = os.path.join(FALLOUT_ROOT, "Data", "F4AI")
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
            return response.json()['results'][0]['text'].strip()
    except requests.exceptions.ConnectionError:
        return "I am having trouble connecting to my cognitive matrix."
    return ""

def generate_local_tts(text):
    """Uses Piper TTS via command line to quickly output an offline .wav file."""
    print("Synthesizing voice audio locally...")
    command = ["piper", "--model", PIPER_MODEL_PATH, "--output_file", AUDIO_OUTPUT_PATH]
    subprocess.run(
        command,
        input=text.encode("utf-8"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

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
    POLLING_INTERVAL = 0.5
    print("Fallout 4 Local AI Bridge Active. Waiting for player interactions...")
    while True:
        if os.path.exists(INPUT_FILE):
            try:
                process_game_event()
            except Exception as e:
                print(f"Error: {e}")
        time.sleep(POLLING_INTERVAL)  # Keep same polling cadence as Part 2 unless profiling proves otherwise
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
        Int TimeoutCounter = 0
        While (!MiscUtil.FileExists(OutputPath) && TimeoutCounter < 60)
            Utility.Wait(0.1) ; 100ms cadence, 6s total timeout
            TimeoutCounter += 1
        EndWhile
        
        ; 3. Parse the return file if found
        If (MiscUtil.FileExists(OutputPath))
            ; Read the payload string containing our AI text line
            String fileContents = MiscUtil.ReadFromFile(OutputPath)
            
            ; Quick, basic string parsing to grab the subtitle text inside the JSON quotes
            Int subtitleMarkerPos = StringUtil.Find(fileContents, "\"subtitle_text\": \"")
            Int endPos = StringUtil.Find(fileContents, "\", \"audio_file\"")
            If (subtitleMarkerPos != -1 && endPos != -1 && endPos > subtitleMarkerPos + 18)
                Int startPos = subtitleMarkerPos + 18
                String finalSubtitle = StringUtil.Substring(fileContents, startPos, endPos - startPos)
                
                ; 4. Display the text and play the voice file inside the game engine
                Debug.Notification(TargetNPC.GetActorBase().GetName() + ": " + finalSubtitle)
                F4AI_AudioOutputSound.Play(TargetNPC) ; Plays the generated audio coming directly from the NPC's mouth
            Else
                Debug.Notification("[AI Output Parse Error]")
            EndIf
            
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

---

## 9) Automated Lip-Sync Generation (`.lip` / `.fuz`)

For dynamic facial animation, generate lip data externally after TTS output.

### Setup Notes

1. Place `CreationKit32.exe` where your automation can invoke it reliably.
2. Save generated voice lines under `Data\Sound\Voice\YourMod.esp\...`.
3. Run lip generation immediately after producing WAV output.

```python
import subprocess
import os

FALLOUT_ROOT = os.getenv("FALLOUT4_ROOT", r"C:\Program Files (x86)\Steam\steamapps\common\Fallout 4")
CK_32_EXE = os.path.join(FALLOUT_ROOT, "CreationKit32.exe")

def generate_npc_lip_sync(relative_audio_path, raw_text_line):
    """
    Runs Bethesda's lip generation utility for a single line.
    """
    print("Generating realtime face and lip animations...")
    command = [
        CK_32_EXE,
        f"-GenerateSingleLip:{relative_audio_path}",
        raw_text_line,
    ]

    try:
        subprocess.run(
            command,
            cwd=FALLOUT_ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
        print("Lip animation generated successfully.")
    except subprocess.TimeoutExpired:
        print("Lip generation timed out.")
```

---

## 10) Dynamic Combat Inputs for Tactical AI Reactions

### Papyrus Combat Export

```papyrus
Scriptname F4AI_CombatEvaluator extends ReferenceAlias

String Property CombatInputPath = "Data/F4AI/combat_input.json" Auto Const

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    ; aeCombatState: 0 = Safe, 1 = Combat, 2 = Searching
    If (aeCombatState == 1)
        EvaluateCombatSituation(akTarget)
    EndIf
EndEvent

Function EvaluateCombatSituation(Actor enemyTarget)
    Actor npcRef = self.GetActorReference()
    
    Float npcHealth = npcRef.GetActorValuePercentage("Health") * 100.0
    Float enemyHealth = enemyTarget.GetActorValuePercentage("Health") * 100.0
    Float combatDistance = npcRef.GetDistance(enemyTarget)
    
    String enemyName = enemyTarget.GetActorBase().GetName()
    
    String jsonPayload = "{"
    jsonPayload += "\"combat_status\": \"ACTIVE\","
    jsonPayload += "\"npc_health\": " + npcHealth as String + ","
    jsonPayload += "\"enemy_type\": \"" + enemyName + "\","
    jsonPayload += "\"enemy_health\": " + enemyHealth as String + ","
    jsonPayload += "\"distance_units\": " + combatDistance as String
    jsonPayload += "}"
    
    MiscUtil.WriteToFile(CombatInputPath, jsonPayload, append = false)
EndFunction
```

### Python Combat Processor

```python
COMBAT_INPUT_FILE = os.path.join(DATA_DIR, "combat_input.json")

def process_combat_event():
    with open(COMBAT_INPUT_FILE, "r") as f:
        combat_data = json.load(f)
        
    npc_hp = combat_data.get("npc_health", 100)
    enemy = combat_data.get("enemy_type", "Raider")
    enemy_hp = combat_data.get("enemy_health", 100)
    dist = combat_data.get("distance_units", 1000)
    
    if npc_hp < 30:
        tactical_context = f"You are losing a brutal firefight against a {enemy}. Your health is low ({int(npc_hp)}%). Scream in panic, curse, or shout a tactical retreat line."
    elif dist < 300:
        tactical_context = f"A hostile {enemy} is close. Threaten them with close-quarters violence."
    else:
        tactical_context = f"You are taking shots at a {enemy} from a distance. Shout a confident combat line."
        
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{tactical_context}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    combat_shout = query_local_llm(full_prompt)
    print(f"\n[NPC Combat Shout]: {combat_shout}\n")
    
    generate_local_tts(combat_shout)
    generate_npc_lip_sync(r"Data\Sound\Voice\F4AI\f4ai_voice.wav", combat_shout)
    
    os.remove(COMBAT_INPUT_FILE)
```

---

## 11) Long-Term NPC Memory Profiles (Local JSON Store)

Use per-NPC JSON memory files instead of storing long conversation state in save data.

```python
import os
import json

MEMORY_DIR = os.path.join(DATA_DIR, "NPC_Memories")

def load_or_create_memory(npc_name):
    """Loads a specific NPC's memory file, or builds a blank history index."""
    if not os.path.exists(MEMORY_DIR):
        os.makedirs(MEMORY_DIR)
        
    memory_file = os.path.join(MEMORY_DIR, f"{npc_name.replace(' ', '_')}.json")
    
    if os.path.exists(memory_file):
        with open(memory_file, "r") as f:
            return json.load(f)
    return {"conversations": [], "combat_events": [], "player_reputation": 0}

def update_npc_memory(npc_name, player_input, ai_response, mood_shift=0):
    """Saves the current interaction context so the NPC remembers it next time."""
    memory_file = os.path.join(MEMORY_DIR, f"{npc_name.replace(' ', '_')}.json")
    memory_data = load_or_create_memory(npc_name)
    
    MAX_CONVERSATION_HISTORY = 5
    memory_data["conversations"].append({"player": player_input, "npc": ai_response})
    if len(memory_data["conversations"]) > MAX_CONVERSATION_HISTORY:
        memory_data["conversations"].pop(0)
        
    memory_data["player_reputation"] += mood_shift
    
    with open(memory_file, "w") as f:
        json.dump(memory_data, f, indent=4)

def build_prompt_with_history(npc_name, current_location):
    """Injects historical memories straight into the system prompt."""
    memory = load_or_create_memory(npc_name)
    rep = memory.get("player_reputation", 0)
    
    relationship = "neutral toward"
    if rep > 3:
        relationship = "good friends with"
    elif rep < -3:
        relationship = "hostile and suspicious of"
    
    history_string = ""
    for exchange in memory["conversations"]:
        history_string += f"\nPlayer said: '{exchange['player']}' -> You responded: '{exchange['npc']}'"
        
    prompt = f"You are {npc_name} in Fallout 4 at {current_location}. You are {relationship} the player."
    if history_string:
        prompt += f" Here is a summary of your recent interactions with them:{history_string}"
    prompt += "\nRespond to the player's new interaction based on this context in one short sentence."
    
    return prompt
```

---

## 12) Build a Standalone Windows Executable (`.exe`)

### Install PyInstaller

```bash
pip install pyinstaller
```

### Runtime Asset Path Helper

```python
import sys
import os

def get_asset_path(relative_path):
    """Locates assets when running as script or PyInstaller EXE."""
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)
```

### Build Command

```bash
pyinstaller --onefile --noconsole --icon=vault_boy.ico --name="Fallout4_AI_Engine" main.py
```

The output executable will be generated in `dist/Fallout4_AI_Engine.exe`.

---

## 13) Nexus Packaging Layout

```text
[YourModName.7z]
 ├── Data/
 │    ├── YourModAI.esp
 │    ├── Scripts/
 │    │    └── F4AI_ConversationBridge.pex
 │    └── F4AI/
 │         ├── Fallout4_AI_Engine.exe
 │         ├── en_US-lessac-medium.onnx
 │         └── en_US-lessac-medium.onnx.json
 └── Documentation_Readme.txt
```

### Expected End-User Flow

1. User installs mod files into the game directory.
2. User runs `Data/F4AI/Fallout4_AI_Engine.exe`.
3. User launches Fallout 4 and interacts with NPCs.
4. Runtime loop handles local reasoning, memory, TTS, lip sync, and playback.

---

## 14) In-Game Holotape Configuration Loop (`config.json`)

Players can tune AI behavior from Pip-Boy by writing settings to `Data/F4AI/config.json`.

### Config File Shape

```json
{
  "ai_temperature": 0.7,
  "enable_memory": 1,
  "speech_speed": 1.0
}
```

### Papyrus Holotape Script

```papyrus
Scriptname F4AI_ConfigHolotape extends ObjectReference

String Property ConfigPath = "Data/F4AI/config.json" Auto Const

Float ai_temperature = 0.7
Int enable_memory = 1
Float speech_speed = 1.0

Function IncreaseTemperature()
    if (ai_temperature < 1.2)
        ai_temperature += 0.1
        SaveConfiguration()
        Debug.Notification("AI Creativity increased to: " + ai_temperature)
    endif
EndFunction

Function DecreaseTemperature()
    if (ai_temperature > 0.2)
        ai_temperature -= 0.1
        SaveConfiguration()
        Debug.Notification("AI Creativity decreased to: " + ai_temperature)
    endif
EndFunction

Function ToggleMemory()
    if (enable_memory == 1)
        enable_memory = 0
        Debug.Notification("NPC Memory Profiles: DISABLED")
    else
        enable_memory = 1
        Debug.Notification("NPC Memory Profiles: ENABLED")
    endif
    SaveConfiguration()
EndFunction

Function SaveConfiguration()
    String jsonStr = "{"
    jsonStr += "\"ai_temperature\": " + ai_temperature as String + ","
    jsonStr += "\"enable_memory\": " + enable_memory as String + ","
    jsonStr += "\"speech_speed\": " + speech_speed as String
    jsonStr += "}"
    MiscUtil.WriteToFile(ConfigPath, jsonStr, append = false)
EndFunction
```

### Python Config Reader Integration

```python
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")

def load_user_config():
    defaults = {
        "ai_temperature": 0.7,
        "enable_memory": 1,
        "speech_speed": 1.0
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return defaults
    return defaults

def generate_response_with_config(npc_name, location, player_input):
    config = load_user_config()

    if config.get("enable_memory") == 1:
        prompt = build_prompt_with_history(npc_name, location)
    else:
        prompt = f"You are {npc_name} at {location}. Respond to the player in one sentence."

    payload = {
        "prompt": prompt,
        "max_context_length": 2048,
        "max_length": 60,
        "temperature": config.get("ai_temperature", 0.7)
    }

    # Send payload to local LLM backend.
    # Pass config["speech_speed"] into your TTS command arguments.
```

### Creation Kit Steps

1. Create `F4AI_SettingsHolotape` in **Items → Holotape**.
2. Assign a custom Terminal object.
3. Add menu items/submenus and bind actions to `IncreaseTemperature`, `DecreaseTemperature`, and `ToggleMemory`.
4. Add a startup quest that gives the holotape to the player on first load.

---

## 15) Multi-NPC Crowd Safety with a Global Dialogue Queue

When multiple NPCs trigger simultaneously, queue requests to avoid overlap and race conditions.

### Global Queue Controller (Quest Script)

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
    Int i = 0
    While (i < DialogueQueue.Length)
        if (DialogueQueue[i] == None)
            DialogueQueue[i] = npcRef
            ProcessNextInQueue()
            Return
        endif
        i += 1
    EndWhile
EndFunction

Function ProcessNextInQueue()
    if (IsProcessing || DialogueQueue[0] == None)
        Return
    endif
    
    IsProcessing = true
    Actor currentNPC = DialogueQueue[0]
    
    Int i = 0
    While (i < DialogueQueue.Length - 1)
        DialogueQueue[i] = DialogueQueue[i + 1]
        i += 1
    EndWhile
    DialogueQueue[DialogueQueue.Length - 1] = None
    
    TriggerAIGeneration(currentNPC)
EndFunction

Function TriggerAIGeneration(Actor targetNPC)
    String jsonPayload = "{\"npc_name\": \"" + targetNPC.GetActorBase().GetName() + "\", \"location\": \"" + Game.GetPlayer().GetCurrentLocation().GetName() + "\"}"
    MiscUtil.WriteToFile(InputPath, jsonPayload, append = false)
    
    Int timeout = 0
    While (!MiscUtil.FileExists(OutputPath) && timeout < 60)
        Utility.Wait(0.1)
        timeout += 1
    EndWhile
    
    if (MiscUtil.FileExists(OutputPath))
        String fileContents = MiscUtil.ReadFromFile(OutputPath)

        Int subtitleMarkerPos = StringUtil.Find(fileContents, "\"subtitle_text\": \"")
        Int endPos = StringUtil.Find(fileContents, "\", \"audio_file\"")
        If (subtitleMarkerPos != -1 && endPos != -1 && endPos > subtitleMarkerPos + 18)
            Int startPos = subtitleMarkerPos + 18
            String finalSubtitle = StringUtil.Substring(fileContents, startPos, endPos - startPos)
            Debug.Notification(targetNPC.GetActorBase().GetName() + ": " + finalSubtitle)
        Else
            Debug.Notification("[AI Output Parse Error]")
        EndIf
        
        F4AI_AudioOutputSound.Play(targetNPC)
        MiscUtil.DeleteFile(OutputPath)
    endif
    
    IsProcessing = false
    ProcessNextInQueue()
EndFunction
```

### Individual NPC Enqueue Script

```papyrus
Scriptname F4AI_CrowdNPC extends ReferenceAlias

F4AI_QueueManager Property QueueManager Auto Const

Event OnActivate(ObjectReference akActionRef)
    if (akActionRef == Game.GetPlayer())
        QueueManager.PushToQueue(self.GetActorReference())
    endif
EndEvent
```

### Queue Behavior Notes

- One NPC is processed at a time.
- Others wait in `DialogueQueue` until processing clears.
- Prevents TTS overlap, file clobbering, and back-to-back bridge crashes.

---

## 16) Advanced Systems Enabled by the Same Bridge

### 1. Dynamic Faction Radio ("Gossip Engine")

- Update `world_history.json` on major player milestones.
- Generate fresh radio host lines from local AI + local TTS.
- Feed generated audio into radio playback assets.

### 2. AI-Driven Companion Morality

- Track long-term player behavior (crime/help/faction choices).
- Evaluate trajectory in memory profiles.
- Generate relationship reactions beyond static liked/disliked toggles.

### 3. Contextual Stealth Reactions

- Export Caution-state context (location, sound source, visibility).
- Generate squad callouts and search plans dynamically.
- Increase encounter variety without hand-authoring every bark.

### 4. Environmental Commentary

- Send weather/time/location/event context into prompt.
- Generate situational companion observations on demand.
- Keep dialogue fresh across repeated playthroughs.

---

## 17) Procedural Radio Gossip Engine (Detailed)

### Papyrus World History Tracker

```papyrus
Scriptname F4AI_RadioWorldTracker extends Quest

String Property WorldHistoryPath = "Data/F4AI/world_history.json" Auto Const

Bool Property Completed_UnlikelyValentine Auto
Bool Property Completed_NuclearOption Auto
Int Property SettlementsSaved Auto

Function UpdateWorldHistory(String latestEventDescription)
    Int playerLevel = Game.GetPlayer().GetLevel()
    String currentFaction = "Minutemen" ; Replace with your dynamic faction resolver
    
    String jsonStr = "{"
    jsonStr += "\"latest_news\": \"" + latestEventDescription + "\","
    jsonStr += "\"player_level\": " + playerLevel as String + ","
    jsonStr += "\"current_faction\": \"" + currentFaction + "\","
    jsonStr += "\"minutemen_settlements\": " + SettlementsSaved as String + ","
    jsonStr += "\"nick_valentine_rescued\": " + Completed_UnlikelyValentine as String + ","
    jsonStr += "\"institute_destroyed\": " + Completed_NuclearOption as String
    jsonStr += "}"
    
    MiscUtil.WriteToFile(WorldHistoryPath, jsonStr, append = false)
EndFunction
```

### Python Radio Script + TTS Generation

```python
import os
import json

WORLD_FILE = os.path.join(DATA_DIR, "world_history.json")
RADIO_OUT_WAV = os.path.join(FALLOUT_ROOT, "Data", "Sound", "FX", "F4AI", "radio_broadcast.wav")

def generate_radio_broadcast():
    if not os.path.exists(WORLD_FILE):
        return
        
    with open(WORLD_FILE, "r") as f:
        world = json.load(f)
        
    news = world.get("latest_news", "Nothing new in the Commonwealth.")
    saved_bases = world.get("minutemen_settlements", 0)
    inst_dead = world.get("institute_destroyed", False)
    
    system_prompt = (
        "You are Travis Lonely Miles, host of Diamond City Radio in Fallout 4. "
        "Speak in a nervous but endearing tone and deliver this report in 2-3 sentences."
    )
    context = (
        f"CURRENT COMMONWEALTH REPORT:\n"
        f"- Latest event: {news}\n"
        f"- Settlements under Minutemen control: {saved_bases}\n"
        f"- Is the Institute gone?: {inst_dead}"
    )
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}\n\n{context}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    
    radio_script = query_local_llm(full_prompt)
    generate_local_tts_with_voice(radio_script, "travis_voice.onnx", RADIO_OUT_WAV)
```

---

## 18) Companion "True Morality" Prompt Architecture (Detailed)

### Example Companion Profile

```json
{
  "companion_name": "Codsworth",
  "core_ethics": "Values honor, kindness, cleanliness, and pre-war legal civility. Despises chem addiction, theft, and random murder.",
  "observed_player_actions": [
    "Player donated 20 caps to a poor beggar in Diamond City.",
    "Player picked a lock on an innocent settler's safe.",
    "Player consumed psycho and murdered a traveling merchant."
  ],
  "current_relationship_summary": "Deeply disappointed and conflicted about traveling together."
}
```

### Morality Dialogue Constructor

```python
import json

def generate_companion_morality_dialogue(companion_name, current_player_input):
    memory_path = os.path.join(DATA_DIR, "NPC_Memories", f"{companion_name}.json")
    
    with open(memory_path, "r") as f:
        profile = json.load(f)
        
    ethics = profile.get("core_ethics", "")
    actions = "\n- ".join(profile.get("observed_player_actions", []))
    relationship = profile.get("current_relationship_summary", "uncertain")
    
    system_prompt = (
        f"You are {companion_name} in Fallout 4. "
        f"Your ethics are: {ethics}. "
        f"You recently observed:\n- {actions}\n"
        f"Current relationship stance: {relationship}. "
        "The player asks how your relationship is going. "
        "Evaluate their behavior against your ethics and answer in-character in 2 sentences."
    )
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    
    companion_response = query_local_llm(full_prompt)
    update_relationship_summary_via_llm(companion_name, companion_response)
    return companion_response
```

---

## 19) Distribution README Template (Nexus Bundle)

```text
================================================================================
FALLOUT 4 ADVANCED LOCAL AI SYSTEM (100% FREE & OFFLINE)
================================================================================

FEATURES:
- Dynamic crowd management: NPCs wait their turn to speak.
- Procedural Radio Station: Broadcasts update from world events.
- Companion Morality: Companions evaluate your long-term choices.
- Automated generated dialogue playback with lip-sync pipeline.

REQUIREMENTS (ALL FREE):
1. Fallout 4 Script Extender (F4SE)
2. KoboldCPP (local inference host)
3. A local GGUF model (example: Llama-3-8B-Instruct-Q4_K_M.gguf)

INSTALLATION:
1. Extract mod archive into your Fallout 4/Data folder.
2. Start KoboldCPP with your local model and launch on localhost.
3. Open Data/F4AI and run Fallout4_AI_Engine.exe.
4. Launch game through f4se_loader.exe.
5. Check inventory for the AI settings holotape.
```

---

## 20) Latency & Reliability Troubleshooting

### Bug 1: Game Lag from Blocking Wait Loops

Use periodic updates instead of frame-blocking loops.

```papyrus
Scriptname F4AI_AsyncListener extends Quest

String Property OutputPath = "Data/F4AI/bridge_output.json" Auto Const
Actor ActiveNPCRef

Function StartWaitingForAI(Actor npc)
    ActiveNPCRef = npc
    RegisterForCustomUpdate(0.5)
EndFunction

Event OnCustomUpdate(Float afTimeElapsed)
    if (MiscUtil.FileExists(OutputPath))
        UnregisterForCustomUpdate()
        PlayAIResponse(ActiveNPCRef)
    endif
EndEvent
```

### Bug 2: Combat Latency Gaps

Use timeout checks and fallback bark lines when generation is too slow.

```python
import time

def process_combat_event_with_timeout(combat_data):
    start_time = time.time()
    response = query_local_llm(combat_data)
    elapsed = time.time() - start_time
    
    if elapsed > 1.5 or not response:
        fallback_shout = "Get behind cover, now!"
        generate_local_tts(fallback_shout)
        return fallback_shout
    return response
```

### Bug 3: File Lock Permission Errors

Retry reads with short delays.

```python
import time
import json

def safely_read_game_json(file_path):
    MAX_FILE_READ_ATTEMPTS = 5
    for attempt in range(MAX_FILE_READ_ATTEMPTS):
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except IOError:
            time.sleep(0.05)
    return None
```

### Bug 4: Subtitle and Voice Duration De-Sync

Send `display_duration` from Python and honor it in Papyrus.

```python
MIN_SUBTITLE_DURATION = 2.0
CHARS_PER_SECOND = 15.0
speech_duration = max(MIN_SUBTITLE_DURATION, len(ai_response) / CHARS_PER_SECOND)
output_payload = {
    "subtitle_text": ai_response,
    "display_duration": speech_duration
}
```

```papyrus
Float displayTime = ParseDurationFromJSON()
Debug.Notification(NPCName + ": " + finalSubtitle)
Utility.Wait(displayTime)
```

### Crash Log Pattern

```python
import traceback

def log_system_crash(exception_error):
    with open(os.path.join(DATA_DIR, "f4ai_crash_log.txt"), "w") as log:
        log.write("--- FALLOUT 4 AI MOD ENGINE CRASH ---\n")
        log.write(f"Error Details: {str(exception_error)}\n")
        traceback.print_exc(file=log)
```

Wrap your top-level loop in `try/except` and call `log_system_crash(e)` for user-submitted diagnostics.

---

## 21) Creation Kit Alpha Build Walkthrough (First Test Build)

### Step 1: Initialize Plugin File

1. Launch Creation Kit from your mod manager (MO2/Vortex).
2. Open **File → Data...**.
3. Check `Fallout4.esm`, click **OK**.
4. After load, select **File → Save**.
5. Save as `F4AI_Core.esp` in `Fallout 4/Data/`.

### Step 2: Create Background Queue Manager Quest

1. Go to **Object Window → Character → Quest**.
2. Create new quest:
   - ID: `F4AI_QueueManagerQuest`
   - Priority: `50`
   - Enable **Start Game Enabled**

### Step 3: Embed Queue Papyrus Script

1. In quest window, open **Scripts** tab.
2. Click **Add → New Script**.
3. Name: `F4AI_QueueManager`.
4. Open source and paste queue manager code.
5. Compile (`Ctrl + F7`) and verify **Compilation Succeeded**.

### Step 4: Map Script Properties

1. In script **Properties**, select `F4AI_AudioOutputSound`.
2. Set to:
   - A temporary vanilla sound descriptor for alpha testing, or
   - Your custom descriptor targeting `Data/F4AI/f4ai_voice.wav`.

### Step 5: Attach Trigger Script to Test Actor

1. Open test actor (example: Codsworth) in CK.
2. In **Scripts**, add new script `F4AI_CrowdNPC`.
3. Paste/compile enqueue script.
4. Set `QueueManager` property to `F4AI_QueueManagerQuest`.
5. Save plugin.

### Step 6: Assemble Alpha Folder Layout

```text
Fallout 4/
 └── Data/
      ├── F4AI_Core.esp
      ├── Scripts/
      │    ├── F4AI_QueueManager.pex
      │    └── F4AI_CrowdNPC.pex
      └── F4AI/
           ├── Fallout4_AI_Engine.exe
           ├── en_US-lessac-medium.onnx
           ├── en_US-lessac-medium.onnx.json
           └── config.json
```

### Step 7: Run First In-Game Test

1. Start KoboldCPP with your local model on port `5001`.
2. Launch `Data/F4AI/Fallout4_AI_Engine.exe`.
3. Start game via `f4se_loader.exe`.
4. Ensure `F4AI_Core.esp` is active.
5. Talk to your test NPC and verify bridge logs, LLM response, generated TTS, and in-game playback.
