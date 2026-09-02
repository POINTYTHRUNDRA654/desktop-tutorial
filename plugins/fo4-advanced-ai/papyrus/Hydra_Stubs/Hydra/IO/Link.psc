Scriptname Hydra:IO:Link Const Hidden Native

;/
	Provides functions for symbolic and hard links.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
/;

bool Function IsSymbolicLink(string asPath) Global Native
int Function GetHardLinkCount(string asPath) Global Native

bool Function CreateSymbolicLink(string asSourcePath, string asTargetPath) Global Native
bool Function CreateHardLink(string asSourcePath, string asTargetPath) Global Native
bool Function CopySymbolicLink(string asSourcePath, string asTargetPath) Global Native
string Function ResolveSymbolicLink(string asPath, string asDefault = "") Global Native
