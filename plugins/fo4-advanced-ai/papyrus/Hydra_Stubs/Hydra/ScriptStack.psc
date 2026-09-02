Scriptname Hydra:ScriptStack Const Hidden Native

;/
	Provides functions for script stacks.
/;

int Function GetCurrentStackId() Global Native

ScriptObject Function GetCurrentObject() Global Native

string Function GetCurrentScriptName() Global Native
string Function GetCurrentFunctionName() Global Native

string Function GetPreviousScriptName() Global Native
string Function GetPreviousFunctionName() Global Native
