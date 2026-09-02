Scriptname Hydra:StringPairs Const Hidden Native

;/
	Provides a data structure for string pairs.
/;

Struct StringPair
	string sKey
	string sValue
EndStruct

StringPair Function Create(string asKey, string asValue) Global
	StringPair kPair = new StringPair
	kPair.sKey = asKey
	kPair.sValue = asValue
	return kPair
EndFunction

int Function Compare(StringPair akLeft, StringPair akRight) Global Native
bool Function Equals(StringPair akLeft, StringPair akRight) Global Native
