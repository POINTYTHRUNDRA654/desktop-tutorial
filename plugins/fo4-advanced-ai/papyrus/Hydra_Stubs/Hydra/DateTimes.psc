Scriptname Hydra:DateTimes Const Hidden Native

;/
	Provides a data structure for dates and times.
/;

Struct DateTime
	int iYear = 1
	int iMonth = 1
	int iDay = 1
	int iHour = 0
	int iMinute = 0
	int iSecond = 0
	int iMillisecond = 0
	int iMicrosecond = 0
	int iNanosecond = 0
EndStruct

DateTime Function Create( \
		int aiYear = 1, int aiMonth = 1, int aiDay = 1, \
		int aiHour = 0, int aiMinute = 0, int aiSecond = 0, \
		int aiMillisecond = 0, int aiMicrosecond = 0, int aiNanosecond = 0) Global
	DateTime kDateTime = new DateTime
	kDateTime.iYear = aiYear
	kDateTime.iMonth = aiMonth
	kDateTime.iDay = aiDay
	kDateTime.iHour = aiHour
	kDateTime.iMinute = aiMinute
	kDateTime.iSecond = aiSecond
	kDateTime.iMillisecond = aiMillisecond
	kDateTime.iMicrosecond = aiMicrosecond
	kDateTime.iNanosecond = aiNanosecond
	return kDateTime
EndFunction

int Function Compare(DateTime akLeft, DateTime akRight) Global Native
bool Function Equals(DateTime akLeft, DateTime akRight) Global Native
