# FOMOD Installer — Complete Guide for Fallout 4 Mods (2026)

A FOMOD installer lets users choose options during installation — different texture resolutions, optional patches, version selection for different game builds. This guide covers the complete `ModuleConfig.xml` structure, every condition type, game-version detection, and real-world patterns used by major mods.

---

## Part 1: What Is a FOMOD?

FOMOD (Fallout Mod Organizer Data) is the standard XML-based installer format recognized by MO2, Vortex, and NMM. When you install a mod with a FOMOD, the mod manager reads `fomod/ModuleConfig.xml` and presents a wizard UI where the user makes choices. Based on those choices, specific files are installed.

**FOMOD does not change the mod's content** — it just selects which pre-packaged files get placed in the `Data\` folder.

---

## Part 2: Directory Structure

```
MyMod/
├── fomod/
│   ├── info.xml          ← mod metadata (name, author, version, description)
│   └── ModuleConfig.xml  ← the installer logic
├── Core/                 ← files always installed
│   └── Data/
│       ├── MyMod.esp
│       └── ...
├── Option_HighRes/       ← files for "High Res textures" choice
│   └── Data/
│       └── Textures/...
├── Option_LowRes/        ← files for "Low Res textures" choice
│   └── Data/
│       └── Textures/...
├── Patch_SS2/            ← files for the Sim Settlements 2 patch option
│   └── Data/
│       └── MyMod_SS2_Patch.esp
└── ...
```

All file paths in `ModuleConfig.xml` use `source=` relative to the root of this structure, and `destination=` relative to the `Data\` folder.

---

## Part 3: info.xml

```xml
<fomod>
  <Name>My Awesome Weapon Mod</Name>
  <Author>YourName</Author>
  <Version>1.2.0</Version>
  <Website>https://www.nexusmods.com/fallout4/mods/XXXXX</Website>
  <Description>Adds a fully animated custom rifle with 4K textures and 5 craftable variants.</Description>
</fomod>
```

---

## Part 4: ModuleConfig.xml — Full Structure

```xml
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">

  <moduleName>My Awesome Weapon Mod</moduleName>

  <!-- Files always installed regardless of choices -->
  <requiredInstallFiles>
    <folder source="Core" destination="" priority="0" />
  </requiredInstallFiles>

  <!-- Wizard pages presented in order -->
  <installSteps order="Explicit">

    <installStep name="Texture Quality">
      <optionalFileGroups order="Explicit">
        <group name="Choose Texture Resolution" type="SelectExactlyOne">
          <plugins order="Explicit">

            <plugin name="4K Textures (Recommended for 8GB+ VRAM)">
              <description>4096×4096 diffuse and normal maps. Best quality.</description>
              <image path="fomod\images\preview_4k.png" />
              <files>
                <folder source="Option_HighRes" destination="" priority="1" />
              </files>
              <typeDescriptor>
                <type name="Recommended" />
              </typeDescriptor>
            </plugin>

            <plugin name="2K Textures (Mid-range GPUs)">
              <description>2048×2048 textures. Good balance of quality and VRAM usage.</description>
              <files>
                <folder source="Option_MidRes" destination="" priority="1" />
              </files>
              <typeDescriptor>
                <type name="Optional" />
              </typeDescriptor>
            </plugin>

            <plugin name="1K Textures (Performance)">
              <description>1024×1024. Lowest VRAM usage.</description>
              <files>
                <folder source="Option_LowRes" destination="" priority="1" />
              </files>
              <typeDescriptor>
                <type name="Optional" />
              </typeDescriptor>
            </plugin>

          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>

    <installStep name="Compatibility Patches">
      <optionalFileGroups order="Explicit">
        <group name="Optional Patches" type="SelectAny">
          <plugins order="Explicit">

            <plugin name="Sim Settlements 2 Patch">
              <description>Adds my weapon to SS2 city plan loot tables. Requires SS2.</description>
              <files>
                <folder source="Patch_SS2" destination="" priority="2" />
              </files>
              <typeDescriptor>
                <dependencyType>
                  <defaultType name="Optional" />
                  <patterns>
                    <!-- Auto-recommend if SS2 is detected -->
                    <pattern>
                      <dependencies operator="And">
                        <fileDependency file="SimSettlements2.esm" state="Active" />
                      </dependencies>
                      <type name="Recommended" />
                    </pattern>
                  </patterns>
                </dependencyType>
              </typeDescriptor>
            </plugin>

            <plugin name="PRP Patch">
              <description>Previs/precombine compatibility patch. Install if you use PRP.</description>
              <files>
                <folder source="Patch_PRP" destination="" priority="2" />
              </files>
              <typeDescriptor><type name="Optional" /></typeDescriptor>
            </plugin>

          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>

  </installSteps>

