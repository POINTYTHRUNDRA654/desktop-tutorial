Scriptname Hydra:Float32 Const Hidden Native

;/
	Provides functions for single-precision floating point numbers.

	Notes:
	- All float functions use double-precision numbers internally,
	  thus they are much more accurate than the language's single-precision ones.
	- Comparison functions return -128 for unordered values (e.g. NaN).
	- For string format specifications, see: https://fmt.dev/latest/syntax.
	  Example: `Hydra:Float32.Format(123.456, "{:.2f}")` -> "123.46"
/;

Import Hydra:Int64
Import Hydra:Float64

float Function Copy(float afValue) Global Native

bool Function ToBool(float afValue) Global Native
int Function ToInt(float afValue) Global Native
Long Function ToLong(float afValue) Global Native
Double Function ToDouble(float afValue) Global Native

float Function FromString(string asValue, float afDefault = 0.0) Global Native
string Function ToString(float afValue, int aiPrecision = -1) Global Native

string Function Format(float afValue, string asFormat = "", string asDefault = "") Global Native

int Function MinDecimals() Global Native
int Function MaxDecimals() Global Native

float Function MinValue() Global Native
float Function MaxValue() Global Native

float Function Pi() Global Native
float Function E() Global Native
float Function Tau() Global Native

float Function Epsilon() Global Native
float Function NaN() Global Native
float Function PositiveInfinity() Global Native
float Function NegativeInfinity() Global Native

bool Function IsNaN(float afValue) Global Native

bool Function IsInfinity(float afValue) Global Native
bool Function IsPositiveInfinity(float afValue) Global Native
bool Function IsNegativeInfinity(float afValue) Global Native

float Function Add(float afLeft, float afRight) Global Native
float Function Subtract(float afLeft, float afRight) Global Native
float Function Multiply(float afLeft, float afRight) Global Native
float Function Divide(float afLeft, float afRight) Global Native
float Function Modulo(float afLeft, float afRight) Global Native
float Function Negate(float afValue) Global Native

int Function Compare(float afLeft, float afRight) Global Native
bool Function Equals(float afLeft, float afRight) Global Native

float Function Abs(float afValue) Global Native
float Function Min(float afLeft, float afRight) Global Native
float Function Max(float afLeft, float afRight) Global Native
float Function Clamp(float afValue, float afMin, float afMax) Global Native
float Function Lerp(float afStart, float afEnd, float afFactor) Global Native

float Function Sign(float afValue) Global Native
float Function CopySign(float afValue, float afSign) Global Native

float Function Ceil(float afValue) Global Native
float Function Floor(float afValue) Global Native
float Function Round(float afValue, int aiDecimals = 0) Global Native
float Function Trunc(float afValue) Global Native

float Function Pow(float afBase, float afExponent) Global Native
float Function Sqrt(float afValue) Global Native

float Function Exp(float afValue) Global Native
float Function Exp2(float afValue) Global Native
float Function Expm1(float afValue) Global Native

float Function Log(float afValue, float afBase) Global Native
float Function Ln(float afValue) Global Native
float Function Log2(float afValue) Global Native
float Function Log10(float afValue) Global Native
float Function Log1p(float afValue) Global Native

float Function Erf(float afValue) Global Native
float Function Erfc(float afValue) Global Native

float Function Gamma(float afValue) Global Native
float Function Lgamma(float afValue) Global Native

float Function DegToRad(float afDegrees) Global Native
float Function RadToDeg(float afRadians) Global Native

float Function Cbrt(float afValue) Global Native
float Function Hypot(float afX, float afY) Global Native

float Function Sin(float afValue) Global Native
float Function Cos(float afValue) Global Native
float Function Tan(float afValue) Global Native
float Function Sinh(float afValue) Global Native
float Function Cosh(float afValue) Global Native
float Function Tanh(float afValue) Global Native
float Function Asin(float afValue) Global Native
float Function Acos(float afValue) Global Native
float Function Atan(float afValue) Global Native
float Function Atan2(float afY, float afX) Global Native
float Function Asinh(float afValue) Global Native
float Function Acosh(float afValue) Global Native
float Function Atanh(float afValue) Global Native
