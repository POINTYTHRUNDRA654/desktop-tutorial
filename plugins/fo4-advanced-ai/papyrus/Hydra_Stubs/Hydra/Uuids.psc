Scriptname Hydra:Uuids Const Hidden Native

;/
	Provides functions and a wrapper for Universally Unique Identifiers (UUIDs).
/;

Struct Uuid
	int iData01 = 0
	int iData02 = 0
	int iData03 = 0
	int iData04 = 0
EndStruct

Uuid Function Generate() Global Native

Uuid Function FromBytes(int[] akValues) Global Native
int[] Function ToBytes(Uuid akValue) Global Native

Uuid Function FromString(string asValue) Global Native
string Function ToString(Uuid akValue) Global Native

int Function Compare(Uuid akLeft, Uuid akRight) Global Native
bool Function Equals(Uuid akLeft, Uuid akRight) Global Native