</config>
```

---

## Part 5: Group Type Reference

The `type` attribute on `<group>` controls how many options the user can select:

| Group Type | Behavior |
|---|---|
| `SelectExactlyOne` | User must pick exactly one option — like a radio button |
| `SelectAtMostOne` | User can pick zero or one |
| `SelectAtLeastOne` | User must pick at least one, can pick multiple |
| `SelectAny` | User can pick any number (zero or more) — checkboxes |
| `SelectAll` | All options are installed automatically (no user choice) |

---

## Part 6: Plugin TypeDescriptor Reference

The `typeDescriptor` controls how a plugin option is pre-selected and labeled:

| Type Name | Behavior |
|---|---|
| `Required` | Always selected; cannot be deselected |
| `Recommended` | Pre-selected but can be deselected |
| `Optional` | Not pre-selected; user can choose it |
| `CouldBeUsable` | Grayed-out suggestion (informational) |
| `NotUsable` | Grayed-out and cannot be selected |

Use `Required` for core files, `Recommended` for the best default option, `Optional` for patches and variants.

---

## Part 7: File Dependency Conditions

Conditions let the installer react to what mods the user already has installed:

### Check if a Plugin is Active

```xml
<dependencies operator="And">
  <fileDependency file="Fallout4.esm" state="Active" />
  <fileDependency file="DLCRobot.esm" state="Active" />
  <!-- Require both base game and Automatron DLC -->
</dependencies>
```

### File Dependency States

| State | Meaning |
|---|---|
| `Active` | Plugin is present AND enabled in load order |
| `Inactive` | Plugin is present but disabled |
| `Missing` | Plugin is not present at all |

### Show Step Only If Dependency Met

```xml
<installStep name="Far Harbor Patch">
  <visible>
    <dependencies operator="And">
      <fileDependency file="DLCCoast.esm" state="Active" />
    </dependencies>
  </visible>
  <!-- This step only appears if Far Harbor is installed -->
  ...
</installStep>
```

### Conditional File Installation (without user choice)

```xml
<conditionalFileInstalls>
  <patterns>
    <pattern>
      <dependencies operator="And">
        <fileDependency file="SimSettlements2.esm" state="Active" />
      </dependencies>
      <files>
        <folder source="AutoPatch_SS2" destination="" priority="3" />
      </files>
    </pattern>
  </patterns>
