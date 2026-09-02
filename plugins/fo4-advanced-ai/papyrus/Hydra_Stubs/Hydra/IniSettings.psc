Scriptname Hydra:IniSettings Const Hidden Native

;/
	Provides functions for the game's Ini settings.

	Notes:
	- Settings use the following format: "MySection:MyKey".
	- Altering some settings may have no apparent effect.
/;

Import Hydra:Colors

string[] Function GetSettings() Global Native
string[] Function GetSections() Global Native

bool Function ContainsSetting(string asSetting) Global Native
bool Function ContainsSection(string asSection) Global Native

bool Function GetBool(string asSetting, bool abDefault = false) Global Native
bool Function SetBool(string asSetting, bool abValue) Global Native

int Function GetChar(string asSetting, int acDefault = 0) Global Native
bool Function SetChar(string asSetting, int acValue) Global Native

int Function GetInt(string asSetting, int aiDefault = 0) Global Native
bool Function SetInt(string asSetting, int aiValue) Global Native

float Function GetFloat(string asSetting, float afDefault = 0.0) Global Native
bool Function SetFloat(string asSetting, float afValue) Global Native

string Function GetString(string asSetting, string asDefault = "") Global Native
bool Function SetString(string asSetting, string asValue) Global Native

Color Function GetColor(string asSetting) Global Native
bool Function SetColor(string asSetting, Color akValue) Global Native

bool Function SaveSetting(string asSetting) Global Native
