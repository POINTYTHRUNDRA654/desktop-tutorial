Scriptname Hydra:Internal Const Hidden Native

;/
	Provides functions related related to this plugin.

	Notes:
	- The function `GetVersionPack` returns the version as a hex integer in the format 0xMMmmPPPB, where:
		- MM = Major version
		- mm = Minor version
		- PPP = Patch version
		- B = Build number
/;

Import Hydra:Versions

bool Function IsLoaded() Global Native

string Function GetName() Global Native

Version Function GetVersion() Global Native
int Function GetVersionPack() Global Native
string Function GetVersionString() Global Native

int Function GetVersionMajor() Global Native
int Function GetVersionMinor() Global Native
int Function GetVersionPatch() Global Native
int Function GetVersionBuild() Global Native
