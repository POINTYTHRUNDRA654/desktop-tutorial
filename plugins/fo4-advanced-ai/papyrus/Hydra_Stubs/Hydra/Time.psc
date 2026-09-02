Scriptname Hydra:Time Const Hidden Native

;/
	Provides functions for (game) time and date management.

	Notes:
	- The game does not account for leap years,
	  which results in February always having 28 days.
	- Weeks start on Sunday (0) and end on Saturday (6).
	- Months begin on January (1) and end on December (12).
	- The day and month name functions are dependent on the game's current language.
/;

Import Hydra:DateTimes

float Function GetDeltaTime() Global Native
float FUnction GetElapsedTime() Global Native
float Function GetTimeMultiplier() Global Native

float Function GetDefaultTimeScale() Global Native
float Function GetTimeScale() Global Native

int Function GetDayOfWeek(int aiYear, int aiMonth, int aiDay) Global Native
int Function GetDayOfWeek_NoLeapYear(int aiMonth, int aiDay) Global Native

DateTime Function GetDefaultGameDateTime() Global Native
DateTime Function GetGameDateTime() Global Native

int Function GetDefaultGameMillisecond() Global Native
int Function GetDefaultGameSecond() Global Native
int Function GetDefaultGameMinute() Global Native
int Function GetDefaultGameHour() Global Native
int Function GetDefaultGameDay() Global Native
int Function GetDefaultGameMonth() Global Native
int Function GetDefaultGameYear() Global Native

int Function GetGameMillisecond() Global Native
int Function GetGameSecond() Global Native
int Function GetGameMinute() Global Native
int Function GetGameHour() Global Native
int Function GetGameDay() Global Native
int Function GetGameMonth() Global Native
int Function GetGameYear() Global Native

int Function GetGameWeekDay() Global Native

float Function GetElapsedGameHours() Global Native
float Function GetElapsedGameDays() Global Native


int[] Function GetAllDays() Global Native
int[] Function GetAllMonths() Global Native

int Function GetDay_Sunday() Global Native
int Function GetDay_Monday() Global Native
int Function GetDay_Tuesday() Global Native
int Function GetDay_Wednesday() Global Native
int Function GetDay_Thursday() Global Native
int Function GetDay_Friday() Global Native
int Function GetDay_Saturday() Global Native

int Function GetMonth_January() Global Native
int Function GetMonth_February() Global Native
int Function GetMonth_March() Global Native
int Function GetMonth_April() Global Native
int Function GetMonth_May() Global Native
int Function GetMonth_June() Global Native
int Function GetMonth_July() Global Native
int Function GetMonth_August() Global Native
int Function GetMonth_September() Global Native
int Function GetMonth_October() Global Native
int Function GetMonth_November() Global Native
int Function GetMonth_December() Global Native
