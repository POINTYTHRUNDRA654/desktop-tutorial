Scriptname Hydra:TempSet Const Hidden Native

;/
	Provides functions to quickly store and retrieve temporary variant sets.

	Notes:
	- The keys only persist until the next game load or the game is exited.
	- To store and retrieve arrays, use the var as array conversion functions from `Hydra:Arrays`.
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
