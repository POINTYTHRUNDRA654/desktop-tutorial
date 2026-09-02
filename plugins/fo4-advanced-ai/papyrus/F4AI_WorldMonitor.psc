Scriptname F4AI:F4AI_WorldMonitor extends ReferenceAlias
; Timer uses Utility.Wait loop with generation counter (RegisterForUpdate not on ReferenceAlias in FO4)
; Bound to PlayerRef via Data/Hydra/ScriptObjects/F4AI_Monitors.json
; No CK quest attachment needed — Hydra Script Object Runner handles binding.
;
; Responsibilities:
;   - Read Seasons Change globals for current season (Spring/Summer/Fall/Winter)
;   - Track current weather, time of day, and player playerRegion
;   - Write Data/F4AI/world_state.json every 30s — all other monitors read this
;   - Send world context updates to Mossy bridge
;
; Weather classification via vanilla Weather.GetClassification():
;   0 = Pleasant, 1 = Cloudy, 2 = Rainy, 3 = Snow

; ── Properties ────────────────────────────────────────────────────────────────

String Property WorldStatePath  = "Data/F4AI/world_state.json"    Auto Const
String Property WorldEventPath  = "Data/F4AI/world_event.json"    Auto Const
String Property WorldOutputPath = "Data/F4AI/world_directive.json" Auto Const
Float  Property UpdateInterval  = 30.0  Auto
Bool   Property EnableWorldAI   = true  Auto

; Seasons.esm GlobalSeason — local FormID 0x002B1E3D, values: 0=Spring 1=Summer 2=Fall 3=Winter
GlobalVariable Property SC_Season      Auto
; GameDaysPassed: vanilla FO4, FormID 0x0000010D — used to derive season day
GlobalVariable Property GameDaysPassed Auto
; GameHour global — vanilla FO4, FormID 0x00000039
GlobalVariable Property GameHour Auto
Int            Property _loopGen  = 0 Auto Hidden  ; incremented each InitMonitor to kill stale loops

; ── Lifecycle ─────────────────────────────────────────────────────────────────

Event OnInit()
    InitMonitor()
EndEvent

Event OnPlayerLoadGame()
    _loopGen += 1000
    Int myGen = _loopGen
    Utility.Wait(3.0)
    if (myGen != _loopGen)
        return
    endif
    if (EnableWorldAI)
        MonitorLoop(myGen)
    endif
EndEvent

Function InitMonitor()
    _loopGen += 1
    Int myGen = _loopGen
    if (EnableWorldAI)
        GameHour       = Game.GetForm(0x00000039) as GlobalVariable
        GameDaysPassed = Game.GetForm(0x0000010D) as GlobalVariable
        SC_Season      = Game.GetFormFromFile(0x002B1E3D, "Seasons.esm") as GlobalVariable
        if (myGen != _loopGen)
            return
        endif
        WriteWorldState()
        MonitorLoop(myGen)
    endif
EndFunction

Function MonitorLoop(Int myGen)
    While (myGen == _loopGen)
        if (EnableWorldAI)
            WriteWorldState()
            if (Hydra:IO:File.Exists(WorldOutputPath))
                ProcessWorldDirective()
            endif
        endif
        Utility.Wait(UpdateInterval)
        if (myGen != _loopGen)
            return
        endif
    EndWhile
EndFunction

; ── World State ───────────────────────────────────────────────────────────────

