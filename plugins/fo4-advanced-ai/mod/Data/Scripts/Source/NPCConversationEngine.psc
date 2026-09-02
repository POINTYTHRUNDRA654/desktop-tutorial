; ═══════════════════════════════════════════════════════════════════════════
; NPCConversationEngine.psc
; Advanced AI System — Dynamic NPC-to-NPC Conversation System
;
; When the player enters a location, this system:
;   1. Scans nearby NPCs for conversation candidates
;   2. Logs the location + NPC list to the Mossy Bridge (via file)
;   3. Reads AI-generated conversation scripts from the bridge output file
;   4. Pairs NPCs and has them deliver lines via timed Say() calls
;
; Requires: PapyrusUtil (JsonUtil) for file I/O
;           F4SE for GetActorsInRange
;           Mossy Bridge running in background
;
; Attach to: AdvancedAIManager quest (same quest)
; ═══════════════════════════════════════════════════════════════════════════
Scriptname NPCConversationEngine extends Quest

; ── Configuration ─────────────────────────────────────────────────────────────
float Property ConversationRadius      = 1200.0 Auto; How close NPCs must be; How close NPCs must be; How close NPCs must be; How close NPCs must be
float Property ConversationCooldown    = 180.0  Auto; Real seconds between conv cycles; Real seconds between conv cycles; Real seconds between conv cycles; Real seconds between conv cycles
int   Property MaxConversations        = 3      Auto; Max simultaneous conversations; Max simultaneous conversations; Max simultaneous conversations; Max simultaneous conversations
int   Property MaxNPCsToScan           = 12     Auto; NPC scan limit (performance); NPC scan limit (performance); NPC scan limit (performance); NPC scan limit (performance)
bool  Property Enabled                 = True   Auto
bool Property _debugMode                   = False  Auto

; ── File Paths (written by Mossy Bridge) ──────────────────────────────────────
; PapyrusUtil reads from Fallout4\Data\ or absolute path via JsonUtil
string Property ConversationFilePath = "AdvancedAI_Conversations.json" Auto Const
string Property RequestFilePath      = "AdvancedAI_ConvRequest.json"   Auto Const

; ── Topics (generic topic containers that hold our dynamic lines) ─────────────
; These are vanilla-compatible topic containers set up in the CK
; We use the SetActorValue / Say combo with generic idle marker topics
Topic Property topicIdleGenericA Auto; idle_generic_topic_A (no conditions, always available); idle_generic_topic_A (no conditions, always available); idle_generic_topic_A (no conditions, always available); idle_generic_topic_A (no conditions, always available)
Topic Property topicIdleGenericB Auto; idle_generic_topic_B; idle_generic_topic_B; idle_generic_topic_B; idle_generic_topic_B
Topic Property topicIdleGenericC Auto; idle_generic_topic_C; idle_generic_topic_C; idle_generic_topic_C; idle_generic_topic_C
Topic Property topicIdleGenericD Auto; idle_generic_topic_D; idle_generic_topic_D; idle_generic_topic_D; idle_generic_topic_D

; ── State ─────────────────────────────────────────────────────────────────────
float _lastConversationTime = 0.0
bool  _conversationActive   = False
int   _totalConversations   = 0

; Active conversation tracking
Actor[] _speakerPairA; Speaker A for each active conversation; Speaker A for each active conversation; Speaker A for each active conversation; Speaker A for each active conversation
Actor[] _speakerPairB; Speaker B for each active conversation; Speaker B for each active conversation; Speaker B for each active conversation; Speaker B for each active conversation

; ════════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !Enabled
        Return
    EndIf

    _speakerPairA = new Actor[3]
    _speakerPairB = new Actor[3]

    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    RegisterForPlayerTeleport(); fires on fast travel, load doors, moveto
    ScheduleTick(0.5); Poll for new conversations every ~12 min game time; Poll for new conversations every ~12 min game time; Poll for new conversations every ~12 min game time; Poll for new conversations every ~12 min game time

    ConvLog("NPC Conversation Engine initialized")
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; LOCATION CHANGE — Trigger new conversation generation
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    If !Enabled || akNewLoc == None
        Return
    EndIf

    Utility.Wait(3.0); Let the cell load fully; Let the cell load fully; Let the cell load fully; Let the cell load fully

    String locationName = akNewLoc.GetName()
    If locationName == ""
        locationName = "Unknown Location"
    EndIf

    ; Classify location type
    String locType = ClassifyLocation(akNewLoc)

    ConvLog("Entered: " + locationName + " (" + locType + ")")

    ; Request new conversations from the bridge
    RequestConversations(locationName, locType)
