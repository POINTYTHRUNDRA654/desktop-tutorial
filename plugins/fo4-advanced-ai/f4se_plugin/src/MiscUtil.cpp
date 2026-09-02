// F4AI_MiscUtil.dll  — self-contained F4SE plugin (no external "common" library required)
// Provides MiscUtil Papyrus native functions for Fallout 4 (F4SE 0.07.x NG)
// FileExists, ReadFromFile, WriteToFile, DeleteFile

// Preamble: must come before any F4SE header

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <string>
#include <fstream>
#include <sstream>
#include <map>

// Integer type aliases (normally from common/IPrefix.h)
typedef uint8_t  UInt8;
typedef uint16_t UInt16;
typedef uint32_t UInt32;
typedef uint64_t UInt64;
typedef int8_t   SInt8;
typedef int16_t  SInt16;
typedef int32_t  SInt32;
typedef int64_t  SInt64;

#define STATIC_ASSERT(expr) static_assert(expr, #expr)
inline void _MESSAGE(const char*, ...) {}

// Token-paste macro (normally from common/IPrefix.h)
#define __PASTE2__(a, b) a##b
#define __MACRO_JOIN__(a, b) __PASTE2__(a, b)

// RelocationManager — init_seg(lib) runs this before normal globals.
#include "f4se_common/Relocation.h"
#pragma warning(disable: 4073)
#pragma init_seg(lib)
static RelocationManager s_relocMgr_f4ai;
uintptr_t RelocationManager::s_baseAddr = 0;
RelocationManager::RelocationManager() {
    s_baseAddr = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
}

// F4SE headers — GameTypes.h pulls in GameAPI.h (Heap decls) transitively
#include "f4se/PluginAPI.h"
#include "f4se/PapyrusNativeFunctions.h"
#include "f4se/PapyrusVM.h"

// GameAPI.cpp: g_mainHeap, Heap_Allocate, Heap_Free
// Offset 0x038CC980: address of the game's main heap object relative to image base.
RelocPtr<Heap> g_mainHeap(0x038CC980);

void * Heap_Allocate(size_t size)
{
    return CALL_MEMBER_FN(g_mainHeap, Allocate)(size, 0, false);
}

void Heap_Free(void * ptr)
{
    CALL_MEMBER_FN(g_mainHeap, Free)(ptr, false);
}

// GameTypes.cpp: StringCache::Ref constructors
StringCache::Ref::Ref()
{
    CALL_MEMBER_FN(this, ctor)("");
}

StringCache::Ref::Ref(const char * buf)
{
    CALL_MEMBER_FN(this, ctor)(buf);
}

// PapyrusArgs.cpp: only the template specialisations we actually use

template <> void PackValue<bool>(VMValue * dst, bool * src, VirtualMachine *)
{
    CALL_MEMBER_FN(dst, Destroy)();
    dst->type.value = VMValue::kType_Bool;
    dst->data.b = *src;
}

template <> void PackValue<BSFixedString>(VMValue * dst, BSFixedString * src, VirtualMachine *)
{
    CALL_MEMBER_FN(dst, Destroy)();
    dst->type.value = VMValue::kType_String;
    CALL_MEMBER_FN(dst->data.GetStr(), Set)(src->c_str());
}

template <> void UnpackValue<bool>(bool * dst, VMValue * src)
{
    switch(src->type.value) {
    case VMValue::kType_Int:   *dst = (src->data.u != 0); break;
    case VMValue::kType_Float: *dst = (src->data.f != 0); break;
    case VMValue::kType_Bool:  *dst = src->data.b;        break;
    default:                   *dst = false;               break;
    }
}

template <> void UnpackValue<BSFixedString>(BSFixedString * dst, VMValue * src)
{
    StringCache::Entry * entry = nullptr;
    if(src->type.value == VMValue::kType_String)
        entry = src->data.str;
    CALL_MEMBER_FN(dst, Set)(entry ? entry->Get<char>() : "");
}

template <> void PackValue<SInt32>(VMValue * dst, SInt32 * src, VirtualMachine *)
{
    CALL_MEMBER_FN(dst, Destroy)();
    dst->type.value = VMValue::kType_Int;
    dst->data.i = *src;
}

