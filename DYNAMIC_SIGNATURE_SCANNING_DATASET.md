# Dynamic Signature Scanning, Version-Agnostic Address Resolution, and Multi-Patch Compatibility

This dataset covers replacing hardcoded Relative Virtual Addresses (RVAs) with a runtime byte-pattern scanner that locates engine functions in memory regardless of game version, building a version-checked address cache to avoid rescanning on every launch, and writing a lightweight compatibility test harness that verifies all scanned addresses before any hooks are installed.

---

## Phase 1: Dynamic Signature Scanning for Multi-Patch Compatibility

Every Fallout 4 update recompiles the executable, shifting function addresses. A runtime signature scanner reads the loaded `.exe` image and searches for a unique sequence of bytes that identifies a function across patches — far more reliable than a hardcoded RVA that breaks on every update.

```cpp
#include "f4se/PluginAPI.h"
#include <windows.h>
#include <cstdint>
#include <optional>

// Converts a space-separated hex pattern string such as
// "48 89 5C 24 ? 57 48 83 EC 20 48 8B D9"
// into parallel byte/mask arrays.  '?' is a wildcard that matches any byte.
struct Pattern {
    std::vector<uint8_t> bytes;
    std::vector<bool>    mask;   // true = must match, false = wildcard

    static Pattern Parse(const char* patternStr) {
        Pattern p;
        const char* s = patternStr;
        while (*s) {
            while (*s == ' ') ++s;
            if (!*s) break;
            if (*s == '?') {
                p.bytes.push_back(0x00);
                p.mask.push_back(false);
                ++s;
                if (*s == '?') ++s;  // consume optional second '?'
            } else {
                uint8_t byte = static_cast<uint8_t>(strtol(s, nullptr, 16));
                p.bytes.push_back(byte);
                p.mask.push_back(true);
                s += 2;
            }
        }
        return p;
    }
};

// Scans [start, start + size) for the first occurrence of pattern.
// Returns the absolute address of the match, or 0 on failure.
uintptr_t ScanRegion(uintptr_t start, size_t size, const Pattern& p) {
    const size_t patLen = p.bytes.size();
    if (patLen == 0 || size < patLen) return 0;

    const uint8_t* mem = reinterpret_cast<const uint8_t*>(start);
    const size_t   end = size - patLen;

    for (size_t i = 0; i <= end; ++i) {
        bool found = true;
        for (size_t j = 0; j < patLen; ++j) {
            if (p.mask[j] && mem[i + j] != p.bytes[j]) {
                found = false;
                break;
            }
        }
        if (found) return start + i;
    }
    return 0;
}

// Scans all executable sections of Fallout4.exe for the pattern.
// Returns the absolute virtual address of the first match, or 0 on failure.
uintptr_t FindPattern(const char* patternStr) {
    Pattern p = Pattern::Parse(patternStr);

    HMODULE base = GetModuleHandle(NULL);
    if (!base) return 0;

    auto* dosHeader = reinterpret_cast<IMAGE_DOS_HEADER*>(base);
    auto* ntHeaders = reinterpret_cast<IMAGE_NT_HEADERS*>(
        reinterpret_cast<uintptr_t>(base) + dosHeader->e_lfanew);

    auto* section = IMAGE_FIRST_SECTION(ntHeaders);
    for (WORD i = 0; i < ntHeaders->FileHeader.NumberOfSections; ++i, ++section) {
        // Only scan sections that are marked executable
        if (!(section->Characteristics & IMAGE_SCN_MEM_EXECUTE)) continue;

        uintptr_t sectionBase = reinterpret_cast<uintptr_t>(base)
                                + section->VirtualAddress;
        size_t    sectionSize = section->Misc.VirtualSize;

        uintptr_t result = ScanRegion(sectionBase, sectionSize, p);
        if (result) return result;
    }
    return 0;
}

// Convenience wrapper: scans for the pattern and returns the RVA
// (address minus image base) for logging and cache storage.
uintptr_t FindPatternRVA(const char* patternStr, const char* name) {
    uintptr_t addr = FindPattern(patternStr);
    if (!addr) {
        _ERROR("[Scanner] Pattern not found: %s", name);
        return 0;
    }
    uintptr_t base = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    uintptr_t rva  = addr - base;
    _MESSAGE("[Scanner] %s found at RVA 0x%08llX (abs 0x%llX)", name, rva, addr);
    return rva;
}
```

**Usage example — resolve ApplyDamage at runtime:**

```cpp
// Call once during F4SEPlugin_Load, after the game is ready.
// Pattern bytes should be discovered with IDA Pro or Ghidra for the target game version.
uintptr_t g_applyDamageRVA = 0;

void ResolveAddresses() {
    g_applyDamageRVA = FindPatternRVA(
        "48 89 5C 24 ? 57 48 83 EC 20 48 8B D9",
        "ApplyDamage"
    );
    // Use g_applyDamageRVA with RelocPtr<> or direct arithmetic as needed
}
```

