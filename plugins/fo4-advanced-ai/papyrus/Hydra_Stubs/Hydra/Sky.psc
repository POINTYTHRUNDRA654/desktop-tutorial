Scriptname Hydra:Sky Const Hidden Native

;/
	Provides functions for the sky.

	Notes:
	- The climate functions only apply for the current cell.
/;

Region Function GetCurrentRegion() Global Native

Climate Function GetCurrentClimate() Global Native
Function SetCurrentClimate(Climate akClimate) Global Native

Weather Function GetDefaultWeather() Global Native
Weather Function GetLastWeather() Global Native

Weather Function GetCurrentWeather() Global Native
Weather Function GetWeatherOverride() Global Native
bool Function RemoveWeatherOverride() Global Native
