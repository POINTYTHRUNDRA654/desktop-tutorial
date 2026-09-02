Scriptname Hydra:Colors Const Hidden Native

;/
	Provides a data structure for colors.
/;

Import Hydra:Operator

Struct Color
	int iRed = 0
	int iGreen = 0
	int iBlue = 0
	int iAlpha = 255
EndStruct

Color Function Create(int aiRed = 0, int aiGreen = 0, int aiBlue = 0, int aiAlpha = 255) Global
	Color kColor = new Color
	kColor.iRed = aiRed
	kColor.iGreen = aiGreen
	kColor.iBlue = aiBlue
	kColor.iAlpha = aiAlpha
	return kColor
EndFunction

Color Function FromHexRgb(int aiValue) Global Native
int Function ToHexRgb(Color akColor) Global Native

Color Function FromHexRgba(int aiValue) Global Native
int Function ToHexRgba(Color akColor) Global Native

Color Function FromRgbString(string asValue) Global Native
string Function ToRgbString(Color akColor) Global Native

Color Function FromRgbaString(string asValue) Global Native
string Function ToRgbaString(Color akColor) Global Native
