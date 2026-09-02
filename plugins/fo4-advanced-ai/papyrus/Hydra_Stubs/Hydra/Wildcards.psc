Scriptname Hydra:Wildcards Const Hidden Native

;/
	Provides functions for wildcard pattern matching.

	Notes:
	- The following wildcard characters are supported:
	  - "*": Matches zero or more characters.
	  - "?": Matches exactly one character.

	Examples:
	- "file*.txt" matches "file.txt", "file1.txt", "file_backup.txt".
	- "data??.csv" matches "data01.csv", "dataAB.csv", but not "data1.csv" or "data123.csv".
/;

bool Function IsMatch(string asString, string asPattern) Global Native
