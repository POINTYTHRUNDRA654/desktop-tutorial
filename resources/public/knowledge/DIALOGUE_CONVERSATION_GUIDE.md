# Dialogue & Conversation System — Complete Modding Guide for Fallout 4 (2026)

Fallout 4's dialogue system is fundamentally different from earlier Bethesda titles. It uses a **radial (4-option) menu** that replaced the numbered list in Skyrim/Oblivion, and all conversations are driven by **Scene** and **Topic** records within the **Dialogue** system. This guide covers the complete pipeline: quest-dialogue architecture, scene creation, response conditions, voiced audio, and lip sync.

---

## Part 1: System Architecture Overview

### How FO4 Dialogue Works

```
Quest → Dialogue Branch/Topic → Response Lines → Conditions → Actions
          ↓
        Scenes (for scripted cutscene-style conversations)
          ↓
        Voice Types → Audio Files (.fuz) + LipSync (.lip)
```

Every line of spoken dialogue goes through these layers:
- **INFO record** = one response (one line an NPC says)
- **DIAL record** (Dialogue Topic) = a collection of related responses
- **Scene** = a scripted sequence linking multiple dialogue events
- **Quest** = the parent that owns scenes and topics

### The Radial Menu (4-Option System)

In vanilla Fallout 4, the player's four dialogue choices map to:
- **Top** = "Sarcastic" response
- **Right** = "Positive/Yes" response
- **Bottom** = "Negative/No" response
- **Left** = "Question" response

Each button links to a separate **DIAL** (Player Topic) record. The NPC always gets an **INFO** (Response) within a separate topic that it delivers based on which button was pressed.

