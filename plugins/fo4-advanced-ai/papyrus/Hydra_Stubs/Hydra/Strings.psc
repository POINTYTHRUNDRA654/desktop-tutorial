Scriptname Hydra:Strings Const Hidden Native

;/
	Provides functions for strings.

	Notes:
	- The language uses UTF-8 encoded strings.
	- The language's strings are hashed case-insensitively by the engine,
	  meaning that the casing can depend on whether the value is already hashed or not;
	  see: https://forums.nexusmods.com/topic/5691962-papyrus-changing-string-cases.
	- Due to the above reason, functions like `ToLower` and `ToUpper` will never work.
	- All functions here use case-insensitive comparisons.
/;

string Function Empty() Global Native

bool Function IsEmpty(string asValue) Global Native
bool Function IsAscii(string asValue) Global Native
bool Function IsWhiteSpace(string asValue) Global Native
bool Function IsBlank(string asValue) Global Native
bool Function IsDigit(string asValue) Global Native
bool Function IsLetter(string asValue) Global Native
bool Function IsLetterOrDigit(string asValue) Global Native
bool Function IsHexadecimal(string asValue) Global Native
bool Function IsPunctuation(string asValue) Global Native
bool Function IsControl(string asValue) Global Native
bool Function IsGraphic(string asValue) Global Native
bool Function IsPrintable(string asValue) Global Native
bool Function IsLower(string asValue) Global Native
bool Function IsUpper(string asValue) Global Native

int Function Compare(string asLeft, string asRight) Global Native
bool Function Equals(string asLeft, string asRight) Global Native

bool Function Contains(string asValue, string asSubstring) Global Native
bool Function StartsWith(string asValue, string asSubstring) Global Native
bool Function EndsWith(string asValue, string asSubstring) Global Native

bool Function Any(string asValue, string[] akSubstrings) Global Native
bool Function All(string asValue, string[] akSubstrings) Global Native

int Function Size(string asValue) Global Native

string Function First(string asValue) Global Native
string Function Last(string asValue) Global Native

string Function CharAt(string asValue, int aiIndex) Global Native
string Function FromCharArray(string[] akChars) Global Native
string[] Function ToCharArray(string asValue) Global Native

int Function CharCodeAt(string asValue, int aiIndex) Global Native
string Function FromCharCodeArray(int[] akCharCodes) Global Native
int[] Function ToCharCodeArray(string asValue) Global Native

int Function IndexOf(string asValue, string asSubstring, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native
int Function IndexOfAny(string asValue, string[] akSubstrings, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native
int Function LastIndexOf(string asValue, string asSubstring, int aiStartIndex = 0x7FFFFFFF, int aiCount = 0x7FFFFFFF) Global Native
int Function LastIndexOfAny(string asValue, string[] akSubstrings, int aiStartIndex = 0x7FFFFFFF, int aiCount = 0x7FFFFFFF) Global Native
int Function Count(string asValue, string asSubstring, int aiStartIndex = 0, int aiCount = 0x7FFFFFFF) Global Native

string Function Substring(string asValue, int aiStartIndex, int aiCount = 0x7FFFFFFF) Global Native
string Function Remove(string asValue, int aiStartIndex, int aiCount = 0x7FFFFFFF) Global Native
string Function Insert(string asValue, int aiIndex, string asSubstring) Global Native

string Function Replace(string asValue, string asSubstring, string asReplacement, int aiCount = 0x7FFFFFFF) Global Native
string Function ReplaceAt(string asValue, int aiIndex, string asReplacement) Global Native

string[] Function Split(string asValue, string asSeparator, int aiCount = 0x7FFFFFFF) Global Native
string Function Join(string[] akValues, string asSeparator = ", ") Global Native

string Function Concat(string[] akValues) Global Native
string Function Repeat(string asValue, int aiCount) Global Native
string Function Reverse(string asValue) Global Native

string Function Trim(string asValue, string asTrimString = " ") Global Native
string Function TrimStart(string asValue, string asTrimString = " ") Global Native
string Function TrimEnd(string asValue, string asTrimString = " ") Global Native

string Function PadLeft(string asValue, int aiTotalSize, string asPadString = " ") Global Native
string Function PadRight(string asValue, int aiTotalSize, string asPadString = " ") Global Native
string Function Truncate(string asValue, int aiTotalSize, string asSuffix = "...") Global Native

;/
	Notes:
	- For format specifications, see: https://fmt.dev/latest/syntax.

	Example:
	```
	Var[] kArgs = new Var[3]
	kArgs[0] = 10
	kArgs[1] = 20
	kArgs[2] = 30
	Hydra:Strings.Format("{} + {} = {}", kArgs) ; -> "10 + 20 = 30"
	```
/;
string Function Format(string asFormat, Var[] akArgs = none, string asDefault = "") Global Native
