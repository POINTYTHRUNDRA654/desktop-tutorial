Scriptname Hydra:StructObject Const Hidden Native

;/
	Provides functions for structs.
/;

Import Hydra:Pairs

Var Function Create(string asStructName, Pair[] akVariables = none) Global Native

Var Function Copy(Var avStruct) Global Native
Var Function DeepCopy(Var avStruct) Global Native

int Function Compare(Var avLeft, Var avRight) Global Native
int Function DeepCompare(Var avLeft, Var avRight) Global Native

bool Function Equals(Var avLeft, Var avRight) Global Native
bool Function DeepEquals(Var avLeft, Var avRight) Global Native

bool Function IsInstanceOf(Var avStruct, string asStructName) Global Native

string Function GetStructName(Var avStruct) Global Native
string Function GetParentScriptName(Var avStruct) Global Native

; The order of the pairs is undefined.
Pair[] Function GetVariables(Var avStruct) Global Native

Var Function GetVariableValue(Var avStruct, string asVariableName) Global Native
bool Function SetVariableValue(Var avStruct, string asVariableName, Var avValue) Global Native

Var[] Function GetValuesByName(Var[] akStructs, string asVariableName) Global Native

int Function IndexOfValue(Var[] akStructs, string asVariableName, Var avValue, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native
int Function LastIndexOfValue(Var[] akStructs, string asVariableName, Var avValue, int aiStartIndex = 0x7FFFFFFF, int aiCount = 0x7FFFFFFF) Global Native

Var Function MergeValues(Var avBaseStruct, Var avOverrideStruct) Global Native
