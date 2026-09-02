Scriptname Hydra:Random Const Hidden Native

;/
	Provides functions for generating random numbers.
/;

Import Hydra:Int64
Import Hydra:Float64

int Function RandomSeed() Global Native

bool Function RandomBool() Global Native
bool Function SeededBool(int aiSeed) Global Native

int Function RandomAlphanumericChar() Global Native
int Function SeededAlphanumericChar(int aiSeed) Global Native

int Function RandomInt(int aiMinInclusive, int aiMaxInclusive) Global Native
int Function SeededInt(int aiMinInclusive, int aiMaxInclusive, int aiSeed) Global Native

Long Function RandomLong(Long alMinInclusive, Long alMaxInclusive) Global Native
Long Function SeededLong(Long alMinInclusive, Long alMaxInclusive, int aiSeed) Global Native

float Function RandomFloat(float afMinInclusive, float afMaxExclusive) Global Native
float Function SeededFloat(float afMinInclusive, float afMaxExclusive, int aiSeed) Global Native

Double Function RandomDouble(Double adMinInclusive, Double adMaxExclusive) Global Native
Double Function SeededDouble(Double adMinInclusive, Double adMaxExclusive, int aiSeed) Global Native

string Function RandomString(int aiSize, string asCharacters) Global Native
string Function SeededString(int aiSize, string asCharacters, int aiSeed) Global Native

string Function RandomAlphanumericString(int aiSize) Global Native
string Function SeededAlphanumericString(int aiSize, int aiSeed) Global Native

Var Function RandomElement(Var[] akArray) Global Native
Var Function SeededElement(Var[] akArray, int aiSeed) Global Native

Var[] Function RandomArray(Var[] akArray) Global Native
Var[] Function SeededArray(Var[] akArray, int aiSeed) Global Native
