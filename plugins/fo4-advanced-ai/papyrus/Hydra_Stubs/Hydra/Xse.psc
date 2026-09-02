Scriptname Hydra:Xse Const Hidden Native

;/
	Provides functions for script extender management.

	Notes:
	- The function `GetVersionPack` (and `GetPluginVersionPack`) returns the version as a hex integer in the format 0xMMmmPPPB, where:
		- MM = Major version
		- mm = Minor version
		- PPP = Patch version
		- B = Build number
/;

Import Hydra:Versions

Version Function GetVersion() Global Native
int Function GetVersionPack() Global Native
string Function GetVersionString() Global Native

int Function GetVersionMajor() Global Native
int Function GetVersionMinor() Global Native
int Function GetVersionPatch() Global Native
int Function GetVersionBuild() Global Native

bool Function IsPluginLoaded(string asPluginName) Global Native
Version Function GetPluginVersion(string asPluginName) Global Native
int Function GetPluginVersionPack(string asPluginName) Global Native
int Function GetPluginVersionNumber(string asPluginName) Global Native