EndEvent

Event OnPlayerTeleport()
    Utility.Wait(4.0)
    Actor player = Game.GetPlayer()
    Location curLoc = player.GetCurrentLocation()
    If curLoc != None
        RequestConversations(curLoc.GetName(), ClassifyLocation(curLoc))
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; PERIODIC POLL — Read bridge output file for conversations
; ════════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !Enabled
        ScheduleTick(0.5)
        Return
    EndIf

    ; Check cooldown
    Float now = Utility.GetCurrentRealTime()
    If (now - _lastConversationTime) < ConversationCooldown
        ScheduleTick(0.5)
        Return
    EndIf

    ; Check if bridge has generated new conversations
    ; JsonUtil reads the JSON file written by the bridge
    If JsonUtil.JsonExists(ConversationFilePath)
        Int convCount = JsonUtil.GetIntField(ConversationFilePath, "ready")
        If convCount > 0
            StartConversations()
        EndIf
    EndIf

    ScheduleTick(0.5)
EndFunction
; ════════════════════════════════════════════════════════════════════════════
; REQUEST — Write request file for the bridge to process
; ════════════════════════════════════════════════════════════════════════════
Function RequestConversations(String locationName, String locType)
    ; Scan nearby NPCs
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, ConversationRadius, MaxNPCsToScan)

    ; Build NPC list string for the request (pipe-delimited)
    String npcList = ""
    Int validCount = 0
    Int i = 0
    While i < nearby.Length && validCount < MaxNPCsToScan
        Actor npc = nearby[i]
        If npc != None && npc != player && !npc.IsDead() && !npc.IsInCombat() && npc.IsPlayerTeammate() == False
            ; Format: npc_id|npc_name|faction
            String npcEntry = ("" + npc.GetActorBase().GetFormID()) + "|" + npc.GetDisplayName() + "|" + GetActorFaction(npc)
            If npcList == ""
                npcList = npcEntry
            Else
                npcList = npcList + ";" + npcEntry
            EndIf
            validCount += 1
        EndIf
        i += 1
    EndWhile

    If validCount < 2
        ConvLog("Not enough NPCs for conversation at " + locationName)
        Return
    EndIf

    ; Write request to file (bridge reads this via its log watcher)
    ; We log a special tagged line the bridge parses
    Debug.Trace("[AAI-CONV] REQUEST|location=" + locationName + "|type=" + locType + "|npc_count=" + validCount + "|npcs=" + npcList)

    ConvLog("Requested " + validCount + " NPCs for conversation at " + locationName)
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; START CONVERSATIONS — Read from bridge output file and execute
; ════════════════════════════════════════════════════════════════════════════
Function StartConversations()
    If _conversationActive
        Return
    EndIf

    ; Read conversation count from file
    Int convCount = JsonUtil.GetIntField(ConversationFilePath, "conversations.length")
    If convCount <= 0
        Return
    EndIf

    _conversationActive = True
    _lastConversationTime = Utility.GetCurrentRealTime()

    Int i = 0
    While i < convCount && i < MaxConversations
        ; Read conversation data
        String convId    = JsonUtil.GetStringField(ConversationFilePath, "conversations[" + i + "].conversation_id")
        String npcAName  = JsonUtil.GetStringField(ConversationFilePath, "conversations[" + i + "].npc_a_name")
        String npcBName  = JsonUtil.GetStringField(ConversationFilePath, "conversations[" + i + "].npc_b_name")
        Bool delivered   = JsonUtil.GetIntField(ConversationFilePath, "conversations[" + i + "].delivered") > 0

        If !delivered && npcAName != "" && npcBName != ""
            ; Find the actual Actor refs by display name
            Actor npcA = FindNPCByName(npcAName)
            Actor npcB = FindNPCByName(npcBName)

            If npcA != None && npcB != None
                ; Launch conversation asynchronously
                ExecuteConversation(npcA, npcB, ConversationFilePath, i)
                _totalConversations += 1
                ConvLog("Started conversation: " + npcAName + " <-> " + npcBName)
            EndIf
        EndIf
        i += 1
    EndWhile

    _conversationActive = False
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; EXECUTE — Have two NPCs deliver their conversation lines
; ════════════════════════════════════════════════════════════════════════════
Function ExecuteConversation(Actor npcA, Actor npcB, String filePath, Int convIndex)
    ; Turn NPCs toward each other
    npcA.SetLookAt(npcB)
    npcB.SetLookAt(npcA)

    ; Get line count
    Int lineCount = JsonUtil.GetIntField(filePath, "conversations[" + convIndex + "].lines.length")
    If lineCount <= 0
        Return
    EndIf

    ; Deliver each line with timing
    Int j = 0
    While j < lineCount
        String speaker = JsonUtil.GetStringField(filePath, "conversations[" + convIndex + "].lines[" + j + "].speaker_id")
        String line    = JsonUtil.GetStringField(filePath, "conversations[" + convIndex + "].lines[" + j + "].line")

        If line != ""
            Actor activeSpeaker = npcA
            If speaker == "npc_b"
                activeSpeaker = npcB
            EndIf

            ; Stop if NPC died or entered combat during conversation
            If activeSpeaker.IsDead() || activeSpeaker.IsInCombat()
                Return
            EndIf

            ; Deliver the line via subtitles/notification
            ; In a full CK build this uses custom topic containers with the line
            ; For the bridge version, we display as a subtitle notification
            ShowConversationLine(activeSpeaker.GetDisplayName(), line)

            ; Wait based on line length (roughly 1 word = 0.4 seconds)
            Float waitTime = Math.Max(StringUtil.GetLength(line) as Float * 0.07, 2.5)
            Utility.Wait(waitTime)
        EndIf
        j += 1
    EndWhile

    ; Mark as delivered in the file
    Debug.Trace("[AAI-CONV] DELIVERED|conv_id=" + JsonUtil.GetStringField(filePath, "conversations[" + convIndex + "].conversation_id"))

    ; Release look-at
    npcA.ClearLookAt()
    npcB.ClearLookAt()
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DISPLAY — Show conversation line (subtitle-style)
; Uses FallUI Message or vanilla Debug.Notification
; Modders with FallUI can replace this with proper subtitle system
; ════════════════════════════════════════════════════════════════════════════
Function ShowConversationLine(String speakerName, String line)
    ; Format: [Name]: Line — displays briefly in HUD
    ; FallUI users: replace with UIExtensions.OpenMenu("UIWheelMenu") or similar
    Debug.Notification("[" + speakerName + "]: " + line)
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; HELPERS
; ════════════════════════════════════════════════════════════════════════════
Actor Function FindNPCByName(String displayName)
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, ConversationRadius, MaxNPCsToScan)
    Int i = 0
    While i < nearby.Length
        If nearby[i] != None && nearby[i].GetDisplayName() == displayName
            Return nearby[i]
        EndIf
        i += 1
    EndWhile
    Return None
