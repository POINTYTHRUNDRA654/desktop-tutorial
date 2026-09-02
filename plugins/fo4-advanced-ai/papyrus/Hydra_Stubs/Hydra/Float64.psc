Scriptname Hydra:Float64 Const Hidden Native

;/
	Provides functions and a wrapper for double-precision floating point numbers.

	Notes:
	- Comparison functions return -128 for unordered values (e.g. NaN).
	- For string format specifications, see: https://fmt.dev/latest/syntax.
	  Example: `Hydra:Float64.Format(Hydra:Float32.ToDouble(123), "0x{:X}")` -> "0x7B"
/;

Import Hydra:Int64

Struct Double
	int iLowPart = 0
	int iHighPart = 0
EndStruct

Double Function Copy(Double adValue) Global Native

bool Function ToBool(Double adValue) Global Native
int Function ToInt(Double adValue) Global Native
Long Function ToLong(Double adValue) Global Native
float Function ToFloat(Double adValue) Global Native

Double Function FromString(string asValue, Double adDefault = none) Global Native
string Function ToString(Double adValue, int aiPrecision = -1) Global Native

string Function Format(Double adValue, string asFormat = "", string asDefault = "") Global Native

int Function MinDecimals() Global Native
int Function MaxDecimals() Global Native

Double Function MinValue() Global Native
Double Function MaxValue() Global Native

Double Function Pi() Global Native
Double Function E() Global Native
Double Function Tau() Global Native

Double Function Epsilon() Global Native
Double Function NaN() Global Native
Double Function PositiveInfinity() Global Native
Double Function NegativeInfinity() Global Native

bool Function IsNaN(Double adValue) Global Native

bool Function IsInfinity(Double adValue) Global Native
bool Function IsPositiveInfinity(Double adValue) Global Native
bool Function IsNegativeInfinity(Double adValue) Global Native

Double Function Add(Double adLeft, Double adRight) Global Native
Double Function Subtract(Double adLeft, Double adRight) Global Native
Double Function Multiply(Double adLeft, Double adRight) Global Native
Double Function Divide(Double adLeft, Double adRight) Global Native
Double Function Modulo(Double adLeft, Double adRight) Global Native
Double Function Negate(Double adValue) Global Native

int Function Compare(Double adLeft, Double adRight) Global Native
bool Function Equals(Double adLeft, Double adRight) Global Native

Double Function Abs(Double adValue) Global Native
Double Function Min(Double adLeft, Double adRight) Global Native
Double Function Max(Double adLeft, Double adRight) Global Native
Double Function Clamp(Double adValue, Double adMin, Double adMax) Global Native
Double Function Lerp(Double adStart, Double adEnd, Double adFactor) Global Native

Double Function Sign(Double adValue) Global Native
Double Function CopySign(Double adValue, Double adSign) Global Native

Double Function Ceil(Double adValue) Global Native
Double Function Floor(Double adValue) Global Native
Double Function Round(Double adValue, int aiDecimals = 0) Global Native
Double Function Trunc(Double adValue) Global Native

Double Function Pow(Double adBase, Double adExponent) Global Native
Double Function Sqrt(Double adValue) Global Native

Double Function Exp(Double adValue) Global Native
Double Function Exp2(Double adValue) Global Native
Double Function Expm1(Double adValue) Global Native

Double Function Log(Double adValue, Double adBase) Global Native
Double Function Ln(Double adValue) Global Native
Double Function Log2(Double adValue) Global Native
Double Function Log10(Double adValue) Global Native
Double Function Log1p(Double adValue) Global Native

Double Function Erf(Double adValue) Global Native
Double Function Erfc(Double adValue) Global Native

Double Function Gamma(Double adValue) Global Native
Double Function Lgamma(Double adValue) Global Native

Double Function DegToRad(Double adDegrees) Global Native
Double Function RadToDeg(Double adRadians) Global Native

Double Function Cbrt(Double adValue) Global Native
Double Function Hypot(Double adX, Double adY) Global Native

Double Function Sin(Double adValue) Global Native
Double Function Cos(Double adValue) Global Native
Double Function Tan(Double adValue) Global Native
Double Function Sinh(Double adValue) Global Native
Double Function Cosh(Double adValue) Global Native
Double Function Tanh(Double adValue) Global Native
Double Function Asin(Double adValue) Global Native
Double Function Acos(Double adValue) Global Native
Double Function Atan(Double adValue) Global Native
Double Function Atan2(Double adY, Double adX) Global Native
Double Function Asinh(Double adValue) Global Native
Double Function Acosh(Double adValue) Global Native
Double Function Atanh(Double adValue) Global Native
