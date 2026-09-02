Scriptname Hydra:Hashing Const Hidden Native

;/
	Provides functions for hashing operations.

	Notes:
	- The string hashing is done case-insensitively, by converting all characters to lower case.
	- For CRC32, the format ISO-HDLC is used.
	- For CRC64, the format XZ is used.
	- To generate hashes online, see: https://emn178.github.io/online-tools.
/;

Import Hydra:Int64

int Function HashBytesCrc32(int[] akInput) Global Native
Long Function HashBytesCrc64(int[] akInput) Global Native

int Function HashBytesFnv1a32(int[] akInput) Global Native
Long Function HashBytesFnv1a64(int[] akInput) Global Native

int Function HashStringCrc32(string asInput) Global Native
Long Function HashStringCrc64(string asInput) Global Native

int Function HashStringFnv1a32(string asInput) Global Native
Long Function HashStringFnv1a64(string asInput) Global Native
