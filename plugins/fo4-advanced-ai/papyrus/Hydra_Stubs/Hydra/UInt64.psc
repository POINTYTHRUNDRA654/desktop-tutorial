Scriptname Hydra:UInt64 Const Hidden Native

;/
	Provides functions for unsigned 64-bit integers.

	Notes:
	- For string format specifications, see: https://fmt.dev/latest/syntax.
	  Example: `Hydra:UInt64.Format(Hydra:UInt32.ToLong(123), "0x{:X}")` -> "0x7B"
/;

Import Hydra:Int64
Import Hydra:Float64

Long Function Copy(Long alValue) Global Native

bool Function ToBool(Long alValue) Global Native
int Function ToInt(Long alValue) Global Native
float Function ToFloat(Long alValue) Global Native
Double Function ToDouble(Long alValue) Global Native

Long Function FromString(string asValue, int aiBase = 10, Long alDefault = none) Global Native
string Function ToString(Long alValue, int aiBase = 10) Global Native

string Function Format(Long alValue, string asFormat = "", string asDefault = "") Global Native

Long Function MinValue() Global Native
Long Function MaxValue() Global Native

Long Function Add(Long alLeft, Long alRight) Global Native
Long Function Subtract(Long alLeft, Long alRight) Global Native
Long Function Multiply(Long alLeft, Long alRight) Global Native
Long Function Divide(Long alLeft, Long alRight) Global Native
Long Function Modulo(Long alLeft, Long alRight) Global Native

Long Function LeftShift(Long alValue, int aiShift) Global Native
Long Function RightShift(Long alValue, int aiShift) Global Native
Long Function BitwiseAnd(Long alLeft, Long alRight) Global Native
Long Function BitwiseOr(Long alLeft, Long alRight) Global Native
Long Function BitwiseXor(Long alLeft, Long alRight) Global Native
Long Function BitwiseNot(Long alValue) Global Native

bool Function HasFlag(Long alValue, Long alFlag) Global Native
Long Function SetFlag(Long alValue, Long alFlag, bool abSet) Global Native

int Function Compare(Long alLeft, Long alRight) Global Native
bool Function Equals(Long alLeft, Long alRight) Global Native

Long Function Min(Long alLeft, Long alRight) Global Native
Long Function Max(Long alLeft, Long alRight) Global Native
Long Function Clamp(Long alValue, Long alMin, Long alMax) Global Native

Long Function Sign(Long alValue) Global Native
Long Function CopySign(Long alValue, Long alSign) Global Native

Long Function Lcm(Long alLeft, Long alRight) Global Native
Long Function Gcd(Long alLeft, Long alRight) Global Native
Long Function Fib(Long alValue) Global Native
Long Function Fact(Long alValue) Global Native
Long Function Perm(Long alN, Long alR) Global Native
Long Function Comb(Long alN, Long alR) Global Native
