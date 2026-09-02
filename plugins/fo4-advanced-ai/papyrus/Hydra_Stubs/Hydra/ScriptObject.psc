Scriptname Hydra:ScriptObject Const Hidden Native

;/
	Provides functions for script objects, the base type of all scripts.

	Notes:
	- Script object handles can be one of the following formats:
		- Forms:
			- 0xXYYYYZZZZZZZZ, where X is equal to 0x0,
				YYYY is equal to 0xFFFF (uint16),
				and ZZZZZZZZ is the form ID as hex (uint32).
		- Aliases:
			- 0xXYYYYZZZZZZZZ, where X is equal to 0x0,
				YYYY is the alias ID as hex (uint16),
				and ZZZZZZZZ is the quest form ID as hex (uint32).
		- Inventory Objects:
			- 0xXYYYYZZZZZZZZ, where X is equal to 0x1,
				YYYY is the inventory object ID as hex (uint16),
				and ZZZZZZZZ is the ref form ID as hex (uint32).
		- Active Effects:
			- 0xXYYYYZZZZZZZZ, where X is equal to 0x2,
				YYYY is the active effect ID as hex (uint16),
				and ZZZZZZZZ is the actor form ID as hex (uint32).
		- Input Enable Layers:
			- 0xXYYYYZZZZZZZZ, where X is equal to 0x3,
				YYYY is equal to 0x0000 (uint16),
				and ZZZZZZZZ is the input enable layer ID as hex (uint32).
	- Exterior cell editor IDs are not supported.
/;

Import Hydra:Int64
Import Hydra:Pairs

bool Function IsInstanceOf(ScriptObject akObject, string asScriptName) Global Native

bool Function IsRegisteredForRemoteEvent(ScriptObject akObject, ScriptObject akSender, string asEventName) Global Native
bool Function IsRegisteredForExternalEvent(ScriptObject akObject, string asEventName, string asFunctionName = "") Global Native

bool Function IsTimerActive(ScriptObject akObject, int aiTimerId = 0) Global Native
bool Function IsTimerGameTimeActive(ScriptObject akObject, int aiTimerId = 0) Global Native

float Function GetTimerRemainingTime(ScriptObject akObject, int aiTimerId = 0) Global Native
float Function GetTimerGameTimeRemainingTime(ScriptObject akObject, int aiTimerId = 0) Global Native

int[] Function GetActiveTimerIds(ScriptObject akObject) Global Native
int[] Function GetActiveTimerGameTimeIds(ScriptObject akObject) Global Native

Function CancelAllTimers(ScriptObject akObject) Global Native
Function CancelAllGameTimeTimers(ScriptObject akObject) Global Native

Form Function GetFormById(int aiFormId) Global Native
Form Function GetFormByEditorId(string asEditorId) Global Native
Form Function GetFormFromPlugin(int aiLocalFormId, string asPluginName) Global Native
Alias Function GetAliasById(int aiAliasId, Quest akQuest) Global Native
ObjectReference Function GetInventoryRefById(int aiItemId, ObjectReference akContainerRef) Global Native
ActiveMagicEffect Function GetActiveEffectById(int aiActiveEffectId, Actor akActor) Global Native
InputEnableLayer Function GetInputLayerById(int aiInputLayerId) Global Native

Long Function GetHandle(ScriptObject akObject) Global Native

string Function GetScriptName(ScriptObject akObject) Global Native
string Function GetParentScriptName(ScriptObject akObject) Global Native

bool Function ContainsVariable(ScriptObject akObject, string asName) Global Native
Var Function GetVariableValue(ScriptObject akObject, string asName) Global Native
bool Function SetVariableValue(ScriptObject akObject, string asName, Var avValue) Global Native

bool Function ContainsAutoProperty(ScriptObject akObject, string asName) Global Native
Var Function GetAutoPropertyValue(ScriptObject akObject, string asName) Global Native
bool Function SetAutoPropertyValue(ScriptObject akObject, string asName, Var avValue) Global Native

bool Function ContainsGetterProperty(ScriptObject akObject, string asName) Global Native
bool Function ContainsSetterProperty(ScriptObject akObject, string asName) Global Native

Var Function InvokeGetterProperty(ScriptObject akObject, string asName) Global Native
bool Function InvokeSetterProperty(ScriptObject akObject, string asName, Var avValue) Global Native
bool Function InvokeSetterPropertyAsync(ScriptObject akObject, string asName, Var avValue) Global Native
