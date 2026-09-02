cmake_minimum_required(VERSION 3.21)
project(F4AI_MiscUtil VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── F4SE headers ──────────────────────────────────────────────────────────────
# Set F4SE_SOURCE_DIR to the root of the F4SE source tree you downloaded from
# https://f4se.silverlock.org  (the source archive, not the runtime zip).
# Example: cmake -DF4SE_SOURCE_DIR="C:/dev/f4se_0_07_02" ..
if(NOT DEFINED F4SE_SOURCE_DIR)
    message(FATAL_ERROR
        "F4SE_SOURCE_DIR is not set.\n"
        "Download the F4SE source from https://f4se.silverlock.org and pass:\n"
        "  cmake -DF4SE_SOURCE_DIR=\"path/to/f4se_src\" ..")
endif()

# ── DLL target ────────────────────────────────────────────────────────────────
add_library(F4AI_MiscUtil SHARED src/MiscUtil.cpp)

target_include_directories(F4AI_MiscUtil PRIVATE
    "${F4SE_SOURCE_DIR}"        # exposes f4se/PluginAPI.h etc.
)

target_compile_definitions(F4AI_MiscUtil PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
)

# F4SE plugins must be 64-bit
set_target_properties(F4AI_MiscUtil PROPERTIES
    SUFFIX ".dll"
    OUTPUT_NAME "F4AI_MiscUtil"
)

# ── Install ───────────────────────────────────────────────────────────────────
# cmake --install . --prefix "E:/Steam/steamapps/common/Fallout 4"
install(TARGETS F4AI_MiscUtil
    RUNTIME DESTINATION "Data/F4SE/Plugins"
)
