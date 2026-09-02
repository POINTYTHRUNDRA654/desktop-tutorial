Scriptname Hydra:StrictStrings Const Hidden Native

;/
	Provides functions for case-sensitive strings.

	Notes:
	- Strict strings work differently from regular strings
	  in that they are stored internally in a case-sensitive manner.
	- Both keys and values are UTF-8 encoded strings.
	- On value retrieval, it is undefined whether the original casing is kept or not,
	  so avoid relying on that behavior.
	- Use them only in native functions where case-sensitivity is required;
	  string parameters with an "acs" prefix indicate that they expect a strict string.
	- The keys for these strings must be prefixed with an at sign ("@").
	- The keys and values can be defined as pairs in "Data/Hydra/ScriptStrictStrings/*.json".
/;

bool Function Contains(string asKey) Global Native

string Function GetValue(string asKey, string asDefault = "") Global Native
