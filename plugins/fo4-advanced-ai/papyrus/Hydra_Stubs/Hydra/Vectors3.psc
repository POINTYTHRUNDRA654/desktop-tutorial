Scriptname Hydra:Vectors3 Const Hidden Native

;/
	Provides a data structure for 3D vectors.
/;

Struct Vector3
	float fX = 0.0
	float fY = 0.0
	float fZ = 0.0
EndStruct

Vector3 Function Create(float afX = 0.0, float afY = 0.0, float afZ = 0.0) Global
	Vector3 kVector = new Vector3
	kVector.fX = afX
	kVector.fY = afY
	kVector.fZ = afZ
	return kVector
EndFunction

int Function Compare(Vector3 akLeft, Vector3 akRight) Global Native
bool Function Equals(Vector3 akLeft, Vector3 akRight) Global Native
