# Glossary

Full decoder ring for MOSSY.SPACE / Fallout 4 modding shorthand.

## App & Build Terms

| Term | Meaning | Context |
|------|---------|---------|
| asar | Electron app archive | Source edits don't affect running app until asar rebuilt |
| Mossy NVIDIA | `Mossy/Mossy NVIDIA/resources/app.asar` | The build the user actually runs |
| release build | `release/win-unpacked/resources/app.asar` | Secondary build, not what user runs |
| slim pack | Asar without node_modules (~104MB) | node_modules served from `app.asar.unpacked/` |
| content-hash bundle | Vite filename includes build hash | e.g. `WorkflowRunner-CH0RESju.js` |
| dist/ | Vite renderer output | Compiled from `src/renderer/` |
| dist-electron/ | Vite electron main output | Compiled from `src/electron/` |

## Fallout 4 / Modding Terms

| Term | Meaning | Context |
|------|---------|---------|
| FO4 | Fallout 4 | The game |
| CK | Creation Kit | Bethesda's official mod editor for FO4 |
| BA2 | Bethesda Archive 2 | FO4's packed asset container format |
| F4SE | Fallout 4 Script Extender | Community tool extending FO4's scripting |
| xEdit | FO4Edit / xEdit | Community mod conflict checker and editor |
| FO4Edit | Same as xEdit | Community mod editor |
| Papyrus | FO4's scripting language | Used in `.psc` / `.pex` files |
| ESL | Elder Scrolls Light plugin | Light plugin, limited records, no load order slot |
| ESP | Elder Scrolls Plugin | Standard plugin file |
| ESM | Elder Scrolls Master | Master plugin file |
| SEQ | Sequence file | Required for quests to start on save load — easy to forget |
| load order | Plugin load sequence | Determines which mods win conflicts |
| plugins.txt | Plugin list file | In `%LOCALAPPDATA%\Fallout4\` |
| loadorder.txt | Load order file | In `%LOCALAPPDATA%\Fallout4\` |
| NIF | NetImmerse File | 3D mesh format used by FO4 |
| HKX | Havok animation file | Animation format used by FO4 |

## Platform Shorthand

| Shorthand | Full Name | File |
|-----------|-----------|------|
| Runner | WorkflowRunner | `src/renderer/src/WorkflowRunner.tsx` |
| Orchestrator / Automation | AutomationManager | `src/renderer/src/AutomationManager.tsx` |
| Blueprint | TheBlueprint | `src/renderer/src/TheBlueprint.tsx` |
| Devtools | DevtoolsHub | `src/renderer/src/DevtoolsHub.tsx` |
| ModBuilder | ModBuilderHub | `src/renderer/src/ModBuilderHub.tsx` |
| Workshop | Workshop | `src/renderer/src/Workshop.tsx` |
| ProjectCreator | ProjectCreator | `src/renderer/src/ProjectCreator.tsx` |
| automationEngine | automationEngine | `src/electron/automationEngine.ts` |