**Key points:**
- `IMAGE_SCN_MEM_EXECUTE` restricts the scan to code sections only (`.text`, `.rdata` when executable), skipping data sections and reducing false matches. Most engine functions live in the first executable section; scanning all executable sections handles split-section edge cases.
- Wildcard bytes (`?`) handle compiler-generated offsets, relative displacements, and padding that change between builds while the surrounding opcode bytes remain stable. Choose a pattern where the wildcards represent operands (e.g., a 4-byte relative call offset) rather than the opcode itself.
- A good signature is 12–20 bytes long with no more than 3–4 wildcards, drawn from a region of unique opcodes at the function prologue. Prologues that start with `push rbp` / `mov rbp, rsp` are common and non-unique — extend into the first few instructions for uniqueness.
- Scanning is O(n·m) where n is the section size (~5–15 MB for `.text`) and m is the pattern length. A single 16-byte scan typically completes in under 1 ms. Cache results (see Phase 2) to avoid rescanning on every game load.
- Call `FindPatternRVA` inside `F4SEPlugin_Load` after `kInterface_Messaging` is acquired but before any hooks are installed. Do not call it at static initialisation time — `GetModuleHandle(NULL)` is safe during `DllMain` but `IMAGE_NT_HEADERS` traversal during `DLL_PROCESS_ATTACH` can race with the loader lock.

---

## Phase 2: Version-Agnostic Address Cache

Rescanning the entire `.text` section on every game launch adds latency. Cache the resolved RVAs to an INI file keyed by the game executable's build version hash. On subsequent launches, read the cache if the version matches and skip the scan entirely.

```cpp
#include "f4se/PluginAPI.h"
#include <windows.h>
#include <string>
#include <unordered_map>
#include <fstream>
#include <sstream>

// Returns the linker timestamp from the PE header as a hex string.
// This changes with every official game patch and serves as a lightweight version key.
std::string GetExeVersionKey() {
    HMODULE base = GetModuleHandle(NULL);
    auto* dosHeader = reinterpret_cast<IMAGE_DOS_HEADER*>(base);
    auto* ntHeaders = reinterpret_cast<IMAGE_NT_HEADERS*>(
        reinterpret_cast<uintptr_t>(base) + dosHeader->e_lfanew);

    std::ostringstream oss;
    oss << std::hex << std::uppercase
        << ntHeaders->FileHeader.TimeDateStamp;
    return oss.str();
}

// Simple INI-style cache: one "key=value" per line.
// Section header is the version key so the file remains valid across reinstalls.
class AddressCache {
public:
    std::string cacheFile;
    std::string versionKey;
    std::unordered_map<std::string, uintptr_t> entries;
    bool dirty = false;

    void Load(const std::string& filePath) {
        cacheFile  = filePath;
        versionKey = GetExeVersionKey();
        entries.clear();

        std::ifstream f(filePath);
        if (!f.is_open()) return;

        std::string currentSection;
        std::string line;
        while (std::getline(f, line)) {
            if (line.empty() || line[0] == ';') continue;
            if (line[0] == '[') {
                currentSection = line.substr(1, line.find(']') - 1);
                continue;
            }
            if (currentSection != versionKey) continue;

            auto eq = line.find('=');
            if (eq == std::string::npos) continue;
            std::string key = line.substr(0, eq);
            uintptr_t   val = static_cast<uintptr_t>(
                std::stoull(line.substr(eq + 1), nullptr, 16));
            entries[key] = val;
        }
    }

    bool Get(const std::string& name, uintptr_t& outRVA) const {
        auto it = entries.find(name);
        if (it == entries.end()) return false;
        outRVA = it->second;
        return true;
    }

    void Set(const std::string& name, uintptr_t rva) {
        entries[name] = rva;
        dirty = true;
    }

    void Save() {
        if (!dirty) return;
        std::ofstream f(cacheFile);
        if (!f.is_open()) {
            _ERROR("[Cache] Failed to write address cache to: %s", cacheFile.c_str());
            return;
        }
        f << "[" << versionKey << "]\n";
        for (auto& [name, rva] : entries) {
            f << name << "=" << std::hex << std::uppercase << rva << "\n";
        }
        dirty = false;
        _MESSAGE("[Cache] Address cache saved (%zu entries).", entries.size());
    }
};

// Global cache instance — initialise during F4SEPlugin_Load.
AddressCache g_addressCache;

// Resolves a named address using the cache first; falls back to a live scan.
uintptr_t ResolveAddress(const char* name, const char* pattern) {
    uintptr_t rva = 0;
    if (g_addressCache.Get(name, rva)) {
        _MESSAGE("[Cache] %s resolved from cache: RVA 0x%08llX", name, rva);
        return rva;
    }

    rva = FindPatternRVA(pattern, name);
    if (rva) {
        g_addressCache.Set(name, rva);
    }
    return rva;
}
```

