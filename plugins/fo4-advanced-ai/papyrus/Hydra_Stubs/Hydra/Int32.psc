Scriptname Hydra:Int32 Const Hidden Native

;/
	Provides functions for signed 32-bit integers.

	Notes:
	- For string format specifications, see: https://fmt.dev/latest/syntax.
	  Example: `Hydra:Int32.Format(123, "0x{:X}")` -> "0x7B"
/;

Import Hydra:Int64
Import Hydra:Float64

int Function Copy(int aiValue) Global Native

bool Function ToBool(int aiValue) Global Native
Long Function ToLong(int aiValue) Global Native
float Function ToFloat(int aiValue) Global Native
Double Function ToDouble(int aiValue) Global Native

int Function FromString(string asValue, int aiBase = 10, int aiDefault = 0) Global Native
string Function ToString(int aiValue, int aiBase = 10) Global Native

string Function Format(int aiValue, string asFormat = "", string asDefault = "") Global Native

int Function MinValue() Global Native
int Function MaxValue() Global Native

int Function Add(int aiLeft, int aiRight) Global Native
int Function Subtract(int aiLeft, int aiRight) Global Native
int Function Multiply(int aiLeft, int aiRight) Global Native
int Function Divide(int aiLeft, int aiRight) Global Native
int Function Modulo(int aiLeft, int aiRight) Global Native
int Function Negate(int aiValue) Global Native

int Function LeftShift(int aiValue, int aiShift) Global Native
int Function RightShift(int aiValue, int aiShift) Global Native
int Function BitwiseAnd(int aiLeft, int aiRight) Global Native
int Function BitwiseOr(int aiLeft, int aiRight) Global Native
int Function BitwiseXor(int aiLeft, int aiRight) Global Native
int Function BitwiseNot(int aiValue) Global Native

bool Function HasFlag(int aiValue, int aiFlag) Global Native
int Function SetFlag(int aiValue, int aiFlag, bool abSet) Global Native

int Function Compare(int aiLeft, int aiRight) Global Native
bool Function Equals(int aiLeft, int aiRight) Global Native

int Function Abs(int aiValue) Global Native
int Function Min(int aiLeft, int aiRight) Global Native
int Function Max(int aiLeft, int aiRight) Global Native
int Function Clamp(int aiValue, int aiMin, int aiMax) Global Native

int Function Sign(int aiValue) Global Native
int Function CopySign(int aiValue, int aiSign) Global Native

int Function Lcm(int aiLeft, int aiRight) Global Native
int Function Gcd(int aiLeft, int aiRight) Global Native
int Function Fib(int aiValue) Global Native
int Function Fact(int aiValue) Global Native
int Function Perm(int aiN, int aiR) Global Native
int Function Comb(int aiN, int aiR) Global Native
