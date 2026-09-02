Scriptname Hydra:Arrays Const Hidden Native

;/
	Provides functions for immutable arrays.
	
	Notes:
	- Many of these functions are named and work similar to LINQ from C#,
	  see: https://learn.microsoft.com/en-us/dotnet/api/system.linq.enumerable.
	- Be sure to cast your array to `Var[]`, if not already done, before using these functions.
	- The vanilla array limit of 128 elements does not apply here, like with most other non-vanilla array functions.
	- In vanilla, there is no proper way to check whether an array is `none`,
	  due to `array == none` also returning `true` for empty arrays.
	  Use the here provided `IsNone` function instead.
/;

; Returns 128; does not apply to any of the below functions.
int Function GetMaxSize() Global Native

Var[] Function Repeat(int aiCount) Global Native
bool[] Function RepeatBool(int aiCount, bool abValue = false) Global Native
int[] Function RepeatInt(int aiCount, int aiValue = 0) Global Native
float[] Function RepeatFloat(int aiCount, float afValue = 0.0) Global Native
string[] Function RepeatString(int aiCount, string asValue = "") Global Native
ScriptObject[] Function RepeatObject(int aiCount, ScriptObject akObject = none) Global Native

Var[] Function RepeatVar(int aiCount, Var avValue) Global Native
Var[] Function DeepRepeatVar(int aiCount, Var avValue) Global Native

Var[] Function RepeatArray(int aiCount, Var[] akArray) Global Native
Var[] Function DeepRepeatArray(int aiCount, Var[] akArray) Global Native

int[] Function Range(int aiStart, int aiCount, int aiStep = 1) Global Native
float[] Function RangeFloat(float afStart, int aiCount, float afStep = 1.0) Global Native

Var[] Function Copy(Var[] akArray) Global Native
Var[] Function DeepCopy(Var[] akArray) Global Native

Var Function BoolArrayAsVar(bool[] akArray) Global Native
Var Function IntArrayAsVar(int[] akArray) Global Native
Var Function FloatArrayAsVar(float[] akArray) Global Native
Var Function StringArrayAsVar(string[] akArray) Global Native
Var Function ObjectArrayAsVar(ScriptObject[] akArray) Global Native
Var Function VarArrayAsVar(Var[] akArray) Global Native

bool[] Function VarAsBoolArray(Var avValue) Global Native
int[] Function VarAsIntArray(Var avValue) Global Native
float[] Function VarAsFloatArray(Var avValue) Global Native
string[] Function VarAsStringArray(Var avValue) Global Native
ScriptObject[] Function VarAsObjectArray(Var avValue) Global Native
Var[] Function VarAsVarArray(Var avValue) Global Native

int Function Compare(Var[] akLeft, Var[] akRight) Global Native
int Function DeepCompare(Var[] akLeft, Var[] akRight) Global Native

bool Function Equals(Var[] akLeft, Var[] akRight) Global Native
bool Function DeepEquals(Var[] akLeft, Var[] akRight) Global Native

bool Function IsNone(Var[] akArray) Global Native
bool Function IsEmpty(Var[] akArray) Global Native
bool Function IsNoneOrEmpty(Var[] akArray) Global Native

bool Function Contains(Var[] akArray, Var avValue) Global Native
bool Function StartsWith(Var[] akArray, Var avValue) Global Native
bool Function EndsWith(Var[] akArray, Var avValue) Global Native

bool Function Any(Var[] akArray01, Var[] akArray02) Global Native
bool Function All(Var[] akArray01, Var[] akArray02) Global Native

int Function Size(Var[] akArray) Global Native
Var Function First(Var[] akArray) Global Native
Var Function Last(Var[] akArray) Global Native
Var Function At(Var[] akArray, int aiIndex) Global Native

int Function IndexOf(Var[] akArray, Var avValue, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native
int Function LastIndexOf(Var[] akArray, Var avValue, int aiStartIndex = 0x7FFFFFFF, int aiCount = 0x7FFFFFFF) Global Native
int Function Count(Var[] akArray, Var avValue, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native

Var Function Find(Var[] akArray, Var avValue) Global Native
Var Function FindLast(Var[] akArray, Var avValue) Global Native

Var Function Min(Var[] akArray) Global Native
Var Function Max(Var[] akArray) Global Native

int Function SumInt(int[] akArray) Global Native
float Function SumFloat(float[] akArray) Global Native

int Function AverageInt(int[] akArray) Global Native
float Function AverageFloat(float[] akArray) Global Native

; Retrieve values that appear in either array, excluding duplicates.
Var[] Function Union(Var[] akArray01, Var[] akArray02) Global Native
; Retrieve values that appear in both arrays.
Var[] Function Intersect(Var[] akArray01, Var[] akArray02) Global Native
; Retrieve values from the first array that do not appear in the second array.
Var[] Function Except(Var[] akArray01, Var[] akArray02) Global Native
; Retrieve a specific amount of values, beginning from the start of the array.
Var[] Function Take(Var[] akArray, int aiCount) Global Native
; Retrieve the remaining values, skipping a specific amount from the start of the array.
Var[] Function Skip(Var[] akArray, int aiCount) Global Native
; Retrieve values from the array without any duplicates.
Var[] Function Distinct(Var[] akArray) Global Native

Var[] Function Sort(Var[] akArray, bool abDescending = false) Global Native
Var[] Function Reverse(Var[] akArray) Global Native

Var[] Function Add(Var[] akArray, Var avValue) Global Native
Var[] Function AddRange(Var[] akArray, Var[] akValues) Global Native

Var[] Function Insert(Var[] akArray, int aiIndex, Var avValue) Global Native
Var[] Function InsertRange(Var[] akArray, int aiIndex, Var[] akValues) Global Native

Var[] Function Remove(Var[] akArray, Var avValue) Global Native
Var[] Function RemoveAll(Var[] akArray, Var avValue) Global Native
Var[] Function RemoveAt(Var[] akArray, int aiIndex) Global Native
Var[] Function RemoveRange(Var[] akArray, int aiIndex, int aiCount) Global Native

Var[] Function Fill(Var[] akArray, Var avValue, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native
Var[] Function Resize(Var[] akArray, int aiCount) Global Native

string Function ToString(Var[] akArray) Global Native
string Function Join(Var[] akArray, string asSeparator = ", ") Global Native
