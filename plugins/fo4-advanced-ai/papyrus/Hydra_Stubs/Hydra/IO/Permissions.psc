Scriptname Hydra:IO:Permissions Const Hidden Native

;/
	Provides functions for file system permissions.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
/;

int Function GetFlag_OwnerRead() Global Native
int Function GetFlag_OwnerWrite() Global Native
int Function GetFlag_OwnerExecute() Global Native
int Function GetFlag_OwnerAll() Global Native

int Function GetFlag_GroupRead() Global Native
int Function GetFlag_GroupWrite() Global Native
int Function GetFlag_GroupExecute() Global Native
int Function GetFlag_GroupAll() Global Native

int Function GetFlag_OthersRead() Global Native
int Function GetFlag_OthersWrite() Global Native
int Function GetFlag_OthersExecute() Global Native
int Function GetFlag_OthersAll() Global Native

int Function GetFlag_AllRead() Global Native
int Function GetFlag_AllWrite() Global Native
int Function GetFlag_AllExecute() Global Native
int Function GetFlag_All() Global Native

int Function GetPermissionFlags(string asPath, int aiDefault = -1) Global Native
bool Function SetPermissionFlags(string asPath, int aiFlags) Global Native
bool Function AddPermissionFlags(string asPath, int aiFlags) Global Native
bool Function RemovePermissionFlags(string asPath, int aiFlags) Global Native
