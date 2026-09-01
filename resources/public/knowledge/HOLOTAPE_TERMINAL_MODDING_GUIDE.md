# Terminals, Holotapes & Pip-Boy Items — Complete Modding Guide for Fallout 4 (2026)

Terminals and holotapes are Fallout 4's in-lore interactive media — hackable computers, data tapes, and collectible recordings. This guide covers creating fully functional terminals with menus and locked content, holotapes with custom scripts, and Pip-Boy-accessible items including custom map markers.

---

## Part 1: Terminals

### What Terminals Are (Record Types)

| Record | Purpose |
|---|---|
| `TERM` | The terminal itself — screen text, menu items, linked holotapes |
| `NOTE` | Holotape or note — item in inventory; can launch a terminal or Papyrus script |
| `STAT` | The physical terminal static mesh placed in the world |
| `ACTI` | Activator — the interactive object the player walks up to |

A "terminal" in the CK is a `TERM` record. It is separate from the physical terminal mesh — you link the `TERM` record to a placed `STAT` or `ACTI` reference via the reference's "Terminal" link.

### Creating a Terminal (TERM Record)

1. CK → Items → Terminal → New
2. EditorID: `MM_MyVaultTerminal`

#### Terminal Fields

| Field | Description |
|---|---|
| `Name` | Header shown at top of the terminal screen |
| `Description` | Body text displayed on the welcome screen |
| `Difficulty` | Hacking difficulty: Very Easy / Easy / Average / Hard / Very Hard / Requires Key |
| `Flags` | `Start Locked`: terminal opens at a locked state (requires hacking or a password) |
| `Passwords` | List of note items that unlock this terminal when in the player's inventory |
| `Menu Items` | The list of options the player sees on the terminal screen |

#### Adding Menu Items

Each `Menu Item` entry has:
- **Display Text** — what the player sees in the list
- **Result Text** — the text shown after the player selects this item
- **Script` Fragment** — Papyrus fragment that runs when the item is selected
- **Sub-Terminal** — links to another `TERM` record (sub-menu navigation)
- **Add Note** — puts a holotape or note into the player's inventory when selected
- **Flags** — `Add Displayed Item` (adds an item), `Force Redisplay` (returns to this screen after selection)

#### Example: Simple Terminal Menu

```
TERM: MM_ResearchTerminal
  Name: "Vault-Tec Research Station Delta"
  Description: "Welcome, researcher. Select an option:"
  Difficulty: Hard

  Menu Items:
    [0] "Access Personnel Files"
        Result Text: "CLASSIFIED. Level 4 clearance required."
        Script: (none)

    [1] "Read Director's Log"
        Result Text: "Opening log file..."
        Script fragment: (Begin) Quest MM_VaultQuest.SetStage(10)

    [2] "Override Containment"
        Result Text: "Override accepted. Containment doors unlocking."
        Script fragment: (Begin)
            ObjectReference doorRef = Game.GetFormFromFile(0x803, "MM_MyMod.esp") as ObjectReference
            doorRef.Unlock()
        Sub-Terminal: (none)

    [3] "Log Out"
        Result Text: ""
        Flags: Force Redisplay
```

### Placing the Terminal in the World

1. In the CK Render Window, place a vanilla terminal static mesh (`TerminalPreWarDeskHigh01` or similar).
2. With the mesh selected: right-click → Add Linked Reference → `MM_ResearchTerminal`.
3. Alternatively, use an `ACTI` (activator) record linked to the TERM — useful for custom terminal meshes.

### Locking Terminals with a Password Holotape

1. Create a `NOTE` record (Part 2) — the password holotape item.
2. In your `TERM` record → Passwords tab → add the `NOTE` record.
3. When the player has that `NOTE` in inventory, they bypass hacking and access the terminal directly.

---

## Part 2: Holotapes

### What Holotapes Are

Holotapes are `NOTE` records with `Type = Voice` (audio only) or `Type = Program` (interactive Papyrus-driven terminal interface). They appear in the player's inventory and can be played on a terminal or via the Pip-Boy.

### Creating a Holotape (NOTE Record)

1. CK → Items → Note → New
2. EditorID: `MM_DirectorHolotape`

#### NOTE Fields

| Field | Type | Purpose |
|---|---|---|
| `Name` | String | Inventory display name |
| `Model` | Path | NIF path for the item 3D model (usually `Interface\Holotape.nif`) |
| `Type` | Enum | `Voice` = audio only, `Program` = interactive script, `Book` = static text |
| `Sound` | SNDR | Voice audio for `Voice` type holotapes |
| `Script` | Fragment | Papyrus that runs when holotape is played (for `Program` type) |
| `Text` | String | Body text (for `Book` type only) |

### Audio Holotape (Voice Type)

```
NOTE: MM_DirectorHolotape
  Name: "Director's Personal Log - Entry 12"
  Type: Voice
  Sound: MM_DirectorVoice_Entry12   ← SNDR record pointing to your .fuz audio file
```

The `.fuz` audio file path follows the same convention as dialogue voice lines:
```
Sound\Voice\MM_MyMod.esp\[VoiceType]\MM_DirectorVoice_Entry12.fuz
```

### Script-Driven Holotape (Program Type)

A Program holotape launches a custom terminal-like menu when played on a terminal or the Pip-Boy:

```
NOTE: MM_AccessCodeHolotape
  Name: "Vault Access Override Sequence"
  Type: Program
  Script Fragment (OnActivate):
    ; Run when player plays this holotape on a terminal
    Quest myQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest
    myQuest.SetStage(15)
    Debug.MessageBox("Access code accepted. Door unlocked.")
    Game.GetPlayer().RemoveItem(self as Form, 1)   ; consume the holotape
