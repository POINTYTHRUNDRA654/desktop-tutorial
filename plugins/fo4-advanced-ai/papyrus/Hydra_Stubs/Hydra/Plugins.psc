Scriptname Hydra:Plugins Const Hidden Native

;/
	Provides functions for the game's plugins.
/;

bool Function IsPluginLoaded(string asPluginName) Global Native
bool Function IsNthPluginLoaded(int aiPluginIndex) Global Native

int Function GetPluginCount() Global Native

int Function GetPluginIndex(string asPluginName) Global Native
string Function GetNthPluginName(int aiPluginIndex) Global Native
