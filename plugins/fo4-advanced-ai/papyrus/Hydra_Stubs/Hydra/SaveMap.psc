Scriptname Hydra:SaveMap Const Hidden Native

;/
	Provides functions to quickly store and retrieve persistent variant maps.

	Notes:
	- The keys and values persist between saves and are stored in F4SE's co-save file.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
	- For each namespace, you need to create a mapping file in "Data/Hydra/ScriptSaveMaps/*.json".

	Mapping Example:
	```
	{
		"saveMaps": [
			{
				"namespace": "MyNamespace"
			}
		]
	}
	```
/;

Import Hydra:VarPairs

bool Function IsNamespaceValid(string asNamespace) Global Native

string[] Function GetNamespaces() Global Native
Var[] Function GetKeys(string asNamespace) Global Native
Var[] Function GetValues(string asNamespace) Global Native

VarPair[] Function GetPairs(string asNamespace) Global Native
bool Function SetPairs(string asNamespace, VarPair[] akPairs) Global Native

int Function GetNamespaceSize() Global Native
int Function GetKeySize(string asNamespace) Global Native

bool Function ContainsNamespace(string asNamespace) Global Native
bool Function ContainsKey(string asNamespace, Var avKey) Global Native

Var Function GetValue(string asNamespace, Var avKey) Global Native
Var Function GetValueOrDefault(string asNamespace, Var avKey, Var avDefault) Global Native

bool Function SetValue(string asNamespace, Var avKey, Var avValue) Global Native

bool Function Update(string asNamespace, Var avKey, Var avNewValue, Var avCompareValue) Global Native
bool Function Add(string asNamespace, Var avKey, Var avValue) Global Native

Var Function AddOrUpdate(string asNamespace, Var avKey, Var avAddValue, Var avUpdateValue) Global Native
Var Function GetOrAdd(string asNamespace, Var avKey, Var avValue) Global Native

bool Function RemoveKey(string asNamespace, Var avKey) Global Native
bool Function RemoveNamespace(string asNamespace) Global Native
