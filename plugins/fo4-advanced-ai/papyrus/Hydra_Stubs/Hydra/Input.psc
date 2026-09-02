Scriptname Hydra:Input Const Hidden Native

;/
	Provides functions for user input handling.
/;

int Function GetDeviceType_Keyboard() Global Native
int Function GetDeviceType_Mouse() Global Native
int Function GetDeviceType_Gamepad() Global Native

bool Function IsGamepadConnected() Global Native

bool Function IsKeyCodeValid(int aiKeyCode) Global Native
bool Function IsControlNameValid(string asControlName, int aiDeviceType = -1) Global Native

string Function GetControlNameByKeyCode(int aiKeyCode) Global Native
int Function GetKeyCodeByControlName(string asControlName, int aiDeviceType = -1) Global Native

int[] Function GetPressedKeyCodes() Global Native
string[] Function GetPressedControlNames(int aiDeviceType = -1) Global Native

bool Function IsKeyPressed(int aiKeyCode) Global Native
bool Function HoldKey(int aiKeyCode) Global Native
bool Function ReleaseKey(int aiKeyCode) Global Native
bool Function TapKey(int aiKeyCode) Global Native
bool Function TapKeyForSeconds(int aiKeyCode, float afDurationSeconds) Global Native

bool Function IsControlPressed(string asControlName, int aiDeviceType = -1) Global Native
bool Function HoldControl(string asControlName, int aiDeviceType = -1) Global Native
bool Function ReleaseControl(string asControlName, int aiDeviceType = -1) Global Native
bool Function TapControl(string asControlName, int aiDeviceType = -1) Global Native
bool Function TapControlForSeconds(string asControlName, float afDurationSeconds, int aiDeviceType = -1) Global Native