**Initialise and teardown in your plugin entry points:**

```cpp
extern "C" __declspec(dllexport) bool F4SEPlugin_Load(const F4SEInterface* f4se) {
    // Build the cache file path alongside your plugin DLL
    std::string cacheFile = "Data\\F4SE\\Plugins\\MyPlugin_AddressCache.ini";
    g_addressCache.Load(cacheFile);

    // Resolve all needed addresses — cache hit skips the scan
    uintptr_t applyDamageRVA = ResolveAddress(
        "ApplyDamage",
        "48 89 5C 24 ? 57 48 83 EC 20 48 8B D9"
    );

    g_addressCache.Save();   // persist any newly scanned results

    if (!applyDamageRVA) {
        _FATALERROR("Required address not found — plugin will not load.");
        return false;
    }

    // ... install hooks using applyDamageRVA ...
    return true;
}
```

**Key points:**
- `FileHeader.TimeDateStamp` is a 32-bit Unix timestamp embedded by the linker. It changes with every official Bethesda patch but is identical across all copies of the same patch version, making it a reliable version discriminator without needing to hash the entire executable.
- Store the cache file in `Data\F4SE\Plugins\` alongside your DLL so it is uninstalled with the mod. Never write to `Documents\My Games\Fallout4\` — that is the user's save directory and polluting it is poor practice.
- On a cache miss (first run, or after a game update), `ResolveAddress` falls back to `FindPatternRVA`. The scan adds ~1–5 ms per pattern; cache the result immediately so subsequent launches are instant.
- If `Save()` is never called after a scan (e.g., the game crashes before `F4SEPlugin_Load` returns), the cache will re-scan on the next launch — this is acceptable degraded behavior, not a data-loss risk.
- Invalidation is automatic: when the game updates, `GetExeVersionKey()` returns a new value, the old cache section is not read (`currentSection != versionKey`), and all addresses are re-scanned and written under the new section key.

---

## Phase 3: Pre-Hook Compatibility Validation Harness

Before installing any trampolines or memory patches, validate that every scanned address is plausible: check that the memory region is executable, confirm the first bytes match the expected function prologue, and log a structured pass/fail report. This prevents silent hooking of the wrong address when a pattern produces a false positive match.

```cpp
#include "f4se/PluginAPI.h"
#include <windows.h>
#include <vector>
#include <string>

struct AddressValidation {
    std::string name;
    uintptr_t   rva;
    uint8_t     expectedPrologue[8];   // First 8 bytes of the target function
    size_t      prologueLen;
};

bool ValidateAddress(const AddressValidation& v) {
    if (!v.rva) {
        _ERROR("[Validate] FAIL — %s: RVA is zero (pattern not found)", v.name.c_str());
        return false;
    }

    uintptr_t base = reinterpret_cast<uintptr_t>(GetModuleHandle(NULL));
    uintptr_t addr = base + v.rva;

    // 1. Confirm the page is committed and executable
    MEMORY_BASIC_INFORMATION mbi{};
    if (!VirtualQuery(reinterpret_cast<void*>(addr), &mbi, sizeof(mbi))) {
        _ERROR("[Validate] FAIL — %s: VirtualQuery failed at 0x%llX", v.name.c_str(), addr);
        return false;
    }
    if (mbi.State != MEM_COMMIT) {
        _ERROR("[Validate] FAIL — %s: page not committed", v.name.c_str());
        return false;
    }
    constexpr DWORD execMask = PAGE_EXECUTE | PAGE_EXECUTE_READ
                             | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY;
    if (!(mbi.Protect & execMask)) {
        _ERROR("[Validate] FAIL — %s: page not executable (protect=0x%X)",
               v.name.c_str(), mbi.Protect);
        return false;
    }

    // 2. Confirm the prologue bytes match the expected function start
    const uint8_t* mem = reinterpret_cast<const uint8_t*>(addr);
    for (size_t i = 0; i < v.prologueLen; ++i) {
        if (mem[i] != v.expectedPrologue[i]) {
            _ERROR("[Validate] FAIL — %s: prologue byte %zu expected 0x%02X got 0x%02X",
                   v.name.c_str(), i, v.expectedPrologue[i], mem[i]);
            return false;
        }
    }

    _MESSAGE("[Validate] PASS — %s at RVA 0x%08llX", v.name.c_str(), v.rva);
    return true;
}

