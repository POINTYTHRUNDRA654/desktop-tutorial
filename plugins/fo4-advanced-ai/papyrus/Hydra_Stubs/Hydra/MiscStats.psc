Scriptname Hydra:MiscStats Const Hidden Native

;/
	Provides functions for misc/tracked stats.

	Stat Types:
	00	General
	01	Quest
	02	Combat
	03	Crafting
	04	Crime
	05	Sanctuary
	06	Log
	07	MiniGame, Hidden
/;

string[] Function GetKeys() Global Native

bool Function Contains(string asKey) Global Native

string Function GetName(string asKey) Global Native
int Function GetType(string asKey) Global Native
bool Function GetShowIfZero(string asKey) Global Native

int Function GetValue(string asKey, int aiDefault = 0) Global Native
bool Function SetValue(string asKey, int aiValue) Global Native
bool Function ModValue(string asKey, int aiAmount) Global Native