EndFunction

String Function GetActorFaction(Actor akTarget)
    ; Returns the name of the first faction the actor belongs to
    ; In a full implementation, iterate akTarget.GetFactions() and find the primary one
    Return "Unknown"
EndFunction

String Function ClassifyLocation(Form loc)
    If loc == None
        Return "wasteland"
    EndIf
    String name = loc.GetName(); F4SE Form.GetName — works for Location and ObjectReference
    If StringUtil.Find(name, "Diamond City") >= 0 || StringUtil.Find(name, "Goodneighbor") >= 0 || StringUtil.Find(name, "Vault") >= 0
        Return "city"
    ElseIf StringUtil.Find(name, "Bar") >= 0 || StringUtil.Find(name, "Dugout") >= 0 || StringUtil.Find(name, "Third Rail") >= 0
        Return "bar_tavern"
    ElseIf StringUtil.Find(name, "Castle") >= 0 || StringUtil.Find(name, "Prydwen") >= 0 || StringUtil.Find(name, "Outpost") >= 0
        Return "military"
    ElseIf StringUtil.Find(name, "Settlement") >= 0 || StringUtil.Find(name, "Sanctuary") >= 0 || StringUtil.Find(name, "Tenpines") >= 0
        Return "settlement"
    EndIf
    Return "wasteland"
EndFunction

Function ConvLog(String msg)
    If _debugMode
        Debug.Trace("[AAI-CONV] " + msg)
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; PUBLIC API — for other mods
; ════════════════════════════════════════════════════════════════════════════
Int Function GetTotalConversations()
    Return _totalConversations
EndFunction

Function ForceConversationAt(Actor npcA, Actor npcB, String topicText)
    ; Other mods can force a specific conversation pair ("topic" shadows the Topic script type)
    ; topicText is sent to the bridge which generates it on demand
    Debug.Trace("[AAI-CONV] FORCE|npc_a=" + npcA.GetDisplayName() + "|npc_b=" + npcB.GetDisplayName() + "|topic=" + topicText)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        DoGameTimeTick()
    EndIf
EndEvent
