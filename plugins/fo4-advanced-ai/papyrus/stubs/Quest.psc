Scriptname Quest extends Form Native Hidden

Bool   Function IsRunning() Native
Bool   Function IsCompleted() Native
Bool   Function IsObjectiveDisplayed(Int aiObjective) Native
Function SetStage(Int aiStage) Native
Int    Function GetStage() Native
Bool   Function IsStageDone(Int aiStage) Native
Function CompleteQuest() Native
Function Reset() Native

Event OnQuestInit()
EndEvent
