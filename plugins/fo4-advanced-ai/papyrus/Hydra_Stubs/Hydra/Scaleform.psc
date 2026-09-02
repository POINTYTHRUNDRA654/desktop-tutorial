Scriptname Hydra:Scaleform Const Hidden Native

;/
	Provides functions for the game's UI system.

	Notes:
	- Nested paths are separated by dots ("."), like "root1.visible".
	- Scaleform's strings are case-sensitive, so be sure to match the casing exactly.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
	- Strict strings can also be used here;
	  see the script `Hydra:StrictStrings` for more information.

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

bool Function IsMenuRegistered(string asMenuName) Global Native
bool Function IsMenuOpen(string asMenuName) Global Native

bool Function OpenMenu(string asMenuName) Global Native
bool Function CloseMenu(string asMenuName) Global Native

bool Function ContainsVariable(string asMenuName, string acsVarPath) Global Native

Var Function GetVariable(string asMenuName, string acsVarPath) Global Native
Var Function GetVariableOrDefault(string asMenuName, string acsVarPath, Var avDefault) Global Native

bool Function SetVariable(string asMenuName, string acsVarPath, Var avValue) Global Native

Var Function Invoke(string asMenuName, string acsFuncPath, Var[] akArgs = none) Global Native
bool Function InvokeAsync(string asMenuName, string acsFuncPath, Var[] akArgs = none) Global Native


;/
	Struct Serialization

	Notes:
	- These functions allow you to serialize and deserialize script structs to and from scaleform variables.
	- Struct names use the following format: "MyNamespace:MyScript#MyStruct".

	Script Struct Format:
	```
	Struct MyStruct
		bool bMyBool = true
		int iMyInt = 123
		float fMyFloat = 123.456
	EndStruct
	```

	Scaleform Struct Format:
	```
	{
		"bMyBool": true,
		"iMyInt": 123,
		"fMyFloat": 123.456
	}
	```
/;

Var Function Deserialize(string asMenuName, string acsVarPath, string asStructName) Global Native
bool Function Serialize(string asMenuName, string acsVarPath, Var avStruct) Global Native
