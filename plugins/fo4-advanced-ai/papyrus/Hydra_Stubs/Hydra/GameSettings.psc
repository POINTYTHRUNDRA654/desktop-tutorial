Scriptname Hydra:GameSettings Const Hidden Native

;/
	Provides functions for game settings.
/;

string[] Function GetKeys() Global Native

bool Function Contains(string asKey) Global Native

bool Function GetBool(string asKey, bool abDefault = false) Global Native
bool Function SetBool(string asKey, bool abValue) Global Native

int Function GetInt(string asKey, int aiDefault = 0) Global Native
bool Function SetInt(string asKey, int aiValue) Global Native

float Function GetFloat(string asKey, float afDefault = 0.0) Global Native
bool Function SetFloat(string asKey, float afValue) Global Native

string Function GetString(string asKey, string asDefault = "") Global Native
bool Function SetString(string asKey, string asValue) Global Native