**Key implication for modders:** You do not create a single "player says X, NPC says Y" record. You create:
1. A **Player Dialogue Topic** (the button label)
2. A **Response Topic** (the NPC's reply)
3. Link them together

---

## Part 2: Creating Your First Conversation

### Step 1: Create a Quest (if not using an existing one)

All dialogue must belong to a quest. For standalone NPC greetings and comments, use a dedicated "Dialogue Quest":
1. CK → Character → Quest → New.
2. Set `Type` to "Dialogue Quest".
3. Set `Priority` to 25 (standard for dialogue quests).
4. Name: `MM_NPCDialogue`.

### Step 2: Create a Scene

A **Scene** chains multiple dialogue actions into a single sequence:
1. CK → Character → Scene → New.
2. Scene EditorID: `MM_IntroScene`.
3. **Actions tab**: Add actions in sequence.
   - Action type: `Dialogue` → set the NPC actor in this action → link a Topic.
   - Action type: `Package` → force the NPC to walk somewhere, sit, etc.
   - Action type: `Timer` → wait N seconds between lines.
4. **Participants tab**: Add the actors who participate (player, NPC).

### Step 3: Create Dialogue Topics

1. CK → Character → Dialogue → New Topic.
2. Set `Type`:
   - `Custom` — for NPC-specific topics only the player can trigger.
   - `Greeting` — fires when NPC first sees the player.
   - `Topic` — a scripted topic inside a conversation.
   - `Farewell` — NPC says when conversation ends.
3. Set `Quests` — link to your quest.

### Step 4: Add Response INFO Records

1. Right-click inside the topic's response list → New.
2. The **INFO record** contains:
   - **Response Text**: what the NPC says (the written text).
   - **Response Emotion**: the facial expression (Neutral, Happy, Angry, Disgusted, Surprised, Sad, Fear, Puzzled).
   - **Conditions**: when this line plays (see Part 4).
   - **Script Actions** (in the Scripts tab): Papyrus fragment to run when this line plays.
   - **Audio** field: link to the voice file (see Part 5).

### Step 5: Link Topics to the Scene

Back in the Scene's Action for the NPC:
1. Set `Actor` to the NPC's alias.
2. Set `Topic` to the `DIAL` record you created.
3. Set the scene's start trigger — usually a `Package` that activates when the player enters a trigger box, or via a script calling `scene.Start()`.

---

## Part 3: Branching Dialogue

### PlayerDialogue vs NPC Response Structure

For a conversation where the player has real choices:

```
Scene: MM_FullConversation
  Action 1 (NPC): Greeting topic → "Hello, stranger. What do you want?"
  Action 2 (Player): Player topic → radial menu appears
    Branch A (Player top button): "Tell me about [topic A]"
      → NPC Response A: "Here is info about A..."
      → Scene continues to Action 3A
    Branch B (Player right button): "I want to buy something"
      → NPC Response B: "Let me show you my wares..."
      → Scene continues to Action 3B (opens barter)
    Branch C (Player bottom button): "Never mind"
      → NPC Response C: "Farewell then."
      → Scene ends
```

In the CK, each "branch" is a separate INFO record within the same Player Topic, distinguished by conditions (see Part 4).

### The Dialogue View Window

CK → Gameplay → Edit Dialogue opens the **Dialogue View** — a visual node editor:
- Drag topics from the left panel onto the canvas.
- Connect topics with arrows (player says → NPC responds).
- Conditions and sub-topics appear as branches.
- This is the most efficient way to create complex branching conversations.

---

## Part 4: Conditions

Conditions determine when an INFO record (dialogue line) fires. They are evaluated top to bottom — the first INFO whose conditions all pass is used.

### Common Condition Functions

| Function | Use |
|---|---|
| `GetIsID(npcRef)` | Only plays for a specific NPC reference |
| `GetQuestRunning(questID)` | Only when a specific quest is active |
| `GetStage(questID) >= N` | After quest has reached stage N |
| `GetIsRace(raceID)` | Applies to creatures of this race |
| `GetActorValue(Variable) >= N` | Checks an actor value (e.g., Charisma >= 6) |
| `HasKeyword(keyword)` | NPC/player has a keyword |
| `GetInFaction(factionID)` | NPC is in this faction |
| `IsPlayerMovingIntoMelee` | Player is approaching for melee |
| `Random(0.3) == 1` | 30% chance (random dialogue variation) |
| `GetItemCount(itemForm) >= N` | Player has N or more of an item |

### Priority Between Multiple INFOs

When multiple INFO records in a topic all have passing conditions, the game picks the **highest-priority** one. Priority is set in the INFO record's header. Use:
- **Higher priority** (lower number = more important) for specific lines.
- **Lower priority** for fallback "generic" lines.

---

## Part 5: Voice Types and Audio

### Voice Types (VTYP)

A **Voice Type** (`VTYP`) groups all audio for a character class:
- `FemaleEvenToned` — standard female adult NPC
- `MaleBoston` — male with Boston accent
- `ChildChildlike` — child voice
- `DLC01EyeBot` — Eyebot (mechanical voice)
- `MaleGhoul` — feral ghoul

Each INFO record's audio file must match the NPC's voice type. The file path is:
```
Sound\Voice\[PluginName]\[VoiceType]\[TopicEditorID]_[InfoID].fuz
```

Example:
```
Sound\Voice\MM_MyMod.esp\MaleEvenToned\MM_IntroTopic_00000F12_1.fuz
```

### Creating Voice Audio

#### Method 1: Silent/Text-Only Dialogue

For NPCs with no voice acting, leave the audio blank — the text displays and the NPC "mouths" silently. Add to the INFO record:
- `NoVoice=true` flag OR simply leave the Audio field empty.
- The text still appears in the subtitle bar.

#### Method 2: Custom Voice Recording

1. Record audio as a `.wav` file (mono, 44100Hz, 16-bit PCM).
2. Convert to Bethesda's `.fuz` format using **FUZ Converter** (free tool) or **xVASynth**.
   ```
   FUZConverter.exe -encode "input.wav" "output.fuz" "input.lip"
   ```
3. The `.fuz` format bundles the audio + `.lip` sync data together.
4. Place the `.fuz` file in the path structure above.
5. In the INFO record → Audio tab → set the filepath.

#### Method 3: AI-Generated Voice (xVASynth)

**xVASynth** (xVASynth.com, Nexus #36410) uses neural TTS models trained on FO4's voice actors to generate new voice lines:
1. Install xVASynth and the Fallout 4 voice models.
2. Enter your dialogue text → select the voice type model.
3. Generate audio → export as `.wav`.
4. Use FUZ Converter to convert and create `.lip` sync data.
5. Place in the correct path structure.

> **Note (2026):** xVASynth v3.x is the current major version, with support for all vanilla FO4 voice types and improved prosody compared to earlier versions.

### LipSync (.lip Files)

`.lip` files encode the facial animation data for lip-sync. They are embedded inside `.fuz` files.

**Generating .lip files:**
- The **Creation Kit** can auto-generate lip sync from audio: right-click an INFO record → "Generate LipSync".
- CK requires the audio already be in the correct path.
- Alternatively, use `FUZ Converter` which can batch generate basic lip sync.
- For high-quality lip sync, use **Wav2Lip** or **FaceAnimConverter** — these produce more accurate mouth shape mapping than CK's built-in generator.

---

## Part 6: Subtitles and Text

For every INFO record:
1. **Response Text** = what appears in the subtitle / closed-caption bar.
2. **Notes** = internal notes (not shown in-game).
3. The **translated text** for localized releases goes in the `.strings` files (see Part 8).

### Proper Capitalization and Punctuation

Follow vanilla Bethesda style:
- Capitalize the first word of each sentence.
- Use Oxford comma in lists.
- Ellipsis `...` for pauses (3 dots, no spaces).
- Em dash `—` for interruptions or strong emphasis.
- Keep lines under 200 characters for subtitle readability.

---

## Part 7: Scripted Dialogue Actions (Papyrus)

Each INFO record has a **Script** tab with Papyrus fragments that fire at specific points:

| Trigger | When it fires |
|---|---|
| `Begin` | When this INFO starts playing |
| `End` | When this INFO finishes playing |
| `OnActivate` | When the player activates the NPC to start conversation |

### Example: Advance Quest Stage on Dialogue Choice

```papyrus
; In the INFO record's "End" script fragment:
Quest MM_MainQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest
MM_MainQuest.SetStage(20)
```

### Example: Give Item After Dialogue

```papyrus
; In "End" fragment of an INFO record where NPC gives the player a reward:
Form MM_RewardItem = Game.GetFormFromFile(0x801, "MM_MyMod.esp")
Game.GetPlayer().AddItem(MM_RewardItem, 1)
Debug.Notification("You received the Vault Key.")
```

### Example: Conditional Branch Using Script

```papyrus
; In "Begin" fragment — check condition and skip if not met:
If (Game.GetPlayer().GetItemCount(MM_RequiredItem) < 1)
    ; Player doesn't have the item — this path shouldn't trigger
    ; (Use Conditions on the INFO instead of scripting for this)
EndIf
```

> **Best practice:** Use **Conditions** on the INFO record for branching logic, not scripts. Scripts in dialogue fragments are for *side effects* (advancing quests, giving items, starting other scenes), not for controlling which line plays.

---

## Part 8: Localization & Translation

If your mod targets non-English players, separate dialogue text into `.strings` files:

1. In CK → Edit → Preferences → Enable Localization.
2. CK exports all dialogue text to `Data\Strings\[PluginName]_en.DLSTRINGS`.
3. Translators edit these string files.
4. Each language file uses its ISO code: `_fr.DLSTRINGS`, `_de.DLSTRINGS`, etc.
5. Ship all translation files in your mod archive.

For community translation assistance, see the **CONTRIBUTING_TRANSLATIONS.md** guide.

---

## Part 9: Common Dialogue Mistakes & Fixes

### NPC Never Greets the Player
- Check `Greeting` topic exists and has an INFO record with passing conditions.
- Ensure the NPC has a dialogue package that allows them to greet (`DialogueFavorGenericScene` or a custom package).
- Check that the NPC's AI combat state is not preventing dialogue.

### Player Choices Don't Appear
- The Player Topic must be linked from the Scene or from the NPC's response via the "Prompt" field.
- Ensure the Player Topic's conditions pass (test with `GetQuestRunning`).
- In the Dialogue View, confirm the arrow from NPC response → Player topic is connected.

### Audio Plays But Subtitles Are Wrong
- The Response Text in the INFO record doesn't match the audio. Update the text to match what was recorded.

### Dialogue Loop (NPC Repeats the Same Line)
- The INFO record's `Say Once` flag is not set — the same line plays every time.
- Or, the quest stage is not advancing (check Papyrus log for script errors in the `End` fragment).

### Voice File Path Error in CK
- CK cannot find the audio file.
- Ensure the path follows the exact convention: `Sound\Voice\[PluginName]\[VoiceType]\[file.fuz]`.
- The plugin name in the path must exactly match your `.esp` filename (case-sensitive on some systems).

### "Voice does not match" (audio plays wrong voice)
- The NPC's `Voice Type` field (in the NPC_ record) does not match the voice type folder in the audio path.

---

## Part 10: Radiant Dialogue (Random NPC Comments)

For ambient dialogue (idle comments NPCs say while the player is nearby):

1. Create a `Dialogue Topic` with `Type = Custom`.
2. Add multiple INFO records with `Say Once` flag OFF.
3. Add the Condition `Random(0.25) == 1` to create 25% variation between lines.
4. Link the topic to an AI Package that triggers dialogue when conditions are met.

Vanilla uses this extensively for Diamond City residents and companion comments.

---

## Quick Reference

| Task | CK Location |
|---|---|
| Create Scene | Character → Scene |
| Create Dialogue Topic | Character → Dialogue |
| Add Response Line (INFO) | Inside the Dialogue window → right-click → New |
| Dialogue View (visual graph) | Gameplay → Edit Dialogue |
| Generate LipSync | Right-click INFO → Generate LipSync |
| Set Voice Type on NPC | NPC_ record → Character Data tab |

*Last updated: May 2026. Tested with FO4 NG CK and xVASynth v3.x.*
