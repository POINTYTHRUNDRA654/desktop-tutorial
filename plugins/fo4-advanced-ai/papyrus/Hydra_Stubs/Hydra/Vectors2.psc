Scriptname Hydra:Vectors2 Const Hidden Native

;/
	Provides a data structure for 2D vectors.
/;

Struct Vector2
	float fX = 0.0
	float fY = 0.0
EndStruct

Vector2 Function Create(float afX = 0.0, float afY = 0.0) Global
	Vector2 kVector = new Vector2
	kVector.fX = afX
	kVector.fY = afY
	return kVector
EndFunction

int Function Compare(Vector2 akLeft, Vector2 akRight) Global Native
bool Function Equals(Vector2 akLeft, Vector2 akRight) Global Native
