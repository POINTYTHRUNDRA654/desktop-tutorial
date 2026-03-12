# Fallout 4 Mod Packaging Guide

## Standard directory structure
```
<ModRoot>/
├── Data/
│   ├── meshes/                 NIF files (.nif)
│   │   ├── actors/
│   │   ├── weapons/
│   │   ├── armor/
│   │   ├── props/
│   │   └── architecture/
│   ├── textures/               DDS files (.dds)
│   │   ├── actors/
│   │   ├── weapons/
│   │   ├── armor/
│   │   ├── effects/
│   │   └── props/
│   ├── sound/
│   │   ├── fx/                 Sound effects (.wav / .xwm)
│   │   └── voice/              Voice lines (.wav / .lip)
│   ├── music/                  Music (.xwm)
│   ├── scripts/
│   │   ├── *.pex               Compiled Papyrus bytecode
│   │   └── source/user/        Source .psc files (optional)
│   ├── strings/                Localisation strings (.strings)
│   ├── interface/              Scaleform / Flash UI files
│   ├── shadersfx/              Particle / shader effects
│   ├── materials/              BGSM / BGEM material files
│   ├── vis/                    Visibility data
│   └── lodsettings/            LOD generation settings
├── fomod/
│   ├── info.xml                FOMOD metadata
│   ├── ModuleConfig.xml        Installer logic
│   └── screenshot.png          Optional installer image
├── README.md                   Nexus-ready documentation
├── pack_ba2.bat                Windows BA2 packer script
├── pack_ba2.sh                 Linux/macOS BA2 packer script
└── mod_manifest.json           Auto-generated file inventory
```

## Plugin file types
| Extension | Description                              | Notes                          |
|-----------|------------------------------------------|--------------------------------|
| .esp      | Elder Scrolls Plugin (standard)          | Most common for new content    |
| .esm      | Elder Scrolls Master (master file)       | Required by other plugins      |
| .esl      | Elder Scrolls Light plugin               | Max 4096 records; no load order spot |

## BA2 archive types
| Type    | Contents                  | Archive2 flag  |
|---------|---------------------------|----------------|
| General | Meshes, sounds, scripts   | `-f=General`   |
| DDS     | Textures only             | `-f=DDS`       |

Naming convention: `<PluginName> - Main.ba2` and `<PluginName> - Textures.ba2`

## FOMOD installer format
FOMOD is the standard mod installer format, supported by Vortex, MO2, and NMM.

### info.xml minimum fields
```xml
<fomod>
    <Name>My Mod Name</Name>
    <Author>YourName</Author>
    <Version>1.0.0</Version>
    <Description>One-sentence description.</Description>
    <Website>https://www.nexusmods.com/fallout4/mods/XXXXX</Website>
</fomod>
```

### ModuleConfig.xml structure
```xml
<config>
    <moduleName>My Mod Name</moduleName>
    <requiredInstallFiles>
        <!-- Files always installed -->
        <file source="Data\MyMod.esp" destination="MyMod.esp" />
        <folder source="Data\" destination="" />
    </requiredInstallFiles>
    <installSteps order="Explicit">
        <!-- Optional component steps go here -->
    </installSteps>
</config>
```

## README structure (Nexus standard)
A good README.md should have these sections:
1. **Title + version badge**
2. **Description** – what the mod does
3. **Features** – bullet list
4. **Requirements** – hard dependencies (F4SE, DLCs, etc.)
5. **Installation** – Vortex/MO2 and manual steps
6. **Known Issues** – with workarounds if available
7. **Changelog** – by version
8. **Credits** – tool authors, beta testers, asset sources
9. **Permissions** – what others can do with your work

## Mod Packaging workflow in FO4 Mod Assistant
1. Fill in **Mod Identity** (name, author, version, plugin name)
2. Set **Mod Root Folder**
3. Click **Create Data/ + FOMOD Folders**
4. Export your Blender meshes into `Data/meshes/`
5. Export your DDS textures into `Data/textures/`
6. Compile your Papyrus scripts into `Data/scripts/`
7. Create your `.esp` in the Creation Kit and save it to `Data/`
8. Click **Generate FOMOD Installer**
9. Click **Generate README.md**
10. Click **Validate Mod Structure** – fix any reported issues
11. Click **Export Mod Manifest** – creates `mod_manifest.json`
12. Run `pack_ba2.bat` to pack loose files into `.ba2` archives
13. Upload to Nexus Mods (or distribute the FOMOD zip)

## Creating the distributable zip
```
<ModName>-v<Version>.zip
└── <ModName>/
    ├── fomod/
    │   ├── info.xml
    │   └── ModuleConfig.xml
    ├── Data/
    │   ├── <ModName>.esp
    │   ├── <ModName> - Main.ba2
    │   └── <ModName> - Textures.ba2
    └── README.md
```
**Do not include `Data/Scripts/Source/` in the distribution zip** unless you
specifically want to share your Papyrus source code.

## Nexus Mods upload checklist
- [ ] All BA2 archives present and correctly named
- [ ] Plugin (.esp/.esm/.esl) present in Data/
- [ ] FOMOD info.xml and ModuleConfig.xml correct
- [ ] README.md complete (description, requirements, installation)
- [ ] At least one screenshot (1920×1080 recommended)
- [ ] Mod tested in a clean install before upload
- [ ] Permissions section filled in README
