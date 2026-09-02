Scriptname Hydra:Vectors4 Const Hidden Native

;/
	Provides a data structure for 4D vectors.
/;

Struct Vector4
	float fX = 0.0
	float fY = 0.0
	float fZ = 0.0
	float fW = 0.0
EndStruct

Vector4 Function Create(float afX = 0.0, float afY = 0.0, float afZ = 0.0, float afW = 0.0) Global
	Vector4 kVector = new Vector4
	kVector.fX = afX
	kVector.fY = afY
	kVector.fZ = afZ
	kVector.fW = afW
	return kVector
EndFunction

int Function Compare(Vector4 akLeft, Vector4 akRight) Global Native
bool Function Equals(Vector4 akLeft, Vector4 akRight) Global Native
