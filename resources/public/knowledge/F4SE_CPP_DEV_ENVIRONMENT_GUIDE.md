# F4SE C++ Development Environment Setup Guide (2026)

This guide walks through the complete toolchain for building Fallout 4 engine-level plugins using F4SE, CommonLibF4, Visual Studio 2022, CMake, and vcpkg. Following this setup you will be able to hook engine internals, inject custom shader flags, patch memory values at runtime, and ship a signed DLL that loads on both OG (1.10.163) and NG (1.10.984+) game versions.

---

## 1. Required Software

Install all of the following before writing any code.

### Visual Studio 2022 Community (free)
- Download from: https://visualstudio.microsoft.com/vs/community/
- During installation, select the workload: **Desktop development with C++**
- Individual components to confirm are checked:
  - MSVC v143 – VS 2022 C++ x64/x86 build tools
  - Windows 11 SDK (10.0.22621.0 or later)
  - C++ CMake tools for Windows
  - C++ AddressSanitizer *(optional but useful for debugging)*

### Git for Windows
- Download from: https://git-scm.com/download/win
- Used to clone CommonLibF4, the plugin template, and Address Library
- After install, verify: `git --version` in PowerShell

### CMake (3.26+)
- Download from: https://cmake.org/download/ — choose the Windows x64 installer
- During install, select **Add CMake to the system PATH for all users**
- Verify: `cmake --version`

### vcpkg (C++ package manager)
vcpkg manages CommonLibF4's dependencies (fmt, spdlog, robin-hood-hashing, etc.):

```powershell
# Clone to a permanent location — do NOT put in a project subfolder
git clone https://github.com/microsoft/vcpkg C:\vcpkg
cd C:\vcpkg
.\bootstrap-vcpkg.bat
.\vcpkg integrate install
```

Set the environment variable so CMake can find it automatically:
```powershell
[System.Environment]::SetEnvironmentVariable("VCPKG_ROOT", "C:\vcpkg", "Machine")
```

Restart PowerShell after setting the variable.

---

## 2. Cloning CommonLibF4

CommonLibF4 is the reverse-engineered library that exposes Fallout 4's internal C++ class hierarchy — `RE::BSLightingShaderProperty`, `RE::BSDecalNode`, `RE::TESWeather`, etc.

```powershell
# Navigate to your dev folder — e.g. C:\FO4Modding\
cd C:\FO4Modding

# Clone the NG-compatible fork (supports both OG and NG game versions)
git clone https://github.com/Ryan-rsm-McKenzie/CommonLibF4 CommonLibF4
cd CommonLibF4

# Install CommonLibF4's vcpkg dependencies
# (This uses the vcpkg.json manifest — CMake handles it automatically at configure time)
```

**Important forks in 2026:**
- `Ryan-rsm-McKenzie/CommonLibF4` — reference implementation, most up-to-date headers
- `Ersh8309/CommonLibF4` — alternative with extra hooks; check which one your template targets

---

## 3. Creating Your Plugin Project

### Option A: Clone the Official Plugin Template (Recommended)

```powershell
cd C:\FO4Modding
git clone https://github.com/Expired6978/F4SEPluginTemplate MyOvergrowthPlugin
cd MyOvergrowthPlugin
```

The template includes:
- `CMakeLists.txt` pre-configured for CommonLibF4 + vcpkg
- `src/main.cpp` with the F4SE plugin entry point (`F4SEAPI F4SE_InitPlugin`)
- `vcpkg.json` manifest listing all dependencies
- GitHub Actions CI workflow for OG/NG/AE DLL builds

### Option B: Manual CMakeLists.txt

If starting from scratch, your `CMakeLists.txt` minimum:

