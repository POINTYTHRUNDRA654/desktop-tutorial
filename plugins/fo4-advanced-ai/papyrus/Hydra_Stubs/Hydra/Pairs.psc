Scriptname Hydra:Pairs Const Hidden Native

;/
	Provides a data structure for string-var pairs.
/;

Struct Pair
	string sKey
	Var vValue
EndStruct

Pair Function Create(string asKey, Var avValue) Global
	Pair pair = new Pair
	pair.sKey = asKey
	pair.vValue = avValue
	return pair
EndFunction

int Function Compare(Pair akLeft, Pair akRight) Global Native
bool Function Equals(Pair akLeft, Pair akRight) Global Native
