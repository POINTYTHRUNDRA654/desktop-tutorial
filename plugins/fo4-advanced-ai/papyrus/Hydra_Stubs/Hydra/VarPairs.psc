Scriptname Hydra:VarPairs Const Hidden Native
;/
    Compilation stub — Var fields in structs not supported by FO4 CK compiler.
    Hydra's pre-compiled .pex handles runtime.
/;
Struct VarPair
    String vKey
    String vValue
EndStruct

VarPair Function Create(Var avKey, Var avValue) Global
    VarPair kPair  = new VarPair
    kPair.vKey     = avKey as String
    kPair.vValue   = avValue as String
    return kPair
EndFunction

int Function Compare(VarPair akLeft, VarPair akRight) Global Native
bool Function Equals(VarPair akLeft, VarPair akRight) Global Native
