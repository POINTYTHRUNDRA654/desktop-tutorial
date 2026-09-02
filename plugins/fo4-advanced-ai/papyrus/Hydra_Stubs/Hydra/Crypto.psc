Scriptname Hydra:Crypto Const Hidden Native

;/
	Provides functions for cryptographic operations.

	Notes:
	- The string hashing is done case-insensitively, by converting all characters to lower case.
	- MD5 and SHA1 are not secure hashing algorithms; use SHA256, or higher, instead;
	  see: https://emn178.github.io/online-tools/sha256.html.
/;

int[] Function HashBytesMd5(int[] akInput) Global Native
int[] Function HashBytesSha1(int[] akInput) Global Native
int[] Function HashBytesSha256(int[] akInput) Global Native
int[] Function HashBytesSha384(int[] akInput) Global Native
int[] Function HashBytesSha512(int[] akInput) Global Native

string Function HashStringMd5(string asInput) Global Native
string Function HashStringSha1(string asInput) Global Native
string Function HashStringSha256(string asInput) Global Native
string Function HashStringSha384(string asInput) Global Native
string Function HashStringSha512(string asInput) Global Native
