Scriptname Hydra:FunctionRefs Const Hidden Native

;/
	Provides a data structure for local and global function references, along with utility functions for functions.
/;

Struct FunctionRef
	ScriptObject kObject
	string sScriptName
	string sFunctionName
EndStruct

FunctionRef Function CreateLocalRef(ScriptObject akObject, string asFunctionName) Global
	FunctionRef kFunctionRef = new FunctionRef
	kFunctionRef.kObject = akObject
	kFunctionRef.sScriptName = Hydra:ScriptObject.GetScriptName(akObject)
	kFunctionRef.sFunctionName = asFunctionName
	return kFunctionRef
EndFunction

FunctionRef Function CreateGlobalRef(string asScriptName, string asFunctionName) Global
	FunctionRef kFunctionRef = new FunctionRef
	kFunctionRef.sScriptName = asScriptName
	kFunctionRef.sFunctionName = asFunctionName
	return kFunctionRef
EndFunction

bool Function IsRefExistent(FunctionRef akFunctionRef) Global Native
bool Function IsLocalFunctionExistent(string asScriptName, string asFunctionName) Global Native
bool Function IsGlobalFunctionExistent(string asScriptName, string asFunctionName) Global Native

bool Function IsRefInvokableWithArgs(FunctionRef akFunctionRef, Var[] akArgs) Global Native
bool Function IsLocalFunctionInvokableWithArgs(string asScriptName, string asFunctionName, Var[] akArgs) Global Native
bool Function IsGlobalFunctionInvokableWithArgs(string asScriptName, string asFunctionName, Var[] akArgs) Global Native

Var Function InvokeRef(FunctionRef akFunctionRef, Var[] akArgs = none) Global Native
Var Function InvokeLocalFunction(ScriptObject akObject, string asFunctionName, Var[] akArgs = none) Global Native
Var Function InvokeGlobalFunction(string asScriptName, string asFunctionName, Var[] akArgs = none) Global Native

bool Function InvokeRefAsync(FunctionRef akFunctionRef, Var[] akArgs = none) Global Native
bool Function InvokeLocalFunctionAsync(ScriptObject akObject, string asFunctionName, Var[] akArgs = none) Global Native
bool Function InvokeGlobalFunctionAsync(string asScriptName, string asFunctionName, Var[] akArgs = none) Global Native