// Validate all resolved addresses before installing any hooks.
// Returns false if any critical address fails validation.
bool RunCompatibilityChecks(const std::vector<AddressValidation>& checks) {
    _MESSAGE("[Validate] Running pre-hook compatibility checks (%zu entries)...",
             checks.size());

    int passed = 0, failed = 0;
    for (const auto& check : checks) {
        if (ValidateAddress(check)) ++passed;
        else                        ++failed;
    }

    _MESSAGE("[Validate] Results: %d passed, %d failed.", passed, failed);
    return failed == 0;
}
```

**Usage — validate before hooking:**

```cpp
bool F4SEPlugin_Load(const F4SEInterface* f4se) {
    // ... address resolution ...

    // First 8 bytes of ApplyDamage prologue (example — verify against your IDA analysis)
    std::vector<AddressValidation> checks = {
        {
            "ApplyDamage",
            g_applyDamageRVA,
            { 0x48, 0x89, 0x5C, 0x24, 0x08, 0x57, 0x48, 0x83 },
            8
        }
        // Add one entry per hooked address
    };

    if (!RunCompatibilityChecks(checks)) {
        _FATALERROR("Compatibility check failed — hooks will not be installed. "
                    "Update your patterns for the current game version.");
        return false;
    }

    // Safe to install trampolines now
    InitializeTrampolineHooking(trampolineInterface);
    return true;
}
```

**Key points:**
- Prologue validation catches false-positive pattern matches where the scanner found a byte sequence that happens to appear in a data constant or unrelated function. A 6–8 byte prologue check reduces false-positive risk by several orders of magnitude compared to the pattern alone.
- `VirtualQuery` catches the pathological case where `rva + base` arithmetic overflows into unmapped memory — this cannot happen with a valid scan result but may occur if a corrupted cache entry is loaded from disk.
- Store `expectedPrologue` as the first bytes of the function that are **not** wildcards in your scan pattern. If your scan pattern already starts at a unique prologue (no leading wildcards), the first 6–8 bytes of `expectedPrologue` will always match a valid scan result — the check is a second line of defence, not a duplicate.
- Returning `false` from `F4SEPlugin_Load` causes F4SE to log that your plugin failed to load and to continue starting the game without it. This is the correct failure mode — a plugin that cannot find its target functions must not silently apply broken hooks, which would either crash the game or corrupt gameplay state.
- Log the failure with a user-readable message that directs the modder to update their scan patterns. Include the game's build timestamp (`GetExeVersionKey()`) in the log so the modder knows which version was running when the check failed.

---

## Troubleshooting Focus

- **`FindPattern` returns 0 for a known-good pattern (Phase 1)**: The pattern was written for a different game version. Open the current `Fallout4.exe` in IDA Pro or Ghidra, navigate to the function (by name if symbols are available, or by the old RVA), and regenerate the pattern from the current binary. Extend the pattern by 2–4 bytes if the current bytes happen to be ambiguous.
- **Scanner finds wrong address (Phase 1)**: The pattern matches a data constant or a similar sequence in a different function. Add more context bytes around the unique region, or include a wildcard for the position-dependent operand while anchoring both sides with stable opcodes. Run a full-binary count of the pattern occurrences in IDA (`Search → Sequence of bytes`, count all results) — a unique pattern should return exactly one match.
- **Cache never hits even after the first scan (Phase 2)**: `GetExeVersionKey()` returns a different value between the scan run and the cache-read run. This happens when the game is updated between the two sessions — the new version clears the cache automatically as designed. If it reproduces without a game update, check that `GetModuleHandle(NULL)` returns the same module handle in both calls (it should always return Fallout4.exe in an F4SE plugin).
- **Cache file is not created (Phase 2)**: `Data\F4SE\Plugins\` does not exist. Add `SHCreateDirectoryEx(NULL, cacheDir.c_str(), NULL)` before `Save()`, or create the directory in the FOMod installer script. The file will be created on the first successful scan run.
- **Validation fails on a byte that looks correct in IDA (Phase 3)**: IDA may be showing the disassembly with the bytes reassembled from the decoded instruction, not the raw bytes. Use IDA's hex view (`View → Open subviews → Hex dump`) to confirm the raw bytes at the function start, accounting for any byte-swap differences between the IDA display and the little-endian memory layout.
- **Plugin returns `false` from `F4SEPlugin_Load` on a fresh install (Phase 3)**: The pattern for the current game version has never been discovered. Provide a fallback: if the prologue check fails but the scan found an address, log a warning and allow the user to opt-in to skipping validation via an INI setting (`bSkipCompatibilityCheck=0`). Always default to `false` (safe, no hooks) and let advanced users enable the override at their own risk.
