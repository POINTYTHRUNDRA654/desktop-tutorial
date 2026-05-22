# Phase 1: Visual Studio 2022 Project Setup for F4SE C++ Plugin Development

This dataset covers the step-by-step configuration of a Visual Studio 2022 C++ Dynamic-Link Library (DLL) project targeting the Fallout 4 Script Extender (F4SE) plugin API. Following this guide produces a project that compiles a valid F4SE plugin DLL ready for testing.

## Project Creation

1. Open Visual Studio 2022 and select **Create a new project**.
2. Choose **Dynamic-Link Library (DLL)** from the C++ project templates. Name the project after your plugin (e.g., `MyF4SEPlugin`).
3. Set the **Configuration** dropdown to `Release` and the **Platform** dropdown to `x64`. F4SE only loads x64 DLLs — do not target x86 or Any CPU.

## Project Properties Configuration

Right-click your project name in the **Solution Explorer** and select **Properties**. Ensure the configuration at the top is `Release | x64` before making any changes.

### General Settings

Navigate to **Configuration Properties → General**:

- **C++ Language Standard**: Set to `ISO C++17 Standard (/std:c++17)`. F4SE SDK headers and CommonLib-NG use C++17 features; earlier standards will produce compile errors.
- **Output Directory**: Set to `$(SolutionDir)Output\$(Platform)\$(Configuration)\` to keep DLL output organized and separate from intermediate files.
- **Target Name**: Match your plugin name exactly — the F4SE loader uses the DLL filename as the plugin identifier in logs.

### Include & Library Paths

Navigate to **Configuration Properties → VC++ Directories**:

- **Include Directories**: Add the path to the F4SE SDK `include/` folder (e.g., `C:\F4SE_SDK\include`). Also add the path to any CommonLib or third-party headers your plugin uses.
- **Library Directories**: Add the path to the F4SE SDK `lib/` folder (e.g., `C:\F4SE_SDK\lib\x64\Release`). This is where the static import library (`.lib`) files live.

### C/C++ Preprocessor

Navigate to **Configuration Properties → C/C++ → Preprocessor**:

- **Preprocessor Definitions**: Add `WIN32_LEAN_AND_MEAN` and `NOMINMAX`. These prevent Windows headers from pulling in macros that conflict with standard C++ min/max and reduce compilation overhead.

### C/C++ Code Generation

Navigate to **Configuration Properties → C/C++ → Code Generation**:

- **Runtime Library**: Set to `Multi-threaded (/MT)` for Release. This statically links the CRT into your DLL so it has no external CRT dependency at runtime in the game process.

### Linker Settings

Navigate to **Configuration Properties → Linker → Input**:

- **Additional Dependencies**: Add `f4se_common.lib` (or the equivalent static library name matching your SDK version). This provides the `_MESSAGE`, `_ERROR`, and `_FATALERROR` logging functions used in all F4SE plugins.
- **Module Definition File**: If you need explicit export control, add a `.def` file here. For basic plugins the `__declspec(dllexport)` approach on `F4SEPlugin_Version` and `F4SEPlugin_Load` is sufficient without a `.def` file.

Navigate to **Configuration Properties → Linker → General**:

- **Output File**: Confirm this is set to `$(OutDir)$(TargetName)$(TargetExt)` to match your organized output directory.

## Post-Build Deployment (Optional but Recommended)

Navigate to **Configuration Properties → Build Events → Post-Build Event**:

Add a **Command Line** entry to automatically copy the built DLL to your game's F4SE plugin folder after each successful build:

```
xcopy /Y "$(OutDir)$(TargetName)$(TargetExt)" "C:\Games\Fallout4\Data\F4SE\Plugins\"
```

Replace the destination path with your actual Fallout 4 installation path. This eliminates the manual copy step during iterative development.

## Verifying the Build

After configuration:

1. Press **Ctrl+Shift+B** (Build Solution) — the Output window should show `Build: 1 succeeded`.
2. Confirm the `.dll` file exists in your configured output directory (and in `Data\F4SE\Plugins\` if you added the post-build step).
3. Launch Fallout 4 with F4SE loaded, then check `Documents\My Games\Fallout4\F4SE\<PluginName>.log` for the `_MESSAGE` output from `F4SEPlugin_Load`.

## Troubleshooting Focus

- **LNK2019 (unresolved external)**: Usually means the Library Directories path is wrong or `f4se_common.lib` was not added to Additional Dependencies.
- **C2338 / concept errors**: Usually means the C++ Language Standard is set below C++17. Confirm the `Release | x64` configuration is active when changing properties — settings are per-configuration.
- **DLL not loaded by F4SE**: Confirm the DLL is in `Data\F4SE\Plugins\`, the `RUNTIME_VERSION` in `F4SEPlugin_Version` matches the running game binary, and the DLL is x64 (not x86).
- **Missing log file**: Confirm F4SE itself launched correctly (check `f4se.log`) before diagnosing individual plugin logs.
