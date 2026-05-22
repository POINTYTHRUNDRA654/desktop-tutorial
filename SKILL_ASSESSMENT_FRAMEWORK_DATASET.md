# Skill Assessment Framework: C++, Papyrus, and Integration Entry Points

This dataset defines a skill-routing assessment framework for Fallout 4 mod developers. It maps three core proficiency dimensions to tailored development entry points and learning tracks.

## Assessment Framework

### C++ Proficiency
Determines your readiness for building memory-patching F4SE plugins using reverse-engineered addresses. Covers Visual Studio project setup, SDK linking, RVA targeting, and native hook implementation.

### Papyrus Skill
Dictates your ability to handle complex game-world logic, event handling, and UI data passing. Covers event-driven scripting, state machine design, quest orchestration, and MCM binding.

### Integration Capacity
Affects how easily you can bind native C++ code to high-level Papyrus script functions. Covers F4SE VirtualMachine registration, function binding patterns, and safe cross-layer data passing.

---

## Development Entry Points

### For C++ Experts / Papyrus Novices

These creators can write high-performance native plugins but need to learn Fallout 4 object architecture and scripting conventions.

- **F4SE Focus**: Build plugin infrastructure first, then learn the Papyrus object hierarchy to understand what forms and script types the engine exposes.
- **Memory Hooks**: Focus on reverse engineering engine functions using relative virtual addresses (RVAs) in IDA Pro or Ghidra.
- **Script Binding**: Use the F4SE `VirtualMachine` interface to register and expose custom native C++ functions directly to Papyrus script callers.

### For Papyrus Experts / C++ Novices

These creators have deep knowledge of game events and quest structures but limited native code experience.

- **EDI Focus**: Use Extended Dialogue Interface to build complex dialogue layouts leveraging existing event and quest architecture knowledge without native code.
- **State Machines**: Focus on structural manipulation of `.esp` / `.esm` records via Creation Kit or xEdit to extend behavior before touching any native memory.
- **UI Manipulation**: Use existing F4SE plugins and the EDI API methods to control UI behavior without writing raw C++ code or memory hook logic.

### For Beginners in Both

Creators new to both C++ and Papyrus should build foundational skills before moving to advanced integration work.

- **Creation Kit**: Start by creating basic quests, dialogue scenes, and standard item-bound Papyrus scripts inside the official Creation Kit environment.
- **API Utilization**: Implement existing community framework APIs (such as MCM, F4SE utility functions) before attempting any custom memory injection work.
- **Graph Editing**: Focus on editing existing `.hkx` behavior graphs using simple state changes rather than authoring new graph nodes from scratch.

---

## Skill Routing Summary

| Skill Level | Recommended Track |
|---|---|
| C++ Expert / Papyrus Novice | F4SE plugin → VirtualMachine binding → Papyrus architecture |
| Papyrus Expert / C++ Novice | EDI dialogue → xEdit records → existing F4SE API usage |
| Beginner in Both | Creation Kit basics → community APIs → behavior graph editing |

---

## Troubleshooting Focus

- If C++ experts struggle to call game objects from Papyrus, study the F4SE `RE` (reverse-engineered) type hierarchy before attempting form lookups.
- If Papyrus experts encounter EDI layout failures, verify XML path configuration and confirm EDI is installed before the dependent mod in your load order.
- If beginners see quest scripts not triggering, verify that `bEnableLogging=1` is active in `Fallout4Custom.ini` and confirm the quest is started before the event fires.
