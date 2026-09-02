Scriptname Hydra:IO:Toml Const Hidden Native

;/
	Provides functions for TOML files.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
	- Nested tables are separated by dots (".") and the key is separated by a colon (":"), e.g. "MyTable.SubTable:MyKey".
	- Tables and keys are treated case-insensitively.
/;

;/
	Caching System

	Notes:
	- These functions allow you to cache TOML files into memory for faster access.
	- Cached files can be accessed using the `Hydra:MemMap` and `Hydra:SaveMap` scripts.
	- Paths with backward-slashes ("\\") are automatically converted to forward slashes ("/").

	TOML Example:
	```
	[MyTable.SubTable]
	iMyValue = 123
	```

	Script Example 01:
	```
	If (Hydra:IO:Toml.Cache_MemMap("MyFolder/MyFile.toml"))
		int iMyValue = Hydra:MemMap.GetValue("MyFolder/MyFile.toml", "MyTable.SubTable:iMyValue") as int
	EndIf
	```

	Script Example 02:
	```
	If (Hydra:IO:Toml.CacheTo_MemMap("MyFolder/MyFile.toml", "MyMemMapNamespace"))
		int iMyValue = Hydra:MemMap.GetValue("MyMemMapNamespace", "MyTable.SubTable:iMyValue") as int
		iMyValue += 1

		Hydra:MemMap.SetValue("MyMemMapNamespace", "MyTable.SubTable:iMyValue", iMyValue)
		Hydra:IO:Toml.SaveCachedTo_MemMap("MyMemMapNamespace", "MyFolder/MyFile.toml")
	EndIf
	```
/;

bool Function IsCached_TempMap(string asPath) Global Native
bool Function Cache_TempMap(string asPath) Global Native
bool Function CacheTo_TempMap(string asSourcePath, string asTargetNamespace) Global Native
bool Function Uncache_TempMap(string asPath) Global Native
bool Function SaveCached_TempMap(string asPath) Global Native
bool Function SaveCachedTo_TempMap(string asSourceNamespace, string asTargetPath) Global Native

bool Function IsCached_MemMap(string asPath) Global Native
bool Function Cache_MemMap(string asPath) Global Native
bool Function CacheTo_MemMap(string asSourcePath, string asTargetNamespace) Global Native
bool Function Uncache_MemMap(string asPath) Global Native
bool Function SaveCached_MemMap(string asPath) Global Native
bool Function SaveCachedTo_MemMap(string asSourceNamespace, string asTargetPath) Global Native

bool Function IsCached_SaveMap(string asPath) Global Native
bool Function Cache_SaveMap(string asPath) Global Native
bool Function CacheTo_SaveMap(string asSourcePath, string asTargetNamespace) Global Native
bool Function Uncache_SaveMap(string asPath) Global Native
bool Function SaveCached_SaveMap(string asPath) Global Native
bool Function SaveCachedTo_SaveMap(string asSourceNamespace, string asTargetPath) Global Native
