; ═══════════════════════════════════════════════════════════════════════════
; AIConfigMCM.psc
; Advanced AI System — MCM Configuration Script (FO4 MCM Helper)
;
; Requires: MCM Helper for FO4 by Neanka
;           https://www.nexusmods.com/fallout4/mods/21497
;
; UI layout is driven entirely by MCM/Config/AdvancedAI/config.json.
; This script only handles side effects: button presses and property sync.
; Do NOT add AddHeaderOption / SetCursorFillMode calls here — those are
; the Skyrim MCM pattern and are not needed when config.json drives layout.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AIConfigMCM extends MCM:BaseScript

Quest Property AAIQuest    Auto
AdvancedAIManager Property AAIManager Auto

; ════════════════════════════════════════════════════════════════════════════
; OnConfigInit — called once when MCM registers this mod.
; No page/option registration here: config.json handles all layout.
; ════════════════════════════════════════════════════════════════════════════
Event OnConfigInit()
    ; Nothing to register — layout is fully defined in config.json
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; OnPageReset — only handle button-style options that config.json can't
; execute directly (force-refresh, message box help text, etc.).
; ════════════════════════════════════════════════════════════════════════════
Event OnPageReset(String page)
    ; All toggle/slider state is read from AAIManager properties via config.json
    ; bindings. Only wire up action buttons below.
    If page == "main"
        AddTextOptionST("BTN_REFRESH",     "Force Refresh All AI",  "Refresh Now")
    ElseIf page == "bridge"
        AddTextOptionST("BTN_BRIDGE_HELP", "How to connect Mossy",  "View Instructions")
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; Button presses
; ════════════════════════════════════════════════════════════════════════════
Event OnOptionSelectST()
    string stateVal = CurrentState
    If stateVal == "BTN_REFRESH"
        AAIManager.MCM_ForceRefresh()
    ElseIf stateVal == "BTN_BRIDGE_HELP"
        Debug.MessageBox("To connect Mossy:\n1. Open Mossy\n2. Go to FO4 Bridge tab\n3. Click Connect\n4. The bridge reads your Papyrus log at:\nDocuments\\My Games\\Fallout4\\Logs\\Script\\Papyrus.0.log")
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; Toggle changes — config.json binds directly to AAIManager properties,
; so these handlers only need to fire side-effect logic (not property sets).
; ════════════════════════════════════════════════════════════════════════════
Event OnOptionToggleST()
    string stateVal = CurrentState
    If stateVal == "TOGGLE_MASTER"
        ; MCM Helper already wrote the new value to AAIManager.AAI_Enabled.
        ; Call the side-effect method so dependents react.
        AAIManager.MCM_SetEnabled(AAIManager.AAI_Enabled)
        SetToggleOptionValueST(AAIManager.AAI_Enabled)
    EndIf
    ; All other toggles are plain property writes — config.json handles them.
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; Slider changes — propagate to difficulty calculator on any slider edit.
; ════════════════════════════════════════════════════════════════════════════
Event OnOptionSliderAcceptST(Float value)
    string stateVal = CurrentState
    If stateVal == "SLIDER_AGGR"
        AAIManager.AAI_AggressionMult = value
        SetSliderOptionValueST(value)
    ElseIf stateVal == "SLIDER_CONF"
        AAIManager.AAI_ConfidenceMult = value
        SetSliderOptionValueST(value)
    ElseIf stateVal == "SLIDER_DET"
        AAIManager.AAI_DetectionMult = value
        SetSliderOptionValueST(value)
    ElseIf stateVal == "SLIDER_HP"
        AAIManager.AAI_HealthMult = value
        SetSliderOptionValueST(value)
    EndIf
    AAIManager.MCM_SetDifficulty( \
        AAIManager.AAI_AggressionMult, \
        AAIManager.AAI_ConfidenceMult, \
        AAIManager.AAI_DetectionMult, \
        AAIManager.AAI_HealthMult)
EndEvent

Event OnOptionSliderOpenST()
    string stateVal = CurrentState
    If stateVal == "SLIDER_AGGR"
        SetSliderDialogStartValue(AAIManager.AAI_AggressionMult)
        SetSliderDialogDefaultValue(1.0)
        SetSliderDialogRange(0.5, 3.0)
        SetSliderDialogInterval(0.1)
    ElseIf stateVal == "SLIDER_CONF"
        SetSliderDialogStartValue(AAIManager.AAI_ConfidenceMult)
        SetSliderDialogDefaultValue(1.0)
        SetSliderDialogRange(0.5, 3.0)
        SetSliderDialogInterval(0.1)
    ElseIf stateVal == "SLIDER_DET"
        SetSliderDialogStartValue(AAIManager.AAI_DetectionMult)
        SetSliderDialogDefaultValue(1.0)
        SetSliderDialogRange(0.5, 2.5)
        SetSliderDialogInterval(0.1)
    ElseIf stateVal == "SLIDER_HP"
        SetSliderDialogStartValue(AAIManager.AAI_HealthMult)
        SetSliderDialogDefaultValue(1.0)
        SetSliderDialogRange(1.0, 4.0)
        SetSliderDialogInterval(0.1)
    EndIf
EndEvent
