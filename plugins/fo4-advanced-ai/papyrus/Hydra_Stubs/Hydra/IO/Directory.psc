Scriptname Hydra:IO:Directory Const Hidden Native

;/
	Provides functions for directories.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
	- The order of returned directories and files is undefined.
	- A search pattern uses the following wildcard characters:
	  - "*": Matches zero or more characters.
	  - "?": Matches a single character.

	Wildcard Examples:
	- "Root/SubDir/*": Matches all files in the "Root/SubDir" directory.
	- "Root/SubDir/*.txt": Matches all files with the extension ".txt" in the "Root/SubDir" directory.
	- "Root/SubDir/File?.txt": Matches files like "File1.txt" and "File2.txt" in the "Root/SubDir" directory.
/;

string[] Function GetDirectories(string asPath, string asSearchPattern = "", bool abRecursive = false) Global Native
string[] Function GetFiles(string asPath, string asSearchPattern = "", bool abRecursive = false) Global Native

bool Function Exists(string asPath) Global Native
bool Function IsEmpty(string asPath) Global Native

bool Function Create(string asPath) Global Native
bool Function Move(string asOldPath, string asNewPath) Global Native
bool Function Copy(string asOldPath, string asNewPath, bool abOverwrite = false) Global Native
int Function Delete(string asPath) Global Native
