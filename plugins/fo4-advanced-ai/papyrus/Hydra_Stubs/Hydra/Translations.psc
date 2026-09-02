Scriptname Hydra:Translations Const Hidden Native

;/
	Provides functions for the game's translation system.

	Notes:
	- The translation system uses UTF-16 encoded strings.
	- Due to the language's strings being hashed case-insensitively by the engine,
	  and the translation system relying on case-sensitive keys,
	  be sure that the keys you use match the casing of the original strings,
	  and are unique across the entire game.
	- The keys must be prefixed with a dollar sign ("$").
	- Strict strings can also be used here;
	  see the script `Hydra:StrictStrings` for more information.

	Language Codes:
	- "cn": Chinese (Traditional)
	- "de": German
	- "en": English
	- "es": Spanish
	- "esmx": Spanish (Mexico)
	- "fr": French
	- "it": Italian
	- "ja": Japanese
	- "pl": Polish
	- "ptbr": Portuguese (Brazil)
	- "ru": Russian
/;

bool Function Contains(string acsKey) Global Native

string Function GetValue(string acsKey, string asDefault = "") Global Native

string Function GetLanguageCode() Global Native
