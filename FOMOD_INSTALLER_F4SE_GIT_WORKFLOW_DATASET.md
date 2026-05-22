# FOMOD Installer, F4SE C++ Hooks, and Git Workflow Dataset

This dataset defines advanced Fallout 4 instruction content for FOMOD installer architecture, low-level F4SE C++ plugin development setup, and team-safe Git/Git LFS collaboration strategy.

## 1) JSON Dataset: FOMOD Installer Framework Specification

```json
{
  "fallout4_modding_course": {
    "module_6_submodule_fomod_installer": {
      "lesson_title": "FOMOD Graphical Installer Architecture & Automation",
      "learning_objectives": [
        "Construct structured XML installer scripts compatible with MO2 and Vortex.",
        "Implement conditional file-mapping logic based on user selections.",
        "Configure dependency checks for missing required plugins."
      ],
      "technical_blueprint": {
        "directory_layout": {
          "required_root_folder": "fomod\\",
          "required_control_files": [
            "fomod\\info.xml",
            "fomod\\ModuleConfig.xml"
          ]
        },
        "conditional_logic_nodes": {
          "dependency_checking": "Use dependency nodes to detect required masters and present actionable user warnings.",
          "file_mapping": "Map optional files or BA2 resources into destination paths based on selected install options."
        }
      }
    }
  }
}
```

## 2) Practical Blueprint: F4SE C++ Engine Hook Development Environment

1. Install Visual Studio with Desktop Development with C++ and current Windows SDK/MSVC toolsets.
2. Set up an F4SE plugin project with the required SDK and address-library headers.
3. Implement safe load/query handshake logic and runtime hook activation on game-loaded events.
4. Build and deploy the plugin DLL to `Data\F4SE\Plugins\`.

## 3) Practical Blueprint: Git Version Control Strategy for Modding Teams

1. Define a strict `.gitignore` to exclude local caches, archives, and temporary artifacts.
2. Keep source scripts and structured data under version control.
3. Configure Git LFS for large binary assets such as `.nif`, `.dds`, `.wav`, and plugin files.
4. Commit `.gitattributes` so all contributors share the same binary-tracking policy.

## 4) Companion XML Structure Reference

Use a valid `ModuleConfig.xml` structure with closed tags, valid entity encoding, and deterministic option groups so installers parse consistently across mod managers.

## Troubleshooting Focus

- If the installer opens as flat files, verify `fomod` is lowercase and at archive root.
- If XML parsing fails, validate `ModuleConfig.xml` with an XML linter.
- If F4SE plugins fail to load, verify SDK compatibility and query/load version checks.
- If repository size grows uncontrollably, confirm LFS tracking covers large binary asset paths.
