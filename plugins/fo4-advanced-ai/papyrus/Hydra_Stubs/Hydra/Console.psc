Scriptname Hydra:Console Const Hidden Native

;/
	Provides functions to interact with the console menu.

	Notes:
	- For a list of all console commands, see: https://gist.github.com/reg2k/bad5567d30787067dcaa42ba948ce87e.
	- For format specifications, see: https://fmt.dev/latest/syntax.

	Format Example:
	```
	Var[] kArgs = new Var[3]
	kArgs[0] = 10
	kArgs[1] = 20
	kArgs[2] = 30
	Hydra:Console.WriteLineFormat("{} + {} = {}", kArgs) ; -> "10 + 20 = 30"
	```
/;

ObjectReference[] Function GetSelectableRefs() Global Native

ObjectReference Function GetSelectedRef() Global Native
bool Function SetSelectedRef(ObjectReference akRef) Global Native
bool Function ClearSelectedRef() Global Native

string Function GetHistory() Global Native
Function SetHistory(string asHistory) Global Native
Function Clear() Global Native

Function Write(string asText) Global Native
Function WriteLine(string asText) Global Native

Function WriteFormat(string asFormat, Var[] akArgs = none) Global Native
Function WriteLineFormat(string asFormat, Var[] akArgs = none) Global Native

bool Function ExecuteSingleLineCommand(string asCommand, ObjectReference akTargetRef = none, bool abSilent = true) Global Native
bool Function ExecuteMultiLineCommand(string asCommand, ObjectReference akTargetRef = none, bool abSilent = true) Global Native
