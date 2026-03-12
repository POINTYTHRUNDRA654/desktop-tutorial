# Fallout 4 Papyrus Scripting Quick Reference

## What is Papyrus?
Papyrus is Bethesda's scripting language used in all modern BGS games.
Scripts are written in `.psc` (source) files and compiled to `.pex` (bytecode).

## Script hierarchy
```
Fallout4.esm
  └── <YourScript> extends <BaseType>
```
Every script must declare its base type.  The most common ones:

| Base Type         | Used for                                        |
|-------------------|-------------------------------------------------|
| ObjectReference   | Placed objects, activators, containers, lights  |
| Actor             | NPCs and the player                             |
| Weapon            | Weapons                                         |
| Armor             | Apparel / armor                                 |
| Quest             | Quest management and stage fragments            |
| ReferenceAlias    | Quest alias scripts (actor or ref)              |
| ActiveMagicEffect | Spell and magic-effect scripts                  |
| Terminal          | Terminal menu scripts                           |
| Holotape          | Holotape game / recording scripts               |
| WorkshopScript    | Settlement / workshop object scripts            |

## File locations
```
Data/
  Scripts/
    <ScriptName>.pex          ← compiled bytecode (distribute this)
    Source/
      User/
        <ScriptName>.psc      ← source (do NOT distribute normally)
```

## Compilation

### Creation Kit (recommended)
1. Gameplay → Papyrus Script Manager
2. Right-click → New Script (or open an existing one)
3. Ctrl+S to save, then right-click → Compile

### Command line
```bat
PapyrusCompiler.exe "Data\Scripts\Source\User\MyScript.psc" ^
  -f="Institute_Papyrus_Flags.flg" ^
  -i="Data\Scripts\Source\User;Data\Scripts\Source\Base" ^
  -o="Data\Scripts"
```
The flag file is in `<CK install>\Data\Scripts\Source\Base\`.

## Attaching a script to a form
1. Open the form in the CK (double-click NPC, container, etc.)
2. Click the **Scripts** tab
3. Click **Add** → type the script name → OK
4. Fill in **Properties** (drag-drop references from the CK Reference window)

## Common events

| Event                          | When it fires                         |
|--------------------------------|---------------------------------------|
| OnInit()                       | Object first created in the world     |
| OnLoad()                       | Object loads into memory (cell attach)|
| OnActivate(ObjectRef)          | Player / NPC interacts with object    |
| OnTriggerEnter(ObjectRef)      | Object enters trigger volume          |
| OnTriggerLeave(ObjectRef)      | Object leaves trigger volume          |
| OnOpen(ObjectRef)              | Container or door opened              |
| OnClose(ObjectRef)             | Container or door closed              |
| OnDeath(Actor killer)          | Actor dies                            |
| OnEquipped(Actor)              | Weapon or armor equipped              |
| OnUnequipped(Actor)            | Weapon or armor removed               |
| OnEffectStart(Actor, Actor)    | Magic effect begins                   |
| OnEffectFinish(Actor, Actor)   | Magic effect ends                     |
| OnUpdate()                     | Repeating timer (must RegisterForUpdate) |
| OnWorkshopObjectPlaced(WS)     | Settlement object placed              |
| OnPowerOn(ObjectRef generator) | Power connected                       |
| OnPowerOff()                   | Power cut                             |

## Useful global functions
```papyrus
Game.GetPlayer()                   ; → Actor  (the player)
Game.GetCurrentGameTime()          ; → Float  (days since game start)
Debug.Notification("text")         ; show message top-left
Debug.MessageBox("text")           ; blocking popup
Debug.Trace("log", 0)              ; write to Papyrus log
Utility.Wait(seconds)              ; pause script (blocking)
Utility.WaitRealTime(seconds)      ; pause in real time
```

## Properties
Properties are script variables that can be drag-dropped in the CK:
```papyrus
; Basic property – must be filled in CK
ObjectReference Property MyDoor Auto

; Property with default value
Int Property SpawnCount = 3 Auto

; Conditional (show/hide in CK based on value)
Bool Property bEnabled = true Auto Conditional

; Hidden (not shown in CK property window)
Bool bHasTriggered = false
```

## Tips for FO4 quest mods
- Use **ReferenceAlias** scripts for quest-specific NPC/object behaviour.
- Stage fragments (`Fragment_Stage_XX_Item_YY`) are auto-called by the CK
  when you set a quest stage – no manual wiring needed.
- Use `RegisterForRemoteEvent(akRef, "EventName")` to listen to events on
  objects you don't directly own.
- Always unregister in `OnAliasReset()` / `OnEffectFinish()` to avoid leaks.
- The Papyrus log is at: `%LOCALAPPDATA%\Fallout4\Logs\Script\Papyrus.0.log`

## Template scripts available in FO4 Mod Assistant
- ObjectReference, Weapon, Armor, Activator, Container, Door
- Quest, MagicEffect, AliasActor, AliasRef
- Terminal, Holotape, Workshop, NPC
