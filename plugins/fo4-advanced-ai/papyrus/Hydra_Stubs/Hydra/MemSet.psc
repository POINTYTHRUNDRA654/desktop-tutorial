Scriptname Hydra:MemSet Const Hidden Native

;/
	Provides functions to quickly store and retrieve semi-persistent variant sets.

	Notes:
	- The keys only persist for the current game session.
	- For script objects, arrays and structs: the values are still stored on saves,
	  but are discarded when reloading the save on a new game session.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
	- Note that nested reference types inside structs will not be restored on save load, due to an engine bug.
/;

string[] Function GetNamespaces() Global Native
Var[] Function GetKeys(string asNamespace) Global Native

int Function GetNamespaceSize() Global Native

bool Function ContainsNamespace(string asNamespace) Global Native
bool Function ContainsKey(string asNamespace, Var avKey) Global Native

bool Function Add(string asNamespace, Var avKey) Global Native
bool Function AddRange(string asNamespace, Var[] akKeys) Global Native

bool Function RemoveKey(string asNamespace, Var avKey) Global Native
bool Function RemoveNamespace(string asNamespace) Global Native
