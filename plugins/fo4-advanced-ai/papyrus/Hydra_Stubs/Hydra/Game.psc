Scriptname Hydra:Game Const Hidden Native

;/
	Provides game-related functions.

	Notes:
	- For more info about process levels,
	  see: https://geckwiki.com/index.php?title=GetActorsByProcessingLevel
	- Distances are measured in game units,
	  see https://ck.uesp.net/wiki/Unit.
	- The `Var[]` filters support the following types:
	  - form types (string)
	  - plugin names (string)
	  - references
	  - base objects
	  - keywords
	  - factions
	  - races
	  - form lists (recursive)
	- For a list of all form types,
	  see: https://github.com/libxse/commonlibf4/blob/main/include/RE/E/ENUM_FORM_ID.h.
	- The perk point functions are clamped to the range [0, 255].
/;

Import Hydra:Vectors3
Import Hydra:Versions

Version Function GetVersion() Global Native

Version Function GetOldGenVersion() Global Native
Version Function GetNextGenVersion() Global Native
Version Function GetAnniversaryEditionVersion() Global Native

bool Function GetIsOnlyOldGen() Global Native
bool Function GetIsOnlyNextGen() Global Native
bool Function GetIsOnlyAnniversaryEdition() Global Native

bool Function GetIsAtLeastOldGen() Global Native
bool Function GetIsAtLeastNextGen() Global Native
bool Function GetIsAtLeastAnniversaryEdition() Global Native

bool Function GetIsNewGame() Global Native
bool Function GetIsFirstGameLoad() Global Native

int Function GetDifficulty() Global Native

int Function GetDifficulty_VeryEasy() Global Native
int Function GetDifficulty_Easy() Global Native
int Function GetDifficulty_Normal() Global Native
int Function GetDifficulty_Hard() Global Native
int Function GetDifficulty_VeryHard() Global Native
int Function GetDifficulty_FakeSurvival() Global Native
int Function GetDifficulty_Survival() Global Native

int Function GetTeammateCount() Global Native

ObjectReference Function GetCurrentCrosshairRef() Global Native
ObjectReference Function GetCurrentCommandTargetRef() Global Native

ObjectReference Function GetLastUsedPowerArmorRef() Global Native
bool Function RemoveLastUsedPowerArmorRef() Global Native

ObjectReference[] Function GetAllMapMarkerRefs() Global Native

Actor[] Function GetActorsByProcessLevel(int aiProcessLevel, \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
Actor[] Function GetActorsInHighProcess( \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
Actor[] Function GetActorsInMiddleHighProcess( \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
Actor[] Function GetActorsInMiddleLowProcess( \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
Actor[] Function GetActorsInLowProcess( \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native

ObjectReference[] Function FindAllRefs( \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
ObjectReference[] Function FindAllRefsInRange(Vector3 akCenter, float afRadius, \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native
ObjectReference[] Function FindAllRefsInRangeFromRef(ObjectReference akOriginRef, float afRadius, \
	Var[] akIncludedObjects = none, Var[] akExcludedObjects = none) Global Native

Cell[] Function GetLoadedCells() Global Native
WorldSpace Function GetCurrentWorldSpace() Global Native

Holotape Function GetPlayingHolotape() Global Native
Function PlayHolotape(Holotape akHolotape) Global Native
bool Function StopHolotape(Holotape akHolotape) Global Native

bool Function GetIsPipBoyLightOn() Global Native
Function SetIsPipBoyLightOn(bool abValue) Global Native

bool Function GetIsTimeFrozen() Global Native
Function SetIsTimeFrozen(bool abValue) Global Native

Race Function GetPlayerCharGenRace() Global Native
Function SetPlayerCharGenRace(Race akValue) Global Native

int Function GetPerkPoints() Global Native
Function SetPerkPoints(int aiValue) Global Native
Function ModPerkPoints(int aiAmount) Global Native
