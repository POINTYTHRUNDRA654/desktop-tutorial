Scriptname Hydra:Assert Const Hidden Native DebugOnly

;/
	Provides functions for asserting conditions in code.
/;

Function IsTrue(bool abCondition, string asMessage = "") Global Native DebugOnly
Function IsFalse(bool abCondition, string asMessage = "") Global Native DebugOnly

Function IsNone(Var avValue, string asMessage = "") Global Native DebugOnly
Function NotNone(Var avValue, string asMessage = "") Global Native DebugOnly

Function Equals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly
Function NotEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly

Function DeepEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly
Function DeepNotEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly

Function RefEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly
Function RefNotEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly

Function TypeEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly
Function TypeNotEquals(Var avLeft, Var avRight, string asMessage = "") Global Native DebugOnly
