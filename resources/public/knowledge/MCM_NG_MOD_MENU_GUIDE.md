# MCM NG — Creating Mod Configuration Menus for Your Mod (2026)

MCM NG (Mod Configuration Menu — Next Gen) gives players an in-game settings panel for your mod. Instead of editing INI files or using holotapes, players open the pause menu → MCM → your mod's page and adjust sliders, toggles, and text fields. This guide covers creating and integrating MCM NG menus in your own mods.

**Nexus:** Search "MCM NG" — use the NG or 1.11.x build matching your game version.  
**Requirements:** F4SE, Address Library, MCM NG installed by the end user.  
**Note:** Always check if MCM is installed before using it (see Part 7 — graceful fallback).

---

## Part 1: How MCM NG Works

MCM NG provides:
- A Papyrus API (`MCM:MCMScript`) your mod calls to register a menu and define its controls
- An in-game UI (accessible from the pause menu) that renders your controls
- Automatic INI file saving/loading so settings persist between sessions

Your mod does NOT need to ship any SWF or UI files — MCM NG handles all rendering. You only write Papyrus.

---

## Part 2: Required Files in Your Mod

```
Data\
├── Scripts\
│   └── Source\
│       └── User\
│           └── MM_MyModMCM.psc        ← your MCM script
├── Scripts\
│   └── MM_MyModMCM.pex                ← compiled script
└── MM_MyMod.esp                       ← your plugin (contains quest that runs the MCM script)
```

---

## Part 3: Creating the MCM Quest

MCM menus are driven by a Papyrus script attached to a Quest.

1. **CK → Quest → New**
2. EditorID: `MM_MyModMCMQuest`
3. Type: Miscellaneous
4. Flags: `Start Game Enabled` ✅ — must run from game load
5. Priority: 15 (low — MCM quests run in the background)

In the Quest's Script tab, attach your MCM script (created in Part 4).

---

## Part 4: The MCM Script

```papyrus
ScriptName MM_MyModMCM extends MCM:MCMScript

; ─── Properties (read/write by the MCM system) ────────────────────────────────

; Sliders
Float Property DamageMultiplier = 1.0 Auto    ; default = 1.0
Float Property SpawnRate = 0.5 Auto           ; 0.0 to 1.0

; Toggles
Bool Property EnableHardMode = false Auto
Bool Property EnableDebugLog = false Auto

; Text options (stored as Int index)
Int Property DifficultyPreset = 1 Auto        ; 0=Easy, 1=Normal, 2=Hard

; Key bindings
Int Property ToggleKey = -1 Auto              ; -1 = unbound


; ─── OnPageReset — called when the player opens your MCM page ─────────────────

Event OnPageReset(String page)

    SetCursorFillMode(TOP_TO_BOTTOM)
    SetCursorPosition(0)

    ; ── Section: Gameplay ──
    AddHeaderOption("⚙ Gameplay Settings")

    AddSliderOptionST("DamageSlider",    "Damage Multiplier",  DamageMultiplier, "{2}×")
    AddSliderOptionST("SpawnRateSlider", "Creature Spawn Rate", SpawnRate,       "{0}%")

    AddToggleOptionST("HardModeToggle",  "Hard Mode",          EnableHardMode)

    String[] diffLabels = new String[3]
    diffLabels[0] = "Easy"
    diffLabels[1] = "Normal"
    diffLabels[2] = "Hard"
    AddMenuOptionST("DifficultyMenu", "Difficulty Preset", diffLabels[DifficultyPreset])

    ; ── Section: Controls ──
    AddHeaderOption("⌨ Controls")
    AddKeyMapOptionST("ToggleKeyMap", "Toggle Mod Key", ToggleKey)

    ; ── Section: Debug ──
    AddHeaderOption("🔧 Debug")
    AddToggleOptionST("DebugToggle", "Enable Debug Log", EnableDebugLog)

EndEvent


; ─── State handlers — fired when user interacts with a control ────────────────

State DamageSlider
    Event OnSliderOpenST()
        SetSliderDialogStartValue(DamageMultiplier)
        SetSliderDialogDefaultValue(1.0)
        SetSliderDialogRange(0.1, 5.0)
        SetSliderDialogInterval(0.1)
    EndEvent
    Event OnSliderAcceptST(Float value)
        DamageMultiplier = value
        SetSliderOptionValueST(DamageMultiplier, "{2}×")
    EndEvent
EndState

State SpawnRateSlider
    Event OnSliderOpenST()
        SetSliderDialogStartValue(SpawnRate * 100)   ; display as percentage
        SetSliderDialogDefaultValue(50)
        SetSliderDialogRange(0, 100)
        SetSliderDialogInterval(5)
    EndEvent
    Event OnSliderAcceptST(Float value)
        SpawnRate = value / 100.0
        SetSliderOptionValueST(value, "{0}%")
    EndEvent
EndState

State HardModeToggle
    Event OnSelectST()
        EnableHardMode = !EnableHardMode
        SetToggleOptionValueST(EnableHardMode)
    EndEvent
    Event OnDefaultST()
        EnableHardMode = false
        SetToggleOptionValueST(EnableHardMode)
    EndEvent
EndState

State DifficultyMenu
    Event OnMenuOpenST()
        String[] options = new String[3]
        options[0] = "Easy"
        options[1] = "Normal"
        options[2] = "Hard"
        SetMenuDialogOptions(options)
        SetMenuDialogStartIndex(DifficultyPreset)
        SetMenuDialogDefaultIndex(1)
    EndEvent
    Event OnMenuAcceptST(Int index)
        DifficultyPreset = index
        String[] labels = new String[3]
        labels[0] = "Easy"
        labels[1] = "Normal"
        labels[2] = "Hard"
        SetMenuOptionValueST(labels[DifficultyPreset])
    EndEvent
EndState

State ToggleKeyMap
    Event OnKeyMapChangeST(Int keyCode, String conflictControl, String conflictMod)
        ToggleKey = keyCode
        SetKeyMapOptionValueST(ToggleKey)
    EndEvent
    Event OnDefaultST()
        ToggleKey = -1
        SetKeyMapOptionValueST(ToggleKey)
    EndEvent
EndState

State DebugToggle
    Event OnSelectST()
        EnableDebugLog = !EnableDebugLog
        SetToggleOptionValueST(EnableDebugLog)
    EndEvent
EndState


; ─── Registration — called when MCM is ready (OnGameReload or OnVersionUpdate) ─

Event OnConfigInit()
    Pages = new String[1]
    Pages[0] = "Settings"
    ; Add more pages if needed: Pages[1] = "Advanced", Pages[2] = "Debug"
EndEvent

Event OnVersionUpdate(Int version)
    ; Called when the mod version changes — use to migrate old settings
    If version >= 2
        ; Version 2 introduced SpawnRate; reset to default if upgrading from v1
        SpawnRate = 0.5
    EndIf
EndEvent
```

