Scriptname MCM:BaseScript extends Quest Native Hidden

; ── Pages ────────────────────────────────────────────────────────────────────
String[] Property Pages Auto

; ── Fill mode constants ───────────────────────────────────────────────────────
Int Property TOP_TO_BOTTOM  = 0 AutoReadOnly
Int Property LEFT_TO_RIGHT  = 1 AutoReadOnly

; ── Option flag constants ─────────────────────────────────────────────────────
Int Property OPTION_FLAG_NONE       = 0x00 AutoReadOnly
Int Property OPTION_FLAG_DISABLED   = 0x01 AutoReadOnly
Int Property OPTION_FLAG_HIDDEN     = 0x02 AutoReadOnly
Int Property OPTION_FLAG_WITH_UNMAP = 0x04 AutoReadOnly

; ── State ─────────────────────────────────────────────────────────────────────
String Property CurrentState Auto

; ── Cursor ────────────────────────────────────────────────────────────────────
Function SetCursorFillMode(Int aiMode) Native
Function SetCursorPosition(Int aiColumn) Native

; ── Option registration ───────────────────────────────────────────────────────
Int Function AddHeaderOption(String asText, Int aiFlags = 0) Native
Int Function AddTextOption(String asText, String asValue, Int aiFlags = 0) Native
Int Function AddToggleOption(String asText, Bool abValue, Int aiFlags = 0) Native
Int Function AddSliderOption(String asText, Float afValue, String asFormatString = "{0}", Int aiFlags = 0) Native
Int Function AddMenuOption(String asText, String asValue, Int aiFlags = 0) Native
Int Function AddColorOption(String asText, Int aiColor, Int aiFlags = 0) Native
Int Function AddKeyMapOption(String asText, Int aiKeyCode, Int aiFlags = 0) Native
Int Function AddEmptyOption() Native

; ── State-based options ───────────────────────────────────────────────────────
Int Function AddToggleOptionST(Int aiOID, String asText, Bool abValue, Int aiFlags = 0) Native
Int Function AddSliderOptionST(Int aiOID, String asText, Float afValue, String asFormatString = "{0}", Int aiFlags = 0) Native
Int Function AddMenuOptionST(Int aiOID, String asText, String asValue, Int aiFlags = 0) Native
Int Function AddTextOptionST(Int aiOID, String asText, String asValue, Int aiFlags = 0) Native

; ── Value setters ─────────────────────────────────────────────────────────────
Function SetToggleOptionValue(Bool abValue, Bool abNoUpdate = False) Native
Function SetSliderOptionValue(Float afValue, String asFormatString = "{0}", Bool abNoUpdate = False) Native
Function SetMenuOptionValue(String asValue, Bool abNoUpdate = False) Native
Function SetTextOptionValue(String asValue, Bool abNoUpdate = False) Native
Function SetColorOptionValue(Int aiColor, Bool abNoUpdate = False) Native
Function SetKeyMapOptionValue(Int aiKeyCode, Bool abNoUpdate = False) Native

; ── State-based value setters ────────────────────────────────────────────────
Function SetToggleOptionValueST(Bool abValue, Bool abNoUpdate = False, Int aiOID = 0) Native
Function SetSliderOptionValueST(Float afValue, String asFormatString = "{0}", Bool abNoUpdate = False, Int aiOID = 0) Native
Function SetMenuOptionValueST(String asValue, Bool abNoUpdate = False, Int aiOID = 0) Native
Function SetTextOptionValueST(String asValue, Bool abNoUpdate = False, Int aiOID = 0) Native

; ── Slider dialog ─────────────────────────────────────────────────────────────
Function SetSliderDialogStartValue(Float afValue) Native
Function SetSliderDialogDefaultValue(Float afValue) Native
Function SetSliderDialogRange(Float afMin, Float afMax) Native
Function SetSliderDialogInterval(Float afInterval) Native

; ── Option info ───────────────────────────────────────────────────────────────
Int    Function GetOption() Native
String Function GetState() Native
Function SetOptionFlags(Int aiOption, Int aiFlags, Bool abNoUpdate = False) Native
Bool   Function GetModSettingBool(String asSettingName) Native
Float  Function GetModSettingFloat(String asSettingName) Native
Int    Function GetModSettingInt(String asSettingName) Native
String Function GetModSettingString(String asSettingName) Native

; ── Events (override these) ──────────────────────────────────────────────────
Event OnConfigInit()
EndEvent
Event OnVersionUpdate(Int aiVersion)
EndEvent
Event OnPageReset(String asPage)
EndEvent
Event OnOptionSelect(Int aiOption)
EndEvent
Event OnOptionDefault(Int aiOption)
EndEvent
Event OnOptionSliderOpen(Int aiOption)
EndEvent
Event OnOptionSliderAccept(Int aiOption, Float afValue)
EndEvent
Event OnOptionMenuOpen(Int aiOption)
EndEvent
Event OnOptionMenuAccept(Int aiOption, Int aiIndex)
EndEvent
Event OnOptionColorOpen(Int aiOption)
EndEvent
Event OnOptionColorAccept(Int aiOption, Int aiColor)
EndEvent
Event OnOptionKeyMapChange(Int aiOption, Int aiKeyCode, String asConflictControl, String asConflictName)
EndEvent
Event OnOptionHighlight(Int aiOption)
EndEvent
; State-based events
Event OnOptionSelectST()
EndEvent
Event OnOptionDefaultST()
EndEvent
Event OnOptionSliderOpenST()
EndEvent
Event OnOptionSliderAcceptST(Float afValue)
EndEvent
Event OnOptionMenuOpenST()
EndEvent
Event OnOptionMenuAcceptST(Int aiIndex)
EndEvent
Event OnOptionHighlightST(Int aiOID)
EndEvent
Event OnHighlightST()
EndEvent
Event OnOptionToggleST()
EndEvent