</conditionalFileInstalls>
```

This installs files automatically based on conditions — no user interaction required.

---

## Part 8: Game Version Detection (F4SE DLL Selection)

F4SE plugins ship as `.dll` files compiled for specific game versions. Use a FOMOD step to auto-select the correct DLL:

```xml
<installStep name="F4SE Plugin Version">
  <visible>
    <!-- Always show — F4SE plugins must be version-matched -->
    <dependencies operator="Or">
      <fileDependency file="f4se_1_10_163.exe" state="Active" />
      <fileDependency file="f4se_1_10_984.exe" state="Active" />
      <fileDependency file="f4se_1_11_191.exe" state="Active" />
    </dependencies>
  </visible>
  <optionalFileGroups order="Explicit">
    <group name="Game Version" type="SelectExactlyOne">
      <plugins order="Explicit">

        <plugin name="OG (1.10.163) — Classic">
          <description>For the pre-NG version of Fallout 4.</description>
          <files>
            <file source="F4SE_Plugins\OG\MyPlugin.dll"
                  destination="F4SE\Plugins\MyPlugin.dll" priority="1" />
          </files>
          <typeDescriptor>
            <dependencyType>
              <defaultType name="Optional" />
              <patterns>
                <pattern>
                  <dependencies>
                    <fileDependency file="f4se_1_10_163.exe" state="Active" />
                  </dependencies>
                  <type name="Recommended" />
                </pattern>
              </patterns>
            </dependencyType>
          </typeDescriptor>
        </plugin>

        <plugin name="NG (1.10.980 – 1.10.984)">
          <description>Next Gen update version.</description>
          <files>
            <file source="F4SE_Plugins\NG\MyPlugin.dll"
                  destination="F4SE\Plugins\MyPlugin.dll" priority="1" />
          </files>
          <typeDescriptor>
            <dependencyType>
              <defaultType name="Optional" />
              <patterns>
                <pattern>
                  <dependencies>
                    <fileDependency file="f4se_1_10_984.exe" state="Active" />
                  </dependencies>
                  <type name="Recommended" />
                </pattern>
              </patterns>
            </dependencyType>
          </typeDescriptor>
        </plugin>

        <plugin name="1.11.x (Anniversary Edition / Creations Menu)">
          <description>November 2025+ version with Creations Menu.</description>
          <files>
            <file source="F4SE_Plugins\1_11\MyPlugin.dll"
                  destination="F4SE\Plugins\MyPlugin.dll" priority="1" />
          </files>
          <typeDescriptor>
            <dependencyType>
              <defaultType name="Optional" />
              <patterns>
                <pattern>
                  <dependencies>
                    <fileDependency file="f4se_1_11_191.exe" state="Active" />
                  </dependencies>
                  <type name="Recommended" />
                </pattern>
              </patterns>
            </dependencyType>
          </typeDescriptor>
        </plugin>

      </plugins>
    </group>
  </optionalFileGroups>
</installStep>
```

> **Tip:** Ship the all-in-one variant (if available for your plugin) instead of three separate DLLs — it auto-detects at runtime using Address Library and reduces FOMOD complexity.

---

## Part 9: Preview Images

FOMOD supports preview images shown next to each option. Place images in `fomod\images\`:

```xml
<plugin name="4K Textures">
  <description>High-quality 4096px textures.</description>
  <image path="fomod\images\preview_4k.png" />
  ...
</plugin>
```

Image recommendations:
- PNG or JPEG format
- 800×500px or similar wide aspect ratio
- Show the actual in-game visual difference between options
- Keep under 500KB per image (FOMOD installers load faster)

---

## Part 10: Required Dependencies (Pre-requisite Check)

Declare required mods so the installer warns users if dependencies are missing:

```xml
<moduleDependencies operator="And">
  <fileDependency file="Fallout4.esm" state="Active" />
  <fileDependency file="F4SE\f4se_loader.exe" state="Active" />
  <!-- Warn if F4SE isn't installed -->
</moduleDependencies>
```

> Note: `moduleDependencies` only issues a warning — it cannot block installation. Always note hard requirements in the mod description.

---

## Part 11: Flags — Passing State Between Steps

Flags let you set a value in one step and read it in a later step:

```xml
<!-- Step 1: Set a flag based on user choice -->
<plugin name="Install Patch">
  <conditionFlags>
    <flag name="installPatch">1</flag>
  </conditionFlags>
  ...
</plugin>

<!-- Step 2: Only show if the flag is set -->
<installStep name="Patch Options">
  <visible>
    <flagDependency flag="installPatch" value="1" />
  </visible>
  ...
</installStep>
```

---

## Part 12: Validation

Before shipping, validate your FOMOD with:
- **FOMOD Validator** — available as a standalone tool and as a Vortex extension
- **Install your own FOMOD in MO2** — the fastest real-world test
- Check that `source=` paths exist and `destination=` paths are correct (relative to `Data\`)
- Test every branch of your logic — install each option combination and verify files land in the right place

---

## Quick Reference

| Task | Element |
|---|---|
| Always install files | `<requiredInstallFiles>` |
| User choice step | `<installStep>` |
| Radio buttons | `<group type="SelectExactlyOne">` |
| Checkboxes | `<group type="SelectAny">` |
| Auto-select based on other mods | `<fileDependency>` in `<dependencyType>` |
| Install files silently based on condition | `<conditionalFileInstalls>` |
| Only show step if condition met | `<visible>` on `<installStep>` |
| Preview image | `<image path="fomod\images\...">` on `<plugin>` |

*Last updated: May 2026. Compatible with MO2 2.5.x, Vortex, and NMM.*