---

## Part 5: MCM Control Types Reference

| Function | What It Creates |
|---|---|
| `AddHeaderOption("Text")` | Non-interactive section divider / label |
| `AddTextOption("Label", "Value")` | Read-only text display |
| `AddToggleOptionST("State", "Label", bool)` | On/Off checkbox |
| `AddSliderOptionST("State", "Label", float, "format")` | Numeric slider |
| `AddMenuOptionST("State", "Label", "CurrentValue")` | Drop-down list |
| `AddKeyMapOptionST("State", "Label", keyCode)` | Keyboard binding picker |
| `AddInputOptionST("State", "Label", "CurrentText")` | Text input field |
| `AddColorOptionST("State", "Label", color)` | Color picker |
| `AddEmptyOption()` | Blank spacing line |

---

## Part 6: Multi-Page MCM

For complex mods, split settings across pages:

```papyrus
Event OnConfigInit()
    Pages = new String[3]
    Pages[0] = "Gameplay"
    Pages[1] = "Visual"
    Pages[2] = "Debug"
EndEvent

Event OnPageReset(String page)
    If page == "Gameplay"
        ; Add gameplay controls
    ElseIf page == "Visual"
        ; Add visual controls
    ElseIf page == "Debug"
        ; Add debug controls
    EndIf
EndEvent
```

---

## Part 7: Graceful Fallback (MCM Not Installed)

Always write your mod to function without MCM. Use GlobalVariable records as the persistent storage layer that both your mod's Papyrus and MCM write to:

```papyrus
; In any script that uses MCM settings:
GlobalVariable Property MM_DamageMult Auto   ; GLOB record in your ESP

Function ApplySettings()
    ; Read from GlobalVariable — works whether MCM is installed or not
    Float mult = MM_DamageMult.GetValue()
    Game.GetPlayer().SetActorValue(ActorValue.kDamageResist, mult * 10.0)
EndFunction
```

In your MCM script, write to the GlobalVariable when a slider is accepted:

```papyrus
State DamageSlider
    Event OnSliderAcceptST(Float value)
        DamageMultiplier = value
        MM_DamageMult.SetValue(value)   ; write to GlobalVariable → MCM-free fallback
        SetSliderOptionValueST(DamageMultiplier, "{2}×")
    EndEvent
EndState
```

This pattern means: MCM users get the in-game menu. Users without MCM can edit the GLOB values directly in xEdit as a manual fallback.

---

## Part 8: INI File Persistence (MCM Settings Manager)

MCM NG saves settings automatically to an INI file when using the `MCMSettingsManager` extension (part of Addictol). Settings survive save loads and game restarts with zero extra code on your part — MCM handles serialization automatically for all properties marked `Auto` on your `MCMScript`.

The INI is saved to:
```
Data\MCM\Settings\MM_MyModMCMQuest.ini
```

You can read this file to debug persisted values, or ship a default INI with preset values:
```ini
[Settings]
DamageMultiplier=1.5
EnableHardMode=False
DifficultyPreset=1
```

Place this in `Data\MCM\Config\MM_MyModMCMQuest.ini` — MCM reads `Config\` as the default and `Settings\` as the user's saved override.

---

## Part 9: Notifying Other Scripts of Settings Changes

When the player changes a setting, you often need to notify other parts of your mod:

```papyrus
; In your MCM script, after applying a change:
State HardModeToggle
    Event OnSelectST()
        EnableHardMode = !EnableHardMode
        SetToggleOptionValueST(EnableHardMode)
        
        ; Notify your main quest script of the change
        Quest mainQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest
        (mainQuest.GetAlias(0) as MM_MainScript).OnSettingsChanged()
    EndEvent
EndState
```

Use a dedicated `OnSettingsChanged()` function in your main script that re-reads all MCM properties and applies them — keeps your logic clean and centralized.

---

## Part 10: Testing Checklist

- [ ] MCM page appears in the pause menu under your mod name
- [ ] All controls display default values on first open
- [ ] Changing a slider/toggle updates the displayed value
- [ ] Settings persist after saving and reloading the game
- [ ] Settings persist after quitting and reopening the game
- [ ] `OnVersionUpdate` fires correctly after bumping plugin version
- [ ] Mod functions correctly when MCM is NOT installed (GlobalVariable fallback)
- [ ] No Papyrus errors in log when opening/closing the MCM page
- [ ] Key bindings save and restore correctly
- [ ] Default button resets all values to defaults

---

*Last updated: May 2026. Requires MCM NG (NG/1.11.x build from Nexus), F4SE 0.7.7, Addictol.*