template <> void PackValue<float>(VMValue * dst, float * src, VirtualMachine *)
{
    CALL_MEMBER_FN(dst, Destroy)();
    dst->type.value = VMValue::kType_Float;
    dst->data.f = *src;
}

template <> void UnpackValue<SInt32>(SInt32 * dst, VMValue * src)
{
    switch(src->type.value) {
    case VMValue::kType_Int:   *dst = src->data.i;          break;
    case VMValue::kType_Float: *dst = (SInt32)src->data.f;  break;
    case VMValue::kType_Bool:  *dst = src->data.b ? 1 : 0;  break;
    default:                   *dst = 0;                    break;
    }
}

template <> void UnpackValue<float>(float * dst, VMValue * src)
{
    switch(src->type.value) {
    case VMValue::kType_Int:   *dst = (float)src->data.i;     break;
    case VMValue::kType_Float: *dst = src->data.f;            break;
    case VMValue::kType_Bool:  *dst = src->data.b ? 1.f : 0.f; break;
    default:                   *dst = 0.f;                    break;
    }
}

template <> UInt64 GetTypeID<bool>(VirtualMachine *)          { return VMValue::kType_Bool;   }
template <> UInt64 GetTypeID<BSFixedString>(VirtualMachine *) { return VMValue::kType_String; }
template <> UInt64 GetTypeID<SInt32>(VirtualMachine *)        { return VMValue::kType_Int;    }
template <> UInt64 GetTypeID<float>(VirtualMachine *)         { return VMValue::kType_Float;  }

// UnpackHandle: for static functions the base pointer is unused; nullptr is correct.
void * UnpackHandle(VMValue * /*src*/, UInt32 /*typeID*/)
{
    return nullptr;
}

// Plugin state
static PluginHandle          g_pluginHandle = kPluginHandle_Invalid;
static F4SEPapyrusInterface* g_papyrus      = nullptr;

// Native implementations

bool MiscUtil_FileExists(StaticFunctionTag*, BSFixedString path)
{
    const char* p = path.c_str();
    if(!p || p[0] == '\0') return false;
    DWORD attr = GetFileAttributesA(p);
    return (attr != INVALID_FILE_ATTRIBUTES && !(attr & FILE_ATTRIBUTE_DIRECTORY));
}

BSFixedString MiscUtil_ReadFromFile(StaticFunctionTag*, BSFixedString path)
{
    const char* p = path.c_str();
    if(!p || p[0] == '\0') return BSFixedString("");

    std::ifstream file(p, std::ios::in | std::ios::binary);
    if(!file.is_open()) return BSFixedString("");

    std::ostringstream ss;
    ss << file.rdbuf();
    std::string content = ss.str();

    if(content.size() >= 3 &&
       (unsigned char)content[0] == 0xEF &&
       (unsigned char)content[1] == 0xBB &&
       (unsigned char)content[2] == 0xBF)
    {
        content = content.substr(3);
    }

    return BSFixedString(content.c_str());
}

bool MiscUtil_WriteToFile(StaticFunctionTag*, BSFixedString path, BSFixedString content, bool append)
{
    const char* p = path.c_str();
    if(!p || p[0] == '\0') return false;

    std::string pathStr(p);
    size_t sep = pathStr.find_last_of("/\\");
    if(sep != std::string::npos)
        CreateDirectoryA(pathStr.substr(0, sep).c_str(), nullptr);

    std::ios::openmode mode = std::ios::out;
    if(append) mode |= std::ios::app;

    std::ofstream file(p, mode);
    if(!file.is_open()) return false;

    const char* c = content.c_str();
    if(c) file << c;
    return !file.bad();
}

bool MiscUtil_DeleteFile(StaticFunctionTag*, BSFixedString path)
{
    const char* p = path.c_str();
    if(!p || p[0] == '\0') return false;
    return DeleteFileA(p) != 0;
}

// ── StringUtil natives ────────────────────────────────────────────────────────
// Papyrus string semantics are case-insensitive, so Find/comparisons lower-case.

static std::string SU_Str(BSFixedString & s) { const char* c = s.c_str(); return c ? std::string(c) : std::string(); }
static std::string SU_Lower(std::string s) { for(auto & ch : s) ch = (char)tolower((unsigned char)ch); return s; }

SInt32 StringUtil_GetLength(StaticFunctionTag*, BSFixedString str)
{
    return (SInt32)SU_Str(str).size();
}

