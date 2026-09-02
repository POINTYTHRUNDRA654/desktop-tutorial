Scriptname Hydra:IO:Space Const Hidden Native

;/
	Provides functions for retrieving file system space information.
/;

Import Hydra:Int64

Struct SpaceInfo
	Long lTotalSpace
	Long lFreeSpace
	Long lAvailableSpace
EndStruct

SpaceInfo Function GetCurrentSpaceInfo() Global Native
