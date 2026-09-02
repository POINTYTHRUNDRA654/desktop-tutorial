Scriptname Hydra:Char Const Hidden Native

;/
	Provides functions for characters.

	Notes:
	- The language uses UTF-8 encoded strings,
	  but the below functions will operate on UTF-16 code units.
	- For string format specifications, see: https://fmt.dev/latest/syntax.
	  Example: `Hydra:Char.Format(65, "{:c}")` -> "A"
/;

int Function FromString(string asValue, int acDefault = 0) Global Native
string Function ToString(int acValue) Global Native

string Function Format(int acValue, string asFormat = "", string asDefault = "") Global Native

int Function Compare(int acLeft, int acRight) Global Native
int Function CompareIgnoreCase(int acLeft, int acRight) Global Native

bool Function Equals(int acLeft, int acRight) Global Native
bool Function EqualsIgnoreCase(int acLeft, int acRight) Global Native