BSFixedString StringUtil_Substring(StaticFunctionTag*, BSFixedString str, SInt32 start, SInt32 len)
{
    std::string s = SU_Str(str);
    if(start < 0 || (size_t)start >= s.size()) return BSFixedString("");
    std::string out = (len < 0) ? s.substr(start) : s.substr(start, len);
    return BSFixedString(out.c_str());
}

SInt32 StringUtil_Find(StaticFunctionTag*, BSFixedString str, BSFixedString sub, SInt32 start)
{
    std::string s = SU_Lower(SU_Str(str)), n = SU_Lower(SU_Str(sub));
    if(n.empty() || start < 0 || (size_t)start > s.size()) return -1;
    size_t pos = s.find(n, (size_t)start);
    return (pos == std::string::npos) ? -1 : (SInt32)pos;
}

BSFixedString StringUtil_GetChar(StaticFunctionTag*, BSFixedString str, SInt32 idx)
{
    std::string s = SU_Str(str);
    if(idx < 0 || (size_t)idx >= s.size()) return BSFixedString("");
    char buf[2] = { s[(size_t)idx], 0 };
    return BSFixedString(buf);
}

bool StringUtil_IsLetter(StaticFunctionTag*, BSFixedString str)      { std::string s = SU_Str(str); return !s.empty() && isalpha((unsigned char)s[0]) != 0; }
bool StringUtil_IsDigit(StaticFunctionTag*, BSFixedString str)       { std::string s = SU_Str(str); return !s.empty() && isdigit((unsigned char)s[0]) != 0; }
bool StringUtil_IsPunctuation(StaticFunctionTag*, BSFixedString str) { std::string s = SU_Str(str); return !s.empty() && ispunct((unsigned char)s[0]) != 0; }
bool StringUtil_IsWhitespace(StaticFunctionTag*, BSFixedString str)  { std::string s = SU_Str(str); return !s.empty() && isspace((unsigned char)s[0]) != 0; }

BSFixedString StringUtil_ToLower(StaticFunctionTag*, BSFixedString str) { return BSFixedString(SU_Lower(SU_Str(str)).c_str()); }
BSFixedString StringUtil_ToUpper(StaticFunctionTag*, BSFixedString str)
{
    std::string s = SU_Str(str);
    for(auto & ch : s) ch = (char)toupper((unsigned char)ch);
    return BSFixedString(s.c_str());
}

BSFixedString StringUtil_AsString(StaticFunctionTag*, SInt32 v)
{
    char buf[32]; sprintf_s(buf, "%d", v); return BSFixedString(buf);
}

BSFixedString StringUtil_FloatAsString(StaticFunctionTag*, float v, SInt32 places)
{
    if(places < 0) places = 0; if(places > 9) places = 9;
    char fmt[8]; sprintf_s(fmt, "%%.%df", places);
    char buf[64]; sprintf_s(buf, fmt, v);
    return BSFixedString(buf);
}

SInt32 StringUtil_AsInt(StaticFunctionTag*, BSFixedString str)   { return (SInt32)atoi(SU_Str(str).c_str()); }
float  StringUtil_AsFloat(StaticFunctionTag*, BSFixedString str) { return (float)atof(SU_Str(str).c_str()); }

// ── JsonUtil natives ──────────────────────────────────────────────────────────
// Minimal read-only JSON field extraction. Key paths support dots and [index],
// e.g. "conversations[2].conversation_id". Paths are tried as-is, then Data\-relative.

static bool Json_ReadFile(const std::string & path, std::string & out)
{
    auto tryRead = [&out](const std::string & p) -> bool {
        std::ifstream f(p, std::ios::in | std::ios::binary);
        if(!f.is_open()) return false;
        std::ostringstream ss; ss << f.rdbuf(); out = ss.str();
        if(out.size() >= 3 && (unsigned char)out[0] == 0xEF && (unsigned char)out[1] == 0xBB && (unsigned char)out[2] == 0xBF)
            out = out.substr(3);
        return true;
    };
    if(path.empty()) return false;
    if(tryRead(path)) return true;
    return tryRead("Data\\" + path);
}

static void Json_SkipWs(const std::string & s, size_t & i) { while(i < s.size() && isspace((unsigned char)s[i])) ++i; }

