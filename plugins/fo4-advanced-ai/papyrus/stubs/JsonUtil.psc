Scriptname JsonUtil Hidden Native

Bool   Function IsGoodString(String asPath) Global Native
Bool   Function JsonExists(String asPath) Global Native

Bool   Function SetStringValue(String asPath, String asKey, String asValue) Global Native
String Function GetStringValue(String asPath, String asKey, String asDefault = "") Global Native
Bool   Function UnsetStringValue(String asPath, String asKey) Global Native

Bool   Function SetIntValue(String asPath, String asKey, Int aiValue) Global Native
Int    Function GetIntValue(String asPath, String asKey, Int aiDefault = 0) Global Native
Int    Function GetIntField(String asPath, String asKey, Int aiDefault = 0) Global Native

Bool   Function SetFloatValue(String asPath, String asKey, Float afValue) Global Native
Float  Function GetFloatValue(String asPath, String asKey, Float afDefault = 0.0) Global Native
Float  Function GetFloatField(String asPath, String asKey, Float afDefault = 0.0) Global Native

Bool   Function SetBoolValue(String asPath, String asKey, Bool abValue) Global Native
Bool   Function GetBoolValue(String asPath, String asKey, Bool abDefault = False) Global Native

Bool   Function SetFormValue(String asPath, String asKey, Form akValue) Global Native
Form   Function GetFormValue(String asPath, String asKey, Form akDefault = None) Global Native

Bool   Function Save(String asPath) Global Native
Bool   Function Load(String asPath) Global Native
Bool   Function PathExists(String asPath) Global Native
Function ClearAll(String asPath) Global Native
String Function GetStringField(String asPath, String asKey, String asDefault = "") Global Native
