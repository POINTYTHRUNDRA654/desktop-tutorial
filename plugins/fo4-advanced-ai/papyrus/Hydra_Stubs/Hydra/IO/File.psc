Scriptname Hydra:IO:File Const Hidden Native

;/
	Provides functions for files.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
/;

Import Hydra:Int64

bool Function IsReadable(string asPath) Global Native
bool Function IsWritable(string asPath) Global Native
bool Function IsReadWritable(string asPath) Global Native

Long Function GetSize(string asPath, Long alDefault = none) Global Native
bool Function SetSize(string asPath, Long alSize) Global Native

string Function ReadAllText(string asPath, string asDefault = "") Global Native
string[] Function ReadAllLines(string asPath) Global Native

bool Function WriteAllText(string asPath, string asText) Global Native
bool Function WriteAllLines(string asPath, string[] akLines) Global Native

bool Function AppendAllText(string asPath, string asText) Global Native
bool Function AppendAllLines(string asPath, string[] akLines) Global Native
bool Function AppendLine(string asPath, string asLine) Global Native

bool Function Exists(string asPath) Global Native
bool Function IsEmpty(string asPath) Global Native

bool Function Create(string asPath) Global Native
bool Function Move(string asOldPath, string asNewPath) Global Native
bool Function Copy(string asOldPath, string asNewPath, bool abOverwrite = false) Global Native
bool Function Delete(string asPath) Global Native
