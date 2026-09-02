Scriptname Hydra:StructType Const Hidden Native

;/
	Provides type information for structs.

	Notes:
	- Struct names are separated by a hash symbol ("#") after their script name,
	  e.g. "MyNamespace:MyScript#MyStruct".
/;

Import Hydra:Pairs

; Returns true if the type exists; also tries to load it.
bool Function Exists(string asStructName) Global Native
; Returns true if the type is loaded, but does not try to load it.
bool Function IsLoaded(string asStructName) Global Native

bool Function ContainsVariable(string asStructName, string asVariableName) Global Native

string Function GetParentScriptName(string asStructName) Global Native

; The order of the pairs is undefined.
Pair[] Function GetInitialValues(string asStructName) Global Native
