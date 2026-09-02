Scriptname Hydra:Timer Const Hidden Native

;/
	Provides functions for timed operations.

	Notes:
	- Starting an already active timer will restart it with the new arguments.
	- The time measurement of non-real-time timers is affected by the game's global time multiplier.
	- The `abPersistent` parameter determines whether the timer is stored is saves (`true`)
	  or whether it only persists until the next game load (`false`).
	- All local timers will be automatically stopped once their parent object is deleted.

	Script Example:
	```
	Function MyFunction()
		Var[] kArgs = new Var[1]
		kArgs[0] = 123

		Hydra:Timer.StartGameTime(Hydra:FunctionRefs.CreateLocalRef(self, "MyGameTimerCallback"), 5.0, kArgs)
		Hydra:Timer.StartRepeatingRealTime(Hydra:FunctionRefs.CreateLocalRef(self, "MyRealTimeTimerCallback"), 10.0, kArgs)
	EndFunction

	Function MyGameTimerCallback(int aiValue)
		; ...
	EndFunction

	Function MyRealTimeTimerCallback(int aiValue)
		; ...
	EndFunction
	```
/;

Import Hydra:FunctionRefs

bool Function IsExistent(FunctionRef akFunctionRef) Global Native
bool Function IsPersistent(FunctionRef akFunctionRef) Global Native
bool Function IsRepeating(FunctionRef akFunctionRef) Global Native
bool Function IsActive(FunctionRef akFunctionRef) Global Native
bool Function IsPaused(FunctionRef akFunctionRef) Global Native
bool Function IsRunningInRealTime(FunctionRef akFunctionRef) Global Native
bool Function IsRunningInGameMode(FunctionRef akFunctionRef) Global Native
bool Function IsRunningInMenuMode(FunctionRef akFunctionRef) Global Native
bool Function IsRunningInGameTime(FunctionRef akFunctionRef) Global Native

bool Function Pause(FunctionRef akFunctionRef) Global Native
bool Function Resume(FunctionRef akFunctionRef) Global Native
bool Function Stop(FunctionRef akFunctionRef) Global Native

bool Function StopAllLocal(ScriptObject akObject) Global Native
bool Function StopAllGlobal(string asScriptName) Global Native

float Function GetIntervalSeconds(FunctionRef akFunctionRef) Global Native
float Function GetElapsedSeconds(FunctionRef akFunctionRef) Global Native
float Function GetRemainingSeconds(FunctionRef akFunctionRef) Global Native

bool Function StartRealTime(FunctionRef akFunctionRef, float afDelaySeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartGameMode(FunctionRef akFunctionRef, float afDelaySeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartMenuMode(FunctionRef akFunctionRef, float afDelaySeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartGameTime(FunctionRef akFunctionRef, float afDelaySeconds, Var[] akArgs = none, bool abPersistent = false) Global Native

bool Function StartRepeatingRealTime(FunctionRef akFunctionRef, float afIntervalSeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartRepeatingGameMode(FunctionRef akFunctionRef, float afIntervalSeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartRepeatingMenuMode(FunctionRef akFunctionRef, float afIntervalSeconds, Var[] akArgs = none, bool abPersistent = false) Global Native
bool Function StartRepeatingGameTime(FunctionRef akFunctionRef, float afIntervalSeconds, Var[] akArgs = none, bool abPersistent = false) Global Native

Function WaitForNextFrame() Global Native
