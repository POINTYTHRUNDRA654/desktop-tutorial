Scriptname Hydra:ScriptType Const Hidden Native

;/
	Provides type information for script objects, the base type of all scripts.
/;

; Returns true if the type exists; also tries to load it.
bool Function Exists(string asScriptName) Global Native
; Returns true if the type is loaded, but does not try to load it.
bool Function IsLoaded(string asScriptName) Global Native

bool Function IsInstanceOf(string asChildScriptName, string asParentScriptName) Global Native
string Function GetParentScriptName(string asScriptName) Global Native