```cmake
cmake_minimum_required(VERSION 3.26)

project(
    MyOvergrowthPlugin
    VERSION 1.0.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)  # Link-time optimization for release

# Find CommonLibF4 (either as a subdirectory or installed package)
find_package(CommonLibF4 REQUIRED CONFIG)

# Your source files
add_commonlibf4_plugin(
    ${PROJECT_NAME}
    SOURCES
        src/main.cpp
        src/OvergrowthDecals.cpp
        src/DecalWindAnim.cpp
)

target_compile_definitions(${PROJECT_NAME} PRIVATE
    UNICODE
    _UNICODE
)

# Post-build: auto-copy DLL to FO4 plugins folder
set(FO4_DATA_DIR "C:/Steam/steamapps/common/Fallout 4/Data" CACHE PATH "Fallout 4 Data directory")
add_custom_command(
    TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE:${PROJECT_NAME}>
        "${FO4_DATA_DIR}/F4SE/Plugins/${PROJECT_NAME}.dll"
    COMMENT "Copying DLL to F4SE plugins folder"
)
```

---

## 4. Configuring with CMake GUI

### Step-by-step

1. Open **CMake GUI** (installed with CMake)
2. **Where is the source code**: `C:\FO4Modding\MyOvergrowthPlugin`
3. **Where to build the binaries**: `C:\FO4Modding\MyOvergrowthPlugin\build`
4. Click **Configure**
   - Generator: `Visual Studio 17 2022`
   - Platform: `x64`
   - Click **Finish**
5. CMake will run vcpkg to install dependencies automatically (first run takes ~5 min)
6. Set any cache variables (e.g. `FO4_DATA_DIR`)
7. Click **Generate**
8. Click **Open Project** — Visual Studio 2022 opens

### Command-line alternative (faster)

```powershell
cd C:\FO4Modding\MyOvergrowthPlugin
cmake -B build -G "Visual Studio 17 2022" -A x64 `
    -DCMAKE_TOOLCHAIN_FILE=C:\vcpkg\scripts\buildsystems\vcpkg.cmake `
    -DVCPKG_TARGET_TRIPLET=x64-windows-static `
    -DFO4_DATA_DIR="C:\Steam\steamapps\common\Fallout 4\Data"
cmake --build build --config Release
```

---

## 5. Visual Studio Build Configuration

### Release vs Debug
**Always build Release for testing in-game.** Debug builds of F4SE plugins frequently cause crashes because:
- Debug builds are much slower — timing-sensitive hooks fail
- The game's memory allocator behaves differently under MSVC debug heap
- Many RE:: class vtable calls assume optimized codegen

Switch configuration:
- In VS2022, use the **Solution Configurations** dropdown (top toolbar)
- Change from `Debug` to `Release`

### Project Properties Checklist

Right-click project → Properties:

| Setting | Value |
|---|---|
| C/C++ → Code Generation → Runtime Library | `/MT` (Multi-threaded, static) — no CRT DLL dependency |
| C/C++ → Optimization → Optimization | `O2` (Maximize speed) for Release |
| Linker → General → Enable Incremental Linking | `No` (Release only) |
| Linker → Input → Additional Dependencies | `version.lib;` (required by F4SE) |

### Post-Build Event (Manual Setup)

If not using CMake's POST_BUILD command, add in VS2022:
- Project Properties → Build Events → Post-Build Event → Command Line:

```bat
xcopy /Y /D "$(OutDir)$(ProjectName).dll" "C:\Steam\steamapps\common\Fallout 4\Data\F4SE\Plugins\"
```

---

## 6. Plugin Entry Point (main.cpp)

The F4SE plugin load function is the single required entry point. Every engine hook is registered from here.

```cpp
// src/main.cpp
#include <F4SE/F4SE.h>
#include <RE/Fallout.h>  // CommonLibF4 — all RE:: classes

// spdlog for structured logging (managed by vcpkg)
#include <spdlog/sinks/basic_file_sink.h>

namespace logger = F4SE::log;

// Forward declarations
namespace OvergrowthDecals { void Install(); }
namespace DecalWindAnim { void Install(); }
namespace DecalPoolPatch { void OnMCMUpdate(int quality); }

// F4SE plugin metadata (read by F4SE loader from this DLL)
F4SE_PLUGIN_DECL {
    F4SE::Init(a_info);  // registers plugin with F4SE
    
    F4SE::AllocTrampoline(1 << 10); // 1KB trampoline for hooks
    
    // Set up structured file log
    auto path = F4SE::log::log_directory();
    if (path) {
        auto sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(
            (*path / "MyOvergrowthPlugin.log").string(), true);
        auto log = std::make_shared<spdlog::logger>("global", std::move(sink));
        log->set_level(spdlog::level::info);
        log->flush_on(spdlog::level::info);
        spdlog::set_default_logger(std::move(log));
    }
    
    logger::info("MyOvergrowthPlugin v{} loaded", "1.0.0");
}

