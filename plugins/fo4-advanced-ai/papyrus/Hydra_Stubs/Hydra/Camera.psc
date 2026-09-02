Scriptname Hydra:Camera Const Hidden Native

;/
	Provides functions for the game's camera system.
/;

int Function GetCameraState() Global Native
bool Function SetCameraState(int aiValue) Global Native

int Function GetCameraState_FirstPerson() Global Native
int Function GetCameraState_AutoVanity() Global Native
int Function GetCameraState_Vats() Global Native
int Function GetCameraState_FreeCamera() Global Native
int Function GetCameraState_IronSights() Global Native
int Function GetCameraState_Transition() Global Native
int Function GetCameraState_Tween() Global Native
int Function GetCameraState_Animated() Global Native
int Function GetCameraState_ThirdPerson() Global Native
int Function GetCameraState_Furniture() Global Native
int Function GetCameraState_Mount() Global Native
int Function GetCameraState_Bleedout() Global Native
int Function GetCameraState_Dialogue() Global Native

float Function GetFirstPersonFov() Global Native
Function SetFirstPersonFov(float afValue) Global Native

float Function GetThirdPersonFov() Global Native
Function SetThirdPersonFov(float afValue) Global Native

float Function GetThirdPersonAimFov() Global Native
Function SetThirdPersonAimFov(float afValue) Global Native

float Function GetViewmodelFov() Global Native
Function SetViewmodelFov(float afValue) Global Native

float Function GetNearClipDistance() Global Native
Function SetNearClipDistance(float afValue) Global Native
