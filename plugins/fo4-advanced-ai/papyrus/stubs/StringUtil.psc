Scriptname StringUtil Hidden Native

Int    Function GetLength(String asString) Global Native
String Function Substring(String asString, Int aiStart, Int aiLength = -1) Global Native
Int    Function Find(String asString, String asSubString, Int aiStart = 0) Global Native
Bool   Function IsLetter(String asChar) Global Native
Bool   Function IsDigit(String asChar) Global Native
Bool   Function IsPunctuation(String asChar) Global Native
Bool   Function IsWhitespace(String asChar) Global Native
String Function GetChar(String asString, Int aiIndex) Global Native
String Function ToLower(String asString) Global Native
String Function ToUpper(String asString) Global Native
String Function AsString(Int aiValue) Global Native
String Function FloatAsString(Float afValue, Int aiDecimalPlaces = 2) Global Native
Int    Function AsInt(String asString) Global Native
Float  Function AsFloat(String asString) Global Native
