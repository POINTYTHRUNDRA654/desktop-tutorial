Scriptname Hydra:UI Const Hidden Native

;/
	Provides UI-related functions.

	Notes:
	- The container menu functions work with both the container and barter menu.
	- The workbench menu functions work with both the workbench (examine) and power armor mod menu.
	- The power armor ui functions affect both the HUD and Pip-Boy colors.
/;

Import Hydra:Colors
Import Hydra:FunctionRefs

ObjectReference Function GetContainerMenuContainerRef() Global Native

ObjectReference Function GetWorkbenchMenuContainerRef() Global Native
ObjectReference Function GetWorkbenchMenuWorkbenchRef() Global Native

ObjectReference Function GetBarterMenuChestRef() Global Native
Actor Function GetBarterMenuMerchant() Global Native

int Function GetSelectedQuickContainerItemIndex() Global Native
Function TakeSelectedQuickContainerItem() Global Native

Function PlayMenuSound(Sound akSound) Global Native
Function PlayMenuSoundByEditorId(string asSoundEditorId) Global Native

Function PlayPipBoySound(Sound akSound) Global Native
Function PlayPipBoySoundByEditorId(string asSoundEditorId) Global Native

Color Function GetHudColor() Global Native
Function SetHudColor(Color akValue) Global Native
Function SaveHudColor() Global Native

Color Function GetPipBoyUIColor() Global Native
Function SetPipBoyUIColor(Color akValue) Global Native
Function SavePipBoyUIColor() Global Native

Color Function GetPowerArmorUIColor() Global Native
Function SetPowerArmorUIColor(Color akValue) Global Native
Function SavePowerArmorUIColor() Global Native

Color Function GetWorkbenchHighlightColor() Global Native
Function SetWorkbenchHighlightColor(Color akValue) Global Native
Function SaveWorkbenchHighlightColor() Global Native

Color Function GetPowerArmorWorkbenchHighlightColor() Global Native
Function SetPowerArmorWorkbenchHighlightColor(Color akValue) Global Native
Function SavePowerArmorWorkbenchHighlightColor() Global Native


Function ShowBasicMessageBox(string acsText) Global Native

Function ShowBasicNotification(string acsText) Global Native

;/
	Notes:
	- Supports up to 255 buttons.

	Callback Signature:

	Function OnButtonPress(int aiButtonIndex)
	EndFunction
/;
Function ShowCustomMessageBox(FunctionRef akFunctionRef, string ascText, string[] akButtons = none) Global Native

Function ShowCustomNotification(string acsText, string asSoundEditorId = "", bool abThrottle = false) Global Native