// Skips one JSON value starting at i; returns [start,end) of the raw value text.
static bool Json_SkipValue(const std::string & s, size_t & i)
{
    Json_SkipWs(s, i);
    if(i >= s.size()) return false;
    char c = s[i];
    if(c == '"') {
        ++i;
        while(i < s.size()) {
            if(s[i] == '\\') i += 2;
            else if(s[i] == '"') { ++i; return true; }
            else ++i;
        }
        return false;
    }
    if(c == '{' || c == '[') {
        char open = c, close = (c == '{') ? '}' : ']';
        int depth = 0;
        while(i < s.size()) {
            char d = s[i];
            if(d == '"') { Json_SkipValue(s, i); continue; }
            if(d == open) ++depth;
            else if(d == close) { --depth; if(depth == 0) { ++i; return true; } }
            ++i;
        }
        return false;
    }
    while(i < s.size() && s[i] != ',' && s[i] != '}' && s[i] != ']' && !isspace((unsigned char)s[i])) ++i;
    return true;
}

// Finds the raw value text for a key path inside JSON text.
static bool Json_GetRaw(const std::string & json, const std::string & keyPath, std::string & raw)
{
    size_t i = 0;
    std::string path = keyPath;
    size_t p = 0;
    Json_SkipWs(json, i);

    while(p < path.size()) {
        // parse next path segment: name or [index]
        std::string name; SInt32 index = -1;
        if(path[p] == '[') {
            size_t close = path.find(']', p);
            if(close == std::string::npos) return false;
            index = atoi(path.substr(p + 1, close - p - 1).c_str());
            p = close + 1;
        } else {
            size_t end = p;
            while(end < path.size() && path[end] != '.' && path[end] != '[') ++end;
            name = path.substr(p, end - p);
            p = end;
        }
        if(p < path.size() && path[p] == '.') ++p;

        Json_SkipWs(json, i);
        if(index >= 0) {
            if(i >= json.size() || json[i] != '[') return false;
            ++i;
            for(SInt32 k = 0; k < index; ++k) {
                if(!Json_SkipValue(json, i)) return false;
                Json_SkipWs(json, i);
                if(i < json.size() && json[i] == ',') ++i; else return false;
            }
            Json_SkipWs(json, i);
        } else {
            if(i >= json.size() || json[i] != '{') return false;
            ++i;
            bool found = false;
            while(i < json.size()) {
                Json_SkipWs(json, i);
                if(i < json.size() && json[i] == '}') return false;
                if(i >= json.size() || json[i] != '"') return false;
                size_t keyStart = ++i;
                while(i < json.size() && json[i] != '"') { if(json[i] == '\\') ++i; ++i; }
                std::string key = json.substr(keyStart, i - keyStart);
                ++i; Json_SkipWs(json, i);
                if(i >= json.size() || json[i] != ':') return false;
                ++i; Json_SkipWs(json, i);
                if(_stricmp(key.c_str(), name.c_str()) == 0) { found = true; break; }
                if(!Json_SkipValue(json, i)) return false;
                Json_SkipWs(json, i);
                if(i < json.size() && json[i] == ',') ++i;
            }
            if(!found) return false;
        }
    }

    size_t start = i;
    if(!Json_SkipValue(json, i)) return false;
    raw = json.substr(start, i - start);
    return true;
}

static std::string Json_Unquote(const std::string & raw)
{
    if(raw.size() < 2 || raw[0] != '"') return raw;
    std::string out; out.reserve(raw.size());
    for(size_t i = 1; i + 1 < raw.size(); ++i) {
        if(raw[i] == '\\' && i + 2 < raw.size() + 1) {
            ++i;
            switch(raw[i]) {
            case 'n': out += '\n'; break;
            case 't': out += '\t'; break;
            case 'r': out += '\r'; break;
            default:  out += raw[i]; break;
            }
        } else out += raw[i];
    }
    return out;
}

bool JsonUtil_JsonExists(StaticFunctionTag*, BSFixedString path)
{
    std::string json;
    return Json_ReadFile(SU_Str(path), json);
}

