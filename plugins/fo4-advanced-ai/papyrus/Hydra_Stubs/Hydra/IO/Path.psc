Scriptname Hydra:IO:Path Const Hidden Native

;/
	Provides functions for paths.

	Notes:
	- These functions do not interact with the file system.
	- Paths with backward-slashes ("\\") are automatically converted to forward slashes ("/").
/;

string Function CurrentDirectory() Global Native
string Function ParentDirectory() Global Native
string Function ExtensionSeparator() Global Native
string Function DirectorySeparator() Global Native

string[] Function GetInvalidPathChars() Global Native
string[] Function GetInvalidFileNameChars() Global Native

bool Function IsEmpty(string asPath) Global Native
bool Function IsAbsolute(string asPath) Global Native
bool Function IsRelative(string asPath) Global Native

bool Function IsInSandbox(string asPath) Global Native

int Function Compare(string asPath01, string asPath02) Global Native
bool Function Equals(string asPath01, string asPath02) Global Native

; This actually accesses the file system to resolve symbolic links.
bool Function ResolvingEquals(string asPath01, string asPath02) Global Native

string Function GetRootName(string asPath) Global Native
string Function GetRootDirectoryName(string asPath) Global Native
string Function GetRootPath(string asPath) Global Native

string Function GetParent(string asPath) Global Native
string Function GetRelative(string asPath, string asRelativeTo) Global Native

string Function GetDirectoryName(string asPath) Global Native
string Function GetFileName(string asPath) Global Native
string Function GetFileNameWithoutExtension(string asPath) Global Native
string Function GetExtension(string asPath) Global Native

string Function ChangeFileName(string asPath, string asFileName) Global Native
string Function ChangeExtension(string asPath, string asExtension) Global Native

string Function TrimEndingSeparator(string asPath) Global Native
string Function Normalize(string asPath) Global Native

string[] Function Split(string asPath) Global Native
string Function Join(string[] akPaths) Global Native