// Called when all plugins have loaded and F4SE is ready
// Use this (not F4SE_PLUGIN_DECL) for hooks that need game data
extern "C" __declspec(dllexport) bool F4SEAPI F4SE_InitPlugin(
    const F4SE::LoadInterface* a_f4se)
{
    F4SE::Init(a_f4se);
    
    logger::info("F4SE_InitPlugin: installing engine hooks");
    
    // Install all hooks
    OvergrowthDecals::Install();   // BSDecalNode::SetupMaterial POM hook
    DecalWindAnim::Install();      // TESWeather → decal wind vector hook
    
    logger::info("All hooks installed successfully");
    return true;
}
```

---

## 7. Verifying Your Hook Loads

### Test with a Simple Log

Add a log line in `F4SE_InitPlugin` and launch the game through F4SE loader (`f4se_loader.exe`):

```cpp
logger::info("OvergrowthPlugin: hook test — if you see this, the DLL loaded");
```

### Check the Log File

Log location:
```
Documents\My Games\Fallout4\F4SE\MyOvergrowthPlugin.log
```

If you see your log line, the DLL loaded and F4SE called your entry point successfully.

### Troubleshooting Missing Log

| Symptom | Likely cause | Fix |
|---|---|---|
| Log file not created | DLL not in correct folder | Check `Data/F4SE/Plugins/MyOvergrowthPlugin.dll` exists |
| Log file empty | F4SE_PLUGIN_DECL not firing | Verify DLL exports `F4SE_InitPlugin` — check with `dumpbin /exports MyOvergrowthPlugin.dll` |
| Crash on load | Debug build in-game | Switch to Release build |
| "Plugin rejected" in F4SE log | Wrong game version target | Build against matching Address Library version (OG/NG/AE) |
| Missing vtable crash | Wrong CommonLibF4 fork or version | Ensure fork matches your target game version (OG/NG/AE) |
| Works on OG, crashes on AE | vtable layout changed in AE (1.11.x) | Re-verify REL::IDs against AE Address Library database; rebuild AE DLL |

---

## 8. Targeting All Three Game Versions (OG + NG + AE)

Fallout 4 has three active binary versions in 2026:
- **OG** (1.10.163.0) — the pre-next-gen update version; used by players on GOG, downgraded setups, and legacy Wabbajack lists
- **NG** (1.10.980.0 – 1.10.984.0) — the "next-gen" update released April 2024, with reworked 64-bit internals
- **AE** (1.11.169.0+) — the official Anniversary Edition update released November 2025; ships the Creations Menu in-game and bundles all DLC; requires its own DLL build

Each version has a different EXE layout. A DLL built for OG will crash on NG or AE; a DLL built for NG may crash on AE. **You must ship three separate DLLs and use a FOMOD installer to select the correct one.**

### Address Library Integration

Hard-coding hex offsets for engine functions will break between versions. Use Address Library instead:

```cpp
// Instead of:
// REL::Relocation<SetupMaterial_t> target{ REL::ID(42815) };  // OG only

// Use version-independent ID lookup:
static constexpr REL::ID kBSDecalNodeSetupMaterialID{ 42815 };  // ID in address_library database
// Address Library maps this ID to the correct offset for whichever version is running at runtime

