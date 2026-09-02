Scriptname Game Hidden Native

Actor  Function GetPlayer() Global Native
Actor  Function FindClosestActor(Float afX, Float afY, Float afZ, Float afRadius) Global Native
Actor  Function FindRandomActor(Float afX, Float afY, Float afZ, Float afRadius) Global Native
Actor  Function FindClosestActorFromRef(ObjectReference arCenter, Float afRadius) Global Native
Actor  Function FindRandomActorFromRef(ObjectReference arCenter, Float afRadius) Global Native
Form   Function GetFormFromFile(Int aiFormID, String asFilename) Global Native
Form   Function GetForm(Int aiFormID) Global Native
CommonPropertiesScript Function GetCommonProperties() Global Native
Float  Function GetCurrentGameTime() Global Native
Int    Function GetDifficulty() Global Native
Bool   Function IsInMainMenu() Global Native
Function IncrementStat(String asStat, Int aiAmount = 1) Global Native
Function ShowRaceMenu() Global Native
Function ForceFirstPerson() Global Native
Function ForceThirdPerson() Global Native
Function QuitToMainMenu() Global Native
Int    Function GetCameraState() Global Native
Actor  Function GetActorByID(Int aiActorID) Global Native
Int    Function GetModByName(String asModName) Global Native
