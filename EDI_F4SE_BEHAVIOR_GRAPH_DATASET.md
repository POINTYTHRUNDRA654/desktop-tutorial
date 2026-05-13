# EDI, F4SE Memory Hooks, and Custom Behavior Graphs Dataset

This dataset defines advanced Fallout 4 modding coursework covering Extended Dialogue Interface (EDI) integration, F4SE C++ plugin environment setup with memory hook fundamentals, and custom Havok behavior graph authoring.

## 1) Extended Dialogue Interface (EDI)

EDI bypasses the hardcoded four-choice dialogue limit built into Fallout 4's base engine.

- **Engine Limits**: The vanilla dialogue UI is capped at four visible response choices. EDI replaces or extends this cap using a custom scaleform/UI layer.
- **Data Structures**: Custom dialogue nodes are built on standard Quest forms and bound to native Papyrus scripts for dynamic control.
- **Layout Control**: UI placement and scroll behavior are defined in a separate XML configuration file that maps screen space coordinates and button layout regions.
- **Dynamic Content**: Papyrus scripts change button text, visibility, and response availability at runtime based on conditional flags and game state checks.

## 2) F4SE Memory Hooks & C++ Environments

F4SE plugins require a C++ native code environment and controlled engine memory access.

- **IDE Setup**: Microsoft Visual Studio 2022 is the standard environment for F4SE plugin development. Projects must target the x64 Release configuration.
- **SDK Dependency**: Project configuration must link against the correct F4SE SDK headers and static libraries matching the current F4SE/game version pair.
- **Memory Addressing**: Developers use RVA (Relative Virtual Addresses) to target engine functions. RVAs are stable offsets relative to the base image load address, avoiding hardcoded absolute addresses.
- **Reverse Engineering**: Hook address discovery relies on tools such as IDA Pro or Ghidra. Pattern scanning is the preferred method for maintaining compatibility across game updates.

## 3) Custom Behavior Graphs (.hkx)

Fallout 4 uses Havok behavior graphs to drive character and object animation state machines.

- **Software Requirement**: Authoring or editing behavior graphs requires Autodesk 3ds Max and Havok Content Tools (HCT). Exports produce compiled `.hkx` binary files.
- **Animation Nodes**: State machines inside the graph control transitions between mechanical animations such as open, close, idle, and rotate states.
- **Event Triggers**: Variables defined in the `.hkx` graph link directly to Papyrus script events, allowing gameplay logic to drive animation transitions and vice versa.
- **Rigging Constraints**: Rigid bodies and physical constraints in the graph define collision parameters during movement, preventing geometry interpenetration during animated sequences.

## Troubleshooting Focus

- If EDI dialogue choices are cut off or invisible, verify XML layout paths and confirm the EDI FOMOD was installed correctly with all required UI files present.
- If F4SE plugins fail to load, verify SDK version alignment and confirm the plugin's supported game version interface matches the running binary.
- If behavior graph animations stall or skip states, check that the triggering Papyrus event names match the variable identifiers inside the exported `.hkx` exactly.
