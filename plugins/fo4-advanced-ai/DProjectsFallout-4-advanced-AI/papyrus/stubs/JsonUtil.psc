Scriptname JsonUtil Hidden Native

; ── String values ───────────────────────────────────────────────────────────
Bool   Function IsGoodString(String asPath) Global Native
Bool   Function SetStringValue(String asPath, String asKey, String asValue) Global Native
String Function GetStringValue(String asPath, String asKey, String asDefault = "") Global Native
Bool   Function UnsetStringValue(String asPath, String asKey) Global Native

; ── Int values ───────────────────────────────────────────────────────────────
Bool Function SetIntValue(String asPath, String asKey, Int aiValue) Global Native
Int  Function GetIntValue(String asPath, String asKey, Int aiDefault = 0) Global Native

; ── Float values ─────────────────────────────────────────────────────────────
Bool  Function SetFloatValue(String asPath, String asKey, Float afValue) Global Native
Float Function GetFloatValue(String asPath, String asKey, Float afDefault = 0.0) Global Native

; ── Bool values ──────────────────────────────────────────────────────────────
Bool Function SetBoolValue(String asPath, String asKey, Bool abValue) Global Native
Bool Function GetBoolValue(String asPath, String asKey, Bool abDefault = False) Global Native

; ── Form values ──────────────────────────────────────────────────────────────
Bool Function SetFormValue(String asPath, String asKey, Form akValue) Global Native
Form Function GetFormValue(String asPath, String asKey, Form akDefault = None) Global Native

; ── File I/O ─────────────────────────────────────────────────────────────────
Bool Function Save(String asPath) Global Native
Bool Function Load(String asPath) Global Native
Bool Function PathExists(String asPath) Global Native
Function ClearAll(String asPath) Global Native
