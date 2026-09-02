Scriptname Hydra:Versions Const Hidden Native

;/
	Provides a data structure for versions.

	Notes:
	- The pack functions treat the version as a hex integer in the format 0xMMmmPPPB, where:
		- MM = Major version
		- mm = Minor version
		- PPP = Patch version
		- B = Build number
/;

Struct Version
	int iMajor = 0
	int iMinor = 0
	int iPatch = 0
	int iBuild = 0
EndStruct

Version Function Create(int aiMajor = 0, int aiMinor = 0, int aiPatch = 0, int aiBuild = 0) Global
	Version kVersion = new Version
	kVersion.iMajor = aiMajor
	kVersion.iMinor = aiMinor
	kVersion.iPatch = aiPatch
	kVersion.iBuild = aiBuild
	return kVersion
EndFunction

int Function Pack(Version akValue) Global Native
Version Function Unpack(int aiValue) Global Native

Version Function FromString(string asValue) Global Native
string Function ToString(Version akValue) Global Native

int Function Compare(Version akLeft, Version akRight) Global Native
bool Function Equals(Version akLeft, Version akRight) Global Native
