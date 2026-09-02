Scriptname Hydra:IO:Ini Const Hidden Native

;/
	Provides functions for INI files.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
	- Settings use the following format: "MySection:MyKey".
	- Sections and keys are treated case-insensitively.
	- Valid boolean values are: `true`, `false`, `yes`, `no`, `on`, `off`, `1` and `0` (case-insensitive).
	- Quoted string values are supported.
/;

;/
	Caching System

	Notes:
	- These functions allow you to cache INI files into memory for faster access.
	- Cached files can be accessed using the `Hydra:MemMap` and `Hydra:SaveMap` scripts.
	- Paths with backward-slashes ("\\") are automatically converted to forward slashes ("/").

	INI Example:
	```
	[MySection]
	iMyValue = 42
	```

	Script Example 01:
	```
	If (Hydra:IO:Ini.Cache_MemMap("MyFolder/MyFile.ini"))
		int iMyValue = Hydra:MemMap.GetValue("MyFolder/MyFile.ini", "MySection:iMyValue") as int
	EndIf
	```

	Script Example 02:
	```
	If (Hydra:IO:Ini.CacheTo_MemMap("MyFolder/MyFile.ini", "MyMemMapNamespace"))
		int iMyValue = Hydra:MemMap.GetValue("MyMemMapNamespace", "MySection:iMyValue") as int
		iMyValue += 1

		Hydra:MemMap.SetValue("MyMemMapNamespace", "MySection:iMyValue", iMyValue)
		Hydra:IO:Ini.SaveCachedTo_MemMap("MyMemMapNamespace", "MyFolder/MyFile.ini")
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