Function WriteWorldState()
    String season    = GetSeasonName()
    Int    seasonDay = GetSeasonDay()
    String weatherStr = GetWeatherName()
    String timeOfDay = GetTimeOfDay()
    Float  curHour   = GetGameHour()
    String playerRegion   = GetPlayerRegion()
    Bool   isRaining  = IsRaining()
    Bool   isStorming = IsStorming()
    Bool   isNight    = curHour >= 20.0 || curHour < 6.0

    ; Player context — faction, level, active DLCs
    String playerFaction = GetPlayerFaction()
    Int    playerLevel   = Game.GetPlayer().GetLevel()
    String dlcFlags      = GetActiveDLCs()

    ; Share world state via SaveMap for other monitors to read
    Hydra:SaveMap.SetValue("F4AI_S", "world_season",         season as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_weather",        weatherStr as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_timeofday",      timeOfDay as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_hour",           curHour as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_isnight",        isNight as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_israining",      isRaining as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_player_faction", playerFaction as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_player_level",   playerLevel as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "world_ecoRegion",      playerRegion as Var)

    ; Write JSON for file-based IPC (bridge + other Papyrus scripts read this)
    String json = "{"
    json += "\"season\": \"" + season + "\","
    json += "\"season_day\": " + seasonDay + ","
    json += "\"weather\": \"" + weatherStr + "\","
    json += "\"time_of_day\": \"" + timeOfDay + "\","
    json += "\"game_hour\": " + curHour + ","
    json += "\"is_night\": " + BoolToStr(isNight) + ","
    json += "\"is_raining\": " + BoolToStr(isRaining) + ","
    json += "\"is_storming\": " + BoolToStr(isStorming) + ","
    json += "\"player_region\": \"" + playerRegion + "\","
    json += "\"player_level\": " + playerLevel + ","
    json += "\"player_faction\": \"" + playerFaction + "\","
    json += "\"dlc\": \"" + dlcFlags + "\""
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "WorldState")
    Hydra:IO:File.WriteAllText(WorldStatePath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "WorldState")

    ; Push world update event to bridge so Mossy stays in sync
    String eventJson = "{"
    eventJson += "\"event_type\": \"world_update\","
    eventJson += "\"season\": \"" + season + "\","
    eventJson += "\"weather\": \"" + weatherStr + "\","
    eventJson += "\"time_of_day\": \"" + timeOfDay + "\","
    eventJson += "\"is_night\": " + BoolToStr(isNight) + ","
    eventJson += "\"is_raining\": " + BoolToStr(isRaining) + ","
    eventJson += "\"player_playerRegion\": \"" + playerRegion + "\""
    eventJson += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(WorldEventPath, eventJson)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")

    Debug.Trace("[F4AI_World] State updated — " + season + " / " + weatherStr + " / " + timeOfDay)
EndFunction

Function ProcessWorldDirective()
    Hydra:IO:Json.Cache_TempMap(WorldOutputPath)
    String directive    = Hydra:MemMap.GetValue(WorldOutputPath, "/directive") as String
    String targetWeather = Hydra:MemMap.GetValue(WorldOutputPath, "/weather_type") as String
    Float  targetHour    = Hydra:MemMap.GetValue(WorldOutputPath, "/target_hour") as Float
    Hydra:IO:Json.Uncache_TempMap(WorldOutputPath)
    Hydra:IO:File.Delete(WorldOutputPath)

    if (directive == "force_weather")
        ApplyWeatherDirective(targetWeather)
    elseif (directive == "time_skip")
        Debug.Trace("[F4AI_World] Time skip directive received — hour " + targetHour)
    endif
EndFunction

; ── Season ────────────────────────────────────────────────────────────────────

String Function GetSeasonName()
    if (SC_Season == None)
        return "Unknown"
    endif
    Int s = SC_Season.GetValue() as Int
    if (s == 0)
        return "Spring"
    elseif (s == 1)
        return "Summer"
    elseif (s == 2)
        return "Fall"
    elseif (s == 3)
        return "Winter"
    endif
    return "Unknown"
EndFunction

Int Function GetSeasonDay()
    ; Seasons.esm has no season-day global — derive from total days elapsed mod 30
    if (GameDaysPassed == None)
        return 0
    endif
    return (GameDaysPassed.GetValue() as Int) % 30
EndFunction

; ── Weather ───────────────────────────────────────────────────────────────────
; Uses vanilla Weather.GetClassification(): 0=Pleasant, 1=Cloudy, 2=Rainy, 3=Snow

String Function GetWeatherName()
    Weather w = Weather.GetCurrentWeather()
    if (w == None)
        return "Clear"
    endif
    ; Check specific known weathers first
    if (w == Game.GetForm(0x000CC800) as Weather)
        return "Radstorm"
    endif
    if (w == Game.GetForm(0x00034584) as Weather)
        return "Rain"
    endif
    if (w == Game.GetForm(0x00023EF0) as Weather)
        return "Fog"
    endif
    ; Use vanilla classification for snow detection
    Int classification = w.GetClassification()
    if (classification == 3)
        return "Snow"
    endif
    String wName = w.GetName()
    if (wName != "")
        return wName
    endif
    return "Overcast"
EndFunction

