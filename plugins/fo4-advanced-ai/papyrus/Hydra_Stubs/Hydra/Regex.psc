Scriptname Hydra:Regex Const Hidden Native

;/
	Provides functions for regular expressions.

	Notes:
	- For syntax specifications, see: https://www.boost.org/libs/regex/doc/html/boost_regex/syntax/perl_syntax.html.
	- All regexes are case-insensitive.
	- The following characters have an escape sequence:
	  ".", "^", "$", "*", "+", "?", "(", ")", "[", "{", "\", "|", "#" and whitespace.
	- Strict strings can also be used here;
	  see the script `Hydra:StrictStrings` for more information.

	Flags:
	- "m", "M": Specifies multi-line mode where `^` and `$` match the start and end of each line instead of those of the entire string.
	- "s", "S": Specifies single-line mode where `.` also matches new-line characters.
/;

bool Function IsValid(string acsPattern, string asFlags = "") Global Native
bool Function IsMatch(string asString, string acsPattern, string asFlags = "") Global Native

string Function Escape(string asString) Global Native
string Function Unescape(string asString) Global Native

string Function Match(string asString, string acsPattern, string asFlags = "") Global Native
string[] Function Matches(string asString, string acsPattern, string asFlags = "") Global Native
int Function Search(string asString, string acsPattern, string asFlags = "") Global Native

string Function Replace(string asString, string acsPattern, string asReplacement, string asFlags = "") Global Native
string Function ReplaceAll(string asString, string acsPattern, string asReplacement, string asFlags = "") Global Native
string[] Function Split(string asString, string acsPattern, int aiCount = 0x7FFFFFFF, string asFlags = "") Global Native
