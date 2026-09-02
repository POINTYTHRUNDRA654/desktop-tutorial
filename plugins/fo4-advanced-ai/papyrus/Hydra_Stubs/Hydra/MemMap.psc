Scriptname Hydra:MemMap Const Hidden Native

;/
	Provides functions to quickly store and retrieve semi-persistent variant maps.

	Notes:
	- The keys and values only persist for the current game session.
	- For script objects, arrays and structs: the values are still stored on saves,
	  but are discarded when reloading the save on a new game session.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
	- Note that nested reference types inside structs will not be restored on save load, due to an engine bug.
/;

Import Hydra:VarPairs

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