REL::Relocation<SetupMaterial_t> target{ kBSDecalNodeSetupMaterialID };
```

**Finding REL::ID values:**
1. Search `address_library` repo on GitHub (nikitalita/address_library) — separate database files for each version
2. Use IDA Pro / Ghidra with the matching FO4 binary and search by function name or signature
3. Search the `CommonLibF4` source — many functions are already mapped with REL::ID

**Address Library versions:**
| Game version | Address Library build | Nexus / GitHub |
|---|---|---|
| OG (1.10.163) | Address Library v1 (OG) | Nexus #47327 — OG build |
| NG (1.10.980–1.10.984) | Address Library v2 (NG) | Nexus #47327 — NG build |
| AE (1.11.169+) | Address Library AiO Anniversary | Nexus #47327 — AiO build (covers all versions) |

> **Tip:** Ship the *AiO Anniversary* build in your FOMOD — it supports OG, NG, and AE from a single file using runtime version detection.

### Three-Version Build

The F4SE Plugin Template (Expired6978) and its GitHub Actions CI produce three DLLs:
- `MyOvergrowthPlugin.dll` — OG (1.10.163)
- `MyOvergrowthPlugin_ng.dll` — NG (1.10.980–1.10.984)
- `MyOvergrowthPlugin_ae.dll` — AE (1.11.169+)

The FOMOD installer selects the correct DLL based on the detected game version.

### CMake Option for All Three Targets

```cmake
option(BUILD_OG "Build for OG (1.10.163)"    OFF)
option(BUILD_NG "Build for NG (1.10.980+)"   OFF)
option(BUILD_AE "Build for AE (1.11.169+)"   ON)

if(BUILD_OG)
    set(COMMONLIBF4_TARGET "CommonLibF4-OG")
    add_compile_definitions(GAME_VERSION_OG)
elseif(BUILD_NG)
    set(COMMONLIBF4_TARGET "CommonLibF4-NG")
    add_compile_definitions(GAME_VERSION_NG)
elseif(BUILD_AE)
    set(COMMONLIBF4_TARGET "CommonLibF4-NG")   # AE uses the NG headers + AE Address Library
    add_compile_definitions(GAME_VERSION_AE)
endif()
```

### Troubleshooting Version Mismatch

| Symptom | Likely cause | Fix |
|---|---|---|
| Crash immediately on load | DLL compiled for wrong game version | Check game EXE version; use matching DLL |
| "Plugin rejected" in F4SE log | F4SE version mismatch | Install F4SE matching your exact EXE version |
| REL::ID lookup crash | Address Library not installed or wrong build | Install AiO Anniversary Address Library (Nexus #47327) |
| Hooks work on OG, crash on AE | vtable offset changed in AE | Re-verify REL::ID in AE database; rebuild AE DLL |

---

## 9. Project Structure Reference

```
MyOvergrowthPlugin/
├── CMakeLists.txt              # CMake build definition
├── CMakePresets.json           # Build presets (Debug/Release/Package)
├── vcpkg.json                  # vcpkg manifest (CommonLibF4, fmt, spdlog, etc.)
├── .github/workflows/
│   └── build.yml               # CI: builds OG + NG DLLs
├── src/
│   ├── main.cpp                # F4SE entry point, hook registration
│   ├── OvergrowthDecals.cpp    # BSDecalNode::SetupMaterial POM hook
│   ├── DecalWindAnim.cpp       # TESWeather wind vector → decal shader
│   └── DecalPoolPatch.cpp      # iMaxDecals runtime patch
├── include/
│   └── OvergrowthDecals.h      # Hook declarations
└── build/                      # CMake build output (gitignored)
    └── Release/
        └── MyOvergrowthPlugin.dll
```

---

## 10. Key Resources

| Resource | URL / Location | Purpose |
|---|---|---|
| CommonLibF4 (Ryan-rsm-McKenzie) | github.com/Ryan-rsm-McKenzie/CommonLibF4 | RE:: engine class headers |
| F4SE Plugin Template (Expired6978) | github.com/Expired6978/F4SEPluginTemplate | CMake scaffold with CI |
| Fallout 4 Address Library (nikitalita) | github.com/nikitalita/address_library | REL::ID ↔ offset mapping for all versions |
| vcpkg | github.com/microsoft/vcpkg | C++ dependency manager |
| F4SE Loader | f4se.silverlock.org | Loads plugins, writes F4SE log |
| CLASSIC Crash Log Analyzer | Nexus #56255 | Diagnoses crashes from your hook DLL |
| xbyak | github.com/herumi/xbyak | x64 JIT assembler (used with Detours for hooks) |
| BSLightingShaderProperty.h | In CommonLibF4 RE/B/ | Header for shader flag injection |
