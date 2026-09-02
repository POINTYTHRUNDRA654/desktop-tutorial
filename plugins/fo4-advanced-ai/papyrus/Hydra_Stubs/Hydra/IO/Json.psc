Scriptname Hydra:IO:Json Const Hidden Native

;/
	Provides functions for JSON files.

	Notes:
	- These functions are only valid within the game's root- and its sub-directories.
	- Nested keys are separated by forward slashes ("/"), e.g. "/root/node/array/0";
	  see: https://datatracker.ietf.org/doc/html/rfc6901#section-3.
	- Keys are treated case-insensitively.

	Form Format:
	"@Form:'{scriptName}'|'{pluginName}'|{hexFormId}"
	Form Example:
	"@Form:'MyScript'|'MyPlugin.esp'|0x123456"

	Alias Format:
	"@Alias:'{scriptName}'|{decAliasId}|'{pluginName}'|{hexQuestId}"
	Alias Example:
	"@Alias:'MyScript'|123|'MyPlugin.esp'|0x123456"

	Inventory Ref Format:
	"@InventoryRef:'{scriptName}'|{decItemId}|'{pluginName}'|{hexContainerRefId}"
	Inventory Ref Example:
	"@InventoryRef:'MyScript'|123|'MyPlugin.esp'|0x123456"

	Active Effect Format:
	"@ActiveEffect:'{scriptName}'|{decEffectId}|'{pluginName}'|{hexActorId}"
	Active Effect Example:
	"@ActiveEffect:'MyScript'|123|'MyPlugin.esp'|0x123456"

	Input Layer Format:
	"@InputLayer:'{scriptName}'|{decInputLayerId}"
	Input Layer Example:
	"@InputLayer:'MyScript'|123"
/;

;/
	Caching System

	Notes:
	- These functions allow you to cache JSON files into memory for faster access.
	- Cached files can be accessed using the `Hydra:MemMap` and `Hydra:SaveMap` scripts.
	- Paths with backward-slashes ("\\") are automatically converted to forward slashes ("/").

	JSON Example:
	```
	{
		"kMyObject": {
			"iMyValue": 123
		}
	}
	```

	Script Example 01:
	```
	If (Hydra:IO:Json.Cache_MemMap("MyFolder/MyFile.json"))
		int iMyValue = Hydra:MemMap.GetValue("MyFolder/MyFile.json", "/kMyObject/iMyValue") as int
	EndIf
	```

	Script Example 02:
	```
	If (Hydra:IO:Json.CacheTo_MemMap("MyFolder/MyFile.json", "MyMemMapNamespace"))
		int iMyValue = Hydra:MemMap.GetValue("MyMemMapNamespace", "/kMyObject/iMyValue") as int
		iMyValue += 1

		Hydra:MemMap.SetValue("MyMemMapNamespace", "/kMyObject/iMyValue", iMyValue)
		Hydra:IO:Json.SaveCachedTo_MemMap("MyMemMapNamespace", "MyFolder/MyFile.json")
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

;/
	Struct Serialization

	Notes:
	- These functions allow you to serialize and deserialize script structs to and from JSON files.
	- Struct names use the following format: "MyNamespace:MyScript#MyStruct".

	Script Struct Format:
	```
	Struct MyStruct
		bool bMyBool = true
		int iMyInt = 123
		float fMyFloat = 123.456
	EndStruct
	```

	JSON Struct Format:
	```
	{
		"bMyBool": true,
		"iMyInt": 123,
		"fMyFloat": 123.456
	}
	```
/;

Var Function Deserialize(string asPath, string asStructName) Global Native
bool Function Serialize(string asPath, Var avStruct) Global Native