```

### Interactive Holotape — Terminal-Style Menu

For a holotape with a full menu (like vanilla holotape games):

1. Create a `TERM` record for the holotape menu content.
2. In the `NOTE` record → Terminal field → link to your `TERM`.
3. When the player plays the holotape on a terminal, the linked `TERM` menu opens.

This is how vanilla Pip-Boy games and many quest holotapes work. The holotape is the inventory item; the terminal record provides the menu.

---

## Part 3: Pip-Boy Integration

### Playing Holotapes in the Pip-Boy

By default, holotapes of type `Voice` play their audio immediately when selected from the Pip-Boy inventory. Holotapes of type `Program` open their linked `TERM` in the Pip-Boy's terminal mode.

No extra setup is needed — the `NOTE.Type` field controls this behavior automatically.

### Adding Items to the Pip-Boy Radio

To add your audio to the Pip-Boy radio (not a holotape — a persistent radio station):

1. Create a `RADS` (Radio Station) record.
2. Create `SNDR` records for each track.
3. In your quest script, enable the station when the player discovers it:
   ```papyrus
   RadioStation Property MM_SecretStation Auto
   MM_SecretStation.Enable()    ; starts broadcasting
   ```
4. Conditions on the station control when it broadcasts.

---

## Part 4: Custom Map Markers

Map markers in Fallout 4 are `STAT` references with the `MapMarker` flag enabled, linked to a `LCTN` (Location) record.

### Creating a Map Marker

1. In the Render Window, place a `MapMarker` reference at the location on the map.
2. In the reference's properties → Name: your location name.
3. Set the `Map Marker Data` → Marker Type (icon): choose from the vanilla icon set (Settlement, Vault, Ruin, etc.)
4. Link the marker to a `LCTN` record via the reference's `Location` field.

### Discovering a Map Marker via Script

```papyrus
; Reveal a map marker when the player enters a trigger box:
ObjectReference Property MM_MarkerRef Auto   ; the map marker reference

Event OnTriggerEnter(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        MM_MarkerRef.AddToMap(true)    ; true = discovered + visible
    EndIf
EndEvent
```

Or via quest stage trigger:
```papyrus
MM_MarkerRef.AddToMap(true)
```

### Custom Map Marker Icon

To use a custom icon (instead of vanilla icons):

1. Create a custom icon PNG (32×32 or 64×64 pixels, with transparency).
2. Convert to a DDS (BC3 format with alpha channel).
3. Place at `Textures\Interface\Icons\MapMarker\MM_CustomIcon.dds`.
4. In the STAT record for the map marker, set the Icon texture path to point to your DDS.
5. In the `LCTN` record, reference this icon.

> **Note:** Custom map marker icons require a compatible UI mod or a script-based UI injection — the vanilla Pip-Boy only shows vanilla icon types. For custom icons, use a ReShade or F4SE UI overlay.

---

## Part 5: Custom Notes (Readable Messages)

Notes the player finds in the world (like the "Holotape" items that are plain text) use `NOTE` with `Type = Book`:

```
NOTE: MM_ResearchNoteItem
  Name: "Research Notes - Subject 44"
  Type: Book
  Text:
    "Day 14 of the experiment.
    Subject 44 shows increased aggression but maintained motor function.
    Recommend continuation of the FEV exposure protocol.
    — Dr. Kellner"
```

### Displaying Notes with MessageBox vs. Book Display

- `Type = Book` → displays in the Pip-Boy's "Holotapes & Notes" tab as a readable item with a background paper texture.
- Alternatively, use `Debug.MessageBox()` in a script fragment for a popup-style message — simpler but less immersive.
- For longer multi-page notes, use a `TERM` linked to the `NOTE` — allows page navigation.

---

## Part 6: Giving Holotapes / Notes to the Player

### Through the World (Placed in a Container or on a Body)

1. In the CK, open a container or NPC inventory.
2. Add the `NOTE` item to their inventory list.
3. The player loots it normally.

### Through a Quest (Scripted Gift)

```papyrus
Form Property MM_StarterHolotape Auto

Event OnQuestInit()
    Game.GetPlayer().AddItem(MM_StarterHolotape, 1)
    Debug.Notification("New holotape added to your Pip-Boy.")
EndEvent
```

### Through Dialogue (NPC Gives Holotape)

In an INFO record's `End` script fragment:
```papyrus
Form holotapeForm = Game.GetFormFromFile(0x804, "MM_MyMod.esp")
Game.GetPlayer().AddItem(holotapeForm, 1)
Debug.Notification("You received: Director's Log.")
```

---

## Part 7: Practical Examples

### Quest Start Holotape

Many mods start with the player receiving a mysterious holotape:

1. Create a `NOTE` of type `Program` linked to a `TERM` with flavor text and a "Play Message" option.
2. The "Play Message" menu item fires a script that starts your quest.
3. A `COBJ` crafting record lets the player "receive" the holotape from a specific container at game start (or just place it in the inventory via a `Start Game Enabled` quest).

### Vault Access Terminal

1. `TERM` record: "Overseer's Terminal" with three menu items — Read Log, Open Armory, Initiate Lockdown.
2. "Open Armory" script fragment unlocks a nearby door reference.
3. "Initiate Lockdown" advances a quest stage and plays an alarm sound.
4. Terminal is locked (Hard difficulty) — hackers can access it; alternatively a `NOTE` password holotape is hidden elsewhere.

### Collectible Holotape Game

1. Create a `NOTE` of type `Program` linked to a `TERM`.
2. The `TERM` simulates a mini-game through a sequence of menu selections (e.g., a text adventure).
3. Completing the game via the terminal sequence advances a "Collector" quest.

---

*Last updated: May 2026. Tested against FO4 NG CK and F4SE 0.7.7.*
