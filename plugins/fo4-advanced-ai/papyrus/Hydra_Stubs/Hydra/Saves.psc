Scriptname Hydra:Saves Const Hidden Native

;/
	Provides functions for the game's saves.

	Notes:
	- On failure, the save functions will return an empty string or `false`.
	- The `abSilent` parameter suppresses all notifications when saving,
	  and the missing mods warning when loading a save.
/;

Import Hydra:Int64

bool Function IsLoadingAllowed() Global Native
bool Function IsSavingAllowed() Global Native
bool Function IsAutoSavingAllowed() Global Native

bool Function IsSaveExistent(string asSaveName) Global Native

string Function GetCurrentSaveName() Global Native

Long Function GetCurrentProfileId() Global Native
string Function GetCurrentProfileName() Global Native

int Function GetCurrentSaveNumber() Global Native
int Function GetCurrentAutoSaveNumber() Global Native

bool Function LoadSave(string asSaveName, bool abSilent = false) Global Native
bool Function QuickLoad() Global Native

string Function CustomSave(string asSaveName, bool abSilent = false) Global Native
string Function FullSave(bool abSilent = false) Global Native
string Function AutoSave(bool abSilent = false) Global Native
string Function QuickSave(bool abSilent = false) Global Native

bool Function CustomSaveAsync(string asSaveName, bool abSilent = false) Global Native
bool Function FullSaveAsync(bool abSilent = false) Global Native
bool Function AutoSaveAsync(bool abSilent = false) Global Native
bool Function QuickSaveAsync(bool abSilent = false) Global Native

bool Function DeleteSave(string asSaveName) Global Native

float Function GetLoadInFadeDuration() Global Native
Function SetLoadInFadeDuration(float afValue) Global Native

bool Function GetEnableAutoSaves() Global Native
Function SetEnableAutoSaves(bool abValue) Global Native

bool Function GetDoSaveOnWorkshopExit() Global Native
Function SetDoSaveOnWorkshopExit(bool abValue) Global Native

bool Function GetDoSaveOnFastTravel() Global Native
Function SetDoSaveOnFastTravel(bool abValue) Global Native

bool Function GetDoSaveOnRest() Global Native
Function SetDoSaveOnRest(bool abValue) Global Native

bool Function GetDoSaveOnWait() Global Native
Function SetDoSaveOnWait(bool abValue) Global Native

int Function GetMaxAutoSaveCount() Global Native
Function SetMaxAutoSaveCount(int aiValue) Global Native