BSFixedString JsonUtil_GetStringField(StaticFunctionTag*, BSFixedString path, BSFixedString key, BSFixedString deflt)
{
    std::string json, raw;
    if(!Json_ReadFile(SU_Str(path), json) || !Json_GetRaw(json, SU_Str(key), raw))
        return deflt;
    return BSFixedString(Json_Unquote(raw).c_str());
}

SInt32 JsonUtil_GetIntField(StaticFunctionTag*, BSFixedString path, BSFixedString key, SInt32 deflt)
{
    std::string json, raw;
    if(!Json_ReadFile(SU_Str(path), json) || !Json_GetRaw(json, SU_Str(key), raw))
        return deflt;
    if(_stricmp(raw.c_str(), "true") == 0)  return 1;
    if(_stricmp(raw.c_str(), "false") == 0) return 0;
    return (SInt32)atoi(Json_Unquote(raw).c_str());
}

// Papyrus registration
bool RegisterFunctions(VirtualMachine* vm)
{
    // StringUtil
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, SInt32, BSFixedString>("GetLength", "StringUtil", StringUtil_GetLength, vm));
    vm->RegisterFunction(new NativeFunction3<StaticFunctionTag, BSFixedString, BSFixedString, SInt32, SInt32>("Substring", "StringUtil", StringUtil_Substring, vm));
    vm->RegisterFunction(new NativeFunction3<StaticFunctionTag, SInt32, BSFixedString, BSFixedString, SInt32>("Find", "StringUtil", StringUtil_Find, vm));
    vm->RegisterFunction(new NativeFunction2<StaticFunctionTag, BSFixedString, BSFixedString, SInt32>("GetChar", "StringUtil", StringUtil_GetChar, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, bool, BSFixedString>("IsLetter", "StringUtil", StringUtil_IsLetter, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, bool, BSFixedString>("IsDigit", "StringUtil", StringUtil_IsDigit, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, bool, BSFixedString>("IsPunctuation", "StringUtil", StringUtil_IsPunctuation, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, bool, BSFixedString>("IsWhitespace", "StringUtil", StringUtil_IsWhitespace, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, BSFixedString, BSFixedString>("ToLower", "StringUtil", StringUtil_ToLower, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, BSFixedString, BSFixedString>("ToUpper", "StringUtil", StringUtil_ToUpper, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, BSFixedString, SInt32>("AsString", "StringUtil", StringUtil_AsString, vm));
    vm->RegisterFunction(new NativeFunction2<StaticFunctionTag, BSFixedString, float, SInt32>("FloatAsString", "StringUtil", StringUtil_FloatAsString, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, SInt32, BSFixedString>("AsInt", "StringUtil", StringUtil_AsInt, vm));
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, float, BSFixedString>("AsFloat", "StringUtil", StringUtil_AsFloat, vm));

    // JsonUtil (read-only subset used by F4AI scripts)
    vm->RegisterFunction(new NativeFunction1<StaticFunctionTag, bool, BSFixedString>("JsonExists", "JsonUtil", JsonUtil_JsonExists, vm));
    vm->RegisterFunction(new NativeFunction3<StaticFunctionTag, BSFixedString, BSFixedString, BSFixedString, BSFixedString>("GetStringField", "JsonUtil", JsonUtil_GetStringField, vm));
    vm->RegisterFunction(new NativeFunction3<StaticFunctionTag, SInt32, BSFixedString, BSFixedString, SInt32>("GetIntField", "JsonUtil", JsonUtil_GetIntField, vm));

    vm->RegisterFunction(
        new NativeFunction1<StaticFunctionTag, bool, BSFixedString>(
            "FileExists", "MiscUtil", MiscUtil_FileExists, vm));

    vm->RegisterFunction(
        new NativeFunction1<StaticFunctionTag, BSFixedString, BSFixedString>(
            "ReadFromFile", "MiscUtil", MiscUtil_ReadFromFile, vm));

    vm->RegisterFunction(
        new NativeFunction3<StaticFunctionTag, bool, BSFixedString, BSFixedString, bool>(
            "WriteToFile", "MiscUtil", MiscUtil_WriteToFile, vm));

    vm->RegisterFunction(
        new NativeFunction1<StaticFunctionTag, bool, BSFixedString>(
            "DeleteFile", "MiscUtil", MiscUtil_DeleteFile, vm));

    return true;
}

// ── F4SE 0.7.x NG version declaration ─────────────────────────────────────────
// Required for F4SE 0.7.x (FO4 NG / AE, game ver ≥ 1.10.984) to load this DLL.
// Without this export, F4SE silently rejects the plugin with "no version data 0".
// Game version 0x010B0DD0 = GET_EXE_VERSION(1, 11, 221, 0) confirmed from
// f4se_loader log: dwFileVersionMS=0001000B, dwFileVersionLS=00DD0000.
//
// If F4SEPluginVersionData is not in your copy of f4se/PluginAPI.h (old 0.6.x
// headers), define it here manually — the struct layout is stable across 0.7.x.
#ifndef F4SEPLUGINVERSIONDATA_DEFINED
#define F4SEPLUGINVERSIONDATA_DEFINED
// F4SE 0.7.x NG layout — verified against f4se_1_11_xxx sources.
// Old 0.6.x headers had a supportEmail[252] field here that shifted
// compatibleVersions to the wrong offset (+0x30C vs the correct +0x210),
// causing F4SE to read all-zero and reject the plugin as incompatible.
struct F4SEPluginVersionData
{
    enum { kVersion = 1 };
    UInt32 dataVersion;            // +0x000  must be kVersion (1)
    UInt32 pluginVersion;          // +0x004  your plugin version
    char   name[256];              // +0x008
    char   author[256];            // +0x108
    UInt32 addressIndependence;    // +0x208  0 = not address-independent
    UInt32 structCompatibility;    // +0x20C  0 = not struct-compatible
    UInt32 compatibleVersions[16]; // +0x210  zero-terminated packed game versions
    UInt32 seVersionRequired;      // +0x250  minimum F4SE version (0 = any)
    UInt32 reserved[10];           // +0x254
};
#endif

// F4SE plugin entry points
extern "C"
{
    // ── New NG API (F4SE 0.7.x): version struct ──────────────────────────────
    // F4SE reads this BEFORE calling F4SEPlugin_Load. All working plugins show
    // "(00000001 PluginName version) loaded correctly" in f4se.log.
    __declspec(dllexport) F4SEPluginVersionData F4SEPlugin_Version =
    {
        F4SEPluginVersionData::kVersion,  // dataVersion = 1
        1,                                // pluginVersion
        "F4AI MiscUtil",                  // name
        "F4AI",                           // author
        0,                                // addressIndependence
        0,                                // structCompatibility
        { 0x010B0BF0, 0x010B0DD0, 0 },   // compatibleVersions: FO4 1.11.191.0 and 1.11.221.0
        0,                                // seVersionRequired
        { 0 }                             // reserved
    };

    // ── Old API (0.6.x): kept for safety, may not be called by 0.7.x ─────────
    __declspec(dllexport) bool F4SEPlugin_Query(const F4SEInterface* f4se, PluginInfo* info)
    {
        info->infoVersion = PluginInfo::kInfoVersion;
        info->name        = "F4AI_MiscUtil";
        info->version     = 1;
        if(f4se->isEditor) return false;
        return true;
    }

    // ── Load (called by both 0.6.x and 0.7.x after version check passes) ─────
    // Papyrus registration re-disabled 2026-08-01: confirmed by a live crash
    // that g_papyrus->Register(RegisterFunctions) still hard-crashes the game
    // at F4SE's RegisterPapyrusFunctions_Hook, even when built against the
    // F4SE 0.7.8 headers at D:\src\f4se — f4se.log's last line is literally
    // "RegisterPapyrusFunctions_Hook" with nothing after it, no exception, no
    // further plugin output. So the 0.7.8-headers theory in the old note
    // (removed by commit 64d4d10) was wrong, or insufficient on its own —
    // something about this RegisterFunctions callback (or its interaction
    // with another Papyrus-registering plugin already in the load order:
    // GardenOfEdenPapyrusScriptExtender/LooksMenu, Hydra, mcm, po3 plugins)
    // is still incompatible. Needs real F4SE plugin debugging (attach a
    // debugger and break on this hook, or bisect by disabling other
    // Papyrus-registering plugins one at a time) before re-attempting this —
    // do not re-enable without reproducing and diagnosing first.
    __declspec(dllexport) bool F4SEPlugin_Load(const F4SEInterface* f4se)
    {
        g_pluginHandle = f4se->GetPluginHandle();
        return true;
    }
}