Scriptname F4AI:F4AI_StatusHolotape extends Quest
{ Pip-Boy holotape: reads Data/F4AI/bridge_status.json and displays
  a live status screen when the player plays the holotape in their inventory.

  CK SETUP REQUIRED:
    1. Create a new Holotape item (Misc > Holotapes)
    2. Set Name: "F4AI Status Holotape"
    3. Set Type: Terminal
    4. Add one terminal menu page, one option: "Check AI Status"
    5. Set option script: call ShowBridgeStatus() on this quest script
    6. Add the holotape to the player's inventory via a startup script or vendor
}

; Forward slashes work on Windows and avoid Papyrus escape issues
String Property StatusFilePath = "Data/F4AI/bridge_status.json" Auto Const

; ── Holotape menu entry point ────────────────────────────────────────────────

Function ShowBridgeStatus()
    String statusJson = ""

    if (Hydra:IO:File.Exists(StatusFilePath))
        statusJson = Hydra:IO:File.ReadAllText(StatusFilePath)
    endif

    if (statusJson == "")
        Debug.MessageBox( \
            "F4AI BRIDGE STATUS\n" + \
            "==================\n\n" + \
            "No data yet.\n\n" + \
            "The bridge has not processed any requests.\n\n" + \
            "Make sure:\n" + \
            "  - MOSSY_LAUNCH.bat was run before Fallout 4\n" + \
            "  - Fallout4_AI_Engine.exe is visible in Task Manager\n" + \
            "  - Mossy server is running at 127.0.0.1:8765")
        return
    endif

    String srcField   = _ExtractField(statusJson, "source")
    String npcName    = _ExtractField(statusJson, "npc")
    String npcLocation = _ExtractField(statusJson, "location")
    String timestamp  = _ExtractField(statusJson, "timestamp")
    String response   = _ExtractField(statusJson, "response")

    ; Truncate response if very long so the box stays readable
    Int maxLen = 80
    if (Hydra:Strings.Size(response) > maxLen)
        response = Hydra:Strings.Substring(response, 0, maxLen) + "..."
    endif

    String sourceLine = ""
    if (srcField == "MOSSY")
        sourceLine = "ONLINE  [MOSSY connected]"
    elseif (srcField == "LOCAL")
        sourceLine = "OFFLINE [Fell back to local LLM]"
    else
        sourceLine = "UNKNOWN"
    endif

    Debug.MessageBox( \
        "F4AI BRIDGE STATUS\n" + \
        "==================\n\n" + \
        "Bridge  : " + sourceLine + "\n\n" + \
        "Last request\n" + \
        "  NPC      : " + npcName + "\n" + \
        "  Location : " + npcLocation + "\n" + \
        "  Time     : " + timestamp + "\n\n" + \
        "Last response\n" + \
        "  " + response)
EndFunction

; ── Memory storage status ────────────────────────────────────────────────────

Function ShowMemoryStatus()
    String memBase = "Data/F4AI/"
    Int memCount = 0

    ; Count a few known NPC memory files to give a rough idea
    String[] knownNPCs = new String[8]
    knownNPCs[0] = "Curie"
    knownNPCs[1] = "Codsworth"
    knownNPCs[2] = "Piper"
    knownNPCs[3] = "Nick_Valentine"
    knownNPCs[4] = "Cait"
    knownNPCs[5] = "Hancock"
    knownNPCs[6] = "Danse"
    knownNPCs[7] = "MacCready"

    String foundList = ""
    Int i = 0
    While (i < 8)
        String memPath = memBase + "NPC_Memories/" + knownNPCs[i] + ".json"
        if (Hydra:IO:File.Exists(memPath))
            memCount += 1
            foundList += "  " + knownNPCs[i] + "\n"
        endif
        i += 1
    EndWhile

    String memDisplay = ""
    if (memCount == 0)
        memDisplay = "No NPC memory files found yet.\nMemories will appear here after first conversations."
    else
        memDisplay = "NPCs with saved memory (" + memCount + "):\n" + foundList
    endif

    Debug.MessageBox( \
        "F4AI MEMORY STORAGE\n" + \
        "===================\n\n" + \
        "Location: Data/F4AI/\n\n" + \
        memDisplay)
EndFunction

; ── Private JSON field extractor ─────────────────────────────────────────────

String Function _ExtractField(String jsonText, String fieldKey)
    String searchKey = "\"" + fieldKey + "\": \""
    Int keyPos = Hydra:Strings.IndexOf(jsonText, searchKey)
    if (keyPos == -1)
        return ""
    endif
    Int valueStart = keyPos + Hydra:Strings.Size(searchKey)
    Int valueEnd = Hydra:Strings.IndexOf(jsonText, "\"", valueStart)
    if (valueEnd <= valueStart)
        return ""
    endif
    return Hydra:Strings.Substring(jsonText, valueStart, valueEnd - valueStart)
EndFunction
