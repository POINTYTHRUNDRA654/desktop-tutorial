Scriptname Hydra:Operator Const Hidden Native

;/
	Provides operator functions.

	Notes:
	- Comparison functions return -128 for unordered values (e.g. NaN).
/;

Var Function Copy(Var avValue) Global Native
Var Function DeepCopy(Var avValue) Global Native

bool Function IsValueType(Var avValue) Global Native
bool Function IsRefType(Var avValue) Global Native
bool Function IsNone(Var avValue) Global Native
bool Function IsStruct(Var avValue) Global Native
bool Function IsArray(Var avValue) Global Native
bool Function IsVar(Var avValue) Global Native

int Function Compare(Var avLeft, Var avRight) Global Native
int Function DeepCompare(Var avLeft, Var avRight) Global Native

bool Function Equals(Var avLeft, Var avRight) Global Native
bool Function DeepEquals(Var avLeft, Var avRight) Global Native

bool Function RefEquals(Var avLeft, Var avRight) Global Native
bool Function TypeEquals(Var avLeft, Var avRight) Global Native

int Function GetRawType(Var avValue) Global Native

int Function GetRawType_None() Global Native
int Function GetRawType_Bool() Global Native
int Function GetRawType_Int() Global Native
int Function GetRawType_Float() Global Native
int Function GetRawType_String() Global Native
int Function GetRawType_Object() Global Native
int Function GetRawType_Struct() Global Native
int Function GetRawType_Var() Global Native
int Function GetRawType_ArrayBool() Global Native
int Function GetRawType_ArrayInt() Global Native
int Function GetRawType_ArrayFloat() Global Native
int Function GetRawType_ArrayString() Global Native
int Function GetRawType_ArrayObject() Global Native
int Function GetRawType_ArrayStruct() Global Native
int Function GetRawType_ArrayVar() Global Native

Var Function Ternary(bool abCondition, Var avTrueValue, Var avFalseValue) Global Native

Function DoNothing() Global Native
