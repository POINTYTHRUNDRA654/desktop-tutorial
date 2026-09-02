Scriptname Hydra:SaveSet Const Hidden Native

;/
	Provides functions to quickly store and retrieve persistent variant sets.

	Notes:
	- The keys persist between saves and are stored in F4SE's co-save file.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
	- For each namespace, you need to create a mapping file in "Data/Hydra/ScriptSaveSets/*.json".

	Mapping Example:
	```
	{
		"saveSets": [
			{
				"namespace": "MyNamespace"
			}
		]
	}
	```
/;

bool Function IsNamespaceValid(string asNamespace) Global Native

string[] Function GetNamespaces() Global Native
Var[] Function GetKeys(string asNamespace) Global Native

int Function GetNamespaceSize() Global Native

bool Function ContainsNamespace(string asNamespace) Global Native
bool Function ContainsKey(string asNamespace, Var avKey) Global Native

bool Function Add(string asNamespace, Var avKey) Global Native
bool Function AddRange(string asNamespace, Var[] akKeys) Global Native

bool Function RemoveKey(string asNamespace, Var avKey) Global Native
bool Function RemoveNamespace(string asNamespace) Global Native