Bool Function IsRaining()
    Weather w = Weather.GetCurrentWeather()
    if (w == None)
        return false
    endif
    return w.GetClassification() == 2  ; 2 = Rainy
EndFunction

Bool Function IsStorming()
    Weather w = Weather.GetCurrentWeather()
    if (w == None)
        return false
    endif
    if (w == Game.GetForm(0x000CC800) as Weather)
        return true  ; Radstorm always counts as storm
    endif
    return w.GetClassification() == 2  ; heavy rain as storm fallback
EndFunction

Function ApplyWeatherDirective(String weatherType)
    ; NOTE: ForceWeather is not available in vanilla FO4 Papyrus — requires F4SE.
    ; Directive is received and logged; external bridge can apply via RCON if needed.
    Debug.Trace("[F4AI_World] Weather directive received (ForceWeather requires F4SE — skipped): " + weatherType)
EndFunction

; ── Time of Day ───────────────────────────────────────────────────────────────

Float Function GetGameHour()
    if (GameHour == None)
        return 12.0
    endif
    return GameHour.GetValue()
EndFunction

String Function GetTimeOfDay()
    Float h = GetGameHour()
    if (h >= 5.0 && h < 8.0)
        return "Dawn"
    elseif (h >= 8.0 && h < 12.0)
        return "Morning"
    elseif (h >= 12.0 && h < 17.0)
        return "Afternoon"
    elseif (h >= 17.0 && h < 20.0)
        return "Dusk"
    elseif (h >= 20.0 && h < 23.0)
        return "Evening"
    endif
    return "Night"
EndFunction

; ── Region ────────────────────────────────────────────────────────────────────

String Function GetPlayerRegion()
    Actor player = Game.GetPlayer()
    Location loc = player.GetCurrentLocation()
    if (loc == None)
        return "The Commonwealth"
    endif
    String locName = loc.GetName()
    if (locName == "")
        return "The Commonwealth"
    endif
    if (Hydra:Strings.IndexOf(locName, "Harbor") != -1)
        return "Far Harbor"
    elseif (Hydra:Strings.IndexOf(locName, "Nuka") != -1)
        return "Nuka-World"
    elseif (Hydra:Strings.IndexOf(locName, "Glowing Sea") != -1)
        return "Glowing Sea"
    elseif (Hydra:Strings.IndexOf(locName, "Institute") != -1)
        return "The Institute"
    elseif (Hydra:Strings.IndexOf(locName, "Diamond City") != -1)
        return "Diamond City"
    elseif (Hydra:Strings.IndexOf(locName, "Goodneighbor") != -1)
        return "Goodneighbor"
    endif
    return locName
EndFunction

; ── Player Context ────────────────────────────────────────────────────────────

String Function GetPlayerFaction()
    Actor player = Game.GetPlayer()
    Faction minutemen = Game.GetForm(0x0002A8A8) as Faction
    Faction bos       = Game.GetForm(0x0001AEBE) as Faction
    Faction railroad  = Game.GetForm(0x000403C5) as Faction
    Faction institute = Game.GetForm(0x000362FE) as Faction
    if (player.IsInFaction(institute))
        return "Institute"
    elseif (player.IsInFaction(bos))
        return "Brotherhood of Steel"
    elseif (player.IsInFaction(railroad))
        return "Railroad"
    elseif (player.IsInFaction(minutemen))
        return "Minutemen"
    endif
    return "None"
EndFunction

String Function GetActiveDLCs()
    ; Detect installed DLCs by probing for their main archive files via Hydra.
    ; These BA2s only exist on disk when the DLC is genuinely installed.
    String result = ""
    if (Hydra:IO:File.Exists("Data/DLCCoast - Main.ba2"))
        result += "Far Harbor,"
    endif
    if (Hydra:IO:File.Exists("Data/DLCNukaWorld - Main.ba2"))
        result += "Nuka-World,"
    endif
    if (Hydra:IO:File.Exists("Data/DLCRobot - Main.ba2"))
        result += "Automatron,"
    endif
    if (Hydra:IO:File.Exists("Data/DLCworkshop01 - Main.ba2"))
        result += "Wasteland Workshop,"
    endif
    if (result == "")
        return "Base Game Only"
    endif
    return result
EndFunction

; ── Helpers ───────────────────────────────────────────────────────────────────

String Function BoolToStr(Bool b)
    if (b)
        return "true"
    endif
    return "false"
EndFunction
