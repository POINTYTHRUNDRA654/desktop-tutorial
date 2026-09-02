Scriptname Hydra:Boolean Const Hidden Native

;/
	Provides functions for booleans.

	Notes:
	- For string format specifications, see: https://fmt.dev/latest/syntax.
/;

Import Hydra:Float64
Import Hydra:Int64

int Function ToInt(bool abValue) Global Native
Long Function ToLong(bool abValue) Global Native
float Function ToFloat(bool abValue) Global Native
Double Function ToDouble(bool abValue) Global Native

bool Function FromString(string asValue, bool abDefault = false) Global Native
string Function ToString(bool abValue) Global Native

string Function Format(bool abValue, string asFormat = "", string asDefault = "") Global Native

string Function FalseString() Global Native
string Function TrueString() Global Native

int Function Compare(bool abLeft, bool abRight) Global Native
bool Function Equals(bool abLeft, bool abRight) Global Native
