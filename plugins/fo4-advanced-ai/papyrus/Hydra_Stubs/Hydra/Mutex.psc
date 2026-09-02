Scriptname Hydra:Mutex Const Hidden Native

;/
	Provides functions to manage exclusive mutexes for synchronization across scripts.

	Notes:
	- The state of each mutex is stored in saves.
	- Locking an already owned mutex will cause the calling script to wait indefinitely until the lock can be acquired,
	  so be sure to always unlock the mutex when it is no longer needed, to avoid deadlocks.
	- The "*Current" functions use the calling script object (local) or script name (global) as the context for the mutex,
	  depending on whether the parent function is local or global, and the function name as the key.

	Script Example:
	```
	Function MyThreadSafeFunction()
		Hydra:Mutex.LockCurrent()

		; Do some thread-safe work here...

		Hydra:Mutex.UnlockCurrent()
	EndFunction

	Function MyThreadSafeLocalFunction()
		Hydra:Mutex.LockLocal(self, "MyKey")

		; Do some thread-safe work here...

		Hydra:Mutex.UnlockLocal(self, "MyKey")
	EndFunction

	Function MyThreadSafeGlobalFunction() global
		Hydra:Mutex.LockGlobal("MyNamespace", "MyKey")

		; Do some thread-safe work here...

		Hydra:Mutex.UnlockGlobal("MyNamespace", "MyKey")
	EndFunction
	```
/;

Function LockCurrent() Global Native
Function LockLocal(ScriptObject akObject, string asKey) Global Native
Function LockGlobal(string asNamespace, string asKey) Global Native

Function LockCurrentForSeconds(float afTimeoutSeconds) Global Native
Function LockLocalForSeconds(ScriptObject akObject, string asKey, float afTimeoutSeconds) Global Native
Function LockGlobalForSeconds(string asNamespace, string asKey, float afTimeoutSeconds) Global Native

bool Function TryLockCurrent() Global Native
bool Function TryLockLocal(ScriptObject akObject, string asKey) Global Native
bool Function TryLockGlobal(string asNamespace, string asKey) Global Native

bool Function UnlockCurrent() Global Native
bool Function UnlockLocal(ScriptObject akObject, string asKey) Global Native
bool Function UnlockGlobal(string asNamespace, string asKey) Global Native
